/**
 * Hints — the player's consumable hint balance.
 *
 * Hints are a limited resource (consumable model): a new player is granted a
 * free starting stash once, then earns more from the opt-in `hint_recovery`
 * rewarded ad or buys hint packs (IAP). Spending a hint still costs stars — the
 * star-rating penalty is unchanged — so hints buy *convenience*, never narrative
 * progression.
 *
 * Native-free; mirrors the AsyncStorage in-memory-cache pattern used across the
 * codebase (entitlements.ts, cosmetics.ts). A synchronous mirror of the balance
 * is kept so the render path (the HINT button / counter) and the synchronous
 * `handleHint` callback can read and consume without awaiting storage.
 */

import AsyncStorage, { runStorageTransaction, isStorageTransactionActive } from './persistenceStorage';
import { STARTING_FREE_HINTS } from '../constants/gameBalance';

const STORAGE_KEY = 'wordshift_hints';

export interface HintState {
  /** Current spendable hint balance. */
  balance: number;
  /** True once the one-time free starting stash has been granted. */
  seededFree: boolean;
}

let cache: HintState | null = null;
// Synchronous mirror of `cache.balance` for render-path / sync consume.
let syncBalance = 0;

function getDefault(): HintState {
  return { balance: 0, seededFree: false };
}

function mirror(state: HintState): void {
  syncBalance = state.balance;
}

async function load(): Promise<HintState> {
  if (cache) return cache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.balance === 'number') {
        cache = { balance: parsed.balance, seededFree: parsed.seededFree === true };
        mirror(cache);
        return cache;
      }
    }
  } catch (error) {
    if (isStorageTransactionActive()) throw error;
    /* ignore — fall through to default */
  }
  cache = getDefault();
  mirror(cache);
  return cache;
}

/**
 * Drop the in-memory hint cache after external storage writes (cloud restore).
 *
 * The mirror is ZEROED, not left stale, deliberately: a stale mirror would let
 * the player spend against a balance the restore may have lowered. That makes
 * the re-warm mandatory rather than optional, and it lives at the restore
 * boundary (cloudSave.restoreFromCloudData awaits initHints right after this)
 * because nothing on any live path calls back into `load()` — initHints is
 * bootstrap-only and refreshHintBalance only re-reads this mirror. Without
 * that re-warm the HINT button read 0 for the rest of the session and the app
 * offered to sell the player hints they had just restored.
 */
export function invalidateHintsCache(): void {
  cache = null;
  syncBalance = 0;
}

async function save(): Promise<void> {
  if (!cache) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    invalidateHintsCache();
    throw error;
  }
}

/**
 * Warm the cache and grant the one-time free starting stash. Call once at boot
 * (App bootstrap, alongside initIAP/initAds/initCosmetics) so the synchronous
 * accessors return correct values without an await.
 */
export async function initHints(): Promise<HintState> {
  const state = await load();
  if (!state.seededFree) {
    state.balance += STARTING_FREE_HINTS;
    state.seededFree = true;
    cache = state;
    mirror(state);
    await save();
  }
  return state;
}

/** Synchronous balance (off the in-memory mirror; 0 until warmed). */
export function getHintBalanceSync(): number {
  return syncBalance;
}

/** Async, always-correct balance. */
export async function getHintBalance(): Promise<number> {
  const state = await load();
  return state.balance;
}

/** Whether at least one hint is available (synchronous, render-path safe). */
export function hasHintSync(): boolean {
  return syncBalance > 0;
}

/**
 * Spend one hint. Synchronous so the (synchronous) `handleHint` callback can use
 * it; updates the in-memory cache + mirror immediately and persists in the
 * background. Returns false (and changes nothing) when the balance is empty.
 */
export function consumeHintSync(): boolean {
  if (!cache) {
    // Cache not warmed yet — fall back to the mirror so we never over-spend.
    if (syncBalance <= 0) return false;
  }
  const current = cache ? cache.balance : syncBalance;
  if (current <= 0) return false;
  const next = current - 1;
  if (cache) cache.balance = next;
  syncBalance = next;
  save().catch(() => {});
  return true;
}

/**
 * Grant hints (rewarded ad, IAP hint pack, etc.). Returns the new balance.
 * `source` is recorded only via the caller's own logging; this layer just credits.
 */
export async function addHints(amount: number, source?: string): Promise<number> {
  try {
    return await runStorageTransaction('hint_grant', () => addHintsInTransaction(amount, source));
  } catch (error) { invalidateHintsCache(); throw error; }
}

/** Only for a caller already inside its explicitly owned storage transaction. */
export async function addHintsInTransaction(amount: number, _source?: string): Promise<number> {
  if (amount <= 0) return getHintBalance();
  const state = await load();
  state.balance += amount;
  cache = state;
  mirror(state);
  await save();
  return state.balance;
}

/**
 * Soft cap for the milestone hint trickle: a bonus hint is only granted while
 * the balance sits below this, so the trickle relieves late-game scarcity
 * without ever stacking a stockpile a paying player would have bought.
 */
export const BONUS_HINT_SOFT_CAP = 10;

/**
 * Grant a single bonus hint (puzzle-count milestone trickle). Grants +1 ONLY
 * when the current balance is under BONUS_HINT_SOFT_CAP; returns whether the
 * hint was actually granted so the caller can gate its receipt toast.
 * `source` is recorded only via the caller's own logging.
 */
export async function grantBonusHint(_source: string): Promise<boolean> {
  const state = await load();
  if (state.balance >= BONUS_HINT_SOFT_CAP) return false;
  state.balance += 1;
  cache = state;
  mirror(state);
  await save();
  return true;
}

/** Clear all hint state (for Settings → Reset All). */
export async function clearHints(): Promise<void> {
  cache = getDefault();
  mirror(cache);
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    invalidateHintsCache();
    throw error;
  }
}
