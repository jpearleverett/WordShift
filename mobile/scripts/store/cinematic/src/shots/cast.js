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
import { makeGrass } from '../world/env.js';
import { mm, dist, aim, setAspect, look } from './common.js';

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
 * A pixel cumulus card: one tall dome with two shoulders and two small ends on a
 * flat base, shaded as a single silhouette (top-left rim light, a lower shade band,
 * a darker base), in four tones; the painting's clouds have no outline.
 */
function cloudTexture(seed, tones) {
  const W = 112, H = 40;
  const rnd = mulberry32(seed);
  const cx = W * (0.4 + rnd() * 0.2);
  const discs = [
    [cx, H - 17, 13 + rnd() * 3],
    [cx - 17 - rnd() * 4, H - 12, 9 + rnd() * 2], [cx + 17 + rnd() * 4, H - 11, 8 + rnd() * 2],
    [cx - 32 - rnd() * 4, H - 8, 5 + rnd() * 2], [cx + 33 + rnd() * 4, H - 8, 5 + rnd() * 2],
  ];
  if (rnd() < 0.7) discs.push([cx + 7 + rnd() * 5, H - 23, 7 + rnd() * 2]);
  const inside = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H - 4) return false;
    for (const [dx, dy, r] of discs) if (Math.hypot(x + 0.5 - dx, (y + 0.5 - dy) * 1.12) < r) return true;
    return false;
  };
  return pixelTexture(W, H, (g) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      let c = tones[1];
      if (y >= H - 6) c = tones[3];
      else if (y >= H - 11 || !inside(x + 2, y + 1)) c = tones[2];
      if (!inside(x - 1, y - 2) || !inside(x, y - 2)) c = tones[0];
      g.fillStyle = c; g.fillRect(x, y, 1, 1);
    }
  });
}
const CLOUD_DAY = ['#ffffff', '#f1f4f8', '#cdd7e8', '#b4c1da'];
const CLOUD_DUSK = ['#ffe0b0', '#f7b193', '#c98597', '#9b6c93'];

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
  const SKY_END = E.LAMPS[0] + 0.08;            // the painted sky has turned (spec 17.9-19.6)
  const CRANE_END = E.ROOF_CLEAR + 0.5;          // the crane eases out while the camera tips up
  const TIP_END = E.S06 + 0.7;                   // ~18.45 tipped up into the sky
  const DESC0 = bar(11, 1);                      // ~18.63 the camera comes down and back, on the bar
  const DESC1 = E.LAMPS[0] - 0.04;               // ~19.48 settled on the hero wide
  const L_HIDE = E.S06 + 0.7;                    // the L on the chimney leaves with the roof

  const dusk = (t) => smooth(seg(t, E.DUSK_START, E.DUSK_END));
  const skyMix = (t) => smooth(seg(t, E.DUSK_START, SKY_END));
  const LAMP_ORDER = LAYOUT.flat();
  const lampsAt = (t) => (id) => {
    const i = LAMP_ORDER.indexOf(id);
    return i < 0 ? 0 : ease.outCubic(seg(t, E.LAMPS[i] - 0.015, E.LAMPS[i] + 0.07));
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
  const moths = makeMoths({ px: 0.042, radius: 0.5 });
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

  // the painted sun glides from its afternoon place down to where the dusk painting
  // has it, just over the ridge, while the painting wipes to dusk (an additive glow on
  // the backdrop, no disc of its own, so the two painted suns stay the hero)
  const sunTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,250,232,1)'); gr.addColorStop(0.2, 'rgba(255,246,214,1)'); gr.addColorStop(0.24, 'rgba(255,226,170,0.55)');
    gr.addColorStop(0.45, 'rgba(255,200,130,0.18)'); gr.addColorStop(1, 'rgba(255,170,100,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const sunGlow = world.register(new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })), world.sky);
  const SUN_A = skyLocal(0.840, 0.848, 1.5), SUN_B = skyLocal(0.379, 0.744, 1.5);
  const SUN_C = [lerp(SUN_A[0], SUN_B[0], 0.45), Math.max(SUN_A[1], SUN_B[1]) + 6, 1.5]; // the arc's control point, above the peaks
  // glow in (over the fading afternoon sun), glide, glow out (over the dusk sun)
  const SUN_T = [E.DUSK_START + 0.3, E.DUSK_START + 0.6, E.DUSK_START + 1.05, E.DUSK_START + 1.4];

  // racing pixel clouds high in the painted sky (a day card and a dusk card per cloud,
  // crossfaded with the wipe); cards on the backdrop, so they never cross a mountain
  const rnd = mulberry32(505);
  const clouds = [];
  for (let i = 0; i < 4; i++) {
    const w = 20 + rnd() * 8;
    const geo = new THREE.PlaneGeometry(w, w * 40 / 112);
    const mk = (tones) => world.register(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: cloudTexture(900 + i, tones), transparent: true, depthWrite: false, fog: false })), world.sky);
    clouds.push({ day: mk(CLOUD_DAY), dusk: mk(CLOUD_DUSK), u0: -0.35 + i * 0.3 + rnd() * 0.08, v: 0.9 + rnd() * 0.06, speed: 0.24 + rnd() * 0.1, w });
  }

  // a denser meadow in front of the house for the hero wide: from 55 units away the
  // world's grass reads as a bare plane with a few tufts
  // (unlit cards tinted to the dusk light: lit, 3000 alpha-tested cards under the twelve
  // room lights cost 3.5 s a frame on SwiftShader)
  const meadow = makeGrass({ count: 2400, height: 0.8, area: { x0: -24, x1: 24, z0: 3.6, z1: 16, y: GROUND_Y }, seed: 77 });
  for (const m of meadow.group.children) {
    m.material = new THREE.MeshBasicMaterial({ map: m.material.map, alphaTest: 0.5, side: THREE.DoubleSide, color: '#8a7272' });
    m.receiveShadow = false;
  }
  world.register(meadow.group);

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

  function poseProps(t) {
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
    // Sloane's moths (all three called Gerald) flutter out of her fur and loop
    const sl = R.sloane;
    const mk = t < A.sloane ? 0 : clamp(spring(t - A.sloane, 2.2, 0.55), 0, 1.2);
    moths.group.visible = mk > 0.02;
    if (moths.group.visible) {
      moths.pose(t, camera);
      const hp = inRoom('sloane', sl.ch.position.x - 0.1, sl.h * 0.86, sl.z0 + 0.15);
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
    // the time-lapse clouds race across the sky, taking the dusk colours with the wipe
    // (the backdrop's own wipe: k = mix * 1.7 - (1 - y) * 0.7 at band height y)
    const sm = skyMix(t);
    const on = seg(t, E.S06 - 0.5, E.S06) * (1 - seg(t, DESC1 - 0.3, DESC1 + 0.4));
    for (const c of clouds) {
      const u = c.u0 + c.speed * (t - E.S06);
      const p = skyLocal(u, c.v, 2 + c.u0);
      const k = clamp(sm * 1.7 - (1 - (c.v - SKY_BAND[0]) / (SKY_BAND[1] - SKY_BAND[0])) * 0.7);
      const edge = clamp(Math.min(u + 0.1, 1.1 - u) / 0.15); // fade out over the painting's edges
      for (const [m, a] of [[c.day, 1 - k], [c.dusk, k]]) {
        m.visible = on * edge > 0.001 && a > 0.001;
        m.position.set(p[0], p[1], p[2]);
        m.material.opacity = on * edge * a * 0.92;
      }
    }
    // the sun's glide: the glow takes over the painted afternoon sun as the wipe reaches
    // it, slides over the peaks, and hands over to the painted dusk sun as that one
    // wipes in (the wipe crosses the two suns at sky mix ~0.3 and ~0.65)
    const gIn = seg(t, SUN_T[0], SUN_T[1]), gOut = seg(t, SUN_T[2], SUN_T[3]);
    const gk = ease.inOutSine(seg(t, SUN_T[1], SUN_T[2]));
    const g1 = 1 - gk;
    const sp = [0, 1].map((i) => g1 * g1 * SUN_A[i] + 2 * g1 * gk * SUN_C[i] + gk * gk * SUN_B[i]);
    const ga = ease.inOutSine(gIn) * (1 - ease.inOutSine(gOut));
    sunGlow.visible = ga > 0.01;
    sunGlow.position.set(sp[0], sp[1], 1.5);
    const gs = lerp(24, 19, gk);
    sunGlow.scale.set(gs, gs, 1);
    sunGlow.material.opacity = ga;
    sunGlow.material.color.set('#ffffff').lerp(new THREE.Color('#ffb070'), gk);
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

  // Per-aspect rig values. 16:9 tips up into a 65 mm view of the painted sky (the widest
  // lens that stays inside the painting); 9:16 rises past the roof and takes in the
  // whole painted vista. The hero wide is low, the house standing against the sunset.
  const P = portrait ? {
    craneX: [0, 0], craneY: [3.4, 31], craneZ: 21, lookDrop: 0.5, fov: 54,
    tipPitch: 10, tipFov: 40, skyRise: 6.5, skyBack: 4,
    hero: fromAim([0, 9, 36], [0, 13, 0], 53, { aperture: 12 }),
    heroDrift: [0, 0, 0],
    kitchen: fromAim([0.2, 2.9, 15.5], [0, 2.35, 0], 42, { aperture: 8 }),
  } : {
    craneX: [-2.5, 0], craneY: [2.0, 29], craneZ: 24, lookDrop: 0.5, fov: mm(40),
    tipPitch: 20, tipFov: mm(65), skyRise: 2.5, skyBack: 4,
    hero: fromAim([0, 6.2, 58], [0, 13.4, 0], mm(40), { aperture: 6.5 }),
    heroDrift: [0.35, 0, 0],
    kitchen: fromAim([0.5, 3.5, 14], [0, 2.3, 0], mm(50), { aperture: 8 }),
  };
  const HERO_PUSH = 0.5;
  const residentsZ = -kitchen.roomD / 2 + 0.75;

  function rig(t) {
    // S05 crane: y rises on an inOut ease that is still easing out when the camera tips up
    const kc = ease.inOutSine(seg(t, E.S05, CRANE_END));
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
    const tip = ease.inOutSine(seg(t, E.ROOF_CLEAR - 0.3, TIP_END));
    const zoom = ease.inOutSine(seg(t, E.ROOF_CLEAR, TIP_END));
    const drift = ease.inOutSine(seg(t, E.ROOF_CLEAR - 0.3, DESC0 + 0.2));
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
      return mixRig(s0, heroAt(0), ease.inOutCubic(seg(t, DESC0, DESC1)));
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
   * Motion-blur subframes from the camera's image-space speed over the shutter
   * (rotation, lateral travel against the subject distance, dolly and zoom): 1 when
   * still, 3 for the crane (spec), 5 for the fastest frames of the descent and the push.
   */
  function subframes(t) {
    if (t < E.S05) return 3;
    const a = rig(t - 1 / 120), b = rig(t + 1 / 120);
    const pxPerRad = 1080 / (b.fov * D2R);
    const f = dirPoint([0, 0, 0], b.yaw, b.pitch, 1);
    const dp = b.pos.map((v, i) => v - a.pos[i]);
    const along = dp[0] * f[0] + dp[1] * f[1] + dp[2] * f[2];
    const lat = Math.hypot(dp[0] - along * f[0], dp[1] - along * f[1], dp[2] - along * f[2]);
    const d = Math.min(Math.max(b.focus, 6), 40);
    const px = Math.hypot(a.yaw - b.yaw, a.pitch - b.pitch) * pxPerRad + lat / d * pxPerRad + Math.abs(along) / d * 960 + Math.abs(a.fov - b.fov) / b.fov * 960;
    return px < 3 ? 1 : px < 30 ? 3 : 5;
  }

  function pose(t) {
    setAspect(camera, portrait);
    const r = rig(t);
    const target = dirPoint(r.pos, r.yaw, r.pitch, 20);
    aim(camera, r.pos, target, r.fov, r.roll);
    const dk = dusk(t);
    const grade = world.pose(t, { dusk: dk, lamps: lampsAt(t), focus: r.focus, aperture: r.aperture, camera, behaviours: castBehaviours(t) });
    // the painted sky runs a little ahead of the light (spec: the wipe 17.9-19.6)
    const sm = skyMix(t);
    world.sky.userData.mat.uniforms.mixv.value = sm;
    world.sky.userData.mat.uniforms.bright.value = lerp(1.0, 0.95, sm);
    // fireflies rise from their cue (the dusk ramp alone would bring them in early)
    const fu = world.flies.uniforms.opacity;
    fu.value = Math.min(fu.value, ease.outCubic(seg(t, E.FIREFLIES, E.FIREFLIES + 0.7)));
    // the chimney smoke thins while the lens looks up through it (it reads as a smear)
    const thin = 1 - 0.75 * seg(t, E.S06 - 0.1, E.S06 + 0.4) * (1 - seg(t, DESC0 + 0.2, DESC1));
    for (const p of world.puffs) p.s.material.opacity *= thin;
    meadow.group.visible = t >= DESC0;
    if (meadow.group.visible) meadow.update(t, 1);
    poseCast(t);
    poseProps(t);
    return {
      scene: world.scene, camera,
      look: look(grade, dk, { msaa: false, exposure: grade.exposure * (1 + 0.07 * dk), dof: { focus: r.focus, aperture: r.aperture, maxBlur: 14 } }),
    };
  }

  return [
    {
      id: 'S05', start: E.WHIP, end: E.ROOF_CLEAR,
      transition: { type: 'whip', dur: E.S05 - E.WHIP, dir: [0, -1] },
      mb: subframes, pose,
    },
    { id: 'S06', start: E.ROOF_CLEAR, end: E.S07, mb: subframes, pose },
  ];
}
