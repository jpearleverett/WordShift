# Support, deletion and retention operations

Reviewed against main `6f96ebb` on 2026-09-13. See [current build](CURRENT_BUILD.md)
and [backend setup](BACKEND_SETUP.md) for the source/deployment distinction.

The support and retention migrations are deployed: a read-only probe on
2026-09-14 found `support_preview`, `support_delete_verified` and
`prune_expired_events` present and denied to `anon` (see
[backend setup](BACKEND_SETUP.md#hosted-state-verified-2026-09-14)). That probe
cannot see the cron job or its runs. The owner has since reported (2026-09-15)
that [`rate_limits_v1.sql`](supabase/rate_limits_v1.sql) is **applied**, its
post-apply probe passed, and the `wordshift-event-retention` cron job is
scheduled and has completed a successful run; keep that run row with the
release record.

**Pending owner application (2026-09-22):**
[`save_and_board_limits_v1.sql`](supabase/save_and_board_limits_v1.sql)
(save-creation budgets, a stricter Daily entrant rule, a higher Daily time
floor), [`analytics_views_v1.sql`](supabase/analytics_views_v1.sql) (private
rollout views) and [`event_retention_v2.sql`](supabase/event_retention_v2.sql)
(180-day raw events plus a daily count rollup). Apply them in that order after
the files already live, as [backend setup](BACKEND_SETUP.md#1-supabase-project)
describes; until then the sections below that mention them describe the
pending state. Backend operator access is required. Never put a service key or
recovery code in client configuration, email, analytics, tickets or logs.

## Locate first, verify separately

Settings displays a non-secret `WSS-...` support reference. Normalize it to
`wss_` plus the 32 lowercase hexadecimal characters. Successful v2 backups link
that reference and the current anonymous install ID to the save in the private
`support_install_links` table. A second device adds its own reference/install ID
to the same save after its first successful backup. The original reference can
therefore locate both devices. The mapping is not retrospective: an install
that never completed a v2 backup and unrelated legacy identities need individual
investigation. Do not guess UUID prefixes or treat a short legacy code as proof.

Using a postgres/service-role operator connection, parameterize:

```sql
select public.support_preview($1); -- normalized support reference
```

The response contains counts only. Neither this lookup reference nor a screenshot
of it authorizes data access, recovery or deletion. Before deletion, verify the
requester's authority over the exact save through a separately authenticated
support process. If proof requires possession of the recovery credential, use a
private secure verification channel; do not ask the customer to email it. The
runbook deliberately has no anonymous delete RPC and no shortcut based on a
lookup reference. Until the operator has that verification process available,
accept the request, preserve the records, and do not claim verification occurred.

Explain the previewed scope and obtain the customer's deletion instruction.
One save may include several restored-device install IDs. Analytics are keyed
by install, so deleting a linked install removes its complete event history,
including activity before that install linked this save. A support reference can
locate several prior saves after manual relinking; delete only the separately
verified owner. Purchase records/entitlements are managed by the stores and
RevenueCat; this operation does not cancel/refund a purchase or subscription.

## Execute only a verified, reviewed scope

Ask the customer to close the app during deletion: a still-running client can
upload a new backup afterward. In the operator connection, use bound parameters
and a unique verified ticket reference. Disable parameter logging for the
credential parameter. Preview again immediately beforehand.

```sql
begin;
select public.support_delete_verified($1, $2, $3);
-- $1 normalized lookup, $2 independently verified full owner capability,
-- $3 unique ticket reference. Review returned counts; commit only intended scope.
commit;
```

The operation removes that save, all linked installs' analytics and both legacy
and versioned daily scores, then cascades its private links. The audit row stores
only ticket/counts/time. It does not store the recovery credential. Independently
verify the save and linked rows are absent and unrelated test rows remain. Keep
aggregate daily counters (they cannot be attributed to an install). Diagnose
Sentry/RevenueCat/store data using their own verified processes; do not claim
these SQL statements remove provider-side records.

## Local reset and legacy recovery

Reset All atomically clears game progress and marks the reset before attempting
the explicit cloud overwrite. Cloud/install/support identity, install date,
paid-grant retry protection, the installation purchase-history baseline/applied
receipts, the first-Amber-purchase flag and anti-repeat courtesy flags survive
local reset.
Cloud deletion is a separate action. Store entitlements can be restored on the
next startup. A reinstall's OS backup behavior is platform dependent. Consumable
history is not a promise to refill spent packs on another installation: older
unknown receipts are baselined instead of granted again. For a missing paid item,
verify the native transaction and current grant state before promising recovery
or issuing a compensating grant; never tell the player to purchase it again to
retry an already-confirmed payment's local save. See [purchase recovery limits](MONETIZATION_SETUP.md#purchase-and-reward-integrity).

Original-device local progress can upgrade to a strong recovery code. Full
legacy UUIDv4 capabilities may import their original row. Short or timestamp
credentials are not automatically imported, merged or re-enabled. Preserve old
rows for reviewed support work; overwritten historical data may not be recoverable.

## Retention verification gate

The published target is at most 24 months for analytics/crash diagnostics; a
policy statement is not proof of an installed job. The installed job prunes at
24 months today; once `event_retention_v2.sql` is applied it prunes raw events
at **180 days**, well inside that ceiling. Before public promotion,
record the project, actual scheduled job/configuration, last successful run,
oldest retained row and Sentry plan/project retention. Use read-only checks first:

```sql
select min(received_at) as oldest_event,
       count(*) filter(where received_at < now() - interval '24 months') as overdue
from public.events;
-- After event_retention_v2.sql: use interval '180 days' above, and check the rollup.
select * from public.analytics_rollup_state;
```

The upgrade now installs `prune_expired_events(batch_size)`, restricted to operators,
with a fixed 24-month cutoff and a maximum 10,000 rows per call. Server receipt
time owns retention, so a future device clock cannot keep an event indefinitely. The local SQL
rehearsal checks its scope, bounds and anonymous-access denial. Enable Supabase
Cron and run [`schedule_event_retention.sql`](supabase/schedule_event_retention.sql)
to install the hourly named job, then record its observed execution. The file
includes read-only job/run/oldest-row queries; a scheduled definition alone does
not establish a successful cleanup. [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart) Do not add an unverified recurring destructive
job from the client. Check provider backups and incident/legal holds separately.
No production retention job or provider deletion was verified by this change.

`event_retention_v2.sql` replaces `prune_expired_events` in place, so the
existing hourly job needs no re-scheduling (do not re-run
`schedule_event_retention.sql` for it). Each run first rolls up complete UTC
days into `analytics_daily_event_rollup` (date, build, event type, event count,
distinct installs; counts only, no install ids, kept indefinitely) and never
prunes a day that has not been rolled up. It also keeps
`analytics_install_first_seen` (install id and first-seen time) only while that
install still has events, and never past 24 months, so the retention views keep
long-lived players in their true cohort without holding an identifier beyond the
policy ceiling. A verified support deletion removes an install's events; its
first-seen row goes on the next hourly run (run
`select public.prune_expired_events(10000);` yourself to clear it at once, which
also prunes whatever is due). The privacy policy's analytics paragraph describes
removing rows at 24 months; whether to mention the non-identifying daily counts
is an owner wording decision.

## Leaderboard poisoning and request budgets

`rate_limits_v1.sql` (applied 2026-09-15) adds per-install hourly budgets, a
Daily plausibility gate and an operator purge. `save_and_board_limits_v1.sql`
(pending) tightens that gate: a Daily entrant must be an install linked to a
cloud backup (an events row alone no longer counts), and the time floor rises
to 5,000 ms or 2,000 ms per row. A player with no successful backup yet gets "no
standing shown" until their next upload lands; there is nothing to repair on
the client. If a day's standings look fabricated (thousands of
entrants, impossible times), remove that cohort with bound parameters from the
operator connection:

```sql
-- Substitute the date and the cohort id the client reports
-- (mobile/src/services/dailyBoardVersion.ts); 'legacy_v1' targets the
-- pre-cohort daily_scores table for that date.
select public.purge_daily_cohort('2026-09-14', 'daily_v2_f55533098748eba5');
```

The function returns the number of rows removed and refuses malformed input.
Players whose result is purged see "no standing shown" for that day; nothing
local is changed. Budget rows live in `public.rate_limits` (one per scope and
key). They are small and self-resetting; optional housekeeping:
`delete from public.rate_limits where window_start < now() - interval '1 day';`.
To free a legitimate install that somehow hit a budget, delete its rows by key.
The pending save-creation budgets use the scopes `save_create_install` (key: the
install id), `save_create_addr` and `save_create_kb` (key: `ip:<address>`) and
`save_create_shared`; a refused create returns `unavailable`, which the client
retries at its next launch or win. If `save_create_shared` is ever the one
refusing, the gateway has stopped forwarding client addresses: investigate that
rather than raising the budget.

## Repeatable local rehearsal

`rehearse.mjs` runs PostgreSQL in memory through PGlite. It checks CAS revisions,
revoked legacy save access, opaque lookup table permissions, event retry dedup,
daily board cohorts, the request budgets, the Daily plausibility and activity
gate, the cohort purge, and verified deletion scope while preserving unrelated
records. It then applies the three 2026-09-22 files twice and checks the
single-overload rule, the save-creation budgets, the backup-linked entrant rule,
the raised floor, every rollout view against seeded events, anonymous denial on
every new relation, and the 180-day prune with its rollup and first-seen rules. It makes no network requests or remote writes. Run the commands in its
header. A hosted Supabase/PostgREST two-device rehearsal and signed-device
interrupted-write tests remain release gates.
