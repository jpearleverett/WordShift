// Lazy TTL cache with single-flight loading and stale-on-error. Nothing runs
// on a timer: a refresh happens only when a request finds the data too old,
// so with no viewer there are no queries at all.

/** An error whose code and message are safe to show on the page. */
export class PublicError extends Error {
  constructor(code, publicMessage, detail = {}) {
    super(publicMessage);
    this.code = code;
    this.publicMessage = publicMessage;
    this.detail = detail;
  }
}

export function toPublicError(err) {
  if (err instanceof PublicError) return { code: err.code, message: err.publicMessage };
  return { code: 'internal', message: 'Something went wrong.' };
}

/**
 * @param {{ ttlMs: number, retryMs: number, load: () => Promise<any>, nowMs?: () => number, onError?: (err: any) => void }} options
 */
export function createCache({ ttlMs, retryMs, load, nowMs = () => Date.now(), onError = () => {} }) {
  const state = { data: null, fetchedAt: null, error: null, lastTriedAt: null };
  let inflight = null;

  const snapshot = () => ({
    data: state.data,
    fetchedAt: state.fetchedAt,
    stale: state.error !== null && state.data !== null,
    error: state.error,
    lastTriedAt: state.lastTriedAt,
  });

  async function refresh() {
    state.lastTriedAt = nowMs();
    try {
      const data = await load();
      state.data = data;
      state.fetchedAt = nowMs();
      state.error = null;
    } catch (err) {
      onError(err);
      state.error = { ...toPublicError(err), at: nowMs() };
    }
  }

  return {
    async get() {
      const now = nowMs();
      const fresh = state.data !== null && state.error === null && now - state.fetchedAt < ttlMs;
      const coolingDown = state.error !== null && now - state.lastTriedAt < retryMs;
      if (!fresh && !coolingDown) {
        if (!inflight) inflight = refresh().finally(() => { inflight = null; });
        await inflight;
      }
      return snapshot();
    },
    peek: snapshot,
  };
}
