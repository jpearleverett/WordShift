# WordShift backend setup

Reviewed against main `6f96ebb` on 2026-09-13; hosted state re-checked on
2026-09-14 (see [Hosted state](#hosted-state-verified-2026-09-14)). See
[current build](CURRENT_BUILD.md) and [release gates](LAUNCH_CHECKLIST.md). This
is a configuration/runbook audit plus a read-only probe of the hosted project;
no retention job or provider dashboard was executed here.

> **Migration status:** the September 5 migrations (save integrity, event
> ingestion, daily board cohorts, private support operations, funnels and
> retention) are **applied to the hosted project**: a read-only probe with the
> shipped publishable key on 2026-09-14 found every v2 RPC deployed, the
> operator RPCs denied to `anon`, the legacy save RPCs revoked and every table
> denied to `anon`. [`rate_limits_v1.sql`](supabase/rate_limits_v1.sql)
> (request budgets, daily score plausibility, cohort purge) was applied by the
> owner on 2026-09-15 (see section 1).
>
> **Pending owner application (added 2026-09-22, rehearsed locally only):**
> [`save_and_board_limits_v1.sql`](supabase/save_and_board_limits_v1.sql),
> [`analytics_views_v1.sql`](supabase/analytics_views_v1.sql) and
> [`event_retention_v2.sql`](supabase/event_retention_v2.sql), files 9 to 11
> below. They come from the
> [2026-09-22 launch readiness review](LAUNCH_READINESS_REVIEW_2026-09-22.md)
> (BO-1, BO-3, BO-4, BO-7). All three are backward compatible with every
> shipped client: the matching client changes (the install id on the word
> counter, the season-pass premium unlock logged as its own event) ride the
> current build, app **1.4.5** / Android versionCode **110**, but neither is
> required by the SQL.

The current `mobile/app.json` has Supabase credentials and a Sentry DSN, so these
services are enabled when reachable; `telemetryEndpoint` is blank and analytics
uses the Supabase RPC. Without their corresponding credentials the optional
services no-op. Supabase uses plain `fetch`; native crash reporting is validated
with an EAS build. The owner tests signed Android AABs installed through Play
internal testing, where the native modules are present.

> **Privacy:** ✅ done — `docs/privacy-policy.md` discloses cloud save,
> analytics, and crash reporting, and the Play data-safety declarations were
> submitted (2026-07-02). Re-review both if the data you collect ever changes.

## What turns on with each credential

| `app.json` → `expo.extra` key | Enables |
|---|---|
| `supabaseUrl` + `supabaseAnonKey` | Cloud save, daily leaderboard, aggregate social proof, and analytics (event upload) |
| `sentryDsn` | Remote crash/error forwarding |
| `telemetryEndpoint` | (Alternative analytics sink. If unset but Supabase is configured, stable-ID batches use `ingest_events_v2`; no direct-write fallback.) |

```jsonc
// mobile/app.json
"extra": {
  "telemetryEndpoint": "",
  "supabaseUrl": "https://<project>.supabase.co",
  "supabaseAnonKey": "<anon public key>",
  "sentryDsn": "https://<key>@<org>.ingest.sentry.io/<project>"
}
```

## 1. Supabase project

> The original base schema was applied and verified on 2026-07-02. Files 2 to 7
> were verified deployed on 2026-09-14 (probe below). File 8 (`rate_limits_v1.sql`)
> was applied by the owner on 2026-09-15 via `apply_upgrade.sql`, who re-ran the
> post-apply probe and reported it passing. **Never re-run `security_setup.sql`
> now:** it would recreate the two-argument `bump_words_offered` beside the
> three-argument one this file installs (an ambiguous overload PostgREST answers
> with a 300) and re-grant the legacy daily RPCs.

For a new project, apply the following as `postgres`, in order:

1. [`security_setup.sql`](supabase/security_setup.sql) (base schema).
2. [`save_integrity_v2.sql`](supabase/save_integrity_v2.sql).
3. [`events_integrity_v2.sql`](supabase/events_integrity_v2.sql).
4. [`daily_board_versions.sql`](supabase/daily_board_versions.sql).
5. [`support_operations.sql`](supabase/support_operations.sql).
6. [`analytics_funnels.sql`](supabase/analytics_funnels.sql).
7. [`event_retention.sql`](supabase/event_retention.sql).
8. [`rate_limits_v1.sql`](supabase/rate_limits_v1.sql) (per-install request
   budgets, daily score plausibility, legacy daily RPC revocation, cohort purge).
9. [`save_and_board_limits_v1.sql`](supabase/save_and_board_limits_v1.sql)
   (budgets on the `upsert_save_v2` create path; a Daily entrant must have a
   linked backup; Daily floor raised to 2,000 ms per row, 5,000 ms minimum).
10. [`analytics_views_v1.sql`](supabase/analytics_views_v1.sql) (service-role
    rollout views: retention cohorts, FTUE funnel, `phase_reached`, purchase
    funnel; see [analytics delivery](ANALYTICS_DELIVERY.md#rollout-views-and-kill-criteria)).
11. [`event_retention_v2.sql`](supabase/event_retention_v2.sql) (raw events kept
    180 days, a permanent daily count rollup written before pruning; the
    existing cron job picks it up with no re-scheduling).

For the existing WordShift project, skip the base schema and run
`psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f docs/supabase/apply_upgrade.sql`,
or run files 2–11 above in the dashboard SQL editor, in order (every file is
transactional and rerunnable, so re-running the already-applied 2 to 8 is
harmless; only files 9 to 11 change anything on the hosted project today).
**Order matters on any partial re-run:** files 9 and 11 replace functions that
files 8 and 7 define, so re-running `rate_limits_v1.sql` or
`event_retention.sql` on its own reverts them; re-run 9 to 11 afterwards. The
retention cron job was scheduled on 2026-09-15 and calls
`prune_expired_events(10000)`, which file 11 replaces in place, so do NOT re-run
[`schedule_event_retention.sql`](supabase/schedule_event_retention.sql) for it
(its comments and overdue query still describe the 24-month window).

### Verifying files 9 to 11 (read-only)

Run as `postgres` in the SQL editor after applying. Nothing below writes:

```sql
-- Exactly one overload of each replaced function (an extra one makes
-- PostgREST answer 300 "ambiguous").
select proname, count(*) from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('upsert_save_v2','daily_owner_has_activity','daily_time_floor_ms',
                  'prune_expired_events','rollup_event_days','bump_words_offered')
group by proname;                                   -- every count = 1
select public.daily_time_floor_ms('2026-09-07');    -- Monday: 8000
select public.daily_time_floor_ms('2026-09-05');    -- Saturday: 10000
select pg_get_functiondef('public.daily_owner_has_activity(text)'::regprocedure)
  not like '%public.events%' as events_clause_gone;  -- true
select pg_get_functiondef('public.upsert_save_v2(text,integer,bigint,text,text,bigint,boolean,text,text)'::regprocedure)
  like '%save_create_addr%' as create_budget_live;   -- true
-- Private views: anon/authenticated must see nothing.
select c.relname, has_table_privilege('anon', c.oid, 'SELECT') as anon_select
from pg_class c where c.relnamespace = 'public'::regnamespace
  and c.relname like 'analytics_%';                  -- every anon_select = false
select * from public.analytics_retention_cohorts order by cohort_day desc limit 5;
-- After the next hourly cron run (it rolls up, then prunes):
select * from public.analytics_rollup_state;         -- last_rolled_day = yesterday (UTC) once caught up
select status, start_time, return_message from cron.job_run_details
where jobid in (select jobid from cron.job where jobname = 'wordshift-event-retention')
order by start_time desc limit 3;
select min(received_at) as oldest_event,
  count(*) filter (where received_at < now() - interval '180 days') as overdue
from public.events;                                  -- overdue falls to 0 as the backlog drains
```

The anonymous probe below still applies unchanged: every client RPC keeps its
signature, and `upsert_save_v2` with an invalid owner still answers
`{"status":"unavailable"}` before any budget or write.

Do not re-run the base script alone after upgrading: it would re-enable weak
legacy save RPCs. Rehearse the sequence and permissions in a disposable project;
see [save upgrade](SAVE_INTEGRITY_UPGRADE.md) and
[support operations](SUPPORT_AND_RETENTION_RUNBOOK.md). A missing new RPC leaves
cloud/analytics/ranking unavailable; the client does not fall back to unsafe
legacy writes.

For a new project, configure its public `supabaseUrl` + `supabaseAnonKey` in
`app.json`; WordShift already has these values. Verify actual RPC responses and
event arrival after migration. Keys in source alone do not prove service health.

> **Deploy note:** run the SQL and ship the RPC-based client together. Older
> app builds that still issue direct table reads/writes will simply degrade
> (every call resolves null — no crash), but their cloud sync and rank display
> stop working until the player updates.

### Security model: capabilities and restricted table access

The app has **no user auth** — the shipped anon key is public by definition, so
the database can never trust "who" is calling, only "what they know". The
model:

- **A player's owner id is an unguessable bearer capability** — a random
  128-bit save capability encoded as a complete WS2 recovery code. The old short
  code is deprecated and its save RPCs are revoked. Client save access requires
  that row's owner capability; private operators have separate service access.
- **Direct save/score/support table access for `anon` is denied.** RLS and
  revoked grants prevent enumeration or direct writes. Telemetry is the explicit
  exception: legacy clients retain INSERT on approved event columns, with no
  SELECT and no ability to set server-owned `received_at`. The current client
  uses the bounded deduplicating RPC instead.
- **The current client uses `SECURITY DEFINER` RPCs** (owned by `postgres`,
  with explicit execution grants). Save/score operations require the owner
  capability; event ingestion and aggregate counters are anonymous operations.
  Private support/deletion/retention routines are operator-only. Client RPCs
  return the caller's authorized data or aggregates:
  - `get_save_v2(p_owner)` / `upsert_save_v2(...)`
    — cloud save, one row per capability, 1 MB payload cap. With
    `save_and_board_limits_v1.sql`, CREATING a new owner row is budgeted per
    hour: 20 per install id, 300 and ~120 MB of payload per client address, or
    5,000 across all callers when no address header arrives. Updates to an
    existing row are never charged.
  - `submit_daily_score_v2(...)` — upserts only the caller's `(owner, date, board_version)` row,
    with hard bounds (time ≤ 24 h, stars 0–3, hints 0–50, handle ≤ 24 chars)
    so a poisoned client can't submit absurd scores. With `rate_limits_v1.sql`
    it also refuses implausible results (time under 3,000 ms or under 1,500 ms
    per row of that weekday's Daily ramp; 3 stars with a hint, 2 stars with two),
    refuses owners the project has never seen (no linked backup, telemetry
    upload or save), and budgets 30 submissions per owner per hour. Once
    `save_and_board_limits_v1.sql` is applied the floor is 5,000 ms or
    2,000 ms per row, and a telemetry upload alone no longer makes an owner
    known: it needs a linked cloud backup (every client uploads one at launch
    and after each win, and the Daily unlocks at 8 wins). The legacy
    `submit_daily_score`/`daily_rank` names lose their `anon` grant; the v2
    functions still reach them internally for the `legacy_v1` cohort.
  - `daily_rank_v2(p_date, p_owner, p_board_version)` — aggregate-only standing
    (rank/total/percentile); never other players' ids or scores.
  - `bump_words_offered(...)` (bounded per call: at most 20 words, the largest
    shipped board has 7 rows; 600 calls per hour per install id or client
    address) / `aggregate_proof(...)` — two anonymous global numbers, nothing
    per-player. The optional third `p_install_id` parameter defaults to null so
    older two-argument clients are unchanged; from 1.4.5 the client sends it, so
    the budget is per install instead of per (possibly carrier-shared) address.
- **The `events` telemetry table is INSERT-only** for `anon` (no select). The
  current client calls `ingest_events_v2` to deduplicate stable event IDs without
  granting SELECT access. `rate_limits_v1.sql` budgets 240 calls and 6,000 rows
  per install per hour (the client uploads at most once a minute and retains at
  most 500 events); the row budget is a `BEFORE INSERT` trigger, so the legacy
  column-scoped direct INSERT is bounded by the same counter. Budgets live in
  the private `rate_limits` table (one row per scope and key, one-hour windows).

**Residual risks (accepted):**

- Compromising a device (or its backup) reveals that device's owner id — an
  attacker can then read/overwrite **that one player's** save and score. Same
  blast radius as the device itself; no cross-player exposure.
- A recovery code shown to the player is the same capability in friendlier
  clothes — anyone who learns it can restore (and overwrite) that save. Treat
  it like a password.
- Telemetry is insert-only and unauthenticated, so anyone with the anon key
  can write junk `events` rows; analytics are best-effort and this is
  accepted. `rate_limits_v1.sql` bounds what one install id (or one client
  address, when the gateway forwards it) can write per hour, which turns an
  unbounded flood into a per-key ceiling; an attacker minting fresh install ids
  is still only bounded by the address budget, and the same holds for minting
  fresh save owners once `save_and_board_limits_v1.sql` budgets the create path.
  `event_retention_v2.sql` caps raw events at 180 days. The `events` table shares the
  project's disk with `saves`, so **turn on Supabase disk/usage alerts** and
  confirm the plan tier (free-tier disk exhaustion would stop cloud backups and
  recovery codes for everyone). Likewise `bump_words_offered` can be nudged
  within its per-call and per-hour bounds — the counter is cosmetic,
  aggregate-only social proof.
- Strong WS2 capabilities have 128 random bits; that protection does not
  authenticate telemetry or validate a score's gameplay. The daily plausibility
  floor and activity requirement raise the cost of a fabricated standing; they
  do not prove a human played. `purge_daily_cohort` (operator-only) clears a
  poisoned day.

### Recovery code (cloud save is auth-free)

To move progress across devices, the player uses **Settings → Backup & Restore**:
"Show recovery code" on the original device, then "Restore from another device"
on the new one. A new `WS2-` code contains all 32 hexadecimal characters of the
128-bit save capability in four groups of eight; it is shown only after a durable
backup succeeds. A fresh installation without retained identity does not discover
an unrelated backup automatically. Short legacy codes are not silently imported;
follow [the original-device upgrade and verified support procedure](SAVE_INTEGRITY_UPGRADE.md).

### Hosted state (verified 2026-09-14)

A read-only probe with the publishable key from `mobile/app.json` (no
`Authorization` header, `apikey` only) against
`https://<project>.supabase.co/rest/v1/` recorded, on 2026-09-14:

| Surface | Result | Meaning |
|---|---|---|
| `rpc/get_save_v2`, `rpc/upsert_save_v2`, `rpc/get_legacy_save_for_upgrade` | HTTP 200 | `save_integrity_v2.sql` applied |
| `rpc/ingest_events_v2` (empty array) | HTTP 200 `true` | `events_integrity_v2.sql` applied |
| `rpc/submit_daily_score_v2`, `rpc/daily_rank_v2` | HTTP 200 | `daily_board_versions.sql` applied |
| `rpc/bump_words_offered` (`p_count` 0), `rpc/aggregate_proof` | HTTP 200 | base RPCs present |
| `rpc/support_preview`, `rpc/support_delete_verified`, `rpc/prune_expired_events` | HTTP 401/`42501` | `support_operations.sql` + `event_retention.sql` applied, operator-only |
| `rpc/get_save`, `rpc/get_save_timestamp`, `rpc/upsert_save` | `42501` | legacy save RPCs revoked |
| `GET saves`, `events`, `daily_scores`, `daily_scores_v2`, `daily_counters`, `support_install_links`, `support_deletion_audit`, `analytics_daily_build_funnel` | `42501` | tables denied to `anon` |
| `POST events` with a not-null violation | `23502` | the legacy column-scoped INSERT grant is live (now bounded by `rate_limits_v1.sql`, applied 2026-09-15) |

Not verifiable with the publishable key, still open on the checklist: actual
event rows arriving from the signed build, the Sentry alert rules and the
project plan tier. The `wordshift-event-retention` cron job was created by the
owner on 2026-09-15 (`schedule_event_retention.sql` as postgres, with Supabase
Cron enabled) and has since completed a successful run, so event retention is
deployed and executing. Keep that job/run row with the release record; its
oldest-row query is the check that the window is actually pruning once real
event volume arrives.

The post-apply probe was re-run by the owner on 2026-09-15 and reported
passing: `rpc/submit_daily_score` and `rpc/daily_rank` answer `42501` (both are
revoked and never re-granted by `rate_limits_v1.sql`), and
`rpc/bump_words_offered` still answers the two-argument body, because the
replacement signature takes `p_install_id text default null` and PostgREST
fills the default. `submit_daily_score_v2`, `daily_rank_v2` and
`aggregate_proof` are the four RPCs the client actually calls and all survive
the migration. These results are owner-reported; this repository cannot verify
hosted state from source.

```bash
# Run from the repository root (the two node -e lines read ./mobile/app.json).
KEY=$(node -e 'console.log(require("./mobile/app.json").expo.extra.supabaseAnonKey)')
URL=$(node -e 'console.log(require("./mobile/app.json").expo.extra.supabaseUrl)')/rest/v1
probe() { curl -sS -m 20 -o /dev/stdout -w " HTTP %{http_code}\n" -X POST "$URL/rpc/$1" \
  -H "apikey: $KEY" -H "Content-Type: application/json" -d "$2"; }
probe get_save_v2 '{"p_owner":"probe"}'
probe ingest_events_v2 '{"p_install_id":"probe-only","p_platform":"probe","p_app_version":"probe","p_events":[]}'
probe daily_rank_v2 '{"p_date":"2026-09-14","p_owner":"probe-only","p_board_version":"probe"}'
probe bump_words_offered '{"p_date":"2026-09-14","p_count":0}'
probe support_preview '{"p_support_id":"probe"}'      # expect 42501
probe prune_expired_events '{"p_batch_size":1}'       # expect 42501
probe get_save '{"p_owner":"probe"}'                  # expect 42501
probe submit_daily_score '{"p_owner":"probe","p_date":"2026-09-14","p_time_ms":0,"p_stars":0,"p_hints":0}'  # 42501 now that rate_limits_v1 is applied (revoked, never re-granted)
probe daily_rank '{"p_date":"2026-09-14","p_owner":"probe"}'      # legacy read RPC: 42501 now that rate_limits_v1 is applied
for t in saves events daily_scores_v2 daily_counters support_install_links rate_limits; do
  curl -sS -m 20 -o /dev/stdout -w " HTTP %{http_code}\n" "$URL/$t?select=*&limit=1" -H "apikey: $KEY"   # expect 42501
done
```

The probe writes nothing: the RPC bodies fail their own validation (`p_count`
0, an empty event array, an unknown owner, and a 5-character `p_owner` under the
legacy `submit_daily_score` 8-character floor, so even the pre-migration schema
inserts no 0 ms entrant) before any insert. Operator-side
checks (as `postgres`/service role) belong in the
[support runbook](SUPPORT_AND_RETENTION_RUNBOOK.md#retention-verification-gate).

## 2. Sentry (crash reporting)

> **Configured.** The app uses the real **`@sentry/react-native` SDK** (not the old
> HTTP-store-API forwarder): `Sentry.init` runs at App.tsx module load when
> `sentryDsn` is set (crash + error capture only, `tracesSampleRate: 0`), and
> captures **native** crashes (force-closes / SIGSEGV / Java FATAL EXCEPTION)
> in dev-client/EAS builds — plus unhandled JS errors. Errors routed through
> `reportError()` (ErrorBoundary etc.) are forwarded via the
> `setErrorForwarder()` seam in `src/services/errorReporting.ts` with their
> source/metadata as Sentry tags/extras. No DSN → fully disabled.

To re-provision: create a project at sentry.io, copy its DSN into `sentryDsn`
in `app.json`, and set the org/project slugs in the `@sentry/react-native`
config plugin (`app.json` → `plugins`; currently `iridescent-games-9n` /
`wordshift`). **Source maps:** the production EAS secret was recorded as configured in July;
confirm `SENTRY_AUTH_TOKEN` is available to the actual build environment and a
symbolicated event arrives. `SENTRY_DISABLE_AUTO_UPLOAD` is set only in the
`development`/`preview` profiles; production/internal-testing rely on their build
environment credentials. The latest native optimization still requires device
verification of reporting and startup.

## 3. Store submission (separate from the above)

- ✅ `expo.extra.eas.projectId` / `owner` are populated (`eas init` done).
- `eas.json` configures both Android submit profiles for the **internal** track
  with a local service-account file at `./secrets/play-service-account.json`.
  Earlier uploads were owner-confirmed; verify the local credential and current
  artifact before submission. App Store Connect credentials remain open.

## 4. Monetization (in-app purchases + ads)

Separate, and configured on Android (test ads remain enabled): the RevenueCat (IAP) and AdMob (ads) provider
adapters behind the `iap.ts` / `ads.ts` seams are registered in `App.tsx`, with
SDKs installed and Android keys set (iOS keys blank → NoOp fallback). See
[monetization setup](MONETIZATION_SETUP.md) for the details and the iOS steps.
