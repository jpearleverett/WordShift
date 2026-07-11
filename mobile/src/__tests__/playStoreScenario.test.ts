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

describe('Play Store screenshot scenarios', () => {
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

    expect(scenario.storage.wordshift_schema_version).toBe('4');
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
        puzzlesSolved: 22,
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

    expect(progress.puzzlesSolved).toBeGreaterThanOrEqual(40);
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
    expect(scenario.storage.wordshift_in_progress_puzzle).toBeDefined();
  });

  test('daily seed uses the supplied local date and approved streak state', () => {
    const scenario = buildPlayStoreScenario('daily', '2026-03-09');
    const home = stored<{ puzzlesSolved: number }>(
      scenario,
      'wordshift_home_progress'
    );
    const daily = stored<{
      completedChallenges: { date: string; stars: number }[];
      currentStreak: number;
      bestStreak: number;
      lastCompletedDate: string;
      streakFreezes: number;
      firstDailyMercyGranted: boolean;
    }>(scenario, 'wordshift_daily_challenge');

    expect(home.puzzlesSolved).toBeGreaterThanOrEqual(10);
    expect(daily.completedChallenges).toHaveLength(1);
    expect(daily.completedChallenges[0]).toMatchObject({
      date: '2026-03-09',
      stars: 3,
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
    const progress = stored<{ puzzlesSolved: number }>(
      scenario,
      'wordshift_home_progress'
    );

    expect(progress.puzzlesSolved).toBe(0);
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
});
