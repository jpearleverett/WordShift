// World/UI art generator: shadow figure, clouds, ground, roof, foundation,
// tree, star + amber icons, and the Play Store feature graphic.
// Pure Node (zlib only), supersampled 2x for anti-aliasing.
// Run: node scripts/tools/generateWorldArt.mjs
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';

// --- PNG writer -------------------------------------------------------------
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

// --- float canvas -----------------------------------------------------------
const C = (w, h) => ({ w, h, px: new Float64Array(w * h * 4) });
const hex = c => [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];
function blend(cv, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h || a <= 0) return;
  const i = (y * cv.w + x) * 4, ia = 1 - a;
  cv.px[i] = r * a + cv.px[i] * ia; cv.px[i + 1] = g * a + cv.px[i + 1] * ia;
  cv.px[i + 2] = b * a + cv.px[i + 2] * ia; cv.px[i + 3] = a + cv.px[i + 3] * ia;
}
function ellipse(cv, cx, cy, rx, ry, color, alpha = 1, soft = 1.5) {
  const [r, g, b] = hex(color);
  for (let y = Math.max(0, ~~(cy - ry - soft - 1)); y <= Math.min(cv.h - 1, ~~(cy + ry + soft + 1)); y++)
    for (let x = Math.max(0, ~~(cx - rx - soft - 1)); x <= Math.min(cv.w - 1, ~~(cx + rx + soft + 1)); x++) {
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      const a = Math.max(0, Math.min(1, (1 - d) * (rx / soft)));
      if (a > 0) blend(cv, x, y, r, g, b, Math.min(1, a) * alpha);
    }
}
function gauss(cv, cx, cy, rx, ry, color, alphaMax) {
  const [r, g, b] = hex(color);
  for (let y = Math.max(0, ~~(cy - ry * 2.2)); y <= Math.min(cv.h - 1, ~~(cy + ry * 2.2)); y++)
    for (let x = Math.max(0, ~~(cx - rx * 2.2)); x <= Math.min(cv.w - 1, ~~(cx + rx * 2.2)); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      const a = Math.exp(-(dx * dx + dy * dy) * 1.8) * alphaMax;
      if (a > 0.004) blend(cv, x, y, r, g, b, a);
    }
}
function rect(cv, x0, y0, x1, y1, color, alpha = 1, gradTo = null) {
  const [r, g, b] = hex(color); const grad = gradTo ? hex(gradTo) : null;
  for (let y = Math.max(0, ~~y0); y <= Math.min(cv.h - 1, ~~y1); y++) {
    const t = (y - y0) / Math.max(1, y1 - y0);
    const rr = grad ? r + (grad[0] - r) * t : r, gg = grad ? g + (grad[1] - g) * t : g, bb = grad ? b + (grad[2] - b) * t : b;
    for (let x = Math.max(0, ~~x0); x <= Math.min(cv.w - 1, ~~x1); x++) blend(cv, x, y, rr, gg, bb, alpha);
  }
}
function triangle(cv, ax, ay, bx, by, cxx, cyy, color, alpha = 1, gradTo = null) {
  const [r, g, b] = hex(color); const grad = gradTo ? hex(gradTo) : null;
  const minX = ~~Math.min(ax, bx, cxx), maxX = Math.ceil(Math.max(ax, bx, cxx));
  const minY = ~~Math.min(ay, by, cyy), maxY = Math.ceil(Math.max(ay, by, cyy));
  const edge = (x1, y1, x2, y2, px, py) => (px - x1) * (y2 - y1) - (py - y1) * (x2 - x1);
  const area = edge(ax, ay, bx, by, cxx, cyy);
  for (let y = Math.max(0, minY); y <= Math.min(cv.h - 1, maxY); y++) {
    const t = (y - minY) / Math.max(1, maxY - minY);
    const rr = grad ? r + (grad[0] - r) * t : r, gg = grad ? g + (grad[1] - g) * t : g, bb = grad ? b + (grad[2] - b) * t : b;
    for (let x = Math.max(0, minX); x <= Math.min(cv.w - 1, maxX); x++) {
      const w0 = edge(ax, ay, bx, by, x + 0.5, y + 0.5) / area;
      const w1 = edge(bx, by, cxx, cyy, x + 0.5, y + 0.5) / area;
      const w2 = edge(cxx, cyy, ax, ay, x + 0.5, y + 0.5) / area;
      if (w0 >= 0 && w1 >= 0 && w2 >= 0) blend(cv, x, y, rr, gg, bb, alpha);
    }
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
function polygon(cv, pts, color, alpha = 1) {
  const [r, g, b] = hex(color);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = ~~Math.min(...xs), maxX = Math.ceil(Math.max(...xs));
  const minY = ~~Math.min(...ys), maxY = Math.ceil(Math.max(...ys));
  for (let y = Math.max(0, minY); y <= Math.min(cv.h - 1, maxY); y++)
    for (let x = Math.max(0, minX); x <= Math.min(cv.w - 1, maxX); x++) {
      // 2x2 supersample point-in-polygon for AA
      let hit = 0;
      for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]]) {
        const px = x + ox, py = y + oy;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          if (((pts[i][1] > py) !== (pts[j][1] > py)) &&
            px < ((pts[j][0] - pts[i][0]) * (py - pts[i][1])) / (pts[j][1] - pts[i][1]) + pts[i][0]) inside = !inside;
        }
        if (inside) hit++;
      }
      if (hit > 0) blend(cv, x, y, r, g, b, (hit / 4) * alpha);
    }
}
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
const ENV = path.resolve(import.meta.dirname, '../../assets/environment');
const UI = path.resolve(import.meta.dirname, '../../assets/ui');
fs.mkdirSync(UI, { recursive: true });
fs.mkdirSync(ENV, { recursive: true });
const seeded = (s => () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)(42);

// === 1. shadow_figure.png — the unnamed entity (600x1200) ===================
{
  const W = 600, H = 1200, cv = C(W * 2, H * 2);
  const cx = W, headY = H * 0.36;
  // towering body: dense stacked soft blobs, widening downward, dissolving at base
  for (let i = 0; i < 90; i++) {
    const t = i / 89;
    gauss(cv, cx + Math.sin(t * 4.2) * 10, headY + 60 + t * H * 1.5, 170 + t * 230, 90, '#070310', 0.34 * (1 - t * 0.75));
  }
  // shoulders + hood
  gauss(cv, cx, headY + 150, 250, 170, '#070310', 0.62);
  gauss(cv, cx, headY, 150, 180, '#05020C', 0.78);
  gauss(cv, cx, headY - 60, 118, 110, '#05020C', 0.66);
  // faint violet rim-light on the hood (reads against dark skies)
  ellipse(cv, cx, headY - 95, 118, 60, '#3A2A55', 0.10, 40);
  // crimson eyes: small hot cores inside wide soft glows
  for (const ex of [cx - 52, cx + 52]) {
    gauss(cv, ex, headY - 10, 46, 30, '#8C1530', 0.30);
    gauss(cv, ex, headY - 10, 18, 11, '#E0244A', 0.85);
    gauss(cv, ex, headY - 10, 7, 5, '#FF7080', 0.95);
  }
  savePNG(path.join(ENV, 'shadow_figure.png'), W, H, down2(cv, W, H));
}

// === 2. clouds (512x256, two variants) =======================================
for (const [name, puffs] of [
  ['cloud_1.png', [[0.32, 0.62, 0.20], [0.5, 0.48, 0.26], [0.68, 0.60, 0.21], [0.82, 0.68, 0.13], [0.18, 0.70, 0.13]]],
  ['cloud_2.png', [[0.25, 0.60, 0.16], [0.42, 0.50, 0.22], [0.62, 0.55, 0.24], [0.80, 0.62, 0.15]]],
]) {
  const W = 512, H = 256, cv = C(W * 2, H * 2);
  for (const [fx, fy, fr] of puffs) gauss(cv, W * 2 * fx, H * 2 * fy + 18, W * 2 * fr, W * 2 * fr * 0.62, '#E8E4F2', 0.5); // soft lavender under-shadow
  for (const [fx, fy, fr] of puffs) gauss(cv, W * 2 * fx, H * 2 * fy, W * 2 * fr, W * 2 * fr * 0.66, '#FFFFFF', 0.92);
  savePNG(path.join(ENV, name), W, H, down2(cv, W, H));
}

// === 3. ground.png — grassy hill strip (1024x300) ============================
{
  const W = 1024, H = 300, cv = C(W * 2, H * 2);
  // gently curved top edge
  for (let x = 0; x < cv.w; x++) {
    const top = 70 + Math.sin((x / cv.w) * Math.PI) * -28 + Math.sin(x * 0.011) * 6;
    rect(cv, x, top, x, cv.h, '#7BC86C', 1, '#4E9A52');
    rect(cv, x, top, x, top + 14, '#92DA80', 0.9); // sunlit lip
  }
  // scattered grass tufts + flowers (candy palette)
  for (let i = 0; i < 90; i++) {
    const x = seeded() * cv.w, y = 120 + seeded() * (cv.h - 160);
    ellipse(cv, x, y, 9 + seeded() * 12, 4 + seeded() * 5, seeded() < 0.5 ? '#5FAE5C' : '#8FD97E', 0.5, 6);
  }
  for (let i = 0; i < 22; i++) {
    const x = seeded() * cv.w, y = 150 + seeded() * (cv.h - 220);
    const col = ['#FF8FB8', '#FFD166', '#A78BFA', '#FFFFFF'][~~(seeded() * 4)];
    ellipse(cv, x, y, 7, 7, col, 0.95, 3);
    ellipse(cv, x, y, 3, 3, '#FFE9A8', 1, 2);
  }
  savePNG(path.join(ENV, 'ground.png'), W, H, down2(cv, W, H));
}

// === 4. roof.png — gabled candy roof with chimney (1024x420) =================
{
  const W = 1024, H = 420, cv = C(W * 2, H * 2);
  const w = cv.w, h = cv.h, peakX = w / 2, peakY = 36, baseY = h - 60;
  // chimney seated on the left slope (drawn first so the gable buries its base)
  const chimX = w * 0.30;
  roundRect(cv, chimX, peakY + 230, 52, 190, 14, '#9A6B8F', 1, '#7A4E72');
  roundRect(cv, chimX, peakY + 130, 66, 26, 10, '#B58AA8');
  // main gable
  triangle(cv, peakX, peakY, -40, baseY, w + 40, baseY, '#B0568A', 1, '#8A3E6E');
  // shingle scallops, row by row (overlapping, clipped by the slope)
  for (let row = 0; row < 7; row++) {
    const y = peakY + 90 + row * 92;
    const halfWidth = ((y - peakY) / (baseY - peakY)) * (w / 2 + 40);
    const shade = row % 2 ? '#A04C7E' : '#AA5284';
    for (let x = peakX - halfWidth - 60; x < peakX + halfWidth + 60; x += 66) {
      const slopeLimit = ((y - 26 - peakY) / (baseY - peakY)) * (w / 2 + 40);
      if (Math.abs(x - peakX) > slopeLimit + 50) continue;
      ellipse(cv, x + (row % 2 ? 33 : 0), y, 44, 30, shade, 1, 4);
    }
  }
  // ridge highlight + eaves board
  triangle(cv, peakX, peakY, peakX - 130, peakY + 170, peakX + 130, peakY + 170, '#D77FAE', 0.45);
  rect(cv, -40, baseY, w + 40, baseY + 44, '#7A3560', 1, '#5E2849');
  rect(cv, -40, baseY, w + 40, baseY + 10, '#C66FA0', 0.8);
  savePNG(path.join(ENV, 'roof.png'), W, H, down2(cv, W, H));
}

// === 5. foundation.png — stone base strip (1024x160) =========================
{
  const W = 1024, H = 160, cv = C(W * 2, H * 2);
  rect(cv, 0, 16, cv.w, cv.h, '#8D86A8', 1, '#6B6488');
  rect(cv, 0, 16, cv.w, 30, '#A8A2C2', 0.9);
  // staggered stones
  for (let row = 0; row < 3; row++) {
    for (let x = (row % 2) * 70; x < cv.w; x += 140) {
      roundRect(cv, x + 60, 70 + row * 84, 58, 32, 14, row % 2 ? '#9C95B5' : '#948DAD', 0.9);
      roundRect(cv, x + 60, 62 + row * 84, 54, 12, 8, '#B5AECB', 0.35);
    }
  }
  savePNG(path.join(ENV, 'foundation.png'), W, H, down2(cv, W, H));
}

// === 6. tree.png — round candy tree (480x640) ================================
{
  const W = 480, H = 640, cv = C(W * 2, H * 2);
  const cx = W;
  roundRect(cv, cx, H * 2 - 170, 34, 150, 16, '#9C6B4F', 1, '#7A4E36'); // trunk
  triangle(cv, cx - 80, H * 2 - 40, cx + 80, H * 2 - 40, cx, H * 2 - 130, '#7A4E36', 0.5); // root flare
  for (const [fx, fy, fr, col] of [
    [0, -0.62, 0.62, '#5FB75D'], [-0.5, -0.42, 0.46, '#54A854'], [0.5, -0.42, 0.46, '#54A854'],
    [-0.28, -0.74, 0.4, '#6FC668'], [0.28, -0.74, 0.4, '#6FC668'],
  ]) gauss(cv, cx + fx * 300, H * 2 + fy * H * 2 * 0.5, fr * 300, fr * 280, col, 1);
  for (let i = 0; i < 12; i++) { // glints + blossoms
    const a = seeded() * Math.PI * 2, d = seeded() * 250;
    ellipse(cv, cx + Math.cos(a) * d, H * 2 * 0.42 + Math.sin(a) * d * 0.6, 9, 9, seeded() < 0.4 ? '#FF8FB8' : '#A8E89C', 0.85, 4);
  }
  savePNG(path.join(ENV, 'tree.png'), W, H, down2(cv, W, H));
}

// === 7. star icons (256x256) =================================================
function starPts(cx, cy, rOut, rIn, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? rIn : rOut, a = rot + (i * Math.PI) / 5;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  polygon(cv, starPts(c, c + 10, 116, 50), '#B8860B', 0.5);           // soft drop shadow
  polygon(cv, starPts(c, c, 116, 50), '#E8A410');                      // outline body
  polygon(cv, starPts(c, c, 102, 44), '#FFD34E');                      // fill
  polygon(cv, starPts(c, c - 8, 84, 36), '#FFE588', 0.85);             // top light
  ellipse(cv, c - 34, c - 40, 14, 14, '#FFF6CC', 0.95, 6);             // sparkle
  savePNG(path.join(UI, 'star_filled.png'), W, W, down2(cv, W, W));
}
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  polygon(cv, starPts(c, c, 116, 50), '#9A93AE', 0.9);
  polygon(cv, starPts(c, c, 98, 42), '#D8D4E4');
  polygon(cv, starPts(c, c - 6, 80, 34), '#EAE7F2', 0.8);
  savePNG(path.join(UI, 'star_empty.png'), W, W, down2(cv, W, W));
}

// === 8. amber gem icon (256x256) =============================================
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  const pts = [];
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 3; pts.push([c + Math.cos(a) * 112, c + Math.sin(a) * 112]); }
  polygon(cv, pts.map(([x, y]) => [x, y + 10]), '#8A5A00', 0.45);
  polygon(cv, pts, '#E8920A');
  const inner = pts.map(([x, y]) => [c + (x - c) * 0.82, c + (y - c) * 0.82]);
  polygon(cv, inner, '#FFB938');
  triangle(cv, c, c - 92, c - 80, c - 46, c + 80, c - 46, '#FFD97A', 0.9);  // top facet
  triangle(cv, c - 80, c - 46, c, c + 92, c, c - 10, '#F0A722', 0.8);       // left facet
  ellipse(cv, c + 30, c + 18, 16, 24, '#7A4E0A', 0.5, 8);                    // the trapped fleck
  ellipse(cv, c - 38, c - 52, 13, 13, '#FFF2CC', 0.95, 6);
  savePNG(path.join(UI, 'amber.png'), W, W, down2(cv, W, W));
}

// === 9. feature graphic (1024x500, opaque) ===================================
{
  const W = 1024, H = 500, cv = C(W * 2, H * 2);
  rect(cv, 0, 0, cv.w, cv.h, '#7C8BF0', 1, '#4E58B8');
  gauss(cv, cv.w * 0.32, cv.h * 0.3, 700, 500, '#FFFFFF', 0.10);
  // scattered floating tiles, deliberately echoing the icon
  const tiles = [
    [0.18, 0.46, 150, '#FF8FB8', '#E84B8A', 'W'], [0.38, 0.34, 110, '#5EEAD4', '#14B8A6', null],
    [0.55, 0.56, 130, '#FFE08A', '#F0B429', null], [0.74, 0.36, 150, '#A78BFA', '#7C5CD6', null],
    [0.88, 0.62, 100, '#FF8FB8', '#E84B8A', null],
  ];
  for (const [fx, fy, s, c1, c2, glyph] of tiles) {
    const cx = cv.w * fx, cy = cv.h * fy;
    roundRect(cv, cx, cy + s * 0.07, s, s, s * 0.22, '#1A1A2E', 0.25);
    roundRect(cv, cx, cy, s, s, s * 0.22, c1, 1, c2);
    roundRect(cv, cx, cy - s * 0.58, s * 0.86, s * 0.3, s * 0.14, '#FFFFFF', 0.3);
    if (glyph === 'W') {
      const wT = cy - s * 0.34, wB = cy + s * 0.42, wH = s * 0.56;
      const segs = [[cx - wH, wT, cx - wH * 0.5, wB], [cx - wH * 0.5, wB, cx, wT + s * 0.2], [cx, wT + s * 0.2, cx + wH * 0.5, wB], [cx + wH * 0.5, wB, cx + wH, wT]];
      for (const [ax, ay, bx, by] of segs) {
        const steps = 40;
        for (let i = 0; i <= steps; i++) ellipse(cv, ax + ((bx - ax) * i) / steps, ay + ((by - ay) * i) / steps, s * 0.085, s * 0.085, '#FFFFFF', 1, 3);
      }
    }
  }
  // faint shadow-figure silhouette on the right edge — the hook, barely there
  gauss(cv, cv.w * 0.94, cv.h * 0.5, 160, 420, '#0A0518', 0.35);
  for (const ex of [cv.w * 0.94 - 26, cv.w * 0.94 + 26]) gauss(cv, ex, cv.h * 0.34, 12, 8, '#E0244A', 0.7);
  // sparkles
  for (let i = 0; i < 26; i++) ellipse(cv, seeded() * cv.w, seeded() * cv.h, 4 + seeded() * 6, 4 + seeded() * 6, '#FFFFFF', 0.5 + seeded() * 0.4, 3);
  savePNG(path.resolve(import.meta.dirname, '../../../docs/feature-graphic.png'), W, H, down2(cv, W, H));
}
