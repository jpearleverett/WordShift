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
  const key = ch + color.bg + ink;
  if (faceCache.has(key)) return faceCache.get(key);
  const fw = TILE_W - 2 * RADIUS * 0.6, fh = TILE_H - 2 * RADIUS * 0.6;
  const W = 384, H = Math.round(W * fh / fw);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  // body color with the game's soft top sweep
  ctx.fillStyle = color.bg; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, 'rgba(255,246,219,0.20)'); g.addColorStop(0.45, 'rgba(255,246,219,0.06)'); g.addColorStop(1, 'rgba(40,20,10,0.10)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
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
export function makeTile(ch, { color = tileColorFor(ch), emissive = 0 } = {}) {
  if (!bodyGeo) bodyGeo = new RoundedBoxGeometry(TILE_W, TILE_H, TILE_D, 10, RADIUS);
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(color.bg), roughness: 0.46, metalness: 0,
    clearcoat: 0.55, clearcoatRoughness: 0.28, sheen: 0.3, sheenRoughness: 0.6, sheenColor: new THREE.Color('#fff2d8'),
    emissive: new THREE.Color(color.bg), emissiveIntensity: emissive,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  // bodies cast but do not receive: the rounded bevels self-shadow into ragged
  // terminator lines at grazing angles otherwise
  body.castShadow = true; body.receiveShadow = false;
  const f = tileFace(ch, color);
  const faceMat = new THREE.MeshPhysicalMaterial({
    map: f.map, normalMap: f.normalMap, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 0.42,
    clearcoat: 0.55, clearcoatRoughness: 0.26, emissive: new THREE.Color('#ffffff'), emissiveMap: f.map, emissiveIntensity: emissive,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(f.fw, f.fh), faceMat);
  face.position.z = TILE_D / 2 + 0.0015;
  face.receiveShadow = true;
  group.add(body, face);
  group.userData = { ch, body, face, bodyMat, faceMat, color };
  return group;
}

/** Set a warm self-glow on a tile (0 = none). */
export function setTileGlow(tile, amount) {
  tile.userData.bodyMat.emissiveIntensity = amount * 0.6;
  tile.userData.faceMat.emissiveIntensity = amount * 0.6;
}
