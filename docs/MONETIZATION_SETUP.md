# WordShift monetization setup

Reviewed against main `6f96ebb` on 2026-09-13. See [current build](CURRENT_BUILD.md)
and [signed-device release gates](LAUNCH_CHECKLIST.md). Console confirmations below
are dated history; they do not validate the latest optimized Android binary.

> **Configured in source:** Android billing and ads are wired. Both
> adapters are registered in `App.tsx`, the native SDKs are installed, and
> RevenueCat (`revenueCatAndroidKey`) + AdMob (app id in the config plugin, unit
> ids in `extra`) are configured in `app.json`. Console-side (first pass done
> 2026-07-02): the original **9 one-time products** created + activated in Play
> Console; RevenueCat products imported (5 consumable / 4 non-consumable) and the
> original **4 entitlements** mapped; the EU consent (UMP) message and
> publisher file were recorded as published at `https://jpearleverett.github.io/app-ads.txt`
> (pub-6575205005908086).
>
> **Android account history and remaining verification:**
>
> - **Supporter subscription** (`com.wordshift.supporter_monthly`, the 10th SKU)
>   — ✅ DONE console-side (owner-confirmed 2026-08-31): auto-renewing
>   subscription created in Play Console (base plan `monthly`), imported into
>   RevenueCat, and the **`supporter` entitlement** (the 5th, identifier
>   EXACTLY `supporter`) created and attached. Still recommended: one real
>   license-tester subscription purchase end-to-end (the 2026-07-13 SKU
>   verification predates the subscription-category code). Google RTDN →
>   RevenueCat Pub/Sub wiring ✅ DONE (2026-09-22): Play's test notification
>   was received by RevenueCat, so cancels, refunds and lapses sync promptly.
> - **Banner ad unit** — ✅ DONE for Android (2026-07-16): Android Banner unit
>   created and `admobBannerIdAndroid` set in `extra`
>   (`ca-app-pub-6575205005908086/7787305884`). Serves TEST banners while
>   `adsUseTestIds` is `true`; the iOS banner unit + `admobBannerIdIos` stay open
>   on the iOS track.
>
> iOS keys are intentionally left blank (NoOp fallback — see
> [launch checklist](LAUNCH_CHECKLIST.md) for the iOS track). The guide below remains the
> reference for re-doing this or adding iOS.
>
> **Surfaces actually wired:**
>
> - **Interstitials are invoked** — `App.tsx` `maybeShowVictoryInterstitial()`
>   runs on the normal Next Level and Home victory exits (`handleNextLevel` /
>   `handleReturnHome`). **Collect Now / the pit route is exempt**: collecting
>   earned Amber never invokes an interstitial. Story presentation also exempts
>   the exit.
>   All narrative-beat exemptions live there: onboarding, the mandatory
>   first-harvest gate, pending phase transitions, queued final/post-revelation
>   cinematics, Phase 5, and the early "pure delight" window (no interstitial
>   until more than `INTERSTITIAL_MIN_PUZZLES` (16) puzzles are solved, making
>   win 17 the earliest eligible exit; cadence, readiness and other exemptions
>   may delay the actual first ad). The daily challenge is exempt only from
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
>   overlay), and `daily_amber` (the Store's "Free Amber" faucet, 60 Amber
>   per claim, capped at two claims per local day; Patrons claim it free with
>   no ad). The victory-double offer is limited to five presentations per local
>   day and hidden from Phase 4 onward; eligible ad-free players double without
>   watching an ad. An absent offer can therefore be intentional.
> - **Banner ads** are wired via `components/monetization/BannerAd.tsx` +
>   `ads.shouldShowBanner` (Stats is the sole banner screen; suppressed for
>   ad-free/onboarding/Phase 4+). The Android banner unit id is set; iOS is still
>   blank (banners stay inert on any platform whose `admobBannerId*` is empty).
>   `BannerAd` honors the same `adsUseTestIds`/`__DEV__` gate as the other ad
>   surfaces, so testing builds show TEST banners.
> - **Restore Purchases** is reachable in **Settings → PURCHASES**
>   (`restorePurchases()`), in addition to the Patron modal. Verify both entry
>   points on the signed build.
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
>
> **Play Data safety form: "Device or other IDs" (re-submit before the public
> release).** The July form declared that category only for the advertising ID.
> Two bundled SDKs mint their own per-install identifiers even though the app
> passes them none: the Sentry Android SDK (`@sentry/react-native`) assigns a
> persisted random installation id as `user.id` on every crash report, and
> `react-native-purchases` (configured anonymously in `revenueCatBilling.ts`)
> mints a RevenueCat anonymous app-user id tied to the store purchases.
> Declare **Device or other IDs** as collected for **App functionality**
> (purchase management, cloud backup with WordShift's own install id) and
> **Analytics/Diagnostics** (crash reporting, telemetry), shared with Google
> (ads), RevenueCat, Supabase and Sentry as applicable, in addition to the
> Advertising ID row. While there, confirm **Purchase history** covers the
> Supporter subscription (added 2026-08-31) and **App interactions** still
> matches the current event inventory (Stats banner 2026-07-16, support-id
> linkage on successful backups). The privacy policy and data-deletion page
> already describe both SDK identifiers.

---

## 1. In-app purchases (RevenueCat)

Products (`iap.ts` → `PRODUCT_IDS`) — 12 SKUs in three flavors (6 entitlements total).
The two added on 2026-09-22 (`season_premium`, `keepers_edition`) still need
creating in Play Console and RevenueCat; see the notes under each.

**Non-consumables** (grant a permanent entitlement):

- `com.wordshift.patron_key` → `patron` entitlement
- `com.wordshift.remove_ads` → `adfree` entitlement
- `com.wordshift.cosmetic_bundle` → `cosmetic_bundle` entitlement (The Keeper's
  Collection: Eclipse tile theme + confetti)
- `com.wordshift.starter` → `starter_pack` entitlement (Keeper's Welcome — a
  one-time bundle: 1,200 amber + 5 hints, `gameBalance.STARTER_PACK_GRANTS`;
  `purchaseStarterPack()` refuses a repurchase before it ever hits billing, so
  the entitlement doubles as the one-per-account lock)
- `com.wordshift.keepers_edition` → `keepers_edition` entitlement (The Keeper's
  Edition, suggested $4.99). Sold only after the ending, from the music box
  row in the ☰ menu and the one-time story_end offer. It opens the music box
  (`components/MusicBoxModal.tsx`): all twelve authored beds, playable on
  demand. **Owner:** create it as a one-time NON-consumable in Play Console,
  import it into RevenueCat and attach it to a new entitlement whose identifier
  is EXACTLY `keepers_edition`.

**Subscription** (auto-renewing; grants an entitlement *while active*):

- `com.wordshift.supporter_monthly` → `supporter` entitlement — ad-free PLUS a
  recurring monthly amber stipend (`supporterStipend.ts`, `SUPPORTER_MONTHLY_AMBER`,
  idempotent per local month) + season-pass premium + an exclusive
  `confetti_supporter`. The live RevenueCat adapter keeps the entitlement in
  sync via customer-info updates. An explicit inactive Supporter record revokes
  the subscription benefit; cancelling renewal while the paid period remains
  active keeps it. Sparse/offline responses do not erase permanent purchases.
  `entitlements.isAdFree` includes `supporter`. The stipend is 300 Amber per local
  calendar month, with its month marker and reward committed together.

**Consumables** (repeatable; credit currency, NO entitlement — `purchaseConsumable`):

- `com.wordshift.amber_small` / `amber_medium` / `amber_large` → amber packs of
  **600 / 2,000 / 5,500** amber (`gameBalance.AMBER_PACK_GRANTS`)
- `com.wordshift.hints_small` / `hints_large` → hint packs of **5 / 20** hints
  (`gameBalance.HINT_PACK_GRANTS`)
- `com.wordshift.season_premium` → opens the CURRENT season's premium track
  (suggested $2.99), sold in the Season Pass beside the amber and Supporter
  routes (`iap.purchaseSeasonPremium`). It rides the paid-grant ledger: the
  season is captured before checkout, and a payment that settles after that
  month has ended (or after premium arrived another way) pays the track's
  amber price (`SEASON_PASS_PREMIUM_AMBER_COST`, 2,500) instead, so a confirmed
  payment is never lost. It is refused before the store sheet opens when
  premium is already available or the month's palette is owned. **Owner:**
  create it as a one-time CONSUMABLE in Play Console and import it into
  RevenueCat as a Consumable attached to NO entitlement (like the amber packs).

> **First-purchase incentive:** the FIRST amber pack a player ever buys grants
> **2x** its amount (`gameBalance.FIRST_PURCHASE_AMBER_MULTIPLIER`). The
> doubling happens app-side in `purchaseConsumable()` — the one-time flag is
> consumed with the durable paid-grant intent and tracked in `entitlements.ts`
> plus sticky local purchase history. It survives Reset All; known older Amber
> receipts also consume the offer during history initialization. No extra store
> products are needed. This is not a cross-account or universal reinstall ledger.

1. ✅ *(done for Play, 2026-07-02)* Create the products with the **exact** ids
   above. In App Store Connect: non-consumables (incl. the starter pack) as
   **Non-Consumable**, the amber/hint packs as **Consumable**. In Google Play
   Console: create them as **In-app products** and configure the amber/hint
   SKUs as **consumable** (RevenueCat/Billing consumes them on purchase so
   they can be bought again).
2. *(Four non-consumable entitlements recorded on Android 2026-07-02; the fifth,
   `supporter`, was owner-confirmed on 2026-08-31. iOS setup remains open.)* In RevenueCat, add an iOS app and
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
> in `package.json` on **Expo SDK 57 / React Native 0.86.3**. Use `npm ci`
> with the committed lockfile for reproducible dependency selection. Re-verify
> prebuild and signed-device ads whenever native dependencies or config change.
> The current R8/resource-shrinking settings particularly need this native pass;
> mocked SDK tests cannot establish release-binary compatibility.

1. ✅ *(interstitial + rewarded + Android banner done)* In AdMob, create an
   Android app and an iOS app; copy each **App ID**. Create an **Interstitial**,
   a **Rewarded**, and a **Banner** ad unit per platform; copy the unit ids. (The
   banner unit is a revenue-pass addition — the Android banner unit is created
   and `admobBannerIdAndroid` is set; the iOS banner remains open on the iOS
   track.) The **EU consent (UMP) message** and **app-ads.txt** were recorded
   as published in the July setup (publisher file at
   `https://jpearleverett.github.io/app-ads.txt`, pub-6575205005908086). Check
   their actual console/domain state and, once the public listing is linked,
   verify AdMob's app review and app-ads.txt status; do not assume automatic
   approval from the presence of repository configuration.
2. ✅ *(installed)* Install (native modules — requires a dev/production build):
   ```bash
   cd mobile
   npx expo install react-native-google-mobile-ads expo-tracking-transparency
   ```
3. In `mobile/app.json`, the config plugin carries the AdMob **app** id
   (Android is set; iOS currently uses Google's sample app ID, which must be
   replaced with the real iOS app ID before that platform's release):
   ```jsonc
   "plugins": [
     // ...existing plugins...
     ["react-native-google-mobile-ads", {
       "androidAppId": "ca-app-pub-XXXX~YYYY", // Android app ID
       "iosAppId": "ca-app-pub-XXXX~ZZZZ"      // real iOS app ID for release
     }]
   ]
   ```
   > `expo-tracking-transparency` is installed **and its config plugin is used**.
   > Its `userTrackingPermission` text currently matches
   > `ios.infoPlist.NSUserTrackingUsageDescription`; keep those descriptions
   > consistent when editing the prompt.
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
     background so cold start never blocks on a consent form). After a form
     error the adapter still reads UMP's explicit `canRequestAds` signal; unknown
     or false permission keeps the SDK/ad requests inactive. It never infers
     permission for non-personalized ads from an error. Privacy-option changes
     discard stale preloads before evaluating the new permission.
   - `ads.ts` exposes `privacyOptionsRequired()` / `showPrivacyOptions()`;
     Settings → ABOUT shows a **"Privacy Options"** row only when the CMP
     requires the persistent entry point (EEA users) — Google EU User Consent
     Policy compliance.
   - iOS **ATT** is requested lazily at first ad exposure (never at launch)
     via `ensureAdConsent()` on the show paths, which also awaits the same
     consent gate.

Test with AdMob **test ad unit ids** (or test devices) before going live, and use
**license testers** for test purchases. License-testing status does not select
AdMob test units; the ad-safety control is the release channel: `app.config.js`
resolves `adsUseTestIds` to `false` only when `WORDSHIFT_RELEASE_CHANNEL` is
`production` (the `production` EAS profile), and every other channel keeps the
`true` literal. Never hand-flip the literal.

### AdMob mediation (AppLovin and Unity Ads)

Added 2026-09-22. `plugins/withAdMediation.js` puts the Android adapters for
AppLovin (13.6.1.0) and Unity Ads (4.17.0.0, with Unity Ads SDK 4.17.0) into
the native build. They are pinned to the adapter releases built against Google
Mobile Ads 25.0.0, the SDK `react-native-google-mobile-ads` 16.x ships
(`adMediationConfig.test.ts` fails if that SDK moves). The JavaScript ad code
does not change: an adapter with no mediation group does nothing, so ads keep
coming from AdMob alone until the console steps below are done. The adapters
are native, so they arrive with a new binary (1.4.5 / code 110 or later), never
an OTA. Everything below uses bidding, which needs no waterfall tuning.

1. **AppLovin.** Sign up at <https://dash.applovin.com/>. Under Account, then
   Keys, copy the **SDK Key** (and the **Report Key** for revenue reporting).
2. **Unity Ads.** Sign in at <https://cloud.unity.com/>, open Monetization (Unity
   Ads), create a project and add the Android app with package
   `com.wordshift.app`. Note its **Game ID**. Create one ad unit each for
   Interstitial, Rewarded and Banner, set to **bidding**, and note each
   **Placement ID**. For reporting, create an API key and note your
   **Organization core ID** (Monetization settings, API management).
3. **AdMob, per format.** In AdMob, open Mediation, then Create mediation group.
   Pick Android and Interstitial, name it, and add the existing WordShift
   interstitial ad unit. Under Bidding, Add ad sources: add **AppLovin**
   (enter the SDK Key, and the Report Key when asked) and **Unity Ads** (enter
   the Game ID and the Interstitial Placement ID, plus the Organization core ID
   and API key when asked). Save. Repeat for **Rewarded** (rewarded unit and
   Unity's rewarded placement) and **Banner** (banner unit and Unity's banner
   placement).
4. **Consent partners.** In AdMob, Privacy & messaging: open the GDPR message
   and make sure the ad partners list includes AppLovin and Unity Ads (the
   "commonly used ad partners" choice includes both; a custom list must add
   them), then Publish. Do the same in the US states message if you have one.
   Without this, those two partners get no ads in the EEA/UK.
5. **app-ads.txt.** Each network shows its own `app-ads.txt` line(s) in its
   dashboard (AppLovin: Account, then app-ads.txt; Unity: Monetization
   settings). Append them, unedited, to the `app-ads.txt` served at
   `https://jpearleverett.github.io/app-ads.txt`, keeping the Google line.
   Unauthorised inventory is paid less or not at all.
6. **Play Console, Data safety.** AppLovin and Unity collect the same kinds of
   data as AdMob (device advertising ID, approximate location, app
   interactions, diagnostics) for advertising. Review the Data safety answers
   against their SDK disclosures and update them if anything is new.
7. **Test on a device.** In AdMob, Settings, then Test devices, add your phone
   and set "Open ad inspector" to a gesture (for example Flick). On the
   internal-testing build, perform the gesture to open the Ad Inspector: each
   mediation group should list AppLovin and Unity Ads as loaded adapters, and
   a test request from each should succeed. Never tap a live ad.
8. **Watch it ramp.** Bidding partners take a few days of traffic to compete
   fully. AdMob's Mediation report shows each source's share and eCPM.

The privacy policy already names both partners (revision of 2026-09-22).

---

## Purchase and reward integrity

- A process-wide lock serializes paid checkout and Restore, including duplicate
  taps and remounts. UI navigation/Back guards protect the active purchase flow.
- A store-confirmed payment is distinct from a pending payment, cancellation or
  store error. Saving a confirmed result retries local persistence without
  opening another charge sheet. Pending approval is not treated as a completed
  grant or a failed local save.
- Consumable/starter rewards are journaled by native transaction ID, then applied
  with their Amber/hint balance, receipt acknowledgement and ledger inside the
  storage transaction. A durable unfinished intent is reconciled on startup.
- RevenueCat history adds recovery for new completed transactions after a
  **durable installation baseline**. Old unknown receipts are treated as already
  accounted for, so restoring a save or reinstalling does not mint old spent
  packs again. These local receipts are deliberately excluded from cloud saves.
  This improves same-install interrupted/delayed checkout recovery; it does not
  promise recovery of every consumable across reinstalls, account changes or an
  unavailable provider history. There is no server purchase ledger in this repo.
- Amber-funded room/cosmetic purchases commit balance, ownership, automatic
  equipment and the currency ledger together. Daily Amber commits its claim
  receipt/count with its reward; a completed Store ad can finish saving after
  unmount. Supporter stipend and victory-double claims likewise commit the
  corresponding receipt/month marker with their reward to prevent repeat grants.

Verify cancellation, pending approval, double taps, storage retry, termination,
restore and subscription expiry through a signed Play internal-test build. The
purchase regression tests simulate native SDK results and storage interruption;
they are not evidence of an actual Google Play charge or an R8-built SDK run.

## Provider availability

Each adapter loads its native module with a guarded dynamic `require` and reads
its keys/ids from `expo.extra`. If the module isn't installed or a key is blank
(as on iOS today), `isReady()` returns `false` and every call resolves to the
same result as the NoOp provider — verified by
`src/__tests__/providerAdapters.test.ts`.
