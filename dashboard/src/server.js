// Entry point: reads the environment, wires the pieces and serves on $PORT.
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createAuth, createLoginLimiter } from './auth.js';
import { describeConfig, loadConfig, secretValues } from './config.js';
import { createDb } from './db.js';
import { createLogger } from './log.js';
import { createSections } from './sections.js';
import { loadStatic } from './static.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));

const { config, notices, errors, warnings } = loadConfig(process.env);
const log = createLogger({ secrets: secretValues(config) });
if (errors.length) {
  for (const problem of errors) log.error('config_error', { problem });
  process.exit(1);
}
for (const problem of warnings) log.warn('config_warning', { problem });
log.info('startup', { ...describeConfig(config), notices });

const db = config.dbConfigured && !config.demo ? createDb(config, { log }) : null;
const sections = createSections({ config, notices, db, log });
const staticFiles = await loadStatic(PUBLIC_DIR);
if (!staticFiles.index) log.warn('config_warning', { problem: 'public/index.html is missing' });
const app = createApp({
  config,
  auth: createAuth({ password: config.password, sessionSecret: config.sessionSecret }),
  limiter: createLoginLimiter(),
  sections,
  staticFiles,
  log,
});

const server = http.createServer(app);
server.headersTimeout = 15_000;
server.requestTimeout = 30_000;
server.keepAliveTimeout = 5_000;
server.listen(config.port, '0.0.0.0', () => log.info('listening', { port: config.port }));

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  log.info('shutdown', { signal });
  setTimeout(() => process.exit(0), 9_000).unref();
  // Stop accepting, let in-flight requests finish, then release the pool.
  await new Promise((resolve) => {
    server.close(() => resolve());
    server.closeIdleConnections();
  });
  try {
    if (db) await db.end();
  } catch (err) {
    log.warn('db_end_failed', { code: typeof err?.code === 'string' ? err.code : 'unknown' });
  }
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (err) => log.error('unhandled_rejection', { error: err }));
