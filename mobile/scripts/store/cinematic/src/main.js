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
    const layers = out.layers || [{ scene: out.scene, camera: out.camera, look: out.look }];
    pipeline.render(layers, frame, overlay, out.transition);
    lastFrame = frame;
    return lastFrame;
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
