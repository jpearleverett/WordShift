// S04 "Over 4,000" (E.S04 11.58 to E.S05 15.11): three landings, hard cuts
// mid-flight, one board per room, each a two-tray mini-rack (source above,
// target below) standing on the room's front floor edge with its resident
// behind:
//   (1) aquarium  SNAP / MILE     -> NAP / SMILE      (4 letters)  Axel hops, a note
//   (2) desert    SPOON / SUPER   -> SOON / SUPPER    (5 letters)  Fennick's ears-up bob
//   (3) garden    GLOVES / LITTER -> LOVES / GLITTER  (6 letters)  Thyme hops twice, glitter
// Match cuts: every rig is solved so the landing slot sits on the same screen
// point, and each cell is framed the same way, so only the room and the word
// change across a cut. Each shot is a fast push along the ray to the slot
// (the slot never moves on screen). The last shot is the outgoing layer of the
// whip into S05 and pulls back and down hard during it.

import * as THREE from 'three';
import { buildMiniRack } from '../world/rack.js';
import { slotX } from '../world/wordrow.js';
import { makeBillboard, poseEmote } from '../world/fx.js';
import { makeParticles } from '../world/env.js';
import { setLocked, setTileGlow, TILE_SCALE, TILE_H, TILE_D } from '../core/tiles.js';
import { ease, seg, hash01 } from '../core/math.js';
import { mm, add, setAspect, look } from './common.js';

const RAD = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0);

/**
 * The three boards (spec 4). rx: rack x in the cell. The resident stands behind, placed
 * per aspect as [x, z, lift, facing]: wide beside the rack, tall behind it at the upper right.
 */
const BOARDS = [
  { room: 'aquarium', who: 'axel', words: ['SNAP', 'MILE'], letter: 0, slot: 0, rx: 0.2, wide: [-2.55, -0.35, 0, 1], tall: [1.55, -0.8, 0.7, -1] },
  { room: 'desert', who: 'fennick', words: ['SPOON', 'SUPER'], letter: 1, slot: 2, rx: -0.55, wide: [2.35, -0.45, 0, -1], tall: [0.5, -0.8, 0, -1] },
  { room: 'garden', who: 'thyme', words: ['GLOVES', 'LITTER'], letter: 0, slot: 0, rx: 0.71, wide: [-3.15, -0.4, 0, 1], tall: [1.6, -0.8, 0, -1] },
];
/** Rack depth in the cell: the tiles' faces sit just behind the floor's front edge (z = +1.6). */
const RACK_Z = 1.3;
/** 9:16 scales the trays down (spec 3.2) so the camera can sit closer and fewer floors show. */
const TALL_RACK_SCALE = 0.7;
/** Depth of field: the rack sharp, the painted wall a touch soft. */
const APERTURE = 26;
/** Target (lower) row centre above the floor, world units (buildMiniRack's row height). */
const ROW_Y = TILE_H * 1.0 * TILE_SCALE;

/**
 * Camera rigs. An anchor is pinned to `ndc` (x right, y up, -1..1) and the camera sits
 * `dist` away along the ray through it, so the push never moves it on screen. 16:9 pins
 * the landing slot (the match cut); 9:16 pins the centre of the target row (the trays
 * stacked at centre, spec 3.2), since a pinned slot cannot keep SUPPER and GLITTER both
 * inside the frame at a readable size.
 */
const RIG_WIDE = { yaw: 8, pitch: 1.5, fov: mm(65), ndc: [-0.17, -0.3], dist: 10.4, push: 0.6, anchor: 'slot' };
const RIG_TALL = { yaw: 5, pitch: -18, fov: 40, ndc: [-0.06, -0.1], dist: 8.2, push: 0.45, anchor: 'row' };

function basis(yawDeg, pitchDeg) {
  const y = yawDeg * RAD, p = pitchDeg * RAD;
  const f = new THREE.Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), -Math.cos(y) * Math.cos(p));
  const r = new THREE.Vector3().crossVectors(f, UP).normalize();
  const u = new THREE.Vector3().crossVectors(r, f).normalize();
  return { f, r, u };
}

/** Camera position and look target so `point` lands on ndc at distance d; returns depth for DOF too. */
function solve(point, { yaw, pitch, fov, ndc }, d, aspect) {
  const { f, r, u } = basis(yaw, pitch);
  const ty = Math.tan(fov * RAD / 2), tx = ty * aspect;
  const ray = f.clone().addScaledVector(r, ndc[0] * tx).addScaledVector(u, ndc[1] * ty).normalize();
  const pos = [point[0] - ray.x * d, point[1] - ray.y * d, point[2] - ray.z * d];
  return { pos, f, depth: d * ray.dot(f) };
}

export default async function make(ctx) {
  const { world, camera, E, portrait } = ctx;
  const { house } = world;
  const aspect = portrait ? 9 / 16 : 16 / 9;
  const RIG = portrait ? RIG_TALL : RIG_WIDE;
  const RS = portrait ? TALL_RACK_SCALE : 1;
  const rowY = ROW_Y * RS, unit = TILE_SCALE * RS;

  const boards = [];
  for (let i = 0; i < BOARDS.length; i++) {
    const b = BOARDS[i];
    const rm = house.rooms[b.room];
    const land = E.M_LANDS[i];
    const cut = E.M_CUTS[i];
    const n = b.words[1].length + 1;
    // cut mid-flight: the lift is before the cut, the gap is already open, both words
    // settle on the landing (the game's "both words stay real" moment)
    const rack = buildMiniRack({
      words: b.words,
      slots: n + (portrait ? 0.05 : 0.35),
      moves: [{ from: 0, letter: b.letter, to: 1, slot: b.slot, lift: land - 0.62, open: land - 0.6, land, closeAt: land, liftH: 0.6, arc: 0.3, zArc: 1.2 }],
    });
    rack.group.position.set(b.rx, 0, RACK_Z);
    rack.group.scale.setScalar(RS);
    world.register(rack.group, rm.group);
    const tiles = rack.set.tiles;
    const moved = tiles.get(`0:${b.letter}`).obj;
    const rowTiles = (ri) => [...tiles.values()].filter((x) => x.obj.parent === rack.rows[ri].group).map((x) => x.obj);
    // the landing slot in world space (cell origin + rack + slot)
    const slotLocal = [b.rx + slotX(b.slot, n) * unit, rowY, RACK_Z + TILE_D / 2 * unit];
    const slotW = [rm.x + slotLocal[0], rm.y + slotLocal[1], slotLocal[2]];
    const anchorW = RIG.anchor === 'slot' ? slotW : [rm.x + b.rx, slotW[1], slotW[2]];
    const [px, pz, lift, facing] = portrait ? b.tall : b.wide;
    const r = world.residents[b.who];
    world.track(r.ch); world.track(r.shadow);
    const sparks = [];
    for (let k = 0; k < 6; k++) sparks.push(world.register(await makeBillboard('ui/emote_sparkle.png', 0.2 * RS), rm.group));
    boards.push({ ...b, i, rm, rack, tiles, moved, rowTiles, n, land, cut, end: i < 2 ? E.M_CUTS[i + 1] : E.S05, slotLocal, slotW, anchorW, px, pz, lift, facing, r, sparks });
  }

  // --- per-room life
  const [AQ, DS, GD] = boards;
  // Axel's note
  const note = world.register(await makeBillboard('ui/emote_note.png', 0.42), AQ.rm.group);
  // aquarium: rising bubbles and floor caustics
  const bubbleTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(210,245,255,0.95)';
    for (const [x, y] of [[5, 1], [6, 1], [7, 1], [8, 1], [9, 1], [10, 1], [3, 2], [4, 2], [11, 2], [12, 2], [2, 3], [13, 3], [1, 4], [14, 4], [1, 5], [14, 5], [1, 6], [14, 6], [1, 7], [14, 7], [1, 8], [14, 8], [1, 9], [14, 9], [1, 10], [14, 10], [2, 11], [13, 11], [2, 12], [13, 12], [3, 13], [4, 13], [11, 13], [12, 13], [5, 14], [6, 14], [7, 14], [8, 14], [9, 14], [10, 14]]) g.fillRect(x, y, 1, 1);
    g.fillStyle = 'rgba(255,255,255,1)'; g.fillRect(4, 4, 2, 2); g.fillRect(6, 3, 1, 1);
    g.fillStyle = 'rgba(190,235,255,0.18)'; g.beginPath(); g.arc(8, 8, 6, 0, Math.PI * 2); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter;
    return t;
  })();
  const bubbles = [];
  for (let k = 0; k < 18; k++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTex, transparent: true, depthWrite: false, color: new THREE.Color(1.15, 1.2, 1.25) }));
    s.userData = { x: -3.6 + hash01(k * 17 + 3) * 7.2, z: -1.1 + hash01(k * 29 + 5) * 1.9, sp: 0.35 + hash01(k * 13 + 7) * 0.35, ph: hash01(k * 7 + 11), sz: 0.07 + hash01(k * 3 + 1) * 0.08 };
    bubbles.push(world.register(s, AQ.rm.group));
  }
  const caustics = world.register(new THREE.Mesh(new THREE.PlaneGeometry(AQ.rm.roomW, AQ.rm.roomD), new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform float time; varying vec2 vUv;
      float cell(vec2 p){ vec2 q = p; for (int i = 0; i < 3; i++) { q += vec2(sin(q.y * 1.7 + time * 0.9 + float(i)), cos(q.x * 1.5 - time * 0.7 + float(i) * 1.3)) * 0.45; } return abs(sin(q.x) * sin(q.y)); }
      void main(){
        vec2 p = vUv * vec2(9.0, 3.6);
        float c = pow(1.0 - cell(p), 7.0) + pow(1.0 - cell(p * 1.3 + 4.1), 9.0) * 0.6;
        float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x) * smoothstep(0.0, 0.25, vUv.y);
        gl_FragColor = vec4(vec3(0.55, 0.9, 1.0) * c * 0.32 * edge, 1.0);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })), AQ.rm.group);
  caustics.rotation.x = -Math.PI / 2; caustics.position.set(0, 0.012, 0);
  // desert: sand motes drifting through the camp
  const motes = makeParticles({ count: 110, boxMin: [-4, 0.1, -1.5], boxMax: [4, 3.6, 3.2], color: '#ffdca0', size: 4.5, intensity: 1.5, drift: [0.35, 0.18, 0.25], flow: [0.5, -0.04, 0], seed: 77 });
  motes.uniforms.pxScale.value = ctx.pxScale;
  world.register(motes.points, DS.rm.group);
  // garden: glitter shed by the GLITTER tiles
  const glitter = [];
  const glitterCols = ['#fff3c0', '#ffd0ea', '#cdf2ff', '#ffe98a'];
  for (let k = 0; k < 30; k++) {
    const s = await makeBillboard('ui/emote_sparkle.png', 0.13 + hash01(k * 5 + 2) * 0.13, { additive: true });
    s.material.color.set(glitterCols[k % glitterCols.length]).multiplyScalar(1.4);
    glitter.push(world.register(s, GD.rm.group));
  }

  // tile key: a warm spot from the front-left that makes the clearcoat sing
  const key = world.register(new THREE.SpotLight('#ffe2b8', 0, 16, 0.42, 0.7, 1.2));
  world.register(key.target);

  function poseBoard(b, t) {
    b.rack.group.visible = true;
    b.rack.set.pose(t);
    setLocked(b.moved, ease.outCubic(seg(t, b.land, b.land + 0.3)));
    for (const x of b.tiles.values()) setTileGlow(x.obj, 0);
    // both words flash as they become real, the moved letter carries a warm rim for 0.4 s
    const flash = (t0, ri, amp) => { const k = seg(t, t0, t0 + 0.22); if (k > 0 && k < 1) for (const o of b.rowTiles(ri)) setTileGlow(o, Math.sin(Math.PI * k) * amp); };
    flash(b.land, 1, 0.85);
    flash(b.land + 0.05, 0, 0.5);
    const rim = seg(t, b.land, b.land + 0.4);
    if (rim > 0 && rim < 1) setTileGlow(b.moved, Math.max(b.moved.userData.bodyMat.emissiveIntensity / 0.6, 0.42 * (1 - rim)));
    // six sparkle pops around the landing
    // a ring of sparkle pops around the landed letter
    b.sparks.forEach((s, k) => {
      const a = (k / b.sparks.length) * Math.PI * 2 + 0.5;
      const p = add(b.slotLocal, [Math.cos(a) * 0.36 * RS, (Math.sin(a) * 0.36 - 0.06) * RS, 0.1 * RS]);
      s.position.set(p[0], p[1], p[2]); s.userData.y0 = p[1];
      poseEmote(s, t - (b.land + k * 0.02), { hold: 0.14, rise: 0.1 * RS, fade: 0.16 });
    });
  }

  function poseResident(b, t, beh) {
    const s = t - b.land;
    let bob = 0, sy = 1;
    if (b.who === 'axel') {
      // a happy hop on the landing, a note floats up
      const u = seg(s, 0.04, 0.46);
      bob = u > 0 && u < 1 ? Math.sin(Math.PI * u) * 0.34 : 0;
      sy = 1 + 0.07 * Math.sin(Math.PI * seg(s, 0.0, 0.14)) - 0.06 * Math.sin(Math.PI * seg(s, 0.44, 0.58));
    } else if (b.who === 'fennick') {
      // ears up: a quick upward stretch and a little bob that settles
      sy = 1 + (s > 0 ? 0.09 * Math.exp(-s * 2.2) * (1 - Math.exp(-s * 30)) : 0);
      bob = s > 0 ? Math.abs(Math.sin(s * 7.5)) * 0.1 * Math.exp(-s * 2.6) : 0;
    } else {
      // Thyme: two happy hops
      const hop = (a, h) => { const u = seg(s, a, a + 0.3); return u > 0 && u < 1 ? Math.sin(Math.PI * u) * h : 0; };
      bob = hop(0.02, 0.36) + hop(0.36, 0.28);
      const land = (a) => Math.sin(Math.PI * seg(s, a, a + 0.1));
      sy = 1 - 0.07 * (land(0.32) + land(0.66));
    }
    beh[b.who] = { walkFrom: b.px, facing: b.facing, bob: bob + b.lift, pose: 'idle' };
    return sy;
  }

  function afterPose(b, t, sy) {
    const r = b.r;
    r.ch.position.z = b.pz; r.shadow.position.z = b.pz;
    r.ch.scale.set(r.ch.scale.x, sy, r.ch.scale.z);
    const s = t - b.land;
    if (b.who === 'axel') {
      const head = [b.px + 0.45, r.h * 0.72 + r.ch.position.y, b.pz + 0.1];
      note.position.set(...head); note.userData.y0 = head[1];
      poseEmote(note, s - 0.1, { hold: 0.6, rise: 0.3, fade: 0.25 });
    }
  }

  function poseLife(b, t) {
    if (b.i === 0) {
      caustics.visible = true; caustics.material.uniforms.time.value = t;
      const H = AQ.rm.roomH * 0.95;
      bubbles.forEach((s) => {
        const d = s.userData;
        const u = (t * d.sp / H * 3 + d.ph) % 1;
        s.visible = true;
        s.position.set(d.x + Math.sin(t * 3 + d.ph * 20) * 0.06, 0.15 + u * H, d.z);
        const sc = d.sz * (0.8 + 0.4 * u);
        s.scale.set(sc, sc, 1);
        s.material.opacity = Math.min(1, u * 8, (1 - u) * 6) * 0.85;
      });
    } else if (b.i === 1) {
      motes.points.visible = true;
      motes.uniforms.time.value = t;
    } else {
      // glitter: specks lift off GLITTER after the landing, twinkle and drift down
      glitter.forEach((s, k) => {
        const t0 = b.land + 0.02 + hash01(k * 31 + 7) * 0.8;
        const u = (t - t0) / 1.0;
        if (u < 0 || u > 1) { s.visible = false; return; }
        s.visible = true;
        const tileI = (k * 3) % 7;
        const x0 = b.rx + slotX(tileI, 7) * unit + (hash01(k * 11 + 3) - 0.5) * 0.35 * RS;
        const vx = (hash01(k * 23 + 9) - 0.5) * 0.5;
        const p = [x0 + vx * u * RS, rowY + (0.12 + 0.4 * Math.sin(Math.PI * Math.min(1, u * 1.6)) - u * 0.5) * RS, RACK_Z + (0.16 + hash01(k * 13) * 0.3) * RS];
        s.position.set(p[0], p[1], p[2]);
        const tw = 0.55 + 0.45 * Math.abs(Math.sin((t - t0) * (9 + k % 5) + k));
        const base = s.userData.base;
        s.scale.set(base * tw, base * tw, 1);
        s.material.opacity = Math.min(1, u * 10) * (1 - ease.inQuad(u));
      });
    }
  }

  function rigAt(b, t) {
    // a fast push decelerating into the landing, then a slow creep through the hold
    const k = ease.outCubic(seg(t, b.cut, b.land + 0.35));
    const creep = 0.12 * seg(t, b.land + 0.35, b.end);
    let d = RIG.dist - RIG.push * k - creep;
    let { pos, f, depth } = solve(b.anchorW, RIG, d, aspect);
    let target = add(pos, [f.x, f.y, f.z]);
    let fov = RIG.fov;
    if (t >= E.WHIP) {
      // the whip into S05: pull back and down, accelerating into the smear
      const w = ease.inQuad(seg(t, E.WHIP, E.S05));
      if (!portrait) {
        const back = basis(RIG.yaw, RIG.pitch).f;
        pos = add(pos, [-back.x * 7 * w, -3.6 * w, -back.z * 7 * w]);
        const tilt = -14 * w * RAD;
        target = add(pos, [f.x, f.y * Math.cos(tilt) + Math.sin(tilt), f.z]);
        depth += 7 * w;
      } else {
        // 9:16: a fast downward tilt
        const g = basis(RIG.yaw, RIG.pitch - 38 * w).f;
        pos = add(pos, [0, -1.2 * w, 2.5 * w]);
        target = add(pos, [g.x, g.y, g.z]);
        fov = RIG.fov + 6 * w;
      }
    }
    return { pos, target, fov, depth };
  }

  return {
    id: 'S04',
    start: E.S04,
    end: E.S05,
    mb: (t) => (t >= E.WHIP ? 3 : 1),
    pose(t) {
      setAspect(camera, portrait);
      const i = t < E.M_CUTS[1] ? 0 : t < E.M_CUTS[2] ? 1 : 2;
      const b = boards[i];
      const cam = rigAt(b, t);
      camera.fov = cam.fov; camera.updateProjectionMatrix();
      camera.position.set(...cam.pos); camera.up.set(0, 1, 0); camera.lookAt(...cam.target);
      poseBoard(b, t);
      const beh = {};
      const sy = poseResident(b, t, beh);
      world.pollen.points.visible = false;
      const whip = t >= E.WHIP;
      world.grass.group.visible = whip; world.grassFar.group.visible = whip;
      const grade = world.pose(t, { dusk: 0, lamps: (id) => (id === b.room ? 0.35 : 0), focus: cam.depth, aperture: APERTURE, camera, behaviours: beh });
      afterPose(b, t, sy);
      poseLife(b, t);
      motes.uniforms.focus.value = cam.depth; motes.uniforms.aperture.value = APERTURE;
      // warm key on the rack from the front-left (the sun's side)
      key.visible = true; key.target.visible = true;
      const kp = add(b.slotW, [-2.6, 2.6, 3.2]);
      key.position.set(...kp); key.target.position.set(b.slotW[0] + 1.0, b.slotW[1] + 0.1, b.slotW[2] - 0.2);
      key.intensity = 14;
      world.sun.castShadow = true;
      const maxBlur = whip ? 10 : 7;
      return { scene: world.scene, camera, look: look(grade, 0, { exposure: grade.exposure * 1.1, msaa: !whip, dof: { focus: cam.depth, aperture: APERTURE, maxBlur } }) };
    },
  };
}
