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

const BANKS = [
  { bank: 'EASY', key: 'easy', liveFile: 'puzzleBankEasy.ts', exportName: 'PUZZLE_BANK_EASY' },
  { bank: 'MEDIUM', key: 'medium', liveFile: 'puzzleBankMedium.ts', exportName: 'PUZZLE_BANK_MEDIUM' },
  { bank: 'MEDIUM_PLUS', key: 'medium_plus', liveFile: 'puzzleBankMediumPlus.ts', exportName: 'PUZZLE_BANK_MEDIUM_PLUS' },
  { bank: 'HARD', key: 'hard', liveFile: 'puzzleBankHard.ts', exportName: 'PUZZLE_BANK_HARD' },
];

/** Count serialized puzzles by their id fields (robust to header drift). */
function countPuzzles(content) {
  return (content.match(/\{id:'/g) ?? []).length;
}

let swapped = 0;
let refused = 0;
let skipped = 0;
let failed = 0;

for (const { bank, key, liveFile, exportName } of BANKS) {
  const sidecarPath = path.join(DATA_DIR, `.gatedRegen_${key}_output.ts`);
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
