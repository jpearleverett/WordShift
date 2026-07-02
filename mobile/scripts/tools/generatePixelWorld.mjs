// Pixel-art world set: clouds, tree, ground, roof, foundation, pit entrance.
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
function box(g, x0, y0, x1, y1, c) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) put(g, x, y, c); }
function disc(g, cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) put(g, x, y, c);
}
// deterministic PRNG
const rng = (s => () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)(7);
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

// === tree (56x76 grid, x6 = 336x456) =========================================
{
  const g = G(56, 76);
  const T1 = '#7A4E36', T2 = '#5E3A26', G1 = '#7FCB6F', G2 = '#5CAB54', G3 = '#3F8742', G4 = '#9ADE86';
  // trunk with bark notches
  box(g, 25, 48, 30, 73, T1);
  box(g, 23, 70, 32, 73, T1);
  for (let y = 50; y < 72; y += 5) { put(g, 26, y, T2); put(g, 29, y + 2, T2); }
  box(g, 24, 48, 24, 60, T2); // left bark shadow
  // canopy: stacked discs, dark -> mid -> light for depth
  disc(g, 28, 30, 21, 18, G3);
  disc(g, 18, 26, 13, 11, G2); disc(g, 38, 28, 13, 11, G2); disc(g, 28, 17, 14, 11, G2);
  disc(g, 24, 22, 10, 8, G1); disc(g, 34, 20, 9, 7, G1); disc(g, 17, 30, 8, 6, G1);
  // pixel-cluster highlights + blossoms
  for (let i = 0; i < 26; i++) {
    const x = 10 + (rng() * 36) | 0, y = 10 + (rng() * 30) | 0;
    if (get(g, x, y)) { put(g, x, y, G4); put(g, x + 1, y, G4); }
  }
  for (const [x, y] of [[15, 24], [33, 14], [40, 31], [22, 35], [30, 25]]) {
    if (get(g, x, y)) { put(g, x, y, '#FF9EC2'); put(g, x + 1, y, '#FFC9DE'); }
  }
  // bottom canopy shadow row
  for (let x = 0; x < g.w; x++) for (let y = 75; y >= 0; y--) {
    if (get(g, x, y) && [G1, G2, G4].includes(get(g, x, y)) && !get(g, x, y + 1)) { put(g, x, y, G3); break; }
  }
  save(g, 6, 'tree.png');
}

// === ground (256x60 grid, x4 = 1024x240) =====================================
{
  const g = G(256, 60);
  const TOP = '#90D87C', MID = '#6FBE63', LOW = '#4F9A4F', DARK = '#3E7E42', LIP = '#A8E794';
  // gently stepped hill silhouette
  for (let x = 0; x < g.w; x++) {
    const t = x / g.w;
    const topY = Math.round(12 - Math.sin(t * Math.PI) * 7 + Math.sin(x * 0.07) * 1.2);
    for (let y = topY; y < g.h; y++) {
      const d = y - topY;
      put(g, x, y, d < 2 ? LIP : d < 8 ? TOP : d < 20 ? MID : d < 36 ? LOW : DARK);
    }
  }
  // grass blade notches along the lip
  for (let x = 2; x < g.w; x += 3 + ((rng() * 3) | 0)) {
    for (let y = 0; y < g.h; y++) if (get(g, x, y)) { put(g, x, y - 1, LIP); if (rng() < 0.4) put(g, x, y - 2, TOP); break; }
  }
  // tufts + pixel flowers
  for (let i = 0; i < 70; i++) {
    const x = (rng() * g.w) | 0, y = 14 + (rng() * 34) | 0;
    if (get(g, x, y)) { const c = rng() < 0.5 ? LIP : TOP; put(g, x, y, c); put(g, x + 1, y, c); }
  }
  for (let i = 0; i < 18; i++) {
    const x = 4 + (rng() * (g.w - 8)) | 0, y = 18 + (rng() * 30) | 0;
    if (!get(g, x, y)) continue;
    const col = ['#FF9EC2', '#FFD166', '#C9B2FF', '#FFFFFF'][(rng() * 4) | 0];
    put(g, x, y, col); put(g, x - 1, y, col); put(g, x + 1, y, col); put(g, x, y - 1, col); put(g, x, y + 1, col);
    put(g, x, y, '#FFF3C2');
  }
  save(g, 4, 'ground.png');
}

// === roof (132x52 grid, x6 = 792x312) ========================================
// Gable roof with shingle courses, fascia, attic window, and chimney baked in.
{
  const g = G(132, 52);
  const S1 = '#A8537F', S2 = '#94476F', S3 = '#7E3B5E', RIDGE = '#C36F99', FASCIA = '#5E2C49', FASCIA2 = '#7A3A60';
  const peakX = 66, peakY = 2, baseY = 44;
  const slope = (y) => ((y - peakY) / (baseY - peakY)) * 64 + 4; // half-width at row y
  // chimney first (left slope), so the roof overlaps its base
  box(g, 30, 8, 39, 26, '#9A6B8F');
  box(g, 30, 8, 32, 26, '#7A4E72');
  box(g, 28, 6, 41, 9, '#B58AA8');
  box(g, 28, 6, 41, 6, '#C9A2BD');
  // roof body: shingle courses with alternating offset scallops
  for (let y = peakY; y <= baseY; y++) {
    const hw = slope(y);
    const course = Math.floor((y - peakY) / 6);
    for (let x = Math.ceil(peakX - hw); x <= Math.floor(peakX + hw); x++) {
      const phase = course % 2 ? 3 : 0;
      const inCourseY = (y - peakY) % 6;
      const scallop = ((x + phase) % 6) < 3 ? 0 : 1;
      put(g, x, y, inCourseY >= 5 ? S3 : (scallop ? S2 : S1));
    }
  }
  // ridge highlight
  for (let y = peakY; y <= peakY + 3; y++) { const hw = slope(y); box(g, Math.ceil(peakX - hw), y, Math.floor(peakX + hw), y, RIDGE); }
  // left-slope sunlight, right-slope shade (1px diagonal bands)
  for (let y = peakY; y <= baseY; y++) {
    const hw = slope(y);
    put(g, Math.ceil(peakX - hw), y, RIDGE); put(g, Math.ceil(peakX - hw) + 1, y, S1);
    put(g, Math.floor(peakX + hw), y, S3); put(g, Math.floor(peakX + hw) - 1, y, S3);
  }
  // attic window: round frame + warm glass + cross mullion
  disc(g, peakX, 26, 9, 9, FASCIA);
  disc(g, peakX, 26, 7, 7, '#FFE9B0');
  disc(g, peakX, 26, 7, 7, '#FFDD8A');
  box(g, peakX - 7, 25, peakX + 7, 26, '#FFE9B0');
  box(g, peakX - 1, 19, peakX, 33, FASCIA);
  box(g, peakX - 7, 25, peakX + 7, 26, '#F7C96B'); // re-cut horizontal glass band
  box(g, peakX - 1, 19, peakX, 33, FASCIA);
  // fascia/eaves board
  box(g, 0, baseY + 1, g.w - 1, baseY + 5, FASCIA2);
  box(g, 0, baseY + 1, g.w - 1, baseY + 1, RIDGE);
  box(g, 0, baseY + 5, g.w - 1, baseY + 5, FASCIA);
  save(g, 6, 'roof.png');
}

// === foundation (132x14 grid, x6 = 792x84) ===================================
// Warm mortared stonework in the roof's visual language: same 1px outline
// weight, top-left key light (lit tops/left, shaded bottoms/right), clean
// banded courses. Palette pulls from the room interiors' fireplace masonry and
// the timber walls so the house base reads as part of the same build. Corner
// quoins + full-height side outlines make the house column's edges read as
// deliberate walls instead of raw sprite edges.
{
  const g = G(132, 14);
  const EDGE = '#3B2A22';                        // outer outline (roof-fascia weight)
  const MORTAR = '#4E3A2E';                      // warm mortar shadow
  const SILL = '#7A4E36', SILL_HI = '#9A6B4A';   // timber sill where the walls land
  const A = '#9A8672', B = '#8A7562';            // stone faces (warm taupe)
  const HI = '#BCA98F', LO = '#6B5847';          // sun side / shade side
  const QUOIN = '#AB9781', QUOIN_HI = '#CDBBA0'; // protruding corner stones
  const PLINTH = '#5F4A38', PLINTH_D = '#52402F';// footing band

  box(g, 0, 0, g.w - 1, g.h - 1, MORTAR);
  // timber sill: the wall→stone junction reads as a deliberate trim line
  box(g, 0, 0, g.w - 1, 0, SILL_HI);
  box(g, 0, 1, g.w - 1, 1, SILL);
  // two staggered courses of varied-width beveled stones
  const courses = [{ y0: 2, y1: 6, off: 0 }, { y0: 8, y1: 11, off: -8 }];
  courses.forEach(({ y0, y1, off }, row) => {
    let x0 = off, i = row;
    while (x0 < g.w) {
      const x1 = Math.min(x0 + 13 + ((rng() * 6) | 0), g.w - 1);
      const xs = Math.max(x0, 0);
      box(g, xs, y0, x1, y1, i++ % 2 ? A : B);
      box(g, xs, y0, x1, y0, HI);                     // lit top
      box(g, xs, y1, x1, y1, LO);                     // shaded base
      if (x0 >= 0) box(g, x0, y0 + 1, x0, y1 - 1, HI); // lit left face
      box(g, x1, y0 + 1, x1, y1, LO);                 // shaded right face
      if (rng() < 0.5 && x1 - xs > 5)                 // weathering pock
        put(g, xs + 2 + ((rng() * (x1 - xs - 4)) | 0), y0 + 2 + ((rng() * (y1 - y0 - 2)) | 0), LO);
      x0 = x1 + 2;
    }
  });
  // corner quoins: alternating widths per course, anchoring both edges
  for (const side of [0, 1]) {
    courses.forEach(({ y0, y1 }, row) => {
      const wq = row ? 6 : 8;
      const qx0 = side ? g.w - 2 - wq : 1, qx1 = qx0 + wq;
      box(g, qx0, y0, qx1, y1, QUOIN);
      box(g, qx0, y0, qx1, y0, QUOIN_HI);
      box(g, qx0, y1, qx1, y1, LO);
      box(g, side ? qx1 : qx0, y0 + 1, side ? qx1 : qx0, y1, side ? LO : QUOIN_HI);
    });
  }
  // footing band + ground-contact shadow
  box(g, 0, 12, g.w - 1, 12, PLINTH);
  for (let x = 2; x < g.w - 2; x += 3 + ((rng() * 4) | 0)) put(g, x, 12, PLINTH_D);
  box(g, 0, 13, g.w - 1, 13, EDGE);
  // full-height side outlines continue the wall border down through the base
  box(g, 0, 0, 0, g.h - 1, EDGE);
  box(g, g.w - 1, 0, g.w - 1, g.h - 1, EDGE);
  save(g, 6, 'foundation.png');
}

// === pit entrance (96x72 grid, x5 = 480x360) =================================
// Home-screen doorway to the Offering Pit: stone-ringed hole with a glow and
// a short stone path that meets the house foundation above it.
{
  const g = G(96, 72);
  const HOLE = '#120A24', DEEP = '#1E1240', GLOW1 = '#3FD9C0', GLOW2 = '#2BA897', RIM1 = '#8D86A8', RIM2 = '#736C8E', RIM3 = '#B5AECB', GRASS = '#6FBE63';
  const PATH = '#9A8672', PATH_HI = '#BCA98F', PATH_LO = '#6B5847'; // foundation stone palette
  const oy = 12; // everything below shifts down to make room for the path
  // warm stone path from the house down to the pit mouth — same masonry as the
  // foundation it tucks under (the pit's own rim stays cold, otherworldly stone)
  for (const [px, py, w] of [[44, 0, 8], [42, 4, 9], [45, 8, 8], [43, 12, 9], [44, 16, 8]]) {
    box(g, px, py, px + w, py + 2, PATH);
    box(g, px, py, px + w, py, PATH_HI);
    box(g, px, py + 2, px + w, py + 2, PATH_LO);
  }
  // mound shadow
  disc(g, 48, 40 + oy, 38, 14, '#3E7E42');
  disc(g, 48, 38 + oy, 36, 13, GRASS);
  // stone rim (ellipse ring) — chunky stones around the mouth
  disc(g, 48, 34 + oy, 31, 11, RIM2);
  disc(g, 48, 32 + oy, 29, 10, RIM1);
  for (let a = 0; a < 16; a++) {
    const ang = (a / 16) * Math.PI * 2;
    const x = 48 + Math.cos(ang) * 27, y = 32 + oy + Math.sin(ang) * 9.4;
    box(g, x - 2, y - 1, x + 2, y + 1, a % 2 ? RIM1 : RIM3);
  }
  // the mouth
  disc(g, 48, 33 + oy, 24, 7.5, DEEP);
  disc(g, 48, 34 + oy, 21, 6, HOLE);
  // inner glow ring + rising wisps
  for (let x = 30; x <= 66; x++) if (((x * 7) % 3) !== 0) put(g, x, 37 + oy, GLOW2);
  for (let x = 34; x <= 62; x++) if (((x * 5) % 4) < 2) put(g, x, 36 + oy, GLOW1);
  for (const [wx, len] of [[38, 6], [48, 9], [58, 5], [43, 4], [53, 6]]) {
    for (let i = 0; i < len; i++) put(g, wx + (i % 2 ? 1 : 0), 33 + oy - i * 2, i < 2 ? GLOW1 : (i < 4 ? GLOW2 : '#1E6E63'));
  }
  // tiny floating motes
  for (const [x, y] of [[33, 22 + oy], [62, 18 + oy], [50, 14 + oy], [41, 10 + oy], [68, 26 + oy]]) put(g, x, y, GLOW1);
  save(g, 5, 'pit_entrance.png');
}
