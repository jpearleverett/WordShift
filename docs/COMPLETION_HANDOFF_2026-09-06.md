# Completion handoff — September 6, 2026

This follow-up finishes the implementable September review work on
`feature/game-improvements-vocabulary-audit`. Validation results are recorded in
`review-2026-09-06/validation.md`; the original item ledger remains in
`IMPLEMENTATION_STATUS_2026-09-05.md`.

## Access that only the account owner can provide

Access was checked in this workspace on September 6. GitHub is authenticated as
`jpearleverett` with repository/workflow access. Expo state contains no login;
no Expo, Supabase, Sentry, Google or Apple credential environment variables are
present. No Supabase operator token or Play service-account file is available.
The repository has no Actions secrets or variables configured. These are access
requirements, not requests to approve implementation again.

1. **Supabase:** provide an authenticated operator connection securely, or run
   the prepared upgrade from your operator terminal:
   `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f docs/supabase/apply_upgrade.sql`.
   The base schema is already deployed; this entry point applies the new
   integrity, versioned ranking, support, analytics and retention routines.
   Alternatively run the six files listed in `apply_upgrade.sql`, in that order,
   through the dashboard SQL editor. Skip the existing base schema. Enable Supabase Cron and run
   `docs/supabase/schedule_event_retention.sql`; record an actual successful run.
   The non-writing check is `node mobile/scripts/tools/verifyHostedBackend.mjs`.
   The checked-in hosted report confirms all five new public RPCs are currently
   missing and the legacy read RPC is still callable. The new client intentionally
   does not fall back to the weak legacy save surface.
2. **Expo and Play:** log in to EAS in the environment that will build, and make
   your Play service-account key available at
   `mobile/secrets/play-service-account.json` (gitignored). From `mobile/`, run
   `npx eas-cli build --platform android --profile internal-testing --non-interactive --auto-submit-with-profile internal-testing`.
   Android signing must already be configured in your EAS project. A prepared
   manual GitHub Actions workflow, `internal-testing.yml`, performs source,
   story, puzzle-delivery, daily-cohort and backend checks before the same
   build/submission. Once that workflow reaches
   the default branch, configure repository secrets `EXPO_TOKEN` and
   `PLAY_SERVICE_ACCOUNT_JSON` to use it. Do not paste either secret into chat or
   commit it. EAS supports CI authentication through `EXPO_TOKEN`.
   [Expo CI guide](https://docs.expo.dev/build/building-on-ci/)
3. **Sentry:** confirm the EAS project's `SENTRY_AUTH_TOKEN` is available and
   the signed test build uploads source maps. Only an authenticated Sentry
   project view can establish ingestion, symbolication and actual retention.
4. **iOS, if releasing there:** create/configure the actual AdMob iOS app/unit
   IDs, RevenueCat products/key and App Store Connect signing/submission access.
   The sample app ID is only a safe native startup configuration; iOS monetization
   is intentionally inactive until these account values exist.

Once access is connected, deployment, build, submission and hosted verification
can be performed by an agent. They do not inherently require you to write code
or manually operate the release pipeline.

## Evidence that needs physical devices

Install the new signed **1.3.0 / Android 94** binary from Play internal testing.
Check Play's highest uploaded version code before building: if 94 is already
used, increase `mobile/app.json`'s Android `versionCode` and record the actual
new code in the evidence. This profile intentionally does not auto-increment it.
Expo Go and the browser cannot establish native billing/ads/accessibility.
Use the complete, step-by-step matrix in `RELEASE_VALIDATION_1_3_0.md` and record
results with device/OS/build/runtime, network state and purchase ownership.

- A free Google test account with no purchases, plus accounts holding each
  entitlement: verify test ads, reward claims, purchases and restore. Keep
  `adsUseTestIds=true` during internal testing.
- Two installations: actual backup/restore, conflicting edits, offline/retry,
  interrupted saves/reset/New Cycle and a daily continued past midnight.
- Small-screen/large-system-text and TalkBack; OS motion changes, separate
  haptics, background/resume during story audio, cold/warm deep links and
  notification taps.
- Low-cost and representative midrange Android: three cold/warm and gameplay
  samples, sustained frame/memory behavior and the actual signed download/install
  size. The ready helper is `npm run profile:android -- <evidence-directory>`.
- Capture the eight spoiler-safe store states in the release matrix from this
  signed binary. Browser review screenshots are not store artifact evidence.

## Evidence that needs other people

Run `STORY_PLAYTEST_PROTOCOL.md` with five unfamiliar readers. Record their own
answers about motivation, the two final choices, consequences and pacing;
editing and automated tests cannot establish comprehension. Observe real play
and the existing analytics funnels before claiming retention, purchasing demand
or economy balance has been measured. The simulation checks model consistency;
it does not stand in for player behavior.

No signed build, store submission, hosted migration, cron execution, real-device
pass or reader result should be marked complete merely because its script or
protocol exists.
