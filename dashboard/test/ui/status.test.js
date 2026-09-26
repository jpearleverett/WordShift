import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { computeStatus, collectIssues, healthVerdicts, THRESHOLDS } from '../../public/js/status.js';

const read = (name) => JSON.parse(readFileSync(new URL(`../fixtures/${name}.json`, import.meta.url), 'utf8'));
const NOW = Date.parse('2026-09-26T18:30:05Z');

function envelope(section, data, extra = {}) {
  return {
    ok: true, section, serverNow: '2026-09-26T18:30:05Z', fetchedAt: '2026-09-26T18:30:00Z',
    ttlSec: section === 'live' ? 20 : 300, stale: false, error: null, notices: [], data, ...extra,
  };
}

function base() {
  return {
    live: envelope('live', read('live')),
    cohorts: envelope('cohorts', read('cohorts')),
    progress: envelope('progress', read('progress')),
    external: envelope('external', read('external')),
  };
}

const byId = (verdicts) => Object.fromEntries(verdicts.map((v) => [v.id, v]));

test('returns exactly three verdicts in order', () => {
  const v = computeStatus(base(), NOW);
  assert.deepEqual(v.map((x) => x.id), ['data', 'players', 'problems']);
  for (const x of v) assert.ok(['good', 'warn', 'bad', 'neutral'].includes(x.level));
});

// --- Data -------------------------------------------------------------------

test('data: no live envelope yet', () => {
  const { data } = byId(computeStatus({}, NOW));
  assert.equal(data.level, 'bad');
  assert.equal(data.title, 'No data from the server');
  assert.equal(data.detail, 'Waiting for the first answer');
});

test('data: live failed with no earlier data shows the error', () => {
  const input = base();
  input.live = envelope('live', null, { ok: false, fetchedAt: null, error: { code: 'db_auth_failed', message: 'The database rejected the dashboard password.', at: '2026-09-26T18:30:00Z' } });
  const { data } = byId(computeStatus(input, NOW));
  assert.equal(data.level, 'bad');
  assert.match(data.detail, /rejected the dashboard password/);
});

test('data: arriving, quiet and stopped by age of the last PLAYER event', () => {
  const input = base();
  assert.equal(byId(computeStatus(input, NOW)).data.level, 'good');
  assert.equal(byId(computeStatus(input, NOW)).data.title, 'Data arriving');
  assert.match(byId(computeStatus(input, NOW)).data.detail, /^Last player event 17\u00a0s ago$/);
  const last = Date.parse(input.live.data.freshness.lastPlayerEventReceivedAt);
  assert.equal(byId(computeStatus(input, last + 300_000)).data.level, 'good');
  assert.equal(byId(computeStatus(input, last + 300_001)).data.title, 'Quiet');
  assert.equal(byId(computeStatus(input, last + 3_600_000)).data.level, 'warn');
  const stopped = byId(computeStatus(input, last + 3_600_001)).data;
  assert.equal(stopped.level, 'bad');
  assert.equal(stopped.title, 'No player events');
  assert.match(stopped.detail, /^Last player event 1\u00a0h ago/);
});

test('data: a test phone cannot keep the chip green on its own', () => {
  const input = base();
  input.live.data.freshness = { lastEventReceivedAt: '2026-09-26T18:30:00Z', lastPlayerEventReceivedAt: '2026-09-26T17:40:00Z' };
  const { data } = byId(computeStatus(input, NOW));
  assert.equal(data.level, 'warn');
  assert.equal(data.title, 'Quiet');
  assert.equal(data.detail, 'Last player event 50\u00a0min ago. A test phone sent one 5\u00a0s ago');
});

test('data: no events ever', () => {
  const input = base();
  input.live.data.freshness.lastEventReceivedAt = null;
  const { data } = byId(computeStatus(input, NOW));
  assert.equal(data.level, 'warn');
  assert.equal(data.title, 'No events yet');
});

test('data: only test devices have sent anything in 24 h', () => {
  const input = base();
  input.live.data.freshness.lastPlayerEventReceivedAt = null;
  const { data } = byId(computeStatus(input, NOW));
  assert.equal(data.level, 'warn', 'the pipeline works, but no player');
  assert.equal(data.title, 'No player events');
  assert.match(data.detail, /^None in 24\u00a0h\. Your test phones last sent one 17\u00a0s ago$/);
  assert.equal(byId(computeStatus(input, NOW + 3_600_000)).data.level, 'bad');
});

test('data: a stale live section is at least a warning', () => {
  const input = base();
  input.live.stale = true;
  input.live.error = { code: 'db_timeout', message: 'The database query took too long.', at: '2026-09-26T18:31:00Z' };
  const { data } = byId(computeStatus(input, NOW));
  assert.equal(data.level, 'warn');
  assert.equal(data.detail, 'Showing data from 14:30, refresh failed');
  // A stale, long-silent feed stays bad rather than improving to warn.
  const later = byId(computeStatus(input, NOW + 2 * 3_600_000)).data;
  assert.equal(later.level, 'bad');
});

test('data: the page itself offline is at least a warning', () => {
  const input = { ...base(), offline: true };
  const { data } = byId(computeStatus(input, NOW));
  assert.equal(data.level, 'warn');
  assert.match(data.detail, /cannot reach the server/);
});

// --- Players ----------------------------------------------------------------

test('players: new installs today, the same number as the Today tile', () => {
  const { players } = byId(computeStatus(base(), NOW));
  assert.equal(players.level, 'good');
  assert.equal(players.title, '142 new installs today');
  assert.equal(players.detail, '+3 other new devices, 14 playing now');
  const input = base();
  Object.assign(input.live.data.todayCounts, { newInstalls: 1, otherNewInstalls: 0 });
  assert.equal(byId(computeStatus(input, NOW)).players.title, '1 new install today');
  assert.equal(byId(computeStatus(input, NOW)).players.detail, '14 playing now');
});

test('players: nobody new but active in the last hour', () => {
  const input = base();
  input.live.data.todayCounts.newInstalls = 0;
  input.live.data.todayCounts.otherNewInstalls = 0;
  const { players } = byId(computeStatus(input, NOW));
  assert.equal(players.level, 'neutral');
  assert.equal(players.title, 'No new installs yet today');
  assert.equal(players.detail, '57 active in the last hour');
  input.live.data.todayCounts.otherNewInstalls = 1;
  assert.equal(byId(computeStatus(input, NOW)).players.detail, '+1 other new device, 57 active in the last hour');
});

test('players: nobody at all', () => {
  const input = base();
  Object.assign(input.live.data.todayCounts, { newInstalls: 0, otherNewInstalls: 0 });
  input.live.data.now.active60m = 0;
  const { players } = byId(computeStatus(input, NOW));
  assert.equal(players.title, 'Nobody playing right now');
  assert.equal(players.detail, '');
});

test('players: waiting before live data exists', () => {
  assert.equal(byId(computeStatus({}, NOW)).players.title, 'Waiting for data');
});

// --- Problems ---------------------------------------------------------------

function quiet() {
  const input = base();
  const h = input.live.data.health;
  Object.assign(h, {
    appErrors24h: 0, installsWithAppError24h: 0, appErrorsBySource: [], saveFailures24h: 0, saveConflicts24h: 0,
    syncInstalls24h: 50, saveFailureInstalls24h: 0, saveConflictInstalls24h: 0, puzzleGenerationFailed24h: 0,
  });
  h.cloudSync = [{ operation: 'upload', result: 'saved', events: 100, installs: 50 }];
  input.external.data.sentry.unresolvedIssues24h = 0;
  input.external.data.sentry.newestIssues = [];
  return input;
}

test('problems: nothing broken, when Sentry has answered', () => {
  const { problems } = byId(computeStatus(quiet(), NOW));
  assert.equal(problems.level, 'good');
  assert.equal(problems.title, 'Nothing broken');
  assert.equal(problems.detail, 'No app errors or failed saves in 24 h');
  assert.deepEqual(problems.issues, []);
});

test('problems: without Sentry the chip never claims nothing is broken', () => {
  const input = quiet();
  input.external.data.sentry.status = 'not_configured';
  let p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'neutral');
  assert.equal(p.title, 'No problems flagged');
  assert.equal(p.detail, 'Crashes not checked: Sentry is not connected');
  delete input.external;
  p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'neutral');
  assert.equal(p.detail, 'Crash numbers not loaded yet');
});

test('problems: still checking before live data', () => {
  const { problems } = byId(computeStatus({}, NOW));
  assert.equal(problems.level, 'neutral');
});

test('problems: a DB section that never loaded is bad', () => {
  const input = quiet();
  input.cohorts = envelope('cohorts', null, { ok: false, fetchedAt: null, error: { code: 'db_missing_function', message: 'Dashboard functions are missing.', at: '2026-09-26T18:30:00Z' } });
  const { problems } = byId(computeStatus(input, NOW));
  assert.equal(problems.level, 'bad');
  assert.equal(problems.title, 'Install history unavailable');
  assert.equal(problems.detail, 'Dashboard functions are missing.');
});

test('problems: app errors are judged by the share of active devices, with a 3-device floor', () => {
  const input = quiet();
  Object.assign(input.live.data.health, {
    appErrors24h: 20, installsWithAppError24h: 8, activeInstalls24h: 150,
    appErrorsBySource: [{ source: 'home_load', events: 15, installs: 6 }],
  });
  let p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'bad');
  assert.equal(p.title, '5.3% of active devices hit an app error');
  assert.equal(p.detail, '8 of 150 in 24 h. Top source: home_load');
  assert.equal(p.issues.length, 1, 'the warning is not repeated under the bad line');

  input.live.data.health.installsWithAppError24h = 3; // 2%: at or over 1%, under 5%
  p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'warn');
  assert.equal(p.title, '2.0% of active devices hit an app error');

  input.live.data.health.activeInstalls24h = 1500; // 3 of 1,500 = 0.2%: routine
  p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'good');
  assert.equal(p.detail, 'Below warning levels: 20 app errors on 3 devices');

  input.live.data.health.activeInstalls24h = 36;
  input.live.data.health.installsWithAppError24h = 2; // 5.6%, but under the floor
  p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'good');
});

test('problems: cloud saves are judged in devices, never in attempts', () => {
  const input = quiet();
  const h = input.live.data.health;
  // One subway player: 21 attempts, one device.
  Object.assign(h, { saveFailures24h: 21, saveFailureInstalls24h: 1, syncInstalls24h: 32 });
  let p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'good');
  assert.equal(p.detail, 'Below warning levels: 1 device with a failed save');

  Object.assign(h, { saveFailureInstalls24h: 10, syncInstalls24h: 50 }); // 20%
  p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'bad');
  assert.equal(p.title, 'Cloud saves are failing');
  assert.equal(p.detail, '10 of 50 syncing devices could not save in 24 h');

  h.saveFailureInstalls24h = 3; // 6%
  p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'warn');
  assert.equal(p.title, 'Cloud saves failing on 6.0% of devices');

  h.saveFailureInstalls24h = 2; // under the floor
  assert.equal(byId(computeStatus(input, NOW)).problems.level, 'good');
});

test('problems: conflicts by device share; puzzle generation failures always warn', () => {
  const input = quiet();
  const h = input.live.data.health;
  Object.assign(h, { saveConflicts24h: 8, saveConflictInstalls24h: 1 });
  let p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'good', 'one undecided player repeating conflicts is not a problem');
  assert.equal(p.detail, 'Below warning levels: 1 device with a save conflict');
  h.saveConflictInstalls24h = 3; // 6% of 50
  p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'warn');
  assert.equal(p.title, '3 devices with a save conflict');
  assert.equal(p.detail, 'Another phone has newer progress; waiting for the player to choose');
  h.saveConflictInstalls24h = 0;
  h.puzzleGenerationFailed24h = 2;
  p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.title, '2 puzzle generation failures in 24 h');
});

test('healthVerdicts agrees with THRESHOLDS at the edges', () => {
  const t = THRESHOLDS.appErrors;
  const at = (devices, active) => healthVerdicts({ installsWithAppError24h: devices, activeInstalls24h: active }).appErrors.level;
  assert.equal(at(t.minDevices - 1, 10), null);
  assert.equal(at(3, 300), 'warn');
  assert.equal(at(3, 301), null);
  assert.equal(at(5, 100), 'bad');
  assert.deepEqual(healthVerdicts(undefined).saveFailures, { level: null, events: 0, devices: 0, syncDevices: 0, share: null });
});

test('problems: Sentry crash-free rate thresholds need 50 sessions', () => {
  const input = quiet();
  const s = input.external.data.sentry;
  s.crashFreeSessionRate24h = 0.975;
  s.sessions24h = 400;
  let p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'bad');
  assert.equal(p.title, 'Crash-free sessions 97.50%');

  s.crashFreeSessionRate24h = 0.99;
  p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'warn');

  s.crashFreeSessionRate24h = 0.5;
  s.sessions24h = 49;
  p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'good', 'too few sessions to judge');

  s.sessions24h = 400;
  s.status = 'not_configured';
  p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'neutral', 'an unconfigured panel is not a problem, but crashes are unchecked');
});

test('problems: open Sentry issues are counted calmly, with a lower bound marker', () => {
  const input = quiet();
  input.external.data.sentry.unresolvedIssues24h = 5;
  input.external.data.sentry.unresolvedIssuesIsLowerBound = true;
  const p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'good');
  assert.equal(p.detail, 'Below warning levels: 5+ open Sentry issues');
});

test('problems: an unavailable external panel is a warning', () => {
  const input = quiet();
  input.external.data.revenuecat.status = 'unavailable';
  input.external.data.revenuecat.error = { code: 'http_401', message: 'RevenueCat rejected the key.' };
  const p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'warn');
  assert.equal(p.title, 'RevenueCat panel unavailable');
});

test('problems: a stale section is a warning', () => {
  const input = quiet();
  input.progress.stale = true;
  input.progress.error = { code: 'db_unreachable', message: 'Could not reach the database pooler.', at: '2026-09-26T18:29:00Z' };
  const p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'warn');
  assert.equal(p.title, 'Story and store numbers not refreshing');
  assert.equal(p.detail, 'Refresh failed: Could not reach the database pooler.');
});

test('problems: worst first, the rest counted as "and N more"', () => {
  // Spec fixture: 6 app errors on 4 of 153 devices (2.6%), 5 of 153 devices with a failed save (3.3%).
  let p = byId(computeStatus(base(), NOW)).problems;
  assert.equal(p.level, 'warn');
  assert.equal(p.title, '2.6% of active devices hit an app error');
  assert.equal(p.more, '');

  const input = base();
  input.live.data.health.saveConflictInstalls24h = 5;
  input.external.data.revenuecat.status = 'unavailable';
  input.cohorts = envelope('cohorts', null, { ok: false, fetchedAt: null, error: { code: 'db_timeout', message: 'The database query took too long.', at: '2026-09-26T18:30:00Z' } });
  p = byId(computeStatus(input, NOW)).problems;
  assert.equal(p.level, 'bad');
  assert.equal(p.title, 'Install history unavailable');
  assert.equal(p.more, 'and 3 more');
  const issues = collectIssues(input);
  assert.equal(issues.length, 4);
  assert.equal(issues[0].level, 'bad');
  assert.ok(issues.slice(1).every((i) => i.level === 'warn'));
});

test('every scenario fixture produces three verdicts without throwing', () => {
  const dir = new URL('../../fixtures/', import.meta.url);
  for (const scenario of readdirSync(dir)) {
    const load = (s) => JSON.parse(readFileSync(new URL(`${scenario}/${s}.json`, dir), 'utf8'));
    const input = { live: load('live'), cohorts: load('cohorts'), progress: load('progress'), external: load('external') };
    const now = Date.parse(input.live.serverNow);
    const verdicts = computeStatus(input, now);
    assert.equal(verdicts.length, 3, scenario);
  }
});
