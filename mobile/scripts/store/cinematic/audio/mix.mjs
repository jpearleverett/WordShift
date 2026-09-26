// Mixing utilities for the score: decode files to float PCM, place them with
// gain envelopes, limit the few bed transients that would stop a linear
// loudness pass, and master with a two-pass EBU R128 loudnorm through ffmpeg.

import { Buffer } from 'node:buffer';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { SR, buffer } from './synth.mjs';

const FFMPEG = process.env.FFMPEG || 'ffmpeg';

/** Decode any audio file to a stereo float buffer at SR. `start`/`dur` in seconds. */
export function decode(file, { start = 0, dur = null } = {}) {
  const args = ['-hide_banner', '-loglevel', 'error', '-ss', String(start)];
  if (dur != null) args.push('-t', String(dur));
  args.push('-i', file, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-');
  const raw = execFileSync(FFMPEG, args, { maxBuffer: 1 << 30 });
  const all = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
  const n = all.length / 2;
  const L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { L[i] = all[2 * i]; R[i] = all[2 * i + 1]; }
  return { L, R };
}

/**
 * Place `src` into `dst` at `at` seconds, multiplied by an envelope:
 * env(tLocal) -> gain. Samples outside dst are dropped.
 */
export function place(dst, src, at, env = () => 1) {
  const o = Math.round(at * SR);
  for (let i = 0; i < src.L.length; i++) {
    const j = o + i;
    if (j < 0 || j >= dst.L.length) continue;
    const g = env(i / SR);
    dst.L[j] += src.L[i] * g;
    dst.R[j] += src.R[i] * g;
  }
}

/** Multiply dst in place by a gain curve over absolute time (ducking, fades). */
export function automate(dst, gainAt) {
  for (let i = 0; i < dst.L.length; i++) { const g = gainAt(i / SR); dst.L[i] *= g; dst.R[i] *= g; }
}

export function peak(b) { let p = 0; for (let i = 0; i < b.L.length; i++) p = Math.max(p, Math.abs(b.L[i]), Math.abs(b.R[i])); return p; }

/**
 * Inter-sample peak estimate per sample: max of |x| at the sample and at three
 * points between it and the next, on a Catmull-Rom curve through the neighbours
 * (close to a 4x oversampled true-peak meter for band-limited material).
 */
function peakTrack(b) {
  const n = b.L.length; const p = new Float32Array(n);
  for (const ch of [b.L, b.R]) {
    for (let i = 0; i < n; i++) {
      const y0 = ch[Math.max(0, i - 1)], y1 = ch[i], y2 = ch[Math.min(n - 1, i + 1)], y3 = ch[Math.min(n - 1, i + 2)];
      let m = Math.abs(y1);
      for (const u of [0.25, 0.5, 0.75]) {
        const v = 0.5 * ((2 * y1) + (-y0 + y2) * u + (2 * y0 - 5 * y1 + 4 * y2 - y3) * u * u + (-y0 + 3 * y1 - 3 * y2 + y3) * u * u * u);
        if (Math.abs(v) > m) m = Math.abs(v);
      }
      if (m > p[i]) p[i] = m;
    }
  }
  return p;
}

/**
 * Look-ahead peak limiter (in place). The gain reaches the needed reduction by
 * the peak (a sliding minimum over the look-ahead, then a box smoother of the same
 * length) and recovers with a one-pole release. Returns { maxReductionDb, samples }.
 */
export function limit(b, ceiling, { lookaheadMs = 5, releaseMs = 90 } = {}) {
  const n = b.L.length; const la = Math.max(1, Math.round(lookaheadMs * SR / 1000));
  const pk = peakTrack(b);
  const need = new Float32Array(n);
  let touched = 0;
  for (let i = 0; i < n; i++) { need[i] = pk[i] > ceiling ? ceiling / pk[i] : 1; if (need[i] < 1) touched++; }
  if (!touched) return { maxReductionDb: 0, samples: 0 };
  // sliding minimum over [i, i + la] (monotonic deque)
  const hmin = new Float32Array(n); const dq = new Int32Array(n); let h = 0, t = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (t > h && need[dq[t - 1]] >= need[i]) t--;
    dq[t++] = i;
    while (dq[h] > i + la) h++;
    hmin[i] = need[dq[h]];
  }
  // box-average over [i - la, i] keeps the curve at or below `need` at every peak
  const g = new Float32Array(n); let acc = 0;
  for (let i = 0; i < n; i++) { acc += hmin[i]; if (i - la - 1 >= 0) acc -= hmin[i - la - 1]; g[i] = acc / Math.min(i + 1, la + 1); }
  const rel = 1 - Math.exp(-1 / (releaseMs * SR / 1000));
  let cur = 1, worst = 1;
  const regions = []; let open = null;
  for (let i = 0; i < n; i++) {
    cur = g[i] < cur ? g[i] : cur + (g[i] - cur) * rel;
    if (cur > g[i]) cur = g[i];
    if (cur < worst) worst = cur;
    b.L[i] *= cur; b.R[i] *= cur;
    // where it works by more than 1 dB (for the report)
    if (cur < 0.891) { if (!open || i / SR - open.to > 0.05) { open = { from: i / SR, to: i / SR, db: 0 }; regions.push(open); } open.to = i / SR; open.db = Math.min(open.db, 20 * Math.log10(cur)); }
  }
  return { maxReductionDb: 20 * Math.log10(worst), samples: touched, regions };
}

export function writeWav(file, b, { float = true, bits = 16 } = {}) {
  const n = b.L.length;
  const bytesPer = float ? 4 : bits / 8;
  const data = Buffer.alloc(n * 2 * bytesPer);
  const q = (v, max) => Math.max(-max - 1, Math.min(max, Math.round(v * max)));
  for (let i = 0; i < n; i++) {
    if (float) { data.writeFloatLE(b.L[i], i * 8); data.writeFloatLE(b.R[i], i * 8 + 4); }
    else if (bits === 24) { data.writeIntLE(q(b.L[i], 8388607), i * 6, 3); data.writeIntLE(q(b.R[i], 8388607), i * 6 + 3, 3); }
    else { data.writeInt16LE(q(b.L[i], 32767), i * 4); data.writeInt16LE(q(b.R[i], 32767), i * 4 + 2); }
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(float ? 3 : 1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2 * bytesPer, 28); h.writeUInt16LE(2 * bytesPer, 32); h.writeUInt16LE(bytesPer * 8, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

/** EBU R128 of a file: integrated loudness, loudness range, true peak. */
export function measure(file) {
  const r = runStderr(['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-']);
  const num = (re) => Number((r.match(re) || []).pop()?.match(/-?[\d.]+/)[0]);
  return { I: num(/I:\s+-?[\d.]+ LUFS/g), LRA: num(/LRA:\s+-?[\d.]+ LU/g), TP: num(/Peak:\s+-?[\d.]+ dBFS/g) };
}

/**
 * Two-pass linear loudnorm to I/TP/LRA. Returns the measured input and output stats;
 * `normalized.normalization_type` must read "linear" (the input's true peak leaves
 * room for the gain). ffmpeg runs the filter at 192 kHz and resamples back to SR.
 */
export function loudnorm(input, output, { I = -14, TP = -1, LRA = 11 } = {}) {
  const r = runStderr(['-hide_banner', '-i', input, '-af', `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:print_format=json`, '-f', 'null', '-']);
  const m = JSON.parse(r.slice(r.lastIndexOf('{'), r.lastIndexOf('}') + 1));
  const af = `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json`;
  const r2 = runStderr(['-hide_banner', '-y', '-i', input, '-af', af, '-ar', String(SR), '-c:a', 'pcm_s24le', output]);
  const m2 = JSON.parse(r2.slice(r2.lastIndexOf('{'), r2.lastIndexOf('}') + 1));
  return { measured: m, normalized: m2 };
}

export function runStderr(args) {
  const r = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(r.stderr.slice(-2000));
  return r.stderr;
}

export { buffer, SR };
