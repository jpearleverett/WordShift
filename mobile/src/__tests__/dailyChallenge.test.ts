import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTodayString,
  getDailyDifficulty,
  isDailyChallengeUnlocked,
  getDailyChallengeUnlockProgress,
  isDailyCompleted,
  recordDailyCompletion,
  getDailyStatus,
  clearDailyProgress,
  DAILY_STREAK_MILESTONES,
  checkDailyStreakMilestone,
  generateDailyPuzzle,
  prewarmDailyPuzzle,
} from '../services/dailyChallenge';
import { generateLocalPuzzle } from '../services/localGenerator';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
        return Promise.resolve();
      }),
    },
  };
});

// Mock localGenerator to avoid actual puzzle generation
jest.mock('../services/localGenerator', () => ({
  generateLocalPuzzle: jest.fn(() =>
    Promise.resolve({
      words: ['FARM', 'ARM', 'WARM', 'WAR'],
      hint: 'Think about letters...',
      difficulty: 'MEDIUM',
    })
  ),
}));

// Mock amberCurrency
jest.mock('../services/amberCurrency', () => ({
  getCurrentPhase: jest.fn(() => Promise.resolve(0)),
}));

// Mock wordHistory
jest.mock('../services/wordHistory', () => ({
  getWordHistoryWithRecency: jest.fn(() => Promise.resolve(new Map())),
  recordPuzzleWords: jest.fn(() => Promise.resolve()),
}));

describe('dailyChallenge', () => {
  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    await clearDailyProgress();
  });

  test('getTodayString returns YYYY-MM-DD format', () => {
    const today = getTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('getDailyDifficulty always returns HARD', () => {
    const diff = getDailyDifficulty();
    expect(diff).toBe('HARD');
  });

  test('getDailyDifficulty returns HARD regardless of date', () => {
    expect(getDailyDifficulty('2026-02-09')).toBe('HARD');
    expect(getDailyDifficulty('2026-02-10')).toBe('HARD');
    expect(getDailyDifficulty('2026-02-11')).toBe('HARD');
  });

  test('daily challenge unlocks after enough puzzle progress', () => {
    expect(isDailyChallengeUnlocked(0, 0)).toBe(false);
    expect(isDailyChallengeUnlocked(2, 0)).toBe(false);
    expect(isDailyChallengeUnlocked(3, 0)).toBe(true);
    expect(isDailyChallengeUnlocked(1, 1)).toBe(true);
  });

  test('daily challenge unlock progress reports remaining puzzles', () => {
    expect(getDailyChallengeUnlockProgress(0, 0)).toEqual({
      unlocked: false,
      puzzlesRemaining: 3,
    });
    expect(getDailyChallengeUnlockProgress(2, 0)).toEqual({
      unlocked: false,
      puzzlesRemaining: 1,
    });
    expect(getDailyChallengeUnlockProgress(3, 0)).toEqual({
      unlocked: true,
      puzzlesRemaining: 0,
    });
  });

  test('isDailyCompleted returns false initially', async () => {
    expect(await isDailyCompleted()).toBe(false);
  });

  test('recordDailyCompletion marks as completed', async () => {
    await recordDailyCompletion(3, 0, 0);
    expect(await isDailyCompleted()).toBe(true);
  });

  test('recordDailyCompletion increments total', async () => {
    await recordDailyCompletion(2, 1, 2);
    const status = await getDailyStatus();
    expect(status.totalCompleted).toBe(1);
    expect(status.isCompleted).toBe(true);
  });

  test('recordDailyCompletion does not double-count', async () => {
    await recordDailyCompletion(3, 0, 0);
    await recordDailyCompletion(3, 0, 0);
    const status = await getDailyStatus();
    expect(status.totalCompleted).toBe(1);
  });

  test('getDailyStatus returns correct structure', async () => {
    const status = await getDailyStatus();
    expect(status).toHaveProperty('isCompleted');
    expect(status).toHaveProperty('difficulty');
    expect(status).toHaveProperty('todayResult');
    expect(status).toHaveProperty('streak');
    expect(status).toHaveProperty('bestStreak');
    expect(status).toHaveProperty('totalCompleted');
  });

  test('streak starts at 1 after first completion', async () => {
    await recordDailyCompletion(3, 0, 0);
    const status = await getDailyStatus();
    expect(status.streak).toBe(1);
    expect(status.bestStreak).toBe(1);
  });

  test('clearDailyProgress resets everything', async () => {
    await recordDailyCompletion(3, 0, 0);
    expect(await isDailyCompleted()).toBe(true);

    await clearDailyProgress();
    expect(await isDailyCompleted()).toBe(false);

    const status = await getDailyStatus();
    expect(status.totalCompleted).toBe(0);
  });
});

describe('generateDailyPuzzle caching / prewarm', () => {
  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    await clearDailyProgress();
    (generateLocalPuzzle as jest.Mock).mockClear();
  });

  test('memoizes today\'s puzzle — a repeat call does not regenerate', async () => {
    const first = await generateDailyPuzzle();
    const second = await generateDailyPuzzle();
    expect(second).toEqual(first);
    expect((generateLocalPuzzle as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  test('prewarm generates the puzzle ahead of time so the next call is cached', async () => {
    prewarmDailyPuzzle();
    // Let the fire-and-forget generation settle.
    await Promise.resolve();
    await generateDailyPuzzle();
    expect((generateLocalPuzzle as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  test('clearDailyProgress drops the cached puzzle', async () => {
    await generateDailyPuzzle();
    await clearDailyProgress();
    await generateDailyPuzzle();
    expect((generateLocalPuzzle as jest.Mock)).toHaveBeenCalledTimes(2);
  });
});

describe('dailyStreakMilestones', () => {
  test('DAILY_STREAK_MILESTONES has 5 entries', () => {
    expect(DAILY_STREAK_MILESTONES).toHaveLength(5);
  });

  test('milestones are at 3, 7, 14, 21, 30 days', () => {
    expect(DAILY_STREAK_MILESTONES.map(m => m.days)).toEqual([3, 7, 14, 21, 30]);
  });

  test('amber rewards are 15, 30, 50, 75, 100', () => {
    expect(DAILY_STREAK_MILESTONES.map(m => m.amber)).toEqual([15, 30, 50, 75, 100]);
  });

  test('checkDailyStreakMilestone returns milestone when crossing threshold', () => {
    const result = checkDailyStreakMilestone(3, 2, 0);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(15);
    expect(result!.message).toBe('Three days running!');
  });

  test('checkDailyStreakMilestone returns null when not crossing threshold', () => {
    expect(checkDailyStreakMilestone(4, 3, 0)).toBeNull();
    expect(checkDailyStreakMilestone(2, 1, 0)).toBeNull();
  });

  test('checkDailyStreakMilestone uses dark message at Phase 3+', () => {
    const result = checkDailyStreakMilestone(7, 6, 3);
    expect(result).not.toBeNull();
    expect(result!.message).toBe('Seven days. The ritual deepens.');
  });

  test('checkDailyStreakMilestone returns normal message below Phase 3', () => {
    const result = checkDailyStreakMilestone(7, 6, 2);
    expect(result).not.toBeNull();
    expect(result!.message).toBe('A full week of dailies!');
  });

  test('30-day milestone awards 100 amber', () => {
    const result = checkDailyStreakMilestone(30, 29, 0);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(100);
  });
});
