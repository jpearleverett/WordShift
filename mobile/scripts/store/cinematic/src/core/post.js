// The trailer's render pipeline.
//
//   scene -> HDR MSAA target (with depth)
//         -> depth of field (single-pass scatter-as-gather bokeh, CoC from depth)
//         -> bloom (three's UnrealBloomPass, composited in place)
//         -> grade: exposure, white balance, AgX/ACES tone map, sRGB, lift/gamma/gain,
//            saturation, vignette, chromatic aberration, film grain, fades
//         -> screen, then the 2D overlay (captions, logo) drawn on top in sRGB.
//
// Every size is expressed relative to the output height so a half-resolution
// draft looks like the final render, only softer.

import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const FULLSCREEN_VERT = /* glsl */`
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

// Depth of field in three passes:
//   prep  (half res): color + signed circle of confusion (px at full res) from depth
//   blur  (half res): Gustafsson's scatter-as-gather bokeh over the prepped image
//   comp  (full res): sharp full-res color where in focus, the blur where not
const DOF_COMMON = /* glsl */`
uniform float cameraNear;
uniform float cameraFar;
uniform float focusDistance;
uniform float aperture;
uniform float maxBlur;
uniform float pxScale;
float linearDepth(sampler2D tDepth, vec2 uv) {
  float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
  return 2.0 * cameraNear * cameraFar / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
}
float cocOf(float d) {
  float c = aperture * abs(1.0 - focusDistance / max(d, 0.0001));
  return clamp(c, 0.0, maxBlur) * pxScale;
}
`;

const DOF_PREP_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 fullRes;
${DOF_COMMON}
void main() {
  // 4-tap box downsample of color; CoC from the nearest (max CoC) of the 4 depths
  vec2 o = 0.5 / fullRes;
  vec3 c = (texture2D(tColor, vUv + vec2(-o.x, -o.y)).rgb + texture2D(tColor, vUv + vec2(o.x, -o.y)).rgb
          + texture2D(tColor, vUv + vec2(-o.x, o.y)).rgb + texture2D(tColor, vUv + vec2(o.x, o.y)).rgb) * 0.25;
  float d = linearDepth(tDepth, vUv);
  float coc = cocOf(d);
  float sgn = d < focusDistance ? -1.0 : 1.0;
  gl_FragColor = vec4(c, coc * sgn);
}
`;

const DOF_BLUR_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tPrep;       // rgb color, a = signed CoC in full-res px
uniform vec2 halfRes;
uniform float maxBlur;
uniform float pxScale;
const float GOLDEN = 2.39996323;
void main() {
  vec4 center = texture2D(tPrep, vUv);
  float cs = abs(center.a) * 0.5;               // in half-res px
  float maxR = maxBlur * pxScale * 0.5;
  vec3 acc = center.rgb;
  float tot = 1.0;
  float radius = 0.5;
  float radScale = max(0.5, maxR * maxR / 110.0);
  for (int i = 0; i < 72; i++) {
    if (radius > maxR) break;
    float ang = float(i) * GOLDEN;
    vec2 tc = vUv + vec2(cos(ang), sin(ang)) * radius / halfRes;
    vec4 s = texture2D(tPrep, tc);
    float ss = abs(s.a) * 0.5;
    // background samples cannot bleed over a sharper foreground pixel
    if (s.a > center.a) ss = clamp(ss, 0.0, cs * 2.0);
    float m = smoothstep(radius - 0.5, radius + 0.5, ss);
    acc += mix(acc / tot, s.rgb, m);
    tot += 1.0;
    radius += radScale / radius;
  }
  gl_FragColor = vec4(acc / tot, center.a);
}
`;

const DOF_COMP_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tBlur;
uniform float enabled;
${DOF_COMMON}
void main() {
  vec3 sharp = texture2D(tColor, vUv).rgb;
  if (enabled < 0.5) { gl_FragColor = vec4(sharp, 1.0); return; }
  vec4 b = texture2D(tBlur, vUv);
  float coc = max(cocOf(linearDepth(tDepth, vUv)), abs(b.a) * step(b.a, 0.0));
  float m = smoothstep(0.6 * pxScale, 2.2 * pxScale, coc);
  gl_FragColor = vec4(mix(sharp, b.rgb, m), 1.0);
}
`;

const GRADE_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tColor;
uniform vec2 resolution;
uniform float exposure;
uniform vec3 whiteBalance;   // multiplies linear color before tone mapping
uniform vec3 lift;
uniform vec3 gamma;
uniform vec3 gain;
uniform float saturation;
uniform float contrast;
uniform float vignette;      // 0..1 strength
uniform float vignetteSoft;
uniform float aberration;    // pixels at the frame corner (at 1080p)
uniform float grain;         // 0..~0.08
uniform float frame;         // integer frame for grain seed
uniform float pxScale;
uniform float fadeBlack;     // 0..1
uniform vec3 fadeColor;
uniform float fadeColorAmt;
uniform float toneMap;       // 0 = AgX, 1 = ACES

// AgX (Troy Sobotka), as used by three.js.
vec3 agxDefaultContrastApprox(vec3 x) {
  vec3 x2 = x * x; vec3 x4 = x2 * x2;
  return + 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}
vec3 AgX(vec3 color) {
  const mat3 AgXInsetMatrix = mat3(
    vec3(0.856627153315983, 0.137318972929847, 0.11189821299995),
    vec3(0.0951212405381588, 0.761241990602591, 0.0767994186031903),
    vec3(0.0482516061458583, 0.101439036467562, 0.811302368396859));
  const mat3 AgXOutsetMatrix = mat3(
    vec3(1.1271005818144368, -0.1413297634984383, -0.14132976349843826),
    vec3(-0.11060664309660323, 1.157823702216272, -0.11060664309660294),
    vec3(-0.016493938717834573, -0.016493938717834257, 1.2519364065950405));
  const float AgxMinEv = -12.47393;
  const float AgxMaxEv = 4.026069;
  color = AgXInsetMatrix * color;
  color = max(color, 1e-10);
  color = log2(color);
  color = (color - AgxMinEv) / (AgxMaxEv - AgxMinEv);
  color = clamp(color, 0.0, 1.0);
  color = agxDefaultContrastApprox(color);
  color = AgXOutsetMatrix * color;
  color = pow(max(vec3(0.0), color), vec3(2.2));
  return clamp(color, 0.0, 1.0);
}
vec3 RRTAndODTFit(vec3 v) {
  vec3 a = v * (v + 0.0245786) - 0.000090537;
  vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
  return a / b;
}
vec3 ACES(vec3 color) {
  const mat3 ACESInputMat = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
  const mat3 ACESOutputMat = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
  color *= 1.0 / 0.6;
  color = ACESInputMat * color;
  color = RRTAndODTFit(color);
  color = ACESOutputMat * color;
  return clamp(color, 0.0, 1.0);
}
vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }

vec3 sampleCA(vec2 uv) {
  vec2 d = uv - 0.5;
  vec2 off = d * aberration * pxScale / resolution * 2.0;
  float r = texture2D(tColor, uv + off).r;
  float g = texture2D(tColor, uv).g;
  float b = texture2D(tColor, uv - off).b;
  return vec3(r, g, b);
}

void main() {
  vec3 c = aberration > 0.0 ? sampleCA(vUv) : texture2D(tColor, vUv).rgb;
  c *= exposure * whiteBalance;
  c = toneMap < 0.5 ? AgX(c) : ACES(c);
  // grade in display-referred space
  c = pow(max(c, 0.0), 1.0 / gamma);
  c = c * gain + lift * (1.0 - c);
  c = (c - 0.5) * contrast + 0.5;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, saturation);
  c = clamp(c, 0.0, 1.0);
  vec3 s = toSRGB(c);
  // vignette (aspect-correct ellipse)
  vec2 p = vUv - 0.5;
  p.x *= resolution.x / resolution.y;
  float asp = max(resolution.x / resolution.y, resolution.y / resolution.x);
  float vd = length(p) / (0.5 * sqrt(1.0 + asp * asp) / max(1.0, resolution.y / resolution.x));
  s *= 1.0 - vignette * smoothstep(vignetteSoft, 1.05, vd);
  // film grain, luminance-weighted, temporally varying by frame
  float g = hash(vUv * resolution / max(pxScale, 0.25) + frame * 17.13) - 0.5;
  s += g * grain * (0.6 + 0.4 * (1.0 - dot(s, vec3(0.333))));
  s = mix(s, fadeColor, fadeColorAmt);
  s *= 1.0 - fadeBlack;
  gl_FragColor = vec4(clamp(s, 0.0, 1.0), 1.0);
}
`;


const MIX_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D tA;
uniform sampler2D tB;
uniform float u;          // 0 = all A, 1 = all B
uniform float mode;       // 0 dissolve, 1 dip to color, 2 whip
uniform vec3 dipColor;
uniform vec2 whipDir;     // direction the camera whips (uv units per full transition)
vec3 blurAlong(sampler2D t, vec2 uv, vec2 d) {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < 24; i++) { float k = float(i) / 23.0 - 0.5; acc += texture2D(t, uv + d * k).rgb; }
  return acc / 24.0;
}
void main() {
  if (mode < 0.5) {
    gl_FragColor = vec4(mix(texture2D(tA, vUv).rgb, texture2D(tB, vUv).rgb, u), 1.0);
  } else if (mode < 1.5) {
    vec3 a = texture2D(tA, vUv).rgb, b = texture2D(tB, vUv).rgb;
    vec3 c = u < 0.5 ? mix(a, dipColor, u * 2.0) : mix(dipColor, b, u * 2.0 - 1.0);
    gl_FragColor = vec4(c, 1.0);
  } else {
    float s = sin(3.14159265 * u);
    vec2 d = whipDir * s * 0.35;
    vec3 a = blurAlong(tA, vUv + whipDir * u * 0.6, d);
    vec3 b = blurAlong(tB, vUv - whipDir * (1.0 - u) * 0.6, d);
    float m = smoothstep(0.35, 0.65, u);
    gl_FragColor = vec4(mix(a, b, m), 1.0);
  }
}
`;

export class Pipeline {
  constructor(renderer, width, height) {
    this.renderer = renderer;
    this.width = width;
    this.height = height;
    this.pxScale = height >= width ? width / 1080 : height / 1080;
    const depthTexture = new THREE.DepthTexture(width, height);
    depthTexture.type = THREE.UnsignedIntType;
    const depthTexture2 = new THREE.DepthTexture(width, height);
    depthTexture2.type = THREE.UnsignedIntType;
    // MSAA roughly quadruples fill cost on SwiftShader, so it is chosen per shot (look.msaa)
    this.sceneRTaa = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4, depthTexture });
    this.sceneRTplain = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 0, depthTexture: depthTexture2 });
    this.sceneRT = this.sceneRTaa;
    this.subRT = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType });
    this.dofRT = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType });
    this.dofRT2 = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType });
    this.mixRT = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.45, 0.55, 0.85);
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadGeo = new THREE.PlaneGeometry(2, 2);

    const hw = Math.max(1, Math.round(width / 2)), hh = Math.max(1, Math.round(height / 2));
    this.prepRT = new THREE.WebGLRenderTarget(hw, hh, { type: THREE.HalfFloatType });
    this.blurRT = new THREE.WebGLRenderTarget(hw, hh, { type: THREE.HalfFloatType });
    const dofU = () => ({
      cameraNear: { value: 0.1 }, cameraFar: { value: 100 }, focusDistance: { value: 5 }, aperture: { value: 0 },
      maxBlur: { value: 14 }, pxScale: { value: this.pxScale },
    });
    const fsMat = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: FULLSCREEN_VERT, fragmentShader: frag, depthTest: false, depthWrite: false, uniforms });
    this.prepMat = fsMat(DOF_PREP_FRAG, { ...dofU(), tColor: { value: this.sceneRT.texture }, tDepth: { value: depthTexture }, fullRes: { value: new THREE.Vector2(width, height) } });
    this.blurMat = fsMat(DOF_BLUR_FRAG, { tPrep: { value: this.prepRT.texture }, halfRes: { value: new THREE.Vector2(hw, hh) }, maxBlur: { value: 14 }, pxScale: { value: this.pxScale } });
    this.dofMat = fsMat(DOF_COMP_FRAG, { ...dofU(), tColor: { value: this.sceneRT.texture }, tDepth: { value: depthTexture }, tBlur: { value: this.blurRT.texture }, enabled: { value: 1 } });
    this.prepScene = new THREE.Scene(); this.prepScene.add(new THREE.Mesh(this.quadGeo, this.prepMat));
    this.blurScene = new THREE.Scene(); this.blurScene.add(new THREE.Mesh(this.quadGeo, this.blurMat));
    this.gradeMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT, fragmentShader: GRADE_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tColor: { value: this.dofRT.texture }, resolution: { value: new THREE.Vector2(width, height) },
        exposure: { value: 1 }, whiteBalance: { value: new THREE.Vector3(1, 1, 1) },
        lift: { value: new THREE.Vector3(0, 0, 0) }, gamma: { value: new THREE.Vector3(1, 1, 1) }, gain: { value: new THREE.Vector3(1, 1, 1) },
        saturation: { value: 1 }, contrast: { value: 1 }, vignette: { value: 0.35 }, vignetteSoft: { value: 0.45 },
        aberration: { value: 0.8 }, grain: { value: 0.035 }, frame: { value: 0 }, pxScale: { value: this.pxScale },
        fadeBlack: { value: 0 }, fadeColor: { value: new THREE.Vector3(1, 1, 1) }, fadeColorAmt: { value: 0 }, toneMap: { value: 0 },
      },
    });
    this.mixMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT, fragmentShader: MIX_FRAG, depthTest: false, depthWrite: false,
      uniforms: { tA: { value: null }, tB: { value: null }, u: { value: 0 }, mode: { value: 0 }, dipColor: { value: new THREE.Vector3(0, 0, 0) }, whipDir: { value: new THREE.Vector2(1, 0) } },
    });
    this.mixScene = new THREE.Scene(); this.mixScene.add(new THREE.Mesh(this.quadGeo, this.mixMat));
    this.accMat = new THREE.ShaderMaterial({
      vertexShader: FULLSCREEN_VERT, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, transparent: true,
      fragmentShader: 'precision highp float; varying vec2 vUv; uniform sampler2D t; uniform float w; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * w, 1.0); }',
      uniforms: { t: { value: null }, w: { value: 1 } },
    });
    this.accScene = new THREE.Scene(); this.accScene.add(new THREE.Mesh(this.quadGeo, this.accMat));
    this.dofQuad = new THREE.Mesh(this.quadGeo, this.dofMat);
    this.gradeQuad = new THREE.Mesh(this.quadGeo, this.gradeMat);
    this.dofScene = new THREE.Scene(); this.dofScene.add(this.dofQuad);
    this.gradeScene = new THREE.Scene(); this.gradeScene.add(this.gradeQuad);
  }

  /** Render one shot's scene through DOF and bloom into `out` (HDR). */
  renderLayer(scene, camera, look, out) {
    const r = this.renderer;
    this.sceneRT = look.msaa === false ? this.sceneRTplain : this.sceneRTaa;
    this.prepMat.uniforms.tColor.value = this.sceneRT.texture; this.prepMat.uniforms.tDepth.value = this.sceneRT.depthTexture;
    this.dofMat.uniforms.tColor.value = this.sceneRT.texture; this.dofMat.uniforms.tDepth.value = this.sceneRT.depthTexture;
    r.setRenderTarget(this.sceneRT);
    r.setClearColor(scene.background && scene.background.isColor ? scene.background : new THREE.Color(0), 1);
    r.clear(true, true, true);
    r.render(scene, camera);
    const on = !!(look.dof && look.dof.aperture > 0);
    for (const m of [this.prepMat, this.dofMat, this.blurMat]) {
      const d = m.uniforms;
      if (d.cameraNear) { d.cameraNear.value = camera.near; d.cameraFar.value = camera.far; }
      if (on) {
        if (d.focusDistance) { d.focusDistance.value = look.dof.focus; d.aperture.value = look.dof.aperture; }
        d.maxBlur.value = look.dof.maxBlur ?? 14;
      }
    }
    this.dofMat.uniforms.enabled.value = on ? 1 : 0;
    if (on) {
      r.setRenderTarget(this.prepRT); r.render(this.prepScene, this.quadCam);
      r.setRenderTarget(this.blurRT); r.render(this.blurScene, this.quadCam);
    }
    r.setRenderTarget(out);
    r.render(this.dofScene, this.quadCam);
    const b = look.bloom || {};
    if ((b.strength ?? 0.45) > 0) {
      this.bloom.strength = b.strength ?? 0.45;
      this.bloom.radius = b.radius ?? 0.55;
      this.bloom.threshold = b.threshold ?? 0.85;
      this.bloom.render(r, null, out, 0, false);
    }
  }

  /**
   * Render one layer at time t into `out`. layer: { pose(t) -> { scene, camera, look }, mb, shutter }.
   * With mb > 1 the layer is rendered at mb subframes across the shutter and averaged
   * (true motion blur); the centre subframe is rendered last so world state ends at t.
   */
  renderPosedLayer(layer, t, out) {
    const n = Math.max(1, layer.mb || 1);
    if (n === 1) { const f = layer.pose(t); this.renderLayer(f.scene, f.camera, f.look, out); return f.look; }
    const r = this.renderer;
    const shutter = layer.shutter ?? 1 / 60;
    const times = [];
    for (let k = 0; k < n; k++) times.push(t + (k / (n - 1) - 0.5) * shutter);
    const mid = times.splice(Math.floor(n / 2), 1)[0]; times.push(mid);
    r.setRenderTarget(out); r.setClearColor(0x000000, 1); r.clear(true, true, true);
    let look = null;
    for (const ts of times) {
      const f = layer.pose(ts);
      look = f.look;
      this.renderLayer(f.scene, f.camera, f.look, this.subRT);
      this.accMat.uniforms.t.value = this.subRT.texture; this.accMat.uniforms.w.value = 1 / n;
      r.setRenderTarget(out); r.autoClear = false; r.render(this.accScene, this.quadCam); r.autoClear = true;
    }
    return look;
  }

  /**
   * layers: one layer, or two during a transition (outgoing, incoming).
   * transition: { type: 'dissolve'|'dip'|'whip', u, color?, dir? }
   * look: { exposure, whiteBalance:[r,g,b], lift, gamma, gain, saturation, contrast,
   *         vignette, vignetteSoft, aberration, grain, fadeBlack, fadeColor, fadeColorAmt,
   *         bloom:{strength,radius,threshold}, dof:{focus, aperture, maxBlur} | null, toneMap:'agx'|'aces', msaa }
   * afterRender(): called after the scene layers, before the overlay (to update anchored text).
   */
  render(layers, t, frameIndex, overlay, transition, afterRender) {
    const r = this.renderer;
    const u = this.gradeMat.uniforms;
    let look;
    if (layers.length === 1) {
      look = this.renderPosedLayer(layers[0], t, this.dofRT);
      u.tColor.value = this.dofRT.texture;
    } else {
      const [A, B] = layers;
      const la = this.renderPosedLayer(A, t, this.dofRT);
      const lb = this.renderPosedLayer(B, t, this.dofRT2);
      const m = this.mixMat.uniforms;
      m.tA.value = this.dofRT.texture; m.tB.value = this.dofRT2.texture; m.u.value = transition.u;
      m.mode.value = transition.type === 'dip' ? 1 : transition.type === 'whip' ? 2 : 0;
      if (transition.color) m.dipColor.value.set(...transition.color);
      if (transition.dir) m.whipDir.value.set(...transition.dir);
      r.setRenderTarget(this.mixRT);
      r.render(this.mixScene, this.quadCam);
      u.tColor.value = this.mixRT.texture;
      look = blendLooks(la, lb, transition.type === 'whip' || transition.type === 'dip' ? (transition.u < 0.5 ? 0 : 1) : transition.u);
    }
    if (afterRender) afterRender();
    const set = (k, v) => { if (v !== undefined) { if (Array.isArray(v)) u[k].value.set(...v); else u[k].value = v; } };
    set('exposure', look.exposure ?? 1); set('whiteBalance', look.whiteBalance ?? [1, 1, 1]);
    set('lift', look.lift ?? [0, 0, 0]); set('gamma', look.gamma ?? [1, 1, 1]); set('gain', look.gain ?? [1, 1, 1]);
    set('saturation', look.saturation ?? 1); set('contrast', look.contrast ?? 1);
    set('vignette', look.vignette ?? 0.35); set('vignetteSoft', look.vignetteSoft ?? 0.45);
    set('aberration', look.aberration ?? 0.8); set('grain', look.grain ?? 0.035);
    set('fadeBlack', look.fadeBlack ?? 0); set('fadeColor', look.fadeColor ?? [1, 1, 1]); set('fadeColorAmt', look.fadeColorAmt ?? 0);
    u.toneMap.value = look.toneMap === 'aces' ? 1 : 0;
    u.frame.value = frameIndex % 997;
    r.setRenderTarget(null);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);
    r.render(this.gradeScene, this.quadCam);
    if (overlay) {
      r.autoClear = false;
      r.clearDepth();
      r.render(overlay.scene, overlay.camera);
      r.autoClear = true;
    }
  }
}

const NUM_KEYS = ['exposure', 'saturation', 'contrast', 'vignette', 'vignetteSoft', 'aberration', 'grain', 'fadeBlack', 'fadeColorAmt'];
const VEC_KEYS = ['whiteBalance', 'lift', 'gamma', 'gain', 'fadeColor'];
const DEFAULTS = { exposure: 1, saturation: 1, contrast: 1, vignette: 0.35, vignetteSoft: 0.45, aberration: 0.8, grain: 0.035, fadeBlack: 0, fadeColorAmt: 0, whiteBalance: [1, 1, 1], lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1], fadeColor: [1, 1, 1] };

/** Interpolate the grade parameters of two looks. */
export function blendLooks(a, b, w) {
  const out = { toneMap: w < 0.5 ? a.toneMap : b.toneMap };
  for (const k of NUM_KEYS) out[k] = (a[k] ?? DEFAULTS[k]) * (1 - w) + (b[k] ?? DEFAULTS[k]) * w;
  for (const k of VEC_KEYS) { const x = a[k] ?? DEFAULTS[k], y = b[k] ?? DEFAULTS[k]; out[k] = x.map((v, i) => v * (1 - w) + y[i] * w); }
  return out;
}
