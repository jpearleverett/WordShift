// Temporary look-development scene (macro opening); replaced by the real timeline.
import { buildMacro } from './sets/macro.js';
import { poseCamera } from './core/camera.js';
import * as THREE from 'three';

export async function buildTrailer({ pxScale, aspect }) {
  const holder = new URLSearchParams(location.search).get('holder') || 'tray';
  const m = await buildMacro({ holder, pxScale, moves: [
    { from: 0, letter: 1, to: 1, slot: 1, lift: 0.2, open: 1.0, land: 1.6 },
  ] });
  const camera = new THREE.PerspectiveCamera(20, 16 / 9, 0.05, 300);
  return {
    duration: 3, fps: 30,
    update(t) {
      const act = m.pose(t, {});
      const L = [...m.set.tiles.values()].find((x) => x.id === '0:1').obj;
      const p = new THREE.Vector3(); L.getWorldPosition(p);
      const cam = poseCamera(camera, { pos: [[p.x + 3.4, p.y + 0.9, p.z + 11]], target: [[p.x + 0.3, p.y - 0.4, p.z]], fov: 20, keep916: 0.5 }, 0, { aspect, time: t });
      m.pose(t, { focus: cam.focus, aperture: 70 });
      void act;
      return { scene: m.scene, camera, look: { toneMap: 'aces', dof: { focus: cam.focus, aperture: 70, maxBlur: 20 }, bloom: { strength: 0.55, threshold: 0.72, radius: 0.7 }, vignette: 0.34, grain: 0.022, saturation: 1.05, gain: [1.03, 1.0, 0.96] } };
    },
  };
}
