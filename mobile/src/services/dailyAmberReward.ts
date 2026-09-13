/**
 * Daily Amber Faucet (watch → amber)
 *
 * A "watch a short clip for free amber" affordance, claimable up to
 * DAILY_AMBER_DAILY_CAP times per local day. A completed rewarded view (or a
 * Patron claim) uses claimDailyAmberReward to commit the counter, credit and
 * receipt together. Replaying an interrupted save never consumes another claim.
 *
 * Local-day bucketing only (services/dateUtils) — never UTC/toISOString. The
 * count resets when the local calendar day rolls over.
 */
import AsyncStorage, { runStorageTransaction } from './persistenceStorage';
import { getLocalDateString } from './dateUtils';
import { DAILY_AMBER_DAILY_CAP, DAILY_AMBER_REWARD } from '../constants/gameBalance';
import { awardBonusAmberInTransaction, getFullProgress, invalidateProgressCache } from './amberCurrency';

const STORAGE_KEY = 'wordshift_daily_amber';

interface DailyAmberState {
  /** Local calendar day (YYYY-MM-DD) the counter belongs to. */
  date: string | null;
  /** Claims made on `date` so far. */
  count: number;
  /** Durable identities of completed rewards, including claims before midnight. */
  claimReceipts?: string[];
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
   * Whether this call recorded a new claim. claimDailyAmberReward has already
   * credited that reward atomically; callers must not award it a second time.
   */
  recorded: boolean;
}

export interface DailyAmberGrantResult extends DailyAmberClaimResult {
  /** Zero for an already saved reward or an exhausted daily allowance. */
  grantedAmount: number;
  newBalance: number;
}

let cache: DailyAmberState | null = null;

/** Drop the in-memory cache after an external storage write (cloud restore). */
export function invalidateDailyAmberCache(): void {
  cache = null;
}


const getDefault = (): DailyAmberState => ({ date: null, count: 0 });

async function load(): Promise<DailyAmberState> {
  if (cache) return cache;
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    const state: DailyAmberState = JSON.parse(stored);
    if (!state || (state.date !== null && typeof state.date !== 'string') ||
        !Number.isInteger(state.count) || state.count < 0 ||
        (state.claimReceipts !== undefined && (!Array.isArray(state.claimReceipts) ||
          !state.claimReceipts.every(id => typeof id === 'string')))) {
      throw new Error('Your daily amber record could not be read. Please retry.');
    }
    cache = state;
    return cache;
  }
  cache = getDefault();
  return cache;
}

async function save(state: DailyAmberState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  cache = state;
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
  return statusFor(state);
}

function statusFor(state: DailyAmberState): DailyAmberStatus {
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

let claimSequence = 0;

/** Create once per earned view or Patron tap; keep this same ID through retries. */
export function createDailyAmberClaimId(): string {
  claimSequence += 1;
  return `${Date.now().toString(36)}-${claimSequence.toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Complete an earned reward durably. The receipt and credit share the journal,
 * so a retry that first recovers that journal reports zero newly granted amber.
 * Receipts remain across local-day rollover: a midnight retry is still the same
 * reward. There are at most two new receipts per day.
 */
export async function claimDailyAmberReward(claimId: string): Promise<DailyAmberGrantResult> {
  if (!claimId.trim()) throw new Error('A daily amber claim needs its original reward ID.');
  try {
    return await runStorageTransaction('daily_amber_claim', async () => {
      // Recovery happens before this callback. Neither staged nor pre-recovery
      // caches may decide whether this reward has already been fulfilled.
      invalidateDailyAmberCache();
      invalidateProgressCache();
      const state = await load();
      const progress = await getFullProgress();
      const status = statusFor(state);
      if (state.claimReceipts?.includes(claimId) || !status.available) {
        return { ...status, recorded: false, grantedAmount: 0, newBalance: progress.amber };
      }
      const updated: DailyAmberState = {
        date: getLocalDateString(), count: status.claimedToday + 1,
        claimReceipts: [...(state.claimReceipts ?? []), claimId],
      };
      const newBalance = await awardBonusAmberInTransaction(DAILY_AMBER_REWARD, 'rewarded_daily_amber');
      await save(updated);
      return { ...statusFor(updated), recorded: true, grantedAmount: DAILY_AMBER_REWARD, newBalance };
    });
  } finally {
    invalidateDailyAmberCache();
    invalidateProgressCache();
  }
}

/** Whether a free-amber claim is available today. */
export async function isDailyAmberAvailable(): Promise<boolean> {
  return (await getDailyAmberStatus()).available;
}

/** Concurrent-claim guard (mirrors amberCurrency's spendInProgress pattern). */
let claimInProgress = false;

/**
 * Legacy counter-only API for economy simulations. Player claims must use
 * claimDailyAmberReward so their counter and amber cannot be separated.
 *
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
    await save({ ...state, date: today, count: claimedToday + 1 });
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
