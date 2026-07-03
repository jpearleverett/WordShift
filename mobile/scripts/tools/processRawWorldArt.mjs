// Process the AI-generated world-art sources in assets/raw/ into the live
// house assets in assets/environment/. The raws are high-detail pixel-style
// generations on a near-white studio background; this script:
//   1. removes the background via border flood-fill (tolerance-keyed, so
//      whites INSIDE the art — window glass, chimney caps — survive),
//   2. crops to the content bounding box,
//   3. downscales with a premultiplied-alpha box filter,
//   4. writes the live asset.
// The wall texture is a full-bleed seamless tile: no keying, just a centered
// square crop + wrap-friendly downscale.
//
// Deterministic. Run: node scripts/tools/processRawWorldArt.mjs
// (Requires assets/raw/*.png to exist; see assets/raw/README.md.)
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

const RAW = path.resolve(import.meta.dirname, '../../assets/raw');
const ENV = path.resolve(import.meta.dirname, '../../assets/environment');

const load = (p) => PNG.sync.read(fs.readFileSync(p));
const save = (png, p) => {
  const buf = PNG.sync.write(png, { deflateLevel: 9 });
  fs.writeFileSync(p, buf);
  console.log(`wrote ${p} (${png.width}x${png.height}, ${(buf.length / 1024).toFixed(0)} KB)`);
};

/** Flood-fill from every border pixel, clearing everything within `tol` of
 *  the border background color. Only border-connected background is removed. */
function keyBackground(png, tol = 26) {
  const { width: w, height: h, data } = png;
  // background reference: average of the four corners
  let br = 0, bg = 0, bb = 0;
  for (const [cx, cy] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
    const i = (cy * w + cx) * 4;
    br += data[i]; bg += data[i + 1]; bb += data[i + 2];
  }
  br /= 4; bg /= 4; bb /= 4;
  const isBg = (i) =>
    Math.abs(data[i] - br) <= tol &&
    Math.abs(data[i + 1] - bg) <= tol &&
    Math.abs(data[i + 2] - bb) <= tol;

  const visited = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push(x, 0, x, h - 1); }
  for (let y = 0; y < h; y++) { stack.push(0, y, w - 1, y); }
  // stack holds interleaved x,y pairs
  const pairs = [];
  for (let i = 0; i < stack.length; i += 2) pairs.push([stack[i], stack[i + 1]]);
  while (pairs.length) {
    const [x, y] = pairs.pop();
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const idx = y * w + x;
    if (visited[idx]) continue;
    visited[idx] = 1;
    const i = idx * 4;
    if (!isBg(i)) continue;
    data[i + 3] = 0;
    pairs.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  // soften the 1px halo: any surviving pixel adjacent to cleared background
  // that is still close-ish to the bg color gets half alpha (kills the pale
  // fringe without eroding real art edges)
  const halo = tol * 2.2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const idx = y * w + x, i = idx * 4;
    if (data[i + 3] === 0) continue;
    const nearCleared =
      (x > 0 && data[i - 4 + 3] === 0) || (x < w - 1 && data[i + 4 + 3] === 0) ||
      (y > 0 && data[((idx - w) * 4) + 3] === 0) || (y < h - 1 && data[((idx + w) * 4) + 3] === 0);
    if (nearCleared &&
      Math.abs(data[i] - br) <= halo &&
      Math.abs(data[i + 1] - bg) <= halo &&
      Math.abs(data[i + 2] - bb) <= halo) {
      data[i + 3] = 96;
    }
  }
}

function cropToContent(png) {
  const { width: w, height: h, data } = png;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const out = new PNG({ width: cw, height: ch });
  for (let y = 0; y < ch; y++) {
    data.copy(out.data, (y * cw) * 4, ((y0 + y) * w + x0) * 4, ((y0 + y) * w + x1 + 1) * 4);
  }
  return out;
}

/** Premultiplied box-filter downscale (wrap=true samples across edges, for
 *  seamless tiles). */
function resize(png, tw, th, wrap = false) {
  const { width: sw, height: sh, data } = png;
  const out = new PNG({ width: tw, height: th });
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const sx0 = (x / tw) * sw, sx1 = ((x + 1) / tw) * sw;
    const sy0 = (y / th) * sh, sy1 = ((y + 1) / th) * sh;
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy++) {
      for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx++) {
        const wx = wrap ? ((sx % sw) + sw) % sw : Math.min(sx, sw - 1);
        const wy = wrap ? ((sy % sh) + sh) % sh : Math.min(sy, sh - 1);
        const i = (wy * sw + wx) * 4;
        const pa = data[i + 3] / 255;
        r += data[i] * pa; g += data[i + 1] * pa; b += data[i + 2] * pa; a += pa; n++;
      }
    }
    const o = (y * tw + x) * 4;
    if (a > 0) {
      out.data[o] = Math.round(r / a);
      out.data[o + 1] = Math.round(g / a);
      out.data[o + 2] = Math.round(b / a);
      out.data[o + 3] = Math.round((a / n) * 255);
    }
  }
  return out;
}

function processSprite(rawName, outName, targetWidth) {
  const png = load(path.join(RAW, rawName));
  keyBackground(png);
  const cropped = cropToContent(png);
  const th = Math.round(targetWidth * (cropped.height / cropped.width));
  const final = resize(cropped, targetWidth, th);
  save(final, path.join(ENV, outName));
  console.log(`  ${outName}: content aspect ${(cropped.width / cropped.height).toFixed(3)} (w/h)`);
  return final;
}

processSprite('roof_raw.png', 'roof.png', 792);
processSprite('foundation_raw.png', 'foundation.png', 792);
processSprite('pit_raw.png', 'pit_entrance.png', 480);

// Wall tile: centered square crop, wrap-aware downscale to 128
{
  const png = load(path.join(RAW, 'wall_raw.png'));
  const size = Math.min(png.width, png.height);
  const x0 = Math.floor((png.width - size) / 2), y0 = Math.floor((png.height - size) / 2);
  const sq = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    png.data.copy(sq.data, (y * size) * 4, ((y0 + y) * png.width + x0) * 4, ((y0 + y) * png.width + x0 + size) * 4);
  }
  const final = resize(sq, 128, 128, true);
  save(final, path.join(ENV, 'wall.png'));
}
