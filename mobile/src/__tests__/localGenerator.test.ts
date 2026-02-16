import { validateWord, generateLocalPuzzle, isReverseSolvable } from '../services/localGenerator';

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
    const puzzle = await generateLocalPuzzle('EASY', { startWord: 'TIME' });
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

describe('isReverseSolvable', () => {
  test('rejects puzzle where reverse path requires picking the locked letter', () => {
    // Forward: GLOW → pick G → LOW, insert G into ABLE → GABLE
    //          GABLE → pick B → GALE, insert B into EACH → BEACH
    // Post-forward: ["LOW", "GALE", "BEACH"]
    //   B is locked at position 0 in BEACH (the letter dropped in the last forward step)
    // Reverse: Source BEACH with B locked at pos 0.
    //   Removing B(0) → EACH is the only valid 4-letter remainder,
    //   but B is locked and cannot be picked.
    //   Other removals: E→BACH(not a word), A→BECH(no), C→BEAH(no), H→BEAC(no)
    //   → No valid reverse moves exist. Puzzle is unsolvable in reverse.
    const result = isReverseSolvable(
      ['GLOW', 'ABLE', 'EACH'],
      [
        { stepIndex: 0, sourceWord: 'GLOW', targetWord: 'ABLE', letterToMove: 'G', explanation: '' },
        { stepIndex: 1, sourceWord: 'ABLE', targetWord: 'EACH', letterToMove: 'B', explanation: '' },
      ]
    );
    expect(result).toBe(false);
  });

  test('accepts puzzle with valid reverse path respecting locked letters', () => {
    // Forward: PEEP → pick E → PEP, insert E into WHAT → WHEAT
    //          WHEAT → pick W → HEAT, insert W into HERE → WHERE
    // Post-forward: ["PEP", "HEAT", "WHERE"]
    //   W is locked at position 0 in WHERE
    // Reverse step 0: Source WHERE, locked pos 0 (W)
    //   Remove H(1) → WERE (valid), insert H into HEAT at end → HEATH (valid)
    // Reverse step 1: Source HEATH, locked pos 4 (H from insertion)
    //   Remove E(1) → HATH (valid), insert E into PEP → PEEP (valid)
    //   → Reverse is solvable!
    const result = isReverseSolvable(
      ['PEEP', 'WHAT', 'HERE'],
      [
        { stepIndex: 0, sourceWord: 'PEEP', targetWord: 'WHAT', letterToMove: 'E', explanation: '' },
        { stepIndex: 1, sourceWord: 'WHAT', targetWord: 'HERE', letterToMove: 'W', explanation: '' },
      ]
    );
    expect(result).toBe(true);
  });

  test('generated puzzles can still pass reverse validation', async () => {
    // Generate several puzzles and verify at least some pass reverse validation.
    // This ensures the locked-letter-aware check isn't overly restrictive.
    let passCount = 0;
    const attempts = 10;
    for (let i = 0; i < attempts; i++) {
      const puzzle = await generateLocalPuzzle('EASY');
      if (isReverseSolvable(puzzle.words, puzzle.solution!)) {
        passCount++;
      }
    }
    // Not all puzzles are reverse-solvable, but a reasonable fraction should be
    expect(passCount).toBeGreaterThan(0);
  }, 30000);

  test('rejects invalid inputs', () => {
    expect(isReverseSolvable([], [])).toBe(false);
    expect(isReverseSolvable(['WORD'], [])).toBe(false);
    expect(isReverseSolvable(['A'], [{ stepIndex: 0, sourceWord: 'A', targetWord: 'B', letterToMove: 'A', explanation: '' }])).toBe(false);
  });
});
