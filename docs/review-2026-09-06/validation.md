# September 6 completion validation

This record covers the follow-up to `1818609` on
`feature/game-improvements-vocabulary-audit`. The source prepares WordShift
1.3.0 / Android 94 / iOS 3. This is implementation and local validation evidence;
the signed release checks remain in
[the owner handoff](../COMPLETION_HANDOFF_2026-09-06.md).

## Environment and reproducibility

- Node 22.23.2, npm and the checked-in lockfile; Linux VM with 2 GB RAM and no
  Android device or emulator.
- Normal `npm test` now uses isolated TypeScript transpilation to keep Jest
  within this VM's memory. Whole-project `npm run typecheck` is a separate
  required check, locally and in CI.
- Large checks run sequentially within the VM memory limit.
- Browser fixtures attach the Chrome debugging protocol before bundle loading
  and reject all non-local network requests. They exercise production UI and
  local persistence from declared save cohorts without creating fake hosted
  analytics, purchases or saves.

## Database and account evidence

The [local PostgreSQL/PGlite rehearsal](database-rehearsal.json) passes **39 assertions**, including save
revision conflict handling, permissions, event deduplication, daily partitions,
support deletion scope and server-receipt-based retention. Public inserts cannot
supply a receipt timestamp; legacy clients can still insert their original
columns and receive the server default. It performs **zero
remote writes**. A single local database does not reproduce hosted concurrency
or PostgREST. Reproduce with `node docs/supabase/rehearse.mjs <path-to-a-package.json-with-@electric-sql/pglite>`.

The [hosted backend probe](hosted-backend.json) is a separate, intentionally
failing operational result: on September 6 all five required v2 public RPCs were
absent, while legacy `get_save` remained callable. Its invalid-input and zero-row
probes read no player data and intentionally perform no writes. Reproduce with
`node mobile/scripts/tools/verifyHostedBackend.mjs` after deployment.

GitHub access is available. Expo operator authentication, the Play submission
key and Supabase/Sentry operator credentials are absent from this workspace.
No signed build, submission, OTA, hosted migration, scheduled Cron execution or
authenticated provider-console result was performed or inferred from local
checks. The prepared internal-testing workflow requires the access described in
the handoff.

## Evidence that local checks cannot supply

Signed Android billing/ads, physical drag and TalkBack, two-installation hosted
restore/conflict behavior, low-cost-device performance, source-map ingestion,
signed store screenshots, five unfamiliar-reader results and real economy or
retention behavior still need accounts, devices or people. Browser font
enlargement is a layout check; it is not Android system-font-scale evidence.

## Source and content

Whole-project `npm run typecheck` passes with no diagnostics after the final
generator, modal accessibility and regression edits (76.92 seconds wall time). The normal `npm test --
--no-coverage --runInBand` suite passes **160 suites / 3,981 tests** in 87.965
seconds (89.43 seconds including npm startup), with no memory-override Jest
configuration. Per-file transpilation is now the normal repository configuration;
whole-project type checking remains required separately.

The first completed GitHub CI run then exposed an intermittent Reverse generator
failure: serialized hints omitted the exact removal position, so repeated
letters could make vocabulary validation check the wrong remainder. Both
serialization paths now retain that position. Two deterministic regressions use
`START` → `STAR` by removing the final `T`, replay the emitted moves with
cumulative locks, and check vocabulary acceptance. Both fail when the correction
is temporarily removed; the fixed focused suite passes all four tests. This
corrects generated hints without changing the installed catalog or daily cohort.

The separate gated Reverse mutation/composition suite passes **11 tests** in
1.338 seconds. It replays generated positions through the independent shipped
solver, including two composed row substitutions and cumulative locks. This
script-only suite is separate from the 3,981 normal tests and is required in CI
and the internal-build workflow. [Integration commands and exit statuses](integration-checks.json)
link their retained logs.

The final installed catalog passes both independent audits: **4,372 eligible
boards / 7,356 stored records**, with all **30 pools at or above 100**. Its
**1,599 Standard** boards retain at least two complete routes; **1,379 Reverse**
and **1,394 Double Shift** boards pass their full completion, canonical replay,
hint and hygiene proofs. There are no delivered duplicate chains. The
[complete top-up report](../PUZZLE_BANK_TOP_UP_2026-09-06.md) links the staged
dry runs, installation and final purge/audit evidence. The content-derived daily
cohort check passes for `daily_v2_e8f99141efc9d9c6`.

All 58 questioned forms have final, sourced editorial decisions: nine restored,
49 excluded from fresh play. The raw dictionary retains all 22,749 entries and
historical saved-board validity is preserved. This is vocabulary evidence and
an explicit difficulty policy, not a claim that all players know every word.

The complete story audit passes: all 13 residents and five base phases remain
represented, and all 1,742 base speech IDs retain their original order. The
[editorial review](../STORY_EDITORIAL_REVIEW_2026-09-06.md) records the authored
changes and distinguishes them from the remaining reader pilot.


The full strict lint run checks **433 files with zero errors and zero warnings**
in 190.61 seconds. The subsequent generator and modal source/test edits also pass
scoped lint with zero warnings (35.80 seconds for the final Home and browser files). `npm run lint -- --max-warnings 0` is required in CI
and the internal-build workflow. [Lint summary](lint-summary.json).

## Rendered review notes

The small-screen ceremony review caught a blank illustration area on text-only
pages. That space now belongs to the reading panel; artwork and visible stage
effects keep their area. The repeated five-page 320×568 / 135% browser-text
journey passes, and the updated fourth-page capture shows the full passage,
Continue and Skip together. The offering introduction also waits until the
ceremony releases the screen, including when its saved-flag read finishes late.
Three focused lifecycle tests cover that ownership.

GitHub's first complete browser run passed 13 journeys and exposed a faster
Journal → Tasks transition than the local VM: the departing Journal's 250 ms
fade still exposed its Season Pass button alongside the destination button.
Journal and Tasks now hide departing content from accessibility and touch
handling immediately, while allowing an enabled exit animation to finish. Both
also honor reduced motion. The affected journeys retain strict button matching;
the Journal journey explicitly enables motion and the season claim journey
keeps reduced motion enabled. Both affected local journeys pass again (79.11
and 69.53 seconds including startup), and the updated Tasks and Store comparison
captures were reviewed. Their attempts are retained in the browser result log.

A subsequent CI run passed those transitions and 14 journeys overall, then
identified a fixture timing assumption in ordinary victory. The returning-player
helper reloaded before the initial board's debounced autosave completed, so the
fast runner legitimately selected a new board instead of resuming the expected
starter. The helper now waits for the durable board before modifying cohort
facts. This makes the intended resumed-board scenario explicit without changing
production selection or save timing. The corrected victory journey passes locally
in 52.41 seconds including startup; its updated result capture was reviewed.


All **15 unique rendered journeys pass**, with [per-attempt results and
logs](browser-journeys.json). They cover fresh help/rules, repeat hint/reload,
Double practice, ordinary victory, both ending inspections, Journal/Tasks/Store
navigation, resident dialogue, the house ceremony, both actual finale choices,
interrupted cup memory and journal, reset/relaunch, daily midnight identity, and
season claim/relaunch. The season claim increases amber once and remains claimed.

The small layout checks use 320×568 and 135% browser text; **15 final screenshots
were reviewed**. Reading panels scroll where necessary and their actions remain
reachable. A screenshot taken after scrolling to an action may show only the
remaining part of the passage; this is not a claim that every enlarged transcript
fits on one screen.

Tests ran in isolated Playwright invocations to bound browser memory. An initial
duplicate Metro startup was stopped. A later outer runner ended while its
separately launched remember-inspection process completed with `1 passed`; its
exit status was unavailable, and the record preserves that distinction. Initial
finale/reset fixture failures and the ceremony layout recheck are retained in
the attempt history. These attempts are not added to the 15 unique-journey count.


## Android export and delivery

The Android export after the generator and modal corrections passes in **55.05 seconds**, with
**700 asset records** and an **11,713,788-byte Hermes bundle**. Its manifest contains all seven runtime
story WebPs and **zero story PNG masters**. The [export summary](android-export-summary.json)
records the bundle path, SHA-256 and story paths. The previous September 5 export
was 13,045,974 bytes; this comparison covers the combined code/content changes,
not signed download size or native runtime memory.

All implementation and local checks are complete. The feature branch is
`feature/game-improvements-vocabulary-audit`; the final push and hosted CI result
are reported with delivery. This export is not a signed AAB, store submission,
hosted migration or physical-device result. The exact remaining access and
human/device work is in the [owner handoff](../COMPLETION_HANDOFF_2026-09-06.md).
