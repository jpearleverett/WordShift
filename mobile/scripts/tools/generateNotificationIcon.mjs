// Generates the Android notification small icon (white glyph on transparency,
// tinted by the system using the color set in app.json).
// Run: node scripts/tools/generateNotificationIcon.mjs
import path from 'path';
import zlib from 'zlib';
import fs from 'fs';

// Minimal duplicated PNG writer (kept standalone so each tool runs alone)
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const W = 96;
const px = new Float64Array(W * W); // alpha only; color is pure white

function sdSegment(pxx, pyy, ax, ay, bx, by) {
  const abx = bx - ax, aby = by - ay;
  const t = Math.max(0, Math.min(1, ((pxx - ax) * abx + (pyy - ay) * aby) / (abx * abx + aby * aby)));
  return Math.hypot(pxx - (ax + abx * t), pyy - (ay + aby * t));
}

// Bold "W" centered in the 96px canvas
const cx = W / 2, cy = W / 2, s = W * 0.66;
const wTop = cy - s * 0.28, wBot = cy + s * 0.30, wHalf = s * 0.42;
const segs = [
  [cx - wHalf, wTop, cx - wHalf * 0.5, wBot],
  [cx - wHalf * 0.5, wBot, cx, wTop + s * 0.16],
  [cx, wTop + s * 0.16, cx + wHalf * 0.5, wBot],
  [cx + wHalf * 0.5, wBot, cx + wHalf, wTop],
];
const thickness = s * 0.085;
for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    let d = Infinity;
    for (const [ax, ay, bx, by] of segs) d = Math.min(d, sdSegment(x + 0.5, y + 0.5, ax, ay, bx, by));
    px[y * W + x] = Math.max(0, Math.min(1, 0.5 - (d - thickness)));
  }
}

const raw = Buffer.alloc((W * 4 + 1) * W);
for (let y = 0; y < W; y++) {
  raw[y * (W * 4 + 1)] = 0;
  for (let x = 0; x < W; x++) {
    const o = y * (W * 4 + 1) + 1 + x * 4;
    raw[o] = 255; raw[o + 1] = 255; raw[o + 2] = 255;
    raw[o + 3] = Math.round(px[y * W + x] * 255);
  }
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(W, 4);
ihdr[8] = 8; ihdr[9] = 6;
const out = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);
const dest = path.resolve(import.meta.dirname, '../../assets/notification-icon.png');
fs.writeFileSync(dest, out);
console.log(`wrote ${dest} (${W}x${W})`);
