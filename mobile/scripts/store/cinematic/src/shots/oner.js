// S01-S03, one unbroken camera move (0.00-11.58):
//   S01 the first move: PLAY / PANT / HEAR on the meadow rack; the L lands in
//       PANT (PLANT), the T lands in HEAR (HEART); amber bursts, PLAN unfurls
//       into a blueprint and the sprouted L rides the stream up the house.
//   S02 words build rooms: the stream climbs to the empty jungle frame, the
//       blueprint lays its chalk outline, timber snaps in on the knocks.
//   S03 Gerald: on the drop the jungle wallpaper unrolls, Sloane pops in, the L
//       drops into the hammock, and she says her line in a parchment bubble.

import * as THREE from 'three';
import { buildRack } from '../world/rack.js';
import { makeCharacter, poseCharacter } from '../world/sprites.js';
import { makeBillboard, poseEmote, makeAmberStream } from '../world/fx.js';
import { makeBlueprint } from '../world/blueprint.js';
import { makeMoths } from '../world/fire.js';
import { makeShaft } from '../world/env.js';
import { makeBubble } from '../world/bubble.js';
import { makeSprout, setLocked, setTileGlow, TILE_SCALE } from '../core/tiles.js';
import { ease, spring, seg, lerp, catmull } from '../core/math.js';
import { GROUND_Y } from '../sets/world.js';
import { mm, wpos, add, mix3, aim, setAspect, look, project } from './common.js';

export const RACK_POS = [-3.4, GROUND_Y, 12];

export default async function make(ctx) {
  const { world, camera, E, portrait } = ctx;
  const { house } = world;

  // --- the rack with the opening board
  const rack = buildRack({
    words: ['PLAY', 'PANT', 'HEAR'],
    moves: [
      { from: 0, letter: 1, to: 1, slot: 1, lift: E.L_LIFT, open: E.PANT_OPEN, land: E.L_LAND, closeAt: E.L_LAND, liftH: 1.3, arc: 0.55 },
      { from: 1, letter: 4, to: 2, slot: 4, lift: E.T_LIFT, open: E.HEAR_OPEN, land: E.T_LAND, closeAt: E.T_LAND, liftH: 1.2, arc: 0.6 },
    ],
  });
  rack.group.position.set(...RACK_POS);
  world.register(rack.group);
  const tiles = rack.set.tiles;
  const L = tiles.get('0:1').obj;
  const T = tiles.get('1:3').obj;
  const sprout = makeSprout();
  L.add(sprout);

  // Ember waits by the rack in the meadow (the den's Ember is hidden meanwhile)
  const emberOut = await makeCharacter('ember', { height: 1.75, poses: ['idle', 'talk'] });
  emberOut.position.set(RACK_POS[0] + 2.2, GROUND_Y, RACK_POS[2] - 0.9);
  world.register(emberOut);
  const heart = await makeBillboard('ui/emote_heart.png', 0.5);
  world.register(heart);
  const sparkles = [];
  for (let i = 0; i < 9; i++) sparkles.push(world.register(await makeBillboard('ui/emote_sparkle.png', 0.34)));

  // amber stream (continues through S02)
  const stream = await makeAmberStream({ count: 40, size: 0.34 });
  world.register(stream.group);

  const rowTiles = (ri) => [...tiles.values()].filter((x) => x.obj.parent === rack.rows[ri].group).map((x) => x.obj);
  const rackCentre = add(RACK_POS, [0, 1.75, 0]);

  function poseRack(t) {
    rack.group.visible = true;
    rack.set.pose(t);
    // lock tint on the moved letters, the sprout on the L
    setLocked(L, ease.outCubic(seg(t, E.L_LOCK, E.L_LOCK + 0.3)));
    setLocked(T, ease.outCubic(seg(t, E.T_LOCK, E.T_LOCK + 0.3)));
    const sk = t < E.SPROUT ? 0.0001 : Math.max(0.0001, spring(t - E.SPROUT, 3.2, 0.35));
    sprout.scale.setScalar(sk);
    sprout.rotation.z = Math.sin(t * 2.3) * 0.05;
    // landing rim flash on PLANT (6 frames) and the three row flashes
    for (const x of tiles.values()) setTileGlow(x.obj, 0);
    const flash = (t0, ri) => { const k = seg(t, t0, t0 + 0.2); if (k > 0 && k < 1) for (const o of rowTiles(ri)) setTileGlow(o, Math.sin(Math.PI * k) * 0.9); };
    flash(E.L_LAND, 1); flash(E.T_LAND, 2);
    E.FLASH.forEach((f, i) => flash(f, i));
    // sparkle pops: six around PLANT at the landing, then one per row flash
    sparkles.forEach((s, i) => {
      let t0, p;
      if (i < 6) { t0 = E.L_LAND + i * 0.02; const a = (i / 6) * Math.PI * 2; p = add(RACK_POS, [Math.cos(a) * 1.3, 1.75 + Math.sin(a) * 0.35, 0.3]); }
      else { t0 = E.FLASH[i - 6]; p = add(RACK_POS, [1.25, [2.5, 1.75, 1.0][i - 6] + 0.25, 0.3]); }
      s.position.set(p[0], p[1], p[2]); s.userData.y0 = p[1];
      poseEmote(s, t - t0, { hold: 0.35, rise: 0.2, fade: 0.25 });
    });
  }

  // camera follow of the L (deterministic: average of its path over a short window)
  function lPath(ts) { rack.set.pose(ts); return wpos(L); }
  function followL(t) {
    const samples = [-0.12, -0.06, 0, 0.06, 0.12].map((d) => lPath(t + 0.1 + d));
    rack.set.pose(t);
    return samples.reduce((a, b) => add(a, b.map((v) => v / samples.length)), [0, 0, 0]);
  }

  // --- S02 / S03 props
  const jungle = house.rooms.jungle;
  const JW = [jungle.x, jungle.y, 0]; // jungle cell origin (floor centre), world
  const JC = add(JW, [0, jungle.roomH / 2, 0]);
  const blueprint = makeBlueprint({ width: 1.6 });
  world.register(blueprint.mesh);
  const hero = new THREE.Group(); hero.scale.setScalar(TILE_SCALE);
  world.register(hero);
  // timber that snaps in on the six knocks: floor, two returns (tracked house parts)
  // plus a ceiling beam and two front trims (registered props in the cell)
  world.track(jungle.floor); jungle.returns.forEach((r) => world.track(r));
  world.track(jungle.painting); if (jungle.windowMesh) world.track(jungle.windowMesh);
  const trimMat = new THREE.MeshStandardMaterial({ color: '#8a5f3e', roughness: 0.8 });
  const beam = world.register(new THREE.Mesh(new THREE.BoxGeometry(jungle.roomW, 0.22, 0.3), trimMat), jungle.group);
  const trims = [-1, 1].map((sd) => world.register(new THREE.Mesh(new THREE.BoxGeometry(0.22, jungle.roomH, 0.26), trimMat), jungle.group));
  for (const m of [beam, ...trims]) { m.castShadow = true; m.receiveShadow = true; }
  const puffs = [];
  for (let i = 0; i < 6; i++) puffs.push(world.register(await makeBillboard('ui/emote_sparkle.png', 0.6)));
  const burst = [];
  for (let i = 0; i < 16; i++) burst.push(world.register(await makeBillboard('ui/emote_sparkle.png', 0.28)));
  const moths = makeMoths({ px: 0.03, radius: 0.42 });
  world.register(moths.group);
  const shaft = world.register(makeShaft({ width: 1.8, height: 5.5, color: '#fff3c8', opacity: 0.16 }), jungle.group);
  const pop = await makeBillboard('ui/emote_sparkle.png', 0.9);
  world.register(pop);
  const bubbleArt = makeBubble({ text: 'Three moths live in my fur. I call all three Gerald.', name: 'Sloane', width: Math.round((portrait ? 760 : 760) * ctx.pxScale), fontSize: Math.round((portrait ? 44 : 40) * ctx.pxScale), pixel: Math.max(2, Math.round(6 * ctx.pxScale)), tail: 'left' });
  ctx.overlay.quad('bubble', { texture: bubbleArt.texture, width: bubbleArt.width, height: bubbleArt.height });

  const streamPts = [rackCentre, [-2.2, 3.8, 8.5], [0.4, 6.4, 4.2], [0, 6.6, -0.6]];
  const sloane = world.residents.sloane;
  const hammock = add(JW, [0.05, 0.19 * jungle.roomH + 0.2, -jungle.roomD / 2 + 0.35]);
  const perch = add(JW, [-2.6, 3.35, 0.5]);

  /** Where the hero L is at time t (world), after it leaves the rack at GEMS. */
  function heroPos(t) {
    if (t < E.BLUEPRINT_LAY) {
      const u = ease.inOutSine(seg(t, E.GEMS, E.BLUEPRINT_LAY));
      const p = catmull(streamPts, u * 0.94);
      return add(p, [0, Math.sin(u * Math.PI) * 0.4, 0]);
    }
    if (t < E.SLOANE_POP) {
      const k = ease.inOutCubic(seg(t, E.BLUEPRINT_LAY, E.BLUEPRINT_LAY + 0.6));
      const from = catmull(streamPts, 0.94);
      return add(mix3(from, perch, k), [0, Math.sin(t * 3) * 0.05 * k, 0]);
    }
    const u = seg(t, E.SLOANE_POP, E.SLOANE_POP + 0.35);
    const p = mix3(perch, hammock, ease.inQuad(u));
    const hop = u < 1 ? Math.sin(Math.PI * u) * 0.6 : Math.abs(Math.sin((t - E.SLOANE_POP - 0.35) * 9)) * 0.12 * Math.exp(-(t - E.SLOANE_POP - 0.35) * 5);
    return add(p, [0, hop, 0]);
  }

  function poseBuild(t) {
    // before the drop the jungle is an empty frame being built; after it, the room
    const building = t >= E.GEMS && t < E.DROP + 0.4;
    if (t < E.GEMS) { house.setBuilt('jungle', false); return; }
    house.setBuilt('jungle', true);
    sloane.ch.visible = t >= E.SLOANE_POP; sloane.shadow.visible = t >= E.SLOANE_POP;
    jungle.painting.visible = t >= E.DROP;
    if (jungle.windowMesh) jungle.windowMesh.visible = t >= E.DROP;
    jungle.reveal.value = ease.inOutSine(seg(t, E.DROP, E.DROP + 0.4));
    if (!building) return;
    const piece = (i) => seg(t, E.KNOCKS[i] - 0.2, E.KNOCKS[i]);
    const settle = (i) => (t < E.KNOCKS[i] ? 1 : 1 - 0.1 * Math.exp(-(t - E.KNOCKS[i]) * 14) * Math.cos((t - E.KNOCKS[i]) * 40));
    // 0 floor drops in
    const f0 = ease.inQuad(piece(0));
    jungle.floor.visible = t >= E.KNOCKS[0] - 0.2; jungle.floor.position.y = 0.003 + (1 - f0) * 2.2; jungle.floor.scale.set(1, 1, settle(0));
    // 1, 2 returns swing in
    jungle.returns.forEach((w, k) => {
      const f = ease.inQuad(piece(1 + k)); const sd = k === 0 ? -1 : 1;
      w.visible = t >= E.KNOCKS[1 + k] - 0.2;
      w.rotation.y = -sd * Math.PI / 2 + sd * (1 - f) * 1.3;
      w.scale.set(1, settle(1 + k), 1);
    });
    // 3 ceiling beam drops, 4-5 trims slide in
    const fb = ease.inQuad(piece(3));
    beam.visible = t >= E.KNOCKS[3] - 0.2; beam.position.set(0, jungle.roomH - 0.11 + (1 - fb) * 1.5, jungle.roomD / 2 - 0.2);
    trims.forEach((m, k) => {
      const f = ease.inQuad(piece(4 + k)); const sd = k === 0 ? -1 : 1;
      m.visible = t >= E.KNOCKS[4 + k] - 0.2;
      m.position.set(sd * (jungle.roomW / 2 - 0.12) + sd * (1 - f) * 1.8, jungle.roomH / 2, jungle.roomD / 2 - 0.2);
    });
    // a sparkle puff on each knock
    puffs.forEach((pp, i) => {
      const at = [add(JW, [0, 0.2, 0.8]), add(JW, [-3.6, 1.5, 0]), add(JW, [3.6, 1.5, 0]), add(JW, [0, 3.8, 1.2]), add(JW, [-3.8, 2, 1.4]), add(JW, [3.8, 2, 1.4])][i];
      pp.position.set(...at); pp.userData.y0 = at[1];
      poseEmote(pp, t - E.KNOCKS[i], { hold: 0.12, rise: 0.15, fade: 0.2 });
    });
  }

  function poseBlueprint(t) {
    const bp = blueprint.mesh;
    if (t < E.GEMS || t > E.DROP + 0.45) return;
    bp.visible = true;
    const src = add(RACK_POS, [-0.25, 1.75, 0.15]);
    const onBoard = add(JW, [0, jungle.roomH / 2, -jungle.roomD / 2 + 0.06]);
    if (t < E.BLUEPRINT_LAY) {
      const unf = ease.outBack(seg(t, E.GEMS, E.GEMS + 0.35), 1.4);
      const u = ease.inOutSine(seg(t, E.GEMS + 0.2, E.BLUEPRINT_LAY));
      const p = u > 0 ? add(catmull([src, ...streamPts.slice(1)], u * 0.97), [0.5 * Math.sin(u * 7), -0.3, 0]) : src;
      bp.position.set(...p);
      bp.rotation.set(-0.3 + Math.sin(t * 5) * 0.25 * u, Math.sin(t * 3.3) * 0.4 * u, Math.sin(t * 4.1) * 0.3 * u);
      bp.scale.set(Math.max(0.05, unf), Math.max(0.05, unf), 1);
      blueprint.draw(0);
    } else {
      const k = ease.inOutCubic(seg(t, E.BLUEPRINT_LAY, E.BLUEPRINT_LAY + 0.35));
      const from = catmull([src, ...streamPts.slice(1)], 0.97);
      bp.position.set(...mix3(from, onBoard, k));
      bp.rotation.set(0, 0, 0);
      const full = jungle.roomW * 0.9 / 1.6;
      bp.scale.setScalar(1 + (full - 1) * k);
      blueprint.draw(seg(t, E.BLUEPRINT_LAY + 0.2, E.GEM_BURST + 0.25));
      blueprint.mat.opacity = 1 - seg(t, E.DROP, E.DROP + 0.4);
    }
  }

  function poseHero(t) {
    // on the rack until the amber bursts, then carried in world space
    if (t < E.GEMS) return;
    if (L.parent !== hero) hero.add(L);
    L.position.set(0, 0, 0);
    hero.visible = true;
    hero.position.set(...heroPos(t));
    const k = seg(t, E.GEMS, E.GEMS + 0.3);
    hero.rotation.set(Math.sin(t * 4) * 0.2 * (1 - seg(t, E.SLOANE_POP + 0.3, E.SLOANE_POP + 0.6)), 0, Math.sin(t * 2.6) * 0.15 + (t > E.SLOANE_POP + 0.35 ? -0.25 : 0));
    hero.scale.setScalar(TILE_SCALE * (0.85 + 0.15 * k));
    // P, A, N of PLAN fold back into the blueprint
    for (const id of ['1:0', '1:1', '1:2']) {
      const o = tiles.get(id);
      if (!o) continue;
      const f = ease.inCubic(seg(t, E.GEMS, E.GEMS + 0.3));
      o.obj.rotation.x = -f * Math.PI / 2;
      o.obj.scale.setScalar(Math.max(0.001, 1 - f));
    }
  }

  function poseBurst(t) {
    const k = seg(t, E.GEM_BURST, E.GEM_BURST + 0.7);
    burst.forEach((b, i) => {
      if (k <= 0 || k >= 1) { b.visible = false; return; }
      b.visible = true;
      const a = (i / burst.length) * Math.PI * 2;
      const r = ease.outCubic(k) * (2.4 + (i % 3) * 0.5);
      b.position.set(JC[0] + Math.cos(a) * r, JC[1] + Math.sin(a) * r * 0.55, JC[2] + 0.4);
      b.material.opacity = 1 - k;
      b.scale.setScalar(0.28 * (1 - k * 0.5));
    });
  }

  function poseS03(t) {
    // Sloane pops in, talks while her line types; moths loop around her head
    if (t < E.DROP) return;
    shaft.visible = true;
    shaft.position.set(-0.6, jungle.roomH + 0.2, -jungle.roomD / 2 + 0.6); shaft.rotation.z = 0.35;
    shaft.material.opacity = 0.16 * seg(t, E.DROP, E.DROP + 0.3);
    const head = add(JW, [sloane.x0, sloane.h + 0.05, sloane.z0]);
    pop.position.set(head[0], head[1] - 0.8, head[2] + 0.2); pop.userData.y0 = head[1] - 0.8;
    poseEmote(pop, t - E.SLOANE_POP, { hold: 0.18, rise: 0.1, fade: 0.2 });
    moths.group.visible = t >= E.SLOANE_POP;
    moths.pose(t, camera);
    moths.group.position.set(head[0], head[1] + 0.15, head[2] + 0.1);
  }

  function sloaneBehaviour(t) {
    const pk = t < E.SLOANE_POP ? 0 : spring(t - E.SLOANE_POP, 3.2, 0.45);
    const talking = t > E.TYPE_START && t < E.TYPE_END && Math.floor(t * 6) % 2 === 0;
    return { sloane: { scale: Math.max(0.001, pk), pose: talking ? 'talk' : 'idle', facing: -1 } };
  }

  // ---------------- camera
  function onerCamera(t) {
    const Lp = followL(Math.min(t, E.L_LAND));
    const mid = add(RACK_POS, [0, 1.75, 0]);
    const face = add(JW, [sloane.x0, sloane.h * 0.82, sloane.z0]);
    let A, B, C, D, S;
    if (!portrait) {
      A = { pos: add(Lp, [0.55, 0.15, 4.4]), target: add(Lp, [-0.12, -0.3, 0]), fov: mm(85) };
      // all three trays plus Ember, the rack right of centre (captions own the lower left)
      B = { pos: add(mid, [0.1, 0.25, 10.4]), target: add(mid, [-1.05, -0.2, 0]), fov: mm(65) };
      C = { pos: add(RACK_POS, [1.4, 3.6, 10.0]), target: [-0.8, 5.0, 4.0], fov: mm(35) };
      D = { pos: [0, 6.9, 13.5], target: [0, 6.6, 0], fov: mm(35) };
      S = { pos: add(face, [-0.4, 0.1, 5.8]), target: face, fov: mm(50) };
    } else {
      // portrait: the whole rack across the middle band under the captions; the camera
      // starts close on PLAY and eases back as the L lands
      A = { pos: add(mid, [0.15, 0.95, 7.4]), target: add(mid, [-0.05, 0.9, 0]), fov: mm(50) };
      B = { pos: add(mid, [0.25, 0.7, 10.2]), target: add(mid, [0, 0.45, 0]), fov: mm(50) };
      C = { pos: add(RACK_POS, [1.2, 3.2, 12.0]), target: [-1.5, 6.0, 3.0], fov: 54 };
      D = { pos: [0, 6.4, 12.4], target: [0, 6.6, 0], fov: 54 };
      S = { pos: add(face, [-0.5, -0.2, 6.2]), target: add(face, [-0.35, -0.55, 0]), fov: 40 };
    }
    let r, roll = 0;
    if (t < E.L_LAND) r = A;
    else if (t < E.CRANE) r = blend(A, B, ease.inOutCubic(seg(t, E.L_LAND, E.L_LAND + 0.4)));
    else if (t < E.S02) r = blend(B, C, ease.inOutSine(seg(t, E.CRANE, E.S02)));
    else if (t < E.DROP) {
      // crane up the facade, orbiting 18 deg -> 0 around the frame, landing on it at the drop
      const k = ease.inOutSine(seg(t, E.S02, E.DROP));
      const orbit = THREE.MathUtils.degToRad((portrait ? 8 : 18) * (1 - k));
      const base = blend(C, D, k);
      const rel = [base.pos[0] - D.target[0], base.pos[1], base.pos[2] - D.target[2]];
      const x = rel[0] * Math.cos(orbit) - rel[2] * Math.sin(orbit), z = rel[0] * Math.sin(orbit) + rel[2] * Math.cos(orbit);
      r = { pos: [D.target[0] + x, rel[1], D.target[2] + z], target: base.target, fov: base.fov };
      roll = 1.5 * (1 - k);
    } else {
      // push through the open front to Sloane, a 4 deg arc right
      const k = ease.inOutCubic(seg(t, E.DROP, E.DROP + 1.25));
      r = blend(D, S, k);
      const arc = THREE.MathUtils.degToRad(4 * k);
      const rel = [r.pos[0] - face[0], r.pos[2] - face[2]];
      r.pos = [face[0] + rel[0] * Math.cos(arc) - rel[1] * Math.sin(arc), r.pos[1], face[2] + rel[0] * Math.sin(arc) + rel[1] * Math.cos(arc)];
      r.pos = add(r.pos, [0, 0, -0.35 * seg(t, E.DROP + 1.25, E.S04)]);
    }
    return { ...r, roll };
  }
  function blend(a, b, k) { return { pos: mix3(a.pos, b.pos, k), target: mix3(a.target, b.target, k), fov: lerp(a.fov, b.fov, k) }; }

  const shot = {
    id: 'S01-S03',
    start: 0,
    end: E.S04,
    mb: (t) => (t >= E.CRANE && t < E.S02 + 0.9 ? 3 : 1),
    pose(t) {
      setAspect(camera, portrait);
      // build state: row 1 and the aquarium built; the rest are empty frames until the montage
      for (const id of ['desert', 'office', 'burrow', 'garden', 'bamboo', 'observatory', 'rainforest']) house.setBuilt(id, false);
      world.residents.ember.ch.visible = false;
      world.residents.ember.shadow.visible = false;
      const cam = onerCamera(t); // samples the rack at other times: pose the rack after it
      poseRack(t);
      poseBuild(t);
      poseBlueprint(t);
      poseHero(t);
      poseBurst(t);
      poseS03(t);
      emberOut.visible = t < E.DROP;
      poseCharacter(emberOut, { pose: t > E.EMBER_TALK && t < E.EMBER_TALK + 1.2 && Math.floor(t * 6) % 2 === 0 ? 'talk' : 'idle', facing: -1 });
      heart.position.set(emberOut.position.x, emberOut.position.y + 1.95, emberOut.position.z); heart.userData.y0 = heart.position.y;
      poseEmote(heart, t - E.EMBER_TALK, { hold: 0.9 });
      stream.group.visible = t >= E.GEMS && t < E.GEM_BURST + 0.3;
      stream.pose(streamPts, t, { start: E.GEMS, spread: 0.6, travel: 1.6 });
      const focus = aim(camera, cam.pos, cam.target, cam.fov, cam.roll);
      const interior = t >= E.DROP + 0.6;
      const grade = world.pose(t, { dusk: 0, focus, aperture: 40, camera, behaviours: sloaneBehaviour(t) });
      world.sun.castShadow = !interior;
      world.pollen.points.visible = !interior;
      const aperture = t < E.CRANE ? 40 : t < E.DROP ? 12 : 30;
      return { scene: world.scene, camera, look: look(grade, 0, { msaa: t < E.S02, dof: { focus, aperture, maxBlur: t < E.CRANE ? 18 : 14 } }) };
    },
    overlay(t) {
      // Sloane's bubble, anchored above her head, typed at 25 characters a second
      if (t < E.BUBBLE || t > E.S04 - 0.02) return;
      const open = spring(t - E.BUBBLE, 3.5, 0.5);
      const n = Math.floor(Math.max(0, t - E.TYPE_START) * 25);
      bubbleArt.draw(Math.min(n, bubbleArt.total));
      const head = add(JW, [sloane.x0, sloane.h + 0.1, sloane.z0]);
      const p = project(camera, head, ctx.overlay);
      const px = ctx.pxScale;
      let x = portrait ? ctx.overlay.width / 2 : p.x + bubbleArt.width / 2 + 30 * px;
      let y = portrait ? p.y - bubbleArt.height / 2 - 60 * px : p.y - bubbleArt.height / 2 - 20 * px;
      const sc = 0.6 + 0.4 * open;
      // clamp with the live scale (the pop overshoots) so the bubble never leaves the safe box
      const hw = (bubbleArt.width * sc) / 2 + 4 * px, hh = (bubbleArt.height * sc) / 2 + 4 * px;
      if (portrait) { x = Math.min(Math.max(x, 96 * px + hw), 918 * px - hw); y = Math.max(y, 200 * px + hh); }
      else { x = Math.min(x, ctx.overlay.width - 90 * px - hw); y = Math.max(y, 90 * px + hh); }
      ctx.overlay.place('bubble', { x, y, scale: sc, opacity: Math.min(1, open * 1.5) * (1 - seg(t, E.S04 - 0.2, E.S04)) });
    },
  };
  return shot;
}
