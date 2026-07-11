# WordShift Seven-Shot Mystery Campaign Revision

## Goal

Revise the approved Google Play campaign to use the latest `main` fonts and UI, remove the Daily Challenge screenshot, and make every remaining screenshot hint at an unfolding mystery without revealing Phase 3+ content.

## Integration Baseline

- Merge `origin/main` into `cursor/play-store-assets-impl-a2df` without rebasing or force-pushing.
- Preserve the existing Play Store capture, composition, validation, and deterministic-generation pipeline.
- Regenerate every authentic source capture after resolving the latest UI and font changes.
- Use main's typography hierarchy:
  - Figtree Bold for marketing headlines and app chrome.
  - Shantell Sans for supporting and story text.

## Seven-Screenshot Sequence

Remove `A NEW PUZZLE EVERY DAY`. Renumber the remaining campaign:

1. **SHIFT ONE LETTER**
   - `Move it down. Keep both words real. Something remains.`
2. **EVERY WORD STAYS REAL**
   - `Build a chain one clever move at a time. The words remember.`
3. **BUILD A HOME**
   - `Your words bring every room to life. Every room was waiting.`
4. **MEET 13 UNLIKELY FRIENDS**
   - `They always have something to tell you. Never everything.`
5. **MASTER EVERY MODE**
   - `Reverse it. Race it. Hide the previews. The pattern still grows.`
6. **CHASE A FLAWLESS OFFERING**
   - `No hints. No mistakes. It notices perfection.`
7. **THEY'VE BEEN WAITING**
   - `Some houses remember every word.`

All filenames, ordering, alt text, listing tables, tests, validators, source sets, and upload sets must use seven screenshots.

## Progressive Unease

Keep the existing Storybook Editorial geometry, real app captures, feature graphic, and overall palette. Add mystery only through the marketing frame and capture-safe decorative layers, never by fabricating game UI.

The unease increases monotonically:

1. Tiny crimson glint and slightly imperfect frame grain.
2. Faint hairline sigil beneath the title.
3. Hidden red pinpricks in the distant house scene.
4. Slightly doubled character shadow.
5. Subtle crimson thread connecting mode icons.
6. Amber glow beginning to shift red.
7. Strong dusk vignette and watching eyes.

Constraints:

- No robed animals.
- No entity or monster silhouette.
- No Phase 3+ player-facing copy.
- No gore, ritual explanation, false controls, or fabricated progression.
- Mystery cues must remain visible at thumbnail scale but read as atmosphere before they read as horror.

## Feature Graphic

Keep the current approved feature graphic visually unchanged. Its Ember, exact wordmark, W/S tiles, amber, sunny-to-dusk landscape, and subtle distant eyes already satisfy the revised direction.

## Validation

- Seven authentic source screenshots and seven final 1080x1920 RGB screenshots.
- One audited feature background and one final 1024x500 RGB feature graphic.
- Exact source/final directory validation updated for seven screenshots.
- Two consecutive full pipelines produce identical encoded and decoded hashes.
- Full Jest, asset, typecheck, lint, and web-export gates pass.
- Fullscreen visual review confirms the seven-shot mystery progression is clear, cohesive, spoiler-safe, and uses latest-main fonts/UI.
