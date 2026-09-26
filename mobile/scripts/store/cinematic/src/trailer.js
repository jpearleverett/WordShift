// The cinematic trailer: one persistent world, one camera, ten shots on the
// bed's musical grid (spec: mobile/scripts/store/cinematic/README.md).
//
// A shot module exports `async function make(ctx)` returning one shot or an array:
//   { id, start, end, transition?: { type: 'whip', dur, dir: [x, y] },
//     mb?(t) -> subframes, shutter?(t) -> seconds (default 1/60; see common.js blurFor),
//     pose(t, ctx) -> { scene, camera, look }, overlay?(t, ctx) }
// pose() receives trailer time, must be a pure function of it, and is called
// after world.begin() has reset shared state (so it only sets what it uses).

import * as THREE from 'three';
import { buildWorld } from './sets/world.js';
import { Timeline } from './core/timeline.js';
import { Captions } from './core/captions.js';
import { CAPTIONS, DURATION, FPS, E } from './timeline/events.js';
import { SHOT_MAKERS } from './shots/index.js';

export async function buildTrailer(ctx) {
  const world = await buildWorld({ pxScale: ctx.pxScale });
  const camera = new THREE.PerspectiveCamera(30, ctx.width / ctx.height, 0.05, 900);
  const common = { ...ctx, world, camera, E, portrait: ctx.aspect === '9x16' };
  const shots = [];
  common.shots = shots; // lets a continuous shot pick up exactly where the previous one ends
  for (const make of SHOT_MAKERS) {
    const made = await make(common);
    for (const s of [].concat(made)) shots.push(s);
  }
  const timeline = new Timeline(shots);
  const captions = new Captions(ctx.overlay, CAPTIONS, ctx);
  const warmTimes = shots.map((s) => (s.start + s.end) / 2);

  return {
    duration: DURATION, fps: FPS, warmTimes, shots, world,
    update(t) {
      const active = timeline.at(t);
      const layers = active.map((l) => ({
        pose: (ts) => { world.begin(); return l.shot.pose(ts, common); },
        mb: l.shot.mb ? l.shot.mb(t) : 1,
        shutter: l.shot.shutter ? l.shot.shutter(t) : 1 / 60,
      }));
      const tr = active.length > 1 ? { type: active[1].transition.type, u: active[1].u, dir: active[1].transition.dir, color: active[1].transition.color } : null;
      return {
        layers, transition: tr,
        afterRender: () => {
          ctx.overlay.hideAll();
          captions.update(t);
          for (const l of active) if (l.shot.overlay) l.shot.overlay(t, common);
        },
      };
    },
  };
}
