import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import { readPngMetadata } from './playStorePng.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../..');
const SOURCE_BACKGROUND_PATH = path.join(
  REPO_ROOT,
  'docs/play-store/source/feature-background.png'
);
const WORDMARK_PATH = path.join(REPO_ROOT, 'mobile/assets/ui/wordmark.png');
const AUDITED_BACKGROUND_SHA256 =
  'd5e6371e06f458b91f15c7cfd2d3fc348cfd3937c2172a9d5fea3c2c3ce98c44';

async function loadComposer() {
  try {
    return await import('./composePlayStoreFeatureGraphic.mjs');
  } catch (error) {
    assert.fail(
      `feature graphic composer is unavailable: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function encodePng(width, height, { alpha = false } = {}) {
  const png = new PNG({ width, height });
  for (let offset = 0; offset < png.data.length; offset += 4) {
    const pixel = offset / 4;
    png.data[offset] = pixel % 251;
    png.data[offset + 1] = (pixel * 3) % 241;
    png.data[offset + 2] = (pixel * 7) % 239;
    png.data[offset + 3] = alpha && pixel % 5 === 0 ? 160 : 255;
  }
  return PNG.sync.write(png, {
    colorType: alpha ? 6 : 2,
    inputColorType: 6,
    inputHasAlpha: true,
  });
}

describe('Play Store feature graphic source and geometry', () => {
  test('preserves the exact human-audited background bytes', async () => {
    const source = await fs.readFile(SOURCE_BACKGROUND_PATH).catch(error => {
      assert.fail(
        `audited feature background is missing: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    });

    assert.equal(
      createHash('sha256').update(source).digest('hex'),
      AUDITED_BACKGROUND_SHA256
    );
    assert.deepEqual(await readPngMetadata(SOURCE_BACKGROUND_PATH), {
      width: 1536,
      height: 1024,
      bitDepth: 8,
      colorType: 2,
    });
  });

  test('covers without stretching and protects the wordmark in the center crop', async () => {
    const {
      FEATURE_GRAPHIC_LAYOUT,
      calculateCoverCrop,
    } = await loadComposer();
    const layout = FEATURE_GRAPHIC_LAYOUT;

    assert.deepEqual(
      {
        canvasWidth: layout.canvasWidth,
        canvasHeight: layout.canvasHeight,
        backgroundPositionX: layout.backgroundPositionX,
        backgroundPositionY: layout.backgroundPositionY,
        wordmarkLeft: layout.wordmarkLeft,
        wordmarkTop: layout.wordmarkTop,
        wordmarkWidth: layout.wordmarkWidth,
        wordmarkHeight: layout.wordmarkHeight,
      },
      {
        canvasWidth: 1024,
        canvasHeight: 500,
        backgroundPositionX: 50,
        backgroundPositionY: 100,
        wordmarkLeft: 288,
        wordmarkTop: 70,
        wordmarkWidth: 592,
        wordmarkHeight: 148,
      }
    );

    const crop = calculateCoverCrop({
      sourceWidth: 1536,
      sourceHeight: 1024,
      targetWidth: layout.canvasWidth,
      targetHeight: layout.canvasHeight,
      positionX: layout.backgroundPositionX,
      positionY: layout.backgroundPositionY,
    });
    assert.equal(crop.sourceLeft, 0);
    assert.equal(crop.sourceRight, 1536);
    assert.ok(crop.sourceTop > 273 && crop.sourceTop < 275);
    assert.equal(crop.sourceBottom, 1024);

    const likelyCenterCrop = { left: 128, right: 896, top: 0, bottom: 500 };
    assert.ok(layout.wordmarkLeft >= likelyCenterCrop.left);
    assert.ok(
      layout.wordmarkLeft + layout.wordmarkWidth <= likelyCenterCrop.right
    );
    assert.ok(layout.wordmarkTop >= likelyCenterCrop.top);
    assert.ok(
      layout.wordmarkTop + layout.wordmarkHeight <= likelyCenterCrop.bottom
    );
  });

  test('embeds the exact existing wordmark and no generated copy', async () => {
    const { buildFeatureGraphicHtml } = await loadComposer();
    const wordmark = await fs.readFile(WORDMARK_PATH);
    const background = Buffer.from('audited-background');
    const html = buildFeatureGraphicHtml({
      backgroundBase64: background.toString('base64'),
      wordmarkBase64: wordmark.toString('base64'),
    });

    const sourceMatches = [
      ...html.matchAll(/src="data:image\/png;base64,([^"]+)"/g),
    ];
    assert.equal(sourceMatches.length, 2);
    assert.deepEqual(
      Buffer.from(sourceMatches[0][1], 'base64'),
      background
    );
    assert.deepEqual(
      Buffer.from(sourceMatches[1][1], 'base64'),
      wordmark
    );
    assert.doesNotMatch(
      html,
      /<(?:h[1-6]|p|span|strong|em|button|figcaption)\b/i
    );
  });
});

describe('Play Store feature graphic composition', { concurrency: false }, () => {
  let tempDir;
  let browser;
  let context;
  let page;

  before(async () => {
    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'wordshift-feature-graphic-test-')
    );
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1024, height: 500 },
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
    });
    page = await context.newPage();
  });

  after(async () => {
    await context?.close();
    await browser?.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('renders an opaque exact-size RGB PNG with audited image bounds', async () => {
    const { composeFeatureGraphic } = await loadComposer();
    const backgroundPath = path.join(tempDir, 'background.png');
    const wordmarkPath = path.join(tempDir, 'wordmark.png');
    const browserPngPath = path.join(tempDir, 'browser.png');
    const outputPath = path.join(tempDir, 'output.png');
    await Promise.all([
      fs.writeFile(backgroundPath, encodePng(1536, 1024)),
      fs.writeFile(wordmarkPath, encodePng(1000, 250, { alpha: true })),
    ]);

    const result = await composeFeatureGraphic({
      page,
      backgroundPath,
      wordmarkPath,
      browserPngPath,
      outputPath,
    });

    assert.deepEqual(result.metadata, {
      width: 1024,
      height: 500,
      bitDepth: 8,
      colorType: 2,
    });
    assert.deepEqual(result.audit.wordmark, {
      left: 288,
      top: 70,
      right: 880,
      bottom: 218,
      width: 592,
      height: 148,
    });
    assert.deepEqual(await readPngMetadata(outputPath), result.metadata);
  });

  test('leaves both previous outputs untouched and cleans staging on failure', async () => {
    const { withStagedFeaturePublication } = await loadComposer();
    const publicationRoot = path.join(tempDir, 'publication');
    const finalPath = path.join(publicationRoot, 'final', 'feature-graphic.png');
    const legacyPath = path.join(publicationRoot, 'legacy', 'feature-graphic.png');
    await Promise.all([
      fs.mkdir(path.dirname(finalPath), { recursive: true }),
      fs.mkdir(path.dirname(legacyPath), { recursive: true }),
    ]);
    await Promise.all([
      fs.writeFile(finalPath, 'previous final'),
      fs.writeFile(legacyPath, 'previous legacy'),
    ]);

    await assert.rejects(
      withStagedFeaturePublication({
        finalPath,
        legacyPath,
        populateAndValidate: async ({
          stagedFinalPath,
          stagedLegacyPath,
        }) => {
          await Promise.all([
            fs.mkdir(path.dirname(stagedFinalPath), { recursive: true }),
            fs.mkdir(path.dirname(stagedLegacyPath), { recursive: true }),
          ]);
          await fs.writeFile(stagedFinalPath, 'partial new final');
          await fs.writeFile(stagedLegacyPath, 'partial new legacy');
          throw new Error('simulated validation failure');
        },
      }),
      /simulated validation failure/
    );

    assert.equal(await fs.readFile(finalPath, 'utf8'), 'previous final');
    assert.equal(await fs.readFile(legacyPath, 'utf8'), 'previous legacy');
    assert.deepEqual(
      (await fs.readdir(publicationRoot)).sort(),
      ['final', 'legacy']
    );
  });
});
