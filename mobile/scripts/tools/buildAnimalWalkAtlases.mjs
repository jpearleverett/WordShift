#!/usr/bin/env node
/**
 * Build the eight-frame character walk atlases from the authored source sheets.
 *
 * node scripts/tools/buildAnimalWalkAtlases.mjs [animal ...] [--check]
 * node scripts/tools/buildAnimalWalkAtlases.mjs --import /path/to/imagegen-metadata [animal ...]
 *
 * This is asset preparation only: remove the flat chroma backing, apply a single
 * scale and horizontal anchor to each cycle, and pack transparent 256px cells.
 * Existing idle, talk, robed and fox artwork is never modified.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RAW_DIR = path.join(ROOT, 'assets/raw/animal_walk_sheets');
const MANIFEST_PATH = path.join(RAW_DIR, 'manifest.json');
const CELL_SIZE = 256;
const COLUMNS = 4;
const ROWS = 2;
const GUTTER = 3;
const ANIMALS = [
  'owl', 'pangolin', 'capybara', 'fennec_fox', 'sloth', 'wombat',
  'rabbit', 'red_panda', 'tarsier', 'aye_aye', 'kakapo',
];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

function bounds(image) {
  let left = image.width, top = image.height, right = -1, bottom = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3] < 128) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error('A frame contains no visible pixels');
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
}

/** Remove only saturated magenta and its connected antialiased edge fringe. */
function extractCell(sheet, column, row) {
  // Image generation can return 1774×887 instead of the requested 2048×1024.
  // Proportional boundaries retain every source pixel without overlapping cells.
  const left = Math.round(column * sheet.width / COLUMNS);
  const top = Math.round(row * sheet.height / ROWS);
  const width = Math.round((column + 1) * sheet.width / COLUMNS) - left;
  const height = Math.round((row + 1) * sheet.height / ROWS) - top;
  const frame = new PNG({ width, height });
  PNG.bitblt(sheet, frame, left, top, width, height, 0, 0);
  const removed = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0, tail = 0;
  for (let i = 0; i < removed.length; i++) {
    const p = i * 4;
    const r = frame.data[p], g = frame.data[p + 1], b = frame.data[p + 2];
    if (frame.data[p + 3] < 128 || (r > 180 && b > 180 && g < 100 && Math.min(r, b) - g > 110)) {
      removed[i] = 1;
      queue[tail++] = i;
    }
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % width, y = Math.floor(i / width);
    const adjacent = [];
    if (x > 0) adjacent.push(i - 1);
    if (x + 1 < width) adjacent.push(i + 1);
    if (y > 0) adjacent.push(i - width);
    if (y + 1 < height) adjacent.push(i + width);
    for (const n of adjacent) {
      if (removed[n]) continue;
      const p = n * 4;
      const r = frame.data[p], g = frame.data[p + 1], b = frame.data[p + 2];
      // A neutral dark outline can acquire magenta at its antialiased edge.
      // The connectivity requirement protects isolated muted clothing colors.
      if (Math.min(r, b) - g > 30 && r > 65 && b > 65 && Math.abs(r - b) < 110) {
        removed[n] = 1;
        queue[tail++] = n;
      }
    }
  }
  for (let i = 0; i < removed.length; i++) {
    const p = i * 4;
    if (removed[i]) frame.data.fill(0, p, p + 4);
    else frame.data[p + 3] = 255;
  }
  const box = bounds(frame);
  if (box.left < 2 || box.top < 2 || box.right > width - 3 || box.bottom > height - 3) {
    throw new Error(`Source character touches its cell edge: column ${column + 1}, row ${row + 1}`);
  }
  return { image: frame, bounds: box };
}

function crop(image, box) {
  const result = new PNG({ width: box.width, height: box.height });
  PNG.bitblt(image, result, box.left, box.top, box.width, box.height, 0, 0);
  return result;
}

function assertGeometry(atlas, targetBaseline, name) {
  const hashes = new Set();
  const boxes = [];
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const frame = new PNG({ width: CELL_SIZE, height: CELL_SIZE });
      PNG.bitblt(atlas, frame, column * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE, 0, 0);
      const box = bounds(frame);
      if (box.left < GUTTER || box.top < GUTTER || box.right >= CELL_SIZE - GUTTER || box.bottom >= CELL_SIZE - GUTTER) {
        throw new Error(`${name}: frame ${boxes.length + 1} has no transparent gutter`);
      }
      if (box.bottom !== targetBaseline) throw new Error(`${name}: feet moved from the idle baseline`);
      hashes.add(sha256(frame.data));
      boxes.push(box);
    }
  }
  if (hashes.size !== COLUMNS * ROWS) throw new Error(`${name}: expected eight distinct frames, found ${hashes.size}`);
  return boxes;
}

async function build(record, check) {
  const sourceBytes = fs.readFileSync(path.join(RAW_DIR, record.source));
  if (sha256(sourceBytes) !== record.sourceSha256) throw new Error(`${record.type}: authored source checksum changed`);
  const sheet = PNG.sync.read(sourceBytes);
  if (Math.abs(sheet.width / sheet.height - 2) > 0.01) throw new Error(`${record.type}: expected a 4×2 sheet with square cells`);
  const idleBytes = fs.readFileSync(path.join(ROOT, 'assets/characters', record.type, 'idle.png'));
  const idle = PNG.sync.read(idleBytes);
  const idleBox = bounds(idle);
  const frames = [];
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) frames.push(extractCell(sheet, column, row));
  }

  // One scale for the complete cycle preserves consistent head/body proportions.
  // One shared x anchor also preserves the authored tail and arm motion; each
  // frame is not independently recentered to its changing silhouette.
  const sourceAnchor = median(frames.map(({ bounds: b }) => (b.left + b.right + 1) / 2));
  let idleAnchor = (idleBox.left + idleBox.right + 1) / 2;
  if (record.idleFacing === 'left') idleAnchor = idle.width - idleAnchor;
  const targetAnchor = idleAnchor / idle.width * CELL_SIZE;
  const targetBaseline = Math.round((idleBox.bottom + 1) / idle.height * CELL_SIZE) - 1;
  const targetHeight = idleBox.height / idle.height * CELL_SIZE;
  const maxHeight = Math.max(...frames.map(({ bounds: b }) => b.height));
  const maxLeft = Math.max(...frames.map(({ bounds: b }) => sourceAnchor - b.left));
  const maxRight = Math.max(...frames.map(({ bounds: b }) => b.right + 1 - sourceAnchor));
  const requestedScale = targetHeight / median(frames.map(({ bounds: b }) => b.height));
  const scale = Math.min(
    requestedScale,
    (targetAnchor - GUTTER - 1) / maxLeft,
    (CELL_SIZE - GUTTER - 1 - targetAnchor) / maxRight,
    (targetBaseline - GUTTER) / maxHeight,
  );
  if (scale < requestedScale * 0.95) {
    console.warn(`${record.type}: scale reduced ${(100 * (1 - scale / requestedScale)).toFixed(1)}% to retain ears/tail within the frame`);
  }
  const atlas = new PNG({ width: CELL_SIZE * COLUMNS, height: CELL_SIZE * ROWS });
  for (let i = 0; i < frames.length; i++) {
    const { image, bounds: box } = frames[i];
    const source = crop(image, box);
    const width = Math.max(1, Math.round(box.width * scale));
    const height = Math.max(1, Math.round(box.height * scale));
    const resizedBytes = await sharp(PNG.sync.write(source))
      .resize(width, height, { kernel: 'nearest', fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer();
    const resized = new PNG({ width, height });
    resized.data = resizedBytes;
    const resizedBox = bounds(resized);
    const x = Math.round(targetAnchor + (box.left - sourceAnchor) * scale);
    // Nearest sampling can omit a one-pixel toe at the source crop's bottom.
    // Align the surviving visible foot, not the potentially empty last row.
    const y = targetBaseline - resizedBox.bottom;
    PNG.bitblt(resized, atlas, 0, 0, width, height, (i % COLUMNS) * CELL_SIZE + x, Math.floor(i / COLUMNS) * CELL_SIZE + y);
  }
  const boxes = assertGeometry(atlas, targetBaseline, record.type);
  const encoded = PNG.sync.write(atlas, { colorType: 6, inputColorType: 6 });
  const outputPath = path.join(ROOT, 'assets/characters', record.type, 'walk.png');
  if (check) {
    if (!fs.existsSync(outputPath) || !fs.readFileSync(outputPath).equals(encoded)) {
      throw new Error(`${record.type}: walk.png is stale; rerun the atlas builder`);
    }
  } else fs.writeFileSync(outputPath, encoded);
  console.log(`${record.type}: ${check ? 'verified' : 'built'} 8 distinct frames; baseline=${targetBaseline}; heights=${boxes.map((b) => b.height).join(',')}; ${(encoded.length / 1024).toFixed(1)}KB`);
}

const args = process.argv.slice(2);
const check = args.includes('--check');
let importDir;
const requested = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--check') continue;
  if (args[i] === '--import') {
    importDir = args[++i];
    if (!importDir) throw new Error('--import requires a metadata directory');
  } else {
    if (!ANIMALS.includes(args[i])) throw new Error(`Unknown walk animal or option: ${args[i]}`);
    requested.push(args[i]);
  }
}
if (check && importDir) throw new Error('--check cannot import or change authored sources');
fs.mkdirSync(RAW_DIR, { recursive: true });
const manifest = fs.existsSync(MANIFEST_PATH) ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) : {
  version: 1,
  description: 'Authored right-facing eight-pose walks; raw 4×2 sheets retain the original image generation output and prompt.',
  atlas: { columns: COLUMNS, rows: ROWS, frameWidth: CELL_SIZE, frameHeight: CELL_SIZE },
  animals: [],
};
if (importDir) {
  for (const file of fs.readdirSync(importDir).filter((name) => name.endsWith('.json'))) {
    const metadata = JSON.parse(fs.readFileSync(path.join(importDir, file), 'utf8'));
    const type = metadata.type ?? metadata.animal;
    if (!ANIMALS.includes(type) || (requested.length && !requested.includes(type))) continue;
    if (!metadata.prompt || !metadata.generatedPath) throw new Error(`${file}: missing prompt or generatedPath`);
    const bytes = fs.readFileSync(metadata.generatedPath);
    const record = {
      type,
      source: `${type}.png`,
      sourceSha256: sha256(bytes),
      sourceFacing: 'right',
      idleFacing: type === 'fennec_fox' ? 'left' : 'right',
      reference: `../../characters/${type}/idle.png`,
      prompt: metadata.prompt,
    };
    fs.writeFileSync(path.join(RAW_DIR, record.source), bytes);
    manifest.animals = [...manifest.animals.filter((item) => item.type !== type), record];
  }
  manifest.animals.sort((a, b) => ANIMALS.indexOf(a.type) - ANIMALS.indexOf(b.type));
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}
const selected = requested.length ? requested : ANIMALS;
for (const type of selected) {
  const record = manifest.animals.find((item) => item.type === type);
  if (!record) throw new Error(`${type}: no authored sheet in the manifest`);
  await build(record, check);
}
