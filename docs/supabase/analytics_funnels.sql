-- Optional private dashboard view; apply only after events_integrity_v2.sql.
-- Counts are emitted events, not causal conversion estimates. Existing installs'
-- first observed date is not necessarily their original installation date.
create or replace view public.analytics_daily_build_funnel as
select date_trunc('day',created_at) as observed_day, app_version, platform,
  count(distinct install_id) as observed_installs,
  count(*) filter(where type='onboarding_complete') as onboarding_completions,
  count(*) filter(where type='puzzle_started') as puzzle_starts,
  count(*) filter(where type='puzzle_completed') as puzzle_completions,
  count(*) filter(where type='hint_requested') as hint_requests,
  count(*) filter(where type='puzzle_abandoned') as puzzle_abandons,
  count(*) filter(where type='story_started') as story_starts,
  count(*) filter(where type='story_deferred') as story_deferrals,
  count(*) filter(where type='story_completed') as story_completions,
  count(*) filter(where type='cloud_sync_result' and data->>'result'='conflict') as save_conflicts,
  count(*) filter(where type='cloud_sync_result' and data->>'result' in ('invalid','failed','unavailable','recovery_required')) as save_failures,
  count(*) filter(where type='ad_availability') as ad_availability_observations
from public.events group by 1,2,3;
revoke all on public.analytics_daily_build_funnel from public, anon, authenticated;
grant select on public.analytics_daily_build_funnel to service_role;
