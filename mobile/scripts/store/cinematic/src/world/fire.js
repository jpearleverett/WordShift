// A pixel-art hearth fire in 3D: quantized flame squares, rising sparks that
// can gather into a line drawing, and a flickering warm light. Also the three
// tiny pixel moths that circle Sloane. Pure functions of time.

import * as THREE from 'three';
import { mulberry32, clamp, ease, noise1, hash01 } from '../core/math.js';

const FLAME_COLS = ['#fff4b8', '#ffd76a', '#ffab40', '#ff7a2e', '#e2492b'].map((c) => new THREE.Color(c).multiplyScalar(1.5));

/**
 * opts: { px: pixel size (world units), width, height, count, sparks }
 * pose(t, { drawing: [[x,y],...] polyline in local units, drawStart, drawEnd, holdEnd, release }) animates.
 */
export function makeFire({ px = 0.06, width = 0.9, height = 1.1, count = 90, sparks = 40, seed = 17, lightColor = '#ff9a45', lightRange = 9 } = {}) {
  const group = new THREE.Group();
  const rnd = mulberry32(seed);
  const quad = new THREE.PlaneGeometry(1, 1);
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true });
  const flames = new THREE.InstancedMesh(quad, flameMat, count);
  flames.frustumCulled = false;
  flames.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3);
  const fl = [];
  for (let i = 0; i < count; i++) fl.push({ ph: rnd(), x: (rnd() - 0.5) * width, rate: 0.9 + rnd() * 0.8, sz: 1 + Math.floor(rnd() * 3), wob: rnd() * 6 });
  group.add(flames);

  const sparkMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const sp = new THREE.InstancedMesh(quad, sparkMat, sparks);
  sp.frustumCulled = false;
  sp.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(sparks * 3), 3);
  const sk = [];
  for (let i = 0; i < sparks; i++) sk.push({ ph: rnd(), x: (rnd() - 0.5) * width * 0.8, rate: 0.35 + rnd() * 0.3, drift: (rnd() - 0.5) * 0.6, seed: rnd() * 100 });
  group.add(sp);

  const light = new THREE.PointLight(lightColor, 3, lightRange, 1.8);
  light.position.set(0, height * 0.4, 0.4);
  group.add(light);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3(), col = new THREE.Color();
  const snap = (v) => Math.round(v / px) * px;

  function samplePolyline(pts, u) {
    // arc-length parametrised point on a polyline
    let total = 0; const L = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); total += d; }
    let tgt = u * total;
    for (let i = 0; i < L.length; i++) {
      if (tgt <= L[i] || i === L.length - 1) { const k = L[i] ? tgt / L[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; }
      tgt -= L[i];
    }
    return pts[pts.length - 1];
  }

  return {
    group, light,
    pose(t, { intensity = 1, drawing = null, drawStart = 0, drawEnd = 0, holdEnd = 0, release = 0.6, camera = null } = {}) {
      if (camera) group.quaternion.copy(camera.quaternion);
      for (let i = 0; i < count; i++) {
        const f = fl[i];
        const u = (t * f.rate + f.ph) % 1;
        const h = u * height * (0.75 + 0.25 * noise1(t * 3 + i, 2));
        const narrow = 1 - u * 0.85;
        const x = f.x * narrow + Math.sin(t * 7 + f.wob + u * 5) * 0.06 * (1 - u);
        const size = px * f.sz * (1 - u * 0.7) * intensity;
        p3.set(snap(x), snap(h), 0.01 * (i % 5)); s3.set(size, size, 1);
        m.compose(p3, q.identity(), s3);
        flames.setMatrixAt(i, m);
        const ci = Math.min(FLAME_COLS.length - 1, Math.floor(u * FLAME_COLS.length + (f.sz === 3 ? 0 : 0.4)));
        col.copy(FLAME_COLS[ci]).multiplyScalar(intensity * (1 - u * 0.5));
        flames.setColorAt(i, col);
      }
      flames.instanceMatrix.needsUpdate = true; flames.instanceColor.needsUpdate = true;

      for (let i = 0; i < sparks; i++) {
        const k = sk[i];
        let x, y, a;
        const u = (t * k.rate + k.ph) % 1;
        x = k.x + k.drift * u + Math.sin(t * 2 + k.seed) * 0.08; y = height * 0.6 + u * height * 2.2; a = (1 - u) * (hash01(Math.floor(t * 12) + i * 31) > 0.2 ? 1 : 0.4);
        if (drawing && t >= drawStart && t < holdEnd + release) {
          // gather along the drawing, revealed stroke by stroke
          const reveal = clamp((t - drawStart) / Math.max(0.01, drawEnd - drawStart));
          const ui = (i + 0.5) / sparks;
          const target = samplePolyline(drawing, ui);
          const gatherK = ease.outCubic(clamp((t - drawStart - ui * (drawEnd - drawStart) * 0.9) / 0.25));
          const shown = ui <= reveal + 0.02 ? 1 : 0;
          let tx = target[0] + Math.sin(t * 9 + i) * 0.012, ty = target[1] + Math.cos(t * 8 + i) * 0.012;
          if (t > holdEnd) { const r = (t - holdEnd) / release; ty += r * r * 1.6; tx += Math.sin(i) * r * 0.2; }
          x = x + (tx - x) * gatherK * shown; y = y + (ty - y) * gatherK * shown;
          a = shown ? (t > holdEnd ? 1 - (t - holdEnd) / release : 1) : a * 0.3;
        }
        const size = px * 1.25;
        p3.set(snap(x), snap(y), 0.05); s3.set(size, size, 1);
        m.compose(p3, q.identity(), s3);
        sp.setMatrixAt(i, m);
        col.set('#ffcf7a').multiplyScalar(2.2 * a * intensity);
        sp.setColorAt(i, col);
      }
      sp.instanceMatrix.needsUpdate = true; sp.instanceColor.needsUpdate = true;
      light.intensity = intensity * (2.6 + 0.8 * noise1(t * 9, 5) + 0.4 * noise1(t * 23, 9));
    },
  };
}

/** Three tiny pixel moths (8x6 art px) on lissajous loops around a point. */
export function makeMoths({ px = 0.045, radius = 0.55, colors = ['#e9d8b8', '#d8c2e6', '#c9dfc6'] } = {}) {
  const group = new THREE.Group();
  const frames = colors.map((c) => [0, 1].map((f) => {
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 6;
    const g = cv.getContext('2d');
    g.fillStyle = '#5a4636'; g.fillRect(3, 2, 2, 3);
    g.fillStyle = c;
    if (f === 0) { g.fillRect(0, 0, 3, 3); g.fillRect(5, 0, 3, 3); g.fillRect(1, 3, 2, 2); g.fillRect(5, 3, 2, 2); }
    else { g.fillRect(1, 1, 2, 2); g.fillRect(5, 1, 2, 2); g.fillRect(2, 3, 1, 2); g.fillRect(5, 3, 1, 2); }
    const tex = new THREE.CanvasTexture(cv); tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide });
  }));
  const moths = frames.map((fr, i) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(8 * px, 6 * px), fr[0]);
    group.add(mesh);
    return { mesh, fr, ph: i * 2.1, sp: 0.9 + i * 0.23 };
  });
  return {
    group,
    pose(t, camera) {
      for (const mo of moths) {
        const a = t * mo.sp + mo.ph;
        mo.mesh.position.set(Math.sin(a * 1.3) * radius, Math.sin(a * 2.1) * radius * 0.35, Math.cos(a * 1.3) * radius * 0.6);
        mo.mesh.material = mo.fr[Math.floor(t * 14 + mo.ph * 3) % 2];
        if (camera) mo.mesh.quaternion.copy(camera.quaternion);
      }
    },
  };
}
