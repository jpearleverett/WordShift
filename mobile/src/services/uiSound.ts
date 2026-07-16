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

/** Which UI sound to play. See audio.ts: soundUiTap / soundSelection / soundDialogue. */
export type UiSoundKind = 'tap' | 'selection' | 'dialogue';

/** Fire a UI sound by role. No-op (never throws) when audio is unavailable. */
export function playUiSound(kind: UiSoundKind = 'tap'): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const audio = require('./audio');
    if (kind === 'selection') audio.soundSelection?.();
    else if (kind === 'dialogue') audio.soundDialogue?.();
    else audio.soundUiTap?.();
  } catch {
    // No native audio layer in this environment — silent by design.
  }
}
