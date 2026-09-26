// The three status chips at the top of the page. Pure: envelopes in, verdicts out.
// Each verdict: { id, level: 'good'|'warn'|'bad'|'neutral', title, detail }, and for
// the problems chip also { more: 'and 2 more' or '', issues: every problem }.

import { NBSP, fmtAge, fmtInt, fmtPct, fmtTime, num, parseIso, plural, ratio } from './format.js';
import { SECTION_NAMES, rawLabel } from './labels.js';

const H24 = `24${NBSP}h`;
const RANK = { neutral: 0, good: 1, warn: 2, bad: 3 };

// Health thresholds, shared with the Health tiles (render.js) so the chip and
// the tiles never disagree. A problem is flagged by its SHARE of devices, with
// a floor of devices, never by a bare count: at real volumes there is always
// an error somewhere, and a warning that is always on stops being read.
export const THRESHOLDS = Object.freeze({
  appErrors: { minDevices: 3, warnShare: 0.01, badShare: 0.05 },
  saveFailures: { minDevices: 3, warnShare: 0.05, badShare: 0.10 },
  saveConflicts: { minDevices: 3, warnShare: 0.02 },
});

function levelFor(devices, share, t) {
  if (devices < t.minDevices || share === null) return null;
  if (t.badShare !== undefined && share >= t.badShare) return 'bad';
  if (share >= t.warnShare) return 'warn';
  return null;
}

/** Level for app errors on `devices` of `active` devices, by the shared thresholds. */
export function appErrorLevel(devices, active) {
  const d = num(devices) ?? 0;
  return levelFor(d, ratio(d, active), THRESHOLDS.appErrors);
}

/**
 * Levels for the live health block. Every count arrives as devices AND events:
 * the app logs one cloud_sync_result per upload attempt, so one offline player
 * can log dozens of failures.
 */
export function healthVerdicts(health) {
  const h = health && typeof health === 'object' ? health : {};
  const active = num(h.activeInstalls24h) ?? 0;
  const errorDevices = num(h.installsWithAppError24h) ?? 0;
  const errorShare = ratio(errorDevices, active);
  const syncDevices = num(h.syncInstalls24h) ?? 0;
  const failDevices = num(h.saveFailureInstalls24h) ?? 0;
  const failShare = ratio(failDevices, syncDevices);
  const conflictDevices = num(h.saveConflictInstalls24h) ?? 0;
  const conflictShare = ratio(conflictDevices, syncDevices);
  const generation = num(h.puzzleGenerationFailed24h) ?? 0;
  return {
    appErrors: {
      level: levelFor(errorDevices, errorShare, THRESHOLDS.appErrors),
      events: num(h.appErrors24h) ?? 0, devices: errorDevices, active, share: errorShare,
    },
    saveFailures: {
      level: levelFor(failDevices, failShare, THRESHOLDS.saveFailures),
      events: num(h.saveFailures24h) ?? 0, devices: failDevices, syncDevices, share: failShare,
    },
    saveConflicts: {
      level: levelFor(conflictDevices, conflictShare, THRESHOLDS.saveConflicts),
      events: num(h.saveConflicts24h) ?? 0, devices: conflictDevices, syncDevices, share: conflictShare,
    },
    // Never sent by build 1.4.6, so any count at all is news.
    generation: { level: generation > 0 ? 'warn' : null, events: generation },
  };
}

function atLeast(level, floor) {
  return RANK[level] >= RANK[floor] ? level : floor;
}

function tzOf(input) {
  return input?.live?.data?.tz || input?.cohorts?.data?.tz || 'UTC';
}

function dataStatus(input, nowMs) {
  const live = input?.live;
  const tz = tzOf(input);
  if (!live || !live.data) {
    let detail = live?.error?.message || 'Waiting for the first answer';
    if (!live && input?.offline) detail = 'This page cannot reach the server, retrying';
    return { id: 'data', level: 'bad', title: 'No data from the server', detail };
  }
  const f = live.data.freshness || {};
  const any = parseIso(f.lastEventReceivedAt ?? null);
  // Colour from PLAYER events: the owner's own test phone must never keep this
  // green while no player has sent anything.
  const player = 'lastPlayerEventReceivedAt' in f ? parseIso(f.lastPlayerEventReceivedAt) : any;
  const testersKnown = Boolean(live.data.testers);
  let out;
  if (any === null) {
    out = { id: 'data', level: 'warn', title: 'No events yet', detail: 'Nothing has reached the database yet' };
  } else if (player === null) {
    const age = nowMs - any;
    out = {
      id: 'data', level: age <= 300_000 ? 'warn' : 'bad', title: 'No player events',
      detail: `None in 24${NBSP}h. Your test phones last sent one ${fmtAge(age)} ago`,
    };
  } else {
    const age = nowMs - player;
    let detail = `Last player event ${fmtAge(age)} ago`;
    if (testersKnown && any - player > 60_000) detail += `. A test phone sent one ${fmtAge(nowMs - any)} ago`;
    if (age <= 300_000) out = { id: 'data', level: 'good', title: 'Data arriving', detail };
    else if (age <= 3_600_000) out = { id: 'data', level: 'warn', title: 'Quiet', detail };
    else out = { id: 'data', level: 'bad', title: 'No player events', detail };
  }
  if (live.stale) {
    out.level = atLeast(out.level, 'warn');
    out.detail = `Showing data from ${fmtTime(live.fetchedAt, tz)}, refresh failed`;
  } else if (input?.offline) {
    out.level = atLeast(out.level, 'warn');
    out.detail = `${out.detail}. This page cannot reach the server right now`;
  }
  return out;
}

function playersStatus(input) {
  const data = input?.live?.data;
  if (!data) return { id: 'players', level: 'neutral', title: 'Waiting for data', detail: '' };
  const today = data.todayCounts || {};
  const now = data.now || {};
  // New installs only, the same number as the Today tile and the funnel; other
  // new devices (a restore onto a new phone) are named on their own.
  const n = num(today.newInstalls) ?? 0;
  const other = num(today.otherNewInstalls) ?? 0;
  const extras = other > 0 ? [`+${fmtInt(other)} other new ${other === 1 ? 'device' : 'devices'}`] : [];
  if (n > 0) {
    return {
      id: 'players', level: 'good', title: `${plural(n, 'new install')} today`,
      detail: [...extras, `${fmtInt(num(now.active5m) ?? 0)} playing now`].join(', '),
    };
  }
  const hour = num(now.active60m) ?? 0;
  if (hour > 0 || other > 0) {
    return {
      id: 'players', level: 'neutral', title: 'No new installs yet today',
      detail: [...extras, `${fmtInt(hour)} active in the last hour`].join(', '),
    };
  }
  return { id: 'players', level: 'neutral', title: 'Nobody playing right now', detail: '' };
}

function sentryUsable(sentry) {
  return sentry && (sentry.status === 'ok' || sentry.status === 'partial');
}

function topSource(health) {
  const top = Array.isArray(health?.appErrorsBySource) ? health.appErrorsBySource[0] : null;
  return top ? `Top source: ${rawLabel(top.source)}` : '';
}

/** Every problem the page can see, worst first. */
export function collectIssues(input) {
  const issues = [];
  const add = (level, title, detail = '') => issues.push({ level, title, detail });

  for (const key of ['live', 'cohorts', 'progress']) {
    const env = input?.[key];
    if (env && env.data === null && env.error) {
      add('bad', `${SECTION_NAMES[key]} unavailable`, env.error.message || '');
    }
  }

  const health = input?.live?.data?.health;
  if (health) {
    const v = healthVerdicts(health);
    if (v.appErrors.level) {
      add(v.appErrors.level, `${fmtPct(v.appErrors.share)} of active devices hit an app error`,
        [`${fmtInt(v.appErrors.devices)} of ${fmtInt(v.appErrors.active)} in ${H24}`, topSource(health)].filter(Boolean).join('. '));
    }
    if (v.saveFailures.level) {
      add(v.saveFailures.level, v.saveFailures.level === 'bad' ? 'Cloud saves are failing' : `Cloud saves failing on ${fmtPct(v.saveFailures.share)} of devices`,
        `${fmtInt(v.saveFailures.devices)} of ${plural(v.saveFailures.syncDevices, 'syncing device')} could not save in ${H24}`);
    }
    if (v.saveConflicts.level) {
      add('warn', `${plural(v.saveConflicts.devices, 'device')} with a save conflict`,
        'Another phone has newer progress; waiting for the player to choose');
    }
    if (v.generation.level) add('warn', `${plural(v.generation.events, 'puzzle generation failure')} in ${H24}`);
  }

  const sentry = input?.external?.data?.sentry;
  if (sentryUsable(sentry)) {
    const rate = num(sentry.crashFreeSessionRate24h);
    const sessions = num(sentry.sessions24h) ?? 0;
    if (rate !== null && sessions >= 50) {
      if (rate < 0.98) add('bad', `Crash-free sessions ${fmtPct(rate, 2)}`, `Sentry, ${fmtInt(sessions)} sessions in ${H24}`);
      else if (rate < 0.995) add('warn', `Crash-free sessions ${fmtPct(rate, 2)}`, `Sentry, ${fmtInt(sessions)} sessions in ${H24}`);
    }
  }
  if (sentry && sentry.status === 'unavailable') add('warn', 'Sentry panel unavailable', sentry.error?.message || '');
  const rc = input?.external?.data?.revenuecat;
  if (rc && rc.status === 'unavailable') add('warn', 'RevenueCat panel unavailable', rc.error?.message || '');

  for (const key of ['live', 'cohorts', 'progress', 'external']) {
    const env = input?.[key];
    if (env && env.stale && env.data) {
      add('warn', `${SECTION_NAMES[key]} not refreshing`, env.error?.message ? `Refresh failed: ${env.error.message}` : 'Refresh failed');
    }
  }

  // Stable sort: bad before warn, insertion order within a level.
  return issues
    .map((issue, i) => ({ issue, i }))
    .sort((a, b) => (RANK[b.issue.level] - RANK[a.issue.level]) || (a.i - b.i))
    .map((x) => x.issue);
}

/** Counts that exist but sit below every warning level, for the calm chip. */
function minorCounts(input) {
  const parts = [];
  const health = input?.live?.data?.health;
  if (health) {
    const v = healthVerdicts(health);
    if (v.appErrors.events > 0) parts.push(`${plural(v.appErrors.events, 'app error')} on ${plural(v.appErrors.devices, 'device')}`);
    if (v.saveFailures.devices > 0) parts.push(`${plural(v.saveFailures.devices, 'device')} with a failed save`);
    if (v.saveConflicts.devices > 0) parts.push(`${plural(v.saveConflicts.devices, 'device')} with a save conflict`);
  }
  const sentry = input?.external?.data?.sentry;
  if (sentryUsable(sentry)) {
    const open = num(sentry.unresolvedIssues24h) ?? 0;
    if (open > 0) parts.push(`${fmtInt(open)}${sentry.unresolvedIssuesIsLowerBound ? '+' : ''} open Sentry ${open === 1 ? 'issue' : 'issues'}`);
  }
  return parts;
}

function problemsStatus(input) {
  const issues = collectIssues(input);
  if (issues.length === 0) {
    const live = input?.live;
    if (!live || !live.data) {
      return { id: 'problems', level: 'neutral', title: 'Checking for problems', detail: '', issues };
    }
    const minor = minorCounts(input);
    const minorText = minor.length ? `Below warning levels: ${minor.join(', ')}` : '';
    const sentry = input?.external?.data?.sentry;
    if (!sentryUsable(sentry)) {
      // Native crashes and unhandled promise rejections reach Sentry only, never
      // app_error, so without Sentry this page cannot see crashes at all.
      const why = !input?.external?.data ? 'Crash numbers not loaded yet' : 'Crashes not checked: Sentry is not connected';
      return {
        id: 'problems', level: 'neutral', title: 'No problems flagged',
        detail: [why, minorText].filter(Boolean).join('. '), issues,
      };
    }
    return {
      id: 'problems', level: 'good', title: 'Nothing broken',
      detail: minorText || `No app errors or failed saves in ${H24}`, issues,
    };
  }
  const [worst] = issues;
  const more = issues.length - 1;
  return {
    id: 'problems', level: worst.level, title: worst.title, detail: worst.detail || '',
    more: more > 0 ? `and ${more} more` : '', issues,
  };
}

/**
 * The three chips: is data arriving, are people coming, is anything broken.
 * `input` holds the four envelopes (live, cohorts, progress, external), each
 * possibly missing, plus an optional `offline` flag for a failed live fetch.
 */
export function computeStatus(input, nowMs) {
  return [dataStatus(input, nowMs), playersStatus(input), problemsStatus(input)];
}
