# WordShift Launch Checklist (human tasks)

Everything code-side has been implemented in the repo. The items below require
accounts, consoles, secrets, or a physical device — they cannot be closed from
the codebase and are the remaining gates to submission.

## Android (submission-blocking)

- [ ] **Store screenshots** — capture at least 2 phone screenshots (8 recommended)
      per the shot list in `docs/STORE_LISTING.md`, plus the existing
      `docs/feature-graphic.png`. Upload in Play Console → Store listing.
- [ ] **Sentry source maps** — production builds now upload source maps
      (`SENTRY_DISABLE_AUTO_UPLOAD` was removed from the production profile in
      `mobile/eas.json`). Create an auth token in Sentry (org: settings → Auth
      Tokens, scope `project:releases`) and add it as an EAS secret:
      `eas secret:create --name SENTRY_AUTH_TOKEN --value <token>`.
      Dev/preview builds still skip upload for speed.
- [x] **Supabase hardening** — DONE (2026-07-02): `security_setup.sql` applied
      and verified in the SQL editor — RLS `true` on all four tables, anon's
      only direct table privilege is `events INSERT`, and all seven RPCs are
      executable by anon. The client already talks to the RPCs.
- [ ] **AdMob console** — publish an EU consent (UMP) message for the app and
      confirm the Android app ID + both unit IDs in `mobile/app.json` match the
      console. The client now gathers consent before any ad request and exposes
      "Privacy Options" in Settings.
- [ ] **Play Console IAP products** — create/verify products for every SKU in
      `mobile/src/services/iap.ts` (amber packs, hint packs, cosmetic bundle,
      patron, ad-free, **and the new starter pack SKU**) with intended prices;
      link RevenueCat to the Play account and map entitlements
      (`patron`, `adfree`, cosmetic bundle, starter pack).
- [ ] **Data safety form** — declare: anonymous device ID + gameplay events
      (analytics, Supabase), crash data (Sentry), advertising (AdMob), purchases
      (RevenueCat/Play). No PII collected; data-deletion page is live.
- [ ] **Version bump** — bump `android.versionCode` in `mobile/app.json`
      manually before each release build (autoIncrement is intentionally off).
- [ ] First upload of a new app must be done manually in Play Console;
      afterwards `eas submit -p android` works (service account already wired).

## iOS (separate track — currently NoOp-monetized by design)

- [ ] RevenueCat iOS API key → `expo.extra.revenueCatIosKey` in `mobile/app.json`.
- [ ] AdMob iOS app ID → add `iosAppId` to the `react-native-google-mobile-ads`
      plugin block in `mobile/app.json` (an iOS build that includes the SDK
      without this crashes at launch).
- [ ] AdMob iOS unit IDs → `expo.extra.admobInterstitialIdIos` / `admobRewardedIdIos`.
- [ ] App Store Connect: products for all SKUs, ATT review note
      (`NSUserTrackingUsageDescription` already set), 6.7" screenshot set,
      privacy nutrition labels (same data inventory as Android).

## Nice-to-verify on device before submission

- [ ] Fresh-install cold start with airplane mode on (boot no longer awaits
      ad/IAP SDKs — verify first frame is fast offline).
- [ ] EEA-region device (or debug geography in UMP) shows the consent form
      before the first ad, and Settings → Privacy Options opens the form again.
- [ ] Share a result and confirm the PNG share card renders (requires the dev
      client / EAS build — Expo Go falls back to text by design).
- [ ] Notification tap routes to the daily challenge; a `wordshift://challenge/p?w=…`
      link from a friend opens the shared puzzle.
