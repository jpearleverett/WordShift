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
import { AdProvider, RewardedPlacement, RewardedResult } from '../ads';

export interface AdMobConfig {
  /** Interstitial ad unit id for this platform (ca-app-pub-…/…). */
  interstitialId?: string;
  /** Rewarded ad unit id for this platform. */
  rewardedId?: string;
}

/** A guard so a load/show can never hang the caller forever. */
const OP_TIMEOUT_MS = 12000;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const t = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);
    p.then((v) => {
      if (!settled) {
        settled = true;
        clearTimeout(t);
        resolve(v);
      }
    }).catch(() => {
      if (!settled) {
        settled = true;
        clearTimeout(t);
        resolve(fallback);
      }
    });
  });
}

function readExtra(): Record<string, any> {
  try {
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

  let loadedInterstitial: any | null = null;
  let loadedRewarded: any | null = null;

  /** Single-flight UMP consent gate; fulfills once consent is resolved. */
  let consentPromise: Promise<void> | null = null;

  /**
   * Gather UMP consent (Google EU User Consent Policy). Resolves once consent
   * is obtained / not required / errored ("error-continue" — ads then serve
   * non-personalized). MUST complete before any ad request is made; single-
   * flight so init + ensureAdConsent() share one flow and the form never
   * double-presents.
   */
  function resolveConsent(): Promise<void> {
    if (!consentPromise) {
      consentPromise = (async () => {
        const AdsConsent = mod?.AdsConsent;
        if (!AdsConsent) return;
        try {
          if (typeof AdsConsent.gatherConsent === 'function') {
            // One-shot helper: requestInfoUpdate + load/show form if required.
            await AdsConsent.gatherConsent();
          } else {
            await AdsConsent.requestInfoUpdate();
            if (typeof AdsConsent.loadAndShowConsentFormIfRequired === 'function') {
              await AdsConsent.loadAndShowConsentFormIfRequired();
            }
          }
        } catch {
          /* error-continue — ads still serve non-personalized */
        }
      })();
    }
    return consentPromise;
  }

  /** Build + preload an interstitial; resolves when ready (or times out). */
  function preloadInterstitial(): Promise<void> {
    if (!mod || !interstitialId) return Promise.resolve();
    return withTimeout(
      new Promise<void>((resolve) => {
        try {
          const ad = mod.InterstitialAd.createForAdRequest(interstitialId);
          const unsub = ad.addAdEventListener(mod.AdEventType.LOADED, () => {
            loadedInterstitial = ad;
            unsub?.();
            resolve();
          });
          ad.addAdEventListener(mod.AdEventType.ERROR, () => resolve());
          ad.load();
        } catch {
          resolve();
        }
      }),
      OP_TIMEOUT_MS,
      undefined as unknown as void
    );
  }

  /** Build + preload a rewarded ad; resolves when ready (or times out). */
  function preloadRewarded(): Promise<void> {
    if (!mod || !rewardedId) return Promise.resolve();
    return withTimeout(
      new Promise<void>((resolve) => {
        try {
          const ad = mod.RewardedAd.createForAdRequest(rewardedId);
          const unsub = ad.addAdEventListener(mod.RewardedAdEventType.LOADED, () => {
            loadedRewarded = ad;
            unsub?.();
            resolve();
          });
          ad.addAdEventListener(mod.AdEventType.ERROR, () => resolve());
          ad.load();
        } catch {
          resolve();
        }
      }),
      OP_TIMEOUT_MS,
      undefined as unknown as void
    );
  }

  return {
    getName(): string {
      return 'Google AdMob';
    },

    isReady(): boolean {
      return ready;
    },

    async initialize(): Promise<void> {
      // Load the SDK first so idsFromExtra can read its official TestIds when
      // test mode is active (dev build or extra.adsUseTestIds).
      const loaded = loadAdsModule();
      if (!loaded) return; // SDK not installed → inert (Expo Go / Jest)

      const ids = idsFromExtra(loaded);
      // Explicit config wins over extra/test resolution.
      interstitialId = config.interstitialId ?? ids.interstitialId;
      rewardedId = config.rewardedId ?? ids.rewardedId;
      if (!interstitialId && !rewardedId) return; // nothing configured → inert
      // Keep the FULL module namespace: InterstitialAd / RewardedAd / AdEventType /
      // RewardedAdEventType / AdsConsent are NAMED exports, while the default export
      // is the mobileAds() initializer. Conflating them makes every ad request throw
      // silently (ads never load, 0 requests reach AdMob).
      mod = loaded;
      // EU User Consent Policy: UMP consent must be RESOLVED (obtained /
      // not-required / error-continue) before ANY ad request leaves the device,
      // so the consent gate runs strictly before SDK init + preloads. The whole
      // chain is fired in the background — never awaited — because this runs in
      // the cold-start boot gate: initialize() resolves immediately instead of
      // blocking the app on a consent form or ad-network round-trips. `ready`
      // flips once the SDK is up; the show paths already treat !ready as
      // "no ad this time".
      void resolveConsent()
        .then(async () => {
          const mobileAds = loaded.default ?? loaded;
          await mobileAds().initialize();
          ready = true;
          // Warm one of each so the first show is instant — fired, not awaited
          // (each preload keeps its own retry/timeout guard).
          preloadInterstitial();
          preloadRewarded();
        })
        .catch((error) => {
          console.warn('[Ads] AdMob initialize failed:', error);
          ready = false;
        });
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

    async showPrivacyOptions(): Promise<void> {
      if (!mod?.AdsConsent || typeof mod.AdsConsent.showPrivacyOptionsForm !== 'function') return;
      try {
        // The form needs up-to-date consent info; the init-time gate provides it.
        await resolveConsent();
        await mod.AdsConsent.showPrivacyOptionsForm();
      } catch {
        /* non-fatal */
      }
    },

    async loadRewarded(_placement: RewardedPlacement): Promise<void> {
      if (!ready || loadedRewarded) return;
      await preloadRewarded();
    },

    async showRewarded(_placement: RewardedPlacement): Promise<RewardedResult> {
      if (!ready || !mod) return { completed: false, reason: 'no_provider' };
      if (!loadedRewarded) {
        await preloadRewarded();
        if (!loadedRewarded) return { completed: false, reason: 'not_ready' };
      }
      const ad = loadedRewarded;
      loadedRewarded = null;
      const result = await withTimeout(
        new Promise<RewardedResult>((resolve) => {
          let earned = false;
          try {
            ad.addAdEventListener(mod.RewardedAdEventType.EARNED_REWARD, () => {
              earned = true;
            });
            ad.addAdEventListener(mod.AdEventType.CLOSED, () => {
              resolve({ completed: earned, reason: earned ? undefined : 'dismissed' });
            });
            ad.addAdEventListener(mod.AdEventType.ERROR, () => {
              resolve({ completed: false, reason: 'error' });
            });
            ad.show();
          } catch {
            resolve({ completed: false, reason: 'error' });
          }
        }),
        OP_TIMEOUT_MS,
        { completed: false, reason: 'error' }
      );
      // Preload the next one for a snappy subsequent tap.
      preloadRewarded();
      return result;
    },

    async showInterstitial(): Promise<boolean> {
      if (!ready || !mod) return false;
      if (!loadedInterstitial) {
        await preloadInterstitial();
        if (!loadedInterstitial) return false;
      }
      const ad = loadedInterstitial;
      loadedInterstitial = null;
      const shown = await withTimeout(
        new Promise<boolean>((resolve) => {
          try {
            ad.addAdEventListener(mod.AdEventType.CLOSED, () => resolve(true));
            ad.addAdEventListener(mod.AdEventType.ERROR, () => resolve(false));
            ad.show();
          } catch {
            resolve(false);
          }
        }),
        OP_TIMEOUT_MS,
        false
      );
      preloadInterstitial();
      return shown;
    },
  };
}
