/**
 * Source captures for the refresh-2026-09 Play listing
 * (assets/Play_store/refresh-2026-09/brief.md, sections 2 to 4).
 *
 * Run the app on http://localhost:8081 (this script never starts or stops it), then:
 *
 *   node scripts/store/captureRefresh.mjs            # every job
 *   node scripts/store/captureRefresh.mjs s01 t2     # only these jobs
 *
 * Discipline, same as captureLaunch.mjs:
 *   - genuine renders of the current Expo web build in Chromium;
 *   - progression is seeded through localStorage only (states A to J in
 *     refresh/states.mjs), and everything visible is reached through real UI
 *     input (clicks, taps, drags);
 *   - the DOM is never edited, hidden, restyled or re-layered, and nothing
 *     is cropped or resampled here: raw/ holds full-frame screenshots;
 *   - every non-local request is aborted, so seeded saves and analytics never
 *     reach live services.
 *
 * The crop windows the brief asks for are MEASURED here with
 * locator.boundingBox() and written to raw/provenance.json (CSS pixels and
 * device pixels), so the typesetting step can cut exactly those rectangles
 * without re-deriving any geometry.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  expect, launch, settle, panHouse, playSolution, finishStory, dismissIntros, gitHead, srcClean, sha256,
  bodyText, screenText,
} from './refresh/lib.mjs';
import { stageState, stateSeed } from './refresh/states.mjs';

const sharp = createRequire(import.meta.url)('sharp');
const mobile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CAMPAIGN = path.join(mobile, 'assets/Play_store/refresh-2026-09');
const RAW = path.join(CAMPAIGN, 'raw');
await mkdir(RAW, { recursive: true });

const HEAD = gitHead();
const SRC_CLEAN = srcClean();
const PROVENANCE = path.join(RAW, 'provenance.json');
const previous = JSON.parse(await readFile(PROVENANCE, 'utf8').catch(() => '{}'));
const captures = previous.captures ?? [];
/** Real words that would read awkwardly in a store image; a pit layout showing one is retaken. */
const AWKWARD = ['BOSOM', 'BUST', 'BUSTS', 'NUDE', 'SEXY', 'BRA', 'BRAS', 'BUTT', 'TIPSY', 'DRUNK', 'BOOZE'];
/** Files (re)captured by this run; everything else in provenance.json is carried over untouched. */
const touched = new Set();
/** Words that must never appear on a captured board or floating in the pit (brief 10.13). */
const GRIM = ['SLAY', 'SLAYS', 'SLAYED', 'SLAIN', 'KILL', 'KILLS', 'KILLED', 'DEAD', 'DEATH', 'DIE', 'DIED', 'DIES', 'GRAVE', 'GRAVES', 'TOMB', 'TOMBS',
  'DOOM', 'GORE', 'BLOOD', 'MURDER', 'CORPSE', 'STAB', 'STABS', 'WOUND', 'MAIM', 'SHOOT', 'SHOT', 'GUN', 'BOMB', 'HANG', 'HANGS', 'HANGED', 'RAPE', 'SLAUGHTER', 'VOID', 'OMEN', 'WRAITH', 'CURSE', 'BONE', 'BONES', 'SKULL',
  'RABID', 'HATE', 'HATED', 'RAGE', 'WAR', 'WARS', 'PAIN', 'TORTURE', 'ROT', 'ROTS', 'ROTTEN', 'POISON'];

const round = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;
const box = b => b && { x: round(b.x), y: round(b.y), width: round(b.width), height: round(b.height) };
/** A window in CSS px plus the same rectangle in device px at `dpr`. */
function windowRect(css, dpr) {
  const px = { left: Math.round(css.x * dpr), top: Math.round(css.y * dpr), width: Math.round(css.width * dpr), height: Math.round(css.height * dpr) };
  return { css: box(css), px };
}
const inside = (inner, outer) => inner.x >= outer.x - 0.5 && inner.y >= outer.y - 0.5 &&
  inner.x + inner.width <= outer.x + outer.width + 0.5 && inner.y + inner.height <= outer.y + outer.height + 0.5;
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
/** Fully inside or fully outside, never cut by the window edge. */
const notCut = (el, win) => inside(el, win) || !overlaps(el, win);

async function capture(page, opts) {
  if (opts.wait !== 0) await settle(page, opts.wait ?? 1200);
  await page.screenshot({ path: path.join(RAW, opts.file) });
  return record(page, opts);
}
/** Provenance entry for a frame already written to raw/ (by capture() or directly). */
async function record(page, { file, job, state, reducedMotion, description, visibleText, boxes = {}, window = null, checks = {}, uses = [] }) {
  const full = path.join(RAW, file);
  const viewport = page.viewportSize();
  const dpr = await page.evaluate(() => window.devicePixelRatio);
  const entry = {
    file, job, uses, state, stateSummary: stateSeed(state).summary,
    viewport, deviceScaleFactor: dpr, pixelSize: { width: Math.round(viewport.width * dpr), height: Math.round(viewport.height * dpr) },
    reducedMotion, gitHead: HEAD, gameSourceMatchesHead: SRC_CLEAN, capturedAt: new Date().toISOString(), sha256: await sha256(full),
    description, visibleText, boxesCss: Object.fromEntries(Object.entries(boxes).map(([k, v]) => [k, box(v)])),
    window: window && windowRect(window, dpr), checks,
  };
  const at = captures.findIndex(c => c.file === file);
  if (at < 0) captures.push(entry); else captures[at] = entry;
  touched.add(file);
  console.log(`captured ${file}`);
  return entry;
}

async function writeProvenance() {
  // Merge with whatever is on disk now, so separate runs of different jobs never drop each other's entries.
  const onDisk = JSON.parse(await readFile(PROVENANCE, 'utf8').catch(() => '{}')).captures ?? [];
  for (const entry of onDisk) if (!touched.has(entry.file) && !captures.some(c => c.file === entry.file)) captures.push(entry);
  for (let i = 0; i < onDisk.length; i++) {
    const at = captures.findIndex(c => c.file === onDisk[i].file);
    if (at >= 0 && !touched.has(onDisk[i].file)) captures[at] = onDisk[i];
  }
  captures.sort((a, b) => a.file.localeCompare(b.file));
  await writeFile(PROVENANCE, JSON.stringify({
    campaign: 'refresh-2026-09',
    renderer: 'Actual Expo / React Native web build of WordShift at http://localhost:8081, rendered in headless Chromium through Playwright',
    note: 'Genuine app UI renders, not Android device screenshots. Only local progression is seeded (localStorage states A to J from brief section 2, see scripts/store/refresh/states.mjs); every visible action is real UI input through Playwright. No DOM edits, hidden elements, restyling, re-layering, invented words or mocked UI. Full frames only: nothing here is cropped or resampled. The "window" of each capture is the crop rectangle the brief asks for, measured with locator.boundingBox() at capture time, given in CSS px and in device px of this file. All non-local network requests were aborted.',
    script: 'mobile/scripts/store/captureRefresh.mjs',
    updatedAt: new Date().toISOString(),
    captures,
  }, null, 2) + '\n');
}

// ---------------------------------------------------------------- helpers
const click = (page, name, opts = {}) => page.getByRole('button', { name, exact: typeof name === 'string' }).first().click(opts);
async function openPuzzle(page, { force = false } = {}) {
  await page.getByRole('button', { name: 'Play puzzle', exact: true }).click({ force });
  await page.waitForTimeout(1500);
}
async function waitBoard(page) {
  await expect(page.getByRole('button', { name: 'How to play', exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('puzzle-row-0')).toBeVisible();
}
async function boardWords(page) {
  return page.evaluate(() => {
    const board = JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || 'null');
    return board ? board.rows.map(r => r.words.map(l => l.char).join('')) : null;
  });
}
/** The room container (123 CSS tall) that holds a room's name plaque. */
async function roomBox(page, roomName) {
  return page.evaluate(name => {
    const el = [...document.querySelectorAll('div')].find(d => d.children.length === 0 && d.textContent?.trim().toUpperCase() === name.toUpperCase());
    if (!el) return null;
    let a = el;
    for (let i = 0; i < 8 && a; i++) {
      a = a.parentElement;
      const r = a?.getBoundingClientRect();
      if (r && r.height > 100 && r.height < 170 && r.width > 200) return { x: r.left, y: r.top, width: r.width, height: r.height };
    }
    return null;
  }, roomName);
}
async function textBox(page, text) {
  return page.evaluate(t => {
    const el = [...document.querySelectorAll('div')].find(d => d.children.length === 0 && d.textContent?.trim().toUpperCase() === t.toUpperCase());
    if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: r.height };
  }, text);
}
/**
 * Drag the house until `measure()` returns `target` within `tol` CSS px.
 * The pan gesture only activates after about 10 CSS of travel (measured:
 * a 40 CSS drag moves the house 30), so each drag adds that slop.
 */
const PAN_SLOP = 10;
/** The house travel a 20-step drag of `d` produces: the gesture engages on the first step past the slop. */
const panTravel = d => { const a = Math.abs(d); const k = Math.floor((PAN_SLOP * 20) / a) + 1; return k > 20 ? 0 : Math.sign(d) * a * (1 - k / 20); };
/**
 * Per-page drag calibration: every drag panUntil makes records the drag length
 * and the travel it actually produced. With motion on, a release carries some
 * momentum, so the slop model alone undershoots or overshoots; interpolating
 * between measured drags lets a correction of a CSS pixel or less land.
 */
const panSamples = new WeakMap();
function dragLengthFor(page, move) {
  const a = Math.abs(move);
  const seen = (panSamples.get(page) ?? []).filter(x => x.t > 0.05).sort((x, y) => x.d - y.d);
  const below = seen.filter(x => x.t <= a).pop(), above = seen.find(x => x.t >= a);
  if (below && above && above.t > below.t) return Math.sign(move) * (below.d + ((a - below.t) * (above.d - below.d)) / (above.t - below.t));
  let d = a + PAN_SLOP;
  for (let x = 10.5; x < 280; x += 0.05) if (Math.abs(Math.abs(panTravel(x)) - a) < Math.abs(Math.abs(panTravel(d)) - a)) d = x;
  if (below) d = Math.max(d, below.d + (a - below.t)); else if (above) d = Math.min(d, above.d);
  return Math.sign(move) * d;
}
async function dragHouseBy(page, move, y0 = 460, height = 768) {
  if (Math.abs(move) < 0.2) return 0;
  const d = dragLengthFor(page, move);
  const start = d < 0 ? Math.min(height - 70, Math.max(y0, 300 - d)) : Math.max(180, Math.min(y0, height - 70 - d));
  await panHouse(page, d, 8, start);
  return d;
}
/** Adds a drag sample, dropping older ones it contradicts (travel must grow with drag length). */
function addPanSample(page, d, t) {
  const list = (panSamples.get(page) ?? []).filter(x => !((x.d < d && x.t > t) || (x.d > d && x.t < t) || Math.abs(x.d - d) < 0.05));
  list.push({ d, t });
  panSamples.set(page, list);
}
async function panUntil(page, measure, target, tol = 2, y0 = 460) {
  const height = page.viewportSize().height;
  if (!panSamples.has(page)) panSamples.set(page, []);
  const move = async m => {
    const v = await measure();
    const d = await dragHouseBy(page, Math.max(-240, Math.min(240, m)), y0, height);
    const after = await measure();
    if (d && Math.sign(after - v) === Math.sign(d) && Math.abs(after - v) > 0.05) addPanSample(page, Math.abs(d), Math.abs(after - v));
  };
  for (let i = 0; i < 20; i++) {
    const v = await measure();
    if (v === null) throw new Error('panUntil: nothing to measure');
    const err = target - v;
    if (Math.abs(err) <= tol) return v;
    // A drag shorter than about 6 CSS barely engages the pan, so a small
    // correction overshoots by 12 CSS and comes back: two calibrated legs.
    if (Math.abs(err) < 6) { await move(err + Math.sign(err) * 12); continue; }
    await move(err);
  }
  const v = await measure();
  if (Math.abs(target - v) > tol) throw new Error(`panUntil: settled at ${v}, wanted ${target}`);
  return v;
}
/** The story card: nearest ancestor of story-scene-scroll whose box includes the header art. */
async function storyCardBox(page) {
  return page.getByTestId('story-scene-scroll').evaluate(scroll => {
    const s = scroll.getBoundingClientRect();
    // The header art: a scene image at the top of the scroll (or above it).
    const imgs = [...document.querySelectorAll('img')].map(i => i.getBoundingClientRect())
      .filter(r => r.width > 80 && r.height > 60 && r.left >= s.left - 1 && r.right <= s.right + 1 && r.top >= s.top - 200 && r.top <= s.top + 40);
    let a = scroll;
    for (let i = 0; i < 12 && a.parentElement; i++) {
      a = a.parentElement;
      const r = a.getBoundingClientRect();
      if (r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1) break;
      if (imgs.some(im => im.top >= r.top - 1 && im.bottom <= r.bottom + 1 && im.left >= r.left - 1 && im.right <= r.right + 1)) {
        const art = imgs[0];
        return { x: r.left, y: r.top, width: r.width, height: r.height, headerArt: { x: art.left, y: art.top, width: art.width, height: art.height },
          scroll: { x: s.left, y: s.top, width: s.width, height: s.height }, scrollOverflowCss: Math.max(0, scroll.scrollHeight - scroll.clientHeight) };
      }
    }
    return { x: s.left, y: s.top, width: s.width, height: s.height, headerArt: false };
  });
}

// ---------------------------------------------------------------- jobs
const JOBS = {};

/**
 * Visible extents of the first three board rows: each row's topmost and
 * bottommost painted element (fan preview labels included) and the top of its
 * card (the bordered or filled panel), in CSS px.
 */
async function rowExtents(page) {
  const out = {};
  for (let k = 0; k < 3; k++) {
    out[`row${k}`] = await page.getByTestId(`puzzle-row-${k}`).evaluate(row => {
      const els = [...row.querySelectorAll('*')].map(e => ({ r: e.getBoundingClientRect(), cs: getComputedStyle(e) }))
        .filter(o => o.r.width > 0 && o.r.height > 0 && o.cs.visibility !== 'hidden' && parseFloat(o.cs.opacity || '1') > 0.02);
      const cards = els.filter(o => o.r.height > 40 && o.r.width > 200 && (parseFloat(o.cs.borderTopWidth) >= 1 || o.cs.backgroundColor !== 'rgba(0, 0, 0, 0)'));
      return { top: Math.min(...els.map(o => o.r.top)), bottom: Math.max(...els.map(o => o.r.bottom)), cardTop: cards.length ? Math.min(...cards.map(o => o.r.top)) : row.getBoundingClientRect().top };
    });
  }
  return out;
}

/** Slot 01 (frames A and B) and FG-B hero tiles: state A, 390x780 at DPR 4. */
JOBS.s01 = async () => {
  const { browser, page } = await launch({ width: 390, height: 780, dsf: 4, reducedMotion: true });
  try {
    await stageState(page, 'A');
    await openPuzzle(page);
    await finishStory(page); await dismissIntros(page);
    await waitBoard(page);
    await click(page, 'RESTART'); await page.waitForTimeout(1200);
    const words = await boardWords(page);
    if (words?.join(',') !== 'PLAY,PANT,HEAR') throw new Error(`s01: unexpected board ${words}`);
    await page.getByTestId('puzzle-row-0').getByRole('button', { name: 'Letter L', exact: true }).click();
    await page.waitForTimeout(1200);
    const r0 = await page.getByTestId('puzzle-row-0').boundingBox(), r1 = await page.getByTestId('puzzle-row-1').boundingBox();
    const fan = await page.getByTestId('puzzle-row-1').getByRole('button').evaluateAll(els => els.map(e => e.getAttribute('aria-label')).filter(Boolean));
    const extA = await rowExtents(page);
    // The four PICK-row tiles (P, the lifted L, A, Y): FG-B's hero crop.
    const tiles = await page.getByTestId('puzzle-row-0').getByRole('button', { name: /^Letter [A-Z]$/ }).evaluateAll(els => {
      // Across: the four buttons. Up and down: every painted part inside them
      // (the lifted L is translated inside its button; some descendants are
      // wide invisible hit areas, so they do not set the horizontal extent).
      const bs = els.map(e => e.getBoundingClientRect());
      const rs = els.flatMap(e => [e, ...e.querySelectorAll('*')]).map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
      const x = Math.min(...bs.map(r => r.left)), y = Math.min(...rs.map(r => r.top));
      return { x, y, width: Math.max(...bs.map(r => r.right)) - x, height: Math.max(...rs.map(r => r.bottom)) - y };
    });
    // FG-B hero tiles: the PICK row's visible card (its bordered parchment
    // panel) and the same card together with its PICK tag and selection glow.
    const card = await page.getByTestId('puzzle-row-0').evaluate(row => {
      const els = [...row.querySelectorAll('*')].map(e => ({ r: e.getBoundingClientRect(), cs: getComputedStyle(e), t: e.textContent?.trim() }));
      const panel = els.filter(o => o.r.height > 40 && parseFloat(o.cs.borderTopWidth) >= 2).sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0]?.r;
      const all = els.filter(o => o.r.width > 0 && o.r.height > 0).map(o => o.r);
      const u = { left: Math.min(...all.map(r => r.left)), top: Math.min(...all.map(r => r.top)), right: Math.max(...all.map(r => r.right)), bottom: Math.max(...all.map(r => r.bottom)) };
      return { panel: panel && { x: panel.left, y: panel.top, width: panel.width, height: panel.height },
        withTagAndGlow: { x: u.left, y: u.top, width: u.right - u.left, height: u.bottom - u.top } };
    });
    const vp = page.viewportSize();
    // The screen width less SIDE_INSET on each side: the game draws a lighter
    // 6 CSS strip and a 1 CSS highlight line down both screen edges, which
    // would sit inside the store panel as a stripe. Inset, the crop edge falls
    // on the board and the build's panel frame covers the cut. From 14 CSS
    // above row 0 to 10 CSS below the DROP fan's labels, and never into the
    // third row (HEAR), whose card starts below.
    const SIDE_INSET = 8;
    const cropA = { x: SIDE_INSET, y: extA.row0.top - 14, width: vp.width - 2 * SIDE_INSET, height: Math.min(extA.row1.bottom + 10, extA.row2.cardTop - 6, extA.row2.top - 2) - (extA.row0.top - 14) };
    await capture(page, { file: 's01-frame-a-letter-lifted.png', job: 's01', state: 'A', reducedMotion: true, uses: ['phone 01 (top)', 'FG-B hero tiles (puzzle-row-0 card)'],
      description: 'Real opener board after RESTART (onboarding done, cup scene read). The L was tapped in PLAY: it lifts and the DROP fan opens over PANT with the real previews.',
      visibleText: `Rows ${words.join(' / ')}; L selected; PANT previews: ${fan.join(' | ')}`,
      boxes: { 'puzzle-row-0': r0, 'puzzle-row-1': r1, fgbRowCardPanel: card.panel, fgbRowCardWithTagAndGlow: card.withTagAndGlow, fgbTiles: tiles }, window: cropA,
      checks: { rowExtentsCss: extA, cropRule: 'screen width less 8 CSS each side (the game\'s edge strip); 14 CSS above row 0 to 10 CSS below the DROP fan labels, stopping 6 CSS above the third row card', excludes: 'the Tap a tile to begin! bubble sits above the window; the HEAR row is below it' } });
    await page.getByTestId('puzzle-row-1').getByRole('button', { name: /forms PLANT, valid word$/ }).click();
    await page.waitForTimeout(1200);
    const after = await boardWords(page);
    const b0 = await page.getByTestId('puzzle-row-0').boundingBox(), b1 = await page.getByTestId('puzzle-row-1').boundingBox();
    const extB = await rowExtents(page);
    const cropB = { x: SIDE_INSET, y: extB.row0.top - 14, width: vp.width - 2 * SIDE_INSET, height: Math.min(extB.row1.bottom + 10, extB.row2.cardTop - 6, extB.row2.top - 2) - (extB.row0.top - 14) };
    // FG-B and the YouTube thumbnail use the PLANT PICK row (a whole word in
    // tiles, the moved L locked in place) rather than P L A Y, which on its own
    // reads as a Play button.
    // Every tile of the row, the locked L included (its label adds a locked note).
    const tilesB = await page.getByTestId('puzzle-row-1').getByRole('button', { name: /^Letter [A-Z]\b/ }).evaluateAll(els => {
      const bs = els.map(e => e.getBoundingClientRect());
      const rs = els.flatMap(e => [e, ...e.querySelectorAll('*')]).map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
      const x = Math.min(...bs.map(r => r.left)), y = Math.min(...rs.map(r => r.top));
      return { x, y, width: Math.max(...bs.map(r => r.right)) - x, height: Math.max(...rs.map(r => r.bottom)) - y, letters: els.length, labels: els.map(e => e.getAttribute('aria-label')) };
    });
    const cardB = await page.getByTestId('puzzle-row-1').evaluate(row => {
      const els = [...row.querySelectorAll('*')].map(e => ({ r: e.getBoundingClientRect(), cs: getComputedStyle(e) }));
      const panel = els.filter(o => o.r.height > 40 && parseFloat(o.cs.borderTopWidth) >= 2).sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)[0]?.r;
      return panel && { x: panel.left, y: panel.top, width: panel.width, height: panel.height };
    });
    if (after?.[1] !== 'PLANT' || tilesB.letters !== 5) throw new Error(`s01: frame B PICK row is ${after?.[1]} (${tilesB.letters} tiles: ${tilesB.labels})`);
    await capture(page, { file: 's01-frame-b-after-move.png', job: 's01', state: 'A', reducedMotion: true, uses: ['phone 01 (bottom)', 'FG-B hero tiles and YouTube thumbnail tiles (PLANT, puzzle-row-1 card)'],
      description: 'The same board after the real move: the L dropped into PANT, giving PAY (checked) and PLANT, which is now the PICK row.',
      visibleText: `Rows ${after.join(' / ')}`,
      boxes: { 'puzzle-row-0': b0, 'puzzle-row-1': b1, fgbRowCardPanel: cardB, fgbTiles: tilesB }, window: cropB,
      checks: { rowExtentsCss: extB, cropRule: 'screen width less 8 CSS each side; 14 CSS above row 0 to 10 CSS below row 1, stopping 6 CSS above the third row card' } });
  } finally { await browser.close(); }
};


/** A resident name plaque or room plaque: the small wooden plaque around the name text. */
async function plaqueBox(page, text) {
  return page.evaluate(t => {
    const el = [...document.querySelectorAll('div')].find(d => d.children.length === 0 && d.textContent?.trim().toUpperCase() === t.toUpperCase());
    if (!el) return null;
    let a = el, best = el.getBoundingClientRect();
    for (let i = 0; i < 3 && a.parentElement; i++) {
      a = a.parentElement; const r = a.getBoundingClientRect();
      if (r.height < 45 && r.width < 320) best = r; else break;
    }
    return { x: best.left, y: best.top, width: best.width, height: best.height };
  }, text);
}
async function residentLabels(page) {
  return page.getByRole('button').evaluateAll(els => els.map(e => e.getAttribute('aria-label') || '')
    .filter(l => / the (fox|pangolin|owl|axolotl|sloth|fennec fox|capybara|wombat)/.test(l)));
}
async function houseChrome(page) {
  return {
    sign: await page.getByTestId('next-unlock-progress').boundingBox(),
    play: await page.getByRole('button', { name: 'Play puzzle', exact: true }).boundingBox(),
  };
}
const ROOM_OF = { fox: 'Cozy Den', pangolin: 'Rustic Kitchen', owl: "Scholar's Study", axolotl: 'Aquarium Room', sloth: 'Jungle Hammock', fennec_fox: 'Desert Camp', capybara: 'Chill Office', wombat: 'Underground Burrow' };
const TAG_OF = { fox: 'EMBER', pangolin: 'PANKO', owl: 'ARCHIMEDES', axolotl: 'AXEL', sloth: 'SLOANE', fennec_fox: 'FENNICK', capybara: 'CHILL', wombat: 'WARREN' };
async function houseBoxes(page, residents) {
  const out = {};
  for (const a of residents) {
    out[`room:${ROOM_OF[a]}`] = await roomBox(page, ROOM_OF[a]);
    out[`roomPlaque:${ROOM_OF[a]}`] = await plaqueBox(page, ROOM_OF[a]);
    out[`namePlaque:${TAG_OF[a]}`] = await plaqueBox(page, TAG_OF[a]);
  }
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];
  return out;
}
/** Every name plaque, room plaque and room frame must be fully inside or fully outside the window. */
function plaqueCuts(boxes, win) {
  return Object.entries(boxes).filter(([k, b]) => /Plaque/.test(k) && !notCut(b, win)).map(([k]) => k);
}


/**
 * Boxes of every text inside the panned house (for a name or room plaque, the
 * plaque around it), plus the edge of the house viewport under the header.
 */
async function houseTextBoxes(page) {
  return page.evaluate(() => {
    const anyRoomText = [...document.querySelectorAll('div')].find(d => d.children.length === 0 && d.textContent?.trim().toUpperCase() === 'COZY DEN');
    let clip = anyRoomText;
    while (clip && clip.parentElement) {
      clip = clip.parentElement;
      const r = clip.getBoundingClientRect();
      const cs = getComputedStyle(clip);
      if (r.top > 20 && r.bottom >= window.innerHeight - 1 && r.width >= window.innerWidth - 1 && (cs.overflow === 'hidden' || cs.overflowY === 'hidden')) break;
    }
    const clipTop = clip.getBoundingClientRect().top;
    const out = [];
    for (const el of clip.querySelectorAll('div')) {
      if (el.children.length || !el.textContent?.trim()) continue;
      let r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const lineHeight = r.height;
      let a = el;
      for (let i = 0; i < 3 && a.parentElement; i++) {
        a = a.parentElement; const rr = a.getBoundingClientRect();
        if (rr.height < 45 && rr.width < 320) r = rr; else break;
      }
      out.push({ text: el.textContent.trim().slice(0, 40), x: r.left, y: r.top, width: r.width, height: r.height, plaque: r.height - lineHeight >= 4 });
    }
    return { clipTop, boxes: out };
  });
}
const r0mid = r => (r.from + r.to) / 2;
/**
 * Smallest vertical house shift (CSS, positive = house moves down) in
 * [lo, hi] after which no house text or plaque is sliced by the header edge
 * or by the Next: sign. `ok(shift)` adds framing constraints.
 */
async function tidyShift(page, { lo = -20, hi = 20, ok = () => true, step = 1, edges: edgesOverride = null, ignore = [] } = {}) {
  const { clipTop, boxes: all } = await houseTextBoxes(page);
  const boxes = all.filter(b => !ignore.includes(b.text.toUpperCase()));
  const { sign, play } = await houseChrome(page);
  const edges = edgesOverride ?? [clipTop, sign.y, sign.y + sign.height, play.y];
  // A bare text line box carries line-height padding with no ink at its
  // edges, so an edge may graze it by up to 1.5 CSS; a plaque may not be grazed.
  const depth = (b, sh, e) => Math.max(0, Math.min(e - (b.y + sh), b.y + b.height + sh - e));
  const sliced = sh => boxes.filter(b => edges.some(e => depth(b, sh, e) > (b.plaque ? 0.5 : 1.5))).map(b => b.text);
  if (process.env.TIDY_DEBUG) console.log('tidy', JSON.stringify({ edges, boxes: boxes.filter(b => b.y < sign.y + sign.height + 30) }));
  // Clean runs of shifts; pick the run nearest zero and aim for its middle,
  // so the pan's sub-pixel error cannot land on an edge.
  const clean = [];
  for (let sh = lo; sh <= hi + 1e-9; sh += step) clean.push([round(sh), ok(sh) && sliced(sh).length === 0]);
  const runs = [];
  for (const [sh, good] of clean) {
    if (!good) continue;
    const last = runs[runs.length - 1];
    if (last && Math.abs(last.to + step - sh) < 1e-6) last.to = sh; else runs.push({ from: sh, to: sh });
  }
  if (!runs.length) return { shift: null, slicedBefore: sliced(0) };
  // Zero when it is clean with at least 1 CSS of margin (or it is the only candidate).
  const at0 = runs.find(r => r.from <= 0 && r.to >= 0);
  if (at0 && ((lo === 0 && hi === 0) || (at0.from <= -1 || lo === 0) && at0.to >= 1)) return { shift: 0, slicedBefore: [] };
  runs.sort((a, b) => Math.abs(r0mid(a)) - Math.abs(r0mid(b)));
  return { shift: round(r0mid(runs[0])), run: runs[0], slicedBefore: sliced(0) };
}
/** Move the house by `shift` CSS, verified against a room frame. */
async function shiftHouse(page, shift, refRoom, tol = 0.6) {
  if (!shift || Math.abs(shift) <= tol) return;
  const y0 = (await roomBox(page, refRoom)).y;
  await panUntil(page, async () => (await roomBox(page, refRoom)).y, y0 + shift, tol, Math.round(page.viewportSize().height * 0.55));
}

/**
 * Slot 02: the day house (state B), 432x768 at DPR 3. Chill Office, the highest
 * built room, sits just under the Next: sign, so the window holds the office,
 * Desert Camp, Jungle Hammock and the Aquarium Room. (One room lower, with
 * Desert Camp at the top, the house's drifting clouds sat in both bottom
 * corners of the window as cut-off white blobs.)
 */
JOBS.s02 = async () => {
  const { browser, page } = await launch({ width: 432, height: 768, dsf: 3, reducedMotion: true });
  try {
    await stageState(page, 'B');
    await page.waitForTimeout(2500);
    const { sign } = await houseChrome(page);
    const signBottom = sign.y + sign.height;
    // Chill Office frame 2 to 10 CSS below the sign (target 6).
    await panUntil(page, async () => (await roomBox(page, 'Chill Office')).y, signBottom + 6, 3);
    const { play } = await houseChrome(page);
    const win = { x: 36, y: signBottom + 4, width: 360, height: 520 };
    const boxes = await houseBoxes(page, ['capybara', 'fennec_fox', 'sloth', 'axolotl', 'owl']);
    const office = boxes['room:Chill Office'];
    const clouds = await cloudBoxes(page);
    const checks = {
      officeTopBelowSign: round(office.y - signBottom),
      windowBottomAbovePlay: round(play.y - (win.y + win.height)),
      mustInclude: ['room:Chill Office', 'room:Desert Camp', 'room:Jungle Hammock', 'room:Aquarium Room'].map(k => [k, inside(boxes[k], win)]),
      studyPlaqueWhole: notCut(boxes["roomPlaque:Scholar's Study"], win),
      cutPlaques: plaqueCuts(boxes, win),
      cloudsInWindow: clouds.filter(c => overlaps(c, win)).length,
    };
    if (checks.windowBottomAbovePlay < 0 || checks.mustInclude.some(([, ok]) => !ok) || checks.cutPlaques.length || !checks.studyPlaqueWhole || checks.cloudsInWindow) throw new Error(`s02 framing: ${JSON.stringify(checks)}`);
    await capture(page, { file: 's02-day-house.png', job: 's02', state: 'B', reducedMotion: true, uses: ['phone 02'],
      description: 'The day house at phase 1 with seven residents, panned so Chill Office, the highest built room, sits just under the Next: sign, above Desert Camp, Jungle Hammock and the Aquarium Room. Only Axel has news (his "!" badge); everyone else is between conversations.',
      visibleText: `Residents: ${(await residentLabels(page)).join(' | ')}`, boxes: { sign, play, ...boxes }, window: win, checks });
  } finally { await browser.close(); }
};

/** The drifting sky clouds (soft View blobs behind the house), as CSS boxes. */
async function cloudBoxes(page) {
  return page.evaluate(() => [...document.querySelectorAll('div')].filter(d => {
    const cs = getComputedStyle(d);
    return d.children.length === 0 && parseFloat(cs.borderTopLeftRadius) >= 20 && /255, 255, 255|244, 242, 250|207, 199, 218|198, 190, 210/.test(cs.backgroundColor);
  }).map(d => d.getBoundingClientRect()).filter(r => r.width > 20 && r.height > 20).map(r => ({ x: r.left, y: r.top, width: r.width, height: r.height })));
}

/**
 * The drifting clouds grouped per cloud (each cloud is several soft blobs
 * under one parent), as union boxes in CSS px.
 */
async function cloudGroups(page) {
  return page.evaluate(() => {
    const groups = new Map();
    for (const d of document.querySelectorAll('div')) {
      const cs = getComputedStyle(d);
      // Every lobe of a cloud (radius 12 to 30 CSS) in the cloud tints; the
      // radius floor only keeps out small square chrome in the same colours.
      if (d.children.length || parseFloat(cs.borderTopLeftRadius) < 8 || !/^rgb\((255, 255, 255|244, 242, 250|207, 199, 218|198, 190, 210)\)$/.test(cs.backgroundColor)) continue;
      const r = d.getBoundingClientRect();
      if (r.width <= 16 || r.height <= 16) continue;
      const g = groups.get(d.parentElement) ?? { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity };
      g.left = Math.min(g.left, r.left); g.top = Math.min(g.top, r.top); g.right = Math.max(g.right, r.right); g.bottom = Math.max(g.bottom, r.bottom);
      groups.set(d.parentElement, g);
    }
    return [...groups.values()].map(g => ({ x: g.left, y: g.top, width: g.right - g.left, height: g.bottom - g.top }));
  });
}
/**
 * The house's own drifting clouds sit at fixed heights and drift across the
 * sky, so where a frame edge or the house column cuts one depends only on the
 * moment. With the page clock installed (launch({ clock: true }), motion on),
 * this fast-forwards the game's clock in `stepMs` jumps until `check()` holds,
 * then pauses the clock there so the frame stays still for the screenshot.
 * Only time moves; nothing on the page is touched.
 */
async function freezeWhen(page, check, { stepMs = 900, max = 400 } = {}) {
  let ff = 0;
  for (let i = 0; i < max; i++) {
    if (await check()) {
      const t = await page.evaluate(() => Date.now());
      await page.clock.pauseAt(t + 40);
      await page.waitForTimeout(250);
      if (await check()) return { ok: true, fastForwardMs: ff, steps: i };
      await page.clock.resume();
    }
    await page.clock.fastForward(stepMs); ff += stepMs;
    await page.waitForTimeout(160);
  }
  return { ok: false, fastForwardMs: ff, steps: max };
}
/** A cloud is clean when it is wholly behind the house column or wholly clear of it (never sliced by its edge). */
const cloudClearOfColumn = (c, body) => c.x + c.width <= body.left || c.x >= body.right || (c.x >= body.left && c.x + c.width <= body.right);
/** The house column (room frames plus their side walls) from a room box. */
const columnOf = room => ({ left: room.x - 7, right: room.x + room.width + 7 });
/**
 * Rows of the dirt path where the foundation's carved road meets the pit
 * entrance art that read as a one-pixel dark line (a sub-pixel gap between the
 * two images, which comes and goes with the house's sub-pixel position). Scans
 * the path just above the well's top edge in the saved frame and returns rows
 * darker than 0.86 of their neighbourhood.
 */
async function seamRows(file, dpr, well, { spanCss = 8, halfWidthCss = 18 } = {}) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const cx = (well.x + well.width / 2) * dpr, x0 = Math.round(cx - halfWidthCss * dpr), x1 = Math.round(cx + halfWidthCss * dpr);
  const y0 = Math.max(12, Math.round((well.y - spanCss) * dpr)), y1 = Math.min(info.height - 13, Math.round((well.y + spanCss) * dpr));
  const L = {};
  for (let y = y0 - 12; y <= y1 + 12; y++) {
    let sum = 0;
    for (let x = x0; x <= x1; x++) { const i = (y * info.width + x) * 3; sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; }
    L[y] = sum / (x1 - x0 + 1);
  }
  const out = [];
  for (let y = y0; y <= y1; y++) {
    const nb = [];
    for (let d = 3; d <= 10; d++) nb.push(L[y - d], L[y + d]);
    nb.sort((a, b) => a - b);
    const base = nb[Math.floor(nb.length / 2)];
    if (L[y] < 0.86 * base) out.push({ y, luma: Math.round(L[y]), base: Math.round(base) });
  }
  return out;
}

/**
 * Slot 03: the dusk house at the bottom clamp (state C), 432 CSS wide.
 *
 * The window runs from the floor beam between the study and the kitchen down
 * to 10 CSS below the well (never below the PLAY dock), so it opens on the
 * kitchen and ends just under the well instead of on the dark, mirrored meadow
 * below it. That span is well under 520 CSS, so the frame is rendered at the
 * DPR (a multiple of 1/48, keeping the frame a whole number of pixels) that
 * makes it exactly 1080x1560: pass 1 measures at DPR 3, pass 2 renders at the
 * computed DPR and re-measures.
 *
 * Two things depend only on the moment and are waited out with the page clock
 * (motion on): the house's drifting clouds, which sit at the height of the
 * kitchen's top edge, must be wholly behind the house column or wholly outside
 * the window, so none is sliced by the caption seam or the column; and the
 * dirt path must show no one-pixel dark line where the foundation's road meets
 * the pit entrance art (a sub-pixel gap that comes and goes with the render
 * scale), so a frame that shows it is retaken at the next DPR.
 */
JOBS.s03 = async () => {
  const stage = async dsf => {
    const ctx = await launch({ width: 432, height: 768, dsf, reducedMotion: false, clock: true });
    await stageState(ctx.page, 'C');
    await ctx.page.waitForTimeout(2000);
    for (let i = 0; i < 6; i++) await panHouse(ctx.page, -300, 8, 460);
    return ctx;
  };
  const measure = async page => ({ ...(await houseChrome(page)), kitchen: await roomBox(page, 'Rustic Kitchen'),
    well: await page.getByRole('button', { name: 'Enter the Offering Pit', exact: true }).boundingBox() });
  let geo;
  { const { browser, page } = await stage(3); try { geo = await measure(page); } finally { await browser.close(); } }
  const top = geo.kitchen.y - 3;
  const wellBottom = geo.well.y + geo.well.height;
  const minH = wellBottom + 4 - top, maxH = geo.play.y - 4 - top, target = wellBottom + 10 - top;
  const candidates = [];
  for (let k = Math.ceil((1560 / maxH) * 48); k <= Math.floor((1560 / minH) * 48); k++) candidates.push(k / 48);
  candidates.sort((a, b) => Math.abs(1560 / a - target) - Math.abs(1560 / b - target));
  if (!candidates.length) throw new Error(`s03: no DPR fits ${JSON.stringify({ minH, maxH })}`);
  const tried = [];
  for (const dsf of candidates.slice(0, 8)) {
    const { browser, page } = await stage(dsf);
    try {
      const { sign, play, kitchen, well } = await measure(page);
      if (Math.abs(kitchen.y - geo.kitchen.y) > 0.6) throw new Error(`s03: clamp moved between passes (${geo.kitchen.y} -> ${kitchen.y})`);
      const w = 1080 / dsf, h = 1560 / dsf;
      const win = { x: (432 - w) / 2, y: kitchen.y - 3, width: w, height: h };
      const column = columnOf(kitchen);
      const cloudsOk = clouds => clouds.filter(c => overlaps(c, win)).every(c => c.x >= column.left && c.x + c.width <= column.right);
      const frozen = await freezeWhen(page, async () => cloudsOk(await cloudGroups(page)) && !(await emoteClashes(page)).length);
      if (!frozen.ok) { tried.push({ dsf, why: 'clouds never clear' }); continue; }
      const boxes = await houseBoxes(page, ['owl', 'pangolin', 'fox']);
      const clouds = await cloudGroups(page);
      const checks = {
        deviceScaleFactor: dsf, windowCss: { width: round(w), height: round(h) },
        windowTopAboveKitchenCss: round(kitchen.y - win.y), windowBottomBelowWellCss: round(win.y + win.height - (well.y + well.height)),
        windowBottomAbovePlayCss: round(play.y - (win.y + win.height)),
        mustInclude: ['room:Rustic Kitchen', 'room:Cozy Den'].map(k => [k, inside(boxes[k], win)]).concat([['well', inside(well, win)]]),
        studyOutside: !overlaps({ ...boxes["room:Scholar's Study"], height: boxes["room:Scholar's Study"].height - 0.5 }, win),
        cutPlaques: plaqueCuts(boxes, win),
        cloudsInWindow: clouds.filter(c => overlaps(c, win)).map(box), cloudsClear: cloudsOk(clouds), clockFastForwardMs: frozen.fastForwardMs,
      };
      if (checks.windowBottomAbovePlayCss < 2 || checks.mustInclude.some(([, ok]) => !ok) || checks.cutPlaques.length || !checks.studyOutside || !checks.cloudsClear) throw new Error(`s03 framing: ${JSON.stringify(checks)}`);
      await settle(page, 1200);
      const file = 's03-dusk-house.png';
      await page.screenshot({ path: path.join(RAW, file) });
      const seam = await seamRows(path.join(RAW, file), dsf, well);
      if (seam.length) { console.log(`s03: DPR ${dsf} shows the road seam ${JSON.stringify(seam)}; next DPR`); tried.push({ dsf, why: 'road seam', seam }); continue; }
      await record(page, { file, job: 's03', state: 'C', reducedMotion: false, uses: ['phone 03'],
        description: `The same house at dusk (phase 2 sky), at the bottom clamp: Rustic Kitchen with Panko, Cozy Den with Ember and her "!" badge, the stone foundation, the dirt path and the glowing well in the sunset meadow. Rendered at DPR ${dsf} so the span from the study/kitchen floor beam to 10 CSS under the well is exactly 1080x1560. Motion on, the game clock fast-forwarded ${frozen.fastForwardMs} ms and paused so no drifting cloud is sliced by the frame or the house column.`,
        visibleText: `Residents: ${(await residentLabels(page)).join(' | ')}`, boxes: { sign, play, well, ...boxes }, window: win,
        checks: { ...checks, roadSeamRows: [], retakes: tried } });
      return;
    } finally { await browser.close(); }
  }
  throw new Error(`s03: no clean frame ${JSON.stringify(tried)}`);
};

/**
 * The amber pill's sparkle motes (AmberSparkle). Under reduced motion the game
 * rests a single half-opaque mote beside the pill, which reads as a grey speck
 * on the header; with motion on it is a small rising trail of gold motes and
 * there is never a moment with none. Returns the motes' effective opacities.
 */
async function sparkleOpacities(page) {
  return page.evaluate(() => [...document.querySelectorAll('div')].filter(d => {
    if (d.children.length) return false;
    const cs = getComputedStyle(d); const r = d.getBoundingClientRect();
    return cs.width === '5px' && cs.height === '5px' && parseFloat(cs.borderTopLeftRadius) >= 2 && r.top < 160 && r.left < 400;
  }).map(d => { let op = 1, a = d; while (a && a !== document.body) { op *= parseFloat(getComputedStyle(a).opacity || '1'); a = a.parentElement; } return Math.round(op * 100) / 100; }));
}
/** Resident emote puffs (rare idles) that overlap a room or name plaque right now. */
async function emoteClashes(page) {
  return page.evaluate(() => {
    const vis = el => { let op = 1, a = el; while (a && a !== document.body) { const cs = getComputedStyle(a); if (cs.display === 'none' || cs.visibility === 'hidden') return 0; op *= parseFloat(cs.opacity || '1'); a = a.parentElement; } return op; };
    const puffs = [...document.querySelectorAll('img')].filter(i => /emote_/.test(i.getAttribute('src') || '') && vis(i.parentElement) > 0.05).map(i => i.parentElement.getBoundingClientRect());
    // With motion on, the house also floats small warm dust motes and chimney
    // smoke; a mote resting on a plaque reads as a smudge on the lettering.
    for (const d of document.querySelectorAll('div')) {
      if (d.children.length) continue;
      const cs = getComputedStyle(d);
      if (!/^rgba?\((252, 224, 160|240, 201, 138|235, 217, 180|220, 220, 224)/.test(cs.backgroundColor)) continue;
      const r = d.getBoundingClientRect();
      if (r.width < 3 || r.width > 26 || parseFloat(cs.borderTopLeftRadius) < r.width * 0.3) continue;
      if (vis(d) > 0.05) puffs.push(r);
    }
    const plaques = [...document.querySelectorAll('div')].filter(d => d.children.length === 0 && /^[A-Z][A-Z' ]{2,}$/.test(d.textContent?.trim() || '')).map(d => {
      let r = d.getBoundingClientRect(), a = d;
      for (let k = 0; k < 3 && a.parentElement; k++) { a = a.parentElement; const rr = a.getBoundingClientRect(); if (rr.height < 45 && rr.width < 320) r = rr; else break; }
      return { text: d.textContent.trim(), r };
    }).filter(p => p.r.bottom > 0 && p.r.top < window.innerHeight && p.r.right > 0 && p.r.left < window.innerWidth);
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    return plaques.filter(p => puffs.some(q => hit(p.r, q))).map(p => p.text);
  });
}

/**
 * With motion on, a drag lands only to within a CSS pixel or so (the release
 * carries momentum). Instead of demanding an exact position, this re-measures
 * the tidy framing after each move and stops as soon as the current position
 * itself is clean (no text sliced, `okFor()` framing constraints met).
 */
async function settleTidy(page, refRoom, { lo, hi, okFor = async () => () => true, tries = 12 }) {
  for (let i = 0; i < tries; i++) {
    const ok = await okFor();
    const here = await tidyShift(page, { lo: 0, hi: 0, ok });
    if (here.shift === 0) return;
    const t = await tidyShift(page, { lo, hi, step: 0.25, ok });
    if (t.shift === null) throw new Error(`settleTidy: no tidy framing ${JSON.stringify(t)}`);
    if (process.env.TIDY_DEBUG) console.log('settleTidy', i, JSON.stringify(t));
    // A drag cannot land closer than about 2 CSS with motion on, so aim and re-check.
    await shiftHouse(page, t.shift, refRoom, 0.2).catch(e => console.log(`settleTidy: ${e.message}`));
  }
  const here = await tidyShift(page, { lo: 0, hi: 0, ok: await okFor() });
  if (here.shift !== 0) throw new Error(`settleTidy: still sliced ${JSON.stringify(here)}`);
}

/** Sparkle reads as a sparkle right now (two or more motes showing, one bright). */
async function sparkleReads(page) {
  const ops = await sparkleOpacities(page);
  return ops.filter(o => o > 0.3).length >= 2 && Math.max(0, ...ops) >= 0.7;
}
/**
 * A still of the house with motion on, frozen on a clean moment: no drifting
 * cloud sliced by the house column, no emote over a plaque, the amber sparkle
 * showing, and (when the well is on screen) no dark seam line across the dirt
 * path. A seam retakes after a sub-pixel nudge of the house.
 */
async function cleanHouseStill(page, { file, job, state, refRoom, dpr, tidy, retakeNudges = [0.6, -0.6, 1.2, -1.2, 0.3] }) {
  const tried = [];
  for (let n = 0; n <= retakeNudges.length; n++) {
    const column = columnOf(await roomBox(page, refRoom));
    const frozen = await freezeWhen(page, async () => (await cloudGroups(page)).every(c => cloudClearOfColumn(c, column))
      && !(await emoteClashes(page)).length && (await sparkleReads(page)));
    if (!frozen.ok) throw new Error(`${job}: no clean moment (clouds, emotes, sparkle)`);
    await settle(page, 1200);
    await page.screenshot({ path: path.join(RAW, file) });
    const well = await page.getByRole('button', { name: 'Enter the Offering Pit', exact: true }).boundingBox().catch(() => null);
    const vp = page.viewportSize();
    const seam = well && well.y > 10 && well.y < vp.height - 10 ? await seamRows(path.join(RAW, file), dpr, well) : [];
    const clouds = await cloudGroups(page);
    const moment = { clockFastForwardMs: frozen.fastForwardMs, cloudsClearOfColumn: clouds.every(c => cloudClearOfColumn(c, column)), clouds: clouds.map(box),
      emoteOverPlaque: await emoteClashes(page), sparkleOpacities: await sparkleOpacities(page), wellCss: well && box(well), roadSeamRows: seam, retakes: tried };
    if (!seam.length) return moment;
    if (n === retakeNudges.length) throw new Error(`${job}: road seam on every take ${JSON.stringify(tried)}`);
    console.log(`${job}: road seam ${JSON.stringify(seam)}; nudging the house ${retakeNudges[n]} CSS`);
    tried.push({ seam, nudgeCss: retakeNudges[n] });
    await page.clock.resume();
    // Any small move changes the sub-pixel phase; where it lands exactly does not matter.
    await dragHouseBy(page, retakeNudges[n], Math.round(page.viewportSize().height * 0.55), page.viewportSize().height);
    await settleTidy(page, refRoom, tidy);
  }
}

/**
 * Tablet T1 raw (uploaded as t2-house): the day house (state B), 720x1280 at
 * DPR 2, full frame. Motion on, with the game clock stopped on a clean moment
 * (see cleanHouseStill), so the amber pill's sparkle is its moving gold trail
 * rather than the grey resting speck reduced motion leaves (see sparkleOpacities).
 */
JOBS.t1 = async () => {
  const { browser, page } = await launch({ width: 720, height: 1280, dsf: 2, reducedMotion: false, clock: true });
  try {
    await stageState(page, 'B');
    await page.waitForTimeout(2500);
    const { sign } = await houseChrome(page);
    const signBottom = sign.y + sign.height;
    await panUntil(page, async () => (await roomBox(page, 'Chill Office')).y, signBottom + 6, 2, 700);
    // Keep the sign directly above Chill Office (2 to 22 CSS gap) while making sure no
    // text in the house (the locked Underground Burrow card behind the sign, a plaque)
    // is sliced by the header edge or the sign.
    const office0 = (await roomBox(page, 'Chill Office')).y;
    const tidy0 = await tidyShift(page, { lo: -8, hi: 16, step: 0.25, ok: sh => office0 + sh - signBottom >= 2 && office0 + sh - signBottom <= 22 });
    const tidy = { lo: -8, hi: 16, okFor: async () => { const office = (await roomBox(page, 'Chill Office')).y; return sh => office + sh - signBottom >= 2 && office + sh - signBottom <= 22; } };
    await settleTidy(page, 'Chill Office', tidy);
    const moment = await cleanHouseStill(page, { file: 't1-house.png', job: 't1', state: 'B', refRoom: 'Chill Office', dpr: 2, tidy });
    const officeGap = round((await roomBox(page, 'Chill Office')).y - signBottom);
    const boxes = await houseBoxes(page, ['capybara', 'fennec_fox', 'sloth', 'axolotl', 'owl', 'pangolin', 'fox']);
    await record(page, { file: 't1-house.png', job: 't1', state: 'B', reducedMotion: false, uses: ['tablet t2-house'],
      description: 'Tablet frame of the day house at phase 1: the Next: sign sits directly above Chill Office, the highest built room, with the rooms stacked below it. Motion on (residents walk, clouds drift, the amber sparkle rises); the game clock was fast-forwarded and paused on a moment with no cloud sliced by the house column and no seam line across the dirt path.',
      visibleText: `Residents: ${(await residentLabels(page)).join(' | ')}`, boxes: { sign, ...boxes },
      checks: { officeTopBelowSignCss: officeGap, tidyShiftCss: tidy0.shift, slicedBeforeTidy: tidy0.slicedBefore, ...moment } });
  } finally { await browser.close(); }
};

/** Tablet T4: the dusk house at the bottom clamp (state C), 720x1280 at DPR 2, full frame, motion on (as T1). */
JOBS.t4 = async () => {
  const { browser, page } = await launch({ width: 720, height: 1280, dsf: 2, reducedMotion: false, clock: true });
  try {
    await stageState(page, 'C');
    await page.waitForTimeout(2000);
    for (let i = 0; i < 6; i++) await panHouse(page, -300, 8, 700);
    // From the bottom clamp, drag the house down only as far as needed so the
    // Next: sign does not slice a room plaque; the well stays clear of the PLAY dock.
    const { play } = await houseChrome(page);
    const well0 = await page.getByRole('button', { name: 'Enter the Offering Pit', exact: true }).boundingBox();
    const tidy = await tidyShift(page, { lo: 0, hi: 40, ok: sh => well0.y + well0.height + sh <= play.y - 8 });
    if (tidy.shift === null) throw new Error(`t4: no tidy framing ${JSON.stringify(tidy)}`);
    const settle4 = { lo: -10, hi: 40, okFor: async () => { const w = await page.getByRole('button', { name: 'Enter the Offering Pit', exact: true }).boundingBox(); return sh => w.y + w.height + sh <= play.y - 8; } };
    await shiftHouse(page, tidy.shift, 'Cozy Den', 1.0).catch(e => console.log(`t4: ${e.message}`));
    await settleTidy(page, 'Cozy Den', settle4);
    const moment = await cleanHouseStill(page, { file: 't4-dusk-well.png', job: 't4', state: 'C', refRoom: 'Cozy Den', dpr: 2, tidy: settle4 });
    const boxes = await houseBoxes(page, ['wombat', 'capybara', 'fennec_fox', 'sloth', 'axolotl', 'owl', 'pangolin', 'fox']);
    await record(page, { file: 't4-dusk-well.png', job: 't4', state: 'C', reducedMotion: false, uses: ['tablet t4-dusk-well'],
      description: 'Tablet frame of the dusk house (phase 2 sky) at the bottom clamp: the lower rooms, Ember by the fire with her "!" badge, the foundation and the glowing well. Motion on; the game clock was fast-forwarded and paused on a moment with no cloud sliced by the house column.',
      visibleText: `Residents: ${(await residentLabels(page)).join(' | ')}`, boxes,
      checks: { draggedDownFromClampCss: tidy.shift, slicedAtClamp: tidy.slicedBefore, ...moment } });
  } finally { await browser.close(); }
};

/** The resident dialogue sheet: the ancestor of the speech bubble that reaches the bottom of the screen. */
async function dialogueSheetBox(page) {
  return page.getByTestId('resident-dialogue-bubble').evaluate(el => {
    let a = el, best = null;
    while (a.parentElement) {
      a = a.parentElement;
      const r = a.getBoundingClientRect();
      if (r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1) break;
      if (r.bottom >= window.innerHeight - 2 && r.width >= window.innerWidth * 0.9) best = { x: r.left, y: r.top, width: r.width, height: r.height };
    }
    return best;
  });
}

/**
 * Slot 04: Panko's first phase-1 line (state D), 380 wide at DPR 54/19 (so the
 * screen is exactly 1080 px wide), window 1080x1560 px (380x548.9 CSS)
 * bottom-aligned.
 *
 * 380 CSS keeps the side-by-side sheet (portrait left, text right) that 432
 * has, but the sheet fills more of the window, so the dimmed house above it
 * shrinks to about one room (the study) instead of repeating the jungle and
 * aquarium rooms that slot 02 already shows. The viewport height is a
 * multiple of 19 so every frame is a whole number of pixels.
 *
 * When a resident speaks, the game lifts that room's interior 20 CSS, so the
 * kitchen's name plaque slides under the study's floor and reads as sliced.
 * The house is therefore panned down (a real drag) until the kitchen sits
 * behind the dialogue sheet: the window shows Axel's aquarium and Archimedes'
 * study above the sheet, and Panko speaks from the sheet's own portrait.
 */
JOBS.s04 = async () => {
  const LINE = 'Something funny happened. I went to bed with the spice jars in one order and woke up to find them in another. I must have moved them in my sleep. I must have.';
  const openPanko = async page => {
    await page.getByRole('button', { name: /^Panko the pangolin/ }).first().click();
    await page.waitForTimeout(3200);
    const bubble = page.getByTestId('resident-dialogue-bubble');
    await expect(bubble).toBeVisible();
    return (await bubble.innerText()).replace(/\s+/g, ' ').trim();
  };
  const closeDialogue = page => page.getByRole('button', { name: 'Close dialogue', exact: true }).click({ position: { x: 4, y: 4 } });
  const W = 380, DSF = 54 / 19, WIN_H = 1560 / DSF;
  for (let height = 817, attempt = 0; attempt < 8; attempt++) {
    // Motion on with the page clock: once the line has typed out, the clock is
    // fast-forwarded and paused on a moment when no drifting cloud shows beside
    // the study (see freezeWhen); under reduced motion the clouds rest exactly
    // there and read as grey smudges through the dialogue scrim.
    const { browser, page } = await launch({ width: W, height, dsf: DSF, reducedMotion: false, clock: true });
    try {
      await stageState(page, 'D');
      await page.waitForTimeout(1500);
      for (let i = 0; i < 6; i++) await panHouse(page, -300, 8, Math.round(height * 0.6));
      const panko = page.getByRole('button', { name: /^Panko the pangolin/ }).first();
      for (let k = 0; k < 6; k++) {
        const b = await panko.boundingBox();
        if (b && b.y >= 120 && b.y + b.height <= height - 120) break;
        await panHouse(page, b && b.y < 120 ? 250 : -250, 8, b && b.y < 120 ? 300 : Math.round(height * 0.7));
      }
      const sign = await page.getByTestId('next-unlock-progress').boundingBox();
      const win = { x: 0, y: height - WIN_H, width: W, height: WIN_H };
      if (sign.y < win.y && sign.y + sign.height > win.y) {
        console.log(`s04: a ${height} tall viewport puts the window top (${win.y}) through the Next: sign (${sign.y}-${sign.y + sign.height}); raising by 38`);
        height += 38; continue;
      }
      // First opening: measure the sheet and the lifted kitchen, then close without Next (consumes nothing).
      let said = await openPanko(page);
      if (said !== LINE) { console.log(`s04: first page was "${said}"; closing without Next and reseeding`); await closeDialogue(page).catch(() => {}); continue; }
      const sheet0 = await dialogueSheetBox(page);
      const study0 = await roomBox(page, "Scholar's Study");
      // The study's floor sits on the sheet's top edge (0 to 3 CSS above it):
      // the whole study, owl included, fills the strip above the sheet, and the
      // speaking kitchen (whose lifted interior slides under the study floor)
      // is entirely behind the sheet.
      // The speaking kitchen's own texts are left out: its lifted interior goes
      // under the study floor, and with the study floor on the sheet edge the
      // rest of the kitchen is behind the sheet (checked on the frame below).
      const tidy = await tidyShift(page, { lo: 0, hi: 420, step: 0.25, edges: [win.y, sheet0.y], ignore: ['RUSTIC KITCHEN', 'PANKO'],
        ok: sh => { const floor = study0.y + study0.height + sh; return floor <= sheet0.y && floor >= sheet0.y - 3; } });
      await closeDialogue(page);
      await page.waitForTimeout(800);
      if (tidy.shift === null) throw new Error(`s04: no clean framing ${JSON.stringify(tidy)}`);
      // With motion on the pan carries a little momentum, so the house lands
      // within 1.5 CSS of the target; the framing checks below re-verify the
      // result (nothing sliced, study whole above the sheet).
      await shiftHouse(page, tidy.shift, 'Cozy Den', 1.5);
      const pankoBox = await panko.boundingBox();
      if (!(pankoBox.y >= 120 && pankoBox.y + pankoBox.height <= height - 120)) throw new Error(`s04: Panko out of reach after the pan ${JSON.stringify(pankoBox)}`);
      said = await openPanko(page);
      if (said !== LINE) { console.log(`s04: reopened page was "${said}"; reseeding`); continue; }
      const sheet = await dialogueSheetBox(page);
      const next = await page.getByRole('button', { name: 'Continue dialogue', exact: true }).boundingBox();
      const after = await tidyShift(page, { lo: 0, hi: 0, edges: [win.y, sheet.y], ignore: ['RUSTIC KITCHEN', 'PANKO'] });
      const kitchen = await roomBox(page, 'Rustic Kitchen');
      const study = await roomBox(page, "Scholar's Study");
      // The strip of house above the sheet: every cloud there is wholly behind
      // the house column or wholly off screen.
      const column = columnOf(await roomBox(page, "Scholar's Study"));
      const strip = { x: 0, y: win.y, width: W, height: sheet.y - win.y };
      const cloudsOk = clouds => clouds.filter(c => overlaps(c, strip)).every(c => c.x + c.width <= 0 || c.x >= W || (c.x >= column.left && c.x + c.width <= column.right));
      const frozen = await freezeWhen(page, async () => cloudsOk(await cloudGroups(page)) && !(await emoteClashes(page)).length);
      if (!frozen.ok) { console.log('s04: the clouds never cleared the study; retaking'); continue; }
      const stillSaid = (await page.getByTestId('resident-dialogue-bubble').innerText()).replace(/\s+/g, ' ').trim();
      if (stillSaid !== LINE) throw new Error(`s04: the page changed while the clock ran ("${stillSaid}")`);
      const checks = { sheetInside: inside(sheet, win), nextInside: inside(next, win), signOutsideWindow: !overlaps(sign, win), viewportHeight: height,
        cloudsBesideStudy: (await cloudGroups(page)).filter(c => overlaps(c, strip)).map(box), clockFastForwardMs: frozen.fastForwardMs,
        houseDraggedDownCss: tidy.shift, studyWholeAboveSheet: study.y >= win.y && study.y + study.height <= sheet.y + 0.5,
        kitchenBehindSheet: kitchen.y >= sheet.y - 0.5, textSlicedAtWindowTopOrSheet: after.shift === 0 ? [] : after.slicedBefore,
        pankoButtonBeforeTap: box(pankoBox) };
      if (!checks.sheetInside || !checks.nextInside || !checks.signOutsideWindow || !checks.kitchenBehindSheet || !checks.studyWholeAboveSheet || after.shift !== 0) throw new Error(`s04 framing ${JSON.stringify(checks)}`);
      const aboveSheet = (await houseTextBoxes(page)).boxes.filter(b => b.y >= win.y && b.y + b.height <= sheet.y).map(b => b.text);
      await capture(page, { file: 's04-panko-dialogue.png', job: 's04', state: 'D', reducedMotion: false, uses: ['phone 04'],
        description: "Panko's real conversation, opened by tapping her in the kitchen: her first phase-1 line (pg_1_1), typewriter finished. The whole dialogue sheet (portrait, name, Next) fills the bottom of the window; above it the dimmed house shows the Scholar's Study, the room over the kitchen, with Archimedes. Motion on; the game clock was then fast-forwarded and paused on a moment with no drifting cloud beside the study.",
        visibleText: `Panko: ${said}. House above the sheet: ${aboveSheet.join(', ')}`, boxes: { sign, sheet, next, kitchen }, window: win, checks });
      return;
    } finally { await browser.close(); }
  }
  throw new Error('s04: could not stage the spice-jar page');
};

/** Every word the autosaved board shows or forms along its stored solution. */
async function chainWords(page) {
  const board = await page.evaluate(() => JSON.parse(localStorage.getItem('wordshift_in_progress_puzzle') || 'null'));
  if (!board?.rows) return [];
  const rows = board.rows.map(r => r.words.map(l => l.char));
  const seen = new Set(rows.map(r => r.join('')));
  for (const step of board.solution ?? []) {
    const src = rows[step.stepIndex], dst = rows[step.stepIndex + 1];
    if (!src || !dst) break;
    const at = step.removalPosition ?? src.indexOf(step.letterToMove);
    const [ch] = src.splice(at, 1);
    dst.splice(step.insertionPosition ?? dst.length, 0, ch);
    seen.add(src.join('')); seen.add(dst.join(''));
  }
  return [...seen];
}

/** Chips in the puzzle stats row (challenge undo budget, style, speed). */
async function chipBoxes(page) {
  return page.evaluate(() => {
    const out = {};
    for (const el of document.querySelectorAll('div')) {
      if (el.children.length) continue;
      const t = el.textContent?.trim() || '';
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.top > window.innerHeight * 0.45) continue;
      if (/^CHALLENGE\b/i.test(t) && !out.challenge) out.challenge = { t, x: r.left, y: r.top, width: r.width, height: r.height };
      if (/^Double Shift$/i.test(t) && !out.double) out.double = { t, x: r.left, y: r.top, width: r.width, height: r.height };
      if (/^Speed$/i.test(t) && !out.speed) out.speed = { t, x: r.left, y: r.top, width: r.width, height: r.height };
    }
    return out;
  });
}

/** The game's own dictionary (src/dictionary.ts), for screening preview labels. */
let DICTIONARY = null;
async function dictionary() {
  if (!DICTIONARY) DICTIONARY = new Set((await readFile(path.join(mobile, 'src/dictionary.ts'), 'utf8')).match(/"[A-Z]+"/g).map(w => w.slice(1, -1)));
  return DICTIONARY;
}
/**
 * Preview labels that would read as a mistake in a still: a check on a string
 * that is not a word, or a cross on a real word. On a Double Shift first drop
 * the marks grade whether the STEP can be completed, so both happen in play.
 */
async function confusingPreviews(fan) {
  const dict = await dictionary();
  const out = [];
  for (const label of fan) {
    const good = label.match(/forms ([A-Z]+), valid word$/), bad = label.match(/would form ([A-Z]+), not a valid move$/);
    if (good && !dict.has(good[1])) out.push(`check on ${good[1]}`);
    if (bad && dict.has(bad[1])) out.push(`cross on ${bad[1]}`);
  }
  return out;
}

/**
 * Slot 05: Double Shift + Challenge + Speed (state G), 432x844 at DPR 2.5.
 * The board is whatever the Double Shift bank serves, so the job retakes
 * (fresh install, same seed) until the DROP previews carry no confusing mark,
 * keeping the last take if none is clean.
 */
JOBS.s05 = async () => {
  const TAKES = 6;
  for (let take = 0; take < TAKES; take++) {
    const done = await s05Take(take, take === TAKES - 1);
    if (done) return;
  }
};
async function s05Take(take, last) {
  const { browser, page } = await launch({ width: 432, height: 768, dsf: 2.5, reducedMotion: true });
  try {
    await stageState(page, 'G');
    await openPuzzle(page);
    await finishStory(page); await dismissIntros(page);
    await waitBoard(page);
    const openMenu = async () => { await page.getByRole('button', { name: /Tap to change puzzle setup$/ }).click(); await page.waitForTimeout(700); };
    const menuOpen = () => page.getByRole('button', { name: 'Close puzzle setup', exact: true }).isVisible().catch(() => false);
    await openMenu();
    await page.setViewportSize({ width: 432, height: 1060 }); await page.waitForTimeout(800);
    for (const re of [/^Double Shift/, /^Challenge mode, off/, /^Speed Shift, off/]) {
      if (!(await menuOpen())) await openMenu();
      await page.getByRole('button', { name: re }).first().click();
      await page.waitForTimeout(2200);
      await dismissIntros(page);
    }
    if (!(await menuOpen())) await openMenu();
    await page.setViewportSize({ width: 432, height: 844 }); await page.waitForTimeout(800);
    await page.getByRole('button', { name: 'Close puzzle setup', exact: true }).click({ position: { x: 4, y: 4 } });
    await page.waitForTimeout(600);
    await playSolution(page, { selectOnlyAt: 0 });
    const tSelect = Date.now();
    await settle(page, 1200);
    await page.screenshot({ path: path.join(RAW, 's05-stacked-modes.png') });
    const msFromSelectToShot = Date.now() - tSelect;
    const clockAtShot = (await bodyText(page)).match(/\b(\d{1,3})s\b/)?.[1] ?? null;
    // Everything below is measured on the same, unchanged frame.
    const words = await boardWords(page);
    const fan = await page.getByTestId('puzzle-row-1').getByRole('button').evaluateAll(els => els.map(e => e.getAttribute('aria-label')).filter(Boolean));
    const chain = [...new Set([...(words ?? []), ...(await chainWords(page))])];
    if (chain.some(w => GRIM.includes(w) || AWKWARD.includes(w))) {
      if (last) throw new Error(`s05: grim or awkward word on every take (${chain.join(',')})`);
      console.log(`s05 take ${take}: board words ${chain.join(',')}; retaking`); return false;
    }
    const confusing = await confusingPreviews(fan);
    if (confusing.length && !last) { console.log(`s05 take ${take}: ${words?.join('/')} previews ${confusing.join('; ')}; retaking`); return false; }
    const chips = await chipBoxes(page);
    const r0 = await page.getByTestId('puzzle-row-0').boundingBox(), r1 = await page.getByTestId('puzzle-row-1').boundingBox();
    const chipTop = Math.min(...Object.values(chips).map(c => c.y));
    // The brief puts the window top 8 CSS above the chip row. The board is
    // top-anchored, so a 624 CSS window from there ends inside the third word
    // row (and through the action buttons at 844 tall) at every viewport
    // height. Instead the window's bottom edge is set in the clean gap between
    // the DROP row's preview labels and the third row's card, which brings the
    // in-game header (home button, wordmark, How to play) into the top of it.
    const rowExtent = (k, mode) => page.getByTestId(`puzzle-row-${k}`).evaluate((row, mode) => {
      const rs = [...row.querySelectorAll('*')].map(e => ({ r: e.getBoundingClientRect(), cs: getComputedStyle(e) })).filter(o => o.r.width > 0 && o.r.height > 0 && o.cs.visibility !== 'hidden');
      if (mode === 'bottom') return Math.max(...rs.map(o => o.r.bottom));
      const cards = rs.filter(o => o.r.height > 40 && (parseFloat(o.cs.borderTopWidth) >= 2 || (o.cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && o.r.width > 200)));
      return Math.min(...cards.map(o => o.r.top));
    }, mode);
    const dropBottom = await rowExtent(1, 'bottom');
    const nextRowCardTop = await rowExtent(2, 'top');
    const headerTop = Math.min(...(await Promise.all(['Go home', 'How to play'].map(n => page.getByRole('button', { name: n, exact: true }).boundingBox()))).map(b => b.y),
      ...(await page.evaluate(top => [...document.querySelectorAll('img')].map(i => i.getBoundingClientRect()).filter(r => r.bottom < top - 10 && r.width > 120).map(r => r.top), chipTop)));
    const lo = dropBottom + 2 - 624, hi = Math.min(nextRowCardTop - 2 - 624, headerTop - 4);
    if (lo > hi) throw new Error(`s05: no clean 624 CSS window ${JSON.stringify({ dropBottom, nextRowCardTop, headerTop })}`);
    const win = { x: 0, y: Math.round((lo + hi) / 2), width: 432, height: 624 };
    const checks = { take, chips: Object.fromEntries(Object.entries(chips).map(([k, v]) => [k, v.t])), rowsInside: inside(r0, win) && win.y + win.height >= dropBottom,
      windowRule: 'bottom edge in the gap between the DROP preview labels and the third row card; top edge above the in-game header (brief position 8 CSS above the chips would cut the third row)',
      dropLabelsBottomCss: round(dropBottom), thirdRowCardTopCss: round(nextRowCardTop), headerTopCss: round(headerTop), chipRowTopCss: round(chipTop),
      msFromSelectToShot, clockAtShotSeconds: clockAtShot && Number(clockAtShot), confusingPreviews: confusing, chainWords: chain };
    if (Object.keys(chips).length < 3 || !checks.rowsInside || !(Number(clockAtShot) >= 90)) throw new Error(`s05 framing ${JSON.stringify({ checks, r0, r1, win })}`);
    await record(page, { file: 's05-stacked-modes.png', job: 's05', state: 'G', reducedMotion: true, uses: ['phone 05'],
      description: 'Double Shift chosen in the real setup menu with Challenge and Speed switched on, then the first stored-solution letter picked: the undo budget chip, the style and Speed chips, the countdown, the lifted letter and the DROP previews.',
      visibleText: `Rows ${words?.join(' / ')}; chips ${Object.values(chips).map(c => c.t).join(' | ')}; clock ${clockAtShot}s; DROP row: ${fan.join(' | ')}`,
      boxes: { 'puzzle-row-0': r0, 'puzzle-row-1': r1, ...Object.fromEntries(Object.entries(chips).map(([k, v]) => [`chip:${k}`, v])) }, window: win, checks });
    return true;
  } finally { await browser.close(); }
}

/** Pit word boxes and the ward hint. */
async function pitLayout(page) {
  const words = await page.getByRole('button', { name: /^Word: .*, tap to offer$/ }).evaluateAll(els => els.map(e => {
    const r = e.getBoundingClientRect();
    return { word: e.getAttribute('aria-label').replace(/^Word: /, '').replace(/, tap to offer$/, ''), x: r.left, y: r.top, width: r.width, height: r.height };
  }));
  return { words, hint: await textBox(page, 'Something stirs below...') };
}

/**
 * Slot 06: the pit at phase 0 with its floating words (state F), 432x768 at
 * DPR 2.5, motion on. The words spawn at random spots; when none of the three
 * shots of a visit is clean, the script walks home and back into the pit
 * (real navigation), which lays the same words out afresh.
 */
JOBS.s06 = async () => {
  for (let take = 0; take < 8; take++) {
    const { browser, page } = await launch({ width: 432, height: 768, dsf: 2.5, reducedMotion: false });
    try {
      await stageState(page, 'F');
      await openPuzzle(page, { force: true });
      await finishStory(page); await dismissIntros(page);
      await waitBoard(page);
      const board = await boardWords(page);
      const chain = await chainWords(page);
      if (chain.some(w => GRIM.includes(w) || AWKWARD.includes(w))) { console.log(`s06: the stored solution passes through ${chain.join(',')}; retaking`); continue; }
      await playSolution(page);
      // Screen the victory frames (brief 10.12): no glitch text, no micro-beat overlay, no grim word.
      const victory = [];
      for (let i = 0; i < 8; i++) { victory.push(await screenText(page, GRIM)); await page.waitForTimeout(400); }
      const collect = page.getByRole('button', { name: 'Collect amber in the pit', exact: true });
      await expect(collect).toBeVisible({ timeout: 30_000 });
      if (victory.some(v => !v.ok)) { console.log('s06: victory screening failed, retaking', JSON.stringify(victory.filter(v => !v.ok))); continue; }
      await collect.click({ force: true });
      await finishStory(page, 7000);
      await page.waitForTimeout(2500);
      await dismissIntros(page);
      for (let visit = 0; visit < 10; visit++) {
        if (visit) {
          await page.getByRole('button', { name: 'Return home', exact: true }).click({ force: true });
          await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible({ timeout: 20_000 });
          await page.waitForTimeout(1200);
          for (let i = 0; i < 3; i++) await panHouse(page, -300, 8, 480);
          await page.getByRole('button', { name: /^Enter the Offering Pit/ }).first().click({ force: true });
          await page.waitForTimeout(2500);
          await dismissIntros(page);
        }
        const header = await page.getByRole('button', { name: 'Open utility menu', exact: true }).boundingBox();
        for (let shot = 0; shot < 3; shot++) {
          if (shot) await page.waitForTimeout(2500);
          await settle(page, 1200);
          const { words, hint } = await pitLayout(page);
          const vp = page.viewportSize();
          const visible = words.filter(w => w.x >= 0 && w.y >= 0 && w.x + w.width <= vp.width && w.y + w.height <= vp.height);
          const clash = words.some((a, i) => words.some((b, j) => j > i && overlaps(a, b))) || (hint && words.some(w => overlaps(w, hint)));
          const grim = words.filter(w => GRIM.includes(w.word.toUpperCase()) || AWKWARD.includes(w.word.toUpperCase()));
          const offerAll = await page.getByRole('button', { name: /^Offer All\b.*amber from/ }).first().boundingBox().catch(() => null);
          const summary = await textBox(page, 'Amber pending');
          let win = { x: 0, y: vp.height - 624, width: 432, height: 624 };
          if (offerAll) {
            const y = offerAll.y + offerAll.height + 12 - 624;
            if (y >= header.y + header.height + 2) win = { ...win, y };
          }
          const cramped = words.some(w => overlaps(w, win) && (w.y < win.y + 10 || w.x < 6 || w.x + w.width > vp.width - 6));
          const ok = !clash && !cramped && visible.length >= 3 && grim.length === 0 && hint && inside(hint, win) && visible.every(w => inside(w, win) || !overlaps(w, win));
          console.log(`s06 take ${take} visit ${visit} shot ${shot}: ${words.map(w => `${w.word}@${Math.round(w.x)},${Math.round(w.y)}`).join(' ')} clash ${clash} ok ${ok}`);
          if (!ok) { if (shot === 0 && visit > 0 && words.length) { /* words that do not drift gain nothing from waiting */ } continue; }
          const full = path.join(RAW, 's06-pit.png');
          await page.screenshot({ path: full });
          const entry = {
            file: 's06-pit.png', job: 's06', uses: ['phone 06'], state: 'F', stateSummary: stateSeed('F').summary,
            viewport: vp, deviceScaleFactor: 2.5, pixelSize: { width: 1080, height: Math.round(vp.height * 2.5) }, reducedMotion: false,
            gitHead: HEAD, gameSourceMatchesHead: SRC_CLEAN, capturedAt: new Date().toISOString(), sha256: await sha256(full),
            description: 'The Offering Pit at phase 0 right after a real win, reached through the victory card\'s Collect button: the solved chain\'s words float over the pit, the ward hint reads Something stirs below..., with the pending-amber card and the Offer All button.',
            visibleText: `Solved board ${board?.join(' / ')}; floating words ${words.map(w => w.word).join(', ')}; hint "Something stirs below..."`,
            boxesCss: Object.fromEntries([...words.map(w => [`word:${w.word}`, box(w)]), ['hint', box(hint)], ['offerAll', box(offerAll)], ['summary', box(summary)], ['headerMenu', box(header)]].filter(([, v]) => v)),
            window: windowRect(win, 2.5),
            checks: { take, pitVisit: visit, shot, victoryFramesScreened: victory.length, wordsFullyVisible: visible.length, wordBoxesOverlap: false, grimWords: [],
              offerAllInside: offerAll ? inside(offerAll, win) : null, note: visit ? 'layout from a later visit to the pit (Return home, then the pit entrance)' : 'first pit visit' },
          };
          const at = captures.findIndex(c => c.file === entry.file);
          if (at < 0) captures.push(entry); else captures[at] = entry;
          touched.add(entry.file);
          console.log('captured s06-pit.png');
          return;
        }
      }
    } finally { await browser.close(); }
  }
  throw new Error('s06: no clean pit frame');
};

/** Play into the cup scene and continue to its choice page (3/3). */
async function cupChoicePage(page) {
  await openPuzzle(page);
  await expect(page.getByRole('heading', { name: 'A place at the table', exact: true })).toBeVisible();
  const flower = page.getByRole('button', { name: 'The flower cup. Cocoa, please.', exact: true });
  for (let i = 0; i < 6 && !(await flower.isVisible().catch(() => false)); i++) {
    await page.getByTestId('story-scene-scroll').getByRole('button', { name: 'Continue', exact: true }).click();
    await page.waitForTimeout(700);
  }
  await expect(flower).toBeVisible();
  await expect(page.getByRole('button', { name: 'The chipped cup. Tea, please.', exact: true })).toBeVisible();
  await expect(page.getByText("That flower was meant to be a fox. You can be kind about it, but please don't lie.", { exact: true })).toBeVisible();
}

/** Slot 07: the cup choice page (state A), 432x768 at DPR 2.5. */
JOBS.s07 = async () => {
  const { browser, page } = await launch({ width: 432, height: 768, dsf: 2.5, reducedMotion: true });
  try {
    await stageState(page, 'A');
    await cupChoicePage(page);
    await settle(page, 1200);
    const card = await storyCardBox(page);
    if (!card.headerArt) throw new Error('s07: story card has no header art in view');
    const text = (await page.getByTestId('story-scene-scroll').innerText()).replace(/\s+/g, ' ').trim();
    await capture(page, { file: 's07-cup-choice.png', job: 's07', state: 'A', reducedMotion: true, uses: ['phone 07'],
      description: 'The first story scene, "A place at the table", on its choice page (3/3): cup-03 art, Ember asks for kindness and honesty, and both answers are offered.',
      visibleText: text, boxes: { storyCard: card, headerArt: card.headerArt, storyScroll: card.scroll }, window: card,
      checks: { scrollOverflowCss: card.scrollOverflowCss, note: 'window = the whole framed story card (nearest ancestor of story-scene-scroll that contains the header art)' } });
  } finally { await browser.close(); }
};

/** Slot 08: supper page 2 (state E), 432x768 at DPR 2.5. */
JOBS.s08 = async () => {
  const { browser, page } = await launch({ width: 432, height: 768, dsf: 2.5, reducedMotion: true });
  try {
    await stageState(page, 'E');
    await openPuzzle(page);
    await expect(page.getByRole('heading', { name: 'Before it goes cold', exact: true })).toBeVisible();
    await settle(page, 800);
    await page.getByTestId('story-scene-scroll').getByRole('button', { name: 'Continue', exact: true }).click();
    const line = 'Supper. Now. The empty place at the table can wait. The rest of us have stomachs.';
    await expect(page.getByText(line, { exact: true })).toBeVisible();
    await settle(page, 1200);
    const card = await storyCardBox(page);
    if (!card.headerArt) throw new Error('s08: story card has no header art in view');
    const text = (await page.getByTestId('story-scene-scroll').innerText()).replace(/\s+/g, ' ').trim();
    if (!/\b2\s*(\/|of)\s*7\b/.test(text + ' ' + await bodyText(page))) console.log('s08: page counter not found in text:', text);
    await capture(page, { file: 's08-supper-02.png', job: 's08', state: 'E', reducedMotion: true, uses: ['phone 08'],
      description: 'The supper scene, "Before it goes cold", after exactly one Continue: page 2 of 7 with the supper-02 art (a set table with an empty place) and Panko\'s line.',
      visibleText: text, boxes: { storyCard: card, headerArt: card.headerArt, storyScroll: card.scroll }, window: card,
      checks: { scrollOverflowCss: card.scrollOverflowCss, note: 'window = the whole framed story card (nearest ancestor of story-scene-scroll that contains the header art)' } });
  } finally { await browser.close(); }
};

/**
 * The brief's tablet T2 was the opener board with the L lifted (state A) at
 * 720x1280. At 600 CSS and wider the game scales the whole board up
 * (computeBoardScale, TABLET_MAX_SCALE 1.2) while each row card is already as
 * wide as the screen, so the scaled row cards run off both edges and the PICK /
 * DROP tags are cut in half. That is a real tablet layout defect in the current
 * build. A narrower render would show a layout no tablet gets, so there is no
 * tablet board shot: `t2` (below) is the pit instead, and `t2wide` keeps the
 * brief's frame, for reference only, as t2-board-720-as-briefed.png. Re-run
 * `t2wide` after the scale is fixed; once its row content stays on screen it
 * can become a tablet board shot again.
 */
async function openerBoardLifted(page) {
  await stageState(page, 'A');
  await openPuzzle(page);
  await finishStory(page); await dismissIntros(page);
  await waitBoard(page);
  await click(page, 'RESTART'); await page.waitForTimeout(1200);
  const words = await boardWords(page);
  if (words?.join(',') !== 'PLAY,PANT,HEAR') throw new Error(`t2: unexpected board ${words}`);
  await page.getByTestId('puzzle-row-0').getByRole('button', { name: 'Letter L', exact: true }).click();
  const fan = await page.getByTestId('puzzle-row-1').getByRole('button').evaluateAll(els => els.map(e => e.getAttribute('aria-label')).filter(Boolean));
  const vp = page.viewportSize();
  const rows = [];
  for (let k = 0; k < 3; k++) rows.push(await page.getByTestId(`puzzle-row-${k}`).evaluate(row => {
    const rs = [...row.querySelectorAll('*')].map(e => e.getBoundingClientRect()).filter(r => r.width > 0 && r.height > 0);
    return { left: Math.min(...rs.map(r => r.left)), right: Math.max(...rs.map(r => r.right)) };
  }));
  const overflow = rows.some(r => r.left < -0.5 || r.right > vp.width + 0.5);
  return { words, fan, overflow, rows };
}
/**
 * Tablet T2: the Offering Pit at phase 0 (state F), 720x1280 at DPR 2, full
 * frame, motion on so the words drift, staged like slot 06. It replaces the
 * brief's board shot, which no real tablet renders cleanly (see
 * openerBoardLifted above and raw/SUBSTITUTIONS.md).
 */
JOBS.t2 = async () => {
  for (let take = 0; take < 6; take++) {
    const { browser, page } = await launch({ width: 720, height: 1280, dsf: 2, reducedMotion: false });
    try {
      await stageState(page, 'F');
      await openPuzzle(page, { force: true });
      await finishStory(page); await dismissIntros(page);
      await waitBoard(page);
      const board = await boardWords(page);
      const chain = await chainWords(page);
      if (chain.some(w => GRIM.includes(w) || AWKWARD.includes(w))) { console.log(`t2: the stored solution passes through ${chain.join(',')}; retaking`); continue; }
      await playSolution(page);
      const victory = [];
      for (let i = 0; i < 8; i++) { victory.push(await screenText(page, GRIM)); await page.waitForTimeout(400); }
      const collect = page.getByRole('button', { name: 'Collect amber in the pit', exact: true });
      await expect(collect).toBeVisible({ timeout: 30_000 });
      if (victory.some(v => !v.ok)) { console.log('t2: victory screening failed, retaking'); continue; }
      await collect.click({ force: true });
      await finishStory(page, 7000);
      await page.waitForTimeout(2500);
      await dismissIntros(page);
      for (let visit = 0; visit < 10; visit++) {
        if (visit) {
          await page.getByRole('button', { name: 'Return home', exact: true }).click({ force: true });
          await expect(page.getByRole('button', { name: 'Play puzzle', exact: true })).toBeVisible({ timeout: 20_000 });
          await page.waitForTimeout(1200);
          for (let i = 0; i < 3; i++) await panHouse(page, -300, 8, 800);
          await page.getByRole('button', { name: /^Enter the Offering Pit/ }).first().click({ force: true });
          await page.waitForTimeout(2500);
          await dismissIntros(page);
        }
        const header = await page.getByRole('button', { name: 'Open utility menu', exact: true }).boundingBox();
        for (let shot = 0; shot < 3; shot++) {
          if (shot) await page.waitForTimeout(2500);
          await settle(page, 1200);
          const { words, hint } = await pitLayout(page);
          const vp = page.viewportSize();
          const pad = w => ({ x: w.x - 12, y: w.y - 12, width: w.width + 24, height: w.height + 24 });
          const visible = words.filter(w => w.x >= 6 && w.y >= header.y + header.height + 6 && w.x + w.width <= vp.width - 6 && w.y + w.height <= vp.height - 6);
          const clash = words.some((a, i) => words.some((b, j) => j > i && overlaps(pad(a), b))) || (hint && words.some(w => overlaps(pad(w), hint)));
          const grim = words.filter(w => GRIM.includes(w.word.toUpperCase()) || AWKWARD.includes(w.word.toUpperCase()));
          const ok = !clash && visible.length >= 3 && visible.length === words.length && grim.length === 0 && !!hint;
          console.log(`t2 take ${take} visit ${visit} shot ${shot}: ${words.map(w => `${w.word}@${Math.round(w.x)},${Math.round(w.y)}`).join(' ')} ok ${ok}`);
          if (!ok) continue;
          const summary = await textBox(page, 'Amber pending');
          await capture(page, { file: 't2-pit.png', job: 't2', state: 'F', reducedMotion: false, wait: 0, uses: ['tablet t2'],
            description: 'Tablet frame of the Offering Pit at phase 0 right after a real win, reached through the victory card\'s Collect button: the solved chain\'s words float over the pit under Something stirs below..., with the pending and lifetime harvest card and the Offer All button.',
            visibleText: `Solved board ${board?.join(' / ')}; floating words ${words.map(w => w.word).join(', ')}; hint "Something stirs below..."`,
            boxes: { ...Object.fromEntries(words.map(w => [`word:${w.word}`, w])), hint, summary },
            checks: { take, pitVisit: visit, shot, victoryFramesScreened: victory.length, wordsFullyVisible: visible.length, wordBoxesOverlap: false, grimWords: [] } });
          return;
        }
      }
    } finally { await browser.close(); }
  }
  throw new Error('t2: no clean pit frame');
};
/**
 * Tablet board: the brief's T2 frame (opener board, L lifted, 720x1280 at DPR
 * 2). The tablet enlargement used to push the row cards off both screen edges;
 * since getBoardScaleWrapperStyle lays the rows out at 1/scale of the width,
 * this frame is a real tablet board shot again and leads the tablet set. The
 * job refuses to capture if any row content leaves the screen.
 */
JOBS.t2wide = async () => {
  const { browser, page } = await launch({ width: 720, height: 1280, dsf: 2, reducedMotion: true });
  try {
    const { words, fan, overflow, rows } = await openerBoardLifted(page);
    if (overflow) throw new Error(`t2wide: row content still leaves the screen: ${JSON.stringify(rows)}`);
    await capture(page, { file: 't2-board.png', job: 't2wide', state: 'A', reducedMotion: true, uses: ['tablet t1'],
      description: 'Tablet frame of the opener board at 720x1280, DPR 2: PLAY / PANT / HEAR with the L lifted from PLAY and the DROP fan open over PANT. The board is enlarged for the tablet and every row card stays on screen.',
      visibleText: `Rows ${words.join(' / ')}; L selected; ${fan.filter(f => /^Drop zone/.test(f)).join(' | ')}`,
      checks: { rowContentInsideScreen: true, rowExtentsCss: rows } });
  } finally { await browser.close(); }
};

/** Tablet T3: the cup choice page (state A), 720x1280 at DPR 2. */
JOBS.t3 = async () => {
  const { browser, page } = await launch({ width: 720, height: 1280, dsf: 2, reducedMotion: true });
  try {
    await stageState(page, 'A');
    await cupChoicePage(page);
    const text = (await page.getByTestId('story-scene-scroll').innerText()).replace(/\s+/g, ' ').trim();
    await capture(page, { file: 't3-cup.png', job: 't3', state: 'A', reducedMotion: true, uses: ['tablet t3'],
      description: 'Tablet frame of the cup scene choice page (3/3) with the cup-03 art and both answers.',
      visibleText: text });
  } finally { await browser.close(); }
};


const wanted = process.argv.slice(2).filter(a => !a.startsWith('-'));
const run = wanted.length ? wanted : Object.keys(JOBS);
let failed = 0;
for (const id of run) {
  if (!JOBS[id]) { console.error(`unknown job ${id}`); failed++; continue; }
  try { await JOBS[id](); await writeProvenance(); }
  catch (e) { failed++; console.error(`job ${id} failed: ${e.stack || e.message}`); }
}
await writeProvenance();
process.exitCode = failed ? 1 : 0;
