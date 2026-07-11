/**
 * Creator kit (press/reviewer fast-forward) tests.
 *
 * The kit is config-gated: a non-empty `creatorCode` in app config extra
 * enables it, absence leaves it fully inert. The snapshot builder drives the
 * services' own exported APIs, so these tests assert on the real service
 * state (amberCurrency / starRating / onboarding) after an apply.
 */

// Mutable expo-config extra so we can toggle configured/unconfigured per test
// (mirrors supabaseClient.test.ts / supabaseCloud.test.ts).
let mockExtra: Record<string, unknown> = {};
jest.mock('expo-constants', () => ({
  default: {
    get expoConfig() {
      return { extra: mockExtra, version: '1.0.0' };
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

// purchaseUnlock / setOnboardingStep / confirmPhaseTransition all log events;
// mock the logger so its debounced flush timer can't fire after teardown.
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
  getInstallAgeDays: jest.fn(async () => 1),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CREATOR_ERAS,
  applyCreatorSnapshot,
  isCreatorEra,
  isCreatorKitEnabled,
  validateCreatorCode,
} from '../services/creatorKit';
import {
  clearProgress,
  getFullProgress,
  hasSeenMandatoryHarvest,
  isPostRevelation,
} from '../services/amberCurrency';
import { clearStats, getCumulativeStats } from '../services/starRating';
import { clearAchievements, getUnlockedCount } from '../services/achievements';
import { isOnboardingComplete, resetOnboarding } from '../services/onboarding';
import { MIN_PUZZLES_FOR_PHASE } from '../constants/gameBalance';

const CODE = 'REVIEW-EMBER-2026';

beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
  await clearProgress();
  await clearStats();
  await clearAchievements();
  await resetOnboarding();
  mockExtra = { creatorCode: CODE };
});

describe('enablement gating', () => {
  test('disabled when no creatorCode is configured', () => {
    mockExtra = {};
    expect(isCreatorKitEnabled()).toBe(false);
  });

  test('disabled when creatorCode is empty or whitespace', () => {
    mockExtra = { creatorCode: '' };
    expect(isCreatorKitEnabled()).toBe(false);
    mockExtra = { creatorCode: '   ' };
    expect(isCreatorKitEnabled()).toBe(false);
  });

  test('disabled when creatorCode is not a string', () => {
    mockExtra = { creatorCode: 12345 };
    expect(isCreatorKitEnabled()).toBe(false);
  });

  test('enabled when a non-empty creatorCode is configured', () => {
    expect(isCreatorKitEnabled()).toBe(true);
  });

  test('validateCreatorCode always false when unconfigured', () => {
    mockExtra = {};
    expect(validateCreatorCode(CODE)).toBe(false);
    expect(validateCreatorCode('')).toBe(false);
  });

  test('applyCreatorSnapshot is a no-op returning false when unconfigured', async () => {
    mockExtra = {};
    const ok = await applyCreatorSnapshot('reveal');
    expect(ok).toBe(false);
    const progress = await getFullProgress();
    expect(progress.puzzlesSolved).toBe(0);
    expect(progress.currentPhase).toBe(0);
    expect(await isOnboardingComplete()).toBe(false);
  });
});

describe('validateCreatorCode', () => {
  test('accepts the exact configured code', () => {
    expect(validateCreatorCode(CODE)).toBe(true);
  });

  test('is trim- and case-insensitive', () => {
    expect(validateCreatorCode('  review-ember-2026  ')).toBe(true);
    expect(validateCreatorCode('Review-Ember-2026')).toBe(true);
  });

  test('rejects wrong, partial, and empty codes', () => {
    expect(validateCreatorCode('WRONG-CODE')).toBe(false);
    expect(validateCreatorCode('REVIEW-EMBER')).toBe(false);
    expect(validateCreatorCode(`${CODE}X`)).toBe(false);
    expect(validateCreatorCode('')).toBe(false);
  });
});

describe('isCreatorEra', () => {
  test('accepts each shipped era and rejects everything else', () => {
    for (const era of CREATOR_ERAS) {
      expect(isCreatorEra(era)).toBe(true);
    }
    expect(isCreatorEra('phase4')).toBe(false);
    expect(isCreatorEra('')).toBe(false);
  });
});

describe('applyCreatorSnapshot', () => {
  test(
    "'reveal' produces a coherent Phase 4 post-house save",
    async () => {
      const ok = await applyCreatorSnapshot('reveal');
      expect(ok).toBe(true);

      const progress = await getFullProgress();
      // The cult-reveal phase, confirmed (no dangling pit ceremony).
      expect(progress.currentPhase).toBe(4);
      expect(progress.pendingPhaseTransition ?? null).toBeNull();
      // Enough real puzzles to satisfy the Phase 4 exposure floor.
      expect(progress.puzzlesSolved).toBeGreaterThanOrEqual(MIN_PUZZLES_FOR_PHASE[4]);
      // Full house: every room (13 incl. the starter den) and every animal.
      expect(progress.unlockedRooms.length).toBeGreaterThanOrEqual(10);
      expect(progress.unlockedAnimals.length).toBeGreaterThanOrEqual(10);
      expect(progress.houseCompleted).toBe(true);
      // Reviewer has spending money and a real earnings history.
      expect(progress.amber).toBeGreaterThan(0);
      expect(progress.totalAmberEarned).toBeGreaterThan(progress.amber);
      // No stale tutorials: onboarding + the teaching gates are behind them.
      expect(await isOnboardingComplete()).toBe(true);
      expect(await hasSeenMandatoryHarvest()).toBe(true);
      // Intro dialogue marked seen for every unlocked animal.
      for (const animalId of progress.unlockedAnimals) {
        expect(progress.introsSeen).toContain(animalId);
      }
      // Dialogue indices fast-forwarded so animals speak era-appropriate lines.
      expect(progress.lastDialogueRead['fox']).toBeGreaterThan(0);
      // Stats mirror the simulated history.
      const stats = await getCumulativeStats();
      expect(stats.totalPuzzlesCompleted).toBe(progress.puzzlesSolved);
      expect(stats.threeStarCount).toBeGreaterThan(0);
      // Word ledger seeded (the Word Ledger screen isn't empty).
      expect(progress.totalWordsFormed ?? 0).toBeGreaterThan(0);
      // Retroactive achievements absorbed silently.
      expect(await getUnlockedCount()).toBeGreaterThan(0);
    },
    30000
  );

  test(
    "'peace' yields the post-revelation Phase 5 world",
    async () => {
      const ok = await applyCreatorSnapshot('peace');
      expect(ok).toBe(true);

      const progress = await getFullProgress();
      expect(progress.currentPhase).toBe(5);
      expect(await isPostRevelation()).toBe(true);
      expect(progress.houseCompleted).toBe(true);
      expect(progress.finalPuzzleCompleted).toBe(true);
      expect(progress.puzzlesSolved).toBeGreaterThanOrEqual(MIN_PUZZLES_FOR_PHASE[5]);
      expect(progress.pendingPhaseTransition ?? null).toBeNull();
    },
    30000
  );

  test(
    "'dusk' stops at Phase 2 with an era-appropriate partial house",
    async () => {
      const ok = await applyCreatorSnapshot('dusk');
      expect(ok).toBe(true);

      const progress = await getFullProgress();
      expect(progress.currentPhase).toBe(2);
      expect(progress.puzzlesSolved).toBeGreaterThanOrEqual(MIN_PUZZLES_FOR_PHASE[2]);
      // Mid-game slice: through the office/capybara, not the burrow onward.
      expect(progress.unlockedAnimals).toContain('capybara');
      expect(progress.unlockedAnimals).not.toContain('wombat');
      expect(progress.unlockedRooms).toContain('office');
      expect(progress.unlockedRooms).not.toContain('burrow');
      expect(progress.houseCompleted ?? false).toBe(false);
    },
    30000
  );

  test(
    "'shadows' lands on Phase 3 with the original house complete",
    async () => {
      const ok = await applyCreatorSnapshot('shadows');
      expect(ok).toBe(true);

      const progress = await getFullProgress();
      expect(progress.currentPhase).toBe(3);
      expect(progress.puzzlesSolved).toBeGreaterThanOrEqual(MIN_PUZZLES_FOR_PHASE[3]);
      // Through the bamboo attic / red panda; the high rooms are still ahead.
      expect(progress.unlockedAnimals).toContain('red_panda');
      expect(progress.unlockedAnimals).not.toContain('tarsier');
      expect(progress.unlockedRooms).not.toContain('star_loft');
    },
    30000
  );

  test('rejects an unknown era without touching state', async () => {
    const ok = await applyCreatorSnapshot('finale' as never);
    expect(ok).toBe(false);
    const progress = await getFullProgress();
    expect(progress.puzzlesSolved).toBe(0);
  });
});
