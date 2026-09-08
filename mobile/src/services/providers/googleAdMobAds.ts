/**
 * Google AdMob ad provider (drop-in adapter).
 *
 * Implements the `AdProvider` interface from `ads.ts` on top of
 * `react-native-google-mobile-ads`. It is INERT until:
 *   1. `react-native-google-mobile-ads` is installed (native module — needs a
 *      dev/production build, not Expo Go), and
 *   2. ad unit ids are provided (via `config` or `app.json` → `expo.extra`:
 *      `admobInterstitialIdIos/Android`, `admobRewardedIdIos/Android`).
 *
 * Until then every method degrades like the NoOp provider (`isReady()` false,
 * no ad shown, reward not granted), so `setAdProvider()` is always safe. The
 * native module is loaded with a guarded dynamic `require` inside `initialize()`.
 *
 * NOTE: the AdMob *app* ids go in the `react-native-google-mobile-ads` config
 * plugin in app.json (Android configured; iOS sample ID until its release setup); the *ad unit* ids are read
 * here at runtime from `expo.extra`. The package is pinned in package.json —
 * check invertase release notes before bumping across Expo SDK majors.
 *
 * Wiring (after install + adding ids):
 *   import { createAdMobAdProvider } from './src/services/providers/googleAdMobAds';
 *   setAdProvider(createAdMobAdProvider());
 *   // ...the existing `await initAds()` in the App bootstrap initializes it.
 */

import { Platform } from 'react-native';
import type { AdProvider, RewardedPlacement, RewardedResult } from '../ads';

export interface AdMobConfig {
  /** Interstitial ad unit id for this platform (ca-app-pub-…/…). */
  interstitialId?: string;
  /** Rewarded ad unit id for this platform. */
  rewardedId?: string;
}

/** Bound network loads and presentation startup, never time an ad already on screen. */
const OP_TIMEOUT_MS = 12000;

function readExtra(): Record<string, any> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Defer this dependency to preserve native availability and import-cycle boundaries.
    const Constants = require('expo-constants').default ?? require('expo-constants');
    return Constants?.expoConfig?.extra ?? Constants?.manifest?.extra ?? {};
  } catch {
    return {};
  }
}

/**
 * Whether to serve Google's TEST ad units instead of the live production units.
 * True in dev builds (__DEV__) OR when `extra.adsUseTestIds` is set — so an
 * internal-testing (release) build can opt into test ads too. Serving LIVE ads
 * to yourself on a test build and clicking them is an AdMob policy violation
 * that can get the whole account limited; this gate is the guard against it.
 * Flip `adsUseTestIds` to false in app.json ONLY for the production build.
 */
function shouldUseTestAds(): boolean {
  if (typeof __DEV__ !== 'undefined' && __DEV__) return true;
  return readExtra().adsUseTestIds === true;
}

function idsFromExtra(mod?: any): AdMobConfig {
  const extra = readExtra();
  // The iOS SDK has a sample app ID so an unfinished native configuration can
  // launch safely. Ads remain off until the owner supplies iOS unit IDs.
  if (Platform.OS === 'ios' && !extra.admobInterstitialIdIos && !extra.admobRewardedIdIos) return {};

  // Test mode: use the SDK's official TestIds (falling back to Google's public
  // sample unit ids if the SDK export is unavailable in this context).
  if (shouldUseTestAds()) {
    const TestIds = mod?.TestIds;
    return {
      interstitialId: TestIds?.INTERSTITIAL ?? 'ca-app-pub-3940256099942544/1033173712',
      rewardedId: TestIds?.REWARDED ?? 'ca-app-pub-3940256099942544/5224354917',
    };
  }
  return Platform.OS === 'ios'
    ? { interstitialId: extra.admobInterstitialIdIos, rewardedId: extra.admobRewardedIdIos }
    : { interstitialId: extra.admobInterstitialIdAndroid, rewardedId: extra.admobRewardedIdAndroid };
}

// LITERAL requires (not eval): Metro only bundles the native module's JS when it
// can see a static require('literal'). A dynamic/eval require is invisible to
// Metro, so the SDK never shipped in release builds and ads/consent silently
// no-op'd on device. The try/catch still degrades to NoOp under Jest / Expo Go.
function loadAdsModule(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}

function loadATTModule(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-tracking-transparency');
  } catch {
    return null;
  }
}

export function createAdMobAdProvider(config: AdMobConfig = {}): AdProvider {
  let mod: any | null = null;
  let ready = false;
  let interstitialId: string | undefined;
  let rewardedId: string | undefined;

  type AdKind = 'interstitial' | 'rewarded';
  const slots: Record<AdKind, { loaded: any | null; loading: Promise<void> | null }> = {
    interstitial: { loaded: null, loading: null },
    rewarded: { loaded: null, loading: null },
  };
  const readinessListeners = new Set<() => void>();
  const cancelLoads = new Set<() => void>();
  let consentAllowsAds = false;
  let consentGeneration = 0;
  let initialized = false;
  let sdkInitialized = false;
  let sdkInitialization: Promise<boolean> | null = null;
  let consentPromise: Promise<void> | null = null;
  let privacyOptionsPromise: Promise<void> | null = null;

  function setReady(value: boolean): void {
    if (ready === value) return;
    ready = value;
    readinessListeners.forEach((listener) => listener());
  }

  /** Invalidate ads created under the previous choices, including late loads. */
  function suspendAds(): void {
    consentGeneration += 1;
    consentAllowsAds = false;
    setReady(false);
    cancelLoads.forEach((cancel) => cancel());
    slots.interstitial.loaded = null;
    slots.rewarded.loaded = null;
    slots.interstitial.loading = null;
    slots.rewarded.loading = null;
  }

  /** Build and preload one ad; cancel cleanly if the consent choices change. */
  function preload(kind: AdKind): Promise<void> {
    const slot = slots[kind];
    const unitId = kind === 'interstitial' ? interstitialId : rewardedId;
    if (!ready || !consentAllowsAds || !mod || !unitId || slot.loaded) return Promise.resolve();
    if (slot.loading) return slot.loading;
    const generation = consentGeneration;
    const load = new Promise<void>((resolve) => {
      let settled = false;
      const unsubscribers: (() => void)[] = [];
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        cancelLoads.delete(finish);
        unsubscribers.forEach((unsubscribe) => unsubscribe());
        resolve();
      };
      const timer = setTimeout(finish, OP_TIMEOUT_MS);
      cancelLoads.add(finish);
      try {
        const factory = kind === 'interstitial' ? mod.InterstitialAd : mod.RewardedAd;
        const loadedEvent = kind === 'interstitial' ? mod.AdEventType.LOADED : mod.RewardedAdEventType.LOADED;
        const ad = factory.createForAdRequest(unitId);
        unsubscribers.push(ad.addAdEventListener(loadedEvent, () => {
          if (!settled && ready && consentAllowsAds && generation === consentGeneration) slot.loaded = ad;
          finish();
        }));
        unsubscribers.push(ad.addAdEventListener(mod.AdEventType.ERROR, finish));
        ad.load();
      } catch {
        finish();
      }
    });
    const pending = load.finally(() => {
      if (slot.loading === pending) slot.loading = null;
    });
    slot.loading = pending;
    return pending;
  }

  /**
   * show() only starts native presentation; its promise is not the ad's lifetime.
   * Once OPENED arrives, the player may watch for any length of time. Finish on
   * CLOSED/ERROR and always detach listeners, including on startup timeout.
   */
  function present(ad: any, kind: AdKind): Promise<{ closed: boolean; earned: boolean }> {
    return new Promise((resolve) => {
      let settled = false;
      let earned = false;
      const unsubscribers: (() => void)[] = [];
      const finish = (closed: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(startupTimer);
        unsubscribers.forEach((unsubscribe) => unsubscribe());
        resolve({ closed, earned: closed && earned });
      };
      const startupTimer = setTimeout(() => finish(false), OP_TIMEOUT_MS);
      try {
        unsubscribers.push(ad.addAdEventListener(mod.AdEventType.OPENED, () => {
          if (!settled) clearTimeout(startupTimer);
        }));
        if (kind === 'rewarded') {
          unsubscribers.push(ad.addAdEventListener(mod.RewardedAdEventType.EARNED_REWARD, () => {
            if (!settled) earned = true;
          }));
        }
        unsubscribers.push(ad.addAdEventListener(mod.AdEventType.CLOSED, () => finish(true)));
        unsubscribers.push(ad.addAdEventListener(mod.AdEventType.ERROR, () => finish(false)));
        // Native show() can reject asynchronously as well as throw immediately.
        void Promise.resolve(ad.show()).catch(() => finish(false));
      } catch {
        finish(false);
      }
    });
  }

  /** SDK initialization is shared, but only the current consent generation may serve ads. */
  async function startAds(generation: number): Promise<void> {
    if (!consentAllowsAds || generation !== consentGeneration || !mod) return;
    if (!sdkInitialization) {
      sdkInitialization = (async () => {
        try {
          const mobileAds = mod.default ?? mod;
          await mobileAds().initialize();
          sdkInitialized = true;
          return true;
        } catch (error) {
          console.warn('[Ads] AdMob initialize failed:', error);
          return false;
        }
      })();
    }
    const success = sdkInitialized || await sdkInitialization;
    if (!success) sdkInitialization = null; // A later privacy-options retry can recover.
    if (!success || !consentAllowsAds || generation !== consentGeneration) return;
    setReady(true);
    void preload('interstitial');
    void preload('rewarded');
  }

  /** UMP's explicit signal is authoritative, including after a consent-form error. */
  async function refreshConsentPermission(generation: number): Promise<void> {
    let permitted = false;
    try {
      const info = await mod?.AdsConsent?.getConsentInfo?.();
      permitted = info?.canRequestAds === true;
    } catch {
      // Unknown consent is not permission to initialize the SDK or request ads.
    }
    if (generation !== consentGeneration) return;
    consentAllowsAds = permitted;
    if (permitted) void startAds(generation);
    else setReady(false);
  }

  /** Single-flight UMP update; never infer non-personalized permission from an error. */
  function resolveConsent(): Promise<void> {
    if (!consentPromise) {
      consentPromise = (async () => {
        const AdsConsent = mod?.AdsConsent;
        const generation = consentGeneration;
        if (!AdsConsent) return;
        try {
          if (typeof AdsConsent.gatherConsent === 'function') {
            await AdsConsent.gatherConsent();
          } else {
            await AdsConsent.requestInfoUpdate();
            if (typeof AdsConsent.loadAndShowConsentFormIfRequired === 'function') {
              await AdsConsent.loadAndShowConsentFormIfRequired();
            }
          }
        } catch {
          // UMP may still permit requests using a previous session's consent.
          // Read that permission explicitly; an error alone never authorizes ads.
        }
        await refreshConsentPermission(generation);
      })();
    }
    return consentPromise;
  }

  return {
    getName(): string {
      return 'Google AdMob';
    },

    isReady(): boolean {
      return ready;
    },

    subscribeReady(listener: () => void): () => void {
      readinessListeners.add(listener);
      return () => { readinessListeners.delete(listener); };
    },

    async initialize(): Promise<void> {
      if (initialized) return;
      initialized = true;
      const loaded = loadAdsModule();
      if (!loaded) return; // SDK unavailable in Expo Go / web / Jest → inert.
      const ids = idsFromExtra(loaded);
      interstitialId = config.interstitialId ?? ids.interstitialId;
      rewardedId = config.rewardedId ?? ids.rewardedId;
      if (!interstitialId && !rewardedId) return;
      // Keep the full namespace: consent/ad classes are named exports, while
      // mobileAds() is the default export.
      mod = loaded;
      // The game boot never waits on the consent form or ad network. Every ad
      // format stays disabled until UMP permits requests and SDK init finishes.
      void resolveConsent();
    },

    async requestATTIfNeeded(): Promise<void> {
      if (Platform.OS !== 'ios') return;
      const att = loadATTModule();
      if (!att) return;
      try {
        await att.requestTrackingPermissionsAsync();
      } catch {
        /* non-fatal */
      }
    },

    async requestConsentIfNeeded(): Promise<void> {
      if (!mod) return;
      // Single-flight with the init-time gate: consent normally resolved during
      // initialize(), so this (called from ensureAdConsent at first ad exposure)
      // is a cheap await on the same settled promise.
      await resolveConsent();
    },

    async privacyOptionsRequired(): Promise<boolean> {
      if (!mod?.AdsConsent || typeof mod.AdsConsent.getConsentInfo !== 'function') return false;
      try {
        // Wait for the consent flow first: on a fresh session getConsentInfo
        // reports UNKNOWN until requestInfoUpdate has run, which would hide the
        // (EEA-required) Privacy Options row from Settings on early opens.
        await resolveConsent();
        const info = await mod.AdsConsent.getConsentInfo();
        // AdsConsentPrivacyOptionsRequirementStatus.REQUIRED === 'REQUIRED'
        return info?.privacyOptionsRequirementStatus === 'REQUIRED';
      } catch {
        return false;
      }
    },

    showPrivacyOptions(): Promise<void> {
      if (!mod?.AdsConsent || typeof mod.AdsConsent.showPrivacyOptionsForm !== 'function') return Promise.resolve();
      if (!privacyOptionsPromise) {
        privacyOptionsPromise = (async () => {
          await resolveConsent();
          // Unmount banners immediately and discard every preloaded ad. A form
          // error may retain previous permission, but that must be checked again.
          suspendAds();
          const generation = consentGeneration;
          try {
            await mod.AdsConsent.showPrivacyOptionsForm();
          } catch {
            /* Keep gameplay usable if the CMP cannot present its form. */
          }
          await refreshConsentPermission(generation);
        })().finally(() => { privacyOptionsPromise = null; });
      }
      return privacyOptionsPromise;
    },

    async loadRewarded(_placement: RewardedPlacement): Promise<void> {
      if (!ready || slots.rewarded.loaded) return;
      await preload('rewarded');
    },

    async showRewarded(_placement: RewardedPlacement): Promise<RewardedResult> {
      if (!ready || !mod) return { completed: false, reason: 'no_provider' };
      if (!slots.rewarded.loaded) {
        await preload('rewarded');
        if (!ready || !slots.rewarded.loaded) return { completed: false, reason: 'not_ready' };
      }
      const ad = slots.rewarded.loaded;
      slots.rewarded.loaded = null;
      const result = await present(ad, 'rewarded');
      // Preload only if the current consent choices still permit requests.
      void preload('rewarded');
      return result.closed
        ? { completed: result.earned, reason: result.earned ? undefined : 'dismissed' }
        : { completed: false, reason: 'error' };
    },

    async showInterstitial(): Promise<boolean> {
      if (!ready || !mod) return false;
      if (!slots.interstitial.loaded) {
        await preload('interstitial');
        if (!ready || !slots.interstitial.loaded) return false;
      }
      const ad = slots.interstitial.loaded;
      slots.interstitial.loaded = null;
      const result = await present(ad, 'interstitial');
      void preload('interstitial');
      return result.closed;
    },
  };
}
