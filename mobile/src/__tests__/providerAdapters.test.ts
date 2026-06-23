/**
 * Verifies the RevenueCat / AdMob provider adapters degrade gracefully when the
 * native SDKs are NOT installed (e.g. Expo Go, CI, this test env). Registering
 * them via setBillingProvider / setAdProvider must always be safe: every method
 * resolves to the same "nothing happened" result as the NoOp providers.
 */

// Minimal react-native stub (the adapters only read Platform.OS).
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import { createRevenueCatBillingProvider } from '../services/providers/revenueCatBilling';
import { createAdMobAdProvider } from '../services/providers/googleAdMobAds';

describe('RevenueCat billing adapter (SDK absent)', () => {
  it('stays inert with no configured key', async () => {
    const p = createRevenueCatBillingProvider();
    await p.initialize();
    expect(p.getName()).toBe('RevenueCat');
    expect(p.isReady()).toBe(false);
    expect(await p.getProducts(['com.wordshift.patron_key'])).toEqual([]);
    expect(await p.restorePurchases()).toEqual({ entitlements: [] });
  });

  it('fails purchases cleanly when the native module is missing', async () => {
    // A key IS configured, so init proceeds to load the (absent) SDK and bails.
    const p = createRevenueCatBillingProvider({ iosKey: 'appl_fake_key' });
    await p.initialize();
    expect(p.isReady()).toBe(false);
    const result = await p.purchase('com.wordshift.patron_key');
    expect(result.success).toBe(false);
    expect(result.error).toBe('billing_unavailable');
  });
});

describe('AdMob ad adapter (SDK absent)', () => {
  it('stays inert with no configured ad unit ids', async () => {
    const a = createAdMobAdProvider();
    await a.initialize();
    expect(a.getName()).toBe('Google AdMob');
    expect(a.isReady()).toBe(false);
    expect(await a.showRewarded('victory_double')).toEqual({
      completed: false,
      reason: 'no_provider',
    });
    expect(await a.showInterstitial()).toBe(false);
    // ATT / consent must never throw even when nothing is wired.
    await expect(a.requestATTIfNeeded()).resolves.toBeUndefined();
    await expect(a.requestConsentIfNeeded()).resolves.toBeUndefined();
  });

  it('fails ad calls cleanly when the native module is missing', async () => {
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1', rewardedId: 'ca-x/2' });
    await a.initialize();
    expect(a.isReady()).toBe(false);
    expect(await a.showRewarded('quest_bonus')).toEqual({
      completed: false,
      reason: 'no_provider',
    });
    expect(await a.showInterstitial()).toBe(false);
  });
});
