# WordShift Seven-Shot Mystery Campaign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the existing Play Store campaign on latest `main` as seven authentic screenshots using the Figtree/Shantell hierarchy and a progressively stronger spoiler-safe mystery treatment.

**Architecture:** Merge `origin/main` into the campaign branch without rewriting history, preserve the deterministic capture pipeline, and regenerate authentic UI states using main's current components and fonts. Campaign metadata drives seven ordered captures plus a numeric unease level; the Playwright composer renders Figtree headlines, Shantell support text, and capture-safe atmospheric overlays without altering raw screenshots.

**Tech Stack:** Git merge workflow, Expo SDK 56, React Native, TypeScript, Playwright, `pngjs`, Jest, Node test runner.

---

## Task 1: Merge Latest Main Safely

**Files:** Resolve only files reported by `git merge origin/main`, especially:
- `mobile/App.tsx`
- `mobile/src/theme/fonts.ts`
- `mobile/src/theme/installGlobalFont.ts`
- `mobile/app.json`
- `mobile/package.json`
- `mobile/package-lock.json`
- `mobile/src/components/Row.tsx`
- `mobile/src/components/AnimatedBackground.tsx`
- `mobile/src/components/puzzle/DifficultyMenu.tsx`
- `mobile/src/components/puzzle/Toast.tsx`
- `docs/STORE_LISTING.md`
- `docs/LAUNCH_CHECKLIST.md`
- `.gitignore`

- [ ] Fetch and merge, never rebase or force-push:

```bash
git fetch origin main
git merge origin/main
```

- [ ] Resolve with these rules:
  - Main owns gameplay, monetization, FTUE, live-event, creator-kit, and commercial-readiness behavior.
  - Campaign owns `src/dev/playStore*`, web-safe adapters, font platform split, capture suppression, deterministic capture hooks, scripts, tests, and `docs/play-store/`.
  - Font result uses main's Figtree `PIXEL_FONT*` aliases and Shantell `BODY_FONT*` aliases while preserving `installGlobalFont.ts` plus `installGlobalFont.web.ts`.
  - `app.json` keeps main's Figtree registration and all current plugins.
  - Package files contain both main dependencies and campaign Playwright/scripts.
  - Store docs keep the generated/upload split while absorbing newer truthful launch facts from main.

- [ ] Install exactly from the resolved lockfile and run focused gates:

```bash
cd mobile
npm ci
npm run typecheck
npm test -- --no-coverage --runInBand --testPathPattern='(fontsPlatform|playStoreScenario|appIntegration|providerAdapters|toastMessage)'
npx expo export --platform web --output-dir /tmp/wordshift-seven-shot-merge-web
```

- [ ] Review the merge diff for dropped main or campaign behavior, then push the merge commit.

---

## Task 2: Convert Campaign Data to Seven Shots

**Files:**
- Modify: `docs/play-store/campaign.json`
- Modify: `mobile/src/dev/playStoreScenarios.ts`
- Modify: `mobile/src/__tests__/playStoreScenario.test.ts`
- Modify: `mobile/scripts/tools/capturePlayStoreScreenshots.mjs`
- Modify: capture/asset tests
- Modify: `docs/STORE_LISTING.md`
- Modify: `docs/LAUNCH_CHECKLIST.md`

- [ ] Write failing tests expecting seven scenarios and exact filenames:

```text
01_puzzle_preview.png          -> 01_shift_one_letter.png
02_puzzle_chain.png            -> 02_every_word_stays_real.png
03_home_sunny.png              -> 03_build_a_home.png
04_animal_dialogue.png         -> 04_meet_unlikely_friends.png
05_variant_menu.png            -> 05_master_every_mode.png
06_flawless_victory.png        -> 06_flawless_offering.png
07_home_dusk.png               -> 07_theyve_been_waiting.png
```

- [ ] Remove `daily` from the capture scenario allowlist, builder, interactions, campaign metadata, exact-set validators, listing table, alt text, and generated/upload counts.

- [ ] Set exact support copy and `uneaseLevel`:

```json
[
  { "scenario": "puzzle-preview", "support": "Move it down. Keep both words real. Something remains.", "uneaseLevel": 1 },
  { "scenario": "puzzle-chain", "support": "Build a chain one clever move at a time. The words remember.", "uneaseLevel": 2 },
  { "scenario": "home-sunny", "support": "Your words bring every room to life. Every room was waiting.", "uneaseLevel": 3 },
  { "scenario": "animal-dialogue", "support": "They always have something to tell you. Never everything.", "uneaseLevel": 4 },
  { "scenario": "variant-menu", "support": "Reverse it. Race it. Hide the previews. The pattern still grows.", "uneaseLevel": 5 },
  { "scenario": "flawless-victory", "support": "No hints. No mistakes. It notices perfection.", "uneaseLevel": 6 },
  { "scenario": "home-dusk", "support": "Some houses remember every word.", "uneaseLevel": 7 }
]
```

- [ ] Keep existing headlines, update numbered paths and visible-state table rows, and ensure every alt text remains visible-only and at most 140 characters.

- [ ] Run red/green scenario, capture-manifest, metadata, no-em-dash, and exact-set tests.

- [ ] Commit and push the seven-shot data conversion.

---

## Task 3: Use Latest Fonts and Add Progressive Unease

**Files:**
- Modify: `mobile/scripts/tools/composePlayStoreScreenshots.mjs`
- Modify: `mobile/scripts/tools/playStoreAssets.test.mjs`
- Modify: campaign manifest tests

- [ ] Add failing composition tests proving:
  - Figtree Bold is embedded and used for headlines.
  - Shantell Regular is embedded and used for support lines.
  - `uneaseLevel` is an integer 1 through 7 and strictly increases.
  - Each level renders exactly its approved cumulative cues.
  - No cue changes the raw source PNG.
  - Text and cue geometry stay inside 1080x1920 bounds.

- [ ] Preserve the Storybook Editorial geometry and implement these deterministic overlays:
  1. Crimson glint plus imperfect grain in the outer frame.
  2. Level 1 plus a faint hairline sigil beneath the title.
  3. Level 2 plus tiny red pinpricks in a non-interactive distant area.
  4. Level 3 plus a low-opacity offset duplicate clipped to the existing character portrait area.
  5. Level 4 plus a thin crimson thread across the real mode-list region.
  6. Level 5 plus a red-shifted radial glow around the existing amber/reward region.
  7. Level 6 plus a stronger dusk vignette and watching eyes in the marketing frame.

- [ ] Cues must be CSS/SVG/raster overlays in the marketing composition only. They must not add buttons, change words, imply nonexistent mechanics, or expose the entity/robes/Phase 3+ copy.

- [ ] Keep the approved feature graphic byte-identical.

- [ ] Run composition integration tests, clipping tests, RGB validation, and deterministic repeat tests.

- [ ] Commit and push typography/mystery composition changes.

---

## Task 4: Regenerate on Latest Main

**Files:**
- Regenerate exact seven source PNGs in `docs/play-store/source/`
- Regenerate exact seven final PNGs in `docs/play-store/final/`
- Keep `feature-background.png`, `feature-graphic.png`, and legacy `docs/feature-graphic.png` unchanged

- [ ] Run:

```bash
cd mobile
npm run generate:play-store
```

- [ ] Verify each raw capture reflects latest main:
  - Figtree app chrome and Shantell body.
  - Standard mode previews visible.
  - Four-companion home framing.
  - Dialogue scene clean.
  - Six real modes only.
  - Flawless victory complete.
  - Phase 2 dusk finale without Phase 3+ spoilers.

- [ ] Run full validation. Exact source and final directories must contain seven screenshots plus one feature file each, with no stale daily files.

- [ ] Run the full pipeline twice and require identical encoded and decoded hashes for all 15 generated outputs.

- [ ] Inspect full-size and thumbnail sequence. Mystery must rise monotonically without overwhelming gameplay readability.

- [ ] Commit and push regenerated assets.

---

## Task 5: Final Verification and Delivery

- [ ] Run:

```bash
cd mobile
npm run typecheck
npm run lint
npm test -- --no-coverage --ci
npm run test:play-store-assets
npm run validate:play-store
npx expo export --platform web --output-dir /tmp/wordshift-seven-shot-final-web
```

- [ ] Confirm lint has zero errors, all tests pass, and branch is clean/synchronized.

- [ ] Create a temporary fullscreen gallery for the feature graphic and seven screenshots.

- [ ] Record and video-review a clean final walkthrough showing:
  - current feature graphic;
  - all seven thumbnails;
  - full screenshots 1 through 7;
  - visible Figtree/Shantell hierarchy;
  - progressive unease;
  - no Daily Challenge screenshot.

- [ ] Run independent spec-compliance and code-quality reviews. Resolve all Critical and Important issues and re-review.

- [ ] Update the existing implementation pull request base to `main`, replace walkthrough artifacts, and update validation results. Do not force-push or mark ready.
