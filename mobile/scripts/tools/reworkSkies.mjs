/**
 * reworkSkies.mjs — hero-sky rework for the descent's two darkest skies.
 *
 * Problem (pre-launch critique):
 *   - sky_storm.png (Phase 3 "Growing Shadows") was a SERENE moonlit night —
 *     crescent moon, calm stars, cheerful flowered meadow — contradicting the
 *     descent for an entire phase.
 *   - sky_shadow.png (Phase 4/5) had a fully-rendered grinning horned demon
 *     face (blazing red eyes, dripping fangs, tentacles) baked into the sky,
 *     over-explaining the deliberately never-explained entity and upstaging
 *     the restrained ShadowFigure overlay.
 *
 * This script edits both skies IN PLACE from pristine backups:
 *   - sky_storm.png  → an actual pre-storm night: globally cooled/darkened,
 *     flower saturation drained, cloud bellies darkened + rims lifted
 *     (lit-from-behind), stars dimmed, crescent moon heavily veiled.
 *   - sky_shadow.png → the explicit face becomes an ambiguous towering
 *     darkness: eyes/fangs/cracks/tentacles absorbed into the mass with
 *     deviation-weighted feathered blends, the horn crown softened and merged
 *     into darkened storm sky, red mist saturation cut to ~30%, and two FAINT
 *     red ember points re-added where the eyes were (~15% of the original
 *     intensity).
 *
 * Backups: on first run the current assets are copied to
 *   assets/raw/sky_storm_original.png / sky_shadow_original.png.
 * Re-runs always read FROM the backups, so the script is idempotent and every
 * tuning iteration starts from the pristine art (edits never compound).
 *
 * All masks are radial/elliptical/rounded-box with smoothstep feathering —
 * no hard rectangles. The 941x1972 dimensions and the bottom ~300 mirrored
 * meadow rows are untouched structurally (skyGeometry.test.ts pins the seat
 * math). After running, re-run sanitizePng.mjs on both outputs and re-sample
 * PHASE_BG_COLORS / PHASE_GROUND_COLORS (this script prints the new top/bottom
 * row averages).
 *
 * Usage (from mobile/):
 *   node scripts/tools/reworkSkies.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ENV_DIR = 'assets/environment';
const RAW_DIR = 'assets/raw';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const mix = (a, b, t) => a + (b - a) * t;
/** Hermite smoothstep on [e0, e1]. */
function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}
/** Feathered rounded-box mask: 1 inside, smooth falloff over `feather` px. */
function boxMask(x, y, x0, x1, y0, y1, feather) {
  const fx = smoothstep(x0 - feather, x0, x) * (1 - smoothstep(x1, x1 + feather, x));
  const fy = smoothstep(y0 - feather, y0, y) * (1 - smoothstep(y1, y1 + feather, y));
  return fx * fy;
}
/** Feathered radial mask: 1 at center, 0 at rOuter. */
function radialMask(x, y, cx, cy, rInner, rOuter) {
  const d = Math.hypot(x - cx, y - cy);
  return 1 - smoothstep(rInner, rOuter, d);
}
/** Feathered elliptical mask (normalized radius 1 = edge). */
function ellipseMask(x, y, cx, cy, rx, ry, hardFrac) {
  const nd = Math.hypot((x - cx) / rx, (y - cy) / ry);
  return 1 - smoothstep(hardFrac, 1, nd);
}

function loadPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}
function savePng(img, file) {
  fs.writeFileSync(file, PNG.sync.write(img, { colorType: 6 }));
}
function getPx(img, x, y) {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}
function setPx(img, x, y, r, g, b) {
  const i = (y * img.width + x) * 4;
  img.data[i] = clamp255(Math.round(r));
  img.data[i + 1] = clamp255(Math.round(g));
  img.data[i + 2] = clamp255(Math.round(b));
}
function rowAvgHex(img, y) {
  let r = 0, g = 0, b = 0;
  for (let x = 0; x < img.width; x++) {
    const [pr, pg, pb] = getPx(img, x, y);
    r += pr; g += pg; b += pb;
  }
  const n = img.width;
  return (
    '#' +
    [r / n, g / n, b / n]
      .map((v) => Math.round(v).toString(16).padStart(2, '0'))
      .join('')
  );
}
/**
 * Separable box blur of a sub-rect, alpha-blended back through a per-pixel
 * mask function. Only the rect [x0..x1]x[y0..y1] is read/written; the blur
 * kernel is clamped at the rect edges.
 */
function maskedBlur(img, x0, x1, y0, y1, radius, maskFn) {
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const src = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = getPx(img, x0 + x, y0 + y);
      const i = (y * w + x) * 3;
      src[i] = r; src[i + 1] = g; src[i + 2] = b;
    }
  }
  // Horizontal pass
  const tmp = new Float32Array(w * h * 3);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(w - 1, Math.max(0, x + k));
        const i = (y * w + xx) * 3;
        r += src[i]; g += src[i + 1]; b += src[i + 2]; n++;
      }
      const o = (y * w + x) * 3;
      tmp[o] = r / n; tmp[o + 1] = g / n; tmp[o + 2] = b / n;
    }
  }
  // Vertical pass + masked blend back
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(h - 1, Math.max(0, y + k));
        const i = (yy * w + x) * 3;
        r += tmp[i]; g += tmp[i + 1]; b += tmp[i + 2]; n++;
      }
      const m = maskFn(x0 + x, y0 + y);
      if (m <= 0) continue;
      const [or, og, ob] = getPx(img, x0 + x, y0 + y);
      setPx(img, x0 + x, y0 + y, mix(or, r / n, m), mix(og, g / n, m), mix(ob, b / n, m));
    }
  }
}

// ---------------------------------------------------------------------------
// Backup management: always work from the pristine originals.
// ---------------------------------------------------------------------------

function ensureBackup(name) {
  const live = path.join(ENV_DIR, `${name}.png`);
  const backup = path.join(RAW_DIR, `${name}_original.png`);
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(live, backup);
    console.log(`backed up ${live} -> ${backup}`);
  }
  return backup;
}

// ---------------------------------------------------------------------------
// sky_storm.png — serene moonlit night → pre-storm dread
// ---------------------------------------------------------------------------

function reworkStorm() {
  const img = loadPng(ensureBackup('sky_storm'));
  const { width: W, height: H } = img;

  // Measured feature geometry (probe of the pristine art):
  // The moon's baked-in halo glow extends to ~r200 — the veil must cover ALL
  // of it or the flattened core reads as a dark hole inside a bright ring.
  const MOON = { cx: 712, cy: 200, rIn: 90, rOut: 200 };
  const SKY_BAND_END = 620;   // clouds + mountain ridge live above this row
  const STAR_BAND_END = 430;  // open sky (stars) above the cloud line
  const MEADOW_START = 1030;  // meadow + flowers below this row

  // 1) Dim the calm stars (open-sky band only; foliage highlights untouched).
  for (let y = 0; y < STAR_BAND_END + 80; y++) {
    const band = 1 - smoothstep(STAR_BAND_END, STAR_BAND_END + 80, y);
    if (band <= 0) continue;
    for (let x = 0; x < W; x++) {
      const [r, g, b] = getPx(img, x, y);
      const L = lum(r, g, b);
      if (L <= 105) continue;
      const target = 105 + (L - 105) * 0.32; // keep ~1/3 of over-threshold shine
      const k = mix(1, target / L, band);
      setPx(img, x, y, r * k, g * k, b * k);
    }
  }

  // 2) Cloud menace: per-channel contrast around the band's own means —
  //    bellies darken, rims brighten slightly (lit-from-behind).
  {
    let mr = 0, mg = 0, mb = 0, n = 0;
    for (let y = 0; y < SKY_BAND_END; y += 3) {
      for (let x = 0; x < W; x += 3) {
        const [r, g, b] = getPx(img, x, y);
        mr += r; mg += g; mb += b; n++;
      }
    }
    mr /= n; mg /= n; mb /= n;
    const CONTRAST = 1.5;
    for (let y = 0; y < SKY_BAND_END + 120; y++) {
      const band = 1 - smoothstep(SKY_BAND_END, SKY_BAND_END + 120, y);
      if (band <= 0) continue;
      for (let x = 0; x < W; x++) {
        const [r, g, b] = getPx(img, x, y);
        const cr = mr + (r - mr) * CONTRAST;
        const cg = mg + (g - mg) * CONTRAST;
        const cb = mb + (b - mb) * CONTRAST;
        setPx(img, x, y, mix(r, cr, band), mix(g, cg, band), mix(b, cb, band));
      }
    }
  }

  // 2b) Oppressive ceiling: the upper sky presses down (subtle top-to-mid
  //     darkening gradient — the storm has weight overhead).
  for (let y = 0; y < 520; y++) {
    const k = mix(0.8, 1.0, smoothstep(0, 520, y));
    if (k >= 0.999) continue;
    for (let x = 0; x < W; x++) {
      const [r, g, b] = getPx(img, x, y);
      setPx(img, x, y, r * k, g * k, b * k);
    }
  }

  // 3) Veil the moon (after the contrast/ceiling passes so no later pass can
  //    re-shape the veiled zone). The art bakes a bright halo AND a dark
  //    shadowed moon-disc, so the pull is symmetric on |L - sky| (one-sided
  //    pulls left a crisp dark "eclipse", iterations 1-2), and the reference
  //    is PER-ROW (a single flat reference would fight the sky's vertical
  //    gradient and stamp a circular tonal patch).
  {
    const y0 = Math.max(0, MOON.cy - MOON.rOut - 8);
    const y1 = Math.min(H - 1, MOON.cy + MOON.rOut + 8);
    const rowRef = new Map();
    for (let y = y0; y <= y1; y++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (const side of [-1, 1]) {
        for (let dx = MOON.rOut + 12; dx <= MOON.rOut + 64; dx += 2) {
          const x = MOON.cx + side * dx;
          if (x < 0 || x >= W) continue;
          const [pr, pg, pb] = getPx(img, x, y);
          r += pr; g += pg; b += pb; n++;
        }
      }
      rowRef.set(y, [r / n, g / n, b / n]);
    }
    for (let y = y0; y <= y1; y++) {
      const ref = rowRef.get(y);
      const refL = lum(...ref);
      for (let x = Math.max(0, MOON.cx - MOON.rOut); x <= Math.min(W - 1, MOON.cx + MOON.rOut); x++) {
        const fall = radialMask(x, y, MOON.cx, MOON.cy, MOON.rIn, MOON.rOut);
        if (fall <= 0) continue;
        const [r, g, b] = getPx(img, x, y);
        const L = lum(r, g, b);
        const s = fall * Math.min(0.95, 0.28 + smoothstep(4, 24, Math.abs(L - refL)) * 0.68);
        setPx(img, x, y, mix(r, ref[0], s), mix(g, ref[1], s), mix(b, ref[2], s));
      }
    }
    // Soften whatever crescent edge survived — a smothered light has no
    // crisp contours.
    maskedBlur(
      img,
      Math.max(0, MOON.cx - MOON.rOut), Math.min(W - 1, MOON.cx + MOON.rOut), y0, y1,
      6,
      (x, y) => radialMask(x, y, MOON.cx, MOON.cy, MOON.rIn * 0.8, MOON.rOut) * 0.7
    );
    // Smothered-glow remnant: one soft lift centered on the moon, brightest
    // at the body, so the veil reads as "moon behind storm cloud", not
    // "moon deleted".
    for (let y = Math.max(0, MOON.cy - 130); y <= MOON.cy + 130; y++) {
      for (let x = Math.max(0, MOON.cx - 130); x <= Math.min(W - 1, MOON.cx + 130); x++) {
        const d = Math.hypot(x - MOON.cx, y - MOON.cy);
        const gGlow = Math.exp(-(d * d) / (2 * 52 * 52)); // sigma 52
        if (gGlow < 0.02) continue;
        const [r, g, b] = getPx(img, x, y);
        setPx(img, x, y, r + 15 * gGlow, g + 17 * gGlow, b + 22 * gGlow);
      }
    }
  }

  // 4) Drain the meadow's cheerful flower saturation (and dim bright petals).
  for (let y = MEADOW_START - 160; y < H; y++) {
    const band = smoothstep(MEADOW_START - 160, MEADOW_START, y);
    if (band <= 0) continue;
    for (let x = 0; x < W; x++) {
      const [r, g, b] = getPx(img, x, y);
      const L = lum(r, g, b);
      const desat = 0.42 * band;
      let nr = mix(r, L, desat);
      let ng = mix(g, L, desat);
      let nb = mix(b, L, desat);
      if (L > 85) {
        // White/blue petals and water sparkle: pull the shine down.
        const target = 85 + (L - 85) * 0.45;
        const k = mix(1, target / L, band);
        nr *= k; ng *= k; nb *= k;
      }
      setPx(img, x, y, nr, ng, nb);
    }
  }

  // 5) Global cool-darken: desaturate the candy-blue vibrance toward slate,
  //    then darken — blue keeps slightly more than red/green so the night
  //    stays cool. Applied last, uniformly (top/bottom rows shift too — the
  //    printed samples below feed PHASE_BG_COLORS / PHASE_GROUND_COLORS).
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = getPx(img, x, y);
      const L = lum(r, g, b);
      const nr = mix(r, L, 0.24) * 0.74;
      const ng = mix(g, L, 0.24) * 0.76;
      const nb = mix(b, L, 0.24) * 0.82;
      setPx(img, x, y, nr, ng, nb);
    }
  }

  savePng(img, path.join(ENV_DIR, 'sky_storm.png'));
  console.log(`sky_storm.png reworked (${W}x${H})`);
  console.log(`  top row avg    ${rowAvgHex(img, 0)}`);
  console.log(`  bottom row avg ${rowAvgHex(img, H - 1)}`);
}

// ---------------------------------------------------------------------------
// sky_shadow.png — explicit demon face → ambiguous towering darkness
// ---------------------------------------------------------------------------

function reworkShadow() {
  const img = loadPng(ensureBackup('sky_shadow'));
  const { width: W, height: H } = img;

  // Measured feature geometry (probe of the pristine art):
  const EYE_L = { x: 437, y: 344 };
  const EYE_R = { x: 528, y: 341 };
  const FACE = { cx: 485, cy: 400, rx: 215, ry: 265 }; // eyes/fangs/cracks/tentacles
  // Protect only the bright crescent arc (image ~x700-760, y100-250); the
  // shadowed disc half and the horn fragments beside it are fair game for
  // the merge passes — a wide protect ring left crisp spike remnants.
  const MOON = { cx: 728, cy: 175, rIn: 46, rOut: 78 };
  const MASS_DARK = [13, 20, 43]; // plain mass tone (sampled at ~(630,255)), slightly deepened
  const MASS_L = lum(...MASS_DARK);
  const moonProtect = (x, y) => radialMask(x, y, MOON.cx, MOON.cy, MOON.rIn, MOON.rOut);

  // 1) Absorb the face: inside the face ellipse, pull pixels toward the dark
  //    mass tone. Strength is deviation-weighted (blazing eyes / white fangs /
  //    red cracks erased hardest) on top of a HIGH base pull — iteration 1
  //    proved that in a near-black scene even a +10 residual reads as a grin
  //    at display gamma, so the core must land within ~2-3 values of flat.
  for (let y = Math.max(0, FACE.cy - FACE.ry); y <= Math.min(H - 1, FACE.cy + FACE.ry); y++) {
    for (let x = Math.max(0, FACE.cx - FACE.rx); x <= Math.min(W - 1, FACE.cx + FACE.rx); x++) {
      const m = ellipseMask(x, y, FACE.cx, FACE.cy, FACE.rx, FACE.ry, 0.62);
      if (m <= 0) continue;
      const [r, g, b] = getPx(img, x, y);
      const dev =
        Math.max(
          Math.abs(r - MASS_DARK[0]),
          Math.abs(g - MASS_DARK[1]),
          Math.abs(b - MASS_DARK[2])
        ) / 255;
      const s = m * Math.min(0.985, 0.55 + dev * 4.0);
      setPx(
        img, x, y,
        mix(r, MASS_DARK[0], s), mix(g, MASS_DARK[1], s), mix(b, MASS_DARK[2], s)
      );
    }
  }

  // 2) Cut the red mist: everywhere in the mist's measured extent, reduce
  //    redness (r above the g/b fog level) to ~20% of its original strength.
  for (let y = 120; y <= 1050; y++) {
    for (let x = 200; x <= 780; x++) {
      const m = boxMask(x, y, 270, 710, 190, 980, 80);
      if (m <= 0) continue;
      const [r, g, b] = getPx(img, x, y);
      const redness = r - (g + b) / 2;
      if (redness <= 2) continue;
      const nr = r - redness * 0.8 * m;
      setPx(img, x, y, nr, g, b);
    }
  }

  // 3) Merge the horn crown + shoulder-spike ridges into the storm.
  //    (a) Contrast collapse: sky brighter than the mass, in the crown band
  //        and along the right ridge (the only side with a bright sky behind
  //        it), is pulled toward the mass tone — the gaps BETWEEN the spikes
  //        fill in and the crown becomes a lumpy storm column.
  const crownMask = (x, y) =>
    Math.max(
      boxMask(x, y, 260, 740, 55, 350, 85),
      boxMask(x, y, 620, 790, 180, 520, 60)
    );
  for (let y = 0; y <= 600; y++) {
    for (let x = 170; x <= 860; x++) {
      const m = crownMask(x, y) * (1 - moonProtect(x, y));
      if (m <= 0) continue;
      const [r, g, b] = getPx(img, x, y);
      const brightW = Math.min(1, Math.max(0, (lum(r, g, b) - MASS_L) / 26));
      const s = m * brightW * 0.8;
      if (s <= 0) continue;
      setPx(
        img, x, y,
        mix(r, MASS_DARK[0] * 0.9, s), mix(g, MASS_DARK[1] * 0.9, s), mix(b, MASS_DARK[2] * 0.9, s)
      );
    }
  }
  //    (b) A heavy masked blur genuinely dissolves the spike silhouettes into
  //        cloud lumps; a second light pass unifies the grain afterwards.
  maskedBlur(img, 200, 830, 20, 600, 13, (x, y) =>
    crownMask(x, y) * 0.85 * (1 - moonProtect(x, y))
  );
  maskedBlur(img, 240, 800, 30, 620, 4, (x, y) =>
    boxMask(x, y, 280, 740, 70, 560, 100) * 0.5 * (1 - moonProtect(x, y))
  );

  // 4) Re-add the eyes as FAINT embers in fog: ~10-15% of the original blaze,
  //    two small warm points, each with a whisper of a halo.
  for (const eye of [EYE_L, EYE_R]) {
    for (let y = eye.y - 40; y <= eye.y + 40; y++) {
      for (let x = eye.x - 40; x <= eye.x + 40; x++) {
        const d2 = (x - eye.x) ** 2 + (y - eye.y) ** 2;
        const core = Math.exp(-d2 / (2 * 5 * 5));
        const halo = Math.exp(-d2 / (2 * 12 * 12));
        const addR = 26 * core + 7 * halo;
        if (addR < 0.8) continue;
        const [r, g, b] = getPx(img, x, y);
        setPx(img, x, y, r + addR, g + 2.5 * core + 0.7 * halo, b + 3 * core + 0.8 * halo);
      }
    }
  }

  savePng(img, path.join(ENV_DIR, 'sky_shadow.png'));
  console.log(`sky_shadow.png reworked (${W}x${H})`);
  console.log(`  top row avg    ${rowAvgHex(img, 0)}`);
  console.log(`  bottom row avg ${rowAvgHex(img, H - 1)}`);
}

reworkStorm();
reworkShadow();
console.log(
  '\nDone. Now: node scripts/tools/sanitizePng.mjs assets/environment/sky_storm.png assets/environment/sky_shadow.png' +
  '\nand update PHASE_BG_COLORS / PHASE_GROUND_COLORS (HouseWorld.tsx, HomeScreen.tsx, appStyles.ts) with the row averages above.'
);
