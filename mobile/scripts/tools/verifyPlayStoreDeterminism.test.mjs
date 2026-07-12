import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_PATH = path.resolve(SCRIPT_DIR, '../../package.json');
const SCENARIOS = [
  'puzzle-preview',
  'puzzle-chain',
  'home-sunny',
  'animal-dialogue',
  'variant-menu',
  'flawless-victory',
  'home-dusk',
];

let tempDir;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wordshift-determinism-'));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

async function loadVerifier() {
  try {
    return await import('./verifyPlayStoreDeterminism.mjs');
  } catch {
    return {};
  }
}

function encodePng(red, green = 40, blue = 80) {
  const png = new PNG({ width: 2, height: 2 });
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = red;
    png.data[offset + 1] = green;
    png.data[offset + 2] = blue;
    png.data[offset + 3] = 255;
  }
  return PNG.sync.write(png, {
    colorType: 2,
    inputColorType: 6,
    inputHasAlpha: true,
  });
}

function campaignFixture() {
  return SCENARIOS.map((scenario, index) => ({
    scenario,
    source: `source-${index + 1}.png`,
    final: `final-${index + 1}.png`,
    headline: `Headline ${index + 1}`,
    support: `Support ${index + 1}`,
    altText: `Visible state ${index + 1}`,
    theme: index < 4 ? 'bright' : index < 6 ? 'dusk' : 'mystery',
    uneaseLevel: index + 1,
  }));
}

async function snapshotTree(directory) {
  const names = (await fs.readdir(directory)).sort();
  return Promise.all(names.map(async name => ({
    name,
    bytes: await fs.readFile(path.join(directory, name)),
  })));
}

describe('Play Store determinism verifier', () => {
  test('defines exactly 15 generated outputs from the seven-shot campaign', async () => {
    const verifier = await loadVerifier();
    assert.equal(typeof verifier.buildRequiredOutputPaths, 'function');

    const paths = verifier.buildRequiredOutputPaths(campaignFixture());

    assert.equal(paths.length, 15);
    assert.deepEqual(paths.slice(0, 7), [
      'docs/play-store/source/source-1.png',
      'docs/play-store/source/source-2.png',
      'docs/play-store/source/source-3.png',
      'docs/play-store/source/source-4.png',
      'docs/play-store/source/source-5.png',
      'docs/play-store/source/source-6.png',
      'docs/play-store/source/source-7.png',
    ]);
    assert.deepEqual(paths.slice(7), [
      'docs/play-store/final/final-1.png',
      'docs/play-store/final/final-2.png',
      'docs/play-store/final/final-3.png',
      'docs/play-store/final/final-4.png',
      'docs/play-store/final/final-5.png',
      'docs/play-store/final/final-6.png',
      'docs/play-store/final/final-7.png',
      'docs/play-store/final/feature-graphic.png',
    ]);
  });

  test('reports encoded and decoded mismatches for each affected file', async () => {
    const verifier = await loadVerifier();
    assert.equal(typeof verifier.compareHashManifests, 'function');
    const first = [
      { path: 'source/a.png', encodedSha256: 'encoded-a', decodedSha256: 'decoded-a' },
      { path: 'final/b.png', encodedSha256: 'encoded-b', decodedSha256: 'decoded-b' },
    ];
    const second = [
      { path: 'source/a.png', encodedSha256: 'encoded-z', decodedSha256: 'decoded-a' },
      { path: 'final/b.png', encodedSha256: 'encoded-b', decodedSha256: 'decoded-z' },
    ];

    assert.throws(
      () => verifier.compareHashManifests(first, second),
      error => {
        assert.match(error.message, /source\/a\.png: encoded SHA-256/);
        assert.match(error.message, /run 1=encoded-a, run 2=encoded-z/);
        assert.match(error.message, /final\/b\.png: decoded RGBA SHA-256/);
        assert.match(error.message, /run 1=decoded-b, run 2=decoded-z/);
        return true;
      }
    );
  });

  test('runs generation twice and restores the original publication on success', async () => {
    const verifier = await loadVerifier();
    assert.equal(typeof verifier.verifyPlayStoreDeterminism, 'function');
    const campaign = campaignFixture();
    const campaignPath = path.join(tempDir, 'campaign.json');
    const sourceDir = path.join(tempDir, 'source');
    const finalDir = path.join(tempDir, 'final');
    const legacyFeaturePath = path.join(tempDir, 'legacy-feature.png');
    await Promise.all([
      fs.mkdir(sourceDir),
      fs.mkdir(finalDir),
      fs.writeFile(campaignPath, JSON.stringify(campaign)),
    ]);
    await Promise.all([
      ...campaign.map((item, index) =>
        fs.writeFile(path.join(sourceDir, item.source), encodePng(20 + index))
      ),
      ...campaign.map((item, index) =>
        fs.writeFile(path.join(finalDir, item.final), encodePng(40 + index))
      ),
      fs.writeFile(path.join(sourceDir, 'feature-background.png'), encodePng(70)),
      fs.writeFile(path.join(finalDir, 'feature-graphic.png'), encodePng(80)),
      fs.writeFile(legacyFeaturePath, encodePng(80)),
    ]);
    const before = {
      source: await snapshotTree(sourceDir),
      final: await snapshotTree(finalDir),
      legacy: await fs.readFile(legacyFeaturePath),
    };
    const protectedBaseline = new Map([
      ['docs/play-store/source/feature-background.png', encodePng(70)],
      ['docs/play-store/final/feature-graphic.png', encodePng(80)],
      ['docs/feature-graphic.png', encodePng(80)],
    ]);
    let generationRuns = 0;
    const generated = encodePng(120);

    const result = await verifier.verifyPlayStoreDeterminism({
      repoRoot: tempDir,
      campaignPath,
      sourceDir,
      finalDir,
      legacyFeaturePath,
      baselineRef: 'fixture',
      loadBaselineBytes: async relativePath => protectedBaseline.get(relativePath),
      runGeneration: async () => {
        generationRuns += 1;
        await Promise.all([
          ...campaign.map(item =>
            fs.writeFile(path.join(sourceDir, item.source), generated)
          ),
          ...campaign.map(item =>
            fs.writeFile(path.join(finalDir, item.final), generated)
          ),
          fs.writeFile(path.join(finalDir, 'feature-graphic.png'), encodePng(80)),
          fs.writeFile(legacyFeaturePath, encodePng(80)),
        ]);
      },
    });

    assert.equal(generationRuns, 2);
    assert.equal(result.hashes.length, 15);
    assert.deepEqual(await snapshotTree(sourceDir), before.source);
    assert.deepEqual(await snapshotTree(finalDir), before.final);
    assert.deepEqual(await fs.readFile(legacyFeaturePath), before.legacy);
  });

  test('restores the original publication and identifies a mismatched second run', async () => {
    const verifier = await loadVerifier();
    assert.equal(typeof verifier.verifyPlayStoreDeterminism, 'function');
    const campaign = campaignFixture();
    const campaignPath = path.join(tempDir, 'campaign.json');
    const sourceDir = path.join(tempDir, 'source');
    const finalDir = path.join(tempDir, 'final');
    const legacyFeaturePath = path.join(tempDir, 'legacy-feature.png');
    await Promise.all([
      fs.mkdir(sourceDir),
      fs.mkdir(finalDir),
      fs.writeFile(campaignPath, JSON.stringify(campaign)),
    ]);
    await Promise.all([
      ...campaign.map(item =>
        fs.writeFile(path.join(sourceDir, item.source), encodePng(20))
      ),
      ...campaign.map(item =>
        fs.writeFile(path.join(finalDir, item.final), encodePng(30))
      ),
      fs.writeFile(path.join(sourceDir, 'feature-background.png'), encodePng(70)),
      fs.writeFile(path.join(finalDir, 'feature-graphic.png'), encodePng(80)),
      fs.writeFile(legacyFeaturePath, encodePng(80)),
    ]);
    const before = {
      source: await snapshotTree(sourceDir),
      final: await snapshotTree(finalDir),
      legacy: await fs.readFile(legacyFeaturePath),
    };
    const protectedBaseline = new Map([
      ['docs/play-store/source/feature-background.png', encodePng(70)],
      ['docs/play-store/final/feature-graphic.png', encodePng(80)],
      ['docs/feature-graphic.png', encodePng(80)],
    ]);
    let generationRuns = 0;

    await assert.rejects(
      verifier.verifyPlayStoreDeterminism({
        repoRoot: tempDir,
        campaignPath,
        sourceDir,
        finalDir,
        legacyFeaturePath,
        baselineRef: 'fixture',
        loadBaselineBytes: async relativePath => protectedBaseline.get(relativePath),
        runGeneration: async () => {
          generationRuns += 1;
          const sourceBytes = generationRuns === 1
            ? encodePng(110)
            : encodePng(111);
          await Promise.all([
            ...campaign.map(item =>
              fs.writeFile(path.join(sourceDir, item.source), sourceBytes)
            ),
            ...campaign.map(item =>
              fs.writeFile(path.join(finalDir, item.final), encodePng(120))
            ),
            fs.writeFile(path.join(finalDir, 'feature-graphic.png'), encodePng(80)),
            fs.writeFile(legacyFeaturePath, encodePng(80)),
          ]);
        },
      }),
      /source-1\.png: encoded SHA-256[\s\S]*source-1\.png: decoded RGBA SHA-256/
    );

    assert.equal(generationRuns, 2);
    assert.deepEqual(await snapshotTree(sourceDir), before.source);
    assert.deepEqual(await snapshotTree(finalDir), before.final);
    assert.deepEqual(await fs.readFile(legacyFeaturePath), before.legacy);
  });

  test('exposes a baseline-pinned package command and includes its tests', async () => {
    const pkg = JSON.parse(await fs.readFile(PACKAGE_PATH, 'utf8'));

    assert.equal(
      pkg.scripts['verify:play-store-determinism'],
      'node scripts/tools/verifyPlayStoreDeterminism.mjs --baseline fd3b81d'
    );
    assert.match(
      pkg.scripts['test:play-store-assets'],
      /verifyPlayStoreDeterminism\.test\.mjs/
    );
  });
});
