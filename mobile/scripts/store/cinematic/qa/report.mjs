// The QA gates of spec 7.2 over the delivered files, written to out/trailer-report.json.
//
//   node scripts/store/cinematic/qa/report.mjs [--draft] [--skip=determinism,overlay,probes]
//
// Gates: copy/words/assets/determinism-source (qa/lint.mjs), overlay safe zones (every
// frame, both aspects, from the overlay's inked boxes), luma from 20.4 s (YAVG >= 72 and
// the darkest 2% >= 18, measured on the encoded MP4s), outputs (ffmpeg stream info), audio (EBU R128,
// true peak, silences, duration) and determinism (four frames rendered by two separate
// browser processes must match).

import { Buffer } from 'node:buffer';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import lint from './lint.mjs';
import { serve, launch, openTrailer, WORK } from '../render.mjs';
import { GRID } from '../src/grid.js';
import { E, DURATION, FPS } from '../src/timeline/events.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../out');
const argv = process.argv.slice(2);
const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const skip = new Set(String(opt.skip || '').split(',').filter(Boolean));
const draft = !!opt.draft;
const TOTAL = Math.round(DURATION * FPS);
const MP4 = {
  '16x9': path.join(OUT, `wordshift-cinematic-16x9-1920x1080${draft ? '-draft' : ''}.mp4`),
  '9x16': path.join(OUT, `wordshift-cinematic-9x16-1080x1920${draft ? '-draft' : ''}.mp4`),
};
const report = { generated: 'qa/report.mjs', draft, duration: DURATION, fps: FPS, grid: GRID, events: E, gates: {} };
const gate = (name, ok, details) => { report.gates[name] = { ok, ...details }; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`, JSON.stringify(details).slice(0, 400)); };
const sh = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
const shErr = (cmd, args) => String(spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 28 }).stderr || '');

// ---- 1, 2, 3, 7a: copy, words, assets, source determinism
gate('lint', lint.ok, { failures: lint.failures, counts: lint.counts });

// ---- 6: overlay bounds, every frame
if (!skip.has('overlay')) {
  const server = await serve(); const port = server.address().port;
  const browser = await launch();
  try {
    for (const aspect of ['16x9', '9x16']) {
      const page = await openTrailer(browser, port, aspect, 1);
      const bad = await page.evaluate(([total, fps, portrait]) => {
        const out = [];
        for (let f = 0; f < total; f++) {
          for (const b of window.TRAILER.overlayAt(f / fps)) {
            const off = portrait ? (b.x0 < 96 || b.x1 > 918 || b.y0 < 200 || b.y1 > 1440) : (b.y1 > 972 || b.x0 < 0 || b.x1 > 1920 || b.y0 < 0);
            if (off) out.push({ f, t: +(f / fps).toFixed(3), name: b.name, box: [b.x0, b.y0, b.x1, b.y1].map((v) => Math.round(v)) });
          }
        }
        return out;
      }, [TOTAL, FPS, aspect === '9x16']);
      const names = [...new Set(bad.map((b) => b.name))];
      gate(`overlay-${aspect}`, bad.length === 0, { frames: new Set(bad.map((b) => b.f)).size, items: names, first: bad.slice(0, 6) });
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
}

// ---- 5 and 4c: tile swatches (dE2000 vs spec 2.2) and room windows (luma >= 40), sampled on
// the encoded files at points the page projects for that frame
if (!skip.has('probes')) {
  const { deltaE2000 } = await import('./swatch.mjs');
  const sharp = (await import('sharp')).default;
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lab = ([r, g, b]) => {
    const [R, G, B] = [lin(r), lin(g), lin(b)];
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
    const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
  };
  const TILE_T = [15, 87], TILE_INFO = [369, 402, 432, 1167], WIN_T = [615, 915, 1005];
  const server = await serve(); const port = server.address().port;
  const browser = await launch();
  try {
    for (const [aspect, file] of Object.entries(MP4)) {
      if (!fs.existsSync(file)) continue;
      const page = await openTrailer(browser, port, aspect, 1);
      const frameAt = async (f) => {
        const png = execFileSync('ffmpeg', ['-hide_banner', '-v', 'error', '-ss', String(f / FPS + 0.001), '-i', file, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-'], { maxBuffer: 1 << 28 });
        return sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      };
      const patch = ({ data, info }, x, y, r) => {
        const sum = [0, 0, 0]; let n = 0;
        for (let j = y - r; j <= y + r; j++) for (let i = x - r; i <= x + r; i++) {
          if (i < 0 || j < 0 || i >= info.width || j >= info.height) continue;
          const o = (j * info.width + i) * info.channels; sum[0] += data[o]; sum[1] += data[o + 1]; sum[2] += data[o + 2]; n++;
        }
        return sum.map((v) => v / Math.max(1, n));
      };
      const tileRows = [];
      for (const f of [...TILE_T, ...TILE_INFO]) {
        const pr = await page.evaluate((t) => window.TRAILER.probesAt(t), f / FPS);
        const img = await frameAt(f);
        for (const tl of pr.tiles) {
          const got = patch(img, tl.x, tl.y, Math.min(6, tl.px));
          tileRows.push({ f, gate: TILE_T.includes(f), ch: tl.ch, locked: tl.locked, want: tl.hex, got: '#' + got.map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''), dE: +deltaE2000(lab(got), lab(hexRgb(tl.hex))).toFixed(2) });
        }
      }
      const gated = tileRows.filter((r) => r.gate).map((r) => r.dE).sort((a, b) => a - b);
      const med = gated.length ? gated[Math.floor(gated.length / 2)] : NaN;
      gate(`swatch-${aspect}`, gated.length > 0 && med <= 6 && gated[gated.length - 1] <= 10, { tilesAtGate: gated.length, medianDE: med, maxDE: gated[gated.length - 1], samples: tileRows });
      const winRows = [];
      for (const f of WIN_T) {
        const pr = await page.evaluate((t) => window.TRAILER.probesAt(t), f / FPS);
        const img = await frameAt(f);
        for (const w of pr.windows) {
          const [r, g, b] = patch(img, w.x, w.y, 3);
          winRows.push({ f, room: w.room, luma: +(0.2126 * r + 0.7152 * g + 0.0722 * b).toFixed(1) });
        }
      }
      gate(`windows-${aspect}`, winRows.length > 0 && winRows.every((w) => w.luma >= 40), { minLuma: Math.min(...winRows.map((w) => w.luma)), below40: winRows.filter((w) => w.luma < 40), count: winRows.length });
      await page.close();
    }
  } finally { await browser.close(); server.close(); }
}

// ---- 7b: determinism across processes
if (!skip.has('determinism')) {
  const frames = [0, 400, 800, TOTAL - 1];
  const grabs = [];
  for (let run = 0; run < 2; run++) {
    const server = await serve(); const port = server.address().port;
    const browser = await launch();
    try {
      const page = await openTrailer(browser, port, '16x9', 0.5);
      const shots = [];
      // walk in a different order each run so no state can carry between frames
      for (const f of run ? frames.slice().reverse() : frames) {
        const png = await page.evaluate(async (t) => { await window.TRAILER.renderAt(t); return window.TRAILER.grab(1); }, f / FPS);
        shots.push([f, png]);
      }
      grabs.push(Object.fromEntries(shots));
    } finally { await browser.close(); server.close(); }
  }
  const sharp = (await import('sharp')).default;
  const res = [];
  for (const f of frames) {
    const [a, b] = await Promise.all(grabs.map((g) => sharp(Buffer.from(g[f], 'base64')).raw().toBuffer()));
    let se = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; se += d * d; }
    const mse = se / a.length;
    res.push({ f, psnr: mse === 0 ? Infinity : +(10 * Math.log10(255 * 255 / mse)).toFixed(2) });
  }
  gate('determinism', res.every((r) => r.psnr >= 55), { frames: res.map((r) => ({ ...r, psnr: String(r.psnr) })) });
}

// ---- 4 and 10: luma and outputs, on the encoded files
for (const [aspect, file] of Object.entries(MP4)) {
  if (!fs.existsSync(file)) { gate(`outputs-${aspect}`, false, { missing: path.basename(file) }); continue; }
  const info = shErr('ffmpeg', ['-hide_banner', '-i', file]);
  const vline = (info.match(/Stream #0:\d+.*Video: .*/) || [''])[0];
  const aline = (info.match(/Stream #0:\d+.*Audio: .*/) || [''])[0];
  const [, vw, vh] = vline.match(/, (\d{3,5})x(\d{3,5})/) || [];
  const packets = sh('ffmpeg', ['-hide_banner', '-v', 'error', '-i', file, '-map', '0:v', '-c', 'copy', '-f', 'framecrc', '-']);
  const frames = packets.split('\n').filter((l) => /^0,/.test(l)).length;
  const [W, H] = aspect === '9x16' ? [1080, 1920] : [1920, 1080];
  const head = fs.readFileSync(file).subarray(0, 1 << 16).toString('latin1');
  const faststart = head.indexOf('moov') >= 0 && (head.indexOf('mdat') < 0 || head.indexOf('moov') < head.indexOf('mdat'));
  const dm = info.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const out = {
    file: path.basename(file), bytes: fs.statSync(file).size, width: Number(vw), height: Number(vh),
    fps: (vline.match(/([\d.]+) fps/) || [])[1], frames, profile: (vline.match(/h264 \(([^)]+)\)/) || [])[1],
    color: (vline.match(/yuv420p\(([^)]*)\)/) || [])[1], faststart,
    audio: aline ? aline.replace(/.*Audio: /, '') : null, duration: dm ? Number(dm[1]) * 3600 + Number(dm[2]) * 60 + Number(dm[3]) : null,
  };
  const ok = out.width === W && out.height === H && out.fps === '30' && out.frames === TOTAL && /tv, bt709/.test(out.color || '') && faststart && !!aline;
  gate(`outputs-${aspect}`, ok, out);

  // per-frame YAVG (TV range, as signalstats reports it) and the darkest 2% of a 192-px thumbnail
  const stats = sh('ffmpeg', ['-hide_banner', '-v', 'error', '-ss', '20.4', '-i', file, '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-']);
  const yavg = [...stats.matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
  const tw = 192, th = aspect === '9x16' ? 342 : 108;
  const raw = execFileSync('ffmpeg', ['-hide_banner', '-v', 'error', '-ss', '20.4', '-i', file, '-vf', `scale=${tw}:${th},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
  const n = tw * th, dark = [];
  for (let o = 0; o + n <= raw.length; o += n) {
    const px = Array.from(raw.subarray(o, o + n)).sort((x, y) => x - y);
    const k = Math.max(1, Math.floor(n * 0.02));
    let s = 0; for (let i = 0; i < k; i++) s += px[i];
    dark.push(s / k);
  }
  const lowY = yavg.map((y, i) => ({ t: +(20.4 + i / FPS).toFixed(2), y })).filter((x) => x.y < 72);
  const lowD = dark.map((d, i) => ({ t: +(20.4 + i / FPS).toFixed(2), d: +d.toFixed(1) })).filter((x) => x.d < 18);
  gate(`luma-${aspect}`, lowY.length === 0 && lowD.length === 0 && yavg.length > 0, {
    frames: yavg.length, minYAVG: +Math.min(...yavg).toFixed(2), meanYAVG: +(yavg.reduce((p, c) => p + c, 0) / yavg.length).toFixed(2),
    minDark2: +Math.min(...dark).toFixed(2), belowYAVG: lowY.slice(0, 8), belowDark: lowD.slice(0, 8),
  });
}

// ---- 9: audio, on the mixed score
const wav = path.join(WORK, 'score.wav');
if (fs.existsSync(wav)) {
  const r128 = shErr('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const I = Number((r128.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop()?.match(/-?[\d.]+/)[0]);
  const TP = Number((r128.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop()?.match(/-?[\d.]+/)[0]);
  const sil = shErr('ffmpeg', ['-hide_banner', '-nostats', '-i', wav, '-af', 'silencedetect=noise=-50dB:d=0.3', '-f', 'null', '-']);
  const silences = [...sil.matchAll(/silence_start: ([\d.]+)/g)].map((m) => Number(m[1])).filter((t) => t < DURATION - 0.75);
  const dm = shErr('ffmpeg', ['-hide_banner', '-i', wav]).match(/Duration: (\d+):(\d+):([\d.]+)/);
  const dur = dm ? Number(dm[1]) * 3600 + Number(dm[2]) * 60 + Number(dm[3]) : NaN;
  gate('audio', Math.abs(I + 14) <= 0.5 && TP <= -1.0 && silences.length === 0 && Math.abs(dur - DURATION) <= 0.001, { integratedLUFS: I, truePeak: TP, silencesBelow50dB: silences, duration: dur });
} else gate('audio', false, { missing: wav });

// ---- 8: sync, from the score's beat-sync report if present
const syncFile = process.env.CINEMATIC_SYNC || '/tmp/wordshift-cinematic-score/sync.txt';
if (fs.existsSync(syncFile)) report.sync = fs.readFileSync(syncFile, 'utf8').split('\n').filter(Boolean);

report.ok = Object.values(report.gates).every((g) => g.ok);
fs.mkdirSync(OUT, { recursive: true });
const dest = path.join(OUT, `trailer-report${draft ? '-draft' : ''}.json`);
fs.writeFileSync(dest, JSON.stringify(report, null, 1));
console.log(report.ok ? 'ALL GATES PASS' : 'SOME GATES FAIL', dest);
