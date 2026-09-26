// Section loaders and the response envelope (spec section 6.1). The three
// database sections and the two external providers each sit behind their own
// cache, so a slow cohort query can never hold up the live panels.
import { createCache, PublicError } from './cache.js';
import { VALIDATORS } from './contract.js';
import { DB_MESSAGES } from './db.js';
import { demoData, loadDemoFixtures, scenarioEnvelope } from './demo.js';
import { buildLinks } from './external/links.js';
import { createRevenueCatSource, revenueCatPanel } from './external/revenuecat.js';
import { createSentrySource, sentryPanel } from './external/sentry.js';
import { isoSeconds } from './external/http.js';

export const SECTION_NAMES = ['live', 'cohorts', 'progress', 'external'];
export const TTL = {
  live: { ttlMs: 20_000, retryMs: 15_000 },
  cohorts: { ttlMs: 300_000, retryMs: 60_000 },
  progress: { ttlMs: 300_000, retryMs: 60_000 },
  revenuecat: { ttlMs: 300_000, retryMs: 300_000 },
  sentry: { ttlMs: 300_000, retryMs: 300_000 },
};
const TTL_SEC = { live: 20, cohorts: 300, progress: 300, external: 300 };

const iso = (ms) => (ms === null || ms === undefined ? null : isoSeconds(ms));

/**
 * @param {{ config: any, notices: string[], db: { call: (s: string) => Promise<any> } | null,
 *   fetchImpl?: typeof fetch, nowMs?: () => number, log: any, fixtureDirs?: string[] }} deps
 */
export function createSections({ config, notices, db, fetchImpl = globalThis.fetch, nowMs = () => Date.now(), log, fixtureDirs }) {
  const envelope = (section, snap) => ({
    ok: snap.error === null,
    section,
    serverNow: iso(nowMs()),
    fetchedAt: iso(snap.fetchedAt),
    ttlSec: TTL_SEC[section],
    stale: snap.stale,
    error: snap.error ? { code: snap.error.code, message: snap.error.message, at: iso(snap.error.at) } : null,
    notices: [...notices],
    data: snap.data,
  });

  if (config.demo) {
    return {
      async get(section) {
        const now = nowMs();
        if (config.demoScenario) {
          const scenario = await scenarioEnvelope(config.demoScenario, section, now);
          if (scenario) return scenario;
          return envelope(section, { data: null, fetchedAt: null, stale: false, lastTriedAt: now,
            error: { code: 'demo_missing', message: `Scenario fixture ${config.demoScenario}/${section}.json is missing.`, at: now } });
        }
        const fixtures = await loadDemoFixtures(fixtureDirs);
        const data = demoData(fixtures, section, now);
        if (data === null) {
          return envelope(section, { data: null, fetchedAt: null, stale: false, lastTriedAt: now,
            error: { code: 'demo_missing', message: 'Demo fixtures are missing.', at: now } });
        }
        return envelope(section, { data, fetchedAt: now, stale: false, error: null, lastTriedAt: now });
      },
    };
  }

  const offMessage = config.dbOffReason === 'ca_missing' ? DB_MESSAGES.ca_missing : DB_MESSAGES.not_configured;
  const offCode = config.dbOffReason === 'ca_missing' ? 'ca_missing' : 'not_configured';
  const dbCache = (section) => createCache({
    ...TTL[section],
    nowMs,
    onError: (err) => log.warn('section_failed', { section, code: err?.code ?? 'internal', sqlstate: err?.detail?.sqlstate }),
    load: async () => {
      if (!db) throw new PublicError(offCode, offMessage);
      const data = await db.call(section);
      const problems = VALIDATORS[section](data);
      if (problems.length) {
        log.warn('bad_payload', { section, problems: problems.slice(0, 12) });
        throw new PublicError('bad_payload', DB_MESSAGES.bad_payload);
      }
      return data;
    },
  });
  const caches = { live: dbCache('live'), cohorts: dbCache('cohorts'), progress: dbCache('progress') };

  const providerCache = (name, source) => (source ? createCache({
    ...TTL[name],
    nowMs,
    onError: (err) => log.warn('provider_failed', { provider: name, code: err?.code ?? 'internal' }),
    load: () => source.load(),
  }) : null);
  const rc = providerCache('revenuecat', config.revenuecat ? createRevenueCatSource(config.revenuecat, { fetchImpl }) : null);
  const sentry = providerCache('sentry', config.sentry ? createSentrySource(config.sentry, { fetchImpl }) : null);
  const links = buildLinks(config);
  const empty = { data: null, fetchedAt: null, stale: false, error: null, lastTriedAt: null };

  return {
    async get(section) {
      if (section === 'external') {
        const [rcSnap, sentrySnap] = await Promise.all([rc ? rc.get() : empty, sentry ? sentry.get() : empty]);
        const data = {
          revenuecat: revenueCatPanel(Boolean(rc), rcSnap),
          sentry: sentryPanel(Boolean(sentry), sentrySnap, config.sentryLink),
          links,
        };
        return envelope('external', { data, fetchedAt: nowMs(), stale: false, error: null });
      }
      const cache = caches[section];
      if (!cache) throw new Error(`unknown section ${section}`);
      if (!db) {
        const now = nowMs();
        return envelope(section, { ...empty, lastTriedAt: now,
          error: { code: offCode, message: offMessage, at: now } });
      }
      return envelope(section, await cache.get());
    },
  };
}
