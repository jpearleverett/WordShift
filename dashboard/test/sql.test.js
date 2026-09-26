// Runs docs/supabase/rehearse_dashboard.mjs on this package's PGlite with the
// server's payload contract, so the SQL and the Node validators cannot drift.
// It applies migrations 1 to 11 and dashboard_reader_v1.sql three times, then
// checks exact numbers, privileges, hostile time zones and privacy.
// DASHBOARD_PERF=1 adds a 300,000-event timing (cohorts under 5 s).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { rehearseDashboard } from '../../docs/supabase/rehearse_dashboard.mjs';
import { VALIDATORS } from '../src/contract.js';

test('dashboard_reader_v1.sql rehearsal on PGlite', { timeout: 300_000 }, async () => {
  const result = await rehearseDashboard({ PGlite, validators: VALIDATORS, perf: process.env.DASHBOARD_PERF === '1' });
  assert.equal(result.contractChecked, true);
  assert.ok(result.checks > 150, `only ${result.checks} checks ran`);
  for (const s of ['live', 'cohorts', 'progress']) assert.deepEqual(VALIDATORS[s](result.outputs[s]), [], s);
  if (result.perfMs) console.log(`perf ms: ${JSON.stringify(result.perfMs)}`);
});
