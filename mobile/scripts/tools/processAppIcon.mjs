#!/usr/bin/env node
// App-icon processor: takes the hand-authored icon art (assets/raw/
// app_icon_source.png — a finished square illustration of the fox, W/S tiles, and
// amber gem, painted inside a rounded rectangle with BAKED near-black corners)
// and produces the bundled icon.png (iOS/store, opaque 1024x1024) and
// adaptive-icon.png (Android foreground, 1024x1024).
//
// F111 fix — un-bake icon.png's rounded corners: the source art fills a rounded
// rectangle and leaves its four corners painted flat near-black. iOS (and Play)
// apply their OWN corner mask on top, so those baked corners fought the system
// mask and read as dark arcs inside the rounded icon. iOS app icons must be
// OPAQUE (a transparent icon is rejected / gets flattened to black), so the clean
// fix is NOT transparency but a full-bleed extension: `fillCorners()` detects the
// baked near-black corner surround (a corner-seeded flood, box-bounded so it can
// never leak into the interior art) and inpaints it with the nearest illustration
// pixel via a multi-source BFS. The straight edges are already full-bleed art, so
// this only rebuilds the four corners, giving iOS a full-bleed square to mask
// cleanly. (Making it transparent would break the iOS opaque requirement.)
//
// The Android ADAPTIVE foreground is the SAME un-baked art, masked to its own
// rounded-card shape and scaled so the whole card sits inside the adaptive-icon
// safe zone (a 66/108 circle, radius 0.3056 of the canvas) on a transparent
// surround, with the app.json adaptiveIcon.backgroundColor behind it. The
// launch audit measured the previous 66%-square placement leaving 32.7% of the
// card outside that circle: circle launchers cut the card's rounded corners,
// and square launchers showed the source's baked black corners. Masking the
// card (instead of using the raw art) is what keeps those corners off the
// pink field at every mask shape.
//
// Run: node scripts/tools/processAppIcon.mjs   (from mobile/)
// After this, generateSplash.mjs recomposes splash.png from the fixed icon.
// This REPLACES the procedural icon/adaptive-icon output of generateAppIcons.mjs,
// which now only draws the splash.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

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

// iOS / store icon: the FULL-BLEED opaque art (corners un-baked; iOS masks it).
const fullBleed = fillCorners(src);
fs.writeFileSync(path.join(ASSETS, 'icon.png'), PNG.sync.write(downscale(fullBleed, true)));

// Android ADAPTIVE foreground: the un-baked card, masked to its rounded-rect
// silhouette, scaled to fit the 66/108 safe circle and centered on a fully
// transparent surround. Farthest card point from the centre is
// (half - r) * sqrt(2) + r = 0.6326 * side for the art's r = 185/1024 corner
// radius, so a side of 0.475 * 1024 (max radius ~307px) clears the 312.9px safe
// radius; the launcher mask then crops only pink field, never the identity.
const ADAPTIVE_CARD_FRACTION = 0.475;
const CARD = Math.round(OUT * ADAPTIVE_CARD_FRACTION); // 486
const CARD_R = (185 / 1024) * CARD;                     // the icon's own corner radius
const rrectSDF = (px, py, c, half, r) => {
  const qx = Math.abs(px - c) - (half - r);
  const qy = Math.abs(py - c) - (half - r);
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
};
const fg = downscale(fullBleed, false, CARD);   // opaque full-bleed art at card size
const canvas = new PNG({ width: OUT, height: OUT }); // zero-filled = transparent
const offset = Math.round((OUT - CARD) / 2);
for (let y = 0; y < CARD; y++) {
  for (let x = 0; x < CARD; x++) {
    const cover = Math.max(0, Math.min(1, 0.5 - rrectSDF(x + 0.5, y + 0.5, CARD / 2, CARD / 2, CARD_R)));
    if (cover <= 0) continue;
    const s = (y * CARD + x) * 4;
    const dd = ((y + offset) * OUT + (x + offset)) * 4;
    canvas.data[dd] = fg.data[s];
    canvas.data[dd + 1] = fg.data[s + 1];
    canvas.data[dd + 2] = fg.data[s + 2];
    canvas.data[dd + 3] = Math.round(fg.data[s + 3] * cover);
  }
}
fs.writeFileSync(path.join(ASSETS, 'adaptive-icon.png'), PNG.sync.write(canvas));
console.log(`wrote icon.png (${OUT}, full-bleed) + adaptive-icon.png (${CARD} masked card centered in ${OUT}, inside the 66/108 safe circle) from ${path.basename(SRC)}`);
