import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { getSettings } from './settings';

/**
 * Sound effects system for WordShift
 *
 * Plays short WAV assets from assets/sounds/ via expo-audio (expo-av's SDK 56
 * replacement). Sounds are lazily loaded on first play and cached for instant
 * replay; hot-path sounds are preloaded during initAudio().
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
  // Dark variants (Phase 3+): hollow, minor, cold — the descent reaches the ears.
  valid_move_dark: require('../../assets/sounds/valid_move_dark.wav'),
  victory_dark: require('../../assets/sounds/victory_dark.wav'),
  perfect_dark: require('../../assets/sounds/perfect_dark.wav'),
};

// Hot-path sounds preloaded at init for latency-free first playback
const PRELOAD_SOUND_NAMES = [
  'tap',
  'letter_select',
  'valid_move',
  'invalid_move',
  'victory',
  'amber_earn',
  'valid_move_dark', // hot path once the descent deepens (Phase 3+)
];

const SOUND_VOLUME = 0.8;

// Current narrative phase, mirrored here so the low-level sound helpers can pick
// the Phase 3+ dark variants without every call site threading a phase. App
// keeps this in sync via setAudioPhase() when the phase changes.
let audioPhase = 0;
/** Phase at/above which move + victory chimes switch to their dark variants. */
const DARK_SFX_PHASE = 3;
export function setAudioPhase(phase: number): void {
  audioPhase = phase;
}

let audioInitialized = false;

/**
 * Initialize the audio system - call once on app start
 */
export async function initAudio(): Promise<void> {
  if (audioInitialized) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionModeAndroid: 'duckOthers',
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

// Sound cache for loaded players
const soundCache: Map<string, AudioPlayer> = new Map();

// Guards against concurrent first-loads of the same sound
const loadingSounds: Map<string, Promise<AudioPlayer | null>> = new Map();

/**
 * Get a player from the cache, lazily creating it on first access.
 * Returns null (never throws) when the sound can't be loaded.
 */
async function loadSound(name: string): Promise<AudioPlayer | null> {
  const cached = soundCache.get(name);
  if (cached) return cached;

  const inFlight = loadingSounds.get(name);
  if (inFlight) return inFlight;

  const source = SOUND_SOURCES[name];
  if (!source) return null;

  const loadPromise = (async (): Promise<AudioPlayer | null> => {
    try {
      const player = createAudioPlayer(source);
      player.volume = SOUND_VOLUME;
      soundCache.set(name, player);
      return player;
    } catch {
      return null;
    } finally {
      loadingSounds.delete(name);
    }
  })();

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
    const player = await loadSound(name);
    if (!player) return;
    // Rewind to the start so rapid re-triggers replay from the beginning.
    await player.seekTo(0);
    player.play();
  } catch {
    // Sound not available - fail silently
  }
}

/**
 * Preload a sound asset for faster playback later
 */
export async function preloadSound(name: string, source: any): Promise<void> {
  try {
    const player = createAudioPlayer(source);
    player.volume = SOUND_VOLUME;
    soundCache.set(name, player);
  } catch (err) {
    console.warn(`Failed to preload sound ${name}:`, err);
  }
}

/**
 * Cleanup all preloaded players
 */
export async function unloadAllSounds(): Promise<void> {
  for (const [, player] of soundCache) {
    try {
      player.remove();
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

/** Valid move completed (letter dropped successfully). Dark chime at Phase 3+. */
export async function soundValidMove(): Promise<void> {
  await playSound(audioPhase >= DARK_SFX_PHASE ? 'valid_move_dark' : 'valid_move');
}

/** Invalid move attempted */
export async function soundInvalidMove(): Promise<void> {
  await playSound('invalid_move');
}

/** Puzzle completed successfully. Hollow, minor victory at Phase 3+. */
export async function soundVictory(): Promise<void> {
  await playSound(audioPhase >= DARK_SFX_PHASE ? 'victory_dark' : 'victory');
}

/** 3-star perfect completion. Dissonant-tuned at Phase 3+. */
export async function soundPerfect(): Promise<void> {
  await playSound(audioPhase >= DARK_SFX_PHASE ? 'perfect_dark' : 'perfect');
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
