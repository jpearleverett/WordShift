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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString } from './dateUtils';
import { awardBonusAmber } from './amberCurrency';
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
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        cache = { lastStipendMonth: typeof parsed.lastStipendMonth === 'string' ? parsed.lastStipendMonth : null };
        return cache;
      }
    }
  } catch {
    /* fall through to default */
  }
  cache = getDefault();
  return cache;
}

async function save(state: SupporterState): Promise<void> {
  cache = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* non-critical — the in-memory cache keeps the session consistent */
  }
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
 * launch. The month is recorded only AFTER the amber is credited, so a failure
 * mid-grant re-attempts next launch rather than skipping a paid month.
 */
export async function claimSupporterStipendIfDue(): Promise<SupporterStipendGrant | null> {
  if (!isSupporterSync()) return null;
  const state = await load();
  const month = getLocalMonthString();
  if (state.lastStipendMonth === month) return null;

  const newBalance = await awardBonusAmber(SUPPORTER_MONTHLY_AMBER, 'supporter_stipend');
  await save({ lastStipendMonth: month });
  return { amount: SUPPORTER_MONTHLY_AMBER, newBalance, month };
}
