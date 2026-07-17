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

const STANDARD_BANKS: StandardBankSpec[] = [
  // Measured 2026-07-14: 470 / 470 eligible.
  { name: 'EASY', bank: PUZZLE_BANK_EASY, minEligible: 420 },
  // Measured 2026-07-14: 451 / 472 eligible.
  { name: 'MEDIUM', bank: PUZZLE_BANK_MEDIUM, minEligible: 350 },
  // Measured 2026-07-14: 449 / 474 eligible.
  { name: 'MEDIUM_PLUS', bank: PUZZLE_BANK_MEDIUM_PLUS, minEligible: 280 },
  // Measured 2026-07-14: 325 / 438 eligible.
  { name: 'HARD', bank: PUZZLE_BANK_HARD, minEligible: 195 },
];

describe.each(STANDARD_BANKS)(
  'Unbroken Weave standard-bank eligibility: $name',
  ({ bank, minEligible }) => {
    it(`keeps at least ${minEligible} canonical solutions eligible`, () => {
      const eligibleCount = bank.filter((puzzle) =>
        isUnbrokenWeaveEligible(puzzle.solution),
      ).length;

      expect(eligibleCount).toBeGreaterThanOrEqual(minEligible);
    });
  },
);
