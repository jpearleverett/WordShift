// Temporary look-development scene (the opening move); replaced by the real timeline.
import * as THREE from 'three';
import { makeTray } from './world/wordrow.js';
import { buildMoveSet } from './world/moves.js';

export async function buildTrailer({ width, height }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#3a2418');
  const camera = new THREE.PerspectiveCamera(24, width / height, 0.1, 200);
  const key = new THREE.DirectionalLight('#ffe2bc', 3.0); key.position.set(-6, 9, 8); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 }); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.03;
  scene.add(key, key.target);
  scene.add(new THREE.HemisphereLight('#ffe6c4', '#5a3a26', 0.8));
  const rows = [];
  const words = ['PLAY', 'PANT', 'HEAR'];
  words.forEach((w, i) => {
    const g = new THREE.Group(); g.position.set(0, 2.2 - i * 2.2, 0);
    const tray = makeTray(6); g.add(tray);
    scene.add(g); rows.push({ word: w, group: g });
  });
  const set = buildMoveSet(rows, [
    { from: 0, letter: 1, to: 1, slot: 1, lift: 0.3, open: 0.8, land: 1.4 },
    { from: 1, letter: 4, to: 2, slot: 4, lift: 2.0, open: 2.5, land: 3.1 },
  ]);
  return {
    duration: 4, fps: 30,
    update(t) {
      set.pose(t);
      camera.position.set(0, 0.5, 16); camera.lookAt(0, 0, 0);
      return { scene, camera, look: { toneMap: 'aces', bloom: { strength: 0.3 }, vignette: 0.3 } };
    },
  };
}
