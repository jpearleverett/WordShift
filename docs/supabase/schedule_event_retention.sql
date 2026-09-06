-- Run as postgres AFTER event_retention.sql, with pg_cron enabled in Supabase.
-- The named job is updated by cron.schedule when this script is rerun.
-- Each hourly run removes at most 10000 analytics rows older than 24 months.
-- Inspect existing backup/hold requirements before scheduling this project.
select cron.schedule(
  'wordshift-event-retention', '17 * * * *',
  $$select public.prune_expired_events(10000);$$
);
-- Record jobid, active and the next observed successful run in release evidence.
select jobid, jobname, schedule, active from cron.job
where jobname = 'wordshift-event-retention';
select status, start_time, end_time, return_message
from cron.job_run_details
where jobid in (select jobid from cron.job where jobname = 'wordshift-event-retention')
order by start_time desc limit 5;
select min(received_at) as oldest_event,
  count(*) filter (where received_at < now() - interval '24 months') as overdue
from public.events;
