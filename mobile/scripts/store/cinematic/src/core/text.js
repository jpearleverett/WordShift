// Crisp 2D text for the overlay: drawn into a canvas at the exact output pixel
// size, uploaded as a texture and shown 1:1 on an orthographic quad.

import * as THREE from 'three';

/**
 * Draw text into a canvas. Returns { canvas, width, height }.
 * opts: { text (string or lines[]), font, size, weight, style, color, letterSpacing (em),
 *         lineHeight (em), align, stroke:{color,width}, shadow:{color,blur,x,y},
 *         glow:{color,blur}, pad }
 */
export function drawText(opts) {
  const lines = Array.isArray(opts.text) ? opts.text : String(opts.text).split('\n');
  const size = opts.size;
  const font = `${opts.style || 'normal'} ${opts.weight || '700'} ${size}px "${opts.font}"`;
  const ls = (opts.letterSpacing || 0) * size;
  const lh = (opts.lineHeight || 1.15) * size;
  const pad = opts.pad ?? Math.ceil(size * 0.6);
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = font;
  const widthOf = (s) => {
    if (!ls) return meas.measureText(s).width;
    let w = 0; for (const ch of s) w += meas.measureText(ch).width + ls; return w - ls;
  };
  const widths = lines.map(widthOf);
  const w = Math.ceil(Math.max(...widths) + pad * 2);
  const h = Math.ceil(lh * lines.length + pad * 2);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  const ascent = size * 0.78;
  const drawLine = (s, x, y) => {
    if (!ls) { ctx.fillText(s, x, y); return; }
    let cx = x; for (const ch of s) { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + ls; }
  };
  const strokeLine = (s, x, y) => {
    if (!ls) { ctx.strokeText(s, x, y); return; }
    let cx = x; for (const ch of s) { ctx.strokeText(ch, cx, y); cx += ctx.measureText(ch).width + ls; }
  };
  lines.forEach((s, i) => {
    const align = opts.align || 'center';
    const x = align === 'left' ? pad : align === 'right' ? w - pad - widths[i] : (w - widths[i]) / 2;
    const y = pad + i * lh + (lh - size) / 2 + ascent;
    if (opts.glow) {
      ctx.save(); ctx.shadowColor = opts.glow.color; ctx.shadowBlur = opts.glow.blur; ctx.fillStyle = opts.glow.color;
      drawLine(s, x, y); ctx.restore();
    }
    if (opts.shadow) {
      ctx.save(); ctx.shadowColor = opts.shadow.color; ctx.shadowBlur = opts.shadow.blur || 0;
      ctx.shadowOffsetX = opts.shadow.x || 0; ctx.shadowOffsetY = opts.shadow.y || 0;
      ctx.fillStyle = opts.shadow.color; drawLine(s, x, y); ctx.restore();
    }
    if (opts.stroke) {
      ctx.save(); ctx.lineJoin = 'round'; ctx.strokeStyle = opts.stroke.color; ctx.lineWidth = opts.stroke.width;
      strokeLine(s, x, y); ctx.restore();
    }
    ctx.fillStyle = opts.color || '#fff';
    drawLine(s, x, y);
  });
  return { canvas, width: w, height: h };
}

export function canvasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

/**
 * Screen-space overlay (pixel coordinates, origin top-left) for captions,
 * logo and end card. Items are quads with a texture, opacity and transform.
 */
export class Overlay {
  constructor(width, height) {
    this.width = width; this.height = height;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(0, width, 0, -height, -10, 10);
    this.items = new Map();
  }

  /** Add (or fetch) a named quad. source: { canvas } or { texture, width, height }. */
  quad(name, source) {
    if (this.items.has(name)) return this.items.get(name);
    const texture = source.texture || canvasTexture(source.canvas);
    const w = source.width, h = source.height;
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false, toneMapped: false, premultipliedAlpha: false });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.renderOrder = this.items.size;
    const item = { mesh, mat, w, h, texture };
    this.scene.add(mesh);
    this.items.set(name, item);
    this.hide(name);
    return item;
  }

  /** Place a quad: center (x,y) in px, scale, opacity, rotation (rad). */
  place(name, { x, y, scale = 1, sx, sy, opacity = 1, rot = 0 }) {
    const it = this.items.get(name);
    if (!it) return;
    it.mesh.visible = opacity > 0.001;
    it.mat.opacity = opacity;
    it.mesh.position.set(x, -y, 0);
    it.mesh.scale.set(it.w * (sx ?? scale), it.h * (sy ?? scale), 1);
    it.mesh.rotation.z = rot;
  }

  hide(name) { const it = this.items.get(name); if (it) it.mesh.visible = false; }
  hideAll() { for (const it of this.items.values()) it.mesh.visible = false; }

  /**
   * QA: screen-space boxes of every visible item's inked pixels (alpha * opacity > 0.01),
   * in output pixels. Rotation is ignored (items rotate by a few degrees at most).
   */
  boxes() {
    const out = [];
    for (const [name, it] of this.items) {
      if (!it.mesh.visible || it.mat.opacity <= 0.01) continue;
      const bb = inkBox(it, 0.01 / it.mat.opacity);
      if (!bb) continue;
      const sx = it.mesh.scale.x, sy = it.mesh.scale.y, cx = it.mesh.position.x, cy = -it.mesh.position.y;
      out.push({ name, opacity: it.mat.opacity, x0: cx + (bb.x0 - 0.5) * sx, x1: cx + (bb.x1 - 0.5) * sx, y0: cy + (bb.y0 - 0.5) * sy, y1: cy + (bb.y1 - 0.5) * sy });
    }
    return out;
  }
}

/** Normalised bounds (0..1, top-left origin) of an item's pixels whose alpha exceeds `thr`. */
function inkBox(it, thr) {
  const img = it.texture.image;
  if (!img || !img.width) return { x0: 0, y0: 0, x1: 1, y1: 1 };
  if (!it.alpha) {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    it.alpha = { data: g.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height };
  }
  const { data, w, h } = it.alpha;
  const a8 = Math.min(255, Math.max(1, Math.floor(thr * 255)));
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > a8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  return { x0: x0 / w, y0: y0 / h, x1: (x1 + 1) / w, y1: (y1 + 1) / h };
}
