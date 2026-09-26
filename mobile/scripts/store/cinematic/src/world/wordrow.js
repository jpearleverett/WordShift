// A word laid out as tiles along a line, with the game's move made physical:
// a letter lifts out (the row closes up), and a target row opens a slot for
// it (neighbours slide apart), then the letter lands with squash and settle.
// Holders: a parchment tray (like the game's rows) or a twine garland.

import * as THREE from 'three';
import { makeTile, TILE_W, TILE_H, TILE_D } from '../core/tiles.js';
import { clamp, ease, spring, hash01 } from '../core/math.js';
import { pixelWood } from './house.js';

export const GAP = 0.12;
export const PITCH = TILE_W + GAP;

/**
 * Create tiles for `letters` (a string). Returns { group, tiles: [{ch, obj, id}] }.
 * Tile ids let a moving letter keep its identity across rows.
 */
export function makeTiles(letters, idPrefix = '') {
  const group = new THREE.Group();
  const tiles = letters.split('').map((ch, i) => {
    const obj = makeTile(ch);
    group.add(obj);
    return { ch, obj, id: `${idPrefix}${i}` };
  });
  return { group, tiles };
}

/** x offset of slot i in a row of n tiles, centered on 0. */
export function slotX(i, n) { return (i - (n - 1) / 2) * PITCH; }

/**
 * Lay out a row whose composition changes over time.
 * states: [{ at, order: [tileIndex...] }] ascending; tiles glide to their new slots
 * with a spring after each change (`glide` seconds, overshoot from zeta).
 * Returns positions per tile index for time t (tiles absent from the order are skipped).
 */
export function rowLayout(states, t, { freq = 2.4, zeta = 0.55 } = {}) {
  const pos = new Map();
  let prev = null;
  for (const st of states) {
    if (t < st.at) break;
    const n = st.order.length;
    const target = new Map(st.order.map((ti, i) => [ti, slotX(i, n)]));
    if (!prev) { for (const [k, v] of target) pos.set(k, v); }
    else {
      const k = spring(t - st.at, freq, zeta);
      const next = new Map();
      for (const [ti, x] of target) {
        const from = pos.has(ti) ? pos.get(ti) : x;
        next.set(ti, from + (x - from) * k);
      }
      pos.clear(); for (const [a, b] of next) pos.set(a, b);
    }
    prev = st;
  }
  return pos;
}

/**
 * The flight of a moved letter from world point A to world point B.
 * Returns { p:[x,y,z], rot:[x,y,z], squash } for local time u in [0,1] of the flight,
 * with an arc height, a small tumble and a landing squash handled by the caller.
 */
export function flight(A, B, u, { arc = 1.4, tumble = 0.35, lift = 0.25, zArc = 0.8 } = {}) {
  const e = ease.inOutCubic(clamp(u));
  const x = A[0] + (B[0] - A[0]) * e;
  const z = A[2] + (B[2] - A[2]) * e + Math.sin(Math.PI * e) * zArc;
  const base = A[1] + (B[1] - A[1]) * e;
  const y = base + Math.sin(Math.PI * e) * arc + lift * Math.sin(Math.PI * Math.min(1, e * 1.4)) * (1 - e);
  const rx = Math.sin(Math.PI * e) * tumble * 0.6;
  const rz = Math.sin(Math.PI * e) * -tumble * Math.sign(B[0] - A[0] || 1);
  return { p: [x, y, z], rot: [rx, 0, rz] };
}

/** Landing squash/stretch for time since landing `s` (seconds). Returns [sx, sy, sz]. */
export function landSquash(s) {
  if (s < 0) return [1, 1, 1];
  const k = 1 - spring(s, 5.5, 0.28);
  const sy = 1 - 0.16 * k;
  return [1 + 0.1 * k, sy, 1 + 0.1 * k];
}

/** Art pixels per tile unit on a tray face: 1 art px = 0.05 tile units = 0.0225 world, the house's art pixel. */
const TRAY_PX = 20;
/** The parchment (spec 2.2). The face's texture and its self-light both keep this as their mean. */
const TRAY_BASE = '#F3E2BF';
/** Contact shade: how much darker the parchment gets right at a tile's edge, how far it reaches, and its cap. */
const TRAY_CONTACT = { dark: 0.14, reach: 0.22, cap: 0.15 };
/** At most this many tiles shade one tray (a row's tiles plus one arriving in flight). */
const TRAY_MAX_TILES = 8;

/**
 * The tray face's parchment, one texel per art pixel: #F3E2BF with a +-4 luma grain, a
 * 2 px #D8C29E ring where the parchment meets the wooden rim and a 1 px light lip inside it.
 * Deterministic (hashed per texel) and NearestFilter, so it stays pixel art up close.
 */
function trayFaceTexture(w, h) {
  const W = Math.max(8, Math.round(w * TRAY_PX)), H = Math.max(8, Math.round(h * TRAY_PX));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const base = rgb(TRAY_BASE), ring = rgb('#D8C29E'), lip = rgb('#F9ECCD');
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const e = Math.min(x, y, W - 1 - x, H - 1 - y);
      const col = e < 2 ? ring : e < 3 ? lip : base;
      // a triangular grain in -4..4 (two hashes), the same step on every channel (a luma step)
      const k = x * 7919 + y * 104729 + W * 31;
      const o = Math.round((hash01(k) + hash01(k + 1) - 1) * 4);
      const i = (y * W + x) * 4;
      for (let ch = 0; ch < 3; ch++) img.data[i + ch] = Math.min(255, Math.max(0, col[ch] + o));
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8;
  return { tex: t, W, H };
}

const TRAY_FRAGMENT_HEAD = `
uniform vec4 uTrayTiles[${TRAY_MAX_TILES}];
uniform vec2 uTraySize;
uniform vec2 uTrayTexels;
uniform vec3 uTrayInvBase;
// contact shade under the tiles, evaluated at the art pixel's centre so it steps like the art:
// a rounded-rect falloff around each tile (x, y, strength, scale in face units), nudged down a
// touch toward the side away from the light, combined and capped
float trayContact( vec2 uv ) {
  vec2 p = ( ( floor( uv * uTrayTexels ) + 0.5 ) / uTrayTexels - 0.5 ) * uTraySize;
  float keep = 1.0;
  for ( int i = 0; i < ${TRAY_MAX_TILES}; i++ ) {
    vec4 tl = uTrayTiles[ i ];
    if ( tl.z <= 0.0 ) continue;
    vec2 q = max( abs( p - tl.xy - vec2( 0.02, -0.07 ) ) - vec2( 0.5, 0.61 ) * tl.w, 0.0 );
    keep *= 1.0 - tl.z * ( 1.0 - smoothstep( 0.0, ${TRAY_CONTACT.reach.toFixed(3)}, length( q ) ) );
  }
  return max( keep, ${(1 - TRAY_CONTACT.cap).toFixed(3)} );
}
`;

/**
 * A parchment tray with a wooden rim, sized for n tiles. The face is the game's parchment in
 * pixel-art grain with a ring bevel (trayFaceTexture), and each tile grounds itself on it with a
 * stepped contact shade that follows the tile wherever it sits (the rows reflow between 3 and
 * 5 letters in a 7-slot tray, and MOSTLY is 6 in 7, so a shade baked at fixed slots would sit
 * between tiles or under empty ones). The texture is also the emissive map, divided by the
 * parchment, so a shot's self-light on the tray (oner's TRAY_EMISSIVE, emissive #F3E2BF)
 * keeps its level and gains the grain. Everything is read from the current frame's pose.
 */
export function makeTray(n, { depth = 0.7 } = {}) {
  const w = n * PITCH + 0.5, h = TILE_H + 0.42;
  const group = new THREE.Group();
  const woodTex = pixelWood({ base: '#8a5a3c', planks: 3, seed: 13 });
  woodTex.repeat.set(w / 1.2, 0.6);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.24, h + 0.24, depth), new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.7 }));
  rim.position.z = -depth / 2 - TILE_D / 2 + 0.06;
  rim.castShadow = true; rim.receiveShadow = true;
  const { tex, W, H } = trayFaceTexture(w, h);
  const faceMat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, roughness: 0.85 });
  const base = new THREE.Color(TRAY_BASE);
  const tilesU = { value: Array.from({ length: TRAY_MAX_TILES }, () => new THREE.Vector4()) };
  faceMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTrayTiles = tilesU;
    sh.uniforms.uTraySize = { value: new THREE.Vector2(w, h) };
    sh.uniforms.uTrayTexels = { value: new THREE.Vector2(W, H) };
    sh.uniforms.uTrayInvBase = { value: new THREE.Vector3(1 / base.r, 1 / base.g, 1 / base.b) };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + TRAY_FRAGMENT_HEAD)
      .replace('#include <map_fragment>', '#include <map_fragment>\n  float trayAO = trayContact( vMapUv );\n  diffuseColor.rgb *= trayAO;')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= texture2D( emissiveMap, vEmissiveMapUv ).rgb * uTrayInvBase * trayAO;');
  };
  faceMat.customProgramCacheKey = () => 'tray-face';
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), faceMat);
  face.position.z = -TILE_D / 2 + 0.065;
  face.receiveShadow = true;
  // the tiles near this face, in its own units: seated tiles shade fully, a lifted or
  // flying one fades out as it leaves the parchment
  const inv = new THREE.Matrix4(), v = new THREE.Vector3(), sv = new THREE.Vector3(), fs = new THREE.Vector3();
  face.onBeforeRender = () => {
    const root = group.parent?.parent || group.parent;
    for (const u of tilesU.value) u.set(0, 0, 0, 1);
    if (!root) return;
    inv.copy(face.matrixWorld).invert();
    fs.setFromMatrixScale(face.matrixWorld);
    let k = 0;
    root.traverseVisible((o) => {
      if (k >= TRAY_MAX_TILES || !o.userData?.faceMat || !o.userData.lockMat) return;
      v.setFromMatrixPosition(o.matrixWorld).applyMatrix4(inv);
      if (Math.abs(v.x) > w / 2 + 0.6 || Math.abs(v.y) > h / 2 + 0.6) return;
      const lift = Math.max(0, v.z - (TILE_D / 2 - 0.065));
      const s = TRAY_CONTACT.dark * (1 - clamp(lift / 0.45));
      if (s <= 0) return;
      sv.setFromMatrixScale(o.matrixWorld);
      tilesU.value[k++].set(v.x, v.y, s, sv.x / fs.x);
    });
  };
  group.add(rim, face);
  group.userData = { w, h };
  return group;
}

/** Twine between two points, sagging like a catenary. Returns { mesh, at(u) -> Vector3 }. */
export function makeTwine(a, b, { sag = 0.35, radius = 0.025, color = '#c9a86a' } = {}) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const at = (u) => {
    const p = A.clone().lerp(B, u);
    p.y -= Math.sin(Math.PI * u) * sag;
    return p;
  };
  const pts = []; for (let i = 0; i <= 40; i++) pts.push(at(i / 40));
  const curve = new THREE.CatmullRomCurve3(pts);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, radius, 6, false), new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
  mesh.castShadow = true;
  return { mesh, at };
}

export { TILE_W, TILE_H, TILE_D };
