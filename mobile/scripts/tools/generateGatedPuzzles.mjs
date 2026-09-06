#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getGatedBankTarget } from './gatedBankTarget.mjs';

const [family, bank, ...extra] = process.argv.slice(2);
const target = getGatedBankTarget(family, bank);
if (!target || extra.length) {
  console.error('Usage: npm run generate:puzzles -- <standard|reverse|double> <EASY|MEDIUM|MEDIUM_PLUS|HARD|EXPERT|LEX_EASY|…>');
  console.error('Writes gated sidecars only. Review the report before replacing live banks. See CLAUDE.md.');
  process.exit(1);
}
const mobile = fileURLToPath(new URL('../..', import.meta.url));
console.log(`Gated sidecar: src/data/${target.sidecar}`);
const run = spawnSync('bash', [target.driver, ...target.driverArgs], { cwd: mobile, stdio: 'inherit', env: process.env });
if (run.error) console.error(`Unable to start gated driver: ${run.error.message}`);
if (run.status === 0) {
  console.log(`Review the generated report and sidecar before replacing src/data/${target.liveFile}.`);
  console.log('Choose the minimum accepted puzzle count from that review, then preview only this bank:');
  console.log(`node scripts/swapGatedBanks.mjs <minimum-count> ${family} ${bank} --dry-run`);
  console.log('After review, repeat that command without --dry-run; then run npm run audit:profanity and the vocabulary, route and bank tests.');
}
process.exit(run.status ?? 1);
