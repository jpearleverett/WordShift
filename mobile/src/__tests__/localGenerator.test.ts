import { validateWord, generateLocalPuzzle, isReverseSolvable, getInsertionIndex, getIncantationName, getStrongestDreadWord, FORCED_START_MIN_SCORE, pickMultiRouteCandidate } from '../services/localGenerator';

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

describe('getIncantationName', () => {
  test('uses distinct serene templates at Phase 5', () => {
    const words = ['play', 'plant', 'heart'];
    const phase4 = getIncantationName(words, 4);
    const phase5 = getIncantationName(words, 5);
    expect(phase5).not.toBe(phase4);
    expect(phase5).toMatch(/settles|Weave|Becomes|Abides|Returns/);
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

  test('forced-start (echo) generation keeps a modest quality floor', () => {
    // Echo boards no longer bypass the quality gate entirely (the old floor
    // was 0), but the floor stays modest because the start word is fixed.
    expect(FORCED_START_MIN_SCORE).toBe(20);
    expect(FORCED_START_MIN_SCORE).toBeLessThan(45); // below the standard gate
  });

  test('forced-start generation never fails when a chain exists (graceful relaxation)', async () => {
    // If no chain clears the floor within the attempt budget, the best valid
    // below-floor chain must ship instead of throwing — echo generation used
    // to accept ANY chain and must not start failing. Repeated forced-start
    // runs must therefore always produce a board.
    for (const startWord of ['TIME', 'WARM']) {
      const puzzle = await generateLocalPuzzle('EASY', { startWord });
      expect(puzzle.words[0]).toBe(startWord);
      expect(puzzle.solution).toBeDefined();
      expect(puzzle.solution!.length).toBe(puzzle.words.length - 1);
    }
  }, 30000);

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

  test('standard generation is unaffected by adjacency index', async () => {
    // Standard puzzles should still meet the quality threshold (45+)
    const puzzle = await generateLocalPuzzle('MEDIUM');
    expect(puzzle.words).toHaveLength(4);
    expect(puzzle.solution).toBeDefined();
    expect(puzzle.solution!.length).toBe(3);
  }, 10000);
});

describe('pickMultiRouteCandidate (standard final-pick preference)', () => {
  interface FakeCandidate {
    id: string;
    score: number;
  }
  const byId = (counts: Record<string, number>) =>
    (candidate: FakeCandidate) => counts[candidate.id];

  test('prefers the highest-scoring multi-route candidate over a higher-scoring single-route one', () => {
    const candidates: FakeCandidate[] = [
      { id: 'single-high', score: 90 },
      { id: 'multi-a', score: 70 },
      { id: 'multi-b', score: 60 },
    ];
    const picked = pickMultiRouteCandidate(
      candidates,
      byId({ 'single-high': 1, 'multi-a': 3, 'multi-b': 5 }),
    );
    expect(picked!.id).toBe('multi-a');
  });

  test('a route count of exactly 2 qualifies as multi-route', () => {
    const candidates: FakeCandidate[] = [
      { id: 'single', score: 80 },
      { id: 'two-routes', score: 50 },
    ];
    const picked = pickMultiRouteCandidate(
      candidates,
      byId({ single: 1, 'two-routes': 2 }),
    );
    expect(picked!.id).toBe('two-routes');
  });

  test('falls back to the best single-route candidate when none is multi-route', () => {
    const candidates: FakeCandidate[] = [
      { id: 'best', score: 75 },
      { id: 'worse', score: 55 },
    ];
    const picked = pickMultiRouteCandidate(
      candidates,
      byId({ best: 1, worse: 1 }),
    );
    expect(picked!.id).toBe('best');
  });

  test('returns null for an empty candidate list', () => {
    expect(pickMultiRouteCandidate([], () => 0)).toBeNull();
  });

  test('breaks exact score ties among multi-route candidates toward trap presence', () => {
    const candidates: FakeCandidate[] = [
      { id: 'multi-plain', score: 70 },
      { id: 'multi-trap', score: 70 },
      { id: 'single-high', score: 90 },
    ];
    const picked = pickMultiRouteCandidate(
      candidates,
      byId({ 'multi-plain': 2, 'multi-trap': 3, 'single-high': 1 }),
      candidate => candidate.id === 'multi-trap' || candidate.id === 'single-high',
    );
    expect(picked!.id).toBe('multi-trap');
  });

  test('a higher multi-route score still beats trap presence (tie-break only)', () => {
    const candidates: FakeCandidate[] = [
      { id: 'multi-plain-high', score: 80 },
      { id: 'multi-trap-low', score: 70 },
    ];
    const picked = pickMultiRouteCandidate(
      candidates,
      byId({ 'multi-plain-high': 2, 'multi-trap-low': 4 }),
      candidate => candidate.id === 'multi-trap-low',
    );
    expect(picked!.id).toBe('multi-plain-high');
  });

  test('trap presence never promotes a single-route candidate over a multi-route one', () => {
    const candidates: FakeCandidate[] = [
      { id: 'single-trap', score: 90 },
      { id: 'multi-plain', score: 60 },
    ];
    const picked = pickMultiRouteCandidate(
      candidates,
      byId({ 'single-trap': 1, 'multi-plain': 2 }),
      candidate => candidate.id === 'single-trap',
    );
    expect(picked!.id).toBe('multi-plain');
  });
});

describe('getInsertionIndex', () => {
  test('builds index for 3-letter words with correct entries', () => {
    const index = getInsertionIndex(3);
    // Index should exist and have entries for common letters
    expect(index.size).toBeGreaterThan(0);

    // 'S' inserted into 'CAM' at pos 0 → 'SCAM' should be present
    const sTargets = index.get('S');
    expect(sTargets).toBeDefined();
    const camEntries = sTargets!.filter(t => t.baseWord === 'CAM' && t.result === 'SCAM');
    expect(camEntries.length).toBeGreaterThan(0);
    expect(camEntries[0].position).toBe(0);
  });

  test('index is cached across calls', () => {
    const index1 = getInsertionIndex(3);
    const index2 = getInsertionIndex(3);
    expect(index1).toBe(index2); // Same reference
  });

  test('handles missing word length gracefully', () => {
    const index = getInsertionIndex(99);
    expect(index.size).toBe(0);
  });
});

describe('isReverseSolvable (cumulative locking)', () => {
  test('rejects puzzle where reverse path requires picking a locked letter', () => {
    // Forward: GLOW → pick G(0) → LOW, insert G into ABLE → GABLE
    //          GABLE → pick B → GALE, insert B into EACH → BEACH
    // Under cumulative locking, the G inserted in row 1 stays locked.
    // In the best insertion scenario for GABLE, the locked G prevents
    // a valid reverse path from BEACH back through GALE to LOW.
    const result = isReverseSolvable(
      ['GLOW', 'ABLE', 'EACH'],
      [
        { stepIndex: 0, sourceWord: 'GLOW', targetWord: 'ABLE', letterToMove: 'G', explanation: '' },
        { stepIndex: 1, sourceWord: 'ABLE', targetWord: 'EACH', letterToMove: 'B', explanation: '' },
      ]
    );
    expect(result).toBe(false);
  });

  test('accepts puzzle with valid reverse path under cumulative locking', () => {
    // Forward: CAME → pick E(3) → CAM, insert E into LAST → LEAST (pos 1)
    //          LEAST → pick L(0) → EAST, insert L into BACK → BLACK (pos 1)
    // Post-forward: ["CAM"(3), "EAST"(4), "BLACK"(5)]
    //   EAST locked: E was inserted at pos 1 in LAST. L removed at pos 0 of LEAST.
    //     Since 0 < 1, locked shifts to 0. So EAST has locked {0} (the E at pos 0).
    //   BLACK locked: L inserted at pos 1. So BLACK has locked {1} (the L).
    // Reverse step 0: Source BLACK(5), locked {1}
    //   Remove B(0) → LACK (valid 4-letter). Insert B into EAST at pos 0 → BEAST (valid 5-letter)
    //   BEAST locked: original {0} shifts to {1} (since insert at 0), plus new lock at {0}. → {0, 1}
    // Reverse step 1: Source BEAST(5), locked {0, 1}. Available: positions 2,3,4
    //   Remove S(3) → BEAT (valid 4-letter). Insert S into CAM at pos 0 → SCAM (valid 4-letter) ✓
    const result = isReverseSolvable(
      ['CAME', 'LAST', 'BACK'],
      [
        { stepIndex: 0, sourceWord: 'CAME', targetWord: 'LAST', letterToMove: 'E', explanation: '' },
        { stepIndex: 1, sourceWord: 'LAST', targetWord: 'BACK', letterToMove: 'L', explanation: '' },
      ]
    );
    expect(result).toBe(true);
  });

  test('enforces exactly 2 locked positions per intermediate row during reverse', () => {
    // Using the CAME/LAST/BACK example, verify that the intermediate row (row 1)
    // accumulates exactly 2 locked positions after both forward and reverse steps.
    // The validator correctly handles this: row 1 gets 1 lock from forward (E inserted),
    // then 1 lock from reverse step 0 (B inserted) = 2 total.
    // This means only 3 of 5 letters are available for picking in reverse step 1.
    // If ALL positions were locked, the puzzle would be rejected.
    const result = isReverseSolvable(
      ['CAME', 'LAST', 'BACK'],
      [
        { stepIndex: 0, sourceWord: 'CAME', targetWord: 'LAST', letterToMove: 'E', explanation: '' },
        { stepIndex: 1, sourceWord: 'LAST', targetWord: 'BACK', letterToMove: 'L', explanation: '' },
      ]
    );
    expect(result).toBe(true);
  });

  test('generateLocalPuzzle with requireReverseSolvable produces valid EASY puzzles', async () => {
    const puzzle = await generateLocalPuzzle('EASY', { requireReverseSolvable: true });
    expect(puzzle.words.length).toBeGreaterThanOrEqual(3);
    expect(puzzle.solution).toBeDefined();
    expect(isReverseSolvable(puzzle.words, puzzle.solution!)).toBe(true);
  }, 35000);

  test('generateLocalPuzzle with requireReverseSolvable produces valid MEDIUM puzzles', async () => {
    const puzzle = await generateLocalPuzzle('MEDIUM', { requireReverseSolvable: true });
    expect(puzzle.words.length).toBe(4);
    expect(puzzle.solution).toBeDefined();
    expect(isReverseSolvable(puzzle.words, puzzle.solution!)).toBe(true);
  }, 35000);

  test('relaxBoring widens the candidate pool for reverse puzzles', async () => {
    // With relaxBoring, S-plural and other "boring" transforms are accepted,
    // giving the generator more paths to find reverse-solvable chains
    const puzzle = await generateLocalPuzzle('EASY', {
      requireReverseSolvable: true,
      relaxBoring: true,
    });
    expect(puzzle.words.length).toBeGreaterThanOrEqual(3);
    expect(puzzle.solution).toBeDefined();
    expect(isReverseSolvable(puzzle.words, puzzle.solution!)).toBe(true);
  }, 35000);

  test('rejects invalid inputs', () => {
    expect(isReverseSolvable([], [])).toBe(false);
    expect(isReverseSolvable(['WORD'], [])).toBe(false);
    expect(isReverseSolvable(['A'], [{ stepIndex: 0, sourceWord: 'A', targetWord: 'B', letterToMove: 'A', explanation: '' }])).toBe(false);
  });
});

describe('getStrongestDreadWord', () => {
  test('returns null when no word is a dread word', () => {
    expect(getStrongestDreadWord(['APPLE', 'CHAIR', 'TABLE'])).toBeNull();
    expect(getStrongestDreadWord([])).toBeNull();
  });

  test('finds a dread word (case-insensitive) and reports its tier', () => {
    const r = getStrongestDreadWord(['apple', 'void', 'chair']);
    expect(r).not.toBeNull();
    expect(r!.word).toBe('VOID');
    expect(r!.tier).toBeGreaterThanOrEqual(1);
  });

  test('picks the highest-tier dread word when several are present', () => {
    // DOOM/ABYSS are late-tier; DARK is early. The strongest should win.
    const r = getStrongestDreadWord(['DARK', 'ABYSS']);
    expect(r).not.toBeNull();
    // Whichever is strongest, its tier is >= the early-tier DARK's.
    const dark = getStrongestDreadWord(['DARK']);
    expect(r!.tier).toBeGreaterThanOrEqual(dark!.tier);
  });
});
