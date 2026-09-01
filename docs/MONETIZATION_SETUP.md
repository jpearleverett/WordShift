# WordShift Monetization Setup (drop-in)

> **Status:** ✅ Android app-side is complete and mostly done console-side. Both
> adapters are registered in `App.tsx`, the native SDKs are installed, and
> RevenueCat (`revenueCatAndroidKey`) + AdMob (app id in the config plugin, unit
> ids in `extra`) are configured in `app.json`. Console-side (first pass done
> 2026-07-02): the original **9 one-time products** created + activated in Play
> Console; RevenueCat products imported (5 consumable / 4 non-consumable) and the
> original **4 entitlements** mapped; the EU consent (UMP) message is published;
> `app-ads.txt` is live at `https://jpearleverett.github.io/app-ads.txt`
> (pub-6575205005908086).
>
> **Remaining Android console work (added in the revenue pass):**
> - **Supporter subscription** (`com.wordshift.supporter_monthly`, the 10th SKU)
>   — ✅ DONE console-side (owner-confirmed 2026-08-31): auto-renewing
>   subscription created in Play Console (base plan `monthly`), imported into
>   RevenueCat, and the **`supporter` entitlement** (the 5th, identifier
>   EXACTLY `supporter`) created and attached. Still recommended: one real
>   license-tester subscription purchase end-to-end (the 2026-07-13 SKU
>   verification predates the subscription-category code), and Google RTDN →
>   RevenueCat Pub/Sub wiring for prompt cancel/lapse sync (owner-deferred).
> - **Banner ad unit** — ✅ DONE for Android (2026-07-16): Android Banner unit
>   created and `admobBannerIdAndroid` set in `extra`
>   (`ca-app-pub-6575205005908086/7787305884`). Serves TEST banners while
>   `adsUseTestIds` is `true`; the iOS banner unit + `admobBannerIdIos` stay open
>   on the iOS track.
>
> iOS keys are intentionally left blank (NoOp fallback — see
> `docs/LAUNCH_CHECKLIST.md` for the iOS track). The guide below remains the
> reference for re-doing this or adding iOS.
>
> **Surfaces actually wired:**
> - **Interstitials are invoked** — `App.tsx` `maybeShowVictoryInterstitial()`
>   fires on the normal victory exits: puzzle→next-level, puzzle→home, AND the
>   puzzle→pit route (`handleNextLevel` / `handleReturnHome` / `handleGoToPit`).
>   All narrative-beat exemptions live there: onboarding, the mandatory
>   first-harvest gate, pending phase transitions, queued final/post-revelation
>   cinematics, Phase 5, and the early "pure delight" window (no interstitial
>   until `INTERSTITIAL_MIN_PUZZLES` (16) puzzles are solved, so the first ad
>   lands on the exit of win 17). The daily challenge is exempt only from
>   Phase 3 on (`ads.isDailyInterstitialAllowed(phase)` allows phases 0-2,
>   where the daily carries the normal cadence).
>   Cadence is driven by `VictoryData.puzzlesSolved` against
>   `INTERSTITIAL_FREQUENCY_*`. (Tuning lever: raise
>   `INTERSTITIAL_FREQUENCY_EARLY` / the early-window guard for a gentler
>   first few sessions.)
> - **All five rewarded placements are surfaced** (each an opt-in button):
>   `victory_double` (VictoryModal 2x amber), `hint_recovery` (offered when the
>   consumable hint balance runs out — `handleOutOfHints` in App.tsx; hints are
>   a consumable resource via `services/hints.ts`), `quest_bonus` (quest reward
>   boost), `speed_rescue` (once-per-board +30s continue on the Speed Time's-Up
>   overlay), and `daily_amber` (the Store's "Free Amber" faucet, capped
>   `DAILY_AMBER_DAILY_CAP`/local day; Patrons claim it free with no ad).
> - **Banner ads** are wired via `components/monetization/BannerAd.tsx` +
>   `ads.shouldShowBanner` (menu surfaces like Stats; suppressed for
>   ad-free/onboarding/Phase 4+). The Android banner unit id is set; iOS is still
>   blank (banners stay inert on any platform whose `admobBannerId*` is empty).
>   `BannerAd` honors the same `adsUseTestIds`/`__DEV__` gate as the other ad
>   surfaces, so testing builds show TEST banners.
> - **Restore Purchases** is reachable in **Settings → PURCHASES**
>   (`restorePurchases()`), in addition to the Patron modal — satisfies the
>   store-policy accessible-restore requirement.
> - **iOS ATT string** (`NSUserTrackingUsageDescription`) is present in
>   `app.json` → `ios.infoPlist` so the ATT prompt isn't suppressed once iOS ad
>   keys are filled.

Monetization is built on swappable seams: two provider adapters implement the
`BillingProvider` / `AdProvider` interfaces from `src/services/iap.ts` and
`src/services/ads.ts`:

- `src/services/providers/revenueCatBilling.ts` — in-app purchases via RevenueCat
- `src/services/providers/googleAdMobAds.ts` — interstitial + rewarded ads via AdMob

Both are registered in `App.tsx` at bootstrap, but each stays **inert unless**
its native SDK is present **and** its key/ids are set for the current platform —
so the app still runs in Expo Go (and on iOS, where keys are blank) with no
purchases and no ads, degrading exactly like the NoOp providers.

> **Store disclosure:** ✅ done — the privacy policy (linked via
> `mobile/src/constants/links.ts`) discloses in-app purchases and advertising
> (including the advertising identifier and coarse location), and the Play
> data-safety / App content declarations were submitted 2026-07-02. Re-check
> both if the data collected ever changes.

---

## 1. In-app purchases (RevenueCat)

Products (`iap.ts` → `PRODUCT_IDS`) — 10 SKUs in three flavors (5 entitlements total):

**Non-consumables** (grant a permanent entitlement):
- `com.wordshift.patron_key` → `patron` entitlement
- `com.wordshift.remove_ads` → `adfree` entitlement
- `com.wordshift.cosmetic_bundle` → `cosmetic_bundle` entitlement (The Keeper's
  Collection: Eclipse tile theme + confetti)
- `com.wordshift.starter` → `starter_pack` entitlement (Keeper's Welcome — a
  one-time bundle: 1,200 amber + 5 hints, `gameBalance.STARTER_PACK_GRANTS`;
  `purchaseStarterPack()` refuses a repurchase before it ever hits billing, so
  the entitlement doubles as the one-per-account lock)

**Subscription** (auto-renewing; grants an entitlement *while active*):
- `com.wordshift.supporter_monthly` → `supporter` entitlement — ad-free PLUS a
  recurring monthly amber stipend (`supporterStipend.ts`, `SUPPORTER_MONTHLY_AMBER`,
  idempotent per local month) + season-pass premium + an exclusive
  `confetti_supporter`. The live RevenueCat adapter keeps the entitlement in
  sync via customer-info updates, so a lapsed sub drops `supporter` on the next
  restore/refresh. `entitlements.isAdFree` includes `supporter`.

**Consumables** (repeatable; credit currency, NO entitlement — `purchaseConsumable`):
- `com.wordshift.amber_small` / `amber_medium` / `amber_large` → amber packs of
  **600 / 2,000 / 5,500** amber (`gameBalance.AMBER_PACK_GRANTS`)
- `com.wordshift.hints_small` / `hints_large` → hint packs of **5 / 20** hints
  (`gameBalance.HINT_PACK_GRANTS`)

> **First-purchase incentive:** the FIRST amber pack a player ever buys grants
> **2x** its amount (`gameBalance.FIRST_PURCHASE_AMBER_MULTIPLIER`). The
> doubling happens app-side in `purchaseConsumable()` — the one-time flag is
> consumed on first success and tracked in `entitlements.ts` — so no extra
> store products are needed for it.

1. ✅ *(done for Play, 2026-07-02)* Create the products with the **exact** ids
   above. In App Store Connect: non-consumables (incl. the starter pack) as
   **Non-Consumable**, the amber/hint packs as **Consumable**. In Google Play
   Console: create them as **In-app products** and configure the amber/hint
   SKUs as **consumable** (RevenueCat/Billing consumes them on purchase so
   they can be bought again).
2. *(4 non-consumable entitlements done for Android 2026-07-02; the `supporter`
   subscription entitlement is the OPEN item)* In RevenueCat, add an iOS app and
   an Android app, import the products (5 consumable / 4 non-consumable / 1
   subscription), create **Entitlements named `patron`, `adfree`,
   `cosmetic_bundle`, `starter_pack`, and `supporter`**, attach the matching
   non-consumable products (and the `supporter_monthly` subscription to the
   `supporter` entitlement), and copy the **public SDK keys** (one per platform).
   The amber/hint consumables need **no** entitlement — the app credits them
   directly from the purchase result. **The entitlement identifier must match
   the string EXACTLY** (`supporter`, etc.): the adapter maps
   `customerInfo.entitlements.active` keys straight to `ENTITLEMENTS` values, so
   a mismatched RevenueCat identifier silently grants nothing.
   **No Offerings/Packages setup is needed for the one-time products:** the
   adapter purchases them by product id via `Purchases.getProducts()` (with the
   `NON_SUBSCRIPTION` category) + `purchaseStoreProduct()`, never through
   Offerings.
3. ✅ *(installed)* Install the SDK (native module — requires a dev/production
   build):
   ```bash
   cd mobile
   npx expo install react-native-purchases
   ```
4. Put the keys in `mobile/app.json` → `expo.extra` (Android key is set; iOS
   key is the open item):
   ```jsonc
   "revenueCatIosKey": "appl_xxxxxxxxxxxxxxxx",   // still blank — iOS track
   "revenueCatAndroidKey": "goog_xxxxxxxxxxxxxxxx" // ✅ set
   ```
5. ✅ *(done)* Register the provider. `mobile/App.tsx`'s bootstrap effect
   already does this:
   ```ts
   import { createRevenueCatBillingProvider } from './src/services/providers/revenueCatBilling';
   setBillingProvider(createRevenueCatBillingProvider());
   void initIAP().catch(...); // fire-and-forget — first frame never waits on billing
   ```
   (`setBillingProvider` is exported from `./src/services/iap`. `initIAP()`
   configures it in the background; `loadEntitlements()` is awaited separately
   so synchronous entitlement checks are correct on first render.)

Test with App Store **Sandbox testers** (iOS) and Play **License testing** (Android).

---

## 2. Ads (Google AdMob)

The ad **policy** (interstitial cadence, rewarded daily cap, Patron suppression,
narrative-beat exemptions) already lives in `ads.ts`; the adapter only serves the
ads.

> **Compatibility:** `react-native-google-mobile-ads` is declared as **`^16.3.4`**
> (a caret range, NOT a pin — a 16.x minor can drift in on a fresh install)
> in `package.json` (Expo SDK 56). Earlier v16.x releases had reported
> config-plugin breakage on Expo SDK 54 / RN 0.81 (invertase issue #835) — if
> you ever change the pin, re-verify the config plugin runs in the build.

1. ✅ *(interstitial + rewarded + Android banner done)* In AdMob, create an
   Android app and an iOS app; copy each **App ID**. Create an **Interstitial**,
   a **Rewarded**, and a **Banner** ad unit per platform; copy the unit ids. (The
   banner unit is a revenue-pass addition — the Android banner unit is created
   and `admobBannerIdAndroid` is set; the iOS banner remains open on the iOS
   track.) Also done console-side: the **EU consent (UMP)
   message is published** (GDPR countries, privacy policy attached) and
   **`app-ads.txt` is live** at the domain root
   (`https://jpearleverett.github.io/app-ads.txt`, pub-6575205005908086) — its
   verification self-resolves once the app is live on Play and linked to the
   store listing.
2. ✅ *(installed)* Install (native modules — requires a dev/production build):
   ```bash
   cd mobile
   npx expo install react-native-google-mobile-ads expo-tracking-transparency
   ```
3. In `mobile/app.json`, the config plugin carries the AdMob **app** id
   (Android is set; add `iosAppId` when the iOS AdMob app exists — an iOS build
   that includes the SDK without it crashes at launch):
   ```jsonc
   "plugins": [
     // ...existing plugins...
     ["react-native-google-mobile-ads", {
       "androidAppId": "ca-app-pub-XXXX~YYYY"   // ✅ set
       // "iosAppId": "ca-app-pub-XXXX~ZZZZ"    // add for the iOS track
     }]
   ]
   ```
   > Note: `NSUserTrackingUsageDescription` is set **directly** in
   > `app.json` → `ios.infoPlist` (the `expo-tracking-transparency` package is
   > installed, but its config plugin is not used). If you ever add the
   > plugin's `userTrackingPermission` option, drop the direct `infoPlist` key
   > so the Info.plist string has a single source.
4. Put the ad **unit** ids in `mobile/app.json` → `expo.extra` (Android ids are
   set; iOS ids are the open items):
   ```jsonc
   "admobInterstitialIdIos": "",                            // iOS track
   "admobInterstitialIdAndroid": "ca-app-pub-XXXX/AND_INT", // ✅ set
   "admobRewardedIdIos": "",                                // iOS track
   "admobRewardedIdAndroid": "ca-app-pub-XXXX/AND_RWD"      // ✅ set
   ```
5. ✅ *(done)* Register the provider. `mobile/App.tsx`'s bootstrap effect
   already does this:
   ```ts
   import { createAdMobAdProvider } from './src/services/providers/googleAdMobAds';
   setAdProvider(createAdMobAdProvider());
   void initAds().catch(...); // fire-and-forget — the consent → init → preload chain runs in the background
   ```
6. **Consent & ATT** — already handled by the adapter, in this order:
   - **UMP consent resolves strictly BEFORE SDK init and any ad preload** (a
     single-flight gate inside `initialize()`; the whole chain runs in the
     background so cold start never blocks on a consent form). Errors
     "continue" — ads then serve non-personalized.
   - `ads.ts` exposes `privacyOptionsRequired()` / `showPrivacyOptions()`;
     Settings → ABOUT shows a **"Privacy Options"** row only when the CMP
     requires the persistent entry point (EEA users) — Google EU User Consent
     Policy compliance.
   - iOS **ATT** is requested lazily at first ad exposure (never at launch)
     via `ensureAdConsent()` on the show paths, which also awaits the same
     consent gate.

Test with AdMob **test ad unit ids** (or test devices) before going live, and use
**license testers** so you never serve live ads to yourself during QA.

---

## Why this is safe to leave wired

Each adapter loads its native module with a guarded dynamic `require` and reads
its keys/ids from `expo.extra`. If the module isn't installed or a key is blank
(as on iOS today), `isReady()` returns `false` and every call resolves to the
same result as the NoOp provider — verified by
`src/__tests__/providerAdapters.test.ts`.
