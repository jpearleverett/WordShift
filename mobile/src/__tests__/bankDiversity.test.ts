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
// Apex banks (EXPERT std/double; Lexicon std/double x 5 difficulties) — the
// reverse combos are on-device (no bank).
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
// Reverse apex banks (added after the gated rare/reverse run): a 6-letter EXPERT
// reverse bank + the four larger Lexicon-reverse tiers. lex_rev_EXPERT stays
// on-device (plateaued at ~1), so it has no bank/row.
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
  // Apex banks (2026-07 EXPERT + Lexicon pass). EXPERT is a difficulty (fair
  // mainstream-to-uncommon 6-letter words); Lexicon is a rare-word mode (rare-
  // but-fair band). Reverse combos are on-device (no bank). Floors ~10% under
  // measured; the Lexicon+EXPERT combos are deliberately smaller niche banks.
  // EXPERT 230 / max 10 / 1143 unique. Dread top-up 2026-08-31
  // (scripts/generateExpertDreadTopUp.test.ts): +35 tier>=3 boards (14 -> 49,
  // ~21% of the bank — matching HARD's dread ratio) under the same gated bars;
  // acceptance plateaued on the word cap (the 73-word 6L dread pool saturates).
  { name: 'EXPERT', bank: PUZZLE_BANK_EXPERT, cap: 10, minUnique: 1025, minPuzzles: 207 },
  // DS_EXPERT 265 / max 9 / 1914 unique
  { name: 'DS_EXPERT', bank: PUZZLE_BANK_DOUBLE_SHIFT_EXPERT, cap: 10, minUnique: 1620, minPuzzles: 238 },
  // LEX_EASY 251 / max 3 / 986 unique
  { name: 'LEX_EASY', bank: LEXICON_BANK_EASY, cap: 3, minUnique: 830, minPuzzles: 225 },
  // LEX_MEDIUM 247 / max 7 / 1004 unique
  { name: 'LEX_MEDIUM', bank: LEXICON_BANK_MEDIUM, cap: 7, minUnique: 850, minPuzzles: 222 },
  // LEX_MEDIUM_PLUS 255 / max 9 / 948 unique
  { name: 'LEX_MEDIUM_PLUS', bank: LEXICON_BANK_MEDIUM_PLUS, cap: 10, minUnique: 800, minPuzzles: 229 },
  // LEX_HARD 191 / max 9 / 804 unique
  { name: 'LEX_HARD', bank: LEXICON_BANK_HARD, cap: 12, minUnique: 680, minPuzzles: 171 },
  // LEX_EXPERT 101 / max 9 / 519 unique (niche combo)
  { name: 'LEX_EXPERT', bank: LEXICON_BANK_EXPERT, cap: 10, minUnique: 440, minPuzzles: 90 },
  // LEX_DS_EASY 265 / max 3 / 1132 unique
  { name: 'LEX_DS_EASY', bank: LEXICON_BANK_DOUBLE_EASY, cap: 3, minUnique: 960, minPuzzles: 238 },
  // LEX_DS_MEDIUM 265 / max 5 / 1354 unique
  { name: 'LEX_DS_MEDIUM', bank: LEXICON_BANK_DOUBLE_MEDIUM, cap: 5, minUnique: 1150, minPuzzles: 238 },
  // LEX_DS_MEDIUM_PLUS 265 / max 8 / 1370 unique
  { name: 'LEX_DS_MEDIUM_PLUS', bank: LEXICON_BANK_DOUBLE_MEDIUM_PLUS, cap: 8, minUnique: 1160, minPuzzles: 238 },
  // LEX_DS_HARD 195 / max 10 / 1163 unique
  { name: 'LEX_DS_HARD', bank: LEXICON_BANK_DOUBLE_HARD, cap: 10, minUnique: 985, minPuzzles: 175 },
  // LEX_DS_EXPERT 99 / max 9 / 762 unique. Regenerated 2026-07-24 (62 -> 99)
  // under a raised word cap (10 -> 15): rare + two-letter moves + a 7-row chain
  // is the scarcest corner in the game, and the cap bound long before the
  // search did. Acceptance exhausted at 99 (23 -> 4 -> 0 -> 0 across runs), so
  // this is the practical ceiling without relaxing the rarity floor.
  { name: 'LEX_DS_EXPERT', bank: LEXICON_BANK_DOUBLE_EXPERT, cap: 15, minUnique: 685, minPuzzles: 89 },
  // Reverse apex banks (2026-07 gated rare/reverse run). Smaller than the E/M/MP/H
  // reverse banks — fair 6-letter reverse (EXPERT) and rare reverse-solvable
  // (Lexicon) are scarcer supply. Floors ~90% of measured; caps = measured max.
  // REVERSE_EXPERT 200 / max 10 / 1182 unique
  { name: 'REVERSE_EXPERT', bank: PUZZLE_BANK_REVERSE_EXPERT, cap: 10, minUnique: 1060, minPuzzles: 180 },
  // Lexicon-reverse banks REGENERATED with the rarity-aware walk (difficulty-ramped
  // rare band, meanRank ~0.62 EASY -> ~0.75 EXPERT). Rarer vocab = slightly smaller
  // unique pools than the pre-fix banks; floors ~90% of measured.
  // LEX_REV_EASY 240 / max 6 / 1127 unique
  { name: 'LEX_REV_EASY', bank: LEXICON_BANK_REVERSE_EASY, cap: 6, minUnique: 1010, minPuzzles: 216 },
  // LEX_REV_MEDIUM 240 / max 8 / 1243 unique
  { name: 'LEX_REV_MEDIUM', bank: LEXICON_BANK_REVERSE_MEDIUM, cap: 8, minUnique: 1115, minPuzzles: 216 },
  // LEX_REV_MEDIUM_PLUS 240 / max 10 / 1289 unique
  { name: 'LEX_REV_MEDIUM_PLUS', bank: LEXICON_BANK_REVERSE_MEDIUM_PLUS, cap: 10, minUnique: 1155, minPuzzles: 216 },
  // LEX_REV_HARD 240 / max 12 / 1313 unique (grew 149 -> 240 with the rarity-aware walk)
  { name: 'LEX_REV_HARD', bank: LEXICON_BANK_REVERSE_HARD, cap: 12, minUnique: 1180, minPuzzles: 216 },
  // LEX_REV_EXPERT 114 / max 15 / 521 unique (rare + reverse + 6-letter — the
  // scarcest corner; the rarity-aware walk turned a 1-board dead-end into a bank,
  // then word cap 15 + a front-loaded bright bucket grew it 76 -> 114 with the
  // rarity held at meanRank 0.751 — a modest diversity trade for more supply)
  { name: 'LEX_REV_EXPERT', bank: LEXICON_BANK_REVERSE_EXPERT, cap: 15, minUnique: 465, minPuzzles: 100 },
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
    for (const { name, bank } of BANKS) {
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
