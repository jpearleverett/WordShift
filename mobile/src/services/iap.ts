/**
 * In-app purchase layer (scaffold).
 *
 * A real billing SDK is a NATIVE module and would break Expo Go, so it is
 * abstracted behind a `BillingProvider` interface — exactly like `cloudSave.ts`
 * abstracts the cloud backend behind `CloudProvider`. The active provider is a
 * `NoOpBillingProvider`: the app builds, runs in Expo Go, and is fully
 * unit-testable; purchases simply fail cleanly.
 *
 * On a verified purchase/restore, this module translates products → entitlement
 * keys and writes them to `entitlements.ts`, which is what the rest of the app reads.
 */

import {
  ENTITLEMENTS,
  EntitlementKey,
  grantEntitlements,
  setEntitlements,
  loadEntitlements,
} from './entitlements';
import { AMBER_PACK_GRANTS, HINT_PACK_GRANTS } from '../constants/gameBalance';

// ---------------------------------------------------------------------------
// Product catalog
// ---------------------------------------------------------------------------

/** Store product identifiers. Must match App Store Connect / Play Console product ids. */
export const PRODUCT_IDS = {
  PATRON_KEY: 'com.wordshift.patron_key',
  /** The Keeper's Collection — non-consumable cosmetic bundle (grants an entitlement). */
  COSMETIC_BUNDLE: 'com.wordshift.cosmetic_bundle',
  /** Remove Ads / Supporter — ad-free + the victory 2x granted with no ad. */
  REMOVE_ADS: 'com.wordshift.remove_ads',
  // Consumable amber packs (repeatable; credit the amber reward balance).
  AMBER_SMALL: 'com.wordshift.amber_small',
  AMBER_MEDIUM: 'com.wordshift.amber_medium',
  AMBER_LARGE: 'com.wordshift.amber_large',
  // Consumable hint packs (repeatable; credit the hint balance).
  HINTS_SMALL: 'com.wordshift.hints_small',
  HINTS_LARGE: 'com.wordshift.hints_large',
} as const;

export type ProductId = string;

// ---------------------------------------------------------------------------
// Consumable catalog (amber + hint packs)
// ---------------------------------------------------------------------------

/** What a consumable purchase grants. Applied by the caller (StoreModal). */
export type ConsumableReward =
  | { kind: 'amber'; amount: number }
  | { kind: 'hints'; amount: number };

export interface ConsumableProductInfo {
  productId: ProductId;
  reward: ConsumableReward;
  /** Display name shown in the store. */
  name: string;
  /** Short blurb. */
  description: string;
  /** Marks the best-value tier in the UI. */
  bestValue?: boolean;
  /** Fallback price label when the store product isn't fetchable (e.g. Expo Go). */
  fallbackPrice: string;
}

/**
 * Consumable SKUs. Amber amounts come from `AMBER_PACK_GRANTS`, hint amounts from
 * `HINT_PACK_GRANTS` (gameBalance.ts) so balance lives in one place. These are
 * intentionally separate from the amber-bought cosmetic catalog — cash buys the
 * *currency/convenience*, never a specific cosmetic that's also amber-priced.
 */
export const CONSUMABLE_PRODUCTS: ConsumableProductInfo[] = [
  {
    productId: PRODUCT_IDS.AMBER_SMALL,
    reward: { kind: 'amber', amount: AMBER_PACK_GRANTS.small },
    name: 'Pouch of Amber',
    description: `${AMBER_PACK_GRANTS.small} amber for the shop.`,
    fallbackPrice: '$0.99',
  },
  {
    productId: PRODUCT_IDS.AMBER_MEDIUM,
    reward: { kind: 'amber', amount: AMBER_PACK_GRANTS.medium },
    name: 'Jar of Amber',
    description: `${AMBER_PACK_GRANTS.medium} amber — more per coin.`,
    fallbackPrice: '$2.99',
  },
  {
    productId: PRODUCT_IDS.AMBER_LARGE,
    reward: { kind: 'amber', amount: AMBER_PACK_GRANTS.large },
    name: 'Hoard of Amber',
    description: `${AMBER_PACK_GRANTS.large} amber — best value.`,
    bestValue: true,
    fallbackPrice: '$6.99',
  },
  {
    productId: PRODUCT_IDS.HINTS_SMALL,
    reward: { kind: 'hints', amount: HINT_PACK_GRANTS.small },
    name: 'Handful of Hints',
    description: `${HINT_PACK_GRANTS.small} hints when you're stuck.`,
    fallbackPrice: '$0.99',
  },
  {
    productId: PRODUCT_IDS.HINTS_LARGE,
    reward: { kind: 'hints', amount: HINT_PACK_GRANTS.large },
    name: 'Satchel of Hints',
    description: `${HINT_PACK_GRANTS.large} hints — never caught short.`,
    bestValue: true,
    fallbackPrice: '$2.99',
  },
];

/** The reward a consumable product grants, or undefined if it isn't a consumable. */
export function consumableReward(productId: ProductId): ConsumableReward | undefined {
  return CONSUMABLE_PRODUCTS.find(p => p.productId === productId)?.reward;
}

export interface IapProduct {
  productId: ProductId;
  title: string;
  description: string;
  /** Localized, currency-formatted price string from the store (e.g. "$6.99"). */
  priceString: string;
}

export interface PurchaseResult {
  success: boolean;
  productId?: ProductId;
  /** Entitlement keys granted by this purchase (already written to entitlements.ts). */
  entitlements?: EntitlementKey[];
  /** True when the user dismissed the native purchase sheet. */
  cancelled?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

export interface BillingProvider {
  initialize(): Promise<void>;
  getProducts(productIds: ProductId[]): Promise<IapProduct[]>;
  purchase(productId: ProductId): Promise<PurchaseResult>;
  /** Returns the authoritative set of entitlement keys the store reports as owned. */
  restorePurchases(): Promise<{ entitlements: EntitlementKey[] }>;
  isReady(): boolean;
  getName(): string;
}

// ---------------------------------------------------------------------------
// No-op provider (placeholder until a real billing SDK is connected)
// ---------------------------------------------------------------------------

class NoOpBillingProvider implements BillingProvider {
  async initialize(): Promise<void> {
    console.log('[IAP] NoOp provider — no billing SDK configured');
  }
  async getProducts(): Promise<IapProduct[]> {
    return [];
  }
  async purchase(productId: ProductId): Promise<PurchaseResult> {
    console.log('[IAP] NoOp purchase — no billing SDK configured:', productId);
    return { success: false, productId, error: 'billing_unavailable' };
  }
  async restorePurchases(): Promise<{ entitlements: EntitlementKey[] }> {
    return { entitlements: [] };
  }
  isReady(): boolean {
    return false;
  }
  getName(): string {
    return 'Not Connected';
  }
}

// ---------------------------------------------------------------------------
// Manager
// ---------------------------------------------------------------------------

let provider: BillingProvider = new NoOpBillingProvider();

/** Swap in a real billing provider during app initialization. */
export function setBillingProvider(newProvider: BillingProvider): void {
  provider = newProvider;
}

/** The active provider's display name (for diagnostics / Settings). */
export function getBillingProviderName(): string {
  return provider.getName();
}

/** Whether a real, configured billing backend is connected. */
export function isBillingReady(): boolean {
  return provider.isReady();
}

/**
 * Map a product to the entitlement keys it grants. Patron's Key grants the
 * `patron` entitlement; cosmetic products grant an entitlement keyed by product id.
 */
export function entitlementsForProduct(productId: ProductId): EntitlementKey[] {
  if (productId === PRODUCT_IDS.PATRON_KEY) return [ENTITLEMENTS.PATRON];
  if (productId === PRODUCT_IDS.REMOVE_ADS) return [ENTITLEMENTS.ADFREE];
  if (productId === PRODUCT_IDS.COSMETIC_BUNDLE) return [ENTITLEMENTS.COSMETIC_BUNDLE];
  return [productId];
}

/**
 * Initialize billing. Warms the entitlement cache first (so synchronous
 * entitlement checks work immediately), then initializes the provider.
 * Call from the App bootstrap gate alongside runMigrations().
 */
export async function initIAP(): Promise<void> {
  await loadEntitlements();
  try {
    await provider.initialize();
  } catch (error) {
    console.warn('[IAP] provider initialize failed:', error);
  }
}

/** Fetch displayable product info for the shop / Patron screen. */
export async function getProducts(
  productIds: ProductId[] = Object.values(PRODUCT_IDS),
): Promise<IapProduct[]> {
  try {
    return await provider.getProducts(productIds);
  } catch (error) {
    console.warn('[IAP] getProducts failed:', error);
    return [];
  }
}

/**
 * Purchase a product. On success, the granted entitlements are persisted to
 * entitlements.ts before returning, so callers can immediately read updated state.
 */
export async function purchaseProduct(productId: ProductId): Promise<PurchaseResult> {
  const result = await provider.purchase(productId);
  if (result.success) {
    const ents = result.entitlements ?? entitlementsForProduct(productId);
    await grantEntitlements(ents);
    return { ...result, entitlements: ents };
  }
  return result;
}

export interface ConsumablePurchaseResult {
  success: boolean;
  productId?: ProductId;
  /** The reward to apply on success (caller credits amber/hints). */
  reward?: ConsumableReward;
  cancelled?: boolean;
  error?: string;
}

/**
 * Purchase a CONSUMABLE pack (amber / hints). Unlike `purchaseProduct`, this
 * grants NO entitlement (consumables are repeatable) — on success it returns the
 * `reward` to apply, and the caller credits amber (`awardBonusAmber`) or hints
 * (`addHints`). This mirrors the codebase convention where the purchase layer
 * records the transaction and the caller orchestrates the currency grant.
 */
export async function purchaseConsumable(productId: ProductId): Promise<ConsumablePurchaseResult> {
  const reward = consumableReward(productId);
  if (!reward) {
    return { success: false, productId, error: 'unknown_product' };
  }
  const result = await provider.purchase(productId);
  if (result.success) {
    return { success: true, productId, reward };
  }
  return { success: false, productId, cancelled: result.cancelled, error: result.error };
}

/**
 * Restore previously-purchased products. The store's reported set becomes the
 * authoritative local entitlement state.
 */
export async function restorePurchases(): Promise<{ entitlements: EntitlementKey[] }> {
  const { entitlements } = await provider.restorePurchases();
  await setEntitlements(entitlements);
  return { entitlements };
}
