/**
 * Verifies the RevenueCat / AdMob provider adapters degrade gracefully when the
 * native SDKs are NOT installed (e.g. Expo Go, CI, this test env). Registering
 * them via setBillingProvider / setAdProvider must always be safe: every method
 * resolves to the same "nothing happened" result as the NoOp providers.
 */

// Minimal react-native stub for the adapters and web share fallback.
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Share: {
    share: jest.fn(),
    sharedAction: 'sharedAction',
  },
}));

jest.mock('../services/shareResults', () => ({
  generateShareText: jest.fn().mockReturnValue('share text'),
  recordShareSuccess: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
}));

import { Share } from 'react-native';
import { createRevenueCatBillingProvider } from '../services/providers/revenueCatBilling';
import { createAdMobAdProvider } from '../services/providers/googleAdMobAds';
import { createAdMobAdProvider as createWebAdProvider } from '../services/providers/googleAdMobAds.web';
import { createRevenueCatBillingProvider as createWebBillingProvider } from '../services/providers/revenueCatBilling.web';
import {
  initShareImage as initWebShareImage,
  isImageShareAvailable as isWebImageShareAvailable,
  setShareImageProvider as setWebShareImageProvider,
  shareResultImage as shareWebResult,
} from '../services/shareImage.web';
import { recordShareSuccess } from '../services/shareResults';
import { logEvent } from '../services/eventLogger';
import type { ShareableResult } from '../services/shareResults';

const SHARE_RESULT: ShareableResult = {
  stars: 3,
  difficulty: 'MEDIUM',
  hintsUsed: 0,
  invalidAttempts: 0,
  moveCount: 3,
};

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
    // Privacy-options seam degrades safely too: no CMP → no entry point.
    expect(await a.privacyOptionsRequired!()).toBe(false);
    await expect(a.showPrivacyOptions!()).resolves.toBeUndefined();
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

describe('web provider adapters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('AdMob web provider is inert and never grants rewards', async () => {
    const provider = createWebAdProvider();
    await provider.initialize();
    expect(provider.getName()).toBe('Google AdMob (Web NoOp)');
    expect(provider.isReady()).toBe(false);
    expect(await provider.showInterstitial()).toBe(false);
    expect(await provider.showRewarded('daily_amber')).toEqual({
      completed: false,
      reason: 'no_provider',
    });
  });

  test('RevenueCat web provider fails purchases cleanly', async () => {
    const provider = createWebBillingProvider();
    await provider.initialize();
    expect(provider.getName()).toBe('RevenueCat (Web NoOp)');
    expect(provider.isReady()).toBe(false);
    expect(await provider.getProducts(['com.wordshift.amber_small'])).toEqual([]);
    expect(await provider.purchase('com.wordshift.amber_small')).toEqual({
      success: false,
      productId: 'com.wordshift.amber_small',
      error: 'billing_unavailable',
    });
    expect(await provider.restorePurchases()).toEqual({ entitlements: [] });
  });

  test('web image sharing stays text-only', () => {
    initWebShareImage();
    setWebShareImageProvider({
      capture: jest.fn(),
      shareFile: jest.fn(),
    });
    expect(isWebImageShareAvailable()).toBe(false);
  });

  test('undefined web share resolution records and logs completion', async () => {
    (Share.share as jest.Mock).mockResolvedValueOnce(undefined);
    await expect(shareWebResult({}, SHARE_RESULT)).resolves.toBe(true);
    expect(Share.share).toHaveBeenLastCalledWith({ message: 'share text' });
    expect(recordShareSuccess).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith({
      type: 'share_completed',
      data: { phase: 0, kind: 'text' },
    });
  });

  test('native shared action records and logs completion', async () => {
    (Share.share as jest.Mock).mockResolvedValueOnce({ action: Share.sharedAction });
    await expect(shareWebResult({}, { ...SHARE_RESULT, phase: 3 })).resolves.toBe(true);
    expect(recordShareSuccess).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith({
      type: 'share_completed',
      data: { phase: 3, kind: 'text' },
    });
  });

  test('native dismissed action remains incomplete', async () => {
    (Share.share as jest.Mock).mockResolvedValueOnce({ action: 'dismissedAction' });
    await expect(shareWebResult({}, SHARE_RESULT)).resolves.toBe(false);
    expect(recordShareSuccess).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
  });

  test('rejected web share returns false without recording completion', async () => {
    (Share.share as jest.Mock).mockRejectedValueOnce(new Error('Share cancelled'));
    await expect(shareWebResult({}, SHARE_RESULT)).resolves.toBe(false);
    expect(recordShareSuccess).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
  });
});
