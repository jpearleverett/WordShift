/**
 * Store-review prompt policy (assessment §9 — protect the rating from the game's
 * boldest moment).
 *
 * WordShift deliberately betrays its comfort-game audience at the Phase 2+
 * reveal. That betrayal is the art, but a store-review prompt fired during it
 * would harvest one-star reviews from players mid-shock. So the rule is a hard
 * one: ask for a rating ONLY during the Phase 0-1 delight peaks (a perfect win,
 * once the player is settled in) and NEVER from Phase 2 onward.
 *
 * The policy (shouldPromptReview) is pure and unit-tested; the native prompt is
 * best-effort via a guarded require of `expo-store-review` (NoOp in Expo Go / if
 * the module isn't present — same pattern as the monetization adapters). Fires
 * at most once, ever. Device-local UX pacing → intentionally NOT cloud-synced.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'wordshift_review_prompt';

/** Phase at/above which review prompts are HARD-suppressed (the reveal onward). */
export const REVIEW_MAX_PHASE = 2;
/** Don't ask until the player has clearly settled into the delight. */
export const REVIEW_MIN_PUZZLES = 10;

interface ReviewState {
  prompted: boolean;
}

let cache: ReviewState | null = null;

async function load(): Promise<ReviewState> {
  if (cache) return cache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    cache = stored ? JSON.parse(stored) : { prompted: false };
  } catch {
    cache = { prompted: false };
  }
  return cache!;
}

async function save(state: ReviewState): Promise<void> {
  cache = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Non-critical.
  }
}

/** Test/reset helper — drop the in-memory cache. */
export function _clearReviewPromptCache(): void {
  cache = null;
}

/** Clear review-prompt state for Settings → Reset All. */
export async function clearReviewPrompt(): Promise<void> {
  cache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-critical.
  }
}

export interface ReviewPromptContext {
  phase: number;
  /** Stars earned on the just-completed puzzle. */
  stars: number;
  puzzlesSolved: number;
  alreadyPrompted: boolean;
  /** Onboarding / daily / other contexts where a prompt would be inappropriate. */
  isOnboarding?: boolean;
  isDaily?: boolean;
}

/**
 * Pure policy: whether to fire a store-review prompt now. True ONLY on a
 * Phase 0-1 delight peak (a fresh perfect win, past the settle-in threshold),
 * never once already prompted, and HARD-suppressed at Phase 2+.
 */
export function shouldPromptReview(ctx: ReviewPromptContext): boolean {
  if (ctx.alreadyPrompted) return false;
  if (ctx.isOnboarding || ctx.isDaily) return false;
  if (ctx.phase >= REVIEW_MAX_PHASE) return false; // hard suppress from the reveal on
  if (ctx.puzzlesSolved < REVIEW_MIN_PUZZLES) return false;
  // The delight peak: a perfect (3-star) solve. Genre leaders prompt on a win.
  return ctx.stars >= 3;
}

/** Load native expo-store-review via a guarded literal require (NoOp otherwise). */
function getStoreReview(): { requestReview?: () => Promise<void>; isAvailableAsync?: () => Promise<boolean> } | null {
  try {
    // Literal require so Metro can see and bundle it when the dep is present
    // (same guarded-require pattern as the monetization adapters).
    return require('expo-store-review');
  } catch {
    return null;
  }
}

/**
 * Fire the native store-review prompt if the policy allows. The one-time
 * "prompted" flag is committed ONLY after a native prompt actually fires, so a
 * player whose OS review sheet is unavailable (or who is running a build where
 * the module isn't present) keeps their single lifetime ask for a later Phase
 * 0-1 perfect win. Otherwise we would silently spend the one ask on a no-op and
 * never reach the player at all. Returns whether a prompt actually fired. Safe
 * no-op when the native module is absent.
 */
export async function maybePromptReview(
  ctx: Omit<ReviewPromptContext, 'alreadyPrompted'>
): Promise<boolean> {
  const state = await load();
  if (!shouldPromptReview({ ...ctx, alreadyPrompted: state.prompted })) return false;

  const sr = getStoreReview();
  // Native module absent (Expo Go / not installed): do NOT burn the one-time
  // flag — stay eligible for a real prompt on a later delight peak or after an
  // update that ships the module.
  if (!sr?.requestReview) return false;
  try {
    // OS review sheet not currently available (rate-limited, simulator, etc.):
    // also keep the flag so a genuine prompt can still land later.
    if (sr.isAvailableAsync && !(await sr.isAvailableAsync())) return false;
    await sr.requestReview();
  } catch {
    // Best-effort — a failed attempt never consumes the one-time flag.
    return false;
  }

  // A real prompt fired — commit the one-time flag so we never ask again.
  await save({ prompted: true });
  return true;
}
