import { storage } from './storage';

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

/**
 * Load settings from MMKV (synchronous)
 */
export function getSettings(): GameSettings {
  const stored = storage.getString(STORAGE_KEY);
  if (stored !== undefined) {
    const loaded: GameSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    return loaded;
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Update a single setting
 */
export function updateSetting<K extends keyof GameSettings>(
  key: K,
  value: GameSettings[K]
): GameSettings {
  const current = getSettings();
  const updated = { ...current, [key]: value };
  storage.set(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Get all settings synchronously — now identical to getSettings()
 */
export function getSettingsSync(): GameSettings {
  return getSettings();
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): GameSettings {
  storage.remove(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS };
}
