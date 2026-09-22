-- Raw-event retention 24 months -> 180 days, with a permanent daily rollup
-- (BO-4 in LAUNCH_READINESS_REVIEW_2026-09-22.md). Apply as postgres AFTER
-- event_retention.sql and analytics_views_v1.sql. Transactional and rerunnable.
--
-- It replaces prune_expired_events(integer) IN PLACE (same signature, same
-- service_role grant), so the existing pg_cron job 'wordshift-event-retention'
-- ('17 * * * *', select public.prune_expired_events(10000)) picks up the new
-- behaviour on its next run with no re-scheduling. Each run now:
--   1. rolls up at most 31 complete UTC days that have not been rolled up yet
--      into analytics_daily_event_rollup (day, app_version, event type, event
--      count, distinct installs) plus one '__any__' row per day and build with
--      the day's distinct active installs;
--   2. deletes at most p_batch_size raw events received more than 180 days ago,
--      but NEVER a row from a day that has not been rolled up yet, so a cold
--      start over a long backlog rolls up first and prunes afterwards;
--   3. before deleting, records each pruned install's first-seen moment in
--      analytics_install_first_seen, so analytics_install_cohorts keeps
--      long-lived installs in their true cohort.
-- Days are UTC days of server receipt time (received_at). received_at is
-- server-owned (event_retention.sql), so a completed day never gains rows
-- later and each day is rolled up once. Support deletions after a rollup do not
-- rewrite it: the rollup holds counts only, no install ids.
--
-- The first run after applying this over a large 24-month table rolls up 31
-- days per hour and prunes 10,000 rows per hour; to catch up faster, call
-- select public.prune_expired_events(10000); repeatedly as postgres.
begin;

create table if not exists public.analytics_install_first_seen (
  install_id text primary key,
  first_seen_at timestamptz not null,
  first_app_version text,
  first_platform text
);
alter table public.analytics_install_first_seen enable row level security;
revoke all on public.analytics_install_first_seen from public, anon, authenticated;
grant select on public.analytics_install_first_seen to service_role;

create table if not exists public.analytics_daily_event_rollup (
  day date not null,
  app_version text not null,           -- '' when the event carried none
  type text not null,                  -- '__any__' = all types for that day/build
  events bigint not null,
  installs bigint not null,
  rolled_at timestamptz not null default now(),
  primary key (day, app_version, type)
);
alter table public.analytics_daily_event_rollup enable row level security;
revoke all on public.analytics_daily_event_rollup from public, anon, authenticated;
grant select on public.analytics_daily_event_rollup to service_role;

create table if not exists public.analytics_rollup_state (
  id smallint primary key check (id = 1),
  last_rolled_day date not null,
  updated_at timestamptz not null default now()
);
alter table public.analytics_rollup_state enable row level security;
revoke all on public.analytics_rollup_state from public, anon, authenticated;
grant select on public.analytics_rollup_state to service_role;

-- Roll up to p_max_days complete UTC days after the last rolled day. Returns
-- the number of days processed. Serialized by an advisory lock.
create or replace function public.rollup_event_days(p_max_days integer default 31)
returns integer language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare last_day date; target date; end_day date; rolled integer := 0;
  day_start timestamptz; day_end timestamptz;
begin
  if p_max_days is null or p_max_days < 1 or p_max_days > 366 then
    raise exception 'max days must be between 1 and 366' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext('wordshift_event_rollup'));
  select s.last_rolled_day into last_day from public.analytics_rollup_state s where s.id = 1;
  if last_day is null then
    select (min(e.received_at) at time zone 'UTC')::date - 1 into last_day from public.events e;
    if last_day is null then return 0; end if;
  end if;
  end_day := (now() at time zone 'UTC')::date - 1;
  target := last_day + 1;
  while target <= end_day and rolled < p_max_days loop
    day_start := target::timestamp at time zone 'UTC';
    day_end := (target + 1)::timestamp at time zone 'UTC';
    insert into public.analytics_daily_event_rollup as r (day, app_version, type, events, installs)
    select target, coalesce(e.app_version, ''), e.type, count(*), count(distinct e.install_id)
    from public.events e
    where e.received_at >= day_start and e.received_at < day_end
    group by coalesce(e.app_version, ''), e.type
    on conflict (day, app_version, type) do update
      set events = excluded.events, installs = excluded.installs, rolled_at = now();
    insert into public.analytics_daily_event_rollup as r (day, app_version, type, events, installs)
    select target, coalesce(e.app_version, ''), '__any__', count(*), count(distinct e.install_id)
    from public.events e
    where e.received_at >= day_start and e.received_at < day_end
    group by coalesce(e.app_version, '')
    on conflict (day, app_version, type) do update
      set events = excluded.events, installs = excluded.installs, rolled_at = now();
    insert into public.analytics_rollup_state(id, last_rolled_day) values (1, target)
    on conflict (id) do update set last_rolled_day = excluded.last_rolled_day, updated_at = now();
    target := target + 1;
    rolled := rolled + 1;
  end loop;
  return rolled;
end;
$$;
revoke all on function public.rollup_event_days(integer) from public, anon, authenticated;
grant execute on function public.rollup_event_days(integer) to service_role;

create or replace function public.prune_expired_events(p_batch_size integer default 10000)
returns integer language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare removed integer; rolled_through date; cutoff timestamptz;
begin
  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 10000 then
    raise exception 'batch size must be between 1 and 10000' using errcode = '22023';
  end if;
  perform public.rollup_event_days(31);
  select s.last_rolled_day into rolled_through from public.analytics_rollup_state s where s.id = 1;
  if rolled_through is null then return 0; end if;
  cutoff := least(now() - interval '180 days', (rolled_through + 1)::timestamp at time zone 'UTC');
  with expired as (
    select e.id, e.install_id, e.received_at, e.app_version, e.platform
    from public.events e
    where e.received_at < cutoff
    order by e.received_at, e.id limit p_batch_size for update skip locked
  ), firsts as (
    select distinct on (x.install_id) x.install_id, x.received_at, x.app_version, x.platform
    from expired x order by x.install_id, x.received_at, x.id
  ), kept as (
    insert into public.analytics_install_first_seen as f
      (install_id, first_seen_at, first_app_version, first_platform)
    select install_id, received_at, app_version, platform from firsts
    on conflict (install_id) do update
      set first_seen_at = excluded.first_seen_at,
          first_app_version = excluded.first_app_version,
          first_platform = excluded.first_platform
      where excluded.first_seen_at < f.first_seen_at
    returning 1
  ) delete from public.events e using expired where e.id = expired.id;
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.prune_expired_events(integer) from public, anon, authenticated;
grant execute on function public.prune_expired_events(integer) to service_role;
commit;
