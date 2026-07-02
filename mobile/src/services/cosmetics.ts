/**
 * Cosmetics — owned/equipped cosmetic state.
 *
 * Pure data layer for the cosmetic shop (tile themes, confetti palettes).
 * Ownership comes from two sources:
 *   - amber purchases (spent via amberCurrency.spendAmber, recorded here locally), and
 *   - entitlement grants (recorded in entitlements.ts).
 * `ownsCosmetic()` checks both. Mirrors the roomUpgrades.ts cache pattern; native-free.
 *
 * The equipped tile theme is pushed into theme/colors.ts via `setEquippedTileTheme()`
 * and resolved synchronously in `getTileColor()`; ShopScreen.tsx is the player-facing
 * surface. All themes stay phase-aware so a purchased theme still darkens with the
 * story (the tone contract).
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
  // Late-game amber tile themes — deeper sinks for players sitting on a full
  // house and a long faucet tail. Palettes live in TILE_THEMES (theme/colors.ts).
  {
    id: 'theme_verdant',
    category: 'tile_theme',
    name: 'Garden-grown',
    description: 'Lush greens from the garden. Some of them still lean toward the light.',
    acquisition: { kind: 'amber', cost: 650 },
  },
  {
    id: 'theme_static',
    category: 'tile_theme',
    name: 'Between-signals',
    description: 'The gray between stations, and one cold signal that is not noise.',
    acquisition: { kind: 'amber', cost: 800 },
  },
  {
    id: 'theme_sovereign',
    category: 'tile_theme',
    name: 'Crown-of-the-pattern',
    description: 'Deep violet and old gold, for the one the pattern favors.',
    acquisition: { kind: 'amber', cost: 1000 },
  },
  {
    id: 'theme_patron',
    category: 'tile_theme',
    name: 'Patron',
    description: 'An exclusive amber-and-gold tile set, yours as a Patron.',
    acquisition: { kind: 'entitlement', entitlement: ENTITLEMENTS.PATRON },
  },
  // Amber-bought confetti palettes. IDs match CONFETTI_THEMES in theme/colors.ts.
  {
    id: 'confetti_gold',
    category: 'confetti',
    name: 'Golden Fall',
    description: 'Victory falls in warm amber and gold.',
    acquisition: { kind: 'amber', cost: 250 },
  },
  {
    id: 'confetti_dusk',
    category: 'confetti',
    name: 'Dusk Drift',
    description: 'A drift of mauve and violet for the deepening evening.',
    acquisition: { kind: 'amber', cost: 350 },
  },
  {
    id: 'confetti_ember',
    category: 'confetti',
    name: 'Ember Rain',
    description: 'Embers raining upward, to match a kept fire.',
    acquisition: { kind: 'amber', cost: 350 },
  },
  // Late-game amber confetti, matching the Garden-grown / Crown-of-the-pattern themes.
  {
    id: 'confetti_verdant',
    category: 'confetti',
    name: 'Garden Fall',
    description: 'Green things falling, as if the garden let them go.',
    acquisition: { kind: 'amber', cost: 450 },
  },
  {
    id: 'confetti_sovereign',
    category: 'confetti',
    name: 'Crowned Fall',
    description: 'Violet and old gold for a well-arranged victory.',
    acquisition: { kind: 'amber', cost: 550 },
  },
  // "The Keeper's Collection" — a one-time IAP cosmetic bundle. Both items are
  // owned together via the COSMETIC_BUNDLE entitlement (granted by the bundle
  // purchase), and are not amber-purchasable, keeping the cash/amber catalogs
  // disjoint.
  {
    id: 'theme_eclipse',
    category: 'tile_theme',
    name: 'Eclipse',
    description: 'A deep violet-and-crimson set for the Keeper. Bundle exclusive.',
    acquisition: { kind: 'entitlement', entitlement: ENTITLEMENTS.COSMETIC_BUNDLE },
  },
  {
    id: 'confetti_eclipse',
    category: 'confetti',
    name: 'Eclipse Fall',
    description: 'Violet and ember light, falling. Bundle exclusive.',
    acquisition: { kind: 'entitlement', entitlement: ENTITLEMENTS.COSMETIC_BUNDLE },
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

/** Drop the in-memory cosmetic cache after external storage writes (cloud restore). */
export function invalidateCosmeticsCache(): void {
  cache = null;
  syncEquipped = {};
  setEquippedTileTheme(null);
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
