/**
 * Installs a finished trailer2 build into the campaign's video/ folder.
 *
 *   node scripts/store/refresh/trailer2/install.mjs
 *
 * Run it after edit.mjs. It copies both cuts, the SRT and the build report
 * from $TRAILER2_WORK/out, renders the poster (the frame edit.mjs names in
 * report.marks.posterFrame: the L hovering over PANT's checked PLANT slot, as a
 * lossless composed frame rather than a decoded video frame), copies each
 * clip's events file without its
 * per-frame DOM probes, and rebuilds the YouTube thumbnail. Nothing in video/
 * is written by record.mjs or edit.mjs themselves.
 */
import { Buffer } from 'node:buffer';
import { spawnSync } from 'node:child_process';
import { copyFile, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORK, mobile } from './capture.mjs';
import { sharp, A } from './engine.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const CAMPAIGN = path.join(mobile, 'assets/Play_store/refresh-2026-09');
const VIDEO = path.join(CAMPAIGN, 'video');
const OUT = path.join(WORK, 'out');

// ---------------------------------------------------------------- cuts, SRT, report

for (const [from, to] of [
  ['trailer2-9x16-1080x1920.mp4', 'trailer-9x16-1080x1920.mp4'],
  ['trailer2-16x9-1920x1080.mp4', 'trailer-16x9-1920x1080.mp4'],
  ['captions2-en.srt', 'captions-en.srt'],
]) await copyFile(path.join(OUT, from), path.join(VIDEO, to));
const report = JSON.parse(await readFile(path.join(OUT, 'report.json'), 'utf8'));
const POSTER_FRAME = report.marks?.posterFrame ?? 33;

// ---------------------------------------------------------------- poster

const r = spawnSync(process.execPath, [path.join(here, 'edit.mjs'), `--frames=${POSTER_FRAME}`, '9x16'], { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);
const frame = path.join(OUT, 'frames', `f${String(POSTER_FRAME).padStart(4, '0')}.png`);
await sharp(frame).removeAlpha().png().toFile(path.join(VIDEO, 'poster-9x16-1080x1920.png'));

// ---------------------------------------------------------------- events

const clips = report.shots.flatMap(s => s.clips);
const wanted = [...new Set(clips.map(c => c.replace(/_.*$/, '')))].sort();
for (const f of await readdir(path.join(VIDEO, 'events'))) {
  if (f.endsWith('.json') && !wanted.includes(f.slice(0, -5))) await rm(path.join(VIDEO, 'events', f));
}
for (const id of wanted) {
  const ev = JSON.parse(await readFile(path.join(WORK, 'events', `${id}.json`), 'utf8'));
  delete ev.probes;
  ev.probesOmitted = 'Per-frame DOM probes (tile, label, pill, sheet and chrome boxes) stay with the frames in $TRAILER2_WORK/events; the edit reads them there.';
  await writeFile(path.join(VIDEO, 'events', `${id}.json`), JSON.stringify(ev, null, 1) + '\n');
}

// ---------------------------------------------------------------- YouTube thumbnail

/**
 * The YouTube thumbnail (1280x720): the cast painting FG-A uses
 * (assets/story/pages/witness-05.webp, picture only, the same tone), the
 * wordmark large at the bottom left, and the real PICK-row tiles spelling
 * PLANT (the moved L locked in) cropped from the stills capture
 * raw/s01-frame-b-after-move.png at the bottom right, clear of YouTube's
 * duration badge. The only words are the wordmark and PLANT, so it reads at
 * YouTube's small list sizes (about 168x94); PLAY on its own read as a Play
 * button next to YouTube's own. Both trailers open on that move.
 */
async function buildThumbnail() {
  const W = 1280, H = 720;
  const art = await sharp(A('story/pages/witness-05.webp')).resize(W, H, { kernel: 'lanczos3' })
    .gamma(1, 1.8).modulate({ saturation: 1.18, brightness: 1.04 }).removeAlpha().png().toBuffer();
  const scrim = Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0.55" stop-color="#3B2416" stop-opacity="0"/><stop offset="0.97" stop-color="#3B2416" stop-opacity="0.72"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/></svg>`);
  const mark = { width: 600, height: 150, left: 44, top: 540 };
  const markPng = await sharp(A('ui/wordmark.png')).resize(mark.width, mark.height, { kernel: 'lanczos3', fit: 'fill' }).png().toBuffer();
  // The PLANT PICK-row tiles (slot 01 frame B), cropped as FG-B crops them,
  // with the card's own rim colour. P L A Y alone read as a Play button.
  const raw = path.join(CAMPAIGN, 'raw/s01-frame-b-after-move.png');
  const prov = JSON.parse(await readFile(path.join(CAMPAIGN, 'raw/provenance.json'), 'utf8')).captures.find(c => c.file === 's01-frame-b-after-move.png');
  const t = prov.boxesCss.fgbTiles, panel = prov.boxesCss.fgbRowCardPanel, dpr = prov.deviceScaleFactor;
  const box = { left: Math.round((t.x - 10) * dpr), top: Math.round((t.y - 4) * dpr), width: Math.round((t.width + 20) * dpr), height: Math.round((t.height + 8) * dpr) };
  const { data, info } = await sharp(raw).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const k = (Math.round((panel.y + 1) * dpr) * info.width + Math.round((panel.x + panel.width / 2) * dpr)) * 3;
  const rim = 4, radius = 16, TW = 560, TH = Math.round((box.height * TW) / box.width);
  const inner = await sharp(raw).extract(box).resize(TW - 2 * rim, TH - 2 * rim, { kernel: 'lanczos3', fit: 'fill' }).png().toBuffer();
  const innerMask = Buffer.from(`<svg width="${TW - 2 * rim}" height="${TH - 2 * rim}"><rect width="${TW - 2 * rim}" height="${TH - 2 * rim}" rx="${radius - rim}" fill="#fff"/></svg>`);
  const tilesPng = await sharp(Buffer.from(`<svg width="${TW}" height="${TH}" xmlns="http://www.w3.org/2000/svg"><rect width="${TW}" height="${TH}" rx="${radius}" fill="rgb(${data[k]},${data[k + 1]},${data[k + 2]})"/></svg>`))
    .composite([{ input: await sharp(inner).ensureAlpha().composite([{ input: innerMask, blend: 'dest-in' }]).png().toBuffer(), left: rim, top: rim }]).png().toBuffer();
  const tiles = { width: TW, height: TH, left: W - TW - 60, top: H - TH - 60 };
  const shadow = await sharp(Buffer.from(`<svg width="${TW + 80}" height="${TH + 80}"><rect x="40" y="50" width="${TW}" height="${TH}" rx="${radius}" fill="#3B2416" fill-opacity="0.55"/></svg>`)).blur(12).png().toBuffer();
  const out = path.join(VIDEO, 'youtube-thumbnail-1280x720.png');
  await sharp(art).composite([
    { input: scrim, left: 0, top: 0 },
    { input: markPng, left: mark.left, top: mark.top },
    { input: shadow, left: tiles.left - 40, top: tiles.top - 40 },
    { input: tilesPng, left: tiles.left, top: tiles.top },
  ]).removeAlpha().png().toFile(out);
  return { file: path.relative(CAMPAIGN, out), art: 'assets/story/pages/witness-05.webp (picture only)', wordmark: mark, tiles: { ...tiles, source: 'raw/s01-frame-b-after-move.png (fgbTiles: PLANT)' } };
}

report.poster = { file: 'video/poster-9x16-1080x1920.png', frame: POSTER_FRAME };
report.thumbnail = await buildThumbnail();
await writeFile(path.join(VIDEO, 'trailer-report.json'), JSON.stringify(report, null, 1) + '\n');
console.log(`installed trailer2 into ${path.relative(mobile, VIDEO)} (events: ${wanted.join(' ')})`);
