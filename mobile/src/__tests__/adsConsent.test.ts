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
    canRequestAds: true as boolean | undefined,
    gatherError: false,
    infoError: false,
    privacyError: false,
    gatherWait: null as Promise<void> | null,
    privacyWait: null as Promise<void> | null,
    initializeWait: null as Promise<void> | null,
    initializeError: false,
    showBehavior: 'auto' as 'auto' | 'manual' | 'reject' | 'throw',
    ads: [] as any[],
  };
  const consentInfo = () => ({
    status: 'OBTAINED',
    canRequestAds: state.canRequestAds,
    privacyOptionsRequirementStatus: state.privacyStatus,
    isConsentFormAvailable: true,
  });
  const makeAd = (label: string, loadedEvent: string) => {
    const ad = {
      listeners: {} as Record<string, () => void>,
      addAdEventListener(type: string, cb: () => void) {
        this.listeners[type] = cb;
        return () => { delete this.listeners[type]; };
      },
      load() {
        state.calls.push(`${label}.load`);
        if (!state.hangLoads) this.listeners[loadedEvent]?.();
      },
      show() {
        state.calls.push(`${label}.show`);
        if (state.showBehavior === 'throw') throw new Error('show failed synchronously');
        if (state.showBehavior === 'reject') return Promise.reject(new Error('native presentation failed'));
        if (state.showBehavior === 'manual') return Promise.resolve();
        this.listeners.opened?.();
        if (label === 'rewarded') this.listeners.earned?.();
        this.listeners.closed?.();
      },
    };
    state.ads.push(ad);
    return ad;
  };
  return {
    __state: state,
    default: () => ({
      initialize: async () => {
        state.calls.push('sdk.initialize');
        await state.initializeWait;
        if (state.initializeError) throw new Error('SDK initialization unavailable');
      },
    }),
    AdEventType: { LOADED: 'loaded', OPENED: 'opened', CLOSED: 'closed', ERROR: 'error' },
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
        await state.gatherWait;
        if (state.gatherError) throw new Error('consent network unavailable');
        return consentInfo();
      },
      getConsentInfo: async () => {
        if (state.infoError) throw new Error('consent info unavailable');
        return consentInfo();
      },
      showPrivacyOptionsForm: async () => {
        state.calls.push('consent.showPrivacyOptionsForm');
        await state.privacyWait;
        if (state.privacyError) throw new Error('privacy form unavailable');
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
  isAdsReady,
  subscribeAdsReady,
} from '../services/ads';

const admob = jest.requireMock('react-native-google-mobile-ads');

/** Drain the microtask chain kicked off in the background by initialize(). */
const flushBackgroundChain = () => new Promise((resolve) => setImmediate(resolve));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

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
  admob.__state.canRequestAds = true;
  admob.__state.gatherError = false;
  admob.__state.infoError = false;
  admob.__state.privacyError = false;
  admob.__state.gatherWait = null;
  admob.__state.privacyWait = null;
  admob.__state.initializeWait = null;
  admob.__state.initializeError = false;
  admob.__state.showBehavior = 'auto';
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
    await a.initialize();
    const gathers = admob.__state.calls.filter((c: string) => c === 'consent.gather');
    expect(gathers).toHaveLength(1);
    expect(admob.__state.calls.filter((c: string) => c === 'sdk.initialize')).toHaveLength(1);
  });

  it('keeps boot non-blocking and every ad path disabled while the consent form is pending', async () => {
    const consent = deferred();
    admob.__state.gatherWait = consent.promise;
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1', rewardedId: 'ca-x/2' });
    await a.initialize();
    expect(a.isReady()).toBe(false);
    await a.loadRewarded('daily_amber');
    expect((await a.showRewarded('daily_amber')).completed).toBe(false);
    expect(await a.showInterstitial()).toBe(false);
    expect(admob.__state.calls).toEqual(['consent.gather']);
    consent.resolve();
    await flushBackgroundChain();
    expect(a.isReady()).toBe(true);
  });

  it.each([false, undefined])('makes no SDK initialization or ad request when canRequestAds is %s', async (permission) => {
    admob.__state.canRequestAds = permission;
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1', rewardedId: 'ca-x/2' });
    await a.initialize();
    await flushBackgroundChain();
    await a.loadRewarded('daily_amber');
    expect((await a.showRewarded('daily_amber')).completed).toBe(false);
    expect(await a.showInterstitial()).toBe(false);
    expect(a.isReady()).toBe(false);
    expect(admob.__state.calls).toEqual(['consent.gather']);
  });

  it.each([false, true])('after a gather error, follows explicit previous-session permission (%s)', async (permission) => {
    admob.__state.gatherError = true;
    admob.__state.canRequestAds = permission;
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1', rewardedId: 'ca-x/2' });
    await a.initialize();
    await flushBackgroundChain();
    expect(a.isReady()).toBe(permission);
    expect(admob.__state.calls.includes('sdk.initialize')).toBe(permission);
    expect(admob.__state.calls.includes('interstitial.load')).toBe(permission);
    expect(admob.__state.calls.includes('rewarded.load')).toBe(permission);
  });

  it('fails closed when the current consent info cannot be read', async () => {
    admob.__state.infoError = true;
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1' });
    await a.initialize();
    await flushBackgroundChain();
    expect(a.isReady()).toBe(false);
    expect(admob.__state.calls).toEqual(['consent.gather']);
  });

  it('fails closed when the native consent API is absent', async () => {
    const consentApi = admob.AdsConsent;
    admob.AdsConsent = undefined;
    try {
      const a = createAdMobAdProvider({ interstitialId: 'ca-x/1' });
      await a.initialize();
      await flushBackgroundChain();
      expect(a.isReady()).toBe(false);
      expect(admob.__state.calls).toEqual([]);
    } finally {
      admob.AdsConsent = consentApi;
    }
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

  it('keeps ads disabled after SDK initialization fails and can retry after privacy options', async () => {
    const warning = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      admob.__state.initializeError = true;
      const a = createAdMobAdProvider({ interstitialId: 'ca-x/1', rewardedId: 'ca-x/2' });
      await a.initialize();
      await flushBackgroundChain();
      expect(a.isReady()).toBe(false);
      expect(admob.__state.ads).toHaveLength(0);

      admob.__state.initializeError = false;
      await a.showPrivacyOptions!();
      await flushBackgroundChain();
      expect(a.isReady()).toBe(true);
      expect(admob.__state.calls.filter((c: string) => c === 'sdk.initialize')).toHaveLength(2);
      expect(admob.__state.ads).toHaveLength(2);
    } finally {
      warning.mockRestore();
    }
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

  it('suspends readiness during the form and disables every format after revocation', async () => {
    const privacy = deferred();
    admob.__state.privacyWait = privacy.promise;
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1', rewardedId: 'ca-x/2' });
    const states: boolean[] = [];
    const unsubscribe = a.subscribeReady!(() => states.push(a.isReady()));
    await a.initialize();
    await flushBackgroundChain();
    const first = a.showPrivacyOptions!();
    const second = a.showPrivacyOptions!();
    await flushBackgroundChain();
    expect(a.isReady()).toBe(false);
    expect(admob.__state.calls.filter((c: string) => c === 'consent.showPrivacyOptionsForm')).toHaveLength(1);
    admob.__state.canRequestAds = false;
    privacy.resolve();
    await Promise.all([first, second]);
    await a.loadRewarded('daily_amber');
    expect((await a.showRewarded('daily_amber')).completed).toBe(false);
    expect(await a.showInterstitial()).toBe(false);
    expect(admob.__state.calls.filter((c: string) => c.endsWith('.show'))).toEqual([]);
    expect(states).toEqual([true, false]);
    unsubscribe();
  });

  it('cancels pending loads and rejects late callbacks from the previous consent choices', async () => {
    admob.__state.hangLoads = true;
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1', rewardedId: 'ca-x/2' });
    await a.initialize();
    await flushBackgroundChain();
    const lateCallbacks = admob.__state.ads.map((ad: any) => ad.listeners.loaded ?? ad.listeners.rewarded_loaded);
    const showing = a.showRewarded('daily_amber');
    admob.__state.canRequestAds = false;
    await a.showPrivacyOptions!();
    lateCallbacks.forEach((loaded: () => void) => loaded());
    expect((await showing).completed).toBe(false);
    expect(await a.showInterstitial()).toBe(false);
    expect(a.isReady()).toBe(false);
    expect(admob.__state.calls.filter((c: string) => c.endsWith('.show'))).toEqual([]);

    // Grant again: the old callbacks must not resurrect an ad from the old choices.
    admob.__state.canRequestAds = true;
    await a.showPrivacyOptions!();
    await flushBackgroundChain();
    lateCallbacks.forEach((loaded: () => void) => loaded());
    const retry = a.showRewarded('daily_amber');
    expect(admob.__state.calls.filter((c: string) => c.endsWith('.show'))).toEqual([]);
    const newRewarded = admob.__state.ads[3];
    newRewarded.listeners.rewarded_loaded();
    expect((await retry).completed).toBe(true);
  });

  it('does not become ready if SDK initialization finishes after consent was revoked', async () => {
    const initialized = deferred();
    admob.__state.initializeWait = initialized.promise;
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1', rewardedId: 'ca-x/2' });
    await a.initialize();
    await flushBackgroundChain();
    expect(admob.__state.calls).toContain('sdk.initialize');
    admob.__state.canRequestAds = false;
    await a.showPrivacyOptions!();
    initialized.resolve();
    await flushBackgroundChain();
    expect(a.isReady()).toBe(false);
    expect(admob.__state.ads).toHaveLength(0);
  });

  it.each([false, true])('after a privacy-form error, reevaluates current permission (%s)', async (permission) => {
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1' });
    await a.initialize();
    await flushBackgroundChain();
    admob.__state.privacyError = true;
    admob.__state.canRequestAds = permission;
    await a.showPrivacyOptions!();
    await flushBackgroundChain();
    expect(a.isReady()).toBe(permission);
  });
});

describe('ads.ts reactive readiness seam', () => {
  it('notifies mounted consumers at initialization and privacy revocation', async () => {
    const a = createAdMobAdProvider({ interstitialId: 'ca-x/1' });
    setAdProvider(a);
    const states: boolean[] = [];
    const unsubscribe = subscribeAdsReady(() => states.push(isAdsReady()));
    await a.initialize();
    await flushBackgroundChain();
    admob.__state.canRequestAds = false;
    await showPrivacyOptions();
    expect(states).toEqual([true, false]);
    unsubscribe();
  });

  it('unsubscribes from a replaced provider', () => {
    const disconnect = jest.fn();
    setAdProvider(bareProvider({ subscribeReady: () => disconnect }));
    setAdProvider(bareProvider());
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});

it('delays native measurement initialization until the consent-gated SDK initialization', () => {
  const config = require('../../app.json');
  const plugin = config.expo.plugins.find((entry: unknown) => Array.isArray(entry) && entry[0] === 'react-native-google-mobile-ads');
  expect(plugin[1].delayAppMeasurementInit).toBe(true);
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

describe('AdMob adapter — native presentation lifetime', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] });
    admob.__state.showBehavior = 'manual';
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  async function initializedProvider() {
    const provider = createAdMobAdProvider({ interstitialId: 'ca-x/1', rewardedId: 'ca-x/2' });
    await provider.initialize();
    await flushBackgroundChain();
    return provider;
  }

  it('grants a 30-second rewarded ad exactly once after close, never at the old 12-second deadline', async () => {
    const a = await initializedProvider();
    const ad = admob.__state.ads[1];
    const settled = jest.fn();
    const result = a.showRewarded('daily_amber').then(settled);
    const { opened, earned, closed } = ad.listeners;
    opened();
    await jest.advanceTimersByTimeAsync(30000);
    expect(settled).not.toHaveBeenCalled();
    earned();
    earned();
    await jest.advanceTimersByTimeAsync(1000);
    expect(settled).not.toHaveBeenCalled();
    closed();
    await result;
    closed();
    earned();
    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith({ completed: true, reason: undefined });
    expect(Object.keys(ad.listeners)).toEqual([]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not award a dismissed rewarded ad', async () => {
    const a = await initializedProvider();
    const ad = admob.__state.ads[1];
    const result = a.showRewarded('daily_amber');
    ad.listeners.opened();
    await jest.advanceTimersByTimeAsync(30000);
    ad.listeners.closed();
    expect(await result).toEqual({ completed: false, reason: 'dismissed' });
    expect(Object.keys(ad.listeners)).toEqual([]);
  });

  it.each(['rewarded', 'interstitial'] as const)('times out and removes listeners when a %s never opens', async (kind) => {
    const a = await initializedProvider();
    const ad = admob.__state.ads[kind === 'rewarded' ? 1 : 0];
    const result = kind === 'rewarded' ? a.showRewarded('daily_amber') : a.showInterstitial();
    await jest.advanceTimersByTimeAsync(12000);
    expect(await result).toEqual(kind === 'rewarded' ? { completed: false, reason: 'error' } : false);
    expect(Object.keys(ad.listeners)).toEqual([]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it.each([
    ['rewarded', 'reject'], ['rewarded', 'throw'],
    ['interstitial', 'reject'], ['interstitial', 'throw'],
  ] as const)('settles and cleans up when %s show() fails via %s', async (kind, behavior) => {
    const a = await initializedProvider();
    admob.__state.showBehavior = behavior;
    const ad = admob.__state.ads[kind === 'rewarded' ? 1 : 0];
    const result = kind === 'rewarded' ? await a.showRewarded('daily_amber') : await a.showInterstitial();
    expect(result).toEqual(kind === 'rewarded' ? { completed: false, reason: 'error' } : false);
    expect(Object.keys(ad.listeners)).toEqual([]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('waits for a long interstitial to close before reporting that it was shown', async () => {
    const a = await initializedProvider();
    const ad = admob.__state.ads[0];
    const settled = jest.fn();
    const result = a.showInterstitial().then(settled);
    ad.listeners.opened();
    await jest.advanceTimersByTimeAsync(45000);
    expect(settled).not.toHaveBeenCalled();
    ad.listeners.closed();
    await result;
    expect(settled).toHaveBeenCalledTimes(1);
    expect(settled).toHaveBeenCalledWith(true);
    expect(Object.keys(ad.listeners)).toEqual([]);
  });

  it('settles on a visible-ad error and ignores any later close or reward callbacks', async () => {
    const a = await initializedProvider();
    const ad = admob.__state.ads[1];
    const result = a.showRewarded('daily_amber');
    const { opened, earned, closed, error } = ad.listeners;
    opened();
    await jest.advanceTimersByTimeAsync(30000);
    error();
    earned();
    closed();
    expect(await result).toEqual({ completed: false, reason: 'error' });
    expect(Object.keys(ad.listeners)).toEqual([]);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not preload another ad when privacy choices change during a visible ad', async () => {
    const a = await initializedProvider();
    const ad = admob.__state.ads[1];
    const result = a.showRewarded('daily_amber');
    ad.listeners.opened();
    admob.__state.canRequestAds = false;
    await a.showPrivacyOptions!();
    ad.listeners.earned();
    ad.listeners.closed();
    expect(await result).toEqual({ completed: true, reason: undefined });
    expect(a.isReady()).toBe(false);
    expect(admob.__state.ads).toHaveLength(2);
  });
});
