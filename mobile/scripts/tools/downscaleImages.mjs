// Downscales oversized background PNGs to sensible mobile resolutions.
// Pure Node (zlib only): decodes 8-bit RGB/RGBA non-interlaced PNGs,
// box-resamples, re-encodes with Paeth filtering at max deflate.
// Run: node scripts/tools/downscaleImages.mjs
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

function decodePNG(buf) {
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const depth = buf[24], colorType = buf[25], interlace = buf[28];
  if (depth !== 8 || (colorType !== 2 && colorType !== 6) || interlace !== 0) {
    throw new Error(`unsupported PNG (depth=${depth} colorType=${colorType} interlace=${interlace})`);
  }
  const bpp = colorType === 6 ? 4 : 3;
  const idat = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') idat.push(buf.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = x >= bpp && prev ? prev[x - bpp] : 0;
      let v = line[x];
      switch (filter) {
        case 0: break;
        case 1: v = (v + a) & 0xff; break;
        case 2: v = (v + b) & 0xff; break;
        case 3: v = (v + ((a + b) >> 1)) & 0xff; break;
        case 4: {
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
          break;
        }
        default: throw new Error(`bad filter ${filter}`);
      }
      cur[x] = v;
    }
  }
  return { w, h, bpp, colorType, data: out };
}

function boxResample(img, newW, newH) {
  const { w, h, bpp, data } = img;
  const out = Buffer.alloc(newW * newH * bpp);
  for (let y = 0; y < newH; y++) {
    const sy0 = (y * h) / newH, sy1 = ((y + 1) * h) / newH;
    for (let x = 0; x < newW; x++) {
      const sx0 = (x * w) / newW, sx1 = ((x + 1) * w) / newW;
      const acc = new Float64Array(bpp);
      let total = 0;
      for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy++) {
        const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx++) {
          const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          const wgt = wx * wy;
          const o = (sy * w + sx) * bpp;
          for (let k = 0; k < bpp; k++) acc[k] += data[o + k] * wgt;
          total += wgt;
        }
      }
      const o = (y * newW + x) * bpp;
      for (let k = 0; k < bpp; k++) out[o + k] = Math.round(acc[k] / total);
    }
  }
  return { w: newW, h: newH, bpp, colorType: img.colorType, data: out };
}

function encodePNG(img) {
  const { w, h, bpp, colorType, data } = img;
  const stride = w * bpp;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 4; // Paeth
    const cur = data.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? data.subarray((y - 1) * stride, y * stride) : null;
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = x >= bpp && prev ? prev[x - bpp] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      line[x] = (cur[x] - pred) & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9, memLevel: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const ASSETS = path.resolve(import.meta.dirname, '../../assets');

// target max width per file (full-screen backgrounds need ~1080px; room
// interiors render at ~250pt so 1456px matches the other room assets)
const TARGETS = [
  ['environment/sky_day.png', 1080],
  ['environment/sky_dusk.png', 1080],
  ['environment/sky_storm.png', 1080],
  ['environment/sky_shadow.png', 1080],
  ['rooms/aquarium.png', 1456],
  ['rooms/jungle.png', 1092],
  ['rooms/office.png', 1092],
];

for (const [rel, maxW] of TARGETS) {
  const file = path.join(ASSETS, rel);
  const before = fs.statSync(file).size;
  const img = decodePNG(fs.readFileSync(file));
  if (img.w <= maxW) {
    console.log(`${rel}: already ${img.w}px wide, skipped`);
    continue;
  }
  const scale = maxW / img.w;
  const resized = boxResample(img, maxW, Math.round(img.h * scale));
  const out = encodePNG(resized);
  fs.writeFileSync(file, out);
  console.log(`${rel}: ${img.w}x${img.h} ${(before / 1024 / 1024).toFixed(1)}MB -> ${resized.w}x${resized.h} ${(out.length / 1024 / 1024).toFixed(1)}MB`);
}
