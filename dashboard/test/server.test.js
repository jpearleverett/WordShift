import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';
import { createAuth, createLoginLimiter } from '../src/auth.js';
import { loadConfig, secretValues } from '../src/config.js';
import { createLogger } from '../src/log.js';
import { createSections } from '../src/sections.js';
import { CSP, SECURITY_HEADERS } from '../src/security.js';
import { loadStatic } from '../src/static.js';

const PASSWORD = 'PASSWORD_SENTINEL_42';
const SESSION_SECRET = 'SESSION_SENTINEL_'.padEnd(48, 'q');
const DB_PASSWORD = 'DBPASS_SENTINEL_0000';
const SENTRY_TOKEN = 'SENTRYSENTINEL'.padEnd(64, 'b');
const RC_KEY = 'sk_RCSENTINEL999';

const EXPECTED_HEADERS = {
  'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; manifest-src 'self'; font-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; require-trusted-types-for 'script'; trusted-types 'none'",
  'strict-transport-security': 'max-age=31536000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'same-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'x-robots-tag': 'noindex, nofollow',
  'cache-control': 'no-store',
};

let server;
let base;
let host;
let publicDir;
let now = Date.parse('2026-09-26T18:30:00Z');
const logLines = [];
const sectionCalls = [];

function fakeDb() {
  return {
    async call(section) {
      sectionCalls.push(section);
      const { readFile } = await import('node:fs/promises');
      return JSON.parse(await readFile(new URL(`./fixtures/${section}.json`, import.meta.url), 'utf8'));
    },
  };
}

before(async () => {
  publicDir = mkdtempSync(join(tmpdir(), 'wsd-public-'));
  mkdirSync(join(publicDir, 'js'));
  writeFileSync(join(publicDir, 'index.html'), '<!doctype html><title>WordShift live</title><script type="module" src="/app.js"></script>');
  writeFileSync(join(publicDir, 'login.html'), '<!doctype html><title>Sign in</title><p class="msg">{{MESSAGE}}</p>');
  writeFileSync(join(publicDir, 'app.js'), 'export {};');
  writeFileSync(join(publicDir, 'app.css'), 'body{}');
  writeFileSync(join(publicDir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  writeFileSync(join(publicDir, 'manifest.webmanifest'), '{}');
  writeFileSync(join(publicDir, 'notes.txt'), 'never served');
  writeFileSync(join(publicDir, 'js', 'api.js'), 'export const x = 1;');
  const { config, notices } = loadConfig({
    NODE_ENV: 'production',
    DASHBOARD_PASSWORD: PASSWORD,
    SESSION_SECRET,
    DB_PASSWORD,
    DB_HOST: 'aws-0-us-east-1.pooler.supabase.com',
    SUPABASE_PROJECT_REF: 'rsppoarumebdrsbfrqdi',
    DB_CA_CERT: readFileSync(new URL('./helpers/test-ca.pem', import.meta.url), 'utf8'),
    DASHBOARD_LAUNCH_AT: '2026-09-26T13:00:00Z',
    SENTRY_AUTH_TOKEN: SENTRY_TOKEN,
    REVENUECAT_API_KEY: RC_KEY,
    REVENUECAT_PROJECT_ID: 'proj1',
  }, now);
  const log = createLogger({ write: (line) => logLines.push(line), secrets: secretValues(config) });
  const fetchImpl = async (url, init) => {
    // External APIs fail, so their errors show up; the token must never be logged.
    log.info('fake_fetch', { url, authorization: init.headers.Authorization, note: `token ${init.headers.Authorization}` });
    return new Response('{}', { status: 401 });
  };
  const sections = createSections({ config, notices, db: fakeDb(), fetchImpl, nowMs: () => now, log });
  const app = createApp({
    config,
    auth: createAuth({ password: PASSWORD, sessionSecret: SESSION_SECRET, nowMs: () => now }),
    limiter: createLoginLimiter({ nowMs: () => now }),
    sections,
    staticFiles: await loadStatic(publicDir),
    log,
  });
  server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  host = `127.0.0.1:${server.address().port}`;
  base = `http://${host}`;
});

after(() => {
  server?.close();
  rmSync(publicDir, { recursive: true, force: true });
});

const req = (path, { method = 'GET', headers = {}, body } = {}) => fetch(`${base}${path}`, { method, headers, body, redirect: 'manual' });
const form = (password, extra = {}) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: `https://${host}`, ...extra },
  body: `username=owner&password=${encodeURIComponent(password)}`,
});
function assertSecurityHeaders(res, label) {
  for (const [name, value] of Object.entries(EXPECTED_HEADERS)) assert.equal(res.headers.get(name), value, `${label}: ${name}`);
  assert.equal(res.headers.get('access-control-allow-origin'), null, `${label}: no CORS`);
  for (const name of res.headers.keys()) assert.ok(!name.startsWith('access-control-'), `${label}: ${name}`);
}
let cookie;
async function signIn() {
  const res = await req('/login', form(PASSWORD, { 'X-Forwarded-For': '198.51.100.200' }));
  assert.equal(res.status, 303);
  cookie = res.headers.get('set-cookie').split(';')[0];
  return res;
}

test('the header table matches the spec (Referrer-Policy is same-origin, see security.js)', () => {
  assert.equal(CSP, EXPECTED_HEADERS['content-security-policy']);
  assert.deepEqual(Object.fromEntries(Object.entries(SECURITY_HEADERS).map(([k, v]) => [k.toLowerCase(), v])), EXPECTED_HEADERS);
});

test('/healthz and /robots.txt are public', async () => {
  const res = await req('/healthz');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assertSecurityHeaders(res, 'healthz');
  const robots = await req('/robots.txt');
  assert.equal(await robots.text(), 'User-agent: *\nDisallow: /\n');
  assert.equal(sectionCalls.length, 0, 'healthz never touches the database');
});

test('without a session: page redirects, API is 401 JSON, scripts are 401 text, login assets are public', async () => {
  const root = await req('/');
  assert.equal(root.status, 303);
  assert.equal(root.headers.get('location'), '/login');
  assertSecurityHeaders(root, '303');
  for (const s of ['live', 'cohorts', 'progress', 'external']) {
    const res = await req(`/api/${s}`);
    assert.equal(res.status, 401);
    assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
    assert.deepEqual(await res.json(), { ok: false, error: { code: 'unauthorized', message: 'Sign in again.' } });
    assertSecurityHeaders(res, '401');
  }
  for (const p of ['/app.js', '/js/api.js']) {
    const res = await req(p);
    assert.equal(res.status, 401);
    assert.equal(await res.text(), 'Sign in first.');
  }
  for (const [p, type] of [['/app.css', 'text/css; charset=utf-8'], ['/favicon.svg', 'image/svg+xml'], ['/manifest.webmanifest', 'application/manifest+json']]) {
    const res = await req(p);
    assert.equal(res.status, 200, p);
    assert.equal(res.headers.get('content-type'), type);
    assertSecurityHeaders(res, p);
  }
  assert.equal(sectionCalls.length, 0);
});

test('login page: fixed messages only, never echoes input', async () => {
  const page = await req('/login?e=wrong');
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('content-type'), 'text/html; charset=utf-8');
  assert.match(await page.text(), /That password did not work\./);
  assert.match(await (await req('/login?e=wait')).text(), /Too many tries\. Wait a few minutes, then try again\./);
  assert.match(await (await req('/login?e=out')).text(), /You are signed out on this device\./);
  const hostile = await (await req('/login?e=%3Cscript%3Ealert(1)%3C/script%3E')).text();
  assert.ok(!hostile.includes('<script>'));
  assert.match(hostile, /<p class="msg"><\/p>/);
  assert.ok(!(await (await req('/login?e=__proto__')).text()).includes('undefined'));
});

test('wrong password, throttling and a successful sign-in', async () => {
  const wrong = await req('/login', form('nope', { 'X-Forwarded-For': '203.0.113.5' }));
  assert.equal(wrong.status, 303);
  assert.equal(wrong.headers.get('location'), '/login?e=wrong');
  assert.equal(wrong.headers.get('set-cookie'), null);
  assertSecurityHeaders(wrong, 'wrong');
  const throttled = await req('/login', form(PASSWORD, { 'X-Forwarded-For': '203.0.113.5' }));
  assert.equal(throttled.headers.get('location'), '/login?e=wait', 'blocked even with the right password');
  assert.equal(throttled.headers.get('set-cookie'), null);
  now += 1000;
  const spoofed = await req('/login', form('nope', { 'X-Forwarded-For': '203.0.113.5, 192.0.2.99' }));
  assert.equal(spoofed.headers.get('location'), '/login?e=wrong', 'the rightmost address is the one throttled');
  const res = await signIn();
  assert.equal(res.headers.get('location'), '/');
  assert.match(res.headers.get('set-cookie'), /^__Host-wsd=v1\.[0-9]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+; Path=\/; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict$/);
  const again = await req('/login', { headers: { Cookie: cookie } });
  assert.equal(again.status, 303);
  assert.equal(again.headers.get('location'), '/');
});

test('POST origin checks, body limits and content type', async () => {
  const foreign = await req('/login', form(PASSWORD, { Origin: 'https://evil.example' }));
  assert.equal(foreign.status, 403);
  assert.equal(await foreign.text(), 'Forbidden');
  assertSecurityHeaders(foreign, '403');
  const plainHttp = await req('/login', form(PASSWORD, { Origin: `http://${host}` }));
  assert.equal(plainHttp.status, 403, 'http origin refused in production');
  const noOriginCross = await fetch(`${base}/login`, { method: 'POST', redirect: 'manual', body: 'password=x',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Sec-Fetch-Site': 'cross-site' } });
  assert.equal(noOriginCross.status, 403);
  const nullCross = await req('/login', form(PASSWORD, { Origin: 'null', 'Sec-Fetch-Site': 'cross-site' }));
  assert.equal(nullCross.status, 403);
  const nullSame = await req('/login', form('nope', { Origin: 'null', 'Sec-Fetch-Site': 'same-origin', 'X-Forwarded-For': '192.0.2.50' }));
  assert.equal(nullSame.status, 303, 'Origin null is accepted when the browser says same-origin');
  const tooBig = await req('/login', { ...form('x'), body: `password=${'a'.repeat(3000)}` });
  assert.equal(tooBig.status, 413);
  const json = await req('/login', { ...form('x'), headers: { 'Content-Type': 'application/json', Origin: `https://${host}` }, body: '{"password":"x"}' });
  assert.equal(json.status, 415);
});

test('methods: 405 with Allow, OPTIONS 405, HEAD without a body, long URL 414', async () => {
  const del = await req('/api/live', { method: 'DELETE' });
  assert.equal(del.status, 405);
  assert.equal(del.headers.get('allow'), 'GET, HEAD');
  assertSecurityHeaders(del, '405');
  const opt = await req('/api/live', { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'GET' } });
  assert.equal(opt.status, 405);
  assertSecurityHeaders(opt, 'OPTIONS');
  const getLogout = await req('/logout');
  assert.equal(getLogout.status, 405);
  assert.equal(getLogout.headers.get('allow'), 'POST');
  const head = await req('/healthz', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  assert.equal((await req(`/${'a'.repeat(2100)}`)).status, 414);
});

// fetch() normalises dot segments before sending, so traversal probes go out raw.
function rawGet(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: server.address().port, path, method: 'GET', headers: { Host: host, ...headers } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res));
    });
    r.on('error', reject);
    r.end();
  });
}

test('no path traversal, no directory listing, no hidden files', async () => {
  if (!cookie) await signIn();
  for (const p of ['/..%2f..%2fetc/passwd', '/js/../server.js', '/js/../../src/server.js', '/../package.json', '/index.html', '/login.html',
    '/js/', '/js', '/notes.txt', '/src/server.js', '/package.json', '/%2e%2e/%2e%2e/etc/passwd', '/js/%2e%2e/app.js.map', '/api', '/api/unknown']) {
    const res = await rawGet(p, { Cookie: cookie });
    assert.equal(res.statusCode, 404, p);
    assert.equal(res.headers['content-security-policy'], EXPECTED_HEADERS['content-security-policy'], p);
  }
  const absolute = await rawGet('http://evil.example/api/live');
  assert.equal(absolute.statusCode, 400, 'absolute-form request targets are refused');
});

test('with a session: the page, scripts and the four API envelopes', async () => {
  if (!cookie) await signIn();
  const page = await req('/', { headers: { Cookie: cookie } });
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('content-type'), 'text/html; charset=utf-8');
  assertSecurityHeaders(page, 'page');
  const js = await req('/js/api.js', { headers: { Cookie: cookie } });
  assert.equal(js.status, 200);
  assert.equal(js.headers.get('content-type'), 'text/javascript; charset=utf-8');
  assertSecurityHeaders(js, 'js');
  for (const [s, ttl] of [['live', 20], ['cohorts', 300], ['progress', 300], ['external', 300]]) {
    const res = await req(`/api/${s}`, { headers: { Cookie: cookie } });
    assert.equal(res.status, 200, s);
    assertSecurityHeaders(res, s);
    const env = await res.json();
    assert.deepEqual(Object.keys(env).sort(), ['data', 'error', 'fetchedAt', 'notices', 'ok', 'section', 'serverNow', 'stale', 'ttlSec']);
    assert.equal(env.ok, true);
    assert.equal(env.section, s);
    assert.equal(env.ttlSec, ttl);
    assert.match(env.serverNow, /^2026-09-26T18:3[0-9]:[0-9]{2}Z$/);
    assert.equal(env.error, null);
    assert.equal(env.stale, false);
    assert.deepEqual(env.notices, [], 'production with the CA: verified, no notice');
    assert.ok(env.data);
  }
  const ext = await (await req('/api/external', { headers: { Cookie: cookie } })).json();
  assert.equal(ext.data.revenuecat.status, 'unavailable');
  assert.equal(ext.data.sentry.status, 'unavailable');
  assert.equal(ext.data.links.length, 5);
  const tampered = await req('/api/live', { headers: { Cookie: `${cookie.slice(0, -2)}xx` } });
  assert.equal(tampered.status, 401);
});

test('the live section is cached for 20 s across requests', async () => {
  if (!cookie) await signIn();
  const before = sectionCalls.filter((s) => s === 'live').length;
  await req('/api/live', { headers: { Cookie: cookie } });
  await req('/api/live', { headers: { Cookie: cookie } });
  assert.equal(sectionCalls.filter((s) => s === 'live').length, before);
  now += 20_000;
  await req('/api/live', { headers: { Cookie: cookie } });
  assert.equal(sectionCalls.filter((s) => s === 'live').length, before + 1);
});

test('logout clears the cookie', async () => {
  if (!cookie) await signIn();
  const res = await req('/logout', { method: 'POST', headers: { Origin: `https://${host}`, Cookie: cookie } });
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/login?e=out');
  assert.equal(res.headers.get('set-cookie'), '__Host-wsd=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
  const foreign = await req('/logout', { method: 'POST', headers: { Origin: 'https://evil.example', Cookie: cookie } });
  assert.equal(foreign.status, 403);
});

test('logs never contain secrets, cookies or bearer tokens', () => {
  const all = logLines.join('\n');
  assert.ok(logLines.some((l) => l.includes('login_failed')), 'failures are logged');
  assert.ok(logLines.some((l) => l.includes('fake_fetch')), 'the external probe logged something');
  for (const secret of [PASSWORD, SESSION_SECRET, DB_PASSWORD, SENTRY_TOKEN, RC_KEY, '203.0.113.5', cookie?.split('=')[1]]) {
    if (secret) assert.ok(!all.includes(secret), `log contains ${secret.slice(0, 12)}`);
  }
  for (const line of logLines) assert.doesNotThrow(() => JSON.parse(line));
});

test('production without the CA keeps the database off (fail closed)', async () => {
  const { config, notices } = loadConfig({
    NODE_ENV: 'production', DASHBOARD_PASSWORD: PASSWORD, SESSION_SECRET, DB_PASSWORD,
    DB_HOST: 'aws-0-us-east-1.pooler.supabase.com', SUPABASE_PROJECT_REF: 'rsppoarumebdrsbfrqdi',
    DASHBOARD_LAUNCH_AT: '2026-09-26T13:00:00Z',
  }, now);
  assert.equal(config.dbConfigured, false);
  assert.equal(config.dbOffReason, 'ca_missing');
  assert.deepEqual(notices, ['db_ca_missing']);
  const sections = createSections({ config, notices, db: null, nowMs: () => now, log: createLogger({ write: () => {} }) });
  const env = await sections.get('live');
  assert.equal(env.data, null);
  assert.equal(env.error.code, 'ca_missing');
  assert.match(env.error.message, /CA certificate is missing/);
  assert.deepEqual(env.notices, ['db_ca_missing']);
});
