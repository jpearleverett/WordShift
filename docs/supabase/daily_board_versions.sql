-- Apply after security_setup.sql. New dictionary/selection cohorts cannot rank
-- against different boards. Legacy clients/rows keep their original table.
begin;
-- Fix legacy PL/pgSQL output-variable ambiguity while keeping old clients alive.
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
  on conflict on constraint daily_scores_pkey do update
    set time_ms    = excluded.time_ms,
        stars      = excluded.stars,
        hints      = excluded.hints,
        handle     = excluded.handle,
        created_at = now()
  returning ds.owner, ds.date, ds.time_ms, ds.stars, ds.hints, ds.handle;
end;
$$;

create table if not exists public.daily_scores_v2 (
  owner text not null,
  date text not null,
  board_version text not null,
  time_ms integer not null check(time_ms between 0 and 86400000),
  stars smallint not null check(stars between 0 and 3),
  hints smallint not null check(hints between 0 and 50),
  handle text,
  created_at timestamptz not null default now(),
  primary key(owner, date, board_version)
);
create index if not exists daily_scores_v2_cohort_order_idx
  on public.daily_scores_v2(date, board_version, time_ms, stars desc, hints);
alter table public.daily_scores_v2 enable row level security;
revoke all on public.daily_scores_v2 from public, anon, authenticated;

create or replace function public.submit_daily_score_v2(
  p_owner text, p_date text, p_board_version text, p_time_ms integer,
  p_stars integer, p_hints integer, p_handle text default null
) returns table(owner text, date text, time_ms integer, stars smallint, hints smallint, handle text)
language plpgsql volatile security definer set search_path = public, pg_temp
as $$
begin
  if p_owner is null or length(p_owner) not between 8 and 64
     or p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$'
     or p_board_version is null or p_board_version !~ '^[a-z0-9_]{1,64}$'
     or p_time_ms is null or p_time_ms not between 0 and 86400000
     or p_stars is null or p_stars not between 0 and 3
     or p_hints is null or p_hints not between 0 and 50 then return; end if;
  if p_board_version = 'legacy_v1' then
    return query select * from public.submit_daily_score(p_owner, p_date, p_time_ms, p_stars, p_hints, p_handle);
    return;
  end if;
  return query insert into public.daily_scores_v2 as ds
    (owner, date, board_version, time_ms, stars, hints, handle)
    values(p_owner, p_date, p_board_version, p_time_ms, p_stars::smallint, p_hints::smallint, left(p_handle, 24))
    on conflict on constraint daily_scores_v2_pkey do update set
      time_ms=excluded.time_ms, stars=excluded.stars, hints=excluded.hints,
      handle=excluded.handle, created_at=now()
    returning ds.owner, ds.date, ds.time_ms, ds.stars, ds.hints, ds.handle;
end;
$$;

create or replace function public.daily_rank_v2(p_date text, p_owner text, p_board_version text)
returns table(rank integer, total integer, percentile integer)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
begin
  if p_board_version = 'legacy_v1' then
    return query select * from public.daily_rank(p_date, p_owner);
    return;
  end if;
  return query with day as (
    select d.owner, d.time_ms, d.stars, d.hints from public.daily_scores_v2 d
    where d.date=p_date and d.board_version=p_board_version
  ), me as (select * from day where owner=p_owner), agg as (
    select (1+count(*) filter(where d.owner<>p_owner and (
      d.time_ms<me.time_ms or (d.time_ms=me.time_ms and d.stars>me.stars)
      or (d.time_ms=me.time_ms and d.stars=me.stars and d.hints<me.hints)
    )))::int as rnk, (select count(*) from day)::int as tot
    from day d, me group by me.time_ms, me.stars, me.hints limit 1
  ) select rnk, tot, case when tot<=1 then 0
    else round(((tot-rnk)::numeric/(tot-1))*100)::int end from agg;
end;
$$;
revoke all on function public.submit_daily_score_v2(text,text,text,integer,integer,integer,text) from public, anon, authenticated;
revoke all on function public.daily_rank_v2(text,text,text) from public, anon, authenticated;
grant execute on function public.submit_daily_score_v2(text,text,text,integer,integer,integer,text) to anon;
grant execute on function public.daily_rank_v2(text,text,text) to anon;
commit;
notify pgrst, 'reload schema';
