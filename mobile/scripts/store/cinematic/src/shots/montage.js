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
import { slotX, PITCH } from '../world/wordrow.js';
import { makeBillboard, poseEmote } from '../world/fx.js';
import { makeParticles } from '../world/env.js';
import { setLocked, setTileGlow, TILE_SCALE, TILE_H, TILE_D } from '../core/tiles.js';
import { ease, seg, clamp, hash01 } from '../core/math.js';
import { mm, add, setAspect, look, travelPx, blurFor } from './common.js';

const RAD = Math.PI / 180;
const UP = new THREE.Vector3(0, 1, 0);

/**
 * The three boards (spec 4). rx: rack x in the cell. The resident stands behind, placed
 * per aspect as [x, z, lift, facing]: wide beside the rack, tall behind it at the upper right.
 */
const BOARDS = [
  { room: 'aquarium', who: 'axel', words: ['SNAP', 'MILE'], letter: 0, slot: 0, rx: 0.2, wide: [-2.55, -0.35, 0, 1], tall: [1.55, -0.8, 0.45, -1] },
  { room: 'desert', who: 'fennick', words: ['SPOON', 'SUPER'], letter: 1, slot: 2, rx: -0.55, wide: [2.35, -0.45, 0, -1], tall: [0.2, -0.8, 0.6, -1] },
  { room: 'garden', who: 'thyme', words: ['GLOVES', 'LITTER'], letter: 0, slot: 0, rx: 0.71, wide: [-3.15, -0.4, 0, 1], tall: [1.7, -0.8, 0.6, -1] },
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
 * The letter is lifted just before each cut, so a shot's first frame reads the source
 * word with its letter raised (SNAP, SPOON, GLOVES); the flight starts on the cut.
 */
const LIFT_BEFORE_CUT = 0.062;
/**
 * The picture's impact leads the chime by half a frame: the landings fall just after a
 * frame boundary, and without the lead that frame shows the tile seated but not yet
 * squashed while the chime plays.
 */
const IMPACT_LEAD = 0.5 / 30;
/**
 * The tile-hero grade (spec 7.2 gate 5: faces within dE2000 6 of the FG-B swatches).
 * Exposure alone cannot get there under AgX: its desaturation holds the lavender and the
 * locked powder 9-14 away at any exposure, even under neutral light. ACES keeps the
 * game's candy hues, and a slightly cool camera white balance offsets the warm sun and
 * day gain on the cool tiles, so the faces measure dE 1-7 (most under 6) and the
 * parchment about 5-6. Relative to the day look: exposure is a multiplier on it.
 */
const TILE_GRADE = { toneMap: 'aces', exposure: 0.88, whiteBalance: [0.94, 1, 1.13] };
/** Flight shape of the moved letter (tile units): lift height, arc, bow toward the lens, tumble. */
const FLY = { liftH: 0.6, arc: 0.3, zArc: 1.2, tumble: 0.25 };

/**
 * Camera rigs. An anchor is pinned to `ndc` (x right, y up, -1..1) and the camera sits
 * `dist` away along the ray through it, so the push never moves it on screen. 16:9 pins
 * the landing slot (the match cut); 9:16 pins the centre of the target row, since a
 * pinned slot cannot keep SUPPER and GLITTER both inside the frame at a readable size.
 * The tall frame spans almost two floors, so 9:16 sits the trays low (target row at
 * 68%, inside the 1440 px safe line) on a longer lens from a gentler height: the room
 * below (Ember, Archimedes and Fennick facing the lens) stays under the frame. Each
 * resident stands behind the right part of the rack (inside its width, so the feet stay
 * hidden behind the lower tray), lifted by the tall `lift` so the head and shoulders clear
 * the upper tray's rail (about y 1030) by well over 40 px at the lowest bob or hop landing:
 * a head that only just clears the rail reads as peering over it, eyes to the lens. The
 * heads stay inside x 96-918 (ear tips included) and below the caption band.
 */
const RIG_WIDE = { yaw: 8, pitch: 1.5, fov: mm(65), ndc: [-0.17, -0.3], dist: 10.4, push: 0.6, anchor: 'slot' };
const RIG_TALL = { yaw: 5, pitch: -7, fov: 28, ndc: [-0.06, -0.37], dist: 12.5, push: 0.9, anchor: 'row' };

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
    const land = E.M_LANDS[i] - IMPACT_LEAD;
    const cut = E.M_CUTS[i];
    const n = b.words[1].length + 1;
    // cut mid-flight: the lift is just before the cut, the gap is already open, both
    // words settle on the landing (the game's "both words stay real" moment)
    const rack = buildMiniRack({
      words: b.words,
      slots: n + (portrait ? 0.05 : 0.35),
      moves: [{ from: 0, letter: b.letter, to: 1, slot: b.slot, lift: cut - LIFT_BEFORE_CUT, open: E.M_LANDS[i] - 0.6, land, closeAt: land, liftH: FLY.liftH, arc: FLY.arc, zArc: FLY.zArc }],
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
    // the flight in the rows' shared (tile-unit) space, from the top of the lift to the slot
    const [src, dst] = rack.rows.map((r) => r.group.position);
    const A = [slotX(b.letter, b.words[0].length) + src.x, src.y + FLY.liftH, src.z + 0.45];
    const B = [slotX(b.slot, n) + dst.x, dst.y, dst.z];
    const [px, pz, lift, facing] = portrait ? b.tall : b.wide;
    const r = world.residents[b.who];
    world.track(r.ch); world.track(r.shadow);
    const sparks = [];
    for (let k = 0; k < 6; k++) sparks.push(world.register(await makeBillboard('ui/emote_sparkle.png', 0.2 * RS), rm.group));
    boards.push({ ...b, i, rm, rack, tiles, moved, rowTiles, n, land, cut, A, B, end: i < 2 ? E.M_CUTS[i + 1] : E.S05, slotLocal, slotW, anchorW, px, pz, lift, facing, r, sparks });
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
        vec2 p = vUv * vec2(20.0, 8.0);
        float c = pow(1.0 - cell(p), 10.0) + pow(1.0 - cell(p * 1.37 + 4.1), 12.0) * 0.5;
        float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
        gl_FragColor = vec4(vec3(0.55, 0.9, 1.0) * c * 0.18 * edge, 1.0);
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
    const s = await makeBillboard('ui/emote_sparkle.png', 0.09 + hash01(k * 5 + 2) * 0.08, { additive: true });
    s.material.color.set(glitterCols[k % glitterCols.length]).multiplyScalar(1.4);
    glitter.push(world.register(s, GD.rm.group));
  }

  // tile key: a white spot from the front-left that makes the clearcoat sing (a warm key
  // under the warm afternoon sun turned lavender and the locked powder beige)
  const key = world.register(new THREE.SpotLight('#eef0ff', 0, 16, 0.5, 0.7, 1.2));
  world.register(key.target);

  /**
   * The moved letter's flight (tile units, rows' space) at time t, from the top of the lift
   * at the cut to the slot at the landing: it hangs a moment, then accelerates into the
   * slot (inQuad), so it never settles before its squash and chime.
   */
  function flightAt(b, t) {
    const v = clamp((t - b.cut) / (b.land - b.cut));
    const e = v * v;
    const s = Math.sin(Math.PI * e);
    const p = [b.A[0] + (b.B[0] - b.A[0]) * e, b.A[1] + (b.B[1] - b.A[1]) * e + s * FLY.arc, b.A[2] + (b.B[2] - b.A[2]) * e + s * FLY.zArc];
    const rot = [s * FLY.tumble * 0.6 + 0.1 * (1 - v), 0, -s * FLY.tumble * Math.sign(b.B[0] - b.A[0] || 1) - 0.1 * (1 - v)];
    return { p, rot };
  }
  /** World position of a rows'-space point on board b (the rack's inner group, then the cell). */
  function rackWorld(b, p) {
    const k = unit;
    return [b.rm.x + b.rx + p[0] * k, b.rm.y + p[1] * k, RACK_Z + p[2] * k];
  }

  function poseBoard(b, t) {
    b.rack.group.visible = true;
    b.rack.set.pose(t);
    if (t >= b.cut && t < b.land) {
      const f = flightAt(b, t);
      b.moved.position.set(...f.p);
      b.moved.rotation.set(f.rot[0], 0, f.rot[2]);
    }
    setLocked(b.moved, ease.outCubic(seg(t, b.land, b.land + 0.3)));
    for (const x of b.tiles.values()) setTileGlow(x.obj, 0);
    // both words flash as they become real, the moved letter carries a warm rim for 0.4 s
    const flash = (t0, ri, amp) => { const k = seg(t, t0, t0 + 0.22); if (k > 0 && k < 1) for (const o of b.rowTiles(ri)) setTileGlow(o, Math.sin(Math.PI * k) * amp); };
    // (ACES carries a glow further toward white than AgX did: kept low so the glyphs never wash out)
    flash(b.land, 1, 0.55);
    flash(b.land + 0.05, 0, 0.32);
    const rim = seg(t, b.land, b.land + 0.4);
    if (rim > 0 && rim < 1) {
      const rowFlash = Math.sin(Math.PI * seg(t, b.land, b.land + 0.22)) * 0.55;
      setTileGlow(b.moved, Math.max(rim < 0.55 ? rowFlash : 0, 0.42 * (1 - rim)));
    }
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
      sy = 1 + (s > 0 ? 0.13 * Math.exp(-s * 2.0) * (1 - Math.exp(-s * 30)) : 0);
      bob = s > 0 ? Math.abs(Math.sin(s * 7.5)) * 0.14 * Math.exp(-s * 2.4) : 0;
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
      const head = [b.px + 0.45 * b.facing, r.h * 0.72 + r.ch.position.y, b.pz + 0.1];
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
      // glitter: specks lift off GLITTER after the landing, twinkle and drift down. They
      // rise in the gaps between the tiles (both rows share one slot lattice), never over
      // a letter: a bright speck on a glyph turned the L of GLITTER into a "!"
      glitter.forEach((s, k) => {
        const t0 = b.land + 0.02 + hash01(k * 31 + 7) * 0.8;
        const u = (t - t0) / 1.0;
        if (u < 0 || u > 1) { s.visible = false; return; }
        s.visible = true;
        const tileI = (k * 3) % 7, side = hash01(k * 11 + 3) < 0.5 ? -1 : 1;
        const x0 = b.rx + (slotX(tileI, 7) + side * PITCH / 2) * unit + (hash01(k * 17 + 5) - 0.5) * 0.03 * RS;
        const vx = (hash01(k * 23 + 9) - 0.5) * 0.06;
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
        pos = add(pos, [-f.x * 7 * w, -3.6 * w, -f.z * 7 * w]);
        const g = basis(RIG.yaw, RIG.pitch - 14 * w).f;
        target = add(pos, [g.x, g.y, g.z]);
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

  const boardAt = (t) => boards[t < E.M_CUTS[1] ? 0 : t < E.M_CUTS[2] ? 1 : 2];
  // Motion blur (common.js blurFor) from how far the image travels across the shutter:
  // the camera (the push is slow enough to stay sharp; the whip is not) and the flying
  // letter, whose last frames before the slot move tens of pixels.
  const frameH = portrait ? 1920 : 1080;
  const probe = new THREE.PerspectiveCamera(RIG.fov, aspect, 0.05, 900);
  const toPx = (p) => { const v = new THREE.Vector3(...p).project(probe); return [v.x * frameH * aspect / 2, v.y * frameH / 2]; };
  function motion(t) {
    const b = boardAt(t);
    if (t - b.cut < 1 / 120) return blurFor(0); // never average across a cut
    let px = travelPx((u) => { const c = rigAt(b, u); return { ...c, focus: c.depth }; }, t, frameH);
    if (px < 6) px = 0; // the push creeps; only the whip needs the camera smeared
    if (t < b.land + 1 / 120) {
      const c = rigAt(b, t);
      probe.fov = c.fov; probe.aspect = aspect; probe.updateProjectionMatrix();
      probe.position.set(...c.pos); probe.up.set(0, 1, 0); probe.lookAt(...c.target); probe.updateMatrixWorld();
      const a = toPx(rackWorld(b, flightAt(b, t - 1 / 120).p)), z = toPx(rackWorld(b, flightAt(b, Math.min(t + 1 / 120, b.land)).p));
      px = Math.max(px, Math.hypot(a[0] - z[0], a[1] - z[1]));
    }
    return blurFor(px);
  }

  return {
    id: 'S04',
    start: E.S04,
    end: E.S05,
    mb: (t) => motion(t).n,
    shutter: (t) => motion(t).shutter,
    pose(t) {
      setAspect(camera, portrait);
      const b = boardAt(t);
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
      // the white key on the rack from the front-left (the sun's side)
      key.visible = true; key.target.visible = true;
      // aimed at the rack's centre so the far end of a seven-tile row is lit as well as the slot
      const rc = [b.rm.x + b.rx, b.slotW[1], b.slotW[2]];
      const kp = add(rc, [-3.2, 2.7, 3.6]);
      key.position.set(...kp); key.target.position.set(rc[0] + 0.3, rc[1] + 0.2, rc[2] - 0.2);
      key.angle = 0.5;
      key.intensity = 16;
      world.sun.castShadow = true;
      const maxBlur = whip ? 10 : 7;
      return { scene: world.scene, camera, look: look(grade, 0, { ...TILE_GRADE, exposure: grade.exposure * TILE_GRADE.exposure, msaa: !whip, dof: { focus: cam.depth, aperture: APERTURE, maxBlur } }) };
    },
  };
}
