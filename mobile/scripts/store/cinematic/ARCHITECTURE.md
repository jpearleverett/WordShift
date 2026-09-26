# Cinematic trailer: how the code fits together

A stylized three.js brand trailer, rendered offline frame by frame. The shot-by-shot
spec is `SPEC.md` (in this folder). This file is the engineering map.

## Run it

```
cd mobile
node scripts/store/cinematic/render.mjs 16x9 --scale=0.5 --stills=4.2,5.0     # half-res stills -> $CINEMATIC_WORK/stills-16x9/tSSS.SS.jpg
node scripts/store/cinematic/render.mjs 9x16 --scale=0.5 --stills=4.2          # the portrait cut (its own camera rigs, never a crop)
node scripts/store/cinematic/render.mjs 16x9 --scale=0.5 --from=345 --to=455   # a frame range (30 fps) as a draft
node scripts/store/cinematic/sheet.mjs 16x9 --draft --from=11.5 --to=15.2 --every=0.25   # contact sheet of draft frames
node scripts/store/cinematic/encode.mjs 16x9 --draft                           # draft MP4 (needs every frame)
node scripts/store/cinematic/audio/score.mjs                                   # the soundtrack -> $CINEMATIC_WORK/score.wav + out/score.m4a
node scripts/store/cinematic/srt.mjs                                           # captions -> out/wordshift-cinematic-captions-en.srt
node scripts/store/cinematic/qa/lint.mjs                                       # copy, words, moves, determinism, asset allowlist
node scripts/store/cinematic/qa/report.mjs [--draft]                           # every QA gate on the encoded MP4s -> out/trailer-report.json
```
`$CINEMATIC_WORK` defaults to `/tmp/wordshift-cinematic`. Chromium runs headless on
SwiftShader (software WebGL): about 0.4-1.2 s per 1080p frame, 4x less at `--scale=0.5`.

## Timing

- `src/grid.data.js` is measured from the music bed by `audio/measure.mjs` (136.1 BPM,
  anchors: drop, break, breath, hit, preHit, finalHit). `src/grid.js` gives `bar(n, beat, eighths)`
  and `anchor(name)`.
- `src/timeline/events.js` holds **every event time** as `E.NAME` (grid expressions) plus the
  caption table. Shots read `E`; the score reads the same `E`, so picture and sound stay locked.
  Add a new event here rather than hard-coding a number in a shot.

## Frame lifecycle

`src/main.js` -> `trailer.update(t)` -> `Pipeline.render(layers, ...)`:

1. `trailer.js` asks the `Timeline` which shot(s) cover `t` (two during a whip transition).
2. For each layer (and each motion-blur subframe) it calls `world.begin()` then `shot.pose(ts, ctx)`.
   `pose` returns `{ scene, camera, look }` and must be a **pure function of time**:
   no `Math.random`, `Date`, `performance.now`, and no state carried between frames
   (any frame renders alone, in any worker, in any order).
3. The pipeline renders scene -> half-res bokeh DOF -> bloom -> grade (AgX, lift/gamma/gain,
   vignette, CA, grain) -> screen, then the 2D overlay (captions, the bubble).
4. `afterRender`: captions update from the caption table; then `shot.overlay?.(t, ctx)` for
   anchored overlay items (bubbles, end line).

## Shots

A shot module `src/shots/<name>.js` exports `async function make(ctx)` returning a shot or
an array of shots:

```js
{
  id: 'S04', start: E.S04, end: E.S05,          // trailer seconds; [start, end)
  transition: { type: 'whip', dur: 0.44, dir: [0, -1] },   // optional, on the INCOMING shot;
                                               // the previous shot's `end` must cover start + dur
  mb: (t) => 3,                                 // optional motion-blur subframes at t (1 = off)
  pose(t, ctx) { ...; return { scene: world.scene, camera, look } },
  overlay(t, ctx) { ... },                      // optional, anchored 2D items
}
```

`ctx` = `{ world, camera, E, portrait, overlay, pxScale, width, height, aspect, renderer }`.
There is one camera; set it every frame with `setAspect(camera, portrait)` and `aim(...)`
(`shots/common.js`). Portrait (9:16) rigs are authored separately (`portrait` branch).

`look` fields (all optional): `msaa` (true only on tile hero shots; costly), `dof: { focus, aperture, maxBlur }`
(CoC px at 1080p = aperture * |1 - focus/depth|, clamped to maxBlur), `bloom: { strength, threshold, radius }`,
`exposure`, `gain`, `lift`, `gamma`, `saturation`, `contrast`, `vignette`, `aberration`, `grain`,
`fadeBlack`. Use `look(grade, dusk, overrides)` from `common.js` to start from the spec's day/dusk look.

## The world (`src/sets/world.js`)

One persistent scene, built once:
- `world.house`: the dollhouse (`src/world/house.js`), 3 columns x 4 rows in unlock order:
  row 1 cozy_den, kitchen, study; row 2 aquarium, jungle, desert; row 3 office, burrow, garden;
  row 4 bamboo, observatory (Star Loft), rainforest (Sky Garden). Room 8 wide x 3.956 tall x 3.2 deep.
  Columns x = -8.34 / 0 / +8.34; floors y = 0.34 / 4.636 / 8.932 / 13.228; room fronts z = +1.6,
  back walls z = -1.6; ground y = -1.2; roof ridge about y 25.6; chimney top `house.chimneyTop`.
  `house.rooms[id]`: `{ group, builtG, emptyG, painting, mat, reveal, returns, floor, light, lamps[], windowMesh,
  x, y, roomW, roomH, roomD, row, col, lampLevel }`. `house.setBuilt(id, bool)`, `house.setLight({...})`.
  Painting uv (u from left, v from bottom) maps to room-local x = (u - 0.5) * roomW, y = v * roomH,
  z = -roomD/2 (+ a few cm to sit in front of it).
- `world.residents[name]`: `{ ch, room, rm, x0, z0, h, shadow, facing }` for ember, panko,
  archimedes, axel, sloane, fennick, chill, warren, thyme, bamboo, vesper, moss. Sprites are
  children of their room's `builtG` (room-local coordinates). Pose them through
  `world.pose(t, { behaviours: { name: { pose: 'idle'|'talk'|'walk', walkFrom, walkTo, walkStart, walkDur, facing, bob, scale } } })`.
- `world.pose(t, { dusk, lamps, wind, focus, aperture, camera, behaviours })` applies time of day
  (`dusk` 0..1: sun, fill, sky crossfade, window tints, lamps) and animates grass, particles and smoke.
  `lamps` is a number or `(roomId) => 0..1`. It returns grade fields to merge into the look.
- `world.register(obj, parent = scene)`: a shot-owned prop, hidden by `world.begin()` every frame;
  the shot sets `obj.visible = true` when it uses it.
- `world.track(obj)`: snapshot a SHARED object (a house part you animate); `begin()` restores it.
- `world.begin()` (called before each pose): hides registered props, restores tracked objects,
  marks every room built, shows every resident, turns the sun shadow on.

## Building blocks

- Tiles: `core/tiles.js` `makeTile(ch)`, `setLocked(tile, 0..1)`, `setTileGlow(tile, k)`, `makeSprout()`,
  `TILE_SCALE` (0.45; tile units are 1 x 1.22 x 0.34).
- Word racks and moves: `world/rack.js` `buildRack`, `buildMiniRack({ words, moves, slots })` (group scaled to
  TILE_SCALE; `rack.set.pose(t)` plays the moves; tiles in `rack.set.tiles` keyed `'row:index'`);
  `world/moves.js` move fields `{ from, letter, to, slot, lift, open, land, closeAt, liftH, arc, zArc }`.
  `world/wordrow.js` `makeTray`: a pixel-parchment face texture and a live per-tile contact shade. The
  face's emissive map is divided by `#F3E2BF`, so a shot's emissive colour on the tray keeps its level.
- FX: `world/fx.js` `makeBillboard(rel, size)`, `poseEmote(sprite, tSincePop, {hold, rise, fade})`
  (set `sprite.userData.y0` first), `makeTrail`, `makeContactShadow`, `makeDustPuff()` (the stepped
  pixel dust-puff texture). `world/blueprint.js` `makeBlueprint()` returns `{ mesh, draw, mat, cut }`
  (`cut.value`: the sheet height above which it is discarded).
- `world/fire.js` `makeFire(...)` with `pose(t, { drawing, drawStart, drawEnd, holdEnd, release })`, `makeMoths`.
- `world/props.js` `makeJar`, `makeShelf`; `world/bubble.js` `makeBubble`; `world/logo.js` `makeWordmarkSign`;
  `world/env.js` `makeParticles`, `makeShaft`, `makeGrass`; `world/sprites.js` `makeCharacter`, `poseCharacter`.
- Overlay (2D, after the grade): `ctx.overlay.quad(name, { canvas | texture, width, height })`, then
  `ctx.overlay.place(name, { x, y, scale, opacity })` in pixels (origin top-left). Sizes scale with
  `ctx.pxScale`. `common.project(camera, worldPoint, overlay)` converts a world point to overlay pixels.

## Sound

`src/cues.js` builds `SCORE` from `E` and `GRID` (its header documents every cue field), so a
retimed event moves its sound with it. `audio/score.mjs` renders it: the bed is one continuous
excerpt of `assets/music/home_phase0.mp3` (trailer T = file T + `GRID.offset`) with gain, a
time-varying low-pass and vibrato; game sounds come only from the spec 5.3 allowlist (enforced);
everything else is a seeded, band-limited voice in `audio/synth.mjs`. The master is limited and
loudness-normalised in two passes (`audio/mix.mjs`) to -14 LUFS, true peak under -1 dBTP.
`CINEMATIC_STEMS=1` also writes per-layer stems; the beat-sync report goes to `$CINEMATIC_SYNC`
(default `/tmp/wordshift-cinematic-score/sync.txt`), which `qa/report.mjs` folds into the report.

## QA

`qa/lint.mjs` is fast and source-only. `qa/report.mjs` needs the encoded MP4s: it checks the
overlay's inked pixels on every frame against the safe zones (via `TRAILER.overlayAt(t)`, which
poses without rendering), the 9:16 end card's sign, tray, posts and tiles inside x 96-918, luma
from 20.4 s, the 16:9 S09 hold's upper corners (YAVG >= 75), the output format, loudness and
cross-process determinism, and writes `out/trailer-report.json`.

## Hard rules (from the spec and the owner's brief)

- Only these assets: residents' `idle/talk/walk` sprites (never `robed*`, never the aye-aye), the 12 room
  paintings (never `workshop`), `sky_afternoon`, `sky_dusk`, roof/wall/foundation, `ui/wordmark.png`,
  `ui/amber.png`, `ui/emote_{heart,note,sparkle,thought,question}.png`. No story art, no pit, no night skies.
- Nothing reads as a face, eyes or a presence. No resident looks at camera; no unison freezes; no lamp dips.
- Every shown word is real and cheerful (verified in `mobile/src/dictionary.ts`).
- 9:16: nothing added (captions, bubbles) outside x 96-918, y 200-1440 (at 1080x1920); 16:9: nothing below y 972.
- No particle, spark or drawing may pair into eyes (the blueprint's chalk and the fireflies are laid out for this).
