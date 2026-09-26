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

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (a) => Math.hypot(a[0], a[1], a[2]);

/**
 * How far the image moves across one 1/60 s shutter, in pixels of the frame's height,
 * for a camera rig `rig(t) -> { pos, target, fov, focus? }`: rotation, lateral and
 * dolly travel (relative to the focus distance) and zoom. frameH is the output height
 * (1080 in 16:9, 1920 in 9:16), since vfov spans it.
 */
export function travelPx(rig, t, frameH = 1080) {
  const a = rig(t - 1 / 120), b = rig(t + 1 / 120);
  const pxPerRad = frameH / THREE.MathUtils.degToRad(b.fov);
  const fa = sub(a.target, a.pos), fb = sub(b.target, b.pos);
  const la = len(fa), lb = len(fb);
  const ang = Math.acos(clamp(dot(fa, fb) / (la * lb || 1), -1, 1));
  const dp = sub(b.pos, a.pos);
  const along = dot(dp, fb) / (lb || 1);
  const lat = Math.sqrt(Math.max(0, dot(dp, dp) - along * along));
  const d = clamp(b.focus ?? lb, 4, 60);
  return ang * pxPerRad + (lat / d) * pxPerRad + (Math.abs(along) / d) * frameH * 0.9 + (Math.abs(a.fov - b.fov) / b.fov) * frameH * 0.9;
}

/**
 * Motion blur for an image travelling `px` per frame: enough subframes (and a short
 * enough shutter) that neighbouring copies sit at most ~2.5 px apart, so hard-edged
 * pixel art smears instead of showing stepped ghosts. Returns { n, shutter }.
 * maxN caps the subframes; minShutterFrac keeps the shutter at least that fraction of
 * 1/60 s (a fast pull-back wants a long smear more than it wants invisible steps).
 */
export function blurFor(px, { maxN = 12, minShutterFrac = 0 } = {}) {
  if (!(px >= 2)) return { n: 1, shutter: 1 / 60 };
  const n = Math.min(maxN, Math.ceil(px / 2) + 1);
  return { n, shutter: (1 / 60) * Math.max(minShutterFrac, Math.min(1, (2.5 * (n - 1)) / px)) };
}

/** Smoothly blend between two camera setups over [a, b] with an easing fn. */
export function blendRig(t, a, b, ra, rb, e) {
  const k = e(clamp((t - a) / (b - a)));
  return { pos: mix3(ra.pos, rb.pos, k), target: mix3(ra.target, rb.target, k), fov: lerp(ra.fov, rb.fov, k), k };
}
