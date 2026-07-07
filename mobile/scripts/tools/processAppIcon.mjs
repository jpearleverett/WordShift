#!/usr/bin/env node
// App-icon processor: takes the hand-authored icon art (assets/raw/
// app_icon_source.png — a finished square icon with the fox, W/S tiles, and
// amber gem) and produces the bundled icon.png (iOS, opaque 1024x1024) and
// adaptive-icon.png (Android foreground, 1024x1024). The art is downscaled
// with an alpha-weighted box average for a clean result. The source is already
// full-bleed and opaque, so the icon is flattened onto a solid base as a
// safety net (iOS requires an opaque icon) and the adaptive foreground keeps
// the same art (Android masks it to the device's icon shape).
//
// Run: node scripts/tools/processAppIcon.mjs   (from mobile/)
// This REPLACES the procedural icon/adaptive-icon output of
// generateAppIcons.mjs, which now only draws the splash.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { PNG } = require('pngjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../../assets');
const SRC = path.join(ASSETS, 'raw', 'app_icon_source.png');
const OUT = 1024;
// Flatten base for any transparent pixels (the source is opaque; this only
// matters if a future source has alpha). A warm near-black keeps the baked
// dark rounded corners consistent.
const FLATTEN = [12, 10, 14];

const src = PNG.sync.read(fs.readFileSync(SRC));
const { width: sw, height: sh } = src;

// Alpha-weighted box-average downscale sw x sh -> OUT x OUT.
function downscale(flatten) {
  const out = new PNG({ width: OUT, height: OUT });
  const sxScale = sw / OUT, syScale = sh / OUT;
  for (let dy = 0; dy < OUT; dy++) {
    const sy0 = dy * syScale, sy1 = (dy + 1) * syScale;
    for (let dx = 0; dx < OUT; dx++) {
      const sx0 = dx * sxScale, sx1 = (dx + 1) * sxScale;
      let r = 0, g = 0, b = 0, a = 0, wsum = 0;
      for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy++) {
        const hy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx++) {
          const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          const w = hy * wx;
          const o = (sy * sw + sx) * 4;
          const pa = src.data[o + 3] / 255;
          r += src.data[o] * pa * w; g += src.data[o + 1] * pa * w; b += src.data[o + 2] * pa * w;
          a += pa * w; wsum += w;
        }
      }
      const o = (dy * OUT + dx) * 4;
      const alpha = wsum > 0 ? a / wsum : 0;
      if (alpha > 0.0001) {
        const rr = r / a, gg = g / a, bb = b / a;
        if (flatten) {
          out.data[o] = Math.round(rr * alpha + FLATTEN[0] * (1 - alpha));
          out.data[o + 1] = Math.round(gg * alpha + FLATTEN[1] * (1 - alpha));
          out.data[o + 2] = Math.round(bb * alpha + FLATTEN[2] * (1 - alpha));
          out.data[o + 3] = 255;
        } else {
          out.data[o] = Math.round(rr); out.data[o + 1] = Math.round(gg); out.data[o + 2] = Math.round(bb);
          out.data[o + 3] = Math.round(alpha * 255);
        }
      } else if (flatten) {
        out.data[o] = FLATTEN[0]; out.data[o + 1] = FLATTEN[1]; out.data[o + 2] = FLATTEN[2]; out.data[o + 3] = 255;
      }
    }
  }
  return out;
}

fs.writeFileSync(path.join(ASSETS, 'icon.png'), PNG.sync.write(downscale(true)));
fs.writeFileSync(path.join(ASSETS, 'adaptive-icon.png'), PNG.sync.write(downscale(true)));
console.log(`wrote icon.png + adaptive-icon.png (${OUT}x${OUT}) from ${path.basename(SRC)}`);
