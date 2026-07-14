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
  // Measured (2026-07 hygiene pass 2): EASY 470 puzzles / max 3 / 1482 unique
  { name: 'EASY', bank: PUZZLE_BANK_EASY, cap: 3, minUnique: 1330, minPuzzles: 415 },
  // MEDIUM 472 / max 7 (marquee injection) / 1609 unique
  { name: 'MEDIUM', bank: PUZZLE_BANK_MEDIUM, cap: 7, minUnique: 1445, minPuzzles: 420 },
  // MEDIUM_PLUS 474 / max 8 (marquee injection) / 1399 unique
  { name: 'MEDIUM_PLUS', bank: PUZZLE_BANK_MEDIUM_PLUS, cap: 8, minUnique: 1255, minPuzzles: 420 },
  // HARD 438 / max 10 / 1330 unique
  { name: 'HARD', bank: PUZZLE_BANK_HARD, cap: 10, minUnique: 1195, minPuzzles: 390 },
  // REVERSE_EASY 429 / max 7 / 1325 unique
  { name: 'REVERSE_EASY', bank: PUZZLE_BANK_REVERSE_EASY, cap: 7, minUnique: 1190, minPuzzles: 380 },
  // REVERSE_MEDIUM 318 / max 11 (solution-repair pass) / 1304 unique
  { name: 'REVERSE_MEDIUM', bank: PUZZLE_BANK_REVERSE_MEDIUM, cap: 11, minUnique: 1170, minPuzzles: 280 },
  // REVERSE_MEDIUM_PLUS 219 / max 12 / 877 unique
  { name: 'REVERSE_MEDIUM_PLUS', bank: PUZZLE_BANK_REVERSE_MEDIUM_PLUS, cap: 12, minUnique: 785, minPuzzles: 195 },
  // REVERSE_HARD 183 / max 16 / 783 unique
  { name: 'REVERSE_HARD', bank: PUZZLE_BANK_REVERSE_HARD, cap: 16, minUnique: 700, minPuzzles: 160 },
  // DOUBLE_EASY 495 / max 3 / 1619 unique
  { name: 'DOUBLE_EASY', bank: PUZZLE_BANK_DOUBLE_SHIFT_EASY, cap: 3, minUnique: 1455, minPuzzles: 440 },
  // DOUBLE_MEDIUM 458 / max 5 / 1604 unique
  { name: 'DOUBLE_MEDIUM', bank: PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM, cap: 5, minUnique: 1440, minPuzzles: 405 },
  // DOUBLE_MEDIUM_PLUS 474 / max 8 / 1637 unique
  { name: 'DOUBLE_MEDIUM_PLUS', bank: PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM_PLUS, cap: 8, minUnique: 1470, minPuzzles: 420 },
  // DOUBLE_HARD 442 / max 10 / 1617 unique
  { name: 'DOUBLE_HARD', bank: PUZZLE_BANK_DOUBLE_SHIFT_HARD, cap: 10, minUnique: 1450, minPuzzles: 390 },
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
