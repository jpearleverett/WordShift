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
  getDailyCommunityStats,
} from '../services/dailyChallenge';

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

// ===========================================================================
// Daily Streak Milestones
// ===========================================================================

describe('dailyStreakMilestones', () => {
  test('DAILY_STREAK_MILESTONES has 5 entries', () => {
    expect(DAILY_STREAK_MILESTONES).toHaveLength(5);
  });

  test('milestones are ordered by days ascending', () => {
    for (let i = 1; i < DAILY_STREAK_MILESTONES.length; i++) {
      expect(DAILY_STREAK_MILESTONES[i].days).toBeGreaterThan(
        DAILY_STREAK_MILESTONES[i - 1].days
      );
    }
  });

  test('all milestones have amber rewards', () => {
    for (const m of DAILY_STREAK_MILESTONES) {
      expect(m.amber).toBeGreaterThan(0);
    }
  });

  test('all milestones have message and darkMessage', () => {
    for (const m of DAILY_STREAK_MILESTONES) {
      expect(m.message.length).toBeGreaterThan(0);
      expect(m.darkMessage.length).toBeGreaterThan(0);
    }
  });

  test('checkDailyStreakMilestone returns milestone when threshold crossed', () => {
    const result = checkDailyStreakMilestone(3, 2, 0);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(15);
    expect(result!.message).toBe('Three days running!');
  });

  test('checkDailyStreakMilestone returns null when no milestone crossed', () => {
    expect(checkDailyStreakMilestone(2, 1, 0)).toBeNull();
    expect(checkDailyStreakMilestone(4, 3, 0)).toBeNull();
    expect(checkDailyStreakMilestone(6, 5, 0)).toBeNull();
  });

  test('checkDailyStreakMilestone returns null when already past milestone', () => {
    expect(checkDailyStreakMilestone(8, 7, 0)).toBeNull();
    expect(checkDailyStreakMilestone(4, 3, 0)).toBeNull();
  });

  test('checkDailyStreakMilestone uses dark message at phase 3+', () => {
    const result3 = checkDailyStreakMilestone(3, 2, 3);
    expect(result3!.message).toBe('Three days observed.');

    const result7 = checkDailyStreakMilestone(7, 6, 4);
    expect(result7!.message).toBe('Seven days. The ritual deepens.');
  });

  test('checkDailyStreakMilestone uses normal message at phase < 3', () => {
    const result = checkDailyStreakMilestone(7, 6, 2);
    expect(result!.message).toBe('A full week of dailies!');
  });

  test('7-day daily streak milestone fires correctly', () => {
    const result = checkDailyStreakMilestone(7, 6, 0);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(30);
  });

  test('14-day daily streak milestone fires correctly', () => {
    const result = checkDailyStreakMilestone(14, 13, 0);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(50);
  });

  test('21-day daily streak milestone fires correctly', () => {
    const result = checkDailyStreakMilestone(21, 20, 0);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(75);
  });

  test('30-day daily streak milestone fires correctly', () => {
    const result = checkDailyStreakMilestone(30, 29, 0);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(100);
  });

  test('crossing multiple milestones at once returns the first one', () => {
    const result = checkDailyStreakMilestone(30, 0, 0);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(15); // 3-day milestone (first crossed)
  });
});

// ===========================================================================
// Daily Community Stats
// ===========================================================================

describe('getDailyCommunityStats', () => {
  test('returns deterministic stats for the same date', () => {
    const stats1 = getDailyCommunityStats('2026-02-15');
    const stats2 = getDailyCommunityStats('2026-02-15');
    expect(stats1).toEqual(stats2);
  });

  test('returns different stats for different dates', () => {
    const stats1 = getDailyCommunityStats('2026-02-15');
    const stats2 = getDailyCommunityStats('2026-02-16');
    // At least one field should differ
    const allSame = stats1.completionRate === stats2.completionRate
      && stats1.averageStars === stats2.averageStars
      && stats1.totalPlayers === stats2.totalPlayers;
    expect(allSame).toBe(false);
  });

  test('returns stats within expected ranges', () => {
    const stats = getDailyCommunityStats('2026-02-15');
    expect(stats.completionRate).toBeGreaterThanOrEqual(65);
    expect(stats.completionRate).toBeLessThanOrEqual(90);
    expect(stats.averageStars).toBeGreaterThanOrEqual(1.6);
    expect(stats.averageStars).toBeLessThanOrEqual(2.8);
    expect(stats.totalPlayers).toBeGreaterThanOrEqual(800);
    expect(stats.totalPlayers).toBeLessThanOrEqual(5000);
    expect(stats.perfectRate).toBeGreaterThanOrEqual(15);
    expect(stats.perfectRate).toBeLessThanOrEqual(50);
  });

  test('difficulty rating correlates with completion rate', () => {
    // Test many dates to find examples
    for (let day = 1; day <= 28; day++) {
      const dateStr = `2026-02-${day.toString().padStart(2, '0')}`;
      const stats = getDailyCommunityStats(dateStr);
      if (stats.completionRate < 72) {
        expect(stats.difficultyRating).toBe('Tricky');
      } else if (stats.completionRate < 82) {
        expect(stats.difficultyRating).toBe('Moderate');
      } else {
        expect(stats.difficultyRating).toBe('Straightforward');
      }
    }
  });
});
