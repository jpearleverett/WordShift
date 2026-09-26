// Copy the finished cinematic trailer into its dated delivery folder, with the stills
// and caption formats a YouTube upload wants.
//
//   node scripts/store/cinematic/deliver.mjs [--dir=<folder>] [--web=<folder>]
//
// Reads the final (non-draft) masters, captions and QA report from out/, and the rendered
// frames from $CINEMATIC_WORK/frames-<aspect>/. Writes, into --dir (default
// mobile/assets/Play_store/cinematic-2026-09/):
//   wordshift-cinematic-16x9-1920x1080.mp4, wordshift-cinematic-9x16-1080x1920.mp4
//   captions-en.srt, captions-en.vtt, trailer-report.json
//   poster-16x9-1920x1080.png, poster-9x16-1080x1920.png   (the end card, fully settled)
//   youtube-thumbnail-1280x720.png                          (the same frame, 1280x720)
// With --web, also writes small H.264 previews (720p and 540x960) and the VTT there, for
// a screening page; those are never delivered.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const sharp = createRequire(import.meta.url)('sharp');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORK = process.env.CINEMATIC_WORK || '/tmp/wordshift-cinematic';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const opt = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const DIR = path.resolve(opt.dir || path.join(HERE, '../../../assets/Play_store/cinematic-2026-09'));
const OUT = path.join(HERE, 'out');

// the poster frame: the end card after MOSTLY has clicked home and settled (38.5 s)
const POSTER_FRAME = Math.round(38.5 * 30);

const MASTERS = {
  '16x9': 'wordshift-cinematic-16x9-1920x1080.mp4',
  '9x16': 'wordshift-cinematic-9x16-1080x1920.mp4',
};
for (const f of Object.values(MASTERS)) {
  if (!fs.existsSync(path.join(OUT, f))) { console.error(`missing ${f}: render and encode the finals first`); process.exit(1); }
}
const report = path.join(OUT, 'trailer-report.json');
if (!fs.existsSync(report)) { console.error('missing out/trailer-report.json: run qa/report.mjs on the finals first'); process.exit(1); }
if (JSON.parse(fs.readFileSync(report, 'utf8')).ok !== true) console.warn('warning: the QA report does not pass');

fs.mkdirSync(DIR, { recursive: true });
for (const f of Object.values(MASTERS)) fs.copyFileSync(path.join(OUT, f), path.join(DIR, f));
fs.copyFileSync(report, path.join(DIR, 'trailer-report.json'));

// captions: SRT as written by srt.mjs, and the same cues as WebVTT
const srt = fs.readFileSync(path.join(OUT, 'wordshift-cinematic-captions-en.srt'), 'utf8');
fs.writeFileSync(path.join(DIR, 'captions-en.srt'), srt);
const vtt = 'WEBVTT\n\n' + srt.replace(/^\d+\n/gm, '').replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2');
fs.writeFileSync(path.join(DIR, 'captions-en.vtt'), vtt);

// stills from the rendered frames (the masters' own pixels, before compression)
const frame = (aspect) => path.join(WORK, `frames-${aspect}`, String(POSTER_FRAME).padStart(5, '0') + '.jpg');
await sharp(frame('16x9')).png({ compressionLevel: 9 }).toFile(path.join(DIR, 'poster-16x9-1920x1080.png'));
await sharp(frame('9x16')).png({ compressionLevel: 9 }).toFile(path.join(DIR, 'poster-9x16-1080x1920.png'));
await sharp(frame('16x9')).resize(1280, 720, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(path.join(DIR, 'youtube-thumbnail-1280x720.png'));

if (opt.web) {
  const WEB = path.resolve(opt.web);
  fs.mkdirSync(WEB, { recursive: true });
  const small = (src, dst, w, h) => execFileSync(FFMPEG, [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(OUT, src),
    '-vf', `scale=${w}:${h}:flags=lanczos,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-profile:v', 'high',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', path.join(WEB, dst),
  ], { stdio: 'inherit' });
  small(MASTERS['16x9'], 'trailer-16x9-720p.mp4', 1280, 720);
  small(MASTERS['9x16'], 'trailer-9x16-540x960.mp4', 540, 960);
  fs.writeFileSync(path.join(WEB, 'captions-en.vtt'), vtt);
  await sharp(frame('16x9')).resize(1280, 720, { kernel: 'lanczos3' }).jpeg({ quality: 86 }).toFile(path.join(WEB, 'poster-16x9.jpg'));
  await sharp(frame('9x16')).resize(540, 960, { kernel: 'lanczos3' }).jpeg({ quality: 86 }).toFile(path.join(WEB, 'poster-9x16.jpg'));
  for (const f of fs.readdirSync(WEB)) console.log(path.join(WEB, f), (fs.statSync(path.join(WEB, f)).size / 1e6).toFixed(2) + ' MB');
}

for (const f of fs.readdirSync(DIR)) console.log(path.join(DIR, f), (fs.statSync(path.join(DIR, f)).size / 1e6).toFixed(2) + ' MB');
