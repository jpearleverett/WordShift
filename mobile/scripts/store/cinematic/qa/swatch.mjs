// Colour check for spec 7.2 gate 5: sample patches of a still and report ΔE2000
// against target hex values.
//
//   node scripts/store/cinematic/qa/swatch.mjs <image> x,y,w,h=#RRGGBB [x,y,w,h=#RRGGBB ...]
//
// Coordinates are in the image's own pixels (a patch's mean colour is compared).
// Prints one line per patch and exits 1 when any patch is over 6.

import { createRequire } from 'node:module';

const sharp = createRequire(import.meta.url)('sharp');

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
function lab([r, g, b]) {
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
/** CIEDE2000 (Sharma, Wu, Dalal 2005). */
export function deltaE2000(l1, l2) {
  const [L1, a1, b1] = l1, [L2, a2, b2] = l2;
  const d = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (a, b) => { const v = Math.atan2(b, a) / d; return v < 0 ? v + 360 : v; };
  const h1p = h(a1p, b1), h2p = h(a2p, b2);
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = h2p - h1p; if (C1p * C2p === 0) dhp = 0; else if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * d);
  const Lmp = (L1 + L2) / 2, Cmp = (C1p + C2p) / 2;
  let hmp = h1p + h2p; if (C1p * C2p !== 0) hmp = Math.abs(h1p - h2p) > 180 ? (hmp < 360 ? (hmp + 360) / 2 : (hmp - 360) / 2) : hmp / 2;
  const T = 1 - 0.17 * Math.cos((hmp - 30) * d) + 0.24 * Math.cos(2 * hmp * d) + 0.32 * Math.cos((3 * hmp + 6) * d) - 0.2 * Math.cos((4 * hmp - 63) * d);
  const dTh = 30 * Math.exp(-(((hmp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lmp - 50) ** 2) / Math.sqrt(20 + (Lmp - 50) ** 2), Sc = 1 + 0.045 * Cmp, Sh = 1 + 0.015 * Cmp * T;
  const Rt = -Math.sin(2 * dTh * d) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

if (process.argv[1] && process.argv[1].endsWith('swatch.mjs')) {
  const [file, ...specs] = process.argv.slice(2);
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let worst = 0;
  for (const sp of specs) {
    const [box, hex] = sp.split('=');
    const [x, y, w, h] = box.split(',').map(Number);
    const sum = [0, 0, 0]; let n = 0;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      const o = (j * info.width + i) * info.channels;
      sum[0] += data[o]; sum[1] += data[o + 1]; sum[2] += data[o + 2]; n++;
    }
    const mean = sum.map((v) => v / n);
    const de = deltaE2000(lab(mean), lab(hexRgb(hex)));
    worst = Math.max(worst, de);
    const got = '#' + mean.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
    console.log(`${box}  got ${got}  want ${hex}  dE2000 ${de.toFixed(2)}${de > 6 ? '  OVER' : ''}`);
  }
  process.exit(worst > 6 ? 1 : 0);
}
