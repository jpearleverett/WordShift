# Animal walking sources

The runtime has 26 outfit cycles for thirteen residents: the fox's original ten
normal frames, twelve normal eight-frame atlases, and thirteen robed eight-frame
atlases. Normal clothing runs in phases 0–3 and robes in phases 4–5. Both atlas
outfits face right, including fennec; the renderer separately corrects his
left-facing static portraits. Reduced-motion and device-tier limits still apply.

Every eight-frame cycle contains two steps: the near foot leads at frame 0 and
trails at frame 4, with opposite passing legs at frames 2 and 6. A set of eight
different images alone does not prove that the legs alternate. Inspect the full
loop, direction, costume and contact poses after any artwork change.

`manifest.json` retains checksums and distinguishes two source formats:

- `sheet`: original generated 4×2 image plus its exact generation prompt. The
  builder removes backing/fringe, uses one scale and horizontal anchor for the
  whole cycle, and packs transparent 256px cells at the matching portrait floor.
- `prepared-atlas`: an accepted, normalized output recovered after automatic
  workspace cleanup removed its larger generated source and exact per-call
  prompt. The unchanged reviewed atlas is retained under `recovered/`, with an
  explicitly labelled prompt summary and provenance. The builder checks its
  geometry and checksum, then restores it byte-for-byte. It is not represented
  as the original image-generation output.

The older unreferenced sheets remain historical art; the manifest identifies the
inputs used for current builds. Raw sources are excluded from EAS archives; only
prepared runtime character assets ship.

From `mobile/`:

```sh
node scripts/tools/buildAnimalWalkAtlases.mjs --check
node scripts/tools/buildAnimalWalkAtlases.mjs rabbit --pose robed --check
node scripts/tools/buildAnimalWalkAtlases.mjs --import /absolute/metadata-directory wombat
node scripts/tools/buildWalkReview.mjs /absolute/output/walk-review.html
```

Import metadata uses `type`, `pose` (`normal` or `robed`), `generatedPath`,
`prompt`, and optional `visualReview`. Without `--pose`, both outfits are built;
the fox's original normal sequence is always retained. Existing idle, speaking
and robed portraits are not modified.
