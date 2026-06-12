# WordShift Monetization Plan

> Status: **planned, not implemented**. WordShift 1.0 ships with no ads, no IAP,
> and no monetization SDKs. This document is the design reference for a
> post-launch monetization update, summarized in CLAUDE.md. Nothing in this
> plan may be built in a way that violates the core principle below.

## Core principle

Players pay for **expression** and **convenience**, never for **narrative
progression**. The phase arc, dialogue, endgame, and all ten animals must be
fully reachable by every free player at the same pace.

## Planned revenue streams

### 1. Rewarded video ads (opt-in only)
- Bonus amber after a victory (e.g., +50% of that puzzle's amber)
- Skip a dialogue session cooldown
- Weekly quest reward bonus
- Hint recovery in Challenge Mode (one per puzzle, keeps the 3-star penalty)

### 2. Interstitial ads (between puzzles only)
- Frequency: at most every 3rd puzzle (Phase 0–2) or every 5th (Phase 3+,
  where atmosphere matters more)
- Exemptions: first 10 puzzles, daily challenge, onboarding, immediately after
  a failed puzzle, during phase-transition ceremonies, the final puzzle, and
  all of Phase 5

### 3. Patron's Key — one-time purchase ($6.99)
- Removes all ads permanently
- Exclusive tile theme
- +2 amber per puzzle
- Extended undo history in Challenge Mode
- Cloud save (when the cloud provider ships)

### 4. Cosmetic shop (amber and/or small IAP)
- Tile themes, room accent palettes, confetti effects, animal accessories
- Phase-aware variants encouraged (a theme may darken with the story)

### 5. Content Pass
- Monthly ($1.99) and quarterly ($4.99) curated puzzle packs and cosmetic
  drops. Never story content.

### 6. Mid-game amber sinks (already shipped, free)
- Animal gifts, room upgrades, the amber altar / sacrifice mechanic

## Hard "never" list

- No energy or lives systems
- No loot boxes or gacha mechanics
- No paying to skip phases or accelerate the narrative
- No forced ads (every ad is opt-in or clearly slotted between puzzles)
- No paywalled animals or rooms
- No direct amber bundles for cash (amber must stay earned)

## Implementation prerequisites (in order)

1. Crash reporting + analytics endpoint live (`src/services/telemetry.ts`)
   so ad/IAP funnels are measurable from day one
2. `react-native-purchases` (or StoreKit2/Play Billing via Expo IAP) with
   restore-purchases wired into Settings
3. Ad mediation SDK with ATT prompt (iOS) gated behind first ad exposure,
   not app launch
4. Store listing + privacy policy updates declaring ads/purchases
5. Price localization pass

## Review checklist per stream

Before any stream ships: does it interrupt the core loop at a frustrating
moment? Does it create pressure on minors? Does it break the tone of the
current phase? If any answer is yes, redesign.
