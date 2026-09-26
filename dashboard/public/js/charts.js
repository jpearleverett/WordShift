// Hand-rolled SVG charts plus the shared tooltip. No libraries.
// Marks follow one spec: 2px lines, a 10% area wash, bars at most 24px wide
// with a 4px rounded data end, hairline solid grid. One series each, in the
// accent; an unfinished bucket is marked by shape (hollow ring, pale wash)
// plus words, never by a second hue.

import { h, s } from './dom.js';
import { fmtInt, niceCeil, num } from './format.js';

// ---------------------------------------------------------------------------
// Tooltip: one element for the whole page, positioned next to the mark.

let tipEl = null;
let tipOwner = null;

export function initTooltip(el) {
  tipEl = el;
  const hide = (event) => {
    if (!tipOwner) return;
    if (event && event.target instanceof Node && tipOwner.contains(event.target)) return;
    hideTip();
  };
  document.addEventListener('pointerdown', hide, { passive: true });
  window.addEventListener('scroll', () => hideTip(), { passive: true });
  window.addEventListener('resize', () => hideTip(), { passive: true });
}

/**
 * rows: [{ value: '82 events', label: '18:21', key: 'accent'|'partial'|null }]
 * (x, y) is the anchor in viewport coordinates.
 */
export function showTip(owner, rows, x, y) {
  if (!tipEl) return;
  tipOwner = owner;
  tipEl.replaceChildren(...rows.map((row) => {
    const line = h('div', 'tip-row');
    if (row.key) line.append(h('span', `tip-key tip-key-${row.key}`));
    line.append(h('strong', 'tip-value', row.value));
    if (row.label) line.append(h('span', 'tip-label', row.label));
    return line;
  }));
  tipEl.hidden = false;
  const rect = tipEl.getBoundingClientRect();
  const pad = 8;
  let left = x - rect.width / 2;
  left = Math.max(pad, Math.min(left, window.innerWidth - rect.width - pad));
  let top = y - rect.height - 12;
  if (top < pad) top = y + 16;
  tipEl.style.left = `${Math.round(left)}px`;
  tipEl.style.top = `${Math.round(top)}px`;
}

export function hideTip() {
  if (!tipEl) return;
  tipEl.hidden = true;
  tipOwner = null;
}

// ---------------------------------------------------------------------------
// Resize handling: each chart redraws itself when its host changes width.

const observers = new Map();

function watchWidth(id, host, draw) {
  const old = observers.get(id);
  if (old) old.disconnect();
  let lastWidth = 0;
  let timer = 0;
  const run = () => {
    const width = Math.floor(host.clientWidth);
    if (width > 0 && width !== lastWidth) {
      lastWidth = width;
      draw(width);
    }
  };
  if (typeof ResizeObserver === 'function') {
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(run, 120);
    });
    ro.observe(host);
    observers.set(id, ro);
  }
  // First draw once the host is in the document and has a width.
  requestAnimationFrame(run);
}

// ---------------------------------------------------------------------------
// Shared axis pieces.

function yTicks(max) {
  const top = niceCeil(max);
  const ticks = [0, top];
  if (Number.isInteger(top / 2) && top >= 4) ticks.splice(1, 0, top / 2);
  return { top, ticks };
}

function gridLayer(ticks, yOf, left, right) {
  const g = s('g', { class: 'grid', 'aria-hidden': 'true' });
  for (const t of ticks) {
    const y = Math.round(yOf(t)) + 0.5;
    g.append(s('line', { class: t === 0 ? 'axis-line' : 'grid-line', x1: left, x2: right, y1: y, y2: y }));
    g.append(s('text', { class: 'tick', x: left - 6, y: y + 4, 'text-anchor': 'end' }, fmtInt(t)));
  }
  return g;
}

/** Keyboard support: arrow keys step through points, Escape hides. */
function keyboardCursor(plot, count, show, clear, initial) {
  let index = -1;
  plot.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (index < 0) index = initial();
      else if (event.key === 'ArrowRight') index = Math.min(count() - 1, index + 1);
      else if (event.key === 'ArrowLeft') index = Math.max(0, index - 1);
      else if (event.key === 'Home') index = 0;
      else index = count() - 1;
      show(index, true);
    } else if (event.key === 'Escape') {
      index = -1;
      clear();
    }
  });
  plot.addEventListener('focus', () => {
    // Only keyboard focus opens the readout; a tap focuses too, and its own
    // pointer handler has already shown the point under the finger.
    if (!plot.matches(':focus-visible')) return;
    index = initial();
    show(index, true);
  });
  plot.addEventListener('blur', () => {
    index = -1;
    clear();
  });
}

function announce(live, rows) {
  if (!live) return;
  live.textContent = rows.map((r) => [r.label, r.value].filter(Boolean).join(': ')).join('. ');
}

// ---------------------------------------------------------------------------
// Area chart: one series over evenly spaced points. The last point can be a
// partial bucket: the line stops at the last full point and the partial one is
// a hollow ring with no connecting segment, so a half-filled minute never
// reads as traffic falling off a cliff.

/**
 * opts: {
 *   id, values: number[], ariaLabel, partialLast: boolean,
 *   pointLabel(i) -> string, valueText(v, i) -> string, xStartLabel, xEndLabel
 * }
 */
export function areaChart(opts) {
  const plot = h('div', { class: 'plot', attrs: { tabindex: '0', role: 'group', 'aria-label': `${opts.ariaLabel}. Use the arrow keys to read each point.` } });
  const live = h('p', { class: 'sr-only', attrs: { 'aria-live': 'polite' } });
  const values = opts.values.map((v) => num(v) ?? 0);
  const n = values.length;
  let geometry = null;

  const draw = (width) => {
    const height = 176;
    const left = 40;
    const right = width - 14;
    const top = 12;
    const bottom = height - 26;
    const { top: yMax, ticks } = yTicks(Math.max(1, ...values));
    const xOf = (i) => (n <= 1 ? left : left + (i * (right - left)) / (n - 1));
    const yOf = (v) => bottom - (v / yMax) * (bottom - top);
    geometry = { xOf, yOf, left, right, top, bottom };

    const svgEl = s('svg', { width, height, viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': opts.ariaLabel });
    svgEl.append(gridLayer(ticks, yOf, left, right));

    const full = opts.partialLast && n > 1 ? n - 1 : n;
    if (full >= 1) {
      let line = '';
      for (let i = 0; i < full; i += 1) line += `${i ? 'L' : 'M'}${xOf(i).toFixed(1)},${yOf(values[i]).toFixed(1)}`;
      const area = `${line}L${xOf(full - 1).toFixed(1)},${bottom}L${xOf(0).toFixed(1)},${bottom}Z`;
      svgEl.append(s('path', { class: 'area-wash', d: area }));
      svgEl.append(s('path', { class: 'line-accent', d: line }));
    }
    if (full >= 1) {
      svgEl.append(s('circle', { class: 'dot-accent', cx: xOf(full - 1), cy: yOf(values[full - 1]), r: 4 }));
    }
    if (opts.partialLast && n > 1) {
      svgEl.append(s('circle', { class: 'dot-partial', cx: xOf(n - 1), cy: yOf(values[n - 1]), r: 4 }));
    }

    // x labels: start and end only.
    svgEl.append(s('text', { class: 'tick', x: left, y: height - 8, 'text-anchor': 'start' }, opts.xStartLabel || ''));
    svgEl.append(s('text', { class: 'tick', x: right, y: height - 8, 'text-anchor': 'end' }, opts.xEndLabel || ''));

    const cursor = s('g', { class: 'cursor', visibility: 'hidden', 'aria-hidden': 'true' },
      s('line', { class: 'crosshair', x1: 0, x2: 0, y1: top, y2: bottom }),
      s('circle', { class: 'dot-hover', cx: 0, cy: 0, r: 5 }));
    svgEl.append(cursor);

    const hit = s('rect', { class: 'hit', x: left - 8, y: 0, width: right - left + 16, height, fill: 'transparent' });
    svgEl.append(hit);

    const showAt = (i, fromKeyboard) => {
      const x = xOf(i);
      const y = yOf(values[i]);
      cursor.setAttribute('visibility', 'visible');
      cursor.firstChild.setAttribute('x1', x);
      cursor.firstChild.setAttribute('x2', x);
      cursor.lastChild.setAttribute('cx', x);
      cursor.lastChild.setAttribute('cy', y);
      cursor.lastChild.setAttribute('class', opts.partialLast && i === n - 1 ? 'dot-hover dot-hover-partial' : 'dot-hover');
      const rows = [{
        value: opts.valueText(values[i], i),
        label: opts.pointLabel(i),
        key: opts.partialLast && i === n - 1 ? 'partial' : 'accent',
      }];
      const box = svgEl.getBoundingClientRect();
      showTip(plot, rows, box.left + x, box.top + y);
      if (fromKeyboard) announce(live, rows);
    };
    const clear = () => {
      cursor.setAttribute('visibility', 'hidden');
      hideTip();
    };
    const indexAt = (clientX) => {
      const box = svgEl.getBoundingClientRect();
      const rel = clientX - box.left;
      const i = n <= 1 ? 0 : Math.round(((rel - left) / (right - left)) * (n - 1));
      return Math.max(0, Math.min(n - 1, i));
    };
    hit.addEventListener('pointermove', (e) => showAt(indexAt(e.clientX)));
    hit.addEventListener('pointerdown', (e) => showAt(indexAt(e.clientX)));
    hit.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') clear(); });
    plot.replaceChildren(svgEl);
    plot._showAt = showAt;
    plot._clear = clear;
  };

  keyboardCursor(plot, () => n,
    (i, kb) => plot._showAt && plot._showAt(i, kb),
    () => plot._clear && plot._clear(),
    () => Math.max(0, (opts.partialLast ? n - 2 : n - 1)));

  const wrap = h('div', 'chart', plot, live);
  watchWidth(opts.id, plot, draw);
  return wrap;
}

// ---------------------------------------------------------------------------
// Columns: one series in the accent. Anything that belongs beside a column
// (other new devices, active devices) rides the tooltip and the table view,
// never a second colour. The last column can be a partial bucket (today so
// far): drawn as a pale wash of the accent, labelled in the axis and tooltip.

function columnPath(x, y, w, hgt, r) {
  const rr = Math.max(0, Math.min(r, w / 2, hgt));
  if (hgt <= 0) return '';
  return `M${x},${y + hgt}V${y + rr}A${rr},${rr} 0 0 1 ${x + rr},${y}H${x + w - rr}A${rr},${rr} 0 0 1 ${x + w},${y + rr}V${y + hgt}Z`;
}

/**
 * opts: {
 *   id, ariaLabel, valueLabel, partialLast: boolean,
 *   items: [{ value, xLabel, tipLabel, extra?: [{ value, label }] }]
 * }
 */
export function columnChart(opts) {
  const plot = h('div', { class: 'plot', attrs: { tabindex: '0', role: 'group', 'aria-label': `${opts.ariaLabel}. Use the arrow keys to read each day.` } });
  const live = h('p', { class: 'sr-only', attrs: { 'aria-live': 'polite' } });
  const items = opts.items.map((it) => ({ ...it, value: num(it.value) ?? 0 }));
  const n = items.length;
  const isPartial = (i) => Boolean(opts.partialLast) && i === n - 1;

  const draw = (width) => {
    const height = 200;
    const left = 40;
    const right = width - 10;
    const top = 22;
    const bottom = height - 26;
    const max = Math.max(1, ...items.map((it) => it.value));
    const { top: yMax, ticks } = yTicks(max);
    const yOf = (v) => bottom - (v / yMax) * (bottom - top);
    const slot = (right - left) / Math.max(1, n);
    const barW = Math.max(2, Math.min(24, slot - 4));
    const xOf = (i) => left + i * slot + (slot - barW) / 2;

    const svgEl = s('svg', { width, height, viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': opts.ariaLabel });
    svgEl.append(gridLayer(ticks, yOf, left, right));
    const bars = s('g', { class: 'bars' });
    svgEl.append(bars);
    const barGroups = [];

    const maxIndex = items.reduce((best, it, i) => (it.value > items[best].value ? i : best), 0);
    const labelEvery = n <= 10 && slot >= 26;

    items.forEach((it, i) => {
      const x = xOf(i);
      const g = s('g', { class: 'bar' });
      if (it.value > 0) {
        g.append(s('path', { class: isPartial(i) ? 'fill-partial' : 'fill-accent', d: columnPath(x, yOf(it.value), barW, bottom - yOf(it.value), 4) }));
      }
      bars.append(g);
      barGroups.push(g);
      if (labelEvery || i === maxIndex || i === n - 1) {
        // The label sits on the cap of the very column it counts.
        g.append(s('text', { class: 'bar-value', x: x + barW / 2, y: yOf(it.value) - 6, 'text-anchor': 'middle' }, fmtInt(it.value)));
      }
    });

    // x labels: first, middle (7+ days) and last, never colliding.
    const picks = new Set([0, n - 1]);
    if (n >= 7) picks.add(Math.floor((n - 1) / 2));
    for (const i of [...picks].sort((p, q) => p - q)) {
      if (i < 0 || i >= n) continue;
      const cx = xOf(i) + barW / 2;
      const anchor = n === 1 ? 'middle' : (i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle'));
      const tx = anchor === 'start' ? Math.max(left, xOf(i)) : (anchor === 'end' ? Math.min(right, xOf(i) + barW) : cx);
      svgEl.append(s('text', { class: 'tick', x: tx, y: height - 8, 'text-anchor': anchor }, items[i].xLabel || ''));
    }

    const hit = s('rect', { class: 'hit', x: left, y: 0, width: right - left, height, fill: 'transparent' });
    svgEl.append(hit);

    let hovered = -1;
    const showAt = (i, fromKeyboard) => {
      if (hovered >= 0 && barGroups[hovered]) barGroups[hovered].classList.remove('is-hover');
      hovered = i;
      barGroups[i].classList.add('is-hover');
      const it = items[i];
      const rows = [
        { value: fmtInt(it.value), label: opts.valueLabel, key: isPartial(i) ? 'partial' : 'accent' },
        ...(it.extra || []).map((x) => ({ value: x.value, label: x.label, key: null })),
      ];
      const box = svgEl.getBoundingClientRect();
      const tipRows = [{ value: it.tipLabel || it.xLabel || '', label: '', key: null }, ...rows];
      showTip(plot, tipRows, box.left + xOf(i) + barW / 2, box.top + yOf(it.value));
      if (fromKeyboard) announce(live, tipRows);
    };
    const clear = () => {
      if (hovered >= 0 && barGroups[hovered]) barGroups[hovered].classList.remove('is-hover');
      hovered = -1;
      hideTip();
    };
    const indexAt = (clientX) => {
      const box = svgEl.getBoundingClientRect();
      const i = Math.floor((clientX - box.left - left) / slot);
      return Math.max(0, Math.min(n - 1, i));
    };
    hit.addEventListener('pointermove', (e) => showAt(indexAt(e.clientX)));
    hit.addEventListener('pointerdown', (e) => showAt(indexAt(e.clientX)));
    hit.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') clear(); });
    plot.replaceChildren(svgEl);
    plot._showAt = showAt;
    plot._clear = clear;
  };

  keyboardCursor(plot, () => n,
    (i, kb) => plot._showAt && plot._showAt(i, kb),
    () => plot._clear && plot._clear(),
    () => Math.max(0, n - 1));

  const wrap = h('div', 'chart', plot, live);
  watchWidth(opts.id, plot, draw);
  return wrap;
}

// ---------------------------------------------------------------------------
// Horizontal bar list in plain HTML: label and value printed on every row, so
// no tooltip is needed and nothing is gated behind hover.

/**
 * rows: [{ label, value, valueText, note?, tag?, tagLevel? }], max: number
 */
export function barList(rows, max, { ordered = false, labelledBy } = {}) {
  const list = h(ordered ? 'ol' : 'ul', { class: 'bars', attrs: labelledBy ? { 'aria-labelledby': labelledBy } : null });
  const top = Math.max(1, num(max) ?? 0);
  for (const row of rows) {
    const value = num(row.value) ?? 0;
    const fill = h('span', 'bar-fill');
    const pct = Math.max(0, Math.min(1, value / top));
    fill.style.width = value > 0 ? `max(3px, ${(pct * 100).toFixed(2)}%)` : '0';
    const head = h('div', 'bar-head',
      h('span', 'bar-label', row.label),
      h('span', 'bar-num', row.valueText));
    const item = h('li', row.tag ? 'bar-row is-flagged' : 'bar-row', head, h('div', { class: 'bar-track', attrs: { 'aria-hidden': 'true' } }, fill));
    if (row.note || row.tag) {
      const meta = h('div', 'bar-meta');
      if (row.tag) meta.append(h('span', `tag tag-${row.tagLevel || 'info'}`, row.tag));
      if (row.note) meta.append(h('span', 'bar-note', row.note));
      item.append(meta);
    }
    list.append(item);
  }
  return list;
}
