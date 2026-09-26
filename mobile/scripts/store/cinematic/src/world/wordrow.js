// A word laid out as tiles along a line, with the game's move made physical:
// a letter lifts out (the row closes up), and a target row opens a slot for
// it (neighbours slide apart), then the letter lands with squash and settle.
// Holders: a parchment tray (like the game's rows) or a twine garland.

import * as THREE from 'three';
import { makeTile, TILE_W, TILE_H, TILE_D } from '../core/tiles.js';
import { clamp, ease, spring } from '../core/math.js';
import { pixelWood } from './house.js';

export const GAP = 0.12;
export const PITCH = TILE_W + GAP;

/**
 * Create tiles for `letters` (a string). Returns { group, tiles: [{ch, obj, id}] }.
 * Tile ids let a moving letter keep its identity across rows.
 */
export function makeTiles(letters, idPrefix = '') {
  const group = new THREE.Group();
  const tiles = letters.split('').map((ch, i) => {
    const obj = makeTile(ch);
    group.add(obj);
    return { ch, obj, id: `${idPrefix}${i}` };
  });
  return { group, tiles };
}

/** x offset of slot i in a row of n tiles, centered on 0. */
export function slotX(i, n) { return (i - (n - 1) / 2) * PITCH; }

/**
 * Lay out a row whose composition changes over time.
 * states: [{ at, order: [tileIndex...] }] ascending; tiles glide to their new slots
 * with a spring after each change (`glide` seconds, overshoot from zeta).
 * Returns positions per tile index for time t (tiles absent from the order are skipped).
 */
export function rowLayout(states, t, { freq = 2.4, zeta = 0.55 } = {}) {
  const pos = new Map();
  let prev = null;
  for (const st of states) {
    if (t < st.at) break;
    const n = st.order.length;
    const target = new Map(st.order.map((ti, i) => [ti, slotX(i, n)]));
    if (!prev) { for (const [k, v] of target) pos.set(k, v); }
    else {
      const k = spring(t - st.at, freq, zeta);
      const next = new Map();
      for (const [ti, x] of target) {
        const from = pos.has(ti) ? pos.get(ti) : x;
        next.set(ti, from + (x - from) * k);
      }
      pos.clear(); for (const [a, b] of next) pos.set(a, b);
    }
    prev = st;
  }
  return pos;
}

/**
 * The flight of a moved letter from world point A to world point B.
 * Returns { p:[x,y,z], rot:[x,y,z], squash } for local time u in [0,1] of the flight,
 * with an arc height, a small tumble and a landing squash handled by the caller.
 */
export function flight(A, B, u, { arc = 1.4, tumble = 0.35, lift = 0.25, zArc = 0.8 } = {}) {
  const e = ease.inOutCubic(clamp(u));
  const x = A[0] + (B[0] - A[0]) * e;
  const z = A[2] + (B[2] - A[2]) * e + Math.sin(Math.PI * e) * zArc;
  const base = A[1] + (B[1] - A[1]) * e;
  const y = base + Math.sin(Math.PI * e) * arc + lift * Math.sin(Math.PI * Math.min(1, e * 1.4)) * (1 - e);
  const rx = Math.sin(Math.PI * e) * tumble * 0.6;
  const rz = Math.sin(Math.PI * e) * -tumble * Math.sign(B[0] - A[0] || 1);
  return { p: [x, y, z], rot: [rx, 0, rz] };
}

/** Landing squash/stretch for time since landing `s` (seconds). Returns [sx, sy, sz]. */
export function landSquash(s) {
  if (s < 0) return [1, 1, 1];
  const k = 1 - spring(s, 5.5, 0.28);
  const sy = 1 - 0.16 * k;
  return [1 + 0.1 * k, sy, 1 + 0.1 * k];
}

/** A parchment tray with a wooden rim, sized for n tiles. */
export function makeTray(n, { depth = 0.7 } = {}) {
  const w = n * PITCH + 0.5, h = TILE_H + 0.42;
  const group = new THREE.Group();
  const woodTex = pixelWood({ base: '#8a5a3c', planks: 3, seed: 13 });
  woodTex.repeat.set(w / 1.2, 0.6);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.24, h + 0.24, depth), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 }));
  rim.position.z = -depth / 2 - TILE_D / 2 + 0.06;
  rim.castShadow = true; rim.receiveShadow = true;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: '#F3E2BF', roughness: 0.85 }));
  face.position.z = -TILE_D / 2 + 0.065;
  face.receiveShadow = true;
  group.add(rim, face);
  group.userData = { w, h };
  return group;
}

/** Twine between two points, sagging like a catenary. Returns { mesh, at(u) -> Vector3 }. */
export function makeTwine(a, b, { sag = 0.35, radius = 0.025, color = '#c9a86a' } = {}) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const at = (u) => {
    const p = A.clone().lerp(B, u);
    p.y -= Math.sin(Math.PI * u) * sag;
    return p;
  };
  const pts = []; for (let i = 0; i <= 40; i++) pts.push(at(i / 40));
  const curve = new THREE.CatmullRomCurve3(pts);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, radius, 6, false), new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
  mesh.castShadow = true;
  return { mesh, at };
}

export { TILE_W, TILE_H, TILE_D };
