// Candy-style UI icon sprites: flame (streak), journal book, pit mouth.
// Matches the star/amber set in assets/ui (smooth, supersampled 2x).
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
  roundRect(cv, c, c + 14, 150, 168, 22, '#5B4890', 0.45);                 // drop shadow
  roundRect(cv, c - 6, c, 150, 168, 20, '#8B5CF6', 1, '#6D3FD4');          // cover
  roundRect(cv, c + 118, c, 26, 168, 10, '#5B2DB8');                       // spine edge
  roundRect(cv, c - 24, c, 116, 150, 12, '#F7F3FF', 1, '#E4DCF7');         // pages
  for (const dy of [-86, -38, 10, 58]) {                                   // page lines
    roundRect(cv, c - 24, c + dy, 86, 7, 3, '#C9BCE8');
  }
  roundRect(cv, c - 96, c - 110, 22, 34, 8, '#FFD166', 1, '#F0B429');      // bookmark
  roundRect(cv, c - 6, c - 152, 150, 16, 8, '#FFFFFF', 0.28);              // top sheen
  savePNG(path.join(UI, 'journal.png'), W, W, down2(cv, W, W));
}

// === pit.png (256) — the Offering Pit mouth ==================================
{
  const W = 256, cv = C(W * 2, W * 2), c = W;
  ellipse(cv, c, c + 60, 190, 86, '#736C8E');                    // outer stone rim
  ellipse(cv, c, c + 48, 178, 78, '#9C95B5');                    // rim top light
  for (let a = 0; a < 12; a++) {                                  // chunky rim stones
    const ang = (a / 12) * Math.PI * 2;
    const x = c + Math.cos(ang) * 160, y = c + 52 + Math.sin(ang) * 66;
    ellipse(cv, x, y, 30, 20, a % 2 ? '#B5AECB' : '#8D86A8');
  }
  ellipse(cv, c, c + 52, 138, 56, '#1E1240');                    // mouth
  ellipse(cv, c, c + 58, 116, 44, '#120A24');                    // depths
  ellipse(cv, c, c + 36, 110, 26, '#3FD9C0', 0.5, 30);           // teal glow
  ellipse(cv, c, c + 30, 70, 14, '#7FF2DE', 0.65, 18);
  for (const [dx, dy, r] of [[-44, -60, 9], [10, -110, 11], [52, -40, 8], [-12, -160, 7]]) {
    ellipse(cv, c + dx, c + dy, r, r, '#3FD9C0', 0.9, 4);        // rising motes
  }
  savePNG(path.join(UI, 'pit.png'), W, W, down2(cv, W, W));
}
