import { getSentryDsn } from './supabaseClient';
import { setErrorForwarder } from './errorReporting';
import { getInstallId } from './telemetry';

/**
 * Dependency-free remote crash reporting.
 *
 * Forwards errors captured by errorReporting.reportError() to Sentry over plain
 * HTTP (the "store" endpoint) — NO native SDK, so the app keeps running in Expo
 * Go and nothing is bundled until a DSN is configured. Enable WITHOUT a code
 * change by adding to app.json `extra`:
 *   "sentryDsn": "https://<publicKey>@<host>/<projectId>"
 * Empty / unset = fully disabled (the default): initCrashReporter() is a no-op
 * and no forwarder is registered, so no network traffic occurs. Never throws.
 */

interface ParsedDsn {
  publicKey: string;
  host: string;
  projectId: string;
  /** The Sentry "store" endpoint events are POSTed to. */
  storeUrl: string;
}

interface ErrorContext {
  source: string;
  metadata?: Record<string, unknown>;
}

const SENTRY_CLIENT = 'wordshift/1.0';
const SENTRY_VERSION = '7';

/**
 * Parse a Sentry DSN of the form https://<publicKey>@<host>/<projectId>.
 * Returns null when the DSN is empty or malformed.
 */
export function parseSentryDsn(dsn: string): ParsedDsn | null {
  const trimmed = dsn.trim();
  if (!trimmed) return null;
  // https://<publicKey>@<host>/<...path>/<projectId>
  const match = /^https?:\/\/([^@]+)@([^/]+)\/(.+)$/.exec(trimmed);
  if (!match) return null;
  const [, publicKey, host, rest] = match;
  // The project id is the final path segment; any preceding path is preserved.
  const segments = rest.split('/').filter(Boolean);
  const projectId = segments.pop();
  if (!publicKey || !host || !projectId) return null;
  const pathPrefix = segments.length ? `/${segments.join('/')}` : '';
  return {
    publicKey,
    host,
    projectId,
    storeUrl: `https://${host}${pathPrefix}/api/${projectId}/store/`,
  };
}

function getAppVersion(): string {
  try {
    const Constants = require('expo-constants').default;
    return (Constants?.expoConfig?.version as string) ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function generateEventId(): string {
  // 32-char hex id (no dashes), as Sentry expects for event_id.
  let id = '';
  for (let i = 0; i < 32; i++) {
    id += Math.floor(Math.random() * 16).toString(16);
  }
  return id;
}

/** Build the minimal Sentry "store" event payload for an error. */
function buildSentryEvent(
  error: Error | string,
  context: ErrorContext,
  release: string,
  installId: string | null,
): Record<string, unknown> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const type = error instanceof Error ? error.name || 'Error' : 'Error';

  return {
    event_id: generateEventId(),
    timestamp: new Date().toISOString(),
    platform: 'javascript',
    level: 'error',
    message,
    release,
    exception: {
      values: [
        {
          type,
          value: message,
          stacktrace: stack ?? '',
        },
      ],
    },
    tags: {
      source: context.source,
      ...(installId ? { install_id: installId } : {}),
    },
    ...(installId ? { user: { id: installId } } : {}),
    ...(context.metadata ? { extra: context.metadata } : {}),
  };
}

/**
 * POST a Sentry store event. Never throws — a failing transport must not
 * affect local error reporting.
 */
async function postSentryEvent(
  parsed: ParsedDsn,
  error: Error | string,
  context: ErrorContext,
  release: string,
): Promise<void> {
  try {
    let installId: string | null = null;
    try {
      installId = await getInstallId();
    } catch {
      installId = null;
    }
    const body = buildSentryEvent(error, context, release, installId);
    await fetch(parsed.storeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth':
          `Sentry sentry_version=${SENTRY_VERSION}, ` +
          `sentry_key=${parsed.publicKey}, sentry_client=${SENTRY_CLIENT}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Swallow — crash forwarding is best-effort.
  }
}

/**
 * Initialize remote crash forwarding. No-op when no Sentry DSN is configured.
 * Otherwise registers a forwarder on errorReporting that POSTs each error to
 * the parsed Sentry store URL. Safe to call once at app startup.
 */
export function initCrashReporter(): void {
  const dsn = getSentryDsn();
  if (!dsn) return; // No DSN configured — fully disabled.

  const parsed = parseSentryDsn(dsn);
  if (!parsed) return; // Malformed DSN — stay disabled rather than throw.

  const release = getAppVersion();

  setErrorForwarder((error, context) => {
    // Fire-and-forget; the forwarder itself is wrapped in try/catch upstream.
    void postSentryEvent(parsed, error, context, release);
  });
}
