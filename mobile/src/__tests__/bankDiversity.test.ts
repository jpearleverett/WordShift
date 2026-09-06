/**
 * Diversity and capacity guards for the pools players can actually receive.
 *
 * Fresh vocabulary/route filtering makes historical stored counts misleading.
 * Floors are calibrated from the 2026-09-06 delivery audit, with a minimum of
 * 100 eligible boards per family and roughly 90% of measured depth/word variety.
 * Existing per-word caps and 30% structural-monotony guards remain unchanged.
 * See docs/PUZZLE_BANK_TOP_UP_2026-09-06.md for before/after evidence.
 */
import { COMMON_WORDS } from '../constants/wordLists';
import { qualifyFreshBankPuzzle } from '../services/bankDeliveryPolicy';
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
// Expert and Lexicon have dedicated banks for every variant.
import { PUZZLE_BANK_EXPERT } from '../data/puzzleBankExpert';
import { PUZZLE_BANK_DOUBLE_SHIFT_EXPERT } from '../data/puzzleBankDoubleShiftExpert';
import { LEXICON_BANK_EASY } from '../data/lexiconBankEasy';
import { LEXICON_BANK_MEDIUM } from '../data/lexiconBankMedium';
import { LEXICON_BANK_MEDIUM_PLUS } from '../data/lexiconBankMediumPlus';
import { LEXICON_BANK_HARD } from '../data/lexiconBankHard';
import { LEXICON_BANK_EXPERT } from '../data/lexiconBankExpert';
import { LEXICON_BANK_DOUBLE_EASY } from '../data/lexiconBankDoubleShiftEasy';
import { LEXICON_BANK_DOUBLE_MEDIUM } from '../data/lexiconBankDoubleShiftMedium';
import { LEXICON_BANK_DOUBLE_MEDIUM_PLUS } from '../data/lexiconBankDoubleShiftMediumPlus';
import { LEXICON_BANK_DOUBLE_HARD } from '../data/lexiconBankDoubleShiftHard';
import { LEXICON_BANK_DOUBLE_EXPERT } from '../data/lexiconBankDoubleShiftExpert';
// Reverse Expert and all five Lexicon Reverse difficulties.
import { PUZZLE_BANK_REVERSE_EXPERT } from '../data/puzzleBankReverseExpert';
import { LEXICON_BANK_REVERSE_EASY } from '../data/lexiconBankReverseEasy';
import { LEXICON_BANK_REVERSE_MEDIUM } from '../data/lexiconBankReverseMedium';
import { LEXICON_BANK_REVERSE_MEDIUM_PLUS } from '../data/lexiconBankReverseMediumPlus';
import { LEXICON_BANK_REVERSE_HARD } from '../data/lexiconBankReverseHard';
import { LEXICON_BANK_REVERSE_EXPERT } from '../data/lexiconBankReverseExpert';
import { PreGeneratedPuzzle } from '../data/puzzleBankTypes';

interface BankSpec {
  name: string;
  bank: PreGeneratedPuzzle[];
  cap: number;
  minUnique: number;
  minPuzzles: number;
}

const BANKS: BankSpec[] = [
  { name: 'EASY', bank: PUZZLE_BANK_EASY, cap: 3, minUnique: 1072, minPuzzles: 290 },
  { name: 'MEDIUM', bank: PUZZLE_BANK_MEDIUM, cap: 7, minUnique: 847, minPuzzles: 181 },
  { name: 'MEDIUM_PLUS', bank: PUZZLE_BANK_MEDIUM_PLUS, cap: 10, minUnique: 720, minPuzzles: 144 },
  { name: 'HARD', bank: PUZZLE_BANK_HARD, cap: 12, minUnique: 571, minPuzzles: 100 },
  { name: 'REVERSE_EASY', bank: PUZZLE_BANK_REVERSE_EASY, cap: 6, minUnique: 1191, minPuzzles: 253 },
  { name: 'REVERSE_MEDIUM', bank: PUZZLE_BANK_REVERSE_MEDIUM, cap: 8, minUnique: 1203, minPuzzles: 184 },
  { name: 'REVERSE_MEDIUM_PLUS', bank: PUZZLE_BANK_REVERSE_MEDIUM_PLUS, cap: 10, minUnique: 729, minPuzzles: 100 },
  { name: 'REVERSE_HARD', bank: PUZZLE_BANK_REVERSE_HARD, cap: 12, minUnique: 774, minPuzzles: 100 },
  { name: 'DOUBLE_EASY', bank: PUZZLE_BANK_DOUBLE_SHIFT_EASY, cap: 3, minUnique: 1017, minPuzzles: 226 },
  { name: 'DOUBLE_MEDIUM', bank: PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM, cap: 5, minUnique: 883, minPuzzles: 152 },
  { name: 'DOUBLE_MEDIUM_PLUS', bank: PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM_PLUS, cap: 8, minUnique: 781, minPuzzles: 110 },
  { name: 'DOUBLE_HARD', bank: PUZZLE_BANK_DOUBLE_SHIFT_HARD, cap: 10, minUnique: 771, minPuzzles: 100 },
  { name: 'EXPERT', bank: PUZZLE_BANK_EXPERT, cap: 10, minUnique: 558, minPuzzles: 100 },
  { name: 'DS_EXPERT', bank: PUZZLE_BANK_DOUBLE_SHIFT_EXPERT, cap: 10, minUnique: 860, minPuzzles: 100 },
  { name: 'LEX_EASY', bank: LEXICON_BANK_EASY, cap: 3, minUnique: 735, minPuzzles: 181 },
  { name: 'LEX_MEDIUM', bank: LEXICON_BANK_MEDIUM, cap: 7, minUnique: 740, minPuzzles: 166 },
  { name: 'LEX_MEDIUM_PLUS', bank: LEXICON_BANK_MEDIUM_PLUS, cap: 10, minUnique: 515, minPuzzles: 113 },
  { name: 'LEX_HARD', bank: LEXICON_BANK_HARD, cap: 12, minUnique: 478, minPuzzles: 100 },
  { name: 'LEX_EXPERT', bank: LEXICON_BANK_EXPERT, cap: 10, minUnique: 432, minPuzzles: 100 },
  { name: 'LEX_DS_EASY', bank: LEXICON_BANK_DOUBLE_EASY, cap: 3, minUnique: 689, minPuzzles: 157 },
  { name: 'LEX_DS_MEDIUM', bank: LEXICON_BANK_DOUBLE_MEDIUM, cap: 5, minUnique: 797, minPuzzles: 140 },
  { name: 'LEX_DS_MEDIUM_PLUS', bank: LEXICON_BANK_DOUBLE_MEDIUM_PLUS, cap: 8, minUnique: 690, minPuzzles: 106 },
  { name: 'LEX_DS_HARD', bank: LEXICON_BANK_DOUBLE_HARD, cap: 10, minUnique: 679, minPuzzles: 100 },
  { name: 'LEX_DS_EXPERT', bank: LEXICON_BANK_DOUBLE_EXPERT, cap: 15, minUnique: 628, minPuzzles: 100 },
  { name: 'REVERSE_EXPERT', bank: PUZZLE_BANK_REVERSE_EXPERT, cap: 10, minUnique: 639, minPuzzles: 100 },
  { name: 'LEX_REV_EASY', bank: LEXICON_BANK_REVERSE_EASY, cap: 6, minUnique: 743, minPuzzles: 141 },
  { name: 'LEX_REV_MEDIUM', bank: LEXICON_BANK_REVERSE_MEDIUM, cap: 8, minUnique: 780, minPuzzles: 121 },
  { name: 'LEX_REV_MEDIUM_PLUS', bank: LEXICON_BANK_REVERSE_MEDIUM_PLUS, cap: 10, minUnique: 613, minPuzzles: 100 },
  { name: 'LEX_REV_HARD', bank: LEXICON_BANK_REVERSE_HARD, cap: 12, minUnique: 688, minPuzzles: 100 },
  { name: 'LEX_REV_EXPERT', bank: LEXICON_BANK_REVERSE_EXPERT, cap: 15, minUnique: 354, minPuzzles: 100 },
];

const FRESH_BANKS = BANKS.map(spec => {
  const advanced = spec.name.includes('EXPERT') || spec.name.startsWith('LEX_');
  const variant = /REVERSE|REV_/.test(spec.name) ? 'reverse'
    : /DOUBLE|DS_/.test(spec.name) ? 'double_shift' : 'standard';
  const bank = spec.bank.map(puzzle => qualifyFreshBankPuzzle(
    puzzle, advanced, variant, word => COMMON_WORDS.has(word),
  )).filter((puzzle): puzzle is PreGeneratedPuzzle => puzzle !== null);
  return { ...spec, bank };
});

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

describe.each(FRESH_BANKS)('bank diversity: $name', ({ bank, cap, minUnique, minPuzzles }) => {
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

  // Structural-monotony guards (B1): a word-cap alone can't see a bank that is
  // dominated by one starting letter, one moved letter (the S-shuffle), or one
  // shift shape. Thresholds sit well above the measured maxima (start ~18%,
  // moved ~18%, S-share ~20%) so they pass today and catch a future regression.
  it('no single starting letter dominates the chains', () => {
    const starts = new Map<string, number>();
    for (const p of bank) starts.set(p.words[0][0], (starts.get(p.words[0][0]) ?? 0) + 1);
    const maxShare = Math.max(...starts.values()) / bank.length;
    expect(maxShare).toBeLessThanOrEqual(0.30);
  });

  it('no single first-moved letter dominates', () => {
    const moved = new Map<string, number>();
    for (const p of bank) {
      const ml = (p.solution?.[0]?.letterToMove ?? '').toUpperCase();
      if (ml) moved.set(ml, (moved.get(ml) ?? 0) + 1);
    }
    const maxShare = Math.max(...moved.values()) / bank.length;
    expect(maxShare).toBeLessThanOrEqual(0.30);
  });

  it('S is not the runaway moved letter (S-shuffle guard)', () => {
    let sMoves = 0, allMoves = 0;
    for (const p of bank) for (const step of p.solution ?? []) {
      allMoves++;
      if ((step.letterToMove ?? '').toUpperCase() === 'S') sMoves++;
    }
    expect(sMoves / allMoves).toBeLessThanOrEqual(0.30);
  });
});

// Cross-bank overlap guard (B2): the per-bank cap/dedup can't see the same
// chain shipped in two different banks. Currently 0 chains are shared across
// any two banks; keep it that way so players moving between difficulties/
// variants never re-solve an identical board.
describe('cross-bank chain overlap', () => {
  it('no chain appears in more than one bank', () => {
    const chainToBanks = new Map<string, Set<string>>();
    for (const { name, bank } of FRESH_BANKS) {
      for (const p of bank) {
        const key = p.words.join('-');
        if (!chainToBanks.has(key)) chainToBanks.set(key, new Set());
        chainToBanks.get(key)!.add(name);
      }
    }
    const shared = [...chainToBanks.entries()]
      .filter(([, banks]) => banks.size > 1)
      .slice(0, 10)
      .map(([chain, banks]) => `${chain} in ${[...banks].join(',')}`);
    expect(shared).toEqual([]);
  });
});
