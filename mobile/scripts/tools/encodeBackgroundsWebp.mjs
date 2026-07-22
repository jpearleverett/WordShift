// encodeBackgroundsWebp.mjs — one-time asset transform: re-encode the 9
// full-screen background bitmaps (5 skies + 4 pit backgrounds) from truecolor
// PNG to WebP. These are the app's largest assets (~25MB of PNG); WebP q90
// takes them to ~3.5MB with no visible quality loss on the painterly art,
// cutting install size by ~21MB. Dimensions are preserved exactly (the sky
// seat-geometry contract in skyGeometry.test.ts depends on 941x1972), and the
// alpha channel is kept.
//
// NOT a runtime dependency: this needs `sharp` (native libvips), which is a
// build-time tool only. Install it ad hoc to regenerate:
//   npm i -D sharp && node scripts/tools/encodeBackgroundsWebp.mjs
// The .webp outputs are committed; the app never imports sharp.
//
// Only the full-screen backgrounds are converted. The smaller world-art PNGs
// (roof / foundation / pit_entrance / shadow_figure / wall) keep their precise
// alpha edges and tint compositing as PNG, where the size win is negligible and
// the artifact risk is not.

import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV = path.resolve(__dirname, '../../assets/environment');

const BACKGROUNDS = [
  'sky_day', 'sky_afternoon', 'sky_dusk', 'sky_storm', 'sky_shadow',
  'pitt_day', 'pitt_afternoon', 'pitt_dusk', 'pitt_night',
];

const QUALITY = 90;

async function main() {
  let pngTotal = 0;
  let webpTotal = 0;
  for (const name of BACKGROUNDS) {
    const src = path.join(ENV, `${name}.png`);
    const out = path.join(ENV, `${name}.webp`);
    const meta = await sharp(src).metadata();
    const info = await sharp(src).webp({ quality: QUALITY, effort: 6 }).toFile(out);
    // Round-trip guard: the WebP must decode back to identical dimensions, or
    // the sky seat math (and pit layout) would silently shift.
    const back = await sharp(out).metadata();
    if (back.width !== meta.width || back.height !== meta.height) {
      throw new Error(`${name}: dimension drift ${meta.width}x${meta.height} -> ${back.width}x${back.height}`);
    }
    const srcBytes = (await sharp(src).metadata()).size ?? 0;
    pngTotal += srcBytes;
    webpTotal += info.size;
    console.log(
      `${name}: ${meta.width}x${meta.height}  ${(srcBytes / 1024 / 1024).toFixed(2)}MB PNG -> ${(info.size / 1024 / 1024).toFixed(2)}MB WebP`
    );
  }
  console.log(
    `\nTotal: ${(pngTotal / 1024 / 1024).toFixed(1)}MB -> ${(webpTotal / 1024 / 1024).toFixed(1)}MB  (saved ${((pngTotal - webpTotal) / 1024 / 1024).toFixed(1)}MB)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
