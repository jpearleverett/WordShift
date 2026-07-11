# WordShift Google Play Listing and Screenshot Campaign

## Goal

Create a complete, upload-ready Google Play listing package that presents WordShift as a bright, satisfying word puzzle with a clearly implied darker mystery. The campaign must use authentic app renders, stay spoiler-safe, and accurately reflect the current shipped feature set.

## Positioning

The listing sells three promises in this order:

1. A simple, tactile word-shifting mechanic.
2. A home-building and character-collection progression loop.
3. A slow mystery beneath the cozy surface.

The tone is "cozy first, darker mystery underneath." Store assets may show Phase 0 through Phase 2. They must not show robed animals, the entity, Phase 3+ copy, or explicit ritual imagery.

## Deliverables

- Updated Google Play title, short description, full description, feature bullets, age-rating guidance, release notes, and screenshot alt text in `docs/STORE_LISTING.md`.
- Eight upload-ready phone screenshots at exactly 1080x1920 pixels.
- One upload-ready feature graphic at exactly 1024x500 pixels.
- Source captures kept separately from composed store images under `docs/play-store/source/`.
- Final upload assets under `docs/play-store/final/`.
- A reproducible composition and validation script under `mobile/scripts/tools/`.
- A minimal web-only compatibility layer that permits authentic app capture without changing Android or iOS behavior.
- Corrected stale counts on the public landing page and launch checklist.

## Screenshot Visual System

Use the approved "Storybook Editorial" treatment:

- A short, high-contrast storybook headline above a large authentic app capture.
- At most one brief supporting line.
- A restrained purple, wood, parchment, and amber frame derived from the app's existing visual language.
- The game capture remains the dominant element.
- No device bezel, fake controls, fabricated gameplay, ratings, rankings, prices, or promotional claims.
- Important text and characters stay within the central safe area.
- The sequence gradually shifts from bright blue and candy colors to a spoiler-safe dusk palette.

## Eight-Screenshot Sequence

1. **SHIFT ONE LETTER**
   - Supporting line: "Move it down. Keep both words real."
   - State: Phase 0 puzzle with a selected tile and visible valid/invalid previews.

2. **EVERY WORD STAYS REAL**
   - Supporting line: "Build a chain one clever move at a time."
   - State: Phase 0 mid-puzzle chain with source and destination rows clearly visible.

3. **BUILD A HOME**
   - Supporting line: "Your words bring every room to life."
   - State: Bright Phase 0 home with several rooms and three or four animals.

4. **MEET 13 UNLIKELY FRIENDS**
   - Supporting line: "They always have something to tell you."
   - State: A warm animal-dialogue moment over the house.

5. **MASTER EVERY MODE**
   - Supporting line: "Reverse, Double Shift, Speed, and Blind Offering."
   - State: Difficulty and variant menu with the major modes visible.

6. **A NEW PUZZLE EVERY DAY**
   - Supporting line: "Build your streak and compare your standing."
   - State: Daily Challenge entry or completion state with streak and leaderboard context.

7. **CHASE A FLAWLESS OFFERING**
   - Supporting line: "No hints. No mistakes. One perfect chain."
   - State: Flawless or three-star victory with amber rewards.

8. **THEY'VE BEEN WAITING**
   - Supporting line: "Some houses remember every word."
   - State: Phase 2 dusk home with subtle unease and no Phase 3+ spoilers.

Each screenshot also receives unique accessibility alt text that describes the visible game state rather than repeating the marketing headline.

## Feature Graphic

Replace the current generic tile graphic with a 1024x500 campaign image containing:

- Ember as the primary character.
- The current wooden WordShift wordmark.
- A few candy letter tiles and one amber gem.
- A bright forest-to-dusk lighting gradient.
- Very subtle distant red eyes or another small unease cue.

The composition remains suitable for a general audience. It must not show the entity, robes, gore, rankings, prices, or dense copy. Important content stays near the center because Google Play crops feature graphics in some placements.

## Listing Copy

- App title remains `WordShift`.
- The short description remains under 80 characters and communicates word play, animals, and mystery.
- The full description naturally includes "word puzzle," "letter game," "daily challenge," and "offline" without keyword stuffing.
- Canonical counts are 13 animal companions and 51 achievements.
- Claims remain durable: "thousands of puzzles" rather than a fragile exact bank count.
- Ads, in-app purchases, offline behavior, privacy, and the 13+ slow-burn mystery are described accurately.
- Player-facing copy contains no em dashes.

## Authentic Capture Architecture

### Web compatibility

Add platform-specific web adapters for RevenueCat and AdMob. The web files export inert providers and never import native SDKs. Existing native adapters and Android behavior remain unchanged.

### Screenshot scenarios

Add a development-only, web-only screenshot scenario loader. A query parameter selects one of eight named presets:

- `puzzle-preview`
- `puzzle-chain`
- `home-sunny`
- `animal-dialogue`
- `variant-menu`
- `daily`
- `flawless-victory`
- `home-dusk`

The loader seeds real AsyncStorage records before normal hydration, then renders the production app and production components. It does not render mock UI.

Safeguards:

- Disabled outside `__DEV__` and web.
- Unknown scenario names log a warning and do not modify storage.
- The capture server runs on a dedicated localhost origin and browser profile, isolating its AsyncStorage data from normal web play.
- Cloud restore, upload, telemetry flush, ads, IAP, notifications, and review prompts are disabled while a screenshot scenario is active.
- Native saves and normal player-device saves remain untouched.

### Capture and composition

- Render the app in a fixed 9:16 viewport.
- Capture each real scenario after fonts and images settle.
- Compose the editorial title, support line, frame, and source capture into a 1080x1920 PNG.
- Preserve source captures for auditability.
- Generate upload files with stable, ordered names such as `01_shift_one_letter.png`.

## Failure Handling

- If a scenario cannot reach its required authentic state, fix the scenario seed or production capture path. Do not fabricate a replacement UI.
- The composition script exits nonzero for missing captures, wrong dimensions, unsupported image formats, or alpha in upload assets.
- A failed feature-graphic sanitization leaves the prior source untouched and produces no final file.
- Screenshot-mode state is never eligible for cloud upload.

## Validation

Automated:

- Unit tests for scenario parsing, preset selection, unknown-scenario behavior, and production-mode suppression.
- Existing monetization provider-adapter tests remain green.
- Web production export succeeds.
- TypeScript typecheck succeeds.
- Relevant tests and the full Jest suite succeed.
- Asset validator confirms eight 1080x1920 screenshots and one opaque 1024x500 feature graphic.
- PNG signatures and color mode are valid for Google Play.

Manual:

- Review every raw capture to verify it is a real app state.
- Review the eight screenshots as a sequence at full size and thumbnail size.
- Confirm headline readability, no clipping, no Phase 3+ spoilers, no private data, and no false claims.
- Confirm the first three screenshots communicate gameplay without reading the full description.
- Compare the feature graphic against the app icon and wordmark for campaign consistency.

## Non-Goals

- No new gameplay, retention, monetization, or narrative features.
- No iOS screenshot set in this scope.
- No tablet screenshot set in this scope.
- No trailer or preview video.
- No Phase 3+ reveal in store materials.
- No production cheat menu.
