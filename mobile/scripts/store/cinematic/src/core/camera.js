// Camera rigs. A shot describes its camera once, for 16:9, as keyframed
// position / target / vertical FOV (degrees) plus optional roll and handheld
// drift. The 9:16 cut reuses the same path and derives its FOV from the
// horizontal coverage the shot wants to keep (`keep`, 0..1 of the 16:9 width),
// optionally with its own overrides.

import * as THREE from 'three';
import { catmull, clamp, ease, fbm1 } from './math.js';

const up = new THREE.Vector3(0, 1, 0);

/** Horizontal FOV (deg) of a 16:9 frame with vertical FOV v (deg). */
export function hfov(v, aspect = 16 / 9) { return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(v) / 2) * aspect)); }
/** Vertical FOV (deg) for a frame of `aspect` whose horizontal FOV is h (deg). */
export function vfovForH(h, aspect) { return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(h) / 2) / aspect)); }

/**
 * rig: { pos: [[x,y,z]...], target: [[x,y,z]...], fov: number | [f0, f1, ...], roll?: [..deg],
 *        ease?: fn, shake?: amplitude, keep916?: 0..1, pos916?, target916?, fov916? }
 * u: 0..1 progress through the shot.
 */
export function poseCamera(camera, rig, u, { aspect, time = 0 } = {}) {
  const e = (rig.ease || ease.inOutSine)(clamp(u));
  const portrait = aspect === '9x16';
  const P = (portrait && rig.pos916) || rig.pos;
  const T = (portrait && rig.target916) || rig.target;
  const p = P.length === 1 ? P[0] : catmull(P, e);
  const tg = T.length === 1 ? T[0] : catmull(T, e);
  let fov = Array.isArray(rig.fov) ? catmull(rig.fov, e) : rig.fov;
  if (portrait) {
    if (rig.fov916 !== undefined) fov = Array.isArray(rig.fov916) ? catmull(rig.fov916, e) : rig.fov916;
    else fov = vfovForH(hfov(fov) * (rig.keep916 ?? 0.62), 9 / 16);
  }
  camera.fov = fov;
  camera.aspect = portrait ? 9 / 16 : 16 / 9;
  camera.updateProjectionMatrix();
  camera.position.set(p[0], p[1], p[2]);
  if (rig.shake) {
    const s = rig.shake;
    camera.position.x += fbm1(time * 0.7, 11) * s;
    camera.position.y += fbm1(time * 0.6, 23) * s * 0.7;
  }
  camera.up.copy(up);
  camera.lookAt(tg[0], tg[1], tg[2]);
  const roll = rig.roll ? (rig.roll.length === 1 ? rig.roll[0] : catmull(rig.roll, e)) : 0;
  if (roll) camera.rotateZ(THREE.MathUtils.degToRad(roll));
  return { pos: p, target: tg, focus: Math.hypot(p[0] - tg[0], p[1] - tg[1], p[2] - tg[2]) };
}
