# WordShift 1.3.0 release validation

This is the current release procedure. Earlier launch screenshots, device passes, and completion claims are historical evidence. The September work is tracked in [the implementation ledger](IMPLEMENTATION_STATUS_2026-09-05.md).

The code prepares Android version code **94**, iOS build **3**, and version **1.3.0**. `expo-crypto` is a new native dependency and the engine is now Expo SDK 57 / React Native 0.86.3: install a new signed binary. This change cannot be delivered to 1.2.7 as an OTA update. The resolved runtime is now `1.3.0-internal-testing` or `1.3.0-production`, chosen in `app.config.js`. Expo requires native compatibility between a binary and an update. [Expo runtime documentation](https://docs.expo.dev/eas-update/runtime-versions/)

## Internal testing

From `mobile/`:

```bash
npm ci
npm run typecheck
npm run lint
npm test -- --no-coverage --runInBand
npx playwright install chromium
npm run test:e2e
node --max-old-space-size=180 scripts/tools/auditVocabulary.mjs ../docs/review-2026-09-05/vocabulary-bank-audit.json --branching
node --max-old-space-size=180 scripts/tools/auditBankRoutes.mjs ../docs/review-2026-09-05/bank-route-audit.json
npx expo install --check
npx eas-cli build --platform android --profile internal-testing
npx eas-cli submit --platform android --profile internal-testing
```

The two bank audits check current vocabulary, standard branching, full solution replay and preferred Reverse hint continuation. Their scope and artifact format are documented in [bank delivery validation](reports/BANK_DELIVERY_VALIDATION_2026-09-05.md#reproduce).

Build and submit are operator steps; they have **not** been run for this change. `adsUseTestIds` stays **true**. Use the Play-installed signed build for ads, billing, notifications, accessibility and performance checks. Expo Go/web results cannot establish those native behaviors. Historical `submit.production` still targets the internal track so an old command does not silently become a public release command.

An OTA for this new testing binary must resolve the same channel-specific runtime:

```bash
WORDSHIFT_RELEASE_CHANNEL=internal-testing npx eas update --channel internal-testing --message "Describe the tested change"
```

Always set the environment variable to match the channel. Inspect `npx expo config --type public` first. Production promotion requires a separately reviewed production build/runtime, current store screenshots and the production ad-mode change; the testing flag has intentionally not been flipped here. Channel selection and runtime compatibility both matter. [Expo deployment documentation](https://docs.expo.dev/eas-update/deployment/)

## Backend migration and two-device check

Follow [the save integrity upgrade](SAVE_INTEGRITY_UPGRADE.md) and apply the reviewed SQL migrations in the [backend setup order](BACKEND_SETUP.md#1-supabase-project). Repository SQL and local PostgreSQL rehearsals do not change the deployed Supabase project. Until migration, the new client fails safely when an integrity endpoint is unavailable; a recovery code is shown only after a durable backup succeeds.

Use two test installations:

1. Back up A, show its new private recovery code, immediately restore B. Compare progress, hints, harvest, story journal and settings.
2. Edit both from one revision. Upload A, then B. B must show a conflict without overwriting A. Repeat with one device clock changed.
3. Enter an invalid, missing and legacy short code. Verify local save and linked owner remain appropriate; legacy recovery requires the original installation/support flow.
4. Interrupt local restore and a victory write. Relaunch: replay the durable transaction once, with no doubled reward and no partially restored session.
5. Reset a linked device. Confirm the intended cloud owner remains linked, gameplay is cleared, and paid entitlements can still restore from the store.
6. Compare daily results from old/new board versions. They must never share a leaderboard partition. Resume a daily over midnight, including the eased first board.

## Native journey evidence

Record device, OS, installed version/build, update ID/runtime, font scale, motion setting, purchase state, and online/offline state for every pass.

| Journey | Required observation |
|---|---|
| Fresh install → first solve → pit → invite → home | No blank frame, blocked controls, unwanted interruption or lost reward |
| Repeated hint → undo → restart → relaunch | Same disclosed advice costs once; a new decision can cost again |
| Rules/practice on smallest Android at large system text | Title, close, last action and all lesson controls remain reachable; hardware Back works |
| Ordinary victory and timed loss with TalkBack | Result controls are reachable, background board is hidden, focus returns sensibly |
| Reverse, Double Shift and Blind practice | Instructions match actual pick/drop and lock behavior; no progression changes |
| Slow/late recruitment, sparse roster and both endings | PLUM setup is honest, no unseen event is assumed, ending object is inspectable |
| Journal → New Cycle → prior cycle | Transcript, choices, cycle label and historical costume remain correct |
| OS motion enabled; haptics separately on/off | Motion follows OS absent override; touch follows its own setting |
| Skip/mute/background/foreground during Arrival | No old cue tail or home music plays across the scene |
| Free account and each held entitlement | Test ads, reward/free-claim branches and restore behave correctly |
| Notification/deep link/share from cold and warm app | Correct destination and return path; no duplicate daily reward |

Do not mark an ad missing solely because an owner account holds Patron/Remove Ads. Use a test account with no purchase for the free path. Daily double rewards remain cadence/phase capped; banners remain limited to their eligible statistics surfaces.

## Performance capture

Profile a low-cost Android and a representative midrange Android. Measure cold/warm launch, the first/next generated board, long house scrolling, the pit with a full harvest, a story scene and a cinematic skip. Keep three runs and note thermal/battery conditions. Record actual download/install size from the signed artifact/Play Console.

```bash
node scripts/tools/profileAndroid.mjs ../docs/device-evidence/1.3.0-midrange-after-house
```

The helper captures package/installer details, frame statistics, memory, battery/thermal counters and system text/motion settings from one attached authorized device. Pass `--launch-samples` to also collect three cold/warm native activity launches; this optional mode force-stops/relaunches the game, so finish the current move first. Native activity timing does not measure when the JavaScript board becomes playable. It has not run against a device in this VM. Compare before/after samples and check sustained growth after repeated scene openings. Web bundle memory and source asset bytes are not measurements of native frame time, AAB size or a memory leak.

## Current store capture brief

Recapture from this signed build. The old mode screenshot advertises an obsolete benefit. Use authentic, reproducible progress; keep debug controls out of the capture.

| Order | State | Promise |
|---|---|---|
| 1 | Early familiar-word puzzle, selected letter and readable slots | Move one letter; keep both words real |
| 2 | Same puzzle completed, truthful reward receipt | Find your own route |
| 3 | Warm home with a few residents | Build a home from your words |
| 4 | Readable early conversation/journal, no ending words | Meet friends who remember |
| 5 | Actual setup showing Reverse/Double and current modifier benefits | Choose a new way to shift |
| 6 | Actual quiet/reduced-motion settings or optional practice | Learn and play at your pace |
| 7 | Mid-story dusk house | Familiar places change |
| 8 | Spoiler-safe night pit | A cozy game. Mostly. |

Do not reuse the old +50% Challenge image or expose the final board/ending choice. Browser screenshots in `docs/review-2026-09-05` are review evidence, not signed-build store captures. No store listing has been published by this work.

## iOS configuration gate

The AdMob native plugin uses [Google’s sample iOS app ID](https://developers.google.com/admob/ios/quick-start) to remove the missing-app-ID startup hazard. The runtime provider stays inactive while the real iOS ad-unit keys are empty. Replace the sample app ID and configure/rehearse iOS ads and RevenueCat before an iOS monetized release; the sample is not a live monetization configuration.

The SDK update addresses the [documented Hermes regression](https://expo.dev/changelog/sdk-57#known-regressions). This verifies dependency selection, not a measured device-memory improvement.
