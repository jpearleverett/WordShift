import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllStoredEvents, removeOldestEvents } from './eventLogger';
import { isSupabaseConfigured, sbInsert } from './supabaseClient';

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
const INSTALL_ID_KEY = 'wordshift_install_id';

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

// In-memory cache for the anonymous install id
let installIdCache: string | null = null;

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

function generateInstallId(): string {
  try {
    // uuid v4 requires crypto.getRandomValues — fall back below if unavailable
    const { v4 } = require('uuid');
    return v4();
  } catch {
    return `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Get the anonymous install id, lazily creating and persisting it
 * on first access.
 */
export async function getInstallId(): Promise<string> {
  if (installIdCache) return installIdCache;
  try {
    const stored = await AsyncStorage.getItem(INSTALL_ID_KEY);
    if (stored) {
      installIdCache = stored;
      return stored;
    }
  } catch {
    // Fall through to generate a fresh id
  }
  const id = generateInstallId();
  installIdCache = id;
  try {
    await AsyncStorage.setItem(INSTALL_ID_KEY, id);
  } catch {
    // Non-critical — a fresh id will be generated next launch
  }
  return id;
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
export async function syncTelemetry(): Promise<void> {
  if (!isTelemetryEnabled()) return;

  const now = Date.now();
  if (now - lastSyncAttempt < SYNC_THROTTLE_MS) return;
  lastSyncAttempt = now;

  try {
    const events = await getAllStoredEvents();
    if (events.length === 0) return;

    const installId = await getInstallId();
    const endpoint = getTelemetryEndpoint();

    if (endpoint.length > 0) {
      // Custom collector path (unchanged): one batched POST.
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          installId,
          platform: getPlatformOS(),
          appVersion: getAppVersion(),
          events,
        }),
      });

      if (response.ok) {
        await removeOldestEvents(events.length);
      }
      return;
    }

    // Supabase analytics sink — no custom endpoint, but a backend is
    // configured. Upload one row per event into the `events` table.
    if (isSupabaseConfigured()) {
      const platform = getPlatformOS();
      const appVersion = getAppVersion();
      const rows = events.map((event) => ({
        install_id: installId,
        platform,
        app_version: appVersion,
        type: event.type,
        data: event.data ?? {},
        created_at: new Date(event.timestamp).toISOString(),
      }));
      const result = await sbInsert('events', rows, { returning: false });
      if (result !== null) {
        await removeOldestEvents(events.length);
      }
    }
  } catch {
    // Network/storage failure — events stay queued for the next sync
  }
}
