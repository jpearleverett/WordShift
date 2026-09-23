/**
 * One command for the refresh-2026-09 trailer: records the real gameplay
 * clips, then edits and encodes both cuts.
 *
 *   node scripts/store/buildTrailer.mjs                 # record every clip, then edit
 *   node scripts/store/buildTrailer.mjs --edit-only     # re-edit from the clips already recorded
 *   node scripts/store/buildTrailer.mjs R8 R9           # re-record these clips, then edit
 *
 * The two steps are scripts/store/refresh/recordTrailer.mjs and
 * scripts/store/refresh/editTrailer.mjs (brief section 2, "Scripts"). The app
 * must already be running on http://localhost:8081; nothing here starts or
 * stops it. Frames live in $TRAILER_WORK (default <os tmpdir>/wordshift-trailer).
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const editOnly = args.includes('--edit-only');
const clips = args.filter(a => !a.startsWith('-'));
const run = (script, extra) => {
  const r = spawnSync(process.execPath, [path.join(here, 'refresh', script), ...extra], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
if (!editOnly) run('recordTrailer.mjs', clips);
run('editTrailer.mjs', []);
