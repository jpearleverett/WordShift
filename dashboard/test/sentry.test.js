import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCache, PublicError } from '../src/cache.js';
import { createSentrySource, issuesApiUrl, parseIssues, parseSessions, sentryIssuesUrl, sentryPanel, sessionsUrl } from '../src/external/sentry.js';

const CFG = { token: 't'.repeat(64), org: 'iridescent-games-9n', projectId: '4511612372844544', apiBase: 'https://us.sentry.io', environment: 'production' };
const SESSIONS = {
  start: '2026-09-25T18:00:00Z', end: '2026-09-26T19:00:00Z', intervals: [],
  groups: [{ by: {}, totals: { 'crash_free_rate(session)': 0.9964, 'sum(session)': 1124 } }],
};
const ISSUES = [
  { id: '6823410017', shortId: 'WORDSHIFT-4F', title: "TypeError: Cannot read property 'phase' of undefined", level: 'error', count: '3', userCount: 2,
    firstSeen: '2026-09-26T16:41:10.123456Z', lastSeen: '2026-09-26T18:02:55Z', permalink: 'https://iridescent-games-9n.sentry.io/issues/6823410017/', metadata: {} },
  { id: '6823109944', shortId: 'WORDSHIFT-4E', title: '', level: 'error', count: '1', userCount: 1,
    firstSeen: '2026-09-26T14:05:31Z', lastSeen: '2026-09-26T14:05:31Z', permalink: 'https://iridescent-games-9n.sentry.io/issues/6823109944/',
    metadata: { value: 'Unreadable story record set aside' } },
];
const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });

function router({ sessions = () => json(SESSIONS), issues = () => json(ISSUES, 200, { 'X-Hits': '2' }) } = {}) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return url.includes('/sessions/') ? sessions() : issues();
  };
  fn.calls = calls;
  return fn;
}

test('URLs: organization endpoints, repeated field, environment and project', () => {
  const s = new URL(sessionsUrl(CFG));
  assert.equal(`${s.origin}${s.pathname}`, 'https://us.sentry.io/api/0/organizations/iridescent-games-9n/sessions/');
  assert.deepEqual(s.searchParams.getAll('field'), ['crash_free_rate(session)', 'sum(session)']);
  assert.equal(s.searchParams.get('project'), '4511612372844544');
  assert.equal(s.searchParams.get('environment'), 'production');
  assert.equal(s.searchParams.get('statsPeriod'), '24h');
  assert.equal(s.searchParams.get('interval'), '1h');
  assert.equal(s.searchParams.get('includeSeries'), '0');
  const i = new URL(issuesApiUrl(CFG));
  assert.equal(`${i.origin}${i.pathname}`, 'https://us.sentry.io/api/0/organizations/iridescent-games-9n/issues/');
  assert.equal(i.searchParams.get('query'), 'is:unresolved');
  assert.equal(i.searchParams.get('sort'), 'new');
  assert.equal(i.searchParams.get('limit'), '5');
  assert.equal(i.searchParams.get('statsPeriod'), '24h');
  assert.equal(sentryIssuesUrl(CFG), 'https://iridescent-games-9n.sentry.io/issues/?project=4511612372844544&environment=production&statsPeriod=24h');
});

test('both calls succeed: bearer auth, no redirects, parsed values', async () => {
  const fetchImpl = router();
  const out = await createSentrySource(CFG, { fetchImpl }).load();
  assert.equal(fetchImpl.calls.length, 2);
  for (const { init } of fetchImpl.calls) {
    assert.equal(init.headers.Authorization, `Bearer ${CFG.token}`);
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal instanceof AbortSignal);
  }
  assert.equal(out.partial, false);
  assert.equal(out.crashFreeSessionRate24h, 0.9964);
  assert.equal(out.sessions24h, 1124);
  assert.equal(out.unresolvedIssues24h, 2);
  assert.equal(out.unresolvedIssuesIsLowerBound, false);
  assert.deepEqual(out.newestIssues[0], {
    shortId: 'WORDSHIFT-4F', title: "TypeError: Cannot read property 'phase' of undefined", level: 'error', events: 3, users: 2,
    firstSeen: '2026-09-26T16:41:10Z', lastSeen: '2026-09-26T18:02:55Z', url: 'https://iridescent-games-9n.sentry.io/issues/6823410017/',
  });
  assert.equal(out.newestIssues[1].title, 'Unreadable story record set aside', 'falls back to metadata');
});

test('sessions: empty groups, bad totals, bad shape', () => {
  assert.deepEqual(parseSessions({ groups: [] }), { crashFreeSessionRate24h: null, sessions24h: 0 });
  assert.deepEqual(parseSessions({ groups: [{ totals: { 'crash_free_rate(session)': null, 'sum(session)': 0 } }] }), { crashFreeSessionRate24h: null, sessions24h: 0 });
  assert.deepEqual(parseSessions({ groups: [{ totals: { 'crash_free_rate(session)': 1.5, 'sum(session)': -1 } }] }), { crashFreeSessionRate24h: null, sessions24h: null });
  assert.deepEqual(parseSessions({ groups: [{ totals: { 'crash_free_rate(session)': Number.NaN, 'sum(session)': 2.5 } }] }), { crashFreeSessionRate24h: null, sessions24h: null });
  assert.throws(() => parseSessions({}), (e) => e instanceof PublicError && e.code === 'bad_payload');
  assert.throws(() => parseSessions({ groups: [{}] }), (e) => e.code === 'bad_payload');
});

test('issues: hostile values, permalinks and the X-Hits fallback', () => {
  const hostile = [
    { shortId: '<b>x</b>', title: `<img src=x onerror=alert(1)>\u0007${'a'.repeat(400)}`, level: 'FATAL!', count: 'many', userCount: -3,
      firstSeen: 'not a date', lastSeen: null, permalink: 'javascript:alert(1)' },
    { shortId: 'A-1', title: 'ok', level: 'warning', count: 12, userCount: 1, permalink: 'https://sentry.io.evil.com/issues/1/' },
    { shortId: 'A-2', title: 'ok', level: 'error', count: '1', userCount: 1, permalink: 'http://iridescent-games-9n.sentry.io/issues/2/' },
    { shortId: 'A-3', title: 'ok', level: 'error', count: '1', userCount: 1, permalink: 'https://user:pw@sentry.io/issues/3/' },
    { shortId: 'A-4', title: 'ok', level: 'error', count: '1', userCount: 1, permalink: 'https://sentry.io/issues/4/' },
    { shortId: 'A-5', title: 'sixth, dropped', level: 'error', count: '1', userCount: 1 },
  ];
  const out = parseIssues(hostile, null);
  assert.equal(out.newestIssues.length, 5);
  const [h, a1, a2, a3, a4] = out.newestIssues;
  assert.equal(h.shortId, '');
  assert.ok(h.title.length <= 140);
  assert.ok(!/[\u0000-\u001f]/.test(h.title));
  assert.equal(h.level, 'error');
  assert.equal(h.events, 0);
  assert.equal(h.users, 0);
  assert.equal(h.firstSeen, null);
  assert.equal(h.url, null);
  assert.equal(a1.url, null, 'look-alike host refused');
  assert.equal(a1.events, 12);
  assert.equal(a2.url, null, 'http refused');
  assert.equal(a3.url, null, 'credentials refused');
  assert.equal(a4.url, 'https://sentry.io/issues/4/');
  assert.equal(out.unresolvedIssues24h, 6);
  assert.equal(out.unresolvedIssuesIsLowerBound, true, 'a full page without X-Hits is a lower bound');
  assert.deepEqual(parseIssues([], null), { newestIssues: [], unresolvedIssues24h: 0, unresolvedIssuesIsLowerBound: false });
  assert.equal(parseIssues(ISSUES, '17').unresolvedIssues24h, 17);
  assert.equal(parseIssues(ISSUES, 'abc').unresolvedIssues24h, 2);
  assert.throws(() => parseIssues({ detail: 'x' }, null), (e) => e.code === 'bad_payload');
});

test('error statuses map to fixed messages', async () => {
  const cases = [
    [401, 'http_401', 'Sentry rejected the token.'],
    [403, 'http_403', 'The Sentry token lacks a scope. It needs org:read and event:read.'],
    [404, 'http_404', 'Sentry organization or project not found.'],
    [429, 'http_429', 'Sentry rate limit reached.'],
    [500, 'http_5xx', 'Sentry had a server error.'],
  ];
  for (const [status, code, message] of cases) {
    const fetchImpl = router({ sessions: () => json({ detail: 'SECRET' }, status), issues: () => json({ detail: 'SECRET' }, status) });
    await assert.rejects(createSentrySource(CFG, { fetchImpl }).load(), (e) => e.code === code && e.publicMessage === message, code);
  }
  const network = router({ sessions: () => { throw new TypeError('fetch failed'); }, issues: () => { throw new TypeError('fetch failed'); } });
  await assert.rejects(createSentrySource(CFG, { fetchImpl: network }).load(), (e) => e.code === 'network' && e.publicMessage === 'Could not reach Sentry.');
  const timeout = router({ sessions: () => { throw Object.assign(new Error('t'), { name: 'TimeoutError' }); }, issues: () => { throw Object.assign(new Error('t'), { name: 'TimeoutError' }); } });
  await assert.rejects(createSentrySource(CFG, { fetchImpl: timeout }).load(), (e) => e.code === 'timeout' && e.publicMessage === 'Sentry did not answer in time.');
  const badJson = router({ sessions: () => new Response('<html>'), issues: () => new Response('<html>') });
  await assert.rejects(createSentrySource(CFG, { fetchImpl: badJson }).load(), (e) => e.code === 'bad_payload');
});

test('one call failing gives partial with that half null', async () => {
  const noSessions = await createSentrySource(CFG, { fetchImpl: router({ sessions: () => json({}, 403) }) }).load();
  assert.equal(noSessions.partial, true);
  assert.deepEqual(noSessions.partialError, { code: 'http_403', message: 'The Sentry token lacks a scope. It needs org:read and event:read.' });
  assert.equal(noSessions.crashFreeSessionRate24h, null);
  assert.equal(noSessions.sessions24h, null);
  assert.equal(noSessions.unresolvedIssues24h, 2);
  const panel = sentryPanel(true, { data: noSessions, fetchedAt: 0, stale: false, error: null, lastTriedAt: 0 }, CFG);
  assert.equal(panel.status, 'partial');
  assert.equal(panel.error.code, 'http_403');
  const noIssues = await createSentrySource(CFG, { fetchImpl: router({ issues: () => json({}, 500) }) }).load();
  assert.equal(noIssues.partial, true);
  assert.equal(noIssues.unresolvedIssues24h, null);
  assert.deepEqual(noIssues.newestIssues, []);
  assert.equal(noIssues.crashFreeSessionRate24h, 0.9964);
});

test('panel: not configured, ok, then unavailable keeps the last good values', async () => {
  const off = sentryPanel(false, { data: null, fetchedAt: null, stale: false, error: null, lastTriedAt: null }, CFG);
  assert.equal(off.status, 'not_configured');
  assert.equal(off.crashFreeSessionRate24h, null);
  assert.deepEqual(off.newestIssues, []);
  assert.equal(off.issuesUrl, sentryIssuesUrl(CFG));
  let now = Date.parse('2026-09-26T18:00:00Z');
  let down = false;
  const src = createSentrySource(CFG, { fetchImpl: router({
    sessions: () => (down ? json({}, 502) : json(SESSIONS)),
    issues: () => (down ? json({}, 502) : json(ISSUES, 200, { 'X-Hits': '2' })),
  }) });
  const cache = createCache({ ttlMs: 300_000, retryMs: 300_000, nowMs: () => now, load: () => src.load() });
  const ok = sentryPanel(true, await cache.get(), CFG);
  assert.equal(ok.status, 'ok');
  assert.equal(ok.error, null);
  assert.equal(ok.sessions24h, 1124);
  now += 300_000;
  down = true;
  const stale = sentryPanel(true, await cache.get(), CFG);
  assert.equal(stale.status, 'unavailable');
  assert.equal(stale.error.code, 'http_5xx');
  assert.equal(stale.sessions24h, 1124);
  assert.equal(stale.newestIssues.length, 2);
  assert.equal(stale.fetchedAt, '2026-09-26T18:00:00Z');
  assert.equal(stale.lastTriedAt, '2026-09-26T18:05:00Z');
});
