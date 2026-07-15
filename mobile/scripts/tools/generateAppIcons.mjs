// Pure-Node PNG writer + simple vector rasterizer used to generate the app
// icon, adaptive icon foreground, and splash logo. No external dependencies.
// Run: node scripts/tools/generateAppIcons.mjs
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// PNG encoding
// ---------------------------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function writePNG(filePath, width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(filePath, png);
  console.log(`wrote ${filePath} (${width}x${height}, ${(png.length / 1024).toFixed(1)} KB)`);
}

// ---------------------------------------------------------------------------
// Tiny software rasterizer (works in linear float RGBA, supersampled 2x)
// ---------------------------------------------------------------------------
function makeCanvas(w, h) {
  return { w, h, px: new Float64Array(w * h * 4) };
}

function blendPixel(cv, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h || a <= 0) return;
  const i = (y * cv.w + x) * 4;
  const ia = 1 - a;
  cv.px[i] = r * a + cv.px[i] * ia;
  cv.px[i + 1] = g * a + cv.px[i + 1] * ia;
  cv.px[i + 2] = b * a + cv.px[i + 2] * ia;
  cv.px[i + 3] = a + cv.px[i + 3] * ia;
}

function hex(c) {
  return [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];
}

// Signed distance to a rounded rectangle centered at (cx,cy)
function sdRoundRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
}

// Distance to a line segment
function sdSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby)));
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
}

function fillRoundRect(cv, cx, cy, hw, hh, r, color, alpha = 1, gradTo = null) {
  const [cr, cg, cb] = hex(color);
  const grad = gradTo ? hex(gradTo) : null;
  const x0 = Math.max(0, Math.floor(cx - hw - 2)), x1 = Math.min(cv.w - 1, Math.ceil(cx + hw + 2));
  const y0 = Math.max(0, Math.floor(cy - hh - 2)), y1 = Math.min(cv.h - 1, Math.ceil(cy + hh + 2));
  for (let y = y0; y <= y1; y++) {
    const t = (y - (cy - hh)) / (2 * hh);
    const rr = grad ? cr + (grad[0] - cr) * t : cr;
    const gg = grad ? cg + (grad[1] - cg) * t : cg;
    const bb = grad ? cb + (grad[2] - cb) * t : cb;
    for (let x = x0; x <= x1; x++) {
      const d = sdRoundRect(x + 0.5, y + 0.5, cx, cy, hw, hh, r);
      const a = Math.max(0, Math.min(1, 0.5 - d)); // 1px AA edge
      if (a > 0) blendPixel(cv, x, y, rr, gg, bb, a * alpha);
    }
  }
}

function strokeSegments(cv, segments, thickness, color, alpha = 1) {
  const [cr, cg, cb] = hex(color);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [ax, ay, bx, by] of segments) {
    minX = Math.min(minX, ax, bx); maxX = Math.max(maxX, ax, bx);
    minY = Math.min(minY, ay, by); maxY = Math.max(maxY, ay, by);
  }
  const x0 = Math.max(0, Math.floor(minX - thickness - 2)), x1 = Math.min(cv.w - 1, Math.ceil(maxX + thickness + 2));
  const y0 = Math.max(0, Math.floor(minY - thickness - 2)), y1 = Math.min(cv.h - 1, Math.ceil(maxY + thickness + 2));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let d = Infinity;
      for (const [ax, ay, bx, by] of segments) d = Math.min(d, sdSegment(x + 0.5, y + 0.5, ax, ay, bx, by));
      const a = Math.max(0, Math.min(1, 0.5 - (d - thickness)));
      if (a > 0) blendPixel(cv, x, y, cr, cg, cb, a * alpha);
    }
  }
}

function fillCircle(cv, cx, cy, radius, color, alpha = 1) {
  const [cr, cg, cb] = hex(color);
  const x0 = Math.max(0, Math.floor(cx - radius - 2)), x1 = Math.min(cv.w - 1, Math.ceil(cx + radius + 2));
  const y0 = Math.max(0, Math.floor(cy - radius - 2)), y1 = Math.min(cv.h - 1, Math.ceil(cy + radius + 2));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - radius;
      const a = Math.max(0, Math.min(1, 0.5 - d));
      if (a > 0) blendPixel(cv, x, y, cr, cg, cb, a * alpha);
    }
  }
}

function fillBackgroundGradient(cv, topColor, bottomColor) {
  const top = hex(topColor), bot = hex(bottomColor);
  for (let y = 0; y < cv.h; y++) {
    const t = y / (cv.h - 1);
    const r = top[0] + (bot[0] - top[0]) * t;
    const g = top[1] + (bot[1] - top[1]) * t;
    const b = top[2] + (bot[2] - top[2]) * t;
    for (let x = 0; x < cv.w; x++) {
      const i = (y * cv.w + x) * 4;
      cv.px[i] = r; cv.px[i + 1] = g; cv.px[i + 2] = b; cv.px[i + 3] = 1;
    }
  }
}

// Radial glow highlight
function radialLight(cv, cx, cy, radius, strength) {
  for (let y = 0; y < cv.h; y++) {
    for (let x = 0; x < cv.w; x++) {
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d < 1) {
        const a = (1 - d) * (1 - d) * strength;
        const i = (y * cv.w + x) * 4;
        cv.px[i] = Math.min(1, cv.px[i] + a);
        cv.px[i + 1] = Math.min(1, cv.px[i + 1] + a);
        cv.px[i + 2] = Math.min(1, cv.px[i + 2] + a);
      }
    }
  }
}

// Downsample 2x supersampled canvas to final RGBA byte buffer
function downsampleToBuffer(cv, outW, outH) {
  const out = Buffer.alloc(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < 2; sy++) {
        for (let sx = 0; sx < 2; sx++) {
          const i = ((y * 2 + sy) * cv.w + x * 2 + sx) * 4;
          r += cv.px[i]; g += cv.px[i + 1]; b += cv.px[i + 2]; a += cv.px[i + 3];
        }
      }
      const o = (y * outW + x) * 4;
      out[o] = Math.round((r / 4) * 255);
      out[o + 1] = Math.round((g / 4) * 255);
      out[o + 2] = Math.round((b / 4) * 255);
      out[o + 3] = Math.round((a / 4) * 255);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// WordShift logo mark: candy letter tile with a bold "W" + shift arrow + sparkles
// All coordinates are relative to a unit square scaled by `s` centered at (cx, cy).
// ---------------------------------------------------------------------------
function drawLogoMark(cv, cx, cy, s) {
  // Drop shadow under the tile
  fillRoundRect(cv, cx, cy + s * 0.045, s * 0.46, s * 0.46, s * 0.11, '#1A1A2E', 0.28);
  // Tile body: candy pink gradient (matches CandyColors pink family)
  fillRoundRect(cv, cx, cy, s * 0.45, s * 0.45, s * 0.10, '#FF8FB8', 1, '#E84B8A');
  // Glossy top bevel
  fillRoundRect(cv, cx, cy - s * 0.27, s * 0.40, s * 0.14, s * 0.07, '#FFFFFF', 0.32);
  // Specular dot
  fillCircle(cv, cx - s * 0.30, cy - s * 0.32, s * 0.045, '#FFFFFF', 0.65);
  // Bold "W" drawn from four strokes
  const wTop = cy - s * 0.16, wBot = cy + s * 0.20, wHalf = s * 0.26;
  const seg = [
    [cx - wHalf, wTop, cx - wHalf * 0.5, wBot],
    [cx - wHalf * 0.5, wBot, cx, wTop + s * 0.10],
    [cx, wTop + s * 0.10, cx + wHalf * 0.5, wBot],
    [cx + wHalf * 0.5, wBot, cx + wHalf, wTop],
  ];
  strokeSegments(cv, seg, s * 0.045, '#FFFFFF');
  // Small companion tile peeking from behind (turquoise), suggesting the shift
  fillRoundRect(cv, cx + s * 0.42, cy + s * 0.40, s * 0.16, s * 0.16, s * 0.045, '#5EEAD4', 1, '#14B8A6');
  strokeSegments(cv, [
    [cx + s * 0.42, cy + s * 0.46, cx + s * 0.42, cy + s * 0.34],
    [cx + s * 0.36, cy + s * 0.40, cx + s * 0.42, cy + s * 0.34],
    [cx + s * 0.48, cy + s * 0.40, cx + s * 0.42, cy + s * 0.34],
  ], s * 0.018, '#FFFFFF');
  // Gold tile lower-left
  fillRoundRect(cv, cx - s * 0.44, cy + s * 0.42, s * 0.13, s * 0.13, s * 0.04, '#FFE08A', 1, '#F0B429');
  // Sparkles
  for (const [sx, sy, sr] of [
    [cx - s * 0.52, cy - s * 0.46, s * 0.020],
    [cx + s * 0.50, cy - s * 0.36, s * 0.026],
    [cx + s * 0.34, cy - s * 0.55, s * 0.016],
    [cx - s * 0.38, cy + s * 0.56, s * 0.018],
  ]) {
    fillCircle(cv, sx, sy, sr, '#FFFFFF', 0.85);
  }
}

const ASSETS = path.resolve(import.meta.dirname, '../../assets');
const S = 2; // supersample factor

// 1) & 2) App icon (icon.png) + Android adaptive foreground (adaptive-icon.png)
//    are NO LONGER generated here — they come from the hand-authored fox art
//    via scripts/tools/processAppIcon.mjs (reads assets/raw/app_icon_source.png).
//    Run that instead; this generator only draws the splash mark below.

// 3) Splash: NO LONGER generated here. The old flat procedural candy mark
//    clashed with the hand-authored fox app icon + wooden wordmark, so the
//    launch splash is now composed from those real brand assets by
//    scripts/tools/generateSplash.mjs (run in generate:assets after the icon
//    is processed). This file is retained only for its PNG writer / rasterizer
//    helpers; it intentionally writes nothing now.
void drawLogoMark; // keep the helper referenced for potential reuse
void ASSETS;
void S;
console.log('generateAppIcons: splash is now built by generateSplash.mjs (no-op here)');
