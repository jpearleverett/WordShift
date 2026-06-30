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
 * NOTE (verified June 2026): `react-native-google-mobile-ads` v16.x has reported
 * config-plugin breakage on Expo SDK 54 / RN 0.81 (invertase issue #835). Pin a
 * patched release before building. The AdMob *app* ids go in the config plugin in
 * app.json; the *ad unit* ids are read here at runtime.
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

function idsFromExtra(): AdMobConfig {
  try {
    const Constants = require('expo-constants').default ?? require('expo-constants');
    const extra = Constants?.expoConfig?.extra ?? Constants?.manifest?.extra ?? {};
    return Platform.OS === 'ios'
      ? { interstitialId: extra.admobInterstitialIdIos, rewardedId: extra.admobRewardedIdIos }
      : { interstitialId: extra.admobInterstitialIdAndroid, rewardedId: extra.admobRewardedIdAndroid };
  } catch {
    return {};
  }
}

function loadAdsModule(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    const runtimeRequire = eval('require') as NodeRequire;
    return runtimeRequire('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}

function loadATTModule(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    const runtimeRequire = eval('require') as NodeRequire;
    return runtimeRequire('expo-tracking-transparency');
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
      const ids = {
        interstitialId: config.interstitialId,
        rewardedId: config.rewardedId,
        ...idsFromExtra(),
      };
      // Explicit config wins over extra.
      interstitialId = config.interstitialId ?? ids.interstitialId;
      rewardedId = config.rewardedId ?? ids.rewardedId;
      if (!interstitialId && !rewardedId) return; // nothing configured → inert

      const loaded = loadAdsModule();
      if (!loaded) return; // SDK not installed → inert
      // Keep the FULL module namespace: InterstitialAd / RewardedAd / AdEventType /
      // RewardedAdEventType / AdsConsent are NAMED exports, while the default export
      // is the mobileAds() initializer. Conflating them makes every ad request throw
      // silently (ads never load, 0 requests reach AdMob).
      mod = loaded;
      try {
        const mobileAds = loaded.default ?? loaded;
        await mobileAds().initialize();
        ready = true;
        // NOTE: GDPR/UMP consent + iOS ATT are deliberately NOT requested here.
        // This runs in the cold-start bootstrap, and a consent/tracking dialog
        // before the player has seen a single frame is the classic permission-
        // wall anti-pattern (hurts D1, especially for EEA users). Consent/ATT are
        // deferred to first actual ad exposure via `ensureAdConsent()` in ads.ts,
        // which calls `requestConsentIfNeeded()` / `requestATTIfNeeded()` below.
        // The first preloaded ad may serve non-personalized; subsequent loads are
        // personalized once consent resolves — an acceptable trade for not
        // interrupting the first session.
        //
        // Warm one of each so the first show is instant.
        await Promise.all([preloadInterstitial(), preloadRewarded()]);
      } catch (error) {
        console.warn('[Ads] AdMob initialize failed:', error);
        ready = false;
      }
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
      try {
        const AdsConsent = mod.AdsConsent;
        if (!AdsConsent) return;
        await AdsConsent.requestInfoUpdate();
        if (typeof AdsConsent.loadAndShowConsentFormIfRequired === 'function') {
          await AdsConsent.loadAndShowConsentFormIfRequired();
        }
      } catch {
        /* non-fatal — ads still serve non-personalized */
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
