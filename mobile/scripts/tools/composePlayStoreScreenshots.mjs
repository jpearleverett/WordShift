import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { validateCampaign } from './capturePlayStoreHelpers.mjs';
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
const SOURCE_DIR = path.join(REPO_ROOT, 'docs/play-store/source');
const FINAL_DIR = path.join(REPO_ROOT, 'docs/play-store/final');
const REGULAR_FONT_PATH = path.join(
  MOBILE_DIR,
  'assets/fonts/ShantellSans-Regular.ttf'
);
const BOLD_FONT_PATH = path.join(
  MOBILE_DIR,
  'assets/fonts/ShantellSans-Bold.ttf'
);

export const PLAY_STORE_PALETTES = Object.freeze({
  bright: Object.freeze(['#756BE6', '#FFF2D2', '#F4B942', '#4A2E37']),
  dusk: Object.freeze(['#51466F', '#F5E7CC', '#C99047', '#2A2438']),
  mystery: Object.freeze(['#292844', '#EBDCC7', '#A85B64', '#171725']),
});

export const COMPOSITION_LAYOUT = Object.freeze({
  viewportWidth: 432,
  viewportHeight: 768,
  deviceScaleFactor: 2.5,
  copyBandHeight: 88,
  frameLeft: 23.5,
  frameTop: 88,
  frameWidth: 385,
  frameHeight: 672,
  framePadding: 8,
  captureWidth: 369,
  captureHeight: 656,
});

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function headlineFontSize(headline) {
  if (headline.length >= 26) return 20.5;
  if (headline.length >= 22) return 22.5;
  if (headline.length >= 19) return 24;
  return 27;
}

export function buildCompositionHtml({
  item,
  sourceBase64,
  regularFontBase64,
  boldFontBase64,
}) {
  const palette = PLAY_STORE_PALETTES[item?.theme];
  if (!palette) {
    throw new Error(`${item?.scenario ?? 'campaign item'}: unsupported palette`);
  }
  const [background, parchment, amber, ink] = palette;
  const headline = escapeHtml(item.headline);
  const support = escapeHtml(item.support);
  const altText = escapeHtml(item.altText);
  const headlineSize = headlineFontSize(item.headline);
  const layout = COMPOSITION_LAYOUT;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=${layout.viewportWidth}, initial-scale=1">
    <style>
      @font-face {
        font-family: "Shantell";
        src: url(data:font/ttf;base64,${regularFontBase64}) format("truetype");
        font-style: normal;
        font-weight: 400;
      }
      @font-face {
        font-family: "Shantell";
        src: url(data:font/ttf;base64,${boldFontBase64}) format("truetype");
        font-style: normal;
        font-weight: 700;
      }
      * {
        box-sizing: border-box;
      }
      html, body {
        width: ${layout.viewportWidth}px;
        height: ${layout.viewportHeight}px;
        margin: 0;
        overflow: hidden;
        background: ${background};
      }
      body {
        font-family: "Shantell", sans-serif;
        -webkit-font-smoothing: antialiased;
      }
      .composition {
        position: relative;
        width: ${layout.viewportWidth}px;
        height: ${layout.viewportHeight}px;
        overflow: hidden;
        background: ${background};
      }
      .copy-band {
        position: absolute;
        top: 6px;
        left: 6px;
        width: 420px;
        height: 76px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        padding: 7px 16px 6px;
        overflow: hidden;
        color: ${ink};
        background: ${parchment};
        border: 3px solid ${ink};
        border-radius: 13px;
        box-shadow:
          inset 0 0 0 2px ${amber},
          0 4px 0 ${ink};
      }
      .headline {
        max-width: 386px;
        overflow: hidden;
        color: ${ink};
        font-size: ${headlineSize}px;
        font-weight: 700;
        line-height: 1.3;
        letter-spacing: 0.25px;
        text-align: center;
        white-space: nowrap;
      }
      .support {
        max-width: 392px;
        overflow: hidden;
        color: ${ink};
        font-size: 12.5px;
        font-weight: 400;
        line-height: 17px;
        letter-spacing: 0;
        text-align: center;
        white-space: nowrap;
      }
      .capture-frame {
        position: absolute;
        top: ${layout.frameTop}px;
        left: ${layout.frameLeft}px;
        width: ${layout.frameWidth}px;
        height: ${layout.frameHeight}px;
        padding: ${layout.framePadding}px;
        overflow: hidden;
        background: ${ink};
        border-radius: 14px;
        box-shadow:
          0 0 0 2px ${amber},
          0 5px 0 ${ink};
      }
      .capture {
        display: block;
        width: ${layout.captureWidth}px;
        height: ${layout.captureHeight}px;
        object-fit: cover;
        border-radius: 7px;
      }
    </style>
  </head>
  <body>
    <main class="composition" aria-label="${altText}">
      <header class="copy-band">
        <div class="headline">${headline}</div>
        <div class="support">${support}</div>
      </header>
      <div class="capture-frame">
        <img
          class="capture"
          src="data:image/png;base64,${sourceBase64}"
          alt="${altText}"
        >
      </div>
    </main>
  </body>
</html>`;
}

async function loadCampaign() {
  const campaign = JSON.parse(await fs.readFile(CAMPAIGN_PATH, 'utf8'));
  return validateCampaign(campaign);
}

async function waitForComposition(page, item) {
  const audit = await page.evaluate(async () => {
    await document.fonts.ready;
    const capture = document.querySelector('.capture');
    if (!(capture instanceof HTMLImageElement)) {
      throw new Error('Authentic source image is missing');
    }
    await capture.decode();
    await new Promise(resolve => requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    }));

    const root = document.querySelector('.composition');
    const band = document.querySelector('.copy-band');
    const headline = document.querySelector('.headline');
    const support = document.querySelector('.support');
    const frame = document.querySelector('.capture-frame');
    if (!root || !band || !headline || !support || !frame) {
      throw new Error('Composition structure is incomplete');
    }
    const toBounds = element => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      };
    };
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      root: toBounds(root),
      band: toBounds(band),
      headline: toBounds(headline),
      support: toBounds(support),
      frame: toBounds(frame),
      capture: toBounds(capture),
      natural: {
        width: capture.naturalWidth,
        height: capture.naturalHeight,
      },
      fontsStatus: document.fonts.status,
    };
  });

  const layout = COMPOSITION_LAYOUT;
  if (
    audit.viewport.width !== layout.viewportWidth
    || audit.viewport.height !== layout.viewportHeight
    || audit.root.width !== layout.viewportWidth
    || audit.root.height !== layout.viewportHeight
  ) {
    throw new Error(`${item.scenario}: composition viewport is not 432x768`);
  }
  if (
    audit.natural.width !== 1080
    || audit.natural.height !== 1920
  ) {
    throw new Error(
      `${item.scenario}: source rendered at ${audit.natural.width}x`
      + `${audit.natural.height}; expected 1080x1920`
    );
  }
  if (
    audit.capture.width !== layout.captureWidth
    || audit.capture.height !== layout.captureHeight
  ) {
    throw new Error(
      `${item.scenario}: authentic capture area is not `
      + `${layout.captureWidth}x${layout.captureHeight}`
    );
  }
  if (
    audit.headline.scrollWidth > Math.ceil(audit.headline.width)
    || audit.headline.scrollHeight > Math.ceil(audit.headline.height)
    || audit.support.scrollWidth > Math.ceil(audit.support.width)
    || audit.support.scrollHeight > Math.ceil(audit.support.height)
  ) {
    throw new Error(
      `${item.scenario}: campaign copy is clipped: `
      + JSON.stringify({ headline: audit.headline, support: audit.support })
    );
  }
  if (
    audit.band.left < 0
    || audit.band.top < 0
    || audit.band.right > layout.viewportWidth
    || audit.frame.left < 0
    || audit.frame.right > layout.viewportWidth
    || audit.frame.bottom > layout.viewportHeight
  ) {
    throw new Error(`${item.scenario}: composition extends outside the viewport`);
  }
  if (audit.fontsStatus !== 'loaded') {
    throw new Error(`${item.scenario}: embedded Shantell fonts did not load`);
  }
}

async function composeCampaignItem(page, item, fonts, tempDir) {
  const sourcePath = path.join(SOURCE_DIR, item.source);
  const source = await readPng(sourcePath);
  if (source.width !== 1080 || source.height !== 1920) {
    throw new Error(
      `${item.source} is ${source.width}x${source.height}; expected 1080x1920`
    );
  }
  const sourceBase64 = (await fs.readFile(sourcePath)).toString('base64');
  const html = buildCompositionHtml({
    item,
    sourceBase64,
    regularFontBase64: fonts.regular,
    boldFontBase64: fonts.bold,
  });

  await page.setContent(html, { waitUntil: 'load' });
  await waitForComposition(page, item);

  const browserPngPath = path.join(tempDir, `${item.scenario}.png`);
  await page.screenshot({
    path: browserPngPath,
    type: 'png',
    fullPage: false,
  });
  const browserPng = await readPng(browserPngPath);
  if (browserPng.width !== 1080 || browserPng.height !== 1920) {
    throw new Error(
      `${item.scenario}: browser rendered ${browserPng.width}x`
      + `${browserPng.height}; expected 1080x1920`
    );
  }

  const outputPath = path.join(FINAL_DIR, item.final);
  await writeOpaquePng(outputPath, browserPng);
  const metadata = await readPngMetadata(outputPath);
  if (
    metadata.width !== 1080
    || metadata.height !== 1920
    || metadata.bitDepth !== 8
    || metadata.colorType !== 2
  ) {
    throw new Error(`${item.final}: RGB re-encoding failed`);
  }
  return {
    outputPath,
    metadata,
    digest: createHash('sha256')
      .update(await fs.readFile(outputPath))
      .digest('hex'),
  };
}

async function main() {
  const campaign = await loadCampaign();
  const [regularFont, boldFont] = await Promise.all([
    fs.readFile(REGULAR_FONT_PATH),
    fs.readFile(BOLD_FONT_PATH),
  ]);
  const fonts = {
    regular: regularFont.toString('base64'),
    bold: boldFont.toString('base64'),
  };
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), 'wordshift-play-store-compose-')
  );
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: {
        width: COMPOSITION_LAYOUT.viewportWidth,
        height: COMPOSITION_LAYOUT.viewportHeight,
      },
      deviceScaleFactor: COMPOSITION_LAYOUT.deviceScaleFactor,
      serviceWorkers: 'block',
    });
    await context.route('**/*', async route => {
      const url = route.request().url();
      if (url.startsWith('data:')) {
        await route.continue();
      } else {
        await route.abort('blockedbyclient');
      }
    });
    const page = await context.newPage();
    const results = [];

    for (const [index, item] of campaign.entries()) {
      console.log(
        `[compose] ${index + 1}/${campaign.length} ${item.scenario}`
      );
      const result = await composeCampaignItem(page, item, fonts, tempDir);
      if (results.some(previous => previous.digest === result.digest)) {
        throw new Error(`${item.final}: duplicate final composition detected`);
      }
      results.push(result);
      console.log(
        `[compose] ${item.final}: ${result.metadata.width}x`
        + `${result.metadata.height}, 8-bit RGB`
      );
    }

    await context.close();
    console.log(`[compose] complete: ${results.length} unique final screenshots`);
  } finally {
    await browser?.close().catch(() => {});
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

const IS_MAIN = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (IS_MAIN) {
  main().catch(error => {
    const detail = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(`[compose] ERROR\n${detail}`);
    process.exitCode = 1;
  });
}
