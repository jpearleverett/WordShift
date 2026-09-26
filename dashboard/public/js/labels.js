// Plain-word labels for the raw values the database sends. Pure, no DOM.

export const FUNNEL_STEPS = [
  ['app_open', 'Opened the game'],
  ['cold_open_puzzle', 'Saw the first puzzle'],
  ['first_puzzle_completed', 'Solved the first puzzle'],
  ['home_empty', 'Reached the empty house'],
  ['fox_invited', 'Invited Ember in'],
  ['going_to_pit', 'Headed to the pit'],
  ['pit_intro', 'Heard about the pit'],
  ['pit_offering', 'Offered words at the pit'],
  ['returning_home', 'Went back home'],
  ['unlock_explained', 'Learned about unlocks'],
  ['onboarding_complete', 'Finished the tutorial'],
  ['second_puzzle_completed', 'Solved a second puzzle'],
];
const FUNNEL_MAP = new Map(FUNNEL_STEPS);

const PRODUCTS = new Map([
  ['patron_key', 'Patron key'],
  ['remove_ads', 'Remove ads'],
  ['supporter_monthly', 'Supporter (monthly)'],
  ['starter', "Keeper's Welcome"],
  ['cosmetic_bundle', "Keeper's Collection"],
  ['amber_small', 'Amber pack, small'],
  ['amber_medium', 'Amber pack, medium'],
  ['amber_large', 'Amber pack, large'],
  ['hints_small', 'Hint pack, small'],
  ['hints_large', 'Hint pack, large'],
  ['season_premium', 'Season premium'],
  ['keepers_edition', "Keeper's Edition"],
]);

const PLACEMENTS = new Map([
  ['victory_double', 'Victory double'],
  ['hint_recovery', 'Out of hints'],
  ['quest_bonus', 'Quest bonus'],
  ['speed_rescue', 'Speed rescue'],
  ['daily_amber', 'Daily amber'],
  ['(other)', 'Other'],
  ['(none)', 'Not given'],
]);

const SYNC_OPERATIONS = new Map([
  ['upload', 'Upload'],
  ['restore', 'Restore'],
  ['(other)', 'Other'],
]);

const SYNC_RESULTS = new Map([
  ['saved', 'Saved'],
  ['conflict', 'Conflict'],
  ['unavailable', 'Server unavailable'],
  ['invalid', 'Invalid'],
  ['failed', 'Failed'],
  ['recovery_required', 'Needs recovery'],
  ['(other)', 'Other'],
]);

function text(value) {
  return typeof value === 'string' ? value : '';
}

export function funnelStepLabel(step) {
  const s = text(step);
  return FUNNEL_MAP.get(s) || s || 'Unknown step';
}

export function productLabel(productId) {
  const id = text(productId);
  if (id === '(none)') return 'No product';
  if (id === '(other)') return 'Other';
  const suffix = id.startsWith('com.wordshift.') ? id.slice('com.wordshift.'.length) : id;
  return PRODUCTS.get(suffix) || suffix || 'No product';
}

export function placementLabel(placement) {
  const p = text(placement);
  return PLACEMENTS.get(p) || p || 'Not given';
}

export function syncOperationLabel(operation) {
  const o = text(operation);
  return SYNC_OPERATIONS.get(o) || o || 'Unknown';
}

export function syncResultLabel(result) {
  const r = text(result);
  return SYNC_RESULTS.get(r) || r || 'Unknown';
}

/** Error sources and app versions arrive already sanitised; show them as sent. */
export function rawLabel(value) {
  const v = text(value);
  if (v === '(none)') return 'none';
  if (v === '(other)') return 'Other';
  return v || 'none';
}

/** Section names used in status and error lines. */
export const SECTION_NAMES = {
  live: 'Live numbers',
  cohorts: 'Install history',
  progress: 'Story and store numbers',
  external: 'Outside services',
};

/** Config notices from the server, in plain words. */
export const NOTICE_TEXT = {
  db_not_configured: 'Database settings are missing. Re-run deploy.sh.',
  db_ca_missing: 'The database is off: the Supabase CA certificate is missing, and without it the dashboard cannot tell the real pooler from an impostor that could steal its database password. Re-run deploy.sh and give it the certificate.',
  db_tls_unverified: 'Local run without the Supabase CA certificate: the database link is encrypted but not checked, so anything on the network path could pose as the pooler and read or fake these numbers. The dashboard never sends its password in a weak form, but add the certificate before trusting this.',
  tz_invalid: 'DASHBOARD_TZ is not a valid time zone, so days are shown in UTC.',
  launch_at_unset: 'DASHBOARD_LAUNCH_AT is not set, so test devices count as players.',
  launch_at_invalid: 'DASHBOARD_LAUNCH_AT could not be used, so it is ignored.',
  demo_data: 'Demo data. These are not real numbers.',
  schema_mismatch: 'This page is older than the server. Reload.',
};

/** Period text for a RevenueCat metric: "now" for P0D, "last 28 days" for P28D. */
export function periodLabel(period) {
  const p = text(period);
  if (p === 'P0D') return 'now';
  const m = /^P(\d+)D$/.exec(p);
  if (!m) return '';
  const n = Number(m[1]);
  return n === 1 ? 'last day' : `last ${n} days`;
}
