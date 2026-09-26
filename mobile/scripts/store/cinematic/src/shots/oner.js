// S01-S03, one unbroken camera move (0.00-11.58):
//   S01 the first move: PLAY / PANT / HEAR on the meadow rack; the L lands in
//       PANT (PLANT), the T lands in HEAR (HEART); amber bursts out of PLAN (never
//       out of PAY), PLAN unfurls into a blueprint and the sprouted L rides the
//       stream out past the rack's left end and up the house.
//   S02 words build rooms: the stream climbs to the empty jungle frame, the
//       blueprint lays its chalk outline, timber snaps in on the knocks.
//   S03 Gerald: on the drop the jungle wallpaper unrolls, Sloane pops in, the L
//       drops into the hammock, and she says her line in a parchment bubble.

import * as THREE from 'three';
import { buildRack } from '../world/rack.js';
import { slotX } from '../world/wordrow.js';
import { makeCharacter, poseCharacter } from '../world/sprites.js';
import { makeBillboard, poseEmote, makeContactShadow, makeDustPuff } from '../world/fx.js';
import { makeBlueprint } from '../world/blueprint.js';
import { makeMoths } from '../world/fire.js';
import { makeShaft } from '../world/env.js';
import { makeBubble } from '../world/bubble.js';
import { makeSprout, setLocked, setTileGlow, TILE_SCALE, TILE_D, TILE_EMISSIVE_BASE, LOCKED } from '../core/tiles.js';
import { ease, spring, seg, lerp, clamp, smooth, smoother, catmull, hash01 } from '../core/math.js';
import { GROUND_Y } from '../sets/world.js';
import { pixelWood } from '../world/house.js';
import { mm, wpos, add, mix3, dist, aim, setAspect, look, project, travelPx, blurFor } from './common.js';

export const RACK_POS = [-3.4, GROUND_Y, 12];

/** A Catmull-Rom path re-parameterised by arc length, so a ride along it keeps an even speed. */
function arcPath(points, samples = 240) {
  const cum = [0]; let prev = catmull(points, 0);
  for (let i = 1; i <= samples; i++) { const p = catmull(points, i / samples); cum.push(cum[i - 1] + dist(prev, p)); prev = p; }
  const total = cum[samples];
  return (s) => {
    const want = clamp(s) * total;
    let lo = 0, hi = samples;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < want) lo = m; else hi = m; }
    const f = (want - cum[lo]) / Math.max(1e-9, cum[hi] - cum[lo]);
    return catmull(points, (lo + f) / samples);
  };
}


export default async function make(ctx) {
  const { world, camera, E, portrait } = ctx;
  const { house } = world;
  const FRAME_H = portrait ? 1920 : 1080;

  // --- the rack with the opening board
  const rack = buildRack({
    words: ['PLAY', 'PANT', 'HEAR'],
    moves: [
      { from: 0, letter: 1, to: 1, slot: 1, lift: E.L_LIFT, open: E.PANT_OPEN, land: E.L_LAND, closeAt: E.L_LAND, liftH: 1.0, arc: 0.55 },
      { from: 1, letter: 4, to: 2, slot: 4, lift: E.T_LIFT, open: E.HEAR_OPEN, land: E.T_LAND, closeAt: E.T_LAND, liftH: 1.0, arc: 0.45 },
    ],
  });
  rack.group.position.set(...RACK_POS);
  world.register(rack.group);
  // the trays self-light like the tiles, so parchment and tile faces keep the game's
  // relative values under the grade (spec 2.2 swatches; see TRAY_EMISSIVE)
  for (const tr of rack.trays) tr.traverse((o) => { if (o.isMesh && o.geometry.type === 'PlaneGeometry') { o.material.emissive = new THREE.Color(TRAY_GLOW); o.material.emissiveIntensity = TRAY_EMISSIVE; } });
  const tiles = rack.set.tiles;
  const L = tiles.get('0:1').obj;
  const T = tiles.get('1:3').obj;
  // Tile-local self-light for the tile shots (spec 2.2 swatches under the AgX grade):
  // each face glows in its own hue with the chroma pushed (AgX pulls pastels toward
  // grey), strongest on the macro and rack shots and easing back under the boom
  const selfTint = (hex, push) => {
    const c = new THREE.Color(hex), l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    return new THREE.Color(1 + push * (c.r / l - 1), 1 + push * (c.g / l - 1), 1 + push * (c.b / l - 1));
  };
  const WHITE = new THREE.Color(1, 1, 1);
  // (the locked powder blue is nearly grey, so it takes a stronger push to keep its blue)
  for (const x of tiles.values()) x.obj.userData.selfTint = { face: selfTint(x.obj.userData.color.bg, CHROMA_PUSH), lock: selfTint(LOCKED.bg, CHROMA_PUSH * 2.5) };
  const sprout = makeSprout();
  L.add(sprout);
  const sproutLeaves = []; sprout.traverse((o) => { if (o.isMesh) sproutLeaves.push(o); });
  // an airborne tile keeps no cast shadow (its box shadow smeared a teal slab over the
  // trays); a soft warm contact blob on the tray face under it grounds it instead
  const airBlob = world.register(makeContactShadow(1.35, 1.5, 0.3), rack.inner);
  airBlob.rotation.x = 0;
  const TRAY_FACE_Z = -TILE_D / 2 + 0.08;

  // Ember waits by the rack in the meadow (the den's Ember is hidden meanwhile):
  // 16:9 beside the right upright, fully in frame; 9:16 a small figure in the grass just
  // in front of the rack's right end (about 11 units from the lens against the ~12.8 focus:
  // soft, but a character, not bokeh), her head just under HEAR's tray and clear of the
  // platform UI band at the bottom of a phone screen.
  const emberOut = await makeCharacter('ember', { height: portrait ? 1.0 : 1.75, poses: ['idle', 'talk'] });
  emberOut.position.set(...add(RACK_POS, portrait ? [0.95, 0, 1.8] : [2.75, 0, 0.3]));
  world.register(emberOut);
  const heart = await makeBillboard('ui/emote_heart.png', portrait ? 0.3 : 0.5);
  world.register(heart);
  const sparkles = [];
  for (let i = 0; i < 9; i++) sparkles.push(world.register(await makeBillboard('ui/emote_sparkle.png', 0.34)));

  // the frame-0 specular ping on the L's clearcoat (placed once the start camera is known)
  const ping = world.register(new THREE.PointLight('#FFF2D8', 0, 1.9, 2));

  // amber: 32 gems burst out of PLAN at GEMS and become the stream (continues through S02)
  const N_GEMS = 32;
  const gems = [];
  for (let i = 0; i < N_GEMS; i++) gems.push(world.register(await makeBillboard('ui/amber.png', 1)));
  const amberGlow = world.register(new THREE.PointLight('#ffb347', 0, 8, 2));

  const rowTiles = (ri) => [...tiles.values()].filter((x) => x.obj.parent === rack.rows[ri].group).map((x) => x.obj);
  const rackCentre = add(RACK_POS, [0, 1.75, 0]);
  const halfRack = (rack.trayW * TILE_SCALE) / 2;

  function poseRack(t) {
    rack.group.visible = true;
    const act = rack.set.pose(t);
    // lock tint on the moved letters, the sprout on the L
    setLocked(L, ease.outCubic(seg(t, E.L_LOCK, E.L_LOCK + 0.3)));
    setLocked(T, ease.outCubic(seg(t, E.T_LOCK, E.T_LOCK + 0.3)));
    const sk = t < E.SPROUT ? 0.0001 : Math.max(0.0001, spring(t - E.SPROUT, 3.2, 0.35));
    sprout.scale.setScalar(sk);
    sprout.rotation.z = Math.sin(t * 2.3) * 0.05;
    // shadows: resting tiles cast, the airborne one does not
    for (const x of tiles.values()) x.obj.userData.body.castShadow = true;
    for (const m of sproutLeaves) m.castShadow = true;
    airBlob.visible = false;
    if (act) {
      act.obj.userData.body.castShadow = false;
      if (act.obj === L) for (const m of sproutLeaves) m.castShadow = false;
      // the blob sits on the parchment behind the tile, softer and fainter as it rises off it
      const away = Math.max(0, act.pos[2]);
      airBlob.visible = true;
      airBlob.position.set(act.pos[0] + 0.12, act.pos[1] - 0.18, TRAY_FACE_Z);
      airBlob.scale.setScalar(1 + away * 0.5);
      airBlob.material.opacity = 0.3 * clamp(1 - away / 1.6);
    }
    // tile-local self-light (see selfTint), then the landing rim flash on PLANT and the
    // three row flashes on top of it
    const ks = tileShot(t);
    const glowBase = lerp(TILE_EMISSIVE_BASE, TILE_SELF, ks);
    for (const x of tiles.values()) {
      const u = x.obj.userData;
      u.glowBase = glowBase;
      u.faceMat.emissive.copy(WHITE).lerp(u.selfTint.face, ks);
      u.lockMat.emissive.copy(WHITE).lerp(u.selfTint.lock, ks);
      u.bodyMat.emissive.copy(u.bodyMat.color); // the body glows in its current (lock-tinted) colour
      setTileGlow(x.obj, 0);
    }
    const flash = (t0, ri, dur = 0.2) => { const k = seg(t, t0, t0 + dur); if (k > 0 && k < 1) for (const o of rowTiles(ri)) setTileGlow(o, Math.sin(Math.PI * k) * 0.9); };
    flash(E.L_LAND, 1, 0.13); flash(E.T_LAND, 2, 0.13); // the landing rims: four frames
    E.FLASH.forEach((f, i) => flash(f, i));
    // sparkle pops: six around PLANT at the landing (small, on fixed points of the tray's
    // margin in the gaps between tiles, never over a letter, gone in six frames), then one
    // per row flash
    sparkles.forEach((s, i) => {
      let t0, p;
      if (i < 6) {
        t0 = E.L_LAND + i * 0.02;
        const [gx, side, sz] = PLANT_SPARKS[i];
        s.userData.base = sz;
        s.material.color.setRGB(1.5, 1.28, 0.85); // warm and a touch over white, so it glints on the parchment
        // (an emote hangs from its base: centre it on the margin line)
        p = add(RACK_POS, [gx, 1.75 + side * 0.38 - sz / 2, 0.12]); // just in front of the tile faces
        s.position.set(p[0], p[1], p[2]); s.userData.y0 = p[1];
        poseEmote(s, t - t0, { hold: 0.1, rise: 0, fade: 0.1 });
        return;
      }
      t0 = E.FLASH[i - 6]; p = add(RACK_POS, [1.25, [2.5, 1.75, 1.0][i - 6] + 0.25, 0.3]);
      s.userData.base = 0.34;
      s.material.color.setRGB(1, 1, 1);
      s.position.set(p[0], p[1], p[2]); s.userData.y0 = p[1];
      poseEmote(s, t - t0, { hold: 0.35, rise: 0.2, fade: 0.25 });
    });
    return act;
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
  // Timber that snaps in on the six knocks: the floor (a tracked house part), then new
  // pine, brighter than anything else on the facade: two side returns, a ceiling beam and
  // two front trims (registered props in the cell). The pine returns are stand-ins for the
  // room's real (dark) returns, which they hand over to under the unroll at the drop.
  const { roomW, roomH, roomD } = jungle;
  world.track(jungle.floor); jungle.returns.forEach((r) => world.track(r));
  world.track(jungle.painting); if (jungle.windowMesh) world.track(jungle.windowMesh);
  const pineTex = pixelWood({ base: '#e9c58c', planks: 2, seed: 81 });
  const pine = (rx, ry, vertical = false) => {
    const tx = vertical ? pixelWood({ base: '#e9c58c', planks: 2, seed: 81, vertical: true }) : pineTex.clone();
    tx.repeat.set(rx, ry); tx.needsUpdate = true;
    return new THREE.MeshStandardMaterial({ map: tx, emissive: new THREE.Color('#ffe0b0'), emissiveMap: tx, emissiveIntensity: 0.12, roughness: 0.8 });
  };
  const beam = world.register(new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.22, 0.3), pine(roomW / 2.2, 0.5)), jungle.group);
  const trimMat = pine(0.25, roomH / 2.2, true);
  const trims = [-1, 1].map(() => world.register(new THREE.Mesh(new THREE.BoxGeometry(0.22, roomH, 0.26), trimMat), jungle.group));
  // the pine returns: just inside the real ones, and cut away from the top down as the
  // wallpaper unrolls (the same reveal as the painting, with its bright seam), so the room's
  // own returns take over under the unroll
  const standMat = pine(roomD / 2.2, roomH / 1.1);
  standMat.onBeforeCompile = (sh) => {
    sh.uniforms.uReveal = jungle.reveal;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vRUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvRUv = uv;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vRUv;\nuniform float uReveal;')
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nif (uReveal > 0.001) { float edge = 1.0 - uReveal; if (vRUv.y > edge) discard; float seam = 1.0 - smoothstep(0.0, 0.03, edge - vRUv.y); gl_FragColor.rgb += vec3(1.0, 0.92, 0.7) * seam * 1.5 * (1.0 - smoothstep(0.75, 1.0, uReveal)); }');
  };
  standMat.customProgramCacheKey = () => 'pine-return-reveal';
  const standIns = [-1, 1].map(() => world.register(new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), standMat), jungle.group));
  // and a pine floor, wiped away from the back edge forward by the same unroll (a plane's uv
  // y runs to its back edge once it lies flat), just above the room's own floor
  const standFloorMat = standMat.clone(); standFloorMat.map = pine(roomW / 2.2, roomD / 1.1).map; standFloorMat.emissiveMap = standFloorMat.map;
  standFloorMat.onBeforeCompile = standMat.onBeforeCompile; standFloorMat.customProgramCacheKey = standMat.customProgramCacheKey;
  const standFloor = world.register(new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), standFloorMat), jungle.group);
  standFloor.rotation.x = -Math.PI / 2;
  for (const m of [beam, ...trims, ...standIns]) { m.castShadow = true; m.receiveShadow = true; }
  standFloor.receiveShadow = true;
  // where each piece lands (room-local) and where its dust puffs (left and right ones at
  // different heights, so no two ever pair up)
  const LAND = [[0, 0.008, 0], [-(roomW / 2 - 0.07), roomH / 2, 0], [roomW / 2 - 0.07, roomH / 2, 0], [0, roomH - 0.11, roomD / 2 - 0.2], [-(roomW / 2 - 0.12), roomH / 2, roomD / 2 - 0.2], [roomW / 2 - 0.12, roomH / 2, roomD / 2 - 0.2]];
  const PUFF_AT = [[-0.9, 0.14, 1.05], [-(roomW / 2 - 0.35), 0.3, 1.1], [roomW / 2 - 0.35, 0.62, 0.9], [0.55, roomH - 0.42, 1.5], [-(roomW / 2 - 0.4), 1.2, 1.55], [roomW / 2 - 0.4, 2.25, 1.55]];
  const puffTex = makeDustPuff();
  // (depth-written, so the depth of field sees each at its piece)
  const puffs = PUFF_AT.map(() => world.register(new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, alphaTest: 0.1 })), jungle.group));
  // the amber's gold burst: warm sparks that fly from the frame's centre to the six landing
  // points and wait there, twinkling, for their piece
  const burst = [];
  for (let i = 0; i < 16; i++) burst.push(world.register(await makeBillboard('ui/emote_sparkle.png', 0.65)));
  for (const b of burst) b.material.color.set('#ffb347');
  // (px is one art pixel: 0.017 makes a moth about 65 px wide at Sloane's distance)
  const moths = makeMoths({ px: 0.017, radius: 0.42 });
  world.register(moths.group);
  // the two wing frames of moth 0 (open, folded), read back from the flap cycle
  moths.pose(0, null); const mothOpen = moths.group.children[0].material;
  moths.pose(1.5 / 14, null); const mothFolded = moths.group.children[0].material;
  const shaft = world.register(makeShaft({ width: 1.8, height: 5.5, color: '#fff3c8', opacity: 0.16 }), jungle.group);
  const pop = await makeBillboard('ui/emote_sparkle.png', 0.9);
  world.register(pop);
  const bubbleArt = makeBubble({ text: 'Three moths live in my fur. I call all three Gerald.', name: 'Sloane', width: Math.round((portrait ? 760 : 860) * ctx.pxScale), fontSize: Math.round((portrait ? 44 : 46) * ctx.pxScale), pixel: Math.max(2, Math.round(6 * ctx.pxScale)), tail: portrait ? 'right' : 'left' });
  ctx.overlay.quad('bubble', { texture: bubbleArt.texture, width: bubbleArt.width, height: bubbleArt.height });

  // The amber route: out of PLAN, along the PANT row in front of the trays, past the
  // rack's LEFT end (so nothing ever rises out of PAY, spec 8 trap 9), up beside it, then
  // over the facade to the empty frame. 9:16's narrow frame cannot hold the rack's end, so
  // there the gems leave the frame left along the PLAN row and the boom picks them up again
  // above the rack.
  const SIDE = add(RACK_POS, [-(halfRack + (portrait ? 0.35 : 0.3)), 1.66, portrait ? 0.6 : 0.55]);
  const CLIMB = add(RACK_POS, [-(halfRack + (portrait ? 0.45 : 0.4)), 3.9, portrait ? 0.45 : 0.2]);
  const LANE_X = portrait ? 0.5 : 0.7;
  const UPPER = [[-3.2, 5.2, 7.6], [-0.6, 6.6, 3.6], [0, 6.6, -0.6]];
  const L_RACK = add(RACK_POS, [slotX(1, 4) * TILE_SCALE, 1.75, 0]);
  const heroRide = arcPath([L_RACK, add(L_RACK, [-0.35, -0.08, 0.55]), SIDE, CLIMB, ...UPPER]);
  const BP_SRC = add(RACK_POS, [-0.25, 1.62, 0.25]);
  const bpRide = arcPath([BP_SRC, add(SIDE, [0.1, -0.1, 0.1]), CLIMB, ...UPPER]);
  // each gem rides its own lane of the route (a ribbon, not a single file)
  const BURST_O = add(rackCentre, [0, -0.06, 0.4]);
  const gemPlan = gems.map((g, i) => {
    const h1 = hash01(i * 17 + 3), h2 = hash01(i * 29 + 11), h3 = hash01(i * 7 + 5);
    // (little depth jitter: the trailing gems stay near the focus plane, sharp and amber)
    const lane = (k) => [(hash01(i * 13 + k) - 0.5) * (k < 3 ? LANE_X : 0.7), (hash01(i * 31 + k) - 0.5) * 0.5, (hash01(i * 37 + k) - 0.5) * 0.2];
    const a = (i / N_GEMS) * Math.PI * 2 + h3 * 0.25, r = 0.55 + 0.45 * h2;
    const out = add(BURST_O, [Math.cos(a) * 1.25 * r, Math.sin(a) * 0.22 * r, 0.25 * h1]);
    // the gems nearest the left end leave first, so the burst peels off into the stream
    const k = (Math.cos(a) * r + 1) / 2;
    return {
      out, h1, h2, h3,
      pop: E.GEMS + 0.04 * h1,
      depart: E.GEMS + 0.16 + 0.34 * k + 0.05 * h1,
      travel: 1.35 + 0.2 * h2,
      size: (portrait ? 0.032 : 0.05) * (0.8 + 0.45 * h1),
      path: arcPath([out, add(SIDE, lane(1)), add(CLIMB, lane(2)), add(UPPER[0], lane(3)), add(UPPER[1], lane(4)), UPPER[2]], 120),
    };
  });
  const sloane = world.residents.sloane;
  const hammock = add(JW, [0.05, 0.19 * jungle.roomH + 0.2, -jungle.roomD / 2 + 0.35]);
  const perch = add(JW, [-2.6, 3.35, 0.5]);
  const HERO_END = 0.96;

  /** Where the hero L is at time t (world), after it leaves the rack at GEMS. */
  function heroPos(t) {
    if (t < E.GEMS) return L_RACK;
    if (t < E.BLUEPRINT_LAY) {
      const u = ease.inOutSine(seg(t, E.GEMS, E.BLUEPRINT_LAY));
      return add(heroRide(u * HERO_END), [0, Math.sin(u * Math.PI) * 0.25, 0]);
    }
    if (t < E.SLOANE_POP) {
      const k = ease.inOutCubic(seg(t, E.BLUEPRINT_LAY, E.BLUEPRINT_LAY + 0.6));
      return add(mix3(heroRide(HERO_END), perch, k), [0, Math.sin(t * 3) * 0.05 * k, 0]);
    }
    const u = seg(t, E.SLOANE_POP, E.SLOANE_POP + 0.35);
    const p = mix3(perch, hammock, ease.inQuad(u));
    const hop = u < 1 ? Math.sin(Math.PI * u) * 0.6 : Math.abs(Math.sin((t - E.SLOANE_POP - 0.35) * 9)) * 0.12 * Math.exp(-(t - E.SLOANE_POP - 0.35) * 5);
    return add(p, [0, hop, 0]);
  }

  // Each timber piece flies for 0.36 s and lands on its knock (eased in, so it hits hard).
  /** Flight progress 0..1 of piece i at t. */
  const pieceK = (i, t) => ease.inQuad(seg(t, E.KNOCKS[i] - 0.36, E.KNOCKS[i]));
  /** Piece i's position at t, room-local (the jungle group's space). */
  function piecePos(i, t) {
    const f = pieceK(i, t), L = LAND[i], sd = Math.sign(L[0]);
    if (i === 0) { const a = t - E.KNOCKS[0]; return [L[0], L[1] + (1 - f) * 2.2 + (a > 0 ? 0.06 * Math.max(0, Math.exp(-a * 16) * Math.sin(a * 38)) : 0), L[2]]; }
    if (i <= 2) return [L[0] + sd * (1 - f) * 3.0, L[1] + (1 - f) * 2.2 + Math.sin(Math.PI * f) * 0.8, L[2] + (1 - f) * 3.5];
    if (i === 3) return [L[0], L[1] + (1 - f) * 3.0, L[2]];
    return [L[0] + sd * (1 - f) * 4.0, L[1] + Math.sin(Math.PI * f) * 0.8, L[2]];
  }

  function poseBuild(t) {
    // before the drop the jungle is an empty frame being built; after it, the room
    if (t < E.GEMS) { house.setBuilt('jungle', false); return; }
    house.setBuilt('jungle', true);
    sloane.ch.visible = t >= E.SLOANE_POP; sloane.shadow.visible = t >= E.SLOANE_POP;
    jungle.painting.visible = t >= E.DROP;
    if (jungle.windowMesh) jungle.windowMesh.visible = t >= E.DROP;
    jungle.reveal.value = ease.inOutSine(seg(t, E.DROP, E.DROP + 0.4));
    // the room's own (dark) returns come in under the unroll, behind the pine stand-ins
    for (const w of jungle.returns) w.visible = t >= E.DROP;
    const K = E.KNOCKS;
    const flying = (i) => t >= K[i] - 0.36;
    const squash = (i, amp = 0.22) => (t < K[i] ? 1 : 1 - amp * Math.exp(-(t - K[i]) * 16) * Math.cos((t - K[i]) * 38));
    // 0 the pine floor drops in and rebounds a hair (the room's own floor comes in under
    // the unroll)
    jungle.floor.visible = t >= E.DROP;
    if (flying(0) && t < E.DROP + 0.4) { standFloor.visible = true; standFloor.position.set(...piecePos(0, t)); }
    // 1, 2 the pine returns swing in from outside the frame (up and toward the lens),
    // arcing over and turning flush with the posts; cut away under the unroll
    standIns.forEach((w, k) => {
      const i = 1 + k, sd = k === 0 ? -1 : 1;
      if (!flying(i) || t >= E.DROP + 0.4) return;
      w.visible = true;
      w.position.set(...piecePos(i, t));
      w.rotation.set(0, -sd * Math.PI / 2 + sd * (1 - pieceK(i, t)) * 1.3, 0);
      w.scale.set(1, squash(i, 0.1), 1);
    });
    // 3 the ceiling beam drops from well above; 4, 5 the trims fly in from off frame with
    // an up-arc. They stay for the rest of the oner (out of frame once inside the room).
    if (flying(3)) { beam.visible = true; beam.position.set(...piecePos(3, t)); beam.scale.set(1, squash(3), 1); }
    trims.forEach((m, k) => {
      const i = 4 + k;
      if (!flying(i)) return;
      m.visible = true;
      m.position.set(...piecePos(i, t));
      m.scale.set(squash(i), 1, 1);
    });
    // a pixel dust puff where each piece lands: stepped growth (15 fps), 0.6 -> 1.5 of its
    // size over 0.4 s, four alpha steps, drifting out from the room's centre
    puffs.forEach((pp, i) => {
      const a = t - K[i];
      if (a < 0 || a >= 0.4) return;
      const u = Math.floor(a * 15) / 15 / 0.4;
      const e = ease.outCubic(u);
      const at = PUFF_AT[i], out = at[0] === 0 ? 0 : Math.sign(at[0]);
      pp.visible = true;
      pp.scale.setScalar(1.2 * lerp(0.6, 1.5, e));
      pp.position.set(at[0] + (out || -0.5) * 0.35 * e, at[1] + 0.12 * e, at[2]);
      pp.material.opacity = Math.ceil((1 - u) * 4) / 4 * 0.85;
    });
  }

  function poseBlueprint(t) {
    const bp = blueprint.mesh;
    if (t < E.GEMS || t >= E.DROP + 0.22) return;
    bp.visible = true;
    const onBoard = add(JW, [0, jungle.roomH / 2, -jungle.roomD / 2 + 0.06]);
    if (t < E.BLUEPRINT_LAY) {
      const unf = ease.outBack(seg(t, E.GEMS, E.GEMS + 0.35), 1.4);
      const u = ease.inOutSine(seg(t, E.GEMS + 0.2, E.BLUEPRINT_LAY));
      const sway = Math.sin(u * Math.PI) * (portrait ? 0.12 : 0.35) * Math.sin(u * 7);
      bp.position.set(...add(bpRide(u * 0.97), [sway, -0.2 * Math.sin(u * Math.PI), 0]));
      bp.rotation.set(-0.3 + Math.sin(t * 5) * 0.25 * u, Math.sin(t * 3.3) * 0.4 * u, Math.sin(t * 4.1) * 0.3 * u);
      // it unfurls at PLAN's scale and grows to its full sheet once clear of the rack
      const g0 = portrait ? 0.36 : 0.62;
      const grow = g0 + (1 - g0) * ease.inOutSine(seg(t, E.GEMS + (portrait ? 0.6 : 0.35), E.GEMS + (portrait ? 1.15 : 0.9)));
      bp.scale.set(Math.max(0.05, unf) * grow, Math.max(0.05, unf) * grow, 1);
      blueprint.draw(0);
      blueprint.mat.opacity = 1;
    } else {
      const k = ease.inOutCubic(seg(t, E.BLUEPRINT_LAY, E.BLUEPRINT_LAY + 0.35));
      const from = bpRide(0.97);
      bp.position.set(...mix3(from, onBoard, k));
      bp.rotation.set(0, 0, 0);
      const full = jungle.roomW * 0.9 / 1.6;
      bp.scale.setScalar(1 + (full - 1) * k);
      blueprint.draw(seg(t, E.BLUEPRINT_LAY + 0.2, E.GEM_BURST + 0.25));
      // it fades as the wallpaper starts to unroll over it
      blueprint.mat.opacity = 1 - smooth(seg(t, E.DROP, E.DROP + 0.22));
    }
  }

  function poseHero(t) {
    // on the rack until the amber bursts, then carried in world space
    if (t < E.GEMS) return;
    if (L.parent !== hero) hero.add(L);
    L.position.set(0, 0, 0);
    L.rotation.set(0, 0, 0);
    L.scale.set(1, 1, 1);
    L.userData.body.castShadow = t > E.SLOANE_POP + 0.35;
    for (const m of sproutLeaves) m.castShadow = t > E.SLOANE_POP + 0.35;
    hero.visible = true;
    hero.position.set(...heroPos(t));
    const k = seg(t, E.GEMS, E.GEMS + 0.3);
    hero.rotation.set(Math.sin(t * 4) * 0.2 * k * (1 - seg(t, E.SLOANE_POP + 0.3, E.SLOANE_POP + 0.6)), 0, (Math.sin(t * 2.6) * 0.15 + (t > E.SLOANE_POP + 0.35 ? -0.25 : 0)) * k);
    hero.scale.setScalar(TILE_SCALE);
    // P, A, N of PLAN fold back into the blueprint
    for (const id of ['1:0', '1:1', '1:2']) {
      const o = tiles.get(id);
      if (!o) continue;
      const f = ease.inCubic(seg(t, E.GEMS, E.GEMS + 0.3));
      o.obj.rotation.x = -f * Math.PI / 2;
      o.obj.scale.setScalar(Math.max(0.001, 1 - f));
    }
  }

  // --- the amber (spec S01 4.09): the gems pop outward on a flat ellipse that stays on
  // the PLAN row, then stream out past the rack's left end and up the house; each gem
  // keeps a steady on-screen size (a fraction of the frame height at its depth)
  /** Gem i's world position at t (null while it is not out). */
  function gemPos(i, t) {
    const gp = gemPlan[i];
    const u = t - gp.pop, ride = (t - gp.depart) / gp.travel;
    if (u < 0 || ride > 1) return null;
    // the pop out from PLAN's centre onto the row, then the ride: off the row quickly, easing into the frame
    if (ride <= 0) return mix3(BURST_O, gp.out, ease.outCubic(clamp(u / (0.3 + 0.08 * gp.h3))));
    return gp.path(ease.inOutSine(Math.pow(ride, 0.7)));
  }
  function poseAmber(t, cam) {
    const vh = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2);
    const gk = GEM_TINT / lerp(1, TILE_EXPOSURE, tileShot(t));
    let lit = 0; const c = [0, 0, 0];
    gems.forEach((g, i) => {
      const gp = gemPlan[i];
      const p = gemPos(i, t);
      if (!p) { g.visible = false; return; }
      const u = t - gp.pop, ride = (t - gp.depart) / gp.travel;
      g.visible = true;
      g.position.set(...p);
      const pk = Math.max(0, spring(u, 3.4, 0.45));
      const sz = gp.size * dist(cam.pos, p) * vh * pk * (1 - 0.5 * seg(ride, 0.85, 1));
      g.scale.set(sz, sz, 1);
      g.material.rotation = gp.h2 * 6 + t * 2.4 * (gp.h1 - 0.5);
      // deep amber: undo the tile shots' exposure lift (it pushed the gems past AgX's
      // shoulder into cream) and warm the sprite, so the gold keeps its hue and dark rim
      g.material.color.setRGB(gk, gk * 0.66, gk * 0.12);
      g.material.opacity = Math.min(1, u * 12) * (1 - seg(ride, 0.9, 1));
      if (ride > 0) { lit++; c[0] += p[0]; c[1] += p[1]; c[2] += p[2]; }
    });
    // a warm glow rides with the stream once it is clear of the rack (on the trays it blew
    // the parchment out)
    amberGlow.visible = lit > 0;
    if (lit) {
      amberGlow.position.set(c[0] / lit, c[1] / lit, c[2] / lit + 1.5);
      amberGlow.intensity = Math.min(1, lit / 10) * 2.5 * seg(c[1] / lit, RACK_POS[1] + 3.2, RACK_POS[1] + 4.6);
    }
  }

  // The gold burst (6.29): the gems' sparks fly out of the frame's centre on bowed paths to
  // the six landing points, three or two to a point in a short diagonal (never a level
  // pair), wait there twinkling, and pop as their piece lands.
  const BURST_AT = add(JC, [0, 0, 0.4]);
  function poseBurst(t) {
    burst.forEach((b, i) => {
      const p = i % 6, m = Math.floor(i / 6), K = E.KNOCKS[p];
      const t0 = E.GEM_BURST + 0.04 * hash01(i * 5 + 1);
      const ta = Math.max(E.GEM_BURST + 0.45, K - 0.3);
      if (t < t0 || t >= K + 0.1) { b.visible = false; return; }
      b.visible = true;
      const target = add(add(JW, PUFF_AT[p]), [(m - 1) * 0.28, (m - 1) * 0.22, 0.1]);
      const bow = add(mix3(BURST_AT, target, 0.35), [(hash01(i * 13 + 7) - 0.5) * 1.4, 1.3 + hash01(i * 11 + 3) * 0.6, 0.6]);
      const u = ease.outCubic(seg(t, t0, ta));
      b.position.set(...[0, 1, 2].map((k) => (1 - u) * (1 - u) * BURST_AT[k] + 2 * u * (1 - u) * bow[k] + u * u * target[k]));
      const pop = t >= K ? 1 + 0.6 * seg(t, K, K + 0.1) : 1;
      const tw = u >= 1 ? 1 + 0.18 * Math.sin((t - ta) * 26 + i) : 1;
      b.scale.setScalar(0.65 * Math.max(0.001, spring(t - t0, 3.2, 0.45)) * tw * pop);
      b.material.rotation = hash01(i * 3 + 2) * 6 + (t - t0) * 3 * (hash01(i * 19 + 1) - 0.5);
      b.material.opacity = t >= K ? 1 - seg(t, K, K + 0.1) : 1;
    });
  }

  // Moths: each keeps its own height band (never two side by side at one height, so they
  // cannot pair into eyes); the loops are centred left of her and below her crown, over the
  // dark foliage and the hammock rather than the bright window (and, in 9:16, below the
  // bubble); at MOTH_LAND moth 0 settles on the L's sprout.
  const MOTH_BANDS = [0.35, 0.05, -0.25];
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
    const centre = add(head, [-0.95, -0.45, 0.25]);
    moths.group.position.set(...centre);
    moths.group.children.forEach((m, i) => {
      const a = t * (1.1 + i * 0.27) + i * 2.1;
      // (a loop 0.7 wide: its right end stays a hand's width left of her face)
      m.position.set(Math.sin(a) * 0.35, MOTH_BANDS[i] + Math.sin(a * 1.7 + i) * 0.05, Math.cos(a) * 0.3);
      // appear out of her fur: grow from her head over the pop
      m.scale.setScalar(Math.max(0.001, spring(t - E.SLOANE_POP - 0.1 - i * 0.12, 2.6, 0.6)));
    });
    // moth 0 flies down to the sprout and folds its wings on the beat
    const mk = seg(t, E.MOTH_LAND - 0.45, E.MOTH_LAND);
    if (mk > 0) {
      const m0 = moths.group.children[0];
      const tip = wpos(sprout);
      const land = [tip[0] - centre[0] + 0.02, tip[1] - centre[1] + 0.2, tip[2] - centre[2] + 0.05];
      const k = ease.inOutSine(mk);
      // it swings wide to the left on the way down, never alongside another moth
      m0.position.set(lerp(m0.position.x, land[0], k) - Math.sin(Math.PI * k) * 0.45, lerp(m0.position.y, land[1], k) + Math.sin(Math.PI * k) * 0.25, lerp(m0.position.z, land[2], k));
      // it lands with its wings open, holds them 0.2 s, then folds
      if (t >= E.MOTH_LAND) m0.material = t < E.MOTH_LAND + 0.2 ? mothOpen : mothFolded;
      m0.scale.setScalar(1);
    }
  }

  function sloaneBehaviour(t) {
    const pk = t < E.SLOANE_POP ? 0 : spring(t - E.SLOANE_POP, 3.2, 0.45);
    const talking = t > E.TYPE_START && t < E.TYPE_END && Math.floor(t * 6) % 2 === 0;
    return { sloane: { scale: Math.max(0.001, pk), pose: talking ? 'talk' : 'idle', facing: -1 } };
  }

  // ---------------- camera
  const mid = rackCentre;
  const face = add(JW, [sloane.x0, sloane.h * 0.82, sloane.z0]);
  let B, C, D, S, ORBIT;
  if (!portrait) {
    // all three trays with Ember beside the right upright (captions own the lower left)
    B = { pos: add(mid, [0.6, 0.25, 10.4]), target: add(mid, [0.5, -0.2, 0]), fov: mm(55) };
    // where the quick boom up arrives: the rack gone below frame, the amber rising into it
    C = { pos: [-3.6, 3.8, 21.0], target: [-3.0, 5.8, 4.0], fov: 29 };
    D = { pos: [0, 6.9, 13.5], target: [0, 6.6, 0], fov: mm(35) };
    S = { pos: add(face, [-0.4, 0.1, 5.8]), target: face, fov: mm(50) };
    ORBIT = 10;
  } else {
    // portrait: the three trays stacked at y 34 / 47 / 60 %, Ember soft in the lower right
    B = { pos: add(mid, [0.1, 1.9, 12.8]), target: add(mid, [0.1, -0.2, 0]), fov: mm(50) };
    C = { pos: [-3.6, 4.0, 23.5], target: [-4.3, 8.1, 4.0], fov: 40 };
    D = { pos: [0, 6.4, 12.4], target: [0, 6.6, 0], fov: 54 };
    // Sloane lower-middle right (feet ~72 %), the L in the hammock mid-frame at left
    S = { pos: [sloane.x0 - 0.66, JW[1] + 1.46, sloane.z0 + 8.0], target: [sloane.x0 - 0.76, JW[1] + 1.3, sloane.z0], fov: 40 };
    ORBIT = 5;
  }
  // The crane is one continuous spline through three keys, each channel (position, aim,
  // zoom) a Hermite curve with matched velocities at the joins:
  //   B (at rest, CRANE) -> M, the top of the boom (T_TOP): the tilt up off the rack after
  //     the amber bursts, which has the rack (and PAY) out of frame by ~4.8, before the
  //     amber caption comes in; M is C a fifth of the way along to D, and the curve goes
  //     through it at speed (no stop between the boom and the long crane);
  //   M -> D, the long crane to the frame, passing dead centre on it at exactly the drop
  //     and still moving;
  //   D -> S (below), the push to Sloane, which carries that momentum straight in.
  // Measured with travelPx every 1/30 s: peak 31 px (16:9) / 53 (9:16), at least 8 px
  // from 5.1 to 7.9 (11 in 9:16), no frame above 2.5x its neighbours.
  const T_TOP = E.GEMS + 1.1;
  const PUSH = 1.25; // the push to Sloane after the drop
  const MACRO_D = 10.5;
  /** 1 on the macro and rack shots, easing to 0 as the boom lifts off them. */
  const tileShot = (t) => 1 - smooth(seg(t, E.GEMS + 0.28, E.GEMS + 0.98));
  const smax = (a, b, k) => (a + b + Math.sqrt((a - b) * (a - b) + k * k)) / 2;

  /** Rig A: the macro follow of the L as it falls into PANT, whole words in frame. */
  function rigA(t) {
    const tt = Math.min(t, E.L_LAND);
    const Lp = followL(tt);
    const Lc = lPath(tt);
    rack.set.pose(tt);
    const WX = RACK_POS[0];
    if (!portrait) {
      // PLAY and PANT whole and right of centre, the rack's left end clear of the caption
      // column (cream type on cream parchment would not read); tilt up only as far as the
      // L's top needs
      const halfH = MACRO_D * Math.tan(THREE.MathUtils.degToRad(mm(85)) / 2);
      const need = Math.max(Lp[1], Lc[1]) + 0.27 + 0.12 - halfH;
      const ty = smax(1.0, need, 0.3);
      return { pos: [WX - 0.6, ty + 0.55, RACK_POS[2] + MACRO_D], target: [WX - 1.07, ty, RACK_POS[2]], fov: mm(85) };
    }
    // portrait: B's stack, tilting up with the L while it is above PLAY and down with it
    const up = 0.35 * smax(0, Math.max(Lp[1], Lc[1]) - 1.3, 0.2);
    return { pos: add(B.pos, [0, up * 0.5, 0]), target: add(B.target, [0, up, 0]), fov: B.fov };
  }

  // The velocities at the keys (world units a second). At M: twice the harmonic mean of
  // the neighbouring slopes, per component (0 where they disagree, so no channel ever
  // reverses). At D: the mean of the long crane's and the push's average velocities (a
  // Catmull-Rom tangent), a little less on position. The zoom settles at each key (it
  // widens on the crane and narrows on the push, so a carried rate would reverse it).
  const M = { pos: mix3(C.pos, D.pos, 0.2), target: mix3(C.target, D.target, 0.2), fov: lerp(C.fov, D.fov, 0.2) };
  // (9:16's narrow frame must be centred on the cell by the time the blueprint lays flat,
  // or the sheet and its PLAN hang off the right edge: its aim is most of the way over
  // at the boom top, and eases in rather than carrying speed into the drop)
  if (portrait) M.target[0] = lerp(C.target[0], D.target[0], 0.75);
  const T_BOOM = T_TOP - E.CRANE, T_LONG = E.DROP - T_TOP;
  const mono = (a, b, c, ta, tc) => b.map((_, i) => { const d0 = (b[i] - a[i]) / ta, d1 = (c[i] - b[i]) / tc; return d0 * d1 <= 0 ? 0 : (4 * d0 * d1) / (d0 + d1); });
  const V_M_POS = mono(B.pos, M.pos, D.pos, T_BOOM, T_LONG), V_M_AIM = mono(B.target, M.target, D.target, T_BOOM, T_LONG);
  const through = (c, d, s, k) => c.map((_, i) => k * ((d[i] - c[i]) / T_LONG + (s[i] - d[i]) / PUSH) / 2);
  const V_POS = through(M.pos, D.pos, S.pos, 0.8), V_AIM = through(M.target, D.target, S.target, portrait ? 0.5 : 1);
  const CREEP = [0, 0, -0.35 / (E.S04 - E.DROP - PUSH)]; // the slow drift in on Sloane after the push
  function onerCamera(t) {
    let r, roll = 0;
    if (t < E.L_LAND + 0.12) r = rigA(t);
    else if (t < E.CRANE) r = blend(rigA(t), B, ease.inOutSine(seg(t, E.L_LAND + 0.12, E.L_LAND + 0.8)));
    else if (t < E.DROP) {
      const s0 = seg(t, E.CRANE, E.DROP);
      const w = 16 * s0 * s0 * (1 - s0) * (1 - s0); // the orbit and Dutch tilt: in and out at rest
      let pos, target, fov;
      if (t < T_TOP) {
        const s = seg(t, E.CRANE, T_TOP);
        pos = hermite3(B.pos, ZERO3, M.pos, V_M_POS, s, T_BOOM); target = hermite3(B.target, ZERO3, M.target, V_M_AIM, s, T_BOOM); fov = lerp(B.fov, M.fov, smooth(s));
      } else {
        const s = seg(t, T_TOP, E.DROP);
        pos = hermite3(M.pos, V_M_POS, D.pos, V_POS, s, T_LONG); target = hermite3(M.target, V_M_AIM, D.target, V_AIM, s, T_LONG); fov = lerp(M.fov, D.fov, smooth(s));
      }
      const orbit = THREE.MathUtils.degToRad(ORBIT * w);
      const rel = [pos[0] - D.target[0], pos[2] - D.target[2]];
      r = { pos: [D.target[0] + rel[0] * Math.cos(orbit) - rel[1] * Math.sin(orbit), pos[1], D.target[2] + rel[0] * Math.sin(orbit) + rel[1] * Math.cos(orbit)], target, fov };
      roll = 1.5 * w;
    } else {
      // the push through the open front to Sloane: it leaves the drop at the crane's speed
      // and settles (with no jerk) into the slow drift on her, with a 4 deg arc right
      const s = seg(t, E.DROP, E.DROP + PUSH);
      const pos = add(quintic3(D.pos, V_POS, S.pos, CREEP, s, PUSH), CREEP.map((v) => v * Math.max(0, t - E.DROP - PUSH)));
      const target = quintic3(D.target, V_AIM, S.target, ZERO3, s, PUSH);
      const arc = THREE.MathUtils.degToRad(4 * smooth(s));
      const rel = [pos[0] - face[0], pos[2] - face[2]];
      r = {
        pos: [face[0] + rel[0] * Math.cos(arc) - rel[1] * Math.sin(arc), pos[1], face[2] + rel[0] * Math.sin(arc) + rel[1] * Math.cos(arc)],
        target,
        fov: lerp(D.fov, S.fov, smoother(s)),
      };
    }
    return { ...r, roll };
  }
  function blend(a, b, k) { return { pos: mix3(a.pos, b.pos, k), target: mix3(a.target, b.target, k), fov: lerp(a.fov, b.fov, k) }; }

  // frame-0 ping: a small warm light at the mirror image of the start camera in the L's face
  const CAM0 = onerCamera(0);
  const L0 = lPath(0);
  rack.set.pose(0);
  const GLINT = add(L0, [-0.1, 0.16, TILE_D * TILE_SCALE / 2]); // the face's upper left, above the glyph
  const toCam = [CAM0.pos[0] - GLINT[0], CAM0.pos[1] - GLINT[1], CAM0.pos[2] - GLINT[2]];
  const nrm = Math.hypot(...toCam);
  const PING_POS = add(GLINT, [-toCam[0] / nrm * 1.4, -toCam[1] / nrm * 1.4, toCam[2] / nrm * 1.4]);

  /** Screen travel (output px per 1/60 s) of a moving world point, seen through the moving rig. */
  function pointTravel(fn, t) {
    const proj = (p, rig) => {
      const f = norm3(sub3(rig.target, rig.pos)), r = norm3([-f[2], 0, f[0]]);
      const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
      const d = sub3(p, rig.pos), z = dot3(d, f);
      return [dot3(d, r) / z, dot3(d, u) / z];
    };
    const ra = onerCamera(t - 1 / 120), rb = onerCamera(t + 1 / 120);
    const a = proj(fn(t - 1 / 120), ra), b = proj(fn(t + 1 / 120), rb);
    return Math.hypot(a[0] - b[0], a[1] - b[1]) * FRAME_H / (2 * Math.tan(THREE.MathUtils.degToRad(rb.fov) / 2));
  }
  function blurAt(t) {
    const easing = t > E.L_LAND + 0.1 && t < E.L_LAND + 0.82;
    const crane = t >= E.CRANE && t < E.DROP + 1.3;
    if (!easing && !crane) return { n: 1, shutter: 1 / 60 };
    let px = travelPx(onerCamera, t, FRAME_H);
    // the hero L and the amber ride faster than the camera: blur for them too (every
    // third gem is enough to find the fastest)
    if (t > E.GEMS && t < E.SLOANE_POP + 0.4) px = Math.max(px, pointTravel(heroPos, t));
    // and for the timber, which lands fast (it would strobe in sharp copies otherwise)
    E.KNOCKS.forEach((k, i) => { if (t > k - 0.36 && t < k + 0.03) px = Math.max(px, pointTravel((ts) => add(JW, piecePos(i, ts)), t)); });
    if (t > E.GEMS && t < E.GEM_BURST + 0.2) {
      for (let i = 0; i < N_GEMS; i += 3) {
        if (!gemPos(i, t - 1 / 120) || !gemPos(i, t + 1 / 120)) continue;
        px = Math.max(px, pointTravel((ts) => gemPos(i, ts), t));
      }
    }
    rack.set.pose(t);
    return blurFor(px);
  }

  const shot = {
    id: 'S01-S03',
    start: 0,
    end: E.S04,
    mb: (t) => blurAt(t).n,
    shutter: (t) => blurAt(t).shutter,
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
      poseAmber(t, cam);
      poseBurst(t);
      poseS03(t);
      emberOut.visible = t < E.DROP;
      poseCharacter(emberOut, { pose: t > E.EMBER_TALK && t < E.EMBER_TALK + 1.2 && Math.floor(t * 6) % 2 === 0 ? 'talk' : 'idle', facing: -1 });
      // the heart: above her head in 16:9; in 9:16 over her right ear, on HEAR's tray just
      // after the R (her head sits just under the tray), inside x 918, and gone by 2.35, before
      // HEAR opens its end slot and the T comes down into that spot
      if (portrait) heart.position.set(emberOut.position.x + 0.04, emberOut.position.y + 1.05, emberOut.position.z);
      else heart.position.set(emberOut.position.x, emberOut.position.y + 1.95, emberOut.position.z);
      heart.userData.y0 = heart.position.y;
      poseEmote(heart, t - E.EMBER_TALK, portrait ? { hold: 0.55, rise: 0.06, fade: 0.25 } : { hold: 0.9 });
      // the ping: full to 0.3 s, gone by 0.7 s
      const pk = 1 - smooth(seg(t, 0.3, 0.7));
      ping.visible = pk > 0;
      ping.position.set(...PING_POS);
      ping.intensity = 0.6 * pk;
      const focusD = aim(camera, cam.pos, cam.target, cam.fov, cam.roll);
      // focus: the aim, but ride the hero L (and the amber around it) up the facade
      const kRide = seg(t, E.GEMS - 0.1, E.GEMS + 0.4) * (1 - seg(t, E.BLUEPRINT_LAY - 0.3, E.BLUEPRINT_LAY + 0.3));
      const focus = lerp(focusD, dist(cam.pos, heroPos(t)), kRide);
      const grade = world.pose(t, { dusk: 0, focus, aperture: 40, camera, behaviours: sloaneBehaviour(t) });
      // inside the room the sun's shadows and the meadow pollen fade out over half a second
      // (a hard switch popped the whole frame by a few luma codes)
      const sh = 1 - smooth(seg(t, E.DROP + 0.35, E.DROP + 0.85));
      world.sun.shadow.intensity = sh;
      world.sun.castShadow = sh > 0.001;
      world.pollen.uniforms.opacity.value *= sh;
      world.pollen.points.visible = sh > 0.001;
      // lens: the macro's shallow focus opens up through the crane and settles for the room
      const kc = smooth(seg(t, E.CRANE, E.CRANE + 1.2));
      const aperture = lerp(lerp(40, 12, kc), 30, smooth(seg(t, E.DROP, E.DROP + 0.8)));
      const maxBlur = lerp(18, 14, kc);
      // a small exposure lift on the tile shots (with the tiles' self-light, spec 2.2
      // swatches), easing back to the day look under the boom, never on a still frame
      const exposure = (grade.exposure ?? 1) * lerp(1, TILE_EXPOSURE, tileShot(t));
      return { scene: world.scene, camera, look: look(grade, 0, { exposure, msaa: t < E.CRANE, dof: { focus, aperture, maxBlur } }) };
    },
    overlay(t) {
      // Sloane's bubble, anchored above her head, typed at E.TYPE_CPS characters a second;
      // it holds to the hard cut into the montage
      if (t < E.BUBBLE || t >= E.S04) return;
      const open = spring(t - E.BUBBLE, 3.5, 0.5);
      const n = Math.floor(Math.max(0, t - E.TYPE_START) * E.TYPE_CPS);
      bubbleArt.draw(Math.min(n, bubbleArt.total));
      const head = add(JW, [sloane.x0, sloane.h + 0.1, sloane.z0]);
      const p = project(camera, head, ctx.overlay);
      const px = ctx.pxScale;
      const sc = 0.6 + 0.4 * open;
      // 16:9 upper right of her head (tail at the bubble's left); 9:16 above it with the
      // tail (at the bubble's right) over her head
      let x = portrait ? p.x - (0.32 * bubbleArt.width + 18 * px) * sc : p.x + bubbleArt.width / 2 + 30 * px;
      let y = portrait ? p.y - bubbleArt.height / 2 - 60 * px : p.y - bubbleArt.height / 2 - 20 * px;
      // clamp with the live scale (the pop overshoots) so the bubble never leaves the safe box
      const hw = (bubbleArt.width * sc) / 2 + 4 * px, hh = (bubbleArt.height * sc) / 2 + 4 * px;
      if (portrait) { x = Math.min(Math.max(x, 96 * px + hw), 918 * px - hw); y = Math.min(Math.max(y, 200 * px + hh), 1440 * px - hh); }
      else { x = Math.min(Math.max(x, 90 * px + hw), ctx.overlay.width - 90 * px - hw); y = Math.min(Math.max(y, 90 * px + hh), 972 * px - hh); }
      ctx.overlay.place('bubble', { x, y, scale: sc, opacity: Math.min(1, open * 1.5) });
    },
  };
  // QA handles (read by probe scripts only)
  shot.probe = { rack, L, T, gems, blueprint, hero, emberOut, heart, ping, sprout, moths, camera: onerCamera, heroPos, gemPos };
  return shot;
}

// The tile shots' swatch tuning (spec 2.2 / 7.2 gate 5, measured with qa/swatch.mjs on
// full-res stills at 0.5 and 2.9): exposure, the tiles' self-light and its chroma push,
// and the trays' self-light (held under the bloom threshold, or the trays veil the tiles).
const TILE_EXPOSURE = 1.6;
const TILE_SELF = 0.25;
const CHROMA_PUSH = 3.0;
const TRAY_EMISSIVE = 0.5;
const TRAY_GLOW = '#F3E2BF';
const GEM_TINT = 0.55; // the gems' sprite colour under the day grade (see poseAmber)
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm3 = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const ZERO3 = [0, 0, 0];
// PLANT's landing sparkles: [x from the rack centre, margin (+1 above the tiles, -1 below),
// size]. The x values are the gaps between PLANT's tiles (slot pitch 0.504, tiles 0.45
// wide); the margins sit between PLANT and its neighbour rows, and the sprout's side of
// the top margin is left clear so nothing pairs up around it.
const PLANT_SPARKS = [[-0.756, -1, 0.26], [0.252, 1, 0.24], [0.756, -1, 0.23], [-0.252, -1, 0.25], [0.756, 1, 0.26], [0.252, -1, 0.23]];
/** Cubic Hermite from a (velocity va) to b (velocity vb) over T seconds, at s in 0..1. */
function hermite3(a, va, b, vb, s, T) {
  const s2 = s * s, s3 = s2 * s;
  const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
  return a.map((_, i) => h00 * a[i] + h10 * va[i] * T + h01 * b[i] + h11 * vb[i] * T);
}
/** Quintic Hermite (zero acceleration at both ends): a (velocity va) to b (velocity vb) over T seconds. */
function quintic3(a, va, b, vb, s, T) {
  const s3 = s * s * s, s4 = s3 * s, s5 = s4 * s;
  const h0 = 1 - 10 * s3 + 15 * s4 - 6 * s5, h1 = s - 6 * s3 + 8 * s4 - 3 * s5;
  const h4 = -4 * s3 + 7 * s4 - 3 * s5, h5 = 10 * s3 - 15 * s4 + 6 * s5;
  return a.map((_, i) => h0 * a[i] + h1 * va[i] * T + h4 * vb[i] * T + h5 * b[i]);
}
