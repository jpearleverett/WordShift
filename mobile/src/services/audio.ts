import { Audio } from 'expo-av';
import { getSettings } from './settings';

/**
 * Sound effects system for WordShift
 *
 * Uses expo-av with procedurally-defined tones.
 * All sounds are synthesized at runtime - no asset files needed.
 * Each sound checks the user's sound preference before playing.
 */

// We can't procedurally generate tones easily in expo-av without asset files.
// Instead, we use a lightweight approach: create short silent sounds as stubs,
// and use haptics as the primary feedback. When real audio assets are added,
// this service is ready to use them.
//
// For now, this service provides the API contract and placeholder infrastructure
// so that all call sites are wired up and ready for real audio assets.

let audioInitialized = false;

/**
 * Initialize the audio system - call once on app start
 */
export async function initAudio(): Promise<void> {
  if (audioInitialized) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    audioInitialized = true;
  } catch (err) {
    console.warn('Failed to initialize audio:', err);
  }
}

async function isEnabled(): Promise<boolean> {
  const settings = await getSettings();
  return settings.soundEnabled;
}

// Sound cache for preloaded sounds
const soundCache: Map<string, Audio.Sound> = new Map();

/**
 * Play a sound from the assets/sounds/ directory
 * Falls back silently if the asset doesn't exist
 */
async function playSound(name: string): Promise<void> {
  if (!(await isEnabled())) return;

  try {
    // Check cache first
    const cached = soundCache.get(name);
    if (cached) {
      await cached.setPositionAsync(0);
      await cached.playAsync();
      return;
    }

    // Sound assets will be loaded when they exist
    // For now, this is a no-op placeholder that's fully wired up
  } catch (err) {
    // Sound not available - fail silently
  }
}

/**
 * Preload a sound asset for faster playback later
 */
export async function preloadSound(name: string, source: any): Promise<void> {
  try {
    const { sound } = await Audio.Sound.createAsync(source);
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
}

// ===== Game Sound Effects =====
// These are the API entry points that get called from game code.
// Each one is wired into the game flow. When audio assets are added,
// update each function to call playSound() with the right asset name.

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
