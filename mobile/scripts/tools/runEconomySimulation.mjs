/** Regenerate the economy model with the same production services as Jest. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const mobile = fileURLToPath(new URL('../..', import.meta.url));
const config = process.env.WORDSHIFT_JEST_CONFIG;
const result = spawnSync('npm', ['test', '--', '--no-coverage', '--runInBand',
  '--testPathPattern=economyJourneySimulation.test.ts', ...(config ? ['--config', config] : [])], {
  cwd: mobile,
  stdio: 'inherit',
  env: { ...process.env, WORDSHIFT_ECONOMY_REPORT: resolve(mobile, '../docs/reports/ECONOMY_JOURNEYS_2026-09-05') },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
