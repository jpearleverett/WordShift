/**
 * Reset All Progress — regression test for the "Reset All doesn't reset" bug.
 *
 * Player report: pressing Reset All Progress returned them to the home screen
 * with their save intact. Two real causes:
 *   1. The clears ran under Promise.all — a single rejection abandoned the
 *      batch and skipped the restart flow. performFullReset now runs every
 *      clear independently (Promise.allSettled) and reports failures.
 *   2. With cloud save configured, the pre-reset save survived in the backend
 *      and the next launch's fresh-install auto-restore silently brought it
 *      back. performFullReset now overwrites the cloud row with the cleared
 *      state (a no-op under the NoOp provider used here).
 *
 * This test drives the REAL reset routine (exported from SettingsScreen) and
 * asserts key services report virgin state afterwards — from both their
 * in-memory caches and storage — without any process restart.
 */

// SettingsScreen pulls the full component surface; stub the native bits so the
// module graph loads in Node (the reset routine itself is pure TS + storage).
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  Switch: 'Switch',
  ScrollView: 'ScrollView',
  Modal: 'Modal',
  TextInput: 'TextInput',
  ActivityIndicator: 'ActivityIndicator',
  Image: 'Image',
  Alert: { alert: jest.fn() },
  Linking: { openURL: jest.fn(async () => {}) },
  Platform: { OS: 'android', select: (o: any) => o?.android },
  StatusBar: { currentHeight: 24 },
  Dimensions: { get: () => ({ width: 400, height: 800 }) },
  StyleSheet: {
    create: (styles: any) => styles,
    hairlineWidth: 1,
    absoluteFill: {},
  },
  Animated: {
    View: 'AnimatedView',
    Text: 'AnimatedText',
    Value: jest.fn().mockImplementation((v: number) => ({
      _value: v,
      setValue: jest.fn(),
      interpolate: jest.fn(() => 'interpolated'),
    })),
    timing: jest.fn(() => ({ start: jest.fn() })),
    spring: jest.fn(() => ({ start: jest.fn() })),
    loop: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    sequence: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn() })),
    multiply: jest.fn(),
  },
  Easing: { inOut: jest.fn(() => jest.fn()), sin: jest.fn(), out: jest.fn(() => jest.fn()) },
}));

jest.mock('react-native-gesture-handler', () => ({ TouchableOpacity: 'TouchableOpacity' }));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0', extra: {} } },
}));

jest.mock('expo-updates', () => ({
  reloadAsync: jest.fn(async () => {}),
}));

jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.1',
  nativeBuildVersion: '24',
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  selectionAsync: jest.fn(async () => {}),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: 'SafeAreaProvider',
}));

// Keep the debounced flush timer out of the run (testing pattern for any
// code path that reaches logEvent). clearEvents stays observable.
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
  clearEvents: jest.fn(async () => {}),
  getEvents: jest.fn(async () => []),
  getAllStoredEvents: jest.fn(async () => []),
  removeOldestEvents: jest.fn(async () => {}),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { performFullReset, performNewCycle, LOCAL_RESET_MARKER_KEY } from '../components/SettingsScreen';
import {
  awardBonusAmber,
  getAmberBalance,
  getCurrentPhase,
  getFullProgress,
  clearProgress,
  invalidateProgressCache,
} from '../services/amberCurrency';
import {
  recordPuzzleCompletion,
  getCumulativeStats,
  clearStats,
} from '../services/starRating';
import {
  setOnboardingStep,
  getOnboardingStep,
  resetOnboarding,
} from '../services/onboarding';
import { initHints, addHints, getHintBalance, clearHints } from '../services/hints';
import { updateSetting, getSettings, resetSettings } from '../services/settings';
import { clearStoryState, loadStoryState, recordStoryBoundary, STORY_STORAGE_KEY } from '../services/storySpine';
import { STARTING_FREE_HINTS } from '../constants/gameBalance';

describe('performFullReset', () => {
  beforeEach(async () => {
    await (AsyncStorage.clear as jest.Mock)();
    // Reset the in-memory service caches too (shared module state across tests)
    await clearProgress();
    await clearStats();
    await clearHints();
    await resetOnboarding();
    await resetSettings();
    await clearStoryState();
  });

  test('returns every key service to virgin state without a restart', async () => {
    // ---- Seed a lived-in save ----
    await awardBonusAmber(120, 'test_seed');
    await recordPuzzleCompletion('MEDIUM', 0, 0);
    await setOnboardingStep('complete');
    await initHints(); // seeds the free hint pack
    await addHints(3, 'test_seed');
    await updateSetting('soundEnabled', false);
    await recordStoryBoundary({ phase: 4, puzzlesSolved: 116, cycleCount: 0, unlockedAnimals: ['fox'] }, 'CLOSED');

    // Sanity: the save is non-virgin before the reset
    expect(await getAmberBalance()).toBeGreaterThan(0);
    expect((await getCumulativeStats()).totalPuzzlesCompleted).toBe(1);
    expect(await getOnboardingStep()).toBe('complete');
    expect(await getHintBalance()).toBe(STARTING_FREE_HINTS + 3);
    expect((await getSettings()).soundEnabled).toBe(false);

    // ---- The real reset routine ----
    const failures = await performFullReset();

    // Every clear must succeed — a named failure here means one of the ~28
    // clear functions threw/rejected (the original Promise.all bug class).
    expect(failures).toEqual([]);

    // ---- Virgin state, read straight through the live service caches ----
    expect(await getAmberBalance()).toBe(0);
    expect(await getCurrentPhase()).toBe(0);
    expect((await getFullProgress()).puzzlesSolved).toBe(0);
    expect((await getCumulativeStats()).totalPuzzlesCompleted).toBe(0);
    expect(await getOnboardingStep()).toBe('not_started');
    expect((await getSettings()).soundEnabled).toBe(true);

    // Hints wipe back to the pre-seed default; a fresh bootstrap re-seeds
    // the free pack exactly once, like a brand-new install.
    expect(await getHintBalance()).toBe(0);
    const reseeded = await initHints();
    expect(reseeded.balance).toBe(STARTING_FREE_HINTS);

    // The home-progress key doubles as cloudSave's fresh-install sentinel;
    // it must actually be gone from storage after the wipe.
    expect(await AsyncStorage.getItem('wordshift_home_progress')).toBeNull();
    expect(await AsyncStorage.getItem(STORY_STORAGE_KEY)).toBeNull();
  });

  // The post-reset upload is the ONLY thing keeping the bootstrap's
  // fresh-install auto-restore from pulling the pre-reset save straight back
  // down after Updates.reloadAsync — and it is a single 8s RPC fired at the
  // exact moment a player deliberately wipes their save, with no retry. Under
  // the NoOp provider used here (and offline in the wild) it does not succeed,
  // so the reset must leave a local stamp behind for cloudSave to refuse a
  // cloud row older than the reset.
  test('New Cycle preserves the chosen boundary while resetting the live story', async () => {
    const progress = await getFullProgress();
    await AsyncStorage.setItem('wordshift_home_progress', JSON.stringify({ ...progress,
      currentPhase: 5, postRevelation: true, finalPuzzleCompleted: true, houseCompleted: true, puzzlesSolved: 120,
    }));
    invalidateProgressCache();
    await recordStoryBoundary({ phase: 5, puzzlesSolved: 120, cycleCount: 0, unlockedAnimals: ['fox'] }, 'CLOSER');
    expect(await performNewCycle()).toBe(1);
    const next = await getFullProgress();
    const state = await loadStoryState({ phase: next.currentPhase, puzzlesSolved: next.puzzlesSolved,
      cycleCount: next.cycleCount ?? 0, cycleStartPuzzles: next.cycleStartPuzzles, unlockedAnimals: next.unlockedAnimals });
    expect(state.boundary).toBeNull();
    expect(state.carriedBoundary).toBe('release');
    expect(state.memories).toEqual({});
  });

  test('stamps a local reset marker when the post-reset upload does not land', async () => {
    await awardBonusAmber(120, 'test_seed');
    const before = Date.now();
    await performFullReset();

    const marker = await AsyncStorage.getItem(LOCAL_RESET_MARKER_KEY);
    expect(marker).not.toBeNull();
    expect(Number(marker)).toBeGreaterThanOrEqual(before);
  });

  // Device-local by design: the marker must not ride cloud sync (it would
  // round-trip through a restore and defeat itself) and must survive its own
  // reset (same category as wordshift_pending_iap_grants).
  test('the reset marker is not itself cleared by the reset', async () => {
    await performFullReset();
    expect(await AsyncStorage.getItem(LOCAL_RESET_MARKER_KEY)).not.toBeNull();
    await performFullReset();
    expect(await AsyncStorage.getItem(LOCAL_RESET_MARKER_KEY)).not.toBeNull();
  });

  test('is idempotent — running on an already-virgin save succeeds cleanly', async () => {
    const failures = await performFullReset();
    expect(failures).toEqual([]);
    expect(await getAmberBalance()).toBe(0);
    expect(await getOnboardingStep()).toBe('not_started');
  });
});
