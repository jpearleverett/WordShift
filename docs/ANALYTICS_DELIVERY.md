# Event delivery and useful comparisons

Events have stable persisted IDs. Queue writes and ID acknowledgements serialize;
retention keeps the most recent 500 events. A slow upload acknowledges only its
snapshot IDs, preserving newer events even after retention shifts the queue.
One upload runs at a time, requests stop waiting after eight seconds, and failed
or unacknowledged batches remain for retry. This is bounded diagnostics, not a
lossless financial ledger: process death before the five-second local flush and
retention beyond 500 records can drop events.

Apply `supabase/events_integrity_v2.sql` before enabling the updated transport.
The bounded `ingest_events_v2` RPC inserts each `(install_id,event_id)` once;
an acknowledged-lost response can safely retry. Anonymous table SELECT remains
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
