-- ============================================================================
-- WordShift Supabase security setup — capability-URL model.
--
-- IDEMPOTENT: safe to run repeatedly, on a fresh project or over the legacy
-- schema from an earlier BACKEND_SETUP.md (it drops the old wide-open
-- policies). Run the whole file in the Supabase SQL editor as `postgres`
-- (the editor's default), so the SECURITY DEFINER functions below are owned
-- by postgres and bypass RLS internally.
--
-- Trust model: there is no user auth. A player's identity is an unguessable
-- random owner id (UUIDv4 install id, or an 8-char recovery code the player
-- chose to reveal). Knowing an owner id IS the capability to read/write that
-- one player's rows. Therefore:
--   * anon gets ZERO direct table access (RLS enabled + grants revoked),
--     so the anon key alone can neither enumerate nor dump anything;
--   * every operation the client needs is a SECURITY DEFINER function that
--     requires the caller to present the row's owner id and returns only
--     that owner's data (or pure aggregates);
--   * the telemetry `events` table is the single exception: INSERT-only for
--     anon, never readable.
-- NOTE: owner ids are TEXT, not UUID — the recovery-code flow stores an
-- 8-char Crockford body as the owner, so a uuid column/param would break it.
-- ============================================================================

-- ============================================================
-- 0. TABLES (create-if-missing so this file provisions a fresh project too)
-- ============================================================

-- Cloud save: one row per owner capability.
create table if not exists public.saves (
  owner      text primary key,
  version    integer     not null default 1,
  timestamp  bigint      not null,
  device_id  text        not null default '',
  payload    text        not null,           -- JSON-stringified save blob
  updated_at timestamptz not null default now()
);

-- Analytics sink (write-only from the client).
create table if not exists public.events (
  id          bigint generated always as identity primary key,
  install_id  text        not null,
  platform    text,
  app_version text,
  type        text        not null,
  data        jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists events_install_id_idx on public.events (install_id);
create index if not exists events_created_at_idx on public.events (created_at);

-- Daily challenge leaderboard: one row per (owner, date).
create table if not exists public.daily_scores (
  owner      text        not null,
  date       text        not null,           -- local-day 'YYYY-MM-DD'
  time_ms    integer     not null check (time_ms >= 0),
  stars      smallint    not null check (stars between 0 and 3),
  hints      smallint    not null check (hints >= 0),
  handle     text,
  created_at timestamptz not null default now(),
  primary key (owner, date)                  -- upsert conflict target
);
create index if not exists daily_scores_date_order_idx
  on public.daily_scores (date, time_ms asc, stars desc, hints asc);

-- Aggregate social proof: one global counters row per local day.
create table if not exists public.daily_counters (
  date           text    primary key,
  words_offered  bigint  not null default 0,
  active_seekers integer not null default 0
);

-- ============================================================
-- 1. LOCK DOWN: RLS on, legacy wide-open policies off, grants revoked
-- ============================================================

-- Enable RLS everywhere (no policies for anon = deny-by-default).
alter table public.saves          enable row level security;
alter table public.events         enable row level security;
alter table public.daily_scores   enable row level security;
alter table public.daily_counters enable row level security;

-- Drop the legacy permissive policies from the original setup (if present).
drop policy if exists "anon read/write saves"   on public.saves;
drop policy if exists "anon rw daily_scores"    on public.daily_scores;
drop policy if exists "anon rw daily_counters"  on public.daily_counters;
drop policy if exists "anon insert events"      on public.events;

-- Belt and braces: revoke the direct table privileges Supabase grants by
-- default, so even a future permissive policy cannot re-open access.
-- (service_role keeps its own grants and bypasses RLS — dashboards still work.)
revoke all on table public.saves          from anon, authenticated;
revoke all on table public.events         from anon, authenticated;
revoke all on table public.daily_scores   from anon, authenticated;
revoke all on table public.daily_counters from anon, authenticated;

-- The ONE allowed direct operation: anonymous telemetry inserts. No select —
-- clients must POST with `Prefer: return=minimal`.
grant insert on table public.events to anon;
create policy "anon insert events" on public.events
  for insert to anon with check (true);

-- ============================================================
-- 2. RPC SURFACE (SECURITY DEFINER, owned by postgres, EXECUTE -> anon)
--    Every function pins search_path so a malicious temp schema can't
--    shadow the tables it touches.
-- ============================================================

-- ------------------------------------------------------------
-- Cloud save: read the caller's row (presenting the owner id IS the check).
create or replace function public.get_save(p_owner text)
returns table (version integer, "timestamp" bigint, device_id text, payload text)
language sql stable
security definer set search_path = public, pg_temp
as $$
  select s.version, s."timestamp", s.device_id, s.payload
  from public.saves s
  where s.owner = p_owner
    -- reject degenerate capabilities (shortest legit owner: 8-char recovery body)
    and length(p_owner) between 8 and 64;
$$;

-- Cloud save: lightweight newer-save probe (timestamp only).
create or replace function public.get_save_timestamp(p_owner text)
returns bigint
language sql stable
security definer set search_path = public, pg_temp
as $$
  select s."timestamp"
  from public.saves s
  where s.owner = p_owner
    and length(p_owner) between 8 and 64;
$$;

-- Cloud save: upsert ONLY the caller's row. Returns true when stored,
-- false when the input fails sanity bounds.
create or replace function public.upsert_save(
  p_owner     text,
  p_version   integer,
  p_timestamp bigint,
  p_device_id text,
  p_payload   text
) returns boolean
language plpgsql volatile
security definer set search_path = public, pg_temp
as $$
begin
  -- Capability + sanity bounds: reject junk owners, absurd payloads/clock.
  if p_owner is null or length(p_owner) not between 8 and 64 then return false; end if;
  if p_payload is null or length(p_payload) > 1048576 then return false; end if;  -- 1 MB cap
  if p_timestamp is null or p_timestamp < 0 then return false; end if;

  insert into public.saves as s (owner, version, "timestamp", device_id, payload, updated_at)
  values (
    p_owner,
    coalesce(p_version, 1),
    p_timestamp,
    left(coalesce(p_device_id, ''), 64),
    p_payload,
    now()
  )
  on conflict (owner) do update
    set version     = excluded.version,
        "timestamp" = excluded."timestamp",
        device_id   = excluded.device_id,
        payload     = excluded.payload,
        updated_at  = now();
  return true;
end;
$$;

-- ------------------------------------------------------------
-- Leaderboard: upsert ONLY the caller's (owner, date) row, with hard bounds
-- so a poisoned client can't submit absurd scores. Rejections return no row.
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
  if p_owner is null or length(p_owner) not between 8 and 64 then return; end if;
  if p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$' then return; end if;
  -- Bounds: a daily can't take more than 24h; stars 0-3; hints 0-50.
  if p_time_ms is null or p_time_ms < 0 or p_time_ms > 86400000 then return; end if;
  if p_stars is null or p_stars < 0 or p_stars > 3 then return; end if;
  if p_hints is null or p_hints < 0 or p_hints > 50 then return; end if;

  return query
  insert into public.daily_scores as ds (owner, date, time_ms, stars, hints, handle, created_at)
  values (
    p_owner, p_date, p_time_ms, p_stars::smallint, p_hints::smallint,
    left(p_handle, 24), now()
  )
  on conflict (owner, date) do update
    set time_ms    = excluded.time_ms,
        stars      = excluded.stars,
        hints      = excluded.hints,
        handle     = excluded.handle,
        created_at = now()
  returning ds.owner, ds.date, ds.time_ms, ds.stars, ds.hints, ds.handle;
end;
$$;

-- Leaderboard: aggregate-only standing for the caller. Returns rank/total/
-- percentile — never other players' ids or scores. Empty when the caller has
-- no row that day. (Replaces the legacy invoker-rights daily_rank in place.)
-- rank: lower time wins; ties -> more stars, then fewer hints.
-- percentile = % of OTHER players beaten (0-100).
create or replace function public.daily_rank(p_date text, p_owner text)
returns table (rank integer, total integer, percentile integer)
language sql stable
security definer set search_path = public, pg_temp
as $$
  with day as (
    select d.owner, d.time_ms, d.stars, d.hints
    from public.daily_scores d where d.date = p_date
  ),
  me as (select * from day where day.owner = p_owner),
  agg as (
    select
      (1 + count(*) filter (
        where d.owner <> p_owner and (
          d.time_ms < me.time_ms
          or (d.time_ms = me.time_ms and d.stars > me.stars)
          or (d.time_ms = me.time_ms and d.stars = me.stars and d.hints < me.hints)
        )
      ))::int as rnk,
      (select count(*) from day)::int as tot
    from day d, me
    group by me.time_ms, me.stars, me.hints
    limit 1
  )
  select rnk, tot,
    case when tot <= 1 then 0
         else round(((tot - rnk)::numeric / (tot - 1)) * 100)::int end
  from agg;
$$;

-- ------------------------------------------------------------
-- Social proof: atomic global counter bump, bounded per call so one request
-- can't warp the aggregate (a single puzzle offers at most a handful of words).
create or replace function public.bump_words_offered(p_date text, p_count integer)
returns bigint
language plpgsql volatile
security definer set search_path = public, pg_temp
as $$
declare new_total bigint;
begin
  if p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  if p_count is null or p_count < 1 or p_count > 100 then return null; end if;

  insert into public.daily_counters as c (date, words_offered)
  values (p_date, p_count)
  on conflict (date) do update
    set words_offered = c.words_offered + p_count
  returning c.words_offered into new_total;
  return new_total;
end;
$$;

-- Social proof: aggregate-only read (two global numbers, nothing per-player).
create or replace function public.aggregate_proof(p_date text)
returns table ("wordsOfferedToday" bigint, "activeSeekers" integer)
language sql stable
security definer set search_path = public, pg_temp
as $$
  select coalesce(c.words_offered, 0), coalesce(c.active_seekers, 0)
  from public.daily_counters c where c.date = p_date;
$$;

-- ============================================================
-- 3. FUNCTION GRANTS — executable by anon only (plus postgres/service_role)
-- ============================================================

revoke all on function public.get_save(text)                                            from public;
revoke all on function public.get_save_timestamp(text)                                  from public;
revoke all on function public.upsert_save(text, integer, bigint, text, text)            from public;
revoke all on function public.submit_daily_score(text, text, integer, integer, integer, text) from public;
revoke all on function public.daily_rank(text, text)                                    from public;
revoke all on function public.bump_words_offered(text, integer)                         from public;
revoke all on function public.aggregate_proof(text)                                     from public;

grant execute on function public.get_save(text)                                            to anon;
grant execute on function public.get_save_timestamp(text)                                  to anon;
grant execute on function public.upsert_save(text, integer, bigint, text, text)            to anon;
grant execute on function public.submit_daily_score(text, text, integer, integer, integer, text) to anon;
grant execute on function public.daily_rank(text, text)                                    to anon;
grant execute on function public.bump_words_offered(text, integer)                         to anon;
grant execute on function public.aggregate_proof(text)                                     to anon;

-- Ask PostgREST to pick up the new/changed functions immediately (harmless
-- if the listener is absent; Supabase also reloads on a schedule).
notify pgrst, 'reload schema';
