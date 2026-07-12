import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { validateCampaign } from './capturePlayStoreHelpers.mjs';
import {
  COMPOSITION_LAYOUT,
  buildCompositionHtml,
  composeCampaignItem,
} from './composePlayStoreScreenshots.mjs';
import { readPng } from './playStorePng.mjs';
import {
  TASK4_REAUDIT_LEVELS,
  rectanglesOverlap,
  validateUneaseVisibilityMetrics,
} from './playStoreUnease.mjs';

const SCRIPT_DIR = import.meta.dirname
  ?? path.dirname(fileURLToPath(import.meta.url));
const MOBILE_DIR = path.resolve(SCRIPT_DIR, '../..');
const DEFAULT_HEADLINE_FONT_PATH = path.join(
  MOBILE_DIR,
  'assets/fonts/Figtree-Bold.ttf'
);
const DEFAULT_SUPPORT_FONT_PATH = path.join(
  MOBILE_DIR,
  'assets/fonts/ShantellSans-Regular.ttf'
);

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function hiddenCueHtml(html) {
  return html.replace(
    '</head>',
    '<style>.unease-layer { display: none !important; }</style></head>'
  );
}

function thumbnailHtml(html) {
  return html.replace(
    '</head>',
    `<style>
      html, body {
        width: 216px !important;
        height: 384px !important;
      }
      .composition {
        transform: scale(0.5);
        transform-origin: top left;
      }
    </style></head>`
  );
}

async function renderHtml(page, html, outputPath) {
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.querySelectorAll('img')].map(image => image.decode())
    );
    await new Promise(resolve => requestAnimationFrame(resolve));
  });
  await page.screenshot({ path: outputPath, type: 'png', fullPage: false });
}

async function pixelDeltaMetrics(baselinePath, composedPath) {
  const [baseline, composed] = await Promise.all([
    readPng(baselinePath),
    readPng(composedPath),
  ]);
  if (
    baseline.width !== composed.width
    || baseline.height !== composed.height
  ) {
    throw new Error(
      `unease audit render mismatch: ${baseline.width}x${baseline.height} `
      + `versus ${composed.width}x${composed.height}`
    );
  }
  let changedPixels = 0;
  let totalDelta = 0;
  const pixelCount = baseline.width * baseline.height;
  for (let offset = 0; offset < baseline.data.length; offset += 4) {
    const red = Math.abs(baseline.data[offset] - composed.data[offset]);
    const green = Math.abs(
      baseline.data[offset + 1] - composed.data[offset + 1]
    );
    const blue = Math.abs(
      baseline.data[offset + 2] - composed.data[offset + 2]
    );
    if (Math.max(red, green, blue) >= 4) changedPixels += 1;
    totalDelta += red + green + blue;
  }
  return {
    width: baseline.width,
    height: baseline.height,
    changedPixels,
    changedFraction: changedPixels / pixelCount,
    visibilityScore: totalDelta / (pixelCount * 3 * 255),
  };
}

function cueCollisions(audit) {
  const protectedCopy = [
    ['headline', audit.headline],
    ['support', audit.support],
  ];
  return audit.cues.flatMap(cue =>
    protectedCopy
      .filter(([, region]) => rectanglesOverlap(cue, region))
      .map(([regionName]) => `${cue.name}:${regionName}`)
  );
}

async function loadRequiredSources(campaign, sourceDir) {
  return Promise.all(TASK4_REAUDIT_LEVELS.map(async level => {
    const item = campaign.find(candidate => candidate.uneaseLevel === level);
    if (!item) {
      throw new Error(
        `authentic unease audit has no campaign item for required level ${level}`
      );
    }
    const sourcePath = path.join(sourceDir, item.source);
    let bytes;
    let decoded;
    try {
      bytes = await fs.readFile(sourcePath);
      decoded = await readPng(sourcePath);
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw new Error(
          `authentic unease audit requires campaign source "${item.source}" `
          + `for level ${level}`
        );
      }
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(
        `authentic unease audit cannot decode campaign source `
        + `"${item.source}" for level ${level}: ${detail}`
      );
    }
    if (decoded.width !== 1080 || decoded.height !== 1920) {
      throw new Error(
        `authentic unease audit source "${item.source}" is `
        + `${decoded.width}x${decoded.height}; expected 1080x1920`
      );
    }
    return {
      item,
      sourcePath,
      bytes,
      digest: sha256(bytes),
    };
  }));
}

export async function auditAuthenticUneaseSources({
  campaignPath,
  sourceDir,
  headlineFontPath = DEFAULT_HEADLINE_FONT_PATH,
  supportFontPath = DEFAULT_SUPPORT_FONT_PATH,
} = {}) {
  if (!campaignPath || !sourceDir) {
    throw new Error('authentic unease audit requires campaignPath and sourceDir');
  }
  const campaign = validateCampaign(
    JSON.parse(await fs.readFile(campaignPath, 'utf8'))
  );
  const requiredSources = await loadRequiredSources(campaign, sourceDir);
  const [headlineFont, supportFont] = await Promise.all([
    fs.readFile(headlineFontPath),
    fs.readFile(supportFontPath),
  ]);
  const fonts = {
    headline: headlineFont.toString('base64'),
    support: supportFont.toString('base64'),
  };
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'wordshift-authentic-unease-audit-')
  );
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const finalContext = await browser.newContext({
      viewport: {
        width: COMPOSITION_LAYOUT.viewportWidth,
        height: COMPOSITION_LAYOUT.viewportHeight,
      },
      deviceScaleFactor: COMPOSITION_LAYOUT.deviceScaleFactor,
      serviceWorkers: 'block',
    });
    const thumbnailContext = await browser.newContext({
      viewport: { width: 216, height: 384 },
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
    });
    const finalPage = await finalContext.newPage();
    const thumbnailPage = await thumbnailContext.newPage();
    const results = [];

    for (const source of requiredSources) {
      const { item } = source;
      const itemDir = path.join(tempDir, `level-${item.uneaseLevel}`);
      const composed = await composeCampaignItem({
        page: finalPage,
        item,
        fonts,
        sourceDir,
        outputDir: path.join(itemDir, 'output'),
        browserPngDir: path.join(itemDir, 'browser'),
      });
      const collisions = cueCollisions(composed.audit);
      if (collisions.length > 0) {
        throw new Error(
          `${item.scenario}: authentic unease cues collide with protected `
          + `copy: ${collisions.join(', ')}`
        );
      }
      const html = buildCompositionHtml({
        item,
        sourceBase64: source.bytes.toString('base64'),
        headlineFontBase64: fonts.headline,
        supportFontBase64: fonts.support,
      });
      const finalBaselinePath = path.join(itemDir, 'final-baseline.png');
      const thumbnailBaselinePath = path.join(
        itemDir,
        'thumbnail-baseline.png'
      );
      const thumbnailComposedPath = path.join(
        itemDir,
        'thumbnail-composed.png'
      );
      await renderHtml(finalPage, hiddenCueHtml(html), finalBaselinePath);
      await renderHtml(
        thumbnailPage,
        thumbnailHtml(hiddenCueHtml(html)),
        thumbnailBaselinePath
      );
      await renderHtml(
        thumbnailPage,
        thumbnailHtml(html),
        thumbnailComposedPath
      );
      const [finalMetrics, thumbnailMetrics] = await Promise.all([
        pixelDeltaMetrics(finalBaselinePath, composed.outputPath),
        pixelDeltaMetrics(thumbnailBaselinePath, thumbnailComposedPath),
      ]);
      const profile = validateUneaseVisibilityMetrics({
        scenario: item.scenario,
        level: item.uneaseLevel,
        final: finalMetrics,
        thumbnail: thumbnailMetrics,
      });
      const digestAfter = sha256(await fs.readFile(source.sourcePath));
      if (digestAfter !== source.digest) {
        throw new Error(
          `${item.source}: authentic source bytes changed during unease audit`
        );
      }
      results.push({
        level: item.uneaseLevel,
        scenario: item.scenario,
        source: item.source,
        profile: profile.name,
        geometryValid: true,
        collisionCount: collisions.length,
        final: finalMetrics,
        thumbnail: thumbnailMetrics,
      });
    }

    await Promise.all([finalContext.close(), thumbnailContext.close()]);
    return results;
  } finally {
    await browser?.close().catch(() => {});
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}
