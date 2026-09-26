// Builds a throwaway CA, a server certificate for "localhost" signed by it
// and an unrelated second CA, with the openssl CLI in a temp directory.
// Returns null when openssl is missing so the TLS tests can skip.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function makeTlsFixtures() {
  const dir = mkdtempSync(join(tmpdir(), 'wsd-tls-'));
  const run = (args) => execFileSync('openssl', args, { cwd: dir, stdio: 'pipe' });
  try {
    run(['version']);
  } catch {
    rmSync(dir, { recursive: true, force: true });
    return null;
  }
  try {
    const ec = ['-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes'];
    run(['req', '-x509', ...ec, '-keyout', 'ca.key', '-out', 'ca.pem', '-days', '2', '-subj', '/CN=Test Root CA',
      '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign']);
    run(['req', '-x509', ...ec, '-keyout', 'other.key', '-out', 'other.pem', '-days', '2', '-subj', '/CN=Other Root CA',
      '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign']);
    run(['req', ...ec, '-keyout', 'server.key', '-out', 'server.csr', '-subj', '/CN=localhost']);
    writeFileSync(join(dir, 'ext.cnf'), 'subjectAltName=DNS:localhost\nbasicConstraints=CA:FALSE\nkeyUsage=digitalSignature\nextendedKeyUsage=serverAuth\n');
    run(['x509', '-req', '-in', 'server.csr', '-CA', 'ca.pem', '-CAkey', 'ca.key', '-CAcreateserial', '-out', 'server.pem', '-days', '2', '-extfile', 'ext.cnf']);
    const read = (f) => readFileSync(join(dir, f), 'utf8');
    return { ca: read('ca.pem'), otherCa: read('other.pem'), key: read('server.key'), cert: read('server.pem') };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
