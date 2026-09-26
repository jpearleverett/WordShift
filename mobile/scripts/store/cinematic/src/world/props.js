// Small 3D props for the room close-ups: Panko's spice jars and a shelf.

import * as THREE from 'three';
import { pixelWood } from './house.js';

/** Pixel label texture: parchment with a coloured band, no lettering. */
function labelTex(band) {
  const c = document.createElement('canvas'); c.width = 32; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#efe0bf'; g.fillRect(0, 0, 32, 16);
  g.fillStyle = band; g.fillRect(0, 5, 32, 5);
  g.fillStyle = 'rgba(80,50,30,0.35)'; g.fillRect(0, 0, 32, 1); g.fillRect(0, 15, 32, 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** A glass spice jar with a coloured lid. Origin at the jar's base centre. */
export function makeJar({ lid = '#b8483c', fill = '#c9803e', height = 0.62, radius = 0.2 } = {}) {
  const g = new THREE.Group();
  const prof = [];
  const r = radius;
  prof.push(new THREE.Vector2(0.001, 0), new THREE.Vector2(r * 0.9, 0), new THREE.Vector2(r, 0.04), new THREE.Vector2(r, height * 0.78),
    new THREE.Vector2(r * 0.86, height * 0.86), new THREE.Vector2(r * 0.8, height * 0.9));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 24), new THREE.MeshPhysicalMaterial({ color: '#f4efe6', roughness: 0.3, transmission: 0, transparent: true, opacity: 0.38, clearcoat: 1, clearcoatRoughness: 0.35, depthWrite: false }));
  const content = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, height * 0.55, 20), new THREE.MeshStandardMaterial({ color: fill, roughness: 0.9 }));
  content.position.y = height * 0.29;
  const lidM = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r * 0.88, height * 0.16, 20), new THREE.MeshStandardMaterial({ color: lid, roughness: 0.55 }));
  lidM.position.y = height * 0.97;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.005, r * 1.005, height * 0.26, 24, 1, true, -Math.PI * 0.45, Math.PI * 0.9), new THREE.MeshStandardMaterial({ map: labelTex(lid), roughness: 0.9 }));
  label.position.y = height * 0.42;
  for (const m of [content, lidM, label]) { m.castShadow = true; m.receiveShadow = true; }
  g.add(content, label, lidM, glass);
  g.userData = { lid: lidM, height };
  return g;
}

/** A short wooden shelf plank with brackets. Origin at the plank's top centre. */
export function makeShelf(width = 1.8, depth = 0.5) {
  const g = new THREE.Group();
  const tex = pixelWood({ base: '#7a4f30', planks: 2, seed: 33 }); tex.repeat.set(width / 1.2, 0.5);
  const plank = new THREE.Mesh(new THREE.BoxGeometry(width, 0.1, depth), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }));
  plank.position.y = -0.05; plank.castShadow = true; plank.receiveShadow = true;
  g.add(plank);
  for (const s of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.28, depth * 0.8), new THREE.MeshStandardMaterial({ color: '#4d321f', roughness: 0.8 }));
    b.position.set(s * width * 0.38, -0.22, -depth * 0.08); g.add(b);
  }
  return g;
}
