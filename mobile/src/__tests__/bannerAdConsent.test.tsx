/** Native banner creation itself requests an ad, so consent must gate its mount. */
import React from 'react';

let mockUnsubscribe: (() => void) | undefined;
const mockStoreChanged = jest.fn();
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useSyncExternalStore: (subscribe: (listener: () => void) => () => void, snapshot: () => boolean) => {
    mockUnsubscribe?.();
    mockUnsubscribe = subscribe(mockStoreChanged);
    return snapshot();
  },
}));
jest.mock('react-native', () => ({
  View: 'View', Text: 'Text', Platform: { OS: 'android' },
  StyleSheet: { create: (styles: unknown) => styles },
}));
jest.mock('react-native-google-mobile-ads', () => ({
  BannerAd: 'NativeBanner',
  BannerAdSize: { ANCHORED_ADAPTIVE_BANNER: 'adaptive' },
  TestIds: { BANNER: 'test/banner' },
}));
jest.mock('../theme/fonts', () => ({ PIXEL_FONT_BOLD: 'bold' }));
jest.mock('../services/entitlements', () => ({ isAdFreeSync: () => false }));
jest.mock('expo-constants', () => ({ default: { expoConfig: { extra: { adsUseTestIds: true } } } }));

import { BannerAd } from '../components/monetization/BannerAd';
import { setAdProvider } from '../services/ads';
import type { AdProvider } from '../services/ads';

function includesNativeBanner(node: React.ReactNode): boolean {
  if (!React.isValidElement<{ children?: React.ReactNode }>(node)) return false;
  if ((node.type as unknown) === 'NativeBanner') return true;
  return React.Children.toArray(node.props.children).some(includesNativeBanner);
}

function providerWithReadiness() {
  let ready = false;
  const listeners = new Set<() => void>();
  const provider: AdProvider = {
    initialize: async () => {},
    loadRewarded: async () => {},
    showRewarded: async () => ({ completed: false }),
    showInterstitial: async () => false,
    requestATTIfNeeded: async () => {},
    requestConsentIfNeeded: async () => {},
    getName: () => 'Test SDK',
    isReady: () => ready,
    subscribeReady: (listener) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
  return {
    provider,
    changeReady(value: boolean) {
      ready = value;
      listeners.forEach((listener) => listener());
    },
  };
}

afterEach(() => {
  mockUnsubscribe?.();
  mockUnsubscribe = undefined;
  mockStoreChanged.mockClear();
  setAdProvider(providerWithReadiness().provider);
});

it('keeps the native banner unmounted while consent is pending/disallowed, then reacts to readiness and revocation', async () => {
  const { provider, changeReady } = providerWithReadiness();
  setAdProvider(provider);
  expect(includesNativeBanner(await BannerAd({ phase: 0 }))).toBe(false);
  changeReady(true);
  expect(mockStoreChanged).toHaveBeenCalledTimes(1);
  expect(includesNativeBanner(await BannerAd({ phase: 0 }))).toBe(true);
  changeReady(false);
  expect(mockStoreChanged).toHaveBeenCalledTimes(2);
  expect(includesNativeBanner(await BannerAd({ phase: 0 }))).toBe(false);
});

it('keeps narrative and onboarding suppression even when consent permits ads', () => {
  const { provider, changeReady } = providerWithReadiness();
  setAdProvider(provider);
  changeReady(true);
  expect(BannerAd({ phase: 4 })).toBeNull();
  expect(BannerAd({ phase: 0, onboarding: true })).toBeNull();
});
