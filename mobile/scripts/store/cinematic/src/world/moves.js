// Choreography of the game's move across several rows: letters lift out of a
// source row (which closes up), fly on an arc, and land in a target row
// (which opens a slot first). Rows are laid out in each row's local frame;
// tiles are re-parented to world space during flight.
//
// rows:  [{ word: 'PLAY', group: Object3D (row frame) }, ...]
// moves: [{ from: rowIndex, letter: indexInCurrentWord, to: rowIndex, slot: insertIndex,
//           lift: t, open: t, land: t }]

import * as THREE from 'three';
import { makeTile } from '../core/tiles.js';
import { slotX, flight, landSquash } from './wordrow.js';
import { clamp, ease, spring } from '../core/math.js';

export function buildMoveSet(rows, moves) {
  // tile objects keyed by stable id; each row keeps an ordered list of ids over time
  const tiles = new Map();
  const rowOrders = rows.map((r, ri) => r.word.split('').map((ch, i) => {
    const id = `${ri}:${i}`;
    const obj = makeTile(ch);
    r.group.add(obj);
    tiles.set(id, { id, ch, obj, home: ri });
    return id;
  }));
  // precompute the order timeline for every row
  const timelines = rows.map((_, ri) => [{ at: -1e9, order: rowOrders[ri].slice() }]);
  const cur = rowOrders.map((o) => o.slice());
  const flights = [];
  for (const mv of moves) {
    const id = cur[mv.from][mv.letter];
    cur[mv.from] = cur[mv.from].filter((x) => x !== id);
    timelines[mv.from].push({ at: mv.lift + 0.12, order: cur[mv.from].slice() });
    const dest = cur[mv.to].slice(); dest.splice(mv.slot, 0, id);
    // the target row opens a gap (a placeholder) before the landing
    timelines[mv.to].push({ at: mv.open, order: dest.slice(), gapFor: id });
    cur[mv.to] = dest;
    flights.push({ ...mv, id });
  }
  const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();

  function rowX(ri, id, t) {
    // spring-glide between successive layouts of the row
    const tl = timelines[ri];
    let x = null;
    for (let k = 0; k < tl.length; k++) {
      const st = tl[k];
      if (t < st.at) break;
      const i = st.order.indexOf(id);
      if (i < 0) { x = null; continue; }
      const tx = slotX(i, st.order.length);
      if (x === null) x = tx; else x = x + (tx - x) * spring(t - st.at, 2.6, 0.6);
    }
    return x;
  }

  return {
    tiles,
    /**
     * Pose every tile at time t. opts.onLand(id, t) optional. Returns info on the
     * active flight: { id, obj, pos (world), phase: 'lift'|'fly'|'land'|null }.
     */
    pose(t) {
      let active = null;
      for (const tile of tiles.values()) {
        const fl = flights.filter((f) => f.id === tile.id);
        // where does the tile live at time t?
        let rowNow = tile.home;
        let flying = null;
        for (const f of fl) {
          if (t >= f.land) rowNow = f.to;
          else if (t >= f.lift) { flying = f; break; }
        }
        const obj = tile.obj;
        if (!flying) {
          const g = rows[rowNow].group;
          if (obj.parent !== g) g.add(obj);
          const x = rowX(rowNow, tile.id, t);
          obj.position.set(x ?? 0, 0, 0);
          obj.rotation.set(0, 0, 0);
          const lastLand = fl.filter((f) => t >= f.land).pop();
          if (lastLand) { const s = landSquash(t - lastLand.land); obj.scale.set(...s); obj.position.y = (s[1] - 1) * 0.61; }
          else obj.scale.set(1, 1, 1);
          continue;
        }
        // in flight: world-space arc from the source slot to the target slot
        const src = rows[flying.from].group, dst = rows[flying.to].group;
        const srcX = rowX(flying.from, tile.id, flying.lift - 1e-3) ?? 0;
        const dstX = rowX(flying.to, tile.id, Math.max(t, flying.open + 0.35)) ?? 0;
        src.localToWorld(tmpA.set(srcX, 0, 0));
        dst.localToWorld(tmpB.set(dstX, 0, 0));
        const dur = flying.land - flying.lift;
        const u = clamp((t - flying.lift) / dur);
        // hold a beat at the top of the lift (the "pick up"), then fly
        const liftPhase = clamp(u / 0.28);
        const flyU = clamp((u - 0.22) / 0.78);
        const A = [tmpA.x, tmpA.y + 0.0, tmpA.z];
        const Aup = [tmpA.x, tmpA.y + 1.1, tmpA.z + 0.25];
        const B = [tmpB.x, tmpB.y, tmpB.z];
        let p, rot;
        if (flyU <= 0) {
          const k = ease.outBack(liftPhase, 1.2);
          p = [A[0], A[1] + (Aup[1] - A[1]) * k, A[2] + (Aup[2] - A[2]) * k];
          rot = [0.08 * k, 0, -0.12 * k];
        } else {
          const f = flight(Aup, [B[0], B[1] + 0.0, B[2]], flyU, { arc: 0.9, tumble: 0.25, lift: 0 });
          p = f.p; rot = f.rot;
        }
        const scene = src.parent ? rootOf(src) : src;
        if (obj.parent !== scene) scene.add(obj);
        obj.position.set(...p);
        obj.quaternion.copy(dst.getWorldQuaternion(new THREE.Quaternion()).slerp(src.getWorldQuaternion(new THREE.Quaternion()), 1 - ease.inOutSine(flyU)));
        obj.rotateX(rot[0]); obj.rotateZ(rot[2]);
        obj.scale.set(1, 1, 1);
        active = { id: tile.id, obj, pos: p, phase: flyU <= 0 ? 'lift' : 'fly', flight: flying };
      }
      return active;
    },
  };
}

function rootOf(o) { let r = o; while (r.parent) r = r.parent; return r; }
