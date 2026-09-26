import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  clearSessionCookie, clientIp, createAuth, createLoginLimiter, parseCookies, SESSION_MAX_AGE_SEC, sessionCookie,
} from '../src/auth.js';

const PASSWORD = 'correct horse battery';
const SECRET = 'k'.repeat(48);

test('password compare', () => {
  const auth = createAuth({ password: PASSWORD, sessionSecret: SECRET });
  assert.equal(auth.checkPassword(PASSWORD), true);
  assert.equal(auth.checkPassword('correct horse batter'), false);
  assert.equal(auth.checkPassword(''), false);
  assert.equal(auth.checkPassword('x'.repeat(257)), false);
  assert.equal(auth.checkPassword(undefined), false);
  assert.equal(auth.checkPassword(12345), false);
  const long = createAuth({ password: 'p'.repeat(256), sessionSecret: SECRET });
  assert.equal(long.checkPassword('p'.repeat(256)), true);
});

test('session token round trip and format', () => {
  let now = Date.parse('2026-09-26T18:00:00Z');
  const auth = createAuth({ password: PASSWORD, sessionSecret: SECRET, nowMs: () => now });
  const token = auth.issueToken();
  const [v, exp, nonce, sig] = token.split('.');
  assert.equal(v, 'v1');
  assert.equal(Number(exp), Math.floor(now / 1000) + SESSION_MAX_AGE_SEC);
  assert.match(nonce, /^[A-Za-z0-9_-]{22}$/);
  assert.match(sig, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(auth.verifyToken(token), true);
  assert.notEqual(auth.issueToken(), token, 'fresh nonce each time');
  now += (SESSION_MAX_AGE_SEC - 1) * 1000;
  assert.equal(auth.verifyToken(token), true, 'valid until expiry');
  now += 1000;
  assert.equal(auth.verifyToken(token), false, 'expired at exp');
});

test('tampered, malformed and far-future tokens fail without throwing', () => {
  const now = Date.parse('2026-09-26T18:00:00Z');
  const auth = createAuth({ password: PASSWORD, sessionSecret: SECRET, nowMs: () => now });
  const token = auth.issueToken();
  const [v, exp, nonce, sig] = token.split('.');
  const flip = (s) => (s[0] === 'A' ? 'B' : 'A') + s.slice(1);
  const bad = [
    `${v}.${exp}.${nonce}.${flip(sig)}`,
    `${v}.${Number(exp) + 1}.${nonce}.${sig}`,
    `${v}.${exp}.${flip(nonce)}.${sig}`,
    `v2.${exp}.${nonce}.${sig}`,
    `${v}.${exp}.${nonce}`,
    `${token}.extra`,
    '',
    'garbage',
    'v1.abc.def.ghi',
    'v1.-5.AAAAAAAAAAAAAAAAAAAAAA.' + 'A'.repeat(43),
    null,
    undefined,
    'x'.repeat(5000),
  ];
  for (const t of bad) assert.equal(auth.verifyToken(t), false, String(t).slice(0, 40));
  // A correctly signed token whose expiry is more than 31 days ahead is refused.
  const later = createAuth({ password: PASSWORD, sessionSecret: SECRET, nowMs: () => now + 2 * SESSION_MAX_AGE_SEC * 1000 });
  assert.equal(auth.verifyToken(later.issueToken()), false);
});

test('changing the password or the session secret invalidates old cookies', () => {
  const token = createAuth({ password: PASSWORD, sessionSecret: SECRET }).issueToken();
  assert.equal(createAuth({ password: PASSWORD, sessionSecret: SECRET }).verifyToken(token), true);
  assert.equal(createAuth({ password: `${PASSWORD}!`, sessionSecret: SECRET }).verifyToken(token), false);
  assert.equal(createAuth({ password: PASSWORD, sessionSecret: `${SECRET}x` }).verifyToken(token), false);
});

test('cookie attributes', () => {
  assert.equal(sessionCookie('abc'), '__Host-wsd=abc; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict');
  assert.equal(clearSessionCookie(), '__Host-wsd=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
  assert.equal(sessionCookie('abc', { local: true }), 'wsd=abc; Path=/; Max-Age=2592000; HttpOnly; SameSite=Strict');
  assert.deepEqual([...parseCookies('a=1; __Host-wsd=v1.x; a=2; junk; =x')], [['a', '1'], ['__Host-wsd', 'v1.x']]);
  assert.equal(parseCookies(undefined).size, 0);
});

test('backoff doubles from 1 s up to 15 minutes, per address', () => {
  let now = 1_000_000;
  const limiter = createLoginLimiter({ nowMs: () => now, globalLimit: 1000 });
  const waits = [];
  for (let i = 0; i < 12; i++) {
    limiter.recordFailure('1.1.1.1');
    waits.push((limiter.blockedUntil('1.1.1.1') - now) / 1000);
    now = limiter.blockedUntil('1.1.1.1');
  }
  assert.deepEqual(waits, [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 900, 900]);
  now = 5_000_000;
  const fresh = createLoginLimiter({ nowMs: () => now });
  fresh.recordFailure('a');
  assert.deepEqual(fresh.check('a'), { blocked: true, reason: 'ip' });
  assert.deepEqual(fresh.check('b'), { blocked: false }, 'other addresses are unaffected');
  now += 1000;
  assert.deepEqual(fresh.check('a'), { blocked: false });
  fresh.recordFailure('a');
  fresh.recordSuccess('a');
  assert.deepEqual(fresh.check('a'), { blocked: false }, 'success resets');
  assert.equal(fresh.size(), 0);
});

test('global limiter: 50 failures in 10 minutes pause every login', () => {
  let now = 0;
  const limiter = createLoginLimiter({ nowMs: () => now });
  for (let i = 0; i < 49; i++) limiter.recordFailure(`10.0.0.${i}`);
  assert.deepEqual(limiter.check('192.0.2.1'), { blocked: false });
  limiter.recordFailure('10.0.1.1');
  assert.deepEqual(limiter.check('192.0.2.1'), { blocked: true, reason: 'global' });
  now += 10 * 60 * 1000;
  assert.deepEqual(limiter.check('192.0.2.1'), { blocked: false }, 'the window drains');
});

test('entry cap drops the oldest and stale entries are pruned', () => {
  let now = 0;
  const limiter = createLoginLimiter({ nowMs: () => now, maxEntries: 3, globalLimit: 1e9 });
  for (const ip of ['a', 'b', 'c', 'd']) { limiter.recordFailure(ip); now += 1; }
  assert.equal(limiter.size(), 3);
  assert.equal(limiter.blockedUntil('a'), 0, 'oldest dropped');
  now += 25 * 60 * 60 * 1000;
  limiter.check('z');
  assert.equal(limiter.size(), 0, 'entries older than 24 h pruned');
});

test('client address is the rightmost X-Forwarded-For entry', () => {
  const req = (xff, remote = '10.9.9.9') => ({ headers: xff === undefined ? {} : { 'x-forwarded-for': xff }, socket: { remoteAddress: remote } });
  assert.equal(clientIp(req('1.2.3.4, 5.6.7.8')), '5.6.7.8');
  assert.equal(clientIp(req('spoofed, 203.0.113.7 ')), '203.0.113.7');
  assert.equal(clientIp(req('198.51.100.2')), '198.51.100.2');
  assert.equal(clientIp(req(undefined)), '10.9.9.9');
  assert.equal(clientIp(req(' , ')), '10.9.9.9');
});
