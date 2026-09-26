// The WORD SHIFT wordmark as a thick wooden cut-out: the PNG's alpha
// silhouette is traced (marching squares), simplified and extruded, with the
// art UV-mapped onto the front cap and dark wood on the sides.

import * as THREE from 'three';
import { loadTexture, loadImage } from '../core/assets.js';

/** Trace the outer contour of alpha > threshold on a downsampled grid. */
function traceOuter(img, step = 2, threshold = 110) {
  const W = Math.floor(img.width / step), H = Math.floor(img.height / step);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data;
  // fill interior holes: flood the transparent outside from the border
  const inside = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) inside[i] = d[i * 4 + 3] > threshold ? 1 : 0;
  const outside = new Uint8Array(W * H);
  const stack = [];
  for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
  while (stack.length) {
    const i = stack.pop();
    if (outside[i] || inside[i]) continue;
    outside[i] = 1;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W);
  }
  const solid = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : outside[y * W + x] ? 0 : 1);
  // largest blob only: find a start on the boundary, walk with Moore-neighbor tracing
  let sx = -1, sy = -1;
  outer: for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (solid(x, y)) { sx = x; sy = y; break outer; }
  const pts = [];
  const dirs = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  let cx = sx, cy = sy, dir = 7, guard = 0;
  do {
    pts.push([cx, cy]);
    let found = false;
    for (let k = 0; k < 8; k++) {
      const nd = (dir + 6 + k) % 8;
      const nx = cx + dirs[nd][0], ny = cy + dirs[nd][1];
      if (solid(nx, ny)) { cx = nx; cy = ny; dir = nd; found = true; break; }
    }
    if (!found) break;
  } while ((cx !== sx || cy !== sy) && ++guard < 200000);
  return { pts: pts.map(([x, y]) => [x * step, y * step]), W: W * step, H: H * step };
}

function simplify(pts, eps) {
  if (pts.length < 3) return pts;
  const dp = (a, b) => {
    let max = 0, idx = -1;
    const [x1, y1] = pts[a], [x2, y2] = pts[b];
    const L = Math.hypot(x2 - x1, y2 - y1) || 1;
    for (let i = a + 1; i < b; i++) {
      const [x, y] = pts[i];
      const dd = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1) / L;
      if (dd > max) { max = dd; idx = i; }
    }
    if (max > eps) return [...dp(a, idx).slice(0, -1), ...dp(idx, b)];
    return [pts[a], pts[b]];
  };
  return dp(0, pts.length - 1);
}

/**
 * Build the sign. width = world width of the wordmark. Returns a Group whose
 * origin is the art's center; the art faces +Z.
 */
export async function makeWordmarkSign({ width = 6, depth = 0.32, bevel = 0.05, sideColor = '#4a2e1c' } = {}) {
  const img = await loadImage('ui/wordmark.png');
  const tex = await loadTexture('ui/wordmark.png');
  const { pts } = traceOuter(img, 2);
  const simp = simplify(pts, 1.6);
  const s = width / img.width;
  const shape = new THREE.Shape();
  simp.forEach(([x, y], i) => {
    const X = (x - img.width / 2) * s, Y = (img.height / 2 - y) * s;
    if (i === 0) shape.moveTo(X, Y); else shape.lineTo(X, Y);
  });
  const hw = width / 2, hh = (img.height * s) / 2;
  const uvGen = {
    generateTopUV(geometry, v, a, b, c) {
      return [a, b, c].map((i) => new THREE.Vector2((v[i * 3] + hw) / (2 * hw), (v[i * 3 + 1] + hh) / (2 * hh)));
    },
    generateSideWallUV(geometry, v, a, b, c, d) {
      return [a, b, c, d].map((i, k) => new THREE.Vector2(k < 2 ? 0 : 1, (v[i * 3 + 2] / depth)));
    },
  };
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.6, bevelSegments: 2, curveSegments: 4, UVGenerator: uvGen,
  });
  geo.translate(0, 0, -depth / 2);
  const face = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.18 });
  const side = new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.8 });
  const mesh = new THREE.Mesh(geo, [face, side]);
  mesh.castShadow = true; mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  group.userData = { mesh, face, side, height: hh * 2, width };
  return group;
}
