import NativeStorage from '@react-native-async-storage/async-storage';
import {
  BillingProvider, PRODUCT_IDS, PurchaseResult, setBillingProvider,
  purchaseProduct, purchaseConsumable, purchaseStarterPack, restorePurchases,
  initializeStorePurchaseHistory, reconcileStorePurchaseHistory,
  reconcilePendingConsumableGrants, settleConsumableGrant, StorePurchaseTransaction, subscribeBillingChanges,
  RECEIPT_MATCH_WINDOW_MS,
} from '../services/iap';
import {
  ENTITLEMENTS, clearEntitlements, grantEntitlements, hasEntitlement,
  hasEntitlementSync, invalidateEntitlementsCache, isAdFree, isAdFreeSync,
} from '../services/entitlements';
import { getAmberBalance, invalidateProgressCache } from '../services/amberCurrency';
import { getHintBalance, invalidateHintsCache } from '../services/hints';
import { setGameAlertListener, GameAlertRequest } from '../services/gameAlert';
import { AMBER_PACK_GRANTS, FIRST_PURCHASE_AMBER_MULTIPLIER, HINT_PACK_GRANTS, STARTER_PACK_GRANTS } from '../constants/gameBalance';

jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());
const read = (NativeStorage.getItem as jest.Mock).getMockImplementation()!;
const write = (NativeStorage.setItem as jest.Mock).getMockImplementation()!;
const tick = () => new Promise<void>(resolve => setImmediate(resolve));
let alerts: GameAlertRequest[] = [];
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => { resolve = res; });
  return { promise, resolve };
}
function install(purchase: (productId: string) => Promise<PurchaseResult>) {
  const provider: BillingProvider = {
    initialize: async () => {}, getProducts: async () => [],
    purchase: jest.fn(purchase), restorePurchases: jest.fn(async () => ({ entitlements: [] })),
    isReady: () => true, getName: () => 'Test',
  };
  setBillingProvider(provider);
  return provider;
}
function receipt(transactionId: string, productId = PRODUCT_IDS.AMBER_SMALL as string, purchasedAt = 100): StorePurchaseTransaction {
  return { transactionId, productId, purchasedAt };
}
async function settleAll() {
  for (const grant of await reconcilePendingConsumableGrants()) await settleConsumableGrant(grant.grantId);
}
beforeEach(async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(read);
  (NativeStorage.setItem as jest.Mock).mockImplementation(write);
  await NativeStorage.clear();
  await clearEntitlements();
  invalidateProgressCache(); invalidateHintsCache();
  alerts = [];
  setGameAlertListener(alert => alerts.push(alert));
});
afterEach(() => { setGameAlertListener(null); });

test('two presses, a different product, and restore share one synchronous checkout owner', async () => {
  const paid = deferred<PurchaseResult>();
  const provider = install(() => paid.promise);
  const first = purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
  expect(await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL)).toMatchObject({ success: false, error: 'purchase_in_progress' });
  expect(await purchaseProduct(PRODUCT_IDS.PATRON_KEY)).toMatchObject({ success: false, error: 'purchase_in_progress' });
  expect(await purchaseStarterPack()).toMatchObject({ success: false, error: 'purchase_in_progress' });
  expect(await restorePurchases()).toMatchObject({ error: 'purchase_in_progress' });
  paid.resolve({ success: true, transactionId: 'checkout-1' });
  expect(await first).toMatchObject({ success: true });
  await settleAll();
  expect(provider.purchase).toHaveBeenCalledTimes(1);
  expect(provider.restorePurchases).not.toHaveBeenCalled();
  expect(await getAmberBalance()).toBe(AMBER_PACK_GRANTS.small * FIRST_PURCHASE_AMBER_MULTIPLIER);
});

test.each([{ cancelled: true }, { pending: true, error: 'payment_pending' }])('uncompleted checkout grants nothing and releases its owner: %j', async outcome => {
  const provider = install(async () => ({ success: false, ...outcome }));
  expect(await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL)).toMatchObject(outcome);
  expect(await reconcilePendingConsumableGrants()).toEqual([]);
  expect(await getAmberBalance()).toBe(0);
  await purchaseProduct(PRODUCT_IDS.PATRON_KEY);
  expect(provider.purchase).toHaveBeenCalledTimes(2);
});

test('a paid entitlement waits for durable retry without reopening checkout or publishing stale ownership', async () => {
  const provider = install(async () => ({ success: true, transactionId: 'patron-1' }));
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (key === 'wordshift_entitlements') throw new Error('full disk');
    await write(key, value);
  });
  let finished = false;
  const purchase = purchaseProduct(PRODUCT_IDS.PATRON_KEY).then(value => { finished = true; return value; });
  await tick();
  expect(finished).toBe(false);
  expect(hasEntitlementSync(ENTITLEMENTS.PATRON)).toBe(false);
  expect(alerts[0].title).toBe('Your purchase is waiting');
  expect(await purchaseProduct(PRODUCT_IDS.PATRON_KEY)).toMatchObject({ error: 'purchase_in_progress' });
  (NativeStorage.setItem as jest.Mock).mockImplementation(write);
  alerts[0].buttons[0].onPress?.();
  expect(await purchase).toMatchObject({ success: true });
  invalidateEntitlementsCache();
  expect(await hasEntitlement(ENTITLEMENTS.PATRON)).toBe(true);
  expect(provider.purchase).toHaveBeenCalledTimes(1);
});

test('standalone failed entitlement write rejects and does not leak an owned cache', async () => {
  (NativeStorage.setItem as jest.Mock).mockRejectedValue(new Error('full disk'));
  await expect(grantEntitlements([ENTITLEMENTS.PATRON])).rejects.toThrow('full disk');
  expect(hasEntitlementSync(ENTITLEMENTS.PATRON)).toBe(false);
});

test('Supporter-only ownership is ad-free in both async and synchronous checks', async () => {
  await grantEntitlements([ENTITLEMENTS.SUPPORTER]);
  expect(await isAdFree()).toBe(true);
  expect(isAdFreeSync()).toBe(true);
});

test('old spent receipts become the baseline; only new confirmed transactions are credited once', async () => {
  const old = receipt('already-spent');
  await initializeStorePurchaseHistory([old]);
  const recent = receipt('approved-while-closed', PRODUCT_IDS.AMBER_SMALL, 200);
  await Promise.all([
    reconcileStorePurchaseHistory([old, recent]),
    reconcileStorePurchaseHistory([old, recent]),
  ]);
  expect(await getAmberBalance()).toBe(AMBER_PACK_GRANTS.small);
  invalidateProgressCache(); invalidateEntitlementsCache();
  await initializeStorePurchaseHistory([old, recent]);
  await reconcileStorePurchaseHistory([old, recent]);
  expect(await getAmberBalance()).toBe(AMBER_PACK_GRANTS.small);
  expect(await reconcilePendingConsumableGrants()).toEqual([]);
});

// On Google Play the checkout result names a purchase by its Play ORDER id
// while the receipt history (customerInfo) names the same purchase by
// RevenueCat's transaction id, so these recovery tests deliberately use
// DIFFERENT strings on the two surfaces, linked through linkedTransactionIds.
test('receipt arriving before purchase promise keeps original doubled reward and settles once', async () => {
  await initializeStorePurchaseHistory([]);
  const paid = deferred<PurchaseResult>();
  install(() => paid.promise);
  const checkout = purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
  const callback = reconcileStorePurchaseHistory([receipt('rc-receipt-1')]);
  await tick();
  expect(await getAmberBalance()).toBe(0);
  paid.resolve({ success: true, transactionId: 'GPA.order-1', linkedTransactionIds: ['rc-receipt-1'] });
  const result = await checkout;
  await callback;
  expect(result.firstPurchaseDoubled).toBe(true);
  expect(result.grantId).toBe('GPA.order-1');
  expect((await settleConsumableGrant(result.grantId!)).applied).toBe(false);
  expect(await getAmberBalance()).toBe(result.reward!.amount);
  // Both names of the purchase are now applied, so neither can pay again.
  expect(JSON.parse(await NativeStorage.getItem('wordshift_applied_iap_grants') ?? '[]')).toEqual(
    expect.arrayContaining(['GPA.order-1', 'rc-receipt-1']));
  await reconcileStorePurchaseHistory([receipt('rc-receipt-1')]);
  expect(await getAmberBalance()).toBe(result.reward!.amount);
});

test('a settled checkout is not re-credited by its receipt under the other id, in-session or on relaunch', async () => {
  await initializeStorePurchaseHistory([]);
  install(async () => ({ success: true, transactionId: 'GPA.order-2', linkedTransactionIds: ['rc-receipt-2'] }));
  const result = await purchaseConsumable(PRODUCT_IDS.HINTS_SMALL);
  const startingHints = (await getHintBalance()) - 0;
  await settleConsumableGrant(result.grantId!);
  const credited = await getHintBalance();
  expect(credited).toBe(startingHints + HINT_PACK_GRANTS.small);
  // The SDK listener fires with the receipt-history id...
  await reconcileStorePurchaseHistory([receipt('rc-receipt-2', PRODUCT_IDS.HINTS_SMALL, Date.now())]);
  expect(await getHintBalance()).toBe(credited);
  // ...and so does the next launch's history reconcile, after a cache drop.
  invalidateHintsCache(); invalidateEntitlementsCache();
  await initializeStorePurchaseHistory([receipt('rc-receipt-2', PRODUCT_IDS.HINTS_SMALL, Date.now())]);
  await reconcileStorePurchaseHistory([receipt('rc-receipt-2', PRODUCT_IDS.HINTS_SMALL, Date.now())]);
  expect(await getHintBalance()).toBe(credited);
  expect(await reconcilePendingConsumableGrants()).toEqual([]);
});

test('without a linked id, a receipt for the same product at the same moment is still covered', async () => {
  await initializeStorePurchaseHistory([]);
  // A lagging customer info gave the checkout nothing to link. The receipt then
  // arrives seconds later under RevenueCat's id, dated at the purchase.
  const purchasedAt = Date.now();
  install(async () => ({ success: true, transactionId: 'GPA.order-3', purchasedAt }));
  const result = await purchaseConsumable(PRODUCT_IDS.AMBER_MEDIUM);
  await reconcileStorePurchaseHistory([receipt('rc-receipt-3', PRODUCT_IDS.AMBER_MEDIUM, purchasedAt)]);
  // Before the caller settles: the pending grant covers it (no second grant).
  expect((await reconcilePendingConsumableGrants()).map(g => g.grantId)).toEqual(['GPA.order-3']);
  await settleConsumableGrant(result.grantId!);
  const credited = await getAmberBalance();
  // After the caller settles: the session's own checkout record covers it.
  await reconcileStorePurchaseHistory([receipt('rc-receipt-3', PRODUCT_IDS.AMBER_MEDIUM, purchasedAt + 5_000)]);
  expect(await getAmberBalance()).toBe(credited);
  // A receipt outside the window is a genuinely different purchase.
  await reconcileStorePurchaseHistory([receipt('rc-receipt-4', PRODUCT_IDS.AMBER_MEDIUM, purchasedAt + RECEIPT_MATCH_WINDOW_MS + 1)]);
  expect(await getAmberBalance()).toBe(credited + AMBER_PACK_GRANTS.medium);
});

test('all consumable products and both starter halves recover with one first-amber bonus', async () => {
  await initializeStorePurchaseHistory([]);
  const startingHints = await getHintBalance();
  const receipts = [PRODUCT_IDS.AMBER_SMALL, PRODUCT_IDS.AMBER_MEDIUM, PRODUCT_IDS.AMBER_LARGE,
    PRODUCT_IDS.HINTS_SMALL, PRODUCT_IDS.HINTS_LARGE, PRODUCT_IDS.STARTER_PACK]
    .map((id, i) => receipt(`receipt-${i}`, id, i));
  await reconcileStorePurchaseHistory(receipts);
  expect(await getAmberBalance()).toBe(AMBER_PACK_GRANTS.small * FIRST_PURCHASE_AMBER_MULTIPLIER +
    AMBER_PACK_GRANTS.medium + AMBER_PACK_GRANTS.large + STARTER_PACK_GRANTS.amber);
  expect(await getHintBalance()).toBe(startingHints + HINT_PACK_GRANTS.small + HINT_PACK_GRANTS.large + STARTER_PACK_GRANTS.hints);
  expect(await hasEntitlement(ENTITLEMENTS.STARTER_PACK)).toBe(true);
  expect(JSON.parse(await NativeStorage.getItem('wordshift_applied_iap_grants') ?? '[]')).toHaveLength(7);
});

test('starter receipt recovery completes bundle interrupted between two credits', async () => {
  await initializeStorePurchaseHistory([]);
  const startingHints = await getHintBalance();
  install(async () => ({ success: true, transactionId: 'GPA.starter', linkedTransactionIds: ['rc-starter'] }));
  const purchase = await purchaseStarterPack();
  await settleConsumableGrant(purchase.grantIds!.amber!);
  await reconcileStorePurchaseHistory([receipt('rc-starter', PRODUCT_IDS.STARTER_PACK)]);
  expect(await getAmberBalance()).toBe(STARTER_PACK_GRANTS.amber);
  expect(await getHintBalance()).toBe(startingHints + STARTER_PACK_GRANTS.hints);
  expect(await reconcilePendingConsumableGrants()).toEqual([]);
});

test('recovered receipt survives interrupted credit and retry without second charge or grant', async () => {
  await initializeStorePurchaseHistory([]);
  const provider = install(async () => ({ success: false }));
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    if (key === 'wordshift_home_progress') throw new Error('full disk');
    await write(key, value);
  });
  const recovery = reconcileStorePurchaseHistory([receipt('waiting-paid')]);
  await tick();
  expect(alerts).toHaveLength(1);
  expect(await NativeStorage.getItem('wordshift_storage_commit')).not.toBeNull();
  (NativeStorage.setItem as jest.Mock).mockImplementation(write);
  alerts[0].buttons[0].onPress?.();
  await recovery;
  await reconcileStorePurchaseHistory([receipt('waiting-paid')]);
  expect(await getAmberBalance()).toBe(AMBER_PACK_GRANTS.small * FIRST_PURCHASE_AMBER_MULTIPLIER);
  expect(provider.purchase).not.toHaveBeenCalled();
});

test('restore reports provider failure and preserves existing ownership', async () => {
  await grantEntitlements([ENTITLEMENTS.PATRON]);
  const provider = install(async () => ({ success: false }));
  provider.restorePurchases = async () => ({ entitlements: [], error: 'restore_failed' });
  expect(await restorePurchases()).toMatchObject({ entitlements: [ENTITLEMENTS.PATRON], error: 'restore_failed' });
  expect(await hasEntitlement(ENTITLEMENTS.PATRON)).toBe(true);
});

test('a first-bonus read failure after payment keeps the same verified checkout for retry', async () => {
  let failing = true;
  const provider = install(async () => {
    invalidateEntitlementsCache();
    (NativeStorage.getItem as jest.Mock).mockImplementation(async (key: string) => {
      if (failing && key === 'wordshift_entitlements') throw new Error('read failure');
      return read(key);
    });
    return { success: true, transactionId: 'paid-before-read-failure' };
  });
  const checkout = purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
  await tick();
  expect(alerts).toHaveLength(1);
  expect(await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL)).toMatchObject({ error: 'purchase_in_progress' });
  failing = false;
  alerts[0].buttons[0].onPress?.();
  const result = await checkout;
  expect(result.firstPurchaseDoubled).toBe(true);
  await settleAll();
  expect(provider.purchase).toHaveBeenCalledTimes(1);
  expect(await getAmberBalance()).toBe(AMBER_PACK_GRANTS.small * FIRST_PURCHASE_AMBER_MULTIPLIER);
});

test('an actual Reset All cannot resurrect a legacy first-ever purchase bonus', async () => {
  await NativeStorage.setItem('wordshift_entitlements', JSON.stringify({ granted: {}, amberPurchaseMade: true }));
  invalidateEntitlementsCache();
  await hasEntitlement(ENTITLEMENTS.PATRON); // Boot warms and migrates legacy purchase history.
  const { commitFullLocalReset } = await import('../services/resetStorage');
  await commitFullLocalReset();
  install(async () => ({ success: true, transactionId: 'after-story-reset' }));
  const result = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
  expect(result.firstPurchaseDoubled).toBeFalsy();
  expect(result.reward?.amount).toBe(AMBER_PACK_GRANTS.small);
});


test('starter completion is announced only after both durable currency grants', async () => {
  install(async () => ({ success: true, transactionId: 'starter-event' }));
  const events: string[] = [];
  const unsubscribe = subscribeBillingChanges(event => { if (event.productId) events.push(event.productId); });
  try {
    const result = await purchaseStarterPack();
    await settleConsumableGrant(result.grantIds!.amber!);
    expect(events).toEqual([]);
    await settleConsumableGrant(result.grantIds!.hints!);
    expect(events).toEqual([PRODUCT_IDS.STARTER_PACK]);
    expect(await NativeStorage.getItem('wordshift_storage_commit')).toBeNull();
  } finally { unsubscribe(); }
});


test('a verified known purchase grants its own item when customer info lists only older purchases', async () => {
  install(async () => ({ success: true, entitlements: [ENTITLEMENTS.ADFREE], transactionId: 'patron-with-old-info' }));
  const result = await purchaseProduct(PRODUCT_IDS.PATRON_KEY);
  expect(result.success).toBe(true);
  expect(await hasEntitlement(ENTITLEMENTS.PATRON)).toBe(true);
  expect(await hasEntitlement(ENTITLEMENTS.ADFREE)).toBe(true);
  invalidateEntitlementsCache();
  expect(await hasEntitlement(ENTITLEMENTS.PATRON)).toBe(true);
});

test.each([false, true])('store-clock coverage survives a fast device clock and a delayed receipt (settled=%s)', async settled => {
  const storeTime = Date.now() - 6 * 60_000;
  await initializeStorePurchaseHistory([]);
  install(async () => ({ success: true, transactionId: 'fast-clock-order', purchasedAt: storeTime }));
  const purchase = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
  if (settled) await settleConsumableGrant(purchase.grantId!);
  // The store-time match lives on disk even if the process dies before the
  // history listener. Neither a pending nor an already settled grant is doubled.
  expect(JSON.parse((await NativeStorage.getItem('wordshift_iap_checkout_receipts'))!)).toEqual([
    expect.objectContaining({ grantId: 'fast-clock-order', purchasedAt: storeTime }),
  ]);
  await initializeStorePurchaseHistory([receipt('fast-clock-rc', PRODUCT_IDS.AMBER_SMALL, storeTime)]);
  await reconcileStorePurchaseHistory([receipt('fast-clock-rc', PRODUCT_IDS.AMBER_SMALL, storeTime)]);
  await settleConsumableGrant(purchase.grantId!);
  expect(await getAmberBalance()).toBe(purchase.reward!.amount);
  await reconcileStorePurchaseHistory([receipt('fast-clock-rc', PRODUCT_IDS.AMBER_SMALL, storeTime)]);
  expect(await getAmberBalance()).toBe(purchase.reward!.amount);
});

test('a checkout already linked to one receipt cannot swallow a second near-time purchase', async () => {
  const storeTime = Date.now() - 6 * 60_000;
  await initializeStorePurchaseHistory([]);
  install(async () => ({ success: true, transactionId: 'one-order', purchasedAt: storeTime, linkedTransactionIds: ['one-rc'] }));
  const purchase = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
  await settleConsumableGrant(purchase.grantId!);
  await reconcileStorePurchaseHistory([receipt('two-rc', PRODUCT_IDS.AMBER_SMALL, storeTime + 500)]);
  expect(await getAmberBalance()).toBe(purchase.reward!.amount + AMBER_PACK_GRANTS.small);
});

test('a malformed checkout-receipt record is quarantined instead of trapping purchase and recovery in retry', async () => {
  await initializeStorePurchaseHistory([]);
  const garbage = '{"not":"an array"';
  await NativeStorage.setItem('wordshift_iap_checkout_receipts', garbage);
  const provider = install(async () => ({ success: true, transactionId: 'after-corruption', purchasedAt: Date.now() }));
  const purchase = await purchaseConsumable(PRODUCT_IDS.AMBER_SMALL);
  expect(purchase.success).toBe(true);
  expect(alerts).toHaveLength(0);
  await settleConsumableGrant(purchase.grantId!);
  expect(await getAmberBalance()).toBe(purchase.reward!.amount);
  expect(await NativeStorage.getItem('wordshift_iap_checkout_receipts_quarantine')).toBe(garbage);
  expect(JSON.parse((await NativeStorage.getItem('wordshift_iap_checkout_receipts'))!)).toEqual([
    expect.objectContaining({ grantId: 'after-corruption' }),
  ]);
  // Recovery of the same purchase is still deduped by the applied-grant set.
  await reconcileStorePurchaseHistory([receipt('after-corruption', PRODUCT_IDS.AMBER_SMALL, Date.now())]);
  expect(await getAmberBalance()).toBe(purchase.reward!.amount);
  expect(provider.purchase).toHaveBeenCalledTimes(1);
});

test('a malformed receipt record found during recovery does not block a genuine recovered purchase', async () => {
  await initializeStorePurchaseHistory([]);
  await NativeStorage.setItem('wordshift_iap_checkout_receipts', '[{"grantId":7}]');
  await reconcileStorePurchaseHistory([receipt('recovered-after-corruption')]);
  expect(alerts).toHaveLength(0);
  expect(await getAmberBalance()).toBe(AMBER_PACK_GRANTS.small * FIRST_PURCHASE_AMBER_MULTIPLIER);
  expect(await NativeStorage.getItem('wordshift_iap_checkout_receipts_quarantine')).toBe('[{"grantId":7}]');
});
