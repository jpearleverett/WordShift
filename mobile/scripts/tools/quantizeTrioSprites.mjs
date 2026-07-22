#!/usr/bin/env node
// quantizeTrioSprites.mjs — re-finish the descent-trio character sprites
// (tarsier/aye_aye/kakapo) to match the hard cel-pixel look of the other ten
// animals. The trio's nine frames (idle/talk/robed x 3 animals) were
// player-provided painterly art, downscaled to 500x500 but never re-graded to
// the flat-shaded, crisp-edged finish the rest of the cast uses.
//
// For each frame this does exactly two things, conservatively:
//   1. Palette-quantizes the opaque RGB to ~32-40 colors via median-cut
//      (weighted by pixel frequency, computed at full precision so subtle
//      but common tones survive) — this crisps soft painterly shading into
//      flat cel bands without altering the silhouette or feature placement.
//   2. Hard-snaps alpha to fully opaque/fully transparent at a ~45% (115/255)
//      threshold — this removes soft antialiased-alpha fringing so edges read
//      as crisp pixel-art cutouts instead of feathered gradients.
//
// The 500x500 canvas and existing framing are untouched (no resample, no
// recrop, no recolor of the transparent surround) so AnimalSprite/
// FLOOR_OFFSET wiring and the idle/talk toggle stay byte-aligned.
//
// Re-encodes through pngjs to a minimal IHDR/IDAT/IEND RGBA PNG (Android-safe,
// no iCCP profile), same shape as sanitizePng.mjs/processAppIcon.mjs.
//
// Run: node scripts/tools/quantizeTrioSprites.mjs   (from mobile/)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, '../../assets');

const ANIMALS = ['tarsier', 'aye_aye', 'kakapo'];
const FRAMES = ['idle', 'talk', 'robed'];

const TARGET_COLORS = 36; // within the requested ~32-40 band
const ALPHA_THRESHOLD = 115; // ~45% of 255

/**
 * Median-cut palette builder. `colors` is an array of {r,g,b,count} unique
 * full-precision colors (from opaque pixels only). Recursively splits the
 * bucket with the greatest single-channel range at its weighted median,
 * until `targetCount` buckets exist (or no bucket can be split further),
 * then returns the weighted-average color of each bucket.
 */
function medianCutPalette(colors, targetCount) {
  let buckets = [colors];
  while (buckets.length < targetCount) {
    let splitIdx = -1;
    let bestRange = -1;
    let bestChannel = 'r';
    for (let i = 0; i < buckets.length; i++) {
      const bucket = buckets[i];
      if (bucket.length <= 1) continue;
      for (const ch of ['r', 'g', 'b']) {
        let min = 255;
        let max = 0;
        for (const c of bucket) {
          if (c[ch] < min) min = c[ch];
          if (c[ch] > max) max = c[ch];
        }
        const range = max - min;
        if (range > bestRange) {
          bestRange = range;
          splitIdx = i;
          bestChannel = ch;
        }
      }
    }
    if (splitIdx === -1 || bestRange <= 0) break; // nothing left worth splitting

    const bucket = buckets[splitIdx];
    bucket.sort((a, b) => a[bestChannel] - b[bestChannel]);
    const totalWeight = bucket.reduce((sum, c) => sum + c.count, 0);
    let acc = 0;
    let cut = 0;
    for (; cut < bucket.length; cut++) {
      acc += bucket[cut].count;
      if (acc >= totalWeight / 2) break;
    }
    cut = Math.max(1, Math.min(bucket.length - 1, cut));
    const a = bucket.slice(0, cut);
    const b = bucket.slice(cut);
    buckets.splice(splitIdx, 1, a, b);
  }

  return buckets.map((bucket) => {
    let r = 0, g = 0, b = 0, total = 0;
    for (const c of bucket) {
      r += c.r * c.count;
      g += c.g * c.count;
      b += c.b * c.count;
      total += c.count;
    }
    return total > 0
      ? { r: Math.round(r / total), g: Math.round(g / total), b: Math.round(b / total) }
      : { r: 0, g: 0, b: 0 };
  });
}

function nearestPaletteIndex(palette, r, g, b) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const dr = p.r - r, dg = p.g - g, db = p.b - b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

function processFrame(file) {
  const src = PNG.sync.read(fs.readFileSync(file));
  const { width, height, data } = src;
  const pixelCount = width * height;

  // Pass 1: hard alpha snap + histogram of opaque full-precision colors.
  const alphaSnap = new Uint8Array(pixelCount);
  const histogram = new Map();
  let beforeUniqueAlpha = new Set();
  let beforeUniqueColor = new Set();
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4;
    const a = data[o + 3];
    beforeUniqueAlpha.add(a);
    if (a >= ALPHA_THRESHOLD) {
      alphaSnap[i] = 255;
      const r = data[o], g = data[o + 1], b = data[o + 2];
      beforeUniqueColor.add((r << 16) | (g << 8) | b);
      const key = (r << 16) | (g << 8) | b;
      const existing = histogram.get(key);
      if (existing) existing.count++;
      else histogram.set(key, { r, g, b, count: 1 });
    } else {
      alphaSnap[i] = 0;
    }
  }

  const uniqueColors = Array.from(histogram.values());
  const palette =
    uniqueColors.length > TARGET_COLORS
      ? medianCutPalette(uniqueColors, TARGET_COLORS)
      : uniqueColors.map((c) => ({ r: c.r, g: c.g, b: c.b }));

  // Cache nearest-palette lookups per exact source color (opaque pixels only
  // repeat a lot fewer distinct colors than raw pixel count).
  const nearestCache = new Map();

  const out = new PNG({ width, height });
  for (let i = 0; i < pixelCount; i++) {
    const o = i * 4;
    if (alphaSnap[i] === 0) {
      out.data[o] = 0;
      out.data[o + 1] = 0;
      out.data[o + 2] = 0;
      out.data[o + 3] = 0;
      continue;
    }
    const r = data[o], g = data[o + 1], b = data[o + 2];
    const key = (r << 16) | (g << 8) | b;
    let idx = nearestCache.get(key);
    if (idx === undefined) {
      idx = nearestPaletteIndex(palette, r, g, b);
      nearestCache.set(key, idx);
    }
    const p = palette[idx];
    out.data[o] = p.r;
    out.data[o + 1] = p.g;
    out.data[o + 2] = p.b;
    out.data[o + 3] = 255;
  }

  const before = fs.statSync(file).size;
  const encoded = PNG.sync.write(out, { colorType: 6 });
  fs.writeFileSync(file, encoded);

  return {
    width,
    height,
    before,
    after: encoded.length,
    beforeUniqueAlpha: beforeUniqueAlpha.size,
    beforeUniqueColor: beforeUniqueColor.size,
    paletteSize: palette.length,
  };
}

for (const animal of ANIMALS) {
  for (const frame of FRAMES) {
    const file = path.join(ASSETS, 'characters', animal, `${frame}.png`);
    const stats = processFrame(file);
    console.log(
      `${animal}/${frame}.png: ${stats.width}x${stats.height}, ` +
        `colors ${stats.beforeUniqueColor}->${stats.paletteSize}, alpha values ${stats.beforeUniqueAlpha}->2, ` +
        `${(stats.before / 1024).toFixed(0)}KB -> ${(stats.after / 1024).toFixed(0)}KB`
    );
  }
}
