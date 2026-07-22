// Candy-style UI icon sprites: flame (streak), journal book, pit mouth,
// the puzzle action-button set (hint bulb, undo arrow, restart arrows),
// plus the victory stars (star_filled/star_empty) and the amber gem.
// All smooth, supersampled 2x, 256x256. This script runs LAST in
// `npm run generate:assets`, so its star/amber versions intentionally
// override the older ones drawn by generateWorldArt.mjs.
// Run: node scripts/tools/generateUiIcons.mjs
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';

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
const UI = path.resolve(import.meta.dirname, '../../assets/ui');
fs.mkdirSync(UI, { recursive: true });

// === flame.png (256) — streak indicator ======================================
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  flameLobe(cv, c + 6, 30, 470, 150, '#E8511D');                 // outer body
  flameLobe(cv, c + 2, 60, 466, 132, '#FF7A28');                 // mid
  flameLobe(cv, c - 4, 150, 460, 96, '#FFB23E');                 // inner
  flameLobe(cv, c - 8, 250, 452, 58, '#FFE08A');                 // hot core
  ellipse(cv, c - 60, 170, 14, 30, '#FFD9A8', 0.85, 8);          // spark highlight
  savePNG(path.join(UI, 'flame.png'), W, W, down2(cv, W, W));
}

// === journal.png (256) — a closed leather-bound tome (the Journal hub) ========
// Cottage reskin of the old flat "notes-app page": a burgundy leather cover with
// a wooden spine, brass corner braces, an amber cover boss, a parchment page
// block and a crimson ribbon bookmark. Reads as a real in-world journal on the
// dark header pill (the amber boss + parchment edge stay bright).
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const INK = '#2C2114';
  const LEA = '#A24A38', LEA_DK = '#6C2C22', LEA_HI = '#C4694E';
  const PAGE = '#F3E6C2', PAGE_LO = '#DEC488';
  const BRASS = '#E4B85E', BRASS_DK = '#9A6A2E';
  const AMB = '#FFC845', AMB_DK = '#B5730A';
  roundRect(cv, c + 6, c + 18, 138, 178, 20, INK, 0.34);                   // drop shadow
  // parchment page block, peeking to the right of the cover
  roundRect(cv, c + 16, c + 2, 132, 168, 12, PAGE, 1, PAGE_LO);
  for (const dx of [122, 132, 142]) capsule(cv, c + dx, c - 146, c + dx, c + 150, 4, PAGE_LO, 0.9); // page striations
  // leather cover (shifted left so the pages peek)
  roundRect(cv, c - 8, c, 126, 172, 16, LEA, 1, LEA_DK);
  roundRect(cv, c - 8, c - 150, 108, 18, 9, LEA_HI, 0.4);                  // top sheen
  // wooden/darker spine band with two raised ridges
  roundRect(cv, c - 110, c, 24, 172, 8, LEA_DK);
  for (const dy of [-84, 84]) capsule(cv, c - 128, c + dy, c - 92, c + dy, 9, LEA_HI, 0.55);
  // brass corner braces (L-shapes)
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const bx = c - 8 + sx * 106, by = c + sy * 150;
    capsule(cv, bx, by, bx - sx * 40, by, 14, INK); capsule(cv, bx, by, bx, by - sy * 40, 14, INK);
    capsule(cv, bx, by, bx - sx * 34, by, 8, BRASS, 1); capsule(cv, bx, by, bx, by - sy * 34, 8, BRASS, 1);
  }
  // amber cover boss (a small faceted gem)
  const bcx = c - 8, bcy = c;
  poly(cv, hexPts(bcx, bcy, 44), INK);
  poly(cv, hexPts(bcx, bcy, 36), AMB, 1, AMB_DK);
  ellipse(cv, bcx - 10, bcy - 10, 12, 12, '#FFF0B0', 0.7);
  // crimson ribbon bookmark hanging past the bottom edge
  capsule(cv, c + 66, c - 168, c + 66, c + 190, 24, INK, 0.5);            // ribbon shadow edge
  capsule(cv, c + 66, c - 168, c + 66, c + 186, 18, '#B23A4A', 1);        // ribbon
  capsule(cv, c + 60, c - 150, c + 60, c + 150, 5, '#E67488', 0.6);       // ribbon highlight
  savePNG(path.join(UI, 'journal.png'), W, W, down2(cv, W, W));
}

// === pit.png (256) — the Offering Pit mouth ==================================
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  ellipse(cv, c, c + 60, 190, 86, '#9A93B6');                    // outer stone rim
  ellipse(cv, c, c + 48, 178, 78, '#CFC9E2');                    // rim top light
  for (let a = 0; a < 12; a++) {                                  // chunky rim stones
    const ang = (a / 12) * Math.PI * 2;
    const x = c + Math.cos(ang) * 160, y = c + 52 + Math.sin(ang) * 66;
    ellipse(cv, x, y, 30, 20, a % 2 ? '#E2DDF0' : '#B8B1CF');
  }
  ellipse(cv, c, c + 52, 138, 56, '#241852');                    // mouth
  ellipse(cv, c, c + 58, 116, 44, '#140C2E');                    // depths
  ellipse(cv, c, c + 36, 112, 28, '#4FF0D4', 0.75, 26);          // teal glow
  ellipse(cv, c, c + 30, 72, 15, '#A8FFEE', 0.9, 14);
  for (const [dx, dy, r] of [[-44, -60, 11], [10, -110, 13], [52, -40, 10], [-12, -160, 9]]) {
    ellipse(cv, c + dx, c + dy, r, r, '#5FF6DC', 1, 4);          // rising motes
  }
  savePNG(path.join(UI, 'pit.png'), W, W, down2(cv, W, W));
}

// === hint.png (256) — glowing bulb for the HINT action button ================
{
  const W = 256, cv = C(W * 2, W * 2), c = W, by = c - 30; // bulb glass center
  ellipse(cv, c, by, 214, 214, '#FFE9A0', 0.28, 100);            // ambient glow
  for (const deg of [-150, -115, -90, -65, -30]) {               // light rays
    const ang = (deg * Math.PI) / 180;
    capsule(cv, c + Math.cos(ang) * 164, by + Math.sin(ang) * 164,
      c + Math.cos(ang) * 212, by + Math.sin(ang) * 212, 24, '#FFE066', 0.95);
  }
  ellipse(cv, c + 8, by + 12, 132, 140, '#2A2040', 0.3, 8);      // drop shadow
  ellipse(cv, c, by, 128, 136, '#F5A623');                       // amber rim
  ellipse(cv, c - 4, by - 8, 114, 122, '#FFD84D');               // glass
  ellipse(cv, c - 14, by - 22, 86, 92, '#FFE985');               // inner light
  ellipse(cv, c - 46, by - 62, 30, 42, '#FFFFFF', 0.85, 12);     // highlight
  capsule(cv, c - 30, c + 64, c, c + 38, 13, '#E8890C');         // filament V
  capsule(cv, c, c + 38, c + 30, c + 64, 13, '#E8890C');
  roundRect(cv, c, c + 130, 56, 34, 12, '#C9C2DE', 1, '#9A93B6'); // screw cap
  for (const dy of [124, 142]) capsule(cv, c - 46, c + dy, c + 46, c + dy, 9, '#8E86AD');
  ellipse(cv, c, c + 172, 24, 13, '#8E86AD');                    // contact tip
  savePNG(path.join(UI, 'hint.png'), W, W, down2(cv, W, W));
}

// === undo.png (256) — counterclockwise arrow for the UNDO action button ======
// White glyph over a dark sticker edge so it stays readable on the yellow pill.
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const R = 128, T = 54, a0 = -Math.PI * 0.88, a1 = Math.PI * 0.55, HEAD = 62;
  arcStroke(cv, c, c + 6, R, T + 22, a0, a1, '#2A2040', 0.85);   // ink edge + grounding
  arrowHead(cv, c, c + 6, R, a0, -1, HEAD + 13, '#2A2040', 0.85);
  arcStroke(cv, c, c, R, T, a0, a1, '#FFFFFF');                  // white glyph
  arrowHead(cv, c, c, R, a0, -1, HEAD, '#FFFFFF');
  savePNG(path.join(UI, 'undo.png'), W, W, down2(cv, W, W));
}

// === restart.png (256) — twin refresh arrows for RESTART/NEW =================
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const R = 122, T = 50, HEAD = 58;
  const arcs = [[-Math.PI * 0.83, -Math.PI * 0.2], [Math.PI * 0.17, Math.PI * 0.8]];
  for (const [a0, a1] of arcs) {                                  // ink edge + grounding
    arcStroke(cv, c, c + 6, R, T + 22, a0, a1, '#2A2040', 0.85);
    arrowHead(cv, c, c + 6, R, a1, 1, HEAD + 13, '#2A2040', 0.85);
  }
  for (const [a0, a1] of arcs) {                                  // white glyphs
    arcStroke(cv, c, c, R, T, a0, a1, '#FFFFFF');
    arrowHead(cv, c, c, R, a1, 1, HEAD, '#FFFFFF');
  }
  savePNG(path.join(UI, 'restart.png'), W, W, down2(cv, W, W));
}

// === skip.png (256) — skip-to-next glyph (two triangles + bar) for cold-open ==
// White glyph over a dark sticker edge, matching undo/restart, so the onboarding
// SKIP action reads as a real icon instead of a raw ">" character.
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  // Geometry in the 2x canvas: two right-pointing triangles then a vertical bar.
  const H = 86;                 // half-height of the glyph
  const t1x0 = c - 150, t1x1 = c - 18;   // first triangle base->apex x
  const t2x0 = c - 18,  t2x1 = c + 114;  // second triangle base->apex x
  const barX0 = c + 118, barX1 = c + 150, barY0 = c - H, barY1 = c + H;
  const draw = (color, alpha, dy) => {
    tri(cv, [t1x0, c - H + dy], [t1x0, c + H + dy], [t1x1, c + dy], color, alpha);
    tri(cv, [t2x0, c - H + dy], [t2x0, c + H + dy], [t2x1, c + dy], color, alpha);
    poly(cv, [[barX0, barY0 + dy], [barX1, barY0 + dy], [barX1, barY1 + dy], [barX0, barY1 + dy]], color, alpha);
  };
  draw('#2A2040', 0.85, 6);   // ink edge + grounding
  draw('#FFFFFF', 1, 0);      // white glyph
  savePNG(path.join(UI, 'skip.png'), W, W, down2(cv, W, W));
}

// === star_filled.png (256) — plump victory star, golden gradient + rim light =
// Fills ~80% of the canvas (the old star used ~45%) so it stays crisp at the
// larger render sizes in the victory modal.
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const IN = 0.52;                                                          // fat arms
  poly(cv, starPts(c + 5, c + 18, 196, 196 * IN), '#8A5800', 0.35);         // drop shadow
  poly(cv, starPts(c, c, 208, 208 * IN), '#9C5E06');                        // warm dark outline
  poly(cv, starPts(c - 3, c - 5, 190, 190 * IN), '#FFF3BE');                // rim light (peeks top-left)
  poly(cv, starPts(c + 2, c + 3, 184, 184 * IN), '#FFD84E', 1, '#F0990C');  // golden gradient body
  poly(cv, starPts(c, c - 8, 134, 134 * IN), '#FFE68C', 0.55);              // inner bloom
  poly(cv, starPts(c, c - 12, 82, 82 * 0.5), '#FFF3B8', 0.5);               // hot center
  ellipse(cv, c - 60, c - 56, 19, 19, '#FFFFFF', 0.9, 8);                   // sparkle
  ellipse(cv, c - 32, c - 90, 9, 9, '#FFFFFF', 0.75, 4);
  savePNG(path.join(UI, 'star_filled.png'), W, W, down2(cv, W, W));
}

// === star_empty.png (256) — clean dark-outlined hollow socket ================
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const IN = 0.52;
  poly(cv, starPts(c + 4, c + 16, 194, 194 * IN), '#2A2040', 0.22);         // soft shadow
  poly(cv, starPts(c, c, 208, 208 * IN), '#544C6C');                        // dark outline
  poly(cv, starPts(c, c + 5, 178, 178 * IN), '#F0EDF7');                    // lit bottom inner edge
  poly(cv, starPts(c, c - 2, 172, 172 * IN), '#DAD5E7', 1, '#C2BBD6');      // socket fill
  poly(cv, starPts(c, c - 10, 128, 128 * IN), '#ACA4C2', 0.45);             // sunken top shade
  poly(cv, starPts(c, c - 12, 78, 78 * 0.5), '#B9B2CC', 0.4);               // deep center
  savePNG(path.join(UI, 'star_empty.png'), W, W, down2(cv, W, W));
}

// === amber.png (256) — faceted amber gem with warm internal glow =============
// Hexagonal cut, dark warm outline for contrast on light AND dark pills,
// facet fan from an upper-left key light, trapped fleck, crisp specular.
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const R = 172;
  const [V0, V1, V2, V3, V4, V5] = hexPts(c, c, R);
  poly(cv, hexPts(c + 5, c + 18, 196), '#5A3600', 0.32);                    // drop shadow
  poly(cv, hexPts(c, c, 206), '#6B3D05');                                   // dark warm outline
  poly(cv, hexPts(c, c, 190), '#F5940E', 1, '#D9770A');                     // rim bevel
  poly(cv, hexPts(c, c, R), '#FFC845', 1, '#F5A315');                       // body
  const F = [c - 16, c - 14];                                               // facet focus (key light)
  tri(cv, V5, V0, F, '#FFEDA6', 0.7);                                       // crown left — brightest
  tri(cv, V0, V1, F, '#FFDC70', 0.5);                                       // crown right
  tri(cv, V1, V2, F, '#F5A928', 0.4);                                       // right side
  tri(cv, V2, V3, F, '#E1830A', 0.5);                                       // pavilion right — deepest
  tri(cv, V3, V4, F, '#EE9612', 0.45);                                      // pavilion left
  tri(cv, V4, V5, F, '#FFC554', 0.35);                                      // left side
  poly(cv, hexPts(c - 12, c - 10, 58), '#FFE596', 0.55);                    // polished table
  ellipse(cv, c, c + 12, 118, 128, '#FFDF80', 0.5, 60);                     // warm internal glow
  ellipse(cv, c - 10, c - 2, 64, 74, '#FFF0AE', 0.5, 40);                   // glow core
  ellipse(cv, c + 36, c + 46, 13, 19, '#7A4A0E', 0.45, 8);                  // the trapped fleck
  capsule(cv, c + 20, c + 148, c + 124, c + 78, 8, '#FFDF8E', 0.55);        // bottom rim light
  ellipse(cv, c - 62, c - 86, 20, 32, '#FFFFFF', 0.92, 9);                  // crisp specular
  ellipse(cv, c - 26, c - 116, 9, 9, '#FFFFFF', 0.8, 4);                    // micro sparkle
  savePNG(path.join(UI, 'amber.png'), W, W, down2(cv, W, W));
}

// === quest.png (256) — a painted wooden archery target (goals / quests) =======
// Cottage reskin of the old flat candy dartboard: a warm layered wooden rim with
// mounting pegs, muted painted bands (wine + parchment), and an amber bullseye.
// Reads as a crafted "goal/target" on the dark header pill (the amber bull +
// cream bands stay bright).
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const INK = '#2C2114', WOOD = '#B87A3E', WOOD_DK = '#754A24', WOOD_HI = '#E4C282';
  const WINE = '#A84B5E', PARCH = '#F3E6C2', AMB = '#FFC845', AMB_DK = '#B5730A';
  ellipse(cv, c + 6, c + 22, 200, 200, INK, 0.26, 30);           // soft drop shadow
  ellipse(cv, c, c, 210, 210, INK);                              // warm outline
  ellipse(cv, c, c, 202, 202, WOOD_HI);                          // rim highlight
  ellipse(cv, c, c, 192, 192, WOOD);                             // rim body
  ellipse(cv, c, c, 180, 180, WOOD_DK);                          // rim inner groove
  ellipse(cv, c, c, 170, 170, INK);                              // face inset ring
  ellipse(cv, c, c, 162, 162, WINE);                             // painted band (outer)
  ellipse(cv, c, c, 130, 130, PARCH);                            //   cream
  ellipse(cv, c, c, 100, 100, WINE);                             //   wine
  ellipse(cv, c, c, 62, 62, PARCH);                              //   cream
  ellipse(cv, c, c, 34, 34, AMB_DK);                             // bull rim
  ellipse(cv, c, c, 27, 27, AMB);                                // amber bullseye
  ellipse(cv, c - 9, c - 9, 8, 8, '#FFF3C8', 0.9);               // bull glint
  // mounting pegs on the wooden rim (N/E/S/W) — a crafted, in-world target
  for (const [px, py] of [[0, -186], [186, 0], [0, 186], [-186, 0]]) {
    ellipse(cv, c + px, c + py, 10, 10, INK);
    ellipse(cv, c + px - 2, c + py - 2, 4, 4, WOOD_HI, 0.8);
  }
  arcStroke(cv, c, c, 196, 4, Math.PI * 1.08, Math.PI * 1.62, WOOD_HI, 0.4); // rim grain glint
  ellipse(cv, c - 66, c - 74, 40, 30, '#FFFFFF', 0.14, 34);      // soft top-left sheen
  savePNG(path.join(UI, 'quest.png'), W, W, down2(cv, W, W));
}

// === menu.png (256) — three plump bars for the ☰ utility menu ================
// White glyph over a soft dark edge (like the undo/restart arrows) so it stays
// readable on both the dark header pill and the post-tutorial light home.
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const halfW = 152, th = 48, ys = [c - 116, c, c + 116];
  for (const y of ys) capsule(cv, c - halfW, y + 9, c + halfW, y + 9, th + 18, '#2A2040', 0.5); // ink edge
  for (const y of ys) {
    capsule(cv, c - halfW, y, c + halfW, y, th, '#F1ECFC');       // bright bar
    capsule(cv, c - halfW + 10, y - th * 0.26, c + halfW - 10, y - th * 0.26, th * 0.36, '#FFFFFF', 0.75); // top sheen
  }
  savePNG(path.join(UI, 'menu.png'), W, W, down2(cv, W, W));
}

// === calendar.png (256) — daily-challenge calendar page ======================
// Candy calendar: purple frame, cream page, red header band with binder rings,
// a grid of days with today highlighted in amber.
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  roundRect(cv, c, c + 20, 150, 150, 28, '#2A2040', 0.3);        // drop shadow
  roundRect(cv, c, c + 6, 150, 150, 26, '#6B3FD0');              // dark purple frame
  roundRect(cv, c, c + 6, 138, 138, 20, '#FFFFFF', 1, '#EFE9FB'); // page body
  roundRect(cv, c, c - 88, 138, 42, 20, '#FF6B7E', 1, '#E8455C'); // red header band
  roundRect(cv, c, c - 116, 138, 16, 8, '#6B3FD0');              // band base cap (square-ish top)
  for (const dx of [-86, 86]) {                                   // binder rings
    capsule(cv, c + dx, c - 138, c + dx, c - 88, 22, '#332748');
    capsule(cv, c + dx, c - 142, c + dx, c - 96, 12, '#D4CCEA');
  }
  const gx = [-88, -30, 28, 86], gy = [-16, 44, 104];            // day grid
  for (let r = 0; r < gy.length; r++) for (let ci = 0; ci < gx.length; ci++) {
    if (r === 1 && ci === 2) roundRect(cv, c + gx[ci], c + gy[r], 26, 24, 8, '#FFC845', 1, '#F5A315'); // today
    else ellipse(cv, c + gx[ci], c + gy[r], 12, 12, '#C3B9E0');
  }
  roundRect(cv, c, c - 100, 120, 10, 5, '#FFFFFF', 0.32);        // band sheen
  savePNG(path.join(UI, 'calendar.png'), W, W, down2(cv, W, W));
}

// === tending.png (256) — serene 8-spoke bloom for the Phase-5 Tending shrine ==
// Mauve long spokes + gold short spokes, a soft aura, a bright core: the serene
// post-revelation counterpart to the sparkle, not a busy asterisk.
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  ellipse(cv, c, c, 150, 150, '#C9A7E8', 0.22, 100);            // soft aura
  for (let k = 0; k < 8; k++) {
    const ang = k * Math.PI / 4, long = k % 2 === 0;
    const len = long ? 198 : 122, hw = long ? 30 : 21;
    const tx = Math.cos(ang), ty = Math.sin(ang), px = -Math.sin(ang), py = Math.cos(ang);
    tri(cv, [c + tx * len, c + ty * len], [c + px * hw, c + py * hw], [c - px * hw, c - py * hw],
      long ? '#E9D6F7' : '#F6E7B0');
  }
  ellipse(cv, c, c, 48, 48, '#FBF0FF');                         // bright core
  ellipse(cv, c, c, 27, 27, '#FFF9E6');
  ellipse(cv, c - 12, c - 12, 12, 12, '#FFFFFF', 0.9);         // glint
  savePNG(path.join(UI, 'tending.png'), W, W, down2(cv, W, W));
}

// === home.png (256) — cozy cottage for the pit "return home" button ==========
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  roundRect(cv, c, c + 70, 128, 92, 18, '#2A2040', 0.28);       // drop shadow
  poly(cv, [[c, c - 152], [c + 170, c - 6], [c - 170, c - 6]], '#C23048');       // roof outline
  poly(cv, [[c, c - 134], [c + 152, c - 6], [c - 152, c - 6]], '#FF6B7E', 1, '#E8455C'); // roof
  poly(cv, [[c, c - 120], [c + 96, c - 34], [c - 96, c - 34]], '#FF97A8', 0.55); // roof sheen
  roundRect(cv, c, c + 62, 124, 88, 14, '#5A4A36', 0.5);        // body outline
  roundRect(cv, c, c + 62, 118, 82, 12, '#FFFFFF', 1, '#F0E7D9'); // cream body
  roundRect(cv, c, c + 94, 34, 52, 10, '#8257EA', 1, '#6B3FD0'); // door
  ellipse(cv, c + 18, c + 98, 6, 6, '#FFD968');                 // doorknob
  for (const dx of [-64, 64]) {                                 // windows
    roundRect(cv, c + dx, c + 40, 26, 26, 6, '#7EC7F5', 1, '#4FA8E8');
    capsule(cv, c + dx, c + 28, c + dx, c + 52, 4, '#FFFFFF', 0.5);
  }
  savePNG(path.join(UI, 'home.png'), W, W, down2(cv, W, W));
}

// === moon.png (256) — pale full moon for the full-moon event badge ===========
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  ellipse(cv, c, c, 190, 190, '#FFF6D8', 0.25, 100);           // glow
  ellipse(cv, c, c, 152, 152, '#E4D7A0');                       // shadow rim
  ellipse(cv, c - 6, c - 6, 146, 146, '#FBF3C8');               // body (pale gold)
  ellipse(cv, c - 40, c - 44, 96, 96, '#FFFBE8', 0.6, 46);      // lit bloom
  ellipse(cv, c + 42, c + 30, 26, 26, '#DCCF9A', 0.55);         // craters
  ellipse(cv, c - 34, c + 54, 18, 18, '#DCCF9A', 0.5);
  ellipse(cv, c + 56, c - 40, 15, 15, '#DCCF9A', 0.45);
  ellipse(cv, c - 62, c - 4, 12, 12, '#DCCF9A', 0.4);
  ellipse(cv, c - 48, c - 54, 22, 30, '#FFFFFF', 0.5, 16);      // specular
  savePNG(path.join(UI, 'moon.png'), W, W, down2(cv, W, W));
}

// === share.png (256) — an amber arrow rising from a wooden crate (share) ======
// Cottage reskin of the old flat candy tray+arrow: a planked wooden crate with
// corner posts and an open top, and a bright amber arrow rising out of it (send
// / share / export). The amber stays legible on the dark victory modal.
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const INK = '#2C2114', WOOD = '#B87A3E', WOOD_DK = '#754A24', WOOD_HI = '#E4C282';
  const AMB = '#FFC845', AMB_HI = '#FFE39A';
  roundRect(cv, c, c + 100, 132, 20, 12, INK, 0.26);            // crate shadow
  roundRect(cv, c, c + 72, 128, 92, 18, INK);                   // crate ink
  roundRect(cv, c, c + 72, 116, 82, 14, WOOD, 1, WOOD_DK);      // crate wood
  roundRect(cv, c, c + 40, 86, 20, 8, WOOD_DK);                 // open-top dark slot
  for (const dx of [-66, 66]) capsule(cv, c + dx, c + 44, c + dx, c + 150, 9, WOOD_DK, 0.85); // corner posts
  capsule(cv, c - 100, c + 76, c + 100, c + 76, 7, WOOD_HI, 0.45); // mid plank light
  const ax = c;
  capsule(cv, ax, c + 66, ax, c - 152, 46, INK);               // shaft ink
  tri(cv, [ax, c - 210], [ax + 94, c - 104], [ax - 94, c - 104], INK);   // head ink
  capsule(cv, ax, c + 60, ax, c - 146, 30, AMB, 1);            // amber shaft
  tri(cv, [ax, c - 198], [ax + 78, c - 108], [ax - 78, c - 108], AMB, 1); // amber head
  capsule(cv, ax - 8, c - 122, ax - 8, c + 44, 9, AMB_HI, 0.65); // shaft sheen
  savePNG(path.join(UI, 'share.png'), W, W, down2(cv, W, W));
}

// === bell.png (256) — golden notification bell ===============================
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  roundRect(cv, c, c + 40, 118, 118, 44, '#2A2040', 0.24);      // shadow
  roundRect(cv, c, c - 128, 22, 26, 11, '#E8890C');             // top loop
  poly(cv, [
    [c, c - 122], [c + 62, c - 96], [c + 98, c + 40],
    [c + 134, c + 82], [c - 134, c + 82], [c - 98, c + 40], [c - 62, c - 96],
  ], '#D9770A');                                                // bell outline
  poly(cv, [
    [c, c - 108], [c + 54, c - 84], [c + 86, c + 38],
    [c + 118, c + 72], [c - 118, c + 72], [c - 86, c + 38], [c - 54, c - 84],
  ], '#FFC845', 1, '#F5A315');                                  // bell body
  poly(cv, [[c - 118, c + 54], [c + 118, c + 54], [c + 118, c + 74], [c - 118, c + 74]], '#FFE08A', 0.85); // rim light
  ellipse(cv, c, c + 108, 30, 30, '#E8890C');                   // clapper
  capsule(cv, c - 44, c - 76, c - 62, c + 34, 15, '#FFECB4', 0.7); // sheen
  savePNG(path.join(UI, 'bell.png'), W, W, down2(cv, W, W));
}

// ===================== Setup-menu mode icons (render ~22px) ===================
// Replace the bare emoji in the variant/combo selector + challenge/blind/weave
// toggles. Bold shapes, dark outlines so they read on the light parchment rows,
// bright bodies so they read on the dark (ash) rows.

// lit crescent = inside the big disc AND outside a shadow disc offset by dx
function crescent(cv, cx, cy, R, dx, color, alpha = 1) {
  const [r, g, b] = hex(color);
  for (let y = ~~(cy - R - 2); y <= ~~(cy + R + 2); y++)
    for (let x = ~~(cx - R - 2); x <= ~~(cx + R + 2); x++) {
      const d1 = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - R;
      const d2 = Math.hypot(x + 0.5 - (cx + dx), y + 0.5 - cy) - R * 0.94;
      const a = Math.max(0, Math.min(1, 0.5 - d1)) * Math.max(0, Math.min(1, 0.5 + d2));
      if (a > 0) blend(cv, x, y, r, g, b, a * alpha);
    }
}
// a downward arrow (shaft + head), outlined
function downArrow(cv, cx, topY, botY, shaftTh, headHalf, headLen, body, ink) {
  capsule(cv, cx, topY, cx, botY - headLen + 20, shaftTh + 18, ink);
  tri(cv, [cx - headHalf - 12, botY - headLen + 8], [cx + headHalf + 12, botY - headLen + 8], [cx, botY + 14], ink);
  capsule(cv, cx, topY, cx, botY - headLen + 20, shaftTh, body);
  tri(cv, [cx - headHalf, botY - headLen], [cx + headHalf, botY - headLen], [cx, botY], body);
}

// variant_standard.png — the core "shift down" arrow
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  downArrow(cv, c, c - 150, c + 168, 44, 112, 128, '#B79BFF', '#3A2E52');
  capsule(cv, c - 14, c - 130, c - 14, c + 4, 12, '#E7DCFF', 0.7);   // sheen
  savePNG(path.join(UI, 'variant_standard.png'), W, W, down2(cv, W, W));
}

// variant_reverse.png — a down arrow + an up arrow (descend, then return)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  downArrow(cv, c - 74, c - 150, c + 150, 34, 74, 92, '#8ED0FF', '#274A5E');       // down (left)
  // up arrow (right): mirror vertically
  const ux = c + 74;
  capsule(cv, ux, c + 150, ux, c - 130, 34 + 18, '#274A5E');
  tri(cv, [ux - 86, c - 108], [ux + 86, c - 108], [ux, c - 164], '#274A5E');
  capsule(cv, ux, c + 150, ux, c - 130, 34, '#A9DEFF');
  tri(cv, [ux - 74, c - 116], [ux + 74, c - 116], [ux, c - 168], '#A9DEFF');
  savePNG(path.join(UI, 'variant_reverse.png'), W, W, down2(cv, W, W));
}

// variant_speed.png — lightning bolt
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const bolt = [
    [c + 34, c - 176], [c - 92, c + 20], [c - 12, c + 20],
    [c - 40, c + 180], [c + 96, c - 40], [c + 14, c - 40],
  ];
  poly(cv, bolt.map(([x, y]) => [x, y]), '#B8860B');                 // outline (drawn larger below)
  poly(cv, [
    [c + 28, c - 168], [c - 82, c + 14], [c - 8, c + 14],
    [c - 34, c + 168], [c + 86, c - 34], [c + 10, c - 34],
  ], '#FFD23E', 1, '#F5A623');
  capsule(cv, c + 4, c - 150, c - 46, c - 6, 12, '#FFF0A8', 0.7);    // sheen
  savePNG(path.join(UI, 'variant_speed.png'), W, W, down2(cv, W, W));
}

// variant_double.png — two up chevrons (double shift)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const chev = (cy, body, ink) => {
    capsule(cv, c - 120, cy + 66, c, cy - 40, 52, ink);
    capsule(cv, c, cy - 40, c + 120, cy + 66, 52, ink);
    capsule(cv, c - 120, cy + 60, c, cy - 46, 38, body);
    capsule(cv, c, cy - 46, c + 120, cy + 60, 38, body);
  };
  chev(c + 44, '#5EEAD4', '#155E52');   // lower chevron
  chev(c - 56, '#7DF3E0', '#155E52');   // upper chevron
  savePNG(path.join(UI, 'variant_double.png'), W, W, down2(cv, W, W));
}

// variant_swords.png — crossed swords (Challenge / Twin Trial)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const sword = (flip) => {
    const s = flip ? -1 : 1;
    // blade from lower-inner to upper-outer
    const bx0 = c - s * 40, by0 = c + 150, bx1 = c + s * 150, by1 = c - 150;
    capsule(cv, bx0, by0, bx1, by1, 54, '#3A3550');                 // ink
    capsule(cv, bx0, by0, bx1, by1, 38, '#D8DCEA', 1);              // steel
    capsule(cv, bx0, by0, bx1, by1, 12, '#FFFFFF', 0.6);           // edge light
    // crossguard + hilt at lower-inner
    capsule(cv, c - s * 78, c + 112, c + s * 4, c + 178, 24, '#8A5A22'); // guard
    ellipse(cv, c - s * 40, c + 150, 26, 26, '#F5B82E', 1, 3);      // pommel gold
  };
  sword(false);
  sword(true);
  savePNG(path.join(UI, 'variant_swords.png'), W, W, down2(cv, W, W));
}

// variant_tornado.png — a banded funnel (Racing Shadows)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  // Narrowing stack of horizontal lozenges with alternating shade bands and a
  // slight per-band lean — reads as a spinning tornado funnel. A thin dark ink
  // ellipse behind each band delineates the horizontal banding.
  const rings = [
    [c - 12, c - 142, 144, 34], [c + 8, c - 98, 124, 32],
    [c - 8, c - 54, 102, 30], [c + 8, c - 12, 78, 28], [c - 4, c + 28, 54, 25],
  ];
  for (const [cx, cy, rx, ry] of rings) ellipse(cv, cx, cy, rx + 7, ry, '#232840'); // ink band
  const cols = ['#AEBBEC', '#7E92D2', '#AEBBEC', '#7285CB', '#9CACE4'];
  rings.forEach(([cx, cy, rx, ry], i) => ellipse(cv, cx, cy, rx, ry - 7, cols[i]));
  capsule(cv, c - 4, c + 44, c - 44, c + 156, 24, '#232840');     // curling tail ink
  capsule(cv, c - 4, c + 44, c - 44, c + 156, 13, '#9CACE4');     // curling tail
  savePNG(path.join(UI, 'variant_tornado.png'), W, W, down2(cv, W, W));
}

// variant_crescent.png — crescent moon (Blind Return)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  crescent(cv, c, c, 176, 92, '#2A2438');                          // ink halo
  crescent(cv, c - 4, c, 168, 92, '#FBF3C8');                      // lit crescent
  crescent(cv, c - 20, c - 8, 120, 92, '#FFFBE8', 0.6);           // inner bloom
  savePNG(path.join(UI, 'variant_crescent.png'), W, W, down2(cv, W, W));
}

// variant_hole.png — a dark void (Free Fall)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  ellipse(cv, c, c + 6, 182, 150, '#2A2438');                      // rim ink
  ellipse(cv, c, c, 170, 140, '#5B4F72');                          // rim
  ellipse(cv, c, c + 4, 138, 112, '#241852');                      // mouth
  ellipse(cv, c, c + 8, 108, 84, '#0E0820');                       // depths
  ellipse(cv, c, c + 2, 62, 44, '#000000', 0.85, 24);             // black core
  savePNG(path.join(UI, 'variant_hole.png'), W, W, down2(cv, W, W));
}

// lock.png — closed padlock (locked rows / challenge locked)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  arcStroke(cv, c, c - 34, 82, 56, Math.PI * 1.02, Math.PI * 1.98, '#3A2E52');  // shackle ink
  arcStroke(cv, c, c - 34, 82, 40, Math.PI * 1.02, Math.PI * 1.98, '#B7ADC9');  // shackle metal
  roundRect(cv, c, c + 66, 126, 104, 26, '#3A2E52');              // body ink
  roundRect(cv, c, c + 62, 114, 94, 22, '#FFC845', 1, '#F5A315'); // body gold
  ellipse(cv, c, c + 46, 20, 20, '#7A4A0E');                      // keyhole
  capsule(cv, c, c + 46, c, c + 92, 16, '#7A4A0E');
  roundRect(cv, c - 40, c + 22, 40, 12, 6, '#FFE08A', 0.7);       // sheen
  savePNG(path.join(UI, 'lock.png'), W, W, down2(cv, W, W));
}

// lock_open.png — open padlock (challenge active)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  arcStroke(cv, c + 78, c - 40, 82, 56, Math.PI * 1.10, Math.PI * 2.06, '#3A2E52'); // open shackle ink
  arcStroke(cv, c + 78, c - 40, 82, 40, Math.PI * 1.10, Math.PI * 2.06, '#B7ADC9'); // metal
  roundRect(cv, c, c + 66, 126, 104, 26, '#3A2E52');
  roundRect(cv, c, c + 62, 114, 94, 22, '#FFC845', 1, '#F5A315');
  ellipse(cv, c, c + 46, 20, 20, '#7A4A0E');
  capsule(cv, c, c + 46, c, c + 92, 16, '#7A4A0E');
  savePNG(path.join(UI, 'lock_open.png'), W, W, down2(cv, W, W));
}

// blind.png — a dark new moon (Blind Offering active)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  ellipse(cv, c, c, 190, 190, '#6B5FA0', 0.30, 60);              // faint aura
  ellipse(cv, c, c, 176, 176, '#4A3F6A');                        // rim
  ellipse(cv, c - 4, c - 4, 166, 166, '#1C1630');               // dark face
  crescent(cv, c - 6, c, 168, 60, '#5A4F78', 0.55);            // faint lit sliver
  savePNG(path.join(UI, 'blind.png'), W, W, down2(cv, W, W));
}

// eye.png — an open eye (previews visible)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  // almond: intersection of two big circles above/below
  const [ir, ig, ib] = hex('#3A2E52');
  const [wr, wg, wb] = hex('#FFFFFF');
  for (let y = ~~(c - 130); y <= ~~(c + 130); y++)
    for (let x = ~~(c - 200); x <= ~~(c + 200); x++) {
      const dTop = Math.hypot((x + 0.5 - c) * 0.62, y + 0.5 - (c + 210)) - 300;  // lower lid arc
      const dBot = Math.hypot((x + 0.5 - c) * 0.62, y + 0.5 - (c - 210)) - 300;  // upper lid arc
      const inside = Math.max(0, Math.min(1, 0.5 - dTop)) * Math.max(0, Math.min(1, 0.5 - dBot));
      if (inside > 0) blend(cv, x, y, ir, ig, ib, inside);        // ink almond
    }
  for (let y = ~~(c - 118); y <= ~~(c + 118); y++)
    for (let x = ~~(c - 188); x <= ~~(c + 188); x++) {
      const dTop = Math.hypot((x + 0.5 - c) * 0.64, y + 0.5 - (c + 196)) - 282;
      const dBot = Math.hypot((x + 0.5 - c) * 0.64, y + 0.5 - (c - 196)) - 282;
      const inside = Math.max(0, Math.min(1, 0.5 - dTop)) * Math.max(0, Math.min(1, 0.5 - dBot));
      if (inside > 0) blend(cv, x, y, wr, wg, wb, inside);        // white sclera
    }
  ellipse(cv, c, c, 62, 62, '#3A6EA5');                          // iris
  ellipse(cv, c, c, 34, 34, '#141428');                          // pupil
  ellipse(cv, c - 18, c - 18, 14, 14, '#FFFFFF', 0.9);          // catch light
  savePNG(path.join(UI, 'eye.png'), W, W, down2(cv, W, W));
}

// weave.png — a spool of thread (Unbroken Weave)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  roundRect(cv, c, c, 66, 150, 14, '#5A3A1E');                   // spool core (behind)
  ellipse(cv, c, c - 150, 132, 34, '#7A4E28');                   // top flange ink
  ellipse(cv, c, c - 156, 124, 28, '#B87A3E', 1, 3);            // top flange
  ellipse(cv, c, c + 150, 132, 34, '#7A4E28');                   // bottom flange ink
  ellipse(cv, c, c + 144, 124, 28, '#B87A3E', 1, 3);            // bottom flange
  for (let i = 0; i < 5; i++) {                                   // thread windings
    const y = c - 96 + i * 48;
    capsule(cv, c - 60, y, c + 60, y + 18, 22, i % 2 ? '#FF8FA3' : '#FF6B7E');
  }
  ellipse(cv, c - 30, c - 150, 26, 8, '#FFFFFF', 0.5);          // top sheen
  savePNG(path.join(UI, 'weave.png'), W, W, down2(cv, W, W));
}

// ================= Pit utility menu + Whisper Gallery icons ===================

// gear.png — settings cog
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  ellipse(cv, c + 6, c + 16, 150, 150, '#2A2040', 0.24, 30);      // shadow
  for (let i = 0; i < 8; i++) {                                    // teeth (ink)
    const a = i * Math.PI / 4;
    capsule(cv, c + Math.cos(a) * 92, c + Math.sin(a) * 92, c + Math.cos(a) * 172, c + Math.sin(a) * 172, 56, '#3A2E52');
  }
  for (let i = 0; i < 8; i++) {                                    // teeth (metal)
    const a = i * Math.PI / 4;
    capsule(cv, c + Math.cos(a) * 92, c + Math.sin(a) * 92, c + Math.cos(a) * 166, c + Math.sin(a) * 166, 40, '#C6BEDC');
  }
  ellipse(cv, c, c, 130, 130, '#3A2E52');                         // body ink
  ellipse(cv, c, c, 116, 116, '#D6CFE6', 1, 3);                   // body
  ellipse(cv, c - 30, c - 30, 40, 40, '#FFFFFF', 0.4, 20);        // sheen
  ellipse(cv, c, c, 54, 54, '#3A2E52');                           // hub hole ink
  ellipse(cv, c, c, 42, 42, '#8A7FB0');                           // hub hole
  savePNG(path.join(UI, 'gear.png'), W, W, down2(cv, W, W));
}

// stats.png — painted bars on a wooden shelf (Statistics)
// Cottage reskin of the old flat candy bar-chart: muted cottage paint (sage /
// dusty-blue / amber) over warm-ink outlines, standing on a wooden shelf with a
// top-lit edge. Reads clearly as "stats/growth" while matching the cozy chrome.
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const INK = '#2C2114', WOOD = '#B87A3E', WOOD_DK = '#754A24', WOOD_HI = '#E4C282';
  const baseY = c + 150;
  roundRect(cv, c, baseY + 12, 172, 24, 10, INK, 0.9);                     // shelf ink
  roundRect(cv, c, baseY + 8, 162, 16, 7, WOOD, 1, WOOD_DK);              // shelf wood
  capsule(cv, c - 148, baseY + 2, c + 148, baseY + 2, 5, WOOD_HI, 0.6);   // shelf top light
  const bars = [[-98, 116, '#7FA86A', '#587A48'], [0, 186, '#6E8FB0', '#496A8A'], [98, 248, '#E7A93A', '#B5730A']];
  for (const [bx, h] of bars) roundRect(cv, c + bx, baseY - 4 - h / 2, 38, h / 2 + 6, 14, INK); // ink outline
  for (const [bx, h, col, dk] of bars) {
    roundRect(cv, c + bx, baseY - 6 - h / 2, 28, h / 2, 10, col, 1, dk);  // painted body
    capsule(cv, c + bx - 8, baseY - 6 - h + 16, c + bx - 8, baseY - 22, 6, '#FFFFFF', 0.22); // left highlight
    capsule(cv, c + bx - 18, baseY - 4 - h + 10, c + bx + 18, baseY - 4 - h + 10, 5, '#FFFFFF', 0.32); // top edge light
  }
  savePNG(path.join(UI, 'stats.png'), W, W, down2(cv, W, W));
}

// whisper.png — thought bubble (Whisper Gallery: whisper entries)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const puffs = [[-72, -34, 62, 52], [-2, -62, 76, 62], [76, -30, 58, 48], [48, 24, 54, 44], [-44, 26, 52, 42], [8, -2, 82, 60]];
  for (const [dx, dy, rx, ry] of puffs) ellipse(cv, c + dx, c + dy - 18, rx + 8, ry + 8, '#B7ADC9'); // ink
  for (const [dx, dy, rx, ry] of puffs) ellipse(cv, c + dx, c + dy - 18, rx, ry, '#FFFFFF', 1, 6);
  ellipse(cv, c - 66, c + 100, 26, 22, '#B7ADC9'); ellipse(cv, c - 66, c + 100, 19, 15, '#FFFFFF'); // trailing
  ellipse(cv, c - 98, c + 146, 16, 14, '#B7ADC9'); ellipse(cv, c - 98, c + 146, 10, 8, '#FFFFFF');
  savePNG(path.join(UI, 'whisper.png'), W, W, down2(cv, W, W));
}

// speech.png — speech bubble (Whisper Gallery: dialogue entries)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  roundRect(cv, c, c - 4, 168, 122, 40, '#2A2040', 0.22);        // shadow
  tri(cv, [c - 44, c + 84], [c + 14, c + 84], [c - 78, c + 168], '#6B3FD0'); // tail ink
  roundRect(cv, c, c - 20, 168, 120, 40, '#3A2E52');             // ink
  tri(cv, [c - 40, c + 74], [c + 8, c + 74], [c - 70, c + 156], '#8257EA'); // tail
  roundRect(cv, c, c - 20, 156, 108, 34, '#A98BFF', 1, '#8257EA'); // bubble
  for (const dx of [-52, 0, 52]) ellipse(cv, c + dx, c - 20, 15, 15, '#FFFFFF', 0.92); // dots
  savePNG(path.join(UI, 'speech.png'), W, W, down2(cv, W, W));
}

// link.png — two interlocked forged bronze links (Whisper Gallery: cross-refs)
// Cottage reskin of the old flat candy rings: warm forged bronze with a top-left
// metallic highlight and a woven over/under at the crossing, so it reads as a
// real chain "link/connection" instead of two flat vector circles.
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const INK = '#2C2114', BR = '#C68A3E', BR_DK = '#835626', BR_HI = '#F0C878';
  const R = 84;
  const link = (cx, cy) => {
    arcStroke(cv, cx, cy, R, 52, 0.01, Math.PI * 2, INK);                 // ink
    arcStroke(cv, cx, cy, R, 38, 0.01, Math.PI * 2, BR_DK);               // dark bronze
    arcStroke(cv, cx, cy, R, 26, 0.01, Math.PI * 2, BR);                  // bronze
    arcStroke(cv, cx, cy, R, 9, Math.PI * 1.05, Math.PI * 1.72, BR_HI, 0.85); // top-left sheen
  };
  link(c - 58, c - 58);   // upper-left link
  link(c + 58, c + 58);   // lower-right link (drawn over)
  // weave the first link back over the crossing so the two interlock
  const cx1 = c - 58, cy1 = c - 58;
  arcStroke(cv, cx1, cy1, R, 52, Math.PI * 0.12, Math.PI * 0.63, INK);
  arcStroke(cv, cx1, cy1, R, 38, Math.PI * 0.12, Math.PI * 0.63, BR_DK);
  arcStroke(cv, cx1, cy1, R, 26, Math.PI * 0.12, Math.PI * 0.63, BR);
  arcStroke(cv, cx1, cy1, R, 9, Math.PI * 0.16, Math.PI * 0.4, BR_HI, 0.7);
  savePNG(path.join(UI, 'link.png'), W, W, down2(cv, W, W));
}

// scroll.png — rolled parchment (Whisper Gallery: default / narrative entries)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  roundRect(cv, c, c + 16, 122, 150, 18, '#2A2040', 0.22);       // shadow
  roundRect(cv, c, c, 108, 132, 8, '#F5E9C8', 1, '#E4CE96');     // sheet
  for (const dy of [-72, -34, 4, 42]) roundRect(cv, c, c + dy, 76, 7, 4, '#C0A468'); // text lines
  roundRect(cv, c, c - 138, 134, 30, 15, '#8A5A22');             // top roll ink
  roundRect(cv, c, c - 142, 126, 24, 12, '#C08A44', 1, '#9A6A2E');
  roundRect(cv, c, c + 138, 134, 30, 15, '#8A5A22');             // bottom roll ink
  roundRect(cv, c, c + 142, 126, 24, 12, '#C08A44', 1, '#9A6A2E');
  savePNG(path.join(UI, 'scroll.png'), W, W, down2(cv, W, W));
}

// ===================== De-emoji sprite kit (emotes + phase-mood) ==============
// New sprites that replace OS emoji rendered over the painterly art. The 12
// emote bubbles (128 sq, candy-UI family, bold shapes so they read at 18-24dp)
// swap the OS-emoji emote bubbles floated above the animals; the dread-ward set
// (eye/void/candle/fog/pale_heart/sleep) stays on-brand rather than cartoonish.
// The 4 phase-mood icons (256 sq) de-emoji the puzzle-header atmosphere badge,
// the phase-change card, the sacrifice altar candle, and the house-completion
// crest. moon.png and eye.png already exist and are intentionally NOT touched.
// A later pass wires these; this script only generates the pixels.

// parametric heart outline, vertically centered on (cx, cy); s scales it
function heartPts(cx, cy, s) {
  const raw = [];
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    raw.push([x, y]);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const midY = (minY + maxY) / 2;
  return raw.map(([x, y]) => [cx + x * s, cy + (y - midY) * s]);
}
// 4-point twinkle (8 vertices: sharp long points N/E/S/W, tight inner diagonals)
const spark4Pts = (cx, cy, rOut, rIn, rot = -Math.PI / 2) => Array.from({ length: 8 }, (_, i) => {
  const r = i % 2 ? rIn : rOut, a = rot + (i * Math.PI) / 4;
  return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
});
// a single "Z" glyph from three capsules (top bar, diagonal, bottom bar)
function drawZ(cv, cx, cy, size, th, color, alpha = 1) {
  const hw = size * 0.42, hh = size * 0.5;
  capsule(cv, cx - hw, cy - hh, cx + hw, cy - hh, th, color, alpha);   // top bar
  capsule(cv, cx + hw, cy - hh, cx - hw, cy + hh, th, color, alpha);   // diagonal
  capsule(cv, cx - hw, cy + hh, cx + hw, cy + hh, th, color, alpha);   // bottom bar
}

// ------------------------- Emote kit (128 sq) --------------------------------

// emote_heart.png — candy heart (warmth / affection)
{
  const W = 128, cv = C(W * 2, W * 2), c = W;
  poly(cv, heartPts(c + 5, c + 12, 6.0), '#7A1F33', 0.30);       // drop shadow
  poly(cv, heartPts(c, c, 6.2), '#7A1F33');                       // dark outline
  poly(cv, heartPts(c, c - 2, 5.7), '#FF6B7E', 1, '#E8455C');     // candy body
  poly(cv, heartPts(c, c - 6, 3.3), '#FF9FAD', 0.5);             // inner bloom
  ellipse(cv, c - 34, c - 30, 16, 20, '#FFC3CE', 0.85, 10);      // lobe sheen
  ellipse(cv, c - 18, c - 46, 7, 7, '#FFFFFF', 0.8, 4);         // glint
  savePNG(path.join(UI, 'emote_heart.png'), W, W, down2(cv, W, W));
}

// emote_sparkle.png — 4-point twinkle (delight)
{
  const W = 128, cv = C(W * 2, W * 2), c = W;
  ellipse(cv, c, c, 118, 118, '#FFE9A0', 0.22, 80);             // warm aura
  poly(cv, spark4Pts(c, c, 116, 30), '#B8860B');                 // gold outline
  poly(cv, spark4Pts(c, c, 104, 26), '#FFD84E', 1, '#F5A623');   // gold body
  poly(cv, spark4Pts(c, c, 60, 18), '#FFF0A8', 0.7);            // hot inner
  ellipse(cv, c, c, 20, 20, '#FFFDF0', 0.9);                    // core
  poly(cv, spark4Pts(c + 78, c - 74, 34, 9), '#FFE585', 0.95);  // satellite
  poly(cv, spark4Pts(c - 82, c + 66, 24, 7), '#FFEFB0', 0.85);  // small satellite
  savePNG(path.join(UI, 'emote_sparkle.png'), W, W, down2(cv, W, W));
}

// emote_note.png — eighth note (song / contentment)
{
  const W = 128, cv = C(W * 2, W * 2), c = W;
  const ink = '#3A2E52';
  capsule(cv, c + 30, c + 62, c + 30, c - 106, 30, ink);        // stem ink
  poly(cv, [[c + 30, c - 108], [c + 102, c - 66], [c + 90, c - 16], [c + 30, c - 52]], ink); // flag ink
  ellipse(cv, c - 16, c + 66, 60, 48, ink);                     // head ink
  capsule(cv, c + 30, c + 58, c + 30, c - 102, 18, '#B79BFF');  // stem
  poly(cv, [[c + 30, c - 102], [c + 92, c - 66], [c + 82, c - 24], [c + 30, c - 48]], '#B79BFF', 1, '#8257EA'); // flag
  ellipse(cv, c - 16, c + 66, 50, 38, '#B79BFF', 1);            // head
  ellipse(cv, c - 34, c + 54, 16, 11, '#E7DCFF', 0.7);         // head sheen
  savePNG(path.join(UI, 'emote_note.png'), W, W, down2(cv, W, W));
}

// emote_question.png — question mark (curiosity)
{
  const W = 128, cv = C(W * 2, W * 2), c = W;
  const ink = '#274A5E', body = '#8ED0FF';
  const ax = c, ay = c - 44, R = 56, a0 = -Math.PI * 1.05, a1 = Math.PI * 0.33;
  const ex = ax + Math.cos(a1) * R, ey = ay + Math.sin(a1) * R;
  arcStroke(cv, ax, ay, R, 52, a0, a1, ink);                    // hook ink
  capsule(cv, ex, ey, c - 4, c + 34, 50, ink);                  // tail ink
  ellipse(cv, c, c + 94, 30, 30, ink);                          // dot ink
  arcStroke(cv, ax, ay, R, 36, a0, a1, body);                   // hook
  capsule(cv, ex, ey, c - 4, c + 34, 34, body);                 // tail
  ellipse(cv, c, c + 94, 20, 20, body);                         // dot
  ellipse(cv, c - 22, c - 66, 12, 12, '#E7F4FF', 0.7);         // glint
  savePNG(path.join(UI, 'emote_question.png'), W, W, down2(cv, W, W));
}

// emote_thought.png — small thought bubble with three dots (pondering)
{
  const W = 128, cv = C(W * 2, W * 2), c = W;
  const cloud = [[-58, -26, 50, 42], [-4, -50, 60, 50], [58, -22, 48, 40], [30, 26, 46, 38], [-38, 24, 44, 36], [8, 0, 66, 50]];
  for (const [dx, dy, rx, ry] of cloud) ellipse(cv, c + dx, c + dy - 6, rx + 7, ry + 7, '#B7ADC9'); // ink
  for (const [dx, dy, rx, ry] of cloud) ellipse(cv, c + dx, c + dy - 6, rx, ry, '#FFFFFF', 1, 3);
  for (const dx of [-40, 0, 40]) ellipse(cv, c + dx, c - 8, 12, 12, '#8A7FB0');                     // three dots
  ellipse(cv, c - 62, c + 74, 22, 18, '#B7ADC9'); ellipse(cv, c - 62, c + 74, 15, 12, '#FFFFFF', 1, 2); // trailing
  ellipse(cv, c - 92, c + 108, 14, 12, '#B7ADC9'); ellipse(cv, c - 92, c + 108, 8, 7, '#FFFFFF');
  savePNG(path.join(UI, 'emote_thought.png'), W, W, down2(cv, W, W));
}

// emote_tear.png — a single teardrop (sadness)
{
  const W = 128, cv = C(W * 2, W * 2), c = W;
  const cx = c, by = c + 54, r = 64;
  ellipse(cv, cx + 2, by + 2, r + 7, r + 7, '#274A5E');                          // ink bottom
  tri(cv, [cx - r - 5, by - 26], [cx + r + 5, by - 26], [cx, c - 118], '#274A5E'); // ink point
  ellipse(cv, cx, by, r, r, '#4FA8E8');                                          // body bottom
  tri(cv, [cx - r + 2, by - 28], [cx + r - 2, by - 28], [cx, c - 108], '#5AB0EE'); // body point
  ellipse(cv, cx, by - 8, r - 8, r - 8, '#7EC7F5', 0.6, 30);                     // top-lit sheen
  ellipse(cv, cx - 22, by - 20, 18, 24, '#DCF0FF', 0.7, 14);                     // specular
  ellipse(cv, cx - 12, c - 40, 8, 14, '#EAF6FF', 0.6, 6);                        // upper glint
  savePNG(path.join(UI, 'emote_tear.png'), W, W, down2(cv, W, W));
}

// emote_fog.png — drifting mist bands (unease / confusion)
{
  const W = 128, cv = C(W * 2, W * 2), c = W;
  const bands = [
    [c - 78, c - 62, c + 62, 32, '#D4CEE4'],
    [c - 92, c - 16, c + 82, 34, '#BDB4D2'],
    [c - 70, c + 30, c + 88, 32, '#CFC8E0'],
    [c - 60, c + 74, c + 54, 28, '#B0A7C6'],
  ];
  for (const [x0, y, x1, th] of bands) capsule(cv, x0, y, x1, y, th + 12, '#8E86AD', 0.35);        // soft under-halo
  for (const [x0, y, x1, th, col] of bands) capsule(cv, x0, y, x1, y, th, col, 0.95);              // band
  for (const [x0, y, x1, th] of bands) capsule(cv, x0 + 14, y - th * 0.24, x1 - 14, y - th * 0.24, th * 0.32, '#F1ECFC', 0.5); // top sheen
  savePNG(path.join(UI, 'emote_fog.png'), W, W, down2(cv, W, W));
}

// emote_eye.png — a watching eye with a crimson iris (dread)
{
  const W = 128, cv = C(W * 2, W * 2), c = W;
  const [ir, ig, ib] = hex('#241B33');
  const [wr, wg, wb] = hex('#F3EEF7');
  // almond = intersection of two large circles offset above/below center
  const almond = (off, rad, xs, cr, cg, cb, bx, byy) => {
    for (let y = ~~(c - byy); y <= ~~(c + byy); y++)
      for (let x = ~~(c - bx); x <= ~~(c + bx); x++) {
        const dT = Math.hypot((x + 0.5 - c) * xs, y + 0.5 - (c + off)) - rad;
        const dB = Math.hypot((x + 0.5 - c) * xs, y + 0.5 - (c - off)) - rad;
        const a = Math.max(0, Math.min(1, 0.5 - dT)) * Math.max(0, Math.min(1, 0.5 - dB));
        if (a > 0) blend(cv, x, y, cr, cg, cb, a);
      }
  };
  almond(60, 116, 0.70, ir, ig, ib, 124, 66);       // ink almond (eyelid rim)
  almond(56, 108, 0.72, wr, wg, wb, 118, 60);       // white sclera
  ellipse(cv, c, c, 50, 50, '#7A1F33');             // crimson iris ring
  ellipse(cv, c, c, 38, 38, '#B0324A', 1, 6);       // iris
  ellipse(cv, c, c, 21, 21, '#0E0714');             // pupil
  ellipse(cv, c - 13, c - 13, 10, 10, '#FFFFFF', 0.85); // catchlight
  savePNG(path.join(UI, 'emote_eye.png'), W, W, down2(cv, W, W));
}

// emote_void.png — a small dark void with a crimson ring (dread)
{
  const W = 128, cv = C(W * 2, W * 2), c = W;
  ellipse(cv, c, c, 116, 116, '#8B2A3A', 0.20, 60);   // faint crimson aura
  ellipse(cv, c, c, 100, 100, '#2A1830');             // rim
  ellipse(cv, c, c, 90, 90, '#8B2A3A', 0.9, 5);       // crimson ring
  ellipse(cv, c, c, 82, 82, '#120A1E');               // void mouth
  ellipse(cv, c, c, 60, 60, '#000000', 0.95, 22);     // pulling depth
  ellipse(cv, c - 18, c - 18, 26, 26, '#3A1220', 0.5, 20); // faint inner crimson swirl
  savePNG(path.join(UI, 'emote_void.png'), W, W, down2(cv, W, W));
}

// emote_candle.png — a lit taper (reverence)
{
  const W = 128, cv = C(W * 2, W * 2), c = W;
  ellipse(cv, c, c - 44, 72, 92, '#FFE9A0', 0.22, 66);          // flame glow
  ellipse(cv, c, c + 118, 52, 14, '#3A2E52', 0.25, 12);         // base contact shadow
  roundRect(cv, c + 2, c + 58, 26, 66, 11, '#8A5A22', 0.30);    // body shadow
  roundRect(cv, c, c + 54, 28, 66, 11, '#F0E7D9', 1, '#D8C6A6'); // wax body
  capsule(cv, c - 14, c - 2, c - 14, c + 108, 6, '#FFFFFF', 0.5); // wax highlight
  roundRect(cv, c, c - 12, 30, 8, 6, '#E4D4B4', 1, '#F4ECDC');   // melted rim/top
  capsule(cv, c, c - 8, c, c - 24, 5, '#3A2E52');               // wick
  flameLobe(cv, c, c - 112, c - 6, 38, '#E8511D');              // flame outer
  flameLobe(cv, c, c - 100, c - 8, 29, '#FF7A28');              // mid
  flameLobe(cv, c - 2, c - 84, c - 10, 19, '#FFB23E');          // inner
  flameLobe(cv, c - 3, c - 64, c - 14, 10, '#FFE08A');          // hot core
  ellipse(cv, c - 12, c - 76, 5, 8, '#FFF6D8', 0.7, 4);         // flame glint
  savePNG(path.join(UI, 'emote_candle.png'), W, W, down2(cv, W, W));
}

// emote_pale_heart.png — a faded mauve heart (serene grief, Phase 5)
{
  const W = 128, cv = C(W * 2, W * 2), c = W;
  poly(cv, heartPts(c + 4, c + 12, 6.0), '#5B4F72', 0.24);       // soft shadow
  poly(cv, heartPts(c, c, 6.2), '#6B5F86');                       // muted outline
  poly(cv, heartPts(c, c - 2, 5.7), '#C9A7E8', 1, '#A98BFF');     // pale mauve body
  poly(cv, heartPts(c, c - 6, 3.3), '#E3D2F4', 0.5);            // inner bloom
  ellipse(cv, c - 34, c - 30, 15, 19, '#F0E6FA', 0.7, 10);       // soft sheen
  savePNG(path.join(UI, 'emote_pale_heart.png'), W, W, down2(cv, W, W));
}

// emote_sleep.png — three ascending Z's (drowsy / at rest)
{
  const W = 128, cv = C(W * 2, W * 2), c = W;
  const zs = [[c - 46, c + 62, 56, '#4FA8E8'], [c + 6, c + 6, 78, '#5AB0EE'], [c + 66, c - 66, 102, '#7EC7F5']];
  for (const [x, y, s] of zs) drawZ(cv, x, y, s, s * 0.34, '#274A5E');  // ink
  for (const [x, y, s, body] of zs) drawZ(cv, x, y, s, s * 0.24, body); // body
  savePNG(path.join(UI, 'emote_sleep.png'), W, W, down2(cv, W, W));
}

// ------------------------- Phase-mood icons (256 sq) -------------------------

// thought.png — a soft dreamy cloud-puff (curious/pondering atmosphere)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const puffs = [[-118, -30, 96, 78], [-16, -96, 118, 96], [116, -34, 92, 76], [64, 54, 88, 72], [-78, 52, 84, 68], [12, 6, 128, 96]];
  for (const [dx, dy, rx, ry] of puffs) ellipse(cv, c + dx, c + dy + 8, rx + 12, ry + 12, '#B7ADC9'); // soft ink
  for (const [dx, dy, rx, ry] of puffs) ellipse(cv, c + dx, c + dy, rx, ry, '#FBFAFE', 1, 6);          // white body
  ellipse(cv, c - 40, c - 70, 70, 50, '#FFFFFF', 0.6, 40);                                             // top sheen
  ellipse(cv, c + 40, c + 34, 96, 70, '#EDE9F6', 0.5, 40);                                             // lavender underside
  savePNG(path.join(UI, 'thought.png'), W, W, down2(cv, W, W));
}

// void.png — a dark disc with a faint crimson rim (dread; distinct from blind)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  ellipse(cv, c, c, 230, 230, '#8B2A3A', 0.16, 90);   // faint crimson aura
  ellipse(cv, c, c, 196, 196, '#2A1428');             // outer rim
  ellipse(cv, c, c, 180, 180, '#8B2A3A', 0.85, 6);    // crimson rim ring
  ellipse(cv, c, c, 168, 168, '#160A1E');             // void body
  ellipse(cv, c, c, 120, 120, '#050208', 0.95, 40);   // pulling depth
  ellipse(cv, c, c, 60, 60, '#000000', 1, 30);        // absolute dark core
  ellipse(cv, c - 40, c - 40, 54, 54, '#3A1020', 0.4, 40); // faint inner crimson swirl
  savePNG(path.join(UI, 'void.png'), W, W, down2(cv, W, W));
}

// dove.png — a pale serene bird in flight (peace; house-completion crest)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const ink = '#B0A6C4', pale = '#FBFAFE', paleLo = '#E7DEF2', wing = '#F1EAF9';
  ellipse(cv, c, c, 214, 172, '#EAE2F4', 0.22, 90);                          // serene aura
  poly(cv, [[c - 64, c + 26], [c - 202, c - 12], [c - 150, c + 30], [c - 196, c + 74], [c - 74, c + 76]], ink); // tail ink
  poly(cv, [[c - 34, c - 4], [c - 104, c - 168], [c + 10, c - 124], [c + 70, c - 20]], ink);                    // wing ink
  ellipse(cv, c - 6, c + 22, 112, 70, ink);                                  // body ink
  ellipse(cv, c + 82, c - 38, 52, 50, ink);                                  // head ink
  poly(cv, [[c - 66, c + 30], [c - 190, c - 4], [c - 144, c + 32], [c - 184, c + 68], [c - 72, c + 70]], paleLo); // tail
  poly(cv, [[c - 30, c - 6], [c - 94, c - 158], [c + 8, c - 116], [c + 62, c - 22]], wing);                       // wing
  ellipse(cv, c - 6, c + 20, 104, 62, pale, 1, paleLo);                      // body
  ellipse(cv, c + 80, c - 38, 44, 42, pale, 1, paleLo);                      // head
  tri(cv, [c + 116, c - 44], [c + 168, c - 32], [c + 116, c - 18], '#F5B82E'); // beak
  ellipse(cv, c + 96, c - 46, 9, 9, '#5B4F72');                              // eye
  capsule(cv, c - 34, c - 60, c + 2, c - 96, 9, '#DCCFEC', 0.8);            // wing feather line
  capsule(cv, c - 12, c - 30, c + 20, c - 70, 9, '#DCCFEC', 0.7);           // wing feather line
  ellipse(cv, c - 30, c + 2, 40, 26, '#FFFFFF', 0.5, 26);                    // breast sheen
  savePNG(path.join(UI, 'dove.png'), W, W, down2(cv, W, W));
}

// candle.png — a lit taper (sacrifice altar; reuses the flameLobe helper)
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  ellipse(cv, c, c - 74, 150, 190, '#FFE9A0', 0.24, 120);        // flame glow
  ellipse(cv, c, c + 236, 96, 26, '#3A2E52', 0.22, 20);          // base contact shadow
  roundRect(cv, c + 4, c + 116, 50, 128, 18, '#8A5A22', 0.28);   // body shadow
  roundRect(cv, c, c + 110, 52, 128, 18, '#F0E7D9', 1, '#D6C4A2'); // wax taper
  roundRect(cv, c, c - 18, 56, 14, 12, '#E4D4B4', 1, '#F4ECDC');  // melted rim/top
  capsule(cv, c - 26, c + 4, c - 26, c + 210, 11, '#FFFFFF', 0.5); // wax highlight
  capsule(cv, c + 30, c + 40, c + 24, c + 200, 12, '#D6C4A2', 0.6); // side wax drip shade
  capsule(cv, c, c - 12, c, c - 44, 8, '#3A2E52');               // wick
  flameLobe(cv, c, c - 224, c - 8, 74, '#E8511D');               // flame outer
  flameLobe(cv, c, c - 202, c - 12, 58, '#FF7A28');              // mid
  flameLobe(cv, c - 4, c - 168, c - 18, 40, '#FFB23E');          // inner
  flameLobe(cv, c - 6, c - 126, c - 26, 22, '#FFE08A');          // hot core
  ellipse(cv, c - 24, c - 150, 11, 18, '#FFF6D8', 0.7, 8);       // flame glint
  savePNG(path.join(UI, 'candle.png'), W, W, down2(cv, W, W));
}
