# WordShift Eighth Play Store Storm Shot

## Goal

Extend the approved seven-shot Google Play campaign with one final authentic
home screenshot that escalates the mystery into the storm era without exposing
the Phase 4 cult reveal.

The user asked for the `sky_storm.png` background and ominous copy suggesting
that the animals are hiding something. In the shipped phase mapping,
`sky_storm.png` belongs to internal Phase 3; Phase 4 uses `sky_shadow.png`,
robed animals, and a much more explicit reveal. The new shot therefore uses the
real Phase 3 storm state rather than fabricating a phase/background combination.

## Considered Approaches

1. **Authentic Phase 3 storm capture, recommended**
   - Uses the real `sky_storm.png` mapping, storm-lit house, dread-tinted animal
     sprites, and faint pre-reveal atmosphere.
   - Preserves the campaign's progression and makes the viewer curious without
     explaining the cult.
2. **Literal Phase 4 capture**
   - Would show `sky_shadow.png`, robed animals, and the stronger entity state.
   - Rejected because it contradicts the requested storm asset and spoils the
     mystery the copy is meant to create.
3. **Capture-only Phase 4 plus storm override**
   - Would visually combine two game states that players never encounter.
   - Rejected because the campaign is built around authentic UI captures.

## Campaign Position and Copy

The storm shot becomes number 8, immediately after `THEY'VE BEEN WAITING`.

- Scenario: `home-storm`
- Source: `08_home_storm.png`
- Final: `08_something_stirs.png`
- Headline: `SOMETHING STIRS IN THE AIR`
- Support: `Your friends know more than they are willing to say.`
- Theme: `mystery`
- Unease level: `8`
- Alt text: `WordShift animal house beneath a storm-dark sky, with familiar
  companions waiting inside dimly lit rooms.`

The headline keeps the user's intended "something feels wrong in the air"
meaning while sounding deliberate and atmospheric. The support line directly
delivers the requested suspicion that the animals are hiding something.

## Visual Design

- Preserve the existing Storybook Editorial frame, margins, Figtree Bold
  headline, and Shantell support typography.
- Capture the real home screen at internal Phase 3 with `sky_storm.png`.
- Frame occupied rooms and several familiar companions; keep core home UI
  legible and free of clipped signage.
- Keep animals in their shipped Phase 3 idle art with the existing dread tint.
  Do not show Phase 4 robed sprites.
- Retain all cumulative marketing-frame unease cues from levels 1 through 7.
  Level 8 does not add a fabricated horror element; the authentic storm scene
  supplies the final escalation.
- Do not add an entity silhouette, explanatory ritual copy, gore, false
  controls, or any visual that is absent from the actual Phase 3 home.

## Pipeline and Documentation

- Extend scenario parsing, fixture generation, manifest validation, capture
  orchestration, exact source/final sets, and composition metadata from seven
  to eight shots.
- Update Play Store listing order and alt text to include shot 8.
- Keep the approved feature background, final feature graphic, and legacy
  feature graphic byte-identical.
- Update the deterministic verifier from 15 outputs to 17 outputs:
  eight source screenshots, eight final screenshots, and the generated feature
  graphic.
- Keep publication atomic and reject stale or unexpected files.

## Validation

- Eight authentic 1080x1920 RGB source screenshots.
- Eight composed 1080x1920 RGB final screenshots.
- Exact nine-file source and final directories after including one feature
  asset in each.
- Two isolated complete pipeline runs produce identical encoded PNG, decoded
  RGBA, and file-mode hashes for all 17 generated outputs.
- The new source visibly uses `sky_storm.png`, internal Phase 3 styling, and no
  Phase 4 robes.
- Full-size and thumbnail review confirms the new copy is readable, the storm
  shot is stronger than shot 7, and the full eight-shot sequence remains
  cohesive.
- Full Jest, asset tests, typecheck, lint, web export, and GitHub CI pass.

