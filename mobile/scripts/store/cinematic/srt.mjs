// Writes the trailer's English captions as SRT from the same table the picture uses.
//
//   node scripts/store/cinematic/srt.mjs            -> out/wordshift-cinematic-captions-en.srt
//
// Lines that share the screen (a second caption line joining the first) become one
// cue with two lines, so players never stack two overlapping cues.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SRT_LINES, DURATION } from './src/timeline/events.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, 'out', 'wordshift-cinematic-captions-en.srt');

const stamp = (s) => {
  const ms = Math.round(Math.max(0, Math.min(DURATION, s)) * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

// every moment a line starts or ends is a cue boundary
const cuts = [...new Set(SRT_LINES.flatMap((l) => [l.in, l.out]))].sort((a, b) => a - b);
const cues = [];
for (let i = 0; i < cuts.length - 1; i++) {
  const a = cuts[i], b = cuts[i + 1];
  if (b - a < 0.05) continue;
  const lines = SRT_LINES.filter((l) => l.in <= a + 1e-6 && l.out >= b - 1e-6).map((l) => l.text);
  if (!lines.length) continue;
  const prev = cues[cues.length - 1];
  if (prev && prev.text === lines.join('\n') && Math.abs(prev.out - a) < 1e-6) prev.out = b;
  else cues.push({ in: a, out: b, text: lines.join('\n') });
}

for (const c of cues) {
  if (/[–—‘’“”]/.test(c.text)) throw new Error(`non-ASCII punctuation in caption: ${c.text}`);
}
const body = cues.map((c, i) => `${i + 1}\n${stamp(c.in)} --> ${stamp(c.out)}\n${c.text}\n`).join('\n');
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, body);
console.log(body);
console.log(OUT);
