// Shared helpers for shot modules.

import * as THREE from 'three';
import { clamp, lerp } from '../core/math.js';

/** Vertical FOV (degrees) of a lens on a 24 mm-high film back (spec 2.4). */
export const mm = (f) => THREE.MathUtils.radToDeg(2 * Math.atan(12 / f));

/** World position of an object as an array. */
export function wpos(obj) { const v = new THREE.Vector3(); obj.getWorldPosition(v); return [v.x, v.y, v.z]; }

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mix3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Point the camera: position, target, vfov (deg), optional roll (deg). */
export function aim(camera, pos, target, fov, roll = 0) {
  camera.fov = fov;
  camera.updateProjectionMatrix();
  camera.position.set(pos[0], pos[1], pos[2]);
  camera.up.set(0, 1, 0);
  camera.lookAt(target[0], target[1], target[2]);
  if (roll) camera.rotateZ(THREE.MathUtils.degToRad(roll));
  return dist(pos, target);
}

/** Set the camera aspect for the cut being rendered. */
export function setAspect(camera, portrait) {
  const a = portrait ? 9 / 16 : 16 / 9;
  if (camera.aspect !== a) { camera.aspect = a; camera.updateProjectionMatrix(); }
}

/** The day / dusk look (spec 2.6) merged with the time-of-day grade and shot overrides. */
export function look(grade, dusk, over = {}) {
  return {
    toneMap: 'agx',
    bloom: { strength: lerp(0.35, 0.5, dusk), threshold: 0.85, radius: 0.55 },
    vignette: lerp(0.26, 0.3, dusk), vignetteSoft: 0.45, aberration: 0.6, grain: 0.02,
    ...grade,
    ...over,
  };
}

/** Screen-space projection of a world point: { x, y } in overlay pixels, plus depth sign. */
export function project(camera, p, overlay) {
  const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera);
  return { x: (v.x * 0.5 + 0.5) * overlay.width, y: (1 - (v.y * 0.5 + 0.5)) * overlay.height, z: v.z };
}

/** Smoothly blend between two camera setups over [a, b] with an easing fn. */
export function blendRig(t, a, b, ra, rb, e) {
  const k = e(clamp((t - a) / (b - a)));
  return { pos: mix3(ra.pos, rb.pos, k), target: mix3(ra.target, rb.target, k), fov: lerp(ra.fov, rb.fov, k), k };
}
