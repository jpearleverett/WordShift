# Current build and documentation

Updated **September 13, 2026** for the sequential-conversation follow-up to `main` at `f1f7cd5`. The earlier CI audit remains tied to [`6f96ebb583f591f46c9c023be6462d99d816a8e7`](https://github.com/jpearleverett/WordShift/commit/6f96ebb583f591f46c9c023be6462d99d816a8e7). This page distinguishes current implementation from recorded validation; it does not certify an uploaded AAB, a Play rollout, or hosted service configuration.

## Build identity

Current source builds on main `f1f7cd5`, retaining its compact next-unlock sign, attunement layout fix and house-upgrade gifts. App version **1.3.5** and Android version code **99** remain unchanged. The earlier CI audit and its historical totals below remain tied to `6f96ebb`; they are not evidence for a new native build.

| Setting | Checked-in value | Source |
|---|---|---|
| App version | `1.3.5` | `mobile/app.json` |
| Android package / version code | `com.wordshift.app` / `99` | `mobile/app.json` |
| iOS bundle / build number | `com.wordshift.app` / `3` | `mobile/app.json` |
| Expo / React Native | SDK 57; lockfile resolves Expo `57.0.20`, RN `0.86.3` | `mobile/package-lock.json` |
| Version management | Local; increase Android version code for each new Play upload | `mobile/eas.json` |
| Resolved OTA runtime | `1.3.5-<release-channel>` | `mobile/app.config.js` overrides the static runtime policy |
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

## Remaining release evidence

Use the [launch checklist](LAUNCH_CHECKLIST.md) to record results against the actual candidate AAB/version code. In particular:

- Exercise cold start, fonts/art/audio, background/resume and ceremony interruption on the signed **minified** Android build.
- Exercise a free-player account, test ads, paid checkout, pending/cancelled checkout, retry, restore, reset and reward interruption. Mocked SDK tests and browser journeys do not establish store-side behavior.
- Verify hosted Supabase migrations and retention jobs, RevenueCat products/entitlements, Sentry delivery and Play listing/consent configuration. Source configuration alone does not prove deployment.
- Compare Play's per-device download/install estimates and DEX metrics after the new build. The reported **497 MB EAS source upload** is a separate measurement; its exact contents have not been inspected here.

Android test ad IDs remain deliberately enabled in the checked-in configuration. The production ad cutover and public Play rollout are separate release actions. iOS monetization configuration remains incomplete.

## Documentation map

| Need | Current reference |
|---|---|
| Development, architecture and safety constraints | [README](../README.md), [AGENTS](../AGENTS.md), [CLAUDE](../CLAUDE.md) |
| EAS archive size, builds and native optimization | [Build and upload](BUILD_AND_UPLOAD.md) |
| Release acceptance and operational work | [Launch checklist](LAUNCH_CHECKLIST.md), [completion checklist](COMPLETION_CHECKLIST.md), [support runbook](SUPPORT_AND_RETENTION_RUNBOOK.md) |
| Billing, ads, backend, analytics and updates | [Monetization](MONETIZATION_SETUP.md), [backend](BACKEND_SETUP.md), [analytics](ANALYTICS_DELIVERY.md), [save integrity](SAVE_INTEGRITY_UPGRADE.md), [OTA](OTA_UPDATES.md) |
| Story, choices, ceremonies and visuals | [Story implementation](STORY_AND_VISUAL_IMPLEMENTATION.md), [story playtest](STORY_PLAYTEST_PROTOCOL.md), [presentation policy](../mobile/docs/STORY_PRESENTATION_POLICY.md), [typography ownership](../mobile/docs/TYPOGRAPHY_AND_ANIMATION_OWNERSHIP.md) |
| Public copy and release art | [Store listing](STORE_LISTING.md), [press kit](PRESS_KIT.md), [launch asset package](../mobile/assets/Play_store/launch-2026-09/README.md) |

The July audits, September 5–6 reviews/reports, and `RELEASE_VALIDATION_1_3_0.md` are **historical evidence**. Their original counts, screenshots, access checks and completion statements apply to the recorded snapshot. Current references above take precedence for build commands and behavior. Dated marketing renders likewise need comparison with the current signed candidate; editing their README does not regenerate the images or ZIP.

Keep this page's audit date, commit, configuration and CI link together when updating it. Do not relabel historical evidence as a new device pass or mark an external deployment complete from source inspection alone.
