#!/usr/bin/env node
/**
 * Installs the apex bank sidecars (EXPERT + the 15 Lexicon banks) into their
 * live src/data/*.ts files. These are NEW banks (no prior live file to back
 * up), so — unlike swapGatedBanks.mjs — this simply copies each finished
 * sidecar to its live path when it holds at least MIN_COUNT puzzles.
 *
 * Idempotent + partial-safe: a sidecar below MIN_COUNT (or absent) is skipped
 * and reported, so this can be re-run as generation completes.
 *
 * Usage: cd mobile && node scripts/installApexBanks.mjs [minCount]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
// Low floor: even a thin reverse-Lexicon bank (rare + reverse-solvable is the
// scarcest supply) must still produce a live file, since bankSolvability imports
// every bank by name. Recycling handles small banks at runtime.
const MIN_COUNT = Number(process.argv[2] ?? 8);

// [sidecar basename, live file, export name]. The apex modes' REVERSE combos
// (EXPERT+reverse, Lexicon+reverse) have no bank — they generate on-device — so
// only the standard + double banks are installed here (12 total).
const BANKS = [
  ['.gatedRegen_expert_output.ts', 'puzzleBankExpert.ts', 'PUZZLE_BANK_EXPERT'],
  ['.gatedRegenDouble_double_expert_output.ts', 'puzzleBankDoubleShiftExpert.ts', 'PUZZLE_BANK_DOUBLE_SHIFT_EXPERT'],
];
const DIFFS = [
  ['easy', 'Easy'], ['medium', 'Medium'], ['medium_plus', 'MediumPlus'], ['hard', 'Hard'], ['expert', 'Expert'],
];
for (const [key, Cap] of DIFFS) {
  BANKS.push([`.gatedRegen_lexicon_${key}_output.ts`, `lexiconBank${Cap}.ts`, `LEXICON_BANK_${key.toUpperCase()}`]);
  BANKS.push([`.gatedRegenDouble_lexicon_double_${key}_output.ts`, `lexiconBankDoubleShift${Cap}.ts`, `LEXICON_BANK_DOUBLE_${key.toUpperCase()}`]);
}

// The REVERSE apex banks were generated later (hours-long rare/reverse runs) and
// DO get pre-generated banks now — one EXPERT-reverse bank + the four larger
// Lexicon-reverse banks. `lexicon_reverse_expert` is deliberately absent: rare +
// reverse-solvable + 6-letter is the scarcest corner of the dictionary and it
// plateaued at ~1 puzzle, so that one combo stays on on-device generation (its
// sidecar falls under MIN_COUNT and is skipped automatically — no live file, no
// registry entry). EXPERT-reverse (fair) reached a usable bank.
BANKS.push(['.gatedRegenReverse_reverse_expert_output.ts', 'puzzleBankReverseExpert.ts', 'PUZZLE_BANK_REVERSE_EXPERT']);
for (const [key, Cap] of DIFFS) {
  BANKS.push([`.gatedRegenReverse_lexicon_reverse_${key}_output.ts`, `lexiconBankReverse${Cap}.ts`, `LEXICON_BANK_REVERSE_${key.toUpperCase()}`]);
}

const countPuzzles = (content) => (content.match(/\{id:'/g) ?? []).length;

let installed = 0, skipped = 0, failed = 0;
for (const [sidecar, liveFile, exportName] of BANKS) {
  const sidecarPath = path.join(DATA_DIR, sidecar);
  const livePath = path.join(DATA_DIR, liveFile);
  if (!fs.existsSync(sidecarPath)) {
    console.log(`SKIP  ${liveFile.padEnd(38)} no sidecar yet`);
    skipped++;
    continue;
  }
  const content = fs.readFileSync(sidecarPath, 'utf-8');
  const count = countPuzzles(content);
  if (count < MIN_COUNT) {
    console.log(`SKIP  ${liveFile.padEnd(38)} only ${count} puzzles (< ${MIN_COUNT})`);
    skipped++;
    continue;
  }
  if (!content.includes(`export const ${exportName}`)) {
    console.error(`FAIL  ${liveFile.padEnd(38)} sidecar missing export ${exportName}`);
    failed++;
    continue;
  }
  const tmp = livePath + '.install.tmp';
  fs.writeFileSync(tmp, content, 'utf-8');
  fs.renameSync(tmp, livePath);
  console.log(`OK    ${liveFile.padEnd(38)} ${count} puzzles`);
  installed++;
}
console.log(`\nInstalled ${installed}, skipped ${skipped}, failed ${failed} (of ${BANKS.length}).`);
process.exit(failed > 0 ? 1 : 0);
