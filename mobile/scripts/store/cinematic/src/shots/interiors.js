// S07 "Panko's jars" (E.S07 21.28 to E.S08 24.81) and S08 "The fire draws"
// (E.S08 to E.S09 27.45). Two hard cuts; dusk throughout, lamps on, the painted
// windows take the dusk tint (world.pose does that at dusk = 1).
//
// S07: Panko's kitchen. A 3D pixel-wood shelf whose backboard exactly covers the
//      painted shelf and its jars holds the sprouted L and three glass jars labelled
//      SAGE, MINT, DILL. A small pixel fire burns in the painted oven; her pot
//      steams. The camera slides along the jars, racks to Panko at her stove, then
//      drifts down with her as she trots off (9:16: right, short of the oven, whose
//      flame must never stand on her head; 16:9: left, to the herbs on the counter, so
//      the lower-centre caption never crosses her face or chest), and the shelf leaves
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
//      take in her whole figure. She stands at her S08/S09 spot (handoff.js) from the
//      first frame: S09's pull-back starts exactly where this shot ends.
//
// Interior framings keep at least about half a room of painting across a 16:9 frame
// (4.3+ units; 9:16 frames 2.1+ units), so the room art never magnifies past ~2.8
// output px per painting px, every camera stays within 12 degrees of the painting
// normal, and no frame reaches past the room's side walls (the dark side wall shows).

import * as THREE from 'three';
import { makeJar } from '../world/props.js';
import { pixelWood } from '../world/house.js';
import { makeFire } from '../world/fire.js';
import { makeBillboard, poseEmote, makeContactShadow } from '../world/fx.js';
import { poseCharacter } from '../world/sprites.js';
import { makeTile, setLocked, makeSprout, TILE_SCALE, TILE_H } from '../core/tiles.js';
import { ease, seg, lerp, clamp, spring, catmull } from '../core/math.js';
import { mm, setAspect, look, travelPx, blurFor } from './common.js';
import { emberDenX } from './handoff.js';
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
/** The centre of the 30 fps frame a (motion-blur sub)frame time belongs to: sprite flipbooks
 *  (walk cycles, talk/idle) switch on it, so a shutter never blends two drawings into a ghost. */
const frameT = (t) => Math.round(t * 30) / 30;

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
  // (26 px caps on a 32 px label: DILL SAGE MINT read at about 28 px in 16:9's payoff frame;
  // squeezed a little so the words stay on the jar's front)
  tg.font = '700 26px "Figtree"';
  tg.textAlign = 'center'; tg.textBaseline = 'alphabetic';
  const m = tg.measureText(word);
  const base = H / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  tg.save(); tg.translate(W / 2, 0); tg.scale(0.84, 1); tg.fillStyle = '#000'; tg.fillText(word, 0, Math.round(base)); tg.restore();
  const ink = tg.getImageData(0, 0, W, H).data;
  return pixelTexture(W, H, (g) => {
    g.fillStyle = '#F3E2BF'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#E4CC9C'; g.fillRect(0, H - 5, W, 2); g.fillRect(0, 3, W, 1);
    g.fillStyle = band; g.fillRect(0, 2, W, 1); g.fillRect(0, H - 3, W, 1);
    g.fillStyle = '#3B2416'; g.fillRect(0, 0, W, 2); g.fillRect(0, H - 2, W, 2);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ink[(y * W + x) * 4 + 3] > 120) g.fillRect(x, y, 1, 1);
  });
}

/** Dried herbs seen through a jar: flecks on the herb colour, 48 x 16 so the pixels come out
 *  about square round the jar (its visible front shows ~24 of them). A fixed hash, no noise. */
function herbTexture(base, fleck) {
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  return pixelTexture(48, 16, (g) => {
    g.fillStyle = base; g.fillRect(0, 0, 48, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 48; x++) {
      const h = hash(x, y);
      if (h < 0.18) { g.fillStyle = fleck; g.fillRect(x, y, 1, 1); } else if (h > 0.9) { g.fillStyle = 'rgba(40,24,12,0.32)'; g.fillRect(x, y, 1, 1); }
    }
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

/** Screen position (output px from the frame centre) of a world point seen by a rig camera. */
function screenPx(cam, p, frameH) {
  const f = [cam.target[0] - cam.pos[0], cam.target[1] - cam.pos[1], cam.target[2] - cam.pos[2]];
  const fl = Math.hypot(...f); f[0] /= fl; f[1] /= fl; f[2] /= fl;
  // right = f x up(0,1,0), up' = right x f
  const r = [-f[2], 0, f[0]]; const rl = Math.hypot(...r) || 1; r[0] /= rl; r[2] /= rl;
  const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
  const d = [p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]];
  const z = d[0] * f[0] + d[1] * f[1] + d[2] * f[2];
  const k = (frameH / 2) / Math.tan(cam.fov * D2R / 2) / z;
  return [(d[0] * r[0] + d[1] * r[1] + d[2] * r[2]) * k, (d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) * k];
}

/**
 * Adaptive motion blur (common.js blurFor): enough subframes, over a short enough shutter,
 * that pixel art never shows stepped copies. The travel is the camera's own (travelPx) or a
 * tracked subject's on screen (subject(t) -> world point), whichever is larger.
 */
function adaptiveBlur(rig, frameH, subject = null) {
  const px = (t) => {
    let v = travelPx(rig, t, frameH);
    if (subject) {
      const a = screenPx(rig(t - 1 / 120), subject(t - 1 / 120), frameH), b = screenPx(rig(t + 1 / 120), subject(t + 1 / 120), frameH);
      v = Math.max(v, Math.hypot(b[0] - a[0], b[1] - a[1]));
    }
    return v;
  };
  return { mb: (t) => blurFor(px(t)).n, shutter: (t) => blurFor(px(t)).shutter };
}

export default async function make(ctx) {
  const { world, camera, E, portrait } = ctx;
  const { house, residents } = world;
  const aspect = portrait ? 9 / 16 : 16 / 9;
  // The interiors' grade (spec 2.6's dusk, tuned): a little less exposure and more contrast than
  // the wides, so the painted rooms keep their darks instead of reading flat pink, and a
  // neutral-warm painting tint for the interior only (tod's dusk tint is a pink #f7ecea).
  const GRADE7 = { exposure: 1.12, contrast: 1.14 };
  const GRADE8 = { exposure: portrait ? 1.10 : 1.14, contrast: 1.14 };
  const INTERIOR_TINT = '#F6EFE4';

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
    // Read as glass with dried herbs in it: the spice fills the jar to the shoulder (it shows
    // above and below the label, in a two-tone pixel dither), and the glass itself is nearly
    // clear, a dark low-albedo shell whose rough clearcoat gives one soft sheen (a whitish
    // albedo at dusk turns the whole jar milky pink, like a ceramic pot)
    const [content, , , glass] = jar.children;
    content.scale.y = 0.7 / 0.55;
    content.position.y = JAR_H * 0.39;
    content.material = new THREE.MeshStandardMaterial({ map: herbTexture(sp.fill, sp.lid), roughness: 0.95 });
    glass.material = glass.material.clone();
    glass.material.color.set('#6a6672');
    glass.material.opacity = 0.36;
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
  const kitPool = world.register(lightPool(6.4, 3.2, '#ffb25c'), kit.builtG);
  kitPool.position.set(0.9, 0.008, 0.0);
  const ovenPool = world.register(lightPool(2.4, 1.8, '#ff9447'), kit.builtG);
  ovenPool.position.set(paintX(kit, 0.908), 0.009, -1.0);

  // Panko stirs her pot, trots off for the break (the camera goes with her and down, so the
  // shelf leaves the frame) and at the end turns back toward the shelf.
  //   9:16  she stirs from the pot's right and stops short of the oven: her head stays left
  //         of its flame (at 2.35+ the fire stands on her head).
  //   16:9  she stirs from the pot's left and trots to the herbs on the left counter. At 100 mm
  //         a frame holding the jars and her whole face is at least ~6.6 units wide, and the
  //         flip moves her face ~1.2 units, so only a spot left of the lower-centre caption
  //         (x 20-80%) keeps it off her face and chest while she turns under the jars' frame.
  const STAGE = portrait ? { from: 1.3, fromFacing: -1, to: 1.85, turn: 1 } : { from: -0.6, fromFacing: 1, to: 0.35, turn: 1 };
  const P_Z = -0.5, STRIDE = 0.72;
  const T_WALK0 = E.JARS_AWAY + 0.02, T_WALK1 = E.JARS_AWAY + 1.22;
  const T_FLIP = midFrame(E.PANKO_TURN);
  // an even trot with short starts and stops, so the feet never skate
  const walkK = (t) => { const u = seg(t, T_WALK0, T_WALK1), a = 0.16; return u < a ? u * u / (2 * a * (1 - a)) : u > 1 - a ? 1 - (1 - u) * (1 - u) / (2 * a * (1 - a)) : (u - a / 2) / (1 - a); };
  function pankoState(t) {
    const x = lerp(STAGE.from, STAGE.to, walkK(t));
    const tc = frameT(t);
    const walking = tc > T_WALK0 && tc < T_WALK1;
    let facing = tc < T_WALK0 ? STAGE.fromFacing : Math.sign(STAGE.to - STAGE.from);
    if (t >= T_FLIP) facing = STAGE.turn;
    const hum = (t0, t1) => tc > t0 && tc < t1 && Math.floor((tc - t0) * 6) % 2 === 0;
    const talking = hum(E.JARS_RACK + 0.1, T_WALK0 - 0.05) || hum(T_WALK1 + 0.3, T_WALK1 + 0.9);
    return { x, facing, walking, pose: walking ? 'walk' : talking ? 'talk' : 'idle' };
  }
  function posePanko(t) {
    const st = pankoState(t);
    const ch = panko.ch;
    const xc = lerp(STAGE.from, STAGE.to, walkK(frameT(t))); // the walk drawing follows the frame, the position the subframe
    if (st.walking) poseCharacter(ch, { pose: 'walk', walkPhase: Math.abs(xc - STAGE.from) / STRIDE, facing: st.facing });
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
  //   J   the jars (a slow slide right along them), Panko out of frame
  //   R   Panko at her stove (16:9: she enters from the frame's left edge on a curved path,
  //       above the caption; low enough that it crosses only her legs)
  //   D   down with her for the break: the shelf and its jars leave the frame
  //   B   back up to the shelf: the jars and Panko, who turns (16:9: she at the left edge,
  //       the jars top right, her face and the "?" left of the caption)
  const FZ = ITEM_Z;
  const F = (x, y, w, pitch = 0) => [x, y, FZ, w, 0, pitch];
  const RIG7 = portrait ? {
    // the jars sit below the caption band; Panko (soft) stays out of the jar macro
    J0: F(1.8, 3.03, 2.1, -1), J1: F(2.12, 3.03, 2.1, -1),
    // (frame tops stay under ~4.9 here: higher, the view clears the ceiling slab into the room above)
    R1: F(1.9, 2.65, 2.5, -1.2), R: F(1.32, 2.5, 2.7, -1.5), R2: F(1.3, 2.49, 2.72, -1.5),
    D: F(2.0, 0.72, 2.2, -9), D2: F(2.03, 0.7, 2.19, -9),
    B: F(1.85, 2.5, 2.7, -1.5), B2: F(1.83, 2.49, 2.72, -1.5),
  } : {
    // 16:9 blocks the break to the left counter: the caption (lower centre, x 20-80%) then never
    // crosses her face or chest, and when the jars come back she turns at the frame's left edge
    J0: F(1.36, 2.93, 4.3, 1), J1: F(1.8, 2.93, 4.3, 1),
    R1: F(1.5, 1.6, 4.8, -1), R: F(0.7, 1.3, 5.2, -2), R2: F(0.68, 1.3, 5.18, -2),
    D: F(0.2, 1.05, 5.3, -3.5), D2: F(0.18, 1.03, 5.28, -3.5),
    // the payoff: the jars and the L top right, Panko's whole head (chin clear of the bottom
    // edge through her hop) and the "?" left of centre
    B: F(1.05, 2.22, 5.6, 0), B2: F(1.03, 2.22, 5.52, 0),
  };
  // both cuts settle on Panko while the focus racks to her, then hold until she sets off
  const T_J1 = E.JARS_RACK + 0.1, T_R = E.JARS_AWAY + 0.04, T_RA = E.JARS_RACK + (portrait ? 0.55 : 0.66), T_D = E.JARS_AWAY + 0.78;
  const T_B = E.JARS_BACK + (portrait ? 0.35 : 0.15); // settled on the jars (and her) just before she turns
  const backEase = portrait ? ease.inOutCubic : ease.outCubic; // 16:9 lands early, so the payoff holds still
  const vfov7 = portrait ? 25 : mm(100);
  const mixF = (a, b, k) => a.map((v, i) => lerp(v, b[i], k));
  function framing7(t) {
    if (t < T_J1) return mixF(RIG7.J0, RIG7.J1, ease.outSine(seg(t, E.S07, T_J1)));
    if (t < T_RA) return catmull([RIG7.J1, RIG7.R1, RIG7.R], ease.inOutSine(seg(t, T_J1, T_RA)));
    if (t < T_R) return mixF(RIG7.R, RIG7.R2, seg(t, T_RA, T_R));
    if (t < T_D) return mixF(RIG7.R2, RIG7.D, ease.inOutSine(seg(t, T_R, T_D)));
    if (t < E.JARS_BACK) return mixF(RIG7.D, RIG7.D2, seg(t, T_D, E.JARS_BACK));
    if (t < T_B) return mixF(RIG7.D2, RIG7.B, backEase(seg(t, E.JARS_BACK, T_B)));
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
    // (16:9 holds the jars sharp a beat longer, so DILL SAGE MINT reads before the rack)
    const r2 = portrait ? [E.PANKO_TURN - 0.02, E.PANKO_TURN + 0.22] : [E.PANKO_TURN + 0.15, E.PANKO_TURN + 0.35];
    const toP = ease.inOutSine(seg(t, E.JARS_RACK, E.JARS_RACK + 0.5)) * (1 - ease.inOutSine(seg(t, E.JARS_BACK + 0.08, E.JARS_BACK + 0.34)))
      + ease.inOutSine(seg(t, r2[0], r2[1]));
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
    const head = [st.x + 0.45 * st.facing, 1.62, P_Z + 0.15];
    question.position.set(...head); question.userData.y0 = head[1];
    poseEmote(question, t - E.PANKO_TURN, { hold: 1.0, rise: 0.22, fade: 0.3 });
  }

  const s07 = {
    id: 'S07', start: E.S07, end: E.S08,
    ...adaptiveBlur(rig7, portrait ? 1920 : 1080, (t) => toWorld(kit, [pankoState(t).x, 1.1, P_Z])),
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
      kit.mat.color.set(INTERIOR_TINT);
      return { scene: world.scene, camera, look: look(grade, 1, { msaa: false, ...GRADE7, dof: { focus, aperture, maxBlur: 16 } }) };
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
  const DRAW_O = [paintX(den, 0.165), paintY(den, 0.82) - 0.3 * DRAW_SCALE - 0.05, DEN_WALL + 0.34];
  const MOUTH = [FIRE[0] - DRAW_O[0], FIRE[1] + 0.62 - DRAW_O[1]];
  const draw = makeStrokeSparks({ strokes: HOUSE_STROKES, scale: DRAW_SCALE, cell: 0.05, mouth: MOUTH, embers: 9, seed: 11 });
  draw.group.position.set(...DRAW_O);
  world.register(draw.group, den.builtG);
  // each stroke is drawn over the eighth that ends on its E.STROKES beat, so the house is
  // complete on the last one (~26.13, where the swell peaks and Ember smiles)
  const STROKE_START = E.STROKES.map((x) => x - E.EIGHTH);
  const STROKE_DUR = E.EIGHTH * 0.94;
  const HOLD_END = E.STROKES[4] + 0.67;  // ~26.80 (spec: hangs 26.15-26.80)
  const RELEASE = 0.45;                  // each spark drifts up for 0.45 s; the cloud dims out with the fire by E.S09 - 0.05
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
  // Ember stands at her S08/S09 spot (handoff.js: u 0.40, between the hearth and the window),
  // turned toward the fire. As the camera settles on her she starts chatting (talk and idle
  // alternating) still facing the fire, exactly as S09 (a continuous pull-back) has her: same
  // place, same facing, same frames. S09 turns her only once she is small and soft
  // (E.S09 + 0.75), so no sideways pop lands on a close frame.
  const EM_X = emberDenX(den), EM_Z = ember.z0;
  const T_TURN = midFrame(E.S09 - 0.15); // she settles from the look-up and starts to chat
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
    ch.rotation.z = -0.16 * up; // facing left: leaning back moves the top to the right
    ch.position.y += 0.05 * up; // and she rises onto her toes a little, so the look up reads
    const breath = 1 + 0.013 * Math.sin(t * 2.5 + 0.4) * handoff(t);
    ch.scale.set(1, breath * (1 + 0.025 * up), 1);
    const tc = frameT(t);
    // she keeps facing the fire through the cut (S09 turns her once she is small and soft)
    if (t >= T_TURN) poseCharacter(ch, { pose: Math.floor(tc * 6) % 2 === 0 ? 'talk' : 'idle', facing: -1 }); // S09's chatter
    else poseCharacter(ch, { pose: tc >= E.EMBER_SMILE ? 'talk' : 'idle', facing: -1 }); // the soft smile, held
    const head = [EM_X - 0.1, ember.h + 0.14, EM_Z + 0.15];
    heart.position.set(...head); heart.userData.y0 = head[1];
    poseEmote(heart, t - E.EMBER_HEART, { hold: 0.58, rise: 0.22, fade: 0.26 }); // gone before the cut
  }

  // camera: a slow push toward the drawing, then a pan right (with a small truck) onto Ember.
  //   16:9  the fire mouth, the whole drawing and Ember three-quarter (knees up) beside it, so
  //         her look-up and smile play in frame; the frame's left edge stays inside the room.
  //         The pan waits until the finished drawing lets go.
  //   9:16  the fire and the drawing, Ember wholly out of frame to the right; the pan finds her
  //         full figure right of centre as she smiles, the heart above her.
  const vfov8 = portrait ? 30 : mm(85);
  //   16:9  the frame's left edge on the den wall (-3.95), the drawing at about 20% x / 22% y
  //         with ~110 px of headroom, the L on the mantel, and Ember (52%) cropped at the thigh,
  //         so her look up (a lean back, a lift) reads with her whole torso. (Ember at 59% would
  //         need a frame no wider than 5.3, which crops her at the neck under the drawing.)
  const A8 = portrait ? [-2.75, 2.32, DRAW_O[2], 2.6, 3, 2] : [-0.95, 2.29, DRAW_O[2], 6.0, 2, 1];
  const A8b = portrait ? [-2.75, 2.34, DRAW_O[2], 2.46, 3, 2] : [-0.97, 2.31, DRAW_O[2], 5.85, 2, 1];
  const PAN_TO = portrait ? [EM_X - 0.35, 1.6, EM_Z] : [EM_X + 0.4, 1.2, EM_Z];
  const TRUCK = portrait ? 2.1 : 0.55;
  //   16:9  the pan starts as the heart pops and runs on past the cut (T_PAN_END > E.S09): S09
  //         samples this rig (s08.rig) up to E.S09 + 0.3 and blends it into the pull-back, so
  //         the pan decelerates while the pull-back accelerates and the camera never stops.
  //   9:16  a snappy pan (she is half-cut for only a couple of frames), settled before the heart
  //         pops, then a slow 2% drift in that S09 carries on.
  const T_PAN = portrait ? E.EMBER_SMILE : E.EMBER_HEART + 0.02;
  const T_PAN_END = portrait ? E.EMBER_SMILE + 0.45 : E.S09 + 0.3;
  const panEase = portrait ? ease.inOutCubic : ease.inOutSine;
  const DRIFT = 0.02; // 9:16: the hold's push, as a fraction of the frame width per second
  /** S08's camera, a pure function of t, valid (and smooth) up to E.S09 + 0.3 for S09's hand-off. */
  function rig8(t) {
    const k = ease.inOutSine(seg(t, E.S08, T_PAN));
    const f = A8.map((v, i) => lerp(v, A8b[i], k));
    const cam = frameCam(den, f, vfov8, aspect);
    const p = panEase(seg(t, T_PAN, T_PAN_END));
    if (p > 0) {
      const tw = toWorld(den, PAN_TO);
      cam.target = cam.target.map((v, i) => lerp(v, tw[i], p));
      cam.pos = [cam.pos[0] + TRUCK * p, cam.pos[1], cam.pos[2]];
    }
    if (portrait && t > T_PAN_END) {
      // the hold drifts in along the view axis, easing up to a steady 2%/s over 0.3 s (so the
      // settle never steps, and S09's blend starts from a steady move)
      const dt = t - T_PAN_END, R = 0.3;
      const g = DRIFT * (dt < R ? (dt * dt) / (2 * R) : dt - R / 2);
      cam.pos = cam.pos.map((v, i) => lerp(v, cam.target[i], g));
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
    // (the released cloud dims with the fire as S09's plain den takes over: nothing is left to
    // vanish at the hand-off, where the drawing's props stop being posed)
    draw.pose(t, { times: STROKE_START, dur: STROKE_DUR, holdEnd: HOLD_END, release: RELEASE, minLaunch: E.S08 + 0.05, intensity: h, embers: (1 - 0.7 * seg(t, STROKE_START[0] - 0.3, STROKE_START[0]) * (1 - seg(t, HOLD_END, HOLD_END + 0.3))) });
    mantelL.visible = true; mlShadow.visible = true;
    hearthPool.visible = h > 0.001; hearthPool.material.opacity = (0.3 + 0.06 * Math.sin(t * 9.7) * Math.sin(t * 3.3)) * h;
  }

  const s08 = {
    id: 'S08', start: E.S08, end: E.S09,
    rig: rig8, // S09's pull-back continues this camera (ending.js s09Camera)
    handoffLook: { ...GRADE8, tint: INTERIOR_TINT }, // and eases its grade and the den's tint from these
    ...adaptiveBlur(rig8, portrait ? 1920 : 1080),
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
      den.mat.color.set(INTERIOR_TINT);
      // S09 (a continuous pull-back) starts from this camera and look, and eases its grade (and
      // the den's tint) from GRADE8 / INTERIOR_TINT to the wide's
      return { scene: world.scene, camera, look: look(grade, 1, { msaa: false, ...GRADE8, dof: { focus, aperture, maxBlur: 16 } }) };
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
