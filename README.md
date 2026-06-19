# WordShift

A word puzzle game where you shift letters between stacked words to form new valid English words — wrapped in a slow-burn narrative that begins as a bright, candy-colored game with adorable animal companions and gradually descends into cosmic horror.

Every puzzle you solve is an incantation. The animals know.

## Play loop

1. You see a chain of words (3–5 rows).
2. Pick a letter from the current word — the word shrinks and must remain a valid word.
3. Drop it into the next word — that word grows and must also be valid.
4. Reach the bottom of the chain to win. Earn amber, build the house, meet the animals, and watch the world change.

Variants: **Reverse Shift** (down then back up, cumulative letter locking), **Double Shift** (two letters per move), **Speed Shift** (timed runs). Plus a deterministic **Daily Challenge**, streaks, weekly quests, 34 achievements, and a phase-based narrative system that re-skins every screen, message, and animation as the story darkens.

## Tech

React Native + Expo SDK 54, TypeScript (strict), Jest. Entirely client-side — no backend, no accounts; all state in AsyncStorage. See [CLAUDE.md](./CLAUDE.md) for the full architecture reference (it's the canonical codebase doc).

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
- [docs/SHIP_ASSESSMENT.md](./docs/SHIP_ASSESSMENT.md) — current ship-readiness assessment (state, gaps, what's wired)
- [docs/privacy-policy.md](./docs/privacy-policy.md) · [docs/terms.md](./docs/terms.md) — legal (served via GitHub Pages)
- [MONETIZATION_PLAN.md](./MONETIZATION_PLAN.md) — post-launch plan (nothing implemented in 1.0)

## Content rating

The story includes dark-fantasy/cosmic-horror themes (cult reveal, ritual framing, an unnamed entity). Target rating: ESRB Teen / PEGI 12. The puzzle dictionary is profanity-filtered.
