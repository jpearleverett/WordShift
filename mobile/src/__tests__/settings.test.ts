import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSettings,
  updateSetting,
  getSettingsSync,
  resetSettings,
  GameSettings,
} from '../services/settings';

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
});
