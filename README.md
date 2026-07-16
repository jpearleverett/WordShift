# WordShift

A word puzzle game where you shift letters between neighboring words in a chain to form new valid English words — with thirteen animal friends, a house to build, and a slow-burn story. A cozy word game that slowly becomes something else.

The tonal shift is a designed surprise. This README keeps it unspoiled; [CLAUDE.md](./CLAUDE.md) does not.

## Play loop

1. You see a chain of words (3–5 rows of 4–5 letter words, depending on difficulty; the Daily Challenge uses 6-letter words).
2. Pick a letter from the current word — the word shrinks and must remain a valid word.
3. Drop it into the next word — that word grows and must also be valid.
4. Reach the end of the chain to win. Earn amber, build the house, meet the animals, and watch the world change.

Variants: **Reverse Shift** (down the chain, then back up, with cumulative letter locking), **Double Shift** (two letters per move, up to 6 rows), **Speed Shift** (timed runs with an escalating clock). Plus a deterministic **Daily Challenge** (unlocks after 8 puzzles) with streaks and streak freezes, weekly quests, 51 achievements, and a phase-aware theming system that re-skins every screen, message, and animation as the story unfolds.

Monetization is convenience/expression only, never progression: a cosmetic shop bought with in-game amber, optional consumable amber/hint packs, a one-time starter pack, a cosmetic bundle, an optional Patron / Remove-Ads purchase, and gently-paced ads (GDPR/UMP consent-gated).

## Tech

React Native + Expo SDK 56 (React Native 0.85), TypeScript (strict), Jest (~2,600 tests across ~105 suites — counts drift as features land). Local-first: the core puzzles play fully offline with all state in AsyncStorage, and there are no user accounts. Backend features (cloud save, daily leaderboard, anonymous analytics via **Supabase**; crash reporting via **Sentry**) and monetization (in-app purchases via **RevenueCat**, ads via **AdMob**) activate when their keys are present in `app.json` → `extra` and degrade to no-ops otherwise — so Expo Go still runs everything. Supabase/Sentry and the Android monetization keys are currently configured; the iOS monetization keys are still empty (iOS falls back to the no-op providers). See [CLAUDE.md](./CLAUDE.md) for the full architecture reference — it's the canonical codebase doc.

## Development

```bash
cd mobile
npm install              # or npm ci (fresh checkouts may lack node_modules)
npx expo start           # dev server (scan QR with Expo Go)
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint 9 flat config (eslint-config-expo)
```

### Testing

```bash
cd mobile
npm test -- --no-coverage                              # full suite
npm test -- --no-coverage --testPathPattern=<filename> # one suite
```

Always use `npm test`, not `npx jest` — the latter misses the local install and triggers a remote download. CI (`.github/workflows/ci.yml`) runs `npm ci` → typecheck → lint → test on every PR and on push to `main`.

### Generated content

- **Puzzle banks**: `npm run generate:puzzles`, then always run `node scripts/tools/purgeProfanity.mjs` (the generator does not filter offensive words).
- **Art/SFX**: `npm run generate:assets` rebuilds the app icon, splash, notification icon, the 32-file WAV pack, the world/pixel art, and the UI icon sprites from pure-Node scripts in `mobile/scripts/tools/`.
- **Builds**: `eas build` profiles live in `mobile/eas.json` (`appVersionSource: "local"` — bump `android.versionCode` manually for each release). Remaining human release tasks are tracked in [docs/LAUNCH_CHECKLIST.md](./docs/LAUNCH_CHECKLIST.md).

## Docs

- [CLAUDE.md](./CLAUDE.md) — architecture, systems, conventions (read this first; contains full narrative spoilers)
- [docs/LAUNCH_CHECKLIST.md](./docs/LAUNCH_CHECKLIST.md) — remaining human release tasks (consoles, secrets, physical-device checks)
- [docs/STORE_LISTING.md](./docs/STORE_LISTING.md) — store listing copy, keywords, age rating, screenshot shot list
- [docs/BACKEND_SETUP.md](./docs/BACKEND_SETUP.md) — Supabase / Sentry provisioning (cloud save, leaderboard, analytics, crash reporting)
- [docs/MONETIZATION_SETUP.md](./docs/MONETIZATION_SETUP.md) — RevenueCat (IAP) + AdMob (ads) store/product setup
- [docs/OTA_UPDATES.md](./docs/OTA_UPDATES.md) — over-the-air JS/asset updates via EAS Update
- Legal, live via GitHub Pages: [Privacy Policy](https://jpearleverett.github.io/WordShift/privacy-policy/) · [Terms of Service](https://jpearleverett.github.io/WordShift/terms/) · [Data Deletion](https://jpearleverett.github.io/WordShift/data-deletion/) (sources in [docs/](./docs/))

## Content rating

The story carries mild horror / dark-fantasy themes as it unfolds. Target rating: ESRB Teen / PEGI 12. The puzzle dictionary is profanity-filtered.
