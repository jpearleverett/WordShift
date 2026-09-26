// The one persistent set: the dollhouse by the painted river, its twelve
// residents, the meadow, the sky painting (afternoon -> dusk), pollen and
// fireflies, chimney smoke. Built once; each shot poses it every frame.
//
// Shots add their own props with world.register(obj). Before a shot poses,
// world.begin() hides every registered prop and resets shared state, so a shot
// only has to show and pose what it uses.

import * as THREE from 'three';
import { buildHouse } from '../world/house.js';
import { makeCharacter, poseCharacter } from '../world/sprites.js';
import { meadowFromPainting, makeGrass, makeParticles } from '../world/env.js';
import { makeSkyBackdrop, applyTod } from '../world/tod.js';
import { makeContactShadow } from '../world/fx.js';
import { mulberry32 } from '../core/math.js';

/** Rooms in the game's unlock order, bottom to top, left to right (spec 3.1). */
export const LAYOUT = [
  ['cozy_den', 'kitchen', 'study'],
  ['aquarium', 'jungle', 'desert'],
  ['office', 'burrow', 'garden'],
  ['bamboo', 'observatory', 'rainforest'],
];

/** Resident of each room: sprite height (world units), resting spot (fraction of room width), facing. */
export const RESIDENTS = {
  cozy_den: { name: 'ember', h: 1.75, x: 0.62 },
  kitchen: { name: 'panko', h: 1.5, x: 0.34 },
  study: { name: 'archimedes', h: 1.35, x: 0.6 },
  aquarium: { name: 'axel', h: 1.45, x: 0.5, float: true },
  jungle: { name: 'sloane', h: 1.85, x: 0.72 },
  desert: { name: 'fennick', h: 1.6, x: 0.3, facing: -1 },
  office: { name: 'chill', h: 1.5, x: 0.3 },
  burrow: { name: 'warren', h: 1.55, x: 0.28 },
  garden: { name: 'thyme', h: 1.65, x: 0.35 },
  bamboo: { name: 'bamboo', h: 1.5, x: 0.45 },
  observatory: { name: 'vesper', h: 1.4, x: 0.62 },
  rainforest: { name: 'moss', h: 1.55, x: 0.5 },
};

export const GROUND_Y = -1.2;

export async function buildWorld({ pxScale = 1 } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#9dc0ea');
  scene.fog = new THREE.Fog('#bcd2a0', 120, 300);

  const house = await buildHouse(LAYOUT, { roomW: 8 });
  scene.add(house.group);

  const sun = new THREE.DirectionalLight('#ffd49a', 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const half = house.width * 0.9 + 6;
  Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 1, far: 240 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#9db8ff', '#7fa85a', 1.05);
  scene.add(hemi);

  const sky = await makeSkyBackdrop({ height: 190, band: [0.32, 1.0], margin: 1.0 });
  sky.position.set(0, 58, -170);
  scene.add(sky);

  const mt = await meadowFromPainting('environment/sky_afternoon.webp');
  mt.repeat.set(36, 60);
  // at dusk the meadow keeps a little of its own colour (the low sun alone leaves it near black)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(460, 360), new THREE.MeshStandardMaterial({ map: mt, roughness: 1, emissive: new THREE.Color('#000000') }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, GROUND_Y, 20); ground.receiveShadow = true;
  scene.add(ground);
  const contact = makeContactShadow(house.width + 3, house.roomD + 5, 0.45);
  contact.position.set(0, GROUND_Y + 0.02, 0.4); scene.add(contact);
  // at dusk the open-fronted rooms spill warm lamplight onto the grass in front of the house
  const spill = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 0, 4, 128, 0, 128);
    gr.addColorStop(0, 'rgba(255,190,110,1)'); gr.addColorStop(0.45, 'rgba(255,170,90,0.45)'); gr.addColorStop(1, 'rgba(255,150,80,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(house.width * 1.5, 16), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(0, GROUND_Y + 0.04, house.roomD / 2 + 8);
    m.renderOrder = 1;
    return m;
  })();
  scene.add(spill);

  const W = house.width / 2 + 1.2;
  const grass = makeGrass({ count: 4200, height: 0.62, area: { x0: -34, x1: 34, z0: 3, z1: 30, y: GROUND_Y }, avoid: (x, z) => Math.abs(x) < W && z < house.roomD / 2 + 1.4, seed: 21 });
  const grassFar = makeGrass({ count: 300, height: 0.9, area: { x0: -70, x1: 70, z0: -30, z1: 3, y: GROUND_Y }, avoid: (x, z) => Math.abs(x) < W + 2 && z > -house.roomD / 2 - 2, seed: 22 });
  scene.add(grass.group, grassFar.group);
  // the tufts keep a little of their own green at dusk, like the painted meadow behind them
  for (const m of [...grass.group.children, ...grassFar.group.children]) { m.material.emissiveMap = m.material.map; m.material.emissive = new THREE.Color('#000000'); m.material.needsUpdate = true; }

  // residents
  const residents = {};
  const rnd = mulberry32(99);
  for (const [room, r] of Object.entries(RESIDENTS)) {
    const rm = house.rooms[room];
    const ch = await makeCharacter(r.name, { height: r.h, poses: ['idle', 'talk', 'walk'] });
    const x0 = -rm.roomW / 2 + rm.roomW * r.x;
    const z0 = -rm.roomD / 2 + 0.75;
    ch.position.set(x0, 0.02, z0);
    rm.builtG.add(ch);
    const sh = makeContactShadow(r.h * 0.75, 0.35, 0.35);
    sh.position.set(x0, 0.012, z0);
    rm.builtG.add(sh);
    residents[r.name] = { ch, room, rm, x0, z0, shadow: sh, facing: r.facing ?? 1, float: !!r.float, seed: rnd() * 100, h: r.h };
  }

  // particles: day pollen and dusk fireflies
  const pollen = makeParticles({ count: 240, boxMin: [-40, -1, -8], boxMax: [40, house.height + 8, 34], color: '#fff2c4', size: 3, intensity: 1.3, drift: [0.8, 0.5, 0.8], flow: [0.25, 0.05, 0], seed: 31 });
  const flies = makeParticles({ count: 150, boxMin: [-36, -0.8, -6], boxMax: [36, 14, 30], color: '#ffd76a', size: 5, intensity: 3.0, drift: [1.2, 0.7, 1.2], seed: 41 });
  scene.add(pollen.points, flies.points);
  for (const p of [pollen, flies]) p.uniforms.pxScale.value = pxScale;

  // chimney smoke
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

  const extras = new Set();
  const tracked = [];
  const env = { sun, hemi, sky, house, scene, azimuth: -38, azimuthDusk: -70, sunCenter: new THREE.Vector3(0, house.height / 2, 0), sunDist: 110 };

  const world = {
    scene, house, residents, sun, hemi, sky, ground, spill, grass, grassFar, pollen, flies, env, puffs,
    /** Register a shot-owned prop: added to the scene, hidden unless its shot shows it. */
    register(obj, parent = scene) { parent.add(obj); extras.add(obj); obj.visible = false; return obj; },
    /** Snapshot a shared object's transform, visibility and opacity; begin() restores them. */
    track(obj) {
      tracked.push({ obj, p: obj.position.clone(), q: obj.quaternion.clone(), s: obj.scale.clone(), v: obj.visible, o: obj.material && obj.material.opacity });
      return obj;
    },
    /** Reset shared state before a shot poses. */
    begin() {
      for (const o of extras) o.visible = false;
      for (const r of tracked) {
        r.obj.position.copy(r.p); r.obj.quaternion.copy(r.q); r.obj.scale.copy(r.s); r.obj.visible = r.v;
        if (r.o !== undefined) r.obj.material.opacity = r.o;
      }
      for (const rm of Object.values(house.rooms)) if (rm.reveal) rm.reveal.value = 1;
      for (const id of Object.keys(house.rooms)) if (!house.rooms[id].empty) house.setBuilt(id, true);
      for (const r of Object.values(residents)) { r.ch.visible = true; r.shadow.visible = true; }
      sun.castShadow = true;
      grass.group.visible = true; grassFar.group.visible = true;
      pollen.points.visible = true; flies.points.visible = true;
    },
    /**
     * Pose the shared world. opts: { dusk (0..1), lamps (number | fn(roomId)), wind, focus, aperture, camera,
     *   behaviours: { [resident]: { pose, walkFrom, walkTo, walkStart, walkDur, facing, bob, scale } } }
     * Returns the time-of-day grade to merge into the look.
     */
    pose(t, { dusk = 0, lamps, wind = 1, focus = 40, aperture = 0, camera = null, behaviours = {} } = {}) {
      env.lamps = lamps; env.time = t;
      const grade = applyTod(dusk, env);
      scene.background.set('#9dc0ea').lerp(new THREE.Color('#b18ab8'), dusk);
      ground.material.emissive.set('#5e4e2a').multiplyScalar(0.5 * dusk);
      for (const m of [...grass.group.children, ...grassFar.group.children]) m.material.emissive.set('#b89a60').multiplyScalar(0.42 * dusk);
      const lampLevel = typeof lamps === 'function' ? 0.8 : (lamps ?? Math.max(0, (dusk - 0.35) / 0.65));
      spill.material.opacity = 0.2 * dusk * lampLevel;
      spill.visible = spill.material.opacity > 0.003;
      // dusk haze: the far meadow melts into the painted horizon instead of ending in a dark band
      scene.fog.near = 120 - 55 * dusk; scene.fog.far = 300 - 70 * dusk;
      if (grass.group.visible) grass.update(t, wind);
      if (grassFar.group.visible) grassFar.update(t, wind);
      for (const p of [pollen, flies]) { p.uniforms.time.value = t; p.uniforms.focus.value = focus; p.uniforms.aperture.value = aperture; }
      pollen.uniforms.opacity.value = 1 - dusk;
      flies.uniforms.opacity.value = Math.max(0, (dusk - 0.4) / 0.6);
      for (const [name, r] of Object.entries(residents)) {
        const b = behaviours[name] || {};
        let x = r.x0, pose = 'idle', walkPhase = 0, facing = r.facing, bob = 0;
        if (b.walkStart !== undefined && t >= b.walkStart) {
          const u = Math.min(1, (t - b.walkStart) / b.walkDur);
          x = b.walkFrom + (b.walkTo - b.walkFrom) * u;
          if (u < 1) { pose = 'walk'; walkPhase = (t - b.walkStart) * 1.35; }
          facing = Math.sign(b.walkTo - b.walkFrom) || facing;
          if (u >= 1 && b.endFacing) facing = b.endFacing;
        } else if (b.walkFrom !== undefined) x = b.walkFrom;
        if (b.pose) pose = b.pose;
        if (b.facing && pose !== 'walk') facing = b.facing;
        if (r.float) bob = Math.sin(t * 1.4 + r.seed) * 0.08 + 0.15;
        if (b.bob) bob += b.bob;
        poseCharacter(r.ch, { pose, walkPhase, facing });
        r.ch.position.x = x; r.ch.position.y = 0.02 + bob;
        r.ch.scale.setScalar(b.scale !== undefined ? b.scale : 1);
        r.shadow.position.x = x;
      }
      if (house.chimneyTop) {
        for (const p of puffs) {
          const u = (t * 0.12 + p.ph) % 1;
          p.s.position.set(house.chimneyTop.x + Math.sin(u * 5 + p.ph * 9) * 0.5 + u * 3 * wind, house.chimneyTop.y + u * 9, house.chimneyTop.z + u * 1.5);
          const sz = 0.8 + u * 3.5; p.s.scale.set(sz, sz, 1);
          p.s.material.opacity = Math.sin(Math.PI * u) * 0.5;
          p.s.material.color.set('#e8e2da').lerp(new THREE.Color('#e0a8b0'), dusk);
        }
      }
      if (camera) sky.lookAt(camera.position.x, sky.position.y, camera.position.z);
      return grade;
    },
  };
  return world;
}
