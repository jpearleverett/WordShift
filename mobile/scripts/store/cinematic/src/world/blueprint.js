// The blueprint: a grained parchment sheet whose chalk lines draw a room outline, with an
// inked title cartouche that reads PLAN. The drawing progresses with `draw` (0..1);
// the canvas is only re-rasterized when the progress changes.

import * as THREE from 'three';
import { hash01 } from '../core/math.js';

// The sheet is landscape (2:1, like a room): S02 lays it on the empty frame at 90% of
// the room's width, and a taller sheet ran past the floor and the ceiling there, so the
// title block sank into the floor slab. Everything below sits inside a 16 px margin, and
// the title block has its own strip under the drawing, where no chalk line ever crosses it.
const W = 640, H = 320;

// A room seen from the front: back wall rectangle, perspective lines to the front
// corners, floorboards, ONE cross-paned window up at the left and a hammock slung
// between two posts at the lower right. Deliberately asymmetric: nothing in the
// drawing may pair up into eyes above a curve (spec 7.1, no faces).
const STROKES = [
  [[98, 44], [542, 44], [542, 200], [98, 200], [98, 44]],
  [[98, 44], [30, 18]], [[542, 44], [610, 18]], [[98, 200], [30, 256]], [[542, 200], [610, 256]],
  [[30, 256], [610, 256]],
  [[48, 232], [592, 232]],
  [[128, 66], [226, 66], [226, 144], [128, 144], [128, 66]],
  [[177, 66], [177, 144]], [[128, 105], [226, 105]],
  [[330, 200], [330, 124]], [[516, 200], [516, 124]],
  [[330, 132], [382, 162], [423, 170], [464, 162], [516, 132]],
];

function strokeLen(s) { let l = 0; for (let i = 1; i < s.length; i++) l += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return l; }
const TOTAL = STROKES.reduce((a, s) => a + strokeLen(s), 0);

export function makeBlueprint({ width = 1.6 } = {}) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const emC = document.createElement('canvas'); emC.width = W; emC.height = H;
  const eg = emC.getContext('2d');
  const emTex = new THREE.CanvasTexture(emC); emTex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color('#FFF4DA'), emissiveMap: emTex, emissiveIntensity: 1.6, roughness: 0.9, side: THREE.DoubleSide, transparent: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * H / W), mat);
  mesh.castShadow = true;
  let last = -1;

  // the paper, drawn once: parchment with a deterministic pixel grain (+-5 luma) and a
  // 6 px vignette that darkens its edges, so it reads as a sheet against the pine boards
  const paper = document.createElement('canvas'); paper.width = W; paper.height = H;
  {
    const pg = paper.getContext('2d');
    const img = pg.createImageData(W, H);
    const [r0, g0, b0] = [0xF3, 0xE2, 0xBF];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const n = (hash01(x * 7 + y * 7919) - 0.5) * 10; // +-5
        const d = Math.min(x, y, W - 1 - x, H - 1 - y);
        const v = d < 6 ? 0.8 + 0.2 * (d / 6) ** 1.5 : 1; // the vignette
        const i = (y * W + x) * 4;
        img.data[i] = Math.round((r0 + n) * v); img.data[i + 1] = Math.round((g0 + n) * v); img.data[i + 2] = Math.round((b0 + n) * v * (d < 6 ? 0.95 : 1));
        img.data[i + 3] = 255;
      }
    }
    pg.putImageData(img, 0, 0);
    // the title cartouche, in the strip under the drawing (the front floor line is at
    // y 256), 20 px in from where it was so the right return never clips it: a 2 px ink
    // frame with chamfered corners and PLAN in full ink (the ruled lines stop short of it)
    const [cx0, cy0, cx1, cy1, c] = [446, 264, 590, 303, 6];
    pg.fillStyle = '#E4CC9C';
    for (let i = 0; i < 6; i++) {
      const y = i * 52 + 24;
      if (y > cy0 - 4 && y < cy1 + 4) { pg.fillRect(8, y, cx0 - 12, 1); pg.fillRect(cx1 + 4, y, W - 8 - cx1 - 4, 1); } else pg.fillRect(8, y, W - 16, 1);
    }
    pg.strokeStyle = '#3B2416'; pg.lineWidth = 2; pg.lineJoin = 'miter';
    pg.beginPath();
    pg.moveTo(cx0 + c, cy0); pg.lineTo(cx1 - c, cy0); pg.lineTo(cx1, cy0 + c); pg.lineTo(cx1, cy1 - c); pg.lineTo(cx1 - c, cy1);
    pg.lineTo(cx0 + c, cy1); pg.lineTo(cx0, cy1 - c); pg.lineTo(cx0, cy0 + c); pg.closePath(); pg.stroke();
    pg.fillStyle = '#3B2416'; pg.font = '700 36px "Figtree"'; pg.textBaseline = 'middle'; pg.textAlign = 'center';
    pg.fillText('PLAN', (cx0 + cx1) / 2, (cy0 + cy1) / 2 + 1);
  }
  function paperBase(ctx) { ctx.drawImage(paper, 0, 0); }

  function draw(k) {
    k = Math.max(0, Math.min(1, k));
    if (Math.abs(k - last) < 0.004) return;
    last = k;
    paperBase(g);
    eg.fillStyle = '#000'; eg.fillRect(0, 0, W, H);
    let budget = k * TOTAL;
    for (const s of STROKES) {
      if (budget <= 0) break;
      for (const ctx of [g, eg]) { ctx.beginPath(); ctx.moveTo(s[0][0], s[0][1]); }
      let b = budget;
      for (let i = 1; i < s.length && b > 0; i++) {
        const [x0, y0] = s[i - 1], [x1, y1] = s[i];
        const L = Math.hypot(x1 - x0, y1 - y0);
        const f = Math.min(1, b / L);
        for (const ctx of [g, eg]) ctx.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
        b -= L;
      }
      budget -= strokeLen(s);
      g.strokeStyle = '#fbf3df'; g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
      eg.strokeStyle = '#ffffff'; eg.lineWidth = 7; eg.lineCap = 'round'; eg.lineJoin = 'round'; eg.stroke();
    }
    tex.needsUpdate = true; emTex.needsUpdate = true;
  }
  draw(0);
  return { mesh, draw, mat };
}
