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
import { performFullReset } from '../components/SettingsScreen';
import {
  awardBonusAmber,
  getAmberBalance,
  getCurrentPhase,
  getFullProgress,
  clearProgress,
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
  });

  test('returns every key service to virgin state without a restart', async () => {
    // ---- Seed a lived-in save ----
    await awardBonusAmber(120, 'test_seed');
    await recordPuzzleCompletion('MEDIUM', 0, 0);
    await setOnboardingStep('complete');
    await initHints(); // seeds the free hint pack
    await addHints(3, 'test_seed');
    await updateSetting('soundEnabled', false);

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
  });

  test('is idempotent — running on an already-virgin save succeeds cleanly', async () => {
    const failures = await performFullReset();
    expect(failures).toEqual([]);
    expect(await getAmberBalance()).toBe(0);
    expect(await getOnboardingStep()).toBe('not_started');
  });
});
