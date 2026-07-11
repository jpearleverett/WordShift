import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
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
} from './composePlayStoreScreenshots.mjs';
import { validateFinalAssets } from './validatePlayStoreAssets.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CAMPAIGN_PATH = path.resolve(
  SCRIPT_DIR,
  '../../../docs/play-store/campaign.json'
);
const EXPECTED_SCENARIOS = [
  'puzzle-preview',
  'puzzle-chain',
  'home-sunny',
  'animal-dialogue',
  'variant-menu',
  'daily',
  'flawless-victory',
  'home-dusk',
];
const EXPECTED_SOURCES = [
  '01_puzzle_preview.png',
  '02_puzzle_chain.png',
  '03_home_sunny.png',
  '04_animal_dialogue.png',
  '05_variant_menu.png',
  '06_daily.png',
  '07_flawless_victory.png',
  '08_home_dusk.png',
];
const EXPECTED_FINALS = [
  '01_shift_one_letter.png',
  '02_every_word_stays_real.png',
  '03_build_a_home.png',
  '04_meet_unlikely_friends.png',
  '05_master_every_mode.png',
  '06_new_puzzle_every_day.png',
  '07_flawless_offering.png',
  '08_theyve_been_waiting.png',
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
    headline: `Approved headline ${index + 1}`,
    support: `Approved support copy ${index + 1}`,
    altText: `Meaningful description of authentic WordShift scenario ${index + 1}.`,
    theme: index < 4 ? 'bright' : index < 7 ? 'dusk' : 'mystery',
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
  test('defines exactly eight unique approved scenarios and filenames', async () => {
    const campaign = JSON.parse(await fs.readFile(CAMPAIGN_PATH, 'utf8'));

    assert.equal(campaign.length, 8);
    assert.deepEqual(campaign.map(item => item.scenario), EXPECTED_SCENARIOS);
    assert.deepEqual(campaign.map(item => item.source), EXPECTED_SOURCES);
    assert.deepEqual(campaign.map(item => item.final), EXPECTED_FINALS);
    assert.equal(new Set(campaign.map(item => item.scenario)).size, 8);
    assert.equal(new Set(campaign.map(item => item.source)).size, 8);
    assert.equal(new Set(campaign.map(item => item.final)).size, 8);
  });

  test('provides meaningful unique alt text for every authentic state', async () => {
    const campaign = JSON.parse(await fs.readFile(CAMPAIGN_PATH, 'utf8'));
    const altTexts = campaign.map(item => item.altText);

    assert.equal(new Set(altTexts).size, 8);
    assert.ok(altTexts.every(text => text.length >= 60));
    assert.ok(altTexts.every(text => text.trim().split(/\s+/).length >= 8));
    assert.ok(altTexts.every(text => /[.!?]$/.test(text)));
    assert.ok(campaign.every(item => item.altText !== item.headline));
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

  test('embeds authentic source, both Shantell faces, and exact campaign copy', () => {
    const item = makeCampaign()[0];
    item.headline = 'SHIFT <ONE> LETTER';
    item.support = 'Move it down. Keep both words real.';
    item.altText = 'Authentic WordShift puzzle board.';

    const html = buildCompositionHtml({
      item,
      sourceBase64: 'SOURCE_BASE64',
      regularFontBase64: 'REGULAR_BASE64',
      boldFontBase64: 'BOLD_BASE64',
    });

    assert.match(html, /data:image\/png;base64,SOURCE_BASE64/);
    assert.match(html, /data:font\/ttf;base64,REGULAR_BASE64/);
    assert.match(html, /data:font\/ttf;base64,BOLD_BASE64/);
    assert.match(html, /SHIFT &lt;ONE&gt; LETTER/);
    assert.match(html, /Move it down\. Keep both words real\./);
    assert.match(html, /alt="Authentic WordShift puzzle board\."/);
    assert.doesNotMatch(html, /SHIFT <ONE> LETTER/);
  });
});

describe('final Play Store asset validation', () => {
  test('screenshots-only mode accepts all eight RGB screenshots without a feature graphic', async () => {
    const campaign = makeCampaign();
    const campaignPath = await writeCampaign(campaign);
    const finalDir = path.join(tempDir, 'final');
    await writeScreenshotSet(finalDir, campaign);

    const results = await validateFinalAssets({
      campaignPath,
      finalDir,
      screenshotsOnly: true,
    });

    assert.equal(results.length, 8);
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
    assert.equal(results.length, 9);
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
      /unexpected PNG asset "unapproved\.png"/
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
    await fs.writeFile(path.join(finalDir, campaign[7].final), oversized);
    await assert.rejects(
      validateFinalAssets({ campaignPath, finalDir, screenshotsOnly: true }),
      /08_theyve_been_waiting\.png exceeds 8 MB/
    );
  });
});
