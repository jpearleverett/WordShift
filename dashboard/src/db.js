// Postgres access through the Supavisor shared pooler as dashboard_reader.
// The pool is built from a config OBJECT, never a connection string: in
// node-postgres an sslmode in a URL silently overrides the ssl options.
import { isIP } from 'node:net';
import { checkServerIdentity } from 'node:tls';
import pg from 'pg';
import { PublicError } from './cache.js';

export const QUERIES = Object.freeze({
  live: 'select public.dashboard_live($1::text, $2::timestamptz) as data',
  cohorts: 'select public.dashboard_cohorts($1::text, $2::timestamptz) as data',
  progress: 'select public.dashboard_progress($1::timestamptz) as data',
});

/** Error the guarded client raises instead of answering a weak password request. */
export const AUTH_DOWNGRADE_CODE = 'EAUTHDOWNGRADE';

function refuseWeakAuth(client, kind) {
  const err = new Error(`the server asked for a ${kind} password; refused`);
  err.code = AUTH_DOWNGRADE_CODE;
  // Fail the connect first, then drop the socket, so the first error is ours.
  client.connection.emit('error', err);
  client.connection.stream?.destroy?.();
}

/**
 * A pg Client that only ever authenticates with SCRAM. node-postgres answers
 * a cleartext or MD5 password request unconditionally, so anything that can
 * pose as the pooler could otherwise ask for, and receive, the real
 * dashboard_reader password. Supavisor and Supabase Postgres use SCRAM-SHA-256.
 */
export class GuardedClient extends pg.Client {
  _handleAuthCleartextPassword() { refuseWeakAuth(this, 'cleartext'); }

  _handleAuthMD5Password() { refuseWeakAuth(this, 'MD5'); }
}

export function buildPoolConfig(cfg) {
  return {
    Client: GuardedClient,
    host: cfg.dbHost,
    port: cfg.dbPort,
    database: cfg.dbName,
    user: cfg.dbUser,
    password: cfg.dbPassword,
    ssl: cfg.dbCaCert
      ? {
        ca: cfg.dbCaCert,
        rejectUnauthorized: true,
        ...(isIP(cfg.dbHost) ? {} : { servername: cfg.dbHost }),
        // Always check the certificate against the configured host. pg passes
        // no host to tls.connect, so without this an IP host would be checked
        // against Node's default "localhost".
        checkServerIdentity: (_name, cert) => checkServerIdentity(cfg.dbHost, cert),
      }
      // Encrypted but unverified: local runs only. config.js keeps the
      // database off in production until a CA certificate is configured.
      : { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
    query_timeout: 12000,
    application_name: 'wordshift-dashboard',
    keepAlive: true,
  };
}

const TLS_CODES = new Set(['SELF_SIGNED_CERT_IN_CHAIN', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'ERR_TLS_CERT_ALTNAME_INVALID', 'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_GET_ISSUER_CERT',
  'CERT_NOT_YET_VALID', 'CERT_SIGNATURE_FAILURE', 'CERT_UNTRUSTED', 'ERR_SSL_WRONG_VERSION_NUMBER']);
const NETWORK_CODES = new Set(['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', 'EAI_AGAIN', 'EPIPE']);

export const DB_MESSAGES = Object.freeze({
  not_configured: 'Database settings are missing. Re-run deploy.sh.',
  ca_missing: 'The database is off because the Supabase CA certificate is missing. Without it the dashboard cannot tell the real pooler from an impostor. Re-run deploy.sh and give it the certificate.',
  db_auth_downgrade: 'The server asked for the database password in a weak form (cleartext or MD5), so the dashboard refused to send it. Supabase never does this: something between Cloud Run and Supabase may be posing as the pooler. Check DB_HOST, and rotate the password with deploy.sh --rotate-db-password if in doubt.',
  db_auth_failed: 'The database rejected the dashboard password. On a first deploy this usually means the ALTER ROLE line from deploy.sh has not been run in the Supabase SQL editor yet. Otherwise re-run deploy.sh with --rotate-db-password and run the new line. A just-changed password can take a minute to reach the pooler.',
  db_login_disabled: 'The dashboard_reader role cannot log in yet. Run the ALTER ROLE line from deploy.sh in the Supabase SQL editor.',
  db_user_unknown: 'The pooler does not know this user. Check SUPABASE_PROJECT_REF and DB_HOST.',
  db_auth_query: 'The pooler could not look up dashboard_reader. Make sure the role exists and its VALID UNTIL has not passed.',
  db_missing_function: 'Dashboard functions are missing. Run docs/supabase/dashboard_reader_v1.sql in the Supabase SQL editor.',
  db_permission_denied: 'Permission denied. Re-run docs/supabase/dashboard_reader_v1.sql.',
  db_timeout: 'The database query took too long.',
  db_too_many_connections: 'Too many database connections right now.',
  db_tls_failed: 'Could not verify the database certificate. Check the DB_CA_CERT secret.',
  db_unreachable: 'Could not reach the database pooler.',
  db_error: 'The database returned an error.',
  bad_payload: 'The dashboard functions returned an unexpected shape. Re-run docs/supabase/dashboard_reader_v1.sql.',
});

const SQLSTATE_RE = /^[0-9A-Z]{5}$/;
const NODE_CODE_RE = /^[A-Z][A-Z0-9_]{1,47}$/;

/** Maps a driver error to a fixed code and message. The raw driver message never leaves. */
export function mapDbError(err) {
  if (err instanceof PublicError) return { code: err.code, message: err.publicMessage };
  const code = typeof err?.code === 'string' ? err.code : '';
  const text = typeof err?.message === 'string' ? err.message : '';
  const lower = text.toLowerCase();
  const withCode = (key, raw) => ({
    code: key,
    message: raw && (SQLSTATE_RE.test(raw) || NODE_CODE_RE.test(raw)) ? `${DB_MESSAGES[key]} (${raw})` : DB_MESSAGES[key],
  });
  const plain = (key) => ({ code: key, message: DB_MESSAGES[key] });

  if (code === AUTH_DOWNGRADE_CODE) return plain('db_auth_downgrade');
  if (code === '28P01' || lower.includes('password authentication failed')) return plain('db_auth_failed');
  if (code === '28000' || lower.includes('not permitted to log in')) return plain('db_login_disabled');
  if (lower.includes('tenant or user not found')) return plain('db_user_unknown');
  if (text.includes('EAUTHQUERY')) return plain('db_auth_query');
  if (code === '42883') return plain('db_missing_function');
  if (code === '42501') return plain('db_permission_denied');
  if (code === '57014' || lower.includes('query read timeout')) return plain('db_timeout');
  if (code === '53300' || code === '53400') return plain('db_too_many_connections');
  if (TLS_CODES.has(code) || code.startsWith('ERR_TLS_') || code.startsWith('ERR_SSL_')) return withCode('db_tls_failed', code);
  if (NETWORK_CODES.has(code) || lower.includes('timeout expired') || lower.includes('connection terminated')
    || lower.includes('timeout exceeded when trying to connect') || lower.includes('the server does not support ssl')) {
    return withCode('db_unreachable', code);
  }
  return withCode('db_error', code);
}

/**
 * @param {object} cfg config from loadConfig
 * @param {{ Pool?: any, log?: any }} [deps]
 */
export function createDb(cfg, { Pool = pg.Pool, log } = {}) {
  let pool = null;
  const getPool = () => {
    if (!pool) {
      pool = new Pool(buildPoolConfig(cfg));
      pool.on('error', (err) => log?.warn('db_idle_client_error', { code: typeof err?.code === 'string' ? err.code : 'unknown' }));
    }
    return pool;
  };

  async function call(section) {
    const text = QUERIES[section];
    if (!text) throw new Error(`unknown section ${section}`);
    const params = section === 'progress' ? [cfg.launchAtIso] : [cfg.tz, cfg.launchAtIso];
    let result;
    for (let attempt = 1; ; attempt++) {
      try {
        result = await getPool().query(text, params);
        break;
      } catch (err) {
        const mapped = mapDbError(err);
        // Cloud Run throttles CPU between requests, so the pool can hand out a
        // connection the pooler already dropped. The read is side-effect free:
        // retry a lost connection once instead of showing a false alarm.
        if (mapped.code === 'db_unreachable' && attempt === 1) {
          log?.warn('db_retry_after_lost_connection', { code: typeof err?.code === 'string' ? err.code : 'unknown' });
          continue;
        }
        throw new PublicError(mapped.code, mapped.message, { sqlstate: typeof err?.code === 'string' ? err.code : undefined });
      }
    }
    return result?.rows?.[0]?.data ?? null;
  }

  async function end() {
    if (pool) {
      const p = pool;
      pool = null;
      await p.end();
    }
  }

  return { call, end };
}
