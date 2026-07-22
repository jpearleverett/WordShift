/**
 * retouchSkySeam.mjs — dissolve the mirrored "kaleidoscope" strip at the bottom
 * of all five skies (F112).
 *
 * Problem:
 *   Every sky (sky_day / sky_afternoon / sky_dusk / sky_storm / sky_shadow) is
 *   941x1972, where the bottom 300 rows (1672-1971) are a VERTICAL MIRROR of the
 *   meadow just above the axis (row 1671 == row 1672, measured). The house seats
 *   below the river, so at the resting camera that mirrored strip is visible
 *   around and below the Offering Pit, where the reflected flowers/tufts line up
 *   symmetrically and read as an unnatural kaleidoscope fold.
 *
 * Fix (pixels only — dims stay 941x1972, so skyGeometry.test.ts stays green):
 *   Over the mirrored strip, progressively DISSOLVE the reflection into a calm,
 *   out-of-focus ground:
 *     - a graded box BLUR (the main lever) that softens the mirrored micro-detail
 *       so it stops reading as a recognizable reflection,
 *     - a graded DESATURATE + a mild DARKEN so the bright mirrored meadow settles
 *       into a quiet foreground,
 *     - a low-amplitude ordered DITHER so the ramp never bands.
 *   The strength RAMPS from 0 exactly at the seam (a graded, dithered feather —
 *   no visible transition line) up to full a third of the way down, so the real
 *   meadow above the seam is untouched and the transition is seamless.
 *
 * Idempotent: on first run each live sky is copied to
 *   assets/raw/<sky>_preseam.png and every run reads FROM that pristine backup,
 *   so re-running never compounds the effect. NOTE the distinct `_preseam` suffix
 *   — reworkSkies.mjs owns `<sky>_original.png` (the PRE-rework storm/shadow art);
 *   reading those would silently revert its edits, so this script never touches
 *   them.
 *
 * Usage (from mobile/):
 *   node scripts/tools/retouchSkySeam.mjs
 * PNG output is a clean pngjs IHDR/IDAT/IEND RGBA file (no sanitize step needed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const ENV_DIR = 'assets/environment';
const RAW_DIR = 'assets/raw';
const SKIES = ['sky_day', 'sky_afternoon', 'sky_dusk', 'sky_storm', 'sky_shadow'];

// Geometry (measured): the mirror axis sits between rows 1671 and 1672, so the
// duplicated strip is rows 1672..1971. Effect ramps in from the seam downward.
const SEAM = 1672;
const RAMP_END = 0.34;   // fraction of the strip over which strength reaches full
const MAX_BLUR = 8;      // box-blur radius at full strength
const MAX_DESAT = 0.5;   // peak desaturation
const MAX_DARKEN = 0.12; // peak darken (kept modest — bottom rows are 1px seam insurance)

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const smoothstep = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function preseamBackup(name) {
  const backup = path.join(RAW_DIR, `${name}_preseam.png`);
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(path.join(ENV_DIR, `${name}.png`), backup);
    console.log(`backed up ${name}.png -> ${path.basename(backup)}`);
  }
  return backup;
}

/** Separable box blur of the strip rows [SEAM, H) into a fresh Float32 RGB buffer. */
function blurStrip(data, W, H, radius) {
  const y0 = SEAM, rows = H - SEAM;
  const src = new Float32Array(W * rows * 3);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < W; x++) {
      const i = ((y0 + y) * W + x) * 4, o = (y * W + x) * 3;
      src[o] = data[i]; src[o + 1] = data[i + 1]; src[o + 2] = data[i + 2];
    }
  // horizontal
  const tmp = new Float32Array(W * rows * 3);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let k = -radius; k <= radius; k++) {
        const xx = Math.min(W - 1, Math.max(0, x + k)), i = (y * W + xx) * 3;
        r += src[i]; g += src[i + 1]; b += src[i + 2]; n++;
      }
      const o = (y * W + x) * 3;
      tmp[o] = r / n; tmp[o + 1] = g / n; tmp[o + 2] = b / n;
    }
  // vertical (clamped within the strip)
  const out = new Float32Array(W * rows * 3);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let k = -radius; k <= radius; k++) {
        const yy = Math.min(rows - 1, Math.max(0, y + k)), i = (yy * W + x) * 3;
        r += tmp[i]; g += tmp[i + 1]; b += tmp[i + 2]; n++;
      }
      const o = (y * W + x) * 3;
      out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
    }
  return out;
}

function retouch(name) {
  const img = PNG.sync.read(fs.readFileSync(preseamBackup(name)));
  const { width: W, height: H, data } = img;
  const blurred = blurStrip(data, W, H, MAX_BLUR);
  const denom = H - 1 - SEAM;
  for (let y = SEAM; y < H; y++) {
    const t = (y - SEAM) / denom;
    const ramp = smoothstep(0, RAMP_END, t);
    if (ramp <= 0) continue;
    const desat = ramp * MAX_DESAT;
    const darken = 1 - ramp * MAX_DARKEN;
    const sy = y - SEAM;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, bo = (sy * W + x) * 3;
      // blend original toward the blurred strip
      let r = data[i] + (blurred[bo] - data[i]) * ramp;
      let g = data[i + 1] + (blurred[bo + 1] - data[i + 1]) * ramp;
      let b = data[i + 2] + (blurred[bo + 2] - data[i + 2]) * ramp;
      // desaturate toward luminance, then darken
      const L = lum(r, g, b);
      r = (r + (L - r) * desat) * darken;
      g = (g + (L - g) * desat) * darken;
      b = (b + (L - b) * desat) * darken;
      // low-amplitude ordered dither (~ +/-1.2) so the ramp never bands
      const dith = (((x * 7 + y * 13) % 5) - 2) * 0.6;
      data[i] = clamp255(Math.round(r + dith));
      data[i + 1] = clamp255(Math.round(g + dith));
      data[i + 2] = clamp255(Math.round(b + dith));
    }
  }
  fs.writeFileSync(path.join(ENV_DIR, `${name}.png`), PNG.sync.write(img, { colorType: 6 }));
  console.log(`retouched ${name}.png (${W}x${H}) — seam dissolved from row ${SEAM}`);
}

for (const name of SKIES) retouch(name);
console.log('\nDone. The mirrored bottom strips are dissolved into calm ground; dims unchanged.');
