// Pixel-art world set: clouds only. (Roof, foundation, pit entrance, wall, tree
// and ground are not generated here - see the note at the bottom of this file.)
// Drawn on a small logical grid with hard edges and limited palettes, then
// nearest-neighbor upscaled — matches the pixel-art room interiors.
// Run: node scripts/tools/generatePixelWorld.mjs
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

// --- logical pixel grid ------------------------------------------------------
const hex = c => c ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), c.length > 7 ? parseInt(c.slice(7, 9), 16) : 255] : [0, 0, 0, 0];
const G = (w, h) => ({ w, h, px: new Array(w * h).fill(null) });
const put = (g, x, y, c) => { if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.px[(y | 0) * g.w + (x | 0)] = c; };
const get = (g, x, y) => (x >= 0 && y >= 0 && x < g.w && y < g.h) ? g.px[(y | 0) * g.w + (x | 0)] : null;
function disc(g, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(g, x, y, c);
}
function upscale(g, scale) {
  const out = Buffer.alloc(g.w * scale * g.h * scale * 4);
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const c = g.px[y * g.w + x];
    if (!c) continue;
    const [r, gg, b, a] = hex(c);
    for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) {
      const o = ((y * scale + sy) * g.w * scale + x * scale + sx) * 4;
      out[o] = r; out[o + 1] = gg; out[o + 2] = b; out[o + 3] = a;
    }
  }
  return out;
}
function save(g, scale, file) {
  savePNG(path.join(ENV, file), g.w * scale, g.h * scale, upscale(g, scale));
}
const ENV = path.resolve(import.meta.dirname, '../../assets/environment');

// === clouds (two variants, 72x36 grid, x6 = 432x216) =========================
function cloud(puffs, file) {
  const g = G(72, 36);
  const WHITE = '#FFFFFF', LIGHT = '#F2F0FA', SHADE = '#D8D4EC', EDGE = '#C4BEDE';
  // body
  for (const [cx, cy, rx, ry] of puffs) disc(g, cx, cy, rx, ry, WHITE);
  // flat base: clip everything below the baseline, then shade the underside
  const baseY = 27;
  for (let x = 0; x < g.w; x++) for (let y = baseY + 1; y < g.h; y++) put(g, x, y, null);
  for (let x = 0; x < g.w; x++) {
    if (get(g, x, baseY)) { put(g, x, baseY, SHADE); if (get(g, x, baseY - 1)) put(g, x, baseY - 1, LIGHT); }
  }
  // second shading band above the base for volume
  for (let x = 0; x < g.w; x++) {
    if (get(g, x, baseY - 1) === LIGHT && get(g, x, baseY - 2)) put(g, x, baseY - 2, LIGHT);
  }
  // full 1px outline so the white body reads crisply against any sky
  const body = g.px.slice();
  for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
    const c = body[y * g.w + x];
    if (!c) continue;
    const edge = !body[y * g.w + Math.min(x + 1, g.w - 1)] || (x === 0 || !body[y * g.w + x - 1]) ||
      (y === 0 || !body[(y - 1) * g.w + x]) || (y === g.h - 1 || !body[(y + 1) * g.w + x]);
    if (edge) put(g, x, y, EDGE);
  }
  save(g, 6, file);
}
cloud([[18, 22, 11, 8], [33, 17, 13, 10], [48, 21, 12, 9], [59, 25, 8, 5], [9, 25, 7, 4]], 'cloud_1.png');
cloud([[14, 23, 9, 6], [28, 18, 12, 9], [44, 22, 11, 7], [55, 25, 6, 4]], 'cloud_2.png');

// === roof / foundation / pit entrance / wall / tree / ground ===============
// None of these are generated here any more. Roof, the per-phase foundations,
// the pit entrance and the wall were replaced by AI-generated pixel art
// (sources in assets/raw/, processed into assets/environment/ by
// scripts/tools/processRawWorldArt.mjs); regenerating them procedurally would
// clobber the shipped art. tree.png and ground.png were DELETED from the repo
// for bundle hygiene (zero src references, and assets/environment/** ships in
// the binary) yet this script kept re-creating them on every
// `npm run generate:assets`, so their blocks are gone too. Only the clouds
// above remain procedural. generateWorldArt.mjs carries the matching note for
// the roof/foundation blocks it used to clobber the same way.
