import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FUNNEL_STEPS, NOTICE_TEXT, funnelStepLabel, periodLabel, placementLabel, productLabel, rawLabel,
  syncOperationLabel, syncResultLabel,
} from '../../public/js/labels.js';

const cohorts = JSON.parse(readFileSync(new URL('../fixtures/cohorts.json', import.meta.url), 'utf8'));

test('every funnel step in the contract has a plain label, in flow order', () => {
  const steps = cohorts.funnel.steps.map((s) => s.step);
  assert.deepEqual(FUNNEL_STEPS.map(([id]) => id), steps);
  for (const step of steps) assert.notEqual(funnelStepLabel(step), step);
  assert.equal(funnelStepLabel('onboarding_complete'), 'Finished the tutorial');
  assert.equal(funnelStepLabel('something_new'), 'something_new');
  assert.equal(funnelStepLabel(undefined), 'Unknown step');
});

test('product labels strip the package prefix and fall back to the id', () => {
  assert.equal(productLabel('com.wordshift.starter'), "Keeper's Welcome");
  assert.equal(productLabel('com.wordshift.remove_ads'), 'Remove ads');
  assert.equal(productLabel('com.wordshift.supporter_monthly'), 'Supporter (monthly)');
  assert.equal(productLabel('com.wordshift.keepers_edition'), "Keeper's Edition");
  assert.equal(productLabel('com.wordshift.brand_new_thing'), 'brand_new_thing');
  assert.equal(productLabel('(none)'), 'No product');
  assert.equal(productLabel('(other)'), 'Other');
});

test('ad placements, cloud sync values and raw labels', () => {
  assert.equal(placementLabel('hint_recovery'), 'Out of hints');
  assert.equal(placementLabel('victory_double'), 'Victory double');
  assert.equal(placementLabel('(other)'), 'Other');
  assert.equal(placementLabel('new_place'), 'new_place');
  assert.equal(syncOperationLabel('upload'), 'Upload');
  assert.equal(syncResultLabel('recovery_required'), 'Needs recovery');
  assert.equal(syncResultLabel('unavailable'), 'Server unavailable');
  assert.equal(rawLabel('(other)'), 'Other');
  assert.equal(rawLabel('(none)'), 'none');
  assert.equal(rawLabel('home_load'), 'home_load');
});

test('RevenueCat periods read as plain words', () => {
  assert.equal(periodLabel('P0D'), 'now');
  assert.equal(periodLabel('P28D'), 'last 28 days');
  assert.equal(periodLabel('P1D'), 'last day');
  assert.equal(periodLabel(''), '');
  assert.equal(periodLabel('P1M'), '');
});

test('every server notice code has text', () => {
  for (const code of ['db_not_configured', 'db_tls_unverified', 'tz_invalid', 'launch_at_unset', 'launch_at_invalid', 'demo_data']) {
    assert.ok(NOTICE_TEXT[code], code);
  }
});
