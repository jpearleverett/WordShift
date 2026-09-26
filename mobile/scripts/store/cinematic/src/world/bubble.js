// Cottage-style parchment speech bubble: stepped pixel border, a tail, the
// resident's name on a wooden plaque, and typewriter text. Drawn to a canvas
// that can be shown in-world (a plane) or in the overlay.

import * as THREE from 'three';

const PARCH = '#F3E2BF';
const PARCH_SHADE = '#E4CC9C';
const INK = '#3B2416';
const WOOD = '#8a5a34';
const WOOD_HI = '#b07a4a';

function wrap(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * opts: { text, name, width (px), fontSize (px), tail: 'left'|'right'|'none', pixel (px per art pixel) }
 * Returns { canvas, texture, width, height, draw(nChars), total }
 */
export function makeBubble({ text, name = '', width = 900, fontSize = 44, tail = 'left', pixel = 6, font = 'Epunda Slab' }) {
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = `400 ${fontSize}px "${font}"`;
  const pad = pixel * 7;
  const lines = wrap(meas, text, width - pad * 2);
  const lh = fontSize * 1.32;
  const plateH = name ? Math.round(fontSize * 1.25) : 0;
  const tailH = tail === 'none' ? 0 : pixel * 7;
  const bodyH = Math.ceil(lines.length * lh + pad * 2);
  const H = plateH / 2 + bodyH + tailH + pixel * 2;
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = Math.ceil(H);
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter; texture.generateMipmaps = false;
  const top = plateH / 2;
  const total = text.length;

  function frame() {
    const p = pixel;
    const x0 = 0, y0 = top, w = width, h = bodyH;
    // stepped (pixel-rounded) outline
    ctx.fillStyle = INK;
    ctx.fillRect(x0 + 2 * p, y0, w - 4 * p, h);
    ctx.fillRect(x0 + p, y0 + p, w - 2 * p, h - 2 * p);
    ctx.fillRect(x0, y0 + 2 * p, w, h - 4 * p);
    ctx.fillStyle = PARCH_SHADE;
    ctx.fillRect(x0 + 2 * p, y0 + p, w - 4 * p, h - 2 * p);
    ctx.fillRect(x0 + p, y0 + 2 * p, w - 2 * p, h - 4 * p);
    ctx.fillStyle = PARCH;
    ctx.fillRect(x0 + 2 * p, y0 + 2 * p, w - 4 * p, h - 5 * p);
    ctx.fillRect(x0 + 3 * p, y0 + p * 2, w - 6 * p, h - 4 * p);
    // tail
    if (tail !== 'none') {
      const tx = tail === 'left' ? x0 + w * 0.18 : x0 + w * 0.82;
      const dir = tail === 'left' ? -1 : 1;
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = INK;
        ctx.fillRect(tx + dir * k * p - (dir < 0 ? (6 - k) * p : 0), y0 + h - p + k * p, (6 - k) * p + p, p);
        if (k < 5) { ctx.fillStyle = k < 1 ? PARCH : PARCH_SHADE; ctx.fillRect(tx + dir * k * p - (dir < 0 ? (5 - k) * p : 0) + (dir < 0 ? p : 0), y0 + h - 2 * p + k * p, (5 - k) * p, p); }
      }
    }
    // name plaque
    if (name) {
      ctx.font = `700 ${Math.round(fontSize * 0.72)}px "Figtree"`;
      const nw = ctx.measureText(name.toUpperCase()).width + p * 8;
      const px = p * 6, py = 0;
      ctx.fillStyle = INK; ctx.fillRect(px - p, py, nw + 2 * p, plateH); ctx.fillRect(px, py - p, nw, plateH + 2 * p);
      ctx.fillStyle = WOOD; ctx.fillRect(px, py, nw, plateH);
      ctx.fillStyle = WOOD_HI; ctx.fillRect(px, py, nw, p);
      ctx.fillStyle = '#FFF3DC'; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText(name.toUpperCase(), px + p * 4, py + plateH / 2 + 1);
    }
  }

  function draw(nChars) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame();
    ctx.font = `400 ${fontSize}px "${font}"`;
    ctx.fillStyle = INK; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    let left = Math.max(0, Math.floor(nChars));
    lines.forEach((ln, i) => {
      if (left <= 0) return;
      const s = ln.slice(0, left);
      left -= ln.length + 1;
      ctx.fillText(s, pad, top + pad + i * lh + fontSize * 0.95);
    });
    texture.needsUpdate = true;
  }
  draw(0);
  return { canvas, texture, width: canvas.width, height: canvas.height, draw, total };
}
