# WordShift

A word puzzle game where you shift letters between stacked words to form new valid English words — wrapped in a slow-burn narrative that begins as a bright, candy-colored game with adorable animal companions and gradually descends into cosmic horror.

Every puzzle you solve is an incantation. The animals know.

## Play loop

1. You see a chain of words (3–5 rows).
2. Pick a letter from the current word — the word shrinks and must remain a valid word.
3. Drop it into the next word — that word grows and must also be valid.
4. Reach the bottom of the chain to win. Earn amber, build the house, meet the animals, and watch the world change.

Variants: **Reverse Shift** (down then back up, cumulative letter locking), **Double Shift** (two letters per move), **Speed Shift** (timed runs). Plus a deterministic **Daily Challenge**, streaks, weekly quests, 40 achievements, and a phase-based narrative system that re-skins every screen, message, and animation as the story darkens.

Monetization is convenience/expression only (never progression): a cosmetic shop bought with in-game amber, optional consumable amber/hint packs, a one-time cosmetic bundle, an optional Patron / Remove-Ads purchase, and gently-gated ads.

## Tech

React Native + Expo SDK 54, TypeScript (strict), Jest. Local-first — the core puzzles play fully offline with all state in AsyncStorage, and there are no user accounts. Optional backend features (cloud save, daily leaderboard, anonymous analytics via **Supabase**; crash reporting via **Sentry**) and monetization (in-app purchases via **RevenueCat**, ads via **AdMob**) activate only when their keys are present in `app.json` → `extra`, and degrade to no-ops otherwise (so Expo Go still runs everything). See [CLAUDE.md](./CLAUDE.md) for the full architecture reference (it's the canonical codebase doc).

## Development

```bash
cd mobile
npm install
npx expo start           # dev server (scan QR with Expo Go)
npm test -- --no-coverage
npm run typecheck
npm run lint
```

- **Puzzle banks**: `npm run generate:puzzles`, then always `node scripts/tools/purgeProfanity.mjs` (the generator does not filter offensive words).
- **Generated art/SFX**: `npm run generate:assets` rebuilds the app icon, splash, notification icon, and the 14-sound WAV pack from pure-Node scripts in `mobile/scripts/tools/`. World art (shadow figure, roof, ground, clouds…) comes from `generateWorldArt.mjs`.
- **Builds**: `eas build` profiles live in `mobile/eas.json`; store metadata notes in `docs/STORE_LISTING.md`.

## Docs

- [CLAUDE.md](./CLAUDE.md) — architecture, systems, conventions (read this first)
- [docs/BACKEND_SETUP.md](./docs/BACKEND_SETUP.md) — Supabase / Sentry provisioning (cloud save, leaderboard, analytics, crash reporting)
- [docs/MONETIZATION_SETUP.md](./docs/MONETIZATION_SETUP.md) — RevenueCat (IAP) + AdMob (ads) store/product setup
- [docs/privacy-policy.md](./docs/privacy-policy.md) · [docs/terms.md](./docs/terms.md) · [docs/data-deletion.md](./docs/data-deletion.md) — legal (served via GitHub Pages)
- [docs/STORE_LISTING.md](./docs/STORE_LISTING.md) — store listing copy, keywords, age rating, screenshot shot list

## Content rating

The story includes dark-fantasy/cosmic-horror themes (cult reveal, ritual framing, an unnamed entity). Target rating: ESRB Teen / PEGI 12. The puzzle dictionary is profanity-filtered.
