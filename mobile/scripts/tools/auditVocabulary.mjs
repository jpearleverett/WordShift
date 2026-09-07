#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const bankDirectoryArg = process.argv.find(argument => argument.startsWith('--bank-directory='));
const bankDirectory = bankDirectoryArg ? path.resolve(bankDirectoryArg.slice('--bank-directory='.length)) : path.join(root, 'src/data');
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  // These generated exports are plain data. Avoid constructing TypeScript
  // syntax trees for tens of thousands of literals in a low-memory audit.
  if (/\/src\/(dictionary\.ts|data\/vocabulary\/puzzleVocabulary\.ts)$/.test(filename)) {
    module._compile(source.replace(/export const (\w+)(?:\s*:[^=]+)?\s*=/g, 'exports.$1 =').replace(/new Set<string>/g, 'new Set'), filename);
  } else {
    module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
  }
};
const { getRequiredPuzzleWords, isFairPuzzleWord } = require(path.join(root, 'src/services/puzzleVocabulary.ts'));
const { qualifyFreshBankPuzzle } = require(path.join(root, 'src/services/bankDeliveryPolicy.ts'));
const { hasBlockedDoubleShiftIntermediate } = require(path.join(root, 'src/services/puzzleContentPolicy.ts'));
const { isUnbrokenWeaveEligible } = require(path.join(root, 'src/services/unbrokenWeave.ts'));
const { DICTIONARY_WORDS } = require(path.join(root, 'src/dictionary.ts'));
const { EXCLUDED_PUZZLE_WORDS } = require(path.join(root, 'src/data/vocabulary/puzzleVocabulary.ts'));
const freshWords = new Set(DICTIONARY_WORDS.filter(word => !EXCLUDED_PUZZLE_WORDS.has(word)));
const auditRoutes = process.argv.includes('--branching');
const minimumArg = process.argv.find(argument => argument.startsWith('--minimum-eligible='));
const minimumEligible = minimumArg ? Number(minimumArg.split('=')[1]) : 0;
if (!Number.isInteger(minimumEligible) || minimumEligible < 0) throw new Error('Invalid --minimum-eligible');
const { analyzeStandardBranching } = auditRoutes ? require(path.join(root, 'src/services/puzzleBranching.ts')) : {};
const { isChainSolvable } = auditRoutes ? require(path.join(root, 'src/services/puzzleSolvability.ts')) : {};
function measureDiversity(bank) {
  const wordUsage = new Map(), starts = new Map(), firstMoves = new Map(), dreadTiers = new Map();
  let qualityTotal = 0;
  let sMoves = 0, totalMoves = 0;
  for (const puzzle of bank) {
    const tier = puzzle.dreadTier ?? 0;
    dreadTiers.set(tier, (dreadTiers.get(tier) ?? 0) + 1);
    qualityTotal += puzzle.qualityScore ?? 0;
    const authoredWords = new Set(puzzle.words);
    for (const step of [...puzzle.solution, ...(puzzle.reverseSolution ?? [])]) {
      authoredWords.add(step.sourceWord); authoredWords.add(step.targetWord);
      const formed = /form ([A-Z]+)/.exec(step.explanation ?? '')?.[1];
      if (formed) authoredWords.add(formed);
    }
    for (const word of authoredWords) wordUsage.set(word, (wordUsage.get(word) ?? 0) + 1);
    const start = puzzle.words[0][0];
    starts.set(start, (starts.get(start) ?? 0) + 1);
    const first = puzzle.solution[0]?.letterToMove;
    if (first) firstMoves.set(first, (firstMoves.get(first) ?? 0) + 1);
    for (const step of puzzle.solution) { totalMoves++; if (step.letterToMove === 'S') sMoves++; }
  }
  return {
    uniqueAuthoredWords: wordUsage.size,
    meanQualityScore: bank.length ? qualityTotal / bank.length : 0,
    dreadTierCounts: Object.fromEntries([...dreadTiers].sort(([a], [b]) => a - b)),
    maximumWordUses: Math.max(0, ...wordUsage.values()),
    maximumStartingLetterShare: bank.length ? Math.max(0, ...starts.values()) / bank.length : 0,
    maximumFirstMovedLetterShare: bank.length ? Math.max(0, ...firstMoves.values()) / bank.length : 0,
    sMoveShare: totalMoves ? sMoves / totalMoves : 0,
  };
}
const report = [];
const withheld = new Map();
const routeFailures = [];
const chainLocations = new Map();
for (const file of fs.readdirSync(bankDirectory).filter(name => /Bank.*\.ts$/.test(name) && name !== 'puzzleBankTypes.ts')) {
  const source = fs.readFileSync(path.join(bankDirectory, file), 'utf8');
  const start = source.indexOf('= [') + 2;
  const end = source.lastIndexOf('];') + 1;
  if (start < 2 || end <= start) throw new Error(`Unknown bank serialization: ${file}`);
  const bank = vm.runInNewContext(source.slice(start, end), {}, { timeout: 10_000 });
  const advanced = /lexicon|Expert/.test(file);
  const variant = file.includes('Reverse') ? 'reverse' : file.includes('DoubleShift') ? 'double_shift' : 'standard';
  const eligible = bank.map(puzzle => qualifyFreshBankPuzzle(puzzle, advanced, variant, word => freshWords.has(word))).filter(Boolean);
  for (const puzzle of eligible) {
    const key = puzzle.words.join('-');
    const locations = chainLocations.get(key) ?? [];
    locations.push({ file, id: puzzle.id });
    chainLocations.set(key, locations);
  }
  let maxExploredStates = 0;
  if (auditRoutes) for (const puzzle of eligible) {
    if (hasBlockedDoubleShiftIntermediate(puzzle)) routeFailures.push({ file, id: puzzle.id, reason: 'blocked_double_intermediate' });
    if (variant === 'standard') {
      const metrics = analyzeStandardBranching(puzzle.words, word => freshWords.has(word));
      maxExploredStates = Math.max(maxExploredStates, metrics.stateCount);
      if (metrics.completePathCount < 2) routeFailures.push({ file, id: puzzle.id, words: puzzle.words, completePathCount: metrics.completePathCount, stateCount: metrics.stateCount });
    } else {
      const result = isChainSolvable(variant, puzzle.words, word => freshWords.has(word));
      if (result !== 'solvable') routeFailures.push({ file, id: puzzle.id, words: puzzle.words, result });
    }
  }
  for (const puzzle of bank) for (const word of getRequiredPuzzleWords(puzzle)) {
    if (!isFairPuzzleWord(word, advanced)) withheld.set(word, (withheld.get(word) ?? 0) + 1);
  }
  report.push({ file, total: bank.length, eligible: eligible.length, advanced, diversity: measureDiversity(eligible),
    ...(variant === 'standard' ? { unbrokenWeaveEligible: eligible.filter(puzzle => isUnbrokenWeaveEligible(puzzle.solution)).length } : {}),
    ...(auditRoutes ? { variant, maxExploredStates, routeFailures: routeFailures.filter(item => item.file === file).length } : {}),
  });
}
const result = { dictionaryAuditDate: '2026-09-06', banks: report,
  total: report.reduce((sum, row) => sum + row.total, 0),
  eligible: report.reduce((sum, row) => sum + row.eligible, 0),
  withheldRequiredWords: [...withheld].sort((a, b) => b[1] - a[1]),
  duplicateChains: [...chainLocations].filter(([, locations]) => locations.length > 1).map(([chain, locations]) => ({ chain, locations })),
  ...(auditRoutes ? { routeAudit: { standardMinimumCompletePaths: 2, reverseAndDoubleContract: 'shipped-rule solvability', routeFailures } } : {}),
};
const outputPath = process.argv.slice(2).find(argument => !argument.startsWith('--'));
if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ total: result.total, eligible: result.eligible, banks: report }, null, 2));
if (report.length !== 30 || report.some(row => row.eligible < 15) || routeFailures.length || result.duplicateChains.length) process.exitCode = 1;
if (report.length !== 30) console.error(`Expected all 30 bank families, found ${report.length}`);
if (result.duplicateChains.length) console.error(`Duplicate delivered chains: ${result.duplicateChains.length}`);

if (minimumEligible > 0) {
  const undersized = report.filter(bank => bank.eligible < minimumEligible);
  if (undersized.length) {
    console.error(`Eligible bank capacity below ${minimumEligible}: ${undersized.map(bank => `${bank.file}=${bank.eligible}`).join(', ')}`);
    process.exitCode = 1;
  }
}
