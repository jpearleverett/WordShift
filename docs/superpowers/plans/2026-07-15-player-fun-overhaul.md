# Player Fun Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved player-fun overhaul across prompt pacing, puzzle depth, narrative restraint, Phase 5 mastery, late-animal pacing, and pit cadence.

**Architecture:** Extend existing services rather than add parallel systems. Keep all policy decisions pure and directly tested; App and components orchestrate those policies. Reuse `wordshift_monet_prompts`, `wordshift_mastery`, and `wordshift_home_progress` for persistence.

**Tech Stack:** React Native, Expo SDK 56, TypeScript strict, AsyncStorage, Jest/ts-jest.

## Global Constraints

- Swift Victories remain opt-in and default to `false`.
- Rewarded victory doubling remains available up to two times per local day.
- The first eight puzzles remain free of interstitials.
- Phase 4 and Phase 5 remain free of interstitials and rewarded-double offers.
- No phase labels or progress bars may expose the phase system.
- All new player-facing text is phase-aware, in-world, and contains no em dash.
- The cold-open puzzle, preview-grading ramp, tactile move feedback, pit ceremonies, final-board undo refusal, silent finale, and terrible-peace tone remain unchanged.
- Standard-bank files are not regenerated or manually edited.
- Every production behavior change follows a failing-test-first red/green cycle.

---

### Task 1: Pace Proactive Exit Nudges

**Files:**
- Modify: `mobile/src/constants/gameBalance.ts`
- Modify: `mobile/src/services/monetizationPrompts.ts`
- Modify: `mobile/App.tsx`
- Modify: `mobile/src/__tests__/monetizationPrompts.test.ts`
- Modify: `mobile/src/__tests__/appIntegration.test.ts`

**Interfaces:**
- Produce: `EXIT_NUDGE_MIN_PUZZLES = 12`
- Produce: `EXIT_NUDGE_SPACING_PUZZLES = 5`
- Produce: `canShowExitNudge(puzzlesSolved: number): Promise<boolean>`
- Produce: `recordExitNudgeShown(puzzlesSolved: number): Promise<void>`
- Extend: `MonetPromptState.lastExitNudgePuzzle: number | null`

- [ ] **Step 1: Write failing policy tests**

Add tests proving:

```ts
expect(shouldAllowExitNudge({ puzzlesSolved: 11, lastExitNudgePuzzle: null })).toBe(false);
expect(shouldAllowExitNudge({ puzzlesSolved: 12, lastExitNudgePuzzle: null })).toBe(true);
expect(shouldAllowExitNudge({ puzzlesSolved: 16, lastExitNudgePuzzle: 12 })).toBe(false);
expect(shouldAllowExitNudge({ puzzlesSolved: 17, lastExitNudgePuzzle: 12 })).toBe(true);
```

Also assert persistence/reset behavior and retain the existing two-per-day rewarded-double assertions.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

`npm test -- --no-coverage --runInBand --testPathPattern='(monetizationPrompts|appIntegration)\.test\.ts'`

Expected: failures for missing exit-nudge policy and old prompt thresholds.

- [ ] **Step 3: Implement the pacing policy**

Add the pure policy:

```ts
export function shouldAllowExitNudge(params: {
  puzzlesSolved: number;
  lastExitNudgePuzzle: number | null;
}): boolean {
  if (params.puzzlesSolved < EXIT_NUDGE_MIN_PUZZLES) return false;
  if (params.lastExitNudgePuzzle === null) return true;
  return params.puzzlesSolved - params.lastExitNudgePuzzle >= EXIT_NUDGE_SPACING_PUZZLES;
}
```

Persist `lastExitNudgePuzzle` under `wordshift_monet_prompts`. Gate `runVictoryExitNudges` once before checking share/notification/remove-ads/Patron and record only after a prompt actually presents. Make `maybeShowPatronNudge` return `Promise<boolean>`.

Change `STARTER_INTRO_MIN_PUZZLES` to `35` and `PATRON_NUDGE_MIN_PUZZLES` to `50`. Do not change `REWARDED_DOUBLE_DAILY_CAP`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run the Step 2 command. Expected: all matching tests pass.

- [ ] **Step 5: Commit**

`git add mobile/src/constants/gameBalance.ts mobile/src/services/monetizationPrompts.ts mobile/App.tsx mobile/src/__tests__/monetizationPrompts.test.ts mobile/src/__tests__/appIntegration.test.ts && git commit -m "feat: pace proactive victory prompts"`

---

### Task 2: Prefer Multi-Route Standard Boards

**Files:**
- Modify: `mobile/src/services/puzzleBank.ts`
- Modify: `mobile/src/__tests__/puzzleBankDepth.test.ts`
- Modify: `mobile/src/__tests__/puzzleBranching.test.ts`

**Interfaces:**
- Produce: `prioritizeMultiRouteCandidates<T>(candidates, getCompletePathCount, targetPoolSize): T[]`
- Preserve: existing `selectPreGeneratedPuzzle` signature

- [ ] **Step 1: Write failing candidate-ordering tests**

Cover:

```ts
const reordered = prioritizeMultiRouteCandidates(
  candidates,
  candidate => candidate.paths,
  10,
);
expect(reordered.slice(0, 10).every(candidate => candidate.paths >= 2)).toBe(true);
```

Add fallback tests for fewer than ten multi-route candidates and integration assertions that branching analysis receives extended words at puzzle 100.

- [ ] **Step 2: Run focused tests and verify RED**

`npm test -- --no-coverage --runInBand --testPathPattern='(puzzleBankDepth|puzzleBranching)\.test\.ts'`

- [ ] **Step 3: Implement runtime prioritization**

Set `BRANCHING_CONTEXT_CANDIDATES` to `80`. Analyze candidates only after all existing phase/freshness/exhaustion filters. Cache metrics with separate source/extended keys. For extension-required selection, call `analyzeStandardBranching` with `getCachedStandardExtension(...).words`.

Partition the analyzed context candidates into `completePathCount >= 2` and fallback candidates while preserving score order inside each partition. Fill the first ten slots from multi-route candidates first, then fallback candidates. Keep all remaining candidates after the preferred pool so exhaustion remains possible.

- [ ] **Step 4: Run depth, solvability, and diversity tests**

`npm test -- --no-coverage --runInBand --testPathPattern='(puzzleBankDepth|puzzleBranching|bankSolvability|bankDiversity|puzzleExtension)\.test\.ts'`

- [ ] **Step 5: Run a disposable selection audit**

Use an in-memory AsyncStorage Node script to sample 200 MEDIUM standard selections at puzzle 40 and 100. Confirm the served single-route rate materially decreases from the pre-change 60.5%/56.4% baselines without selecting invalid boards.

- [ ] **Step 6: Commit**

`git add mobile/src/services/puzzleBank.ts mobile/src/__tests__/puzzleBankDepth.test.ts mobile/src/__tests__/puzzleBranching.test.ts && git commit -m "feat: prioritize multi-route standard puzzles"`

---

### Task 3: Restore Phase 3 Narrative Restraint

**Files:**
- Modify: `mobile/src/services/dialogueChoices.ts`
- Modify: `mobile/src/services/phaseNarrative.ts`
- Modify: `mobile/src/__tests__/dialogueChoices.test.ts`
- Modify: `mobile/src/__tests__/phaseNarrative.test.ts`
- Modify: `mobile/src/__tests__/noEmDashes.test.ts` only if its content enumeration needs expansion

**Interfaces:**
- Preserve: `ANIMAL_CHOICES` keys and shape
- Preserve: `ANIMAL_WHISPERS[3]` as 13 animals × 5 lines

- [ ] **Step 1: Write failing restraint guards**

Assert all 13 choice entries exist, all Phase 3 whisper pools contain five lines, and normalized content excludes:

```ts
const FORBIDDEN = /\b(game|puzzle|summoning|spreadsheet|consent)\b/i;
```

Add explicit assertions that asking/refusing responses differ and every convergence remains non-empty.

- [ ] **Step 2: Run focused tests and verify RED**

`npm test -- --no-coverage --runInBand --testPathPattern='(dialogueChoices|phaseNarrative|noEmDashes)\.test\.ts'`

- [ ] **Step 3: Rewrite all 13 choices**

Keep prompts, options, response branches, and convergence structure. Rewrite copy around:

- Ember: fire and withheld warmth.
- Panko: covered dishes and an unnamed guest.
- Archimedes: omitted lines and appointed reading.
- Axel: water and approaching reflection.
- Chill: folders, schedules, and an unnamed arrival without modern spreadsheet language.
- Fennick: a frequency crossing the horizon.
- Sloane: a long-observed change.
- Warren: foundation and a chamber below.
- Thyme: routes bending back toward the garden.
- Bamboo: an incomplete pattern without stating participation.
- Vesper: the watched road.
- Tock: the bell's unsaid word.
- Moss: mast season and roots passing a message.

- [ ] **Step 4: Rewrite all 65 Phase 3 whispers**

Keep five per animal and use the same sensory systems. Remove exact prediction, final-page/final-meal declarations, and trapped/no-exit claims.

- [ ] **Step 5: Run focused and content-integrity tests**

Run Step 2 plus:

`npm test -- --no-coverage --runInBand --testPathPattern='(configValidation|dialogueGating)\.test\.ts'`

- [ ] **Step 6: Commit**

`git add mobile/src/services/dialogueChoices.ts mobile/src/services/phaseNarrative.ts mobile/src/__tests__/dialogueChoices.test.ts mobile/src/__tests__/phaseNarrative.test.ts mobile/src/__tests__/noEmDashes.test.ts && git commit -m "feat: preserve mystery through phase three"`

---

### Task 4: Add the Unbroken Weave Mastery Ladder

**Files:**
- Modify: `mobile/src/services/masteryRecords.ts`
- Modify: `mobile/src/types/homeWorld.ts`
- Modify: `mobile/src/services/amberCurrency.ts`
- Modify: `mobile/src/services/phaseNarrative.ts`
- Modify: `mobile/src/hooks/useGamePersistence.ts`
- Modify: `mobile/App.tsx`
- Modify: `mobile/src/components/puzzle/DifficultyMenu.tsx`
- Modify: `mobile/src/components/puzzle/VictoryModal.tsx`
- Modify: `mobile/src/components/StatsScreen.tsx`
- Modify: `mobile/src/components/home/HomeScreen.tsx`
- Modify: `mobile/src/__tests__/masteryRecords.test.ts`
- Modify: `mobile/src/__tests__/victoryFlow.test.ts`
- Modify: `mobile/src/__tests__/victoryModal.test.ts`
- Modify: `mobile/src/__tests__/appIntegration.test.ts`
- Create: `mobile/src/__tests__/unbrokenWeavePresentation.test.ts`

**Interfaces:**

```ts
export interface UnbrokenWeaveMastery {
  wins: number;
  flawlessWins: number;
  difficultyClears: Difficulty[];
  hardFlawless: boolean;
  rank: number;
  title: string;
  nextObjective: string | null;
}

export function resolveUnbrokenWeaveMastery(input: {
  wins: number;
  flawlessWins: number;
  difficultyClears: readonly Difficulty[];
  hardFlawless: boolean;
}): UnbrokenWeaveMastery;

export async function recordUnbrokenWeaveVictory(
  difficulty: Difficulty,
  flawless: boolean,
): Promise<{ mastery: UnbrokenWeaveMastery; rankedUp: boolean }>;
```

- [ ] **Step 1: Write failing mastery-service tests**

Cover backward-compatible loading, unique difficulty clears, flawless HARD, all five ranks, no duplicate clear inflation, persistence, invalidation, and Reset All.

- [ ] **Step 2: Run service tests and verify RED**

`npm test -- --no-coverage --runInBand --testPathPattern='masteryRecords\.test\.ts'`

- [ ] **Step 3: Implement mastery persistence and resolver**

Extend the existing default/load/save state. Rank order:

1. Thread Joined: one win.
2. Fourfold Weave: all four difficulty clears.
3. Seamless Dark: flawless HARD.
4. Loomkeeper: 10 flawless wins.
5. Patternbound: 25 flawless wins.

- [ ] **Step 4: Write failing orchestration/UI tests**

Add `unbrokenWeaveRank`, `unbrokenWeaveTitle`, `unbrokenWeaveNextObjective`, and `unbrokenWeaveRankedUp` to `VictoryData`. Assert rank-up victories are not routine. Assert setup, Stats, and Victory render rank/progress.

- [ ] **Step 5: Run UI tests and verify RED**

`npm test -- --no-coverage --runInBand --testPathPattern='(victoryFlow|victoryModal|appIntegration|masteryRecords|unbrokenWeavePresentation)\.test\.ts'`

- [ ] **Step 6: Wire victory recording and surfaces**

When a Weave board completes, call `recordUnbrokenWeaveVictory` before starting victory choreography and merge the returned fields into final victory data. Refresh App-held mastery state for the setup row. Load mastery independently in Stats.

Use `unbrokenWeaveRankedUp` in `isRoutineVictory`. Render the rank and next objective in setup, Stats, and victory.

- [ ] **Step 7: Add the one-time Phase 5 introduction**

Add `unbrokenWeaveIntroSeen?: boolean` to `HomeWorldProgress`, with `hasSeenUnbrokenWeaveIntro()` and `markUnbrokenWeaveIntroSeen()` in `amberCurrency.ts`. Add phase-aware lines to `phaseNarrative.ts`. Trigger once from HomeScreen on a quiet Phase 5 landing; mark it when presented.

- [ ] **Step 8: Run mastery, persistence, cloud, reset, and UI tests**

`npm test -- --no-coverage --runInBand --testPathPattern='(masteryRecords|victoryFlow|victoryModal|appIntegration|unbrokenWeavePresentation|cloudSave|settings)\.test\.ts'`

- [ ] **Step 9: Commit**

Stage all Task 4 files and commit:

`git commit -m "feat: add Unbroken Weave mastery ladder"`

---

### Task 5: Recruit the Descent Trio Earlier Without Moving the Finale

**Files:**
- Modify: `mobile/src/constants/gameBalance.ts`
- Modify: `mobile/src/services/homeWorldData.ts`
- Modify: `mobile/App.tsx`
- Modify: `mobile/src/services/phaseNarrative.ts` where timing copy/comments become false
- Modify: `mobile/src/__tests__/homeWorldData.test.ts`
- Modify: `mobile/src/__tests__/dialogueChronology.test.ts`
- Modify: endgame/App integration tests
- Modify: `CLAUDE.md`

**Interfaces:**
- Produce: `FINALE_ARM_MIN_PUZZLES = 160`

- [ ] **Step 1: Write failing gate and finale tests**

Assert room gates are exactly `105`, `115`, `125`, `135`. Assert house-complete Phase 4 dwell does not arm before puzzle 160 even after eight dwell wins, and does arm at puzzle 160.

- [ ] **Step 2: Run focused tests and verify RED**

`npm test -- --no-coverage --runInBand --testPathPattern='(homeWorldData|dialogueChronology|appIntegration|amberCurrency)\.test\.ts'`

- [ ] **Step 3: Implement gates and arming floor**

Update the four room `minPuzzles` values. Export the new constant. In App's endgame branch, arm only when:

```ts
dwell >= FINALE_DWELL_PUZZLES &&
completedTotal >= FINALE_ARM_MIN_PUZZLES
```

Continue calling capped `recordPhase4Dwell()` on eligible wins so puzzle 160 can arm after an early dwell completion.

- [ ] **Step 4: Update timing-dependent copy/docs**

Correct comments, milestones, invariant bounds, and `CLAUDE.md` tables that state the old 112/126/140/152 geography. Preserve micro-beats at 148/150/155/158 and the finale near 161.

- [ ] **Step 5: Run focused tests**

Run Step 2 and `npm test -- --no-coverage --runInBand --testPathPattern='phaseNarrative\.test\.ts'`.

- [ ] **Step 6: Commit**

Stage Task 5 files and commit:

`git commit -m "feat: give late keepers more time before finale"`

---

### Task 6: Shorten Routine Bulk Pit Offerings

**Files:**
- Create: `mobile/src/services/pitOfferTiming.ts`
- Modify: `mobile/src/components/OfferingPitScreen.tsx`
- Create: `mobile/src/__tests__/pitOfferTiming.test.ts`
- Modify: `mobile/src/__tests__/pitAmberDisplayAccounting.test.ts`

**Interfaces:**

```ts
export interface BulkOfferTiming {
  staggerMs: number;
  wordDurationMs: number;
  cascadeDurationMs: number;
}

export function getBulkOfferTiming(
  wordCount: number,
  phase: number,
  reducedMotion: boolean,
): BulkOfferTiming;
```

`cascadeDurationMs` must be `<= 1000` for every positive word count and phase.

- [ ] **Step 1: Write failing timing tests**

Cover 1, 3, 20, and 200 words across phases 0–5, reduced motion, empty input, and monotonic/non-negative values.

- [ ] **Step 2: Run timing tests and verify RED**

`npm test -- --no-coverage --runInBand --testPathPattern='pitOfferTiming\.test\.ts'`

- [ ] **Step 3: Implement timing resolver**

Return immediate timing for reduced motion. For animated bulk offerings, derive stagger and word duration so the final scheduled word plus its animation and settle buffer remains at or below 1,000 ms.

- [ ] **Step 4: Integrate bulk timing and visual priority**

Use the resolver only in `handleHarvestAll`; individual taps continue using `getDevourDuration(phase)`. Apply a stronger primary style to the bulk button only when `pendingPhaseTransition == null`. Keep onboarding's per-word instruction and ceremony CTA priority.

- [ ] **Step 5: Run all pit tests**

`npm test -- --no-coverage --runInBand --testPathPattern='(pitOfferTiming|offeringPit|pitOnboardingOffer|mandatoryHarvestGate|wordHarvest)\.test\.ts'`

- [ ] **Step 6: Commit**

`git add mobile/src/services/pitOfferTiming.ts mobile/src/components/OfferingPitScreen.tsx mobile/src/__tests__/pitOfferTiming.test.ts mobile/src/__tests__/pitAmberDisplayAccounting.test.ts && git commit -m "feat: accelerate routine pit offerings"`

---

### Task 7: Integrated Verification and Walkthrough

**Files:**
- Modify only files required by failures found during verification.
- Update: `docs/superpowers/specs/2026-07-15-player-fun-overhaul-design.md` only if implementation required an approved clarification.

- [ ] **Step 1: Run static validation**

`npm run typecheck`

`npm run lint`

- [ ] **Step 2: Run the full suite**

`npm test -- --no-coverage`

- [ ] **Step 3: Run Expo web**

Start `npx expo start --web --port 8081` in tmux. Open DevTools before navigation.

- [ ] **Step 4: Record manual walkthrough**

Demonstrate:

- Phase 5 setup row with Weave rank/objective.
- Stats mastery card.
- Weave victory and rank-up treatment.
- Routine bulk pit offer completing within about one second.
- Phase ceremony path still prioritizing the ceremony.

Save a demo video and at least one representative screenshot to `/opt/cursor/artifacts`.

- [ ] **Step 5: Review the video**

Use the video-review agent to verify the recording shows every claimed behavior.

- [ ] **Step 6: Final review, commit, and push**

Run a whole-branch code review, fix all Critical/Important findings, rerun affected tests, then commit each logical correction and push with:

`git push -u origin cursor/player-fun-overhaul-da6a`
