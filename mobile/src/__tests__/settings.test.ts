import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSettings,
  updateSetting,
  getSettingsSync,
  resetSettings,
  invalidateSettingsCache,
  GameSettings,
  startSystemMotionPreference,
} from '../services/settings';
import { AccessibilityInfo } from 'react-native';

jest.mock('react-native', () => ({ AccessibilityInfo: {
  isReduceMotionEnabled: jest.fn(async () => true),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
} }));

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

describe('settings', () => {
  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    await resetSettings();
  });

  test('getSettings returns defaults initially', async () => {
    const settings = await getSettings();
    expect(settings.soundEnabled).toBe(true);
    expect(settings.hapticsEnabled).toBe(true);
    expect(settings.reducedMotion).toBe(false);
  });

  test('updateSetting changes a single setting', async () => {
    const updated = await updateSetting('soundEnabled', false);
    expect(updated.soundEnabled).toBe(false);
    expect(updated.hapticsEnabled).toBe(true);
  });

  test('settings persist via AsyncStorage', async () => {
    await updateSetting('hapticsEnabled', false);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  test('getSettingsSync returns cached settings', async () => {
    await getSettings(); // Load into cache
    const sync = getSettingsSync();
    expect(sync.soundEnabled).toBe(true);
  });

  test('resetSettings restores defaults', async () => {
    await updateSetting('soundEnabled', false);
    await updateSetting('reducedMotion', true);
    const settings = await resetSettings();
    expect(settings.soundEnabled).toBe(true);
    expect(settings.reducedMotion).toBe(false);
  });

  describe('musicEnabled', () => {
    test('defaults to true (music on out of the box, own toggle)', async () => {
      const settings = await getSettings();
      expect(settings.musicEnabled).toBe(true);
    });

    test('toggles independently of soundEnabled', async () => {
      const updated = await updateSetting('musicEnabled', false);
      expect(updated.musicEnabled).toBe(false);
      expect(updated.soundEnabled).toBe(true);
      expect(getSettingsSync().musicEnabled).toBe(false);
    });

    test('an old save missing the key defaults to true without a migration', async () => {
      // Simulate a pre-music save on disk (no musicEnabled in the stored JSON).
      await AsyncStorage.setItem(
        'wordshift_settings',
        JSON.stringify({ soundEnabled: false, hapticsEnabled: true, reducedMotion: false })
      );
      invalidateSettingsCache();

      const settings = await getSettings();
      expect(settings.soundEnabled).toBe(false);
      expect(settings.musicEnabled).toBe(true);
    });

    test('resetSettings turns musicEnabled back on', async () => {
      await updateSetting('musicEnabled', false);
      const settings = await resetSettings();
      expect(settings.musicEnabled).toBe(true);
    });
  });

  describe('swiftVictories', () => {
    test('defaults to false', async () => {
      const settings = await getSettings();
      expect(settings.swiftVictories).toBe(false);
    });

    test('can be toggled on and persists like other settings', async () => {
      const updated = await updateSetting('swiftVictories', true);
      expect(updated.swiftVictories).toBe(true);
      // Other settings untouched
      expect(updated.soundEnabled).toBe(true);
      expect(updated.reducedMotion).toBe(false);
      expect(getSettingsSync().swiftVictories).toBe(true);
    });

    test('an old save missing the key defaults to false without a migration', async () => {
      // Simulate a pre-swiftVictories save on disk (no key in the stored JSON).
      await AsyncStorage.setItem(
        'wordshift_settings',
        JSON.stringify({ soundEnabled: false, hapticsEnabled: true, reducedMotion: true })
      );
      invalidateSettingsCache();

      const settings = await getSettings();
      // Old values survive, the missing key inherits the default.
      expect(settings.soundEnabled).toBe(false);
      expect(settings.reducedMotion).toBe(true);
      expect(settings.swiftVictories).toBe(false);
    });

    test('resetSettings turns swiftVictories back off', async () => {
      await updateSetting('swiftVictories', true);
      const settings = await resetSettings();
      expect(settings.swiftVictories).toBe(false);
    });
  });
});

describe('OS motion preference', () => {
  let stop: (() => void) | undefined;
  afterEach(() => {
    const listener = (AccessibilityInfo.addEventListener as jest.Mock).mock.calls.at(-1)?.[1];
    listener?.(false); stop?.(); stop = undefined;
  });
  test('uses the OS default without persisting it as a manual choice', async () => {
    await resetSettings();
    const changed = jest.fn();
    stop = startSystemMotionPreference(changed);
    for (let n = 0; n < 6; n++) await Promise.resolve();
    expect(getSettingsSync().reducedMotion).toBe(true);
    expect(changed).toHaveBeenCalled();
    await updateSetting('soundEnabled', false);
    const stored = JSON.parse((await AsyncStorage.getItem('wordshift_settings'))!);
    expect(stored.reducedMotion).toBeUndefined();
  });
  test('preserves an explicit saved motion choice while the OS changes', async () => {
    await resetSettings(); await updateSetting('reducedMotion', false);
    invalidateSettingsCache();
    stop = startSystemMotionPreference();
    for (let n = 0; n < 6; n++) await Promise.resolve();
    expect(getSettingsSync().reducedMotion).toBe(false);
  });
});
