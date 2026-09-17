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
 *  - that path preserves permanent entitlements and sparse responses, revokes
 *    only an explicitly inactive subscription, and never blocks initialize().
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
    transactions: [] as any[],
  };
  const customerInfo = () => ({
    entitlements: { active: { ...state.activeEntitlements } },
    nonSubscriptionTransactions: state.transactions,
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
      // Match by exact identifier OR by the bare product id (an Android
      // subscription StoreProduct's identifier carries a `:basePlanId` suffix,
      // yet the adapter queries by the bare product id).
      return state.products.filter(
        (p) =>
          ids.includes(p.identifier) ||
          ids.includes(String(p.identifier).split(':')[0]),
      );
    },
    purchaseStoreProduct: async (product: any) => {
      state.calls.push({ method: 'purchaseStoreProduct', args: [product] });
      return {
        customerInfo: customerInfo(),
        productIdentifier: product?.identifier,
        transaction: {
          transactionIdentifier: state.transactionId,
          purchaseDate: new Date().toISOString(),
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
const originalStorageWrite = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;

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
  (AsyncStorage.setItem as jest.Mock).mockImplementation(originalStorageWrite);
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
  rc.__state.transactions = [];
  const { invalidateProgressCache } = await import('../services/amberCurrency');
  const { invalidateHintsCache } = await import('../services/hints');
  invalidateProgressCache(); invalidateHintsCache();
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

describe('RevenueCat adapter — subscription product category', () => {
  // An Android subscription StoreProduct's identifier carries the base plan id.
  const SUB_STORE_ID = `${PRODUCT_IDS.SUPPORTER_SUB}:monthly`;

  it('splits a mixed batch by category and returns both (sub id normalized to bare)', async () => {
    rc.__state.products = [
      storeProduct(PRODUCT_IDS.AMBER_SMALL),
      storeProduct(SUB_STORE_ID),
    ];
    const p = await initProvider();

    const result = await p.getProducts([
      PRODUCT_IDS.AMBER_SMALL,
      PRODUCT_IDS.SUPPORTER_SUB,
    ]);

    // Both groups come back; the subscription's `:monthly` suffix is stripped so
    // the Store can match it to PRODUCT_IDS.SUPPORTER_SUB.
    expect(result.map((r) => r.productId).sort()).toEqual(
      [PRODUCT_IDS.AMBER_SMALL, PRODUCT_IDS.SUPPORTER_SUB].sort(),
    );

    const fetches = callsOf('getProducts');
    const nonSub = fetches.find(
      (c) => c.args[1] === rc.default.PRODUCT_CATEGORY.NON_SUBSCRIPTION,
    );
    const sub = fetches.find(
      (c) => c.args[1] === rc.default.PRODUCT_CATEGORY.SUBSCRIPTION,
    );
    expect(nonSub?.args[0]).toEqual([PRODUCT_IDS.AMBER_SMALL]);
    expect(sub?.args[0]).toEqual([PRODUCT_IDS.SUPPORTER_SUB]);
  });

  it('purchase(SUPPORTER_SUB) fetches with SUBSCRIPTION and buys the suffixed product', async () => {
    const product = storeProduct(SUB_STORE_ID);
    rc.__state.products = [product];
    rc.__state.activeEntitlements = { [ENTITLEMENTS.SUPPORTER]: { isActive: true } };
    const p = await initProvider();

    const result = await p.purchase(PRODUCT_IDS.SUPPORTER_SUB);

    const fetches = callsOf('getProducts');
    expect(fetches).toHaveLength(1);
    expect(fetches[0].args[0]).toEqual([PRODUCT_IDS.SUPPORTER_SUB]);
    expect(fetches[0].args[1]).toBe(rc.default.PRODUCT_CATEGORY.SUBSCRIPTION);
    // purchaseStoreProduct receives the base-plan-suffixed store product object.
    const purchases = callsOf('purchaseStoreProduct');
    expect(purchases[0].args[0]).toBe(product);
    expect(result.success).toBe(true);
    expect(result.entitlements).toContain(ENTITLEMENTS.SUPPORTER);
  });

  it('a one-time purchase never uses the SUBSCRIPTION category', async () => {
    rc.__state.products = [storeProduct(PRODUCT_IDS.PATRON_KEY)];
    const p = await initProvider();
    await p.purchase(PRODUCT_IDS.PATRON_KEY);

    const fetches = callsOf('getProducts');
    expect(fetches[0].args[1]).toBe(rc.default.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
    expect(
      fetches.some((c) => c.args[1] === rc.default.PRODUCT_CATEGORY.SUBSCRIPTION),
    ).toBe(false);
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
      purchasedAt: expect.any(Number),
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



describe('RevenueCat adapter — interrupted and pending purchase safety', () => {
  it('maps Play pending approval separately from cancellation or failure', async () => {
    rc.__state.products = [storeProduct(PRODUCT_IDS.AMBER_SMALL)];
    const p = await initProvider();
    const purchase = jest.spyOn(rc.default, 'purchaseStoreProduct').mockRejectedValue({ code: '20', message: 'Awaiting payment' });
    try {
      expect(await p.purchase(PRODUCT_IDS.AMBER_SMALL)).toMatchObject({ success: false, pending: true, error: 'payment_pending' });
    } finally { purchase.mockRestore(); }
  });

  it('never opens checkout if its historical receipt boundary cannot be made durable', async () => {
    rc.__state.products = [storeProduct(PRODUCT_IDS.AMBER_SMALL)];
    const original = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;
    const storage = jest.spyOn(AsyncStorage, 'setItem').mockImplementation(async (key, value) => {
      if (key === 'wordshift_storage_commit') throw new Error('full disk');
      await original(key, value);
    });
    try {
      const p = await initProvider();
      expect((await p.purchase(PRODUCT_IDS.AMBER_SMALL)).success).toBe(false);
      expect(callsOf('purchaseStoreProduct')).toHaveLength(0);
    } finally { storage.mockRestore(); }
  });

  it('credits delayed completed receipts through the SDK listener, once', async () => {
    await initProvider();
    await flushBackgroundChain();
    rc.__state.transactions = [{ transactionIdentifier: 'approved-later', productIdentifier: PRODUCT_IDS.AMBER_SMALL, purchaseDate: '2026-09-13T01:00:00Z' }];
    const info = { entitlements: { active: {} }, nonSubscriptionTransactions: rc.__state.transactions };
    rc.__state.listeners[0](info);
    await flushBackgroundChain();
    rc.__state.listeners[0](info);
    await flushBackgroundChain();
    const { getAmberBalance } = await import('../services/amberCurrency');
    const { AMBER_PACK_GRANTS, FIRST_PURCHASE_AMBER_MULTIPLIER } = await import('../constants/gameBalance');
    expect(await getAmberBalance()).toBe(AMBER_PACK_GRANTS.small * FIRST_PURCHASE_AMBER_MULTIPLIER);
    expect(callsOf('purchaseStoreProduct')).toHaveLength(0);
  });

  it('recovers a completed receipt on the next initialization after checkout was interrupted', async () => {
    await initProvider();
    await flushBackgroundChain();
    rc.__state.transactions = [{ transactionIdentifier: 'paid-before-kill', productIdentifier: PRODUCT_IDS.HINTS_SMALL, purchaseDate: '2026-09-13T01:00:00Z' }];
    const { getHintBalance } = await import('../services/hints');
    const before = await getHintBalance();
    await initProvider();
    await flushBackgroundChain();
    const { HINT_PACK_GRANTS } = await import('../constants/gameBalance');
    expect(await getHintBalance()).toBe(before + HINT_PACK_GRANTS.small);
    expect(callsOf('purchaseStoreProduct')).toHaveLength(0);
  });
});


describe('RevenueCat adapter — explicit subscription expiry', () => {
  it('removes an explicitly expired Supporter while preserving permanent purchases', async () => {
    await grantEntitlements([ENTITLEMENTS.SUPPORTER, ENTITLEMENTS.PATRON, ENTITLEMENTS.COSMETIC_BUNDLE]);
    await initProvider();
    await flushBackgroundChain();
    rc.__state.listeners[0]({ entitlements: { active: {}, all: { supporter: { isActive: false } } }, nonSubscriptionTransactions: [] });
    await flushBackgroundChain();
    expect(await hasEntitlement(ENTITLEMENTS.SUPPORTER)).toBe(false);
    expect(await hasEntitlement(ENTITLEMENTS.PATRON)).toBe(true);
    expect(await hasEntitlement(ENTITLEMENTS.COSMETIC_BUNDLE)).toBe(true);
  });

  it('does not infer subscription expiry from an empty or partial customer record', async () => {
    await grantEntitlements([ENTITLEMENTS.SUPPORTER]);
    await initProvider();
    await flushBackgroundChain();
    rc.__state.listeners[0]({ entitlements: { active: {}, all: {} }, nonSubscriptionTransactions: [] });
    await flushBackgroundChain();
    expect(await hasEntitlement(ENTITLEMENTS.SUPPORTER)).toBe(true);
  });

  it('keeps benefits after renewal cancellation until the paid subscription actually expires', async () => {
    await initProvider();
    await flushBackgroundChain();
    const supporter = { isActive: true, willRenew: false };
    rc.__state.listeners[0]({ entitlements: { active: { supporter }, all: { supporter } }, nonSubscriptionTransactions: [] });
    await flushBackgroundChain();
    expect(await hasEntitlement(ENTITLEMENTS.SUPPORTER)).toBe(true);
  });
});


describe('RevenueCat adapter — one purchase, two ids (Play order id vs RevenueCat transaction id)', () => {
  // On Google Play purchaseStoreProduct's transaction.transactionIdentifier is
  // the Play ORDER id (StoreTransactionMapper.kt), while the same purchase
  // appears in customerInfo.nonSubscriptionTransactions under RevenueCat's own
  // transaction id (TransactionMapper.kt). The receipt-recovery path keys on
  // the latter, so the two surfaces must be linked or every consumable pays
  // twice: once at checkout, again when the customer-info listener fires (and
  // again on every cold start until then).
  const ORDER_ID = 'GPA.3312-1234-5678-90123';
  const RC_ID = 'rc_txn_9f8e7d6c';

  async function buyThroughStore(productId: string, purchaseDate: string) {
    const { setBillingProvider, purchaseConsumable, settleConsumableGrant } = await import('../services/iap');
    rc.__state.products = [storeProduct(productId)];
    rc.__state.transactionId = ORDER_ID;
    const p = await initProvider();
    setBillingProvider(p);
    await flushBackgroundChain(); // baseline captured from an EMPTY history
    // The post-purchase customer info (and every later listener update) lists
    // the purchase under RevenueCat's id, never under the Play order id.
    rc.__state.transactions = [{ transactionIdentifier: RC_ID, productIdentifier: productId, purchaseDate }];
    const result = await purchaseConsumable(productId);
    expect(result.success).toBe(true);
    await settleConsumableGrant(result.grantId!);
    return p;
  }

  it('checkout returns the RevenueCat receipt id linked to the order id', async () => {
    rc.__state.products = [storeProduct(PRODUCT_IDS.AMBER_SMALL)];
    rc.__state.transactionId = ORDER_ID;
    const p = await initProvider();
    await flushBackgroundChain();
    rc.__state.transactions = [{ transactionIdentifier: RC_ID, productIdentifier: PRODUCT_IDS.AMBER_SMALL, purchaseDate: new Date().toISOString() }];
    const result = await p.purchase(PRODUCT_IDS.AMBER_SMALL);
    expect(result).toMatchObject({ success: true, transactionId: ORDER_ID, linkedTransactionIds: [RC_ID] });
  });

  it('ignores receipts that were already known before checkout began', async () => {
    rc.__state.products = [storeProduct(PRODUCT_IDS.AMBER_SMALL)];
    rc.__state.transactionId = ORDER_ID;
    // An OLD receipt for the same product is in the history before checkout...
    rc.__state.transactions = [{ transactionIdentifier: 'rc_old_receipt', productIdentifier: PRODUCT_IDS.AMBER_SMALL, purchaseDate: '2026-01-01T00:00:00Z' }];
    const p = await initProvider();
    await flushBackgroundChain();
    // ...and the post-purchase customer info shows nothing new yet (lag).
    const result = await p.purchase(PRODUCT_IDS.AMBER_SMALL);
    expect(result.transactionId).toBe(ORDER_ID);
    expect(result.linkedTransactionIds).toBeUndefined();
  });

  it('amber pack: the listener update and the next cold start credit nothing more', async () => {
    const { getAmberBalance } = await import('../services/amberCurrency');
    const { AMBER_PACK_GRANTS, FIRST_PURCHASE_AMBER_MULTIPLIER } = await import('../constants/gameBalance');
    await buyThroughStore(PRODUCT_IDS.AMBER_SMALL, new Date().toISOString());
    const afterCheckout = await getAmberBalance();
    expect(afterCheckout).toBe(AMBER_PACK_GRANTS.small * FIRST_PURCHASE_AMBER_MULTIPLIER);

    // The SDK fires its customer-info update after every purchase.
    const info = { entitlements: { active: {} }, nonSubscriptionTransactions: rc.__state.transactions };
    rc.__state.listeners[0](info);
    await flushBackgroundChain();
    await flushBackgroundChain();
    expect(await getAmberBalance()).toBe(afterCheckout);

    // And the next launch reconciles the whole history again.
    await initProvider();
    await flushBackgroundChain();
    await flushBackgroundChain();
    expect(await getAmberBalance()).toBe(afterCheckout);
    expect(callsOf('purchaseStoreProduct')).toHaveLength(1);
  });

  it('starter pack: both halves stay credited exactly once across the listener and a relaunch', async () => {
    const { getAmberBalance } = await import('../services/amberCurrency');
    const { getHintBalance } = await import('../services/hints');
    const { setBillingProvider, purchaseStarterPack, settleConsumableGrant } = await import('../services/iap');
    const { STARTER_PACK_GRANTS } = await import('../constants/gameBalance');
    rc.__state.products = [storeProduct(PRODUCT_IDS.STARTER_PACK)];
    rc.__state.transactionId = ORDER_ID;
    const p = await initProvider();
    setBillingProvider(p);
    await flushBackgroundChain();
    const hintsBefore = await getHintBalance();
    rc.__state.transactions = [{ transactionIdentifier: RC_ID, productIdentifier: PRODUCT_IDS.STARTER_PACK, purchaseDate: new Date().toISOString() }];
    const result = await purchaseStarterPack();
    expect(result.success).toBe(true);
    await settleConsumableGrant(result.grantIds!.amber!);
    await settleConsumableGrant(result.grantIds!.hints!);
    expect(await getAmberBalance()).toBe(STARTER_PACK_GRANTS.amber);
    expect(await getHintBalance()).toBe(hintsBefore + STARTER_PACK_GRANTS.hints);

    rc.__state.listeners[0]({ entitlements: { active: { starter_pack: { isActive: true } } }, nonSubscriptionTransactions: rc.__state.transactions });
    await flushBackgroundChain();
    await flushBackgroundChain();
    await initProvider();
    await flushBackgroundChain();
    await flushBackgroundChain();
    expect(await getAmberBalance()).toBe(STARTER_PACK_GRANTS.amber);
    expect(await getHintBalance()).toBe(hintsBefore + STARTER_PACK_GRANTS.hints);
  });

  it('does not link a receipt that was known before checkout even when it is recent', async () => {
    rc.__state.products = [storeProduct(PRODUCT_IDS.AMBER_SMALL)];
    rc.__state.transactionId = ORDER_ID;
    // A known receipt from two minutes ago is an earlier purchase, not this one.
    rc.__state.transactions = [{ transactionIdentifier: 'rc_two_minutes_ago', productIdentifier: PRODUCT_IDS.AMBER_SMALL, purchaseDate: new Date(Date.now() - 2 * 60_000).toISOString() }];
    const p = await initProvider();
    await flushBackgroundChain();
    const result = await p.purchase(PRODUCT_IDS.AMBER_SMALL);
    expect(result.transactionId).toBe(ORDER_ID);
    expect(result.linkedTransactionIds).toBeUndefined();
  });

  it('a late receipt covered only by the time window is recorded as delivered, so a cold start cannot re-credit it', async () => {
    const { getAmberBalance } = await import('../services/amberCurrency');
    const { setBillingProvider, purchaseConsumable, settleConsumableGrant } = await import('../services/iap');
    rc.__state.products = [storeProduct(PRODUCT_IDS.AMBER_SMALL)];
    rc.__state.transactionId = ORDER_ID;
    const p = await initProvider();
    setBillingProvider(p);
    await flushBackgroundChain();
    // The post-purchase customer info lags: nothing new for the product yet,
    // so the checkout captures no linked receipt id.
    rc.__state.transactions = [];
    const result = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
    expect(result.success).toBe(true);
    await settleConsumableGrant(result.grantId!);
    const afterCheckout = await getAmberBalance();

    // Seconds later the listener delivers the same purchase under RC's id.
    rc.__state.transactions = [{ transactionIdentifier: RC_ID, productIdentifier: PRODUCT_IDS.AMBER_SMALL, purchaseDate: new Date().toISOString() }];
    rc.__state.listeners[0]({ entitlements: { active: {} }, nonSubscriptionTransactions: rc.__state.transactions });
    await flushBackgroundChain();
    await flushBackgroundChain();
    expect(await getAmberBalance()).toBe(afterCheckout);

    // The alias is durable: the applied ledger now names the receipt id, which
    // is what protects the next cold start (in-memory session receipts gone).
    const storage: any = jest.requireMock('@react-native-async-storage/async-storage');
    const applied = JSON.parse(await (storage.default ?? storage).getItem('wordshift_applied_iap_grants') ?? '[]');
    expect(applied).toContain(RC_ID);
    await initProvider();
    await flushBackgroundChain();
    await flushBackgroundChain();
    expect(await getAmberBalance()).toBe(afterCheckout);
  });

  it('a receipt for the same product minutes later is still a NEW purchase', async () => {
    const { getAmberBalance } = await import('../services/amberCurrency');
    const { AMBER_PACK_GRANTS, FIRST_PURCHASE_AMBER_MULTIPLIER } = await import('../constants/gameBalance');
    await buyThroughStore(PRODUCT_IDS.AMBER_SMALL, new Date().toISOString());
    const afterCheckout = await getAmberBalance();
    // A later purchase completed while the app was closed (a distinct receipt,
    // well outside the linked-grant window) must still be recovered.
    rc.__state.transactions = [
      ...rc.__state.transactions,
      { transactionIdentifier: 'rc_txn_later', productIdentifier: PRODUCT_IDS.AMBER_SMALL, purchaseDate: new Date(Date.now() + 10 * 60_000).toISOString() },
    ];
    await initProvider();
    await flushBackgroundChain();
    await flushBackgroundChain();
    expect(await getAmberBalance()).toBe(afterCheckout + AMBER_PACK_GRANTS.small);
    expect(afterCheckout).toBe(AMBER_PACK_GRANTS.small * FIRST_PURCHASE_AMBER_MULTIPLIER);
  });
});


describe('RevenueCat adapter — refunded or revoked one-time purchases', () => {
  it('drops a Patron purchase the store now reports as explicitly inactive', async () => {
    await grantEntitlements([ENTITLEMENTS.PATRON, ENTITLEMENTS.COSMETIC_BUNDLE]);
    await initProvider();
    await flushBackgroundChain();
    // A Play refund: RevenueCat keeps the entitlement in `all` with isActive
    // false and removes it from `active`. The untouched bundle stays.
    rc.__state.listeners[0]({
      entitlements: { active: { [ENTITLEMENTS.COSMETIC_BUNDLE]: { isActive: true } }, all: { [ENTITLEMENTS.PATRON]: { isActive: false }, [ENTITLEMENTS.COSMETIC_BUNDLE]: { isActive: true } } },
      nonSubscriptionTransactions: [],
    });
    await flushBackgroundChain();
    expect(await hasEntitlement(ENTITLEMENTS.PATRON)).toBe(false);
    expect(await hasEntitlement(ENTITLEMENTS.COSMETIC_BUNDLE)).toBe(true);
  });

  it('never revokes a purchase the response merely omits (sparse guard kept)', async () => {
    await grantEntitlements([ENTITLEMENTS.PATRON, ENTITLEMENTS.ADFREE]);
    await initProvider();
    await flushBackgroundChain();
    rc.__state.listeners[0]({ entitlements: { active: {}, all: {} }, nonSubscriptionTransactions: [] });
    await flushBackgroundChain();
    rc.__state.listeners[0]({ entitlements: { active: {} }, nonSubscriptionTransactions: [] });
    await flushBackgroundChain();
    expect(await hasEntitlement(ENTITLEMENTS.PATRON)).toBe(true);
    expect(await hasEntitlement(ENTITLEMENTS.ADFREE)).toBe(true);
  });

  it('a purchase listed as active is never revoked by a stale inactive record', async () => {
    await grantEntitlements([ENTITLEMENTS.ADFREE]);
    await initProvider();
    await flushBackgroundChain();
    rc.__state.listeners[0]({
      entitlements: { active: { [ENTITLEMENTS.ADFREE]: { isActive: true } }, all: { [ENTITLEMENTS.ADFREE]: { isActive: false } } },
      nonSubscriptionTransactions: [],
    });
    await flushBackgroundChain();
    expect(await hasEntitlement(ENTITLEMENTS.ADFREE)).toBe(true);
  });
});


describe('RevenueCat adapter — subscription management URL', () => {
  it('reports customerInfo.managementURL once a customer info carried one', async () => {
    const p = await initProvider();
    await flushBackgroundChain();
    expect(await p.getSubscriptionManagementUrl!()).toBeNull();
    rc.__state.listeners[0]({ entitlements: { active: {} }, nonSubscriptionTransactions: [], managementURL: 'https://play.google.com/store/account/subscriptions?sku=x&package=y' });
    await flushBackgroundChain();
    expect(await p.getSubscriptionManagementUrl!()).toBe('https://play.google.com/store/account/subscriptions?sku=x&package=y');
  });

  it('iap.ts falls back to the platform subscriptions page when the store has none', async () => {
    const { setBillingProvider, getSubscriptionManagementUrl, PLAY_SUBSCRIPTIONS_URL } = await import('../services/iap');
    const p = await initProvider();
    setBillingProvider(p);
    await flushBackgroundChain();
    expect(await getSubscriptionManagementUrl(PLAY_SUBSCRIPTIONS_URL)).toBe(PLAY_SUBSCRIPTIONS_URL);
  });
});
