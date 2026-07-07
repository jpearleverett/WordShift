/**
 * Animation and interaction timing constants for WordShift.
 *
 * Centralizes magic-number durations and delays so designers can tune
 * feel and pacing without hunting through component code. Values are
 * in milliseconds unless otherwise noted.
 */

// === VICTORY FLOW ===
export const VICTORY_ANIMATION_LOCK_MS = 1200;
export const WHISPER_DELAY_MS = 1200;
export const INTERJECTION_DELAY_MS = 2500;
export const INTERJECTION_AUTODISMISS_MS = 4000;

// === VICTORY GLITCH ===
export const VICTORY_GLITCH_DELAY_MS = 300;
export const VICTORY_GLITCH_DURATION_MS = 500;

// === STARBURST ===
export const STARBURST_DURATION_MS = 600;

// === DREAD PULSE ===
export const DREAD_PULSE_FADE_IN_MS = 150;
export const DREAD_PULSE_FADE_OUT_MS = 300;
export const SCREEN_SHAKE_KEYFRAME_MS = 50;

// === ONBOARDING ===
export const ONBOARDING_TRANSITION_DELAY_MS = 300;
export const ONBOARDING_PUZZLE_COMPLETE_DELAY_MS = 1000;

// === SCREEN TRANSITIONS ===
export const SCREEN_FADE_OUT_MS = 150;
export const SCREEN_FADE_IN_MS = 200;

// === AUTOSAVE ===
export const AUTOSAVE_DEBOUNCE_MS = 120;

// === SPEED TIMER ===
export const SPEED_TIMER_INTERVAL_MS = 250;
// Speed-variant escalation: each consecutive speed win shortens the next
// puzzle's clock by this many seconds, never dropping below the floor. This
// keeps a speed streak tense instead of letting skilled players idle.
export const SPEED_ESCALATION_STEP_SEC = 5;
export const SPEED_ESCALATION_MIN_SEC = 30;
/** Speed clock enters the final-countdown tension zone at/below this many seconds. */
export const SPEED_TICK_THRESHOLD_SEC = 5;
/** At/below this, the countdown intensifies (heavier haptic, bigger pop, brighter color). */
export const SPEED_TICK_CRITICAL_SEC = 3;

/**
 * Pure decision for the final-countdown tick: given the previous and next
 * displayed whole-second values, should a tick fire and how intense? Fires only
 * on a genuine downward step INTO the zone (never on the null->value start, and
 * never when a rescue raises the value back up), and never at 0.
 */
export function speedTickKind(
  prev: number | null,
  next: number | null,
  threshold: number = SPEED_TICK_THRESHOLD_SEC,
  critical: number = SPEED_TICK_CRITICAL_SEC,
): 'none' | 'normal' | 'critical' {
  if (next === null || next > threshold || next <= 0) return 'none';
  if (prev === null || next >= prev) return 'none';
  return next <= critical ? 'critical' : 'normal';
}

// === MICRO-BEAT ===
export const MICRO_BEAT_GLITCH_DELAY_MS = 600;
export const MICRO_BEAT_WHISPER_DELAY_MS = 1800;

// === DROP IMPACT ===
export const DROP_IMPACT_POP_MS = 50;
export const DROP_IMPACT_COLLAPSE_MS = 150;
export const DROP_SHAKE_KEYFRAME_MS = 40;
export const DROP_SHAKE_INTENSITY = 2;

// === ENDGAME ===
export const ENDGAME_EVENT_DELAY_MS = 1500;
