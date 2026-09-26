// Trailer sound design, synthesized from scratch (pure Node, no dependencies).
// Every generator returns a stereo buffer { L, R } of Float32Array at SR.
// Deterministic: noise comes from a seeded PRNG, nothing reads a clock.
//
// Level conventions (so the cue sheet's dB values mean something):
//   - one-shot foley and tonal notes are normalised to a -6 dBFS sample peak
//     (the same ballpark as the game's own WAVs);
//   - ambience layers (air, brook, crickets, fire, pot) to -20 dBFS RMS.
// Everything is band-limited: no full-band noise, nothing above ~9 kHz except
// the brief transients of clicks.

export const SR = 48000;
const TAU = Math.PI * 2;

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

/** Equal-power pan gains for p in [-1, 1] (centre = unity on both sides). */
export function panGains(p) {
  const a = (Math.max(-1, Math.min(1, p)) + 1) * Math.PI / 4;
  return [Math.cos(a) * Math.SQRT2, Math.sin(a) * Math.SQRT2];
}

/** RBJ biquad (bandpass/lowpass/highpass) with per-sample frequency. */
export function biquad(type) {
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

/** Fixed-frequency biquad (coefficients computed once). */
export function fixedBiquad(type, f0, Q = 0.707) {
  const w0 = TAU * Math.min(f0, SR * 0.45) / SR, c = Math.cos(w0), a = Math.sin(w0) / (2 * Q);
  let b0, b1, b2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
  else { b0 = a; b1 = 0; b2 = -a; }
  const a0 = 1 + a, A1 = -2 * c / a0, A2 = (1 - a) / a0, B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

/** Paul Kellet's economy pink-noise filter over a seeded white source. */
function pinkNoise(rnd) {
  let b0 = 0, b1 = 0, b2 = 0;
  return () => {
    const w = rnd() * 2 - 1;
    b0 = 0.99765 * b0 + w * 0.0990460;
    b1 = 0.96300 * b1 + w * 0.2965164;
    b2 = 0.57000 * b2 + w * 1.0526913;
    return (b0 + b1 + b2 + w * 0.1848) * 0.25;
  };
}

/** Smooth value noise in [-1, 1] at `rate` control points a second (a function of t). */
function smoothNoise(rnd, rate, dur) {
  const n = Math.ceil(dur * rate) + 4;
  const pts = Array.from({ length: n }, () => rnd() * 2 - 1);
  return (t) => {
    const x = Math.max(0, t) * rate; const i = Math.floor(x); const f = x - i; const s = f * f * (3 - 2 * f);
    return pts[i] + (pts[i + 1] - pts[i]) * s;
  };
}

const softclip = (x) => Math.tanh(x);
const expDecay = (t, tau) => Math.exp(-t / tau);

/** Scale a buffer so its sample peak is `target` (linear). */
export function normPeak(b, target = 0.5) {
  let p = 0;
  for (let i = 0; i < b.L.length; i++) p = Math.max(p, Math.abs(b.L[i]), Math.abs(b.R[i]));
  if (p > 0) { const k = target / p; for (let i = 0; i < b.L.length; i++) { b.L[i] *= k; b.R[i] *= k; } }
  return b;
}

/** Scale a buffer so its RMS (both channels) is `db` dBFS. */
export function normRms(b, db = -20) {
  let e = 0;
  for (let i = 0; i < b.L.length; i++) e += b.L[i] * b.L[i] + b.R[i] * b.R[i];
  const rms = Math.sqrt(e / (2 * b.L.length));
  if (rms > 0) { const k = Math.pow(10, db / 20) / rms; for (let i = 0; i < b.L.length; i++) { b.L[i] *= k; b.R[i] *= k; } }
  return b;
}

/** Add a mono generator g(t) over [t0, t0 + dur) into b at pan p. */
function addMono(b, t0, dur, p, g) {
  const [gl, gr] = panGains(p);
  const i0 = Math.round(t0 * SR), n = Math.round(dur * SR);
  for (let k = 0; k < n; k++) {
    const i = i0 + k; if (i < 0 || i >= b.L.length) continue;
    const v = g(k / SR, k);
    b.L[i] += v * gl; b.R[i] += v * gr;
  }
}

// =============================================================================
// Existing cinematic voices
// =============================================================================

/** Cinematic sub boom: pitch-dropping sine body + click + noise thump. */
export function boom({ dur = 3.2, f0 = 70, f1 = 30, drop = 0.35, gain = 1, seed = 1, click = 0.25 } = {}) {
  const b = buffer(dur); const rnd = mulberry32(seed); const lp = biquad('lp'); const clp = biquad('lp');
  let ph = 0;
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t / drop);
    ph += TAU * f / SR;
    const env = Math.min(1, t / 0.004) * Math.exp(-t / (dur * 0.33)) * Math.min(1, (dur - t) / 0.05);
    const body = Math.sin(ph) * env * 1.3 + Math.sin(ph * 2) * env * 0.18;
    const nz = lp((rnd() * 2 - 1), 180 + 1600 * Math.exp(-t / 0.03), 0.7) * Math.exp(-t / 0.09) * 0.9;
    const ck = clp((rnd() * 2 - 1), 2600, 0.7) * Math.exp(-t / 0.004) * click * 2;
    const v = softclip((body + nz + ck) * 1.4) * gain;
    b.L[i] = v; b.R[i] = v;
  }
  return b;
}

/** Whoosh: band-passed noise sweeping in frequency and across the stereo field. */
export function whoosh({ dur = 1.0, from = 400, to = 3200, q = 1.6, pan = [-0.6, 0.6], gain = 0.45, seed = 2, shape = 0.55, top = 9000 } = {}) {
  const b = buffer(dur); const rnd = mulberry32(seed); const bpL = biquad('bp'); const bp2 = biquad('bp'); const lp = biquad('lp');
  for (let i = 0; i < b.L.length; i++) {
    const u = i / b.L.length;
    const f = from * Math.pow(to / from, u);
    const env = Math.pow(Math.sin(Math.PI * Math.pow(u, shape)), 2);
    const n = rnd() * 2 - 1;
    const v = lp(bpL(n, f, q) + 0.35 * bp2(n, f * 2.1, q * 1.5), Math.min(top, f * 2.2), 0.7) * env * gain * 2.2;
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
      if (f > 11000) continue;
      v += Math.sin(TAU * f * t) * a * Math.exp(-t / (dur * d * 0.45));
    }
    v *= Math.min(1, t / 0.002) * gain * 0.6 * Math.min(1, (dur - t) / 0.02);
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

/** Soft sparkle: a cloud of tiny high bell blips. `pan` sweeps the cloud across [from, to]. */
export function sparkle({ dur = 1.2, count = 14, gain = 0.25, seed = 5, lo = 2400, hi = 6200, pan = null, front = 1 } = {}) {
  const out = buffer(dur + 0.8); const rnd = mulberry32(seed);
  for (let k = 0; k < count; k++) {
    const u = k === 0 ? 0 : Math.pow(rnd(), front); // the first blip lands on the cue
    const at = u * dur;
    const f = lo * Math.pow(hi / lo, rnd());
    const p = pan ? pan[0] + (pan[1] - pan[0]) * u + (rnd() - 0.5) * 0.3 : rnd() * 1.6 - 0.8;
    const bl = bell({ freq: f, dur: 0.5 + rnd() * 0.4, gain: gain * (0.5 + rnd() * 0.5), pan: p, bright: 0.5 });
    mixInto(out, bl, at, 1);
  }
  return out;
}

/** Warm pad chord (detuned saws through a low-pass), for swells. */
export function pad({ freqs = [130.81, 164.81, 196.0, 293.66], dur = 4, gain = 0.3, cutoff = 1400, attack = 1.2, release = 1.5, seed = 6, wobble = 0, pan = 0 } = {}) {
  const b = buffer(dur); const rnd = mulberry32(seed); const lpL = biquad('lp'), lpR = biquad('lp');
  const voices = [];
  for (const f of freqs) for (let k = 0; k < 3; k++) voices.push({ f: f * (1 + (k - 1) * 0.0045), ph: rnd(), pan: (k - 1) * 0.6 + pan });
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * Math.min(1, (dur - t) / release);
    const e2 = env * env * (3 - 2 * env);
    let l = 0, r = 0;
    for (const v of voices) {
      const f = v.f * (1 + wobble * Math.sin(TAU * 0.23 * t + v.pan) * 0.01);
      v.ph = (v.ph + f / SR) % 1;
      const s = (2 * v.ph - 1) * 0.6 + Math.sin(TAU * v.ph) * 0.4;
      l += s * (1 - v.pan) * 0.5; r += s * (1 + v.pan) * 0.5;
    }
    const n = voices.length / 2;
    const fc = cutoff * (0.55 + 0.45 * e2);
    b.L[i] = lpL(l / n, fc, 0.7) * e2 * gain;
    b.R[i] = lpR(r / n, fc, 0.7) * e2 * gain;
  }
  return b;
}

/** Reverse swell: a reversed reverb tail of a chord, building into a peak at its end. */
export function reverseSwell({ freqs = [523.25, 659.25, 783.99, 1174.66], dur = 2.2, gain = 0.4, tail = 0.03 } = {}) {
  const src = buffer(dur);
  for (const f of freqs) mixInto(src, bell({ freq: f, dur: dur * 0.6, gain: 0.5 }), 0, 1);
  const wet = reverb(src, { size: 0.92, damp: 0.35, wet: 1, dry: 0 });
  const out = buffer(dur + tail);
  const n = Math.round(dur * SR);
  for (let i = 0; i < n; i++) {
    const u = i / n; const env = Math.pow(u, 1.8);
    out.L[i] = wet.L[n - 1 - i] * env * gain * 2;
    out.R[i] = wet.R[n - 1 - i] * env * gain * 2;
  }
  // a short release instead of a hard stop (no click at the peak)
  const nt = Math.round(tail * SR);
  for (let i = 0; i < nt; i++) { const k = 1 - i / nt; out.L[n + i] = out.L[n - 1] * k * k; out.R[n + i] = out.R[n - 1] * k * k; }
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

/** Add `src` into `dst` at `atSec` with gain. */
export function mixInto(dst, src, atSec, gain = 1) {
  const o = Math.round(atSec * SR);
  for (let i = 0; i < src.L.length; i++) {
    const j = o + i;
    if (j < 0 || j >= dst.L.length) continue;
    dst.L[j] += src.L[i] * gain;
    dst.R[j] += src.R[i] * gain;
  }
}

// =============================================================================
// Ambience (normalised to -20 dBFS RMS)
// =============================================================================

/**
 * Meadow air: decorrelated pink noise, 200 Hz - 6 kHz, breathing in slow gusts,
 * with a faint grass-rustle band that rides the gusts. No fade-in: it is
 * already running at t = 0 (a one-second pre-roll settles the filters).
 */
export function meadowAir({ dur = 10, seed = 11, gust = 0.4 } = {}) {
  const pre = 1.0; const n = Math.round(dur * SR), np = Math.round(pre * SR);
  const b = buffer(dur); const rnd = mulberry32(seed);
  const pinkS = pinkNoise(mulberry32(seed + 1)), pinkL = pinkNoise(mulberry32(seed + 2)), pinkR = pinkNoise(mulberry32(seed + 3));
  const g1 = smoothNoise(rnd, 0.17, dur + pre + 1), g2 = smoothNoise(rnd, 0.9, dur + pre + 1), g3 = smoothNoise(rnd, 0.11, dur + pre + 1);
  const ch = [0, 1].map(() => ({ hp: fixedBiquad('hp', 200, 0.6), hp2: fixedBiquad('hp', 200, 0.6), lp: biquad('lp'), lp2: fixedBiquad('lp', 6000, 0.707), rh: fixedBiquad('hp', 2600, 0.7), rl: fixedBiquad('lp', 5800, 0.7) }));
  const rW = mulberry32(seed + 4);
  for (let i = -np; i < n; i++) {
    const t = (i + np) / SR;
    const gv = 0.5 + 0.5 * (0.7 * g1(t) + 0.3 * g2(t));
    const env = 1 - gust + gust * gv;
    const fc = 2400 + 3000 * Math.max(0, gv);
    const shared = pinkS();
    const rustleSrc = rW() * 2 - 1;
    const rustle = Math.max(0, g3(t) * 0.5 + gv - 0.55) * 1.6;
    const outs = [pinkL(), pinkR()].map((own, c) => {
      const f = ch[c];
      let v = f.hp2(f.hp(own * 0.8 + shared * 0.45));
      v = f.lp2(f.lp(v, fc, 0.6));
      const r = f.rl(f.rh(rustleSrc * (c ? -1 : 1) * 0.5 + (rW() * 2 - 1) * 0.5)) * rustle * 0.35;
      return (v + r) * env;
    });
    if (i >= 0) { b.L[i] = outs[0]; b.R[i] = outs[1]; }
  }
  return normRms(b, -20);
}

/**
 * Brook: a babble of narrow resonances whose centres wander (the bubbling),
 * over a soft band-passed wash with slow swells, plus the odd droplet blip.
 */
export function brook({ dur = 10, seed = 21 } = {}) {
  const pre = 1.0; const n = Math.round(dur * SR), np = Math.round(pre * SR);
  const b = buffer(dur); const rnd = mulberry32(seed);
  const T = dur + pre + 1;
  const bands = [];
  for (let k = 0; k < 7; k++) {
    const base = 520 * Math.pow(2400 / 520, k / 6) * (0.9 + rnd() * 0.2);
    bands.push({ base, q: 5 + rnd() * 4, fm: smoothNoise(rnd, 3 + rnd() * 6, T), am: smoothNoise(rnd, 2 + rnd() * 3, T), bp: biquad('bp'), src: mulberry32(seed + 10 + k), pan: -0.55 + 1.1 * (k / 6) + (rnd() - 0.5) * 0.2 });
  }
  const washL = pinkNoise(mulberry32(seed + 30)), washR = pinkNoise(mulberry32(seed + 31));
  const wf = [0, 1].map(() => [fixedBiquad('hp', 300, 0.7), fixedBiquad('lp', 2600, 0.7), fixedBiquad('lp', 2600, 0.7)]);
  const swell = smoothNoise(rnd, 0.25, T);
  for (let i = -np; i < n; i++) {
    const t = (i + np) / SR;
    let l = 0, r = 0;
    for (const bd of bands) {
      const f = bd.base * (1 + 0.28 * bd.fm(t));
      const a = Math.pow(0.25 + 0.75 * Math.max(0, bd.am(t) * 0.8 + 0.35), 2);
      const v = bd.bp(bd.src() * 2 - 1, f, bd.q) * a;
      const [gl, gr] = panGains(bd.pan);
      l += v * gl; r += v * gr;
    }
    const ws = 0.8 + 0.2 * swell(t);
    const wl = wf[0][2](wf[0][1](wf[0][0](washL()))) * ws * 0.9;
    const wr = wf[1][2](wf[1][1](wf[1][0](washR()))) * ws * 0.9;
    if (i >= 0) { b.L[i] = l + wl; b.R[i] = r + wr; }
  }
  // droplets: short rising sine blips, ~3 a second, never loud
  let t = rnd() * 0.3;
  while (t < dur) {
    const f0 = 650 + rnd() * 800, a = 0.04 + rnd() * 0.05, p = rnd() * 1.2 - 0.6;
    let ph = 0;
    addMono(b, t, 0.06, p, (s) => { ph += TAU * f0 * (1 + 0.9 * Math.min(1, s / 0.025)) / SR; return Math.sin(ph) * a * Math.min(1, s / 0.002) * expDecay(s, 0.016); });
    t += -Math.log(1 - rnd() * 0.98) / 3;
  }
  return normRms(b, -20);
}

/**
 * Crickets: 4.3-4.9 kHz carriers pulsed at 26-34 Hz, 3-4 pulses a chirp,
 * chirps every 0.36-0.55 s. The first two are steady (the room tone never
 * gaps), the others sing in seeded clusters with rests.
 */
export function crickets({ dur = 10, seed = 31, count = 5 } = {}) {
  const b = buffer(dur); const rnd = mulberry32(seed);
  for (let c = 0; c < count; c++) {
    const f = 4600 + (rnd() - 0.5) * 420;
    const pr = 26 + rnd() * 8, np = rnd() < 0.5 ? 3 : 4, cp = 0.36 + rnd() * 0.19;
    const amp = c < 2 ? 0.55 + rnd() * 0.2 : 0.35 + rnd() * 0.65;
    const pan = c === 0 ? -0.55 : c === 1 ? 0.6 : rnd() * 1.6 - 0.8;
    const steady = c < 2;
    let t = rnd() * cp; let run = steady ? 1e9 : 3 + Math.floor(rnd() * 10);
    while (t < dur) {
      const jitter = 1 + (rnd() - 0.5) * 0.004;
      const chirpAmp = amp * (0.8 + rnd() * 0.2);
      let ph = rnd() * TAU;
      const len = np / pr;
      addMono(b, t, len + 0.01, pan, (s) => {
        const u = s * pr; const k = Math.floor(u); const w = u - k;
        const pulse = k < np && w < 0.6 ? Math.pow(Math.sin(Math.PI * w / 0.6), 2) : 0;
        ph += TAU * f * jitter / SR;
        return (Math.sin(ph) + 0.06 * Math.sin(2 * ph)) * pulse * chirpAmp;
      });
      t += cp * (1 + (rnd() - 0.5) * 0.06);
      if (--run <= 0) { t += 0.4 + rnd() * 1.4; run = 4 + Math.floor(rnd() * 10); }
    }
  }
  return normRms(b, -20);
}

/**
 * Birdsong: sparse, distant phrases from three birds (a rising tweet, a
 * falling "tsee-oo", a short trill), FM sines under 6.5 kHz.
 */
export function birdsong({ dur = 3, seed = 41, rate = 1.1 } = {}) {
  const b = buffer(dur + 0.5); const rnd = mulberry32(seed);
  const birds = [{ kind: 'tweet', pan: -0.5 }, { kind: 'tsee', pan: 0.45 }, { kind: 'trill', pan: 0.1 }];
  let t = 0.1 + rnd() * 0.3; let k = 0;
  const syl = (at, p, f0, f1, len, a, vib = 0) => {
    let ph = 0;
    addMono(b, at, len, p, (s) => {
      const u = s / len;
      const f = f0 * Math.pow(f1 / f0, u) * (1 + vib * Math.sin(TAU * 28 * s));
      ph += TAU * f / SR;
      const env = Math.min(1, s / 0.006) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.05)), 0.6);
      return Math.sin(ph) * env * a;
    });
  };
  while (t < dur) {
    const bd = birds[(k + (rnd() < 0.3 ? 1 : 0)) % 3]; k++;
    const a = 0.5 + rnd() * 0.5;
    if (bd.kind === 'tweet') {
      const m = 2 + Math.floor(rnd() * 3);
      for (let i = 0; i < m; i++) syl(t + i * 0.085, bd.pan, 2700 + rnd() * 300, 4000 + rnd() * 400, 0.055, a * (1 - i * 0.12));
    } else if (bd.kind === 'tsee') {
      syl(t, bd.pan, 5000 + rnd() * 300, 3300 + rnd() * 200, 0.2, a * 0.8, 0.02);
    } else {
      const m = 5 + Math.floor(rnd() * 4);
      for (let i = 0; i < m; i++) syl(t + i * 0.034, bd.pan, i % 2 ? 3300 : 3650, i % 2 ? 3150 : 3500, 0.026, a * 0.7);
    }
    t += 0.55 + rnd() * 0.9 / rate;
  }
  const lp = [fixedBiquad('lp', 6500, 0.7), fixedBiquad('lp', 6500, 0.7)];
  for (let i = 0; i < b.L.length; i++) { b.L[i] = lp[0](b.L[i]); b.R[i] = lp[1](b.R[i]); }
  return normPeak(b, 0.5);
}

/**
 * Fire crackle: bursty Poisson crackles through random band-passes, the odd
 * lower pop, a soft breathing body (80-300 Hz, not a sub) and a faint hiss.
 */
export function fireCrackle({ dur = 3, seed = 51, rate = 14, pan = 0, width = 0.35 } = {}) {
  const pre = 0.5; const n = Math.round(dur * SR), np = Math.round(pre * SR);
  const b = buffer(dur); const rnd = mulberry32(seed);
  const T = dur + pre + 1;
  const breath = smoothNoise(rnd, 1.6, T), flick = smoothNoise(rnd, 7, T), dens = smoothNoise(rnd, 0.8, T);
  const body = pinkNoise(mulberry32(seed + 1)); const bf = [fixedBiquad('hp', 80, 0.7), fixedBiquad('lp', 300, 0.7), fixedBiquad('lp', 300, 0.7)];
  const hissSrc = mulberry32(seed + 2); const hf = [fixedBiquad('hp', 2200, 0.7), fixedBiquad('lp', 5200, 0.7)];
  const [gl, gr] = panGains(pan);
  for (let i = -np; i < n; i++) {
    const t = (i + np) / SR;
    const v = bf[2](bf[1](bf[0](body()))) * (0.55 + 0.45 * breath(t)) * 2.2;
    const h = hf[1](hf[0](hissSrc() * 2 - 1)) * (0.5 + 0.5 * flick(t)) * 0.06;
    if (i >= 0) { b.L[i] = (v + h) * gl; b.R[i] = (v + h) * gr; }
  }
  let t = rnd() * 0.05;
  while (t < dur) {
    const big = rnd() < 0.08;
    const len = big ? 0.012 + rnd() * 0.01 : 0.001 + rnd() * 0.005;
    const fc = big ? 700 + rnd() * 600 : 1500 + rnd() * 4000;
    const a = (big ? 0.9 : 0.25 + Math.pow(rnd(), 3) * 0.9);
    const bp = fixedBiquad('bp', fc, big ? 1.4 : 1.1);
    const src = mulberry32(seed + 100 + Math.floor(t * 1000));
    const p = pan + (rnd() - 0.5) * 2 * width;
    addMono(b, t, len * 6, p, (s) => bp(src() * 2 - 1) * a * expDecay(s, len) * 3);
    const r = rate * (0.6 + 0.8 * Math.max(0, dens(t) + 0.5));
    t += -Math.log(1 - rnd() * 0.99) / r;
  }
  return normRms(b, -20);
}

/** Pot bubbles: low rising sine bloops with a little filtered noise, over a soft simmer. */
export function potBubble({ dur = 2, seed = 61, rate = 7, pan = 0, lo = 150, hi = 330 } = {}) {
  const b = buffer(dur + 0.2); const rnd = mulberry32(seed);
  const sim = pinkNoise(mulberry32(seed + 1)); const sf = [fixedBiquad('hp', 90, 0.7), fixedBiquad('lp', 520, 0.7)];
  const [gl, gr] = panGains(pan);
  for (let i = 0; i < b.L.length; i++) { const v = sf[1](sf[0](sim())) * 0.5; b.L[i] = v * gl; b.R[i] = v * gr; }
  let t = rnd() * 0.1;
  while (t < dur) {
    const f0 = lo + rnd() * (hi - lo), a = 0.4 + rnd() * 0.6, p = pan + (rnd() - 0.5) * 0.3;
    const nz = mulberry32(seed + 50 + Math.floor(t * 997)); const lp = fixedBiquad('lp', 900, 0.7);
    let ph = 0;
    addMono(b, t, 0.16, p, (s) => {
      ph += TAU * f0 * (1 + 0.9 * Math.min(1, s / 0.045)) / SR;
      return (Math.sin(ph) * 0.8 + lp(nz() * 2 - 1) * 0.5 * expDecay(s, 0.01)) * a * Math.min(1, s / 0.002) * expDecay(s, 0.035);
    });
    t += -Math.log(1 - rnd() * 0.98) / rate;
  }
  return normRms(b, -20);
}

// =============================================================================
// Tonal voices (normalised to a -6 dBFS peak)
// =============================================================================

/**
 * Music box tine: a sine plus an inharmonic 2.76x partial, exponential decay,
 * a tiny pluck click. `sag` (cents, negative = flat) bends the pitch down and
 * back over `sagDur` seconds (a half-sine), for the one note that goes off.
 */
export function musicBox({ freq = 783.99, dur = 2.4, sag = 0, sagDur = 0.9, tau = 0.8, pan = 0, seed = 71 } = {}) {
  const b = buffer(dur); const rnd = mulberry32(seed); const ck = fixedBiquad('hp', 4500, 0.7);
  const [gl, gr] = panGains(pan);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR;
    const cents = sag && t < sagDur ? sag * Math.sin(Math.PI * t / sagDur) : 0;
    const f = freq * Math.pow(2, cents / 1200);
    p1 += TAU * f / SR; p2 += TAU * f * 2.76 / SR;
    const att = Math.min(1, t / 0.0015);
    let v = Math.sin(p1) * expDecay(t, tau) + 0.3 * Math.sin(p2) * expDecay(t, tau * 0.28);
    v += ck(rnd() * 2 - 1) * 0.25 * expDecay(t, 0.0012);
    v *= att * Math.min(1, (dur - t) / 0.05);
    b.L[i] = v * gl; b.R[i] = v * gr;
  }
  return normPeak(b, 0.5);
}

/** Wind chime: a cluster of tubular strikes on the given notes (free-bar partials). */
export function windChime({ notes = [783.99, 987.77, 1174.66], strikes = 7, spread = 0.9, dur = 2.6, seed = 81 } = {}) {
  const b = buffer(dur); const rnd = mulberry32(seed);
  const parts = [[1, 1, 1], [2.756, 0.32, 0.4], [5.404, 0.1, 0.18]];
  for (let k = 0; k < strikes; k++) {
    const at = k === 0 ? 0 : spread * Math.pow(k / strikes, 1.3) + rnd() * 0.04;
    const f = notes[(k * 2 + Math.floor(rnd() * 2)) % notes.length] * (1 + (rnd() - 0.5) * 0.004);
    const a = (0.55 + rnd() * 0.45) * (1 - 0.35 * k / strikes);
    const p = rnd() * 1.4 - 0.7; const tau = 0.7 + rnd() * 0.5;
    addMono(b, at, dur - at, p, (s) => {
      let v = 0;
      for (const [m, am, dm] of parts) { if (f * m > 10000) continue; v += Math.sin(TAU * f * m * s) * am * expDecay(s, tau * dm); }
      return v * a * Math.min(1, s / 0.001) * Math.min(1, (dur - at - s) / 0.05);
    });
  }
  return normPeak(b, 0.5);
}

/**
 * Riser for the cast crane: band-passed noise that swells and climbs, with a
 * G-major shimmer (short chime notes climbing G4 -> D7, accelerating).
 * `notes` lets the cue sheet keep the arpeggio consonant with the bed.
 */
export function riserShimmer({ dur = 2.6, seed = 91, schedule = null, notes = [392, 493.88, 587.33, 783.99, 987.77, 1174.66, 1567.98, 1975.53, 2349.32], count = 18, noise = 1, chime = 1 } = {}) {
  const b = buffer(dur + 0.6); const rnd = mulberry32(seed);
  const src = pinkNoise(mulberry32(seed + 1)); const bp = [biquad('bp'), biquad('bp')]; const hp = fixedBiquad('hp', 400, 0.7);
  const n = Math.round(dur * SR);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const fc = 500 * Math.pow(11, Math.pow(u, 1.3));
    const env = Math.pow(u, 2.2) * Math.min(1, (1 - u) / 0.025);
    const x = hp(src());
    const w = 0.15 * Math.sin(TAU * 0.9 * u * dur);
    const v = (bp[0](x, fc, 1.4) + 0.4 * bp[1](x, fc * 1.5, 2.2)) * env * noise * 1.6;
    b.L[i] += v * (1 + w); b.R[i] += v * (1 - w);
  }
  // the shimmer: an explicit schedule [{ at, freq, amp, pan }] or an accelerating climb
  const sch = schedule || Array.from({ length: count }, (_, k) => {
    const u = k / count;
    return { at: dur * (1 - Math.pow(1 - u, 1.7)) * 0.96, freq: notes[Math.min(notes.length - 1, Math.floor(u * notes.length))], amp: 0.2 + 0.8 * Math.pow(u, 1.2), pan: (k % 2 ? 0.35 : -0.35) * (0.4 + u) };
  });
  for (const it of sch) {
    const f = it.freq, a = chime * it.amp * (0.8 + rnd() * 0.2);
    const len = Math.min(0.7, dur + 0.55 - it.at);
    addMono(b, it.at, len, it.pan || 0, (s) => (Math.sin(TAU * f * s) + 0.25 * Math.sin(TAU * f * 2.756 * s) * expDecay(s, 0.05)) * a * 0.22 * Math.min(1, s / 0.002) * expDecay(s, 0.22) * Math.min(1, (len - s) / 0.03));
  }
  return normPeak(b, 0.5);
}

// =============================================================================
// Tactile foley (normalised to a -6 dBFS peak)
// =============================================================================

/** Resin lift click: a 4 ms band-limited noise burst plus a 2.2 kHz damped sine. */
export function resinClick({ seed = 101, pan = 0 } = {}) {
  const b = buffer(0.12); const rnd = mulberry32(seed); const bp = fixedBiquad('bp', 3800, 0.8); const lp = fixedBiquad('lp', 9000, 0.7);
  addMono(b, 0, 0.12, pan, (t) => {
    const nz = t < 0.004 ? lp(bp(rnd() * 2 - 1)) * 2.5 * (1 - t / 0.004) : 0;
    return nz + Math.sin(TAU * 2200 * t) * expDecay(t, 0.009) * 0.7 + Math.sin(TAU * 4870 * t) * expDecay(t, 0.003) * 0.25;
  });
  return normPeak(b, 0.5);
}

/** Ceramic tock: a 1.8 kHz damped sine with two stiffer modes and a 2 ms tick. */
export function ceramicTock({ freq = 1765, seed = 111, pan = 0 } = {}) {
  const b = buffer(0.25); const rnd = mulberry32(seed); const lp = fixedBiquad('lp', 7000, 0.7);
  addMono(b, 0, 0.25, pan, (t) => {
    const nz = t < 0.002 ? lp(rnd() * 2 - 1) * (1 - t / 0.002) * 0.8 : 0;
    return nz + (Math.sin(TAU * freq * t) * expDecay(t, 0.022) + 0.4 * Math.sin(TAU * freq * 2.24 * t) * expDecay(t, 0.009) + 0.12 * Math.sin(TAU * freq * 3.46 * t) * expDecay(t, 0.004)) * Math.min(1, t / 0.0004);
  });
  return normPeak(b, 0.5);
}

/** Lock tink: a 3.1 kHz ping, 40 ms long. */
export function lockTink({ freq = 3145, pan = 0 } = {}) {
  const b = buffer(0.045);
  addMono(b, 0, 0.045, pan, (t) => (Math.sin(TAU * freq * t) + 0.12 * Math.sin(TAU * freq * 2.51 * t) * expDecay(t, 0.005)) * Math.min(1, t / 0.0008) * expDecay(t, 0.012) * Math.min(1, (0.04 - t) / 0.01 + 0.0001) * (t < 0.04 ? 1 : 0));
  return normPeak(b, 0.5);
}

/** Slot zip: band-passed noise sweeping up 700 Hz -> 4.2 kHz with fine teeth. */
export function slotZip({ dur = 0.2, from = 700, to = 4200, seed = 121, pan = 0 } = {}) {
  const b = buffer(dur + 0.02); const rnd = mulberry32(seed); const bp = biquad('bp'); const bp2 = biquad('bp');
  addMono(b, 0, dur, pan, (t) => {
    const u = t / dur; const f = from * Math.pow(to / from, u);
    const teeth = 0.6 + 0.4 * Math.max(0, Math.sin(TAU * 95 * t));
    const env = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.8)), 1.5);
    const x = rnd() * 2 - 1;
    return (bp(x, f, 3.5) + 0.4 * bp2(x, f * 1.6, 5)) * env * teeth;
  });
  return normPeak(b, 0.5);
}

/** Sprout pluck: a pizzicato pair, A5 then D6, each a damped string-like note. */
export function sproutPluck({ notes = [880, 1174.66], gap = 0.05, pan = 0, seed = 131 } = {}) {
  const b = buffer(0.5); const rnd = mulberry32(seed); const bp = fixedBiquad('bp', 3000, 1);
  notes.forEach((f, k) => addMono(b, k * gap, 0.4, pan + (k ? 0.1 : -0.05), (t) => {
    const env = Math.min(1, t / 0.001) * expDecay(t, 0.085);
    const nz = t < 0.003 ? bp(rnd() * 2 - 1) * 0.4 : 0;
    return (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t) * expDecay(t, 0.03) + 0.08 * Math.sin(TAU * 3 * f * t) * expDecay(t, 0.015)) * env * (k ? 0.85 : 1) + nz;
  }));
  return normPeak(b, 0.5);
}

/** Gem shower: ~40 seeded glass clicks, 2.4-6.2 kHz, front-loaded over ~1 s. */
export function gemShower({ count = 40, dur = 1.0, seed = 141, lo = 2400, hi = 6200, pan = [-0.7, 0.7] } = {}) {
  const b = buffer(dur + 0.2); const rnd = mulberry32(seed);
  for (let k = 0; k < count; k++) {
    const at = Math.min(dur, -0.26 * Math.log(1 - rnd() * 0.975));
    const f = lo * Math.pow(hi / lo, rnd()); const tau = 0.006 + rnd() * 0.02;
    const a = 0.35 + rnd() * 0.65; const p = pan[0] + (pan[1] - pan[0]) * rnd();
    const nz = mulberry32(seed + 7 + k); const hp = fixedBiquad('hp', 4000, 0.7);
    addMono(b, at, 0.12, p, (t) => {
      let v = Math.sin(TAU * f * t) * expDecay(t, tau);
      if (f * 2.32 < 11000) v += 0.25 * Math.sin(TAU * f * 2.32 * t) * expDecay(t, tau / 3);
      v += (t < 0.0006 ? hp(nz() * 2 - 1) * 0.5 : 0);
      return v * a * Math.min(1, t / 0.0003);
    });
  }
  return normPeak(b, 0.5);
}

/** Paper unfurl: crinkle grains in the 2-5.5 kHz band over a soft low flap. */
export function paperUnfurl({ dur = 0.5, seed = 151, pan = 0 } = {}) {
  const b = buffer(dur + 0.1); const rnd = mulberry32(seed);
  const flap = pinkNoise(mulberry32(seed + 1)); const lf = fixedBiquad('lp', 900, 0.7); const hf = fixedBiquad('hp', 150, 0.7);
  addMono(b, 0, dur, pan, (t) => { const u = t / dur; return lf(hf(flap())) * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.6)), 2) * 0.9; });
  let t = 0;
  while (t < dur) {
    const u = t / dur; const dens = 140 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.3 + 0.05)), 1.2) + 10;
    const len = 0.0015 + rnd() * 0.005; const fc = 2000 + rnd() * 3500; const bp = fixedBiquad('bp', fc, 1.3);
    const src = mulberry32(seed + 30 + Math.floor(t * 5000)); const a = 0.3 + rnd() * 0.7;
    addMono(b, t, len * 5, pan + (rnd() - 0.5) * 0.5, (s) => bp(src() * 2 - 1) * a * expDecay(s, len) * 2.2);
    t += -Math.log(1 - rnd() * 0.98) / dens;
  }
  return normPeak(b, 0.5);
}

/** Chalk scribble: gritty band-passed noise (1.5-6.5 kHz) in short drawn strokes. */
export function chalkScribble({ dur = 0.7, seed = 161, pan = 0 } = {}) {
  const b = buffer(dur + 0.05); const rnd = mulberry32(seed);
  const src = mulberry32(seed + 1); const hp = [fixedBiquad('hp', 1500, 0.7), fixedBiquad('hp', 1500, 0.7)]; const lp = [fixedBiquad('lp', 6500, 0.7), fixedBiquad('lp', 6500, 0.7)];
  const strokes = []; let t = 0.01;
  while (t < dur - 0.05) { const len = 0.08 + rnd() * 0.1; strokes.push([t, Math.min(len, dur - t), 0.6 + rnd() * 0.4]); t += len + 0.02 + rnd() * 0.04; }
  let grit = 0, hold = 0;
  addMono(b, 0, dur, pan, (s) => {
    let env = 0;
    for (const [a, l, g] of strokes) if (s >= a && s < a + l) { const w = (s - a) / l; env = g * Math.min(1, w / 0.12) * Math.min(1, (1 - w) / 0.2); }
    if (--hold <= 0) { grit = 0.35 + rnd() * 0.65; hold = Math.round(SR / (180 + rnd() * 380)); }
    return lp[1](lp[0](hp[1](hp[0](src() * 2 - 1)))) * env * grit;
  });
  return normPeak(b, 0.5);
}

/** Wood knock: a tuned modal wood block (free-bar modes), dry, with a felt thump. */
export function woodKnock({ freq = 392, seed = 171, pan = 0 } = {}) {
  const b = buffer(0.3); const rnd = mulberry32(seed); const bp = fixedBiquad('bp', 2800, 1.2); const lp = fixedBiquad('lp', 450, 0.7);
  addMono(b, 0, 0.3, pan, (t) => {
    const att = Math.min(1, t / 0.0005);
    const modes = Math.sin(TAU * freq * t) * expDecay(t, 0.055) + 0.35 * Math.sin(TAU * freq * 2.756 * t) * expDecay(t, 0.02) + 0.12 * Math.sin(TAU * freq * 5.404 * t) * expDecay(t, 0.008);
    const thump = 0.5 * Math.sin(TAU * 118 * t) * expDecay(t, 0.018) + lp(rnd() * 2 - 1) * 0.6 * expDecay(t, 0.008);
    const click = bp(rnd() * 2 - 1) * 0.5 * expDecay(t, 0.0015);
    return (modes + thump + click) * att;
  });
  return normPeak(b, 0.5);
}

/** Moth flutter: soft papery noise, amplitude-modulated at the wingbeat, panned along the moth's loop. */
export function mothFlutter({ dur = 3, seed = 181, rate = 22, t0 = 0, sp = 1, ph = 0, stop = 1e9 } = {}) {
  const b = buffer(dur); const rnd = mulberry32(seed); const bp = fixedBiquad('bp', 1500, 1.0); const lp = fixedBiquad('lp', 3200, 0.7);
  const wob = smoothNoise(rnd, 2, dur + 1);
  let wph = rnd();
  for (let i = 0; i < b.L.length; i++) {
    const t = i / SR; const T = t0 + t;
    const a = T * sp + ph;
    const pan = Math.sin(a * 1.3) * 0.55, near = 0.7 + 0.3 * Math.cos(a * 1.3);
    wph += (rate * (1 + 0.12 * wob(t))) / SR;
    const beat = Math.pow(Math.max(0, Math.sin(TAU * wph)), 3);
    const fade = Math.min(1, t / 0.15) * Math.min(1, Math.max(0, (stop - T) / 0.08)) * Math.min(1, (dur - t) / 0.1);
    const v = lp(bp(rnd() * 2 - 1)) * beat * near * fade;
    const [gl, gr] = panGains(pan);
    b.L[i] = v * gl; b.R[i] = v * gr;
  }
  return normRms(b, -20);
}

/** Glass tick: a small glass jar tink (3.7 kHz, two stiffer partials). */
export function glassTick({ freq = 3700, seed = 191, pan = 0 } = {}) {
  const b = buffer(0.2); const rnd = mulberry32(seed); const hp = fixedBiquad('hp', 3000, 0.7);
  addMono(b, 0, 0.2, pan, (t) => (Math.sin(TAU * freq * t) * expDecay(t, 0.028) + 0.45 * Math.sin(TAU * freq * 1.57 * t) * expDecay(t, 0.012) + 0.1 * Math.sin(TAU * freq * 2.46 * t) * expDecay(t, 0.005) + (t < 0.0006 ? hp(rnd() * 2 - 1) * 0.6 : 0)) * Math.min(1, t / 0.0003));
  return normPeak(b, 0.5);
}

/** Sparkler fizz: high-Q noise whose centre follows the stroke, with fine crackle. */
export function sparklerFizz({ dur = 0.22, from = 3200, to = 5200, pan = [0, 0], seed = 201 } = {}) {
  const b = buffer(dur + 0.08); const rnd = mulberry32(seed); const bp = biquad('bp'), bp2 = biquad('bp'); const hp = fixedBiquad('hp', 4000, 0.7);
  const total = dur + 0.07;
  for (let i = 0; i < Math.round(total * SR); i++) {
    const t = i / SR; const u = Math.min(1, t / dur);
    const f = from * Math.pow(to / from, u);
    const env = Math.min(1, t / 0.015) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.07));
    const x = rnd() * 2 - 1;
    const crackle = rnd() < 0.004 ? (rnd() * 2 - 1) * 6 : 0;
    const v = (bp(x, f, 10) * 1.6 + bp2(x, f * 1.5, 12) * 0.7 + hp(crackle) * 0.5) * env;
    const [gl, gr] = panGains(pan[0] + (pan[1] - pan[0]) * u);
    b.L[i] = v * gl; b.R[i] = v * gr;
  }
  return normPeak(b, 0.5);
}

/** Sign thunk: a 90 Hz plank body with wood modes, a felt thump, a crack and a dust breath. */
export function signThunk({ seed = 211, pan = -0.1 } = {}) {
  const b = buffer(1.0); const rnd = mulberry32(seed);
  const lp = fixedBiquad('lp', 350, 0.7), cr = fixedBiquad('bp', 1400, 1.0), dust = [fixedBiquad('bp', 1500, 0.7), fixedBiquad('lp', 3500, 0.7)];
  let ph = 0;
  addMono(b, 0, 1.0, pan, (t) => {
    ph += TAU * (88 + 8 * expDecay(t, 0.03)) / SR;
    const body = Math.sin(ph) * expDecay(t, 0.12) + 0.5 * Math.sin(TAU * 176 * t) * expDecay(t, 0.07) + 0.3 * Math.sin(TAU * 262 * t) * expDecay(t, 0.04) + 0.18 * Math.sin(TAU * 415 * t) * expDecay(t, 0.025);
    const felt = lp(rnd() * 2 - 1) * 1.4 * expDecay(t, 0.025);
    const crack = cr(rnd() * 2 - 1) * 0.6 * expDecay(t, 0.003);
    const puff = dust[1](dust[0](rnd() * 2 - 1)) * 0.12 * Math.min(1, t / 0.02) * expDecay(t, 0.14);
    return (body + felt + crack + puff) * Math.min(1, t / 0.0008);
  });
  return normPeak(b, 0.5);
}

/** Wood tap: a tiny wooden tick (two free-bar modes and a click). */
export function woodTap({ freq = 1250, seed = 221, pan = 0, decay = 0.014 } = {}) {
  const len = Math.max(0.12, decay * 9); const b = buffer(len); const rnd = mulberry32(seed); const bp = fixedBiquad('bp', 3500, 1);
  addMono(b, 0, len, pan, (t) => (Math.sin(TAU * freq * t) * expDecay(t, decay) + 0.35 * Math.sin(TAU * freq * 2.756 * t) * expDecay(t, decay * 0.4) + bp(rnd() * 2 - 1) * 0.5 * expDecay(t, 0.001)) * Math.min(1, t / 0.0004) * Math.min(1, (len - t) / 0.02));
  return normPeak(b, 0.5);
}

/** Rock tick: a tile rocking on its tray, one tick and a softer return tick. */
export function rockTick({ seed = 231, pan = 0 } = {}) {
  const b = buffer(0.25);
  mixInto(b, woodTap({ freq: 960, seed, pan, decay: 0.016 }), 0, 1);
  mixInto(b, woodTap({ freq: 1020, seed: seed + 1, pan, decay: 0.012 }), 0.085, 0.45);
  return normPeak(b, 0.5);
}

/** Flip tock: the tile kicks round (a tock), with a short swish as it turns in the air. */
export function flipTock({ seed = 241, pan = 0, dur = 0.2 } = {}) {
  const b = buffer(dur + 0.2);
  mixInto(b, woodTap({ freq: 1080, seed, pan, decay: 0.03 }), 0, 1);
  mixInto(b, whoosh({ dur, from: 900, to: 3400, q: 2.2, pan: [pan - 0.1, pan + 0.1], gain: 0.2, seed: seed + 1, shape: 0.8, top: 6000 }), 0.012, 0.9);
  return normPeak(b, 0.5);
}

/** Hop swish: a small up-and-over air swish. */
export function hopSwish({ dur = 0.24, seed = 251, pan = [0, 0.15] } = {}) {
  const b = buffer(dur + 0.02); const rnd = mulberry32(seed); const bp = biquad('bp');
  for (let i = 0; i < Math.round(dur * SR); i++) {
    const u = i / (dur * SR);
    const f = 1200 * Math.pow(2.4, Math.sin(Math.PI * u));
    const v = bp(rnd() * 2 - 1, f, 2) * Math.pow(Math.sin(Math.PI * u), 2);
    const [gl, gr] = panGains(pan[0] + (pan[1] - pan[0]) * u);
    b.L[i] = v * gl; b.R[i] = v * gr;
  }
  return normPeak(b, 0.5);
}

/** Leaf rustle: a small crinkle of a leaf (dense tiny grains, 2.5-6.5 kHz). */
export function leafRustle({ dur = 0.35, seed = 261, pan = 0 } = {}) {
  const b = buffer(dur + 0.05); const rnd = mulberry32(seed);
  const bed = mulberry32(seed + 1); const bf = [fixedBiquad('hp', 2200, 0.7), fixedBiquad('lp', 6000, 0.7)];
  addMono(b, 0, dur, pan, (t) => bf[1](bf[0](bed() * 2 - 1)) * Math.pow(Math.sin(Math.PI * t / dur), 2) * 0.35);
  let t = 0.01;
  while (t < dur - 0.02) {
    const u = t / dur; const len = 0.001 + rnd() * 0.003; const fc = 2500 + rnd() * 4000; const bp = fixedBiquad('bp', fc, 1.3);
    const src = mulberry32(seed + 20 + Math.floor(t * 9000)); const a = (0.3 + rnd() * 0.7) * Math.sin(Math.PI * u);
    addMono(b, t, len * 5, pan + (rnd() - 0.5) * 0.2, (s) => bp(src() * 2 - 1) * a * expDecay(s, len) * 2);
    t += -Math.log(1 - rnd() * 0.98) / 120;
  }
  return normPeak(b, 0.5);
}

/** Soft puff: a short breathy "pff" (low-passed noise), for steam and a pop-in. */
export function puff({ dur = 0.25, seed = 271, pan = 0, cut = 1600 } = {}) {
  const b = buffer(dur); const src = pinkNoise(mulberry32(seed)); const lp = fixedBiquad('lp', cut, 0.7), hp = fixedBiquad('hp', 180, 0.7);
  addMono(b, 0, dur, pan, (t) => lp(hp(src())) * Math.min(1, t / 0.012) * expDecay(t, dur * 0.3) * Math.min(1, (dur - t) / (dur * 0.3)));
  return normPeak(b, 0.5);
}

/** Paper unroll swish: a downward-sweeping crinkly swish (the wallpaper unrolling). */
export function unrollSwish({ dur = 0.42, seed = 281, pan = 0 } = {}) {
  const b = buffer(dur + 0.05); const rnd = mulberry32(seed); const bp = biquad('bp'); const bp2 = biquad('bp');
  let grit = 1, hold = 0;
  addMono(b, 0, dur, pan, (t) => {
    const u = t / dur; const f = 3600 * Math.pow(900 / 3600, u);
    if (--hold <= 0) { grit = 0.5 + rnd() * 0.5; hold = Math.round(SR / (120 + rnd() * 200)); }
    const x = rnd() * 2 - 1;
    return (bp(x, f, 1.6) + 0.5 * bp2(x, f * 1.8, 3)) * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.7)), 1.4) * grit;
  });
  return normPeak(b, 0.5);
}

/** Water bubbles: small rising blips (the aquarium, Axel's bubbles), higher than the pot. */
export function waterBubbles({ dur = 1, seed = 291, rate = 8, pan = 0 } = {}) {
  const b = buffer(dur + 0.15); const rnd = mulberry32(seed);
  let t = rnd() * 0.05;
  while (t < dur) {
    const f0 = 420 + rnd() * 700, a = 0.4 + rnd() * 0.6, p = pan + (rnd() - 0.5) * 0.5;
    let ph = 0;
    addMono(b, t, 0.08, p, (s) => { ph += TAU * f0 * (1 + 1.2 * Math.min(1, s / 0.03)) / SR; return Math.sin(ph) * a * Math.min(1, s / 0.0015) * expDecay(s, 0.02); });
    t += -Math.log(1 - rnd() * 0.98) / rate;
  }
  return normPeak(b, 0.5);
}
