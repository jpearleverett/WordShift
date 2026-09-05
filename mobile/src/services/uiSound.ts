/**
 * Guarded UI-sound bridge for presentational components.
 *
 * audio.ts statically imports expo-audio (a native module), so a component that
 * imported it directly would pull that native module into the Jest (Node) and
 * web bundle graphs. This module lazy-`require`s audio.ts INSIDE each call — the
 * same sanctioned guarded-require pattern SettingsScreen uses for the music
 * toggle — so shared button components can play a tap/selection sound without
 * ever putting expo-audio in their STATIC import graph. Every call is fully
 * guarded: a missing module (Jest / web / Expo Go without the native SFX layer)
 * or a failed play can never crash a render or a press handler.
 *
 * The audio helpers self-gate on the user's soundEnabled setting and swallow all
 * errors internally, so callers just fire and forget.
 */

/**
 * Which UI/ceremony sound to play. The first three are the everyday UI ticks;
 * the rest are ceremony/celebration/atmosphere cues that ship in the SFX pack
 * and are routed through this guarded bridge so presentational/ceremony
 * components can fire them without a static expo-audio import. Each maps to a
 * sound* helper in audio.ts, which self-resolves its dark mirror by phase.
 */
export type UiSoundKind =
  | 'tap'
  | 'selection'
  | 'dialogue'
  | 'phase_change'
  | 'amber_earn'
  | 'unlock'
  | 'achievement'
  | 'daily_ready'
  | 'devour'
  | 'glitch'
  | 'whisper'
  | 'arrival'
  | 'story_bell'
  | 'story_answer'
  | 'valid_move'
  | 'star_pop';

/**
 * Fire a UI/ceremony sound by role. No-op (never throws) when audio is
 * unavailable. `arg` carries an optional numeric parameter for kinds that take
 * one (currently only 'valid_move', whose 1-4 combo tier climbs the SFX ladder).
 */
export function playUiSound(kind: UiSoundKind = 'tap', arg?: number): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const audio = require('./audio');
    switch (kind) {
      case 'selection': audio.soundSelection?.(); break;
      case 'dialogue': audio.soundDialogue?.(); break;
      // 'phase_change' takes the ceremony's TARGET phase as its arg (the pit
      // passes pendingPhaseTransition) so the swell bands dark from target 3.
      case 'phase_change': audio.soundPhaseChange?.(arg); break;
      case 'arrival': audio.soundArrival?.(); break;
      case 'story_bell': audio.soundStoryBell?.(); break;
      case 'story_answer': audio.soundStoryAnswer?.(); break;
      case 'amber_earn': audio.soundAmberEarn?.(); break;
      case 'unlock': audio.soundUnlock?.(); break;
      case 'achievement': audio.soundAchievement?.(); break;
      case 'daily_ready': audio.soundDailyReady?.(); break;
      case 'devour': audio.soundPitDevour?.(); break;
      case 'glitch': audio.soundGlitch?.(); break;
      case 'whisper': audio.soundWhisper?.(); break;
      case 'valid_move': audio.soundValidMove?.(arg ?? 0); break;
      case 'star_pop': audio.soundStarPop?.(arg ?? 1); break;
      default: audio.soundUiTap?.();
    }
  } catch {
    // No native audio layer in this environment — silent by design.
  }
}

/**
 * Guarded selection haptic for presentational components — the touch twin of
 * playUiSound (never a static expo-haptics import in their graph, so Node-env
 * component tests keep loading without native stubs). Settings gating happens
 * inside the haptics service.
 */
export function uiHapticSelection(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const haptics = require('./haptics');
    haptics.hapticSelection?.();
  } catch {
    // No native haptics layer in this environment — silent by design.
  }
}

/**
 * Stop the looping ambient music bed for a ceremony so a ritual cue can own the
 * soundscape. The new phase's bed is restarted by App's music effect once the
 * phaseTransitionEvent clears. Guarded like playUiSound. Deliberately routed
 * here (not a direct audio import) so ceremony components stay expo-audio-free.
 */
export function stopCeremonyMusic(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const audio = require('./audio');
    audio.stopMusic?.();
  } catch {
    // No native audio layer in this environment — silent by design.
  }
}
