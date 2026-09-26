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
import { makeTile, setLocked, setTileGlow, makeSprout, TILE_SCALE, LOCKED } from '../core/tiles.js';
import { slotX } from '../world/wordrow.js';
import { buildRack, RACK_ROWS_WORLD } from '../world/rack.js';
import { pixelWood } from '../world/house.js';
import { makeWordmarkSign } from '../world/logo.js';
import { makeBillboard, poseEmote } from '../world/fx.js';
import { makeParticles } from '../world/env.js';
import { drawText } from '../core/text.js';
import { ease, spring, seg, lerp } from '../core/math.js';
import { GROUND_Y, LAYOUT, RESIDENTS } from '../sets/world.js';
import { mm, add, mix3, aim, setAspect, look, project, travelPx, blurFor } from './common.js';
import { emberDenX } from './handoff.js';
import { poseCharacter } from '../world/sprites.js';

/** Native facing of each sprite's idle/talk art (+1 faces right). Fennick's portraits face left. */
const NATIVE = { fennick: -1 };
/** S10: exposure, and how far the aquarium's painted light is held down beside the logo. */
const EXPOSURE_S10 = 1.16;
const AQUARIUM_S10 = 0.42;
/** S10: extra self-light on the end tiles so their faces hold the spec 2.2 swatches under the dusk key. */
const TILE_LIFT_S10 = 0.75;
/**
 * S10: the end tiles' self-light carries their own colour at twice its chroma (about its
 * luminance, in linear light). AgX's mid-tone desaturation otherwise washes the dusk-lit
 * faces to pastel (a bg-painted face under neutral light bottoms out near dE 8 from the spec
 * 2.2 swatches); with it the graded faces land on the swatches (qa/swatch.mjs at 38.9).
 */
const TILE_CHROMA_S10 = 2;
/** The locked L's powder blue is nearly grey, so the warm dusk pulls it pink: it carries more. */
const LOCK_CHROMA_S10 = 3.2;
const RACK_FILL_COLOR = '#FFFFFF';
const RACK_FILL = 8;

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
  // Conversation pairs: each resident talks toward a neighbour through the shared wall.
  // Talk turns run on one clock per floor (so a pair alternates), while every resident's
  // bob and stroll have their own phase (row * 0.37 + column * 0.23): no two rooms move in
  // unison, and no room is ever still.
  const partner = {};
  for (let r = 0; r < 4; r++) {
    LAYOUT[r].forEach((id, col) => {
      const name = RESIDENTS[id].name;
      partner[name] = { r, col, dir: col === 0 ? 1 : -1, turn: col === 1 ? 1 : 0, phase: r * 0.37 + col * 0.23, clock: col === 2 ? 0.5 : 0, room: id };
    });
  }
  const den = house.rooms.cozy_den;
  const EM_X = emberDenX(den); // where S08 leaves her (shots/handoff.js)
  // Strolls: { at, dx, dur } in order, each starting where the last one ended. A stroll
  // heads toward the chat partner unless it says otherwise; positions stay inside the
  // room. From "Probably." to the cut, the top two floors always have someone mid-walk.
  const P = E.PROBABLY;
  const STROLLS = {
    ember: { from: EM_X, walks: [{ at: E.S09 + 1.85, dx: 0.7, dur: 1.2 }, { at: P + 1.05, dx: 0.6, dur: 1.1 }] },
    panko: { walks: [{ at: E.S09 + 2.6, dx: -0.7, dur: 1.15 }, { at: P + 1.55, dx: -0.6, dur: 1.1 }] },
    archimedes: { walks: [{ at: E.S09 + 1.45, dx: -0.65, dur: 1.1 }, { at: P + 0.35, dx: -0.6, dur: 1.05 }] },
    sloane: { walks: [{ at: E.S09 + 2.15, dx: -0.7, dur: 1.2 }, { at: P + 1.25, dx: -0.6, dur: 1.1 }] },
    fennick: { walks: [{ at: E.S09 + 3.05, dx: -0.65, dur: 1.1 }, { at: P + 1.75, dx: -0.55, dur: 1.05 }] },
    // the three walks the first draft already had, then one more each
    thyme: { from: 0.6, walks: [{ at: E.S09 + 1.1, dx: -0.6, dur: 1.2 }, { at: P + 0.85, dx: -0.65, dur: 1.05 }] },
    warren: { from: -0.7, walks: [{ at: E.S09 + 2.4, dx: 0.7, dur: 1.4 }, { at: P + 0.15, dx: -0.7, dur: 1.1 }] },
    chill: { from: 0.5, walks: [{ at: E.S09 + 3.3, dx: -0.5, dur: 1.1 }, { at: P + 1.65, dx: 0.7, dur: 1.15 }] },
    bamboo: { walks: [{ at: E.S09 + 1.7, dx: 0.6, dur: 1.05 }, { at: P + 0.1, dx: 0.65, dur: 1.1 }, { at: P + 1.85, dx: 0.6, dur: 1.1 }] },
    // Vesper only ever walks away from the Star Loft's lantern (left of her), and stays small
    vesper: { walks: [{ at: E.S09 + 2.9, dx: 0.45, dur: 1.0 }, { at: P + 1.35, dx: 0.5, dur: 1.05 }] },
    moss: { walks: [{ at: E.S09 + 3.0, dx: -0.65, dur: 1.15 }, { at: P + 0.6, dx: -0.6, dur: 1.1 }] },
  };
  // resolve each plan to absolute room-local positions, clamped inside the room
  const LIMIT = 4 - 0.95;
  for (const [name, plan] of Object.entries(STROLLS)) {
    const x0 = world.residents[name].x0;
    let x = name === 'ember' ? plan.from : x0 + (plan.from || 0);
    plan.x0 = x;
    for (const w of plan.walks) {
      w.from = x;
      x = Math.max(-LIMIT, Math.min(LIMIT, x + w.dx));
      w.to = x;
    }
  }
  /** A resident's stroll state at t: room-local x, and walk frame phase while mid-stride. */
  function strollAt(name, t) {
    const plan = STROLLS[name];
    if (!plan) return { x: world.residents[name].x0, walking: false };
    let x = plan.x0;
    for (const w of plan.walks) {
      if (t < w.at) break;
      const u = seg(t, w.at, w.at + w.dur);
      x = lerp(w.from, w.to, ease.inOutSine(u));
      if (u < 1) {
        // the gait is tied to the ground covered, so feet never skate: one full two-step
        // cycle per ~0.55 of the resident's height
        const cyc = Math.abs(x - w.from) / (0.55 * world.residents[name].h);
        return { x, walking: true, phase: cyc, dir: Math.sign(w.to - w.from) || 1 };
      }
    }
    return { x, walking: false };
  }

  /** Behaviours for world.pose, plus the walk frames to lay on top of them afterwards. */
  function chatter(t) {
    const beh = {};
    const walks = [];
    for (const [name, p] of Object.entries(partner)) {
      const turnLen = 0.9 + p.r * 0.07;
      const k = Math.floor((t + p.r * 0.37 * 2 + p.clock) / turnLen);
      const mine = (k + p.turn) % 2 === 0;
      const talking = mine && Math.floor(t * 6 + p.phase * 10) % 2 === 0;
      const facing = p.dir * (NATIVE[name] || 1);
      const st = strollAt(name, t);
      // a gentle bob of 0.10 (about 5 px in the wide), each at its own rate and phase;
      // Ember's eases in so S08's hand-off does not jump
      const w = 3.0 + ((p.r * 5 + p.col * 3) % 7) * 0.09;
      let bob = 0.1 * (0.5 - 0.5 * Math.cos(t * w + p.phase * 7));
      if (name === 'ember') bob *= ease.inOutSine(seg(t, E.S09 + 0.35, E.S09 + 1.2));
      if (st.walking) { bob = 0; walks.push([name, st]); }
      beh[name] = { pose: talking ? 'talk' : 'idle', facing, bob, walkFrom: st.x };
    }
    return { beh, walks };
  }
  /** Lay the stroll frames over world.pose's idle/talk (after world.pose). */
  function applyWalks(walks) {
    for (const [name, st] of walks) poseCharacter(world.residents[name].ch, { pose: 'walk', walkPhase: st.phase, facing: st.dir });
  }

  // fireflies sized for the wide (the world's are ~1 px at 50 units), with the same pair
  // separation as S06: no two resting points share a height within 1.2 units while
  // standing within 2.6 of each other across, so no two can read as a pair of eyes
  const wideFlies = makeParticles({ count: 56, boxMin: [-21, -0.5, 4], boxMax: [21, 10, 28], color: '#ffd76a', size: 40, intensity: 4.2, drift: [1.0, 0.45, 1.0], seed: 613 });
  wideFlies.uniforms.pxScale.value = px;
  {
    const a = wideFlies.points.geometry.attributes.position.array;
    const tooClose = (i) => { for (let j = 0; j < i; j++) if (Math.abs(a[i * 3 + 1] - a[j * 3 + 1]) < 1.2 && Math.hypot(a[i * 3] - a[j * 3], a[i * 3 + 2] - a[j * 3 + 2]) < 2.6) return true; return false; };
    for (let i = 0; i < a.length / 3; i++) {
      for (let k = 0; k < 24 && tooClose(i); k++) { a[i * 3] = -21 + ((a[i * 3] + 21 + 7.3) % 42); a[i * 3 + 1] = -0.5 + ((a[i * 3 + 1] + 0.5 + 2.9) % 10.5); }
    }
  }
  world.register(wideFlies.points);

  // ---------------------------------------------------------------- S10 props
  // The end card stands in the meadow left of the path, turned toward the camera so
  // the lit house sits soft on the right half of the frame. Everything below is in
  // the end group's local frame (origin on the ground at the rack, +z toward camera).
  // Per aspect: the spec layout (16:9 sign centre ~29% of the height, line ~45%, tiles
  // ~58-70% and at least 110 px wide; 9:16 sign 18-26% and 900+ px wide, tiles 42-50%).
  // The sign stands 1.0 behind the rack so one focus plane holds both crisp while the
  // house, ~20 units further, goes soft.
  const L10 = portrait
    ? { end: { pos: [-6.5, GROUND_Y, 13.5], yaw: 0.3 }, signW: 5.4, signY: 5.1, signZ: -1.0, cam: { pos: [0.1, 1.6, 10.4], target: [0, 2.25, 0], fov: 46 } }
    : { end: { pos: [-9.5, GROUND_Y, 13], yaw: 0.44 }, signW: 5.0, signY: 4.18, signZ: -1.0, cam: { pos: [0.1, 2.85, 9.0], target: [0, 3.05, 0], fov: mm(50) } };
  const END = L10.end;
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
  /** Per-channel gain that turns `hex` (linear) into itself at `k` times the chroma. */
  const chromaGain = (hex, k) => {
    const c = new THREE.Color(hex);
    const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    const g = [c.r, c.g, c.b].map((x) => Math.max(0, l + (x - l) * k) / Math.max(x, 1e-4));
    return new THREE.Color(g[0], g[1], g[2]);
  };
  for (const tl of endTiles) {
    const u = tl.userData;
    const bg = tl === heroL ? LOCKED.bg : u.color.bg;
    u.faceMat.emissive.copy(chromaGain(u.color.bg, TILE_CHROMA_S10));
    u.lockMat.emissive.copy(chromaGain(LOCKED.bg, LOCK_CHROMA_S10));
    u.bodyMat.emissive.set(bg).multiply(chromaGain(bg, tl === heroL ? LOCK_CHROMA_S10 : TILE_CHROMA_S10));
  }
  const sprout = makeSprout(); heroL.add(sprout);
  const TOP = RACK_ROWS_WORLD[0]; // top tray centre above the ground (local)

  // the sign on its two posts, behind the rack
  const sign = await makeWordmarkSign({ width: L10.signW, depth: 0.3 });
  const signBox = new THREE.Box3().setFromObject(sign); // local extents at rest
  const SIGN_Y = L10.signY, SIGN_Z = L10.signZ;
  const signRig = new THREE.Group();
  signRig.position.set(0, 0, SIGN_Z);
  sign.position.y = SIGN_Y;
  signRig.add(sign);
  // The posts stand exactly behind the rack's uprights as the locked camera sees them, so
  // the frame holds two uprights that simply carry on up to the sign (never four sticks).
  const UP_X = ((rack.trayW + 0.2) / 2) * TILE_SCALE, UP_Z = -0.35 * TILE_SCALE;
  const POST_Z = SIGN_Z - 0.12;
  const postX = (sx) => { const [cx, , cz] = L10.cam.pos; return cx + (sx * UP_X - cx) * (cz - POST_Z) / (cz - UP_Z); };
  const postTex = pixelWood({ base: '#6B4629', planks: 2, seed: 71, vertical: true }); postTex.repeat.set(0.3, 3);
  const postMat = new THREE.MeshStandardMaterial({ map: postTex, roughness: 0.85 });
  const posts = [-1, 1].map((sx) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.13, SIGN_Y, 0.13), postMat);
    post.position.set(postX(sx), SIGN_Y / 2 - 0.25, -0.12); post.castShadow = true; signRig.add(post);
    return post;
  });
  end.add(signRig);
  // A narrow glint, tinted by the letter it crosses and masked to the yellow (WORD) and blue
  // (SHIFT) fills, so the wood never shines; the carved eye above O-R is masked out outright.
  // The band is smeared over the shutter in the shader (five taps), so it never strobes.
  const glint = { value: -1 };
  const glintSpan = { value: 0 };
  const faceMat = sign.userData.face;
  faceMat.onBeforeCompile = (sh) => {
    sh.uniforms.uGlint = glint;
    sh.uniforms.uGlintSpan = glintSpan;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlint;\nuniform float uGlintSpan;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        vec3 gc = texture2D( map, vMapUv ).rgb;
        float yellow = smoothstep(0.25, 0.4, gc.r - gc.b) * step(0.55, gc.g);
        float blue = smoothstep(0.12, 0.3, gc.b - gc.r);
        float eye = smoothstep(1.0, 1.5, length((vMapUv - vec2(0.40, 0.752)) / vec2(0.075, 0.11)));
        float gx = vMapUv.x + vMapUv.y * 0.25;
        float band = 0.0;
        for (int i = 0; i < 5; i++) band += exp(-pow((gx - uGlint + uGlintSpan * (float(i) / 4.0 - 0.5)) * 22.0, 2.0));
        totalEmissiveRadiance += mix(gc, vec3(1.0, 0.95, 0.85), 0.2) * 0.9 * 2.0 * (band / 5.0) * max(yellow, blue) * eye;`);
  };
  faceMat.customProgramCacheKey = () => 'sign-glint';
  const signKey = new THREE.PointLight('#FFC98A', 3.5, 16, 1.6);
  signKey.position.set(0.5, SIGN_Y + 0.6, 2.2);
  const rackFill = new THREE.PointLight(RACK_FILL_COLOR, RACK_FILL, 12, 1.4);
  rackFill.position.set(1.6, TOP + 1.4, 4.2);
  end.add(signKey, rackFill);
  const signRim = new THREE.DirectionalLight('#FF9A6A', 1.2);
  signRim.position.set(-8, SIGN_Y + 6, -14);
  signRim.target.position.set(0, SIGN_Y, 0);
  end.add(signRim, signRim.target);
  // two wood chips spring off the sign's ends on the impact
  const chips = [0, 1].map(() => world.register(new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.08), new THREE.MeshStandardMaterial({ color: '#8a5f3e' })), end));
  // The impact's dust: small pixel puffs (three stepped alpha tiers, nearest-filtered) at the
  // sign's ends and along its lower edge, and at the posts' feet where those are in frame.
  const puffTex = (() => {
    // a little three-lump pixel cloud: lit top-left, shaded underneath, three alpha steps
    const c = document.createElement('canvas'); c.width = c.height = 16;
    const g = c.getContext('2d');
    const lumps = [[5.5, 9.8, 3.3], [10.6, 9.2, 3.6], [8.0, 5.6, 3.0]];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const d = Math.min(...lumps.map(([lx, ly, r]) => Math.hypot(x + 0.5 - lx, y + 0.5 - ly) - r)) + 0.35 * Math.sin(x * 2.1 + y * 1.3);
        const a = d < -1.4 ? 0.85 : d < 0 ? 0.55 : d < 1 ? 0.22 : 0;
        if (!a) continue;
        const rgb = y > 10 ? '150,122,96' : x + y < 13 ? '232,212,178' : '198,172,138';
        g.fillStyle = `rgba(${rgb},${a})`; g.fillRect(x, y, 1, 1);
      }
    }
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace; tx.magFilter = THREE.NearestFilter; tx.minFilter = THREE.NearestFilter; tx.generateMipmaps = false;
    return tx;
  })();
  const VIS = { hw: (L10.signW * 0.868) / 2, hh: (L10.signW / 4) * 0.4 }; // the wordmark's inked extents (the PNG has margins)
  const PUFFS = [
    { at: [-VIS.hw * 0.97, SIGN_Y - VIS.hh * 0.3, SIGN_Z + 0.25], dir: [-1, 0.3], size: 0.38 },
    { at: [VIS.hw * 0.97, SIGN_Y - VIS.hh * 0.3, SIGN_Z + 0.25], dir: [1, 0.3], size: 0.38 },
    { at: [-VIS.hw * 0.58, SIGN_Y - VIS.hh * 1.0, SIGN_Z + 0.25], dir: [-0.6, -0.35], size: 0.32 },
    { at: [VIS.hw * 0.6, SIGN_Y - VIS.hh * 1.0, SIGN_Z + 0.25], dir: [0.6, -0.35], size: 0.32 },
    { at: [postX(-1), 0.14, POST_Z + 0.12], dir: [-0.6, 0.2], size: 0.42, foot: true },
    { at: [postX(1), 0.14, POST_Z + 0.12], dir: [0.6, 0.2], size: 0.42, foot: true },
  ];
  const puffs = PUFFS.map(() => world.register(new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, depthWrite: false })), end));
  const footInFrame = PUFFS.map((p) => !p.foot || null); // decided once from the locked camera (below)

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
      setTileGlow(tl, TILE_LIFT_S10);
    }
    // The L: face-away and askew in its own slot (in front of the tray, clear of T and Y)
    // until it rights itself: a two-frame coil, a turn over ~0.33 s on one lift arc, and
    // a drop straight back into the slot that clicks on the bed's final hit.
    const L = heroL;
    const base = [slotX(4, n), 0, 0];
    const REST = [-0.02, 0.12, 0.35], ROLL = 0.18, AWAY = Math.PI + 0.1;
    const tremble = t >= E.TREMBLE && t < E.TREMBLE + 0.07 ? Math.sin((t - E.TREMBLE) * 180) * 0.05 : 0;
    const rock = t >= E.ROCK ? Math.sin((t - E.ROCK) * 14) * Math.exp(-(t - E.ROCK) * 4) * 0.22 : 0;
    if (t < E.CLICK) {
      const coil = ease.inOutSine(seg(t, E.FLIP - 0.07, E.FLIP)) * (1 - ease.outCubic(seg(t, E.FLIP, E.FLIP + 0.1)));
      const turn = ease.inOutSine(seg(t, E.FLIP, E.FLIP + 0.33));
      const lift = Math.sin(Math.PI * seg(t, E.FLIP, E.CLICK)) * 0.45;
      const xk = ease.inOutSine(seg(t, E.HOP, E.CLICK - 0.05));
      const zk = ease.inOutSine(seg(t, E.CLICK - 0.12, E.CLICK));
      L.position.set(base[0] + REST[0] * (1 - xk), base[1] + REST[1] * (1 - turn) + lift - 0.04 * coil, base[2] + REST[2] * (1 - zk));
      L.rotation.set(0.05 * (1 - turn), AWAY * (1 - turn), (ROLL + tremble + rock + 0.05 * coil) * (1 - turn));
      sprout.rotation.set(0, 0, t < E.FLIP ? 0.9 : lerp(0.9, 0, spring(t - E.FLIP, 3, 0.4)));
    } else {
      const s = t - E.CLICK;
      const sq = 1 - 0.14 * Math.exp(-s * 12) * Math.cos(s * 30);
      L.position.set(base[0], base[1] + (sq - 1) * 0.6, base[2]);
      L.rotation.set(0, 0, 0);
      L.scale.set(2 - sq, sq, 2 - sq);
      const wig = t >= E.WIGGLE ? Math.sin((t - E.WIGGLE) * 18) * Math.exp(-(t - E.WIGGLE) * 5) * 0.35 : 0;
      sprout.rotation.set(0, 0, wig);
      // warm rim ripple left to right along MOSTLY
      for (let i = 0; i < n; i++) {
        const k = seg(t, E.CLICK + i * 0.06, E.CLICK + i * 0.06 + 0.25);
        if (k > 0 && k < 1) setTileGlow(endTiles[i], TILE_LIFT_S10 + Math.sin(Math.PI * k) * 0.45);
      }
    }
    // never a partial or mirrored glyph: the letter shows only once the face has turned
    // well round toward the camera (never edge-on)
    const show = Math.cos(L.rotation.y) > 0.35;
    L.userData.face.visible = show; L.userData.lockFace.visible = show;
    sprout.scale.setScalar(1);
  }

  function poseSign(t) {
    // the first frame is the impact (solid, squashed 0.94 / 1.06), springing back
    const s = Math.max(0, t - E.S10);
    const sq = 1 - 0.06 * Math.exp(-s * 10) * Math.cos(s * 26);
    sign.scale.set(2 - sq, sq, 1);
    sign.position.y = SIGN_Y - (1 - sq) * 0.9;
    // one sweep at constant speed, then gone (never lingering)
    const GLINT_DUR = 0.5;
    const g = seg(t, E.GLINT, E.GLINT + GLINT_DUR);
    glint.value = g > 0 && g < 1 ? lerp(-0.25, 1.35, g) : -1;
    glintSpan.value = 1.6 / GLINT_DUR / 60;
    // two chips spring off the sign's ends
    chips.forEach((c, i) => {
      const k = seg(t, E.S10, E.S10 + 0.7);
      c.visible = k < 1;
      const dir = i ? 1 : -1;
      c.position.set(dir * (VIS.hw * 0.95 + k * 0.9), SIGN_Y + 0.2 + Math.sin(Math.PI * k * 0.8) * 0.7 - k * k * 1.6, SIGN_Z + 0.3 + k * 0.3);
      c.rotation.set(k * 9, k * 7, k * 11 * dir);
    });
    // dust: pixel-stepped (15 fps growth, four alpha steps), 0.6 -> 1.4 over 0.35 s
    const u = Math.floor(s * 15) / 15 / 0.35;
    puffs.forEach((p, i) => {
      const q = PUFFS[i];
      p.visible = u < 1 && footInFrame[i] !== false;
      if (!p.visible) return;
      const e = ease.outCubic(u);
      const sz = q.size * lerp(0.6, 1.4, e);
      p.scale.set(sz, sz, 1);
      p.position.set(q.at[0] + q.dir[0] * 0.3 * e, q.at[1] + q.dir[1] * 0.3 * e + 0.08 * e, q.at[2]);
      p.material.opacity = Math.ceil((1 - u) * 4) / 4 * 0.85;
    });
  }

  const SKY_S10 = portrait ? [-80, 22, -170] : [-120, 20, -170];
  world.track(world.sky); // S10 moves the painted sun behind the sign; begin() restores it

  // ---------------------------------------------------------------- cameras
  // S08 -> S09 is one continuous move: the pull-back starts exactly where S08's camera
  // ends (sampled once from S08 itself; the same value whatever frame asks first).
  let handoff = null;
  function s08End() {
    if (handoff !== null) return handoff;
    handoff = false;
    const s08 = (ctx.shots || []).find((s) => s.id === 'S08');
    if (!s08) return handoff;
    world.begin();
    const f = s08.pose(E.S09 - 1e-4, ctx);
    const dir = new THREE.Vector3(); f.camera.getWorldDirection(dir);
    const d = f.look?.dof?.focus ?? 6;
    const p = f.camera.position;
    handoff = { pos: [p.x, p.y, p.z], target: [p.x + dir.x * d, p.y + dir.y * d, p.z + dir.z * d], fov: f.camera.fov, aperture: f.look?.dof?.aperture ?? 26 };
    world.begin();
    return handoff;
  }

  // The hold: 16:9 fills about 70-75% of the height with the room grid (a visible 2-unit
  // push over 28.4-33.9), placed so the tease captions (bottom centre, baseline 918) sit on
  // the grass below the ground-floor residents' chins, from a little above so no floor's
  // front edge hides the feet of the residents above it. 9:16 keeps the whole house, with
  // the ground floor above the Shorts/Reels UI (y 1440).
  function s09Camera(t) {
    const ember = world.residents.ember;
    const face = [den.x + EM_X, den.y + ember.h * 0.7, ember.z0];
    const k = ease.inOutCubic(seg(t, E.S09, E.S09 + 0.9));
    const push = ease.inOutSine(seg(t, E.S09 + 0.9, E.S10));
    const from = s08End();
    const a = from || (portrait ? { pos: add(face, [0.5, 0.1, 6.2]), target: face, fov: mm(35) } : { pos: add(face, [0.8, 0.3, 5]), target: face, fov: mm(50) });
    const b = portrait
      ? { pos: [0, 13.4, 44 - 1.2 * push], target: [0, 12.1, 0], fov: mm(24) }
      : { pos: [0, 11.5, 36.5 - 2.0 * push], target: [0, 6.0, 0], fov: mm(35) };
    return { pos: mix3(a.pos, b.pos, k), target: mix3(a.target, b.target, k), fov: lerp(a.fov, b.fov, k), k, aperture: lerp(from ? from.aperture : 26, 9, k) };
  }
  /** Adaptive motion blur for the pull-back: enough subframes that copies sit <= 2.5 px apart. */
  const s09Blur = (t) => blurFor(travelPx((ts) => s09Camera(ts), t, portrait ? 1920 : 1080));

  function s10Camera(t) {
    const push = seg(t, E.S10, E.END) * 0.015; // locked off, with a 1.5% push to the end
    const c = L10.cam;
    return { pos: toWorld([c.pos[0], c.pos[1], c.pos[2] * (1 - push)]), target: toWorld(c.target), fov: c.fov };
  }
  const depthOf = (p) => -new THREE.Vector3(p[0], p[1], p[2]).applyMatrix4(camera.matrixWorldInverse).z;
  // the post feet's dust shows only where the locked camera actually sees the feet
  {
    const c = s10Camera(E.S10);
    const cam = new THREE.PerspectiveCamera(c.fov, portrait ? 9 / 16 : 16 / 9, 0.05, 900);
    cam.position.set(...c.pos); cam.lookAt(...c.target); cam.updateMatrixWorld();
    PUFFS.forEach((q, i) => {
      if (!q.foot) return;
      const v = new THREE.Vector3(...toWorld(q.at)).project(cam);
      footInFrame[i] = Math.abs(v.x) < 0.95 && v.y > -0.95 && v.y < 0.95;
    });
  }

  // The hero L waits on the den's mantel through S08 (its prop, registered there): S09's
  // pull-back starts on the same den, so the L stays on its mantel through the wide rather
  // than vanishing at the hand-off. Found once in the den by what it is (a locked L tile).
  let mantel = null;
  function mantelProps() {
    if (mantel) return mantel;
    const kids = den.builtG.children;
    const tile = kids.find((o) => o.children.length === 1 && o.children[0].userData?.ch === 'L');
    const shadow = tile && kids.find((o) => o !== tile && o.isMesh && o.position.x === tile.position.x && o.position.z === tile.position.z && o.position.y < tile.position.y);
    mantel = [tile, shadow].filter(Boolean);
    return mantel;
  }

  /** S08 leans Ember back as she looks up; nothing here may inherit it. */
  function uprightResidents() { for (const r of Object.values(world.residents)) r.ch.rotation.set(0, 0, 0); }

  const s09 = {
    id: 'S09',
    start: E.S09,
    end: E.S10,
    mb: (t) => s09Blur(t).n,
    shutter: (t) => s09Blur(t).shutter,
    pose(t) {
      setAspect(camera, portrait);
      const cam = s09Camera(t);
      const focus = aim(camera, cam.pos, cam.target, cam.fov);
      const wide = cam.k > 0.6;
      const ch = chatter(t);
      const grade = world.pose(t, { dusk: 1, lamps: 1, focus, aperture: cam.aperture, camera, behaviours: ch.beh });
      applyWalks(ch.walks);
      uprightResidents();
      for (const o of mantelProps()) o.visible = true;
      // staggered emote cascade: bottom row first, left to right, one per sixteenth; each
      // emote rides above its resident's head wherever the stroll has taken them
      order.forEach((room, i) => {
        const r = world.residents[RESIDENTS[room].name];
        const rm = house.rooms[room];
        const head = [rm.x + r.ch.position.x, rm.y + r.ch.position.y + r.h + 0.55, r.z0 + 0.1];
        const e = cascade[i];
        e.position.set(...head); e.userData.y0 = head[1];
        poseEmote(e, t - E.CASCADE[i], { hold: 1.3, rise: 0.35, fade: 0.4 });
      });
      world.sun.castShadow = wide;
      // the wide's fireflies fade in once the camera is out of the den
      const fk = seg(cam.k, 0.55, 1);
      wideFlies.points.visible = fk > 0.001;
      Object.assign(wideFlies.uniforms.time, { value: t }); wideFlies.uniforms.focus.value = focus;
      wideFlies.uniforms.aperture.value = cam.aperture; wideFlies.uniforms.opacity.value = fk;
      return { scene: world.scene, camera, look: look(grade, 1, { msaa: false, exposure: portrait ? 1.16 : 1.24, dof: { focus, aperture: cam.aperture, maxBlur: 10 } }) };
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
      camera.updateMatrixWorld();
      // one focus plane for both the tiles and the sign (their harmonic mean), with the
      // aperture that keeps both within ~1 px while the house, ~20 units on, goes soft
      const dT = depthOf(toWorld([0, TOP, 0.08])), dS = depthOf(toWorld([0, SIGN_Y, SIGN_Z]));
      const focus = 2 / (1 / dT + 1 / dS);
      const aperture = Math.min(40, 1.0 / Math.abs(1 - focus / dT));
      const ch = chatter(t);
      const grade = world.pose(t, { dusk: 1, lamps: 1, focus, aperture, camera, behaviours: ch.beh });
      applyWalks(ch.walks);
      uprightResidents();
      // Ember is in the den window behind the card: she stays out of the end frame
      world.residents.ember.ch.visible = false; world.residents.ember.shadow.visible = false;
      // the aquarium's bright water sits right beside the logo: its painted light is held
      // down here only (world.pose sets it afresh every frame, so nothing carries over)
      const aq = house.rooms.aquarium;
      aq.mat.emissiveIntensity *= AQUARIUM_S10; aq.mat.color.multiplyScalar(AQUARIUM_S10); aq.light.intensity *= AQUARIUM_S10;
      return { scene: world.scene, camera, look: look(grade, 1, { msaa: true, exposure: EXPOSURE_S10, dof: { focus, aperture, maxBlur: 20 } }) };
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
