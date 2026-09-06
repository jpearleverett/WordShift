**WordShift: whole-game review and improvement plan**

Reviewed September 5, 2026, at commit `8297227`, app version **1.2.7 / Android 93**. This is a planning deliverable; application code, generated banks, purchases, release configuration, and live backend data were not changed.

The game has a distinctive foundation worth protecting: a satisfying letter-moving puzzle, an increasingly strange home full of individual residents, and a finale whose meaning comes from the player's actual last move. The recent story revision substantially improves the premise. The best next investment is making the existing experience reliable, understandable, and consequential. Another large expansion would currently amplify problems with persistence, overlapping progression systems, and delivery.

This plan contains **43 work items**. It distinguishes **confirmed defects**, **measured design weaknesses**, **design proposals**, and **verification gaps**. A proposal is not evidence that players dislike the current game. A passing unit suite is not evidence that native interactions, purchases, or recovery work end to end.

**The order I recommend**

| Order | Outcome | Work |
|---|---|---|
| 1 | Protect saves and recovery | Recovery identity and ownership, validated restore, conflict handling, migration failure: F01–F05 |
| 2 | Make ordinary play trustworthy | Hint charging, drag geometry, accessible results, daily/season accounting, rules/help: F07–F13 |
| 3 | Protect completions and establish real release checks | Durable outcomes and rendered/signed-build journeys: F06, F35 |
| 4 | Make the story's strongest material reachable and visible | Recruitment-sensitive PLUM setup, persistent ending consequences, pacing evidence: F23–F24, F29 |
| 5 | Improve existing depth and reduce chores | Meaningful House Asks, teaching, economy simulations, recurring rewards and navigation: F16–F22 |
| 6 | Finish presentation and operational quality | Reading, art delivery, audio, accessibility, profiling and release discipline: remaining items |

**Priority and effort.** P0 means address immediately before expanding or broadening release; P1 belongs in the next stabilization milestone; P2 is the next deliberate quality pass; P3 should earn its place through evidence. Effort is rough implementation size: XS less than half a day, S roughly one day, M roughly 2–4 days, L roughly 5 days or more. Backend migration, content production and device QA can extend these. Related items share work; do not sum every estimate as an independent project.

**What should stay**

- The core puzzle verb, both tap and drag controls, multi-route gated banks, word hygiene, and recovery through Undo.
- Five difficulty levels and the existing optional variants. There is already ample configuration depth.
- The growing house, thirteen residents and their distinct interests; warm interiors against an unsettling exterior.
- The revised story about affection becoming controlling preservation. Keep characters fallible and permit anger or uncertainty after the arrival.
- CLOSED and CLOSER as equally valid, equally rewarded puzzle endings. Preserve the honest neutral treatment of legacy final boards.
- Roster-aware dialogue, durable scene pages and choices, the ability to defer conversations, and spoiler-aware archives.
- The painted token palette, paper/timber surfaces, existing character and room art, phase-aware sound, and quiet late-game ad policy.
- Offline core play, no energy/lives barrier, earned cosmetic paths, separate music/sound/haptic controls, and existing pure-rule tests.

**Save integrity and progression correctness**

**F01 · P0 · Confirmed: recovery codes discard the randomness that distinguishes saves.** `cloudSave.ts:363–380` normalizes the owner and keeps only eight characters; `:395–409` persists that shortened value as the cloud owner. The fallback ID in `telemetry.ts:68–75` begins with `inst_<timestamp>`, so the code keeps the fixed prefix and part of the timestamp while discarding all randomness. Actual service execution produced `WS-INST-MTO7` for two different install IDs. Different UUIDs with the same first eight hex characters also produce identical codes, retaining only 32 bits. The checked-in SQL treats possession of the owner as permission to read/write its save. This is a save-isolation defect, not just an inconvenient code format. Native use of the fallback and deployed SQL state still require verification.

Use a full-strength random save identity and a separate secure recovery capability or server-created unique mapping. Design migration for existing short codes before replacing them, including triage of possible existing collisions; already-overwritten remote data may not be reconstructable. Never send recovery credentials to analytics. **Done when:** simultaneous installs remain independent, missing native crypto cannot create weak credentials, recovery cannot expose another save, and existing players have a tested migration path. **L; backend and client together.** Sources: `mobile/src/services/cloudSave.ts:363`, `mobile/src/services/telemetry.ts:68`, `docs/supabase/security_setup.sql:111`.

**F02 · P1 · Confirmed: showing a code, failing a restore, and resetting can change the wrong cloud identity.** Showing the code changes the owner without migrating/uploading the existing backup. Its comment says this happens during bootstrap, but its production caller is Settings. Linking a nonexistent code commits that owner before proving a save exists; failed download leaves future backups redirected. Reset clears the linked owner before uploading its empty state, potentially leaving the intended code-backed save untouched.

Separate lookup/download from committing identity. Showing a usable code should refer to a durable backup; provide clear last-backup status and retry. Separate clearing sync metadata from unlinking a save. **Done when:** backup → show code → immediate second-device restore succeeds; invalid/offline restore changes neither owner nor local progress; linked-device Reset affects exactly the intended save. **M, after F01's identity contract.** Sources: `SettingsScreen.tsx:493`, `cloudSave.ts:450`, `cloudSave.ts:903`, `SettingsScreen.tsx:204`.

**F03 · P1 · Confirmed: restore can accept inappropriate keys and leave partially replaced data.** Incoming save values are cast rather than validated. Restore removes local keys and writes every incoming key, with no complete staging/rollback. Actual isolated execution accepted version 999 and excluded keys such as local entitlements and cloud owner. A read failure during snapshot collection can also create a partial backup whose omissions later look like intentional deletions.

Validate the envelope, supported version, allowed keys and value schemas before touching storage. Collect a complete snapshot or fail. Stage restoration with an interruption-safe commit marker and recoverable previous snapshot; hold gameplay/autosave during the switch. **Done when:** corrupt/future saves, unknown/device/store keys, one failed write, and termination at each stage leave the existing save recoverable and all caches consistent. **L.** Sources: `cloudSave.ts:293`, `:604`, `:671–719`.

**F04 · P1 · Confirmed: cloud conflict protection can silently overwrite newer progress.** Restore records the local clock as its baseline; conflict checks compare remote timestamps against that baseline. A service probe restored remote timestamp 1000 with local time 10000, then allowed an overwrite after remote progress advanced to 2000. The separate check followed by unconditional upsert also has a concurrency race.

Use server-issued revisions and a conditional update against the last acknowledged revision. Preserve explicit player-controlled overwrite and show understandable save summaries on conflict. **Done when:** two devices editing one baseline, clock skew, and a remote write during upload cannot silently clobber progress. **M–L, share backend migration with F01–F03.** Sources: `cloudSave.ts:754`, `:859`; `security_setup.sql:153`.

**F05 · P1 · Confirmed: a failed migration can still be marked complete.** Individual migrations swallow failed progress writes, then `runMigrations` advances the schema version. An isolated run with schema 3 and failing progress writes reported three migrations completed and persisted schema 6 while old progress remained. The next launch therefore cannot retry those migrations.

Propagate required write failures and advance the version only after durable success. Make each migration safe to retry. **Done when:** failure at every migration write leaves the version at the last completed step, and relaunch finishes exactly once without losing old progress. **S.** Source: `mobile/src/services/dataMigration.ts:183`, `:289`.

**F06 · P1 · Confirmed reliability gap: a completed puzzle spans several independently saved outcomes.** Star statistics, progression/amber, harvest and narrative state commit separately. Some critical write helpers warn and return success on failure. The live in-memory victory guard cannot recover an interrupted multi-store completion.

Extend the existing grant-recovery approach with a durable completion ID and idempotent outcome commit/recovery. Surface a retryable save failure instead of silently continuing. Avoid a wholesale database replacement as the first step. **Done when:** force-stop/write failure between every completion stage produces one completion, one reward and consistent story/phase state after restart. **L.** Sources: `amberCurrency.ts:441`, `useGamePersistence.ts:304`, `:337`, `:437`.

**F07 · P1 · Confirmed: a daily puzzle can be recorded under two different dates.** The leaderboard uses the captured board date, while `recordDailyCompletion` computes today internally. Start Monday at 23:59 and finish Tuesday at 00:01: Monday's board can mark Tuesday completed and deny Tuesday's different puzzle. Boards older than yesterday are also relabeled as today's competition.

Carry immutable board date, difficulty and identity through local completion, streak, ladder, bonuses and submission. Explicitly expire stale boards or treat them as practice. **Done when:** midnight, two-day backgrounding, DST/timezone scenarios, already-completed today and offline reconciliation all agree on the same board; yesterday's finish does not consume today's puzzle. **M.** Sources: `App.tsx:2164`, `:2811`; `dailyChallenge.ts:498`.

**F08 · P1 · Confirmed: season progression begins when Journal opens, losing earlier play.** The first pass-state read anchors progress to the player's current solve total. Production reads occur when opening Journal/pass, not on first completion or calendar rollover. Sixty solves before first opening can display zero seasonal progress; the same loss recurs after a new month begins. The badge is also refreshed only after the player opens Journal.

Account for seasonal participation with actual completions and refresh badges on state changes. Define migration honestly where historical monthly counts were never stored. **Done when:** six eligible completions unlock the first tier without any Journal visit, including new-month sessions, reload, claim and New Cycle. **M.** Sources: `HomeScreen.tsx:661`, `:1849`; `seasonPass.ts:119–179`.

**Controls, accessibility and UI**

**F09 · P1 · Confirmed in source and fresh web interaction: repeated HINT taps charge again for the same advice.** No already-disclosed-hint identity guards the paid path. HINT remains enabled while playing, so tapping again before moving consumes another hint and increments the star penalty while returning the same letter/slot. Fresh seeded ordinary play confirmed the balance falling **5 → 4 → 3** after two taps without a move between them ([before](review-2026-09-05/before-hint.png), [after](review-2026-09-05/repeated-hint.png)). A related source path can charge for a merely legal move when it cannot establish a completing continuation.

Charge once per board state and information level; repeat taps should refocus/replay the disclosed hint. For a proven dead branch, explain free backtracking; distinguish proof failure from a solver time limit. **Done when:** rapid/repeated/assistive taps cost once, undo/redo cannot repeatedly charge for the same disclosure, and paid help supplies useful new information. **M.** Sources: `App.tsx:5663`; `usePuzzleGame.ts:1746`, `:1936`, `:2056`.

**F10 · P1 · Confirmed and reproduced: drag targeting and board fitting use the wrong slot footprint.** The rendered slot cell is 20dp including outer margins. The estimator/fitting code still uses 16dp. For six letters at width 400, rendered slot centers are `[20,80,140,200,260,320,380]`; estimated centers are `[32,88,144,200,256,312,368]`. A drop at x=51 selects the neighboring slot. At width 360/base four letters, fitting leaves approximately 21.6dp of transient overflow.

Use the shared complete footprint everywhere and test against independently measured rendered positions. **Done when:** 4–7-letter rows, scaled/narrow boards and drops on either side of every slot boundary agree visually and logically. **S–M.** Sources: `constants/tileLayout.ts:29`, `Row.tsx:1574`, `slotEstimation.ts:49`, `:119`. The board-scale feature already exists; repair its math rather than reimplementing it.

**F11 · P1 · Source-confirmed hierarchy defect; native reproduction required: accessibility fencing includes result controls.** The app marks the entire `renderScreen()` wrapper hidden from accessibility during victory/time-up. Both the ordinary View-based VictoryModal and time-up buttons are descendants of that same wrapper. Thus the attempt to hide the board also hides the controls that continue play.

Move these overlays outside the fenced subtree or fence only background board/chrome. **Done when:** TalkBack and VoiceOver can complete a normal/compact victory and speed failure, reaching Next/Home/Try Again while background controls remain inaccessible. Add a rendered hierarchy test. **S–M.** Sources: `App.tsx:5503`, `:5712`, `:6043–6063`; `VictoryModal.tsx:515`, `:740`.

**F12 · P1 · Confirmed implementation gap and web clipping: finish the rules and spotlight modal contracts.** Rules and Journal spotlight omit `onRequestClose`. Native Modal owns Android Back while open, so the app's normal BackHandler does not cover them. Rules also places all content in an unbounded, non-scrollable card. Fresh web inspection at 320×568 with text enlarged by 35% clipped the title, close control and bottom action off-screen ([screenshot](review-2026-09-05/rules-small-large-text.png)). This was browser text scaling, not a physical Android font-scale test.

Use safe-area-bounded scrollable content and a reachable close action, with explicit Android dismissal behavior that preserves intro state. **Done when:** rules can be read and dismissed at small sizes and enlarged fonts, and Android Back closes the appropriate modal without accidentally consuming unseen onboarding. **S.** Sources: `RulesModal.tsx:127–237`, `HomeScreen.tsx:3581`; [React Native Modal behavior](https://reactnative.dev/docs/modal#onrequestclose).

**F13 · P2 · Confirmed: the help button is an empty circle.** `getModeIconSprite('rules')` returns null because the registry has no `rules` key. The committed current puzzle render visibly shows the blank button.

Map the intended generated sprite and make named icon keys type-safe so a non-null assertion cannot hide a missing entry. **Done when:** How to Play has a visible recognizable icon and accessible label in every phase. **XS.** Sources: `App.tsx:5133`, `components/puzzle/modeIcons.ts:8–45`.

**F14 · P2 · Confirmed inconsistency: responsive layout is only partly reactive.** Eleven files retain module-level window dimensions, including house, home, pit, Fox guide and cinematics. The board and new story modals already use live dimensions. Resizing/folding can therefore update one layer while leaving another at its launch geometry.

Move geometry into shared live layout inputs in small steps, preserving home pan intent and drag coordinates. **Done when:** 320/360/390/430-width phones, tablet, and resize/fold transitions retain reachable actions, aligned scenery and correct taps. **M–L.** Sources: `HouseWorld.tsx:77`, `HomeScreen.tsx:212`, `OfferingPitScreen.tsx:117`, `PhaseTransitionOverlay.tsx:15`; [React Native live window dimensions](https://reactnative.dev/docs/usewindowdimensions).

**F15 · P2 · Design proposal: spend more screen space on decisions and readable text.** The puzzle's header, setup chip, message area and large row spacing consume substantial vertical space. In the committed 390×844 render, only part of the chain fits above the controls. Scrolling exists, so this is not a soft-lock. Elsewhere the default body size is 13 and the global font-growth ceiling 1.35, while the new story uses larger flexible text.

Prototype a more compact experienced-player header, a shorter idle instruction state and deliberate active source/target visibility. Use flexible body layouts and app-owned text primitives before increasing type globally; keep tile geometry separate. **Done when:** small-phone users can reliably see the next decision, readable body text grows without clipping, and a native large-text session completes every main flow. **M.** Sources: `appStyles.ts:125`, `:320`; `App.tsx:5566`; `theme/typeScale.ts`, `theme/fonts.ts:113`.

**Puzzle depth, economy and long-term play**

**F16 · P2 · Measured: most House Asks do not distinguish between winning routes.** An exhaustive read-only walk of all 1,978 regular standard-bank boards used the shipped dictionary/lock rules and actual ask-candidate function. No enumeration cap was hit. The following candidates were satisfied by every completing route:

| Bank | Automatic / all candidates | Share |
|---|---:|---:|
| Easy | 2,492 / 3,118 | 79.9% |
| Medium | 2,292 / 3,097 | 74.0% |
| Medium+ | 4,728 / 5,265 | 89.8% |
| Hard | 4,933 / 5,645 | 87.4% |
| Expert | 3,004 / 3,166 | 94.9% |

This measures bank candidates, not the frequency players encounter under live selection weighting; Lexicon/extension boards were not included. Example: GOTH/COPS/DOLE, “move H,” succeeds on both completing routes. Derive scored asks with both a complying and noncomplying complete-route witness; omit them when impossible, or explicitly treat the request as atmosphere. **Done when:** every scored ask changes a real route decision and remains satisfiable, without extra on-device solver stalls. **M.** Source: `services/houseAsks.ts:55–112`. Use gated generation tools, never manual bank edits.

**F17 · P2 · Mixed copy fix and teaching proposal: explain complex modes through play.** Double Shift says “Pick two letters, then place each,” while input actually alternates pick/drop/pick/drop. Correct this immediately. Preserve the already-spaced unlocks and acknowledged neutral-preview graduation. Add optional single-board practice for reverse return locks, double-shift intermediate validity, and blind judgment. Keep complex setup behind clear opt-in controls; do not resurrect a large preset catalog just to add another menu.

**Done when:** an unfamiliar player can explain the mode after one optional practice board and can identify all active modifiers before starting. **S copy, M teaching.** Sources: `puzzleVariety.ts:116`, `onboarding.ts:77`, `usePuzzleGame.ts`. Optional later addition: short offline definitions for rare accepted words, with a reliable licensed content source; test demand before building a dictionary subsystem.

**F18 · P2 · Verification and tuning: simulate the economy as players actually traverse it.** Narrative phase floors are separate from purchased amber, but amber still affects when residents can be recruited. Daily ad amber, quests, passive rewards, variants and harvest timing make theoretical per-win rewards a poor approximation of actual access.

Run deterministic trajectories for 2/day, 8/day, one long session, Easy-only, no shop/ads, all side rewards, Patron and Supporter. Report recruit/room dates, phase reach, available versus pending amber, hint stock, and rewards per minute. Use results to protect essential scenes and tune sinks. **Done when:** each cohort gets a coherent purchase-free story, optional spending cannot silently starve essential setup, and difficult variants have defensible time value. **M before tuning.** Sources: `amberCurrency.ts:641`, `gameBalance.ts:199`, `homeWorldData.ts:512`.

**F19 · P2 · Confirmed: daily history preserves provisional ranks and forgets “ever” records.** Rechecking standing displays a new rank without updating the saved ladder entry. History is capped at 120 days, and lifetime-sounding best/count values are derived from that truncated list.

Update one existing result on rank refresh, distinguish provisional/final/offline states, and store lifetime aggregates separately or label the rolling period honestly. **Done when:** offline completion later gains its rank without duplication, and day 121 cannot erase a lifetime best or shrink a lifetime participation count. **S–M.** Sources: `App.tsx:2137`, `:2787`; `dailyLadder.ts:22`, `:161`.

**F20 · P2 · Confirmed content/value weakness: premium season rewards repeat ownership indefinitely.** Every month grants the same `confetti_season`. After owning it, an amber-funded premium unlock can cost 2,500 for at most 500 premium amber and no new terminal cosmetic. Fix the season accounting first, then decide what recurring value is sustainable.

Choose a modest real cosmetic rotation, an evergreen collection with transparent duplicate handling, or retire the recurring amber premium purchase until there is fresh content. Preview exact owned/new rewards and remaining time/work. **Done when:** a repeat-month purchase has clearly described useful value and an affordable content-production plan. **M–L.** Sources: `seasonPass.ts:38`, `:276`; `gameBalance.ts:321–334`. Do not solve a weak offering by adding more purchase prompts.

**F21 · P2/P3 · Design proposal: let finite endgame content acknowledge completion.** Tending cost continues to rise while visual intensity saturates around 40 and authored milestones end at 70. Continued contribution can be meaningful, but should not imply unseen transformations indefinitely.

Show the next actual authored reward and a satisfying terminal state. Keep further contributions explicitly optional; preserve Unbroken Weave and New Cycle. Add a small garden/room keepsake only if it makes an observable difference. **Done when:** every promised deepening has visible content and players can continue solving without feeling obligated to service menus. **S for honest completion; M–L for content.** Sources: `tending.ts:96`, `gameBalance.ts` tending milestones.

**F22 · P2 · Design proposal: reduce reward errands and navigation ambiguity.** The home exposes Daily, Quests, Journal and utilities; Journal mixes story, whispers, words and seasonal rewards. Puzzle rewards, harvest, login, quests, season tiers and ad doubles create many separate receipts and claims. The pit should remain a meaningful ritual, but every reward need not become another modal.

Prototype a clearer Journal organization and one understandable tasks/rewards destination. Consolidate routine receipts, distinguish optional dialogue dots from urgent claim badges, and retain a prominent Play action. Show one plain benefit comparison for Remove Ads, Patron and Supporter. **Done when:** five new testers can resume a scene, find pending amber, change setup and find recovery without coaching; routine post-win actions take fewer taps without hiding rewards. **M.** Sources: `HomeScreen.tsx:1849`, Journal/quest modal render sections; `VictoryModal.tsx`; `StoreModal.tsx`.

**Story, characters and consequences**

**F23 · P1 · Confirmed scheduling weakness: PLUM can be replaced before the player can recruit Axel.** At 18 solves/phase 1, the scene permanently uses Ember's cup fallback if Axel is absent. Recruiting him later does not restore the fish setup. The cumulative route to Axel costs 565 amber; eighteen same-day three-star Easy solves supply 266 guaranteed amber before quests, ad grants or other extras. A plausible free continuous session can therefore permanently miss this emotional setup well before recruiting him. This is not a claim that all players miss it.

Keep the cup alternative for sparse rosters, but add a recruitment-triggered fish introduction in phases 1–3 with its own delivered-memory identity. Never force recruitment for a coherent ending. **Done when:** late-before-Returned Axel recruits meet PLUM alive and can encounter the fish payoff; fox-only and previously skipped saves remain honest. **M, paired with F18.** Sources: `storySpine.ts:83`, `:237–246`, `:270`; `homeWorldData.ts:512–602`.

**F24 · P1 product priority · Design proposal: put each ending into the house.** Boundary state currently changes story/cinematic text and illustration, but HouseWorld/RoomView do not consume it. The private room and outward road are narrated outcomes; the daily playable home remains identical.

Add one persistent inspectable object and small optional action per boundary: a protected door/page for CLOSED and an outward marker/gate for CLOSER. Give it an appropriate resident reaction and a next-cycle trace. **Done when:** after reload, the player can point to and interact with their chosen consequence; neither route gains a stat advantage or becomes the “true” ending. **M–L.** Sources: `storySpine.ts:295–320`, `phaseEvents.ts:396–529`, `HouseWorld.tsx`, `RoomView.tsx`.

**F25 · P2 · Design proposal based on confirmed behavior: keep previous-cycle journals.** New Cycle deliberately creates an empty memory collection, preserving only the final boundary and kept-record boolean. This is not random save corruption, but it weakens the promise of “Things We Kept.”

Archive completed transcripts and actual answers by cycle, read-only, with current scheduling separate. Bound save growth and avoid inventing missing legacy pages. **Done when:** two cycles' real choices remain readable after reload/restore, current scenes schedule correctly, and Reset follows its documented deletion policy. **M.** Sources: `storySpine.ts:94–99`, `SettingsScreen.tsx:278`.

**F26 · P2 · Design proposal: reward the opening attachment choice with specific callbacks.** The cup/drink answer is stored but later scenes query record/seeds/promise rather than that initial preference. Use the exact cup/drink in supper, the cup fallback and a home prop; let the final emotional reply occasionally remain visible too.

**Done when:** different opening choices produce correct small callbacks, anger/uncertainty is not silently overwritten, and missing memories use neutral copy. **S–M; combine with F24.** Source: `storySpine.ts:207–219`.

**F27 · P2 · Presentation proposal: improve rereading and character presence in essential scenes.** Core scenes have no previous-page control or position indicator, use static idle/robed portraits, and show the same table crop on many early first pages. Full-body portrait padding makes faces small. Retrospective scenes use the current phase's clothing.

Add compact page progress and read-only Back, a shared portrait component with better framing and restrained existing talk frames, contextual art crops, and remembered presentation phase. Commission a few central-character expressions only after trying existing assets. **Done when:** rereading cannot mutate a saved answer, old scenes dress correctly, large text keeps controls reachable, and reduced motion stays static. **M.** Sources: `StorySceneModal.tsx:31–61`, `PhaseTransitionOverlay.tsx:681`, `AnimalSprite.tsx:88`, `storySpine.ts:331`.

**F28 · P2 · Editorial proposal: cut repeated explanations while retaining catch-up clarity.** Council, Arrival, After cinematic and After conversation repeatedly explain the same boundary. The repetition protects skipped readers, but full readers could experience a lecture after the emotional payoff. Likewise, thirteen residents can lose distinctness if each ends every exchange with a similar lesson about consent.

Keep the council complete for sparse readers. Shorten redundant full-reader variants and make aftermath show ordinary actions: Axel's grief, Warren's construction, Panko's food, Thyme's garden. **Done when:** both sparse/full routes remain comprehensible, no line assumes an unseen event, and blind excerpts retain recognizable character voices. **M editorial, after F29 evidence.** Sources: `storySpine.ts:283–306`, `phaseEvents.ts:427`, `:518`, `animalDialogueTending.ts:20–115`.

**F29 · P1 product priority · Verification gap: measure story reach and comprehension before adding lore.** Essential scenes cluster near 80/90/96/103/115 solves, alongside phase transitions and optional dialogue. Current event types do not record the new core-scene delivery/defer/choice/resume lifecycle. Test counts cannot reveal whether players understand what the presence does or feel interrupted by Play-triggered conversations.

Add coarse scene IDs/status/reading time and branch IDs through existing telemetry, excluding transcripts and recovery secrets. Run unfamiliar-reader sessions and actual economy trajectories. **Done when:** queueing is distinguished from display, skipped/resumed scenes are measurable, and at least four of five pilot readers can explain the cost and both final words before the last move. Treat that small pilot as a clarity signal, not statistical retention proof. **M instrumentation plus playtesting.** Sources: `storySpine.ts:83–86`, `useStoryFlow.ts`, `eventLogger.ts:11–43`.

**Assets, sound, animation and sensory comfort**

**F30 · P2 · Measured opportunity: ship appropriately sized illustration derivatives.** The four new story PNGs total about 8.2 MiB and are each 1536×1024. Some uses display them in 132/148dp-tall headers; each full RGBA decode is roughly 6 MiB regardless of PNG file size. This is an asset-footprint observation, not a measured native leak.

Retain source masters and provenance, produce reviewed size/compression variants for headers and cinematics, and inspect the actual export manifest. **Done when:** shipped bytes materially decrease with no visible edge/silhouette degradation and repeated native scene opening has stable memory. **S–M.** Sources: `mobile/assets/story/`, `StorySceneModal.tsx:72`, `StoryJournalModal.tsx:76`.

**F31 · P2 · Source-level audio lifecycle gap; listening verification needed: cinematic one-shots can outlive their scene.** Finish/Skip cancels timers and animations but not long one-shot SFX. Arrival lasts 9.6 seconds; skipping soon after it begins can leave that cue over resumed play/music.

Give long cues a scene-owned handle and fade/cancel on exit, preserving deliberate tails between adjacent passages. **Done when:** immediate Skip, normal completion, background/resume and mute changes produce the intended sound on the signed Android build. **S–M.** Sources: `PhaseTransitionOverlay.tsx:531–542`, `:616`; `uiSound.ts:98`, `audio.ts:259`.

**F32 · P2 · Confirmed inconsistency: sensory preferences need one policy.** Reduced motion defaults false without OS preference integration. Move haptics remain independent of motion, while some dread/cinematic haptics disappear when motion is reduced.

Honor OS reduced motion unless explicitly overridden, and let the haptic preference consistently govern tactile effects. Only add a separate gentle-flash setting if testing establishes a need. **Done when:** first launch and preference changes behave consistently, no story information relies solely on effects, and motion preference does not unexpectedly disable unrelated feedback. **M including native QA.** Sources: `settings.ts:28`, `haptics.ts:75`, `useDreadEffects.ts:76`, `PhaseTransitionOverlay.tsx:623`.

**F33 · P2/P3 · Design proposal: give important moments room to land.** Existing animation and reward systems are extensive. Another layer of shake, sparkle or stingers is unlikely to help as much as clear priority between a valid move, reward receipt, resident line and revelation. The post-ending home can immediately return to many urgent badges and a generic tagline.

Create a short effect/prompt priority specification. Quiet routine cues beneath dialogue; use a boundary-aware landing line and a brief calm return after the finale. Listen through a 20-minute session before making new music: existing short loops may be fine, and fatigue was not established here. **Done when:** no unintended audio/message competition, key actions remain satisfying with effects reduced, and the ending has a perceptible pause. **S–M tuning; new music only after listening.** Sources: `useVictoryOrchestration.ts`, `uiSound.ts`, `phaseNarrative.ts:3216`.

**F34 · P3 · Targeted art proposal: improve continuity and legibility instead of replacing the art set.** Spend art effort on F24's persistent props, F27's portrait framing, readable small icons, and phase-consistent material treatment. Review adjacent screens and actual device-scale crops together. Existing rooms, sprites and painted tokens already support a recognizable game.

**Done when:** an asset is tied to an observed readability or storytelling need, its in-game size is reviewed, and its generation/source path is recorded. **S per small family.** Defer a new character roster, whole-game repaint and full voice acting until delivery/pacing stabilizes.

**Technical structure, measurement and release operations**

**F35 · P1 · Confirmed coverage gap: add a small set of real rendered and signed-build journeys.** The suite is strong on business rules. However, 38 of 138 test files contain source reads; some combine them with behavior, so this does not mean 38 suites are worthless. `appIntegration` explicitly scans wiring, and the story hook harness stubs effects. These cannot establish actual focus, tapping, cleanup or native module behavior.

Keep pure tests and add rendered integration plus release-device smoke for fresh onboarding, win/time-up, background/force-stop, date rollover, interrupted scene, both endings, cloud/reset and purchases. Store deterministic phase/roster fixtures. **Done when:** breaking an actual CTA or cleanup fails a behavioral test, and the exact signed build has a recorded Android smoke pass. **M initial, grow with each fix.** Sources: `.github/workflows/ci.yml`, `jest.config.js`, `appIntegration.test.ts:1`, `useStoryFlow.test.ts:9`.

**F36 · P2 · Architecture proposal: extract lifecycle ownership in small steps.** App is 6,360 lines and HomeScreen 5,023; the concern is overlapping ownership of navigation, overlays, story, victory, daily state and resets, rather than line count itself.

Extract a cancellable boot/session coordinator, typed overlay/navigation priority, durable outcome coordinator, and one storage registry owning serializer/migration/reset/cache invalidation. Preserve existing hooks; avoid adding a state library merely to move code. **Done when:** one owner schedules blocking overlays, restore/reset cancels old-session work, and adding persisted state requires one registry entry plus round-trip coverage. **L staged, after F35.** Sources: `App.tsx`, `HomeScreen.tsx`, `useStoryFlow.ts`, `cloudSave.ts`.

**F37 · P2 · Source-confirmed queue risk and measurement gap: make analytics dependable enough for decisions.** Event flushing and removal use separate read/modify/write operations; uploader acknowledgement removes the first N events rather than identified events. Concurrent logging, retention trimming and slow upload can lose unsent events or retain duplicates. There is no event-ID deduplication, and the custom endpoint lacks a request timeout.

Serialize queue writes, identify/acknowledge events, bound timeout and in-flight upload, and build a few useful funnels: onboarding completion, hint/abandon, phase and scene drop-off, save conflicts/failures and ad availability. **Done when:** delayed upload plus fresh logging retains unsent events, retries dedupe, and the owner can compare these outcomes by build/cohort. **M.** Sources: `eventLogger.ts:124`, `:190`; `telemetry.ts:125–165`.

**F38 · P2 · Verification gap: measure native performance before optimizing architecture.** Source data/assets are substantial, but source-folder bytes are not shipped AAB size. Screen density is currently used as a device-capability proxy and can overestimate a cheap high-resolution phone. VM web bundle memory is not evidence of native jank.

Profile a signed release on budget/midrange Android: cold/warm launch, first puzzle, drag frames, victory/pit/arrival, memory after repeated navigation and a 30-minute session. Inspect exported assets and set a baseline/regression budget. Optimize the largest measured costs before attempting lazy banks, room windowing or a renderer rewrite. **Done when:** device/build-specific metrics and a repeatable profile exist; either the baseline meets the agreed budget with no optimization needed, or a targeted change demonstrates improvement. **M measurement; fixes depend on results.** Sources: `deviceTier.ts:17`, `performanceMonitor.ts`, `App.tsx:1417`.

**F39 · P1 before public promotion · Release gap: separate testing and production configuration.** Internal submission and production use the production build/channel, with runtime keyed to app version. The existing launch checklist correctly warns that the ad-mode flag can travel through OTA to matching runtimes. Android test ads being enabled is intentional and should remain so during testing. iOS native monetization readiness is separate and not established by web no-ops.

Separate testing/public channels or enforce a verified runtime/version boundary and promotion procedure. Record SHA, build/runtime, ad mode, signed-device results, crash symbolication and rollback target. Check native dependency compatibility and explicitly declare directly used runtime packages such as expo-font. **Done when:** an internal OTA cannot change a public configuration, release artifacts are traceable, and rollback/symbolication are tested. **S–M.** Sources: `mobile/eas.json`, `mobile/app.json`, `docs/LAUNCH_CHECKLIST.md:65`, `docs/OTA_UPDATES.md`.

**F40 · P2 · Confirmed support/documentation mismatch: make deletion and recovery support operationally usable.** Public deletion instructions ask for a recovery code to find cloud, leaderboard and analytics records, while those systems can use different IDs and restored devices add further install IDs. No complete linking map is present in the reviewed implementation.

Define a non-secret lookup identifier and a testable mapping/runbook; keep it distinct from the recovery bearer credential. The lookup ID must never itself authorize deletion or restoration; require separately verified authority for those actions. Explain local Reset, cloud deletion and store entitlement restoration accurately. Verify actual retention jobs separately. **Done when:** a two-device test identity's intended records can be located and, with appropriate authorization, deleted without guessing UUID prefixes, and documentation matches retained state. **M after F01.** Sources: `docs/data-deletion.md`, `telemetry.ts:128`, `leaderboard.ts:67`. This is a verified implementation/documentation mismatch, not a legal compliance determination.

**F41 · P2 · Low-cost prevention: remove the dangerous generation entry point.** `npm run generate:puzzles` still invokes legacy generators, although AGENTS explicitly forbids it because it can replace gated banks with the old shape.

Disable or replace the obvious command with the supported gated family workflows and mandatory profanity/quality checks. Keep legacy tools clearly archival. **Done when:** following package scripts cannot accidentally destroy the multi-route bank contract. **S.** Sources: `mobile/package.json:15`, `AGENTS.md`, `scripts/runGatedRegen.sh` and companion workflows.

**F42 · P2 · Maintenance cut: replace stale completion claims with one current risk ledger.** Historical docs claim “everything code-side” is complete, cite old version 88, retain older theme/canon language and list some features as deferred that now exist. They are valuable history but unsafe current instructions.

Keep a short authoritative current architecture/balance/release-risk document; archive historical passes and link to code-derived values. Track each finding with evidence, owner, validation and status rather than a triumphant fixed-count total. **Done when:** a future contributor can identify current canon, regeneration commands, release gates and open defects without reconciling contradictory narratives. **S.** Sources: `CLAUDE.md:629`, `docs/COMPLETION_CHECKLIST.md`, `docs/AAA_IMPLEMENTATION_LEDGER.md`, `docs/LAUNCH_CHECKLIST.md`.

**F43 · P2 · Product/release work: refresh the store promise around the current experience.** Existing launch docs flag screenshot 5's obsolete +50% Challenge benefit and older menu images. The art and story have changed again. Re-capture the actual signed build and make the listing show the puzzle, house and slow unsettling turn without spoiling final words. Use the creator path with a coherent story-ready fixture and clearly identified progress.

**Done when:** screenshots show current UI and accurate rewards, the first screenshot explains the actual puzzle, and a new tester's first-session experience matches the store promise. **M including device capture.** Sources: `docs/LAUNCH_CHECKLIST.md:12`, `docs/STORE_LISTING.md`, `docs/PRESS_KIT.md`, `services/creatorKit.ts`. Current store-console assets were not inspected; verify what is actually published before replacing them.

**Cuts and additions I would actually choose**

Cut or simplify repeated hint charges, redundant post-win receipts, repeated full-reader moral explanations, permanent urgent dialogue badges, stale completion documents and the unsafe legacy generator command. Reconsider the recurring premium season purchase until it supplies real repeat value. Let finite tending content acknowledge its endpoint.

Add persistent ending props/actions, late-recruitment story setup, previous-cycle journal chapters, read-only scene Back/progress, targeted optional mode practice, understandable backup status/retry, and behavioral release fixtures. Consider word lookup/search, a few central-character expressions and music variation only after observing a need.

Defer new currencies, more puzzle modes, more residents, new competitive/social infrastructure, another monetization layer, a whole-game art replacement, full voice acting and an architectural rewrite. There is enough game here to improve substantially through stronger connections between existing systems.

**A practical implementation sequence**

| Wave | Scope and dependency | Reviewable exit condition |
|---|---|---|
| A: Stabilization | Design F01–F04 together; independently fix F05, F07–F13 and the F17 instruction. Begin F35 journeys alongside fixes. | Completed fixes have passing behavioral tests; signed Android confirms controls, dates and hints. Full recovery verification remains Wave B's gate. No claim of “fixed” from source patterns alone. |
| B: Durable outcomes | Complete recovery migration/restore/conflict work, F06 and support identity F40; remove unsafe generator F41. | Two-device and interrupted-write matrix passes; existing players can upgrade and recover. |
| C: Story and depth | F18/F29 measurements, then F23/F24; improve asks F16 and repeat reward value F20. | Essential setup is reachable for free cohorts; both ending consequences are inspectable; scored asks distinguish routes. |
| D: Presentation and simplicity | F14/F15/F22/F25–F34 with native profiling F38. Extract F36 boundaries only as coverage permits. | Small-screen/large-text/quiet-mode journeys pass; fewer routine interruptions; measurable or visible benefit per change. |
| E: Promotion and measured expansion | F37 analytics, F39 release separation, F42 documentation and F43 store refresh. | Current signed-build evidence, accurate listing, traceable runtime and working rollback; subsequent features justified by player evidence. |

Treat these as overlapping workstreams, not five giant commits. A solo developer should select a small milestone from each wave rather than promise the entire list in one release. Persistence and native QA are likely the longest dependencies; small control/copy fixes can ship independently after verification.

**Validation plan and evidence**

The review covered recent Git history, current app/services/components, story and release documents, generated assets and committed web renders. Independent workstreams examined gameplay/economy, narrative/art/audio and technical reliability. Actual service probes used mocked storage/providers and did not touch live backend saves. The House Ask and geometry experiments are described above; neither is a user-retention study.

Fresh verification at the reviewed commit:

- **TypeScript passed** with `npm run typecheck`.
- **All 138 suites / 3,817 tests passed**, none skipped, through `npm test -- --no-coverage --runInBand` with a temporary config enabling isolated ts-jest transpilation. Independent TypeScript checking supplies type validation. Repository test configuration was not changed.
- The VM has 2 GiB RAM and no swap. An initial simultaneous typecheck/test attempt was killed for memory; sequential reruns completed. This was an environment failure, not a failing assertion.
- **ESLint passed across all 355 included files: zero errors, 1,202 warnings.** The repository configuration was applied in fresh file batches to fit VM memory; no extra paths or rules were excluded. These warnings remain a maintenance backlog, not a claim of warning-free code.
- **Fresh web smoke inspection:** loaded the cold-open board at 390×844, opened How to Play, resized to 320×568, and enlarged browser text by 35%. The blank help icon and rules clipping were directly observed. No page exceptions occurred during that smoke. See the [fresh puzzle](review-2026-09-05/fresh-puzzle.png) and [enlarged rules](review-2026-09-05/rules-small-large-text.png).
- Separate seeded inspections reached the phase-0 home, story Journal, earlier-conversation archive, first essential scene and an ordinary puzzle. Deferring the scene continued into play; two HINT taps without a move reduced the balance from 5 to 3. Broader scripted navigation timed out; it is not counted as a complete playthrough or evidence of a native defect. Existing committed current renders supplement source review of other screens and endings.

The next device pass should use the **real signed Android internal-testing artifact**, with separate no-purchase, Remove-Ads, Patron and Supporter accounts. Test units remain enabled. Restored entitlements can survive reinstall/local reset, so a paid account is not a free-player ad test. Verify onboarding, both tap/drag, repeated hints, all restrictive modes, background/force-stop, midnight daily, monthly rollover, story defer/reload, late recruitment, both endings, New Cycle, cloud conflict/restore/reset, TalkBack, OS font scaling/reduced motion, audio interruptions, native purchase/ad failure and image sharing. Test notification/deep-link cold starts and offline paths too.

Live backend configuration, external console state, real purchases/ad fill, native performance/audio, and audience comprehension remain separate evidence gaps. Preserve this distinction when turning the plan into tickets.
