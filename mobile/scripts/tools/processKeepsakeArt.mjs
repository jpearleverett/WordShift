#!/usr/bin/env node
/**
 * processKeepsakeArt.mjs: the two story keepsakes that stand in the home world
 * once the player has chosen a boundary (StoryWorldObject).
 *
 *   gate.png  'release' (the last word CLOSER): the garden gate, standing open
 *             on the grass just right of the foundation, ~44dp tall.
 *   door.png  'remember' (the last word CLOSED): a small arched cellar door
 *             drawn into the right end of the foundation stones, ~36dp tall.
 *
 * The sources are Seedream v4 edit generations on flat key green (JPEG, as the
 * endpoint returns them), kept (tracked, not bundled) in assets/raw/keepsakes/
 * with their prompts, references and the chosen candidates in
 * assets/raw/keepsakes/PROMPTS.json. This script:
 *
 *   1. median-filters the raw a little (JPEG ringing, fine grain speckle);
 *   2. keys out the green. The door keys by green EXCESS and unmixes the key
 *      from partly transparent pixels, then despills the edge band. The gate
 *      keys by green CHROMA, so the shadow the model casts on the green goes
 *      with the backdrop, and no green survives in it anywhere (no lime tufts,
 *      no fringe to glow on the night meadow);
 *   3. grades per sprite: the door's arch stones to one cool slate (moss
 *      included, so no green fleck on the sill) and its planks to dark walnut
 *      (so the crack of lamplight reads against them); the gate's orange wood
 *      to the house wall's muted timber, midtones lifted so the planks and
 *      brace stay apart on a night meadow, highlights tamed to a muted cream;
 *   4. crops to the subject and averages down to the sprite's art pixel at its
 *      on-screen height, then crispens the value steps the averaging blurred.
 *      The door's pixel is 1.25dp: measured on foundation_0/5 and roof.png,
 *      downsample-and-restore error is flat from 1.0dp to 1.25dp and jumps at
 *      1.5dp. The gate's is 1.0dp: it stands free on the meadow, a blind review
 *      found it a step coarser than the stones at 1.25dp, and at 1.0dp an art
 *      pixel is exactly 2 or 3 device pixels on the common 2x/3x phones (1.25dp
 *      smears into 2.5 or 3.75);
 *   5. snaps alpha to hard pixel edges (the painted world art has no soft
 *      silhouette) and relights the door's crack of lamplight at full strength
 *      (a 1-pixel light averages away into the planks otherwise);
 *   6. lays the gate's contact shadow procedurally: a soft stepped ellipse of
 *      deep umber along the line through its two feet, nudged down and right
 *      of the top-left light (a patch of shaded ground under any meadow, never
 *      a hard pad or a black wedge);
 *   7. blows each art pixel back up to a block and writes
 *      assets/ui/world/<name>.png at PX image pixels per dp.
 *
 * Deterministic: same raws in, same bytes out.
 *
 *   node scripts/tools/processKeepsakeArt.mjs
 *
 * It prints each sprite's intended on-screen size in dp (and, for the gate,
 * how far its feet stand above its bottom edge: that line goes on the
 * ground). Draw it at exactly that size (resizeMode contain) and one art pixel
 * lands on the grid. KEEPSAKE_GATE_RAW / KEEPSAKE_DOOR_RAW (a file in
 * assets/raw/keepsakes/) process another candidate for comparison;
 * KEEPSAKE_GATE_ART_DP / KEEPSAKE_DOOR_ART_DP, KEEPSAKE_CRISPEN,
 * KEEPSAKE_WOOD_SAT and KEEPSAKE_WOOD_LIFT override the tuning. Needs sharp
 * (build-time only).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

sharp.cache(false);
sharp.concurrency(1);

const ROOT = path.resolve(import.meta.dirname, '../..');
const RAW = path.join(ROOT, 'assets/raw/keepsakes');
const OUT = path.join(ROOT, 'assets/ui/world');

const PX = 4; // image pixels per dp in the written PNG

const prompts = JSON.parse(fs.readFileSync(path.join(RAW, 'PROMPTS.json'), 'utf8'));
// artDp: the sprite's art pixel, in dp (see the header). The gate is 1.0dp:
// it stands free on the meadow, and at 1.0dp an art pixel is exactly 2 or 3
// device pixels on the common 2x/3x phones, so its blocks stay crisp and its
// brace and rails keep their shape; a blind review found it too coarse at
// 1.25dp beside the foundation. The door is 1.25dp (it passed as it is).
// key: 'excess' keys by the pixel's absolute green excess; 'ratio' keys by
//   green CHROMA, so a shadow the model cast on the green goes with it.
// keepMoss: coolStone leaves the little moss green alone (off: all to slate).
// shadow: 'synth' lays a soft procedural contact shadow under the feet (no
//   hard pad, no black wedge); 'none' leaves the sprite without one.
const JOBS = [
  { name: 'gate', heightDp: 44, artDp: 1.0, key: 'ratio', coolStone: false, walnut: false, gradeWood: true, tameLight: true, lamp: false, shadow: 'synth' },
  { name: 'door', heightDp: 36, artDp: 1.25, key: 'excess', coolStone: true, keepMoss: false, walnut: true, gradeWood: false, tameLight: false, lamp: true, shadow: 'none' },
].map((job) => {
  const env = (k) => process.env[`KEEPSAKE_${job.name.toUpperCase()}_${k}`];
  const artDp = Number(env('ART_DP') ?? job.artDp);
  return { ...job, artDp, art: Math.round(artDp * PX), raw: env('RAW') ?? prompts.chosen[job.name].candidate };
});

// Key thresholds, as a fraction of the backdrop's own green excess
// (G - max(R, B)). Painted subject pixels, moss and grass tufts included, sit
// under ~0.25; the generated backdrop sits at 1.0 with a little JPEG noise.
const KEY_SOLID = 0.28; // at or below: fully opaque
const KEY_CLEAR = 0.78; // at or above: fully transparent
const RATIO_EXCESS_MIN = 12; // 'ratio' key: below this absolute green excess a pixel is subject
const RATIO_EXCESS_FULL = 40; // 'ratio' key: from here the chroma ratio applies in full
const EDGE_BAND = 6; // raw pixels from the matte edge that get despilled
const OPAQUE = 0.55; // an art pixel at or above this coverage is solid
const CROP_MIN = 0.18; // crop: a raw pixel counts as subject above this alpha
const MEDIAN = 5; // raw-pixel median before keying
const LIGHT_KNEE = 0.56; // lightness above this is compressed (tameLight)
const WOOD_HUE = 26; // gradeWood: the house wall's timber hue
const WOOD_SAT_SCALE = Number(process.env.KEEPSAKE_WOOD_SAT ?? 0.6); // gradeWood: saturation scale
const WOOD_SAT_MAX = 0.46; // gradeWood: saturation ceiling (the world's wood p90)
const WOOD_LIFT = Number(process.env.KEEPSAKE_WOOD_LIFT ?? 1.4); // gradeWood: midtone lift (1 = none): the planks and brace stay apart on a night meadow
const CRISPEN = Number(process.env.KEEPSAKE_CRISPEN ?? 0.45); // unsharp amount at the art pixel
const LAMP_MIN = 0.16; // share of an art pixel the lamplight must cross to light it
const LAMP_RGB = [255, 184, 82]; // the warm amber of the lamplit crack
const SHADOW_PAD = 2; // synth shadow: art rows added below the feet
const SHADOW_PAD_X = 1; // synth shadow: art columns added each side
const SHADOW_SHIFT_X = 1; // synth shadow: nudged right, away from the top-left light (art px)
const SHADOW_SHIFT_Y = 0.5; // synth shadow: centre this far below the ground line (art px)
const SHADOW_REACH_X = 2.5; // synth shadow: how far it reaches past each foot (art px)
const SHADOW_DEPTH = 2.4; // synth shadow: half-height of the ellipse (art px)
const SHADOW_STEPS = [[0.62, 0.44], [0.3, 0.3], [0.08, 0.16]]; // [falloff edge, alpha], strongest first
const SHADOW_RGB = [26, 19, 16]; // a deep umber: shaded earth, not black

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

async function loadRaw(file) {
  // A small median first: it drops the JPEG ringing and the finest wood-grain
  // speckle, which would otherwise average into mud at the art pixel, while
  // keeping the edges of planks, braces and stones.
  const { data, info } = await sharp(path.join(RAW, file)).removeAlpha().median(MEDIAN).raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, d: data };
}

/** The backdrop: per-channel median of a border ring. */
function backdrop({ w, h, d }) {
  const rs = [], gs = [], bs = [];
  const ring = 16;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (x >= ring && y >= ring && x < w - ring && y < h - ring) continue;
    const i = (y * w + x) * 3; rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]);
  }
  const med = (a) => a.sort((p, q) => p - q)[a.length >> 1];
  return [med(rs), med(gs), med(bs)];
}

/**
 * Key, unmix and despill. Returns premultiplied-ready RGBA (straight alpha).
 *
 * mode 'excess': k is the pixel's green excess (G - max(R, B)) as a share of
 * the backdrop's, so a darker green (a shadow the model cast on the backdrop)
 * keys only partly and survives as a translucent dark.
 * mode 'ratio': k is the green excess as a share of G itself (green CHROMA),
 * so a shadow cast on the backdrop keys out like the backdrop; the ratio is
 * faded out where the absolute excess is tiny, or a near-black iron pixel with
 * a JPEG green cast would key. Partly keyed pixels are despilled rather than
 * unmixed: the backdrop behind a cast shadow is not the ring colour, and the
 * gate's silhouette is snapped hard at the art pixel anyway.
 */
function keyOut(img, bg, mode = 'excess') {
  const { w, h, d } = img;
  const N = w * h;
  const bgExcess = bg[1] - Math.max(bg[0], bg[2]);
  const bgRatio = bgExcess / Math.max(1, bg[1]);
  const alpha = new Float32Array(N);
  for (let p = 0; p < N; p++) {
    const i = p * 3;
    const ex = d[i + 1] - Math.max(d[i], d[i + 2]);
    const k = mode === 'ratio'
      ? (ex / Math.max(1, d[i + 1])) / bgRatio * smooth(RATIO_EXCESS_MIN, RATIO_EXCESS_FULL, ex)
      : ex / bgExcess;
    alpha[p] = 1 - smooth(KEY_SOLID, KEY_CLEAR, k);
  }
  // Distance (in raw pixels, chessboard) to the nearest mostly-clear pixel:
  // the edge band that carries green spill.
  const dist = new Uint16Array(N).fill(65535);
  const q = [];
  for (let p = 0; p < N; p++) if (alpha[p] < 0.5) { dist[p] = 0; q.push(p); }
  for (let head = 0; head < q.length; head++) {
    const p = q[head]; const x = p % w, y = (p - x) / w; const nd = dist[p] + 1;
    if (nd > EDGE_BAND) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const np = ny * w + nx;
      if (dist[np] > nd) { dist[np] = nd; q.push(np); }
    }
  }
  const out = Buffer.alloc(N * 4);
  for (let p = 0; p < N; p++) {
    const a = alpha[p];
    const o = p * 4;
    if (a <= 0.004) continue;
    const i = p * 3;
    let r = d[i], g = d[i + 1], b = d[i + 2];
    if (mode === 'ratio') {
      // The gate is warm wood and neutral iron: no green belongs in it at all
      // (no lime tufts, no key fringe), so green is capped everywhere.
      g = Math.min(g, Math.max(r, b));
    } else if (a < 1) {
      // obs = a * c + (1 - a) * bg  =>  c = (obs - (1 - a) * bg) / a
      r = clamp((r - (1 - a) * bg[0]) / a, 0, 255);
      g = clamp((g - (1 - a) * bg[1]) / a, 0, 255);
      b = clamp((b - (1 - a) * bg[2]) / a, 0, 255);
    }
    if (mode !== 'ratio' && dist[p] <= EDGE_BAND) {
      // Spill cap: a real moss or grass green survives, key fringe does not.
      const cap = Math.max(r, b) * 1.3 + 6;
      if (g > cap) g = cap;
    }
    out[o] = Math.round(r); out[o + 1] = Math.round(g); out[o + 2] = Math.round(b);
    out[o + 3] = Math.round(a * 255);
  }
  return { w, h, d: out };
}

/** Crop to the covered area (alpha over CROP_MIN). */
function crop(img) {
  const { w, h, d } = img;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 255 * CROP_MIN) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const o = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) d.copy(o, y * cw * 4, ((y + y0) * w + x0) * 4, ((y + y0) * w + x1 + 1) * 4);
  return { w: cw, h: ch, d: o };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const dd = mx - mn;
  const s = l > 0.5 ? dd / (2 - mx - mn) : dd / (mx + mn);
  const hh = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4;
  return [hh * 60, s, l];
}
function hslToRgb(hh, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((hh / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = hh < 60 ? [c, x, 0] : hh < 120 ? [x, c, 0] : hh < 180 ? [0, c, x] : hh < 240 ? [0, x, c] : hh < 300 ? [x, 0, c] : [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/**
 * The door's arch stones: settle them to one cool grey-blue. Stone is the
 * low-saturation material (the walnut planks and the lamplight are strongly
 * warm, the iron is near black and neutral); keep its value and texture, move
 * its hue to a cool slate and strip any cyan rim light the key reflected into
 * it. Saturation falls off smoothly so the plank/stone boundary does not band.
 */
function coolStone(img, keepMoss) {
  const { w, h, d } = img;
  for (let p = 0; p < w * h; p++) {
    const o = p * 4;
    if (d[o + 3] === 0) continue;
    const [hh, s, l] = rgbToHsl(d[o], d[o + 1], d[o + 2]);
    const warm = hh < 50 || hh > 330;
    const moss = keepMoss && hh > 65 && hh < 160 && s > 0.2; // keep the little moss green
    if (moss || l < 0.08) continue;
    // Warm pixels are stone only when grey; cool pixels are stone (or the
    // key's blue reflection on stone) whatever their saturation.
    const wStone = warm ? 1 - smooth(0.16, 0.3, s) : 1;
    if (wStone <= 0) continue;
    const [cr, cg, cb] = hslToRgb(222, 0.12, l);
    d[o] = Math.round(d[o] + (cr - d[o]) * wStone);
    d[o + 1] = Math.round(d[o + 1] + (cg - d[o + 1]) * wStone);
    d[o + 2] = Math.round(d[o + 2] + (cb - d[o + 2]) * wStone);
  }
}

/**
 * The door's planks: the model lights them a bright orange, the same colour as
 * the crack of lamplight under the door, so the crack disappears. Settle the
 * planks to the dark walnut of the story's door; the lamplight (brighter than
 * any plank) is left alone and now reads against them.
 */
function walnut(img) {
  const { w, h, d } = img;
  for (let p = 0; p < w * h; p++) {
    const o = p * 4;
    if (d[o + 3] === 0) continue;
    const [hh, s, l] = rgbToHsl(d[o], d[o + 1], d[o + 2]);
    if (!(hh < 50 || hh > 330) || s < 0.3) continue;
    const t = 1 - smooth(0.5, 0.6, l);
    if (t <= 0) continue;
    const [r, g, b] = hslToRgb(hh, s * (1 - 0.2 * t), l * (1 - 0.3 * t));
    d[o] = Math.round(r); d[o + 1] = Math.round(g); d[o + 2] = Math.round(b);
  }
}

/**
 * The gate's wood: the model paints it a saturated orange walnut, far hotter
 * than the world's timber (the house wall sits at hue ~27, saturation ~0.32;
 * the pit's wood ~0.27; this raw at ~0.59, p90 ~0.73), and at the art pixel
 * the lit edges read as flame. Pull every warm pixel toward the wall's hue,
 * cut its saturation to the world's range and lift the midtones a little so
 * the planks and brace do not sink into one dark slab. Cool pixels (the iron,
 * carrying the key's teal reflection) go neutral.
 */
function gradeWood(img) {
  const { w, h, d } = img;
  for (let p = 0; p < w * h; p++) {
    const o = p * 4;
    if (d[o + 3] === 0) continue;
    const [hh, s, l] = rgbToHsl(d[o], d[o + 1], d[o + 2]);
    if (!(hh < 100 || hh > 330)) {
      // Cool pixels are the iron hinges and latch, with the key's teal cast
      // reflected in them: iron is a neutral near-black.
      const [r, g, b] = hslToRgb(WOOD_HUE, s * 0.2, l);
      d[o] = Math.round(r); d[o + 1] = Math.round(g); d[o + 2] = Math.round(b);
      continue;
    }
    const hu = hh > 330 ? hh - 360 : hh;
    // Yellow-olive (the key's green cast in the shaded wood) is pulled
    // harder than the wood's own orange-browns, so no post foot goes olive.
    const nh = (WOOD_HUE + (hu - WOOD_HUE) * (hu > 40 ? 0.15 : 0.5) + 360) % 360;
    const ns = Math.min(s * WOOD_SAT_SCALE, WOOD_SAT_MAX);
    const nl = 1 - Math.pow(1 - l, WOOD_LIFT);
    const [r, g, b] = hslToRgb(nh, ns, nl);
    d[o] = Math.round(r); d[o + 1] = Math.round(g); d[o + 2] = Math.round(b);
  }
}

/**
 * The gate: the model lights the plank tops as if a lamp stood beside it; at
 * the art pixel those hot yellow tops read as flame. The world art keeps its
 * highlights to a muted cream, so compress lightness above LIGHT_KNEE and
 * drain some saturation from what is left.
 */
function tameLight(img) {
  const { w, h, d } = img;
  for (let p = 0; p < w * h; p++) {
    const o = p * 4;
    if (d[o + 3] === 0) continue;
    const [hh, s, l] = rgbToHsl(d[o], d[o + 1], d[o + 2]);
    if (l <= LIGHT_KNEE) continue;
    const nl = LIGHT_KNEE + (l - LIGHT_KNEE) * 0.45;
    const ns = s * (1 - 0.4 * smooth(LIGHT_KNEE, 0.8, l));
    const [r, g, b] = hslToRgb(hh, ns, nl);
    d[o] = Math.round(r); d[o + 1] = Math.round(g); d[o + 2] = Math.round(b);
  }
}

/**
 * Averaging 20+ raw pixels into one blurs value steps (a brace against its
 * planks, a stone against its mortar) that pixel art keeps hard. A light
 * unsharp mask over the opaque art pixels restores them; transparent and
 * shadow pixels neither sharpen nor feed the blur.
 */
function crispen(s, aw, ah) {
  const src = Buffer.from(s);
  for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) {
    const o = (y * aw + x) * 4;
    if (src[o + 3] !== 255) continue;
    const acc = [0, 0, 0]; let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= aw || ny >= ah) continue;
      const q = (ny * aw + nx) * 4;
      if (src[q + 3] !== 255) continue;
      for (let c = 0; c < 3; c++) acc[c] += src[q + c];
      n++;
    }
    for (let c = 0; c < 3; c++) s[o + c] = Math.round(clamp(src[o + c] + CRISPEN * (src[o + c] - acc[c] / n), 0, 255));
  }
}

/**
 * The crack of lamplight: bright, saturated amber-to-yellow in the lower part
 * of the sprite. Hue 27+ separates it from the lit planks (orange, hue ~15-25),
 * which are as saturated but redder.
 */
function lampMask(img) {
  const { w, h, d } = img;
  const m = new Uint8Array(w * h);
  for (let y = Math.floor(h * 0.6); y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x, o = p * 4;
    if (d[o + 3] === 0) continue;
    const [hh, s, l] = rgbToHsl(d[o], d[o + 1], d[o + 2]);
    if (hh >= 27 && hh <= 70 && s > 0.6 && l > 0.45) m[p] = 1;
  }
  return { w, h, m };
}

/** Share of each art pixel the mask covers (an exact cell average). */
function cellCover({ w, h, m }, aw, ah) {
  const sum = new Float64Array(aw * ah), cnt = new Float64Array(aw * ah);
  for (let y = 0; y < h; y++) {
    const cy = Math.min(ah - 1, Math.floor(y * ah / h));
    for (let x = 0; x < w; x++) {
      const c = cy * aw + Math.min(aw - 1, Math.floor(x * aw / w));
      sum[c] += m[y * w + x]; cnt[c] += 1;
    }
  }
  return Array.from(sum, (v, i) => v / cnt[i]);
}

async function pixelate(img, heightDp, artDp, lamp, shadow) {
  // A synthesized contact shadow adds SHADOW_PAD rows below the feet; the
  // subject is sized so the whole sprite still comes to heightDp.
  const ah = Math.round(heightDp / artDp) - (shadow === 'synth' ? SHADOW_PAD : 0);
  const aw = Math.max(1, Math.round(img.w * ah / img.h));
  // sharp premultiplies alpha while resampling, so the key's fringe cannot
  // bleed its colour into the art pixels.
  const { data: small } = await sharp(img.d, { raw: { width: img.w, height: img.h, channels: 4 } })
    .resize(aw, ah, { kernel: 'mitchell', fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  const s = Buffer.from(small);
  for (let p = 0; p < aw * ah; p++) {
    const o = p * 4; const a = s[o + 3] / 255;
    // Hard pixel edges: a partly covered art pixel is silhouette fringe.
    if (a >= OPAQUE) s[o + 3] = 255;
    else { s[o] = s[o + 1] = s[o + 2] = s[o + 3] = 0; }
  }
  crispen(s, aw, ah);
  if (lamp) {
    // A thin line of light averages away into the dark planks around it.
    // Pixel art keeps a thin light at full strength: any art pixel the crack
    // crosses meaningfully becomes lamplight.
    const cover = cellCover(lamp, aw, ah);
    for (let p = 0; p < aw * ah; p++) {
      const t = clamp((cover[p] - LAMP_MIN) / LAMP_MIN, 0, 1);
      if (t <= 0 || s[p * 4 + 3] === 0) continue;
      for (let c = 0; c < 3; c++) s[p * 4 + c] = Math.round(s[p * 4 + c] + (LAMP_RGB[c] - s[p * 4 + c]) * t);
    }
  }
  return shadow === 'synth' ? synthShadow(s, aw, ah) : { aw, ah, d: s, feet: 0 };
}

/**
 * A soft contact shadow under a free-standing object, drawn at the art pixel.
 * The feet are the lowest solid pixel under each end of the object (its two
 * posts); the ground runs through them. The shadow is an ellipse on that line,
 * nudged down and right (the light is top left), a little wider than the
 * object, fading from SHADOW_ALPHA in a few flat steps: a patch of shaded
 * ground, never a hard pad and never a black hole. It darkens whatever meadow
 * the sprite stands on, so the object sits in every phase. The canvas grows
 * SHADOW_PAD rows below and SHADOW_PAD_X columns each side to hold it.
 */
function synthShadow(src, aw, ah) {
  const W = aw + 2 * SHADOW_PAD_X, H = ah + SHADOW_PAD;
  const d = Buffer.alloc(W * H * 4);
  for (let y = 0; y < ah; y++) src.copy(d, (y * W + SHADOW_PAD_X) * 4, y * aw * 4, (y + 1) * aw * 4);
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[(y * W + x) * 4 + 3] === 255;
  // Each end's foot: the lowest solid pixel in the outer fifth of the columns.
  const foot = (x0, x1) => {
    let fy = -1, sx = 0, n = 0;
    for (let x = x0; x < x1; x++) for (let y = H - 1; y >= 0; y--) if (solid(x, y)) {
      if (y > fy) { fy = y; sx = x; n = 1; } else if (y === fy) { sx += x; n++; }
      break;
    }
    return [sx / Math.max(1, n), fy];
  };
  const band = Math.max(2, Math.round(aw / 5));
  const [xL, yL] = foot(SHADOW_PAD_X, SHADOW_PAD_X + band);
  const [xR, yR] = foot(SHADOW_PAD_X + aw - band, SHADOW_PAD_X + aw);
  const slope = (yR - yL) / Math.max(1, xR - xL);
  const cx = (xL + xR) / 2 + SHADOW_SHIFT_X;
  const A = (xR - xL) / 2 + SHADOW_REACH_X;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    if (d[o + 3] === 255) continue;
    const gy = yL + slope * (x - xL) + SHADOW_SHIFT_Y;
    const u = (x - cx) / A, v = (y - gy) / SHADOW_DEPTH;
    const f = 1 - (u * u + v * v);
    if (f <= 0) continue;
    // Flat steps, as a pixel artist would dither a soft shadow.
    const a = SHADOW_STEPS.find(([edge]) => f >= edge)?.[1] ?? 0;
    if (a === 0) continue;
    d[o] = SHADOW_RGB[0]; d[o + 1] = SHADOW_RGB[1]; d[o + 2] = SHADOW_RGB[2];
    d[o + 3] = Math.round(a * 255);
  }
  // Rows from the sprite's bottom edge to the feet (the ground line).
  return { aw: W, ah: H, d, feet: H - 1 - Math.max(yL, yR) };
}

fs.mkdirSync(OUT, { recursive: true });
const report = {};
for (const job of JOBS) {
  const raw = await loadRaw(job.raw);
  const bg = backdrop(raw);
  const keyed = crop(keyOut(raw, bg, job.key));
  const lamp = job.lamp ? lampMask(keyed) : null; // before any grading touches it
  if (job.coolStone) coolStone(keyed, job.keepMoss);
  if (job.walnut) walnut(keyed);
  if (job.gradeWood) gradeWood(keyed);
  if (job.tameLight) tameLight(keyed);
  const art = await pixelate(keyed, job.heightDp, job.artDp, lamp, job.shadow);
  const file = path.join(OUT, `${job.name}.png`);
  await sharp(art.d, { raw: { width: art.aw, height: art.ah, channels: 4 } })
    .resize(art.aw * job.art, art.ah * job.art, { kernel: 'nearest', fit: 'fill' })
    .png({ compressionLevel: 9, palette: false })
    .toFile(file);
  report[job.name] = {
    raw: job.raw, backdrop: bg, artDp: job.artDp, artPixels: [art.aw, art.ah], image: [art.aw * job.art, art.ah * job.art],
    dp: { width: +(art.aw * job.artDp).toFixed(2), height: +(art.ah * job.artDp).toFixed(2) },
    ...(job.shadow === 'synth' ? { feetAboveBottomDp: +(art.feet * job.artDp).toFixed(2) } : {}),
    bytes: fs.statSync(file).size,
  };
}
console.log(JSON.stringify(report, null, 2));
