/**
 * Real-money season premium: a consumable that opens THIS season's premium
 * track through the crash-safe paid-grant ledger. A confirmed payment is never
 * lost (a month that ended before settlement pays its amber price instead) and
 * never sold twice.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  PRODUCT_IDS,
  consumableReward,
  entitlementsForProduct,
  initializeStorePurchaseHistory,
  purchaseSeasonPremium,
  reconcileStorePurchaseHistory,
  setBillingProvider,
  settleConsumableGrant,
  BillingProvider,
  PurchaseResult,
} from '../services/iap';
import { ENTITLEMENTS, clearEntitlements, grantEntitlements, loadEntitlements } from '../services/entitlements';
import { clearSeasonPass, getSeasonPassView, getSeasonIdForTime, invalidateSeasonPassCache } from '../services/seasonPass';
import { getAmberBalance, invalidateProgressCache } from '../services/amberCurrency';
import { SEASON_PASS_PREMIUM_AMBER_COST } from '../constants/gameBalance';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);
jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn() }));

const purchase = jest.fn(async (productId: string): Promise<PurchaseResult> => ({
  success: true, productId, transactionId: `tx-${purchase.mock.calls.length}`, purchasedAt: Date.now(),
}));

function provider(): BillingProvider {
  return {
    initialize: async () => {},
    getProducts: async () => [],
    purchase: (productId: string) => purchase(productId),
    restorePurchases: async () => ({ entitlements: [] }),
    isReady: () => true,
    getName: () => 'Fake',
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  invalidateProgressCache();
  invalidateSeasonPassCache();
  await clearSeasonPass();
  await clearEntitlements();
  await loadEntitlements();
  purchase.mockClear();
  setBillingProvider(provider());
});

test('the season product is a consumable whose fallback is the amber price', () => {
  expect(consumableReward(PRODUCT_IDS.SEASON_PREMIUM)).toEqual({ kind: 'season_premium', amount: SEASON_PASS_PREMIUM_AMBER_COST });
});

test('a confirmed purchase opens this season once, and a second one is refused before the store', async () => {
  const before = await getAmberBalance();
  const first = await purchaseSeasonPremium(0);
  expect(first.success).toBe(true);
  const credit = await settleConsumableGrant(first.grantId!);
  expect(credit.seasonOutcome).toBe('unlocked');
  expect(await getAmberBalance()).toBe(before);

  const view = await getSeasonPassView(0);
  expect(view.premiumUnlocked).toBe(true);
  expect(view.canBuyPremium).toBe(false);

  // Replaying the settlement cannot apply it twice.
  const again = await settleConsumableGrant(first.grantId!);
  expect(again.applied).toBe(false);

  const second = await purchaseSeasonPremium(0);
  expect(second).toMatchObject({ success: false, alreadyOwned: true });
  expect(purchase).toHaveBeenCalledTimes(1);
});

test('a Supporter already has the track, so the store is never opened', async () => {
  await grantEntitlements([ENTITLEMENTS.SUPPORTER]);
  const result = await purchaseSeasonPremium(0);
  expect(result).toMatchObject({ success: false, alreadyOwned: true });
  expect(purchase).not.toHaveBeenCalled();
});

test('a payment recovered after its month ended pays the amber price, exactly once', async () => {
  await initializeStorePurchaseHistory([]);
  const lastMonth = new Date();
  lastMonth.setDate(1);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  expect(getSeasonIdForTime(lastMonth.getTime())).not.toBe(getSeasonIdForTime(Date.now()));

  const before = await getAmberBalance();
  const receipt = { transactionId: 'late-1', productId: PRODUCT_IDS.SEASON_PREMIUM, purchasedAt: lastMonth.getTime() };
  await reconcileStorePurchaseHistory([receipt]);
  await reconcileStorePurchaseHistory([receipt]);

  expect(await getAmberBalance()).toBe(before + SEASON_PASS_PREMIUM_AMBER_COST);
  expect((await getSeasonPassView(0)).premiumUnlocked).toBe(false);
});

test("the Keeper's Edition maps to its own entitlement", () => {
  expect(entitlementsForProduct(PRODUCT_IDS.KEEPERS_EDITION)).toEqual([ENTITLEMENTS.KEEPERS_EDITION]);
  expect(consumableReward(PRODUCT_IDS.KEEPERS_EDITION)).toBeUndefined();
});
