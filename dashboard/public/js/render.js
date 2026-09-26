// Builds every section of the page from the four API envelopes. Every server
// string goes in through textContent (dom.js), never through HTML.

import { ageSpan, h, link, LEVEL_WORD, statusIcon } from './dom.js';
import { areaChart, barList, columnChart, hideTip } from './charts.js';
import {
  addDays, fmtAge, fmtBytes, fmtCompact, fmtDay, fmtDayTime, fmtInt, fmtMoney, fmtPct,
  fmtShort, fmtShortDay, fmtTime, isSmall, num, parseIso, plural, ratio,
} from './format.js';
import {
  FUNNEL_STEPS, NOTICE_TEXT, SECTION_NAMES, funnelStepLabel, periodLabel, placementLabel,
  productLabel, rawLabel, syncOperationLabel, syncResultLabel,
} from './labels.js';
import { appErrorLevel, computeStatus, healthVerdicts, THRESHOLDS } from './status.js';

// ---------------------------------------------------------------------------
// Small building blocks

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function obj(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

/**
 * srValue: the full number when `value` is a shortened form ("13.4K"), so a
 * screen reader hears "13,363" rather than an abbreviation.
 */
function tile({ label, value, sub, level, cls, valueNode, srValue }) {
  const labelEl = h('p', 'tile-label');
  if (level) {
    labelEl.append(statusIcon(level, 16), h('span', 'sr-only', `${LEVEL_WORD[level]}: `));
  }
  labelEl.append(label);
  let shown = valueNode || value;
  if (!valueNode && srValue && srValue !== value) {
    shown = [h('span', { attrs: { 'aria-hidden': 'true' } }, value), h('span', 'sr-only', srValue)];
  }
  const el = h('div', `tile${level ? ` tile-${level}` : ''}${cls ? ` ${cls}` : ''}`,
    labelEl,
    h('p', 'tile-value', shown));
  if (sub) el.append(h('p', 'tile-sub', sub));
  return el;
}

function tiles(list, cls = '') {
  return h('div', `tiles ${cls}`.trim(), list);
}

function caption(...parts) {
  return h('p', 'caption', ...parts);
}

function note(level, ...parts) {
  return h('p', `note note-${level}`, statusIcon(level, 16), h('span', 'sr-only', `${LEVEL_WORD[level]}: `), h('span', null, ...parts));
}

function subhead(text, id) {
  return h('h3', id ? { attrs: { id } } : null, text);
}

function cellClass(col) {
  return [col?.numeric ? 'num' : '', col?.nowrap ? 'nowrap' : ''].filter(Boolean).join(' ');
}

function table({ label, columns, rows }) {
  const head = h('tr', null, columns.map((c) => h('th', { class: c.numeric ? 'num' : '', attrs: { scope: 'col' } }, c.label)));
  const body = rows.map((row) => h('tr', row.cls || '', row.cells.map((cell, i) => (i === 0
    ? h('th', { class: cellClass(columns[0]), attrs: { scope: 'row' } }, cell)
    : h('td', cellClass(columns[i]), cell)))));
  const t = h('table', null, h('caption', 'sr-only', label), h('thead', null, head), h('tbody', null, body));
  return h('div', { class: 'table-wrap', attrs: { tabindex: '0', role: 'region', 'aria-label': label } }, t);
}

/** First `keep` rows, and the full table behind a disclosure. */
function tableWithMore({ label, columns, rows, keep, moreLabel, key }) {
  if (rows.length <= keep) return table({ label, columns, rows });
  return h('div', 'more',
    h('div', 'more-short', table({ label, columns, rows: rows.slice(0, keep) })),
    h('details', { class: 'more-all', data: { key } },
      h('summary', null, moreLabel),
      table({ label: `${label}, all rows`, columns, rows })));
}

function tableView(key, label, columns, rows) {
  return h('details', { class: 'table-view', data: { key } },
    h('summary', null, 'Show as table'),
    table({ label, columns, rows }));
}

/** Loading, error and stale lines shared by every card. Returns null when fine. */
function envState(env, tz, offline) {
  if (!env) return { kind: 'loading', offline: Boolean(offline) };
  if (!env.data) {
    return { kind: 'error', text: `Not available: ${env.error?.message || 'no data yet'}` };
  }
  if (env.stale) {
    const when = fmtTime(env.fetchedAt, tz);
    return { kind: 'stale', text: `Showing data from ${when}. Refresh failed: ${env.error?.message || 'unknown error'}` };
  }
  return null;
}

/** "As of 16:05" for a card fed by the 5 minute cache, so it never looks out of step silently. */
function asOf(env, ctx) {
  if (!env?.data || env.stale || !env.fetchedAt) return null;
  return h('p', 'asof', `As of ${fmtTime(env.fetchedAt, ctx.tz)}. Updates every 5 minutes.`);
}

function stateNode(state) {
  if (!state) return null;
  if (state.kind === 'loading') return h('p', 'loading', state.offline ? 'Waiting for the server, retrying' : 'Loading');
  if (state.kind === 'error') return note('bad', state.text);
  return note('warn', state.text);
}

// ---------------------------------------------------------------------------
// Sections. Each returns an array of nodes for the card body.

function sectionNow(ctx) {
  const env = ctx.live;
  const state = envState(env, ctx.tz, ctx.offline);
  if (!env?.data) return [stateNode(state)];
  const data = env.data;
  const now = obj(data.now);
  const out = [stateNode(state)];
  // Three across on a phone: shorten from ten thousand so nothing wraps.
  const short = (v) => ({ value: fmtShort(v), srValue: fmtInt(v) });
  out.push(tiles([
    tile({ label: 'Playing now', ...short(now.active5m), sub: 'devices in the last 5 min' }),
    tile({ label: 'Last hour', ...short(now.active60m), sub: 'devices active' }),
    tile({ label: 'Events last hour', ...short(now.events60m), sub: 'received from players' }),
  ], 'tiles-3'));

  const values = arr(now.perMinute).map((v) => num(v) ?? 0);
  const start = parseIso(now.perMinuteStart);
  if (values.length >= 2 && start !== null && values.every((v) => v === 0)) {
    out.push(subhead('Events per minute, last hour', 'h-perminute'));
    out.push(h('p', 'empty', 'No player events in the last hour. The chart appears with the first upload.'));
  } else if (values.length >= 2 && start !== null) {
    const minuteIso = (i) => new Date(start + i * 60_000).toISOString();
    const label = (i) => `${fmtTime(minuteIso(i), ctx.tz)}${i === values.length - 1 ? ', minute still filling' : ''}`;
    const full = values.slice(0, -1);
    const busiest = full.reduce((best, v, i) => (v > full[best] ? i : best), 0);
    const total = values.reduce((a, b) => a + b, 0);
    out.push(subhead('Events per minute, last hour', 'h-perminute'));
    out.push(areaChart({
      id: 'per-minute',
      values,
      partialLast: true,
      ariaLabel: `Events per minute over the last hour, ${fmtInt(total)} in total. Busiest minute ${fmtInt(full[busiest])} events at ${fmtTime(minuteIso(busiest), ctx.tz)}`,
      pointLabel: label,
      valueText: (v) => plural(v, 'event'),
      xStartLabel: fmtTime(minuteIso(0), ctx.tz),
      xEndLabel: 'now',
    }));
    out.push(h('p', 'chart-note',
      `Busiest minute: ${fmtInt(full[busiest])} at ${fmtTime(minuteIso(busiest), ctx.tz)}. Latest full minute: ${fmtInt(full[full.length - 1])}. The hollow dot is the current minute, still filling: ${plural(values[values.length - 1], 'event')} so far.`));
    out.push(tableView('per-minute-table', 'Events per minute', [
      { label: `Minute (${ctx.tzShort})`, nowrap: true }, { label: 'Events', numeric: true },
    ], values.map((v, i) => ({ cells: [label(i), fmtInt(v)] })).reverse()));
  } else {
    out.push(h('p', 'empty', 'Per-minute counts are not available.'));
  }
  out.push(caption('Phones upload in batches about once a minute while the game is open.'));
  return out;
}

/** Today's new installs that finished the tutorial, as a share of them. */
function finishedTutorialTile(t) {
  const fresh = num(t.newInstalls) ?? 0;
  const finished = num(t.newInstallsFinishedTutorial);
  if (finished === null) return tile({ label: 'Finished tutorial', value: fmtCompact(t.onboardingCompleted), sub: 'includes Skip' });
  return tile({
    label: 'Finished tutorial',
    value: fmtCompact(finished),
    sub: fresh > 0 ? `${fmtPct(finished / fresh)} of ${plural(fresh, 'new install')}, includes Skip` : 'of new installs, includes Skip',
  });
}

function sectionToday(ctx) {
  const env = ctx.live;
  const state = envState(env, ctx.tz, ctx.offline);
  if (!env?.data) return [stateNode(state)];
  const data = env.data;
  const t = obj(data.todayCounts);
  const testers = data.testers && typeof data.testers === 'object' ? data.testers : null;
  const out = [stateNode(state)];
  const day = fmtDay(data.today);
  if (testers) {
    out.push(caption(`Since midnight in ${ctx.tz} (${day}). ${plural(testers.devices, 'test device')} ${num(testers.devices) === 1 ? 'is' : 'are'} left out: first seen before the launch time, ${fmtDayTime(data.launchAt, ctx.tz)}.`));
  } else {
    out.push(caption(`Since midnight in ${ctx.tz} (${day}). Test devices are included because the launch time is not set.`));
  }
  const other = num(t.otherNewInstalls) ?? 0;
  out.push(tiles([
    tile({ label: 'New installs', value: fmtCompact(t.newInstalls), sub: other > 0 ? `+${fmtInt(other)} other new ${other === 1 ? 'device' : 'devices'}` : 'first seen today' }),
    tile({ label: 'Active devices', value: fmtCompact(t.activeInstalls), sub: 'sent anything today' }),
    tile({ label: 'Puzzles started', value: fmtCompact(t.puzzlesStarted) }),
    tile({ label: 'Puzzles solved', value: fmtCompact(t.puzzlesCompleted), sub: `by ${plural(t.installsCompletingPuzzle, 'device')}` }),
    tile({ label: 'Dailies done', value: fmtCompact(t.dailiesCompleted) }),
    finishedTutorialTile(t),
    tile({ label: 'Store opens', value: fmtCompact(t.storeOpens) }),
    tile({ label: 'Purchases', value: fmtCompact(t.purchases), sub: plural(t.purchasers, 'buyer') }),
    tile({ label: 'Daily amber', value: fmtCompact(t.dailyAmberClaims), sub: `${fmtInt(t.dailyAmberGranted)} amber` }),
    tile({
      label: 'App errors', value: fmtCompact(t.appErrors), sub: `on ${plural(t.installsWithAppError, 'device')}`,
      // The same share-of-devices rule as the Health card and the Problems chip.
      level: appErrorLevel(t.installsWithAppError, t.activeInstalls),
    }),
  ]));
  if (testers) out.push(h('p', 'footnote', `Test devices active today: ${fmtInt(testers.activeToday)}`));
  return out;
}

function sectionInstalls(ctx) {
  const env = ctx.cohorts;
  const state = envState(env, ctx.tz, ctx.offline);
  if (!env?.data) return [stateNode(state)];
  const days = arr(env.data.installsByDay);
  const out = [stateNode(state), asOf(env, ctx)];
  const todayDay = ctx.live?.data?.today;
  if (days.length === 0) {
    out.push(h('p', 'empty', 'No days to show yet.'));
  } else if (days.length === 1) {
    const d = days[0];
    const other = num(d.otherNewInstalls) ?? 0;
    out.push(h('div', 'figure',
      h('p', 'figure-value', fmtInt(d.newInstalls)),
      h('p', 'figure-label', `new installs on ${fmtDay(d.day)}${other > 0 ? `, plus ${plural(other, 'other new device')}` : ''}`)));
    out.push(h('p', 'chart-note', 'The chart starts once there are two days to compare.'));
  } else {
    // The last day is today, still filling, whenever it matches the live section's today.
    const lastIsToday = typeof todayDay === 'string' ? days[days.length - 1].day === todayDay : true;
    out.push(columnChart({
      id: 'installs-by-day',
      ariaLabel: `New installs per day, ${days.length} days, from ${fmtDay(days[0].day)} to ${fmtDay(days[days.length - 1].day)}${lastIsToday ? ', the last day so far' : ''}`,
      valueLabel: 'new installs',
      partialLast: lastIsToday,
      items: days.map((d, i) => {
        const partial = lastIsToday && i === days.length - 1;
        return {
          value: d.newInstalls,
          xLabel: partial ? 'Today so far' : fmtShortDay(d.day),
          tipLabel: partial ? `${fmtDay(d.day)}, today so far` : fmtDay(d.day),
          extra: [
            { value: fmtInt(d.otherNewInstalls), label: 'other new devices' },
            { value: fmtInt(d.activeInstalls), label: 'active devices' },
          ],
        };
      }),
    }));
  }
  const rows = [...days].reverse().map((d) => ({
    cells: [fmtShortDay(d.day), fmtInt(d.newInstalls), fmtInt(d.otherNewInstalls), fmtInt(d.activeInstalls),
      fmtInt(d.puzzlesCompleted), fmtInt(d.purchases), fmtInt(d.appErrors)],
  }));
  if (rows.length) {
    out.push(tableWithMore({
      label: 'Installs and activity by day',
      key: 'days-more',
      keep: 7,
      moreLabel: 'Show all days',
      columns: [
        { label: 'Day', nowrap: true }, { label: 'New', numeric: true }, { label: 'Other', numeric: true },
        { label: 'Active', numeric: true }, { label: 'Solved', numeric: true },
        { label: 'Buys', numeric: true }, { label: 'Errors', numeric: true },
      ],
      rows,
    }));
  }
  const charted = days.length >= 2;
  out.push(caption(`Days in ${ctx.tz}, since launch, at most 30 days. The launch day starts at the launch time${charted ? ', and the pale last column is today so far' : ''}. Other new devices, first seen without the opening puzzle (such as a player restoring onto a new phone), are counted ${charted ? 'in the tooltip and ' : ''}in the table.`));
  return out;
}

function sectionFunnel(ctx) {
  const env = ctx.cohorts;
  const state = envState(env, ctx.tz, ctx.offline);
  if (!env?.data) return [stateNode(state)];
  const f = obj(env.data.funnel);
  const base = num(f.installs) ?? 0;
  const byStep = new Map(arr(f.steps).map((s) => [s?.step, num(s?.installs) ?? 0]));
  const order = FUNNEL_STEPS.map(([id]) => id).filter((id) => byStep.has(id));
  for (const s of arr(f.steps)) if (!order.includes(s?.step)) order.push(s?.step);
  const out = [stateNode(state), asOf(env, ctx)];
  out.push(h('p', 'lead', `${plural(base, 'new install')} since ${fmtDayTime(env.data.windowFrom, ctx.tz)}`));
  if (base === 0) {
    out.push(h('p', 'empty', 'No new installs yet. The funnel fills as players open the game for the first time.'));
    out.push(caption('Finished tutorial includes players who chose Skip.'));
    return out;
  }
  // Biggest drop between consecutive steps.
  let drop = null;
  for (let i = 1; i < order.length; i += 1) {
    const a = byStep.get(order[i - 1]);
    const b = byStep.get(order[i]);
    const lost = a - b;
    if (lost > 0 && (!drop || lost > drop.lost)) drop = { from: order[i - 1], to: order[i], lost, rate: a > 0 ? lost / a : null };
  }
  const finished = byStep.get('onboarding_complete');
  if (typeof finished === 'number') {
    out.push(h('p', 'keyline', h('strong', null, fmtPct(ratio(finished, base))), ` finished the tutorial (${fmtInt(finished)} of ${fmtInt(base)}).`));
  }
  const rows = order.map((id, i) => ({
    label: `${i + 1}. ${funnelStepLabel(id)}`,
    value: byStep.get(id),
    valueText: `${fmtInt(byStep.get(id))} (${fmtPct(ratio(byStep.get(id), base))})`,
    tag: drop && drop.to === id ? 'Biggest drop' : null,
    tagLevel: 'warn',
  }));
  out.push(barList(rows, base, { ordered: true }));
  if (drop) {
    out.push(h('p', 'keyline', `Biggest drop: ${funnelStepLabel(drop.from)} to ${funnelStepLabel(drop.to)}, ${plural(drop.lost, 'player')} (${fmtPct(drop.rate)}).`));
  }
  const recent = num(f.startedLastHour) ?? 0;
  if (recent > 0) out.push(h('p', 'chart-note', `${fmtInt(recent)} started in the last hour and may still be playing the tutorial.`));
  if (isSmall(base)) out.push(note('info', 'Too few installs to judge yet.'));
  out.push(caption('Each row counts new installs that ever reached that step, so later rows can rarely be higher. Finished tutorial includes players who chose Skip. Rollout guide: pause if under about 60% finish, on a few hundred installs.'));
  return out;
}

/** Hollow ring that marks a small sample, with a word for screen readers. */
function smallMark(inLegend = false) {
  return h('span', 'small-mark', h('span', { class: 'ring', attrs: { 'aria-hidden': 'true' } }), inLegend ? null : h('span', 'sr-only', ' small sample'));
}

function retentionCell(d) {
  const x = obj(d);
  if (!x.matured) return h('span', 'pending', 'pending');
  return h('span', 'rate-cell', h('span', 'rate', fmtPct(x.rate)), ' ', h('span', 'rate-count', `(${fmtInt(x.retained)})`));
}

function sectionRetention(ctx) {
  const env = ctx.cohorts;
  const state = envState(env, ctx.tz, ctx.offline);
  if (!env?.data) return [stateNode(state)];
  const r = obj(env.data.retention);
  const cohorts = arr(r.cohorts);
  const pooled = obj(r.pooled);
  const oldest = cohorts.length ? cohorts[cohorts.length - 1]?.cohortDay : null;
  const out = [stateNode(state), asOf(env, ctx)];
  const horizon = (key, days) => {
    const p = obj(pooled[key]);
    const installs = num(p.installs) ?? 0;
    const retained = num(p.retained) ?? 0;
    if (installs === 0) {
      const first = oldest ? addDays(oldest, days + 1) : null;
      return tile({
        label: key.toUpperCase(), value: 'pending',
        sub: first ? `first number ${fmtDay(first)}, 00:00 UTC` : 'waiting for new installs',
        cls: 'tile-pending',
      });
    }
    return tile({
      label: key.toUpperCase(),
      value: fmtPct(retained / installs),
      sub: `of ${fmtInt(installs)} (${fmtInt(retained)} came back)${isSmall(installs) ? ', too small to judge' : ''}`,
      level: isSmall(installs) ? 'neutral' : null,
    });
  };
  out.push(tiles([horizon('d1', 1), horizon('d7', 7), horizon('d14', 14)], 'tiles-3'));
  if (cohorts.length === 0) {
    out.push(h('p', 'empty', 'No cohorts yet. A cohort is the new installs first seen on one UTC day.'));
  } else {
    out.push(tableWithMore({
      label: 'Retention by cohort',
      key: 'retention-more',
      keep: 14,
      moreLabel: 'Show all cohorts',
      columns: [
        { label: 'Cohort (UTC)', nowrap: true }, { label: 'Installs', numeric: true },
        { label: 'D1', numeric: true }, { label: 'D7', numeric: true }, { label: 'D14', numeric: true },
      ],
      rows: cohorts.map((c) => {
        const installsCell = h('span', null, fmtInt(c.installs));
        if (isSmall(c.installs)) installsCell.append(smallMark());
        return { cells: [fmtShortDay(c.cohortDay), installsCell, retentionCell(c.d1), retentionCell(c.d7), retentionCell(c.d14)] };
      }),
    }));
    if (cohorts.some((c) => isSmall(c.installs))) {
      out.push(h('p', 'chart-note', smallMark(true), ' marks a cohort under 30 installs, too small to judge.'));
    }
  }
  out.push(caption('Cohorts are UTC days, new installs only. D1: any activity received on the next UTC day. A first session that runs past 00:00 UTC (8 pm New York) also counts, so D1 reads a little high for evening players. D7 and D14 work the same way. A rate stays pending until that day has ended. Under 30 installs is marked small and is too noisy to judge. Rollout guide: pause if D1 falls under about 25% on a few hundred installs.'));
  return out;
}

/**
 * Rows up to and including the first zero; the zero run after it becomes one
 * line of text, so a young launch does not show a wall of empty bars.
 */
function trimZeroTail(rows, valueOf) {
  const firstZero = rows.findIndex((r) => (num(valueOf(r)) ?? 0) === 0);
  if (firstZero === -1) return { shown: rows, rest: [] };
  const rest = rows.slice(firstZero + 1);
  if (!rest.every((r) => (num(valueOf(r)) ?? 0) === 0)) return { shown: rows, rest: [] };
  return { shown: rows.slice(0, firstZero + 1), rest };
}

function sectionStory(ctx) {
  const env = ctx.progress;
  const state = envState(env, ctx.tz, ctx.offline);
  if (!env?.data) return [stateNode(state)];
  const story = obj(env.data.story);
  const base = num(story.installsOpened) ?? 0;
  const out = [stateNode(state), asOf(env, ctx)];
  out.push(h('p', 'lead', `${plural(base, 'device')} opened the game since ${fmtDayTime(env.data.since, ctx.tz)}`));
  const share = (n) => (base > 0 ? fmtPct(ratio(n, base) ?? 0) : 'none');

  const phases = arr(story.phases).map(obj);
  out.push(subhead('Reached each story phase', 'h-phases'));
  if (phases.length) {
    const { shown, rest } = trimZeroTail(phases, (p) => p.installs);
    out.push(barList(shown.map((p) => ({
      label: `Phase ${fmtInt(p.phase)}`,
      value: p.installs,
      valueText: `${fmtInt(p.installs)} (${share(p.installs)})`,
      note: num(p.medianPuzzlesSolved) === null ? null : `median ${fmtInt(p.medianPuzzlesSolved)} solves when reached`,
    })), Math.max(base, 1), { labelledBy: 'h-phases' }));
    if (rest.length) {
      const first = rest[0].phase;
      const last = rest[rest.length - 1].phase;
      out.push(h('p', 'chart-note', rest.length === 1 ? `Phase ${fmtInt(first)}: nobody yet.` : `Phases ${fmtInt(first)} to ${fmtInt(last)}: nobody yet.`));
    }
  } else {
    out.push(h('p', 'empty', 'No phase data yet.'));
  }

  const depth = arr(story.depth).map(obj);
  out.push(subhead('Puzzles solved per device', 'h-depth'));
  if (depth.length) {
    const { shown, rest } = trimZeroTail(depth, (d) => d.installs);
    out.push(barList(shown.map((d) => ({
      label: `Solved ${fmtInt(d.atLeast)}+`,
      value: d.installs,
      valueText: `${fmtInt(d.installs)} (${share(d.installs)})`,
    })), Math.max(base, 1), { labelledBy: 'h-depth' }));
    if (rest.length) {
      out.push(h('p', 'chart-note', `Nobody has solved ${fmtInt(rest[0].atLeast)} or more yet.`));
    }
  } else {
    out.push(h('p', 'empty', 'No puzzle data yet.'));
  }
  out.push(caption('Phase gates: 1 at 12 solves, 2 at 28, 3 at 62, 4 at 90 with all 13 residents home, 5 after the ending. Percentages are of the devices that opened the game.'));
  return out;
}

// --- Money ------------------------------------------------------------------

const RC_ORDER = ['mrr', 'active_subscriptions', 'active_trials', 'new_customers', 'active_users'];

function rcRank(id) {
  if (typeof id !== 'string') return 99;
  if (id.startsWith('revenue')) return 0;
  const i = RC_ORDER.indexOf(id);
  return i === -1 ? 50 : i + 1;
}

function isMoneyMetric(m) {
  return m.unit === '$' || m.id === 'mrr' || (typeof m.id === 'string' && m.id.startsWith('revenue'));
}

function revenueBlock(ctx) {
  const out = [subhead('Revenue (RevenueCat)')];
  const env = ctx.external;
  const state = envState(env, ctx.tz, ctx.offline);
  if (!env?.data) {
    out.push(stateNode(state));
    return out;
  }
  const rc = obj(env.data.revenuecat);
  const status = rc.status;
  if (status === 'not_configured') {
    out.push(note('neutral', 'RevenueCat is not connected. Add a read-only key with deploy.sh.'));
    out.push(h('p', 'linkline', link(rc.dashboardUrl, 'Open RevenueCat')));
    return out;
  }
  if (status === 'unavailable') {
    out.push(note('warn', `RevenueCat unavailable, last tried ${fmtTime(rc.lastTriedAt, ctx.tz)}: ${rc.error?.message || 'unknown error'}`));
  } else if (state && state.kind === 'stale') {
    out.push(stateNode(state));
  }
  const metrics = arr(rc.metrics)
    .map((m, i) => ({ m: obj(m), i }))
    .sort((a, b) => (rcRank(a.m.id) - rcRank(b.m.id)) || (a.i - b.i))
    .map((x) => x.m);
  if (metrics.length === 0) {
    out.push(h('p', 'empty', status === 'unavailable' ? 'No earlier figures to show.' : 'No figures yet.'));
  } else {
    const dim = status === 'unavailable';
    out.push(tiles(metrics.map((m) => tile({
      label: m.name || m.id || 'Metric',
      value: isMoneyMetric(m) ? fmtMoney(m.value, rc.currency, { short: true }) : fmtCompact(m.value),
      sub: [periodLabel(m.period), dim ? `from ${fmtTime(rc.fetchedAt, ctx.tz)}` : ''].filter(Boolean).join(', '),
      cls: dim ? 'tile-dim' : '',
    }))));
  }
  const parts = [];
  if (rc.fetchedAt) parts.push(`From RevenueCat at ${fmtTime(rc.fetchedAt, ctx.tz)}. New customers and active users can trail by 1 to 2 hours.`);
  out.push(h('p', 'caption', ...parts, parts.length ? ' ' : '', link(rc.dashboardUrl, 'Open RevenueCat')));
  return out;
}

function storeBlock(ctx) {
  const out = [subhead('Store')];
  const env = ctx.progress;
  const state = envState(env, ctx.tz, ctx.offline);
  if (!env?.data) {
    out.push(stateNode(state));
    return out;
  }
  out.push(stateNode(state), asOf(env, ctx));
  const st = obj(env.data.store);
  const openers = num(st.openers) ?? 0;
  const buyers = num(st.purchasers) ?? 0;
  // Only buyers who also opened the Store: Patron, Remove ads, the Keeper's
  // Edition and the season premium are sold from other screens.
  const fromStore = num(st.purchasersFromStore);
  const conv = ratio(fromStore, openers);
  const outside = fromStore === null ? 0 : Math.max(0, buyers - fromStore);
  const short = (v) => ({ value: fmtShort(v), srValue: fmtInt(v) });
  out.push(tiles([
    tile({ label: 'Store opens', ...short(st.opens), sub: plural(openers, 'device') }),
    tile({ label: 'Buyers', ...short(buyers), sub: `${plural(st.purchases, 'purchase')}, any screen` }),
    tile({
      label: 'Store visitors who bought',
      value: conv === null ? 'none' : fmtPct(conv),
      sub: isSmall(openers) ? `${fmtInt(fromStore ?? 0)} of ${fmtInt(openers)}, too small to judge` : `${fmtInt(fromStore ?? 0)} of ${fmtInt(openers)}`,
    }),
  ], 'tiles-3'));
  if (outside > 0) {
    out.push(h('p', 'chart-note', `${plural(outside, 'buyer')} bought without opening the Store: Patron, Remove ads, the music box or the Season Pass sell from their own screens.`));
  }
  const products = arr(st.products);
  if (products.length) {
    out.push(table({
      label: 'Checkouts by product',
      columns: [
        { label: 'Product' }, { label: 'Tapped buy', numeric: true }, { label: 'Bought', numeric: true },
        { label: 'Cancelled', numeric: true }, { label: 'Failed', numeric: true },
      ],
      rows: products.map((p) => ({
        cells: [productLabel(p.productId), fmtInt(p.initiated), fmtInt(p.purchased), fmtInt(p.cancelled), fmtInt(p.failed)],
      })),
    }));
  } else {
    out.push(h('p', 'empty', 'No purchase attempts yet.'));
  }
  out.push(caption(`Since ${fmtDayTime(env.data.since, ctx.tz)}. Checkouts the app reported. Revenue truth is RevenueCat and Play.`));
  return out;
}

const REWARDED_COLUMNS = {
  completed: 'watched',
  dismissed: 'closed',
  not_ready: 'notReady',
};

function adsBlock(ctx) {
  const out = [subhead('Ads, last 24\u00a0h')];
  const env = ctx.live;
  const state = envState(env, ctx.tz, ctx.offline);
  if (!env?.data) {
    out.push(stateNode(state));
    return out;
  }
  out.push(stateNode(state));
  const rows = arr(env.data.ads24h).map(obj);
  if (rows.length === 0) {
    out.push(h('p', 'empty', 'No ad requests in the last 24\u00a0h.'));
  } else {
    const byPlacement = new Map();
    const inter = { shown: 0, suppressed: 0, unavailable: 0, other: 0 };
    for (const r of rows) {
      const n = num(r.events) ?? 0;
      if (r.format === 'rewarded') {
        const key = r.placement || '(none)';
        if (!byPlacement.has(key)) byPlacement.set(key, { watched: 0, closed: 0, notReady: 0, failed: 0 });
        const acc = byPlacement.get(key);
        acc[REWARDED_COLUMNS[r.result] || 'failed'] += n;
      } else if (r.format === 'interstitial') {
        if (r.result in inter) inter[r.result] += n;
        else inter.other += n;
      }
    }
    if (byPlacement.size) {
      out.push(table({
        label: 'Rewarded ads by placement',
        columns: [
          { label: 'Placement' }, { label: 'Watched', numeric: true }, { label: 'Closed early', numeric: true },
          { label: 'Not ready', numeric: true }, { label: 'Failed or capped', numeric: true },
        ],
        rows: [...byPlacement.entries()].map(([p, a]) => ({
          cells: [placementLabel(p), fmtInt(a.watched), fmtInt(a.closed), fmtInt(a.notReady), fmtInt(a.failed)],
        })),
      }));
    } else {
      out.push(h('p', 'empty', 'No rewarded ads offered in the last 24\u00a0h.'));
    }
    const other = inter.other ? `, other ${fmtInt(inter.other)}` : '';
    out.push(h('p', 'keyline', `Interstitials: shown ${fmtInt(inter.shown)}, skipped by the rules ${fmtInt(inter.suppressed)}, no ad ready ${fmtInt(inter.unavailable)}${other}.`));
  }
  out.push(caption('What the app saw when it asked for an ad. Interstitials start after 16 solved puzzles. Earnings are in AdMob, about 4 hours behind.'));
  return out;
}

function sectionMoney(ctx) {
  return [
    h('div', 'block', revenueBlock(ctx)),
    h('div', 'block', storeBlock(ctx)),
    h('div', 'block', adsBlock(ctx)),
  ];
}

// --- Health -----------------------------------------------------------------

function sentryBlock(ctx) {
  const out = [subhead('Crashes (Sentry)')];
  const env = ctx.external;
  const state = envState(env, ctx.tz, ctx.offline);
  if (!env?.data) {
    out.push(stateNode(state));
    return out;
  }
  const se = obj(env.data.sentry);
  if (se.status === 'not_configured') {
    out.push(note('neutral', 'Sentry is not connected. Add a read-only token with deploy.sh.'));
    out.push(h('p', 'linkline', link(se.issuesUrl, 'Open Sentry')));
    return out;
  }
  if (se.status === 'unavailable') {
    out.push(note('warn', `Sentry unavailable, last tried ${fmtTime(se.lastTriedAt, ctx.tz)}: ${se.error?.message || 'unknown error'}`));
  } else if (se.status === 'partial') {
    out.push(note('warn', `Part of Sentry did not answer: ${se.error?.message || 'unknown error'}`));
  } else if (state && state.kind === 'stale') {
    out.push(stateNode(state));
  }
  if (se.status === 'unavailable' && !se.fetchedAt) {
    // Never answered yet: no figures to dim, so no tiles full of "not available".
    out.push(h('p', 'empty', 'No earlier figures to show.'));
    out.push(h('p', 'caption', link(se.issuesUrl, 'Open Sentry')));
    return out;
  }
  const dim = se.status === 'unavailable';
  const rate = num(se.crashFreeSessionRate24h);
  const sessions = num(se.sessions24h);
  const lines = h('div', dim ? 'sentry-lines is-dim' : 'sentry-lines');
  let crashText;
  if (rate !== null) crashText = `of ${plural(sessions ?? 0, 'session')}`;
  else if (sessions === 0) crashText = 'no sessions yet';
  else crashText = '';
  let crashLevel = null;
  if (rate !== null && (sessions ?? 0) >= 50) crashLevel = rate < 0.98 ? 'bad' : (rate < 0.995 ? 'warn' : 'good');
  const open = num(se.unresolvedIssues24h);
  lines.append(tiles([
    tile({ label: 'Crash-free sessions, 24\u00a0h', value: rate !== null ? fmtPct(rate, 2) : (sessions === 0 ? 'no sessions' : 'not available'), sub: crashText, level: crashLevel }),
    tile({
      label: 'Open issues seen, 24\u00a0h',
      value: open === null ? 'not available' : `${fmtInt(open)}${se.unresolvedIssuesIsLowerBound ? '+' : ''}`,
      sub: se.environment ? `${se.environment} builds` : '',
      level: open && open > 0 ? 'warn' : null,
    }),
  ]));
  const issues = arr(se.newestIssues).map(obj);
  if (issues.length) {
    lines.append(h('p', 'minihead', 'Newest open issues'));
    lines.append(h('ul', 'issues', issues.map((it) => h('li', null,
      h('p', 'issue-title', link(it.url, it.shortId || 'Issue', 'issue-id'), ' ', h('span', null, it.title || '')),
      h('p', 'issue-meta', it.level && it.level !== 'error' ? `${it.level}, ` : '',
        `${plural(it.events, 'event')}, ${plural(it.users, 'user')}, first seen `, ageSpan(it.firstSeen))))));
  } else if (open === 0) {
    lines.append(h('p', 'empty', 'No open issues in the last 24\u00a0h.'));
  }
  out.push(lines);
  out.push(h('p', 'caption', se.fetchedAt ? `From Sentry at ${fmtTime(se.fetchedAt, ctx.tz)}. ` : '', link(se.issuesUrl, 'Open Sentry')));
  return out;
}

function sectionHealth(ctx) {
  const env = ctx.live;
  const state = envState(env, ctx.tz, ctx.offline);
  const top = [];
  if (!env?.data) {
    top.push(stateNode(state));
  } else {
    top.push(stateNode(state));
    const hl = obj(env.data.health);
    // Same levels as the Problems chip (status.js), so the two never disagree.
    const v = healthVerdicts(hl);
    const share = (x) => (x.share === null ? '' : `, ${fmtPct(x.share)}`);
    top.push(tiles([
      tile({
        label: 'App errors, 24\u00a0h', value: fmtCompact(v.appErrors.events), level: v.appErrors.level,
        sub: v.appErrors.share === null
          ? 'no active devices'
          : `on ${fmtInt(v.appErrors.devices)} of ${plural(v.appErrors.active, 'device')}${share(v.appErrors)}`,
      }),
      tile({
        label: 'Failed saves, 24\u00a0h', value: fmtCompact(v.saveFailures.devices), level: v.saveFailures.level,
        sub: `${plural(v.saveFailures.devices, 'device')} of ${fmtInt(v.saveFailures.syncDevices)} syncing${share(v.saveFailures)}; ${plural(v.saveFailures.events, 'attempt')}`,
      }),
      tile({
        label: 'Save conflicts, 24\u00a0h', value: fmtCompact(v.saveConflicts.devices), level: v.saveConflicts.level,
        sub: 'another phone has newer progress; the player has not chosen yet',
      }),
      tile({ label: 'Puzzle generation failures', value: fmtCompact(v.generation.events), level: v.generation.level, sub: 'not sent by build 1.4.6, stays 0' }),
      tile({ label: 'Database size', value: fmtBytes(hl.databaseBytes), sub: 'whole Supabase database' }),
    ]));
    const sources = arr(hl.appErrorsBySource).map(obj);
    top.push(subhead('Errors by source'));
    if (sources.length) {
      top.push(table({
        label: 'App errors by source, last 24\u00a0h',
        columns: [{ label: 'Source' }, { label: 'Events', numeric: true }, { label: 'Devices', numeric: true }],
        rows: sources.map((r) => ({ cells: [h('code', null, rawLabel(r.source)), fmtInt(r.events), fmtInt(r.installs)] })),
      }));
    } else {
      top.push(h('p', 'empty', 'No app errors in the last 24\u00a0h.'));
    }
    const sync = arr(hl.cloudSync).map(obj);
    top.push(subhead('Cloud saves'));
    if (sync.length) {
      top.push(table({
        label: 'Cloud save results, last 24\u00a0h',
        columns: [{ label: 'Operation' }, { label: 'Result' }, { label: 'Events', numeric: true }, { label: 'Devices', numeric: true }],
        rows: sync.map((r) => {
          const flagged = ['conflict', 'unavailable', 'invalid', 'failed', 'recovery_required'].includes(r.result);
          // A shape and a word, never the stripe's colour alone.
          const op = flagged
            ? h('span', 'flag-cell', statusIcon('warn', 14), h('span', 'sr-only', 'Problem: '), syncOperationLabel(r.operation))
            : syncOperationLabel(r.operation);
          return {
            cls: flagged ? 'row-flag' : '',
            cells: [op, syncResultLabel(r.result), fmtInt(r.events), fmtInt(r.installs)],
          };
        }),
      }));
    } else {
      top.push(h('p', 'empty', 'No cloud saves in the last 24\u00a0h.'));
    }
    const pct = (x) => fmtPct(x);
    top.push(caption(`The phone logs one save result per upload attempt, so the tiles count devices. Flagged when at least ${THRESHOLDS.saveFailures.minDevices} devices and ${pct(THRESHOLDS.saveFailures.warnShare)} of syncing devices fail to save (${pct(THRESHOLDS.saveFailures.badShare)} is a problem), or ${pct(THRESHOLDS.appErrors.warnShare)} of active devices hit an app error (${pct(THRESHOLDS.appErrors.badShare)} is a problem). Server unavailable includes players who are offline.`));
  }
  return [h('div', 'block', top), h('div', 'block', sentryBlock(ctx))];
}

function sectionDaily(ctx) {
  const env = ctx.live;
  const state = envState(env, ctx.tz, ctx.offline);
  if (!env?.data) return [stateNode(state)];
  const dc = obj(env.data.dailyChallenge);
  const out = [stateNode(state)];
  const last = parseIso(dc.lastSubmissionAt);
  const dayBefore = addDays(dc.date, -1);
  out.push(tiles([
    tile({ label: `Entrants, ${fmtDay(dc.date)} Daily`, value: fmtCompact(dc.entrantsToday), sub: 'players so far' }),
    tile({ label: `Test devices, ${fmtDay(dc.date)} Daily`, value: fmtCompact(dc.testerEntrantsToday), sub: 'your own phones' }),
    tile({ label: `Entrants, ${fmtDay(dayBefore)} Daily`, value: fmtCompact(dc.entrantsYesterday), sub: 'players' }),
    tile({
      label: 'Last rank posted',
      valueNode: last === null ? 'none yet' : ageSpan(dc.lastSubmissionAt),
      sub: last === null ? 'nobody yet' : `at ${fmtTime(dc.lastSubmissionAt, ctx.tz)}`,
    }),
    tile({ label: 'Submissions, 24\u00a0h', value: fmtCompact(dc.submissions24h), sub: 'players and testers' }),
  ]));
  const boards = arr(dc.boardVersionsToday).map(obj);
  if (boards.length) {
    out.push(h('p', 'minihead', "Today's board versions"));
    out.push(h('ul', 'plain-list', boards.map((b) => h('li', null, h('code', null, rawLabel(b.boardVersion)), `: ${plural(b.entrants, 'entrant')}`))));
  }
  out.push(caption("Each player's Daily follows their own local date, so a player whose date is already ahead of yours (Asia, on your evening) counts under tomorrow's Daily and meanwhile only in Submissions, 24 h and Last rank posted. End-to-end check: finish today's Daily on your own phone and watch Last rank posted change within a minute or two. New players post a rank only from their fourth Daily, because the first three are eased and stay off the board, so real entrants start around day 4 after launch."));
  return out;
}

function sectionBuilds(ctx) {
  const env = ctx.live;
  const state = envState(env, ctx.tz, ctx.offline);
  if (!env?.data) return [stateNode(state)];
  const rows = arr(env.data.versions24h).map(obj);
  const out = [stateNode(state)];
  if (rows.length === 0) {
    out.push(h('p', 'empty', 'No activity in the last 24\u00a0h.'));
  } else {
    out.push(table({
      label: 'Activity by app version, last 24\u00a0h',
      columns: [{ label: 'App version', nowrap: true }, { label: 'Devices', numeric: true }, { label: 'Events', numeric: true }, { label: 'Errors', numeric: true }],
      rows: rows.map((r) => ({ cells: [rawLabel(r.appVersion), fmtInt(r.installs), fmtInt(r.events), fmtInt(r.appErrors)] })),
    }));
  }
  out.push(caption('Top 8 versions by devices in the last 24\u00a0h. An update pushed over the air keeps the same version number.'));
  return out;
}

function sectionLinks(ctx) {
  const env = ctx.external;
  const state = envState(env, ctx.tz, ctx.offline);
  if (!env?.data) return [stateNode(state)];
  const links = arr(env.data.links).map(obj);
  if (!links.length) return [h('p', 'empty', 'No links configured.')];
  return [h('ul', 'link-tiles', links.map((l) => h('li', 'link-tile',
    h('p', 'link-title', link(l.url, l.label || l.id || 'Link')),
    h('p', 'link-note', l.note || ''))))];
}

// ---------------------------------------------------------------------------
// Header, notices and status strip

function renderStatus(root, verdicts) {
  const labels = { data: 'Data', players: 'Players', problems: 'Problems' };
  root.replaceChildren(...verdicts.map((v) => {
    const chip = h('div', { class: `chip chip-${v.level}`, attrs: { role: 'group', 'aria-label': labels[v.id] } },
      h('div', 'chip-icon', statusIcon(v.level, 22)),
      h('div', 'chip-text',
        h('p', 'chip-kicker', labels[v.id]),
        h('p', 'chip-title', h('span', 'sr-only', `${LEVEL_WORD[v.level]}: `), v.title),
        v.detail ? h('p', 'chip-detail', v.detail) : null));
    // The first issue is already the chip title; the disclosure holds the rest.
    const rest = arr(v.issues).slice(1);
    if (rest.length) {
      chip.lastChild.append(h('details', { class: 'chip-more', data: { key: 'problems-list' } },
        h('summary', { data: { focusKey: 'problems-more' } }, v.more || `and ${rest.length} more`),
        h('ul', null, rest.map((i) => h('li', null, statusIcon(i.level, 14), h('span', 'sr-only', `${LEVEL_WORD[i.level]}: `),
          h('span', null, i.title, i.detail ? `. ${i.detail}` : ''))))));
    }
    return chip;
  }));
}

/**
 * Test devices first seen in the day before the launch time. Real pre-launch
 * testers were first seen days or weeks earlier, so a crowd here means the
 * launch time is set too late and players are hidden as testers.
 */
export const LAUNCH_SUSPECT_MIN = 5;

function noticeCodes(state) {
  const codes = new Set();
  for (const key of ['live', 'cohorts', 'progress', 'external']) {
    const env = state.env[key];
    for (const c of arr(env?.notices)) if (typeof c === 'string') codes.add(c);
    const data = env?.data;
    if (data && data.tzFallback === true) codes.add('tz_invalid');
    if (data && data.launchAtIgnored === true) codes.add('launch_at_invalid');
  }
  if ((num(state.env.live?.data?.testers?.recentBeforeLaunch) ?? 0) >= LAUNCH_SUSPECT_MIN) codes.add('launch_at_suspect');
  if (codes.has('launch_at_invalid')) codes.delete('launch_at_unset');
  if (state.schemaMismatch) codes.add('schema_mismatch');
  return [...codes];
}

function noticeText(code, state) {
  if (code === 'launch_at_suspect') {
    const live = state.env.live?.data;
    const n = num(live?.testers?.recentBeforeLaunch) ?? 0;
    return `${plural(n, 'test device')} first appeared in the 24 hours before the launch time (${fmtDayTime(live?.launchAt, live?.tz)}). If they are players, the launch time is set too late and they are hidden from every count. Fix it with bash deploy.sh --reconfigure.`;
  }
  return NOTICE_TEXT[code] || code;
}

const BAD_NOTICES = new Set(['db_not_configured', 'db_ca_missing', 'schema_mismatch']);

function renderNotices(root, state) {
  const codes = noticeCodes(state);
  if (!codes.length) {
    root.hidden = true;
    root.replaceChildren();
    return;
  }
  root.hidden = false;
  root.replaceChildren(h('ul', null, codes.map((c) => {
    const level = BAD_NOTICES.has(c) ? 'bad' : (c === 'demo_data' ? 'info' : 'warn');
    return h('li', `notice notice-${level}`, statusIcon(level, 16), h('span', 'sr-only', `${LEVEL_WORD[level]}: `),
      h('span', null, noticeText(c, state)));
  })));
}

function renderFresh(root, state) {
  const live = state.env.live;
  const parts = [];
  if (!live) {
    parts.push(h('span', null, state.offline ? 'Cannot reach the server, retrying' : 'Loading'));
  } else {
    const lastIso = live.data?.freshness?.lastEventReceivedAt;
    if (live.data) {
      parts.push(h('span', null, parseIso(lastIso) === null ? 'No events yet' : h('span', null, 'Last event ', ageSpan(lastIso))));
    } else {
      parts.push(h('span', null, 'No live data'));
    }
    if (live.fetchedAt) parts.push(h('span', null, 'Updated ', ageSpan(live.fetchedAt)));
    if (state.offline) parts.push(h('span', 'fresh-offline', state.offlineKind === 'server' ? 'Server error, retrying' : 'Offline, retrying'));
  }
  const out = [];
  parts.forEach((p, i) => {
    if (i) out.push(h('span', { class: 'sep', attrs: { 'aria-hidden': 'true' } }, ' · '));
    out.push(p);
  });
  root.replaceChildren(...out);
}

// ---------------------------------------------------------------------------
// Renderer with per-section change detection, so a refresh does not close an
// open disclosure, move focus or redraw a chart that has not changed.

const SECTIONS = [
  { id: 'sec-now', deps: ['live'], fn: sectionNow },
  { id: 'sec-today', deps: ['live'], fn: sectionToday },
  { id: 'sec-installs', deps: ['cohorts'], fn: sectionInstalls },
  { id: 'sec-funnel', deps: ['cohorts'], fn: sectionFunnel },
  { id: 'sec-retention', deps: ['cohorts'], fn: sectionRetention },
  { id: 'sec-story', deps: ['progress'], fn: sectionStory },
  { id: 'sec-money', deps: ['external', 'progress', 'live'], fn: sectionMoney },
  { id: 'sec-health', deps: ['live', 'external'], fn: sectionHealth },
  { id: 'sec-daily', deps: ['live'], fn: sectionDaily },
  { id: 'sec-builds', deps: ['live'], fn: sectionBuilds },
  { id: 'sec-links', deps: ['external'], fn: sectionLinks },
];

function signature(state, deps, tz) {
  const waiting = deps.some((k) => !state.env[k]);
  return JSON.stringify([tz, waiting && state.offline, ...deps.map((k) => {
    const env = state.env[k];
    if (!env) return null;
    return [env.fetchedAt, env.stale, env.error, env.data];
  })]);
}

function withPreservedState(container, build) {
  const open = new Set();
  container.querySelectorAll('details[data-key]').forEach((d) => { if (d.open) open.add(d.dataset.key); });
  const active = document.activeElement;
  const focusedKey = active && container.contains(active) ? active.closest('[data-focus-key]')?.dataset.focusKey : null;
  build();
  container.querySelectorAll('details[data-key]').forEach((d) => { if (open.has(d.dataset.key)) d.open = true; });
  if (focusedKey) container.querySelector(`[data-focus-key="${CSS.escape(focusedKey)}"]`)?.focus({ preventScroll: true });
}

function tzShortName(tz) {
  if (tz === 'UTC') return 'UTC';
  const tail = String(tz).split('/').pop() || tz;
  return tail.replace(/_/g, ' ');
}

export function createRenderer(doc) {
  const els = {
    fresh: doc.getElementById('fresh'),
    notices: doc.getElementById('notices'),
    status: doc.getElementById('status-chips'),
  };
  const sigs = new Map();
  let lastStatus = '';

  function renderStatusIfChanged(state, nowMs) {
    const verdicts = computeStatus({ ...state.env, offline: state.offline }, nowMs);
    const key = JSON.stringify(verdicts);
    if (key === lastStatus) return;
    lastStatus = key;
    withPreservedState(els.status, () => renderStatus(els.status, verdicts));
  }

  function update(state, nowMs) {
    const tz = state.env.live?.data?.tz || state.env.cohorts?.data?.tz || 'UTC';
    const ctx = { ...state.env, tz, tzShort: tzShortName(tz), offline: state.offline };
    renderFresh(els.fresh, state);
    renderNotices(els.notices, state);
    renderStatusIfChanged(state, nowMs);
    let redrew = false;
    for (const sec of SECTIONS) {
      const card = doc.getElementById(sec.id);
      if (!card) continue;
      const body = card.querySelector('.body');
      const sig = signature(state, sec.deps, tz);
      if (sigs.get(sec.id) === sig) continue;
      sigs.set(sec.id, sig);
      redrew = true;
      withPreservedState(body, () => {
        let nodes;
        try {
          nodes = sec.fn(ctx);
        } catch (err) {
          console.error(`render ${sec.id}`, err);
          nodes = [note('bad', 'This section could not be drawn. The rest of the page is fine.')];
        }
        body.replaceChildren(...nodes.flat().filter(Boolean));
        markFocusKeys(body, sec.id);
      });
    }
    // A redraw replaces the chart under an open tooltip; drop it rather than
    // leave it pointing at nothing.
    if (redrew) hideTip();
    tick(nowMs, state);
  }

  /** Refresh every "N ago" text in place, and the status strip. Called once a second. */
  function tick(nowMs, state) {
    if (state) renderStatusIfChanged(state, nowMs);
    doc.querySelectorAll('[data-age-from]').forEach((el) => {
      const t = parseIso(el.dataset.ageFrom);
      el.textContent = t === null ? (el.dataset.ageEmpty || '') : `${fmtAge(nowMs - t)}${el.dataset.ageSuffix || ''}`;
    });
  }

  return { update, tick, sectionNames: SECTION_NAMES };
}

function markFocusKeys(body, id) {
  body.querySelectorAll('.plot').forEach((el, i) => { el.dataset.focusKey = `${id}-${i}`; });
}
