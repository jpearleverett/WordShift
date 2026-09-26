// Caption engine. Captions are grouped into blocks (lines that stack, e.g.
// "Move one letter." / "Both words stay real."); every word is its own quad so
// it can rise in on its own beat. Legibility comes from a two-layer warm shadow
// and a soft local scrim, never a box. Layout follows the per-aspect rules:
//   16:9  claims left at x 128, teases centred; the block's last baseline at y 950
//   9:16  inside the safe box x 96-918; the block's first baseline at y 330

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
  g.save(); g.shadowColor = 'rgba(40,20,10,0.30)'; g.shadowBlur = 34 * s; g.fillStyle = 'rgba(40,20,10,0.30)'; g.fillText(word, x, y); g.restore();
  g.save(); g.shadowColor = 'rgba(40,20,10,0.62)'; g.shadowBlur = 12 * s; g.shadowOffsetY = 3 * s; g.fillStyle = 'rgba(40,20,10,0.62)'; g.fillText(word, x, y); g.restore();
  g.fillStyle = st.color; g.fillText(word, x, y);
  return { canvas: c, w, h: c.height, pad, baselineY: y, advance: w };
}

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
        const words = c.text.split(' ').map((w) => ({ ...wordCanvas(w, st, size), text: w }));
        const space = size * 0.28;
        const maxW = (aspect === '9x16' ? 822 : 1500) * this.px;
        // wrap
        let cur = [], curW = 0;
        const push = () => { if (cur.length) lines.push({ cap: c, words: cur, width: curW, size }); cur = []; curW = 0; };
        for (const w of words) {
          const add = (cur.length ? space : 0) + w.advance;
          if (curW + add > maxW && cur.length) push();
          cur.push(w); curW += (cur.length > 1 ? space : 0) + w.advance;
        }
        push();
        for (const ln of lines.filter((l) => l.cap === c)) ln.space = space;
      }
      // vertical layout
      const lh = (sz) => sz * 1.16;
      const total = lines.reduce((a, l) => a + lh(l.size), 0);
      let y = aspect === '9x16' ? 330 * this.px : 950 * this.px - total + lh(lines[lines.length - 1].size);
      const centred = b.voice !== 'claim';
      let minX = Infinity, maxX = -Infinity;
      for (const ln of lines) {
        let x = centred ? (aspect === '9x16' ? 507 : 960) * this.px - ln.width / 2 : (aspect === '9x16' ? 96 : 128) * this.px;
        ln.baseline = y;
        ln.items = ln.words.map((w, i) => {
          const name = `cap${n++}`;
          this.overlay.quad(name, { canvas: w.canvas, width: w.canvas.width, height: w.canvas.height });
          const cx = x - w.pad + w.canvas.width / 2;
          const cy = y - w.baselineY + w.canvas.height / 2;
          minX = Math.min(minX, x); maxX = Math.max(maxX, x + w.advance);
          x += w.advance + ln.space;
          return { name, cx, cy, i };
        });
        y += lh(ln.size);
      }
      const top = lines[0].baseline - lines[0].size, bottom = lines[lines.length - 1].baseline + lines[lines.length - 1].size * 0.3;
      b.lines = lines;
      b.scrim = `scrim${this.blocks.indexOf(b)}`;
      const sw = (maxX - minX) * 1.6, sh = (bottom - top) * 1.6 + 60 * this.px;
      this.overlay.quad(b.scrim, { texture: scrimTexture(), width: sw, height: sh });
      this.overlay.items.get(b.scrim).mesh.renderOrder = -1; // under the words
      b.scrimPos = { x: (minX + maxX) / 2, y: (top + bottom) / 2 };
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
          const out = 1 - clamp((t - c.out) / 0.22);
          const op = t < t0 ? 0 : k * out;
          this.overlay.place(it.name, { x: it.cx, y: it.cy + (1 - k) * rise, opacity: op });
          blockOp = Math.max(blockOp, op);
        }
      }
      this.overlay.place(b.scrim, { ...b.scrimPos, opacity: blockOp });
    }
  }
}
