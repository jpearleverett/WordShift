import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { validateCampaign } from './capturePlayStoreHelpers.mjs';
import { withStagedPublication } from './composePlayStoreScreenshots.mjs';

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = import.meta.dirname
  ?? path.dirname(fileURLToPath(import.meta.url));
const MOBILE_DIR = path.resolve(SCRIPT_DIR, '../..');
const REPO_ROOT = path.resolve(MOBILE_DIR, '..');
const CAMPAIGN_PATH = path.join(REPO_ROOT, 'docs/play-store/campaign.json');
const SOURCE_DIR = path.join(REPO_ROOT, 'docs/play-store/source');
const FINAL_DIR = path.join(REPO_ROOT, 'docs/play-store/final');
const LEGACY_FEATURE_PATH = path.join(REPO_ROOT, 'docs/feature-graphic.png');

export const PROTECTED_FEATURE_PATHS = Object.freeze([
  'docs/play-store/source/feature-background.png',
  'docs/play-store/final/feature-graphic.png',
  'docs/feature-graphic.png',
]);

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

export function buildRequiredOutputPaths(campaign) {
  const approved = validateCampaign(campaign);
  const outputs = [
    ...approved.map(item => `docs/play-store/source/${item.source}`),
    ...approved.map(item => `docs/play-store/final/${item.final}`),
    'docs/play-store/final/feature-graphic.png',
  ];
  if (outputs.length !== 15) {
    throw new Error(
      `Determinism verification requires 15 generated outputs; found ${outputs.length}`
    );
  }
  return outputs;
}

async function hashPng(filePath, relativePath) {
  const encoded = await fs.readFile(filePath);
  let decoded;
  try {
    decoded = PNG.sync.read(encoded);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`${relativePath}: PNG decode failed: ${detail}`);
  }
  return {
    path: relativePath,
    encodedSha256: sha256(encoded),
    decodedSha256: sha256(decoded.data),
  };
}

async function hashGeneratedOutputs({ campaign, sourceDir, finalDir }) {
  const relativePaths = buildRequiredOutputPaths(campaign);
  const filePaths = [
    ...campaign.map(item => path.join(sourceDir, item.source)),
    ...campaign.map(item => path.join(finalDir, item.final)),
    path.join(finalDir, 'feature-graphic.png'),
  ];
  return Promise.all(filePaths.map((filePath, index) =>
    hashPng(filePath, relativePaths[index])
  ));
}

export function compareHashManifests(first, second) {
  const firstByPath = new Map(first.map(entry => [entry.path, entry]));
  const secondByPath = new Map(second.map(entry => [entry.path, entry]));
  const paths = [...new Set([...firstByPath.keys(), ...secondByPath.keys()])].sort();
  const diagnostics = [];

  for (const assetPath of paths) {
    const runOne = firstByPath.get(assetPath);
    const runTwo = secondByPath.get(assetPath);
    if (!runOne || !runTwo) {
      diagnostics.push(
        `${assetPath}: ${runOne ? 'missing from run 2' : 'missing from run 1'}`
      );
      continue;
    }
    if (runOne.encodedSha256 !== runTwo.encodedSha256) {
      diagnostics.push(
        `${assetPath}: encoded SHA-256 run 1=${runOne.encodedSha256}, `
        + `run 2=${runTwo.encodedSha256}`
      );
    }
    if (runOne.decodedSha256 !== runTwo.decodedSha256) {
      diagnostics.push(
        `${assetPath}: decoded RGBA SHA-256 run 1=${runOne.decodedSha256}, `
        + `run 2=${runTwo.decodedSha256}`
      );
    }
  }

  if (diagnostics.length > 0) {
    throw new Error(`Play Store generation is not deterministic:\n- ${
      diagnostics.join('\n- ')
    }`);
  }
}

async function snapshotDirectory(directory) {
  const stat = await fs.stat(directory);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile()) {
      throw new Error(
        `Cannot snapshot publication: ${path.join(directory, entry.name)} `
        + 'is not a regular file'
      );
    }
    const filePath = path.join(directory, entry.name);
    const fileStat = await fs.stat(filePath);
    files.push({
      name: entry.name,
      bytes: await fs.readFile(filePath),
      mode: fileStat.mode & 0o777,
    });
  }
  return {
    mode: stat.mode & 0o777,
    files,
  };
}

async function restoreDirectory(directory, snapshot) {
  await withStagedPublication({
    finalDir: directory,
    populateAndValidate: async stagingDir => {
      await Promise.all(snapshot.files.map(async file => {
        const targetPath = path.join(stagingDir, file.name);
        await fs.writeFile(targetPath, file.bytes);
        await fs.chmod(targetPath, file.mode);
      }));
    },
  });
  await fs.chmod(directory, snapshot.mode);
}

async function restoreFile(filePath, snapshot) {
  const parent = path.dirname(filePath);
  const tempDir = await fs.mkdtemp(
    path.join(parent, `.${path.basename(filePath)}.restore-`)
  );
  const tempPath = path.join(tempDir, path.basename(filePath));
  try {
    await fs.writeFile(tempPath, snapshot.bytes);
    await fs.chmod(tempPath, snapshot.mode);
    await fs.rename(tempPath, filePath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function snapshotPublication({ sourceDir, finalDir, legacyFeaturePath }) {
  const [source, final, legacyStat, legacyBytes] = await Promise.all([
    snapshotDirectory(sourceDir),
    snapshotDirectory(finalDir),
    fs.stat(legacyFeaturePath),
    fs.readFile(legacyFeaturePath),
  ]);
  return {
    source,
    final,
    legacy: {
      bytes: legacyBytes,
      mode: legacyStat.mode & 0o777,
    },
  };
}

async function restorePublication({
  sourceDir,
  finalDir,
  legacyFeaturePath,
  snapshot,
}) {
  await restoreDirectory(sourceDir, snapshot.source);
  await restoreDirectory(finalDir, snapshot.final);
  await restoreFile(legacyFeaturePath, snapshot.legacy);
}

function protectedAbsolutePaths({ sourceDir, finalDir, legacyFeaturePath }) {
  return new Map([
    [
      'docs/play-store/source/feature-background.png',
      path.join(sourceDir, 'feature-background.png'),
    ],
    [
      'docs/play-store/final/feature-graphic.png',
      path.join(finalDir, 'feature-graphic.png'),
    ],
    ['docs/feature-graphic.png', legacyFeaturePath],
  ]);
}

async function assertProtectedFeatures({
  baselineRef,
  loadBaselineBytes,
  sourceDir,
  finalDir,
  legacyFeaturePath,
  stage,
}) {
  const absolutePaths = protectedAbsolutePaths({
    sourceDir,
    finalDir,
    legacyFeaturePath,
  });
  const diagnostics = [];
  const hashes = [];

  for (const relativePath of PROTECTED_FEATURE_PATHS) {
    const [baseline, actual] = await Promise.all([
      loadBaselineBytes(relativePath),
      fs.readFile(absolutePaths.get(relativePath)),
    ]);
    if (!Buffer.isBuffer(baseline)) {
      throw new Error(
        `${relativePath}: baseline loader did not return bytes for ${baselineRef}`
      );
    }
    const baselineSha256 = sha256(baseline);
    const actualSha256 = sha256(actual);
    hashes.push({ path: relativePath, sha256: actualSha256 });
    if (!actual.equals(baseline)) {
      diagnostics.push(
        `${relativePath}: baseline ${baselineRef} SHA-256=${baselineSha256}, `
        + `${stage} SHA-256=${actualSha256}`
      );
    }
  }

  if (diagnostics.length > 0) {
    throw new Error(`Protected feature asset mismatch:\n- ${
      diagnostics.join('\n- ')
    }`);
  }
  return hashes;
}

async function runCompleteGeneration(runNumber) {
  console.log(`[determinism] complete generation run ${runNumber}/2`);
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'generate:play-store'], {
      cwd: MOBILE_DIR,
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(
          `Generation run ${runNumber} failed `
          + `(exit ${code ?? 'null'}, signal ${signal ?? 'none'})`
        ));
      }
    });
  });
}

async function loadGitBaselineBytes(repoRoot, baselineRef, relativePath) {
  const { stdout } = await execFileAsync(
    'git',
    ['show', `${baselineRef}:${relativePath}`],
    {
      cwd: repoRoot,
      encoding: null,
      maxBuffer: 16 * 1024 * 1024,
    }
  );
  return stdout;
}

export async function verifyPlayStoreDeterminism({
  repoRoot = REPO_ROOT,
  campaignPath = CAMPAIGN_PATH,
  sourceDir = SOURCE_DIR,
  finalDir = FINAL_DIR,
  legacyFeaturePath = LEGACY_FEATURE_PATH,
  baselineRef,
  loadBaselineBytes = relativePath =>
    loadGitBaselineBytes(repoRoot, baselineRef, relativePath),
  runGeneration = runCompleteGeneration,
} = {}) {
  if (typeof baselineRef !== 'string' || baselineRef.length === 0) {
    throw new Error('Determinism verification requires --baseline <git-ref>');
  }
  const campaign = validateCampaign(
    JSON.parse(await fs.readFile(campaignPath, 'utf8'))
  );
  buildRequiredOutputPaths(campaign);
  const snapshot = await snapshotPublication({
    sourceDir,
    finalDir,
    legacyFeaturePath,
  });
  let result;
  let verificationError;

  try {
    await assertProtectedFeatures({
      baselineRef,
      loadBaselineBytes,
      sourceDir,
      finalDir,
      legacyFeaturePath,
      stage: 'before generation',
    });
    await runGeneration(1);
    const firstHashes = await hashGeneratedOutputs({
      campaign,
      sourceDir,
      finalDir,
    });
    await assertProtectedFeatures({
      baselineRef,
      loadBaselineBytes,
      sourceDir,
      finalDir,
      legacyFeaturePath,
      stage: 'run 1',
    });
    await runGeneration(2);
    const secondHashes = await hashGeneratedOutputs({
      campaign,
      sourceDir,
      finalDir,
    });
    const protectedHashes = await assertProtectedFeatures({
      baselineRef,
      loadBaselineBytes,
      sourceDir,
      finalDir,
      legacyFeaturePath,
      stage: 'run 2',
    });
    compareHashManifests(firstHashes, secondHashes);
    result = {
      hashes: secondHashes,
      protectedHashes,
    };
  } catch (error) {
    verificationError = error;
  }

  try {
    await restorePublication({
      sourceDir,
      finalDir,
      legacyFeaturePath,
      snapshot,
    });
  } catch (restoreError) {
    if (verificationError) {
      throw new AggregateError(
        [verificationError, restoreError],
        'Determinism verification failed and publication restoration also failed'
      );
    }
    throw restoreError;
  }
  if (verificationError) throw verificationError;
  return result;
}

function parseBaselineArg(args) {
  if (args.length !== 2 || args[0] !== '--baseline' || !args[1]) {
    throw new Error(
      'Usage: node scripts/tools/verifyPlayStoreDeterminism.mjs '
      + '--baseline <git-ref>'
    );
  }
  return args[1];
}

async function main() {
  const baselineRef = parseBaselineArg(process.argv.slice(2));
  const result = await verifyPlayStoreDeterminism({ baselineRef });
  console.log(
    '[determinism] MATCH: 15/15 encoded and decoded RGBA SHA-256 pairs'
  );
  for (const hash of result.hashes) {
    console.log(
      `[determinism] ${hash.path}: encoded=${hash.encodedSha256} `
      + `decoded=${hash.decodedSha256}`
    );
  }
  for (const feature of result.protectedHashes) {
    console.log(
      `[determinism] protected ${feature.path}: ${feature.sha256} `
      + `(matches ${baselineRef})`
    );
  }
  console.log('[determinism] original tracked publication restored');
}

const IS_MAIN = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (IS_MAIN) {
  main().catch(error => {
    const detail = error instanceof Error ? error.stack ?? error.message : String(error);
    console.error(`[determinism] ERROR\n${detail}`);
    process.exitCode = 1;
  });
}
