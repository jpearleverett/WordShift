/**
 * Cosmetic first-showing receipts.
 *
 * A confetti palette or move spark is an EVENT, not an object: the player buys
 * it in the shop, leaves, and the next time it fires they are watching the
 * star pop-in or the next word. This service closes that loop ON THE SURFACE
 * ITSELF, once: the first time a newly equipped spark actually bursts, the
 * move message says so; the first win after equipping a confetti palette
 * carries a receipt toast. Tile themes need none (the board is the receipt).
 *
 * One device-local flag per cosmetic id (`wordshift_cosmetic_receipt_<id>`),
 * deliberately NOT cloud-synced: it is UX pacing like sharePrompts, and a
 * fresh device may deserve the receipt once more. Documented as excluded in
 * storageKeyRegistry.test.ts.
 *
 * The decision is pure (`resolveFirstShowing`); the async wrapper only adds
 * the equipped lookup and the persisted flag.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCosmetic, getEquippedSync, CosmeticCategory } from './cosmetics';

const KEY_PREFIX = 'wordshift_cosmetic_receipt_';

/** Categories whose first showing is an event worth a receipt. */
export type ReceiptCategory = Extract<CosmeticCategory, 'confetti' | 'spark'>;

/** Storage key for one cosmetic's receipt flag. */
export function receiptKeyFor(id: string): string {
  return `${KEY_PREFIX}${id}`;
}

/**
 * Pure decision: the cosmetic id that is showing for the first time, or null.
 * `equippedId` is the equipped cosmetic for the category (undefined = the
 * default, which never earns a receipt); `seen` holds the ids already receipted.
 */
export function resolveFirstShowing(
  equippedId: string | undefined,
  seen: ReadonlySet<string>,
): string | null {
  if (!equippedId) return null;
  if (seen.has(equippedId)) return null;
  return equippedId;
}

// In-memory mirror of the persisted flags (id -> seen). Only ids that have
// been read at least once are present.
let seenCache: Map<string, boolean> = new Map();

async function hasBeenReceipted(id: string): Promise<boolean> {
  const cached = seenCache.get(id);
  if (cached !== undefined) return cached;
  let seen = false;
  try {
    seen = (await AsyncStorage.getItem(receiptKeyFor(id))) === '1';
  } catch {
    /* ignore: an unreadable flag reads as unseen, so the receipt fires at most once more */
  }
  seenCache.set(id, seen);
  return seen;
}

async function markReceipted(id: string): Promise<void> {
  seenCache.set(id, true);
  try {
    await AsyncStorage.setItem(receiptKeyFor(id), '1');
  } catch {
    /* ignore */
  }
}

/**
 * If the equipped cosmetic in `category` has never shown on this device,
 * marks it shown and returns its display NAME (for
 * phaseNarrative.getCosmeticFirstShowingLine). Returns null when the default
 * is equipped, the receipt was already given, or the id is unknown.
 */
export async function consumeCosmeticFirstShowing(category: ReceiptCategory): Promise<string | null> {
  const equippedId = getEquippedSync(category);
  if (!equippedId) return null;
  const seen = (await hasBeenReceipted(equippedId)) ? new Set([equippedId]) : new Set<string>();
  const id = resolveFirstShowing(equippedId, seen);
  if (!id) return null;
  const item = getCosmetic(id);
  if (!item) return null;
  await markReceipted(id);
  return item.name;
}

/**
 * Forget receipts. With ids, forgets exactly those; with none, drops the
 * in-memory mirror (the Reset All shape — the durable per-id flags are wiped
 * by commitFullLocalReset's journaled transaction, which sweeps the whole
 * `wordshift_cosmetic_receipt_` family, so this cannot miss the ids that were
 * never read this session).
 */
export async function clearCosmeticReceipts(ids?: string[]): Promise<void> {
  const targets = ids ?? Array.from(seenCache.keys());
  seenCache = new Map();
  try {
    await Promise.all(targets.map(id => AsyncStorage.removeItem(receiptKeyFor(id))));
  } catch {
    /* ignore */
  }
}
