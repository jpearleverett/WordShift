# WordShift - Development Guide

## Cursor Cloud specific instructions

### Project overview

WordShift is a React Native (Expo SDK 54) mobile word puzzle game. The entire app lives in the `mobile/` directory. There is no backend, no web app, and no database — all persistence is local (MMKV/AsyncStorage). Detailed documentation is in `CLAUDE.md` at the repo root.

### Running tests

All 941 tests (33 suites) run in Node via Jest — no emulator or device required.

```bash
cd mobile && npm test -- --no-coverage                              # full suite
cd mobile && npm test -- --no-coverage --testPathPattern=<filename> # single file
```

Do NOT use `npx jest` directly — always use `npm test` which routes through the locally installed Jest.

### TypeScript

The codebase has some pre-existing TS errors (`npx tsc --noEmit` reports ~22 errors). These are type-level mismatches (readonly transforms, style property names, async/sync return type differences) that do not affect runtime behavior — all tests pass and Metro starts cleanly. Do not attempt to fix these unless specifically asked.

### Starting Metro (dev server)

```bash
cd mobile && npx expo start --dev-client
```

This starts the Metro bundler on port 8081. A physical device with a custom Expo Dev Client build is needed to run the actual app — the bundler alone just serves the JS bundle.

### Key gotchas

- **Always use `--legacy-peer-deps`** when running `npm install` — peer dependency conflicts between Expo SDK 54 packages will cause installation failures otherwise.
- **Storage is synchronous** — all service functions use MMKV (sync). Never chain `.then()`/`.catch()` on service return values; use `try/catch` and direct assignment.
- **Test mocks** — Jest `moduleNameMapper` in `jest.config.js` redirects `react-native-mmkv` and `react-native-nitro-modules` to in-memory mocks. Use `createMockStorage()` from `src/__tests__/helpers/mockStorage.ts` for test setup.
- **No lint command** — there is no ESLint or dedicated lint script configured in `package.json`. TypeScript type-checking (`npx tsc --noEmit`) is the closest equivalent.
