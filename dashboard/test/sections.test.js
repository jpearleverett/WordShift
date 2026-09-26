import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PublicError } from '../src/cache.js';
import { loadConfig } from '../src/config.js';
import { shiftTimestamps } from '../src/demo.js';
import { createSections } from '../src/sections.js';

const NOW = Date.parse('2026-09-26T18:30:00Z');
const quietLog = { info() {}, warn() {}, error() {} };
const fixture = (s) => JSON.parse(readFileSync(new URL(`./fixtures/${s}.json`, import.meta.url), 'utf8'));
const env = { DASHBOARD_PASSWORD: 'x'.repeat(16), SESSION_SECRET: 'y'.repeat(40), DASHBOARD_LAUNCH_AT: '2026-09-26T13:00:00Z' };

test('no database settings: not_configured envelopes, external still works', async () => {
  const { config, notices } = loadConfig(env, NOW);
  const sections = createSections({ config, notices, db: null, nowMs: () => NOW, log: quietLog });
  const live = await sections.get('live');
  assert.deepEqual(live, {
    ok: false, section: 'live', serverNow: '2026-09-26T18:30:00Z', fetchedAt: null, ttlSec: 20, stale: false,
    error: { code: 'not_configured', message: 'Database settings are missing. Re-run deploy.sh.', at: '2026-09-26T18:30:00Z' },
    notices: ['db_not_configured'], data: null,
  });
  const ext = await sections.get('external');
  assert.equal(ext.ok, true);
  assert.equal(ext.data.revenuecat.status, 'not_configured');
  assert.equal(ext.data.sentry.status, 'not_configured');
  assert.deepEqual(ext.data.links.map((l) => l.id), ['play_console', 'admob', 'revenuecat', 'sentry']);
});

test('a payload that fails the contract becomes bad_payload; a later good one recovers', async () => {
  let now = NOW;
  let payload = { schemaVersion: 2 };
  const warnings = [];
  const { config, notices } = loadConfig({ ...env, DB_PASSWORD: 'p', DB_HOST: 'aws-0-us-east-1.pooler.supabase.com', SUPABASE_PROJECT_REF: 'rsppoarumebdrsbfrqdi' }, NOW);
  const db = { call: async () => payload };
  const sections = createSections({ config, notices, db, nowMs: () => now, log: { ...quietLog, warn: (m, f) => warnings.push([m, f]) } });
  const bad = await sections.get('cohorts');
  assert.equal(bad.ok, false);
  assert.equal(bad.error.code, 'bad_payload');
  assert.equal(bad.data, null);
  assert.equal(warnings[0][0], 'bad_payload');
  assert.ok(!JSON.stringify(warnings).includes('schemaVersion":2'), 'the payload itself is not logged');
  payload = fixture('cohorts');
  now += 60_000;
  const good = await sections.get('cohorts');
  assert.equal(good.ok, true);
  assert.equal(good.fetchedAt, '2026-09-26T18:31:00Z');
  now += 300_000;
  db.call = async () => { throw new PublicError('db_timeout', 'The database query took too long.'); };
  const stale = await sections.get('cohorts');
  assert.equal(stale.ok, false);
  assert.equal(stale.stale, true);
  assert.equal(stale.fetchedAt, '2026-09-26T18:31:00Z');
  assert.deepEqual(stale.data, payload);
  assert.equal(stale.error.code, 'db_timeout');
});

test('demo mode serves shifted fixtures and never touches the database', async () => {
  const { config, notices } = loadConfig({ ...env, DASHBOARD_DEMO: '1' }, NOW);
  const later = NOW + 3_600_000;
  const sections = createSections({ config, notices, db: { call: () => assert.fail('no database in demo') }, nowMs: () => later, log: quietLog,
    fixtureDirs: [fileURLToPath(new URL('./fixtures/', import.meta.url))] });
  const live = await sections.get('live');
  assert.equal(live.ok, true);
  assert.deepEqual(live.notices, ['demo_data']);
  assert.equal(live.data.generatedAt, '2026-09-26T19:30:00Z');
  assert.equal(live.data.today, '2026-09-26', 'calendar days are not shifted');
  assert.equal(live.data.freshness.lastEventReceivedAt, '2026-09-26T19:29:48Z');
  const missing = createSections({ config, notices, db: null, nowMs: () => later, log: quietLog, fixtureDirs: ['/nonexistent/'] });
  assert.equal((await missing.get('live')).error.code, 'demo_missing');
  assert.deepEqual(shiftTimestamps({ a: ['2026-01-01T00:00:00Z', '2026-01-01'], b: 3 }, 1000), { a: ['2026-01-01T00:00:01Z', '2026-01-01'], b: 3 });
});

test('scenario envelopes: served whole, shifted to now, demo notice added', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { scenarioEnvelope } = await import('../src/demo.js');
  const root = mkdtempSync(join(tmpdir(), 'wsd-scenario-'));
  try {
    mkdirSync(join(root, 'degraded'));
    writeFileSync(join(root, 'degraded', 'live.json'), JSON.stringify({ ok: true, section: 'live', serverNow: '2026-09-26T22:40:20Z',
      fetchedAt: '2026-09-26T22:40:02Z', ttlSec: 20, stale: false, error: null, notices: ['db_tls_unverified'], data: fixture('live') }));
    writeFileSync(join(root, 'degraded', 'cohorts.json'), JSON.stringify({ ok: false, section: 'cohorts', serverNow: '2026-09-26T22:40:20Z',
      fetchedAt: null, ttlSec: 300, stale: false, error: { code: 'db_timeout', message: 'x', at: '2026-09-26T22:39:40Z' }, notices: [], data: null }));
    const now = Date.parse('2026-09-27T10:00:00Z');
    const live = await scenarioEnvelope('degraded', 'live', now, `${root}/`);
    assert.equal(live.serverNow, '2026-09-27T10:00:00Z');
    assert.equal(live.fetchedAt, '2026-09-27T09:59:42Z');
    assert.deepEqual(live.notices, ['db_tls_unverified', 'demo_data']);
    const cohorts = await scenarioEnvelope('degraded', 'cohorts', now, `${root}/`);
    assert.equal(cohorts.ok, false);
    assert.equal(cohorts.error.at, '2026-09-27T09:59:20Z');
    assert.equal(await scenarioEnvelope('degraded', 'progress', now, `${root}/`), null);
    assert.equal(await scenarioEnvelope('../etc', 'live', now, `${root}/`), null, 'scenario names cannot walk out of the folder');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const { config } = loadConfig({ ...env, DASHBOARD_DEMO: '1', DASHBOARD_FIXTURES: '../x' }, NOW);
  assert.equal(config.demoScenario, null);
  assert.equal(loadConfig({ ...env, DASHBOARD_DEMO: '1', DASHBOARD_FIXTURES: 'week-two' }, NOW).config.demoScenario, 'week-two');
  assert.equal(loadConfig({ ...env, DASHBOARD_FIXTURES: 'week-two' }, NOW).config.demoScenario, null, 'only in demo mode');
});
