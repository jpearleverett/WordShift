/**
 * normalizeRoomAspect.mjs — bring off-family room backgrounds onto the
 * 1456x720 room-family standard (aspect 2.022).
 *
 * The room-background family ships at 1456x720. Two rooms drifted:
 *   - assets/rooms/office.png  1092x534 (aspect 2.045 — the odd one out)
 *   - assets/rooms/jungle.png  1092x540 (2.022 aspect but half-res)
 *
 * This resizes both to exactly 1456x720 (office takes a ~1.1% vertical squish,
 * imperceptible; jungle is a clean upscale to family res) and re-encodes them
 * through pngjs as minimal IHDR/IDAT/IEND RGBA PNGs — the same clean shape
 * sanitizePng.mjs / processRawWorldArt.mjs emit and AAPT accepts.
 *
 * The true originals are copied to assets/raw/<name>_original.png BEFORE any
 * resize, and only if that backup does not already exist, so re-runs are
 * idempotent (a second run never backs up an already-normalized file).
 *
 * Usage (run from mobile/):
 *   node scripts/tools/normalizeRoomAspect.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import Jimp from 'jimp-compact';

const TARGET_W = 1456;
const TARGET_H = 720;

const ROOMS = path.join('assets', 'rooms');
const RAW = path.join('assets', 'raw');

const TARGETS = [
  { name: 'office', src: path.join(ROOMS, 'office.png'), backup: path.join(RAW, 'office_original.png') },
  { name: 'jungle', src: path.join(ROOMS, 'jungle.png'), backup: path.join(RAW, 'jungle_original.png') },
];

for (const { name, src, backup } of TARGETS) {
  if (!fs.existsSync(src)) {
    console.error(`skip (not found): ${src}`);
    process.exitCode = 1;
    continue;
  }

  // Idempotent backup: copy the true original once, before any resize.
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(src, backup);
    console.log(`backed up ${name} -> ${backup}`);
  } else {
    console.log(`backup already exists, leaving it: ${backup}`);
  }

  const img = await Jimp.read(src);
  const { width, height } = img.bitmap;
  if (width !== TARGET_W || height !== TARGET_H) {
    img.resize(TARGET_W, TARGET_H);
  }

  const { width: w, height: h, data } = img.bitmap; // RGBA
  const png = new PNG({ width: w, height: h });
  data.copy(png.data);
  const out = PNG.sync.write(png, { colorType: 6 });
  fs.writeFileSync(src, out);
  console.log(`normalized ${name} -> ${w}x${h}, ${out.length} bytes (IHDR/IDAT/IEND only)`);
}
