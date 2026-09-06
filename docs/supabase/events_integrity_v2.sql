-- New events have stable IDs. Preserve legacy rows, deduplicate retries, and
-- retain the existing no-read boundary: ON CONFLICT needs SELECT internally,
-- so the new client uses this bounded definer RPC instead of table upserts.
begin;
alter table public.events add column if not exists event_id text;
create unique index if not exists events_install_event_id_unique on public.events(install_id, event_id);
create or replace function public.ingest_events_v2(
  p_install_id text, p_platform text, p_app_version text, p_events jsonb
) returns boolean
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare event jsonb;
begin
  if p_install_id is null or length(p_install_id) not between 8 and 128
     or p_events is null or jsonb_typeof(p_events) is distinct from 'array'
     or jsonb_array_length(p_events)>500 or octet_length(p_events::text)>1048576 then return false; end if;
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
commit;
notify pgrst, 'reload schema';
