/**
 * shopIcons/_draw.mjs — the shared drawing kit for the Cosmetic Shop's item art.
 *
 * The shop had NO artwork for anything purchasable: tile-theme rows showed four
 * flat colour swatches, confetti rows six flat dots, and the whole HOUSE UPGRADES
 * section had no leading visual at all. These modules draw one small painted
 * subject per purchasable so a row reads as an OBJECT you are buying, not a
 * colour chip.
 *
 * Why a shared module rather than the usual self-contained single generator:
 * the shop set is 48 icons across four clearly separate families, which is more
 * than fits comfortably in one file. The primitives below are lifted verbatim
 * from scripts/tools/generateUiIcons.mjs (which stays untouched and
 * self-contained, per convention) so the shop art is drawn with exactly the same
 * kit as the icon set it sits beside: smooth, supersampled 2x, dependency-free
 * (zlib + fs only), no Math.random anywhere.
 *
 * House drawing doctrine, three passes per subject:
 *   1. a contact/drop shadow in INK at alpha ~0.28-0.34, offset down-right;
 *   2. the body, using roundRect/poly/ellipse with the `gradTo` argument so every
 *      form is top-lit (light at the top, dark at the bottom);
 *   3. a small white sheen ellipse at the UPPER-LEFT of the form. One light
 *      source, upper-left, for every icon in the set.
 * Outlines are the warm near-black INK below, NEVER #000.
 */
import zlib from 'zlib';
import fs from 'fs';

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
  fs.writeFileSync(filePath, png);
  console.log(`wrote ${filePath} (${w}x${h}, ${(png.length / 1024).toFixed(1)} KB)`);
}
const C = (w, h) => ({ w, h, px: new Float64Array(w * h * 4) });
const hex = c => [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];
function blend(cv, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h || a <= 0) return;
  const i = (y * cv.w + x) * 4, ia = 1 - a;
  cv.px[i] = r * a + cv.px[i] * ia; cv.px[i + 1] = g * a + cv.px[i + 1] * ia;
  cv.px[i + 2] = b * a + cv.px[i + 2] * ia; cv.px[i + 3] = a + cv.px[i + 3] * ia;
}
function ellipse(cv, cx, cy, rx, ry, color, alpha = 1, soft = 2) {
  const [r, g, b] = hex(color);
  for (let y = Math.max(0, ~~(cy - ry - soft - 1)); y <= Math.min(cv.h - 1, ~~(cy + ry + soft + 1)); y++)
    for (let x = Math.max(0, ~~(cx - rx - soft - 1)); x <= Math.min(cv.w - 1, ~~(cx + rx + soft + 1)); x++) {
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      const a = Math.max(0, Math.min(1, (1 - d) * (rx / soft)));
      if (a > 0) blend(cv, x, y, r, g, b, Math.min(1, a) * alpha);
    }
}
function roundRect(cv, cx, cy, hw, hh, rad, color, alpha = 1, gradTo = null) {
  const [r, g, b] = hex(color); const grad = gradTo ? hex(gradTo) : null;
  for (let y = Math.max(0, ~~(cy - hh - 2)); y <= Math.min(cv.h - 1, ~~(cy + hh + 2)); y++) {
    const t = (y - (cy - hh)) / (2 * hh);
    const rr = grad ? r + (grad[0] - r) * t : r, gg = grad ? g + (grad[1] - g) * t : g, bb = grad ? b + (grad[2] - b) * t : b;
    for (let x = Math.max(0, ~~(cx - hw - 2)); x <= Math.min(cv.w - 1, ~~(cx + hw + 2)); x++) {
      const qx = Math.abs(x + 0.5 - cx) - (hw - rad), qy = Math.abs(y + 0.5 - cy) - (hh - rad);
      const d = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - rad;
      const a = Math.max(0, Math.min(1, 0.5 - d));
      if (a > 0) blend(cv, x, y, rr, gg, bb, a * alpha);
    }
  }
}
// teardrop / flame lobe: ellipse pinched toward a top point
function flameLobe(cv, cx, topY, botY, maxR, color, alpha = 1) {
  const [r, g, b] = hex(color);
  for (let y = ~~topY; y <= ~~botY; y++) {
    const t = (y - topY) / (botY - topY);
    // narrow at top, widest ~70% down, rounding at the base
    const rad = maxR * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62);
    for (let x = ~~(cx - rad - 2); x <= ~~(cx + rad + 2); x++) {
      const d = Math.abs(x + 0.5 - cx) - rad;
      const a = Math.max(0, Math.min(1, 0.5 - d));
      if (a > 0) blend(cv, x, y, r, g, b, a * alpha);
    }
  }
}
// thick line segment with round caps (zero-length = filled circle)
function capsule(cv, x1, y1, x2, y2, th, color, alpha = 1) {
  const [r, g, b] = hex(color);
  const half = th / 2;
  const vx = x2 - x1, vy = y2 - y1, len2 = vx * vx + vy * vy || 1;
  for (let y = Math.max(0, ~~(Math.min(y1, y2) - half - 2)); y <= Math.min(cv.h - 1, ~~(Math.max(y1, y2) + half + 2)); y++)
    for (let x = Math.max(0, ~~(Math.min(x1, x2) - half - 2)); x <= Math.min(cv.w - 1, ~~(Math.max(x1, x2) + half + 2)); x++) {
      const wx = x + 0.5 - x1, wy = y + 0.5 - y1;
      const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
      const d = Math.hypot(wx - vx * t, wy - vy * t) - half;
      const a = Math.max(0, Math.min(1, 0.5 - d));
      if (a > 0) blend(cv, x, y, r, g, b, a * alpha);
    }
}
// thick circular arc stroke with round caps; radians, a0 < a1 (y-down: increasing = clockwise)
function arcStroke(cv, cx, cy, radius, th, a0, a1, color, alpha = 1) {
  const [r, g, b] = hex(color);
  const half = th / 2, ext = radius + half + 2;
  for (let y = Math.max(0, ~~(cy - ext)); y <= Math.min(cv.h - 1, ~~(cy + ext)); y++)
    for (let x = Math.max(0, ~~(cx - ext)); x <= Math.min(cv.w - 1, ~~(cx + ext)); x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      let ang = Math.atan2(dy, dx);
      while (ang < a0) ang += Math.PI * 2;
      if (ang > a1) continue;
      const d = Math.abs(Math.hypot(dx, dy) - radius) - half;
      const a = Math.max(0, Math.min(1, 0.5 - d));
      if (a > 0) blend(cv, x, y, r, g, b, a * alpha);
    }
  for (const ang of [a0, a1]) {
    const px = cx + Math.cos(ang) * radius, py = cy + Math.sin(ang) * radius;
    capsule(cv, px, py, px, py, th, color, alpha);
  }
}
// filled anti-aliased triangle
function tri(cv, p0, p1, p2, color, alpha = 1) {
  const [r, g, b] = hex(color);
  const xs = [p0[0], p1[0], p2[0]], ys = [p0[1], p1[1], p2[1]];
  const segD = (px, py, ax, ay, bx, by) => {
    const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy || 1)));
    return Math.hypot(wx - vx * t, wy - vy * t);
  };
  for (let y = Math.max(0, ~~(Math.min(...ys) - 2)); y <= Math.min(cv.h - 1, ~~(Math.max(...ys) + 2)); y++)
    for (let x = Math.max(0, ~~(Math.min(...xs) - 2)); x <= Math.min(cv.w - 1, ~~(Math.max(...xs) + 2)); x++) {
      const px = x + 0.5, py = y + 0.5;
      const s0 = (p1[0] - p0[0]) * (py - p0[1]) - (p1[1] - p0[1]) * (px - p0[0]);
      const s1 = (p2[0] - p1[0]) * (py - p1[1]) - (p2[1] - p1[1]) * (px - p1[0]);
      const s2 = (p0[0] - p2[0]) * (py - p2[1]) - (p0[1] - p2[1]) * (px - p2[0]);
      const inside = (s0 >= 0 && s1 >= 0 && s2 >= 0) || (s0 <= 0 && s1 <= 0 && s2 <= 0);
      const d = Math.min(segD(px, py, p0[0], p0[1], p1[0], p1[1]), segD(px, py, p1[0], p1[1], p2[0], p2[1]), segD(px, py, p2[0], p2[1], p0[0], p0[1]));
      const a = Math.max(0, Math.min(1, 0.5 - (inside ? -d : d)));
      if (a > 0) blend(cv, x, y, r, g, b, a * alpha);
    }
}
// arrowhead riding an arcStroke tip; dir +1 points along increasing angle, -1 decreasing
function arrowHead(cv, cx, cy, radius, ang, dir, size, color, alpha = 1) {
  const px = cx + Math.cos(ang) * radius, py = cy + Math.sin(ang) * radius;
  const tx = -Math.sin(ang) * dir, ty = Math.cos(ang) * dir;
  const nx = Math.cos(ang), ny = Math.sin(ang);
  tri(cv,
    [px + tx * size * 1.2, py + ty * size * 1.2],
    [px - tx * size * 0.3 + nx * size * 0.9, py - ty * size * 0.3 + ny * size * 0.9],
    [px - tx * size * 0.3 - nx * size * 0.9, py - ty * size * 0.3 - ny * size * 0.9],
    color, alpha);
}
// filled anti-aliased polygon (even-odd rule), optional vertical gradient
function poly(cv, pts, color, alpha = 1, gradTo = null) {
  const [r, g, b] = hex(color); const grad = gradTo ? hex(gradTo) : null;
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const segD = (px, py, ax, ay, bx, by) => {
    const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
    const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy || 1)));
    return Math.hypot(wx - vx * t, wy - vy * t);
  };
  for (let y = Math.max(0, ~~(minY - 2)); y <= Math.min(cv.h - 1, ~~(maxY + 2)); y++) {
    const t = (y - minY) / (maxY - minY || 1);
    const rr = grad ? r + (grad[0] - r) * t : r, gg = grad ? g + (grad[1] - g) * t : g, bb = grad ? b + (grad[2] - b) * t : b;
    for (let x = Math.max(0, ~~(minX - 2)); x <= Math.min(cv.w - 1, ~~(maxX + 2)); x++) {
      const px = x + 0.5, py = y + 0.5;
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      let d = Infinity;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        d = Math.min(d, segD(px, py, pts[j][0], pts[j][1], pts[i][0], pts[i][1]));
      }
      const a = Math.max(0, Math.min(1, 0.5 - (inside ? -d : d)));
      if (a > 0) blend(cv, x, y, rr, gg, bb, a * alpha);
    }
  }
}
// 5-point star / regular hexagon vertex generators
const starPts = (cx, cy, rOut, rIn, rot = -Math.PI / 2) => Array.from({ length: 10 }, (_, i) => {
  const r = i % 2 ? rIn : rOut, a = rot + (i * Math.PI) / 5;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
});
const hexPts = (cx, cy, R, rot = -Math.PI / 2) => Array.from({ length: 6 }, (_, i) => {
  const a = rot + (i * Math.PI) / 3;
  return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
});
function down2(cv, ow, oh) {
  const out = Buffer.alloc(ow * oh * 4);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const i = ((y * 2 + sy) * cv.w + x * 2 + sx) * 4;
      r += cv.px[i]; g += cv.px[i + 1]; b += cv.px[i + 2]; a += cv.px[i + 3];
    }
    const o = (y * ow + x) * 4;
    out[o] = Math.round(r * 63.75); out[o + 1] = Math.round(g * 63.75);
    out[o + 2] = Math.round(b * 63.75); out[o + 3] = Math.round(a * 63.75);
  }
  return out;
}

// The bright cottage skin, taken from PALETTES.bright in generateUiPanels.mjs so
// shop art sits inside the same wood it is framed by. Keep in sync with that file.
export const INK = '#3B2416';           // warm near-black outline, never #000
export const WOOD = { rim: '#F0BE84', light: '#E3AC6E', base: '#C98A4B', mid: '#A96B33', dark: '#7E4A20', seam: '#5A3418' };
export const PARCH = { hi: '#FBF0D9', base: '#F3E2BF', dim: '#EBD8B2', shadow: '#D9BE8F' };
export const ACCENT = { main: '#6E9A4B', lo: '#527A36' };   // cottage sage
export const BRASS = { hi: '#E4B85E', lo: '#9A6A2E' };
export const AMB = { hi: '#FFC845', lo: '#B5730A' };
export const STONE = { hi: '#C9C3B4', base: '#A79F8E', lo: '#736B5C' };

/** Every shop icon is 192px = 64dp at @3x, drawn in a 384x384 supersample. */
export const W = 192;

/** Make a fresh supersampled canvas plus its centre coordinate. */
export function canvas() {
  return { cv: C(W * 2, W * 2), c: W };
}

/** Standard soft contact shadow under a subject centred at (cx, cy). */
export function contactShadow(cv, cx, cy, rx, ry, alpha = 0.3) {
  ellipse(cv, cx, cy, rx, ry, INK, alpha, 14);
}

/** Upper-left specular sheen. One light source for the whole set. */
export function sheen(cv, cx, cy, rx, ry, alpha = 0.55) {
  ellipse(cv, cx, cy, rx, ry, '#FFFFFF', alpha, 10);
}

export { C, hex, blend, ellipse, roundRect, flameLobe, capsule, arcStroke, tri, arrowHead, poly, starPts, hexPts, down2, savePNG };

/**
 * Draw a subject with a thick warm-dark contour behind it.
 *
 * A blind review of the first pass found this to be the single biggest gap
 * between the shop art and the shipped icon set: every icon in assets/ui is
 * "ONE centred silhouette, thick warm-dark outline, 2-3 big value steps", and
 * art built purely from gradients has no contour to hold its shape once the row
 * shrinks it to 56dp. Wrapping a subject in this restores the silhouette, and it
 * is what lets a light subject survive a dark ash row and a dark subject survive
 * a cream parchment one.
 *
 * `draw` is called with a scratch canvas. Its alpha is distance-transformed
 * (two-pass chamfer, so the contour is round rather than boxy), the ring is laid
 * down in `color`, and the subject is composited back on top.
 */
export function withOutline(cv, draw, opts = {}) {
  const width = opts.width ?? 9;      // supersample px; 9 => ~4.5px at 192, ~1.3px at 56dp
  const color = opts.color ?? INK;
  const alpha = opts.alpha ?? 1;
  const tmp = C(cv.w, cv.h);
  draw(tmp);

  const { w, h } = cv;
  const BIG = 1e9;
  const dist = new Float64Array(w * h);
  // Seed: inside the subject is 0, outside starts at infinity.
  for (let i = 0; i < w * h; i++) dist[i] = tmp.px[i * 4 + 3] > 0.5 ? 0 : BIG;
  // Chamfer 3-4 distance transform, forward then backward.
  const D1 = 1, D2 = 1.4142;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let d = dist[i];
      if (d === 0) continue;
      if (x > 0) d = Math.min(d, dist[i - 1] + D1);
      if (y > 0) d = Math.min(d, dist[i - w] + D1);
      if (x > 0 && y > 0) d = Math.min(d, dist[i - w - 1] + D2);
      if (x < w - 1 && y > 0) d = Math.min(d, dist[i - w + 1] + D2);
      dist[i] = d;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      let d = dist[i];
      if (d === 0) continue;
      if (x < w - 1) d = Math.min(d, dist[i + 1] + D1);
      if (y < h - 1) d = Math.min(d, dist[i + w] + D1);
      if (x < w - 1 && y < h - 1) d = Math.min(d, dist[i + w + 1] + D2);
      if (x > 0 && y < h - 1) d = Math.min(d, dist[i + w - 1] + D2);
      dist[i] = d;
    }
  }

  const [r, g, b] = hex(color);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const d = dist[i];
      if (d > width + 1) continue;
      // 1 inside the ring, feathering off over the final pixel so the contour is
      // anti-aliased like everything else in the kit.
      const a = Math.max(0, Math.min(1, width + 1 - d));
      if (a > 0) blend(cv, x, y, r, g, b, a * alpha);
    }
  }
  // Subject over its own contour.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const sa = tmp.px[o + 3];
      if (sa <= 0) continue;
      blend(cv, x, y, tmp.px[o] / (sa || 1), tmp.px[o + 1] / (sa || 1), tmp.px[o + 2] / (sa || 1), sa);
    }
  }
}
