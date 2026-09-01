// Pure-Node WAV generator for WordShift's sound effects and ambient music beds.
// No external dependencies. Run: node scripts/tools/generateSounds.mjs
//
// Synthesis engine (v2 — the audio overhaul):
//   - Additive voices with multiple detuned partials (chorus warmth) and
//     per-partial decay rates (higher partials die faster, like real struck
//     instruments). Inharmonic partial stacks for bell/toy-piano character.
//   - Filtered-noise transients for tactile attacks (ticks, thocks, glitter).
//   - Smooth half-cosine attacks + exponential decays (strikes) and full
//     attack/sustain/release envelopes (swells/pads).
//   - Soft-knee tanh saturation on the master for glue and gentle harmonics.
//   - Lightweight Schroeder reverb (3 lowpassed feedback combs + 2 allpasses)
//     for space; dark sounds get damper, longer rooms.
//   - Ambient music loops that are sample-exact seamless BY CONSTRUCTION:
//     every continuous component completes an integer number of cycles over
//     the loop, event tails wrap circularly, and reverb is applied via a
//     double-pass (periodic steady state) so the tail wraps too.
//
// Musical direction: bright = warm C-major-pentatonic toy-piano/celesta
// (cozy, candy). Dark (Phase 3+ variants) = hollow bells with minor-third and
// tritone partials, sub-octave weight, slower attacks, longer dissonant tails.
// The dark combo ladder DESCENDS (sinking, not celebrating).
import fs from 'fs';
import path from 'path';

const SAMPLE_RATE = 22050;
const OUT_DIR = path.resolve(import.meta.dirname, '../../assets/sounds');

// ---------------------------------------------------------------------------
// WAV writer
// ---------------------------------------------------------------------------
function writeWav(filePath, samples) {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(filePath, Buffer.concat([header, data]));
  console.log(`wrote ${filePath} (${((header.length + data.length) / 1024).toFixed(1)} KB)`);
}

// ---------------------------------------------------------------------------
// Deterministic randomness (stable regeneration → stable git diffs)
// ---------------------------------------------------------------------------
function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Envelopes
// ---------------------------------------------------------------------------
/** Half-cosine attack ramp into an exponential decay over dur. */
function strikeEnv(t, dur, attack, decayShape) {
  const a = t < attack ? Math.sin((Math.PI / 2) * (t / attack)) : 1;
  return a * Math.exp(-decayShape * (t / dur));
}

/** Attack / sustain / release envelope for swells and pads. */
function padEnv(t, dur, attack, release) {
  let v = 1;
  if (t < attack) v = Math.sin((Math.PI / 2) * (t / attack));
  const rStart = dur - release;
  if (t > rStart) v *= Math.cos((Math.PI / 2) * Math.min(1, (t - rStart) / release));
  return v;
}

// ---------------------------------------------------------------------------
// Voices
// ---------------------------------------------------------------------------
// Instrument partial stacks: { r: frequency ratio, g: gain, d: decay multiplier }
// Slightly inharmonic upper partials give the toy-piano tine character.
const TOY_PIANO = [
  { r: 1, g: 1, d: 1 },
  { r: 2.004, g: 0.45, d: 1.35 },
  { r: 2.997, g: 0.14, d: 1.8 },
  { r: 4.19, g: 0.22, d: 2.1 },
  { r: 5.42, g: 0.07, d: 2.6 },
  { r: 6.79, g: 0.05, d: 3.1 },
];
// Glassy, pure — strong 4th harmonic like a celesta plate.
const CELESTA = [
  { r: 1, g: 1, d: 1 },
  { r: 2.0, g: 0.16, d: 1.5 },
  { r: 4.0, g: 0.28, d: 2.2 },
  { r: 5.98, g: 0.05, d: 3.0 },
];
// Deep-arch wooden bar: 1 / ~4 / ~9.2.
const MARIMBA = [
  { r: 1, g: 1, d: 1 },
  { r: 3.98, g: 0.38, d: 2.3 },
  { r: 9.19, g: 0.09, d: 3.5 },
];
// Bright handbell: hum, prime, tierce, quint, nominal.
const HANDBELL = [
  { r: 0.5, g: 0.28, d: 0.7 },
  { r: 1, g: 1, d: 1 },
  { r: 1.183, g: 0.32, d: 1.3 },
  { r: 1.506, g: 0.22, d: 1.5 },
  { r: 2.0, g: 0.32, d: 1.8 },
  { r: 2.514, g: 0.14, d: 2.2 },
  { r: 3.011, g: 0.07, d: 2.8 },
];
// The wrong bell: heavy sub-octave hum, minor-third tierce, a tritone partial.
const DARK_BELL = [
  { r: 0.5, g: 0.6, d: 0.55 },
  { r: 1, g: 1, d: 1 },
  { r: 1.1892, g: 0.55, d: 1.1 },
  { r: 1.4142, g: 0.3, d: 1.35 },
  { r: 1.782, g: 0.18, d: 1.6 },
  { r: 2.0, g: 0.26, d: 1.9 },
  { r: 2.828, g: 0.1, d: 2.4 },
];
// Hollow woody tube for the dark move ladder: sub weight, sparse upper body.
const HOLLOW = [
  { r: 0.5, g: 0.42, d: 0.6 },
  { r: 1, g: 1, d: 1 },
  { r: 2.0, g: 0.1, d: 1.6 },
  { r: 2.756, g: 0.16, d: 2.0 },
  { r: 4.21, g: 0.05, d: 2.6 },
];

/**
 * Struck/plucked voice: additive partial stack, detuned unison copies for
 * chorus warmth, per-partial decay, optional linear pitch bend and vibrato.
 */
function strike(samples, opts) {
  const {
    freq,
    start = 0,
    dur,
    vol,
    partials = [{ r: 1, g: 1, d: 1 }],
    attack = 0.002,
    decayShape = 5.5,
    unison = 2,
    detune = 0.0025,
    bend = 0,
    vibratoRate = 0,
    vibratoDepth = 0,
    rand = Math.random,
  } = opts;
  const s0 = Math.floor(start * SAMPLE_RATE);
  const n = Math.floor(dur * SAMPLE_RATE);
  const voices = [];
  for (const p of partials) {
    for (let u = 0; u < unison; u++) {
      const off = unison === 1 ? 0 : (u / (unison - 1)) * 2 - 1;
      voices.push({
        f: freq * p.r * (1 + detune * off),
        g: p.g / unison,
        d: p.d ?? 1,
        phase: rand() * 2 * Math.PI,
      });
    }
  }
  for (let i = 0; i < n && s0 + i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const bendMul = 1 + bend * (t / dur);
    const vib = vibratoDepth ? 1 + vibratoDepth * Math.sin(2 * Math.PI * vibratoRate * t) : 1;
    let sum = 0;
    for (const v of voices) {
      v.phase += (2 * Math.PI * v.f * bendMul * vib) / SAMPLE_RATE;
      sum += Math.sin(v.phase) * v.g * strikeEnv(t, dur, attack, decayShape * v.d);
    }
    samples[s0 + i] += sum * vol;
  }
}

/** Sustained swell voice (pads, low drones) with attack/release envelope. */
function swell(samples, opts) {
  const {
    freq,
    start = 0,
    dur,
    vol,
    partials = [{ r: 1, g: 1 }],
    attack = 0.3,
    release = 0.4,
    detune = 0.004,
    unison = 3,
    lfoRate = 0,
    lfoDepth = 0,
    rand = Math.random,
  } = opts;
  const s0 = Math.floor(start * SAMPLE_RATE);
  const n = Math.floor(dur * SAMPLE_RATE);
  const voices = [];
  for (const p of partials) {
    for (let u = 0; u < unison; u++) {
      const off = unison === 1 ? 0 : (u / (unison - 1)) * 2 - 1;
      voices.push({ f: freq * p.r * (1 + detune * off), g: p.g / unison, phase: rand() * 2 * Math.PI });
    }
  }
  for (let i = 0; i < n && s0 + i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const env = padEnv(t, dur, attack, release);
    const lfo = lfoDepth ? 1 - lfoDepth * (0.5 + 0.5 * Math.sin(2 * Math.PI * lfoRate * t)) : 1;
    let sum = 0;
    for (const v of voices) {
      v.phase += (2 * Math.PI * v.f) / SAMPLE_RATE;
      sum += Math.sin(v.phase) * v.g;
    }
    samples[s0 + i] += sum * env * lfo * vol;
  }
}

/**
 * Filtered noise transient. lp = one-pole lowpass coefficient (higher =
 * brighter); hp > 0 adds a one-pole highpass (for airy glitter).
 */
function noiseBurst(samples, opts) {
  const {
    start = 0,
    dur,
    vol,
    lp = 0.3,
    hp = 0,
    attack = 0.001,
    decayShape = 8,
    rand = Math.random,
  } = opts;
  const s0 = Math.floor(start * SAMPLE_RATE);
  const n = Math.floor(dur * SAMPLE_RATE);
  let lpState = 0;
  let hpPrevIn = 0;
  let hpState = 0;
  for (let i = 0; i < n && s0 + i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const white = rand() * 2 - 1;
    lpState += lp * (white - lpState);
    let y = lpState;
    if (hp > 0) {
      hpState = hp * (hpState + y - hpPrevIn);
      hpPrevIn = y;
      y = hpState;
    }
    samples[s0 + i] += y * strikeEnv(t, dur, attack, decayShape) * vol;
  }
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------
/**
 * Lightweight Schroeder reverb: 3 lowpass-damped feedback combs + 2 allpasses.
 * Returns a NEW buffer extended by `tail` seconds to hold the decay.
 */
function reverb(input, opts = {}) {
  const { wet = 0.22, dry = 1.0, decay = 0.75, damp = 0.35, tail = 0.5, predelayMs = 10 } = opts;
  const n = input.length + Math.floor(tail * SAMPLE_RATE);
  const out = new Float64Array(n);
  const combDelays = [1116, 1277, 1422].map((d) => Math.round((d * SAMPLE_RATE) / 44100));
  const combs = combDelays.map((d) => ({ buf: new Float64Array(d), idx: 0, filt: 0 }));
  const apDelays = [556, 225].map((d) => Math.round((d * SAMPLE_RATE) / 44100));
  const aps = apDelays.map((d) => ({ buf: new Float64Array(d), idx: 0 }));
  const pre = Math.floor((predelayMs * SAMPLE_RATE) / 1000);
  for (let i = 0; i < n; i++) {
    const x = i < input.length ? input[i] : 0;
    const xPre = i - pre >= 0 && i - pre < input.length ? input[i - pre] : 0;
    let wetSum = 0;
    for (const c of combs) {
      const y = c.buf[c.idx];
      c.filt = y * (1 - damp) + c.filt * damp;
      c.buf[c.idx] = xPre + c.filt * decay;
      c.idx = (c.idx + 1) % c.buf.length;
      wetSum += y;
    }
    wetSum /= combs.length;
    for (const a of aps) {
      const bufOut = a.buf[a.idx];
      const v = wetSum + bufOut * 0.5;
      a.buf[a.idx] = v;
      a.idx = (a.idx + 1) % a.buf.length;
      wetSum = bufOut - 0.5 * v;
    }
    out[i] = x * dry + wetSum * wet;
  }
  return out;
}

/**
 * Seamless reverb for loops: process two copies back-to-back and keep the
 * second half. The input is periodic and the reverb is LTI, so the second
 * pass is the periodic steady state — its tail wraps to its own start
 * (initial-transient error decays below one int16 LSB long before 16s).
 */
function reverbLoop(input, opts = {}) {
  const doubled = new Float64Array(input.length * 2);
  doubled.set(input, 0);
  doubled.set(input, input.length);
  const processed = reverb(doubled, { ...opts, tail: 0 });
  return processed.slice(input.length);
}

/**
 * Master finish: soft-knee tanh saturation (drive 0 = bypass), normalize to a
 * designed peak, then a short end fade so no file ends on a click.
 * Loops use drive 0 + fadeMs 0 (a fade would break the seam; saturation is
 * memoryless so it would be seam-safe, but the beds stay clean).
 */
function finalize(samples, opts = {}) {
  const { peak = 0.72, drive = 1.25, fadeMs = 6 } = opts;
  if (drive > 0) {
    const norm = Math.tanh(drive);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.tanh(samples[i] * drive) / norm;
  }
  let max = 1e-9;
  for (let i = 0; i < samples.length; i++) max = Math.max(max, Math.abs(samples[i]));
  const g = peak / max;
  for (let i = 0; i < samples.length; i++) samples[i] *= g;
  if (fadeMs > 0) {
    const n = Math.min(samples.length, Math.floor((fadeMs / 1000) * SAMPLE_RATE));
    for (let i = 0; i < n; i++) {
      samples[samples.length - n + i] *= Math.cos((Math.PI / 2) * ((i + 1) / n));
    }
  }
  return samples;
}

// ---------------------------------------------------------------------------
// Render drivers
// ---------------------------------------------------------------------------
function buf(seconds) {
  return new Float64Array(Math.ceil(seconds * SAMPLE_RATE));
}

function render(name, seconds, build, opts = {}) {
  const { reverb: rv, peak = 0.72, drive = 1.25, fadeMs = 6 } = opts;
  const s = buf(seconds);
  const rand = mulberry32(hashSeed(name));
  build(s, rand);
  const out = rv ? reverb(s, rv) : s;
  finalize(out, { peak, drive, fadeMs });
  writeWav(path.join(OUT_DIR, `${name}.wav`), out);
}

/**
 * Seamless loop driver. Every continuous voice must use q(freq) (quantized to
 * an integer number of cycles over the loop) and integer LFO cycle counts;
 * finite events are added with circular wrap via loopEvent.
 */
function renderLoop(name, L, build, opts = {}) {
  const { reverb: rv, peak = 0.5 } = opts;
  const n = Math.round(L * SAMPLE_RATE);
  const s = new Float64Array(n);
  const rand = mulberry32(hashSeed(name));
  const q = (f) => Math.max(1, Math.round(f * L)) / L;
  build(s, { rand, q, L });
  const out = rv ? reverbLoop(s, rv) : s;
  finalize(out, { peak, drive: 0, fadeMs: 0 });
  writeWav(path.join(OUT_DIR, `${name}.wav`), out);
}

/** Continuous loop voice: quantized sine + amplitude LFO at integer cycles. */
function loopPad(s, { freq, vol, lfoCycles = 0, lfoDepth = 0, lfoPhase = 0, phase = 0 }) {
  const n = s.length;
  const w = (2 * Math.PI * freq) / SAMPLE_RATE;
  const wl = (2 * Math.PI * lfoCycles) / n;
  for (let i = 0; i < n; i++) {
    const lfo = lfoDepth ? 1 - lfoDepth * (0.5 + 0.5 * Math.sin(wl * i + lfoPhase)) : 1;
    s[i] += Math.sin(w * i + phase) * vol * lfo;
  }
}

/** Finite event added to a loop with circular wrap (tails cross the seam). */
function loopEvent(s, startSec, dur, renderInto) {
  const tmp = new Float64Array(Math.min(s.length, Math.ceil(dur * SAMPLE_RATE)));
  renderInto(tmp);
  const off = Math.floor(startSec * SAMPLE_RATE) % s.length;
  for (let i = 0; i < tmp.length; i++) s[(off + i) % s.length] += tmp[i];
}

// ---------------------------------------------------------------------------
// Note tables
// ---------------------------------------------------------------------------
// Bright: C major pentatonic — everything stays consonant and candy.
const N = {
  E3: 164.81,
  C4: 261.63, D4: 293.66, E4: 329.63, G4: 392.0, A4: 440.0,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, A6: 1760.0, C7: 2093.0,
};
// Dark: low C minor with tritone accents — cold, hollow, heavy.
const D = {
  C2: 65.41, G2: 98.0, Bb2: 116.54,
  C3: 130.81, Eb3: 155.56, F3: 174.61, Gb3: 185.0, G3: 196.0, Ab3: 207.65, A3: 220.0, Bb3: 233.08,
  C4: 261.63, Eb4: 311.13, Gb4: 369.99, Ab4: 415.3, A4: 440.0, Bb4: 466.16,
  C5: 523.25, Eb5: 622.25, B5: 987.77, C6: 1046.5,
};

fs.mkdirSync(OUT_DIR, { recursive: true });

// ===========================================================================
// BRIGHT SFX (Phases 0-2): warm toy-piano / celesta / marimba candy chimes.
// ===========================================================================

// tap: tiny celesta tick — noise transient + short A5, nearly dry.
render('tap', 0.16, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.02, vol: 0.5, lp: 0.55, decayShape: 10, rand });
  strike(s, { freq: N.A5, dur: 0.13, vol: 0.5, partials: CELESTA, attack: 0.0015, decayShape: 7, unison: 2, detune: 0.002, rand });
}, { reverb: { wet: 0.08, tail: 0.12 }, peak: 0.5 });

// letter_select: toy-piano E5 pluck with an octave sparkle.
render('letter_select', 0.26, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.012, vol: 0.35, lp: 0.5, decayShape: 11, rand });
  strike(s, { freq: N.E5, dur: 0.22, vol: 0.6, partials: TOY_PIANO, decayShape: 6, unison: 3, detune: 0.003, rand });
  strike(s, { freq: N.E6, dur: 0.1, vol: 0.12, partials: CELESTA, decayShape: 7, rand });
}, { reverb: { wet: 0.12, tail: 0.22 }, peak: 0.62 });

// valid_move combo ladder: two-note toy-piano rises climbing the pentatonic.
// Tier 0 = C5→G5; each tier steps the pair up and adds a celesta sparkle.
function brightMove(name, note1, note2, sparkle, opts = {}) {
  const { gap = 0.07, sparkleVol = 0.15, wet = 0.16, peak = 0.66, extra } = opts;
  render(name, 0.5, (s, rand) => {
    noiseBurst(s, { start: 0, dur: 0.01, vol: 0.25, lp: 0.5, decayShape: 11, rand });
    strike(s, { freq: note1, dur: 0.22, vol: 0.55, partials: TOY_PIANO, decayShape: 6, unison: 3, detune: 0.003, rand });
    noiseBurst(s, { start: gap, dur: 0.01, vol: 0.2, lp: 0.5, decayShape: 11, rand });
    strike(s, { freq: note2, start: gap, dur: 0.28, vol: 0.5, partials: TOY_PIANO, decayShape: 5.5, unison: 3, detune: 0.003, rand });
    if (sparkle) {
      strike(s, { freq: sparkle, start: gap + 0.05, dur: 0.2, vol: sparkleVol, partials: CELESTA, decayShape: 6, rand });
    }
    if (extra) extra(s, rand);
  }, { reverb: { wet, tail: 0.35 }, peak });
}
brightMove('valid_move', N.C5, N.G5, null);
brightMove('valid_move_2', N.D5, N.A5, N.D6, { sparkleVol: 0.14, peak: 0.68 });
brightMove('valid_move_3', N.E5, N.C6, N.E6, { sparkleVol: 0.16, peak: 0.7, extra: (s, rand) => {
  noiseBurst(s, { start: 0.12, dur: 0.15, vol: 0.05, lp: 0.9, hp: 0.85, decayShape: 5, rand });
} });
brightMove('valid_move_4', N.G5, N.D6, N.G6, { gap: 0.065, sparkleVol: 0.16, wet: 0.2, peak: 0.72, extra: (s, rand) => {
  strike(s, { freq: N.E6, start: 0.13, dur: 0.18, vol: 0.1, partials: CELESTA, decayShape: 6, rand });
  noiseBurst(s, { start: 0.11, dur: 0.18, vol: 0.06, lp: 0.9, hp: 0.85, decayShape: 5, rand });
} });

// midpoint_turn: the reverse-shift descent->ascent PIVOT. Two rising marimba
// strikes into a soft handbell ringout — brighter and taller than the top of
// the valid_move ladder, so the turn reads as a chapter break, not another
// combo step. The dark mirror sinks (hollow marimba falling into a dark bell).
render('midpoint_turn', 0.55, (s, rand) => {
  strike(s, { freq: N.G5, dur: 0.2, vol: 0.5, partials: MARIMBA, decayShape: 6, unison: 2, detune: 0.003, rand });
  strike(s, { freq: N.D6, start: 0.1, dur: 0.24, vol: 0.48, partials: MARIMBA, decayShape: 5.5, unison: 2, detune: 0.003, rand });
  strike(s, { freq: N.G6, start: 0.22, dur: 0.5, vol: 0.28, partials: HANDBELL, decayShape: 3.6, attack: 0.004, rand });
  noiseBurst(s, { start: 0.2, dur: 0.02, vol: 0.12, lp: 0.6, decayShape: 10, rand });
}, { reverb: { wet: 0.22, tail: 0.5 }, peak: 0.7 });
render('midpoint_turn_dark', 0.6, (s, rand) => {
  strike(s, { freq: D.G3, dur: 0.24, vol: 0.5, partials: HOLLOW, attack: 0.008, decayShape: 5.5, unison: 2, detune: 0.005, rand });
  strike(s, { freq: D.Eb3, start: 0.12, dur: 0.3, vol: 0.46, partials: HOLLOW, attack: 0.01, decayShape: 5, unison: 2, detune: 0.005, rand });
  strike(s, { freq: D.Bb2, start: 0.26, dur: 0.55, vol: 0.3, partials: DARK_BELL, attack: 0.012, decayShape: 4, rand });
}, { reverb: { wet: 0.3, tail: 0.6 }, peak: 0.62 });

// star_pop_1/2/3: one celesta note per star as it pops in (rising C6/E6/G6) so
// ear and hand land together in the victory choreography. Dark mirrors SINK
// (Eb4/C4/G3 hollow) — the stars land like cold stones at the reveal.
render('star_pop_1', 0.32, (s, rand) => {
  strike(s, { freq: N.C6, dur: 0.24, vol: 0.4, partials: CELESTA, decayShape: 6, rand });
}, { reverb: { wet: 0.16, tail: 0.3 }, peak: 0.55 });
render('star_pop_2', 0.32, (s, rand) => {
  strike(s, { freq: N.E6, dur: 0.24, vol: 0.4, partials: CELESTA, decayShape: 6, rand });
}, { reverb: { wet: 0.16, tail: 0.3 }, peak: 0.55 });
render('star_pop_3', 0.34, (s, rand) => {
  strike(s, { freq: N.G6, dur: 0.26, vol: 0.42, partials: CELESTA, decayShape: 5.5, rand });
}, { reverb: { wet: 0.18, tail: 0.32 }, peak: 0.58 });
render('star_pop_1_dark', 0.42, (s, rand) => {
  strike(s, { freq: D.Eb4, dur: 0.3, vol: 0.38, partials: HOLLOW, attack: 0.006, decayShape: 5, unison: 2, detune: 0.004, rand });
}, { reverb: { wet: 0.22, tail: 0.4 }, peak: 0.5 });
render('star_pop_2_dark', 0.42, (s, rand) => {
  strike(s, { freq: D.C4, dur: 0.3, vol: 0.38, partials: HOLLOW, attack: 0.007, decayShape: 5, unison: 2, detune: 0.004, rand });
}, { reverb: { wet: 0.22, tail: 0.4 }, peak: 0.5 });
render('star_pop_3_dark', 0.44, (s, rand) => {
  strike(s, { freq: D.G3, dur: 0.32, vol: 0.4, partials: HOLLOW, attack: 0.008, decayShape: 4.5, unison: 2, detune: 0.005, rand });
}, { reverb: { wet: 0.24, tail: 0.42 }, peak: 0.5 });

// invalid_move: gentle wooden double-thock, dry and tactile, never punishing.
render('invalid_move', 0.38, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.03, vol: 0.35, lp: 0.12, decayShape: 9, rand });
  strike(s, { freq: N.E3, dur: 0.14, vol: 0.6, partials: MARIMBA, decayShape: 7, bend: -0.12, unison: 2, detune: 0.002, rand });
  noiseBurst(s, { start: 0.11, dur: 0.03, vol: 0.3, lp: 0.12, decayShape: 9, rand });
  strike(s, { freq: N.E3 * 0.94, start: 0.11, dur: 0.18, vol: 0.55, partials: MARIMBA, decayShape: 6.5, bend: -0.12, unison: 2, detune: 0.002, rand });
}, { reverb: { wet: 0.06, tail: 0.15 }, peak: 0.6 });

// undo: celesta slide down G5→E5 (a polite step back).
render('undo', 0.26, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.01, vol: 0.2, lp: 0.45, decayShape: 11, rand });
  strike(s, { freq: N.G5, dur: 0.2, vol: 0.5, partials: CELESTA, decayShape: 6, bend: -0.159, unison: 2, detune: 0.003, rand });
}, { reverb: { wet: 0.1, tail: 0.18 }, peak: 0.55 });

// hint: curious glassy sparkle C6→E6 with fairy-dust air.
render('hint', 0.45, (s, rand) => {
  strike(s, { freq: N.C6, dur: 0.16, vol: 0.35, partials: CELESTA, decayShape: 6, rand });
  strike(s, { freq: N.E6, start: 0.09, dur: 0.24, vol: 0.35, partials: CELESTA, decayShape: 5, vibratoRate: 6, vibratoDepth: 0.004, rand });
  noiseBurst(s, { start: 0.02, dur: 0.18, vol: 0.08, lp: 0.9, hp: 0.8, decayShape: 4.5, rand });
}, { reverb: { wet: 0.3, tail: 0.45 }, peak: 0.6 });

// victory: toy-piano pentatonic arpeggio into a rolled celesta chord + glitter.
render('victory', 1.5, (s, rand) => {
  const arp = [
    [N.C5, 0], [N.E5, 0.11], [N.G5, 0.22], [N.C6, 0.33],
  ];
  for (const [f, t] of arp) {
    noiseBurst(s, { start: t, dur: 0.01, vol: 0.2, lp: 0.5, decayShape: 11, rand });
    strike(s, { freq: f, start: t, dur: 0.4, vol: 0.5, partials: TOY_PIANO, decayShape: 5.5, unison: 3, detune: 0.003, rand });
  }
  strike(s, { freq: N.C6, start: 0.5, dur: 0.7, vol: 0.22, partials: CELESTA, decayShape: 4, rand });
  strike(s, { freq: N.E6, start: 0.53, dur: 0.7, vol: 0.18, partials: CELESTA, decayShape: 4, rand });
  strike(s, { freq: N.G6, start: 0.56, dur: 0.7, vol: 0.14, partials: CELESTA, decayShape: 4, rand });
  noiseBurst(s, { start: 0.45, dur: 0.5, vol: 0.05, lp: 0.9, hp: 0.85, decayShape: 4, rand });
}, { reverb: { wet: 0.28, decay: 0.8, tail: 0.7 }, peak: 0.75 });

// perfect: the victory arpeggio extended to the top + handbell ringout.
render('perfect', 2.0, (s, rand) => {
  const arp = [
    [N.C5, 0, 0.5], [N.E5, 0.1, 0.5], [N.G5, 0.2, 0.5], [N.C6, 0.3, 0.52],
    [N.E6, 0.42, 0.4], [N.G6, 0.54, 0.32],
  ];
  for (const [f, t, v] of arp) {
    noiseBurst(s, { start: t, dur: 0.01, vol: 0.18, lp: 0.5, decayShape: 11, rand });
    strike(s, { freq: f, start: t, dur: 0.42, vol: v, partials: TOY_PIANO, decayShape: 5.5, unison: 3, detune: 0.003, rand });
  }
  strike(s, { freq: N.C7, start: 0.68, dur: 0.4, vol: 0.16, partials: CELESTA, decayShape: 5, rand });
  strike(s, { freq: N.C6, start: 0.85, dur: 1.1, vol: 0.26, partials: HANDBELL, decayShape: 3.5, attack: 0.004, rand });
  noiseBurst(s, { start: 0.55, dur: 0.7, vol: 0.05, lp: 0.9, hp: 0.85, decayShape: 3.5, rand });
}, { reverb: { wet: 0.3, decay: 0.82, tail: 0.9 }, peak: 0.78 });

// amber_earn: bright coin pair with tick transients and shimmer detune.
render('amber_earn', 0.55, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.012, vol: 0.3, lp: 0.7, decayShape: 11, rand });
  strike(s, { freq: N.A5, dur: 0.16, vol: 0.45, partials: CELESTA, decayShape: 6.5, unison: 3, detune: 0.004, rand });
  noiseBurst(s, { start: 0.06, dur: 0.012, vol: 0.25, lp: 0.7, decayShape: 11, rand });
  strike(s, { freq: N.C6, start: 0.06, dur: 0.22, vol: 0.45, partials: CELESTA, decayShape: 6, unison: 3, detune: 0.004, rand });
  strike(s, { freq: N.E6, start: 0.12, dur: 0.24, vol: 0.26, partials: CELESTA, decayShape: 5.5, unison: 3, detune: 0.004, rand });
}, { reverb: { wet: 0.12, tail: 0.3 }, peak: 0.65 });

// pit_devour: a word lands in the offering pit — a hollow low strike with a
// soft lowpassed-noise "swallow" pulling it under. The dark mirror adds a sub-hum.
render('pit_devour', 0.35, (s, rand) => {
  strike(s, { freq: D.C3, dur: 0.24, vol: 0.5, partials: HOLLOW, attack: 0.003, decayShape: 6, bend: -0.08, unison: 2, detune: 0.003, rand });
  noiseBurst(s, { start: 0.02, dur: 0.3, vol: 0.28, lp: 0.09, attack: 0.06, decayShape: 4, rand });
}, { reverb: { wet: 0.2, damp: 0.5, tail: 0.3 }, peak: 0.5 });

// achievement: proud little fanfare climbing to a handbell accent.
render('achievement', 1.3, (s, rand) => {
  const line = [ [N.G4, 0, 0.45], [N.C5, 0.12, 0.5], [N.E5, 0.24, 0.5], [N.G5, 0.36, 0.5] ];
  for (const [f, t, v] of line) {
    noiseBurst(s, { start: t, dur: 0.01, vol: 0.18, lp: 0.5, decayShape: 11, rand });
    strike(s, { freq: f, start: t, dur: 0.42, vol: v, partials: TOY_PIANO, decayShape: 5.5, unison: 3, detune: 0.003, rand });
  }
  strike(s, { freq: N.C6, start: 0.5, dur: 0.7, vol: 0.3, partials: HANDBELL, decayShape: 3.8, attack: 0.004, rand });
  noiseBurst(s, { start: 0.45, dur: 0.4, vol: 0.05, lp: 0.9, hp: 0.85, decayShape: 4, rand });
}, { reverb: { wet: 0.28, decay: 0.8, tail: 0.7 }, peak: 0.72 });

// unlock: quick rising marimba triad opening into a handbell.
render('unlock', 1.0, (s, rand) => {
  const line = [ [N.C4, 0], [N.E4, 0.09], [N.G4, 0.18] ];
  for (const [f, t] of line) {
    noiseBurst(s, { start: t, dur: 0.02, vol: 0.22, lp: 0.2, decayShape: 10, rand });
    strike(s, { freq: f, start: t, dur: 0.25, vol: 0.5, partials: MARIMBA, decayShape: 6, unison: 2, detune: 0.002, rand });
  }
  strike(s, { freq: N.C6, start: 0.32, dur: 0.6, vol: 0.3, partials: HANDBELL, decayShape: 4, attack: 0.004, rand });
}, { reverb: { wet: 0.25, tail: 0.55 }, peak: 0.68 });

// achievement_dark: the same rising line gone reverent — a dark-bell ascent
// on the minor mode, resolving into a low hollow toll instead of a toy-piano
// sparkle. Fires at Phase 3+ via resolveSfxForPhase.
render('achievement_dark', 1.3, (s, rand) => {
  const line = [ [D.G3, 0, 0.42], [D.Bb3, 0.13, 0.46], [D.Eb4, 0.26, 0.46], [D.Bb4, 0.39, 0.46] ];
  for (const [f, t, v] of line) {
    noiseBurst(s, { start: t, dur: 0.012, vol: 0.14, lp: 0.35, decayShape: 11, rand });
    strike(s, { freq: f, start: t, dur: 0.5, vol: v, partials: DARK_BELL, decayShape: 4.8, unison: 2, detune: 0.004, rand });
  }
  strike(s, { freq: D.C5, start: 0.55, dur: 0.9, vol: 0.3, partials: HOLLOW, decayShape: 3.4, attack: 0.006, bend: -0.03, unison: 2, detune: 0.003, rand });
  noiseBurst(s, { start: 0.5, dur: 0.5, vol: 0.05, lp: 0.5, hp: 0.2, decayShape: 3.6, rand });
}, { reverb: { wet: 0.3, decay: 0.85, damp: 0.55, tail: 0.9 }, peak: 0.66 });

// unlock_dark: the marimba triad gone cold — a dark-bell rise into a low toll.
render('unlock_dark', 1.0, (s, rand) => {
  const line = [ [D.C3, 0], [D.Eb3, 0.1], [D.G3, 0.2] ];
  for (const [f, t] of line) {
    noiseBurst(s, { start: t, dur: 0.02, vol: 0.18, lp: 0.18, decayShape: 10, rand });
    strike(s, { freq: f, start: t, dur: 0.3, vol: 0.46, partials: DARK_BELL, decayShape: 5.2, unison: 2, detune: 0.003, rand });
  }
  strike(s, { freq: D.C5, start: 0.34, dur: 0.75, vol: 0.28, partials: HOLLOW, decayShape: 3.8, attack: 0.006, bend: -0.03, unison: 2, detune: 0.003, rand });
}, { reverb: { wet: 0.27, damp: 0.55, tail: 0.6 }, peak: 0.62 });

// dialogue: tiny soft celesta blip (fires on every dialogue line — stays quiet).
render('dialogue', 0.15, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.008, vol: 0.15, lp: 0.45, decayShape: 12, rand });
  strike(s, { freq: N.D5, dur: 0.11, vol: 0.4, partials: CELESTA, decayShape: 7.5, unison: 2, detune: 0.003, rand });
}, { reverb: { wet: 0.06, tail: 0.1 }, peak: 0.42 });

// phase_change: WARM ceremony swell — the C-add9 house chord rising into a
// handbell hour-strike, for the BRIGHT ward ignitions (target phase 0-2). One
// lowered-7th (Bb) shade drifts under the warmth: the seed of wrongness, the
// same device the dusk music beds use. The Phase 3+ ceremonies play
// phase_change_dark below (audio.soundPhaseChange keys on the ceremony's
// TARGET phase), so the descent is earned by ear too — the ignition INTO
// Growing Shadows is the first ceremony that sounds wrong.
render('phase_change', 2.6, (s, rand) => {
  swell(s, { freq: D.C3, dur: 2.4, vol: 0.26, partials: [{ r: 1, g: 1 }, { r: 2, g: 0.35 }, { r: 3, g: 0.1 }], attack: 0.6, release: 1.0, unison: 3, detune: 0.005, rand });
  swell(s, { freq: D.G3, start: 0.15, dur: 2.2, vol: 0.16, partials: [{ r: 1, g: 1 }, { r: 2, g: 0.25 }], attack: 0.7, release: 1.0, unison: 3, detune: 0.006, rand });
  swell(s, { freq: N.D4, start: 0.35, dur: 1.9, vol: 0.11, attack: 0.7, release: 0.9, unison: 3, detune: 0.006, rand });
  swell(s, { freq: N.E4, start: 0.55, dur: 1.7, vol: 0.09, attack: 0.65, release: 0.9, unison: 2, detune: 0.005, rand });
  // The wrong-note: a lowered seventh drifting under the add9.
  swell(s, { freq: D.Bb3, start: 0.9, dur: 1.2, vol: 0.05, attack: 0.6, release: 0.7, unison: 2, detune: 0.007, rand });
  strike(s, { freq: N.C5, start: 1.1, dur: 1.3, vol: 0.3, partials: HANDBELL, attack: 0.006, decayShape: 3.8, unison: 2, detune: 0.003, rand });
  noiseBurst(s, { start: 0.3, dur: 1.6, vol: 0.05, lp: 0.7, hp: 0.6, attack: 0.5, decayShape: 3.5, rand });
}, { reverb: { wet: 0.32, decay: 0.82, damp: 0.45, tail: 1.0 }, peak: 0.68 });

// phase_change_dark: the original low ritual swell — sub pad, tritone shading,
// distant dark bell. Now explicitly the Phase 3+ ceremony voice.
render('phase_change_dark', 2.6, (s, rand) => {
  swell(s, { freq: D.C2, dur: 2.4, vol: 0.3, partials: [{ r: 1, g: 1 }, { r: 2, g: 0.4 }, { r: 3, g: 0.12 }], attack: 0.7, release: 1.1, unison: 3, detune: 0.006, rand });
  swell(s, { freq: D.C3, start: 0.2, dur: 2.1, vol: 0.16, partials: [{ r: 1, g: 1 }, { r: 2, g: 0.25 }], attack: 0.8, release: 1.0, unison: 3, detune: 0.007, rand });
  swell(s, { freq: D.Gb3, start: 0.7, dur: 1.6, vol: 0.09, attack: 0.7, release: 0.8, unison: 3, detune: 0.008, rand });
  strike(s, { freq: D.C4, start: 1.1, dur: 1.3, vol: 0.28, partials: DARK_BELL, attack: 0.01, decayShape: 4, unison: 2, detune: 0.003, rand });
  noiseBurst(s, { start: 0.2, dur: 2.0, vol: 0.1, lp: 0.03, attack: 0.5, decayShape: 3.5, rand });
}, { reverb: { wet: 0.35, decay: 0.85, damp: 0.5, tail: 1.1 }, peak: 0.72 });

// arrival: THE descent's own sound (finale cinematic only; no dark mirror —
// it IS the wrongness at any phase). ~8s: the world's pad dying downward
// through minor steps, then ONE enormous slow-attack bell whose strike lands
// with the overlay's settle haptic (~4.7s wall-clock at the shipped 1.25x
// time scale), and a sub breath receding into the tail. Deliberate
// mid-frequency body (C3/C4 bell pair, HOLLOW steps) so phone speakers,
// which lose the sub, still carry the moment.
render('arrival', 8.0, (s, rand) => {
  swell(s, { freq: D.C2, dur: 5.2, vol: 0.3, partials: [{ r: 1, g: 1 }, { r: 2, g: 0.45 }, { r: 3, g: 0.15 }], attack: 1.2, release: 2.4, unison: 3, detune: 0.007, rand });
  swell(s, { freq: D.C3, start: 0.4, dur: 4.6, vol: 0.18, partials: [{ r: 1, g: 1 }, { r: 2, g: 0.3 }], attack: 1.1, release: 2.2, unison: 3, detune: 0.008, rand });
  swell(s, { freq: D.Gb3, start: 1.2, dur: 3.4, vol: 0.08, attack: 1.0, release: 1.6, unison: 3, detune: 0.009, rand });
  // Descending minor steps as it comes down: Eb3 -> C3 -> G2.
  strike(s, { freq: D.Eb3, start: 1.6, dur: 1.4, vol: 0.14, partials: HOLLOW, attack: 0.05, decayShape: 3.2, unison: 2, detune: 0.005, rand });
  strike(s, { freq: D.C3, start: 2.7, dur: 1.6, vol: 0.16, partials: HOLLOW, attack: 0.05, decayShape: 3.0, unison: 2, detune: 0.005, rand });
  strike(s, { freq: D.G2, start: 3.6, dur: 1.8, vol: 0.16, partials: HOLLOW, attack: 0.06, decayShape: 2.8, unison: 2, detune: 0.006, rand });
  // THE bell: one enormous slow-attack strike, landing with the settle.
  strike(s, { freq: D.C4, start: 4.4, dur: 3.2, vol: 0.42, partials: DARK_BELL, attack: 0.28, decayShape: 2.6, unison: 2, detune: 0.004, rand });
  strike(s, { freq: D.C3, start: 4.45, dur: 3.0, vol: 0.2, partials: DARK_BELL, attack: 0.3, decayShape: 2.6, rand });
  // Sub breath: gathers under the descent, exhales with the bell.
  noiseBurst(s, { start: 0.1, dur: 4.0, vol: 0.08, lp: 0.05, attack: 1.2, decayShape: 2.8, rand });
  noiseBurst(s, { start: 4.4, dur: 2.6, vol: 0.1, lp: 0.08, attack: 0.25, decayShape: 3.0, rand });
}, { reverb: { wet: 0.4, decay: 0.9, damp: 0.5, tail: 1.6 }, peak: 0.74 });

// daily_ready: warm handbell pair, G5 then C6.
render('daily_ready', 1.0, (s, rand) => {
  strike(s, { freq: N.G5, dur: 0.5, vol: 0.4, partials: HANDBELL, decayShape: 4, attack: 0.003, rand });
  strike(s, { freq: N.C6, start: 0.22, dur: 0.65, vol: 0.4, partials: HANDBELL, decayShape: 3.8, attack: 0.003, rand });
}, { reverb: { wet: 0.3, tail: 0.6 }, peak: 0.65 });

// ui_tap: crisp warm confirm tick for primary UI (Play, Next, purchases). A
// touch fuller than the board `tap`, still short and nearly dry.
render('ui_tap', 0.15, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.014, vol: 0.4, lp: 0.55, decayShape: 10, rand });
  strike(s, { freq: N.G5, dur: 0.12, vol: 0.5, partials: CELESTA, attack: 0.0015, decayShape: 7.5, unison: 2, detune: 0.002, rand });
  strike(s, { freq: N.C6, start: 0.006, dur: 0.08, vol: 0.14, partials: CELESTA, decayShape: 8, rand });
}, { reverb: { wet: 0.07, tail: 0.12 }, peak: 0.5 });

// ui_tick: soft high selection tick for toggles / selectable rows. Quiet and
// quick so a menu full of them never fatigues.
render('ui_tick', 0.1, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.008, vol: 0.22, lp: 0.6, decayShape: 12, rand });
  strike(s, { freq: N.C6, dur: 0.075, vol: 0.34, partials: CELESTA, attack: 0.001, decayShape: 9, rand });
}, { reverb: { wet: 0.05, tail: 0.08 }, peak: 0.4 });

// ===========================================================================
// DARK SFX (Phase 3+): hollow, minor, sub-heavy — the descent reaches the
// ears. The move ladder DESCENDS: each combo tier sinks lower.
// ===========================================================================

// tap_dark: dull hollow knock, barely pitched.
render('tap_dark', 0.24, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.03, vol: 0.4, lp: 0.1, decayShape: 9, rand });
  strike(s, { freq: D.A3, dur: 0.18, vol: 0.55, partials: HOLLOW, attack: 0.004, decayShape: 6.5, unison: 2, detune: 0.003, rand });
}, { reverb: { wet: 0.15, damp: 0.6, tail: 0.25 }, peak: 0.45 });

// letter_select_dark: hollow pluck with wide detune (slow uneasy beating).
render('letter_select_dark', 0.36, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.05, vol: 0.15, lp: 0.06, decayShape: 8, rand });
  strike(s, { freq: D.Eb4, dur: 0.3, vol: 0.6, partials: HOLLOW, attack: 0.006, decayShape: 5, unison: 3, detune: 0.006, rand });
}, { reverb: { wet: 0.2, damp: 0.55, tail: 0.3 }, peak: 0.55 });

// valid_move_dark combo ladder: two-note hollow FALLS sinking lower per tier.
function darkMove(name, note1, note2, opts = {}) {
  const { vol = 0.6, attack = 0.006, wet = 0.25, tail = 0.5, peak = 0.6, dur2 = 0.34, extra } = opts;
  render(name, 0.55, (s, rand) => {
    noiseBurst(s, { start: 0, dur: 0.05, vol: 0.08, lp: 0.05, decayShape: 7, rand });
    strike(s, { freq: note1, dur: 0.26, vol, partials: HOLLOW, attack, decayShape: 5, bend: -0.04, unison: 2, detune: 0.004, rand });
    strike(s, { freq: note2, start: 0.09, dur: dur2, vol: vol * 0.92, partials: HOLLOW, attack, decayShape: 4.5, bend: -0.05, unison: 2, detune: 0.004, rand });
    if (extra) extra(s, rand);
  }, { reverb: { wet, damp: 0.5, decay: 0.78, tail }, peak });
}
darkMove('valid_move_dark', D.G3, D.Eb3);
darkMove('valid_move_2_dark', D.F3, D.C3, { attack: 0.008 });
darkMove('valid_move_3_dark', D.Eb3, D.Bb2, { attack: 0.01, dur2: 0.38, extra: (s, rand) => {
  strike(s, { freq: D.A4, start: 0.16, dur: 0.3, vol: 0.06, partials: DARK_BELL, attack: 0.01, decayShape: 4.5, rand });
} });
darkMove('valid_move_4_dark', D.C3, D.G2, { attack: 0.012, dur2: 0.42, wet: 0.3, tail: 0.6, peak: 0.62, extra: (s, rand) => {
  strike(s, { freq: D.Gb4, start: 0.18, dur: 0.32, vol: 0.07, partials: DARK_BELL, attack: 0.012, decayShape: 4.5, rand });
  noiseBurst(s, { start: 0.05, dur: 0.3, vol: 0.1, lp: 0.04, attack: 0.05, decayShape: 4, rand });
} });

// invalid_move_dark: deep double thud with a sub groan underneath.
render('invalid_move_dark', 0.5, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.04, vol: 0.3, lp: 0.05, decayShape: 8, rand });
  strike(s, { freq: D.C3, dur: 0.16, vol: 0.6, partials: HOLLOW, attack: 0.004, decayShape: 6.5, bend: -0.15, unison: 2, detune: 0.003, rand });
  noiseBurst(s, { start: 0.12, dur: 0.04, vol: 0.25, lp: 0.05, decayShape: 8, rand });
  strike(s, { freq: D.Bb2, start: 0.12, dur: 0.22, vol: 0.55, partials: HOLLOW, attack: 0.004, decayShape: 6, bend: -0.15, unison: 2, detune: 0.003, rand });
  swell(s, { freq: D.C2, start: 0.02, dur: 0.35, vol: 0.25, attack: 0.05, release: 0.2, unison: 2, detune: 0.005, rand });
}, { reverb: { wet: 0.12, damp: 0.65, tail: 0.3 }, peak: 0.58 });

// undo_dark: hollow falling slide with breath.
render('undo_dark', 0.4, (s, rand) => {
  strike(s, { freq: D.C4, dur: 0.28, vol: 0.55, partials: HOLLOW, attack: 0.006, decayShape: 5.5, bend: -0.25, unison: 2, detune: 0.004, rand });
  noiseBurst(s, { start: 0.02, dur: 0.12, vol: 0.12, lp: 0.07, decayShape: 6, rand });
}, { reverb: { wet: 0.2, damp: 0.55, tail: 0.3 }, peak: 0.5 });

// amber_earn_dark: cold coin — a muted bell pair falling Eb5→Bb4.
render('amber_earn_dark', 0.6, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.015, vol: 0.2, lp: 0.3, decayShape: 10, rand });
  strike(s, { freq: D.Eb5, dur: 0.24, vol: 0.4, partials: DARK_BELL, attack: 0.005, decayShape: 5, unison: 2, detune: 0.004, rand });
  strike(s, { freq: D.Bb4, start: 0.09, dur: 0.32, vol: 0.4, partials: DARK_BELL, attack: 0.005, decayShape: 4.5, unison: 2, detune: 0.004, rand });
}, { reverb: { wet: 0.22, damp: 0.55, tail: 0.4 }, peak: 0.55 });

// pit_devour_dark: the same swallow, hungrier — a sub-hum opens beneath it.
render('pit_devour_dark', 0.35, (s, rand) => {
  strike(s, { freq: D.C3, dur: 0.24, vol: 0.5, partials: HOLLOW, attack: 0.004, decayShape: 6, bend: -0.1, unison: 2, detune: 0.003, rand });
  noiseBurst(s, { start: 0.02, dur: 0.3, vol: 0.26, lp: 0.07, attack: 0.06, decayShape: 3.8, rand });
  swell(s, { freq: D.C2, start: 0.01, dur: 0.32, vol: 0.3, attack: 0.04, release: 0.18, unison: 2, detune: 0.005, rand });
}, { reverb: { wet: 0.24, damp: 0.6, tail: 0.35 }, peak: 0.5 });

// hint_dark: the hint sparkle gone cold — a falling dark-bell pair, not celesta.
render('hint_dark', 0.5, (s, rand) => {
  strike(s, { freq: D.Ab4, dur: 0.2, vol: 0.32, partials: DARK_BELL, attack: 0.006, decayShape: 5, rand });
  strike(s, { freq: D.Eb4, start: 0.09, dur: 0.3, vol: 0.32, partials: DARK_BELL, attack: 0.008, decayShape: 4.5, bend: -0.04, unison: 2, detune: 0.004, rand });
  noiseBurst(s, { start: 0.02, dur: 0.2, vol: 0.06, lp: 0.5, hp: 0.4, decayShape: 4, rand });
}, { reverb: { wet: 0.24, damp: 0.55, tail: 0.4 }, peak: 0.5 });

// dialogue_dark: low hollow blip (quiet — fires on every line).
render('dialogue_dark', 0.2, (s, rand) => {
  strike(s, { freq: D.C4, dur: 0.15, vol: 0.45, partials: HOLLOW, attack: 0.004, decayShape: 7, unison: 2, detune: 0.004, rand });
}, { reverb: { wet: 0.12, damp: 0.6, tail: 0.15 }, peak: 0.4 });

// victory_dark: descending dark-bell line over a sub swell — the win that
// feels like a door closing.
render('victory_dark', 2.0, (s, rand) => {
  const line = [ [D.C5, 0, 0.4], [D.Ab4, 0.16, 0.42], [D.Eb4, 0.34, 0.45], [D.C4, 0.55, 0.5] ];
  for (const [f, t, v] of line) {
    strike(s, { freq: f, start: t, dur: 0.6, vol: v, partials: DARK_BELL, attack: 0.008, decayShape: 4.2, unison: 2, detune: 0.004, rand });
  }
  swell(s, { freq: D.C3, start: 0.3, dur: 1.4, vol: 0.2, partials: [{ r: 1, g: 1 }, { r: 2, g: 0.3 }], attack: 0.4, release: 0.7, unison: 3, detune: 0.006, rand });
  noiseBurst(s, { start: 0.1, dur: 1.2, vol: 0.06, lp: 0.04, attack: 0.3, decayShape: 4, rand });
}, { reverb: { wet: 0.32, damp: 0.5, decay: 0.82, tail: 0.9 }, peak: 0.7 });

// perfect_dark: the dark victory line, longer, with a tritone bell and a
// faint semitone-beat shimmer on top — the flawless reward, wrong-tuned.
render('perfect_dark', 2.6, (s, rand) => {
  const line = [ [D.C5, 0, 0.38], [D.Ab4, 0.16, 0.4], [D.Eb4, 0.34, 0.42], [D.C4, 0.55, 0.48] ];
  for (const [f, t, v] of line) {
    strike(s, { freq: f, start: t, dur: 0.65, vol: v, partials: DARK_BELL, attack: 0.008, decayShape: 4, unison: 2, detune: 0.004, rand });
  }
  strike(s, { freq: D.Gb4, start: 0.78, dur: 0.7, vol: 0.22, partials: DARK_BELL, attack: 0.012, decayShape: 3.8, unison: 2, detune: 0.004, rand });
  swell(s, { freq: D.B5, start: 0.9, dur: 1.2, vol: 0.03, attack: 0.5, release: 0.6, unison: 1, rand });
  swell(s, { freq: D.C6, start: 0.9, dur: 1.2, vol: 0.03, attack: 0.5, release: 0.6, unison: 1, rand });
  swell(s, { freq: D.C3, start: 0.35, dur: 1.9, vol: 0.2, partials: [{ r: 1, g: 1 }, { r: 2, g: 0.3 }], attack: 0.5, release: 0.9, unison: 3, detune: 0.006, rand });
  noiseBurst(s, { start: 0.1, dur: 1.6, vol: 0.06, lp: 0.04, attack: 0.4, decayShape: 3.5, rand });
}, { reverb: { wet: 0.34, damp: 0.5, decay: 0.84, tail: 1.0 }, peak: 0.72 });

// ui_tap_dark: hollow confirm knock for primary UI at Phase 3+.
render('ui_tap_dark', 0.2, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.03, vol: 0.35, lp: 0.1, decayShape: 9, rand });
  strike(s, { freq: D.C4, dur: 0.16, vol: 0.5, partials: HOLLOW, attack: 0.003, decayShape: 7, unison: 2, detune: 0.003, rand });
}, { reverb: { wet: 0.13, damp: 0.6, tail: 0.2 }, peak: 0.44 });

// ui_tick_dark: quiet low hollow blip for toggles / rows at Phase 3+.
render('ui_tick_dark', 0.16, (s, rand) => {
  strike(s, { freq: D.Eb4, dur: 0.11, vol: 0.4, partials: HOLLOW, attack: 0.003, decayShape: 8, unison: 2, detune: 0.004, rand });
}, { reverb: { wet: 0.1, damp: 0.6, tail: 0.12 }, peak: 0.38 });

// ===========================================================================
// HORROR CUES: standalone wrong-notes for the post-victory orchestration. No
// dark mirror — they are ALREADY the wrongness, at any phase, and stay quiet.
// ===========================================================================

// glitch: a moment of wrong authorship — a detuned dark bell bends downward
// while two torn high-noise stutters skip at 0 and 70ms. Peak kept low.
render('glitch', 0.45, (s, rand) => {
  strike(s, { freq: D.Gb4, dur: 0.4, vol: 0.4, partials: DARK_BELL, attack: 0.004, decayShape: 4.5, bend: -0.12, unison: 3, detune: 0.02, rand });
  noiseBurst(s, { start: 0, dur: 0.05, vol: 0.3, lp: 0.9, hp: 0.9, decayShape: 8, rand });
  noiseBurst(s, { start: 0.07, dur: 0.05, vol: 0.28, lp: 0.9, hp: 0.9, decayShape: 8, rand });
}, { reverb: { wet: 0.18, damp: 0.5, tail: 0.3 }, peak: 0.35 });

// whisper: airy presence, no pitch — a band-limited breath swell. The sound of
// being noticed. Very quiet.
render('whisper', 0.9, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.85, vol: 0.4, lp: 0.5, hp: 0.6, attack: 0.25, decayShape: 2.2, rand });
  noiseBurst(s, { start: 0.2, dur: 0.6, vol: 0.18, lp: 0.7, hp: 0.8, attack: 0.2, decayShape: 2.5, rand });
}, { reverb: { wet: 0.3, damp: 0.45, tail: 0.5 }, peak: 0.3 });

// ===========================================================================
// TERRIBLE PEACE SFX (Phase 5): the most frequent sounds resolved into soft
// settled bells. Picked by resolveSfxForPhase's peace tier — everything
// without a _peace variant keeps its dark mirror (the settled-dark palette).
// Design: NEITHER rising NOR sinking. The combo ladder holds one constant
// low root (C4) and ASSEMBLES the house's C-add9 chord across the streak
// (root -> +fifth -> +third -> +ninth); the victory pair is quiet resolved
// bells with the add9 restored and no tritone anywhere.
// ===========================================================================

// Peace move ladder: constant C4 handbell root, one consonant color note added
// per tier at constant loudness — the streak deepens the chord, not the pitch.
function peaceMove(name, colorNote, opts = {}) {
  const { colorVol = 0.16, wet = 0.24, peak = 0.5, extra } = opts;
  render(name, 0.7, (s, rand) => {
    noiseBurst(s, { start: 0, dur: 0.015, vol: 0.1, lp: 0.25, decayShape: 10, rand });
    strike(s, { freq: N.C4, dur: 0.55, vol: 0.42, partials: HANDBELL, attack: 0.008, decayShape: 4.2, unison: 2, detune: 0.0025, rand });
    if (colorNote) {
      strike(s, { freq: colorNote, start: 0.05, dur: 0.5, vol: colorVol, partials: CELESTA, attack: 0.01, decayShape: 4.5, unison: 2, detune: 0.003, rand });
    }
    if (extra) extra(s, rand);
  }, { reverb: { wet, decay: 0.8, damp: 0.55, tail: 0.5 }, peak });
}
peaceMove('valid_move_peace', null);
peaceMove('valid_move_2_peace', N.G4);
peaceMove('valid_move_3_peace', N.E5, { colorVol: 0.13 });
peaceMove('valid_move_4_peace', N.D5, { colorVol: 0.14, wet: 0.28, extra: (s, rand) => {
  // The ninth lands with the faintest settled air — the chord is whole.
  strike(s, { freq: N.G4, start: 0.08, dur: 0.45, vol: 0.09, partials: CELESTA, attack: 0.012, decayShape: 4.5, rand });
  noiseBurst(s, { start: 0.1, dur: 0.3, vol: 0.03, lp: 0.85, hp: 0.8, attack: 0.08, decayShape: 3.5, rand });
} });

// victory_peace: three soft resolved handbells (C4 -> G4 -> C5) with a faint
// third above — a completed thing set gently down, not a celebration.
render('victory_peace', 1.8, (s, rand) => {
  strike(s, { freq: N.C4, dur: 1.0, vol: 0.34, partials: HANDBELL, attack: 0.01, decayShape: 3.4, unison: 2, detune: 0.003, rand });
  strike(s, { freq: N.G4, start: 0.3, dur: 1.0, vol: 0.26, partials: HANDBELL, attack: 0.012, decayShape: 3.2, unison: 2, detune: 0.003, rand });
  strike(s, { freq: N.C5, start: 0.62, dur: 1.1, vol: 0.22, partials: HANDBELL, attack: 0.012, decayShape: 3.0, unison: 2, detune: 0.003, rand });
  strike(s, { freq: N.E5, start: 0.9, dur: 0.8, vol: 0.09, partials: CELESTA, attack: 0.015, decayShape: 3.6, rand });
}, { reverb: { wet: 0.32, decay: 0.84, damp: 0.55, tail: 0.8 }, peak: 0.6 });

// perfect_peace: the victory bells completed by the ninth — the full C-add9
// laid down slowly with a distant high shimmer. Serene, whole, unhurried.
render('perfect_peace', 2.2, (s, rand) => {
  strike(s, { freq: N.C4, dur: 1.1, vol: 0.34, partials: HANDBELL, attack: 0.01, decayShape: 3.2, unison: 2, detune: 0.003, rand });
  strike(s, { freq: N.G4, start: 0.28, dur: 1.1, vol: 0.26, partials: HANDBELL, attack: 0.012, decayShape: 3.0, unison: 2, detune: 0.003, rand });
  strike(s, { freq: N.C5, start: 0.58, dur: 1.2, vol: 0.22, partials: HANDBELL, attack: 0.012, decayShape: 2.9, unison: 2, detune: 0.003, rand });
  strike(s, { freq: N.E5, start: 0.86, dur: 1.0, vol: 0.12, partials: CELESTA, attack: 0.015, decayShape: 3.4, rand });
  strike(s, { freq: N.D5, start: 1.08, dur: 1.0, vol: 0.11, partials: CELESTA, attack: 0.018, decayShape: 3.4, rand });
  strike(s, { freq: N.C6, start: 1.3, dur: 0.8, vol: 0.06, partials: CELESTA, attack: 0.02, decayShape: 3.8, rand });
  noiseBurst(s, { start: 0.8, dur: 0.7, vol: 0.03, lp: 0.85, hp: 0.8, attack: 0.25, decayShape: 3, rand });
}, { reverb: { wet: 0.34, decay: 0.85, damp: 0.55, tail: 1.0 }, peak: 0.62 });

// dialogue_peace: the tiny blip settled low and warm (fires on every line).
render('dialogue_peace', 0.18, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.008, vol: 0.1, lp: 0.3, decayShape: 12, rand });
  strike(s, { freq: N.D4, dur: 0.14, vol: 0.36, partials: CELESTA, attack: 0.004, decayShape: 7, unison: 2, detune: 0.003, rand });
}, { reverb: { wet: 0.1, damp: 0.5, tail: 0.14 }, peak: 0.38 });

// letter_select_peace: a soft settled pluck one octave under the bright E5.
render('letter_select_peace', 0.3, (s, rand) => {
  noiseBurst(s, { start: 0, dur: 0.01, vol: 0.16, lp: 0.3, decayShape: 11, rand });
  strike(s, { freq: N.E4, dur: 0.26, vol: 0.5, partials: HANDBELL, attack: 0.006, decayShape: 5.5, unison: 2, detune: 0.003, rand });
}, { reverb: { wet: 0.14, damp: 0.5, tail: 0.24 }, peak: 0.52 });

// ===========================================================================
// AMBIENT MUSIC BEDS: three screen families × bright/dusk/dark/peace loops
// sharing one musical DNA. Quiet by design — a bed, not a song. Loop-exact by
// construction: continuous voices quantized to integer cycles, event tails
// wrapped, reverb double-pass.
// ===========================================================================

// music_bright (18s): warm slow-breathing C add9 pad with gentle celesta
// sparkle on the pentatonic — the cozy candy meadow.
renderLoop('music_bright', 18, (s, { rand, q }) => {
  const padVoice = (f, vol, lfoCycles, lfoDepth, lfoPhase) => {
    loopPad(s, { freq: q(f), vol, lfoCycles, lfoDepth, lfoPhase, phase: rand() * 2 * Math.PI });
    // Detuned twin for chorus warmth (also quantized → still periodic).
    loopPad(s, { freq: q(f * 1.0035), vol: vol * 0.6, lfoCycles, lfoDepth, lfoPhase: lfoPhase + 1.3, phase: rand() * 2 * Math.PI });
  };
  padVoice(N.C4 / 2, 0.16, 2, 0.35, 0);      // C3 root
  padVoice(N.G4 / 2, 0.11, 3, 0.4, 1.1);     // G3 fifth
  padVoice(N.C4, 0.09, 2, 0.45, 2.4);        // C4
  padVoice(N.E4, 0.07, 4, 0.5, 0.7);         // E4 third
  padVoice(N.D4, 0.045, 1, 0.7, 3.6);        // D4 ninth, breathes once per loop
  loopPad(s, { freq: q(N.C4 / 4), vol: 0.05, lfoCycles: 2, lfoDepth: 0.3, phase: rand() });
  // Sparkle: seven soft celesta notes scattered across the loop.
  const sparkleNotes = [N.C6, N.D6, N.E6, N.G6, N.A6, N.E6, N.G6];
  for (let k = 0; k < sparkleNotes.length; k++) {
    const t = (k + 0.15 + rand() * 0.7) * (18 / sparkleNotes.length);
    loopEvent(s, t, 1.6, (tmp) => {
      strike(tmp, { freq: sparkleNotes[k], dur: 1.4, vol: 0.045 + rand() * 0.02, partials: CELESTA, attack: 0.003, decayShape: 4.5, unison: 2, detune: 0.003, rand });
    });
  }
}, { reverb: { wet: 0.3, decay: 0.8, damp: 0.45 }, peak: 0.5 });

// music_dusk (20s): the same chord cooled and slowed — dimmer third, wider
// detune, an occasional lowered 7th (Bb) drifting through, rarer duller
// sparkle. Familiar, but the light is going.
renderLoop('music_dusk', 20, (s, { rand, q }) => {
  const padVoice = (f, vol, lfoCycles, lfoDepth, lfoPhase, det = 1.005) => {
    loopPad(s, { freq: q(f), vol, lfoCycles, lfoDepth, lfoPhase, phase: rand() * 2 * Math.PI });
    loopPad(s, { freq: q(f * det), vol: vol * 0.6, lfoCycles, lfoDepth, lfoPhase: lfoPhase + 1.3, phase: rand() * 2 * Math.PI });
  };
  padVoice(N.C4 / 2, 0.16, 1, 0.4, 0);       // C3 root, one slow breath
  padVoice(N.G4 / 2, 0.1, 2, 0.45, 1.1);     // G3
  padVoice(N.C4, 0.08, 1, 0.5, 2.4);         // C4
  padVoice(N.E4, 0.05, 2, 0.6, 0.7);         // E4 dimmed
  padVoice(N.A4 / 2 * 1.0594631, 0.05, 1, 0.85, 4.4);  // Bb3 lowered 7th, comes and goes
  loopPad(s, { freq: q(N.C4 / 4), vol: 0.06, lfoCycles: 1, lfoDepth: 0.35, phase: rand() });
  // Sparse, lower, duller sparkle.
  const sparkleNotes = [N.G5, N.A5, N.C6, N.E6];
  for (let k = 0; k < sparkleNotes.length; k++) {
    const t = (k + 0.2 + rand() * 0.6) * (20 / sparkleNotes.length);
    loopEvent(s, t, 2.0, (tmp) => {
      strike(tmp, { freq: sparkleNotes[k], dur: 1.8, vol: 0.035 + rand() * 0.015, partials: CELESTA, attack: 0.006, decayShape: 4, unison: 2, detune: 0.004, rand });
    });
  }
  // One quiet handbell C5 mid-loop — a far-off hour striking.
  loopEvent(s, 11.3, 2.4, (tmp) => {
    strike(tmp, { freq: N.C5, dur: 2.2, vol: 0.05, partials: HANDBELL, attack: 0.006, decayShape: 3.2, unison: 2, detune: 0.003, rand });
  });
}, { reverb: { wet: 0.34, decay: 0.82, damp: 0.55 }, peak: 0.48 });

// music_dark (24s): the same DNA corrupted — low, detuned, sparse. A slow sub
// pulse, a sour beating pair on the root, minor third and tritone shading, a
// faint semitone shimmer far above, and two distant dark-bell tolls.
renderLoop('music_dark', 24, (s, { rand, q }) => {
  // Sub pulse: C2 swelling every 3 seconds.
  loopPad(s, { freq: q(D.C2), vol: 0.2, lfoCycles: 8, lfoDepth: 0.85, phase: rand() * 2 * Math.PI });
  // Sour root pair: C3 against a copy ~10 cents off — slow, wrong beating.
  loopPad(s, { freq: q(D.C3), vol: 0.12, lfoCycles: 2, lfoDepth: 0.4, phase: rand() * 2 * Math.PI });
  loopPad(s, { freq: q(D.C3 * 1.006), vol: 0.1, lfoCycles: 2, lfoDepth: 0.4, lfoPhase: 0.9, phase: rand() * 2 * Math.PI });
  // Minor third and tritone, drifting in and out.
  loopPad(s, { freq: q(D.Eb3), vol: 0.07, lfoCycles: 2, lfoDepth: 0.6, lfoPhase: 2.2, phase: rand() * 2 * Math.PI });
  loopPad(s, { freq: q(D.Gb3), vol: 0.045, lfoCycles: 3, lfoDepth: 0.8, lfoPhase: 4.1, phase: rand() * 2 * Math.PI });
  // Faint dissonant shimmer: B5/C6 semitone pair beating far above.
  loopPad(s, { freq: q(D.B5), vol: 0.018, lfoCycles: 5, lfoDepth: 0.9, lfoPhase: 1.5, phase: rand() * 2 * Math.PI });
  loopPad(s, { freq: q(D.C6), vol: 0.018, lfoCycles: 5, lfoDepth: 0.9, lfoPhase: 3.8, phase: rand() * 2 * Math.PI });
  // Two distant dark-bell tolls and one slow breath of wind.
  loopEvent(s, 6.2, 3.2, (tmp) => {
    strike(tmp, { freq: D.C4, dur: 3.0, vol: 0.08, partials: DARK_BELL, attack: 0.015, decayShape: 3.2, unison: 2, detune: 0.004, rand });
  });
  loopEvent(s, 17.5, 3.2, (tmp) => {
    strike(tmp, { freq: D.G3, dur: 3.0, vol: 0.07, partials: DARK_BELL, attack: 0.015, decayShape: 3.2, unison: 2, detune: 0.004, rand });
  });
  loopEvent(s, 12.0, 5.0, (tmp) => {
    noiseBurst(tmp, { start: 0, dur: 4.5, vol: 0.05, lp: 0.02, attack: 1.5, decayShape: 3, rand });
  });
}, { reverb: { wet: 0.38, decay: 0.85, damp: 0.6 }, peak: 0.5 });

// ===========================================================================
// PUZZLE MUSIC BEDS (played on the puzzle screen). Same C add9 DNA as the home
// beds, but FOCUSED: fewer pad voices, centered mid-register, a soft breathing
// root and only one or two quiet high notes — cleaner so it never distracts
// from solving. Darkens with the descent like the world beds.
// ===========================================================================

// music_puzzle_bright (16s): warm but minimal — a small focused chord.
renderLoop('music_puzzle_bright', 16, (s, { rand, q }) => {
  const padVoice = (f, vol, lfoCycles, lfoDepth, lfoPhase) => {
    loopPad(s, { freq: q(f), vol, lfoCycles, lfoDepth, lfoPhase, phase: rand() * 2 * Math.PI });
    loopPad(s, { freq: q(f * 1.003), vol: vol * 0.55, lfoCycles, lfoDepth, lfoPhase: lfoPhase + 1.2, phase: rand() * 2 * Math.PI });
  };
  padVoice(N.C4, 0.12, 2, 0.32, 0);     // C4
  padVoice(N.G4, 0.075, 3, 0.4, 1.4);   // G4 fifth
  padVoice(N.E4, 0.05, 2, 0.5, 2.6);    // E4 third
  loopPad(s, { freq: q(N.C4 / 2), vol: 0.1, lfoCycles: 3, lfoDepth: 0.5, phase: rand() * 2 * Math.PI }); // C3 soft breath
  const notes = [N.G5, N.C6];
  for (let k = 0; k < notes.length; k++) {
    const t = (k + 0.3 + rand() * 0.5) * (16 / notes.length);
    loopEvent(s, t, 1.4, (tmp) => {
      strike(tmp, { freq: notes[k], dur: 1.2, vol: 0.028 + rand() * 0.01, partials: CELESTA, attack: 0.004, decayShape: 4.5, unison: 2, detune: 0.003, rand });
    });
  }
}, { reverb: { wet: 0.24, decay: 0.75, damp: 0.5 }, peak: 0.46 });

// music_puzzle_dusk (18s): the focused chord cooled — dimmer third, a lowered
// 7th drifting through, one duller note.
renderLoop('music_puzzle_dusk', 18, (s, { rand, q }) => {
  const padVoice = (f, vol, lfoCycles, lfoDepth, lfoPhase, det = 1.004) => {
    loopPad(s, { freq: q(f), vol, lfoCycles, lfoDepth, lfoPhase, phase: rand() * 2 * Math.PI });
    loopPad(s, { freq: q(f * det), vol: vol * 0.55, lfoCycles, lfoDepth, lfoPhase: lfoPhase + 1.3, phase: rand() * 2 * Math.PI });
  };
  padVoice(N.C4, 0.12, 1, 0.4, 0);      // C4
  padVoice(N.G4, 0.07, 2, 0.45, 1.4);   // G4
  padVoice(N.E4, 0.042, 1, 0.55, 2.6);  // E4 dimmed
  padVoice(D.Bb3, 0.04, 1, 0.85, 4.2);  // Bb3 lowered 7th, comes and goes
  loopPad(s, { freq: q(N.C4 / 2), vol: 0.1, lfoCycles: 2, lfoDepth: 0.5, phase: rand() * 2 * Math.PI }); // C3 breath
  loopEvent(s, 9.5, 2.2, (tmp) => {
    strike(tmp, { freq: N.G5, dur: 2.0, vol: 0.03, partials: CELESTA, attack: 0.007, decayShape: 4, unison: 2, detune: 0.004, rand });
  });
}, { reverb: { wet: 0.3, decay: 0.8, damp: 0.55 }, peak: 0.46 });

// music_puzzle_dark (22s): focused DREAD — a hollow mid drone, sour root pair,
// minor third + tritone shading, one distant dark bell. Sparser and less
// sub-heavy than the world's music_dark (the mind, not the whole world).
renderLoop('music_puzzle_dark', 22, (s, { rand, q }) => {
  loopPad(s, { freq: q(D.C3), vol: 0.13, lfoCycles: 2, lfoDepth: 0.42, phase: rand() * 2 * Math.PI });
  loopPad(s, { freq: q(D.C3 * 1.006), vol: 0.1, lfoCycles: 2, lfoDepth: 0.42, lfoPhase: 0.9, phase: rand() * 2 * Math.PI });
  loopPad(s, { freq: q(D.Eb3), vol: 0.07, lfoCycles: 2, lfoDepth: 0.6, lfoPhase: 2.2, phase: rand() * 2 * Math.PI });
  loopPad(s, { freq: q(D.Gb3), vol: 0.04, lfoCycles: 3, lfoDepth: 0.8, lfoPhase: 4.1, phase: rand() * 2 * Math.PI });
  loopPad(s, { freq: q(D.C2), vol: 0.09, lfoCycles: 4, lfoDepth: 0.7, phase: rand() * 2 * Math.PI }); // slow sub breath
  loopEvent(s, 10.5, 3.2, (tmp) => {
    strike(tmp, { freq: D.C4, dur: 3.0, vol: 0.07, partials: DARK_BELL, attack: 0.015, decayShape: 3.2, unison: 2, detune: 0.004, rand });
  });
}, { reverb: { wet: 0.34, decay: 0.83, damp: 0.58 }, peak: 0.48 });

// ===========================================================================
// PIT MUSIC BEDS (played on the Offering Pit screen). The same DNA, but sunk
// underground: a low drone with GRAVITY even in the bright days, wide reverb,
// and distant bell tolls — a ritual space. Darkens into full cavernous dread.
// ===========================================================================

// music_pit_bright (18s): spacious and hollow — the pit already has weight.
renderLoop('music_pit_bright', 18, (s, { rand, q }) => {
  loopPad(s, { freq: q(N.C4 / 4), vol: 0.17, lfoCycles: 2, lfoDepth: 0.45, phase: rand() * 2 * Math.PI }); // C2 sub
  loopPad(s, { freq: q(N.C4 / 2), vol: 0.1, lfoCycles: 2, lfoDepth: 0.4, lfoPhase: 1.2, phase: rand() * 2 * Math.PI }); // C3
  loopPad(s, { freq: q(N.G4 / 2), vol: 0.07, lfoCycles: 3, lfoDepth: 0.5, lfoPhase: 2.5, phase: rand() * 2 * Math.PI }); // G3
  loopPad(s, { freq: q(N.E4), vol: 0.032, lfoCycles: 1, lfoDepth: 0.7, lfoPhase: 4.0, phase: rand() * 2 * Math.PI }); // E4 faint warmth
  loopEvent(s, 5.0, 3.2, (tmp) => {
    strike(tmp, { freq: N.C5, dur: 3.0, vol: 0.05, partials: HANDBELL, attack: 0.006, decayShape: 3.0, unison: 2, detune: 0.003, rand });
  });
  loopEvent(s, 13.0, 3.2, (tmp) => {
    strike(tmp, { freq: N.G4, dur: 3.0, vol: 0.042, partials: HANDBELL, attack: 0.006, decayShape: 3.0, unison: 2, detune: 0.003, rand });
  });
}, { reverb: { wet: 0.42, decay: 0.86, damp: 0.42 }, peak: 0.48 });

// music_pit_dusk (20s): the drone cools and lowers — a lowered 7th, duller bell.
renderLoop('music_pit_dusk', 20, (s, { rand, q }) => {
  loopPad(s, { freq: q(N.C4 / 4), vol: 0.17, lfoCycles: 1, lfoDepth: 0.5, phase: rand() * 2 * Math.PI }); // C2 sub
  loopPad(s, { freq: q(N.C4 / 2), vol: 0.1, lfoCycles: 2, lfoDepth: 0.45, lfoPhase: 1.2, phase: rand() * 2 * Math.PI }); // C3
  loopPad(s, { freq: q(N.G4 / 2), vol: 0.06, lfoCycles: 2, lfoDepth: 0.55, lfoPhase: 2.5, phase: rand() * 2 * Math.PI }); // G3
  loopPad(s, { freq: q(D.Bb3), vol: 0.045, lfoCycles: 1, lfoDepth: 0.85, lfoPhase: 4.2, phase: rand() * 2 * Math.PI }); // Bb3 lowered 7th
  loopEvent(s, 6.5, 3.4, (tmp) => {
    strike(tmp, { freq: N.C5, dur: 3.1, vol: 0.045, partials: HANDBELL, attack: 0.008, decayShape: 2.8, unison: 2, detune: 0.004, rand });
  });
  loopEvent(s, 15.0, 3.4, (tmp) => {
    strike(tmp, { freq: D.Eb4, dur: 3.1, vol: 0.04, partials: DARK_BELL, attack: 0.01, decayShape: 3.0, unison: 2, detune: 0.004, rand });
  });
}, { reverb: { wet: 0.44, decay: 0.87, damp: 0.52 }, peak: 0.47 });

// music_pit_dark (24s): the bottom — cavernous ritual dread. A deep pulsing
// sub, sour root pair, minor third + tritone, dark-bell tolls, and a long
// breath of wind. The most reverberant bed of all (the deepest place).
renderLoop('music_pit_dark', 24, (s, { rand, q }) => {
  loopPad(s, { freq: q(D.C2), vol: 0.22, lfoCycles: 6, lfoDepth: 0.85, phase: rand() * 2 * Math.PI }); // sub pulse
  loopPad(s, { freq: q(D.C3), vol: 0.12, lfoCycles: 2, lfoDepth: 0.4, phase: rand() * 2 * Math.PI });
  loopPad(s, { freq: q(D.C3 * 1.006), vol: 0.1, lfoCycles: 2, lfoDepth: 0.4, lfoPhase: 0.9, phase: rand() * 2 * Math.PI }); // sour pair
  loopPad(s, { freq: q(D.Eb3), vol: 0.075, lfoCycles: 2, lfoDepth: 0.6, lfoPhase: 2.2, phase: rand() * 2 * Math.PI }); // minor third
  loopPad(s, { freq: q(D.Gb3), vol: 0.05, lfoCycles: 3, lfoDepth: 0.8, lfoPhase: 4.1, phase: rand() * 2 * Math.PI }); // tritone
  loopEvent(s, 5.5, 3.6, (tmp) => {
    strike(tmp, { freq: D.C4, dur: 3.4, vol: 0.085, partials: DARK_BELL, attack: 0.015, decayShape: 3.0, unison: 2, detune: 0.004, rand });
  });
  loopEvent(s, 16.0, 3.6, (tmp) => {
    strike(tmp, { freq: D.G3, dur: 3.4, vol: 0.075, partials: DARK_BELL, attack: 0.015, decayShape: 3.0, unison: 2, detune: 0.004, rand });
  });
  loopEvent(s, 11.0, 6.0, (tmp) => {
    noiseBurst(tmp, { start: 0, dur: 5.5, vol: 0.06, lp: 0.02, attack: 1.8, decayShape: 3, rand });
  });
}, { reverb: { wet: 0.46, decay: 0.88, damp: 0.6 }, peak: 0.5 });

// ===========================================================================
// TERRIBLE PEACE MUSIC BEDS (Phase 5): the dark DNA resolved low and slow —
// the C-add9 restored (no minor third, no tritone, no sour beating pair, no
// dissonant shimmer), the sub settled from a pulse into a breath, and the
// dark-bell tolls softened into distant handbells. The serene register after
// the arrival. Selected by musicBandForPhase at MUSIC_PEACE_PHASE (5).
// ===========================================================================

// music_peace (24s): the home world settled — a low whole C-add9 breathing
// slowly, two far-off soft handbell hours.
renderLoop('music_peace', 24, (s, { rand, q }) => {
  const padVoice = (f, vol, lfoCycles, lfoDepth, lfoPhase) => {
    loopPad(s, { freq: q(f), vol, lfoCycles, lfoDepth, lfoPhase, phase: rand() * 2 * Math.PI });
    // Gentle consonant twin (the dark beds' sour ~1.006 pair, resolved).
    loopPad(s, { freq: q(f * 1.0035), vol: vol * 0.55, lfoCycles, lfoDepth, lfoPhase: lfoPhase + 1.3, phase: rand() * 2 * Math.PI });
  };
  padVoice(D.C2, 0.18, 2, 0.5, 0);      // sub settled into a slow breath
  padVoice(D.C3, 0.11, 2, 0.45, 1.2);   // root, single and true
  padVoice(D.G3, 0.11, 3, 0.5, 2.4);    // fifth restored
  padVoice(N.E4, 0.055, 2, 0.6, 0.8);   // major third returns
  padVoice(N.D4, 0.032, 1, 0.75, 3.9);  // the ninth, one slow breath per loop
  loopEvent(s, 8.6, 3.4, (tmp) => {
    strike(tmp, { freq: N.C5, dur: 3.2, vol: 0.045, partials: HANDBELL, attack: 0.012, decayShape: 2.8, unison: 2, detune: 0.003, rand });
  });
  loopEvent(s, 18.4, 3.4, (tmp) => {
    strike(tmp, { freq: N.G4, dur: 3.2, vol: 0.04, partials: HANDBELL, attack: 0.012, decayShape: 2.8, unison: 2, detune: 0.003, rand });
  });
}, { reverb: { wet: 0.36, decay: 0.84, damp: 0.55 }, peak: 0.48 });

// music_puzzle_peace (20s): the focused chord sunk an octave and stilled —
// C3-centered, the third faint and warm, one distant soft note.
renderLoop('music_puzzle_peace', 20, (s, { rand, q }) => {
  const padVoice = (f, vol, lfoCycles, lfoDepth, lfoPhase) => {
    loopPad(s, { freq: q(f), vol, lfoCycles, lfoDepth, lfoPhase, phase: rand() * 2 * Math.PI });
    loopPad(s, { freq: q(f * 1.003), vol: vol * 0.5, lfoCycles, lfoDepth, lfoPhase: lfoPhase + 1.2, phase: rand() * 2 * Math.PI });
  };
  padVoice(D.C3, 0.13, 2, 0.4, 0);      // root center
  padVoice(D.G3, 0.075, 2, 0.5, 1.4);   // fifth
  padVoice(N.E4, 0.045, 1, 0.6, 2.6);   // third, faint and warm
  loopPad(s, { freq: q(D.C2), vol: 0.08, lfoCycles: 2, lfoDepth: 0.55, phase: rand() * 2 * Math.PI }); // sub breath
  loopEvent(s, 11.0, 2.6, (tmp) => {
    strike(tmp, { freq: N.G5, dur: 2.4, vol: 0.026, partials: CELESTA, attack: 0.01, decayShape: 3.6, unison: 2, detune: 0.003, rand });
  });
}, { reverb: { wet: 0.3, decay: 0.8, damp: 0.55 }, peak: 0.46 });

// music_pit_peace (24s): the deepest place at rest — the cavern keeps its
// gravity and width but the pulse becomes a breath, the tolls turn to soft
// handbells, and the wind exhales once, unhurried.
renderLoop('music_pit_peace', 24, (s, { rand, q }) => {
  loopPad(s, { freq: q(D.C2), vol: 0.2, lfoCycles: 2, lfoDepth: 0.55, phase: rand() * 2 * Math.PI }); // sub breath, no pulse
  loopPad(s, { freq: q(D.C3), vol: 0.11, lfoCycles: 2, lfoDepth: 0.4, phase: rand() * 2 * Math.PI });
  loopPad(s, { freq: q(D.C3 * 1.0035), vol: 0.06, lfoCycles: 2, lfoDepth: 0.4, lfoPhase: 0.9, phase: rand() * 2 * Math.PI }); // consonant twin
  loopPad(s, { freq: q(D.G3), vol: 0.11, lfoCycles: 3, lfoDepth: 0.5, lfoPhase: 2.2, phase: rand() * 2 * Math.PI }); // fifth restored
  loopPad(s, { freq: q(N.E4), vol: 0.05, lfoCycles: 2, lfoDepth: 0.65, lfoPhase: 4.0, phase: rand() * 2 * Math.PI }); // faint warmth returns
  loopEvent(s, 6.0, 3.6, (tmp) => {
    strike(tmp, { freq: N.C4, dur: 3.4, vol: 0.055, partials: HANDBELL, attack: 0.014, decayShape: 2.8, unison: 2, detune: 0.003, rand });
  });
  loopEvent(s, 15.5, 3.6, (tmp) => {
    strike(tmp, { freq: N.C5, dur: 3.4, vol: 0.04, partials: HANDBELL, attack: 0.014, decayShape: 2.8, unison: 2, detune: 0.003, rand });
  });
  loopEvent(s, 11.0, 6.0, (tmp) => {
    noiseBurst(tmp, { start: 0, dur: 5.5, vol: 0.04, lp: 0.02, attack: 2.2, decayShape: 2.6, rand });
  });
}, { reverb: { wet: 0.46, decay: 0.88, damp: 0.55 }, peak: 0.48 });

console.log('done.');
