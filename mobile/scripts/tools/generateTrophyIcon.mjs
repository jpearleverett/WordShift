// Chrome trophy sprite (F67): a small gold cup used by the daily leaderboard
// standing card, replacing the raw 🏆 emoji. Pure Node, dependency-free PNG
// writer (same minimal IHDR/IDAT/IEND RGBA encoder as generateUiIcons.mjs, so
// the output is Android-crunch safe). Supersampled 2x, 256x256.
// Run: node scripts/tools/generateTrophyIcon.mjs
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
function ring(cv, cx, cy, rx, ry, thick, color, alpha = 1) {
  const [r, g, b] = hex(color);
  for (let y = Math.max(0, ~~(cy - ry - 2)); y <= Math.min(cv.h - 1, ~~(cy + ry + 2)); y++)
    for (let x = Math.max(0, ~~(cx - rx - 2)); x <= Math.min(cv.w - 1, ~~(cx + rx + 2)); x++) {
      const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);
      const a = Math.max(0, Math.min(1, 1 - Math.abs(d - 1) * (rx / thick)));
      if (a > 0) blend(cv, x, y, r, g, b, a * alpha);
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

const GOLD = '#F2B33A';
const GOLD_HI = '#FFDD84';
const GOLD_LO = '#C6862A';
const OUTLINE = '#5A3A12';

function drawTrophy(cv) {
  const S = cv.w; // supersampled square
  const cx = S / 2;
  // roundRect(cv, cx, cy, halfWidth, halfHeight, cornerRadius, color[, alpha, gradTo])
  // Base plinth (outline underlay, then gold face)
  roundRect(cv, cx, S * 0.86, S * 0.20, S * 0.05, S * 0.02, OUTLINE, 1);
  roundRect(cv, cx, S * 0.855, S * 0.185, S * 0.04, S * 0.018, GOLD_LO, 1, GOLD);
  // Pedestal riser
  roundRect(cv, cx, S * 0.79, S * 0.075, S * 0.035, S * 0.015, OUTLINE, 1);
  roundRect(cv, cx, S * 0.785, S * 0.062, S * 0.028, S * 0.012, GOLD, 1, GOLD_LO);
  // Stem
  roundRect(cv, cx, S * 0.68, S * 0.05, S * 0.06, S * 0.01, OUTLINE, 1);
  roundRect(cv, cx, S * 0.68, S * 0.04, S * 0.055, S * 0.008, GOLD, 1, GOLD_LO);
  // Handles (outline ring then gold ring)
  for (const dir of [-1, 1]) {
    ring(cv, cx + dir * S * 0.30, S * 0.40, S * 0.14, S * 0.15, S * 0.10, OUTLINE, 1);
    ring(cv, cx + dir * S * 0.30, S * 0.40, S * 0.125, S * 0.135, S * 0.075, GOLD, 1);
  }
  // Cup bowl: outline underlay then gold gradient (a wide rounded box tapering
  // via a second narrower box below)
  roundRect(cv, cx, S * 0.40, S * 0.235, S * 0.20, S * 0.10, OUTLINE, 1);
  roundRect(cv, cx, S * 0.36, S * 0.205, S * 0.15, S * 0.09, GOLD_HI, 1, GOLD);
  roundRect(cv, cx, S * 0.50, S * 0.13, S * 0.08, S * 0.06, GOLD, 1, GOLD_LO);
  // Rim
  roundRect(cv, cx, S * 0.25, S * 0.235, S * 0.03, S * 0.02, OUTLINE, 1);
  roundRect(cv, cx, S * 0.247, S * 0.222, S * 0.025, S * 0.014, GOLD_HI, 1, GOLD);
  // Bowl shine highlight + a small medallion
  ellipse(cv, cx - S * 0.07, S * 0.35, S * 0.045, S * 0.10, GOLD_HI, 0.6, 3);
  ellipse(cv, cx, S * 0.41, S * 0.05, S * 0.05, GOLD_LO, 0.9, 2);
  ellipse(cv, cx, S * 0.41, S * 0.03, S * 0.03, GOLD_HI, 0.9, 2);
}

function main() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const OUT = path.resolve(__dirname, '../../assets/ui/trophy.png');
  const SS = 512; // supersample
  const OUTSZ = 256;
  const cv = C(SS, SS);
  drawTrophy(cv);
  // Downsample 2x -> 256 with box average
  const out = Buffer.alloc(OUTSZ * OUTSZ * 4);
  const scale = SS / OUTSZ;
  for (let y = 0; y < OUTSZ; y++)
    for (let x = 0; x < OUTSZ; x++) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let sy = 0; sy < scale; sy++)
        for (let sx = 0; sx < scale; sx++) {
          const i = (((y * scale + sy) | 0) * SS + ((x * scale + sx) | 0)) * 4;
          r += cv.px[i]; g += cv.px[i + 1]; b += cv.px[i + 2]; a += cv.px[i + 3]; n++;
        }
      const o = (y * OUTSZ + x) * 4;
      out[o] = Math.round((r / n) * 255);
      out[o + 1] = Math.round((g / n) * 255);
      out[o + 2] = Math.round((b / n) * 255);
      out[o + 3] = Math.round((a / n) * 255);
    }
  savePNG(OUT, OUTSZ, OUTSZ, out);
}

main();
