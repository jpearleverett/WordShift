// Encode rendered frames + the mixed score into the delivery MP4s.
//
//   node scripts/store/cinematic/encode.mjs 16x9 [--draft] [--out=path.mp4]
//
// Reads $CINEMATIC_WORK/frames-<aspect>/NNNNN.jpg and $CINEMATIC_WORK/score.wav.
// H.264 High, yuv420p, BT.709 tagged, CRF 16, AAC 320k, +faststart.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WORK = process.env.CINEMATIC_WORK || '/tmp/wordshift-cinematic';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const HERE = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const aspect = argv.find((a) => a === '16x9' || a === '9x16') || '16x9';
const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const frames = path.join(WORK, `frames-${aspect}${opt.draft ? '-draft' : ''}`);
const meta = JSON.parse(fs.readFileSync(path.join(frames, 'meta.json'), 'utf8'));
const score = path.join(WORK, 'score.wav');
const [w, h] = aspect === '9x16' ? [1080, 1920] : [1920, 1080];
const out = opt.out || path.join(HERE, 'out', `wordshift-cinematic-${aspect === '9x16' ? '9x16-1080x1920' : '16x9-1920x1080'}${opt.draft ? '-draft' : ''}.mp4`);
fs.mkdirSync(path.dirname(out), { recursive: true });

const missing = [];
for (let f = 0; f < meta.total; f++) if (!fs.existsSync(path.join(frames, String(f).padStart(5, '0') + '.jpg'))) missing.push(f);
if (missing.length) { console.error(`${missing.length} frames missing, first ${missing.slice(0, 10).join(',')}`); process.exit(1); }

const args = [
  '-hide_banner', '-y',
  '-framerate', String(meta.fps), '-i', path.join(frames, '%05d.jpg'),
];
const hasScore = fs.existsSync(score) && !opt.silent;
if (hasScore) args.push('-i', score);
args.push(
  '-map', '0:v',
  ...(hasScore ? ['-map', '1:a'] : []),
  '-vf', `scale=${w}:${h}:flags=lanczos,format=yuv420p`,
  '-c:v', 'libx264', '-preset', opt.draft ? 'veryfast' : 'slow', '-crf', opt.draft ? '22' : '16',
  '-profile:v', 'high', '-maxrate', '24M', '-bufsize', '48M',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
  ...(hasScore ? ['-c:a', 'aac', '-b:a', '320k', '-ar', '48000', '-ac', '2'] : []),
  '-t', String(meta.total / meta.fps),
  '-movflags', '+faststart', out,
);
execFileSync(FFMPEG, args, { stdio: 'inherit' });
console.log(out, (fs.statSync(out).size / 1e6).toFixed(1) + ' MB');
