import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeConfig, isValidTimeZone, loadConfig, secretValues } from '../src/config.js';

const NOW = Date.parse('2026-09-26T18:30:00Z');
const REF = 'rsppoarumebdrsbfrqdi';
const base = (extra = {}) => ({
  DASHBOARD_PASSWORD: 'correct horse battery',
  SESSION_SECRET: 's'.repeat(40),
  DB_PASSWORD: 'Abc123Abc123Abc123Abc123',
  DB_HOST: 'aws-0-us-east-1.pooler.supabase.com',
  SUPABASE_PROJECT_REF: REF,
  DASHBOARD_TZ: 'America/New_York',
  DASHBOARD_LAUNCH_AT: '2026-09-26T13:00:00Z',
  ...extra,
});

test('a complete environment parses with defaults', () => {
  const { config, notices, errors, warnings } = loadConfig(base(), NOW);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  assert.deepEqual(notices, ['db_tls_unverified']);
  assert.equal(config.dbUser, `dashboard_reader.${REF}`);
  assert.equal(config.dbPort, 5432);
  assert.equal(config.dbName, 'postgres');
  assert.equal(config.port, 8080);
  assert.equal(config.tlsMode, 'encrypt_only');
  assert.equal(config.tz, 'America/New_York');
  assert.equal(config.launchAtIso, '2026-09-26T13:00:00Z');
  assert.equal(config.revenuecat, null);
  assert.equal(config.sentry, null);
  assert.deepEqual(config.sentryLink, { org: 'iridescent-games-9n', projectId: '4511612372844544', environment: 'production' });
  assert.equal(config.playConsoleUrl, 'https://play.google.com/console/');
  assert.equal(config.admobUrl, 'https://admob.google.com/');
  assert.equal(config.projectRef, REF);
});

test('missing or short password and session secret are fatal', () => {
  assert.equal(loadConfig(base({ DASHBOARD_PASSWORD: undefined }), NOW).errors.length, 1);
  assert.equal(loadConfig(base({ DASHBOARD_PASSWORD: 'short' }), NOW).errors.length, 1);
  assert.equal(loadConfig(base({ DASHBOARD_PASSWORD: 'x'.repeat(257) }), NOW).errors.length, 1);
  assert.equal(loadConfig(base({ SESSION_SECRET: 'x'.repeat(31) }), NOW).errors.length, 1);
  assert.equal(loadConfig(base({ DASHBOARD_PASSWORD: 'x'.repeat(12), SESSION_SECRET: 'y'.repeat(32) }), NOW).errors.length, 0);
});

test('missing database settings keep the server up with a notice', () => {
  for (const key of ['DB_PASSWORD', 'DB_HOST', 'SUPABASE_PROJECT_REF']) {
    const { config, notices, errors } = loadConfig(base({ [key]: undefined }), NOW);
    assert.deepEqual(errors, []);
    assert.equal(config.dbConfigured, false, key);
    assert.ok(notices.includes('db_not_configured'), key);
    assert.ok(!notices.includes('db_tls_unverified'), key);
  }
  const badRef = loadConfig(base({ SUPABASE_PROJECT_REF: 'NOT-A-REF' }), NOW);
  assert.equal(badRef.config.dbConfigured, false);
  assert.ok(badRef.warnings.length > 0);
});

test('a non-pooler host is accepted with a warning; a malformed one is refused', () => {
  const other = loadConfig(base({ DB_HOST: 'db.example.com' }), NOW);
  assert.equal(other.config.dbConfigured, true);
  assert.equal(other.warnings.length, 1);
  const bad = loadConfig(base({ DB_HOST: 'evil.com/x?sslmode=disable' }), NOW);
  assert.equal(bad.config.dbConfigured, false);
});

test('DB_PORT, DB_USER and DB_NAME overrides', () => {
  const { config } = loadConfig(base({ DB_PORT: '6543', DB_USER: 'dashboard_reader', DB_NAME: 'other_db' }), NOW);
  assert.equal(config.dbPort, 6543);
  assert.equal(config.dbUser, 'dashboard_reader');
  assert.equal(config.dbName, 'other_db');
  const bad = loadConfig(base({ DB_PORT: 'abc', DB_USER: 'x; drop', DB_NAME: 'a b' }), NOW);
  assert.equal(bad.config.dbPort, 5432);
  assert.equal(bad.config.dbUser, `dashboard_reader.${REF}`);
  assert.equal(bad.config.dbName, 'postgres');
  assert.equal(bad.warnings.length, 3);
});

test('an invalid time zone falls back to UTC with a notice', () => {
  for (const tz of ['Mars/Olympus', "UTC'; drop table events; --", 'x'.repeat(65)]) {
    const { config, notices } = loadConfig(base({ DASHBOARD_TZ: tz }), NOW);
    assert.equal(config.tz, 'UTC', tz);
    assert.ok(notices.includes('tz_invalid'), tz);
  }
  assert.equal(loadConfig(base({ DASHBOARD_TZ: undefined }), NOW).config.tz, 'UTC');
  assert.ok(!loadConfig(base({ DASHBOARD_TZ: undefined }), NOW).notices.includes('tz_invalid'));
  assert.equal(isValidTimeZone('Europe/London'), true);
  assert.equal(isValidTimeZone(''), false);
});

test('launch time: unset, invalid, future and offsets', () => {
  assert.ok(loadConfig(base({ DASHBOARD_LAUNCH_AT: undefined }), NOW).notices.includes('launch_at_unset'));
  for (const bad of ['yesterday', '2026-09-26', '2026-09-27T00:00:00Z', '2019-01-01T00:00:00Z', '2026-13-01T00:00:00Z']) {
    const { config, notices } = loadConfig(base({ DASHBOARD_LAUNCH_AT: bad }), NOW);
    assert.equal(config.launchAtIso, null, bad);
    assert.ok(notices.includes('launch_at_invalid'), bad);
  }
  assert.equal(loadConfig(base({ DASHBOARD_LAUNCH_AT: '2026-09-26T09:00:00-04:00' }), NOW).config.launchAtIso, '2026-09-26T13:00:00Z');
  assert.equal(loadConfig(base({ DASHBOARD_LAUNCH_AT: '2026-09-26T13:00:00.500Z' }), NOW).config.launchAtIso, '2026-09-26T13:00:00Z');
});

test('a CA certificate switches to verify mode; a damaged one keeps the database off', async () => {
  const { readFile } = await import('node:fs/promises');
  const pem = await readFile(new URL('./helpers/test-ca.pem', import.meta.url), 'utf8');
  const good = loadConfig(base({ DB_CA_CERT: pem }), NOW);
  assert.equal(good.config.tlsMode, 'verify');
  assert.match(good.config.caFingerprint, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  assert.ok(!good.notices.includes('db_tls_unverified'));
  const bad = loadConfig(base({ DB_CA_CERT: '-----BEGIN CERTIFICATE-----\nnope\n-----END CERTIFICATE-----' }), NOW);
  assert.equal(bad.config.dbConfigured, false);
  assert.equal(bad.config.tlsMode, 'encrypt_only');
  assert.ok(bad.notices.includes('db_not_configured'));
});

test('production fails closed without the CA; local runs stay encrypted with a notice', async () => {
  const { readFile } = await import('node:fs/promises');
  const pem = await readFile(new URL('./helpers/test-ca.pem', import.meta.url), 'utf8');
  const prodNoCa = loadConfig(base({ NODE_ENV: 'production' }), NOW);
  assert.equal(prodNoCa.config.dbConfigured, false);
  assert.equal(prodNoCa.config.dbOffReason, 'ca_missing');
  assert.deepEqual(prodNoCa.notices, ['db_ca_missing']);
  assert.equal(describeConfig(prodNoCa.config).dbOffReason, 'ca_missing');
  const prodCa = loadConfig(base({ NODE_ENV: 'production', DB_CA_CERT: pem }), NOW);
  assert.equal(prodCa.config.dbConfigured, true);
  assert.equal(prodCa.config.dbOffReason, null);
  assert.deepEqual(prodCa.notices, []);
  const local = loadConfig(base(), NOW);
  assert.equal(local.config.dbConfigured, true);
  assert.deepEqual(local.notices, ['db_tls_unverified']);
  const missing = loadConfig(base({ NODE_ENV: 'production', DB_HOST: undefined }), NOW);
  assert.equal(missing.config.dbOffReason, 'not_configured');
  assert.deepEqual(missing.notices, ['db_not_configured']);
});

test('RevenueCat needs both a v2 secret key and a project id', () => {
  assert.equal(loadConfig(base({ REVENUECAT_API_KEY: 'sk_abc123' }), NOW).config.revenuecat, null);
  assert.equal(loadConfig(base({ REVENUECAT_API_KEY: 'appl_abc', REVENUECAT_PROJECT_ID: 'proj1' }), NOW).config.revenuecat, null);
  assert.deepEqual(loadConfig(base({ REVENUECAT_API_KEY: 'sk_abc123', REVENUECAT_PROJECT_ID: 'proj1', REVENUECAT_CURRENCY: 'eur' }), NOW).config.revenuecat,
    { apiKey: 'sk_abc123', projectId: 'proj1', currency: 'EUR' });
  const badCurrency = loadConfig(base({ REVENUECAT_API_KEY: 'sk_abc123', REVENUECAT_PROJECT_ID: 'proj1', REVENUECAT_CURRENCY: 'XYZ' }), NOW);
  assert.equal(badCurrency.config.revenuecat.currency, null);
  assert.equal(badCurrency.warnings.length, 1);
});

test('Sentry defaults, and an invalid API base disables the panel', () => {
  const on = loadConfig(base({ SENTRY_AUTH_TOKEN: 'a'.repeat(64) }), NOW).config.sentry;
  assert.deepEqual(on, { token: 'a'.repeat(64), org: 'iridescent-games-9n', projectId: '4511612372844544', apiBase: 'https://us.sentry.io', environment: 'production' });
  for (const baseUrl of ['http://us.sentry.io', 'https://evil.example.com', 'https://sentry.io.evil.com']) {
    const { config, warnings } = loadConfig(base({ SENTRY_AUTH_TOKEN: 'a'.repeat(64), SENTRY_API_BASE: baseUrl }), NOW);
    assert.equal(config.sentry, null, baseUrl);
    assert.ok(warnings.length > 0, baseUrl);
  }
  assert.equal(loadConfig(base({ SENTRY_AUTH_TOKEN: 'a'.repeat(64), SENTRY_API_BASE: 'https://sentry.io/' }), NOW).config.sentry.apiBase, 'https://sentry.io');
});

test('link URLs must be https', () => {
  const { config, warnings } = loadConfig(base({ PLAY_CONSOLE_URL: 'http://example.com', ADMOB_URL: 'javascript:alert(1)' }), NOW);
  assert.equal(config.playConsoleUrl, 'https://play.google.com/console/');
  assert.equal(config.admobUrl, 'https://admob.google.com/');
  assert.equal(warnings.length, 2);
});

test('demo mode is refused in production', () => {
  const prod = loadConfig(base({ DASHBOARD_DEMO: '1', NODE_ENV: 'production', DASHBOARD_INSECURE_LOCAL_COOKIE: '1' }), NOW);
  assert.equal(prod.config.demo, false);
  assert.equal(prod.config.insecureLocalCookie, false);
  assert.ok(prod.warnings.some((w) => w.includes('DASHBOARD_DEMO')));
  const dev = loadConfig(base({ DASHBOARD_DEMO: '1' }), NOW);
  assert.equal(dev.config.demo, true);
  assert.deepEqual(dev.notices, ['demo_data']);
});

test('describeConfig never contains a secret value', async () => {
  const { readFile } = await import('node:fs/promises');
  const pem = await readFile(new URL('./helpers/test-ca.pem', import.meta.url), 'utf8');
  const env = base({
    DASHBOARD_PASSWORD: 'PASSWORD_SENTINEL_1234',
    SESSION_SECRET: 'SESSION_SENTINEL_'.padEnd(40, 'x'),
    DB_PASSWORD: 'DBPASS_SENTINEL_1234',
    DB_CA_CERT: pem,
    REVENUECAT_API_KEY: 'sk_RCSENTINEL123',
    REVENUECAT_PROJECT_ID: 'proj1',
    SENTRY_AUTH_TOKEN: 'SENTRYSENTINEL'.padEnd(64, 'a'),
  });
  const { config } = loadConfig(env, NOW);
  const text = JSON.stringify(describeConfig(config));
  for (const s of ['PASSWORD_SENTINEL', 'SESSION_SENTINEL', 'DBPASS_SENTINEL', 'RCSENTINEL', 'SENTRYSENTINEL', 'BEGIN CERTIFICATE']) {
    assert.ok(!text.includes(s), s);
  }
  assert.match(text, /"tlsMode":"verify"/);
  assert.equal(secretValues(config).length, 6);
});
