// Caption engine. Captions are grouped into blocks (lines that stack, e.g.
// "Move one letter." / "Both words stay real."); every word is its own quad so
// it can rise in on its own beat. Legibility comes from a two-layer warm shadow
// and a soft local scrim, never a box. Layout follows the per-aspect rules:
//   16:9  claims left at x 128, teases centred; the block's last baseline at y 918, so
//         even the faint halo stays above y 972 (the QA gate on inked overlay pixels)
//   9:16  glyphs inset from the safe box x 96-918 by the halo's reach; first baseline y 330

import * as THREE from 'three';
import { clamp, ease } from './math.js';
import { canvasTexture } from './text.js';

const STYLE = {
  claim: { font: 'Figtree', weight: '700', style: 'normal', color: '#FFF3DC', size: { '16x9': 64, '9x16': 74 } },
  tease: { font: 'Epunda Slab', weight: '400', style: 'italic', color: '#FFE9C7', size: { '16x9': 68, '9x16': 76 } },
  big: { font: 'Epunda Slab', weight: '400', style: 'italic', color: '#FFE9C7', size: { '16x9': 76, '9x16': 84 } },
};

function wordCanvas(word, st, size) {
  const pad = Math.ceil(size * 0.75);
  const font = `${st.style} ${st.weight} ${size}px "${st.font}"`;
  const m = document.createElement('canvas').getContext('2d');
  m.font = font;
  const w = Math.ceil(m.measureText(word).width);
  const c = document.createElement('canvas');
  c.width = w + pad * 2; c.height = Math.ceil(size * 1.3) + pad * 2;
  const g = c.getContext('2d');
  g.font = font; g.textBaseline = 'alphabetic';
  const x = pad, y = pad + size * 0.98;
  const s = size / 64;
  // halo, then tight shadow, then the fill
  g.save(); g.shadowColor = 'rgba(40,20,10,0.30)'; g.shadowBlur = 24 * s; g.fillStyle = 'rgba(40,20,10,0.30)'; g.fillText(word, x, y); g.restore();
  g.save(); g.shadowColor = 'rgba(40,20,10,0.62)'; g.shadowBlur = 10 * s; g.shadowOffsetY = 3 * s; g.fillStyle = 'rgba(40,20,10,0.62)'; g.fillText(word, x, y); g.restore();
  g.fillStyle = st.color; g.fillText(word, x, y);
  return { canvas: c, w, h: c.height, pad, baselineY: y, advance: w };
}

/** 9:16 safe box (spec 2.7) and how far a word's faint halo reaches past its glyphs. */
const SAFE9 = { x0: 96, x1: 918, y0: 200, y1: 1440 };
const HALO = 34;

let scrimTex = null;
function scrimTexture() {
  if (scrimTex) return scrimTex;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(28,16,10,0.22)'); gr.addColorStop(0.6, 'rgba(28,16,10,0.12)'); gr.addColorStop(1, 'rgba(28,16,10,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  scrimTex = canvasTexture(c);
  return scrimTex;
}

/**
 * Line breaks for one caption: every way to break its words (a caption is a handful of words)
 * scored by line count, then breaks after "." or "," (more is better), then the longest line.
 * A line wider than maxW only passes when it is a single word. Returns [{ words, width }].
 */
function wrapWords(words, space, maxW) {
  const n = words.length;
  const lineW = (a, b) => { let w = 0; for (let i = a; i < b; i++) w += words[i].advance + (i > a ? space : 0); return w; };
  let best = null;
  for (let mask = 0; mask < 1 << Math.max(0, n - 1); mask++) {
    const cuts = [0];
    for (let i = 0; i < n - 1; i++) if (mask & (1 << i)) cuts.push(i + 1);
    cuts.push(n);
    let ok = true, longest = 0, punct = 0;
    for (let k = 0; k < cuts.length - 1; k++) {
      const w = lineW(cuts[k], cuts[k + 1]);
      if (w > maxW && cuts[k + 1] - cuts[k] > 1) { ok = false; break; }
      longest = Math.max(longest, w);
      if (k > 0 && /[.,]$/.test(words[cuts[k] - 1].text)) punct++;
    }
    if (!ok) continue;
    const score = [cuts.length - 1, -punct, longest];
    if (!best || score[0] < best.score[0] || (score[0] === best.score[0] && (score[1] < best.score[1] || (score[1] === best.score[1] && score[2] < best.score[2])))) best = { score, cuts };
  }
  const out = [];
  for (let k = 0; k < best.cuts.length - 1; k++) out.push({ words: words.slice(best.cuts[k], best.cuts[k + 1]), width: lineW(best.cuts[k], best.cuts[k + 1]) });
  return out;
}

/**
 * captions: [{ id, text, voice: 'claim'|'tease', size?: 'big', in, out, line }]
 * Captions whose in/out overlap and share a voice form one block, ordered by `line`.
 */
export class Captions {
  constructor(overlay, captions, { aspect, pxScale }) {
    this.overlay = overlay;
    this.aspect = aspect;
    this.px = pxScale;
    this.blocks = [];
    // group into blocks
    const sorted = captions.slice().sort((a, b) => a.in - b.in);
    for (const c of sorted) {
      const blk = this.blocks.find((b) => b.voice === c.voice && c.in < b.out && c.line > 0);
      if (blk) { blk.caps.push(c); blk.out = Math.max(blk.out, c.out); } else this.blocks.push({ voice: c.voice, caps: [c], in: c.in, out: c.out });
    }
    let n = 0;
    for (const b of this.blocks) {
      const lines = [];
      for (const c of b.caps) {
        const st = STYLE[c.size === 'big' ? 'big' : c.voice];
        const size = Math.round(st.size[aspect] * this.px);
        // gi: the word's index across the whole caption, so a wrapped caption still reveals in reading order
        const words = c.text.split(' ').map((w, gi) => ({ ...wordCanvas(w, st, size), text: w, gi }));
        const space = size * 0.28;
        const maxW = (aspect === '9x16' ? SAFE9.x1 - SAFE9.x0 - 2 * HALO : 1500) * this.px;
        // wrap: the fewest lines that fit maxW; among those, breaks after a word ending in
        // "." or "," first ("Animal friends. / Each with a room."), then the most even lines,
        // i.e. the shortest longest line ("Over 4,000 / word puzzles.", never an orphan)
        for (const seg of wrapWords(words, space, maxW)) lines.push({ cap: c, words: seg.words, width: seg.width, size });
        for (const ln of lines.filter((l) => l.cap === c)) ln.space = space;
      }
      // vertical layout
      const lh = (sz) => sz * 1.16;
      const total = lines.reduce((a, l) => a + lh(l.size), 0);
      let y = aspect === '9x16' ? 330 * this.px : 918 * this.px - total + lh(lines[lines.length - 1].size);
      const centred = b.voice !== 'claim';
      let minX = Infinity, maxX = -Infinity;
      for (const ln of lines) {
        let x = centred ? (aspect === '9x16' ? (SAFE9.x0 + SAFE9.x1) / 2 : 960) * this.px - ln.width / 2 : (aspect === '9x16' ? SAFE9.x0 + HALO : 128) * this.px;
        ln.baseline = y;
        ln.items = ln.words.map((w, i) => {
          const name = `cap${n++}`;
          this.overlay.quad(name, { canvas: w.canvas, width: w.canvas.width, height: w.canvas.height });
          const cx = x - w.pad + w.canvas.width / 2;
          const cy = y - w.baselineY + w.canvas.height / 2;
          minX = Math.min(minX, x); maxX = Math.max(maxX, x + w.advance);
          x += w.advance + ln.space;
          return { name, cx, cy, i: w.gi };
        });
        y += lh(ln.size);
      }
      const top = lines[0].baseline - lines[0].size, bottom = lines[lines.length - 1].baseline + lines[lines.length - 1].size * 0.3;
      b.lines = lines;
      b.scrim = `scrim${this.blocks.indexOf(b)}`;
      // the scrim's soft ellipse, clipped to the safe area so its faint edge never leaves it
      const cx = (minX + maxX) / 2, cy = (top + bottom) / 2;
      let hw = (maxX - minX) * 0.8, hh = (bottom - top) * 0.8 + 30 * this.px;
      const safe = aspect === '9x16'
        ? { x0: SAFE9.x0, x1: SAFE9.x1, y0: SAFE9.y0, y1: SAFE9.y1 }
        : { x0: 0, x1: 1920, y0: 0, y1: 970 };
      hw = Math.min(hw, cx - safe.x0 * this.px, safe.x1 * this.px - cx);
      hh = Math.min(hh, cy - safe.y0 * this.px, safe.y1 * this.px - cy);
      this.overlay.quad(b.scrim, { texture: scrimTexture(), width: hw * 2, height: hh * 2 });
      this.overlay.items.get(b.scrim).mesh.renderOrder = -1; // under the words
      b.scrimPos = { x: cx, y: cy };
    }
  }

  update(t) {
    const rise = (this.aspect === '9x16' ? 14 : 12) * this.px;
    for (const b of this.blocks) {
      let blockOp = 0;
      for (const ln of b.lines) {
        const c = ln.cap;
        for (const it of ln.items) {
          const t0 = c.in + it.i * 0.06;
          const a = clamp((t - t0) / 0.3);
          const k = ease.outCubic(a);
          // `out` is when the caption is gone (spec 3.4): it fades over the 0.22 s before it
          const out = 1 - clamp((t - (c.out - 0.22)) / 0.22);
          const op = t < t0 ? 0 : k * out;
          this.overlay.place(it.name, { x: it.cx, y: it.cy + (1 - k) * rise, opacity: op });
          blockOp = Math.max(blockOp, op);
        }
      }
      this.overlay.place(b.scrim, { ...b.scrimPos, opacity: blockOp });
    }
  }
}
