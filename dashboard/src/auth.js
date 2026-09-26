// Password check, stateless signed session cookie, login throttling and the
// client address used for throttling.
import { createHash, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';

export const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60;
const SESSION_MAX_AHEAD_SEC = 31 * 24 * 60 * 60;
export const COOKIE_NAME = '__Host-wsd';
export const LOCAL_COOKIE_NAME = 'wsd';

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest();
const sha256hex = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const b64url = (buf) => Buffer.from(buf).toString('base64url');

/**
 * @param {{ password: string, sessionSecret: string, nowMs?: () => number }} options
 */
export function createAuth({ password, sessionSecret, nowMs = () => Date.now() }) {
  const passwordDigest = sha256(password);
  // Changing either the password or the session secret signs every device out.
  const key = Buffer.from(hkdfSync('sha256', sessionSecret, 'wordshift-dashboard', `session-v1:${sha256hex(password)}`, 32));
  const sign = (payload) => createHmac('sha256', key).update(payload, 'utf8').digest();

  function checkPassword(input) {
    const candidate = typeof input === 'string' ? input : '';
    // Always hash and compare, so a malformed input costs the same as a wrong one.
    const match = timingSafeEqual(sha256(candidate), passwordDigest);
    return match && candidate.length >= 1 && candidate.length <= 256;
  }

  function issueToken() {
    const exp = Math.floor(nowMs() / 1000) + SESSION_MAX_AGE_SEC;
    const nonce = b64url(randomBytes(16));
    const payload = `v1.${exp}.${nonce}`;
    return `${payload}.${b64url(sign(payload))}`;
  }

  function verifyToken(token) {
    try {
      if (typeof token !== 'string' || token.length > 200) return false;
      const parts = token.split('.');
      if (parts.length !== 4 || parts[0] !== 'v1') return false;
      const [, expText, nonce, sig] = parts;
      if (!/^[0-9]{1,12}$/.test(expText) || !/^[A-Za-z0-9_-]{16,64}$/.test(nonce) || !/^[A-Za-z0-9_-]{43}$/.test(sig)) return false;
      const exp = Number(expText);
      const now = Math.floor(nowMs() / 1000);
      if (!(now < exp && exp <= now + SESSION_MAX_AHEAD_SEC)) return false;
      const expected = sign(`v1.${expText}.${nonce}`);
      const given = Buffer.from(sig, 'base64url');
      return given.length === expected.length && timingSafeEqual(given, expected);
    } catch {
      return false;
    }
  }

  return { checkPassword, issueToken, verifyToken };
}

/** Parses a Cookie header into a Map (first value wins). */
export function parseCookies(header) {
  const out = new Map();
  if (typeof header !== 'string' || header.length > 8192) return out;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 1) continue;
    const name = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (name && !out.has(name)) out.set(name, value);
  }
  return out;
}

export function sessionCookie(value, { local = false } = {}) {
  return local
    ? `${LOCAL_COOKIE_NAME}=${value}; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}; HttpOnly; SameSite=Strict`
    : `${COOKIE_NAME}=${value}; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie({ local = false } = {}) {
  return local
    ? `${LOCAL_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`
    : `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

/**
 * The address Google's front end saw: the RIGHTMOST X-Forwarded-For entry
 * (earlier entries are whatever the client sent). Falls back to the socket.
 */
export function clientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  const header = Array.isArray(xff) ? xff.join(',') : xff;
  if (typeof header === 'string' && header.length <= 2048) {
    const parts = header.split(',').map((p) => p.trim()).filter(Boolean);
    const last = parts.at(-1);
    if (last && last.length <= 64) return last;
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

export function ipHash(ip, sessionSecret) {
  return createHash('sha256').update(`${ip}${sessionSecret}`, 'utf8').digest('hex').slice(0, 12);
}

/**
 * Per-address exponential backoff (1 s, 2 s, 4 s ... capped at 15 min) plus a
 * global brake: 50 failures across all addresses in 10 minutes pause every
 * login until the window drains. In memory only; a new instance starts fresh.
 */
export function createLoginLimiter({
  nowMs = () => Date.now(),
  maxEntries = 5000,
  globalLimit = 50,
  globalWindowMs = 10 * 60 * 1000,
  maxBackoffMs = 15 * 60 * 1000,
  staleMs = 24 * 60 * 60 * 1000,
} = {}) {
  const perIp = new Map();
  let globalFailures = [];

  const prune = (now) => {
    globalFailures = globalFailures.filter((t) => now - t < globalWindowMs);
    for (const [ip, entry] of perIp) {
      if (now - entry.lastSeen < staleMs) break; // insertion order = least recently seen first
      perIp.delete(ip);
    }
    while (perIp.size > maxEntries) perIp.delete(perIp.keys().next().value);
  };

  return {
    /** @returns {{ blocked: boolean, reason?: 'ip' | 'global' }} */
    check(ip) {
      const now = nowMs();
      prune(now);
      if (globalFailures.length >= globalLimit) return { blocked: true, reason: 'global' };
      const entry = perIp.get(ip);
      if (entry && now < entry.blockedUntil) return { blocked: true, reason: 'ip' };
      return { blocked: false };
    },
    /** @returns {number} failures recorded for this address */
    recordFailure(ip) {
      const now = nowMs();
      const entry = perIp.get(ip) ?? { failures: 0, blockedUntil: 0, lastSeen: now };
      entry.failures += 1;
      entry.blockedUntil = now + Math.min(2 ** (entry.failures - 1) * 1000, maxBackoffMs);
      entry.lastSeen = now;
      perIp.delete(ip);
      perIp.set(ip, entry);
      globalFailures.push(now);
      prune(now);
      return entry.failures;
    },
    recordSuccess(ip) {
      perIp.delete(ip);
    },
    size: () => perIp.size,
    blockedUntil: (ip) => perIp.get(ip)?.blockedUntil ?? 0,
  };
}
