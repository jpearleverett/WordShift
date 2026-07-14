import fs from 'fs';
import path from 'path';
import { DICTIONARY_WORDS } from '../dictionary';
import { BLOCKED_WORDS, BLOCKED_WORD_SET } from '../constants/blockedWords';
import type { PreGeneratedPuzzle } from '../data/puzzleBankTypes';
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

const BANKS: PreGeneratedPuzzle[][] = [
  PUZZLE_BANK_EASY,
  PUZZLE_BANK_MEDIUM,
  PUZZLE_BANK_MEDIUM_PLUS,
  PUZZLE_BANK_HARD,
  PUZZLE_BANK_REVERSE_EASY,
  PUZZLE_BANK_REVERSE_MEDIUM,
  PUZZLE_BANK_REVERSE_MEDIUM_PLUS,
  PUZZLE_BANK_REVERSE_HARD,
  PUZZLE_BANK_DOUBLE_SHIFT_EASY,
  PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM,
  PUZZLE_BANK_DOUBLE_SHIFT_MEDIUM_PLUS,
  PUZZLE_BANK_DOUBLE_SHIFT_HARD,
];

describe('launch vocabulary hygiene', () => {
  test('the playable dictionary excludes every runtime-blocked word', () => {
    const leaked = DICTIONARY_WORDS.filter(word => BLOCKED_WORD_SET.has(word));
    expect(leaked).toEqual([]);
  });

  test('every bank allWords entry excludes every runtime-blocked word', () => {
    const leaked: string[] = [];
    for (const bank of BANKS) {
      for (const puzzle of bank) {
        for (const word of puzzle.allWords) {
          if (BLOCKED_WORD_SET.has(word)) leaked.push(`${puzzle.id}:${word}`);
        }
      }
    }
    expect(leaked).toEqual([]);
  });

  test('canonical hidden source remainders exclude every runtime-blocked word', () => {
    const leaked: string[] = [];
    for (const bank of BANKS) {
      for (const puzzle of bank) {
        for (const step of puzzle.solution) {
          const removals = step.removalPositions ?? (
            step.removalPosition === undefined ? [] : [step.removalPosition]
          );
          const remainder = removals
            .slice()
            .sort((a, b) => b - a)
            .reduce(
              (word, index) => word.slice(0, index) + word.slice(index + 1),
              step.sourceWord,
            );
          if (BLOCKED_WORD_SET.has(remainder)) {
            leaked.push(`${puzzle.id}:${step.stepIndex}:source:${remainder}`);
          }
        }
      }
    }
    expect(leaked).toEqual([]);
  });

  test('canonical Double Shift drop1 source and target intermediates exclude blocked words', () => {
    const leaked: string[] = [];
    for (const bank of BANKS.filter(candidate =>
      candidate.some(puzzle => puzzle.isDoubleShift),
    )) {
      for (const puzzle of bank) {
        for (const step of puzzle.solution) {
          const firstRemoval = step.removalPositions?.[0];
          const firstInsertion = step.insertionPositions?.[0];
          const firstLetter = step.lettersToMove?.[0];
          expect(firstRemoval).toBeDefined();
          expect(firstInsertion).toBeDefined();
          expect(firstLetter).toBeDefined();
          const sourceIntermediate =
            step.sourceWord.slice(0, firstRemoval) +
            step.sourceWord.slice(firstRemoval! + 1);
          const targetIntermediate =
            step.targetWord.slice(0, firstInsertion) +
            firstLetter +
            step.targetWord.slice(firstInsertion);
          if (BLOCKED_WORD_SET.has(sourceIntermediate)) {
            leaked.push(`${puzzle.id}:${step.stepIndex}:drop1-source:${sourceIntermediate}`);
          }
          if (BLOCKED_WORD_SET.has(targetIntermediate)) {
            leaked.push(`${puzzle.id}:${step.stepIndex}:drop1-target:${targetIntermediate}`);
          }
        }
      }
    }
    expect(leaked).toEqual([]);
  });

  test('the purge tool parses the runtime TypeScript blocked-word source', () => {
    const script = fs.readFileSync(
      path.join(process.cwd(), 'scripts/tools/purgeProfanity.mjs'),
      'utf8',
    );
    expect(BLOCKED_WORDS.length).toBeGreaterThan(100);
    expect(script).toContain('src/constants/blockedWords.ts');
    expect(script).not.toMatch(/export const BLOCKED_WORDS\s*=/);
  });
});
