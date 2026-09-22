// World/UI art generator: shadow figure, clouds, ground, roof, foundation,
// tree, star + amber icons. The Play Store feature graphic is built elsewhere.
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

// Block 2 (cloud_1.png / cloud_2.png) is deleted: the clouds are drawn in
// code and nothing requires either file, so regenerating them only shipped
// dead weight inside the bundled assets/environment directory.

// Blocks 3-6 (ground.png, roof.png, foundation.png, tree.png) are DELETED, not
// disabled. They were destructive: `npm run generate:assets` overwrote the
// hand-processed painted roof (792x283, 281 KB, from processRawWorldArt.mjs)
// with a 1024x420 procedural candy roof, and re-created ground/tree/foundation,
// three files deleted for bundle hygiene, inside the bundled assets/environment
// directory. The house art has not come from this script for a long time: see
// processRawWorldArt.mjs (roof, per-phase foundations, wall, pit entrance). Only shadow_figure.png below is still this
// script's own shipped output.

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
  polygon(cv, pts, '#FFA518');
  const inner = pts.map(([x, y]) => [c + (x - c) * 0.82, c + (y - c) * 0.82]);
  polygon(cv, inner, '#FFC84E');
  triangle(cv, c, c - 92, c - 80, c - 46, c + 80, c - 46, '#FFE9A8', 0.95); // top facet
  triangle(cv, c - 80, c - 46, c, c + 92, c, c - 10, '#FFB832', 0.85);      // left facet
  ellipse(cv, c + 30, c + 18, 16, 24, '#8A5A0A', 0.45, 8);                   // the trapped fleck
  ellipse(cv, c - 38, c - 52, 16, 16, '#FFFFFF', 0.95, 6);
  savePNG(path.join(UI, 'amber.png'), W, W, down2(cv, W, W));
}

// The Play Store feature graphic is NOT generated here any more. This script
// used to write docs/feature-graphic.png (flat gradient + candy tiles), which
// clobbered the painted launch artwork on every `npm run generate:assets`. The
// shipped 1024x500 is built by scripts/store/buildLaunch.mjs into
// assets/Play_store/launch-2026-09/upload/feature-graphic-1024x500.png and
// mirrored at docs/feature-graphic.png for the listing upload.
