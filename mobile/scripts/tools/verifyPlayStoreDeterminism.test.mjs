import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../..');
const PACKAGE_PATH = path.join(REPO_ROOT, 'mobile/package.json');
const CHECKLIST_PATH = path.join(REPO_ROOT, 'docs/LAUNCH_CHECKLIST.md');
const STORE_LISTING_PATH = path.join(REPO_ROOT, 'docs/STORE_LISTING.md');
const CAMPAIGN_PATH = path.join(REPO_ROOT, 'docs/play-store/campaign.json');
const VERIFIER_PATH = path.join(SCRIPT_DIR, 'verifyPlayStoreDeterminism.mjs');
const PROTECTED_MANIFEST_PATH = path.join(
  REPO_ROOT,
  'docs/play-store/protected-feature-hashes.json'
);
const PROTECTED_HASHES = {
  'docs/play-store/source/feature-background.png':
    'd5e6371e06f458b91f15c7cfd2d3fc348cfd3937c2172a9d5fea3c2c3ce98c44',
  'docs/play-store/final/feature-graphic.png':
    'a0e16100526e2981311bcd81a5eda56edacf1a12e4b5ed39f2f1d808825c30f1',
  'docs/feature-graphic.png':
    'a0e16100526e2981311bcd81a5eda56edacf1a12e4b5ed39f2f1d808825c30f1',
};

let tempDir;

beforeEach(async () => {
  tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wordshift-determinism-'));
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

async function loadCore() {
  try {
    return await import('./playStoreDeterminismCore.mjs');
  } catch {
    return {};
  }
}

function encodePng(red) {
  const png = new PNG({ width: 2, height: 2 });
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = red;
    png.data[offset + 1] = 40;
    png.data[offset + 2] = 80;
    png.data[offset + 3] = 255;
  }
  return PNG.sync.write(png, {
    colorType: 2,
    inputColorType: 6,
    inputHasAlpha: true,
  });
}

describe('protected feature hash manifest', () => {
  test('loads the immutable approved hashes from the repository', async () => {
    const core = await loadCore();
    assert.equal(typeof core.loadProtectedHashManifest, 'function');

    const manifest = await core.loadProtectedHashManifest(PROTECTED_MANIFEST_PATH);

    assert.deepEqual(manifest, PROTECTED_HASHES);
  });

  test('rejects a missing or malformed manifest before generation', async () => {
    const core = await loadCore();
    assert.equal(typeof core.loadProtectedHashManifest, 'function');
    const missing = path.join(tempDir, 'missing.json');
    await assert.rejects(
      core.loadProtectedHashManifest(missing),
      /protected feature hash manifest.*missing/i
    );

    const malformed = path.join(tempDir, 'malformed.json');
    await fs.writeFile(malformed, JSON.stringify({
      schemaVersion: 1,
      algorithm: 'sha256',
      files: {
        ...PROTECTED_HASHES,
        'docs/feature-graphic.png': 'not-a-sha',
      },
    }));
    await assert.rejects(
      core.loadProtectedHashManifest(malformed),
      /docs\/feature-graphic\.png.*64 lowercase hexadecimal/i
    );
  });
});

describe('exclusive verifier lock', () => {
  test('rejects a concurrent invocation and releases cleanly', async () => {
    const core = await loadCore();
    assert.equal(typeof core.acquireExclusiveLock, 'function');
    const lockPath = path.join(tempDir, 'verification.lock');
    const first = await core.acquireExclusiveLock(lockPath, { pid: 101 });

    await assert.rejects(
      core.acquireExclusiveLock(lockPath, { pid: 202 }),
      /determinism verification already running.*101/i
    );
    await first.release();
    const second = await core.acquireExclusiveLock(lockPath, { pid: 202 });
    await second.release();
    await assert.rejects(fs.stat(lockPath), error => error.code === 'ENOENT');
  });
});

describe('publication preflight and comparison', () => {
  test('requires the exact 17 generated outputs for the eight-shot campaign', async () => {
    const core = await loadCore();
    const currentCampaign = JSON.parse(await fs.readFile(CAMPAIGN_PATH, 'utf8'));
    const stormShot = {
      scenario: 'home-storm',
      source: '08_home_storm.png',
      final: '08_something_stirs.png',
      headline: 'SOMETHING STIRS IN THE AIR',
      support: 'Your friends know more than they are willing to say.',
      altText: 'WordShift animal house beneath a storm-dark sky, with familiar companions waiting inside dimly lit rooms.',
      theme: 'mystery',
      uneaseLevel: 8,
    };
    const campaign = [
      ...currentCampaign.filter(item => item.scenario !== stormShot.scenario),
      stormShot,
    ];

    const outputs = core.buildRequiredOutputPaths(campaign);

    assert.equal(outputs.length, 17);
    assert.deepEqual(outputs, [
      'docs/play-store/source/01_puzzle_preview.png',
      'docs/play-store/source/02_puzzle_chain.png',
      'docs/play-store/source/03_home_sunny.png',
      'docs/play-store/source/04_animal_dialogue.png',
      'docs/play-store/source/05_variant_menu.png',
      'docs/play-store/source/06_flawless_victory.png',
      'docs/play-store/source/07_home_dusk.png',
      'docs/play-store/source/08_home_storm.png',
      'docs/play-store/final/01_shift_one_letter.png',
      'docs/play-store/final/02_every_word_stays_real.png',
      'docs/play-store/final/03_build_a_home.png',
      'docs/play-store/final/04_meet_unlikely_friends.png',
      'docs/play-store/final/05_master_every_mode.png',
      'docs/play-store/final/06_flawless_offering.png',
      'docs/play-store/final/07_theyve_been_waiting.png',
      'docs/play-store/final/08_something_stirs.png',
      'docs/play-store/final/feature-graphic.png',
    ]);
  });

  test('rejects targeted dirty checked-in assets', async () => {
    const core = await loadCore();
    assert.equal(typeof core.assertTargetAssetsClean, 'function');

    assert.throws(
      () => core.assertTargetAssetsClean(
        ' M docs/play-store/final/05_master_every_mode.png\0'
      ),
      /targeted Play Store assets are dirty.*05_master_every_mode\.png/is
    );
    assert.doesNotThrow(() => core.assertTargetAssetsClean(''));
  });

  test('reports generated-vs-checked-in hash and file-mode mismatches', async () => {
    const core = await loadCore();
    assert.equal(typeof core.compareHashManifests, 'function');
    const checkedIn = [{
      path: 'docs/play-store/final/01.png',
      encodedSha256: 'encoded-a',
      decodedSha256: 'decoded-a',
      mode: 0o644,
    }];
    const generated = [{
      path: 'docs/play-store/final/01.png',
      encodedSha256: 'encoded-b',
      decodedSha256: 'decoded-a',
      mode: 0o600,
    }];

    assert.throws(
      () => core.compareHashManifests(checkedIn, generated, {
        firstLabel: 'checked-in',
        secondLabel: 'generated',
      }),
      error => {
        assert.match(error.message, /encoded SHA-256 checked-in=encoded-a, generated=encoded-b/);
        assert.match(error.message, /file mode checked-in=0644, generated=0600/);
        return true;
      }
    );
  });

  test('hashing PNG outputs is read-only and records file mode', async () => {
    const core = await loadCore();
    assert.equal(typeof core.hashPngFiles, 'function');
    const relativePath = 'docs/play-store/final/sample.png';
    const filePath = path.join(tempDir, relativePath);
    const bytes = encodePng(90);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, bytes, { mode: 0o640 });

    const hashes = await core.hashPngFiles(tempDir, [relativePath]);

    assert.equal(hashes[0].mode, 0o640);
    assert.deepEqual(await fs.readFile(filePath), bytes);
    assert.equal((await fs.stat(filePath)).mode & 0o777, 0o640);
  });
});

describe('signal-safe process lifecycle', () => {
  for (const [signal, exitCode] of [['SIGINT', 130], ['SIGTERM', 143]]) {
    test(`forwards ${signal} to the child group, waits, then cleans up`, async () => {
      const core = await loadCore();
      assert.equal(typeof core.SignalCoordinator, 'function');
      assert.equal(typeof core.runManagedCommand, 'function');
      assert.equal(typeof core.runWithCleanup, 'function');
      const events = [];
      let child;
      const coordinator = new core.SignalCoordinator({
        killProcessGroup: (pid, forwardedSignal) => {
          events.push(`forward:${pid}:${forwardedSignal}`);
          setImmediate(() => {
            events.push('child-exit');
            child.emit('exit', null, forwardedSignal);
          });
        },
      });
      const spawnProcess = () => {
        child = new EventEmitter();
        child.pid = 4321;
        events.push('spawn');
        return child;
      };

      const operation = core.runWithCleanup(
        () => core.runManagedCommand({
          command: 'npm',
          args: ['run', 'generate:play-store'],
          cwd: tempDir,
          spawnProcess,
          signalCoordinator: coordinator,
        }),
        [{ name: 'workspace', run: async () => events.push('cleanup') }]
      );
      await new Promise(resolve => setImmediate(resolve));
      coordinator.handleSignal(signal);

      await assert.rejects(operation, error => {
        assert.equal(error.signal, signal);
        assert.equal(error.exitCode, exitCode);
        return true;
      });
      assert.deepEqual(events, [
        'spawn',
        `forward:-4321:${signal}`,
        'child-exit',
        'cleanup',
      ]);
    });
  }

  test('a process-group forwarding race cannot skip cleanup', async () => {
    const core = await loadCore();
    const events = [];
    let child;
    const coordinator = new core.SignalCoordinator({
      killProcessGroup: () => {
        throw Object.assign(new Error('process already exited'), { code: 'ESRCH' });
      },
    });
    const operation = core.runWithCleanup(
      () => core.runManagedCommand({
        command: 'npm',
        args: ['run', 'generate:play-store'],
        cwd: tempDir,
        spawnProcess: () => {
          child = new EventEmitter();
          child.pid = 4321;
          return child;
        },
        signalCoordinator: coordinator,
      }),
      [{ name: 'lock', run: async () => events.push('cleanup') }]
    );
    await new Promise(resolve => setImmediate(resolve));

    assert.doesNotThrow(() => coordinator.handleSignal('SIGTERM'));
    child.emit('exit', null, 'SIGTERM');

    await assert.rejects(operation, error => error.signal === 'SIGTERM');
    assert.deepEqual(events, ['cleanup']);
  });

  test('setup failure still attempts every cleanup target and aggregates failures', async () => {
    const core = await loadCore();
    assert.equal(typeof core.runWithCleanup, 'function');
    const called = [];

    await assert.rejects(
      core.runWithCleanup(
        async () => {
          called.push('setup');
          throw new Error('worktree setup failed');
        },
        [
          {
            name: 'worktree',
            run: async () => {
              called.push('worktree');
              throw new Error('worktree cleanup failed');
            },
          },
          { name: 'temp directory', run: async () => called.push('temp') },
          { name: 'lock', run: async () => called.push('lock') },
        ]
      ),
      error => {
        assert.ok(error instanceof AggregateError);
        assert.match(error.message, /operation and cleanup failed/i);
        assert.equal(error.errors.length, 2);
        return true;
      }
    );
    assert.deepEqual(called, ['setup', 'worktree', 'temp', 'lock']);
  });

  test('holds the exclusive lock until all other cleanup attempts finish', async () => {
    const core = await loadCore();
    assert.equal(typeof core.runCleanupPhases, 'function');
    const events = [];

    await assert.rejects(
      core.runCleanupPhases([
        [
          {
            name: 'worktree',
            run: async () => {
              await new Promise(resolve => setImmediate(resolve));
              events.push('worktree');
              throw new Error('remove failed');
            },
          },
          { name: 'temp', run: async () => events.push('temp') },
        ],
        [{ name: 'lock', run: async () => events.push('lock') }],
      ]),
      error => {
        assert.ok(error instanceof AggregateError);
        assert.equal(error.errors.length, 1);
        return true;
      }
    );
    assert.equal(events.at(-1), 'lock');
    assert.deepEqual(new Set(events), new Set(['worktree', 'temp', 'lock']));
  });
});

describe('isolated verifier integration contract', () => {
  test('uses a detached worktree and never snapshots or restores active assets', async () => {
    const source = await fs.readFile(VERIFIER_PATH, 'utf8');

    assert.match(source, /worktree', 'add', '--detach'/);
    assert.match(source, /cwd:\s*isolatedMobileDir/);
    assert.doesNotMatch(source, /snapshotPublication|restorePublication/);
    assert.doesNotMatch(source, /baselineRef|git show|fd3b81d/);
  });

  test('uses the default manifest-based command and accurate publication docs', async () => {
    const [pkg, checklist, storeListing] = await Promise.all([
      fs.readFile(PACKAGE_PATH, 'utf8').then(JSON.parse),
      fs.readFile(CHECKLIST_PATH, 'utf8'),
      fs.readFile(STORE_LISTING_PATH, 'utf8'),
    ]);

    assert.equal(
      pkg.scripts['verify:play-store-determinism'],
      'node scripts/tools/verifyPlayStoreDeterminism.mjs'
    );
    assert.match(checklist, /detached temporary Git worktree/);
    assert.match(checklist, /approved feature-hash manifest/);
    assert.doesNotMatch(storeListing, /seven-shot regeneration pending/i);
    assert.match(
      storeListing,
      /Android phone screenshots ×8, 7 generated and validated; shot 8 generation pending/
    );
  });
});
