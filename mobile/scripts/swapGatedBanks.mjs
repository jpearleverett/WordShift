#!/usr/bin/env node
/**
 * Swaps reviewed gated sidecars over existing live banks with backups.
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
 * Legacy usage: node scripts/swapGatedBanks.mjs [threshold] [--dry-run]
 *   Scans the original 12 core banks only.
 * Targeted usage: node scripts/swapGatedBanks.mjs <threshold> <standard|reverse|double> <EASY|...|LEX_EXPERT> [--dry-run]
 *   Selects exactly one of all 30 banks, including Expert and Lexicon.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGatedBankTarget } from './tools/gatedBankTarget.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

const dryRun = process.argv.slice(2).includes('--dry-run');
const args = process.argv.slice(2).filter(argument => argument !== '--dry-run');
const [rawThreshold, family, selection] = args;
const THRESHOLD = rawThreshold === undefined ? 400 : Number(rawThreshold);
if (!Number.isInteger(THRESHOLD) || THRESHOLD < 1) {
  console.error(`Invalid threshold '${rawThreshold}' (expected a positive integer)`);
  process.exit(1);
}
const selectedTarget = family === undefined ? null : getGatedBankTarget(family, selection);
if (![0, 1, 3].includes(args.length) || (family !== undefined && !selectedTarget)) {
  console.error('Usage: node scripts/swapGatedBanks.mjs [threshold] [standard|reverse|double EASY|...|LEX_EXPERT] [--dry-run]');
  process.exit(1);
}

// `sidecar` is the dot-prefixed sidecar basename each generator writes; standard
// banks use .gatedRegen_<key>_output.ts, reverse banks .gatedRegenReverse_<key>_output.ts.
// A bank whose sidecar does not exist is simply skipped, so this one script
// swaps whichever banks have a finished sidecar (standard and/or reverse).
const BANKS = selectedTarget ? [selectedTarget] : ['standard', 'reverse', 'double'].flatMap(kind =>
  ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'].map(difficulty => getGatedBankTarget(kind, difficulty)));

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

  if (dryRun) {
    console.log(`${bank}: DRY RUN — would replace ${liveFile}, ${liveCount} → ${sidecarCount} puzzles; backup ${path.basename(backupPath)}`);
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
process.exit(failed > 0 || (selectedTarget && (refused > 0 || skipped > 0)) ? 1 : 0);
