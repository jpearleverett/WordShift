// Contact sheets of rendered frames for review.
//
//   node scripts/store/cinematic/sheet.mjs 16x9 --every=0.5 [--from=0 --to=40] [--cols=6] [--w=320] [--draft] [--out=file.png] [--labels=0]
//
// Reads $CINEMATIC_WORK/frames-<aspect>[-draft]/NNNNN.jpg.

import { Buffer } from 'node:buffer';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const WORK = process.env.CINEMATIC_WORK || '/tmp/wordshift-cinematic';
const argv = process.argv.slice(2);
const aspect = argv.find((a) => a === '16x9' || a === '9x16') || '16x9';
const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const dir = path.join(WORK, `frames-${aspect}${opt.draft ? '-draft' : ''}`);
const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
const every = Number(opt.every || 0.5);
const from = Number(opt.from || 0), to = Math.min(Number(opt.to || meta.total / meta.fps), meta.total / meta.fps);
const cols = Number(opt.cols || 6);
const w = Number(opt.w || (aspect === '9x16' ? 200 : 320));
const labels = opt.labels !== '0';
const frames = [];
for (let t = from; t < to - 1e-6; t += every) frames.push(Math.min(meta.total - 1, Math.round(t * meta.fps)));
const first = await sharp(path.join(dir, '00000.jpg')).metadata();
const h = Math.round(w * first.height / first.width);
const lab = labels ? 22 : 0;
const rows = Math.ceil(frames.length / cols);
const tiles = await Promise.all(frames.map(async (f, i) => {
  const img = await sharp(path.join(dir, String(f).padStart(5, '0') + '.jpg')).resize(w, h).toBuffer();
  const x = (i % cols) * (w + 6), y = Math.floor(i / cols) * (h + lab + 6);
  const parts = [{ input: img, left: x, top: y + lab }];
  if (labels) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${lab}"><text x="2" y="16" font-family="sans-serif" font-size="15" fill="#eee">${(f / meta.fps).toFixed(2)}s</text></svg>`;
    parts.push({ input: Buffer.from(svg), left: x, top: y });
  }
  return parts;
}));
const out = opt.out || path.join(WORK, `sheet-${aspect}-${from}-${to}.png`);
await sharp({ create: { width: cols * (w + 6), height: rows * (h + lab + 6), channels: 3, background: '#111' } })
  .composite(tiles.flat()).png().toFile(out);
console.log(out);
