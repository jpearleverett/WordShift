import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllStoredEvents, removeOldestEvents } from './eventLogger';

/**
 * Optional remote telemetry transport.
 *
 * Uploads locally logged game events (see eventLogger.ts) to a remote
 * collector. Dependency-free: uses the global fetch available in
 * React Native.
 *
 * Set TELEMETRY_ENDPOINT to an HTTPS collector URL (e.g. a self-hosted
 * collector or a PostHog capture endpoint) to enable uploads.
 * Empty string = fully disabled (the default) — no network traffic occurs.
 */
const TELEMETRY_ENDPOINT = '';

const INSTALL_ID_KEY = 'wordshift_install_id';
const APP_VERSION = '1.0.0';

/** Minimum time between upload attempts (ms). */
const SYNC_THROTTLE_MS = 60_000;

// In-memory cache for the anonymous install id
let installIdCache: string | null = null;

// Last sync attempt timestamp (module memory — resets on app restart)
let lastSyncAttempt = 0;

/**
 * Whether telemetry uploads are enabled (an endpoint is configured).
 */
export function isTelemetryEnabled(): boolean {
  return TELEMETRY_ENDPOINT.length > 0;
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
    const response = await fetch(TELEMETRY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        installId,
        platform: getPlatformOS(),
        appVersion: APP_VERSION,
        events,
      }),
    });

    if (response.ok) {
      await removeOldestEvents(events.length);
    }
  } catch {
    // Network/storage failure — events stay queued for the next sync
  }
}
