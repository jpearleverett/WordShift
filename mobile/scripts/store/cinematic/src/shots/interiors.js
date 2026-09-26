// S07 "Panko's jars" (E.S07 21.28 to E.S08 24.81) and S08 "The fire draws"
// (E.S08 to E.S09 27.45). Two hard cuts; dusk throughout, lamps on, the painted
// windows take the dusk tint (world.pose does that at dusk = 1).
//
// S07: Panko's kitchen. A 3D pixel-wood shelf whose backboard exactly covers the
//      painted shelf and its jars holds the sprouted L and three glass jars labelled
//      SAGE, MINT, DILL. A small pixel fire burns in the painted oven; her pot
//      steams. The camera slides along the jars, racks to Panko at her stove, then
//      drifts down and right with her as she goes to the oven, so the shelf leaves
//      the frame for the bed's bass-out break. When it slides back, the jars stand
//      DILL, SAGE, MINT and the L sits at the right end. Nothing moves on camera: the
//      swap happens only while the shelf is out of frame. Panko turns toward the
//      shelf and a question mark pops.
// S08: Ember's den. A 3D pixel fire in the painted fireplace and a flickering light;
//      the sprouted L sits at the right end of the mantel. Sparks rise out of the
//      fire and draw a plain little house in five eighth-note strokes (walls and
//      floor, left roof, right roof, door, chimney; no window, nothing inside), it
//      hangs in front of the chimney breast, then drifts up the chimney. Ember looks
//      up, smiles (her stock talk frame), a heart pops, and the camera pans right to
//      take in her whole figure (S09's pull-back starts exactly there).
//
// Interior framings keep at least about half a room of painting across a 16:9 frame
// (4.3+ units; 9:16 frames 2.2+ units), so the room art never magnifies past ~2.8
// output px per painting px, and every camera stays within 12 degrees of the
// painting normal.

import * as THREE from 'three';
import { makeJar } from '../world/props.js';
import { pixelWood } from '../world/house.js';
import { makeFire } from '../world/fire.js';
import { makeBillboard, poseEmote, makeContactShadow } from '../world/fx.js';
import { poseCharacter } from '../world/sprites.js';
import { makeTile, setLocked, makeSprout, TILE_SCALE, TILE_H } from '../core/tiles.js';
import { ease, seg, lerp, clamp, spring, catmull } from '../core/math.js';
import { mm, setAspect, look } from './common.js';
import { makeStrokeSparks, HOUSE_STROKES } from './interiors-sparks.js';

const D2R = Math.PI / 180;

/** house.js crops the painted frame border in the UVs (its BORDER_U / BORDER_V). */
const BU = 0.014, BV = 0.028;
/** Room-local x / y of a painting point (u from the left, v from the bottom, in image space). */
const paintX = (rm, u) => ((u - BU) / (1 - 2 * BU) - 0.5) * rm.roomW;
const paintY = (rm, v) => ((v - BV) / (1 - 2 * BV)) * rm.roomH;
const toWorld = (rm, p) => [rm.x + p[0], rm.y + p[1], p[2]];
/** The midpoint between two 30 fps frames nearest t: an instant switch there never lands inside a
 *  motion-blur shutter (subframes span +-1/120 s around each frame), so it never ghosts. */
const midFrame = (t) => (Math.round(t * 30 - 0.5) + 0.5) / 30;

/** A tiny canvas texture drawn pixel by pixel, crisp when magnified. */
function pixelTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8;
  return t;
}

/**
 * A pixel parchment jar label (96 x 32, spec 6.2): the spice name in Figtree Bold,
 * thresholded to hard pixels, between two inked rules and a thin band in the lid colour.
 */
function spiceLabel(word, band) {
  const W = 96, H = 32;
  // the lettering, drawn soft and then snapped to ink / paper per pixel
  const tc = document.createElement('canvas'); tc.width = W; tc.height = H;
  const tg = tc.getContext('2d');
  tg.font = '700 22px "Figtree"';
  tg.textAlign = 'center'; tg.textBaseline = 'alphabetic';
  const m = tg.measureText(word);
  const base = H / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  tg.save(); tg.translate(W / 2, 0); tg.scale(0.92, 1); tg.fillStyle = '#000'; tg.fillText(word, 0, Math.round(base)); tg.restore();
  const ink = tg.getImageData(0, 0, W, H).data;
  return pixelTexture(W, H, (g) => {
    g.fillStyle = '#F3E2BF'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#E4CC9C'; g.fillRect(0, H - 5, W, 2); g.fillRect(0, 3, W, 1);
    g.fillStyle = band; g.fillRect(0, 2, W, 1); g.fillRect(0, H - 3, W, 1);
    g.fillStyle = '#3B2416'; g.fillRect(0, 0, W, 2); g.fillRect(0, H - 2, W, 2);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ink[(y * W + x) * 4 + 3] > 120) g.fillRect(x, y, 1, 1);
  });
}

/** Stepped pixel steam puff (no smooth gradients). */
const steamTexture = () => pixelTexture(12, 10, (g) => {
  const blobs = [[4, 5, 3.6], [7.5, 4.2, 3.4], [6, 6.5, 3.2]];
  for (let y = 0; y < 10; y++) for (let x = 0; x < 12; x++) {
    let d = 9;
    for (const [cx, cy, r] of blobs) d = Math.min(d, Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r);
    if (d > 1) continue;
    g.fillStyle = `rgba(255,248,238,${d < 0.55 ? 0.9 : d < 0.8 ? 0.6 : 0.3})`; g.fillRect(x, y, 1, 1);
  }
});

/** A pool of warm light on a floor (additive radial decal, room-local, lying flat). */
let poolTex = null;
function lightPool(w, d, color) {
  if (!poolTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    poolTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: poolTex, color, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** The sprouted L (locked powder, sprout grown, perfectly still). */
function makeHeroL() {
  const g = new THREE.Group();
  const tile = makeTile('L');
  setLocked(tile, 1);
  const sprout = makeSprout();
  sprout.scale.setScalar(1);
  sprout.rotation.z = 0.04;
  tile.add(sprout);
  g.add(tile);
  g.scale.setScalar(TILE_SCALE);
  return g;
}

/** Camera from a framing [x, y, z, w, yaw, pitch]: frame centre (room-local), frame width there, angles (deg). */
function frameCam(rm, f, vfov, aspect) {
  const [x, y, z, w, yawDeg, pitchDeg] = f;
  const d = (w / aspect / 2) / Math.tan(vfov * D2R / 2);
  const yaw = yawDeg * D2R, pitch = pitchDeg * D2R;
  const target = [rm.x + x, rm.y + y, z];
  // pitch < 0 looks down (the camera sits above), yaw > 0 looks left (the camera sits right)
  const pos = [target[0] + d * Math.sin(yaw) * Math.cos(pitch), target[1] - d * Math.sin(pitch), target[2] + d * Math.cos(yaw) * Math.cos(pitch)];
  return { pos, target, fov: vfov };
}

/** Linear depth (along the view axis) of a world point, for the DOF focus. */
function depthOf(cam, p) {
  const f = [cam.target[0] - cam.pos[0], cam.target[1] - cam.pos[1], cam.target[2] - cam.pos[2]];
  const l = Math.hypot(...f);
  return ((p[0] - cam.pos[0]) * f[0] + (p[1] - cam.pos[1]) * f[1] + (p[2] - cam.pos[2]) * f[2]) / l;
}

function aimCam(camera, cam) {
  camera.fov = cam.fov;
  camera.updateProjectionMatrix();
  camera.position.set(...cam.pos);
  camera.up.set(0, 1, 0);
  camera.lookAt(...cam.target);
}

/** Motion-blur subframes from the frame centre's travel over one shutter, in output px (1080p). */
function blurFrames(rig, t, pxAcross) {
  const a = rig(t - 1 / 120), b = rig(t + 1 / 120);
  const w = Math.max(1, b.frameW);
  const move = (Math.hypot(b.target[0] - a.target[0], b.target[1] - a.target[1]) + Math.abs(b.frameW - a.frameW) / 2) / w * pxAcross;
  return move < 10 ? 1 : move < 26 ? 2 : 3;
}

export default async function make(ctx) {
  const { world, camera, E, portrait } = ctx;
  const { house, residents } = world;
  const aspect = portrait ? 9 / 16 : 16 / 9;

  // ================================================================ S07 Panko's jars
  const kit = house.rooms.kitchen;
  const panko = residents.panko;
  world.track(panko.ch); world.track(panko.shadow);

  // the shelf: a pixel-wood backboard over the painted shelf and jars (image u 0.650-0.820,
  // v 0.705-0.930: the painted bottle's cork reaches v 0.925), a plank and two brackets
  const BB = { x0: paintX(kit, 0.650), x1: paintX(kit, 0.820), y0: paintY(kit, 0.705), y1: paintY(kit, 0.930) };
  const SHELF_X = (BB.x0 + BB.x1) / 2;
  const WALL_Z = -kit.roomD / 2;
  const PLANK_TOP = BB.y0 + 0.25;
  const PLANK_W = 1.62, PLANK_D = 0.36;
  const shelf = new THREE.Group();
  shelf.position.set(SHELF_X, 0, 0);
  const bbTex = pixelWood({ base: '#7A4F30', planks: 3, seed: 61, vertical: true });
  bbTex.repeat.set((BB.x1 - BB.x0) / 0.7, (BB.y1 - BB.y0) / 1.0);
  const board = new THREE.Mesh(new THREE.BoxGeometry(BB.x1 - BB.x0, BB.y1 - BB.y0, 0.05), new THREE.MeshStandardMaterial({ map: bbTex, color: '#b89272', roughness: 0.88 }));
  board.position.set(0, (BB.y0 + BB.y1) / 2, WALL_Z + 0.028);
  const trimMat = new THREE.MeshStandardMaterial({ map: pixelWood({ base: '#5c3a22', planks: 1, seed: 62 }), roughness: 0.85 });
  const cap = new THREE.Mesh(new THREE.BoxGeometry(BB.x1 - BB.x0 + 0.08, 0.06, 0.1), trimMat);
  cap.position.set(0, BB.y1 - 0.01, WALL_Z + 0.06);
  const plTex = pixelWood({ base: '#8A5A3C', planks: 2, seed: 63 }); plTex.repeat.set(PLANK_W / 1.1, 0.5);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(PLANK_W, 0.08, PLANK_D), new THREE.MeshStandardMaterial({ map: plTex, roughness: 0.78 }));
  plank.position.set(0, PLANK_TOP - 0.04, WALL_Z + 0.05 + PLANK_D / 2);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(PLANK_W, 0.03, 0.02), new THREE.MeshStandardMaterial({ color: '#B07A4A', roughness: 0.7 }));
  lip.position.set(0, PLANK_TOP - 0.015, WALL_Z + 0.05 + PLANK_D + 0.005);
  shelf.add(board, cap, plank, lip);
  for (const s of [-1, 1]) {
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, PLANK_D * 0.8), trimMat);
    br.position.set(s * PLANK_W * 0.36, PLANK_TOP - 0.18, WALL_Z + 0.05 + PLANK_D * 0.4);
    shelf.add(br);
  }
  for (const o of shelf.children) { o.castShadow = true; o.receiveShadow = true; }
  world.register(shelf, kit.builtG);

  // the jars and the L: [L, SAGE, MINT, DILL] -> [DILL, SAGE, MINT, L] while the shelf is away
  const JAR_R = 0.155, JAR_H = 0.46, GAP = 0.05, L_W = TILE_SCALE;
  const SPICES = [
    { word: 'SAGE', lid: '#8FA46A', fill: '#9AA67E' },
    { word: 'MINT', lid: '#9ED6C0', fill: '#7FB89A' },
    { word: 'DILL', lid: '#D9B24C', fill: '#B8B45A' },
  ];
  const ITEM_Z = WALL_Z + 0.05 + PLANK_D * 0.5;
  const jars = SPICES.map((sp) => {
    const jar = makeJar({ lid: sp.lid, fill: sp.fill, height: JAR_H, radius: JAR_R });
    // lettered label: the unrolled label keeps the 96 x 32 canvas's 3:1 aspect
    const label = jar.children.find((c) => c.material && c.material.map);
    const arc = Math.PI * 0.9, lr = JAR_R * 1.01;
    const lh = (lr * arc) / 3;
    label.geometry = new THREE.CylinderGeometry(lr, lr, lh, 32, 1, true, -arc / 2, arc);
    label.material = new THREE.MeshStandardMaterial({ map: spiceLabel(sp.word, sp.lid), roughness: 0.85 });
    label.position.y = JAR_H * 0.44;
    world.register(jar, shelf);
    return jar;
  });
  const heroL = makeHeroL();
  world.register(heroL, shelf);
  const lShadow = makeContactShadow(0.5, 0.2, 0.35);
  lShadow.position.y = PLANK_TOP + 0.003;
  world.register(lShadow, shelf);
  // slot centres (shelf-local x), items left to right
  const widths = [L_W, 2 * JAR_R, 2 * JAR_R, 2 * JAR_R];
  const total = widths.reduce((a, b) => a + b, 0) + GAP * 3;
  const slotsFor = (ws) => { let x = -total / 2; return ws.map((w) => { const c = x + w / 2; x += w + GAP; return c; }); };
  const BEFORE = slotsFor(widths); // L, SAGE, MINT, DILL
  const afterX = slotsFor([2 * JAR_R, 2 * JAR_R, 2 * JAR_R, L_W]); // DILL, SAGE, MINT, L
  const AFTER = [afterX[3], afterX[1], afterX[2], afterX[0]];
  // (the swap time is chosen below, once the camera path is known)

  // the oven fire, in the painted stone oven (flames image u 0.889-0.927, logs at v ~0.36)
  const ovenFire = makeFire({ px: 0.03, width: 0.26, height: 0.46, count: 56, sparks: 4, seed: 23, lightColor: '#ff9447', lightRange: 4.5 });
  ovenFire.group.children[1].visible = false; // its own sparks would climb the stone
  ovenFire.group.position.set(paintX(kit, 0.908), paintY(kit, 0.362), WALL_Z + 0.1);
  world.register(ovenFire.group, kit.builtG);
  // steam from her pot on the range (the painted pot's rim: image u 0.539, v 0.455)
  const POT = [paintX(kit, 0.539), paintY(kit, 0.455), WALL_Z + 0.12];
  const steamTex = steamTexture();
  const steam = Array.from({ length: 6 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, color: '#f1e2d4' }));
    return world.register(s, kit.builtG);
  });
  const question = await makeBillboard('ui/emote_question.png', portrait ? 0.5 : 0.62);
  world.register(question, kit.builtG);
  // lamplight and the oven's glow pooled on the floor boards (they read near black at dusk otherwise)
  const kitPool = world.register(lightPool(6.4, 2.8, '#ffb25c'), kit.builtG);
  kitPool.position.set(0.9, 0.008, -0.2);
  const ovenPool = world.register(lightPool(2.4, 1.8, '#ff9447'), kit.builtG);
  ovenPool.position.set(paintX(kit, 0.908), 0.009, -1.0);

  // Panko stirs her pot from its right, trots to the oven for the break (the camera goes
  // with her, down and right, so the shelf leaves the frame) and at the end turns back
  // toward the shelf. In 16:9 she stays out of the lower-centre caption: her face is high
  // in the frame while she is low, and at the frame's right edge when the jars come back.
  const STAGE = { from: portrait ? 1.05 : 0.78, fromFacing: -1, to: 2.9, turn: -1 };
  const P_Z = -0.5, STRIDE = 0.72;
  const T_WALK0 = E.JARS_AWAY + 0.02, T_WALK1 = E.JARS_AWAY + 1.22;
  const T_FLIP = midFrame(E.PANKO_TURN);
  // an even trot with short starts and stops, so the feet never skate
  const walkK = (t) => { const u = seg(t, T_WALK0, T_WALK1), a = 0.16; return u < a ? u * u / (2 * a * (1 - a)) : u > 1 - a ? 1 - (1 - u) * (1 - u) / (2 * a * (1 - a)) : (u - a / 2) / (1 - a); };
  function pankoState(t) {
    const x = lerp(STAGE.from, STAGE.to, walkK(t));
    const walking = t > T_WALK0 && t < T_WALK1;
    let facing = t < T_WALK0 ? STAGE.fromFacing : Math.sign(STAGE.to - STAGE.from);
    if (t >= T_FLIP) facing = STAGE.turn;
    const hum = (t0, t1) => t > t0 && t < t1 && Math.floor((t - t0) * 6) % 2 === 0;
    const talking = hum(E.JARS_RACK + 0.1, T_WALK0 - 0.05) || hum(T_WALK1 + 0.3, T_WALK1 + 0.9);
    return { x, facing, walking, pose: walking ? 'walk' : talking ? 'talk' : 'idle' };
  }
  function posePanko(t) {
    const st = pankoState(t);
    const ch = panko.ch;
    if (st.walking) poseCharacter(ch, { pose: 'walk', walkPhase: Math.abs(st.x - STAGE.from) / STRIDE, facing: st.facing });
    ch.position.set(st.x, 0.02, P_Z);
    panko.shadow.position.set(st.x, 0.012, P_Z);
    // a stirring rock at the stove, a small start and a look up at the turn
    const stir = t < T_WALK0 ? 1 - seg(t, T_WALK0 - 0.2, T_WALK0) : 0;
    const turnU = t - E.PANKO_TURN;
    const hop = turnU > 0 ? 0.07 * Math.sin(Math.PI * clamp(turnU / 0.2)) : 0;
    const lean = turnU > 0 ? 0.08 * clamp(spring(turnU - 0.05, 2.4, 0.6), 0, 1.2) : 0;
    ch.position.y += 0.012 * (1 + Math.sin(t * 2 * Math.PI * 1.1)) * stir + hop;
    // leaning back tips the top away from the way she faces
    ch.rotation.z = 0.035 * Math.sin(t * 2 * Math.PI * 1.1) * stir + st.facing * lean;
    const breath = 1 + 0.014 * Math.sin(t * 2.7 + 1.3);
    const squash = turnU > 0 && turnU < 0.12 ? 1 - 0.06 * Math.sin(Math.PI * turnU / 0.12) : 1;
    ch.scale.set(squash, breath / squash, 1);
    return st;
  }
  const behaviourS07 = (t) => {
    const st = pankoState(t);
    return { panko: { walkFrom: st.x, facing: st.facing, pose: st.walking ? 'idle' : st.pose } };
  };

  // The camera: framings [x, y, z, width, yaw, pitch] in the kitchen (room-local).
  //   J   the jars (a slow slide right along them)
  //   R   jars at the top, Panko at her stove below (16:9: she enters from the frame's left
  //       edge on a curved path, above the caption's corner; her face never under it)
  //   D   down and right with her for the break: the shelf and its jars leave the frame
  //   B   back up along the shelf: jars at the top, Panko under them
  const FZ = ITEM_Z;
  const F = (x, y, w, pitch = 0) => [x, y, FZ, w, 0, pitch];
  const RIG7 = portrait ? {
    J0: F(1.74, 2.78, 2.32, -1), J1: F(2.04, 2.78, 2.32, -1),
    R1: F(1.8, 2.7, 2.42, -1.2), R: F(1.44, 2.55, 2.62, -1.5), R2: F(1.42, 2.54, 2.64, -1.5),
    D: F(2.5, 0.72, 2.2, -10), D2: F(2.54, 0.7, 2.18, -10),
    B: F(2.15, 2.62, 2.45, -1.5), B2: F(2.12, 2.61, 2.47, -1.5),
  } : {
    // R1 lowers the frame while Panko is still left of it, so she joins from the left edge
    J0: F(1.62, 2.93, 4.3, 1), J1: F(2.02, 2.93, 4.3, 1),
    R1: F(2.32, 1.95, 4.45, 0), R: F(1.6, 1.55, 4.6, -3), R2: F(1.6, 1.55, 4.6, -3),
    D: F(2.3, 1.42, 4.6, -4), D2: F(2.34, 1.4, 4.58, -4),
    B: F(0.0, 1.98, 7.0, -1), B2: F(-0.06, 1.98, 6.95, -1),
  };
  // 9:16 settles on Panko while the focus racks to her, then holds until she sets off
  const T_J1 = E.JARS_RACK + 0.1, T_R = E.JARS_AWAY + 0.04, T_RA = portrait ? E.JARS_RACK + 0.55 : T_R, T_D = E.JARS_AWAY + 0.78, T_B = E.JARS_BACK + 0.48;
  const vfov7 = portrait ? 25 : mm(100);
  const mixF = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
  function framing7(t) {
    if (t < T_J1) return mixF(RIG7.J0, RIG7.J1, ease.outSine(seg(t, E.S07, T_J1)));
    if (t < T_RA) return catmull([RIG7.J1, RIG7.R1, RIG7.R], ease.inOutSine(seg(t, T_J1, T_RA)));
    if (t < T_R) return mixF(RIG7.R, RIG7.R2, seg(t, T_RA, T_R));
    if (t < T_D) return mixF(RIG7.R2, RIG7.D, ease.inOutSine(seg(t, T_R, T_D)));
    if (t < E.JARS_BACK) return mixF(RIG7.D, RIG7.D2, seg(t, T_D, E.JARS_BACK));
    if (t < T_B) return mixF(RIG7.D2, RIG7.B, ease.inOutCubic(seg(t, E.JARS_BACK, T_B)));
    return mixF(RIG7.B, RIG7.B2, seg(t, T_B, E.S08));
  }
  function rig7(t) {
    const f = framing7(t);
    const cam = frameCam(kit, f, vfov7, aspect);
    cam.frameW = f[3];
    return cam;
  }
  // The swap: the middle of the stretch where the camera sits lowest, the shelf out of frame.
  const T_SWAP = midFrame((T_D + E.JARS_BACK) / 2);
  const JARS_FOCUS = toWorld(kit, [SHELF_X, PLANK_TOP + 0.24, ITEM_Z]);
  function focus7(t, cam) {
    const dj = depthOf(cam, JARS_FOCUS);
    const st = pankoState(t);
    const dp = depthOf(cam, toWorld(kit, [st.x, 1.25, P_Z]));
    // jars, rack to Panko, stay with her through the break, jars again on the slide back, Panko at the turn
    const toP = ease.inOutSine(seg(t, E.JARS_RACK, E.JARS_RACK + 0.5)) * (1 - ease.inOutSine(seg(t, E.JARS_BACK + 0.08, E.JARS_BACK + 0.34)))
      + ease.inOutSine(seg(t, E.PANKO_TURN - 0.02, E.PANKO_TURN + 0.22));
    return lerp(dj, dp, clamp(toP));
  }

  function poseS07(t) {
    shelf.visible = true;
    const order = t < T_SWAP ? BEFORE : AFTER;
    heroL.visible = true;
    heroL.position.set(order[0], PLANK_TOP + (TILE_H * TILE_SCALE) / 2, ITEM_Z + 0.02);
    lShadow.visible = true; lShadow.position.x = order[0]; lShadow.position.z = ITEM_Z;
    jars.forEach((j, i) => { j.visible = true; j.position.set(order[i + 1], PLANK_TOP, ITEM_Z); j.rotation.y = [0.1, -0.06, 0.04][i]; });
    ovenFire.group.visible = true;
    ovenFire.pose(t, { camera, intensity: 0.6 });
    ovenFire.light.intensity *= 0.55;
    kitPool.visible = true; kitPool.material.opacity = portrait ? 0.3 : 0.2;
    ovenPool.visible = true; ovenPool.material.opacity = 0.26 + 0.05 * Math.sin(t * 11.3) * Math.sin(t * 4.1);
    steam.forEach((s, i) => {
      const u = (((t - E.S07) / 1.8 + i / steam.length) % 1 + 1) % 1;
      s.visible = true;
      s.position.set(POT[0] + Math.sin(u * 5 + i * 1.3) * 0.06 + u * 0.05, POT[1] + 0.06 + ease.outQuad(u) * 0.7, POT[2] + i * 0.01);
      const g = 0.3 + 0.4 * u;
      s.scale.set(g, g * 10 / 12, 1);
      s.material.opacity = Math.min(1, u * 6) * (1 - u) * 0.5;
    });
    const st = pankoState(t);
    const head = [st.x + 0.08 * st.facing, 1.5 + 0.2, P_Z + 0.15];
    question.position.set(...head); question.userData.y0 = head[1];
    poseEmote(question, t - E.PANKO_TURN, { hold: 1.0, rise: 0.22, fade: 0.3 });
  }

  const s07 = {
    id: 'S07', start: E.S07, end: E.S08,
    mb: (t) => blurFrames(rig7, t, portrait ? 1080 : 1920),
    pose(t) {
      setAspect(camera, portrait);
      const cam = rig7(t);
      aimCam(camera, cam);
      const focus = focus7(t, cam);
      const aperture = portrait ? 100 : 90;
      poseS07(t);
      const grade = world.pose(t, { dusk: 1, lamps: 1, focus, aperture, camera, behaviours: behaviourS07(t) });
      posePanko(t);
      interiorOnly();
      soloRoomLight(kit);
      return { scene: world.scene, camera, look: look(grade, 1, { msaa: false, exposure: 1.2, contrast: 1, vignette: 0.2, dof: { focus, aperture, maxBlur: 16 } }) };
    },
  };

  // ================================================================ S08 the fire draws
  const den = house.rooms.cozy_den;
  const ember = residents.ember;
  world.track(ember.ch); world.track(ember.shadow);
  const DEN_WALL = -den.roomD / 2;
  // the fire in the painted fireplace (flames image u 0.185-0.251, logs at v ~0.31)
  const FIRE = [paintX(den, 0.2143), paintY(den, 0.31), DEN_WALL + 0.12];
  const hearth = makeFire({ px: 0.035, width: 0.44, height: 0.82, count: 90, sparks: 6, seed: 29, lightColor: '#ff8a3a', lightRange: 7.5 });
  hearth.group.children[1].visible = false; // the stroke module owns every spark
  hearth.group.position.set(...FIRE);
  world.register(hearth.group, den.builtG);
  // the drawing hangs in front of the stone chimney breast (image u 0.089-0.240, v 0.708-0.965)
  const DRAW_SCALE = 1.35;
  const DRAW_O = [paintX(den, 0.165), paintY(den, 0.82) - 0.3 * DRAW_SCALE, DEN_WALL + 0.34];
  const MOUTH = [FIRE[0] - DRAW_O[0], FIRE[1] + 0.62 - DRAW_O[1]];
  const draw = makeStrokeSparks({ strokes: HOUSE_STROKES, scale: DRAW_SCALE, cell: 0.05, mouth: MOUTH, embers: 9, seed: 11 });
  draw.group.position.set(...DRAW_O);
  world.register(draw.group, den.builtG);
  // each stroke is drawn over the eighth that ends on its E.STROKES beat, so the house is
  // complete on the last one (~26.13, where the swell peaks and Ember smiles)
  const STROKE_START = E.STROKES.map((x) => x - E.EIGHTH);
  const STROKE_DUR = E.EIGHTH * 0.94;
  const HOLD_END = E.STROKES[4] + 0.67;  // ~26.80 (spec: hangs 26.15-26.80)
  const RELEASE = 0.45;                  // drifts up the chimney until ~27.4
  // the sprouted L at the right end of the mantel (its top edge at image v ~0.706 there)
  const mantelL = makeHeroL();
  const ML_X = paintX(den, 0.285);
  const ML_Y = paintY(den, 0.70);
  mantelL.position.set(ML_X, ML_Y + (TILE_H * TILE_SCALE) / 2, DEN_WALL + 0.2);
  mantelL.rotation.y = -0.12;
  world.register(mantelL, den.builtG);
  const mlShadow = makeContactShadow(0.52, 0.2, 0.4);
  mlShadow.position.set(ML_X, ML_Y + 0.004, DEN_WALL + 0.2);
  world.register(mlShadow, den.builtG);
  const heart = await makeBillboard('ui/emote_heart.png', portrait ? 0.5 : 0.52);
  world.register(heart, den.builtG);
  const hearthPool = world.register(lightPool(3.6, 2.4, '#ff8a3a'), den.builtG);
  hearthPool.position.set(FIRE[0] + 0.3, 0.008, -0.7);
  // Ember watches from her own spot by the armchair, turned toward the fire. As the camera finds
  // her she turns to chat through the wall, which is exactly where S09 (a continuous pull-back)
  // has her: same place, same facing, same talk frame.
  const EM_X = ember.x0, EM_Z = ember.z0;
  const T_TURN = midFrame(E.S09 - 0.15);
  // the painted fire's own dusk glow card would wash the 3D fire out to white
  const fireGlow = den.lamps[0];
  world.track(fireGlow);
  /** 1 while the den is S08's (3D fire, pools), falling to 0 as S09's plain den takes over. */
  const handoff = (t) => 1 - ease.inOutSine(seg(t, E.S09 - 0.55, E.S09 - 0.05));

  function poseEmber(t) {
    const ch = ember.ch;
    ch.position.set(EM_X, 0.02, EM_Z);
    ember.shadow.position.set(EM_X, 0.012, EM_Z);
    // she looks up at the drawing (a lean back, drawn up a little) and settles before she turns
    const up = clamp(spring(t - E.EMBER_LOOK, 2.2, 0.62), 0, 1.15) * (1 - ease.inOutSine(seg(t, T_TURN - 0.4, T_TURN)));
    ch.rotation.z = -0.075 * up; // facing left: leaning back moves the top to the right
    const breath = 1 + 0.013 * Math.sin(t * 2.5 + 0.4) * handoff(t);
    ch.scale.set(1, breath * (1 + 0.025 * up), 1);
    if (t >= T_TURN) poseCharacter(ch, { pose: Math.floor(t * 6) % 2 === 0 ? 'talk' : 'idle', facing: 1 }); // S09's chatter
    else poseCharacter(ch, { pose: t >= E.EMBER_SMILE ? 'talk' : 'idle', facing: -1 }); // the soft smile, held
    const head = [EM_X - 0.1, ember.h + 0.14, EM_Z + 0.15];
    heart.position.set(...head); heart.userData.y0 = head[1];
    poseEmote(heart, t - E.EMBER_HEART, { hold: 0.58, rise: 0.22, fade: 0.26 }); // gone before the cut
  }

  // camera: a slow push toward the drawing, then a pan right (with a small truck) to Ember
  const vfov8 = portrait ? 30 : mm(85);
  const A8 = portrait ? [-2.52, 2.32, DRAW_O[2], 2.6, 3, 2] : [-2.0, 2.6, DRAW_O[2], 4.9, 4, 3];
  const A8b = portrait ? [-2.52, 2.34, DRAW_O[2], 2.46, 3, 2] : [-2.02, 2.61, DRAW_O[2], 4.62, 4, 3];
  const PAN_TO = portrait ? [0.36, 1.95, EM_Z] : [-0.45, 1.2, EM_Z];
  const TRUCK = portrait ? 2.1 : 0.55;
  // 9:16 finds her sooner (its frame starts further from her) and then holds on her
  const T_PAN = portrait ? E.EMBER_HEART - 0.14 : E.EMBER_HEART + 0.02;
  const T_PAN_END = portrait ? E.S09 - 0.25 : E.S09;
  function rig8(t) {
    const k = ease.inOutSine(seg(t, E.S08, T_PAN));
    const f = A8.map((v, i) => lerp(v, A8b[i], k));
    const cam = frameCam(den, f, vfov8, aspect);
    const p = ease.inOutSine(seg(t, T_PAN, T_PAN_END));
    if (p > 0) {
      const tw = toWorld(den, PAN_TO);
      cam.target = cam.target.map((v, i) => lerp(v, tw[i], p));
      cam.pos = [cam.pos[0] + TRUCK * p, cam.pos[1], cam.pos[2]];
    }
    cam.frameW = f[3];
    return cam;
  }
  function focus8(t, cam) {
    const dd = depthOf(cam, toWorld(den, [DRAW_O[0], DRAW_O[1] + 0.4, DRAW_O[2]]));
    const de = depthOf(cam, toWorld(den, [EM_X, 1.3, EM_Z]));
    return lerp(dd, de, ease.inOutSine(seg(t, T_PAN + 0.05, T_PAN + 0.55)));
  }

  function poseS08(t) {
    const h = handoff(t);
    hearth.group.visible = h > 0.001;
    hearth.pose(t, { camera, intensity: 0.5 * h });
    hearth.light.position.set(0, 0.35, 0.6);
    draw.group.visible = true;
    draw.pose(t, { times: STROKE_START, dur: STROKE_DUR, holdEnd: HOLD_END, release: RELEASE, embers: h * (1 - 0.7 * seg(t, STROKE_START[0] - 0.3, STROKE_START[0]) * (1 - seg(t, HOLD_END, HOLD_END + 0.3))) });
    mantelL.visible = true; mlShadow.visible = true;
    hearthPool.visible = h > 0.001; hearthPool.material.opacity = (0.3 + 0.06 * Math.sin(t * 9.7) * Math.sin(t * 3.3)) * h;
  }

  const s08 = {
    id: 'S08', start: E.S08, end: E.S09,
    mb: (t) => blurFrames(rig8, t, portrait ? 1080 : 1920),
    pose(t) {
      setAspect(camera, portrait);
      const cam = rig8(t);
      aimCam(camera, cam);
      const focus = focus8(t, cam);
      const aperture = portrait ? 60 : 70;
      poseS08(t);
      const grade = world.pose(t, { dusk: 1, lamps: 1, focus, aperture, camera, behaviours: { ember: { walkFrom: EM_X, facing: -1 } } });
      poseEmber(t);
      fireGlow.material.opacity *= lerp(1, 0.35, handoff(t));
      interiorOnly();
      soloRoomLight(den, 10);
      // S09 (a continuous pull-back) starts from this camera and look, so S08 eases into its
      // grade over the pan (contrast 1.0 keeps the lifted blacks; S09 opens at 1.04)
      const m = 1 - handoff(t);
      return { scene: world.scene, camera, look: look(grade, 1, { msaa: false, contrast: lerp(1, 1.04, m), exposure: portrait ? 1.16 : 1.24, gamma: portrait ? [1, 1, 1] : [1.05, 1.05, 1.05], vignette: lerp(0.2, 0.24, m), dof: { focus, aperture, maxBlur: 16 } }) };
    },
  };

  // Interior frames are lit painting from edge to edge and every point light is paid for on
  // every pixel, so far rooms' lamps (out of their 10.4-unit range here) are switched off.
  // S07 keeps only its own lamp (hard cuts both sides); S08 keeps the neighbours' too (they
  // reach the den a little), so nothing changes when S09's pull-back takes over.
  const roomLights = Object.values(house.rooms).filter((rm) => rm.light).map((rm) => world.track(rm.light) && rm);
  function soloRoomLight(keep, radius = 0) {
    for (const rm of roomLights) if (rm !== keep && Math.hypot(rm.x - keep.x, rm.y - keep.y) > radius) rm.light.visible = false;
  }

  /** Interiors: no sun shadows, no grass, no fireflies drifting in front of the lens. */
  function interiorOnly() {
    world.sun.castShadow = false;
    world.grass.group.visible = false; world.grassFar.group.visible = false;
    world.flies.points.visible = false; world.pollen.points.visible = false;
  }

  return [s07, s08];
}
