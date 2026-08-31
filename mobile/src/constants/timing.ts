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
// The guaranteed FIRST-victory glitch is held longer and rendered louder than
// the ~8% ambient ones — it is the game's first promise that something else is
// here, and a 500ms flash is easy to miss. Long enough to register, short
// enough to still read as a glitch, not a message.
export const VICTORY_GLITCH_FIRST_DURATION_MS = 1400;

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
// The navigation dip: the opaque overlay fades IN to cover the old screen
// (fast), the React swap happens while hidden, then it fades OUT to reveal the
// destination (a touch slower so the arrival breathes). These are the shipped
// values, now the single source of truth (App.tsx reads them).
export const SCREEN_FADE_COVER_MS = 120;
export const SCREEN_FADE_REVEAL_MS = 180;

// === AUTOSAVE ===
export const AUTOSAVE_DEBOUNCE_MS = 120;

// === SPEED TIMER ===
export const SPEED_TIMER_INTERVAL_MS = 250;
// Speed-variant escalation: each consecutive speed win shortens the next
// puzzle's clock by this many seconds, never dropping below the floor. This
// keeps a speed streak tense instead of letting skilled players idle.
export const SPEED_ESCALATION_STEP_SEC = 5;
export const SPEED_ESCALATION_MIN_SEC = 30;
/** Speed clock enters the SOFT warning band at/below this many seconds (gentle pre-tick). */
export const SPEED_TICK_SOFT_SEC = 10;
/** Speed clock enters the final-countdown tension zone at/below this many seconds. */
export const SPEED_TICK_THRESHOLD_SEC = 5;
/** At/below this, the countdown intensifies (heavier haptic, bigger pop, brighter color). */
export const SPEED_TICK_CRITICAL_SEC = 3;

/**
 * Pure decision for the countdown tick: given the previous and next displayed
 * whole-second values, should a tick fire and how intense? The drain envelope
 * now RAMPS instead of staying flat until the last few seconds: a gentle 'soft'
 * pre-tick from the soft band (10..6) draws the ear in, then 'normal' inside the
 * tension zone (5..4), then 'critical' at the wire (3..1). Fires only on a
 * genuine downward step INTO a band (never on the null->value start, and never
 * when a rescue raises the value back up), and never at 0.
 */
export function speedTickKind(
  prev: number | null,
  next: number | null,
  threshold: number = SPEED_TICK_THRESHOLD_SEC,
  critical: number = SPEED_TICK_CRITICAL_SEC,
  soft: number = SPEED_TICK_SOFT_SEC,
): 'none' | 'soft' | 'normal' | 'critical' {
  if (next === null || next > soft || next <= 0) return 'none';
  if (prev === null || next >= prev) return 'none';
  if (next > threshold) return 'soft';
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

// === INTER-SLOT TAP GUIDANCE ===
// Tapping a letter tile in the target row (between drop slots) pulses the two
// ADJACENT slots — drawing the eye to where drops go without committing
// anything or leaking validity.
export const INTER_SLOT_PULSE_SCALE = 1.12;
export const INTER_SLOT_PULSE_IN_MS = 110;
export const INTER_SLOT_PULSE_OUT_MS = 140;

// === DRAG HOVER ===
// Live slot feedback under the finger during a drag: the geometrically nearest
// slot scales up slightly while hovered. Purely geometric — NEVER
// validity-filtered (hover must not become a second snapping tell).
export const DRAG_HOVER_SCALE = 1.1;

/**
 * Cross-row tile flight (the "flying ghost", audit F1): a tap-committed move
 * flies a ghost copy of the moved tile from the source tile's position into
 * the landing slot, handing over to the arriving tile's settle spring as it
 * lands. Short on purpose — the flight overlaps the settle (which starts at
 * scale 0.65), so the ghost reads as BECOMING the tile, never as a second
 * tile chasing it.
 */
export const TILE_FLIGHT_MS = 260;
/** Slight upward bow on the flight path so the move reads as a throw. */
export const TILE_FLIGHT_LIFT_DP = 10;

// === ONE-TIME POINTERS ===
// Delay before the one-time Swift Victories pointer toast lands after a
// routine-victory exit (long enough for the next board's start message to
// settle first, so the pointer isn't immediately clobbered).
export const SWIFT_HINT_TOAST_DELAY_MS = 1600;

// === ENDGAME ===
export const ENDGAME_EVENT_DELAY_MS = 1500;
