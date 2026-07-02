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

// === journal.png (256) — book for the journal hub ============================
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  roundRect(cv, c, c + 14, 150, 168, 22, '#2A2040', 0.4);                  // drop shadow
  roundRect(cv, c - 6, c, 150, 168, 20, '#A98BFF', 1, '#8257EA');          // cover
  roundRect(cv, c + 118, c, 26, 168, 10, '#6B3FD0');                       // spine edge
  roundRect(cv, c - 24, c, 116, 150, 12, '#FFFFFF', 1, '#F0EBFC');         // pages
  for (const dy of [-86, -38, 10, 58]) {                                   // page lines
    roundRect(cv, c - 24, c + dy, 86, 8, 4, '#B9A8E4');
  }
  roundRect(cv, c - 96, c - 112, 24, 36, 8, '#FFD968', 1, '#F5B82E');      // bookmark
  roundRect(cv, c - 6, c - 152, 150, 16, 8, '#FFFFFF', 0.4);               // top sheen
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
