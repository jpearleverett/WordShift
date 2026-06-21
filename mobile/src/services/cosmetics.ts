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
import { setEquippedTileTheme } from '../theme/colors';

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
  // Amber-bought tile themes. These double as the Phase-5 Tending shrine motifs
  // (warm / deep / quiet), so deepening the pattern and dressing the board share
  // a vocabulary. IDs match the palettes in `theme/colors.ts` (TILE_THEMES).
  {
    id: 'theme_ember',
    category: 'tile_theme',
    name: 'Ember-warm',
    description: 'Tiles in the warm reds and golds of a kept fire.',
    acquisition: { kind: 'amber', cost: 300 },
  },
  {
    id: 'theme_tide',
    category: 'tile_theme',
    name: 'Deep-tide',
    description: 'The deep blues and teals of water that sees somewhere else.',
    acquisition: { kind: 'amber', cost: 400 },
  },
  {
    id: 'theme_bone',
    category: 'tile_theme',
    name: 'Bone-quiet',
    description: 'A hushed, desaturated set for the terrible peace.',
    acquisition: { kind: 'amber', cost: 500 },
  },
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
// Synchronous mirror of the equipped selection, so render-path code (e.g.
// `theme/colors.ts` resolving the tile theme) never needs to await AsyncStorage.
let syncEquipped: Partial<Record<CosmeticCategory, string>> = {};

function getDefault(): CosmeticState {
  return { owned: {}, equipped: {} };
}

/** Mirror the equipped selection synchronously and push the tile theme to colors. */
function syncEquippedFrom(state: CosmeticState): void {
  syncEquipped = { ...state.equipped };
  setEquippedTileTheme(state.equipped.tile_theme ?? null);
}

async function load(): Promise<CosmeticState> {
  if (cache) return cache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed.owned === 'object') {
        cache = { owned: parsed.owned ?? {}, equipped: parsed.equipped ?? {} };
        syncEquippedFrom(cache);
        return cache;
      }
    }
  } catch {
    /* ignore */
  }
  cache = getDefault();
  syncEquippedFrom(cache);
  return cache;
}

/**
 * Warm the cosmetic cache and apply the equipped tile theme at app bootstrap
 * (mirrors initIAP/initAds). Safe to call repeatedly.
 */
export async function initCosmetics(): Promise<void> {
  const state = await load();
  // Always (re)apply, even on a warm cache, so the colors module reflects the
  // equipped theme after a cold start.
  syncEquippedFrom(state);
}

/** Synchronously read the equipped cosmetic id for a category (render-path safe). */
export function getEquippedSync(category: CosmeticCategory): string | undefined {
  return syncEquipped[category];
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
  syncEquippedFrom(state);
  await save();
  return true;
}

/** Unequip a category, returning to the phase default. */
export async function unequipCosmetic(category: CosmeticCategory): Promise<void> {
  const state = await load();
  delete state.equipped[category];
  cache = state;
  syncEquippedFrom(state);
  await save();
}

/** The equipped cosmetic id for a category, or undefined (= phase default). */
export async function getEquipped(category: CosmeticCategory): Promise<string | undefined> {
  const state = await load();
  return state.equipped[category];
}

/** Clear all cosmetic state (for Settings → Reset All). */
export async function clearCosmetics(): Promise<void> {
  cache = getDefault();
  syncEquippedFrom(cache);
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
