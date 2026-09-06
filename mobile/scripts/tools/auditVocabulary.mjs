#!/usr/bin/env node
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
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
const { DICTIONARY_WORDS } = require(path.join(root, 'src/dictionary.ts'));
const { UNREVIEWED_PUZZLE_WORDS } = require(path.join(root, 'src/data/vocabulary/puzzleVocabulary.ts'));
const freshWords = new Set(DICTIONARY_WORDS.filter(word => !UNREVIEWED_PUZZLE_WORDS.has(word)));
const auditRoutes = process.argv.includes('--branching');
const { analyzeStandardBranching } = auditRoutes ? require(path.join(root, 'src/services/puzzleBranching.ts')) : {};
const { isChainSolvable } = auditRoutes ? require(path.join(root, 'src/services/puzzleSolvability.ts')) : {};
const report = [];
const withheld = new Map();
const routeFailures = [];
for (const file of fs.readdirSync(path.join(root, 'src/data')).filter(name => /Bank.*\.ts$/.test(name) && name !== 'puzzleBankTypes.ts')) {
  const source = fs.readFileSync(path.join(root, 'src/data', file), 'utf8');
  const start = source.indexOf('= [') + 2;
  const end = source.lastIndexOf('];') + 1;
  if (start < 2 || end <= start) throw new Error(`Unknown bank serialization: ${file}`);
  const bank = vm.runInNewContext(source.slice(start, end), {}, { timeout: 10_000 });
  const advanced = /lexicon|Expert/.test(file);
  const variant = file.includes('Reverse') ? 'reverse' : file.includes('DoubleShift') ? 'double_shift' : 'standard';
  const eligible = bank.map(puzzle => qualifyFreshBankPuzzle(puzzle, advanced, variant, word => freshWords.has(word))).filter(Boolean);
  let maxExploredStates = 0;
  if (auditRoutes) for (const puzzle of eligible) {
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
  report.push({ file, total: bank.length, eligible: eligible.length, advanced,
    ...(auditRoutes ? { variant, maxExploredStates, routeFailures: routeFailures.filter(item => item.file === file).length } : {}),
  });
}
const result = { dictionaryAuditDate: '2026-09-05', banks: report,
  total: report.reduce((sum, row) => sum + row.total, 0),
  eligible: report.reduce((sum, row) => sum + row.eligible, 0),
  withheldRequiredWords: [...withheld].sort((a, b) => b[1] - a[1]),
  ...(auditRoutes ? { routeAudit: { standardMinimumCompletePaths: 2, reverseAndDoubleContract: 'shipped-rule solvability', routeFailures } } : {}),
};
const outputPath = process.argv.slice(2).find(argument => !argument.startsWith('--'));
if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ total: result.total, eligible: result.eligible, banks: report }, null, 2));
if (report.some(row => row.eligible < 15) || routeFailures.length) process.exitCode = 1;
