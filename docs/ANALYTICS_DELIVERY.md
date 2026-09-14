# Event delivery and useful comparisons

Reviewed against main `6f96ebb` on 2026-09-13. See [current build](CURRENT_BUILD.md)
and [backend deployment](BACKEND_SETUP.md). Supabase is configured in source and
the custom collector URL is empty. `ingest_events_v2` was verified deployed on
the hosted project on 2026-09-14 (read-only probe, see
[backend setup](BACKEND_SETUP.md#hosted-state-verified-2026-09-14)); actual
event rows arriving from a signed build still need operator-side evidence.

Events have stable persisted IDs. Queue writes and ID acknowledgements serialize;
retention keeps the most recent 500 events. A slow upload acknowledges only its
snapshot IDs, preserving newer events even after retention shifts the queue.
One upload runs at a time, requests stop waiting after eight seconds, and failed
or unacknowledged batches remain for retry. This is bounded diagnostics, not a
lossless financial ledger: process death before the five-second local flush and
retention beyond 500 records can drop events.

Apply `supabase/events_integrity_v2.sql` before enabling the updated transport.
The bounded `ingest_events_v2` RPC inserts each `(install_id,event_id)` once;
an acknowledged-lost response can safely retry. `supabase/rate_limits_v1.sql`
adds hourly budgets per install (240 calls, 6,000 rows) far above the client's
one-upload-per-minute, 500-event ceiling; a refused batch returns `false` and
stays queued locally like any other failed upload. Anonymous table SELECT remains
denied. The optional custom collector receives the same IDs and must deduplicate
that pair before returning a successful acknowledgement. It must return success
only after persisting the whole batch. A missing RPC retains the local queue and
does not fall back to duplicate-prone table writes.

`supabase/analytics_funnels.sql` is a private operator view of daily observed
counts by app version/platform. Use raw coarse event fields to compare phase,
scene, mode and outcome within the same build cohort. Events never need a
recovery credential, support reference, personal details or story transcript.
The current story transport emits scene start/defer/resume/complete/choice/skip;
cloud transport emits save success/conflict/failure. Hint taps emit a coarse request,
successful replacement of a played unfinished board emits abandonment, and ad
handlers emit availability/outcome. Returning home with a resumable board is
not abandonment. Verify hosted arrival before interpreting dashboard columns;
a zero from a failed transport is not evidence of zero player behavior.

Compare started/completed counts over a coherent observation window, allowing
for offline delivery and sessions crossing midnight. Use install-based cohorts
for drop-off, rather than treating event-count ratios as unique-player conversion.
The first observed event is not necessarily install day for upgraded players.
Record build/runtime, collection window and eligible sample size with decisions.
Hosted migration, production event arrival and retention remain operator release
checks; local Jest queue tests and PostgreSQL rehearsal do not verify them.

## Reading the current gameplay and store events

Use the event union and call sites in `mobile/src/services/eventLogger.ts` as the
inventory, not old dashboard screenshots. Puzzle, mode, phase, story/choice,
store, purchase and ad events describe observed actions; the durable gameplay
receipts and native billing records own progression and payment truth. A lost or
repeated analytics event must never be used to grant or revoke a purchased item.

Recent changes protect late-animal introductions, choice persistence, ceremony
replay and paid/reward claims. A replay after interruption can produce another
observed scene start, so compare completion by install/scene/cycle where those
fields are present rather than equating starts with unique players. Do not infer
that every animation frame, dialogue page or navigation gesture is tracked.
Recheck the relevant call sites and the eligible cohort before adding a funnel.

For release verification, exercise onboarding, a mode unlock, an acquaintance
visit and choice, ceremony defer/resume/Skip, a normal and abandoned puzzle,
a pending/cancelled/completed purchase and each ad outcome. Record which events
actually arrive in the hosted project and which states have no dedicated event.
A pending payment should not be interpreted as proven revenue from an initiated
checkout; reconcile monetary totals with Play/RevenueCat reports.
