# WordShift - Agent Instructions

## Cursor Cloud specific instructions

### Project overview

WordShift is a React Native (Expo SDK 57) mobile word puzzle game. The app codebase is in the repo's `mobile/` directory. No Docker dependency. The core game is client-side (all gameplay state in AsyncStorage); backend features (Supabase cloud save / daily leaderboard / anonymous analytics, Sentry crash reporting) and monetization (RevenueCat in-app purchases, AdMob ads) activate when their keys are set in `app.json` → `expo.extra`, and degrade to no-ops when absent. The Supabase/Sentry keys and the **Android** monetization keys are currently configured (iOS monetization keys are still empty → NoOp on iOS); in Expo Go the native IAP/ads modules are absent, so those degrade to no-ops there regardless — the app still builds and runs in Expo Go.

### Running the app

- **Primary target is Expo Go (iOS/Android).** In this VM there is no device/emulator, so the interactive dev/test path is **web**: `cd mobile && npx expo start --web --port 8081`. The web deps (`react-dom`, `react-native-web`) are regular dependencies in `mobile/package.json` — a plain `npm install` covers them.
- **Important:** When loading in Chrome in this VM, you must open DevTools (F12) **before** navigating to `localhost:8081`, otherwise Chrome's renderer will crash with error code 4 on the large bundle. First load compiles an ~18MB bundle and can take 30-90s; be patient before reloading.
- **Web bundling needs `mobile/metro.config.js` (committed).** Some native-only modules break the web bundle at Metro resolve time even though they are runtime-guarded with `Platform.OS === 'web'`: `react-native-google-mobile-ads` (native codegen banner view) and the internal `react-native/Libraries/Text/Text` + `.../TextInput/TextInput` paths that `src/theme/fonts.ts` requires (they pull in the native Fabric renderer). `metro.config.js` redirects these to `web-shims/empty.js` **for web only** — native (iOS/Android) resolution is untouched, so real builds keep the real modules. Do NOT comment out these imports in source to "fix" web; the resolver shim is the correct, source-clean fix. If you add another native-only dep that breaks the web bundle, add it to `WEB_STUBBED_MODULES` there. Restart Metro after editing `metro.config.js` (config changes are not hot-reloaded).
- **How the PRODUCT OWNER actually tests (read this before debugging any monetization/ad/IAP report).** The agent's dev path in this VM is web/Expo Go, but the owner does **not** use Expo Go. They test on a **physical Android device by installing the real signed `.aab` from the Play Store internal-testing track** (the same artifact `eas build` + `eas submit` ship). Implications when the owner reports behavior:
  - **Native modules ARE present.** RevenueCat (IAP/subscriptions), AdMob (interstitial/rewarded/banner), and tracking-transparency are all live on their build — the NoOp fallbacks that mask them in Expo Go do NOT apply. So "purchases not available" / "no ad loaded" on their device is a real config issue, never the Expo-Go stub.
  - **Ads serve Google TEST units, not live ones.** `app.json` → `expo.extra.adsUseTestIds` is deliberately `true` through internal/closed testing (`__DEV__ || adsUseTestIds` forces test units), so a rewarded/interstitial/banner that shows is a *test* ad. That is correct — tapping your own LIVE ads on a test build is an AdMob policy violation. The flag flips to `false` only at the production cut.
  - **Entitlements can be LIVE and sticky.** If the owner test-purchased Patron / Supporter / Remove-Ads (even a sandbox purchase), RevenueCat's `initialize()` silently restores it via `getCustomerInfo()` on every launch, so it persists across reinstalls and survives Settings → Reset All (Reset clears the local `wordshift_entitlements` key, but the next launch re-grants from RevenueCat). **This is the #1 cause of "the ad stopped showing" reports:** an owner-held entitlement changes the UI to the paid path. Examples seen in practice — the Store's **Daily Amber** faucet renders a free **Claim** pill (no ad) instead of the `RewardedAdButton` **only** when `isPatronSync()` is true (Patron specifically, not general ad-free); the victory **double-reward** slot becomes a free `✦` instant-double (no ad) for any ad-free/Patron holder. To reproduce the free-player ad flows they need a Google account with **no** purchase (or the test purchase refunded/cancelled in Play Console). Separately, the victory double-reward slot is cadence-capped to **≤5 presentations per local day** and is silenced at Phase 4+ (`REWARDED_DOUBLE_DAILY_CAP` / `REWARDED_DOUBLE_BLOCKED_FROM_PHASE` in `monetizationPrompts.ts`), so it legitimately disappears for the rest of the day after five shows — deep into a session it being gone is expected, not a bug.
  - **Banner ads currently render on ONE screen only** (`StatsScreen` — at the bottom of both the overview scroll and the achievements list), and are suppressed for ad-free/onboarding/Phase 4+. An owner who holds an ad-free entitlement will never see it. See `ads.shouldShowBanner`.

### Setup

- `npm install` is allowed. Fresh containers may start without `node_modules` — run `cd mobile && npm install` (or `npm ci` when `package-lock.json` is unchanged) once before tests/typecheck/lint.

### Testing

- See `CLAUDE.md` for the full test commands. Key: always use `npm test` (not `npx jest`).
- **Run all tests:** `cd mobile && npm test -- --no-coverage`
- **Run a single file:** `cd mobile && npm test -- --no-coverage --testPathPattern=<filename>`
- The suite is expected green (~3,250 tests across ~123 suites; counts drift as features land — not load-bearing). Date-sensitive tests construct dates with local components (`new Date(2026, 1, 9)`) — never ISO strings, which parse as UTC and break in timezones behind UTC.

### TypeScript

- `npx tsc --noEmit` (or `npm run typecheck`) in `mobile/` is expected clean. Note: RN's types accept `pointerEvents` only on View-typed components — `Image`/`Animated.Image` type neither the prop nor the style key. Decorative images that render behind interactive content don't need it (hit-testing favors later siblings / higher zIndex); if an image must block or pass touches, wrap it in a `<View pointerEvents=...>`.
- Lint: `npm run lint` (ESLint 9 flat config via `eslint-config-expo`, see `mobile/eslint.config.js`). Generated data files (`src/data/*Bank*.ts` — the glob must cover every bank family, including `lexiconBank*` — plus `src/dictionary.ts`) and `scripts/tools/*.mjs` are excluded.

### Gotchas

- `package-lock.json` is present — use `npm` (not pnpm/yarn) for dependency management.
- The `tsconfig.json` extends `expo/tsconfig.base` — this is resolved from `node_modules` after install.
- Puzzle bank `.ts` files in `src/data/` are generated (30 files: 12 core + 3 EXPERT + 15 Lexicon). The four stored standard banks contain EASY 453, MEDIUM 338, MEDIUM_PLUS 500 and HARD 457 boards from the gated regeneration. Fresh delivery additionally applies the current vocabulary and complete-route policy; stored counts are not the eligible pool counts. Do not manually edit banks or run legacy generators or `generateBranchingTopUpA/B`, which overwrite the gated shape and lose its multi-route guarantee. The current `npm run generate:puzzles -- <standard|reverse|double> <difficulty>` command dispatches to gated drivers and writes sidecars only; prefix the difficulty with `LEX_` for Lexicon. Review the printed sidecar and use the targeted swap dry run before installation: `node scripts/swapGatedBanks.mjs <minimum-count> <family> <difficulty> --dry-run`. Remove `--dry-run` only after review, then always run `node scripts/tools/purgeProfanity.mjs` and the current vocabulary/route checks. See the Regenerating puzzle banks section in `CLAUDE.md` for supported arguments and validation.
- App icons, splash, notification icon, the SFX pack, the world/pixel art, and the UI icon sprites are generated: `npm run generate:assets` (pure-Node scripts in `mobile/scripts/tools/`).
