#!/usr/bin/env node
/**
 * The entity that holds the house (Phase 3+), from one generated picture.
 *
 * assets/raw/entity_raw.png (tracked, not bundled; see assets/raw/ENTITY_ART.md)
 * was generated from a layout guide, assets/raw/entity_guide.png: the house's
 * own roof and walls as a flat green shape on white. The model painted the
 * smoke creature rising behind that shape, its claws on the walls' corners.
 * The flat green says exactly what lies in front of the house:
 *
 *   entity_back.png   everything behind the house: the smoke body, head, arms
 *                     and the lower claws. Its soft smoke is unmixed from the
 *                     white backdrop, so it stays translucent over the sky,
 *                     and darkened; the lower flames fade away.
 *   entity_front.png  the claws gripping the walls, in front of the house
 *   entity_eyes.png   the eyes' hot cores, white: an extra glow in-game
 *
 * Every image is written at PX pixels per dp and placed so the stand-in's
 * walls line up with the real house body. The measurements HouseWorld needs
 * are printed in dp (and pinned in skyPresence.test.ts).
 *
 *   node scripts/tools/processEntityArt.mjs
 */
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '../..');
const RAW = path.join(ROOT, 'assets/raw');
const OUT = path.join(ROOT, 'assets/environment');
const PX = 2; // image pixels per dp
const ART = 3; // image pixels per art pixel: 1.5dp, the roof's pixel size
const BODY_W = 266; // HOUSE_BODY_WIDTH in HouseWorld
const CLAW_ZONE_DP = 150; // below the eaves, where the claws hold the walls
const FADE_FROM = 0.8; // the lower flames fade out from here (fraction of height)
const DARK = 90; // below this luminance a pixel is the creature's solid body
const SMOKE_SHADE = 0.45; // darkens the unmixed smoke
const ALPHA_FLOOR = 0.1; // unmixed alpha below this is backdrop noise

const { data, info } = await sharp(path.join(RAW, 'entity_raw.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const w = info.width, h = info.height, N = w * h;
const d = Buffer.from(data);
const lum = (i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];

// The backdrop colour: the top corners.
let bgR = 0, bgG = 0, bgB = 0, n = 0;
for (const [cx, cy] of [[0, 0], [w - 12, 0]]) for (let y = cy; y < cy + 12; y++) for (let x = cx; x < cx + 12; x++) {
  const i = (y * w + x) * 4; bgR += d[i]; bgG += d[i + 1]; bgB += d[i + 2]; n++;
}
const bgc = [bgR / n, bgG / n, bgB / n];

// ── The house stand-in ──────────────────────────────────────────────────────
const green = new Uint8Array(N);
for (let p = 0; p < N; p++) {
  const i = p * 4;
  // Pure stand-in green, or anything painted over it that still shows it.
  if (d[i + 1] > 60 && d[i + 1] > d[i] + 12 && d[i + 1] > d[i + 2] + 12) green[p] = 1;
}
const wallRow = Math.round(h * 0.6);
let wl = w, wr = -1;
for (let x = 0; x < w; x++) if (green[wallRow * w + x]) { wl = Math.min(wl, x); wr = Math.max(wr, x); }
let roofTop = h;
for (let p = 0; p < N && roofTop === h; p++) if (green[p]) roofTop = Math.floor(p / w);
let eaves = roofTop;
for (let y = roofTop + Math.round((wr - wl) * 0.2); y < h; y++) {
  let l = w, r = -1;
  for (let x = 0; x < w; x++) if (green[y * w + x]) { l = Math.min(l, x); r = Math.max(r, x); }
  if (r - l < (wr - wl) * 1.04) { eaves = y; break; }
}
const scale = (BODY_W * PX) / (wr - wl + 1); // output px per source px
const centerX = (wl + wr) / 2;
const clawBottom = eaves + Math.round((CLAW_ZONE_DP * PX) / scale);
const inWalls = (x, y) => y >= eaves && x >= wl && x <= wr;
// Then grow it (after measuring, so the scale is the true wall width): the stand-in's anti-aliased edge is pale green-grey, and left in
// it would trace the roof with a light line.
for (let pass = 0; pass < 4; pass++) {
  const g2 = green.slice();
  for (let p = 0; p < N; p++) {
    if (green[p]) continue;
    const x = p % w;
    if ((x > 0 && green[p - 1]) || (x < w - 1 && green[p + 1]) || (p >= w && green[p - w]) || (p + w < N && green[p + w])) g2[p] = 1;
  }
  green.set(g2);
}

// ── Soft edges: pixels the backdrop reaches through lighter-than-body paint
// are smoke over white, and are unmixed; everything enclosed by the body
// (fangs, eye cores, red cracks) stays opaque in its own colour.
const reached = new Uint8Array(N);
{
  const st = [];
  for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
  while (st.length) {
    const p = st.pop();
    if (reached[p]) continue;
    if (!green[p] && lum(p * 4) < DARK) continue;
    reached[p] = 1;
    const x = p % w;
    if (x > 0) st.push(p - 1);
    if (x < w - 1) st.push(p + 1);
    if (p >= w) st.push(p - w);
    if (p + w < N) st.push(p + w);
  }
}

// ── The eyes: the two biggest bright red-to-white glows high in the head ────
const eyeSeed = new Uint8Array(N);
for (let y = 0; y < Math.round(eaves * 0.6); y++) for (let x = 0; x < w; x++) {
  const p = y * w + x, i = p * 4;
  if (!reached[p] && d[i] > 220 && d[i] - d[i + 1] > 30) eyeSeed[p] = 1;
}
{
  const lab = new Int32Array(N).fill(-1);
  const blobs = [];
  for (let p = 0; p < N; p++) {
    if (!eyeSeed[p] || lab[p] !== -1) continue;
    const id = blobs.length; let cnt = 0; const st = [p]; lab[p] = id;
    while (st.length) {
      const q = st.pop(); cnt++;
      for (const r of [q - 1, q + 1, q - w, q + w]) if (r >= 0 && r < N && eyeSeed[r] && lab[r] === -1) { lab[r] = id; st.push(r); }
    }
    blobs.push(cnt);
  }
  const keep = blobs.map((c, i) => [c, i]).sort((a, b) => b[0] - a[0]).slice(0, 2).map(([, i]) => i);
  for (let p = 0; p < N; p++) if (eyeSeed[p] && !keep.includes(lab[p])) eyeSeed[p] = 0;
}
let ex0 = w, ey0 = h, ex1 = -1, ey1 = -1;
for (let p = 0; p < N; p++) if (eyeSeed[p]) {
  const x = p % w, y = (p - x) / w;
  ex0 = Math.min(ex0, x); ex1 = Math.max(ex1, x); ey0 = Math.min(ey0, y); ey1 = Math.max(ey1, y);
}
const epad = Math.round((ex1 - ex0) * 0.05);
ex0 -= epad; ex1 += epad; ey0 -= epad; ey1 += epad;
// The glow: red pixels near a seed.
const eyeGlow = new Float32Array(N);
for (let y = ey0; y <= ey1; y++) for (let x = ex0; x <= ex1; x++) {
  let near = false;
  for (let yy = y - epad; yy <= y + epad && !near; yy += 2) for (let xx = x - epad; xx <= x + epad; xx += 2) {
    if (yy >= 0 && yy < h && xx >= 0 && xx < w && eyeSeed[yy * w + xx]) { near = true; break; }
  }
  if (!near) continue;
  const i = (y * w + x) * 4;
  // Brightness, not redness: the hot cores and their bloom, never the cracks.
  const v = Math.max(0, Math.min(1, (lum(i) - 60) / 150));
  if (v > 0.05) eyeGlow[y * w + x] = v;
}

// ── Layers ──────────────────────────────────────────────────────────────────
const back = Buffer.alloc(N * 4);
const front = Buffer.alloc(N * 4);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const p = y * w + x, i = p * 4;
  if (green[p]) continue;
  if (inWalls(x, y)) {
    // Only the claws in their zone come forward; smoke and flames painted over
    // the walls lie behind the house.
    if (!reached[p] && y < clawBottom) {
      d.copy(front, i, i, i + 3);
      front[i + 1] = Math.min(front[i + 1], Math.max(front[i], front[i + 2]));
      front[i + 3] = 255;
    }
    continue;
  }
  let a = 1;
  let rgb = [d[i], d[i + 1], d[i + 2]];
  if (reached[p]) {
    a = 0;
    for (let c = 0; c < 3; c++) a = Math.max(a, (bgc[c] - d[i + c]) / bgc[c]);
    // Below a floor it is the backdrop's own noise. Left in, the in-game tint
    // (Phases 3 and 5 draw the layer as one colour) outlines the image's box.
    a = Math.min(1, Math.max(0, (a * 1.08 - ALPHA_FLOOR) / (1 - ALPHA_FLOOR)));
    if (a <= 0) continue;
    rgb = rgb.map((v, c) => Math.max(0, Math.min(255, Math.round(bgc[c] - (bgc[c] - v) / a))));
  }
  if (reached[p]) {
    // Unmixed smoke comes out a pale grey; the presence is darker than the
    // night it stands in, with a violet cast.
    rgb = [rgb[0] * SMOKE_SHADE, rgb[1] * SMOKE_SHADE * 0.9, rgb[2] * SMOKE_SHADE * 1.1].map((v) => Math.round(Math.min(255, v)));
  }
  rgb[1] = Math.min(rgb[1], Math.max(rgb[0], rgb[2]));
  back[i] = rgb[0]; back[i + 1] = rgb[1]; back[i + 2] = rgb[2];
  back[i + 3] = Math.round(255 * a);
}
// The roof stand-in: carry the surrounding smoke across it (nearest pixel),
// so wherever the real roof is narrower, smoke shows rather than a hole.
{
  const src = new Int32Array(N).fill(-1);
  const q = [];
  for (let p = 0; p < N; p++) if (back[p * 4 + 3] > 0) { src[p] = p; q.push(p); }
  for (let k = 0; k < q.length; k++) {
    const p = q[k], x = p % w;
    for (const r of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
      if (r < 0 || r >= N || src[r] !== -1) continue;
      const ry = Math.floor(r / w), rx = r % w;
      if (!(green[r] && (ry < eaves || !inWalls(rx, ry)))) continue;
      src[r] = src[p]; q.push(r);
    }
  }
  for (let p = 0; p < N; p++) if (green[p] && src[p] >= 0 && src[p] !== p) back.copy(back, p * 4, src[p] * 4, src[p] * 4 + 4);
  // Nearest-pixel copies streak into bars; relax the filled region into a
  // smooth blend of its surroundings (premultiplied, fixed boundary).
  const fill = [];
  for (let p = 0; p < N; p++) if (green[p] && src[p] >= 0 && src[p] !== p) fill.push(p);
  const pm = new Float32Array(N * 4);
  for (let p = 0; p < N; p++) {
    const a = back[p * 4 + 3] / 255;
    pm[p * 4] = back[p * 4] * a; pm[p * 4 + 1] = back[p * 4 + 1] * a; pm[p * 4 + 2] = back[p * 4 + 2] * a; pm[p * 4 + 3] = a;
  }
  for (let it = 0; it < 220; it++) {
    for (const p of fill) {
      const x = p % w;
      let cnt = 0;
      const acc = [0, 0, 0, 0];
      for (const r of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
        if (r < 0 || r >= N) continue;
        for (let c = 0; c < 4; c++) acc[c] += pm[r * 4 + c];
        cnt++;
      }
      for (let c = 0; c < 4; c++) pm[p * 4 + c] = acc[c] / cnt;
    }
  }
  for (const p of fill) {
    const a = pm[p * 4 + 3];
    back[p * 4 + 3] = Math.round(255 * a);
    for (let c = 0; c < 3; c++) back[p * 4 + c] = a > 0.001 ? Math.round(Math.min(255, pm[p * 4 + c] / a)) : 0;
  }
}
// The claws' zone ends in a feather, not a cut.
{
  const feather = Math.round((30 * PX) / scale);
  for (let y = clawBottom - feather; y < clawBottom; y++) for (let x = wl; x <= wr; x++) {
    const i = (y * w + x) * 4;
    front[i + 3] = Math.round(front[i + 3] * ((clawBottom - y) / feather));
  }
}
// Pale specks the backdrop could not reach are stray highlights, except in
// the face (fangs, eye cores): clear them.
{
  const fx0 = centerX - (wr - wl) * 0.45, fx1 = centerX + (wr - wl) * 0.45;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, i = p * 4;
    if (!back[i + 3] || reached[p] || green[p]) continue;
    if (y < eaves && x > fx0 && x < fx1) continue;
    if (0.299 * back[i] + 0.587 * back[i + 1] + 0.114 * back[i + 2] > 170) back[i + 3] = 0;
  }
}
// Fade the lower flames away.
for (let y = Math.round(h * FADE_FROM); y < h; y++) {
  const t = Math.max(0, 1 - (y - h * FADE_FROM) / (h * (0.98 - FADE_FROM)));
  const f = t * t * (3 - 2 * t);
  for (let x = 0; x < w; x++) { const i = (y * w + x) * 4; back[i + 3] = Math.round(back[i + 3] * f); }
}

// ── Write ───────────────────────────────────────────────────────────────────
const OW = Math.round(w * scale), OH = Math.round(h * scale);
// Pixel art at the roof's density: average down to one value per art pixel,
// then blow each back up to an ART x ART block.
async function resized(buf) {
  const aw = Math.round(OW / ART), ah = Math.round(OH / ART);
  const { data: small } = await sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .resize(aw, ah, { kernel: 'mitchell', fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  const { data: o } = await sharp(small, { raw: { width: aw, height: ah, channels: 4 } })
    .resize(aw * ART, ah * ART, { kernel: 'nearest', fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  return { w: aw * ART, h: ah * ART, d: Buffer.from(o) };
}
function alphaBox(img) {
  let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.d[(y * img.w + x) * 4 + 3] > 6) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x0, y0, x1, y1 };
}
async function save(img, box, name) {
  const cw = box.x1 - box.x0 + 1, ch = box.y1 - box.y0 + 1;
  const o = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) img.d.copy(o, y * cw * 4, ((y + box.y0) * img.w + box.x0) * 4, ((y + box.y0) * img.w + box.x1 + 1) * 4);
  await sharp(o, { raw: { width: cw, height: ch, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT, name));
}
const eyesBuf = Buffer.alloc(N * 4);
for (let p = 0; p < N; p++) if (eyeGlow[p] > 0) {
  eyesBuf[p * 4] = eyesBuf[p * 4 + 1] = eyesBuf[p * 4 + 2] = 255;
  eyesBuf[p * 4 + 3] = Math.round(255 * eyeGlow[p]);
}
const backImg = await resized(back), frontImg = await resized(front), eyesImg = await resized(eyesBuf);
const bbox = alphaBox(backImg), fbox = alphaBox(frontImg), ebox = alphaBox(eyesImg);
await save(backImg, bbox, 'entity_back.png');
await save(frontImg, fbox, 'entity_front.png');
await save(eyesImg, ebox, 'entity_eyes.png');

const X = (px) => +((px - centerX * scale) / PX).toFixed(1);
const Y = (py) => +((py - roofTop * scale) / PX).toFixed(1);
const place = (b) => ({ left: X(b.x0), top: Y(b.y0), width: +((b.x1 - b.x0 + 1) / PX).toFixed(1), height: +((b.y1 - b.y0 + 1) / PX).toFixed(1) });
console.log(JSON.stringify({ back: place(bbox), front: place(fbox), eyes: place(ebox), eaves: Y(eaves * scale) }, null, 2));
