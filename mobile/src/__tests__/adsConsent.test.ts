/**
 * Ad consent compliance (Google EU User Consent Policy):
 *  - the AdMob adapter resolves UMP consent BEFORE the SDK initializes and
 *    before any interstitial/rewarded preload fires (no ad request may leave
 *    the device pre-consent);
 *  - initialize() never awaits the preloads, so the boot gate that awaits
 *    initAds() cannot block on ad-network round-trips;
 *  - the privacy-options seam (privacyOptionsRequired / showPrivacyOptions)
 *    is implemented via the UMP privacy-options form and delegates through
 *    ads.ts, with safe NoOp defaults.
 */

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

// Full mock of the native SDK. Records every consent/init/load call (in order)
// on __state.calls so the tests can assert consent-first ordering.
jest.mock('react-native-google-mobile-ads', () => {
  const state = {
    calls: [] as string[],
    /** When true, ad loads never fire LOADED (simulates a slow/dead network). */
    hangLoads: false,
    privacyStatus: 'REQUIRED',
    ads: [] as any[],
  };
  const consentInfo = () => ({
    status: 'OBTAINED',
    canRequestAds: true,
    privacyOptionsRequirementStatus: state.privacyStatus,
    isConsentFormAvailable: true,
  });
  const makeAd = (label: string, loadedEvent: string) => {
    const ad = {
      listeners: {} as Record<string, () => void>,
      addAdEventListener(type: string, cb: () => void) {
        this.listeners[type] = cb;
        return () => {};
      },
      load() {
        state.calls.push(`${label}.load`);
        if (!state.hangLoads) this.listeners[loadedEvent]?.();
      },
      show() {},
    };
    state.ads.push(ad);
    return ad;
  };
  return {
    __state: state,
    default: () => ({
      initialize: async () => {
        state.calls.push('sdk.initialize');
      },
    }),
    AdEventType: { LOADED: 'loaded', CLOSED: 'closed', ERROR: 'error' },
    RewardedAdEventType: { LOADED: 'rewarded_loaded', EARNED_REWARD: 'earned' },
    InterstitialAd: {
      createForAdRequest: () => makeAd('interstitial', 'loaded'),
    },
    RewardedAd: {
      createForAdRequest: () => makeAd('rewarded', 'rewarded_loaded'),
    },
    AdsConsent: {
      gatherConsent: async () => {
        state.calls.push('consent.gather');
        return consentInfo();
      },
      getConsentInfo: async () => consentInfo(),
      showPrivacyOptionsForm: async () => {
        state.calls.push('consent.showPrivacyOptionsForm');
        return consentInfo();
      },
    },
  };
});

import { createAdMobAdProvider } from '../services/providers/googleAdMobAds';
import {
  AdProvider,
  RewardedResult,
  setAdProvider,
  privacyOptionsRequired,
  showPrivacyOptions,
} from '../services/ads';

const admob = jest.requireMock('react-native-google-mobile-ads');

/** Drain the microtask chain kicked off in the background by initialize(). */
const flushBackgroundChain = () => new Promise((resolve) => setImmediate(resolve));

function bareProvider(overrides: Partial<AdProvider> = {}): AdProvider {
  return {
    initialize: async () => {},
    loadRewarded: async () => {},
    showRewarded: async (): Promise<RewardedResult> => ({ completed: false, reason: 'no_provider' }),
    showInterstitial: async () => false,
    requestATTIfNeeded: async () => {},
    requestConsentIfNeeded: async () => {},
    isReady: () => false,
    getName: () => 'Bare',
    ...overrides,
  };
}

afterEach(() => {
  // Settle any deliberately-hung preloads so their 12s guard timers clear.
  admob.__state.ads.forEach((ad: any) => {
    ad.listeners['loaded']?.();
    ad.listeners['rewarded_loaded']?.();
  });
  admob.__state.ads.length = 0;
  admob.__state.calls.length = 0;
  admob.__state.hangLoads = false;
  admob.__state.privacyStatus = 'REQUIRED';
  setAdProvider(bareProvider());
});

describe('AdMob adapter — UMP consent ordering', () => {
  it('resolves consent BEFORE SDK init and before any ad preload', async () => {
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1', rewardedId: 'ca-x/2' });
    await a.initialize();
    await flushBackgroundChain();

    const calls: string[] = admob.__state.calls;
    expect(calls[0]).toBe('consent.gather');
    expect(calls.indexOf('consent.gather')).toBeLessThan(calls.indexOf('sdk.initialize'));
    expect(calls.indexOf('sdk.initialize')).toBeLessThan(calls.indexOf('interstitial.load'));
    expect(calls.indexOf('sdk.initialize')).toBeLessThan(calls.indexOf('rewarded.load'));
    expect(a.isReady()).toBe(true);
  });

  it('gathers consent exactly once even when ensureAdConsent later re-requests', async () => {
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1', rewardedId: 'ca-x/2' });
    await a.initialize();
    await flushBackgroundChain();
    await a.requestConsentIfNeeded();
    await a.requestConsentIfNeeded();
    const gathers = admob.__state.calls.filter((c: string) => c === 'consent.gather');
    expect(gathers).toHaveLength(1);
  });
});

describe('AdMob adapter — non-blocking initialize()', () => {
  it('initialize() resolves even when preloads never complete', async () => {
    admob.__state.hangLoads = true;
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1', rewardedId: 'ca-x/2' });
    // If initialize() awaited the preloads this would hang for the 12s
    // per-preload guard and blow the jest timeout.
    await a.initialize();
    await flushBackgroundChain();

    expect(a.isReady()).toBe(true); // SDK init finished in the background
    // The preloads WERE fired... just not awaited.
    expect(admob.__state.calls).toContain('interstitial.load');
    expect(admob.__state.calls).toContain('rewarded.load');
  });
});

describe('AdMob adapter — privacy options (UMP)', () => {
  it('reports the UMP privacy-options requirement status', async () => {
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1' });
    await a.initialize();
    await flushBackgroundChain();

    expect(await a.privacyOptionsRequired!()).toBe(true);
    admob.__state.privacyStatus = 'NOT_REQUIRED';
    expect(await a.privacyOptionsRequired!()).toBe(false);
  });

  it('shows the UMP privacy-options form', async () => {
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1' });
    await a.initialize();
    await flushBackgroundChain();

    await a.showPrivacyOptions!();
    expect(admob.__state.calls).toContain('consent.showPrivacyOptionsForm');
  });
});

describe('ads.ts privacy-options seam', () => {
  it('defaults to "not required" / no-op for providers without the methods', async () => {
    setAdProvider(bareProvider()); // no privacyOptionsRequired/showPrivacyOptions
    expect(await privacyOptionsRequired()).toBe(false);
    await expect(showPrivacyOptions()).resolves.toBeUndefined();
  });

  it('delegates to the registered provider', async () => {
    const show = jest.fn(async () => {});
    setAdProvider(
      bareProvider({
        privacyOptionsRequired: async () => true,
        showPrivacyOptions: show,
      })
    );
    expect(await privacyOptionsRequired()).toBe(true);
    await showPrivacyOptions();
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('swallows provider errors (never required, never throws)', async () => {
    setAdProvider(
      bareProvider({
        privacyOptionsRequired: async () => {
          throw new Error('ump exploded');
        },
        showPrivacyOptions: async () => {
          throw new Error('ump exploded');
        },
      })
    );
    expect(await privacyOptionsRequired()).toBe(false);
    await expect(showPrivacyOptions()).resolves.toBeUndefined();
  });
});
