/**
 * HOUSE ASKS service tests — candidate derivation from hand-built stored
 * solutions (move letters, never-moved letters, final-row exclusion, null
 * cases), evaluation semantics for both kinds, and determinism under a
 * seeded rng. The service is pure (no storage), so no mocks are needed.
 */

import {
  deriveHouseAskCandidates,
  pickHouseAsk,
  evaluateHouseAsk,
  HouseAsk,
  CommittedMoveSummary,
} from '../services/houseAsks';
import type { PuzzleSolutionStep } from '../types';

const step = (
  letterToMove: string,
  overrides: Partial<PuzzleSolutionStep> = {}
): PuzzleSolutionStep => ({
  stepIndex: 0,
  sourceWord: 'AAAA',
  targetWord: 'AAAAA',
  letterToMove,
  explanation: '',
  ...overrides,
});

const move = (m: [string, number][]): CommittedMoveSummary[] =>
  m.map(([letter, fromRow]) => ({ letter, fromRow }));

// Deterministic rng for the determinism tests (mulberry32).
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// A little 3-row board: CAT -> DOG -> RAT with a stored route moving C then G.
const START_WORDS = ['CAT', 'DOG', 'RAT'];
const SOLUTION = [step('C'), step('G', { stepIndex: 1 })];

describe('deriveHouseAskCandidates', () => {
  test('move candidates are the stored-solution letters, in step order', () => {
    const candidates = deriveHouseAskCandidates(SOLUTION, START_WORDS);
    const moves = candidates.filter(c => c.kind === 'move');
    expect(moves).toEqual([
      { kind: 'move', letter: 'C' },
      { kind: 'move', letter: 'G' },
    ]);
  });

  test('keep candidates are never-moved characters from NON-final rows, in row-scan order', () => {
    const candidates = deriveHouseAskCandidates(SOLUTION, START_WORDS);
    const keeps = candidates.filter(c => c.kind === 'keep');
    // CAT contributes A,T (C moved); DOG contributes D,O (G moved).
    expect(keeps).toEqual([
      { kind: 'keep', letter: 'A' },
      { kind: 'keep', letter: 'T' },
      { kind: 'keep', letter: 'D' },
      { kind: 'keep', letter: 'O' },
    ]);
  });

  test('final-row-only characters are excluded from keep candidates (they cannot travel)', () => {
    // R appears ONLY in the final row RAT: never a candidate.
    const letters = deriveHouseAskCandidates(SOLUTION, START_WORDS).map(c => c.letter);
    expect(letters).not.toContain('R');
  });

  test('documented simplification: a character in BOTH the final row and an earlier row stays a keep candidate', () => {
    // A and T sit in the final row RAT too, but their CAT instances can travel.
    const keeps = deriveHouseAskCandidates(SOLUTION, START_WORDS)
      .filter(c => c.kind === 'keep')
      .map(c => c.letter);
    expect(keeps).toContain('A');
    expect(keeps).toContain('T');
  });

  test('candidates deduplicate on character (letter-character semantics)', () => {
    const solution = [step('C'), step('C', { stepIndex: 1 })];
    const moves = deriveHouseAskCandidates(solution, START_WORDS).filter(c => c.kind === 'move');
    expect(moves).toEqual([{ kind: 'move', letter: 'C' }]);
  });

  test('normalizes case to uppercase', () => {
    const solution = [step('c'), step('g', { stepIndex: 1 })];
    const candidates = deriveHouseAskCandidates(solution, ['cat', 'dog', 'rat']);
    expect(candidates[0]).toEqual({ kind: 'move', letter: 'C' });
    expect(candidates.some(c => c.kind === 'keep' && c.letter === 'D')).toBe(true);
  });

  test('a character both moved and present elsewhere is never a keep candidate', () => {
    // Solution moves T; the T in CAT (and RAT) must not appear as keep.
    const solution = [step('T'), step('G', { stepIndex: 1 })];
    const candidates = deriveHouseAskCandidates(solution, START_WORDS);
    expect(candidates).not.toContainEqual({ kind: 'keep', letter: 'T' });
    expect(candidates).toContainEqual({ kind: 'move', letter: 'T' });
  });

  test('no sound candidate without a stored solution', () => {
    expect(deriveHouseAskCandidates(undefined, START_WORDS)).toEqual([]);
    expect(deriveHouseAskCandidates([], START_WORDS)).toEqual([]);
  });

  test('no sound candidate on a board with fewer than two rows', () => {
    expect(deriveHouseAskCandidates(SOLUTION, [])).toEqual([]);
    expect(deriveHouseAskCandidates(SOLUTION, ['CAT'])).toEqual([]);
  });

  test('double-shift steps (lettersToMove) make the board ineligible — asks are standard-only', () => {
    const solution = [
      step('C'),
      step('G', { stepIndex: 1, lettersToMove: ['G', 'O'] }),
    ];
    expect(deriveHouseAskCandidates(solution, START_WORDS)).toEqual([]);
  });

  test('malformed letterToMove makes the board ineligible', () => {
    expect(deriveHouseAskCandidates([step('')], START_WORDS)).toEqual([]);
    expect(deriveHouseAskCandidates([step('CG')], START_WORDS)).toEqual([]);
    expect(
      deriveHouseAskCandidates(
        [step(undefined as unknown as string)],
        START_WORDS
      )
    ).toEqual([]);
  });
});

describe('pickHouseAsk', () => {
  test('returns null when no sound candidate exists', () => {
    expect(pickHouseAsk(undefined, START_WORDS)).toBeNull();
    expect(pickHouseAsk([], START_WORDS)).toBeNull();
    expect(pickHouseAsk(SOLUTION, ['CAT'])).toBeNull();
  });

  test('a single rng draw indexes the deterministic candidate order', () => {
    // Candidate order: move C, move G, keep A, keep T, keep D, keep O.
    expect(pickHouseAsk(SOLUTION, START_WORDS, () => 0)).toEqual({ kind: 'move', letter: 'C' });
    expect(pickHouseAsk(SOLUTION, START_WORDS, () => 0.5)).toEqual({ kind: 'keep', letter: 'T' });
    expect(pickHouseAsk(SOLUTION, START_WORDS, () => 0.999)).toEqual({ kind: 'keep', letter: 'O' });
  });

  test('an out-of-contract rng value clamps to a real candidate', () => {
    expect(pickHouseAsk(SOLUTION, START_WORDS, () => 1)).toEqual({ kind: 'keep', letter: 'O' });
    expect(pickHouseAsk(SOLUTION, START_WORDS, () => -0.2)).toEqual({ kind: 'move', letter: 'C' });
  });

  test('deterministic given a seeded rng', () => {
    const first = pickHouseAsk(SOLUTION, START_WORDS, mulberry32(1234));
    const second = pickHouseAsk(SOLUTION, START_WORDS, mulberry32(1234));
    expect(first).not.toBeNull();
    expect(second).toEqual(first);
    // A different seed exercises the same contract (still a sound candidate).
    const other = pickHouseAsk(SOLUTION, START_WORDS, mulberry32(99));
    expect(deriveHouseAskCandidates(SOLUTION, START_WORDS)).toContainEqual(other);
  });

  test('every pick is satisfiable by replaying the stored route', () => {
    // The stored route commits exactly its letterToMove characters, so a
    // 'move' pick is trivially kept and a 'keep' pick is trivially unbroken.
    const routeMoves = move(SOLUTION.map((s, i) => [s.letterToMove, i] as [string, number]));
    for (let roll = 0; roll < 1; roll += 0.05) {
      const ask = pickHouseAsk(SOLUTION, START_WORDS, () => roll);
      expect(ask).not.toBeNull();
      expect(evaluateHouseAsk(ask as HouseAsk, routeMoves)).toBe(true);
    }
  });
});

describe('evaluateHouseAsk', () => {
  test("'move' is kept iff some committed move's letter matches", () => {
    const ask: HouseAsk = { kind: 'move', letter: 'C' };
    expect(evaluateHouseAsk(ask, move([['C', 0]]))).toBe(true);
    expect(evaluateHouseAsk(ask, move([['G', 1], ['C', 0]]))).toBe(true);
    expect(evaluateHouseAsk(ask, move([['G', 1], ['A', 0]]))).toBe(false);
    expect(evaluateHouseAsk(ask, [])).toBe(false);
  });

  test("'keep' is kept iff NO committed move's letter matches", () => {
    const ask: HouseAsk = { kind: 'keep', letter: 'A' };
    expect(evaluateHouseAsk(ask, move([['C', 0], ['G', 1]]))).toBe(true);
    expect(evaluateHouseAsk(ask, move([['C', 0], ['A', 1]]))).toBe(false);
    expect(evaluateHouseAsk(ask, [])).toBe(true);
  });

  test('evaluation is case-insensitive (character semantics)', () => {
    expect(evaluateHouseAsk({ kind: 'move', letter: 'c' }, move([['C', 0]]))).toBe(true);
    expect(evaluateHouseAsk({ kind: 'keep', letter: 'A' }, move([['a', 2]]))).toBe(false);
  });

  test('fromRow is irrelevant to evaluation (only the character matters)', () => {
    const ask: HouseAsk = { kind: 'move', letter: 'G' };
    expect(evaluateHouseAsk(ask, move([['G', 4]]))).toBe(true);
  });
});
