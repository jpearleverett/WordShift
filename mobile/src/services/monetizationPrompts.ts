/**
 * Monetization soft prompts — gentle, frequency-capped, one-time nudges.
 *
 * Two contextual upsells:
 *   - Patron nudge: a one-time, low-pressure prompt after the player has settled
 *     into the game (>= PATRON_NUDGE_MIN_PUZZLES), suppressed for Patrons.
 *   - Remove-Ads nudge: a one-time prompt once the player has actually seen a few
 *     interstitials (so it's contextual — "tired of these?"), suppressed for
 *     anyone already ad-free. Two-step pacing: the interstitial that crosses the
 *     threshold ARMS the offer (armRemoveAdsNudgeIfEligible), and it is presented
 *     on the NEXT qualifying exit (consumePendingRemoveAdsNudge) — never stacked
 *     on the same exit as the ad that triggered it.
 *
 * Decision logic is pure/exported for testing; the persisted state only records
 * "have we shown this yet" + an interstitials-seen counter (+ the armed offer).
 * This is device UX pacing (like ad_pacing), intentionally NOT part of cloud sync.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isPatronSync, isAdFreeSync } from './entitlements';
import {
  PATRON_NUDGE_MIN_PUZZLES,
  REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS,
} from '../constants/gameBalance';

const STORAGE_KEY = 'wordshift_monet_prompts';

export interface MonetPromptState {
  patronNudgeShown: boolean;
  removeAdsNudgeShown: boolean;
  /** Interstitials the player has actually been shown (for the Remove-Ads nudge). */
  interstitialsSeen: number;
  /**
   * The Remove-Ads offer is armed (threshold crossed on an interstitial exit)
   * and waiting for the next ad-free exit to be presented.
   */
  removeAdsOfferPending: boolean;
}

let cache: MonetPromptState | null = null;

function getDefault(): MonetPromptState {
  return {
    patronNudgeShown: false,
    removeAdsNudgeShown: false,
    interstitialsSeen: 0,
    removeAdsOfferPending: false,
  };
}

async function load(): Promise<MonetPromptState> {
  if (cache) return cache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        cache = { ...getDefault(), ...parsed };
        return cache!;
      }
    }
  } catch {
    /* ignore */
  }
  cache = getDefault();
  return cache;
}

async function save(): Promise<void> {
  if (!cache) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Pure decision helpers (exported for testing)
// ---------------------------------------------------------------------------

export function shouldShowPatronNudge(params: {
  puzzlesSolved: number;
  isPatron: boolean;
  alreadyShown: boolean;
}): boolean {
  if (params.isPatron || params.alreadyShown) return false;
  return params.puzzlesSolved >= PATRON_NUDGE_MIN_PUZZLES;
}

export function shouldShowRemoveAdsNudge(params: {
  interstitialsSeen: number;
  isAdFree: boolean;
  alreadyShown: boolean;
}): boolean {
  if (params.isAdFree || params.alreadyShown) return false;
  return params.interstitialsSeen >= REMOVE_ADS_NUDGE_AFTER_INTERSTITIALS;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Record that an interstitial was actually shown; returns the new running count. */
export async function recordInterstitialSeen(): Promise<number> {
  const state = await load();
  state.interstitialsSeen += 1;
  cache = state;
  await save();
  return state.interstitialsSeen;
}

/**
 * Decide whether to surface the one-time Patron nudge now. If it returns true it
 * has already marked the nudge as shown, so the caller just presents the UI.
 */
export async function consumePatronNudge(puzzlesSolved: number): Promise<boolean> {
  const state = await load();
  const show = shouldShowPatronNudge({
    puzzlesSolved,
    isPatron: isPatronSync(),
    alreadyShown: state.patronNudgeShown,
  });
  if (show) {
    state.patronNudgeShown = true;
    cache = state;
    await save();
  }
  return show;
}

/**
 * Arm the one-time Remove-Ads offer once the interstitials-seen threshold is
 * crossed. Called right after an interstitial actually played — the offer is
 * NOT shown on that exit; it waits (persisted) for the next qualifying exit.
 * Idempotent; returns whether the offer is now armed.
 */
export async function armRemoveAdsNudgeIfEligible(): Promise<boolean> {
  const state = await load();
  if (state.removeAdsOfferPending) return true;
  const eligible = shouldShowRemoveAdsNudge({
    interstitialsSeen: state.interstitialsSeen,
    isAdFree: isAdFreeSync(),
    alreadyShown: state.removeAdsNudgeShown,
  });
  if (eligible) {
    state.removeAdsOfferPending = true;
    cache = state;
    await save();
  }
  return eligible;
}

/**
 * Present the armed Remove-Ads offer, once. Returns true only when an armed
 * offer is waiting and the player still qualifies (not ad-free, never shown);
 * marks it shown and clears the pending flag when it fires.
 */
export async function consumePendingRemoveAdsNudge(): Promise<boolean> {
  const state = await load();
  if (!state.removeAdsOfferPending) return false;
  const show = !isAdFreeSync() && !state.removeAdsNudgeShown;
  if (show) {
    state.removeAdsNudgeShown = true;
  }
  // Clear the armed flag either way — a disqualified pending offer (player
  // went ad-free in the meantime) must not linger forever.
  state.removeAdsOfferPending = false;
  cache = state;
  await save();
  return show;
}

/** Clear soft-prompt pacing state (for Settings → Reset All). */
export async function clearMonetPrompts(): Promise<void> {
  cache = getDefault();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
