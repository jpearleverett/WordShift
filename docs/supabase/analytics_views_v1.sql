-- Rollout analytics: install cohorts with D1/D7/D14 retention, the FTUE funnel,
-- the phase_reached distribution and the store-to-purchase funnel (BO-1 in
-- LAUNCH_READINESS_REVIEW_2026-09-22.md). Apply as postgres AFTER
-- event_retention.sql (it relies on the server-owned events.received_at column).
-- Transactional and rerunnable: tables are create-if-missing, views and
-- functions are create-or-replace with unchanged column lists.
--
-- Everything here is PRIVATE. Supabase's default privileges grant new relations
-- in `public` to anon/authenticated, so every object below is revoked from them
-- explicitly and granted to service_role only. Read the views from the SQL
-- editor or with the service-role key; never from the app.
--
-- Definitions (all dates are UTC calendar days of server receipt time,
-- events.received_at, never the device clock in created_at):
--   * cohort_day    the day an install_id was first seen by the server. Rows
--                   pruned by retention keep their first-seen moment in
--                   analytics_install_first_seen (event_retention_v2.sql fills
--                   it before deleting), so a long-lived install never
--                   reappears as a "new" cohort after its oldest rows go.
--   * install_kind  'new' when the install logged the cold-open onboarding step
--                   within a day of first being seen (a genuine fresh install);
--                   'existing' otherwise (an upgraded player whose first
--                   telemetry arrived with a newer build). Use 'new' for the
--                   rollout kill criteria.
--   * retained dN   the install has ANY event received on cohort_day + N.
--                   A rate is null until that day has fully elapsed.
-- Events arrive in batches at most once a minute while the app runs, so an
-- offline session is counted on the day its batch lands. That is the accepted
-- approximation of "server received date".
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

-- Retention probes look up one install's rows by receipt time.
create index if not exists events_install_received_idx
  on public.events (install_id, received_at);

-- ---------------------------------------------------------------------------
-- One row per install: its first-seen moment, the build and platform of its
-- first received event, and whether it is a genuine fresh install.
create or replace view public.analytics_install_cohorts as
with live as (
  select distinct on (e.install_id)
    e.install_id, e.received_at, e.app_version, e.platform
  from public.events e
  order by e.install_id, e.received_at, e.id
), merged as (
  select coalesce(l.install_id, p.install_id) as install_id,
    case when p.first_seen_at is not null
          and (l.received_at is null or p.first_seen_at <= l.received_at)
      then p.first_seen_at else l.received_at end as first_seen_at,
    case when p.first_seen_at is not null
          and (l.received_at is null or p.first_seen_at <= l.received_at)
      then p.first_app_version else l.app_version end as first_app_version,
    case when p.first_seen_at is not null
          and (l.received_at is null or p.first_seen_at <= l.received_at)
      then p.first_platform else l.platform end as first_platform
  from live l
  full join public.analytics_install_first_seen p on p.install_id = l.install_id
)
select m.install_id,
  m.first_seen_at,
  (m.first_seen_at at time zone 'UTC')::date as cohort_day,
  coalesce(m.first_app_version, 'unknown') as app_version,
  coalesce(m.first_platform, 'unknown') as platform,
  case when exists(
    select 1 from public.events e
    where e.install_id = m.install_id
      and e.type = 'onboarding_step' and e.data->>'step' = 'cold_open_puzzle'
      and e.received_at < m.first_seen_at + interval '1 day'
  ) then 'new' else 'existing' end as install_kind
from merged m;

-- ---------------------------------------------------------------------------
-- D1/D7/D14 retention by cohort day, first build and install kind.
create or replace view public.analytics_retention_cohorts as
with c as (
  select ic.*,
    (now() at time zone 'UTC')::date as today
  from public.analytics_install_cohorts ic
), flags as (
  select c.cohort_day, c.app_version, c.install_kind, c.today,
    exists(select 1 from public.events e where e.install_id = c.install_id
      and e.received_at >= (c.cohort_day + 1)::timestamp at time zone 'UTC'
      and e.received_at <  (c.cohort_day + 2)::timestamp at time zone 'UTC') as d1,
    exists(select 1 from public.events e where e.install_id = c.install_id
      and e.received_at >= (c.cohort_day + 7)::timestamp at time zone 'UTC'
      and e.received_at <  (c.cohort_day + 8)::timestamp at time zone 'UTC') as d7,
    exists(select 1 from public.events e where e.install_id = c.install_id
      and e.received_at >= (c.cohort_day + 14)::timestamp at time zone 'UTC'
      and e.received_at <  (c.cohort_day + 15)::timestamp at time zone 'UTC') as d14
  from c
)
select cohort_day, app_version, install_kind,
  count(*) as installs,
  count(*) filter (where d1) as d1_retained,
  case when cohort_day + 1 < min(today)
    then round(count(*) filter (where d1)::numeric / count(*), 3) end as d1_rate,
  count(*) filter (where d7) as d7_retained,
  case when cohort_day + 7 < min(today)
    then round(count(*) filter (where d7)::numeric / count(*), 3) end as d7_rate,
  count(*) filter (where d14) as d14_retained,
  case when cohort_day + 14 < min(today)
    then round(count(*) filter (where d14)::numeric / count(*), 3) end as d14_rate
from flags
group by cohort_day, app_version, install_kind;

-- ---------------------------------------------------------------------------
-- FTUE funnel: app_open -> each cold-open onboarding step -> onboarding_complete
-- -> first puzzle_completed -> a second completed puzzle (the first free board
-- after the opener). Counts are installs that EVER reached the step, so the
-- steps are not forced to be monotonic. onboarding_complete also fires on the
-- confirmed "Skip it all", so it measures leaving onboarding, not finishing
-- every beat; the step columns show where skippers left.
create or replace view public.analytics_ftue_funnel as
with per_install as (
  select e.install_id,
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
    bool_or(e.type = 'puzzle_completed'
      and jsonb_typeof(e.data->'puzzlesSolved') = 'number'
      and (e.data->>'puzzlesSolved')::numeric >= 2) as second_puzzle_completed
  from public.events e
  where e.type in ('app_open', 'onboarding_step', 'onboarding_complete', 'puzzle_completed')
  group by e.install_id
)
select c.cohort_day, c.app_version, c.install_kind,
  count(*) as installs,
  count(*) filter (where p.app_open) as app_open,
  count(*) filter (where p.cold_open_puzzle) as cold_open_puzzle,
  count(*) filter (where p.home_empty) as home_empty,
  count(*) filter (where p.fox_invited) as fox_invited,
  count(*) filter (where p.going_to_pit) as going_to_pit,
  count(*) filter (where p.pit_intro) as pit_intro,
  count(*) filter (where p.pit_offering) as pit_offering,
  count(*) filter (where p.returning_home) as returning_home,
  count(*) filter (where p.unlock_explained) as unlock_explained,
  count(*) filter (where p.onboarding_complete) as onboarding_complete,
  count(*) filter (where p.first_puzzle_completed) as first_puzzle_completed,
  count(*) filter (where p.second_puzzle_completed) as second_puzzle_completed,
  case when count(*) filter (where p.app_open) > 0
    then round(count(*) filter (where p.app_open and p.onboarding_complete)::numeric
      / count(*) filter (where p.app_open), 3) end as onboarding_completion_rate
from public.analytics_install_cohorts c
left join per_install p on p.install_id = c.install_id
group by c.cohort_day, c.app_version, c.install_kind;

-- ---------------------------------------------------------------------------
-- phase_reached: the FIRST time each install reached each phase (a New Cycle
-- re-descent logs the phases again; those repeats are ignored). One row per
-- phase across all builds (app_version = 'all') plus one per phase and build.
-- installAgeDays is -1 when the device could not read its install date; those
-- are excluded from the age statistics.
create or replace view public.analytics_phase_reached as
with parsed as (
  select e.install_id, e.id, e.received_at,
    coalesce(e.app_version, 'unknown') as app_version,
    case when jsonb_typeof(e.data->'phase') = 'number' then (e.data->>'phase')::numeric end as phase,
    case when jsonb_typeof(e.data->'puzzlesSolved') = 'number' then (e.data->>'puzzlesSolved')::numeric end as puzzles_solved,
    case when jsonb_typeof(e.data->'installAgeDays') = 'number' then (e.data->>'installAgeDays')::numeric end as install_age_days
  from public.events e
  where e.type = 'phase_reached'
), firsts as (
  select distinct on (install_id, phase) *
  from parsed where phase is not null
  order by install_id, phase, received_at, id
)
select phase::int as phase,
  case when grouping(app_version) = 1 then 'all' else app_version end as app_version,
  count(*) as installs,
  percentile_cont(0.25) within group (order by puzzles_solved) as p25_puzzles_solved,
  percentile_cont(0.5) within group (order by puzzles_solved) as median_puzzles_solved,
  percentile_cont(0.75) within group (order by puzzles_solved) as p75_puzzles_solved,
  percentile_cont(0.5) within group (order by install_age_days)
    filter (where install_age_days >= 0) as median_install_age_days,
  percentile_cont(0.9) within group (order by install_age_days)
    filter (where install_age_days >= 0) as p90_install_age_days
from firsts
group by grouping sets ((phase), (phase, app_version));

-- ---------------------------------------------------------------------------
-- Store -> purchase. Only REAL-MONEY checkouts: an amber spend is not a
-- purchase. The season-pass premium unlock logs season_premium_unlocked from
-- 2026-09-22; builds before that logged it as iap_purchase with kind 'season'
-- and productId 'season_premium_amber', which are excluded here. store_opened
-- carries no product, so it appears once per day as the funnel's top row
-- (product_id '(store)'); product rows start at purchase_initiated.
create or replace view public.analytics_purchase_funnel as
with purchase_events as (
  select e.install_id, e.type,
    (e.received_at at time zone 'UTC')::date as observed_day,
    coalesce(e.app_version, 'unknown') as app_version,
    coalesce(e.data->>'productId', '(unknown)') as product_id,
    coalesce(e.data->>'kind', '(unknown)') as kind
  from public.events e
  where e.type in ('purchase_initiated', 'iap_purchase', 'purchase_cancelled', 'purchase_failed')
    and coalesce(e.data->>'kind', '') <> 'season'
    and coalesce(e.data->>'productId', '') <> 'season_premium_amber'
), store as (
  select (e.received_at at time zone 'UTC')::date as observed_day,
    coalesce(e.app_version, 'unknown') as app_version,
    '(store)'::text as product_id, '(store)'::text as kind,
    count(*) as store_opens, count(distinct e.install_id) as store_openers,
    0::bigint as initiations, 0::bigint as initiating_installs,
    0::bigint as purchases, 0::bigint as purchasing_installs,
    0::bigint as cancellations, 0::bigint as failures
  from public.events e where e.type = 'store_opened'
  group by 1, 2
)
select * from store
union all
select observed_day, app_version, product_id, kind,
  0::bigint, 0::bigint,
  count(*) filter (where type = 'purchase_initiated'),
  count(distinct install_id) filter (where type = 'purchase_initiated'),
  count(*) filter (where type = 'iap_purchase'),
  count(distinct install_id) filter (where type = 'iap_purchase'),
  count(*) filter (where type = 'purchase_cancelled'),
  count(*) filter (where type = 'purchase_failed')
from purchase_events
group by observed_day, app_version, product_id, kind;

revoke all on public.analytics_install_cohorts from public, anon, authenticated;
revoke all on public.analytics_retention_cohorts from public, anon, authenticated;
revoke all on public.analytics_ftue_funnel from public, anon, authenticated;
revoke all on public.analytics_phase_reached from public, anon, authenticated;
revoke all on public.analytics_purchase_funnel from public, anon, authenticated;
grant select on public.analytics_install_cohorts to service_role;
grant select on public.analytics_retention_cohorts to service_role;
grant select on public.analytics_ftue_funnel to service_role;
grant select on public.analytics_phase_reached to service_role;
grant select on public.analytics_purchase_funnel to service_role;
commit;
