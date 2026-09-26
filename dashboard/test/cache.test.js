import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createCache, PublicError } from '../src/cache.js';
import { TTL } from '../src/sections.js';

test('section TTLs match the spec', () => {
  assert.deepEqual(TTL, {
    live: { ttlMs: 20_000, retryMs: 15_000 },
    cohorts: { ttlMs: 300_000, retryMs: 60_000 },
    progress: { ttlMs: 300_000, retryMs: 60_000 },
    revenuecat: { ttlMs: 300_000, retryMs: 300_000 },
    sentry: { ttlMs: 300_000, retryMs: 300_000 },
  });
});

test('serves from cache inside the TTL and reloads after it', async () => {
  let now = 0;
  let calls = 0;
  const cache = createCache({ ttlMs: 20_000, retryMs: 15_000, nowMs: () => now, load: async () => ({ n: ++calls }) });
  assert.deepEqual((await cache.get()).data, { n: 1 });
  now = 19_999;
  assert.deepEqual((await cache.get()).data, { n: 1 });
  now = 20_000;
  const snap = await cache.get();
  assert.deepEqual(snap.data, { n: 2 });
  assert.equal(snap.fetchedAt, 20_000);
  assert.equal(snap.stale, false);
  assert.equal(snap.error, null);
});

test('single flight: concurrent callers share one load', async () => {
  let calls = 0;
  let release;
  const gate = new Promise((r) => { release = r; });
  const cache = createCache({ ttlMs: 1000, retryMs: 1000, load: async () => { calls++; await gate; return 'x'; } });
  const pending = Array.from({ length: 10 }, () => cache.get());
  release();
  const results = await Promise.all(pending);
  assert.equal(calls, 1);
  assert.ok(results.every((r) => r.data === 'x'));
});

test('stale on error keeps the last data, honours the retry window, then recovers', async () => {
  let now = 0;
  let mode = 'ok';
  let calls = 0;
  const errors = [];
  const cache = createCache({
    ttlMs: 20_000, retryMs: 15_000, nowMs: () => now, onError: (e) => errors.push(e.code),
    load: async () => {
      calls++;
      if (mode === 'fail') throw new PublicError('db_timeout', 'The database query took too long.');
      if (mode === 'crash') throw new Error('secret driver text');
      return { v: calls };
    },
  });
  await cache.get();
  now = 25_000;
  mode = 'fail';
  let snap = await cache.get();
  assert.deepEqual(snap.data, { v: 1 });
  assert.equal(snap.fetchedAt, 0);
  assert.equal(snap.stale, true);
  assert.deepEqual(snap.error, { code: 'db_timeout', message: 'The database query took too long.', at: 25_000 });
  assert.equal(snap.lastTriedAt, 25_000);
  now = 39_999;
  await cache.get();
  assert.equal(calls, 2, 'no retry inside the retry window');
  now = 40_000;
  mode = 'crash';
  snap = await cache.get();
  assert.equal(calls, 3);
  assert.deepEqual(snap.error, { code: 'internal', message: 'Something went wrong.', at: 40_000 }, 'raw error text never leaves');
  now = 55_000;
  mode = 'ok';
  snap = await cache.get();
  assert.deepEqual(snap.data, { v: 4 });
  assert.equal(snap.stale, false);
  assert.equal(snap.error, null);
  assert.deepEqual(errors, ['db_timeout', undefined]);
});

test('a cache that never succeeded returns data null and is not stale', async () => {
  const cache = createCache({ ttlMs: 1000, retryMs: 1000, load: async () => { throw new PublicError('db_unreachable', 'Could not reach the database pooler.'); } });
  const snap = await cache.get();
  assert.equal(snap.data, null);
  assert.equal(snap.fetchedAt, null);
  assert.equal(snap.stale, false);
  assert.equal(snap.error.code, 'db_unreachable');
});
