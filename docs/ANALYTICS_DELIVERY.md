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
one-upload-per-minute, 500-event ceiling; a call refused by the 240-call budget
returns `false` and stays queued locally like any other failed upload. Rows over
the 6,000-row hourly budget are dropped server-side by the insert trigger while
the call still succeeds, so that batch is acknowledged and lost (best-effort by
design). Anonymous table SELECT remains
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
The hosted migration and the retention cron were applied by the owner on
2026-09-15 and the cron has completed a successful run. Production event arrival
from the signed build remains an operator release check; local Jest queue tests
and PostgreSQL rehearsal do not verify it.

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

## Rollout views and kill criteria

Added 2026-09-22 for the staged Play rollout ([launch readiness review](LAUNCH_READINESS_REVIEW_2026-09-22.md),
BO-1). The daily counts above cannot answer the rollout's two stop rules, so
[`supabase/analytics_views_v1.sql`](supabase/analytics_views_v1.sql) adds
install-based views. **Status: written and rehearsed offline (PGlite), pending
owner application.** They need no client change; the current build is app
1.4.5 / versionCode 110.

### Applying

As `postgres`, after the files already live and after
[`save_and_board_limits_v1.sql`](supabase/save_and_board_limits_v1.sql), apply
`analytics_views_v1.sql` and then [`event_retention_v2.sql`](supabase/event_retention_v2.sql)
(the retention file keeps first-seen cohorts intact when it prunes). Either run
`psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f docs/supabase/apply_upgrade.sql`,
which now includes both in order, or paste the files into the SQL editor. Both
are transactional and rerunnable. Every view is revoked from `anon` and
`authenticated` and granted to `service_role` only: read them in the SQL editor
or with the service key, never from the app. The read-only verification queries
are in [backend setup](BACKEND_SETUP.md#verifying-files-9-to-11-read-only).

### What each view answers

All days are **UTC days of server receipt** (`events.received_at`), never the
device clock. A batch uploaded after an offline session counts on the day it
lands; uploads run at most once a minute while the app is open.

| View | Grain | Use |
|---|---|---|
| `analytics_install_cohorts` | one row per install | `cohort_day` (first seen), first build and platform, `install_kind` |
| `analytics_retention_cohorts` | cohort day × first build × kind | installs, D1/D7/D14 retained and rate (null until day N has fully elapsed) |
| `analytics_ftue_funnel` | cohort day × first build × kind | `app_open`, each cold-open onboarding step, `onboarding_complete`, first and second `puzzle_completed`, `onboarding_completion_rate` |
| `analytics_phase_reached` | phase × build (plus `app_version = 'all'`) | installs reaching each phase the first time; p25/median/p75 `puzzlesSolved`; median/p90 install age in days |
| `analytics_purchase_funnel` | UTC day × build × product × kind | a `(store)` row with `store_opened`, then `purchase_initiated` / `iap_purchase` / cancelled / failed per product |

`install_kind = 'new'` means the install logged the cold-open onboarding step
within a day of first being seen: a genuine fresh install. `'existing'` is an
upgraded player whose first telemetry arrived with a later build (their first
observed day is not their install day). **Use `'new'` for every rollout
decision.** A player retained on day N has at least one event received on
`cohort_day + N` exactly (classic, not rolling, retention).

`onboarding_complete` also fires on the confirmed "Skip it all", so it measures
leaving onboarding, not completing every beat; the step columns show where
skippers left. The purchase funnel counts real-money checkouts only: the
season-pass premium unlock is an amber spend, logged as
`season_premium_unlocked` from 1.4.5, and older builds' `iap_purchase` rows with
`kind = 'season'` / `productId = 'season_premium_amber'` are excluded.
Reconcile revenue with Play/RevenueCat, never with these counts.

### Example queries

```sql
-- Rollout kill criteria, new installs, last 14 cohort days.
-- Pause the rollout if D1 falls under ~25% or onboarding completion under
-- ~60% of app_open, on a cohort large enough to mean something (a few hundred).
select r.cohort_day, sum(r.installs) as installs,
  round(sum(r.d1_retained)::numeric / nullif(sum(r.installs), 0), 3) as d1,
  round(sum(f.onboarding_complete)::numeric / nullif(sum(f.app_open), 0), 3) as onboarding
from public.analytics_retention_cohorts r
join public.analytics_ftue_funnel f using (cohort_day, app_version, install_kind)
where r.install_kind = 'new' and r.cohort_day >= current_date - 14
  and r.cohort_day + 1 < (now() at time zone 'UTC')::date   -- D1 matured
group by r.cohort_day order by r.cohort_day desc;

-- The same by build, to tell a bad build from a bad day.
select app_version, sum(installs) as installs, sum(d1_retained) as d1,
  round(sum(d1_retained)::numeric / nullif(sum(installs), 0), 3) as d1_rate
from public.analytics_retention_cohorts
where install_kind = 'new' and cohort_day + 1 < (now() at time zone 'UTC')::date
group by app_version order by app_version desc;

-- Where new players leave onboarding (one week of cohorts).
select sum(app_open) app_open, sum(cold_open_puzzle) cold_open, sum(home_empty) home,
  sum(fox_invited) fox, sum(pit_intro) pit, sum(pit_offering) offering,
  sum(unlock_explained) unlock, sum(onboarding_complete) complete,
  sum(first_puzzle_completed) first_win, sum(second_puzzle_completed) second_win
from public.analytics_ftue_funnel
where install_kind = 'new' and cohort_day >= current_date - 7;

-- BO-6, the full-house reveal hold: in week one watch phase 4 against
-- puzzlesSolved (the simulation puts free engaged play near 112 solves).
select phase, app_version, installs, median_puzzles_solved, p75_puzzles_solved,
  median_install_age_days
from public.analytics_phase_reached where phase >= 3 order by phase, app_version;

-- Store to purchase, per product, last 30 days.
select product_id, kind, sum(store_openers) as store_openers,
  sum(initiations) as initiations, sum(purchases) as purchases,
  sum(cancellations) as cancels, sum(failures) as failures
from public.analytics_purchase_funnel
where observed_day >= current_date - 30
group by product_id, kind order by purchases desc;
```

Distinct-install columns are per row: summing `store_openers` or
`purchasing_installs` across days counts a player once per day. For distinct
players over a window, query `public.events` directly. Every view is computed on
read over the raw table; at launch volumes that is fine, and if a query becomes
slow, snapshot it into a table rather than widening the retention window.

### Long-term trends

Once [`event_retention_v2.sql`](supabase/event_retention_v2.sql) is applied, raw
events are kept 180 days. Before a day's rows are pruned, the hourly job rolls
them into `analytics_daily_event_rollup` (UTC day, build, event type, event
count, distinct installs, and one `__any__` row per day and build with the day's
active installs). That table holds counts only and is kept indefinitely, so
DAU-by-build and event volume trends survive the raw window; cohort retention
older than 180 days does not, by design.
