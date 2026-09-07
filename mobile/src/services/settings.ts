import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'wordshift_settings';

/**
 * User settings with persistence
 */
export interface GameSettings {
  soundEnabled: boolean;
  /**
   * Ambient music bed (services/audio.ts startMusicForPhase). Independent of
   * soundEnabled — music has its own toggle. Defaults to true; old saves
   * without the key inherit true via the DEFAULT_SETTINGS spread in
   * getSettings().
   */
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotion: boolean;
  /**
   * Swift Victories: routine wins show a compact result strip instead of the
   * full victory ceremony. Big moments (daily, milestones, phase beats, early
   * game) always keep the full modal. Off by default; old saves without the
   * key inherit false via the DEFAULT_SETTINGS spread in getSettings().
   */
  swiftVictories: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  soundEnabled: true,
  musicEnabled: true,
  hapticsEnabled: true,
  reducedMotion: false,
  swiftVictories: false,
};

// In-memory cache for fast access
let settingsCache: GameSettings | null = null;
let systemReducedMotion = false;
let motionOverride: boolean | null = null;
const settingsListeners = new Set<() => void>();
function notifySettings(): void { settingsListeners.forEach(listener => listener()); }
export function subscribeSettings(listener: () => void): () => void {
  settingsListeners.add(listener);
  return () => { settingsListeners.delete(listener); };
}

/** OS motion is the default. An explicitly saved in-game choice always wins. */
export function startSystemMotionPreference(onChange?: () => void): () => void {
  let alive = true;
  let remove: (() => void) | undefined;
  const unsubscribe = onChange ? subscribeSettings(onChange) : () => {};
  const apply = (value: boolean) => {
    if (!alive) return;
    systemReducedMotion = value;
    if (settingsCache && motionOverride === null) {
      settingsCache = { ...settingsCache, reducedMotion: value };
      notifySettings();
    }
  };
  void getSettings().then(async () => {
    try {
      // Guarded so the settings service continues to work in Node and on web.
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- Defer this dependency to preserve native availability and import-cycle boundaries.
      const { AccessibilityInfo } = require('react-native');
      if (!alive || !AccessibilityInfo) return;
      const listener = AccessibilityInfo.addEventListener?.('reduceMotionChanged', apply);
      remove = () => listener?.remove();
      const value = await AccessibilityInfo.isReduceMotionEnabled?.();
      if (typeof value === 'boolean') apply(value);
    } catch { /* An unavailable OS preference keeps the existing default. */ }
  });
  return () => { alive = false; remove?.(); unsubscribe(); };
}

/**
 * Load settings from storage (or return cached)
 */
export async function getSettings(): Promise<GameSettings> {
  if (settingsCache) return settingsCache;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      motionOverride = typeof parsed.reducedMotion === 'boolean' ? parsed.reducedMotion : null;
      const loaded: GameSettings = { ...DEFAULT_SETTINGS, ...parsed,
        reducedMotion: motionOverride ?? systemReducedMotion };
      settingsCache = loaded;
      return loaded;
    }
  } catch (err) {
    console.warn('Failed to load settings:', err);
  }

  motionOverride = null;
  const defaults: GameSettings = { ...DEFAULT_SETTINGS, reducedMotion: systemReducedMotion };
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
  if (key === 'reducedMotion') motionOverride = value as boolean;
  settingsCache = updated;
  notifySettings();

  try {
    const stored: Partial<GameSettings> = { ...updated };
    if (motionOverride === null) delete stored.reducedMotion;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (err) {
    console.warn('Failed to save settings:', err);
  }

  return updated;
}

/**
 * Get all settings synchronously (must call getSettings() first to populate cache)
 */
export function getSettingsSync(): GameSettings {
  return settingsCache || { ...DEFAULT_SETTINGS, reducedMotion: systemReducedMotion };
}

/** Drop the in-memory settings cache after external storage writes (cloud restore). */
export function invalidateSettingsCache(): void {
  settingsCache = null;
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<GameSettings> {
  motionOverride = null;
  settingsCache = { ...DEFAULT_SETTINGS, reducedMotion: systemReducedMotion };
  notifySettings();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear settings:', err);
  }
  return settingsCache;
}
