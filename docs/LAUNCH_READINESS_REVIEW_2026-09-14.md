# WordShift launch readiness review (2026-09-14)

Reviewed against `main` at `8233184` (identical to `claude/wordshift-launch-readiness-wnuzh1`), app version **1.3.5**, Android version code **99**, Expo SDK 57 / React Native 0.86.3. The owner has Google Play production access after the 12-tester closed test and asked whether the game is ready to publish to the public Play Store. This document answers that question. It changes no application code, no configuration and no bank; the one repository edit it carries is adding itself and two internal build documents to the GitHub Pages exclude list (see finding `store-policy-legal-1`).

## Verdict

**Conditionally ready. Do not press Publish on the current artifact; publish the next one.** The game itself is in very good shape: the code passes every automated gate on this commit, the save layer is unusually robust, the store policy and legal work is done, and the backend is deployed. What stands between the repository and a public rollout is short and concrete:

| # | Blocker | Kind | Why it blocks | Fix |
|---|---|---|---|---|
| B1 (fixed 2026-09-14) | **Every consumable purchase is credited twice** (amber packs, hint packs, the starter pack; the first amber pack three times). | Code defect, JavaScript | Real money is paid out double from the very first purchase and cannot be clawed back. The checkout keys the grant ledger on the Google Play order id, while receipt recovery keys the same purchase on RevenueCat's own transaction id, so recovery treats every fresh purchase as an unrecovered payment. | One-line-class fix in `mobile/src/services/providers/revenueCatBilling.ts` plus a regression test whose mock uses two different ids (details below). |
| B2 | **The build that would ship has never run on a device.** R8 minification, resource shrinking and the optimizing ProGuard default were enabled on 2026-09-12; SDK 57 / RN 0.86 landed on 2026-09-06; the closed test that earned production access ended on 2026-08-31 on version 1.2.2 (code 88). | Process gate | Green JavaScript CI cannot catch a reflection-dependent native SDK, a font registration or a resource that R8 stripped. The repo's own checklist says the same. | Build the production-cut AAB from this commit (with B1 fixed), install it from the internal track on two physical phones, and run the smoke matrix in this document. |
| B3 (resolved 2026-09-14) | **The production cut is a manual, unenforced edit.** `adsUseTestIds` must flip to `false` and the version code must be bumped, and no build profile or CI step enforces either. | Process gate | Shipping with test ads means zero revenue for every install until an OTA; shipping live ads into a test track is an AdMob policy violation. | Follow the exact command sequence below and run the production-config test before building. |

Everything else in this document is either a "fix it in the same native build since you need one anyway" item, a "fix during the staged rollout" item, or a Play Console task that cannot be verified from the repository.

## Resolution status (branch `claude/wordshift-launch-readiness-wnuzh1`, 2026-09-14)

The findings were worked the same day, in file-owned packages, each reviewed
line by line before merge into the branch. Of the 83 findings in Appendix A,
**66 are fixed in the repository**; the 17 that remain are owner tasks, device
evidence, or deliberate deferrals, listed below with the reason.

| Blocker | Status |
|---|---|
| B1 double credit | **Fixed.** Checkout links the RevenueCat receipt id to the grant in the same durable write; recovery resolves a receipt by either id; a 60 s same-product window and a durable receipt alias cover a late receipt with no link. The reproduction that credited 0 to 1200 to 1800 now credits once. Regressions in `billingAdapterSdk.test.ts` and `billingPurchaseSafety.test.ts`. |
| B2 untested minified build | **Still the gate.** Nothing here replaces a signed, minified AAB on two physical phones through the internal track. The smoke matrix below is unchanged; add the `aapt2 dump permissions` check, a TalkBack pass over a board and a three-button-navigation pass over the sheets. |
| B3 unenforced production cut | **Resolved.** `app.config.js` derives `adsUseTestIds` from `WORDSHIFT_RELEASE_CHANNEL` (production means live units), CI validates both channels on every run, and the checklist's command sequence no longer hand-flips anything. The version-code bump is the one remaining manual step. |

Still open, and why:

| ID | Why it is not fixed in the repository |
|---|---|
| `engineering-hygiene-1`, `release-config-1` | B2: the device pass on the production toolchain. |
| `accessibility-devices-4`, `performance-size-5`, `product-retention-1` | Evidence that only a physical device or real players can produce (TalkBack and large-text pass, cold-start and memory numbers on a low-end phone, external play through the reveal). |
| `backend-ops-3`, `store-policy-legal-2`, `store-policy-legal-3`, `product-retention-10` | Play Console and RevenueCat dashboard work: RTDN, fresh screenshots, IARC and target-audience answers. |
| `release-config-3` | Sentry Android Gradle plugin mapping upload. Deferred by choice; Play Vitals deobfuscates native traces from the bundle's own mapping. |
| `gameplay-4` | Late-game content top-up (HARD/EXPERT extendable boards, daily pool permutation). A bank regeneration campaign with its own review, not a same-day fix. |
| `ftue-3` | Partly addressed: the store-review ask moved to a settle-in floor of 20 solves (`REVIEW_MIN_PUZZLES`), so win 10 no longer stacks the review sheet on the milestone toasts and the Reverse card. |
| `ftue-8` | EEA/UK consent over the cold-open board is a policy constraint (consent must precede ad initialisation); deferring the form would delay ads for the session. Accepted. |
| `boot-persistence-7` | A re-entrancy guard in `persistenceStorage` is a defensive change with no known trigger; deferred to avoid touching the journal path without a reproduction. |
| `accessibility-devices-7`, `performance-size-6`, `product-retention-8` | Tablet layout, install footprint and in-game word definitions are product work, not launch fixes. |

Native-build note: `expo-device` (installed-RAM device tier, Android only) is a
new native module, and the expo-audio plugin options, blocked permissions,
launcher name and Android 12 splash icon also changed, so the next Play
artifact must be a new native build. An OTA onto the current binary stays safe
(the guarded require falls back to the pixel heuristic).

## How this was assessed

The framework is a **twelve-dimension go/no-go review**. Each dimension was audited by an independent reviewer with the whole repository and the installed toolchain available, under three rules: the code is the truth and the docs describe intent; every finding cites a file and line that was actually read; and at most ten findings per dimension, most important first. Findings rated medium or above then went through an **adversarial verification pass**: one reviewer tried to refute each by re-tracing the code path and looking for guards or tests the auditor missed, and, for the survivors rated high, a second reviewer judged the real impact for a free Android word game in a staged rollout (how many players, how soon, whether an OTA can fix it, whether it risks store action). Of the 41 findings scheduled for that pass, 26 were re-checked (five of them under both lenses) before the review's agent budget ran out; the 15 that were not reached are marked "not independently verified" in the appendix, and a planned completeness-critic pass did not run, so Appendix B is the author's own list of what this review covered thinly. Nothing that was re-checked was refuted; four findings were re-rated (two down to low, two from high to medium). The seven most consequential findings were also re-read independently by the author of this document; those are marked "re-verified" in the narrative.

Scores are 1 to 5: **5** ship it, **4** ship with minor follow-ups, **3** ship with known caveats, **2** fix first, **1** do not ship. A finding is *blocking* only if publishing should wait for it.

### What was actually run on this commit

| Check | Result |
|---|---|
| `npm ci`, `npm run typecheck` | clean |
| `npm run lint -- --max-warnings 0` | clean |
| `npm test -- --no-coverage` | 197 suites, 4,789 tests, all pass |
| Story corpus audit, vocabulary and branching audit (minimum 100 eligible per family), bank route audit, daily cohort check | all pass |
| `npm run test:e2e` (Playwright, Chromium) | 35 journeys pass |
| `npx expo-doctor` | 20 of 21 checks; the one failure is 14 Expo packages a single patch behind |
| Live legal URLs (privacy policy, terms, data deletion, landing page) | HTTP 200 |
| `app-ads.txt` at the publisher domain | present, correct publisher id, DIRECT |
| Supabase RPCs (read-only probe with the shipped anonymous key) | v2 save, rank and aggregate functions answer; the weak legacy save function is gone; anonymous table access is denied |
| Real `expo export` of the production bundle | 12.14 MB Hermes bytecode, 61.7 MB embedded assets |

### What the closed test did and did not cover

The testers were on version 1.2.2 (code 88, built 2026-07-27). Between that build and this commit there were 11 version-code bumps, 120 commits in September alone, and a diff of 379 source files with roughly 48,000 lines added and 17,000 removed, including the SDK 57 upgrade, the R8 configuration, the save-integrity rewrite, the sequential-conversation rewrite and the house-gift system. At 2 to 4 puzzles a day for 14 days a tester reaches 28 to 56 solves, which is Phase 0 to mid Phase 2 with 6 to 8 of the 13 animals. No tester could have seen Phase 3, the reveal at 90, house completion, the finale at about 116, Phase 5, an interstitial (first possible at the exit of win 17 on that build's cadence), a purchase or the notification ladder. The twelve reports total about 520 words, none mentions an animal, a room, amber, the pit or anything unsettling, and five share the same sentence skeleton. They establish that the tutorial is understood, the core move is satisfying and nothing crashed in early play on twelve devices. They do not validate this build, and they do not validate the game the store listing is actually selling.

## Scorecard

| Dimension | Score | Blocking | Summary |
|---|---|---|---|
| Release configuration and native build pipeline | 3 | B2, B3 | Toolchain targets API 36 with AGP 8.12 and 16 KB pages; keep rules look sound on inspection; nothing minified has been installed on a device; the production cut is manual. |
| Bootstrap, crash safety, persistence, migrations | 4 | none | Write-ahead journal, durable victory receipts, revision-checked cloud saves; all six defects from the September 5 review are fixed and pinned by tests. Boot failures land on a Retry-only card that is never reported to Sentry. |
| Monetization: IAP, ads, consent, entitlements | 2 | B1 | Consent gating, cadence, rewarded opt-in and restore are all correct; the consumable ledger double-credits every purchase. |
| Store policy, legal, content rating, listing | 4 | none | Legal pages live and complete, listing copy within limits and honest about "mild horror"; two internal docs are publicly served next to the legal pages; screenshots in the console are stale. |
| First-time experience and early funnel | 4 | none | The cold open cannot dead-end; every step has a confirmed skip; one-time beats stack at win 10 and at wins 12 to 13; no browser journey exercises onboarding. |
| Core gameplay correctness | 4 | none | Validation, locking, undo, hints, daily determinism and autosave all hold; Speed boards past 70 solves silently gain the extra row; the speed clock runs under the setup menu. |
| Narrative delivery and content hygiene | 4 | none | Zero phase-system leaks in 24,842 string literals, zero em dashes, no typos in a 150-line sample; pacing simulation matches the documented timeline. |
| Performance, memory, app size | 3 | none | About 80 MB download and 110 MB install; a full house holds 58 to 114 MB of decoded bitmaps; the low-end gate never fires on 720p phones; no on-device numbers exist. |
| Backend, analytics, crash reporting, operations | 4 | none | All client RPCs deployed and locked down (the docs are stale about this); no rate limiting on anonymous writes; the daily leaderboard accepts impossible times. |
| Accessibility and device coverage | 4 | none | 117 of 119 touchables have roles, all 47 animation loops honor reduced motion; 6-letter boards shrink to about 31 by 38 dp tiles on 360 dp phones; two sheets sit under a three-button nav bar on Android 15/16. |
| Engineering hygiene | 3 | B2 | Zero TODOs, zero tracked secrets, zero npm vulnerabilities, clean listener hygiene; same blocker as the pipeline. |
| Product, retention, tester feedback | 3 | none | Retention machinery is complete and guarded; amber floods from solve 13; a six-day content gap at solves 29 to 41; notifications run one a day for a week to a lapsed new install. |

## The blockers in detail

### B1. Consumable purchases credit twice

`revenueCatBilling.ts` returns `transaction.transactionIdentifier` from `purchaseStoreProduct` as the grant id. In RevenueCat's hybrid layer that field is the **Google Play order id** for a purchase result (`StoreTransactionMapper.kt`: `orderId`, falling back to the purchase token only for Amazon). The same adapter's `transactionsFrom(customerInfo)` reads `nonSubscriptionTransactions[].transactionIdentifier`, which the hybrid layer maps from RevenueCat's **own transaction id** (`TransactionMapper.kt` maps `transactionIdentifier`, `revenueCatId`, `productIdentifier`, `productId` and the purchase date; it exposes no store transaction id and no purchase token). `iap.ts`'s `reconcileStorePurchaseHistory` runs after every checkout from the customer-info listener, sees a transaction id that is in neither the install baseline, the applied set nor the pending ledger, and calls `persistRecoveredStorePurchase`. Result, reproduced by the auditor against the real modules with a mock that uses two different ids: an amber pack credits 1,200 then another 600; the starter pack credits 1,200 amber and 5 hints twice. The repository's own tests pass because their mock returns the same string on both surfaces.

Fix: after a successful `purchaseStoreProduct`, take `result.customerInfo.nonSubscriptionTransactions`, pick the newest entry for that product id that is not already in the baseline or applied set, and record **its** `transactionIdentifier` as the grant id (or record both ids as applied in the same transaction). Add a regression whose mock returns different ids on the two surfaces. This is JavaScript and could be shipped by OTA, but it costs real money from the first purchase, so it belongs in the build you promote.

### B2. First device pass of the production toolchain

Nothing on the release-shaping list has been installed on a phone: SDK 57 / RN 0.86.3 (2026-09-06), R8 with `proguard-android-optimize.txt`, resource shrinking and optimized resource shrinking (2026-09-12), and the plugin that rewrites the release block. The keep-rule inventory is reassuring: `react-native`, `expo`, `expo-modules-core`, `expo-notifications` and `expo-updates` ship consumer ProGuard rules, the seven bridge packages without local rules (`react-native-purchases`, `react-native-google-mobile-ads`, `@sentry/react-native`, gesture-handler, safe-area-context, view-shot, async-storage) rely on consumer rules inside their Maven artifacts plus React Native's generic NativeModule and ViewManager keeps, and the CLI writes a `keep.xml` for all 659 required image assets so shrinking cannot strip them. That is exactly the kind of "should be fine" that a thirty-minute device pass exists to confirm.

Smoke matrix for the signed internal-track build, on at least two physical Android phones (one Android 14 or newer with 16 KB pages, one 2 to 3 GB 720p device if available):

1. Cold start from a fresh install, offline and online; the cold-open board renders with the wooden wordmark, both typefaces and the SFX.
2. Solve through the first harvest; Fox cards, the pit, the home screen, music and haptics.
3. Settings: every legal link opens, Restore Purchases runs, Privacy Options shows or hides correctly.
4. Store: products load with store prices (not the dollar fallbacks); one real license-tester purchase of an amber pack, then confirm the balance rose **once** (B1); one Supporter subscription; one cancel; one restore.
5. Ads on a tester account without ad-free entitlements: an interstitial at the exit of win 17 or later, a rewarded double, the Stats banner; all test creatives.
6. Notifications: accept the in-app prompt, confirm the OS dialog, confirm a scheduled reminder fires and its tap routes correctly (cold start included).
7. Share a result (PNG) and open a challenge link.
8. Background and foreground during a ceremony and during a purchase; force-close mid-puzzle and relaunch.
9. Use the creator kit (on a separate press build with `creatorCode` set) or a long session to reach a 13-room house: record `dumpsys meminfo` and a house pan with `gfxinfo framestats`. The repo already ships `npm run profile:android`.
10. Send one deliberate error to Sentry and confirm it arrives symbolicated for build 99 or later.
11. On one device that still has the closed-test build (1.2.2, code 88) installed, update in place from the internal track and confirm progress, house, amber, hints and entitlements survive the v4 to v6 migrations; the twelve testers will take exactly this path.

### B3. The production cut

Run from `mobile/`, in this order:

```bash
# 1. app.json: extra.adsUseTestIds -> false; keep extra.creatorCode ""; bump android.versionCode above the last Play upload
WORDSHIFT_PRODUCTION_CUT=1 npm test -- --no-coverage --testPathPattern=productionConfig
npm ci && npm run typecheck && npm run lint -- --max-warnings 0 && npm test -- --no-coverage
WORDSHIFT_RELEASE_CHANNEL=production npx expo config --type public   # confirm runtimeVersion 1.3.5-production and adsUseTestIds false
npx eas-cli@latest build --platform android --profile production      # store AAB by EAS default; needs the SENTRY_AUTH_TOKEN EAS secret
npx eas-cli@latest submit --platform android --profile production --id <BUILD_ID>   # lands on the INTERNAL track by design
# 2. install from the internal track, run the smoke matrix above, then promote to Production in Play Console with a staged rollout
# 3. later JS-only fixes:
WORDSHIFT_RELEASE_CHANNEL=production npx eas-cli@latest update --channel production --message "..."
npx eas-cli@latest update:roll-back-to-embedded --channel production   # rollback
```

Two things to know before doing it. First, committing `adsUseTestIds: false` to `main` turns CI red, because the non-production branch of `productionConfig.test.ts` asserts the testing value; either update `.github/workflows/ci.yml` in the same change or derive the flag from `WORDSHIFT_RELEASE_CHANNEL` in `app.config.js` so both states can be green. Second, `docs/OTA_UPDATES.md` has no rollback step; the last command above is it.

## Fix in the same native build

You need a new build for B2, so these are nearly free to include. Each needs a native build, not an OTA.

| Finding | What | Change |
|---|---|---|
| `release-config-2` (re-verified) | The expo-audio plugin declares `RECORD_AUDIO` by default, so the Play listing shows **Microphone** under permissions for a word game, and its background-playback default adds the foreground-service permissions that `blockedPermissions` currently strips as a workaround. | `["expo-audio", { "recordAudioAndroid": false, "enableBackgroundPlayback": false }]` in `app.json`; the `blockedPermissions` entries then become unnecessary. |
| `store-policy-legal-8` (re-verified) | The SDK 57 bare template manifest declares `SYSTEM_ALERT_WINDOW` and the legacy external-storage permissions, so "Draw over other apps" appears on the Play permission list. | Add `android.permission.SYSTEM_ALERT_WINDOW`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE` to `android.blockedPermissions`; keep `VIBRATE`. Confirm with `aapt2 dump permissions` on the AAB. |
| `store-policy-legal-6` | The launcher label is "Word Shift" while the store name and every other surface say "WordShift". | `expo.name` to `WordShift`. |
| `release-config-4` | On Android 12 and later the system splash shows the configured image as a small masked icon; the current 1600 px icon-plus-wordmark composition becomes an unreadable strip, and about a third of the adaptive-icon subject sits outside the safe circle. | Supply an icon-only splash image and re-fit the adaptive foreground to the 66 dp safe zone. Cosmetic. |
| `release-config-3` | R8 obfuscation is on but the Sentry Android Gradle plugin is not, so native Java stack traces in Sentry arrive obfuscated (Play Vitals still deobfuscates from the bundle's own mapping). | Optional: enable the Sentry Android Gradle plugin mapping upload, or accept Vitals as the native-crash source. |
| `engineering-hygiene-3` | `mobile/crop_ad_tmp.cjs` is a tracked scratch script. | `git rm`. |

## Fix during the staged rollout (OTA-capable JavaScript)

Ordered by player impact. None blocks publishing; the first four are cheap.

| Finding | What | Effort |
|---|---|---|
| `gameplay-1` (re-verified) | The only bank-selection call in `usePuzzleGame.ts` passes `lexicon` but never `speed`, so every Speed board after 70 solves is served with the extra row against a clock calibrated for the base chain. | XS: pass `speed: speedModeRef.current` and pin it with a hook test. |
| `gameplay-2` | The speed clock starts while the setup menu still covers the board and restarts on every modifier toggle; nothing pauses it for How to Play. | S |
| `monetization-3` | The Store renders hard-coded USD prices for one to four seconds before the store fetch lands, and for the whole session if it fails; price pills are live before products load and a tap then reports an unconfirmed purchase. | S: neutral placeholder, disabled pills until a price string arrives, calmer error copy. |
| `ftue-2` / `ftue-3` | Wins 12 to 13 stack the first ceremony, the blocking graduation card and the share invitation (confirmed, medium); win 10 stacks two milestone toasts, the lifetime store-review sheet and the Reverse tutorial (re-rated low). | XS to S: move the graduation limit to 14; skip the review ask when an intro is queued. |
| `gameplay-3` | Blind Offering judges only each row's final word, so chains illegal under the standard rule are accepted at 2x amber and 2x phase progress. | S |
| `product-retention-4` | A lapsed new install receives one notification a day for its first week; an evening player receives a 9:00 "puzzle ready" ping every day. | S: thin the ladder for installs under 14 days; suppress the morning ping on a win-back day and while a streak is live. |
| `monetization-7` | The out-of-hints rewarded path can lose a fully watched reward if the hint write throws; every other placement retries. | XS: route through `saveWithPlayerRetry`. |
| `performance-size-2` / `backend-ops-5` | Every fresh install's first launch waits on a cloud download that can never return a save, up to the 8 s timeout on a captive or stalled network. | S: skip the download when the owner id was created in this call. |
| `boot-persistence-1` / `boot-persistence-2` | Deterministic boot failures land on a Retry-only card with no escape and are only `console.warn`ed, never sent to Sentry, so a bricked install is invisible to you. | S |
| `boot-persistence-3` | The victory modal, ceremonies, Store, Patron and alert hosts sit outside every error boundary, so a render throw there is a fatal close rather than a recoverable card. | S |
| `performance-size-3` / `-4` / `-1` | The low-end gate is keyed on pixel density and never fires on 720p 2 GB phones; the SFX cache grows to as many as 60 live players and is never released; room art is 2 to 3 times oversampled for its box. | M, after the device numbers from the smoke matrix say whether it matters. |
| `accessibility-devices-2` | The dialogue sheet and the utility menu sit 14 to 16 dp under a three-button navigation bar on Android 15/16. | XS: pad by the bottom inset like the other sheets. |
| `product-retention-7` | The share prompt's phase-transition trigger is never wired; only the flawless-win path fires. | XS |
| `narrative-1` | On the solve-floor endgame path (finale before the house is complete) the house ceremony still plays the pre-arrival version. | S |

## Play Console and operations tasks that cannot be verified from the repository

- **Data safety form**: last submitted 2026-07-02. Add "Device or other IDs" for crash reporting (Sentry) and purchase management (RevenueCat), confirm purchase history covers the subscription, and keep Advertising ID and approximate location for AdMob. Set Ads = Yes.
- **Content rating (IARC)**: answer fear/horror themes yes, violence as text references only, occult references yes, no user interaction, IAP and ads present. The expected outcome is Teen / PEGI 12, which matches the 13+ claim.
- **Target audience**: declare 13 to 15, 16 to 17 and 18+ only, and answer honestly that the app could unintentionally appeal to children (it is cute on purpose). Do not let one tester's "great for kids" pull the listing toward Families, whose ad-SDK and content rules this game cannot meet.
- **Listing website field** so AdMob can verify `app-ads.txt` at `jpearleverett.github.io`; publish the EEA and US-state UMP messages in AdMob.
- **Screenshots**: the console holds the July set the repo itself calls stale, and the September pack was rendered from the web build before the September 13 UI changes. Recapture the eight phone screenshots from the signed build before promotion.
- **Release notes** must mention the September 13 privacy and terms clarification; both documents promise it.
- **Google Play RTDN to RevenueCat** (owner-deferred): without it refunds and revocations reach RevenueCat late and the app keeps honoring a refunded Supporter.
- **Sentry**: confirm the `SENTRY_AUTH_TOKEN` EAS secret, one symbolicated event from the signed build, and alert rules (new issue, crash-free sessions, error-rate spike) routed to you.
- **Supabase**: confirm the plan's disk quota and backup policy, that the retention cron job exists and has run, and consider a per-install rate limit inside `ingest_events_v2`, `bump_words_offered` and `submit_daily_score_v2` plus a plausibility floor on daily times (`backend-ops-1`, `-2`). The migrations themselves are applied; update `docs/BACKEND_SETUP.md` and `docs/LAUNCH_CHECKLIST.md`, which still list hosted deployment as open and still say 1.3.4 / 98.
- **GitHub Pages**: `CURRENT_BUILD.md` and `BUILD_AND_UPLOAD.md` are publicly served next to the privacy policy and describe the ending; this review adds them (and itself) to the Jekyll exclude list. Consider a `robots.txt`.

## What the tester feedback asks for, and what to do with it

- **Word definitions** (one tester, the most substantive request). The dictionary is a single array of 22,749 words with no glosses, Android has no reliable system "define" intent, and an online lookup would add a network dependency, a privacy-policy change and moderation exposure for a 13+ audience. Recommended: an offline gloss pack from a permissively licensed source, restricted to the words that can actually be displayed, surfaced as tap-a-word on the victory chain and in the Word Ledger, with a size guard. Medium effort, after launch.
- **"A few animations could be slightly faster."** Measured: the victory entrance is about a second and tap-to-skip; the dialogue typewriter is 22 ms per character, so a 200-character page takes 4.4 s and a three-line visit 20 to 26 s if never tapped, and nothing tells a new player the bubble is tappable; the phase ceremonies auto-advance at about 4 s a scene with Skip behind a confirmation. Swift Victories exists but is off by default, gated at 20 solves and advertised once as a transient board message. Cheap wins: drop the typewriter to about 15 ms per character for Phases 0 to 1, add a "tap to skip" hint on the first reveal, and surface the quicker-celebrations setting from the victory card.
- **"Gradually introduce more variety and extra rewards."** The game already unlocks something at 6, 8, 10, 13, 15, 19, 25, 29, 35, 41, 50, 53, 55, 62, 65, 70, 74, 80, 84, 88, 90, 92, 100 and 115, and the locked modes are teased with countdowns. The gap the tester felt is real in one place: a 2-a-day player gets nothing new between solves 29 and 41 (days 15 to 21) except the starter-pack pitch, exactly on the Phase 2 turn. The economy simulation also shows amber flooding from solve 13 onward, with the casual player holding two to five times the Skip premium at every gate and 10,991 unspent amber by day 60. Moving one discoverable beat into that window and raising the Skip premium are the two tuning levers; read `unlock_purchased.skippedGate` and `room_upgrade_purchased` in the first two weeks before retuning further.

## Staged rollout plan

Promote the production-cut build at 5% for three to four days, 20% for a week, 50% for a week, then 100%. Watch, in this order:

1. Crash-free sessions in Play Vitals and Sentry; hold below 99%, or an ANR rate above Play's 0.47% threshold.
2. The FTUE funnel from the Supabase events table: `app_open`, `onboarding_step` (`cold_open_puzzle` through `unlock_explained`), `onboarding_complete`, `puzzle_completed`, `first_manual_harvest`, `daily_completed`, `phase_reached` with `installAgeDays`. Pause if `onboarding_complete` over first-day `app_open` drops under about 60% or D1 under about 25%; these are planning thresholds, not observed baselines.
3. Purchases: `store_opened`, `purchase_initiated`, `iap_purchase`, `purchase_failed`; pause if failures exceed a tenth of initiations, and check one real purchase's balance delta on day one.
4. Ads: `ad_availability`, and AdMob's own fill and eCPM once live units are serving. Never click your own live ads.
5. A zero from the events table is not evidence of calm; confirm events arrive before reading the funnel.

Run the five-reader story pilot in `docs/STORY_PLAYTEST_PROTOCOL.md` during the 5 to 20% window. Nobody outside the owner has yet seen the reveal, and the store listing sells it.

## Strengths worth stating

- Persistence is stronger than most shipped indie games: a write-ahead journal, single durable victory intent and receipt, revision-checked cloud saves that fail closed, staged and validated restore, and Reset All that commits its anti-resurrection marker before touching anything else. All six save-integrity defects from the September 5 review are fixed and each is pinned by a behavioral test.
- Consent and ad policy are handled correctly: UMP before SDK init, errors never authorize ads, interstitials only at the level-complete exit with a conservative cadence and never during ceremonies or the endgame, rewarded ads strictly opt-in, paid players never shown an interstitial on cold start.
- The narrative pipeline is receipt-based and transactional, with no phase-system leaks anywhere in player-facing text.
- Accessibility engineering is thorough: roles on almost every touchable, live regions, modal hiding, OS reduce-motion honored by every animation loop, predictive back deliberately opted out so custom back handling stays reliable.
- The backend is deployed and locked down, with unguessable 128-bit recovery capabilities that are never logged, and the client degrades silently when it is unreachable.

## Appendix A. Findings and verification status

Resolution: every finding below is fixed on the review branch unless it appears in the "Still open" table under Resolution status above. Status legend: **confirmed** means an independent reviewer re-traced the code and agreed; **plausible** means the reviewer could not refute it but the answer depends on something outside the repository (a device, the console, live data); **refuted** means the reviewer found a guard or test the auditor missed, and the finding is kept here for the record; **low, not verified** means it was rated low and deliberately not spent verification effort on. Severity is the value after review. "(re-verified)" in the narrative above marks findings the author re-read personally.

| ID | Dimension | Finding | Severity after review | Status | Where |
|---|---|---|---|---|---|
| engineering-hygiene-1 | engineering-hygiene | Production toolchain (SDK 57 + R8 optimize + resource shrinking) has never run on a signed device build | high (blocking) | confirmed | `mobile/plugins/withAndroidOptimization.js:21` |
| monetization-1 | monetization | Every consumable and starter-pack purchase is credited twice: checkout is keyed on the Play orderId, receipt recovery on RevenueCat's transaction id | high (blocking) | confirmed | `mobile/src/services/providers/revenueCatBilling.ts:139` |
| release-config-1 | release-config | First R8-minified, resource-shrunk AAB has never been installed on a device; it must pass the internal track before promotion | high (blocking) | confirmed | `mobile/app.json:234` |
| accessibility-devices-1 | accessibility-devices | 6-letter boards shrink below touch-target minimums on common 360dp phones (Sunday daily, EXPERT) | medium | confirmed | `mobile/src/services/slotEstimation.ts:65` |
| accessibility-devices-2 | accessibility-devices | Bottom sheets sit 14-16dp under the three-button navigation bar on Android 15/16 (edge-to-edge forced on Modals) | medium | not independently verified | `mobile/src/components/home/HomeScreen.tsx:2727` |
| accessibility-devices-3 | accessibility-devices | DraggableTile wrapper adds a second, likely inert TalkBack node for every source-row tile | medium | not independently verified | `mobile/src/components/DraggableTile.tsx:276` |
| accessibility-devices-4 | accessibility-devices | On-device TalkBack / enlarged-text / small-screen validation is still an open checklist item | medium | confirmed | `docs/COMPLETION_CHECKLIST.md:28` |
| backend-ops-1 | backend-ops | No rate limiting on anonymous write RPCs; a junk flood shares the database and quota with cloud saves | medium | confirmed | `docs/supabase/events_integrity_v2.sql:11` |
| backend-ops-2 | backend-ops | Daily leaderboard accepts impossible times and fabricated entrants from any anonymous caller | medium | confirmed | `docs/supabase/daily_board_versions.sql:53` |
| backend-ops-3 | backend-ops | Google Play RTDN to RevenueCat is owner-deferred, so subscription refunds/revocations propagate late | medium | not independently verified | `docs/LAUNCH_CHECKLIST.md:109` |
| boot-persistence-1 | boot-persistence | Deterministic boot failures dead-end on a Retry-only card with no in-app escape | medium | confirmed | `mobile/App.tsx:6209` |
| boot-persistence-2 | boot-persistence | Boot and initial-route failures are only console.warn'd, never reported to Sentry or the event log | medium | confirmed | `mobile/src/hooks/useAppBoot.ts:15` |
| boot-persistence-3 | boot-persistence | Thirteen root-level overlays (VictoryModal, phase cinematic, Store/Patron/GameAlert...) sit outside every ErrorBoundary | medium | confirmed | `mobile/App.tsx:6004` |
| ftue-1 | ftue | No automated end-to-end coverage of the cold-open onboarding path | medium | confirmed | `mobile/e2e/game.spec.ts:68` |
| ftue-2 | ftue | Wins 12-13 stack the phase-1 pit ceremony, the blocking preview-graduation card and the first share prompt | medium | confirmed | `mobile/App.tsx:3612` |
| ftue-4 | ftue | First home landing after a chained session queues up to three Fox intros with two auto-opened modals | medium | not independently verified | `mobile/src/components/home/HomeScreen.tsx:1357` |
| gameplay-1 | gameplay | Speed boards past 70 solves silently gain the +1 row because the hook never passes the `speed` option to bank selection | medium | confirmed | `mobile/src/hooks/usePuzzleGame.ts:1519` |
| gameplay-2 | gameplay | The speed clock keeps running under the still-open setup menu and the Rules modal | medium | confirmed | `mobile/App.tsx:1136` |
| gameplay-3 | gameplay | Blind Offering's single judgment checks only each row's final word, so chains illegal under standard rules are accepted at 2x amber and 2x phase progress | medium | not independently verified | `mobile/src/hooks/usePuzzleGame.ts:2599` |
| gameplay-4 | gameplay | Late-game standard content is thin: 31 HARD / 39 EXPERT extendable boards, and daily HARD/EXPERT pools of 100 repeat within 4-7 weeks | medium | not independently verified | `mobile/src/services/puzzleBank.ts:686` |
| monetization-2 | monetization | Production ad-mode flip is a manual app.json edit that no build profile or CI step enforces, and the committed value cannot coexist with green CI | medium | confirmed | `mobile/app.json:271` |
| monetization-3 | monetization | Hardcoded USD fallback prices render on real devices before/without the store fetch, buy buttons are live before products load, and every billing failure is reported as an unconfirmed purchase | medium | not independently verified | `mobile/src/components/monetization/StoreModal.tsx:417` |
| narrative-1 | narrative | House-completion ceremony has no post-Arrival variant on the solve-floor endgame path | medium | confirmed | `mobile/src/services/phaseEvents.ts:357` |
| narrative-3 | narrative | The 'reveal < house completion' invariant is pinned only against the 90-solve floor; for below-ramp players the house completes before the reveal | medium | confirmed | `mobile/src/__tests__/homeWorldData.test.ts:215` |
| performance-size-1 | performance-size | Full-house home screen holds 58-114 MB of decoded bitmaps: every room mounted at 1456x720, three pre-mounted sprite layers per animal, no windowing or explicit downsampling | medium | not independently verified | `mobile/src/components/home/HouseWorld.tsx:2614` |
| performance-size-2 | performance-size | Every fresh install's first launch waits on a cloud RPC that cannot return a save (up to 8 s on a slow or captive network) | medium | confirmed | `mobile/src/services/cloudSave.ts:396` |
| performance-size-3 | performance-size | The low-end device gate (shouldSimplifyAnimations) is keyed on pixel density and never fires on the 720x1600 xhdpi phones that actually have 2-3 GB of RAM | medium | not independently verified | `mobile/src/services/deviceTier.ts:22` |
| performance-size-4 | performance-size | SFX cache is unbounded and never released: each of up to 60 sound names becomes a permanent ExoPlayer + Media3 MediaSession (15 created on the first frame) | medium | not independently verified | `mobile/src/services/audio.ts:278` |
| performance-size-5 | performance-size | No on-device performance evidence exists: cold start, memory and frame numbers for a low-end Android were never recorded, and the launch checklist item is still unchecked | medium | confirmed | `docs/LAUNCH_CHECKLIST.md:47` |
| product-retention-1 | product-retention | Closed test validated only Phases 0-2; the reveal, finale, ads, IAP and notification ladder have zero external player evidence | medium | confirmed | `docs/STORY_PLAYTEST_PROTOCOL.md:121` |
| product-retention-2 | product-retention | Six-day content dead zone for a 2/day player at solves 29-41, landing exactly on the Phase-2 turn (days 15-21) | medium | not independently verified | `mobile/src/services/homeWorldData.ts:682` |
| product-retention-3 | product-retention | Amber floods from solve ~13: casual player is gate-bound, holds 2-5x the Skip premium at every gate, and the only recurring sink is one-shot | medium | not independently verified | `mobile/src/services/homeWorldData.ts:1133` |
| product-retention-4 | product-retention | Notification cadence: 7 pings in the first 7 lapsed days, and a 9:00 'puzzle ready' ping every day for active evening players | medium | not independently verified | `mobile/src/services/notifications.ts:515` |
| release-config-2 | release-config | expo-audio plugin defaults declare RECORD_AUDIO and a mediaPlayback foreground service in a game that never records or plays in background | medium | confirmed | `mobile/app.json:80` |
| release-config-3 | release-config | R8 obfuscation is on but the Sentry Android Gradle Plugin is not enabled, so Java-side crash traces in Sentry will be obfuscated | medium | not independently verified | `mobile/app.json:74` |
| release-config-5 | release-config | OTA path has no rollback runbook and depends on an easily-forgotten env var to hit the production runtime | medium | not independently verified | `docs/OTA_UPDATES.md:30` |
| store-policy-legal-1 | store-policy-legal | Internal release docs with story spoilers are publicly served next to the legal pages | medium | confirmed | `docs/_config.yml:18` |
| store-policy-legal-2 | store-policy-legal | Play Console screenshots are the stale July set; the replacement pack is web-rendered and predates the Sept 13 UI changes | medium | confirmed | `docs/STORE_LISTING.md:161` |
| store-policy-legal-3 | store-policy-legal | Target-audience and IARC declarations need a deliberate answer: cute store presence vs. a 13+ horror game | medium | confirmed | `mobile/docs/store-launch/listing-en-US.json:3` |
| accessibility-devices-5 | accessibility-devices | How-to-Play backdrop is an unlabeled focusable button that dismisses the rules | low | low, not verified | `mobile/src/components/puzzle/RulesModal.tsx:145` |
| accessibility-devices-6 | accessibility-devices | Home header amber balance truncates to an ellipsis at 320dp when a streak badge is present | low | low, not verified | `mobile/src/components/home/HomeScreen.tsx:4264` |
| accessibility-devices-7 | accessibility-devices | Portrait-only with a fixed 250dp house column: acceptable for a word game, but no large-screen badge and a letterboxed tablet experience | low | low, not verified | `mobile/app.json:7` |
| backend-ops-4 | backend-ops | Backend release evidence is stale: docs still call the deployed v2 migrations an open gate and nothing records what was applied | low | low, not verified | `docs/BACKEND_SETUP.md:9` |
| backend-ops-5 | backend-ops | Fresh installs await a cloud RPC on the boot screen that can never return a save | low | low, not verified | `mobile/src/services/cloudSave.ts:405` |
| backend-ops-6 | backend-ops | Local unhandled-promise-rejection capture is dead code: React Native never calls global.onunhandledrejection | low | low, not verified | `mobile/src/services/errorReporting.ts:117` |
| backend-ops-7 | backend-ops | Daily standing re-check queries the default cohort and wall-clock date instead of the board's recorded cohort/date | low | low, not verified | `mobile/App.tsx:2228` |
| boot-persistence-4 | boot-persistence | Every fresh install performs a guaranteed-empty cloud download before the first frame (up to 8 s on a bad network) | low | low, not verified | `mobile/src/services/cloudSave.ts:403` |
| boot-persistence-5 | boot-persistence | Reset All confirmation says 'on this device' but also force-overwrites the linked cloud backup | low | low, not verified | `mobile/src/components/SettingsScreen.tsx:743` |
| boot-persistence-6 | boot-persistence | Local unhandled-promise-rejection capture is dead code on Hermes release builds (Sentry still covers it) | low | low, not verified | `mobile/src/services/errorReporting.ts:120` |
| boot-persistence-7 | boot-persistence | persistenceStorage has no re-entrancy guard: a nested transaction would freeze the app with input blocked | low | low, not verified | `mobile/src/services/persistenceStorage.ts:77` |
| engineering-hygiene-2 | engineering-hygiene | Unhandled-rejection capture in errorReporting.ts is dead code on Hermes; only Sentry sees rejections | low | low, not verified | `mobile/src/services/errorReporting.ts:116` |
| engineering-hygiene-3 | engineering-hygiene | Stray one-off scratch script mobile/crop_ad_tmp.cjs is tracked in the repo | low | low, not verified | `mobile/crop_ad_tmp.cjs:3` |
| ftue-3 | ftue | Win 10 stacks the milestone toasts, the OS store-review sheet and the reverse-variant Fox card on one victory | low | confirmed | `mobile/App.tsx:3105` |
| ftue-5 | ftue | The 'come home' interjection fires on every win once three are chained, with only two copy lines | low | low, not verified | `mobile/src/hooks/useVictoryOrchestration.ts:572` |
| ftue-6 | ftue | Dialogue typewriter and ceremony pacing are the objectively slow animations; skip affordances are undiscoverable | low | low, not verified | `mobile/src/hooks/useDialogueFlow.ts:109` |
| ftue-7 | ftue | Star rating and the hint-costs-a-star rule are never explained anywhere in-app | low | low, not verified | `mobile/src/services/phaseNarrative.ts:1085` |
| ftue-8 | ftue | For EEA/UK installs the GDPR (UMP) consent form is gathered at boot, i.e. over the cold-open board | low | low, not verified | `mobile/src/services/providers/googleAdMobAds.ts:316` |
| gameplay-5 | gameplay | Blind Offering on standard/reverse boards has no blocked-word guard, so a blocked slur can be formed and displayed on the board | low | low, not verified | `mobile/src/hooks/usePuzzleGame.ts:2375` |
| gameplay-6 | gameplay | Hint edge cases: bounded double-shift search can refuse help on a fresh board, weave hints ignore spent letters, and several hint/undo strings bypass phaseNarrative | low | low, not verified | `mobile/src/hooks/usePuzzleGame.ts:2088` |
| gameplay-7 | gameplay | Shared-challenge links are not checked for solvability, so a hand-edited link produces an unwinnable board with no message | low | low, not verified | `mobile/src/hooks/usePuzzleGame.ts:1716` |
| monetization-4 | monetization | Supporter subscription row does not state auto-renewal in the visible copy and there is no manage/cancel link | low | low, not verified | `mobile/src/components/monetization/StoreModal.tsx:857` |
| monetization-5 | monetization | A refunded or revoked Patron/Remove-Ads purchase is never revoked locally unless the player taps Restore | low | low, not verified | `mobile/src/services/providers/revenueCatBilling.ts:166` |
| monetization-6 | monetization | Consent resolution is single-flight per session and never retried, so an offline cold start disables all ad formats until the next launch | low | low, not verified | `mobile/src/services/providers/googleAdMobAds.ts:263` |
| monetization-7 | monetization | hint_recovery reward can be lost after a fully watched ad because it bypasses RewardedAdButton's earned-reward retry | low | low, not verified | `mobile/App.tsx:3906` |
| narrative-2 | narrative | Unread Phase 3-4 backlog is delivered after the Arrival mostly verbatim (91% of Phase-4 lines have no post-arrival variant) | low | confirmed | `mobile/src/services/conversationProgress.ts:52` |
| narrative-4 | narrative | Animal accessibility label reads the raw enum ('Fennick the fennec_fox') and the exact cooldown count | low | low, not verified | `mobile/src/components/home/AnimalSprite.tsx:1368` |
| narrative-5 | narrative | Typography: curly quotes/apostrophes in 13 strings while the rest of the corpus uses straight quotes | low | low, not verified | `mobile/src/services/phaseEvents.ts:349` |
| performance-size-6 | performance-size | Install footprint (~110 MB) is heavy for a word game because 40% is music and the 19.5 MB of PNG room/character art is 2-3x larger than it can be displayed | low | low, not verified | `mobile/assets/rooms:1` |
| performance-size-7 | performance-size | Amber count-up drives a setState per animation frame that re-renders the un-memoized HouseWorld (3,000-line component) for up to 1.3 s on every return home with a gain | low | low, not verified | `mobile/src/components/home/HomeScreen.tsx:1888` |
| product-retention-5 | product-retention | Dark-phase win-back copy reads as a threat on a public lock screen | low | low, not verified | `mobile/src/services/phaseNarrative.ts:4508` |
| product-retention-6 | product-retention | Review prompt's once-ever flag is committed whenever requestReview resolves, which on Android does not mean a dialog was shown | low | low, not verified | `mobile/src/services/reviewPrompt.ts:134` |
| product-retention-7 | product-retention | Share prompt's phase-transition trigger is never wired; it fires only on a flawless win past the 12-solve nudge gate | low | low, not verified | `mobile/App.tsx:4111` |
| product-retention-8 | product-retention | In-game word definitions (tester request): feasible offline for the featured band, effort M, not for launch | low | low, not verified | `mobile/src/dictionary.ts:1` |
| product-retention-9 | product-retention | 'Animations slightly faster' has an answer (Swift Victories) that almost nobody will discover; dialogue typewriter is 4.4 s per page | low | low, not verified | `mobile/App.tsx:4207` |
| product-retention-10 | product-retention | Testers perceive the bright game as 'for kids'; the listing and IARC answers must not follow that perception | low | low, not verified | `docs/STORE_LISTING.md:96` |
| release-config-4 | release-config | Splash and adaptive-icon art are not shaped for the Android 12+ icon masks (composed 1600px splash rendered as a 100dp masked icon; icon corners outside the safe zone) | low | low, not verified | `mobile/app.json:243` |
| release-config-6 | release-config | CI cannot enforce the production cut and never exercises prebuild/manifest; flipping adsUseTestIds on main turns CI red | low | low, not verified | `.github/workflows/ci.yml:32` |
| release-config-7 | release-config | Stray scratch script tracked in mobile/ and one-bump-stale version numbers across the release docs | low | low, not verified | `mobile/crop_ad_tmp.cjs:1` |
| store-policy-legal-4 | store-policy-legal | Privacy policy states no retention periods and does not link the data-deletion page | low | low, not verified | `docs/privacy-policy.md:67` |
| store-policy-legal-5 | store-policy-legal | Data safety form nuances: Sentry and RevenueCat carry their own device identifiers, and the form predates Supporter/banner/support-id linkage | low | low, not verified | `docs/data-deletion.md:22` |
| store-policy-legal-6 | store-policy-legal | Brand inconsistency: launcher label 'Word Shift' vs 'WordShift' everywhere else, and a store icon that differs from the launcher icon | low | low, not verified | `mobile/app.json:3` |
| store-policy-legal-7 | store-policy-legal | Terms omit a governing-law clause, and the Sept 13 legal revision obligates a release-notes mention | low | low, not verified | `docs/terms.md:58` |
| store-policy-legal-8 | store-policy-legal | Template-default permissions (SYSTEM_ALERT_WINDOW, legacy external storage) are not blocked and will appear on the Play permissions list | low | low, not verified | `mobile/app.json:52` |


## Appendix B. What this review covered thinly

The planned completeness pass did not run, so this list is the author's. None of these is known to hide a defect; they are the places where a second look would most likely find one.

- **The upgrade path for existing installs.** Migrations v4 to v6 are reviewed and tested in isolation, but no reviewer walked a real 1.2.2 save through the current bootstrap. Smoke-matrix step 11 covers it.
- **Notification scheduling correctness** beyond cadence: DST transitions, the 7-day ladder after a timezone change, and cold-start tap routing were read but not exercised.
- **Cloud save conflict UI** in Settings (Backup and Restore, "use the newer save", recovery-code entry) was read for correctness of the data path, not driven end to end.
- **Deep links and friend challenges** got one finding (`gameplay-7`, unsolvable hand-edited links) and no journey.
- **Live events (the full-moon window), the season pass premium track, the New Cycle reset and the creator kit** were touched by single findings or not at all.
- **Locale.** The game is English-only by design; prices come from the store in local currency (once loaded, see `monetization-3`), dates use local calendar days, and no right-to-left layout exists. A non-English device was not simulated.
- **Tablets and foldables** were assessed from layout constants (`accessibility-devices-7`), not on a device.

## Appendix C. Documentation drift found along the way

- `docs/LAUNCH_CHECKLIST.md` and `docs/BUILD_AND_UPLOAD.md` still say 1.3.4 / 98; `app.json` says 1.3.5 / 99.
- `docs/BACKEND_SETUP.md`, `docs/LAUNCH_CHECKLIST.md` and `docs/SAVE_INTEGRITY_UPGRADE.md` still describe the hosted v2 migrations as an open gate; the live project has them applied.
- `docs/OTA_UPDATES.md` has no rollback command.
- The `errorReporting.ts` unhandled-rejection hook is dead code on Hermes (Sentry covers rejections); the comment and the CLAUDE.md sentence describing it are wrong.
- `CLAUDE.md` describes the typewriter as 3.0 s per page (15 ms per character); the code uses 22 ms.
