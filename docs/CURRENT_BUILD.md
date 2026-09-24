# Current build and documentation

## September 24: 1.4.6 / 111

The owner built and device-tested the 1.4.5 / 110 production candidate. Since
then: the reworked ending (vigil, eve dock, Arrival and Morning After art, the
closing card), plain speech for the phase 4-5 house corpus, story portrait
fixes, OTA source-map upload, story-record quarantine, and the 16 SDK-57
patch updates (`npx expo install --fix`; `expo-doctor` 21/21). The patches
change native modules, so this is a new binary: app **1.4.6**, Android code
**111**, runtime `1.4.6-<channel>`. Typecheck, lint and the in-band suite
(244 suites, 5,490 tests) pass. Not yet device-tested.

## September 22 launch-readiness follow-up (1.4.5 / 110)

Branch `claude/wonderful-wright-wg49h9` carries the [2026-09-22 launch readiness review](LAUNCH_READINESS_REVIEW_2026-09-22.md) and its fixes. App version **1.4.5**, Android code **110**; the build needs a new native binary because it adds the `android:appCategory="game"` manifest flag, the Sentry Android Gradle plugin (R8 mapping upload) and Metro debug IDs, so its OTA runtime is `1.4.5-<channel>`. The owner's device pass on the 1.4.4 internal build (2026-09-22) found purchases, onboarding, cloud backup and restore after Reset All, ads and notifications working. What remains before promotion is listed in the review's Resolution section and in the [launch checklist](LAUNCH_CHECKLIST.md); the Supabase files 9-11, the AdMob content-rating ceiling, Google Play RTDN to RevenueCat and the terms' governing-law clause (New York) were all completed on 2026-09-22. Still open: Sentry alert rules and the production-profile device checks.

## September 20 manual phase transitions and resident responses

`feature/manual-phase-transitions`, based on main `4682c4c`, makes every ceremony passage wait for Continue and adds Back navigation. Android Back returns to the previous passage, with skip confirmation on the first. Revisiting a passage does not repeat its one-shot audio or haptics.

Completing or deliberately skipping a phase ceremony immediately opens a recruited resident's acknowledgement. The response is saved in the ceremony queue before the handoff, survives interruption, and takes priority over a held house ceremony or share invitation. It does not consume regular conversations or introductions. Phase 5 responds after the aftermath and respects the player's ending boundary.

Validation passed: **227 Jest suites / 5,286 tests** in-band, TypeScript, zero-warning lint and the story corpus audit. Eight targeted rendered browser journeys passed, including 320px enlarged-text controls, normal/reduced-motion manual navigation, interrupted ceremony/reaction recovery, save retry and pit navigation; the final reaction-state cleanup also passed its browser journey again. The app remains **1.3.9 / Android 104**. These checks are source/web validation, not a signed Android device pass.

## September 20 decision and Journal follow-up

`feature/story-layout-journal-fixes`, based on main `45973ae`, fixes oversized decision illustrations, rewrites the Journal introduction with the real menu icons and destinations, limits earlier conversations to completed dialogue, and simplifies How to Play. The owner's **1.3.9 / Android 104** version is unchanged. TypeScript, zero-warning lint and **684 focused tests in 15 suites** passed. The change and validation report was retired on 2026-09-22 (git history holds it); ordinary GitHub CI supplies the full-suite and browser results. Physical Android layout verification remains part of the next internal-testing build.

The same follow-up also adds animal portraits to Journal entries, moves victory confetti into the result foreground, shares the Sparks design between gameplay and the shop's live preview, and makes the difficulty button follow the phase's cottage colors. [PR #454](https://github.com/jpearleverett/WordShift/pull/454) records the latest complete validation.

## September 19 screenshot and store follow-up

This work landed through [PR #453](https://github.com/jpearleverett/WordShift/pull/453), replacing the closed [PR #450](https://github.com/jpearleverett/WordShift/pull/450). It fixes the reported recovery/reset behavior, clipboard access, tutorial timing and modal overlap, drag clipping, axolotl scale, duplicate streak badge and victory layouts. It also adds 185 individually reviewed page illustrations with continuous resident portraits. See the [art coverage review](ART_COVERAGE_REVIEW_2026-09-19.md); the dated change and validation report was retired on 2026-09-22 (git history holds it).

All 222 collected Jest suites have passing results across the integrated and focused runs; typecheck and zero-warning lint passed. The production Android Hermes JavaScript/assets export passed, including all 185 final story images, and the strict image validator found no missing or invalid assets. `expo-clipboard` is a new native dependency. This work is not a signed Android build or a Play upload, and the next internal-testing build still needs device verification.

The September 19 `assembled-listing-2026-09` store campaign was deleted on 2026-09-22; the live Play listing is the September 7 [launch-2026-09](../mobile/assets/Play_store/launch-2026-09/README.md) campaign (owner-confirmed). Git history holds the deleted campaign.

## Animal walking follow-ups

`feature/walk-foot-direction` corrects seventeen lower-limb frames across fourteen normal/robed walk atlases after reviewing all thirteen animals. Forward toes and alternating leg identity are preserved; the original fox walk is unchanged. The deterministic patch builder retains every pixel outside each selected lower-limb rectangle. The dated repair and validation report was retired on 2026-09-22 (git history holds it). This is a feature-branch artwork follow-up, not a new signed Android build or Play upload.

[PR #449](https://github.com/jpearleverett/WordShift/pull/449), on `feature/alternating-animal-walks` based on main `3b7ec4e`, supplies 12 refreshed normal cycles and 13 robed cycles; the original ten-frame normal fox walk remains. Outfit selection, loading fallbacks, facing and interrupted travel are covered, with reduced-motion and device-tier limits retained. [The walking review](ANIMAL_WALK_REVIEW_2026-09-17.md) records all 25 atlas checks, 5,161 unit tests and 43 browser journeys passing. This follow-up awaits owner merge and does not represent a new signed Android build or Play upload.

## September 17 assessment fixes

The follow-up to `main` at `c9f5835` addresses the September 16 audit. Its resolution map was folded into CLAUDE.md's September 17 section and deleted on 2026-09-22. Earlier dated test totals below retain their original scope. At that assessment-fix snapshot, source version was 1.3.6 / Android 101; the later version bump is recorded below. The assessment fixes did not themselves constitute a Play upload.

Updated **September 14, 2026** for the in-band CI exit-code fix on top of `main` at `687a08d` (the launch-readiness merge, PR 439). The earlier CI audit remains tied to [`6f96ebb583f591f46c9c023be6462d99d816a8e7`](https://github.com/jpearleverett/WordShift/commit/6f96ebb583f591f46c9c023be6462d99d816a8e7). This page distinguishes current implementation from recorded validation; it does not certify an uploaded AAB, a Play rollout, or hosted service configuration.

## Build identity

Current source is app **1.4.6**, Android version code **111** (see the September 24 section above; 1.4.5 / 110 was the September 22-24 candidate; 1.3.9 / 104 was the September 19-20 identity). The earlier CI audit and its historical totals below remain tied to `6f96ebb`; they are not evidence for a new native build.

| Setting | Checked-in value | Source |
|---|---|---|
| App version | `1.4.6` | `mobile/app.json` |
| Android package / version code | `com.wordshift.app` / `111` | `mobile/app.json` |
| iOS bundle / build number | `com.wordshift.app` / `3` | `mobile/app.json` |
| Expo / React Native | SDK 57; lockfile resolves Expo `57.0.20`, RN `0.86.3` | `mobile/package-lock.json` |
| Version management | Local; increase Android version code for each new Play upload | `mobile/eas.json` |
| Resolved OTA runtime | `1.4.6-<release-channel>` | `mobile/app.config.js` overrides the static runtime policy |
| Android release optimization | R8 minification, resource shrinking, optimized ProGuard defaults and optimized resource shrinking enabled; PNG crunch disabled | `mobile/app.json`, `mobile/plugins/withAndroidOptimization.js` |

`mobile/package.json` still has npm package version `1.3.1`; that field is tooling metadata, not the Expo app version or Android version code. Do not infer the installed app version from it. The current React Native Gradle plugin resolves AGP 8.12.0; the optimization configuration does not require an AGP 9 migration.

The owner tests a signed Android build installed through **Google Play internal testing**. Web and Expo Go previews cannot validate native billing, ads, release R8 behavior or Android lifecycle behavior. Both configured Android submit profiles currently target the **internal** Play track; a profile named `production` is not proof of a production rollout.

## Current implementation and recent merged behavior

These entries describe implementation, with acceptance checks below. They are not claims that every possible interruption has been tested on a device.

| Area | Current behavior | Implementation / change |
|---|---|---|
| Complete resident conversations | All 13 residents receive their full normal introduction and then their 134 regular lines in authored order, subject to existing chapter gates and deferred locked-resident references. Phase changes and Arrival never consume unread lines; Phase 5 serves remaining regular dialogue before Tending. The separate acquaintance/catch-up route and “Tell me about yourself” action are retired. | Current follow-up: `conversationProgress.ts`, `homeWorldData.ts`, `useDialogueFlow.ts`, `HomeScreen.tsx`; supersedes the acquaintance routing in [PR 433](https://github.com/jpearleverett/WordShift/pull/433) |
| Conversation receipts and wording | Next after the final page records one stable line ID; Close and interruptions leave it unread. Individual temporal variants use the current phase and actual Arrival. Ambiguous legacy cursor histories begin an empty read ledger without resetting the house, intros or choices; New Cycle resets regular receipts. | Current follow-up: `conversationProgress.ts`, `amberCurrency.ts`, `animalConversationText.ts`, `conversationAdaptations*.ts` |
| Story choices | Animal choice screens have clearer answer cards, responsive reading space and durable selections. Deferred choices remain unanswered. | `DialogueChoicePage.tsx`, `dialogueChoices.ts`, `useDialogueFlow.ts`; [PR 433](https://github.com/jpearleverett/WordShift/pull/433) |
| Room upgrades | All 13 rooms / 65 upgrade steps become saved gifts on purchase. Visit the room, tap its animal and choose Give to apply the improvement and hear its current-phase reaction. Debit, ledger and pending gift share a transaction; delivery and reaction acknowledgement are durable. Existing installed upgrades remain installed. | `roomUpgrades.ts`, `HouseUpgradeGiftModal.tsx`, `houseUpgradeDialogue.ts` |
| House layout | The next-unlock sign uses one compact text row, with full requirements in its accessible label and tapped details. Attunement offers restore visible opacity and use separate view keys per level, preventing invisible cards from leaving blank space after purchase. | `HomeScreen.tsx`, `ShopScreen.tsx` |
| Store and reward safety | Duplicate checkout/restore taps and navigation during pending operations are fenced. Known paid grants can retry local persistence without starting another payment. Cosmetic, Daily Amber and Supporter stipend mutations are transactional. | Billing, currency, reward and store services; [PR 434](https://github.com/jpearleverett/WordShift/pull/434) |
| Purchase recovery limits | Same-install transaction history can recover eligible missed consumables after a durable baseline. Restore does not replay old spent packs or promise consumable recovery across reinstall/account changes. The first-purchase bonus marker survives Reset All. | `revenueCatBilling.ts`, `iap.ts`, `entitlements.ts`; [PR 434](https://github.com/jpearleverett/WordShift/pull/434) |
| Phase and story ceremonies | Phase, house, arrival, aftermath and new-cycle ceremonies are queued durably and acknowledged after completion or deliberate Skip. Restart replays an unacknowledged scene from the beginning; old saves do not receive a backfill of every historical scene. | `amberCurrency.ts`, `ceremonyPlayback.ts`, `App.tsx`; [PR 437](https://github.com/jpearleverett/WordShift/pull/437) |
| Reading and unlock handoffs | Ceremony Skip requires confirmation, rapid Continue taps are guarded, background playback pauses, and long pages remain readable. Mode notices clear after their final page. Stale puzzle/dialogue callbacks cannot replace newer sessions. | `PhaseTransitionOverlay.tsx`, `useDialogueFlow.ts`, `usePuzzleGame.ts`; [PR 437](https://github.com/jpearleverett/WordShift/pull/437) |
| Victory and tending rewards | Victory doubling uses the saved victory receipt and atomically records the bonus claim; exit actions wait for a pending claim. Tending debit, level and ledger updates are transactional. | `victoryDouble.ts`, `useVictoryDouble.ts`, `tending.ts`; [PR 437](https://github.com/jpearleverett/WordShift/pull/437) |
| Android optimization | Release-only R8 configuration is enabled. A signed build and device pass are needed to establish native compatibility and measure the resulting DEX/AAB size. | `withAndroidOptimization.js`; [PR 436](https://github.com/jpearleverett/WordShift/pull/436) |

## Validation actually observed

The [CI run for the audited main commit](https://github.com/jpearleverett/WordShift/actions/runs/34740523829) passed:

- TypeScript and lint with zero warnings.
- **4,641 tests in 194 suites**, plus **11** separately configured reverse top-up regressions.
- Story corpus, vocabulary delivery, complete-route and daily-board cohort checks.
- **30 rendered browser journeys**, including unlock/victory handoffs and progression safety.

The vocabulary check reports **4,372 eligible boards in 7,356 stored records**, across **30 bank families**, with at least 100 eligible boards per family. Stored counts are not all freshly deliverable boards. Routine top-ups must use the [gated generation instructions](../CLAUDE.md#regenerating-puzzle-banks).

The earlier documentation/upload cleanup changed no gameplay. It clarified the existing purchase-restore and Reset All behavior in the [privacy policy](privacy-policy.md) and [terms](terms.md), with September 13 effective dates. Public-site deployment remains separate from source validation. Its archive checks are recorded in [Build and upload](BUILD_AND_UPLOAD.md). Test totals above are tied to the linked source commit; consult the cleanup PR's checks for its own result.

## House-gift change validation

The September 13 house-gift and layout changes passed **279 focused tests in 10 suites**, TypeScript, lint with zero warnings, and the story corpus integrity audit. These cover exact purchase/delivery receipts, restart recovery, legacy ownership, absent recipients, New Cycle preservation and all 65 upgrades across current dialogue phases. All **four targeted browser journeys** also passed: 320/390px single-row banner bounds and full accessible requirements; normal-motion repeated-attunement layout; all five gift handovers with unopened/unfinished-reaction relaunch recovery; and interrupted purchase retry without a second debit. These browser checks are not a signed-device pass.

## Sequential-conversation follow-up validation

The final focused regression run passed **906 tests in 27 suites**, plus TypeScript and lint with zero warnings. Coverage includes all 134 regular lines for each of the 13 residents, temporal wording, legacy cursor ambiguity, deferred resident references, interrupted and idempotent receipts, terminal Next versus Close, parent progress updates, welcome acknowledgement, New Cycle, cloud/reset behavior and house-upgrade gifts.

All **three conversation browser journeys** passed: actual Phase-3 recruitment with a complete welcome followed by the earliest unread lines across phase changes and relaunch; an adapted post-Arrival conversation that survives interruption and advances one saved line at a time; and reachable response controls at 320px with enlarged text. Explicit animal taps also work during the post-Arrival quiet period. The earlier house-gift browser checks and CI totals above retain their original scope. These checks do not certify a signed Android build.

## September 14 CI and conversation-shortcut follow-up

The [failed CI run on `a0fbb05`](https://github.com/jpearleverett/WordShift/actions/runs/34799279373) passed TypeScript and lint, then failed five invitation tests because their extracted HomeScreen harness lacked `houseGiftBusy`. The harness now includes that state and gift/invitation race coverage. Conversation persistence tests isolate the event logger so its delayed telemetry import cannot outlive Jest teardown.

The footer now says `Talk to <name>` and opens the same gift/introduction/conversation route as a house tap. Browser testing reproduced the old pending-gift bypass; ordinary, unseen-introduction and gift handoffs all pass after the fix. Duplicate taps are fenced and failed opens provide retry guidance.

Local validation passed **4,789 tests in 197 suites**, the **11 reverse-composition script tests**, TypeScript, zero-warning lint, story integrity, vocabulary/branching and bank-route audits, and the daily cohort check. The **three shortcut browser journeys** passed. CI uses Node-24-based v6 checkout/setup/upload actions while retaining Node 22 for the application; browser evidence uploads only after the browser step runs. ESLint excludes generated browser reports and traces. App version 1.3.5 / Android version code 99 are unchanged.

## September 14 launch-readiness merge and the in-band CI exit code

PR 439 merged the launch-readiness branch into `main` at `687a08d`. Its
[CI run 442](https://github.com/jpearleverett/WordShift/actions/runs/34876474354)
passed TypeScript and zero-warning lint and reported **209 suites / 4,997 tests
passed**, yet the Test step exited 1. No test failed: four suites
(`ceremonyPlayback`, `useVictoryDouble`, `billingPurchaseSafety`, `adsConsent`)
reach `logEvent` without mocking `eventLogger`, which arms its 5 s debounce
timer; under `--runInBand` one process outlives every suite, the timer fires
during a later suite, and the flush's deferred `require('./telemetry')` trips
Jest's import-after-teardown guard, which sets `process.exitCode = 1`. A
multi-worker run discards each worker's exit code, which is why the same suite
was green locally. Reproduced locally in CI's mode before the fix (exit 1, the
same four leaks).

The fix: a global Jest setup (`src/__tests__/helpers/jestSetup.ts`,
`setupFilesAfterEnv`) cancels the timer after every suite through the new
`cancelPendingFlushForTests`; the timer's clearer is captured when it is armed
so a suite that switches to fake timers cannot mismatch it; and `flushEvents`
resolves the telemetry module synchronously at flush start (cached on success
only) so the deferred require can no longer run in a later tick. Local
validation in CI's mode (`npm test -- --no-coverage --ci --runInBand`):
**209 suites / 4,997 tests, exit 0, zero teardown imports**, plus TypeScript and
zero-warning lint. App version 1.3.5 / code 99 unchanged; nothing native moved.

The follow-up merge (PR 440, `c23dfb4`) then failed CI one step later, at
"Puzzle delivery policy and daily cohort": `updateDailyBoardVersion.mjs --check`
reported the daily cohort stamp stale because two hashed inputs had changed on
the launch-readiness branch (`constants/gameBalance.ts` for the economy tuning
and `services/dailyChallenge.ts` for the completion-cohort recording), while the
banks, dictionary and board selection were untouched. The stamp was regenerated
to `daily_v2_c2dbbd283e5cd45b`; the served daily board is identical, only the
leaderboard partition name moves, and no build carrying the previous v2 stamp
has shipped (the closed test ran 1.2.2 / code 88, before v2 cohorts existed).

## September 14 release candidate (1.3.6 / 100) and its verification environment

`main` at `70a1883` raises app version 1.3.5 to **1.3.6** and Android version code
99 to **100**, the identity the first internal-testing build carries.
[CI run 447](https://github.com/jpearleverett/WordShift/actions/runs/34886674485)
passed on that commit: TypeScript, zero-warning lint, **210 suites / 4,998 tests**
in-band, the resolved-production-Expo-config step, the reverse top-up regressions,
the story-corpus, vocabulary/branching, bank-route and daily-cohort audits, and
**37 browser journeys**. Raising the app version moves the resolved OTA runtime to
`1.3.6-<channel>`; nothing at 1.3.5 ever shipped and no update was ever published,
so no install is orphaned, but a future `eas update` and any rollback must name
`1.3.6-production`. The commands in [OTA instructions](OTA_UPDATES.md) were updated
with it. Green CI remains a JavaScript gate, not a native release acceptance test.

**The pre-build checks cannot all run on a phone.** Running them under Termux on
Android reported three failures and two unsupported commands, none of them repository
defects: `npm run typecheck` aborts with a JavaScript heap OOM against roughly a 1 GB
ceiling; `skyGeometry` and `shopIconGeometry` cannot load `sharp`, which has no
android-arm64 runtime (it is a devDependency that never enters the app bundle, and
those two suites are its only consumers); and Playwright refuses the platform outright,
so neither `playwright install` nor `npm run test:e2e` can run. Run these on a computer
or read them off the CI run for the same commit.

One real defect did surface from that run and is fixed: `scripts/tools/gatedCheckpointCount.mjs`
printed its count with `console.log(<number>)`, which `util.inspect` wraps in ANSI
colour when colour is forced (an interactive Jest run propagates `FORCE_COLOR`). All
three gated drivers read that stdout into shell arithmetic
(`count=$(count_accepted)` then `$((new_count - count))`), where an escape code is
`syntax error: operand expected`, so bank regeneration would have died confusingly in
any coloured environment. The count is now printed as a string and
`gatedTooling.test.ts` pins it under `FORCE_COLOR=1`.

## Launch readiness review (2026-09-14)

The 2026-09-14 review (deleted on 2026-09-22 once the
[2026-09-22 review](LAUNCH_READINESS_REVIEW_2026-09-22.md) superseded it; git
history holds it) answered "is the game ready to publish" with a twelve-dimension review of `main`
at `8233184` (app 1.3.5 / code 99). Its verdict was **conditionally ready: publish
the next artifact, not the current one**, on three blockers:

1. **Consumable purchases credit twice** (fixed on 2026-09-14): checkout
   recorded the Google Play order id as the grant id while receipt recovery
   keyed the same purchase on RevenueCat's transaction id, so every amber pack,
   hint pack and starter pack was granted again by recovery (the first amber
   pack three times). The checkout now links the RevenueCat receipt id to the
   grant in the same durable write, recovery resolves a receipt to its owning
   grant by either id, late receipts are covered by a 60 s same-product window
   and a durable receipt alias, and the reproduction that credited 0 -> 1200
   -> 1800 now credits once (`billingAdapterSdk` / `billingPurchaseSafety`).
2. **The shipping toolchain has never run on a device.** SDK 57 / RN 0.86, R8
   minification, resource shrinking and the optimizing ProGuard default all
   landed after the closed test that earned production access (1.2.2 / code 88).
   The production-cut AAB must pass the internal track on physical phones first.
3. **The production cut was a manual, unenforced edit** (resolved on 2026-09-14):
   `app.config.js` now derives `adsUseTestIds` from `WORDSHIFT_RELEASE_CHANNEL`,
   so the `production` EAS profile serves live units by itself and CI validates
   both channels on every run. Only the version-code bump remains a hand step;
   follow the checklist's command sequence.

The review's medium and low findings that live in the repository were fixed
the same day on the review branch (resolution table in the review document);
the backend items are tracked in [backend setup](BACKEND_SETUP.md) (hosted v2
migrations verified 2026-09-14; `rate_limits_v1.sql` and the event-retention
cron applied by the owner on 2026-09-15, post-apply probe reported passing). Native
dependency change: **`expo-device` ~57.0.2** (installed-RAM device-tier signal,
Android only) was added on 2026-09-14, so the next Play artifact must be a new
native build; an OTA onto the current binary stays safe because the guarded
require falls back to the pixel heuristic. The expo-audio plugin options,
blocked permissions, launcher name and Android 12 splash icon changes from the
same review also need that native build.

## Remaining release evidence

Use the [launch checklist](LAUNCH_CHECKLIST.md) to record results against the actual candidate AAB/version code. In particular:

- Exercise cold start, fonts/art/audio, background/resume and ceremony interruption on the signed **minified** Android build, including a manifest permission check on the AAB (`bundletool dump manifest --bundle=<file>.aab | grep uses-permission`: no RECORD_AUDIO, SYSTEM_ALERT_WINDOW or external-storage entries), a TalkBack pass over a board (one stop per source letter, double-tap selects) and a three-button-navigation pass over the dialogue sheet and utility menu on Android 15.
- Exercise a free-player account, test ads, paid checkout, pending/cancelled checkout, retry, restore, reset and reward interruption. Mocked SDK tests and browser journeys do not establish store-side behavior.
- The hosted Supabase v2 migrations were verified deployed by a read-only probe on 2026-09-14 ([backend setup](BACKEND_SETUP.md#hosted-state-verified-2026-09-14)); `rate_limits_v1.sql` and the retention cron were applied by the owner on 2026-09-15 with the post-apply probe reported passing, and the cron has completed a successful run; the Play listing graphics and phone screenshots were reviewed and uploaded by the owner on 2026-09-15; still verify event arrival from the signed build, RevenueCat products/entitlements, Sentry delivery, and the Play Console declarations and consent configuration (target audience, data safety and IARC are separate from the Graphics upload). Source configuration alone does not prove deployment.
- Compare Play's per-device download/install estimates and DEX metrics after the new build. The reported **497 MB EAS source upload** is a separate measurement; its exact contents have not been inspected here.

Android test ad IDs remain deliberately enabled in the checked-in configuration. The production ad cutover and public Play rollout are separate release actions. iOS monetization configuration remains incomplete.

## Documentation map

| Need | Current reference |
|---|---|
| Development, architecture and safety constraints | [README](../README.md), [AGENTS](../AGENTS.md), [CLAUDE](../CLAUDE.md) |
| EAS archive size, builds and native optimization | [Build and upload](BUILD_AND_UPLOAD.md) |
| Release acceptance and operational work | [Launch checklist](LAUNCH_CHECKLIST.md), [support runbook](SUPPORT_AND_RETENTION_RUNBOOK.md) |
| Billing, ads, backend, analytics and updates | [Monetization](MONETIZATION_SETUP.md), [backend](BACKEND_SETUP.md), [analytics](ANALYTICS_DELIVERY.md), [save integrity](SAVE_INTEGRITY_UPGRADE.md), [OTA](OTA_UPDATES.md) |
| Story, choices, ceremonies and visuals | [Story implementation](STORY_AND_VISUAL_IMPLEMENTATION.md), [story playtest](STORY_PLAYTEST_PROTOCOL.md), [presentation policy](../mobile/docs/STORY_PRESENTATION_POLICY.md), [typography ownership](../mobile/docs/TYPOGRAPHY_AND_ANIMATION_OWNERSHIP.md) |
| Public copy and release art | [Store listing](STORE_LISTING.md), [press kit](PRESS_KIT.md), [launch asset package](../mobile/assets/Play_store/launch-2026-09/README.md) |

The surviving September reports (`reports/`, and the bank proof files kept in `review-2026-09-06/` because the [bank top-up](PUZZLE_BANK_TOP_UP_2026-09-06.md) links them) are **historical evidence**. Their original counts, screenshots, access checks and completion statements apply to the recorded snapshot. Current references above take precedence for build commands and behavior. The July design audit and ledger, the September 5 review set, `RELEASE_VALIDATION_1_3_0.md` and the dated September status/handoff docs were deleted on 2026-09-15 once their findings had been folded into CLAUDE.md and the docs above; git history holds them. On 2026-09-22 the September 16 assessment, the dated screenshot, UI and walk follow-up reports, the `visual-review/` walking strips and the unlinked screenshots and logs in `review-2026-09-06/` were deleted the same way. The marketing renders were compared against the current candidate and uploaded by the owner on 2026-09-15; editing their README does not regenerate the images, and the two Graphics assets are manual Play Console uploads, so changing them in Git never updates the live listing. Later on 2026-09-22 the 2026-09-14 launch readiness review, the September 17 assessment resolution and the September 13 completion checklist were deleted too: the 2026-09-22 review supersedes the first, CLAUDE.md carries the second's rules, and the third's open device items moved into the launch checklist.

Keep this page's audit date, commit, configuration and CI link together when updating it. Do not relabel historical evidence as a new device pass or mark an external deployment complete from source inspection alone.
