import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';
import { validateCampaign } from './capturePlayStoreHelpers.mjs';

export const PROTECTED_FEATURE_PATHS = Object.freeze([
  'docs/play-store/source/feature-background.png',
  'docs/play-store/final/feature-graphic.png',
  'docs/feature-graphic.png',
]);

const SIGNAL_EXIT_CODES = Object.freeze({
  SIGINT: 130,
  SIGTERM: 143,
});

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

export async function loadProtectedHashManifest(manifestPath) {
  let raw;
  try {
    raw = await fs.readFile(manifestPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Protected feature hash manifest missing: ${manifestPath}`);
    }
    throw error;
  }

  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Protected feature hash manifest is malformed JSON: ${error.message}`
    );
  }
  if (
    manifest?.schemaVersion !== 1
    || manifest?.algorithm !== 'sha256'
    || !manifest.files
    || typeof manifest.files !== 'object'
    || Array.isArray(manifest.files)
  ) {
    throw new Error(
      'Protected feature hash manifest must use schemaVersion 1 and SHA-256 files'
    );
  }

  const actualPaths = Object.keys(manifest.files).sort();
  const expectedPaths = [...PROTECTED_FEATURE_PATHS].sort();
  if (
    actualPaths.length !== expectedPaths.length
    || actualPaths.some((value, index) => value !== expectedPaths[index])
  ) {
    throw new Error(
      'Protected feature hash manifest must contain exactly: '
      + expectedPaths.join(', ')
    );
  }
  for (const relativePath of expectedPaths) {
    if (!/^[a-f0-9]{64}$/.test(manifest.files[relativePath])) {
      throw new Error(
        `${relativePath} must have a 64 lowercase hexadecimal SHA-256 hash`
      );
    }
  }
  return manifest.files;
}

export async function hashPngFiles(rootDirectory, relativePaths) {
  return Promise.all(relativePaths.map(async relativePath => {
    const filePath = path.join(rootDirectory, relativePath);
    const stat = await fs.lstat(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`${relativePath} must be a regular file`);
    }
    const encoded = await fs.readFile(filePath);
    let decoded;
    try {
      decoded = PNG.sync.read(encoded);
    } catch (error) {
      throw new Error(`${relativePath}: PNG decode failed: ${error.message}`);
    }
    return {
      path: relativePath,
      encodedSha256: sha256(encoded),
      decodedSha256: sha256(decoded.data),
      mode: stat.mode & 0o777,
    };
  }));
}

function formatMode(mode) {
  return `0${mode.toString(8).padStart(3, '0')}`;
}

export function compareHashManifests(
  first,
  second,
  { firstLabel = 'run 1', secondLabel = 'run 2' } = {}
) {
  const firstByPath = new Map(first.map(entry => [entry.path, entry]));
  const secondByPath = new Map(second.map(entry => [entry.path, entry]));
  const paths = [...new Set([...firstByPath.keys(), ...secondByPath.keys()])].sort();
  const diagnostics = [];

  for (const assetPath of paths) {
    const left = firstByPath.get(assetPath);
    const right = secondByPath.get(assetPath);
    if (!left || !right) {
      diagnostics.push(
        `${assetPath}: ${left ? `missing from ${secondLabel}` : `missing from ${firstLabel}`}`
      );
      continue;
    }
    if (left.encodedSha256 !== right.encodedSha256) {
      diagnostics.push(
        `${assetPath}: encoded SHA-256 ${firstLabel}=${left.encodedSha256}, `
        + `${secondLabel}=${right.encodedSha256}`
      );
    }
    if (left.decodedSha256 !== right.decodedSha256) {
      diagnostics.push(
        `${assetPath}: decoded RGBA SHA-256 ${firstLabel}=${left.decodedSha256}, `
        + `${secondLabel}=${right.decodedSha256}`
      );
    }
    if (left.mode !== right.mode) {
      diagnostics.push(
        `${assetPath}: file mode ${firstLabel}=${formatMode(left.mode)}, `
        + `${secondLabel}=${formatMode(right.mode)}`
      );
    }
  }

  if (diagnostics.length > 0) {
    throw new Error(`Play Store publication mismatch:\n- ${
      diagnostics.join('\n- ')
    }`);
  }
}

export function assertProtectedHashes(manifest, hashes, stage) {
  const hashesByPath = new Map(hashes.map(entry => [entry.path, entry]));
  const diagnostics = [];
  for (const relativePath of PROTECTED_FEATURE_PATHS) {
    const actual = hashesByPath.get(relativePath)?.encodedSha256;
    const approved = manifest[relativePath];
    if (actual !== approved) {
      diagnostics.push(
        `${relativePath}: approved=${approved}, ${stage}=${actual ?? 'missing'}`
      );
    }
  }
  if (diagnostics.length > 0) {
    throw new Error(`Protected feature hash mismatch:\n- ${
      diagnostics.join('\n- ')
    }`);
  }
}

export function assertTargetAssetsClean(gitStatusOutput) {
  if (!gitStatusOutput) return;
  const dirty = gitStatusOutput.split('\0').filter(Boolean);
  if (dirty.length > 0) {
    throw new Error(
      'Targeted Play Store assets are dirty; commit or restore them before '
      + `verification:\n- ${dirty.join('\n- ')}`
    );
  }
}

export async function acquireExclusiveLock(
  lockPath,
  { pid = process.pid } = {}
) {
  try {
    await fs.mkdir(lockPath, { mode: 0o700 });
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    let owner = 'unknown owner';
    try {
      const metadata = JSON.parse(
        await fs.readFile(path.join(lockPath, 'owner.json'), 'utf8')
      );
      owner = `PID ${metadata.pid}`;
    } catch {
      // A partially-created lock is still an active lock.
    }
    throw new Error(
      `Play Store determinism verification already running (${owner})`
    );
  }

  try {
    await fs.writeFile(
      path.join(lockPath, 'owner.json'),
      JSON.stringify({ pid, startedAt: new Date().toISOString() }),
      { mode: 0o600 }
    );
  } catch (error) {
    await fs.rm(lockPath, { recursive: true, force: true });
    throw error;
  }

  let released = false;
  return {
    path: lockPath,
    async release() {
      if (released) return;
      released = true;
      await fs.rm(lockPath, { recursive: true, force: true });
    },
  };
}

export async function runCleanupTasks(tasks) {
  const results = await Promise.allSettled(
    tasks.map(task => Promise.resolve().then(task.run))
  );
  const errors = results.flatMap((result, index) => {
    if (result.status === 'fulfilled') return [];
    const reasons = result.reason instanceof AggregateError
      ? result.reason.errors
      : [result.reason];
    return reasons.map(reason => new Error(
      `${tasks[index].name}: ${reason?.message ?? reason}`,
      { cause: reason }
    ));
  });
  if (errors.length > 0) {
    throw new AggregateError(errors, 'One or more cleanup targets failed');
  }
}

export async function runCleanupPhases(phases) {
  const errors = [];
  for (const tasks of phases) {
    try {
      await runCleanupTasks(tasks);
    } catch (error) {
      errors.push(...error.errors);
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, 'One or more cleanup phases failed');
  }
}

export async function runWithCleanup(operation, cleanupTasks) {
  let result;
  let operationError;
  try {
    result = await operation();
  } catch (error) {
    operationError = error;
  }

  let cleanupError;
  try {
    await runCleanupTasks(cleanupTasks);
  } catch (error) {
    cleanupError = error;
  }
  if (operationError && cleanupError) {
    throw new AggregateError(
      [operationError, ...cleanupError.errors],
      'Verification operation and cleanup failed'
    );
  }
  if (operationError) throw operationError;
  if (cleanupError) throw cleanupError;
  return result;
}

export class SignalTerminationError extends Error {
  constructor(signal) {
    super(`Verification interrupted by ${signal}`);
    this.name = 'SignalTerminationError';
    this.signal = signal;
    this.exitCode = SIGNAL_EXIT_CODES[signal] ?? 1;
  }
}

export class SignalCoordinator {
  constructor({ killProcessGroup = process.kill } = {}) {
    this.killProcessGroup = killProcessGroup;
    this.signal = null;
    this.activeChild = null;
    this.forwardedChild = null;
  }

  handleSignal(signal) {
    if (this.signal) return;
    this.signal = signal;
    this.#forwardIfNeeded();
  }

  setActiveChild(child) {
    this.activeChild = child;
    this.#forwardIfNeeded();
  }

  clearActiveChild(child) {
    if (this.activeChild === child) this.activeChild = null;
  }

  throwIfSignaled() {
    if (this.signal) throw new SignalTerminationError(this.signal);
  }

  #forwardIfNeeded() {
    if (
      !this.signal
      || !this.activeChild?.pid
      || this.forwardedChild === this.activeChild
    ) {
      return;
    }
    this.forwardedChild = this.activeChild;
    try {
      this.killProcessGroup(-this.activeChild.pid, this.signal);
    } catch (error) {
      this.forwardError = error;
    }
  }
}

export function installSignalHandlers(
  coordinator,
  processObject = process
) {
  const onSigint = () => coordinator.handleSignal('SIGINT');
  const onSigterm = () => coordinator.handleSignal('SIGTERM');
  processObject.on('SIGINT', onSigint);
  processObject.on('SIGTERM', onSigterm);
  return () => {
    processObject.off('SIGINT', onSigint);
    processObject.off('SIGTERM', onSigterm);
  };
}

export async function runManagedCommand({
  command,
  args,
  cwd,
  env = process.env,
  stdio = 'inherit',
  spawnProcess = spawn,
  signalCoordinator,
}) {
  signalCoordinator?.throwIfSignaled();
  const child = spawnProcess(command, args, {
    cwd,
    env,
    stdio,
    detached: process.platform !== 'win32',
  });
  signalCoordinator?.setActiveChild(child);

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = callback => value => {
      if (settled) return;
      settled = true;
      signalCoordinator?.clearActiveChild(child);
      callback(value);
    };
    child.once('error', settle(reject));
    child.once('exit', (code, signal) => {
      if (settled) return;
      settled = true;
      signalCoordinator?.clearActiveChild(child);
      if (signalCoordinator?.signal) {
        reject(new SignalTerminationError(signalCoordinator.signal));
      } else if (code === 0) {
        resolve({ code, signal });
      } else {
        reject(new Error(
          `${command} ${args.join(' ')} failed `
          + `(exit ${code ?? 'null'}, signal ${signal ?? 'none'})`
        ));
      }
    });
  });
}
