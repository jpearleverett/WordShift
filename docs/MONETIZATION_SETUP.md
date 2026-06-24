# WordShift Monetization Setup (drop-in)

> **Status:** ✅ Completed for Android. Both adapters are wired in `App.tsx`, the
> native SDKs are installed, and RevenueCat (`revenueCatAndroidKey`) + AdMob
> (app id in the config plugin, unit ids in `extra`) are configured in
> `app.json`. iOS keys are intentionally left blank. The guide below remains the
> reference for re-doing this or adding iOS.
>
> **Surfaces actually wired (readiness pass):**
> - **Interstitials are invoked** — `App.tsx` `maybeShowVictoryInterstitial()`
>   fires on the normal puzzle→next-level / puzzle→home exits
>   (`handleNextLevel` / `handleReturnHome`). All narrative-beat exemptions live
>   there: onboarding, the daily, pending phase transitions, queued
>   final/post-revelation cinematics, Phase 5, and the early "pure delight"
>   window (first `AUTO_COLLECT_PUZZLE_LIMIT` puzzles). Cadence is driven by
>   `VictoryData.puzzlesSolved` against `INTERSTITIAL_FREQUENCY_*`. (Tuning lever:
>   raise `INTERSTITIAL_FREQUENCY_EARLY` / the early-window guard for a gentler
>   first few sessions.)
> - **Rewarded** placements wired: `victory_double` (VictoryModal) and
>   `quest_bonus`. `hint_recovery` / `cooldown_skip` are defined but intentionally
>   not surfaced (standard mode has uncapped free hints; Challenge is hint-free by
>   design — no honest UX home for them).
> - **Restore Purchases** is reachable in **Settings → PURCHASES**
>   (`restorePurchases()`), in addition to the Patron modal — satisfies the
>   store-policy accessible-restore requirement.
> - **iOS ATT string** (`NSUserTrackingUsageDescription`) is present in
>   `app.json` → `ios.infoPlist` so the ATT prompt isn't suppressed once iOS ad
>   keys are filled.

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

Products (`iap.ts` → `PRODUCT_IDS`). Two flavors:

**Non-consumables** (grant an entitlement):
- `com.wordshift.patron_key` → `patron` entitlement
- `com.wordshift.remove_ads` → `adfree` entitlement
- `com.wordshift.cosmetic_bundle` → `cosmetic_bundle` entitlement (The Keeper's
  Collection: Eclipse tile theme + confetti)

**Consumables** (repeatable; credit currency, NO entitlement — `purchaseConsumable`):
- `com.wordshift.amber_small` / `amber_medium` / `amber_large` → amber packs
  (amounts in `gameBalance.AMBER_PACK_GRANTS`)
- `com.wordshift.hints_small` / `hints_large` → hint packs
  (`gameBalance.HINT_PACK_GRANTS`)

1. Create the products with the **exact** ids above. In App Store Connect:
   non-consumables as **Non-Consumable**, the amber/hint packs as **Consumable**.
   In Google Play Console: create them as **In-app products** and configure the
   amber/hint SKUs as **consumable** (RevenueCat/Billing consumes them on
   purchase so they can be bought again).
2. In RevenueCat, add an iOS app and an Android app, create **Entitlements named
   `patron`, `adfree`, and `cosmetic_bundle`**, attach the matching
   non-consumable products, and copy the **public SDK keys** (one per platform).
   The amber/hint consumables need **no** entitlement — the app credits them
   directly from the purchase result.
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
   > Note: `NSUserTrackingUsageDescription` is **already set directly** in
   > `app.json` → `ios.infoPlist`. If you add the `expo-tracking-transparency`
   > plugin's `userTrackingPermission`, drop the direct `infoPlist` key (or omit
   > the plugin option) so the Info.plist string has a single source.
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
