import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCache, PublicError } from '../src/cache.js';
import { createRevenueCatSource, parseOverview, revenueCatPanel, revenueCatUrl } from '../src/external/revenuecat.js';

const SAMPLE = {
  object: 'overview_metrics',
  currency: 'USD',
  metrics: [
    { object: 'overview_metric', id: 'active_trials', name: 'Active Trials', description: 'x', unit: '#', period: 'P0D', value: 0, last_updated_at: 1790446805000, last_updated_at_iso8601: '2026-09-26T18:20:05Z' },
    { object: 'overview_metric', id: 'mrr', name: 'MRR', description: 'x', unit: '$', period: 'P0D', value: 3.99, last_updated_at: 1790446805123, last_updated_at_iso8601: '2026-09-26T18:20:05Z' },
    { object: 'overview_metric', id: 'revenue', name: 'Revenue', description: 'x', unit: '$', period: 'P28D', value: 11.97, last_updated_at: null, last_updated_at_iso8601: null },
  ],
};

function fakeFetch(respond) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return respond(url, init);
  };
  fn.calls = calls;
  return fn;
}
const jsonResponse = (body, status = 200, headers = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });

test('request: URL, bearer header, no redirects, timeout signal', async () => {
  const fetchImpl = fakeFetch(() => jsonResponse(SAMPLE));
  const src = createRevenueCatSource({ apiKey: 'sk_test123', projectId: 'proj/1', currency: null }, { fetchImpl });
  const out = await src.load();
  assert.equal(fetchImpl.calls.length, 1);
  const { url, init } = fetchImpl.calls[0];
  assert.equal(url, 'https://api.revenuecat.com/v2/projects/proj%2F1/metrics/overview');
  assert.equal(init.headers.Authorization, 'Bearer sk_test123');
  assert.equal(init.headers.Accept, 'application/json');
  assert.equal(init.headers['User-Agent'], 'wordshift-dashboard/1');
  assert.equal(init.redirect, 'error');
  assert.ok(init.signal instanceof AbortSignal);
  assert.equal(out.currency, 'USD');
  assert.deepEqual(out.metrics.map((m) => m.id), ['active_trials', 'mrr', 'revenue']);
  assert.deepEqual(out.metrics[1], { id: 'mrr', name: 'MRR', value: 3.99, unit: '$', period: 'P0D', lastUpdatedAt: '2026-09-26T18:20:05Z' });
  assert.equal(out.metrics[2].lastUpdatedAt, null);
  assert.equal(revenueCatUrl({ projectId: 'p1', currency: 'EUR' }), 'https://api.revenuecat.com/v2/projects/p1/metrics/overview?currency=EUR');
});

test('hostile payload values are cleaned or dropped', () => {
  const out = parseOverview({
    currency: 'usd<script>',
    metrics: [
      { id: 'good', name: '<img src=x onerror=alert(1)>\u202e\u0000Name'.padEnd(200, 'x'), unit: '$$$$$$$$$$$$', period: 'P28D;x', value: 1 },
      { id: 'Bad Id', name: 'x', unit: '#', period: 'P0D', value: 1 },
      { id: 'nan', name: 'x', unit: '#', period: 'P0D', value: Number.NaN },
      { id: 'str', name: 'x', unit: '#', period: 'P0D', value: '12' },
      null,
      'junk',
      { id: 'noname', value: 2, last_updated_at: 'yesterday' },
      ...Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, name: 'M', unit: '#', period: 'P0D', value: i })),
    ],
  });
  assert.equal(out.currency, null);
  assert.equal(out.metrics.length, 16);
  const [good, noname] = out.metrics;
  assert.equal(good.id, 'good');
  assert.ok(good.name.length <= 60);
  assert.ok(!/[\u0000-\u001f\u202e]/.test(good.name));
  assert.equal(good.unit.length, 8);
  assert.equal(good.period, '');
  assert.deepEqual(noname, { id: 'noname', name: 'noname', value: 2, unit: '', period: '', lastUpdatedAt: null });
  assert.throws(() => parseOverview({ metrics: 'no' }), (e) => e instanceof PublicError && e.code === 'bad_payload');
  assert.throws(() => parseOverview(null), (e) => e.code === 'bad_payload');
});

test('HTTP and network failures map to fixed messages', async () => {
  const cases = [
    [() => jsonResponse({ message: 'SECRET' }, 401), 'http_401', 'RevenueCat rejected the key. Use a v2 secret key with the charts_metrics:overview:read permission.'],
    [() => jsonResponse({}, 403), 'http_403', 'The RevenueCat key is not allowed to read overview metrics.'],
    [() => jsonResponse({}, 404), 'http_404', 'RevenueCat project not found. Check REVENUECAT_PROJECT_ID.'],
    [() => jsonResponse({}, 429), 'http_429', 'RevenueCat rate limit reached.'],
    [() => jsonResponse({}, 503), 'http_5xx', 'RevenueCat had a server error.'],
    [() => jsonResponse('<html>not json</html>'), 'bad_payload', 'RevenueCat sent an unexpected answer.'],
    [() => { throw Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }); }, 'timeout', 'RevenueCat did not answer in time.'],
    [() => { throw new TypeError('fetch failed'); }, 'network', 'Could not reach RevenueCat.'],
  ];
  for (const [respond, code, message] of cases) {
    const src = createRevenueCatSource({ apiKey: 'sk_x', projectId: 'p' }, { fetchImpl: fakeFetch(respond) });
    await assert.rejects(src.load(), (e) => e instanceof PublicError && e.code === code && e.publicMessage === message, code);
  }
});

test('a real timeout aborts the request', async () => {
  const hanging = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)));
  const { getJson } = await import('../src/external/http.js');
  // AbortSignal.timeout does not hold the event loop open; the server does in
  // production, this timer does here.
  const keepAlive = setTimeout(() => {}, 5000);
  try {
    await assert.rejects(getJson(hanging, 'https://api.revenuecat.com/x', { token: 't', provider: 'RevenueCat', messages: {}, timeoutMs: 20 }),
      (e) => e.code === 'timeout');
  } finally {
    clearTimeout(keepAlive);
  }
});

test('panel states: not configured, ok, unavailable with last good values', async () => {
  const off = revenueCatPanel(false, { data: null, fetchedAt: null, stale: false, error: null, lastTriedAt: null });
  assert.deepEqual(off, { status: 'not_configured', fetchedAt: null, lastTriedAt: null, error: null, currency: null, metrics: [], dashboardUrl: 'https://app.revenuecat.com/' });
  let now = Date.parse('2026-09-26T18:00:00Z');
  let fail = false;
  const src = createRevenueCatSource({ apiKey: 'sk_x', projectId: 'p' }, { fetchImpl: fakeFetch(() => (fail ? jsonResponse({}, 500) : jsonResponse(SAMPLE))) });
  const cache = createCache({ ttlMs: 300_000, retryMs: 300_000, nowMs: () => now, load: () => src.load() });
  const ok = revenueCatPanel(true, await cache.get());
  assert.equal(ok.status, 'ok');
  assert.equal(ok.fetchedAt, '2026-09-26T18:00:00Z');
  assert.equal(ok.metrics.length, 3);
  now += 301_000;
  fail = true;
  const down = revenueCatPanel(true, await cache.get());
  assert.equal(down.status, 'unavailable');
  assert.deepEqual(down.error, { code: 'http_5xx', message: 'RevenueCat had a server error.' });
  assert.equal(down.fetchedAt, '2026-09-26T18:00:00Z', 'last good time kept');
  assert.equal(down.lastTriedAt, '2026-09-26T18:05:01Z');
  assert.equal(down.metrics.length, 3, 'last good metrics kept');
});
