// The macro set for the opening move: three word rows (PLAY / PANT / HEAR)
// on parchment trays or hung on twine, product-shot lighting (warm softbox key,
// cool rim, warm bounce), the lit Cozy Den far behind as fire and lamp bokeh,
// and drifting dust in the light.

import * as THREE from 'three';
import { buildHouse, pixelWood } from '../world/house.js';
import { makeCharacter } from '../world/sprites.js';
import { makeTray, makeTwine, PITCH } from '../world/wordrow.js';
import { buildMoveSet } from '../world/moves.js';
import { makeFire } from '../world/fire.js';
import { makeParticles } from '../world/env.js';

export async function buildMacro({ words = ['PLAY', 'PANT', 'HEAR'], moves, holder = 'tray', rowGap = 2.2, pxScale = 1 } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#2b1b13');

  const key = new THREE.DirectionalLight('#ffdcae', 3.1);
  key.position.set(-7, 9, 7); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
  key.shadow.bias = -0.0002; key.shadow.normalBias = 0.03;
  const rim = new THREE.DirectionalLight('#a9c8ff', 2.0); rim.position.set(6, 5, -7);
  const bounce = new THREE.HemisphereLight('#ffe9cc', '#6b4630', 0.55);
  scene.add(key, key.target, rim, bounce);

  // the den behind: far and soft
  const house = await buildHouse([['burrow', 'cozy_den', 'kitchen']], { roof: false, foundation: false });
  house.group.position.set(-house.rooms.cozy_den.x, -3.2, -16);
  house.setLight({ paint: 1.05, lamps: 1.1 });
  scene.add(house.group);
  const den = house.rooms.cozy_den;
  const fire = makeFire({ px: 0.05, width: 0.62, height: 0.62, count: 90, sparks: 30, lightRange: 10 });
  fire.group.position.set(-0.28 * den.roomW, 0.335 * den.roomH, -den.roomD / 2 + 0.06);
  den.group.add(fire.group);
  const ember = await makeCharacter('ember', { height: 1.75 });
  ember.position.set(1.6, 0.02, -den.roomD / 2 + 0.75); den.group.add(ember);

  // surface
  const woodTex = pixelWood({ base: '#6d4a33', planks: 5, seed: 77 }); woodTex.repeat.set(10, 10);
  const table = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.55 }));
  table.rotation.x = -Math.PI / 2; table.position.y = -3.4; table.receiveShadow = true;
  scene.add(table);

  // rows
  const rows = words.map((w, i) => {
    const g = new THREE.Group();
    g.position.set(0, (words.length - 1) / 2 * rowGap - i * rowGap, 0);
    if (holder === 'tray') g.add(makeTray(6));
    scene.add(g);
    return { word: w, group: g };
  });
  if (holder === 'twine') {
    for (const r of rows) {
      const half = 3.4 * PITCH;
      const tw = makeTwine([-half, 0.9, -0.05], [half, 0.9, -0.05], { sag: 0.18 });
      r.group.add(tw.mesh);
    }
  }
  const set = buildMoveSet(rows, moves || []);

  const dust = makeParticles({ count: 120, boxMin: [-9, -3, -8], boxMax: [9, 5, 4], color: '#ffe6bd', size: 2.4, intensity: 1.5, drift: [0.25, 0.2, 0.25], flow: [0.05, 0.02, 0], seed: 8 });
  dust.uniforms.pxScale.value = pxScale;
  scene.add(dust.points);

  return {
    scene, rows, set, fire, dust, key, rim, house,
    pose(t, { focus = 10, aperture = 60 } = {}) {
      fire.pose(t, { intensity: 1.1 });
      dust.uniforms.time.value = t; dust.uniforms.focus.value = focus; dust.uniforms.aperture.value = aperture;
      return set.pose(t);
    },
  };
}
