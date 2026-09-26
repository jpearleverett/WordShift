/** Offline rehearsal of dashboard_reader_v1.sql. Does not connect to a backend.
 * npm --prefix /tmp/wordshift-sql install --no-audit --no-fund @electric-sql/pglite@0.5.8
 * node docs/supabase/rehearse_dashboard.mjs /tmp/wordshift-sql/package.json
 *
 * Applies migrations 1 to 11 in BACKEND_SETUP.md order, then this file three
 * times (the last after LOGIN is enabled with a SCRAM verifier), seeds events
 * relative to one fixed moment (pre-launch test devices included) and checks:
 *   * the three functions return the exact numbers the seed implies;
 *   * dashboard_reader can execute only them and nothing else: every table and
 *     view in public is denied, and so is every other security definer RPC;
 *   * anon, authenticated, service_role and PUBLIC cannot execute them;
 *   * a hostile or invalid time zone falls back to UTC without harm;
 *   * no install id, owner, free text or markup leaves in any output;
 *   * re-running the migration changes nothing else and keeps LOGIN and the
 *     password the operator set.
 * dashboard/test/sql.test.js runs the same function with the dashboard's own
 * PGlite and its payload contract. DASHBOARD_PERF=1 adds a 300,000-event timing.
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MIGRATIONS = [
  'security_setup.sql', 'save_integrity_v2.sql', 'events_integrity_v2.sql', 'daily_board_versions.sql',
  'support_operations.sql', 'analytics_funnels.sql', 'event_retention.sql', 'rate_limits_v1.sql',
  'save_and_board_limits_v1.sql', 'analytics_views_v1.sql', 'event_retention_v2.sql',
];
// RFC 7677 test vector (password "pencil"): a well-formed SCRAM verifier.
export const RFC_VERIFIER = 'SCRAM-SHA-256$4096:W22ZaJ0SNY7soEsUEjb6gQ==$WG5d8oPm3OtcPnkdi4Uo7BkeZkBFzpcXkuLmtbsT4qY=:wfPLwcE6nTWhTAmQ7tl2KeoiWGPlZqQxSrmfPwDl2dU=';
const ROLE_SETTINGS = ['statement_timeout=10s', 'default_transaction_read_only=on',
  'idle_in_transaction_session_timeout=15s', 'idle_session_timeout=10min', 'lock_timeout=2s'];
const DASHBOARD_FNS = ['public.dashboard_cohorts', 'public.dashboard_live', 'public.dashboard_progress'];
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const FORBIDDEN_IN_OUTPUT = ['inst_zz', 'ws2_', 'wss_', 'SECRET_FREE_TEXT', 'HANDLE_SENTINEL', '<', '>'];

const sql = (file) => readFile(new URL(file, import.meta.url), 'utf8');
const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const utcDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const utcMidnight = (dayOffsetFrom, days) => Date.parse(`${utcDay(dayOffsetFrom)}T00:00:00Z`) + days * DAY;
const localDay = (ms, tz) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
const localHour = (ms, tz) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(new Date(ms)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function defaultValidators() {
  try {
    const mod = await import(new URL('../../dashboard/src/contract.js', import.meta.url));
    return mod.VALIDATORS;
  } catch {
    return null;
  }
}

/**
 * Runs the whole rehearsal on a fresh PGlite instance.
 * @param {{ PGlite: any, validators?: Record<string, (d: any) => string[]> | null, perf?: boolean }} options
 * @returns {Promise<{ checks: number, contractChecked: boolean, outputs: Record<string, any>, perfMs?: Record<string, number> }>}
 */
export async function rehearseDashboard({ PGlite, validators, perf = false } = {}) {
  if (!PGlite) throw new Error('PGlite is required');
  const contract = validators === undefined ? await defaultValidators() : validators;
  const db = new PGlite();
  let checks = 0;
  const check = (actual, expected, label) => { assert.deepEqual(actual, expected, label); checks++; };
  const ok = (value, label) => { assert.ok(value, label); checks++; };
  const denied = async (query, params, label) => {
    await assert.rejects(db.query(query, params), (e) => e.code === '42501', label);
    checks++;
  };
  const one = async (query, params) => (await db.query(query, params)).rows[0];
  const outputs = {};
  const validate = (section, data, label) => {
    if (!contract) return;
    check(contract[section](data), [], `${label}: payload contract`);
  };
  const privacy = (data, label) => {
    const text = JSON.stringify(data);
    for (const token of FORBIDDEN_IN_OUTPUT) ok(!text.includes(token), `${label}: output must not contain ${token}`);
  };
  const live = async (tz, launch) => (await one('select public.dashboard_live($1::text, $2::timestamptz) as j', [tz, launch])).j;
  const cohorts = async (tz, launch) => (await one('select public.dashboard_cohorts($1::text, $2::timestamptz) as j', [tz, launch])).j;
  const progress = async (launch) => (await one('select public.dashboard_progress($1::timestamptz) as j', [launch])).j;
  const asReader = async (fn) => {
    await db.exec('set role dashboard_reader; set default_transaction_read_only = on;');
    try { return await fn(); } finally { await db.exec('reset role; set default_transaction_read_only = off;'); }
  };

  try {
    // ---- Schema: migrations 1 to 11, then this file twice, LOGIN on, and once more.
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
    for (const file of MIGRATIONS) await db.exec(await sql(file));
    const snapshot = async () => JSON.stringify([
      (await db.query(`select p.oid::regprocedure::text as sig, pg_get_functiondef(p.oid) as def, p.proacl::text as acl
        from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname not like 'dashboard\\_%' order by 1`)).rows,
      (await db.query(`select c.relname, c.relkind, case when c.relkind = 'v' then pg_get_viewdef(c.oid) end as def,
        c.relacl::text as acl from pg_class c where c.relnamespace = 'public'::regnamespace
        and c.relkind in ('r', 'v', 'm', 'p', 'S') order by 1`)).rows,
      (await db.query(`select tgname, tgenabled from pg_trigger where not tgisinternal order by 1`)).rows,
    ]);
    const before = await snapshot();
    const migration = await sql('dashboard_reader_v1.sql');
    await db.exec(migration);
    const role = async () => one(`select r.rolcanlogin, r.rolconnlimit, r.rolvaliduntil = 'infinity' as forever, r.rolconfig,
      r.rolsuper, r.rolcreaterole, r.rolcreatedb, r.rolreplication, r.rolbypassrls, r.rolinherit, a.rolpassword
      from pg_roles r join pg_authid a on a.oid = r.oid where r.rolname = 'dashboard_reader'`);
    const first = await role();
    check([first.rolcanlogin, first.rolconnlimit, first.forever, first.rolpassword], [false, 6, true, null], 'role after first run');
    check([...first.rolconfig].sort(), [...ROLE_SETTINGS].sort(), 'role settings');
    check([first.rolsuper, first.rolcreaterole, first.rolcreatedb, first.rolreplication, first.rolbypassrls, first.rolinherit],
      [false, false, false, false, false, false], 'role attributes');
    await db.exec(migration);
    await db.exec(`alter role dashboard_reader with login password '${RFC_VERIFIER}'`);
    await db.exec(migration);
    const third = await role();
    check([third.rolcanlogin, third.rolpassword, third.rolconnlimit], [true, RFC_VERIFIER, 6], 'LOGIN and password survive a re-run');
    check([...third.rolconfig].sort(), [...ROLE_SETTINGS].sort(), 'role settings after re-run');
    check(await snapshot(), before, 'earlier functions, views, tables, ACLs and triggers unchanged');
    check((await db.query(`select p.proname, count(*)::int as n from pg_proc p where p.pronamespace = 'public'::regnamespace
      and p.proname like 'dashboard\\_%' group by 1 order by 1`)).rows,
      [{ proname: 'dashboard_cohorts', n: 1 }, { proname: 'dashboard_live', n: 1 }, { proname: 'dashboard_progress', n: 1 }], 'exactly three functions');
    check((await db.query(`select indexname from pg_indexes where schemaname = 'public' and indexname = 'events_type_received_idx'`)).rows.length, 1, 'index');
    check((await db.query(`select count(*)::int as n from pg_auth_members m join pg_roles r on r.oid = m.member where r.rolname = 'dashboard_reader'`)).rows[0].n, 0, 'no memberships');

    // ---- Privileges (the read-only queries README section 3.5 prints).
    check((await db.query(`select n.nspname || '.' || p.proname as fn from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where p.prosecdef and has_function_privilege('dashboard_reader', p.oid, 'EXECUTE')
        and has_schema_privilege('dashboard_reader', n.oid, 'USAGE') order by 1`)).rows.map((r) => r.fn), DASHBOARD_FNS, 'definer inventory');
    check((await db.query(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p')
        and (has_table_privilege('dashboard_reader', c.oid, 'SELECT') or has_table_privilege('dashboard_reader', c.oid, 'INSERT')
          or has_table_privilege('dashboard_reader', c.oid, 'UPDATE') or has_table_privilege('dashboard_reader', c.oid, 'DELETE'))`)).rows, [], 'no table privilege');
    check((await db.query(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'S'
      and case when c.relkind = 'S' then has_sequence_privilege('dashboard_reader', c.oid, 'USAGE') else false end`)).rows, [], 'no sequence privilege');
    for (const fn of ['public.dashboard_live(text,timestamptz)', 'public.dashboard_cohorts(text,timestamptz)', 'public.dashboard_progress(timestamptz)']) {
      check((await one(`select has_function_privilege('dashboard_reader', $1, 'EXECUTE') as r, has_function_privilege('anon', $1, 'EXECUTE') as a,
        has_function_privilege('authenticated', $1, 'EXECUTE') as u, has_function_privilege('service_role', $1, 'EXECUTE') as s,
        exists(select 1 from aclexplode((select proacl from pg_proc where oid = $1::regprocedure)) x where x.grantee = 0) as pub`, [fn])),
        { r: true, a: false, u: false, s: false, pub: false }, `grants on ${fn}`);
      check((await one(`select p.prosecdef, p.provolatile, pg_get_userbyid(p.proowner) as owner, p.proconfig
        from pg_proc p where p.oid = $1::regprocedure`, [fn])),
        { prosecdef: true, provolatile: 's', owner: 'postgres', proconfig: ['search_path=public, pg_temp'] }, `definition of ${fn}`);
    }
    const tables = (await db.query(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace
      and c.relkind in ('r', 'v', 'm', 'p') order by 1`)).rows.map((r) => r.relname);
    for (const expected of ['events', 'saves', 'daily_scores', 'daily_scores_v2', 'daily_counters', 'support_install_links',
      'support_deletion_audit', 'rate_limits', 'analytics_install_first_seen', 'analytics_daily_event_rollup',
      'analytics_rollup_state', 'analytics_install_cohorts', 'analytics_retention_cohorts', 'analytics_ftue_funnel',
      'analytics_phase_reached', 'analytics_purchase_funnel', 'analytics_daily_build_funnel']) {
      ok(tables.includes(expected), `relation ${expected} exists to be tested`);
    }
    await asReader(async () => {
      for (const relation of tables) await denied(`select * from public.${relation} limit 1`, [], `reader SELECT ${relation}`);
      await denied(`select public.ingest_events_v2('inst_zz_x', 'android', '1.4.6', '[]')`, [], 'reader ingest_events_v2');
      await denied('select public.prune_expired_events(1)', [], 'reader prune_expired_events');
      await denied('select public.rollup_event_days(1)', [], 'reader rollup_event_days');
      await denied(`select public.support_preview('wss_${'c'.repeat(32)}')`, [], 'reader support_preview');
      await denied(`select * from public.get_save_v2('ws2_${'a'.repeat(32)}')`, [], 'reader get_save_v2');
      await denied(`select public.purge_daily_cohort('2026-09-26', 'legacy_v1')`, [], 'reader purge_daily_cohort');
      await assert.rejects(db.query(`insert into public.events(install_id, type) values ('inst_zz_x', 'app_open')`)); checks++;
      await assert.rejects(db.query('create table public.dashboard_probe(x int)')); checks++;
      ok((await live('UTC', null)).schemaVersion === 1, 'reader can call dashboard_live');
      ok((await cohorts('UTC', null)).schemaVersion === 1, 'reader can call dashboard_cohorts');
      ok((await progress(null)).schemaVersion === 1, 'reader can call dashboard_progress');
    });
    for (const other of ['anon', 'authenticated', 'service_role']) {
      await db.exec(`set role ${other}`);
      try {
        await denied(`select public.dashboard_live('UTC', null)`, [], `${other} dashboard_live`);
        await denied(`select public.dashboard_cohorts('UTC', null)`, [], `${other} dashboard_cohorts`);
        await denied('select public.dashboard_progress(null)', [], `${other} dashboard_progress`);
      } finally { await db.exec('reset role'); }
    }

    // ---- Seed. One fixed moment T; local "today" must be at least an hour
    // old and at least an hour from its end, and no UTC midnight may pass mid-run.
    let T = Date.parse((await one(`select to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as t`)).t);
    const utcMinuteOfDay = (T % DAY) / MIN;
    if (utcMinuteOfDay > 24 * 60 - 3) {
      await sleep(DAY - (T % DAY) + 5000);
      T = Date.parse((await one(`select to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as t`)).t);
    }
    const TZ = ['UTC', 'Asia/Tokyo'].find((z) => localHour(T, z) >= 1 && localHour(T, z) <= 22);
    const L = T - 5 * DAY; // launch
    const launch = iso(L);
    const D = (k) => utcMidnight(T, -k); // midnight of UTC day D-k
    await db.exec('alter table public.events disable trigger events_rate_limit');
    const add = (install, type, data, at, version = '1.4.6') => db.query(
      `insert into public.events(install_id, event_id, platform, app_version, type, data, created_at, received_at)
       values ($1, gen_random_uuid()::text, 'android', $2, $3, $4::jsonb, $5::timestamptz, $5::timestamptz)`,
      [install, version, type, JSON.stringify(data), iso(at)]);
    const cold = { step: 'cold_open_puzzle' };
    // Pre-launch testers.
    await add('inst_zz_tester_old', 'app_open', {}, T - 10 * DAY, '1.4.4');
    await add('inst_zz_tester_old', 'puzzle_completed', { puzzlesSolved: 40 }, T - 3 * MIN);
    await add('inst_zz_tester_old', 'phase_reached', { phase: 3, puzzlesSolved: 62, installAgeDays: 10 }, T - 3 * MIN);
    await add('inst_zz_tester_old', 'store_opened', {}, T - 3 * MIN);
    await add('inst_zz_tester_old', 'iap_purchase', { productId: 'com.wordshift.remove_ads', kind: 'adfree' }, T - 3 * MIN);
    await add('inst_zz_tester_old', 'app_error', { source: 'tester_only', message: 'SECRET_FREE_TEXT' }, T - 3 * MIN);
    await db.query(`insert into public.analytics_install_first_seen(install_id, first_seen_at, first_app_version, first_platform)
      values ('inst_zz_tester_pruned', $1::timestamptz, '1.2.0', 'android')`, [iso(T - 200 * DAY)]);
    await add('inst_zz_tester_pruned', 'app_open', {}, T - 30 * 1000);
    // A tester first seen in the day before launch (recentBeforeLaunch).
    await add('inst_zz_tester_recent', 'puzzle_started', {}, L - 2 * HOUR);
    await add('inst_zz_old_new', 'app_open', {}, D(9) + 12 * HOUR);
    await add('inst_zz_old_new', 'onboarding_step', cold, D(9) + 12 * HOUR);
    await add('inst_zz_old_new', 'app_open', {}, D(2) + 30 * MIN);
    // Players since launch, UTC cohorts D-4 to D-2.
    await add('inst_zz_returning', 'app_open', {}, D(4) + 12 * HOUR, '1.4.5');
    await add('inst_zz_returning', 'onboarding_step', cold, D(4) + 12 * HOUR, '1.4.5');
    await add('inst_zz_returning', 'onboarding_step', { step: 'fox_invited' }, D(4) + 12 * HOUR, '1.4.5');
    await add('inst_zz_returning', 'app_open', {}, D(3) + 6 * HOUR, '1.4.5');
    await add('inst_zz_late_cold', 'app_open', {}, D(4) + 10 * HOUR);
    await add('inst_zz_late_cold', 'onboarding_step', cold, D(2) + 10 * HOUR);
    await add('inst_zz_ret_1', 'app_open', {}, D(3) + 12 * HOUR);
    await add('inst_zz_ret_1', 'onboarding_step', cold, D(3) + 12 * HOUR);
    await add('inst_zz_ret_1', 'puzzle_completed', { puzzlesSolved: 1 }, D(3) + 12 * HOUR);
    await add('inst_zz_ret_1', 'app_open', {}, D(2) + 6 * HOUR);
    await add('inst_zz_ret_1', 'phase_reached', { phase: 1, puzzlesSolved: 14, installAgeDays: 1 }, D(2) + 6 * HOUR);
    await add('inst_zz_ret_1', 'phase_reached', { phase: 1, puzzlesSolved: 20, installAgeDays: 1 }, D(2) + 7 * HOUR);
    // Bought from the Patron screen, which never logs store_opened.
    await add('inst_zz_ret_1', 'iap_purchase', { productId: 'com.wordshift.patron_key', kind: 'patron' }, D(2) + 7 * HOUR);
    await add('inst_zz_ret_2', 'onboarding_step', cold, D(3) + 13 * HOUR);
    await add('inst_zz_ret_3', 'app_open', {}, D(2) + 12 * HOUR);
    await add('inst_zz_ret_3', 'onboarding_step', cold, D(2) + 12 * HOUR);
    await add('inst_zz_ret_3', 'puzzle_completed', { puzzlesSolved: 3 }, D(2) + 12 * HOUR);
    await add('inst_zz_ret_3', 'phase_reached', { phase: 2, puzzlesSolved: 30, installAgeDays: 0 }, D(2) + 12 * HOUR);
    // Today: every non-tester event of the last 24 hours is below.
    const A = 'inst_zz_new_a';
    await add(A, 'app_open', {}, T - 40 * MIN);
    await add(A, 'onboarding_step', cold, T - 40 * MIN);
    await add(A, 'puzzle_started', { difficulty: 'EASY' }, T - 40 * MIN);
    await add(A, 'puzzle_completed', { puzzlesSolved: 1 }, T - 39 * MIN);
    await add(A, 'onboarding_step', { step: 'home_empty' }, T - 39 * MIN);
    await add(A, 'onboarding_complete', {}, T - 38 * MIN);
    await add(A, 'phase_reached', { phase: 1, puzzlesSolved: 12, installAgeDays: 0 }, T - 30 * MIN);
    await add(A, 'puzzle_started', {}, T - 3 * MIN);
    await add(A, 'puzzle_completed', { puzzlesSolved: 2 }, T - 2 * MIN);
    await add(A, 'app_error', { source: 'home_load', message: 'SECRET_FREE_TEXT', stack: 'SECRET_FREE_TEXT at x' }, T - MIN);
    await add(A, 'cloud_sync_result', { operation: 'upload', result: 'saved' }, T - MIN);
    await add(A, 'store_opened', { surface: 'store_modal' }, T - MIN);
    await add(A, 'purchase_initiated', { productId: 'com.wordshift.starter', kind: 'starter' }, T - MIN);
    await add(A, 'iap_purchase', { productId: 'com.wordshift.starter', kind: 'starter' }, T - MIN);
    await add(A, 'iap_purchase', { productId: 'season_premium_amber', kind: 'season', amber: 2500 }, T - MIN);
    await add(A, 'daily_amber_claimed', { amount: 60, remaining: 1 }, T - MIN);
    await add(A, 'ad_availability', { format: 'rewarded', placement: 'hint_recovery', result: 'completed' }, T - MIN);
    await add(A, 'ad_availability', { format: 'interstitial', phase: 0, result: 'suppressed' }, T - MIN);
    const B = 'inst_zz_new_b';
    const vb = '9.9.9<b>';
    await add(B, 'app_open', {}, T - 45 * MIN, vb);
    await add(B, 'onboarding_step', cold, T - 45 * MIN, vb);
    await add(B, 'puzzle_completed', { puzzlesSolved: 'abc' }, T - 44 * MIN, vb);
    await add(B, 'phase_reached', { phase: '1', puzzlesSolved: 9 }, T - 44 * MIN, vb);
    await add(B, 'phase_reached', { phase: 7, puzzlesSolved: 9 }, T - 44 * MIN, vb);
    await add(B, 'app_error', { source: '<img src=x onerror=alert(1)>', message: 'SECRET_FREE_TEXT' }, T - 3 * MIN, vb);
    await add(B, 'app_error', { message: 'SECRET_FREE_TEXT' }, T - 3 * MIN, vb);
    await add(B, 'cloud_sync_result', { operation: 'upload', result: 'conflict' }, T - 3 * MIN, vb);
    await add(B, 'cloud_sync_result', { operation: 'restore', result: 'failed' }, T - 3 * MIN, vb);
    await add(B, 'ad_availability', { format: 'rewarded', placement: 'weird<>', result: 'hax' }, T - 3 * MIN, vb);
    await add(B, 'store_opened', {}, T - 3 * MIN, vb);
    await add(B, 'store_opened', {}, T - 3 * MIN, vb);
    await add(B, 'purchase_initiated', { productId: '<script>', kind: 'amber' }, T - 3 * MIN, vb);
    await add(B, 'purchase_failed', { productId: 'com.wordshift.amber_small', kind: 'amber', reason: 'SECRET_FREE_TEXT' }, T - 3 * MIN, vb);
    await add(B, 'purchase_cancelled', {}, T - 3 * MIN, vb);
    await add(B, 'daily_completed', { stars: 3, streak: 1 }, T - 3 * MIN, vb);
    await add(B, 'deep_link_opened', { url: 'wordshift://SECRET_FREE_TEXT' }, T - 3 * MIN, vb);
    await add(B, 'daily_amber_claimed', { amount: 5000 }, T - 3 * MIN, vb);
    await add(B, 'daily_amber_claimed', { amount: 'lots' }, T - 3 * MIN, vb);
    await add('inst_zz_other_new', 'app_open', {}, T - 20 * MIN);
    await add('inst_zz_other_new', 'cloud_sync_result', { operation: 'restore', result: 'saved' }, T - 20 * MIN);
    await add('inst_zz_returning', 'app_open', {}, T - 10 * MIN, '1.4.5');
    await add('inst_zz_returning', 'puzzle_started', {}, T - 10 * MIN, '1.4.5');
    const today = localDay(T, TZ);
    const yesterday = localDay(Date.parse(`${today}T12:00:00Z`) - DAY, 'UTC');
    await db.query(`insert into public.daily_scores_v2(owner, date, board_version, time_ms, stars, hints, handle, created_at) values
      ($1, $4, 'daily_v2_abc', 60000, 3, 0, 'HANDLE_SENTINEL', $6::timestamptz),
      ($2, $4, 'daily_v2_abc', 50000, 3, 0, 'HANDLE_SENTINEL', $6::timestamptz),
      ($3, $4, '<b>', 70000, 2, 1, 'HANDLE_SENTINEL', $6::timestamptz),
      ('inst_zz_returning', $5, 'daily_v2_old', 70000, 2, 1, 'HANDLE_SENTINEL', $7::timestamptz)`,
    [B, 'inst_zz_tester_old', A, today, yesterday, iso(T - 5000), iso(T - 30 * HOUR)]);

    // ---- dashboard_live, as the dashboard role.
    const l = await asReader(() => live(TZ, launch));
    outputs.live = l;
    validate('live', l, 'live');
    privacy(l, 'live');
    check([l.tz, l.tzFallback, l.launchAt, l.launchAtIgnored, l.today], [TZ, false, launch, false, today], 'live header');
    ok(Date.parse(l.todayStart) <= T - HOUR && Date.parse(l.todayStart) > T - DAY, 'todayStart is local midnight');
    check(localDay(Date.parse(l.todayStart), TZ), today, 'todayStart is in today');
    check(localDay(Date.parse(l.todayStart) - 1000, TZ) === today, false, 'todayStart is the first second of today');
    check(l.freshness, { lastEventReceivedAt: iso(T - 30 * 1000), lastPlayerEventReceivedAt: iso(T - MIN) }, 'freshness');
    check(l.testers, { devices: 4, activeToday: 2, recentBeforeLaunch: 1 }, 'testers');
    check([l.now.active5m, l.now.active60m, l.now.events60m], [2, 4, 41], 'now');
    check(l.now.perMinute.length, 60, 'perMinute length');
    check(l.now.perMinute.reduce((a, b) => a + b, 0), 41, 'perMinute sum');
    check(l.todayCounts, {
      newInstalls: 2, otherNewInstalls: 1, newInstallsFinishedTutorial: 1, activeInstalls: 4, events: 41, puzzlesStarted: 3, puzzlesCompleted: 3,
      installsCompletingPuzzle: 2, dailiesCompleted: 1, onboardingCompleted: 1, storeOpens: 3, purchases: 1, purchasers: 1,
      dailyAmberClaims: 3, dailyAmberGranted: 1060, appErrors: 3, installsWithAppError: 2,
    }, 'todayCounts');
    const { databaseBytes, ...health } = l.health;
    ok(Number.isSafeInteger(databaseBytes) && databaseBytes > 0, 'databaseBytes');
    check(health, {
      activeInstalls24h: 4, appErrors24h: 3, installsWithAppError24h: 2,
      appErrorsBySource: [
        { source: '(none)', events: 1, installs: 1 }, { source: 'home_load', events: 1, installs: 1 },
        { source: '(other)', events: 1, installs: 1 }],
      cloudSync: [
        { operation: 'restore', result: 'failed', events: 1, installs: 1 }, { operation: 'restore', result: 'saved', events: 1, installs: 1 },
        { operation: 'upload', result: 'conflict', events: 1, installs: 1 }, { operation: 'upload', result: 'saved', events: 1, installs: 1 }],
      saveFailures24h: 1, saveConflicts24h: 1, syncInstalls24h: 3, saveFailureInstalls24h: 1, saveConflictInstalls24h: 1,
      puzzleGenerationFailed24h: 0,
    }, 'health');
    check(l.ads24h, [
      { format: 'interstitial', placement: '(none)', result: 'suppressed', events: 1 },
      { format: 'rewarded', placement: '(other)', result: '(other)', events: 1 },
      { format: 'rewarded', placement: 'hint_recovery', result: 'completed', events: 1 }], 'ads24h');
    check(l.versions24h, [
      { appVersion: '1.4.6', installs: 2, events: 20, appErrors: 1 },
      { appVersion: '1.4.5', installs: 1, events: 2, appErrors: 0 },
      { appVersion: '(other)', installs: 1, events: 19, appErrors: 2 }], 'versions24h');
    check(l.dailyChallenge, {
      date: today, entrantsToday: 2, testerEntrantsToday: 1, entrantsYesterday: 1, submissions24h: 3,
      lastSubmissionAt: iso(T - 5000),
      boardVersionsToday: [{ boardVersion: 'daily_v2_abc', entrants: 2 }, { boardVersion: '(other)', entrants: 1 }],
    }, 'dailyChallenge');
    // Without a launch time nobody is a tester.
    const l0 = await live(TZ, null);
    validate('live', l0, 'live without launch');
    check([l0.launchAt, l0.launchAtIgnored, l0.testers], [null, false, null], 'live without launch');
    check([l0.todayCounts.activeInstalls, l0.now.active5m, l0.todayCounts.purchases, l0.health.appErrors24h], [6, 4, 2, 4], 'testers counted without launch');
    check(l0.dailyChallenge.entrantsToday, 3, 'tester Daily entrant counted without launch');
    for (const bad of [iso(T + DAY), '2019-06-01T00:00:00Z']) {
      const lb = await live(TZ, bad);
      check([lb.launchAt, lb.launchAtIgnored, lb.testers], [null, true, null], `launch ${bad} ignored`);
    }

    // ---- dashboard_cohorts.
    const c = await asReader(() => cohorts(TZ, launch));
    outputs.cohorts = c;
    validate('cohorts', c, 'cohorts');
    privacy(c, 'cohorts');
    check([c.tz, c.tzFallback, c.launchAt, c.launchAtIgnored, c.windowFrom], [TZ, false, launch, false, launch], 'cohorts header');
    check(c.installsByDay.length, 6, 'one row per local day since launch');
    check([c.installsByDay[0].day, c.installsByDay[5].day], [localDay(L, TZ), today], 'installsByDay range');
    check(c.installsByDay.reduce((a, r) => a + r.newInstalls, 0), 6, 'new installs since launch');
    check(c.installsByDay.reduce((a, r) => a + r.otherNewInstalls, 0), 2, 'other new devices since launch');
    check(c.installsByDay[5], { day: today, newInstalls: 2, otherNewInstalls: 1, activeInstalls: 4, puzzlesCompleted: 3,
      dailiesCompleted: 1, purchases: 1, appErrors: 3 }, 'today row');
    check(c.retention.utcToday, utcDay(T), 'utcToday');
    const pending = { matured: false, retained: 0, rate: null };
    const todayCohorts = new Map();
    for (const [at, fresh] of [[T - 40 * MIN, true], [T - 45 * MIN, true], [T - 20 * MIN, false]]) {
      const k = utcDay(at);
      const v = todayCohorts.get(k) ?? { installs: 0, otherInstalls: 0 };
      if (fresh) v.installs++; else v.otherInstalls++;
      todayCohorts.set(k, v);
    }
    const expectedCohorts = [...todayCohorts.entries()].sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([day, v]) => ({ cohortDay: day, ...v, d1: pending, d7: pending, d14: pending }));
    expectedCohorts.push(
      { cohortDay: utcDay(D(2)), installs: 1, otherInstalls: 0, d1: { matured: true, retained: 0, rate: 0 }, d7: pending, d14: pending },
      { cohortDay: utcDay(D(3)), installs: 2, otherInstalls: 0, d1: { matured: true, retained: 1, rate: 0.5 }, d7: pending, d14: pending },
      { cohortDay: utcDay(D(4)), installs: 1, otherInstalls: 1, d1: { matured: true, retained: 1, rate: 1 }, d7: pending, d14: pending });
    check(c.retention.cohorts, expectedCohorts, 'retention cohorts');
    check(c.retention.pooled, { d1: { installs: 4, retained: 2 }, d7: { installs: 0, retained: 0 }, d14: { installs: 0, retained: 0 } }, 'pooled');
    check(c.funnel, { installs: 6, startedLastHour: 2, steps: [
      { step: 'app_open', installs: 5 }, { step: 'cold_open_puzzle', installs: 6 }, { step: 'first_puzzle_completed', installs: 4 },
      { step: 'home_empty', installs: 1 }, { step: 'fox_invited', installs: 1 }, { step: 'going_to_pit', installs: 0 },
      { step: 'pit_intro', installs: 0 }, { step: 'pit_offering', installs: 0 }, { step: 'returning_home', installs: 0 },
      { step: 'unlock_explained', installs: 0 }, { step: 'onboarding_complete', installs: 1 },
      { step: 'second_puzzle_completed', installs: 2 }] }, 'funnel');
    // Without a launch time: 30 days, testers are ordinary installs, D7 matures.
    const c0 = await cohorts(TZ, null);
    validate('cohorts', c0, 'cohorts without launch');
    check(c0.installsByDay.length, 30, '30 local days without launch');
    check(c0.retention.pooled, { d1: { installs: 5, retained: 2 }, d7: { installs: 1, retained: 1 }, d14: { installs: 0, retained: 0 } }, 'pooled without launch');
    check(c0.retention.cohorts.find((r) => r.cohortDay === utcDay(D(9))),
      { cohortDay: utcDay(D(9)), installs: 1, otherInstalls: 0, d1: { matured: true, retained: 0, rate: 0 },
        d7: { matured: true, retained: 1, rate: 1 }, d14: pending }, 'D7 matured cohort');
    check(c0.retention.cohorts.find((r) => r.cohortDay === utcDay(T - 10 * DAY))?.otherInstalls, 1, 'tester without cold open is an other install');
    check(c0.funnel.installs, 7, 'funnel without launch');

    // ---- dashboard_progress.
    const p = await asReader(() => progress(launch));
    outputs.progress = p;
    validate('progress', p, 'progress');
    privacy(p, 'progress');
    check([p.launchAt, p.launchAtIgnored, p.since], [launch, false, launch], 'progress header');
    check(p.story, {
      installsOpened: 7,
      phases: [
        { phase: 1, installs: 2, medianPuzzlesSolved: 13 }, { phase: 2, installs: 1, medianPuzzlesSolved: 30 },
        { phase: 3, installs: 0, medianPuzzlesSolved: null }, { phase: 4, installs: 0, medianPuzzlesSolved: null },
        { phase: 5, installs: 0, medianPuzzlesSolved: null }],
      depth: [1, 3, 5, 8, 12, 20, 30, 50, 90, 120].map((k) => ({ atLeast: k, installs: k === 1 ? 3 : k === 3 ? 1 : 0 })),
    }, 'story');
    check(p.store, { opens: 3, openers: 2, purchases: 2, purchasers: 2, purchasersFromStore: 1, products: [
      { productId: 'com.wordshift.starter', kind: 'starter', initiated: 1, purchased: 1, purchasers: 1, cancelled: 0, failed: 0 },
      { productId: 'com.wordshift.patron_key', kind: 'patron', initiated: 0, purchased: 1, purchasers: 1, cancelled: 0, failed: 0 },
      { productId: '(other)', kind: 'amber', initiated: 1, purchased: 0, purchasers: 0, cancelled: 0, failed: 0 },
      { productId: '(none)', kind: '(none)', initiated: 0, purchased: 0, purchasers: 0, cancelled: 1, failed: 0 },
      { productId: 'com.wordshift.amber_small', kind: 'amber', initiated: 0, purchased: 0, purchasers: 0, cancelled: 0, failed: 1 }] }, 'store');
    const p0 = await progress(null);
    validate('progress', p0, 'progress without launch');
    check([p0.launchAt, p0.launchAtIgnored, p0.story.installsOpened, p0.story.phases[2].installs, p0.store.purchases],
      [null, false, 10, 1, 3], 'progress without launch counts testers');
    ok(Math.abs(Date.parse(p0.since) - (T - 30 * DAY)) < 5 * MIN, 'progress window is 30 days without launch');
    const pf = await progress(iso(T + DAY));
    check([pf.launchAt, pf.launchAtIgnored], [null, true], 'future launch ignored in progress');
    const pOld = await progress('2026-01-01T00:00:00Z');
    ok(Math.abs(Date.parse(pOld.since) - (T - 90 * DAY)) < 5 * MIN, 'progress window never exceeds 90 days');

    // ---- Hostile and invalid time zones fall back to UTC.
    for (const tz of ["UTC'; drop table events; --", 'Mars/Olympus', 'UTC+5', 'A'.repeat(65), '', 'Europe/../etc', null]) {
      const lb = await asReader(() => live(tz, launch));
      check([lb.tz, lb.tzFallback], ['UTC', true], `tz ${JSON.stringify(tz)} falls back`);
      const cb = await cohorts(tz, launch);
      check([cb.tz, cb.tzFallback], ['UTC', true], `cohorts tz ${JSON.stringify(tz)} falls back`);
    }
    check((await one('select count(*)::int as n from public.events')).n > 40, true, 'events table intact');
    for (const tz of ['America/Los_Angeles', 'Europe/London', 'Asia/Kolkata']) {
      const lz = await live(tz, launch);
      check([lz.tz, lz.tzFallback, lz.today], [tz, false, localDay(Date.now(), tz)], `tz ${tz} accepted`);
    }

    // ---- Local midnight boundaries (fresh event set).
    await db.exec('delete from public.events; delete from public.daily_scores_v2; delete from public.analytics_install_first_seen;');
    for (const tz of ['America/Los_Angeles', 'Europe/London']) {
      await db.exec('delete from public.events');
      let m = Date.parse((await one(`select to_char((((now() at time zone $1)::date)::timestamp at time zone $1) at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS"Z"') as m`, [tz])).m);
      const sinceMidnight = Date.now() - m;
      if (sinceMidnight < 10_000) { await sleep(10_000 - sinceMidnight); m = Date.parse((await one(`select to_char((((now() at time zone $1)::date)::timestamp at time zone $1) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as m`, [tz])).m); }
      await add('inst_zz_before_midnight', 'app_open', {}, m - 1000);
      await add('inst_zz_before_midnight', 'onboarding_step', cold, m - 1000);
      await add('inst_zz_after_midnight', 'app_open', {}, m + 1000);
      await add('inst_zz_after_midnight', 'onboarding_step', cold, m + 1000);
      const lz = await live(tz, null);
      check([lz.todayStart, lz.today], [iso(m), localDay(m + 1000, tz)], `${tz} midnight`);
      check([lz.todayCounts.newInstalls, lz.todayCounts.activeInstalls, lz.todayCounts.events, lz.health.activeInstalls24h],
        [1, 1, 2, 2], `${tz} today excludes the second before midnight`);
      const cz = await cohorts(tz, null);
      const last = cz.installsByDay.at(-1);
      const previous = cz.installsByDay.at(-2);
      check([last.day, last.newInstalls, previous.day, previous.newInstalls], [localDay(m + 1000, tz), 1, localDay(m - 1000, tz), 1], `${tz} installsByDay split at midnight`);
    }

    if (perf) {
      await db.exec('delete from public.events');
      await db.query(`insert into public.events(install_id, event_id, platform, app_version, type, data, created_at, received_at)
        select 'inst_zz_perf_' || (g % 3000), 'e' || g, 'android', '1.4.6',
          (array['app_open','puzzle_started','puzzle_completed','onboarding_step','store_opened','ad_availability','cloud_sync_result'])[1 + g % 7],
          case g % 7 when 3 then '{"step":"cold_open_puzzle"}'::jsonb when 2 then jsonb_build_object('puzzlesSolved', g % 40) else '{}'::jsonb end,
          now() - (g % 1728000) * interval '1 second', now() - (g % 1728000) * interval '1 second'
        from generate_series(1, 300000) g`);
      await db.exec('analyze public.events');
      const perfMs = {};
      for (const [name, fn] of [['live', () => live('UTC', null)], ['cohorts', () => cohorts('UTC', null)], ['progress', () => progress(null)]]) {
        const t0 = Date.now();
        await fn();
        perfMs[name] = Date.now() - t0;
      }
      ok(perfMs.cohorts < 5000, `cohorts over 300,000 events took ${perfMs.cohorts} ms`);
      return { checks, contractChecked: Boolean(contract), outputs, perfMs };
    }
    return { checks, contractChecked: Boolean(contract), outputs };
  } finally {
    await db.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const require = createRequire(resolve(process.argv[2] ?? 'package.json'));
  const { PGlite } = require('@electric-sql/pglite');
  const result = await rehearseDashboard({ PGlite, perf: process.env.DASHBOARD_PERF === '1' });
  console.log(JSON.stringify({ checks: result.checks, contractChecked: result.contractChecked, perfMs: result.perfMs,
    result: 'passed', engine: 'PGlite PostgreSQL', remoteWrites: 0 }));
}
