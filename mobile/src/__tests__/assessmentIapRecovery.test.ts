// Keep the same durable disk while replacing every service/module cache, as a
// process restart does. No event logger timers may outlive an old registry.
const mockNativeStorage = require('./helpers/mockAsyncStorage').createMockAsyncStorage();
jest.mock('@react-native-async-storage/async-storage', () => mockNativeStorage);
jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn() }));

test.each([false, true])('a restart before a lagging receipt arrives never recredits checkout (settled=%s)', async settledBeforeRestart => {
  await mockNativeStorage.default.clear();
  jest.resetModules();
  const firstSession = await import('../services/iap');
  const { AMBER_PACK_GRANTS, FIRST_PURCHASE_AMBER_MULTIPLIER } = await import('../constants/gameBalance');
  const purchasedAt = new Date(2026, 8, 16, 12).getTime();
  const clock = jest.spyOn(Date, 'now').mockReturnValue(purchasedAt + 6 * 60_000);
  try {
    await firstSession.initializeStorePurchaseHistory([]);
    firstSession.setBillingProvider({
      initialize: async () => {},
      getProducts: async () => [],
      purchase: async () => ({ success: true, transactionId: 'GPA.original-order', purchasedAt }),
      restorePurchases: async () => ({ entitlements: [] }),
      isReady: () => true,
      getName: () => 'Restart test',
    });
    const checkout = await firstSession.purchaseConsumable(firstSession.PRODUCT_IDS.AMBER_SMALL);
    expect(checkout.success).toBe(true);
    if (settledBeforeRestart) await firstSession.settleConsumableGrant(checkout.grantId!);
    // CustomerInfo has not reported its different receipt-history ID yet.
    const before = JSON.parse(await mockNativeStorage.default.getItem('wordshift_applied_iap_grants') ?? '[]');
    expect(before).not.toContain('rc.late-receipt');

    jest.resetModules();
    const secondSession = await import('../services/iap');
    const { getAmberBalance } = await import('../services/amberCurrency');
    // The real bootstrap settles durable intents before starting the SDK.
    for (const grant of await secondSession.reconcilePendingConsumableGrants()) {
      await secondSession.settleConsumableGrant(grant.grantId);
    }
    const expected = AMBER_PACK_GRANTS.small * FIRST_PURCHASE_AMBER_MULTIPLIER;
    expect(await getAmberBalance()).toBe(expected);
    const receipts = [{ transactionId: 'rc.late-receipt', productId: secondSession.PRODUCT_IDS.AMBER_SMALL, purchasedAt }];
    await secondSession.initializeStorePurchaseHistory(receipts);
    await secondSession.reconcileStorePurchaseHistory(receipts);
    await secondSession.reconcileStorePurchaseHistory(receipts);
    expect(await getAmberBalance()).toBe(expected);
    const applied = JSON.parse(await mockNativeStorage.default.getItem('wordshift_applied_iap_grants') ?? '[]');
    expect(applied).toEqual(expect.arrayContaining(['GPA.original-order', 'rc.late-receipt']));
  } finally {
    clock.mockRestore();
  }
});
