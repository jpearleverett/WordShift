import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { validateCampaign } from './capturePlayStoreHelpers.mjs';
import {
  PROTECTED_FEATURE_PATHS,
  SignalCoordinator,
  SignalTerminationError,
  acquireExclusiveLock,
  assertProtectedHashes,
  assertTargetAssetsClean,
  buildRequiredOutputPaths,
  compareHashManifests,
  hashPngFiles,
  installSignalHandlers,
  loadProtectedHashManifest,
  runCleanupPhases,
  runManagedCommand,
  runWithCleanup,
} from './playStoreDeterminismCore.mjs';

const execFileAsync = promisify(execFile);
const SCRIPT_DIR = import.meta.dirname
  ?? path.dirname(fileURLToPath(import.meta.url));
const ACTIVE_MOBILE_DIR = path.resolve(SCRIPT_DIR, '../..');
const ACTIVE_REPO_ROOT = path.resolve(ACTIVE_MOBILE_DIR, '..');
const CAMPAIGN_RELATIVE_PATH = 'docs/play-store/campaign.json';
const PROTECTED_MANIFEST_RELATIVE_PATH =
  'docs/play-store/protected-feature-hashes.json';
const LOCK_NAME = 'wordshift-play-store-determinism.lock';

async function execText(command, args, cwd) {
  const { stdout } = await execFileAsync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  return stdout;
}

async function resolveGitCommonDirectory(repoRoot) {
  const raw = (await execText(
    'git',
    ['rev-parse', '--git-common-dir'],
    repoRoot
  )).trim();
  return path.resolve(repoRoot, raw);
}

async function preflightActiveCheckout({
  repoRoot,
  mobileDir,
  signalCoordinator,
}) {
  const campaignPath = path.join(repoRoot, CAMPAIGN_RELATIVE_PATH);
  const manifestPath = path.join(
    repoRoot,
    PROTECTED_MANIFEST_RELATIVE_PATH
  );
  const campaign = validateCampaign(
    JSON.parse(await fs.readFile(campaignPath, 'utf8'))
  );
  const outputPaths = buildRequiredOutputPaths(campaign);
  const publicationPaths = [
    ...new Set([...outputPaths, ...PROTECTED_FEATURE_PATHS]),
  ];
  const dirtyTargets = [
    ...publicationPaths,
    CAMPAIGN_RELATIVE_PATH,
    PROTECTED_MANIFEST_RELATIVE_PATH,
  ];
  const protectedManifest = await loadProtectedHashManifest(manifestPath);

  const nodeModulesPath = path.join(mobileDir, 'node_modules');
  const nodeModulesStat = await fs.lstat(nodeModulesPath);
  if (!nodeModulesStat.isDirectory() || nodeModulesStat.isSymbolicLink()) {
    throw new Error(
      `Active node_modules must be a real directory: ${nodeModulesPath}`
    );
  }

  await execText('git', ['--version'], repoRoot);
  await execText('npm', ['--version'], mobileDir);
  await execText('git', ['worktree', 'list', '--porcelain'], repoRoot);
  await execText(
    'git',
    ['ls-files', '--error-unmatch', '--', ...dirtyTargets],
    repoRoot
  );
  const dirtyOutput = await execText(
    'git',
    [
      'status',
      '--porcelain=v1',
      '-z',
      '--untracked-files=all',
      '--',
      ...dirtyTargets,
    ],
    repoRoot
  );
  assertTargetAssetsClean(dirtyOutput);
  signalCoordinator.throwIfSignaled();

  const activeHashes = await hashPngFiles(repoRoot, publicationPaths);
  const activeProtected = activeHashes.filter(entry =>
    PROTECTED_FEATURE_PATHS.includes(entry.path)
  );
  assertProtectedHashes(
    protectedManifest,
    activeProtected,
    'active checkout'
  );

  return {
    campaign,
    outputPaths,
    publicationPaths,
    protectedManifest,
    activeHashes,
    nodeModulesPath,
  };
}

async function cleanupIsolatedWorkspace({
  repoRoot,
  temporaryRoot,
  isolatedRepoRoot,
  worktreeRegistered,
}) {
  const errors = [];
  let shouldRemoveWorktree = worktreeRegistered;
  if (isolatedRepoRoot && !shouldRemoveWorktree) {
    try {
      const worktrees = await execText(
        'git',
        ['worktree', 'list', '--porcelain'],
        repoRoot
      );
      shouldRemoveWorktree = worktrees
        .split('\n')
        .includes(`worktree ${isolatedRepoRoot}`);
    } catch (error) {
      errors.push(new Error(`inspect detached worktree: ${error.message}`, {
        cause: error,
      }));
    }
  }
  if (shouldRemoveWorktree) {
    try {
      await execText(
        'git',
        ['worktree', 'remove', '--force', isolatedRepoRoot],
        repoRoot
      );
    } catch (error) {
      errors.push(new Error(`detached worktree: ${error.message}`, {
        cause: error,
      }));
    }
  }
  try {
    if (temporaryRoot) {
      await fs.rm(temporaryRoot, { recursive: true, force: true });
    }
  } catch (error) {
    errors.push(new Error(`temporary directory: ${error.message}`, {
      cause: error,
    }));
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, 'Isolated workspace cleanup failed');
  }
}

async function hashAndValidateProtected({
  isolatedRepoRoot,
  protectedManifest,
  stage,
}) {
  const hashes = await hashPngFiles(
    isolatedRepoRoot,
    PROTECTED_FEATURE_PATHS
  );
  assertProtectedHashes(protectedManifest, hashes, stage);
  return hashes;
}

export async function verifyPlayStoreDeterminism({
  repoRoot = ACTIVE_REPO_ROOT,
  mobileDir = ACTIVE_MOBILE_DIR,
} = {}) {
  const signalCoordinator = new SignalCoordinator();
  const removeSignalHandlers = installSignalHandlers(signalCoordinator);
  let lock;
  try {
    const gitCommonDirectory = await resolveGitCommonDirectory(repoRoot);
    signalCoordinator.throwIfSignaled();
    lock = await acquireExclusiveLock(
      path.join(gitCommonDirectory, LOCK_NAME)
    );
  } catch (error) {
    removeSignalHandlers();
    throw error;
  }
  let temporaryRoot;
  let isolatedRepoRoot;
  let isolatedMobileDir;
  let worktreeRegistered = false;
  let preflight;

  const result = await runWithCleanup(
    async () => {
      signalCoordinator.throwIfSignaled();
      preflight = await preflightActiveCheckout({
        repoRoot,
        mobileDir,
        signalCoordinator,
      });

      temporaryRoot = await fs.mkdtemp(
        path.join(os.tmpdir(), 'wordshift-play-store-determinism-')
      );
      isolatedRepoRoot = path.join(temporaryRoot, 'checkout');
      await runManagedCommand({
        command: 'git',
        args: ['worktree', 'add', '--detach', isolatedRepoRoot, 'HEAD'],
        cwd: repoRoot,
        signalCoordinator,
      });
      worktreeRegistered = true;
      isolatedMobileDir = path.join(isolatedRepoRoot, 'mobile');
      await fs.symlink(
        preflight.nodeModulesPath,
        path.join(isolatedMobileDir, 'node_modules'),
        'dir'
      );
      signalCoordinator.throwIfSignaled();

      await hashAndValidateProtected({
        isolatedRepoRoot,
        protectedManifest: preflight.protectedManifest,
        stage: 'isolated checkout before generation',
      });

      const runHashes = [];
      for (let runNumber = 1; runNumber <= 2; runNumber += 1) {
        console.log(
          `[determinism] isolated complete generation run ${runNumber}/2`
        );
        await runManagedCommand({
          command: 'npm',
          args: ['run', 'generate:play-store'],
          cwd: isolatedMobileDir,
          signalCoordinator,
        });
        runHashes.push(await hashPngFiles(
          isolatedRepoRoot,
          preflight.outputPaths
        ));
        await hashAndValidateProtected({
          isolatedRepoRoot,
          protectedManifest: preflight.protectedManifest,
          stage: `isolated run ${runNumber}`,
        });
        signalCoordinator.throwIfSignaled();
      }

      compareHashManifests(runHashes[0], runHashes[1], {
        firstLabel: 'isolated run 1',
        secondLabel: 'isolated run 2',
      });
      const activeOutputs = preflight.activeHashes.filter(entry =>
        preflight.outputPaths.includes(entry.path)
      );
      compareHashManifests(activeOutputs, runHashes[1], {
        firstLabel: 'checked-in',
        secondLabel: 'generated',
      });
      signalCoordinator.throwIfSignaled();
      return {
        hashes: runHashes[1],
        protectedHashes: preflight.activeHashes.filter(entry =>
          PROTECTED_FEATURE_PATHS.includes(entry.path)
        ),
      };
    },
    [{
      name: 'verification resources',
      run: () => runCleanupPhases([
        [
          {
            name: 'active publication safety check',
            run: async () => {
              if (!preflight) return;
              const activeAfter = await hashPngFiles(
                repoRoot,
                preflight.publicationPaths
              );
              compareHashManifests(preflight.activeHashes, activeAfter, {
                firstLabel: 'active before',
                secondLabel: 'active after',
              });
            },
          },
          {
            name: 'isolated workspace',
            run: () => cleanupIsolatedWorkspace({
              repoRoot,
              temporaryRoot,
              isolatedRepoRoot,
              worktreeRegistered,
            }),
          },
        ],
        [
          {
            name: 'exclusive lock',
            run: () => lock.release(),
          },
          {
            name: 'signal handlers',
            run: async () => removeSignalHandlers(),
          },
        ],
      ]),
    }]
  );
  signalCoordinator.throwIfSignaled();
  return result;
}

async function main() {
  if (process.argv.length > 2) {
    throw new Error(
      'Usage: node scripts/tools/verifyPlayStoreDeterminism.mjs'
    );
  }
  const result = await verifyPlayStoreDeterminism();
  console.log(
    '[determinism] MATCH: isolated run 1, isolated run 2, and checked-in '
    + 'publication agree for all 17 encoded/decoded PNG hashes and file modes'
  );
  for (const hash of result.hashes) {
    console.log(
      `[determinism] ${hash.path}: encoded=${hash.encodedSha256} `
      + `decoded=${hash.decodedSha256} mode=0${hash.mode.toString(8)}`
    );
  }
  for (const feature of result.protectedHashes) {
    console.log(
      `[determinism] approved ${feature.path}: ${feature.encodedSha256}`
    );
  }
  console.log('[determinism] active checkout publication remained untouched');
}

const IS_MAIN = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (IS_MAIN) {
  main().catch(error => {
    const detail = error instanceof Error
      ? error.stack ?? error.message
      : String(error);
    console.error(`[determinism] ERROR\n${detail}`);
    process.exitCode = error instanceof SignalTerminationError
      ? error.exitCode
      : 1;
  });
}
