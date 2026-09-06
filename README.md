# WordShift

A word puzzle game where you shift letters between neighboring words in a chain to form new valid English words — with thirteen animal friends, a house to build, and a slow-burn story. A cozy word game that slowly becomes something else.

The tonal shift is a designed surprise. This README keeps it unspoiled; [CLAUDE.md](./CLAUDE.md) does not.

## Play loop

1. You see a chain of words (3–5 rows of 4–6 letter words, depending on difficulty; the Daily Challenge board ramps across the week, peaking at 6 letters on Sunday).
2. Pick a letter from the current word — the word shrinks and must remain a valid word.
3. Drop it into the next word — that word grows and must also be valid.
4. Reach the end of the chain to win. Earn amber, build the house, meet the animals, and watch the world change.

Variants: **Reverse Shift** (down the chain, then back up, with cumulative letter locking) and **Double Shift** (two letters per move, up to 7 rows at EXPERT). On top of any style you can stack four modifiers: **Challenge** (capped undos, no hints), **Speed Shift** (a clock with an escalating round timer), **Blind Offering** (previews hidden), and **Lexicon** (rare-word vocabulary). Plus a deterministic **Daily Challenge** (unlocks after 8 puzzles) with streaks and streak freezes, weekly quests, 56 achievements, and a phase-aware theming system that re-skins every screen, message, and animation as the story unfolds.

Monetization is convenience/expression only, never progression: a cosmetic shop bought with in-game amber, optional consumable amber/hint packs, a one-time starter pack, a cosmetic bundle, an optional Patron / Remove-Ads purchase, an optional monthly Supporter subscription (ad-free plus a monthly amber stipend), a cosmetic season pass, and gently-paced ads (GDPR/UMP consent-gated).

## Tech

React Native + Expo SDK 57 (React Native 0.86), TypeScript (strict), Jest and rendered Playwright journeys (current results are in the implementation ledger). Local-first: the core puzzles play fully offline with all state in AsyncStorage, and there are no user accounts. Backend features (cloud save, daily leaderboard, anonymous analytics via **Supabase**; crash reporting via **Sentry**) and monetization (in-app purchases via **RevenueCat**, ads via **AdMob**) activate when their keys are present in `app.json` → `extra` and degrade to no-ops otherwise — so Expo Go still runs everything. Supabase/Sentry and the Android monetization keys are currently configured; the iOS monetization keys are still empty (iOS falls back to the no-op providers). See [CLAUDE.md](./CLAUDE.md) for the full architecture reference — it's the canonical codebase doc.

Current engineering status: [September implementation ledger](docs/IMPLEMENTATION_STATUS_2026-09-05.md). Account/device handoff: [completion record](docs/COMPLETION_HANDOFF_2026-09-06.md). The 1.3.0 Supabase integrity endpoints still require the prepared hosted migration; configured public keys alone do not install them. Build/update procedure: [1.3.0 release validation](docs/RELEASE_VALIDATION_1_3_0.md).

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

Always use `npm test` for repository checks. CI (`.github/workflows/ci.yml`) checks types, lint, tests, story and puzzle integrity, and rendered game journeys on pull requests and pushes to `main` or `feature/**`.

### Generated content

- **Puzzle banks**: use `npm run generate:puzzles -- <standard|reverse|double> <difficulty>` from `mobile/`, with `EASY`, `MEDIUM`, `MEDIUM_PLUS`, `HARD` or `EXPERT`; prefix a difficulty with `LEX_` for Lexicon. This command dispatches to the **gated toolkit** and writes reviewable sidecars. Follow the printed targeted swap dry run before installing a reviewed sidecar, then always run `node scripts/tools/purgeProfanity.mjs` and the current vocabulary/complete-route checks. See [the regeneration instructions](CLAUDE.md#regenerating-puzzle-banks). Never run legacy generators or manually edit the banks: that can overwrite the gated shape and lose its multi-route guarantee.
- **Art/SFX**: `npm run generate:assets` rebuilds the app icon, splash, notification icon, the 70-file WAV pack, the world/pixel art, and the UI icon sprites from pure-Node scripts in `mobile/scripts/tools/`.
- **Builds**: `eas build` profiles live in `mobile/eas.json` (`appVersionSource: "local"` — bump `android.versionCode` manually for each release). Current account/device requirements and prepared commands are in [the completion handoff](./docs/COMPLETION_HANDOFF_2026-09-06.md).

## Docs

- [CLAUDE.md](./CLAUDE.md) — architecture, systems, conventions (read this first; contains full narrative spoilers)
- [docs/COMPLETION_HANDOFF_2026-09-06.md](./docs/COMPLETION_HANDOFF_2026-09-06.md) — current account, physical-device and reader requirements
- [docs/LAUNCH_CHECKLIST.md](./docs/LAUNCH_CHECKLIST.md) — historical launch checks
- [docs/STORE_LISTING.md](./docs/STORE_LISTING.md) — store listing copy, keywords, age rating, screenshot shot list
- [docs/BACKEND_SETUP.md](./docs/BACKEND_SETUP.md) — Supabase / Sentry provisioning (cloud save, leaderboard, analytics, crash reporting)
- [docs/MONETIZATION_SETUP.md](./docs/MONETIZATION_SETUP.md) — RevenueCat (IAP) + AdMob (ads) store/product setup
- [docs/OTA_UPDATES.md](./docs/OTA_UPDATES.md) — over-the-air JS/asset updates via EAS Update
- Legal, live via GitHub Pages: [Privacy Policy](https://jpearleverett.github.io/WordShift/privacy-policy/) · [Terms of Service](https://jpearleverett.github.io/WordShift/terms/) · [Data Deletion](https://jpearleverett.github.io/WordShift/data-deletion/) (sources in [docs/](./docs/))

## Content rating

The story carries mild horror / dark-fantasy themes as it unfolds. The intended audience is 13+. Store-issued age ratings must follow the current questionnaires; see [the listing instructions](./docs/STORE_LISTING.md). The puzzle dictionary and required Double Shift intermediate strings are profanity-filtered.
