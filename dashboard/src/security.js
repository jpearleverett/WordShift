// Response headers sent on every response, the POST origin check and a
// bounded request body reader.

export const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "font-src 'none'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
].join('; ');

// Referrer-Policy is same-origin, not no-referrer: under no-referrer the Fetch
// standard makes a browser send "Origin: null" on every form POST, which would
// make a same-origin login look cross-site. same-origin still sends nothing to
// any other site (Play Console, AdMob, RevenueCat, Sentry links).
export const SECURITY_HEADERS = Object.freeze({
  'Content-Security-Policy': CSP,
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Robots-Tag': 'noindex, nofollow',
  'Cache-Control': 'no-store',
});

export const CONTENT_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  json: 'application/json; charset=utf-8',
  text: 'text/plain; charset=utf-8',
});

export function applySecurityHeaders(res) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) res.setHeader(name, value);
}

/**
 * Same-origin check for POST. A present Origin must be this host's own
 * origin; "null" is accepted only when the browser itself vouches with
 * Sec-Fetch-Site: same-origin. Without Origin, Sec-Fetch-Site must be absent,
 * same-origin or none.
 */
export function isSameOriginPost(req, { production }) {
  const host = req.headers.host;
  if (typeof host !== 'string' || host.length === 0 || host.length > 255) return false;
  const origin = req.headers.origin;
  const site = req.headers['sec-fetch-site'];
  if (typeof origin === 'string') {
    if (origin === `https://${host}`) return true;
    if (!production && origin === `http://${host}`) return true;
    if (origin === 'null' && site === 'same-origin') return true;
    return false;
  }
  return site === undefined || site === 'same-origin' || site === 'none';
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Reads at most `limit` bytes of body within `timeoutMs`, or rejects with an HttpError. */
export function readBody(req, { limit = 2048, timeoutMs = 5000 } = {}) {
  return new Promise((resolve, reject) => {
    const declared = req.headers['content-length'];
    if (declared !== undefined) {
      const n = Number(declared);
      if (!Number.isInteger(n) || n < 0) return reject(new HttpError(400, 'Bad request.'));
      if (n > limit) {
        req.resume();
        return reject(new HttpError(413, 'Request too large.'));
      }
    }
    const chunks = [];
    let size = 0;
    let done = false;
    const finish = (err, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (err) {
        req.removeAllListeners('data');
        req.resume();
        reject(err);
      } else resolve(value);
    };
    const timer = setTimeout(() => finish(new HttpError(408, 'Request timeout.')), timeoutMs);
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) return finish(new HttpError(413, 'Request too large.'));
      chunks.push(chunk);
    });
    req.on('end', () => finish(null, Buffer.concat(chunks).toString('utf8')));
    req.on('error', () => finish(new HttpError(400, 'Bad request.')));
  });
}

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}
