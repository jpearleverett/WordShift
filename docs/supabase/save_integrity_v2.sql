-- Apply as postgres AFTER security_setup.sql. Review/rehearse on a disposable
-- project first. This migration preserves every existing row and refuses the
-- legacy weak-capability read/write surface. Older clients keep local gameplay
-- but need the corresponding app update for cloud backup.
begin;

alter table public.saves add column if not exists revision bigint not null default 1;

-- Support lookup is separate from the bearer credential. This table is private;
-- a support ID alone grants no read/delete RPC and proves no ownership.
create table if not exists public.support_install_links (
  owner text not null references public.saves(owner) on delete cascade,
  support_id text not null,
  install_id text not null,
  linked_at timestamptz not null default now(),
  primary key(owner, install_id)
);
alter table public.support_install_links enable row level security;
revoke all on public.support_install_links from public, anon, authenticated;
create index if not exists support_install_links_support_idx on public.support_install_links(support_id);

create or replace function public.get_save_v2(p_owner text)
returns table (version integer, "timestamp" bigint, device_id text, payload text, revision bigint)
language sql stable security definer set search_path = public, pg_temp
as $$
  select s.version, s."timestamp", s.device_id, s.payload, s.revision
  from public.saves s
  where s.owner = p_owner and p_owner ~ '^ws2_[a-f0-9]{32}$';
$$;

create or replace function public.upsert_save_v2(
  p_owner text, p_version integer, p_timestamp bigint, p_device_id text,
  p_payload text, p_expected_revision bigint default null, p_force boolean default false,
  p_support_id text default null, p_install_id text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare current_revision bigint;
begin
  if p_owner is null or p_owner !~ '^ws2_[a-f0-9]{32}$'
     or p_version is distinct from 1 or p_timestamp is null or p_timestamp < 0
     or p_payload is null or octet_length(p_payload) > 1048576
     or jsonb_typeof(p_payload::jsonb) is distinct from 'object' then
    return jsonb_build_object('status', 'unavailable');
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
  if not coalesce(p_force, false) and p_expected_revision is distinct from current_revision then
    return jsonb_build_object('status', 'conflict', 'revision', current_revision);
  end if;
  update public.saves set version = p_version, "timestamp" = p_timestamp,
    device_id = left(coalesce(p_device_id, ''), 64), payload = p_payload,
    revision = current_revision + 1, updated_at = now()
  where owner = p_owner;
  if p_support_id ~ '^wss_[a-f0-9]{32}$' and length(p_install_id) between 8 and 128 then
    insert into public.support_install_links(owner, support_id, install_id)
    values(p_owner, p_support_id, p_install_id) on conflict(owner, install_id) do update
    set support_id = excluded.support_id;
  end if;
  return jsonb_build_object('status', 'saved', 'revision', current_revision + 1);
exception when invalid_text_representation then
  return jsonb_build_object('status', 'unavailable');
end;
$$;

-- A full pre-upgrade UUID still has its original random capability. Only an
-- original device retaining that full value may import this row. Short codes
-- and timestamp-based IDs are deliberately excluded; never guess their owner.
create or replace function public.get_legacy_save_for_upgrade(p_owner text)
returns table (version integer, "timestamp" bigint, device_id text, payload text)
language sql stable security definer set search_path = public, pg_temp
as $$
  select s.version, s."timestamp", s.device_id, s.payload from public.saves s
  where s.owner = p_owner and p_owner ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
$$;

revoke all on function public.get_save(text) from public, anon, authenticated;
revoke all on function public.get_save_timestamp(text) from public, anon, authenticated;
revoke all on function public.upsert_save(text, integer, bigint, text, text) from public, anon, authenticated;
revoke all on function public.get_save_v2(text) from public, anon, authenticated;
revoke all on function public.upsert_save_v2(text, integer, bigint, text, text, bigint, boolean, text, text) from public, anon, authenticated;
revoke all on function public.get_legacy_save_for_upgrade(text) from public, anon, authenticated;
grant execute on function public.get_save_v2(text) to anon;
grant execute on function public.upsert_save_v2(text, integer, bigint, text, text, bigint, boolean, text, text) to anon;
grant execute on function public.get_legacy_save_for_upgrade(text) to anon;
commit;
