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
 * per-bank cap, a unique-word floor, and a puzzle-count floor (~10-15% under
 * measured) so a future regeneration can't silently regress variety.
 *
 * Recalibrated after the puzzle-content overhaul: the hygiene purge
 * (juvenile/slur/archaic words) dropped puzzles, the marquee dread injection
 * added 36 high-dread boards to MEDIUM/MEDIUM_PLUS/HARD (deliberately
 * raising those caps — the marquee family VOID/AVOID/TOMB/GRAVE/WRATH/WRAITH
 * is allowed to repeat a little more than ordinary vocabulary), and the
 * stored-solution repair pass regenerated broken solutions (shifting a few
 * formed-word usages). Caps below are the exact measured maxima of the
 * committed data.
 *
 * Recalibrated again after hygiene pass 2 (anatomical terms + proper nouns
 * + abbreviations + obscure jargon: PENIS/PUBIC/VITA/BETH/TONY/MIL/BROS/
 * FRAT/WORT and the crude formable set — see purgeProfanity.mjs): 66
 * puzzles dropped by the purge, a further 52 dropped as chain-unsolvable
 * under the shrunk dictionary, 2 stored solutions regenerated.
 *
 * Recalibrated after the multi-route branching top-up
 * (scripts/generateBranchingTopUp{A,B}.test.ts): the four standard banks
 * gained generator-fresh multi-path boards under the SAME pinned caps
 * (EASY +92, MEDIUM +76, MEDIUM_PLUS +47, HARD +19), so caps are unchanged
 * and the unique/puzzle floors below rose to ~10% under the new measured.
 *
 * Recalibrated after branching top-up ROUND 2 (MEDIUM +32, MEDIUM_PLUS +38,
 * HARD +39): the 5-letter banks' caps were deliberately RAISED for that
 * round (MEDIUM_PLUS 8 -> 10, HARD 10 -> 12) — the cap protects vocabulary
 * diversity, but on those banks the dread-steered vocabulary saturates it
 * long before the branching gate is satisfiable (round 1: 79-91% of HARD
 * candidates hit an at-cap word). A +2 cap trades marginal repetition,
 * still guarded by the unique-word floors below, for choice-rich supply.
 * EASY (cap 3) and MEDIUM (cap 7) caps were NOT raised. Caps below remain
 * the exact measured maxima of the committed data.
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
  // Measured (2026-07 depth-lever regeneration, all 12 banks: standard banks are
  // multi-route by construction with the D3-fixed path counting + playable-vocab
  // FEATURED band; reverse regenerated to full size with a forward-S-share
  // anti-boring cap; double refreshed on the 2x dictionary. Word diversity is
  // dramatically higher across the board. Floors ~10% under measured):
  // EASY 453 / max 3 / 1566 unique
  { name: 'EASY', bank: PUZZLE_BANK_EASY, cap: 3, minUnique: 1409, minPuzzles: 407 },
  // MEDIUM 338 / max 7 / 1336 unique
  { name: 'MEDIUM', bank: PUZZLE_BANK_MEDIUM, cap: 7, minUnique: 1202, minPuzzles: 304 },
  // MEDIUM_PLUS 500 / max 10 / 1889 unique
  { name: 'MEDIUM_PLUS', bank: PUZZLE_BANK_MEDIUM_PLUS, cap: 10, minUnique: 1700, minPuzzles: 450 },
  // HARD 457 / max 12 / 1918 unique
  { name: 'HARD', bank: PUZZLE_BANK_HARD, cap: 12, minUnique: 1726, minPuzzles: 411 },
  // REVERSE_EASY 500 / max 6 / 1901 unique
  { name: 'REVERSE_EASY', bank: PUZZLE_BANK_REVERSE_EASY, cap: 6, minUnique: 1710, minPuzzles: 450 },
  // REVERSE_MEDIUM 500 / max 8 / 2107 unique
  { name: 'REVERSE_MEDIUM', bank: PUZZLE_BANK_REVERSE_MEDIUM, cap: 8, minUnique: 1896, minPuzzles: 450 },
  // REVERSE_MEDIUM_PLUS 500 / max 10 / 2436 unique
  { name: 'REVERSE_MEDIUM_PLUS', bank: PUZZLE_BANK_REVERSE_MEDIUM_PLUS, cap: 10, minUnique: 2192, minPuzzles: 450 },
  // REVERSE_HARD 500 / max 12 / 2592 unique
  { name: 'REVERSE_HARD', bank: PUZZLE_BANK_REVERSE_HARD, cap: 12, minUnique: 2332, minPuzzles: 450 },
  // DOUBLE_EASY 494 / max 3 / 2047 unique
  { name: 'DOUBLE_EASY', bank: PUZZLE_BANK_DOUBLE_SHIFT_EASY, cap: 3, minUnique: 1842, minPuzzles: 444 },
  // DOUBLE_MEDIUM 495 / max 5 / 2370 unique
  { name: 'DOUBLE_MEDIUM', bank: PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM, cap: 5, minUnique: 2133, minPuzzles: 445 },
  // DOUBLE_MEDIUM_PLUS 496 / max 8 / 2528 unique
  { name: 'DOUBLE_MEDIUM_PLUS', bank: PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM_PLUS, cap: 8, minUnique: 2275, minPuzzles: 446 },
  // DOUBLE_HARD 491 / max 10 / 2676 unique
  { name: 'DOUBLE_HARD', bank: PUZZLE_BANK_DOUBLE_SHIFT_HARD, cap: 10, minUnique: 2408, minPuzzles: 441 },
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
