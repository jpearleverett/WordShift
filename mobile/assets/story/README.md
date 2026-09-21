# Story illustrations

Reviewed September 13, 2026 against `main` at `6f96ebb`.

Production views use the generated WebP derivatives in `optimized/`. Rebuild with
`node scripts/tools/optimizeStoryAssets.mjs` from `mobile/`. The 1290px heroes and
780px headers preserve the source composition; the PNGs below remain unchanged
source masters. The optimizer writes eight derivatives. Runtime imports are
centralized in `src/components/storyArt.ts` and currently reference seven of
them: four hero images and three headers; the night-road header remains a
prepared derivative. The script reports exact source/output bytes when rebuilt,
so use its output rather than treating an old rounded size as a current measure.

Both this directory and its committed `optimized/` delivery assets remain in
the EAS build archive. Do not exclude `assets/story/` wholesale while reducing
build uploads: the app needs the imported WebP files. Regeneration is a manual
asset-maintenance command, not a normal EAS lifecycle hook. See the
[build and upload guide](../../../docs/BUILD_AND_UPLOAD.md).

Generated with the built-in image generation tool for WordShift, September 2026. Selected outputs were visually inspected and copied into the repository. These illustrations extend the existing cottage pixel art and represent ordinary hospitality, protected privacy, and freedom to leave. They are loaded locally; no image service runs in the app.

- `kept-table.png`: journal/shared-scene headers and ordinary phase-transition passages.
- `private-room.png`: CLOSED boundary/aftermath and ordinary phase-transition passages.
- `outward-road-night.png`: CLOSER during the midnight arrival and night-set transition passages.
- `outward-road.png`: the same road at dawn in the aftermath and New Cycle.

## Final prompts

### Table

Use case: illustration-story. Asset type: landscape chapter illustration for WordShift, an intimate pixel-art mobile word puzzle mystery set in an animal cottage. Create a finished 1536x1024 pixel-art illustration of a small round wooden table beside a warm hearth at dusk. Two hand-made mugs sit on the table: one visibly chipped ceramic handle, the other a charming crooked painted flower. An open notebook with an unmarked loose page rests beside them. Two empty chairs at a gently different distance, lived-in moss green fabric, golden amber firelight on dark walnut wood, cool blue dusk through a small window, a peaceful but slightly questioning quiet. The visual story is that an imperfect thing holds a memory. Rich carefully placed pixel clusters, restrained 16-bit-style palette, dimensional light and tactile material shading, sophisticated indie game art. A clear readable silhouette at phone size, table occupying the central lower half, darker low-detail upper edges for an overlay title. No characters, no text, no letters, no watermark, no UI, no glowy particles, no horror eyes. Preserve a warm cottage atmosphere, understated depth, no glossy plastic 3D.

### Private room

Use case: illustration-story. Asset type: landscape ending illustration for a sophisticated pixel-art indie mobile game WordShift. Finished 1536x1024 pixel-art scene of a quiet private room in an animal-sized woodland cottage, seen just outside its wooden door which is nearly closed, a narrow warm crack of lamplight preserving a glimpse of a worn desk, one loose cream paper and a deliberately chipped teacup. The door has a simple wood latch on the inside visible in profile, natural imperfect wood grain and the mark of a small hand on its edge; a place belonging to its resident. Warm amber light inside, cool desaturated violet shadows in the surrounding hallway, earthy brown wooden beams, moss green details. Nothing threatening visible, privacy is the emotional climax. Deep dimensional lighting rendered in disciplined hand-placed pixel clusters, restrained 16-bit palette, polished storybook pixel art, rich material texture without photorealism. Strong clear doorway silhouette at phone size, room visible enough to feel welcoming, composition balanced with darker uncluttered edges for UI overlay. No characters, no readable words or letters on paper, no logos, no watermark, no horror eyes, no glowing magic, no glossy 3D.

### Outward road

Use case: illustration-story. Asset type: landscape ending illustration for pixel-art indie mobile game WordShift. Create a finished 1536x1024 pixel-art view looking outward from a cottage garden through an open little wooden gate onto a narrow EARTHEN FOOTPATH that continues beyond the last woodland trees into an open dawn meadow and toward a distant quiet hill. A small flat stone beside the gate points outward. The path clearly leads somewhere beyond the house, without looping back; freedom to leave is the emotional climax. Foreground dark walnut fence, ferns and moss with a few muted cream flowers, dawn amber along grass tops, cool lilac morning mist in the distant meadow, restrained warm-cool color harmony. Warm, calm and earned, not triumphant or saccharine. Sophisticated 16-bit storybook pixel art, dimensional light and carefully composed pixel clusters, detailed tactile vegetation with strong readable shapes at phone size. Broad luminous space past the gate, darker uncluttered outer edges for UI overlays, no characters, no cottage blocking the distant path, no readable text, no logo, no watermark, no eyes, no magic glow, no glossy 3D.

### Outward road at midnight (edit)

Edit reference: `outward-road.png`. Edit this exact WordShift pixel-art illustration into its MIDNIGHT counterpart. Preserve the identical garden gate, outward-pointing stone, footpath, trees, meadow, hills, camera, composition and sophisticated 16-bit storybook pixel clusters. Replace the dawn sky and golden sunlight with a deep desaturated indigo night sky, a sparse few small stars, and quiet silvery moonlight from offscreen. The distant path must remain readable and continue beyond the trees. Cool blue-violet moonlight edges the grass; only the smallest trace of warm reflected amber light touches the near gate from the unseen cottage behind the viewer. This is a peaceful but consequential midnight welcome with freedom to leave. No sunrise, no sunset, no warm horizon glow. Keep substantial tonal detail and readable silhouettes at phone size without brightening it into daytime. No people, animals, text, glyphs, logo or watermark. Produce the edited landscape bitmap at the same aspect ratio.

## Per-page story art (September 19 refresh)

StorySceneModal now resolves a separate illustration for each authored narrative
beat, including both choice responses, later phases, aftermath variants and
retrospective openers. `src/data/storyArtCatalog.ts` defines 185 illustration
IDs for 16 scene IDs. PLUM's later recruitment scene reuses the same authored
PLUM beats; different pages within a conversation do not share an illustration.
The files live in `pages/` as opaque 960×540 WebPs, loaded with static offline
requires from `src/components/storyPageArt.ts`.

`StoryLine.artId` is optional to preserve older frozen story saves. The pure
resolver in `src/services/storyPresentation.ts` recognizes the original text
without changing saved dialogue, choices, page positions or presentation phase.
It reserves exact matches before assigning unused related art to older wording.
An animal portrait remains present on narrator and player pages, retaining the
most recent resident (or the first resident before their opening line). Narrator
and player pages use the idle portrait instead of a speaking gesture.

The illustrations remain visible on compact screens and in later phases. The
card scrolls when necessary. No generic teacup fallback or image-height gate is
used by the story reader.

Production recipes are in `scripts/story/`:

- `inventoryStoryArt.mjs` enumerates narrative branches using the actual service.
- `story-art-prompts.json` records the current individual illustration prompts.
- `buildArtCatalog.mjs` writes the offline asset map and old-save text catalog.
- `nextArtJob.mjs` claims an assigned local production job; it calls no image API.
- `saveStoryArt.mjs` creates an optimized WebP and atomically saves its SHA-256,
  dimensions, source-image basename and available exact generation prompt.
- `generation/*.json` records each selected image. Initial production batches
  predate exact-prompt capture; their earlier recipes remain in Git history.

## Retouching a shipped illustration (September 21, 2026)

`scripts/story/editStoryArt.mjs` fixes a defect in one shipped page without
regenerating it: it cuts a square window around the defect, sends only that
window to a hosted instruction-following image-edit model, and composites the
result back onto the untouched original through a feathered mask, so the
authored composition survives and nothing outside the paste changes. Output
goes to the gitignored `scripts/story/.edits/` with a before/after sheet and a
per-attempt JSON; `applyStoryArtEdit.mjs <id> <edited.png> <note.json>` installs
a reviewed result, re-encoding it exactly as `saveStoryArt.mjs` does (cover
resize, parchment flatten, WebP q83 effort 4) and recording the model, prompt,
window, cost and previous hash under `retouches` in
`scripts/story/generation/<id>.json`, plus the new hash in `visual-review.json`.

Know when to stop and keep the original. One removal in this pass defeated
five attempts: a flat black void, a corner holding most of the frame's
brightest pixels, a salmon hue that exists nowhere in the cloth, a fill
measured too bright and too flat against the blanket it continued, and a clone
that imported fragments of the basket handle and a leaf. The art being edited
was hand-painted and coherent; every repair was worse than the flaw it removed.
The original was restored. A picture that is right everywhere except for a
small unexplained visitor beats a picture with a patch that draws the eye, and
the revert is recorded in that image's generation record rather than hidden.

Repair from the ORIGINAL, never from a damaged intermediate. Two removals in
this pass were rejected on their first attempt and both failed the same way:
the model was handed an image whose defect had already been cut out, could not
see the surface it was meant to continue, and invented one. A dog on a hearth
rug became a wedge of bare floorboards, in a hot orange brighter than anything
else in the lower half of the frame; a hedgehog in a basket became a flat black
void larger than any dark patch the painting itself contains. Re-running each
edit with `--source` pointing at the pre-repair art, where the real rug and the
real blanket are still visible beside the creature, fixed both on one call.
Judge a fill by whether it draws the eye: an in-key repair disappears, and an
invented surface announces itself even when the drafting is clean.

Match the setting to the place the game itself shows. The Aquarium Room is the
inside of a planted tank, so Axel's scenes are underwater; the Offering Pit is
an outdoor rock-rimmed hole in a forest clearing, not a cellar well; and Chill's
room is a modern office. A resident visiting another resident's room is fine,
so this rule binds only a scene set in a resident's own space.

Judge a retouch at the size the reader uses, not at 1:1. `getStorySceneLayout`
caps the illustration at 136dp tall, so these 960x540 assets display around
240x136; a paw that looks flat at full resolution can read correctly there,
and a conversion that still reads wrong at that size should become a removal
instead. Twenty-three images were corrected this way (human hands and figures,
non-resident pets, and limbs of no identifiable species); see
[the art coverage review](../../../docs/ART_COVERAGE_REVIEW_2026-09-19.md).

New raster art is generated with the built-in image-generation tool, one image
per beat, then reviewed against the narrative. Source PNG masters remain outside
the runtime asset directory. Only the optimized WebPs ship in the app. Scripts,
prompts, review sheets and production-queue state are authoring material, not
application screens. These changes do not alter narrative copy or choices.
