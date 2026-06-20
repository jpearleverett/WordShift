/**
 * In-app purchase layer (scaffold).
 *
 * The real billing SDK (RevenueCat `react-native-purchases` is the documented
 * choice) is a NATIVE module and would break Expo Go, so it is abstracted behind
 * a `BillingProvider` interface — exactly like `cloudSave.ts` abstracts the cloud
 * backend behind `CloudProvider`. Until a real provider is wired via
 * `setBillingProvider()`, a `NoOpBillingProvider` is used: the app builds, runs in
 * Expo Go, and is fully unit-testable; purchases simply fail cleanly.
 *
 * On a verified purchase/restore, this module translates products → entitlement
 * keys and writes them to `entitlements.ts`, which is what the rest of the app reads.
 *
 * To go live (see docs/MONETIZATION_F2P_IMPLEMENTATION.md §2.1 / §4.0):
 *   1. `npm i react-native-purchases`, add its config plugin, move to EAS Dev Client.
 *   2. Implement a `RevenueCatBillingProvider implements BillingProvider`.
 *   3. Call `setBillingProvider(new RevenueCatBillingProvider(apiKey))` in initIAP().
 */

import {
  ENTITLEMENTS,
  EntitlementKey,
  grantEntitlements,
  setEntitlements,
  loadEntitlements,
} from './entitlements';

// ---------------------------------------------------------------------------
// Product catalog
// ---------------------------------------------------------------------------

/** Store product identifiers. Must match App Store Connect / Play Console product ids. */
export const PRODUCT_IDS = {
  PATRON_KEY: 'com.wordshift.patron_key',
  COSMETIC_BUNDLE: 'com.wordshift.cosmetic_bundle',
} as const;

export type ProductId = string;

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

/**
 * Restore previously-purchased products. The store's reported set becomes the
 * authoritative local entitlement state.
 */
export async function restorePurchases(): Promise<{ entitlements: EntitlementKey[] }> {
  const { entitlements } = await provider.restorePurchases();
  await setEntitlements(entitlements);
  return { entitlements };
}
