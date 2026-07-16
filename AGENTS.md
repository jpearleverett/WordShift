# WordShift - Agent Instructions

## Cursor Cloud specific instructions

### Project overview

WordShift is a React Native (Expo SDK 56) mobile word puzzle game. The app codebase is in the repo's `mobile/` directory. No Docker dependency. The core game is client-side (all gameplay state in AsyncStorage); backend features (Supabase cloud save / daily leaderboard / anonymous analytics, Sentry crash reporting) and monetization (RevenueCat in-app purchases, AdMob ads) activate when their keys are set in `app.json` → `expo.extra`, and degrade to no-ops when absent. The Supabase/Sentry keys and the **Android** monetization keys are currently configured (iOS monetization keys are still empty → NoOp on iOS); in Expo Go the native IAP/ads modules are absent, so those degrade to no-ops there regardless — the app still builds and runs in Expo Go.

### Running the app

- **Primary target is Expo Go (iOS/Android).** In this VM there is no device/emulator, so the interactive dev/test path is **web**: `cd mobile && npx expo start --web --port 8081`. The web deps (`react-dom`, `react-native-web`) are regular dependencies in `mobile/package.json` — a plain `npm install` covers them.
- **Important:** When loading in Chrome in this VM, you must open DevTools (F12) **before** navigating to `localhost:8081`, otherwise Chrome's renderer will crash with error code 4 on the large bundle. First load compiles an ~18MB bundle and can take 30-90s; be patient before reloading.
- **Web bundling needs `mobile/metro.config.js` (committed).** Some native-only modules break the web bundle at Metro resolve time even though they are runtime-guarded with `Platform.OS === 'web'`: `react-native-google-mobile-ads` (native codegen banner view) and the internal `react-native/Libraries/Text/Text` + `.../TextInput/TextInput` paths that `src/theme/fonts.ts` requires (they pull in the native Fabric renderer). `metro.config.js` redirects these to `web-shims/empty.js` **for web only** — native (iOS/Android) resolution is untouched, so real builds keep the real modules. Do NOT comment out these imports in source to "fix" web; the resolver shim is the correct, source-clean fix. If you add another native-only dep that breaks the web bundle, add it to `WEB_STUBBED_MODULES` there. Restart Metro after editing `metro.config.js` (config changes are not hot-reloaded).

### Setup

- `npm install` is allowed. Fresh containers may start without `node_modules` — run `cd mobile && npm install` (or `npm ci` when `package-lock.json` is unchanged) once before tests/typecheck/lint.

### Testing

- See `CLAUDE.md` for the full test commands. Key: always use `npm test` (not `npx jest`).
- **Run all tests:** `cd mobile && npm test -- --no-coverage`
- **Run a single file:** `cd mobile && npm test -- --no-coverage --testPathPattern=<filename>`
- The suite is expected green (~2,600 tests across ~105 suites; counts drift as features land — not load-bearing). Date-sensitive tests construct dates with local components (`new Date(2026, 1, 9)`) — never ISO strings, which parse as UTC and break in timezones behind UTC.

### TypeScript

- `npx tsc --noEmit` (or `npm run typecheck`) in `mobile/` is expected clean. Note: RN 0.85's types accept `pointerEvents` only on View-typed components — `Image`/`Animated.Image` type neither the prop nor the style key. Decorative images that render behind interactive content don't need it (hit-testing favors later siblings / higher zIndex); if an image must block or pass touches, wrap it in a `<View pointerEvents=...>`.
- Lint: `npm run lint` (ESLint 9 flat config via `eslint-config-expo`, see `mobile/eslint.config.js`). Generated data files (`src/data/puzzleBank*.ts`, `src/dictionary.ts`) are excluded.

### Gotchas

- `package-lock.json` is present — use `npm` (not pnpm/yarn) for dependency management.
- The `tsconfig.json` extends `expo/tsconfig.base` — this is resolved from `node_modules` after install.
- Puzzle bank `.ts` files in `src/data/` are auto-generated and large (~480 puzzles each after the profanity filter pass, 12 files). Do not manually edit these — regenerate with `npm run generate:puzzles`, then run `node scripts/tools/purgeProfanity.mjs`.
- App icons, splash, notification icon, the SFX pack, the world/pixel art, and the UI icon sprites are generated: `npm run generate:assets` (pure-Node scripts in `mobile/scripts/tools/`).
