/**
 * Cosmetics — owned/equipped cosmetic state.
 *
 * Pure data layer for the cosmetic shop (tile themes + finishes, confetti
 * palettes, move sparks).
 * Ownership comes from two sources:
 *   - amber purchases (spent via amberCurrency.spendAmber, recorded here locally), and
 *   - entitlement grants (recorded in entitlements.ts).
 * `ownsCosmetic()` checks both. Mirrors the roomUpgrades.ts cache pattern; native-free.
 *
 * The equipped tile theme is pushed into theme/colors.ts via `setEquippedTileTheme()`
 * and resolved synchronously in `getTileColor()` (palette) and `getTileFinish()`
 * (material); confetti and spark selections are read on the render path with
 * `getEquippedSync()`. ShopScreen.tsx is the player-facing surface. All themes stay phase-aware so a purchased theme still darkens with the
 * story (the tone contract).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasEntitlementSync, ENTITLEMENTS } from './entitlements';
import { setEquippedTileTheme } from '../theme/colors';

const STORAGE_KEY = 'wordshift_cosmetics';

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

export type CosmeticCategory = 'tile_theme' | 'confetti' | 'spark' | 'room_accent';

/** How a cosmetic is acquired. */
export type CosmeticAcquisition =
  | { kind: 'amber'; cost: number }
  | { kind: 'iap'; productId: string }
  | { kind: 'entitlement'; entitlement: string } // auto-owned with an entitlement (e.g. Patron theme)
  | { kind: 'reward' }; // earned via gameplay (e.g. a season pass tier) — granted with grantCosmetic()

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
  // FINISH-LED tile themes. Unlike the palette-led sets above, these are sold on
  // their MATERIAL: the finish in TILE_FINISHES (theme/colors.ts) repaints the
  // bevel, gloss, specular, sweep, rim and speckle on EVERY tile of the board,
  // so the purchase reads on tiles the player is not currently touching. Hue is
  // still phase-owned, so the board darkens with the story exactly as before.
  {
    id: 'theme_beeswax',
    category: 'tile_theme',
    name: 'Beeswax and Honey',
    description: "Soft wax, still warm from Panko's kitchen. Fingerprints stay in it for a while, and then they do not.",
    acquisition: { kind: 'amber', cost: 550 },
  },
  // Late-game palette-led sinks for players sitting on a full house and a long
  // faucet tail. Palettes live in TILE_THEMES (theme/colors.ts). The list is
  // ordered by price, so the finish-led sets above and below interleave.
  {
    id: 'theme_verdant',
    category: 'tile_theme',
    name: 'Garden-grown',
    description: 'Lush greens from the garden. Some of them still lean toward the light.',
    acquisition: { kind: 'amber', cost: 650 },
  },
  {
    id: 'theme_glasswork',
    category: 'tile_theme',
    name: 'Cathedral Glass',
    description: 'Colored panes with dark lead running between them. Archimedes says the window is older than the study, and will not say how much older.',
    acquisition: { kind: 'amber', cost: 700 },
  },
  {
    id: 'theme_mothwing',
    category: 'tile_theme',
    name: 'Moth-wing',
    description: 'Pale dust that comes off on your fingers. It was going toward a light. It found the house instead.',
    acquisition: { kind: 'amber', cost: 750 },
  },
  {
    id: 'theme_static',
    category: 'tile_theme',
    name: 'Between-signals',
    description: 'The gray between stations, and one cold signal that is not noise.',
    acquisition: { kind: 'amber', cost: 800 },
  },
  {
    id: 'theme_obsidian',
    category: 'tile_theme',
    name: 'Cut Obsidian',
    description: 'Black stone, cut until it holds an edge. It shows you your own face a little wrong, and you keep looking.',
    acquisition: { kind: 'amber', cost: 850 },
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
  // Amber-bought MOVE SPARKS. The star burst fires on every committed move, so
  // this is the most-seen effect in the game. IDs match SPARK_THEMES in
  // theme/colors.ts; the burst's count, spread and physics stay phase-owned.
  {
    id: 'spark_hearth',
    category: 'spark',
    name: 'Hearth Sparks',
    description: 'The little sparks a settling log throws. Ember says a fire that never throws them is only pretending to be one.',
    acquisition: { kind: 'amber', cost: 250 },
  },
  {
    id: 'spark_pollen',
    category: 'spark',
    name: 'Pollen',
    description: 'Pale gold that comes off the flowers and gets on everything. Thyme says it means the garden is pleased with you.',
    acquisition: { kind: 'amber', cost: 300 },
  },
  {
    id: 'spark_saltgrain',
    category: 'spark',
    name: 'Salt Grain',
    description: 'Coarse white salt, thrown at the doorway. Warren says it is only for the floors. He puts it down anyway.',
    acquisition: { kind: 'amber', cost: 350 },
  },
  {
    id: 'spark_thread',
    category: 'spark',
    name: 'Cut Thread',
    description: 'Gold and mauve, snipped short. Every one of them used to be part of something longer.',
    acquisition: { kind: 'amber', cost: 400 },
  },
  {
    id: 'spark_ash',
    category: 'spark',
    name: 'Ash and Ember',
    description: 'Grey, mostly. The red ones are the ones still deciding.',
    acquisition: { kind: 'amber', cost: 450 },
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
  // Exclusive to active Supporter subscribers (the `supporter` entitlement).
  {
    id: 'confetti_supporter',
    category: 'confetti',
    name: 'Keeper’s Thanks',
    description: 'Warm gold and patron violet, for the ones who keep the fire lit.',
    acquisition: { kind: 'entitlement', entitlement: ENTITLEMENTS.SUPPORTER },
  },
  // Season pass PREMIUM final-tier reward — earned via the season track (granted
  // with grantCosmetic when the tier is claimed), not bought directly.
  {
    id: 'confetti_season',
    category: 'confetti',
    name: 'The Season Turns',
    description: 'Teal, old gold, and a rose ember. Earned at the top of a season.',
    acquisition: { kind: 'reward' },
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
 * Drop the in-memory cosmetic cache after external storage writes (cloud
 * restore).
 *
 * Unlike its ~25 siblings this clears RENDER-PATH MIRRORS — colors.ts's
 * activeTileThemeId (tile palette AND finish) and the getEquippedSync map
 * Confetti reads for the confetti palette and move sparks. Nothing lazily
 * refills them: the only async cosmetic reads in the app are ShopScreen's and
 * initCosmetics. So the clear is only half the fix; the other half is
 * cloudSave.restoreFromCloudData awaiting initCosmetics immediately after
 * this. Without it, restoring a save stripped every purchased cosmetic off the
 * board for the rest of the session while the Shop still read "Equipped".
 */
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
  // 'amber' and 'reward' items are recorded in the local owned map.
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

/**
 * Grant local ownership of a reward/amber cosmetic without spending anything —
 * for cosmetics EARNED via gameplay (e.g. a Season Pass premium tier). Idempotent;
 * returns true only on the first grant. Entitlement/IAP cosmetics are owned via
 * their entitlement, so this is a no-op (returns false) for those.
 */
export async function grantCosmetic(id: string): Promise<boolean> {
  const item = getCosmetic(id);
  if (!item) return false;
  if (item.acquisition.kind === 'entitlement' || item.acquisition.kind === 'iap') return false;
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
