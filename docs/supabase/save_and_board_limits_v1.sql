-- Save-creation budgets and a tighter Daily entrant check (BO-3 and BO-7 in
-- LAUNCH_READINESS_REVIEW_2026-09-22.md). Apply as postgres AFTER
-- rate_limits_v1.sql: it reuses rate_limit_take() and request_client_key() and
-- replaces three functions IN PLACE with their exact existing signatures, so no
-- overload is ever created (an extra overload is what makes PostgREST answer
-- 300 "ambiguous"; see the bump_words_offered warning in rate_limits_v1.sql).
-- Transactional and rerunnable. Never re-run security_setup.sql afterwards.
--
-- 1. upsert_save_v2: a budget on the CREATE path only (a call whose owner has
--    no row yet). Updates to an existing row overwrite it in place and cannot
--    grow the disk, so they are untouched. Without this, anyone with the public
--    key could mint ws2_ owners and park 1 MB rows under each until the shared
--    disk filled and every player's backup stopped. Budgets per one-hour window:
--      save_create_install  20 new owners per install id (when supplied). A
--                           real device mints one owner per install and at
--                           most a handful more through Reset All and
--                           recovery-code flows.
--      save_create_addr     300 new owners per client address. Mobile carriers
--                           put many subscribers behind one NAT address; 300
--                           fresh installs an hour from ONE address is far
--                           above a launch-day rate for this game.
--      save_create_kb       120,000 KB (~120 MB) of new-row payload per client
--                           address, charged by payload size, so a flood of
--                           1 MB rows meets this long before the call budget.
--      save_create_shared   5,000 new owners per hour across ALL callers when
--                           the request carries no address header (local
--                           rehearsal, an unexpected gateway change), the same
--                           fallback shape bump_words_offered uses.
--    A refused create returns {"status":"unavailable"}, which the client
--    already treats as a failed upload and retries at the next launch/victory.
--    Pair this with Supabase disk/usage alerts; a budget is not an alert.
--
--    It also records the support link on a CONFLICT response. The caller has
--    proved it holds the owner capability (the row exists and p_owner matched
--    it), exactly as on a successful save; a second device stuck on an
--    unresolved conflict would otherwise never be linked, and the Daily entrant
--    check below now relies on that link.
--
-- 2. daily_owner_has_activity: an install id is a known Daily entrant only if
--    a cloud backup has linked it (support_install_links, written by every
--    create/update/conflict of upsert_save_v2 carrying the install id), or it
--    is itself a legacy save owner (pre-ws2 builds used the install id as the
--    owner). A bare events row no longer counts: ingest_events_v2 is anonymous
--    and accepts any id, so the events clause let a random string become an
--    entrant after a single telemetry call.
--    Why this does not lock out legitimate players: the shipped client uploads
--    its save automatically, with no opt-in, at every launch and after every
--    victory whenever Supabase is configured (App.tsx uploadToCloud calls;
--    cloudSave.uploadCurrentSave). The Daily unlocks at 8 solved puzzles, so a
--    device reaching its first Daily has attempted at least nine uploads over
--    the same network it would submit a score through. A device whose uploads
--    all failed simply gets no rank that day (the client already treats an
--    empty result as "no standing shown") and is ranked the day after its next
--    successful upload. Players on builds before save_integrity_v2 cannot
--    submit to the v2 leaderboard anyway.
--
-- 3. daily_time_floor_ms: raised from max(3,000, 1,500 ms per row) to
--    max(5,000, 2,000 ms per row): 8,000 ms on the four-row days and 10,000 ms
--    on the five-row days. A four-row board is three moves of two taps each,
--    so the floor still allows ~2.7 s per move including reading the board.
--    UPDATE THIS WHENEVER getDailyRamp (dailyChallenge.ts) CHANGES ROW COUNTS.
begin;

create or replace function public.upsert_save_v2(
  p_owner text, p_version integer, p_timestamp bigint, p_device_id text,
  p_payload text, p_expected_revision bigint default null, p_force boolean default false,
  p_support_id text default null, p_install_id text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare current_revision bigint; client_key text; payload_kb integer;
begin
  if p_owner is null or p_owner !~ '^ws2_[a-f0-9]{32}$'
     or p_version is distinct from 1 or p_timestamp is null or p_timestamp < 0
     or p_payload is null or octet_length(p_payload) > 1048576
     or jsonb_typeof(p_payload::jsonb) is distinct from 'object' then
    return jsonb_build_object('status', 'unavailable');
  end if;

  -- Creation budget. Concurrent first uploads for one owner may both spend a
  -- token; only one of them creates the row. That over-charge is harmless.
  if not exists(select 1 from public.saves s where s.owner = p_owner) then
    if p_install_id is not null and length(p_install_id) between 8 and 128
       and not public.rate_limit_take('save_create_install', p_install_id, 20) then
      return jsonb_build_object('status', 'unavailable');
    end if;
    client_key := public.request_client_key();
    if client_key is null then
      if not public.rate_limit_take('save_create_shared', 'shared', 5000) then
        return jsonb_build_object('status', 'unavailable');
      end if;
    else
      payload_kb := greatest(1, ceil(octet_length(p_payload) / 1024.0)::integer);
      if not public.rate_limit_take('save_create_addr', client_key, 300)
         or not public.rate_limit_take('save_create_kb', client_key, 120000, payload_kb) then
        return jsonb_build_object('status', 'unavailable');
      end if;
    end if;
  end if;

  -- Creation and subsequent compare-and-swap happen under the row lock. A
  -- second device cannot pass a stale probe then overwrite an intervening save.
  insert into public.saves(owner, version, "timestamp", device_id, payload, revision)
  values(p_owner, p_version, p_timestamp, left(coalesce(p_device_id, ''), 64), p_payload, 1)
  on conflict (owner) do nothing
  returning revision into current_revision;
  if found then
    if p_support_id ~ '^wss_[a-f0-9]{32}$' and length(p_install_id) between 8 and 128 then
      insert into public.support_install_links(owner, support_id, install_id)
      values(p_owner, p_support_id, p_install_id) on conflict(owner, install_id) do update
      set support_id = excluded.support_id;
    end if;
    return jsonb_build_object('status', 'saved', 'revision', current_revision);
  end if;

  select s.revision into current_revision from public.saves s where s.owner = p_owner for update;
  if p_support_id ~ '^wss_[a-f0-9]{32}$' and length(p_install_id) between 8 and 128 then
    insert into public.support_install_links(owner, support_id, install_id)
    values(p_owner, p_support_id, p_install_id) on conflict(owner, install_id) do update
    set support_id = excluded.support_id;
  end if;
  if not coalesce(p_force, false) and p_expected_revision is distinct from current_revision then
    return jsonb_build_object('status', 'conflict', 'revision', current_revision);
  end if;
  update public.saves set version = p_version, "timestamp" = p_timestamp,
    device_id = left(coalesce(p_device_id, ''), 64), payload = p_payload,
    revision = current_revision + 1, updated_at = now()
  where owner = p_owner;
  return jsonb_build_object('status', 'saved', 'revision', current_revision + 1);
exception when invalid_text_representation then
  return jsonb_build_object('status', 'unavailable');
end;
$$;
revoke all on function public.upsert_save_v2(text, integer, bigint, text, text, bigint, boolean, text, text) from public, anon, authenticated;
grant execute on function public.upsert_save_v2(text, integer, bigint, text, text, bigint, boolean, text, text) to anon;

create or replace function public.daily_owner_has_activity(p_owner text) returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select exists(select 1 from public.support_install_links l where l.install_id = p_owner)
      or exists(select 1 from public.saves s where s.owner = p_owner);
$$;
revoke all on function public.daily_owner_has_activity(text) from public, anon, authenticated;

create or replace function public.daily_time_floor_ms(p_date text) returns integer
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare rows_on_board integer;
begin
  -- Mirrors getDailyRamp (dailyChallenge.ts): 0=Sun .. 6=Sat.
  rows_on_board := case extract(dow from p_date::date)::int
    when 1 then 4 when 2 then 4 when 5 then 4 else 5 end;
  return greatest(5000, 2000 * rows_on_board);
exception when datetime_field_overflow or invalid_datetime_format then
  return null;
end;
$$;
revoke all on function public.daily_time_floor_ms(text) from public, anon, authenticated;
commit;
notify pgrst, 'reload schema';
