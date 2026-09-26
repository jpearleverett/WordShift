// Time of day: one scalar `dusk` (0 = golden afternoon, 1 = dusk) drives the
// sun, the sky fill, the painted backdrop (a crossfade of the game's own sky
// paintings), the house lamps and window tints, fog and the grade.

import * as THREE from 'three';
import { loadTexture } from '../core/assets.js';
import { lerp } from '../core/math.js';

const C = (h) => new THREE.Color(h);
const mixC = (a, b, t) => a.clone().lerp(b, t);

export const TOD = {
  day: { sun: C('#FFD49A'), sunI: 2.6, elev: 30, fillSky: C('#9DB8FF'), fillGround: C('#7FA85A'), fillI: 1.05, fog: C('#bcd2a0'), exposure: 1.0 },
  dusk: { sun: C('#FF8E5E'), sunI: 1.25, elev: 6, fillSky: C('#8C6FC4'), fillGround: C('#4a3a4a'), fillI: 0.8, fog: C('#6e4a34'), exposure: 1.14 },
};

/** A tiny, heavily smoothed copy of an image (cw x ch), as a linear-filtered texture. */
function softCopy(img, cw, ch) {
  let src = img, w = img.width, h = img.height;
  // halve repeatedly so every source pixel contributes (a single big downscale only point-samples)
  while (w / 2 >= cw && h / 2 >= ch) {
    const c = document.createElement('canvas'); c.width = Math.max(cw, Math.floor(w / 2)); c.height = Math.max(ch, Math.floor(h / 2));
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, c.width, c.height); src = c; w = c.width; h = c.height;
  }
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, cw, ch);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/**
 * The afternoon -> dusk wipe of the painted sky: a narrow, soft front that falls from
 * above the painting to below it as mixv goes 0 -> 1, tilted a little so the east
 * (right) side, away from the setting sun, turns first, and rippled so it drains like
 * light rather than reading as a ruled line. Above the front the dusk painting shows,
 * below it the afternoon one: the two paintings only blend inside the front itself, so
 * the two painted suns (and the two colourings of every mountain) are never seen
 * together. Returns the dusk weight at painting u (0..1 across) and band height y
 * (0 bottom .. 1 top); the shader below runs the same formula.
 */
export const SKY_WIPE = { half: 0.05, tilt: 0.2, ripple: 0.045 };
const ripple = (u, y) => 0.5 * (Math.sin(u * 14.45 + y * 5.1) + Math.sin(u * 29.5 - y * 9.3 + 2.1));
export function skyWipe(mixv, u, y) {
  const { half, tilt, ripple: r } = SKY_WIPE;
  const T = tilt / 2 + r;
  const uc = Math.min(1, Math.max(0, u));
  const p = 1 + half + T - mixv * (1 + 2 * half + 2 * T) - tilt * (uc - 0.5);
  const x = Math.min(1, Math.max(0, (y + r * ripple(uc, y) - (p - half)) / (2 * half)));
  return x * x * (3 - 2 * x);
}

/**
 * The painted sky as one backdrop plane: a single copy of the painting (a band of
 * it, v from the bottom), wiping afternoon -> dusk top-down (skyWipe). The
 * margins beyond the painting continue it softly: a short mirrored strip that
 * melts into a blurred copy and then into the painting's own row colours (its sky
 * gradient, tree line and meadow), so wide shots never show an edge and no
 * mountain is ever seen twice.
 */
export async function makeSkyBackdrop({ a = 'environment/sky_afternoon.webp', b = 'environment/sky_dusk.webp', height = 160, band = [0.32, 1.0], margin = 0.45 } = {}) {
  const ta = await loadTexture(a); const tb = await loadTexture(b);
  const aspectPaint = ta.image.width / (ta.image.height * (band[1] - band[0]));
  const width = height * aspectPaint * (1 + 2 * margin);
  const blurA = softCopy(ta.image, 12, 96), blurB = softCopy(tb.image, 12, 96);
  const rowA = softCopy(ta.image, 1, 128), rowB = softCopy(tb.image, 1, 128);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ta: { value: ta }, tb: { value: tb }, blurA: { value: blurA }, blurB: { value: blurB }, rowA: { value: rowA }, rowB: { value: rowB },
      mixv: { value: 0 }, bright: { value: 1 },
      haze: { value: new THREE.Color('#cfe0c8') }, hazeDusk: { value: new THREE.Color('#c98c86') },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D ta; uniform sampler2D tb; uniform sampler2D blurA; uniform sampler2D blurB; uniform sampler2D rowA; uniform sampler2D rowB;
      uniform float mixv; uniform float bright; uniform vec3 haze; uniform vec3 hazeDusk;
      varying vec2 vUv;
      void main(){
        float m = ${margin.toFixed(3)};
        float pu = vUv.x * (1.0 + 2.0 * m) - m;
        float out_ = max(-pu, pu - 1.0);
        float u = pu < 0.0 ? -pu : (pu > 1.0 ? 2.0 - pu : pu);
        // canvas copies are stored top-down; flipY on the loaded textures makes v run bottom-up everywhere
        vec2 uv = vec2(clamp(u, 0.0, 1.0), ${band[0].toFixed(3)} + vUv.y * ${(band[1] - band[0]).toFixed(3)});
        float hw = ${SKY_WIPE.half.toFixed(4)}, tl = ${SKY_WIPE.tilt.toFixed(4)}, rp = ${SKY_WIPE.ripple.toFixed(4)};
        float uc = clamp(pu, 0.0, 1.0), T = 0.5 * tl + rp;
        float front = 1.0 + hw + T - mixv * (1.0 + 2.0 * hw + 2.0 * T) - tl * (uc - 0.5);
        float rip = 0.5 * (sin(uc * 14.45 + vUv.y * 5.1) + sin(uc * 29.5 - vUv.y * 9.3 + 2.1));
        float k = smoothstep(front - hw, front + hw, vUv.y + rp * rip);
        vec3 c = mix(texture2D(ta, uv).rgb, texture2D(tb, uv).rgb, k);
        if (out_ > 0.0) {
          vec3 soft = mix(texture2D(blurA, uv).rgb, texture2D(blurB, uv).rgb, k);
          vec3 row = mix(texture2D(rowA, vec2(0.5, uv.y)).rgb, texture2D(rowB, vec2(0.5, uv.y)).rgb, k);
          c = mix(c, soft, smoothstep(0.0, 0.14, out_));
          c = mix(c, row, smoothstep(0.08, 0.6, out_));
          vec3 hz = mix(haze, hazeDusk, k);
          c = mix(c, hz, smoothstep(0.3, 1.0, out_) * 0.18);
        }
        // sRGB textures are decoded to linear by the GPU on sampling
        gl_FragColor = vec4(c * bright, 1.0);
      }`,
    depthWrite: true,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
  mesh.userData = { mat, width, height, paintWidth: height * aspectPaint };
  return mesh;
}

/**
 * Apply time of day. env: { sun (DirectionalLight), hemi (HemisphereLight), sky (backdrop), house, scene, azimuth }
 * Returns grade fragments to merge into the look.
 */
export function applyTod(dusk, env) {
  const d = TOD.day, n = TOD.dusk;
  if (env.sun) {
    env.sun.color.copy(mixC(d.sun, n.sun, dusk));
    env.sun.intensity = lerp(d.sunI, n.sunI, dusk);
    const el = THREE.MathUtils.degToRad(lerp(d.elev, n.elev, dusk));
    const az = THREE.MathUtils.degToRad(lerp(env.azimuth ?? -38, env.azimuthDusk ?? -70, dusk));
    const r = env.sunDist ?? 80;
    const c = env.sunCenter || new THREE.Vector3();
    env.sun.position.set(c.x + Math.sin(az) * Math.cos(el) * r, c.y + Math.sin(el) * r, c.z + Math.cos(az) * Math.cos(el) * r);
    env.sun.target.position.copy(c);
  }
  if (env.hemi) {
    env.hemi.color.copy(mixC(d.fillSky, n.fillSky, dusk));
    env.hemi.groundColor.copy(mixC(d.fillGround, n.fillGround, dusk));
    env.hemi.intensity = lerp(d.fillI, n.fillI, dusk);
  }
  if (env.sky) {
    env.sky.userData.mat.uniforms.mixv.value = dusk;
    env.sky.userData.mat.uniforms.bright.value = lerp(1.0, 0.95, dusk);
  }
  if (env.house) env.house.setLight({ paint: lerp(1, 0.82, dusk), lamps: env.lamps ?? Math.max(0, (dusk - 0.35) / 0.65), tint: '#' + mixC(C('#ffffff'), C('#f7ecea'), dusk).getHexString(), windowDusk: dusk, windowColor: '#B5623C', time: env.time || 0 });
  if (env.scene && env.scene.fog) env.scene.fog.color.copy(mixC(d.fog, n.fog, dusk));
  return {
    exposure: lerp(d.exposure, n.exposure, dusk),
    gain: [lerp(1.04, 1.05, dusk), lerp(1.0, 0.97, dusk), lerp(0.94, 0.96, dusk)],
    lift: [lerp(0.0, 0.03, dusk), lerp(0.008, 0.018, dusk), lerp(0.006, 0.04, dusk)],
    contrast: lerp(1, 1.08, dusk),
    saturation: lerp(1.06, 1.04, dusk),
  };
}
