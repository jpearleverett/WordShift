/**
 * Bank word-diversity guards.
 *
 * The pre-generated banks are built with a bank-wide word saturation cap
 * (scripts/generate*.test.ts, BANK_WORD_CAP env): no word — starting chain,
 * formed, or reverse-leg transient — may appear in more puzzles of a bank
 * than the cap. Harder banks that plateaued under generation (the dread
 * vocabulary is finite) were then topped up from the pre-cap banks with a
 * greedy merge that maximizes unique-word gain under the same per-word cap,
 * so each bank's effective cap below is the exact measured maximum of the
 * committed data.
 *
 * Before the cap, the DFS funneled through ~50 hub words dozens of times per
 * bank — the old ReverseHard bank had STARTS in 154 of 486 puzzles and 23
 * words appeared 100+ times across all banks (now zero). These tests pin the
 * per-bank cap, a unique-word floor, and a puzzle-count floor (~15% under
 * measured) so a future regeneration can't silently regress variety.
 */
import { PUZZLE_BANK_EASY } from '../data/puzzleBankEasy';
import { PUZZLE_BANK_MEDIUM } from '../data/puzzleBankMedium';
import { PUZZLE_BANK_MEDIUM_PLUS } from '../data/puzzleBankMediumPlus';
import { PUZZLE_BANK_HARD } from '../data/puzzleBankHard';
import { PUZZLE_BANK_REVERSE_EASY } from '../data/puzzleBankReverseEasy';
import { PUZZLE_BANK_REVERSE_MEDIUM } from '../data/puzzleBankReverseMedium';
import { PUZZLE_BANK_REVERSE_MEDIUM_PLUS } from '../data/puzzleBankReverseMediumPlus';
import { PUZZLE_BANK_REVERSE_HARD } from '../data/puzzleBankReverseHard';
import { PUZZLE_BANK_DOUBLE_SHIFT_EASY } from '../data/puzzleBankDoubleShiftEasy';
import { PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM } from '../data/puzzleBankDoubleShiftMedium';
import { PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM_PLUS } from '../data/puzzleBankDoubleShiftMediumPlus';
import { PUZZLE_BANK_DOUBLE_SHIFT_HARD } from '../data/puzzleBankDoubleShiftHard';
import { PreGeneratedPuzzle } from '../data/puzzleBankTypes';

interface BankSpec {
  name: string;
  bank: PreGeneratedPuzzle[];
  cap: number;
  minUnique: number;
  minPuzzles: number;
}

const BANKS: BankSpec[] = [
  { name: 'EASY', bank: PUZZLE_BANK_EASY, cap: 3, minUnique: 1314, minPuzzles: 425 },
  { name: 'MEDIUM', bank: PUZZLE_BANK_MEDIUM, cap: 4, minUnique: 1416, minPuzzles: 425 },
  { name: 'MEDIUM_PLUS', bank: PUZZLE_BANK_MEDIUM_PLUS, cap: 7, minUnique: 1205, minPuzzles: 404 },
  { name: 'HARD', bank: PUZZLE_BANK_HARD, cap: 10, minUnique: 1127, minPuzzles: 374 },
  { name: 'REVERSE_EASY', bank: PUZZLE_BANK_REVERSE_EASY, cap: 6, minUnique: 1190, minPuzzles: 396 },
  { name: 'REVERSE_MEDIUM', bank: PUZZLE_BANK_REVERSE_MEDIUM, cap: 10, minUnique: 1228, minPuzzles: 322 },
  { name: 'REVERSE_MEDIUM_PLUS', bank: PUZZLE_BANK_REVERSE_MEDIUM_PLUS, cap: 12, minUnique: 768, minPuzzles: 193 },
  { name: 'REVERSE_HARD', bank: PUZZLE_BANK_REVERSE_HARD, cap: 16, minUnique: 691, minPuzzles: 162 },
  { name: 'DOUBLE_EASY', bank: PUZZLE_BANK_DOUBLE_SHIFT_EASY, cap: 3, minUnique: 1388, minPuzzles: 425 },
  { name: 'DOUBLE_MEDIUM', bank: PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM, cap: 5, minUnique: 1381, minPuzzles: 398 },
  { name: 'DOUBLE_MEDIUM_PLUS', bank: PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM_PLUS, cap: 8, minUnique: 1415, minPuzzles: 413 },
  { name: 'DOUBLE_HARD', bank: PUZZLE_BANK_DOUBLE_SHIFT_HARD, cap: 10, minUnique: 1411, minPuzzles: 391 },
];

/** All words a player sees in a puzzle: the starting chain + every formed word. */
function collectPuzzleWords(p: PreGeneratedPuzzle): Set<string> {
  const seen = new Set<string>();
  for (const w of p.words) seen.add(w.toUpperCase());
  for (const step of [...(p.solution ?? []), ...(p.reverseSolution ?? [])]) {
    if (step.sourceWord) seen.add(step.sourceWord.toUpperCase());
    if (step.targetWord) seen.add(step.targetWord.toUpperCase());
    const m = /form ([A-Z]+)/.exec(step.explanation ?? '');
    if (m) seen.add(m[1]);
  }
  return seen;
}

describe.each(BANKS)('bank diversity: $name', ({ bank, cap, minUnique, minPuzzles }) => {
  const usage = new Map<string, number>();
  for (const p of bank) {
    for (const w of collectPuzzleWords(p)) {
      usage.set(w, (usage.get(w) ?? 0) + 1);
    }
  }

  it(`has at least ${minPuzzles} puzzles`, () => {
    expect(bank.length).toBeGreaterThanOrEqual(minPuzzles);
  });

  it(`no word appears in more than ${cap} puzzles`, () => {
    const offenders = [...usage.entries()]
      .filter(([, c]) => c > cap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([w, c]) => `${w}:${c}`);
    expect(offenders).toEqual([]);
  });

  it(`uses at least ${minUnique} unique words`, () => {
    expect(usage.size).toBeGreaterThanOrEqual(minUnique);
  });

  it('has no duplicate chains', () => {
    const keys = new Set(bank.map(p => p.words.join('-')));
    expect(keys.size).toBe(bank.length);
  });
});
