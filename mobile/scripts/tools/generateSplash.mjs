// Draws the two launch images from the game's own painted art:
//
//   assets/splash-icon-android.png  the Android 12+ system splash icon
//   assets/splash.png               the iOS launch-storyboard image
//
// THE MARK IS EMBER'S FACE. Android 12+ (API 31+) gives an app exactly three
// levers for its system splash: one background colour, one circular-masked icon
// drawable, and an optional branding strip expo-splash-screen does not write.
// A full-bleed illustration is impossible there, so whatever we ship has to
// survive as ONE object inside a small circle. The asset this replaces was the
// whole app-icon TILE -- a rounded square with a baked dark border containing a
// fox, two mountains, six pines, two letter tiles and an amber gem -- shrunk to
// 144dp inside that 192dp circle: at that size the scene is mush and a square
// inside a circle reads as a mistake rather than a choice. So the fox's HEAD is
// cut out of that same hand-painted art by colour matte and allowed to fill the
// circle alone, finished the way every other generated icon in this repo is
// finished (one warm-dark contour, one light source at the upper left, a
// directional warm bloom that doubles as contact shading). No tile, no border,
// no drop shadow: a drop shadow is app-icon vocabulary and this is a launch
// screen. The player taps a fox launcher icon, is met by Ember, and lands in
// Ember's cottage -- one identity, three frames.
//
// GEOMETRY (why the numbers are the numbers).
// With no `windowSplashScreenIconBackgroundColor` set -- and the plugin never
// sets one -- Android sizes the splash icon view to 288dp and masks it to a
// 192dp circle. expo-splash-screen contain-fits our PNG into an `imageWidth`
// square and centre-pads that onto the 288dp canvas, so the pinned bound in
// src/__tests__/androidLaunchAssets.test.ts is
//     maxSubjectRadius <= (192 / 2) / imageWidth
// On-screen subject diameter is 2 * maxR * imageWidth, and maxR is capped at
// 96 / imageWidth, so the mark can never exceed 192dp whatever imageWidth is:
// imageWidth only decides how much of the 1024 source canvas is usable. At 200
// the bound is 0.48, i.e. 96% of the canvas is subject, close to the maximum.
// Raising it to 240 would tighten the bound to 0.40 and throw source pixels
// away for exactly the same on-screen size. Hence imageWidth stays 200.
//
// iOS is a separate path (getAndroidSplashConfig spreads `android` over the
// root, so `android.image` shadows `image` for every density key and
// splash.png never reaches Android). The storyboard renders splash.png
// aspect-fit in an `imageWidth`-point square over the named background colour.
// app.json now sets the ROOT imageWidth to 400: unset, getIosSplashConfig falls
// through to `?? 100` and the iOS splash was a 100pt thumbnail that then jumped
// 3.3x into the JS boot screen. At 400 the mark box lands at 200pt -- the same
// 200dp box Android shows and the same 200dp box App.tsx's BootHold renders, so
// Ember does not move or resize across either handoff. That is the whole point
// of the change: the boot screen is a PROGRESSION (the wordmark and the amber
// loader arrive beneath her), not the icon shown twice at two sizes.
//
// splash.png ships with a TRANSPARENT field. The storyboard paints
// SplashScreenBackground behind it, so the old class of bug where this file's
// baked background had to match app.json's hex exactly or `contain`
// letterboxing showed a seam cannot happen. The one background colour is
// #F3E2BF (PARCH.base, the parchment fill of every cottage card and one of the
// two grounds the whole generated icon library was blind-graded on); it lives
// in app.json and in App.tsx's bootStyles, not here.
//
// LAYOUT CONTRACT WITH BootHold. Both surfaces are driven from dp offsets off
// the CENTRE (MARK_BOX_DP / WORDMARK_BOX_DP / WORDMARK_TOP_DP below), never
// from "a gap below the mark box" -- a gap constant is how the two drifted 18pt
// apart in the prototype. If you change one, change the other.
//
// Pure Node + pngjs, no build step, and DETERMINISTIC: no Math.random, no
// Date.now, so `npm run generate:assets` stays byte-reproducible.
//
// Run:  cd mobile && node scripts/tools/generateSplash.mjs
// Blind review sheet (doctrine: grade generated art at its real delivery size,
// unlabelled, on both grounds):
//       WORDSHIFT_SPLASH_REVIEW=/tmp/splash node scripts/tools/generateSplash.mjs
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOBILE = path.resolve(HERE, '..', '..');
const ASSET = (p) => path.join(MOBILE, 'assets', p);

// --------------------------------------------------------------- palette ---
// Lifted from scripts/tools/shopIcons/_draw.mjs so the launch art is drawn in
// the same hand as the rest of the game's generated icons.
const INK = [0x3b, 0x24, 0x16];        // warm near-black contour, never #000
const GLOW_LIT = [0xff, 0xc8, 0x45];   // AMB.hi, where the house light falls
const GLOW_SHADE = [0x8a, 0x4e, 0x18]; // between WOOD.dark and AMB.lo
const BG = [0xf3, 0xe2, 0xbf];         // PARCH.base, review sheet only

// -------------------------------------------------------------- geometry ---
const IMAGE_WIDTH_DP = 200;  // app.json plugins["expo-splash-screen"].android.imageWidth
const CIRCLE_DP = 192;       // the system splash icon container, no icon background
const RADIUS_LIMIT = CIRCLE_DP / 2 / IMAGE_WIDTH_DP; // 0.48, the pinned bound

const MARK = 1024;           // pinned: the test asserts exactly 1024x1024
// Budget, working outwards from her fur, inside that 0.48:
//   fur r=458px, +10px INK contour, +12px amber bloom = 480px = 0.469 of the
//   canvas. On screen: a ~179dp face inside a ~183dp outlined silhouette with
//   the bloom reaching ~188dp, seated in the 192dp circle. Edge to edge without
//   being sliced by the mask, and with real headroom on the assertion.
const FOX_R = 458;
const CONTOUR_PX = 10;       // ~2dp delivered; the contour is what holds a silhouette small
const GLOW_PAD = 12;         // px of warm bloom outside the contour
const CLIP_R = FOX_R + CONTOUR_PX + GLOW_PAD;

// The shared dp layout, in points off the centre of the surface. splash.png
// bakes these at 4px per point (1600px master / 400pt root imageWidth);
// App.tsx's BootHold renders the identical numbers as dp.
const MARK_BOX_DP = IMAGE_WIDTH_DP;  // 200
const WORDMARK_BOX_DP = 234;         // declared width; wordmark.png is exactly 4:1
const WORDMARK_TOP_DP = 94;          // top of the wordmark's DECLARED box, below centre

// ----------------------------------------------------------- png helpers ---
const load = (p) => PNG.sync.read(fs.readFileSync(p));

function save(file, w, h, rgba) {
  const png = new PNG({ width: w, height: h });
  rgba.copy(png.data);
  // colorType 6 (RGBA) through pngjs emits IHDR/IDAT/IEND and nothing else,
  // which is what AAPT2's libpng accepts and what androidLaunchAssets.test.ts
  // asserts (no iCCP, no pHYs, no tEXt).
  fs.writeFileSync(file, PNG.sync.write(png, { colorType: 6 }));
  const kb = (fs.statSync(file).size / 1024).toFixed(1);
  console.log(`wrote ${path.relative(MOBILE, file)} (${w}x${h}, ${kb} KB)`);
}

/** Bilinear sample of a straight-alpha RGBA source. Out of range -> transparent. */
function sample(src, u, v) {
  const { width: w, height: h, data } = src;
  if (u < 0 || v < 0 || u > w - 1 || v > h - 1) return [0, 0, 0, 0];
  const x0 = Math.floor(u), y0 = Math.floor(v);
  const x1 = Math.min(x0 + 1, w - 1), y1 = Math.min(y0 + 1, h - 1);
  const fx = u - x0, fy = v - y0;
  const at = (x, y) => { const i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };
  const a = at(x0, y0), b = at(x1, y0), c = at(x0, y1), d = at(x1, y1);
  const out = [];
  for (let k = 0; k < 4; k++) {
    const top = a[k] + (b[k] - a[k]) * fx;
    const bot = c[k] + (d[k] - c[k]) * fx;
    out[k] = top + (bot - top) * fy;
  }
  return out;
}

// ------------------------------------------------ Ember's head, matted -----
/**
 * She is painted over a busy scene, so the cut is a colour matte rather than an
 * alpha channel. Three signals separate her from everything behind her:
 *   1. her fur is the only strongly warm orange in the frame;
 *   2. her painted band is a dark WARM brown, while the sky is blue and the
 *      mountains, pines and her sweater are green, so every background pixel
 *      has G >= R;
 *   3. her cream is measurably warmer than the clouds (R-G is 13 to 20 on the
 *      muzzle, about 0 on a cloud).
 * Lit and dark are separate tests because extractHead treats them differently.
 */
function isFoxLitColour(r, g, b) {
  if (r <= g || b > g) return false;                             // sky, pines, mountains, sweater
  if (r > 170 && g < 200 && b < 120) return true;                // orange fur
  if (r > 225 && g > 195 && b > 140 && r - g >= 8) return true;  // cream muzzle, brow, inner ear
  return false;
}

function isFoxDarkColour(r, g, b) {
  if (r <= g || b > g) return false;
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;                // warm painted contour, pupil, nostril
}

/** Chebyshev distance to the nearest set pixel, capped at `cap` (cheap BFS). */
function distanceTo(seed, W, H, cap) {
  const dist = new Int32Array(W * H).fill(cap + 1);
  let frontier = [];
  for (let i = 0; i < W * H; i++) if (seed[i]) { dist[i] = 0; frontier.push(i); }
  for (let step = 1; step <= cap && frontier.length; step++) {
    const next = [];
    for (const i of frontier) {
      const x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (dist[j] > step) { dist[j] = step; next.push(j); }
      }
    }
    frontier = next;
  }
  return dist;
}

/** Erode (grow = -1) or dilate (grow = +1) a binary mask by one 3x3 step. */
function morphStep(mask, W, H, grow) {
  const next = mask.slice();
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (grow < 0 ? !mask[i] : mask[i]) continue;
      let hit = false;
      for (let dy = -1; dy <= 1 && !hit; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          const outside = nx < 0 || ny < 0 || nx >= W || ny >= H;
          const on = outside ? 0 : mask[ny * W + nx];
          if (grow < 0 ? !on : on) { hit = true; break; }
        }
      }
      if (hit) next[i] = grow < 0 ? 0 : 1;
    }
  }
  return next;
}

function extractHead() {
  const src = load(ASSET('icon.png'));
  const { width: W, height: H, data } = src;
  const n = W * H;

  // Her lit colours (fur, cream) and, separately, the dark warm band the artist
  // painted around them. Both are hers, but that band is where the silhouette
  // artifact every blind reviewer named independently lives: it runs 24-26px
  // over most of her perimeter and then 37-38px down one stretch of her left
  // ear, which at a quarter of this size inside the old app-icon tile was
  // invisible and as the whole mark reads as a hard vertical ledge. So an
  // outside dark pixel is kept only while it is within OUTLINE_MAX_PX of lit
  // fur: the band is normalised to one weight, the ledge goes with it, and this
  // mark's own uniform CONTOUR_PX contour takes over the job of holding her
  // edge. Her interior is untouched -- the hole fill below restores every dark
  // pixel she encloses (eyes, nose, mouth). Dropping the painted band from the
  // matte ENTIRELY was tried and is much worse: it is what separates her right
  // ear from her brow, so the ear falls off the silhouette.
  const OUTLINE_MAX_PX = 11;
  const lit = new Uint8Array(n);
  const raw = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4, r = data[o], g = data[o + 1], b = data[o + 2];
    if (isFoxLitColour(r, g, b)) { lit[i] = 1; raw[i] = 1; }
    else if (isFoxDarkColour(r, g, b)) raw[i] = 1;
  }
  const fromLit = distanceTo(lit, W, H, OUTLINE_MAX_PX);
  for (let i = 0; i < n; i++) if (raw[i] && !lit[i] && fromLit[i] > OUTLINE_MAX_PX) raw[i] = 0;

  // Largest fox-coloured blob reachable from a seed inside the face. This alone
  // drops the tail, the mittens, the letter tiles and the gem: none of them
  // touch the head.
  const seed = Math.round(0.30 * H) * W + Math.round(0.41 * W);
  if (!raw[seed]) throw new Error('head seed missed the fox');
  let head = new Uint8Array(n);
  const stack = [seed];
  head[seed] = 1;
  while (stack.length) {
    const i = stack.pop();
    const x = i % W, y = (i / W) | 0;
    if (x > 0 && raw[i - 1] && !head[i - 1]) { head[i - 1] = 1; stack.push(i - 1); }
    if (x < W - 1 && raw[i + 1] && !head[i + 1]) { head[i + 1] = 1; stack.push(i + 1); }
    if (y > 0 && raw[i - W] && !head[i - W]) { head[i - W] = 1; stack.push(i - W); }
    if (y < H - 1 && raw[i + W] && !head[i + W]) { head[i + W] = 1; stack.push(i + W); }
  }

  // Fill interior holes (eye whites, catchlights, nose highlights) by flooding
  // the NOT-head region inward from the canvas border: anything the border
  // cannot reach is enclosed by her and is therefore hers.
  const outside = new Uint8Array(n);
  const border = [];
  for (let x = 0; x < W; x++) { border.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { border.push(y * W, y * W + W - 1); }
  const flood = [];
  for (const i of border) if (!head[i] && !outside[i]) { outside[i] = 1; flood.push(i); }
  while (flood.length) {
    const i = flood.pop();
    const x = i % W, y = (i / W) | 0;
    const go = (j) => { if (!head[j] && !outside[j]) { outside[j] = 1; flood.push(j); } };
    if (x > 0) go(i - 1);
    if (x < W - 1) go(i + 1);
    if (y > 0) go(i - W);
    if (y < H - 1) go(i + W);
  }
  for (let i = 0; i < n; i++) if (!outside[i]) head[i] = 1;

  // Silhouette cleanup. The matte is a per-pixel colour test over hand-painted
  // art, so the raw edge carries single-pixel spurs and nicks, plus two 2px
  // artifacts the blind reviewers all named independently: a hard vertical
  // ledge on the outer edge of the left ear and a rectangular stub off the
  // right ear tip. Both are painted into assets/icon.png itself -- at a quarter
  // of this size inside the old tile they were invisible, but as the whole mark
  // they read as a rendering bug. Two symmetric neighbour passes close the
  // 1px noise; a 2px morphological OPEN then CLOSE then removes any protrusion
  // or notch narrower than 2px in every direction, which is what the ledge and
  // the stub are. 2px here is 0.4dp delivered, so the real outline (and the
  // sharpness of the ear tips) does not visibly move.
  for (let pass = 0; pass < 2; pass++) {
    const next = head.slice();
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      let c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        if (head[(y + dy) * W + x + dx]) c++;
      }
      if (head[i] && c <= 2) next[i] = 0;
      if (!head[i] && c >= 7) next[i] = 1;
    }
    head.set(next);
  }
  for (const grow of [-1, -1, 1, 1, 1, 1, -1, -1]) head = morphStep(head, W, H, grow);

  // Colour dilation: push her colours a few pixels past the silhouette so that
  // bilinear sampling at the edge can never drag sky blue into her contour.
  const col = Buffer.alloc(n * 4);
  const filled = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!head[i]) continue;
    filled[i] = 1;
    const o = i * 4;
    col[o] = data[o]; col[o + 1] = data[o + 1]; col[o + 2] = data[o + 2]; col[o + 3] = 255;
  }
  for (let pass = 0; pass < 6; pass++) {
    const add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (filled[i]) continue;
      let r = 0, g = 0, b = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (!filled[ny * W + nx]) continue;
        const j = (ny * W + nx) * 4;
        r += col[j]; g += col[j + 1]; b += col[j + 2]; c++;
      }
      if (c) add.push([i, r / c, g / c, b / c]);
    }
    for (const [i, r, g, b] of add) {
      filled[i] = 1;
      const o = i * 4;
      col[o] = Math.round(r); col[o + 1] = Math.round(g); col[o + 2] = Math.round(b); col[o + 3] = 0;
    }
  }

  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (head[y * W + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { W, H, head, col, bbox: [x0, y0, x1, y1] };
}

/**
 * Where to put her in the mask. The smallest enclosing circle is pinned by
 * three extremes (left ear tip, crown, chin) and leaves the upper half of the
 * circle visibly emptier than the lower; blind reviewers read that as "sits
 * low, dead crescent at the top" every time. So the placement circle is centred
 * on the bounding box instead, which balances her mass in the mask and costs
 * about 5% of her size. Do NOT translate her without also shrinking her: the
 * radius-driving extreme pixel is at her upper left, so a naive upward nudge
 * pushes maxSubjectRadius straight past the pinned 0.48.
 */
function placementCircle(W, head, bbox) {
  const pts = [];
  for (let y = bbox[1]; y <= bbox[3]; y++) for (let x = bbox[0]; x <= bbox[2]; x++) {
    const i = y * W + x;
    if (!head[i]) continue;
    if (head[i - 1] && head[i + 1] && head[i - W] && head[i + W]) continue; // hull candidates only
    pts.push(x + 0.5, y + 0.5);
  }
  const maxR = (ox, oy) => {
    let m = 0;
    for (let k = 0; k < pts.length; k += 2) {
      const d = Math.hypot(pts[k] - ox, pts[k + 1] - oy);
      if (d > m) m = d;
    }
    return m;
  };
  const cx = (bbox[0] + bbox[2] + 1) / 2, cy = (bbox[1] + bbox[3] + 1) / 2;
  return { cx, cy, r: maxR(cx, cy) };
}

// ------------------------------------------------------- the mark itself ---
/**
 * Composite Ember into a square canvas: directional bloom, contour, then her.
 * Every layer is hard-clipped to CLIP_R with a one-pixel analytic band so the
 * pinned radius bound is exact rather than hopeful -- no feathered glow pixel
 * can creep past it, and the test counts a pixel at alpha 1/255 at full weight.
 */
function renderEmber(size, headData, circle) {
  const { W: SW, H: SH, head, col } = headData;
  const scale = FOX_R / circle.r;
  const cx = size / 2, cy = size / 2;
  const colSrc = { width: SW, height: SH, data: col };

  // Silhouette coverage, 3x3 supersampled, plus her colour.
  const cov = new Float64Array(size * size);
  const rgb = new Float64Array(size * size * 3);
  const SS = 3, INV = 1 / (SS * SS);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      let a = 0, r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
        const u = circle.cx + (px - cx) / scale;
        const v = circle.cy + (py - cy) / scale;
        const ux = Math.floor(u), uy = Math.floor(v);
        if (ux < 0 || uy < 0 || ux >= SW || uy >= SH) continue;
        if (!head[uy * SW + ux]) continue;
        const c = sample(colSrc, u, v);
        a += 1; r += c[0]; g += c[1]; b += c[2];
      }
      if (a === 0) continue;
      cov[i] = a * INV;
      rgb[i * 3] = r / a; rgb[i * 3 + 1] = g / a; rgb[i * 3 + 2] = b / a;
    }
  }

  // Distance outside the silhouette, two-pass chamfer: the same field
  // _draw.mjs's withOutline uses to lay its contour.
  const BIG = 1e9;
  const dist = new Float64Array(size * size);
  for (let i = 0; i < size * size; i++) dist[i] = cov[i] > 0.5 ? 0 : BIG;
  const D1 = 1, D2 = Math.SQRT2;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x; let d = dist[i]; if (d === 0) continue;
    if (x > 0) d = Math.min(d, dist[i - 1] + D1);
    if (y > 0) d = Math.min(d, dist[i - size] + D1);
    if (x > 0 && y > 0) d = Math.min(d, dist[i - size - 1] + D2);
    if (x < size - 1 && y > 0) d = Math.min(d, dist[i - size + 1] + D2);
    dist[i] = d;
  }
  for (let y = size - 1; y >= 0; y--) for (let x = size - 1; x >= 0; x--) {
    const i = y * size + x; let d = dist[i]; if (d === 0) continue;
    if (x < size - 1) d = Math.min(d, dist[i + 1] + D1);
    if (y < size - 1) d = Math.min(d, dist[i + size] + D1);
    if (x < size - 1 && y < size - 1) d = Math.min(d, dist[i + size + 1] + D2);
    if (x > 0 && y < size - 1) d = Math.min(d, dist[i + size - 1] + D2);
    dist[i] = d;
  }

  const out = Buffer.alloc(size * size * 4);
  const put = (i, c, a) => {
    if (a <= 0) return;
    const o = i * 4, ia = 1 - a;
    const da = out[o + 3] / 255;
    const na = a + da * ia;
    if (na <= 0) return;
    out[o] = Math.round((c[0] * a + out[o] * da * ia) / na);
    out[o + 1] = Math.round((c[1] * a + out[o + 1] * da * ia) / na);
    out[o + 2] = Math.round((c[2] * a + out[o + 2] * da * ia) / na);
    out[o + 3] = Math.round(na * 255);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const rad = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      const clip = Math.max(0, Math.min(1, CLIP_R - rad + 0.5));
      if (clip <= 0) continue;

      const d = dist[i];
      // The bloom, laid first so the contour sits on top of it. It is
      // DIRECTIONAL: gold where the house light falls (upper left, the one
      // light source every generated icon in this game is lit by) and deep warm
      // brown on the shaded lower right, so the halo doubles as the contact
      // shading that grounds her. A literal cast-shadow ellipse cannot work
      // here -- she already fills the mask circle, so anything drawn below her
      // chin is clipped away. The shaded side is carried deliberately dark: her
      // muzzle and chin are cream and score barely 1.09:1 against the cream
      // ground, so the lower third of her face needs warm light behind the
      // contour or it starts to dissolve at the smallest delivery size.
      if (d < CONTOUR_PX + GLOW_PAD + 1) {
        const g = Math.max(0, d - CONTOUR_PX);
        const t = g / GLOW_PAD;
        const fall = Math.exp(-g / (GLOW_PAD * 0.55)) * Math.max(0, 1 - t * t * t);
        // 0 toward the upper-left light, 1 toward the shaded lower right
        const nx = (x + 0.5 - cx) / FOX_R, ny = (y + 0.5 - cy) / FOX_R;
        const len = Math.max(1e-6, Math.hypot(nx, ny));
        const k = Math.max(0, Math.min(1, (1 - (-nx - ny) / (len * Math.SQRT2)) / 2));
        const tone = [
          GLOW_LIT[0] + (GLOW_SHADE[0] - GLOW_LIT[0]) * k,
          GLOW_LIT[1] + (GLOW_SHADE[1] - GLOW_LIT[1]) * k,
          GLOW_LIT[2] + (GLOW_SHADE[2] - GLOW_LIT[2]) * k,
        ];
        const a = (0.62 + 0.46 * k) * fall;
        if (a > 0.004) put(i, tone, a * clip);
      }
      // The house contour: thick, warm-dark, so the silhouette survives at
      // 144dp on parchment and on ash alike. Her own painted contour is dark
      // over only part of her perimeter (her jaw met her sweater, not sky).
      if (d > 0 && d < CONTOUR_PX + 1) {
        const a = Math.max(0, Math.min(1, CONTOUR_PX + 0.5 - d));
        if (a > 0.004) put(i, INK, a * clip);
      }

      const c = cov[i];
      if (c > 0.002) put(i, [rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]], c * clip);
    }
  }
  return out;
}

// -------------------------------------------------------------- resample ---
/** Area-average resample of a square straight-alpha RGBA buffer. */
function resample(buf, sw, dw) {
  const out = Buffer.alloc(dw * dw * 4);
  const k = sw / dw;
  for (let y = 0; y < dw; y++) for (let x = 0; x < dw; x++) {
    const sx0 = x * k, sx1 = (x + 1) * k, sy0 = y * k, sy1 = (y + 1) * k;
    let r = 0, g = 0, b = 0, a = 0, wsum = 0;
    for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy++) {
      const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
      for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx++) {
        const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
        const wgt = wx * wy; if (wgt <= 0) continue;
        const o = (sy * sw + sx) * 4, al = buf[o + 3] / 255;
        r += buf[o] * al * wgt; g += buf[o + 1] * al * wgt; b += buf[o + 2] * al * wgt;
        a += al * wgt; wsum += wgt;
      }
    }
    const o = (y * dw + x) * 4;
    // Un-premultiplied: React Native and AAPT2 both read straight alpha, and a
    // premultiplied soft edge renders as a dark ghost against a light ground.
    if (a > 1e-9) { out[o] = Math.round(r / a); out[o + 1] = Math.round(g / a); out[o + 2] = Math.round(b / a); }
    out[o + 3] = Math.round((a / wsum) * 255);
  }
  return out;
}

/** Scale an arbitrary RGBA source into a w*h box by bilinear sampling. */
function scaled(src, w, h) {
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = sample(src, (x / (w - 1)) * (src.width - 1), (y / (h - 1)) * (src.height - 1));
    const o = (y * w + x) * 4;
    out[o] = Math.round(c[0]); out[o + 1] = Math.round(c[1]); out[o + 2] = Math.round(c[2]); out[o + 3] = Math.round(c[3]);
  }
  return out;
}

function blit(dst, dw, dh, src, sw, sh, dx, dy) {
  for (let y = 0; y < sh; y++) {
    const ty = dy + y; if (ty < 0 || ty >= dh) continue;
    for (let x = 0; x < sw; x++) {
      const tx = dx + x; if (tx < 0 || tx >= dw) continue;
      const s = (y * sw + x) * 4, t = (ty * dw + tx) * 4;
      const a = src[s + 3] / 255; if (a <= 0) continue;
      const da = dst[t + 3] / 255, ia = 1 - a, na = a + da * ia;
      dst[t] = Math.round((src[s] * a + dst[t] * da * ia) / na);
      dst[t + 1] = Math.round((src[s + 1] * a + dst[t + 1] * da * ia) / na);
      dst[t + 2] = Math.round((src[s + 2] * a + dst[t + 2] * da * ia) / na);
      dst[t + 3] = Math.round(na * 255);
    }
  }
}

/** The metric androidLaunchAssets.test.ts pins: ANY pixel with alpha != 0. */
function maxSubjectRadius(buf, size) {
  let m = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (buf[(y * size + x) * 4 + 3] === 0) continue;
    const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2);
    if (d > m) m = d;
  }
  return m / size;
}

/** Centre of her SOLID body, which is what the eye balances, not the alpha bbox. */
function solidCentre(buf, size) {
  let x0 = size, y0 = size, x1 = -1, y1 = -1;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    if (buf[(y * size + x) * 4 + 3] < 128) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// --------------------------------------------------------------- outputs ---
function main() {
  const headData = extractHead();
  const circle = placementCircle(headData.W, headData.head, headData.bbox);
  console.log(`head bbox ${headData.bbox.join(',')}  placement centre (${circle.cx.toFixed(1)},${circle.cy.toFixed(1)}) r=${circle.r.toFixed(1)}`);

  // 1. The Android 12+ splash icon.
  const mark = renderEmber(MARK, headData, circle);
  save(ASSET('splash-icon-android.png'), MARK, MARK, mark);
  const r = maxSubjectRadius(mark, MARK);
  const solid = solidCentre(mark, MARK);
  console.log(`  maxSubjectRadius ${r.toFixed(5)}  limit ${RADIUS_LIMIT}  headroom ${((1 - r / RADIUS_LIMIT) * 100).toFixed(2)}%  ${r <= RADIUS_LIMIT ? 'PASS' : 'FAIL'}`);
  console.log(`  solid body ${solid.w}x${solid.h} centred at (${solid.cx.toFixed(1)},${solid.cy.toFixed(1)}) of ${MARK / 2 + 0.5}`);
  if (r > RADIUS_LIMIT) throw new Error(`splash icon overflows the ${CIRCLE_DP}dp mask circle`);

  // 2. The iOS storyboard image: the SAME mark at the SAME delivered size, with
  //    the wordmark hung beneath it on the shared dp contract. Transparent
  //    field; the storyboard's named colour paints behind it.
  const SP = 1600;
  const IOS_IMAGE_WIDTH_PT = 400;             // app.json plugins["expo-splash-screen"].imageWidth
  const PX_PER_PT = SP / IOS_IMAGE_WIDTH_PT;  // 4
  const wordmark = load(ASSET('ui/wordmark.png'));
  const markBox = Math.round(MARK_BOX_DP * PX_PER_PT);        // 800
  const wmW = Math.round(WORDMARK_BOX_DP * PX_PER_PT);        // 936
  const wmH = Math.round(wmW * (wordmark.height / wordmark.width)); // 234
  const wmTop = Math.round(SP / 2 + WORDMARK_TOP_DP * PX_PER_PT);   // 1176
  const splash = Buffer.alloc(SP * SP * 4);
  blit(splash, SP, SP, resample(mark, MARK, markBox), markBox, markBox,
    Math.round((SP - markBox) / 2), Math.round((SP - markBox) / 2));
  blit(splash, SP, SP, scaled(wordmark, wmW, wmH), wmW, wmH, Math.round((SP - wmW) / 2), wmTop);
  save(ASSET('splash.png'), SP, SP, splash);
  console.log(`  mark box ${markBox}px (=${MARK_BOX_DP}pt at imageWidth ${IOS_IMAGE_WIDTH_PT}), wordmark ${wmW}x${wmH} top ${wmTop} (=+${WORDMARK_TOP_DP}pt), content bottom ${wmTop + wmH}`);

  if (process.env.WORDSHIFT_SPLASH_REVIEW) writeReviewSheet(mark, process.env.WORDSHIFT_SPLASH_REVIEW);
}

/**
 * Blind grading sheet (never written by `generate:assets`). The mark at the
 * pixel sizes a real device receives -- imageWidth dp at 1x, 2x and 3x -- each
 * centred in the 192dp circle the system masks to, on parchment and on the
 * phase-4 ash the icon library is always graded against, plus the 1x and 2x
 * cells again at 4x nearest neighbour so the real pixels are visible without
 * any new detail being invented. Nothing is labelled, on purpose.
 */
function writeReviewSheet(mark, dir) {
  const ASH = [0x35, 0x2a, 0x31];
  const PAD = 64, GAP = 64, ZOOM = 4;
  const dens = [1, 2, 3].map((d) => ({ d, cell: 288 * d, img: IMAGE_WIDTH_DP * d, circ: CIRCLE_DP * d }));
  const zc = dens.slice(0, 2).map((c) => ({ ...c, size: c.cell * ZOOM }));
  const row1W = dens.reduce((s, c) => s + c.cell, 0) + GAP * (dens.length - 1);
  const row1H = dens[dens.length - 1].cell;
  const row2W = zc.reduce((s, c) => s + c.size, 0) + GAP * (zc.length - 1);
  const row2H = Math.max(...zc.map((c) => c.size));
  const W = PAD * 2 + Math.max(row1W, row2W);
  const H = PAD * 3 + row1H + row2H;
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, ground] of [['splash-review-cream.png', BG], ['splash-review-ash.png', ASH]]) {
    const sheet = Buffer.alloc(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      const o = i * 4;
      sheet[o] = ground[0]; sheet[o + 1] = ground[1]; sheet[o + 2] = ground[2]; sheet[o + 3] = 255;
    }
    const guide = ground === BG ? INK : [0xfb, 0xf0, 0xd9];
    const tint = (x, y, a) => {
      if (a <= 0 || x < 0 || y < 0 || x >= W || y >= H) return;
      const o = (y * W + x) * 4, ia = 1 - a;
      sheet[o] = Math.round(guide[0] * a + sheet[o] * ia);
      sheet[o + 1] = Math.round(guide[1] * a + sheet[o + 1] * ia);
      sheet[o + 2] = Math.round(guide[2] * a + sheet[o + 2] * ia);
    };
    const rendered = new Map();
    let x = PAD, y = PAD;
    for (const c of dens) {
      const ccx = x + c.cell / 2, ccy = y + row1H / 2, th = Math.max(1, c.d * 0.75);
      for (let py = Math.floor(ccy - c.circ); py <= Math.ceil(ccy + c.circ); py++)
        for (let px = Math.floor(ccx - c.circ); px <= Math.ceil(ccx + c.circ); px++)
          tint(px, py, Math.max(0, Math.min(1, th - Math.abs(Math.hypot(px + 0.5 - ccx, py + 0.5 - ccy) - c.circ / 2))) * 0.17);
      const img = resample(mark, MARK, c.img);
      rendered.set(c.d, img);
      blit(sheet, W, H, img, c.img, c.img, Math.round(ccx - c.img / 2), Math.round(ccy - c.img / 2));
      x += c.cell + GAP;
    }
    x = PAD; y = PAD * 2 + row1H;
    for (const c of zc) {
      const img = rendered.get(c.d), off = (c.cell - c.img) / 2;
      for (let py = 0; py < c.size; py++) {
        const sy = Math.floor(py / ZOOM);
        for (let px = 0; px < c.size; px++) {
          const sx = Math.floor(px / ZOOM);
          if (Math.abs(Math.hypot(sx + 0.5 - c.cell / 2, sy + 0.5 - c.cell / 2) - c.circ / 2) < Math.max(1, c.d * 0.75)) tint(x + px, y + py, 0.17);
          const ix = sx - off, iy = sy - off;
          if (ix < 0 || iy < 0 || ix >= c.img || iy >= c.img) continue;
          const si = (iy * c.img + ix) * 4, a = img[si + 3] / 255;
          if (a <= 0) continue;
          const t = ((y + py) * W + x + px) * 4, ia = 1 - a;
          sheet[t] = Math.round(img[si] * a + sheet[t] * ia);
          sheet[t + 1] = Math.round(img[si + 1] * a + sheet[t + 1] * ia);
          sheet[t + 2] = Math.round(img[si + 2] * a + sheet[t + 2] * ia);
        }
      }
      x += c.size + GAP;
    }
    save(path.join(dir, name), W, H, sheet);
  }
}

main();
