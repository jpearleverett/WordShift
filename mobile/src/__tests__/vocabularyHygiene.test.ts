import fs from 'fs';
import path from 'path';
import { DICTIONARY_WORDS } from '../dictionary';
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

const LAUNCH_CURATED_WORDS = [
  'BARF', 'BRA', 'BRAS', 'BRAD', 'CROTCH', 'CROTCHES', 'DAMMIT', 'DRUNK',
  'DRUNKS', 'DUMB', 'FETISH', 'FETISHES', 'IDIOT', 'IDIOTS', 'JERK', 'JERKS',
  'NAKED', 'NIPPLE', 'NIPPLES', 'NUDE', 'NUDITY', 'PUKE', 'PUKED', 'PUKES',
  'PUKING', 'PUSSY', 'PUSSIES', 'RACIAL', 'RACISM', 'RACIST', 'RACISTS',
  'SEXISM', 'SEXIST', 'STUPID', 'SUCK', 'SUCKED', 'SUCKER', 'SUCKERS', 'SUCKS',
  'THUG', 'THUGS', 'TROY', 'URINE', 'UTERUS', 'VIRGIN', 'VIRGINS', 'VOMIT',
  'VOMITED', 'VOMITING', 'VOMITS',
] as const;

const BLOCKED = new Set<string>(LAUNCH_CURATED_WORDS);

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
  test('the playable dictionary excludes the curated awkward-word families', () => {
    const leaked = DICTIONARY_WORDS.filter(word => BLOCKED.has(word));
    expect(leaked).toEqual([]);
  });

  test('every visible and transient bank word excludes the curated families', () => {
    const leaked: string[] = [];
    for (const bank of BANKS) {
      for (const puzzle of bank) {
        for (const word of puzzle.allWords) {
          if (BLOCKED.has(word)) leaked.push(`${puzzle.id}:${word}`);
        }
      }
    }
    expect(leaked).toEqual([]);
  });

  test('the purge tool retains the launch curation list as its source guard', () => {
    const script = fs.readFileSync(
      path.join(process.cwd(), 'scripts/tools/purgeProfanity.mjs'),
      'utf8',
    );
    for (const word of LAUNCH_CURATED_WORDS) {
      expect(script).toContain(`'${word}'`);
    }
  });
});
