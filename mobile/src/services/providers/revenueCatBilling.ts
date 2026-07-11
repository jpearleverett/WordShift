/**
 * RevenueCat billing provider (drop-in adapter).
 *
 * Implements the `BillingProvider` interface from `iap.ts` on top of
 * `react-native-purchases`. It is INERT until two things are true:
 *   1. `react-native-purchases` is installed (it's a native module — needs a
 *      dev/production build, not Expo Go), and
 *   2. a RevenueCat public SDK key is provided (via the `config` argument or
 *      `app.json` → `expo.extra.revenueCatIosKey` / `revenueCatAndroidKey`).
 *
 * Until then every method degrades exactly like the NoOp provider (`isReady()`
 * returns false, purchases fail cleanly), so registering it with
 * `setBillingProvider()` is always safe. The native module is loaded with a
 * guarded dynamic `require` INSIDE `initialize()` so this file imports cleanly
 * under Jest / typecheck / Expo Go where the module is absent.
 *
 * Wiring (after `npx expo install react-native-purchases` + adding keys):
 *   import { createRevenueCatBillingProvider } from './src/services/providers/revenueCatBilling';
 *   setBillingProvider(createRevenueCatBillingProvider());
 *   // ...then the fire-and-forget `initIAP()` in the App bootstrap configures it.
 *
 * RevenueCat dashboard setup (LIVE for Android as of 2026-07-02): four
 * Entitlements — `patron`, `adfree`, `cosmetic_bundle`, `starter_pack` —
 * attached to `com.wordshift.patron_key` / `remove_ads` / `cosmetic_bundle` /
 * `starter` (non-consumable); the amber/hint packs are consumable with no
 * entitlement. Active entitlement identifiers map straight to the
 * `ENTITLEMENTS` values in entitlements.ts. No Offerings are configured —
 * purchases go through getProducts + purchaseStoreProduct by product id.
 *
 * PRODUCT CATEGORY (load-bearing): every WordShift SKU is a ONE-TIME or
 * CONSUMABLE in-app product — there are no subscriptions. The SDK's
 * `Purchases.getProducts(ids, type?)` DEFAULTS the type param to
 * PRODUCT_CATEGORY.SUBSCRIPTION, and on Android Play Billing types the query,
 * so a defaulted (subscription) fetch of one-time products returns NOTHING —
 * getProducts → [] and every purchase dies as `product_not_found`. Every
 * product fetch here must therefore pass the NON_SUBSCRIPTION category
 * explicitly (see `nonSubscriptionCategory()`).
 */

import { Platform } from 'react-native';
import {
  BillingProvider,
  IapProduct,
  ProductId,
  PurchaseResult,
} from '../iap';
import { EntitlementKey, grantEntitlements } from '../entitlements';

export interface RevenueCatConfig {
  /** RevenueCat public SDK key for the Apple App Store. */
  iosKey?: string;
  /** RevenueCat public SDK key for the Google Play Store. */
  androidKey?: string;
}

/** Pull keys from app.json → expo.extra when not passed explicitly. */
function keyFromExtra(): string | undefined {
  try {
    // Lazy require so the file stays importable if expo-constants is absent.
    const Constants = require('expo-constants').default ?? require('expo-constants');
    const extra = Constants?.expoConfig?.extra ?? Constants?.manifest?.extra ?? {};
    return Platform.OS === 'ios' ? extra.revenueCatIosKey : extra.revenueCatAndroidKey;
  } catch {
    return undefined;
  }
}

/** Guarded load of the native SDK. Returns null when it isn't installed.
 *
 * IMPORTANT: this is a LITERAL `require`, not `eval('require')`. Metro only
 * bundles modules it can see via static `require('literal')` — a dynamic/eval
 * require is invisible to it, so the SDK's JS never shipped in release builds
 * and this returned null even on a real Play build (getProducts → [] → the
 * store read "not available"). The try/catch still degrades cleanly to NoOp
 * under Jest / Expo Go, where the native module is absent. */
function loadPurchases(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases');
    return mod?.default ?? mod;
  } catch {
    return null;
  }
}

/**
 * The SDK's PRODUCT_CATEGORY.NON_SUBSCRIPTION constant, read off the loaded
 * Purchases object (it's a static on the default export). Every WordShift SKU
 * is a one-time/consumable in-app product, and the SDK defaults getProducts'
 * category to SUBSCRIPTION — which on Android returns [] for our catalog — so
 * this MUST be passed at every getProducts call site. The literal string
 * fallback covers partial mocks (the module arrives via a guarded literal
 * require and a test double may omit the enum); the native layer compares the
 * enum by its string value, so the literal is equivalent.
 */
function nonSubscriptionCategory(purchasesMod: any): string {
  return purchasesMod?.PRODUCT_CATEGORY?.NON_SUBSCRIPTION ?? 'NON_SUBSCRIPTION';
}

export function createRevenueCatBillingProvider(config: RevenueCatConfig = {}): BillingProvider {
  let Purchases: any | null = null;
  let ready = false;

  /** Translate a RevenueCat customerInfo into our entitlement key set. */
  function entitlementsFrom(customerInfo: any): EntitlementKey[] {
    const active = customerInfo?.entitlements?.active ?? {};
    // RevenueCat entitlement identifiers are configured as 'patron'/'adfree',
    // which already equal our ENTITLEMENTS values — pass them straight through.
    return Object.keys(active);
  }

  /**
   * Grant-only sync of the store's active entitlements into local state (the
   * SAME customerInfo → entitlement mapping the purchase() success path uses).
   * `grantEntitlements` only ADDS keys — this path never clears/revokes local
   * entitlements, so a flaky network or a partial customerInfo can never strip
   * a paying user. Revocation stays with the explicit Restore Purchases flow.
   * Never throws (fire-and-forget callers must not be able to reject).
   */
  async function grantFromCustomerInfo(customerInfo: any): Promise<void> {
    try {
      const ents = entitlementsFrom(customerInfo);
      if (ents.length > 0) {
        await grantEntitlements(ents);
      }
    } catch (error) {
      console.warn('[IAP] RevenueCat entitlement sync failed:', error);
    }
  }

  return {
    getName(): string {
      return 'RevenueCat';
    },

    isReady(): boolean {
      return ready;
    },

    async initialize(): Promise<void> {
      const apiKey =
        (Platform.OS === 'ios' ? config.iosKey : config.androidKey) ?? keyFromExtra();
      if (!apiKey) {
        // No key configured yet — stay inert.
        return;
      }
      const mod = loadPurchases();
      if (!mod) {
        // SDK not installed (e.g. Expo Go) — stay inert.
        return;
      }
      try {
        await mod.configure({ apiKey });
        Purchases = mod;
        ready = true;
      } catch (error) {
        console.warn('[IAP] RevenueCat configure failed:', error);
        ready = false;
        return;
      }

      // Silent entitlement restore — fire-and-forget, NEVER blocks initialize's
      // resolution and never throws. A reinstall wipes local entitlement state,
      // and without this a paying Patron loses ad-free/cosmetic-bundle perks
      // until they manually find Restore Purchases in Settings. Register the
      // customer-info listener FIRST (so no update between fetch and register
      // is missed), then fetch the current customerInfo. Both paths are
      // grant-only via grantFromCustomerInfo — see its doc comment.
      try {
        mod.addCustomerInfoUpdateListener?.((customerInfo: any) => {
          void grantFromCustomerInfo(customerInfo);
        });
      } catch (error) {
        console.warn('[IAP] RevenueCat listener registration failed:', error);
      }
      void (async () => {
        try {
          const customerInfo = await mod.getCustomerInfo();
          await grantFromCustomerInfo(customerInfo);
        } catch (error) {
          // Non-fatal: the update listener and the manual Restore Purchases
          // flow still cover the player.
          console.warn('[IAP] RevenueCat silent restore failed:', error);
        }
      })();
    },

    async getProducts(productIds: ProductId[]): Promise<IapProduct[]> {
      if (!ready || !Purchases) return [];
      try {
        // Category is REQUIRED: the SDK defaults to SUBSCRIPTION, which on
        // Android returns [] for our all-one-time/consumable catalog.
        const products: any[] = await Purchases.getProducts(
          productIds,
          nonSubscriptionCategory(Purchases),
        );
        return (products ?? []).map((p) => ({
          productId: p.identifier,
          title: p.title ?? p.identifier,
          description: p.description ?? '',
          priceString: p.priceString ?? '',
        }));
      } catch (error) {
        console.warn('[IAP] RevenueCat getProducts failed:', error);
        return [];
      }
    },

    async purchase(productId: ProductId): Promise<PurchaseResult> {
      if (!ready || !Purchases) {
        return { success: false, productId, error: 'billing_unavailable' };
      }
      try {
        // Fetch the store product object RevenueCat needs to start a purchase.
        // Same category requirement as getProducts above: without the explicit
        // NON_SUBSCRIPTION category this fetch returns [] on Android and every
        // purchase dies in the product_not_found branch below.
        const products: any[] = await Purchases.getProducts(
          [productId],
          nonSubscriptionCategory(Purchases),
        );
        const product = (products ?? []).find((p) => p.identifier === productId) ?? products?.[0];
        if (!product) {
          return { success: false, productId, error: 'product_not_found' };
        }
        const { customerInfo, transaction } = await Purchases.purchaseStoreProduct(product);
        return {
          success: true,
          productId,
          entitlements: entitlementsFrom(customerInfo),
          // Store transaction id → pending-grant ledger dedupe key (iap.ts).
          transactionId: transaction?.transactionIdentifier ?? undefined,
        };
      } catch (error: any) {
        if (error?.userCancelled) {
          return { success: false, productId, cancelled: true };
        }
        console.warn('[IAP] RevenueCat purchase failed:', error);
        return { success: false, productId, error: error?.message ?? 'purchase_failed' };
      }
    },

    async restorePurchases(): Promise<{ entitlements: EntitlementKey[]; error?: string }> {
      if (!ready || !Purchases) return { entitlements: [] };
      try {
        const customerInfo = await Purchases.restorePurchases();
        return { entitlements: entitlementsFrom(customerInfo) };
      } catch (error) {
        console.warn('[IAP] RevenueCat restore failed:', error);
        return { entitlements: [], error: 'restore_failed' };
      }
    },
  };
}
