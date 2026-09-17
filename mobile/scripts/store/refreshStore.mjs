#!/usr/bin/env node
/** Run in a supported local capture environment. Never publishes store content. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (process.argv.includes('--help')) {
  console.log(`Usage: npm run store:refresh

Requires Node/npm, Playwright Chromium, Python 3, ffmpeg and ffprobe.
Exports the app, captures genuine UI and footage, renders a draft trailer,
and produces a clearly labelled review ZIP in mobile/store-output/.
The capture path has not been run in the authoring environment.

After visual review of timing, opener crop bounds and signed Android parity,
use store:trailer, store:build:refresh and store:package:refresh for final files.
This command never signs in, uploads to a store, merges, or publishes.`);
  process.exit(0);
}

const env = { ...process.env, EXPO_OFFLINE: '1', EXPO_NO_TELEMETRY: '1', EXPO_UNSTABLE_BONJOUR: '0', SENTRY_DISABLE_AUTO_UPLOAD: 'true' };
const run = (command, args) => {
  console.log(`\nRunning ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, { cwd: mobile, env, stdio: 'inherit', shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
const exportDirectory = path.join(mobile, 'store-output/web');
run(process.execPath, ['scripts/store/buildTrailer.mjs', '--check-tools']);
run(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['expo', 'export', '--platform', 'web', '--output-dir', exportDirectory]);
run(process.execPath, ['scripts/store/captureRefresh.mjs', '--export-dir', exportDirectory]);
run(process.execPath, ['scripts/store/buildTrailer.mjs', '--draft']);
run(process.execPath, ['scripts/store/buildRefresh.mjs', '--skip-missing']);
run(process.platform === 'win32' ? 'python' : 'python3', ['scripts/store/packageRefresh.py', '--partial']);
console.log('\nReview bundle prepared. Review the captures, trailer timing, crop bounds and Android match before final packaging.');
