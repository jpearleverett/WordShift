import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  checkAchievements,
  getAchievementsWithStatus,
  getUnlockedCount,
  getTotalCount,
  ACHIEVEMENTS,
  clearAchievements,
  AchievementCheckState,
} from '../services/achievements';

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

const defaultState: AchievementCheckState = {
  stats: {
    totalPuzzlesCompleted: 0,
    totalStars: 0,
    threeStarCount: 0,
    twoStarCount: 0,
    oneStarCount: 0,
    totalInvalidAttempts: 0,
    totalHintsUsed: 0,
    noHintPuzzleCount: 0,
    byDifficulty: {
      EASY: { completed: 0, stars: 0 },
      MEDIUM: { completed: 0, stars: 0 },
      MEDIUM_PLUS: { completed: 0, stars: 0 },
      HARD: { completed: 0, stars: 0 },
    },
    lastUpdated: 0,
  },
  puzzlesSolved: 0,
  currentPhase: 0,
  currentStreak: 0,
  unlockedAnimals: 0,
  unlockedRooms: 0,
  amberEarned: 0,
  dailyChallengesCompleted: 0,
  shareCount: 0,
  challengeCompletions: 0,
};

describe('achievements', () => {
  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    await clearAchievements();
  });

  test('ACHIEVEMENTS array is non-empty', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0);
  });

  test('all achievements have unique ids', () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('getTotalCount returns correct number', () => {
    expect(getTotalCount()).toBe(ACHIEVEMENTS.length);
  });

  test('checkAchievements returns newly unlocked achievements', async () => {
    const state = {
      ...defaultState,
      stats: { ...defaultState.stats, totalPuzzlesCompleted: 1 },
    };
    const newlyUnlocked = await checkAchievements(state);
    expect(newlyUnlocked.length).toBeGreaterThan(0);
    expect(newlyUnlocked.find(a => a.id === 'first_puzzle')).toBeTruthy();
  });

  test('achievements are not re-unlocked', async () => {
    const state = {
      ...defaultState,
      stats: { ...defaultState.stats, totalPuzzlesCompleted: 1 },
    };
    const first = await checkAchievements(state);
    expect(first.length).toBeGreaterThan(0);

    // Second check with same state should return empty
    const second = await checkAchievements(state);
    expect(second.length).toBe(0);
  });

  test('getAchievementsWithStatus shows unlock state', async () => {
    const state = {
      ...defaultState,
      stats: { ...defaultState.stats, totalPuzzlesCompleted: 1 },
    };
    await checkAchievements(state);

    const all = await getAchievementsWithStatus();
    const firstPuzzle = all.find(a => a.id === 'first_puzzle');
    expect(firstPuzzle?.isUnlocked).toBe(true);
    expect(firstPuzzle?.unlockedAt).toBeGreaterThan(0);

    const puzzle10 = all.find(a => a.id === 'puzzle_10');
    expect(puzzle10?.isUnlocked).toBe(false);
    expect(puzzle10?.unlockedAt).toBeNull();
  });

  test('getUnlockedCount returns correct count', async () => {
    expect(await getUnlockedCount()).toBe(0);

    const state = {
      ...defaultState,
      stats: { ...defaultState.stats, totalPuzzlesCompleted: 1 },
    };
    await checkAchievements(state);
    expect(await getUnlockedCount()).toBeGreaterThan(0);
  });

  test('multiple achievements can unlock at once', async () => {
    const state = {
      ...defaultState,
      stats: {
        ...defaultState.stats,
        totalPuzzlesCompleted: 25,
        threeStarCount: 10,
        byDifficulty: {
          EASY: { completed: 10, stars: 25 },
          MEDIUM: { completed: 10, stars: 20 },
          MEDIUM_PLUS: { completed: 3, stars: 7 },
          HARD: { completed: 5, stars: 10 },
        },
        lastUpdated: 0,
      },
      currentPhase: 1,
      unlockedAnimals: 1,
    };
    const unlocked = await checkAchievements(state);
    // Should unlock: first_puzzle, puzzle_10, puzzle_25, first_perfect, perfect_10,
    // all_difficulties, first_animal, phase_1, etc.
    expect(unlocked.length).toBeGreaterThan(5);
  });

  test('streak achievements work', async () => {
    const state = {
      ...defaultState,
      stats: { ...defaultState.stats, totalPuzzlesCompleted: 1 },
      currentStreak: 7,
    };
    const unlocked = await checkAchievements(state);
    const weeklyWarrior = unlocked.find(a => a.id === 'streak_7');
    expect(weeklyWarrior).toBeTruthy();
  });

  test('no_hints_10 achievement unlocks at 10 no-hint puzzles', async () => {
    const state = {
      ...defaultState,
      stats: { ...defaultState.stats, totalPuzzlesCompleted: 10, noHintPuzzleCount: 10 },
    };
    const unlocked = await checkAchievements(state);
    expect(unlocked.find(a => a.id === 'no_hints_10')).toBeTruthy();
  });

  test('clearAchievements resets all progress', async () => {
    const state = {
      ...defaultState,
      stats: { ...defaultState.stats, totalPuzzlesCompleted: 1 },
    };
    await checkAchievements(state);
    expect(await getUnlockedCount()).toBeGreaterThan(0);

    await clearAchievements();
    expect(await getUnlockedCount()).toBe(0);
  });

  // ===== Amber rewards =====

  test('every achievement defines a positive amber reward', () => {
    for (const a of ACHIEVEMENTS) {
      expect(a.rewardAmber).toBeGreaterThan(0);
    }
  });

  test('checkAchievements credits unlocked rewards as bonus amber', async () => {
    const { getFullProgress, clearProgress } = require('../services/amberCurrency');
    await clearProgress();

    const state = {
      ...defaultState,
      stats: { ...defaultState.stats, totalPuzzlesCompleted: 1 },
    };
    const unlocked = await checkAchievements(state);
    const expected = unlocked.reduce((sum: number, a: { rewardAmber: number }) => sum + a.rewardAmber, 0);
    expect(expected).toBeGreaterThan(0);

    const progress = await getFullProgress();
    expect(progress.amber).toBe(expected);
    expect(progress.totalAmberEarned).toBe(expected);
  });

  test('re-checking does not double-credit amber', async () => {
    const { getFullProgress, clearProgress } = require('../services/amberCurrency');
    await clearProgress();

    const state = {
      ...defaultState,
      stats: { ...defaultState.stats, totalPuzzlesCompleted: 1 },
    };
    const unlocked = await checkAchievements(state);
    const expected = unlocked.reduce((sum: number, a: { rewardAmber: number }) => sum + a.rewardAmber, 0);
    await checkAchievements(state);

    const progress = await getFullProgress();
    expect(progress.amber).toBe(expected);
  });
});
