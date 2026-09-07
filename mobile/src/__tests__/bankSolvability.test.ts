/**
 * Every shipped puzzle must be WINNABLE under the game's actual validation
 * rules. This guard exists because two failure classes shipped once:
 * (1) the profanity purge removed words from the dictionary while chains
 *     requiring them as transient source remainders survived, and
 * (2) the reverse generator's solvability check was looser than the shipped
 *     rules (it allowed intermediate boards the app rejects).
 * The solver in services/puzzleSolvability.ts replicates handleSlotPress
 * exactly (locking semantics included). If this test fails after a bank
 * regeneration or a dictionary change, the listed puzzles must be purged or
 * the generator fixed — never ship an unwinnable board.
 */
import { DICTIONARY_WORDS } from '../dictionary';
import { isChainSolvable, SolvabilityResult } from '../services/puzzleSolvability';
import { COMMON_WORDS, CURATED_EARLY_PUZZLES, CURATED_FINAL_PUZZLE, FALLBACK_PUZZLES_EASY, FALLBACK_PUZZLES_MEDIUM, FALLBACK_PUZZLES_MEDIUM_PLUS, FALLBACK_PUZZLES_HARD } from '../constants/wordLists';
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
// EXPERT (apex) banks — standard + double + a 6-letter reverse bank (added after
// the gated rare/reverse run; EXPERT+reverse+Lexicon stays on-device).
import { PUZZLE_BANK_EXPERT } from '../data/puzzleBankExpert';
import { PUZZLE_BANK_DOUBLE_SHIFT_EXPERT } from '../data/puzzleBankDoubleShiftExpert';
import { PUZZLE_BANK_REVERSE_EXPERT } from '../data/puzzleBankReverseExpert';
// Lexicon (rare-word) banks — standard/reverse/double x 5 difficulties
import { LEXICON_BANK_EASY } from '../data/lexiconBankEasy';
import { LEXICON_BANK_MEDIUM } from '../data/lexiconBankMedium';
import { LEXICON_BANK_MEDIUM_PLUS } from '../data/lexiconBankMediumPlus';
import { LEXICON_BANK_HARD } from '../data/lexiconBankHard';
import { LEXICON_BANK_EXPERT } from '../data/lexiconBankExpert';
// Lexicon + REVERSE: the four larger tiers have banks (added after the gated
// rare/reverse run); only lex_rev_EXPERT stays on-device (plateaued at ~1).
import { LEXICON_BANK_REVERSE_EASY } from '../data/lexiconBankReverseEasy';
import { LEXICON_BANK_REVERSE_MEDIUM } from '../data/lexiconBankReverseMedium';
import { LEXICON_BANK_REVERSE_MEDIUM_PLUS } from '../data/lexiconBankReverseMediumPlus';
import { LEXICON_BANK_REVERSE_HARD } from '../data/lexiconBankReverseHard';
import { LEXICON_BANK_REVERSE_EXPERT } from '../data/lexiconBankReverseExpert';
import { LEXICON_BANK_DOUBLE_EASY } from '../data/lexiconBankDoubleShiftEasy';
import { LEXICON_BANK_DOUBLE_MEDIUM } from '../data/lexiconBankDoubleShiftMedium';
import { LEXICON_BANK_DOUBLE_MEDIUM_PLUS } from '../data/lexiconBankDoubleShiftMediumPlus';
import { LEXICON_BANK_DOUBLE_HARD } from '../data/lexiconBankDoubleShiftHard';
import { LEXICON_BANK_DOUBLE_EXPERT } from '../data/lexiconBankDoubleShiftExpert';

const DICT = new Set<string>(DICTIONARY_WORDS);
const isValid = (w: string) => DICT.has(w.toUpperCase());

type Variant = 'standard' | 'reverse' | 'double_shift';

function auditBank(
  name: string,
  variant: Variant,
  puzzles: { id: string; words: string[] }[],
): { bad: string[]; inconclusive: string[] } {
  const bad: string[] = [];
  const inconclusive: string[] = [];
  for (const p of puzzles) {
    const r: SolvabilityResult = isChainSolvable(variant, p.words, isValid);
    if (r === 'unsolvable') bad.push(`${name}:${p.id}:${p.words.join('-')}`);
    else if (r === 'inconclusive') inconclusive.push(`${name}:${p.id}`);
  }
  return { bad, inconclusive };
}

describe('bank solvability (shipped rules)', () => {
  const CASES: [string, Variant, { id: string; words: string[] }[]][] = [
    ['EASY', 'standard', PUZZLE_BANK_EASY],
    ['MEDIUM', 'standard', PUZZLE_BANK_MEDIUM],
    ['MEDIUM_PLUS', 'standard', PUZZLE_BANK_MEDIUM_PLUS],
    ['HARD', 'standard', PUZZLE_BANK_HARD],
    ['REVERSE_EASY', 'reverse', PUZZLE_BANK_REVERSE_EASY],
    ['REVERSE_MEDIUM', 'reverse', PUZZLE_BANK_REVERSE_MEDIUM],
    ['REVERSE_MEDIUM_PLUS', 'reverse', PUZZLE_BANK_REVERSE_MEDIUM_PLUS],
    ['REVERSE_HARD', 'reverse', PUZZLE_BANK_REVERSE_HARD],
    ['DS_EASY', 'double_shift', PUZZLE_BANK_DOUBLE_SHIFT_EASY],
    ['DS_MEDIUM', 'double_shift', PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM],
    ['DS_MEDIUM_PLUS', 'double_shift', PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM_PLUS],
    ['DS_HARD', 'double_shift', PUZZLE_BANK_DOUBLE_SHIFT_HARD],
    ['EXPERT', 'standard', PUZZLE_BANK_EXPERT],
    ['DS_EXPERT', 'double_shift', PUZZLE_BANK_DOUBLE_SHIFT_EXPERT],
    ['REVERSE_EXPERT', 'reverse', PUZZLE_BANK_REVERSE_EXPERT],
    ['LEX_REV_EASY', 'reverse', LEXICON_BANK_REVERSE_EASY],
    ['LEX_REV_MEDIUM', 'reverse', LEXICON_BANK_REVERSE_MEDIUM],
    ['LEX_REV_MEDIUM_PLUS', 'reverse', LEXICON_BANK_REVERSE_MEDIUM_PLUS],
    ['LEX_REV_HARD', 'reverse', LEXICON_BANK_REVERSE_HARD],
    ['LEX_REV_EXPERT', 'reverse', LEXICON_BANK_REVERSE_EXPERT],
    ['LEX_EASY', 'standard', LEXICON_BANK_EASY],
    ['LEX_MEDIUM', 'standard', LEXICON_BANK_MEDIUM],
    ['LEX_MEDIUM_PLUS', 'standard', LEXICON_BANK_MEDIUM_PLUS],
    ['LEX_HARD', 'standard', LEXICON_BANK_HARD],
    ['LEX_EXPERT', 'standard', LEXICON_BANK_EXPERT],
    ['LEX_DS_EASY', 'double_shift', LEXICON_BANK_DOUBLE_EASY],
    ['LEX_DS_MEDIUM', 'double_shift', LEXICON_BANK_DOUBLE_MEDIUM],
    ['LEX_DS_MEDIUM_PLUS', 'double_shift', LEXICON_BANK_DOUBLE_MEDIUM_PLUS],
    ['LEX_DS_HARD', 'double_shift', LEXICON_BANK_DOUBLE_HARD],
    ['LEX_DS_EXPERT', 'double_shift', LEXICON_BANK_DOUBLE_EXPERT],
  ];

  test.each(CASES)('%s: every puzzle is winnable', (name, variant, bank) => {
    const { bad, inconclusive } = auditBank(name, variant, bank);
    // Inconclusive (node-cap hit) must be investigated, not shipped blindly.
    expect(inconclusive).toEqual([]);
    expect(bad).toEqual([]);
  });

  test('curated early puzzles are winnable (standard rules)', () => {
    for (const p of CURATED_EARLY_PUZZLES) {
      expect(isChainSolvable('standard', p.words, isValid)).toBe('solvable');
    }
  });

  test('curated final puzzle is a clean, positioned 7x5 standard chain', () => {
    expect(CURATED_FINAL_PUZZLE.words).toHaveLength(7);
    expect(CURATED_FINAL_PUZZLE.words.every(word => word.length === 5)).toBe(true);
    expect(CURATED_FINAL_PUZZLE.solution).toHaveLength(6);
    expect(CURATED_FINAL_PUZZLE.solution.every(step =>
      Number.isInteger(step.removalPosition) && Number.isInteger(step.insertionPosition)
    )).toBe(true);
    expect(isChainSolvable('standard', CURATED_FINAL_PUZZLE.words, isValid)).toBe('solvable');

    const rows = [...CURATED_FINAL_PUZZLE.words];
    const lockedPositions: (number | null)[] = rows.map(() => null);
    const playedWords = new Set(rows);
    for (const step of CURATED_FINAL_PUZZLE.solution) {
      const sourceIndex = step.stepIndex;
      const targetIndex = sourceIndex + 1;
      expect(rows[sourceIndex]).toBe(step.sourceWord);
      expect(rows[targetIndex]).toBe(step.targetWord);
      expect(step.removalPosition).not.toBe(lockedPositions[sourceIndex]);
      expect(step.sourceWord[step.removalPosition]).toBe(step.letterToMove);

      const remainder =
        step.sourceWord.slice(0, step.removalPosition) +
        step.sourceWord.slice(step.removalPosition + 1);
      const formed =
        step.targetWord.slice(0, step.insertionPosition) +
        step.letterToMove +
        step.targetWord.slice(step.insertionPosition);
      expect(isValid(remainder)).toBe(true);
      expect(isValid(formed)).toBe(true);
      rows[sourceIndex] = remainder;
      rows[targetIndex] = formed;
      lockedPositions[targetIndex] = step.insertionPosition;
      playedWords.add(remainder);
      playedWords.add(formed);
    }

    const blockedSource = require('fs').readFileSync(
      require('path').join(__dirname, '../../scripts/tools/purgeProfanity.mjs'),
      'utf8',
    ) as string;
    const blockedSection = blockedSource.match(
      /export const BLOCKED_WORDS = \[([\s\S]*?)\];/,
    )?.[1] ?? '';
    const blocked = new Set(
      Array.from(blockedSection.matchAll(/'([A-Z]+)'/g), match => match[1]),
    );
    expect(Array.from(playedWords).filter(word => blocked.has(word))).toEqual([]);
  });

  test('fallback pools are winnable (standard rules)', () => {
    for (const [name, pool] of [
      ['EASY', FALLBACK_PUZZLES_EASY],
      ['MEDIUM', FALLBACK_PUZZLES_MEDIUM],
      ['MEDIUM_PLUS', FALLBACK_PUZZLES_MEDIUM_PLUS],
      ['HARD', FALLBACK_PUZZLES_HARD],
    ] as const) {
      for (const words of pool) {
        const r = isChainSolvable('standard', words, word => COMMON_WORDS.has(word));
        if (r !== 'solvable') {
          throw new Error(`fallback ${name} ${words.join('-')} -> ${r}`);
        }
      }
    }
  });
});
