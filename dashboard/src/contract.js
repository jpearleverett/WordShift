// Shape checks for the four API payloads (dashboard spec v1, section 6).
// Each validator returns a list of problems; an empty list means the payload
// is usable. Problems name a path and what was expected, never a value, so a
// problem list is safe to log.

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_STRING = 200;

export const LABEL_RULES = {
  appVersion: (v) => v === '(none)' || v === '(other)' || /^[0-9]{1,4}(\.[0-9]{1,4}){0,3}$/.test(v),
  errorSource: (v) => v === '(none)' || v === '(other)' || /^[a-z][a-z0-9_]{0,47}$/.test(v),
  syncOperation: (v) => ['upload', 'restore', '(other)'].includes(v),
  syncResult: (v) => ['saved', 'conflict', 'unavailable', 'invalid', 'failed', 'recovery_required', '(other)'].includes(v),
  adFormat: (v) => ['rewarded', 'interstitial', '(other)'].includes(v),
  adPlacement: (v) => ['victory_double', 'hint_recovery', 'quest_bonus', 'speed_rescue', 'daily_amber', '(none)', '(other)'].includes(v),
  adResult: (v) => ['completed', 'dismissed', 'not_ready', 'no_provider', 'error', 'daily_cap', 'unavailable', 'shown', 'suppressed', '(other)'].includes(v),
  boardVersion: (v) => v === '(other)' || /^[a-z0-9_]{1,64}$/.test(v),
  productId: (v) => v === '(none)' || v === '(other)' || /^com\.wordshift\.[a-z0-9_]{1,40}$/.test(v),
  kind: (v) => v === '(none)' || v === '(other)' || /^[a-z_]{1,24}$/.test(v),
};

export const FUNNEL_STEPS = [
  'app_open', 'cold_open_puzzle', 'first_puzzle_completed', 'home_empty', 'fox_invited', 'going_to_pit',
  'pit_intro', 'pit_offering', 'returning_home', 'unlock_explained', 'onboarding_complete', 'second_puzzle_completed',
];
export const DEPTH_LADDER = [1, 3, 5, 8, 12, 20, 30, 50, 90, 120];

const TODAY_COUNT_KEYS = [
  'newInstalls', 'otherNewInstalls', 'newInstallsFinishedTutorial', 'activeInstalls', 'events', 'puzzlesStarted', 'puzzlesCompleted',
  'installsCompletingPuzzle', 'dailiesCompleted', 'onboardingCompleted', 'storeOpens', 'purchases', 'purchasers',
  'dailyAmberClaims', 'appErrors', 'installsWithAppError',
];
const HEALTH_COUNT_KEYS = [
  'databaseBytes', 'activeInstalls24h', 'appErrors24h', 'installsWithAppError24h', 'saveFailures24h',
  'saveConflicts24h', 'syncInstalls24h', 'saveFailureInstalls24h', 'saveConflictInstalls24h', 'puzzleGenerationFailed24h',
];
const DAY_ROW_KEYS = [
  'newInstalls', 'otherNewInstalls', 'activeInstalls', 'puzzlesCompleted', 'dailiesCompleted', 'purchases', 'appErrors',
];

function makeChecker() {
  const problems = [];
  const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const c = {
    problems,
    fail: (path, what) => { problems.push(`${path}: expected ${what}`); return false; },
    obj(path, v) { return isObj(v) || c.fail(path, 'an object'); },
    arr(path, v) { return Array.isArray(v) || c.fail(path, 'an array'); },
    int(path, v) { return (Number.isSafeInteger(v) && v >= 0) || c.fail(path, 'a non-negative integer'); },
    num(path, v) { return (typeof v === 'number' && Number.isFinite(v) && v >= 0) || c.fail(path, 'a non-negative number'); },
    bool(path, v) { return typeof v === 'boolean' || c.fail(path, 'a boolean'); },
    str(path, v) { return typeof v === 'string' || c.fail(path, 'a string'); },
    iso(path, v) { return (typeof v === 'string' && ISO_RE.test(v) && Number.isFinite(Date.parse(v))) || c.fail(path, 'a UTC timestamp'); },
    isoOrNull(path, v) { return v === null || c.iso(path, v); },
    day(path, v) { return (typeof v === 'string' && DAY_RE.test(v)) || c.fail(path, 'a YYYY-MM-DD day'); },
    rate(path, v) { return v === null || (typeof v === 'number' && v >= 0 && v <= 1) || c.fail(path, 'a rate from 0 to 1 or null'); },
    label(path, v, rule) { return (typeof v === 'string' && LABEL_RULES[rule](v)) || c.fail(path, `a ${rule} label`); },
    eq(path, v, expected) { return v === expected || c.fail(path, `${JSON.stringify(expected)}`); },
  };
  return c;
}

function checkStringLengths(c, value, path = 'data') {
  if (typeof value === 'string') {
    if (value.length > MAX_STRING) c.fail(path, `a string of at most ${MAX_STRING} characters`);
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => checkStringLengths(c, v, `${path}[${i}]`));
  } else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) checkStringLengths(c, v, `${path}.${k}`);
  }
}

function checkHeader(c, d, { tz = true } = {}) {
  c.eq('schemaVersion', d.schemaVersion, 1);
  c.iso('generatedAt', d.generatedAt);
  if (tz) {
    if (c.str('tz', d.tz) && (d.tz.length < 1 || d.tz.length > 64)) c.fail('tz', 'a time zone name');
    c.bool('tzFallback', d.tzFallback);
  }
  c.isoOrNull('launchAt', d.launchAt);
  c.bool('launchAtIgnored', d.launchAtIgnored);
}

export function validateLive(d) {
  const c = makeChecker();
  if (!c.obj('data', d)) return c.problems;
  checkHeader(c, d);
  c.day('today', d.today);
  c.iso('todayStart', d.todayStart);
  if (c.obj('freshness', d.freshness)) {
    c.isoOrNull('freshness.lastEventReceivedAt', d.freshness.lastEventReceivedAt);
    c.isoOrNull('freshness.lastPlayerEventReceivedAt', d.freshness.lastPlayerEventReceivedAt);
  }
  if (d.testers !== null && c.obj('testers', d.testers)) {
    c.int('testers.devices', d.testers.devices);
    c.int('testers.activeToday', d.testers.activeToday);
    c.int('testers.recentBeforeLaunch', d.testers.recentBeforeLaunch);
  }
  if (c.obj('now', d.now)) {
    c.int('now.active5m', d.now.active5m);
    c.int('now.active60m', d.now.active60m);
    c.int('now.events60m', d.now.events60m);
    c.iso('now.perMinuteStart', d.now.perMinuteStart);
    if (c.arr('now.perMinute', d.now.perMinute)) {
      if (d.now.perMinute.length !== 60) c.fail('now.perMinute', '60 entries');
      d.now.perMinute.forEach((v, i) => c.int(`now.perMinute[${i}]`, v));
    }
  }
  if (c.obj('todayCounts', d.todayCounts)) {
    for (const k of TODAY_COUNT_KEYS) c.int(`todayCounts.${k}`, d.todayCounts[k]);
    c.num('todayCounts.dailyAmberGranted', d.todayCounts.dailyAmberGranted);
  }
  const h = d.health;
  if (c.obj('health', h)) {
    for (const k of HEALTH_COUNT_KEYS) c.int(`health.${k}`, h[k]);
    if (c.arr('health.appErrorsBySource', h.appErrorsBySource)) {
      if (h.appErrorsBySource.length > 13) c.fail('health.appErrorsBySource', 'at most 13 rows');
      h.appErrorsBySource.forEach((r, i) => {
        const p = `health.appErrorsBySource[${i}]`;
        if (!c.obj(p, r)) return;
        c.label(`${p}.source`, r.source, 'errorSource');
        c.int(`${p}.events`, r.events);
        c.int(`${p}.installs`, r.installs);
      });
    }
    if (c.arr('health.cloudSync', h.cloudSync)) {
      h.cloudSync.forEach((r, i) => {
        const p = `health.cloudSync[${i}]`;
        if (!c.obj(p, r)) return;
        c.label(`${p}.operation`, r.operation, 'syncOperation');
        c.label(`${p}.result`, r.result, 'syncResult');
        c.int(`${p}.events`, r.events);
        c.int(`${p}.installs`, r.installs);
      });
    }
  }
  if (c.arr('ads24h', d.ads24h)) {
    d.ads24h.forEach((r, i) => {
      const p = `ads24h[${i}]`;
      if (!c.obj(p, r)) return;
      c.label(`${p}.format`, r.format, 'adFormat');
      c.label(`${p}.placement`, r.placement, 'adPlacement');
      c.label(`${p}.result`, r.result, 'adResult');
      c.int(`${p}.events`, r.events);
    });
  }
  if (c.arr('versions24h', d.versions24h)) {
    if (d.versions24h.length > 8) c.fail('versions24h', 'at most 8 rows');
    d.versions24h.forEach((r, i) => {
      const p = `versions24h[${i}]`;
      if (!c.obj(p, r)) return;
      c.label(`${p}.appVersion`, r.appVersion, 'appVersion');
      c.int(`${p}.installs`, r.installs);
      c.int(`${p}.events`, r.events);
      c.int(`${p}.appErrors`, r.appErrors);
    });
  }
  const dc = d.dailyChallenge;
  if (c.obj('dailyChallenge', dc)) {
    c.day('dailyChallenge.date', dc.date);
    for (const k of ['entrantsToday', 'testerEntrantsToday', 'entrantsYesterday', 'submissions24h']) c.int(`dailyChallenge.${k}`, dc[k]);
    c.isoOrNull('dailyChallenge.lastSubmissionAt', dc.lastSubmissionAt);
    if (c.arr('dailyChallenge.boardVersionsToday', dc.boardVersionsToday)) {
      if (dc.boardVersionsToday.length > 3) c.fail('dailyChallenge.boardVersionsToday', 'at most 3 rows');
      dc.boardVersionsToday.forEach((r, i) => {
        const p = `dailyChallenge.boardVersionsToday[${i}]`;
        if (!c.obj(p, r)) return;
        c.label(`${p}.boardVersion`, r.boardVersion, 'boardVersion');
        c.int(`${p}.entrants`, r.entrants);
      });
    }
  }
  checkStringLengths(c, d);
  return c.problems;
}

function checkHorizon(c, path, v) {
  if (!c.obj(path, v)) return;
  c.bool(`${path}.matured`, v.matured);
  c.int(`${path}.retained`, v.retained);
  c.rate(`${path}.rate`, v.rate);
  if (v.matured === false && v.rate !== null) c.fail(`${path}.rate`, 'null while the day has not matured');
}

export function validateCohorts(d) {
  const c = makeChecker();
  if (!c.obj('data', d)) return c.problems;
  checkHeader(c, d);
  c.iso('windowFrom', d.windowFrom);
  if (c.arr('installsByDay', d.installsByDay)) {
    if (d.installsByDay.length > 31) c.fail('installsByDay', 'at most 31 days');
    let previous = '';
    d.installsByDay.forEach((r, i) => {
      const p = `installsByDay[${i}]`;
      if (!c.obj(p, r)) return;
      if (c.day(`${p}.day`, r.day)) {
        if (r.day <= previous) c.fail(`${p}.day`, 'days in ascending order');
        previous = r.day;
      }
      for (const k of DAY_ROW_KEYS) c.int(`${p}.${k}`, r[k]);
    });
  }
  const rt = d.retention;
  if (c.obj('retention', rt)) {
    c.day('retention.utcToday', rt.utcToday);
    if (c.arr('retention.cohorts', rt.cohorts)) {
      rt.cohorts.forEach((r, i) => {
        const p = `retention.cohorts[${i}]`;
        if (!c.obj(p, r)) return;
        c.day(`${p}.cohortDay`, r.cohortDay);
        c.int(`${p}.installs`, r.installs);
        c.int(`${p}.otherInstalls`, r.otherInstalls);
        for (const h of ['d1', 'd7', 'd14']) checkHorizon(c, `${p}.${h}`, r[h]);
      });
    }
    if (c.obj('retention.pooled', rt.pooled)) {
      for (const h of ['d1', 'd7', 'd14']) {
        const p = `retention.pooled.${h}`;
        if (!c.obj(p, rt.pooled[h])) continue;
        c.int(`${p}.installs`, rt.pooled[h].installs);
        c.int(`${p}.retained`, rt.pooled[h].retained);
      }
    }
  }
  const f = d.funnel;
  if (c.obj('funnel', f)) {
    c.int('funnel.installs', f.installs);
    c.int('funnel.startedLastHour', f.startedLastHour);
    if (c.arr('funnel.steps', f.steps)) {
      if (f.steps.length !== FUNNEL_STEPS.length) c.fail('funnel.steps', `${FUNNEL_STEPS.length} steps`);
      f.steps.forEach((s, i) => {
        const p = `funnel.steps[${i}]`;
        if (!c.obj(p, s)) return;
        c.eq(`${p}.step`, s.step, FUNNEL_STEPS[i]);
        c.int(`${p}.installs`, s.installs);
      });
    }
  }
  checkStringLengths(c, d);
  return c.problems;
}

export function validateProgress(d) {
  const c = makeChecker();
  if (!c.obj('data', d)) return c.problems;
  checkHeader(c, d, { tz: false });
  c.iso('since', d.since);
  const s = d.story;
  if (c.obj('story', s)) {
    c.int('story.installsOpened', s.installsOpened);
    if (c.arr('story.phases', s.phases)) {
      if (s.phases.length !== 5) c.fail('story.phases', '5 phases');
      s.phases.forEach((r, i) => {
        const p = `story.phases[${i}]`;
        if (!c.obj(p, r)) return;
        c.eq(`${p}.phase`, r.phase, i + 1);
        c.int(`${p}.installs`, r.installs);
        if (r.medianPuzzlesSolved !== null) c.num(`${p}.medianPuzzlesSolved`, r.medianPuzzlesSolved);
      });
    }
    if (c.arr('story.depth', s.depth)) {
      if (s.depth.length !== DEPTH_LADDER.length) c.fail('story.depth', `${DEPTH_LADDER.length} rungs`);
      s.depth.forEach((r, i) => {
        const p = `story.depth[${i}]`;
        if (!c.obj(p, r)) return;
        c.eq(`${p}.atLeast`, r.atLeast, DEPTH_LADDER[i]);
        c.int(`${p}.installs`, r.installs);
      });
    }
  }
  const st = d.store;
  if (c.obj('store', st)) {
    for (const k of ['opens', 'openers', 'purchases', 'purchasers', 'purchasersFromStore']) c.int(`store.${k}`, st[k]);
    if (c.arr('store.products', st.products)) {
      if (st.products.length > 20) c.fail('store.products', 'at most 20 rows');
      st.products.forEach((r, i) => {
        const p = `store.products[${i}]`;
        if (!c.obj(p, r)) return;
        c.label(`${p}.productId`, r.productId, 'productId');
        c.label(`${p}.kind`, r.kind, 'kind');
        for (const k of ['initiated', 'purchased', 'purchasers', 'cancelled', 'failed']) c.int(`${p}.${k}`, r[k]);
      });
    }
  }
  checkStringLengths(c, d);
  return c.problems;
}

function checkProviderCommon(c, path, v, statuses) {
  if (!c.obj(path, v)) return false;
  if (!statuses.includes(v.status)) c.fail(`${path}.status`, statuses.join(' or '));
  c.isoOrNull(`${path}.fetchedAt`, v.fetchedAt);
  c.isoOrNull(`${path}.lastTriedAt`, v.lastTriedAt);
  if (v.error !== null && c.obj(`${path}.error`, v.error)) {
    c.str(`${path}.error.code`, v.error.code);
    c.str(`${path}.error.message`, v.error.message);
  }
  return true;
}

const httpsOrNull = (v) => v === null || (typeof v === 'string' && v.startsWith('https://'));

export function validateExternal(d) {
  const c = makeChecker();
  if (!c.obj('data', d)) return c.problems;
  const rc = d.revenuecat;
  if (checkProviderCommon(c, 'revenuecat', rc, ['ok', 'not_configured', 'unavailable'])) {
    if (rc.currency !== null && !(typeof rc.currency === 'string' && /^[A-Z]{3}$/.test(rc.currency))) c.fail('revenuecat.currency', 'a currency code or null');
    if (!(typeof rc.dashboardUrl === 'string' && rc.dashboardUrl.startsWith('https://'))) c.fail('revenuecat.dashboardUrl', 'an https URL');
    if (c.arr('revenuecat.metrics', rc.metrics)) {
      if (rc.metrics.length > 16) c.fail('revenuecat.metrics', 'at most 16 metrics');
      rc.metrics.forEach((m, i) => {
        const p = `revenuecat.metrics[${i}]`;
        if (!c.obj(p, m)) return;
        if (!(typeof m.id === 'string' && /^[a-z0-9_]{1,64}$/.test(m.id))) c.fail(`${p}.id`, 'a metric id');
        c.str(`${p}.name`, m.name);
        if (!(typeof m.value === 'number' && Number.isFinite(m.value))) c.fail(`${p}.value`, 'a finite number');
        c.str(`${p}.unit`, m.unit);
        if (!(m.period === '' || (typeof m.period === 'string' && /^P[0-9]+D$/.test(m.period)))) c.fail(`${p}.period`, 'an ISO day period or empty');
        c.isoOrNull(`${p}.lastUpdatedAt`, m.lastUpdatedAt);
      });
    }
  }
  const se = d.sentry;
  if (checkProviderCommon(c, 'sentry', se, ['ok', 'partial', 'not_configured', 'unavailable'])) {
    c.str('sentry.environment', se.environment);
    if (se.crashFreeSessionRate24h !== null) c.rate('sentry.crashFreeSessionRate24h', se.crashFreeSessionRate24h);
    if (se.sessions24h !== null) c.int('sentry.sessions24h', se.sessions24h);
    if (se.unresolvedIssues24h !== null) c.int('sentry.unresolvedIssues24h', se.unresolvedIssues24h);
    c.bool('sentry.unresolvedIssuesIsLowerBound', se.unresolvedIssuesIsLowerBound);
    if (!(typeof se.issuesUrl === 'string' && se.issuesUrl.startsWith('https://'))) c.fail('sentry.issuesUrl', 'an https URL');
    if (c.arr('sentry.newestIssues', se.newestIssues)) {
      if (se.newestIssues.length > 5) c.fail('sentry.newestIssues', 'at most 5 issues');
      se.newestIssues.forEach((it, i) => {
        const p = `sentry.newestIssues[${i}]`;
        if (!c.obj(p, it)) return;
        c.str(`${p}.shortId`, it.shortId);
        c.str(`${p}.title`, it.title);
        c.str(`${p}.level`, it.level);
        c.int(`${p}.events`, it.events);
        c.int(`${p}.users`, it.users);
        c.isoOrNull(`${p}.firstSeen`, it.firstSeen);
        c.isoOrNull(`${p}.lastSeen`, it.lastSeen);
        if (!httpsOrNull(it.url)) c.fail(`${p}.url`, 'an https URL or null');
      });
    }
  }
  if (c.arr('links', d.links)) {
    d.links.forEach((l, i) => {
      const p = `links[${i}]`;
      if (!c.obj(p, l)) return;
      c.str(`${p}.id`, l.id);
      c.str(`${p}.label`, l.label);
      if (!(typeof l.url === 'string' && l.url.startsWith('https://'))) c.fail(`${p}.url`, 'an https URL');
      c.str(`${p}.note`, l.note);
    });
  }
  checkStringLengths(c, d);
  return c.problems;
}

export const VALIDATORS = {
  live: validateLive,
  cohorts: validateCohorts,
  progress: validateProgress,
  external: validateExternal,
};
