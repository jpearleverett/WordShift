// Cottage pixel UI chrome: 9-slice panel frames (wood + parchment), 3-slice
// pixel-bevel buttons (normal + pressed), and wooden header plaques — the
// PNG skin behind PanelCard / CandyButton / the header plaques so the menus
// read as cozy pixel furniture instead of modern rounded blocks.
//
// Construction notes (from the cozy-UI research spec):
// - Everything is drawn on an "art pixel" grid (1 art-px = 3 dp at runtime)
//   and exported at PX_PER_ART=9 real px per art-px, displayed at 3dp per
//   art-px: crisp 1:1 on @3x devices, clean integer downsample below.
// - Frames are drawn as FULL masters, then sliced into corner tiles and
//   1-art-px-wide edge cross-sections, so 9-slice seams match by
//   construction. Edge strips are uniform along their stretch axis (all
//   grain/decor lives in the fixed corners) — stretch-safe on Fabric.
// - One light source, top-left. Warm near-black outlines, never #000.
//   No anti-aliasing anywhere: hard pixels only.
// - Every phase is a palette swap over identical geometry — the cottage
//   furniture "ages" through the descent (bright → dusk → storm → dark →
//   serene) instead of changing style.
//
// Run: node scripts/tools/generateUiPanels.mjs   (from mobile/)
// Outputs assets/ui/panels/<skin>/*.png + src/theme/pixelSkin.generated.ts
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../../assets/ui/panels');
const TS_OUT = path.resolve(__dirname, '../../src/theme/pixelSkin.generated.ts');
const PREVIEW_DIR = process.env.PANEL_PREVIEW_DIR || null;

const PX_PER_ART = 9; // exported real px per art px (art px = 3dp → 1:1 @3x)

// ---------------------------------------------------------------------------
// Minimal PNG writer (same dependency-free pattern as generateUiIcons.mjs)
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
function savePNG(filePath, w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, png);
}

// ---------------------------------------------------------------------------
// Art-pixel grid helpers
// ---------------------------------------------------------------------------
const hexToRgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

class Grid {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Int32Array(w * h).fill(-1); this.alpha = new Float64Array(w * h).fill(0); this.colors = []; this.colorIndex = new Map(); }
  colorId(hexStr) {
    if (!this.colorIndex.has(hexStr)) { this.colorIndex.set(hexStr, this.colors.length); this.colors.push(hexToRgb(hexStr)); }
    return this.colorIndex.get(hexStr);
  }
  set(x, y, hexStr, a = 1) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.px[i] = this.colorId(hexStr); this.alpha[i] = a;
  }
  get(x, y) { const i = y * this.w + x; return this.px[i] < 0 ? null : { rgb: this.colors[this.px[i]], a: this.alpha[i] }; }
  toRGBA(scale = PX_PER_ART) {
    const W = this.w * scale, H = this.h * scale;
    const buf = Buffer.alloc(W * H * 4);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = y * this.w + x;
      if (this.px[i] < 0) continue;
      const [r, g, b] = this.colors[this.px[i]];
      const a = Math.round(this.alpha[i] * 255);
      for (let sy = 0; sy < scale; sy++) {
        let o = ((y * scale + sy) * W + x * scale) * 4;
        for (let sx = 0; sx < scale; sx++) { buf[o] = r; buf[o + 1] = g; buf[o + 2] = b; buf[o + 3] = a; o += 4; }
      }
    }
    return { W, H, buf };
  }
  save(file) { const { W, H, buf } = this.toRGBA(); savePNG(file, W, H, buf); }
  crop(x0, y0, w, h) {
    const g = new Grid(w, h);
    g.colors = this.colors.map(c => c.slice()); g.colorIndex = new Map(this.colorIndex);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const si = (y0 + y) * this.w + (x0 + x), di = y * w + x;
      g.px[di] = this.px[si]; g.alpha[di] = this.alpha[si];
    }
    return g;
  }
}

// ---------------------------------------------------------------------------
// Palettes — five skins over identical geometry (hand-tuned from the spec).
// ---------------------------------------------------------------------------
const PALETTES = {
  bright: {
    outline: '#3B2416',
    wood: { rim: '#F0BE84', light: '#E3AC6E', base: '#C98A4B', mid: '#A96B33', dark: '#7E4A20', seam: '#5A3418' },
    parch: { hi: '#FBF0D9', base: '#F3E2BF', dim: '#EBD8B2', shadow: '#D9BE8F', vig1: '#DFC69B', vig2: '#E9D4AD', vig3: '#EFDCB7' },
    // Painted inlay trim — the per-skin second hue (cottage sage → dusty rose
    // → slate → ember → mauve). Structural jewelry only, never an action color
    // (amber keeps that job).
    accent: { main: '#6E9A4B', lo: '#527A36' },
    btn: {
      primary: { face: '#E8A33D', hi: '#FFD9A0', hi2: '#F4BE6C', lo: '#B06F1E', lo2: '#8A5414' },
      secondary: { face: '#C98A4B', hi: '#E9B87E', hi2: '#DBA163', lo: '#96602A', lo2: '#754A1E' },
      quiet: { face: '#EFDCB7', hi: '#FBF0D9', hi2: '#F5E6C8', lo: '#CDB489', lo2: '#B39A6F' },
    },
    plaque: { face: '#7E4A20', rim: '#B08050', lo: '#5A3418', text: '#FBF0D9' },
  },
};

// HSL helpers for palette derivation
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s; const l = (max + min) / 2;
  if (max === min) { h = 0; s = 0; } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6;
    }
  }
  return [h * 360, s, l];
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360; s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r, g, b;
  if (s === 0) { r = g = b = l; } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3); g = hue2rgb(p, q, h); b = hue2rgb(p, q, h - 1 / 3);
  }
  const c = v => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}
const lerpHue = (h, target, t) => {
  let d = ((target - h + 540) % 360) - 180;
  return h + d * t;
};
function derive(hexStr, { l = 1, s = 1, hueTo = null, hueT = 0 }) {
  const [r, g, b] = hexToRgb(hexStr);
  let [h, ss, ll] = rgbToHsl(r, g, b);
  if (hueTo != null && hueT > 0) h = lerpHue(h, hueTo, hueT);
  return hslToHex(h, ss * s, ll * l);
}
function deriveTree(obj, xf) {
  if (typeof obj === 'string') return xf(obj);
  const out = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) out[k] = deriveTree(obj[k], xf);
  return out;
}

// Phase derivations per the spec formula, with hand overrides where the
// formula alone under-delivers (ink polarity, accents).
const SKIN_XF = {
  dusk:   c => derive(c, { l: 0.88, s: 0.92, hueTo: 355, hueT: 0.15 }),
  storm:  c => derive(c, { l: 0.72, s: 0.85, hueTo: 260, hueT: 0.18 }),
  dark:   c => derive(c, { l: 0.45, s: 0.70, hueTo: 320, hueT: 0.22 }),
  serene: c => derive(c, { l: 0.50, s: 0.55, hueTo: 300, hueT: 0.30 }),
};
for (const [name, xf] of Object.entries(SKIN_XF)) {
  PALETTES[name] = deriveTree(PALETTES.bright, xf);
}
// Hand overrides from the spec tables — the HSL formula is only a first pass;
// wood/parchment must stay in the tan/oak family (the formula drifts cream
// toward salmon), and dark/serene fills flip to ash paper with cream accents.
Object.assign(PALETTES.dusk, {
  outline: '#33201E',
  wood: { rim: '#DCA878', light: '#C99668', base: '#A87447', mid: '#8A5A31', dark: '#66401F', seam: '#48301C' },
  parch: { hi: '#F2E2C2', base: '#E6D0A9', dim: '#DCC49B', shadow: '#C3A67D', vig1: '#C3A67D', vig2: '#D2B78C', vig3: '#DCC49B' },
  accent: { main: '#A9535C', lo: '#873E46' },
});
Object.assign(PALETTES.storm, {
  outline: '#221723',
  wood: { rim: '#A87858', light: '#97684A', base: '#7A5238', mid: '#613E2B', dark: '#46291D', seam: '#301B14' },
  parch: { hi: '#DEC49E', base: '#CDB289', dim: '#C2A67D', shadow: '#A3875F', vig1: '#A3875F', vig2: '#B49770', vig3: '#C2A67D' },
  accent: { main: '#5F6E96', lo: '#485577' },
});
Object.assign(PALETTES.storm.btn.primary, { face: '#D97F2E', hi: '#F2A65A', hi2: '#E4913F', lo: '#96521B', lo2: '#733D12' });
Object.assign(PALETTES.dark, {
  outline: '#0F0A10',
  wood: { rim: '#7E574A', light: '#6B463A', base: '#52332C', mid: '#3E2522', dark: '#2B1817', seam: '#1D0F0F' },
  parch: { hi: '#3E323A', base: '#352A31', dim: '#2E2429', shadow: '#241B20', vig1: '#241B20', vig2: '#2A2026', vig3: '#30262C' },
  accent: { main: '#9E3B2A', lo: '#77281C' },
});
Object.assign(PALETTES.dark.btn.primary, { face: '#A83A28', hi: '#D65B33', hi2: '#C04A2C', lo: '#6E2014', lo2: '#54160D' });
Object.assign(PALETTES.dark.btn.quiet, { face: '#3E323A', hi: '#4C3E48', hi2: '#453840', lo: '#2A2026', lo2: '#221820' });
Object.assign(PALETTES.serene, {
  outline: '#151019',
  wood: { rim: '#715866', light: '#5E4653', base: '#4A3742', mid: '#392A34', dark: '#291D26', seam: '#1C1219' },
  parch: { hi: '#3C3242', base: '#332A38', dim: '#2C2431', shadow: '#221B28', vig1: '#221B28', vig2: '#28202E', vig3: '#2E2533' },
  accent: { main: '#8A6E96', lo: '#6B5277' },
});
Object.assign(PALETTES.serene.btn.primary, { face: '#A97F45', hi: '#C99E63', hi2: '#B98E52', lo: '#6E4E26', lo2: '#573C1C' });
Object.assign(PALETTES.serene.btn.quiet, { face: '#3C3242', hi: '#4A3F52', hi2: '#433849', lo: '#28202E', lo2: '#201926' });

// ---------------------------------------------------------------------------
// Frame master construction (BFS ring depth over a stepped-arc rounded rect)
// ---------------------------------------------------------------------------
/** Stepped-corner inside test: run-length table = per-row inset from corner. */
function insideSteppedRect(x, y, w, h, runs) {
  const inset = (row) => (row < runs.length ? runs[row] : 0);
  const fromTop = y, fromBottom = h - 1 - y, fromLeft = x, fromRight = w - 1 - x;
  if (fromLeft < inset(fromTop) || fromRight < inset(fromTop)) return false;
  if (fromLeft < inset(fromBottom) || fromRight < inset(fromBottom)) return false;
  return true;
}

/** BFS ring depth from outside (ring 0 = boundary art-px of the shape). */
function ringDepth(w, h, insideFn) {
  const depth = new Int32Array(w * h).fill(-1);
  const inside = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) inside[y * w + x] = insideFn(x, y) ? 1 : 0;
  let queue = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!inside[i]) continue;
    const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
      !inside[i - 1] || !inside[i + 1] || !inside[i - w] || !inside[i + w];
    if (edge) { depth[i] = 0; queue.push(i); }
  }
  let d = 0;
  while (queue.length) {
    const next = [];
    for (const i of queue) {
      const x = i % w, y = (i / w) | 0;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (inside[ni] && depth[ni] < 0) { depth[ni] = d + 1; next.push(ni); }
      }
    }
    queue = next; d++;
  }
  return { depth, inside };
}

/** Which outer side is this pixel closest to? (drives directional shading) */
function nearestSide(x, y, w, h) {
  const dt = y, db = h - 1 - y, dl = x, dr = w - 1 - x;
  const m = Math.min(dt, db, dl, dr);
  if (m === dt) return 'top';
  if (m === db) return 'bottom';
  if (m === dl) return 'left';
  return 'right';
}

/**
 * Draw a full frame master. kind: 'panel' (8px border, radius-5 arc) or
 * 'card' (6px border, radius-3 arc). Returns the Grid.
 */
function drawFrameMaster(w, h, pal, kind) {
  const runs = kind === 'panel' ? [4, 2, 1, 1] : [2, 1];
  const woodRows = kind === 'panel' ? 3 : 1;
  const g = new Grid(w, h);
  const { depth, inside } = ringDepth(w, h, (x, y) => insideSteppedRect(x, y, w, h, runs));
  const P = pal.parch, W = pal.wood, A = pal.accent;
  // Ring layout v2 (the "more texture, more color" pass):
  //   0 outline | 1 rim | wood rows | seam | ACCENT INLAY (panel) |
  //   parchment transition | graded vignette | fill
  // Ring budget must exactly fill the edge-strip thickness so corner tiles
  // and edge strips agree at their boundary:
  //   panel = 1+1+3+1+1+1+2 = 10 rings = PANEL_THICK
  //   card  = 1+1+1+1+1+1   =  6 rings = CARD_THICK
  // Content only needs to clear the WOOD (outline..transition); the vignette
  // rings are parchment tones every ink stays >=4.5:1 on, so text may overlap
  // them freely.
  const seamRing = 2 + woodRows;
  const accentRing = kind === 'panel' ? seamRing + 1 : -1;
  const transRing = kind === 'panel' ? accentRing + 1 : seamRing + 1;
  const vigRings = kind === 'panel' ? 2 : 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!inside[i]) continue;
    const d = depth[i];
    const side = nearestSide(x, y, w, h);
    if (d === 0) { g.set(x, y, pal.outline); continue; }
    if (d === 1) {
      g.set(x, y, side === 'top' ? W.rim : side === 'left' ? W.light : side === 'right' ? W.base : W.dark);
      continue;
    }
    if (d < seamRing) {
      const k = d - 2; // 0..woodRows-1, outer→inner
      const rowsBySide = kind === 'panel'
        ? { top: [W.light, W.base, W.mid], left: [W.light, W.base, W.mid], right: [W.base, W.mid, W.dark], bottom: [W.mid, W.dark, W.seam] }
        : { top: [W.base], left: [W.base], right: [W.mid], bottom: [W.dark] };
      g.set(x, y, rowsBySide[side][k]);
      continue;
    }
    if (d === seamRing) { g.set(x, y, W.seam); continue; }
    if (d === accentRing) {
      // Painted inlay: lit on the top/left run, shaded bottom/right — reads
      // as a carved groove filled with the skin's second hue.
      g.set(x, y, side === 'top' || side === 'left' ? A.main : A.lo);
      continue;
    }
    if (d === transRing) {
      g.set(x, y, side === 'top' || side === 'left' ? P.shadow : P.hi);
      continue;
    }
    if (d <= transRing + vigRings) {
      // Graded vignette: the paper darkens softly toward the frame on the lit
      // sides, giving the flat center a lit-parchment depth.
      const k = d - transRing; // 1..vigRings
      if (side === 'top' || side === 'left') {
        g.set(x, y, k === 1 ? P.vig1 : P.vig2);
      } else {
        g.set(x, y, kind === 'card' ? P.dim : P.base);
      }
      continue;
    }
    g.set(x, y, kind === 'card' ? P.dim : P.base);
  }
  if (kind === 'panel') {
    // Corner decor (fixed corner tiles only): nail heads, wood knots, grain.
    const nailAt = 4;
    const corners = [[nailAt, nailAt], [w - nailAt - 2, nailAt], [nailAt, h - nailAt - 2], [w - nailAt - 2, h - nailAt - 2]];
    for (const [cx, cy] of corners) {
      g.set(cx, cy, W.seam); g.set(cx + 1, cy, W.seam); g.set(cx, cy + 1, W.seam); g.set(cx + 1, cy + 1, W.seam);
      g.set(cx, cy, W.rim); // glint
    }
    // Small wood knots beside the nails (one per corner, mirrored).
    const knots = [[8, 3], [w - 10, 3], [8, h - 5], [w - 10, h - 5]];
    for (const [kx, ky] of knots) {
      if (g.get(kx, ky)) g.set(kx, ky, W.dark);
      if (g.get(kx + 1, ky)) g.set(kx + 1, ky, W.mid);
      if (g.get(kx, ky + 1)) g.set(kx, ky + 1, W.mid);
    }
    const dashes = [
      [7, 2, 3], [2, 8, 1], [w - 10, 2, 3], [w - 3, 8, 1],
      [7, h - 3, 3], [2, h - 9, 1], [w - 10, h - 3, 3], [w - 3, h - 9, 1],
    ];
    for (const [dx, dy, len] of dashes) {
      for (let k = 0; k < len; k++) {
        const cur = g.get(dx + k, dy);
        if (cur) g.set(dx + k, dy, W.mid);
      }
    }
  } else {
    // Card corner stitch: a 2-px accent tick in each corner's wood — the
    // quiet version of the panel's inlay ring, so list rows carry a hint of
    // the skin's second hue without a full loud trim.
    const stitches = [[3, 3], [w - 4, 3], [3, h - 4], [w - 4, h - 4]];
    for (const [sx, sy] of stitches) {
      if (g.get(sx, sy)) g.set(sx, sy, A.main);
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// Button master (row-indexed bevel anatomy over a radius-3 stepped rect)
// ---------------------------------------------------------------------------
function drawButtonMaster(w, h, pal, colors, pressed) {
  // +1 row canvas for the baked cast shadow below the outline (normal only)
  const g = new Grid(w, h + 1);
  const runs = [3, 1, 1];
  const { depth, inside } = ringDepth(w, h, (x, y) => insideSteppedRect(x, y, w, h, runs));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!inside[i]) continue;
    if (depth[i] === 0) { g.set(x, y, pal.outline); continue; }
    // interior: row/column based bevel
    const fromTop = y, fromBottom = h - 1 - y;
    let c = colors.face;
    if (!pressed) {
      if (fromTop === 1) c = colors.hi;
      else if (fromTop === 2) c = colors.hi2;
      else if (fromBottom === 1) c = colors.lo2;
      else if (fromBottom <= 3) c = colors.lo;
      else if (x === 1 || (depth[i] === 1 && nearestSide(x, y, w, h) === 'left')) c = colors.hi2;
      else if (x === w - 2 || (depth[i] === 1 && nearestSide(x, y, w, h) === 'right')) c = colors.lo;
      // Candy glint: a 2-px sparkle in the top-left cap (fixed caps only —
      // never in the stretched middle column band).
      else if ((x === 3 && fromTop === 3) || (x === 4 && fromTop === 3)) c = colors.hi;
      else if (x === 3 && fromTop === 4) c = colors.hi2;
    } else {
      // pressed: light falls into the socket — dark lip at top, shallow base
      if (fromTop === 1) c = colors.lo;
      else if (fromTop === 2) c = derive(colors.face, { l: 0.94 });
      else if (fromBottom === 1) c = colors.lo;
      else c = derive(colors.face, { l: 0.92, s: 1.04 });
    }
    g.set(x, y, c);
  }
  if (!pressed) {
    // cast shadow row below (skips the stepped corners)
    for (let x = runs[0]; x < w - runs[0]; x++) g.set(x, h, pal.outline, 0.45);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Plaque master (fixed height, horizontal 3-slice)
// ---------------------------------------------------------------------------
function drawPlaqueMaster(w, h, pal) {
  const g = new Grid(w, h);
  const runs = [2, 1];
  const { depth, inside } = ringDepth(w, h, (x, y) => insideSteppedRect(x, y, w, h, runs));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!inside[i]) continue;
    if (depth[i] === 0) { g.set(x, y, pal.outline); continue; }
    const fromTop = y, fromBottom = h - 1 - y;
    let c = pal.plaque.face;
    if (fromTop === 1) c = pal.plaque.rim;
    else if (fromBottom === 2) c = pal.accent.lo; // painted carve line above the base shadow
    else if (fromBottom === 1) c = pal.plaque.lo;
    g.set(x, y, c);
  }
  // nail heads in the end caps
  for (const cx of [3, w - 5]) {
    g.set(cx, 3, pal.wood.seam); g.set(cx + 1, 3, pal.wood.seam);
    g.set(cx, 4, pal.wood.seam); g.set(cx + 1, 4, pal.wood.seam);
    g.set(cx, 3, pal.plaque.rim);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Slice + emit
// ---------------------------------------------------------------------------
// Panel: 8 art-px visual frame (outline+rim+3 wood+seam+ACCENT+transition)
// + 2 graded vignette rings. Card: 5 art-px slim tray (outline+rim+wood+seam+
// transition) + 1 vignette ring — still fits 52dp list rows (two 21dp corner
// caps + content). Vignette rings are text-safe parchment, so the required
// content clearance stays the wood band, not the full strip.
const PANEL_MASTER = 40, PANEL_CAP = 12, PANEL_THICK = 10;
const CARD_MASTER = 24, CARD_CAP = 7, CARD_THICK = 6;
const BTN_H_MD = 14, BTN_H_LG = 19, BTN_W = 24, BTN_CAP = 8;
const PLAQUE_H = 14, PLAQUE_W = 32, PLAQUE_CAP = 10;

function emitFrame(skinDir, prefix, master, cap, thick) {
  const w = master.w, h = master.h;
  master.crop(0, 0, cap, cap).save(path.join(skinDir, `${prefix}_tl.png`));
  master.crop(w - cap, 0, cap, cap).save(path.join(skinDir, `${prefix}_tr.png`));
  master.crop(0, h - cap, cap, cap).save(path.join(skinDir, `${prefix}_bl.png`));
  master.crop(w - cap, h - cap, cap, cap).save(path.join(skinDir, `${prefix}_br.png`));
  // Edge strips: 3-art-px slab from the master's midline (uniform by construction)
  const mid = Math.floor(w / 2);
  master.crop(mid - 1, 0, 3, thick).save(path.join(skinDir, `${prefix}_top.png`));
  master.crop(mid - 1, h - thick, 3, thick).save(path.join(skinDir, `${prefix}_bottom.png`));
  master.crop(0, mid - 1, thick, 3).save(path.join(skinDir, `${prefix}_left.png`));
  master.crop(w - thick, mid - 1, thick, 3).save(path.join(skinDir, `${prefix}_right.png`));
}

function emitThreeSlice(skinDir, prefix, master, cap) {
  const w = master.w, h = master.h;
  master.crop(0, 0, cap, h).save(path.join(skinDir, `${prefix}_l.png`));
  const mid = Math.floor(w / 2);
  master.crop(mid - 1, 0, 3, h).save(path.join(skinDir, `${prefix}_m.png`));
  master.crop(w - cap, 0, cap, h).save(path.join(skinDir, `${prefix}_r.png`));
}

// Secondary buttons: wood-trimmed parchment (a pale wooden button) — mid-tone
// wood faces can't hold 4.5:1 with any ink, so the face is parchment and the
// wood lives in the bevel rows. Quiet: soft parchment. Recomputed per skin
// AFTER derivation so dark skins use their ash-paper values.
for (const pal of Object.values(PALETTES)) {
  const P = pal.parch, W = pal.wood;
  pal.btn.secondary = { face: P.dim, hi: P.hi, hi2: P.base, lo: W.base, lo2: W.mid };
  pal.btn.quiet = { face: P.dim, hi: P.base, hi2: P.dim, lo: P.shadow, lo2: P.shadow };
}

// Label inks per skin/variant (>= 4.5:1 on the corresponding face — the dark
// skins' primary faces are deep enough for cream ink; light skins use the
// warm near-black outline family).
const BTN_INKS = {
  bright: { primary: '#3B2416', secondary: '#4A3222', quiet: '#6B4A2F' },
  dusk:   { primary: '#33201E', secondary: '#43301F', quiet: '#64492E' },
  storm:  { primary: '#2A1A10', secondary: '#2F1F14', quiet: '#4A3626' },
  dark:   { primary: '#F5E3CB', secondary: '#E8D5B7', quiet: '#BBA68E' },
  serene: { primary: '#1F1512', secondary: '#D9C8D4', quiet: '#A793A6' },
};

const SKINS = ['bright', 'dusk', 'storm', 'dark', 'serene'];
for (const skin of SKINS) {
  const pal = PALETTES[skin];
  const dir = path.join(OUT_DIR, skin);
  emitFrame(dir, 'panel', drawFrameMaster(PANEL_MASTER, PANEL_MASTER, pal, 'panel'), PANEL_CAP, PANEL_THICK);
  emitFrame(dir, 'card', drawFrameMaster(CARD_MASTER, CARD_MASTER, pal, 'card'), CARD_CAP, CARD_THICK);
  for (const [variant, colors] of Object.entries(pal.btn)) {
    for (const [sizeName, hh] of [['md', BTN_H_MD], ['lg', BTN_H_LG]]) {
      emitThreeSlice(dir, `btn_${variant}_${sizeName}_up`, drawButtonMaster(BTN_W, hh, pal, colors, false), BTN_CAP);
      emitThreeSlice(dir, `btn_${variant}_${sizeName}_down`, drawButtonMaster(BTN_W, hh, pal, colors, true), BTN_CAP);
    }
  }
  emitThreeSlice(dir, 'plaque', drawPlaqueMaster(PLAQUE_W, PLAQUE_H, pal), PLAQUE_CAP);
  console.log(`skin ${skin}: done`);
}

// ---------------------------------------------------------------------------
// Preview montage (simulates the 9-slice stretch exactly as runtime does)
// ---------------------------------------------------------------------------
function stretchFrame(master, cap, thick, outW, outH) {
  const g = new Grid(outW, outH);
  g.colors = master.colors.map(c => c.slice()); g.colorIndex = new Map(master.colorIndex);
  const w = master.w, h = master.h, mid = Math.floor(w / 2);
  const put = (dx, dy, sx, sy) => {
    const si = sy * w + sx, di = dy * outW + dx;
    if (dx < 0 || dy < 0 || dx >= outW || dy >= outH) return;
    g.px[di] = master.px[si]; g.alpha[di] = master.alpha[si];
  };
  for (let y = 0; y < outH; y++) for (let x = 0; x < outW; x++) {
    let sx, sy;
    if (x < cap) sx = x; else if (x >= outW - cap) sx = w - (outW - x); else sx = mid;
    if (y < cap) sy = y; else if (y >= outH - cap) sy = h - (outH - y); else sy = Math.floor(h / 2);
    // interior beyond frame thickness → fill from master center
    put(x, y, sx, sy);
  }
  return g;
}
function stretchThree(master, cap, outW) {
  const g = new Grid(outW, master.h);
  g.colors = master.colors.map(c => c.slice()); g.colorIndex = new Map(master.colorIndex);
  const w = master.w, mid = Math.floor(w / 2);
  for (let y = 0; y < master.h; y++) for (let x = 0; x < outW; x++) {
    let sx;
    if (x < cap) sx = x; else if (x >= outW - cap) sx = w - (outW - x); else sx = mid;
    const si = y * w + sx, di = y * outW + x;
    g.px[di] = master.px[si]; g.alpha[di] = master.alpha[si];
  }
  return g;
}

if (PREVIEW_DIR) {
  for (const skin of SKINS) {
    const pal = PALETTES[skin];
    const CW = 150, CH = 128;
    const canvas = new Grid(CW, CH);
    // backdrop ≈ the screen base behind panels
    const backdrop = skin === 'bright' ? '#4F46A8' : skin === 'dusk' ? '#3B3560' : skin === 'storm' ? '#232741' : skin === 'dark' ? '#131322' : '#1D1833';
    for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) canvas.set(x, y, backdrop);
    const blit = (src, ox, oy) => {
      for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
        const c = src.get(x, y);
        if (c && c.a > 0.01) {
          const hexStr = '#' + c.rgb.map(v => v.toString(16).padStart(2, '0')).join('');
          if (c.a >= 0.99) canvas.set(ox + x, oy + y, hexStr);
          else {
            const under = canvas.get(ox + x, oy + y);
            if (under) {
              const mix = under.rgb.map((uv, k) => Math.round(uv * (1 - c.a) + c.rgb[k] * c.a));
              canvas.set(ox + x, oy + y, '#' + mix.map(v => v.toString(16).padStart(2, '0')).join(''));
            }
          }
        }
      }
    };
    // large panel
    blit(stretchFrame(drawFrameMaster(PANEL_MASTER, PANEL_MASTER, pal, 'panel'), PANEL_CAP, PANEL_THICK, 100, 74), 4, 6);
    // card inside-ish
    blit(stretchFrame(drawFrameMaster(CARD_MASTER, CARD_MASTER, pal, 'card'), CARD_CAP, CARD_THICK, 84, 22), 12, 22);
    blit(stretchFrame(drawFrameMaster(CARD_MASTER, CARD_MASTER, pal, 'card'), CARD_CAP, CARD_THICK, 84, 22), 12, 48);
    // plaque overlapping panel top
    blit(stretchThree(drawPlaqueMaster(PLAQUE_W, PLAQUE_H, pal), PLAQUE_CAP, 56), 26, 0);
    // buttons
    blit(stretchThree(drawButtonMaster(BTN_W, BTN_H_LG, pal, pal.btn.primary, false), BTN_CAP, 62), 8, 86);
    blit(stretchThree(drawButtonMaster(BTN_W, BTN_H_LG, pal, pal.btn.primary, true), BTN_CAP, 62), 78, 86);
    blit(stretchThree(drawButtonMaster(BTN_W, BTN_H_MD, pal, pal.btn.secondary, false), BTN_CAP, 42), 8, 110);
    blit(stretchThree(drawButtonMaster(BTN_W, BTN_H_MD, pal, pal.btn.quiet, false), BTN_CAP, 42), 56, 110);
    canvas.save(path.join(PREVIEW_DIR, `preview_${skin}.png`));
    console.log(`preview ${skin} written`);
  }
}

// ---------------------------------------------------------------------------
// Emit the typed skin registry (static requires for Metro)
// ---------------------------------------------------------------------------
{
  const framePieces = ['tl', 'tr', 'bl', 'br', 'top', 'bottom', 'left', 'right'];
  const lines = [];
  lines.push('// AUTO-GENERATED by scripts/tools/generateUiPanels.mjs — do not edit.');
  lines.push('// Cottage pixel UI skin registry: 9-slice frames + 3-slice buttons/plaques.');
  lines.push("import { ImageSourcePropType } from 'react-native';");
  lines.push('');
  lines.push('export interface FrameSkin { tl: ImageSourcePropType; tr: ImageSourcePropType; bl: ImageSourcePropType; br: ImageSourcePropType; top: ImageSourcePropType; bottom: ImageSourcePropType; left: ImageSourcePropType; right: ImageSourcePropType; }');
  lines.push('export interface ThreeSlice { l: ImageSourcePropType; m: ImageSourcePropType; r: ImageSourcePropType; }');
  lines.push('export interface ButtonSkin { up: ThreeSlice; down: ThreeSlice; }');
  lines.push('export interface PixelSkin { panel: FrameSkin; card: FrameSkin; buttons: { primary: { md: ButtonSkin; lg: ButtonSkin }; secondary: { md: ButtonSkin; lg: ButtonSkin }; quiet: { md: ButtonSkin; lg: ButtonSkin } }; plaque: ThreeSlice; fill: string; fillCard: string; /** Painted-inlay second hue per skin (structural accent, never an action color). */ accent: string; accentLo: string; ink: { primary: string; secondary: string; quiet: string; plaque: string }; }');
  lines.push('');
  // dp constants: 1 art-px = 3dp
  lines.push('/** dp sizes (1 art-px = 3 dp; PNGs are baked at 9 real px per art-px). */');
  lines.push(`export const PANEL_CORNER_DP = ${PANEL_CAP * 3};`);
  lines.push(`export const PANEL_EDGE_DP = ${PANEL_THICK * 3};`);
  lines.push(`export const CARD_CORNER_DP = ${CARD_CAP * 3};`);
  lines.push(`export const CARD_EDGE_DP = ${CARD_THICK * 3};`);
  lines.push(`export const BTN_CAP_DP = ${BTN_CAP * 3};`);
  lines.push(`export const BTN_MD_DP = ${BTN_H_MD * 3};`);
  lines.push(`export const BTN_LG_DP = ${BTN_H_LG * 3};`);
  lines.push(`export const BTN_SHADOW_DP = 3;`);
  lines.push(`export const PLAQUE_H_DP = ${PLAQUE_H * 3};`);
  lines.push(`export const PLAQUE_CAP_DP = ${PLAQUE_CAP * 3};`);
  lines.push('');
  const skinLit = [];
  for (const skin of SKINS) {
    const p = `../../assets/ui/panels/${skin}`;
    const frame = (prefix) => `{ ${framePieces.map(k => `${k}: require('${p}/${prefix}_${k}.png')`).join(', ')} }`;
    const three = (prefix) => `{ l: require('${p}/${prefix}_l.png'), m: require('${p}/${prefix}_m.png'), r: require('${p}/${prefix}_r.png') }`;
    const btn = (variant, size) => `{ up: ${three(`btn_${variant}_${size}_up`)}, down: ${three(`btn_${variant}_${size}_down`)} }`;
    skinLit.push(`  ${skin}: {
    panel: ${frame('panel')},
    card: ${frame('card')},
    buttons: {
      primary: { md: ${btn('primary', 'md')}, lg: ${btn('primary', 'lg')} },
      secondary: { md: ${btn('secondary', 'md')}, lg: ${btn('secondary', 'lg')} },
      quiet: { md: ${btn('quiet', 'md')}, lg: ${btn('quiet', 'lg')} },
    },
    plaque: ${three('plaque')},
    fill: '${PALETTES[skin].parch.base}',
    fillCard: '${PALETTES[skin].parch.dim}',
    accent: '${PALETTES[skin].accent.main}',
    accentLo: '${PALETTES[skin].accent.lo}',
    ink: { primary: '${BTN_INKS[skin].primary}', secondary: '${BTN_INKS[skin].secondary}', quiet: '${BTN_INKS[skin].quiet}', plaque: '${PALETTES[skin].plaque.text}' },
  },`);
  }
  lines.push('export const PIXEL_SKINS: Record<\'bright\' | \'dusk\' | \'storm\' | \'dark\' | \'serene\', PixelSkin> = {');
  lines.push(skinLit.join('\n'));
  lines.push('};');
  lines.push('');
  lines.push('/** Skin for a narrative phase (hostDark maps pre-dark phases onto storm). */');
  lines.push('export function getPixelSkin(phase: number, hostDark = false): PixelSkin {');
  lines.push('  const p = hostDark && phase < 3 ? 3 : phase;');
  lines.push('  if (p >= 5) return PIXEL_SKINS.serene;');
  lines.push('  if (p >= 4) return PIXEL_SKINS.dark;');
  lines.push('  if (p >= 3) return PIXEL_SKINS.storm;');
  lines.push('  if (p >= 2) return PIXEL_SKINS.dusk;');
  lines.push('  return PIXEL_SKINS.bright;');
  lines.push('}');
  lines.push('');
  fs.writeFileSync(TS_OUT, lines.join('\n'));
  console.log(`wrote ${TS_OUT}`);
}
