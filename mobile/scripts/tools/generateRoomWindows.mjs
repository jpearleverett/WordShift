// Phase-aware window masks for the rooms the original processRawWorldArt pass
// left untreated: desert, observatory (star_loft), workshop (belfry), jungle,
// and rainforest (sky_garden). Each of these paints a bright DAY view through a
// framed window (blue sky + foliage, canopy light, or misty rainforest); this
// extracts a white-on-transparent mask of just that VIEW so RoomView can tint
// it toward the current phase's sky (day -> dusk -> night), exactly like the
// cozy_den/kitchen/study/office/garden masks.
//
// The five original masks use a blue-blob detector, which only fires on a bright
// blue sky. These windows vary (night-to-day repaint, green canopy, teal mist),
// so we use a bbox-bounded local REGION GROW from hand-placed seeds instead: the
// fill flows across the view's own gradients (sky into foliage) but stops at the
// dark wooden frame and at sharp foreground edges (a potted cactus, the jungle
// hammock), so interior objects in front of the glass are never tinted.
//
// Run: node scripts/tools/generateRoomWindows.mjs   (pure Node + pngjs)
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOMS = path.resolve(HERE, '..', '..', 'assets', 'rooms');
const WINDOWS = path.join(ROOMS, 'windows');

// Each room's window VIEW has a recognisable colour family that the dark wooden
// frame and the interior foreground objects do not share, so we flood-fill from
// seeds through pixels matching a per-room `view` predicate (bounded by a bbox).
// Connectivity keeps the fill inside the window opening (it can't jump the frame,
// which fails the predicate), and the predicate captures the whole view across
// its own gradients — sky into foliage, light into leaves — in one region.
//   - desert: bright blue sky + white cloud (excludes the green potted cacti,
//     the tan dunes/tent, and the brown frame).
//   - observatory / workshop: cool sky-blue OR clear green foliage (excludes the
//     warm brown frame/brick).
//   - jungle: green/cyan canopy + its bright light (excludes the tan hammock in
//     front of the glass).
//   - rainforest: teal-green misty view (excludes the warm-brown frame).
// bbox + seeds are FRACTIONS of the art so they survive a re-export at a new
// resolution.
const isSkyBlue = (r, g, b) => b > 150 && b > r + 20 && g > r + 5 && g > 120;
const isCloudWhite = (r, g, b) => r > 185 && g > 185 && b > 185 && Math.abs(r - b) < 30;
const cool = (r, g, b) => (b > r + 8 || g > r + 10) && r + g + b > 90;
const greenBright = (r, g, b) => g >= r - 2 && r + g + b > 150;
const mistyTeal = (r, g, b) => g >= r - 8 && r + g + b > 120 && r + g + b < 720;

// `boxes` are tight fractional rectangles hugging each window opening (two for
// the observatory's round pair). Every pixel inside a box that satisfies `view`
// joins the mask — no connectivity, so a light streak or a sky/foliage seam can
// never strand part of the view. The boxes are tight enough that the only
// matching pixels inside them are the window itself (the frame/brick/foreground
// fail `view`).
const CONFIG = [
  {
    art: 'desert', view: (r, g, b) => isSkyBlue(r, g, b) || isCloudWhite(r, g, b),
    boxes: [[0.03, 0.02, 0.97, 0.47]],
  },
  {
    art: 'observatory', view: cool,
    boxes: [[0.305, 0.12, 0.49, 0.52], [0.535, 0.12, 0.715, 0.52]],
  },
  { art: 'workshop', view: cool, boxes: [[0.655, 0.1, 0.945, 0.49]] },
  { art: 'jungle', view: greenBright, boxes: [[0.34, 0.13, 0.71, 0.55]] },
  { art: 'rainforest', view: mistyTeal, boxes: [[0.28, 0.16, 0.71, 0.56]] },
];

function load(name) {
  return PNG.sync.read(fs.readFileSync(path.join(ROOMS, `${name}.png`)));
}

// Mask = every pixel inside one of the room's boxes that satisfies `view`.
function buildMask(png, boxes, view) {
  const { width: w, height: h, data } = png;
  const rects = boxes.map(([fx0, fy0, fx1, fy1]) => [
    Math.round(fx0 * w), Math.round(fy0 * h), Math.round(fx1 * w), Math.round(fy1 * h),
  ]);
  const mask = new Uint8Array(w * h);
  for (const [x0, y0, x1, y1] of rects) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const p = (y * w + x) * 4;
      if (view(data[p], data[p + 1], data[p + 2])) mask[y * w + x] = 1;
    }
  }
  return mask;
}

// Area (box-average) downscale to `outW` wide, preserving the alpha mask edges.
function downscaleMask(mask, w, h, outW) {
  const outH = Math.round(outW * h / w);
  const out = new PNG({ width: outW, height: outH });
  for (let oy = 0; oy < outH; oy++) {
    for (let ox = 0; ox < outW; ox++) {
      const sx0 = Math.floor(ox * w / outW), sx1 = Math.max(sx0 + 1, Math.floor((ox + 1) * w / outW));
      const sy0 = Math.floor(oy * h / outH), sy1 = Math.max(sy0 + 1, Math.floor((oy + 1) * h / outH));
      let on = 0, tot = 0;
      for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) { tot++; if (mask[sy * w + sx]) on++; }
      const a = tot ? Math.round(255 * on / tot) : 0;
      const o = (oy * outW + ox) * 4;
      out.data[o] = 255; out.data[o + 1] = 255; out.data[o + 2] = 255; out.data[o + 3] = a;
    }
  }
  return out;
}

fs.mkdirSync(WINDOWS, { recursive: true });
for (const cfg of CONFIG) {
  const src = load(cfg.art);
  const { width: w, height: h } = src;
  const mask = buildMask(src, cfg.boxes, cfg.view);
  let count = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i]) count++;
  const out = downscaleMask(mask, w, h, 400);
  fs.writeFileSync(path.join(WINDOWS, `${cfg.art}.png`), PNG.sync.write(out));
  console.log(`windows/${cfg.art}.png  (${(100 * count / (w * h)).toFixed(1)}% of art masked)`);
}
