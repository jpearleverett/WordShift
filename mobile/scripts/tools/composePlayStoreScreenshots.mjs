import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { validateCampaign } from './capturePlayStoreHelpers.mjs';
import { validateFinalAssets } from './validatePlayStoreAssets.mjs';
import {
  readPng,
  readPngMetadata,
  writeOpaquePng,
} from './playStorePng.mjs';
import {
  cueGeometryCss,
  getActiveUneaseCues,
  validateUneaseLevel,
} from './playStoreUnease.mjs';

const SCRIPT_DIR = import.meta.dirname
  ?? path.dirname(fileURLToPath(import.meta.url));
const MOBILE_DIR = path.resolve(SCRIPT_DIR, '../..');
const REPO_ROOT = path.resolve(MOBILE_DIR, '..');
const CAMPAIGN_PATH = path.join(REPO_ROOT, 'docs/play-store/campaign.json');
const SOURCE_DIR = path.join(REPO_ROOT, 'docs/play-store/source');
const FINAL_DIR = path.join(REPO_ROOT, 'docs/play-store/final');
const HEADLINE_FONT_PATH = path.join(
  MOBILE_DIR,
  'assets/fonts/Figtree-Bold.ttf'
);
const SUPPORT_FONT_PATH = path.join(
  MOBILE_DIR,
  'assets/fonts/ShantellSans-Regular.ttf'
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

function cueContent(cueDefinition, sourceBase64) {
  if (cueDefinition.contentKind === 'source-echo') {
    return `<img class="cue-portrait-source" `
      + `src="data:image/png;base64,${sourceBase64}" alt="" aria-hidden="true">`;
  }
  if (cueDefinition.contentKind === 'eyes') {
    const eye = '<span class="eye-shape" data-eye-shape>'
      + '<i class="eye-core" data-eye-core></i></span>';
    return eye + eye;
  }
  return '';
}

function renderUneaseCues(uneaseLevel, sourceBase64, scenario) {
  return getActiveUneaseCues(uneaseLevel, scenario)
    .map(cueDefinition =>
      `<div class="unease-cue cue-${cueDefinition.name}" `
      + `data-unease-cue="${cueDefinition.name}" `
      + `data-unease-min-level="${cueDefinition.minLevel}" `
      + `aria-hidden="true">`
      + cueContent(cueDefinition, sourceBase64)
      + '</div>'
    )
    .join('\n        ');
}

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
  headlineFontBase64,
  supportFontBase64,
}) {
  validateUneaseLevel(item?.uneaseLevel, item?.scenario);
  const palette = PLAY_STORE_PALETTES[item?.theme];
  if (!palette) {
    throw new Error(`${item?.scenario ?? 'campaign item'}: unsupported palette`);
  }
  const [background, parchment, amber, ink] = palette;
  const headline = escapeHtml(item.headline);
  const support = escapeHtml(item.support);
  const altText = escapeHtml(item.altText);
  const headlineSize = headlineFontSize(item.headline);
  const uneaseCues = renderUneaseCues(
    item.uneaseLevel,
    sourceBase64,
    item.scenario
  );
  const cueGeometry = cueGeometryCss();
  const layout = COMPOSITION_LAYOUT;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=${layout.viewportWidth}, initial-scale=1">
    <style>
      @font-face {
        font-family: "Figtree";
        src: url(data:font/ttf;base64,${headlineFontBase64}) format("truetype");
        font-style: normal;
        font-weight: 700;
      }
      @font-face {
        font-family: "Shantell";
        src: url(data:font/ttf;base64,${supportFontBase64}) format("truetype");
        font-style: normal;
        font-weight: 400;
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
        font-family: "Shantell", cursive;
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
        z-index: 2;
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
        font-family: "Figtree", sans-serif;
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
        font-family: "Shantell", cursive;
        font-size: 12.5px;
        font-weight: 400;
        line-height: 17px;
        letter-spacing: 0;
        text-align: center;
        white-space: nowrap;
      }
      .capture-frame {
        position: absolute;
        z-index: 1;
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
      .capture-window {
        position: relative;
        width: ${layout.captureWidth}px;
        height: ${layout.captureHeight}px;
        overflow: hidden;
        border-radius: 7px;
      }
      .capture {
        display: block;
        width: ${layout.captureWidth}px;
        height: ${layout.captureHeight}px;
        object-fit: cover;
        border-radius: 7px;
      }
      .unease-layer {
        position: absolute;
        z-index: 3;
        inset: 0;
        width: ${layout.viewportWidth}px;
        height: ${layout.viewportHeight}px;
        overflow: hidden;
        pointer-events: none;
      }
      .unease-cue,
      .unease-cue * {
        position: absolute;
        pointer-events: none;
      }
      ${cueGeometry}
      .cue-crimson-glint {
        opacity: 0.42;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(190, 50, 68, 0.72) 46%,
          transparent
        );
      }
      .cue-frame-grain {
        border: 6px solid transparent;
        border-radius: 12px;
        opacity: 0.22;
        background:
          repeating-linear-gradient(
            91deg,
            transparent 0 19px,
            rgba(255, 229, 190, 0.3) 20px,
            transparent 21px 47px
          ) border-box,
          repeating-linear-gradient(
            177deg,
            transparent 0 31px,
            rgba(84, 29, 45, 0.24) 32px,
            transparent 33px 61px
          ) border-box;
        -webkit-mask:
          linear-gradient(#000 0 0) padding-box,
          linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
      }
      .cue-title-sigil {
        opacity: 0.24;
        background: radial-gradient(
          circle at center,
          rgba(168, 63, 67, 0.72) 0 1px,
          transparent 1.5px
        );
      }
      .cue-title-sigil::before,
      .cue-title-sigil::after {
        content: "";
        position: absolute;
        top: 2px;
        height: 1px;
        background: rgba(142, 42, 58, 0.7);
      }
      .cue-title-sigil::before {
        left: 5px;
        width: 17px;
        transform: rotate(-10deg);
        transform-origin: right center;
      }
      .cue-title-sigil::after {
        right: 5px;
        width: 17px;
        transform: rotate(10deg);
        transform-origin: left center;
      }
      .cue-distant-eyes {
        opacity: 0.5;
      }
      .eye-shape {
        top: 2.5px;
        width: 11px;
        height: 5px;
        overflow: visible;
        background: rgba(53, 18, 31, 0.76);
        clip-path: polygon(
          0 50%,
          22% 10%,
          50% 0,
          78% 10%,
          100% 50%,
          78% 90%,
          50% 100%,
          22% 90%
        );
        filter: drop-shadow(0 0 1.4px rgba(153, 34, 52, 0.5));
      }
      .eye-shape:first-child {
        left: 1px;
        transform: rotate(-2deg);
      }
      .eye-shape:last-child {
        right: 1px;
        transform: rotate(2deg);
      }
      .eye-core {
        top: 1.9px;
        left: 3.5px;
        width: 4px;
        height: 1.2px;
        border-radius: 50%;
        background: rgba(225, 67, 76, 0.82);
        box-shadow: 0 0 2px rgba(202, 48, 65, 0.62);
      }
      .cue-portrait-echo {
        overflow: hidden;
        border-radius: 9px;
        opacity: 0.1;
        mix-blend-mode: screen;
      }
      .cue-portrait-source {
        top: -455px;
        left: -16px;
        width: ${layout.captureWidth}px;
        height: ${layout.captureHeight}px;
        max-width: none;
        object-fit: cover;
        transform: translateX(2px);
        filter: sepia(0.34) saturate(1.4) hue-rotate(318deg);
      }
      .cue-mode-thread {
        opacity: 0.3;
        background: linear-gradient(
          180deg,
          transparent,
          rgba(186, 39, 59, 0.76) 12% 86%,
          transparent
        );
        transform: rotate(0.8deg);
        transform-origin: center;
      }
      .cue-reward-glow {
        opacity: 0.31;
        background: radial-gradient(
          ellipse at center,
          rgba(207, 43, 57, 0.42) 0,
          rgba(164, 32, 52, 0.15) 38%,
          transparent 70%
        );
        mix-blend-mode: screen;
      }
      .cue-dusk-vignette {
        border-radius: 7px;
        opacity: 0.72;
        background: radial-gradient(
          ellipse at 50% 43%,
          transparent 46%,
          rgba(26, 12, 40, 0.1) 72%,
          rgba(17, 8, 31, 0.3) 100%
        );
      }
      .cue-watching-eyes {
        opacity: 0.68;
      }
      .cue-watching-eyes .eye-shape {
        top: 1px;
        width: 12px;
        background: rgba(45, 13, 28, 0.84);
      }
      .composition[data-unease-level="6"] .cue-crimson-glint,
      .composition[data-unease-level="7"] .cue-crimson-glint {
        opacity: 0.52;
      }
    </style>
  </head>
  <body>
    <main
      class="composition"
      data-unease-level="${item.uneaseLevel}"
      aria-label="${altText}"
    >
      <header class="copy-band">
        <div class="headline">${headline}</div>
        <div class="support">${support}</div>
      </header>
      <div class="capture-frame">
        <div class="capture-window">
          <img
            class="capture"
            src="data:image/png;base64,${sourceBase64}"
            alt="${altText}"
          >
        </div>
      </div>
      <div class="unease-layer" aria-hidden="true">
        ${uneaseCues}
      </div>
    </main>
  </body>
</html>`;
}

async function loadCampaign() {
  const campaign = JSON.parse(await fs.readFile(CAMPAIGN_PATH, 'utf8'));
  return validateCampaign(campaign);
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

async function copyPreservedEntries(sourceDir, destinationDir, preserveNames) {
  await Promise.all(preserveNames.map(name => fs.copyFile(
    path.join(sourceDir, name),
    path.join(destinationDir, name)
  )));
}

async function replaceDirectory(stagingDir, finalDir) {
  const finalExists = await pathExists(finalDir);
  if (!finalExists) {
    await fs.rename(stagingDir, finalDir);
    return;
  }

  const backupDir = path.join(
    path.dirname(finalDir),
    `.${path.basename(finalDir)}.backup-${randomUUID()}`
  );
  await fs.rename(finalDir, backupDir);
  try {
    await fs.rename(stagingDir, finalDir);
  } catch (error) {
    await fs.rename(backupDir, finalDir);
    throw error;
  }
  await fs.rm(backupDir, { recursive: true, force: true });
}

export async function withStagedPublication({
  finalDir,
  preserveNames = [],
  populateAndValidate,
}) {
  if (typeof populateAndValidate !== 'function') {
    throw new Error('populateAndValidate must be a function');
  }

  const parentDir = path.dirname(finalDir);
  await fs.mkdir(parentDir, { recursive: true });
  let finalDirectoryMode = 0o755;
  if (await pathExists(finalDir)) {
    const finalStat = await fs.stat(finalDir);
    if (!finalStat.isDirectory()) {
      throw new Error(`${finalDir} is not a directory`);
    }
    finalDirectoryMode = finalStat.mode & 0o777;
  }
  const stagingDir = await fs.mkdtemp(
    path.join(parentDir, `.${path.basename(finalDir)}.staging-`)
  );
  await fs.chmod(stagingDir, finalDirectoryMode);

  try {
    await copyPreservedEntries(finalDir, stagingDir, preserveNames);
    await populateAndValidate(stagingDir);
    await replaceDirectory(stagingDir, finalDir);
  } finally {
    await fs.rm(stagingDir, { recursive: true, force: true });
  }
}

async function waitForComposition(page, item) {
  const audit = await page.evaluate(async () => {
    await document.fonts.ready;
    const capture = document.querySelector('.capture');
    if (!(capture instanceof HTMLImageElement)) {
      throw new Error('Authentic source image is missing');
    }
    const images = [...document.querySelectorAll('img')];
    await Promise.all(images.map(image => image.decode()));
    await new Promise(resolve => requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    }));

    const root = document.querySelector('.composition');
    const band = document.querySelector('.copy-band');
    const headline = document.querySelector('.headline');
    const support = document.querySelector('.support');
    const frame = document.querySelector('.capture-frame');
    const captureWindow = document.querySelector('.capture-window');
    if (
      !root
      || !band
      || !headline
      || !support
      || !frame
      || !captureWindow
    ) {
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
    const cueElements = [...document.querySelectorAll('[data-unease-cue]')];
    const overlayElements = [
      ...document.querySelectorAll('.unease-layer, .unease-layer *'),
    ];
    const portraitEcho = document.querySelector('.cue-portrait-echo');
    const portraitSource = portraitEcho?.querySelector('.cue-portrait-source');
    const firstFamily = element => getComputedStyle(element)
      .fontFamily
      .split(',')[0]
      .replaceAll('"', '')
      .trim();
    const loadedFaces = [...document.fonts].map(face => ({
      family: face.family.replaceAll('"', '').trim(),
      weight: face.weight,
      status: face.status,
    }));
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
      captureWindow: {
        ...toBounds(captureWindow),
        overflow: getComputedStyle(captureWindow).overflow,
      },
      capture: toBounds(capture),
      cues: cueElements.map(element => ({
        name: element.dataset.uneaseCue,
        ...toBounds(element),
        pointerEvents: getComputedStyle(element).pointerEvents,
      })),
      allOverlaysIgnorePointerEvents: overlayElements.every(
        element => getComputedStyle(element).pointerEvents === 'none'
      ),
      portraitEcho: portraitEcho ? {
        ...toBounds(portraitEcho),
        overflow: getComputedStyle(portraitEcho).overflow,
        usesAuthenticSource:
          portraitSource instanceof HTMLImageElement
          && portraitSource.currentSrc === capture.currentSrc,
      } : null,
      natural: {
        width: capture.naturalWidth,
        height: capture.naturalHeight,
      },
      fonts: {
        status: document.fonts.status,
        figtreeLoaded: loadedFaces.some(face =>
          face.family === 'Figtree'
          && face.weight === '700'
          && face.status === 'loaded'
        ),
        shantellLoaded: loadedFaces.some(face =>
          face.family === 'Shantell'
          && face.weight === '400'
          && face.status === 'loaded'
        ),
        headlineFamily: firstFamily(headline),
        supportFamily: firstFamily(support),
      },
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
    || audit.captureWindow.width !== layout.captureWidth
    || audit.captureWindow.height !== layout.captureHeight
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
  const expectedCues = getActiveUneaseCues(
    item.uneaseLevel,
    item.scenario
  ).map(cueDefinition => cueDefinition.name);
  const cueNames = audit.cues.map(cue => cue.name);
  if (JSON.stringify(cueNames) !== JSON.stringify(expectedCues)) {
    throw new Error(
      `${item.scenario}: unease cues do not match level ${item.uneaseLevel}`
    );
  }
  if (!audit.allOverlaysIgnorePointerEvents) {
    throw new Error(`${item.scenario}: an unease overlay accepts pointer events`);
  }
  for (const cue of audit.cues) {
    if (
      cue.pointerEvents !== 'none'
      || cue.left < audit.root.left
      || cue.top < audit.root.top
      || cue.right > audit.root.right
      || cue.bottom > audit.root.bottom
    ) {
      throw new Error(
        `${item.scenario}: cue "${cue.name}" is interactive or out of bounds`
      );
    }
  }
  for (const cue of audit.cues) {
    if (
      cue.left < audit.frame.left
      || cue.top < audit.frame.top
      || cue.right > audit.frame.right
      || cue.bottom > audit.frame.bottom
    ) {
      throw new Error(`${item.scenario}: cue "${cue.name}" escaped the frame`);
    }
  }
  if (audit.captureWindow.overflow !== 'hidden') {
    throw new Error(`${item.scenario}: source capture is not clipped to its frame`);
  }
  if (
    item.uneaseLevel >= 4
    && (
      !audit.portraitEcho
      || audit.portraitEcho.overflow !== 'hidden'
      || !audit.portraitEcho.usesAuthenticSource
    )
  ) {
    throw new Error(`${item.scenario}: portrait echo is not authentic or clipped`);
  }
  if (
    audit.fonts.status !== 'loaded'
    || !audit.fonts.figtreeLoaded
    || !audit.fonts.shantellLoaded
    || audit.fonts.headlineFamily !== 'Figtree'
    || audit.fonts.supportFamily !== 'Shantell'
  ) {
    throw new Error(`${item.scenario}: embedded marketing fonts did not load`);
  }
  return audit;
}

export async function composeCampaignItem({
  page,
  item,
  fonts,
  sourceDir,
  outputDir,
  browserPngDir,
}) {
  const sourcePath = path.join(sourceDir, item.source);
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
    headlineFontBase64: fonts.headline,
    supportFontBase64: fonts.support,
  });

  await page.setContent(html, { waitUntil: 'load' });
  const audit = await waitForComposition(page, item);

  await fs.mkdir(browserPngDir, { recursive: true });
  const browserPngPath = path.join(browserPngDir, `${item.scenario}.png`);
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

  const outputPath = path.join(outputDir, item.final);
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
    audit,
    digest: createHash('sha256')
      .update(await fs.readFile(outputPath))
      .digest('hex'),
  };
}

async function main() {
  const campaign = await loadCampaign();
  const [headlineFont, supportFont] = await Promise.all([
    fs.readFile(HEADLINE_FONT_PATH),
    fs.readFile(SUPPORT_FONT_PATH),
  ]);
  const fonts = {
    headline: headlineFont.toString('base64'),
    support: supportFont.toString('base64'),
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
    await withStagedPublication({
      finalDir: FINAL_DIR,
      preserveNames: ['feature-graphic.png'],
      populateAndValidate: async stagingDir => {
        const results = [];
        for (const [index, item] of campaign.entries()) {
          console.log(
            `[compose] ${index + 1}/${campaign.length} ${item.scenario}`
          );
          const result = await composeCampaignItem({
            page,
            item,
            fonts,
            sourceDir: SOURCE_DIR,
            outputDir: stagingDir,
            browserPngDir: tempDir,
          });
          if (results.some(previous => previous.digest === result.digest)) {
            throw new Error(`${item.final}: duplicate final composition detected`);
          }
          results.push(result);
          console.log(
            `[compose] ${item.final}: ${result.metadata.width}x`
            + `${result.metadata.height}, 8-bit RGB staged`
          );
        }

        const stagedAssets = await validateFinalAssets({
          campaignPath: CAMPAIGN_PATH,
          finalDir: stagingDir,
          screenshotsOnly: true,
        });
        const stagedScreenshots = stagedAssets.filter(
          result => result.kind === 'screenshot'
        );
        if (stagedScreenshots.length !== campaign.length) {
          throw new Error(
            `Staged validation found ${stagedScreenshots.length} screenshots; `
            + `expected ${campaign.length}`
          );
        }
        console.log(
          `[compose] staged validation complete: ${results.length} unique `
          + 'screenshots, exact geometry, unclipped copy, 8-bit RGB'
        );
      },
    });

    await context.close();
    console.log(
      `[compose] published: ${campaign.length} unique final screenshots`
    );
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
