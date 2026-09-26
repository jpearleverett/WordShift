// Render the trailer's soundtrack from the cue sheet in ../src/cues.js.
//
//   node scripts/store/cinematic/audio/score.mjs
//
// Writes $CINEMATIC_WORK/score.wav (48 kHz, 24-bit, -14 LUFS integrated, true peak
// <= -1 dBTP, exactly SCORE.duration long), out/score.m4a for the preview page, and
// the beat-sync report ($CINEMATIC_SYNC, default /tmp/wordshift-cinematic-score/sync.txt):
// every cue's placed transient against its event, every bed anchor measured in the
// final mix, the harmony check of the tuned voices, and the loudness gates.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from './synth.mjs';
import { decode, place, writeWav, loudnorm, measure, limit, peak } from './mix.mjs';
import { SCORE } from '../src/cues.js';
import { FPS } from '../src/timeline/events.js';
import { GRID } from '../src/grid.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOBILE = path.resolve(HERE, '../../../..');
const WORK = process.env.CINEMATIC_WORK || '/tmp/wordshift-cinematic';
const SYNC = process.env.CINEMATIC_SYNC || '/tmp/wordshift-cinematic-score/sync.txt';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const SR = S.SR;
const TAU = Math.PI * 2;
const TARGET = { I: -14, TP: -1.0, LRA: 11 };
const ALLOWED_FILES = new Set(['letter_select', 'valid_move', 'valid_move_2', 'valid_move_3', 'valid_move_4', 'star_pop_1', 'star_pop_2', 'star_pop_3', 'amber_earn', 'unlock', 'dialogue', 'ui_tick', 'ui_tap', 'perfect']);

const db = (x) => (x <= -90 ? 0 : Math.pow(10, x / 20));
const todb = (x) => 20 * Math.log10(Math.max(1e-12, x));

/** Piecewise-linear automation from [[t, v], ...] (optionally interpolating log(v)). */
function curve(points, { log = false } = {}) {
  const P = log ? points.map(([t, v]) => [t, Math.log(v)]) : points;
  const f = (t) => {
    if (t <= P[0][0]) return P[0][1];
    for (let i = 1; i < P.length; i++) {
      if (t <= P[i][0]) { const [t0, v0] = P[i - 1], [t1, v1] = P[i]; return t1 === t0 ? v1 : v0 + (v1 - v0) * (t - t0) / (t1 - t0); }
    }
    return P[P.length - 1][1];
  };
  return log ? (t) => Math.exp(f(t)) : f;
}

// ----------------------------------------------------------------------------- the bed
/** Time-varying low-pass (cascaded 2-pole sections, Butterworth Qs), in place. t0 = absolute time of sample 0. */
function lowpassInPlace(buf, fc, t0, order = 4) {
  const qs = order >= 4 ? [0.5412, 1.3066] : [0.7071];
  for (const ch of [buf.L, buf.R]) {
    const st = qs.map(() => ({ x1: 0, x2: 0, y1: 0, y2: 0 }));
    let b0, b1, b2, a1s = [], a2s = [], b0s = [], b1s = [], b2s = [], lastF = -1;
    for (let i = 0; i < ch.length; i++) {
      const f = Math.min(20000, Math.max(40, fc(t0 + i / SR)));
      if (f !== lastF) {
        lastF = f; a1s = []; a2s = []; b0s = []; b1s = []; b2s = [];
        const w0 = TAU * Math.min(f, SR * 0.45) / SR, c = Math.cos(w0);
        for (const q of qs) {
          const a = Math.sin(w0) / (2 * q), a0 = 1 + a;
          b0 = (1 - c) / 2 / a0; b1 = (1 - c) / a0; b2 = b0;
          b0s.push(b0); b1s.push(b1); b2s.push(b2); a1s.push(-2 * c / a0); a2s.push((1 - a) / a0);
        }
      }
      let x = ch[i];
      for (let s = 0; s < qs.length; s++) {
        const z = st[s];
        const y = b0s[s] * x + b1s[s] * z.x1 + b2s[s] * z.x2 - a1s[s] * z.y1 - a2s[s] * z.y2;
        z.x2 = z.x1; z.x1 = x; z.y2 = z.y1; z.y1 = y; x = y;
      }
      ch[i] = x;
    }
  }
}

/** Vibrato by a modulated fractional delay whose depth follows `amount(t)` (0..1), in place. */
function vibratoInPlace(buf, { rate = 0.5, depthMs = 3, amount }, t0) {
  const n = buf.L.length; const depth = depthMs * SR / 1000;
  for (const ch of [buf.L, buf.R]) {
    const src = ch.slice();
    for (let i = 0; i < n; i++) {
      const t = t0 + i / SR;
      const a = amount(t);
      if (a <= 0) continue;
      const d = a * depth * (1 - Math.cos(TAU * rate * t)) * 0.5; // 0 at the ends of the ramp, no jump
      const j = i - d; const k = Math.floor(j); const f = j - k;
      ch[i] = k < 0 ? src[0] : src[k] * (1 - f) + src[Math.min(n - 1, k + 1)] * f;
    }
  }
}

// ----------------------------------------------------------------------------- harmony
// A beat-rate chroma of the bed (150 Hz-2.5 kHz, sqrt magnitudes, tuned to the bed),
// used to keep the synthesized tonal voices from rubbing against the song.
function fftInPlace(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { let x = re[i]; re[i] = re[j]; re[j] = x; x = im[i]; im[i] = im[j]; im[j] = x; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -TAU / len, wr0 = Math.cos(ang), wi0 = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wr = 1, wi = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const vr = re[b] * wr - im[b] * wi, vi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
        const nwr = wr * wr0 - wi * wi0; wi = wr * wi0 + wi * wr0; wr = nwr;
      }
    }
  }
}
function bedPitches(bedBuf, bedAt, tuneCents, hop = 0.05) {
  // per frame: strength of every semitone from C3 (48) to C8 (108), sqrt magnitudes,
  // mean-subtracted and scaled to the frame's strongest note
  const N = 8192, frames = [], LO = 48, HI = 108;
  const win = new Float64Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(TAU * i / N);
  const bins = [];
  for (let k = 1; k < N / 2; k++) {
    const f = k * SR / N;
    const midi = 69 + 12 * Math.log2(f / 440) - tuneCents / 100; const r = Math.round(midi);
    if (r >= LO && r <= HI && Math.abs(midi - r) <= 0.35) bins.push([k, r - LO]);
  }
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let s = 0; s + N < bedBuf.L.length; s += Math.round(hop * SR)) {
    for (let i = 0; i < N; i++) { re[i] = (bedBuf.L[s + i] + bedBuf.R[s + i]) * win[i]; im[i] = 0; }
    fftInPlace(re, im);
    const c = new Float64Array(HI - LO + 1);
    for (const [k, m] of bins) c[m] += Math.sqrt(Math.hypot(re[k], im[k]));
    const mean = c.reduce((a, v) => a + v, 0) / c.length, mx = Math.max(...c);
    frames.push({ t: bedAt + (s + N / 2) / SR, lo: LO, s: [...c].map((v) => (mx > mean ? Math.max(0, (v - mean) / (mx - mean)) : 0)) });
  }
  return frames;
}
const midiOf = (f, tune) => Math.round(69 + 12 * Math.log2(f / 440) - tune / 100);
const pcOf = (f, tune) => ((midiOf(f, tune) % 12) + 12) % 12;
const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
/**
 * How hard the bed rubs against a note around [t0, t1]: the strongest bed pitch a
 * minor second or a minor ninth away, less the bed's own support for the note (its
 * octaves). Major sevenths and ninths count as colour, not as rubs. 0 = none.
 */
function clashAt(frames, midi, t0, t1) {
  let worst = 0, n = 0, sum = 0;
  for (const fr of frames) {
    if (fr.t < t0 || fr.t > t1) continue;
    const at = (m) => { const i = m - fr.lo; return i >= 0 && i < fr.s.length ? fr.s[i] : 0; };
    const rub = Math.max(at(midi - 1), at(midi + 1), at(midi - 13), at(midi + 13));
    const own = Math.max(at(midi), at(midi - 12), at(midi + 12), at(midi - 24), at(midi + 24));
    const v = Math.max(0, rub - 0.8 * own);
    worst = Math.max(worst, v); sum += v; n++;
  }
  return { worst, mean: n ? sum / n : 0 };
}

/**
 * The bed's own partial near `freq` (within +-cents) over [t0, t1], by a windowed DFT
 * scan at 0.25 Hz. Returns { freq, prominence (dB over the scan's median) } or null.
 */
function bedPartial(bedRaw, bedAt, freq, t0, t1, cents = 30) {
  const i0 = Math.max(0, Math.round((t0 - bedAt) * SR)), i1 = Math.min(bedRaw.L.length, Math.round((t1 - bedAt) * SR));
  const n = i1 - i0; if (n < SR * 0.2) return null;
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = (bedRaw.L[i0 + i] + bedRaw.R[i0 + i]) * (0.5 - 0.5 * Math.cos(TAU * i / n));
  const lo = freq * Math.pow(2, -cents / 1200), hi = freq * Math.pow(2, cents / 1200);
  const mags = [];
  for (let f = lo; f <= hi; f += 0.25) {
    let r = 0, q = 0; const w = TAU * f / SR, cw = Math.cos(w), sw = Math.sin(w); let c = 1, sn = 0;
    for (let i = 0; i < n; i++) { r += x[i] * c; q -= x[i] * sn; const nc = c * cw - sn * sw; sn = sn * cw + c * sw; c = nc; }
    mags.push([f, Math.hypot(r, q)]);
  }
  const best = mags.reduce((a, m) => (m[1] > a[1] ? m : a), [0, 0]);
  const med = mags.map((m) => m[1]).sort((a, c) => a - c)[mags.length >> 1];
  return { freq: best[0], prominence: todb(best[1] / Math.max(1e-12, med)) };
}

// ----------------------------------------------------------------------------- cues
const cache = new Map();
function sfxFile(name) {
  if (!ALLOWED_FILES.has(name)) throw new Error(`${name}.wav is not on the spec 5.3 allowlist`);
  if (!cache.has(name)) cache.set(name, decode(path.join(MOBILE, 'assets/sounds', name + '.wav')));
  return cache.get(name);
}
/** Resample a buffer by `rate` (> 1 = higher and shorter), linear interpolation. */
function resample(b, rate) {
  if (!rate || rate === 1) return b;
  const n = Math.floor(b.L.length / rate); const out = S.buffer(n / SR);
  for (let i = 0; i < out.L.length; i++) { const j = i * rate; const k = Math.floor(j); const f = j - k; const k1 = Math.min(b.L.length - 1, k + 1); out.L[i] = b.L[k] * (1 - f) + b.L[k1] * f; out.R[i] = b.R[k] * (1 - f) + b.R[k1] * f; }
  return out;
}
/** Pan a (stereo) file: fold to mono and place it with equal power. */
function panned(b, p) {
  if (p === undefined) return b;
  const [gl, gr] = S.panGains(p); const out = { L: new Float32Array(b.L.length), R: new Float32Array(b.L.length) };
  for (let i = 0; i < b.L.length; i++) { const m = (b.L[i] + b.R[i]) * 0.5; out.L[i] = m * gl; out.R[i] = m * gr; }
  return out;
}
const VOICES = {
  boom: S.boom, whoosh: S.whoosh, riser: S.riser, bell: S.bell, clack: S.clack, sparkle: S.sparkle, pad: S.pad, reverseSwell: S.reverseSwell,
  meadowAir: S.meadowAir, brook: S.brook, crickets: S.crickets, birdsong: S.birdsong, fireCrackle: S.fireCrackle, potBubble: S.potBubble,
  musicBox: S.musicBox, windChime: S.windChime, riserShimmer: S.riserShimmer,
  resinClick: S.resinClick, ceramicTock: S.ceramicTock, lockTink: S.lockTink, slotZip: S.slotZip, sproutPluck: S.sproutPluck,
  gemShower: S.gemShower, paperUnfurl: S.paperUnfurl, chalkScribble: S.chalkScribble, woodKnock: S.woodKnock, mothFlutter: S.mothFlutter,
  glassTick: S.glassTick, sparklerFizz: S.sparklerFizz, signThunk: S.signThunk, woodTap: S.woodTap, rockTick: S.rockTick, flipTock: S.flipTock,
  hopSwish: S.hopSwish, leafRustle: S.leafRustle, puff: S.puff, unrollSwish: S.unrollSwish, waterBubbles: S.waterBubbles,
};
function synthHit(h) {
  const fn = VOICES[h.synth];
  if (!fn) throw new Error('unknown synth ' + h.synth);
  return fn(h.params || {});
}

/**
 * Where a cue's sync point is: 'onset' first crossing of 30% of its peak; 'start' its
 * first sample (soft-attack sounds that begin on the event: zips, swishes, clouds);
 * 'peak' the centre of its loudest 60 ms (whooshes, swells, the riser's crest); 'end'.
 */
function markOf(b, mark) {
  const n = b.L.length; let pk = 0;
  for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(b.L[i]), Math.abs(b.R[i]));
  if (mark === 'end') return n / SR;
  if (mark === 'start') return 0;
  if (mark === 'peak') {
    const w = Math.round(0.06 * SR); let best = 0, bi = 0, e = 0;
    for (let i = 0; i < n; i++) { e += b.L[i] ** 2 + b.R[i] ** 2; if (i >= w) e -= b.L[i - w] ** 2 + b.R[i - w] ** 2; if (e > best) { best = e; bi = i - w / 2; } }
    return Math.max(0, bi) / SR;
  }
  for (let i = 0; i < n; i++) if (Math.max(Math.abs(b.L[i]), Math.abs(b.R[i])) >= 0.3 * pk) return i / SR;
  return 0;
}

// ----------------------------------------------------------------------------- render
function main() {
  const t0 = process.hrtime.bigint();
  const lines = [];
  const out = S.buffer(SCORE.duration + 0.5);
  const tune = SCORE.tune || 0;

  // 1) the bed: one continuous excerpt, T = file - GRID.offset
  let chroma = null, bedRaw = null, bedRawAt = 0;
  const bedReport = [];
  for (const bed of SCORE.beds) {
    const src = decode(path.join(MOBILE, 'assets/music', bed.file), { start: bed.from, dur: bed.dur + 0.2 });
    chroma = bedPitches(src, bed.at, tune);
    bedRaw = { L: src.L.slice(), R: src.R.slice() }; bedRawAt = bed.at;
    if (bed.vibrato) vibratoInPlace(src, { ...bed.vibrato, amount: curve(bed.vibrato.amount) }, bed.at);
    if (bed.lowpass) lowpassInPlace(src, curve(bed.lowpass.points, { log: true }), bed.at, bed.lowpass.order || 2);
    const g = curve(bed.gain);
    place(out, src, bed.at, (tl) => (tl > bed.dur ? 0 : db(g(bed.at + tl))));
    bedReport.push(`bed ${bed.file}: trailer T plays file T + ${(bed.from - bed.at).toFixed(4)} s (sample-exact), from T ${bed.at.toFixed(3)}`);
    for (const s of bed.sync || []) bedReport.push(s);
  }

  // optional review stems (CINEMATIC_STEMS=1): the same mix split by layer
  const STEMS = process.env.CINEMATIC_STEMS ? {} : null;
  const AMB = new Set(['meadowAir', 'brook', 'crickets', 'birdsong', 'fireCrackle', 'potBubble', 'mothFlutter', 'waterBubbles']);
  const TONAL = new Set(['musicBox', 'pad', 'windChime', 'riserShimmer', 'reverseSwell', 'sproutPluck']);
  const groupOf = (h) => (h.file ? 'game' : AMB.has(h.synth) ? 'ambience' : TONAL.has(h.synth) ? 'music' : h.synth === 'whoosh' ? 'motion' : 'foley');
  const stem = (name) => { if (!STEMS[name]) STEMS[name] = S.buffer(SCORE.duration + 0.5); return STEMS[name]; };
  if (STEMS) place(stem('bed'), out, 0, () => 1);

  // 2) cues
  const verbBus = S.buffer(SCORE.duration + 0.5);
  const syncRows = [];
  const harmony = [];
  for (const h0 of SCORE.hits) {
    const h = { ...h0, params: h0.params ? { ...h0.params } : undefined };
    // keep only the notes that sit consonantly in the bed at that moment
    if (h.pick && chroma) {
      const list = h.params[h.pick.param];
      const scored = list.map((f) => ({ f, c: clashAt(chroma, midiOf(f, tune), h.pick.from, h.pick.to).worst }));
      let keep = scored.filter((x) => x.c < 0.45).map((x) => x.f);
      if (keep.length < 2) keep = scored.slice().sort((a, b) => a.c - b.c).slice(0, 2).map((x) => x.f);
      h.params[h.pick.param] = list.filter((f) => keep.includes(f));
      harmony.push(`${(h.label || h.sync?.event || h.synth).padEnd(34)} ${scored.map((x) => `${NAMES[pcOf(x.f, tune)]}:${x.c.toFixed(2)}${keep.includes(x.f) ? '' : ' (dropped)'}`).join('  ')}`);
    }
    if (h.pickEach && chroma) {
      const sch = h.params[h.pickEach.param].map((it) => {
        const cands = [it.freq, ...(it.alts || [])];
        const at = h.at + it.at;
        const best = cands.map((f) => ({ f, c: clashAt(chroma, midiOf(f, tune), at - 0.1, at + 0.2).worst })).find((x) => x.c < 0.45);
        return best ? { ...it, freq: best.f } : null;
      });
      const kept = sch.filter(Boolean);
      harmony.push(`${(h.label || h.sync?.event || h.synth).padEnd(34)} ${kept.length}/${sch.length} shimmer notes kept (${kept.map((x) => NAMES[pcOf(x.freq, tune)]).join(' ')})`);
      h.params[h.pickEach.param] = kept;
    }
    // a note the bed itself is holding is tuned onto the bed's own partial (no beating)
    if (h.tuneToBed && bedRaw) {
      const [w0, w1] = h.tuneToBed.window;
      const found = bedPartial(bedRaw, bedRawAt, h.params.freq, w0, w1, h.tuneToBed.cents || 30);
      if (found && found.prominence >= 12) {
        harmony.push(`${(h.sync?.event || h.synth).padEnd(34)} tuned onto the bed's own partial: ${h.params.freq.toFixed(2)} -> ${found.freq.toFixed(2)} Hz (${(1200 * Math.log2(found.freq / h.params.freq)).toFixed(1)} cents, partial ${found.prominence.toFixed(0)} dB over the band)`);
        h.params.freq = found.freq;
      } else harmony.push(`${(h.sync?.event || h.synth).padEnd(34)} the bed holds no partial within ${h.tuneToBed.cents || 30} cents: stays at ${h.params.freq.toFixed(2)} Hz`);
    }
    let b = h.file ? resample(sfxFile(h.file), h.rate) : synthHit(h);
    if (h.file && h.pan !== undefined) b = panned(b, h.pan);
    // peak-marked cues (whooshes, swells, the riser) are slid so their measured crest
    // lands exactly on the event, whatever the noise did to the designed envelope
    if (h.sync && h.sync.mark === 'peak') h.at = h.sync.target - markOf(b, 'peak');
    const base = db(h.db ?? 0);
    const env = h.env ? curve(h.env) : null;
    let gate = null;
    if (h.gate && chroma) {
      // a sustained note steps back (up to maxCut dB) while the bed rubs against it
      const pc = pcOf(h.gate.freq, tune), mi = midiOf(h.gate.freq, tune);
      const pts = chroma.filter((fr) => fr.t >= h.at - 0.3 && fr.t <= h.at + b.L.length / SR + 0.3).map((fr) => {
        const c = clashAt(chroma, mi, fr.t - 0.12, fr.t + 0.12).mean;
        const k = Math.min(1, Math.max(0, (c - 0.25) / 0.35));
        return [fr.t, -h.gate.maxCut * k * k * (3 - 2 * k)];
      });
      // smooth: 150 ms attack/release
      const sm = []; let v = 0;
      for (const [t, d] of pts) { v += (d - v) * 0.3; sm.push([t, v]); }
      gate = sm.length ? curve(sm) : null;
      const cut = sm.reduce((m, [, d]) => Math.min(m, d), 0);
      // spans where the voice is down by more than 6 dB
      const spans = []; let sp = null;
      for (const [t, d] of sm) { if (t < h.at || t > h.at + b.L.length / SR) continue; if (d < -6) { if (!sp) { sp = [t, t]; spans.push(sp); } sp[1] = t; } else sp = null; }
      harmony.push(`${(h.label || h.synth).padEnd(34)} ${NAMES[pc]} sustained, steps back up to ${cut.toFixed(1)} dB where the bed rubs${spans.length ? ` (down > 6 dB ${spans.map(([x, y]) => `${x.toFixed(2)}-${y.toFixed(2)}`).join(', ')})` : ''}`);
    }
    const envAt = (tl) => base * (env ? db(env(h.at + tl)) : 1) * (gate ? db(gate(h.at + tl)) : 1);
    place(out, b, h.at, (tl) => envAt(tl) * (h.dry ?? 1));
    if (h.verb) place(verbBus, b, h.at, (tl) => envAt(tl) * h.verb);
    if (STEMS) place(stem(groupOf(h)), b, h.at, (tl) => envAt(tl) * ((h.dry ?? 1) + (h.verb || 0) * 0.5));
    if (h.sync) {
      const m = markOf(b, h.sync.mark || 'onset');
      syncRows.push({ event: h.sync.event, target: h.sync.target, placed: h.at + m, what: h.file ? `${h.file}.wav` : h.synth, mark: h.sync.mark || 'onset' });
    }
    if (h.consonance && chroma) {
      const f = h.params.freq; const pc = pcOf(f, tune);
      const c = clashAt(chroma, midiOf(f, tune), h.at - 0.05, h.at + 0.35).worst;
      harmony.push(`${(h.sync?.event || 'music box').padEnd(34)} ${NAMES[pc]} over the bed: rub ${c.toFixed(2)}${c >= 0.45 ? '  <-- rubs' : ''}`);
    }
  }
  const wet = S.reverb(verbBus, { size: 0.86, damp: 0.4, wet: 1, dry: 0, tail: 0.1 });
  place(out, wet, 0, () => 1);

  // 3) master automation (amplitude)
  if (SCORE.master) { const g = curve(SCORE.master); for (let i = 0; i < out.L.length; i++) { const k = g(i / SR); out.L[i] *= k; out.R[i] *= k; } }

  // trim to the timeline
  const n = Math.round(SCORE.duration * SR);
  out.L = out.L.slice(0, n); out.R = out.R.slice(0, n);

  // 4) master: limit the few transients that would stop a linear pass, then a two-pass
  //    linear loudnorm. The ceiling is set from the mix's own loudness so the gain to
  //    -14 LUFS leaves the true peak under -1 dBTP with about 0.5 dB to spare.
  fs.mkdirSync(WORK, { recursive: true });
  const raw = path.join(WORK, 'score_raw.wav');
  const unlimited = { L: out.L.slice(), R: out.R.slice() };
  let lim = { maxReductionDb: 0, samples: 0 }, m0;
  let ceilingDb = null;
  for (let pass = 0; pass < 4; pass++) {
    writeWav(raw, out);
    m0 = measure(raw);
    const gain = TARGET.I - m0.I;
    if (m0.TP + gain <= TARGET.TP - 0.5) break;
    ceilingDb = (ceilingDb ?? todb(peak(out))) - (m0.TP + gain - (TARGET.TP - 0.6));
    out.L = unlimited.L.slice(); out.R = unlimited.R.slice();
    lim = limit(out, db(ceilingDb), { lookaheadMs: 5, releaseMs: 90 });
  }
  const final = path.join(WORK, 'score.wav');
  const stats = loudnorm(raw, final, TARGET);
  const m1 = measure(final);
  const check = decode(final);
  const len = check.L.length;

  // 5) gates: loudness, true peak, duration, room tone (RMS in every 0.3 s window)
  const quiet = [];
  const win = Math.round(0.3 * SR), hopN = Math.round(0.01 * SR);
  for (let s = 0; s + win <= Math.min(len, Math.round((SCORE.duration - 0.75) * SR)); s += hopN) {
    let e = 0; for (let i = s; i < s + win; i++) e += check.L[i] ** 2 + check.R[i] ** 2;
    const r = todb(Math.sqrt(e / (2 * win)));
    if (r < -50) quiet.push(`${(s / SR).toFixed(2)} (${r.toFixed(1)} dBFS RMS)`);
  }
  let minRms = 0, minAt = 0;
  for (let s = 0; s + win <= Math.round((SCORE.duration - 0.75) * SR); s += hopN) {
    let e = 0; for (let i = s; i < s + win; i++) e += check.L[i] ** 2 + check.R[i] ** 2;
    const r = todb(Math.sqrt(e / (2 * win))); if (r < minRms || s === 0) { minRms = r; minAt = s / SR; }
  }

  // 6) the bed's anchors, measured in the final mix (low-band rise/fall within +-60 ms)
  const lowBand = (() => {
    const lp1 = S.fixedBiquad('lp', 130, 0.707), lp2 = S.fixedBiquad('lp', 130, 0.707);
    const y = new Float32Array(len); for (let i = 0; i < len; i++) y[i] = lp2(lp1((check.L[i] + check.R[i]) * 0.5)); return y;
  })();
  const rms = (sig, a, b2) => { let e = 0, c = 0; for (let i = Math.max(0, Math.floor(a * SR)); i < Math.min(sig.length, b2 * SR); i++) { e += sig[i] * sig[i]; c++; } return 10 * Math.log10(e / Math.max(1, c) + 1e-12); };
  const edge = (a, b2, dir) => { let best = -1e9, bt = a; for (let t = a; t < b2; t += 0.001) { const d = (rms(lowBand, t, t + 0.03) - rms(lowBand, t - 0.06, t - 0.03)) * dir; if (d > best) { best = d; bt = t; } } return bt; };

  // ---- the report
  const fr = (x) => (x * FPS).toFixed(2);
  lines.push(`WordShift cinematic trailer: beat-sync report (audio/score.mjs; every time is derived from src/timeline/events.js and src/grid.js)`);
  lines.push(`duration ${(len / SR).toFixed(6)} s (${len} samples at ${SR} Hz), target ${SCORE.duration.toFixed(3)} s`);
  lines.push(`loudness ${m1.I} LUFS integrated (target ${TARGET.I} +-0.5), LRA ${m1.LRA} LU (<= ${TARGET.LRA}), true peak ${m1.TP} dBTP (<= ${TARGET.TP}); loudnorm ${stats.normalized.normalization_type}`);
  lines.push(`pre-master: ${m0.I} LUFS, TP ${m0.TP} dBTP; limiter ${lim.samples ? `${lim.maxReductionDb.toFixed(2)} dB max on ${lim.samples} samples` : 'untouched'}${lim.regions?.length ? ` (over 1 dB at ${lim.regions.map((r) => `${r.from.toFixed(2)}-${r.to.toFixed(2)} ${r.db.toFixed(1)}`).join(', ')})` : ''}`);
  lines.push(`room tone: quietest 0.3 s window ${minRms.toFixed(1)} dBFS RMS at T ${minAt.toFixed(2)}; windows under -50 dBFS before the final fade: ${quiet.length ? quiet.slice(0, 6).join(', ') : 'none'}`);
  lines.push('');
  lines.push('== the bed');
  for (const r of bedReport) {
    if (typeof r === 'string') { lines.push(r); continue; }
    if (r.file === undefined) { lines.push(`${r.event.padEnd(36)} target ${r.target.toFixed(3)}`); continue; }
    const k = r.event.replace('anchor ', '');
    const dir = ['stopIn', 'breakIn', 'breath'].includes(k) ? -1 : 1;
    const got = edge(r.target - 0.06, r.target + 0.06, dir);
    const d = got - r.target;
    lines.push(`${r.event.padEnd(36)} file ${r.file.toFixed(3)} -> T ${r.target.toFixed(3)}; in the mix ${got.toFixed(3)} (${(d * 1000).toFixed(0)} ms, ${fr(d)} fr) ${Math.abs(d * FPS) <= 1 ? 'OK' : 'CHECK'}`);
  }
  lines.push('');
  lines.push('== cues (placed transient vs event target; +-1 frame = +-33 ms). grid: the target\'s bar.beat.sixteenth');
  lines.push('   on the measured grid (' + GRID.bpm + ' BPM, bar 1 at T ' + GRID.t0Bar1 + ') and its distance from that sixteenth; a = measured anchor');
  syncRows.sort((a, b) => a.target - b.target);
  let worst = 0;
  const sixteenth = GRID.beat / 4;
  const gridPos = (t) => {
    const near = Object.entries(GRID.anchors).find(([, v]) => Math.abs(v - t) < 0.002);
    if (near) return `a:${near[0]}`.padEnd(15);
    const k = Math.round((t - GRID.t0Bar1) / sixteenth); const off = t - (GRID.t0Bar1 + k * sixteenth);
    return `${Math.floor(k / 16) + 1}.${Math.floor((((k % 16) + 16) % 16) / 4) + 1}.${(((k % 4) + 4) % 4) + 1} ${off >= 0 ? '+' : ''}${(off * 1000).toFixed(0)}ms`.padEnd(15);
  };
  for (const r of syncRows) {
    const d = r.placed - r.target; worst = Math.max(worst, Math.abs(d));
    lines.push(`${r.target.toFixed(3).padStart(7)}  ${gridPos(r.target)} ${r.event.padEnd(44)} ${r.what.padEnd(17)} ${r.mark.padEnd(5)} at ${r.placed.toFixed(3)}  ${d >= 0 ? '+' : ''}${(d * 1000).toFixed(1).padStart(6)} ms  ${Math.abs(d * FPS) <= 1 ? 'OK' : 'OFF'}`);
  }
  lines.push(`worst cue offset ${(worst * 1000).toFixed(1)} ms (${fr(worst)} frames) over ${syncRows.length} cues`);
  lines.push('');
  lines.push('== harmony (the tuned voices against the bed\'s own chords, tuned +' + tune + ' cents)');
  for (const h of harmony) lines.push(h);
  fs.mkdirSync(path.dirname(SYNC), { recursive: true });
  fs.writeFileSync(SYNC, lines.join('\n') + '\n');

  if (STEMS) {
    const g = db(m1.I - m0.I); const mg = SCORE.master ? curve(SCORE.master) : () => 1;
    for (const [name, sb] of Object.entries(STEMS)) {
      const o = { L: sb.L.slice(0, n), R: sb.R.slice(0, n) };
      for (let i = 0; i < n; i++) { const k = g * mg(i / SR); o.L[i] *= k; o.R[i] *= k; }
      writeWav(path.join(WORK, `stem_${name}.wav`), o);
    }
    console.log('stems:', Object.keys(STEMS).map((k) => path.join(WORK, `stem_${k}.wav`)).join(' '));
  }

  const m4a = path.join(HERE, '..', 'out', 'score.m4a');
  fs.mkdirSync(path.dirname(m4a), { recursive: true });
  execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', final, '-c:a', 'aac', '-b:a', '256k', m4a]);
  console.log('score:', final, `(${(Number(process.hrtime.bigint() - t0) / 1e9).toFixed(1)} s)`);
  console.log(lines.slice(1, 6).join('\n'));
  console.log(`sync: ${SYNC} (worst cue ${(worst * 1000).toFixed(1)} ms)`);
  const ok = Math.abs(m1.I - TARGET.I) <= 0.5 && m1.TP <= TARGET.TP && !quiet.length && Math.abs(len / SR - SCORE.duration) <= 0.001 && stats.normalized.normalization_type === 'linear';
  if (!ok) { console.error('AUDIO GATES FAIL'); process.exitCode = 1; }
}

main();
