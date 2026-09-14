/** Offline SQL regression rehearsal. Does not connect to a backend.
 * npm --prefix /tmp/wordshift-sql install --no-audit --no-fund @electric-sql/pglite
 * node docs/supabase/rehearse.mjs /tmp/wordshift-sql/package.json
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(resolve(process.argv[2] ?? 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
let checks = 0;
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const owner = `ws2_${'a'.repeat(32)}`;
const ownerOther = `ws2_${'b'.repeat(32)}`;
const support = `wss_${'c'.repeat(32)}`;
// 2026-09-05 is a Saturday: a five-row Daily, so the plausibility floor is 7500 ms.
const DAILY_FLOOR_MS = 7500;
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for (const file of ['security_setup.sql', 'save_integrity_v2.sql', 'events_integrity_v2.sql', 'daily_board_versions.sql', 'support_operations.sql', 'analytics_funnels.sql', 'event_retention.sql', 'rate_limits_v1.sql']) {
    await db.exec(await readFile(new URL(file, import.meta.url), 'utf8'));
  }
  // Re-running upgrades must preserve rows and function signatures.
  await db.exec(await readFile(new URL('save_integrity_v2.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('rate_limits_v1.sql', import.meta.url), 'utf8'));
  const upsert = async (id, expected, force, install = 'inst2_first_device') =>
    (await db.query(`select public.upsert_save_v2($1,1,100,'device','{}',$2,$3,$4,$5) as value`,
      [id, expected, force, install==='inst2_second_device' ? `wss_${'d'.repeat(32)}` : support, install])).rows[0].value;
  // Operator-side knob for the budget checks: pin a bucket at its limit.
  const fillBucket = (scope, key, count) => db.query(
    `insert into public.rate_limits(scope,key,window_start,count) values($1,$2,now(),$3)
     on conflict(scope,key) do update set window_start=now(), count=$3`, [scope, key, count]);
  const clearBucket = (scope, key) => db.query('delete from public.rate_limits where scope=$1 and key=$2', [scope, key]);
  await db.exec('set role anon');
  check(await upsert(owner, null, false), { status: 'saved', revision: 1 });
  check(await upsert(owner, null, false), { status: 'conflict', revision: 1 });
  check(await upsert(owner, 1, false, 'inst2_second_device'), { status: 'saved', revision: 2 });
  check(await upsert(owner, 1, false), { status: 'conflict', revision: 2 });
  check(await upsert(owner, 1, true), { status: 'saved', revision: 3 });
  check(await upsert('ABC12345', null, true), { status: 'unavailable' });
  check((await db.query('select * from public.get_save_v2($1)', [owner])).rows.length, 1);
  check((await db.query('select * from public.get_save_v2($1)', [ownerOther])).rows.length, 0);
  await assert.rejects(db.query('select * from public.saves')); checks++;
  await assert.rejects(db.query('select * from public.support_install_links')); checks++;
  await assert.rejects(db.query('select * from public.rate_limits')); checks++;
  await assert.rejects(db.query('select * from public.get_save($1)', [owner])); checks++;
  // Daily plausibility: an owner must already be known (a telemetry upload or a
  // linked backup), and the time must clear the day's ramp floor.
  const ingest = (install, id) => db.query(`select public.ingest_events_v2($1,'android','1.3.5',$2) as ok`,
    [install, JSON.stringify([{ id, type: 'app_open', timestamp: 1700000000000 }])]);
  const score = (id, version, time, stars = 3, hints = 0) => db.query(
    `select * from public.submit_daily_score_v2($1,'2026-09-05',$2,$3,$4,$5,null)`, [id,version,time,stars,hints]);
  check((await score('inst2_player_one', 'vocabulary_2026_09_v1', DAILY_FLOOR_MS)).rows.length, 0); // unknown owner
  check((await ingest('inst2_player_one', 'a1')).rows[0].ok, true);
  check((await ingest('inst2_player_two', 'a1')).rows[0].ok, true);
  check((await ingest('inst2_player_three', 'a1')).rows[0].ok, true);
  check((await score('inst2_player_one', 'vocabulary_2026_09_v1', DAILY_FLOOR_MS - 1)).rows.length, 0); // under the floor
  check((await score('inst2_player_one', 'vocabulary_2026_09_v1', DAILY_FLOOR_MS, 3, 1)).rows.length, 0); // 3 stars with a hint
  check((await score('inst2_player_one', 'vocabulary_2026_09_v1', DAILY_FLOOR_MS, 2, 2)).rows.length, 0); // 2 stars with two hints
  check((await score('inst2_player_one', 'vocabulary_2026_09_v1', DAILY_FLOOR_MS, 4, 0)).rows.length, 0); // stars out of range
  check((await score('inst2_player_one', 'vocabulary_2026_09_v1', DAILY_FLOOR_MS)).rows[0].time_ms, DAILY_FLOOR_MS);
  check((await score('inst2_player_two', 'vocabulary_2026_09_v1', DAILY_FLOOR_MS + 500, 2, 1)).rows.length, 1);
  check((await score('inst2_player_three', 'future_board_v3', 1)).rows.length, 0); // impossible time
  check((await db.query(`select * from public.daily_rank_v2('2026-09-05','inst2_player_one','vocabulary_2026_09_v1')`)).rows,
    [{ rank: 1, total: 2, percentile: 100 }]);
  check((await db.query(`select * from public.daily_rank_v2('2026-09-05','inst2_player_three','future_board_v3')`)).rows.length, 0);
  // A legacy_v1 row passes through the same gate and the same owner budget.
  check((await score('inst2_player_legacy', 'legacy_v1', DAILY_FLOOR_MS)).rows.length, 0); // unknown owner
  check((await ingest('inst2_player_legacy', 'a1')).rows[0].ok, true);
  check((await score('inst2_player_legacy', 'legacy_v1', DAILY_FLOOR_MS - 1)).rows.length, 0);
  check((await score('inst2_player_legacy', 'legacy_v1', DAILY_FLOOR_MS)).rows.length, 1);
  check((await db.query(`select * from public.daily_rank_v2('2026-09-05','inst2_player_legacy','legacy_v1')`)).rows[0].total, 1);
  // The legacy daily names are no longer an anonymous bypass.
  await assert.rejects(db.query(`select * from public.submit_daily_score('inst2_player_legacy','2026-09-05',${DAILY_FLOOR_MS},3,0,null)`), error => error.code === '42501'); checks++;
  await assert.rejects(db.query(`select * from public.daily_rank('2026-09-05','inst2_player_legacy')`), error => error.code === '42501'); checks++;
  // Social proof: the two-argument call keeps working, the per-call cap is 20.
  check((await db.query(`select public.bump_words_offered('2026-09-05', 5) as total`)).rows[0].total, 5);
  check((await db.query(`select public.bump_words_offered('2026-09-05', 7, 'inst2_player_one') as total`)).rows[0].total, 12);
  check((await db.query(`select public.bump_words_offered('2026-09-05', 21) as total`)).rows[0].total, null);
  check((await db.query(`select * from public.aggregate_proof('2026-09-05')`)).rows[0].wordsOfferedToday, 12);
  // Deduplication lives inside the RPC; anon retains zero SELECT privileges.
  const batch = JSON.stringify([{ id: 'e1', type: 'puzzle_completed', timestamp: 1700000000000 }]);
  for (let attempt = 0; attempt < 2; attempt++) {
    check((await db.query(`select public.ingest_events_v2('inst2_first_device','android','1.3.0',$1) as ok`, [batch])).rows[0].ok, true);
  }
  await assert.rejects(db.query('select * from public.events')); checks++;
  await assert.rejects(db.query('select * from public.analytics_daily_build_funnel')); checks++;
  await assert.rejects(db.query('select public.support_preview($1)', [support])); checks++;
  await assert.rejects(db.query('select public.support_delete_verified($1,$2,$3)', [support,owner,'test-ticket'])); checks++;
  await assert.rejects(db.query(`select public.purge_daily_cohort('2026-09-05','vocabulary_2026_09_v1')`)); checks++;
  await assert.rejects(db.query(`select public.rate_limit_take('x','y',1)`)); checks++;
  await db.exec('reset role');
  // Budgets: every scope refuses at its limit and recovers when the window expires.
  await fillBucket('ingest_calls', 'inst2_budget', 240);
  await fillBucket('daily_owner', 'inst2_player_one', 30);
  await fillBucket('bump_words', 'shared', 60000);
  await fillBucket('events_rows', 'inst2_rows', 6000);
  await db.exec('set role anon');
  check((await ingest('inst2_budget', 'b1')).rows[0].ok, false);
  check((await score('inst2_player_one', 'vocabulary_2026_09_v1', DAILY_FLOOR_MS)).rows.length, 0);
  check((await db.query(`select public.bump_words_offered('2026-09-05', 5) as total`)).rows[0].total, null);
  check((await ingest('inst2_rows', 'r1')).rows[0].ok, true); // accepted call, row dropped by the trigger
  await db.query("insert into public.events(install_id,event_id,platform,app_version,type,data,created_at) values('inst2_rows','r2','android','1.2.0','app_open','{}',now())");
  await db.exec('reset role');
  check((await db.query("select count(*)::int as n from public.events where install_id='inst2_rows'")).rows[0].n, 0);
  await db.query("update public.rate_limits set window_start = now() - interval '61 minutes' where key in ('inst2_budget','inst2_rows','shared')");
  await clearBucket('daily_owner', 'inst2_player_one');
  await db.exec('set role anon');
  check((await ingest('inst2_budget', 'b1')).rows[0].ok, true);
  check((await ingest('inst2_rows', 'r3')).rows[0].ok, true);
  check((await db.query(`select public.bump_words_offered('2026-09-05', 5) as total`)).rows[0].total, 17);
  check((await score('inst2_player_one', 'vocabulary_2026_09_v1', DAILY_FLOOR_MS)).rows.length, 1);
  await db.exec('reset role');
  check((await db.query("select count(*)::int as n from public.events where install_id='inst2_rows'")).rows[0].n, 1);
  await db.query("delete from public.events where install_id in ('inst2_budget','inst2_rows')");
  check((await db.query('select count(*)::int as n from public.events')).rows[0].n, 5);
  check((await db.query('select count(distinct support_id)::int as n from public.support_install_links where owner=$1', [owner])).rows[0].n, 2);
  check((await db.query('select public.support_preview($1) as scope', [support])).rows[0].scope,
    { saves: 1, installs: 2, events: 1, dailyScores: 0, versionedDailyScores: 0 });
  // An unrelated save and its events must survive the verified deletion.
  await upsert(ownerOther, null, false, 'inst2_unrelated');
  await db.query(`insert into public.events(install_id,event_id,type) values('inst2_unrelated','other','app_open')`);
  await assert.rejects(db.query('select public.support_delete_verified($1,$2,$3)', ['wss_unknown',owner,'test-bad'])); checks++;
  check((await db.query('select public.support_delete_verified($1,$2,$3) as counts', [support,owner,'test-verified'])).rows[0].counts,
    { saves: 1, installs: 2, events: 1, dailyScores: 0, versionedDailyScores: 0 });
  check((await db.query('select count(*)::int as n from public.saves')).rows[0].n, 1);
  check((await db.query('select count(*)::int as n from public.events')).rows[0].n, 5);
  // Operator purge removes exactly one day's cohort.
  check((await db.query(`select public.purge_daily_cohort('2026-09-05','vocabulary_2026_09_v1') as n`)).rows[0].n, 2);
  check((await db.query(`select public.purge_daily_cohort('2026-09-05','vocabulary_2026_09_v1') as n`)).rows[0].n, 0);
  check((await db.query(`select public.purge_daily_cohort('2026-09-05','legacy_v1') as n`)).rows[0].n, 1);
  await assert.rejects(db.query(`select public.purge_daily_cohort('yesterday','legacy_v1')`), error => error.code === '22023'); checks++;
  // Retention is bounded, preserves fresh/unrelated records and is operator-only.
  // Rerunning the migration must keep legacy inserts usable without granting
  // clients control of server receipt time, even when their clock is wrong.
  await db.exec(await readFile(new URL('event_retention.sql', import.meta.url), 'utf8'));
  check((await db.query("select has_table_privilege('anon','public.events','INSERT') as allowed")).rows[0].allowed, false);
  check((await db.query("select has_column_privilege('anon','public.events','received_at','INSERT') as allowed")).rows[0].allowed, false);
  await db.exec('set role anon');
  await assert.rejects(db.query("insert into public.events(install_id,type,received_at) values('spoofed-receipt','app_open',now()+interval '100 years')"), error => error.code === '42501'); checks++;
  await db.query("insert into public.events(install_id,event_id,platform,app_version,type,data,created_at) values('legacy-receipt','legacy-retry-id','android','1.2.0','app_open','{}',now()+interval '1 year')");
  await db.exec('reset role');
  check((await db.query("select received_at < created_at and received_at between now()-interval '1 minute' and now() as server_receipt from public.events where install_id='legacy-receipt' and event_id='legacy-retry-id'")).rows[0].server_receipt, true);
  await db.query("insert into public.events(install_id,event_id,type,created_at,received_at) values ('retention-probe','old1','app_open',now()-interval '25 months',now()-interval '25 months'), ('retention-probe','old2','app_open',now()+interval '1 year',now()-interval '26 months'), ('retention-probe','fresh','app_open',now(),now())");
  await db.exec('set role anon');
  await assert.rejects(db.query('select public.prune_expired_events(1)')); checks++;
  await db.exec('reset role');
  await assert.rejects(db.query('select public.prune_expired_events(0)')); checks++;
  await assert.rejects(db.query('select public.prune_expired_events(10001)')); checks++;
  check((await db.query('select public.prune_expired_events(1) as n')).rows[0].n, 1);
  check((await db.query("select count(*)::int as n from public.events where event_id='old1'")).rows[0].n, 1);
  check((await db.query('select public.prune_expired_events(10000) as n')).rows[0].n, 1);
  check((await db.query('select public.prune_expired_events(10000) as n')).rows[0].n, 0);
  check((await db.query("select count(*)::int as n from public.events where event_id='fresh'")).rows[0].n, 1);
  check((await db.query("select count(*)::int as n from public.events where event_id='other'")).rows[0].n, 1);
  console.log(JSON.stringify({ checks, result: 'passed', engine: 'PGlite PostgreSQL', remoteWrites: 0 }));
} finally { await db.close(); }
