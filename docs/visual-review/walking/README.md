# Walking visual review

These chronological strips show both outfits using the exact runtime PNGs. Each new cycle has eight frames; the original normal fox keeps ten. Contact poses are 0/4 and passing poses 2/6 (approximately 0/5 and 2/7 for the original fox).

Updated September 20 for the [foot-direction repair](../../ANIMAL_WALK_REPAIR_2026-09-20.md): seventeen lower-limb frames across fourteen atlases. The strips and checksums reflect these corrected assets. Earlier CI evidence linked below documents the preceding version; the new report records this follow-up's validation.

| Animal | Complete frame strips |
| --- | --- |
| Fox | [Normal and robed](fox-frames.png) |
| Owl | [Normal and robed](owl-frames.png) |
| Pangolin | [Normal and robed](pangolin-frames.png) |
| Axolotl | [Normal and robed](axolotl-frames.png) |
| Capybara | [Normal and robed](capybara-frames.png) |
| Fennec Fox | [Normal and robed](fennec_fox-frames.png) |
| Sloth | [Normal and robed](sloth-frames.png) |
| Wombat | [Normal and robed](wombat-frames.png) |
| Rabbit | [Normal and robed](rabbit-frames.png) |
| Red Panda | [Normal and robed](red_panda-frames.png) |
| Tarsier | [Normal and robed](tarsier-frames.png) |
| Aye Aye | [Normal and robed](aye_aye-frames.png) |
| Kakapo | [Normal and robed](kakapo-frames.png) |

From `mobile/`, generate the self-contained interactive playback and optional GIF previews:

```sh
node scripts/tools/buildWalkReview.mjs --html /tmp/wordshift-walk-review.html --evidence-dir /tmp/wordshift-walk-evidence
```

The HTML supports pause, complete-cycle scrubbing, facing reversal, species cadence, and 90px/180px viewports. The generated GIFs show both outfits, both sizes and both directions. The renderer creates review evidence from committed assets without retouching artwork.

`asset-checksums.json` identifies all 35 source PNGs and geometry. The atlas previews omit room placement and phase tint; the [successful CI run](https://github.com/jpearleverett/WordShift/actions/runs/35228207088) includes all 43 actual game journeys. Its [browser evidence](https://github.com/jpearleverett/WordShift/actions/runs/35228207088/artifacts/10500252570) contains phase 3/4/5 screenshots and walking observations. See the [validation report](../../ANIMAL_WALK_REVIEW_2026-09-17.md) for scope and native-device limits.
