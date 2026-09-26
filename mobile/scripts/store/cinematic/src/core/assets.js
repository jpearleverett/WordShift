// Asset loading. Every texture the trailer uses is loaded up front so that
// renderAt(t) never waits on the network and every frame is deterministic.

import * as THREE from 'three';

const params = new URLSearchParams(location.search);
/** Base URL of mobile/assets (the capture server serves mobile/ at its root). */
export const ASSET_BASE = window.CINEMATIC_ASSET_BASE || params.get('assets') || '../../../assets/';

const loader = new THREE.TextureLoader();
const cache = new Map();

/**
 * Load a texture. `pixel` keeps pixel art crisp when magnified (nearest) while
 * still mipmapping when it is shown small, so it never shimmers.
 */
export function loadTexture(rel, { pixel = false, repeat = false } = {}) {
  const key = rel + (pixel ? '#px' : '');
  if (cache.has(key)) return cache.get(key);
  const p = new Promise((resolve, reject) => {
    loader.load(ASSET_BASE + rel, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 8;
      if (pixel) {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
      }
      if (repeat) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
      tex.needsUpdate = true;
      resolve(tex);
    }, undefined, () => reject(new Error('Failed to load ' + rel)));
  });
  cache.set(key, p);
  return p;
}

export function loadImage(rel) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load ' + rel));
    img.src = ASSET_BASE + rel;
  });
}

export const FONTS = {
  display: 'Figtree',
  displayWeight: '700',
  slab: 'Epunda Slab',
};

export async function loadFonts() {
  const faces = [
    new FontFace('Figtree', `url(${ASSET_BASE}fonts/Figtree-Bold.ttf)`, { weight: '700' }),
    new FontFace('Figtree', `url(${ASSET_BASE}fonts/Figtree-Regular.ttf)`, { weight: '400' }),
    new FontFace('Epunda Slab', `url(${ASSET_BASE}fonts/EpundaSlab-Bold.ttf)`, { weight: '700' }),
    new FontFace('Epunda Slab', `url(${ASSET_BASE}fonts/EpundaSlab-Regular.ttf)`, { weight: '400' }),
    new FontFace('Epunda Slab', `url(${ASSET_BASE}fonts/EpundaSlab-Italic.ttf)`, { weight: '400', style: 'italic' }),
  ];
  await Promise.all(faces.map(async (f) => { await f.load(); document.fonts.add(f); }));
  await document.fonts.ready;
}

/**
 * A sprite-sheet texture view: returns a clone of `tex` whose repeat/offset
 * select cell (col,row) of a cols x rows grid. Clones share the image.
 */
export function atlasFrame(tex, cols, rows, index) {
  const t = tex.clone();
  t.repeat.set(1 / cols, 1 / rows);
  const col = index % cols, row = Math.floor(index / cols);
  t.offset.set(col / cols, 1 - (row + 1) / rows);
  t.needsUpdate = true;
  return t;
}
