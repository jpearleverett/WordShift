/**
 * Edits trailer2 ("Such a Lovely House", cut 2) from the recorded clips: the
 * 9:16 Play cut and the 16:9 master, with the captions SRT.
 *
 *   node scripts/store/refresh/trailer2/edit.mjs            # both cuts
 *   node scripts/store/refresh/trailer2/edit.mjs 9x16       # one cut
 *   node scripts/store/refresh/trailer2/edit.mjs --frames=0,130,600   # stills only
 *
 * Cut 2 answers a blind panel that preferred the first trailer to cut 1. The
 * board is shown whole, with its own check and cross previews, under a caption
 * that states the rule; each resident's line is their real dialogue sheet
 * (portrait, name, words) under a panel of their own room, never a strip of
 * text over a blurred copy of itself; music runs from the first frame to the
 * last; no board or dialogue crop clips a label.
 *
 * Every picture is a real frame from $TRAILER2_WORK/clips (a crop, zoom, blur,
 * freeze or speed change of it), except the caption plaques and the end card's
 * wordmark and lines. House crops never take in the Next sign, the ambient goal
 * line or the PLAY dock (asserted below).
 */
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { WORK, FPS } from './capture.mjs';
import { sharp, A, loadClip, clipFile, makeComposer, renderHtml, closeBrowser, mixAudio, encode, writePng, inspect } from './engine.mjs';

const OUT = path.join(WORK, 'out');
const args = process.argv.slice(2);
const onlyFrames = args.find(a => a.startsWith('--frames='))?.slice(9).split(',').map(Number);
const kinds = args.filter(a => a === '9x16' || a === '16x9');
const W = 1080, H = 1920;
const TOTAL = 900;

// ---------------------------------------------------------------- clips and probes

const ids = ['K1', 'K2', 'K2b', 'K4', 'K5', 'K6', 'K7a', 'K7b', 'K8', 'K9', 'K10', 'K12'];
const K = {};
for (const id of ids) K[id] = await loadClip(id);
const P = id => K[id].ev.probes;
const S = id => K[id].ev.dsf;            // source px per CSS px
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const css2src = (id, r) => ({ x: r.x * S(id), y: r.y * S(id), w: r.w * S(id), h: r.h * S(id) });
const fail = m => { throw new Error(m); };
const lerpRect = (a, b, u) => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, w: a.w + (b.w - a.w) * u, h: a.h + (b.h - a.h) * u });
const easeOut = u => 1 - (1 - u) ** 3;
const zoomAbout = (r, z) => ({ x: r.x + r.w * (1 - 1 / z) / 2, y: r.y + r.h * (1 - 1 / z) / 2, w: r.w / z, h: r.h / z });

// ---------------------------------------------------------------- marks from the recordings

const kc = K['K1'].ev.marks?.cardVisible ?? 76;            // victory card mostly opaque (clip 76)
const i0 = K['K2'].events.find(e => /Axel moves in/.test(e.action))?.frame ?? 192;
const firstFrame = (id, test) => Object.keys(P(id)).map(Number).sort((a, b) => a - b).find(f => test(P(id)[f])) ?? fail(`${id}: mark not found`);
// Panko: "I must have." completes; Ember: "I want you to know that." completes,
// before her next sentence ("I'm not offering it as an excuse...") starts,
// which the cut never shows.
const fc8 = firstFrame('K8', p => p?.blocks?.blocks?.some(q => q.text === 'I must have.'));
const fe12 = firstFrame('K12', p => p?.blocks?.blocks?.some(q => q.text === 'I want you to know that.'));
const fe12next = firstFrame('K12', p => (p?.blocks?.blocks?.length ?? 0) >= 3);
if (fe12next <= fe12) fail('K12: the third sentence starts before the second completes');

// ---------------------------------------------------------------- house views

const houseX = (id, f) => { const d = P(id)[f]?.den; return d.x + d.w / 2; };
/** Phone close-up: 276x491 CSS from y 205, x-centred on the house (clear of the ambient line and the dock). */
const phoneView = (id, f0 = 0, y = 205) => css2src(id, { x: houseX(id, f0) - 138, y, w: 276, h: 491 });
function assertClear(id, frames, rCss, what) {
  for (const f of frames) {
    const c = P(id)[f]?.chrome; if (!c) continue;
    const hit = b => b && b.y < rCss.y + rCss.h && b.y + b.h > rCss.y && b.x < rCss.x + rCss.w && b.x + b.w > rCss.x;
    if (hit(c.next)) fail(`${id} f${f}: ${what} crop takes in the Next sign`);
    if (hit(c.dock)) fail(`${id} f${f}: ${what} crop takes in the PLAY dock`);
    for (const a of c.ambient) if (a.op > 0 && hit(a)) fail(`${id} f${f}: ${what} crop takes in the ambient line "${a.t}"`);
  }
}
const wide = (id, spec) => {
  const f = 0, ch = P(id)[f].chrome, cx = houseX(id, f);
  if (spec.bottomDock !== undefined) return { x: cx - spec.w / 2, y: ch.dock.y - spec.bottomDock - spec.h, w: spec.w, h: spec.h };
  const amb = Math.max(...ch.ambient.map(a => a.y + a.h), ch.next.y + ch.next.h);
  return { x: cx - spec.w / 2, y: amb + spec.topGap, w: spec.w, h: spec.h };
};
const W2 = id => wide(id, { w: 1000, h: 1778, bottomDock: 27 });
const W3 = id => wide(id, { w: 1200, h: 2133, bottomDock: 22 });
const W4 = id => wide(id, { w: 1330, h: 2364, topGap: 13 });

// ---------------------------------------------------------------- the whole board

/**
 * The phone screen, 432x768 CSS from y 60 at 2.5x: the wordmark, the
 * difficulty chip, every row with its PICK/DROP tag and the fan's check and
 * cross labels. The caption plaque covers the move pill.
 */
const BOARD_Y0 = 60;
const boardView = id => css2src(id, { x: 0, y: BOARD_Y0, w: 432, h: 768 });

// ---------------------------------------------------------------- dialogue cards

/**
 * The dialogue sheet's top edge on a clip frame, found on the pixels: the
 * sheet's wood border is a bright row under a 3 CSS dark outline, across the
 * whole width, above the bubble (or the intro card's first sentence).
 */
const lum = (d, i) => 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
async function sheetTop(id, f) {
  const b = P(id)[f]?.blocks ?? fail(`${id} f${f}: no dialogue probe`);
  const anchor = b.bubble ? b.bubble.y : b.blocks[0].y;
  const { data, info } = await sharp(clipFile(K[id], f)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const s = S(id), cols = [60, 100, 330].map(x => Math.round(x * s));
  for (let y = Math.round((anchor - 110) * s) + 3; y < Math.round(anchor * s); y++) {
    if (cols.every(x => lum(data, (y * info.width + x) * 3) > 115) && cols.every(x => lum(data, ((y - 3) * info.width + x) * 3) < 75)) return (y - 3) / s - 2.4;
  }
  return fail(`${id} f${f}: no sheet top above ${anchor}`);
}
/**
 * A resident's line: their real dialogue sheet (portrait, name, words, from
 * the sheet's top edge to `bottom`), in the space between the caption and the clear zone,
 * over their part of the house, dimmed as the game dims it behind a sheet
 * (the phone view of the frame before the tap, softened a little). The caption
 * plaque above it carries the line's point in large type for muted viewing.
 */
async function cardShot(sid, from, to, id, srcAt, room, { k = 2.42, bottom = K[id].ev.viewport.height } = {}) {
  const n = to - from + 1;
  const tops = [];
  for (let rel = 0; rel < n; rel++) tops.push(await sheetTop(id, srcAt(rel)));
  // The tallest the sheet gets is centred between the caption (to y 330) and
  // the clear zone (y 1430); the sheet grows upward from that bottom as it types.
  const hMax = (bottom - Math.min(...tops)) * k;
  const bottomY = Math.min(1430, 330 + (1100 + hMax) / 2);
  const idx = rel => Math.max(0, Math.min(n - 1, rel));
  const cardW = 432 * k;
  const hAt = rel => bottom - tops[idx(rel)];
  const highest = bottomY - hMax;
  if (highest < 330) fail(`${sid}: the card reaches y ${Math.round(highest)}, under the caption`);
  return { id: sid, from, to, layers: [
    { kind: 'frame', clip: room.clip, src: { start: room.f, rate: 0 }, view: room.view, blur: 10, brightness: 0.4 },
    { kind: 'frame', clip: id, src: rel => srcAt(idx(rel)), outline: { px: 4, color: '#3B2416', shadowPx: 18 },
      view: rel => css2src(id, { x: 0, y: tops[idx(rel)], w: 432, h: hAt(rel) }),
      place: (_k, t) => { const h = hAt(t - from) * k; return { x: 540 - cardW / 2, y: bottomY - h, w: cardW, h }; } },
  ], meta: { card: { k, bottom, tops: [Math.min(...tops), Math.max(...tops)], highest: Math.round(highest) } } };
}

// ---------------------------------------------------------------- timeline (9:16)

const shots = [];
let cursor = 0;
const next = n => { const from = cursor; cursor += n; return [from, cursor - 1]; };

// H1: the rule, then the win, on the whole board in one unbroken view. K1 is
// 60 fps: half speed from the L in the hand (clip -6) to its drop (26) and over
// the T's drag (42 to 66), each drag holding 0.4 s over its checked slot
// (clips 23 and 62: the tile above PLANT, then above HEART) so the check reads;
// real time between and after, through the victory card (stars at clips 79,
// 90 and 103).
const H1_MAP = [[0, -6, 1], [29, 23, 0], [41, 23, 1], [44, 26, 2], [52, 42, 1], [72, 62, 0], [84, 62, 1], [88, 66, 2]];
const H1_BOARD = 88;
const h1Clip = rel => { let seg = H1_MAP[0]; for (const m of H1_MAP) if (rel >= m[0]) seg = m; return seg[1] + (rel - seg[0]) * seg[2]; };
{
  const [from, to] = next(111);
  const src = h1Clip;
  if (src(H1_BOARD) !== 66 || src(44) !== 26 || src(52) !== 42 || src(29) !== 23 || src(41) !== 23) fail('H1 speed map is off its marks');
  shots.push({ id: 'H1', from, to, layers: [{ kind: 'frame', clip: 'K1', src, view: boardView('K1') }], meta: { clip: `K1 -12..${src(104)}` } });
}
// H2: the house (K2, 60 fps, real time), crop A pushing in to crop B at the
// empty aquarium's invite card; it ends before K2's own invite dialog opens
// (clip 120), which H3 shows whole from K2b.
{
  const f = 0, ch = P('K2')[f].chrome, den = P('K2')[f].den, aq = P('K2')[f].aquarium;
  const cx = den.x + den.w / 2;
  const cropA = { x: cx - 267, y: ch.dock.y - 8 - 950, w: 534, h: 950 };
  const cropB = { x: cx - 200, y: aq.y - 265, w: 400, h: 711 };
  for (const r of [cropA, cropB]) if (r.y < ch.next.y + ch.next.h + 4) fail(`K2 crop starts above the Next sign: ${JSON.stringify(r)}`);
  assertClear('K2', range(0, 160), cropA, 'H2 A');
  const [from, to] = next(60);
  if ((to - from) * 2 >= 120) fail('H2 runs into the invite dialog');
  shots.push({ id: 'H2', from, to, layers: [
    { kind: 'frame', clip: 'K2', src: { start: 0, rate: 2 }, view: [{ at: 0, ...css2src('K2', cropA) }, { at: 1, ...css2src('K2', cropB), ease: 'inOut' }] }] });
  // H3: the whole invite card ("A NEW FRIEND!", Axel, the Invite button; K2b
  // clip 6..38), pushing in, over a dark blur of the house around the empty
  // aquarium (not of the card itself).
  // The card with its whole frame (CSS 28-404 x 120-640), under the caption.
  const card = { x: 18, y: 112, w: 396, h: 536 };
  const kv = 1.98;
  const [f3, t3] = next(48);
  shots.push({ id: 'H3', from: f3, to: t3, layers: [
    { kind: 'frame', clip: 'K2', src: { start: 150, rate: 0 }, view: css2src('K2', cropB), blur: 40, brightness: 0.45 },
    { kind: 'frame', clip: 'K2b', src: { start: 6, rate: 1 }, outline: { px: 4, color: '#3B2416', shadowPx: 18 },
      view: [{ at: 0, ...css2src('K2b', card) }, { at: 1, ...css2src('K2b', zoomAbout(card, 1.04)), ease: 'inOut' }],
      place: { x: 540 - (card.w * kv) / 2, y: 332, w: card.w * kv, h: card.h * kv } }] });
  // (Axel moving in is not shown: the game's scrim is still fading there, and
  // the welcome confetti reads as a glitch at that size.)
}
// H4: three whole boards: EASY and MED+ from the drag into the drop, EXPERT from
// its drop (its drag fans neutral ghost words across the target row). The chips read.
for (const [sid, id, start] of [['H4a', 'K4', -12], ['H4b', 'K5', -10], ['H4c', 'K6', 13]]) {
  const [from, to] = next(36);
  shots.push({ id: sid, from, to, layers: [{ kind: 'frame', clip: id, src: { start, rate: 1 }, view: boardView(id) }] });
}
// H5: the Jungle Hammock is built (jump cut in the same framing), then Sloane.
{
  const v = phoneView('K7a', 0);
  assertClear('K7a', [...range(-14, -1), ...range(21, 46)], { x: v.x / 5, y: v.y / 5, w: v.w / 5, h: v.h / 5 }, 'H5');
  const [fa, ta] = next(14);
  shots.push({ id: 'H5a', from: fa, to: ta, layers: [{ kind: 'frame', clip: 'K7a', src: { start: -14, rate: 1 }, view: v }] });
  const [fb, tb] = next(32);
  shots.push({ id: 'H5b', from: fb, to: tb, layers: [{ kind: 'frame', clip: 'K7a', src: { start: 21, rate: 1 }, view: v }] });
}
{
  const [from, to] = next(78);
  shots.push(await cardShot('H5c', from, to, 'K7b', rel => rel, { clip: 'K7a', f: 46, view: phoneView('K7a', 0) }));
}
// H6: Panko in her kitchen (before the tap), then her line: the last two
// sentences type in, "I must have." completes a second in.
{
  // 20 CSS higher than the other phone views, so the caption sits on the
  // aquarium and clears the Scholar's Study nameplate.
  const v = phoneView('K8', 7, 185);
  assertClear('K8', range(7, 52), { x: v.x / 5, y: v.y / 5, w: v.w / 5, h: v.h / 5 }, 'H6');
  const [from, to] = next(42);
  shots.push({ id: 'H6a', from, to, layers: [{ kind: 'frame', clip: 'K8', src: { start: 7, rate: 1 }, view: [{ at: 0, ...zoomAbout(v, 1) }, { at: 1, ...zoomAbout(v, 1.03), ease: 'inOut' }] }] });
}
{
  const [from, to] = next(90);
  const s0 = fc8 - 31;
  shots.push(await cardShot('H6b', from, to, 'K8', rel => s0 + rel, { clip: 'K8', f: 30, view: phoneView('K8', 7) }));
}
// H7: the locked frame: afternoon, then the same frame at sunset, pulling back.
{
  const d9 = P('K9')[0].den, d10 = P('K10')[0].den;
  if (Math.abs(d9.y - d10.y) > 1.5 || Math.abs(d9.x - d10.x) > 1.5) fail(`K9/K10 dens differ: ${JSON.stringify([d9, d10])}`);
  assertClear('K9', range(0, 26), W2('K9'), 'H7a');
  assertClear('K10', range(0, 163), W3('K10'), 'H7b/END');
  const [fa, ta] = next(36);
  shots.push({ id: 'DAY', from: fa, to: ta, layers: [{ kind: 'frame', clip: 'K9', src: { start: 0, rate: 1 }, view: css2src('K9', W2('K9')) }] });
  const [fb, tb] = next(69);
  shots.push({ id: 'DUSK', from: fb, to: tb, layers: [{ kind: 'frame', clip: 'K10', src: { start: 0, rate: 1 }, view: [{ at: 0, ...css2src('K10', W2('K10')) }, { at: 1, ...css2src('K10', W3('K10')), ease: 'out' }] }] });
}
// H8: Ember by the fire at dusk, then her line typing in; it holds (frozen) on
// the completed two sentences, before her third begins.
{
  const v = phoneView('K12', 22);
  assertClear('K12', range(22, 39), { x: v.x / 5, y: v.y / 5, w: v.w / 5, h: v.h / 5 }, 'H8');
  const [from, to] = next(18);
  shots.push({ id: 'H8a', from, to, layers: [{ kind: 'frame', clip: 'K12', src: { start: 22, rate: 1 }, view: v }] });
}
{
  const [from, to] = next(84);
  const s0 = 52;
  // Ember's name (CSS y 749-758) sits on the screen's bottom edge, which cuts
  // its underline, so her card ends at 745, under the Next button; the caption
  // names her.
  shots.push(await cardShot('H8b', from, to, 'K12', rel => Math.min(fe12, s0 + rel), { clip: 'K12', f: 30, view: phoneView('K12', 22) }, { bottom: 745 }));
}
// END: the real sunset house, pulling back.
const END0 = cursor;
{
  const [from, to] = next(TOTAL - cursor);
  shots.push({ id: 'END', from, to, layers: [
    { kind: 'frame', clip: 'K10', src: { start: 45, rate: 1 }, view: rel => css2src('K10', lerpRect(W3('K10'), W4('K10'), easeOut(Math.min(1, rel / 19)))) }] });
}
if (cursor !== TOTAL) fail(`timeline is ${cursor} frames, not ${TOTAL}`);
// Nothing added below y 1440: a placed layer with an outline adds its outline
// and a drop shadow (about 27 px below the layer), so those must end above it.
for (const s of shots) for (const l of s.layers) if (l.place && l.outline) for (let t = s.from; t <= s.to; t++) {
  const k = (t - s.from) / Math.max(1, s.to - s.from);
  const p = typeof l.place === 'function' ? l.place(k, t) : l.place;
  if (p.y + p.h + l.outline.px + 27 > 1440) fail(`${s.id} f${t}: an outlined layer's shadow reaches y ${Math.round(p.y + p.h + l.outline.px + 27)}`);
}
const shotOf = sid => shots.find(s => s.id === sid) ?? fail(`no shot ${sid}`);

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
/** A plaque of one or more lines (each line nowrap), 76 px, or 68 px when a line is wider than 844. */
async function plaque(lines, skin = 'bright', size = 76) {
  const ink = skin === 'dusk' ? '#33201E' : '#3B2416';
  const t = await renderHtml(`<div class="cap" style="--ink:${ink}; font-size:${size}px">${lines.join('<br>')}</div>`, fontCss, { width: 1400 });
  if (t.width > 844 && size === 76) return plaque(lines, skin, 68);
  const w = Math.min(1020, t.width + 176), h = 184 + (lines.length - 1) * Math.round(size * 1.12);
  const { png } = await cardFrame(skin, w, h);
  const img = await sharp(png).composite([{ input: t.png, left: Math.round((w - t.width) / 2), top: Math.round((h - t.height) / 2) }]).png().toBuffer();
  return { png: img, w, h, textWidth: t.width, size };
}
// The plaque sits over the move pill on the board shots (the pill is CSS y 201
// on K1 and 227 on K4-K6, so y 300 and 360 at 2.5x from y 60), and at y 120
// over the house and above the dialogue cards. Caption 1 leaves as the victory
// card rises.
const CAPTIONS = [
  { id: 1, lines: ['One letter. Two real words.'], shot: 'H1', to: H1_BOARD + 1, top: 300 },
  { id: 2, lines: ['Solve puzzles.', 'Build them a home.'], shot: 'H2', top: 120 },
  { id: 3, lines: ['13 friends to welcome.'], shot: 'H3', top: 120 },
  { id: 4, lines: ['Over 4,000 puzzles.'], shot: ['H4a', 'H4c'], top: 360 },
  { id: 5, lines: ['More rooms. More neighbors.'], shot: ['H5a', 'H5b'], top: 120 },
  { id: 6, lines: ['Three moths.', 'All named Gerald.'], shot: 'H5c', top: 120 },
  { id: 7, lines: ['Who moved the spice jars?'], shot: ['H6a', 'H6b'], top: 120 },
  { id: 8, lines: ['Where did the day go?'], shot: 'DUSK', top: 120, skin: 'dusk' },
  { id: 9, lines: ['Ember is fond of you.'], shot: 'H8b', top: 120, skin: 'dusk' },
].map(c => {
  const [a, b] = Array.isArray(c.shot) ? c.shot : [c.shot, c.shot];
  return { ...c, text: c.lines.join(' '), from: shotOf(a).from, to: c.to !== undefined ? shotOf(a).from + c.to : shotOf(b).to };
});
const captions = [];
for (const c of CAPTIONS) {
  const p = await plaque(c.lines, c.skin ?? 'bright');
  captions.push({ ...c, png: p.png, left: Math.round(540 - p.w / 2), size: p.size, w: p.w, h: p.h });
}
// End card: the wordmark and two lines over the real sunset house.
const E1_AT = END0 + 11, E2_AT = END0 + 56;
const endCss = `.e { font-family: 'Figtree-Bold'; font-size: 84px; color: #FFF3DC; white-space: nowrap; padding: 30px;
  text-shadow: 4px 4px 0 #3B2416, 0 0 18px rgba(59,36,22,0.5), 0 0 18px rgba(59,36,22,0.5); }`;
const e1 = await renderHtml(`<div class="e">It's a lovely house.</div>`, endCss, { width: 1400 });
const e2 = await renderHtml(`<div class="e">Isn't it?</div>`, endCss, { width: 1400 });
const mark = await sharp(A('ui/wordmark.png')).resize(760, 190).png().toBuffer();
// The gradient ends at y 820 (cy 300 + r 520); the image stops at 840 so
// nothing added reaches the bottom clear zone.
const vignette = await sharp(Buffer.from(`<svg width="${W}" height="840" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g" cx="540" cy="300" r="520" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity="0.38"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="840" fill="url(#g)"/></svg>`)).png().toBuffer();
captions.push({ id: 'vig', png: vignette, left: 0, top: 0, from: END0, to: TOTAL - 1, fadeIn: 12 });
captions.push({ id: 'mark', png: mark, left: 540 - 380, top: 300 - 95, from: END0 + 4, to: TOTAL - 1, fadeIn: 10 });
captions.push({ id: 'E1', png: e1.png, left: Math.round(540 - e1.width / 2), top: Math.round(510 - e1.height / 2), from: E1_AT, to: TOTAL - 1 });
captions.push({ id: 'E2', png: e2.png, left: Math.round(540 - e2.width / 2), top: Math.round(620 - e2.height / 2), from: E2_AT, to: TOTAL - 1 });
for (const c of captions) {
  const m = await sharp(c.png).metadata();
  if (c.top + m.height > 1440) fail(`caption ${c.id} reaches y ${c.top + m.height} (> 1440)`);
}

// ---------------------------------------------------------------- 16:9 master

const W16 = 1920, H16 = 1080;
// The roof's top (chimney) in K10, measured on the frames: CSS y 1202. K9's
// house is a room shorter (its next unlock is not a room), so the same view
// shows its roof lower; the house grows between the two shots.
const ROOF_K10 = 1202;
const cx10 = houseX('K10', 0);
const WIDE16 = { x: cx10 - 750, y: ROOF_K10 - 260, w: 1500, h: 844 };
const END16a = { x: cx10 - 600, y: ROOF_K10 - 500, w: 1200, h: 675 };
const END16b = { x: cx10 - 750, y: ROOF_K10 - 500, w: 1500, h: 844 };
assertClear('K9', range(0, 26), WIDE16, 'DAY 16:9');
assertClear('K10', range(0, 163), WIDE16, 'DUSK 16:9');
assertClear('K10', range(45, 163), END16b, 'END 16:9');
// Every other shot is remapped from its 9:16 layers. A layer with no place (a
// blurred backdrop) fills the 16:9 frame. A full-frame phone view becomes a
// sharp 608x1080 column 96 px from the right edge (mirroring the captions'
// 96 px left margin) over a blurred copy of itself. Placed layers (the card,
// the medallion, the room panel and the dialogue sheet) keep their 9:16 layout,
// scaled as one group into the area the caption leaves free, never above 1.2x.
const COL = { x: 1216, w: 608, h: 1080 };
const edgeRaw = (() => { const raw = Buffer.alloc(6 * H16 * 3); for (let i = 0; i < raw.length; i += 3) { raw[i] = 0x3B; raw[i + 1] = 0x24; raw[i + 2] = 0x16; } return raw; })();
const placeAt = (layer, shot, t) => {
  const k = Math.max(0, Math.min(1, (t - shot.from) / Math.max(1, shot.to - shot.from)));
  return typeof layer.place === 'function' ? layer.place(k, t) : layer.place;
};
const captions16 = [];
for (const c of CAPTIONS) {
  const p = await plaque(c.lines, c.skin ?? 'bright', 68);
  if (96 + p.w > COL.x - 24) fail(`16:9 caption "${c.text}" (${p.w} wide) reaches the column`);
  captions16.push({ ...c, png: p.png, left: 96, top: 72, h: p.h });
}
function remap16(s) {
  const out = [];
  const placed = s.layers.filter(l => l.place);
  if (!placed.length) {
    for (const l of s.layers) {
      out.push({ ...l, blur: 36, brightness: 0.55, place: undefined });
      out.push({ kind: 'fn', render: async () => ({ raw: edgeRaw, left: COL.x - 6, top: 0, w: 6, h: H16 }) });
      out.push({ kind: 'fn', render: async () => ({ raw: edgeRaw, left: COL.x + COL.w, top: 0, w: 6, h: H16 }) });
      out.push({ ...l, place: { x: COL.x, y: 0, w: COL.w, h: COL.h } });
    }
    return { id: s.id, from: s.from, to: s.to, layers: out };
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let t = s.from; t <= s.to; t++) for (const l of placed) {
    const p = placeAt(l, s, t); x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x + p.w); y1 = Math.max(y1, p.y + p.h);
  }
  const capBottom = Math.max(0, ...captions16.filter(c => c.from <= s.to && c.to >= s.from).map(c => 72 + c.h + 28));
  const top = Math.max(60, capBottom);
  const area = { x: 96, y: top, w: 1728, h: 1020 - top };
  const sc = Math.min(1.2, area.w / (x1 - x0), area.h / (y1 - y0));
  const ox = area.x + area.w / 2 - ((x0 + x1) / 2) * sc, oy = area.y + area.h / 2 - ((y0 + y1) / 2) * sc;
  const map = p => ({ x: ox + p.x * sc, y: oy + p.y * sc, w: p.w * sc, h: p.h * sc });
  for (const l of s.layers) {
    // The backdrop is seen much larger here than in 9:16, so it takes more blur.
    if (!l.place) { out.push({ ...l, place: undefined, blur: Math.max(56, l.blur ?? 0) }); continue; }
    const pl = l.place;
    out.push({ ...l, place: typeof pl === 'function' ? (k, t) => map(pl(k, t)) : map(pl) });
  }
  return { id: s.id, from: s.from, to: s.to, layers: out, meta16: { scale: sc } };
}
const shots16 = shots.map(s => {
  if (s.id === 'DAY') return { id: s.id, from: s.from, to: s.to, layers: [{ kind: 'frame', clip: 'K9', src: { start: 0, rate: 1 }, view: css2src('K9', WIDE16) }] };
  if (s.id === 'DUSK') return { id: s.id, from: s.from, to: s.to, layers: [{ kind: 'frame', clip: 'K10', src: { start: 0, rate: 1 }, view: css2src('K10', WIDE16) }] };
  if (s.id === 'END') return { id: s.id, from: s.from, to: s.to, layers: [{ kind: 'frame', clip: 'K10', src: { start: 45, rate: 1 },
    view: rel => css2src('K10', lerpRect(END16a, END16b, easeOut(Math.min(1, rel / 19)))) }] };
  return remap16(s);
});
{
  const e1b = await renderHtml(`<div class="e" style="font-size:76px">It's a lovely house.</div>`, endCss, { width: 1400 });
  const e2b = await renderHtml(`<div class="e" style="font-size:76px">Isn't it?</div>`, endCss, { width: 1400 });
  const vig16 = await sharp(Buffer.from(`<svg width="${W16}" height="760" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g" cx="960" cy="300" r="620" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity="0.38"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><rect width="${W16}" height="760" fill="url(#g)"/></svg>`)).png().toBuffer();
  captions16.push({ id: 'vig', png: vig16, left: 0, top: 0, from: END0, to: TOTAL - 1, fadeIn: 12 });
  captions16.push({ id: 'mark', png: mark, left: 960 - 380, top: 210 - 95, from: END0 + 4, to: TOTAL - 1, fadeIn: 10 });
  captions16.push({ id: 'E1', png: e1b.png, left: Math.round(960 - e1b.width / 2), top: Math.round(400 - e1b.height / 2), from: E1_AT, to: TOTAL - 1 });
  captions16.push({ id: 'E2', png: e2b.png, left: Math.round(960 - e2b.width / 2), top: Math.round(500 - e2b.height / 2), from: E2_AT, to: TOTAL - 1 });
  // E2's text bottom must sit 40 px above the chimney in every END frame.
  for (let rel = 0; rel < TOTAL - END0; rel++) {
    const v = lerpRect(END16a, END16b, easeOut(Math.min(1, rel / 19)));
    if ((ROOF_K10 - v.y) * (W16 / v.w) - (500 + 38) < 40) fail(`16:9 end card: E2 within 40 px of the chimney at END+${rel}`);
  }
}
const compose16 = makeComposer({ W: W16, H: H16, shots: shots16, captions: captions16 });

// ---------------------------------------------------------------- audio

// One bed from the first frame to the last: the day bed until the dusk cut,
// then the dusk bed (a 0.3 s crossfade on the cut) under the dusk house,
// Ember and the end card, fading out over the last 1.2 s.
const secs = f => f / FPS;
const dusk = shotOf('DUSK').from;
const beds = [
  { file: A('music/home_phase0.mp3'), ss: 23.28, at: 0, dur: secs(dusk) + 0.15, fadeIn: [0, 0.01], fadeOut: [secs(dusk) - 0.15, 0.3], lufs: -20 },
  { file: A('music/home_phase2.mp3'), ss: 66.22, at: secs(dusk) - 0.15, dur: secs(TOTAL - dusk) + 0.15, fadeIn: [0, 0.3], fadeOut: [secs(TOTAL - dusk) + 0.15 - 1.2, 1.2], lufs: -20 },
];
const SND = f => A(`sounds/${f}`);
const sfx = [];
const add = (file, frame, gainDb = 0, why = '') => sfx.push({ file: SND(file), at: frame / FPS, gainDb, why });
// H1 (K1 at 60 fps; see H1_MAP): the L is in the hand at rel 0, PLANT at clip
// 26, the T lifts at clip 42, HEART at clip 66; PERFECT! and the stars follow
// at real time. clipToRel finds the first output frame showing a clip frame.
const clipToRel = c => { for (let r = 0; r < 111; r++) if (h1Clip(r) >= c) return r; return fail(`clip ${c} is not in H1`); };
add('letter_select.wav', 0, -8, 'the L in the hand');
add('valid_move.wav', clipToRel(26), 0, 'PLANT');
add('letter_select.wav', clipToRel(42), -6, 'the T lifts');
add('valid_move_2.wav', clipToRel(66), 0, 'HEART');
for (const e of K['K1'].events.filter(e => /star|PERFECT/.test(e.action))) add(e.sfx, clipToRel(e.frame), e.sfx === 'perfect.wav' ? -2 : 0, e.action);
add('ui_tap.wav', shotOf('H3').from, -8, 'the invite');
add('letter_select.wav', shotOf('H4a').from, -8, 'the W lifts');
add('valid_move.wav', shotOf('H4a').from + 12, -2, 'SWING');
add('valid_move_2.wav', shotOf('H4b').from + 10, -2, 'CLOVER');
add('valid_move_3.wav', shotOf('H4c').from, 0, 'PICKLED');
add('unlock.wav', shotOf('H5b').from, 0, 'the Jungle Hammock is built');
add('dialogue.wav', shotOf('H5c').from, -4, 'Sloane speaks');
add('dialogue.wav', shotOf('H6b').from, -6, 'Panko speaks');
add('dialogue.wav', shotOf('H8b').from, -6, 'Ember speaks');

// ---------------------------------------------------------------- captions SRT

const ts = f => { const ms = Math.round(f / FPS * 1000); const p = (n, w = 2) => String(n).padStart(w, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
// One line per cue, as trailer.captions in the listing JSON holds them.
const cues = [...CAPTIONS.map(c => ({ from: c.from, to: c.to + 1, text: c.text })),
  { from: E1_AT, to: E2_AT, text: "It's a lovely house." }, { from: E2_AT, to: TOTAL, text: "Isn't it?" }];
const srt = cues.map((c, i) => `${i + 1}\n${ts(c.from)} --> ${ts(c.to)}\n${c.text}\n`).join('\n');

// ---------------------------------------------------------------- output

await mkdir(OUT, { recursive: true });
const compose916 = makeComposer({ W, H, shots, captions });
const report = { builtAt: new Date().toISOString(), fps: FPS, frames: TOTAL, marks: { kc, fc8, fe12, fe12next, i0, END0 },
  shots: shots.map(s => ({ id: s.id, from: s.from, to: s.to, meta: s.meta ?? null, clips: [...new Set(s.layers.filter(l => l.kind === 'frame').map(l => l.clip))] })),
  captions: CAPTIONS.map(c => ({ id: c.id, text: c.text, from: c.from, to: c.to })), cues };

if (onlyFrames) {
  for (const t of onlyFrames) {
    if (!kinds.length || kinds.includes('9x16')) await writePng(await compose916(t), W, H, path.join(OUT, 'frames', `f${String(t).padStart(3, '0')}.png`));
    if (kinds.includes('16x9')) await writePng(await compose16(t), W16, H16, path.join(OUT, 'frames16', `f${String(t).padStart(3, '0')}.png`));
  }
  console.log(`wrote ${onlyFrames.length} frames to ${path.join(OUT, 'frames')}`);
} else {
  await writeFile(path.join(OUT, 'captions2-en.srt'), srt);
  const mix = path.join(OUT, 'mix.wav');
  report.audio = mixAudio({ beds, sfx, duration: TOTAL / FPS, out: mix });
  console.log('audio', JSON.stringify(report.audio.final));
  if (!kinds.length || kinds.includes('9x16')) {
    const out = path.join(OUT, 'trailer2-9x16-1080x1920.mp4');
    await encode({ W, H, frames: TOTAL, compose: compose916, audio: mix, out });
    report.out916 = inspect(out);
  }
  if (!kinds.length || kinds.includes('16x9')) {
    const out = path.join(OUT, 'trailer2-16x9-1920x1080.mp4');
    await encode({ W: W16, H: H16, frames: TOTAL, compose: compose16, audio: mix, out });
    report.out169 = inspect(out);
  }
  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
}
await closeBrowser();
