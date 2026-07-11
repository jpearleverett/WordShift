import fs from 'fs';
import path from 'path';

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
import type {
  AchievementCheckState,
  AchievementProgress,
} from '../services/achievements';
import {
  loadPuzzleState,
  invalidatePuzzleStateCache,
} from '../services/puzzleSaveState';
import {
  DAILY_CHALLENGE_UNLOCK_PUZZLES,
  isDailyChallengeUnlocked,
} from '../services/dailyChallenge';
import {
  AMBER_REWARDS,
  FIRST_COMPLETION_BONUS,
} from '../constants/gameBalance';
import {
  getLocalDateString,
  parseLocalDate,
} from '../services/dateUtils';
import { getUnlockedVariants } from '../services/puzzleVariety';
import {
  PLAY_STORE_SCENARIO_NAMES,
  buildPlayStoreScenario,
  parsePlayStoreScenario,
} from '../dev/playStoreScenarios';
import type { PlayStoreScenario } from '../dev/playStoreScenarios';
import {
  getPlayStoreScenarioName,
  isPlayStoreCaptureActive,
  preparePlayStoreCapture,
  shouldFreezePlayStoreCaptureMotion,
} from '../dev/playStoreCapture';

const NATIVE_CAPTURE_TS = fs.readFileSync(
  path.resolve(__dirname, '../dev/playStoreCapture.ts'),
  'utf8'
);
const originalWindowDescriptor = Object.getOwnPropertyDescriptor(global, 'window');
const originalDevDescriptor = Object.getOwnPropertyDescriptor(global, '__DEV__');

type WebCaptureModule = typeof import('../dev/playStoreCapture.web');

function stored<T>(scenario: PlayStoreScenario, key: string): T {
  return JSON.parse(scenario.storage[key]) as T;
}

function rowWords(save: { rows: { words: { char: string }[] }[] }): string[] {
  return save.rows.map(row => row.words.map(letter => letter.char).join(''));
}

function localDateWithOffset(dateString: string, days: number): string {
  const date = parseLocalDate(dateString);
  date.setDate(date.getDate() + days);
  return getLocalDateString(date);
}

function localNoonTimestamp(dateString: string): number {
  const date = parseLocalDate(dateString);
  date.setHours(12, 0, 0, 0);
  return date.getTime();
}

function loadWebCapture(
  search: string | null,
  isDev: boolean = true
): WebCaptureModule {
  jest.resetModules();
  jest.doMock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: AsyncStorage,
  }));

  const globals = global as unknown as Record<string, unknown>;
  if (search === null) {
    delete globals.window;
  } else {
    globals.window = { location: { search } };
  }
  globals.__DEV__ = isDev;

  return require('../dev/playStoreCapture.web');
}

function restoreCaptureGlobals(): void {
  const globals = global as unknown as Record<string, unknown>;
  if (originalWindowDescriptor) {
    Object.defineProperty(global, 'window', originalWindowDescriptor);
  } else {
    delete globals.window;
  }
  if (originalDevDescriptor) {
    Object.defineProperty(global, '__DEV__', originalDevDescriptor);
  } else {
    delete globals.__DEV__;
  }
}

function resetModulesWithSeededStorage(): void {
  jest.resetModules();
  jest.doMock('@react-native-async-storage/async-storage', () => ({
    __esModule: true,
    default: AsyncStorage,
  }));
  jest.doMock('../services/eventLogger', () => ({
    logEvent: jest.fn(),
  }));
}

function loadFreshDailyChallengeService(): typeof import('../services/dailyChallenge') {
  resetModulesWithSeededStorage();
  return require('../services/dailyChallenge');
}

function loadFreshAchievementService(): typeof import('../services/achievements') {
  resetModulesWithSeededStorage();
  return require('../services/achievements');
}

async function seedScenario(
  name: PlayStoreScenario['name'],
  today: string
): Promise<PlayStoreScenario> {
  const scenario = buildPlayStoreScenario(name, today);
  await AsyncStorage.multiSet(Object.entries(scenario.storage));
  invalidateProgressCache();
  invalidateStatsCache();
  invalidatePuzzleStateCache();
  return scenario;
}

describe('Play Store screenshot scenarios', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    invalidateProgressCache();
    invalidateStatsCache();
    invalidatePuzzleStateCache();
  });

  afterEach(() => {
    restoreCaptureGlobals();
    jest.restoreAllMocks();
    jest.useRealTimers();
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

  test('native capture API is a fixture-free no-op', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    expect(isPlayStoreCaptureActive()).toBe(false);
    expect(getPlayStoreScenarioName()).toBeNull();
    expect(shouldFreezePlayStoreCaptureMotion()).toBe(false);
    await expect(preparePlayStoreCapture()).resolves.toBe(false);
    expect(NATIVE_CAPTURE_TS).toMatch(/import type \{ PlayStoreScenarioName \}/);
    expect(NATIVE_CAPTURE_TS).not.toMatch(/import \{[^}]*buildPlayStoreScenario/);
    expect(NATIVE_CAPTURE_TS).not.toMatch(/console\.warn/);
    expect(warn).not.toHaveBeenCalled();
  });

  test('unknown development web scenario warns once and never writes storage', async () => {
    await AsyncStorage.setItem('existing_state', 'keep-me');
    (AsyncStorage.clear as jest.Mock).mockClear();
    (AsyncStorage.multiSet as jest.Mock).mockClear();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const capture = loadWebCapture('?playStoreScenario=unknown');

    expect(capture.isPlayStoreCaptureActive()).toBe(false);
    await expect(capture.preparePlayStoreCapture()).resolves.toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      '[play-store-capture] Ignored unknown scenario "unknown".'
    );
    expect(AsyncStorage.clear).not.toHaveBeenCalled();
    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
    await expect(AsyncStorage.getItem('existing_state')).resolves.toBe('keep-me');
  });

  test.each([
    ['absent query', '?other=value', true],
    ['missing window', null, true],
    ['production', '?playStoreScenario=unknown', false],
    ['known scenario', '?playStoreScenario=home-sunny', true],
  ] as const)('does not warn for %s', (_label, search, isDev) => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    loadWebCapture(search, isDev);

    expect(warn).not.toHaveBeenCalled();
  });

  test('web capture clears stale state and seeds the exact local-day scenario', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 6, 11, 12, 0, 0));
    await AsyncStorage.setItem('stale_capture_state', 'remove-me');
    (AsyncStorage.clear as jest.Mock).mockClear();
    (AsyncStorage.multiSet as jest.Mock).mockClear();

    const capture = loadWebCapture('?playStoreScenario=home-sunny');

    expect(capture.isPlayStoreCaptureActive()).toBe(true);
    expect(capture.getPlayStoreScenarioName()).toBe('home-sunny');
    expect(capture.shouldFreezePlayStoreCaptureMotion()).toBe(true);
    await expect(capture.preparePlayStoreCapture()).resolves.toBe(true);
    const captureSettings = require('../services/settings') as typeof import('../services/settings');
    expect(captureSettings.getSettingsSync()).toEqual({
      soundEnabled: false,
      hapticsEnabled: false,
      reducedMotion: true,
      swiftVictories: false,
    });

    const expected = buildPlayStoreScenario('home-sunny', '2026-07-11');
    expect(JSON.parse(expected.storage.wordshift_settings)).toEqual({
      soundEnabled: false,
      hapticsEnabled: false,
      reducedMotion: true,
      swiftVictories: false,
    });
    expect(AsyncStorage.clear).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.multiSet).toHaveBeenCalledWith(
      Object.entries(expected.storage)
    );
    expect((AsyncStorage.clear as jest.Mock).mock.invocationCallOrder[0])
      .toBeLessThan((AsyncStorage.multiSet as jest.Mock).mock.invocationCallOrder[0]);
    await expect(AsyncStorage.getAllKeys()).resolves.toEqual(
      Object.keys(expected.storage)
    );
  });

  test('web capture rejects without writing when storage clear fails', async () => {
    const capture = loadWebCapture('?playStoreScenario=home-sunny');
    (AsyncStorage.clear as jest.Mock).mockRejectedValueOnce(
      new Error('clear failed')
    );
    (AsyncStorage.multiSet as jest.Mock).mockClear();

    await expect(capture.preparePlayStoreCapture())
      .rejects.toThrow('clear failed');
    expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
  });

  test('web capture rejects after clear when scenario multiSet fails', async () => {
    await AsyncStorage.setItem('stale_capture_state', 'remove-me');
    const capture = loadWebCapture('?playStoreScenario=home-sunny');
    (AsyncStorage.clear as jest.Mock).mockClear();
    (AsyncStorage.multiSet as jest.Mock).mockRejectedValueOnce(
      new Error('multiSet failed')
    );

    await expect(capture.preparePlayStoreCapture())
      .rejects.toThrow('multiSet failed');
    expect(AsyncStorage.clear).toHaveBeenCalledTimes(1);
    await expect(AsyncStorage.getAllKeys()).resolves.toEqual([]);
  });

  test.each([
    ['production web', '?playStoreScenario=home-sunny', false],
    ['missing window', null, true],
  ] as const)(
    'web capture leaves storage untouched for %s',
    async (_label, search, isDev) => {
      await AsyncStorage.setItem('existing_state', 'keep-me');
      (AsyncStorage.clear as jest.Mock).mockClear();
      (AsyncStorage.multiSet as jest.Mock).mockClear();

      const capture = loadWebCapture(search, isDev);

      expect(capture.isPlayStoreCaptureActive()).toBe(false);
      expect(capture.getPlayStoreScenarioName()).toBeNull();
      expect(capture.shouldFreezePlayStoreCaptureMotion()).toBe(false);
      await expect(capture.preparePlayStoreCapture()).resolves.toBe(false);
      expect(AsyncStorage.clear).not.toHaveBeenCalled();
      expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
      await expect(AsyncStorage.getItem('existing_state')).resolves.toBe('keep-me');
    }
  );

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
      swiftVictories: false,
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
    const home = stored<{ puzzlesSolved: number; currentPhase: number }>(
      scenario,
      'wordshift_home_progress'
    );
    const daily = stored<{
      completedChallenges: { date: string; stars: number; completedAt: number }[];
      totalCompleted: number;
      currentStreak: number;
      bestStreak: number;
      lastCompletedDate: string;
      streakFreezes: number;
      firstDailyMercyGranted: boolean;
    }>(scenario, 'wordshift_daily_challenge');

    expect(home.puzzlesSolved).toBeGreaterThanOrEqual(
      DAILY_CHALLENGE_UNLOCK_PUZZLES + daily.totalCompleted
    );
    expect(home.puzzlesSolved).toBeGreaterThanOrEqual(
      DAILY_CHALLENGE_UNLOCK_PUZZLES
    );
    expect(isDailyChallengeUnlocked(home.puzzlesSolved, home.currentPhase)).toBe(true);
    expect(daily.totalCompleted).toBe(19);
    expect(daily.completedChallenges).toHaveLength(daily.totalCompleted);
    expect(daily.completedChallenges.slice(0, 12).map(result => result.date))
      .toEqual(Array.from(
        { length: 12 },
        (_, index) => localDateWithOffset('2026-03-09', index - 19)
      ));
    expect(daily.completedChallenges.slice(-7).map(result => result.date))
      .toEqual(Array.from(
        { length: 7 },
        (_, index) => localDateWithOffset('2026-03-09', index - 6)
      ));
    expect(daily.completedChallenges.map(result => result.date))
      .not.toContain(localDateWithOffset('2026-03-09', -7));
    for (const result of daily.completedChallenges) {
      expect(result.completedAt).toBe(localNoonTimestamp(result.date));
    }
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
    ['daily', 27, 1, 50],
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
    ['daily', 27],
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
      personalBests?: Record<string, {
        fewestHints: number;
        fewestInvalidAttempts: number;
      }>;
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
    expect(Object.keys(stats.personalBests ?? {}).sort()).toEqual(
      Object.entries(stats.byDifficulty)
        .filter(([, difficulty]) => difficulty.completed > 0)
        .map(([difficulty]) => difficulty)
        .sort()
    );
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

  test('production stats reload scenario storage after warm-cache invalidation', async () => {
    expect((await getCumulativeStats()).totalPuzzlesCompleted).toBe(0);
    const scenario = buildPlayStoreScenario('variant-menu', '2026-07-11');
    await AsyncStorage.multiSet(Object.entries(scenario.storage));

    expect((await getCumulativeStats()).totalPuzzlesCompleted).toBe(0);
    invalidateStatsCache();

    expect((await getCumulativeStats()).totalPuzzlesCompleted).toBe(40);
  });

  test.each([
    ['puzzle-preview', 0, 'L'],
    ['puzzle-chain', 1, null],
  ] as const)(
    '%s hydrates its saved board through the production puzzle loader',
    async (name, activeRowIndex, selectedLetter) => {
      await seedScenario(name, '2026-07-11');

      const save = await loadPuzzleState();

      expect(save).not.toBeNull();
      expect(save?.activeRowIndex).toBe(activeRowIndex);
      expect(save?.selectedLetter?.char ?? null).toBe(selectedLetter);
      expect(save?.undosRemaining).toBe(Infinity);
    }
  );

  test('daily hydrates the supplied completed date through production loaders', async () => {
    const today = getLocalDateString();
    await seedScenario('daily', today);
    const {
      getDailyStatus,
      loadDailyProgress,
    } = loadFreshDailyChallengeService();

    const progress = await loadDailyProgress();
    const status = await getDailyStatus();
    const currentRunDates = Array.from(
      { length: 7 },
      (_, index) => localDateWithOffset(today, index - 6)
    );

    expect(progress.lastCompletedDate).toBe(today);
    expect(progress.currentStreak).toBe(7);
    expect(progress.bestStreak).toBe(12);
    expect(progress.completedChallenges).toHaveLength(progress.totalCompleted);
    expect(progress.completedChallenges.slice(-7).map(result => result.date))
      .toEqual(currentRunDates);
    expect(progress.completedChallenges.at(-1)).toEqual(expect.objectContaining({
      date: today,
      stars: 3,
      completedAt: localNoonTimestamp(today),
    }));
    expect(status).toEqual(expect.objectContaining({
      isCompleted: true,
      streak: 7,
      bestStreak: 12,
      totalCompleted: progress.totalCompleted,
    }));
    expect(status.todayResult).toEqual(expect.objectContaining({
      date: today,
      stars: 3,
    }));
  });

  test('flawless victory hydrates its pre-unlocked achievements', async () => {
    await seedScenario('flawless-victory', '2026-07-11');
    const { loadAchievements } = loadFreshAchievementService();

    const progress = await loadAchievements();

    expect([...progress.unlockedIds].sort()).toEqual([
      'first_animal',
      'first_perfect',
      'first_puzzle',
      'flawless_first',
    ]);
  });

  test('flawless victory emits no achievements after its first curated win', async () => {
    const scenario = await seedScenario('flawless-victory', '2026-07-11');
    const progress = stored<{
      currentPhase: number;
      unlockedAnimals: string[];
      unlockedRooms: string[];
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
        lastUpdated: localNoonTimestamp('2026-07-11'),
      },
      puzzlesSolved: 1,
      currentPhase: progress.currentPhase,
      currentStreak: 1,
      unlockedAnimals: progress.unlockedAnimals.length,
      unlockedRooms: progress.unlockedRooms.length,
      amberEarned:
        Math.floor(AMBER_REWARDS.EASY * 1.5) +
        FIRST_COMPLETION_BONUS.EASY,
      dailyChallengesCompleted: 0,
      shareCount: 0,
      challengeCompletions: 0,
      variantWins: {},
      blindWins: 0,
    };
    const {
      checkAchievements,
      loadAchievements,
    } = loadFreshAchievementService();
    const achievementProgress: AchievementProgress = await loadAchievements();

    expect(achievementProgress.unlockedIds).toHaveLength(4);
    await expect(checkAchievements(postWinState)).resolves.toEqual([]);
  });
});
