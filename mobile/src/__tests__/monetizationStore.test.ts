import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PRODUCT_IDS,
  CONSUMABLE_PRODUCTS,
  STARTER_PACK_INFO,
  consumableReward,
  entitlementsForProduct,
  purchaseConsumable,
  purchaseStarterPack,
  setBillingProvider,
  BillingProvider,
  PurchaseResult,
} from '../services/iap';
import {
  ENTITLEMENTS,
  loadEntitlements,
  getGrantedEntitlements,
  clearEntitlements,
  hasEntitlement,
  hasMadeAmberPurchase,
  markAmberPurchaseMade,
} from '../services/entitlements';
import {
  AMBER_PACK_GRANTS,
  HINT_PACK_GRANTS,
  STARTER_PACK_GRANTS,
  FIRST_PURCHASE_AMBER_MULTIPLIER,
} from '../constants/gameBalance';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

function fakeProvider(overrides: Partial<BillingProvider> = {}): BillingProvider {
  return {
    initialize: async () => {},
    getProducts: async () => [],
    purchase: async (productId): Promise<PurchaseResult> => ({ success: true, productId }),
    restorePurchases: async () => ({ entitlements: [] }),
    isReady: () => true,
    getName: () => 'Fake',
    ...overrides,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearEntitlements();
  await loadEntitlements();
});

describe('consumable catalog', () => {
  it('maps amber/hint SKUs to the right reward amounts from gameBalance', () => {
    expect(consumableReward(PRODUCT_IDS.AMBER_SMALL)).toEqual({ kind: 'amber', amount: AMBER_PACK_GRANTS.small });
    expect(consumableReward(PRODUCT_IDS.AMBER_MEDIUM)).toEqual({ kind: 'amber', amount: AMBER_PACK_GRANTS.medium });
    expect(consumableReward(PRODUCT_IDS.AMBER_LARGE)).toEqual({ kind: 'amber', amount: AMBER_PACK_GRANTS.large });
    expect(consumableReward(PRODUCT_IDS.HINTS_SMALL)).toEqual({ kind: 'hints', amount: HINT_PACK_GRANTS.small });
    expect(consumableReward(PRODUCT_IDS.HINTS_LARGE)).toEqual({ kind: 'hints', amount: HINT_PACK_GRANTS.large });
  });

  it('returns undefined for non-consumable products', () => {
    expect(consumableReward(PRODUCT_IDS.PATRON_KEY)).toBeUndefined();
    expect(consumableReward(PRODUCT_IDS.COSMETIC_BUNDLE)).toBeUndefined();
  });

  it('every catalog entry has a fallback price and a positive amount', () => {
    for (const p of CONSUMABLE_PRODUCTS) {
      expect(p.fallbackPrice).toMatch(/^\$/);
      expect(p.reward.amount).toBeGreaterThan(0);
    }
  });

  it('amber packs escalate value per dollar and badge the genuine best value', () => {
    const byId = (id: string) => CONSUMABLE_PRODUCTS.find(p => p.productId === id)!;
    const small = byId(PRODUCT_IDS.AMBER_SMALL);
    const medium = byId(PRODUCT_IDS.AMBER_MEDIUM);
    const large = byId(PRODUCT_IDS.AMBER_LARGE);
    const perDollar = (p: typeof small) =>
      p.reward.amount / parseFloat(p.fallbackPrice.replace('$', ''));

    // Value must strictly increase with pack size (ladder psychology).
    expect(perDollar(medium)).toBeGreaterThan(perDollar(small));
    expect(perDollar(large)).toBeGreaterThan(perDollar(medium));

    // The "best value" badge belongs on the genuine best-per-dollar amber SKU.
    expect(large.bestValue).toBe(true);
    expect(medium.bestValue).toBeFalsy();
  });
});

describe('purchaseConsumable', () => {
  it('returns the reward to apply on success WITHOUT granting an entitlement', async () => {
    setBillingProvider(fakeProvider());
    // Consume the one-time first-purchase 2x so this checks the steady-state amount.
    await markAmberPurchaseMade();
    const res = await purchaseConsumable(PRODUCT_IDS.AMBER_MEDIUM);
    expect(res.success).toBe(true);
    expect(res.reward).toEqual({ kind: 'amber', amount: AMBER_PACK_GRANTS.medium });
    // Consumables must NOT leave an entitlement behind (they're repeatable).
    expect(await getGrantedEntitlements()).toEqual([]);
  });

  it('passes through a user cancellation', async () => {
    setBillingProvider(fakeProvider({
      purchase: async (productId) => ({ success: false, productId, cancelled: true }),
    }));
    const res = await purchaseConsumable(PRODUCT_IDS.HINTS_SMALL);
    expect(res.success).toBe(false);
    expect(res.cancelled).toBe(true);
    expect(res.reward).toBeUndefined();
  });

  it('reports a clean failure on billing_unavailable', async () => {
    setBillingProvider(fakeProvider({
      purchase: async (productId) => ({ success: false, productId, error: 'billing_unavailable' }),
    }));
    const res = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
    expect(res.success).toBe(false);
    expect(res.error).toBe('billing_unavailable');
  });

  it('rejects an unknown product id', async () => {
    setBillingProvider(fakeProvider());
    const res = await purchaseConsumable('com.wordshift.not_a_real_sku');
    expect(res.success).toBe(false);
    expect(res.error).toBe('unknown_product');
  });
});

describe('cosmetic bundle entitlement', () => {
  it('maps the bundle product to the COSMETIC_BUNDLE entitlement', () => {
    expect(entitlementsForProduct(PRODUCT_IDS.COSMETIC_BUNDLE)).toEqual([ENTITLEMENTS.COSMETIC_BUNDLE]);
  });
});

describe('first-purchase amber double', () => {
  it('doubles the FIRST amber pack ever, then grants subsequent packs normally', async () => {
    setBillingProvider(fakeProvider());

    const first = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
    expect(first.success).toBe(true);
    expect(first.firstPurchaseDoubled).toBe(true);
    expect(first.reward).toEqual({
      kind: 'amber',
      amount: AMBER_PACK_GRANTS.small * FIRST_PURCHASE_AMBER_MULTIPLIER,
    });
    expect(await hasMadeAmberPurchase()).toBe(true);

    const second = await purchaseConsumable(PRODUCT_IDS.AMBER_LARGE);
    expect(second.success).toBe(true);
    expect(second.firstPurchaseDoubled).toBeFalsy();
    expect(second.reward).toEqual({ kind: 'amber', amount: AMBER_PACK_GRANTS.large });
  });

  it('a hint pack purchase does NOT consume the amber first-purchase double', async () => {
    setBillingProvider(fakeProvider());
    const hints = await purchaseConsumable(PRODUCT_IDS.HINTS_LARGE);
    expect(hints.success).toBe(true);
    expect(hints.firstPurchaseDoubled).toBeFalsy();
    expect(hints.reward).toEqual({ kind: 'hints', amount: HINT_PACK_GRANTS.large });
    expect(await hasMadeAmberPurchase()).toBe(false);

    // The double is still live for the first actual amber pack.
    const amber = await purchaseConsumable(PRODUCT_IDS.AMBER_MEDIUM);
    expect(amber.firstPurchaseDoubled).toBe(true);
    expect(amber.reward!.amount).toBe(AMBER_PACK_GRANTS.medium * FIRST_PURCHASE_AMBER_MULTIPLIER);
  });

  it('a failed or cancelled amber purchase does NOT consume the double', async () => {
    setBillingProvider(fakeProvider({
      purchase: async (productId) => ({ success: false, productId, cancelled: true }),
    }));
    await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
    expect(await hasMadeAmberPurchase()).toBe(false);

    setBillingProvider(fakeProvider());
    const res = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
    expect(res.firstPurchaseDoubled).toBe(true);
  });
});

describe('starter pack', () => {
  it('exposes catalog info with a fallback price and grants from gameBalance', () => {
    expect(STARTER_PACK_INFO.productId).toBe(PRODUCT_IDS.STARTER_PACK);
    expect(STARTER_PACK_INFO.fallbackPrice).toMatch(/^\$/);
    expect(STARTER_PACK_GRANTS.amber).toBeGreaterThan(0);
    expect(STARTER_PACK_GRANTS.hints).toBeGreaterThan(0);
  });

  it('is NOT a consumable (repeat-purchase path rejects it)', async () => {
    expect(consumableReward(PRODUCT_IDS.STARTER_PACK)).toBeUndefined();
    setBillingProvider(fakeProvider());
    const res = await purchaseConsumable(PRODUCT_IDS.STARTER_PACK);
    expect(res.success).toBe(false);
    expect(res.error).toBe('unknown_product');
  });

  it('maps to the STARTER_PACK entitlement', () => {
    expect(entitlementsForProduct(PRODUCT_IDS.STARTER_PACK)).toEqual([ENTITLEMENTS.STARTER_PACK]);
  });

  it('purchases once: grants amber+hints reward + the entitlement exactly once', async () => {
    let purchaseCalls = 0;
    setBillingProvider(fakeProvider({
      purchase: async (productId): Promise<PurchaseResult> => {
        purchaseCalls++;
        return { success: true, productId };
      },
    }));

    const first = await purchaseStarterPack();
    expect(first.success).toBe(true);
    expect(first.reward).toEqual({
      amber: STARTER_PACK_GRANTS.amber,
      hints: STARTER_PACK_GRANTS.hints,
    });
    expect(await hasEntitlement(ENTITLEMENTS.STARTER_PACK)).toBe(true);
    expect(purchaseCalls).toBe(1);

    // Second attempt is blocked BEFORE billing — no reward, no second charge.
    const second = await purchaseStarterPack();
    expect(second.success).toBe(false);
    expect(second.alreadyOwned).toBe(true);
    expect(second.reward).toBeUndefined();
    expect(purchaseCalls).toBe(1);
  });

  it('grants nothing on cancellation or failure', async () => {
    setBillingProvider(fakeProvider({
      purchase: async (productId) => ({ success: false, productId, cancelled: true }),
    }));
    const cancelled = await purchaseStarterPack();
    expect(cancelled.success).toBe(false);
    expect(cancelled.cancelled).toBe(true);
    expect(await hasEntitlement(ENTITLEMENTS.STARTER_PACK)).toBe(false);

    setBillingProvider(fakeProvider({
      purchase: async (productId) => ({ success: false, productId, error: 'billing_unavailable' }),
    }));
    const failed = await purchaseStarterPack();
    expect(failed.success).toBe(false);
    expect(failed.error).toBe('billing_unavailable');
    expect(await hasEntitlement(ENTITLEMENTS.STARTER_PACK)).toBe(false);
  });

  it('buying the starter pack does NOT consume the amber first-purchase double', async () => {
    setBillingProvider(fakeProvider());
    const starter = await purchaseStarterPack();
    expect(starter.success).toBe(true);
    expect(await hasMadeAmberPurchase()).toBe(false);

    const amber = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
    expect(amber.firstPurchaseDoubled).toBe(true);
  });
});
