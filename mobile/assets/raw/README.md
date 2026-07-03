# World-art generation sources

AI-generated pixel-art sources for the house exterior. These are NOT bundled
into the app (nothing `require()`s them) — they are the inputs to:

    node scripts/tools/processRawWorldArt.mjs

which keys out the studio background, crops, downscales, and writes the live
assets to `assets/environment/` (roof.png, foundation.png, pit_entrance.png,
wall.png). If you regenerate any raw, re-run that script, then update the
aspect constants in `src/components/home/HouseWorld.tsx` and the seat math in
`src/__tests__/skyGeometry.test.ts` if the content proportions changed.

The remaining procedural world art (clouds, tree, ground) still comes from
`scripts/tools/generatePixelWorld.mjs`.
