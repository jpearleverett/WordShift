jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CURRENT_SCHEMA_VERSION } from '../services/dataMigration';
import {
  checkFreeStreakFreeze,
  invalidateProgressCache,
  loadProgress,
} from '../services/amberCurrency';
import {
  getCumulativeStats,
  invalidateStatsCache,
} from '../services/starRating';
import { ACHIEVEMENTS, AchievementCheckState } from '../services/achievements';
import {
  DAILY_CHALLENGE_UNLOCK_PUZZLES,
  isDailyChallengeUnlocked,
} from '../services/dailyChallenge';
import { getLocalDateString } from '../services/dateUtils';
import { getUnlockedVariants } from '../services/puzzleVariety';
import {
  PLAY_STORE_SCENARIO_NAMES,
  buildPlayStoreScenario,
  parsePlayStoreScenario,
} from '../dev/playStoreScenarios';
import type { PlayStoreScenario } from '../dev/playStoreScenarios';

function stored<T>(scenario: PlayStoreScenario, key: string): T {
  return JSON.parse(scenario.storage[key]) as T;
}

function rowWords(save: { rows: { words: { char: string }[] }[] }): string[] {
  return save.rows.map(row => row.words.map(letter => letter.char).join(''));
}

async function seedScenario(
  name: PlayStoreScenario['name'],
  today: string
): Promise<PlayStoreScenario> {
  const scenario = buildPlayStoreScenario(name, today);
  await AsyncStorage.multiSet(Object.entries(scenario.storage));
  invalidateProgressCache();
  invalidateStatsCache();
  return scenario;
}

describe('Play Store screenshot scenarios', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    invalidateProgressCache();
    invalidateStatsCache();
  });

  test('exposes the eight approved scenarios in campaign order', () => {
    expect(PLAY_STORE_SCENARIO_NAMES).toEqual([
      'puzzle-preview',
      'puzzle-chain',
      'home-sunny',
      'animal-dialogue',
      'variant-menu',
      'daily',
      'flawless-victory',
      'home-dusk',
    ]);
  });

  test('parses only known scenarios in development web builds', () => {
    expect(parsePlayStoreScenario('?playStoreScenario=home-sunny', true, 'web'))
      .toBe('home-sunny');
    expect(parsePlayStoreScenario('?playStoreScenario=unknown', true, 'web'))
      .toBeNull();
    expect(parsePlayStoreScenario('?other=value', true, 'web'))
      .toBeNull();
    expect(parsePlayStoreScenario('?playStoreScenario=home-sunny', false, 'web'))
      .toBeNull();
    expect(parsePlayStoreScenario('?playStoreScenario=home-sunny', true, 'android'))
      .toBeNull();
    expect(parsePlayStoreScenario('?playStoreScenario=home-sunny', true, 'ios'))
      .toBeNull();
  });

  test('adds deterministic common storage that keeps captures unobstructed', () => {
    const scenario = buildPlayStoreScenario('home-sunny', '2026-07-11');

    expect(scenario.storage.wordshift_schema_version)
      .toBe(String(CURRENT_SCHEMA_VERSION));
    expect(scenario.storage.wordshift_onboarding_step).toBe('complete');
    expect(scenario.storage.wordshift_tutorial_completed).toBe('true');
    expect(stored(scenario, 'wordshift_settings')).toEqual({
      soundEnabled: false,
      hapticsEnabled: false,
      reducedMotion: true,
    });
    expect(stored(scenario, 'wordshift_daily_login')).toEqual({
      lastClaimedDate: '2026-07-11',
      cycleDay: 3,
    });

    for (const key of [
      'wordshift_setup_selector_intro_seen',
      'wordshift_daily_challenge_intro_seen',
      'wordshift_challenge_intro_seen',
      'wordshift_journal_intro_seen',
      'wordshift_starter_intro_seen',
      'wordshift_notification_prompted',
      'wordshift_mandatory_harvest_seen',
      'wordshift_pit_harvest_intro_seen',
      'wordshift_gated_unlock_intro_seen',
      'wordshift_harvest_home_intro_seen',
      'wordshift_fox_play_nudge_seen',
      'wordshift_pit_nudge_seen',
    ]) {
      expect(scenario.storage[key]).toBe('true');
    }
  });

  test('preview seed restores the selected L on the canonical board', () => {
    const scenario = buildPlayStoreScenario('puzzle-preview', '2026-07-11');
    const save = stored<{
      rows: {
        originalWord: string;
        words: { id: string; char: string }[];
      }[];
      selectedLetter: { id: string; char: string };
      activeRowIndex: number;
      gameState: string;
      solution: {
        letterToMove: string;
        sourceWord: string;
        targetWord: string;
      }[];
    }>(scenario, 'wordshift_in_progress_puzzle');

    expect(save.rows.map(row => row.originalWord)).toEqual(['PLAY', 'PANT', 'HEAR']);
    expect(rowWords(save)).toEqual(['PLAY', 'PANT', 'HEAR']);
    expect(save.selectedLetter).toMatchObject({ char: 'L' });
    expect(save.rows[0].words.some(letter => letter.id === save.selectedLetter.id)).toBe(true);
    expect(save.activeRowIndex).toBe(0);
    expect(save.gameState).toBe('PLAYING');
    expect(save.solution).toMatchObject([
      { sourceWord: 'PLAY', targetWord: 'PANT', letterToMove: 'L' },
      { sourceWord: 'PLANT', targetWord: 'HEAR', letterToMove: 'T' },
    ]);
  });

  test('chain seed restores the board after the first canonical move', () => {
    const scenario = buildPlayStoreScenario('puzzle-chain', '2026-07-11');
    const save = stored<{
      rows: { words: { char: string }[] }[];
      selectedLetter: null;
      activeRowIndex: number;
      gameState: string;
      history: unknown[];
    }>(scenario, 'wordshift_in_progress_puzzle');

    expect(rowWords(save)).toEqual(['PAY', 'PLANT', 'HEAR']);
    expect(save.activeRowIndex).toBe(1);
    expect(save.selectedLetter).toBeNull();
    expect(save.gameState).toBe('PLAYING');
    expect(save.history).toHaveLength(1);
  });

  test('builds freshly serialized fixture records on every call', () => {
    const first = buildPlayStoreScenario('home-sunny', '2026-07-11');
    const second = buildPlayStoreScenario('home-sunny', '2026-07-11');

    expect(first).not.toBe(second);
    expect(first.storage).not.toBe(second.storage);
    expect(first).toEqual(second);

    first.storage.wordshift_home_progress = '{"mutated":true}';
    expect(second.storage.wordshift_home_progress).not.toBe(first.storage.wordshift_home_progress);
    expect(buildPlayStoreScenario('home-sunny', '2026-07-11')).toEqual(second);
  });

  test.each(['home-sunny', 'animal-dialogue'] as const)(
    '%s uses the approved bright home fixture',
    name => {
      const scenario = buildPlayStoreScenario(name, '2026-07-11');
      const progress = stored<{
        currentPhase: number;
        puzzlesSolved: number;
        amber: number;
        unlockedRooms: string[];
        unlockedAnimals: string[];
        introsSeen: string[];
      }>(scenario, 'wordshift_home_progress');

      expect(progress).toMatchObject({
        currentPhase: 0,
        puzzlesSolved: 12,
        phaseProgress: 12,
        amber: 180,
        unlockedRooms: ['cozy_den', 'kitchen', 'study', 'aquarium'],
        unlockedAnimals: ['fox', 'pangolin', 'owl', 'axolotl'],
      });
      expect(progress.introsSeen).toEqual(progress.unlockedAnimals);
    }
  );

  test('variant seed unlocks every advertised mode with complete star stats', () => {
    const scenario = buildPlayStoreScenario('variant-menu', '2026-07-11');
    const progress = stored<{
      puzzlesSolved: number;
      currentPhase: number;
    }>(scenario, 'wordshift_home_progress');
    const stats = stored<{
      totalPuzzlesCompleted: number;
      totalStars: number;
      threeStarCount: number;
      twoStarCount: number;
      oneStarCount: number;
      totalInvalidAttempts: number;
      totalHintsUsed: number;
      noHintPuzzleCount: number;
      byDifficulty: Record<string, { completed: number; stars: number }>;
      lastUpdated: number;
    }>(scenario, 'wordshift_star_stats');
    const save = stored<{ currentPhase: number }>(
      scenario,
      'wordshift_in_progress_puzzle'
    );

    expect(progress).toEqual(expect.objectContaining({
      puzzlesSolved: 40,
      currentPhase: 1,
    }));
    expect(getUnlockedVariants(progress.puzzlesSolved, progress.currentPhase))
      .toEqual(expect.arrayContaining(['standard', 'reverse', 'double_shift', 'speed']));
    expect(stats.totalPuzzlesCompleted).toBe(40);
    expect(stats.threeStarCount).toBe(34);
    expect(
      stats.threeStarCount + stats.twoStarCount + stats.oneStarCount
    ).toBe(stats.totalPuzzlesCompleted);
    expect(Object.keys(stats.byDifficulty).sort())
      .toEqual(['EASY', 'HARD', 'MEDIUM', 'MEDIUM_PLUS']);
    expect(
      Object.values(stats.byDifficulty)
        .reduce((sum, difficulty) => sum + difficulty.completed, 0)
    ).toBe(stats.totalPuzzlesCompleted);
    expect(save.currentPhase).toBe(progress.currentPhase);
  });

  test('daily seed uses the supplied local date and approved streak state', () => {
    const scenario = buildPlayStoreScenario('daily', '2026-03-09');
    const home = stored<{ puzzlesSolved: number }>(
      scenario,
      'wordshift_home_progress'
    );
    const daily = stored<{
      completedChallenges: { date: string; stars: number; completedAt: number }[];
      currentStreak: number;
      bestStreak: number;
      lastCompletedDate: string;
      streakFreezes: number;
      firstDailyMercyGranted: boolean;
    }>(scenario, 'wordshift_daily_challenge');

    expect(home.puzzlesSolved).toBe(10);
    expect(home.puzzlesSolved).toBeGreaterThanOrEqual(
      DAILY_CHALLENGE_UNLOCK_PUZZLES
    );
    expect(isDailyChallengeUnlocked(home.puzzlesSolved, 0)).toBe(true);
    expect(daily.completedChallenges).toHaveLength(1);
    expect(daily.completedChallenges[0]).toMatchObject({
      date: '2026-03-09',
      stars: 3,
      completedAt: Date.parse('2026-03-09T12:00:00Z'),
    });
    expect(daily).toMatchObject({
      currentStreak: 7,
      bestStreak: 12,
      lastCompletedDate: '2026-03-09',
      streakFreezes: 1,
      firstDailyMercyGranted: true,
    });
  });

  test('flawless victory starts from curated puzzle zero without a saved board', () => {
    const scenario = buildPlayStoreScenario('flawless-victory', '2026-07-11');
    const progress = stored<{
      puzzlesSolved: number;
      phaseProgress: number;
      currentStreak: number;
      lastPlayDate: string | null;
    }>(
      scenario,
      'wordshift_home_progress'
    );

    expect(progress).toEqual(expect.objectContaining({
      puzzlesSolved: 0,
      phaseProgress: 0,
      currentStreak: 0,
      lastPlayDate: null,
    }));
    expect(scenario.storage.wordshift_star_stats).toBeUndefined();
    expect(scenario.storage.wordshift_in_progress_puzzle).toBeUndefined();
  });

  test('dusk seed is phase two with only spoiler-safe companions', () => {
    const scenario = buildPlayStoreScenario('home-dusk', '2026-07-11');
    const progress = stored<{
      currentPhase: number;
      puzzlesSolved: number;
      phaseProgress: number;
      pendingPhaseTransition: null;
      postRevelation: boolean;
      unlockedRooms: string[];
      unlockedAnimals: string[];
    }>(scenario, 'wordshift_home_progress');

    expect(progress).toMatchObject({
      currentPhase: 2,
      puzzlesSolved: 60,
      phaseProgress: 70,
      pendingPhaseTransition: null,
      postRevelation: false,
    });
    expect(progress.unlockedRooms)
      .toEqual(['cozy_den', 'kitchen', 'study', 'aquarium']);
    expect(progress.unlockedAnimals)
      .toEqual(['fox', 'pangolin', 'owl', 'axolotl']);
  });

  test.each([
    ['puzzle-preview', 5, 0, 5],
    ['puzzle-chain', 5, 0, 5],
    ['home-sunny', 12, 0, 12],
    ['animal-dialogue', 12, 0, 12],
    ['variant-menu', 40, 1, 40],
    ['daily', 10, 0, 10],
    ['flawless-victory', 0, 0, 0],
    ['home-dusk', 60, 2, 70],
  ] as const)(
    '%s has coherent puzzle and phase progress',
    (name, puzzlesSolved, currentPhase, phaseProgress) => {
      const scenario = buildPlayStoreScenario(name, '2026-07-11');
      const progress = stored<{
        puzzlesSolved: number;
        currentPhase: number;
        phaseProgress: number;
      }>(scenario, 'wordshift_home_progress');

      expect(progress).toEqual(expect.objectContaining({
        puzzlesSolved,
        currentPhase,
        phaseProgress,
      }));
    }
  );

  test.each([
    ['puzzle-preview', 5],
    ['puzzle-chain', 5],
    ['home-sunny', 12],
    ['animal-dialogue', 12],
    ['variant-menu', 40],
    ['daily', 10],
    ['home-dusk', 60],
  ] as const)('%s has complete stats matching home progress', (name, completed) => {
    const scenario = buildPlayStoreScenario(name, '2026-07-11');
    const stats = stored<{
      totalPuzzlesCompleted: number;
      totalStars: number;
      threeStarCount: number;
      twoStarCount: number;
      oneStarCount: number;
      totalInvalidAttempts: number;
      totalHintsUsed: number;
      noHintPuzzleCount: number;
      flawlessCount: number;
      byDifficulty: Record<string, { completed: number; stars: number }>;
    }>(scenario, 'wordshift_star_stats');

    expect(stats.totalPuzzlesCompleted).toBe(completed);
    expect(
      stats.threeStarCount + stats.twoStarCount + stats.oneStarCount
    ).toBe(completed);
    expect(
      Object.values(stats.byDifficulty)
        .reduce((sum, difficulty) => sum + difficulty.completed, 0)
    ).toBe(completed);
    expect(
      Object.values(stats.byDifficulty)
        .reduce((sum, difficulty) => sum + difficulty.stars, 0)
    ).toBe(stats.totalStars);
    expect(stats.totalInvalidAttempts).toBe(stats.twoStarCount * 2);
    expect(stats.totalHintsUsed).toBe(0);
    expect(stats.noHintPuzzleCount).toBe(completed);
    expect(stats.flawlessCount).toBeLessThanOrEqual(stats.threeStarCount);
  });

  test.each(PLAY_STORE_SCENARIO_NAMES)(
    '%s suppresses the launch streak-freeze grant',
    async name => {
      const today = getLocalDateString();
      await seedScenario(name, today);

      expect(await checkFreeStreakFreeze()).toBe(false);
      expect(await loadProgress()).toEqual(expect.objectContaining({
        lastFreeStreakFreezeDate: today,
        streakFreezes: 1,
      }));
    }
  );

  test.each([
    ['home-sunny', 12, 0],
    ['variant-menu', 40, 1],
    ['flawless-victory', 0, 0],
    ['home-dusk', 60, 2],
  ] as const)(
    '%s hydrates through production progress and stats services',
    async (name, completed, phase) => {
      await seedScenario(name, '2026-07-11');

      const progress = await loadProgress();
      const stats = await getCumulativeStats();
      expect(progress.puzzlesSolved).toBe(completed);
      expect(progress.currentPhase).toBe(phase);
      expect(stats.totalPuzzlesCompleted).toBe(completed);
    }
  );

  test('flawless victory pre-unlocks every achievement triggered by its first win', () => {
    const scenario = buildPlayStoreScenario('flawless-victory', '2026-07-11');
    const achievementProgress = stored<{
      unlockedIds: string[];
      unlockDates: Record<string, number>;
      lastChecked: number;
    }>(scenario, 'wordshift_achievements');
    const progress = stored<{
      currentPhase: number;
      unlockedAnimals: string[];
      unlockedRooms: string[];
      totalAmberEarned: number;
    }>(scenario, 'wordshift_home_progress');
    const postWinState: AchievementCheckState = {
      stats: {
        totalPuzzlesCompleted: 1,
        totalStars: 3,
        threeStarCount: 1,
        twoStarCount: 0,
        oneStarCount: 0,
        totalInvalidAttempts: 0,
        totalHintsUsed: 0,
        noHintPuzzleCount: 1,
        flawlessCount: 1,
        byDifficulty: {
          EASY: { completed: 1, stars: 3 },
          MEDIUM: { completed: 0, stars: 0 },
          MEDIUM_PLUS: { completed: 0, stars: 0 },
          HARD: { completed: 0, stars: 0 },
        },
        lastUpdated: 0,
      },
      puzzlesSolved: 1,
      currentPhase: progress.currentPhase,
      currentStreak: 1,
      unlockedAnimals: progress.unlockedAnimals.length,
      unlockedRooms: progress.unlockedRooms.length,
      amberEarned: progress.totalAmberEarned,
      dailyChallengesCompleted: 0,
      shareCount: 0,
      challengeCompletions: 0,
      variantWins: {},
      blindWins: 0,
    };
    const triggeredIds = ACHIEVEMENTS
      .filter(achievement => achievement.check(postWinState))
      .map(achievement => achievement.id);

    expect(triggeredIds.sort()).toEqual([
      'first_animal',
      'first_perfect',
      'first_puzzle',
      'flawless_first',
    ]);
    expect(achievementProgress.unlockedIds)
      .toEqual(expect.arrayContaining(triggeredIds));
  });
});
