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
try {
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for (const file of ['security_setup.sql', 'save_integrity_v2.sql', 'events_integrity_v2.sql', 'daily_board_versions.sql', 'support_operations.sql', 'analytics_funnels.sql', 'event_retention.sql']) {
    await db.exec(await readFile(new URL(file, import.meta.url), 'utf8'));
  }
  // Re-running upgrades must preserve rows and function signatures.
  await db.exec(await readFile(new URL('save_integrity_v2.sql', import.meta.url), 'utf8'));
  const upsert = async (id, expected, force, install = 'inst2_first_device') =>
    (await db.query(`select public.upsert_save_v2($1,1,100,'device','{}',$2,$3,$4,$5) as value`,
      [id, expected, force, install==='inst2_second_device' ? `wss_${'d'.repeat(32)}` : support, install])).rows[0].value;
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
  await assert.rejects(db.query('select * from public.get_save($1)', [owner])); checks++;
  const score = (id, version, time) => db.query(`select * from public.submit_daily_score_v2($1,'2026-09-05',$2,$3,3,0,null)`, [id,version,time]);
  await score('inst2_player_one', 'vocabulary_2026_09_v1', 1000);
  await score('inst2_player_two', 'vocabulary_2026_09_v1', 2000);
  await score('inst2_player_three', 'future_board_v3', 1);
  check((await db.query(`select * from public.daily_rank_v2('2026-09-05','inst2_player_one','vocabulary_2026_09_v1')`)).rows,
    [{ rank: 1, total: 2, percentile: 100 }]);
  await score('inst2_player_legacy', 'legacy_v1', 500);
  check((await db.query(`select * from public.daily_rank_v2('2026-09-05','inst2_player_legacy','legacy_v1')`)).rows[0].total, 1);
  // Deduplication lives inside the RPC; anon retains zero SELECT privileges.
  const batch = JSON.stringify([{ id: 'e1', type: 'puzzle_completed', timestamp: 1700000000000 }]);
  for (let attempt = 0; attempt < 2; attempt++) {
    check((await db.query(`select public.ingest_events_v2('inst2_first_device','android','1.3.0',$1) as ok`, [batch])).rows[0].ok, true);
  }
  await assert.rejects(db.query('select * from public.events')); checks++;
  await assert.rejects(db.query('select * from public.analytics_daily_build_funnel')); checks++;
  await assert.rejects(db.query('select public.support_preview($1)', [support])); checks++;
  await assert.rejects(db.query('select public.support_delete_verified($1,$2,$3)', [support,owner,'test-ticket'])); checks++;
  await db.exec('reset role');
  check((await db.query('select count(*)::int as n from public.events')).rows[0].n, 1);
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
  check((await db.query('select count(*)::int as n from public.events')).rows[0].n, 1);
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
