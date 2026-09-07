#!/usr/bin/env node
/** Reseed one gated checkpoint from its fresh-qualified live bank; never edits a live bank. */
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { getGatedBankTarget } from './gatedBankTarget.mjs';
const [family, selection, ...flags] = process.argv.slice(2);
const write = flags.includes('--write');
const bankDirectoryArg = flags.find(flag => flag.startsWith('--bank-directory='));
const target = getGatedBankTarget(family, selection);
if (!target || flags.some(flag => flag !== '--write' && !flag.startsWith('--bank-directory='))) {
  console.error('Usage: node scripts/tools/prepareGatedTopUp.mjs <standard|reverse|double> <EASY|...|LEX_EXPERT> [--write] [--bank-directory=<staged-banks>]');
  process.exit(1);
}
const root = fileURLToPath(new URL('../..', import.meta.url));
const bankDirectory = bankDirectoryArg ? path.resolve(bankDirectoryArg.slice('--bank-directory='.length)) : path.join(root, 'src/data');
const require = createRequire(import.meta.url);
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  if (/\/src\/(dictionary\.ts|data\/vocabulary\/puzzleVocabulary\.ts)$/.test(filename)) {
    module._compile(source.replace(/export const (\w+)(?:\s*:[^=]+)?\s*=/g, 'exports.$1 =').replace(/new Set<string>/g, 'new Set'), filename);
  } else {
    module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
  }
};
const { qualifyFreshBankPuzzle } = require(path.join(root, 'src/services/bankDeliveryPolicy.ts'));
const { hasBlockedDoubleShiftIntermediate } = require(path.join(root, 'src/services/puzzleContentPolicy.ts'));
const { DICTIONARY_WORDS } = require(path.join(root, 'src/dictionary.ts'));
const { EXCLUDED_PUZZLE_WORDS } = require(path.join(root, 'src/data/vocabulary/puzzleVocabulary.ts'));
const { analyzeStandardBranching } = require(path.join(root, 'src/services/puzzleBranching.ts'));
const { isChainSolvable } = require(path.join(root, 'src/services/puzzleSolvability.ts'));
const { GATED_POLICY_HASH } = require(path.join(root, 'scripts/gatedCheckpoint.ts'));
const fresh = new Set(DICTIONARY_WORDS.filter(word => !EXCLUDED_PUZZLE_WORDS.has(word)));
const valid = word => fresh.has(word.toUpperCase());
const source = fs.readFileSync(path.join(bankDirectory, target.liveFile), 'utf8');
const bank = vm.runInNewContext(source.slice(source.indexOf('= [') + 2, source.lastIndexOf('];') + 1), {}, { timeout: 10_000 });
const variant = family === 'double' ? 'double_shift' : family;
const advanced = /LEX_|EXPERT/.test(selection);
const puzzles = [];
let trapAccepts = 0;
const seen = new Set();
for (const original of bank) {
  const puzzle = qualifyFreshBankPuzzle(original, advanced, variant, valid);
  if (!puzzle || hasBlockedDoubleShiftIntermediate(puzzle) || seen.has(puzzle.words.join('-'))) continue;
  if (isChainSolvable(variant, puzzle.words, valid) !== 'solvable') throw new Error(`Unsolvable live seed ${puzzle.id}`);
  if (variant === 'standard') {
    const metrics = analyzeStandardBranching(puzzle.words, valid);
    if (metrics.completePathCount < 2) throw new Error(`Single-route live seed ${puzzle.id}`);
    if (metrics.trapStepFraction > 0) trapAccepts++;
  }
  seen.add(puzzle.words.join('-'));
  puzzles.push(puzzle);
}
// Original attempt phases are not present in authored records. Use the actual
// dread tier for seeding; the remaining generation distributes new candidates.
const phaseCounts = {};
for (const puzzle of puzzles) {
  const phase = Math.max(0, Math.min(4, puzzle.dreadTier ?? 0));
  phaseCounts[phase] = (phaseCounts[phase] ?? 0) + 1;
}
const checkpoint = target.sidecar.replace('_output.ts', '_progress.json');
const dest = path.join(root, 'src/data', checkpoint);
const result = { vocabularyPolicyHash: GATED_POLICY_HASH, phaseCounts, phaseAttempts: {}, trapAccepts, puzzles };
console.log(JSON.stringify({ bank: target.liveFile, sourceDirectory: bankDirectory, historical: bank.length, eligibleSeeds: puzzles.length, checkpoint, policyHash: GATED_POLICY_HASH, write }));
if (write) {
  if (fs.existsSync(dest)) fs.copyFileSync(dest, `${dest}.before-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.bak`);
  fs.writeFileSync(dest + '.tmp', JSON.stringify(result));
  fs.renameSync(dest + '.tmp', dest);
}
