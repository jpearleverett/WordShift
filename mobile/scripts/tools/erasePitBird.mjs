/**
 * erasePitBird.mjs — remove the static FLYING birds from the Offering Pit skies.
 *
 * Problem:
 *   The pit backdrops are painterly pixel art with critters baked in, and
 *   `OfferingPitScreen.tsx:2377` just blits them, so there is no runtime fix.
 *   A bird frozen mid-glide in a scene where nothing else is still reads as a
 *   rendering fault rather than atmosphere.
 *
 * Inventory — every pit backdrop was decoded and inspected at 8-20x. Note that
 * the two pitt_afternoon birds are NOT visible at ordinary zoom against that
 * scene's bright sunset haze; they were confirmed by contrast-stretching the
 * crop and then measured: each sits in sky that is flat to within 1-4/255 while
 * the bird itself spans 99 and 61 respectively, so they are real painted objects
 * rather than cloud texture. All coordinates are in the 941x1672 image space:
 *   pitt_day        a large hawk gliding over the mountains,  x 523..565, y 437..467
 *   pitt_afternoon  a flying bird just above the main peak,   x 343..355, y 372..381
 *   pitt_afternoon  a fainter second bird further right,      x 598..613, y 421..428
 *   pitt_dusk       NO bird. Untouched.
 *   pitt_night      a PERCHED owl in the right-hand tree,     x 850..882, y 628..672
 *   pitt_peace      the same owl (it is a tone-graded derivative of pitt_night)
 *   pitt_day        a perched SQUIRREL on the same trunk,     x ~846..890, y ~648..695
 *
 *   Only the FLYING bird is erased. The perched owl and the squirrel are not
 *   wrong art: a sitting animal is SUPPOSED to be still, so it reads as scenery,
 *   while a bird frozen mid-glide reads as a stalled animation. The owl job is
 *   written out below and disabled by one flag, so reversing that call is a
 *   one-line change.
 *
 * Two inpainting modes, both prototyped and measured before being written down:
 *
 *   'texture' — for the hawk. It is a large hole in smooth but visibly DITHERED
 *     sky, with a mountain to the left and cloud above, so no single clean clone
 *     donor exists. Fill = a low-frequency term (per-row interpolation between
 *     averaged clean strips either side, vertically smoothed) PLUS the high-pass
 *     of a texture donor taken from the sky immediately to the right. The
 *     low-frequency term reproduces the vertical gradient and the horizontal
 *     cloud wisps exactly — the endpoints match by construction, so there is no
 *     seam — while the high-pass term puts the art's own grain back. Without it
 *     the patch is texture-DEAD: plain interpolation measured a Laplacian HF-RMS
 *     of 1.2 inside the patch against 4.9 in the neighbouring sky, which reads as
 *     a soft blur blotch on close inspection. With it, 3.9 vs 4.9.
 *
 *   'clone' — for the small birds. Copy a same-row donor offset purely
 *     HORIZONTALLY (dy is always 0), through a feathered ellipse inside a hard
 *     clip rect. The horizontal offset is the whole trick: the gradient here is
 *     vertical, so shifting along x preserves it exactly and only displaces
 *     horizontal structure, which over 24-26px is below quantisation. Two
 *     alternatives were tried and rejected — clone with mean-offset colour
 *     matching left a visible circular halo in the smooth sky, and per-row
 *     left/right interpolation smeared the mountain ridge rightward, because the
 *     left sample strip crosses it.
 *
 * Idempotent: on first run each live WebP is decoded losslessly to
 *   assets/raw/<name>_prebird.png and every run reads FROM that pristine backup,
 *   so re-running never compounds a patch or stacks WebP generations. Those
 *   backups are COMMITTED and are the only surviving source: the pit backdrops'
 *   original PNGs were deleted when they were re-encoded to WebP.
 *
 * Deliberately does NOT use encodeBackgroundsWebp.mjs (its `assets/environment/
 * *.png` inputs no longer exist, and pitt_peace is not in its list) and does NOT
 * re-run settleSkies.mjs (pitt_peace is patched directly here instead, verified
 * to give the same result without re-deriving it).
 *
 * Usage (from mobile/):
 *   node scripts/tools/erasePitBird.mjs
 * Requires sharp (build-time only, like encodeBackgroundsWebp.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// libvips caches decoded files by path; without this the post-write verification
// is served the PRE-write image and reports nonsense.
sharp.cache(false);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_DIR = path.resolve(__dirname, '../../assets/environment');
const RAW_DIR = path.resolve(__dirname, '../../assets/raw');

// A perched owl is not a broken animation (see the header). Flip to true to
// erase it from pitt_night + pitt_peace as well; the job is measured and safe.
const ERASE_PERCHED_OWL = false;

const WEBP_QUALITY = 90; // matches encodeBackgroundsWebp.mjs and settleSkies.mjs

/**
 * One inpaint job. `file` is the backdrop it applies to.
 *  texture: patch rect + a donor offset whose high-frequency detail is reinjected.
 *  clone:   a feathered ellipse filled from a purely horizontal donor offset,
 *           never writing outside `clip`.
 */
const JOBS = [
  {
    id: 'hawk',
    file: 'pitt_day',
    mode: 'texture',
    // Deliberately overhangs the bird's bbox: the leftmost wing pixels sit at
    // x 523-524, y 461-464, so x0 must not creep past 519.
    x0: 519, x1: 574, y0: 430, y1: 475,
    donorDx: 66, donorDy: 0, // the immediate right-hand sky: same grain, same gradient phase
  },
  {
    id: 'afternoon-bird',
    file: 'pitt_afternoon',
    mode: 'clone',
    cx: 349, cy: 376.5, rx: 9, ry: 6.5, feather: 4,
    dx: 24, noise: 0.8, seed: 7,
    // The bottom edge is load-bearing: the mountain ridge starts at y >= 382 for
    // x <= 346 and must not be cloned over.
    clip: [336, 366, 362, 384],
  },
  {
    id: 'afternoon-distant-bird',
    file: 'pitt_afternoon',
    mode: 'clone',
    cx: 606, cy: 424.5, rx: 10, ry: 6, feather: 4,
    dx: 26, noise: 0.8, seed: 11,
    clip: [580, 408, 640, 442],
  },
  {
    id: 'owl',
    file: 'pitt_night',
    mode: 'clone',
    cx: 866, cy: 649, rx: 18, ry: 22, feather: 6,
    dx: 44, noise: 1.5, seed: 3,
    // Left edge protects the lit branch highlight at x 833..842; bottom edge
    // preserves the branch running under the owl.
    clip: [845, 622, 892, 674],
    perched: true,
  },
  {
    id: 'owl',
    file: 'pitt_peace',
    mode: 'clone',
    cx: 866, cy: 649, rx: 18, ry: 22, feather: 6,
    dx: 44, noise: 1.5, seed: 3,
    clip: [845, 622, 892, 674],
    perched: true,
  },
];

// --- 'texture' mode tuning ---------------------------------------------------
const SAMPLE = 12;   // width of the clean strip averaged either side of the hole
const FEATHER = 5;   // px over which the patch fades into the original art
const SMOOTH = 2;    // half-width of the vertical box blur on the endpoint series
const HP_RADIUS = 2; // box-blur radius used to high-pass the texture donor
const HP_CLAMP = 5;  // lets pixel-scale grain through, suppresses donor cloud edges

const clamp255 = v => (v < 0 ? 0 : v > 255 ? 255 : v);
const smoothstep = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** Seeded LCG so every run is byte-reproducible (no Math.random). */
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

async function pristine(name) {
  const backup = path.join(RAW_DIR, `${name}_prebird.png`);
  if (!fs.existsSync(backup)) {
    await sharp(path.join(ENV_DIR, `${name}.webp`)).png().toFile(backup);
    console.log(`  backed up pristine ${name} -> assets/raw/${name}_prebird.png`);
  }
  return sharp(backup).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}

/** Blur a per-row endpoint series with a (2*SMOOTH+1)-tap box kernel. */
function smoothSeries(series) {
  return series.map((_, i) => {
    const out = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      let sum = 0;
      let n = 0;
      for (let k = -SMOOTH; k <= SMOOTH; k++) {
        const j = i + k;
        if (j < 0 || j >= series.length) continue;
        sum += series[j][c];
        n++;
      }
      out[c] = sum / n;
    }
    return out;
  });
}

function applyTexture(job, data, src, W, H, C) {
  const { x0, x1, y0, y1, donorDx, donorDy } = job;
  const at = (buf, x, y, c) =>
    buf[(Math.max(0, Math.min(H - 1, y)) * W + Math.max(0, Math.min(W - 1, x))) * C + c];

  // Low-frequency endpoints: averaged clean sky either side of the hole, per row.
  const rows = y1 - y0 + 1;
  const rawL = [];
  const rawR = [];
  for (let r = 0; r < rows; r++) {
    const y = y0 + r;
    const l = [0, 0, 0];
    const rt = [0, 0, 0];
    for (let k = 1; k <= SAMPLE; k++) {
      for (let c = 0; c < 3; c++) {
        l[c] += at(src, x0 - k, y, c);
        rt[c] += at(src, x1 + k, y, c);
      }
    }
    rawL.push(l.map(v => v / SAMPLE));
    rawR.push(rt.map(v => v / SAMPLE));
  }
  const left = smoothSeries(rawL);
  const right = smoothSeries(rawR);

  // High-pass of the donor: donor minus its own box blur, so only grain survives.
  const boxBlur = (x, y, c) => {
    let sum = 0;
    let n = 0;
    for (let dy = -HP_RADIUS; dy <= HP_RADIUS; dy++) {
      for (let dx = -HP_RADIUS; dx <= HP_RADIUS; dx++) {
        sum += at(src, x + dx, y + dy, c);
        n++;
      }
    }
    return sum / n;
  };

  for (let r = 0; r < rows; r++) {
    const y = y0 + r;
    const vW = Math.min(1, (Math.min(r, rows - 1 - r) + 0.5) / FEATHER);
    for (let x = x0; x <= x1; x++) {
      const hW = Math.min(1, (Math.min(x - x0, x1 - x) + 0.5) / FEATHER);
      const w = vW * hW;
      if (w <= 0) continue;
      const t = (x - x0) / (x1 - x0 || 1);
      const i = (y * W + x) * C;
      for (let c = 0; c < 3; c++) {
        const lowFreq = left[r][c] + (right[r][c] - left[r][c]) * t;
        const dxs = x + donorDx;
        const dys = y + donorDy;
        const hf = Math.max(-HP_CLAMP, Math.min(HP_CLAMP, at(src, dxs, dys, c) - boxBlur(dxs, dys, c)));
        const fill = lowFreq + hf;
        data[i + c] = clamp255(Math.round(src[i + c] + (fill - src[i + c]) * w));
      }
    }
  }
}

function applyClone(job, data, src, W, H, C) {
  const { cx, cy, rx, ry, feather, dx, noise, seed, clip } = job;
  const [cx0, cy0, cx1, cy1] = clip;
  const rand = lcg(seed);
  const fRel = feather / Math.min(rx, ry);
  for (let y = cy0; y <= cy1; y++) {
    if (y < 0 || y >= H) continue;
    for (let x = cx0; x <= cx1; x++) {
      if (x < 0 || x >= W) continue;
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      let a;
      if (d <= 1) a = 1;
      else if (d <= 1 + fRel) a = 1 - smoothstep((d - 1) / fRel);
      else a = 0;
      if (a <= 0) continue;
      const i = (y * W + x) * C;
      // Donor read from the PRISTINE snapshot — a job's donor columns can
      // overlap its own write region.
      const sx = Math.max(0, Math.min(W - 1, x + dx));
      for (let c = 0; c < 3; c++) {
        const fill = src[(y * W + sx) * C + c] + (rand() - 0.5) * 2 * noise;
        data[i + c] = clamp255(Math.round(src[i + c] + (fill - src[i + c]) * a));
      }
    }
  }
}

async function processFile(name, jobs) {
  const { data: srcBuf, info } = await pristine(name);
  const { width: W, height: H, channels: C } = info;
  if (C !== 3) throw new Error(`${name}: expected 3 channels, got ${C}`);
  const src = Buffer.from(srcBuf); // immutable pristine reference for every donor read
  const data = Buffer.from(srcBuf);

  for (const job of jobs) {
    if (job.mode === 'texture') applyTexture(job, data, src, W, H, C);
    else applyClone(job, data, src, W, H, C);
  }

  const out = path.join(ENV_DIR, `${name}.webp`);
  await sharp(data, { raw: { width: W, height: H, channels: C } })
    .webp({ quality: WEBP_QUALITY, effort: 6 })
    .toFile(out);

  const back = await sharp(fs.readFileSync(out)).metadata();
  if (back.width !== W || back.height !== H) {
    throw new Error(`${name}: dimension drift ${W}x${H} -> ${back.width}x${back.height}`);
  }
  const { data: after, info: ai } = await sharp(fs.readFileSync(out))
    .raw()
    .toBuffer({ resolveWithObject: true });
  // settleSkies.mjs throws on a 4-channel pit backdrop, which would break the
  // pitt_peace derivation forever.
  if (ai.channels !== 3) throw new Error(`${name}: re-encoded to ${ai.channels} channels, must stay 3`);

  for (const job of jobs) {
    if (job.mode === 'texture') {
      const { x0, x1, y0, y1 } = job;
      let worst = 0;
      for (let y = y0; y <= y1; y++) {
        let ref = 0;
        for (let k = 1; k <= SAMPLE; k++) {
          const i = (y * W + Math.min(W - 1, x1 + k)) * C;
          ref += after[i] + after[i + 1] + after[i + 2];
        }
        ref /= SAMPLE;
        for (let x = x0; x <= x1; x++) {
          const i = (y * W + x) * C;
          worst = Math.max(worst, ref - (after[i] + after[i + 1] + after[i + 2]));
        }
      }
      if (worst > 40) throw new Error(`${name}/${job.id}: residual darkness ${worst.toFixed(1)}/765 — a wing survived`);
      console.log(`  ${name}/${job.id} [texture] worst residual darkness ${worst.toFixed(1)}/765 (bird present measured 254.1)`);
    } else {
      const [a0, b0, a1, b1] = job.clip;
      // Measured over the ellipse CORE, not the whole clip rect: the clip is
      // deliberately larger than the critter (it exists to protect neighbouring
      // art), so averaging over it dilutes the signal below any useful threshold.
      let changed = 0;
      let n = 0;
      let maxCore = 0;
      for (let y = b0; y <= b1; y++) {
        for (let x = a0; x <= a1; x++) {
          const d = Math.hypot((x - job.cx) / job.rx, (y - job.cy) / job.ry);
          if (d > 1) continue;
          const i = (y * W + x) * C;
          changed += Math.abs(after[i] - src[i]) + Math.abs(after[i + 1] - src[i + 1]) + Math.abs(after[i + 2] - src[i + 2]);
          n++;
          const si = (y * W + Math.min(W - 1, x + job.dx)) * C;
          maxCore = Math.max(
            maxCore,
            Math.abs(after[i] - src[si]) + Math.abs(after[i + 1] - src[si + 1]) + Math.abs(after[i + 2] - src[si + 2]),
          );
        }
      }
      const mean = changed / Math.max(1, n);
      if (mean <= 8) throw new Error(`${name}/${job.id}: mean core change ${mean.toFixed(1)}/765 — the erase did not happen`);
      if (maxCore > 14) throw new Error(`${name}/${job.id}: core deviates ${maxCore.toFixed(1)}/765 from the donor`);
      console.log(`  ${name}/${job.id} [clone] mean core change ${mean.toFixed(1)}/765, core vs donor ${maxCore.toFixed(1)}/765`);
    }
  }
  console.log(`${name}.webp (${W}x${H}) rewritten\n`);
}

const active = JOBS.filter(j => ERASE_PERCHED_OWL || !j.perched);
const byFile = new Map();
for (const j of active) {
  if (!byFile.has(j.file)) byFile.set(j.file, []);
  byFile.get(j.file).push(j);
}
for (const [name, jobs] of byFile) await processFile(name, jobs);
console.log(
  `Done. ${active.length} static flying bird(s) erased across ${byFile.size} pit backdrop(s). ` +
  (ERASE_PERCHED_OWL
    ? 'The perched owl was erased from pitt_night and pitt_peace too.'
    : 'The perched owl (pitt_night/pitt_peace) and the trunk squirrel (pitt_day) were left in place: a sitting animal reads as scenery, not as a stalled animation. Set ERASE_PERCHED_OWL to change that.')
);
