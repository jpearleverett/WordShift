// The word rack in the meadow (spec 2.5): two pixel-wood uprights and three
// parchment trays holding PLAY / PANT / HEAR, played by the move choreography.
// In tile units inside a group scaled by TILE_SCALE; the rack's origin is on the
// ground between the uprights. Also the two-tray mini-racks for the montage.

import * as THREE from 'three';
import { TILE_SCALE, TILE_H } from '../core/tiles.js';
import { makeTray, PITCH } from './wordrow.js';
import { buildMoveSet } from './moves.js';
import { pixelWood } from './house.js';

/** Tray centre heights above the ground, in world units (spec: y = 1.30 / 0.55 / -0.20 with ground at -1.2). */
export const RACK_ROWS_WORLD = [2.5, 1.75, 1.0];

function uprights(width, height) {
  const g = new THREE.Group();
  const tex = pixelWood({ base: '#8A5A3C', planks: 2, seed: 61, vertical: true }); tex.repeat.set(0.4, height / 1.4);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 });
  for (const s of [-1, 1]) {
    const u = new THREE.Mesh(new THREE.BoxGeometry(0.27, height, 0.27), mat);
    u.position.set(s * width / 2, height / 2, -0.35);
    u.castShadow = true; u.receiveShadow = true;
    g.add(u);
  }
  return g;
}

/**
 * The meadow rack. words: three words; moves: buildMoveSet moves (times in trailer seconds).
 * Returns { group (world-scaled), rows, set (move set), trays, tileUnitsY }.
 */
export function buildRack({ words = ['PLAY', 'PANT', 'HEAR'], moves = [], slots = 7 } = {}) {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(TILE_SCALE);
  group.add(inner);
  const trayW = slots * PITCH + 0.5;
  const height = (RACK_ROWS_WORLD[0] + 0.7) / TILE_SCALE;
  inner.add(uprights(trayW + 0.2, height));
  const rows = [], trays = [];
  words.forEach((w, i) => {
    const g = new THREE.Group();
    g.position.set(0, RACK_ROWS_WORLD[i] / TILE_SCALE, 0);
    const tray = makeTray(slots);
    g.add(tray);
    inner.add(g);
    rows.push({ word: w, group: g });
    trays.push(tray);
  });
  const set = buildMoveSet(rows, moves);
  return { group, inner, rows, trays, set, trayW };
}

/**
 * A two-tray mini-rack for the montage (source above, target below), standing on a
 * room's front floor edge. Returns the same shape as buildRack.
 */
export function buildMiniRack({ words, moves, slots }) {
  const group = new THREE.Group();
  const inner = new THREE.Group();
  inner.scale.setScalar(TILE_SCALE);
  group.add(inner);
  const trayW = slots * PITCH + 0.5;
  const ys = [TILE_H * 2.35, TILE_H * 1.0];
  inner.add(uprights(trayW + 0.2, ys[0] + TILE_H));
  const rows = words.map((w, i) => {
    const g = new THREE.Group();
    g.position.set(0, ys[i], 0);
    g.add(makeTray(slots));
    inner.add(g);
    return { word: w, group: g };
  });
  const set = buildMoveSet(rows, moves);
  return { group, inner, rows, set, trayW };
}
