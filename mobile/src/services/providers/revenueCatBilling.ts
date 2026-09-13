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
 * RevenueCat dashboard setup: five Entitlements — `patron`, `adfree`,
 * `cosmetic_bundle`, `starter_pack` (LIVE for Android as of 2026-07-02,
 * attached to the matching non-consumable products) plus `supporter` (the
 * revenue-pass auto-renewing subscription `com.wordshift.supporter_monthly`).
 * The amber/hint packs are consumable with no entitlement. Active entitlement
 * identifiers map straight to the `ENTITLEMENTS` values in entitlements.ts. No
 * Offerings are configured — purchases go through getProducts +
 * purchaseStoreProduct by product id.
 *
 * PRODUCT CATEGORY (load-bearing): the SDK's `Purchases.getProducts(ids, type?)`
 * DEFAULTS the type param to PRODUCT_CATEGORY.SUBSCRIPTION, and on Android Play
 * Billing TYPES the query, so a category mismatch returns NOTHING — getProducts
 * → [] and every purchase dies as `product_not_found`. WordShift's catalog is
 * MIXED: the one-time/consumable SKUs must be fetched with NON_SUBSCRIPTION, and
 * the `supporter` subscription with SUBSCRIPTION. Both call sites therefore
 * split the requested ids by `isSubscriptionProduct()` and fetch each group with
 * its own category (`nonSubscriptionCategory()` / `subscriptionCategory()`). An
 * Android subscription StoreProduct's `identifier` carries a `:basePlanId`
 * suffix (e.g. `...supporter_monthly:monthly`), so the subscription results are
 * normalized back to the bare product id.
 */

import { Platform } from 'react-native';
import {
  BillingProvider,
  IapProduct,
  isSubscriptionProduct,
  ProductId,
  PurchaseResult,
  initializeStorePurchaseHistory,
  reconcileStorePurchaseHistory,
  StorePurchaseTransaction,
  notifyBillingChanges,
} from '../iap';
import { ENTITLEMENTS, EntitlementKey, grantEntitlements, getGrantedEntitlements, setEntitlements, invalidateEntitlementsCache } from '../entitlements';
import { runStorageTransaction, StorageRecoveryRequiredError } from '../persistenceStorage';
import { saveWithPlayerRetry } from '../saveRetry';
import { claimSupporterStipendIfDue } from '../supporterStipend';

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Defer this dependency to preserve native availability and import-cycle boundaries.
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

/**
 * The SDK's PRODUCT_CATEGORY.SUBSCRIPTION constant (the getProducts default,
 * passed explicitly here so the intent is legible). Used for the `supporter`
 * auto-renewing subscription; on Android a NON_SUBSCRIPTION fetch of it returns
 * []. Literal-string fallback covers partial test mocks, like the sibling above.
 */
function subscriptionCategory(purchasesMod: any): string {
  return purchasesMod?.PRODUCT_CATEGORY?.SUBSCRIPTION ?? 'SUBSCRIPTION';
}

/**
 * An Android subscription StoreProduct identifier is `productId:basePlanId`
 * (e.g. `com.wordshift.supporter_monthly:monthly`); strip the base-plan suffix
 * so results key back to the bare product id the app asked for. One-time product
 * identifiers have no colon and pass through unchanged.
 */
function bareProductId(identifier: string): string {
  return typeof identifier === 'string' ? identifier.split(':')[0] : identifier;
}

export function createRevenueCatBillingProvider(config: RevenueCatConfig = {}): BillingProvider {
  let Purchases: any | null = null;
  let ready = false;
  let historyReady: Promise<void> | null = null;

  function transactionsFrom(customerInfo: any): StorePurchaseTransaction[] {
    return (customerInfo?.nonSubscriptionTransactions ?? []).map((transaction: any) => ({
      transactionId: transaction.transactionIdentifier,
      productId: bareProductId(transaction.productIdentifier),
      purchasedAt: Date.parse(transaction.purchaseDate),
    }));
  }

  async function syncCompletedPurchases(customerInfo: any): Promise<void> {
    await historyReady;
    await reconcileStorePurchaseHistory(transactionsFrom(customerInfo));
  }

  /** Translate a RevenueCat customerInfo into our entitlement key set. */
  function entitlementsFrom(customerInfo: any): EntitlementKey[] {
    const active = customerInfo?.entitlements?.active ?? {};
    // RevenueCat entitlement identifiers are configured as 'patron'/'adfree',
    // which already equal our ENTITLEMENTS values — pass them straight through.
    return Object.keys(active);
  }

  /**
   * Preserve permanent purchases and sparse/offline responses. A subscription
   * is removed only when its explicit SDK record says it is inactive; merely
   * cancelling renewal while the paid period remains active keeps its benefits.
   * Never throws (fire-and-forget callers must not be able to reject).
   */
  async function grantFromCustomerInfo(customerInfo: any): Promise<void> {
    try {
      const ents = entitlementsFrom(customerInfo);
      const supporterExpired = !ents.includes(ENTITLEMENTS.SUPPORTER) &&
        customerInfo?.entitlements?.all?.[ENTITLEMENTS.SUPPORTER]?.isActive === false;
      if (ents.length > 0 || supporterExpired) {
        const save = async () => {
          try {
            await runStorageTransaction('billing_entitlement_sync', async () => {
              invalidateEntitlementsCache();
              if (supporterExpired) {
                await setEntitlements((await getGrantedEntitlements()).filter(key => key !== ENTITLEMENTS.SUPPORTER));
              }
              await grantEntitlements(ents);
            });
          } catch (error) { invalidateEntitlementsCache(); throw error; }
        };
        try { await save(); } catch (error) {
          if (!(error instanceof StorageRecoveryRequiredError)) throw error;
          await saveWithPlayerRetry(save, { title: 'Your purchases are waiting', message: 'We need to finish saving your purchases before continuing. Free some device storage if it is full, then retry. You will not be charged again.' });
        }
        if (ents.includes(ENTITLEMENTS.SUPPORTER)) {
          await saveWithPlayerRetry(claimSupporterStipendIfDue, { title: 'Your monthly amber is waiting', message: 'We need to finish saving your monthly amber. Free some device storage if it is full, then retry. Your payment will not be repeated.' });
        }
      }
      notifyBillingChanges({ entitlements: ents.filter(key => key !== ENTITLEMENTS.STARTER_PACK) });
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
      // preserve permanent ownership; explicit subscription expiry is handled
      // by grantFromCustomerInfo — see its doc comment.
      try {
        mod.addCustomerInfoUpdateListener?.((customerInfo: any) => {
          void grantFromCustomerInfo(customerInfo);
          void syncCompletedPurchases(customerInfo).catch(error => console.warn('[IAP] Receipt recovery failed:', error));
        });
      } catch (error) {
        console.warn('[IAP] RevenueCat listener registration failed:', error);
      }
      // Checkout waits for this durable baseline; initialize itself stays
      // non-blocking so an offline store never prevents ordinary play.
      historyReady = (async () => {
        await mod.invalidateCustomerInfoCache?.();
        const customerInfo = await mod.getCustomerInfo();
        await initializeStorePurchaseHistory(transactionsFrom(customerInfo));
        void grantFromCustomerInfo(customerInfo);
        void reconcileStorePurchaseHistory(transactionsFrom(customerInfo))
          .catch(error => console.warn('[IAP] Receipt recovery failed:', error));
      })();
      void historyReady.catch(error => console.warn('[IAP] RevenueCat silent restore failed:', error));
    },

    async getProducts(productIds: ProductId[]): Promise<IapProduct[]> {
      if (!ready || !Purchases) return [];
      // Category is REQUIRED and MIXED: the SDK defaults to SUBSCRIPTION (which
      // on Android returns [] for one-time SKUs), so fetch the one-time and
      // subscription ids in separate category-typed queries and merge.
      const subIds = productIds.filter(isSubscriptionProduct);
      const nonSubIds = productIds.filter((id) => !isSubscriptionProduct(id));
      const fetchGroup = async (
        ids: ProductId[],
        category: string,
        normalizeId: boolean,
      ): Promise<IapProduct[]> => {
        if (ids.length === 0) return [];
        try {
          const products: any[] = await Purchases.getProducts(ids, category);
          return (products ?? []).map((p) => ({
            productId: normalizeId ? bareProductId(p.identifier) : p.identifier,
            title: p.title ?? p.identifier,
            description: p.description ?? '',
            priceString: p.priceString ?? '',
          }));
        } catch (error) {
          console.warn('[IAP] RevenueCat getProducts failed:', error);
          return [];
        }
      };
      const [nonSub, sub] = await Promise.all([
        fetchGroup(nonSubIds, nonSubscriptionCategory(Purchases), false),
        fetchGroup(subIds, subscriptionCategory(Purchases), true),
      ]);
      return [...nonSub, ...sub];
    },

    async purchase(productId: ProductId): Promise<PurchaseResult> {
      if (!ready || !Purchases) {
        return { success: false, productId, error: 'billing_unavailable' };
      }
      try {
        // A failed first snapshot must be retried before checkout, otherwise
        // a future restart cannot distinguish old spent packs from this one.
        try { await historyReady; } catch {
          await Purchases.invalidateCustomerInfoCache?.();
          const customerInfo = await Purchases.getCustomerInfo();
          await initializeStorePurchaseHistory(transactionsFrom(customerInfo));
          historyReady = Promise.resolve();
        }
        // Fetch the store product object RevenueCat needs to start a purchase.
        // Same category requirement as getProducts above: the fetch MUST use the
        // product's own category (SUBSCRIPTION for `supporter`, NON_SUBSCRIPTION
        // for everything else) or Android returns [] and this dies in the
        // product_not_found branch below.
        const category = isSubscriptionProduct(productId)
          ? subscriptionCategory(Purchases)
          : nonSubscriptionCategory(Purchases);
        const products: any[] = await Purchases.getProducts([productId], category);
        // A subscription StoreProduct's identifier carries a `:basePlanId`
        // suffix, so match on the bare id too before falling back to the first
        // returned product (purchaseStoreProduct uses its default base plan).
        const product =
          (products ?? []).find((p) => p.identifier === productId) ??
          (products ?? []).find((p) => bareProductId(p.identifier) === productId) ??
          products?.[0];
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
        if (String(error?.code) === String(Purchases?.PURCHASES_ERROR_CODE?.PAYMENT_PENDING_ERROR ?? '20')) {
          return { success: false, productId, pending: true, error: 'payment_pending' };
        }
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
        void syncCompletedPurchases(customerInfo).catch(error => console.warn('[IAP] Receipt recovery failed:', error));
        return { entitlements: entitlementsFrom(customerInfo) };
      } catch (error) {
        console.warn('[IAP] RevenueCat restore failed:', error);
        return { entitlements: [], error: 'restore_failed' };
      }
    },
  };
}

