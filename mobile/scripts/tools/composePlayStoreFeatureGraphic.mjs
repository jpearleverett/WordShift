import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { validateFinalAssets } from './validatePlayStoreAssets.mjs';
import {
  readPng,
  readPngMetadata,
  writeOpaquePng,
} from './playStorePng.mjs';

const SCRIPT_DIR = import.meta.dirname
  ?? path.dirname(fileURLToPath(import.meta.url));
const MOBILE_DIR = path.resolve(SCRIPT_DIR, '../..');
const REPO_ROOT = path.resolve(MOBILE_DIR, '..');
const CAMPAIGN_PATH = path.join(REPO_ROOT, 'docs/play-store/campaign.json');
const FINAL_DIR = path.join(REPO_ROOT, 'docs/play-store/final');
const FINAL_PATH = path.join(FINAL_DIR, 'feature-graphic.png');
const LEGACY_PATH = path.join(REPO_ROOT, 'docs/feature-graphic.png');
const BACKGROUND_PATH = path.join(
  REPO_ROOT,
  'docs/play-store/source/feature-background.png'
);
const WORDMARK_PATH = path.join(MOBILE_DIR, 'assets/ui/wordmark.png');
const MAX_ASSET_BYTES = 8 * 1024 * 1024;

export const FEATURE_GRAPHIC_LAYOUT = Object.freeze({
  canvasWidth: 1024,
  canvasHeight: 500,
  backgroundPositionX: 50,
  backgroundPositionY: 100,
  wordmarkLeft: 288,
  wordmarkTop: 70,
  wordmarkWidth: 592,
  wordmarkHeight: 148,
});

function assertPercentage(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${name} must be between 0 and 100`);
  }
}

export function calculateCoverCrop({
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  positionX = 50,
  positionY = 50,
}) {
  for (const [name, value] of Object.entries({
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
  })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`${name} must be positive`);
    }
  }
  assertPercentage(positionX, 'positionX');
  assertPercentage(positionY, 'positionY');

  const scale = Math.max(
    targetWidth / sourceWidth,
    targetHeight / sourceHeight
  );
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  const sourceLeft = (
    (renderedWidth - targetWidth) * (positionX / 100)
  ) / scale;
  const sourceTop = (
    (renderedHeight - targetHeight) * (positionY / 100)
  ) / scale;

  return {
    scale,
    sourceLeft,
    sourceTop,
    sourceRight: sourceLeft + targetWidth / scale,
    sourceBottom: sourceTop + targetHeight / scale,
  };
}

export function buildFeatureGraphicHtml({
  backgroundBase64,
  wordmarkBase64,
}) {
  if (!backgroundBase64 || !wordmarkBase64) {
    throw new Error('Feature composition requires background and wordmark data');
  }
  const layout = FEATURE_GRAPHIC_LAYOUT;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=${layout.canvasWidth}, initial-scale=1">
    <style>
      * {
        box-sizing: border-box;
      }
      html, body {
        width: ${layout.canvasWidth}px;
        height: ${layout.canvasHeight}px;
        margin: 0;
        overflow: hidden;
        background: #439cf2;
      }
      .feature-graphic {
        position: relative;
        width: ${layout.canvasWidth}px;
        height: ${layout.canvasHeight}px;
        overflow: hidden;
        background: #439cf2;
      }
      .background {
        position: absolute;
        inset: 0;
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position:
          ${layout.backgroundPositionX}% ${layout.backgroundPositionY}%;
      }
      .wordmark {
        position: absolute;
        left: ${layout.wordmarkLeft}px;
        top: ${layout.wordmarkTop}px;
        display: block;
        width: ${layout.wordmarkWidth}px;
        height: ${layout.wordmarkHeight}px;
        filter:
          drop-shadow(0 4px 3px rgba(24, 30, 22, 0.45))
          drop-shadow(0 10px 14px rgba(24, 30, 22, 0.28));
      }
    </style>
  </head>
  <body>
    <main class="feature-graphic" aria-label="WordShift">
      <img
        class="background"
        src="data:image/png;base64,${backgroundBase64}"
        alt=""
      >
      <img
        class="wordmark"
        src="data:image/png;base64,${wordmarkBase64}"
        alt=""
      >
    </main>
  </body>
</html>`;
}

async function waitForFeatureComposition(page) {
  const audit = await page.evaluate(async () => {
    const background = document.querySelector('.background');
    const wordmark = document.querySelector('.wordmark');
    const root = document.querySelector('.feature-graphic');
    if (
      !(background instanceof HTMLImageElement)
      || !(wordmark instanceof HTMLImageElement)
      || !(root instanceof HTMLElement)
    ) {
      throw new Error('Feature composition structure is incomplete');
    }
    await Promise.all([background.decode(), wordmark.decode()]);
    await new Promise(resolve => requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    }));
    const bounds = element => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const backgroundStyle = getComputedStyle(background);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      root: bounds(root),
      background: bounds(background),
      wordmark: bounds(wordmark),
      backgroundNatural: {
        width: background.naturalWidth,
        height: background.naturalHeight,
      },
      wordmarkNatural: {
        width: wordmark.naturalWidth,
        height: wordmark.naturalHeight,
      },
      backgroundFit: backgroundStyle.objectFit,
      backgroundPosition: backgroundStyle.objectPosition,
      imageCount: document.images.length,
      renderedText: document.body.innerText.trim(),
    };
  });

  const layout = FEATURE_GRAPHIC_LAYOUT;
  const expectedCanvas = {
    left: 0,
    top: 0,
    right: layout.canvasWidth,
    bottom: layout.canvasHeight,
    width: layout.canvasWidth,
    height: layout.canvasHeight,
  };
  const expectedWordmark = {
    left: layout.wordmarkLeft,
    top: layout.wordmarkTop,
    right: layout.wordmarkLeft + layout.wordmarkWidth,
    bottom: layout.wordmarkTop + layout.wordmarkHeight,
    width: layout.wordmarkWidth,
    height: layout.wordmarkHeight,
  };

  if (
    audit.viewport.width !== layout.canvasWidth
    || audit.viewport.height !== layout.canvasHeight
    || JSON.stringify(audit.root) !== JSON.stringify(expectedCanvas)
    || JSON.stringify(audit.background) !== JSON.stringify(expectedCanvas)
  ) {
    throw new Error('Feature composition is not an exact 1024x500 canvas');
  }
  if (JSON.stringify(audit.wordmark) !== JSON.stringify(expectedWordmark)) {
    throw new Error('Exact wordmark is outside its approved safe geometry');
  }
  if (
    audit.backgroundNatural.width !== 1536
    || audit.backgroundNatural.height !== 1024
  ) {
    throw new Error(
      `Feature background is ${audit.backgroundNatural.width}x`
      + `${audit.backgroundNatural.height}; expected 1536x1024`
    );
  }
  if (
    audit.wordmarkNatural.width !== 1000
    || audit.wordmarkNatural.height !== 250
  ) {
    throw new Error(
      `Wordmark is ${audit.wordmarkNatural.width}x`
      + `${audit.wordmarkNatural.height}; expected 1000x250`
    );
  }
  if (
    audit.backgroundFit !== 'cover'
    || audit.backgroundPosition
      !== `${layout.backgroundPositionX}% ${layout.backgroundPositionY}%`
  ) {
    throw new Error('Feature background is not using the approved cover crop');
  }
  if (audit.imageCount !== 2 || audit.renderedText !== '') {
    throw new Error('Feature composition contains unapproved rendered content');
  }
  return audit;
}

async function validateInputImage(filePath, expected, label) {
  const metadata = await readPngMetadata(filePath);
  if (
    metadata.width !== expected.width
    || metadata.height !== expected.height
    || metadata.bitDepth !== 8
  ) {
    throw new Error(
      `${label} is ${metadata.width}x${metadata.height}, `
      + `${metadata.bitDepth}-bit; expected ${expected.width}x`
      + `${expected.height}, 8-bit`
    );
  }
  await readPng(filePath);
}

export async function validateFeatureGraphic(filePath) {
  const metadata = await readPngMetadata(filePath);
  const stat = await fs.stat(filePath);
  if (
    metadata.width !== FEATURE_GRAPHIC_LAYOUT.canvasWidth
    || metadata.height !== FEATURE_GRAPHIC_LAYOUT.canvasHeight
    || metadata.bitDepth !== 8
    || metadata.colorType !== 2
  ) {
    throw new Error(
      `${path.basename(filePath)} must be an opaque 1024x500 8-bit RGB PNG`
    );
  }
  if (!stat.isFile() || stat.size > MAX_ASSET_BYTES) {
    throw new Error(`${path.basename(filePath)} must be a file under 8 MB`);
  }
  await readPng(filePath);
  return { metadata, bytes: stat.size };
}

export async function composeFeatureGraphic({
  page,
  backgroundPath,
  wordmarkPath,
  browserPngPath,
  outputPath,
}) {
  if (!page) throw new Error('composeFeatureGraphic requires a Playwright page');
  await Promise.all([
    validateInputImage(
      backgroundPath,
      { width: 1536, height: 1024 },
      'Feature background'
    ),
    validateInputImage(
      wordmarkPath,
      { width: 1000, height: 250 },
      'Wordmark'
    ),
  ]);
  const [background, wordmark] = await Promise.all([
    fs.readFile(backgroundPath),
    fs.readFile(wordmarkPath),
  ]);
  const html = buildFeatureGraphicHtml({
    backgroundBase64: background.toString('base64'),
    wordmarkBase64: wordmark.toString('base64'),
  });

  await page.setContent(html, { waitUntil: 'load' });
  const audit = await waitForFeatureComposition(page);
  await fs.mkdir(path.dirname(browserPngPath), { recursive: true });
  await page.screenshot({
    path: browserPngPath,
    type: 'png',
    fullPage: false,
  });
  const browserPng = await readPng(browserPngPath);
  if (
    browserPng.width !== FEATURE_GRAPHIC_LAYOUT.canvasWidth
    || browserPng.height !== FEATURE_GRAPHIC_LAYOUT.canvasHeight
  ) {
    throw new Error(
      `Browser rendered ${browserPng.width}x${browserPng.height}; `
      + 'expected 1024x500'
    );
  }

  await writeOpaquePng(outputPath, browserPng);
  const { metadata, bytes } = await validateFeatureGraphic(outputPath);
  return {
    outputPath,
    metadata,
    bytes,
    audit,
    digest: createHash('sha256')
      .update(await fs.readFile(outputPath))
      .digest('hex'),
  };
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function commonParent(paths) {
  const resolved = paths.map(targetPath => path.resolve(targetPath));
  const [first, ...rest] = resolved;
  let candidate = first;
  while (!rest.every(targetPath => (
    targetPath === candidate
    || targetPath.startsWith(`${candidate}${path.sep}`)
  ))) {
    const parent = path.dirname(candidate);
    if (parent === candidate) return os.tmpdir();
    candidate = parent;
  }
  return candidate;
}

async function publishStagedFiles(records) {
  for (const record of records) {
    await fs.mkdir(path.dirname(record.destination), { recursive: true });
    record.backup = path.join(
      path.dirname(record.destination),
      `.${path.basename(record.destination)}.backup-${randomUUID()}`
    );
    record.hadOriginal = await pathExists(record.destination);
    record.published = false;
  }

  try {
    for (const record of records) {
      if (record.hadOriginal) {
        await fs.rename(record.destination, record.backup);
      }
    }
    for (const record of records) {
      await fs.rename(record.staged, record.destination);
      record.published = true;
    }
  } catch (error) {
    for (const record of [...records].reverse()) {
      if (record.published) {
        await fs.rm(record.destination, { force: true });
      }
    }
    for (const record of records) {
      if (record.hadOriginal && await pathExists(record.backup)) {
        await fs.rename(record.backup, record.destination);
      }
    }
    throw error;
  }

  await Promise.all(records.map(async record => {
    if (record.hadOriginal) {
      await fs.rm(record.backup, { force: true });
    }
  }));
}

export async function withStagedFeaturePublication({
  finalPath,
  legacyPath,
  populateAndValidate,
}) {
  if (typeof populateAndValidate !== 'function') {
    throw new Error('populateAndValidate must be a function');
  }
  const stagingParent = commonParent([
    path.dirname(finalPath),
    path.dirname(legacyPath),
  ]);
  await fs.mkdir(stagingParent, { recursive: true });
  const stagingDir = await fs.mkdtemp(
    path.join(stagingParent, '.feature-graphic.staging-')
  );
  const stagedFinalPath = path.join(
    stagingDir,
    'final',
    'feature-graphic.png'
  );
  const stagedLegacyPath = path.join(
    stagingDir,
    'legacy',
    'feature-graphic.png'
  );

  try {
    await populateAndValidate({
      stagingDir,
      stagedFinalPath,
      stagedLegacyPath,
    });
    const [stagedFinal, stagedLegacy] = await Promise.all([
      fs.readFile(stagedFinalPath),
      fs.readFile(stagedLegacyPath),
    ]);
    if (!stagedFinal.equals(stagedLegacy)) {
      throw new Error('Staged feature and legacy outputs are not identical');
    }
    await publishStagedFiles([
      { staged: stagedFinalPath, destination: finalPath },
      { staged: stagedLegacyPath, destination: legacyPath },
    ]);
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true });
  }
}

async function main() {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'wordshift-feature-compose-')
  );
  let browser;
  let context;

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: {
        width: FEATURE_GRAPHIC_LAYOUT.canvasWidth,
        height: FEATURE_GRAPHIC_LAYOUT.canvasHeight,
      },
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
    });
    await context.route('**/*', async route => {
      if (route.request().url().startsWith('data:')) {
        await route.continue();
      } else {
        await route.abort('blockedbyclient');
      }
    });
    const page = await context.newPage();
    let stagedResult;

    await withStagedFeaturePublication({
      finalPath: FINAL_PATH,
      legacyPath: LEGACY_PATH,
      populateAndValidate: async ({
        stagedFinalPath,
        stagedLegacyPath,
      }) => {
        const stagedFinalDir = path.dirname(stagedFinalPath);
        await fs.cp(FINAL_DIR, stagedFinalDir, { recursive: true });
        stagedResult = await composeFeatureGraphic({
          page,
          backgroundPath: BACKGROUND_PATH,
          wordmarkPath: WORDMARK_PATH,
          browserPngPath: path.join(tempDir, 'browser-feature.png'),
          outputPath: stagedFinalPath,
        });
        await fs.mkdir(path.dirname(stagedLegacyPath), { recursive: true });
        await fs.copyFile(stagedFinalPath, stagedLegacyPath);

        const assets = await validateFinalAssets({
          campaignPath: CAMPAIGN_PATH,
          finalDir: stagedFinalDir,
        });
        if (assets.length !== 9) {
          throw new Error(
            `Staged asset validation found ${assets.length} assets; expected 9`
          );
        }
        await validateFeatureGraphic(stagedLegacyPath);
      },
    });

    const [publishedAssets, legacyValidation, finalBytes, legacyBytes] =
      await Promise.all([
        validateFinalAssets({
          campaignPath: CAMPAIGN_PATH,
          finalDir: FINAL_DIR,
        }),
        validateFeatureGraphic(LEGACY_PATH),
        fs.readFile(FINAL_PATH),
        fs.readFile(LEGACY_PATH),
      ]);
    if (publishedAssets.length !== 9 || !finalBytes.equals(legacyBytes)) {
      throw new Error('Published feature graphic validation failed');
    }

    const crop = calculateCoverCrop({
      sourceWidth: 1536,
      sourceHeight: 1024,
      targetWidth: FEATURE_GRAPHIC_LAYOUT.canvasWidth,
      targetHeight: FEATURE_GRAPHIC_LAYOUT.canvasHeight,
      positionX: FEATURE_GRAPHIC_LAYOUT.backgroundPositionX,
      positionY: FEATURE_GRAPHIC_LAYOUT.backgroundPositionY,
    });
    console.log(
      `[feature] staged and published: ${stagedResult.metadata.width}x`
      + `${stagedResult.metadata.height}, 8-bit RGB, `
      + `${stagedResult.bytes} bytes`
    );
    console.log(
      `[feature] source cover crop: x ${crop.sourceLeft.toFixed(2)}..`
      + `${crop.sourceRight.toFixed(2)}, y ${crop.sourceTop.toFixed(2)}..`
      + `${crop.sourceBottom.toFixed(2)}`
    );
    console.log(
      `[feature] exact wordmark: ${stagedResult.audit.wordmark.width}x`
      + `${stagedResult.audit.wordmark.height} at `
      + `${stagedResult.audit.wordmark.left},`
      + `${stagedResult.audit.wordmark.top}`
    );
    console.log(
      `[feature] digest: ${stagedResult.digest}; `
      + `${publishedAssets.length} Play Store assets validated; `
      + `legacy ${legacyValidation.bytes} bytes`
    );
  } finally {
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

const IS_MAIN = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (IS_MAIN) {
  main().catch(error => {
    const detail = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(`[feature] ERROR\n${detail}`);
    process.exitCode = 1;
  });
}
