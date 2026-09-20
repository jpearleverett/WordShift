# September 20 decision, Journal and How to Play fixes

Feature branch: `feature/story-layout-journal-fixes`, based on main `45973ae`.
The owner's app version **1.3.9 / Android 104** is preserved.

## Changes

- **Decision illustrations:** React Native's Android Image supplies intrinsic asset dimensions before caller styles. The previous percentage width and aspect ratio left the large intrinsic height in play. Explicit width and height now give the full 16:9 illustration a maximum height of 136 dp, reduced for short screens or larger reading text. `contain` preserves the complete image. A compact resident portrait sits beside the speaker on every page, including narration. Safe-area-aware card bounds and padding outside the scroll viewport keep long text and choices inside the wooden frame. The existing 185 illustrations are unchanged.
- **Journal introduction:** The five pages now explain the actual Journal menu and its separate destinations: Things We Kept, Word Ledger, Whisper Gallery and Quests. Preview cards use the same distinct icons as the menu. Word Ledger exists as a separate Journal menu destination; it is not a tab inside Things We Kept. Its description promises recent puzzle words, matching current behavior.
- **Earlier conversations:** History now requires saved completion IDs for each animal's regular dialogue, as well as current roster and phase eligibility. Merely reaching a phase no longer reveals all its lines. Loading refreshes the progress snapshot through the storage queue, handles failures with Retry, and rejects stale history after New Cycle. Legacy saves without reliable completion records start with empty history; completing conversations fills it. The selector does not invent read records or alter choices.
- **How to Play:** Keeps the four illustrated instructions and dismissal button. Removes the practice entry points, Stars paragraph and spelling explanation. Unreachable practice overlay wiring is removed; the standalone practice engine remains available in source.

## Verification

- TypeScript and whole-repository lint with zero warnings passed.
- The integrated focused run passed **684 tests in 15 suites**, covering native image sizing, compact viewport geometry, rendering, saved read IDs, storage failures, Journal wording, rules and overlay safety.
- Existing browser journeys now assert compact story art, text and button bounds on small screens and the simplified rules contents. They run in the ordinary GitHub CI workflow; the pull request records their final result.
- This is a source change, not a new signed Android artifact or Play upload. The next internal-testing build still needs physical-device layout verification.
