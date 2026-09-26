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
  dusk: { sun: C('#FF8E5E'), sunI: 1.25, elev: 6, fillSky: C('#8C6FC4'), fillGround: C('#4a3a4a'), fillI: 0.8, fog: C('#9c7090'), exposure: 1.08 },
};

/**
 * The painted sky as one backdrop plane: a single copy of the painting (a band of
 * it, v from the bottom), crossfading afternoon -> dusk with a top-down wipe. The
 * margins beyond the painting mirror it but dissolve into haze, so no mountain is
 * ever seen twice.
 */
export async function makeSkyBackdrop({ a = 'environment/sky_afternoon.webp', b = 'environment/sky_dusk.webp', height = 160, band = [0.32, 1.0], margin = 0.45 } = {}) {
  const ta = await loadTexture(a); const tb = await loadTexture(b);
  const aspectPaint = ta.image.width / (ta.image.height * (band[1] - band[0]));
  const width = height * aspectPaint * (1 + 2 * margin);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      ta: { value: ta }, tb: { value: tb }, mixv: { value: 0 }, bright: { value: 1 },
      haze: { value: new THREE.Color('#cfe0c8') }, hazeDusk: { value: new THREE.Color('#c98c86') },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform sampler2D ta; uniform sampler2D tb; uniform float mixv; uniform float bright; uniform vec3 haze; uniform vec3 hazeDusk;
      varying vec2 vUv;
      void main(){
        float m = ${margin.toFixed(3)};
        float pu = vUv.x * (1.0 + 2.0 * m) - m;
        float out_ = max(-pu, pu - 1.0);
        float u = pu < 0.0 ? -pu : (pu > 1.0 ? 2.0 - pu : pu);
        vec2 uv = vec2(clamp(u, 0.0, 1.0), ${band[0].toFixed(3)} + vUv.y * ${(band[1] - band[0]).toFixed(3)});
        float k = clamp(mixv * 1.7 - (1.0 - vUv.y) * 0.7, 0.0, 1.0);
        vec3 c = mix(texture2D(ta, uv).rgb, texture2D(tb, uv).rgb, k);
        vec3 hz = mix(haze, hazeDusk, k);
        float h = smoothstep(0.0, m * 0.55, out_) * 0.88;
        // sRGB textures are decoded to linear by the GPU on sampling
        gl_FragColor = vec4(mix(c, hz, h) * bright, 1.0);
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
  if (env.house) env.house.setLight({ paint: lerp(1, 0.82, dusk), lamps: env.lamps ?? Math.max(0, (dusk - 0.35) / 0.65), tint: '#' + mixC(C('#ffffff'), C('#efdcea'), dusk).getHexString(), windowDusk: dusk, windowColor: '#B5623C', time: env.time || 0 });
  if (env.scene && env.scene.fog) env.scene.fog.color.copy(mixC(d.fog, n.fog, dusk));
  return {
    exposure: lerp(d.exposure, n.exposure, dusk),
    gain: [lerp(1.04, 1.05, dusk), lerp(1.0, 0.97, dusk), lerp(0.94, 0.96, dusk)],
    lift: [lerp(0.0, 0.03, dusk), lerp(0.008, 0.018, dusk), lerp(0.006, 0.04, dusk)],
    saturation: lerp(1.06, 1.04, dusk),
  };
}
