# WordShift — complete assembled store images

The owner approved extending the source-asset assembly experiment into the full
eight-image listing set. These are promotional reconstructions assembled from
the game’s artwork, fonts, source-defined puzzles and exact dialogue. They are
not screenshots or recordings of the running Android game, and native pixel
fidelity has not been verified.

## Exports and order

Use the eight numbered files in `export/phone/` in their filename order. Each is
an opaque RGB PNG at **1080 × 1920 (9:16)**. This portrait format matches the game
and Google’s recommended minimum for portrait game images. The headline band
is 240 px high, the illustration 1600 px, and the footer 80 px. The two branding
bands occupy 16.7% of the image; the game’s own dialogue and words are separate.

1. One letter. Two new words.
2. Turn words into a home.
3. Meet 13 unlikely friends.
4. A cozy game. Mostly.
5. Find your next challenge.
6. A new puzzle every day.
7. Make it your kind of cozy.
8. Your choices leave a trace.

`export/feature-graphic-1024x500.png` uses the actual cozy-den background, window
mask, Ember portrait and wordmark. `export/store-icon-512.png` retains the
baseline store icon. `variants/` contains a before/after opener and the previous
icon challenger for later isolated experiments; do not append the opener to
the main set, which already contains the maximum eight images.

The complete path and pit entrance are included in both house images. Their
130 × 140 dp geometry is read from `HouseWorld.tsx`, joins the foundation without
a gap, and leaves roughly 70 px of illustrated ground before the footer.

## Source fidelity

- Image 1 shows the actual authored PLAY/PANT/HEAR board and selected L.
- Images 2 and 4 use the shipped rooms in their bottom-up order, normal walking
  frames and phase lighting. The three-room composition is an illustrative
  selection, not a full phase-3 saved-game state. No robes or later reveal art.
- Image 3 uses Ember’s exact `fx_0_2` cushion line and original talking sprite.
- Image 5 shows the valid first pair from Double Shift board `75d40a43d494`:
  F and S move from FLIPS into LOWER, producing LIP and FLOWERS. F and S lock.
- Image 6 uses the source-selected shared board for September 19, 2026,
  including the current bank qualification and board version. It claims no
  rank, completion or existing streak. The date remains part of the provenance;
  this is not a screenshot that automatically updates every day.
- Image 7 reads the actual `theme_ember` palette. Only active, unlocked tiles
  take that palette; locked and inactive tiles retain their source styling.
- Image 8 uses the current cup-choice page, page-specific story artwork and
  the persistent Ember portrait. Dialogue and both response options are exact.

The exported images intentionally have no experiment watermark. Their method
is disclosed here, in `review.html` and in `source/manifest.json`; they remain
separate from the actual-capture campaign and never satisfy its capture gates.

Google’s dimensions and promotional-surface recommendations are documented at
<https://support.google.com/googleplay/android-developer/answer/9866151>.
Correct dimensions do not certify promotional placement or establish native
screenshot authenticity. Nothing in this package has been uploaded or published.

## Reproduce and validate

From `mobile/`, with the repository’s npm dependencies and Python Pillow:

```sh
node scripts/store/buildAssembledListing.mjs
python3 scripts/store/packageAssembledListing.py
```

The dated daily-board source fixture and the reviewed cup-art pointer are kept
in `source/`. The renderer refuses a final build without both. `--allow-pending`
is only for an explicitly partial review during production; the ZIP packager
requires all eight exports and verifies dimensions, color mode, source output
hashes, complete pit/path framing and archive integrity before atomic rename.

`mobile/store-output/assembled-listing-2026-09/` contains the self-contained
HTML review and completed ZIP. The ZIP’s `reproduce/` scripts are references for
use within this repository; they rely on the existing game assets and fonts.
The original three-scene experiment and genuine-capture pipeline are preserved.
