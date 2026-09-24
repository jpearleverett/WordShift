/**
 * Draws the entity that holds the house, as PIXEL ART at the house's own
 * density (one art pixel = 1.5dp, the scale of the roof, the rooms and the
 * robed residents), written out at 3 image pixels per art pixel with
 * nearest-neighbour scaling so every edge stays crisp.
 *
 * The figure stands BEHIND the house: a deep hood and shoulders rise over the
 * roof, and from Phase 4 its long sleeved arms hang down both sides of the
 * house, bowing out at the elbow, until its pale hands come round the corners
 * and grip the foundation. At Phases 4-5 the house always has all thirteen
 * rooms (the reveal waits for the full house), so the arm is drawn at that
 * house's height and only ever stretched by a hair.
 *
 *   entity_head       hood, face void, shoulders, the top of the torso
 *   entity_arm        the LEFT arm, shoulder to cuff (mirrored for the right)
 *   entity_hand       the LEFT hand over the foundation corner, with its cast
 *                     shadow on the stone (mirrored for the right)
 *   entity_eyes       the eyes and their glow, white, tinted per phase
 *   *_rim             the backlit edge, white, tinted per phase: brightest on
 *                     edges that face up, fading down the figure
 *
 * The robe's palette is the residents' robe palette (charcoal with blue-grey
 * lights). Shading is computed from each shape's signed distance field (a
 * rounded "height" whose gradient gives a normal, lit from the upper left),
 * then quantised to the palette through a 4x4 Bayer matrix, and every shape
 * gets the house's dark outline. Deterministic. Run from mobile/:
 *   node scripts/tools/generateShadowEntity.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '../../assets/environment');
export const PX = 3; // image pixels per art pixel

// ── palette ─────────────────────────────────────────────────────────────────
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const OUTLINE = hex('#08060C');
const ROBE = ['#0F0C15', '#161220', '#1D1829', '#252034', '#2F2940', '#3B3450'].map(hex);
const VOID = ['#020104', '#06040A', '#0B0811'].map(hex);
const SKIN = ['#3A3344', '#4E465A', '#665D72', '#80778B', '#9C93A5'].map(hex); // ashen, pale
// Claws: near-black horn.
const CLAW = ['#0C0A10', '#1B1722', '#2C2634'].map(hex);
const BONE = ['#4A4150', '#6B6072', '#948A99', '#BDB4C0'].map(hex);

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
/** Pick a palette index for brightness b (0..1) with ordered dithering. */
function dither(pal, b, x, y) {
  const n = pal.length - 1;
  const v = Math.max(0, Math.min(n, b * n));
  const lo = Math.floor(v);
  return pal[Math.min(n, lo + (v - lo > BAYER[(y & 3) * 4 + (x & 3)] ? 1 : 0))];
}

// ── geometry ────────────────────────────────────────────────────────────────
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return [Math.hypot(ax + t * dx - px, ay + t * dy - py), t];
}
/** Tapered stroke along a polyline. */
const stroke = (pts, r0, r1) => {
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = lens[lens.length - 1] || 1;
  return (x, y) => {
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const [s, t] = segDist(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
      const r = r0 + (r1 - r0) * ((lens[i - 1] + t * (lens[i] - lens[i - 1])) / total);
      best = Math.min(best, s - r);
    }
    return best;
  };
};
const ellipse = (cx, cy, rx, ry) => (x, y) => (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry);
const union = (...f) => (x, y) => Math.min(...f.map((g) => g(x, y)));
const smoothUnion = (k, ...f) => (x, y) => {
  let d = f[0](x, y);
  for (let i = 1; i < f.length; i++) {
    const e = f[i](x, y);
    const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (e - d)) / k));
    d = e * (1 - h) + d * h - k * h * (1 - h);
  }
  return d;
};
const subtract = (a, b) => (x, y) => Math.max(a(x, y), -b(x, y));
const cubic = (p0, p1, p2, p3, n = 16) => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n, u = 1 - t;
  return [0, 1].map((k) => u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k]);
});
/** Deterministic value noise (for the hem's tatters and cloth grain). */
const hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const noise1 = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i) * (1 - u) + hash(i + 1) * u; };

// ── canvas ──────────────────────────────────────────────────────────────────
class Art {
  constructor(w, h) { this.w = w; this.h = h; this.px = new Array(w * h).fill(null); this.rim = new Float32Array(w * h); }
  set(x, y, c) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = c; }
  get(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] : null; }
  /**
   * Fill a shape: shade(x, y, info) -> [r,g,b]; info carries the signed
   * distance and a lit brightness from the rounded-height normal.
   */
  fill(sdf, shade, { roundness = 6, light = [-0.55, -0.75, 0.55] } = {}) {
    const inside = new Uint8Array(this.w * this.h);
    const d = new Float32Array(this.w * this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const v = sdf(x + 0.5, y + 0.5);
      d[y * this.w + x] = v;
      if (v < 0) inside[y * this.w + x] = 1;
    }
    const hgt = (x, y) => {
      const v = d[Math.max(0, Math.min(this.h - 1, y)) * this.w + Math.max(0, Math.min(this.w - 1, x))];
      return Math.sqrt(Math.max(0, Math.min(1, -v / roundness)));
    };
    const [lx, ly, lz] = light;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = y * this.w + x;
      if (!inside[i]) continue;
      const nx = -(hgt(x + 1, y) - hgt(x - 1, y)), ny = -(hgt(x, y + 1) - hgt(x, y - 1)), nz = 0.9;
      const nl = Math.hypot(nx, ny, nz);
      const lit = Math.max(0, (nx * lx + ny * ly + nz * lz) / nl);
      this.px[i] = shade(x, y, { d: d[i], lit });
    }
    return inside;
  }
  /** Dark outline on every filled pixel that touches an empty one. */
  outline(mask, { skipBottom = false, skipTop = false } = {}) {
    const out = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!mask[y * this.w + x]) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        if (ny >= this.h) return !skipBottom;
        if (ny < 0) return !skipTop;
        if (nx < 0 || nx >= this.w) return true;
        return !mask[ny * this.w + nx];
      });
      if (nb) out.push([x, y]);
    }
    for (const [x, y] of out) this.set(x, y, OUTLINE);
  }
  /** Backlit rim: the art pixel just inside the outline on up/outward edges. */
  rimFrom(mask, facing = (dx, dy) => dy <= 0 || dx !== 0, strength = 1) {
    for (let y = 1; y < this.h - 1; y++) for (let x = 1; x < this.w - 1; x++) {
      const i = y * this.w + x;
      if (!mask[i]) continue;
      // Two pixels in from an edge (the outline takes the first).
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ex = x + 2 * dx, ey = y + 2 * dy;
        const edge = ex < 0 || ey < 0 || ex >= this.w || ey >= this.h ? false : !mask[ey * this.w + ex];
        if (edge && mask[(y + dy) * this.w + x + dx] && facing(dx, dy)) {
          this.rim[i] = Math.max(this.rim[i], strength);
        }
      }
    }
  }
  write(name, { flip = false } = {}) {
    const W = this.w * PX, H = this.h * PX;
    const body = new PNG({ width: W, height: H });
    const rim = new PNG({ width: W, height: H });
    let rimAny = false;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const sx = flip ? this.w - 1 - x : x;
      const c = this.px[y * this.w + sx];
      const r = this.rim[y * this.w + sx];
      if (r > 0) rimAny = true;
      for (let j = 0; j < PX; j++) for (let k = 0; k < PX; k++) {
        const o = ((y * PX + j) * W + x * PX + k) * 4;
        const a = this.fade ? this.fade(sx, y) : 1;
        if (c) { body.data[o] = c[0]; body.data[o + 1] = c[1]; body.data[o + 2] = c[2]; body.data[o + 3] = Math.round(255 * a * (c.length > 3 ? c[3] : 1)); }
        if (r > 0) { rim.data[o] = 255; rim.data[o + 1] = 255; rim.data[o + 2] = 255; rim.data[o + 3] = Math.round(255 * r * a); }
      }
    }
    fs.writeFileSync(path.join(OUT, `${name}.png`), PNG.sync.write(body));
    if (rimAny) fs.writeFileSync(path.join(OUT, `${name}_rim.png`), PNG.sync.write(rim));
    console.log(`wrote ${name} ${W}x${H}${rimAny ? ' + rim' : ''}`);
  }
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));
/** Flat tones, dithered only across a narrow seam between two (pixel-art banding). */
function tone(pal, b, x, y) {
  const n = pal.length - 1;
  const v = clamp01(b) * n;
  const lo = Math.floor(v);
  const f = v - lo;
  const up = f > 0.66 ? 1 : f < 0.34 ? 0 : (f - 0.34) / 0.32 > BAYER[(y & 3) * 4 + (x & 3)] ? 1 : 0;
  return pal[Math.min(n, lo + up)];
}
const HOOD = ['#0C0A12', '#141019', '#1C1724', '#26202F', '#322A3D', '#40364E', '#51455F'].map(hex);

/**
 * Backlit rim: for every filled pixel whose neighbour at distance 2 is empty,
 * weight by how much that edge faces up (1), sideways (0.55) or down (0), and
 * by a caller fade along y. The outline takes the first pixel; this is the next.
 */
function backlight(art, mask, fadeY = () => 1) {
  for (let y = 0; y < art.h; y++) for (let x = 0; x < art.w; x++) {
    const i = y * art.w + x;
    if (!mask[i]) continue;
    let best = 0;
    for (const [dx, dy, w] of [[0, -1, 1], [-1, 0, 0.6], [1, 0, 0.6], [-1, -1, 0.85], [1, -1, 0.85]]) {
      const ex = x + 2 * dx, ey = y + 2 * dy;
      // Off-canvas counts as more of the figure: a cut edge is not an edge.
      const empty = ex >= 0 && ey >= 0 && ex < art.w && ey < art.h && !mask[ey * art.w + ex];
      const near = x + dx >= 0 && y + dy >= 0 && x + dx < art.w && y + dy < art.h && mask[(y + dy) * art.w + x + dx];
      if (empty && near) best = Math.max(best, w);
    }
    if (best > 0) art.rim[i] = best * fadeY(y);
  }
}

// ── the head: hood, face, shoulders (264 x 200 art) ─────────────────────────
// Its last rows fade out over the tops of the arms, which run on beneath it.
export const HEAD_W = 264, HEAD_H = 200;
const HC = HEAD_W / 2;
{
  const art = new Art(HEAD_W, HEAD_H);
  const R = (dx, y) => [HC + dx, y];
  const bez = (start, segs) => {
    let pts = [start], cur = start;
    for (const [c1, c2, end] of segs) { pts = pts.concat(cubic(cur, c1, c2, end, 18).slice(1)); cur = end; }
    return pts;
  };
  const side = (m) => bez(R(5 * m, 2), [
    [R(30 * m, 10), R(52 * m, 36), R(58 * m, 70)],        // crown of the hood
    [R(63 * m, 98), R(60 * m, 118), R(52 * m, 132)],      // hood side, falling to the collar
    [R(66 * m, 137), R(84 * m, 141), R(96 * m, 150)],     // drapes onto the shoulder
    [R(110 * m, 158), R(122 * m, 170), R(124 * m, 200)],  // shoulder cap into the arm
  ]);
  const right = side(1);
  const left = side(-1).map(([x, y]) => [x + 10, y]); // the tip droops right
  left[0] = right[0];
  const poly = [...right, R(124, HEAD_H + 30), R(-124, HEAD_H + 30), ...left.reverse()];
  const polySdf = (px, py) => {
    let d = Infinity, inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [ax, ay] = poly[j], [bx, by] = poly[i];
      d = Math.min(d, segDist(px, py, ax, ay, bx, by)[0]);
      if ((ay > py) !== (by > py) && px < ((bx - ax) * (py - ay)) / (by - ay) + ax) inside = !inside;
    }
    return inside ? -d : d;
  };
  const face = ellipse(HC + 3, 84, 25, 36);
  const cowl = ellipse(HC + 3, 80, 34, 46);
  const mask = art.fill(polySdf, (x, y, { lit }) => {
    const X = x + 0.5, Y = y + 0.5, u = X - HC;
    let b = 0.14 + lit * 0.74;
    // Folds: a crease down the crown, two falling from the cowl to the collar,
    // and the drape over each shoulder.
    b -= Math.exp(-Math.pow((u - 4) / 2, 2)) * clamp01(1 - Y / 60) * 0.3;
    for (const s of [-1, 1]) {
      const fx = HC + s * (40 + (Y - 70) * 0.28);
      if (Y > 70 && Y < 136) b -= Math.exp(-Math.pow((X - fx) / 2.2, 2)) * 0.22;
      if (Y > 134) b += Math.exp(-Math.pow((Math.abs(u) - 58 - (Y - 134) * 1.6) / 3.5, 2)) * 0.16
                      - Math.exp(-Math.pow((Math.abs(u) - 70 - (Y - 134) * 1.9) / 2.2, 2)) * 0.2;
    }
    // The body below the collar sinks into shadow behind the house.
    b -= clamp01((Y - 150) / 50) * 0.18 * clamp01(1 - (Math.abs(u) - 90) / 20);
    return tone(HOOD, b, x, y);
  }, { roundness: 20 });
  for (let y = 0; y < HEAD_H; y++) for (let x = 0; x < HEAD_W; x++) {
    if (!mask[y * HEAD_W + x]) continue;
    const X = x + 0.5, Y = y + 0.5;
    const f = face(X, Y), g = cowl(X, Y);
    if (f < 0) {
      art.set(x, y, tone(VOID, clamp01(0.7 + f / 26) * 0.9 - (Y > 100 ? 0.2 : 0), x, y));
    } else if (g < 0) {
      // The cowl: a band of shadow inside the hood, its upper-left lip catching light.
      const ang = Math.atan2(Y - 80, X - HC - 3);
      const lip = g > -3 ? clamp01(Math.cos(ang + Math.PI * 0.7)) * 0.5 : 0;
      art.set(x, y, tone(HOOD, 0.06 + lip + clamp01(-g / 10) * 0.05, x, y));
    }
    if (f >= 0 && f < 1.2) art.set(x, y, OUTLINE);
  }
  art.outline(mask, { skipBottom: true });
  backlight(art, mask, (y) => clamp01(1.15 - y / 190));
  art.fade = (x, y) => clamp01((HEAD_H - y) / 22);
  art.write('entity_head');
}

// ── the left arm, shoulder to cuff (64 x ARM_H art) ─────────────────────────
// Art x 0 sits 200dp left of the house's centre line; the arm's centre runs
// from the shoulder (x 22), bows out a little to the elbow (x 19, 42% down)
// and angles back in to the cuff (x 27). A dark torso shows beside the arm near the top
// before it passes behind the walls.
export const ARM_W = 64, ARM_H = 1200;
export const ARM_LEFT_DP = -200;
export const ARM_CUFF_X = 27; // art x of the cuff's centre (the hand's wrist)
{
  const art = new Art(ARM_W, ARM_H);
  const E = Math.round(ARM_H * 0.42);
  const centre = (y) => {
    if (y <= E) { const t = y / E; return 22 + (19 - 22) * Math.sin(t * Math.PI / 2); }
    const t = (y - E) / (ARM_H - E); return 19 + (ARM_CUFF_X - 19) * t * t * (3 - 2 * t) + Math.sin(t * Math.PI) * -1;
  };
  const radius = (y) => {
    if (y <= E) return 12.5 - (y / E) * 2 + Math.exp(-Math.pow((y - 30) / 30, 2)) * 1.2;
    const t = (y - E) / (ARM_H - E);
    const bell = clamp01((y - (ARM_H - 44)) / 30);
    return 10.5 - t * 2.2 + bell * bell * 4.5;
  };
  // Ragged outer edge: a few torn notches, more of them lower down.
  const tear = (y, side) => {
    const n = noise1(y / 9 + (side > 0 ? 40 : 0));
    return n > 0.82 ? (n - 0.82) * 14 * (0.4 + y / ARM_H) : 0;
  };
  const armSdf = (x, y) => {
    const c = centre(y), r = radius(y);
    const off = x - c;
    const s = off < 0 ? -1 : 1;
    let d = Math.abs(off) - r + tear(y, s);
    if (y > ARM_H - 14) {
      // The cuff ends in a ragged hem.
      const hem = ARM_H - 14 + noise1(x / 2.3) * 5;
      d = Math.max(d, y - hem);
    }
    return d;
  };
  const torsoSdf = (x, y) => {
    const edge = 34 + clamp01(y / 320) * 26; // passes behind the wall (x ~45)
    return Math.max(edge - x, y - 360);
  };
  const shape = (x, y) => Math.min(armSdf(x, y), torsoSdf(x, y));
  const mask = art.fill(shape, (x, y) => {
    const X = x + 0.5, Y = y + 0.5;
    const a = armSdf(X, Y);
    if (a >= 0) {
      // Torso: dark cloth receding behind the house.
      return tone(ROBE, 0.28 - clamp01((X - 34) / 20) * 0.2 - clamp01(Y / 360) * 0.1, x, y);
    }
    const c = centre(Y), r = radius(Y);
    const across = clamp01((X - c) / r * 0.5 + 0.5); // 0 = outer edge, 1 = inner
    // Cylinder lit from the upper left, darker toward the inside.
    let b = 0.14 + Math.sin(clamp01(across * 0.95 + 0.05) * Math.PI) * 0.34 + (1 - across) * 0.16;
    // Long folds down the sleeve, drifting with the cloth.
    const f1 = Math.sin(across * Math.PI * 3.2 + Y / 70 + Math.sin(Y / 23) * 0.6);
    b += (f1 > 0.55 ? 0.14 : f1 < -0.7 ? -0.12 : 0);
    // The elbow: cloth bunches into chevron creases.
    const dy = Y - E;
    if (Math.abs(dy) < 70) {
      const chev = Math.sin((dy + Math.abs(across - 0.45) * 22) / 5.5);
      const w = 1 - Math.abs(dy) / 70;
      b += chev > 0.6 ? 0.16 * w : chev < -0.75 ? -0.14 * w : 0;
    }
    // The bell cuff: its inside shows dark below a lit rolled edge.
    if (Y > ARM_H - 44) {
      const t = (Y - (ARM_H - 44)) / 30;
      if (t > 0.72 && across > 0.18 && across < 0.82) b = 0.02;
      else if (t > 0.55 && t < 0.72) b += 0.18;
    }
    b -= clamp01((Y - 700) / 500) * 0.06; // the lower arm, further from the light
    return tone(ROBE, b, x, y);
  }, { roundness: 6 });
  // The seam between arm and torso.
  for (let y = 1; y < ARM_H; y++) for (let x = 1; x < ARM_W - 1; x++) {
    const X = x + 0.5, Y = y + 0.5;
    if (armSdf(X, Y) < 0 && armSdf(X + 1, Y) >= 0 && torsoSdf(X + 1, Y) < 0) art.set(x, y, OUTLINE);
  }
  art.outline(mask, { skipTop: true });
  // Rim on the outer (left) edge only, fading down the arm.
  backlight(art, mask, (y) => 0.35 + 0.65 * clamp01(1 - y / (ARM_H * 0.8)));
  for (let y = 0; y < ARM_H; y++) for (let x = 0; x < ARM_W; x++) {
    const X = x + 0.5;
    if (X > centre(y + 0.5)) art.rim[y * ARM_W + x] = 0;
  }
  art.write('entity_arm');
}

// ── the left hand, gripping the foundation corner (80 x 64 art) ─────────────
// Its top edge tucks under the cuff; the wrist is centred HAND_WRIST_X in.
// The palm rests on the corner; four long fingers hook over the stone's top
// edge (art y 27 here) and down its face; a thumb wraps the corner. Knuckles
// overlap the stones, and the fingers cast a shadow onto them.
export const HAND_W = 80, HAND_H = 64, HAND_WRIST_X = 14, HAND_STONE_TOP = 27;
{
  const art = new Art(HAND_W, HAND_H);
  const top = HAND_STONE_TOP;
  const wx = HAND_WRIST_X;
  const wrist = stroke([[wx, -6], [wx + 1, 8], [wx + 7, 18]], 6.5, 6.5);
  const palm = ellipse(wx + 14, 21, 12.5, 9);
  const fingerPath = (y0, reach, drop) => [
    [wx + 19, y0], [wx + 19 + reach * 0.52, top - 4 + (y0 - 18) * 0.15], [wx + 19 + reach * 0.86, top], [wx + 19 + reach, top + drop],
  ];
  const specs = [[15, 25, 15, 3.6], [19, 31, 21, 3.9], [23, 28, 24, 3.8], [27, 20, 20, 3.4]];
  const paths = specs.map(([y0, reach, drop]) => fingerPath(y0, reach, drop));
  const fingers = paths.map((p, i) => stroke(p, specs[i][3], 1.3));
  const knuckles = paths.flatMap((p, i) => [ellipse(...p[1], specs[i][3] * 1.2, specs[i][3] * 1.1), ellipse(...p[2], specs[i][3] * 1.05, specs[i][3] * 1.05)]);
  const thumb = stroke([[wx + 5, 25], [wx + 4, 33], [wx + 9, 41], [wx + 16, 44]], 4, 1.3);
  const hand = smoothUnion(2.4, wrist, palm, ...fingers, ...knuckles, thumb);
  const tips = [...paths.map((p) => p[3]), [wx + 16, 44]];
  // Cast shadow first: the hand's silhouette, pushed down-right, on the stone only.
  const shadow = [];
  for (let y = top; y < HAND_H; y++) for (let x = 0; x < HAND_W; x++) {
    if (hand(x + 0.5 - 2, y + 0.5 - 3) < 0 && hand(x + 0.5, y + 0.5) >= 0 && x > wx + 12) shadow.push([x, y]);
  }
  const mask = art.fill(hand, (x, y, { lit }) => {
    const X = x + 0.5, Y = y + 0.5;
    if (tips.some(([tx, ty]) => Math.hypot(X - tx, Y - ty) < 5 && Y > ty - 5.5)) return tone(CLAW, 0.2 + lit * 0.8, x, y);
    // Bony: knuckles and the backs of the fingers catch the light; the wrist
    // darkens up into the sleeve's shadow.
    return tone(SKIN, (0.1 + lit * 0.9) * (0.5 + 0.5 * clamp01((Y + 2) / 16)), x, y);
  }, { roundness: 3.4 });
  art.outline(mask, { skipTop: true });
  for (const [x, y] of shadow) art.set(x, y, [0, 0, 0, 0.42]);
  art.write('entity_hand');
}

// ── the eyes (tinted per phase) ─────────────────────────────────────────────
export const EYES_W = 40, EYES_H = 14;
export const HEAD_EYES_Y = 80;
{
  const W2 = EYES_W * PX, H2 = EYES_H * PX;
  const png = new PNG({ width: W2, height: H2 });
  for (let y = 0; y < EYES_H; y++) for (let x = 0; x < EYES_W; x++) {
    let a = 0;
    for (const ex of [9, 31]) {
      const r = Math.hypot((x + 0.5 - ex) / 1.5, y + 0.5 - 7);
      a = Math.max(a, r < 1.4 ? 1 : r < 2.6 ? 0.7 : r < 4.2 ? 0.35 : r < 6 ? 0.14 : 0);
    }
    for (let j = 0; j < PX; j++) for (let k = 0; k < PX; k++) {
      const o = ((y * PX + j) * W2 + x * PX + k) * 4;
      png.data[o] = 255; png.data[o + 1] = 255; png.data[o + 2] = 255; png.data[o + 3] = Math.round(255 * a);
    }
  }
  fs.writeFileSync(path.join(OUT, 'entity_eyes.png'), PNG.sync.write(png));
  console.log(`wrote entity_eyes ${W2}x${H2}`);
}
