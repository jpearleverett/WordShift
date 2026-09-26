// 3D letter tiles in the game's own palette: painted tokens with a softly
// polished coat, a thin inset border in the tile's border color and a
// debossed letter in the game's slab face, inked the way the game inks it.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** CandyColors.tileColors from mobile/src/theme/colors.ts (bg, border). */
export const TILE_PALETTE = [
  { bg: '#D9997B', border: '#945A43' },
  { bg: '#B8A2C7', border: '#756386' },
  { bg: '#8FB8CA', border: '#557F92' },
  { bg: '#A6BD8F', border: '#697F55' },
  { bg: '#DEC38A', border: '#A28650' },
  { bg: '#DDB095', border: '#966E51' },
  { bg: '#CD9390', border: '#925D60' },
  { bg: '#99BDB5', border: '#5D827A' },
];
export const TILE_INK = '#28221D';
/** The game's locked (moved) letter, as measured on the store art. */
export const LOCKED = { bg: '#BBC4CF', border: '#7F8A99', top: '#CACCCC' };
/** World scale of a tile in the trailer's dollhouse (a toy block about a third of a resident's height). */
export const TILE_SCALE = 0.45;

function mixHex(a, b, t) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString(); }

/** The game's getTileColor: palette index = char code % 8. */
export function tileColorFor(ch) {
  return TILE_PALETTE[ch.toUpperCase().charCodeAt(0) % TILE_PALETTE.length];
}

export const TILE_W = 1;
export const TILE_H = 1.22;
export const TILE_D = 0.34;
const RADIUS = 0.15;

const faceCache = new Map();
let bodyGeo = null;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Height field -> tangent-space normal map (Sobel). */
function normalFromHeight(hctx, w, h, strength) {
  const src = hctx.getImageData(0, 0, w, h).data;
  const out = new ImageData(w, h);
  const H = (x, y) => src[((Math.min(h - 1, Math.max(0, y)) * w) + Math.min(w - 1, Math.max(0, x))) * 4] / 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
      const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
      let nx = -dx * strength, ny = dy * strength, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const i = (y * w + x) * 4;
      out.data[i] = (nx * 0.5 + 0.5) * 255; out.data[i + 1] = (ny * 0.5 + 0.5) * 255; out.data[i + 2] = (nz * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
    }
  }
  return out;
}

/** Face textures for one letter (color + normal), cached per letter/color. */
export function tileFace(ch, color = tileColorFor(ch), { font = 'Epunda Slab', ink = TILE_INK } = {}) {
  const key = ch + color.bg + (color.top || '') + ink;
  if (faceCache.has(key)) return faceCache.get(key);
  const fw = TILE_W - 2 * RADIUS * 0.6, fh = TILE_H - 2 * RADIUS * 0.6;
  const W = 384, H = Math.round(W * fh / fw);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  // body colour with the game's top gloss band: the upper 42% is bg mixed 0.32 toward #FFF6DB
  ctx.fillStyle = color.bg; ctx.fillRect(0, 0, W, H);
  const gloss = color.top || mixHex(color.bg, '#FFF6DB', 0.32);
  const gb = ctx.createLinearGradient(0, 0, 0, H * 0.48);
  gb.addColorStop(0, gloss); gb.addColorStop(0.42 / 0.48 - 0.06, gloss); gb.addColorStop(1, color.bg);
  ctx.fillStyle = gb; ctx.fillRect(0, 0, W, H * 0.48);
  // inset border ring
  ctx.strokeStyle = color.border; ctx.globalAlpha = 0.55; ctx.lineWidth = W * 0.022;
  roundRect(ctx, W * 0.07, H * 0.06, W * 0.86, H * 0.88, W * 0.12); ctx.stroke(); ctx.globalAlpha = 1;
  // letter
  const size = Math.round(H * 0.62);
  ctx.font = `700 ${size}px "${font}"`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(ch);
  // optically centre the glyph's ink box, not its em box
  const baseline = H / 2 + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  ctx.fillStyle = ink; ctx.fillText(ch, W / 2, baseline);
  // height map: letter pressed in, ring slightly raised
  const hc = document.createElement('canvas'); hc.width = W; hc.height = H;
  const h = hc.getContext('2d');
  h.fillStyle = '#808080'; h.fillRect(0, 0, W, H);
  h.filter = `blur(${Math.round(W * 0.012)}px)`;
  h.strokeStyle = '#a0a0a0'; h.lineWidth = W * 0.03; roundRect(h, W * 0.07, H * 0.06, W * 0.86, H * 0.88, W * 0.12); h.stroke();
  h.font = ctx.font; h.textAlign = 'center'; h.textBaseline = 'alphabetic'; h.fillStyle = '#303030'; h.fillText(ch, W / 2, baseline);
  h.filter = 'none';
  const nc = document.createElement('canvas'); nc.width = W; nc.height = H;
  nc.getContext('2d').putImageData(normalFromHeight(h, W, H, 2.2), 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const normalMap = new THREE.CanvasTexture(nc); normalMap.anisotropy = 8;
  const face = { map, normalMap, fw, fh };
  faceCache.set(key, face);
  return face;
}

/**
 * Build a tile Group. Children: body (rounded box) and face (decal plane).
 * Group origin is the tile center; the letter faces +Z.
 */
/** Base self-light on every tile face and body, so the candy colours hold in any key (spec 2.2 swatches). */
export const TILE_EMISSIVE_BASE = 0.15;

export function makeTile(ch, { color = tileColorFor(ch), emissive = TILE_EMISSIVE_BASE } = {}) {
  if (!bodyGeo) bodyGeo = new RoundedBoxGeometry(TILE_W, TILE_H, TILE_D, 10, RADIUS);
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color.bg), roughness: 0.40, metalness: 0,
    clearcoat: 0.8, clearcoatRoughness: 0.18, sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color('#fff2d8'),
    emissive: new THREE.Color(color.bg), emissiveIntensity: emissive,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  // bodies cast but do not receive: the rounded bevels self-shadow into ragged
  // terminator lines at grazing angles otherwise
  body.castShadow = true; body.receiveShadow = false;
  const f = tileFace(ch, color);
  const faceMat = new THREE.MeshPhysicalMaterial({
    map: f.map, normalMap: f.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.40,
    clearcoat: 0.8, clearcoatRoughness: 0.18, emissive: new THREE.Color('#ffffff'), emissiveMap: f.map, emissiveIntensity: emissive,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(f.fw, f.fh), faceMat);
  face.position.z = TILE_D / 2 + 0.0015;
  face.receiveShadow = true;
  // the locked face sits just in front and fades in when the letter locks
  const lf = tileFace(ch, LOCKED);
  const lockMat = new THREE.MeshPhysicalMaterial({
    map: lf.map, normalMap: lf.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.40, clearcoat: 0.8, clearcoatRoughness: 0.18,
    emissive: new THREE.Color('#ffffff'), emissiveMap: lf.map, emissiveIntensity: emissive,
    transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const lockFace = new THREE.Mesh(face.geometry, lockMat);
  lockFace.position.z = TILE_D / 2 + 0.003;
  lockFace.visible = false;
  group.add(body, face, lockFace);
  group.userData = { ch, body, face, bodyMat, faceMat, color, lockFace, lockMat, glowBase: emissive };
  return group;
}

/** Lock tint 0..1: the body and face ease to the game's locked powder blue. */
export function setLocked(tile, k) {
  const u = tile.userData;
  u.bodyMat.color.set(u.color.bg).lerp(new THREE.Color(LOCKED.bg), k);
  u.lockFace.visible = k > 0.001;
  u.lockMat.opacity = k;
}

/** Two extruded leaves on a short stem, seated on a tile's top edge (tile units). */
export function makeSprout() {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 16; c.height = 16;
  const x = c.getContext('2d'); x.fillStyle = '#7DB36B'; x.fillRect(0, 0, 16, 16); x.fillStyle = '#A6D08A'; x.fillRect(2, 2, 6, 3); x.fillStyle = '#4E7A40'; x.fillRect(0, 13, 16, 3);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.magFilter = THREE.NearestFilter;
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, side: THREE.DoubleSide });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.26, 8), new THREE.MeshStandardMaterial({ color: '#5f9150', roughness: 0.6 }));
  stem.position.y = 0.13; g.add(stem);
  const leafShape = new THREE.Shape();
  leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(0.14, 0.1, 0.3, 0.02); leafShape.quadraticCurveTo(0.14, -0.08, 0, 0);
  const leafGeo = new THREE.ExtrudeGeometry(leafShape, { depth: 0.024, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1 });
  leafGeo.translate(0, 0, -0.012);
  for (const s of [-1, 1]) {
    const leaf = new THREE.Mesh(leafGeo, mat);
    leaf.position.set(0, 0.24, 0); leaf.rotation.set(0, s > 0 ? 0 : Math.PI, s * 0.45);
    leaf.castShadow = true;
    g.add(leaf);
  }
  g.position.y = TILE_H / 2 - 0.02;
  g.scale.setScalar(0.0001);
  return g;
}

/** Set a warm self-glow on a tile (0 = none). */
export function setTileGlow(tile, amount) {
  const u = tile.userData, base = u.glowBase ?? TILE_EMISSIVE_BASE;
  u.bodyMat.emissiveIntensity = base + amount * 0.6;
  u.faceMat.emissiveIntensity = base + amount * 0.6;
  u.lockMat.emissiveIntensity = base + amount * 0.6;
}
