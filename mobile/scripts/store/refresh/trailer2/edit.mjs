/**
 * Edits trailer2 ("Such a Lovely House") from the recorded clips: the 9:16
 * Play cut and the 16:9 master, with the captions SRT, into $TRAILER2_WORK/out.
 * install.mjs then copies them into the campaign's video/ folder.
 *
 *   node scripts/store/refresh/trailer2/edit.mjs            # both cuts
 *   node scripts/store/refresh/trailer2/edit.mjs 9x16       # one cut
 *   node scripts/store/refresh/trailer2/edit.mjs --frames=0,130,600   # stills only
 *
 * The cut answers seven rounds of a blind panel and the owner's notes
 * (video/README.md). The board is shown whole, with its own check and cross
 * previews, and every move plays in real motion: the finger's short pause over
 * each checked slot plays at 2x, and the winning drop runs on into the victory
 * card; no frame is held. Each resident's line is their real dialogue sheet
 * (portrait, name, words), closed at the bottom with the game's own frame art,
 * pushing in slowly over their part of the house dimmed as the game dims it.
 * The house is seen as a phone sees it: one scroll from the pit to the roof
 * while the evening comes down the house. Every caption and line stays up long
 * enough to read. Music runs from the first frame to the last.
 *
 * Every picture is a real frame from $TRAILER2_WORK/clips (a crop, zoom, blur,
 * speed change or dissolve of it), except the caption plaques, the bottom
 * border that closes each dialogue sheet, the sweep from afternoon to sunset
 * (a transition between two recordings of the same scroll, the sunset frames
 * laid floor by floor on the afternoon ones), and the end card's wordmark,
 * lines and the flat evening fill it extends above the roof. House crops never
 * take in the Next sign, the ambient goal line or the PLAY dock (asserted
 * below).
 */
import { Buffer } from 'node:buffer';
import path from 'node:path';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { WORK, FPS, HANDLE } from './capture.mjs';
import { sharp, A, loadClip, clipFile, makeComposer, renderHtml, closeBrowser, mixAudio, encode, writePng, inspect } from './engine.mjs';

const OUT = path.join(WORK, 'out');
const args = process.argv.slice(2);
const onlyFrames = args.find(a => a.startsWith('--frames='))?.slice(9).split(',').map(Number);
const kinds = args.filter(a => a === '9x16' || a === '16x9');
const W = 1080, H = 1920;

// ---------------------------------------------------------------- clips and probes

const ids = ['K1', 'K2', 'K2b', 'K4', 'K5', 'K6', 'K7a', 'K7b', 'K8', 'K12', 'K13', 'K14'];
const K = {};
for (const id of ids) K[id] = await loadClip(id);
const P = id => K[id].ev.probes;
const S = id => K[id].ev.dsf;            // source px per CSS px
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const css2src = (id, r) => ({ x: r.x * S(id), y: r.y * S(id), w: r.w * S(id), h: r.h * S(id) });
const fail = m => { throw new Error(m); };
const easeInOut = u => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2);
const sine = u => 0.5 - Math.cos(Math.PI * Math.max(0, Math.min(1, u))) / 2;
const zoomAbout = (r, z) => ({ x: r.x + r.w * (1 - 1 / z) / 2, y: r.y + r.h * (1 - 1 / z) / 2, w: r.w / z, h: r.h / z });
const eventAt = (id, re) => K[id].events.find(e => re.test(e.action))?.frame ?? fail(`${id}: no event ${re}`);

// ---------------------------------------------------------------- marks from the recordings

// K1 (60 fps): the L is pressed at -15, arrives over PANT's checked PLANT slot
// at 22, hovers there and drops at 44; the T is pressed at 60, arrives over
// HEAR's HEART slot at 97 and drops at 119 (record.mjs K1_MARKS).
const M1 = { lPress: -15, lArrive: 22, lDrop: 44, tPress: 60, tArrive: 97, tDrop: 119 };
{
  const presses = K['K1'].events.filter(e => /press on the letter/.test(e.action)).map(e => e.frame);
  const drops = K['K1'].events.filter(e => /release into the drop zone/.test(e.action)).map(e => e.frame);
  if (presses.join() !== [M1.lPress, M1.tPress].join() || drops.join() !== [M1.lDrop, M1.tDrop].join()) fail(`K1 marks moved: ${presses} / ${drops}`);
}
const kc = K['K1'].ev.marks?.cardHalfOpaque ?? fail('K1: no victory mark');
const i0 = eventAt('K2', /Axel moves in/);
const k2bInvite = eventAt('K2b', /Invite for 100 amber/);
const k7Tap = eventAt('K7a', /tap the Jungle Hammock card/);
const k7Built = eventAt('K7a', /the room is built/);
const k8Tap = eventAt('K8', /tap Panko/);
const k12Tap = eventAt('K12', /tap Ember/);
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
const hitBox = (b, r) => b && b.y < r.y + r.h && b.y + b.h > r.y && b.x < r.x + r.w && b.x + b.w > r.x;
function assertClear(id, frames, rCss, what) {
  for (const f of frames) {
    const c = P(id)[f]?.chrome; if (!c) continue;
    if (hitBox(c.next, rCss)) fail(`${id} f${f}: ${what} crop takes in the Next sign`);
    if (hitBox(c.dock, rCss)) fail(`${id} f${f}: ${what} crop takes in the PLAY dock`);
    for (const a of c.ambient) if (a.op > 0 && hitBox(a, rCss)) fail(`${id} f${f}: ${what} crop takes in the ambient line "${a.t}"`);
  }
}
/** No resident emote over a room or name plaque inside a crop. */
function assertNoEmote(id, frames, rCss, what) {
  for (const f of frames) for (const e of P(id)[f]?.emote ?? []) {
    if (typeof e === 'string') { fail(`${id} f${f}: ${what} has an emote over ${e}`); }
    if (e.y < rCss.y + rCss.h && e.y + e.h > rCss.y) fail(`${id} f${f}: ${what} shows an emote over ${e.text}`);
  }
}

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
    if (cols.every(x => lum(data, (y * info.width + x) * 3) > 115) && cols.every(x => lum(data, ((y - 3) * info.width + x) * 3) < 75)) return (y - 3) / s - SHEET_MARGIN;
  }
  return fail(`${id} f${f}: no sheet top above ${anchor}`);
}

/**
 * The game's dialogue sheet is a bottom sheet: its frame has no bottom row
 * (NineSliceFrame openBottom), because in the game it runs off the bottom of
 * the screen. Lifted out of the screen, it would read as cut off, so the card
 * is closed with the same skin's own bottom corners and edge
 * (assets/ui/panels/<skin>/panel_bl, panel_bottom, panel_br), laid out as
 * NineSliceFrame lays out a closed panel (corners PANEL_CORNER_DP 36, edge
 * PANEL_EDGE_DP 30, the edge tucked 1 dp under each corner, the solid fill
 * between), then a 0.6 CSS hairline to match the one the crop keeps above
 * the top outline. The skin is the one whose left strip matches the sheet's
 * pixels.
 */
const CORNER_DP = 36, EDGE_DP = 30, SHEET_MARGIN = 0.6;
const SHEET_EXT = CORNER_DP + SHEET_MARGIN;
const SKINS = ['bright', 'dusk', 'storm', 'dark', 'serene'];
async function sheetCloser(id, refFrame, topCss, bottomCss) {
  const s = S(id);
  const { data, info } = await sharp(clipFile(K[id], refFrame)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => { const i = (Math.round(y) * info.width + Math.round(x)) * 3; return { r: data[i], g: data[i + 1], b: data[i + 2] }; };
  const E = Math.round(EDGE_DP * s), C = Math.round(CORNER_DP * s), Wp = info.width;
  // Which skin: the left strip against each skin's panel_left, one row above the bottom.
  const row = Math.round((bottomCss - 20) * s);
  let best = null;
  for (const skin of SKINS) {
    const L = await sharp(A(`ui/panels/${skin}/panel_left.png`)).resize(E, 4, { kernel: 'nearest', fit: 'fill' }).removeAlpha().raw().toBuffer();
    let ssd = 0;
    for (let x = 0; x < E; x++) for (let c = 0; c < 3; c++) { const d = data[(row * Wp + x) * 3 + c] - L[(2 * E + x) * 3 + c]; ssd += d * d; }
    ssd /= E * 3;
    if (!best || ssd < best.ssd) best = { skin, ssd };
  }
  if (best.ssd > 400) fail(`${id}: the sheet's frame matches no skin (best ${best.skin}, ${Math.round(best.ssd)})`);
  const fill = px(Wp / 2, bottomCss * s - 6);
  // Behind the new corners' stepped notches and the hairline below the border:
  // the card's own outline colour, so they read as the outline, not a backdrop.
  const back = { r: 0x3B, g: 0x24, b: 0x16 };
  const part = f => sharp(A(`ui/panels/${best.skin}/${f}`));
  const corner = async f => sharp({ create: { width: C, height: C, channels: 3, background: back } })
    .composite([{ input: await part(f).resize(C, C, { kernel: 'nearest' }).png().toBuffer(), left: 0, top: 0 }]).png().toBuffer();
  const M = Math.round(SHEET_MARGIN * s);
  const ext = await sharp({ create: { width: Wp, height: C + M, channels: 3, background: back } }).composite([
    { input: await sharp({ create: { width: Wp, height: C, channels: 3, background: fill } }).png().toBuffer(), left: 0, top: 0 },
    { input: await part('panel_bottom.png').resize(Wp - 2 * (C - Math.round(s)), E, { fit: 'fill', kernel: 'nearest' }).png().toBuffer(), left: C - Math.round(s), top: C - E },
    { input: await corner('panel_bl.png'), left: 0, top: 0 },
    { input: await corner('panel_br.png'), left: Wp - C, top: 0 },
  ]).removeAlpha().raw().toBuffer();
  const cut = Math.round(bottomCss * s);
  const source = async d => {
    const out = Buffer.alloc(Wp * (cut + C + M) * 3);
    d.data.copy(out, 0, 0, Wp * cut * 3);
    ext.copy(out, Wp * cut * 3);
    return { data: out, info: { width: Wp, height: cut + C + M, channels: 3 } };
  };
  return { source, skin: best.skin, fill, back };
}

/**
 * A resident's line: their real dialogue sheet (portrait, name, words, from
 * the sheet's top edge to `bottom`, closed with its bottom border), in the
 * space between the caption and the clear zone, over their part of the house,
 * dimmed as the game dims it behind a sheet (the phone view of the frame
 * before the tap, softened a little). The caption plaque above it carries the
 * line's point in large type for muted viewing.
 */
async function cardShot(sid, from, to, id, srcAt, room, { k = 2.42, bottom = K[id].ev.viewport.height } = {}) {
  const n = to - from + 1;
  const tops = [];
  for (let rel = 0; rel < n; rel++) tops.push(await sheetTop(id, srcAt(rel)));
  const closer = await sheetCloser(id, srcAt(n - 1), tops[n - 1], bottom);
  // The sheet has settled on every frame used: just above the cut it is the
  // sheet's own fill, never the dark backdrop its opening spring shows under it.
  for (let rel = 0; rel < n; rel++) {
    const { data, info } = await sharp(clipFile(K[id], srcAt(rel))).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (const dy of [4, 10, 16]) {
      const i = (Math.round((bottom - dy) * S(id)) * info.width + Math.round(info.width / 2)) * 3;
      const dist = Math.abs(data[i] - closer.fill.r) + Math.abs(data[i + 1] - closer.fill.g) + Math.abs(data[i + 2] - closer.fill.b);
      if (dist > 60) fail(`${sid}: ${id} f${srcAt(rel)} is not the settled sheet ${dy} CSS above the cut (colour distance ${dist})`);
    }
  }
  // The tallest the closed sheet gets is centred between the caption (to y 330)
  // and the clear zone (its outline and shadow end by y 1440); the sheet grows
  // upward from that bottom as it types.
  const hMax = (bottom + SHEET_EXT - Math.min(...tops)) * k;
  const bottomY = Math.min(1409, 330 + (1100 + hMax) / 2);
  const idx = rel => Math.max(0, Math.min(n - 1, rel));
  // A slow, steady push-in over the whole shot, anchored at the sheet's bottom
  // edge: the card grows from k / 1.05 to k (the layout above is for k).
  const k0 = k / 1.05;
  const scaleAt = rel => k0 + (k - k0) * Math.max(0, Math.min(1, rel / Math.max(1, n - 1)));
  const hAt = rel => bottom + SHEET_EXT - tops[idx(rel)];
  const highest = bottomY - hMax;
  if (highest < 330) fail(`${sid}: the card reaches y ${Math.round(highest)}, under the caption`);
  return { id: sid, from, to, layers: [
    { kind: 'frame', clip: room.clip, src: { start: room.f, rate: 0 }, view: room.view, blur: room.blur ?? 10, brightness: 0.4 },
    { kind: 'frame', clip: id, src: rel => srcAt(idx(rel)), source: closer.source, outline: { px: 4, color: '#3B2416', shadowPx: 18 },
      view: rel => css2src(id, { x: 0, y: tops[idx(rel)], w: 432, h: hAt(rel) }),
      place: (_k, t) => { const z = scaleAt(t - from), h = hAt(t - from) * z; return { x: 540 - (432 * z) / 2, y: bottomY - h, w: 432 * z, h }; } },
  ], meta: { card: { k, push: [Number(k0.toFixed(3)), k], bottom, skin: closer.skin, tops: [Math.min(...tops), Math.max(...tops)], highest: Math.round(highest) } } };
}

// ---------------------------------------------------------------- timeline (9:16)

const shots = [];
let cursor = 0;
const next = n => { const from = cursor; cursor += n; return [from, cursor - 1]; };

// H1: the rule, then the win, on the whole board in one unbroken view. K1 is
// 60 fps. Both drags, and PLANT forming between them, play at 0.55x (rate
// 1.1); the end of each drag and the finger's short pause over each checked
// slot (PLANT, then HEART) play at 2x (rate 4), so neither reads as a stop.
// The T drops, the game dims the board on
// that frame and the victory card rises, PERFECT!, its three stars and the
// first confetti (the dim-in at 1.5x, then real time), and nothing is held.
// Each segment: [clip frame it starts at, rate]; its start (rel) is resolved
// from the previous one.
// The card's dim-in plays at 1.5x up to its first star, then real time.
const H1_STARS = eventAt('K1', /star 1 pops/) - 1;
// The fast stretch starts a little before each arrival, where the recorded drag
// is already easing into its pause, so the tile never creeps.
const L_FAST = M1.lArrive - 6, T_FAST = M1.tArrive - 9;
// It starts just before the L lifts (the press is at -15; the tile lifts from
// -7), two frames of the board as it was.
const H1_SEGS = [[-9, 1.1], [L_FAST, 4], [M1.lDrop + 1, 1.1], [T_FAST, 4], [M1.tDrop, 3], [H1_STARS, 2]];
const H1_MAP = H1_SEGS.map(([c, v]) => [null, c, v]);
H1_MAP[0][0] = 0;
for (let i = 1; i < H1_MAP.length; i++) { const [r0, c0, v] = H1_MAP[i - 1]; H1_MAP[i][0] = Math.round(r0 + (H1_MAP[i][1] - c0) / v); }
const h1Clip = rel => { let seg = H1_MAP[0]; for (const m of H1_MAP) if (rel >= m[0]) seg = m; return seg[1] + (rel - seg[0]) * seg[2]; };
// The card has settled and the confetti is still up at the stars when H1 ends.
const H1_END = 176;
const H1_N = (() => { let r = 0; while (h1Clip(r + 1) <= H1_END) r++; return r + 1; })();
{
  const [from, to] = next(H1_N);
  // No held frame anywhere: the clip frame advances on every output frame.
  for (let r = 1; r <= to - from; r++) if (Math.round(h1Clip(r)) <= Math.round(h1Clip(r - 1))) fail(`H1 holds a frame at ${r}`);
  for (const [a, b] of [[M1.lArrive, M1.lDrop], [M1.tArrive, M1.tDrop]]) {
    const hover = (b - a) / 4 / FPS;
    if (hover > 0.2) fail(`H1: a hover lasts ${hover.toFixed(2)} s`);
  }
  if (L_FAST > M1.lArrive || T_FAST > M1.tArrive) fail('H1: a fast stretch starts after its arrival');
  shots.push({ id: 'H1', from, to, layers: [{ kind: 'frame', clip: 'K1', src: h1Clip, view: boardView('K1') }], meta: { clip: `K1 -9..${Math.round(h1Clip(to - from))}` } });
}
/** The first H1 output frame (rel) showing K1 clip frame c. */
const clipToRel = c => { for (let r = 0; r < H1_N; r++) if (h1Clip(r) >= c) return r; return fail(`clip ${c} is not in H1`); };
// H1c: the settled card at half speed, once the confetti has fallen past the
// word journey (it covers PAY, PLAN, HEART from about clip 195 to 300); the
// confetti still over the stars dissolves away in the first third of a second.
const CARD_CLIP = 300, CARD_FADE = 10;
{
  const [from, to] = next(27);
  if (CARD_CLIP + (to - from) / 2 > K['K1'].ev.lastFrame) fail('H1c runs past the end of K1');
  shots.push({ id: 'H1c', from, to, layers: [
    { kind: 'frame', clip: 'K1', src: { start: CARD_CLIP, rate: 1 }, view: boardView('K1') },
    { kind: 'frame', clip: 'K1', src: { start: H1_END + 2, rate: 2 }, view: boardView('K1'), opacity: k => Math.max(0, 1 - (k * (to - from)) / CARD_FADE) },
  ] });
}
// H2: the house (K2, 60 fps, at 0.6x), crop A pushing in to crop B at the
// empty aquarium's invite card; it ends before K2's own invite dialog opens
// (clip 120), which H3 shows whole from K2b.
{
  const f = 0, ch = P('K2')[f].chrome, den = P('K2')[f].den, aq = P('K2')[f].aquarium;
  const cx = den.x + den.w / 2;
  const cropA = { x: cx - 267, y: ch.dock.y - 8 - 950, w: 534, h: 950 };
  const cropB = { x: cx - 200, y: aq.y - 265, w: 400, h: 711 };
  for (const r of [cropA, cropB]) if (r.y < ch.next.y + ch.next.h + 4) fail(`K2 crop starts above the Next sign: ${JSON.stringify(r)}`);
  assertClear('K2', range(0, 160), cropA, 'H2 A');
  const [from, to] = next(99);
  const h2rate = 118 / 98;
  if ((to - from) * h2rate >= 120) fail('H2 runs into the invite dialog');
  shots.push({ id: 'H2', from, to, layers: [
    { kind: 'frame', clip: 'K2', src: { start: 0, rate: h2rate }, view: [{ at: 0, ...css2src('K2', cropA) }, { at: 1, ...css2src('K2', cropB), ease: 'inOut' }] }] });
  // H3: the whole invite card ("A NEW FRIEND!", Axel, the Invite button) in
  // real time, pushing in, over a dark blur of the house around the empty
  // aquarium (K2 clip 110, before K2's own dialog opens at 120, so the blur
  // holds no copy of the card). The crop is the card's own wood frame (its
  // outer outline, measured on the pixels; the card is still from clip 6), so
  // the dark shape the game draws behind it never shows as a second border;
  // the push-in grows the card on screen, never crops into the frame.
  const card = { x: 27.6, y: 123.6, w: 379.4, h: 520.8 };
  const kv = 1.96, z1 = 1.05;
  const [f3, t3] = next(81);
  if (6 + (t3 - f3) >= k2bInvite) fail('H3 runs into the Invite tap');
  const cardAt = k => { const z = 1 + (z1 - 1) * easeInOut(k), w = card.w * kv * z, h = card.h * kv * z; return { x: 540 - w / 2, y: 332 + (card.h * kv * z1 - h) / 2, w, h }; };
  if (332 + card.h * kv * z1 + 4 + 27 > 1440) fail('H3: the invite card\'s shadow reaches the clear zone');
  shots.push({ id: 'H3', from: f3, to: t3, layers: [
    { kind: 'frame', clip: 'K2', src: { start: 110, rate: 0 }, view: css2src('K2', cropB), blur: 40, brightness: 0.45 },
    { kind: 'frame', clip: 'K2b', src: { start: 6, rate: 1 }, outline: { px: 0, shadowPx: 18 },
      view: css2src('K2b', card), place: cardAt }] });
}
// H4: three whole boards: EASY and MED+ from the drag into the drop, EXPERT from
// its drop (its drag fans neutral ghost words across the target row). The chips read.
for (const [sid, id, start, n] of [['H4a', 'K4', -12, 38], ['H4b', 'K5', -10, 38], ['H4c', 'K6', 13, 36]]) {
  const [from, to] = next(n);
  if (start + n - 1 > K[id].ev.lastFrame) fail(`${sid} runs past the end of ${id}`);
  shots.push({ id: sid, from, to, layers: [{ kind: 'frame', clip: id, src: { start, rate: 1 }, view: boardView(id) }] });
}
// H5: the Jungle Hammock before the tap, then (a jump cut in the same framing)
// built, with its invite card; then Sloane.
{
  const v = phoneView('K7a', 0);
  const vc = { x: v.x / 5, y: v.y / 5, w: v.w / 5, h: v.h / 5 };
  const a0 = k7Tap - 32, b0 = k7Built + 1;
  assertClear('K7a', [...range(a0, k7Tap - 1), ...range(b0, b0 + 51)], vc, 'H5');
  assertNoEmote('K7a', [...range(a0, k7Tap - 1), ...range(b0, b0 + 51)], vc, 'H5');
  const [fa, ta] = next(30);
  shots.push({ id: 'H5a', from: fa, to: ta, layers: [{ kind: 'frame', clip: 'K7a', src: { start: a0, rate: 1 }, view: v }] });
  const [fb, tb] = next(52);
  if (b0 + 51 > K['K7a'].ev.lastFrame) fail('H5b runs past the end of K7a');
  shots.push({ id: 'H5b', from: fb, to: tb, layers: [{ kind: 'frame', clip: 'K7a', src: { start: b0, rate: 1 }, view: v }] });
}
{
  const [from, to] = next(120);
  if (to - from > K['K7b'].ev.lastFrame) fail('H5c runs past the end of K7b');
  // The backdrop is a K7a frame before the tap: the build's confetti falls
  // through every later one. It is dimmed and softened like the others (blur
  // 16, not 10), so the room's state behind the sheet does not read.
  shots.push(await cardShot('H5c', from, to, 'K7b', rel => rel, { clip: 'K7a', f: k7Tap - 16, view: phoneView('K7a', 0), blur: 16 }));
}
// H6: Panko in her kitchen (before the tap), then her line: the last two
// sentences type in, "I must have." completes a second in and holds.
{
  // 20 CSS higher than the other phone views, so the caption sits on the
  // aquarium and clears the Scholar's Study nameplate.
  const v = phoneView('K8', 7, 185);
  const vc = { x: v.x / 5, y: v.y / 5, w: v.w / 5, h: v.h / 5 };
  assertClear('K8', range(7, 42), vc, 'H6');
  if (42 >= k8Tap) fail('H6a runs into the tap');
  const [from, to] = next(36);
  shots.push({ id: 'H6a', from, to, layers: [{ kind: 'frame', clip: 'K8', src: { start: 7, rate: 1 }, view: [{ at: 0, ...zoomAbout(v, 1) }, { at: 1, ...zoomAbout(v, 1.03), ease: 'inOut' }] }] });
}
{
  const [from, to] = next(120);
  const s0 = fc8 - 31;
  if (s0 + 119 > K['K8'].ev.lastFrame) fail('H6b runs past the end of K8');
  shots.push(await cardShot('H6b', from, to, 'K8', rel => s0 + rel, { clip: 'K8', f: 30, view: phoneView('K8', 7) }));
}

// PAN: the house as a phone sees it, one slow scroll from the pit to the roof
// (K13, afternoon), the evening sweeping down the house on the way up (K14, the
// same scroll at sunset). K13 and K14 are the identical gesture, so their clip
// frames match one for one. The 9:16 crop (376x668 CSS, between the Next sign
// and the PLAY dock of the tall recording window) rises with the scroll, from
// the pit well at the bottom to the chimney at the top.
//
// At sunset each floor is 10 CSS taller (the phase-2 connector between rooms),
// so the two pictures cannot be laid one over the other: a dissolve would show
// every room sign twice. So the sunset picture's house is laid out as solid
// floors: every room of the sunset recording is drawn whole and unscaled,
// first exactly over its afternoon self (while the change sweeps down the
// frame: a soft band a third of the frame tall, over 2 s, sunset above it,
// afternoon below), then moving as one block to its own place once the band
// has left the frame (the settle, 0.8 s, while the scroll is fast). Only the
// wooden gap between two floors is squeezed or stretched (from the sunset
// recording's 16 CSS of gap and connector to the 6 CSS the afternoon floors
// leave, and back); the roof moves with the top floor and the foundation with
// the den. The scenery either side is in the same place in both recordings,
// so it is not moved until the settle, when it follows the camera. No room,
// sign, resident or cloud is ever shown twice or in part; the shot cuts to
// Ember as the roof comes into view.
const PAN_ROOMS = ['Cozy Den', 'Rustic Kitchen', "Scholar's Study", 'Aquarium Room', 'Jungle Hammock', 'Desert Camp', 'Chill Office', 'Underground Burrow'];
// It starts as the finger leaves the drag's activation slop (the scroll first
// moves at clip 33) and cuts to Ember as the roof's lower edge comes into the
// frame, once the sunset picture has settled; the end card, after Ember,
// starts from the roof at rest.
const PAN0 = 33, PAN_N = 99;
const PAN_CROP = { x: 28, w: 376, h: 668, yBottom: 300, yMid: 260, yTop: 200 };
const HOUSE_BODY = [83, 349];            // the house body's CSS x span (HouseWorld HOUSE_BODY_WIDTH, centred on the rooms)
const panDen = (id, c) => P(id)[c]?.rooms?.['Cozy Den']?.y ?? fail(`${id} f${c}: no den`);
if (panDen('K13', PAN0 + 1) === panDen('K13', PAN0)) fail('PAN: the scroll has not started at its first frame');
const panP = rel => (panDen('K13', PAN0 + rel) - panDen('K13', PAN0)) / (panDen('K13', PAN0 + PAN_N - 1) - panDen('K13', PAN0));
// The afternoon crop rises 40 CSS with the scroll.
const panY = rel => PAN_CROP.yBottom - (PAN_CROP.yBottom - PAN_CROP.yMid) * panP(rel);
for (let rel = 0; rel < PAN_N; rel++) {
  const c = PAN0 + rel;
  if (Math.abs(panDen('K13', c) - panDen('K14', c)) > 0.6) fail(`PAN: K13 and K14 scroll differently at f${c}`);
}
// The sweep starts early in the climb and takes 2 s; the settle takes 0.8 s.
const PAN_S0 = range(0, PAN_N - 1).find(rel => panP(rel) >= 0.05), PAN_SN = 60, PAN_S1 = PAN_S0 + PAN_SN, PAN_RELAX = 25;
if (PAN_S1 + PAN_RELAX > PAN_N - 1) fail('PAN: the sunset picture has no time to settle');
const PAN_BAND = 0.35;                    // band height, as a fraction of the frame
/** The band's centre as a fraction of the frame height (0 top, 1 bottom). */
const panBand = rel => -PAN_BAND / 2 + (1 + PAN_BAND) * sine((rel - PAN_S0) / PAN_SN);
const smooth = u => { const v = Math.max(0, Math.min(1, u)); return v * v * (3 - 2 * v); };
/** The sunset picture's per-row opacity: 1 above the band, 0 below it. */
const panRowAlpha = rel => (h) => {
  const c = panBand(rel), out = new Uint8Array(h);
  for (let y = 0; y < h; y++) out[y] = Math.round(255 * (1 - smooth((y / h - (c - PAN_BAND / 2)) / PAN_BAND)));
  return out;
};
/** How far the sunset picture has settled (0: over the afternoon floors; 1: its own framing at yTop). */
const panRelax = rel => (rel <= PAN_S1 ? 0 : sine((rel - PAN_S1) / PAN_RELAX));
/**
 * The sunset layout at rel. Everything is in CSS rows of the afternoon crop's
 * frame of reference (the view is the afternoon crop). Each floor i has its
 * afternoon top a, its sunset top s and height h; it is drawn whole with its
 * top at pos = a + w (s - own - a), where own is the offset that puts the
 * sunset recording at its own framing (yTop). Returns the source row
 * (sunset CSS) for an output row in the house body and in the scenery, and the
 * body's x span for that row (the roof overhangs the walls).
 */
function panSunsetLayout(rel) {
  const c = PAN0 + rel, w = panRelax(rel), own = PAN_CROP.yTop - panY(rel);
  const fl = PAN_ROOMS.map(n => [P('K13')[c].rooms[n], P('K14')[c].rooms[n]]).filter(([a, d]) => a && d)
    .map(([a, d]) => ({ a: a.y, s: d.y, h: a.h, pos: a.y + w * (d.y - own - a.y) })).sort((p, q) => p.a - q.a);
  const roof = P('K14')[c].roof;
  const body = y => {
    if (y < fl[0].pos) return fl[0].s + (y - fl[0].pos);                   // the roof and sky above: with the top floor
    for (let i = 0; i < fl.length; i++) {
      const f = fl[i];
      if (y < f.pos + f.h) return f.s + (y - f.pos);                        // inside a floor: whole, unscaled
      const g = fl[i + 1];
      if (g && y < g.pos) return f.s + f.h + ((y - f.pos - f.h) / (g.pos - f.pos - f.h)) * (g.s - f.s - f.h);   // the gap
    }
    const L = fl[fl.length - 1];
    return L.s + (y - L.pos);                                               // the foundation and pit: with the den
  };
  const scenery = y => y + w * own;
  const roofTopOut = fl[0].pos + (roof.y - fl[0].s), roofBottomOut = roofTopOut + roof.h;
  // The roof overhangs the walls: down to its bottom row the body span is the roof's.
  const span = y => (y < roofBottomOut ? [roof.x, roof.x + roof.w] : HOUSE_BODY);
  return { fl, body, scenery, span, roofTopOut, roofBottomOut };
}
const panDuskShare = rel => (rel < PAN_S0 ? 0 : rel >= PAN_S1 ? 1 : sine((rel - PAN_S0) / PAN_SN));
const panCrop = rel => css2src('K13', { x: PAN_CROP.x, y: panY(rel), w: PAN_CROP.w, h: PAN_CROP.h });
/** K14 frames laid out on the afternoon rows (the source transform of the sunset layer). */
const panWarp = async (d, file) => {
  const c = Number(path.basename(file).slice(1, 6)) - HANDLE, rel = c - PAN0;
  const { data, info } = d, s = S('K14'), Wp = info.width, Hp = info.height;
  const L = panSunsetLayout(rel);
  const out = Buffer.alloc(data.length);
  const clampRow = r => Math.max(0, Math.min(Hp - 1, Math.round(r)));
  for (let Y = 0; Y < Hp; Y++) {
    const y = Y / s;
    const [x0, x1] = L.span(y), bx0 = Math.round(x0 * s), bx1 = Math.round(x1 * s);
    const rb = clampRow(L.body(y) * s), rs = clampRow(L.scenery(y) * s);
    data.copy(out, Y * Wp * 3, rs * Wp * 3, (rs * Wp + bx0) * 3);
    data.copy(out, (Y * Wp + bx0) * 3, (rb * Wp + bx0) * 3, (rb * Wp + bx1) * 3);
    data.copy(out, (Y * Wp + bx1) * 3, (rs * Wp + bx1) * 3, (rs + 1) * Wp * 3);
  }
  return { data: out, info };
};
{
  for (let rel = 0; rel < PAN_N; rel++) {
    const c = PAN0 + rel;
    // Every room of the sunset recording is drawn whole and unscaled: only gap
    // rows between one room's bottom and the next room's top are squeezed.
    if (rel >= PAN_S0) {
      const L = panSunsetLayout(rel);
      for (const f of L.fl) for (const dy of [0.5, f.h / 2, f.h - 0.5]) {
        if (Math.abs(L.body(f.pos + dy) - (f.s + dy)) > 1e-6) fail(`PAN f${c}: a room is not drawn whole`);
      }
      for (let i = 0; i + 1 < L.fl.length; i++) if (L.fl[i + 1].pos - L.fl[i].pos - L.fl[i].h < 5) fail(`PAN f${c}: two floors overlap`);
    }
    // The rows each picture shows, in its own recording.
    const spans = [];
    if (rel < PAN_S1) spans.push(['K13', panY(rel), panY(rel) + PAN_CROP.h]);
    if (rel >= PAN_S0) {
      const L = panSunsetLayout(rel), ys = [panY(rel), panY(rel) + PAN_CROP.h];
      const rows = ys.flatMap(y => [L.body(y), L.scenery(y)]);
      spans.push(['K14', Math.min(...rows), Math.max(...rows)]);
    }
    for (const [id, y0, y1] of spans) {
      const r = { x: PAN_CROP.x, y: y0, w: PAN_CROP.w, h: y1 - y0 };
      const ch = P(id)[c].chrome;
      if (y0 < ch.next.y + ch.next.h + 32) fail(`PAN ${id} f${c}: the crop (y ${y0.toFixed(1)}) reaches the ambient line under the Next sign`);
      if (hitBox(ch.dock, r)) fail(`PAN ${id} f${c}: the crop takes in the PLAY dock`);
      assertNoEmote(id, [c], r, 'PAN');
    }
  }
  const [from, to] = next(PAN_N);
  shots.push({ id: 'PAN', from, to, layers: [
    { kind: 'frame', clip: 'K13', src: { start: PAN0, rate: 1 }, view: panCrop, opacity: k => (k * (PAN_N - 1) < PAN_S1 ? 1 : 0) },
    { kind: 'frame', clip: 'K14', src: { start: PAN0, rate: 1 }, view: panCrop, source: panWarp, opacity: k => (k * (PAN_N - 1) >= PAN_S0 ? 1 : 0),
      rowAlpha: (t, h) => panRowAlpha(t - from)(h) },
  ], meta: { sweep: [PAN_S0, PAN_S1], relaxed: PAN_S1 + PAN_RELAX } });
}
// The pan's caption runs to the cut, which comes as the roof's lower edge
// enters the frame, so the plaque never sits on the roof.
{
  const rel = PAN_N - 1, bottomOut = (panSunsetLayout(rel).roofBottomOut - panY(rel)) * (W / PAN_CROP.w);
  if (bottomOut > 120) fail(`PAN: the roof reaches the caption before the cut (${Math.round(bottomOut)})`);
}
// H8: Ember by the fire at dusk, then her line typing in; it holds on the
// completed two sentences, before her third begins.
{
  const v = phoneView('K12', 2);
  const vc = { x: v.x / 5, y: v.y / 5, w: v.w / 5, h: v.h / 5 };
  assertClear('K12', range(2, 37), vc, 'H8');
  assertNoEmote('K12', range(2, 37), vc, 'H8');
  if (37 >= k12Tap) fail('H8a runs into the tap');
  const [from, to] = next(36);
  shots.push({ id: 'H8a', from, to, layers: [{ kind: 'frame', clip: 'K12', src: { start: 2, rate: 1 }, view: v }] });
}
{
  const [from, to] = next(110);
  // From the first frame the sheet has settled: its opening spring lifts it
  // off the bottom of the screen for five frames, showing a dark strip under it.
  const s0 = k12Tap + 11;
  // Ember's name (CSS y 748-760) sits on the screen's bottom edge, which cuts
  // the underline under it (from 765), so her card ends at 764: the whole name,
  // then the closing border.
  shots.push(await cardShot('H8b', from, to, 'K12', rel => Math.min(fe12, s0 + rel), { clip: 'K12', f: 30, view: phoneView('K12', 2) }, { bottom: 764 }));
}
// END: the sunset house at its roof (K14 after the scroll has come to rest),
// the camera rising past the chimney into the evening sky, where the wordmark
// and two lines appear. The roof settles under the lines, with the top room
// (the Burrow, still to be built) and Chill in his office below it. Above the
// roof the game draws its flat evening fill (PHASE_BG_COLORS) past the top of
// the sky art, and the end card extends that same fill upward (sampled above
// the roof): the end card is the one part the brief allows to be composed.
const END_SRC = eventAt('K14', /release at rest/) + 4;
const END_N = 150, END_RISE = 40, END_TOP = 700;
const endY = rel => Math.round(END_TOP * easeInOut(Math.min(1, rel / END_RISE)));
let END0;
{
  const r = { x: PAN_CROP.x, y: PAN_CROP.yTop, w: PAN_CROP.w, h: PAN_CROP.h };
  assertNoEmote('K14', range(END_SRC, END_SRC + END_N - 1), r, 'END');
  if (END_SRC + END_N - 1 > K['K14'].ev.lastFrame) fail('END runs past the end of K14');
  END0 = cursor;
  const [from, to] = next(END_N);
  shots.push({ id: 'END', from, to, layers: [
    { kind: 'fill', color: null },
    { kind: 'frame', clip: 'K14', src: { start: END_SRC, rate: 1 }, view: css2src('K14', r), featherTop: 60,
      place: (_k, t) => {
        // Once risen, a slow, steady push-in anchored at the top of the roof: the
        // roof stays put under the lines and the house below grows 3.5%.
        const rel = t - from, z = rel <= END_RISE ? 1 : 1 + 0.035 * ((rel - END_RISE) / (END_N - 1 - END_RISE));
        const ay = (P('K14')[END_SRC].roof.y - PAN_CROP.yTop) * (W / PAN_CROP.w);
        return { x: 540 - (W * z) / 2, y: endY(rel) + ay - ay * z, w: W * z, h: H * z };
      } },
  ] });
}
const TOTAL = cursor;
// The evening sky's flat fill, sampled above the roof on the first END frame
// (median of a strip clear of the chimney and the stars' faint dots).
{
  const { data, info } = await sharp(clipFile(K['K14'], END_SRC)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const s = S('K14'), vals = [[], [], []];
  for (let y = Math.round(202 * s); y < Math.round(212 * s); y += 2) for (let x = Math.round(30 * s); x < Math.round(60 * s); x += 2) {
    const i = (y * info.width + x) * 3; for (let c = 0; c < 3; c++) vals[c].push(data[i + c]);
  }
  const med = v => v.sort((a, b) => a - b)[v.length >> 1];
  const hex = '#' + vals.map(v => med(v).toString(16).padStart(2, '0')).join('');
  shots.find(s0 => s0.id === 'END').layers[0].color = hex;
  shots.find(s0 => s0.id === 'END').meta = { sky: hex };
}
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
// over the house and above the dialogue cards.
const CAPTIONS = [
  // The rule's caption has faded by the frame the T drops, before the victory card shows.
  { id: 1, lines: ['One letter. Two real words.'], shot: 'H1', top: 300, to: clipToRel(M1.tDrop) - 1, fadeOut: 4 },
  { id: 2, lines: ['Solve puzzles.', 'Build them a home.'], shot: 'H2', top: 120 },
  { id: 3, lines: ['13 friends to welcome.'], shot: 'H3', top: 120 },
  { id: 4, lines: ['Over 4,000 puzzles.'], shot: ['H4a', 'H4c'], top: 360 },
  { id: 5, lines: ['More rooms. More neighbors.'], shot: ['H5a', 'H5b'], top: 120 },
  { id: 6, lines: ['Three moths.', 'All named Gerald.'], shot: 'H5c', top: 120 },
  { id: 7, lines: ['Who moved the spice jars?'], shot: ['H6a', 'H6b'], top: 120 },
  { id: 8, lines: ['Where did the day go?'], shot: 'PAN', top: 120, skin: 'dusk' },
  { id: 9, lines: ['Ember is fond of you.'], shot: ['H8a', 'H8b'], top: 120, skin: 'dusk' },
].map(c => {
  const [a, b] = Array.isArray(c.shot) ? c.shot : [c.shot, c.shot];
  return { ...c, text: c.lines.join(' '), from: shotOf(a).from, to: c.to !== undefined ? shotOf(a).from + c.to : shotOf(b).to };
});
const captions = [];
for (const c of CAPTIONS) {
  const p = await plaque(c.lines, c.skin ?? 'bright');
  captions.push({ ...c, png: p.png, left: Math.round(540 - p.w / 2), size: p.size, w: p.w, h: p.h });
}
// End card: the wordmark and two lines in the evening sky above the roof.
// The wordmark fades in once the chimney has slid down below it, so it never
// lies over the roof; then each line.
const MARK_TOP = 200, MARK_H = 190, E1_Y = 540, E2_Y = 650;
const chimneyAt = rel => endY(rel) + (P('K14')[END_SRC].roof.y - PAN_CROP.yTop) * (W / PAN_CROP.w);
const MARK_AT = END0 + range(0, END_N - 1).find(rel => chimneyAt(rel) > MARK_TOP + MARK_H + 8), E1_AT = MARK_AT + 22, E2_AT = E1_AT + 30;
const endCss = `.e { font-family: 'Figtree-Bold'; font-size: 84px; color: #FFF3DC; white-space: nowrap; padding: 30px;
  text-shadow: 4px 4px 0 #3B2416, 0 0 18px rgba(59,36,22,0.5), 0 0 18px rgba(59,36,22,0.5); }`;
const e1 = await renderHtml(`<div class="e">It's a lovely house.</div>`, endCss, { width: 1400 });
const e2 = await renderHtml(`<div class="e">Isn't it?</div>`, endCss, { width: 1400 });
const mark = await sharp(A('ui/wordmark.png')).resize(760, 190).png().toBuffer();
captions.push({ id: 'mark', png: mark, left: 540 - 380, top: MARK_TOP, from: MARK_AT, to: TOTAL - 1, fadeIn: 14 });
captions.push({ id: 'E1', png: e1.png, left: Math.round(540 - e1.width / 2), top: Math.round(E1_Y - e1.height / 2), from: E1_AT, to: TOTAL - 1, fadeIn: 8 });
captions.push({ id: 'E2', png: e2.png, left: Math.round(540 - e2.width / 2), top: Math.round(E2_Y - e2.height / 2), from: E2_AT, to: TOTAL - 1, fadeIn: 8 });
for (const c of captions) {
  const m = await sharp(c.png).metadata();
  if (c.top + m.height > 1440) fail(`caption ${c.id} reaches y ${c.top + m.height} (> 1440)`);
}
// The end card's lines stay in the sky: E2's text ends above the chimney (the
// roof's top sits (roofY - 200) CSS below the crop top at END_TOP).
{
  const roofY = P('K14')[END_SRC].roof.y;
  const chimney = END_TOP + (roofY - PAN_CROP.yTop) * (W / PAN_CROP.w);
  if (E2_Y + 60 > chimney - 30) fail(`END: "Isn't it?" meets the chimney (${Math.round(chimney)})`);
}

// ---------------------------------------------------------------- 16:9 master

const W16 = 1920, H16 = 1080;
// Every shot is remapped from its 9:16 layers. A layer with no place (a
// blurred backdrop) fills the 16:9 frame. A full-frame phone view becomes a
// sharp 608x1080 column 96 px from the right edge (mirroring the captions'
// 96 px left margin) over the game's sky art. Placed layers (the card and the
// dialogue sheets) keep their 9:16 layout, scaled as one group into the area
// the caption leaves free, never above 1.2x.
const COL = { x: 1216, w: 608, h: 1080 };
const edgeRaw = (() => { const raw = Buffer.alloc(6 * H16 * 3); for (let i = 0; i < raw.length; i += 3) { raw[i] = 0x3B; raw[i + 1] = 0x24; raw[i + 2] = 0x16; } return raw; })();
const rules = [
  { kind: 'fn', render: async () => ({ raw: edgeRaw, left: COL.x - 6, top: 0, w: 6, h: H16 }) },
  { kind: 'fn', render: async () => ({ raw: edgeRaw, left: COL.x + COL.w, top: 0, w: 6, h: H16 }) },
];
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
// Behind the column and the placed layers, the game's own sky art, blurred and
// darkened: day through the house and the invite, afternoon from the boards,
// dusk from the sunset on (the scroll blends the two as the picture does).
const skies16 = {};
for (const name of ['day', 'afternoon', 'dusk']) {
  const src = sharp(A(`environment/sky_${name}.webp`));
  const m = await src.metadata();
  const h = Math.round(m.width * 9 / 16);
  const top = Math.round(m.height * 0.12);
  skies16[name] = await sharp(A(`environment/sky_${name}.webp`)).extract({ left: 0, top, width: m.width, height: h })
    .resize(W16, H16).blur(22).modulate({ brightness: 0.72 }).removeAlpha().png().toBuffer();
}
const skyFor = s => (s.from >= shotOf('H8a').from ? 'dusk' : s.from >= shotOf('H4a').from ? 'afternoon' : 'day');
const skyLayer = (name, opacity) => ({ kind: 'image', png: skies16[name], place: undefined, fit: 'fill', ...(opacity ? { opacity } : {}) });
function remap16(s) {
  const out = [];
  const placed = s.layers.filter(l => l.place);
  if (!placed.length) {
    out.push(skyLayer(skyFor(s)), ...rules);
    for (const l of s.layers) out.push({ ...l, place: { x: COL.x, y: 0, w: COL.w, h: COL.h } });
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
    if (!l.place) { out.push(skyLayer(skyFor(s))); continue; }
    const pl = l.place;
    out.push({ ...l, place: typeof pl === 'function' ? (k, t) => map(pl(k, t)) : map(pl) });
  }
  return { id: s.id, from: s.from, to: s.to, layers: out, meta16: { scale: sc } };
}
const colPlace = { x: COL.x, y: 0, w: COL.w, h: COL.h };
const shots16 = shots.map(s => {
  if (s.id === 'PAN') {
    const [a, d] = s.layers;
    return { id: s.id, from: s.from, to: s.to, layers: [skyLayer('afternoon'), skyLayer('dusk', k => panDuskShare(k * (PAN_N - 1))), ...rules, { ...a, place: colPlace }, { ...d, place: colPlace }] };
  }
  if (s.id === 'END') {
    // The roof rises in the phone column as it does in 9:16, so it settles
    // below the level of the lines with the locked top room under it; the
    // column above the roof is the same sampled evening fill as the 9:16 end
    // card. The wordmark and lines sit left of the column.
    const top16 = 478;                // the column's rise: the Burrow card settles below 'Isn't it?'
    const colFill = { raw: null };
    return { id: s.id, from: s.from, to: s.to, layers: [skyLayer('dusk'), ...rules,
      { kind: 'fn', render: async () => {
        if (!colFill.raw) {
          const [r, g, b] = [1, 3, 5].map(i => parseInt(shotOf('END').meta.sky.slice(i, i + 2), 16));
          colFill.raw = Buffer.alloc(COL.w * COL.h * 3);
          for (let i = 0; i < colFill.raw.length; i += 3) { colFill.raw[i] = r; colFill.raw[i + 1] = g; colFill.raw[i + 2] = b; }
        }
        return { raw: colFill.raw, left: COL.x, top: 0, w: COL.w, h: COL.h };
      } },
      { kind: 'frame', clip: 'K14', src: { start: END_SRC, rate: 1 }, featherTop: 34,
        // The same slow push-in as 9:16 once risen, inside the column: the crop
        // narrows about the top of the roof, so the roof stays put.
        view: rel => {
          const z = rel <= END_RISE ? 1 : 1 + 0.035 * ((rel - END_RISE) / (END_N - 1 - END_RISE));
          const ay = P('K14')[END_SRC].roof.y, cx = PAN_CROP.x + PAN_CROP.w / 2;
          return css2src('K14', { x: cx - PAN_CROP.w / (2 * z), y: ay - (ay - PAN_CROP.yTop) / z, w: PAN_CROP.w / z, h: PAN_CROP.h / z });
        },
        place: (_k, t) => ({ x: COL.x, y: Math.round(top16 * easeInOut(Math.min(1, (t - s.from) / END_RISE))), w: COL.w, h: COL.h }) }] };
  }
  return remap16(s);
});
{
  const e1b = await renderHtml(`<div class="e" style="font-size:76px">It's a lovely house.</div>`, endCss, { width: 1400 });
  const e2b = await renderHtml(`<div class="e" style="font-size:76px">Isn't it?</div>`, endCss, { width: 1400 });
  const cx = (96 + COL.x - 24) / 2;
  captions16.push({ id: 'mark', png: mark, left: Math.round(cx - 380), top: 290 - 95, from: MARK_AT, to: TOTAL - 1, fadeIn: 14 });
  captions16.push({ id: 'E1', png: e1b.png, left: Math.round(cx - e1b.width / 2), top: Math.round(500 - e1b.height / 2), from: E1_AT, to: TOTAL - 1, fadeIn: 8 });
  captions16.push({ id: 'E2', png: e2b.png, left: Math.round(cx - e2b.width / 2), top: Math.round(600 - e2b.height / 2), from: E2_AT, to: TOTAL - 1, fadeIn: 8 });
  for (const c of captions16.slice(-3)) {
    const m = await sharp(c.png).metadata();
    if (c.left < 96 || c.left + m.width > COL.x - 12) fail(`16:9 end card: ${c.id} leaves the space left of the column`);
  }
}
const compose16 = makeComposer({ W: W16, H: H16, shots: shots16, captions: captions16 });

// ---------------------------------------------------------------- audio

// One bed from the first frame to the last: the day bed until the sunset,
// crossfading over a second into the dusk bed where the scroll turns to
// sunset, which carries Ember and the end card and fades out over the last 1.5 s.
const secs = f => f / FPS;
const pan = shotOf('PAN');
const turn = secs(pan.from + (PAN_S0 + PAN_S1) / 2);
const beds = [
  { file: A('music/home_phase0.mp3'), ss: 23.28, at: 0, dur: turn + 0.5, fadeIn: [0, 0.01], fadeOut: [turn - 0.5, 1.0], lufs: -20 },
  { file: A('music/home_phase2.mp3'), ss: 66.22, at: turn - 0.5, dur: secs(TOTAL) - turn + 0.5, fadeIn: [0, 1.0], fadeOut: [secs(TOTAL) - turn + 0.5 - 1.5, 1.5], lufs: -20 },
];
const SND = f => A(`sounds/${f}`);
const sfx = [];
const add = (file, frame, gainDb = 0, why = '') => sfx.push({ file: SND(file), at: frame / FPS, gainDb, why });
// H1 (K1 at 60 fps; see H1_MAP and clipToRel).
add('letter_select.wav', 0, -8, 'the L in the hand');
add('valid_move.wav', clipToRel(M1.lDrop), 0, 'PLANT');
add('letter_select.wav', clipToRel(M1.tPress), -6, 'the T lifts');
add('valid_move_2.wav', clipToRel(M1.tDrop), 0, 'HEART: the T drops');
add('perfect.wav', clipToRel(eventAt('K1', /PERFECT! title/)), -2, 'the victory card');
for (const [i, re] of [[1, /star 1 pops/], [2, /star 2 pops/], [3, /star 3 pops/]]) add(`star_pop_${i}.wav`, clipToRel(eventAt('K1', re)), -6, `star ${i}`);
add('ui_tap.wav', shotOf('H3').from, -8, 'the invite');
add('letter_select.wav', shotOf('H4a').from, -8, 'the W lifts');
add('valid_move.wav', shotOf('H4a').from + 12, -2, 'SWING');
add('valid_move.wav', shotOf('H4b').from + 10, -2, 'CLOVER');
add('valid_move.wav', shotOf('H4c').from, -2, 'PICKLED');
add('unlock.wav', shotOf('H5b').from, 0, 'the Jungle Hammock is built');
add('dialogue.wav', shotOf('H5c').from, -4, 'Sloane speaks');
add('dialogue.wav', shotOf('H6b').from, -6, 'Panko speaks');
add('dialogue.wav', shotOf('H8b').from, -6, 'Ember speaks');

// ---------------------------------------------------------------- captions SRT

const ts = f => { const ms = Math.round(f / FPS * 1000); const p = (n, w = 2) => String(n).padStart(w, '0'); return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };
// One line per cue, as trailer.captions in the listing JSON holds them. The
// last cue carries both end-card lines, which are both on screen by then.
const cues = [...CAPTIONS.map(c => ({ from: c.from, to: c.to + 1, text: c.text })),
  { from: E1_AT, to: E2_AT, text: "It's a lovely house." }, { from: E2_AT, to: TOTAL, text: "It's a lovely house. Isn't it?" }];
const srt = cues.map((c, i) => `${i + 1}\n${ts(c.from)} --> ${ts(c.to)}\n${c.text}\n`).join('\n');

// ---------------------------------------------------------------- output

await mkdir(OUT, { recursive: true });
const compose916 = makeComposer({ W, H, shots, captions });
// The poster: the L over PANT's checked PLANT slot, well into its hover.
const posterFrame = clipToRel(M1.lArrive + 10);
// The code that built this report: git HEAD, the trailer2 files that differ
// from it, and a hash of each trailer2 script, so a finished cut can always be
// tied to the exact edit that made it.
const here = path.dirname(fileURLToPath(import.meta.url));
const code = { head: execSync('git rev-parse HEAD', { cwd: here }).toString().trim(),
  uncommitted: execSync('git status --porcelain -- .', { cwd: here }).toString().split('\n').filter(Boolean).map(l => l.slice(3)), md5: {} };
for (const f of ['edit.mjs', 'engine.mjs', 'capture.mjs', 'helpers.mjs', 'record.mjs', 'states2.mjs', 'install.mjs']) {
  code.md5[f] = createHash('md5').update(await readFile(path.join(here, f))).digest('hex');
}
const report = { builtAt: new Date().toISOString(), code, fps: FPS, frames: TOTAL, marks: { kc, fc8, fe12, fe12next, i0, END0, posterFrame, h1Map: H1_MAP, panSweep: [PAN_S0, PAN_S1], panSettled: PAN_S1 + PAN_RELAX, turnSeconds: Number(turn.toFixed(2)), markAt: MARK_AT, e1At: E1_AT, e2At: E2_AT },
  shots: shots.map(s => ({ id: s.id, from: s.from, to: s.to, meta: s.meta ?? null, clips: [...new Set(s.layers.filter(l => l.kind === 'frame').map(l => l.clip))] })),
  captions: CAPTIONS.map(c => ({ id: c.id, text: c.text, from: c.from, to: c.to })), cues };
console.log(`timeline: ${TOTAL} frames (${secs(TOTAL).toFixed(2)} s); ${shots.map(s => `${s.id} ${s.to - s.from + 1}`).join(', ')}`);

if (onlyFrames) {
  for (const t of onlyFrames) {
    if (!kinds.length || kinds.includes('9x16')) await writePng(await compose916(t), W, H, path.join(OUT, 'frames', `f${String(t).padStart(4, '0')}.png`));
    if (kinds.includes('16x9')) await writePng(await compose16(t), W16, H16, path.join(OUT, 'frames16', `f${String(t).padStart(4, '0')}.png`));
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
