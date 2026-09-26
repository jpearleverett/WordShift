// The dollhouse: the game's room paintings as the back walls of real 3D
// shadow boxes, arranged in a grid (rows bottom to top), wrapped in a timber
// shell with a gabled shingle roof, a brick chimney and a stone plinth. The
// front is open (cutaway) so the camera can glide into any room.

import * as THREE from 'three';
import { loadTexture } from '../core/assets.js';
import { mulberry32 } from '../core/math.js';

/** Painted floor line of each room (fraction of image height from the bottom). */
export const FLOOR_LINE = {
  cozy_den: 0.2, kitchen: 0.14, study: 0.14, aquarium: 0.12, jungle: 0.12, desert: 0.16,
  office: 0.16, burrow: 0.16, garden: 0.14, bamboo: 0.14, observatory: 0.14, rainforest: 0.14,
};

/** Rooms that have a window-sky mask in assets/rooms/windows. */
export const WINDOW_MASKS = ['cozy_den', 'kitchen', 'study', 'office', 'garden'];

/** Procedural pixel-wood texture (tileable plank grain). */
export function pixelWood({ seed = 3, base = '#6e4a2e', size = 64, planks = 4, vertical = false } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  const col = new THREE.Color(base);
  const shade = (k) => { const x = col.clone(); x.offsetHSL(0, 0, k); return '#' + x.getHexString(); };
  const ph = size / planks;
  for (let p = 0; p < planks; p++) {
    g.fillStyle = shade((rnd() - 0.5) * 0.06); g.fillRect(0, p * ph, size, ph);
    for (let k = 0; k < size * 1.5; k++) {
      g.fillStyle = shade((rnd() - 0.6) * 0.09);
      g.fillRect(Math.floor(rnd() * size), Math.floor(p * ph + 1 + rnd() * (ph - 2)), 2 + Math.floor(rnd() * 6), 1);
    }
    g.fillStyle = shade(-0.12); g.fillRect(0, p * ph, size, 1);
    if (rnd() < 0.5) { g.fillStyle = shade(-0.1); g.fillRect(Math.floor(rnd() * size), p * ph, 1, ph); }
  }
  let src = c;
  if (vertical) {
    const v = document.createElement('canvas'); v.width = v.height = size;
    const vg = v.getContext('2d'); vg.translate(size / 2, size / 2); vg.rotate(Math.PI / 2); vg.drawImage(c, -size / 2, -size / 2); src = v;
  }
  const t = new THREE.CanvasTexture(src);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8;
  return t;
}

/** Procedural pixel shingles in the roof art's palette. */
function pixelShingles(seed = 9) {
  const size = 64;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  const tones = ['#9c4a44', '#a9544c', '#8d3f3a', '#b35d53', '#944640'];
  g.fillStyle = '#6e2f2c'; g.fillRect(0, 0, size, size);
  const rows = 5, rh = size / rows, sw = 16;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * sw / 2;
    for (let x = -sw; x < size + sw; x += sw) {
      g.fillStyle = tones[Math.floor(rnd() * tones.length)];
      g.fillRect(Math.round(x + off + 1), Math.round(r * rh), sw - 2, Math.round(rh) - 1);
      g.fillStyle = 'rgba(255,220,200,0.18)'; g.fillRect(Math.round(x + off + 1), Math.round(r * rh), sw - 2, 1);
      g.fillStyle = 'rgba(40,10,10,0.35)'; g.fillRect(Math.round(x + off + 1), Math.round(r * rh + rh - 2), sw - 2, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8;
  return t;
}

/**
 * layout: rows bottom to top, e.g. [['burrow','cozy_den','kitchen'], [...]]; null = empty frame.
 * roomW: width of one room (height follows the painting's 1456x720 aspect).
 * Returns { group, rooms: {id: {...}}, slots: [[{x,y,id}]], width, height, roof, chimneyTop, setLight(...) }
 */
export async function buildHouse(layout, { roomW = 8, roomD = 3.2, post = 0.34, slab = 0.34, roof = true, foundation = true } = {}) {
  const roomH = roomW * 720 / 1456;
  const cols = Math.max(...layout.map((r) => r.length));
  const width = cols * roomW + (cols + 1) * post;
  const floorH = roomH + slab;
  const height = layout.length * floorH + slab;
  const group = new THREE.Group();
  const woodTex = pixelWood({ base: '#6b4629', planks: 4 });
  const woodV = pixelWood({ base: '#6b4629', planks: 4, vertical: true, seed: 5 });
  const mk = (tex, rx, ry, color = '#ffffff') => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshStandardMaterial({ map: t, color, roughness: 0.82 }); };
  const innerMat = new THREE.MeshStandardMaterial({ color: '#4d3121', roughness: 0.9 });
  const rooms = {};
  const slots = [];

  for (let r = 0; r < layout.length; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const id = layout[r][c] ?? null;
      const x = -width / 2 + post + c * (roomW + post) + roomW / 2;
      const y = slab + r * floorH;
      row.push({ x, y, id });
      const g = new THREE.Group();
      g.position.set(x, y, 0);
      group.add(g);
      // inner side returns + floor + ceiling so each box has real depth
      for (const s of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), innerMat);
        w.position.set(s * roomW / 2, roomH / 2, 0); w.rotation.y = -s * Math.PI / 2; w.receiveShadow = true; g.add(w);
      }
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), mk(woodTex, roomW / 1.6, roomD / 1.6, '#c79a72'));
      floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.003, 0); floor.receiveShadow = true; g.add(floor);
      if (!id) {
        const back = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), mk(woodV, roomW / 1.6, roomH / 1.6, '#d0a57c'));
        back.position.set(0, roomH / 2, -roomD / 2); back.receiveShadow = true; g.add(back);
        rooms[`empty_${r}_${c}`] = { group: g, painting: back, mat: back.material, light: null, x, y, roomW, roomH, roomD, row: r, col: c, empty: true };
        continue;
      }
      const tex = await loadTexture(`rooms/${id}.webp`, { pixel: true });
      const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.62, roughness: 1, metalness: 0 });
      const painting = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), mat);
      painting.position.set(0, roomH / 2, -roomD / 2); painting.receiveShadow = true; g.add(painting);
      let windowMesh = null;
      if (WINDOW_MASKS.includes(id)) {
        const wtex = await loadTexture(`rooms/windows/${id}.png`);
        windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), new THREE.MeshBasicMaterial({ map: wtex, color: '#B5623C', transparent: true, opacity: 0, depthWrite: false }));
        windowMesh.position.set(0, roomH / 2, -roomD / 2 + 0.004); g.add(windowMesh);
      }
      const light = new THREE.PointLight('#ffb070', 0, roomW * 1.3, 1.6);
      light.position.set(0, roomH * 0.75, roomD * 0.1); g.add(light);
      rooms[id] = { group: g, painting, mat, light, windowMesh, x, y, roomW, roomH, roomD, row: r, col: c, floorLine: (FLOOR_LINE[id] ?? 0.15) * roomH };
    }
    slots.push(row);
  }

  // timber frame: vertical posts and horizontal slabs across the front
  const postMat = mk(woodV, 0.35, height / 2.4, '#b58a62');
  for (let c = 0; c <= cols; c++) {
    const x = -width / 2 + post / 2 + c * (roomW + post);
    const p = new THREE.Mesh(new THREE.BoxGeometry(post, height, roomD + 0.4), postMat);
    p.position.set(x, height / 2, 0.1); p.castShadow = true; p.receiveShadow = true; group.add(p);
  }
  const slabMat = mk(woodTex, width / 2.4, 0.3, '#b58a62');
  for (let r = 0; r <= layout.length; r++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, slab, roomD + 0.5), slabMat);
    s.position.set(0, slab / 2 + r * floorH, 0.12); s.castShadow = true; s.receiveShadow = true; group.add(s);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.2), mk(woodV, width / 2, height / 2, '#8a6446'));
  back.position.set(0, height / 2, -roomD / 2 - 0.12); back.castShadow = true; group.add(back);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.2, height, roomD + 0.3), mk(woodV, (roomD + 0.3) / 2, height / 2, '#9a7250'));
    side.position.set(s * (width / 2 + 0.1), height / 2, 0.02); side.castShadow = true; side.receiveShadow = true; group.add(side);
  }

  let roofGroup = null, chimneyTop = null;
  if (roof) {
    roofGroup = new THREE.Group();
    const over = 0.8;
    const rw = width + over * 2, rise = rw * 0.3, depth = roomD + 1.2;
    const shingles = pixelShingles();
    const slopeLen = Math.hypot(rw / 2, rise);
    const ang = Math.atan2(rise, rw / 2);
    for (const s of [-1, 1]) {
      const t = shingles.clone(); t.needsUpdate = true; t.repeat.set(depth / 1.2, slopeLen / 1.2);
      t.center.set(0.5, 0.5); t.rotation = Math.PI / 2;
      const plane = new THREE.Mesh(new THREE.BoxGeometry(slopeLen + 0.3, 0.22, depth), new THREE.MeshStandardMaterial({ map: t, roughness: 0.78 }));
      plane.rotation.z = -s * ang;
      plane.position.set(s * rw / 4, rise / 2 + 0.11 / Math.cos(ang), 0.1);
      plane.castShadow = true; plane.receiveShadow = true;
      roofGroup.add(plane);
    }
    // front gable: the game's roof art, scaled into the triangle
    const rtex = await loadTexture('environment/roof.png', { pixel: true });
    const cardW = rw * 0.98, cardH = cardW * 283 / 792;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(cardW, cardH), new THREE.MeshStandardMaterial({ map: rtex, alphaTest: 0.5, roughness: 0.9, emissive: new THREE.Color('#ffffff'), emissiveMap: rtex, emissiveIntensity: 0.25 }));
    card.position.set(0, cardH / 2 - 0.1, depth / 2 + 0.16);
    card.scale.y = (rise + 0.4) / cardH;
    card.position.y = (rise + 0.4) / 2 - 0.1;
    card.castShadow = true;
    roofGroup.add(card);
    const gshape = new THREE.Shape();
    gshape.moveTo(-rw / 2, 0); gshape.lineTo(0, rise); gshape.lineTo(rw / 2, 0); gshape.lineTo(-rw / 2, 0);
    const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(gshape, { depth: depth - 0.4, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#7a3632', roughness: 0.85 }));
    gable.position.set(0, 0, -depth / 2 + 0.2); gable.castShadow = true; roofGroup.add(gable);
    // brick chimney (left, as in the game's roof)
    const brick = pixelWood({ base: '#9b5a3c', planks: 8, seed: 21 });
    const ch = new THREE.Mesh(new THREE.BoxGeometry(1.1, rise * 0.9, 1.1), mk(brick, 1, 2, '#ffffff'));
    ch.position.set(-rw * 0.3, rise * 0.62, -0.4); ch.castShadow = true; roofGroup.add(ch);
    const capM = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.22, 1.35), new THREE.MeshStandardMaterial({ color: '#c9a77e', roughness: 0.9 }));
    capM.position.set(-rw * 0.3, rise * 0.62 + rise * 0.45 + 0.1, -0.4); roofGroup.add(capM);
    roofGroup.position.y = height;
    group.add(roofGroup);
    chimneyTop = new THREE.Vector3(-rw * 0.3, height + rise * 1.1 + 0.25, -0.4);
  }

  let foundationGroup = null;
  if (foundation) {
    foundationGroup = new THREE.Group();
    const ftex = await loadTexture('environment/foundation_0.png', { pixel: true });
    const fh = 1.2;
    const tileW = fh * 792 / 120;
    const n = Math.ceil((width + 0.6) / tileW);
    const t = ftex.clone(); t.needsUpdate = true; t.wrapS = THREE.RepeatWrapping; t.repeat.set(n, 1);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, fh, roomD + 0.8), [
      new THREE.MeshStandardMaterial({ color: '#8b8375', roughness: 0.95 }), new THREE.MeshStandardMaterial({ color: '#8b8375', roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: '#6b8f4a', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#5a5347', roughness: 1 }),
      new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.4, roughness: 0.95 }), new THREE.MeshStandardMaterial({ color: '#8b8375', roughness: 0.95 }),
    ]);
    plinth.position.set(0, -fh / 2, 0.1); plinth.castShadow = true; plinth.receiveShadow = true;
    foundationGroup.add(plinth);
    group.add(foundationGroup);
  }

  return {
    group, rooms, slots, width, height, roomW, roomH, roomD, floorH, roof: roofGroup, chimneyTop,
    /** paint: painted-light multiplier (day 1, dusk ~0.55); lamps 0..1; windowDusk 0..1 tints painted skies. */
    setLight({ paint = 1, lamps = 0, tint = '#ffffff', windowDusk = 0, windowColor = '#B5623C' } = {}) {
      for (const rm of Object.values(rooms)) {
        rm.mat.emissiveIntensity = (rm.empty ? 0 : 0.62) * paint;
        rm.mat.color.set(tint);
        if (rm.light) rm.light.intensity = lamps * 9;
        if (rm.windowMesh) { rm.windowMesh.material.opacity = windowDusk * 0.62; rm.windowMesh.material.color.set(windowColor); }
      }
    },
  };
}
