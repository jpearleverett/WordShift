-- Request limits, daily-score plausibility and a cohort purge for the anonymous
-- RPC surface. Apply as postgres AFTER event_retention.sql (apply_upgrade.sql
-- includes it in order). Transactional and rerunnable. Never re-run the base
-- security_setup.sql afterwards: it would recreate the two-argument
-- bump_words_offered beside the three-argument one below and re-grant the
-- legacy daily RPCs.
--
-- Every budget is a fixed one-hour window per key and sits far above what the
-- shipped client can produce, so a real device never meets a limit:
--   ingest_events_v2    client: at most one upload per minute (telemetry.ts
--                       SYNC_THROTTLE_MS) carrying at most the 500 events the
--                       local queue retains (eventLogger.ts MAX_EVENTS).
--                       Budget: 240 calls and 6,000 event rows per install per
--                       hour, plus 30,000 calls per client address when the API
--                       gateway supplies one. The row budget is enforced by a
--                       BEFORE INSERT trigger, so the column-scoped legacy
--                       INSERT grant that older clients still use is bounded by
--                       the same per-install counter as the RPC.
--   bump_words_offered  client: once per victory with the board's word count
--                       (at most 7 rows on any shipped board). Budget: a per-call
--                       cap of 20 words and 600 calls per hour per install id,
--                       falling back to the client address, then to one shared
--                       bucket of 60,000 calls per hour. The optional third
--                       parameter defaults to null so the current client's
--                       two-argument call keeps working unchanged.
--   submit_daily_score  client: once per Daily Challenge victory (replays are
--                       refused client-side). Budget: 30 submissions per owner
--                       per hour and 2,400 per client address per hour.
-- The client address comes from the PostgREST request headers; when no
-- address header is present (local rehearsal, an unexpected gateway change)
-- the address-scoped budgets are skipped rather than pooling everyone.
-- Address budgets are deliberately an order of magnitude above the per-install
-- ones: mobile carriers put thousands of subscribers behind one carrier-grade
-- NAT address, so an address cap only exists to stop id-minting floods and
-- must never be low enough to refuse a busy launch day's legitimate players.
-- Do not lower these without that arithmetic.
--
-- Plausibility for submit_daily_score_v2 (and the legacy submit_daily_score it
-- still dispatches to for the legacy_v1 cohort):
--   * time_ms must be at least 3,000 and at least 1,500 ms per row of that
--     date's Daily ramp (getDailyRamp in dailyChallenge.ts: Mon/Tue/Fri four
--     rows, Wed/Thu/Sat/Sun five rows). The eased first-ever daily is never
--     submitted, so the weekday ramp is the true board for every entrant.
--     UPDATE daily_time_floor_ms WHENEVER getDailyRamp CHANGES ROW COUNTS.
--   * stars/hints outside 0..3 / 0..50 are refused (unchanged), and so are the
--     combinations starRating.ts cannot produce: 3 stars with any hint, or
--     2 stars with more than one hint.
--   * the owner must already be known to the project: a support_install_links
--     row for that install id (written by every successful v2 backup), an
--     events row for that install id (written by every telemetry upload), or a
--     saves row under that owner. A random string can no longer become an
--     entrant. A device whose first upload has not landed yet simply gets no
--     rank for that day; the client already treats an empty result as "no
--     standing shown".
-- The legacy daily RPCs (submit_daily_score, daily_rank) lose their anon
-- grants: the v2 functions still reach them internally for legacy_v1 rows, but
-- an anonymous caller can no longer bypass the v2 checks through the old
-- names. Clients older than 2026-09-05 degrade to "no rank shown" (null).
--
-- Operators (service_role only):
--   select public.purge_daily_cohort('2026-09-14', 'daily_v2_<hash>');
--     removes one poisoned day's cohort (legacy_v1 targets daily_scores).
--   delete from public.rate_limits where window_start < now() - interval '1 day';
--     optional housekeeping; the table holds one row per (scope, key).
begin;

create table if not exists public.rate_limits (
  scope text not null,
  key text not null,
  window_start timestamptz not null default now(),
  count integer not null default 0,
  primary key(scope, key)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from public, anon, authenticated;

-- Fixed one-hour window. Returns true while the key stays within p_limit.
-- Callers are the definer RPCs below (owner-executed); anon never calls it.
create or replace function public.rate_limit_take(
  p_scope text, p_key text, p_limit integer, p_cost integer default 1
) returns boolean
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare used integer;
begin
  if p_scope is null or p_key is null or p_limit is null or p_cost is null or p_cost < 1 then
    return false;
  end if;
  insert into public.rate_limits as r(scope, key, window_start, count)
  values(p_scope, left(p_key, 160), now(), p_cost)
  on conflict(scope, key) do update set
    window_start = case when r.window_start < now() - interval '1 hour' then now() else r.window_start end,
    count = case when r.window_start < now() - interval '1 hour' then excluded.count else r.count + excluded.count end
  returning r.count into used;
  return used <= p_limit;
end;
$$;
revoke all on function public.rate_limit_take(text,text,integer,integer) from public, anon, authenticated;

-- The caller's network address as PostgREST forwards it, or null when the
-- request carries no address header (local rehearsal, direct SQL sessions).
create or replace function public.request_client_key() returns text
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare headers jsonb; ip text;
begin
  begin
    headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    return null;
  end;
  if headers is null then return null; end if;
  ip := coalesce(nullif(btrim(headers->>'cf-connecting-ip'), ''),
    nullif(btrim(split_part(coalesce(headers->>'x-forwarded-for', ''), ',', 1)), ''),
    nullif(btrim(headers->>'x-real-ip'), ''));
  if ip is null then return null; end if;
  return 'ip:' || left(ip, 64);
end;
$$;
revoke all on function public.request_client_key() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Telemetry: per-install row budget on the table itself (covers the RPC and
-- the legacy column-scoped INSERT alike), per-install and per-address call
-- budgets inside the RPC.
create or replace function public.events_rate_limit_trigger() returns trigger
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
begin
  if not public.rate_limit_take('events_rows', new.install_id, 6000) then return null; end if;
  return new;
end;
$$;
revoke all on function public.events_rate_limit_trigger() from public, anon, authenticated;
drop trigger if exists events_rate_limit on public.events;
create trigger events_rate_limit before insert on public.events
  for each row execute function public.events_rate_limit_trigger();

create or replace function public.ingest_events_v2(
  p_install_id text, p_platform text, p_app_version text, p_events jsonb
) returns boolean
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare event jsonb; client_key text;
begin
  if p_install_id is null or length(p_install_id) not between 8 and 128
     or p_events is null or jsonb_typeof(p_events) is distinct from 'array'
     or jsonb_array_length(p_events)>500 or octet_length(p_events::text)>1048576 then return false; end if;
  if not public.rate_limit_take('ingest_calls', p_install_id, 240) then return false; end if;
  client_key := public.request_client_key();
  if client_key is not null and not public.rate_limit_take('ingest_addr', client_key, 30000) then return false; end if;
  for event in select value from jsonb_array_elements(p_events) loop
    if event->>'id' is null or length(event->>'id') not between 1 and 128
       or event->>'type' is null or event->>'type' !~ '^[a-z_]{1,64}$'
       or jsonb_typeof(event->'timestamp') is distinct from 'number'
       or (event->>'timestamp')::numeric not between 0 and 4102444800000
       or (event ? 'data' and jsonb_typeof(event->'data') is distinct from 'object') then return false; end if;
  end loop;
  for event in select value from jsonb_array_elements(p_events) loop
    insert into public.events(install_id,event_id,platform,app_version,type,data,created_at)
    values(p_install_id,event->>'id',left(p_platform,24),left(p_app_version,64),event->>'type',
      coalesce(event->'data','{}'::jsonb),to_timestamp((event->>'timestamp')::double precision/1000))
    on conflict(install_id,event_id) do nothing;
  end loop;
  return true;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end;
$$;
revoke all on function public.ingest_events_v2(text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.ingest_events_v2(text,text,text,jsonb) to anon;

-- ---------------------------------------------------------------------------
-- Social proof: the two-argument signature is replaced by one with an optional
-- install id (PostgREST fills the default when the client omits it).
drop function if exists public.bump_words_offered(text, integer);
create or replace function public.bump_words_offered(
  p_date text, p_count integer, p_install_id text default null
) returns bigint
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare new_total bigint; bucket text; budget integer;
begin
  if p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  if p_count is null or p_count < 1 or p_count > 20 then return null; end if;
  if p_install_id is not null and length(p_install_id) between 8 and 128 then
    bucket := 'install:' || p_install_id; budget := 600;
  else
    bucket := public.request_client_key(); budget := 600;
    if bucket is null then bucket := 'shared'; budget := 60000; end if;
  end if;
  if not public.rate_limit_take('bump_words', bucket, budget) then return null; end if;

  insert into public.daily_counters as c (date, words_offered)
  values (p_date, p_count)
  on conflict (date) do update
    set words_offered = c.words_offered + p_count
  returning c.words_offered into new_total;
  return new_total;
end;
$$;
revoke all on function public.bump_words_offered(text,integer,text) from public, anon, authenticated;
grant execute on function public.bump_words_offered(text,integer,text) to anon;

-- ---------------------------------------------------------------------------
-- Daily leaderboard plausibility.
create or replace function public.daily_time_floor_ms(p_date text) returns integer
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare rows_on_board integer;
begin
  -- Mirrors getDailyRamp (dailyChallenge.ts): 0=Sun .. 6=Sat.
  rows_on_board := case extract(dow from p_date::date)::int
    when 1 then 4 when 2 then 4 when 5 then 4 else 5 end;
  return greatest(3000, 1500 * rows_on_board);
exception when datetime_field_overflow or invalid_datetime_format then
  return null;
end;
$$;
revoke all on function public.daily_time_floor_ms(text) from public, anon, authenticated;

-- daily_owner_has_activity probes support_install_links by install_id; the
-- table's primary key leads with owner, so give the probe its own index.
create index if not exists support_install_links_install_idx
  on public.support_install_links (install_id);

create or replace function public.daily_owner_has_activity(p_owner text) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists(select 1 from public.support_install_links l where l.install_id = p_owner)
      or exists(select 1 from public.events e where e.install_id = p_owner)
      or exists(select 1 from public.saves s where s.owner = p_owner);
$$;
revoke all on function public.daily_owner_has_activity(text) from public, anon, authenticated;

-- True when the submission passes bounds, plausibility, activity and budgets.
-- Consumes one owner token (and one address token) per accepted-shape call.
create or replace function public.daily_submission_allowed(
  p_owner text, p_date text, p_time_ms integer, p_stars integer, p_hints integer
) returns boolean
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare floor_ms integer; client_key text;
begin
  if p_owner is null or length(p_owner) not between 8 and 64
     or p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$'
     or p_time_ms is null or p_time_ms not between 0 and 86400000
     or p_stars is null or p_stars not between 0 and 3
     or p_hints is null or p_hints not between 0 and 50 then return false; end if;
  if (p_stars = 3 and p_hints > 0) or (p_stars = 2 and p_hints > 1) then return false; end if;
  floor_ms := public.daily_time_floor_ms(p_date);
  if floor_ms is null or p_time_ms < floor_ms then return false; end if;
  if not public.daily_owner_has_activity(p_owner) then return false; end if;
  if not public.rate_limit_take('daily_owner', p_owner, 30) then return false; end if;
  client_key := public.request_client_key();
  if client_key is not null and not public.rate_limit_take('daily_addr', client_key, 2400) then return false; end if;
  return true;
end;
$$;
revoke all on function public.daily_submission_allowed(text,text,integer,integer,integer) from public, anon, authenticated;

-- Legacy cohort writer: same gate, reached only through submit_daily_score_v2
-- (its anon grant is revoked below).
create or replace function public.submit_daily_score(
  p_owner   text,
  p_date    text,
  p_time_ms integer,
  p_stars   integer,
  p_hints   integer,
  p_handle  text default null
) returns table (owner text, date text, time_ms integer, stars smallint, hints smallint, handle text)
language plpgsql volatile
security definer set search_path = public, pg_temp
as $$
begin
  if not public.daily_submission_allowed(p_owner, p_date, p_time_ms, p_stars, p_hints) then return; end if;
  return query
  insert into public.daily_scores as ds (owner, date, time_ms, stars, hints, handle, created_at)
  values (
    p_owner, p_date, p_time_ms, p_stars::smallint, p_hints::smallint,
    left(p_handle, 24), now()
  )
  on conflict on constraint daily_scores_pkey do update
    set time_ms    = excluded.time_ms,
        stars      = excluded.stars,
        hints      = excluded.hints,
        handle     = excluded.handle,
        created_at = now()
  returning ds.owner, ds.date, ds.time_ms, ds.stars, ds.hints, ds.handle;
end;
$$;

create or replace function public.submit_daily_score_v2(
  p_owner text, p_date text, p_board_version text, p_time_ms integer,
  p_stars integer, p_hints integer, p_handle text default null
) returns table(owner text, date text, time_ms integer, stars smallint, hints smallint, handle text)
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
begin
  if p_board_version is null or p_board_version !~ '^[a-z0-9_]{1,64}$' then return; end if;
  if p_board_version = 'legacy_v1' then
    -- The legacy writer applies the shared gate itself (one token per call).
    return query select * from public.submit_daily_score(p_owner, p_date, p_time_ms, p_stars, p_hints, p_handle);
    return;
  end if;
  if not public.daily_submission_allowed(p_owner, p_date, p_time_ms, p_stars, p_hints) then return; end if;
  return query insert into public.daily_scores_v2 as ds
    (owner, date, board_version, time_ms, stars, hints, handle)
    values(p_owner, p_date, p_board_version, p_time_ms, p_stars::smallint, p_hints::smallint, left(p_handle, 24))
    on conflict on constraint daily_scores_v2_pkey do update set
      time_ms=excluded.time_ms, stars=excluded.stars, hints=excluded.hints,
      handle=excluded.handle, created_at=now()
    returning ds.owner, ds.date, ds.time_ms, ds.stars, ds.hints, ds.handle;
end;
$$;
revoke all on function public.submit_daily_score(text,text,integer,integer,integer,text) from public, anon, authenticated;
revoke all on function public.daily_rank(text,text) from public, anon, authenticated;
revoke all on function public.submit_daily_score_v2(text,text,text,integer,integer,integer,text) from public, anon, authenticated;
grant execute on function public.submit_daily_score_v2(text,text,text,integer,integer,integer,text) to anon;

-- ---------------------------------------------------------------------------
-- Operator purge for a poisoned day. Returns the number of rows removed.
create or replace function public.purge_daily_cohort(p_date text, p_board_version text)
returns integer
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare removed integer;
begin
  if p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$'
     or p_board_version is null or p_board_version !~ '^[a-z0-9_]{1,64}$' then
    raise exception 'purge_daily_cohort needs a YYYY-MM-DD date and a board version' using errcode = '22023';
  end if;
  if p_board_version = 'legacy_v1' then
    delete from public.daily_scores d where d.date = p_date;
  else
    delete from public.daily_scores_v2 d where d.date = p_date and d.board_version = p_board_version;
  end if;
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.purge_daily_cohort(text,text) from public, anon, authenticated;
grant execute on function public.purge_daily_cohort(text,text) to service_role;

-- Older clients still POST telemetry rows directly through the column-scoped
-- grant from event_retention.sql; the trigger above now bounds those rows per
-- install. Once every pre-2026-09-05 client is retired, close that path too:
-- revoke insert on public.events from anon;
commit;
notify pgrst, 'reload schema';
