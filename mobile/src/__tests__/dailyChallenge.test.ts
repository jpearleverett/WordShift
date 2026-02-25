import {
  getTodayString,
  getDailyDifficulty,
  isDailyChallengeUnlocked,
  getDailyChallengeUnlockProgress,
  isDailyCompleted,
  recordDailyCompletion,
  getDailyStatus,
  clearDailyProgress,
  getDailyCommunityStats,
  DAILY_STREAK_MILESTONES,
  checkDailyStreakMilestone,
} from '../services/dailyChallenge';

// Mock MMKV storage
jest.mock('../services/storage', () =>
  require('./helpers/mockStorage').createMockStorage()
);

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
  beforeEach(() => {
    const { storage } = require('../services/storage');
    storage.clearAll();
    clearDailyProgress();
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
    expect(isDailyChallengeUnlocked(19, 0)).toBe(false);
    expect(isDailyChallengeUnlocked(20, 0)).toBe(true);
    expect(isDailyChallengeUnlocked(5, 1)).toBe(true);
  });

  test('daily challenge unlock progress reports remaining puzzles', () => {
    expect(getDailyChallengeUnlockProgress(0, 0)).toEqual({
      unlocked: false,
      puzzlesRemaining: 20,
    });
    expect(getDailyChallengeUnlockProgress(12, 0)).toEqual({
      unlocked: false,
      puzzlesRemaining: 8,
    });
    expect(getDailyChallengeUnlockProgress(20, 0)).toEqual({
      unlocked: true,
      puzzlesRemaining: 0,
    });
  });

  test('isDailyCompleted returns false initially', () => {
    expect(isDailyCompleted()).toBe(false);
  });

  test('recordDailyCompletion marks as completed', () => {
    recordDailyCompletion(3, 0, 0);
    expect(isDailyCompleted()).toBe(true);
  });

  test('recordDailyCompletion increments total', () => {
    recordDailyCompletion(2, 1, 2);
    const status = getDailyStatus();
    expect(status.totalCompleted).toBe(1);
    expect(status.isCompleted).toBe(true);
  });

  test('recordDailyCompletion does not double-count', () => {
    recordDailyCompletion(3, 0, 0);
    recordDailyCompletion(3, 0, 0);
    const status = getDailyStatus();
    expect(status.totalCompleted).toBe(1);
  });

  test('getDailyStatus returns correct structure', () => {
    const status = getDailyStatus();
    expect(status).toHaveProperty('isCompleted');
    expect(status).toHaveProperty('difficulty');
    expect(status).toHaveProperty('todayResult');
    expect(status).toHaveProperty('streak');
    expect(status).toHaveProperty('bestStreak');
    expect(status).toHaveProperty('totalCompleted');
  });

  test('streak starts at 1 after first completion', () => {
    recordDailyCompletion(3, 0, 0);
    const status = getDailyStatus();
    expect(status.streak).toBe(1);
    expect(status.bestStreak).toBe(1);
  });

  test('clearDailyProgress resets everything', () => {
    recordDailyCompletion(3, 0, 0);
    expect(isDailyCompleted()).toBe(true);

    clearDailyProgress();
    expect(isDailyCompleted()).toBe(false);

    const status = getDailyStatus();
    expect(status.totalCompleted).toBe(0);
  });
});

describe('getDailyCommunityStats', () => {
  test('returns deterministic stats for the same date', () => {
    const stats1 = getDailyCommunityStats('2026-02-14');
    const stats2 = getDailyCommunityStats('2026-02-14');
    expect(stats1).toEqual(stats2);
  });

  test('returns different stats for different dates', () => {
    const stats1 = getDailyCommunityStats('2026-02-14');
    const stats2 = getDailyCommunityStats('2026-02-15');
    // Extremely unlikely to be identical for two different dates
    expect(
      stats1.completionRate !== stats2.completionRate ||
      stats1.averageStars !== stats2.averageStars ||
      stats1.totalPlayers !== stats2.totalPlayers
    ).toBe(true);
  });

  test('completion rate is within expected range', () => {
    const stats = getDailyCommunityStats('2026-02-14');
    expect(stats.completionRate).toBeGreaterThanOrEqual(65);
    expect(stats.completionRate).toBeLessThanOrEqual(90);
  });

  test('average stars is within expected range', () => {
    const stats = getDailyCommunityStats('2026-02-14');
    expect(stats.averageStars).toBeGreaterThanOrEqual(1.6);
    expect(stats.averageStars).toBeLessThanOrEqual(2.8);
  });

  test('has valid difficulty rating', () => {
    const stats = getDailyCommunityStats('2026-02-14');
    expect(['Tricky', 'Moderate', 'Straightforward']).toContain(stats.difficultyRating);
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
