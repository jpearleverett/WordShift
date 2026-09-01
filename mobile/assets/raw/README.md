# World-art generation sources

AI-generated pixel-art sources for the house exterior. These are NOT bundled
into the app (nothing `require()`s them) — they are the inputs to:

    node scripts/tools/processRawWorldArt.mjs

which keys out the studio background, crops, downscales, and writes the live
assets to `assets/environment/` (and window masks to `assets/rooms/windows/`).

Sources:
- `roof_raw.png` → `roof.png`
- `phase_1.png` .. `phase_5.png` → `foundation_0.png` .. `foundation_4.png`
  (one hand-lit foundation per phase: day green → dusk dry → night blue;
  normalized to 792×120 so the house never jumps between phases; game phase 5
  uses foundation_5.png, derived from foundation_4.png by
  scripts/tools/settleSkies.mjs — the same pass that derives sky_peace.webp
  and pitt_peace.webp)
- `pit_raw.png` → `pit_entrance.png` (drops the top 45% of the tapered path)
- `wall_raw.png` → `wall.png` (seamless tile)

If you regenerate any raw, re-run the script, then update the aspect constants
in `src/components/home/HouseWorld.tsx` and the seat math in
`src/__tests__/skyGeometry.test.ts` if the content proportions changed.

Note: uploads that arrive as JPEG-with-a-.png-extension are re-encoded to real
PNG before processing (pngjs can't read JPEG). The remaining procedural world
art (clouds, tree, ground, house_shadow) comes from
`scripts/tools/generatePixelWorld.mjs` and `processRawWorldArt.mjs`.

## Pristine backups (retouch tools read FROM these)

Three one-shot retouch tools edit already-committed art. None of them is in
`npm run generate:assets` (like `retouchSkySeam.mjs` / `reworkSkies.mjs` /
`settleSkies.mjs`, they are run by hand over committed art). Each takes a
lossless copy of the live asset on its first run and reads from that copy on
every run after, so re-running never compounds the effect or stacks WebP
generations. Delete a backup only when you want the tool to adopt new upstream
art as its source.

- `sky_*_pretop.png` (6) → `scripts/tools/retouchSkyTopSeam.mjs`
  Pristine `assets/environment/sky_*.webp` before the top band was flattened to
  the declared backdrop hex.
- `pitt_day_prebird.png`, `pitt_afternoon_prebird.png` →
  `scripts/tools/erasePitBird.mjs`
  Pristine `assets/environment/pitt_*.webp` before the flying birds were
  inpainted out. These two are the ONLY surviving source for those backdrops:
  their original PNGs were deleted when the pit art was re-encoded to WebP.
- `foundation_*_preroad.png` (6) → `scripts/tools/carveFoundationRoad.mjs`
  Pristine `assets/environment/foundation_*.png` before the pit's dirt road was
  carved through the vegetation band.

Do not cross the suffixes: `_original` belongs to `reworkSkies.mjs` and
`_preseam` to `retouchSkySeam.mjs`, and reading either from another tool would
silently revert that tool's edits.
