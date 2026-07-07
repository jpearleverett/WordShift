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
import { CURATED_EARLY_PUZZLES, FALLBACK_PUZZLES_EASY, FALLBACK_PUZZLES_MEDIUM, FALLBACK_PUZZLES_MEDIUM_PLUS, FALLBACK_PUZZLES_HARD } from '../constants/wordLists';
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

const DICT = new Set<string>(DICTIONARY_WORDS);
const isValid = (w: string) => DICT.has(w.toUpperCase());

type Variant = 'standard' | 'reverse' | 'double_shift';

function auditBank(
  name: string,
  variant: Variant,
  puzzles: Array<{ id: string; words: string[] }>,
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
  const CASES: Array<[string, Variant, Array<{ id: string; words: string[] }>]> = [
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

  test('fallback pools are winnable (standard rules)', () => {
    for (const [name, pool] of [
      ['EASY', FALLBACK_PUZZLES_EASY],
      ['MEDIUM', FALLBACK_PUZZLES_MEDIUM],
      ['MEDIUM_PLUS', FALLBACK_PUZZLES_MEDIUM_PLUS],
      ['HARD', FALLBACK_PUZZLES_HARD],
    ] as const) {
      for (const words of pool) {
        const r = isChainSolvable('standard', words, isValid);
        if (r !== 'solvable') {
          throw new Error(`fallback ${name} ${words.join('-')} -> ${r}`);
        }
      }
    }
  });
});
