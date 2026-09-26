// Environment parsing and validation. Pure: loadConfig(env, now) returns the
// config plus page notices, fatal errors and warnings, and never throws.
import { X509Certificate } from 'node:crypto';

export const DEFAULTS = {
  port: 8080,
  dbPort: 5432,
  dbName: 'postgres',
  tz: 'UTC',
  sentryOrg: 'iridescent-games-9n',
  sentryProjectId: '4511612372844544',
  sentryApiBase: 'https://us.sentry.io',
  sentryEnvironment: 'production',
  playConsoleUrl: 'https://play.google.com/console/',
  admobUrl: 'https://admob.google.com/',
};

const POOLER_HOST_RE = /^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/;
const HOSTNAME_RE = /^(?=.{1,253}$)[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;
const PROJECT_REF_RE = /^[a-z0-9]{20}$/;
const DB_USER_RE = /^[a-z_][a-z0-9_]{0,62}(\.[a-z0-9]{20})?$/;
const LAUNCH_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/;
const REVENUECAT_KEY_RE = /^sk_[A-Za-z0-9]+$/;
const REVENUECAT_PROJECT_RE = /^[A-Za-z0-9_-]{1,64}$/;
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'BRL', 'KRW', 'CNY', 'MXN', 'SEK', 'PLN', 'NZD', 'CHF'];
const SENTRY_ORG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const SENTRY_PROJECT_RE = /^[0-9]{1,20}$/;
const SENTRY_BASE_RE = /^https:\/\/([a-z0-9-]+\.)?sentry\.io$/;
const SENTRY_ENV_RE = /^[A-Za-z0-9_.-]{1,64}$/;
const SENTRY_TOKEN_RE = /^[A-Za-z0-9_.=:+/-]{8,512}$/;
const EARLIEST_LAUNCH_MS = Date.parse('2020-01-01T00:00:00Z');

const trimmed = (v) => (typeof v === 'string' ? v.trim() : '');

export function isValidTimeZone(tz) {
  if (typeof tz !== 'string' || tz.length < 1 || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function httpsUrl(value, fallback, name, warnings) {
  const v = trimmed(value);
  if (!v) return fallback;
  try {
    const u = new URL(v);
    if (u.protocol === 'https:' && !u.username && !u.password) return u.href;
  } catch { /* fall through */ }
  warnings.push(`${name} must be an https URL; using the default`);
  return fallback;
}

/** Colon-separated SHA-256 fingerprint of the first certificate, or null. */
export function certificateFingerprint(pem) {
  try {
    return new X509Certificate(pem).fingerprint256;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {number} [nowMs]
 */
export function loadConfig(env = process.env, nowMs = Date.now()) {
  const notices = [];
  const errors = [];
  const warnings = [];
  const production = env.NODE_ENV === 'production';

  const password = typeof env.DASHBOARD_PASSWORD === 'string' ? env.DASHBOARD_PASSWORD : '';
  if (password.length < 12 || password.length > 256) errors.push('DASHBOARD_PASSWORD must be 12 to 256 characters');
  const sessionSecret = typeof env.SESSION_SECRET === 'string' ? env.SESSION_SECRET : '';
  if (sessionSecret.length < 32) errors.push('SESSION_SECRET must be at least 32 characters');

  let port = DEFAULTS.port;
  if (trimmed(env.PORT)) {
    const p = Number(trimmed(env.PORT));
    if (Number.isInteger(p) && p > 0 && p < 65536) port = p;
    else warnings.push('PORT is not a valid port; using 8080');
  }

  const demoRequested = env.DASHBOARD_DEMO === '1';
  if (demoRequested && production) warnings.push('DASHBOARD_DEMO is ignored when NODE_ENV is production');
  const demo = demoRequested && !production;
  let demoScenario = null;
  if (demo && trimmed(env.DASHBOARD_FIXTURES)) {
    if (/^[a-z0-9][a-z0-9-]{0,39}$/.test(trimmed(env.DASHBOARD_FIXTURES))) demoScenario = trimmed(env.DASHBOARD_FIXTURES);
    else warnings.push('DASHBOARD_FIXTURES must be a scenario folder name such as launch-day');
  }
  const insecureLocalCookie = env.DASHBOARD_INSECURE_LOCAL_COOKIE === '1' && !production;

  // Database.
  const dbPassword = typeof env.DB_PASSWORD === 'string' ? env.DB_PASSWORD : '';
  const dbHost = trimmed(env.DB_HOST).toLowerCase();
  const projectRef = trimmed(env.SUPABASE_PROJECT_REF);
  let dbConfigured = true;
  if (!dbPassword || !dbHost || !projectRef) dbConfigured = false;
  if (dbHost && !HOSTNAME_RE.test(dbHost)) {
    warnings.push('DB_HOST is not a valid host name');
    dbConfigured = false;
  } else if (dbHost && !POOLER_HOST_RE.test(dbHost)) {
    warnings.push('DB_HOST does not look like a Supabase shared pooler host (aws-N-region.pooler.supabase.com)');
  }
  if (projectRef && !PROJECT_REF_RE.test(projectRef)) {
    warnings.push('SUPABASE_PROJECT_REF must be 20 lowercase letters and digits');
    dbConfigured = false;
  }
  let dbPort = DEFAULTS.dbPort;
  if (trimmed(env.DB_PORT)) {
    const p = Number(trimmed(env.DB_PORT));
    if (Number.isInteger(p) && p > 0 && p < 65536) dbPort = p;
    else warnings.push('DB_PORT is not a valid port; using 5432');
  }
  let dbUser = PROJECT_REF_RE.test(projectRef) ? `dashboard_reader.${projectRef}` : '';
  if (trimmed(env.DB_USER)) {
    if (DB_USER_RE.test(trimmed(env.DB_USER))) dbUser = trimmed(env.DB_USER);
    else warnings.push('DB_USER is not a valid role name; using the default');
  }
  let dbName = DEFAULTS.dbName;
  if (trimmed(env.DB_NAME)) {
    if (/^[A-Za-z0-9_]{1,63}$/.test(trimmed(env.DB_NAME))) dbName = trimmed(env.DB_NAME);
    else warnings.push('DB_NAME is not a valid database name; using postgres');
  }
  let dbCaCert = null;
  let caFingerprint = null;
  const caText = typeof env.DB_CA_CERT === 'string' ? env.DB_CA_CERT.trim() : '';
  if (caText) {
    caFingerprint = caText.startsWith('-----BEGIN CERTIFICATE-----') ? certificateFingerprint(caText) : null;
    if (caFingerprint) {
      dbCaCert = `${caText}\n`;
    } else {
      // Fail closed: the owner asked for verification, so never fall back to
      // an unverified connection because the certificate text is damaged.
      warnings.push('DB_CA_CERT is not a PEM certificate; the database stays off until it is fixed');
      dbConfigured = false;
    }
  }
  const tlsMode = dbCaCert ? 'verify' : 'encrypt_only';
  // Fail closed in production: without the CA anything on the network path
  // could pose as the pooler, so the database stays off until it is given.
  let dbOffReason = dbConfigured ? null : 'not_configured';
  if (dbConfigured && production && !dbCaCert) {
    dbConfigured = false;
    dbOffReason = 'ca_missing';
  }

  // Time zone and launch moment.
  let tz = DEFAULTS.tz;
  const tzRaw = trimmed(env.DASHBOARD_TZ);
  if (tzRaw) {
    if (isValidTimeZone(tzRaw)) tz = tzRaw;
    else notices.push('tz_invalid');
  }
  let launchAtIso = null;
  const launchRaw = trimmed(env.DASHBOARD_LAUNCH_AT);
  if (!launchRaw) {
    notices.push('launch_at_unset');
  } else {
    const ms = LAUNCH_RE.test(launchRaw) ? Date.parse(launchRaw) : NaN;
    if (Number.isFinite(ms) && ms > EARLIEST_LAUNCH_MS && ms <= nowMs) {
      launchAtIso = new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
    } else {
      notices.push('launch_at_invalid');
    }
  }

  // RevenueCat.
  const rcKey = trimmed(env.REVENUECAT_API_KEY);
  const rcProject = trimmed(env.REVENUECAT_PROJECT_ID);
  let revenuecat = null;
  if (rcKey || rcProject) {
    if (!REVENUECAT_KEY_RE.test(rcKey)) warnings.push('REVENUECAT_API_KEY must be a v2 secret key starting with sk_; the RevenueCat panel is off');
    else if (!REVENUECAT_PROJECT_RE.test(rcProject)) warnings.push('REVENUECAT_PROJECT_ID is missing or invalid; the RevenueCat panel is off');
    else {
      let currency = null;
      const cur = trimmed(env.REVENUECAT_CURRENCY).toUpperCase();
      if (cur) {
        if (CURRENCIES.includes(cur)) currency = cur;
        else warnings.push('REVENUECAT_CURRENCY is not supported; using the RevenueCat default');
      }
      revenuecat = { apiKey: rcKey, projectId: rcProject, currency };
    }
  }

  // Sentry (the org, project and base also build the always-present link tile).
  const sentryOrg = SENTRY_ORG_RE.test(trimmed(env.SENTRY_ORG)) ? trimmed(env.SENTRY_ORG) : DEFAULTS.sentryOrg;
  if (trimmed(env.SENTRY_ORG) && sentryOrg !== trimmed(env.SENTRY_ORG)) warnings.push('SENTRY_ORG is invalid; using the default');
  const sentryProjectId = SENTRY_PROJECT_RE.test(trimmed(env.SENTRY_PROJECT_ID)) ? trimmed(env.SENTRY_PROJECT_ID) : DEFAULTS.sentryProjectId;
  if (trimmed(env.SENTRY_PROJECT_ID) && sentryProjectId !== trimmed(env.SENTRY_PROJECT_ID)) warnings.push('SENTRY_PROJECT_ID is invalid; using the default');
  const sentryEnvironment = SENTRY_ENV_RE.test(trimmed(env.SENTRY_ENVIRONMENT)) ? trimmed(env.SENTRY_ENVIRONMENT) : DEFAULTS.sentryEnvironment;
  let sentryApiBase = DEFAULTS.sentryApiBase;
  let sentryBaseValid = true;
  if (trimmed(env.SENTRY_API_BASE)) {
    const base = trimmed(env.SENTRY_API_BASE).replace(/\/+$/, '');
    if (SENTRY_BASE_RE.test(base)) sentryApiBase = base;
    else {
      sentryBaseValid = false;
      warnings.push('SENTRY_API_BASE must look like https://us.sentry.io; the Sentry panel is off');
    }
  }
  const sentryToken = trimmed(env.SENTRY_AUTH_TOKEN);
  let sentry = null;
  if (sentryToken) {
    if (!SENTRY_TOKEN_RE.test(sentryToken)) warnings.push('SENTRY_AUTH_TOKEN has unexpected characters; the Sentry panel is off');
    else if (sentryBaseValid) sentry = { token: sentryToken, org: sentryOrg, projectId: sentryProjectId, apiBase: sentryApiBase, environment: sentryEnvironment };
  }

  if (demo) {
    notices.length = 0;
    notices.push('demo_data');
  } else {
    if (dbOffReason === 'ca_missing') notices.push('db_ca_missing');
    else if (!dbConfigured) notices.push('db_not_configured');
    else if (tlsMode === 'encrypt_only') notices.push('db_tls_unverified');
  }

  const config = {
    production,
    port,
    password,
    sessionSecret,
    demo,
    demoScenario,
    insecureLocalCookie,
    dbConfigured,
    dbOffReason,
    dbHost,
    dbPort,
    dbUser,
    dbName,
    dbPassword,
    dbCaCert,
    caFingerprint,
    tlsMode,
    projectRef: PROJECT_REF_RE.test(projectRef) ? projectRef : null,
    tz,
    launchAtIso,
    revenuecat,
    sentry,
    sentryLink: { org: sentryOrg, projectId: sentryProjectId, environment: sentryEnvironment },
    playConsoleUrl: httpsUrl(env.PLAY_CONSOLE_URL, DEFAULTS.playConsoleUrl, 'PLAY_CONSOLE_URL', warnings),
    admobUrl: httpsUrl(env.ADMOB_URL, DEFAULTS.admobUrl, 'ADMOB_URL', warnings),
  };
  return { config, notices: [...new Set(notices)], errors, warnings };
}

/** Everything safe to print at startup. Never includes a secret value. */
export function describeConfig(config) {
  return {
    port: config.port,
    production: config.production,
    demo: config.demo,
    demoScenario: config.demoScenario ?? null,
    dbConfigured: config.dbConfigured,
    dbOffReason: config.dbOffReason ?? null,
    host: config.dbHost || null,
    dbPort: config.dbPort,
    database: config.dbName,
    user: config.dbUser || null,
    tlsMode: config.tlsMode,
    caFingerprint: config.caFingerprint,
    tz: config.tz,
    launchAt: config.launchAtIso,
    revenuecatPanel: Boolean(config.revenuecat),
    revenuecatProject: config.revenuecat ? config.revenuecat.projectId : null,
    sentryPanel: Boolean(config.sentry),
    sentryProject: config.sentry ? `${config.sentry.org}/${config.sentry.projectId}` : null,
  };
}

/** Secret values the logger scrubs from every line. */
export function secretValues(config) {
  return [config.password, config.sessionSecret, config.dbPassword, config.dbCaCert,
    config.revenuecat?.apiKey, config.sentry?.token].filter((v) => typeof v === 'string' && v.length > 0);
}
