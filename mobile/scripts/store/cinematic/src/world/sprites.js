// Pixel-art characters as lit, shadow-casting cards in the 3D world
// (the HD-2D approach): nearest-filtered, alpha-tested, feet pinned to the
// floor using each image's measured opaque bounds.

import * as THREE from 'three';
import { loadTexture, ASSET_BASE } from '../core/assets.js';

const boundsCache = new Map();

/** Opaque bounding box of an image (or of one atlas cell), in 0..1 UV. */
async function measure(rel, cols = 1, rows = 1, cell = 0) {
  const key = `${rel}#${cols}x${rows}:${cell}`;
  if (boundsCache.has(key)) return boundsCache.get(key);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = ASSET_BASE + rel; });
  const cw = img.width / cols, ch = img.height / rows;
  const cx = (cell % cols) * cw, cy = Math.floor(cell / cols) * ch;
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d'); g.drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
  const d = g.getImageData(0, 0, cw, ch).data;
  let x0 = cw, y0 = ch, x1 = 0, y1 = 0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    if (d[(y * cw + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const b = { u0: x0 / cw, u1: (x1 + 1) / cw, v0: y0 / ch, v1: (y1 + 1) / ch };
  boundsCache.set(key, b);
  return b;
}

export const ANIMAL_DIR = {
  ember: 'fox', panko: 'pangolin', archimedes: 'owl', axel: 'axolotl', sloane: 'sloth', fennick: 'fennec_fox',
  chill: 'capybara', warren: 'wombat', thyme: 'rabbit', bamboo: 'red_panda', vesper: 'tarsier', moss: 'kakapo',
};

/**
 * A character card. `height` = world height of the visible animal.
 * Returns an Object3D whose origin is at the feet (bottom-center of the art).
 * Poses: 'idle', 'talk', and 'walk' frames (atlas or fox frame files).
 */
export async function makeCharacter(name, { height = 1.2, poses = ['idle'], lit = true, castShadow = true } = {}) {
  const dir = ANIMAL_DIR[name] || name;
  const root = new THREE.Group();
  const idleRel = `characters/${dir}/idle.png`;
  const b = await measure(idleRel);
  const artH = b.v1 - b.v0;
  const size = height / artH;                 // world size of the full 500px square
  const footY = (1 - b.v1) * size;            // distance from square bottom to feet
  const centerX = ((b.u0 + b.u1) / 2 - 0.5) * size;
  const geo = new THREE.PlaneGeometry(size, size);
  geo.translate(-centerX, size / 2 - footY, 0);
  const mats = {};
  const mk = (tex) => {
    const MatCls = lit ? THREE.MeshStandardMaterial : THREE.MeshBasicMaterial;
    const m = new MatCls({ map: tex, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide });
    if (lit) { m.roughness = 0.95; m.metalness = 0; m.emissive = new THREE.Color('#ffffff'); m.emissiveMap = tex; m.emissiveIntensity = 0.35; }
    return m;
  };
  for (const p of poses) {
    if (p === 'idle' || p === 'talk') mats[p] = mk(await loadTexture(`characters/${dir}/${p}.png`, { pixel: true }));
  }
  let walk = null;
  if (poses.includes('walk')) {
    if (dir === 'fox') {
      const frames = [];
      for (let i = 0; i < 10; i++) frames.push(mk(await loadTexture(`characters/fox/walk_${i}.png`, { pixel: true })));
      walk = { frames, geo };
    } else {
      const atlas = await loadTexture(`characters/${dir}/walk.png`, { pixel: true });
      const frames = [];
      // walk atlases are 4x2 cells of 256px; each cell is framed like idle.png (scaled)
      const wb = await measure(`characters/${dir}/walk.png`, 4, 2, 0);
      const wsize = height / (wb.v1 - wb.v0);
      const wfoot = (1 - wb.v1) * wsize;
      const wcx = ((wb.u0 + wb.u1) / 2 - 0.5) * wsize;
      const wgeo = new THREE.PlaneGeometry(wsize, wsize);
      wgeo.translate(-wcx, wsize / 2 - wfoot, 0);
      for (let i = 0; i < 8; i++) {
        const t = atlas.clone();
        t.repeat.set(0.25, 0.5);
        t.offset.set((i % 4) * 0.25, i < 4 ? 0.5 : 0);
        t.needsUpdate = true;
        frames.push(mk(t));
      }
      walk = { frames, geo: wgeo };
    }
  }
  const mesh = new THREE.Mesh(geo, mats.idle || mats[poses[0]]);
  mesh.castShadow = castShadow;
  mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: (mats.idle || mats[poses[0]]).map, alphaTest: 0.5 });
  root.add(mesh);
  root.userData = { mesh, mats, walk, baseGeo: geo, name };
  return root;
}

/** Choose a pose for this frame. walkPhase in cycles (0..n). facing: 1 right, -1 left. */
export function poseCharacter(ch, { pose = 'idle', walkPhase = 0, facing = 1 } = {}) {
  const u = ch.userData;
  let mat = u.mats[pose] || u.mats.idle;
  let geo = u.baseGeo;
  if (pose === 'walk' && u.walk) {
    const n = u.walk.frames.length;
    const i = ((Math.floor(walkPhase * n) % n) + n) % n;
    mat = u.walk.frames[i];
    geo = u.walk.geo;
  }
  u.mesh.material = mat;
  u.mesh.geometry = geo;
  u.mesh.customDepthMaterial.map = mat.map;
  u.mesh.scale.x = facing;
}
