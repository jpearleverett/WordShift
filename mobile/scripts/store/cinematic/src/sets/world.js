// The persistent exterior set: the dollhouse by the painted river, its twelve
// residents in their rooms, meadow and grass, sky backdrop with a day-to-dusk
// crossfade, pollen and fireflies, chimney smoke. Built once, posed per frame.

import * as THREE from 'three';
import { buildHouse } from '../world/house.js';
import { makeCharacter, poseCharacter } from '../world/sprites.js';
import { meadowFromPainting, makeGrass, makeParticles } from '../world/env.js';
import { makeSkyBackdrop, applyTod } from '../world/tod.js';
import { makeContactShadow } from '../world/fx.js';
import { mulberry32 } from '../core/math.js';

export const LAYOUT = [
  ['burrow', 'cozy_den', 'kitchen'],
  ['study', 'aquarium', 'office'],
  ['jungle', 'desert', 'garden'],
  ['bamboo', 'observatory', 'rainforest'],
];

/** Resident of each room, with a sprite height (world units) and a resting spot (fraction of room width). */
export const RESIDENTS = {
  burrow: { name: 'warren', h: 1.55, x: 0.28 },
  cozy_den: { name: 'ember', h: 1.75, x: 0.66 },
  kitchen: { name: 'panko', h: 1.5, x: 0.34 },
  study: { name: 'archimedes', h: 1.35, x: 0.6 },
  aquarium: { name: 'axel', h: 1.45, x: 0.5, float: true },
  office: { name: 'chill', h: 1.5, x: 0.3 },
  jungle: { name: 'sloane', h: 1.85, x: 0.7 },
  desert: { name: 'fennick', h: 1.6, x: 0.3, facing: -1 },
  garden: { name: 'thyme', h: 1.65, x: 0.35 },
  bamboo: { name: 'bamboo', h: 1.5, x: 0.45 },
  observatory: { name: 'vesper', h: 1.4, x: 0.62 },
  rainforest: { name: 'moss', h: 1.55, x: 0.5 },
};

export async function buildWorld({ layout = LAYOUT, roomW = 8, pxScale = 1 } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9dc0ea');
  scene.fog = new THREE.Fog('#b9d39a', 120, 260);

  const house = await buildHouse(layout, { roomW });
  scene.add(house.group);

  const sun = new THREE.DirectionalLight('#ffe2b0', 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  const half = house.width * 0.75 + 4;
  Object.assign(sc, { left: -half, right: half, top: house.height + 14, bottom: -6, near: 1, far: 200 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#a9c4ff', '#7fa85a', 1.05);
  scene.add(hemi);

  const sky = await makeSkyBackdrop({ width: 360, band: [0.34, 1.0], tilesX: 3 });
  sky.position.set(0, 62, -150);
  scene.add(sky);

  const mt = await meadowFromPainting('environment/sky_afternoon.webp');
  mt.repeat.set(36, 60);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(420, 330), new THREE.MeshStandardMaterial({ map: mt, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -1.2, 15); ground.receiveShadow = true;
  scene.add(ground);
  const contact = makeContactShadow(house.width + 3, house.roomD + 5, 0.45);
  contact.position.set(0, -1.18, 0.4); scene.add(contact);

  const W = house.width / 2 + 1.2;
  const grass = makeGrass({ count: 900, height: 0.9, area: { x0: -60, x1: 60, z0: -18, z1: 40, y: -1.2 }, avoid: (x, z) => Math.abs(x) < W && z < house.roomD / 2 + 2.2 && z > -house.roomD / 2 - 1.5, seed: 21 });
  scene.add(grass.group);

  // residents
  const residents = {};
  const rnd = mulberry32(99);
  for (const [room, r] of Object.entries(RESIDENTS)) {
    const rm = house.rooms[room];
    if (!rm) continue;
    const ch = await makeCharacter(r.name, { height: r.h, poses: ['idle', 'talk', 'walk'] });
    const x0 = -rm.roomW / 2 + rm.roomW * r.x;
    ch.position.set(x0, 0.02, -rm.roomD / 2 + 0.75);
    rm.group.add(ch);
    const sh = makeContactShadow(r.h * 0.75, 0.35, 0.35);
    sh.position.set(x0, 0.012, -rm.roomD / 2 + 0.75);
    rm.group.add(sh);
    residents[r.name] = { ch, room, rm, x0, shadow: sh, facing: r.facing ?? 1, float: !!r.float, seed: rnd() * 100 };
  }

  // particles: day pollen and dusk fireflies
  const pollen = makeParticles({ count: 260, boxMin: [-45, -1, -12], boxMax: [45, house.height + 8, 30], color: '#fff2c4', size: 3, intensity: 1.4, drift: [0.8, 0.5, 0.8], flow: [0.25, 0.05, 0], seed: 31 });
  const flies = makeParticles({ count: 170, boxMin: [-40, -0.8, -10], boxMax: [40, 12, 28], color: '#ffd76a', size: 5, intensity: 3.2, drift: [1.2, 0.7, 1.2], seed: 41 });
  scene.add(pollen.points, flies.points);
  for (const p of [pollen, flies]) p.uniforms.pxScale.value = pxScale;

  // chimney smoke: soft puffs rising from the chimney top
  const smokeTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const puffs = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, color: '#e8e2da', transparent: true, depthWrite: false }));
    scene.add(s); puffs.push({ s, ph: i / 14 });
  }

  const env = { sun, hemi, sky, house, scene, azimuth: -38, sunCenter: new THREE.Vector3(0, house.height / 2, 0), sunDist: 90 };

  return {
    scene, house, residents, sun, hemi, sky, grass, pollen, flies,
    /**
     * Pose the world at time t. opts: { dusk (0..1), wind, focus, aperture, camera,
     *   behaviours: { [name]: { pose, walkFrom, walkTo, walkStart, walkDur, facing } } }
     */
    pose(t, { dusk = 0, wind = 1, focus = 40, aperture = 0, camera = null, behaviours = {} } = {}) {
      const grade = applyTod(dusk, env);
      scene.background.set('#9dc0ea').lerp(new THREE.Color('#b18ab8'), dusk);
      grass.update(t, wind);
      for (const p of [pollen, flies]) { p.uniforms.time.value = t; p.uniforms.focus.value = focus; p.uniforms.aperture.value = aperture; }
      pollen.uniforms.opacity.value = 1 - dusk;
      flies.uniforms.opacity.value = Math.max(0, (dusk - 0.4) / 0.6);
      // residents: gentle idle life unless a behaviour overrides
      for (const [name, r] of Object.entries(residents)) {
        const b = behaviours[name];
        let x = r.x0, pose = 'idle', walkPhase = 0, facing = r.facing, bob = 0;
        if (b && b.walkStart !== undefined && t >= b.walkStart) {
          const u = Math.min(1, (t - b.walkStart) / b.walkDur);
          x = b.walkFrom + (b.walkTo - b.walkFrom) * u;
          if (u < 1) { pose = 'walk'; walkPhase = (t - b.walkStart) * 1.35; }
          facing = Math.sign(b.walkTo - b.walkFrom) || facing;
          if (u >= 1 && b.endFacing) facing = b.endFacing;
        }
        if (b && b.pose) pose = b.pose;
        if (b && b.facing && pose !== 'walk') facing = b.facing;
        if (r.float) bob = Math.sin(t * 1.4 + r.seed) * 0.08 + 0.15;
        poseCharacter(r.ch, { pose, walkPhase, facing });
        r.ch.position.x = x; r.ch.position.y = 0.02 + bob;
        r.shadow.position.x = x;
      }
      // smoke
      if (house.chimneyTop) {
        for (const p of puffs) {
          const u = (t * 0.12 + p.ph) % 1;
          p.s.position.set(house.chimneyTop.x + Math.sin(u * 5 + p.ph * 9) * 0.5 + u * 3 * wind, house.chimneyTop.y + u * 9, house.chimneyTop.z + u * 1.5);
          const sz = 0.8 + u * 3.5; p.s.scale.set(sz, sz, 1);
          p.s.material.opacity = Math.sin(Math.PI * u) * 0.5;
          p.s.material.color.set('#e8e2da').lerp(new THREE.Color('#c79aa0'), dusk);
        }
      }
      if (camera) sky.lookAt(camera.position.x, sky.position.y, camera.position.z);
      return grade;
    },
  };
}
