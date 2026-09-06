import type { PreGeneratedPuzzle } from '../src/data/puzzleBankTypes';
import { createReverseTopUpCandidates, mutateReverseRow } from './reverseTopUpCandidates';
import { isReverseChainSolvable } from '../src/services/puzzleSolvability';

const seed: PreGeneratedPuzzle = {
  id: 'source', words: ['CARS', 'TARS'], wordLength: 4, qualityScore: 50,
  dreadTier: 0, dreadWordCount: 0, semanticTags: [], allWords: ['STALE_METADATA'],
  solution: [{ stepIndex: 0, sourceWord: 'CARS', targetWord: 'TARS', letterToMove: 'S',
    removalPosition: 3, insertionPosition: 0, explanation: 'old forward hint' }],
  reverseSolution: [{ stepIndex: 0, sourceWord: 'STARS', targetWord: 'CAR', letterToMove: 'S',
    removalPosition: 4, insertionPosition: 3, explanation: 'old return hint' }],
};
const allowed = new Set(['CARS', 'TARS', 'CAR', 'STARS', 'STAR', 'BARS', 'BAR', 'PARS', 'SPARS', 'SPAR']);
const isAllowed = (word: string) => allowed.has(word);

test('a first-row replacement proves both legs and rebuilds every hint and required word', () => {
  const before = JSON.stringify(seed);
  const candidate = mutateReverseRow(seed, 0, 'BARS', isAllowed)!;
  expect(candidate.words).toEqual(['BARS', 'TARS']);
  expect(candidate.solution[0]).toMatchObject({ sourceWord: 'BARS', targetWord: 'TARS', explanation: "Move 'S' from BARS to form STARS." });
  expect(candidate.reverseSolution[0]).toMatchObject({ sourceWord: 'STARS', targetWord: 'BAR', removalPosition: 4, explanation: "Move 'S' from STARS to form BARS." });
  expect(new Set(candidate.allWords)).toEqual(new Set(['BARS', 'TARS', 'BAR', 'STARS', 'STAR']));
  expect(candidate).not.toHaveProperty('id');
  expect(candidate).not.toHaveProperty('dreadTier');
  expect(JSON.stringify(seed)).toBe(before);
});

test('a bottom-row replacement follows the same return geometry', () => {
  const candidate = mutateReverseRow(seed, 1, 'PARS', isAllowed)!;
  expect(candidate.words).toEqual(['CARS', 'PARS']);
  expect(candidate.reverseSolution[0]).toMatchObject({ sourceWord: 'SPARS', targetWord: 'CAR' });
  expect(candidate.allWords).toContain('SPAR');
});

test('two composed row replacements rebuild both legs while retaining cumulative locks', () => {
  const first = mutateReverseRow(seed, 0, 'BARS', isAllowed)!;
  const intermediate = { ...seed, ...first };
  const before = JSON.stringify(intermediate);
  const candidate = mutateReverseRow(intermediate, 1, 'PARS', isAllowed)!;

  expect(candidate.words).toEqual(['BARS', 'PARS']);
  expect(candidate.solution[0]).toMatchObject({
    sourceWord: 'BARS', targetWord: 'PARS', removalPosition: 3, insertionPosition: 0,
    explanation: "Move 'S' from BARS to form SPARS.",
  });
  expect(candidate.reverseSolution[0]).toMatchObject({
    sourceWord: 'SPARS', targetWord: 'BAR', removalPosition: 4, insertionPosition: 3,
    explanation: "Move 'S' from SPARS to form BARS.",
  });
  expect(new Set(candidate.allWords)).toEqual(new Set(['BARS', 'PARS', 'BAR', 'SPARS', 'SPAR']));
  expect(isReverseChainSolvable(candidate.words, isAllowed)).toBe('solvable');
  expect(JSON.stringify(intermediate)).toBe(before);

  // The second mutation must replay the first leg's inserted S as locked,
  // even though another copy of the same letter is removable on the return.
  const lockedReturn = {
    ...intermediate,
    reverseSolution: [{ ...intermediate.reverseSolution[0], removalPosition: 0 }],
  };
  expect(mutateReverseRow(lockedReturn, 1, 'PARS', isAllowed)).toBeNull();
});

test('a real five-row replacement also passes the independent shipped-rules solver', () => {
  const geometry = (letters: [string, number, number][]) => letters.map(([letterToMove, removalPosition, insertionPosition], stepIndex) => ({
    stepIndex, letterToMove, removalPosition, insertionPosition,
    sourceWord: '', targetWord: '', explanation: '',
  }));
  const longSeed: PreGeneratedPuzzle = {
    ...seed, words: ['WHACKS', 'EIGHTS', 'HARING', 'CARTED', 'ROTTER'], wordLength: 6,
    solution: geometry([['W', 0, 0], ['E', 1, 1], ['H', 0, 1], ['T', 4, 0]]),
    reverseSolution: geometry([['R', 1, 3], ['R', 4, 2], ['R', 3, 1], ['S', 6, 0]]),
  };
  const routeWords = new Set([
    'WOWING', 'EIGHTS', 'HARING', 'CARTED', 'ROTTER', 'OWING', 'WEIGHTS', 'WIGHTS',
    'HEARING', 'EARING', 'CHARTED', 'CHARED', 'TROTTER', 'TOTTER', 'CHARRED',
    'EARRING', 'WRIGHTS', 'WRIGHT', 'SOWING',
  ]);
  const candidate = mutateReverseRow(longSeed, 0, 'WOWING', word => routeWords.has(word))!;
  expect(candidate).not.toBeNull();
  expect(candidate.reverseSolution[3]).toMatchObject({ sourceWord: 'WRIGHTS', targetWord: 'OWING', explanation: "Move 'S' from WRIGHTS to form SOWING." });
  expect(new Set(candidate.allWords)).toEqual(routeWords);
  expect(isReverseChainSolvable(candidate.words, word => routeWords.has(word))).toBe('solvable');
});

test('the unlocked duplicate can move, but the forward-received copy stays locked on return', () => {
  expect(mutateReverseRow(seed, 0, 'BARS', isAllowed)).not.toBeNull();
  const lockedReturn = { ...seed, reverseSolution: [{ ...seed.reverseSolution![0], removalPosition: 0 }] };
  expect(mutateReverseRow(lockedReturn, 0, 'BARS', isAllowed)).toBeNull();
});

test.each([-1, 1.5, 5, undefined])('invalid removal position %s is not repaired by guessing another copy', position => {
  const malformed = { ...seed, solution: [{ ...seed.solution[0], removalPosition: position }] };
  expect(mutateReverseRow(malformed, 0, 'BARS', isAllowed)).toBeNull();
});

test('rejects wrong transfer letters, bad insertions, duplicate displayed rows and unavailable return words', () => {
  expect(mutateReverseRow({ ...seed, solution: [{ ...seed.solution[0], letterToMove: 'R' }] }, 0, 'BARS', isAllowed)).toBeNull();
  expect(mutateReverseRow({ ...seed, solution: [{ ...seed.solution[0], insertionPosition: 5 }] }, 0, 'BARS', isAllowed)).toBeNull();
  expect(mutateReverseRow(seed, 0, 'TARS', isAllowed)).toBeNull();
  expect(mutateReverseRow(seed, 0, 'BARS', word => isAllowed(word) && word !== 'STAR')).toBeNull();
});

test('enumeration obeys its attempt budget and consults a live usage-cap predicate', () => {
  const unavailable = new Set<string>();
  const candidates = createReverseTopUpCandidates([seed], ['BARS', 'PARS'], word => isAllowed(word) && !unavailable.has(word), { firstRowOnly: true });
  expect(candidates.next().value.words).toEqual(['BARS', 'TARS']);
  unavailable.add('STAR');
  expect(candidates.next().done).toBe(true);
  expect([...createReverseTopUpCandidates([seed], ['BARS'], isAllowed, { maxAttempts: 0 })]).toEqual([]);
  expect([...createReverseTopUpCandidates([seed], ['BARS', 'PARS'], isAllowed, { maxAttempts: 1 })]).toHaveLength(1);
});
