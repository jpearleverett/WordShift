/**
 * One command for the refresh-2026-09 trailer ("Such a Lovely House"):
 * records the real gameplay clips, edits and encodes both cuts, then installs
 * them into assets/Play_store/refresh-2026-09/video/.
 *
 *   node scripts/store/buildTrailer.mjs                 # record every clip, edit, install
 *   node scripts/store/buildTrailer.mjs --edit-only     # re-edit from the clips already recorded
 *   node scripts/store/buildTrailer.mjs K1 K8           # re-record these clips, then edit
 *
 * The steps are scripts/store/refresh/trailer2/record.mjs, edit.mjs and
 * install.mjs (brief section 6). The app must already be running on
 * http://localhost:8081; nothing here starts or stops it. Frames live in
 * $TRAILER2_WORK (default <os tmpdir>/wordshift-trailer2); give it about 3 GB.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const editOnly = args.includes('--edit-only');
const clips = args.filter(a => !a.startsWith('-'));
const run = (script, extra) => {
  const r = spawnSync(process.execPath, [path.join(here, 'refresh/trailer2', script), ...extra], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
if (!editOnly) run('record.mjs', clips);
run('edit.mjs', []);
run('install.mjs', []);
