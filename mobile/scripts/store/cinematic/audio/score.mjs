// Render the trailer's soundtrack from the cue sheet in ../src/cues.js.
//
//   node scripts/store/cinematic/audio/score.mjs
//
// Writes $CINEMATIC_WORK/score.wav (48 kHz, 24-bit, loudness-normalised to
// -14 LUFS / -1 dBTP) and out/score.m4a for the real-time preview page.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from './synth.mjs';
import { decode, place, writeWav, loudnorm, peak } from './mix.mjs';
import { SCORE } from '../src/cues.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOBILE = path.resolve(HERE, '../../../..');
const WORK = process.env.CINEMATIC_WORK || '/tmp/wordshift-cinematic';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const SR = S.SR;
const TAU = Math.PI * 2;

const db = (x) => Math.pow(10, x / 20);

/** Piecewise-linear automation from [[t, v], ...]. */
function curve(points) {
  return (t) => {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      if (t <= points[i][0]) { const [t0, v0] = points[i - 1], [t1, v1] = points[i]; return v0 + (v1 - v0) * (t - t0) / (t1 - t0); }
    }
    return points[points.length - 1][1];
  };
}

/** Time-varying 2-pole low-pass (cutoff in Hz from `fc(t)`), in place. t0 = absolute start time. */
function lowpassInPlace(buf, fc, t0 = 0) {
  for (const ch of [buf.L, buf.R]) {
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < ch.length; i++) {
      const f = Math.min(20000, Math.max(40, fc(t0 + i / SR)));
      if (f >= 19999) { x2 = x1; x1 = ch[i]; y2 = y1; y1 = ch[i]; continue; }
      const w0 = TAU * f / SR, c = Math.cos(w0), a = Math.sin(w0) / (2 * 0.707);
      const b0 = (1 - c) / 2, b1 = 1 - c, b2 = (1 - c) / 2, a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
      const y = (b0 * ch[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
      x2 = x1; x1 = ch[i]; y2 = y1; y1 = y; ch[i] = y;
    }
  }
}

/** Gentle pitch wobble (vibrato) by a modulated fractional delay, in place. */
function vibratoInPlace(buf, { rate = 0.5, depthMs = 3 }) {
  const n = buf.L.length;
  for (const ch of [buf.L, buf.R]) {
    const src = ch.slice();
    for (let i = 0; i < n; i++) {
      const d = (1 + Math.sin(TAU * rate * i / SR)) * 0.5 * depthMs * SR / 1000 + 1;
      const j = i - d; const k = Math.floor(j); const f = j - k;
      ch[i] = k < 0 ? 0 : src[k] * (1 - f) + src[Math.min(n - 1, k + 1)] * f;
    }
  }
}

const cache = new Map();
function sfxFile(name) {
  if (!cache.has(name)) cache.set(name, decode(path.join(MOBILE, 'assets/sounds', name + '.wav')));
  return cache.get(name);
}

function synthHit(h) {
  const p = h.params || {};
  switch (h.synth) {
    case 'boom': return S.boom(p);
    case 'whoosh': return S.whoosh(p);
    case 'riser': return S.riser(p);
    case 'bell': return S.bell(p);
    case 'clack': return S.clack(p);
    case 'sparkle': return S.sparkle(p);
    case 'pad': return S.pad(p);
    case 'reverseSwell': return S.reverseSwell(p);
    default: throw new Error('unknown synth ' + h.synth);
  }
}

function main() {
  const out = S.buffer(SCORE.duration + 0.5);
  // 1) music beds
  for (const bed of SCORE.beds) {
    const src = decode(path.join(MOBILE, 'assets/music', bed.file), { start: bed.from, dur: bed.dur + 0.2 });
    if (bed.vibrato) vibratoInPlace(src, bed.vibrato);
    if (bed.lowpass) lowpassInPlace(src, curve(bed.lowpass), bed.at);
    const g = curve(bed.gain.map(([t, v]) => [t, v <= -90 ? 0 : db(v)]));
    place(out, src, bed.at, (tl) => (tl > bed.dur ? 0 : g(bed.at + tl)));
  }
  // 2) game sound effects and synthesized sound design
  const verbBus = S.buffer(SCORE.duration + 0.5);
  for (const h of SCORE.hits) {
    const b = h.file ? sfxFile(h.file) : synthHit(h);
    const gain = db(h.db ?? 0);
    place(out, b, h.at, () => gain * (h.dry ?? 1));
    if (h.verb) place(verbBus, b, h.at, () => gain * h.verb);
  }
  const wet = S.reverb(verbBus, { size: 0.9, damp: 0.35, wet: 1, dry: 0, tail: 0.1 });
  place(out, wet, 0, () => 1);
  // 3) global automation (e.g. a master duck under the sting)
  if (SCORE.master) {
    const g = curve(SCORE.master.map(([t, v]) => [t, db(v)]));
    for (let i = 0; i < out.L.length; i++) { const k = g(i / SR); out.L[i] *= k; out.R[i] *= k; }
  }
  // trim to the timeline, short fade at the very end
  const n = Math.round(SCORE.duration * SR);
  out.L = out.L.slice(0, n); out.R = out.R.slice(0, n);
  const fadeN = Math.round(0.03 * SR);
  for (let i = 0; i < fadeN; i++) { const k = i / fadeN; out.L[n - 1 - i] *= k; out.R[n - 1 - i] *= k; }
  // soft safety clip before normalising
  const pk = peak(out);
  if (pk > 0.98) { for (let i = 0; i < n; i++) { out.L[i] = Math.tanh(out.L[i] / pk * 1.1) * 0.95; out.R[i] = Math.tanh(out.R[i] / pk * 1.1) * 0.95; } }
  fs.mkdirSync(WORK, { recursive: true });
  const raw = path.join(WORK, 'score_raw.wav');
  writeWav(raw, out);
  const final = path.join(WORK, 'score.wav');
  const stats = loudnorm(raw, final, { I: -14, TP: -1, LRA: 11 });
  const m4a = path.join(HERE, '..', 'out', 'score.m4a');
  fs.mkdirSync(path.dirname(m4a), { recursive: true });
  execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', final, '-c:a', 'aac', '-b:a', '256k', m4a]);
  console.log('score:', final);
  console.log('loudness in:', stats.measured.input_i, 'LUFS, out:', stats.normalized.output_i, 'LUFS, TP', stats.normalized.output_tp);
}

main();
