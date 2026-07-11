import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { withStagedPublication } from './composePlayStoreScreenshots.mjs';
import {
  APPROVED_SCENARIOS,
  isAllowedCaptureRequest,
  isSafePngBasename,
  validateCampaign,
} from './capturePlayStoreHelpers.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const RUNNER_PATH = path.join(SCRIPT_DIR, 'capturePlayStoreScreenshots.mjs');
const PACKAGE_PATH = path.resolve(SCRIPT_DIR, '../../package.json');
const ROW_PATH = path.resolve(SCRIPT_DIR, '../../src/components/Row.tsx');
const HOME_PATH = path.resolve(
  SCRIPT_DIR,
  '../../src/components/home/HomeScreen.tsx'
);

const makeCampaign = () => APPROVED_SCENARIOS.map((scenario, index) => ({
  scenario,
  source: `${String(index + 1).padStart(2, '0')}_${scenario}.png`,
  final: `${String(index + 1).padStart(2, '0')}_${scenario}_final.png`,
  headline: `Headline ${index + 1}`,
  support: `Support ${index + 1}`,
  altText: `Alt text ${index + 1}`,
  theme: index < 4 ? 'bright' : index < 7 ? 'dusk' : 'mystery',
}));

describe('capture campaign validation', () => {
  test('accepts the approved order, safe PNG basenames, and themes', () => {
    const campaign = makeCampaign();

    assert.equal(validateCampaign(campaign), campaign);
  });

  test('rejects unsafe source and final paths', () => {
    const unsafeSource = makeCampaign();
    unsafeSource[0].source = '../escape.png';
    assert.throws(() => validateCampaign(unsafeSource), /invalid source filename/);

    const unsafeFinal = makeCampaign();
    unsafeFinal[0].final = 'nested/final.png';
    assert.throws(() => validateCampaign(unsafeFinal), /invalid final filename/);

    assert.equal(isSafePngBasename('screen.png'), true);
    assert.equal(isSafePngBasename('screen.PNG'), false);
    assert.equal(isSafePngBasename('../screen.png'), false);
    assert.equal(isSafePngBasename('nested/screen.png'), false);
  });

  test('rejects unsupported themes and scenario order changes', () => {
    const invalidTheme = makeCampaign();
    invalidTheme[0].theme = 'night';
    assert.throws(() => validateCampaign(invalidTheme), /invalid theme "night"/);

    const invalidOrder = makeCampaign();
    [invalidOrder[0], invalidOrder[1]] = [invalidOrder[1], invalidOrder[0]];
    assert.throws(() => validateCampaign(invalidOrder), /out of order/);
  });
});

describe('capture request allowlist', () => {
  test('allows loopback, data, and blob URLs', () => {
    assert.equal(isAllowedCaptureRequest('http://127.0.0.1:8091/index.bundle'), true);
    assert.equal(isAllowedCaptureRequest('http://localhost:8091/assets/icon.png'), true);
    assert.equal(isAllowedCaptureRequest('data:image/png;base64,AA=='), true);
    assert.equal(isAllowedCaptureRequest('blob:http://127.0.0.1:8091/id'), true);
  });

  test('rejects external, file, and malformed URLs', () => {
    assert.equal(isAllowedCaptureRequest('https://example.com/tracker.js'), false);
    assert.equal(isAllowedCaptureRequest('file:///tmp/secret'), false);
    assert.equal(isAllowedCaptureRequest('not a URL'), false);
  });
});

describe('capture publication and stability policy', () => {
  test('runner captures into one staged source directory before publication', async () => {
    const runner = await fs.readFile(RUNNER_PATH, 'utf8');

    assert.match(
      runner,
      /await withStagedPublication\(\{\s*finalDir: SOURCE_DIR,/
    );
    assert.match(runner, /captureScenario\(browser, item, stagingDir\)/);
    assert.doesNotMatch(
      runner,
      /path\.join\(SOURCE_DIR,\s*item\.source\)/
    );
  });

  test('staged source failure leaves current captures untouched and cleans temp state', async () => {
    const tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'wordshift-play-store-capture-')
    );
    const sourceDir = path.join(tempDir, 'source');
    const currentPath = path.join(sourceDir, '01_puzzle_preview.png');

    try {
      await fs.mkdir(sourceDir);
      await fs.writeFile(currentPath, 'current capture');

      await assert.rejects(
        withStagedPublication({
          finalDir: sourceDir,
          populateAndValidate: async stagingDir => {
            await fs.writeFile(
              path.join(stagingDir, '01_puzzle_preview.png'),
              'partial replacement'
            );
            await fs.writeFile(
              path.join(stagingDir, '02_puzzle_chain.png'),
              'partial new capture'
            );
            throw new Error('simulated capture failure');
          },
        }),
        /simulated capture failure/
      );

      assert.equal(await fs.readFile(currentPath, 'utf8'), 'current capture');
      assert.deepEqual(await fs.readdir(sourceDir), ['01_puzzle_preview.png']);
      assert.deepEqual(await fs.readdir(tempDir), ['source']);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  test('runner installs deterministic randomness before loading each scenario', async () => {
    const runner = await fs.readFile(RUNNER_PATH, 'utf8');

    assert.match(runner, /await context\.addInitScript\(/);
    assert.match(runner, /Math\.random\s*=\s*\(\)\s*=>/);
    assert.match(runner, /seed:\s*item\.scenario/);
  });

  test('capture motion policy settles row geometry and home currency chrome', async () => {
    const [row, home] = await Promise.all([
      fs.readFile(ROW_PATH, 'utf8'),
      fs.readFile(HOME_PATH, 'utf8'),
    ]);

    assert.match(row, /shouldFreezePlayStoreCaptureMotion/);
    assert.match(row, /if \(freezeCaptureMotion\) \{/);
    assert.match(home, /shouldFreezePlayStoreCaptureMotion/);
    assert.match(home, /if \(shouldFreezePlayStoreCaptureMotion\(\)\) \{/);
  });

  test('flawless capture waits for the skip layer to unmount', async () => {
    const runner = await fs.readFile(RUNNER_PATH, 'utf8');

    assert.match(
      runner,
      /skipCelebration\.waitFor\(\{\s*state: 'detached'/
    );
  });

  test('aggregate Play Store asset tests include capture runner regressions', async () => {
    const pkg = JSON.parse(await fs.readFile(PACKAGE_PATH, 'utf8'));

    assert.match(
      pkg.scripts['test:play-store-assets'],
      /capturePlayStoreScreenshots\.test\.mjs/
    );
  });
});
