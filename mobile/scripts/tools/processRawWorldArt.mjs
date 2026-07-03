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

// Drop the top `dropTopFrac` of the CONTENT height before the final crop —
// used for the tall pit art (long tapered path tail we don't need all of).
function dropTop(png, dropTopFrac) {
  const cropped = cropToContent(png);
  const { width: w, height: h, data } = cropped;
  const y0 = Math.round(h * dropTopFrac);
  const nh = h - y0;
  const out = new PNG({ width: w, height: nh });
  data.copy(out.data, 0, y0 * w * 4, h * w * 4);
  return out;
}

function processSprite(rawName, outName, targetWidth, opts = {}) {
  const { dropTopFrac = 0 } = opts;
  const png = load(path.join(RAW, rawName));
  keyBackground(png);
  const cropped = dropTopFrac > 0 ? dropTop(png, dropTopFrac) : cropToContent(png);
  const th = Math.round(targetWidth * (cropped.height / cropped.width));
  const final = resize(cropped, targetWidth, th);
  save(final, path.join(ENV, outName));
  console.log(`  ${outName}: content aspect ${(cropped.width / cropped.height).toFixed(3)} (w/h)`);
  return final;
}

processSprite('roof_raw.png', 'roof.png', 792);

// Per-phase foundations. The artist hand-lit one foundation per phase (bright
// green day -> dry dusk -> cool night -> blue shadow), grass tufts + a center
// dirt path gap baked into each base. They're normalized to ONE box size so
// the house never jumps vertically when the phase changes (only the look of
// the strip differs); the slight per-phase aspect stretch is baked in here.
// Mapping mirrors the skies (phase_5 art is reused for game phase 5, like
// sky_shadow): foundation_<gamePhase>.png, phase_1..5 -> game phases 0..4.
const FOUND_W = 792, FOUND_H = 120;
['phase_1', 'phase_2', 'phase_3', 'phase_4', 'phase_5'].forEach((raw, gamePhase) => {
  const png = load(path.join(RAW, `${raw}.png`));
  keyBackground(png);
  const final = resize(cropToContent(png), FOUND_W, FOUND_H);
  save(final, path.join(ENV, `foundation_${gamePhase}.png`));
});

// Pit: the newer well+path art. Drop the top 45% of the tapered path tail so
// the visible path reads as "leads from under the house to the well".
processSprite('pit_raw.png', 'pit_entrance.png', 460, { dropTopFrac: 0.45 });

// Wall tile: centered square crop, wrap-aware downscale to 128
{
  const png = load(path.join(RAW, 'wall_raw.png'));
  const size = Math.min(png.width, png.height);
  const x0 = Math.floor((png.width - size) / 2), y0 = Math.floor((png.height - size) / 2);
  const sq = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    png.data.copy(sq.data, (y * size) * 4, ((y0 + y) * png.width + x0) * 4, ((y0 + y) * png.width + x0 + size) * 4);
  }
  // Seamless base tile, then PRE-TILE it into a tall strip. RN's
  // resizeMode="repeat" renders nothing on the New Architecture (Fabric), so
  // HouseWorld draws this with resizeMode="cover" instead — the strip is much
  // taller than it is wide, so cover is always width-driven and the plank
  // scale stays consistent no matter how many rooms the house has.
  // 256 x 1280 panel: aspect 1:5 is taller than the tallest house body
  // (~272x1300dp), so cover scaling stays width-driven and the plank size is
  // consistent whatever the room count. The vertical repeat compresses well.
  const TILE = 128, COLS = 2, ROWS = 10; // 256 x 1280
  const base = resize(sq, TILE, TILE, true);
  const panel = new PNG({ width: TILE * COLS, height: TILE * ROWS });
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      for (let y = 0; y < TILE; y++) {
        base.data.copy(
          panel.data,
          ((ty * TILE + y) * TILE * COLS + tx * TILE) * 4,
          (y * TILE) * 4,
          (y * TILE + TILE) * 4,
        );
      }
    }
  }
  save(panel, path.join(ENV, 'wall.png'));
}

// ─── Foundation grounding assets (procedural, no raw source) ────────────────
// house_shadow.png: a soft contact band (white, tinted per-phase in RN),
// darkest at the top so it hugs the foundation base and fades down the grass.
{
  const W = 340, H = 54;
  const p = new PNG({ width: W, height: H });
  const smooth = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ay = Math.pow(Math.max(0, 1 - y / H), 1.7);       // dark at top, fade down
    const edge = Math.min(smooth(x / 70), smooth((W - x) / 70)); // feather ends
    const i = (y * W + x) * 4;
    p.data[i] = 255; p.data[i + 1] = 255; p.data[i + 2] = 255;
    p.data[i + 3] = Math.round(ay * edge * 255);
  }
  save(p, path.join(ENV, 'house_shadow.png'));
}

// ─── Window masks (phase-appropriate room windows) ──────────────────────────
// The room interiors are painted with bright day-sky windows. Those read as
// noon even under a storm/shadow sky. This extracts a per-room mask of the
// window SKY (white on transparent) so RoomView can recolor just that region
// to the current phase. Only rooms with a clear sky window are treated — the
// aquarium's water and the desert's already-night sky are deliberately left
// alone (verified against a per-room detection montage).
const ROOMS_DIR = path.resolve(import.meta.dirname, '../../assets/rooms');
const WINDOWS_DIR = path.join(ROOMS_DIR, 'windows');
const WINDOW_ROOMS = ['cozy_den', 'kitchen', 'study', 'office', 'garden'];

const isSkyBlue = (r, g, b) => b > 150 && b > r + 20 && g > r + 5 && g > 120;
const isCloudWhite = (r, g, b) => r > 185 && g > 185 && b > 185 && Math.abs(r - b) < 28;

// All connected blue-sky blobs (bbox + size). Panes split by a thin mullion
// come back as separate blobs; the caller merges nearby ones into one window.
function blueBlobs(png) {
  const { width: w, height: h, data } = png;
  const blue = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    if (isSkyBlue(data[p], data[p + 1], data[p + 2])) blue[i] = 1;
  }
  const seen = new Uint8Array(w * h);
  const blobs = [];
  for (let s = 0; s < w * h; s++) {
    if (!blue[s] || seen[s]) continue;
    const stack = [s]; seen[s] = 1;
    let size = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    while (stack.length) {
      const c = stack.pop(); const cx = c % w, cy = (c / w) | 0;
      size++;
      if (cx < x0) x0 = cx; if (cx > x1) x1 = cx; if (cy < y0) y0 = cy; if (cy > y1) y1 = cy;
      for (const n of [c + 1, c - 1, c + w, c - w]) {
        if (n < 0 || n >= w * h) continue;
        if ((n === c + 1 && cx === w - 1) || (n === c - 1 && cx === 0)) continue;
        if (blue[n] && !seen[n]) { seen[n] = 1; stack.push(n); }
      }
    }
    blobs.push({ size, x0, y0, x1, y1 });
  }
  return blobs;
}

// Merge the biggest blob with any blob whose bbox sits within `dist` of the
// growing window region (bridges mullion-split panes; won't reach a far-off
// monitor/globe). Returns the union bbox.
function windowRegion(blobs, dist) {
  if (!blobs.length) return null;
  let win = blobs.reduce((a, b) => (b.size > a.size ? b : a));
  let box = { x0: win.x0, y0: win.y0, x1: win.x1, y1: win.y1 };
  let grew = true;
  const used = new Set([win]);
  while (grew) {
    grew = false;
    for (const b of blobs) {
      if (used.has(b) || b.size < 150) continue;
      const near = b.x0 <= box.x1 + dist && b.x1 >= box.x0 - dist &&
        b.y0 <= box.y1 + dist && b.y1 >= box.y0 - dist;
      if (near) {
        box.x0 = Math.min(box.x0, b.x0); box.y0 = Math.min(box.y0, b.y0);
        box.x1 = Math.max(box.x1, b.x1); box.y1 = Math.max(box.y1, b.y1);
        used.add(b); grew = true;
      }
    }
  }
  return box;
}

if (!fs.existsSync(WINDOWS_DIR)) fs.mkdirSync(WINDOWS_DIR, { recursive: true });
for (const room of WINDOW_ROOMS) {
  const src = load(path.join(ROOMS_DIR, `${room}.png`));
  const { width: w, height: h, data } = src;
  const blobs = blueBlobs(src);
  const box = windowRegion(blobs, Math.round(w * 0.03)); // bridge mullions
  const pad = Math.round(Math.max(w, h) * 0.008);
  const bx0 = Math.max(0, box.x0 - pad), by0 = Math.max(0, box.y0 - pad);
  const bx1 = Math.min(w - 1, box.x1 + pad), by1 = Math.min(h - 1, box.y1 + pad);
  const mask = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4;
    const inBox = x >= bx0 && x <= bx1 && y >= by0 && y <= by1;
    // inside the window region, keep the sky (blue) and clouds (white); the
    // wooden mullions between panes stay excluded so they read as frame.
    const isWin = inBox && (isSkyBlue(data[p], data[p + 1], data[p + 2]) ||
      isCloudWhite(data[p], data[p + 1], data[p + 2]));
    mask.data[p] = 255; mask.data[p + 1] = 255; mask.data[p + 2] = 255;
    mask.data[p + 3] = isWin ? 255 : 0;
  }
  const out = resize(mask, 400, Math.round(400 * h / w));
  save(out, path.join(WINDOWS_DIR, `${room}.png`));
  console.log(`  windows/${room}: region [${box.x0}-${box.x1}, ${box.y0}-${box.y1}]`);
}
