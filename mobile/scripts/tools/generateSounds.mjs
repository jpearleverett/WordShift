// Pure-Node WAV generator for WordShift's sound effects. Produces short,
// soft synth chimes (sine partials with exponential envelopes) so the game
// ships with a complete, lightweight SFX pack. No external dependencies.
// Run: node scripts/tools/generateSounds.mjs
import fs from 'fs';
import path from 'path';

const SAMPLE_RATE = 22050;
const OUT_DIR = path.resolve(import.meta.dirname, '../../assets/sounds');

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

// One soft chime: sine fundamental + quieter octave partial, exponential decay.
function tone(samples, freq, start, dur, vol, { attack = 0.004, partial = 0.3, bend = 0 } = {}) {
  const s0 = Math.floor(start * SAMPLE_RATE);
  const n = Math.floor(dur * SAMPLE_RATE);
  let phase = 0, phase2 = 0;
  for (let i = 0; i < n && s0 + i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    const f = freq * (1 + bend * (t / dur));
    phase += (2 * Math.PI * f) / SAMPLE_RATE;
    phase2 += (2 * Math.PI * f * 2) / SAMPLE_RATE;
    const env = Math.min(1, t / attack) * Math.exp(-4.5 * (t / dur));
    samples[s0 + i] += (Math.sin(phase) + partial * Math.sin(phase2)) * env * vol;
  }
}

// Soft filtered noise burst (for thuds / whooshes)
function noise(samples, start, dur, vol, lowpass = 0.15) {
  const s0 = Math.floor(start * SAMPLE_RATE);
  const n = Math.floor(dur * SAMPLE_RATE);
  let prev = 0;
  for (let i = 0; i < n && s0 + i < samples.length; i++) {
    const t = i / SAMPLE_RATE;
    prev = prev + lowpass * ((Math.random() * 2 - 1) - prev);
    const env = Math.min(1, t / 0.003) * Math.exp(-6 * (t / dur));
    samples[s0 + i] += prev * env * vol;
  }
}

function buf(seconds) {
  return new Float64Array(Math.ceil(seconds * SAMPLE_RATE));
}

fs.mkdirSync(OUT_DIR, { recursive: true });

// C major-ish pentatonic palette keeps everything consonant.
const N = { C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0, C6: 1046.5, E6: 1318.5, G6: 1568.0, C4: 261.63, G4: 392.0, A4: 440.0, E4: 329.63 };

// tap: tiny soft click-chime for generic UI taps
{
  const s = buf(0.12);
  tone(s, N.A5, 0, 0.1, 0.22, { partial: 0.15 });
  writeWav(path.join(OUT_DIR, 'tap.wav'), s);
}
// letter_select: bright pluck
{
  const s = buf(0.18);
  tone(s, N.E5, 0, 0.16, 0.3);
  tone(s, N.E6, 0, 0.08, 0.08);
  writeWav(path.join(OUT_DIR, 'letter_select.wav'), s);
}
// valid_move: pleasant two-note rise
{
  const s = buf(0.3);
  tone(s, N.C5, 0, 0.16, 0.26);
  tone(s, N.G5, 0.07, 0.2, 0.26);
  writeWav(path.join(OUT_DIR, 'valid_move.wav'), s);
}
// invalid_move: muted low double-thud (gentle, not punishing)
{
  const s = buf(0.32);
  tone(s, N.E4 * 0.5, 0, 0.12, 0.3, { partial: 0.1, bend: -0.15 });
  tone(s, N.E4 * 0.47, 0.12, 0.16, 0.26, { partial: 0.1, bend: -0.15 });
  noise(s, 0, 0.08, 0.1);
  writeWav(path.join(OUT_DIR, 'invalid_move.wav'), s);
}
// undo: quick descending slide
{
  const s = buf(0.22);
  tone(s, N.G5, 0, 0.18, 0.22, { bend: -0.35 });
  writeWav(path.join(OUT_DIR, 'undo.wav'), s);
}
// hint: curious sparkle (two quick high notes)
{
  const s = buf(0.3);
  tone(s, N.C6, 0, 0.12, 0.18);
  tone(s, N.E6, 0.08, 0.18, 0.18);
  writeWav(path.join(OUT_DIR, 'hint.wav'), s);
}
// victory: ascending pentatonic arpeggio
{
  const s = buf(0.85);
  tone(s, N.C5, 0, 0.3, 0.24);
  tone(s, N.E5, 0.1, 0.3, 0.24);
  tone(s, N.G5, 0.2, 0.35, 0.24);
  tone(s, N.C6, 0.3, 0.5, 0.26);
  writeWav(path.join(OUT_DIR, 'victory.wav'), s);
}
// perfect: longer arpeggio with a top sparkle (3-star wins)
{
  const s = buf(1.1);
  tone(s, N.C5, 0, 0.3, 0.22);
  tone(s, N.E5, 0.09, 0.3, 0.22);
  tone(s, N.G5, 0.18, 0.35, 0.22);
  tone(s, N.C6, 0.27, 0.45, 0.24);
  tone(s, N.E6, 0.4, 0.5, 0.2);
  tone(s, N.G6, 0.55, 0.5, 0.14);
  writeWav(path.join(OUT_DIR, 'perfect.wav'), s);
}
// amber_earn: warm coin shimmer
{
  const s = buf(0.4);
  tone(s, N.A5, 0, 0.18, 0.2);
  tone(s, N.C6, 0.06, 0.25, 0.2);
  tone(s, N.E6, 0.12, 0.25, 0.12);
  writeWav(path.join(OUT_DIR, 'amber_earn.wav'), s);
}
// achievement: proud fanfare-ette
{
  const s = buf(0.7);
  tone(s, N.G4, 0, 0.2, 0.22);
  tone(s, N.C5, 0.1, 0.25, 0.24);
  tone(s, N.E5, 0.2, 0.4, 0.26);
  tone(s, N.G5, 0.3, 0.4, 0.2);
  writeWav(path.join(OUT_DIR, 'achievement.wav'), s);
}
// unlock: door-opening rise + chime
{
  const s = buf(0.6);
  tone(s, N.C4, 0, 0.3, 0.2, { bend: 0.5 });
  tone(s, N.C6, 0.25, 0.35, 0.18);
  writeWav(path.join(OUT_DIR, 'unlock.wav'), s);
}
// dialogue: soft speech blip
{
  const s = buf(0.14);
  tone(s, N.D5, 0, 0.12, 0.16, { partial: 0.2 });
  writeWav(path.join(OUT_DIR, 'dialogue.wav'), s);
}
// phase_change: low ominous swell (used by the ritual ceremonies)
{
  const s = buf(1.4);
  tone(s, N.C4 * 0.5, 0, 1.3, 0.3, { attack: 0.25, partial: 0.4, bend: 0.04 });
  tone(s, N.C4 * 0.5 * 1.498, 0.15, 1.1, 0.18, { attack: 0.3, partial: 0.3 });
  noise(s, 0.1, 1.0, 0.06, 0.04);
  writeWav(path.join(OUT_DIR, 'phase_change.wav'), s);
}
// daily_ready: gentle bell pair
{
  const s = buf(0.6);
  tone(s, N.G5, 0, 0.3, 0.2);
  tone(s, N.C6, 0.18, 0.4, 0.2);
  writeWav(path.join(OUT_DIR, 'daily_ready.wav'), s);
}
