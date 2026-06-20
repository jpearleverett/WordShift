/**
 * Cosmetics — owned/equipped cosmetic state (scaffold).
 *
 * Pure data layer for the cosmetic shop (tile themes, confetti, room accents).
 * Ownership comes from two sources:
 *   - amber purchases (spent via amberCurrency.spendAmber, recorded here locally), and
 *   - IAP purchases (recorded as entitlements in entitlements.ts).
 * `ownsCosmetic()` checks both. Mirrors the roomUpgrades.ts cache pattern; native-free.
 *
 * NOTE (scaffold scope): this module tracks ownership + the equipped selection.
 * Wiring the *equipped* tile theme into rendering (theme/colors.ts `getTileColor()` /
 * LetterTile.tsx) and building ShopScreen.tsx are the remaining steps — see
 * docs/MONETIZATION_F2P_IMPLEMENTATION.md §4.5. All themes must stay phase-aware so a
 * purchased theme still darkens with the story (the tone contract).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasEntitlementSync, ENTITLEMENTS } from './entitlements';

const STORAGE_KEY = 'wordshift_cosmetics';

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export type CosmeticCategory = 'tile_theme' | 'confetti' | 'room_accent';

/** How a cosmetic is acquired. */
export type CosmeticAcquisition =
  | { kind: 'amber'; cost: number }
  | { kind: 'iap'; productId: string }
  | { kind: 'entitlement'; entitlement: string }; // auto-owned with an entitlement (e.g. Patron theme)

export interface CosmeticItem {
  id: string;
  category: CosmeticCategory;
  name: string;
  description: string;
  acquisition: CosmeticAcquisition;
}

/**
 * Starter catalog (scaffold). Expand with real cosmetics + previews. Amber and IAP
 * items are intentionally DISJOINT (a cosmetic is never sold for both currencies) so
 * amber never feels like "the currency I should have paid to skip".
 */
export const COSMETICS: CosmeticItem[] = [
  {
    id: 'theme_patron',
    category: 'tile_theme',
    name: 'Patron',
    description: 'An exclusive amber-and-gold tile set, yours as a Patron.',
    acquisition: { kind: 'entitlement', entitlement: ENTITLEMENTS.PATRON },
  },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface CosmeticState {
  /** cosmetic id → purchased timestamp (amber-bought items only; IAP via entitlements). */
  owned: Record<string, number>;
  /** Equipped cosmetic id per category (undefined = phase default). */
  equipped: Partial<Record<CosmeticCategory, string>>;
}

let cache: CosmeticState | null = null;

function getDefault(): CosmeticState {
  return { owned: {}, equipped: {} };
}

async function load(): Promise<CosmeticState> {
  if (cache) return cache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.owned === 'object') {
        cache = { owned: parsed.owned ?? {}, equipped: parsed.equipped ?? {} };
        return cache;
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
// Public API
// ---------------------------------------------------------------------------

export function getCosmetic(id: string): CosmeticItem | undefined {
  return COSMETICS.find(c => c.id === id);
}

export function getCosmeticsByCategory(category: CosmeticCategory): CosmeticItem[] {
  return COSMETICS.filter(c => c.category === category);
}

/**
 * Whether the player owns a cosmetic. Checks amber-bought local ownership, IAP
 * entitlements, and entitlement-granted items (e.g. the Patron theme).
 */
export async function ownsCosmetic(id: string): Promise<boolean> {
  const item = getCosmetic(id);
  if (!item) return false;
  if (item.acquisition.kind === 'entitlement') {
    return hasEntitlementSync(item.acquisition.entitlement);
  }
  if (item.acquisition.kind === 'iap') {
    return hasEntitlementSync(item.acquisition.productId);
  }
  const state = await load();
  return id in state.owned;
}

/**
 * Record an amber-bought cosmetic as owned. Does NOT spend amber — the caller must
 * call amberCurrency.spendAmber() first (mirrors roomUpgrades.purchaseRoomUpgrade).
 * Returns false if the item doesn't exist or isn't an amber item or is already owned.
 */
export async function recordAmberCosmeticPurchase(id: string): Promise<boolean> {
  const item = getCosmetic(id);
  if (!item || item.acquisition.kind !== 'amber') return false;
  const state = await load();
  if (id in state.owned) return false;
  state.owned[id] = Date.now();
  cache = state;
  await save();
  return true;
}

/** Equip an owned cosmetic for its category. Returns false if not owned. */
export async function equipCosmetic(id: string): Promise<boolean> {
  const item = getCosmetic(id);
  if (!item) return false;
  if (!(await ownsCosmetic(id))) return false;
  const state = await load();
  state.equipped[item.category] = id;
  cache = state;
  await save();
  return true;
}

/** The equipped cosmetic id for a category, or undefined (= phase default). */
export async function getEquipped(category: CosmeticCategory): Promise<string | undefined> {
  const state = await load();
  return state.equipped[category];
}

/** Clear all cosmetic state (for Settings → Reset All). */
export async function clearCosmetics(): Promise<void> {
  cache = getDefault();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
