// The blueprint: a parchment sheet whose chalk lines draw a room outline, with a
// tiny title block that reads PLAN. The drawing progresses with `draw` (0..1);
// the canvas is only re-rasterized when the progress changes.

import * as THREE from 'three';

const W = 640, H = 440;

// A room seen from the front: back wall rectangle, perspective lines to the front
// corners, floorboards, ONE cross-paned window up at the left and a hammock slung
// between two posts at the lower right. Deliberately asymmetric: nothing in the
// drawing may pair up into eyes above a curve (spec 7.1, no faces).
const STROKES = [
  [[70, 60], [570, 60], [570, 330], [70, 330], [70, 60]],
  [[70, 60], [20, 20]], [[570, 60], [620, 20]], [[70, 330], [20, 410]], [[570, 330], [620, 410]],
  [[20, 410], [620, 410]],
  [[40, 370], [600, 370]],
  [[105, 95], [225, 95], [225, 200], [105, 200], [105, 95]],
  [[165, 95], [165, 200]], [[105, 147], [225, 147]],
  [[330, 330], [330, 205]], [[540, 330], [540, 205]],
  [[330, 215], [390, 262], [435, 272], [480, 262], [540, 215]],
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

  function paperBase(ctx) {
    ctx.fillStyle = '#F3E2BF'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#E4CC9C';
    for (let i = 0; i < 9; i++) ctx.fillRect(0, i * 52 + 24, W, 1);
    ctx.strokeStyle = '#3B2416'; ctx.globalAlpha = 0.35; ctx.lineWidth = 6; ctx.strokeRect(3, 3, W - 6, H - 6); ctx.globalAlpha = 1;
    // title block
    ctx.fillStyle = '#E4CC9C'; ctx.fillRect(W - 170, H - 64, 150, 46);
    ctx.fillStyle = '#3B2416'; ctx.font = '700 30px "Figtree"'; ctx.textBaseline = 'middle'; ctx.fillText('PLAN', W - 146, H - 40);
  }

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
