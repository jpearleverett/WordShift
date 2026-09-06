#!/usr/bin/env node
// Full fresh-delivery route, stored-solution and reverse-hint audit.
// Generated dictionaries/banks are evaluated as data to keep memory below 200 MB.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ts = require(root + '/node_modules/typescript');
const dict = Function('return ' + fs.readFileSync(root + '/src/dictionary.ts', 'utf8').split('=')[1].trim().replace(/;$/, ''))();
const vocabularySource = fs.readFileSync(root + '/src/data/vocabulary/puzzleVocabulary.ts', 'utf8');
const vocabulary = Function(vocabularySource.replace(/export const /g, 'const ').replace(/new Set<string>/g, 'new Set') + '\nreturn {AUDITED_PUZZLE_WORDS,UNREVIEWED_PUZZLE_WORDS,ADVANCED_PUZZLE_WORDS,OBSCURE_PUZZLE_WORDS};')();
const historical = new Set(dict);
const fresh = new Set(dict.filter(word => !vocabulary.UNREVIEWED_PUZZLE_WORDS.has(word)));
const moduleCache = new Map();
function compile(file) {
  if (moduleCache.has(file)) return moduleCache.get(file);
  const exports = {};
  moduleCache.set(file, exports);
  const source = ts.transpileModule(fs.readFileSync(root + '/src/services/' + file + '.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  Function('exports', 'require', source)(exports, id => {
    if (id.endsWith('/dictionary')) return { DICTIONARY_WORDS: dict };
    if (id.endsWith('/vocabulary/puzzleVocabulary')) return vocabulary;
    if (id.startsWith('./')) return compile(id.slice(2));
    throw Error('Unexpected dependency ' + id);
  });
  return exports;
}
const { isPuzzleVocabularyFair, getRequiredPuzzleWords } = compile('puzzleVocabulary');
const { analyzeStandardBranching } = compile('puzzleBranching');
const { isChainSolvable } = compile('puzzleSolvability');
const { normalizeReverseBankSolution } = compile('puzzleSolutionReplay');
const { qualifyFreshBankPuzzle } = compile('bankDeliveryPolicy');
const hook = ts.createSourceFile('hook.ts', fs.readFileSync(root + '/src/hooks/usePuzzleGame.ts', 'utf8'), ts.ScriptTarget.ES2020, true);
const solverDeclaration = hook.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'isBoardSolvableFromState');
const solverExports = {};
Function('exports', ts.transpileModule(solverDeclaration.getText(hook), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(solverExports);
const { isBoardSolvableFromState } = solverExports;
const files = fs.readdirSync(root + '/src/data').filter(name => /^(puzzle|lexicon)Bank(?!Types).*\.ts$/.test(name)).sort();
const results = [];
const violations = [];
const replayIssues = [];
const hintIssues = [];
const withheldAfterVocabulary = [];
const historicalReplayIssues = [];
const text = row => row.map(cell => cell.ch).join('');
function replay(puzzle, variant, isValid) {
  const rows = puzzle.words.map(word => [...word].map(ch => ({ ch, locked: false })));
  const steps = [...puzzle.solution.map(step => ({ ...step, leg: 0 })), ...(variant === 'reverse' ? (puzzle.reverseSolution ?? []).map(step => ({ ...step, leg: 1 })) : [])];
  let failure = '';
  function go(board, index) {
    if (index === steps.length) return true;
    const step = steps[index];
    const active = step.leg === 0 ? step.stepIndex : board.length - 1 - step.stepIndex;
    const targetIndex = active + (step.leg === 0 ? 1 : -1);
    if (!board[active] || !board[targetIndex] || text(board[active]) !== step.sourceWord || text(board[targetIndex]) !== step.targetWord) {
      failure = `source/target mismatch at step ${index}`; return false;
    }
    const source = board[active];
    const target = board[targetIndex];
    const result = !step.lettersToMove && step.insertionPosition != null
      ? step.targetWord.slice(0, step.insertionPosition) + step.letterToMove + step.targetWord.slice(step.insertionPosition)
      : /to form ([A-Z]+)\./.exec(step.explanation)?.[1];
    if (!result) { failure = `missing result at step ${index}`; return false; }
    const letters = step.lettersToMove ?? [step.letterToMove];
    function shifts(src, tgt, moved) {
      if (moved === letters.length) {
        if (text(tgt) !== result || !isValid(text(src)) || !isValid(text(tgt))) return false;
        const next = board.slice(); next[active] = src; next[targetIndex] = tgt;
        return go(next, index + 1);
      }
      for (let i = 0; i < src.length; i++) {
        if (src[i].locked || src[i].ch !== letters[moved]) continue;
        if (letters.length === 1 && Number.isInteger(step.removalPosition) && src[step.removalPosition]?.ch === letters[moved] && !src[step.removalPosition]?.locked && i !== step.removalPosition) continue;
        const remainder = src.filter((_, k) => k !== i);
        for (let j = 0; j <= tgt.length; j++) {
          if (letters.length === 1 && Number.isInteger(step.insertionPosition) && j !== step.insertionPosition) continue;
          const preserve = variant === 'double_shift' || step.leg === 1;
          const current = tgt.map(cell => ({ ...cell, locked: preserve ? cell.locked : false }));
          const inserted = [...current.slice(0, j), { ch: letters[moved], locked: true }, ...current.slice(j)];
          if (shifts(remainder, inserted, moved + 1)) return true;
        }
      }
      return false;
    }
    if (shifts(source, target, 0)) return true;
    failure ||= `stored letters cannot legally form named result at step ${index}`;
    return false;
  }
  return go(rows, 0) ? null : failure;
}
function auditStoredReverseHints(puzzle) {
  let board = puzzle.words.map(word => [...word].map(char => ({ char, isLocked: false })));
  const name = row => row.map(cell => cell.char).join('');
  for (const [leg, steps] of [puzzle.solution, puzzle.reverseSolution ?? []].entries()) {
    for (const step of steps) {
      const active = leg === 0 ? step.stepIndex : board.length - 1 - step.stepIndex;
      const target = active + (leg === 0 ? 1 : -1);
      if (name(board[active]) !== step.sourceWord || name(board[target]) !== step.targetWord) return null; // App falls back to proved live search.
      const preferred = step.removalPosition;
      const pick = preferred != null && board[active][preferred]?.char === step.letterToMove && !board[active][preferred].isLocked
        ? preferred : board[active].findIndex(cell => !cell.isLocked && cell.char === step.letterToMove);
      if (pick < 0) return null;
      const remaining = board[active].filter((_, i) => i !== pick);
      if (!fresh.has(name(remaining))) return null;
      const makeTarget = slot => [...board[target].slice(0, slot).map(cell => ({ ...cell, isLocked: leg === 1 ? cell.isLocked : false })), { char: step.letterToMove, isLocked: true }, ...board[target].slice(slot).map(cell => ({ ...cell, isLocked: leg === 1 ? cell.isLocked : false }))];
      let slot = step.insertionPosition;
      if (slot == null || !fresh.has(name(makeTarget(slot)))) slot = Array.from({length:board[target].length+1},(_,i)=>i).find(i=>fresh.has(name(makeTarget(i))));
      if (slot == null) return null;
      const next = board.slice(); next[active] = remaining; next[target] = makeTarget(slot);
      if (leg === 1 && target === 0) return null;
      const nextActive = leg === 1 ? active - 1 : active === board.length - 2 ? board.length - 1 : active + 1;
      const direction = leg === 1 || active === board.length - 2 ? 'up' : 'down';
      if (!isBoardSolvableFromState(next, nextActive, direction, 'reverse', word => fresh.has(word), 500000)) {
        return { leg, stepIndex: step.stepIndex, source: name(board[active]), target: name(board[target]), picked: step.letterToMove, slot, after: next.map(name) };
      }
      board = next;
    }
  }
  return null;
}
for (const file of files) {
  const source = fs.readFileSync(root + '/src/data/' + file, 'utf8');
  const body = source.slice(source.indexOf('= [') + 2).trim().replace(/;$/, '');
  const bank = Function('return (' + body + ')')();
  const advanced = file.startsWith('lexicon') || file.includes('Expert');
  const variant = file.includes('Reverse') ? 'reverse' : file.includes('Double') ? 'double_shift' : 'standard';
  const originalEligible = bank.filter(puzzle => isPuzzleVocabularyFair(puzzle, advanced));
  let repaired = 0;
  const eligible = originalEligible.flatMap(puzzle => {
    const originalReplayIssue = replay(puzzle, variant, word => fresh.has(word));
    if (originalReplayIssue) historicalReplayIssues.push({ file, id: puzzle.id, words: puzzle.words, issue: originalReplayIssue });
    const normalized = qualifyFreshBankPuzzle(puzzle, advanced, variant, word => fresh.has(word));
    if (!normalized) {
      const repaired = variant === 'reverse' ? normalizeReverseBankSolution(puzzle, word => fresh.has(word)) : puzzle;
      withheldAfterVocabulary.push({ file, id: puzzle.id, words: puzzle.words,
        reason: !repaired ? 'reverse_replay_unproved' : !isPuzzleVocabularyFair(repaired, advanced) ? 'replayed_vocabulary' : 'audited_single_route',
        invalidRequiredWords: repaired ? getRequiredPuzzleWords(repaired).filter(word => !vocabulary.AUDITED_PUZZLE_WORDS.has(word) || vocabulary.UNREVIEWED_PUZZLE_WORDS.has(word) || vocabulary.OBSCURE_PUZZLE_WORDS.has(word) || (!advanced && vocabulary.ADVANCED_PUZZLE_WORDS.has(word))) : [],
      });
      return [];
    }
    if (JSON.stringify(normalized.solution) !== JSON.stringify(puzzle.solution) || JSON.stringify(normalized.reverseSolution) !== JSON.stringify(puzzle.reverseSolution)) repaired++;
    return [normalized];
  });
  const row = { file, variant, advanced, raw: bank.length, originalEligible: originalEligible.length, eligible: eligible.length, repaired, singlePath: 0, unsolvable: 0, inconclusive: 0, canonicalInvalidWords: 0, storedReplayInvalid: 0, maxStates: 0, branchChanged: 0 };
  for (const puzzle of eligible) {
    const invalid = getRequiredPuzzleWords(puzzle).filter(word => !fresh.has(word));
    if (invalid.length) row.canonicalInvalidWords++;
    if (variant === 'standard') {
      const metrics = analyzeStandardBranching(puzzle.words, word => fresh.has(word), { pathCap: 64, stateCap: 4000 });
      row.maxStates = Math.max(row.maxStates, metrics.stateCount);
      if (metrics.completePathCount < 2) {
        const old = analyzeStandardBranching(puzzle.words, word => historical.has(word), { pathCap: 64, stateCap: 4000 });
        if (old.completePathCount !== metrics.completePathCount) row.branchChanged++;
        if (metrics.completePathCount === 0) row.unsolvable++; else row.singlePath++;
        violations.push({ file, id: puzzle.id, words: puzzle.words, oldPaths: old.completePathCount, newPaths: metrics.completePathCount, states: metrics.stateCount });
      }
    } else {
      const verdict = isChainSolvable(variant, puzzle.words, word => fresh.has(word), 500000);
      if (verdict !== 'solvable') {
        row[verdict]++;
        violations.push({ file, id: puzzle.id, words: puzzle.words, verdict });
      }
    }
    const replayIssue = replay(puzzle, variant, word => fresh.has(word));
    if (replayIssue) { row.storedReplayInvalid++; replayIssues.push({ file, id: puzzle.id, words: puzzle.words, replayIssue }); }
    if (variant === 'reverse') {
      const hintIssue = auditStoredReverseHints(puzzle);
      if (hintIssue) hintIssues.push({file,id:puzzle.id,words:puzzle.words,...hintIssue});
    }
  }
  results.push(row);
  console.log(JSON.stringify(row));
}
const report = { date: '2026-09-05', freshWords: fresh.size, historicalWords: historical.size, results, violations, replayIssues, hintIssues, historicalReplayIssues, withheldAfterVocabulary, memory: process.memoryUsage() };
const outputPath = process.argv[2];
if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
if (violations.length || replayIssues.length || hintIssues.length) process.exitCode = 1;
console.log(JSON.stringify({ violations, replayIssues, hintIssues, rssMB: Math.round(process.memoryUsage().rss / 1048576) }));
