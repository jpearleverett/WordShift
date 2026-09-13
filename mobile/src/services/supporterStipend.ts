/**
 * Supporter subscription — monthly amber stipend.
 *
 * An active Supporter (the `supporter` entitlement, an auto-renewing
 * subscription) receives a recurring amber stipend once per LOCAL month. This is
 * the ongoing value that makes the subscription worth renewing, alongside
 * ad-free play, the exclusive cosmetic, and the season pass premium track.
 *
 * Like every amber source in the game, the stipend credits the REWARD balance
 * only and NEVER feeds phase progression (hard rule: no pay-to-skip-phases) —
 * a Supporter's story pacing is identical to a free player's.
 *
 * Idempotent by design: the stipend is keyed to the local month (YYYY-MM), so
 * calling `claimSupporterStipendIfDue()` repeatedly in a month grants it exactly
 * once. Safe to call once per session at launch (App bootstrap). The stipend
 * delivery record is progress-like (must not double-pay across a player's
 * devices), so it is cloud-synced — the entitlement itself stays store-
 * authoritative and is never synced.
 *
 * Local-month bucketing via services/dateUtils (getLocalDateString sliced to
 * YYYY-MM) — never UTC/toISOString, matching the streak/daily conventions.
 */
import AsyncStorage, { runStorageTransaction } from './persistenceStorage';
import { getLocalDateString } from './dateUtils';
import { awardBonusAmberInTransaction, invalidateProgressCache } from './amberCurrency';
import { isSupporterSync } from './entitlements';
import { SUPPORTER_MONTHLY_AMBER } from '../constants/gameBalance';

const STORAGE_KEY = 'wordshift_supporter';

interface SupporterState {
  /** Local month (YYYY-MM) the stipend was last granted, or null if never. */
  lastStipendMonth: string | null;
}

export interface SupporterStipendGrant {
  /** Amber granted by this stipend. */
  amount: number;
  /** New amber balance after the grant. */
  newBalance: number;
  /** The local month (YYYY-MM) this stipend was credited for. */
  month: string;
}

let cache: SupporterState | null = null;

/** The current LOCAL month bucket (YYYY-MM). Derived from the local day string. */
export function getLocalMonthString(): string {
  return getLocalDateString().slice(0, 7);
}

const getDefault = (): SupporterState => ({ lastStipendMonth: null });

async function load(): Promise<SupporterState> {
  if (cache) return cache;
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
        !(parsed.lastStipendMonth === null || /^\d{4}-(0[1-9]|1[0-2])$/.test(parsed.lastStipendMonth))) {
      throw new Error('Your monthly amber record could not be read. Please retry.');
    }
    cache = { lastStipendMonth: parsed.lastStipendMonth };
    return cache;
  }
  cache = getDefault();
  return cache;
}

async function save(state: SupporterState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  cache = state;
}

/** Drop the in-memory cache after an external storage write (cloud restore). */
export function invalidateSupporterCache(): void {
  cache = null;
}

/** Clear supporter stipend state for Settings → Reset All. */
export async function clearSupporterState(): Promise<void> {
  cache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* non-critical; reset should continue even if this key fails */
  }
}

/**
 * Whether an active Supporter has a stipend to claim for the current local month.
 * False for non-supporters and when this month's stipend was already granted.
 */
export async function isSupporterStipendDue(): Promise<boolean> {
  if (!isSupporterSync()) return false;
  const state = await load();
  return state.lastStipendMonth !== getLocalMonthString();
}

/**
 * Grant the monthly Supporter stipend if the player is an active Supporter and
 * hasn't been paid this local month. Idempotent — returns null when not a
 * Supporter or already granted this month. Safe to call once per session at
 * launch or after a purchase/restore. The month, amber and ledger share one
 * durable commit. Retrying after an interrupted commit replays it and returns
 * null once the month is present, without granting another stipend.
 */
export async function claimSupporterStipendIfDue(): Promise<SupporterStipendGrant | null> {
  if (!isSupporterSync()) return null;
  try {
    return await runStorageTransaction('supporter_stipend', async () => {
      // Re-read after recovery and after any other purchase finished. A warm
      // balance or claim marker must never overwrite a preceding commit.
      invalidateSupporterCache();
      invalidateProgressCache();
      if (!isSupporterSync()) return null;
      const state = await load();
      const month = getLocalMonthString();
      if (state.lastStipendMonth === month) return null;
      const newBalance = await awardBonusAmberInTransaction(SUPPORTER_MONTHLY_AMBER, 'supporter_stipend');
      await save({ lastStipendMonth: month });
      return { amount: SUPPORTER_MONTHLY_AMBER, newBalance, month };
    });
  } finally {
    invalidateSupporterCache();
    invalidateProgressCache();
  }
}
