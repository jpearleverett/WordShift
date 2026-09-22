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

import AsyncStorage, { runStorageTransaction, StorageRecoveryRequiredError } from './persistenceStorage';
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
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || !('balance' in parsed) ||
        typeof parsed.balance !== 'number' || !Number.isSafeInteger(parsed.balance) || parsed.balance < 0) {
      throw new Error('Your saved hints could not be read. Please try again.');
    }
    cache = { balance: parsed.balance, seededFree: 'seededFree' in parsed && parsed.seededFree === true };
    mirror(cache);
    return cache;
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
 * boundary (cloudSave.refreshRestoredServiceCaches awaits initHints after this)
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
  if (state.seededFree) return state;
  const seeded = { balance: state.balance + STARTING_FREE_HINTS, seededFree: true };
  cache = seeded;
  mirror(seeded);
  await save();
  return seeded;
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

/** The latest queued debit write (tests await it; the UI never does). */
let pendingSpendWrite: Promise<void> = Promise.resolve();

/** Resolve once every queued hint debit has reached storage (or failed). */
export function flushHintSpendWrites(): Promise<void> {
  return pendingSpendWrite;
}

/**
 * Spend one hint. Synchronous so the (synchronous) `handleHint` callback can use
 * it; updates the in-memory cache + mirror immediately and queues the durable
 * write behind any in-flight storage transaction (a paid hint grant, a restore),
 * so a debit can never be overwritten by, or overwrite, a concurrent grant.
 * Returns false (and changes nothing) when the balance is empty.
 */
export function consumeHintSync(): boolean {
  const previous = cache;
  if (!previous || previous.balance <= 0) return false;
  const spent = { ...previous, balance: previous.balance - 1 };
  cache = spent;
  mirror(spent);
  pendingSpendWrite = persistSpend(previous, spent);
  return true;
}

async function persistSpend(previous: HintState, spent: HintState): Promise<void> {
  try {
    await runStorageTransaction('hint_spend', async () => {
      // Every writer keeps the cache current (debits synchronously, grants inside
      // their own transaction), so the cache at this serialized point already
      // holds this debit plus everything committed before it. A restore that
      // dropped the cache owns the balance now; there is nothing to write.
      if (!cache) return;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    });
  } catch (error) {
    // The journal is on disk: recovery will apply this debit, keep it.
    if (error instanceof StorageRecoveryRequiredError) return;
    // A failed debit restores availability without discarding the other paid
    // hints. Roll back only this exact optimistic state: because writes are
    // queued, a later grant has not run yet (or already includes this state),
    // so a rollback can never erase a newer grant.
    if (cache === spent) {
      cache = previous;
      mirror(previous);
    }
  }
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
  const next = { ...state, balance: state.balance + amount };
  cache = next;
  mirror(next);
  await save();
  return next.balance;
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
  try {
    return await runStorageTransaction('hint_bonus', async () => {
      const state = await load();
      if (state.balance >= BONUS_HINT_SOFT_CAP) return false;
      cache = { ...state, balance: state.balance + 1 };
      mirror(cache);
      await save();
      return true;
    });
  } catch (error) { invalidateHintsCache(); throw error; }
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
