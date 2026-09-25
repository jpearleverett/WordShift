/**
 * Page helpers for trailer2. Every helper reads the DOM or drives real input;
 * none edits the page. Several are ports of ../recordTrailer.mjs helpers
 * (that script runs its clips on import, so they are copied, not imported).
 */
import { expect, panHouse, finishStory, dismissIntros } from '../lib.mjs';
import { RetakeError } from './capture.mjs';

export const round = v => Math.round(v * 100) / 100;

// ---------------------------------------------------------------- board

export async function openBoard(page, { story = 'finish' } = {}) {
  await page.getByRole('button', { name: 'Play puzzle', exact: true }).click({ force: true });
  await page.waitForTimeout(1500);
  if (story === 'finish') await finishStory(page);
  else {
    const later = page.getByRole('button', { name: 'Come back to this', exact: true });
    if (await later.waitFor({ state: 'visible', timeout: 2500 }).then(() => true).catch(() => false)) { await later.click(); await page.waitForTimeout(500); }
  }
  await dismissIntros(page);
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('puzzle-row-0')).toBeVisible();
  await page.waitForTimeout(800);
}
export async function savedBoard(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || 'null'));
}
export async function boardWords(page) {
  const b = await savedBoard(page);
  return b ? b.rows.map(r => r.words.map(l => l.char).join('')) : null;
}

/** Locators for step k of the saved board's stored solution (port of solutionStep). */
export async function solutionStep(page, k = 0) {
  const board = await savedBoard(page);
  const rows = board.rows.map(r => r.words.map(l => ({ ...l })));
  const opening = board.rows.map(r => r.originalWord).join(',') === 'PLAY,PANT,HEAR';
  for (let n = 0; n <= k; n++) {
    const step = board.solution[n];
    const src = rows[step.stepIndex];
    const removal = step.removalPosition ?? src.findIndex(l => l.char === step.letterToMove && !l.isLocked);
    const dup = src.slice(0, removal).filter(l => l.char === step.letterToMove && !l.isLocked).length;
    const insertion = step.insertionPosition ?? (opening ? [1, 4][step.stepIndex] : undefined);
    const dst = rows[step.stepIndex + 1];
    const [moved] = src.splice(removal, 1);
    dst.splice(insertion, 0, { ...moved, isLocked: true });
    if (n === k) {
      const formed = dst.map(v => v.char).join('');
      const left = src.map(v => v.char).join('');
      return {
        step, formed, left, char: step.letterToMove, from: step.stepIndex, to: step.stepIndex + 1,
        letter: page.getByTestId(`puzzle-row-${step.stepIndex}`).getByRole('button', { name: `Letter ${step.letterToMove}`, exact: true }).nth(dup),
        slot: page.getByTestId(`puzzle-row-${step.stepIndex + 1}`).getByRole('button', { name: new RegExp(`^(?:Guided drop zone|Drop zone) ${insertion + 1} of \\d+, (?:forms ${formed}, valid word|would form ${formed})$`) }),
      };
    }
  }
  return null;
}

/**
 * Per-frame board geometry (CSS px): for each row, the row box, every letter
 * tile box (the floating drag copy included), every preview label box, and
 * the move-message pill. Used to band the board so that preview labels (the
 * red-cross non-words and ghost words) and pills never enter a used crop.
 */
export async function boardProbe(page) {
  return page.evaluate(() => {
    const box = el => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 }; };
    const rows = [];
    for (let k = 0; k < 8; k++) {
      const row = document.querySelector(`[data-testid="puzzle-row-${k}"]`);
      if (!row) break;
      const tiles = [], labels = [];
      for (const el of row.querySelectorAll('[aria-label^="Letter "]')) { const b = box(el); if (b.w > 0) tiles.push({ ch: el.getAttribute('aria-label').slice(7), ...b }); }
      for (const el of row.querySelectorAll('div, span')) {
        if (el.children.length) continue;
        const t = (el.textContent || '').trim();
        if (/^(?:[✓✗]\s*)?[A-Z]{2,}$/.test(t) && !/^(PICK|DROP)$/.test(t)) { const b = box(el); if (b.w > 0) labels.push({ t, ...b }); }
      }
      rows.push({ k, row: box(row), tiles, labels });
    }
    const pills = [...document.querySelectorAll('div')].filter(d => d.children.length === 0 && (d.textContent || '').trim().length > 3)
      .map(d => ({ t: d.textContent.trim().slice(0, 60), ...box(d) })).filter(p => p.y > 170 && p.y < 260);
    return { rows, pills };
  });
}

export const EFFECTIVE_OPACITY = `(el) => { let op = 1, a = el; while (a && a !== document.body) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; op *= parseFloat(cs.opacity || '1'); a = a.parentElement; } return op; }`;

/** Victory card probe: card opacity, star widths, title, and the card/stars/title/ribbon boxes. */
export async function victoryProbe(page) {
  return page.evaluate(src => {
    const eff = eval(src);
    const bx = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
    const next = document.querySelector('[aria-label="Next level"]');
    const stars = document.querySelector('[aria-label$=" of 3 stars"]');
    const starW = stars ? [...stars.querySelectorAll('img')].map(i => Math.round(i.getBoundingClientRect().width)) : [];
    const titleEl = stars ? stars.nextElementSibling : null;
    const ribbon = [...document.querySelectorAll('div')].find(d => d.children.length === 0 && /^FLAWLESS/.test((d.textContent || '').trim()));
    const results = document.querySelector('[aria-label="Results"]');
    let card = 0;
    if (next) { const r = next.getBoundingClientRect(); card = r.width > 0 ? eff(next) : 0; }
    return { card: Math.round(card * 100) / 100, starW, starsOpacity: stars ? Math.round(eff(stars) * 100) / 100 : 0,
      title: titleEl?.textContent?.trim() || null, titleOpacity: titleEl ? Math.round(eff(titleEl) * 100) / 100 : 0,
      boxes: { results: bx(results), stars: bx(stars), title: bx(titleEl), ribbon: bx(ribbon), next: bx(next) } };
  }, EFFECTIVE_OPACITY);
}
/** Star-pop and PERFECT! events from victory probes. */
export function victoryEvents(probes) {
  const out = [];
  const frames = Object.keys(probes).map(Number).sort((a, b) => a - b).filter(f => probes[f]?.victory);
  const v = f => probes[f].victory;
  const maxW = Math.max(0, ...frames.flatMap(f => v(f).starW || []));
  for (let s = 0; s < 3; s++) {
    const f = frames.find(fr => (v(fr).starW?.[s] ?? 0) >= maxW * 0.35 && v(fr).starsOpacity > 0.3);
    if (f !== undefined) out.push({ frame: f, action: `star ${s + 1} pops in`, sfx: `star_pop_${s + 1}.wav` });
  }
  const t = frames.find(fr => v(fr).title && /PERFECT/.test(v(fr).title) && v(fr).titleOpacity > 0.5);
  if (t !== undefined) out.push({ frame: t, action: 'PERFECT! title', sfx: 'perfect.wav' });
  return out;
}

/** True when an achievement toast or a milestone banner is on screen. */
export async function toastVisible(page) {
  return page.evaluate(src => {
    const eff = eval(src);
    for (const el of document.querySelectorAll('div, span')) {
      if (el.children.length) continue;
      const t = (el.textContent || '').trim().toUpperCase();
      if (/ACHIEVEMENT UNLOCKED|MILESTONE/.test(t)) { const r = el.getBoundingClientRect(); if (r.width > 0 && eff(el) > 0.02) return t; }
    }
    return null;
  }, EFFECTIVE_OPACITY);
}

/**
 * A drag recorded one step per frame, on an eased path from the centre of
 * `from` to the centre of `to`. The target is re-read at `reaimAt` (once the
 * fan has opened and the drop zones have moved). Returns an actions map.
 */
export function dragMove(page, { start, end, from, to, approx = null, label, sfxDown = 'letter_select.wav', sfxUp = 'valid_move.wav' }) {
  const acts = {};
  let p0 = null, p1 = null, exact = false;
  const centre = async (loc, timeout) => { const b = await loc.boundingBox({ timeout }).catch(() => null); return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2 } : null; };
  const ease = k => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
  // The drop zone only exists once the letter is lifted (the fan opens), so
  // the path aims at the target row until the zone can be measured; the
  // correction lands while the eased path has barely moved.
  const aim = async () => {
    if (exact) return;
    const c = await centre(to, 60);
    if (c) { p1 = c; exact = true; }
  };
  acts[start] = async () => {
    p0 = await centre(from, 5000);
    if (!p0) throw new RetakeError(`${label}: letter not visible`);
    p1 = (approx ? await centre(approx, 5000) : null) ?? { x: p0.x, y: p0.y + 130 };
    await page.mouse.move(p0.x, p0.y); await page.mouse.down();
    return { action: `${label}: press on the letter`, sfx: sfxDown };
  };
  for (let f = start + 1; f < end; f++) {
    acts[f] = async () => {
      await aim();
      const k = ease((f - start) / (end - start));
      await page.mouse.move(p0.x + (p1.x - p0.x) * k, p0.y + (p1.y - p0.y) * k);
    };
  }
  acts[end] = async () => {
    await aim();
    if (!exact) throw new RetakeError(`${label}: the drop zone never appeared`);
    await page.mouse.move(p1.x, p1.y); await page.mouse.up();
    return { action: `${label}: release into the drop zone`, sfx: sfxUp };
  };
  return acts;
}

// ---------------------------------------------------------------- house

export async function roomBox(page, roomName) {
  return page.evaluate(name => {
    const el = [...document.querySelectorAll('div')].find(d => d.children.length === 0 && d.textContent?.trim().toUpperCase() === name.toUpperCase());
    if (!el) return null;
    // the room is the ~250-wide ancestor of its plaque
    let a = el;
    while (a.parentElement) { a = a.parentElement; const r = a.getBoundingClientRect(); if (r.width >= 240 && r.width <= 262 && r.height >= 110) return { x: r.x, y: r.y, w: r.width, h: r.height, plaqueY: el.getBoundingClientRect().y }; }
    const r = el.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, plaqueY: r.y };
  }, roomName);
}
const PAN_SLOP = 10;
const panTravel = d => { const a = Math.abs(d); const k = Math.floor((PAN_SLOP * 20) / a) + 1; return k > 20 ? 0 : Math.sign(d) * a * (1 - k / 20); };
export async function dragHouseBy(page, move, y0 = 460) {
  if (Math.abs(move) < 0.3) return;
  const height = page.viewportSize().height;
  let d = move + Math.sign(move) * PAN_SLOP;
  for (let a = 10.5; a < 280; a += 0.05) {
    if (Math.abs(panTravel(Math.sign(move) * a) - move) < Math.abs(panTravel(d) - move)) d = Math.sign(move) * a;
  }
  const start = d < 0 ? Math.min(height - 70, Math.max(y0, 300 - d)) : Math.max(180, Math.min(y0, height - 70 - d));
  await panHouse(page, d, 8, start);
}
export async function panUntil(page, measure, target, tol = 2, y0 = 460) {
  for (let i = 0; i < 16; i++) {
    const v = await measure();
    if (v === null) throw new Error('panUntil: nothing to measure');
    const d = target - v;
    if (Math.abs(d) <= tol) return v;
    await dragHouseBy(page, Math.max(-240, Math.min(240, d)), y0);
  }
  const v = await measure();
  if (Math.abs(target - v) > tol) throw new Error(`panUntil: settled at ${v}, wanted ${target}`);
  return v;
}
export async function bottomClamp(page) {
  for (let i = 0; i < 6; i++) await panHouse(page, -300, 8, 460);
}

/** Home chrome boxes: the Next sign, the ambient goal line under it, the PLAY dock, the header. */
export async function homeChrome(page) {
  return page.evaluate(src => {
    const eff = eval(src);
    const bx = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 }; };
    const next = document.querySelector('[data-testid="next-unlock-progress"]');
    const nb = next ? next.getBoundingClientRect() : null;
    const ambient = [];
    if (nb) for (const el of document.querySelectorAll('div, span')) {
      if (el.children.length) continue;
      const t = (el.textContent || '').trim(); if (!t) continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.top >= nb.bottom - 1 && r.top <= nb.bottom + 60) ambient.push({ t: t.slice(0, 60), op: Math.round(eff(el) * 100) / 100, ...bx(el) });
    }
    const dock = document.querySelector('[aria-label="Play puzzle"]');
    return { next: bx(next), ambient, dock: bx(dock) };
  }, EFFECTIVE_OPACITY);
}

/** Resident buttons with their news-badge state (the name carries it). */
export async function residents(page) {
  return page.evaluate(() => [...document.querySelectorAll('[aria-label]')]
    .map(e => e.getAttribute('aria-label'))
    .filter(l => / the [a-z ]+(,|$)/.test(l) && /^[A-Z][a-z]+ the /.test(l)));
}

/** Resident emote puffs over a room or name plaque (port of emoteClashes). */
export async function emoteClashes(page) {
  return page.evaluate(() => {
    const vis = el => { let op = 1, a = el; while (a && a !== document.body) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; op *= parseFloat(cs.opacity || '1'); a = a.parentElement; } return op; };
    const puffs = [...document.querySelectorAll('img')].filter(i => /emote_/.test(i.getAttribute('src') || '') && vis(i.parentElement) > 0.05).map(i => i.parentElement.getBoundingClientRect());
    if (!puffs.length) return [];
    const plaques = [...document.querySelectorAll('div')].filter(d => d.children.length === 0 && /^[A-Z][A-Z' ]{2,}$/.test(d.textContent?.trim() || '')).map(d => {
      let r = d.getBoundingClientRect(), a = d;
      for (let k = 0; k < 3 && a.parentElement; k++) { a = a.parentElement; const rr = a.getBoundingClientRect(); if (rr.height < 45 && rr.width < 320) r = rr; else break; }
      return { text: d.textContent.trim(), r };
    }).filter(p => p.r.bottom > 0 && p.r.top < window.innerHeight && p.r.right > 0 && p.r.left < window.innerWidth);
    let sheetTop = Infinity;
    const bubble = document.querySelector('[data-testid="resident-dialogue-bubble"]');
    for (let a = bubble; a && a.parentElement; ) {
      a = a.parentElement; const r = a.getBoundingClientRect();
      if (r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1) break;
      if (r.bottom >= window.innerHeight - 2 && r.width >= window.innerWidth * 0.9) sheetTop = r.top;
    }
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    return plaques.filter(p => p.r.top < sheetTop - 2 && puffs.some(q => hit(p.r, q))).map(p => p.text);
  });
}

// ---------------------------------------------------------------- dialogue

/**
 * The open dialogue or intro sheet: its sentence blocks (DialogueBody renders
 * one sentence per block) with their boxes and font size, the bubble box, the
 * portrait box, and the full bubble text.
 */
export async function dialogueBlocks(page, sentences = null) {
  return page.evaluate(sentences => {
    const bx = el => { const b = el.getBoundingClientRect(); return { x: Math.round(b.x * 10) / 10, y: Math.round(b.y * 10) / 10, w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10 }; };
    const bubble = document.querySelector('[data-testid="resident-dialogue-bubble"]');
    const blocks = [];
    const scope = bubble || document;
    for (const el of scope.querySelectorAll('div, span')) {
      if (el.children.length) continue;
      const t = (el.textContent || '').trim(); if (!t) continue;
      // Without a bubble test id (the intro sheet), only leaves that are a
      // prefix of an expected sentence count as dialogue blocks.
      if (!bubble && !(sentences || []).some(s => s.startsWith(t) && t.length >= 2)) continue;
      const r = el.getBoundingClientRect(); if (r.width <= 0) continue;
      blocks.push({ text: t, fontPx: parseFloat(getComputedStyle(el).fontSize), ...bx(el) });
    }
    if (!blocks.length) return null;
    return { bubble: bubble ? bx(bubble) : null, blocks, text: blocks.map(b => b.text).join(' ') };
  }, sentences);
}
