/**
 * RevenueCat billing adapter WITH the SDK present (inline jest mock — same
 * pattern as adsConsent.test.ts mocks react-native-google-mobile-ads; the
 * adapter loads the SDK via a guarded literal require('react-native-purchases')).
 *
 * Pins the launch-blocking product-category contract and the silent-restore
 * behavior:
 *  - every product fetch passes PRODUCT_CATEGORY.NON_SUBSCRIPTION explicitly
 *    (the SDK defaults to SUBSCRIPTION, and on Android a subscription-typed
 *    query for WordShift's all-one-time/consumable catalog returns [] — every
 *    purchase then dies as product_not_found);
 *  - initialize() fire-and-forgets a getCustomerInfo restore + registers a
 *    customer-info update listener, granting active entitlements locally so a
 *    reinstall doesn't strip a paying user until they manually tap Restore;
 *  - that path is GRANT-ONLY (never revokes local entitlements) and never
 *    blocks or rejects initialize().
 */

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

// Full inline mock of the native SDK. Records every call (method + args) on
// __state.calls so the tests can assert the category param and call ordering.
jest.mock('react-native-purchases', () => {
  const state = {
    calls: [] as { method: string; args: any[] }[],
    /** entitlement id → info blob, served as customerInfo.entitlements.active */
    activeEntitlements: {} as Record<string, unknown>,
    /** Store products served by getProducts (matched by identifier). */
    products: [] as any[],
    /** When true, getProducts rejects (simulates a store/network failure). */
    throwOnGetProducts: false,
    /** When true, getCustomerInfo never resolves (simulates a dead network). */
    hangCustomerInfo: false,
    /** When true, getCustomerInfo rejects. */
    throwOnGetCustomerInfo: false,
    /** Listeners registered via addCustomerInfoUpdateListener. */
    listeners: [] as ((info: any) => void)[],
    /** Store transaction id returned by purchaseStoreProduct. */
    transactionId: 'txn_test_1',
  };
  const customerInfo = () => ({
    entitlements: { active: { ...state.activeEntitlements } },
  });
  const Purchases = {
    PRODUCT_CATEGORY: {
      NON_SUBSCRIPTION: 'NON_SUBSCRIPTION',
      SUBSCRIPTION: 'SUBSCRIPTION',
    },
    configure: async (cfg: any) => {
      state.calls.push({ method: 'configure', args: [cfg] });
    },
    getProducts: async (ids: string[], category?: string) => {
      state.calls.push({ method: 'getProducts', args: [ids, category] });
      if (state.throwOnGetProducts) throw new Error('store exploded');
      return state.products.filter((p) => ids.includes(p.identifier));
    },
    purchaseStoreProduct: async (product: any) => {
      state.calls.push({ method: 'purchaseStoreProduct', args: [product] });
      return {
        customerInfo: customerInfo(),
        productIdentifier: product?.identifier,
        transaction: {
          transactionIdentifier: state.transactionId,
          productIdentifier: product?.identifier,
        },
      };
    },
    getCustomerInfo: async () => {
      state.calls.push({ method: 'getCustomerInfo', args: [] });
      if (state.hangCustomerInfo) return new Promise(() => {});
      if (state.throwOnGetCustomerInfo) throw new Error('offline');
      return customerInfo();
    },
    addCustomerInfoUpdateListener: (cb: (info: any) => void) => {
      state.calls.push({ method: 'addCustomerInfoUpdateListener', args: [] });
      state.listeners.push(cb);
    },
    restorePurchases: async () => {
      state.calls.push({ method: 'restorePurchases', args: [] });
      return customerInfo();
    },
  };
  return { __state: state, default: Purchases };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createRevenueCatBillingProvider } from '../services/providers/revenueCatBilling';
import {
  ENTITLEMENTS,
  clearEntitlements,
  grantEntitlements,
  hasEntitlement,
  loadEntitlements,
} from '../services/entitlements';
import { PRODUCT_IDS, BillingProvider } from '../services/iap';

const rc = jest.requireMock('react-native-purchases');

/** Drain the microtask chain kicked off in the background by initialize(). */
const flushBackgroundChain = () => new Promise((resolve) => setImmediate(resolve));

/** A store product object shaped like PurchasesStoreProduct. */
function storeProduct(identifier: string): any {
  return {
    identifier,
    title: `Title for ${identifier}`,
    description: `Desc for ${identifier}`,
    priceString: '$0.99',
  };
}

async function initProvider(): Promise<BillingProvider> {
  const p = createRevenueCatBillingProvider({ androidKey: 'goog_fake_key' });
  await p.initialize();
  return p;
}

function callsOf(method: string): { method: string; args: any[] }[] {
  return rc.__state.calls.filter((c: any) => c.method === method);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearEntitlements();
  await loadEntitlements();
  rc.__state.calls.length = 0;
  rc.__state.listeners.length = 0;
  rc.__state.products = [];
  rc.__state.activeEntitlements = {};
  rc.__state.throwOnGetProducts = false;
  rc.__state.hangCustomerInfo = false;
  rc.__state.throwOnGetCustomerInfo = false;
  rc.__state.transactionId = 'txn_test_1';
  // The adapter warns on deliberate failures we simulate — keep output clean.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  (console.warn as jest.Mock).mockRestore?.();
});

describe('RevenueCat adapter — product category (launch blocker)', () => {
  it('getProducts passes NON_SUBSCRIPTION explicitly (SDK defaults to SUBSCRIPTION)', async () => {
    rc.__state.products = [storeProduct(PRODUCT_IDS.AMBER_SMALL)];
    const p = await initProvider();

    const result = await p.getProducts([PRODUCT_IDS.AMBER_SMALL]);

    const fetches = callsOf('getProducts');
    expect(fetches).toHaveLength(1);
    expect(fetches[0].args[0]).toEqual([PRODUCT_IDS.AMBER_SMALL]);
    expect(fetches[0].args[1]).toBe(rc.default.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    // And the fetched product maps into our IapProduct shape.
    expect(result).toEqual([
      {
        productId: PRODUCT_IDS.AMBER_SMALL,
        title: `Title for ${PRODUCT_IDS.AMBER_SMALL}`,
        description: `Desc for ${PRODUCT_IDS.AMBER_SMALL}`,
        priceString: '$0.99',
      },
    ]);
  });

  it('purchase() passes NON_SUBSCRIPTION on the pre-fetch and purchases the fetched product object', async () => {
    const product = storeProduct(PRODUCT_IDS.PATRON_KEY);
    rc.__state.products = [product];
    rc.__state.activeEntitlements = { [ENTITLEMENTS.PATRON]: { isActive: true } };
    const p = await initProvider();

    const result = await p.purchase(PRODUCT_IDS.PATRON_KEY);

    const fetches = callsOf('getProducts');
    expect(fetches).toHaveLength(1);
    expect(fetches[0].args[0]).toEqual([PRODUCT_IDS.PATRON_KEY]);
    expect(fetches[0].args[1]).toBe(rc.default.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    // purchaseStoreProduct must receive the exact product object the fetch returned.
    const purchases = callsOf('purchaseStoreProduct');
    expect(purchases).toHaveLength(1);
    expect(purchases[0].args[0]).toBe(product);
    expect(result.success).toBe(true);
  });

  it('falls back to the literal category string when the SDK enum is absent (partial mock)', async () => {
    rc.__state.products = [storeProduct(PRODUCT_IDS.HINTS_SMALL)];
    const p = await initProvider();
    const saved = rc.default.PRODUCT_CATEGORY;
    delete rc.default.PRODUCT_CATEGORY;
    try {
      await p.getProducts([PRODUCT_IDS.HINTS_SMALL]);
      expect(callsOf('getProducts')[0].args[1]).toBe('NON_SUBSCRIPTION');
    } finally {
      rc.default.PRODUCT_CATEGORY = saved;
    }
  });

  it('getProducts returns [] gracefully when the SDK throws', async () => {
    rc.__state.throwOnGetProducts = true;
    const p = await initProvider();
    expect(await p.getProducts([PRODUCT_IDS.AMBER_LARGE])).toEqual([]);
  });

  it('purchase fails cleanly (not crash) when the SDK product fetch throws', async () => {
    rc.__state.throwOnGetProducts = true;
    const p = await initProvider();
    const result = await p.purchase(PRODUCT_IDS.AMBER_LARGE);
    expect(result.success).toBe(false);
    expect(result.cancelled).toBeUndefined();
  });
});

describe('RevenueCat adapter — purchase entitlement mapping', () => {
  it('maps customerInfo.entitlements.active keys straight into the result', async () => {
    rc.__state.products = [storeProduct(PRODUCT_IDS.REMOVE_ADS)];
    rc.__state.activeEntitlements = { [ENTITLEMENTS.ADFREE]: { isActive: true } };
    const p = await initProvider();

    const result = await p.purchase(PRODUCT_IDS.REMOVE_ADS);
    expect(result).toEqual({
      success: true,
      productId: PRODUCT_IDS.REMOVE_ADS,
      entitlements: [ENTITLEMENTS.ADFREE],
      // The store transaction id rides along for the pending-grant ledger.
      transactionId: 'txn_test_1',
    });
  });
});

describe('RevenueCat adapter — silent restore on initialize()', () => {
  it('fetches customerInfo after configure and grants active entitlements locally', async () => {
    rc.__state.activeEntitlements = {
      [ENTITLEMENTS.PATRON]: { isActive: true },
      [ENTITLEMENTS.COSMETIC_BUNDLE]: { isActive: true },
    };
    const p = await initProvider();
    await flushBackgroundChain();

    expect(p.isReady()).toBe(true);
    expect(callsOf('getCustomerInfo')).toHaveLength(1);
    expect(await hasEntitlement(ENTITLEMENTS.PATRON)).toBe(true);
    expect(await hasEntitlement(ENTITLEMENTS.COSMETIC_BUNDLE)).toBe(true);
  });

  it('is grant-only: never revokes a local entitlement the store did not report', async () => {
    // Local grant that the (flaky/partial) store response omits.
    await grantEntitlements([ENTITLEMENTS.STARTER_PACK]);
    rc.__state.activeEntitlements = { [ENTITLEMENTS.PATRON]: { isActive: true } };

    const p = await initProvider();
    await flushBackgroundChain();

    expect(await hasEntitlement(ENTITLEMENTS.PATRON)).toBe(true);
    // The pre-existing local grant survives — network state can't strip a payer.
    expect(await hasEntitlement(ENTITLEMENTS.STARTER_PACK)).toBe(true);
    expect(p.isReady()).toBe(true);
  });

  it('never blocks initialize() on the restore fetch', async () => {
    rc.__state.hangCustomerInfo = true;
    const p = createRevenueCatBillingProvider({ androidKey: 'goog_fake_key' });
    // If initialize() awaited getCustomerInfo this would hang forever and blow
    // the jest timeout — resolving at all IS the assertion.
    await p.initialize();
    expect(p.isReady()).toBe(true);
    expect(callsOf('getCustomerInfo')).toHaveLength(1);
  });

  it('swallows a failing restore fetch (initialize still succeeds, nothing granted)', async () => {
    rc.__state.throwOnGetCustomerInfo = true;
    const p = await initProvider();
    await flushBackgroundChain();

    expect(p.isReady()).toBe(true);
    expect(await hasEntitlement(ENTITLEMENTS.PATRON)).toBe(false);
  });
});

describe('RevenueCat adapter — customer-info update listener', () => {
  it('registers the listener during initialize() and grants when it fires', async () => {
    const p = await initProvider();
    await flushBackgroundChain();
    expect(p.isReady()).toBe(true);
    expect(rc.__state.listeners).toHaveLength(1);

    // A later store-side update (e.g. purchase on another device, deferred
    // Play acknowledgement) pushes new active entitlements.
    rc.__state.listeners[0]({
      entitlements: { active: { [ENTITLEMENTS.ADFREE]: { isActive: true } } },
    });
    await flushBackgroundChain();

    expect(await hasEntitlement(ENTITLEMENTS.ADFREE)).toBe(true);
  });

  it('listener fire with no active entitlements grants nothing and never throws', async () => {
    await initProvider();
    await flushBackgroundChain();

    expect(() => rc.__state.listeners[0]({ entitlements: { active: {} } })).not.toThrow();
    await flushBackgroundChain();
    expect(await hasEntitlement(ENTITLEMENTS.PATRON)).toBe(false);
  });
});
