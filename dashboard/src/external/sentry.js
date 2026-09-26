// Sentry: crash-free session rate for the last 24 hours (org:read) and the
// newest unresolved issues (event:read), through the organization endpoints.
import { PublicError } from '../cache.js';
import { cleanText, getJson, isoSeconds, normaliseIso } from './http.js';

const MESSAGES = {
  401: 'Sentry rejected the token.',
  403: 'The Sentry token lacks a scope. It needs org:read and event:read.',
  404: 'Sentry organization or project not found.',
  429: 'Sentry rate limit reached.',
  '5xx': 'Sentry had a server error.',
};
const ISSUE_LIMIT = 5;

export function sentryIssuesUrl({ org, projectId, environment }) {
  const q = new URLSearchParams({ project: projectId, environment, statsPeriod: '24h' });
  return `https://${org}.sentry.io/issues/?${q.toString()}`;
}

export function sessionsUrl({ apiBase, org, projectId, environment }) {
  const q = new URLSearchParams();
  q.append('project', projectId);
  q.append('environment', environment);
  q.append('field', 'crash_free_rate(session)');
  q.append('field', 'sum(session)');
  q.append('statsPeriod', '24h');
  q.append('interval', '1h');
  q.append('includeSeries', '0');
  return `${apiBase}/api/0/organizations/${encodeURIComponent(org)}/sessions/?${q.toString()}`;
}

export function issuesApiUrl({ apiBase, org, projectId, environment }) {
  const q = new URLSearchParams();
  q.append('project', projectId);
  q.append('environment', environment);
  q.append('query', 'is:unresolved');
  q.append('sort', 'new');
  q.append('statsPeriod', '24h');
  q.append('limit', String(ISSUE_LIMIT));
  return `${apiBase}/api/0/organizations/${encodeURIComponent(org)}/issues/?${q.toString()}`;
}

const bad = () => new PublicError('bad_payload', 'Sentry sent an unexpected answer.');

export function parseSessions(json) {
  if (json === null || typeof json !== 'object' || !Array.isArray(json.groups)) throw bad();
  if (json.groups.length === 0) return { crashFreeSessionRate24h: null, sessions24h: 0 };
  const totals = json.groups[0]?.totals;
  if (totals === null || typeof totals !== 'object') throw bad();
  const rate = totals['crash_free_rate(session)'];
  const sum = totals['sum(session)'];
  return {
    crashFreeSessionRate24h: typeof rate === 'number' && rate >= 0 && rate <= 1 ? rate : null,
    sessions24h: Number.isSafeInteger(sum) && sum >= 0 ? sum : null,
  };
}

function safePermalink(value) {
  if (typeof value !== 'string' || value.length > 500) return null;
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password) return null;
    if (u.hostname !== 'sentry.io' && !u.hostname.endsWith('.sentry.io')) return null;
    return u.href;
  } catch {
    return null;
  }
}

export function parseIssues(json, hitsHeader) {
  if (!Array.isArray(json)) throw bad();
  const issues = json.slice(0, ISSUE_LIMIT).filter((it) => it !== null && typeof it === 'object').map((it) => {
    const title = cleanText(it.title, 140) || cleanText(it.metadata?.title, 140) || cleanText(it.metadata?.value, 140);
    const events = Number.parseInt(typeof it.count === 'string' || typeof it.count === 'number' ? String(it.count) : '', 10);
    const users = it.userCount;
    return {
      shortId: typeof it.shortId === 'string' && /^[A-Z0-9-]{1,40}$/.test(it.shortId) ? it.shortId : '',
      title,
      level: typeof it.level === 'string' && /^[a-z]{1,10}$/.test(it.level) ? it.level : 'error',
      events: Number.isSafeInteger(events) && events >= 0 ? events : 0,
      users: Number.isSafeInteger(users) && users >= 0 ? users : 0,
      firstSeen: normaliseIso(it.firstSeen),
      lastSeen: normaliseIso(it.lastSeen),
      url: safePermalink(it.permalink),
    };
  });
  const hits = typeof hitsHeader === 'string' && /^[0-9]{1,9}$/.test(hitsHeader.trim()) ? Number(hitsHeader.trim()) : null;
  return hits !== null
    ? { newestIssues: issues, unresolvedIssues24h: hits, unresolvedIssuesIsLowerBound: false }
    : { newestIssues: issues, unresolvedIssues24h: json.length, unresolvedIssuesIsLowerBound: json.length >= ISSUE_LIMIT };
}

/**
 * Loads both halves in parallel. One failing gives status 'partial' (its
 * fields null, error from that call); both failing throws, so the cache keeps
 * the last good values and the panel reads 'unavailable'.
 */
export function createSentrySource(cfg, { fetchImpl = globalThis.fetch } = {}) {
  const opts = (messages) => ({ token: cfg.token, provider: 'Sentry', messages });
  return {
    async load() {
      const [s, i] = await Promise.allSettled([
        getJson(fetchImpl, sessionsUrl(cfg), opts(MESSAGES)).then(({ json }) => parseSessions(json)),
        getJson(fetchImpl, issuesApiUrl(cfg), opts(MESSAGES)).then(({ json, headers }) => parseIssues(json, headers?.get?.('x-hits') ?? null)),
      ]);
      if (s.status === 'rejected' && i.status === 'rejected') throw s.reason;
      const sessions = s.status === 'fulfilled' ? s.value : { crashFreeSessionRate24h: null, sessions24h: null };
      const issues = i.status === 'fulfilled' ? i.value : { newestIssues: [], unresolvedIssues24h: null, unresolvedIssuesIsLowerBound: false };
      const failed = s.status === 'rejected' ? s.reason : i.status === 'rejected' ? i.reason : null;
      const error = failed ? (failed instanceof PublicError ? { code: failed.code, message: failed.publicMessage } : { code: 'internal', message: 'Something went wrong.' }) : null;
      return { partial: Boolean(failed), partialError: error, ...sessions, ...issues };
    },
  };
}

export function sentryPanel(enabled, snap, linkCfg) {
  const iso = (ms) => (ms === null || ms === undefined ? null : isoSeconds(ms));
  const base = {
    environment: linkCfg.environment,
    crashFreeSessionRate24h: null,
    sessions24h: null,
    unresolvedIssues24h: null,
    unresolvedIssuesIsLowerBound: false,
    newestIssues: [],
    issuesUrl: sentryIssuesUrl(linkCfg),
  };
  if (!enabled) return { status: 'not_configured', fetchedAt: null, lastTriedAt: null, error: null, ...base };
  const d = snap.data;
  const values = d ? {
    crashFreeSessionRate24h: d.crashFreeSessionRate24h,
    sessions24h: d.sessions24h,
    unresolvedIssues24h: d.unresolvedIssues24h,
    unresolvedIssuesIsLowerBound: d.unresolvedIssuesIsLowerBound,
    newestIssues: d.newestIssues,
  } : {};
  let status = 'ok';
  let error = null;
  if (snap.error) {
    status = 'unavailable';
    error = { code: snap.error.code, message: snap.error.message };
  } else if (d?.partial) {
    status = 'partial';
    error = d.partialError;
  }
  return { status, fetchedAt: iso(snap.fetchedAt), lastTriedAt: iso(snap.lastTriedAt), error, ...base, ...values };
}
