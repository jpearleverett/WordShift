import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validateCohorts, validateExternal, validateLive, validateProgress, VALIDATORS } from '../src/contract.js';

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const clone = (v) => structuredClone(v);

test('the four fixtures pass', () => {
  for (const s of ['live', 'cohorts', 'progress', 'external']) assert.deepEqual(VALIDATORS[s](fixture(s)), [], s);
});

test('mutated live payloads fail', () => {
  const live = fixture('live');
  const cases = [
    (d) => { delete d.freshness; },
    (d) => { d.schemaVersion = 2; },
    (d) => { d.now.perMinute = d.now.perMinute.slice(1); },
    (d) => { d.now.perMinute[3] = -1; },
    (d) => { d.todayCounts.newInstalls = '142'; },
    (d) => { d.todayCounts.appErrors = 1.5; },
    (d) => { d.generatedAt = '2026-09-26 18:30:00'; },
    (d) => { d.health.appErrorsBySource[0].source = '<img src=x>'; },
    (d) => { d.versions24h[0].appVersion = '1.4.6<b>'; },
    (d) => { d.ads24h[0].placement = 'somewhere'; },
    (d) => { d.dailyChallenge.boardVersionsToday[0].boardVersion = 'Daily V2'; },
    (d) => { d.tz = 'x'.repeat(201); },
    (d) => { d.testers = { devices: 1 }; },
    (d) => { d.health.cloudSync[0].result = 'exploded'; },
  ];
  for (const [i, mutate] of cases.entries()) {
    const d = clone(live);
    mutate(d);
    assert.ok(validateLive(d).length > 0, `case ${i}`);
  }
  assert.ok(validateLive(null).length > 0);
  const nullTesters = clone(live);
  nullTesters.testers = null;
  assert.deepEqual(validateLive(nullTesters), []);
});

test('mutated cohorts, progress and external payloads fail', () => {
  const cohorts = fixture('cohorts');
  const cohortCases = [
    (d) => { d.retention.cohorts[0].d1.rate = 1.5; },
    (d) => { d.retention.cohorts[0].d1.rate = 0.5; },
    (d) => { d.funnel.steps.pop(); },
    (d) => { [d.funnel.steps[0], d.funnel.steps[1]] = [d.funnel.steps[1], d.funnel.steps[0]]; },
    (d) => { d.installsByDay.push(clone(d.installsByDay[0])); },
    (d) => { delete d.retention.pooled.d7; },
  ];
  for (const [i, mutate] of cohortCases.entries()) {
    const d = clone(cohorts);
    mutate(d);
    assert.ok(validateCohorts(d).length > 0, `cohorts case ${i}`);
  }
  const progress = fixture('progress');
  const progressCases = [
    (d) => { d.story.phases.pop(); },
    (d) => { d.story.phases[0].phase = 0; },
    (d) => { d.story.depth[2].atLeast = 4; },
    (d) => { d.store.products[0].productId = 'com.evil.thing'; },
    (d) => { d.store.products[0].kind = 'Kind With Spaces'; },
  ];
  for (const [i, mutate] of progressCases.entries()) {
    const d = clone(progress);
    mutate(d);
    assert.ok(validateProgress(d).length > 0, `progress case ${i}`);
  }
  const external = fixture('external');
  const externalCases = [
    (d) => { d.revenuecat.status = 'great'; },
    (d) => { d.sentry.crashFreeSessionRate24h = 1.2; },
    (d) => { d.sentry.newestIssues[0].url = 'javascript:alert(1)'; },
    (d) => { d.links[0].url = 'http://play.google.com/'; },
    (d) => { d.revenuecat.metrics[0].value = 'lots'; },
  ];
  for (const [i, mutate] of externalCases.entries()) {
    const d = clone(external);
    mutate(d);
    assert.ok(validateExternal(d).length > 0, `external case ${i}`);
  }
});

test('problems never quote payload values', () => {
  const d = fixture('live');
  d.health.appErrorsBySource[0].source = 'SECRET_VALUE_<b>';
  const problems = validateLive(d);
  assert.ok(problems.length > 0);
  assert.ok(problems.every((p) => !p.includes('SECRET_VALUE')));
});
