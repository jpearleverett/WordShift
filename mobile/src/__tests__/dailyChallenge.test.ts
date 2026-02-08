import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTodayString,
  getDailyDifficulty,
  isDailyCompleted,
  recordDailyCompletion,
  getDailyStatus,
  clearDailyProgress,
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

  test('getDailyDifficulty returns valid difficulty', () => {
    const diff = getDailyDifficulty();
    expect(['EASY', 'MEDIUM', 'HARD']).toContain(diff);
  });

  test('getDailyDifficulty cycles by day of week', () => {
    // Monday should be EASY
    const monday = getDailyDifficulty('2026-02-09'); // Monday
    expect(monday).toBe('EASY');

    // Wednesday should be HARD
    const wednesday = getDailyDifficulty('2026-02-11');
    expect(wednesday).toBe('HARD');
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
