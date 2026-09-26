// Small reusable effects: emote pops, amber gem streams, ribbon trails, and a
// soft contact shadow. All are pure functions of time.

import * as THREE from 'three';
import { loadTexture } from '../core/assets.js';
import { clamp, ease, spring, catmull, mulberry32 } from '../core/math.js';

/** Billboard sprite (always faces the camera) from a UI png. */
export async function makeBillboard(rel, size = 1, { pixel = true, additive = false } = {}) {
  const tex = await loadTexture(rel, { pixel });
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const s = new THREE.Sprite(mat);
  s.scale.set(size, size, 1);
  s.userData.base = size;
  return s;
}

/** Emote pop at local time u (seconds since pop): 0 -> 1.15 -> 1, float up, fade. */
export function poseEmote(sprite, u, { hold = 1.2, rise = 0.35, fade = 0.35 } = {}) {
  if (u < 0 || u > hold + fade) { sprite.visible = false; return; }
  sprite.visible = true;
  const s = spring(u, 3.2, 0.42) * sprite.userData.base;
  sprite.scale.set(s, s, 1);
  sprite.center.set(0.5, 0);
  // callers set userData.y0 (the resting height) when they place the emote
  sprite.position.y = (sprite.userData.y0 ?? 0) + ease.outCubic(clamp(u / (hold + fade))) * rise;
  sprite.material.opacity = u > hold ? 1 - (u - hold) / fade : 1;
}

/**
 * A stream of amber gems flowing along a Catmull-Rom path.
 * pose(t0, t1, t): gems depart between t0 and t0 + spread and each takes `travel` s.
 */
export async function makeAmberStream({ count = 40, size = 0.45, seed = 12 } = {}) {
  const tex = await loadTexture('ui/amber.png', { pixel: true });
  const group = new THREE.Group();
  const rnd = mulberry32(seed);
  const gems = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    const s = new THREE.Sprite(m);
    s.userData = { off: rnd(), jitter: [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5], sz: size * (0.6 + rnd() * 0.7), spin: rnd() * 6 };
    group.add(s);
    gems.push(s);
  }
  const glow = new THREE.PointLight('#ffb347', 0, 8, 2);
  group.add(glow);
  return {
    group,
    pose(points, t, { start = 0, spread = 0.8, travel = 0.7, spreadRadius = 0.35 } = {}) {
      let lit = 0; let cx = 0, cy = 0, cz = 0;
      for (const g of gems) {
        const u = (t - start - g.userData.off * spread) / travel;
        if (u < 0 || u > 1) { g.visible = false; continue; }
        g.visible = true;
        const e = ease.inOutSine(u);
        const p = catmull(points, e);
        const w = Math.sin(Math.PI * u) * spreadRadius;
        g.position.set(p[0] + g.userData.jitter[0] * w, p[1] + g.userData.jitter[1] * w, p[2] + g.userData.jitter[2] * w);
        const sc = g.userData.sz * (0.6 + 0.4 * Math.sin(Math.PI * u));
        g.scale.set(sc, sc, 1);
        g.material.rotation = g.userData.spin + t * 2;
        g.material.opacity = Math.min(1, u * 6, (1 - u) * 5);
        lit++; cx += g.position.x; cy += g.position.y; cz += g.position.z;
      }
      if (lit) { glow.position.set(cx / lit, cy / lit, cz / lit); glow.intensity = Math.min(1, lit / 10) * 6; } else glow.intensity = 0;
    },
  };
}

/** Additive ribbon trail following a point history (camera-facing strip). */
export function makeTrail({ segments = 20, width = 0.18, color = '#ffe6a8' } = {}) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(segments * 2 * 3);
  const alpha = new Float32Array(segments * 2);
  const idx = [];
  for (let i = 0; i < segments - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  geo.setIndex(idx);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, intensity: { value: 1.6 } },
    vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 color; uniform float intensity; varying float vA; void main(){ gl_FragColor = vec4(color * intensity * vA, vA); }',
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  const v = new THREE.Vector3(), side = new THREE.Vector3(), toCam = new THREE.Vector3();
  return {
    mesh,
    /** pathFn(time) -> [x,y,z]; draws the trail from time-len to time. */
    pose(pathFn, time, len, camera, fadeIn = 1) {
      for (let i = 0; i < segments; i++) {
        const k = i / (segments - 1);
        const p0 = pathFn(time - len * k), p1 = pathFn(time - len * Math.min(1, k + 1 / segments));
        v.set(p0[0] - p1[0], p0[1] - p1[1], p0[2] - p1[2]);
        toCam.set(camera.position.x - p0[0], camera.position.y - p0[1], camera.position.z - p0[2]);
        side.crossVectors(v, toCam).normalize().multiplyScalar(width * (1 - k) * 0.5);
        pos.set([p0[0] + side.x, p0[1] + side.y, p0[2] + side.z], i * 6);
        pos.set([p0[0] - side.x, p0[1] - side.y, p0[2] - side.z], i * 6 + 3);
        const a = Math.pow(1 - k, 1.5) * fadeIn;
        alpha[i * 2] = a; alpha[i * 2 + 1] = a;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.alpha.needsUpdate = true;
    },
  };
}

/** Soft round contact shadow decal on the floor. */
let blobTex = null;
export function makeContactShadow(w = 1, d = 0.4, opacity = 0.4) {
  if (!blobTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    blobTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, opacity, depthWrite: false, color: '#1a0e08' }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

/**
 * A little three-lump pixel dust cloud (lit top-left, shaded underneath, three stepped alpha
 * tiers), nearest-filtered: the impact puffs of the end card and the build's landings.
 */
export function makeDustPuff() {
  // a little three-lump pixel cloud: lit top-left, shaded underneath, three alpha steps
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d');
  const lumps = [[5.5, 9.8, 3.3], [10.6, 9.2, 3.6], [8.0, 5.6, 3.0]];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const d = Math.min(...lumps.map(([lx, ly, r]) => Math.hypot(x + 0.5 - lx, y + 0.5 - ly) - r)) + 0.35 * Math.sin(x * 2.1 + y * 1.3);
      const a = d < -1.4 ? 0.85 : d < 0 ? 0.55 : d < 1 ? 0.22 : 0;
      if (!a) continue;
      const rgb = y > 10 ? '150,122,96' : x + y < 13 ? '232,212,178' : '198,172,138';
      g.fillStyle = `rgba(${rgb},${a})`; g.fillRect(x, y, 1, 1);
    }
  }
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace; tx.magFilter = THREE.NearestFilter; tx.minFilter = THREE.NearestFilter; tx.generateMipmaps = false;
  return tx;
}
