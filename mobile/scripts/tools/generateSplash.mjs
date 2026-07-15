// Composes the launch splash from the REAL brand assets (the hand-authored fox
// app icon + the wooden WORDSHIFT wordmark) instead of the old flat procedural
// candy mark, so the first frame the player ever sees matches the quality of
// the store icon and feature graphic. The fox is presented as a clean rounded
// card (its own baked black corners masked away) with a soft drop shadow, above
// the wordmark, on the warm cream field the in-app boot screen also uses so the
// native splash -> JS boot handoff is a seamless hold.
//
// Run: node scripts/tools/generateSplash.mjs   (pure Node + pngjs, no build step)
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOBILE = path.resolve(HERE, '..', '..');
const ASSET = (p) => path.join(MOBILE, 'assets', p);

// --- warm cream background, shared with App.tsx bootStyles / expo-splash bg ---
const BG = [255, 240, 245]; // #FFF0F5

function loadRGBA(p) {
  return PNG.sync.read(fs.readFileSync(p));
}

// Bilinear sample from a source PNG in straight-alpha RGBA. Out-of-range -> transparent.
function sample(src, u, v) {
  const { width: w, height: h, data } = src;
  if (u < 0 || v < 0 || u > w - 1 || v > h - 1) return [0, 0, 0, 0];
  const x0 = Math.floor(u), y0 = Math.floor(v);
  const x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1);
  const fx = u - x0, fy = v - y0;
  const at = (x, y) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]];
  };
  const a = at(x0, y0), b = at(x1, y0), c = at(x0, y1), d = at(x1, y1);
  const lerp = (p, q, t) => p + (q - p) * t;
  const out = [];
  for (let k = 0; k < 4; k++) {
    const top = lerp(a[k], b[k], fx);
    const bot = lerp(c[k], d[k], fx);
    out[k] = lerp(top, bot, fy);
  }
  return out;
}

// Signed distance to a rounded rectangle (negative inside). cx,cy center;
// hx,hy half-extents; r corner radius.
function rrectSDF(px, py, cx, cy, hx, hy, r) {
  const qx = Math.abs(px - cx) - (hx - r);
  const qy = Math.abs(py - cy) - (hy - r);
  const ax = Math.max(qx, 0), ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

function main() {
  const SIZE = 1600; // square master; expo "contain" letterboxes with matching BG
  const canvas = Buffer.alloc(SIZE * SIZE * 4);
  // Fill background (opaque cream)
  for (let i = 0; i < SIZE * SIZE; i++) {
    canvas[i * 4] = BG[0];
    canvas[i * 4 + 1] = BG[1];
    canvas[i * 4 + 2] = BG[2];
    canvas[i * 4 + 3] = 255;
  }

  const icon = loadRGBA(ASSET('icon.png'));       // 1024^2, opaque, black rounded corners
  const wordmark = loadRGBA(ASSET('ui/wordmark.png')); // 1000x250, transparent

  // --- layout (centered group: fox card, gap, wordmark) ---
  const CARD = 880;                 // rendered fox card size
  const CARD_R = Math.round((185 / 1024) * CARD); // match the icon's own corner radius
  const WM_W = 980, WM_H = Math.round((250 / 1000) * WM_W); // 980x245
  const GAP = 54;
  const groupH = CARD + GAP + WM_H;
  const top = Math.round((SIZE - groupH) / 2);
  const cardX = Math.round((SIZE - CARD) / 2), cardY = top;
  const cardCx = cardX + CARD / 2, cardCy = cardY + CARD / 2, cardHalf = CARD / 2;
  const wmX = Math.round((SIZE - WM_W) / 2), wmY = cardY + CARD + GAP;

  // Soft drop shadow params (card offset down; feathered SDF, no convolution).
  const SHADOW_DY = 26;
  const SHADOW_SIGMA = 34;
  const SHADOW_MAX = 0.22;

  const put = (x, y, rgb, a) => {
    if (a <= 0) return;
    const i = (y * SIZE + x) * 4;
    const inv = 1 - a;
    canvas[i] = Math.round(rgb[0] * a + canvas[i] * inv);
    canvas[i + 1] = Math.round(rgb[1] * a + canvas[i + 1] * inv);
    canvas[i + 2] = Math.round(rgb[2] * a + canvas[i + 2] * inv);
    canvas[i + 3] = 255;
  };

  // Bounding window for the card + shadow work (keeps the O(n^2) loop tight).
  const y0 = Math.max(0, cardY - 80), y1 = Math.min(SIZE, cardY + CARD + SHADOW_DY + 90);
  const x0 = Math.max(0, cardX - 80), x1 = Math.min(SIZE, cardX + CARD + 90);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      // 1) shadow (rounded rect shifted down)
      const ds = rrectSDF(x, y, cardCx, cardCy + SHADOW_DY, cardHalf, cardHalf, CARD_R);
      if (ds < SHADOW_SIGMA * 2.5) {
        const s = ds <= 0 ? SHADOW_MAX : SHADOW_MAX * Math.exp(-(ds * ds) / (2 * SHADOW_SIGMA * SHADOW_SIGMA));
        if (s > 0.002) put(x, y, [40, 20, 40], s);
      }
      // 2) fox card (masked to rounded rect, 1px AA)
      const dc = rrectSDF(x, y, cardCx, cardCy, cardHalf, cardHalf, CARD_R);
      const cover = Math.max(0, Math.min(1, 0.5 - dc));
      if (cover > 0) {
        const u = ((x - cardX) / CARD) * (icon.width - 1);
        const v = ((y - cardY) / CARD) * (icon.height - 1);
        const px = sample(icon, u, v);
        put(x, y, [px[0], px[1], px[2]], (px[3] / 255) * cover);
      }
    }
  }

  // 3) wordmark (own alpha, bilinear)
  for (let y = 0; y < WM_H; y++) {
    for (let x = 0; x < WM_W; x++) {
      const u = (x / (WM_W - 1)) * (wordmark.width - 1);
      const v = (y / (WM_H - 1)) * (wordmark.height - 1);
      const px = sample(wordmark, u, v);
      const a = px[3] / 255;
      if (a > 0.003) put(wmX + x, wmY + y, [px[0], px[1], px[2]], a);
    }
  }

  const out = new PNG({ width: SIZE, height: SIZE });
  canvas.copy(out.data);
  fs.writeFileSync(ASSET('splash.png'), PNG.sync.write(out, { colorType: 6 }));
  console.log(`wrote ${ASSET('splash.png')} (${SIZE}x${SIZE})`);
}

main();
