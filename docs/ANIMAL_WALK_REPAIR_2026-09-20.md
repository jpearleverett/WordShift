# September 20 animal foot-direction repair

The brief backward-foot flash was present in the authored PNG frames. Runtime
playback already traverses the atlas in chronological order and keeps facing
stable during each travel leg. No animation timing or movement code changed.

All thirteen animals were reviewed in both outfits against the original fox.
Seventeen frames across fourteen atlases received lower-limb corrections made
with built-in image generation. Each correction is packed into a retained
original atlas; all pixels outside its declared rectangle remain identical.
The ten original normal fox frames, robed fox, static portraits, and other
unaffected cycles are unchanged.

| Animal | Normal outfit | Robed outfit |
| --- | --- | --- |
| Fox | Original reference retained | Reviewed; retained |
| Owl | Frame 6: light near foot swings forward over dark support foot | Reviewed; retained |
| Pangolin | Reviewed; retained | Reviewed; retained |
| Axolotl | Reviewed; retained | Reviewed; retained |
| Capybara | Frame 4: both toes point forward; trailing/leading leg colors retained | Reviewed; retained |
| Fennec fox | Frame 2: dark far foot passes forward; original tail preserved | Reviewed; retained |
| Sloth | Frames 3–4: trailing near claws point forward | Frames 3–4: same correction |
| Wombat | Frame 4: forward toes; frame 6: compact raised foot | Frame 6: recognizable forward raised foot |
| Rabbit | Frame 6: forward raised paw instead of dangling backward | Frame 6: same correction |
| Red panda | Reviewed; retained | Reviewed; retained |
| Tarsier | Frame 6: forward raised toes instead of dangling backward | Frame 6: same correction |
| Aye-aye | Frame 6: compact forward step replaces oversized folded shin | Frame 6: same correction |
| Kakapo | Reviewed; retained | Frame 6: near foot passes forward instead of staying behind |

## Reproducibility and visual review

`mobile/assets/raw/animal_walk_sheets/manifest.json` records exact generated
source checksums, edit prompts, base provenance, selected frames, and patch
rectangles. The new `frame-patches` format rebuilds only those rectangles.
The asset tests verify every decoded pixel outside them, along with source
checksums, transparent gutters, binary alpha, consistent floors and eight
distinct frames. These structural tests do not judge toe anatomy; visual review
is still required.

All complete cycles were inspected chronologically at game size and enlarged,
including both travel directions. Packed-frame review checked seams, foot
orientation and near/far leg identity. Contact frames 0/4 must alternate the
leading leg; passing frames 2/6 must alternate the raised leg. A repair that
merely recolored or repeated the first half of the loop was rejected.

The refreshed [frame strips](visual-review/walking/README.md) contain the exact
runtime assets. Generate interactive playback (90px and 180px, both directions,
pause and scrub) from `mobile/`:

```sh
node scripts/tools/buildWalkReview.mjs --html /tmp/walk-review.html
node scripts/tools/buildAnimalWalkAtlases.mjs --check
```

## Validation

- All 25 atlas rebuild checks pass byte-for-byte, including fourteen patched
  atlases; original normal fox files remain identical to main.
- All 54 focused tests in `animalWalkAssets` and `animalSpriteFacing` pass.
- TypeScript and lint with zero warnings pass.
- All four existing `animal-walking.spec.ts` browser journeys pass: thirteen
  residents moving in their real rooms in phases 3, 4 and 5, plus reduced motion.
  They verify decoded outfits, frame progression, both atlas rows and travel
  direction; anatomical foot direction was checked in the visual review.
- Generated the 26-cycle interactive review and four motion previews; refreshed
  the committed chronological strips and source checksums.

No signed Android build or Play upload is part of this artwork repair. Final
device-scale appearance remains available to check in the next internal build.
