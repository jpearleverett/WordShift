# WordShift cinematic brand trailer: "The Dollhouse by the River"

Final buildable spec. Director's cut after three judge panels.

- **Base concept:** The Dollhouse by the River (HD-2D diorama). Two of three judges picked it, and it has the highest cinematic ceiling that is actually reachable. The existing scaffold in `mobile/scripts/store/cinematic/` was built for this set.
- **Grafted from One Letter:**
  - the hero-letter throughline, from the L that leaves PLAY at frame 0 to the L that clicks into MOSTLY at the end;
  - a word becomes a house object (PLAN unfolds into the blueprint);
  - the fire draws a little house;
  - one continuous excerpt of `home_phase0.mp3`, using its own stop, drop, breath and ending;
  - the turn scored "from the next room" (a low-pass and a detuned music box);
  - the frame-0 ASMR click;
  - 4-, 5- and 6-letter montage rows.
- **Grafted from Once Upon a Word:**
  - the teaser line "The animals talk about you when you're away. All good things. Probably.", with "Probably." placed in the music's own near-silence;
  - the game's success chime playing for a move nobody made;
  - an end frame that loops back to frame 0.
- **Every judge must-fix is applied.** Section 9 maps each one.

Deliverables: `wordshift-cinematic-16x9-1920x1080.mp4` and `wordshift-cinematic-9x16-1080x1920.mp4`. Both cuts come from ONE timeline, with the 9:16 rendered natively on its own camera rigs, never cropped. Both run 30 fps, **39.000 s (1170 frames)**, H.264 High yuv420p BT.709 with AAC-LC 48 kHz 320 kb/s, plus `captions-en.srt`.

This is not the Play Store preview video, which stays the real-gameplay "Such a Lovely House". Publish this one on YouTube titled as a cinematic trailer so it is never read as gameplay capture.

---

## 1. Logline and duration

**Logline.** Through a tilt-shift macro lens, one candy letter hops from PLAY into PANT. It sprouts a leaf, rides a stream of amber up the sunlit face of a toy cutaway dollhouse by a painted river, and helps build a room for a sloth with three moths all named Gerald. The house fills with animal friends. The golden afternoon slides into dusk, Panko's spice jars are not where they were, Ember's fire draws a little house, and the animals talk about you when you're away. "All good things. Probably." The wooden sign lands, "A cozy word game." fades up, and the same little L, lying face-down in the word rack out front, rights itself and clicks home to spell MOSTLY.

**Duration: 39.000 s** (1170 frames at 30 fps), the same for both aspects.

**Why 39 s.** The picture follows one continuous excerpt of the game's own bed. The bed's authored drop lands on the room coming alive (T 8.06), its breath lands on "Probably." (T 31.23), its hit lands on the logo (T 33.92), and its final hit lands on the MOSTLY click (T 37.05). The film ends when that hit has rung out.

**Arc** (acts are only a naming aid; it is one persistent world):

| Act | Time | Light | What it sells |
|---|---|---|---|
| I. The rule | 0.00-8.06 | golden afternoon | the verb (move one letter, both words stay real) and the loop (puzzles earn amber, amber builds rooms) |
| II. The house | 8.06-17.77 | golden afternoon | personality (Gerald), scale (over 4,000 word puzzles), the cast (animal friends, each with a room) |
| III. The turn | 17.77-33.92 | afternoon to dusk | three small, deniable wrongnesses: the jars, the fire's drawing, "Probably." |
| IV. The sign | 33.92-39.00 | dusk | brand plus the payoff: "A cozy word game." and the tiles MOSTLY |

---

## 2. Look bible

### 2.1 Concept of the image
An HD-2D miniature: a handmade dollhouse photographed at golden hour with a 100 mm macro. The game's real pixel art (character sprites, room paintings, painted landscape) sits as flat NearestFilter planes inside a real 3D toy world of chunky pixel-textured timber, a wooden word rack, glossy letter tiles and glass jars. One physical light, one atmosphere and one lens pass over both layers. It is one persistent set, so every close-up is a camera move into the same place.

### 2.2 Palette (hex)

**Letter tiles** (the game's own `CandyColors.tileColors` in `mobile/src/theme/colors.ts`, index = charCode % 8, exactly as `getTileColor` does it)

| idx | letters used in the film | body `bg` | border | top gloss band (measured on FG-B) |
|---|---|---|---|---|
| 0 | H P X | `#D9997B` | `#945A43` | `#E5B79A` |
| 1 | A I Q Y | `#B8A2C7` | `#756386` | `#CFBDCD` |
| 2 | B J R Z | `#8FB8CA` | `#557F92` | mix 0.32 to `#FFF6DB` |
| 3 | C K S | `#A6BD8F` | `#697F55` | mix 0.32 to `#FFF6DB` |
| 4 | D L T | `#DEC38A` | `#A28650` | `#E7D0A0` |
| 5 | E M U | `#DDB095` | `#966E51` | mix 0.32 to `#FFF6DB` |
| 6 | F N V | `#CD9390` | `#925D60` | `#DDB3A9` |
| 7 | G O W | `#99BDB5` | `#5D827A` | mix 0.32 to `#FFF6DB` |

- **Locked (moved) letter:** body `#BBC4CF`, top band `#CACCCC`. This is what the game shows for a moved, locked letter (FG-B's L measures `#BBC4CF`).
- **Tile ink:** `#28221D`.
- **Top gloss band:** the upper 42% of the face = `mix(bg, #FFF6DB, 0.32)` with a 6% feathered edge. It is derived from the FG-B samples: P `#D9997B` to `#E5B79A` is exactly a 0.32 mix.

**World and props**

| Use | Hex |
|---|---|
| Parchment (trays, bubble, blueprint sheet) | `#F3E2BF`, shade `#E4CC9C` |
| House ink (outlines, bubble border, plaque text shadow) | `#3B2416` |
| Rack and sign-post wood | `#8A5A3C`, dark `#6B4629`, highlight `#B07A4A` |
| Amber gem (from `ui/amber.png`) | `#FFBB33` / `#FFCC55` / `#FFEE88` highlights, `#EE8800` shade, outline `#663300` |
| Hero sprout | leaf `#7DB36B`, highlight `#A6D08A`, edge `#4E7A40` (echoes the wordmark's leaves) |
| Jar lids / contents | SAGE `#8FA46A` / `#9AA67E`; MINT `#9ED6C0` / `#7FB89A`; DILL `#D9B24C` / `#B8B45A` |
| Blueprint chalk lines (emissive) | `#FFF4DA` at 1.6 intensity on `#F3E2BF` |

**Light**

| Light | Hex |
|---|---|
| Day key sun | `#FFD49A` |
| Day sky fill | `#9DB8FF` |
| Day grass bounce | `#7FA85A` |
| Dusk key | `#FF8E5E` |
| Dusk fill | `#8C6FC4` |
| Room lamps | `#FFB25C` |
| Hearth fire | `#FF7A2E` (core `#FFD76A`) |
| Dusk window tint | `#B5623C` at 0.62 (the game's `WINDOW_TINT` family) |
| Fireflies | `#FFD76A` |

**Type**

| Use | Hex |
|---|---|
| Caption cream (claims) | `#FFF3DC` |
| Tease cream (Epunda Italic) | `#FFE9C7` |
| Caption shadow | `rgba(40,20,10,0.62)` |

**Floor.** Warm lifted blacks. Nothing renders below `#2A1C14`, and no frame is darker than the game's dusk (see the QA gates in 7.2).

### 2.3 Lighting per act

**Act I and Act II (0.00-17.90), golden afternoon, backdrop `sky_afternoon.webp`.**
- Key: DirectionalLight `#FFD49A`, 2.6, elevation 30°, azimuth -38° (from back-left), so it rim-lights every tile and sprite.
- Hemisphere fill: sky `#9DB8FF` / ground `#7FA85A`, 1.05.
- One 2048 PCFSoft shadow map, exterior shots only.
- Dust motes and pollen in raking shafts: additive cone meshes (`makeShaft`) where a window or tree gap motivates them.
- Interiors keep their painted light: `emissiveIntensity` 0.62 on the painting, plus a warm point light per room with no shadows.

**Act III (17.90-33.92), the time-lapse and dusk.**
- `dusk` goes 0 to 1 by smoothstep over 17.90-20.60, then holds at 1.
- Key goes to `#FF8E5E` at 1.25, elevation 30° to 6°. The azimuth swings -38° to -70° so long shadows sweep across the grass.
- Fill goes to `#8C6FC4`.
- Backdrop: a directional wipe from `sky_afternoon` to `sky_dusk`.
- The 12 room lamps switch on in sequence (section 3, S06), and the painted day windows take the dusk tint through the game's window masks.
- The interiors' painted light multiplier **never drops below 0.82 at dusk** (the scaffold's 0.62 is too dark for the luma gate). The one exception is the S08 den, which takes a further factor of 0.86 until the hand-off to S09 (3.2, S08).
- Fireflies from 20.2.

**Act IV (33.92-39.00), dusk.** Same as the end of Act III. Add a warm "sign key" point light `#FFC98A` at 3.5 ahead of the sign, plus a soft rim `#FF9A6A` from the sky side.

### 2.4 Lens and camera language
- **Lens labels** assume a 24 mm-high film back: vfov = 2·atan(12/f).

  | Focal length | vfov |
  |---|---|
  | 100 mm | 13.7° |
  | 85 mm | 16.1° |
  | 65 mm | 20.9° |
  | 50 mm | 27.0° |
  | 40 mm | 33.4° |
  | 35 mm | 37.8° |
  | 30 mm | 43.6° |
  | 28 mm | 46.4° |
  | 24 mm | 53.1° |

  Every 9:16 rig gives its own explicit vfov. It is never derived from the 16:9 rig.
- **Macro (tiles, props, faces): 65-100 mm** with very shallow depth of field.
- **House: 28-40 mm** with a tilt-shift focus band on the house, so it reads as a toy.
- **Every move is motivated:** follow the flying letter, ride the amber, crane the facade, push through a room's open fourth wall, pull back out.
- **Cuts land on the 136 BPM grid** (section 5.1). Letter landings land on beats or eighths.
- **Match cuts** in the montage keep the landing slot at the same screen point.
- **Oner opening:** 0.00-11.59 is one unbroken camera move (rack macro, crane up the house, push into the new jungle room).
- **No handheld noise anywhere.** The end card is locked off apart from a 1.5% push.
- **Interior moves stay within 15° of the room painting's normal** (flat painted back walls stretch beyond that).

### 2.5 Materials

**Letter tiles** (`core/tiles.js` `makeTile`, retuned)
- Geometry: RoundedBox 1.0 x 1.22 x 0.34 with radius 0.15. Scale the whole tile Group by **`TILE_SCALE = 0.45`**, so a world tile is 0.45 w x 0.55 h x 0.15 d. That scale makes the L a toy block in a room, about a third of a resident's height.
- Body: MeshPhysical, `color = bg`, roughness 0.40, clearcoat 0.8, clearcoatRoughness 0.18, sheen 0.3 (`#FFF2D8`).
- Face decal:
  - `bg` with the top gloss band (2.2);
  - the inset border ring in `border` at 0.55 alpha;
  - the letter in **Epunda Slab Bold**, ink `#28221D`, debossed through the Sobel normal map (already in `tileFace`).
- **Swatch gate (7.2):** a front-facing, day-lit tile face in the graded output must measure within ΔE2000 ≤ 6 of the FG-B values above. The draft's "muted orange, sage, gold" look came from exposure and tone mapping, not the palette. Fix it with key intensity, exposure and the gloss band, never by inventing colors.
- **Locked letters:**
  - lerp the body to `#BBC4CF` over 0.30 s after landing (the game's lock);
  - add a 1 px-equivalent warm rim `#FFE7B0` at 0.25 emissive for 0.4 s at the landing only;
  - no permanent gold ring.

**Hero sprout.** Two extruded leaf shapes (lens-shaped Shape, depth 0.012, bevel 0.004) on a 0.05 tube stem, 0.20 tall, seated on the L's top edge.
- Material: MeshStandard `#7DB36B`, roughness 0.6, with the `#A6D08A` highlight painted in a tiny canvas map.
- It springs on landing: scale 0 to 1.15 to 1, spring freq 3.2, zeta 0.35.

**Word rack.** Two uprights (0.12 x 0.12 x 3.0) and three parchment trays (`makeTray`, 3.8 w, with a rim of 64 px NearestFilter `pixelWood('#8A5A3C')`).
- It stands on the grass at world (-3.4, ground, 12.0).
- Tray centres at y = 1.30 / 0.55 / -0.20 (ground is y = -1.2).
- Trays only. **No twine or garlands anywhere** (legibility fix).
- Each tray face is pixel-art parchment (`#F3E2BF`, +-4 luma grain at the house's art pixel, a 2 px `#D8C29E` ring and a 1 px light lip) with a stepped contact shade, up to 15% darker, that follows each tile.

**Timber, shelf, posts, jars.** Deliberately low-res: 64 px NearestFilter pixel textures (`pixelWood`) with flat, chunky bevels, so they read as "pixel props in 3D".
- Jars: `props.makeJar`, clear glass faked with opacity 0.38 and clearcoat (no transmission pass). Labels are pixel parchment carrying the spice name (section 3, S07).

**Wordmark sign.** `logo.makeWordmarkSign({ width: 4.6, depth: 0.30 })`: the `ui/wordmark.png` alpha contour extruded, front cap UV-mapped to the PNG, dark-wood sides `#4A2E1C`.
- It stands on two 0.12 x 0.12 pixel-wood posts.
- Its specular glint is a shader band **masked to the yellow (WORD) and blue (SHIFT) letter fills only**, so the wood, including the tiny eye carved in it, never catches light.

**Blueprint.** A parchment sheet (1.6 x 1.1) with emissive chalk polylines (ribbon meshes with a draw-on uniform) and a tiny title block that reads PLAN.

### 2.6 Post-processing stack (`core/post.js` `Pipeline`, order fixed)

1. **Scene render** into an HDR HalfFloat target with depth.
   - MSAA 4 only on tile-hero shots (S01, S04, S10). The other shots use a second non-MSAA target, chosen per shot by `look.msaa`, because MSAA roughly quadruples fill cost in SwiftShader.
2. **Temporal motion blur** (new): on flagged frames only, render N subframes across a 180° shutter (t ± 1/120 s) and accumulate color with weight 1/N. DOF uses the centre subframe's depth.
   - N = 3 for the crane, whip and pull-back ranges; N = 2 for the sign drop.
3. **Depth of field:** the existing half-resolution scatter-as-gather bokeh, with CoC from depth and per-shot focus, aperture and maxBlur keys.
4. **Bloom:** UnrealBloom, threshold 0.85, strength 0.35 (day) and 0.50 (dusk), radius 0.55.
5. **Grade:** AgX tone map, exposure per shot (tuned by the luma gate), lift/gamma/gain from `tod`.
   - Day: gain 1.04 / 1.00 / 0.94; lift 0 / 0.008 / 0.006 (a hint of teal in the shadows).
   - Dusk: gain 1.05 / 0.97 / 0.96; lift 0.03 / 0.018 / 0.04 (a lavender lift).
   - Saturation 1.06 in the day, 1.04 at dusk.
6. **Vignette** 0.26 (day) / 0.30 (dusk), softness 0.45.
7. **Chromatic aberration** 0.6 px at the corners (0 at centre).
8. **Film grain** 0.02, seeded by frame index.
9. **Whip smear** (existing `mix` mode 2) on whip transitions only.
10. **2D overlay** after the grade in sRGB: captions, the speech bubble and the end line. DOF, grain and bloom never touch type.

### 2.7 Typography and caption style

- **Claim voice:** `Figtree-Bold.ttf`. **Tease voice:** `EpundaSlab-Italic.ttf`. Speech and plaque text use `EpundaSlab-Regular.ttf` and `Figtree-Bold.ttf`. Tile letters use `EpundaSlab-Bold.ttf`.
- All type is drawn by `core/text.js` `drawText` into canvases at the exact output pixel size and shown 1:1 on orthographic quads after post. Fonts load through `loadFonts()` before `isReady`, so a fallback face is never baked in.

**Style**
- Claims: cream `#FFF3DC`. Teases: cream `#FFE9C7`. No boxes or plaques.
- Legibility comes from a two-layer warm shadow:
  - a tight layer, `rgba(40,20,10,0.62)`, blur 12 px, offset (0, 3);
  - a halo, `rgba(40,20,10,0.30)`, blur 34 px.
- Behind each caption block sits a **soft local scrim**: a radial gradient `rgba(28,16,10,0.22)` falling to 0 at 1.6x the block's extents, drawn in the overlay. It is a darkening, never a shape.
- **In:** per word, fade 0 to 1 plus a 12 px rise (16:9) or 14 px rise (9:16) over 0.30 s, ease outCubic, with 0.06 s between words.
- **Out:** a 0.22 s fade with no movement, ending at the caption's Out time (Out in 3.4 is when the caption is gone).

**16:9 layout (1920x1080)**

| Element | Font and size | Placement |
|---|---|---|
| Claims | Figtree Bold 64 px, line height 1.16 | left-aligned at x = 128; the last baseline sits at y = 950; max width 1100 px |
| Teases | Epunda Slab Italic 68 px | centred at x = 960; last baseline y = 950 |
| "Probably." | Epunda Slab Italic 76 px | centred at x = 960; last baseline y = 950 |
| End line | Figtree Bold 60 px | centred under the sign's projected bounding box, with a 36 px gap |

Keep everything out of the bottom 10% (the YouTube scrub bar).

**9:16 layout (1080x1920)**
- Title-safe box: **x 96-918, y 200-1440**. Nothing added may go below y 1440 (Shorts/Reels UI) or right of x 918 (the right-rail buttons).

| Element | Font and size | Placement |
|---|---|---|
| Claims | Figtree Bold 74 px | left-aligned at x = 96; first baseline y = 330; max width 822 px, wrapped at the break that fits, preferring a gap after '.' or ',', otherwise the most even lines ('Over 4,000 / word puzzles.', 'Animal friends. / Each with a room.') |
| Teases and "Probably." | Epunda Slab Italic 76 / 84 px | centred at x = 507 (middle of the safe box); first baseline y = 330 |
| End line | Figtree Bold 64 px | under the sign |

**Speech bubble** (Gerald, S03)
- Built with `world/bubble.js` `makeBubble`, but shown in the **overlay**, anchored each frame to the projected point 0.15 above Sloane's head. That keeps it crisp and out of DOF.
- Fill: parchment `#F3E2BF`. Border: stepped pixel border in `#3B2416` (6 px art-pixel).
- Text: Epunda Slab Regular, 40 px (16:9) / 44 px (9:16), ink `#3B2416`. Max width 760 / 820 px.
- Name plaque: "Sloane" in Figtree Bold, cream text on wood `#8A5A34`.
- Position: the tail points to her mouth. The bubble sits upper-right of her head in 16:9 and above her head in 9:16, clamped to the safe box.

---

## 3. Shot list

### 3.1 Grid and conventions

**Musical grid** (section 5 describes the measurement):
- 136.0 BPM: beat 0.4412 s, eighth 0.2206 s, bar 1.7647 s.
- Bar n starts at T = 1.000 + (n-1) x 1.7647:

  | Bar | T | Bar | T | Bar | T |
  |---|---|---|---|---|---|
  | 1 | 1.000 | 7 | 11.588 | 13 | 22.176 |
  | 2 | 2.765 | 8 | 13.353 | 14 | 23.941 |
  | 3 | 4.529 | 9 | 15.118 | 15 | 25.706 |
  | 4 | 6.294 | 10 | 16.882 | 16 | 27.471 |
  | 5 | 8.059 | 11 | 18.647 | 17 | 29.235 |
  | 6 | 9.824 | 12 | 20.412 | 18 | 31.000 |

- The bed's outro hits (33.92, 36.60, 37.05) are off-grid in the file. The picture anchors to their **measured** times.

**House coordinates** (scaffold units; room 8 wide):
- House centred at x = 0. Room fronts at z = +1.6, back walls at z = -1.6. Ground at y = -1.2; the house floor slab is at y = 0.34.
- Floors at y = 0.34 / 4.64 / 8.93 / 13.23. Room height 3.96.
- Columns at x = -8.34 / 0 / +8.34. The roof ridge is at about y 25.6, the chimney at x ≈ -8.
- Layout in the game's **unlock order**, bottom to top, left to right:

  | Row | Left | Centre | Right |
  |---|---|---|---|
  | 1 | cozy_den (Ember) | kitchen (Panko) | study (Archimedes) |
  | 2 | aquarium (Axel) | jungle (Sloane) | desert (Fennick) |
  | 3 | office (Chill) | burrow (Warren) | garden (Thyme) |
  | 4 | bamboo (Bamboo) | observatory = Star Loft (Vesper) | rainforest = Sky Garden (Moss) |

- **Build state:**
  - Before 11.588: row 1 and the aquarium are built. The jungle is an empty timber frame that builds in S02-S03. The desert and rows 3-4 are empty frames: the timber skeleton and the roof exist, but there is no floor, painting or side returns.
  - From 11.588 (the montage cut): all twelve are built.
- Positions below are "subject + (right, up, toward camera)" in world units unless world coordinates are given. They are starting values to tune on stills; the framing intents are binding.

### 3.2 The table

| ID | Start-End (s) | Picture | Camera (16:9) | On-screen text (exact) | Audio events | 9:16 reframe |
|---|---|---|---|---|---|---|
| **S01 The first move** (hook) | 0.0-4.5 | Golden-afternoon macro of the word rack in the meadow: PLAY / PANT / HEAR on three parchment trays. The dollhouse's lit den and kitchen melt into warm bokeh behind; Ember (green sweater) stands soft at right. **Frame 0:** the L of PLAY is 25% lifted and tilted 6°, with a hard specular ping on its clearcoat; pollen glitters in a raking shaft. The L arcs down-right. PANT's A, N and T glide right to open a slot after P. **1.00:** the L lands (squash 0.92/1.06) and PLANT rim-flashes for 6 frames with 6 small warm glints on the tray margin in the gaps between tiles (never over a letter, gone in 6 frames). PLAY's A and Y close up to PAY. **1.20:** a sage two-leaf sprout pops from the L's top edge; the L turns locked powder `#BBC4CF`. **1.44:** the T of PLANT lifts. **2.20:** HEAR opens its end slot. **2.77:** the T lands to make HEART, and PLANT closes to PLAN. **1.55:** Ember (soft) flips to her talk frame and an emote_heart pops. **3.21 / 3.43 / 3.65:** PAY, PLAN, HEART flash in turn with emote_sparkle pops. **4.09:** 32 deep-amber gems burst out of PLAN along its row and leave past the rack's left end (9:16: off the frame's left edge), never within a tile-width of PAY, and PLAN's P, A, N tip back flat and unfurl a cream chalk blueprint. The sprouted L pops free and rides the gem stream up. | 85 mm (16.1°), MSAA on. **Start:** L + (0.55, 0.15, 4.4), aimed at the L, focus 4.4, maxBlur 18 px. Critically damped follow with a 3-frame lead as the L falls. **1.00-1.35:** ease back to middle tray + (0.4, 0.2, 9.8), framing all three trays plus Ember; focus 9.8. **3.90-5.19:** a boom and tilt up off the rack (spline key M at 5.19), with the rack and PAY out of frame by 4.8, before the amber caption. Motion blur N=3 on 3.90-4.53. | "Move one letter." (in 0.35)<br>"Both words stay real." (in 2.50, line 2 below line 1)<br>both out 4.20-4.42 | T0: meadow air and a brook (synth), -26 dB, already running. 0.03: letter_select.wav plus a synth resin lift click. 0.25-0.95: whoosh, panned L to C. 0.40: slot zip. **1.00: valid_move.wav plus a ceramic tock; the bed opens here** (starts at T 0.96 with a 40 ms fade to -5 dB). 1.20: sprout pluck. 1.30: lock tink. 1.44: letter_select. 1.55: star_pop_1, -14 dB. 1.5-2.7: whoosh. 2.20: slot zip. **2.77: valid_move_2.wav** (a combo-ladder step). 2.95: lock tink. 3.21 / 3.43 / 3.65: star_pop_1 / 2 / 3. **4.09: amber_earn.wav plus a gem shower** (40 glass clicks) and a paper unfurl; the bed rides to -3 dB. The hook's tactile cues are mixed 3 dB hot against the -5 dB bed. | 50 mm (27.0°). The trays stack in the middle band (PLAY y ≈ 34%, PANT 47%, HEAR 60%). The L starts at y 30%, and the camera tilts down with it. Ember stands small and soft in the grass in front of the rack's right end, head just under HEAR's tray (centre x about 74%), clear of the bottom UI band; her heart pops on HEAR's tray right of the R and is gone before the T comes down. Captions sit in the top band. The crane ends on the facade's left and centre columns, framed tall. |
| **S02 Words build rooms** | 4.5-8.1 (no cut) | Continuous crane. The amber stream (the 32 `amber.png` gems from PLAN on a Catmull-Rom route), the fluttering blueprint and the sprouted L rise up the sunlit facade. Built rooms are alive: Ember by her fire, Panko at her stove, Archimedes bobbing, Axel's bubbles. Target: the **empty centre frame on floor 2**. **5.60:** the blueprint lays flat against the empty frame's back board; its chalk lines draw the room outline. **6.29:** the gems' gold sparks fly to the six landing points and wait there. **6.74-7.84 (the music stops):** six pieces of bright new pine (`#e9c58c`: floor, two side returns, a ceiling beam, two front trims) fly in from off frame on an up-arc and land one per eighth, each with a squash and a pixel dust puff. **8.06 (the drop, S03's first frame):** the jungle painting unrolls down the back wall behind a bright seam. The pine floor and returns are stand-ins: the unroll wipes them away and the room's own floor and returns are underneath. The blueprint (grained parchment, an inked PLAN cartouche) is covered line by line by the unrolling wallpaper. | 35 mm. Crane from S01's end to world (0.0, 6.9, 13.5), aimed at (0, 6.6, 0). It booms up about 3 units while orbiting 18° left to 0°, so it passes **dead centre on the frame at exactly 8.06** still moving and carries its momentum into S03's push (no stop at the drop); travel at most 35 px per 1/60 s (16:9) / 60 (9:16), at least 8 px from 5.1 to 7.9. A 1.5° Dutch tilt levels out by 8.06. Focus on the frame; maxBlur 8 px. Motion blur N=3 on 4.53-5.40. | "Puzzles earn amber. Amber builds rooms." (in 4.90, out 7.83-8.05) | 4.53-5.60: gem whoosh with shimmer, panned L to R. 5.60: soft chalk scribbles. 6.29: sawdust sparkle. **The bed's own stop, 6.83-7.93.** In it: synthesized wooden knocks on the eighths at 6.74 / 6.96 / 7.18 / 7.40 / 7.62 / 7.84 (the last leads into the drop), pitched G4 A4 B4 D5 E5 G5, dry, with a felt thump. | Portrait 35 mm (vfov 54°). The stream travels from the rack, low in frame, up to the frame, high in frame (native vertical). The orbit is reduced to 8°. It ends with the frame filling 90% of the width. The caption sits in the top band. |
| **S03 Gerald** | 8.1-11.6 (no cut) | **8.06:** the jungle wallpaper unrolls in 0.4 s, the window light shaft switches on, dust motes wake and 3D leaf cards frame the near edges; the sun's shadows and the meadow pollen fade out over 8.4-8.9. **8.50:** Sloane (Hawaiian shirt) pops in with a sparkle puff, standing in front of the hammock's right end. The sprouted L drops into the painted hammock's sag with a little bounce. Three pastel pixel moths (8x6 px, two-frame flap; the art is a four-wing moth silhouette with a 1 px `#3B2416` outline and two antenna pixels on a 10x8 canvas, material x0.78 so the pastels stay distinct under the lit room) loop beside her, left of her face and below her crown (9:16: below the bubble), over the hammock. **8.94:** a parchment speech bubble springs open and types her line while she alternates idle and talk frames at 6 Hz. **11.15 (beat):** one moth lands on the L's sprout with its wings open, holds 0.2 s, then folds. | Continuous push from (0, 6.9, 13.5) into the room to Sloane's eye level: end at Sloane + (-0.4, 0.1, 5.8), aimed at her face, easing to 50 mm (27°) by 9.45. A 4° arc right. Focus on Sloane; the hammock is gently soft and the foreground leaves blurred. maxBlur 14 px. Off-axis at most 12°. | Bubble, typed at 25 characters per second from 9.00 to 11.08: "Three moths live in my fur. I call all three Gerald."<br>Name plaque: "Sloane" | **8.06: the DROP** (the bed's authored hit), plus unlock.wav at -6 dB, a wallpaper swish and a light-on shimmer. 8.50: sparkle puff. 8.94: dialogue.wav. Typing: ui_tick.wav every third character at -26 dB. The bed ducks 3 dB under typing (9.0-11.1). Moth flutters (AM noise bursts), panned with the moths. 11.15: star_pop_1, -14 dB. | Portrait 50 mm (vfov 40°). Sloane lower-middle, feet above y 72%. The bubble sits above her head (y 16-34%, max 820 px). The L and hammock sit mid-frame; the moths loop through the upper half. |
| **S04 Over 4,000** (montage) | 11.6-15.1 | Three landings, cut mid-flight, each at one room's open front, where a two-tray mini-rack (source above, target below) stands on the front floor edge with the resident behind. The landing slot is matched to the same screen point across cuts. **(1) Aquarium, 4 letters:** the S from SNAP lands at the front of MILE at **11.81**, giving NAP / SMILE. Caustics and bubbles; Axel hops with an emote_note. **(2) Desert camp, 5 letters:** the P from SPOON lands beside SUPER's P at **12.91**, giving SOON / SUPPER. Sand motes; Fennick's ears go up with a bob. **(3) Garden, 6 letters:** the G from GLOVES lands at the front of LITTER at **14.02**, giving LOVES / GLITTER. The GLITTER tiles shed glitter sparkles; Thyme does two happy hops. Moved letters turn locked powder. | 65 mm (20.9°), MSAA on, 3/4 low angle, 2.8 units from the target tray. Each shot is a fast 0.6-unit push toward the slot. Cuts at 11.59 / 12.69 / 13.79; each landing holds 0.88 s. **Whip 14.68-15.12:** pull back and down with directional smear. | "Over 4,000 word puzzles." (in 11.75, out 14.95) | Landings climb the game's combo ladder: valid_move_2.wav (11.81), valid_move_3.wav (12.91), valid_move_4.wav (14.02). 14.02: perfect.wav tail at -12 dB plus a glitter shimmer. Short whooshes into each cut. 14.68: big whip whoosh. | Portrait 50 mm (40°). Two trays stacked at centre (source y 44%, target y 54%). The resident stands behind the rack's right half, lifted so the whole head and shoulders clear the upper tray (the muzzle about 100 px or more above its rail at the lowest bob or hop, never just the eyes over it), with the feet hidden behind the rack even at a hop's peak. The six-letter trays are scaled so seven tiles fit 88% of the width. The whip becomes a fast downward tilt. The caption sits in the top band. |
| **S05 Animal friends** (cast crane) | 15.1-17.8 | The finished dollhouse, all twelve rooms lived in, afternoon sun. One continuous crane from the ground floor to above the roof. Each row gets one readable action as it passes, on sixteenths: **row 1** Ember by her fire (emote_heart), Panko stirring (steam puff), Archimedes (emote_thought); **row 2** Axel's bubbles, Sloane's moths, Fennick's ear twitch; **row 3** Chill (emote_note), Warren's digging bob, Thyme's quick hops; **row 4** Bamboo (emote_sparkle), Vesper's small hop by the telescope, Moss fluffing (a scale pulse). Nobody looks at camera. **17.60 (optional cameo):** the sprouted L sits on the ridge by the chimney. **17.77:** the crane clears the roof: chimney smoke, the round attic window, open sky. | 40 mm (33.4°), no MSAA. Camera 24 units in front of the house; y from 2.0 to 27.0 (ease inOut), x -1.5 to 0. The target stays 0.5 below the camera height so rooms read frontally. Orbit 6°, roll 0.5° to 0. Focus rides the centred floor (about 24). Motion blur N=3 throughout. | "Animal friends. Each with a room." (in 15.30, out 17.62) | A 2.6 s synthesized riser (filtered noise plus a rising G-major shimmer) under the bed. Emote pops (star_pop_1/2/3 at -16 dB) on the beats. 17.77: wind-chime shimmer (G5 B5 D6) as the roof clears. | Portrait vfov 54°. A straight vertical crane on the **centre column** (kitchen, jungle, burrow, Star Loft), with the side columns cropped at the frame edges. The caption sits in the top band. |
| **S06 Where the day goes** (hero time-lapse, no text) | 17.8-21.3 (no cut) | Continuing up into the sky, the day sun goes down with the light: the afternoon sun fades as the dusk wipe passes it and the dusk sun comes up over the ridge (never both at once); a few pixel cloud cards race; the backdrop wipes in one sweep from `sky_afternoon` to `sky_dusk` (17.9-19.35). The camera comes down and back to the **hero wide**: the whole dollhouse in its meadow in front of the painted river. Instanced grass and pixel flowers sway in the foreground; long shadows sweep. **19.53-20.74:** the room lamps switch on one per sixteenth, bottom row first, left to right (12 lamps); painted windows take the dusk tint. Chimney smoke catches pink. Fireflies rise from 20.2. **20.60-21.29:** a push toward the kitchen on the ground floor, then cut. | 16:9. 17.45-18.17: tip up 11 degrees to 45 mm while the crane settles at the ridge (roof and chimney stay in the bottom 10-20%). 18.60-19.60: crane down and dolly back to the hero wide at world (0, 11, 48), aimed at (0, 10, 0), 40 mm (33.4°); tilt-shift DOF with focus 47 and a strong blur on the near grass and far painting. 19.60-20.60: a slow drift and a 2-unit push. 20.60-21.29: push to (0.5, 3.5, 14), aimed at the kitchen cell (0, 2.3, 0), drifting to 50 mm. Motion blur N=3 on 17.77-18.9 and 20.6-21.29. | none | 17.8-20.9: a warm synth pad swell (G add9), plus sparse synth birdsong crossfading to synth crickets (4.6 kHz AM chirps) by 20.9. Lamp clicks: ui_tap.wav at -22 dB on each sixteenth, 19.53-20.74. **20.40-21.30: the bed low-passes 18 kHz to 1.6 kHz, drops 4 dB and gets a 0.5 Hz / 3 ms vibrato** (the music now plays "in the next room"). **20.85: the music box enters** (G5 B5 D6 B5 quarter notes, -14 dB). | Portrait 24 mm (53°). The sky tip is 7 degrees at vfov 40 degrees. The tall house fills the frame from grass to roof peak, with sky above. The lamps' sequence reads bottom to top. The push ends on the kitchen, centred. No text. |
| **S07 Panko's jars** | 21.3-24.8 | Panko's kitchen at dusk: the painted window is tinted through its mask, warm lamplight, the oven fire flickers (a small 3D fire volume in the painted oven), pixel steam from her pot. A 3D pixel-wood shelf with a backboard exactly covers the painted shelf and jars (uv u 0.655-0.825, v 0.70-0.90 from the bottom). On it: three glass jars labelled **SAGE, MINT, DILL** (pixel parchment labels, lids per 2.2), plus the sprouted L at the left end. **21.29-22.00:** macro slide along the jars. **22.00-22.60:** focus racks to Panko at her stove (idle and talk alternation, a stirring bob). **22.60-23.90 (the bed's bass-out break):** the camera drifts right with her; the shelf is out of frame. **23.94 (the groove returns):** the camera snaps back to the shelf. The jars now stand **DILL, SAGE, MINT**, and the L sits at the **right** end. Nothing ever moves on camera. **24.39:** Panko looks up at the shelf's right end (a hop and a lean; she already faces it); an emote_question pops. | 100 mm (13.7°), no MSAA. Lateral dolly along the shelf: start shelf + (-0.9, 0, 3.0), move 1.8 right (to 22.60), hold; 16:9: a 0.15 s ease-out snap back up to the shelf on the groove's return (23.93-24.08); the payoff holds; 9:16 returns over 23.93-24.28. Focus: 3.0 on the jars, 5.2 on Panko, back to 3.0, then Panko at 24.55-24.75 (16:9) / 24.37-24.61 (9:16). maxBlur 16 px. The oven glow blooms in the bokeh. Stays ≤ 12° off-axis. | "Panko's spice jars keep changing places." (Epunda Slab Italic; in 21.55, out 23.96) | The filtered bed continues. 21.40 and 21.62: soft synth glass ticks as the jars pass. 22.0-23.9: pot bubbling (synth) and stir ticks. **The bed's authored bass-out break, 22.58-23.78**, lands while the jars are off-screen (no extra sound is added; **no off-screen clink**). The music-box ostinato continues. **At 24.38 its B5 comes back as A#5, once.** 24.39: star_pop_1, -12 dB, for the question emote. | Portrait 85 mm (vfov 25°) from a slight high angle. The jars fill the lower middle (y 52-64%, labels at least 70 px tall). Panko is soft, upper-left, behind them. The dolly becomes a short tilt plus slide. The caption sits in the top band. |
| **S08 The fire draws** (no text) | 24.8-27.5 | Ember's den at dusk. The painted fireplace is augmented with a 3D pixel-quantized fire (`makeFire`) and a flickering warm point light on the hearth, Ember and the room. The sprouted L sits at the right end of the mantel, silhouetted against the glow. Ember stands at uv u 0.40, turned toward the fire. **25.27 / 25.49 / 25.71 / 25.93 / 26.15:** sparks rise out of the fireplace and draw, one eighth-note stroke at a time, **a plain little house**: (1) the walls and floor, (2) the left roof, (3) the right roof, (4) the door, (5) the chimney. **No window, no marks inside, no eyes.** It hangs in front of the stone chimney breast, glowing, from 26.15; from 26.77 the outline dims and breaks into sparks that each leave on their own (26.80-27.00) and drift up the chimney, gone by 27.30 (no letter shapes, never a moving copy of the outline). **25.71:** Ember looks up at it. **26.15:** her talk frame, a soft smile. **26.59:** emote_heart. S08 lowers the den's painted light by a factor of 0.86 (on top of the dusk multiplier) and tints it `#F6EFE4`, easing both back to the wide's dusk values over 26.90-27.40. | 85 mm (16.1°). The frame's left edge on the den wall, the drawing at ~20% x / 22% y, Ember at ~52% cropped at mid-torso, with a slight push-in. 26.59-27.75: pan right and down to her full figure (S09's pull-back takes over at 27.45). Focus on the drawing plane, 4.5, then 5.1 on Ember. The floor lamp makes a soft bokeh disc at the right edge. | none (show, don't tell) | Synth fire crackle (random impulses through a band-pass plus a low rumble). A soft sparkler fizz on each stroke (high-Q noise following the stroke). A reversed-bell swell peaks at the drawing's completion, 26.15. The music box continues sparsely. 26.59: star_pop_2, -12 dB. | Portrait 65 mm (vfov 30°). The fireplace sits lower-left; the drawing forms at y 34-48%; Ember full figure a little right of centre (y ~36-76%, feet above the UI band); the pan runs 26.13-26.58, settled before the heart, then a 2%/s drift. |
| **S09 When you're away** | 27.5-33.9 | A fast pull-back out of the den's open front to the dusk hero wide: lamps lit, fireflies, the dusk backdrop, smoke. The residents chat among themselves: pairs in neighbouring rooms face each other through the shared walls, alternating talk frames. Warm emotes (note, heart, sparkle, thought) pop as a **staggered bottom-to-top cascade on sixteenths, 28.40-29.70**. Everyone keeps moving (idle bobs, short walks). **Nobody turns to camera, nobody freezes in unison, and no light dips.** Vesper stays small and away from lamp glow cards. During "Probably." the push gathers pace into the cut, with fireflies and smoke drifting. | 27.47-28.35: pull back from S08's panning camera (its rig) to the wide at world (0, 10.5, 59.5), aimed at (0, 9.0, 0), 35 mm. The distance grows geometrically and the aim leaves Ember as the camera draws away. Adaptive motion blur (up to 32 subframes, shutter 0.75-1.5 of 1/60 s). Then a 6-unit ease-in push over 28.35-33.92, tilting to (0, 10.3, 0). The whole house from grass to chimney; the backdrop is re-seated (3.2x, centred at x -60, y -37.5) so the painted sun and mountains sit beside and above the gable and the painting covers both edges. Tilt-shift DOF with the house in the focus band. | "The animals talk about you when you're away." (in 28.15)<br>"All good things." (in 29.85, line 2)<br>both out 30.95-31.17<br>"Probably." (in 31.35, alone, larger; out 33.72) | 27.47: whoosh out. The filtered bed plays with crickets. The emote cascade uses star_pop_1 at -18 dB on sixteenths, plus dialogue.wav blips at -24 dB (the game's own chatter voice) staggered between rooms. The music-box ostinato stops at 27.47. **31.23: the bed's own breath** (the bass drops out until 33.7). **31.35: one music-box G5 that sags 30 cents flat and returns over 0.9 s.** Crickets are the only other sound. | Portrait 24 mm (53°). The whole house stands tall, so each room is larger and the chatter reads. Captions sit in the top band (y 250-470). |
| **S10 The sign / MOSTLY** (end card) | 33.9-39.0 | Hard cut **on the hit**. The meadow in front of the house at dusk: the word rack, sharp, in the lower-middle. Its top tray reads **M O S T [one tile turned face-away, askew, its sprout poking sideways] Y**; the other trays are empty. **33.92:** the WORD SHIFT wooden sign on its two posts slams down behind the rack. The first frame is the impact: squash 0.94/1.06, dust puffs along the sign's bottom edge and at the posts' feet, two wood chips. Behind: the lit dollhouse soft and warm on the right edge, its corner post clear of the sign, the dusk sky and the painted sun glow over the mountains on the upper-left. **34.35:** "A cozy word game." fades up under the sign. **34.60-35.10:** one glint sweeps across the sign's letters at constant speed. **35.55:** the turned tile trembles (2 frames). **36.15:** it rocks. **36.60:** it flips itself round to show a powder-blue **L** (the sprout springs straight). **36.80:** it hops sideways into line. **37.05:** it clicks home: **MOSTLY**. A warm rim ripple runs left to right along the six tiles. **38.30:** the sprout gives one tiny contented wiggle. It holds to the last frame, with no fade, so the final frame works as a still and loops to frame 0. | 16:9 about 50 mm (vfov 27°), MSAA on. Low, 13.5 units in front of the rack, 0.3 above its top tray, tilted up 6°; yawed so the painted sun sits behind the sign's left end. Sign centre at y ≈ 29% of frame, the line at y ≈ 45%, tiles at y 58-68%. Deep-ish focus (focus 13.5, maxBlur 4 px), so rack and sign are crisp and the house is soft. Locked off with a 1.5% push to the end. Motion blur N=2 on 33.92-34.05 only. | Wordmark (the 3D sign)<br>"A cozy word game." (in 34.35, holds)<br>tiles M O S T L Y (complete at 37.05) | **33.92: the bed's hit, full-band again** (the low-pass opens in 0.12 s: "back outside"), plus a synth wooden thunk for the sign landing. 34.60: a soft shimmer under the glint. 35.55: two tiny wooden taps. 36.15: a rock tick. **36.60 (the bed's pre-hit): the flip tock.** 36.80: a small hop swish. **37.05 (the bed's final hit): valid_move.wav plus a ceramic tock** (the success chime for a move nobody made) plus one music-box G6, in tune. 38.30: a tiny leaf rustle, -30 dB. 38.30-39.00: the bed's tail and crickets fade to silence at 39.00. | Portrait vfov 46°, camera 11.4 in front of the sign. The sign is centred at y 18-26% (about 770 px wide, inside x 96-918 with the impact squash; a six-slot tray). The line sits at about 33%, on the dark floor beam; the tiles at y 42-50% (at least 95 px each). The house is soft below and behind them. Ember and Axel are hidden (in 16:9, Ember only). Nothing added below y 1440 or right of x 918. |

### 3.3 Transitions
- **Unbroken:** S01 → S02 → S03 is one continuous camera move (a oner, 0.00-11.59).
- **Cuts:** at 11.59, 12.69 and 13.79 (all in S04), at 21.29 (to S07), at 24.82 (to S08) and at 33.92 (to S10).
- **Whip:** 14.68-15.12 (S04 → S05), using the pipeline's whip mode.
- **Continuous:** S05 → S06, and S08 → S09 (the pull-back).
- No dissolves. No dip to black anywhere.

### 3.4 Caption table (for the overlay and the SRT)

| # | Text (exact, ASCII) | Font | In | Out | 16:9 | 9:16 |
|---|---|---|---|---|---|---|
| 1 | Move one letter. | Figtree Bold | 0.35 | 4.42 | lower-left, line 1 | top band, line 1 |
| 2 | Both words stay real. | Figtree Bold | 2.50 | 4.42 | lower-left, line 2 | top band, line 2 |
| 3 | Puzzles earn amber. Amber builds rooms. | Figtree Bold | 4.90 | 8.05 | lower-left (wraps to 2 lines in 9:16) | top band |
| 4 | Three moths live in my fur. I call all three Gerald. | Epunda Slab Regular in the bubble; plaque "Sloane" | 8.94 (typing 9.00-11.08) | 11.58 | anchored to Sloane | above her head |
| 5 | Over 4,000 word puzzles. | Figtree Bold | 11.75 | 14.95 | lower-left | top band |
| 6 | Animal friends. Each with a room. | Figtree Bold | 15.30 | 17.62 | lower-left | top band |
| 7 | Panko's spice jars keep changing places. | Epunda Slab Italic | 21.55 | 23.96 | lower-centre | top band, centred |
| 8 | The animals talk about you when you're away. | Epunda Slab Italic | 28.15 | 31.17 | lower-centre, line 1 | top band, centred |
| 9 | All good things. | Epunda Slab Italic | 29.85 | 31.17 | lower-centre, line 2 | top band, line 2 |
| 10 | Probably. | Epunda Slab Italic, larger | 31.35 | 33.72 | lower-centre | top band, centred |
| 11 | A cozy word game. | Figtree Bold | 34.35 | 39.00 | under the sign | under the sign |

The tiles M O S T L Y are 3D, not overlay text. The SRT carries lines 1-11. Line 4 goes as `Sloane: Three moths live in my fur. I call all three Gerald.` and line 11 as `A cozy word game. MOSTLY`.

Reading speeds stay at or under 18 characters per second of visible time. The longest is #8: 44 characters over 2.8 s.

---

## 4. Word moves (all verified against `mobile/src/dictionary.ts`)

| Board | Move | Result | Where |
|---|---|---|---|
| PLAY / PANT | L from PLAY index 1 into PANT index 1 | PAY / PLANT | S01 (the game's real opener board) |
| PLANT / HEAR | T from PLANT index 4 into HEAR index 4 | PLAN / HEART | S01 |
| SNAP / MILE (4 letters) | S from index 0 into index 0 | NAP / SMILE | S04 (aquarium) |
| SPOON / SUPER (5 letters) | P from index 1 into index 2 | SOON / SUPPER | S04 (desert camp) |
| GLOVES / LITTER (6 letters) | G from index 0 into index 0 | LOVES / GLITTER | S04 (garden) |
| M O S T _ Y + the L | not a game move: the L rights itself | MOSTLY | S10 |

The montage rows keep the game's shape: each board's words start at equal length (4, 5 and then 6 letters), so difficulty is shown, not claimed. Other on-screen words: PLAN (the blueprint's title block) and SAGE, MINT, DILL (jar labels). The intermediate "MOST?Y" never shows a letter: the L's face is turned away until it completes MOSTLY.

**grep results** (`grep -o '"WORD"' src/dictionary.ts | wc -l` and `grep -cE "['\"]WORD['\"]" src/constants/blockedWords.ts`, run 2026-09-26):
```
PLAY dictionary.ts:1 blockedWords.ts:0      PANT dictionary.ts:1 blockedWords.ts:0
HEAR dictionary.ts:1 blockedWords.ts:0      PAY dictionary.ts:1 blockedWords.ts:0
PLANT dictionary.ts:1 blockedWords.ts:0     PLAN dictionary.ts:1 blockedWords.ts:0
HEART dictionary.ts:1 blockedWords.ts:0     SNAP dictionary.ts:1 blockedWords.ts:0
MILE dictionary.ts:1 blockedWords.ts:0      NAP dictionary.ts:1 blockedWords.ts:0
SMILE dictionary.ts:1 blockedWords.ts:0     SPOON dictionary.ts:1 blockedWords.ts:0
SUPER dictionary.ts:1 blockedWords.ts:0     SOON dictionary.ts:1 blockedWords.ts:0
SUPPER dictionary.ts:1 blockedWords.ts:0    GLOVES dictionary.ts:1 blockedWords.ts:0
LITTER dictionary.ts:1 blockedWords.ts:0    LOVES dictionary.ts:1 blockedWords.ts:0
GLITTER dictionary.ts:1 blockedWords.ts:0   MOST dictionary.ts:1 blockedWords.ts:0
MOSTLY dictionary.ts:1 blockedWords.ts:0    SAGE dictionary.ts:1 blockedWords.ts:0
MINT dictionary.ts:1 blockedWords.ts:0      DILL dictionary.ts:1 blockedWords.ts:0
MOSTY 0  (confirms the intermediate must never be legible)
```

**Move check** (`scratchpad/design/checkmoves.mjs`, which removes and inserts at the stated index and looks all four words up):
```
PLAY/PANT: move L (from index 1 to index 1) -> PAY/PLANT  valid=true
PLANT/HEAR: move T (from index 4 to index 4) -> PLAN/HEART  valid=true
SNAP/MILE: move S (from index 0 to index 0) -> NAP/SMILE  valid=true
SPOON/SUPER: move P (from index 1 to index 2) -> SOON/SUPPER  valid=true
GLOVES/LITTER: move G (from index 0 to index 0) -> LOVES/GLITTER  valid=true
```

**Rejected words:**
- **TEA/EAT jars:** EAT reads as a command and as appetite. SAGE/MINT/DILL labels reorder instead, so no word ever forms by itself.
- **TOP:** a banned promotional word.
- **BREAD/LOOM:** mixed lengths, which is not a real board shape.
- **CHAT/HEART and HEAR stings:** replaced by MOSTLY. HEAR as a final word echoes the banned "listening" register.

---

## 5. Audio plan

### 5.1 The bed: ONE continuous excerpt of `mobile/assets/music/home_phase0.mp3`
**Measured in this session** (onset and band-energy analysis, `scratchpad/audio/*` and `scratchpad/aud/outro.mjs`):
- about 136 BPM, G major;
- bass-less breakdown at file 94-104 s;
- a full stop at 105.0-106.1;
- **the drop at 106.23** (a big low hit), a short bass gap at 106.5-107.2, and the groove from 107.41;
- a one-bar bass-out break at 120.75-121.95, with the groove back at 122.10;
- the **outro breath** (bass out) at 129.4-131.9;
- a **hit at 132.09**, a pre-hit at 134.77, the **final hit at 135.22**, and near-silence by about 136.5 (the file is 137.6 s).

**Placement.** T = file - 98.171 (nominal), so the measured drop lands exactly on bar 5 (T 8.059).
- The bed starts at T 0.96 (file 99.13, a strong onset) with a 40 ms fade-in, so it "opens" on the first landing at 1.00.
- T 0.00-0.96 is meadow ambience and foley only.

**Resulting anchors** (the picture is built on them):

| File (s) | Trailer T (s) | Picture |
|---|---|---|
| 99.17 | 1.00 | first landing |
| 105.0-106.1 | 6.83-7.93 | stop: the six wooden knocks (on the eighths 6.74-7.84) |
| **106.23** | **8.06** | drop: the room comes alive |
| 120.75-121.95 | 22.58-23.78 | break: jars off-screen |
| 122.10 | 23.93 | groove back: the jars revealed swapped |
| 129.4 | 31.23 | breath: "Probably." |
| **132.09** | **33.92** | hit: the sign lands |
| 134.77 | 36.60 | pre-hit: the L flips |
| **135.22** | **37.05** | final hit: MOSTLY clicks |
| about 136.5 | about 38.3 | tail gone; picture holds to 39.00 |

There is no second bed and no splice: the music's own architecture (breakdown, stop, drop, break, breath, ending) is the trailer's structure.

**The build measures before it locks picture.** A new script, `audio/measure.mjs`:
- decodes the bed with ffmpeg;
- tracks beats with low-band onset autocorrelation over 125-145 BPM and fits a phase-locked grid;
- finds the exact drop, break, breath and hits (low-band rises above 6 dB within 30 ms);
- writes `src/grid.json` `{ offset, bpm, t0Bar1, anchors: { drop, breakIn, breakOut, breath, hit, preHit, finalHit } }`.

Every event time in `timeline/events.js` is authored as a function of that grid and those anchors: `bar(n, beat, eighth)` or `anchor('hit') + dt`. If a measured value differs from this spec by up to 3 frames, the picture follows the measurement automatically. A beat-sync report must show every landing, cut and hit within ±1 frame of its musical target (QA 7.2).

**Bed automation** (dB relative to the source; the loudness pass comes after):

| T (s) | Automation |
|---|---|
| 0.96-1.00 | fade in to -5 dB |
| 1.00-4.09 | -5 dB (the tactile SFX lead) |
| 4.09-6.83 | -3 dB |
| 8.06 | 0 dB (the drop) |
| 9.00-11.10 | -3 dB under typing |
| 20.40-21.30 | low-pass 18 kHz to 1.6 kHz, -4 dB, vibrato 0.5 Hz / 3 ms (`vibratoInPlace`); holds through S07-S09 |
| 33.92 | low-pass opens to full in 0.12 s |
| 38.30-39.00 | fade to silence |

### 5.2 The turn is scored by room, not by tension
There are no drones, rumbles, stingers, glitches, reversed voices or distortion anywhere. The uncanny is only "was that note off?":
1. **20.85:** a synthesized music box (a sine plus an inharmonic 2.76x partial, exponential decay) enters in G major: a quarter-note ostinato G5 B5 D6 B5 at -14 dB under the filtered bed.
2. **24.38:** as the swapped jars are revealed, the ostinato's B5 comes back a semitone low (A#5), **once**.
3. **27.47:** the ostinato stops as the camera pulls out of the den.
4. **31.35:** under "Probably.", a single G5 sags 30 cents and returns over 0.9 s, in the bed's own breath.
5. **37.05:** a single in-tune G6 on the MOSTLY click, under the bed's final hit (the resolution).

### 5.3 Game SFX
Allowed set only, from `mobile/assets/sounds`; each file's transient is aligned to its frame.

| File | T (s) |
|---|---|
| letter_select.wav | 0.03, 1.44 |
| valid_move.wav | 1.00, 37.05 |
| valid_move_2.wav | 2.77, 11.81 |
| valid_move_3.wav | 12.91 |
| valid_move_4.wav | 14.02 |
| star_pop_1 / 2 / 3.wav | flashes 3.21 / 3.43 / 3.65; emotes |
| amber_earn.wav | 4.09 |
| unlock.wav | 8.06, at -6 dB |
| dialogue.wav | 8.94; chatter at -24 dB in S09 |
| ui_tick.wav | typing, at -26 dB |
| ui_tap.wav | lamp clicks, at -22 dB |
| perfect.wav | 14.02 tail, at -12 dB |

**Never used:** any `*_dark`, `*_peace`, `glitch`, `arrival`, `phase_change*`, `whisper`, `story_bell`, `story_answer`, `pit_devour`.

### 5.4 Synthesized sound design
New voices go in `audio/synth.mjs`: deterministic, seeded, 48 kHz. Each is listed with where it is used.

**Ambience and layers**

| Voice | Where |
|---|---|
| meadowAir (pink noise, 200 Hz-6 kHz) and brook (band-passed noise with slow AM) | 0-8.06 and exterior shots |
| crickets (4.6 kHz AM chirps, seeded clusters) | 20.4-39.0 |
| birdsong (FM chirps, sparse) | 17.8-20.9 |
| fireCrackle (Poisson impulses through a band-pass plus a low rumble) | S08 |
| potBubble (low filtered noise bursts) | S07 |
| pad (G add9 swell) | 17.8-20.9 |

**Tactile foley**

| Voice | Where |
|---|---|
| resinClick (4 ms noise burst plus a 2.2 kHz damped sine) | 0.03 |
| ceramicTock (1.8 kHz damped sine plus noise) | under each landing |
| lockTink (3.1 kHz, 40 ms) | 1.30, 2.95 |
| slotZip (filtered noise sweeping up) | 0.40, 2.20 |
| sproutPluck (a pizzicato 880 Hz damped pair) | 1.20 |
| gemShower (40 seeded glass clicks, 2.4-6.2 kHz) | 4.09 |
| paperUnfurl | 4.09 |
| chalkScribble | 5.60 |
| woodKnock (modal wood block, pitches G4 A4 B4 D5 E5 G5) | 6.74-7.84 |
| mothFlutter (AM noise at 18-26 Hz) | S03 |
| glassTick | S07 |
| sparklerFizz (high-Q noise following each stroke) | S08 |
| signThunk (a 90 Hz wood body plus a felt thump) | 33.92 |
| woodTap ×2 / rockTick / flipTock / hopSwish | 35.55-36.80 |
| leafRustle | 38.30 |

**Motion and swells**

| Voice | Where |
|---|---|
| whoosh (existing) | arcs, the gem stream, cuts, the whip at 14.68, the pull-back at 27.47 |
| riser (existing) | 15.12-17.7 |
| windChime (bell cluster G5 B5 D6) | 17.77 |
| reverseSwell (existing, bell) | 25.6-26.15 |
| musicBox | 5.2 |
| boom (existing, a 70 to 38 Hz sub, 0.8 s, gain 0.5) | layered under the drop at 8.06 only, to reinforce the bed's own hit |

### 5.5 Mix and master
- `audio/score.mjs` builds the mix from the real cue sheet in `src/cues.js`, which is generated from `timeline/events.js`, so audio and picture share one source of truth.
- The bed carries the music. SFX sit on top. Captions have no sound.
- **Room tone never drops out.** No stretch quieter than -50 dBFS lasts 0.3 s or more; "Probably." has crickets under it.
- Master: two-pass linear loudnorm to **-14 LUFS integrated, -1.0 dBTP, LRA ≤ 11**. 48 kHz stereo, AAC-LC 320 kb/s.
- The same mix serves both aspects.

---

## 6. Technical architecture (three.js r180, vendored)

### 6.1 Runtime contract
Keep the scaffold contract: `index.html` + `src/main.js` expose `window.TRAILER = { isReady, duration: 39, fps: 30, renderAt(t), grab(q) }`, `?mode=capture`, `?aspect=16x9|9x16`, `?scale=0.5` for drafts. `render.mjs` steps frames in headless Chromium on SwiftShader and writes JPEG q0.97.

**Determinism is a hard rule.**
- `trailer.update(t)` is a pure function of t. Every animation is closed-form: `spring`, `ease`, `catmull`, `keys` and `seg` from `core/math.js`.
- Particles use per-index seeded `mulberry32` / `hash01`. **No `Math.random`, `Date`, `performance.now` or integrated state** anywhere under `src/`. CI greps for it (QA 7.2).
- Any frame renders identically, alone, in any worker, and a killed render resumes.
- Every texture and font loads before `isReady`. `warmTimes` renders one frame per shot so every shader compiles first.

### 6.2 Module plan
Reuse is marked **R**, a change **Δ**, new code **N**.

**Timing and timeline**
- **N `src/grid.js` + `src/grid.json`:** musical time (`bar()`, `beat()`, `eighth()`, `anchor()`), generated by `audio/measure.mjs`.
- **N `src/timeline/events.js`:** every event time in section 3, as grid expressions (for example `LAND_L = bar(1)`, `T_LIFT = bar(1, 2)`, `KNOCKS = [0..5].map(i => bar(4, 2) + i*EIGHTH)`).
- **N `src/timeline/shots.js`:** the shot table. Each shot has `{ id, start, end, transition, rig: { '16x9': rig, '9x16': rig }, look(tl), pose(world, tl) }`. A rig uses `poseCamera` keys (`pos`, `target`, `fov`, `roll`, `ease`), with explicit 9:16 keys (`pos916`, `target916`, `fov916`); `keep916` derivation is not allowed. It also carries `focus` / `aperture` / `maxBlur` keys, `msaa`, `mb` (subframes), `dusk(t)` and `captions`.
- **Δ `src/core/timeline.js`:** add the 'whip' transition. It already supports two-layer mixes.
- **Δ `src/trailer.js`:** builds the world once (`sets/world.js`) and returns `update(t)` → `{ layers, transition }`, `duration` 39, `warmTimes`.

**Core**
- **Δ `src/core/post.js`:**
  - two scene targets (MSAA 4 and none), chosen by `look.msaa`;
  - `renderLayer` accumulates N subframes into an `accumRT` when `look.mb > 1`, calling a callback `poseAt(t_i)` before each subframe;
  - no other structural change.
- **Δ `src/core/tiles.js`:** `TILE_SCALE` 0.45, gloss band in `tileFace`, clearcoat and roughness values (2.5), `setLocked(tile, k)` lerps the body to `#BBC4CF`, and an `attachSprout(tile)` hook.
- **Δ `src/core/text.js`:**
  - a caption engine with per-aspect layouts (2.7) and per-word animation;
  - the local scrim;
  - `placeAnchored(name, worldPos, camera, offsetPx, clampBox)` for the bubble and the end line (projects `worldPos` → px each frame);
  - `captions.srt` export from the caption table.

**World**
- **Δ `src/sets/world.js`:**
  - LAYOUT in unlock order (3.1);
  - the RESIDENTS map updated to match (Ember in cozy_den, Panko in kitchen, and so on; Fennick keeps `facing: -1` and gets `nativeFacing`, see sprites);
  - `setBuildState(t)` toggles cells: empty frame / building / built;
  - the pollen and firefly counts;
  - grass capped at **≤ 4,500 cards** in a near band (z 3-30), with the painting's meadow texture on the ground beyond;
  - the rack, sign and montage mini-racks added.
- **Δ `src/world/house.js`:**
  - `WINDOW_MASKS` = **all 9** that exist: cozy_den, kitchen, study, office, garden, desert, jungle, observatory, rainforest (never workshop);
  - `LAMPS` JSON of glow-card uv positions per room, measured on the art. Starting estimates: cozy_den fire (0.22, 0.37) and floor lamp (0.855, 0.75); kitchen ceiling lamp (0.15, 0.85) and oven fire (0.91, 0.40); office desk lamp (0.47, 0.60); burrow table lamp (0.86, 0.44); garden lantern (0.49, 0.83); bamboo lantern (0.58, 0.87); observatory lantern (0.10, 0.33); rainforest lantern (0.78, 0.66). Study, aquarium, jungle and desert get no glow card and brighten through their point light only;
  - the dusk paint multiplier floor is 0.82 (S08's den excepted, see 2.3);
  - empty-frame look (dark wood back board, no floor);
  - build animation hooks: timber pieces, and a wallpaper unroll via a shader mask with a moving bright seam;
  - the rainforest window mask is tinted at dusk so its painted rain never reads as a storm.
- **Δ `src/world/tod.js`:** `dusk(t)` keys; sun azimuth and elevation path (2.3).
  - `makeSkyBackdrop({ tilesX: 1 })`: the single painting, band v 0.00-0.68 (sky to the river's near bank), with the edge column clamped outside u 0-1 (never mirrored), blurred and **faded into a haze colour** (`SKY_EDGE`; so no mountain visibly repeats).
  - Sized so the unmirrored painting covers 100% of the widest 16:9 frame: upscale ≤ 2.1x, softened by DOF.
  - A procedural pixel cloud-card layer (6 cards) for the time-lapse.
  - Optional: a river glint layer (a colour-keyed mask of the painted river, scrolling sparkle), P2.
- **Δ `src/world/sprites.js`:**
  - **HD-2D rim** via `onBeforeCompile`: `rim = keyColor * rimK * clamp(a(uv) - a(uv + keyDirUV*2*texel), 0, 1)` (the alpha-edge rim in the key light's colour);
  - the time-of-day multiply and a warm wrap term;
  - NearestFilter magnification, LinearMipmapLinear minification, alphaTest 0.5, `customDepthMaterial` for shadow silhouettes, contact decals;
  - **`nativeFacing` corrections** as in `AnimalSprite.tsx` (fennec idle and talk face left, walk faces right);
  - Axel's talk frame is identical to idle by design (his scuba mask), so it is left alone;
  - a pop-in helper (sparkle puff plus a 0 to 1.12 to 1 scale).
- **N `src/world/rack.js`:** the word rack (2.5), trays, and a mini-rack factory for S04.
- **N `src/world/hero.js`:** the hero L (tile + sprout + lock), its carry states (rack, stream, hammock, shelf, mantel, rack face-away) and the MOSTLY choreography.
- **N `src/world/blueprint.js`:** the unfurl from PLAN's three tiles, the flight, and the chalk draw-on at the frame.
- **Δ `src/world/moves.js`, `wordrow.js`:** tray-only; slot open/close springs; flight arcs; lock tint on landing; landing squash (existing).
- **Δ `src/world/fire.js`:** `strokes: [{ pts, start, dur }]` (multi-stroke drawing, each stroke revealed by arc length), with 40 sparks. The house path, in local units centred above the mantel:
  - walls: (-0.30, 0.34) → (-0.30, 0) → (0.30, 0) → (0.30, 0.34)
  - roof left: (-0.36, 0.30) → (0, 0.60)
  - roof right: (0, 0.60) → (0.36, 0.30)
  - door: (-0.07, 0) → (-0.07, 0.17) → (0.07, 0.17) → (0.07, 0)
  - chimney: (0.15, 0.47) → (0.15, 0.58) → (0.23, 0.58) → (0.23, 0.40)
  - **No window.**
- **Δ `src/world/props.js`:** `makeShelf` gets a backboard that covers the painted shelf. The jars' lettered pixel labels (a 96x32 canvas, Figtree Bold 27 px, squeezed to 82% width, NearestFilter) are drawn by `src/shots/interiors.js` `spiceLabel`, not props.js.
- **Δ `src/world/logo.js`:** sign plus posts; drop and squash; glint uniform masked to the letter hues.
- **R/Δ `src/world/fx.js`:** amber stream, emotes (`poseEmote`), trail, contact shadow; add sawdust sparks, a dust puff and wood chips.
- **R `src/world/env.js`:** particles (dust, pollen, fireflies, glitter, sawdust, bubbles), shafts.
  - Fireflies get a **pair-separation rule**: no two simultaneously bright fireflies within 0.8 units horizontally and 0.2 units vertically of each other, checked at build time from the seeds, so none ever read as a pair of eyes.

**Audio**
- **Δ `audio/score.mjs`, `synth.mjs`, `mix.mjs`:** the section 5 cue sheet and new voices.
- **N `audio/measure.mjs`:** described in 5.1.

### 6.3 Scene graph per act
One `THREE.Scene`, built once. Per shot, `pose()` sets visibility, state and lights. Shadows are only on when an exterior shot needs them.

```
Scene
├─ Lights: sun (DirectionalLight, 2048 shadow, castShadow only in exterior shots), hemi, signKey (Act IV)
├─ Backdrop: skyBackdrop (single painting + hazed clamped edges, afternoon/dusk mix, wipe), cloudCards[6]
├─ Ground: meadow plane (painting meadow texture, receiveShadow), grass (instanced ≤4,500), flowers (instanced), contact decals
├─ House (group, x=0)
│   ├─ shell: posts, slabs, back board, sides (pixelWood), roof slopes (pixelShingles), gable card (roof.png), chimney, foundation (foundation_0 → foundation_2 at dusk), house_shadow decal
│   ├─ cells[12] (each: painting plane, window-mask plane, floor, side returns, point light, lamp glow cards, build parts, resident sprite + contact shadow)
│   ├─ jungle extras: 3D leaf cards, light shaft, moths
│   ├─ kitchen extras: 3D fire in oven, steam puffs, shelf + backboard + jars [SAGE, MINT, DILL]
│   ├─ den extras: 3D hearth fire + stroke drawing, mantel slot for the L
│   └─ montage mini-racks (aquarium, desert, garden), visible 11.59-14.68 only
├─ Rack (meadow, x=-3.4, z=12): uprights, trays[3], tiles (PLAY/PANT/HEAR, then MOST?Y)
├─ Sign (end card): wordmark sign + posts, hidden until 33.92
├─ Hero: L tile + sprout (parented per carry state)
├─ FX: amberStream, blueprint, sawdust, dust puffs, emotes (billboards), trail
└─ Particles: pollen/dust (day), fireflies (dusk), glitter, bubbles, sparks, smoke puffs
```

| Act | Visible | Hidden | State |
|---|---|---|---|
| **I** (0-8.06) | rack (full), house (early build state), Ember at the rack, stream, blueprint, hero, pollen, grass, sun shadow | sign, mini-racks, fireflies | dusk 0 |
| **II** (8.06-17.77) | S03 interior extras (jungle); montage mini-racks (S04); full house with shadows and grass (S05) | the rack (off-camera) | dusk 0 |
| **III** (17.77-33.92) | time-lapse, then interiors (kitchen/den extras), then the wide | pollen fades out, fireflies in | dusk ramps to 1; grass and shadows on for S06/S09 only |
| **IV** (33.92-39) | rack (MOST?Y), sign, the house as backdrop, fireflies, grass | | dusk 1; shadow on (rack and sign cast onto the grass) |

### 6.4 Asset usage (allowlist, enforced)
`render.mjs` logs every fetched URL. The build **fails** on anything outside this list, and on any path matching `robed|sky_storm|sky_shadow|sky_peace|entity|shadow_figure|pitt_|pit_entrance|workshop|aye_aye|_dark|_peace|glitch|arrival|phase_change|whisper|story_bell|story/`.

| Kind | Allowed files | How they are used |
|---|---|---|
| Characters | `characters/{fox,pangolin,owl,axolotl,sloth,fennec_fox,capybara,wombat,rabbit,red_panda,tarsier,kakapo}/{idle,talk}.png`; `fox/walk_0..9.png`; the others' `walk.png` (4x2 atlas of 256 px) | NearestFilter billboard planes with HD-2D rim; the walk atlas via `atlasFrame` |
| Rooms | `rooms/{cozy_den,kitchen,study,aquarium,jungle,desert,office,burrow,garden,bamboo,observatory,rainforest}.webp`; `rooms/windows/{the 9}.png` | textured back-wall planes (NearestFilter, painted frame border cropped in the UVs); window masks as tinted planes |
| Environment | `environment/{sky_afternoon.webp, sky_dusk.webp, roof.png, wall.png, foundation_0.png, foundation_2.png, house_shadow.png}` | backdrop, gable card, shell textures, foundation, contact decal |
| UI | `ui/{wordmark.png, amber.png, emote_heart.png, emote_note.png, emote_sparkle.png, emote_thought.png, emote_question.png}` | 3D sign, amber billboards, emote billboards |
| Fonts | `fonts/{Figtree-Bold.ttf, EpundaSlab-Regular.ttf, EpundaSlab-Bold.ttf, EpundaSlab-Italic.ttf}` | captions, bubble, tile faces |
| Audio (score build only) | `music/home_phase0.mp3`; `sounds/{letter_select, valid_move, valid_move_2, valid_move_3, valid_move_4, star_pop_1, star_pop_2, star_pop_3, amber_earn, unlock, dialogue, ui_tick, ui_tap, perfect}.wav` | bed and game SFX (section 5) |

**Not used:** the painted story pages. `story/pages/witness-05.webp` may serve only as an alternative YouTube thumbnail, outside the film.

### 6.5 Per-shot camera rigs, both aspects
Each shot owns two rigs. Positions come from section 3 and are expressed in `shots.js` as keyframes `[[t, pos, target, vfov, roll, focus, aperture], ...]` interpolated with Catmull-Rom plus the shot's easing. A rig may reference a live object's world position (`follow: 'heroL'`, lead 3 frames, critically damped) for the S01 follow and the S03 bubble anchor.

**Rules**
- Interiors stay ≤ 15° off the painting normal.
- 9:16 rigs keep all added overlays inside x 96-918 and y 200-1440. The render asserts this on overlay alpha every frame.
- 9:16 camera paths are authored natively: vertical cranes, stacked trays, tall house. They are never a crop.

### 6.6 Crisp text
- Overlay text is canvas-rasterized at output resolution (2.7), with 1:1 texel-to-pixel mapping on an orthographic quad drawn after the grade. There is no SDF: canvas at exact size is crisper for fixed-size captions and lets the build use the real OFL fonts.
- Re-rasterize only when content changes: bubble typing changes `nChars`; the per-word animation moves prebuilt word quads.
- 3D text (tiles, jar labels, blueprint title) uses the canvas textures with mipmaps and anisotropy 8. Tiles use a 384 px face canvas per letter.
- The end line is positioned from the sign's projected bounding box on the locked camera (computed once per aspect).

### 6.7 Render cost and schedule (SwiftShader, 1080p)

**Draw calls.** Typical exterior: about 180-230 (12 cells x about 6, around 30 tiles, 12 sprites, 1 instanced grass, 1 instanced flowers, about 8 Points systems, shell pieces). Interiors: about 60-90.

**Cost drivers**
- The shadow map: exterior shots only (S01-S02, S05-S06, S09-S10).
- DOF: half-resolution gather. If a frame takes over 1.5 s, drop to 24 taps.
- Bloom: 5 mips at half resolution.
- MSAA: only S01, S04, S10.

**Estimates**
- Interiors: about 0.6-0.9 s per frame.
- Exteriors: about 1.0-1.4 s per frame.
- Motion-blur subframes: about 170 extra renders.
- **Total ≈ 1,340 renders × about 1.0 s ≈ 22 CPU-min per aspect.** With `--workers=2` per aspect on the 4-core box, about 12 min per aspect.

**Schedule**
1. **Stills first:** `render.mjs --scale=0.5 --stills=0,1.0,2.8,4.1,6.3,8.5,10.5,11.9,13.0,14.1,16.5,19.0,20.8,22.0,24.5,26.2,29.5,32.5,34.0,37.1,38.9` for both aspects. Review them on a sheet (`sheet.mjs`).
2. A half-scale draft of the full timeline, with the audio muxed. Check sync against the beat-sync report.
3. The full 1080p render.
4. Encode.

### 6.8 Encode
- **Video:** `encode.mjs` (existing): libx264 High, `-preset slow -crf 16 -pix_fmt yuv420p -colorspace bt709 -color_primaries bt709 -color_trc bt709 -movflags +faststart`, 30 fps.
- **Audio:** AAC-LC 48 kHz at 320 kb/s from `score.wav`.
- **Outputs:**
  - `out/wordshift-cinematic-16x9-1920x1080.mp4`
  - `out/wordshift-cinematic-9x16-1080x1920.mp4`
  - `out/captions-en.srt`
  - `out/trailer-report.json`: grid, anchors, cue sheet, QA results and ffprobe of the outputs.

---

## 7. Compliance

### 7.1 Checklist against every hard boundary

| Boundary | How this spec satisfies it |
|---|---|
| No robes | Only `idle`, `talk` and `walk` sprites load. `robed` fails the URL allowlist. |
| No shadow figure, entity, creature, silhouette or eyes; no crimson or glowing eyes in the dark | None are modelled. `entity`, `shadow_figure` and `pit` are blocked. The fire draws only a door-and-chimney house with **no window**. The firefly pair-separation rule (6.2) applies. Particle sheets are reviewed for faces or eyes. Vesper stays small and out of bloom. The Star Loft's two portholes are never a matched pair: a curtain makes the left a lopsided crescent and ivy crosses the right. The wordmark's carved eye is never glinted or zoomed. |
| No CLOSED/CLOSER, final board, rituals, cult imagery, ending content | The only words are the verified list in section 4. No story art. No pit (`pit_entrance` is blocked). No offering imagery: HEART is never fed to a fire; the amber rises from the rack's centre. |
| Nothing darker than sky_dusk; no storm or night skies | Only `sky_afternoon` and `sky_dusk` load. The dusk paint floor is 0.82 (the S08 den close-up alone takes a further 0.86 so Ember's fur reads against the wall; that frame measures YAVG about 110). The luma gate YAVG ≥ 72 applies on every frame from 20.4 s (sky_dusk measures 75.08). No stars are added. The rainforest window is tinted. No fade to black. |
| Never announce or locate a presence | No "under the floor", "listening", "paying attention", "already written" or "coming". No off-screen sounds with no cause: no jar clink while the jars are off-screen, and no click after the logo. No lamp dips. No unison freeze or stare. No resident looks at camera. The L never turns toward camera. |
| The uncanny stays at the allowed tease level | Three deniable beats: the jars reorder while off-camera, the fire draws a little house, and the L rights itself into MOSTLY. Plus "Probably." and two slightly-off music-box notes. |
| On-screen copy is plain ASCII, straight quotes, no em or en dashes | The caption table (3.4) is linted by `qa/copyLint.mjs`: code points 32-126 only, `'` only, no em dash (U+2014) or en dash (U+2013). |
| No call to action; no promotional words | Lint banned list: download, install, play now, get it, try, best, #1, top, new, free, sale, now, today, limited, and "!" in captions. Every string passes. |
| No prices, testimonials, awards or download counts; never "composed" or "orchestral" | None present. The music is never described. |
| Factual claims only | "Move one letter." / "Both words stay real." (the rule). "Puzzles earn amber. Amber builds rooms." (the loop). "Over 4,000 word puzzles." "Animal friends. Each with a room." has **no number**, because 12 residents are shown (Tock is excluded). Difficulty is shown as 4-, 5- and 6-letter boards, not claimed. |
| Never name a phase or stage | No labels. The time-of-day change is shown, never named. |
| Allowed-tease level only | Verbatim allowed tease: "The animals talk about you when you're away. All good things. Probably." A paraphrase at the same level: "Panko's spice jars keep changing places." A visual-only tease: the fire drawing. The brand line: "A cozy word game." + MOSTLY. |
| Tock and the Belfry never appear | `aye_aye` and `workshop` are blocked. The Belfry is absent from the grid. |
| Every shown word is real and cheerful | See section 4. |
| 9:16 safe zones | Nothing added below y 1440 or right of x 918. Asserted per frame. |
| Distinct from Play surfaces | No caption repeats a screenshot, feature graphic or Play-trailer caption verbatim: "Both words stay real." ≠ "Keep both words real."; "Over 4,000 word puzzles." ≠ "Over 4,000 puzzles." The owner flag in 9.3 covers the full description. |

### 7.2 QA gates (the build fails on any)
1. **Copy lint:** as in 7.1.
2. **Words:** every tile word and label string (`qa/words.mjs`) must be present in `dictionary.ts` and absent from `blockedWords.ts`. All moves must re-validate as in section 4.
3. **Asset allowlist:** the URL log is checked against 6.4.
4. **Luma:**
   - Every frame from T 20.4 to 39.0, in both aspects: `signalstats` YAVG ≥ 72.
   - The darkest 2% of pixels average luma ≥ 18.
   - No window region of any room reads below luma 40 (the per-room mask projected to the screen).
   - `s09-corners-16x9`: over the 16:9 S09 hold (28.35-33.92), both upper corners (crops x 0-400 / y 80-400 and x 1520-1920 / y 40-350) read YAVG >= 75.
5. **Tile swatch:** in stills at T 0.5 and 2.9, sampled face colours (away from the glyph) are within ΔE2000 ≤ 6 of the FG-B values in 2.2.
6. **Overlay bounds:** in 9:16, no overlay pixel with alpha > 0.01 outside x 96-918, y 200-1440. In 16:9, nothing below y 972. `endcard-safe-9x16`: in every 9:16 S10 frame, the projected sign, tray, posts and tiles stay inside x 96-918.
7. **Determinism:** frames 0, 400, 800 and 1169 rendered in two separate processes are byte-identical (or PSNR ≥ 55 dB). `grep -rE "Math\.random|Date\.|performance\.now" src/` returns nothing.
8. **Sync:** the beat-sync report puts every landing, cut, knock and hit within ±1 frame of its grid or anchor.
9. **Audio:** -14.0 ±0.5 LUFS integrated; true peak ≤ -1.0 dBTP; no gap below -50 dBFS lasting 0.3 s or more; duration 39.000 s ±1 ms.
10. **Outputs:** 1170 frames per aspect, the exact resolutions, 30/1 fps, BT.709 tags, faststart.
11. **Frame-sheet review** (one frame every 0.5 s, plus 6 fps over 0-3 s and 33.9-39 s):
    - no particle arrangement reads as eyes or a face;
    - no dark window;
    - no text over a face;
    - no tile legible mid-swap;
    - no shimmering pixel art.

---

## 8. What NOT to do (the cheap-looking and non-compliant traps the judges named)

**Tiles, props and the house**
1. **No twine garlands** for words: catenary sag tilts tiles and kills legibility. Use trays on the rack and mini-racks.
2. **No muted or orange tiles:** hit the FG-B swatches with the gloss band and exposure. Never invent pastel hues.
3. **No tiled sky:** `tilesX = 3` repeats the mountain. Use one painting with haze-veiled edges: the painting's last 12% melts into a blurred copy and the margin continues its edge column (clamped, never mirrored) out of focus into dusk haze, covering the frame.
4. **No 14k shadow-receiving grass on SwiftShader.** Cap it at 4,500 in the near band, with the painted meadow beyond.
5. **No projection-mapped rooms or big off-axis orbits inside rooms:** flat painted back walls, ≤ 15° off-axis.
6. **Do not leave the window masks at 5 rooms;** all 9 are required. Never let a window go dark.
7. **No MSAA everywhere** (it quadruples SwiftShader fill). Use it on tile shots only.
8. **No explainer overload:** one metaphor (the blueprint), then the room rises. No tile rain, roof slam or chalk everywhere.
9. **No HEART fed to a fire** (offering read), and no amber rising from PAY (money read).

**Timing and copy**
10. **No montage landing held under 0.8 s.** No stacking two claims in one caption. Do not caption "Five difficulty levels" (show it with 4, 5 and 6 letters).
11. **No numbered cast claim** over a shot that lets viewers count 12.
12. **No stale jar caption.** "Panko's spice jars woke up in another order." is ungrammatical and contradicts the picture; use the section 3 line.
13. **No second music bed or genre switch at the turn,** no drones, rumbles or horror stingers, and no fade to black.

**Staying deniable**
14. **No synchronized stare,** no unison freeze, no resident looking at camera, no lamp dip, no draught cues, no self-turning objects on camera other than the L's final flip, and no off-screen clicks or clinks.
15. **No L turning to "look" at the camera,** no added stars, no EAT or command words, and no window in the fire's drawing.
16. **No glint lingering on the wordmark,** and never zoom toward its carved eye.

**Assets**
17. **No `pit_entrance`, story paintings in the film, `sky_day`-to-night skies, `robed*`, `workshop`, or Tock.**
18. **No DOF, grain or bloom on captions,** and no boxes or plaques behind captions (only the soft scrim). The bubble is the one parchment element.

**Engineering**
19. **No `Math.random` or integrated simulation.** Everything is a function of t.
20. **No 9:16 made by cropping the 16:9 render.**
21. **No flat UI screenshots of the puzzle screen.** This is a stylized world trailer. The Play preview keeps real capture.

---

## 9. Must-fix ledger (every judge finding and where it is fixed)

### 9.1 Judge 1 on the Diorama
| Finding | Fix |
|---|---|
| Unison stare and lamp dip | Removed. S09 has a staggered emote cascade and chatter between residents, with no one looking at camera. |
| 13 vs 12 | "Animal friends. Each with a room." |
| Weak frame 0 | L 25% lifted, specular ping, resin click at 0.03, caption at 0.35. |
| Twine legibility | Trays only. |
| Montage too fast | Holds of 0.88 s; difficulty shown by word length. |
| Jar caption grammar | Rewritten. |
| "Very fond" too close to the Play trailer | Replaced by the allowed "talk about you... Probably." |
| 42 s is long | Cut to 39 s; a 20 s social edit is optional follow-up (9.3). |

### 9.2 Judges 2 and 3
| Finding | Fix |
|---|---|
| Lamp dip | Removed. |
| HEAR sting | Replaced by MOSTLY. |
| Jars "woke up" | Rewritten. |
| Caption density | Nine caption beats, two visual-only shots, the fire caption dropped. |
| Grid order | Unlock order. |
| Rainforest rain | Tinted and small. |
| Tiled sky | Single painting with haze-veiled edges. |
| Garlands | Removed. |
| Palette | Swatch gate. |
| Blank jars too subtle | Readable labels, a whole-row reorder, and the L moved too. |
| Grass cost | Capped. |
| 5 window masks | 9. |
| Projection | Flat walls, ≤ 15° off-axis. |
| Mushy two-bed handoff | One continuous excerpt. |
| Letter concept's stars | Removed. |
| Letter concept's L turn | Removed. |
| TEA to EAT | SAGE/MINT/DILL. |
| Ember's warm-smile edit | Stock talk frame only. |
| Tile-flip mosaic | Not used. |
| Short time-lapse | 2 bars. |
| MSAA cost | Per shot. |
| Parallax-split 941 px paintings | Not used; one backdrop plus 3D ground. |
| Remake overlap with the Play trailer | Ember's quoted line and the jar question are not used; Gerald stays (all judges' favourite). |

### 9.3 Owner flags (outside the build)
- **Music rights:** the beds are Suno-made, so clear commercial use and YouTube Content ID before publishing (brief section 11).
- **Brief rule 11 applies to Play surfaces.** This YouTube cinematic reuses the owner-approved tease "The animals talk about you when you're away. All good things. Probably." and the brand line (tiles). Confirm that this is fine outside Play.
- **Title the video "cinematic trailer"** on YouTube so it is never mistaken for gameplay capture.
- **Optional follow-up:** a 20 s social edit from the same timeline (S01 0-4.5, S03 8.9-11.6, S07 21.3-24.8, S10 33.9-39.0, with a bar-accurate bed edit). Not part of this build.
