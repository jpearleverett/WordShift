# WordShift source-asset assembly experiment

The owner requested a trial of assembling promotional visuals directly from
the repository's artwork, sprite frames, fonts, and source-defined styles.

This is a separate creative study. It is not a screenshot export, recorded
gameplay, or proof of the signed Android app's appearance. Every review image
has an **ASSEMBLED PREVIEW · SOURCE ASSETS** label.

## Contents

- Three 1080 × 1920 promotional studies: the legal L move, a cozy house, and a
  phase-3 night scene. A fourth image shows the puzzle after the move.
- A contact sheet and per-scene source provenance.
- An 18-second 1080 × 1920, 30 fps motion study, generated into
  `mobile/store-output/assembly-experiment/` alongside a self-contained image
  review. The MP4 accompanies that review and is not committed as a Git binary.

## Reproduce

From `mobile/`, with the project's npm dependencies and ffmpeg installed:

```sh
node scripts/store/buildAssemblyExperiment.mjs --stills-only
node scripts/store/buildAssemblyExperiment.mjs
```

The first command makes the image study. The second also animates a legal
letter move and the existing walk frames, then encodes the motion study using
the game's puzzle-phase-0, home-phase-1, and home-phase-3 music.

No browser, server, app runtime, account connection, game save, or external
network request is involved. The renderer uses Sharp/libvips/Pango and ffmpeg.

## Fidelity and review limits

The letter move is `PLAY / PANT / HEAR` → `PAY / PLANT / HEAR`; the moved L is
locked. This is the first step of a real puzzle, not a completed puzzle or a
reward event. The nighttime scene uses existing phase-3 artwork and normal
residents. It does not add a creature, use robes, or reveal the later story.

The source assets are authentic. Screen composition, selected interface
details, camera framing, movement paths, and animation timing are authored
reconstructions. Font measurements and layout are not computed by the native
Android renderer. The house studies are promotional dioramas, not attestations
that the illustrated cropped house is a complete saved-game state.

These images are deliberately outside `launch-2026-09-v2/raw/` and its
production `upload/phone/` paths. They must not satisfy the genuine-capture
validation gates or inherit metadata that calls them actual app footage.

Review the clarity of the letter move, the size and placement of residents,
the warmth of the day scene, and whether the nighttime scene gives the right
amount of mystery. Broader store production remains pending that assessment.
