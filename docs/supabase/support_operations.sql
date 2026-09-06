-- Private operator-only tooling. A lookup ID grants no authority; the operator
-- must separately verify ownership and the exact deletion scope (runbook).
-- Apply after save_integrity_v2.sql and daily_board_versions.sql.
begin;
create table if not exists public.support_deletion_audit (
  ticket text primary key,
  deleted_at timestamptz not null default now(),
  counts jsonb not null
);
alter table public.support_deletion_audit enable row level security;
revoke all on public.support_deletion_audit from public, anon, authenticated;

create or replace function public.support_preview(p_support_id text)
returns jsonb language sql stable security definer set search_path = public, pg_temp
as $$
  with owners as (select distinct l.owner from public.support_install_links l where l.support_id=p_support_id),
  installs as (select distinct l.install_id from public.support_install_links l join owners o on o.owner=l.owner)
  select jsonb_build_object(
    'saves',(select count(*) from owners), 'installs',(select count(*) from installs),
    'events',(select count(*) from public.events e join installs i on i.install_id=e.install_id),
    'dailyScores',(select count(*) from public.daily_scores d join installs i on i.install_id=d.owner),
    'versionedDailyScores',(select count(*) from public.daily_scores_v2 d join installs i on i.install_id=d.owner)
  );
$$;

create or replace function public.support_delete_verified(p_support_id text, p_verified_owner text, p_ticket text)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare installs text[]; event_count bigint; daily_count bigint; versioned_count bigint; counts jsonb;
begin
  if p_ticket is null or length(p_ticket) not between 3 and 128 then
    raise exception 'A verified support ticket is required';
  end if;
  if not exists(select 1 from public.support_install_links l where l.support_id=p_support_id and l.owner=p_verified_owner) then
    raise exception 'Verified scope does not match lookup reference';
  end if;
  perform s.owner from public.saves s where s.owner=p_verified_owner for update;
  select array_agg(distinct l.install_id) into installs from public.support_install_links l where l.owner=p_verified_owner;
  delete from public.events e where e.install_id=any(installs);
  get diagnostics event_count = row_count;
  delete from public.daily_scores d where d.owner=any(installs);
  get diagnostics daily_count = row_count;
  delete from public.daily_scores_v2 d where d.owner=any(installs);
  get diagnostics versioned_count = row_count;
  delete from public.saves s where s.owner=p_verified_owner;
  counts := jsonb_build_object('saves',1,'installs',cardinality(installs),'events',event_count,
    'dailyScores',daily_count,'versionedDailyScores',versioned_count);
  -- Ticket + counts only: do not retain the recovery credential in an audit log.
  insert into public.support_deletion_audit(ticket,counts) values(p_ticket,counts);
  return counts;
end;
$$;
revoke all on function public.support_preview(text) from public, anon, authenticated;
revoke all on function public.support_delete_verified(text,text,text) from public, anon, authenticated;
grant execute on function public.support_preview(text) to service_role;
grant execute on function public.support_delete_verified(text,text,text) to service_role;
commit;
