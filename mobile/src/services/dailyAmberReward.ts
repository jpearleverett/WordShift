/**
 * Daily Amber Faucet (watch → amber)
 *
 * A "watch a short clip for free amber" affordance, claimable up to
 * DAILY_AMBER_DAILY_CAP times per local day. This service ONLY tracks the daily
 * claim count — it does not grant amber or show the ad. The caller (the Store's
 * Free-Amber card) shows the rewarded ad via RewardedAdButton (or, for Patron
 * holders, grants for free) and then credits amber with awardBonusAmber, exactly
 * like the hint_recovery rewarded flow.
 *
 * Local-day bucketing only (services/dateUtils) — never UTC/toISOString. The
 * count resets when the local calendar day rolls over.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString } from './dateUtils';
import { DAILY_AMBER_DAILY_CAP, DAILY_AMBER_REWARD } from '../constants/gameBalance';

const STORAGE_KEY = 'wordshift_daily_amber';

interface DailyAmberState {
  /** Local calendar day (YYYY-MM-DD) the counter belongs to. */
  date: string | null;
  /** Claims made on `date` so far. */
  count: number;
}

export interface DailyAmberStatus {
  /** Whether at least one claim remains today. */
  available: boolean;
  /** Claims already made today. */
  claimedToday: number;
  /** Claims still available today. */
  remaining: number;
  /** Per-day cap. */
  cap: number;
  /** Amber granted per claim. */
  amountPerClaim: number;
}

export interface DailyAmberClaimResult extends DailyAmberStatus {
  /**
   * Whether THIS call actually recorded a claim. False at/past the daily cap
   * (and while another claim is mid-flight) — callers must credit amber ONLY
   * when this is true, so the tracker and the grant always move together.
   */
  recorded: boolean;
}

let cache: DailyAmberState | null = null;

const getDefault = (): DailyAmberState => ({ date: null, count: 0 });

async function load(): Promise<DailyAmberState> {
  if (cache) return cache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      cache = JSON.parse(stored);
      return cache!;
    }
  } catch {
    // fall through to default
  }
  cache = getDefault();
  return cache;
}

async function save(state: DailyAmberState): Promise<void> {
  cache = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Non-critical — the in-memory cache keeps the session consistent.
  }
}

/** Roll the counter to today if the stored day is stale (returns count for today). */
function forToday(state: DailyAmberState, today: string): number {
  return state.date === today ? state.count : 0;
}

/** Test/reset helper — clears the in-memory cache. */
export function _clearDailyAmberCache(): void {
  cache = null;
  claimInProgress = false;
}

/** Clear daily-amber faucet state for Settings → Reset All. */
export async function clearDailyAmberReward(): Promise<void> {
  cache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-critical; reset should continue even if this key fails.
  }
}

/** Today's faucet status (how many claims are left, the per-claim amount). */
export async function getDailyAmberStatus(): Promise<DailyAmberStatus> {
  const state = await load();
  const claimedToday = forToday(state, getLocalDateString());
  const remaining = Math.max(0, DAILY_AMBER_DAILY_CAP - claimedToday);
  return {
    available: remaining > 0,
    claimedToday,
    remaining,
    cap: DAILY_AMBER_DAILY_CAP,
    amountPerClaim: DAILY_AMBER_REWARD,
  };
}

/** Whether a free-amber claim is available today. */
export async function isDailyAmberAvailable(): Promise<boolean> {
  return (await getDailyAmberStatus()).available;
}

/** Concurrent-claim guard (mirrors amberCurrency's spendInProgress pattern). */
let claimInProgress = false;

/**
 * Record one free-amber claim for today (call AFTER the ad completes / the Patron
 * grant lands). Increments the local-day counter and returns the updated status
 * plus `recorded` — whether THIS call actually counted. A no-op beyond the cap
 * (or while another claim is mid-flight): the capped status comes back with
 * `recorded: false`, and the caller must not credit amber for it.
 */
export async function recordDailyAmberClaim(): Promise<DailyAmberClaimResult> {
  if (claimInProgress) {
    return { ...(await getDailyAmberStatus()), recorded: false };
  }
  claimInProgress = true;
  try {
    const state = await load();
    const today = getLocalDateString();
    const claimedToday = forToday(state, today);
    if (claimedToday >= DAILY_AMBER_DAILY_CAP) {
      return { ...(await getDailyAmberStatus()), recorded: false };
    }
    await save({ date: today, count: claimedToday + 1 });
    return { ...(await getDailyAmberStatus()), recorded: true };
  } finally {
    claimInProgress = false;
  }
}

/**
 * Pure decision for the Free Amber card: how much amber a claim result should
 * credit. Zero when the claim was not recorded (already at the daily cap or a
 * duplicate in-flight tap), so a stale or repeated tap can never over-grant.
 */
export function dailyAmberGrantFor(
  result: Pick<DailyAmberClaimResult, 'recorded' | 'amountPerClaim'>,
): number {
  return result.recorded ? result.amountPerClaim : 0;
}
