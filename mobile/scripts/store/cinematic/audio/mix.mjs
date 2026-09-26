// Mixing utilities for the score: decode files to float PCM, place them with
// gain envelopes, and master with a two-pass EBU R128 loudnorm through ffmpeg.

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

export function writeWav(file, b, { float = true } = {}) {
  const n = b.L.length;
  const bytesPer = float ? 4 : 2;
  const data = Buffer.alloc(n * 2 * bytesPer);
  for (let i = 0; i < n; i++) {
    if (float) { data.writeFloatLE(b.L[i], i * 8); data.writeFloatLE(b.R[i], i * 8 + 4); }
    else {
      data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(b.L[i] * 32767))), i * 4);
      data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(b.R[i] * 32767))), i * 4 + 2);
    }
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(float ? 3 : 1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2 * bytesPer, 28); h.writeUInt16LE(2 * bytesPer, 32); h.writeUInt16LE(bytesPer * 8, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

/** Two-pass linear loudnorm to I/TP/LRA. Returns the measured output stats. */
export function loudnorm(input, output, { I = -14, TP = -1, LRA = 11 } = {}) {
  const r = runStderr(['-hide_banner', '-i', input, '-af', `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:print_format=json`, '-f', 'null', '-']);
  const m = JSON.parse(r.slice(r.lastIndexOf('{'), r.lastIndexOf('}') + 1));
  const af = `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=json`;
  const r2 = runStderr(['-hide_banner', '-y', '-i', input, '-af', af, '-ar', String(SR), '-c:a', 'pcm_s24le', output]);
  const m2 = JSON.parse(r2.slice(r2.lastIndexOf('{'), r2.lastIndexOf('}') + 1));
  return { measured: m, normalized: m2 };
}

function runStderr(args) {
  const r = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(r.stderr.slice(-2000));
  return r.stderr;
}

export { buffer, SR };
