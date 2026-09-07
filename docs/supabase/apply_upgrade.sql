-- psql entry point for an EXISTING WordShift database with the base schema.
-- psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f docs/supabase/apply_upgrade.sql
-- Each included migration is transactional and rerunnable. Do not replay the
-- legacy base schema by itself after this upgrade.
\set ON_ERROR_STOP on
\ir save_integrity_v2.sql
\ir events_integrity_v2.sql
\ir daily_board_versions.sql
\ir support_operations.sql
\ir analytics_funnels.sql
\ir event_retention.sql
-- Scheduling remains separate because pg_cron must be enabled in this project.
