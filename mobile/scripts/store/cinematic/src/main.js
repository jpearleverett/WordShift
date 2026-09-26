// Entry point. Two modes:
//   ?mode=capture  : used by render.mjs; exposes window.TRAILER.renderAt(t) / grab(q)
//   (default) play : real-time playback with the soundtrack, click to start
// ?aspect=16x9 | 9x16, ?scale=0.5 renders a smaller draft.

import * as THREE from 'three';
import { Pipeline } from './core/post.js';
import { loadFonts, ASSET_BASE } from './core/assets.js';
import { Overlay } from './core/text.js';
import { buildTrailer } from './trailer.js';

const params = new URLSearchParams(location.search);
const mode = params.get('mode') || 'play';
const aspect = params.get('aspect') === '9x16' ? '9x16' : '16x9';
const scale = Number(params.get('scale') || 1);
const [W0, H0] = aspect === '9x16' ? [1080, 1920] : [1920, 1080];
const width = Math.round(W0 * scale);
const height = Math.round(H0 * scale);

const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);
renderer.setSize(width, height);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const TRAILER = { isReady: false, aspect, width, height };
window.TRAILER = TRAILER;

async function boot() {
  await loadFonts();
  const overlay = new Overlay(width, height);
  const pipeline = new Pipeline(renderer, width, height);
  const trailer = await buildTrailer({ renderer, width, height, aspect, overlay, pxScale: pipeline.pxScale });
  TRAILER.duration = trailer.duration;
  TRAILER.fps = trailer.fps;
  TRAILER.pipeline = pipeline;
  TRAILER.trailer = trailer;

  let lastFrame = -1;
  TRAILER.renderAt = async (t) => {
    const frame = Math.round(t * trailer.fps);
    const out = trailer.update(t);
    // legacy single-scene form: { scene, camera, look }
    const layers = out.layers || [{ pose: () => out, mb: 1 }];
    pipeline.render(layers, t, frame, overlay, out.transition, out.afterRender);
    lastFrame = frame;
    return lastFrame;
  };
  /** QA: pose (without rendering) and lay out the overlay at t; returns its inked boxes. */
  TRAILER.overlayAt = (t) => {
    const out = trailer.update(t);
    for (const l of out.layers || []) l.pose(t);
    out.afterRender?.();
    return overlay.boxes();
  };
  /**
   * QA: pose (without rendering) at t and project probe points to output pixels:
   * a patch on every visible tile's face (below the gloss band, left of the glyph)
   * with the colour it should have, and the centre of every visible room window.
   */
  TRAILER.probesAt = (t) => {
    const out = trailer.update(t);
    for (const l of out.layers || []) l.pose(t);
    const cam = trailer.camera;
    cam.updateMatrixWorld(); trailer.world.scene.updateMatrixWorld(true);
    const v = new THREE.Vector3(), n = new THREE.Vector3(), toCam = new THREE.Vector3();
    const onScreen = (obj, local) => {
      v.copy(local); obj.localToWorld(v);
      toCam.copy(cam.position).sub(v);
      v.project(cam);
      if (v.z > 1 || Math.abs(v.x) > 0.97 || Math.abs(v.y) > 0.97) return null;
      return { x: Math.round((v.x * 0.5 + 0.5) * width), y: Math.round((1 - (v.y * 0.5 + 0.5)) * height) };
    };
    const visible = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
    const tiles = [], windows = [];
    trailer.world.scene.traverse((o) => {
      const u = o.userData;
      if (u && u.faceMat && u.face && visible(o)) {
        n.set(0, 0, 1).transformDirection(u.face.matrixWorld);
        const pos = new THREE.Vector3().setFromMatrixPosition(u.face.matrixWorld);
        if (n.dot(toCam.copy(cam.position).sub(pos).normalize()) < 0.6) return; // face must look at the lens
        const g = u.face.geometry.parameters;
        const p = onScreen(u.face, new THREE.Vector3(-0.36 * g.width, -0.34 * g.height, 0.001));
        const q = onScreen(u.face, new THREE.Vector3(-0.28 * g.width, -0.34 * g.height, 0.001));
        if (!p || !q) return;
        const locked = u.lockMat && u.lockMat.opacity > 0.5;
        // patch radius: the plain strip between the glyph and the border ring, as projected
        tiles.push({ ...p, ch: u.ch, hex: locked ? '#BBC4CF' : u.color.bg, locked, px: Math.max(1, Math.round(Math.hypot(q.x - p.x, q.y - p.y) / 2)) });
      }
    });
    for (const [id, rm] of Object.entries(trailer.world.house.rooms)) {
      const w = rm.windowMesh;
      if (!w || !visible(w) || w.material.opacity < 0.05) continue;
      if (!w.userData.centroid) {
        const img = w.material.map.image, c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let sx = 0, sy = 0, k = 0;
        for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (d[(y * c.width + x) * 4 + 3] > 128 && d[(y * c.width + x) * 4] > 128) { sx += x; sy += y; k++; }
        w.userData.centroid = k ? [sx / k / c.width, 1 - sy / k / c.height] : [0.5, 0.5];
      }
      const [cu, cv] = w.userData.centroid, g = w.geometry.parameters;
      const p = onScreen(w, new THREE.Vector3((cu - 0.5) * g.width, (cv - 0.5) * g.height, 0));
      if (p) windows.push({ ...p, room: id });
    }
    // glass-look rooms hide the dusk overlay (house.js WINDOW_LOOK): probe their glass directly
    const GLASS_PROBES = { observatory: [[-0.4, 2.75], [0.67, 3.1]] }; // left crescent, right pane's clear upper-left
    for (const [id, pts] of Object.entries(GLASS_PROBES)) {
      const rm = trailer.world.house.rooms[id];
      if (!rm || !rm.painting || !visible(rm.painting)) continue;
      for (const [x, y] of pts) { const p = onScreen(rm.builtG, new THREE.Vector3(x, y, -rm.roomD / 2 + 0.03)); if (p) windows.push({ ...p, room: id }); }
    }
    return { tiles, windows };
  };
  TRAILER.grab = (q = 0.96) => {
    const url = renderer.domElement.toDataURL('image/jpeg', q);
    return url.slice(url.indexOf(',') + 1);
  };
  // Warm every shader and texture once so the first captured frame is final.
  for (const t of trailer.warmTimes || [0]) await TRAILER.renderAt(t);
  TRAILER.isReady = true;

  if (mode === 'play') startPlayback(trailer);
}

function startPlayback(trailer) {
  document.body.classList.add('play');
  const audio = new Audio(params.get('score') || `${ASSET_BASE}../scripts/store/cinematic/out/score.m4a`);
  const btn = document.createElement('div');
  btn.id = 'start';
  btn.textContent = 'Click to play';
  document.body.appendChild(btn);
  btn.addEventListener('click', () => {
    btn.remove();
    audio.currentTime = 0;
    audio.play().catch(() => {});
    const t0 = performance.now();
    const tick = () => {
      const t = audio.paused || !isFinite(audio.currentTime) || audio.currentTime === 0
        ? (performance.now() - t0) / 1000 : audio.currentTime;
      if (t > trailer.duration) { TRAILER.renderAt(trailer.duration - 1 / trailer.fps); return; }
      TRAILER.renderAt(t);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

boot().catch((e) => { console.error(e); document.body.textContent = String(e.stack || e); });
