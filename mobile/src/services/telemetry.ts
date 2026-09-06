import { getInstallId } from './installIdentity';
export { getInstallId } from './installIdentity';
import { getAllStoredEvents, acknowledgeEvents } from './eventLogger';
import { isSupabaseConfigured, sbRpc } from './supabaseClient';

/**
 * Optional remote telemetry transport.
 *
 * Uploads locally logged game events (see eventLogger.ts) to a remote
 * collector. Dependency-free: uses the global fetch available in
 * React Native.
 *
 * Enable uploads by setting an HTTPS collector URL (e.g. a self-hosted
 * collector or a PostHog capture endpoint) WITHOUT a code change: add
 *   "extra": { "telemetryEndpoint": "https://collector.example/capture" }
 * to app.json (or inject it via an EAS env-driven app.config). Empty /
 * unset = fully disabled (the default) — no network traffic occurs.
 * Remember to update the privacy policy before enabling.
 */

/**
 * Read Expo config `extra` lazily so this module still loads in Node test
 * environments (where expo-constants isn't resolvable). Mirrors the
 * lazy-require pattern used for react-native below.
 */
function getConfigExtra(): Record<string, unknown> {
  try {
    const Constants = require('expo-constants').default;
    return (Constants?.expoConfig?.extra as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

/** Resolve the configured collector URL ('' when unset/disabled). */
function getTelemetryEndpoint(): string {
  const endpoint = getConfigExtra().telemetryEndpoint;
  return typeof endpoint === 'string' ? endpoint : '';
}

function getAppVersion(): string {
  try {
    const Constants = require('expo-constants').default;
    return (Constants?.expoConfig?.version as string) ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}

/** Minimum time between upload attempts (ms). */
const SYNC_THROTTLE_MS = 60_000;

// Last sync attempt timestamp (module memory — resets on app restart)
let lastSyncAttempt = 0;

/**
 * Whether telemetry uploads are enabled — either a custom collector endpoint
 * OR a Supabase backend is configured. When neither is set, telemetry is a
 * complete no-op and no network traffic occurs.
 */
export function isTelemetryEnabled(): boolean {
  return getTelemetryEndpoint().length > 0 || isSupabaseConfigured();
}


function getPlatformOS(): string {
  try {
    // Lazy require so this module loads in Node test environments
    const { Platform } = require('react-native');
    return Platform?.OS ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Upload stored events to the configured collector. No-op when disabled.
 * Throttled to one attempt per SYNC_THROTTLE_MS. Never throws.
 */
let inFlight: Promise<void> | null = null;
export function syncTelemetry(): Promise<void> {
  if (!isTelemetryEnabled()) return Promise.resolve();
  if (inFlight) return inFlight;
  const now = Date.now();
  if (now - lastSyncAttempt < SYNC_THROTTLE_MS) return Promise.resolve();
  lastSyncAttempt = now;
  inFlight = uploadEvents().finally(() => { inFlight = null; });
  return inFlight;
}

async function uploadEvents(): Promise<void> {
  try {
    const events = await getAllStoredEvents();
    if (!events.length) return;
    const installId = await getInstallId();
    const endpoint = getTelemetryEndpoint();
    if (endpoint) {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const response = await Promise.race([
          fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
            signal: controller?.signal,
            body: JSON.stringify({ installId, platform: getPlatformOS(), appVersion: getAppVersion(), events }) }),
          new Promise<null>(resolve => { timer = setTimeout(() => { controller?.abort(); resolve(null); }, 8000); }),
        ]);
        if (response?.ok) await acknowledgeEvents(events.map(event => event.id));
      } finally { if (timer) clearTimeout(timer); }
      return;
    }
    // The events table stays unreadable to anon. PostgreSQL ON CONFLICT needs
    // SELECT internally, so deduplication belongs in a bounded definer RPC.
    const accepted = await sbRpc<boolean>('ingest_events_v2', {
      p_install_id: installId, p_platform: getPlatformOS(),
      p_app_version: getAppVersion(), p_events: events,
    });
    if (accepted === true) await acknowledgeEvents(events.map(event => event.id));
  } catch { /* Retain unacknowledged records for a later attempt. */ }
}
