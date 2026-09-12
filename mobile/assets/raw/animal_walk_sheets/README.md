# Animal walk source sheets

These eleven original image generation outputs contain eight authored walking
poses each, in a four-column, two-row grid. `manifest.json` retains the exact
prompt and SHA-256 of every source. Each prompt references the corresponding
existing `assets/characters/<animal>/idle.png` to preserve character identity.
All walks face right. Fennec's original idle art faces left; the build accounts
for that difference when matching its horizontal framing, and the renderer
accounts for it when displaying the existing idle and speaking art.

The source sheets are provenance/build inputs only and are not imported by the
app. The runtime imports one `walk.png` atlas per character. Fox keeps its
original ten walk frames. Axolotl keeps its existing movement.

From `mobile/`, rebuild or verify the prepared assets with:

```sh
node scripts/tools/buildAnimalWalkAtlases.mjs
node scripts/tools/buildAnimalWalkAtlases.mjs --check
node scripts/tools/buildAnimalWalkAtlases.mjs fennec_fox --check
```

The build removes only the flat magenta backing and connected magenta edge
fringe, packs each sheet into eight transparent 256×256 frames (1024×512 total),
and uses nearest-neighbor sampling to retain pixel edges. One scale and one
horizontal anchor apply to the entire cycle. This preserves the relative motion
of limbs and tails instead of recentering each pose to its changing silhouette.
The visible feet align with that character's existing idle alpha baseline, and
the median cycle height matches its idle height. A fit safeguard retains all
ears, tails and feet inside a transparent gutter without clipping.

For a newly generated/revised source, `--import <directory>` accepts JSON records
containing `type`, `prompt` and `generatedPath`, copies the original PNG output
into this folder, updates the manifest and builds the selected character(s).
No generated source or runtime sheet modifies existing idle, speaking or robed
artwork. Visual review of all eight poses is still required after changing an
authored sheet; geometric checks cannot judge character fidelity or a gait.
