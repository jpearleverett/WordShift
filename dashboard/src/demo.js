// Demo mode (never in production): serves JSON fixtures instead of the
// database and the external APIs. Every UTC timestamp is shifted so the
// fixture's own "now" becomes the real now, which keeps the ages on the page
// believable. Calendar days (YYYY-MM-DD) are left alone.
//
// Two kinds of fixture:
//   * data payloads, test/fixtures/<section>.json (spec section 6.6), wrapped
//     in a normal envelope; the default;
//   * whole envelopes, fixtures/<scenario>/<section>.json, served as they are
//     so failure states (stale, errors, not configured) can be previewed:
//     DASHBOARD_FIXTURES=<scenario>, or npm run dev:fixtures -- <scenario>.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
export const SECTIONS = ['live', 'cohorts', 'progress', 'external'];
export const FIXTURE_DIRS = [
  fileURLToPath(new URL('../test/fixtures/', import.meta.url)),
  fileURLToPath(new URL('../fixtures/', import.meta.url)),
];
export const SCENARIO_ROOT = fileURLToPath(new URL('../fixtures/', import.meta.url));
export const SCENARIO_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;

const iso = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

export function shiftTimestamps(value, deltaMs) {
  if (typeof value === 'string') return ISO_RE.test(value) ? iso(Date.parse(value) + deltaMs) : value;
  if (Array.isArray(value)) return value.map((v) => shiftTimestamps(v, deltaMs));
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = shiftTimestamps(v, deltaMs);
    return out;
  }
  return value;
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function readFixture(section, dirs) {
  for (const dir of dirs) {
    const data = await readJson(`${dir}${section}.json`);
    if (data !== null) return data;
  }
  return null;
}

export async function loadDemoFixtures(dirs = FIXTURE_DIRS) {
  const out = {};
  for (const s of SECTIONS) out[s] = await readFixture(s, dirs);
  return out;
}

const deltaFrom = (anchor, nowMs) => {
  const base = typeof anchor === 'string' ? Date.parse(anchor) : NaN;
  return Number.isFinite(base) ? Math.round((nowMs - base) / 1000) * 1000 : 0;
};

export function demoData(fixtures, section, nowMs) {
  const data = fixtures[section];
  return data === null || data === undefined ? null : shiftTimestamps(data, deltaFrom(fixtures.live?.generatedAt, nowMs));
}

/** A scenario's envelope for one section, shifted to now, or null when missing. */
export async function scenarioEnvelope(scenario, section, nowMs, root = SCENARIO_ROOT) {
  if (!SCENARIO_RE.test(scenario) || !SECTIONS.includes(section)) return null;
  const envelope = await readJson(`${root}${scenario}/${section}.json`);
  if (envelope === null || typeof envelope !== 'object') return null;
  const live = await readJson(`${root}${scenario}/live.json`);
  const shifted = shiftTimestamps(envelope, deltaFrom(live?.serverNow ?? envelope.serverNow, nowMs));
  const notices = Array.isArray(shifted.notices) ? shifted.notices : [];
  return { ...shifted, section, serverNow: iso(nowMs), notices: notices.includes('demo_data') ? notices : [...notices, 'demo_data'] };
}
