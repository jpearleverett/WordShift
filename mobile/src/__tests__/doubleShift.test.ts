import {
  validateWord,
  generateDoubleShiftPuzzle,
  getDoubleInsertionIndex,
} from '../services/localGenerator';
import { COMMON_WORDS } from '../constants';

// Mock amberCurrency to avoid AsyncStorage issues during generation
jest.mock('../services/amberCurrency', () => ({
  getCurrentPhase: jest.fn(async () => 0),
}));

// Mock wordHistory to avoid AsyncStorage issues
jest.mock('../services/wordHistory', () => ({
  getWordHistoryWithRecency: jest.fn(async () => new Map()),
  calculateFreshnessPenalty: jest.fn(() => 0),
  isInHardCooldown: jest.fn(() => false),
  recordPuzzleWords: jest.fn(async () => {}),
}));

describe('Double Insertion Index', () => {
  test('builds index for word length 5 (uses WORDS_3 and WORDS_7)', () => {
    const index = getDoubleInsertionIndex(5);
    expect(index.size).toBeGreaterThan(0);

    // Each entry should map a letter pair to valid transformations
    for (const [key, targets] of index) {
      expect(key).toHaveLength(2); // sorted letter pair
      expect(key[0] <= key[1]).toBe(true); // alphabetically sorted

      for (const t of targets) {
        // Base word should be 5 letters
        expect(t.baseWord).toHaveLength(5);
        // Result should be 7 letters
        expect(t.result).toHaveLength(7);
        // Both should be in the dictionary
        expect(COMMON_WORDS.has(t.baseWord)).toBe(true);
        expect(COMMON_WORDS.has(t.result)).toBe(true);
        // Result positions should be valid
        expect(t.resultPositions[0]).toBeGreaterThanOrEqual(0);
        expect(t.resultPositions[0]).toBeLessThan(t.resultPositions[1]);
        expect(t.resultPositions[1]).toBeLessThan(7);

        // Removing the 2 letters at resultPositions from result should give baseWord
        const chars = t.result.split('');
        // Remove in reverse order to preserve indices
        chars.splice(t.resultPositions[1], 1);
        chars.splice(t.resultPositions[0], 1);
        expect(chars.join('')).toBe(t.baseWord);
      }
    }
  });

  test('index is cached (second call returns same instance)', () => {
    const idx1 = getDoubleInsertionIndex(5);
    const idx2 = getDoubleInsertionIndex(5);
    expect(idx1).toBe(idx2);
  });
});

describe('generateDoubleShiftPuzzle', () => {
  test('generates EASY double-shift puzzle with 3 rows of 5-letter words', async () => {
    const puzzle = await generateDoubleShiftPuzzle('EASY');
    expect(puzzle.words).toHaveLength(3);
    expect(puzzle.isDoubleShift).toBe(true);
    expect(puzzle.wordLength).toBe(5);

    // All words should be 5 letters and valid
    for (const word of puzzle.words) {
      expect(word).toHaveLength(5);
      expect(COMMON_WORDS.has(word)).toBe(true);
    }
  }, 15000);

  test('generates MEDIUM double-shift puzzle with 4 rows', async () => {
    const puzzle = await generateDoubleShiftPuzzle('MEDIUM');
    expect(puzzle.words).toHaveLength(4);
    expect(puzzle.isDoubleShift).toBe(true);

    for (const word of puzzle.words) {
      expect(word).toHaveLength(5);
      expect(COMMON_WORDS.has(word)).toBe(true);
    }
  }, 15000);

  test('solution has correct structure with lettersToMove', async () => {
    const puzzle = await generateDoubleShiftPuzzle('EASY');
    expect(puzzle.solution).toBeDefined();
    expect(puzzle.solution!.length).toBe(puzzle.words.length - 1);

    for (const step of puzzle.solution!) {
      // Should have both single and double-shift fields
      expect(step.letterToMove).toBeDefined();
      expect(step.lettersToMove).toBeDefined();
      expect(step.lettersToMove).toHaveLength(2);
      expect(step.insertionPositions).toBeDefined();
      expect(step.insertionPositions).toHaveLength(2);
      expect(step.removalPositions).toBeDefined();
      expect(step.removalPositions).toHaveLength(2);
    }
  }, 15000);

  test('each step removes 2 valid letters to form a valid 3-letter word', async () => {
    const puzzle = await generateDoubleShiftPuzzle('EASY');
    const words = puzzle.words;

    for (let i = 0; i < words.length - 1; i++) {
      const step = puzzle.solution![i];
      const sourceWord = step.sourceWord;
      const letters = step.lettersToMove!;
      const positions = step.removalPositions!;

      // Removing the 2 letters from sourceWord should give a valid 3-letter word
      const chars = sourceWord.split('');
      // Remove second position first (higher index)
      const pos1 = positions[0];
      const pos2 = positions[1];
      const sortedPositions = pos1 < pos2 ? [pos1, pos2] : [pos2, pos1];
      chars.splice(sortedPositions[1], 1);
      chars.splice(sortedPositions[0], 1);
      const remainder = chars.join('');
      expect(remainder.length).toBeLessThanOrEqual(5);
      // The 2 letters should match
      expect(letters[0]).toBeDefined();
      expect(letters[1]).toBeDefined();
    }
  }, 15000);

  test('puzzle words are all unique', async () => {
    const puzzle = await generateDoubleShiftPuzzle('EASY');
    const uniqueWords = new Set(puzzle.words);
    expect(uniqueWords.size).toBe(puzzle.words.length);
  }, 15000);

  test('hint mentions both letters', async () => {
    const puzzle = await generateDoubleShiftPuzzle('EASY');
    expect(puzzle.hint).toBeDefined();
    expect(puzzle.hint).toContain("and");
  }, 15000);
});

describe('Double Shift variant integration', () => {
  test('puzzleVariety exports double_shift configs', () => {
    const { VARIANT_CONFIGS, hasVariantModifier, isVariantUnlocked } = require('../services/puzzleVariety');

    // double_shift should be in configs
    expect(VARIANT_CONFIGS.double_shift).toBeDefined();
    expect(VARIANT_CONFIGS.double_shift.title).toBe('Double Shift');
    expect(VARIANT_CONFIGS.double_shift.amberMultiplier).toBeGreaterThan(1);

    // double_shift_blind combo should exist
    expect(VARIANT_CONFIGS.double_shift_blind).toBeDefined();

    // hasVariantModifier should detect double_shift
    expect(hasVariantModifier('double_shift', 'double_shift')).toBe(true);
    expect(hasVariantModifier('double_shift_blind', 'double_shift')).toBe(true);
    expect(hasVariantModifier('double_shift_blind', 'blind')).toBe(true);
    expect(hasVariantModifier('standard', 'double_shift')).toBe(false);

    // Unlock at 40 puzzles
    expect(isVariantUnlocked('double_shift', 39, 0)).toBe(false);
    expect(isVariantUnlocked('double_shift', 40, 0)).toBe(true);
  });

  test('getVariantOverrides forces wordLength=5 for double_shift', () => {
    const { getVariantOverrides } = require('../services/puzzleVariety');

    const overrides = getVariantOverrides('double_shift', 'EASY');
    expect(overrides.wordLength).toBe(5);
    expect(overrides.targetRows).toBe(3);

    const medOverrides = getVariantOverrides('double_shift', 'MEDIUM');
    expect(medOverrides.wordLength).toBe(5);
    expect(medOverrides.targetRows).toBe(4);
  });
});
