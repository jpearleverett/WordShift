# WordShift launch readiness review (2026-09-22)

Reviewed source: branch `claude/wonderful-wright-wg49h9` at `bef7213` (origin/main `5cc5bdf` plus three dialogue commits), app **1.4.4**, Android version code **109**, Expo SDK 57 / React Native 0.86. The owner has Google Play production access and asked whether the game is ready to publish. This follows the [2026-09-14 review](LAUNCH_READINESS_REVIEW_2026-09-14.md), whose blockers B1 (double credit) and B3 (manual production cut) were fixed and whose B2 (no device pass of the shipping toolchain) remained open.

## Verdict

**Almost ready. The game is ready; the artifact is not proven yet.** Every automated gate passes, no dimension found a blocker in code, and the story, save layer and legal work are in launch shape. What stands between you and Publish is one device session on the exact production build plus a handful of console and config tasks, most under an hour each. Do them, then publish as a **staged rollout**, not 100%.

The single most important thing to check on the device: **buy one amber pack and confirm it is credited exactly once**, including after force-stop and Restore (MON-1 below).

## Resolution (2026-09-22, same branch)

The owner reported a device pass on the 1.4.4 internal build: the game works, purchases credit correctly, onboarding runs, cloud backup and restore after Reset All work, ads show and notifications fire and route into the game. The owner decided to **keep the full-house reveal hold** (bought amber may bring the reveal earlier; recorded as an exception in CLAUDE.md's never-list) and to keep **no gap** between the first ceremony and the rules-change card (CLAUDE.md corrected). Everything else that lives in the repository was fixed on this branch; app version **1.4.5**, Android code **110**.

| Finding | Resolution |
|---|---|
| RC-1 | Owner task: build the production profile at 110 and run the remaining production-profile checks (LAUNCH_CHECKLIST). |
| RC-2 | Runbooks name 1.4.5 / 110 and tell the reader to derive the runtime from app.json. |
| RC-3 | Version raised to 1.4.5 / 110. |
| RC-4 | Metro uses `getSentryExpoConfig` (debug IDs); the OTA runbook uploads source maps. |
| RC-5 | Sentry Android Gradle plugin enabled (`experimental_android`), R8 mappings upload. |
| RC-6 | Sentry `environment` is the release channel. |
| RC-7 | Decided: `allowBackup` stays true. Auto Backup is what carries the cloud-owner key across a reinstall, so the fresh-install cloud restore works without a recovery code. |
| RC-8 | No change (iOS out of scope). |
| P1 | Unreadable pending victories are quarantined; the failed-boot card can send the save to support (recovery credentials excluded); migrations treat "null" as absent. |
| P2 | Choices and narrative delivery fail on read errors instead of caching defaults; a veteran with an unreadable onboarding step skips the cold open. |
| P3 | Not changed. The shared staging map has no known trigger; changing the journal without a reproduction risks more than it fixes. Documented here. |
| P4 | Daily-amber receipts are pruned to the last two local days. |
| P5 / N4 | The recollection flag is cleared by Reset All and New Cycle. |
| P6 | A board won between the Arrival and After keeps the phase-5 presentation. |
| P7 | A stale daily autosave is dropped. |
| MON-1 | Receipt linking falls back to the single new receipt for the product within 2 minutes; checkout receipts are always stored; regressions at 3 s, 45 s, missing date and two purchases 10 s apart. Still verify one real purchase on the production build. |
| MON-2 / BO-6 / N1 | Hold kept by owner decision. Lagging residents now read their reveal chapters at catch-up pace once the house is at phase 4; late micro-beats wait for the reveal. |
| MON-3 | Owner device pass reported purchases correct; the production-profile single-credit check remains. |
| MON-4 / SPL-2 | Ad requests set `maxAdContentRating` T (not child-directed). Set the AdMob console ceiling too as a backstop. |
| MON-5 | Owner task (RTDN). |
| MON-6 | Restore merges entitlements and drops a key only when explicitly inactive. |
| MON-7 | The victory double excludes windfalls, and the victory screen shows the same amount. |
| MON-8 | Malformed checkout receipts are quarantined. |
| SPL-1 | Internal docs excluded by exact name, superseded docs deleted, and `docsSitePublication.test.ts` fails CI for any unlisted docs file. |
| SPL-3 | Placeholder removed from the live terms source; the draft clause is in LAUNCH_CHECKLIST for the owner to complete. |
| SPL-4 | Owner decision pending: which Play campaign is live (launch-2026-09, launch-2026-09-v2 or assembled-listing-2026-09). |
| SPL-5 | SLAVE, SLAVES and SLAVERY blocked and purged (four Double Shift boards). DRUGS and BEER kept. |
| SPL-6 | Privacy policy describes network addresses, the RevenueCat identifier and anonymous daily totals; "Support ID" aligned; effective date 2026-09-22. |
| SPL-7 | The copied-code note tells the player to clear the clipboard. |
| SPL-8 | Reminders use a named Android channel. |
| FTUE-A | Kept (owner); CLAUDE.md corrected. |
| FTUE-B | The review ask skips wins with a pending ceremony, the forced harvest or an unlock card. |
| FTUE-C | Micro-beat 25 moved to 27. |
| FTUE-D | EXPERT has a one-time unlock card; its locked hint moved to phaseNarrative. |
| FTUE-E | Out-of-hints, rewarded-hint and speed-rescue copy is phase-aware in phaseNarrative. |
| GP-A | Unplayed boards are served at their own length before any extendable board is replayed. |
| GP-B | Dailies walk a date-seeded permutation of their bank (no repeat within a pass). |
| GP-C | Hint spends are serialized through the storage queue. |
| GP-D | The first three dailies are eased and unranked. |
| N2 | Reveal-bound micro-beats are held until phase 4, never consumed early. |
| N3 | Interjections name only residents with news, with canon pronouns. |
| N5 | Whispers follow the resident's awareness tier. |
| N6 | Both curly apostrophes straightened; the baseline is empty. |
| N7 | Session-end, cooldown and micro-beat copy no longer say "puzzles". |
| N8 | Dialogue review items 4, 5, 6 and 8 fixed; 7 kept by preference. |
| PS-1 | `android:appCategory="game"` via `plugins/withGameCategory.js`. |
| PS-2 | Rooms ship as near-lossless WebP (12.0 MB to 6.4 MB); story masters no longer bundled (8.6 MB). |
| PS-3 | Owner device task (memory, cold start, frame pacing on the production build). |
| PS-4 / PS-5 | Not changed without device numbers. |
| A11Y-1 | Store, Patron and Season Pass sheets are bounded by the system-bar insets. |
| A11Y-2 | No change (0.87 scale floor holds). |
| A11Y-3 | Unreferenced shipped files deleted; bundle patterns narrowed; generators no longer recreate them. |
| BO-1 | `analytics_views_v1.sql` (retention, FTUE funnel, phase reached, purchase funnel), service-role only. Owner applies. |
| BO-2 | Sentry fixes above; alert rules are an owner console task. |
| BO-3 / BO-7 | `save_and_board_limits_v1.sql` limits save creation and requires a linked backup for Daily entrants. Owner applies. |
| BO-4 | `event_retention_v2.sql` keeps raw events 180 days with daily rollups. Owner applies. |
| BO-5 | Six season palettes rotate monthly; an owned palette pays amber instead. |
| BO-8 | The amber unlock logs `season_premium_unlocked`. |
| BO-9 | The word counter sends the install id. |
| BO-10 | Support runbook updated. |

## Framework

Eight dimensions, each audited independently against the code on this commit (the code is the truth, every finding cites a file and line that was read), with suspected defects traced or tested before being reported. Earlier findings were re-checked for regression across the 113 commits since `687a08d`. Scores: **5** ship it, **4** ship with minor follow-ups, **3** ship with known caveats, **2** fix first, **1** do not ship.

| Dimension | Score | Headline |
|---|---|---|
| Release configuration and native pipeline | 4 | Config resolves correctly for production; the production-profile AAB has never been built or run on a device, and runbooks name a stale runtime. |
| Boot, crash safety, persistence, cloud save | 4 | Journal, receipts, migrations and cloud conflicts all hold; a corrupt record locks boot with no in-app escape; a few secondary services default on read failure. |
| Monetization, ads, consent, economy | 3 | Consent, cadence and checkout safety are correct; the double-credit fix was rewritten and now depends on two store clocks agreeing within 1 s, unverified on a device; no real purchase since July. |
| Store policy, legal, privacy, listing | 4 | Legal pages live and accurate; internal docs (defect assessment, spoilers) are publicly served again on GitHub Pages; no ad content-rating ceiling. |
| First-time experience and core gameplay | 4 | Onboarding cannot dead-end, rules and hints are correct; the ceremony and rules-change card stack again at wins 12-13; late-game board pool is thin. |
| Narrative delivery and content hygiene | 4 | Zero leaks, dashes, typos or unmet-resident references; the full-house hold compresses the reveal-to-Arrival window to 8 wins for many players. |
| Performance, size, accessibility, devices | 4 | Memory work and accessibility hold; download about 100-110 MB; Android 16 ignores the portrait lock on tablets and foldables. |
| Backend, analytics, crash reporting, ops | 4 | Backend live and degrades safely; nobody can read D1/D7 yet; Sentry alerts unconfirmed; OTA stack traces will not symbolicate. |

## Automated gates run on this commit

| Check | Result |
|---|---|
| `npm run typecheck`, `npm run lint -- --max-warnings 0` | clean |
| `npm test -- --no-coverage --ci --runInBand` | 230 suites, 5,343 tests, exit 0 |
| Production config (`WORDSHIFT_PRODUCTION_CUT=1`, productionConfig test) | pass |
| `WORDSHIFT_RELEASE_CHANNEL=production npx expo config` | runtime `1.4.4-production`, `adsUseTestIds: false`, `creatorCode: ''`, versionCode 109 |
| Vocabulary and branching audit (minimum 100 eligible) | pass, 4,372 eligible boards |
| Bank route audit | 0 violations, 0 replay or hint issues |
| Daily cohort stamp | verified (`daily_v2_b8a773db1c50cc6d`) |
| `npm audit --omit=dev` | 0 vulnerabilities |
| `npx expo-doctor` | 1 check fails: 16 Expo packages one patch behind (advisory) |
| Privacy policy, terms, data deletion | HTTP 200 |
| `app-ads.txt` at `jpearleverett.github.io` | HTTP 200, correct publisher id, DIRECT |
| Supabase read-only probe (`aggregate_proof`, `get_save_v2`) | HTTP 200 |

## Before you press Publish

| # | Task | Why | Vehicle |
|---|---|---|---|
| 1 | Build `--profile production` at version code **110 or higher** (check Play Console for the highest used code first), submit to internal testing, and run the smoke matrix from the 09-14 review on two physical phones. Never tap a live ad on this build. | RC-1, RC-3, PS-3. The public artifact differs from anything tested (live ad units, production channel and runtime), and codes 104-109 have no recorded device result. | Owner |
| 2 | On that build, run the purchase matrix: one amber pack, one hint pack, the starter pack, Supporter subscribe and cancel, Restore. For each consumable confirm the balance rose **once**, then force-stop, relaunch and Restore and confirm it did not rise again. | MON-1, MON-3. See below. | Owner |
| 3 | Confirm a scheduled reminder actually fires and its tap routes correctly, including from a cold start. | Scheduling failures were silently swallowed until 2026-09-17 (`5d5e44c`); reminders may never have fired on earlier builds. | Owner |
| 4 | Stop publishing internal docs on GitHub Pages (see SPL-1). Do this before this branch merges, since it adds the dialogue review. | Public defect list and story spoilers beside the privacy link. | Docs site |
| 5 | Set a maximum ad content rating (PG or T) in AdMob blocking controls. | SPL-2 / MON-4. A cosy animal game with a 13+ audience can currently be served mature ads. | AdMob console |
| 6 | Create Sentry alert rules (new issue, crash-free sessions under 99%, error spike) and confirm one symbolicated event from the production build. | BO-2. Otherwise a launch-day crash may go unseen. | Sentry console |
| 7 | Fix the OTA rollback runbook's hard-coded `1.3.6-production` to `1.4.4-production` (or `<app version>-production`). | RC-2. The documented rollback would target a runtime nobody has and report success. | Docs |

### Fold into the same native build (free now, costly later)

- **PS-1:** set `android:appCategory="game"` on `<application>` through a config plugin. Targeting API 36, Android 16 ignores the portrait lock on screens 600 dp and wider for non-game apps, so tablets and unfolded foldables rotate into an untested landscape layout.
- **RC-4:** switch `metro.config.js` to `getSentryExpoConfig` for debug IDs, and add `npx sentry-expo-upload-sourcemaps dist` to the OTA runbook, so hotfix bundles symbolicate.
- **RC-7:** decide on Android Auto Backup (`allowBackup` is true): it can restore device-local keys (install id, purchase baselines) after a reinstall, which the purchase-recovery design assumes cannot happen.
- **A11Y-3:** narrow `assetBundlePatterns` to `assets/story/optimized/**` and `assets/story/pages/**` so 8.6 MB of unreferenced story masters cannot ship.

## Decisions only the owner can make

1. **The full-house reveal hold (MON-2, BO-6, N1).** Holding the reveal until all 13 residents are bought works, but has three costs the audits measured:
   - Bought amber now moves the reveal earlier (a large pack covers the ~4,050 amber of skips and residents from phase 3), which contradicts the "never pay to skip phases" rule.
   - For the free 8/day cohort the reveal lands at win 112 and the ending at 121, so the reveal-to-Arrival window is the 8-win minimum. In a reading simulation the five lagging residents heard **none** of their phase-4 lines before the Arrival.
   - Late micro-beats keyed to solve counts (92, 104, 106, 109, 112, 115) fire before the reveal for held players.

   Options: gate the hold on the last room's level gate (92) rather than purchase; or keep it and (a) treat any unread line below phase 4 as backlog once the world is at phase 4, (b) lengthen the 8-win wait when the reveal was held, (c) defer late micro-beats until phase 4. All are OTA-able.
2. **Ceremony then rules-change card at wins 12-13 (FTUE-A).** The one-board deferral was removed on 2026-09-19 deliberately. Either keep that and correct CLAUDE.md, or restore the deferral.

## Findings by dimension

Severity: **high** fix or verify before publishing, **medium** fix during the staged rollout, **low** backlog.

### Release configuration and native pipeline (4)

- **RC-1 high.** The production-profile artifact has never been built or device-tested (`eas.json:27-32`; only code 101 has device evidence, `LAUNCH_CHECKLIST.md:33-37`). Task 1.
- **RC-2 medium.** Runbooks name 1.3.6/101 and runtime `1.3.6-production` (`OTA_UPDATES.md:6,17-18,63,79,102`, `LAUNCH_CHECKLIST.md:15-16,147`, `BUILD_AND_UPLOAD.md:81`, `CURRENT_BUILD.md`). Task 7.
- **RC-3 medium.** Six JS-only commits follow the 109 bump; if 109 was uploaded, a production build at 109 is rejected. Use 110+.
- **RC-4 medium.** No Sentry debug-ID injection; OTA bundles will be symbolicated against the embedded bundle's maps.
- **RC-5 low.** No R8 mapping upload to Sentry; Play Vitals still deobfuscates native traces.
- **RC-6 low.** `Sentry.init` sets no environment (`App.tsx:350-354`), so internal-testing events mix with production.
- **RC-7 low (unverified).** `allowBackup="true"`.
- **RC-8 low.** iOS is unconfigured (sample AdMob id, empty RevenueCat key); do not ship an iOS build.
- Clean: channel-derived runtime and ad units, targetSdk 36, 16 KB pages, R8 plugin fails closed, manifest permissions minimal (RECORD_AUDIO, foreground service, overlay and storage blocked), `expo-device` and `expo-clipboard` guarded, creator kit inert.

### Boot, crash safety, persistence, cloud save (4)

- **P1 medium.** A save that cannot be decoded or migrated, or a pending victory that fails validation, locks boot on Try again for ever (`dataMigration.ts:302-311`, `victoryPersistence.ts:477-478`, `useAppBoot.ts:36-39`). Add a save export on the failed-boot card and quarantine invalid pending victories.
- **P2 low-medium.** `dialogueChoices.ts:245-259`, `animalDialogueNarrative.ts:881-891` and `onboarding.ts:120-129` treat a read failure as empty state and can then overwrite real choices, seed delivery, or send a veteran back to onboarding. Throw on read failure as `loadProgress` does.
- **P3 low (suspicion).** The module-global staging map in `persistenceStorage.ts:124-141` can absorb unrelated writes during a transaction.
- **P4 low.** Daily-amber claim receipts grow without limit (`dailyAmberReward.ts:157`).
- **P5 low.** `wordshift_arrival_resume_framing_seen` survives Reset All and New Cycle (also N4).
- **P6 low (suspicion).** A daily or shared board won between the Arrival and After may present at phase 4 for one board.
- **P7 low.** A stale daily autosave is ignored but never deleted (`App.tsx:2373-2376`).
- Cannot be verified: in-place upgrade from the closed-test build (1.2.2, code 88). Include it in the device pass.

### Monetization, ads, consent, economy (3)

- **MON-1 high.** The double-credit fix was rewritten on 2026-09-17 (`5d5e44c`). A new RevenueCat receipt is now linked to the checkout only if its time is within 1,000 ms of Play's `purchaseDate` (`revenueCatBilling.ts:194`), and the fallback window is also 1,000 ms (`iap.ts:487,507-511`). If the two stores disagree by more than a second, recovery credits the pack again (`iap.ts:865`); if `purchaseDate` fails to parse, no receipt is stored at all (`iap.ts:532`). Tests use identical timestamps on both sides. Verified by reading the code. Harden before the device pass: when nothing matches within the window but exactly one receipt for this product is new since the pre-checkout snapshot, link it. Then task 2.
- **MON-2 medium (owner decision).** Paid amber accelerates the reveal. See Decisions.
- **MON-3 high (process).** The purchase matrix has not run since 2026-07-13, before B1, the rewrite, Supporter and the subscription category split. Task 2.
- **MON-4 low-medium.** No `maxAdContentRating` or request configuration anywhere. Task 5.
- **MON-5 low.** RTDN not wired; a lapsed Supporter launching offline can collect one more stipend.
- **MON-6 low.** `restorePurchases` replaces local entitlements wholesale (`iap.ts:729`); restoring on another Play account strips permanent purchases locally.
- **MON-7 low.** The victory 2x doubles windfalls too (`victoryDouble.ts:25`).
- **MON-8 low (suspicion).** A corrupt `wordshift_iap_checkout_receipts` can trap a player in a retry dialog.
- Clean: UMP consent before init, interstitials never in ceremonies or early wins (first ad on the exit of win 17), rewarded caps count completions and claims, checkout lock, pending-grant ledger, subscription category split, stipend and season clock guards.

### Store policy, legal, privacy, listing (4)

- **SPL-1 medium (regression).** `docs/_config.yml` no longer excludes nine internal docs and `visual-review/`, which are live today, including `ASSESSMENT_2026-09-16.html` (41 defects in detail) and robed-sprite sheets. There is no `robots.txt`. Switch to an allow-list of the four public pages. This review and the dialogue review are excluded on this branch.
- **SPL-2 medium.** No ad content-rating ceiling. Task 5.
- **SPL-3 low.** Terms have no governing-law clause, and the `[GOVERNING JURISDICTION]` placeholder is visible in the live page source.
- **SPL-4 low.** Two divergent "final" listing copies (`mobile/docs/store-launch/listing-en-US.json` against `mobile/assets/Play_store/launch-2026-09/copy/`). Record which is live and retire the other.
- **SPL-5 low.** Banks contain SLAVE (8), DRUGS (20), BEER (6); confirm the IARC answers and decide editorially.
- **SPL-6 low.** Privacy policy omits IP and request data at the backend and Sentry, and the RevenueCat app-user id; it says "Support reference" where the app says "Support ID".
- **SPL-7 low.** The recovery code is copied to the clipboard as plain text (`SettingsScreen.tsx:470-471`).
- **SPL-8 low.** No named notification channel.
- **SPL-9 info.** The Play listing URL returns 404 until publish; re-check it and AdMob app-ads.txt verification afterwards.
- Clean: legal pages live and consistent with the code's data flows, telemetry anonymous, no user-generated content, profanity purge and hygiene test cover all 30 bank families, no loot boxes or paid randomness.

### First-time experience and core gameplay (4)

- **FTUE-A medium.** Phase-1 ceremony at win 12, then the blocking rules-change card on board 13 (deferral removed in `9e3e82d`; CLAUDE.md still describes it). See Decisions.
- **GP-A medium (still open from 09-14).** From 70 solves, selection restricts to extendable boards: HARD about 31, EXPERT about 39, so a HARD player repeats every ~31 boards through the climax. Gated top-up campaign.
- **GP-B low.** Dailies are an independent date-seeded draw, so repeats occur within weeks and can match a board already solved in free play. Use a date-seeded permutation (needs a cohort restamp).
- **FTUE-B low.** The store-review ask can land on a ceremony-pending, forced-pit or Double Shift card win (`reviewPrompt.ts:88-98`).
- **FTUE-C low.** Win 25 stacks the Double Shift card, a milestone and a micro-beat.
- **FTUE-D low.** EXPERT (35) unlocks with no announcement; its hint string is hardcoded in App.
- **FTUE-E low.** Out-of-hints and rewarded-hint copy is hardcoded and cheerful at every phase (`App.tsx:4086-4118`).
- **GP-C low (suspicion).** Hint spend writes outside the journal (`hints.ts:121-136`) and can race a grant.
- **GP-D low.** The second daily can be a 5 or 6-letter HARD board around solve 9-13, just as the word marks stop.
- Beat timeline over the first 40 wins is in the audit notes; the first interstitial is on the exit of win 17.

### Narrative delivery and content hygiene (4)

- **N1 medium.** Reveal-to-Arrival window collapses to 8 wins under the full-house hold; backlog pacing does not engage for a one-phase gap. See Decisions.
- **N2 medium-low.** Late micro-beats fire before the reveal (`phaseNarrative.ts:2612`, `useVictoryOrchestration.ts:454`); beat 92 always does.
- **N3 low.** Interjections name a random resident, who may have nothing new to say (`phaseNarrative.ts:2209-2233`).
- **N4 low.** Arrival recollection framing survives Reset All and New Cycle (same as P5).
- **N5 low.** Whispers use the global phase, not the resident's awareness tier.
- **N6 low.** Two curly apostrophes remain baselined (`HouseUpgradeGiftModal.tsx:131`, `cosmetics.ts:237`).
- **N7 low.** System copy says "puzzles" (`useDialogueFlow.ts:379-383`, micro-beats 25 and 30).
- **N8 low.** Open items 4-8 of the [dialogue review](DIALOGUE_REVIEW_2026-09-22.md).
- Clean: no em dashes, no phase labels, no unmet-resident references (0 of 1,742 base lines), phase-4 residents 0 contractions, no duplicates, no typos in ~7,000 strings, ceremony order correct, New Cycle resets correctly, late recruits now reach ~82-88 of 134 lines before the Arrival (was ~27-42).

### Performance, size, accessibility, devices (4)

- **PS-1 medium.** Android 16 large-screen orientation override. Fold into the build.
- **PS-2 medium.** 911 shipped assets, 83.8 MB (music 25.8, story art 20.7, rooms 12.1, characters 11.6); estimated 100-110 MB download, 140-170 MB installed. Post-launch: re-encode music and story pages, convert room and character PNGs to WebP.
- **PS-3 medium.** No on-device performance numbers. Record `dumpsys meminfo` on a full house and during a ceremony, `am start -W`, and `gfxinfo` while panning, as part of task 1.
- **PS-4 low.** Mid-tier phones keep all used sprite layers mounted (~52 MB at worst).
- **PS-5 low (suspicion).** Up to 160 branching analyses at the 13th solve could hitch on a Cortex-A53.
- **A11Y-1 low.** Store, Season Pass and Patron modals do not bound their height by safe-area insets.
- **A11Y-2 low.** Six-letter tiles about 36 x 45 dp on 360 dp phones.
- **A11Y-3 low.** 18 unreferenced files match `assetBundlePatterns`.
- Clean: RAM-based low tier, room art decoded near view size, virtualized long lists, 118 of 119 touchables with roles, reduced motion on every loop, zero JS-driven animations, font scale capped at 1.35.

### Backend, analytics, crash reporting, ops (4)

- **BO-1 high.** The rollout kill criteria (D1 under ~25%, onboarding completion under ~60%) cannot be read: the only documented query counts events per day. Add service-role views for first-seen cohorts with D1/D7/D14, the FTUE funnel, `phase_reached`, and store to purchase. Needed before going past 5%.
- **BO-2 high.** Sentry alerts unconfirmed; OTA traces will not symbolicate. Tasks 6 and RC-4.
- **BO-3 medium.** `upsert_save_v2` has no rate limit on the create path; 1 MB rows under minted owners can exhaust disk. Add a per-address limit and Supabase disk alerts.
- **BO-4 medium.** 24-month raw event retention will reach tens of GB at a few thousand DAU. Keep 90-180 days and roll up.
- **BO-5 medium.** The season pass repeats identical rewards every month; from month two the premium track is a net loss.
- **BO-6 medium.** Watch `phase_reached{4}` against `puzzlesSolved` in week one (full-house hold).
- **BO-7 medium (suspicion).** Leaderboard "known owner" check passes for any id with an events row.
- **BO-8 low.** Season-pass amber spend logs as `iap_purchase`.
- **BO-9 low.** Word counter is bucketed per network address, not per install.
- **BO-10 low.** Support runbook says rate limits are not applied; they are.
- Clean: 8 s timeouts that never throw, backend-down degradation, telemetry batching and acknowledgement, retention cron, deterministic live ops, notification caps and routing, support path.

## Staged rollout plan

1. **Internal track:** tasks 1-3 on the production build.
2. **5% production:** hold at least 3 days. Kill or pause if crash-free users fall under 99%, any purchase credits twice or not at all, or ANRs exceed Play's bad-behaviour threshold.
3. **20%:** requires BO-1 views live. Pause if D1 falls under ~25% or onboarding completion under ~60% of `app_open`.
4. **50%, then 100%** after a week with stable vitals and no billing incident. Ship JS fixes (MON-1 hardening if not already in, N1, N2, P1, P2, FTUE items) by OTA during the rollout.

## What this review could not verify

Anything that needs a signed build or a console: real billing and receipt timing, ads and consent under R8, notification delivery, memory and cold start on a 2-3 GB phone, Android 16 tablet behaviour, TalkBack, the in-place upgrade from 1.2.2, the Play Console Data Safety and IARC answers, which listing copy is live, AdMob blocking controls, Sentry alerting, Supabase plan tier and disk headroom, and real player retention.
