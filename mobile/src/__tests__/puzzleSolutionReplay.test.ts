import { normalizeReverseBankSolution } from '../services/puzzleSolutionReplay';
import type { PreGeneratedPuzzle } from '../data/puzzleBankTypes';

// Real historical mismatch: serialized first insertion forms SPATS while the
// following step names PASTS. Its reverse leg already expects the SPAS remainder.
const fixture: PreGeneratedPuzzle = {
  id: '7771d9d77a06', words: ['STAR', 'PATS', 'CHAR'], wordLength: 4,
  qualityScore: 50, dreadTier: 4, dreadWordCount: 1, allWords: ['STAR', 'PATS', 'CHAR', 'PASTS', 'CHART', 'SPAS', 'SPARS', 'TAR'], semanticTags: [],
  solution: [
    { stepIndex: 0, sourceWord: 'STAR', targetWord: 'PATS', letterToMove: 'S', explanation: "Move 'S' from STAR to form PASTS.", insertionPosition: 0, removalPosition: 0 },
    { stepIndex: 1, sourceWord: 'PASTS', targetWord: 'CHAR', letterToMove: 'T', explanation: "Move 'T' from PASTS to form CHART.", insertionPosition: 4, removalPosition: 3 },
  ],
  reverseSolution: [
    { stepIndex: 0, sourceWord: 'CHART', targetWord: 'SPAS', letterToMove: 'R', explanation: "Move 'R' from CHART to form SPARS.", insertionPosition: 3 },
    { stepIndex: 1, sourceWord: 'SPARS', targetWord: 'TAR', letterToMove: 'S', explanation: "Move 'S' from SPARS to form STAR.", insertionPosition: 0 },
  ],
};
const words = new Set(['STAR', 'PATS', 'CHAR', 'SPATS', 'PASTS', 'TAR', 'CHART', 'SPAS', 'CHAT', 'SPARS', 'SPAR']);

test('normalizes actual source/target/positions only after a complete locked replay, leaving the raw bank untouched', () => {
  const original = JSON.stringify(fixture);
  const repaired = normalizeReverseBankSolution(fixture, word => words.has(word));
  expect(repaired).not.toBeNull();
  expect(repaired!.solution[0].explanation).toContain('SPATS');
  expect(repaired!.solution[1].sourceWord).toBe('SPATS');
  // The first S stays locked; the return trip must take the other S.
  expect(repaired!.reverseSolution![1].removalPosition).toBe(4);
  expect(JSON.stringify(fixture)).toBe(original);
});

test('refuses an impossible route, malformed step count, or exhausted proof budget', () => {
  expect(normalizeReverseBankSolution(fixture, word => words.has(word) && word !== 'CHAT')).toBeNull();
  expect(normalizeReverseBankSolution({ ...fixture, reverseSolution: [] }, word => words.has(word))).toBeNull();
  expect(normalizeReverseBankSolution(fixture, word => words.has(word), 1)).toBeNull();
});
