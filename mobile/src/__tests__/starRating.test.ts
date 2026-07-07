jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

import { calculateStars, isFlawless, recordPuzzleCompletion, getCumulativeStats, clearStats } from '../services/starRating';

describe('calculateStars', () => {
  // 3 stars: 0 hints, 0-1 invalid attempts (tightened for better tension)
  test('returns 3 stars for 0 hints, 0 mistakes', () => {
    expect(calculateStars(0, 0)).toBe(3);
  });

  test('returns 3 stars for 0 hints, 1 mistake', () => {
    expect(calculateStars(0, 1)).toBe(3);
  });

  test('returns 2 stars for 0 hints, 2 mistakes (tightened from 3-star)', () => {
    expect(calculateStars(0, 2)).toBe(2);
  });

  // 2 stars: 1 hint OR 2-3 invalid attempts
  test('returns 2 stars for 1 hint, 0 mistakes', () => {
    expect(calculateStars(1, 0)).toBe(2);
  });

  test('returns 2 stars for 0 hints, 3 mistakes', () => {
    expect(calculateStars(0, 3)).toBe(2);
  });

  test('returns 1 star for 0 hints, 4 mistakes (tightened from 2-star)', () => {
    expect(calculateStars(0, 4)).toBe(1);
  });

  test('returns 2 stars for 1 hint, 1 mistake', () => {
    expect(calculateStars(1, 1)).toBe(2);
  });

  // 1 star: 2+ hints OR 4+ invalid attempts
  test('returns 1 star for 2 hints, 0 mistakes', () => {
    expect(calculateStars(2, 0)).toBe(1);
  });

  test('returns 1 star for 0 hints, 5 mistakes', () => {
    expect(calculateStars(0, 5)).toBe(1);
  });

  test('returns 1 star for 3 hints, 5 mistakes', () => {
    expect(calculateStars(3, 5)).toBe(1);
  });

  test('returns 1 star for 0 hints, 10 mistakes', () => {
    expect(calculateStars(0, 10)).toBe(1);
  });

  // Edge cases
  test('handles very large numbers', () => {
    expect(calculateStars(100, 100)).toBe(1);
  });

  test('1 hint with 5+ mistakes returns 1 star (both conditions)', () => {
    expect(calculateStars(1, 5)).toBe(1);
  });
});

describe('isFlawless', () => {
  test('true only for 0 hints, 0 invalids, 0 undos', () => {
    expect(isFlawless(0, 0, 0)).toBe(true);
  });

  test('defaults undosUsed to 0 (legacy call sites)', () => {
    expect(isFlawless(0, 0)).toBe(true);
  });

  test('a single invalid attempt (still 3 stars) is NOT flawless', () => {
    expect(calculateStars(0, 1)).toBe(3); // 3 stars tolerates one invalid...
    expect(isFlawless(0, 1)).toBe(false); // ...but flawless does not
  });

  test('any hint breaks flawless', () => {
    expect(isFlawless(1, 0, 0)).toBe(false);
  });

  test('any undo breaks flawless even with a clean board otherwise', () => {
    expect(isFlawless(0, 0, 1)).toBe(false);
  });
});

describe('recordPuzzleCompletion flawless tally', () => {
  beforeEach(async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    AsyncStorage.clear();
    await clearStats();
  });

  test('increments flawlessCount only on a perfect solve', async () => {
    await recordPuzzleCompletion('MEDIUM', 0, 0, 0); // flawless
    await recordPuzzleCompletion('MEDIUM', 0, 1, 0); // 3 stars, not flawless
    await recordPuzzleCompletion('MEDIUM', 0, 0, 2); // undos used, not flawless
    await recordPuzzleCompletion('HARD', 0, 0, 0);   // flawless
    const stats = await getCumulativeStats();
    expect(stats.flawlessCount).toBe(2);
    expect(stats.totalPuzzlesCompleted).toBe(4);
  });
});
