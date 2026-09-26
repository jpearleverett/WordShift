// The scenario fixtures in dashboard/fixtures/ are whole API envelopes used to
// preview the page. Their data must keep exactly the shape of the contract
// fixtures in test/fixtures/ (spec section 6.6), so the page is only ever
// exercised against payloads the server can really send.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { VALIDATORS } from '../../src/contract.js';

const SECTIONS = ['live', 'cohorts', 'progress', 'external'];
const readJson = (url) => JSON.parse(readFileSync(url, 'utf8'));
const spec = Object.fromEntries(SECTIONS.map((s) => [s, readJson(new URL(`../fixtures/${s}.json`, import.meta.url))]));
const SCENARIO_DIR = new URL('../../fixtures/', import.meta.url);
const scenarios = readdirSync(SCENARIO_DIR);

// Keys the contract allows to be null even where the reference fixture has a value.
const NULLABLE = new Set([
  'launchAt', 'testers', 'lastEventReceivedAt', 'lastPlayerEventReceivedAt', 'lastSubmissionAt',
  'medianPuzzlesSolved', 'rate', 'currency', 'fetchedAt', 'lastTriedAt', 'error', 'crashFreeSessionRate24h',
  'sessions24h', 'unresolvedIssues24h', 'url', 'lastUpdatedAt',
]);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function sameShape(ref, actual, path, key) {
  if (actual === null) {
    assert.ok(ref === null || NULLABLE.has(key), `${path} is null but the contract gives it a value`);
    return;
  }
  if (ref === null) {
    // Reference is null (for example error): accept null or a {code, message} object.
    if (key === 'error') assert.equal(typeof actual.message, 'string', `${path}.message`);
    return;
  }
  if (Array.isArray(ref)) {
    assert.ok(Array.isArray(actual), `${path} should be an array`);
    if (ref.length && typeof ref[0] === 'object') actual.forEach((item, i) => sameShape(ref[0], item, `${path}[${i}]`, key));
    else if (ref.length) actual.forEach((item, i) => assert.equal(typeof item, typeof ref[0], `${path}[${i}]`));
    return;
  }
  if (typeof ref === 'object') {
    assert.equal(typeof actual, 'object', `${path} should be an object`);
    assert.deepEqual(Object.keys(actual).sort(), Object.keys(ref).sort(), `${path} keys`);
    for (const k of Object.keys(ref)) sameShape(ref[k], actual[k], `${path}.${k}`, k);
    return;
  }
  assert.equal(typeof actual, typeof ref, `${path} type`);
  if (typeof ref === 'string' && ISO.test(ref)) assert.match(actual, ISO, `${path} timestamp format`);
}

test('there are four scenarios, each with all four sections', () => {
  assert.deepEqual([...scenarios].sort(), ['degraded', 'launch-day', 'no-data', 'week-two']);
  for (const sc of scenarios) {
    for (const s of SECTIONS) readJson(new URL(`${sc}/${s}.json`, SCENARIO_DIR));
  }
});

for (const sc of scenarios) {
  test(`${sc}: envelopes follow section 6.1`, () => {
    for (const s of SECTIONS) {
      const env = readJson(new URL(`${sc}/${s}.json`, SCENARIO_DIR));
      assert.deepEqual(Object.keys(env).sort(), ['data', 'error', 'fetchedAt', 'notices', 'ok', 'section', 'serverNow', 'stale', 'ttlSec'].sort());
      assert.equal(env.section, s);
      assert.equal(env.ok, env.error === null);
      assert.equal(env.ttlSec, s === 'live' ? 20 : 300);
      assert.match(env.serverNow, ISO);
      if (env.data === null) assert.equal(env.fetchedAt, null);
      if (env.stale) assert.ok(env.data && env.error, 'stale means old data plus an error');
      assert.ok(Array.isArray(env.notices));
      if (env.error) {
        assert.deepEqual(Object.keys(env.error).sort(), ['at', 'code', 'message']);
        assert.match(env.error.at, ISO);
      }
    }
  });

  test(`${sc}: data passes the server's contract validators`, () => {
    for (const s of SECTIONS) {
      const env = readJson(new URL(`${sc}/${s}.json`, SCENARIO_DIR));
      if (env.data !== null) assert.deepEqual(VALIDATORS[s](env.data), [], `${sc}/${s}`);
    }
  });

  test(`${sc}: data has the contract shape`, () => {
    for (const s of SECTIONS) {
      const env = readJson(new URL(`${sc}/${s}.json`, SCENARIO_DIR));
      if (env.data === null) continue;
      sameShape(spec[s], env.data, `${sc}/${s}`, s);
      if (s === 'live') assert.equal(env.data.now.perMinute.length, 60);
      if (s === 'cohorts') {
        assert.deepEqual(env.data.funnel.steps.map((x) => x.step), spec.cohorts.funnel.steps.map((x) => x.step));
        for (const c of env.data.retention.cohorts) {
          for (const k of ['d1', 'd7', 'd14']) {
            assert.equal(c[k].rate === null, !c[k].matured, `${c.cohortDay} ${k}`);
          }
        }
      }
      if (s === 'progress') {
        assert.deepEqual(env.data.story.phases.map((p) => p.phase), [1, 2, 3, 4, 5]);
        assert.deepEqual(env.data.story.depth.map((d) => d.atLeast), [1, 3, 5, 8, 12, 20, 30, 50, 90, 120]);
      }
    }
  });
}
