// Prints a PostgreSQL SCRAM-SHA-256 verifier for a password read from stdin,
// so the Supabase SQL editor only ever sees a hash, never the password:
//   printf '%s' "$pw" | node scripts/scram-verifier.mjs
// The password must be 20 to 256 characters of A-Z, a-z and 0-9, which makes
// SASLprep the identity. Postgres stores a well-formed verifier as-is, but a
// malformed one would be HASHED AS IF IT WERE A PASSWORD, so the format here
// must be exact (see test/scram.test.js for the RFC 7677 vector).
import { createHash, createHmac, pbkdf2Sync, randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function scramVerifier(password, salt = randomBytes(16), iterations = 4096) {
  const salted = pbkdf2Sync(Buffer.from(password, 'utf8'), salt, iterations, 32, 'sha256');
  const clientKey = createHmac('sha256', salted).update('Client Key').digest();
  const storedKey = createHash('sha256').update(clientKey).digest();
  const serverKey = createHmac('sha256', salted).update('Server Key').digest();
  return `SCRAM-SHA-256$${iterations}:${salt.toString('base64')}$${storedKey.toString('base64')}:${serverKey.toString('base64')}`;
}

export function validPassword(password) {
  return typeof password === 'string' && /^[A-Za-z0-9]{20,256}$/.test(password);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const input = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '');
  if (!validPassword(input)) {
    console.error('The password must be 20 to 256 letters and digits (A-Z, a-z, 0-9).');
    process.exit(1);
  }
  process.stdout.write(`${scramVerifier(input)}\n`);
}
