import { getInstallId } from './installIdentity';

/**
 * Shared Supabase REST client for WordShift.
 *
 * Dependency-free: talks to Supabase's PostgREST API over the global `fetch`
 * available in React Native — NO native SDK, so the app keeps running in
 * Expo Go and nothing is bundled until credentials are configured.
 *
 * Enable WITHOUT a code change by adding to app.json `extra`:
 *   "supabaseUrl": "https://<project>.supabase.co",
 *   "supabaseAnonKey": "<anon public key>"
 * (and optionally "sentryDsn" for crash forwarding). Empty / unset = fully
 * disabled (the default) — no network traffic occurs and every call below
 * resolves to null without throwing.
 *
 * The anonymous install id (telemetry.getInstallId) is the default identity
 * for per-player rows (cloud save, leaderboard). Auth-free by design.
 *
 * SECURITY MODEL (capability URL): the anon key alone grants NO table access.
 * All app tables are RLS-locked with direct grants revoked (see
 * docs/supabase/security_setup.sql); every per-player read/write goes through
 * a SECURITY DEFINER RPC that requires presenting the row's unguessable owner
 * id. The only direct table operation the client performs is the INSERT-only
 * telemetry `events` sink. This module therefore exposes NO select helper —
 * reads happen exclusively via sbRpc.
 *
 * Remember to update the privacy policy before enabling.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Read Expo config `extra` lazily so this module still loads in Node test
 * environments (where expo-constants isn't resolvable).
 */
function getConfigExtra(): Record<string, unknown> {
  try {
    const Constants = require('expo-constants').default;
    return (Constants?.expoConfig?.extra as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

/** Resolve configured Supabase credentials, or null when unset/disabled. */
export function getSupabaseConfig(): SupabaseConfig | null {
  const extra = getConfigExtra();
  const url = typeof extra.supabaseUrl === 'string' ? extra.supabaseUrl.trim() : '';
  const anonKey = typeof extra.supabaseAnonKey === 'string' ? extra.supabaseAnonKey.trim() : '';
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/+$/, ''), anonKey };
}

/** Whether a Supabase backend is configured (credentials present). */
export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

/** Resolve the configured Sentry DSN ('' when unset/disabled). */
export function getSentryDsn(): string {
  const dsn = getConfigExtra().sentryDsn;
  return typeof dsn === 'string' ? dsn.trim() : '';
}

/** Default per-player identity for backend rows (anonymous install id). */
export async function getBackendIdentity(): Promise<string> {
  return getInstallId();
}

const DEFAULT_TIMEOUT_MS = 8_000;

/** Race a fetch against a timeout so a hung request never blocks the caller. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response | null> {
  const controller = typeof globalThis.AbortController === 'function'
    ? new globalThis.AbortController() : undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetch(url, { ...init, signal: controller?.signal }),
      new Promise<null>(resolve => {
        timer = setTimeout(() => { controller?.abort(); resolve(null); }, timeoutMs);
      }),
    ]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Low-level PostgREST request. `path` is appended to `<url>/rest/v1/`.
 * Returns the raw Response (or null when unconfigured / on network failure).
 * Never throws.
 */
export async function sbFetch(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response | null> {
  const config = getSupabaseConfig();
  if (!config) return null;

  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...rest } = init;
  const url = `${config.url}/rest/v1/${path.replace(/^\/+/, '')}`;
  return fetchWithTimeout(
    url,
    {
      ...rest,
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        'Content-Type': 'application/json',
        ...(headers as Record<string, string> | undefined),
      },
    },
    timeoutMs,
  );
}

async function parseJson<T>(response: Response | null): Promise<T | null> {
  if (!response || !response.ok) return null;
  try {
    // 204 No Content (e.g. an insert without `return=representation`)
    if (response.status === 204) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

interface InsertOptions {
  /**
   * Return the written rows (Prefer: return=representation). Default true.
   * NOTE: representation requires SELECT privilege, which anon does NOT have
   * on any app table — pass `returning: false` for the insert-only `events`
   * sink (its only legitimate target under the RLS lockdown).
   */
  returning?: boolean;
}

/**
 * INSERT one or more rows. Under the capability-URL security model the only
 * table the anon role may insert into directly is the telemetry `events`
 * table (INSERT-only, no select). Everything else goes through sbRpc. There
 * is deliberately NO upsert/on_conflict support — per-player upserts are
 * server-side RPCs. Returns written rows when `returning`, else an empty
 * array on success, or null on failure / when disabled.
 */
export async function sbInsert<T>(
  table: string,
  rows: object | object[],
  opts: InsertOptions = {},
): Promise<T[] | null> {
  const { returning = true } = opts;
  const response = await sbFetch(table, {
    method: 'POST',
    headers: { Prefer: returning ? 'return=representation' : 'return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!response) return null;
  if (!response.ok) return null;
  const parsed = await parseJson<T[]>(response);
  return parsed ?? ([] as T[]);
}

/**
 * Call a Postgres function (RPC). Used for atomic server-side aggregates
 * (e.g. incrementing global counters, computing a percentile). Returns the
 * function result, or null on failure / when disabled.
 */
export async function sbRpc<T>(fn: string, params: object = {}): Promise<T | null> {
  const response = await sbFetch(`rpc/${fn}`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return parseJson<T>(response);
}
