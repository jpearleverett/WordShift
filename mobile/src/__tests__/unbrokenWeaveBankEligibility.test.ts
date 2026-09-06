import { LEXICON_BANK_EXPERT } from '../data/lexiconBankExpert';
import { LEXICON_BANK_HARD } from '../data/lexiconBankHard';
import { LEXICON_BANK_MEDIUM_PLUS } from '../data/lexiconBankMediumPlus';
import { LEXICON_BANK_MEDIUM } from '../data/lexiconBankMedium';
import { LEXICON_BANK_EASY } from '../data/lexiconBankEasy';
import { PUZZLE_BANK_EXPERT } from '../data/puzzleBankExpert';
import { COMMON_WORDS } from '../constants/wordLists';
import { qualifyFreshBankPuzzle } from '../services/bankDeliveryPolicy';
import { PUZZLE_BANK_EASY } from '../data/puzzleBankEasy';
import { PUZZLE_BANK_MEDIUM } from '../data/puzzleBankMedium';
import { PUZZLE_BANK_MEDIUM_PLUS } from '../data/puzzleBankMediumPlus';
import { PUZZLE_BANK_HARD } from '../data/puzzleBankHard';
import { PreGeneratedPuzzle } from '../data/puzzleBankTypes';
import { isUnbrokenWeaveEligible } from '../services/unbrokenWeave';

interface StandardBankSpec {
  name: string;
  bank: PreGeneratedPuzzle[];
  minEligible: number;
}

// Floors retain roughly 90% of the measured 2026-09-06 fresh-qualified
// canonical solutions, including Expert and all Lexicon Standard banks.
const STANDARD_BANKS: StandardBankSpec[] = [
  { name: 'LEX_EXPERT', bank: LEXICON_BANK_EXPERT, minEligible: 75 },
  { name: 'LEX_HARD', bank: LEXICON_BANK_HARD, minEligible: 82 },
  { name: 'LEX_MEDIUM_PLUS', bank: LEXICON_BANK_MEDIUM_PLUS, minEligible: 109 },
  { name: 'LEX_MEDIUM', bank: LEXICON_BANK_MEDIUM, minEligible: 161 },
  { name: 'LEX_EASY', bank: LEXICON_BANK_EASY, minEligible: 181 },
  { name: 'EXPERT', bank: PUZZLE_BANK_EXPERT, minEligible: 75 },
  { name: 'EASY', bank: PUZZLE_BANK_EASY, minEligible: 290 },
  { name: 'MEDIUM', bank: PUZZLE_BANK_MEDIUM, minEligible: 172 },
  { name: 'MEDIUM_PLUS', bank: PUZZLE_BANK_MEDIUM_PLUS, minEligible: 135 },
  { name: 'HARD', bank: PUZZLE_BANK_HARD, minEligible: 78 },
];

describe.each(STANDARD_BANKS)(
  'Unbroken Weave standard-bank eligibility: $name',
  ({ name, bank, minEligible }) => {
    it(`keeps at least ${minEligible} canonical solutions eligible`, () => {
      const advanced = name.includes('EXPERT') || name.startsWith('LEX_');
      const eligibleCount = bank.map(puzzle => qualifyFreshBankPuzzle(
        puzzle, advanced, 'standard', word => COMMON_WORDS.has(word),
      )).filter(puzzle => puzzle !== null && isUnbrokenWeaveEligible(puzzle.solution)).length;

      expect(eligibleCount).toBeGreaterThanOrEqual(minEligible);
    });
  },
);
