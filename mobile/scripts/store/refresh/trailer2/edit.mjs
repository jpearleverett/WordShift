/**
 * Edits trailer2 ("Such a Lovely House") from the recorded clips: the 9:16
 * Play cut, the 16:9 master, the SRT, the thumbnail and contact sheets.
 *
 *   node scripts/store/refresh/trailer2/edit.mjs            # both cuts
 *   node scripts/store/refresh/trailer2/edit.mjs 9x16       # one cut
 *   node scripts/store/refresh/trailer2/edit.mjs --frames=0,130,600   # stills only
 *
 * Every picture is a real frame from $TRAILER2_WORK/clips (a crop, zoom,
 * blur, freeze or speed change of it), except the end card's wordmark and
 * lines, which sit on a real frame. Crops are computed from the per-frame DOM
 * probes each clip recorded, so preview labels (the red-cross non-words),
 * move pills, the Next sign, the ambient goal line, the header and the PLAY
 * dock never enter a used crop (asserted below).
 */
import path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { WORK, FPS, HANDLE, mobile } from './capture.mjs';
import { sharp, A, loadClip, makeComposer, renderHtml, closeBrowser, mixAudio, encode, writePng, inspect } from './engine.mjs';

const OUT = path.join(WORK, 'out');
const args = process.argv.slice(2);
const onlyFrames = args.find(a => a.startsWith('--frames='))?.slice(9).split(',').map(Number);
const kinds = args.filter(a => a === '9x16' || a === '16x9');
const W = 1080, H = 1920;
const TOTAL = 900;

// ---------------------------------------------------------------- clips and probes

const ids = ['K1', 'K2', 'K2b', 'K3', 'K4', 'K5', 'K6', 'K7a', 'K7b', 'K8', 'K9', 'K10', 'K11', 'K12'];
const K = {};
for (const id of ids) K[id] = await loadClip(id);
const P = id => K[id].ev.probes;
const S = id => K[id].ev.dsf;            // source px per CSS px
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const css2src = (id, r) => ({ x: r.x * S(id), y: r.y * S(id), w: r.w * S(id), h: r.h * S(id) });
const fail = m => { throw new Error(m); };

/**
 * BAND: the source and target rows of a board move, from the tiles' boxes
 * (the floating drag copy included) over the given clip frames, cut above the
 * target row's preview labels. Returns the CSS rectangle.
 */
function band(id, s, t, frames) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, yb = -Infinity, lab = Infinity;
  for (const f of frames) {
    const b = P(id)[f]?.board; if (!b) continue;
    for (const row of b.rows) {
      if (row.k !== s && row.k !== t) continue;
      for (const q of row.tiles) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x + q.w); }
      if (row.k === s) for (const q of row.tiles) y0 = Math.min(y0, q.y);
      if (row.k === t) { for (const q of row.tiles) yb = Math.max(yb, q.y + q.h); for (const l of row.labels) lab = Math.min(lab, l.y); }
    }
  }
  const r = { x: x0 - 12, y: y0 - 8, w: x1 - x0 + 24, h: Math.min(yb + 6, lab - 2) - (y0 - 8) };
  // No label, pill or other row may enter the band.
  for (const f of frames) {
    const b = P(id)[f]?.board; if (!b) continue;
    for (const row of b.rows) for (const l of row.labels) if (l.y < r.y + r.h && l.y + l.h > r.y && l.x < r.x + r.w && l.x + l.w > r.x) fail(`${id} f${f}: label ${l.t} inside the band`);
    for (const p of b.pills) if (p.y < r.y + r.h && p.y + p.h > r.y) fail(`${id} f${f}: pill "${p.t}" inside the band`);
  }
  return r;
}
const bandPlace = r => { const k = Math.min(3.3, 1040 / r.w); return { x: 540 - (r.w * k) / 2, y: 330, w: r.w * k, h: r.h * k, k }; };
/** A 9:16 view of the whole source frame centred on a rectangle (for blurred backdrops). */
function backdropView(id, r) {
  const m = K[id]; const w = m.w, h = Math.min(m.h, Math.round(w * 16 / 9));
  const cy = (r.y + r.h / 2) * S(id);
  return { x: 0, y: Math.max(0, Math.min(m.h - h, cy - h / 2)), w, h };
}
const lerpRect = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, w: a.w + (b.w - a.w) * u, h: a.h + (b.h - a.h) * u });
const easeIO = u => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const easeOut = u => 1 - (1 - u) ** 3;

/** Board shot: band over the shot's frames, the real band sharp over its own blurred frame. */
function boardShot(from, to, id, src, s, t, frames) {
  const r = band(id, s, t, frames);
  const pl = bandPlace(r);
  return { from, to, layers: [
    { kind: 'frame', clip: id, src, view: backdropView(id, r), blur: 36, brightness: 0.55 },
    { kind: 'frame', clip: id, src, view: css2src(id, r), place: pl },
  ], meta: { band: r, k: pl.k } };
}

// ---------------------------------------------------------------- dialogue strips (LIFT)

/** Boxes of the target sentence blocks on clip frame f (null until they exist). */
function targetBlocks(id, f, sentences) {
  const b = P(id)[f]?.blocks; if (!b) return null;
  const hits = b.blocks.filter(q => sentences.some(s => s.startsWith(q.text) && q.text.length > 0));
  return hits.length ? { hits, bubble: b.bubble, all: b.blocks } : null;
}
/**
 * The strip over the target sentences, with a fixed height from the final
 * layout and a top tracked per frame (5-frame moving average) because the
 * sheet grows upward as text types.
 */
function liftStrip(id, frames, sentences, { useBlocksX = false } = {}) {
  const last = frames[frames.length - 1];
  const fin = targetBlocks(id, last, sentences) ?? fail(`${id}: no target blocks at ${last}`);
  // The intro card has no bubble testid: frame it on the sentences themselves.
  if (!fin.bubble) useBlocksX = true;
  const x0 = useBlocksX ? Math.min(...fin.hits.map(q => q.x)) - 14 : fin.bubble.x;
  const x1 = useBlocksX ? Math.max(...fin.hits.map(q => q.x + q.w)) + 14 : fin.bubble.x + fin.bubble.w;
  // Margins: 10 CSS around the target sentences, never reaching a neighbouring
  // block (sentence blocks sit 7 apart).
  const firstT = fin.hits[0], lastT = fin.hits[fin.hits.length - 1];
  const others = fin.all.filter(q => !fin.hits.includes(q));
  const above = others.filter(q => q.y + q.h <= firstT.y + 1).map(q => firstT.y - (q.y + q.h));
  const below = others.filter(q => q.y >= lastT.y + lastT.h - 1).map(q => q.y - (lastT.y + lastT.h));
  const mTop = Math.min(10, ...above.map(g => g - 2)), mBot = Math.min(10, ...below.map(g => g - 2));
  const h = lastT.y + lastT.h - firstT.y + mTop + mBot;
  const font = fin.hits[0].fontPx;
  // Per frame the strip runs from the first target block's top to the last
  // one's bottom: the sheet springs as it rises and the text grows as it types,
  // so the strip tracks both edges exactly (a lagging average would let a
  // neighbouring sentence in). Every frame must already carry a target block.
  const tops = [], bots = [];
  frames.forEach(f => {
    const t = targetBlocks(id, f, sentences) ?? fail(`${id} f${f}: no target block yet`);
    const l = t.hits[t.hits.length - 1];
    tops.push(t.hits[0].y - mTop); bots.push(l.y + l.h + mBot);
  });
  // assert: no other block inside the strip on any frame
  frames.forEach((f, i) => {
    const b = P(id)[f]?.blocks; if (!b) return;
    for (const q of b.blocks) {
      const isTarget = sentences.some(s => s.startsWith(q.text));
      const inside = q.y < bots[i] - 2 && q.y + q.h > tops[i] + 2;
      if (inside && !isTarget) fail(`${id} f${f}: block "${q.text}" inside the strip`);
    }
  });
  const k = Math.min(68 / font, 1040 / (x1 - x0));
  return { x0, x1, h, k, tops, bots, frames, font };
}
function liftShot(from, to, id, frames, sentences, opts = {}) {
  const st = liftStrip(id, frames, sentences, opts);
  const w = (st.x1 - st.x0) * st.k, hh = st.h * st.k;
  const idx = t => Math.max(0, Math.min(st.frames.length - 1, t));
  const bottomY = 640 + hh / 2;
  const hAt = rel => st.bots[idx(rel)] - st.tops[idx(rel)];
  const place = (_k, t) => { const hi = hAt(t - from) * st.k; return { x: 540 - w / 2, y: bottomY - hi, w, h: hi }; };
  const vp = K[id].ev.viewport;
  const bw = 276 * (vp.width / 432), bh = bw * 16 / 9;
  const back = css2src(id, { x: (st.x0 + st.x1) / 2 - bw / 2 < 0 ? 0 : Math.min(vp.width - bw, (st.x0 + st.x1) / 2 - bw / 2), y: vp.height - bh, w: bw, h: bh });
  const push = opts.push ?? 1.0;
  return { from, to, layers: [
    { kind: 'frame', clip: id, src: rel => st.frames[idx(rel)], view: back, blur: 14, brightness: 0.62 },
    { kind: 'frame', clip: id, src: rel => st.frames[idx(rel)], outline: { px: 4, color: '#3B2416', shadowPx: 18 },
      view: rel => {
        const u = (to - from) ? rel / (to - from) : 0, z = 1 + (push - 1) * easeIO(u);
        const r = { x: st.x0, y: st.tops[idx(rel)], w: st.x1 - st.x0, h: hAt(rel) };
        const c = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
        return css2src(id, { x: c.x - r.w / z / 2, y: c.y - r.h / z / 2, w: r.w / z, h: r.h / z });
      }, place },
  ], meta: { strip: { x0: st.x0, x1: st.x1, h: st.h, k: st.k, font: st.font } } };
}

// ---------------------------------------------------------------- marks from the recordings

const kc = K['K1'].ev.marks?.cardVisible ?? 76;            // victory card mostly opaque (checked by eye: clip 76)
const fc8 = (() => { const f = Object.keys(P('K8')).map(Number).sort((a, b) => a - b).find(f => P('K8')[f]?.blocks?.blocks?.some(q => q.text === 'I must have.')); return f ?? fail('K8: "I must have." never completes'); })();
const fe12 = (() => { const f = Object.keys(P('K12')).map(Number).sort((a, b) => a - b).find(f => P('K12')[f]?.blocks?.blocks?.[0]?.text === 'I am fond of you, whatever my fire is up to.'); return f ?? fail('K12: block 1 never completes'); })();
const i0 = K['K2'].events.find(e => /Axel moves in/.test(e.action))?.frame ?? 192;

// ---------------------------------------------------------------- house views

const houseX = (id, f) => { const d = P(id)[f]?.den; return d.x + d.w / 2; };
/** Phone close-up: 276x491 CSS from y 205, x-centred on the house (clear of the ambient line and the dock). */
function phoneView(id, f0 = 0) {
  const r = { x: houseX(id, f0) - 138, y: 205, w: 276, h: 491 };
  return css2src(id, r);
}
function assertClear(id, frames, rCss, what) {
  for (const f of frames) {
    const c = P(id)[f]?.chrome; if (!c) continue;
    const hit = b => b && b.y < rCss.y + rCss.h && b.y + b.h > rCss.y && b.x < rCss.x + rCss.w && b.x + b.w > rCss.x;
    if (hit(c.next)) fail(`${id} f${f}: ${what} crop takes in the Next sign`);
    if (hit(c.dock)) fail(`${id} f${f}: ${what} crop takes in the PLAY dock`);
    for (const a of c.ambient) if (a.op > 0 && hit(a)) fail(`${id} f${f}: ${what} crop takes in the ambient line "${a.t}"`);
  }
}

// ---------------------------------------------------------------- timeline (9:16)

const shots = [];
const K1 = 'K1';
// S1: the hook. 60 fps clip; r2 = real time. Frame 0 = clip 8: the L mid-air over the open fan.
const c0 = 8;
{
  const bandA = band(K1, 0, 1, range(c0, 26));
  const bandB = band(K1, 1, 2, range(42, 69));
  const pA = bandPlace(bandA), pB = bandPlace(bandB);
  const srcA = rel => c0 + rel * 2;
  shots.push({ id: 'S1a', from: 0, to: 13, layers: [
    { kind: 'frame', clip: K1, src: srcA, view: backdropView(K1, bandA), blur: 36, brightness: 0.55 },
    { kind: 'frame', clip: K1, src: srcA, view: css2src(K1, bandA), place: pA }] });
  // f14-24 the camera moves down to rows 1-2 (clip 20..40)
  shots.push({ id: 'S1b', from: 14, to: 24, layers: [
    { kind: 'frame', clip: K1, src: rel => c0 + 12 + rel * 2, view: rel => backdropView(K1, lerpRect(bandA, bandB, easeIO(rel / 10))), blur: 36, brightness: 0.55 },
    { kind: 'frame', clip: K1, src: rel => c0 + 12 + rel * 2, view: rel => css2src(K1, lerpRect(bandA, bandB, easeIO(rel / 10))), place: k => lerpRect(pA, pB, easeIO(k)) }] });
  // f25-32 rows 1-2: T lifts and drops (clip 42..66 at real time would need 12 frames; drop lands at f~29)
  const srcB = rel => Math.min(66, 52 + rel * 2);
  shots.push({ id: 'S1c', from: 25, to: 31, layers: [
    { kind: 'frame', clip: K1, src: rel => 54 + rel * 2, view: backdropView(K1, bandB), blur: 36, brightness: 0.55 },
    { kind: 'frame', clip: K1, src: rel => 54 + rel * 2, view: css2src(K1, bandB), place: pB }] });
  // f32-35 HEART at half speed (clip 66..69)
  shots.push({ id: 'S1d', from: 32, to: 35, layers: [
    { kind: 'frame', clip: K1, src: rel => 66 + rel, view: backdropView(K1, bandB), blur: 36, brightness: 0.55 },
    { kind: 'frame', clip: K1, src: rel => 66 + rel, view: css2src(K1, bandB), place: pB }] });
  // f36-65 the victory card: stars, PERFECT!, FLAWLESS! and the word journey
  // (PAY, PLAN, HEART), filling the width from y 330 to the clear zone. The
  // crop is the settled card's width (the "results" probe box is the whole
  // screen, so it is measured from the settled frame instead: card x 36-396)
  // and ends in the parchment between the journey and the amber breakdown.
  const v = P(K1)[kc + 40]?.victory?.boxes ?? fail('K1: no victory boxes');
  const rib = v.ribbon ?? fail('K1: no ribbon box');
  const cardX0 = 36, cardX1 = 396, cutY = 414;
  if (rib.y + rib.h > cutY - 60) fail('K1: the ribbon sits too low for the card crop');
  const h = (cardX1 - cardX0) * 1110 / 1080;
  const cardCrop = { x: cardX0, y: cutY - h, w: cardX1 - cardX0, h };
  shots.push({ id: 'S1e', from: 36, to: 65, layers: [
    { kind: 'frame', clip: K1, src: rel => kc + rel * 2, view: backdropView(K1, cardCrop), blur: 28, brightness: 0.7 },
    { kind: 'frame', clip: K1, src: rel => kc + rel * 2, view: css2src(K1, cardCrop), place: { x: 0, y: 330, w: 1080, h: 1110 } }] });
}

// S2: the valley (K2, 60 fps, real time), crop A pushing in to crop B.
{
  const f = 0, ch = P('K2')[f].chrome, den = P('K2')[f].den, aq = P('K2')[f].aquarium;
  const cx = den.x + den.w / 2;
  const cropA = { x: cx - 267, y: ch.dock.y - 8 - 950, w: 534, h: 950 };
  const cropB = { x: cx - 200, y: aq.y - 265, w: 400, h: 711 };
  for (const r of [cropA, cropB]) if (r.y < ch.next.y + ch.next.h + 4) fail(`K2 crop starts above the Next sign: ${JSON.stringify(r)}`);
  assertClear('K2', range(0, 104), cropA, 'S2 A');
  shots.push({ id: 'S2', from: 66, to: 118, layers: [
    { kind: 'frame', clip: 'K2', src: { start: 0, rate: 2 }, view: [{ at: 0, ...css2src('K2', cropA) }, { at: 1, ...css2src('K2', cropB), ease: 'inOut' }] }] });
  // S3: FRIEND pops (K3 opens on the drop).
  shots.push({ id: 'S3', ...boardShot(119, 131, 'K3', { start: 0, rate: 1 }, 0, 1, range(0, 12)) });
  // S4: the "A NEW FRIEND!" medallion (K2b clip 8..34), push 1.00 to 1.05.
  const m = P('K2b')[20].medallion;
  const u = { x: Math.min(m.portrait.x, m.ribbon.x) - 12, y: m.portrait.y - 12 };
  u.w = Math.max(m.portrait.x + m.portrait.w, m.ribbon.x + m.ribbon.w) + 12 - u.x;
  u.h = m.ribbon.y + m.ribbon.h + 12 - u.y;
  const km = Math.min(4.5, 900 / u.w);
  const zoom = z => { const c = { x: u.x + u.w / 2, y: u.y + u.h / 2 }; return css2src('K2b', { x: c.x - u.w / z / 2, y: c.y - u.h / z / 2, w: u.w / z, h: u.h / z }); };
  shots.push({ id: 'S4', from: 132, to: 158, layers: [
    { kind: 'frame', clip: 'K2b', src: { start: 8, rate: 1 }, view: backdropView('K2b', u), blur: 28, brightness: 0.6 },
    { kind: 'frame', clip: 'K2b', src: { start: 8, rate: 1 }, view: [{ at: 0, ...zoom(1) }, { at: 1, ...zoom(1.05), ease: 'inOut' }], place: { x: 540 - (u.w * km) / 2, y: 700 - (u.h * km) / 2, w: u.w * km, h: u.h * km } }] });
  // S5: Axel moves in, 2x slow (K2 60 fps at r1), crop B static.
  shots.push({ id: 'S5', from: 159, to: 171, layers: [{ kind: 'frame', clip: 'K2', src: { start: i0 + 2, rate: 1 }, view: css2src('K2', cropB) }] });
}
// S6: "Oh!" / "Hello!"
shots.push({ id: 'S6', ...liftShot(172, 198, 'K2b', range(56, 82), ['Oh!', 'Hello!'], { useBlocksX: true }) });
// S7: the volume run: SWING, CLOVER, PICKLED.
shots.push({ id: 'S7a', ...boardShot(199, 211, 'K4', { start: 0, rate: 1 }, 0, 1, range(0, 12)) });
shots.push({ id: 'S7b', ...boardShot(212, 224, 'K5', { start: 0, rate: 1 }, 0, 1, range(0, 12)) });
// K6 starts at its release (f13) like K4 and K5: before it the arc shows the
// neutral preview ghosts (LPICKED, PLICKED...) over the target row.
shots.push({ id: 'S7c', ...boardShot(225, 250, 'K6', { start: 13, rate: 1 }, 0, 1, range(13, 38)) });
// S8: the Jungle Hammock is built (jump cut in the same framing).
{
  const v = phoneView('K7a', 0);
  assertClear('K7a', [...range(-14, -1), ...range(21, 46)], { x: v.x / 5, y: v.y / 5, w: v.w / 5, h: v.h / 5 }, 'S8');
  shots.push({ id: 'S8a', from: 251, to: 264, layers: [{ kind: 'frame', clip: 'K7a', src: { start: -14, rate: 1 }, view: v }] });
  shots.push({ id: 'S8b', from: 265, to: 290, layers: [{ kind: 'frame', clip: 'K7a', src: { start: 21, rate: 1 }, view: v }] });
}
// S9: Sloane's three Geralds.
shots.push({ id: 'S9', ...liftShot(291, 396, 'K7b', range(0, 105), ['Three moths live in my fur.', 'I call all three Gerald.'], { push: 1.04 }) });
// S10: Panko in her kitchen (before the tap), push 1.00 to 1.03.
{
  const v = phoneView('K8', 7);
  assertClear('K8', range(7, 59), { x: v.x / 5, y: v.y / 5, w: v.w / 5, h: v.h / 5 }, 'S10');
  const z = s => ({ x: v.x + v.w * (1 - 1 / s) / 2, y: v.y + v.h * (1 - 1 / s) / 2, w: v.w / s, h: v.h / s });
  shots.push({ id: 'S10', from: 397, to: 449, layers: [{ kind: 'frame', clip: 'K8', src: { start: 7, rate: 1 }, view: [{ at: 0, ...z(1) }, { at: 1, ...z(1.03), ease: 'inOut' }] }] });
}
// S11: "I must have moved them in my sleep." / "I must have." typing in; completes on f472,
// four frames before the music's hard stop at f476.
shots.push({ id: 'S11', ...liftShot(450, 555, 'K8', range(fc8 - 22, fc8 + 83), ['I must have moved them in my sleep.', 'I must have.'], { push: 1.03 }) });
// S12/S13: the locked frame: afternoon, then the same frame at sunset, pulling back.
const wide = (id, spec) => {
  const f = 0, ch = P(id)[f].chrome, cx = houseX(id, f);
  if (spec.bottomDock !== undefined) return { x: cx - spec.w / 2, y: ch.dock.y - spec.bottomDock - spec.h, w: spec.w, h: spec.h };
  const amb = Math.max(...ch.ambient.map(a => a.y + a.h), ch.next.y + ch.next.h);
  return { x: cx - spec.w / 2, y: amb + spec.topGap, w: spec.w, h: spec.h };
};
const W2 = id => wide(id, { w: 1000, h: 1778, bottomDock: 27 });
const W3 = id => wide(id, { w: 1200, h: 2133, bottomDock: 22 });
const W4 = id => wide(id, { w: 1330, h: 2364, topGap: 13 });
{
  const d9 = P('K9')[0].den, d10 = P('K10')[0].den;
  if (Math.abs(d9.y - d10.y) > 1.5 || Math.abs(d9.x - d10.x) > 1.5) fail(`K9/K10 dens differ: ${JSON.stringify([d9, d10])}`);
  assertClear('K9', range(0, 25), W2('K9'), 'S12');
  assertClear('K10', range(0, 163), W3('K10'), 'S13/S17');
  shots.push({ id: 'S12', from: 556, to: 581, layers: [{ kind: 'frame', clip: 'K9', src: { start: 0, rate: 1 }, view: css2src('K9', W2('K9')) }] });
  shots.push({ id: 'S13', from: 582, to: 641, layers: [{ kind: 'frame', clip: 'K10', src: { start: 0, rate: 1 }, view: [{ at: 0, ...css2src('K10', W2('K10')) }, { at: 1, ...css2src('K10', W3('K10')), ease: 'out' }] }] });
}
// S14: the dusk board, the hook's move again: L into PANT, PLANT.
shots.push({ id: 'S14', ...boardShot(642, 682, 'K11', { start: -14, rate: 1 }, 0, 1, range(-14, 26)) });
// S15: Ember by the fire at dusk.
{
  const v = phoneView('K12', 27);
  assertClear('K12', range(27, 39), { x: v.x / 5, y: v.y / 5, w: v.w / 5, h: v.h / 5 }, 'S15');
  shots.push({ id: 'S15', from: 683, to: 695, layers: [{ kind: 'frame', clip: 'K12', src: { start: 27, rate: 1 }, view: v }] });
}
// S16: Ember's line types in, the picture freezes on the completed line and pushes in.
{
  const frames = range(40, fe12);
  const sh = liftShot(696, 795, 'K12', frames, ['I am fond of you, whatever my fire is up to.']);
  const freezeAt = 696 + frames.length - 1;
  sh.postZoom = { from: freezeAt, to: 795, s0: 1, s1: 1.1, cx: 540, cy: 640, ease: 'inOut' };
  shots.push({ id: 'S16', ...sh, meta: { ...sh.meta, freezeAt } });
}
// S17: the end card on the real sunset house.
const endLayers = [];
{
  shots.push({ id: 'S17', from: 796, to: 899, layers: [
    { kind: 'frame', clip: 'K10', src: { start: 60, rate: 1 }, view: rel => css2src('K10', lerpRect(W3('K10'), W4('K10'), easeOut(Math.min(1, rel / 19)))) }] });
}

// ---------------------------------------------------------------- captions and end card

const fontCss = `.cap { font-family: 'Figtree-Bold'; font-size: 76px; line-height: 1.12; color: var(--ink); white-space: nowrap; text-align: center; }`;
async function cardFrame(skin, w, h) {
  const dir = A(`ui/panels/${skin}`);
  const part = f => sharp(path.join(dir, f));
  // The card's solid centre is the skin's fillCard (theme/pixelSkin.generated.ts).
  const hexFill = { bright: '#EBD8B2', dusk: '#DCC49B' }[skin];
  const n = parseInt(hexFill.slice(1), 16);
  const fill = { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, alpha: 1 };
  const base = sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });
  const comp = [
    { input: await sharp({ create: { width: w - 108, height: h - 108, channels: 4, background: fill } }).png().toBuffer(), left: 54, top: 54 },
    { input: await part('card_top.png').resize(w - 126, 54, { fit: 'fill', kernel: 'nearest' }).png().toBuffer(), left: 63, top: 0 },
    { input: await part('card_bottom.png').resize(w - 126, 54, { fit: 'fill', kernel: 'nearest' }).png().toBuffer(), left: 63, top: h - 54 },
    { input: await part('card_left.png').resize(54, h - 126, { fit: 'fill', kernel: 'nearest' }).png().toBuffer(), left: 0, top: 63 },
    { input: await part('card_right.png').resize(54, h - 126, { fit: 'fill', kernel: 'nearest' }).png().toBuffer(), left: w - 54, top: 63 },
    { input: await part('card_tl.png').png().toBuffer(), left: 0, top: 0 },
    { input: await part('card_tr.png').png().toBuffer(), left: w - 63, top: 0 },
    { input: await part('card_bl.png').png().toBuffer(), left: 0, top: h - 63 },
    { input: await part('card_br.png').png().toBuffer(), left: w - 63, top: h - 63 },
  ];
  return { png: await base.composite(comp).png().toBuffer(), fill };
}
async function plaque(text, skin = 'bright', size = 76) {
  const ink = skin === 'dusk' ? '#33201E' : '#3B2416';
  let t = await renderHtml(`<div class="cap" style="--ink:${ink}; font-size:${size}px">${text}</div>`, fontCss, { width: 1400 });
  if (t.width > 844 && size === 76) return plaque(text, skin, 68);
  const w = Math.min(1020, t.width + 176), h = 184;
  const { png } = await cardFrame(skin, w, h);
  const img = await sharp(png).composite([{ input: t.png, left: Math.round((w - t.width) / 2), top: Math.round((h - t.height) / 2) }]).png().toBuffer();
  return { png: img, w, h, textWidth: t.width, size };
}
const CAPTIONS = [
  { id: 1, text: 'Every word you make', from: 0, to: 65 },
  { id: 2, text: 'helps build them a home.', from: 66, to: 118 },
  { id: 3, text: 'Over 4,000 puzzles.', from: 199, to: 250 },
  { id: 4, text: 'Who moved the spice jars?', from: 397, to: 449 },
  { id: 5, text: 'Where did the day go?', from: 586, to: 641, skin: 'dusk' },
];
const captions = [];
for (const c of CAPTIONS) {
  const p = await plaque(c.text, c.skin ?? 'bright');
  captions.push({ ...c, png: p.png, left: Math.round(540 - p.w / 2), top: 120, size: p.size, w: p.w, h: p.h });
}
// End card: the wordmark and two lines over the real sunset house.
const endCss = `.e { font-family: 'Figtree-Bold'; font-size: 84px; color: #FFF3DC; white-space: nowrap; padding: 30px;
  text-shadow: 4px 4px 0 #3B2416, 0 0 18px rgba(59,36,22,0.5), 0 0 18px rgba(59,36,22,0.5); }`;
const e1 = await renderHtml(`<div class="e">It's a lovely house.</div>`, endCss, { width: 1400 });
const e2 = await renderHtml(`<div class="e">Isn't it?</div>`, endCss, { width: 1400 });
const mark = await sharp(A('ui/wordmark.png')).resize(760, 190).png().toBuffer();
// The gradient ends at y 820 (cy 300 + r 520); the image stops at 840 so
// nothing added reaches the bottom clear zone.
const vignette = await sharp(Buffer.from(`<svg width="${W}" height="840" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g" cx="540" cy="300" r="520" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity="0.2"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="840" fill="url(#g)"/></svg>`)).png().toBuffer();
captions.push({ id: 'vig', png: vignette, left: 0, top: 0, from: 796, to: 899, fadeIn: 12 });
captions.push({ id: 'mark', png: mark, left: 540 - 380, top: 300 - 95, from: 800, to: 899, fadeIn: 10 });
captions.push({ id: 'E1', png: e1.png, left: Math.round(540 - e1.width / 2), top: Math.round(510 - e1.height / 2), from: 807, to: 899 });
captions.push({ id: 'E2', png: e2.png, left: Math.round(540 - e2.width / 2), top: Math.round(620 - e2.height / 2), from: 852, to: 899 });
for (const c of captions) {
  const m = await sharp(c.png).metadata();
  if (c.top + m.height > 1440) fail(`caption ${c.id} reaches y ${c.top + m.height} (> 1440)`);
}

// ---------------------------------------------------------------- audio

const secs = f => f / FPS;
const beds = [
  { file: A('music/home_phase0.mp3'), ss: 23.28, at: 0, dur: secs(476), fadeIn: [0, 0.01], fadeOut: [secs(476) - 0.015, 0.015], lufs: -20 },
  { file: A('music/home_phase0.mp3'), ss: 23.28 + secs(503), at: secs(503), dur: secs(582 - 503), fadeIn: [0, 0.08], fadeOut: [secs(582 - 503) - 0.015, 0.015], lufs: -29, filter: 'lowpass=f=1200' },
  { file: A('music/home_phase2.mp3'), ss: 66.22, at: secs(642), dur: secs(696 + (fe12 - 40) - 642), fadeIn: [0, 0.3], fadeOut: [secs(696 + (fe12 - 40) - 642) - 0.015, 0.015], lufs: -22 },
];
const SND = f => A(`sounds/${f}`);
const clipTime = (shot, clipFrame, rate = 1, start = 0) => shot.from + (clipFrame - start) / rate;
const sfx = [];
const add = (file, frame, gainDb = 0, why = '') => sfx.push({ file: SND(file), at: frame / FPS, gainDb, why });
// S1: the hook's events (clip frames at 60 fps, played at r2 from c0 = 8; HEART at half speed from 66)
add('letter_select.wav', 0, -6, 'the L already in the hand');
add('valid_move.wav', (26 - c0) / 2, 0, 'PLANT');
add('letter_select.wav', (42 - c0) / 2 - 6, -6, 'the T lifts');
add('valid_move_2.wav', 32, 0, 'HEART');
for (const e of K['K1'].events.filter(e => /star|PERFECT/.test(e.action))) add(e.sfx, 36 + (e.frame - kc) / 2, e.sfx === 'perfect.wav' ? -2 : 0, e.action);
add('valid_move_3.wav', 119, 0, 'FRIEND');
add('ui_tap.wav', 132, -8, 'the invite card');
add('unlock.wav', 159, 0, 'Axel moves in');
add('dialogue.wav', 172, -4, 'Axel speaks');
add('valid_move_4.wav', 199, -3, 'SWING'); add('valid_move_4.wav', 212, -3, 'CLOVER');
add('letter_select.wav', 225, -6, 'the L out of FLAVOR'); add('valid_move_4.wav', 238, 0, 'PICKLED'); add('star_pop_3.wav', 238, -4, 'PICKLED');
add('unlock.wav', 265, 0, 'the Jungle Hammock is built');
add('dialogue.wav', 291, -4, 'Sloane speaks');
add('dialogue.wav', 450, -6, 'Panko speaks');
add('valid_move.wav', 656, -2, 'PLANT at dusk');
add('dialogue.wav', 696, -6, 'Ember speaks');
add('valid_move.wav', 852, -10, 'the lone chime under "Isn\'t it?"');

// ---------------------------------------------------------------- output

await mkdir(OUT, { recursive: true });
const cut916 = { W, H, shots, captions };
const compose916 = makeComposer(cut916);
const report = { builtAt: new Date().toISOString(), fps: FPS, frames: TOTAL, marks: { kc, fc8, fe12, i0 }, shots: shots.map(s => ({ id: s.id, from: s.from, to: s.to, meta: s.meta ?? null, clips: [...new Set(s.layers.filter(l => l.kind === 'frame').map(l => l.clip))] })),
  captions: captions.filter(c => typeof c.id === 'number').map(c => ({ id: c.id, text: c.text, from: c.from, to: c.to, size: c.size, w: c.w })) };

if (onlyFrames) {
  for (const t of onlyFrames) await writePng(await compose916(t), W, H, path.join(OUT, 'frames', `f${String(t).padStart(3, '0')}.png`));
  console.log(`wrote ${onlyFrames.length} frames to ${path.join(OUT, 'frames')}`);
} else {
  const mix = path.join(OUT, 'mix.wav');
  report.audio = mixAudio({ beds, sfx, duration: TOTAL / FPS, out: mix });
  console.log('audio', JSON.stringify(report.audio.final));
  if (!kinds.length || kinds.includes('9x16')) {
    const out = path.join(OUT, 'trailer2-9x16-1080x1920.mp4');
    await encode({ W, H, frames: TOTAL, compose: compose916, audio: mix, out });
    report.out916 = inspect(out);
  }
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
}
await closeBrowser();
