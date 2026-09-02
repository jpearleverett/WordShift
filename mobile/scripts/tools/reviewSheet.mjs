/**
 * reviewSheet.mjs — lay generated icons out at their REAL delivery sizes for a
 * blind art review.
 *
 * contactSheet.mjs shows a batch at a legible zoom on one neutral ground; this
 * tool answers the question that actually decides whether an icon ships: does it
 * still read once the row has shrunk it to 32dp / 64dp, over the game's cream
 * parchment AND its phase-4 ash paper? Each icon gets one ROW of four cells:
 *
 *   small@cream  small@ash  big@cream  big@ash
 *
 * "small" and "big" are the delivery pixel sizes (defaults 32 and 64). The icon
 * is downscaled to that size with a real resampler (the same loss a device
 * applies), then blown back up NEAREST so the sheet is legible without adding
 * detail the player would never see. Rows are numbered down the left edge;
 * nothing else is labelled, on purpose: a reviewer who can read a caption sees
 * the caption. The filename order goes to <outPrefix>_order.txt and stdout.
 *
 * Sheets are capped at ROWS_PER_SHEET rows so a viewer that downsizes a tall
 * image does not undo the whole point; a big batch yields _sheet_1.png,
 * _sheet_2.png, ... A native-size grid (<outPrefix>_full.png) is also written
 * for a style pass that needs to see the actual brushwork.
 *
 * Usage (from mobile/):
 *   node scripts/tools/reviewSheet.mjs <srcDir | a.png,b.png,...> <outPrefix> [smallPx] [bigPx]
 *
 * Requires sharp (build-time only, like contactSheet.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

sharp.cache(false);

const [, , src, outPrefix, smallArg, bigArg] = process.argv;
if (!src || !outPrefix) {
  console.error('usage: node scripts/tools/reviewSheet.mjs <srcDir|a.png,b.png> <outPrefix> [smallPx] [bigPx]');
  process.exit(1);
}
const SMALL = Number(smallArg) || 32;
const BIG = Number(bigArg) || 64;
const SMALL_ZOOM = 3;
const BIG_ZOOM = 2;
const CELL = 150;
const GUTTER = 8;
const NUM_COL = 44;
const ROWS_PER_SHEET = 7;
// The bright skin's parchment base and the phase-4 dark skin's ash paper, from
// generateUiPanels.mjs PALETTES — the two grounds every row art actually sits on.
const CREAM = { r: 0xf3, g: 0xe2, b: 0xbf };
const ASH = { r: 0x35, g: 0x2a, b: 0x31 };
const NEUTRAL = { r: 118, g: 118, b: 122 };

const files = src.includes(',')
  ? src.split(',').map(f => f.trim()).filter(Boolean)
  : fs.readdirSync(src).filter(f => f.endsWith('.png')).sort().map(f => path.join(src, f));
if (!files.length) {
  console.error(`no PNGs found in ${src}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(path.resolve(outPrefix)), { recursive: true });

/** Downscale to `px` (real resampling loss), then nearest-upscale by `zoom`. */
async function cellImage(file, px, zoom) {
  const small = await sharp(file).resize(px, px, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp(small).resize(px * zoom, px * zoom, { kernel: 'nearest' }).png().toBuffer();
}

/** A row number as an SVG label; returns null if this sharp cannot rasterize text. */
async function numberLabel(n) {
  try {
    const svg = `<svg width="${NUM_COL}" height="${CELL}" xmlns="http://www.w3.org/2000/svg">
      <text x="${NUM_COL / 2}" y="${CELL / 2 + 8}" font-family="sans-serif" font-size="22" font-weight="bold" fill="#e8e8ec" text-anchor="middle">${n}</text>
    </svg>`;
    return await sharp(Buffer.from(svg)).png().toBuffer();
  } catch {
    return null;
  }
}

const cellsPerRow = 4;
const width = NUM_COL + cellsPerRow * (CELL + GUTTER) + GUTTER;
const sheets = [];
for (let start = 0; start < files.length; start += ROWS_PER_SHEET) {
  const batch = files.slice(start, start + ROWS_PER_SHEET);
  const height = batch.length * (CELL + GUTTER) + GUTTER;
  const composites = [];
  for (let r = 0; r < batch.length; r++) {
    const file = batch[r];
    const top = GUTTER + r * (CELL + GUTTER);
    const label = await numberLabel(start + r + 1);
    if (label) composites.push({ input: label, left: 0, top });
    const specs = [
      { px: SMALL, zoom: SMALL_ZOOM, ground: CREAM },
      { px: SMALL, zoom: SMALL_ZOOM, ground: ASH },
      { px: BIG, zoom: BIG_ZOOM, ground: CREAM },
      { px: BIG, zoom: BIG_ZOOM, ground: ASH },
    ];
    for (let ci = 0; ci < specs.length; ci++) {
      const { px, zoom, ground } = specs[ci];
      const left = NUM_COL + GUTTER + ci * (CELL + GUTTER);
      const groundBuf = await sharp({ create: { width: CELL, height: CELL, channels: 3, background: ground } }).png().toBuffer();
      composites.push({ input: groundBuf, left, top });
      const img = await cellImage(file, px, zoom);
      const size = px * zoom;
      composites.push({ input: img, left: left + Math.round((CELL - size) / 2), top: top + Math.round((CELL - size) / 2) });
    }
  }
  const idx = sheets.length + 1;
  const out = files.length > ROWS_PER_SHEET ? `${outPrefix}_sheet_${idx}.png` : `${outPrefix}_sheet.png`;
  await sharp({ create: { width, height, channels: 3, background: NEUTRAL } }).composite(composites).png().toFile(out);
  sheets.push(out);
}

// Native-size grid for the style pass (numbered, neutral ground).
{
  const COLS = 6;
  let cell = 0;
  const metas = [];
  for (const f of files) {
    const m = await sharp(f).metadata();
    metas.push(m);
    cell = Math.max(cell, m.width, m.height);
  }
  const PAD = 12;
  const rows = Math.ceil(files.length / COLS);
  const gw = COLS * (cell + PAD) + PAD;
  const gh = rows * (cell + PAD + 28) + PAD;
  const composites = [];
  for (let i = 0; i < files.length; i++) {
    const left = PAD + (i % COLS) * (cell + PAD);
    const top = PAD + Math.floor(i / COLS) * (cell + PAD + 28);
    composites.push({ input: await sharp(files[i]).png().toBuffer(), left: left + Math.round((cell - metas[i].width) / 2), top: top + Math.round((cell - metas[i].height) / 2) });
    const label = await numberLabel(i + 1);
    if (label) composites.push({ input: await sharp(label).resize(NUM_COL, 28, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: left + Math.round(cell / 2) - NUM_COL / 2, top: top + cell });
  }
  await sharp({ create: { width: gw, height: gh, channels: 3, background: NEUTRAL } }).composite(composites).png().toFile(`${outPrefix}_full.png`);
}

const order = files.map((f, i) => `${String(i + 1).padStart(2)}. ${path.basename(f)}`).join('\n');
fs.writeFileSync(`${outPrefix}_order.txt`, order + '\n');
console.log(`review sheets: ${sheets.join(', ')}`);
console.log(`native grid:   ${outPrefix}_full.png`);
console.log(`row order written to ${outPrefix}_order.txt (${files.length} icons; small=${SMALL}px big=${BIG}px)`);
