// S05 "Animal friends" and S06 "Where the day goes": one continuous camera.
//   S05 (whip-in 14.67, 15.11-17.75): the finished dollhouse in afternoon sun. A
//       crane from the ground floor to above the roof; each row gets one readable
//       action on sixteenths as it passes (hearts, steam, bubbles, moths, hops...).
//       The sprouted L sits on the chimney cap as the crane clears the roof.
//   S06 (17.75-21.28): the crane keeps rising and tips up into the sky while the
//       day time-lapses (the painted sky wipes to dusk, pixel clouds race), then
//       comes down and back to the hero wide of the house in its meadow. The twelve
//       lamps switch on one per sixteenth, bottom row first, fireflies rise, and a
//       push toward the kitchen hands over to S07.

import * as THREE from 'three';
import { makeBillboard, poseEmote } from '../world/fx.js';
import { makeMoths } from '../world/fire.js';
import { makeTile, setLocked, makeSprout, TILE_SCALE } from '../core/tiles.js';
import { ease, spring, seg, lerp, clamp, smooth, mulberry32 } from '../core/math.js';
import { bar, SIXTEENTH } from '../grid.js';
import { LAYOUT, GROUND_Y } from '../sets/world.js';
import { makeGrass, makeParticles } from '../world/env.js';
import { skyWipe, SKY_EDGE } from '../world/tod.js';
import { mm, dist, aim, setAspect, look, travelPx, blurFor } from './common.js';

const D2R = Math.PI / 180;

/** A small canvas texture drawn pixel by pixel, crisp when magnified. */
function pixelTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** A pixel sprite (always faces the camera) from a pixel texture. */
function pixelSprite(tex, w, h = w) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  s.scale.set(w, h, 1);
  s.userData.w = w; s.userData.h = h;
  return s;
}

/** A tiny aquarium bubble: a pale ring with a highlight. */
const bubbleTexture = () => pixelTexture(8, 8, (g) => {
  g.fillStyle = 'rgba(190,235,255,0.28)'; g.fillRect(2, 2, 4, 4);
  g.fillStyle = '#d8f4ff';
  for (const [x, y] of [[2, 0], [3, 0], [4, 0], [5, 0], [1, 1], [6, 1], [0, 2], [7, 2], [0, 3], [7, 3], [0, 4], [7, 4], [0, 5], [7, 5], [1, 6], [6, 6], [2, 7], [3, 7], [4, 7], [5, 7]]) g.fillRect(x, y, 1, 1);
  g.fillStyle = '#ffffff'; g.fillRect(2, 2, 2, 1); g.fillRect(2, 3, 1, 1);
});

/** A soft pixel steam puff (stepped alpha, no smooth gradients). */
const steamTexture = () => pixelTexture(12, 10, (g) => {
  const blobs = [[4, 5, 3.6], [7.5, 4.2, 3.4], [6, 6.5, 3.2]];
  for (let y = 0; y < 10; y++) for (let x = 0; x < 12; x++) {
    let d = 9;
    for (const [cx, cy, r] of blobs) d = Math.min(d, Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r);
    if (d > 1) continue;
    const a = d < 0.55 ? 0.9 : d < 0.8 ? 0.6 : 0.32;
    g.fillStyle = `rgba(255,252,246,${a})`; g.fillRect(x, y, 1, 1);
  }
});

/** A crumb of burrow earth. */
const dirtTexture = () => pixelTexture(3, 3, (g) => {
  g.fillStyle = '#6b4a2e'; g.fillRect(0, 0, 3, 3);
  g.fillStyle = '#8f6a45'; g.fillRect(0, 0, 2, 1);
  g.clearRect(2, 2, 1, 1);
});

/**
 * A pixel cumulus card: a lumpy dome of overlapping lobes whose bottoms all sit near
 * one base line, so the underside is a row of soft, shallow lobes (a clipped, ruler-flat
 * bottom read as a sticker). Shaded as one volume in five tones: a lit rim where the
 * light comes over the top, the body, a shade band, then an underside that deepens to
 * its lowest pixels. No outline: the painting's clouds have none.
 */
function cloudTexture(seed, tones) {
  const W = 128, H = 48;
  const rnd = mulberry32(seed);
  const cx = W * (0.44 + rnd() * 0.12);
  const B = H - 3; // the base line the lobes rest on
  const lobe = (x, r) => [x, B - r + rnd() * 1.6, r];
  const discs = [
    lobe(cx, 15 + rnd() * 3),
    lobe(cx - 17 - rnd() * 3, 11 + rnd() * 2), lobe(cx + 18 + rnd() * 3, 10 + rnd() * 2),
    lobe(cx - 32 - rnd() * 3, 7 + rnd() * 1.5), lobe(cx + 32 + rnd() * 3, 7 + rnd() * 1.5),
    lobe(cx - 44 - rnd() * 2, 4.5 + rnd()), lobe(cx + 43 + rnd() * 2, 4.5 + rnd()),
    [cx + 7 + rnd() * 4, B - 25 - rnd() * 3, 8 + rnd() * 2], [cx - 9 - rnd() * 3, B - 20 - rnd() * 2, 8 + rnd() * 2],
  ];
  const inside = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return false;
    for (const [dx, dy, r] of discs) if (Math.hypot(x + 0.5 - dx, (y + 0.5 - dy) * 1.1) < r) return true;
    return false;
  };
  // the lowest filled pixel of each column: the underside is shaded up from it
  const bottom = Array.from({ length: W }, (_, x) => { for (let y = H - 1; y >= 0; y--) if (inside(x, y)) return y; return -1; });
  return pixelTexture(W, H, (g) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      const under = bottom[x] - y; // 0 on the lowest pixel
      let c = tones[1];
      if (under < 1) c = tones[4];
      else if (under < 4) c = tones[3];
      else if (under < 7 || !inside(x + 2, y + 2)) c = tones[2];
      if (!inside(x - 1, y - 2) || !inside(x + 1, y - 2)) c = tones[0];
      g.fillStyle = c; g.fillRect(x, y, 1, 1);
    }
  });
}
const CLOUD_DAY = ['#ffffff', '#f3f5f9', '#e1e6f0', '#cbd4e5', '#b8c3da'];
// the dusk painting's own cloud colours (sampled): hot orange rims, coral bodies, rose-to-plum undersides
const CLOUD_DUSK = ['#ffae68', '#f0825c', '#dc6a5a', '#b95466', '#96497a'];

/**
 * Monotone cubic (Fritsch-Carlson) through knots [[t, v], ...], flat at both ends and
 * held outside them: the front slows and speeds up without ever reversing.
 */
function monotone(K, t) {
  if (t <= K[0][0]) return K[0][1];
  const n = K.length;
  if (t >= K[n - 1][0]) return K[n - 1][1];
  const hs = K.slice(1).map((k, i) => k[0] - K[i][0]);
  const d = K.slice(1).map((k, i) => (k[1] - K[i][1]) / hs[i]);
  const m = K.map((_, i) => {
    if (i === 0 || i === n - 1 || d[i - 1] * d[i] <= 0) return 0;
    const w1 = 2 * hs[i] + hs[i - 1], w2 = hs[i] + 2 * hs[i - 1];
    return (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
  });
  let i = 0;
  while (t > K[i + 1][0]) i++;
  const h = K[i + 1][0] - K[i][0], u = (t - K[i][0]) / h;
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  return h00 * K[i][1] + h10 * h * m[i] + h01 * K[i + 1][1] + h11 * h * m[i + 1];
}

/** A 0 -> 1 -> 0 bump over [0, d]. */
const bump = (u, d) => (u > 0 && u < d ? Math.sin(Math.PI * u / d) : 0);

export default async function make(ctx) {
  const { world, camera, E, portrait } = ctx;
  const { house, residents } = world;

  // ---------------- timing (derived on the grid; see the report for events.js)
  // Each row's three actions land on consecutive sixteenths, one beat apart per row,
  // starting on the off-eighth so the whip settles first.
  const ROW_T = [0, 1, 2, 3].map((r) => bar(9, 1 + r, 1));
  const ACT = (r, c) => ROW_T[r] + c * SIXTEENTH;
  const SKY_END = E.DUSK_START + 1.45;          // ~19.35 the painted sky has turned (a time-lapse: ahead of the light)
  const CRANE_END = E.ROOF_CLEAR + 0.5;          // the crane eases out while the camera tips up
  const TIP_END = E.S06 + (portrait ? 0.7 : 0.42); // ~18.45 (18.17 in 16:9) tipped up into the sky
  const DESC0 = E.S06 + 0.78;                    // ~18.53 the camera comes down and back
  const DESC1 = E.LAMPS[0] - 0.04;               // ~19.48 settled on the hero wide
  const L_HIDE = DESC0 + 0.3;                    // the L on the chimney leaves as the camera comes down and back

  const dusk = (t) => smooth(seg(t, E.DUSK_START, E.DUSK_END));
  // the wipe front's progress (tod.js skyWipe), through knots set below where the sun hands over
  const skyMix = (t) => monotone(SKY_KNOTS, t);
  const LAMP_ORDER = LAYOUT.flat();
  // each lamp pops on its sixteenth: a quick rise past full with a small overshoot that
  // settles (light and glow card), and its glow card swells a touch as it catches
  const LAMP_POP = 0.22;
  const lampPop = (t, id) => {
    const i = LAMP_ORDER.indexOf(id);
    return i < 0 ? -1 : t - (E.LAMPS[i] - 0.015);
  };
  const lampsAt = (t) => (id) => {
    const s = lampPop(t, id);
    if (s <= 0) return 0;
    return s >= LAMP_POP ? 1 : ease.outBack(s / LAMP_POP, 3.2);
  };

  // ---------------- the cast: where each one stands (room-local) and when they act
  const R = residents;
  const slot = (name) => ({ row: R[name].rm.row, col: R[name].rm.col });
  const actAt = (name) => { const s = slot(name); return ACT(s.row, s.col); };
  const A = Object.fromEntries(Object.keys(R).map((n) => [n, actAt(n)]));
  // Panko steps up to her stove (the pot on the painted range, uv 0.545 / 0.44)
  const kitchen = house.rooms.kitchen;
  const PANKO_X = (0.43 - 0.5) * kitchen.roomW;
  const POT = [kitchen.x + (0.545 - 0.5) * kitchen.roomW, kitchen.y + 0.47 * kitchen.roomH, -kitchen.roomD / 2 + 0.25];
  for (const r of Object.values(R)) world.track(r.ch);
  // the lamps' glow cards swell as they pop on (begin() restores their size every frame)
  for (const rm of Object.values(house.rooms)) for (const sp of rm.lamps || []) world.track(sp);
  // the day pollen is squeezed back toward the house for the crane: motes drifting within
  // a few units of the lens became bokeh discs the size of a room
  world.track(world.pollen.points);

  // ---------------- props (registered: hidden unless this shot shows them)
  const emoteOf = { ember: 'heart', archimedes: 'thought', chill: 'note', bamboo: 'sparkle' };
  const emotes = {};
  for (const [name, kind] of Object.entries(emoteOf)) emotes[name] = world.register(await makeBillboard(`ui/emote_${kind}.png`, 0.95));
  const steamTex = steamTexture();
  const steam = [0, 1, 2, 3, 4].map(() => world.register(pixelSprite(steamTex, 0.72, 0.6)));
  const bubbleTex = bubbleTexture();
  const bubbles = Array.from({ length: 9 }, () => world.register(pixelSprite(bubbleTex, 0.24)));
  const dirtTex = dirtTexture();
  const dirt = Array.from({ length: 6 }, () => world.register(pixelSprite(dirtTex, 0.15)));
  const moths = makeMoths({ px: 0.035, radius: 0.5 });
  world.register(moths.group);

  // the sprouted L, sitting on the cap of the chimney painted on the front gable
  // (roof.png: the cap spans px 164-240 of 792, its top at px 13 of 283; house.js
  // scales the card to rise + 0.4 tall, from y = height - 0.1, at z = depth / 2 + 0.16)
  const tileL = makeTile('L');
  setLocked(tileL, 1);
  const sprout = makeSprout();
  sprout.scale.setScalar(1);
  tileL.add(sprout);
  const heroL = new THREE.Group();
  heroL.add(tileL);
  heroL.scale.setScalar(TILE_SCALE);
  world.register(heroL);
  const roofW = (house.width + 1.6) * 0.98, roofRise = (house.width + 1.6) * 0.3;
  const capTop = house.height - 0.1 + (roofRise + 0.4) * (1 - 13 / 283);
  heroL.position.set((222 / 792 - 0.5) * roofW, capTop + TILE_SCALE * 1.22 / 2 + 0.005, house.roomD / 2 + 0.6 + 0.16 + 0.09);
  heroL.rotation.set(0, -0.28, 0);

  // the sky painting's own coordinates (sets/world.js builds it with band [0.32, 1.0]):
  // painting (u, v from the bottom) -> the backdrop's local plane
  const SKY_BAND = [0.32, 1.0];
  const skyLocal = (u, v, z = 0) => [(u - 0.5) * world.sky.userData.paintWidth, ((v - SKY_BAND[0]) / (SKY_BAND[1] - SKY_BAND[0]) - 0.5) * world.sky.userData.height, z];

  // the afternoon sun goes down with the light: an additive warm glow (a disc the size of
  // the painted one, and its halo) on the backdrop takes over the painted afternoon sun as
  // the wipe front reaches it, so the front never slices a hard sun, then slips down toward
  // the ridge where the dusk painting has its sun, fading out before that one is uncovered
  const sunTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,250,232,1)'); gr.addColorStop(0.2, 'rgba(255,246,214,1)'); gr.addColorStop(0.24, 'rgba(255,226,170,0.55)');
    gr.addColorStop(0.45, 'rgba(255,200,130,0.18)'); gr.addColorStop(1, 'rgba(255,170,100,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const sunGlow = world.register(new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })), world.sky);
  const SUN_UV_A = [0.840, 0.848], SUN_UV_B = [0.379, 0.744];
  const bandY = (v) => (v - SKY_BAND[0]) / (SKY_BAND[1] - SKY_BAND[0]);
  const SUN_R = 0.05; // the painted suns' radius with their bright core, in band heights
  // One clean sweep of the wipe front, top to bottom (a crawl between the two suns
  // stalled the front across the sky, and its rippled edge broke into pink-over-blue islands)
  const SKY_KNOTS = [[E.DUSK_START, 0], [SKY_END, 1]];
  // the glow's path: from the afternoon sun toward the ridge just above the dusk sun
  const SUN_A = skyLocal(...SUN_UV_A, 1.5), SUN_RIDGE = skyLocal(SUN_UV_B[0], SUN_UV_B[1] + 0.03, 1.5);
  // Only one sun at a time, timed on the wipe front: the glow comes up over the painted
  // afternoon sun just before the front reaches it, holds there while the front wipes that
  // sun away, and only then slips toward the ridge, gone before the front uncovers the
  // painted dusk sun.
  const wipeAt = (uv, dy, level) => {
    let a = E.DUSK_START - 0.5, b = SKY_END + 0.5;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (skyWipe(skyMix(m), uv[0], bandY(uv[1]) + dy) < level) a = m; else b = m; }
    return (a + b) / 2;
  };
  const A_TOUCH = wipeAt(SUN_UV_A, SUN_R, 0.02), A_GONE = wipeAt(SUN_UV_A, -SUN_R, 0.98);
  const B_TOUCH = wipeAt(SUN_UV_B, SUN_R, 0.02);
  const SUN_T = [A_TOUCH - 0.14, A_TOUCH, A_GONE - 0.05, B_TOUCH - 0.01];
  const SUN_GLIDE = 0.3; // how far toward the ridge it slips while it fades

  // racing pixel clouds in the painted sky over the mountains (a day card and a dusk card
  // per cloud, crossfaded as the wipe front passes); cards on the backdrop, flying at a
  // height between the peaks and the top of the frame, and only right of the big painted
  // tree: each one forms as it clears the canopy (u ~0.3) and thins out at the far edge
  const rnd = mulberry32(505);
  const clouds = [];
  const CLOUD_V = [0.872, 0.858, 0.884, 0.866];
  for (let i = 0; i < 4; i++) {
    const w = 22 + rnd() * 6;
    const geo = new THREE.PlaneGeometry(w, w * 48 / 128);
    // magnified with the same soft filtering as the painting behind them (it is upscaled
    // about 2x): crisp nearest-neighbour edges made the cards read as stickers on it
    const mk = (tones) => { const tex = cloudTexture(900 + i, tones); tex.magFilter = THREE.LinearFilter; return world.register(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false })), world.sky); };
    clouds.push({ day: mk(CLOUD_DAY), dusk: mk(CLOUD_DUSK), half: w / 2 / world.sky.userData.paintWidth, u0: 0.3 + i * 0.17 + rnd() * 0.05, v: CLOUD_V[i], speed: 0.16 + rnd() * 0.08 });
  }

  // a denser meadow in front of the house for the hero wide: from 55 units away the
  // world's grass reads as a bare plane with a few tufts. Unlit cards tinted to the
  // evening light (lit, 3000 alpha-tested cards under the twelve room lights more than
  // doubled the frame cost on SwiftShader).
  const meadow = makeGrass({ count: 2400, height: 0.8, area: { x0: -24, x1: 24, z0: 3.6, z1: 16, y: GROUND_Y }, seed: 77 });
  // Where the meadow meets the painting: the far ground is fogged lighter than the
  // painted meadow it runs into, so the hero wide showed a hard, bright horizon line. A
  // decal on the far ground takes on the painting's own (blurred) dusk colours just above
  // the line where the ground meets it, column by column as the backdrop shows them
  // (its out-of-focus margins included, see tod.js SKY_EDGE), and fades out toward the house, so the real
  // meadow runs on into the painted one.
  const SKY = world.sky.userData, SKY_Y0 = world.sky.position.y - SKY.height / 2;
  const seamV = SKY_BAND[0] + ((GROUND_Y + 1.5 - SKY_Y0) / SKY.height) * (SKY_BAND[1] - SKY_BAND[0]);
  const FAR_Z = world.ground.position.z - 180, SEAM_DEPTH = 120, SEAM_W = 640;
  const seamMap = (() => {
    const read = (tex) => { const img = tex.image; return { img, d: img.getContext('2d').getImageData(0, 0, img.width, img.height).data }; };
    const mid = read(SKY.mat.uniforms.midB.value), heavy = read(SKY.mat.uniforms.blurB.value), row = read(SKY.mat.uniforms.rowB.value);
    const at = ({ img, d }, u, v) => { const x = Math.min(img.width - 1, Math.max(0, Math.round(u * (img.width - 1)))), y = Math.min(img.height - 1, Math.max(0, Math.round((1 - v) * (img.height - 1)))); const o = (y * img.width + x) * 4; return [d[o], d[o + 1], d[o + 2]]; };
    const mixA = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
    const sstep = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    const margin = (SKY.width / SKY.paintWidth - 1) / 2;
    const hz = [201, 140, 134];
    const c = document.createElement('canvas'); c.width = 256; c.height = 1;
    const g = c.getContext('2d');
    // the camera sits near x = 0, about 230 units from the backdrop and 220 from the far edge
    const spread = (world.sky.position.z - 58) / (FAR_Z - 58);
    for (let i = 0; i < 256; i++) {
      const xb = ((i + 0.5) / 256 - 0.5) * SEAM_W * spread;
      const pu = (xb / SKY.width + 0.5) * (1 + 2 * margin) - margin;
      const out = Math.max(-pu, pu - 1), uc = Math.min(1, Math.max(0, pu));
      // the backdrop's own edge treatment (tod.js SKY_EDGE): the painting's edge out of
      // focus, and beyond it its blurred edge column carried on, softening into the
      // heavier copy, the row colours and the haze
      let col = at(mid, uc, seamV);
      if (out > 0) {
        col = mixA(col, at(heavy, uc, seamV), sstep(0, SKY_EDGE.heavy, out));
        col = mixA(col, at(row, 0.5, seamV), sstep(0, SKY_EDGE.rowBlend, out));
        col = mixA(col, hz, sstep(0, SKY_EDGE.hazeEnd, out) * SKY_EDGE.haze);
      }
      g.fillStyle = `rgb(${col.map((v) => Math.round(v)).join(',')})`; g.fillRect(i, 0, 1, 1);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
    // the mean of the middle half, for the evening haze (below)
    const d = g.getImageData(64, 0, 128, 1).data, m = [0, 0, 0];
    for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) m[k] += d[i + k] / 128;
    t.userData.mean = new THREE.Color().setRGB(m[0] / 255, m[1] / 255, m[2] / 255, THREE.SRGBColorSpace).multiplyScalar(0.95);
    return t;
  })();
  const seamAlpha = (() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 128;
    const g = c.getContext('2d');
    for (let y = 0; y < 128; y++) {
      const k = Math.min(1, Math.max(0, (y + 0.5) / 128 / 0.85)); // canvas top = the far edge
      const a = 1 - k * k * (3 - 2 * k);
      g.fillStyle = `rgb(${Math.round(a * 255)},${Math.round(a * 255)},${Math.round(a * 255)})`; g.fillRect(0, y, 4, 1);
    }
    return new THREE.CanvasTexture(c);
  })();
  const seam = world.register(new THREE.Mesh(new THREE.PlaneGeometry(SEAM_W, SEAM_DEPTH), new THREE.MeshBasicMaterial({ map: seamMap, alphaMap: seamAlpha, color: new THREE.Color(0.95, 0.95, 0.95), transparent: true, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })));
  seam.rotation.x = -Math.PI / 2;
  seam.position.set(0, GROUND_Y + 0.08, FAR_Z + SEAM_DEPTH / 2);
  // shared with S09's dusk wide, which looks at the same horizon
  world.duskSeam = { mesh: seam, mean: seamMap.userData.mean };
  for (const m of meadow.group.children) {
    m.material = new THREE.MeshBasicMaterial({ map: m.material.map, alphaTest: 0.5, side: THREE.DoubleSide, color: '#8a7272' });
    m.receiveShadow = false;
  }
  world.register(meadow.group);
  const MEADOW_EVE = new THREE.Color('#a79d84'), MEADOW_DUSK = new THREE.Color('#8a7272');

  // fireflies for the wide: the world's are sized for close shots and vanish at 55 units.
  // Pair separation (spec 6.2): no two resting points share a height within 1.2 units
  // while standing within 2.6 of each other across, so no two ever read as a pair of eyes.
  const flies = makeParticles({ count: 60, boxMin: [-21, -0.5, 4], boxMax: [21, 10, 42], color: '#ffd76a', size: 40, intensity: 4.2, drift: [1.0, 0.45, 1.0], seed: 612 });
  flies.uniforms.pxScale.value = ctx.pxScale;
  {
    const a = flies.points.geometry.attributes.position.array;
    const tooClose = (i) => { for (let j = 0; j < i; j++) if (Math.abs(a[i * 3 + 1] - a[j * 3 + 1]) < 1.2 && Math.hypot(a[i * 3] - a[j * 3], a[i * 3 + 2] - a[j * 3 + 2]) < 2.6) return true; return false; };
    for (let i = 0; i < a.length / 3; i++) {
      for (let k = 0; k < 24 && tooClose(i); k++) { a[i * 3] = -21 + ((a[i * 3] + 21 + 7.3) % 42); a[i * 3 + 1] = -0.5 + ((a[i * 3 + 1] + 0.5 + 2.9) % 10.5); }
    }
  }
  world.register(flies.points);

  // ---------------- behaviour of the cast at time t (world.pose + post-pose tweaks)
  function castBehaviours(t) {
    const flick = (t0, dur) => (t > t0 && t < t0 + dur && Math.floor((t - t0) * 8) % 2 === 0 ? 'talk' : 'idle');
    const stir = Math.sin(t * 2 * Math.PI * 1.1);
    return {
      ember: { facing: -1, pose: flick(A.ember - 0.05, 0.55) },                 // faces her fire
      panko: { walkFrom: PANKO_X, facing: 1, bob: 0.012 * (1 + stir) },         // at her stove
      archimedes: { pose: flick(A.archimedes, 0.3) },
      thyme: { bob: hopHeight(t - A.thyme) },
      vesper: { bob: 0.24 * bump(t - A.vesper, 0.26) },
      fennick: { bob: 0.08 * (bump(t - A.fennick, 0.1) + bump(t - A.fennick - 0.13, 0.1)) },
    };
  }
  function hopHeight(u) {
    const h = (v) => (v > 0 && v < 0.2 ? 4 * (v / 0.2) * (1 - v / 0.2) : 0);
    return 0.42 * h(u) + 0.32 * h(u - 0.24);
  }

  function poseCast(t) {
    // a slow breath for everyone, each on its own phase (no one freezes, no one is in unison)
    for (const r of Object.values(R)) {
      r.ch.scale.y *= 1 + 0.014 * Math.sin(t * (2.6 + r.seed * 0.013) + r.seed);
    }
    const sc = (name) => R[name].ch.scale;
    // Panko rocks as she stirs; Archimedes tilts his head at his thought
    R.panko.ch.rotation.z = 0.035 * Math.sin(t * 2 * Math.PI * 1.1);
    R.archimedes.ch.rotation.z = 0.07 * (spring(t - A.archimedes, 2.2, 0.5) - spring(t - A.archimedes - 0.7, 2.2, 0.5));
    // Fennick's ears twitch up twice (a stretch)
    const tw = bump(t - A.fennick, 0.1) + bump(t - A.fennick - 0.13, 0.1);
    sc('fennick').y *= 1 + 0.1 * tw; sc('fennick').x *= 1 - 0.035 * tw;
    // Warren digs: three quick forward dips
    let dig = 0;
    for (let k = 0; k < 3; k++) dig += bump(t - A.warren - k * 0.13, 0.11);
    sc('warren').y *= 1 - 0.07 * dig; sc('warren').x *= 1 + 0.05 * dig;
    R.warren.ch.rotation.z = -0.1 * dig * R.warren.facing;
    // Thyme lands soft from each hop
    const land = bump(t - A.thyme - 0.2, 0.07) + bump(t - A.thyme - 0.44, 0.07);
    sc('thyme').y *= 1 - 0.08 * land; sc('thyme').x *= 1 + 0.05 * land;
    // Moss fluffs up
    const fl = bump(t - A.moss, 0.42);
    sc('moss').x *= 1 + 0.2 * fl; sc('moss').y *= 1 + 0.1 * fl;
    // Vesper squashes a touch as she lands
    const vl = bump(t - A.vesper - 0.26, 0.07);
    sc('vesper').y *= 1 - 0.07 * vl;
  }

  /** World position of a room-local point of a resident's room. */
  const inRoom = (name, lx, ly, lz) => { const rm = R[name].rm; return [rm.x + lx, rm.y + ly, lz]; };

  function poseProps(t, aperture) {
    // emote pops above the head
    for (const [name, sp] of Object.entries(emotes)) {
      const r = R[name];
      const x = r.ch.position.x + 0.12 * (name === 'ember' ? -1 : 1);
      const p = inRoom(name, x, r.h + 0.22, r.z0 + 0.2);
      sp.position.set(p[0], p[1], p[2]); sp.userData.y0 = p[1];
      poseEmote(sp, t - A[name], { hold: 0.95, rise: 0.35, fade: 0.3 });
    }
    // Panko's pot sends up a puff of steam
    steam.forEach((s, i) => {
      const u = seg(t, A.panko + i * 0.08, A.panko + i * 0.08 + 1.0);
      s.visible = u > 0 && u < 1;
      if (!s.visible) return;
      const k = ease.outCubic(u);
      s.position.set(POT[0] + (i - 2) * 0.1 + Math.sin(u * 5 + i) * 0.08, POT[1] + 0.15 + k * 1.1, POT[2] + i * 0.02);
      const g = 0.55 + 0.8 * k;
      s.scale.set(s.userData.w * g, s.userData.h * g, 1);
      s.material.opacity = Math.min(1, u * 8) * (1 - u) * 0.95;
    });
    // Axel's bubbles rise from his snorkel
    const ax = R.axel;
    bubbles.forEach((b, i) => {
      const t0 = A.axel + i * 0.075;
      const u = seg(t, t0, t0 + 1.25);
      b.visible = u > 0 && u < 1;
      if (!b.visible) return;
      const base = inRoom('axel', ax.ch.position.x + 0.22 + (i % 3) * 0.05, ax.ch.position.y + ax.h * 0.96, ax.z0 + 0.12);
      b.position.set(base[0] + Math.sin(u * 9 + i * 1.7) * 0.07, base[1] + ease.outQuad(u) * 1.35, base[2]);
      const s = (0.7 + (i % 3) * 0.25) * (0.8 + 0.3 * u);
      b.scale.set(b.userData.w * s, b.userData.h * s, 1);
      b.material.opacity = Math.min(1, u * 10) * (1 - seg(u, 0.75, 1));
    });
    // Sloane's moths (all three called Gerald) flutter out of her fur and loop over the
    // hammock side of her head, above her eyes (looping at eye height, two pale moths at
    // her face read as a second pair of eyes under the crane's blur)
    const sl = R.sloane;
    const mk = t < A.sloane ? 0 : clamp(spring(t - A.sloane, 2.2, 0.55), 0, 1.2);
    moths.group.visible = mk > 0.02;
    if (moths.group.visible) {
      moths.pose(t, camera);
      const hp = inRoom('sloane', sl.ch.position.x - 0.4, sl.h * 1.08, sl.z0 + 0.15);
      moths.group.position.set(hp[0], hp[1], hp[2]);
      moths.group.scale.setScalar(Math.max(0.001, mk));
    }
    // earth flicks back from Warren's paws
    const wa = R.warren;
    dirt.forEach((d, i) => {
      const t0 = A.warren + Math.floor(i / 2) * 0.13 + 0.04;
      const u = seg(t, t0, t0 + 0.42);
      d.visible = u > 0 && u < 1;
      if (!d.visible) return;
      const dir = -wa.facing * (0.55 + (i % 2) * 0.35);
      const p = inRoom('warren', wa.ch.position.x + 0.25 * wa.facing + dir * u, 0.12 + (0.5 + (i % 2) * 0.2) * 4 * u * (1 - u), wa.z0 + 0.25);
      d.position.set(p[0], p[1], p[2]);
      d.material.opacity = 1 - seg(u, 0.7, 1);
    });
    // the L on the chimney cap, sprout swaying
    heroL.visible = t < L_HIDE;
    sprout.rotation.z = Math.sin(t * 2.3) * 0.07;
    // the time-lapse clouds race across the sky, taking the dusk colours as the wipe
    // front passes them (the backdrop's own wipe, tod.js skyWipe)
    const sm = skyMix(t);
    const on = seg(t, E.S06 - 0.5, E.S06) * (1 - seg(t, DESC1 - 0.3, DESC1 + 0.4));
    // while the lens is wide open (aperture under 5) the white day cards read as a haze:
    // they stay at half strength until it stops down
    const dayCap = lerp(0.5, 1, smooth(seg(aperture, 4.5, 5.5)));
    for (const c of clouds) {
      const u = c.u0 + c.speed * (t - E.S06);
      const p = skyLocal(u, c.v, 2 + c.u0);
      const k = skyWipe(sm, u, bandY(c.v));
      const edge = seg(u - c.half, 0.3, 0.4) * (1 - seg(u + c.half, 1.0, 1.08)); // clear of the tree, and of the painting's edge
      for (const [m, a] of [[c.day, (1 - k) * dayCap], [c.dusk, k]]) {
        m.visible = on * edge > 0.001 && a > 0.001;
        m.position.set(p[0], p[1], p[2]);
        m.material.opacity = on * edge * a * 0.85;
      }
    }
    // the sun going down: the glow takes over the painted afternoon sun as the wipe front
    // reaches it, then slips toward the ridge and fades before the dusk sun shows (SUN_T)
    const gIn = ease.inOutSine(seg(t, SUN_T[0], SUN_T[1]));
    const gl = seg(t, SUN_T[2], SUN_T[3]);
    const gk = SUN_GLIDE * ease.inQuad(gl);
    const ga = gIn * (1 - ease.inOutSine(gl));
    sunGlow.visible = ga > 0.01;
    sunGlow.position.set(lerp(SUN_A[0], SUN_RIDGE[0], gk), lerp(SUN_A[1], SUN_RIDGE[1], gk), 1.5);
    const gs = lerp(24, 20, gl);
    sunGlow.scale.set(gs, gs, 1);
    sunGlow.material.opacity = ga;
    sunGlow.material.color.set('#ffd08a').lerp(new THREE.Color('#ffb070'), gl);
  }

  // ---------------- camera: a direction rig (position, yaw, pitch) so the crane can tip up
  const dirPoint = (pos, yaw, pitch, d = 20) => [pos[0] + Math.sin(yaw) * Math.cos(pitch) * d, pos[1] + Math.sin(pitch) * d, pos[2] - Math.cos(yaw) * Math.cos(pitch) * d];
  const angles = (pos, target) => {
    const dx = target[0] - pos[0], dy = target[1] - pos[1], dz = target[2] - pos[2];
    return { yaw: Math.atan2(dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
  };
  const mixRig = (a, b, k) => ({
    pos: a.pos.map((v, i) => lerp(v, b.pos[i], k)), yaw: lerp(a.yaw, b.yaw, k), pitch: lerp(a.pitch, b.pitch, k),
    fov: lerp(a.fov, b.fov, k), focus: lerp(a.focus, b.focus, k), aperture: lerp(a.aperture, b.aperture, k), roll: lerp(a.roll || 0, b.roll || 0, k),
  });
  const fromAim = (pos, target, fov, extra = {}) => ({ pos, ...angles(pos, target), fov, focus: dist(pos, target), aperture: 10, roll: 0, ...extra });

  // Per-aspect rig values. The crane settles at the ridge while it tips up, so the roof and
  // chimney stay in the bottom of frame under the time-lapse sky (16:9 on a 45 mm, whose
  // wider view shows the soft painted margins, tod.js SKY_EDGE); 9:16 takes in the whole
  // painted vista over the roof. The hero wide is low, the house standing against the sunset.
  const P = portrait ? {
    craneX: [0, 0], craneY: [3.4, 31], craneZ: 21, lookDrop: 0.5, fov: 54,
    tipPitch: 7, tipFov: 40, skyRise: -2.5, skyBack: 4,
    hero: fromAim([0, 9, 40], [0, 13.5, 0], 53, { aperture: 7 }),
    heroDrift: [0, 0, 0],
    kitchen: fromAim([0.2, 2.9, 15.5], [0, 2.35, 0], 38, { aperture: 8 }),
  } : {
    craneX: [-2.5, 0], craneY: [2.0, 29], craneZ: 24, lookDrop: 0.5, fov: mm(40),
    tipPitch: 11, tipFov: mm(45), skyRise: -3.0, skyBack: 4,
    hero: fromAim([0, 6.2, 58], [0, 13.4, 0], mm(40), { aperture: 6.5 }),
    heroDrift: [0.35, 0, 0],
    kitchen: fromAim([0.5, 3.5, 14], [0, 2.3, 0], mm(50), { aperture: 8 }),
  };
  const HERO_PUSH = 2.0;
  const residentsZ = -kitchen.roomD / 2 + 0.75;

  function rig(t) {
    // S05 crane: a near-linear rise (only a third of an inOut ease, so the whip lands into
    // it and it is still moving when the camera tips up), so each row passes the centre of
    // frame close to its beat, slowly enough that every resident reads as they go by
    const u = seg(t, E.S05, CRANE_END);
    const kc = lerp(u, ease.inOutSine(u), 0.35);
    const ko = ease.inOutSine(seg(t, E.S05, E.ROOF_CLEAR));
    let y = lerp(P.craneY[0], P.craneY[1], kc);
    const x = lerp(P.craneX[0], P.craneX[1], ko);
    let z = P.craneZ;
    // the 6 degree orbit: from left of centre, aimed at the house, square on by the roof
    const yaw = Math.atan2(-x, z);
    let pitch = -Math.atan2(P.lookDrop, z);
    const roll = portrait ? 0 : 0.5 * (1 - ko);
    // whip-in: the camera is still falling and tilting down into the start pose
    if (t < E.S05) {
      const w = 1 - ease.outCubic(seg(t, E.WHIP, E.S05));
      y += 4.5 * w; z += 2 * w; pitch += 11 * D2R * w;
    }
    // tip up into the sky and lengthen the lens, still drifting up and back
    // (9:16 tips sooner: its tall frame would otherwise look down past the roof onto
    // the plain behind the house)
    const tip = ease.inOutSine(seg(t, E.ROOF_CLEAR - (portrait ? 0.75 : 0.3), TIP_END));
    const zoom = ease.inOutSine(seg(t, E.ROOF_CLEAR - (portrait ? 0.45 : 0), TIP_END));
    const drift = ease.inOutSine(seg(t, E.ROOF_CLEAR - 0.3, DESC0));
    pitch = lerp(pitch, P.tipPitch * D2R, tip);
    y += P.skyRise * drift; z += P.skyBack * drift;
    const sky = {
      pos: [x, y, z], yaw, pitch, fov: lerp(P.fov, P.tipFov, zoom),
      focus: lerp(z - residentsZ, 190, tip), aperture: lerp(8, 3, tip), roll,
    };
    if (t < DESC0) return sky;
    // the hero wide, with a gentle push and drift while the lamps come on
    const heroAt = (u) => {
      const k = ease.inOutSine(u);
      const d = dirPoint(P.hero.pos, P.hero.yaw, P.hero.pitch, 1);
      const pos = P.hero.pos.map((v, i) => v + (d[i] - v) * HERO_PUSH * k + P.heroDrift[i] * k);
      return { ...P.hero, pos, focus: Math.hypot(pos[2] - residentsZ, pos[1] - 8) };
    };
    if (t < DESC1) {
      // come down and back from the sky to the hero wide
      const s0 = rig(DESC0 - 1e-4);
      return mixRig(s0, heroAt(0), ease.inOutSine(seg(t, DESC0, DESC1)));
    }
    if (t < E.PUSH_KITCHEN) return heroAt(seg(t, DESC1, E.PUSH_KITCHEN));
    // push toward the kitchen, arriving on it at the cut. The distance to the house
    // closes at an eased constant ratio (not a constant speed), so the image grows
    // evenly and the motion blur never has one frame that races.
    const h1 = heroAt(1);
    const kitchenRig = { ...P.kitchen, focus: P.kitchen.pos[2] - residentsZ };
    const d0 = h1.pos[2] - residentsZ, d1 = kitchenRig.pos[2] - residentsZ;
    const d = d0 * Math.pow(d1 / d0, ease.inOutSine(seg(t, E.PUSH_KITCHEN, E.S07)));
    return mixRig(h1, kitchenRig, (d0 - d) / (d0 - d1));
  }

  /**
   * Motion blur from how far the image moves across the shutter (common.js travelPx:
   * rotation, lateral travel against the focus distance, dolly and zoom), with enough
   * subframes and a short enough shutter that pixel edges smear instead of stepping
   * (common.js blurFor). Portrait measures against its 1920 px height.
   */
  const frameH = portrait ? 1920 : 1080;
  const rigAim = (t) => { const r = rig(t); return { pos: r.pos, target: dirPoint(r.pos, r.yaw, r.pitch, 1), fov: r.fov, focus: r.focus }; };
  const motion = (t) => blurFor(travelPx(rigAim, t, frameH));

  function pose(t) {
    setAspect(camera, portrait);
    const r = rig(t);
    const target = dirPoint(r.pos, r.yaw, r.pitch, 20);
    aim(camera, r.pos, target, r.fov, r.roll);
    const dk = dusk(t);
    const grade = world.pose(t, { dusk: dk, lamps: lampsAt(t), focus: r.focus, aperture: r.aperture, camera, behaviours: castBehaviours(t) });
    // the painted sky runs ahead of the light, a time-lapse seen while the lens is up there
    // (17.9-19.3; the house and ground keep the spec's 17.9-20.6 dusk ramp)
    const sm = skyMix(t);
    world.sky.userData.mat.uniforms.mixv.value = sm;
    world.sky.userData.mat.uniforms.bright.value = lerp(1.0, 0.95, sm);
    // fireflies rise from their cue (the dusk ramp alone would bring them in early)
    const fu = world.flies.uniforms.opacity;
    fu.value = Math.min(fu.value, ease.outCubic(seg(t, E.FIREFLIES, E.FIREFLIES + 0.7)));
    // on the wide the lamps have to read room by room from 55 units away: their light and
    // glow cards run hotter there, back to the house's own level by the end of the push
    // (so the kitchen matches S07 at the cut); every lamp only ever rises
    const hot = 1 + 0.9 * (1 - ease.inOutSine(seg(t, E.PUSH_KITCHEN, E.S07)));
    for (const [id, rm] of Object.entries(house.rooms)) {
      if (!rm.light) continue;
      // each lamp catches with a flash that reads room by room from the wide: the room
      // light, the glow card and its size all swell past their settled level and back
      const pop = bump(lampPop(t, id), 0.3);
      rm.light.intensity *= hot * (1 + 1.6 * pop);
      for (const sp of rm.lamps) {
        sp.material.opacity = Math.min(1, sp.material.opacity * (0.5 + 0.5 * hot) * (1 + 1.2 * pop));
        sp.scale.multiplyScalar(1 + 0.8 * pop);
      }
    }
    // the chimney smoke thins while the lens looks up through it (it reads as a smear), and
    // only comes back once the camera has settled on the wide
    const thin = 1 - 0.75 * seg(t, E.S06 - 0.1, E.S06 + 0.4) * (1 - seg(t, DESC1, DESC1 + 0.5));
    for (const p of world.puffs) p.s.material.opacity *= thin;
    // our fireflies rise out of the grass from their cue
    const fk = ease.outCubic(seg(t, E.FIREFLIES, E.FIREFLIES + 1.1));
    flies.points.visible = fk > 0.001;
    flies.points.position.y = -1.6 * (1 - fk);
    flies.uniforms.time.value = t; flies.uniforms.focus.value = r.focus; flies.uniforms.aperture.value = r.aperture; flies.uniforms.opacity.value = fk;
    meadow.group.visible = t >= DESC0;
    seam.visible = t >= DESC0;
    // on the wide the evening haze takes the painted meadow's colour, so the far ground
    // fades into the painting instead of into a paler band (world.pose sets the fog again
    // every frame, so this never outlives the shot)
    if (seam.visible) world.scene.fog.color.lerp(seamMap.userData.mean, seg(t, DESC0, DESC1) * (1 - seg(t, E.PUSH_KITCHEN, E.S07)));
    if (meadow.group.visible) {
      meadow.update(t, 1);
      for (const m of meadow.group.children) m.material.color.set(MEADOW_EVE).lerp(MEADOW_DUSK, seg(dk, 0.4, 1));
    }
    world.pollen.points.position.z = -4; world.pollen.points.scale.z = 0.5;
    poseCast(t);
    poseProps(t, r.aperture);
    return {
      scene: world.scene, camera,
      look: look(grade, dk, { msaa: false, exposure: grade.exposure * (1 + 0.07 * dk + 0.08 * ease.inOutSine(seg(t, E.PUSH_KITCHEN, E.S07))), dof: { focus: r.focus, aperture: r.aperture, maxBlur: 14 } }),
    };
  }

  return [
    {
      id: 'S05', start: E.WHIP, end: E.ROOF_CLEAR,
      transition: { type: 'whip', dur: E.S05 - E.WHIP, dir: [0, -1] },
      mb: (t) => motion(t).n, shutter: (t) => motion(t).shutter, pose,
    },
    { id: 'S06', start: E.ROOF_CLEAR, end: E.S07, mb: (t) => motion(t).n, shutter: (t) => motion(t).shutter, pose },
  ];
}
