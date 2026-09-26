// Stroke-aware hearth sparks for S08 "The fire draws": sparks leave the fire in a
// rising stream and settle, one pixel cell at a time, along timed strokes, so a
// small line drawing appears stroke by stroke (each stroke is revealed by arc
// length, like a pen). The drawing hangs, glowing, then drifts up the chimney as
// ordinary sparks. A few everyday embers rise from the fire throughout.
//
// Every stroke is rasterised onto a pixel grid (Bresenham) so the drawing is a
// clean pixel-art line of glowing squares; a cell shared by two strokes belongs
// to the first. Each spark flies a cubic Bezier that comes at its cell from
// outside the outline, so nothing ever crosses the inside of the drawing (no
// marks inside, nothing that could read as a face). Pure functions of time.

import * as THREE from 'three';
import { clamp, ease, hash01, noise1 } from '../core/math.js';

/** A plain little house (spec 6.2), drawing units, the floor's centre at the origin. No window. */
export const HOUSE_STROKES = [
  [[-0.30, 0.34], [-0.30, 0], [0.30, 0], [0.30, 0.34]],       // walls and floor
  [[-0.36, 0.30], [0, 0.60]],                                   // left roof
  [[0, 0.60], [0.36, 0.30]],                                    // right roof
  [[-0.07, 0], [-0.07, 0.17], [0.07, 0.17], [0.07, 0]],         // door
  [[0.15, 0.47], [0.15, 0.58], [0.23, 0.58], [0.23, 0.40]],     // chimney
];

/** Cells of a polyline on a grid of `cell` world units, in drawing order (Bresenham per segment). */
function rasterise(pts, scale, cell) {
  const out = [];
  const q = (v) => Math.round((v * scale) / cell);
  for (let i = 1; i < pts.length; i++) {
    let x0 = q(pts[i - 1][0]), y0 = q(pts[i - 1][1]);
    const x1 = q(pts[i][0]), y1 = q(pts[i][1]);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (!out.length || out[out.length - 1][0] !== x0 || out[out.length - 1][1] !== y0) out.push([x0, y0]);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  return out;
}

/**
 * How a spark reaches a cell of the house from below it: the two inner control points of
 * its cubic Bezier (world units, drawing frame). Floor and door cells come straight up
 * (through the doorway for the door); walls come up outside their own side; roof cells
 * come round the outside of the wall and drop onto the slope from above; the chimney
 * from above right.
 */
function houseApproach(p, k, scale) {
  const W = 0.30 * scale, TOP = 0.34 * scale;
  const side = k === 1 ? -1 : k === 2 || k === 4 ? 1 : Math.sign(p[0]) || 1;
  if (k === 3 || (k === 0 && p[1] < 0.02)) return [[p[0] * 0.6 + side * 0.15, -0.75], [p[0], p[1] - 0.35]];
  if (k === 0) return [[side * (W + 0.62), -0.5], [side * (W + 0.42), p[1] - 0.05]];
  if (k === 4) return [[W + 0.62, TOP * 0.5], [p[0] + 0.34, p[1] + 0.34]];
  const n = [side * 0.64, 0.77]; // the slope's outward normal
  return [[side * (W + 0.66), TOP * 0.4 - 0.2], [p[0] + n[0] * 0.55, p[1] + n[1] * 0.55]];
}

/**
 * strokes: polylines in drawing units; scale: world units per drawing unit; cell: pixel size (world).
 * mouth: [x, y] the fire mouth in the group's local frame (world units, relative to the drawing origin).
 * The group's local frame is the drawing plane (x right, y up); position it at the drawing origin.
 */
export function makeStrokeSparks({ strokes = HOUSE_STROKES, scale = 1.35, cell = 0.05, mouth = [0.4, -1.05], embers = 9, seed = 7, approach = houseApproach } = {}) {
  const group = new THREE.Group();
  // one spark per grid cell, stroke by stroke
  const used = new Set();
  const sparks = [];
  const lengths = [];
  strokes.forEach((pts, k) => {
    const cells = rasterise(pts, scale, cell).filter(([x, y]) => { const key = `${x},${y}`; if (used.has(key)) return false; used.add(key); return true; });
    lengths.push(cells.length);
    cells.forEach(([x, y], j) => {
      const i = sparks.length;
      const h = (n) => hash01(i * 97 + n * 13 + seed * 1009);
      const target = [x * cell, y * cell];
      const from = [mouth[0] + (h(1) - 0.5) * 0.24, mouth[1] + (h(2) - 0.5) * 0.12];
      const [c1, c2] = approach(target, k, scale);
      // rough path length sets the flight time, so the far side is not faster than the near
      const len = Math.hypot(c1[0] - from[0], c1[1] - from[1]) + Math.hypot(c2[0] - c1[0], c2[1] - c1[1]) + Math.hypot(target[0] - c2[0], target[1] - c2[1]);
      sparks.push({
        k, f: (j + 0.5) / cells.length, target, from, c1, c2,
        flight: Math.min(0.45, 0.36 + len * 0.1 + h(3) * 0.08),
        // each spark lets go on its own, well apart from its neighbours (a loose rising cloud;
        // a row or a line that lets go together, or stays behind together, reads as a letter)
        release: h(5) * 0.2, tw: h(7) * 50,
        // once free it kicks off sideways (never straight up its own wall, which would keep a
        // dotted column) and climbs at its own speed, so neighbours part at once
        drift: (h(6) < 0.5 ? -1 : 1) * (0.1 + 0.16 * h(9)), climb: 0.8 + h(8) * 1.0,
      });
    });
  });
  const TRAIL = [0, 0.018, 0.036];
  const n = sparks.length * TRAIL.length + embers;
  const quad = new THREE.PlaneGeometry(1, 1);
  const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const mesh = new THREE.InstancedMesh(quad, mat, n);
  mesh.frustumCulled = false;
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
  group.add(mesh);
  // the drawing lights the stone behind it a little while it glows
  const light = new THREE.PointLight('#ffb468', 0, 4.5, 1.6);
  light.position.set(0, 0.3 * scale, 0.5);
  group.add(light);

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
  const col = new THREE.Color();
  const HOT = new THREE.Color('#ffc46e'), LINE = new THREE.Color('#ffe2a4');
  const snap = (v) => Math.round(v / cell) * cell;
  const emb = Array.from({ length: embers }, (_, i) => ({ ph: hash01(i * 31 + seed), per: 0.9 + hash01(i * 17 + 3) * 0.6, x: (hash01(i * 7 + 11) - 0.5) * 0.3, sw: hash01(i * 5 + 2) * 6 }));

  /** Where spark s is at time t (local), and its brightness; null before launch.
   *  o.minLaunch: no spark leaves the fire before it (the shot's first frames show only embers),
   *  so an early stroke's sparks fly a shorter, quicker path and still land on their cue. */
  function sparkAt(s, t, o) {
    const arrive = o.times[s.k] + s.f * o.dur;
    const launch = Math.max(arrive - s.flight, o.minLaunch ?? -Infinity);
    if (t < launch) return null;
    let x, y, a;
    if (t < arrive) {
      // rise out of the fire and come at the cell from outside the drawing, speeding up into
      // it, faint in flight: the line itself only lights on the stroke's own cue
      const u = ease.inQuad((t - launch) / Math.max(1e-3, arrive - launch)), v = 1 - u;
      const b0 = v * v * v, b1 = 3 * v * v * u, b2 = 3 * v * u * u, b3 = u * u * u;
      x = b0 * s.from[0] + b1 * s.c1[0] + b2 * s.c2[0] + b3 * s.target[0];
      y = b0 * s.from[1] + b1 * s.c1[1] + b2 * s.c2[1] + b3 * s.target[1];
      a = 0.2 + 0.3 * u;
    } else {
      x = s.target[0]; y = s.target[1];
      // a flare as the cell lights, then a steady glow with a faint shimmer
      a = 1 + 1.6 * Math.exp(-(t - arrive) * 12) + 0.12 * noise1(t * 7 + s.tw, 3);
      const r = clamp((t - o.holdEnd - s.release) / o.release);
      if (r > 0) {
        // drift up the chimney as ordinary sparks: each leaves its cell at once, on its own
        // sideways kick and at its own speed, fading as it goes (never a moving copy of the outline)
        const kick = ease.outQuad(r);
        y += (0.2 + 0.3 * s.climb) * kick + r * r * 0.8 * s.climb;
        x += s.drift * kick + Math.sin(t * 5 + s.tw) * 0.035 * r;
        a *= 1 - ease.outQuad(r);
      } else {
        // what is still in place dims as a whole once the drawing starts to let go, so its
        // leftover pieces of line never read as letters while the rest rises
        a *= 1 - 0.95 * ease.inOutSine(clamp((t - o.holdEnd) / 0.12));
      }
    }
    return { x, y, a };
  }

  return {
    group, light, count: sparks.length, lengths,
    /**
     * o: { times: [start of each stroke], dur: how long a stroke takes (s), holdEnd, release (s),
     *      intensity, embers (0..1, the everyday embers' brightness), minLaunch (s, optional) }
     */
    pose(t, o) {
      const I = o.intensity ?? 1;
      let idx = 0, lit = 0;
      for (const s of sparks) {
        const arrive = o.times[s.k] + s.f * o.dur;
        for (let k = 0; k < TRAIL.length; k++) {
          const tk = t - TRAIL[k];
          const p = sparkAt(s, tk, o);
          // trail samples only while the spark is still flying
          const flying = tk < arrive;
          const show = p && (k === 0 || flying) && p.a > 0.002;
          if (!show) { s3.set(0, 0, 0); p3.set(0, 0, 0); } else {
            const sz = cell * (k === 0 ? 0.86 : 0.62 - 0.12 * k);
            p3.set(snap(p.x), snap(p.y), 0.002 * k); s3.set(sz, sz, 1);
            if (k === 0 && !flying && p.a > 0.5) lit++;
          }
          m.compose(p3, q, s3);
          mesh.setMatrixAt(idx, m);
          const amp = show ? p.a * (k === 0 ? 1 : 0.35 / k) : 0;
          col.copy(show && !flying ? LINE : HOT).multiplyScalar(2.3 * amp * I);
          mesh.setColorAt(idx, col);
          idx++;
        }
      }
      // everyday embers: they rise a little way out of the fire and go out below the mantel
      for (const e of emb) {
        const u = (((t / e.per + e.ph) % 1) + 1) % 1;
        const x = mouth[0] + e.x + Math.sin(t * 3 + e.sw) * 0.05 * u;
        const y = mouth[1] - 0.25 + u * 0.75;
        const a = Math.sin(Math.PI * u) * 0.8 * (o.embers ?? 1);
        p3.set(snap(x), snap(y), 0); s3.set(cell * 0.7, cell * 0.7, 1);
        m.compose(p3, q, s3);
        mesh.setMatrixAt(idx, m);
        col.copy(HOT).multiplyScalar(2 * a * I);
        mesh.setColorAt(idx, col);
        idx++;
      }
      mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
      const glow = lit / sparks.length;
      const rel = clamp((t - o.holdEnd) / (o.release + 0.24));
      light.intensity = 1.8 * glow * I;
      light.position.y = 0.3 * scale + rel * 0.8;
    },
  };
}
