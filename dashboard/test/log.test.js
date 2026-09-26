import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createLogger } from '../src/log.js';

test('secret-looking field names and registered values are redacted', () => {
  const lines = [];
  const log = createLogger({ write: (l) => lines.push(l), secrets: ['HUNTER2-SECRET', 'x'] });
  log.info('hello HUNTER2-SECRET', {
    password: 'p', sessionSecret: 's', authorization: 'Bearer abc', cookie: '__Host-wsd=v1', apiKey: 'sk_1', dbCaCert: 'PEM',
    nested: { note: 'value HUNTER2-SECRET inside', list: ['HUNTER2-SECRET'] },
    error: Object.assign(new Error('failed with HUNTER2-SECRET'), { code: 'E1' }),
    count: 3,
  });
  const entry = JSON.parse(lines[0]);
  assert.equal(entry.severity, 'INFO');
  assert.equal(entry.message, 'hello [redacted]');
  for (const k of ['password', 'sessionSecret', 'authorization', 'cookie', 'apiKey', 'dbCaCert']) assert.equal(entry[k], '[redacted]', k);
  assert.equal(entry.nested.note, 'value [redacted] inside');
  assert.deepEqual(entry.nested.list, ['[redacted]']);
  assert.equal(entry.error.code, 'E1');
  assert.ok(!lines[0].includes('HUNTER2-SECRET'));
  assert.equal(entry.count, 3);
  log.warn('w');
  log.error('e');
  assert.deepEqual(lines.slice(1).map((l) => JSON.parse(l).severity), ['WARNING', 'ERROR']);
});
