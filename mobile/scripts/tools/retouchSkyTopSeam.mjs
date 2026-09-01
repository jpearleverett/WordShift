/**
 * retouchSkyTopSeam.mjs — make the TOP edge of every sky blend seamlessly into
 * the flat backdrop fill painted above it.
 *
 * Problem (measured, not assumed):
 *   HouseWorld paints a FLAT backdrop colour above the bottom-anchored sky so the
 *   sky reads as continuing forever upward as the house grows. That only works if
 *   the sky's row 0 is itself flat. It is not — row 0 carries the painterly art's
 *   HORIZONTAL variation:
 *
 *     sky_day        row0 min 58,147,233  max 79,165,251   (R spread 21)
 *     sky_afternoon  row0 min 18,127,247  max 26,133,252   (R spread  8)
 *     sky_dusk       row0 min 91, 62,122  max 131, 74,134  (R spread 40)  <- worst
 *     sky_storm      row0 flat black
 *     sky_shadow     row0 min  4,  6, 20  max  7,  9, 25
 *     sky_peace      row0 min 23, 17, 38  max 27, 21, 43
 *
 *   A single flat fill can never match a row that varies by up to 40/255 across
 *   its width, so a visible horizontal seam line sits where the fill meets the art.
 *   (The fill CONSTANTS are fine: each declared hex is within 1/255 of its sky's
 *   row-0 mean. The bug is the art's variation, not the colour choice.)
 *
 * Fix (pixels only — dims stay 941x1972 so skyGeometry.test.ts stays green):
 *   - rows 0..FLAT_ROWS      : set to EXACTLY the declared fill hex. The join is
 *                              then mathematically perfect, and no app constant
 *                              has to change.
 *   - rows FLAT_ROWS..RAMP_END: smoothstep blend from that flat colour back into
 *                              the original art, so the painterly variation fades
 *                              in instead of switching on.
 *   - a low-amplitude ordered dither across the ramp so the long, very gradual
 *     blend can never band on a phone panel.
 *   The ramp ends well above row 160, where each sky's own vertical gradient
 *   starts moving in earnest, so no real art is destroyed — only the near-flat
 *   top band is regularised.
 *
 * Idempotent: on first run each live sky is decoded losslessly to
 *   assets/raw/<sky>_pretop.png and every run reads FROM that pristine backup,
 *   so re-running never compounds the effect and never stacks WebP generations.
 *   NOTE the distinct `_pretop` suffix — reworkSkies.mjs owns `<sky>_original.png`
 *   and retouchSkySeam.mjs owns `<sky>_preseam.png`; reading either would revert
 *   their edits, so this script never touches them.
 *
 * Order: run this AFTER reworkSkies.mjs / retouchSkySeam.mjs / settleSkies.mjs
 * (settleSkies derives sky_peace from sky_shadow, so it must land first) and
 * delete the `_pretop` backups if any of those are re-run, so this picks up
 * their new art.
 *
 * Usage (from mobile/):
 *   node scripts/tools/retouchSkyTopSeam.mjs
 * Requires sharp (build-time only, like encodeBackgroundsWebp.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// libvips caches decoded files by path; without this the post-write verification
// below can be served the PRE-write image and report nonsense deviations.
sharp.cache(false);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_DIR = path.resolve(__dirname, '../../assets/environment');
const RAW_DIR = path.resolve(__dirname, '../../assets/raw');

// The declared backdrop fill for each sky. These MUST stay identical to
// PHASE_BG_COLORS in HouseWorld.tsx, the duplicate map in HomeScreen.tsx and
// getScreenBackgroundColor('home') in appStyles.ts — skyTopSeam.test.ts pins
// that they agree, so the seam can never silently reopen.
const SKY_FILL = {
  sky_day: '#439cf2',
  sky_afternoon: '#1583f9',
  sky_dusk: '#684381',
  sky_storm: '#000000',
  sky_shadow: '#050816',
  sky_peace: '#181328',
};

// Rows held at exactly the fill colour before the art fades back in.
const FLAT_ROWS = 26;
// Row at which the original art is back at full strength.
const RAMP_END = 140;
// Peak amplitude of the ordered dither over the ramp (in 0..255 units).
const DITHER_AMP = 1.1;

const WEBP_QUALITY = 90;

const hexToRgb = h => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const clamp255 = v => (v < 0 ? 0 : v > 255 ? 255 : v);
// Classic smoothstep: flat at both ends, so neither join shows a crease.
const smoothstep = t => t * t * (3 - 2 * t);

/** Decode the live WebP to a pristine PNG backup once, then always read that. */
async function pristine(name) {
  const backup = path.join(RAW_DIR, `${name}_pretop.png`);
  if (!fs.existsSync(backup)) {
    await sharp(path.join(ENV_DIR, `${name}.webp`)).png().toFile(backup);
    console.log(`  backed up pristine ${name} -> assets/raw/${name}_pretop.png`);
  }
  return sharp(backup).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function retouch(name) {
  const fill = SKY_FILL[name];
  if (!fill) throw new Error(`no declared fill colour for ${name}`);
  const [fr, fg, fb] = hexToRgb(fill);

  const { data, info } = await pristine(name);
  const { width: W, height: H, channels: C } = info;

  for (let y = 0; y < RAMP_END && y < H; y++) {
    // strength = how much of the FLAT colour wins at this row.
    let strength;
    if (y < FLAT_ROWS) {
      strength = 1;
    } else {
      const t = (y - FLAT_ROWS) / (RAMP_END - FLAT_ROWS);
      strength = 1 - smoothstep(t);
    }
    // Dither only inside the ramp — the flat band must stay bit-exact so it
    // matches the app's fill colour precisely.
    const ditherHere = y < FLAT_ROWS ? 0 : DITHER_AMP * (1 - Math.abs(2 * strength - 1));
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C;
      const d = ditherHere === 0 ? 0 : (((x * 7 + y * 13) % 5) - 2) * 0.5 * ditherHere;
      data[i] = clamp255(Math.round(data[i] + (fr - data[i]) * strength + d));
      data[i + 1] = clamp255(Math.round(data[i + 1] + (fg - data[i + 1]) * strength + d));
      data[i + 2] = clamp255(Math.round(data[i + 2] + (fb - data[i + 2]) * strength + d));
    }
  }

  const out = path.join(ENV_DIR, `${name}.webp`);
  await sharp(data, { raw: { width: W, height: H, channels: C } })
    .webp({ quality: WEBP_QUALITY, effort: 6 })
    .toFile(out);

  // Round-trip guard: dims must survive, or the sky seat math shifts.
  const back = await sharp(out).metadata();
  if (back.width !== W || back.height !== H) {
    throw new Error(`${name}: dimension drift ${W}x${H} -> ${back.width}x${back.height}`);
  }

  // Verify the flat band actually landed flat and on-colour after re-encode.
  const { data: check, info: ci } = await sharp(fs.readFileSync(out))
    .raw()
    .toBuffer({ resolveWithObject: true });
  let maxDev = 0;
  for (let y = 0; y < FLAT_ROWS; y++) {
    for (let x = 0; x < ci.width; x++) {
      const i = (y * ci.width + x) * ci.channels;
      maxDev = Math.max(
        maxDev,
        Math.abs(check[i] - fr),
        Math.abs(check[i + 1] - fg),
        Math.abs(check[i + 2] - fb),
      );
    }
  }
  console.log(
    `${name}.webp (${W}x${H}) — top ${FLAT_ROWS} rows flattened to ${fill}, ` +
    `art restored by row ${RAMP_END}; max deviation in flat band after encode: ${maxDev}/255`
  );
  return maxDev;
}

const names = Object.keys(SKY_FILL);
let worst = 0;
for (const n of names) worst = Math.max(worst, await retouch(n));
console.log(
  `\nDone. ${names.length} skies retouched; worst post-encode deviation ${worst}/255 ` +
  `(WebP q${WEBP_QUALITY} is lossy, so a deviation of 1-2 is expected and invisible).`
);
