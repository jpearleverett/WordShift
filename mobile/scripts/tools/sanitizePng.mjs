/**
 * sanitizePng.mjs — re-encode an image as a clean 8-bit RGBA PNG.
 *
 * Editing art in Google Photos (or most phone photo editors) and saving it as a
 * ".png" produces a file with an embedded color profile (iCCP), EXIF (eXIf), or
 * — worse — JPEG bytes under a .png name. AAPT2's PNG cruncher (libpng) rejects
 * all of these during an Android release build with the opaque error:
 *
 *     AAPT: error: file failed to compile.
 *
 * This script decodes any such file (jimp-compact reads PNG *and* JPEG) and
 * rewrites it in place through pngjs as a minimal PNG with only IHDR / IDAT /
 * IEND chunks — the same shape processRawWorldArt.mjs emits and AAPT accepts.
 * Pixels are preserved; only the metadata AAPT chokes on is stripped.
 *
 * Usage (run from mobile/):
 *   node scripts/tools/sanitizePng.mjs assets/environment/foundation_0.png [more.png ...]
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import Jimp from 'jimp-compact';

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node scripts/tools/sanitizePng.mjs <file.png> [more.png ...]');
  process.exit(1);
}

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.error(`skip (not found): ${file}`);
    process.exitCode = 1;
    continue;
  }
  const img = await Jimp.read(file); // decodes PNG or JPEG-renamed-.png
  const { width, height, data } = img.bitmap; // always RGBA
  const png = new PNG({ width, height });
  data.copy(png.data);
  const out = PNG.sync.write(png, { colorType: 6 });
  fs.writeFileSync(file, out);
  console.log(
    `sanitized ${path.basename(file)} -> ${width}x${height}, ${out.length} bytes (IHDR/IDAT/IEND only)`
  );
}
