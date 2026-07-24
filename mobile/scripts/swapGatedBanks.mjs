#!/usr/bin/env node
/**
 * Swaps completed gated-regeneration sidecars over the live standard banks.
 *
 * For each bank whose sidecar (src/data/.gatedRegen_<bank>_output.ts) exists
 * and holds at least the threshold number of puzzles (arg 1, default 400):
 *   1. backs up the live src/data/puzzleBank<Bank>.ts to
 *      src/data/.pre_gated_<bank>.ts.bak,
 *   2. atomically replaces the live file with the sidecar content
 *      (write tmp + rename), and
 *   3. prints per-bank before/after puzzle counts.
 * A sidecar below the threshold is refused (the live bank is left untouched).
 *
 * Usage: cd mobile && node scripts/swapGatedBanks.mjs [threshold]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

const rawThreshold = process.argv[2];
const THRESHOLD = rawThreshold === undefined ? 400 : Number(rawThreshold);
if (!Number.isFinite(THRESHOLD) || THRESHOLD < 0) {
  console.error(`Invalid threshold '${rawThreshold}' (expected a non-negative number)`);
  process.exit(1);
}

// `sidecar` is the dot-prefixed sidecar basename each generator writes; standard
// banks use .gatedRegen_<key>_output.ts, reverse banks .gatedRegenReverse_<key>_output.ts.
// A bank whose sidecar does not exist is simply skipped, so this one script
// swaps whichever banks have a finished sidecar (standard and/or reverse).
const BANKS = [
  { bank: 'EASY', key: 'easy', liveFile: 'puzzleBankEasy.ts', exportName: 'PUZZLE_BANK_EASY', sidecar: '.gatedRegen_easy_output.ts' },
  { bank: 'MEDIUM', key: 'medium', liveFile: 'puzzleBankMedium.ts', exportName: 'PUZZLE_BANK_MEDIUM', sidecar: '.gatedRegen_medium_output.ts' },
  { bank: 'MEDIUM_PLUS', key: 'medium_plus', liveFile: 'puzzleBankMediumPlus.ts', exportName: 'PUZZLE_BANK_MEDIUM_PLUS', sidecar: '.gatedRegen_medium_plus_output.ts' },
  { bank: 'HARD', key: 'hard', liveFile: 'puzzleBankHard.ts', exportName: 'PUZZLE_BANK_HARD', sidecar: '.gatedRegen_hard_output.ts' },
  { bank: 'REVERSE_EASY', key: 'reverse_easy', liveFile: 'puzzleBankReverseEasy.ts', exportName: 'PUZZLE_BANK_REVERSE_EASY', sidecar: '.gatedRegenReverse_reverse_easy_output.ts' },
  { bank: 'REVERSE_MEDIUM', key: 'reverse_medium', liveFile: 'puzzleBankReverseMedium.ts', exportName: 'PUZZLE_BANK_REVERSE_MEDIUM', sidecar: '.gatedRegenReverse_reverse_medium_output.ts' },
  { bank: 'REVERSE_MEDIUM_PLUS', key: 'reverse_medium_plus', liveFile: 'puzzleBankReverseMediumPlus.ts', exportName: 'PUZZLE_BANK_REVERSE_MEDIUM_PLUS', sidecar: '.gatedRegenReverse_reverse_medium_plus_output.ts' },
  { bank: 'REVERSE_HARD', key: 'reverse_hard', liveFile: 'puzzleBankReverseHard.ts', exportName: 'PUZZLE_BANK_REVERSE_HARD', sidecar: '.gatedRegenReverse_reverse_hard_output.ts' },
  { bank: 'DOUBLE_EASY', key: 'double_easy', liveFile: 'puzzleBankDoubleShiftEasy.ts', exportName: 'PUZZLE_BANK_DOUBLE_SHIFT_EASY', sidecar: '.gatedRegenDouble_double_easy_output.ts' },
  { bank: 'DOUBLE_MEDIUM', key: 'double_medium', liveFile: 'puzzleBankDoubleShiftMedium.ts', exportName: 'PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM', sidecar: '.gatedRegenDouble_double_medium_output.ts' },
  { bank: 'DOUBLE_MEDIUM_PLUS', key: 'double_medium_plus', liveFile: 'puzzleBankDoubleShiftMediumPlus.ts', exportName: 'PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM_PLUS', sidecar: '.gatedRegenDouble_double_medium_plus_output.ts' },
  { bank: 'DOUBLE_HARD', key: 'double_hard', liveFile: 'puzzleBankDoubleShiftHard.ts', exportName: 'PUZZLE_BANK_DOUBLE_SHIFT_HARD', sidecar: '.gatedRegenDouble_double_hard_output.ts' },
];

/** Count serialized puzzles by their id fields (robust to header drift). */
function countPuzzles(content) {
  return (content.match(/\{id:'/g) ?? []).length;
}

let swapped = 0;
let refused = 0;
let skipped = 0;
let failed = 0;

for (const { bank, key, liveFile, exportName, sidecar } of BANKS) {
  const sidecarPath = path.join(DATA_DIR, sidecar);
  const livePath = path.join(DATA_DIR, liveFile);
  const backupPath = path.join(DATA_DIR, `.pre_gated_${key}.ts.bak`);

  if (!fs.existsSync(sidecarPath)) {
    console.log(`${bank}: no sidecar (${path.basename(sidecarPath)}), skipped`);
    skipped++;
    continue;
  }

  const sidecarContent = fs.readFileSync(sidecarPath, 'utf-8');
  const sidecarCount = countPuzzles(sidecarContent);

  if (!fs.existsSync(livePath)) {
    console.error(`${bank}: live file ${liveFile} missing, refusing to swap`);
    failed++;
    continue;
  }
  const liveContent = fs.readFileSync(livePath, 'utf-8');
  const liveCount = countPuzzles(liveContent);

  if (sidecarCount < THRESHOLD) {
    console.log(`${bank}: REFUSED — sidecar holds ${sidecarCount} puzzles, below threshold ${THRESHOLD} (live ${liveFile} keeps ${liveCount})`);
    refused++;
    continue;
  }

  // Structural guards: the sidecar must be a drop-in replacement.
  if (!sidecarContent.includes(`export const ${exportName}`)) {
    console.error(`${bank}: REFUSED — sidecar does not export ${exportName}`);
    failed++;
    continue;
  }
  const liveHasTypeReExport = liveContent.includes(`export type { PreGeneratedPuzzle }`);
  const sidecarHasTypeReExport = sidecarContent.includes(`export type { PreGeneratedPuzzle }`);
  if (liveHasTypeReExport && !sidecarHasTypeReExport) {
    console.error(`${bank}: REFUSED — live ${liveFile} re-exports PreGeneratedPuzzle but the sidecar does not`);
    failed++;
    continue;
  }

  // 1. Back up the live bank.
  fs.copyFileSync(livePath, backupPath);
  // 2. Atomic replace: write tmp in the same directory, then rename over live.
  const tmpPath = livePath + '.gatedswap.tmp';
  fs.writeFileSync(tmpPath, sidecarContent, 'utf-8');
  fs.renameSync(tmpPath, livePath);

  console.log(`${bank}: swapped ${liveFile} — before ${liveCount} puzzles, after ${sidecarCount} puzzles (backup: ${path.basename(backupPath)})`);
  swapped++;
}

console.log(`\nSwap complete: ${swapped} swapped, ${refused} refused (below threshold ${THRESHOLD}), ${skipped} skipped (no sidecar), ${failed} failed guards`);
process.exit(failed > 0 ? 1 : 0);
