-- Apply after events_integrity_v2.sql as postgres. Installs a bounded operator
-- routine only. Schedule explicitly through schedule_event_retention.sql.
begin;
-- Event timestamps come from devices. Use server receipt time for retention,
-- so a wrong/future device clock cannot retain an event indefinitely.
alter table public.events add column if not exists received_at timestamptz;
update public.events set received_at = least(coalesce(created_at, now()), now())
where received_at is null;
alter table public.events alter column received_at set default now();
alter table public.events alter column received_at set not null;
-- Older clients still POST telemetry directly. Preserve those original
-- columns, including retry IDs, while making receipt time server-owned.
-- A table-wide INSERT grant would also permit spoofing future received_at.
revoke insert on public.events from public, anon, authenticated;
revoke insert (received_at) on public.events from public, anon, authenticated;
grant insert (install_id, event_id, platform, app_version, type, data, created_at)
  on public.events to anon;
create index if not exists events_retention_received_at_idx on public.events(received_at);
create or replace function public.prune_expired_events(p_batch_size integer default 10000)
returns integer language plpgsql volatile security definer
set search_path = public, pg_temp
as $$
declare removed integer;
begin
  if p_batch_size is null or p_batch_size < 1 or p_batch_size > 10000 then
    raise exception 'batch size must be between 1 and 10000' using errcode = '22023';
  end if;
  with expired as (
    select id from public.events
    where received_at < now() - interval '24 months'
    order by received_at, id limit p_batch_size for update skip locked
  ) delete from public.events e using expired where e.id = expired.id;
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.prune_expired_events(integer) from public, anon, authenticated;
grant execute on function public.prune_expired_events(integer) to service_role;
commit;
