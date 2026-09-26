// The dollhouse: the game's room paintings as the back walls of real 3D
// shadow boxes, arranged in a grid (rows bottom to top), wrapped in a timber
// shell with a gabled shingle roof, a brick chimney and a stone plinth. The
// front is open (cutaway) so the camera can glide into any room.

import * as THREE from 'three';
import { loadTexture } from '../core/assets.js';
import { mulberry32 } from '../core/math.js';

/** Painted floor line of each room (fraction of image height from the bottom). */
export const FLOOR_LINE = {
  cozy_den: 0.2, kitchen: 0.14, study: 0.14, aquarium: 0.12, jungle: 0.12, desert: 0.16,
  office: 0.16, burrow: 0.16, garden: 0.14, bamboo: 0.14, observatory: 0.14, rainforest: 0.14,
};

/** Rooms that have a window-sky mask in assets/rooms/windows (never the workshop). */
export const WINDOW_MASKS = ['cozy_den', 'kitchen', 'study', 'office', 'garden', 'desert', 'jungle', 'observatory', 'rainforest'];

/** Painted frame border of the room art, cropped in the UVs (fraction of width / height). */
const BORDER_U = 0.014, BORDER_V = 0.028;

/**
 * Painted lamps and fires that get an additive glow card at dusk: [u, v from bottom, size],
 * in the painting plane's uv (the art with its frame border cropped). Measured on the art:
 * each card sits on the painted light itself, never on an empty patch of wall (the Star Loft's
 * lantern stands on the stool left of the cushion; the bamboo lantern hangs dead centre).
 */
export const LAMPS = {
  cozy_den: [[0.22, 0.37, 1.1], [0.855, 0.75, 0.9]],
  kitchen: [[0.15, 0.85, 0.9], [0.91, 0.40, 1.0]],
  office: [[0.41, 0.555, 0.8]],
  burrow: [[0.86, 0.44, 0.8]],
  garden: [[0.49, 0.83, 0.8]],
  bamboo: [[0.50, 0.81, 0.8]],
  observatory: [[0.291, 0.40, 0.8]],
  rainforest: [[0.794, 0.72, 0.8]],
};

/**
 * Per-room window looks, painted into the glass itself (the painting's own shader, under
 * the painting's own light) instead of the unlit dusk tint laid over it: [colour, amount]
 * by day and at dusk, mixed into the glass's albedo through the room's window mask.
 * - The Star Loft's two round portholes sit side by side above a curved cushion and read as
 *   a pair of eyes in every wide, so the two panes never match: by day the left one takes a
 *   light warm wash (the afternoon sun on its glass) while the right stays clear, and at dusk
 *   their painted sky is pulled most of the way to a tone just above the wall's value (never
 *   dark: both stay above luma 40), the left warm and lamp-lit (the lantern is below it), the
 *   right (`right` of `split` in the art's u) a cooler, dimmer mauve. Ivy grows over the right
 *   one's lower-left rim (starLoftIvy). An unlit overlay could not do this: the lamp-lit sky
 *   under it stayed pale however strong the tint.
 * - The Sky Garden's painted rain would read as a storm: the glass is always softened
 *   (`blur`, uv steps across and down) and veiled, a pale mist by day and a light dusk tint,
 *   so the forest still shows through. `cut` stops the mask at the glass's lower edge (v from
 *   the art's bottom): the mask PNG also covers the leaf pillows below, which the app ships
 *   and which are never edited, so the cut is done here.
 */
const WINDOW_LOOK = {
  observatory: { day: ['#F4DDB0', 0.3], dusk: ['#7A5244', 0.85], right: { day: ['#54383F', 0], dusk: ['#54383F', 0.95] }, split: 0.512 },
  rainforest: { day: ['#C6DCCF', 0.15], dusk: ['#B5623C', 0.3], blur: [0.0012, 0.0025], cut: 0.4833 },
};

// The painting's glass look (WINDOW_LOOK). Every painting shares one program; rooms without
// a look skip it on a uniform branch. The same sample feeds the emissive map (the same texture).
const GLASS_UNIFORMS = 'uniform float uGlassOn; uniform sampler2D uGlassMask; uniform vec3 uGlassTint; uniform float uGlassAmt; uniform vec2 uGlassBlur; uniform float uGlassCut; uniform vec3 uGlassTint2; uniform float uGlassAmt2; uniform float uGlassSplit;';
const GLASS_MAP_FRAGMENT = `
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  if ( uGlassOn > 0.5 ) {
    // the mask, grown by about a mask texel and hardened: its soft edge used to leave a thin
    // crescent of untouched bright sky around the glass (a catchlight on each porthole)
    vec2 mt = vec2( 1.3 / 400.0, 1.3 / 198.0 );
    float gm = texture2D( uGlassMask, vMapUv ).a;
    gm = max( gm, texture2D( uGlassMask, vMapUv + vec2( mt.x, mt.y ) ).a );
    gm = max( gm, texture2D( uGlassMask, vMapUv + vec2( -mt.x, mt.y ) ).a );
    gm = max( gm, texture2D( uGlassMask, vMapUv + vec2( mt.x, -mt.y ) ).a );
    gm = max( gm, texture2D( uGlassMask, vMapUv + vec2( -mt.x, -mt.y ) ).a );
    gm = smoothstep( 0.02, 0.45, gm ) * step( uGlassCut, vMapUv.y );
    vec4 gc = sampledDiffuseColor;
    if ( uGlassBlur.x > 0.0 ) {
      vec4 acc = vec4( 0.0 );
      for ( int i = -4; i <= 4; i++ ) {
        for ( int j = -1; j <= 1; j++ ) acc += texture2D( map, vMapUv + vec2( float( i ), float( j ) ) * uGlassBlur );
      }
      gc = acc / 27.0;
    }
    bool rightPane = vMapUv.x > uGlassSplit;
    gc.rgb = mix( gc.rgb, rightPane ? uGlassTint2 : uGlassTint, rightPane ? uGlassAmt2 : uGlassAmt );
    sampledDiffuseColor = mix( sampledDiffuseColor, gc, gm );
  }
  diffuseColor *= sampledDiffuseColor;
`;

let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

/** Procedural pixel-wood texture (tileable plank grain). */
export function pixelWood({ seed = 3, base = '#6e4a2e', size = 64, planks = 4, vertical = false } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  const col = new THREE.Color(base);
  const shade = (k) => { const x = col.clone(); x.offsetHSL(0, 0, k); return '#' + x.getHexString(); };
  const ph = size / planks;
  for (let p = 0; p < planks; p++) {
    g.fillStyle = shade((rnd() - 0.5) * 0.06); g.fillRect(0, p * ph, size, ph);
    for (let k = 0; k < size * 1.5; k++) {
      g.fillStyle = shade((rnd() - 0.6) * 0.09);
      g.fillRect(Math.floor(rnd() * size), Math.floor(p * ph + 1 + rnd() * (ph - 2)), 2 + Math.floor(rnd() * 6), 1);
    }
    g.fillStyle = shade(-0.12); g.fillRect(0, p * ph, size, 1);
    if (rnd() < 0.5) { g.fillStyle = shade(-0.1); g.fillRect(Math.floor(rnd() * size), p * ph, 1, ph); }
  }
  let src = c;
  if (vertical) {
    const v = document.createElement('canvas'); v.width = v.height = size;
    const vg = v.getContext('2d'); vg.translate(size / 2, size / 2); vg.rotate(Math.PI / 2); vg.drawImage(c, -size / 2, -size / 2); src = v;
  }
  const t = new THREE.CanvasTexture(src);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8;
  return t;
}

/**
 * A pixel-art texture from RGBA rows (top row first): crisp when magnified, mipmapped when
 * shown small. A DataTexture keeps the colour of transparent texels (a canvas would zero
 * them), which is what stops a pale fringe bleeding in at a cut-out edge.
 */
function pixelDataTexture(rgba, w, h) {
  const flipped = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) flipped.set(rgba.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
  const t = new THREE.DataTexture(flipped, w, h, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true; t.anisotropy = 8; t.needsUpdate = true;
  return t;
}

/**
 * roof.png with its alpha fringe cleaned: the art was matted on white, so the translucent
 * texels along its silhouette (the eave's bottom edge above all) carry near-white colour.
 * Filtering pulls that colour into the cut-out edge as a pale dashed line under the eave.
 * Every texel below `solid` alpha takes the colour of its opaque neighbours instead (grown
 * outward a few texels); alpha is untouched, so the silhouette is the painter's own.
 */
function cleanFringe(img, { solid = 200, grow = 6 } = {}) {
  const w = img.width, h = img.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, w, h).data;
  const ok = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) ok[i] = d[i * 4 + 3] >= solid ? 1 : 0;
  for (let pass = 0; pass < grow; pass++) {
    const next = ok.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (ok[i]) continue;
        let r = 0, gg = 0, b = 0, n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const j = yy * w + xx;
            if (!ok[j]) continue;
            r += d[j * 4]; gg += d[j * 4 + 1]; b += d[j * 4 + 2]; n++;
          }
        }
        if (n) { d[i * 4] = r / n; d[i * 4 + 1] = gg / n; d[i * 4 + 2] = b / n; next[i] = 1; }
      }
    }
    ok.set(next);
  }
  // texels no neighbour reached are far outside the silhouette: the house ink, never white
  for (let i = 0; i < w * h; i++) if (!ok[i]) { d[i * 4] = 0x3b; d[i * 4 + 1] = 0x24; d[i * 4 + 2] = 0x16; }
  return pixelDataTexture(new Uint8Array(d.buffer), w, h);
}

/**
 * foundation_0.png as a seamless strip: the art is one slab with rounded ends and notches
 * between the top stones, so repeating it left wedge-shaped holes at every seam (the ground
 * and sky showed through the plinth). The tile is cut joint to joint (x 85-652: both ends
 * fall on a top-course joint, and the lower course's partial stones meet as one stone of
 * the usual width), and the stone band is backed with mortar so no gap can open. The grass
 * tufts along the bottom are backed with shaded grass roots: between the tufts the plinth
 * used to show the bright ground inside its own footprint as a pale band.
 */
function foundationStrip(img, { x0 = 85, x1 = 652, band = 100, mortar = '#46382a', roots = '#394322' } = {}) {
  const w = x1 - x0, h = img.height;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = mortar; g.fillRect(0, 0, w, band);
  g.fillStyle = roots; g.fillRect(0, band, w, h - band);
  g.drawImage(img, x0, 0, w, h, 0, 0, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8;
  return { tex: t, aspect: w / h };
}

/** A pointed pixel leaf (base b, direction a in degrees with y up, length L, width W; art px). */
function leafPixels(put, b, a, L, W, pal) {
  const ca = Math.cos(a * Math.PI / 180), sa = -Math.sin(a * Math.PI / 180); // canvas y runs down
  const inside = (x, y) => {
    const dx = x - b[0], dy = y - b[1];
    const s = dx * ca + dy * sa, t = -dx * sa + dy * ca;
    if (s < 0 || s > L) return null;
    const half = (W / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, s / L * 0.92 + 0.04)), 0.75);
    return Math.abs(t) <= half ? { s, t, half } : null;
  };
  const r = Math.ceil(L + W);
  for (let y = Math.floor(b[1] - r); y <= b[1] + r; y++) {
    for (let x = Math.floor(b[0] - r); x <= b[0] + r; x++) {
      const p = inside(x + 0.5, y + 0.5);
      if (!p) continue;
      const edge = !inside(x + 1.5, y + 0.5) || !inside(x - 0.5, y + 0.5) || !inside(x + 0.5, y + 1.5) || !inside(x + 0.5, y - 0.5);
      if (edge) { put(x, y, pal.outline); continue; }
      // lit from the upper left (the room's window light): the half of the blade facing up is lighter
      const up = -p.t * Math.sign(ca || 1) > 0;
      if (Math.abs(p.t) < 0.55 && p.s > L * 0.12 && p.s < L * 0.8) put(x, y, pal.rib);
      else if (up && Math.abs(p.t) > p.half * 0.55 && p.s > L * 0.25 && p.s < L * 0.7) put(x, y, pal.hl);
      else put(x, y, up ? pal.light : pal.mid);
    }
  }
}

/**
 * A sprig of ivy for the Star Loft, in the room's own pixel style (one art pixel = 0.0225
 * units, about four painting pixels): it grows out from behind the RIGHT porthole's frame
 * low on its left, follows the ring round its lower-left quarter and spills a few backlit
 * leaves onto the glass. Two equal round windows side by side above a curved cushion read
 * as a face at a glance; one leafy rim makes them two different windows. Returns the card
 * in room-local units (drawn over the painting, lit like it).
 */
function starLoftIvy() {
  const px = 0.0225, X0 = -0.1, Y1 = 2.96, W = 54, H = 58;
  const rgba = new Uint8Array(W * H * 4);
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const put = (x, y, col) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4; const c = hex(col);
    rgba[i] = c[0]; rgba[i + 1] = c[1]; rgba[i + 2] = c[2]; rgba[i + 3] = 255;
  };
  const toPx = ([x, y]) => [(x - X0) / px, (Y1 - y) / px];
  // the right porthole, room-local: centre (1.02, 2.75), glass radius 0.75, frame 0.75-0.89
  const C = [1.02, 2.75];
  const at = (deg, r) => [C[0] + r * Math.cos(deg * Math.PI / 180), C[1] + r * Math.sin(deg * Math.PI / 180)];
  // ivy grows out from behind the frame low on its left and follows the ring up to about
  // eight o'clock, with one tendril curling a little way onto the glass
  const stems = [
    [262, 254, 246, 238, 230, 222, 214, 206, 198, 190].map((d) => at(d, 0.81)),
    [230, 227, 225, 224, 224, 226].map((d, k) => at(d, 0.81 - k * 0.075)),
  ].map((s) => s.map(toPx));
  const line = (pts, col, brush) => {
    for (let k = 1; k < pts.length; k++) {
      const [ax, ay] = pts[k - 1], [bx, by] = pts[k];
      const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 2);
      for (let q = 0; q <= n; q++) {
        const x = ax + (bx - ax) * q / n, y = ay + (by - ay) * q / n;
        for (const [ox, oy] of brush) put(Math.floor(x + ox), Math.floor(y + oy), col);
      }
    }
  };
  // the painting's own leaf greens (sampled from the loft's hanging vines), a touch brighter
  // so the sprig holds its shape at the size of a wide shot
  const pal = { outline: '#1c2811', mid: '#557a26', light: '#79a036', hl: '#a3c653', rib: '#3a5a1c' };
  for (const s of stems) line(s, '#2a2412', [[0, 0], [1, 0], [0, 1], [1, 1], [-1, 0], [0, -1]]);
  for (const s of stems) line(s, '#7b7a2c', [[0, 0]]);
  // [angle on the ring, radius, leaf direction, length, width]: alternately out over the
  // wall and in over the glass's lower-left edge
  const leaves = [
    [260, 0.81, 250, 0.2, 0.11], [252, 0.81, 236, 0.22, 0.12], [236, 0.81, 214, 0.24, 0.13], [219, 0.81, 196, 0.23, 0.12],
    [203, 0.81, 160, 0.22, 0.12], [192, 0.81, 128, 0.2, 0.11],
    [256, 0.78, 80, 0.24, 0.13], [246, 0.78, 70, 0.28, 0.15], [229, 0.77, 42, 0.3, 0.16], [212, 0.78, 18, 0.27, 0.14], [197, 0.79, 4, 0.22, 0.12],
    [222, 0.62, 58, 0.2, 0.12], [236, 0.6, 88, 0.2, 0.11],
    [220, 0.5, 20, 0.2, 0.12], [232, 0.47, 70, 0.21, 0.12], [225, 0.44, 40, 0.16, 0.1],
  ];
  for (const [d, r, a, L, Wd] of leaves) leafPixels(put, toPx(at(d, r)), a, L / px, Wd / px, pal);
  const tex = pixelDataTexture(rgba, W, H);
  return { tex, x: X0 + W * px / 2, y: Y1 - H * px / 2, w: W * px, h: H * px };
}

/**
 * A half-drawn curtain over the Star Loft's LEFT porthole, in the room's pixel style
 * (one art pixel = 0.0225 units). Two equal round windows above a round cushion read as
 * a face in a wide; a cloth panel gathered at a tieback leaves the left window a
 * lopsided crescent, so the pair is gone at any size and in any light. Room-local card.
 */
function starLoftCurtain() {
  const px = 0.0225, X0 = -1.95, X1 = 0.05, Y0 = 1.8, Y1 = 3.84;
  const W = Math.round((X1 - X0) / px), H = Math.round((Y1 - Y0) / px);
  const rgba = new Uint8Array(W * H * 4);
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const put = (i, j, col) => {
    if (i < 0 || j < 0 || i >= W || j >= H) return;
    const o = (j * W + i) * 4; const c = hex(col);
    rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255;
  };
  const ROD_Y = 3.72, OUT = -1.8, TIE_Y = 2.5, BOTTOM = 1.9;
  // the panel's inner edge: from the rod it sweeps across the glass, gathers at the tieback, then flares a little
  const inner = (y) => {
    if (y >= TIE_Y) { const k = (ROD_Y - y) / (ROD_Y - TIE_Y); return -0.42 + (-1.36 + 0.42) * (1 - (1 - k) * (1 - k)); }
    const k = (TIE_Y - y) / (TIE_Y - BOTTOM); return -1.36 + 0.2 * k;
  };
  const pal = { dark: '#5e4424', mid: '#9a7440', light: '#c19a55', hl: '#dcbc74', star: '#f1dc93', edge: '#3b2416', tie: '#7a3b2c', tieHi: '#a45a3f', rod: '#4a2f1c', rodHi: '#7a5230' };
  for (let j = 0; j < H; j++) {
    const y = Y1 - (j + 0.5) * px;
    if (y > ROD_Y || y < BOTTOM) continue;
    const xin = inner(y), w = xin - OUT;
    for (let i = 0; i < W; i++) {
      const x = X0 + (i + 0.5) * px;
      if (x < OUT || x > xin) continue;
      // five soft folds across the panel's width, lit from the window side (the right)
      const f = ((x - OUT) / w) * 5;
      const ph = f - Math.floor(f);
      let col = ph < 0.22 ? pal.dark : ph < 0.55 ? pal.mid : ph < 0.85 ? pal.light : pal.hl;
      if (xin - x < px * 1.5 || y - BOTTOM < px * 1.5 || x - OUT < px * 1.2) col = pal.edge;
      // a sparse sprinkle of little stars (it is the star loft)
      else if ((i * 7 + j * 13) % 41 === 0 && ph > 0.3) col = pal.star;
      put(i, j, col);
    }
  }
  // the tieback: a rust band around the gathered cloth, with a highlight
  for (let j = 0; j < H; j++) {
    const y = Y1 - (j + 0.5) * px;
    if (Math.abs(y - TIE_Y) > px * 2.2) continue;
    for (let i = 0; i < W; i++) {
      const x = X0 + (i + 0.5) * px;
      if (x < OUT - px || x > inner(y) + px * 1.5) continue;
      put(i, j, Math.abs(y - TIE_Y) < px * 0.8 ? pal.tieHi : pal.tie);
    }
  }
  // the rod with two knob finials
  for (let j = 0; j < H; j++) {
    const y = Y1 - (j + 0.5) * px;
    for (let i = 0; i < W; i++) {
      const x = X0 + (i + 0.5) * px;
      const onRod = Math.abs(y - ROD_Y - px) < px * 1.3 && x > OUT - 0.06 && x < 0.0;
      const knob = (Math.hypot(x - (OUT - 0.08), y - ROD_Y - px) < 0.05) || (Math.hypot(x - 0.02, y - ROD_Y - px) < 0.05);
      if (onRod || knob) put(i, j, y > ROD_Y + px * 1.2 ? pal.rodHi : pal.rod);
    }
  }
  const tex = pixelDataTexture(rgba, W, H);
  return { tex, x: (X0 + X1) / 2, y: (Y0 + Y1) / 2, w: W * px, h: H * px };
}

/** Procedural pixel shingles in the roof art's palette. */
function pixelShingles(seed = 9) {
  const size = 64;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const rnd = mulberry32(seed);
  const tones = ['#9c4a44', '#a9544c', '#8d3f3a', '#b35d53', '#944640'];
  g.fillStyle = '#6e2f2c'; g.fillRect(0, 0, size, size);
  const rows = 5, rh = size / rows, sw = 16;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * sw / 2;
    for (let x = -sw; x < size + sw; x += sw) {
      g.fillStyle = tones[Math.floor(rnd() * tones.length)];
      g.fillRect(Math.round(x + off + 1), Math.round(r * rh), sw - 2, Math.round(rh) - 1);
      g.fillStyle = 'rgba(255,220,200,0.18)'; g.fillRect(Math.round(x + off + 1), Math.round(r * rh), sw - 2, 1);
      g.fillStyle = 'rgba(40,10,10,0.35)'; g.fillRect(Math.round(x + off + 1), Math.round(r * rh + rh - 2), sw - 2, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 8;
  return t;
}

/**
 * layout: rows bottom to top, e.g. [['burrow','cozy_den','kitchen'], [...]]; null = empty frame.
 * roomW: width of one room (height follows the painting's 1456x720 aspect).
 * Returns { group, rooms: {id: {...}}, slots: [[{x,y,id}]], width, height, roof, chimneyTop, setLight(...) }
 */
export async function buildHouse(layout, { roomW = 8, roomD = 3.2, post = 0.34, slab = 0.34, roof = true, foundation = true } = {}) {
  const roomH = roomW * 720 / 1456;
  const cols = Math.max(...layout.map((r) => r.length));
  const width = cols * roomW + (cols + 1) * post;
  const floorH = roomH + slab;
  const height = layout.length * floorH + slab;
  const group = new THREE.Group();
  const woodTex = pixelWood({ base: '#6b4629', planks: 4 });
  const woodV = pixelWood({ base: '#6b4629', planks: 4, vertical: true, seed: 5 });
  const mk = (tex, rx, ry, color = '#ffffff') => { const t = tex.clone(); t.needsUpdate = true; t.repeat.set(rx, ry); return new THREE.MeshStandardMaterial({ map: t, color, roughness: 0.82 }); };
  const innerMat = new THREE.MeshStandardMaterial({ color: '#6e4a31', roughness: 0.9 });
  // the back of an unbuilt room: fresh horizontal pine boards, lighter than every finished
  // timber in the house, so a frame reads as a room waiting to be built (a dark vertical
  // board read as the back of a bookcase)
  const pineTex = pixelWood({ base: '#d9b27f', planks: 4, seed: 11 });
  const rooms = {};
  const slots = [];

  const lampTex = glowTexture();
  for (let r = 0; r < layout.length; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const id = layout[r][c] ?? null;
      const x = -width / 2 + post + c * (roomW + post) + roomW / 2;
      const y = slab + r * floorH;
      row.push({ x, y, id });
      const g = new THREE.Group();
      g.position.set(x, y, 0);
      group.add(g);
      // an empty frame: raw pine boards at the back, nothing else
      const emptyG = new THREE.Group();
      const board = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), mk(pineTex, roomW / 2.4, roomH / 1.6, '#fff2e0'));
      // a little warm self-light keeps the boards reading as pine in the shade (the sky fill alone greys them)
      board.material.emissive = new THREE.Color('#ffc890'); board.material.emissiveMap = board.material.map; board.material.emissiveIntensity = 0.15;
      // (where a painting would hang: the shell's back face is 0.02 behind, never coplanar with it)
      board.position.set(0, roomH / 2, -roomD / 2); board.receiveShadow = true; emptyG.add(board);
      g.add(emptyG);
      // a built room: floor, side returns, painting, window tint, lamp, glow cards
      const builtG = new THREE.Group();
      g.add(builtG);
      // the same boards behind the painting: while a room is being built (its painting not
      // yet up, or unrolling at the drop) its back wall is still the raw pine, not the shell
      // (pushed back in depth, so at any distance the painting wins and the shell never shows)
      const behindMat = board.material.clone(); behindMat.polygonOffset = true; behindMat.polygonOffsetFactor = 1; behindMat.polygonOffsetUnits = 4;
      const boardBehind = new THREE.Mesh(board.geometry, behindMat);
      boardBehind.position.set(0, roomH / 2, -roomD / 2 - 0.01); boardBehind.receiveShadow = true; builtG.add(boardBehind);
      const returns = [];
      for (const sd of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.PlaneGeometry(roomD, roomH), innerMat);
        w.position.set(sd * roomW / 2, roomH / 2, 0); w.rotation.y = -sd * Math.PI / 2; w.receiveShadow = true; builtG.add(w);
        returns.push(w);
      }
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), mk(woodTex, roomW / 1.6, roomD / 1.6, '#c79a72'));
      floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.003, 0); floor.receiveShadow = true; builtG.add(floor);
      if (!id) {
        rooms[`empty_${r}_${c}`] = { group: g, builtG, emptyG, x, y, roomW, roomH, roomD, row: r, col: c, empty: true, lamps: [] };
        builtG.visible = false;
        continue;
      }
      const tex0 = await loadTexture(`rooms/${id}.webp`, { pixel: true });
      // crop the painted frame border (the house's timber frames the room instead)
      const tex = tex0.clone(); tex.needsUpdate = true; tex.repeat.set(1 - 2 * BORDER_U, 1 - 2 * BORDER_V); tex.offset.set(BORDER_U, BORDER_V);
      const mat = new THREE.MeshStandardMaterial({ map: tex, emissive: new THREE.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.62, roughness: 1, metalness: 0 });
      const reveal = { value: 1 };
      const windowLook = WINDOW_LOOK[id] || null;
      // the glass look (WINDOW_LOOK): off for most rooms; the mask is set once it has loaded
      const glass = {
        uGlassOn: { value: 0 }, uGlassMask: { value: tex }, uGlassTint: { value: new THREE.Color() }, uGlassAmt: { value: 0 },
        uGlassBlur: { value: new THREE.Vector2(...(windowLook?.blur ?? [0, 0])) }, uGlassCut: { value: windowLook?.cut ?? -1 },
        uGlassTint2: { value: new THREE.Color() }, uGlassAmt2: { value: 0 }, uGlassSplit: { value: windowLook?.split ?? 2 },
      };
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uReveal = reveal;
        Object.assign(sh.uniforms, glass);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vRUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvRUv = uv;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vRUv;\nuniform float uReveal;\n' + GLASS_UNIFORMS)
          .replace('#include <map_fragment>', GLASS_MAP_FRAGMENT)
          .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= sampledDiffuseColor.rgb; // emissiveMap is the same texture as map')
          .replace('#include <dithering_fragment>', '#include <dithering_fragment>\nif (uReveal < 0.999) { float edge = 1.0 - uReveal; if (vRUv.y < edge) discard; float seam = 1.0 - smoothstep(0.0, 0.03, vRUv.y - edge); gl_FragColor.rgb += vec3(1.0, 0.92, 0.7) * seam * 2.5; }');
      };
      mat.customProgramCacheKey = () => 'painting-reveal';
      const painting = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), mat);
      painting.position.set(0, roomH / 2, -roomD / 2); painting.receiveShadow = true; builtG.add(painting);
      let windowMesh = null;
      if (WINDOW_MASKS.includes(id)) {
        const wtex0 = await loadTexture(`rooms/windows/${id}.png`);
        const wtex = wtex0.clone(); wtex.needsUpdate = true; wtex.repeat.copy(tex.repeat); wtex.offset.copy(tex.offset);
        windowMesh = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), new THREE.MeshBasicMaterial({ map: wtex, color: '#B5623C', transparent: true, opacity: 0, depthWrite: false }));
        windowMesh.position.set(0, roomH / 2, -roomD / 2 + 0.004); builtG.add(windowMesh);
        // the painting samples the untransformed mask at its own (art-space) uv
        if (windowLook) { glass.uGlassMask.value = wtex0; glass.uGlassOn.value = 1; }
      }
      // the Star Loft's ivy, painted over the art and lit exactly like it (it copies the
      // painting's light at draw time, after every shot has set it)
      if (id === 'observatory') {
        const ivy = starLoftIvy();
        const imat = new THREE.MeshStandardMaterial({ map: ivy.tex, emissive: new THREE.Color('#ffffff'), emissiveMap: ivy.tex, emissiveIntensity: 0.62, roughness: 1, metalness: 0, alphaTest: 0.5 });
        const card = new THREE.Mesh(new THREE.PlaneGeometry(ivy.w, ivy.h), imat);
        card.position.set(ivy.x, ivy.y, -roomD / 2 + 0.012); card.receiveShadow = true; builtG.add(card);
        card.onBeforeRender = () => { imat.emissiveIntensity = mat.emissiveIntensity; imat.color.copy(mat.color); };
        const cur = starLoftCurtain();
        const cmat = new THREE.MeshStandardMaterial({ map: cur.tex, emissive: new THREE.Color('#ffffff'), emissiveMap: cur.tex, emissiveIntensity: 0.62, roughness: 1, metalness: 0, alphaTest: 0.5 });
        const ccard = new THREE.Mesh(new THREE.PlaneGeometry(cur.w, cur.h), cmat);
        ccard.position.set(cur.x, cur.y, -roomD / 2 + 0.02); ccard.receiveShadow = true; builtG.add(ccard);
        ccard.onBeforeRender = () => { cmat.emissiveIntensity = mat.emissiveIntensity; cmat.color.copy(mat.color); };
      }
      const light = new THREE.PointLight('#ffb25c', 0, roomW * 1.3, 1.6);
      light.position.set(0, roomH * 0.75, roomD * 0.1); builtG.add(light);
      const lamps = (LAMPS[id] || []).map(([u, v, sz]) => {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: lampTex, color: '#ffb25c', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
        sp.position.set((u - 0.5) * roomW, v * roomH, -roomD / 2 + 0.08);
        const k = (sz || 1) * roomW * 0.16; sp.scale.set(k, k, 1);
        builtG.add(sp);
        return sp;
      });
      rooms[id] = { group: g, builtG, emptyG, painting, mat, reveal, returns, floor, light, lamps, windowMesh, windowLook, glass, x, y, roomW, roomH, roomD, row: r, col: c, floorLine: (FLOOR_LINE[id] ?? 0.15) * roomH, built: true, lampLevel: 0 };
      emptyG.visible = false;
    }
    slots.push(row);
  }

  // timber frame: vertical posts and horizontal slabs across the front
  const postMat = mk(woodV, 0.35, height / 2.4, '#d4a577');
  for (let c = 0; c <= cols; c++) {
    const x = -width / 2 + post / 2 + c * (roomW + post);
    const p = new THREE.Mesh(new THREE.BoxGeometry(post, height, roomD + 0.4), postMat);
    p.position.set(x, height / 2, 0.1); p.castShadow = true; p.receiveShadow = true; group.add(p);
  }
  const slabMat = mk(woodTex, width / 2.4, 0.3, '#d4a577');
  for (let r = 0; r <= layout.length; r++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(width + 0.3, slab, roomD + 0.5), slabMat);
    s.position.set(0, slab / 2 + r * floorH, 0.12); s.castShadow = true; s.receiveShadow = true; group.add(s);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.2), mk(woodV, width / 2, height / 2, '#8a6446'));
  back.position.set(0, height / 2, -roomD / 2 - 0.12); back.castShadow = true; group.add(back);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.2, height, roomD + 0.3), mk(woodV, (roomD + 0.3) / 2, height / 2, '#9a7250'));
    side.position.set(s * (width / 2 + 0.1), height / 2, 0.02); side.castShadow = true; side.receiveShadow = true; group.add(side);
  }

  let roofGroup = null, chimneyTop = null;
  if (roof) {
    roofGroup = new THREE.Group();
    const over = 0.8;
    const rw = width + over * 2, rise = rw * 0.3, depth = roomD + 1.2;
    const shingles = pixelShingles();
    const slopeLen = Math.hypot(rw / 2, rise);
    const ang = Math.atan2(rise, rw / 2);
    for (const s of [-1, 1]) {
      const t = shingles.clone(); t.needsUpdate = true; t.repeat.set(depth / 1.2, slopeLen / 1.2);
      t.center.set(0.5, 0.5); t.rotation = Math.PI / 2;
      const plane = new THREE.Mesh(new THREE.BoxGeometry(slopeLen + 0.3, 0.22, depth), new THREE.MeshStandardMaterial({ map: t, roughness: 0.78 }));
      plane.rotation.z = -s * ang;
      plane.position.set(s * rw / 4, rise / 2 + 0.11 / Math.cos(ang), 0.1);
      plane.castShadow = true; plane.receiveShadow = true;
      roofGroup.add(plane);
    }
    // front gable: the game's roof art, scaled into the triangle (its white matte fringe cleaned)
    const rtex = cleanFringe((await loadTexture('environment/roof.png', { pixel: true })).image);
    const cardW = rw * 0.98, cardH = cardW * 283 / 792;
    const card = new THREE.Mesh(new THREE.PlaneGeometry(cardW, cardH), new THREE.MeshStandardMaterial({ map: rtex, alphaTest: 0.5, roughness: 0.9, emissive: new THREE.Color('#ffffff'), emissiveMap: rtex, emissiveIntensity: 0.25 }));
    card.position.set(0, cardH / 2 - 0.1, depth / 2 + 0.16);
    card.scale.y = (rise + 0.4) / cardH;
    card.position.y = (rise + 0.4) / 2 - 0.1;
    card.castShadow = true;
    roofGroup.add(card);
    const gshape = new THREE.Shape();
    gshape.moveTo(-rw / 2, 0); gshape.lineTo(0, rise); gshape.lineTo(rw / 2, 0); gshape.lineTo(-rw / 2, 0);
    const gable = new THREE.Mesh(new THREE.ExtrudeGeometry(gshape, { depth: depth - 0.4, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: '#7a3632', roughness: 0.85 }));
    gable.position.set(0, 0, -depth / 2 + 0.2); gable.castShadow = true; roofGroup.add(gable);
    // brick chimney: the depth of the chimney painted on roof.png, never a second chimney.
    // The painted one's cap spans px 162-241 of 792 (top at px 14 of 283) and its body
    // px 171-234; the 3D body and cap take exactly that footprint and stand flush behind
    // the card, so a front view sees only the painting and a raised camera sees the painted
    // cap continue into its own top, not a smaller chimney peeking up behind it.
    const pxX = (p) => (p / 792 - 0.5) * cardW, pxY = (p) => (rise + 0.4) * (1 - p / 283) - 0.1;
    const cx = (pxX(162) + pxX(241)) / 2, capW = pxX(241) - pxX(162), bodyW = pxX(234) - pxX(171);
    const capY = pxY(14), bodyD = 1.5, capD = 1.8, capH = 0.6;
    const zf = card.position.z - 0.03; // the front faces, just behind the card
    const cz = zf - bodyD / 2;
    const brick = pixelWood({ base: '#9b5a3c', planks: 8, seed: 21 });
    const bottom = rise * (1 - Math.abs(cx) / (rw / 2)) - 0.6, topY = capY - capH + 0.05;
    const ch = new THREE.Mesh(new THREE.BoxGeometry(bodyW, topY - bottom, bodyD), mk(brick, 1, 2, '#ffffff'));
    ch.position.set((pxX(171) + pxX(234)) / 2, (topY + bottom) / 2, cz); ch.castShadow = true; roofGroup.add(ch);
    const capM = new THREE.Mesh(new THREE.BoxGeometry(capW, capH, capD), new THREE.MeshStandardMaterial({ color: '#d7a877', roughness: 0.9 }));
    capM.position.set(cx, capY - 0.02 - capH / 2, zf - capD / 2); capM.castShadow = true; roofGroup.add(capM);
    roofGroup.position.y = height;
    group.add(roofGroup);
    chimneyTop = new THREE.Vector3(cx, height + capY + 0.2, zf - capD / 2);
  }

  let foundationGroup = null;
  if (foundation) {
    foundationGroup = new THREE.Group();
    const strip = foundationStrip((await loadTexture('environment/foundation_0.png', { pixel: true })).image);
    const fh = 1.2;
    const t = strip.tex; t.repeat.set((width + 0.6) / (fh * strip.aspect), 1);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(width + 0.6, fh, roomD + 0.8), [
      new THREE.MeshStandardMaterial({ color: '#8b8375', roughness: 0.95 }), new THREE.MeshStandardMaterial({ color: '#8b8375', roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: '#6f604e', roughness: 1 }), new THREE.MeshStandardMaterial({ color: '#5a5347', roughness: 1 }),
      new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.4, roughness: 0.95 }), new THREE.MeshStandardMaterial({ color: '#8b8375', roughness: 0.95 }),
    ]);
    plinth.position.set(0, -fh / 2, 0.1); plinth.castShadow = true; plinth.receiveShadow = true;
    foundationGroup.add(plinth);
    group.add(foundationGroup);
  }

  const _c = new THREE.Color();
  return {
    group, rooms, slots, width, height, roomW, roomH, roomD, floorH, roof: roofGroup, chimneyTop,
    /**
     * paint: painted-light multiplier (day 1, dusk >= 0.82); lamps: 0..1 for every room,
     * or a function(roomId) -> 0..1 (lamps switching on in sequence); windowDusk tints painted skies.
     */
    setLight({ paint = 1, lamps = 0, tint = '#ffffff', windowDusk = 0, windowColor = '#B5623C', time = 0 } = {}) {
      for (const [id, rm] of Object.entries(rooms)) {
        if (rm.empty) continue;
        const lv = typeof lamps === 'function' ? lamps(id) : lamps;
        rm.lampLevel = lv;
        rm.mat.emissiveIntensity = 0.62 * paint;
        rm.mat.color.set(tint);
        rm.light.intensity = lv * 7;
        rm.lamps.forEach((sp, i) => { sp.material.opacity = lv * (0.55 + 0.06 * Math.sin(time * 9 + i * 3 + rm.col)); });
        const lk = rm.windowLook;
        if (lk) {
          // a painted-glass look replaces the overlay (see WINDOW_LOOK)
          rm.glass.uGlassTint.value.set(lk.day[0]).lerp(_c.set(lk.dusk[0]), windowDusk);
          rm.glass.uGlassAmt.value = lk.day[1] + (lk.dusk[1] - lk.day[1]) * windowDusk;
          const rt = lk.right || lk;
          rm.glass.uGlassTint2.value.set(rt.day[0]).lerp(_c.set(rt.dusk[0]), windowDusk);
          rm.glass.uGlassAmt2.value = rt.day[1] + (rt.dusk[1] - rt.day[1]) * windowDusk;
          if (rm.windowMesh) { rm.windowMesh.material.opacity = 0; rm.windowMesh.visible = false; }
        } else if (rm.windowMesh) { rm.windowMesh.material.opacity = windowDusk * 0.62; rm.windowMesh.material.color.set(windowColor); }
      }
    },
    /** Show a room as built (true) or as an empty timber frame (false). */
    setBuilt(id, built) {
      const rm = rooms[id];
      if (!rm) return;
      rm.builtG.visible = built; rm.emptyG.visible = !built; rm.built = built;
      if (rm.reveal) rm.reveal.value = 1;
    },
  };
}
