import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { getSettings } from './settings';

/**
 * Sound effects + ambient music system for WordShift
 *
 * SFX: short WAV assets from assets/sounds/ via expo-audio (expo-av's SDK 56
 * replacement). Sounds are lazily loaded on first play and cached for instant
 * replay; hot-path sounds are preloaded during initAudio(). Every sound checks
 * the user's sound preference before playing, and all errors are swallowed —
 * sounds must never crash gameplay.
 *
 * Phase awareness: App mirrors the narrative phase here via setAudioPhase().
 * At Phase 3+ any sound with a registered `<name>_dark` variant automatically
 * swaps to it, so the whole soundscape descends together.
 *
 * Combo ladder: soundValidMove(comboTier) escalates the move chime across
 * clean-move streaks (bright = rising pentatonic steps; dark = sinking lower).
 *
 * Music: three seamless ambient loop beds (bright / dusk / dark) played on a
 * dedicated looping player. startMusicForPhase(phase) picks the bed for the
 * current phase and crossfades on changes; gated by the separate musicEnabled
 * setting (NOT soundEnabled — music has its own toggle).
 */

// Sound name → bundled asset source
const SOUND_SOURCES: Record<string, any> = {
  tap: require('../../assets/sounds/tap.wav'),
  letter_select: require('../../assets/sounds/letter_select.wav'),
  valid_move: require('../../assets/sounds/valid_move.wav'),
  valid_move_2: require('../../assets/sounds/valid_move_2.wav'),
  valid_move_3: require('../../assets/sounds/valid_move_3.wav'),
  valid_move_4: require('../../assets/sounds/valid_move_4.wav'),
  // Reverse-shift midpoint pivot (rising marimba into a handbell; dark mirror sinks).
  midpoint_turn: require('../../assets/sounds/midpoint_turn.wav'),
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
  // Offering Pit: a word landing in the pit (dark mirror hungrier at Phase 3+).
  pit_devour: require('../../assets/sounds/pit_devour.wav'),
  // Horror cues for the post-victory orchestration — no dark mirror, they are
  // already the wrongness at any phase.
  glitch: require('../../assets/sounds/glitch.wav'),
  whisper: require('../../assets/sounds/whisper.wav'),
  // Dedicated UI sounds (menus / dialogue / navigation): a warm confirm tap and
  // a soft selection tick, distinct from the board's tap/letter_select so menu
  // taps never read as gameplay.
  ui_tap: require('../../assets/sounds/ui_tap.wav'),
  ui_tick: require('../../assets/sounds/ui_tick.wav'),
  // Dark variants (Phase 3+): hollow, minor, cold — the descent reaches the
  // ears. Any `<name>_dark` here is picked automatically by the phase mirror.
  tap_dark: require('../../assets/sounds/tap_dark.wav'),
  letter_select_dark: require('../../assets/sounds/letter_select_dark.wav'),
  valid_move_dark: require('../../assets/sounds/valid_move_dark.wav'),
  valid_move_2_dark: require('../../assets/sounds/valid_move_2_dark.wav'),
  valid_move_3_dark: require('../../assets/sounds/valid_move_3_dark.wav'),
  valid_move_4_dark: require('../../assets/sounds/valid_move_4_dark.wav'),
  midpoint_turn_dark: require('../../assets/sounds/midpoint_turn_dark.wav'),
  invalid_move_dark: require('../../assets/sounds/invalid_move_dark.wav'),
  undo_dark: require('../../assets/sounds/undo_dark.wav'),
  hint_dark: require('../../assets/sounds/hint_dark.wav'),
  amber_earn_dark: require('../../assets/sounds/amber_earn_dark.wav'),
  pit_devour_dark: require('../../assets/sounds/pit_devour_dark.wav'),
  dialogue_dark: require('../../assets/sounds/dialogue_dark.wav'),
  victory_dark: require('../../assets/sounds/victory_dark.wav'),
  perfect_dark: require('../../assets/sounds/perfect_dark.wav'),
  ui_tap_dark: require('../../assets/sounds/ui_tap_dark.wav'),
  ui_tick_dark: require('../../assets/sounds/ui_tick_dark.wav'),
};

// Ambient music beds (looping) — kept out of SOUND_SOURCES so a stray
// playSound() can never fire a 20-second bed as a one-shot.
const MUSIC_SOURCES: Record<string, any> = {
  // Home / world beds (also the default for menu/secondary screens).
  music_bright: require('../../assets/sounds/music_bright.wav'),
  music_dusk: require('../../assets/sounds/music_dusk.wav'),
  music_dark: require('../../assets/sounds/music_dark.wav'),
  // Puzzle-screen beds — the same DNA, focused/minimal so it never distracts.
  music_puzzle_bright: require('../../assets/sounds/music_puzzle_bright.wav'),
  music_puzzle_dusk: require('../../assets/sounds/music_puzzle_dusk.wav'),
  music_puzzle_dark: require('../../assets/sounds/music_puzzle_dark.wav'),
  // Offering-Pit beds — sunk underground: low drone, wide reverb, ritual tolls.
  music_pit_bright: require('../../assets/sounds/music_pit_bright.wav'),
  music_pit_dusk: require('../../assets/sounds/music_pit_dusk.wav'),
  music_pit_dark: require('../../assets/sounds/music_pit_dark.wav'),
  // Phase-5 "terrible peace" beds — the dark DNA resolved low and slow (the
  // C-add9 restored, tolls softened), the serene register after the arrival.
  music_peace: require('../../assets/sounds/music_peace.wav'),
  music_puzzle_peace: require('../../assets/sounds/music_puzzle_peace.wav'),
  music_pit_peace: require('../../assets/sounds/music_pit_peace.wav'),
};

// Hot-path sounds preloaded at init for latency-free first playback
const PRELOAD_SOUND_NAMES = [
  'tap',
  'letter_select',
  'valid_move',
  'valid_move_2', // combo ladder fires within seconds of the first clean streak
  'valid_move_3',
  'invalid_move',
  'victory',
  'amber_earn',
  'ui_tap', // UI taps fire from the very first menu interaction
  'ui_tick',
  'valid_move_dark', // hot path once the descent deepens (Phase 3+)
  'valid_move_2_dark',
  'pit_devour', // fires on every tap-devour + the Offer-All cascade in the pit
];

const SOUND_VOLUME = 0.8;

// Current narrative phase, mirrored here so the low-level sound helpers can pick
// the Phase 3+ dark variants without every call site threading a phase. App
// keeps this in sync via setAudioPhase() when the phase changes.
let audioPhase = 0;
/** Phase at/above which SFX with a registered dark variant switch to it. */
const DARK_SFX_PHASE = 3;
export function setAudioPhase(phase: number): void {
  audioPhase = phase;
}

/**
 * Pure variant resolver: returns `<name>_dark` when the phase is deep enough
 * AND a dark variant is registered, otherwise the base name. Exported for
 * tests; call sites go through the sound* helpers.
 */
export function resolveSfxForPhase(name: string, phase: number): string {
  if (phase >= DARK_SFX_PHASE && SOUND_SOURCES[`${name}_dark`] !== undefined) {
    return `${name}_dark`;
  }
  return name;
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

  // Note: null check, not falsy — Metro asset ids are numbers and 0 is valid.
  const source = SOUND_SOURCES[name];
  if (source === undefined || source === null) return null;

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
 * Cleanup all preloaded players (and the music bed)
 */
export async function unloadAllSounds(): Promise<void> {
  for (const [, player] of soundCache) {
    try {
      player.remove();
    } catch {}
  }
  soundCache.clear();
  loadingSounds.clear();
  teardownMusic();
}

// ===== Game Sound Effects =====
// These are the API entry points that get called from game code.
// Each one maps to a WAV asset in assets/sounds/ (with the phase mirror
// silently swapping in the `_dark` variant at Phase 3+ where one exists).

/** Letter tile selected. Hollow pluck at Phase 3+. */
export async function soundLetterSelect(): Promise<void> {
  await playSound(resolveSfxForPhase('letter_select', audioPhase));
}

// Combo ladder for clean-move streaks: tier 0 = base chime, tiers 1-3 escalate.
// Bright ladder rises up the pentatonic; the dark ladder sinks lower instead.
const VALID_MOVE_LADDER = ['valid_move', 'valid_move_2', 'valid_move_3', 'valid_move_4'] as const;

/** Pure name resolver for the combo ladder (exported for tests). */
export function validMoveSoundName(comboTier: number, phase: number): string {
  const raw = Number.isFinite(comboTier) ? Math.floor(comboTier) : 0;
  const tier = Math.max(0, Math.min(VALID_MOVE_LADDER.length - 1, raw));
  return resolveSfxForPhase(VALID_MOVE_LADDER[tier], phase);
}

/**
 * Valid move completed (letter dropped successfully). Dark chime at Phase 3+.
 * @param comboTier 0 = base chime (default — existing call sites unchanged);
 *   1/2/3 = escalating clean-streak ladder steps (clamped into range).
 */
export async function soundValidMove(comboTier: number = 0): Promise<void> {
  await playSound(validMoveSoundName(comboTier, audioPhase));
}

/** Reverse-shift descent->ascent pivot: a bright rising marimba into a handbell
 *  (a chapter break, above the move ladder); sinks to its hollow mirror at Phase 3+. */
export async function soundMidpointTurn(): Promise<void> {
  await playSound(resolveSfxForPhase('midpoint_turn', audioPhase));
}

/** Invalid move attempted. Deeper thud at Phase 3+. */
export async function soundInvalidMove(): Promise<void> {
  await playSound(resolveSfxForPhase('invalid_move', audioPhase));
}

/** Puzzle completed successfully. Hollow, minor victory at Phase 3+. */
export async function soundVictory(): Promise<void> {
  await playSound(resolveSfxForPhase('victory', audioPhase));
}

/** 3-star perfect completion. Dissonant-tuned at Phase 3+. */
export async function soundPerfect(): Promise<void> {
  await playSound(resolveSfxForPhase('perfect', audioPhase));
}

/** Undo action. Falling hollow slide at Phase 3+. */
export async function soundUndo(): Promise<void> {
  await playSound(resolveSfxForPhase('undo', audioPhase));
}

/** Hint used */
export async function soundHint(): Promise<void> {
  await playSound(resolveSfxForPhase('hint', audioPhase));
}

/** Button tap / UI interaction. Dull hollow knock at Phase 3+. */
export async function soundTap(): Promise<void> {
  await playSound(resolveSfxForPhase('tap', audioPhase));
}

/**
 * Primary UI confirm tap (menus, dialogue advance, CTAs, purchases). Warm
 * celesta tick that hollows to a knock at Phase 3+. Distinct from the board's
 * `tap`/`letter_select` so menu taps don't read as gameplay.
 */
export async function soundUiTap(): Promise<void> {
  await playSound(resolveSfxForPhase('ui_tap', audioPhase));
}

/**
 * Soft UI selection tick (toggles, selectable rows, difficulty/variant picks).
 * Quieter and higher than soundUiTap so a menu full of them never fatigues.
 * Hollow blip at Phase 3+.
 */
export async function soundSelection(): Promise<void> {
  await playSound(resolveSfxForPhase('ui_tick', audioPhase));
}

/** Amber earned. Cold coin at Phase 3+. */
export async function soundAmberEarn(): Promise<void> {
  await playSound(resolveSfxForPhase('amber_earn', audioPhase));
}

/** A word devoured by the Offering Pit. Sub-hum swallow at Phase 3+. */
export async function soundPitDevour(): Promise<void> {
  await playSound(resolveSfxForPhase('pit_devour', audioPhase));
}

/** Post-victory glitch flash — a moment of wrongness. No dark mirror. */
export async function soundGlitch(): Promise<void> {
  await playSound(resolveSfxForPhase('glitch', audioPhase));
}

/** Post-victory whisper / ambient breath — the sound of being noticed. No dark mirror. */
export async function soundWhisper(): Promise<void> {
  await playSound(resolveSfxForPhase('whisper', audioPhase));
}

/** Achievement unlocked */
export async function soundAchievement(): Promise<void> {
  await playSound(resolveSfxForPhase('achievement', audioPhase));
}

/** Animal unlock / room build */
export async function soundUnlock(): Promise<void> {
  await playSound(resolveSfxForPhase('unlock', audioPhase));
}

/** Dialogue advance. Low blip at Phase 3+. */
export async function soundDialogue(): Promise<void> {
  await playSound(resolveSfxForPhase('dialogue', audioPhase));
}

/** Phase transition */
export async function soundPhaseChange(): Promise<void> {
  await playSound(resolveSfxForPhase('phase_change', audioPhase));
}

/** Daily challenge available */
export async function soundDailyReady(): Promise<void> {
  await playSound(resolveSfxForPhase('daily_ready', audioPhase));
}

// ===== Ambient Music =====
// A single looping bed per phase band. QUIET by design — it sits far under
// the SFX. Gated by the dedicated musicEnabled setting (its own toggle,
// independent of soundEnabled). All failures are swallowed.

const MUSIC_VOLUME = 0.4;
const MUSIC_FADE_MS = 1200;
const MUSIC_FADE_STEPS = 16;
/** Phase at/above which the bed cools to dusk. */
const MUSIC_DUSK_PHASE = 2;
/** Phase at/above which the bed corrupts to dark. */
const MUSIC_DARK_PHASE = 3;
/** Phase at/above which the bed resolves to the post-revelation "peace" band. */
const MUSIC_PEACE_PHASE = 5;

/**
 * The screen context a music bed belongs to. 'home' is also the bed for every
 * menu / secondary screen (settings, stats, shop, ledger, gallery) — the world
 * music simply continues there.
 */
export type MusicScreen = 'home' | 'puzzle' | 'pit';

/** Bed-name prefix per screen family. `home` uses the bare `music_*` beds. */
const MUSIC_FAMILY: Record<MusicScreen, string> = {
  home: 'music',
  puzzle: 'music_puzzle',
  pit: 'music_pit',
};

/** Pure phase → corruption band (bright / dusk / dark / peace) — the descent
 *  then the terrible peace of post-revelation. */
function musicBandForPhase(phase: number): 'bright' | 'dusk' | 'dark' | 'peace' {
  if (phase >= MUSIC_PEACE_PHASE) return 'peace';
  if (phase >= MUSIC_DARK_PHASE) return 'dark';
  if (phase >= MUSIC_DUSK_PHASE) return 'dusk';
  return 'bright';
}

/**
 * Pure (screen, phase) → bed mapping. Each screen family darkens with the phase
 * band, so the descent is preserved on every screen. Exported for tests.
 */
export function musicTrackForContext(screen: MusicScreen, phase: number): string {
  return `${MUSIC_FAMILY[screen]}_${musicBandForPhase(phase)}`;
}

/** Back-compat: the home/world bed for a phase. */
export function musicTrackForPhase(phase: number): string {
  return musicTrackForContext('home', phase);
}

let musicPlayer: AudioPlayer | null = null;
let activeMusicTrack: string | null = null;
// Player still fading out from the last track switch (snapped off if another
// switch interrupts before its fade completes).
let retiringMusicPlayer: AudioPlayer | null = null;
let musicFadeTimer: ReturnType<typeof setInterval> | null = null;

/** The bed currently owned by the music player, or null when stopped. */
export function getActiveMusicTrack(): string | null {
  return activeMusicTrack;
}

async function isMusicEnabled(): Promise<boolean> {
  const settings = await getSettings();
  return settings.musicEnabled;
}

function clearMusicFade(): void {
  if (musicFadeTimer) {
    clearInterval(musicFadeTimer);
    musicFadeTimer = null;
  }
}

/** Crossfade: ramp `to` up to MUSIC_VOLUME while ramping `from` out, then remove `from`. */
function fadeMusic(from: AudioPlayer | null, to: AudioPlayer | null): void {
  clearMusicFade();
  // Interpolate from each player's ACTUAL current volume, not from a fixed
  // endpoint: a second phase flip mid-crossfade otherwise snaps the
  // half-faded outgoing bed back to near-full volume before fading again.
  let fromStart = from ? MUSIC_VOLUME : 0;
  let toStart = 0;
  try {
    if (from) fromStart = from.volume;
  } catch {}
  try {
    if (to) toStart = to.volume;
  } catch {}
  let step = 0;
  musicFadeTimer = setInterval(() => {
    step++;
    const k = Math.min(1, step / MUSIC_FADE_STEPS);
    try {
      if (to) to.volume = toStart + (MUSIC_VOLUME - toStart) * k;
    } catch {}
    try {
      if (from) from.volume = fromStart * (1 - k);
    } catch {}
    if (step >= MUSIC_FADE_STEPS) {
      clearMusicFade();
      if (from) {
        try {
          from.remove();
        } catch {}
        if (retiringMusicPlayer === from) retiringMusicPlayer = null;
      }
    }
  }, MUSIC_FADE_MS / MUSIC_FADE_STEPS);
}

/**
 * Start (or switch) the ambient bed for the given narrative phase.
 * - Same bed already playing: no-op (safe to call on every victory/screen change).
 * - Different bed: crossfades over ~1.2s.
 * - musicEnabled off: does nothing (call again after re-enabling).
 * Never throws — music must never crash gameplay.
 */
export async function startMusicForPhase(phase: number): Promise<void> {
  return startMusicForScreen('home', phase);
}

/**
 * Start (or crossfade to) the ambient bed for the given SCREEN + narrative
 * phase. The screen picks the bed family (home / puzzle / pit) and the phase
 * picks the corruption band, so the pit sounds like a ritual space and the
 * puzzle screen stays focused while both still darken with the descent.
 * Same crossfade / no-op / musicEnabled semantics as before.
 */
export async function startMusicForScreen(screen: MusicScreen, phase: number): Promise<void> {
  try {
    if (!(await isMusicEnabled())) return;
    const track = musicTrackForContext(screen, phase);
    if (activeMusicTrack === track && musicPlayer) {
      try {
        if (!musicPlayer.playing) musicPlayer.play();
      } catch {}
      return;
    }
    const source = MUSIC_SOURCES[track];
    if (source === undefined || source === null) return;

    // A rapid double-switch: snap off any player still fading out.
    if (retiringMusicPlayer) {
      try {
        retiringMusicPlayer.remove();
      } catch {}
      retiringMusicPlayer = null;
    }

    const next = createAudioPlayer(source);
    next.loop = true;
    next.volume = 0;
    next.play();

    const prev = musicPlayer;
    musicPlayer = next;
    activeMusicTrack = track;
    retiringMusicPlayer = prev;
    fadeMusic(prev, next);
  } catch {
    // Music must never crash gameplay
  }
}

/** Fade the ambient bed out and release its player. */
export async function stopMusic(): Promise<void> {
  try {
    if (retiringMusicPlayer) {
      try {
        retiringMusicPlayer.remove();
      } catch {}
      retiringMusicPlayer = null;
    }
    const prev = musicPlayer;
    musicPlayer = null;
    activeMusicTrack = null;
    if (!prev) return;
    retiringMusicPlayer = prev;
    fadeMusic(prev, null);
  } catch {
    // Music must never crash gameplay
  }
}

/** Immediate synchronous teardown (app unload path — no fades). */
function teardownMusic(): void {
  clearMusicFade();
  for (const p of [musicPlayer, retiringMusicPlayer]) {
    if (p) {
      try {
        p.remove();
      } catch {}
    }
  }
  musicPlayer = null;
  retiringMusicPlayer = null;
  activeMusicTrack = null;
}
