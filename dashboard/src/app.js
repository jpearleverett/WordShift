// The request handler: routing, the login flow and static files. Everything
// except /healthz, /robots.txt, the login page and its three assets needs a
// valid session cookie.
import { URLSearchParams } from 'node:url';
import { clearSessionCookie, clientIp, COOKIE_NAME, ipHash, LOCAL_COOKIE_NAME, parseCookies, sessionCookie } from './auth.js';
import { applySecurityHeaders, CONTENT_TYPES, escapeHtml, HttpError, isSameOriginPost, readBody } from './security.js';
import { PUBLIC_STATIC } from './static.js';

const LOGIN_MESSAGES = {
  wrong: 'That password did not work.',
  wait: 'Too many tries. Wait a few minutes, then try again.',
  out: 'You are signed out on this device.',
};
const API_SECTIONS = { '/api/live': 'live', '/api/cohorts': 'cohorts', '/api/progress': 'progress', '/api/external': 'external' };
const GET_ONLY = 'GET, HEAD';
const ROUTES = {
  '/healthz': GET_ONLY,
  '/robots.txt': GET_ONLY,
  '/login': 'GET, HEAD, POST',
  '/logout': 'POST',
  '/': GET_ONLY,
  ...Object.fromEntries(Object.keys(API_SECTIONS).map((p) => [p, GET_ONLY])),
};
const UNAUTHORIZED_JSON = JSON.stringify({ ok: false, error: { code: 'unauthorized', message: 'Sign in again.' } });
const INTERNAL_JSON = JSON.stringify({ ok: false, error: { code: 'internal', message: 'Something went wrong.' } });

function isLocalHost(req) {
  const host = typeof req.headers.host === 'string' ? req.headers.host : '';
  return /^(localhost|127\.0\.0\.1)(:[0-9]{1,5})?$/.test(host);
}

/**
 * @param {{ config: any, auth: any, limiter: any, sections: { get: (s: string) => Promise<any> },
 *   staticFiles: { files: Map<string, any>, index: Buffer | null, loginTemplate: string }, log: any }} deps
 */
export function createApp({ config, auth, limiter, sections, staticFiles, log }) {
  const useLocalCookie = (req) => config.insecureLocalCookie && isLocalHost(req);

  const send = (req, res, status, type, body, headers = {}) => {
    res.statusCode = status;
    if (type) res.setHeader('Content-Type', type);
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    const buf = body === undefined || body === null ? null : Buffer.isBuffer(body) ? body : Buffer.from(String(body), 'utf8');
    if (buf) res.setHeader('Content-Length', buf.length);
    res.end(req.method === 'HEAD' || !buf ? undefined : buf);
  };
  const text = (req, res, status, body, headers) => send(req, res, status, CONTENT_TYPES.text, body, headers);
  const json = (req, res, status, body) => send(req, res, status, CONTENT_TYPES.json, typeof body === 'string' ? body : JSON.stringify(body));
  const redirect = (req, res, location, headers = {}) => send(req, res, 303, null, null, { Location: location, ...headers });

  const hasSession = (req) => {
    const cookies = parseCookies(req.headers.cookie);
    const value = cookies.get(useLocalCookie(req) ? LOCAL_COOKIE_NAME : COOKIE_NAME);
    return value !== undefined && auth.verifyToken(value);
  };

  const renderLogin = (req, res, code) => {
    const message = Object.hasOwn(LOGIN_MESSAGES, code) ? LOGIN_MESSAGES[code] : '';
    send(req, res, 200, CONTENT_TYPES['.html'], staticFiles.loginTemplate.replace('{{MESSAGE}}', escapeHtml(message)));
  };

  async function handleLoginPost(req, res) {
    const contentType = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    if (contentType !== 'application/x-www-form-urlencoded') {
      req.resume();
      return text(req, res, 415, 'Unsupported form.');
    }
    const body = await readBody(req, { limit: 2048, timeoutMs: 5000 });
    const ip = clientIp(req);
    if (limiter.check(ip).blocked) return redirect(req, res, '/login?e=wait');
    const password = new URLSearchParams(body).get('password');
    const valid = typeof password === 'string' && password.length >= 1 && password.length <= 256 && auth.checkPassword(password);
    if (!valid) {
      const failures = limiter.recordFailure(ip);
      log.warn('login_failed', { ipHash: ipHash(ip, config.sessionSecret), failures });
      return redirect(req, res, '/login?e=wrong');
    }
    limiter.recordSuccess(ip);
    log.info('login_ok', { ipHash: ipHash(ip, config.sessionSecret) });
    return redirect(req, res, '/', { 'Set-Cookie': sessionCookie(auth.issueToken(), { local: useLocalCookie(req) }) });
  }

  async function route(req, res, path) {
    const method = req.method;
    const allow = ROUTES[path] ?? (staticFiles.files.has(path) ? GET_ONLY : null);
    if (method === 'OPTIONS') return text(req, res, 405, 'Method not allowed.', { Allow: allow ?? GET_ONLY });
    if (!allow) return text(req, res, 404, 'Not found.');
    if (!allow.split(', ').includes(method)) return text(req, res, 405, 'Method not allowed.', { Allow: allow });

    if (path === '/healthz') return json(req, res, 200, { ok: true });
    if (path === '/robots.txt') return text(req, res, 200, 'User-agent: *\nDisallow: /\n');

    if (path === '/login') {
      if (method === 'POST') {
        if (!isSameOriginPost(req, { production: config.production })) {
          req.resume();
          return text(req, res, 403, 'Forbidden');
        }
        return handleLoginPost(req, res);
      }
      if (hasSession(req)) return redirect(req, res, '/');
      const url = new URL(req.url, 'http://x');
      return renderLogin(req, res, url.searchParams.get('e'));
    }
    if (path === '/logout') {
      if (!isSameOriginPost(req, { production: config.production })) {
        req.resume();
        return text(req, res, 403, 'Forbidden');
      }
      req.resume();
      return redirect(req, res, '/login?e=out', { 'Set-Cookie': clearSessionCookie({ local: useLocalCookie(req) }) });
    }

    if (PUBLIC_STATIC.has(path) && staticFiles.files.has(path)) {
      const f = staticFiles.files.get(path);
      return send(req, res, 200, f.type, f.body);
    }

    const authed = hasSession(req);
    if (path === '/') {
      if (!authed) return redirect(req, res, '/login');
      if (!staticFiles.index) return text(req, res, 503, 'The page files are missing from this build.');
      return send(req, res, 200, CONTENT_TYPES['.html'], staticFiles.index);
    }
    if (API_SECTIONS[path]) {
      if (!authed) return json(req, res, 401, UNAUTHORIZED_JSON);
      return json(req, res, 200, await sections.get(API_SECTIONS[path]));
    }
    if (!authed) return text(req, res, 401, 'Sign in first.');
    const f = staticFiles.files.get(path);
    return send(req, res, 200, f.type, f.body);
  }

  return async function handler(req, res) {
    applySecurityHeaders(res);
    const rawUrl = typeof req.url === 'string' ? req.url : '/';
    let path = '/';
    try {
      if (rawUrl.length > 2048) return text(req, res, 414, 'URL too long.');
      if (!rawUrl.startsWith('/')) return text(req, res, 400, 'Bad request.');
      path = new URL(rawUrl, 'http://x').pathname;
      await route(req, res, path);
    } catch (err) {
      if (err instanceof HttpError) {
        if (!res.headersSent) text(req, res, err.status, err.message);
        return;
      }
      log.error('request_failed', { path: path.slice(0, 100), method: req.method, error: err });
      if (res.headersSent) {
        res.destroy();
        return;
      }
      if (path.startsWith('/api/')) json(req, res, 500, INTERNAL_JSON);
      else text(req, res, 500, 'Something went wrong.');
    }
  };
}
