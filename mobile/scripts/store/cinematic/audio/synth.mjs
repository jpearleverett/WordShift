// Trailer sound design, synthesized from scratch (pure Node, no dependencies).
// Every generator returns a stereo buffer { L, R } of Float32Array at SR.
// Deterministic: noise comes from a seeded PRNG.

export const SR = 48000;

export function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buffer(sec) {
  const n = Math.max(1, Math.round(sec * SR));
  return { L: new Float32Array(n), R: new Float32Array(n) };
}

const TAU = Math.PI * 2;

/** RBJ biquad (bandpass/lowpass/highpass) with per-sample frequency. */
function biquad(type) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x, f0, Q) => {
    const w0 = TAU * Math.min(f0, SR * 0.45) / SR, c = Math.cos(w0), a = Math.sin(w0) / (2 * Q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = a; b1 = 0; b2 = -a; }
    const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

const softclip = (x) => Math.tanh(x);

/** Cinematic sub boom: pitch-dropping sine body + click + noise thump. */
export function boom({ dur = 3.2, f0 = 70, f1 = 30, drop = 0.35, gain = 1, seed = 1, click = 0.25 } = {}) {
  const b = buffer(dur); const rnd = mulberry32(seed); const lp = biquad('lp'); const clp = biquad('lp');
  let ph = 0;
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t / drop);
    ph += TAU * f / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / (dur * 0.33));
    const body = Math.sin(ph) * env * 1.3 + Math.sin(ph * 2) * env * 0.18;
    const nz = lp((rnd() * 2 - 1), 180 + 1600 * Math.exp(-t / 0.03), 0.7) * Math.exp(-t / 0.09) * 0.9;
    const ck = clp((rnd() * 2 - 1), 2600, 0.7) * Math.exp(-t / 0.004) * click * 2;
    const v = softclip((body + nz + ck) * 1.4) * gain;
    b.L[i] = v; b.R[i] = v;
  }
  return b;
}

/** Whoosh: band-passed noise sweeping in frequency and across the stereo field. */
export function whoosh({ dur = 1.0, from = 400, to = 3200, q = 1.6, pan = [-0.6, 0.6], gain = 0.45, seed = 2, shape = 0.55 } = {}) {
  const b = buffer(dur); const rnd = mulberry32(seed); const bpL = biquad('bp'); const bp2 = biquad('bp'); const lp = biquad('lp');
  for (let i = 0; i < b.L.length; i++) {
    const u = i / b.L.length;
    const f = from * Math.pow(to / from, u);
    const env = Math.pow(Math.sin(Math.PI * Math.pow(u, shape)), 2);
    const n = rnd() * 2 - 1;
    const v = lp(bpL(n, f, q) + 0.35 * bp2(n, f * 2.1, q * 1.5), Math.min(9000, f * 2.2), 0.7) * env * gain * 2.2;
    const p = pan[0] + (pan[1] - pan[0]) * u;
    b.L[i] = v * Math.cos((p + 1) * Math.PI / 4) * 1.41;
    b.R[i] = v * Math.sin((p + 1) * Math.PI / 4) * 1.41;
  }
  return b;
}

/** Riser: noise + rising detuned tone cluster that swells and cuts at the end. */
export function riser({ dur = 3, f0 = 180, f1 = 900, gain = 0.5, seed = 3 } = {}) {
  const b = buffer(dur); const rnd = mulberry32(seed); const hp = biquad('hp'); const bp = biquad('bp'); const lp = biquad('lp');
  const phases = [0, 0, 0, 0, 0, 0];
  const det = [1, 1.004, 0.996, 1.5, 1.503, 2.0];
  for (let i = 0; i < b.L.length; i++) {
    const u = i / b.L.length;
    const f = f0 * Math.pow(f1 / f0, Math.pow(u, 1.6));
    let tone = 0;
    for (let k = 0; k < phases.length; k++) { phases[k] += TAU * f * det[k] / SR; tone += Math.sin(phases[k]) / phases.length; }
    const n = lp(hp(rnd() * 2 - 1, 800 + 4000 * u, 0.7), 3000 + 5000 * u, 0.7);
    const nb = bp(rnd() * 2 - 1, 500 + 5000 * u * u, 2);
    const env = Math.pow(u, 2.2) * (u > 0.985 ? (1 - u) / 0.015 : 1);
    const v = (tone * 0.7 + n * 0.14 + nb * 0.2) * env * gain;
    const w = Math.sin(TAU * 0.8 * u * dur) * 0.2;
    b.L[i] = v * (1 + w); b.R[i] = v * (1 - w);
  }
  return b;
}

/** Bell / music-box tone: inharmonic partials with fast attack, long decay. */
export function bell({ freq = 1046.5, dur = 2.5, gain = 0.5, bright = 1, pan = 0, detune = 0 } = {}) {
  const b = buffer(dur);
  const parts = [[1, 1, 1.0], [2.0, 0.42, 0.55], [3.01, 0.22, 0.35], [4.16, 0.12, 0.22], [5.43, 0.07 * bright, 0.15], [0.5, 0.18, 0.9]];
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [m, a, d] of parts) {
      const f = freq * m * (1 + detune * Math.sin(TAU * 0.7 * t) * 0.003);
      v += Math.sin(TAU * f * t) * a * Math.exp(-t / (dur * d * 0.45));
    }
    v *= Math.min(1, t / 0.002) * gain * 0.6;
    b.L[i] = v * Math.cos((pan + 1) * Math.PI / 4) * 1.41;
    b.R[i] = v * Math.sin((pan + 1) * Math.PI / 4) * 1.41;
  }
  return b;
}

/** Wooden tile clack: modal resonances + a short noise transient. */
export function clack({ gain = 0.6, pitch = 1, seed = 4, pan = 0 } = {}) {
  const b = buffer(0.5); const rnd = mulberry32(seed); const bp = biquad('bp');
  const modes = [[820, 0.05, 1], [1540, 0.035, 0.6], [2410, 0.022, 0.4], [3780, 0.012, 0.25], [410, 0.06, 0.5]];
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [f, d, a] of modes) v += Math.sin(TAU * f * pitch * t) * a * Math.exp(-t / d);
    v += bp(rnd() * 2 - 1, 2400 * pitch, 1.2) * Math.exp(-t / 0.004) * 2.2;
    v *= gain * 0.5;
    b.L[i] = v * Math.cos((pan + 1) * Math.PI / 4) * 1.41;
    b.R[i] = v * Math.sin((pan + 1) * Math.PI / 4) * 1.41;
  }
  return b;
}

/** Soft sparkle: a cloud of tiny high bell blips. */
export function sparkle({ dur = 1.2, count = 14, gain = 0.25, seed = 5, lo = 2400, hi = 6200 } = {}) {
  const out = buffer(dur + 0.8); const rnd = mulberry32(seed);
  for (let k = 0; k < count; k++) {
    const at = rnd() * dur;
    const f = lo * Math.pow(hi / lo, rnd());
    const bl = bell({ freq: f, dur: 0.5 + rnd() * 0.4, gain: gain * (0.5 + rnd() * 0.5), pan: rnd() * 1.6 - 0.8, bright: 0.5 });
    mixInto(out, bl, at, 1);
  }
  return out;
}

/** Warm pad chord (detuned saws through a low-pass), for swells and drones. */
export function pad({ freqs = [130.81, 164.81, 196.0, 293.66], dur = 4, gain = 0.3, cutoff = 1400, attack = 1.2, release = 1.5, seed = 6, wobble = 0 } = {}) {
  const b = buffer(dur); const rnd = mulberry32(seed); const lpL = biquad('lp'), lpR = biquad('lp');
  const voices = [];
  for (const f of freqs) for (let k = 0; k < 3; k++) voices.push({ f: f * (1 + (k - 1) * 0.0045), ph: rnd(), pan: (k - 1) * 0.6 });
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * Math.min(1, (dur - t) / release);
    let l = 0, r = 0;
    for (const v of voices) {
      const f = v.f * (1 + wobble * Math.sin(TAU * 0.23 * t + v.pan) * 0.01);
      v.ph = (v.ph + f / SR) % 1;
      const s = (2 * v.ph - 1) * 0.6 + Math.sin(TAU * v.ph) * 0.4;
      l += s * (1 - v.pan) * 0.5; r += s * (1 + v.pan) * 0.5;
    }
    const n = voices.length / 2;
    b.L[i] = lpL(l / n, cutoff, 0.7) * env * gain;
    b.R[i] = lpR(r / n, cutoff, 0.7) * env * gain;
  }
  return b;
}

/** Reverse swell: a reversed reverb tail of a chord, building into a hit. */
export function reverseSwell({ freqs = [523.25, 659.25, 783.99, 1174.66], dur = 2.2, gain = 0.4 } = {}) {
  const src = buffer(dur);
  for (const f of freqs) mixInto(src, bell({ freq: f, dur: dur * 0.6, gain: 0.5 }), 0, 1);
  const wet = reverb(src, { size: 0.92, damp: 0.35, wet: 1, dry: 0 });
  const out = buffer(dur);
  const n = out.L.length;
  for (let i = 0; i < n; i++) {
    const u = i / n; const env = Math.pow(u, 1.8);
    out.L[i] = wet.L[n - 1 - i] * env * gain * 2;
    out.R[i] = wet.R[n - 1 - i] * env * gain * 2;
  }
  return out;
}

/** Freeverb-style stereo reverb. Returns a new buffer with a tail. */
export function reverb(src, { size = 0.84, damp = 0.3, wet = 0.35, dry = 1, tail = 2.5 } = {}) {
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const apT = [556, 441, 341, 225];
  const scale = SR / 44100;
  const mk = (spread) => ({
    combs: combT.map((d) => ({ buf: new Float32Array(Math.round((d + spread) * scale)), i: 0, f: 0 })),
    aps: apT.map((d) => ({ buf: new Float32Array(Math.round((d + spread) * scale)), i: 0 })),
  });
  const chans = [mk(0), mk(23)];
  const n = src.L.length + Math.round(tail * SR);
  const out = { L: new Float32Array(n), R: new Float32Array(n) };
  const fb = 0.28 * size + 0.7, d1 = damp * 0.4, d2 = 1 - d1;
  for (let i = 0; i < n; i++) {
    const inp = ((i < src.L.length ? src.L[i] + src.R[i] : 0)) * 0.015;
    for (let c = 0; c < 2; c++) {
      const ch = chans[c];
      let acc = 0;
      for (const cb of ch.combs) {
        const o = cb.buf[cb.i];
        cb.f = o * d2 + cb.f * d1;
        cb.buf[cb.i] = inp + cb.f * fb;
        cb.i = (cb.i + 1) % cb.buf.length;
        acc += o;
      }
      for (const ap of ch.aps) {
        const o = ap.buf[ap.i];
        ap.buf[ap.i] = acc + o * 0.5;
        ap.i = (ap.i + 1) % ap.buf.length;
        acc = o - acc;
      }
      const drySig = i < src.L.length ? (c === 0 ? src.L[i] : src.R[i]) : 0;
      (c === 0 ? out.L : out.R)[i] = drySig * dry + acc * wet * 3;
    }
  }
  return out;
}

/** Add `src` into `dst` at `atSec` with gain (and optional pan-preserving). */
export function mixInto(dst, src, atSec, gain = 1) {
  const o = Math.round(atSec * SR);
  for (let i = 0; i < src.L.length; i++) {
    const j = o + i;
    if (j < 0 || j >= dst.L.length) continue;
    dst.L[j] += src.L[i] * gain;
    dst.R[j] += src.R[i] * gain;
  }
}
