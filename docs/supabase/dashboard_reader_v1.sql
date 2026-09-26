-- Private Cloud Run dashboard (dashboard/README.md): a least-privilege login
-- role that can only call three aggregate-only functions. Apply as postgres in
-- the Supabase SQL editor AFTER event_retention_v2.sql (file 11). Transactional
-- and rerunnable; it changes no earlier object and is NOT part of
-- apply_upgrade.sql (the dashboard is optional). The role is created NOLOGIN.
-- Enable it with the single
--   alter role dashboard_reader with login password 'SCRAM-SHA-256$...';
-- line that dashboard/deploy.sh prints (a SCRAM verifier, never a plaintext
-- password). Re-running this file never touches LOGIN or the password.
--
-- What the role can do, and nothing else:
--   * connect (connection limit 6: pool max 3 on one Cloud Run instance, plus
--     one old instance draining during a new revision);
--   * USAGE on schema public, needed to name the functions;
--   * EXECUTE on dashboard_live, dashboard_cohorts and dashboard_progress.
-- It holds no table, view or sequence privilege of any kind.
--
-- The role settings below (10 s statement timeout, read-only transactions,
-- idle timeouts) are DEFAULTS for every new session, not limits: a session
-- that holds the password can SET them off. The role also keeps PUBLIC's
-- default TEMPORARY privilege on the database (only a database-wide REVOKE
-- TEMPORARY ... FROM PUBLIC would remove it). So the password is a credential
-- that can load the production database with CPU work and temp tables, not
-- only read counts; the hard limits are the privilege set above and the
-- 6-connection cap. Keep it off the wire (the dashboard verifies the pooler's
-- certificate and refuses cleartext or MD5 password requests) and rotate it
-- with deploy.sh --rotate-db-password if in doubt.
--
-- Outputs are counts only: no install id, owner, handle, save payload,
-- recovery credential or free text leaves the database. app_error message and
-- stack, purchase_failed reason, deep_link_opened url and Daily handles are
-- never read. Client-controlled labels (app version, error source, product id,
-- kind, board version, sync and ad values) pass an allowlist or a regex, and
-- anything else becomes '(other)'; empty or missing becomes '(none)'.
-- Telemetry is unauthenticated, so this is also the page's XSS boundary.
--
-- Definitions (the dashboard glossary repeats them):
--   * Every time is server receipt time, events.received_at, never the device
--     clock in created_at.
--   * A pre-launch tester is an install first received before p_launch_at
--     (events or analytics_install_first_seen). Testers are left out of every
--     count except freshness.lastEventReceivedAt and the explicit tester counts.
--     testers.recentBeforeLaunch counts testers first seen in the 24 hours
--     before p_launch_at: a large number there means the launch time is set
--     too late and real players are being hidden as testers.
--   * A new install logged the cold_open_puzzle onboarding step within a day of
--     first being seen, the same rule as install_kind = 'new' in
--     analytics_views_v1.sql.
--   * Retention cohorts are UTC days, as in analytics_views_v1.sql; dN means
--     any event received on exactly cohort_day + N, and a rate stays null
--     until that UTC day has ended. A first session that runs past 00:00 UTC
--     therefore counts toward D1. "Today" follows p_tz.
--   * Cloud save health is also counted in devices (syncInstalls24h and the
--     *Installs24h counts), because the app logs one cloud_sync_result per
--     upload attempt: one offline player logs an 'unavailable' for every
--     puzzle, and one undecided conflict logs 'conflict' on every attempt.
--   * store.purchasersFromStore counts buyers who also opened the Store in the
--     window. Patron, Remove ads, the Keeper's Edition and the season premium
--     are bought from other screens that never log store_opened.
--   * dailyChallenge dates are the PLAYER's local calendar date
--     (daily_scores_v2.date), matched against today in p_tz.
--   * Purchases exclude the legacy amber season unlock (kind 'season' or
--     productId 'season_premium_amber'), as analytics_purchase_funnel does.
--
-- Every window is at most 90 days, and event_retention_v2.sql only prunes raw
-- events older than 180 days, so these functions read public.events alone and
-- never the daily rollup.
--
-- p_tz must be an IANA name listed in pg_timezone_names, else UTC is used and
-- tzFallback is true. It is only ever a bound value for AT TIME ZONE, never
-- dynamic SQL. The membership check also refuses POSIX strings such as
-- 'UTC+5', which Postgres would accept with an inverted sign. p_launch_at is
-- used only when it is after 2020-01-01 and not in the future.
--
-- Undo (never part of this file): see dashboard/README.md, "Removing
-- everything".
begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'dashboard_reader') then
    create role dashboard_reader nologin noinherit connection limit 6;
  end if;
end $$;
alter role dashboard_reader connection limit 6;
-- An expired VALID UNTIL makes Supavisor's auth query return a null secret
-- (EAUTHQUERY), so pin it open on every run.
alter role dashboard_reader valid until 'infinity';
alter role dashboard_reader set statement_timeout = '10s';
alter role dashboard_reader set default_transaction_read_only = on;
alter role dashboard_reader set idle_in_transaction_session_timeout = '15s';
alter role dashboard_reader set idle_session_timeout = '10min';
alter role dashboard_reader set lock_timeout = '2s';
-- On Supabase postgres is not a superuser, and Postgres refuses a non-superuser
-- ALTER ROLE that names SUPERUSER (or REPLICATION/BYPASSRLS unless held), so the
-- role keeps its creation defaults and this block asserts them instead.
do $$
begin
  if exists (select 1 from pg_roles r where r.rolname = 'dashboard_reader'
      and (r.rolsuper or r.rolcreaterole or r.rolcreatedb or r.rolreplication or r.rolbypassrls)) then
    raise exception 'dashboard_reader carries an elevated attribute; drop the role and re-run this file';
  end if;
  if exists (select 1 from pg_auth_members m join pg_roles r on r.oid = m.member
      where r.rolname = 'dashboard_reader') then
    raise exception 'dashboard_reader is a member of another role; revoke that membership and re-run';
  end if;
end $$;
grant usage on schema public to dashboard_reader;

-- Every "since launch" query on a sparse event type (phase_reached, the store
-- funnel, app_open) becomes an index range scan. A plain CREATE INDEX (not
-- CONCURRENTLY, which cannot run inside this transaction) briefly blocks
-- inserts into events while it builds; at launch volume that is seconds, and a
-- client whose upload fails keeps its batch queued for the next minute.
create index if not exists events_type_received_idx on public.events (type, received_at);

-- ---------------------------------------------------------------------------
-- Live panels: the last 24 hours and "today" in p_tz.
create or replace function public.dashboard_live(p_tz text, p_launch_at timestamptz)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_tz text := 'UTC';
  v_launch timestamptz;
  v_now timestamptz := now();
  v_today date;
  v_today_start timestamptz;
  v_from timestamptz;
  v_minute0 timestamptz := date_trunc('minute', now()) - interval '59 minutes';
  result jsonb;
begin
  if p_tz is not null and length(p_tz) between 1 and 64
     and p_tz ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+){0,2}$'
     and exists (select 1 from pg_timezone_names n where n.name = p_tz) then
    v_tz := p_tz;
  end if;
  if p_launch_at > '2020-01-01'::timestamptz and p_launch_at <= v_now then v_launch := p_launch_at; end if;
  v_today := (v_now at time zone v_tz)::date;
  v_today_start := v_today::timestamp at time zone v_tz;
  v_from := least(v_now - interval '24 hours', v_today_start);

  with testers as materialized (
    select e.install_id from public.events e where v_launch is not null and e.received_at < v_launch
    union
    select f.install_id from public.analytics_install_first_seen f where v_launch is not null and f.first_seen_at < v_launch
  ), recent as materialized (
    select e.install_id, e.type, e.received_at,
      case when e.app_version is null or e.app_version = '' then '(none)'
           when e.app_version ~ '^[0-9]{1,4}(\.[0-9]{1,4}){0,3}$' then e.app_version else '(other)' end as app_version,
      case when e.type <> 'app_error' then null
           when coalesce(e.data->>'source', '') = '' then '(none)'
           when e.data->>'source' ~ '^[a-z][a-z0-9_]{0,47}$' then e.data->>'source' else '(other)' end as error_source,
      case when e.type <> 'cloud_sync_result' then null
           when e.data->>'operation' in ('upload', 'restore') then e.data->>'operation' else '(other)' end as sync_operation,
      case when e.type <> 'cloud_sync_result' then null
           when e.data->>'result' in ('saved', 'conflict', 'unavailable', 'invalid', 'failed', 'recovery_required')
             then e.data->>'result' else '(other)' end as sync_result,
      case when e.type <> 'ad_availability' then null
           when e.data->>'format' in ('rewarded', 'interstitial') then e.data->>'format' else '(other)' end as ad_format,
      case when e.type <> 'ad_availability' then null
           when e.data->>'placement' is null then '(none)'
           when e.data->>'placement' in ('victory_double', 'hint_recovery', 'quest_bonus', 'speed_rescue', 'daily_amber')
             then e.data->>'placement' else '(other)' end as ad_placement,
      case when e.type <> 'ad_availability' then null
           when e.data->>'result' in ('completed', 'dismissed', 'not_ready', 'no_provider', 'error', 'daily_cap',
             'unavailable', 'shown', 'suppressed') then e.data->>'result' else '(other)' end as ad_result,
      case when e.type = 'daily_amber_claimed' and jsonb_typeof(e.data->'amount') = 'number'
        then least(greatest((e.data->>'amount')::numeric, 0), 1000) end as amber_amount,
      (e.type = 'iap_purchase' and coalesce(e.data->>'kind', '') <> 'season'
        and coalesce(e.data->>'productId', '') <> 'season_premium_amber') as is_purchase,
      (e.type = 'onboarding_step' and e.data->>'step' = 'cold_open_puzzle') as is_cold_open
    from public.events e
    where e.received_at >= v_from
      and not exists (select 1 from testers t where t.install_id = e.install_id)
  ), today as materialized (
    select * from recent r where r.received_at >= v_today_start
  ), day_installs as (
    select t.install_id, bool_or(t.is_cold_open) as cold_open from today t group by t.install_id
  ), new_today as (
    select d.install_id, d.cold_open from day_installs d
    where not exists (select 1 from public.events p where p.install_id = d.install_id and p.received_at < v_today_start)
      and not exists (select 1 from public.analytics_install_first_seen f
                      where f.install_id = d.install_id and f.first_seen_at < v_today_start)
  ), last24 as materialized (
    select * from recent r where r.received_at >= v_now - interval '24 hours'
  ), per_minute as (
    select date_trunc('minute', r.received_at) as minute_start, count(*) as n
    from recent r where r.received_at >= v_minute0 group by 1
  ), errors as (
    select l.error_source as source, count(*) as events, count(distinct l.install_id) as installs,
      row_number() over (order by count(*) desc, l.error_source) as rnk
    from last24 l where l.type = 'app_error' group by l.error_source
  ), versions as (
    select l.app_version, count(distinct l.install_id) as installs, count(*) as events,
      count(*) filter (where l.type = 'app_error') as app_errors
    from last24 l group by l.app_version
  ), daily_v2 as (
    select d.date, d.board_version, d.created_at,
      exists(select 1 from testers t where t.install_id = d.owner) as tester
    from public.daily_scores_v2 d
    where d.date in (to_char(v_today, 'YYYY-MM-DD'), to_char(v_today - 1, 'YYYY-MM-DD'))
       or d.created_at >= v_now - interval '24 hours'
  )
  select jsonb_build_object(
    'schemaVersion', 1,
    'generatedAt', to_char(v_now at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'tz', v_tz,
    'tzFallback', (p_tz is distinct from v_tz),
    'launchAt', to_char(v_launch at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'launchAtIgnored', (p_launch_at is not null and v_launch is null),
    'today', to_char(v_today, 'YYYY-MM-DD'),
    'todayStart', to_char(v_today_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'freshness', jsonb_build_object(
      'lastEventReceivedAt', (select to_char(max(e.received_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from public.events e),
      'lastPlayerEventReceivedAt', (select to_char(max(r.received_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from recent r)
    ),
    'testers', case when v_launch is null then null else jsonb_build_object(
      'devices', (select count(*) from testers),
      'activeToday', (select count(distinct e.install_id) from public.events e
        where e.received_at >= v_today_start and exists (select 1 from testers t where t.install_id = e.install_id)),
      'recentBeforeLaunch', (select count(distinct e.install_id) from public.events e
        where e.received_at >= v_launch - interval '24 hours' and e.received_at < v_launch
          and not exists (select 1 from public.events p where p.install_id = e.install_id
                          and p.received_at < v_launch - interval '24 hours')
          and not exists (select 1 from public.analytics_install_first_seen f where f.install_id = e.install_id
                          and f.first_seen_at < v_launch - interval '24 hours'))) end,
    'now', jsonb_build_object(
      'active5m', (select count(distinct r.install_id) from recent r where r.received_at >= v_now - interval '5 minutes'),
      'active60m', (select count(distinct r.install_id) from recent r where r.received_at >= v_now - interval '60 minutes'),
      'events60m', (select count(*) from recent r where r.received_at >= v_now - interval '60 minutes'),
      'perMinuteStart', to_char(v_minute0 at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
      'perMinute', (select jsonb_agg(coalesce(p.n, 0) order by g.minute_start)
        from generate_series(v_minute0, date_trunc('minute', v_now), interval '1 minute') as g(minute_start)
        left join per_minute p on p.minute_start = g.minute_start)
    ),
    'todayCounts', (select jsonb_build_object(
      'newInstalls', (select count(*) from new_today n where n.cold_open),
      'otherNewInstalls', (select count(*) from new_today n where not n.cold_open),
      'newInstallsFinishedTutorial', (select count(*) from new_today n where n.cold_open
        and exists (select 1 from today x where x.install_id = n.install_id and x.type = 'onboarding_complete')),
      'activeInstalls', (select count(*) from day_installs),
      'events', count(*),
      'puzzlesStarted', count(*) filter (where t.type = 'puzzle_started'),
      'puzzlesCompleted', count(*) filter (where t.type = 'puzzle_completed'),
      'installsCompletingPuzzle', count(distinct t.install_id) filter (where t.type = 'puzzle_completed'),
      'dailiesCompleted', count(*) filter (where t.type = 'daily_completed'),
      'onboardingCompleted', count(distinct t.install_id) filter (where t.type = 'onboarding_complete'),
      'storeOpens', count(*) filter (where t.type = 'store_opened'),
      'purchases', count(*) filter (where t.is_purchase),
      'purchasers', count(distinct t.install_id) filter (where t.is_purchase),
      'dailyAmberClaims', count(*) filter (where t.type = 'daily_amber_claimed'),
      'dailyAmberGranted', coalesce(sum(t.amber_amount), 0),
      'appErrors', count(*) filter (where t.type = 'app_error'),
      'installsWithAppError', count(distinct t.install_id) filter (where t.type = 'app_error')
    ) from today t),
    'health', jsonb_build_object(
      'databaseBytes', pg_database_size(current_database()),
      'activeInstalls24h', (select count(distinct l.install_id) from last24 l),
      'appErrors24h', (select count(*) from last24 l where l.type = 'app_error'),
      'installsWithAppError24h', (select count(distinct l.install_id) from last24 l where l.type = 'app_error'),
      'appErrorsBySource', coalesce((select jsonb_agg(jsonb_build_object('source', s.source, 'events', s.events, 'installs', s.installs)
          order by s.source = '(other)', s.events desc, s.source)
        from (select case when x.rnk <= 12 then x.source else '(other)' end as source,
                sum(x.events)::bigint as events, sum(x.installs)::bigint as installs
              from errors x group by 1) s), '[]'::jsonb),
      'cloudSync', coalesce((select jsonb_agg(jsonb_build_object('operation', s.operation, 'result', s.result,
          'events', s.events, 'installs', s.installs) order by s.operation, s.result)
        from (select l.sync_operation as operation, l.sync_result as result, count(*) as events,
                count(distinct l.install_id) as installs
              from last24 l where l.type = 'cloud_sync_result' group by 1, 2) s), '[]'::jsonb),
      'saveFailures24h', (select count(*) from last24 l where l.type = 'cloud_sync_result'
        and l.sync_result in ('invalid', 'failed', 'unavailable', 'recovery_required')),
      'saveConflicts24h', (select count(*) from last24 l where l.type = 'cloud_sync_result' and l.sync_result = 'conflict'),
      'syncInstalls24h', (select count(distinct l.install_id) from last24 l where l.type = 'cloud_sync_result'),
      'saveFailureInstalls24h', (select count(distinct l.install_id) from last24 l where l.type = 'cloud_sync_result'
        and l.sync_result in ('invalid', 'failed', 'unavailable', 'recovery_required')),
      'saveConflictInstalls24h', (select count(distinct l.install_id) from last24 l
        where l.type = 'cloud_sync_result' and l.sync_result = 'conflict'),
      -- In the EventType union but never emitted by build 1.4.6; kept so a
      -- future build that sends it shows up without a migration.
      'puzzleGenerationFailed24h', (select count(*) from last24 l where l.type = 'puzzle_generation_failed')
    ),
    'ads24h', coalesce((select jsonb_agg(jsonb_build_object('format', a.format, 'placement', a.placement,
        'result', a.result, 'events', a.events) order by a.format, a.placement, a.events desc, a.result)
      from (select l.ad_format as format, l.ad_placement as placement, l.ad_result as result, count(*) as events
            from last24 l where l.type = 'ad_availability' group by 1, 2, 3) a), '[]'::jsonb),
    'versions24h', coalesce((select jsonb_agg(jsonb_build_object('appVersion', v.app_version, 'installs', v.installs,
        'events', v.events, 'appErrors', v.app_errors) order by v.installs desc, v.app_version desc)
      from (select * from versions order by installs desc, app_version desc limit 8) v), '[]'::jsonb),
    -- daily_scores_v2.owner is the install id. Testers are split out of the
    -- counts but still shown, because the owner's own phone is a pre-launch
    -- tester and is the end-to-end check that a rank posts from the live build.
    'dailyChallenge', jsonb_build_object(
      'date', to_char(v_today, 'YYYY-MM-DD'),
      'entrantsToday', (select count(*) from daily_v2 d where d.date = to_char(v_today, 'YYYY-MM-DD') and not d.tester),
      'testerEntrantsToday', (select count(*) from daily_v2 d where d.date = to_char(v_today, 'YYYY-MM-DD') and d.tester),
      'entrantsYesterday', (select count(*) from daily_v2 d where d.date = to_char(v_today - 1, 'YYYY-MM-DD') and not d.tester),
      'submissions24h', (select count(*) from daily_v2 d where d.created_at >= v_now - interval '24 hours'),
      'lastSubmissionAt', (select to_char(max(d.created_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') from public.daily_scores_v2 d),
      'boardVersionsToday', coalesce((select jsonb_agg(jsonb_build_object('boardVersion', b.v, 'entrants', b.n) order by b.n desc, b.v)
        from (select case when d.board_version ~ '^[a-z0-9_]{1,64}$' then d.board_version else '(other)' end as v, count(*) as n
              from daily_v2 d where d.date = to_char(v_today, 'YYYY-MM-DD') group by 1 order by 2 desc, 1 limit 3) b), '[]'::jsonb)
    )
  ) into result;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cohort panels: new installs per local day, D1/D7/D14 retention per UTC
-- cohort day and the tutorial funnel, over the last 30 days (never before
-- launch).
create or replace function public.dashboard_cohorts(p_tz text, p_launch_at timestamptz)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_tz text := 'UTC';
  v_launch timestamptz;
  v_now timestamptz := now();
  v_local_today date;
  v_utc_today date := (now() at time zone 'UTC')::date;
  v_local_from date;
  v_utc_from date;
  v_since timestamptz;
  result jsonb;
begin
  if p_tz is not null and length(p_tz) between 1 and 64
     and p_tz ~ '^[A-Za-z][A-Za-z0-9_+-]*(/[A-Za-z0-9_+-]+){0,2}$'
     and exists (select 1 from pg_timezone_names n where n.name = p_tz) then
    v_tz := p_tz;
  end if;
  if p_launch_at > '2020-01-01'::timestamptz and p_launch_at <= v_now then v_launch := p_launch_at; end if;
  v_local_today := (v_now at time zone v_tz)::date;
  v_local_from := v_local_today - 29;
  v_utc_from := v_utc_today - 29;
  if v_launch is not null then
    v_local_from := greatest(v_local_from, (v_launch at time zone v_tz)::date);
    v_utc_from := greatest(v_utc_from, (v_launch at time zone 'UTC')::date);
  end if;
  -- One first-seen window covering both series' complete days, never before launch.
  v_since := least(v_local_from::timestamp at time zone v_tz, v_utc_from::timestamp at time zone 'UTC');
  if v_launch is not null then v_since := greatest(v_since, v_launch); end if;

  with testers as materialized (
    select e.install_id from public.events e where v_launch is not null and e.received_at < v_launch
    union
    select f.install_id from public.analytics_install_first_seen f where v_launch is not null and f.first_seen_at < v_launch
  ), window_events as materialized (
    select e.install_id, e.type, e.received_at, (e.received_at at time zone v_tz)::date as local_day,
      (e.type = 'iap_purchase' and coalesce(e.data->>'kind', '') <> 'season'
        and coalesce(e.data->>'productId', '') <> 'season_premium_amber') as is_purchase
    from public.events e
    where e.received_at >= v_since
      and not exists (select 1 from testers t where t.install_id = e.install_id)
  ), cohort as materialized (
    select c.install_id, c.first_seen_at,
      (c.first_seen_at at time zone 'UTC')::date as cohort_day,
      (c.first_seen_at at time zone v_tz)::date as local_day,
      exists(select 1 from public.events o where o.install_id = c.install_id
        and o.received_at >= c.first_seen_at and o.received_at < c.first_seen_at + interval '1 day'
        and o.type = 'onboarding_step' and o.data->>'step' = 'cold_open_puzzle') as fresh
    from (select w.install_id, min(w.received_at) as first_seen_at from window_events w group by w.install_id) c
    where not exists (select 1 from public.events p where p.install_id = c.install_id and p.received_at < v_since)
      and not exists (select 1 from public.analytics_install_first_seen f
                      where f.install_id = c.install_id and f.first_seen_at < v_since)
  ), day_activity as (
    select w.local_day as day, count(distinct w.install_id) as active,
      count(*) filter (where w.type = 'puzzle_completed') as puzzles_completed,
      count(*) filter (where w.type = 'daily_completed') as dailies_completed,
      count(*) filter (where w.is_purchase) as purchases,
      count(*) filter (where w.type = 'app_error') as app_errors
    from window_events w where w.local_day >= v_local_from group by 1
  ), day_new as (
    select c.local_day as day, count(*) filter (where c.fresh) as fresh, count(*) filter (where not c.fresh) as other
    from cohort c group by 1
  ), retention as (
    select c.cohort_day,
      count(*) filter (where c.fresh) as installs,
      count(*) filter (where not c.fresh) as other_installs,
      count(*) filter (where c.fresh and exists(select 1 from public.events e where e.install_id = c.install_id
        and e.received_at >= (c.cohort_day + 1)::timestamp at time zone 'UTC'
        and e.received_at <  (c.cohort_day + 2)::timestamp at time zone 'UTC')) as d1,
      count(*) filter (where c.fresh and exists(select 1 from public.events e where e.install_id = c.install_id
        and e.received_at >= (c.cohort_day + 7)::timestamp at time zone 'UTC'
        and e.received_at <  (c.cohort_day + 8)::timestamp at time zone 'UTC')) as d7,
      count(*) filter (where c.fresh and exists(select 1 from public.events e where e.install_id = c.install_id
        and e.received_at >= (c.cohort_day + 14)::timestamp at time zone 'UTC'
        and e.received_at <  (c.cohort_day + 15)::timestamp at time zone 'UTC')) as d14
    from cohort c where c.cohort_day >= v_utc_from group by 1
  ), funnel as (
    select c.install_id, c.first_seen_at,
      bool_or(e.type = 'app_open') as app_open,
      bool_or(e.type = 'onboarding_step' and e.data->>'step' = 'cold_open_puzzle') as cold_open_puzzle,
      bool_or(e.type = 'onboarding_step' and e.data->>'step' = 'home_empty') as home_empty,
      bool_or(e.type = 'onboarding_step' and e.data->>'step' = 'fox_invited') as fox_invited,
      bool_or(e.type = 'onboarding_step' and e.data->>'step' = 'going_to_pit') as going_to_pit,
      bool_or(e.type = 'onboarding_step' and e.data->>'step' = 'pit_intro') as pit_intro,
      bool_or(e.type = 'onboarding_step' and e.data->>'step' = 'pit_offering') as pit_offering,
      bool_or(e.type = 'onboarding_step' and e.data->>'step' = 'returning_home') as returning_home,
      bool_or(e.type = 'onboarding_step' and e.data->>'step' = 'unlock_explained') as unlock_explained,
      bool_or(e.type = 'onboarding_complete') as onboarding_complete,
      bool_or(e.type = 'puzzle_completed') as first_puzzle_completed,
      -- CASE guards the numeric cast: a non-number puzzlesSolved never reaches it.
      bool_or(e.type = 'puzzle_completed' and case when jsonb_typeof(e.data->'puzzlesSolved') = 'number'
        then (e.data->>'puzzlesSolved')::numeric >= 2 else false end) as second_puzzle_completed
    from cohort c
    join public.events e on e.install_id = c.install_id and e.received_at >= c.first_seen_at
      and e.type in ('app_open', 'onboarding_step', 'onboarding_complete', 'puzzle_completed')
    where c.fresh
    group by c.install_id, c.first_seen_at
  )
  select jsonb_build_object(
    'schemaVersion', 1,
    'generatedAt', to_char(v_now at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'tz', v_tz,
    'tzFallback', (p_tz is distinct from v_tz),
    'launchAt', to_char(v_launch at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'launchAtIgnored', (p_launch_at is not null and v_launch is null),
    'windowFrom', to_char(v_since at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'installsByDay', coalesce((select jsonb_agg(jsonb_build_object(
        'day', to_char(d.day, 'YYYY-MM-DD'),
        'newInstalls', coalesce(n.fresh, 0), 'otherNewInstalls', coalesce(n.other, 0),
        'activeInstalls', coalesce(a.active, 0), 'puzzlesCompleted', coalesce(a.puzzles_completed, 0),
        'dailiesCompleted', coalesce(a.dailies_completed, 0), 'purchases', coalesce(a.purchases, 0),
        'appErrors', coalesce(a.app_errors, 0)) order by d.day)
      from (select g::date as day from generate_series(v_local_from, v_local_today, interval '1 day') g) d
      left join day_new n on n.day = d.day left join day_activity a on a.day = d.day), '[]'::jsonb),
    'retention', jsonb_build_object(
      'utcToday', to_char(v_utc_today, 'YYYY-MM-DD'),
      'cohorts', coalesce((select jsonb_agg(jsonb_build_object(
          'cohortDay', to_char(r.cohort_day, 'YYYY-MM-DD'), 'installs', r.installs, 'otherInstalls', r.other_installs,
          'd1', jsonb_build_object('matured', r.cohort_day + 1 < v_utc_today, 'retained', r.d1,
             'rate', case when r.cohort_day + 1 < v_utc_today and r.installs > 0 then round(r.d1::numeric / r.installs, 3) end),
          'd7', jsonb_build_object('matured', r.cohort_day + 7 < v_utc_today, 'retained', r.d7,
             'rate', case when r.cohort_day + 7 < v_utc_today and r.installs > 0 then round(r.d7::numeric / r.installs, 3) end),
          'd14', jsonb_build_object('matured', r.cohort_day + 14 < v_utc_today, 'retained', r.d14,
             'rate', case when r.cohort_day + 14 < v_utc_today and r.installs > 0 then round(r.d14::numeric / r.installs, 3) end)
        ) order by r.cohort_day desc) from retention r), '[]'::jsonb),
      'pooled', (select jsonb_build_object(
          'd1', jsonb_build_object('installs', coalesce(sum(r.installs) filter (where r.cohort_day + 1 < v_utc_today), 0),
                                   'retained', coalesce(sum(r.d1) filter (where r.cohort_day + 1 < v_utc_today), 0)),
          'd7', jsonb_build_object('installs', coalesce(sum(r.installs) filter (where r.cohort_day + 7 < v_utc_today), 0),
                                   'retained', coalesce(sum(r.d7) filter (where r.cohort_day + 7 < v_utc_today), 0)),
          'd14', jsonb_build_object('installs', coalesce(sum(r.installs) filter (where r.cohort_day + 14 < v_utc_today), 0),
                                    'retained', coalesce(sum(r.d14) filter (where r.cohort_day + 14 < v_utc_today), 0)))
        from retention r)
    ),
    'funnel', (select jsonb_build_object(
      'installs', count(*),
      'startedLastHour', count(*) filter (where f.first_seen_at >= v_now - interval '1 hour'),
      'steps', jsonb_build_array(
        jsonb_build_object('step', 'app_open', 'installs', count(*) filter (where f.app_open)),
        jsonb_build_object('step', 'cold_open_puzzle', 'installs', count(*) filter (where f.cold_open_puzzle)),
        jsonb_build_object('step', 'first_puzzle_completed', 'installs', count(*) filter (where f.first_puzzle_completed)),
        jsonb_build_object('step', 'home_empty', 'installs', count(*) filter (where f.home_empty)),
        jsonb_build_object('step', 'fox_invited', 'installs', count(*) filter (where f.fox_invited)),
        jsonb_build_object('step', 'going_to_pit', 'installs', count(*) filter (where f.going_to_pit)),
        jsonb_build_object('step', 'pit_intro', 'installs', count(*) filter (where f.pit_intro)),
        jsonb_build_object('step', 'pit_offering', 'installs', count(*) filter (where f.pit_offering)),
        jsonb_build_object('step', 'returning_home', 'installs', count(*) filter (where f.returning_home)),
        jsonb_build_object('step', 'unlock_explained', 'installs', count(*) filter (where f.unlock_explained)),
        jsonb_build_object('step', 'onboarding_complete', 'installs', count(*) filter (where f.onboarding_complete)),
        jsonb_build_object('step', 'second_puzzle_completed', 'installs', count(*) filter (where f.second_puzzle_completed))
      )) from funnel f)
  ) into result;
  return result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Since-launch panels (at most 90 days): story phases, puzzle depth and the
-- store funnel by product.
create or replace function public.dashboard_progress(p_launch_at timestamptz)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_launch timestamptz;
  v_now timestamptz := now();
  v_since timestamptz;
  result jsonb;
begin
  if p_launch_at > '2020-01-01'::timestamptz and p_launch_at <= v_now then v_launch := p_launch_at; end if;
  v_since := greatest(coalesce(v_launch, v_now - interval '30 days'), v_now - interval '90 days');

  with testers as materialized (
    select e.install_id from public.events e where v_launch is not null and e.received_at < v_launch
    union
    select f.install_id from public.analytics_install_first_seen f where v_launch is not null and f.first_seen_at < v_launch
  ), phases as (
    select distinct on (e.install_id, (e.data->>'phase')::int) e.install_id, (e.data->>'phase')::int as phase,
      case when jsonb_typeof(e.data->'puzzlesSolved') = 'number'
        then least(greatest((e.data->>'puzzlesSolved')::numeric, 0), 100000) end as puzzles_solved
    from public.events e
    where e.type = 'phase_reached' and e.received_at >= v_since
      and jsonb_typeof(e.data->'phase') = 'number' and e.data->>'phase' in ('1', '2', '3', '4', '5')
      and not exists (select 1 from testers t where t.install_id = e.install_id)
    order by e.install_id, (e.data->>'phase')::int, e.received_at, e.id
  ), depth as (
    select e.install_id, max(least(greatest((e.data->>'puzzlesSolved')::numeric, 0), 100000)) as solved
    from public.events e
    where e.type = 'puzzle_completed' and e.received_at >= v_since
      and jsonb_typeof(e.data->'puzzlesSolved') = 'number'
      and not exists (select 1 from testers t where t.install_id = e.install_id)
    group by e.install_id
  ), store as (
    select e.install_id, e.type,
      case when coalesce(e.data->>'productId', '') = '' then '(none)'
           when e.data->>'productId' ~ '^com\.wordshift\.[a-z0-9_]{1,40}$' then e.data->>'productId' else '(other)' end as product_id,
      case when coalesce(e.data->>'kind', '') = '' then '(none)'
           when e.data->>'kind' ~ '^[a-z_]{1,24}$' then e.data->>'kind' else '(other)' end as kind
    from public.events e
    where e.type in ('store_opened', 'purchase_initiated', 'iap_purchase', 'purchase_cancelled', 'purchase_failed')
      and e.received_at >= v_since
      and coalesce(e.data->>'kind', '') <> 'season'
      and coalesce(e.data->>'productId', '') <> 'season_premium_amber'
      and not exists (select 1 from testers t where t.install_id = e.install_id)
  )
  select jsonb_build_object(
    'schemaVersion', 1,
    'generatedAt', to_char(v_now at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'launchAt', to_char(v_launch at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'launchAtIgnored', (p_launch_at is not null and v_launch is null),
    'since', to_char(v_since at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'story', jsonb_build_object(
      'installsOpened', (select count(distinct e.install_id) from public.events e
         where e.type = 'app_open' and e.received_at >= v_since
           and not exists (select 1 from testers t where t.install_id = e.install_id)),
      'phases', (select jsonb_agg(jsonb_build_object('phase', k,
          'installs', (select count(*) from phases p where p.phase = k),
          'medianPuzzlesSolved', (select round(percentile_cont(0.5) within group (order by p.puzzles_solved)::numeric, 1)
                                  from phases p where p.phase = k))
          order by k) from generate_series(1, 5) k),
      'depth', (select jsonb_agg(jsonb_build_object('atLeast', k, 'installs', (select count(*) from depth d where d.solved >= k)) order by k)
          from unnest(array[1, 3, 5, 8, 12, 20, 30, 50, 90, 120]) k)
    ),
    'store', jsonb_build_object(
      'opens', (select count(*) from store s where s.type = 'store_opened'),
      'openers', (select count(distinct s.install_id) from store s where s.type = 'store_opened'),
      'purchases', (select count(*) from store s where s.type = 'iap_purchase'),
      'purchasers', (select count(distinct s.install_id) from store s where s.type = 'iap_purchase'),
      'purchasersFromStore', (select count(distinct s.install_id) from store s where s.type = 'iap_purchase'
        and exists (select 1 from store o where o.install_id = s.install_id and o.type = 'store_opened')),
      'products', coalesce((select jsonb_agg(jsonb_build_object('productId', p.product_id, 'kind', p.kind,
          'initiated', p.initiated, 'purchased', p.purchased, 'purchasers', p.purchasers,
          'cancelled', p.cancelled, 'failed', p.failed) order by p.purchased desc, p.initiated desc, p.product_id)
        from (select s.product_id, min(s.kind) as kind,
            count(*) filter (where s.type = 'purchase_initiated') as initiated,
            count(*) filter (where s.type = 'iap_purchase') as purchased,
            count(distinct s.install_id) filter (where s.type = 'iap_purchase') as purchasers,
            count(*) filter (where s.type = 'purchase_cancelled') as cancelled,
            count(*) filter (where s.type = 'purchase_failed') as failed
          from store s where s.type <> 'store_opened' group by s.product_id
          order by 4 desc, 3 desc, 1 limit 20) p), '[]'::jsonb)
    )
  ) into result;
  return result;
end;
$$;

-- Supabase's default privileges grant new functions to PUBLIC, anon,
-- authenticated and service_role; take every one of them back.
revoke all on function public.dashboard_live(text, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.dashboard_cohorts(text, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.dashboard_progress(timestamptz) from public, anon, authenticated, service_role;
grant execute on function public.dashboard_live(text, timestamptz) to dashboard_reader;
grant execute on function public.dashboard_cohorts(text, timestamptz) to dashboard_reader;
grant execute on function public.dashboard_progress(timestamptz) to dashboard_reader;
commit;
