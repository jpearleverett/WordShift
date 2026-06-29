import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PRODUCT_IDS,
  CONSUMABLE_PRODUCTS,
  consumableReward,
  entitlementsForProduct,
  purchaseConsumable,
  setBillingProvider,
  BillingProvider,
  PurchaseResult,
} from '../services/iap';
import {
  ENTITLEMENTS,
  loadEntitlements,
  getGrantedEntitlements,
  clearEntitlements,
} from '../services/entitlements';
import { AMBER_PACK_GRANTS, HINT_PACK_GRANTS } from '../constants/gameBalance';

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
