/**
 * settleSkies.mjs — the Terrible Peace gets its own world.
 *
 * Problem (design pass, 2026-09-01): Phase 5 rendered the exact night of the
 * arrival — sky_shadow (with the entity's two faint ember eyes still watching
 * at full Phase-4 intensity), the phase-4 foundation, and pitt_night — even
 * though every other surface (PhaseTheme #1E1E30 "dawn after the storm",
 * panel skins, dialogue) has a distinct serene register. The endgame cohort
 * lives on the home screen (tending, dialogue, the pit) and it permanently
 * looked like the reveal.
 *
 * This script DERIVES three settled assets from the live art (never from the
 * pristine pre-rework raws — the demon-face absorption in reworkSkies.mjs is
 * the base look):
 *   - sky_peace.webp   <- sky_shadow.webp:  the ember eyes EXTINGUISHED (it
 *     has settled; the 0.35 ShadowFigure overlay carries the presence now),
 *     the red mist drained to mauve-grey, the register lifted toward the
 *     serene mauve family, a faint warm band at the horizon like a dawn that
 *     never quite comes, and a few still stars readmitted at the edges.
 *   - pitt_peace.webp  <- pitt_night.webp:  the same mauve settle, gentler,
 *     with the pit's teal glow explicitly protected (green-dominant pixels
 *     keep their color).
 *   - foundation_5.png <- foundation_4.png: a mauve relight of the night
 *     foundation (alpha preserved exactly).
 *
 * Idempotent: always reads the LIVE shadow/night assets (which reworkSkies /
 * processRawWorldArt regenerate from their own pristine sources), so re-runs
 * never compound. Dimensions are preserved exactly and round-trip-guarded
 * (skyGeometry.test.ts pins 941x1972). Prints the top/bottom row averages
 * for PHASE_BG_COLORS / PHASE_GROUND_COLORS / PHASE_SKY_FILL /
 * getScreenBackgroundColor('home') re-sampling.
 *
 * Needs `sharp` (build-time only, like encodeBackgroundsWebp.mjs):
 *   npm i -D sharp && node scripts/tools/settleSkies.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import sharp from 'sharp';

const ENV_DIR = 'assets/environment';

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const mix = (a, b, t) => a + (b - a) * t;
function smoothstep(e0, e1, x) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Raw RGB buffer helpers (sharp .raw() output, 3 channels). */
function px(buf, W, x, y) {
  const i = (y * W + x) * 3;
  return [buf[i], buf[i + 1], buf[i + 2]];
}
function setPx(buf, W, x, y, r, g, b) {
  const i = (y * W + x) * 3;
  buf[i] = clamp255(Math.round(r));
  buf[i + 1] = clamp255(Math.round(g));
  buf[i + 2] = clamp255(Math.round(b));
}
function rowAvgHex(buf, W, y) {
  let r = 0, g = 0, b = 0;
  for (let x = 0; x < W; x++) {
    const [pr, pg, pb] = px(buf, W, x, y);
    r += pr; g += pg; b += pb;
  }
  return (
    '#' + [r / W, g / W, b / W].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
  );
}

// ---------------------------------------------------------------------------
// The settle grade, shared by sky and foundation: drain redness, then blend
// each pixel toward a mauve rendering of its own luminance. `t` scales with
// darkness so the (rare) bright pixels are never blown out.
// ---------------------------------------------------------------------------
function settleChannel(r, g, b, strength) {
  const L = lum(r, g, b);
  // 1) Redness drain: the arrival's crimson leaves the sky.
  const redness = r - (g + b) / 2;
  let nr = redness > 2 ? r - redness * 0.6 : r;
  // 2) Mauve settle: toward a lifted mauve of the pixel's own luminance.
  const t = strength * (1 - smoothstep(60, 140, L));
  const tr = L * 1.1 + 26;
  const tg = L * 0.95 + 18;
  const tb = L * 1.3 + 40;
  return [mix(nr, tr, t), mix(g, tg, t), mix(b, tb, t)];
}

// ---------------------------------------------------------------------------
// sky_peace <- sky_shadow
// ---------------------------------------------------------------------------
async function settleSky() {
  const src = sharp(path.join(ENV_DIR, 'sky_shadow.webp'));
  const meta = await src.metadata();
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) throw new Error(`sky_shadow decoded with ${info.channels} channels`);
  const W = info.width, H = info.height;

  // 1) EXTINGUISH the ember eyes (coords from reworkSkies.mjs, where they
  //    were re-added). Pull each disc toward a local per-row reference so the
  //    mass tone stays continuous; deviation weighting erases the warm points
  //    hardest.
  const EYES = [{ x: 437, y: 344 }, { x: 528, y: 341 }];
  for (const eye of EYES) {
    const R = 44;
    for (let y = Math.max(0, eye.y - R); y <= Math.min(H - 1, eye.y + R); y++) {
      // Per-row reference from a ring outside the ember's halo.
      let rr = 0, rg = 0, rb = 0, n = 0;
      for (const side of [-1, 1]) {
        for (let dx = R + 8; dx <= R + 40; dx += 2) {
          const x = eye.x + side * dx;
          if (x < 0 || x >= W) continue;
          const [pr, pg, pb] = px(data, W, x, y);
          rr += pr; rg += pg; rb += pb; n++;
        }
      }
      if (!n) continue;
      rr /= n; rg /= n; rb /= n;
      for (let x = Math.max(0, eye.x - R); x <= Math.min(W - 1, eye.x + R); x++) {
        const d = Math.hypot(x - eye.x, y - eye.y);
        const fall = 1 - smoothstep(R * 0.25, R, d);
        if (fall <= 0) continue;
        const [r, g, b] = px(data, W, x, y);
        const dev = Math.max(Math.abs(r - rr), Math.abs(g - rg), Math.abs(b - rb)) / 255;
        const s = fall * Math.min(0.95, 0.35 + dev * 4.0);
        setPx(data, W, x, y, mix(r, rr, s), mix(g, rg, s), mix(b, rb, s));
      }
    }
  }

  // 2) The settle grade, full frame.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = px(data, W, x, y);
      const [nr, ng, nb] = settleChannel(r, g, b, 0.62);
      setPx(data, W, x, y, nr, ng, nb);
    }
  }

  // 3) Horizon band: a faint warm-mauve lift around the visible horizon (the
  //    foundation seats at image rows ~1360-1470) — the dawn that never
  //    quite comes.
  const HORIZON = { cy: 1300, sigma: 120 };
  for (let y = HORIZON.cy - 340; y <= HORIZON.cy + 340; y++) {
    if (y < 0 || y >= H) continue;
    const band = Math.exp(-((y - HORIZON.cy) ** 2) / (2 * HORIZON.sigma * HORIZON.sigma));
    if (band < 0.03) continue;
    for (let x = 0; x < W; x++) {
      const [r, g, b] = px(data, W, x, y);
      setPx(data, W, x, y, r + 13 * band, g + 8 * band, b + 9 * band);
    }
  }

  // 4) Still stars, readmitted at the EDGES only (the towering mass keeps the
  //    center; the sky has stopped watching, but it is a night sky again).
  //    Deterministic points, faint cool-mauve white.
  const STARS = [
    { x: 74, y: 88, a: 1.0 }, { x: 132, y: 214, a: 0.7 }, { x: 48, y: 388, a: 0.8 },
    { x: 158, y: 496, a: 0.55 }, { x: 96, y: 610, a: 0.6 },
    { x: 872, y: 120, a: 0.9 }, { x: 908, y: 262, a: 0.65 }, { x: 836, y: 420, a: 0.7 },
    { x: 884, y: 560, a: 0.5 }, { x: 796, y: 74, a: 0.6 },
  ];
  for (const s of STARS) {
    for (let y = s.y - 10; y <= s.y + 10; y++) {
      for (let x = s.x - 10; x <= s.x + 10; x++) {
        if (x < 0 || x >= W || y < 0 || y >= H) continue;
        const d2 = (x - s.x) ** 2 + (y - s.y) ** 2;
        const core = Math.exp(-d2 / (2 * 1.4 * 1.4));
        const halo = Math.exp(-d2 / (2 * 4.2 * 4.2));
        const add = (46 * core + 9 * halo) * s.a;
        if (add < 0.8) continue;
        const [r, g, b] = px(data, W, x, y);
        setPx(data, W, x, y, r + add * 0.92, g + add * 0.9, b + add);
      }
    }
  }

  const out = path.join(ENV_DIR, 'sky_peace.webp');
  await sharp(data, { raw: { width: W, height: H, channels: 3 } })
    .webp({ quality: 90, effort: 6 })
    .toFile(out);
  const back = await sharp(out).metadata();
  if (back.width !== meta.width || back.height !== meta.height) {
    throw new Error(`sky_peace: dimension drift ${meta.width}x${meta.height} -> ${back.width}x${back.height}`);
  }
  console.log(`sky_peace.webp written (${W}x${H})`);
  console.log(`  top row avg    ${rowAvgHex(data, W, 0)}`);
  console.log(`  bottom row avg ${rowAvgHex(data, W, H - 1)}`);
}

// ---------------------------------------------------------------------------
// pitt_peace <- pitt_night (teal glow protected)
// ---------------------------------------------------------------------------
async function settlePit() {
  const src = sharp(path.join(ENV_DIR, 'pitt_night.webp'));
  const meta = await src.metadata();
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 3) throw new Error(`pitt_night decoded with ${info.channels} channels`);
  const W = info.width, H = info.height;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const [r, g, b] = px(data, W, x, y);
      // Teal protection: the pit's glow is green-dominant; leave it alone.
      const cyanness = smoothstep(6, 34, g - r);
      const strength = 0.34 * (1 - cyanness);
      if (strength <= 0.01) continue;
      const [nr, ng, nb] = settleChannel(r, g, b, strength);
      setPx(data, W, x, y, nr, ng, nb);
    }
  }

  const out = path.join(ENV_DIR, 'pitt_peace.webp');
  await sharp(data, { raw: { width: W, height: H, channels: 3 } })
    .webp({ quality: 90, effort: 6 })
    .toFile(out);
  const back = await sharp(out).metadata();
  if (back.width !== meta.width || back.height !== meta.height) {
    throw new Error(`pitt_peace: dimension drift`);
  }
  console.log(`pitt_peace.webp written (${W}x${H})`);
  console.log(`  top row avg    ${rowAvgHex(data, W, 0)}`);
}

// ---------------------------------------------------------------------------
// foundation_5.png <- foundation_4.png (alpha preserved)
// ---------------------------------------------------------------------------
function settleFoundation() {
  const img = PNG.sync.read(fs.readFileSync(path.join(ENV_DIR, 'foundation_4.png')));
  const { width: W, height: H } = img;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const a = img.data[i + 3];
      if (a === 0) continue; // fully transparent: leave untouched
      const [nr, ng, nb] = settleChannel(img.data[i], img.data[i + 1], img.data[i + 2], 0.5);
      img.data[i] = clamp255(Math.round(nr));
      img.data[i + 1] = clamp255(Math.round(ng));
      img.data[i + 2] = clamp255(Math.round(nb));
      // alpha untouched
    }
  }
  fs.writeFileSync(path.join(ENV_DIR, 'foundation_5.png'), PNG.sync.write(img, { colorType: 6 }));
  console.log(`foundation_5.png written (${W}x${H}, alpha preserved)`);
}

await settleSky();
await settlePit();
settleFoundation();
console.log(
  '\nDone. Wire sky_peace/pitt_peace/foundation_5 into HouseWorld/OfferingPitScreen,' +
  '\nand update PHASE_BG_COLORS / PHASE_GROUND_COLORS / PHASE_SKY_FILL /' +
  "\ngetScreenBackgroundColor('home') phase-5 rows with the samples above."
);
