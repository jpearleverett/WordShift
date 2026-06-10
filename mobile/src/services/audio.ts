import { Audio } from 'expo-av';
import { getSettings } from './settings';

/**
 * Sound effects system for WordShift
 *
 * Plays short WAV assets from assets/sounds/ via expo-av.
 * Sounds are lazily loaded on first play and cached for instant replay;
 * hot-path sounds are preloaded during initAudio().
 * Each sound checks the user's sound preference before playing, and all
 * errors are swallowed — sounds must never crash gameplay.
 */

// Sound name → bundled asset source
const SOUND_SOURCES: Record<string, any> = {
  tap: require('../../assets/sounds/tap.wav'),
  letter_select: require('../../assets/sounds/letter_select.wav'),
  valid_move: require('../../assets/sounds/valid_move.wav'),
  invalid_move: require('../../assets/sounds/invalid_move.wav'),
  undo: require('../../assets/sounds/undo.wav'),
  hint: require('../../assets/sounds/hint.wav'),
  victory: require('../../assets/sounds/victory.wav'),
  perfect: require('../../assets/sounds/perfect.wav'),
  amber_earn: require('../../assets/sounds/amber_earn.wav'),
  achievement: require('../../assets/sounds/achievement.wav'),
  unlock: require('../../assets/sounds/unlock.wav'),
  dialogue: require('../../assets/sounds/dialogue.wav'),
  phase_change: require('../../assets/sounds/phase_change.wav'),
  daily_ready: require('../../assets/sounds/daily_ready.wav'),
};

// Hot-path sounds preloaded at init for latency-free first playback
const PRELOAD_SOUND_NAMES = [
  'tap',
  'letter_select',
  'valid_move',
  'invalid_move',
  'victory',
  'amber_earn',
];

const SOUND_VOLUME = 0.8;

let audioInitialized = false;

/**
 * Initialize the audio system - call once on app start
 */
export async function initAudio(): Promise<void> {
  if (audioInitialized) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    audioInitialized = true;
  } catch (err) {
    console.warn('Failed to initialize audio:', err);
  }

  // Preload hot-path sounds (fire-and-forget — failures are non-critical)
  for (const name of PRELOAD_SOUND_NAMES) {
    loadSound(name).catch(() => {});
  }
}

async function isEnabled(): Promise<boolean> {
  const settings = await getSettings();
  return settings.soundEnabled;
}

// Sound cache for loaded sounds
const soundCache: Map<string, Audio.Sound> = new Map();

// Guards against concurrent first-loads of the same sound
const loadingSounds: Map<string, Promise<Audio.Sound | null>> = new Map();

/**
 * Get a sound from the cache, lazily loading it on first access.
 * Returns null (never throws) when the sound can't be loaded.
 */
async function loadSound(name: string): Promise<Audio.Sound | null> {
  const cached = soundCache.get(name);
  if (cached) return cached;

  const inFlight = loadingSounds.get(name);
  if (inFlight) return inFlight;

  const source = SOUND_SOURCES[name];
  if (!source) return null;

  const loadPromise = Audio.Sound.createAsync(source, { volume: SOUND_VOLUME })
    .then(({ sound }) => {
      soundCache.set(name, sound);
      return sound;
    })
    .catch(() => null)
    .finally(() => {
      loadingSounds.delete(name);
    });

  loadingSounds.set(name, loadPromise);
  return loadPromise;
}

/**
 * Play a sound from the assets/sounds/ directory.
 * Fails silently — sounds must never crash gameplay.
 */
async function playSound(name: string): Promise<void> {
  if (!(await isEnabled())) return;

  try {
    const sound = await loadSound(name);
    if (!sound) return;
    await sound.setPositionAsync(0);
    await sound.playAsync();
  } catch (err) {
    // Sound not available - fail silently
  }
}

/**
 * Preload a sound asset for faster playback later
 */
export async function preloadSound(name: string, source: any): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(source, { volume: SOUND_VOLUME });
    soundCache.set(name, sound);
  } catch (err) {
    console.warn(`Failed to preload sound ${name}:`, err);
  }
}

/**
 * Cleanup all preloaded sounds
 */
export async function unloadAllSounds(): Promise<void> {
  for (const [, sound] of soundCache) {
    try {
      await sound.unloadAsync();
    } catch {}
  }
  soundCache.clear();
  loadingSounds.clear();
}

// ===== Game Sound Effects =====
// These are the API entry points that get called from game code.
// Each one maps to a WAV asset in assets/sounds/.

/** Letter tile selected */
export async function soundLetterSelect(): Promise<void> {
  await playSound('letter_select');
}

/** Valid move completed (letter dropped successfully) */
export async function soundValidMove(): Promise<void> {
  await playSound('valid_move');
}

/** Invalid move attempted */
export async function soundInvalidMove(): Promise<void> {
  await playSound('invalid_move');
}

/** Puzzle completed successfully */
export async function soundVictory(): Promise<void> {
  await playSound('victory');
}

/** 3-star perfect completion */
export async function soundPerfect(): Promise<void> {
  await playSound('perfect');
}

/** Undo action */
export async function soundUndo(): Promise<void> {
  await playSound('undo');
}

/** Hint used */
export async function soundHint(): Promise<void> {
  await playSound('hint');
}

/** Button tap / UI interaction */
export async function soundTap(): Promise<void> {
  await playSound('tap');
}

/** Amber earned */
export async function soundAmberEarn(): Promise<void> {
  await playSound('amber_earn');
}

/** Achievement unlocked */
export async function soundAchievement(): Promise<void> {
  await playSound('achievement');
}

/** Animal unlock / room build */
export async function soundUnlock(): Promise<void> {
  await playSound('unlock');
}

/** Dialogue advance */
export async function soundDialogue(): Promise<void> {
  await playSound('dialogue');
}

/** Phase transition */
export async function soundPhaseChange(): Promise<void> {
  await playSound('phase_change');
}

/** Daily challenge available */
export async function soundDailyReady(): Promise<void> {
  await playSound('daily_ready');
}
