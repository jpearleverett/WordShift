import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCampaign } from './capturePlayStoreHelpers.mjs';
import { readPng, readPngMetadata } from './playStorePng.mjs';

const SCRIPT_DIR = import.meta.dirname
  ?? path.dirname(fileURLToPath(import.meta.url));
const MOBILE_DIR = path.resolve(SCRIPT_DIR, '../..');
const REPO_ROOT = path.resolve(MOBILE_DIR, '..');
const DEFAULT_CAMPAIGN_PATH = path.join(
  REPO_ROOT,
  'docs/play-store/campaign.json'
);
const DEFAULT_SOURCE_DIR = path.join(REPO_ROOT, 'docs/play-store/source');
const DEFAULT_FINAL_DIR = path.join(REPO_ROOT, 'docs/play-store/final');

const FEATURE_GRAPHIC_NAME = 'feature-graphic.png';
const FEATURE_BACKGROUND_NAME = 'feature-background.png';
const MAX_ASSET_BYTES = 8 * 1024 * 1024;
const SCREENSHOT_DIMENSIONS = { width: 1080, height: 1920 };
const FEATURE_GRAPHIC_DIMENSIONS = { width: 1024, height: 500 };
const FEATURE_BACKGROUND_DIMENSIONS = { width: 1536, height: 1024 };

function expectedDimensions(kind) {
  if (kind === 'feature') return FEATURE_GRAPHIC_DIMENSIONS;
  if (kind === 'feature-source') return FEATURE_BACKGROUND_DIMENSIONS;
  return SCREENSHOT_DIMENSIONS;
}

async function validatePngAsset(filePath, kind) {
  const filename = path.basename(filePath);
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) {
    throw new Error(`${filename} is not a regular file`);
  }
  if (stat.size > MAX_ASSET_BYTES) {
    throw new Error(`${filename} exceeds 8 MB`);
  }

  const metadata = await readPngMetadata(filePath);
  const expected = expectedDimensions(kind);
  if (metadata.width !== expected.width || metadata.height !== expected.height) {
    throw new Error(
      `${filename} is ${metadata.width}x${metadata.height}; `
      + `expected ${expected.width}x${expected.height}`
    );
  }
  if (metadata.bitDepth !== 8) {
    throw new Error(
      `${filename} has PNG bit depth ${metadata.bitDepth}; expected 8`
    );
  }
  if (metadata.colorType !== 2) {
    throw new Error(
      `${filename} has PNG color type ${metadata.colorType}; expected 2`
    );
  }

  // IHDR alone is not enough for an upload-ready asset. Decode the complete
  // image through pngjs so corrupt or truncated pixel data fails validation.
  await readPng(filePath);
  return {
    filename,
    filePath,
    kind,
    bytes: stat.size,
    metadata,
  };
}

async function loadCampaign(campaignPath) {
  let campaign;
  try {
    campaign = JSON.parse(await fs.readFile(campaignPath, 'utf8'));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read campaign manifest at ${campaignPath}: ${detail}`);
  }
  return validateCampaign(campaign);
}

export async function validateSourceAssets({
  campaignPath = DEFAULT_CAMPAIGN_PATH,
  sourceDir = DEFAULT_SOURCE_DIR,
} = {}) {
  const campaign = await loadCampaign(campaignPath);
  const screenshotNames = campaign.map(item => item.source);
  const expectedNames = [...screenshotNames, FEATURE_BACKGROUND_NAME];
  const expectedSet = new Set(expectedNames);
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const actualNames = entries.map(entry => entry.name).sort();

  for (const name of actualNames) {
    if (!expectedSet.has(name)) {
      throw new Error(`unexpected source asset "${name}"`);
    }
  }
  for (const name of expectedNames) {
    if (!actualNames.includes(name)) {
      throw new Error(`missing required source "${name}"`);
    }
  }

  const results = [];
  for (const name of screenshotNames) {
    results.push(
      await validatePngAsset(path.join(sourceDir, name), 'source-screenshot')
    );
  }
  results.push(
    await validatePngAsset(
      path.join(sourceDir, FEATURE_BACKGROUND_NAME),
      'feature-source'
    )
  );
  return results;
}

export async function validateFinalAssets({
  campaignPath = DEFAULT_CAMPAIGN_PATH,
  finalDir = DEFAULT_FINAL_DIR,
  screenshotsOnly = false,
} = {}) {
  const campaign = await loadCampaign(campaignPath);
  const screenshotNames = campaign.map(item => item.final);
  const expectedScreenshotSet = new Set(screenshotNames);
  const entries = await fs.readdir(finalDir, { withFileTypes: true });
  const pngNames = entries
    .filter(entry => entry.isFile() && path.extname(entry.name) === '.png')
    .map(entry => entry.name)
    .sort();

  for (const name of pngNames) {
    if (!expectedScreenshotSet.has(name) && name !== FEATURE_GRAPHIC_NAME) {
      throw new Error(`unexpected PNG asset "${name}"`);
    }
  }
  for (const name of screenshotNames) {
    if (!pngNames.includes(name)) {
      throw new Error(`missing required asset "${name}"`);
    }
  }

  const featureGraphicPresent = pngNames.includes(FEATURE_GRAPHIC_NAME);
  if (!screenshotsOnly && !featureGraphicPresent) {
    throw new Error(`missing required asset "${FEATURE_GRAPHIC_NAME}"`);
  }

  const results = [];
  for (const name of screenshotNames) {
    results.push(
      await validatePngAsset(path.join(finalDir, name), 'screenshot')
    );
  }
  if (featureGraphicPresent) {
    results.push(
      await validatePngAsset(
        path.join(finalDir, FEATURE_GRAPHIC_NAME),
        'feature'
      )
    );
  }
  return results;
}

export async function validatePlayStoreAssets({
  campaignPath = DEFAULT_CAMPAIGN_PATH,
  sourceDir = DEFAULT_SOURCE_DIR,
  finalDir = DEFAULT_FINAL_DIR,
  screenshotsOnly = false,
} = {}) {
  const sourceAssets = await validateSourceAssets({
    campaignPath,
    sourceDir,
  });
  const finalAssets = await validateFinalAssets({
    campaignPath,
    finalDir,
    screenshotsOnly,
  });
  return { sourceAssets, finalAssets };
}

function formatMegabytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  const args = process.argv.slice(2);
  const unknownArgs = args.filter(arg => arg !== '--screenshots-only');
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown argument${unknownArgs.length === 1 ? '' : 's'}: ${unknownArgs.join(', ')}`);
  }
  const screenshotsOnly = args.includes('--screenshots-only');
  const { sourceAssets, finalAssets } = await validatePlayStoreAssets({
    screenshotsOnly,
  });

  for (const result of sourceAssets) {
    const { width, height, bitDepth } = result.metadata;
    console.log(
      `[validate] source/${result.filename}: ${width}x${height}, `
      + `${bitDepth}-bit RGB, ${formatMegabytes(result.bytes)}, valid`
    );
  }
  for (const result of finalAssets) {
    const { width, height, bitDepth } = result.metadata;
    console.log(
      `[validate] final/${result.filename}: ${width}x${height}, `
      + `${bitDepth}-bit RGB, ${formatMegabytes(result.bytes)}, valid`
    );
  }
  console.log(
    `[validate] complete: ${sourceAssets.length} exact source assets and `
    + `${finalAssets.length} upload asset`
    + `${finalAssets.length === 1 ? '' : 's'} validated`
    + `${screenshotsOnly ? ' (screenshots-only mode)' : ''}`
  );
}

const IS_MAIN = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (IS_MAIN) {
  main().catch(error => {
    const detail = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(`[validate] ERROR\n${detail}`);
    process.exitCode = 1;
  });
}
