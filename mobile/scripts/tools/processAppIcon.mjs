#!/usr/bin/env node
// App-icon processor: emits the two bundled icon files.
//
//   assets/icon.png          1024 opaque full-bleed   -- expo.icon (iOS + the
//                                                        legacy Android mipmaps)
//   assets/adaptive-icon.png 1024 transparent mark    -- the Android 8+ launcher
//                                                        foreground
//
// It is step 1 of `npm run generate:assets`; generateSplash.mjs is step 2 and
// mattes Ember out of the icon.png this writes, so the order is load-bearing.
// Pure Node + pngjs, no Math.random, no Date.now: byte-reproducible.
//
// ---------------------------------------------------------------------------
// icon.png -- the painted scene, corners un-baked (F111)
//
// The source art (assets/raw/app_icon_source.png) is a finished square
// illustration of Ember, the W/S tiles and the amber gem, painted inside a
// rounded rectangle that leaves its four corners flat near-black. iOS and Play
// apply their OWN corner mask on top, so those baked corners fought the system
// mask and read as dark arcs inside the rounded icon. An iOS icon must be
// OPAQUE (a transparent one is rejected or flattened to black), so the fix is
// not transparency but a full-bleed extension: fillCorners() detects the baked
// surround (a corner-seeded flood, box-bounded so it can never leak into the
// interior art) and inpaints it with the nearest illustration pixel via a
// multi-source BFS. The straight edges are already full-bleed art, so only the
// four corners are rebuilt. This half is UNCHANGED and its output is pinned:
// generateSplash.mjs's matte is tuned to these exact pixels, and the splash
// that already shipped must regenerate byte-identically.
//
// ---------------------------------------------------------------------------
// adaptive-icon.png -- Ember's head, filling the safe circle
//
// The Android foreground is a 108dp canvas; the launcher MASKS it and only the
// centre 72dp is ever visible, in a shape (circle / squircle / rounded square /
// teardrop) we do not get to choose. The one region guaranteed unclipped by
// every shape is the centre 66dp circle -- radius 33/108 = 0.30556 of the
// canvas width -- so on this model (a mark on a colour field, transparent
// surround, adaptiveIcon.backgroundColor painted behind) that circle is both
// the budget AND the target.
//
// This USED to be the whole app-icon tile: the painted scene re-masked to a
// rounded card at 47.5% of the canvas. That passed the safe-circle ceiling at
// 98.3% of it while filling only 71.2% of the mask diameter, because a rounded
// card spends its entire radius budget on its four CORNERS (32.4dp at the
// diagonal against 25.6dp at the flat side). Masked by a circle it rendered as
// a rounded SQUARE floating in a CIRCLE with a ~10dp ring of #FFF0F5 pale pink
// on every cardinal side, in a colour that appears nowhere in the game. That is
// the same defect the launch screen had, one frame earlier.
//
// So the foreground is now EMBER'S HEAD -- the same mark the Android 12+ system
// splash and the JS boot hold already show -- seated to fill the 66dp circle on
// PARCH.base #F3E2BF, the parchment fill of every cottage card and already the
// background of both those surfaces. Launcher, system splash and boot hold
// become one character on one ground, and the player taps the face that greets
// them. adaptiveIcon.backgroundColor moves to that hex with it.
//
// The matte is NOT re-cut here. generateSplash.mjs owns the one Ember cutout in
// this repo (colour matte, painted-band normalisation, largest blob, hole fill,
// open/close, colour dilation -- blind-graded over several rounds) and this
// file imports it, so there can never be two answers to "where does she end".
//
// Run: node scripts/tools/processAppIcon.mjs   (from mobile/)
// Set WORDSHIFT_ICON_REVIEW=1 to also write an unlabelled grading sheet to
// scripts/tools/.icon-review/ (three mask shapes x the three pixel sizes a
// launcher really draws), which is how this art is judged -- blind, at true
// delivery size. The sheet is never committed.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import {
  extractHead, placementCircle, renderEmber,
  save, resample, blit, maxSubjectRadius, solidCentre,
} from './generateSplash.mjs';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../../assets');
const SRC = path.join(ASSETS, 'raw', 'app_icon_source.png');
const OUT = 1024;
// Flatten base for any transparent pixels (the source is opaque; this only
// matters if a future source has alpha). A warm near-black.
const FLATTEN = [12, 10, 14];

const src = PNG.sync.read(fs.readFileSync(SRC));
const { width: sw, height: sh } = src;

// --------------------------------------------------------------------------
// fillCorners: un-bake the rounded-corner surround into full-bleed art.
//
// 1. Mark the "surround": near-black pixels reachable by a 4-connected flood
//    from each image corner, capped to a corner box (never crosses into the
//    interior illustration). The straight edges are real art, so the flood
//    stays inside the four corner pockets.
// 2. Multi-source BFS from the art pixels bordering the surround fills every
//    surround pixel with its nearest illustration colour (Manhattan-nearest),
//    radially extending the corner art outward to the square's edge.
// Returns a NEW PNG (the input is left untouched, so the adaptive foreground
// can still use the original art).
// --------------------------------------------------------------------------
function fillCorners(img) {
  const { width: w, height: h, data } = img;
  const out = new PNG({ width: w, height: h });
  data.copy(out.data);
  const d = out.data;

  const NEAR_BLACK = 40;   // max channel below this = baked corner surround
  const BOX = Math.round(w * 0.26); // corner box depth (~326px @1254; > corner radius)
  const maxChan = (i) => Math.max(d[i], d[i + 1], d[i + 2]);
  const inCornerBox = (x, y) =>
    (x < BOX || x >= w - BOX) && (y < BOX || y >= h - BOX);

  const surround = new Uint8Array(w * h);
  const stack = [];
  const seed = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (surround[p] || maxChan(p * 4) >= NEAR_BLACK) return;
    surround[p] = 1;
    stack.push(p);
  };
  seed(0, 0); seed(w - 1, 0); seed(0, h - 1); seed(w - 1, h - 1);
  while (stack.length) {
    const p = stack.pop();
    const x = p % w, y = (p / w) | 0;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const q = ny * w + nx;
      if (surround[q] || !inCornerBox(nx, ny)) continue;
      if (maxChan(q * 4) >= NEAR_BLACK) continue;
      surround[q] = 1;
      stack.push(q);
    }
  }
  // Dilate the surround by 1px (still box-bounded) so the thin anti-aliased
  // ring between the corner black and the art is swept in too — no dark halo.
  const grow = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!surround[p]) continue;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (!surround[q] && inCornerBox(nx, ny)) grow.push(q);
      }
    }
  for (const q of grow) surround[q] = 1;

  // Multi-source BFS: seed with surround pixels bordering real art (take that
  // art colour), then flood the colour inward across the surround.
  const fr = new Uint8Array(w * h), fg = new Uint8Array(w * h), fb = new Uint8Array(w * h);
  const filled = new Uint8Array(w * h);
  let head = 0;
  const queue = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (!surround[p]) continue;
      let r = 0, g = 0, b = 0, n = 0;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (surround[q]) continue;
        const o = q * 4;
        r += d[o]; g += d[o + 1]; b += d[o + 2]; n++;
      }
      if (n > 0) {
        fr[p] = Math.round(r / n); fg[p] = Math.round(g / n); fb[p] = Math.round(b / n);
        filled[p] = 1; queue.push(p);
      }
    }
  while (head < queue.length) {
    const p = queue[head++];
    const x = p % w, y = (p / w) | 0;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const q = ny * w + nx;
      if (!surround[q] || filled[q]) continue;
      fr[q] = fr[p]; fg[q] = fg[p]; fb[q] = fb[p];
      filled[q] = 1; queue.push(q);
    }
  }
  for (let p = 0; p < w * h; p++) {
    if (!surround[p]) continue;
    const o = p * 4;
    d[o] = fr[p]; d[o + 1] = fg[p]; d[o + 2] = fb[p]; d[o + 3] = 255;
  }
  return out;
}

// Alpha-weighted box-average downscale of a source image to target x target.
function downscale(source, flatten, target = OUT) {
  const iw = source.width, ih = source.height, sd = source.data;
  const outp = new PNG({ width: target, height: target });
  const sxScale = iw / target, syScale = ih / target;
  for (let dy = 0; dy < target; dy++) {
    const sy0 = dy * syScale, sy1 = (dy + 1) * syScale;
    for (let dx = 0; dx < target; dx++) {
      const sx0 = dx * sxScale, sx1 = (dx + 1) * sxScale;
      let r = 0, g = 0, b = 0, a = 0, wsum = 0;
      for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy++) {
        const hy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx++) {
          const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          const wgt = hy * wx;
          const o = (sy * iw + sx) * 4;
          const pa = sd[o + 3] / 255;
          r += sd[o] * pa * wgt; g += sd[o + 1] * pa * wgt; b += sd[o + 2] * pa * wgt;
          a += pa * wgt; wsum += wgt;
        }
      }
      const o = (dy * target + dx) * 4;
      const alpha = wsum > 0 ? a / wsum : 0;
      if (alpha > 0.0001) {
        const rr = r / a, gg = g / a, bb = b / a;
        if (flatten) {
          outp.data[o] = Math.round(rr * alpha + FLATTEN[0] * (1 - alpha));
          outp.data[o + 1] = Math.round(gg * alpha + FLATTEN[1] * (1 - alpha));
          outp.data[o + 2] = Math.round(bb * alpha + FLATTEN[2] * (1 - alpha));
          outp.data[o + 3] = 255;
        } else {
          outp.data[o] = Math.round(rr); outp.data[o + 1] = Math.round(gg); outp.data[o + 2] = Math.round(bb);
          outp.data[o + 3] = Math.round(alpha * 255);
        }
      } else if (flatten) {
        outp.data[o] = FLATTEN[0]; outp.data[o + 1] = FLATTEN[1]; outp.data[o + 2] = FLATTEN[2]; outp.data[o + 3] = 255;
      }
    }
  }
  return outp;
}

// ---------------------------------------------------------------------------
// 1. icon.png -- the FULL-BLEED opaque art (corners un-baked; iOS masks it).
//    Written first: extractHead() below mattes Ember out of this exact file,
//    so step 1 of generate:assets stays self-consistent within a single run.
// ---------------------------------------------------------------------------
const ICON = path.join(ASSETS, 'icon.png');
const fullBleed = fillCorners(src);
fs.writeFileSync(ICON, PNG.sync.write(downscale(fullBleed, true)));
console.log(`wrote icon.png (${OUT}, full-bleed opaque) from ${path.basename(SRC)}`);

// ---------------------------------------------------------------------------
// 2. adaptive-icon.png -- Ember's head, seated to fill the 66/108 safe circle.
// ---------------------------------------------------------------------------
// The foreground canvas IS the 108dp canvas, so 1dp = 1024/108 = 9.4815px and
// the guaranteed-safe circle has radius 0.30556 * 1024 = 312.9px. Budget
// outward from her fur:
//
//   fur r 272px                -> 57.4dp diameter
//   + 21px contour  = 293px    -> 61.8dp outlined silhouette  = 86% of the mask
//   + 16px bloom    = 309px    -> 65.2dp                      = 91% of the mask
//
// The contour is 21px = 2.2dp against the splash mark's 10px = 2.0dp on a
// canvas 1.85x larger in dp -- proportionally about 3x heavier relative to her
// face, and deliberate rather than drift. The splash mark is delivered at
// 192dp; this is delivered at 48px on a launcher grid, where 2.2dp lands at
// 1.5px. Under about 1.5px a contour simply is not there, and house doctrine is
// that the contour is what holds a silhouette small. The bloom is carried wide
// (16px) and its shaded lobe deep for the same reason: her muzzle and chin are
// cream sitting on a cream field, so at 48px the lower half of her face needs
// warm contact shade behind the contour or it dissolves into the parchment.
const ADAPTIVE = {
  foxR: 272,
  contourPx: 21,
  glowPad: 16,
  // Browner and deeper than the splash's [0x8a,0x4e,0x18] (between WOOD.dark
  // and WOOD.seam), so the lower-right lobe reads as contact shade at 48px
  // instead of a soft halo. See the glowShade note in generateSplash.mjs.
  glowShade: [0x6c, 0x3f, 0x1c],
};
const ADAPTIVE_SAFE_RADIUS = 33 / 108;
// A ceiling alone cannot catch the defect this replaced (it sat at 98.3% of the
// ceiling while filling 71.2% of the mask), so the generator refuses to write
// art that does not also FILL the circle. Mirrors the floor in
// src/__tests__/androidLaunchAssets.test.ts.
const ADAPTIVE_MIN_BODY_WIDTH = 0.50;

/**
 * Where she sits in that circle. generateSplash's placementCircle() centres her
 * on her BOUNDING BOX, which the splash chose deliberately: the smallest
 * enclosing circle is pinned by her ear tip, her crown and her chin, and at
 * 192dp it leaves a crescent of dead field that blind reviewers named every
 * round. That trade FLIPS at launcher size. Bbox-centred, her outlined body
 * spans 74.7% of the 72dp mask and reads as floating in a ring -- the exact
 * defect this replaces; recentred on the smallest enclosing circle she spans
 * ~80% and touches her mask at ear tip, crown and chin. The cost is 2.3dp of
 * downward shift in a 72dp window, which at 48px is 1.5 pixels. So: smallest
 * enclosing circle here, bounding box on the splash, and the difference is a
 * mask 2.7x smaller in dp, not a change of mind.
 *
 * Solved by a deterministic halving search over the hull points rather than
 * hardcoded, so it follows the matte if the character art is ever re-exported.
 */
function smallestEnclosingCentre(W, head, bbox, seed) {
  const pts = [];
  for (let y = bbox[1]; y <= bbox[3]; y++) for (let x = bbox[0]; x <= bbox[2]; x++) {
    const i = y * W + x;
    if (!head[i]) continue;
    if (head[i - 1] && head[i + 1] && head[i - W] && head[i + W]) continue;
    pts.push(x + 0.5, y + 0.5);
  }
  const maxR = (ox, oy) => {
    let m = 0;
    for (let k = 0; k < pts.length; k += 2) {
      const d = Math.hypot(pts[k] - ox, pts[k + 1] - oy);
      if (d > m) m = d;
    }
    return m;
  };
  let best = { cx: seed.cx, cy: seed.cy, r: maxR(seed.cx, seed.cy) };
  for (let step = 64; step >= 0.25; step /= 2) {
    const { cx, cy } = best;
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
      const nx = cx + dx * step, ny = cy + dy * step;
      const r = maxR(nx, ny);
      if (r < best.r) best = { cx: nx, cy: ny, r };
    }
  }
  return best;
}

const headData = extractHead(ICON);
const bboxCircle = placementCircle(headData.W, headData.head, headData.bbox);
const circle = smallestEnclosingCentre(headData.W, headData.head, headData.bbox, bboxCircle);
const mark = renderEmber(OUT, headData, circle, ADAPTIVE);

const radius = maxSubjectRadius(mark, OUT);
// solidCentre measures the alpha >= 128 body -- what the eye reads as her,
// which is the axis the defect lived on (span, not radius).
const body = solidCentre(mark, OUT);
const bodyWidth = body.w / OUT;
if (radius > ADAPTIVE_SAFE_RADIUS) {
  throw new Error(`adaptive foreground overflows the 66/108 safe circle: ${radius.toFixed(5)} > ${ADAPTIVE_SAFE_RADIUS.toFixed(5)}`);
}
if (bodyWidth < ADAPTIVE_MIN_BODY_WIDTH) {
  throw new Error(`adaptive foreground under-fills the safe circle: solid body ${bodyWidth.toFixed(4)} < ${ADAPTIVE_MIN_BODY_WIDTH}`);
}
save(path.join(ASSETS, 'adaptive-icon.png'), OUT, OUT, mark);

const DP = OUT / 108;
console.log(`wrote adaptive-icon.png (${OUT}, Ember on a transparent surround)`);
console.log(`  placement: bbox (${bboxCircle.cx.toFixed(1)},${bboxCircle.cy.toFixed(1)}) r=${bboxCircle.r.toFixed(1)} -> SEC (${circle.cx.toFixed(1)},${circle.cy.toFixed(1)}) r=${circle.r.toFixed(1)}`);
console.log(`  maxSubjectRadius ${radius.toFixed(5)} <= ${ADAPTIVE_SAFE_RADIUS.toFixed(5)} (${(radius * OUT * 2 / DP).toFixed(1)}dp across, ${(radius * OUT * 2 / DP / 72 * 100).toFixed(1)}% of the 72dp mask)`);
console.log(`  solid body ${body.w}x${body.h}px = ${(body.w / DP).toFixed(1)}x${(body.h / DP).toFixed(1)}dp, width ${bodyWidth.toFixed(4)} >= ${ADAPTIVE_MIN_BODY_WIDTH}`);

// ---------------------------------------------------------------------------
// 3. The blind grading sheet (opt-in, never committed).
// ---------------------------------------------------------------------------
// House doctrine is that generated art is judged unlabelled, at its true
// delivery size, over both the cream and the phase-4 ash the game ever puts it
// on -- see scripts/tools/reviewSheet.mjs and generateSplash.mjs's own
// WORDSHIFT_SPLASH_REVIEW sheet. A launcher icon has one extra unknown: the
// mask shape is the device's choice, so all three plausible shapes are drawn.
if (process.env.WORDSHIFT_ICON_REVIEW) {
  const FIELD = [0xf3, 0xe2, 0xbf];   // PARCH.base, the adaptive background
  const GREY = [0x8e, 0x8e, 0x8e];    // neutral sheet ground, so the icon's own edge shows
  const MASKS = {
    circle: (u, v) => 1 - Math.hypot(u, v),
    squircle: (u, v) => 1 - Math.pow(Math.pow(Math.abs(u), 4) + Math.pow(Math.abs(v), 4), 0.25),
    rounded: (u, v) => {
      const r = 0.40, qx = Math.abs(u) - (1 - r), qy = Math.abs(v) - (1 - r);
      const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
      return -(Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r);
    },
  };
  // What a launcher actually draws: composite over the field on the 108dp
  // canvas, crop the centre 72dp, apply the mask. Rendered high and
  // area-resampled so the edge antialiasing is real rather than nearest-neighbour.
  const launcherRender = (fg, size, shapeFn, hi = 512) => {
    const flat = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      const o = i * 4, a = fg[o + 3] / 255, ia = 1 - a;
      flat[o] = Math.round(fg[o] * a + FIELD[0] * ia);
      flat[o + 1] = Math.round(fg[o + 1] * a + FIELD[1] * ia);
      flat[o + 2] = Math.round(fg[o + 2] * a + FIELD[2] * ia);
      flat[o + 3] = 255;
    }
    const visible = size * (72 / 108), off = (size - visible) / 2;
    const out = Buffer.alloc(hi * hi * 4);
    const SS = 3, INV = 1 / (SS * SS);
    for (let y = 0; y < hi; y++) for (let x = 0; x < hi; x++) {
      let cover = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const u = ((x + (sx + 0.5) / SS) / hi) * 2 - 1;
        const v = ((y + (sy + 0.5) / SS) / hi) * 2 - 1;
        if (shapeFn(u, v) > 0) cover += 1;
      }
      cover *= INV;
      if (cover <= 0) continue;
      const sx = Math.min(size - 1, Math.floor(off + ((x + 0.5) / hi) * visible));
      const sy = Math.min(size - 1, Math.floor(off + ((y + 0.5) / hi) * visible));
      const s = (sy * size + sx) * 4, o = (y * hi + x) * 4;
      out[o] = flat[s]; out[o + 1] = flat[s + 1]; out[o + 2] = flat[s + 2];
      out[o + 3] = Math.round(cover * 255);
    }
    return out;
  };
  const SIZES = [48, 72, 144], SHAPES = ['circle', 'squircle', 'rounded'];
  const PAD = 48, GAP = 48, CELL = 144;
  const W = PAD * 2 + SIZES.length * CELL + GAP * (SIZES.length - 1);
  const H = PAD * 2 + SHAPES.length * CELL + GAP * (SHAPES.length - 1);
  const sheet = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    const o = i * 4;
    sheet[o] = GREY[0]; sheet[o + 1] = GREY[1]; sheet[o + 2] = GREY[2]; sheet[o + 3] = 255;
  }
  let y = PAD;
  for (const shape of SHAPES) {
    const hi = launcherRender(mark, OUT, MASKS[shape]);
    let x = PAD;
    for (const s of SIZES) {
      blit(sheet, W, H, resample(hi, 512, s), s, s, Math.round(x + (CELL - s) / 2), Math.round(y + (CELL - s) / 2));
      x += CELL + GAP;
    }
    y += CELL + GAP;
  }
  const dir = path.join(__dirname, '.icon-review');
  fs.mkdirSync(dir, { recursive: true });
  save(path.join(dir, 'adaptive-icon-masks.png'), W, H, sheet);
  console.log(`  review sheet -> ${path.relative(process.cwd(), path.join(dir, 'adaptive-icon-masks.png'))}`);
}
