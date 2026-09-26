// Shared outbound JSON GET for the optional panels. Keys stay on the server:
// redirects are refused so a token is never forwarded to another host.
import { PublicError } from '../cache.js';

export const REQUEST_TIMEOUT_MS = 8000;
const MAX_RESPONSE_BYTES = 1_000_000;

/**
 * @param {string} provider  'RevenueCat' | 'Sentry'
 * @param {Record<number | string, string>} messages  per-status messages
 */
export async function getJson(fetchImpl, url, { token, provider, messages, timeoutMs = REQUEST_TIMEOUT_MS }) {
  let res;
  try {
    res = await fetchImpl(url, {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'wordshift-dashboard/1',
      },
    });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new PublicError('timeout', `${provider} did not answer in time.`);
    }
    throw new PublicError('network', `Could not reach ${provider}.`);
  }
  if (!res.ok) {
    const status = res.status;
    // Drain so the connection can be reused; the body is never shown.
    try { await res.text(); } catch { /* ignore */ }
    if (status >= 500) throw new PublicError('http_5xx', messages['5xx']);
    if (messages[status]) throw new PublicError(`http_${status}`, messages[status]);
    throw new PublicError(`http_${status >= 100 && status < 600 ? status : 'error'}`, `${provider} answered with an error.`);
  }
  let text;
  try {
    text = await res.text();
  } catch {
    throw new PublicError('network', `Could not reach ${provider}.`);
  }
  if (text.length > MAX_RESPONSE_BYTES) throw new PublicError('bad_payload', `${provider} sent an unexpected answer.`);
  try {
    return { json: JSON.parse(text), headers: res.headers };
  } catch {
    throw new PublicError('bad_payload', `${provider} sent an unexpected answer.`);
  }
}

// Control characters and bidi overrides out; one line; bounded length.
export function cleanText(value, max) {
  if (typeof value !== 'string') return '';
  const text = value.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 3).trimEnd()}...` : text;
}

export const isoSeconds = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

export function normaliseIso(value) {
  if (typeof value !== 'string' || value.length > 64) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? isoSeconds(ms) : null;
}
