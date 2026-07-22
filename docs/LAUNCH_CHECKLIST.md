# WordShift Launch Checklist (human tasks)

Everything code-side has been implemented in the repo. The items below require
accounts, consoles, secrets, or a physical device — they cannot be closed from
the codebase and are the remaining gates to submission.

## Android (submission-blocking)

- [x] **Store listing live in Play Console** — DONE (2026-07-13): the 8 final
      screenshots, feature graphic, and descriptions from `docs/STORE_LISTING.md`
      uploaded to Main store listing.
- [ ] **RE-CAPTURE store screenshot #5 (`05_master_every_mode`) before the next
      store update** — the uploaded PNG predates the trial-ladder rebalance and
      advertises "+50% Challenge amber", but the shipped setup menu delivers
      +25% (1.25x). This overstates a benefit the game does not give, so it must
      be re-shot from the running build (needs an on-device capture, same as the
      screenshot-refresh task below) and re-uploaded. The listing COPY in
      STORE_LISTING.md is already corrected; only the binary PNG is stale. Do
      not ship a store update that keeps the +50% image.
- [x] **Verify one REAL purchase of each SKU kind on a Play internal build**
      — DONE (2026-07-13): every SKU kind verified working on the Play
      internal build (consumables, starter one-time, Remove Ads / Patron
      non-consumables). The NON_SUBSCRIPTION billing fix is confirmed
      end-to-end on a real device.
- [ ] **Device pass on low/mid/high-end Android** — progress:
      - [x] Offline cold start (fresh install, airplane mode) — DONE 2026-07-13
      - [x] Pit economy, puzzles, home, store, dialogue — covered by the
            multi-hour Phase-4 session (2026-07-13, build 44)
      - [x] IAP + Restore — covered by the SKU verification pass (2026-07-13)
      - [ ] Onboarding end-to-end on a fresh install
      - [ ] UMP consent form (EEA/debug geography) + Settings → Privacy Options
      - [ ] Interstitials + rewarded ads (test units)
      - [ ] Notification tap routing (incl. cold start)
      - [ ] Deep links (`wordshift://challenge/...`)
      - [ ] Sharing (PNG share card)
      - [ ] Re-check Challenge (previews on) + a deliberate Blind Offering
            failure on build 45 (the trial ladder shipped after build 44)
- [ ] **Closed test gate (12 testers / 14 days) — IN PROGRESS, started
      2026-07-13.** Google requires the closed test with at least 12 testers
      continuously opted in for 14 consecutive days before a personal account
      can apply for production access → eligible to apply ~2026-07-27, then
      Google's application review (typically ≤7 days). Uploading new builds to
      the closed track during the window is fine and does NOT reset the clock
      (push build 45 there). Keep the 12+ testers opted in the whole time —
      dips below 12 pause the clock.
- [x] **30-minute performance session** — DONE (2026-07-13), exceeded: a
      multi-hour mixed session on device reaching Phase 4 (puzzles, home, pit,
      store, dialogue) with no glitches, jank, or lag observed.
- [x] **Feature graphic** — DONE (2026-07-13): final 1024×500 art (Ember +
      wordmark + hidden treeline eyes) generated and reviewed; upload with the
      screenshots.
- [ ] **Set `creatorCode` for press builds** — fill `expo.extra.creatorCode`
      in `mobile/app.json` on the press/reviewer build only (empty string =
      feature fully inert in shipping builds); hand the code out with
      `docs/PRESS_KIT.md`.
- [ ] **Flip `expo.extra.adsUseTestIds` to `false` for the PRODUCTION build
      only** — it ships `true` so every dev/internal-testing build serves
      Google TEST ad units. Serving LIVE ads to yourself on a test build and
      tapping them is an AdMob policy violation that can get the account
      limited. Leave it `true` through all internal testing; set it `false`
      only when cutting the public production build (and confirm live ads fill
      on a real production install before wide rollout). *(The revenue pass
      briefly set this `false`; it was reverted to `true` on 2026-07-16 to keep
      the live closed test from serving real ads — do NOT re-flip it until the
      production cut. Only `__DEV__` or this flag forces test ads, so a `false`
      value means EVERY release/testing build serves live ads.)*
- [ ] **Bump `android.versionCode`** in `mobile/app.json` for the next release
      (currently **47**, `version` **1.5.0**; the revenue pass rode on top of the
      2026-07-13 playtest/trial-ladder builds. autoIncrement is intentionally
      off — bump manually every time).
- [x] **Billing category fix + boot entitlement restore** — DONE (2026-07-10):
      RevenueCat `getProducts` now passes the NON_SUBSCRIPTION category
      (Android one-time products returned `[]` without it — the "purchases not
      available" launch blocker); `initialize()` silently restores
      entitlements via `getCustomerInfo` + a customer-info update listener.
- [x] **Purchase-recovery ledgers** — DONE (2026-07-10): consumable + starter
      purchases persist a pending-grant ledger (`wordshift_pending_iap_grants`,
      apply-then-ack, reconciled at boot); pit offers move amber through a
      `pendingCredits` ledger in the same write. A kill mid-flow can no longer
      lose paid or earned currency.
- [x] **Cloud-save conflict guard** — DONE (2026-07-10): uploads skip and flag
      `conflictDetected` when another device holds a newer save; Settings →
      Backup & Restore surfaces the use-newer / keep-this-device choice.
- [x] **expo-doctor clean (21/21)** — DONE (2026-07-10): `expo-asset`
      installed; splash config lives in the `expo-splash-screen` plugin;
      deprecated top-level `splash` / `newArchEnabled` keys removed.
- [x] **Store-listing counts corrected** — DONE (2026-07-10):
      `docs/STORE_LISTING.md` now reads thirteen animal friends / 51
      achievements (description + release-notes template).
- [x] **Press kit created** — DONE (2026-07-10): `docs/PRESS_KIT.md` + the
      `wordshift://creator?code=&era=` fast-forward deep link (era snapshots
      for reviewers; inert without `creatorCode`).
- [x] **Sentry source maps** — DONE (2026-07-02): org/project slugs in the
      `@sentry/react-native` plugin config (`mobile/app.json`);
      `SENTRY_AUTH_TOKEN` stored as a secret EAS environment variable
      (production).
- [x] **Supabase hardening** — DONE (2026-07-02): `security_setup.sql` applied
      and verified live — RLS `true` on all four tables, anon's only direct
      table privilege is `events INSERT`, all seven RPCs executable by anon.
- [x] **AdMob console** — DONE (2026-07-02): EU consent (UMP) message
      `wordshift-gdpr-v1` published (GDPR countries, one-tap Do-not-consent,
      privacy policy attached, ad-unit deployment off — the app has the full
      UMP integration). `app-ads.txt` live at the domain root
      (`https://jpearleverett.github.io/app-ads.txt`, pub-6575205005908086).
      The "Requires review" badge + app-ads.txt verification self-resolve once
      the app is live on Play and linked to the store listing
      (AdMob → Apps → Word Shift → App settings → link store; then
      app-ads.txt tab → Check for updates).
- [x] **Play Console IAP products (original 9)** — DONE (2026-07-02): the 9
      one-time SKUs created and activated; RevenueCat products imported (5
      consumable, 4 non-consumable) and 4 entitlements mapped (`patron`,
      `adfree`, `cosmetic_bundle`, `starter_pack`).
- [ ] **Supporter subscription (revenue pass, 10th SKU / 5th entitlement)** —
      app-side wired (`com.wordshift.supporter_monthly` → `supporter`
      entitlement; ad-free + monthly amber stipend + season-pass premium +
      exclusive confetti). OPEN console-side: create the auto-renewing
      subscription in Play Console, import it into RevenueCat, and create the
      **`supporter` entitlement** (identifier EXACTLY `supporter`) attached to
      it. See `docs/MONETIZATION_SETUP.md`.
- [x] **Banner ad unit — Android (revenue pass)** — DONE (2026-07-16):
      app-side wired (`BannerAd.tsx` + `ads.shouldShowBanner`, menu surfaces
      only); Android Banner AdMob unit created and `admobBannerIdAndroid` set
      (`ca-app-pub-6575205005908086/7787305884`). Serves TEST banners while
      `adsUseTestIds` is `true`. (iOS banner unit + `admobBannerIdIos` remain on
      the iOS track below.)
- [ ] **Confirm the repriced store tiers** — the in-app fallback labels changed
      in the revenue pass (Remove-Ads **$5.99**, Patron **$8.99**, Supporter
      **$3.99/mo**); set the Play Console product **price tiers** to match so the
      live `priceString` and the fallback agree.
- [x] **Data safety + App content declarations** — DONE (2026-07-02): data
      safety, Advertising ID, privacy policy, ads declaration, content rating,
      target audience actioned in Play Console → App content.
- [x] First manual Play upload already happened (v12 era; versionCode now 43);
      `eas submit -p android` works from here (service account wired).

## iOS (separate track — blocked until the values below exist)

All of these come from consoles only the account owner can access. Once the
four starred values are handed over, wiring them into the repo is a
five-minute code change and iOS becomes buildable.

- [ ] **Apple Developer Program** membership active; app created in
      App Store Connect (bundle id `com.wordshift.app`).
- [ ] ★ **RevenueCat iOS API key** → `expo.extra.revenueCatIosKey` in
      `mobile/app.json` (RevenueCat → project → add App Store app; also needs
      the App Store Connect API key / shared secret connected in RevenueCat).
- [ ] ★ **AdMob iOS app ID** → `iosAppId` in the
      `react-native-google-mobile-ads` plugin block in `mobile/app.json`
      (register Word Shift iOS in AdMob first; an iOS build that includes the
      SDK without this crashes at launch).
- [ ] ★ **AdMob iOS interstitial unit ID** → `expo.extra.admobInterstitialIdIos`.
- [ ] ★ **AdMob iOS rewarded unit ID** → `expo.extra.admobRewardedIdIos`.
- [ ] **AdMob GDPR message for iOS** — add the iOS app to the published
      European-regulations message (or create a second message); the Android
      one only covers the Android app entry.
- [ ] **App Store Connect IAP products** — same 10 SKUs (App Store product IDs
      can reuse the `com.wordshift.*` identifiers), attached to the same 5
      RevenueCat entitlements. Consumables: amber + hint packs; non-consumable:
      starter, remove_ads, patron_key, cosmetic_bundle; auto-renewing
      subscription: `supporter_monthly` → `supporter` entitlement.
- [ ] **App privacy (nutrition labels)** — same data inventory as the Android
      data-safety form: Identifiers (device ID), Location (coarse, ads),
      Purchases, Usage Data (product interaction, ads), Diagnostics (crash).
      ATT string is already set (`NSUserTrackingUsageDescription`).
- [ ] **iOS screenshots** — 6.7"/6.9" set for App Store Connect.
- [ ] **EAS iOS credentials** — distribution cert + provisioning via
      `eas build -p ios` first-run prompts; then TestFlight for testing.
- [ ] **app-ads.txt for iOS** — already covered: the App Store listing's
      marketing URL should point at `https://jpearleverett.github.io/WordShift/`
      (same domain root file, same publisher ID).

## Nice-to-verify on device before submission

- [x] Fresh-install cold start with airplane mode on (boot no longer awaits
      ad/IAP SDKs — verify first frame is fast offline). DONE 2026-07-13.
- [ ] EEA-region device (or debug geography in UMP) shows the consent form
      before the first ad, and Settings → Privacy Options opens the form again.
- [ ] Share a result and confirm the PNG share card renders (requires the dev
      client / EAS build — Expo Go falls back to text by design).
- [ ] Notification tap routes to the daily challenge; a `wordshift://challenge/p?w=…`
      link from a friend opens the shared puzzle.
- [ ] Daily challenge victory shows the percentile line (proves the locked-down
      Supabase RPCs end-to-end).
