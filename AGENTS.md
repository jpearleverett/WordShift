# WordShift - Agent Instructions

## Cursor Cloud specific instructions

### Project overview

WordShift is a React Native (Expo SDK 54) mobile word puzzle game. The codebase is in `/workspace/mobile/`. There is no backend, database, or Docker dependency — it is entirely client-side.

### Running the app

- **Dev server:** `cd mobile && npx expo start --web --port 8081` for browser testing.
- **Important:** When loading in Chrome in this VM, you must open DevTools (F12) **before** navigating to `localhost:8081`, otherwise Chrome's renderer will crash with error code 4 on the large bundle.
- The web deps (`react-dom`, `react-native-web`) must be installed via `npx expo install react-dom react-native-web` (already done in the update script).

### Testing

- See `CLAUDE.md` for the full test commands. Key: always use `npm test` (not `npx jest`).
- **Run all tests:** `cd mobile && npm test -- --no-coverage`
- **Run a single file:** `cd mobile && npm test -- --no-coverage --testPathPattern=<filename>`
- The suite is expected green (~1,044 tests across 37 suites). Date-sensitive tests construct dates with local components (`new Date(2026, 1, 9)`) — never ISO strings, which parse as UTC and break in timezones behind UTC.

### TypeScript

- `npx tsc --noEmit` (or `npm run typecheck`) in `mobile/` is expected clean. Note: RN 0.81's types accept `pointerEvents` only on View-typed components — `Image`/`Animated.Image` type neither the prop nor the style key. Decorative images that render behind interactive content don't need it (hit-testing favors later siblings / higher zIndex); if an image must block or pass touches, wrap it in a `<View pointerEvents=...>`.
- Lint: `npm run lint` (ESLint 9 flat config via `eslint-config-expo`, see `mobile/eslint.config.js`). Generated data files (`src/data/puzzleBank*.ts`, `src/dictionary.ts`) are excluded.

### Gotchas

- `package-lock.json` is present — use `npm` (not pnpm/yarn) for dependency management.
- The `tsconfig.json` extends `expo/tsconfig.base` — this is resolved from `node_modules` after install.
- Puzzle bank `.ts` files in `src/data/` are auto-generated and large (~480 puzzles each after the profanity filter pass, 12 files). Do not manually edit these — regenerate with `npm run generate:puzzles`, then run `node scripts/tools/purgeProfanity.mjs`.
- App icons, splash, notification icon, and the SFX pack are generated: `npm run generate:assets` (pure-Node scripts in `mobile/scripts/tools/`).
