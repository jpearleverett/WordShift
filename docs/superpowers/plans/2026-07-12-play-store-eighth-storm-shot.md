# WordShift Eighth Storm Shot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an eighth authentic Google Play screenshot using WordShift's real Phase 3 storm home, with polished ominous copy and full deterministic-pipeline coverage.

**Architecture:** Extend the campaign manifest and scenario contract from seven to eight ordered shots, seed a production-shaped `home-storm` fixture at internal Phase 3, and let the existing Playwright capture/composition pipeline publish the new source/final PNGs atomically. Level 8 inherits the existing cumulative atmospheric frame treatment; the real storm capture supplies the stronger final escalation without fabricated UI or Phase 4 robes.

**Tech Stack:** Expo SDK 56, React Native Web, TypeScript, Playwright, Node test runner, Jest, `pngjs`, GitHub Actions.

**Source of truth:** `docs/superpowers/specs/2026-07-12-play-store-eighth-storm-shot-design.md`

---

## Task 1: Extend the Campaign Contract to Eight Shots

**Files:**
- Modify: `docs/play-store/campaign.json`
- Modify: `docs/STORE_LISTING.md`
- Modify: `mobile/src/dev/playStoreScenarios.ts`
- Modify: `mobile/src/__tests__/playStoreScenario.test.ts`
- Modify: `mobile/scripts/tools/capturePlayStoreHelpers.mjs`
- Modify: `mobile/scripts/tools/capturePlayStoreScreenshots.test.mjs`
- Modify: `mobile/scripts/tools/playStoreAssets.test.mjs`
- Modify: `mobile/scripts/tools/validatePlayStoreAssets.mjs`
- Modify: `mobile/scripts/tools/composePlayStoreFeatureGraphic.mjs`
- Modify: `mobile/scripts/tools/playStoreDeterminismCore.mjs`
- Test: `mobile/scripts/tools/verifyPlayStoreDeterminism.test.mjs`

- [ ] **Step 1: Write failing eight-shot contract tests**

Add exact expectations for:

```ts
const EXPECTED_SCENARIOS = [
  'puzzle-preview',
  'puzzle-chain',
  'home-sunny',
  'animal-dialogue',
  'variant-menu',
  'flawless-victory',
  'home-dusk',
  'home-storm',
];
```

Add exact shot-8 metadata expectations:

```ts
{
  scenario: 'home-storm',
  source: '08_home_storm.png',
  final: '08_something_stirs.png',
  headline: 'SOMETHING STIRS IN THE AIR',
  support: 'Your friends know more than they are willing to say.',
  altText: 'WordShift animal house beneath a storm-dark sky, with familiar companions waiting inside dimly lit rooms.',
  theme: 'mystery',
  uneaseLevel: 8,
}
```

Update exact-set expectations to nine entries per publication directory:
eight screenshots plus that directory's feature asset. Update generated-output
expectations to 17 paths: eight sources, eight finals, one final feature graphic.

- [ ] **Step 2: Run contract tests and verify red**

Run:

```bash
cd mobile
npm test -- --no-coverage --runInBand --testPathPattern=playStoreScenario.test.ts
npm run test:play-store-assets
```

Expected: failures report seven scenarios, missing `home-storm`, invalid level
8, old eight-file directory counts, and old 15-output determinism counts.

- [ ] **Step 3: Implement the eight-shot metadata and counts**

Append the exact manifest object above. Add `home-storm` to
`PLAY_STORE_SCENARIO_NAMES` and `APPROVED_SCENARIOS`. Update strict counts from
7 to 8 screenshots, 8 to 9 directory entries, and 15 to 17 generated outputs.
Keep exact-set validation strict; do not accept arbitrary extra PNGs.

Update `docs/STORE_LISTING.md` so the screenshot table and upload instructions
list eight shots in the manifest order. Keep alt text visible-only and at most
140 characters.

- [ ] **Step 4: Run contract tests and verify green**

Run the two commands from Step 2.

Expected: scenario tests and tooling tests pass with eight-shot assertions.

- [ ] **Step 5: Commit and push Task 1**

```bash
git add docs/play-store/campaign.json docs/STORE_LISTING.md \
  mobile/src/dev/playStoreScenarios.ts \
  mobile/src/__tests__/playStoreScenario.test.ts \
  mobile/scripts/tools/capturePlayStoreHelpers.mjs \
  mobile/scripts/tools/capturePlayStoreScreenshots.test.mjs \
  mobile/scripts/tools/playStoreAssets.test.mjs \
  mobile/scripts/tools/validatePlayStoreAssets.mjs \
  mobile/scripts/tools/composePlayStoreFeatureGraphic.mjs \
  mobile/scripts/tools/playStoreDeterminismCore.mjs \
  mobile/scripts/tools/verifyPlayStoreDeterminism.test.mjs
git commit -m "feat: extend Play Store campaign to eight shots"
git push -u origin cursor/play-store-assets-impl-a2df
```

---

## Task 2: Build the Authentic Phase 3 Storm Fixture and Capture

**Files:**
- Modify: `mobile/src/dev/playStoreScenarios.ts`
- Modify: `mobile/src/__tests__/playStoreScenario.test.ts`
- Modify: `mobile/scripts/tools/capturePlayStoreScreenshots.mjs`
- Modify: `mobile/scripts/tools/capturePlayStoreScreenshots.test.mjs`

- [ ] **Step 1: Write failing production-hydration tests**

Add a `home-storm` fixture test that hydrates through production loaders and
asserts:

```ts
expect(progress.currentPhase).toBe(3);
expect(progress.phaseProgress).toBeGreaterThanOrEqual(PHASE_THRESHOLDS[3]);
expect(progress.phaseProgress).toBeLessThan(PHASE_THRESHOLDS[4]);
expect(progress.pendingPhaseTransition).toBeNull();
expect(progress.postRevelation).toBe(false);
expect(progress.unlockedAnimals).toEqual(
  expect.arrayContaining(['fox', 'pangolin', 'owl', 'axolotl'])
);
expect(progress.unlockedRooms).toEqual(
  expect.arrayContaining(['cozy_den', 'kitchen', 'study', 'aquarium'])
);
```

Also assert the scenario does not set Phase 4 or post-revelation state and uses
the current schema version, seeded reduced motion, suppressed one-time prompts,
and no pending modal.

- [ ] **Step 2: Run the scenario test and verify red**

Run:

```bash
cd mobile
npm test -- --no-coverage --runInBand --testPathPattern=playStoreScenario.test.ts
```

Expected: `home-storm` has no fixture builder or production-hydrated Phase 3
progress.

- [ ] **Step 3: Implement `stormProgress()`**

Create a production-shaped progress builder with:

```ts
currentPhase: 3,
phaseProgress: 170,
puzzlesSolved: 145,
phaseProgressFraction:
  (170 - PHASE_THRESHOLDS[3]) /
  (PHASE_THRESHOLDS[4] - PHASE_THRESHOLDS[3]),
pendingPhaseTransition: null,
postRevelation: false,
```

Use coherent amber/streak/completed-difficulty values and the same four familiar
rooms/animals as the readable home campaign states. Seed prompt, notification,
achievement, harvest, dialogue, and first-win flags consistently with the other
capture fixtures so no modal or toast can obscure the home.

- [ ] **Step 4: Write failing capture-interaction tests**

Require `prepareScenario(page, 'home-storm')` to:

1. Wait for the home world and the expected companion labels.
2. Pan the real HouseWorld gesture surface to a deterministic framing.
3. Require all intended companions and the house signage to clear the header
   and PLAY dock.
4. Wait for fonts/images and capture-freeze readiness.
5. Avoid any capture-only sky override.

Add a source audit expectation that the source filename is
`08_home_storm.png` and the capture route uses the normal `currentPhase` render.

- [ ] **Step 5: Implement the capture path**

Add a `home-storm` branch to `prepareScenario`. Reuse the existing semantic
pan/visibility helpers, but keep storm-specific framing in a named helper if
its geometry differs from the sunny/dusk shots. Do not change
`HouseWorld.tsx`'s shipped mapping:

```ts
currentPhase >= 4 ? SKY_SHADOW :
currentPhase >= 3 ? SKY_STORM :
currentPhase >= 2 ? SKY_DUSK :
...
```

- [ ] **Step 6: Run scenario and capture tests**

Run:

```bash
npm test -- --no-coverage --runInBand --testPathPattern=playStoreScenario.test.ts
npm run test:play-store-capture
```

Expected: all tests pass and the fixture is an authentic internal Phase 3 home.

- [ ] **Step 7: Commit and push Task 2**

```bash
git add mobile/src/dev/playStoreScenarios.ts \
  mobile/src/__tests__/playStoreScenario.test.ts \
  mobile/scripts/tools/capturePlayStoreScreenshots.mjs \
  mobile/scripts/tools/capturePlayStoreScreenshots.test.mjs
git commit -m "feat: capture authentic storm-era home"
git push -u origin cursor/play-store-assets-impl-a2df
```

---

## Task 3: Extend the Editorial Composition Through Unease Level 8

**Files:**
- Modify: `mobile/scripts/tools/playStoreUnease.mjs`
- Modify: `mobile/scripts/tools/composePlayStoreScreenshots.mjs`
- Modify: `mobile/scripts/tools/auditPlayStoreUnease.mjs`
- Modify: `mobile/scripts/tools/playStoreAssets.test.mjs`

- [ ] **Step 1: Write failing level-8 composition tests**

Add tests proving:

- Unease levels must now be exactly `1, 2, 3, 4, 5, 6, 7, 8`.
- Level 8 renders every cue whose `minLevel <= 7`.
- Level 8 introduces no new fabricated cue node.
- The headline uses Figtree Bold and support uses Shantell Regular.
- The frame remains within 1080x1920 and avoids protected UI regions.
- Source `08_home_storm.png` remains byte-identical before and after composition.
- Full-size and thumbnail visibility metrics classify level 8 as high unease.

- [ ] **Step 2: Run composition tests and verify red**

Run:

```bash
cd mobile
node --test scripts/tools/playStoreAssets.test.mjs
```

Expected: level 8 is rejected by the old range/profile assumptions.

- [ ] **Step 3: Implement level-8 support without a fake horror overlay**

Extend `validateUneaseLevel()` and ordered-level validation to 8. Keep
`UNEASE_CUE_REGISTRY` unchanged: level 8 inherits all level 1-7 cues. Add or
retarget the high visibility audit profile so both level 7 and level 8 are
audited, with the storm source providing the final visual escalation.

Do not add a monster, robe, new eye pair, text inside the app capture, or a
capture-only color filter.

- [ ] **Step 4: Run composition and audit tests**

Run:

```bash
npm run test:play-store-assets
```

Expected: all tooling tests pass with level-8 composition and source immutability.

- [ ] **Step 5: Commit and push Task 3**

```bash
git add mobile/scripts/tools/playStoreUnease.mjs \
  mobile/scripts/tools/composePlayStoreScreenshots.mjs \
  mobile/scripts/tools/auditPlayStoreUnease.mjs \
  mobile/scripts/tools/playStoreAssets.test.mjs
git commit -m "feat: extend mystery composition to storm shot"
git push -u origin cursor/play-store-assets-impl-a2df
```

---

## Task 4: Regenerate, Inspect, and Publish the Eight-Shot Campaign

**Files:**
- Create: `docs/play-store/source/08_home_storm.png`
- Create: `docs/play-store/final/08_something_stirs.png`
- Regenerate only if deterministic bytes change:
  `docs/play-store/source/01_puzzle_preview.png` through
  `docs/play-store/source/07_home_dusk.png`
- Regenerate only if deterministic bytes change:
  `docs/play-store/final/01_shift_one_letter.png` through
  `docs/play-store/final/07_theyve_been_waiting.png`
- Preserve unchanged:
  `docs/play-store/source/feature-background.png`
- Preserve unchanged:
  `docs/play-store/final/feature-graphic.png`
- Preserve unchanged:
  `docs/feature-graphic.png`
- Modify: `docs/LAUNCH_CHECKLIST.md`

- [ ] **Step 1: Record protected feature hashes**

Run:

```bash
sha256sum \
  docs/play-store/source/feature-background.png \
  docs/play-store/final/feature-graphic.png \
  docs/feature-graphic.png
```

Expected:

```text
d5e6371e06f458b91f15c7cfd2d3fc348cfd3937c2172a9d5fea3c2c3ce98c44
a0e16100526e2981311bcd81a5eda56edacf1a12e4b5ed39f2f1d808825c30f1
a0e16100526e2981311bcd81a5eda56edacf1a12e4b5ed39f2f1d808825c30f1
```

- [ ] **Step 2: Generate the complete campaign**

Run:

```bash
cd mobile
npm run generate:play-store
```

Expected: eight source screenshots, eight final screenshots, and exact
nine-entry source/final directories validate.

- [ ] **Step 3: Inspect shot 8 at full size and thumbnail size**

Verify directly:

- `sky_storm.png` is visible.
- The house uses Phase 3 dark tint and non-robed animal sprites.
- Any shipped Phase 3 shadow remains faint and unenhanced; no Phase 4 entity
  treatment or Phase 4 copy is exposed.
- Headline and support copy are exact and readable.
- The house and controls are not clipped or obscured.
- Shot 8 is visually more ominous than shot 7.

If any requirement fails, fix the scenario framing or metadata, regenerate, and
repeat this inspection before proceeding.

- [ ] **Step 4: Run isolated two-run determinism verification**

Run:

```bash
npm run verify:play-store-determinism
```

Expected: 17/17 encoded hashes, decoded RGBA hashes, and file modes match
between isolated runs and the checked-in publication; protected feature hashes
match the manifest.

- [ ] **Step 5: Run all release gates**

Run:

```bash
npm run typecheck
npm run lint
npm test -- --no-coverage --ci
npm run test:play-store-assets
npm run validate:play-store
npx expo export --platform web --output-dir /tmp/wordshift-eight-shot-final-web
```

Expected: typecheck passes; lint has zero errors; all Jest/tooling tests pass;
exact asset validation passes; web export completes.

- [ ] **Step 6: Update the launch checklist**

Change generated/upload wording from seven screenshots to eight screenshots and
record the 17-output determinism result. Keep Play Console upload unchecked.

- [ ] **Step 7: Commit and push generated assets**

```bash
git add docs/play-store/source docs/play-store/final \
  docs/LAUNCH_CHECKLIST.md
git commit -m "assets: add ominous storm campaign shot"
git push -u origin cursor/play-store-assets-impl-a2df
```

---

## Task 5: Final Review and Walkthrough

**Files:**
- Temporary gallery outside the repository
- User-facing artifacts under `/opt/cursor/artifacts/`

- [ ] **Step 1: Run independent specification review**

Review the branch against
`docs/superpowers/specs/2026-07-12-play-store-eighth-storm-shot-design.md`.
Resolve every missing or misinterpreted requirement and re-review.

- [ ] **Step 2: Run independent code and visual quality review**

Inspect the complete branch, all eight source/final PNG pairs, tests, exact-set
validation, CI, and documentation. Resolve every Critical or Important finding.

- [ ] **Step 3: Create and record the final gallery**

Create a temporary fullscreen gallery showing:

1. Approved feature graphic.
2. All eight thumbnails in order.
3. Full shots 1 through 8.

Record a clean walkthrough with no browser chrome, DevTools, or setup UI. End
on the storm shot and video-review the artifact before referencing it.

- [ ] **Step 4: Confirm remote CI**

Wait for the exact final commit's `Typecheck, Lint & Test` and
`Play Store Asset Gates` jobs to pass. Do not claim completion from an earlier
commit's run.

- [ ] **Step 5: Update the existing draft pull request**

Keep base `main`, update the summary from seven to eight shots, replace the
walkthrough artifact with the final eight-shot recording, and report the
current validation counts. Do not mark the pull request ready or merge it.