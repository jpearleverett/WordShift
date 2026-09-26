import assert from 'node:assert/strict';
import net from 'node:net';
import { after, test } from 'node:test';
import tls from 'node:tls';
import { PublicError } from '../src/cache.js';
import { AUTH_DOWNGRADE_CODE, buildPoolConfig, createDb, DB_MESSAGES, GuardedClient, mapDbError, QUERIES } from '../src/db.js';
import { makeTlsFixtures } from './helpers/tls.js';

const cfg = (extra = {}) => ({
  dbHost: 'aws-0-us-east-1.pooler.supabase.com', dbPort: 5432, dbName: 'postgres',
  dbUser: 'dashboard_reader.rsppoarumebdrsbfrqdi', dbPassword: 'pw', dbCaCert: null,
  tz: 'America/New_York', launchAtIso: '2026-09-26T13:00:00Z', ...extra,
});

test('pool options: object config, TLS always on, small pool', () => {
  const plain = buildPoolConfig(cfg());
  assert.equal(plain.connectionString, undefined);
  assert.deepEqual(plain.ssl, { rejectUnauthorized: false });
  assert.equal(plain.max, 3);
  assert.equal(plain.query_timeout, 12000);
  assert.equal(plain.connectionTimeoutMillis, 8000);
  assert.equal(plain.idleTimeoutMillis, 30000);
  assert.equal(plain.application_name, 'wordshift-dashboard');
  assert.equal(plain.user, 'dashboard_reader.rsppoarumebdrsbfrqdi');
  assert.equal(plain.Client, GuardedClient, 'every connection refuses cleartext and MD5 password requests');
  const verify = buildPoolConfig(cfg({ dbCaCert: 'PEM' }));
  const { checkServerIdentity, ...ssl } = verify.ssl;
  assert.deepEqual(ssl, { ca: 'PEM', rejectUnauthorized: true, servername: 'aws-0-us-east-1.pooler.supabase.com' });
  assert.equal(typeof checkServerIdentity, 'function');
});

test('queries are parameterised and schema-qualified', async () => {
  const calls = [];
  class FakePool {
    constructor(options) { this.options = options; }
    on() {}
    async query(text, params) { calls.push({ text, params }); return { rows: [{ data: { schemaVersion: 1 } }] }; }
    async end() {}
  }
  const db = createDb(cfg(), { Pool: FakePool });
  assert.deepEqual(await db.call('live'), { schemaVersion: 1 });
  await db.call('cohorts');
  await db.call('progress');
  assert.deepEqual(calls, [
    { text: 'select public.dashboard_live($1::text, $2::timestamptz) as data', params: ['America/New_York', '2026-09-26T13:00:00Z'] },
    { text: 'select public.dashboard_cohorts($1::text, $2::timestamptz) as data', params: ['America/New_York', '2026-09-26T13:00:00Z'] },
    { text: 'select public.dashboard_progress($1::timestamptz) as data', params: ['2026-09-26T13:00:00Z'] },
  ]);
  for (const q of Object.values(QUERIES)) assert.match(q, /public\.dashboard_/);
  await db.end();
});

test('driver errors become fixed public errors', async () => {
  class FailingPool {
    on() {}
    async query() { const e = new Error('password authentication failed for user "dashboard_reader" with SECRET'); e.code = '28P01'; throw e; }
    async end() {}
  }
  const db = createDb(cfg(), { Pool: FailingPool });
  await assert.rejects(db.call('live'), (e) => e instanceof PublicError && e.code === 'db_auth_failed' && !e.publicMessage.includes('SECRET'));
});

test('a lost connection is retried once; other errors are not', async () => {
  let calls = 0;
  class FlakyPool {
    on() {}
    async query() {
      calls++;
      if (calls === 1) { const e = new Error('Connection terminated unexpectedly'); throw e; }
      return { rows: [{ data: { ok: true } }] };
    }
    async end() {}
  }
  assert.deepEqual(await createDb(cfg(), { Pool: FlakyPool }).call('live'), { ok: true });
  assert.equal(calls, 2);

  let downCalls = 0;
  class DownPool {
    on() {}
    async query() { downCalls++; const e = new Error('connect ECONNRESET'); e.code = 'ECONNRESET'; throw e; }
    async end() {}
  }
  await assert.rejects(createDb(cfg(), { Pool: DownPool }).call('live'), (e) => e.code === 'db_unreachable');
  assert.equal(downCalls, 2, 'one retry, then the error surfaces');

  let authCalls = 0;
  class AuthPool {
    on() {}
    async query() { authCalls++; const e = new Error('password authentication failed'); e.code = '28P01'; throw e; }
    async end() {}
  }
  await assert.rejects(createDb(cfg(), { Pool: AuthPool }).call('live'), (e) => e.code === 'db_auth_failed');
  assert.equal(authCalls, 1, 'a wrong password is never retried');
});

test('error mapping table', () => {
  const err = (code, message = '') => Object.assign(new Error(message), code ? { code } : {});
  const cases = [
    [err(AUTH_DOWNGRADE_CODE, 'the server asked for a cleartext password; refused'), 'db_auth_downgrade'],
    [err('28P01'), 'db_auth_failed'],
    [err('XX000', 'password authentication failed for user'), 'db_auth_failed'],
    [err('28000'), 'db_login_disabled'],
    [err('XX000', 'role "dashboard_reader" is not permitted to log in'), 'db_login_disabled'],
    [err('XX000', 'Tenant or user not found'), 'db_user_unknown'],
    [err('XX000', '(EAUTHQUERY) authentication query failed'), 'db_auth_query'],
    [err('42883'), 'db_missing_function'],
    [err('42501'), 'db_permission_denied'],
    [err('57014'), 'db_timeout'],
    [err(undefined, 'Query read timeout'), 'db_timeout'],
    [err('53300'), 'db_too_many_connections'],
    [err('53400'), 'db_too_many_connections'],
    [err('SELF_SIGNED_CERT_IN_CHAIN'), 'db_tls_failed'],
    [err('UNABLE_TO_GET_ISSUER_CERT_LOCALLY'), 'db_tls_failed'],
    [err('UNABLE_TO_VERIFY_LEAF_SIGNATURE'), 'db_tls_failed'],
    [err('ERR_TLS_CERT_ALTNAME_INVALID'), 'db_tls_failed'],
    [err('CERT_HAS_EXPIRED'), 'db_tls_failed'],
    [err('DEPTH_ZERO_SELF_SIGNED_CERT'), 'db_tls_failed'],
    [err('ENOTFOUND'), 'db_unreachable'],
    [err('ECONNREFUSED'), 'db_unreachable'],
    [err('ETIMEDOUT'), 'db_unreachable'],
    [err('ECONNRESET'), 'db_unreachable'],
    [err('EHOSTUNREACH'), 'db_unreachable'],
    [err(undefined, 'timeout expired'), 'db_unreachable'],
    [err(undefined, 'Connection terminated unexpectedly'), 'db_unreachable'],
    [err(undefined, 'timeout exceeded when trying to connect'), 'db_unreachable'],
    [err('22P02', 'invalid input syntax <script>'), 'db_error'],
    [new Error('anything else'), 'db_error'],
    [null, 'db_error'],
  ];
  for (const [e, code] of cases) {
    const mapped = mapDbError(e);
    assert.equal(mapped.code, code, `${e?.code} ${e?.message}`);
    assert.ok(mapped.message.startsWith(DB_MESSAGES[code]), code);
    assert.ok(!/script|SECRET/.test(mapped.message));
  }
  assert.equal(mapDbError(err('22P02')).message, `${DB_MESSAGES.db_error} (22P02)`);
  assert.equal(mapDbError(err('db; drop <x>')).message, DB_MESSAGES.db_error, 'only a code-shaped value is appended');
  assert.equal(mapDbError(err('ECONNREFUSED')).message, `${DB_MESSAGES.db_unreachable} (ECONNREFUSED)`);
});

// A fake Postgres front door: answers the SSLRequest with 'S', then speaks TLS
// with a certificate for "localhost" signed by a test CA, then hangs up.
const fixtures = makeTlsFixtures();
const servers = [];
after(() => { for (const s of servers) s.close(); });

async function fakePooler() {
  const server = net.createServer((socket) => {
    socket.once('data', (buf) => {
      if (buf.length !== 8 || buf.readInt32BE(4) !== 80877103) return socket.destroy();
      socket.write('S');
      const secure = new tls.TLSSocket(socket, { isServer: true, key: fixtures.key, cert: fixtures.cert });
      secure.on('error', () => socket.destroy());
      secure.once('data', () => secure.destroy());
    });
    socket.on('error', () => {});
  });
  servers.push(server);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return server.address().port;
}

test('verify mode rejects a server certificate from another CA', { skip: !fixtures && 'openssl not available' }, async () => {
  const port = await fakePooler();
  const db = createDb(cfg({ dbHost: 'localhost', dbPort: port, dbCaCert: fixtures.otherCa }));
  await assert.rejects(db.call('live'), (e) => e.code === 'db_tls_failed');
  await db.end();
});

test('verify mode accepts the right CA and host, then fails only because the fake server hangs up', { skip: !fixtures && 'openssl not available' }, async () => {
  const port = await fakePooler();
  const db = createDb(cfg({ dbHost: 'localhost', dbPort: port, dbCaCert: fixtures.ca }));
  await assert.rejects(db.call('live'), (e) => e.code === 'db_unreachable');
  await db.end();
});

test('verify mode checks the host name', { skip: !fixtures && 'openssl not available' }, async () => {
  const port = await fakePooler();
  // 127.0.0.1 is not in the certificate's subjectAltName (DNS:localhost only).
  const db = createDb(cfg({ dbHost: '127.0.0.1', dbPort: port, dbCaCert: fixtures.ca }));
  await assert.rejects(db.call('live'), (e) => e.code === 'db_tls_failed');
  await db.end();
});

test('encrypt-only mode connects to any certificate', { skip: !fixtures && 'openssl not available' }, async () => {
  const port = await fakePooler();
  const db = createDb(cfg({ dbHost: 'localhost', dbPort: port, dbCaCert: null }));
  await assert.rejects(db.call('live'), (e) => e.code === 'db_unreachable');
  await db.end();
});

// A fake pooler that asks for a weak password (AuthenticationCleartextPassword,
// type 3, or AuthenticationMD5Password, type 5) and records any PasswordMessage.
async function weakAuthPooler(authType) {
  const seen = { password: null };
  const server = net.createServer((socket) => {
    socket.once('data', (buf) => {
      if (buf.length !== 8 || buf.readInt32BE(4) !== 80877103) return socket.destroy();
      socket.write('S');
      const secure = new tls.TLSSocket(socket, { isServer: true, key: fixtures.key, cert: fixtures.cert });
      secure.on('error', () => socket.destroy());
      let stage = 0;
      secure.on('data', (d) => {
        if (stage === 0) {
          stage = 1;
          const r = Buffer.alloc(authType === 5 ? 13 : 9);
          r.write('R', 0);
          r.writeInt32BE(authType === 5 ? 12 : 8, 1);
          r.writeInt32BE(authType, 5);
          secure.write(r);
        } else if (d[0] === 0x70) {
          seen.password = d.subarray(5, d.length - 1).toString('utf8');
          secure.destroy();
        }
      });
    });
    socket.on('error', () => {});
  });
  servers.push(server);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { port: server.address().port, seen };
}

for (const [authType, name] of [[3, 'cleartext'], [5, 'MD5']]) {
  test(`a ${name} password request is refused and the password never leaves`, { skip: !fixtures && 'openssl not available' }, async () => {
    const { port, seen } = await weakAuthPooler(authType);
    const db = createDb(cfg({ dbHost: 'localhost', dbPort: port, dbCaCert: null, dbPassword: 'REAL_PASSWORD_SENTINEL' }));
    await assert.rejects(db.call('live'), (e) => e.code === 'db_auth_downgrade' && !e.publicMessage.includes('SENTINEL'));
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(seen.password, null, 'nothing was sent in answer to the weak request');
    await db.end();
  });
}
