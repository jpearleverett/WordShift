# Art brief: the entity that holds the house

The figure behind the house (Phase 3 on) is currently drawn by code
(`scripts/tools/generateShadowEntity.mjs`). Two blind art reviews scored it well
below the rooms, residents and roof. This brief asks for the same kind of art
as those: generate each piece with the tool that made `roof_raw.png` and
`phase_1..5.png`, on the same **near-white studio background**, and drop the
files in this folder. The code keys out the background, downscales to the
house's pixel density and adds the per-phase glow itself.

## Style (applies to every piece)

- Detailed pixel art in the same style as the cottage: roof tiles, stone
  foundation and the robed animal residents. Crisp pixels, a dark outline and
  4-6 shading steps. No painterly blur.
- The figure is never named or explained. It is tall, patient and faceless:
  a deep hood with nothing inside except two small eyes.
- Cloth: very dark charcoal-violet, like the residents' robes, with long heavy
  folds and a slightly ragged hem.
- **No glow, no rim light, no background scenery.** One flat near-white
  background. The game adds a crimson backlight in Phase 4 and mauve in
  Phase 5, so the art itself must stay neutral.
- Front view, lit softly from the upper left.

## The pieces

1. **`entity_head_raw.png`, hood and shoulders (square, e.g. 1024x1024).**
   A towering hooded figure seen from the front, cropped just below the
   shoulders. The hood is tall with a slightly bent, crumpled point. The cowl
   is deep and black, with two small pale eyes set slightly off-centre. The
   shoulders are broad and draped, roughly 2.3x the hood's width, and the
   cloth falls straight down at the edges of the frame.

2. **`entity_sleeve_raw.png`, one long hanging sleeve (tall, e.g. 512x1536).**
   A left arm in a long, heavy robe sleeve hanging straight down, seen from
   the front. At the top it joins a shoulder. It bends very slightly outward
   at the elbow and ends at the bottom in a wide, ragged bell cuff with a dark
   opening. Show no hand. The middle third must be plain vertical folds, so
   the code can extend it to the house's height without visible repeats.

3. **`entity_hand_raw.png`, the hand on the stone (square, e.g. 1024x1024).**
   A gaunt, pale, grey-violet clawed hand coming down out of a dark bell cuff
   at the top of the frame. Four long bony fingers with visible knuckles curl
   over the top edge of a grey stone ledge and grip its face. Dark curved claws
   and a thumb round the corner. **Draw the ledge too** (a simple pale block),
   so the grip reads; the code crops it away and keeps the hand and its cast
   shadow.

## What happens next

Send the three files, or commit them here as `assets/raw/entity_*_raw.png`.
The pipeline will:

- key out the background, the way `processRawWorldArt.mjs` does for the roof;
- downscale to 1.5dp per art pixel;
- mirror the sleeve and hand for the right side;
- stretch the sleeve's plain middle section to fit the house's height;
- generate the per-phase rim;
- swap them in for the code-drawn pieces.

The layout, phases, eyes and animation in `HouseWorld.tsx` stay as they are.
