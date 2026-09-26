// Environment kit: painted sky backdrop, pixel meadow, wind-blown grass
// tufts, depth-aware bokeh particles (fireflies, pollen, dust, embers) and
// soft light shafts. Everything animates from the `time` argument only.

import * as THREE from 'three';
import { mulberry32 } from '../core/math.js';
import { loadTexture } from '../core/assets.js';

/**
 * Painted backdrop on a large plane. `band` crops the portrait painting
 * vertically ([v0, v1] from the bottom), mirrored horizontally to span wide frames.
 */
export async function makeBackdrop(rel, { width = 90, band = [0.3, 0.9], tilesX = 1, fog = null } = {}) {
  const tex = (await loadTexture(rel)).clone();
  tex.needsUpdate = true;
  tex.wrapS = THREE.MirroredRepeatWrapping;
  tex.repeat.set(tilesX, band[1] - band[0]);
  tex.offset.set(tilesX > 1 ? -(tilesX - 1) / 2 : 0, band[0]);
  const img = tex.image;
  const aspect = (img.width * tilesX) / (img.height * (band[1] - band[0]));
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: true, fog: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / aspect), mat);
  mesh.userData = { mat, fog };
  return mesh;
}

/**
 * Ground texture cut from a sky painting's own meadow band, so the 3D ground
 * meets the painted backdrop in the same greens. Mirrored so it tiles.
 */
export async function meadowFromPainting(rel = 'environment/sky_afternoon.webp', { y0 = 0.74, y1 = 0.86 } = {}) {
  const tex = await loadTexture(rel);
  const img = tex.image;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  c.getContext('2d').drawImage(img, 0, img.height * y0, img.width, img.height * (y1 - y0), 0, 0, 512, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8;
  return t;
}

/** Procedural pixel-art meadow texture (tileable). */
export function meadowTexture({ seed = 7, base = '#5e9a3c', size = 256 } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  const shades = ['#4f8a33', '#6aa845', '#76b34d', '#5a9239', '#86bf57', '#467d2e'];
  for (let i = 0; i < size * size / 6; i++) {
    g.fillStyle = shades[Math.floor(rnd() * shades.length)];
    const x = Math.floor(rnd() * size), y = Math.floor(rnd() * size);
    g.fillRect(x, y, 1 + Math.floor(rnd() * 2), 1 + Math.floor(rnd() * 3));
  }
  const flowers = ['#f7f1e3', '#f4d35e', '#e98aa6', '#9fb8ff'];
  for (let i = 0; i < size / 5; i++) {
    g.fillStyle = flowers[Math.floor(rnd() * flowers.length)];
    const x = Math.floor(rnd() * size), y = Math.floor(rnd() * size);
    g.fillRect(x, y, 2, 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8;
  return t;
}

/** A pixel grass tuft sprite (canvas), used on instanced cards. */
function tuftTexture(seed = 3) {
  const W = 32, H = 32;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  const cols = ['#3f7a2a', '#579a37', '#6fb347', '#88c95a'];
  for (let b = 0; b < 11; b++) {
    let x = 6 + rnd() * 20, y = H;
    const h = 12 + rnd() * 18, lean = (rnd() - 0.5) * 0.8;
    g.fillStyle = cols[Math.floor(rnd() * cols.length)];
    for (let k = 0; k < h; k++) { g.fillRect(Math.round(x), Math.round(y - k), k < h * 0.6 ? 2 : 1, 1); x += lean * (k / h); }
  }
  if (rnd() < 0.7) { g.fillStyle = ['#f7f1e3', '#f4d35e', '#e98aa6'][Math.floor(rnd() * 3)]; g.fillRect(12 + Math.floor(rnd() * 8), 4 + Math.floor(rnd() * 6), 3, 3); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/**
 * Wind-blown grass: `count` crossed cards scattered in `area` ({x0,x1,z0,z1,y}).
 * update(time) sways them. Cards face +Z (the camera side) with slight yaw.
 */
export function makeGrass({ count = 400, area = { x0: -12, x1: 12, z0: -2, z1: 8, y: 0 }, height = 0.55, seed = 11, avoid = null } = {}) {
  const rnd = mulberry32(seed);
  const texs = [tuftTexture(1), tuftTexture(2), tuftTexture(3)];
  const group = new THREE.Group();
  const meshes = texs.map((map) => {
    const geo = new THREE.PlaneGeometry(height, height);
    geo.translate(0, height / 2, 0);
    const mat = new THREE.MeshStandardMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 1 });
    const m = new THREE.InstancedMesh(geo, mat, Math.ceil(count / texs.length));
    m.castShadow = false; m.receiveShadow = true;
    m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 });
    group.add(m);
    return m;
  });
  const items = [];
  for (let i = 0; i < count; i++) {
    let x, z, tries = 0;
    do { x = area.x0 + rnd() * (area.x1 - area.x0); z = area.z0 + rnd() * (area.z1 - area.z0); tries++; } while (avoid && avoid(x, z) && tries < 20);
    items.push({ x, z, s: 0.6 + rnd() * 0.9, yaw: (rnd() - 0.5) * 0.9, ph: rnd() * 6.28, mesh: i % texs.length, idx: Math.floor(i / texs.length) });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
  function update(time, wind = 1) {
    for (const it of items) {
      const sway = Math.sin(time * 1.6 + it.ph + it.x * 0.35) * 0.12 * wind + Math.sin(time * 3.7 + it.ph * 2) * 0.03 * wind;
      e.set(0, it.yaw, sway); q.setFromEuler(e);
      p.set(it.x, area.y, it.z); sc.set(it.s, it.s, it.s);
      m4.compose(p, q, sc);
      meshes[it.mesh].setMatrixAt(it.idx, m4);
    }
    for (const m of meshes) m.instanceMatrix.needsUpdate = true;
  }
  update(0);
  return { group, update };
}

const PARTICLE_VERT = /* glsl */`
attribute vec4 seed;          // x,y,z jitter seeds, w phase
uniform float time;
uniform float pxScale;
uniform float baseSize;
uniform float focus;
uniform float aperture;
uniform vec3 drift;           // wander amplitude
uniform vec3 flow;            // constant velocity
uniform vec3 boxMin;
uniform vec3 boxMax;
varying float vAlpha;
varying float vSoft;
void main() {
  vec3 size = boxMax - boxMin;
  vec3 p = position + flow * time;
  p = boxMin + mod(p - boxMin, size);
  p.x += sin(time * (0.35 + seed.x * 0.5) + seed.w * 6.2831) * drift.x;
  p.y += sin(time * (0.28 + seed.y * 0.4) + seed.w * 4.1) * drift.y;
  p.z += cos(time * (0.31 + seed.z * 0.45) + seed.w * 5.3) * drift.z;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float depth = -mv.z;
  float coc = aperture * abs(1.0 - focus / max(depth, 0.01));
  float s = baseSize * pxScale * (0.6 + seed.y * 0.8) * (8.0 / max(depth, 0.1));
  float big = s + coc * pxScale;
  gl_PointSize = big;
  vAlpha = (0.55 + 0.45 * sin(time * (1.5 + seed.z * 2.5) + seed.w * 30.0)) * clamp((s * s) / (big * big), 0.06, 1.0);
  vSoft = clamp(coc * pxScale / max(big, 1.0), 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;
const PARTICLE_FRAG = /* glsl */`
uniform vec3 color;
uniform float intensity;
uniform float opacity;
varying float vAlpha;
varying float vSoft;
void main() {
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d) * 2.0;
  float core = smoothstep(1.0, mix(0.0, 0.75, vSoft), r);
  float ring = mix(1.0, 0.75 + 0.25 * smoothstep(0.6, 0.95, r), vSoft);
  float a = core * ring * vAlpha * opacity;
  if (a < 0.002) discard;
  gl_FragColor = vec4(color * intensity * a, a);
}
`;

/** Depth-aware glowing particles in a box. Returns { points, uniforms }. */
export function makeParticles({ count = 200, boxMin = [-8, 0, -4], boxMax = [8, 6, 8], color = '#ffd27a', size = 6, intensity = 3, drift = [0.4, 0.3, 0.4], flow = [0, 0, 0], seed = 5, additive = true } = {}) {
  const rnd = mulberry32(seed);
  const pos = new Float32Array(count * 3), sd = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    for (let k = 0; k < 3; k++) pos[i * 3 + k] = boxMin[k] + rnd() * (boxMax[k] - boxMin[k]);
    for (let k = 0; k < 4; k++) sd[i * 4 + k] = rnd();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('seed', new THREE.BufferAttribute(sd, 4));
  const uniforms = {
    time: { value: 0 }, pxScale: { value: 1 }, baseSize: { value: size }, focus: { value: 10 }, aperture: { value: 0 },
    drift: { value: new THREE.Vector3(...drift) }, flow: { value: new THREE.Vector3(...flow) },
    boxMin: { value: new THREE.Vector3(...boxMin) }, boxMax: { value: new THREE.Vector3(...boxMax) },
    color: { value: new THREE.Color(color) }, intensity: { value: intensity }, opacity: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader: PARTICLE_VERT, fragmentShader: PARTICLE_FRAG, uniforms,
    transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, uniforms };
}

/** Soft additive light shaft (a tall quad with a radial-gradient texture). */
let shaftTex = null;
export function makeShaft({ width = 1.2, height = 6, color = '#fff1c9', opacity = 0.18 } = {}) {
  if (!shaftTex) {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const g = c.getContext('2d');
    const gx = g.createLinearGradient(0, 0, 64, 0);
    gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gx; g.fillRect(0, 0, 64, 256);
    g.globalCompositeOperation = 'destination-in';
    const gy = g.createLinearGradient(0, 0, 0, 256);
    gy.addColorStop(0, 'rgba(0,0,0,1)'); gy.addColorStop(0.7, 'rgba(0,0,0,0.5)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gy; g.fillRect(0, 0, 64, 256);
    shaftTex = new THREE.CanvasTexture(c);
  }
  const mat = new THREE.MeshBasicMaterial({ map: shaftTex, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const geo = new THREE.PlaneGeometry(width, height);
  geo.translate(0, -height / 2, 0);
  return new THREE.Mesh(geo, mat);
}
