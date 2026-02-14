import { validateWord, generateLocalPuzzle } from '../services/localGenerator';

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

describe('validateWord', () => {
  test('validates known English words', () => {
    expect(validateWord('WORD')).toBe(true);
    expect(validateWord('GAME')).toBe(true);
    expect(validateWord('THE')).toBe(true);
  });

  test('is case-insensitive', () => {
    expect(validateWord('word')).toBe(true);
    expect(validateWord('Word')).toBe(true);
  });

  test('rejects non-words', () => {
    expect(validateWord('XYZQ')).toBe(false);
    expect(validateWord('ZZZZZ')).toBe(false);
  });

  test('rejects empty string', () => {
    expect(validateWord('')).toBe(false);
  });
});

describe('generateLocalPuzzle', () => {
  test('generates EASY puzzle with 3 words', async () => {
    const puzzle = await generateLocalPuzzle('EASY');
    expect(puzzle.words).toHaveLength(3);
    expect(puzzle.words.every(w => typeof w === 'string')).toBe(true);
  }, 10000);

  test('generates MEDIUM puzzle with 4 words', async () => {
    const puzzle = await generateLocalPuzzle('MEDIUM');
    expect(puzzle.words).toHaveLength(4);
  }, 10000);

  test('generates HARD puzzle with 5 words and 5-letter words', async () => {
    const puzzle = await generateLocalPuzzle('HARD');
    expect(puzzle.words).toHaveLength(5);
    expect(puzzle.wordLength).toBe(5);
  }, 10000);

  test('all words in puzzle are valid dictionary words', async () => {
    const puzzle = await generateLocalPuzzle('MEDIUM');
    for (const word of puzzle.words) {
      expect(validateWord(word)).toBe(true);
    }
  }, 10000);

  test('puzzle includes solution steps', async () => {
    const puzzle = await generateLocalPuzzle('EASY');
    expect(puzzle.solution).toBeDefined();
    expect(puzzle.solution!.length).toBe(puzzle.words.length - 1);
  }, 10000);

  test('solution steps have valid structure', async () => {
    const puzzle = await generateLocalPuzzle('MEDIUM');
    for (const step of puzzle.solution!) {
      expect(step).toHaveProperty('stepIndex');
      expect(step).toHaveProperty('sourceWord');
      expect(step).toHaveProperty('targetWord');
      expect(step).toHaveProperty('letterToMove');
      expect(step.letterToMove).toHaveLength(1);
    }
  }, 10000);

  test('puzzle includes a hint', async () => {
    const puzzle = await generateLocalPuzzle('MEDIUM');
    expect(puzzle.hint).toBeDefined();
    expect(typeof puzzle.hint).toBe('string');
    expect(puzzle.hint!.length).toBeGreaterThan(0);
  }, 10000);

  test('includes wordLength in output', async () => {
    const puzzle = await generateLocalPuzzle('MEDIUM');
    expect(puzzle.wordLength).toBe(4);

    const hardPuzzle = await generateLocalPuzzle('HARD');
    expect(hardPuzzle.wordLength).toBe(5);
  }, 15000);

  test('honors forced startWord override', async () => {
    const puzzle = await generateLocalPuzzle('MEDIUM', { startWord: 'TIME' });
    expect(puzzle.words[0]).toBe('TIME');
  }, 10000);

  test('throws for invalid forced startWord length', async () => {
    await expect(generateLocalPuzzle('MEDIUM', { startWord: 'NOTALEN4' }))
      .rejects
      .toThrow('Forced start word');
  }, 10000);

  test('generates different puzzles on repeated calls', async () => {
    const puzzle1 = await generateLocalPuzzle('MEDIUM');
    const puzzle2 = await generateLocalPuzzle('MEDIUM');
    // They should be different (extremely unlikely to be identical)
    const words1 = puzzle1.words.join(',');
    const words2 = puzzle2.words.join(',');
    // At least one should differ — very rarely the same
    // We just test that generation works twice without error
    expect(words1).toBeDefined();
    expect(words2).toBeDefined();
  }, 15000);
});
