import { getReverseRemovalCandidates, solveReverse } from '../services/localGenerator';
import { isFairPuzzleWord, isPuzzleVocabularyFair } from '../services/puzzleVocabulary';
import { isReverseChainSolvable } from '../services/puzzleSolvability';
import type { PuzzleSolutionStep } from '../types';

jest.mock('../services/amberCurrency', () => ({ getCurrentPhase: async () => 0 }));
jest.mock('../services/wordHistory', () => ({
  getWordHistoryWithRecency: async () => new Map(),
  calculateFreshnessPenalty: () => 0,
  isInHardCooldown: () => false,
  recordPuzzleWords: async () => {},
}));

test('reverse search can move an original duplicate while the incoming copy stays locked', () => {
  expect(getReverseRemovalCandidates('SPATS', 0, new Set(['PATS', 'SPAT']), new Set())).toEqual([
    { charIndex: 4, char: 'S', remainder: 'SPAT' },
  ]);
  expect(getReverseRemovalCandidates('SPATS', 4, new Set(['PATS', 'SPAT']), new Set())).toEqual([
    { charIndex: 0, char: 'S', remainder: 'PATS' },
  ]);
});

test('reverse search still excludes unavailable and previously used remainders', () => {
  expect(getReverseRemovalCandidates('SPATS', 0, new Set(['PATS']), new Set())).toEqual([]);
  expect(getReverseRemovalCandidates('SPATS', 0, new Set(['SPAT']), new Set(['SPAT']))).toEqual([]);
});

test.each([
  { location: 'final move', words: ['STAR', 'TART'], letters: ['S'] },
  { location: 'earlier move', words: ['BUOY', 'ANTS', 'TART'], letters: ['U', 'S'] },
])('reverse hints preserve the non-first repeated-letter removal in the $location', ({ words, letters }) => {
  const solution: PuzzleSolutionStep[] = letters.map((letterToMove, stepIndex) => ({
    stepIndex, sourceWord: words[stepIndex], targetWord: words[stepIndex + 1],
    letterToMove, explanation: '',
  }));
  const reverseSolution = solveReverse(words, solution);
  expect(reverseSolution).not.toBeNull();
  // START must lose its last T to leave STAR. Removing the first T instead
  // produces SART, so an omitted removalPosition rejects this valid board.
  expect(reverseSolution).toContainEqual(expect.objectContaining({
    sourceWord: 'START', letterToMove: 'T', removalPosition: 4,
  }));
  expect(isFairPuzzleWord('SART')).toBe(false);
  expect(isPuzzleVocabularyFair({ words, solution, reverseSolution: reverseSolution! })).toBe(true);
  expect(isReverseChainSolvable(words, word => isFairPuzzleWord(word))).toBe('solvable');

  // Replay the serialized positions with the shipped cumulative return locks;
  // an existential solver alone would not prove that these hints are usable.
  const rows = words.map(word => [...word].map(char => ({ char, locked: false })));
  const rowWord = (index: number) => rows[index].map(cell => cell.char).join('');
  for (const [leg, steps] of [solution, reverseSolution!].entries()) {
    for (const step of steps) {
      const source = leg === 0 ? step.stepIndex : rows.length - 1 - step.stepIndex;
      const target = source + (leg === 0 ? 1 : -1);
      expect(rowWord(source)).toBe(step.sourceWord);
      expect(rowWord(target)).toBe(step.targetWord);
      expect(Number.isInteger(step.removalPosition)).toBe(true);
      expect(Number.isInteger(step.insertionPosition)).toBe(true);
      expect(rows[source][step.removalPosition!]).toEqual({ char: step.letterToMove, locked: false });
      rows[source].splice(step.removalPosition!, 1);
      if (leg === 0) rows[target] = rows[target].map(cell => ({ ...cell, locked: false }));
      rows[target].splice(step.insertionPosition!, 0, { char: step.letterToMove, locked: true });
      expect(isFairPuzzleWord(rowWord(source))).toBe(true);
      expect(isFairPuzzleWord(rowWord(target))).toBe(true);
    }
  }
});
