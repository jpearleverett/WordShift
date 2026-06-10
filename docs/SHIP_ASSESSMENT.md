# WordShift — Pre-Launch Ship Assessment

**Date:** 2026-06-10
**Reviewed as:** three-person greenlight committee (senior RN/Expo engineer, veteran mobile puzzle designer, app store launch consultant)
**Scope:** full static audit of `mobile/` at commit `8d8a4d9` on `main`
**Method note:** All findings cite file:line or command output. Findings marked **(verified)** were independently re-checked by the lead reviewer; the rest come from targeted code reads of the named files.

---

## ⚠️ Verification suite caveat

The audit environment is a fresh container with **no `node_modules`**, and dependency installation is blocked by the environment's policy (CLAUDE.md forbids `npm install`). Consequently **jest, `tsc --noEmit`, and `npx expo-doctor` could not be executed here**. What we know instead:

- `npm test` fails with `jest: not found`; `tsc --noEmit` reports only missing-module errors (no deps installed).
- **`AGENTS.md` (repo root) documents 11 pre-existing test failures across 3 suites** (`integration`, `puzzleVariety`, `amberCurrency`) and **known pre-existing `tsc` errors** in `App.tsx`, `HomeScreen.tsx`, `HouseWorld.tsx` "and others." A clean baseline does not currently exist.
- **There is no lint configuration at all** — no `.eslintrc*`, no `eslint.config.*`, no lint script in `package.json`. (verified)
- Static test inventory: 35 test suite files in `src/__tests__/`, **856 `it()`/`test()` declarations** (verified via grep; CLAUDE.md's "951 tests" presumably counts `test.each` expansions).

**Action: re-run `npm test`, `npx tsc --noEmit`, and `npx expo-doctor` on a machine with deps installed before trusting any green-light.** The 11 documented failures and the tsc errors must be driven to zero — a 1.0 submission with a known-red test suite is not defensible.

---

## Phase 0 — State of the codebase

WordShift is a substantial, largely coherent single-developer codebase: ~59,000 lines of strict TypeScript across `App.tsx` (1,688 lines, state-based routing for 7 screens) and a well-factored `src/` (11 custom hooks, ~40 services, memoized game components), with 35 test suites covering most game-critical services. The architecture described in CLAUDE.md matches reality closely — hooks own game/persistence/victory state, all player-facing text routes through `phaseNarrative.ts`, persistence uses AsyncStorage with in-memory caches, and there is zero backend (no fetch/axios anywhere — fully offline-safe (verified)). The core loop traces cleanly: launch → `App.tsx:334` init effect → home → `startNewGame()` → `usePuzzleGame` move validation → `recordVictory()` (`App.tsx:607`) → `GameState.WON` (`App.tsx:702`) → VictoryModal → "Next Level" one-tap repeat. But the *ship wrapper* around this game is unfinished: the app icon, splash, and adaptive icon are **1×1-pixel placeholder PNGs** (verified via `file`), `app.json` lacks build numbers/plugins/usage strings, there is no `eas.json`, no README, no privacy policy, no lint, two critical startup functions (`runMigrations`, `installGlobalErrorHandler`) are **defined and tested but never called** (verified), the audio system is a silent stub behind a live "Sound Effects" toggle, and the shipped puzzle banks contain profanity as visible puzzle words. The game is real; the product is not yet.

**Dependency staleness:** Expo SDK 54 / RN 0.81 / React 19.1 is a consistent, recent pairing. One flag: **`expo-av` (`package.json:18`) is deprecated by Expo** in favor of `expo-audio`/`expo-video` and is slated for removal in newer SDKs — since `audio.ts` is a stub anyway, plan the migration before building real audio on it. `react-dom`/`react-native-web` are dev-testing conveniences per AGENTS.md, not a product target.

**Leftover artifacts:** deprecated `Tutorial.tsx` (imported in App.tsx, never rendered; kept for legacy-flag compat), `animalDialogue.ts` re-export shim (intentional), empty `assets/house/` (planned art), stale comment claiming chain variant generates on-device (`puzzleBank.ts:203`), `MONETIZATION_PLAN.md` referenced by CLAUDE.md but **does not exist** (verified), and CLAUDE.md unlock thresholds (10/40/52/85) disagree with code (`puzzleVariety.ts:133-137`: reverse=8, double_shift=25, speed=35, chain absent).

---

## Phase 1 — Dimension audits

### 1. Technical health — **6/10**
*Strong defensive patterns undermined by two dead wires at startup and a known-red verification baseline.*

- **[BLOCKER] Schema migrations never run.** `runMigrations()` (`src/services/dataMigration.ts:152`) is exported and tested but **never invoked from any app code** (verified by grep). The v3 schema versioning system is decorative; any future storage format change will hit users with unmigrated data.
- **[BLOCKER] Global error handler never installed.** `installGlobalErrorHandler()` (`src/services/errorReporting.ts:82`) captures unhandled rejections and fatal JS errors — and is **never called** (verified by grep). Production crashes are currently invisible even to the local event log.
- **[HIGH] Known failing tests + tsc errors.** AGENTS.md: 11 failures in `integration`/`puzzleVariety`/`amberCurrency` suites; pre-existing type errors in App.tsx/HomeScreen/HouseWorld. Cannot be confirmed in this environment (see caveat) but is documented by the project itself.
- **[HIGH] No ESLint.** Zero lint config in repo (verified). `tsc` is the only static gate, and it's red.
- **[MED] Unvalidated parse results.** `eventLogger.ts:74` spreads `JSON.parse` output without `Array.isArray` check (corrupted storage → crash on spread); `amberCurrency.ts:271` assigns parsed JSON to cache with non-null assertion and no shape check. Both are inside try/catch so they degrade rather than crash at parse time, but malformed-but-parseable data flows into game logic unchecked.
- **[MED] Fire-and-forget promise without catch:** `useUnlockFlow.ts:116-118` — `isUnlockAvailable(...).then(...)` with no `.catch()`; a rejection leaves unlock availability stale.
- **[LOW] Test gaps:** no test files for `useAutosave`, `useOnboardingFlow`, `useVictoryFlow`, `useVictoryOrchestration`, `useDialogueFlow`, `useSpeedTimer`, `useAchievementQueue`, `useDreadEffects`, `useUnlockFlow` hooks, nor `errorReporting.ts`, `deviceTier.ts`, `roomUpgrades.ts`, `slotEstimation.ts`, `phaseEvents.ts`. Game-critical *services* (generator, ratings, currency, banks, save state, migrations) **are** tested — the gap is the hook/orchestration layer.
- ✅ Genuinely strong, said once: `ErrorBoundary` wraps both home and puzzle screens (`App.tsx:1150`, `:1207`); all timers/animation loops audited have cleanup; `recordVictory` has a re-entrancy guard (`useGamePersistence.ts:154-182`); zero network calls so airplane mode is a non-event; no secrets in the bundle (verified searches).

### 2. Performance & responsiveness — **5/10**
*Heavy ambient animation load, JS-thread loops, and a 5.7MB synchronously-parsed data payload; fine on flagships, credible jank risk on 4-year-old Android. Needs device profiling.*

- **[HIGH] `Row` memo is defeated.** `Row.tsx:395` wraps in `React.memo` but receives freshly-created callback props (`onLetterPress`, `onSlotPress`, `onLetterDragDrop`, `onDragActiveChange`) from App.tsx render scope — every state change re-renders every row. The memo is documented as a convention (CLAUDE.md) but is currently inert.
- **[HIGH] All 12 puzzle banks statically imported.** `puzzleBank.ts:1-14` imports 5.7MB of TS data (`du`: `src/data` = 5.5M; largest single bank `puzzleBankDoubleShiftHard.ts` = 726KB) — parsed at startup, all difficulties/variants regardless of need. Direct hit to cold-start time on low-end Android.
- **[HIGH] JS-thread animation loops.** 8 `useNativeDriver: false` animations, several *continuous*: `LetterTile.tsx:105,111` (idle glow/shine per interactive tile), `Row.tsx:467,473` (active-row glow), `ActionButton.tsx:39,45`, `LetterTile.tsx:240,246`. Each slot also runs 2 continuous loops (`Row.tsx:172-207`) — 14-16 concurrent loops on a 7-slot row; the glow loop at `Row.tsx:461` has **no** `shouldSimplifyAnimations()` gate.
- **[MED] 33MB of PNG assets** (verified `du`), dominated by ~14MB of sky images (3.3M `sky_dusk.png`, 3.1M `sky_day.png`, 2.9M `sky_storm.png`, 2.8M `sky_shadow.png`) and a 2.4M `aquarium.png` room background — all `require()`d at module level in `HouseWorld.tsx`, decoded at full resolution for small render targets. Compress (WebP) and resize before launch.
- **[MED] 5 `setInterval` drivers** including a 300ms talking-toggle on HomeScreen and per-animal emotion intervals (8-15s × up to 10 animals).
- **[LOW] `Dimensions.get` at module level in 17 files** — acceptable only because `app.json:7` locks portrait; foldables remain a residual risk.
- ✅ Safe-area handling is consistent (`StatusBar.currentHeight || 24` pattern across 8 screens), orientation locked, no `allowFontScaling={false}` abuse, `slotPreviews` properly memoized (`usePuzzleGame.ts:961-1009`).
- **FPS, startup time, memory: needs manual device testing** (no claims made here without a device).

### 3. Visual design & UI craft — **7/10**
*One intentional aesthetic executed with unusual discipline; the phase-theme system is real, not aspirational. Deductions for token leakage and dark-phase contrast.*

- **[HIGH] Phase 3/4 dialogue text fails WCAG contrast.** `theme/colors.ts` phase-3/4 dialogue themes pair `#787890`/`#686878` text on `#161622`/`#0A0810` backgrounds (~1.3-1.8:1 vs 4.5:1 AA minimum). Players spend extended time reading narrative text in these phases. Lighten body text (e.g., `#D0D0E8`).
- **[MED] 172 hardcoded hex colors outside `theme/colors.ts`** (grep count across `src/components` + App.tsx). Worst offenders: `LetterTile.tsx` (~30, incl. phase resonance colors at `:415-422`), `OfferingPitScreen.tsx` (~25, pit backgrounds `:53-59` + devour palettes `:127-133`), `Confetti.tsx` (duplicates theme's `confettiColors`). Most are phase-aware and locally grouped — drift risk, not chaos.
- **[MED]** "Collect Now" pill in VictoryModal (`:496-511`) lacks a pressed state beyond `activeOpacity`; verify play button disables during puzzle load.
- **[LOW]** Iconography is all-emoji — consistent in meaning (⭐ stars, 🔥 streak, 💎 amber) but renders differently across platforms.
- ✅ Pressed/disabled states present on LetterTile/Slot/ActionButton/JuicyButton (spring scales + opacity); empty states exist for WordLedger/WhisperGallery with phase-aware copy; 3D bevel treatment consistent across tiles/modals/buttons.

### 4. UX & first-time experience — **6/10**
*A genuinely resumable, teach-by-doing onboarding — undermined by a launch-time permission prompt, a verbose Fox, and missing table-stakes settings items.*

- **[BLOCKER] No privacy policy, terms, or support contact anywhere in the app.** `SettingsScreen.tsx` contains exactly: Sound, Haptics, Reduced Motion, Reset All, hardcoded "v1.0.0", credits line. No `Linking.openURL` to any external page exists in src (verified by agent search). Both stores require a privacy policy URL; users have no way to reach the developer.
- **[HIGH] OS notification permission dialog fires at cold launch (verified).** `App.tsx:337` → `scheduleAllNotifications(0)` → `requestPermissions()` → `requestPermissionsAsync()` (`notifications.ts:185`, `:132`), with default prefs `enabled: true` (`notifications.ts:104-111`). First-session users get a permission prompt before they've seen a single puzzle — worst-possible timing for opt-in rate, and on Android 13+ this burns the one contextual ask.
- **[MED] Onboarding pacing:** ~8 Fox dialogue lines and ~8-12 taps before the first puzzle is solved (`onboarding.ts:92-151`). Skippable from most steps (good), `home_empty` step is not (`App.tsx:1186`). Step is persisted and resumes correctly across force-quit, including mid-pit (`App.tsx:341-353`) — this part is excellent.
- **[MED] Pit friction after puzzle 5:** auto-collect ends at `totalPuzzlesCompleted <= 5` (`App.tsx:622`); thereafter collecting amber requires a pit round-trip (~5-6 taps) per batch. Intentional narrative friction, but it taxes the core loop exactly when habit formation matters. Consider auto-collect through puzzle ~15 or a batch-collect surface.
- **[MED] Speed timer runs while backgrounded** (`speedTimerExpireAt` absolute timestamp, `App.tsx:518-521`): a phone call mid-speed-run is a guaranteed loss. Defensible design, but pair it with a gentler fail screen.
- **[LOW]** Version string hardcoded in Settings (`SettingsScreen.tsx:176`); read from `expo-constants` instead.
- ✅ Mid-puzzle autosave on every move with restore-on-launch; Reset All has a proper double-confirm destructive flow (`SettingsScreen.tsx:52-89`); no AppState listener exists but autosave makes interruption handling acceptable for v1.

### 5. Gameplay & balance — **6/10**
*Mechanically fair and pre-validated to a standard most word games don't reach — but the dictionary ships profanity into player-visible puzzles, which caps this dimension.*

- **[BLOCKER] Profanity in shipped puzzle banks as visible puzzle words (verified by exact-token grep).** Counts across `src/data/puzzleBank*.ts`: `'BITCH'`×33, `'COCK'`×30, `'CRAP'`×28, `'RAPE'`×18, `'DAMN'`×6, `'TITS'`×3, `'WHORE'`×3, `'ASS'`×2. These are not validation-only entries — they appear in `words:` arrays players see and solve through, e.g. **`words:['BITCH','CATER','PLANE']` in `puzzleBankDoubleShiftEasy.ts`** and `words:['SILKY','BITCH','STALE','WEARS','SEEPS']` in `puzzleBankHard.ts`. The dictionary (`src/dictionary.ts`, 11,534 words) also accepts BITCH/RAPE/SLUT/WHORE/TITS/COCK as valid player-formed words. For a game whose store listing will look like a children's title, "RAPE" appearing as a puzzle word is a one-star-review and age-rating catastrophe. Filter the dictionary, regenerate all 12 banks, and audit `CURATED_EARLY_PUZZLES`.
- **[MED] No dead-end detection.** Off-solution states rely on unlimited undo + a hint that searches for any valid move and falls back to "try undoing" (`usePuzzleGame.ts:598-629`). Acceptable in normal mode; in Challenge Mode (finite undos, zero hints) a player can be softlocked into clearing the board with nothing telling them so.
- **[LOW]** Chain Shift: absent from `PuzzleVariant` types and `VARIANT_CONFIGS` (`puzzleVariety.ts:22-27`, `:68-111`) — unreachable, no player-facing references, only a stale comment at `puzzleBank.ts:203` and CLAUDE.md drift. Not a player risk.
- ✅ Strong once, then moving on: reverse puzzles validated solvable at generation (`isReverseSolvable`, `localGenerator.ts:1311+`); banks deduplicated and score-gated (≥45); validation and generation share one dictionary so no "valid word rejected" class of bug; repeated letters handled by index-based removal; bank exhaustion recycles oldest half (`puzzleBank.ts:319-345`); daily challenge seeding is deterministic, lock-guarded, and restores `Math.random` in a `finally` (`dailyChallenge.ts:199-219`); star formula is transparent (`starRating.ts:60-78`); the 5 curated openers are well-chosen.

### 6. Addictiveness & session design — **6/10**
*The one-more-round loop is genuinely one tap; the juice ceiling is capped hard by total silence.*

- **[HIGH] Zero audio feedback on any action** (see Dimension 9) — every "juicy" moment (valid move, victory, amber, devour) is animation+haptic only. For this genre that's leaving the cheapest dopamine on the table.
- **[MED] Juice gaps even within haptics:** no haptic on successful slot drop (`Row.tsx:218-228` catch-bounce), none on invalid-drop shake (`Row.tsx:556-566`), none on VictoryModal pop-in.
- **[MED]** Post-puzzle-5 pit detour interrupts chained sessions (see Dimension 4).
- ✅ Time-to-fun is good: curated puzzle 1 is 3 rows EASY; "Next Level" is a true one-tap continue. Variable-reward density is unusually high — 8% victory glitches, animal whispers, 30%-chance interjections, ritual micro-events, narrative micro-beats at 10 specific milestones, streak milestones, 34 achievements. Session shape (3-7 min/puzzle, clean exits, no energy system, no dark patterns) is mobile-correct.

### 7. Retention & progression — **6/10**
*The long arc (weeks 2-6) is the game's best asset; Day 1-3 is its weakest stretch.*

- **[HIGH] Weak Day-1 hook.** Daily challenge unlocks at **20 puzzles or Phase 1** (`dailyChallenge.ts:71,77-82`); streak UI surfaces meaningfully only at day 3+. A first-session player who solves 5 puzzles has: weekly quests, an unfinished house, and a notification they probably denied at launch (Dimension 4). That's intrinsic-motivation-only retention through the most churn-prone window. Lower the daily-challenge gate (~5 puzzles) or add an explicit "come back tomorrow" beat (Fox foreshadow + scheduled local notification tied to it).
- **[MED]** The notification channel is implemented well (phase-aware daily reminder + 2-day re-engagement, `notifications.ts:40-95`) but its effectiveness is gated on the launch-time permission ask being granted blind.
- ✅ Streaks are forgiving (2-day grace, freeze at 50 amber, free freeze every 14 days, milestones at 3/7/14/21/30 — `amberCurrency.ts:93-168`); week-4 content actually exists (variants, coordinated dialogue events at 6 milestones, phase transitions, house build-out to 10 rooms, post-revelation Phase 5 content). Ethics check: no energy systems, no loot boxes, no spend pressure; the sacrifice mechanic explicitly grants nothing. The horror themes are the only minor-audience concern → handled via age rating (Dimension 13).

### 8. Story & narrative — **9/10**
*This is the product's moat, and it is integrated, not decorative — the rare strong-say-it-once.*

- Narrative **gates and rewards** gameplay: phase transitions are earned via puzzle-derived progress and *confirmed through a gameplay ceremony in the pit*; dread words alter generation scoring and trigger reactions; dialogue cooldowns are measured in puzzles. Skippers still progress cleanly (dialogue is opt-in by visiting animals).
- Sampled writing across `phaseNarrative.ts` and the dialogue submodules is typo-free and tonally disciplined; **no TODO/FIXME/placeholder/lorem text appears in any shipped string** (grep verified — all hits are dictionary words or comments).
- Phase-gated cliffhangers (micro-beats at puzzles 35-130, coordinated events, the never-explained shadow figure) function as genuine retention hooks.
- **[LOW]** Pacing risk, flagged for device playtesting rather than code fix: the Phase 1-2 "retention valley" is known to the design (micro-beats exist to bridge it) but only live data will show if it's bridged.

### 9. Audio & haptics — **2/10**
*Haptics: thoughtful and complete-ish. Audio: does not exist, and the UI claims it does.*

- **[BLOCKER-adjacent, HIGH] The Settings "Sound Effects" toggle is a lie.** `audio.ts` is an explicit no-op stub (`audio.ts:51-68` — "this is a no-op placeholder"); there are **zero audio files** in the project (`find assets -name "*.mp3" -o -name "*.wav" -o -name "*.ogg"` → nothing); yet `SettingsScreen.tsx:110-120` shows a live toggle: "Play sounds on moves and victories." Users will flip it, hear nothing, and file "sound is broken" reviews. Ship real SFX or remove/disable the toggle — do not ship the toggle as-is.
- **[MED]** When audio does land: `audio.ts:28` sets `playsInSilentModeIOS: false` — wrong default for a casual puzzle game; and `expo-av` is deprecated (migrate to `expo-audio`).
- ✅ Haptics route exclusively through the settings-gated service (`haptics.ts`, no direct `expo-haptics` imports elsewhere) with good coverage on pit/phase/UI actions; gaps listed in Dimension 6.

### 10. Accessibility — **4/10**
*Good bones (reducedMotion discipline, labeled menus) with three genre-critical failures.*

- **[HIGH] Word validity is color-only.** Slot previews distinguish valid/invalid purely by green vs red text (`Row.tsx:1145-1155`, `CandyColors.green.main` / `red.light` + opacity). For a word game this is the canonical color-blind failure. Add a ✓/✗ prefix or shape cue.
- **[HIGH] `DraggableTile.tsx` has zero accessibility attributes** (entire file) — the drag interaction is invisible to screen readers; non-clickable `LetterTile` renders (`LetterTile.tsx:761-776`) also carry no label, so board state is unreadable.
- **[HIGH]** Phase 3/4 text contrast failures (detailed in Dimension 3).
- **[MED]** Slot touch targets ~18pt wide (`Row.tsx:1045-1047`, `SLOT_WIDTH=14`) with 2pt margins on a 12°-rotated arc — under the 44pt minimum; add `hitSlop`.
- **[MED]** VictoryModal stars/streak/milestone are bare emoji without labels (`VictoryModal.tsx:196-219`, `:250-274`).
- ✅ ~106 `reducedMotion` checks across 15 component files (only ActionButton's glow loop misses it); Settings toggles have proper `switch` roles/states; font scaling is not suppressed anywhere (clipping at 1.3× scale: needs manual device testing).

### 11. Monetization — **N/A**
No monetization code exists (no IAP/ads SDKs in `package.json`, no paywall UI — verified), so correctness/UX/policy checks don't apply; note only that `MONETIZATION_PLAN.md` is referenced by CLAUDE.md but missing from the repo, and "restore purchases" is correctly absent rather than missing.

### 12. Analytics & observability — **2/10**
*Post-launch, every question — crashes, drop-off, D1 — is unanswerable.*

- **[HIGH] No crash reporting.** No Sentry/Crashlytics/Bugsnag in `package.json`; `errorReporting.ts` writes to the local event log only — and isn't even installed (Dimension 1). A crash on someone's device in week 1 is undetectable.
- **[HIGH] All analytics are device-local.** `eventLogger.ts` keeps max 500 events in AsyncStorage with no transport; 23 event types are dutifully logged (`puzzle_completed`, `phase_changed`, `unlock_purchased`, …) and never leave the phone. You cannot answer "where do players drop off."
- **Minimum pre-launch event set** (transport + these events): `app_open`, `onboarding_step` (per step, with step id), `onboarding_complete`, `first_puzzle_complete`, `puzzle_started/completed` (difficulty, variant, hints, stars), `notification_permission_result`, `pit_collect`, `phase_changed`, `app_error`. The local logger's taxonomy is already close — it needs a backend (Amplitude/PostHog/Firebase) and the error handler wired in.

### 13. Store & ship compliance — **2/10**
*Nothing about the store wrapper is done. This dimension alone makes today's build unsubmittable.*

- **[BLOCKER] Icon/splash/adaptive-icon are 1×1-pixel placeholders** (verified: `file assets/icon.png` → "PNG image data, 1 x 1"). Instant rejection; the build won't even look like an app on a home screen.
- **[BLOCKER] `app.json` incomplete for store builds:** no `ios.buildNumber`, no `android.versionCode`, no `plugins` array (expo-notifications requires plugin config for Android icon/color/POST_NOTIFICATIONS on 13+), no `ios.infoPlist` privacy strings, no privacy-manifest consideration. **No `eas.json` exists** — there is no build pipeline configuration at all.
- **[BLOCKER] No privacy policy / terms / support links** (Dimension 4) — Apple and Google both require a privacy policy URL at submission; Google's Data Safety form needs answers the codebase supports well (no data collected — but only if that stays true after adding analytics).
- **[HIGH] Age rating tension.** Content includes cult themes, ritual sacrifice, "summoning," pervasive dread (by design) — and currently profanity in puzzles (Dimension 5). After the profanity purge, target ESRB Teen / PEGI 12 and write the listing honestly (the bait-and-switch is the hook; the *rating* can't be bait-and-switch).
- **[MED] Android back button unhandled.** No `BackHandler` anywhere; with state-based navigation, hardware back from the puzzle screen will background/exit the app rather than navigate home. Needs manual device testing + a handler.
- **[MED]** Review-rejection sweep: fresh-install crash risk is low (offline, error-boundaried), but the silent sound toggle (Dim 9) and permission-at-launch (Dim 4) are the kind of polish flags reviewers cite under "minimum functionality."
- **[LOW]** Listing assets (screenshots, description, feature graphic) — nothing in repo; presumably tracked elsewhere, but it's on the critical path.

---

## Phase 2 — Synthesis

### 1. Scorecard

| # | Dimension | Score | Verdict |
|---|-----------|-------|---------|
| 1 | Technical health | **6/10** | Solid defenses; migrations & error handler are dead wires; baseline is red |
| 2 | Performance & responsiveness | **5/10** | JS-thread loops, 5.7MB static banks, 33MB PNGs; low-end Android at risk |
| 3 | Visual design & UI craft | **7/10** | One coherent aesthetic, real token system; dark-phase contrast fails |
| 4 | UX & first-time experience | **6/10** | Excellent resumable onboarding; launch-time permission ask; no legal/support links |
| 5 | Gameplay & balance | **6/10** | Genuinely fair, pre-validated; profanity in puzzle banks caps it |
| 6 | Addictiveness & session design | **6/10** | One-tap loop, rich variable rewards; total silence caps the juice |
| 7 | Retention & progression | **6/10** | Strong weeks 2-6; weak days 1-3; notification channel self-sabotaged |
| 8 | Story & narrative | **9/10** | Integrated, gated, typo-free; the product's moat |
| 9 | Audio & haptics | **2/10** | Haptics good; audio nonexistent behind a live toggle |
| 10 | Accessibility | **4/10** | Color-only validity, unlabeled drag, contrast failures |
| 11 | Monetization | **N/A** | No monetization code exists |
| 12 | Analytics & observability | **2/10** | Local-only logs, no crash reporting; post-launch blind |
| 13 | Store & ship compliance | **2/10** | 1×1 icons, no eas.json, no legal links — unsubmittable today |

### 2. Ship blockers (complete list)

1. **1×1-pixel icon, splash, and adaptive icon** — `assets/icon.png`, `splash.png`, `adaptive-icon.png`. Rejection on sight.
2. **Profanity in shipped puzzle banks** — BITCH×33, COCK×30, CRAP×28, RAPE×18, WHORE×3, TITS×3, DAMN×6, ASS×2 as visible puzzle words (`src/data/puzzleBank*.ts`; e.g. `['BITCH','CATER','PLANE']` in the double-shift EASY bank); same words valid in `src/dictionary.ts`.
3. **No privacy policy / terms / support contact** in-app or in config — required by both stores (`SettingsScreen.tsx`).
4. **`runMigrations()` never called** — schema system inert; first post-launch storage change corrupts/strands user data (`dataMigration.ts:152`).
5. **`installGlobalErrorHandler()` never called** — crashes invisible even locally (`errorReporting.ts:82`).
6. **`app.json` missing build metadata + no `eas.json`** — no buildNumber/versionCode/plugins/infoPlist; no build profile exists.
7. **Settings advertises sound that cannot play** — no audio assets, no-op service, live toggle (`audio.ts`, `SettingsScreen.tsx:110-120`). Ship SFX or pull the toggle.
8. **Known-red verification baseline** — 11 documented failing tests + pre-existing tsc errors (AGENTS.md); must be green and re-runnable before submission.

### 3. Top 10 actions (impact ÷ effort)

| # | Action | Files | Effort |
|---|--------|-------|--------|
| 1 | Replace icon/splash/adaptive-icon with real 1024×1024 art | `assets/icon.png`, `splash.png`, `adaptive-icon.png`, `app.json` | **S** |
| 2 | Wire `runMigrations()` + `installGlobalErrorHandler()` into the init effect | `App.tsx:334-339` | **S** |
| 3 | Profanity-filter `dictionary.ts` (blocklist), regenerate all 12 banks, re-run bank tests | `src/dictionary.ts`, `scripts/generatePuzzleBank*.ts`, `src/data/*` | **M** |
| 4 | Add privacy policy/terms/support rows to Settings + host the policy page | `SettingsScreen.tsx`, external | **S** (code) |
| 5 | Move notification permission behind a contextual in-app prompt (e.g., after first victory or daily-challenge intro); never call `requestPermissionsAsync` from cold-start path | `App.tsx:337`, `notifications.ts:128-186` | **S** |
| 6 | Complete `app.json` (buildNumber, versionCode, expo-notifications plugin, infoPlist) + create `eas.json`; run `expo-doctor` | `app.json`, new `eas.json` | **S** |
| 7 | Add crash reporting (Sentry) + event transport for the 9-event funnel; hook into `errorReporting.ts`/`eventLogger.ts` | `package.json`, `errorReporting.ts`, `eventLogger.ts` | **M** |
| 8 | Fix the 11 failing tests and pre-existing tsc errors; add ESLint + CI so the baseline stays green | 3 test suites, `App.tsx`, `HomeScreen.tsx`, `HouseWorld.tsx` | **M** |
| 9 | Ship a minimal SFX pack (8-10 sounds: select, valid, invalid, victory, amber, devour) via `expo-audio`, or hide the sound toggle for 1.0 | `audio.ts`, `assets/sounds/`, `SettingsScreen.tsx` | **M** (or **S** to hide) |
| 10 | Performance pass: stabilize Row callbacks (useCallback in App.tsx) so memo works; lazy-load puzzle banks per variant/difficulty; WebP-compress the 14MB of skies | `App.tsx`, `Row.tsx:395`, `puzzleBank.ts:1-14`, `assets/environment/` | **M** |

### 4. Quick wins (each under an hour)

- Wire the two dead init calls (action 2 above — this is genuinely ~10 lines).
- `Array.isArray` guard in `eventLogger.ts:74`; `.catch()` on `useUnlockFlow.ts:116`.
- Add `accessibilityLabel`/`accessibilityRole` to `DraggableTile` and non-clickable `LetterTile` renders.
- ✓/✗ prefix on slot preview text (`Row.tsx:1145-1155`) — kills the color-only failure.
- `hitSlop` on Slot touchables (`Row.tsx`).
- Lighten phase-3/4 dialogue text colors in `theme/colors.ts`.
- Read version from `expo-constants` instead of hardcoded "v1.0.0" (`SettingsScreen.tsx:176`).
- Gate `Row.tsx:461` glow loop and ActionButton glow on `shouldSimplifyAnimations()`/`reducedMotion`.
- Add `hapticError()` to invalid-drop shake and `hapticSuccess()` to VictoryModal pop-in.
- Delete the stale chain-variant comment (`puzzleBank.ts:203`); fix CLAUDE.md unlock thresholds (10/40/52/85 → 8/25/35) and the dangling `MONETIZATION_PLAN.md` reference.
- Add an Android `BackHandler` (puzzle → home → double-press-to-exit).

### 5. Needs manual device testing

- Cold-start time and puzzle-bank parse cost on a low-end Android device (4-year-old, ≤2GB RAM); memory headroom with the 33MB asset set.
- Sustained FPS: puzzle screen with a selected letter (slot loops + tile trails), home screen with 8-10 animals, pit devour animations.
- Hardware back-button behavior on every screen (no `BackHandler` exists).
- Notification permission + delivery flow on Android 13+ and iOS (prompt timing, channel config once the plugin is added).
- System font scale 1.3×: LetterTile (fixed `height: 56`) and slot label clipping; screen-reader walkthrough of menus and board.
- Drag-and-drop feel: slot estimation accuracy on small (SE-class) and tall/notched phones; arc-layout outer-slot reachability.
- Speed-timer behavior across backgrounding/lock and an interrupting phone call.
- Phase 4 visuals on-device: robed sprites, `sky_shadow` background, dread pulse intensity.
- Mid-victory-animation kill/restore, and storage-restore after a forced app update (once migrations are wired).
- Production (`eas build`) binary vs Expo Go differences — nothing here has been built standalone yet.

### 6. Final verdict

**FIX BLOCKERS THEN SHIP.** The game itself — mechanics, fairness, content depth, and a narrative system that is genuinely the best retention asset on this list — is in better shape than most titles that reach submission; what's missing is almost entirely the *product shell*: store assets, legal links, build config, observability, two unwired init calls, an audio decision, and a profanity purge that requires regenerating the puzzle banks. None of the blockers is architecturally hard, but there are eight of them plus a mandatory device-QA pass on real low-end hardware, and the verification suite must be run green outside this environment first. Honest estimate: **3-5 focused weeks** to a submittable, defensible 1.0 — two weeks for the blocker list, one for performance/accessibility quick wins, and one-plus for device QA, store listing, and a soft-launch with crash reporting watching.
