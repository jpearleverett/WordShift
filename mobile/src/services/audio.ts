import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { getSettings, getSettingsSync, subscribeSettings } from './settings';

/**
 * Sound effects + ambient music system for WordShift
 *
 * SFX: short WAV assets from assets/sounds/ via expo-audio (expo-av's SDK 56
 * replacement). Sounds are lazily loaded on first play and cached in a small
 * LRU (SFX_CACHE_LIMIT players, evicted with remove()); the few sounds that
 * fire in the first seconds are preloaded synchronously in initAudio() and
 * the rest of the hot path is warmed from an idle callback after first paint.
 * Every sound checks the user's sound preference before playing, and all
 * errors are swallowed — sounds must never crash gameplay.
 *
 * Phase awareness: App mirrors the narrative phase here via setAudioPhase().
 * At Phase 3+ any sound with a registered `<name>_dark` variant automatically
 * swaps to it, so the whole soundscape descends together. At Phase 5 a third
 * tier takes precedence: any sound with a `<name>_peace` variant plays it
 * instead (the most frequent sounds go serene after the arrival — soft settled
 * bells, no rising or sinking); sounds without one keep their dark mirror,
 * which reads as the settled-dark palette.
 *
 * Combo ladder: soundValidMove(comboTier) escalates the move chime across
 * clean-move streaks (bright = rising pentatonic steps; dark = sinking lower).
 *
 * Music: twelve authored MP3 beds from assets/music/, two families (home and
 * puzzle) with one bed per narrative phase 0-5, played on a dedicated looping
 * player. startMusicForScreen(screen, phase) picks the family by screen (the
 * Offering Pit is part of the house world, so it plays the home bed) and the
 * bed by phase, crossfading on every change; gated by the separate musicEnabled
 * setting (NOT soundEnabled, music has its own toggle).
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
  // Victory star pops: one celesta note per star (rising; dark mirrors sink).
  star_pop_1: require('../../assets/sounds/star_pop_1.wav'),
  star_pop_2: require('../../assets/sounds/star_pop_2.wav'),
  star_pop_3: require('../../assets/sounds/star_pop_3.wav'),
  invalid_move: require('../../assets/sounds/invalid_move.wav'),
  undo: require('../../assets/sounds/undo.wav'),
  hint: require('../../assets/sounds/hint.wav'),
  victory: require('../../assets/sounds/victory.wav'),
  perfect: require('../../assets/sounds/perfect.wav'),
  amber_earn: require('../../assets/sounds/amber_earn.wav'),
  achievement: require('../../assets/sounds/achievement.wav'),
  // Dark mirrors (Phase 3+) auto-resolved by resolveSfxForPhase — the rising
  // celebration goes reverent (minor dark-bell ascent into a hollow toll).
  achievement_dark: require('../../assets/sounds/achievement_dark.wav'),
  unlock: require('../../assets/sounds/unlock.wav'),
  unlock_dark: require('../../assets/sounds/unlock_dark.wav'),
  dialogue: require('../../assets/sounds/dialogue.wav'),
  // Ceremony swell pair: warm C-add9 handbell rise for the BRIGHT ward
  // ignitions, the low ritual sub-swell for the Phase 3+ ones. Resolution
  // keys on the ceremony's TARGET phase (soundPhaseChange), never audioPhase
  // — the swell fires BEFORE confirmPhaseTransition, so audioPhase still
  // holds the OLD phase at that moment.
  phase_change: require('../../assets/sounds/phase_change.wav'),
  phase_change_dark: require('../../assets/sounds/phase_change_dark.wav'),
  // The Arrival (finale cinematic only) — no dark mirror, it IS the wrongness.
  arrival: require('../../assets/sounds/arrival.wav'),
  story_bell: require('../../assets/sounds/story_bell.wav'),
  story_answer: require('../../assets/sounds/story_answer.wav'),
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
  star_pop_1_dark: require('../../assets/sounds/star_pop_1_dark.wav'),
  star_pop_2_dark: require('../../assets/sounds/star_pop_2_dark.wav'),
  star_pop_3_dark: require('../../assets/sounds/star_pop_3_dark.wav'),
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
  // Terrible Peace variants (Phase 5): the most frequent sounds resolved into
  // soft settled bells — the streak ladder assembles the house's C-add9 chord
  // at a constant root instead of rising or sinking, and the victory pair is
  // quiet resolved bells with no tritone. Picked first by resolveSfxForPhase
  // at Phase 5; everything without a `_peace` here keeps its dark mirror.
  valid_move_peace: require('../../assets/sounds/valid_move_peace.wav'),
  valid_move_2_peace: require('../../assets/sounds/valid_move_2_peace.wav'),
  valid_move_3_peace: require('../../assets/sounds/valid_move_3_peace.wav'),
  valid_move_4_peace: require('../../assets/sounds/valid_move_4_peace.wav'),
  victory_peace: require('../../assets/sounds/victory_peace.wav'),
  perfect_peace: require('../../assets/sounds/perfect_peace.wav'),
  dialogue_peace: require('../../assets/sounds/dialogue_peace.wav'),
  letter_select_peace: require('../../assets/sounds/letter_select_peace.wav'),
};

// Ambient music beds (looping), kept out of SOUND_SOURCES so a stray
// playSound() can never fire a two-to-four-minute bed as a one-shot.
// Authored MP3s: the player's originals live in assets/raw/music (tracked, not
// bundled) and `npm run encode:music` (scripts/tools/encodeMusic.mjs) writes
// these shipped files. Two families with one bed per narrative phase 0-5:
// `home` is the house world, which also covers every menu screen AND the
// Offering Pit; `puzzle` is the board. The synthesized per-band WAV beds that
// generateSounds.mjs used to render are retired.
const MUSIC_SOURCES: Record<string, any> = {
  music_home_0: require('../../assets/music/home_phase0.mp3'),
  music_home_1: require('../../assets/music/home_phase1.mp3'),
  music_home_2: require('../../assets/music/home_phase2.mp3'),
  music_home_3: require('../../assets/music/home_phase3.mp3'),
  music_home_4: require('../../assets/music/home_phase4.mp3'),
  music_home_5: require('../../assets/music/home_phase5.mp3'),
  music_puzzle_0: require('../../assets/music/puzzle_phase0.mp3'),
  music_puzzle_1: require('../../assets/music/puzzle_phase1.mp3'),
  music_puzzle_2: require('../../assets/music/puzzle_phase2.mp3'),
  music_puzzle_3: require('../../assets/music/puzzle_phase3.mp3'),
  music_puzzle_4: require('../../assets/music/puzzle_phase4.mp3'),
  music_puzzle_5: require('../../assets/music/puzzle_phase5.mp3'),
};

/**
 * Whether a bed name is registered. Null/undefined check, NOT truthiness:
 * Metro asset ids are numbers (0 is valid) and Jest's file mock resolves every
 * asset to 0. Exported so tests can prove every (screen, phase) resolves to a
 * real bed without the require map itself being exported.
 */
export function hasMusicTrack(name: string): boolean {
  const source = MUSIC_SOURCES[name];
  return source !== undefined && source !== null;
}

// Sounds that can fire within the first seconds of a session (the first menu
// tap, the first letter pick-up, the first move). Created synchronously in
// initAudio so those first plays are latency-free. Kept to a handful on
// purpose: on Android every expo-audio player is a full ExoPlayer plus a
// registered MediaSession, so a burst of players on the first frame competes
// with the home screen's first decode for main-thread time.
export const IMMEDIATE_PRELOAD_SOUND_NAMES = [
  'ui_tap', // UI taps fire from the very first menu interaction
  'ui_tick',
  'tap',
  'letter_select',
  'valid_move',
];

// The rest of the hot path, warmed after first paint from an idle callback.
// Base names: they resolve through the phase mirror at warm time so a Phase
// 3+ or Phase 5 player warms the variant that will actually play instead of
// filling the small cache with bright sounds they never hear.
export const DEFERRED_PRELOAD_SOUND_NAMES = [
  'valid_move_2', // combo ladder fires within seconds of the first clean streak
  'valid_move_3',
  'invalid_move',
  'victory',
  'star_pop_1', // fires in the victory choreography, right after 'victory'
  'amber_earn',
  'pit_devour', // fires on every tap-devour + the Offer-All cascade in the pit
];

/**
 * Cap on cached SFX players. Each cached entry is a native player (an
 * ExoPlayer + MediaSession on Android), so the cache is a small LRU rather
 * than one permanent player per registered sound: 60 names across the bright,
 * dark and peace tiers would otherwise all stay resident by the endgame.
 */
export const SFX_CACHE_LIMIT = 16;

const SOUND_VOLUME = 0.8;

// Current narrative phase, mirrored here so the low-level sound helpers can pick
// the Phase 3+ dark variants without every call site threading a phase. App
// keeps this in sync via setAudioPhase() when the phase changes.
let audioPhase = 0;
/** Phase at/above which SFX with a registered dark variant switch to it. */
const DARK_SFX_PHASE = 3;
/** Phase at/above which SFX with a registered peace variant switch to IT
 *  (takes precedence over the dark mirror — the post-revelation serene tier). */
const PEACE_SFX_PHASE = 5;
export function setAudioPhase(phase: number): void {
  audioPhase = phase;
  // The idle warm usually fires before the persistence load has reported the
  // real phase (initAudio runs in the first effect; the phase arrives after
  // the async load), so a dark-phase player would otherwise warm the bright
  // set and leave it squatting in the LRU. Re-warm once per band change so
  // the resident players are the ones this player will actually hear; a
  // live ceremony crossing into the dark tier gets the same treatment.
  if (deferredWarmedBand !== null && deferredWarmedBand !== sfxBandForPhase(phase)) {
    warmDeferredSounds();
  }
}

/** 0 bright, 1 dark mirror, 2 peace tier: the variant band a phase resolves to. */
function sfxBandForPhase(phase: number): number {
  if (phase >= PEACE_SFX_PHASE) return 2;
  if (phase >= DARK_SFX_PHASE) return 1;
  return 0;
}

/**
 * Pure variant resolver: at Phase 5 a registered `<name>_peace` wins; else at
 * Phase 3+ a registered `<name>_dark` wins; else the base name. Exported for
 * tests; call sites go through the sound* helpers.
 */
export function resolveSfxForPhase(name: string, phase: number): string {
  if (phase >= PEACE_SFX_PHASE && SOUND_SOURCES[`${name}_peace`] !== undefined) {
    return `${name}_peace`;
  }
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

  // Preload the first-seconds sounds now (fire-and-forget — failures are
  // non-critical), and the rest of the hot path once the first frame is up.
  for (const name of IMMEDIATE_PRELOAD_SOUND_NAMES) {
    loadSound(name).catch(() => {});
  }
  scheduleDeferredPreload();
}

let deferredPreloadScheduled = false;
/** The band the deferred warm last resolved under; null until it has run. */
let deferredWarmedBand: number | null = null;

function warmDeferredSounds(): void {
  deferredWarmedBand = sfxBandForPhase(audioPhase);
  for (const name of DEFERRED_PRELOAD_SOUND_NAMES) {
    loadSound(resolveSfxForPhase(name, audioPhase)).catch(() => {});
  }
}

/** Fallback delay for the deferred preload when requestIdleCallback is absent. */
const DEFERRED_PRELOAD_FALLBACK_MS = 1500;

/**
 * Warm the deferred hot-path sounds from an idle callback after first paint
 * (requestIdleCallback where the runtime provides it, a short timeout
 * otherwise), resolved through the phase mirror so the variant warmed is the
 * one this player will hear. Scheduled once per process; setAudioPhase
 * re-warms if the band changes after the first warm.
 */
function scheduleDeferredPreload(): void {
  if (deferredPreloadScheduled) return;
  deferredPreloadScheduled = true;
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void) => unknown }).requestIdleCallback;
  if (typeof idle === 'function') idle(warmDeferredSounds);
  else setTimeout(warmDeferredSounds, DEFERRED_PRELOAD_FALLBACK_MS);
}

async function isEnabled(): Promise<boolean> {
  const settings = await getSettings();
  return settings.soundEnabled;
}

// Sound cache for loaded players. Insertion order IS recency order: a hit
// re-inserts the entry at the tail, and an insert past SFX_CACHE_LIMIT evicts
// from the head (see cacheSound), so the map doubles as the LRU list.
const soundCache: Map<string, AudioPlayer> = new Map();

/** Cache hit that also marks the entry most-recently used. */
function touchCached(name: string): AudioPlayer | undefined {
  const player = soundCache.get(name);
  if (!player) return undefined;
  soundCache.delete(name);
  soundCache.set(name, player);
  return player;
}

/**
 * Insert a player, evicting least-recently-used entries past the cap. A
 * player mid-playback is skipped over when an idle one is available (SFX are
 * sub-second, so this is rarely more than one skip); the evicted player is
 * released with remove() so its native resources go with it.
 */
function cacheSound(name: string, player: AudioPlayer): void {
  const previous = soundCache.get(name);
  if (previous && previous !== player) {
    try { previous.remove(); } catch {}
  }
  soundCache.delete(name);
  soundCache.set(name, player);
  while (soundCache.size > SFX_CACHE_LIMIT) {
    let victim: string | null = null;
    for (const [key, cached] of soundCache) {
      if (key === name) continue;
      if (!cached.playing) { victim = key; break; }
      victim ??= key;
    }
    if (victim === null) break;
    const evicted = soundCache.get(victim)!;
    soundCache.delete(victim);
    try { evicted.remove(); } catch {}
  }
}

/** Number of cached SFX players (exported for tests). */
export function getCachedSoundCount(): number {
  return soundCache.size;
}

/** Whether a sound name currently has a cached player (exported for tests). */
export function isSoundCached(name: string): boolean {
  return soundCache.has(name);
}

// Guards against concurrent first-loads of the same sound
const loadingSounds: Map<string, Promise<AudioPlayer | null>> = new Map();
export type CinematicSoundName = 'arrival' | 'story_bell' | 'story_answer';
export interface CinematicSoundScope { play: (name: CinematicSoundName) => void; stop: () => void }
const cinematicScopes = new Set<CinematicSoundScope>();

/** Long cues belong to an event, never to the shared tap/word player cache. */
export function createCinematicSoundScope(): CinematicSoundScope {
  const players = new Set<AudioPlayer>();
  let stopped = false;
  const scope: CinematicSoundScope = {
    play(name) {
      void (async () => {
        if (!(await isEnabled()) || stopped) return;
        try {
          const player = createAudioPlayer(SOUND_SOURCES[name]);
          player.volume = SOUND_VOLUME;
          players.add(player);
          player.play();
        } catch { /* Sound is optional. */ }
      })();
    },
    stop() {
      stopped = true;
      for (const player of players) {
        try { player.pause(); } catch {}
        try { player.remove(); } catch {}
      }
      players.clear();
      cinematicScopes.delete(scope);
    },
  };
  cinematicScopes.add(scope);
  return scope;
}

subscribeSettings(() => {
  if (getSettingsSync().soundEnabled) return;
  for (const scope of cinematicScopes) scope.stop();
  for (const player of soundCache.values()) { try { player.pause(); } catch {} }
});

/**
 * Get a player from the cache, lazily creating it on first access.
 * Returns null (never throws) when the sound can't be loaded.
 */
async function loadSound(name: string): Promise<AudioPlayer | null> {
  const cached = touchCached(name);
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
      cacheSound(name, player);
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
    cacheSound(name, player);
  } catch (err) {
    console.warn(`Failed to preload sound ${name}:`, err);
  }
}

/**
 * Cleanup all preloaded players (and the music bed)
 */
export async function unloadAllSounds(): Promise<void> {
  for (const scope of cinematicScopes) scope.stop();
  for (const [, player] of soundCache) {
    try {
      player.remove();
    } catch {}
  }
  soundCache.clear();
  loadingSounds.clear();
  // A full teardown: the next initAudio re-applies the audio mode and re-warms.
  deferredPreloadScheduled = false;
  audioInitialized = false;
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

/** Victory star pop (index 1-3): one celesta note per star as it lands, so ear
 *  and hand sync in the choreography. Sinks to its hollow mirror at Phase 3+. */
export async function soundStarPop(index: number): Promise<void> {
  const i = Math.max(1, Math.min(3, Math.round(index)));
  await playSound(resolveSfxForPhase(`star_pop_${i}`, audioPhase));
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

/**
 * Phase-transition ceremony swell. Keys on the ceremony's TARGET phase when
 * given (the pit passes pendingPhaseTransition): the swell fires BEFORE
 * confirmPhaseTransition, so audioPhase still holds the OLD phase and would
 * band the ignition INTO Growing Shadows bright. Dark from target 3 up.
 */
export async function soundPhaseChange(targetPhase?: number): Promise<void> {
  const phase = targetPhase ?? audioPhase;
  await playSound(phase >= 3 ? 'phase_change_dark' : 'phase_change');
}

/** The Arrival — the finale cinematic's bespoke descent cue. */
export async function soundArrival(): Promise<void> {
  await playSound('arrival');
}
/** Tock's answer after the boundary holds; distinct from the approaching presence. */
export async function soundStoryBell(): Promise<void> { await playSound('story_bell'); }
/** Moss's low answer, voiced only when the caller is present. */
export async function soundStoryAnswer(): Promise<void> { await playSound('story_answer'); }


/** Daily challenge available */
export async function soundDailyReady(): Promise<void> {
  await playSound(resolveSfxForPhase('daily_ready', audioPhase));
}

// ===== Ambient Music =====
// One authored looping bed per (family, phase): six home beds, six puzzle
// beds. QUIET by design: it sits far under the SFX. Gated by the dedicated
// musicEnabled setting (its own toggle, independent of soundEnabled). All
// failures are swallowed.

const MUSIC_VOLUME = 0.4;
const MUSIC_FADE_MS = 1200;
const MUSIC_FADE_STEPS = 16;
/** Highest narrative phase with its own bed; phases clamp into 0..MUSIC_MAX_PHASE. */
const MUSIC_MAX_PHASE = 5;

/**
 * The screen context a music bed belongs to. 'home' is also the bed for every
 * menu / secondary screen (settings, stats, shop, ledger, gallery) — the world
 * music simply continues there. 'pit' stays a distinct screen for callers but
 * resolves to the HOME family: the Offering Pit is part of the house world,
 * and the player authored two families (home and puzzle), not three. Walking
 * home <-> pit therefore never restarts the bed; puzzle <-> pit still
 * crossfades.
 */
export type MusicScreen = 'home' | 'puzzle' | 'pit';

/** Bed-name prefix per screen family (`music_home_<p>` / `music_puzzle_<p>`). */
const MUSIC_FAMILY: Record<MusicScreen, string> = {
  home: 'music_home',
  puzzle: 'music_puzzle',
  pit: 'music_home',
};

/**
 * Pure (screen, phase) → bed mapping. Every family has six beds, one per
 * narrative phase, so the descent is per phase on every screen (no bands).
 * The phase is rounded and clamped into 0..MUSIC_MAX_PHASE; NaN falls back
 * to 0 (the old band mapping also resolved NaN to the bright bed, and a key
 * like `music_home_NaN` would silently no-op the switch). Exported for tests.
 */
export function musicTrackForContext(screen: MusicScreen, phase: number): string {
  const rounded = Math.round(phase);
  const p = Number.isNaN(rounded) ? 0 : Math.max(0, Math.min(MUSIC_MAX_PHASE, rounded));
  return `${MUSIC_FAMILY[screen]}_${p}`;
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
 * phase. The screen picks the family (the puzzle bed on the board, the home
 * bed everywhere else in the house world, the Offering Pit included) and the
 * phase picks one of that family's six beds, so every screen descends with
 * the story. Same crossfade / no-op / musicEnabled semantics as before.
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
    if (!hasMusicTrack(track)) return;
    const source = MUSIC_SOURCES[track];

    // A rapid double-switch: snap off any player still fading out.
    if (retiringMusicPlayer) {
      try {
        retiringMusicPlayer.remove();
      } catch {}
      retiringMusicPlayer = null;
    }

    const next = createAudioPlayer(source);
    // Loop seam: `loop` on an MP3 relies on the LAME/Xing header in the first
    // frame (encoder delay + padding) for a gapless wrap. ExoPlayer honours
    // it; AVPlayer may leave a few ms at the seam. On beds 2-4 minutes long
    // that is acceptable (the retired WAV beds were sample-exact by
    // construction; that is the trade for authored music).
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
