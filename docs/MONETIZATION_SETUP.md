# WordShift Monetization Setup (drop-in)

> **Status:** ✅ Completed for Android. Both adapters are wired in `App.tsx`, the
> native SDKs are installed, and RevenueCat (`revenueCatAndroidKey`) + AdMob
> (app id in the config plugin, unit ids in `extra`) are configured in
> `app.json`. iOS keys are intentionally left blank. The guide below remains the
> reference for re-doing this or adding iOS.

Like the backend, monetization is **disabled by default** (until wired as below). The app ships and runs
in Expo Go with no purchases and no ads. Two provider adapters are already written
against the `BillingProvider` / `AdProvider` seams in `src/services/iap.ts` and
`src/services/ads.ts`:

- `src/services/providers/revenueCatBilling.ts` — in-app purchases via RevenueCat
- `src/services/providers/googleAdMobAds.ts` — interstitial + rewarded ads via AdMob

Both are **inert until** their native SDK is installed **and** keys/ids are set.
Nothing imports them by default, so the Expo Go build and the test suite are
unaffected until you wire them.

> **Before enabling:** update the privacy policy (linked via
> `mobile/src/constants/links.ts`) to disclose in-app purchases and (for ads)
> advertising + advertising identifier, and fill the App Store / Play data-safety
> forms accordingly.

---

## 1. In-app purchases (RevenueCat)

Products are modeled as one-time **non-consumables** in code
(`iap.ts` → `PRODUCT_IDS`): `com.wordshift.patron_key` → `patron` entitlement,
`com.wordshift.remove_ads` → `adfree` entitlement.

1. Create those products in App Store Connect (Non-Consumable) and Google Play
   Console (In-app product), with the **exact** ids above.
2. In RevenueCat, add an iOS app and an Android app, create **Entitlements named
   `patron` and `adfree`**, attach the matching products, and copy the **public
   SDK keys** (one per platform).
3. Install the SDK (native module — requires a dev/production build):
   ```bash
   cd mobile
   npx expo install react-native-purchases
   ```
4. Put the keys in `mobile/app.json` → `expo.extra`:
   ```jsonc
   "revenueCatIosKey": "appl_xxxxxxxxxxxxxxxx",
   "revenueCatAndroidKey": "goog_xxxxxxxxxxxxxxxx"
   ```
5. Register the provider. In `mobile/App.tsx`, just **before** the bootstrap line
   `await Promise.all([initIAP(), initAds(), initCosmetics()]);`, add:
   ```ts
   import { createRevenueCatBillingProvider } from './src/services/providers/revenueCatBilling';
   setBillingProvider(createRevenueCatBillingProvider());
   ```
   (`setBillingProvider` is exported from `./src/services/iap`. `initIAP()` then
   configures it.)

Test with App Store **Sandbox testers** (iOS) and Play **License testing** (Android).

---

## 2. Ads (Google AdMob)

The ad **policy** (interstitial cadence, rewarded daily cap, Patron suppression,
narrative-beat exemptions) already lives in `ads.ts`; the adapter only serves the
ads.

> ⚠️ **Compatibility (verified June 2026):** `react-native-google-mobile-ads`
> v16.x has reported config-plugin breakage on Expo SDK 54 / RN 0.81
> (invertase issue #835). Pin a patched release before building.

1. In AdMob, create an Android app and an iOS app; copy each **App ID**. Create an
   **Interstitial** and a **Rewarded** ad unit per platform; copy the unit ids.
2. Install (native modules — requires a dev/production build):
   ```bash
   cd mobile
   npx expo install react-native-google-mobile-ads expo-tracking-transparency
   ```
3. In `mobile/app.json`, add the config plugins (AdMob **app** ids go here):
   ```jsonc
   "plugins": [
     // ...existing plugins...
     ["react-native-google-mobile-ads", {
       "androidAppId": "ca-app-pub-XXXX~YYYY",
       "iosAppId": "ca-app-pub-XXXX~ZZZZ"
     }],
     ["expo-tracking-transparency", {
       "userTrackingPermission": "This lets us show ads relevant to you. Your data is never sold."
     }]
   ]
   ```
4. Put the ad **unit** ids in `mobile/app.json` → `expo.extra`:
   ```jsonc
   "admobInterstitialIdIos": "ca-app-pub-XXXX/IOS_INTERSTITIAL",
   "admobInterstitialIdAndroid": "ca-app-pub-XXXX/AND_INTERSTITIAL",
   "admobRewardedIdIos": "ca-app-pub-XXXX/IOS_REWARDED",
   "admobRewardedIdAndroid": "ca-app-pub-XXXX/AND_REWARDED"
   ```
5. Register the provider. In `mobile/App.tsx`, just **before**
   `await Promise.all([initIAP(), initAds(), initCosmetics()]);`, add:
   ```ts
   import { createAdMobAdProvider } from './src/services/providers/googleAdMobAds';
   setAdProvider(createAdMobAdProvider());
   ```
   (`setAdProvider` is exported from `./src/services/ads`. `initAds()` then
   initializes it and preloads the first ads.)
6. Call ATT/consent at first ad exposure (not launch). The adapter exposes
   `requestATTIfNeeded()` and `requestConsentIfNeeded()` on the provider for this.

Test with AdMob **test ad unit ids** (or test devices) before going live, and use
**license testers** so you never serve live ads to yourself during QA.

---

## Why this is safe to leave wired

Each adapter loads its native module with a guarded dynamic `require` and reads
its keys/ids from `expo.extra`. If the module isn't installed or a key is blank,
`isReady()` returns `false` and every call resolves to the same result as the NoOp
provider — verified by `src/__tests__/providerAdapters.test.ts`.
