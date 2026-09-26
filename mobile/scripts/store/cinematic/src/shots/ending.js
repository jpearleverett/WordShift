// S09 "When you're away" (E.S09 to E.S10) and S10 "The sign / MOSTLY" (E.S10 to E.END).
//
// S09: a fast pull-back out of Ember's den to the dusk hero wide. The residents
//      chat in pairs through the shared walls, warm emotes cascade bottom to top on
//      sixteenths; nobody looks at the camera, nothing freezes, no light dips.
//      "The animals talk about you when you're away. / All good things." then
//      "Probably." in the bed's own breath (captions are global).
// S10: hard cut on the hit. The wooden sign slams down behind the word rack in the
//      meadow; "A cozy word game." fades up under it; a glint crosses the letters.
//      The rack reads M O S T _ Y with one tile face-away and askew: it trembles,
//      rocks, flips round to show the sprouted L, hops into line and clicks home on
//      the bed's final hit: MOSTLY. It holds to the last frame.

import * as THREE from 'three';
import { makeTile, setLocked, setTileGlow, makeSprout } from '../core/tiles.js';
import { slotX } from '../world/wordrow.js';
import { buildRack, RACK_ROWS_WORLD } from '../world/rack.js';
import { pixelWood } from '../world/house.js';
import { makeWordmarkSign } from '../world/logo.js';
import { makeBillboard, poseEmote } from '../world/fx.js';
import { drawText } from '../core/text.js';
import { ease, spring, seg, lerp } from '../core/math.js';
import { GROUND_Y, LAYOUT, RESIDENTS } from '../sets/world.js';
import { mm, add, mix3, aim, setAspect, look, project } from './common.js';

/** Native facing of each sprite's idle/talk art (+1 faces right). Fennick's portraits face left. */
const NATIVE = { fennick: -1 };

export default async function make(ctx) {
  const { world, camera, E, portrait, overlay } = ctx;
  const { house } = world;
  const px = ctx.pxScale;

  // ---------------------------------------------------------------- S09 props
  const EMOTES = ['note', 'heart', 'sparkle', 'thought'];
  const cascade = [];
  const order = LAYOUT.flat();
  for (let i = 0; i < order.length; i++) {
    const kind = EMOTES[i % EMOTES.length];
    cascade.push(world.register(await makeBillboard(`ui/emote_${kind}.png`, portrait ? 1.1 : 1.45)));
  }
  // conversation pairs: each resident talks toward a neighbour through the shared wall
  const partner = {};
  for (let r = 0; r < 4; r++) {
    const row = LAYOUT[r];
    const [a, b, c] = row.map((id) => RESIDENTS[id].name);
    partner[a] = { dir: 1, turn: 0, phase: r * 0.37 };
    partner[b] = { dir: -1, turn: 1, phase: r * 0.37 };
    partner[c] = { dir: -1, turn: 0, phase: r * 0.37 + 0.5 };
  }

  function chatter(t) {
    const beh = {};
    for (const [name, p] of Object.entries(partner)) {
      const turnLen = 0.9 + (p.phase % 0.3);
      const k = Math.floor((t + p.phase * 2) / turnLen);
      const mine = (k + p.turn) % 2 === 0;
      const talking = mine && Math.floor(t * 6 + p.phase * 10) % 2 === 0;
      const facing = p.dir * (NATIVE[name] || 1);
      beh[name] = { pose: talking ? 'talk' : 'idle', facing, bob: Math.max(0, Math.sin(t * 3.1 + p.phase * 7)) * 0.03 };
    }
    // a couple of short walks so the house keeps moving
    const w = (name, from, to, start, dur) => { beh[name] = { ...beh[name], walkFrom: from, walkTo: to, walkStart: start, walkDur: dur, endFacing: partner[name].dir * (NATIVE[name] || 1) }; };
    const rx = (name) => world.residents[name].x0;
    w('thyme', rx('thyme') + 0.6, rx('thyme'), E.S09 + 1.1, 1.2);
    w('warren', rx('warren') - 0.7, rx('warren'), E.S09 + 2.4, 1.4);
    w('chill', rx('chill') + 0.5, rx('chill'), E.S09 + 3.3, 1.1);
    return beh;
  }

  // ---------------------------------------------------------------- S10 props
  // The end card stands in the meadow left of the path, turned toward the camera so
  // the lit house sits soft on the right half of the frame. Everything below is in
  // the end group's local frame (origin on the ground at the rack, +z toward camera).
  const END = portrait ? { pos: [-6.5, GROUND_Y, 13.5], yaw: 0.3 } : { pos: [-9.5, GROUND_Y, 13], yaw: 0.44 };
  const end = new THREE.Group();
  end.position.set(...END.pos); end.rotation.y = END.yaw;
  world.register(end);
  const toWorld = (v) => {
    const c = Math.cos(END.yaw), s = Math.sin(END.yaw);
    return [END.pos[0] + v[0] * c + v[2] * s, END.pos[1] + v[1], END.pos[2] - v[0] * s + v[2] * c];
  };
  const rack = buildRack({ words: ['', '', ''] });
  rack.trays[1].visible = false; rack.trays[2].visible = false;
  end.add(rack.group);
  const letters = ['M', 'O', 'S', 'T', 'L', 'Y'];
  const endTiles = letters.map((ch) => { const tl = makeTile(ch); rack.rows[0].group.add(tl); return tl; });
  const heroL = endTiles[4];
  setLocked(heroL, 1);
  const sprout = makeSprout(); heroL.add(sprout);
  const TOP = RACK_ROWS_WORLD[0]; // top tray centre above the ground (local)

  // the sign on its two posts, behind the rack
  const sign = await makeWordmarkSign({ width: portrait ? 4.6 : 5.3, depth: 0.3 });
  const signBox = new THREE.Box3().setFromObject(sign); // local extents at rest
  const SIGN_Y = 5.1, SIGN_Z = -1.6;
  const signRig = new THREE.Group();
  signRig.position.set(0, 0, SIGN_Z);
  sign.position.y = SIGN_Y;
  signRig.add(sign);
  const postTex = pixelWood({ base: '#6B4629', planks: 2, seed: 71, vertical: true }); postTex.repeat.set(0.3, 3);
  const postMat = new THREE.MeshStandardMaterial({ map: postTex, roughness: 0.85 });
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.13, SIGN_Y, 0.13), postMat);
    post.position.set(sx * 1.3, SIGN_Y / 2 - 0.25, -0.12); post.castShadow = true; signRig.add(post);
  }
  end.add(signRig);
  // glint masked to the yellow (WORD) and blue (SHIFT) letter fills, so the wood never shines
  const glint = { value: -1 };
  const faceMat = sign.userData.face;
  faceMat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlint = glint;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlint;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 gc = texture2D( map, vMapUv ).rgb;
        float yellow = smoothstep(0.25, 0.4, gc.r - gc.b) * step(0.55, gc.g);
        float blue = smoothstep(0.12, 0.3, gc.b - gc.r);
        float band = exp(-pow((vMapUv.x + vMapUv.y * 0.25 - uGlint) * 9.0, 2.0));
        totalEmissiveRadiance += vec3(1.0, 0.93, 0.78) * band * max(yellow, blue) * 1.4;`);
  };
  faceMat.customProgramCacheKey = () => 'sign-glint';
  const signKey = new THREE.PointLight('#FFC98A', 3.5, 16, 1.6);
  signKey.position.set(0.5, SIGN_Y + 0.6, 2.2);
  const rackFill = new THREE.PointLight('#FFE2BE', 5, 12, 1.4);
  rackFill.position.set(1.6, TOP + 1.4, 4.2);
  end.add(signKey, rackFill);
  const signRim = new THREE.DirectionalLight('#FF9A6A', 1.2);
  signRim.position.set(-8, SIGN_Y + 6, -14);
  signRim.target.position.set(0, SIGN_Y, 0);
  end.add(signRim, signRim.target);
  // dust puff and two wood chips on the impact
  const puffTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(235,215,190,0.9)'); gr.addColorStop(1, 'rgba(235,215,190,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const dust = [];
  for (let i = 0; i < 5; i++) dust.push(world.register(new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false })), end));
  const chips = [0, 1].map(() => world.register(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.05), new THREE.MeshStandardMaterial({ color: '#8a5f3e' })), end));

  // the end line, anchored under the sign
  const lineArt = drawText({ text: 'A cozy word game.', font: 'Figtree', size: Math.round((portrait ? 64 : 60) * px), color: '#FFF3DC', shadow: { color: 'rgba(40,20,10,0.62)', blur: 12 * px, y: 3 * px }, glow: { color: 'rgba(40,20,10,0.3)', blur: 34 * px } });
  overlay.quad('endline', lineArt);

  function poseEndRack(t) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const tl = endTiles[i];
      tl.position.set(slotX(i, n), 0, 0);
      tl.rotation.set(0, 0, 0);
      tl.scale.set(1, 1, 1);
      setTileGlow(tl, 0);
    }
    // the L: face-away and askew until it rights itself
    const L = heroL;
    const base = [slotX(4, n), 0, 0];
    if (t < E.FLIP) {
      const tremble = t >= E.TREMBLE && t < E.TREMBLE + 0.07 ? Math.sin(t * 180) * 0.05 : 0;
      const rock = t >= E.ROCK ? Math.sin((t - E.ROCK) * 14) * Math.exp(-(t - E.ROCK) * 4) * 0.22 : 0;
      L.position.set(base[0] + 0.18, base[1] + 0.12, base[2] + 0.35);
      L.rotation.set(0.05, Math.PI + 0.1, 0.28 + tremble + rock);
      sprout.rotation.set(0, 0, 0.9);
    } else if (t < E.CLICK) {
      // flip round (in the air), hop sideways into line, click home
      const f = ease.inOutCubic(seg(t, E.FLIP, E.HOP));
      const h = seg(t, E.HOP, E.CLICK);
      const hop = Math.sin(Math.PI * Math.min(1, f + h)) * 0.55;
      L.position.set(lerp(base[0] + 0.18, base[0], ease.inOutSine(h)), base[1] + lerp(0.12, 0, h) + hop, lerp(base[2] + 0.35, base[2], h));
      L.rotation.set(0.05 * (1 - h), Math.PI + 0.1 - f * (Math.PI + 0.1), lerp(0.28, 0, f));
      sprout.rotation.set(0, 0, lerp(0.9, 0, spring(t - E.FLIP, 3, 0.4)));
    } else {
      const s = t - E.CLICK;
      const sq = 1 - 0.14 * Math.exp(-s * 12) * Math.cos(s * 30);
      L.position.set(base[0], base[1] + (sq - 1) * 0.6, base[2]);
      L.scale.set(2 - sq, sq, 2 - sq);
      const wig = t >= E.WIGGLE ? Math.sin((t - E.WIGGLE) * 18) * Math.exp(-(t - E.WIGGLE) * 5) * 0.35 : 0;
      sprout.rotation.set(0, 0, wig);
      // warm rim ripple left to right along MOSTLY
      for (let i = 0; i < n; i++) {
        const k = seg(t, E.CLICK + i * 0.06, E.CLICK + i * 0.06 + 0.25);
        if (k > 0 && k < 1) setTileGlow(endTiles[i], Math.sin(Math.PI * k) * 0.45);
      }
    }
    sprout.scale.setScalar(1);
  }

  function poseSign(t) {
    const s = t - E.S10;
    // the first frame is the impact: a squash that springs back
    const sq = 1 - 0.06 * Math.exp(-s * 10) * Math.cos(s * 26);
    sign.scale.set(2 - sq, sq, 1);
    sign.position.y = SIGN_Y - (1 - sq) * 0.9 + (s < 0 ? 3 : 0);
    glint.value = lerp(-0.25, 1.35, seg(t, E.GLINT, E.GLINT + 0.5));
    // dust puff at the posts' feet and two chips
    const puffK = seg(t, E.S10, E.S10 + 0.9);
    dust.forEach((d, i) => {
      d.visible = puffK > 0 && puffK < 1;
      const a = (i / dust.length) * Math.PI - Math.PI / 2;
      const r = ease.outCubic(puffK) * 1.4;
      d.position.set(Math.sin(a) * r * 1.6, 0.25 + ease.outCubic(puffK) * 0.4, SIGN_Z + Math.cos(a) * r * 0.4);
      const sz = 0.5 + puffK * 1.6; d.scale.set(sz, sz, 1);
      d.material.opacity = (1 - puffK) * 0.55;
    });
    chips.forEach((c, i) => {
      const k = seg(t, E.S10, E.S10 + 0.6);
      c.visible = k > 0 && k < 1;
      const dir = i ? 1 : -1;
      c.position.set(dir * (1.3 + k * 1.1), 0.1 + Math.sin(Math.PI * k) * 0.9, SIGN_Z + 0.2 + k * 0.4);
      c.rotation.set(k * 9, k * 7, k * 11 * dir);
    });
  }

  const SKY_S10 = portrait ? [-80, 22, -170] : [-120, 20, -170];
  world.track(world.sky); // S10 moves the painted sun behind the sign; begin() restores it

  // ---------------------------------------------------------------- cameras
  function s09Camera(t) {
    const den = house.rooms.cozy_den;
    const ember = world.residents.ember;
    const face = [den.x + ember.x0, den.y + ember.h * 0.7, ember.z0];
    const k = ease.inOutCubic(seg(t, E.S09, E.S09 + 0.9));
    const push = ease.inOutSine(seg(t, E.S09 + 0.9, E.S10));
    if (!portrait) {
      const a = { pos: add(face, [0.8, 0.3, 5]), target: face, fov: mm(50) };
      const b = { pos: [0, 11.8, 50 - 0.4 * push], target: [0, 8.8, 0], fov: mm(31) };
      return { pos: mix3(a.pos, b.pos, k), target: mix3(a.target, b.target, k), fov: lerp(a.fov, b.fov, k) };
    }
    const a = { pos: add(face, [0.5, 0.1, 6.2]), target: face, fov: mm(35) };
    const b = { pos: [0, 13.4, 44 - 0.4 * push], target: [0, 13.4, 0], fov: mm(24) };
    return { pos: mix3(a.pos, b.pos, k), target: mix3(a.target, b.target, k), fov: lerp(a.fov, b.fov, k) };
  }

  function s10Camera(t) {
    const push = seg(t, E.S10, E.END) * 0.015;
    if (!portrait) return { pos: toWorld([0.25, TOP + 0.35, 13.5 * (1 - push)]), target: toWorld([0, TOP + 1.0, 0]), fov: mm(50) };
    return { pos: toWorld([0.1, 1.6, (SIGN_Z + 11.4) * (1 - push)]), target: toWorld([0, 2.25, 0]), fov: 46 };
  }

  const s09 = {
    id: 'S09',
    start: E.S09,
    end: E.S10,
    mb: (t) => (t < E.S09 + 0.9 ? 3 : 1),
    pose(t) {
      setAspect(camera, portrait);
      const cam = s09Camera(t);
      const focus = aim(camera, cam.pos, cam.target, cam.fov);
      const wide = t > E.S09 + 0.6;
      // staggered emote cascade: bottom row first, left to right, one per sixteenth
      order.forEach((room, i) => {
        const r = world.residents[RESIDENTS[room].name];
        const rm = house.rooms[room];
        const head = [rm.x + r.x0, rm.y + r.h + 0.55, r.z0 + 0.1];
        const e = cascade[i];
        e.position.set(...head); e.userData.y0 = head[1];
        poseEmote(e, t - E.CASCADE[i], { hold: 1.3, rise: 0.35, fade: 0.4 });
      });
      const grade = world.pose(t, { dusk: 1, lamps: 1, focus, aperture: wide ? 9 : 26, camera, behaviours: chatter(t) });
      world.sun.castShadow = wide;
      return { scene: world.scene, camera, look: look(grade, 1, { msaa: false, contrast: 1.04, dof: { focus, aperture: wide ? 9 : 26, maxBlur: 10 } }) };
    },
  };

  const s10 = {
    id: 'S10',
    start: E.S10,
    end: E.END + 0.01,
    mb: (t) => (t < E.S10 + 0.12 ? 2 : 1),
    pose(t) {
      setAspect(camera, portrait);
      end.visible = true;
      // the painted sun sits behind the sign's left end
      world.sky.position.set(...SKY_S10);
      poseEndRack(t);
      poseSign(t);
      const cam = s10Camera(t);
      aim(camera, cam.pos, cam.target, cam.fov);
      const focus = Math.hypot(cam.pos[0] - END.pos[0], cam.pos[2] - END.pos[2]) + 0.7;
      const grade = world.pose(t, { dusk: 1, lamps: 1, focus, aperture: 22, camera, behaviours: chatter(t) });
      return { scene: world.scene, camera, look: look(grade, 1, { msaa: true, contrast: 1.04, exposure: 1.1, dof: { focus, aperture: 22, maxBlur: portrait ? 20 : 12 } }) };
    },
    overlay(t) {
      if (t < E.LINE) return;
      // under the sign's projected bounding box, with a 36 px gap
      const v = sign.localToWorld(new THREE.Vector3((signBox.min.x + signBox.max.x) / 2, signBox.min.y, signBox.max.z));
      const bottom = project(camera, [v.x, v.y, v.z], overlay);
      const k = ease.outCubic(seg(t, E.LINE, E.LINE + 0.4));
      overlay.place('endline', { x: bottom.x, y: bottom.y + (36 * px) + lineArt.height / 2 - 20 * px + (1 - k) * 12 * px, opacity: k });
    },
  };

  return [s09, s10];
}
