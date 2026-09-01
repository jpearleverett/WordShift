/**
 * carveFoundationRoad.mjs — carry the Offering Pit's dirt road up UNDER the house.
 *
 * Problem:
 *   `pit_entrance.png` paints a dirt road running up out of the pit toward the
 *   house, and it stops dead at the top edge of its own image. Directly above it
 *   the foundation art lays an unbroken band of vegetation (bright grass at
 *   phase 0, dry ochre at 2, frost-blue growth at 4) across the ENTIRE 792px
 *   width — including the stretch the road is supposed to occupy. The result on
 *   screen is a road that runs up to the house and is then cut off by a strip of
 *   grass lying across it.
 *
 * Geometry (all measured, all derived from HouseWorld.tsx's own constants):
 *   HOUSE_WIDTH = ROOM_WIDTH(250) + 2*HOUSE_PADDING(16) = 282dp
 *     foundation art is 792px wide  -> 282/792 = 0.3561 dp per art px
 *   PIT_RENDER_WIDTH = 130dp, pit art is 460px  -> 130/460 = 0.2826 dp per art px
 *   The pit box is centred under the house, so its left edge sits at
 *     (282 - 130) / 2 = 76dp
 *   The pit's road spans art x 112..352, i.e. dp 107.7..175.5 (centred on 141.6,
 *   against a house centre of 141). Mapping that back through the foundation's
 *   own scale gives the corridor this script carves:
 *     **foundation art x 302..493** (192px wide)
 *   The two scales also fix the texture ratio: 1dp is 3.54 pit px but only 2.81
 *   foundation px, so pit texture must be resampled by 0.2826/0.3561 = 0.794 to
 *   keep the road's grain the same physical size on screen. 241 pit px * 0.794 =
 *   191.4 -> the 192px corridor. The geometry closes on itself, which is the
 *   check that the corridor is right.
 *
 * Fix — continue the SAME road rather than paint a new one:
 *   The road pixels are sampled straight out of `pit_entrance.png` (its own road,
 *   rows 0..45, x 112..352), resampled by 0.794 and laid into the corridor
 *   bottom-up, so the grain, pebbles and colour are literally the same road
 *   continuing. Then:
 *     - the phase tint the app applies to the pit at RUNTIME is baked in here,
 *       so the carved road matches the rendered pit exactly at every phase
 *       (the foundations are hand-lit per phase and take no runtime tint, while
 *       the pit is one image tinted by PHASE_HOUSE_TINT at pitTintOpacity =
 *       min(ext, 0.4) — bake that same blend or the two halves would not match);
 *     - the road darkens toward the top with a contact-shadow band at the stone
 *       base, so it reads as passing UNDER the house rather than being painted on;
 *     - the corridor edges are feathered with a deterministic noise-modulated
 *       margin, so vegetation overlaps the verge in a ragged line instead of the
 *       road being a clean rectangle;
 *     - alpha is forced opaque across the corridor down to the bottom row, so
 *       the road actually reaches the foundation's edge and meets the pit art
 *       flush (PIT_MARGIN_TOP is 0). The foundation's own bottom edge is ragged
 *       and stopped short of the corridor on one side, which would have left a
 *       notch in the join.
 *
 * Idempotent: on first run each foundation is copied to
 *   assets/raw/foundation_N_preroad.png and every run reads FROM that pristine
 *   backup, so re-running never compounds the carve.
 *
 * Dimensions stay 792x120 for every phase (HouseWorld derives
 * FOUNDATION_RENDER_HEIGHT from that ratio, and the house must not jump between
 * phases). Foundations stay PNG with their alpha intact — they are composited,
 * not full-screen backgrounds, so they are deliberately not WebP.
 *
 * Usage (from mobile/):
 *   node scripts/tools/carveFoundationRoad.mjs
 * Requires sharp (build-time only, like encodeBackgroundsWebp.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

sharp.cache(false);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_DIR = path.resolve(__dirname, '../../assets/environment');
const RAW_DIR = path.resolve(__dirname, '../../assets/raw');

// --- corridor, in foundation art pixels (see the geometry note above) --------
const ROAD_X0 = 302;
const ROAD_X1 = 493;
// Top of the carve: just under the lowest stone course, where the vegetation
// band starts ramping in (measured: grass coverage over the corridor goes
// 34/192 at y=85, 107 at y=90, 155 at y=95, 192 at y=100).
const ROAD_TOP = 84;
const FOUND_H = 120;

// --- pit road source, in pit_entrance art pixels ----------------------------
const PIT_ROAD_X0 = 112;
const PIT_ROAD_X1 = 352;
// pit px per foundation px (inverse of the 0.794 resample factor).
const PIT_PER_FOUND = 0.3561 / 0.2826;

// Vertical ramp: the road reaches full strength this many rows below ROAD_TOP.
// Kept short — the road should tuck UNDER the wall in shadow, not dissolve into
// the grass, so the emergence is carried by the shading below, not by fading out.
const TOP_FEATHER = 6;
// Softness (px) of the road's own verge where it meets vegetation. The road's
// WIDTH is taken from the pit art's alpha (see roadMask), so this only softens
// that edge; it never invents one.
const EDGE_SOFT = 5;
// Under-house shading: brightness multiplier at ROAD_TOP, reaching 1.0 at the
// bottom row.
const SHADE_AT_TOP = 0.46;
// Extra contact-shadow darkening right at the stone base, and its depth in rows.
const CONTACT_STRENGTH = 0.34;
const CONTACT_ROWS = 10;

// PHASE_HOUSE_TINT from HouseWorld.tsx. `ext` is the exterior tint strength; the
// pit uses pitTintOpacity = min(ext, 0.4) so its teal glow survives the night.
const PHASE_TINT = [
  { color: '#000000', ext: 0 },
  { color: '#FFBE6E', ext: 0.06 },
  { color: '#D66E46', ext: 0.14 },
  { color: '#0E1A36', ext: 0.45 },
  { color: '#080818', ext: 0.55 },
  { color: '#140E28', ext: 0.48 },
];

const hexToRgb = h => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const clamp255 = v => (v < 0 ? 0 : v > 255 ? 255 : v);
const smoothstep = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Deterministic value noise in [0,1) — no Math.random, so runs are reproducible. */
function noise2(x, y) {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

async function loadPitRoad() {
  const { data, info } = await sharp(path.join(ENV_DIR, 'pit_entrance.png'))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height, C: info.channels };
}

async function pristine(name) {
  const backup = path.join(RAW_DIR, `${name}_preroad.png`);
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(path.join(ENV_DIR, `${name}.png`), backup);
    console.log(`  backed up pristine ${name} -> assets/raw/${name}_preroad.png`);
  }
  return sharp(backup).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function carve(phase, pit) {
  const name = `foundation_${phase}`;
  const { data, info } = await pristine(name);
  const { width: W, height: H, channels: C } = info;
  if (W !== 792 || H !== FOUND_H) {
    throw new Error(`${name}: expected 792x${FOUND_H}, got ${W}x${H}`);
  }

  const tint = PHASE_TINT[phase] ?? PHASE_TINT[0];
  const [tr, tg, tb] = hexToRgb(tint.color);
  const tintOp = Math.min(tint.ext, 0.4);

  /** The pit road's own coverage at a pit-art coordinate, 0..1, softened by
   *  EDGE_SOFT. Using the SOURCE art's alpha means the carved road is exactly
   *  the pit road's silhouette continuing upward — its verge lines up with the
   *  pit's at the join by construction, instead of two independently ragged
   *  edges meeting in a step. */
  const roadMask = (px, py) => {
    const y = Math.max(0, Math.min(pit.H - 1, Math.round(py)));
    // distance (in pit px) from px to the nearest transparent pixel on this row
    let dist = EDGE_SOFT * PIT_PER_FOUND + 1;
    const cx = Math.round(px);
    const span = Math.ceil(EDGE_SOFT * PIT_PER_FOUND) + 1;
    if (pit.data[(y * pit.W + Math.max(0, Math.min(pit.W - 1, cx))) * pit.C + 3] <= 40) return 0;
    for (let d = 1; d <= span; d++) {
      const l = Math.max(0, cx - d);
      const r = Math.min(pit.W - 1, cx + d);
      if (pit.data[(y * pit.W + l) * pit.C + 3] <= 40 || pit.data[(y * pit.W + r) * pit.C + 3] <= 40) {
        dist = d;
        break;
      }
    }
    return smoothstep(dist / (EDGE_SOFT * PIT_PER_FOUND));
  };

  /** Bilinear sample of the pit road, in pit art coords, with the phase tint baked in. */
  const samplePit = (px, py) => {
    const x0 = Math.max(0, Math.min(pit.W - 1, Math.floor(px)));
    const y0 = Math.max(0, Math.min(pit.H - 1, Math.floor(py)));
    const x1 = Math.min(pit.W - 1, x0 + 1);
    const y1 = Math.min(pit.H - 1, y0 + 1);
    const fx = px - x0;
    const fy = py - y0;
    const out = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const v =
        pit.data[(y0 * pit.W + x0) * pit.C + c] * (1 - fx) * (1 - fy) +
        pit.data[(y0 * pit.W + x1) * pit.C + c] * fx * (1 - fy) +
        pit.data[(y1 * pit.W + x0) * pit.C + c] * (1 - fx) * fy +
        pit.data[(y1 * pit.W + x1) * pit.C + c] * fx * fy;
      // bake the runtime tint the pit receives, so both halves match
      const t = c === 0 ? tr : c === 1 ? tg : tb;
      out[c] = v + (t - v) * tintOp;
    }
    return out;
  };

  const roadRows = FOUND_H - ROAD_TOP; // 36
  for (let y = ROAD_TOP; y < FOUND_H; y++) {
    const down = y - ROAD_TOP; // 0 at the top of the carve
    // Vertical emergence: the road fades in from under the stone course.
    const vW = smoothstep(down / TOP_FEATHER);
    // Under-house shading, deepest at the top, plus a contact-shadow band.
    const depth = 1 - down / (roadRows - 1);
    let shade = SHADE_AT_TOP + (1 - SHADE_AT_TOP) * (1 - depth * depth);
    if (down < CONTACT_ROWS) {
      shade *= 1 - CONTACT_STRENGTH * (1 - down / CONTACT_ROWS);
    }
    // Source row in pit space: foundation bottom maps to pit row 0, going up.
    const pitY = (FOUND_H - 1 - y) * PIT_PER_FOUND;

    for (let x = ROAD_X0; x <= ROAD_X1; x++) {
      const pitX = PIT_ROAD_X0 + (x - ROAD_X0) * PIT_PER_FOUND;
      const w = vW * roadMask(pitX, pitY);
      if (w <= 0) continue;

      const src = samplePit(pitX, pitY);
      // Fine grain so the resample cannot read as soft/blurry against the
      // crisp painted stone above it.
      const grain = (noise2(x * 0.37, y * 0.41) - 0.5) * 7;

      const i = (y * W + x) * C;
      for (let c = 0; c < 3; c++) {
        const target = src[c] * shade + grain;
        data[i + c] = clamp255(Math.round(data[i + c] + (target - data[i + c]) * w));
      }
      // The road must be solid all the way to the bottom edge so it meets the
      // pit art flush; the foundation's own bottom alpha is ragged and, on one
      // side, stops short of the corridor.
      const a = data[i + 3];
      data[i + 3] = Math.max(a, Math.round(255 * w));
    }
  }

  const out = path.join(ENV_DIR, `${name}.png`);
  await sharp(data, { raw: { width: W, height: H, channels: C } }).png().toFile(out);
  const back = await sharp(fs.readFileSync(out)).metadata();
  if (back.width !== 792 || back.height !== FOUND_H) {
    throw new Error(`${name}: dimension drift -> ${back.width}x${back.height}`);
  }
  console.log(
    `${name}.png (792x120) — road carved x ${ROAD_X0}..${ROAD_X1}, y ${ROAD_TOP}..${FOUND_H - 1}` +
    `, phase tint ${tint.color} @ ${tintOp.toFixed(2)}`
  );
}

const pit = await loadPitRoad();
console.log(`pit_entrance.png source ${pit.W}x${pit.H}; road x ${PIT_ROAD_X0}..${PIT_ROAD_X1}\n`);
for (let p = 0; p <= 5; p++) await carve(p, pit);
console.log('\nDone. The pit road now runs up under the house at every phase.');
