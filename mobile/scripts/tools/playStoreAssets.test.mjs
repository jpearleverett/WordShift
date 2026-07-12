import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, afterEach, before, beforeEach, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import {
  readPng,
  readPngMetadata,
  writeOpaquePng,
} from './playStorePng.mjs';
import {
  COMPOSITION_LAYOUT,
  PLAY_STORE_PALETTES,
  buildCompositionHtml,
  composeCampaignItem,
  withStagedPublication,
} from './composePlayStoreScreenshots.mjs';
import {
  validateFinalAssets,
  validatePlayStoreAssets,
  validateSourceAssets,
} from './validatePlayStoreAssets.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CAMPAIGN_PATH = path.resolve(
  SCRIPT_DIR,
  '../../../docs/play-store/campaign.json'
);
const COMPOSER_PATH = path.join(SCRIPT_DIR, 'composePlayStoreScreenshots.mjs');
const STORE_LISTING_PATH = path.resolve(
  SCRIPT_DIR,
  '../../../docs/STORE_LISTING.md'
);
const LAUNCH_CHECKLIST_PATH = path.resolve(
  SCRIPT_DIR,
  '../../../docs/LAUNCH_CHECKLIST.md'
);
const LANDING_PAGE_PATH = path.resolve(
  SCRIPT_DIR,
  '../../../docs/index.md'
);
const FIGTREE_BOLD_PATH = path.resolve(
  SCRIPT_DIR,
  '../../assets/fonts/Figtree-Bold.ttf'
);
const SHANTELL_REGULAR_PATH = path.resolve(
  SCRIPT_DIR,
  '../../assets/fonts/ShantellSans-Regular.ttf'
);
const CHECKED_SOURCE_DIR = path.resolve(
  SCRIPT_DIR,
  '../../../docs/play-store/source'
);
const EXPECTED_CUE_DEFINITIONS = [
  { name: 'crimson-glint', minLevel: 1, contentKind: 'empty' },
  { name: 'frame-grain', minLevel: 1, contentKind: 'empty' },
  { name: 'title-sigil', minLevel: 2, contentKind: 'empty' },
  { name: 'distant-eyes', minLevel: 3, contentKind: 'eyes' },
  { name: 'portrait-echo', minLevel: 4, contentKind: 'source-echo' },
  { name: 'mode-thread', minLevel: 5, contentKind: 'empty' },
  { name: 'reward-glow', minLevel: 6, contentKind: 'empty' },
  { name: 'dusk-vignette', minLevel: 7, contentKind: 'empty' },
  { name: 'watching-eyes', minLevel: 7, contentKind: 'eyes' },
];
const EXPECTED_VISIBILITY_PROFILES = [
  {
    name: 'low',
    level: 1,
    final: {
      minChangedFraction: 0.00035,
      minVisibilityScore: 0.00001,
      maxChangedFraction: 0.06,
      maxVisibilityScore: 0.05,
    },
    thumbnail: {
      minChangedFraction: 0.008,
      minVisibilityScore: 0.0006,
      maxChangedFraction: 0.08,
      maxVisibilityScore: 0.05,
    },
  },
  {
    name: 'mid',
    level: 4,
    final: {
      minChangedFraction: 0.006,
      minVisibilityScore: 0.0002,
      maxChangedFraction: 0.12,
      maxVisibilityScore: 0.05,
    },
    thumbnail: {
      minChangedFraction: 0.018,
      minVisibilityScore: 0.001,
      maxChangedFraction: 0.15,
      maxVisibilityScore: 0.05,
    },
  },
  {
    name: 'high',
    level: 7,
    final: {
      minChangedFraction: 0.09,
      minVisibilityScore: 0.0024,
      maxChangedFraction: 0.42,
      maxVisibilityScore: 0.05,
    },
    thumbnail: {
      minChangedFraction: 0.09,
      minVisibilityScore: 0.003,
      maxChangedFraction: 0.45,
      maxVisibilityScore: 0.05,
    },
  },
];
const EXPECTED_SCENARIOS = [
  'puzzle-preview',
  'puzzle-chain',
  'home-sunny',
  'animal-dialogue',
  'variant-menu',
  'flawless-victory',
  'home-dusk',
];
const EXPECTED_SOURCES = [
  '01_puzzle_preview.png',
  '02_puzzle_chain.png',
  '03_home_sunny.png',
  '04_animal_dialogue.png',
  '05_variant_menu.png',
  '06_flawless_victory.png',
  '07_home_dusk.png',
];
const EXPECTED_FINALS = [
  '01_shift_one_letter.png',
  '02_every_word_stays_real.png',
  '03_build_a_home.png',
  '04_meet_unlikely_friends.png',
  '05_master_every_mode.png',
  '06_flawless_offering.png',
  '07_theyve_been_waiting.png',
];
const OLD_EIGHT_SOURCES = [
  '01_puzzle_preview.png',
  '02_puzzle_chain.png',
  '03_home_sunny.png',
  '04_animal_dialogue.png',
  '05_variant_menu.png',
  '06_daily.png',
  '07_flawless_victory.png',
  '08_home_dusk.png',
];
const OLD_EIGHT_FINALS = [
  '01_shift_one_letter.png',
  '02_every_word_stays_real.png',
  '03_build_a_home.png',
  '04_meet_unlikely_friends.png',
  '05_master_every_mode.png',
  '06_new_puzzle_every_day.png',
  '07_flawless_offering.png',
  '08_theyve_been_waiting.png',
];
const EXPECTED_HEADLINES = [
  'SHIFT ONE LETTER',
  'EVERY WORD STAYS REAL',
  'BUILD A HOME',
  'MEET 13 UNLIKELY FRIENDS',
  'MASTER EVERY MODE',
  'CHASE A FLAWLESS OFFERING',
  "THEY'VE BEEN WAITING",
];
const EXPECTED_SUPPORT = [
  'Move it down. Keep both words real. Something remains.',
  'Build a chain one clever move at a time. The words remember.',
  'Your words bring every room to life. Every room was waiting.',
  'They always have something to tell you. Never everything.',
  'Reverse it. Race it. Hide the previews. The pattern still grows.',
  'No hints. No mistakes. It notices perfection.',
  'Some houses remember every word.',
];
const EXPECTED_ALT_TEXTS = [
  'WordShift puzzle board with the letter L selected and valid and invalid destination word previews visible.',
  'WordShift puzzle showing PAY, PLANT, and HEAR midway through a valid letter-shifting chain.',
  'Sunny WordShift house with several furnished rooms and multiple animal companions.',
  'Ember the fox speaking to the player in a warm dialogue scene over the animal house.',
  'WordShift setup menu displaying Standard, Reverse, Double Shift, Speed, and Blind Offering modes.',
  'WordShift victory screen showing a flawless three-star solve and amber rewards.',
  'WordShift animal house at dusk beneath a purple-orange sky, with the Jungle Hammock locked above furnished rooms.',
];

let tempDir;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wordshift-play-store-assets-'));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

function makeCampaign() {
  return EXPECTED_SCENARIOS.map((scenario, index) => ({
    scenario,
    source: EXPECTED_SOURCES[index],
    final: EXPECTED_FINALS[index],
    headline: EXPECTED_HEADLINES[index],
    support: EXPECTED_SUPPORT[index],
    altText: EXPECTED_ALT_TEXTS[index],
    theme: index < 4 ? 'bright' : index < 6 ? 'dusk' : 'mystery',
    uneaseLevel: index + 1,
  }));
}

async function writeCampaign(campaign = makeCampaign()) {
  const campaignPath = path.join(tempDir, 'campaign.json');
  await fs.writeFile(campaignPath, JSON.stringify(campaign));
  return campaignPath;
}

function encodeSolidPng(width, height, colorType = 2) {
  const png = new PNG({ width, height });
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = 117;
    png.data[offset + 1] = 107;
    png.data[offset + 2] = 230;
    png.data[offset + 3] = 255;
  }
  return PNG.sync.write(png, {
    colorType,
    inputColorType: 6,
    inputHasAlpha: true,
  });
}

function encodePatternPng(width, height) {
  const png = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      png.data[offset] = (x * 7 + y * 3) % 256;
      png.data[offset + 1] = (x * 2 + y * 5) % 256;
      png.data[offset + 2] = (x + y * 11) % 256;
      png.data[offset + 3] = 255;
    }
  }
  return PNG.sync.write(png, {
    colorType: 2,
    inputColorType: 6,
    inputHasAlpha: true,
  });
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function expectedActiveCueNames(level) {
  return EXPECTED_CUE_DEFINITIONS
    .filter(cue => cue.minLevel <= level)
    .map(cue => cue.name);
}

async function loadUneaseModel() {
  try {
    return await import('./playStoreUnease.mjs');
  } catch {
    return {};
  }
}

async function loadAuthenticUneaseAudit() {
  try {
    return await import('./auditPlayStoreUnease.mjs');
  } catch {
    return {};
  }
}

function rectanglesOverlap(first, second) {
  return first.left < second.right
    && first.right > second.left
    && first.top < second.bottom
    && first.bottom > second.top;
}

async function pixelHash(filePath) {
  return sha256((await readPng(filePath)).data);
}

async function pixelDeltaMetrics(baselinePath, composedPath) {
  const [baseline, composed] = await Promise.all([
    readPng(baselinePath),
    readPng(composedPath),
  ]);
  assert.equal(composed.width, baseline.width);
  assert.equal(composed.height, baseline.height);
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
    const maxDelta = Math.max(red, green, blue);
    if (maxDelta >= 4) changedPixels += 1;
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

function withHiddenCues(html) {
  return html.replace(
    '</head>',
    '<style>.unease-layer { display: none !important; }</style></head>'
  );
}

function atThumbnailSize(html) {
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

async function renderCompositionHtml(page, html, outputPath) {
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.querySelectorAll('img')].map(image => image.decode())
    );
    await new Promise(resolve => requestAnimationFrame(resolve));
  });
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await page.screenshot({ path: outputPath, type: 'png', fullPage: false });
}

async function prepareVisualSource(item, sourceDir) {
  const checkedPath = path.join(CHECKED_SOURCE_DIR, item.source);
  const targetPath = path.join(sourceDir, item.source);
  await fs.mkdir(sourceDir, { recursive: true });
  try {
    const bytes = await fs.readFile(checkedPath);
    await fs.writeFile(targetPath, bytes);
    return { kind: 'authentic', checkedPath, targetPath };
  } catch (error) {
    if (error?.code !== 'ENOENT' || ![6, 7].includes(item.uneaseLevel)) {
      throw error;
    }
    await fs.writeFile(targetPath, encodePatternPng(1080, 1920));
    return {
      kind: 'synthetic-pending-task4',
      checkedPath: null,
      targetPath,
    };
  }
}

async function writeScreenshotSet(
  finalDir,
  campaign,
  encoded = encodeSolidPng(1080, 1920)
) {
  await fs.mkdir(finalDir, { recursive: true });
  await Promise.all(
    campaign.map(item => fs.writeFile(path.join(finalDir, item.final), encoded))
  );
}

async function writeSourceSet(sourceDir, campaign) {
  await fs.mkdir(sourceDir, { recursive: true });
  await Promise.all([
    ...campaign.map(item => fs.writeFile(
      path.join(sourceDir, item.source),
      encodeSolidPng(1080, 1920)
    )),
    fs.writeFile(
      path.join(sourceDir, 'feature-background.png'),
      encodeSolidPng(1536, 1024)
    ),
  ]);
}

async function writeFinalSet(finalDir, campaign) {
  await writeScreenshotSet(finalDir, campaign);
  await fs.writeFile(
    path.join(finalDir, 'feature-graphic.png'),
    encodeSolidPng(1024, 500)
  );
}

async function writeNamedPngSet(directory, names, encoded) {
  await fs.mkdir(directory, { recursive: true });
  await Promise.all(names.map(name =>
    fs.writeFile(path.join(directory, name), encoded)
  ));
}

async function addUnexpectedEntry(directory, kind) {
  if (kind === 'nested directory') {
    await fs.mkdir(path.join(directory, 'nested'));
    return;
  }
  const filename = kind === 'temporary file' ? 'capture.tmp' : 'capture.jpg';
  await fs.writeFile(path.join(directory, filename), 'unexpected');
}

async function snapshotDirectory(directory) {
  const names = (await fs.readdir(directory)).sort();
  const contents = await Promise.all(names.map(async name => ({
    name,
    bytes: await fs.readFile(path.join(directory, name)),
  })));
  return contents;
}

describe('shared PNG helpers', () => {
  test('writeOpaquePng emits an 8-bit RGB PNG and creates parent directories', async () => {
    const filePath = path.join(tempDir, 'nested', 'opaque.png');
    const png = new PNG({ width: 2, height: 2 });
    png.data.set([
      255, 0, 0, 128,
      0, 255, 0, 255,
      0, 0, 255, 0,
      255, 255, 255, 255,
    ]);

    await writeOpaquePng(filePath, png);

    assert.deepEqual(await readPngMetadata(filePath), {
      width: 2,
      height: 2,
      bitDepth: 8,
      colorType: 2,
    });
    const decoded = await readPng(filePath);
    assert.deepEqual([...decoded.data.subarray(0, 4)], [128, 0, 0, 255]);
    assert.deepEqual([...decoded.data.subarray(8, 12)], [0, 0, 0, 255]);
  });

  test('readPngMetadata rejects an invalid PNG signature', async () => {
    const filePath = path.join(tempDir, 'not-a-png.png');
    await fs.writeFile(filePath, Buffer.from('not a real png'));

    await assert.rejects(
      readPngMetadata(filePath),
      /invalid PNG signature/
    );
  });
});

describe('approved campaign manifest', () => {
  test('defines the exact seven-shot order, names, filenames, copy, and unease', async () => {
    const campaign = JSON.parse(await fs.readFile(CAMPAIGN_PATH, 'utf8'));

    assert.equal(campaign.length, 7);
    assert.deepEqual(campaign.map(item => item.scenario), EXPECTED_SCENARIOS);
    assert.deepEqual(campaign.map(item => item.source), EXPECTED_SOURCES);
    assert.deepEqual(campaign.map(item => item.final), EXPECTED_FINALS);
    assert.deepEqual(campaign.map(item => item.headline), EXPECTED_HEADLINES);
    assert.deepEqual(campaign.map(item => item.support), EXPECTED_SUPPORT);
    assert.deepEqual(campaign.map(item => item.uneaseLevel), [1, 2, 3, 4, 5, 6, 7]);
    assert.equal(new Set(campaign.map(item => item.scenario)).size, 7);
    assert.equal(new Set(campaign.map(item => item.source)).size, 7);
    assert.equal(new Set(campaign.map(item => item.final)).size, 7);
    assert.ok(campaign.every(item => Number.isInteger(item.uneaseLevel)));
    assert.ok(campaign.every(item => item.scenario !== 'daily'));
  });

  test('provides visible-only unique alt text within the 140-character limit', async () => {
    const campaign = JSON.parse(await fs.readFile(CAMPAIGN_PATH, 'utf8'));
    const altTexts = campaign.map(item => item.altText);

    assert.deepEqual(altTexts, EXPECTED_ALT_TEXTS);
    assert.equal(new Set(altTexts).size, 7);
    assert.ok(altTexts.every(text => text.length >= 60));
    assert.ok(altTexts.every(text => text.length <= 140));
    assert.ok(altTexts.every(text => text.trim().split(/\s+/).length >= 8));
    assert.ok(altTexts.every(text => /[.!?]$/.test(text)));
    assert.ok(campaign.every(item => item.altText !== item.headline));
    assert.doesNotMatch(altTexts.join('\n'), /\b(daily|entity|robed|cult)\b/i);
  });
});

describe('Google Play listing metadata', () => {
  test('keeps listing fields and accessible image descriptions within store limits', async () => {
    const [listing, campaign] = await Promise.all([
      fs.readFile(STORE_LISTING_PATH, 'utf8'),
      fs.readFile(CAMPAIGN_PATH, 'utf8').then(JSON.parse),
    ]);
    const title = listing.match(/^- \*\*App name:\*\* (.+)$/m)?.[1];
    const shortDescription = listing.match(
      /Android short description[^\n]*\n\s*`([^`]+)`/
    )?.[1];
    const fullDescription = listing.match(
      /## Full description\s+```text\n([\s\S]*?)\n```/
    )?.[1];
    const screenshotSection = listing.match(
      /### Android screenshot campaign \(final upload order\)([\s\S]*?)\nFinal feature graphic:/
    )?.[1] ?? '';
    const tableRows = screenshotSection
      .split('\n')
      .filter(line => /^\| [1-7] \|/.test(line))
      .map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
    const tablePaths = tableRows.map(cells => cells[1]);
    const tableHeadlines = tableRows.map(cells => cells[2]);
    const tableSupport = tableRows.map(cells => cells[3]);
    const tableAltTexts = tableRows.map(cells => cells[4]);
    const tableVisibleStates = tableRows.map(cells => cells[5]);
    const featureAltText = listing.match(
      /^Feature graphic alt text: (.+)$/m
    )?.[1];

    assert.equal(title, 'WordShift');
    assert.ok(title.length <= 30);
    assert.equal(
      shortDescription,
      "Shift letters in a cozy word puzzle. Meet animal friends. They've been waiting."
    );
    assert.ok(shortDescription.length <= 80);
    assert.match(fullDescription, /\bletter game\b/i);
    assert.ok(fullDescription.length <= 4_000);
    assert.match(
      fullDescription,
      /The main mystery unfolds through play, not purchases\./
    );
    assert.doesNotMatch(
      fullDescription,
      /Purchases never accelerate the story/
    );
    assert.match(fullDescription, /Take on a shared Daily Challenge/);
    assert.equal(tableRows.length, 7);
    assert.deepEqual(
      tablePaths,
      EXPECTED_FINALS.map(name => `\`docs/play-store/final/${name}\``)
    );
    assert.deepEqual(tableHeadlines, EXPECTED_HEADLINES);
    assert.deepEqual(tableSupport, EXPECTED_SUPPORT);
    assert.deepEqual(tableAltTexts, campaign.map(item => item.altText));
    assert.ok(tableAltTexts.every(text => text.length <= 140));
    assert.ok(tableVisibleStates.every(text => text.length > 0));
    assert.doesNotMatch(screenshotSection, /\bDaily Challenge\b|06_daily|new_puzzle_every_day/i);
    assert.doesNotMatch(tableAltTexts[6], /\b(no|without|absent)\b/i);
    assert.ok(featureAltText.length <= 140);
    for (const detail of [
      'Ember',
      'exact WordShift logo',
      'candy tiles',
      'amber',
      'sunny-to-dusk forest',
      'distant eyes',
    ]) {
      assert.match(featureAltText, new RegExp(detail, 'i'));
    }
    assert.doesNotMatch(
      [
        shortDescription,
        fullDescription,
        ...campaign.map(item => item.support),
        ...tableAltTexts,
        featureAltText,
      ].join('\n'),
      /[—–]/
    );
  });

  test('marks seven-shot regeneration pending without changing feature assets', async () => {
    const [listing, checklist] = await Promise.all([
      fs.readFile(STORE_LISTING_PATH, 'utf8'),
      fs.readFile(LAUNCH_CHECKLIST_PATH, 'utf8'),
    ]);

    assert.match(
      listing,
      /- \[ \] Android phone screenshots ×7, seven-shot regeneration pending/
    );
    assert.match(
      checklist,
      /- \[ \] \*\*Generate Play Store creative\*\* — seven-shot screenshot regeneration is pending\./
    );
    assert.match(checklist, /current checked-in eight screenshots/);
    assert.doesNotMatch(listing, /- \[x\] Android phone screenshots ×7/);
    assert.doesNotMatch(checklist, /- \[x\] \*\*Generate Play Store creative\*\*/);
    assert.match(listing, /Feature graphic 1024×500 \(Play\), generated/);
    assert.match(checklist, /the 1024x500 feature graphic/);
  });

  test('keeps the public landing page free of em and en dashes', async () => {
    const landingPage = await fs.readFile(LANDING_PAGE_PATH, 'utf8');
    assert.doesNotMatch(landingPage, /[—–]/);
  });
});

describe('Storybook Editorial composition', () => {
  test('uses the approved palettes and keeps the authentic 9:16 capture dominant', () => {
    assert.deepEqual(PLAY_STORE_PALETTES, {
      bright: ['#756BE6', '#FFF2D2', '#F4B942', '#4A2E37'],
      dusk: ['#51466F', '#F5E7CC', '#C99047', '#2A2438'],
      mystery: ['#292844', '#EBDCC7', '#A85B64', '#171725'],
    });
    assert.deepEqual(
      {
        viewportWidth: COMPOSITION_LAYOUT.viewportWidth,
        viewportHeight: COMPOSITION_LAYOUT.viewportHeight,
        copyBandHeight: COMPOSITION_LAYOUT.copyBandHeight,
        captureWidth: COMPOSITION_LAYOUT.captureWidth,
        captureHeight: COMPOSITION_LAYOUT.captureHeight,
      },
      {
        viewportWidth: 432,
        viewportHeight: 768,
        copyBandHeight: 88,
        captureWidth: 369,
        captureHeight: 656,
      }
    );
    assert.equal(
      COMPOSITION_LAYOUT.captureWidth / COMPOSITION_LAYOUT.captureHeight,
      9 / 16
    );
    assert.ok(
      COMPOSITION_LAYOUT.captureWidth / COMPOSITION_LAYOUT.viewportWidth > 0.8
    );
    assert.ok(
      COMPOSITION_LAYOUT.captureHeight / COMPOSITION_LAYOUT.viewportHeight > 0.8
    );
  });

  test('embeds Figtree for headlines and Shantell Regular for support copy', async () => {
    const [figtree, shantell] = await Promise.all([
      fs.readFile(FIGTREE_BOLD_PATH),
      fs.readFile(SHANTELL_REGULAR_PATH),
    ]);
    assert.ok(figtree.length > 1_000, 'Figtree Bold font file is empty');
    assert.ok(shantell.length > 1_000, 'Shantell Regular font file is empty');

    const item = makeCampaign()[0];
    item.headline = 'SHIFT <ONE> LETTER';
    item.support = 'Move it down. Keep both words real.';
    item.altText = 'Authentic WordShift puzzle board.';

    const html = buildCompositionHtml({
      item,
      sourceBase64: 'SOURCE_BASE64',
      headlineFontBase64: 'FIGTREE_BOLD_BASE64',
      supportFontBase64: 'SHANTELL_REGULAR_BASE64',
    });

    assert.match(html, /data:image\/png;base64,SOURCE_BASE64/);
    assert.match(html, /data:font\/ttf;base64,FIGTREE_BOLD_BASE64/);
    assert.match(html, /data:font\/ttf;base64,SHANTELL_REGULAR_BASE64/);
    assert.match(
      html,
      /\.headline\s*\{[\s\S]*?font-family: "Figtree", sans-serif;/
    );
    assert.match(
      html,
      /\.support\s*\{[\s\S]*?font-family: "Shantell", cursive;/
    );
    const shantellFace = html.match(
      /@font-face\s*\{\s*font-family: "Shantell";([\s\S]*?)\n\s*\}/
    )?.[1] ?? '';
    assert.match(shantellFace, /font-weight: 400/);
    assert.doesNotMatch(shantellFace, /font-weight: 700/);
    assert.match(html, /SHIFT &lt;ONE&gt; LETTER/);
    assert.match(html, /Move it down\. Keep both words real\./);
    assert.match(html, /alt="Authentic WordShift puzzle board\."/);
    assert.doesNotMatch(html, /SHIFT <ONE> LETTER/);
  });

  test('uses one declarative registry for cue rendering and validation', async () => {
    const model = await loadUneaseModel();
    assert.ok(Array.isArray(model.UNEASE_CUE_REGISTRY));
    assert.equal(typeof model.getActiveUneaseCues, 'function');
    assert.deepEqual(
      model.UNEASE_CUE_REGISTRY.map(cue => ({
        name: cue.name,
        minLevel: cue.minLevel,
        contentKind: cue.contentKind,
      })),
      EXPECTED_CUE_DEFINITIONS
    );
    assert.ok(model.UNEASE_CUE_REGISTRY.every(cue =>
      Number.isFinite(cue.bounds?.left)
      && Number.isFinite(cue.bounds?.top)
      && Number.isFinite(cue.bounds?.width)
      && Number.isFinite(cue.bounds?.height)
      && Array.isArray(cue.paintRects)
      && cue.paintRects.length > 0
    ));
    for (let level = 1; level <= 7; level += 1) {
      assert.deepEqual(
        model.getActiveUneaseCues(level).map(cue => cue.name),
        expectedActiveCueNames(level)
      );
    }
    assert.deepEqual(model.TASK4_REAUDIT_LEVELS, [6, 7]);
    assert.deepEqual(
      model.UNEASE_VISIBILITY_PROFILES,
      EXPECTED_VISIBILITY_PROFILES
    );
    assert.equal(typeof model.getUneaseVisibilityProfile, 'function');
    assert.equal(typeof model.validateUneaseVisibilityMetrics, 'function');
    assert.equal(model.getUneaseVisibilityProfile(1).name, 'low');
    assert.equal(model.getUneaseVisibilityProfile(6).name, 'mid');
    assert.equal(model.getUneaseVisibilityProfile(7).name, 'high');
    for (const profile of EXPECTED_VISIBILITY_PROFILES) {
      assert.throws(
        () => model.validateUneaseVisibilityMetrics({
          scenario: `${profile.name}-floor-regression`,
          level: profile.level,
          final: {
            changedFraction: profile.final.minChangedFraction,
            visibilityScore: profile.final.minVisibilityScore,
          },
          thumbnail: {
            changedFraction: profile.thumbnail.minChangedFraction,
            visibilityScore: profile.thumbnail.minVisibilityScore * 0.25,
          },
        }),
        /thumbnail visibility score .* below/
      );
    }

    const [composerSource, testSource] = await Promise.all([
      fs.readFile(COMPOSER_PATH, 'utf8'),
      fs.readFile(fileURLToPath(import.meta.url), 'utf8'),
    ]);
    const retiredComposerMatrix = new RegExp(
      ['UNEASE', 'CUES', 'BY', 'LEVEL'].join('_')
    );
    const retiredTestMatrix = new RegExp(
      ['EXPECTED', 'CUES', 'BY', 'LEVEL'].join('_')
    );
    assert.doesNotMatch(composerSource, retiredComposerMatrix);
    assert.doesNotMatch(testSource, retiredTestMatrix);
  });

  test('renders the exact cumulative unease cue matrix without future cues', () => {
    for (let level = 1; level <= 7; level += 1) {
      const item = {
        ...makeCampaign()[level - 1],
        uneaseLevel: level,
      };
      const html = buildCompositionHtml({
        item,
        sourceBase64: 'SOURCE_BASE64',
        headlineFontBase64: 'FIGTREE_BOLD_BASE64',
        supportFontBase64: 'SHANTELL_REGULAR_BASE64',
      });
      const cues = [...html.matchAll(/data-unease-cue="([^"]+)"/g)]
        .map(match => match[1]);

      assert.deepEqual(cues, expectedActiveCueNames(level));
      assert.doesNotMatch(html, /Math\.random/);
      assert.doesNotMatch(
        html,
        /\b(fabricated button|entity|robe|gore)\b/i
      );
    }
  });

  test('rejects unease values outside integer levels one through seven', () => {
    for (const uneaseLevel of [0, 8, 2.5, Number.NaN]) {
      assert.throws(
        () => buildCompositionHtml({
          item: { ...makeCampaign()[0], uneaseLevel },
          sourceBase64: 'SOURCE_BASE64',
          headlineFontBase64: 'FIGTREE_BOLD_BASE64',
          supportFontBase64: 'SHANTELL_REGULAR_BASE64',
        }),
        /unease level must be an integer from 1 to 7/
      );
    }
  });
});

describe('atomic staged publication', () => {
  test('leaves current finals untouched and cleans staging when work fails', async () => {
    const finalDir = path.join(tempDir, 'final');
    const currentPath = path.join(finalDir, 'current.png');
    await fs.mkdir(finalDir, { recursive: true });
    await fs.writeFile(currentPath, 'current finals');

    await assert.rejects(
      withStagedPublication({
        finalDir,
        populateAndValidate: async stagingDir => {
          await fs.writeFile(
            path.join(stagingDir, 'current.png'),
            'partially rendered finals'
          );
          throw new Error('simulated render failure');
        },
      }),
      /simulated render failure/
    );

    assert.equal(await fs.readFile(currentPath, 'utf8'), 'current finals');
    assert.deepEqual(await fs.readdir(tempDir), ['final']);
  });

  test('publishes a fresh staged directory with only explicitly preserved assets', async () => {
    const finalDir = path.join(tempDir, 'final');
    await fs.mkdir(finalDir, { recursive: true });
    const originalMode = (await fs.stat(finalDir)).mode & 0o777;
    await fs.writeFile(path.join(finalDir, 'feature-graphic.png'), 'feature');
    await fs.writeFile(path.join(finalDir, 'old.png'), 'old screenshot');

    await withStagedPublication({
      finalDir,
      preserveNames: ['feature-graphic.png'],
      populateAndValidate: async stagingDir => {
        assert.equal(
          await fs.readFile(path.join(stagingDir, 'feature-graphic.png'), 'utf8'),
          'feature'
        );
        await assert.rejects(fs.access(path.join(stagingDir, 'old.png')));
        await fs.writeFile(path.join(stagingDir, 'new.png'), 'new screenshot');
      },
    });

    assert.equal(
      await fs.readFile(path.join(finalDir, 'feature-graphic.png'), 'utf8'),
      'feature'
    );
    assert.equal(
      await fs.readFile(path.join(finalDir, 'new.png'), 'utf8'),
      'new screenshot'
    );
    await assert.rejects(fs.access(path.join(finalDir, 'old.png')));
    assert.equal((await fs.stat(finalDir)).mode & 0o777, originalMode);
    assert.deepEqual(await fs.readdir(tempDir), ['final']);
  });

  test('composition runner preserves only the current feature graphic', async () => {
    const composer = await fs.readFile(COMPOSER_PATH, 'utf8');

    assert.match(
      composer,
      /await withStagedPublication\(\{\s*finalDir: FINAL_DIR,\s*preserveNames:\s*\['feature-graphic\.png'\]/
    );
  });
});

describe('old-eight to new-seven atomic transition', () => {
  test('source transition removes stale captures and preserves only the background', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const sourceDir = path.join(tempDir, 'source');
    const sourcePng = encodeSolidPng(1080, 1920);
    const featureBackground = encodeSolidPng(1536, 1024);
    await writeNamedPngSet(sourceDir, OLD_EIGHT_SOURCES, sourcePng);
    await fs.writeFile(
      path.join(sourceDir, 'feature-background.png'),
      featureBackground
    );

    await withStagedPublication({
      finalDir: sourceDir,
      preserveNames: ['feature-background.png'],
      populateAndValidate: async stagingDir => {
        await writeNamedPngSet(stagingDir, EXPECTED_SOURCES, sourcePng);
        await validateSourceAssets({ campaignPath, sourceDir: stagingDir });
      },
    });

    assert.deepEqual(
      (await fs.readdir(sourceDir)).sort(),
      [...EXPECTED_SOURCES, 'feature-background.png'].sort()
    );
    assert.deepEqual(
      await fs.readFile(path.join(sourceDir, 'feature-background.png')),
      featureBackground
    );
    for (const staleName of [
      '06_daily.png',
      '07_flawless_victory.png',
      '08_home_dusk.png',
    ]) {
      await assert.rejects(fs.access(path.join(sourceDir, staleName)));
    }
  });

  test('source transition rollback preserves the complete old eight-shot directory', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const sourceDir = path.join(tempDir, 'source');
    const sourcePng = encodeSolidPng(1080, 1920);
    await writeNamedPngSet(sourceDir, OLD_EIGHT_SOURCES, sourcePng);
    await fs.writeFile(
      path.join(sourceDir, 'feature-background.png'),
      encodeSolidPng(1536, 1024)
    );
    const before = await snapshotDirectory(sourceDir);

    await assert.rejects(
      withStagedPublication({
        finalDir: sourceDir,
        preserveNames: ['feature-background.png'],
        populateAndValidate: async stagingDir => {
          await writeNamedPngSet(stagingDir, EXPECTED_SOURCES, sourcePng);
          await validateSourceAssets({ campaignPath, sourceDir: stagingDir });
          throw new Error('injected source publication failure');
        },
      }),
      /injected source publication failure/
    );

    assert.deepEqual(await snapshotDirectory(sourceDir), before);
  });

  test('final transition removes stale compositions and preserves only the feature graphic', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const finalDir = path.join(tempDir, 'final');
    const screenshotPng = encodeSolidPng(1080, 1920);
    const featureGraphic = encodeSolidPng(1024, 500);
    await writeNamedPngSet(finalDir, OLD_EIGHT_FINALS, screenshotPng);
    await fs.writeFile(
      path.join(finalDir, 'feature-graphic.png'),
      featureGraphic
    );

    await withStagedPublication({
      finalDir,
      preserveNames: ['feature-graphic.png'],
      populateAndValidate: async stagingDir => {
        await writeNamedPngSet(stagingDir, EXPECTED_FINALS, screenshotPng);
        await validateFinalAssets({ campaignPath, finalDir: stagingDir });
      },
    });

    assert.deepEqual(
      (await fs.readdir(finalDir)).sort(),
      [...EXPECTED_FINALS, 'feature-graphic.png'].sort()
    );
    assert.deepEqual(
      await fs.readFile(path.join(finalDir, 'feature-graphic.png')),
      featureGraphic
    );
    for (const staleName of [
      '06_new_puzzle_every_day.png',
      '07_flawless_offering.png',
      '08_theyve_been_waiting.png',
    ]) {
      await assert.rejects(fs.access(path.join(finalDir, staleName)));
    }
  });

  test('final transition rollback preserves the complete old eight-shot directory', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const finalDir = path.join(tempDir, 'final');
    const screenshotPng = encodeSolidPng(1080, 1920);
    await writeNamedPngSet(finalDir, OLD_EIGHT_FINALS, screenshotPng);
    await fs.writeFile(
      path.join(finalDir, 'feature-graphic.png'),
      encodeSolidPng(1024, 500)
    );
    const before = await snapshotDirectory(finalDir);

    await assert.rejects(
      withStagedPublication({
        finalDir,
        preserveNames: ['feature-graphic.png'],
        populateAndValidate: async stagingDir => {
          await writeNamedPngSet(stagingDir, EXPECTED_FINALS, screenshotPng);
          await validateFinalAssets({ campaignPath, finalDir: stagingDir });
          throw new Error('injected final publication failure');
        },
      }),
      /injected final publication failure/
    );

    assert.deepEqual(await snapshotDirectory(finalDir), before);
  });
});

describe('Playwright composition integration', { concurrency: false }, () => {
  let browser;
  let context;
  let page;
  let thumbnailContext;
  let thumbnailPage;
  let fonts;

  before(async () => {
    const [headline, support] = await Promise.all([
      fs.readFile(FIGTREE_BOLD_PATH),
      fs.readFile(SHANTELL_REGULAR_PATH),
    ]);
    fonts = {
      headline: headline.toString('base64'),
      support: support.toString('base64'),
    };
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: {
        width: COMPOSITION_LAYOUT.viewportWidth,
        height: COMPOSITION_LAYOUT.viewportHeight,
      },
      deviceScaleFactor: COMPOSITION_LAYOUT.deviceScaleFactor,
      serviceWorkers: 'block',
    });
    page = await context.newPage();
    thumbnailContext = await browser.newContext({
      viewport: { width: 216, height: 384 },
      deviceScaleFactor: 1,
      serviceWorkers: 'block',
    });
    thumbnailPage = await thumbnailContext.newPage();
  });

  after(async () => {
    await thumbnailContext?.close();
    await context?.close();
    await browser?.close();
  });

  async function writeIntegrationSource(
    filename,
    encoded = encodeSolidPng(1080, 1920)
  ) {
    const sourceDir = path.join(tempDir, 'source');
    await fs.mkdir(sourceDir, { recursive: true });
    await fs.writeFile(path.join(sourceDir, filename), encoded);
    return sourceDir;
  }

  test('renders with loaded font roles, preserves source bytes, and emits RGB', async () => {
    const item = {
      ...makeCampaign()[0],
      source: 'valid-source.png',
      final: 'valid-final.png',
      headline: 'SHIFT ONE LETTER',
      support: 'Move it down. Keep both words real.',
    };
    const sourceDir = await writeIntegrationSource(item.source);
    const sourcePath = path.join(sourceDir, item.source);
    const sourceHashBefore = sha256(await fs.readFile(sourcePath));
    const outputDir = path.join(tempDir, 'staged');
    const browserPngDir = path.join(tempDir, 'browser');

    const result = await composeCampaignItem({
      page,
      item,
      fonts,
      sourceDir,
      outputDir,
      browserPngDir,
    });

    assert.deepEqual(result.metadata, {
      width: 1080,
      height: 1920,
      bitDepth: 8,
      colorType: 2,
    });
    assert.deepEqual(result.audit.fonts, {
      status: 'loaded',
      figtreeLoaded: true,
      shantellLoaded: true,
      headlineFamily: 'Figtree',
      supportFamily: 'Shantell',
    });
    assert.equal(
      sha256(await fs.readFile(sourcePath)),
      sourceHashBefore,
      'raw source bytes changed during composition'
    );
    assert.deepEqual(
      await readPngMetadata(path.join(outputDir, item.final)),
      result.metadata
    );
  });

  test('keeps every cue and copy box clipped inside composition geometry', async () => {
    const item = {
      ...makeCampaign()[6],
      source: 'geometry-source.png',
      final: 'geometry-final.png',
    };
    const sourceDir = await writeIntegrationSource(
      item.source,
      encodePatternPng(1080, 1920)
    );
    const result = await composeCampaignItem({
      page,
      item,
      fonts,
      sourceDir,
      outputDir: path.join(tempDir, 'staged'),
      browserPngDir: path.join(tempDir, 'browser'),
    });

    assert.deepEqual(
      result.audit.cues.map(cue => cue.name),
      expectedActiveCueNames(7)
    );
    assert.equal(result.audit.allOverlaysIgnorePointerEvents, true);
    assert.ok(result.audit.cues.every(cue => cue.pointerEvents === 'none'));
    assert.ok(result.audit.cues.every(cue =>
      cue.left >= result.audit.root.left
      && cue.top >= result.audit.root.top
      && cue.right <= result.audit.root.right
      && cue.bottom <= result.audit.root.bottom
    ));
    assert.equal(result.audit.captureWindow.overflow, 'hidden');
    assert.equal(result.audit.portraitEcho.overflow, 'hidden');
    assert.equal(result.audit.portraitEcho.usesAuthenticSource, true);
    assert.ok(
      result.audit.headline.scrollWidth <= Math.ceil(result.audit.headline.width)
    );
    assert.ok(
      result.audit.support.scrollWidth <= Math.ceil(result.audit.support.width)
    );
    for (const cue of result.audit.cues) {
      assert.equal(
        rectanglesOverlap(cue, result.audit.headline),
        false,
        `${cue.name} overlaps the measured headline`
      );
      assert.equal(
        rectanglesOverlap(cue, result.audit.support),
        false,
        `${cue.name} overlaps the measured support line`
      );
    }
  });

  test('uses shaped eyes in scene negative space and inside the frame rail', async () => {
    const sourceDir = path.join(tempDir, 'source');
    const levelThree = {
      ...makeCampaign()[2],
      final: 'level-three-eyes.png',
    };
    const levelSeven = {
      ...makeCampaign()[6],
      source: 'level-seven-fallback.png',
      final: 'level-seven-eyes.png',
    };
    const levelThreeSource = await prepareVisualSource(levelThree, sourceDir);
    await fs.writeFile(
      path.join(sourceDir, levelSeven.source),
      encodePatternPng(1080, 1920)
    );
    assert.equal(levelThreeSource.kind, 'authentic');

    const levelThreeResult = await composeCampaignItem({
      page,
      item: levelThree,
      fonts,
      sourceDir,
      outputDir: path.join(tempDir, 'level-three'),
      browserPngDir: path.join(tempDir, 'browser-three'),
    });
    const distantEyes = levelThreeResult.audit.cues.find(
      cue => cue.name === 'distant-eyes'
    );
    assert.ok(distantEyes);
    assert.ok(distantEyes.left >= levelThreeResult.audit.capture.left + 8);
    assert.ok(distantEyes.right <= levelThreeResult.audit.capture.right - 8);
    assert.ok(distantEyes.top >= levelThreeResult.audit.capture.top + 24);
    assert.ok(distantEyes.bottom <= levelThreeResult.audit.capture.bottom - 24);

    const levelSevenResult = await composeCampaignItem({
      page,
      item: levelSeven,
      fonts,
      sourceDir,
      outputDir: path.join(tempDir, 'level-seven'),
      browserPngDir: path.join(tempDir, 'browser-seven'),
    });
    const watchingEyes = levelSevenResult.audit.cues.find(
      cue => cue.name === 'watching-eyes'
    );
    assert.ok(watchingEyes);
    assert.ok(watchingEyes.left >= levelSevenResult.audit.frame.left);
    assert.ok(watchingEyes.right <= levelSevenResult.audit.frame.right);
    assert.ok(watchingEyes.top >= levelSevenResult.audit.frame.top);
    assert.ok(watchingEyes.bottom <= levelSevenResult.audit.capture.top);

    const eyeAudit = await page.evaluate(() =>
      [...document.querySelectorAll('[data-unease-cue$="eyes"]')].map(cue => ({
        name: cue.getAttribute('data-unease-cue'),
        shapeCount: cue.querySelectorAll('[data-eye-shape]').length,
        coreCount: cue.querySelectorAll('[data-eye-core]').length,
        clipPaths: [...cue.querySelectorAll('[data-eye-shape]')].map(
          shape => getComputedStyle(shape).clipPath
        ),
      }))
    );
    assert.deepEqual(
      eyeAudit.map(entry => ({
        name: entry.name,
        shapeCount: entry.shapeCount,
        coreCount: entry.coreCount,
      })),
      [
        { name: 'distant-eyes', shapeCount: 2, coreCount: 2 },
        { name: 'watching-eyes', shapeCount: 2, coreCount: 2 },
      ]
    );
    assert.ok(eyeAudit.every(entry =>
      entry.clipPaths.every(clipPath => clipPath !== 'none')
    ));

    const levelSevenHtml = buildCompositionHtml({
      item: levelSeven,
      sourceBase64: (
        await fs.readFile(path.join(sourceDir, levelSeven.source))
      ).toString('base64'),
      headlineFontBase64: fonts.headline,
      supportFontBase64: fonts.support,
    });
    await renderCompositionHtml(
      thumbnailPage,
      atThumbnailSize(levelSevenHtml),
      path.join(tempDir, 'eye-shapes-thumbnail.png')
    );
    const thumbnailShapes = await thumbnailPage.evaluate(() =>
      [...document.querySelectorAll('[data-eye-shape]')].map(shape => {
        const bounds = shape.getBoundingClientRect();
        return { width: bounds.width, height: bounds.height };
      })
    );
    assert.ok(thumbnailShapes.length >= 4);
    assert.ok(thumbnailShapes.every(shape =>
      shape.width >= 5.5 && shape.height >= 2.25
    ));
  });

  test('keeps the mode thread in the empty menu margin', async () => {
    const model = await loadUneaseModel();
    assert.ok(Array.isArray(model.PROTECTED_COMPOSITION_REGIONS?.modeMenu));
    const item = {
      ...makeCampaign()[4],
      final: 'mode-thread-margin.png',
    };
    const sourceDir = path.join(tempDir, 'source');
    const source = await prepareVisualSource(item, sourceDir);
    assert.equal(source.kind, 'authentic');
    const result = await composeCampaignItem({
      page,
      item,
      fonts,
      sourceDir,
      outputDir: path.join(tempDir, 'mode-thread'),
      browserPngDir: path.join(tempDir, 'browser-mode-thread'),
    });
    const thread = result.audit.cues.find(cue => cue.name === 'mode-thread');
    assert.ok(thread);
    assert.ok(thread.height > thread.width * 40);
    for (const protectedRegion of model.PROTECTED_COMPOSITION_REGIONS.modeMenu) {
      assert.equal(
        rectanglesOverlap(thread, protectedRegion),
        false,
        `mode thread overlaps protected ${protectedRegion.name}`
      );
    }
    for (const cueDefinition of model.getActiveUneaseCues(5)) {
      for (const paintRect of cueDefinition.paintRects) {
        for (
          const protectedRegion
          of model.PROTECTED_COMPOSITION_REGIONS.modeMenu
        ) {
          assert.equal(
            rectanglesOverlap(paintRect, protectedRegion),
            false,
            `${cueDefinition.name} overlaps protected ${protectedRegion.name}`
          );
        }
      }
    }
  });

  test('bounds monotonic cue visibility at final and thumbnail sizes', async () => {
    const model = await loadUneaseModel();
    const finalMetrics = [];
    const thumbnailMetrics = [];
    const sourceKinds = [];

    for (const level of [1, 4, 7]) {
      const item = makeCampaign()[level - 1];
      const sourceDir = path.join(tempDir, `visual-source-${level}`);
      const source = await prepareVisualSource(item, sourceDir);
      sourceKinds.push(source.kind);
      const sourceBytes = await fs.readFile(source.targetPath);
      const sourceHashBefore = sha256(sourceBytes);
      const html = buildCompositionHtml({
        item,
        sourceBase64: sourceBytes.toString('base64'),
        headlineFontBase64: fonts.headline,
        supportFontBase64: fonts.support,
      });
      const finalBaseline = path.join(tempDir, `final-${level}-baseline.png`);
      const finalComposed = path.join(tempDir, `final-${level}-composed.png`);
      const finalRepeat = path.join(tempDir, `final-${level}-repeat.png`);
      const thumbnailBaseline = path.join(
        tempDir,
        `thumbnail-${level}-baseline.png`
      );
      const thumbnailComposed = path.join(
        tempDir,
        `thumbnail-${level}-composed.png`
      );

      await renderCompositionHtml(page, withHiddenCues(html), finalBaseline);
      await renderCompositionHtml(page, html, finalComposed);
      await renderCompositionHtml(page, html, finalRepeat);
      await renderCompositionHtml(
        thumbnailPage,
        atThumbnailSize(withHiddenCues(html)),
        thumbnailBaseline
      );
      await renderCompositionHtml(
        thumbnailPage,
        atThumbnailSize(html),
        thumbnailComposed
      );

      assert.equal(await pixelHash(finalRepeat), await pixelHash(finalComposed));
      assert.deepEqual(
        {
          width: (await readPng(finalComposed)).width,
          height: (await readPng(finalComposed)).height,
        },
        { width: 1080, height: 1920 }
      );
      assert.deepEqual(
        {
          width: (await readPng(thumbnailComposed)).width,
          height: (await readPng(thumbnailComposed)).height,
        },
        { width: 216, height: 384 }
      );
      assert.equal(
        sha256(await fs.readFile(source.targetPath)),
        sourceHashBefore,
        `level ${level} source changed during visual testing`
      );

      const finalDelta = await pixelDeltaMetrics(
        finalBaseline,
        finalComposed
      );
      const thumbnailDelta = await pixelDeltaMetrics(
        thumbnailBaseline,
        thumbnailComposed
      );
      assert.doesNotThrow(() => model.validateUneaseVisibilityMetrics({
        scenario: item.scenario,
        level,
        final: finalDelta,
        thumbnail: thumbnailDelta,
      }));
      finalMetrics.push(finalDelta);
      thumbnailMetrics.push(thumbnailDelta);
    }

    assert.deepEqual(
      sourceKinds,
      ['authentic', 'authentic', 'synthetic-pending-task4']
    );
    for (const metrics of [finalMetrics, thumbnailMetrics]) {
      assert.ok(metrics[0].visibilityScore < metrics[1].visibilityScore);
      assert.ok(metrics[1].visibilityScore < metrics[2].visibilityScore);
    }
  });

  test('rejects an overlong headline before writing an output', async () => {
    const item = {
      ...makeCampaign()[0],
      source: 'long-headline-source.png',
      final: 'long-headline-final.png',
      headline: 'THIS INTENTIONALLY OVERLONG HEADLINE CANNOT FIT THE APPROVED BAND',
    };
    const sourceDir = await writeIntegrationSource(item.source);
    const outputDir = path.join(tempDir, 'staged');

    await assert.rejects(
      composeCampaignItem({
        page,
        item,
        fonts,
        sourceDir,
        outputDir,
        browserPngDir: path.join(tempDir, 'browser'),
      }),
      /campaign copy is clipped/
    );
    await assert.rejects(fs.access(path.join(outputDir, item.final)));
  });
});

describe('mandatory authentic-source unease audit', { concurrency: false }, () => {
  test('full validation renders required authentic fixture sources', async () => {
    const auditModule = await loadAuthenticUneaseAudit();
    assert.equal(
      typeof auditModule.auditAuthenticUneaseSources,
      'function',
      'authentic unease audit is unavailable'
    );
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const sourceDir = path.join(tempDir, 'source');
    const finalDir = path.join(tempDir, 'final');
    await Promise.all([
      writeSourceSet(sourceDir, campaign),
      writeFinalSet(finalDir, campaign),
    ]);
    const sourceHashes = new Map(
      await Promise.all(campaign
        .filter(item => [6, 7].includes(item.uneaseLevel))
        .map(async item => [
          item.source,
          sha256(await fs.readFile(path.join(sourceDir, item.source))),
        ]))
    );

    const result = await validatePlayStoreAssets({
      campaignPath,
      sourceDir,
      finalDir,
    });

    assert.deepEqual(
      result.uneaseAudit.map(entry => ({
        level: entry.level,
        scenario: entry.scenario,
        source: entry.source,
        collisionCount: entry.collisionCount,
        profile: entry.profile,
      })),
      [
        {
          level: 6,
          scenario: 'flawless-victory',
          source: '06_flawless_victory.png',
          collisionCount: 0,
          profile: 'mid',
        },
        {
          level: 7,
          scenario: 'home-dusk',
          source: '07_home_dusk.png',
          collisionCount: 0,
          profile: 'high',
        },
      ]
    );
    for (const entry of result.uneaseAudit) {
      assert.equal(entry.geometryValid, true);
      assert.ok(entry.final.changedPixels > 0);
      assert.ok(entry.thumbnail.changedPixels > 0);
      assert.equal(
        sha256(await fs.readFile(path.join(sourceDir, entry.source))),
        sourceHashes.get(entry.source),
        `${entry.source} changed during authentic audit`
      );
    }
  });

  test('full validation fails at the audit when a required source is missing', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const sourceDir = path.join(tempDir, 'source');
    const finalDir = path.join(tempDir, 'final');
    await Promise.all([
      writeSourceSet(sourceDir, campaign),
      writeFinalSet(finalDir, campaign),
    ]);
    await fs.rm(path.join(sourceDir, '06_flawless_victory.png'));

    await assert.rejects(
      validatePlayStoreAssets({ campaignPath, sourceDir, finalDir }),
      /authentic unease audit requires campaign source "06_flawless_victory\.png" for level 6/
    );
  });
});

describe('final Play Store asset validation', () => {
  test('screenshots-only mode accepts all seven RGB screenshots without a feature graphic', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const finalDir = path.join(tempDir, 'final');
    await writeScreenshotSet(finalDir, campaign);

    const results = await validateFinalAssets({
      campaignPath,
      finalDir,
      screenshotsOnly: true,
    });

    assert.equal(results.length, 7);
    assert.ok(results.every(result => result.metadata.colorType === 2));
  });

  test('full validation requires and accepts an RGB feature graphic', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const finalDir = path.join(tempDir, 'final');
    await writeScreenshotSet(finalDir, campaign);

    await assert.rejects(
      validateFinalAssets({ campaignPath, finalDir }),
      /missing required asset "feature-graphic\.png"/
    );

    await fs.writeFile(
      path.join(finalDir, 'feature-graphic.png'),
      encodeSolidPng(1024, 500)
    );
    const results = await validateFinalAssets({ campaignPath, finalDir });
    assert.equal(results.length, 8);
  });

  test('rejects a screenshot with the wrong dimensions', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const finalDir = path.join(tempDir, 'final');
    await writeScreenshotSet(finalDir, campaign);
    await fs.writeFile(
      path.join(finalDir, campaign[3].final),
      encodeSolidPng(1079, 1920)
    );

    await assert.rejects(
      validateFinalAssets({ campaignPath, finalDir, screenshotsOnly: true }),
      /04_meet_unlikely_friends\.png is 1079x1920; expected 1080x1920/
    );
  });

  test('rejects alpha-channel screenshots and unexpected PNG names', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const finalDir = path.join(tempDir, 'final');
    await writeScreenshotSet(finalDir, campaign);
    await fs.writeFile(
      path.join(finalDir, campaign[0].final),
      encodeSolidPng(1080, 1920, 6)
    );

    await assert.rejects(
      validateFinalAssets({ campaignPath, finalDir, screenshotsOnly: true }),
      /01_shift_one_letter\.png has PNG color type 6; expected 2/
    );

    await fs.writeFile(
      path.join(finalDir, campaign[0].final),
      encodeSolidPng(1080, 1920)
    );
    await fs.writeFile(
      path.join(finalDir, 'unapproved.png'),
      encodeSolidPng(1080, 1920)
    );
    await assert.rejects(
      validateFinalAssets({ campaignPath, finalDir, screenshotsOnly: true }),
      /unexpected final asset "unapproved\.png"/
    );
  });

  test('validates an optional feature graphic and enforces the 8 MB limit', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const finalDir = path.join(tempDir, 'final');
    await writeScreenshotSet(finalDir, campaign);
    await fs.writeFile(
      path.join(finalDir, 'feature-graphic.png'),
      encodeSolidPng(1024, 499)
    );

    await assert.rejects(
      validateFinalAssets({ campaignPath, finalDir, screenshotsOnly: true }),
      /feature-graphic\.png is 1024x499; expected 1024x500/
    );

    await fs.rm(path.join(finalDir, 'feature-graphic.png'));
    const oversized = Buffer.concat([
      encodeSolidPng(1080, 1920),
      Buffer.alloc(8 * 1024 * 1024),
    ]);
    await fs.writeFile(path.join(finalDir, campaign[6].final), oversized);
    await assert.rejects(
      validateFinalAssets({ campaignPath, finalDir, screenshotsOnly: true }),
      /07_theyve_been_waiting\.png exceeds 8 MB/
    );
  });
});

describe('exact Play Store source-set validation', () => {
  test('accepts exactly seven decoded raw screenshots and the audited background', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const sourceDir = path.join(tempDir, 'source');
    await writeSourceSet(sourceDir, campaign);

    const results = await validateSourceAssets({ campaignPath, sourceDir });

    assert.equal(results.length, 8);
    assert.deepEqual(
      results.map(result => result.filename),
      [...EXPECTED_SOURCES, 'feature-background.png']
    );
    assert.deepEqual(results.at(-1)?.metadata, {
      width: 1536,
      height: 1024,
      bitDepth: 8,
      colorType: 2,
    });
  });

  test('rejects a stale extra source PNG', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const sourceDir = path.join(tempDir, 'source');
    await writeSourceSet(sourceDir, campaign);
    await fs.writeFile(
      path.join(sourceDir, 'stale.png'),
      encodeSolidPng(1080, 1920)
    );

    await assert.rejects(
      validateSourceAssets({ campaignPath, sourceDir }),
      /unexpected source asset "stale\.png"/
    );
  });

  test('rejects a missing campaign source', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const sourceDir = path.join(tempDir, 'source');
    await writeSourceSet(sourceDir, campaign);
    await fs.rm(path.join(sourceDir, campaign[2].source));

    await assert.rejects(
      validateSourceAssets({ campaignPath, sourceDir }),
      /missing required source "03_home_sunny\.png"/
    );
  });

  test('rejects a corrupt campaign source after full decode', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const sourceDir = path.join(tempDir, 'source');
    await writeSourceSet(sourceDir, campaign);
    const truncatedPng = encodeSolidPng(1080, 1920);
    const corruptPath = path.join(sourceDir, campaign[4].source);
    await fs.writeFile(
      corruptPath,
      truncatedPng.subarray(0, Math.floor(truncatedPng.length / 2))
    );

    assert.deepEqual(await readPngMetadata(corruptPath), {
      width: 1080,
      height: 1920,
      bitDepth: 8,
      colorType: 2,
    });
    await assert.rejects(
      validateSourceAssets({ campaignPath, sourceDir })
    );
  });

  test('rejects raw screenshots with non-campaign dimensions', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const sourceDir = path.join(tempDir, 'source');
    await writeSourceSet(sourceDir, campaign);
    await fs.writeFile(
      path.join(sourceDir, campaign[6].source),
      encodeSolidPng(1080, 1919)
    );

    await assert.rejects(
      validateSourceAssets({ campaignPath, sourceDir }),
      /07_home_dusk\.png is 1080x1919; expected 1080x1920/
    );
  });
});

describe('exact Play Store directory-entry validation', () => {
  test('accepts exact source and final entry sets', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const sourceDir = path.join(tempDir, 'source');
    const finalDir = path.join(tempDir, 'final');
    await Promise.all([
      writeSourceSet(sourceDir, campaign),
      writeFinalSet(finalDir, campaign),
    ]);

    const [sources, finals] = await Promise.all([
      validateSourceAssets({ campaignPath, sourceDir }),
      validateFinalAssets({ campaignPath, finalDir }),
    ]);

    assert.equal(sources.length, 8);
    assert.equal(finals.length, 8);
  });

  for (const kind of ['temporary file', 'JPEG file', 'nested directory']) {
    test(`rejects an unexpected ${kind} in source`, async () => {
      const campaign = makeCampaign();
      const campaignPath = await writeCampaign(campaign);
      const sourceDir = path.join(tempDir, 'source');
      await writeSourceSet(sourceDir, campaign);
      await addUnexpectedEntry(sourceDir, kind);

      await assert.rejects(
        validateSourceAssets({ campaignPath, sourceDir }),
        /unexpected source asset/
      );
    });

    test(`rejects an unexpected ${kind} in final`, async () => {
      const campaign = makeCampaign();
      const campaignPath = await writeCampaign(campaign);
      const finalDir = path.join(tempDir, 'final');
      await writeFinalSet(finalDir, campaign);
      await addUnexpectedEntry(finalDir, kind);

      await assert.rejects(
        validateFinalAssets({ campaignPath, finalDir }),
        /unexpected final asset/
      );
    });
  }

  for (const directoryKind of ['source', 'final']) {
    test(`rejects an allowed-name symlink in ${directoryKind}`, async () => {
      const campaign = makeCampaign();
      const campaignPath = await writeCampaign(campaign);
      const directory = path.join(tempDir, directoryKind);
      const names = directoryKind === 'source'
        ? campaign.map(item => item.source)
        : campaign.map(item => item.final);
      if (directoryKind === 'source') {
        await writeSourceSet(directory, campaign);
      } else {
        await writeFinalSet(directory, campaign);
      }
      await fs.rm(path.join(directory, names[0]));
      await fs.symlink(names[1], path.join(directory, names[0]));

      const validation = directoryKind === 'source'
        ? validateSourceAssets({ campaignPath, sourceDir: directory })
        : validateFinalAssets({ campaignPath, finalDir: directory });
      await assert.rejects(validation, /not a regular file/);
    });

    test(
      `preserves the canonical ${directoryKind} directory when staged entry validation fails`,
      async () => {
        const campaign = makeCampaign();
        const campaignPath = await writeCampaign(campaign);
        const directory = path.join(tempDir, directoryKind);
        if (directoryKind === 'source') {
          await writeSourceSet(directory, campaign);
        } else {
          await writeFinalSet(directory, campaign);
        }
        const before = await snapshotDirectory(directory);

        await assert.rejects(
          withStagedPublication({
            finalDir: directory,
            populateAndValidate: async stagingDir => {
              await fs.mkdir(path.join(stagingDir, 'nested'));
              if (directoryKind === 'source') {
                await validateSourceAssets({
                  campaignPath,
                  sourceDir: stagingDir,
                });
              } else {
                await validateFinalAssets({
                  campaignPath,
                  finalDir: stagingDir,
                });
              }
            },
          })
        );

        assert.deepEqual(await snapshotDirectory(directory), before);
      }
    );
  }
});
