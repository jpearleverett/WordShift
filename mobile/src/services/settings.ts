import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'wordshift_settings';

/**
 * User settings with persistence
 */
export interface GameSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  reducedMotion: false,
};

// In-memory cache for fast access
let settingsCache: GameSettings | null = null;

/**
 * Load settings from storage (or return cached)
 */
export async function getSettings(): Promise<GameSettings> {
  if (settingsCache) return settingsCache;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const loaded: GameSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      settingsCache = loaded;
      return loaded;
    }
  } catch (err) {
    console.warn('Failed to load settings:', err);
  }

  const defaults: GameSettings = { ...DEFAULT_SETTINGS };
  settingsCache = defaults;
  return defaults;
}

/**
 * Update a single setting
 */
export async function updateSetting<K extends keyof GameSettings>(
  key: K,
  value: GameSettings[K]
): Promise<GameSettings> {
  const current = await getSettings();
  const updated = { ...current, [key]: value };
  settingsCache = updated;

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save settings:', err);
  }

  return updated;
}

/**
 * Get all settings synchronously (must call getSettings() first to populate cache)
 */
export function getSettingsSync(): GameSettings {
  return settingsCache || DEFAULT_SETTINGS;
}

/** Drop the in-memory settings cache after external storage writes (cloud restore). */
export function invalidateSettingsCache(): void {
  settingsCache = null;
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<GameSettings> {
  settingsCache = { ...DEFAULT_SETTINGS };
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear settings:', err);
  }
  return settingsCache;
}
