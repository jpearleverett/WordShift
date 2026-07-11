# WordShift Launch Checklist (human tasks)

Everything code-side has been implemented in the repo. The items below require
accounts, consoles, secrets, or a physical device — they cannot be closed from
the codebase and are the remaining gates to submission.

## Android (submission-blocking)

- [ ] **Store screenshots** — capture the 4 phone screenshots per the shot
      list in `docs/STORE_LISTING.md`. Upload in Play Console → Store listing.
- [ ] **Verify one REAL purchase of each SKU kind on a Play internal build**
      (CRITICAL) — one consumable (amber or hint pack), the starter one-time,
      Remove Ads / Patron non-consumables, and a Restore Purchases round-trip.
      The 2026-07-10 billing product-category fix (NON_SUBSCRIPTION on
      getProducts) is exactly the class of bug that only a real device on a
      Play build can validate — do not ship without this pass.
- [ ] **Device pass on low/mid/high-end Android** — offline cold start (fresh
      install, airplane mode), onboarding end-to-end, pit economy, IAP +
      Restore, UMP consent form (EEA/debug geography), interstitials, rewarded
      ads, notifications (tap routing incl. cold start), deep links
      (`wordshift://challenge/...`), and sharing (PNG share card).
- [ ] **30-minute performance session** — one long mixed session (puzzles,
      home, pit, store, dialogue) on the low-end device, watching for jank,
      memory growth, and audio glitches.
- [ ] **Feature graphic** — upgrade/replace `docs/feature-graphic.png` before
      the listing goes live (current one is placeholder-grade).
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
      on a real production install before wide rollout).
- [ ] **Bump `android.versionCode`** in `mobile/app.json` for the next release
      (currently 43; autoIncrement is intentionally off — bump manually every
      time).
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
- [x] **Play Console IAP products** — DONE (2026-07-02): all 9 SKUs created and
      activated; RevenueCat products imported (5 consumable, 4 non-consumable)
      and 4 entitlements mapped (`patron`, `adfree`, `cosmetic_bundle`,
      `starter_pack`).
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
- [ ] **App Store Connect IAP products** — same 9 SKUs (App Store product IDs
      can reuse the `com.wordshift.*` identifiers), attached to the same 4
      RevenueCat entitlements. Consumables: amber + hint packs; non-consumable:
      starter, remove_ads, patron_key, cosmetic_bundle.
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

- [ ] Fresh-install cold start with airplane mode on (boot no longer awaits
      ad/IAP SDKs — verify first frame is fast offline).
- [ ] EEA-region device (or debug geography in UMP) shows the consent form
      before the first ad, and Settings → Privacy Options opens the form again.
- [ ] Share a result and confirm the PNG share card renders (requires the dev
      client / EAS build — Expo Go falls back to text by design).
- [ ] Notification tap routes to the daily challenge; a `wordshift://challenge/p?w=…`
      link from a friend opens the shared puzzle.
- [ ] Daily challenge victory shows the percentile line (proves the locked-down
      Supabase RPCs end-to-end).
