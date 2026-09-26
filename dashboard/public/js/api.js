// Polling for the four API sections. One request per section at a time, chained
// with setTimeout after each answer, paused while the tab is hidden, backing off
// after failures. A 401 sends the browser to the sign-in page.

const ENDPOINTS = [
  { key: 'live', path: '/api/live', everyMs: 30_000 },
  { key: 'cohorts', path: '/api/cohorts', everyMs: 60_000 },
  { key: 'progress', path: '/api/progress', everyMs: 60_000 },
  { key: 'external', path: '/api/external', everyMs: 60_000 },
];
const BACKOFF_MS = [5_000, 10_000, 20_000, 40_000, 80_000, 120_000];
const REQUEST_TIMEOUT_MS = 25_000;

function isEnvelope(body) {
  return Boolean(body) && typeof body === 'object' && typeof body.section === 'string' && 'data' in body;
}

/**
 * handlers: {
 *   onEnvelope(key, envelope)          a section answered
 *   onFailure(key, kind)               kind 'offline' (network) or 'server' (bad answer)
 *   onUnauthorized()                   the session is gone
 * }
 */
export function startPolling(handlers) {
  const endpoints = ENDPOINTS.map((e) => ({ ...e, timer: 0, inFlight: false, failures: 0 }));
  let stopped = false;

  async function load(ep) {
    if (ep.inFlight || stopped) return;
    ep.inFlight = true;
    clearTimeout(ep.timer);
    let delay = ep.everyMs;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      let res;
      try {
        res = await fetch(ep.path, {
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
      } catch {
        throw Object.assign(new Error('network'), { kind: 'offline' });
      } finally {
        clearTimeout(timeout);
      }
      if (res.status === 401) {
        stopped = true;
        handlers.onUnauthorized();
        return;
      }
      let body = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }
      if (!res.ok || !isEnvelope(body)) throw Object.assign(new Error(`status ${res.status}`), { kind: 'server' });
      ep.failures = 0;
      handlers.onEnvelope(ep.key, body);
    } catch (err) {
      ep.failures += 1;
      delay = BACKOFF_MS[Math.min(ep.failures - 1, BACKOFF_MS.length - 1)];
      handlers.onFailure(ep.key, err && err.kind === 'server' ? 'server' : 'offline');
    } finally {
      ep.inFlight = false;
      if (!stopped && !document.hidden) ep.timer = setTimeout(() => load(ep), delay);
    }
  }

  function pause() {
    for (const ep of endpoints) clearTimeout(ep.timer);
  }

  function resume() {
    for (const ep of endpoints) load(ep);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
    else resume();
  });

  resume();
  return { refresh: resume };
}
