import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { scramVerifier, validPassword } from '../scripts/scram-verifier.mjs';

const SCRIPT = fileURLToPath(new URL('../scripts/scram-verifier.mjs', import.meta.url));
const run = (input) => spawnSync(process.execPath, [SCRIPT], { input, encoding: 'utf8' });

test('RFC 7677 test vector (password "pencil")', () => {
  assert.equal(scramVerifier('pencil', Buffer.from('W22ZaJ0SNY7soEsUEjb6gQ==', 'base64'), 4096),
    'SCRAM-SHA-256$4096:W22ZaJ0SNY7soEsUEjb6gQ==$WG5d8oPm3OtcPnkdi4Uo7BkeZkBFzpcXkuLmtbsT4qY=:wfPLwcE6nTWhTAmQ7tl2KeoiWGPlZqQxSrmfPwDl2dU=');
});

test('CLI prints exactly one verifier line and never the password', () => {
  const pw = 'Abcdefghij0123456789KLMNOPqrst0123456789';
  const out = run(`${pw}\n`);
  assert.equal(out.status, 0);
  assert.equal(out.stderr, '');
  assert.match(out.stdout, /^SCRAM-SHA-256\$4096:[A-Za-z0-9+/]{22}==\$[A-Za-z0-9+/]{43}=:[A-Za-z0-9+/]{43}=\n$/);
  assert.ok(!out.stdout.includes(pw));
  assert.notEqual(run(pw).stdout, out.stdout, 'a fresh salt each run');
});

test('CLI rejects short, empty or non-alphanumeric input', () => {
  for (const bad of ['', 'short', 'has space 0123456789abc', "quote'0123456789abcdef", `${'a'.repeat(257)}`]) {
    const out = run(bad);
    assert.equal(out.status, 1, JSON.stringify(bad));
    assert.equal(out.stdout, '');
  }
  assert.equal(validPassword('a'.repeat(20)), true);
  assert.equal(validPassword('a'.repeat(19)), false);
});
