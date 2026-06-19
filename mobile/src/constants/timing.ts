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
