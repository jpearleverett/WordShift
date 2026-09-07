/**
 * Entitlements — the app's single source of truth for "what has this player paid for".
 *
 * This is a thin, native-free persistence layer. Billing lives behind the
 * `BillingProvider` interface in `iap.ts`; after a verified purchase or restore,
 * `iap.ts` writes the granted entitlement keys here. The rest of the app reads
 * entitlement state from THIS module only, so UI and gameplay code never import
 * store SDK types.
 *
 * Mirrors the AsyncStorage in-memory-cache pattern used across the codebase
 * (roomUpgrades.ts, wordHarvest.ts). Safe to run in Expo Go — nothing native is imported.
 */

import AsyncStorage, { isStorageTransactionActive } from './persistenceStorage';

const STORAGE_KEY = 'wordshift_entitlements';

// ---------------------------------------------------------------------------
// Entitlement keys
// ---------------------------------------------------------------------------

/**
 * Stable entitlement identifiers the app checks against. These map 1:1 to
 * RevenueCat entitlements / store products. Cosmetic IAPs grant an entitlement
 * keyed by their product id (see iap.ts `entitlementsForProduct`).
 */
export const ENTITLEMENTS = {
  /** Patron's Key — ad-free, +amber/puzzle, exclusive cosmetic, extended undo, cloud save. */
  PATRON: 'patron',
  /** Remove Ads — ad-free, and the victory 2x reward is granted with no ad. */
  ADFREE: 'adfree',
  /**
   * Supporter — an auto-renewing subscription. Ad-free (like Remove-Ads) PLUS a
   * recurring monthly amber stipend (delivered by supporterStipend.ts) and an
   * exclusive cosmetic. Convenience/expression only — never phase progress.
   */
  SUPPORTER: 'supporter',
  /** The Keeper's Collection — a one-time cosmetic bundle (exclusive tile theme + confetti). */
  COSMETIC_BUNDLE: 'cosmetic_bundle',
  /** Starter Pack — one-time-per-account welcome bundle (amber + hints). */
  STARTER_PACK: 'starter_pack',
} as const;

export type EntitlementKey = string;

export interface EntitlementState {
  /** entitlement key → granted timestamp (ms) */
  granted: Record<string, number>;
  /**
   * Set once the player's first consumable AMBER pack purchase lands (the
   * one-time first-purchase 2x has been consumed). Store-authoritative-adjacent,
   * so it lives here — under wordshift_entitlements, excluded from cloud sync.
   */
  amberPurchaseMade?: boolean;
}

// ---------------------------------------------------------------------------
// Storage (in-memory cache pattern)
// ---------------------------------------------------------------------------

let cache: EntitlementState | null = null;

function getDefault(): EntitlementState {
  return { granted: {} };
}

async function load(): Promise<EntitlementState> {
  if (cache) return cache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.granted === 'object' && parsed.granted !== null) {
        cache = { granted: parsed.granted, amberPurchaseMade: parsed.amberPurchaseMade === true };
        return cache;
      }
    }
  } catch {
    /* ignore — fall through to default */
  }
  cache = getDefault();
  return cache;
}

async function save(): Promise<void> {
  if (!cache) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    if (isStorageTransactionActive()) throw error;
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Warm the cache from storage. Call once at boot (initIAP does this) so the
 * synchronous accessors below return correct values without an await.
 */
export async function loadEntitlements(): Promise<EntitlementState> {
  return load();
}

/** Async, always-correct entitlement check. */
export async function hasEntitlement(key: EntitlementKey): Promise<boolean> {
  const state = await load();
  return key in state.granted;
}

/**
 * Synchronous entitlement check off the in-memory cache. Returns false until the
 * cache is warmed (call loadEntitlements()/initIAP() at boot). Use in hot paths
 * that can't await (e.g. amber reward calc, ad gating, render).
 */
export function hasEntitlementSync(key: EntitlementKey): boolean {
  return cache ? key in cache.granted : false;
}

/** Convenience: is the player a Patron? */
export async function isPatron(): Promise<boolean> {
  return hasEntitlement(ENTITLEMENTS.PATRON);
}

/** Synchronous Patron check (off cache; false until warmed). */
export function isPatronSync(): boolean {
  return hasEntitlementSync(ENTITLEMENTS.PATRON);
}

/** Convenience: is the player an active Supporter subscriber? */
export async function isSupporter(): Promise<boolean> {
  return hasEntitlement(ENTITLEMENTS.SUPPORTER);
}

/** Synchronous Supporter check (off cache; false until warmed). */
export function isSupporterSync(): boolean {
  return hasEntitlementSync(ENTITLEMENTS.SUPPORTER);
}

/**
 * Is the player ad-free? True for Patrons (superset), Remove-Ads owners, OR
 * active Supporter subscribers. Ad-free players also get the victory 2x reward
 * granted directly, with no ad.
 */
export async function isAdFree(): Promise<boolean> {
  return (
    (await isPatron()) ||
    hasEntitlement(ENTITLEMENTS.ADFREE) ||
    hasEntitlement(ENTITLEMENTS.SUPPORTER)
  );
}

/** Synchronous ad-free check (off cache; false until warmed). */
export function isAdFreeSync(): boolean {
  return (
    isPatronSync() ||
    hasEntitlementSync(ENTITLEMENTS.ADFREE) ||
    hasEntitlementSync(ENTITLEMENTS.SUPPORTER)
  );
}

/**
 * Grant one or more entitlements (called by iap.ts after a verified purchase).
 * Idempotent — existing grants keep their original timestamp.
 */
export async function grantEntitlements(keys: EntitlementKey[]): Promise<void> {
  const state = await load();
  const now = Date.now();
  for (const key of keys) {
    if (!(key in state.granted)) state.granted[key] = now;
  }
  cache = state;
  await save();
}

/**
 * Replace the entire entitlement set with the authoritative store state.
 * Called by iap.ts `restorePurchases()` — restore is the source of truth, so
 * entitlements no longer reported by the store are dropped. Existing timestamps
 * are preserved where the key persists.
 */
export async function setEntitlements(keys: EntitlementKey[]): Promise<void> {
  const prev = await load();
  const now = Date.now();
  const granted: Record<string, number> = {};
  for (const key of keys) granted[key] = prev.granted[key] ?? now;
  // The first-purchase flag is local purchase-history state, not an entitlement
  // the store reports — a restore must not resurrect the one-time 2x.
  cache = { granted, amberPurchaseMade: prev.amberPurchaseMade };
  await save();
}

/** Get all currently-granted entitlement keys. */
export async function getGrantedEntitlements(): Promise<EntitlementKey[]> {
  const state = await load();
  return Object.keys(state.granted);
}

/** Has the player ever completed a consumable amber pack purchase? */
export async function hasMadeAmberPurchase(): Promise<boolean> {
  const state = await load();
  return state.amberPurchaseMade === true;
}

/** Synchronous variant off the in-memory cache (false until warmed). */
export function hasMadeAmberPurchaseSync(): boolean {
  return cache ? cache.amberPurchaseMade === true : false;
}

/**
 * Record that the player's first consumable amber pack purchase landed
 * (consumes the one-time first-purchase 2x). Idempotent.
 */
export async function markAmberPurchaseMade(): Promise<void> {
  const state = await load();
  if (state.amberPurchaseMade) return;
  state.amberPurchaseMade = true;
  cache = state;
  await save();
}

/**
 * Clear local entitlement state (for Settings → Reset All).
 * NOTE: real entitlements are restored from the store on next launch/restore, so
 * a paying Patron is not permanently stripped — this only clears the local cache.
 */
export async function clearEntitlements(): Promise<void> {
  cache = getDefault();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Drop local mirrors after an interrupted paid-reward transaction. */
export function invalidateEntitlementsCache(): void { cache = null; }
