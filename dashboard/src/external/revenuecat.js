// RevenueCat API v2 overview metrics (read-only secret key with the
// charts_metrics:overview:read permission). One call at most every 5 minutes,
// far under the 25 requests a minute Charts and Metrics limit.
import { PublicError } from '../cache.js';
import { cleanText, getJson, isoSeconds } from './http.js';

export const REVENUECAT_DASHBOARD_URL = 'https://app.revenuecat.com/';
const MESSAGES = {
  401: 'RevenueCat rejected the key. Use a v2 secret key with the charts_metrics:overview:read permission.',
  403: 'The RevenueCat key is not allowed to read overview metrics.',
  404: 'RevenueCat project not found. Check REVENUECAT_PROJECT_ID.',
  429: 'RevenueCat rate limit reached.',
  '5xx': 'RevenueCat had a server error.',
};

export function revenueCatUrl({ projectId, currency }) {
  const base = `https://api.revenuecat.com/v2/projects/${encodeURIComponent(projectId)}/metrics/overview`;
  return currency ? `${base}?currency=${encodeURIComponent(currency)}` : base;
}

/** Parses the documented overview_metrics answer; throws bad_payload on anything else. */
export function parseOverview(json) {
  if (json === null || typeof json !== 'object' || !Array.isArray(json.metrics)) {
    throw new PublicError('bad_payload', 'RevenueCat sent an unexpected answer.');
  }
  const metrics = [];
  for (const m of json.metrics) {
    if (metrics.length >= 16) break;
    if (m === null || typeof m !== 'object') continue;
    if (typeof m.id !== 'string' || !/^[a-z0-9_]{1,64}$/.test(m.id)) continue;
    if (typeof m.value !== 'number' || !Number.isFinite(m.value)) continue;
    const ms = m.last_updated_at;
    metrics.push({
      id: m.id,
      name: cleanText(m.name, 60) || m.id,
      value: m.value,
      unit: cleanText(m.unit, 8),
      period: typeof m.period === 'string' && /^P[0-9]{1,5}D$/.test(m.period) ? m.period : '',
      lastUpdatedAt: typeof ms === 'number' && Number.isFinite(ms) && ms > 0 && ms < 8.64e15 ? isoSeconds(ms) : null,
    });
  }
  const currency = typeof json.currency === 'string' && /^[A-Z]{3}$/.test(json.currency) ? json.currency : null;
  return { currency, metrics };
}

export function createRevenueCatSource({ apiKey, projectId, currency }, { fetchImpl = globalThis.fetch } = {}) {
  return {
    async load() {
      const { json } = await getJson(fetchImpl, revenueCatUrl({ projectId, currency }), { token: apiKey, provider: 'RevenueCat', messages: MESSAGES });
      return parseOverview(json);
    },
  };
}

/** The panel object of the external payload, from a cache snapshot. */
export function revenueCatPanel(enabled, snap) {
  const iso = (ms) => (ms === null || ms === undefined ? null : isoSeconds(ms));
  if (!enabled) {
    return { status: 'not_configured', fetchedAt: null, lastTriedAt: null, error: null, currency: null, metrics: [], dashboardUrl: REVENUECAT_DASHBOARD_URL };
  }
  const data = snap.data;
  return {
    status: snap.error ? 'unavailable' : 'ok',
    fetchedAt: iso(snap.fetchedAt),
    lastTriedAt: iso(snap.lastTriedAt),
    error: snap.error ? { code: snap.error.code, message: snap.error.message } : null,
    currency: data?.currency ?? null,
    metrics: data?.metrics ?? [],
    dashboardUrl: REVENUECAT_DASHBOARD_URL,
  };
}
