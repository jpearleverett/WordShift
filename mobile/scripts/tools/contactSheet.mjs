/**
 * contactSheet.mjs — tile a directory of icon PNGs into ONE sheet for review.
 *
 * Generated art has to be LOOKED at, not just diffed. This lays a folder out on a
 * neutral ground at a legible zoom so a whole batch can be judged in a single
 * glance, and deliberately prints NO labels on the sheet itself: a reviewer who
 * can read "Ember-warm" under a picture will see Ember-warm whether or not the
 * drawing communicates it. The filename order is echoed to stdout instead, so a
 * grader can be told what SHOULD be there only after they have said what they see.
 *
 * Usage (from mobile/):
 *   node scripts/tools/contactSheet.mjs <srcDir> <outPng> [zoom] [cols]
 *   node scripts/tools/contactSheet.mjs assets/ui/shop /tmp/sheet.png 3 6
 *
 * Requires sharp (build-time only, like encodeBackgroundsWebp.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

sharp.cache(false);

const [, , srcDir, outPng, zoomArg, colsArg] = process.argv;
if (!srcDir || !outPng) {
  console.error('usage: node scripts/tools/contactSheet.mjs <srcDir> <outPng> [zoom] [cols]');
  process.exit(1);
}
const ZOOM = Number(zoomArg) || 3;
const COLS = Number(colsArg) || 6;
const GAP = 10;
// A mid neutral: light art and dark art both have to hold up against it, and it
// is not one of the game's own surface colours, so nothing is flattered by it.
const GROUND = { r: 118, g: 118, b: 122 };

const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.png')).sort();
if (!files.length) {
  console.error(`no PNGs in ${srcDir}`);
  process.exit(1);
}

const tiles = [];
let cell = 0;
for (const f of files) {
  const buf = await sharp(path.join(srcDir, f)).metadata();
  cell = Math.max(cell, Math.max(buf.width, buf.height) * ZOOM);
}
for (const f of files) {
  const m = await sharp(path.join(srcDir, f)).metadata();
  tiles.push({
    f,
    buf: await sharp(path.join(srcDir, f))
      .resize(m.width * ZOOM, m.height * ZOOM, { kernel: 'nearest' })
      .png()
      .toBuffer(),
    w: m.width * ZOOM,
    h: m.height * ZOOM,
  });
}

const rows = Math.ceil(tiles.length / COLS);
const width = COLS * cell + GAP * (COLS + 1);
const height = rows * cell + GAP * (rows + 1);

await sharp({ create: { width, height, channels: 3, background: GROUND } })
  .composite(
    tiles.map((t, i) => ({
      input: t.buf,
      left: GAP + (i % COLS) * (cell + GAP) + Math.round((cell - t.w) / 2),
      top: GAP + Math.floor(i / COLS) * (cell + GAP) + Math.round((cell - t.h) / 2),
    })),
  )
  .png()
  .toFile(outPng);

console.log(`${outPng}  ${width}x${height}  ${tiles.length} tiles, ${COLS} per row, ${ZOOM}x`);
console.log('reading order (left to right, top to bottom):');
tiles.forEach((t, i) => console.log(`  ${String(i + 1).padStart(2)}. ${t.f}`));
