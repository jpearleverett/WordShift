# Story presentation and sensory policy

Reviewed against `main` at `6f96ebb`, September 13, 2026. See [current build](../../docs/CURRENT_BUILD.md) for release status and verification limits.

- Essential reading owns the foreground. Story conversations can be deferred and revisited without choosing an answer or consuming unseen pages; saved answers cannot be rewritten by reading Back. A scene receives its remembered costume and a short talk-frame gesture; reduced motion leaves that portrait still. Resident choice pages show the full question, equally weighted answers and an explicit “Come back later” action, with immediate save locking and recoverable errors.
- Cinematic Skip and Android Back ask before ending the scene. Completion or confirmed Skip acknowledges the queued ceremony durably; cold restart replays an unfinished ceremony from its beginning. Backgrounding and temporary save overlays preserve the page within the mounted presentation. Legacy completed phases are not automatically replayed.
- Arrival, aftermath and New Cycle wait for Continue. Ordinary timed ceremonies switch to manual reading when the player taps the text, scrolls or presses Continue. Repeated Continue taps cannot consume a second page within the 350 ms input guard. Every ordinary phase-transition page has authored art; the illustration and footer remain visible while the passage scrolls.
- Long arrival, bell and answer cues belong to one cinematic. Exiting, skipping or backgrounding releases its players. Foreground return permits future cues without replaying a stale tail. Sound Off stops active effects; ambient music has its own preference.
- Authored finale silence also takes priority when returning from the background. Routine victory and home music resume only after that passage has closed.
- The first home return with a completed boundary gets 6.5 seconds without routine resident/reward pips or amber sparkle. Navigation, rewards and resident conversations remain usable. The landing line names the chosen boundary and the house offers a small optional inspection instead of another reward receipt.
- Motion follows the OS unless the player has explicitly saved a choice. Touch follows the haptic preference independently, including dread and cinematic feedback. A delayed after-strike rechecks the preference before firing.
- Preserve the room art, sprites and existing music. Optimize delivery assets from the retained masters; add effects or music only to solve an observed reading, legibility or fatigue problem.

## Delivery and validation

Story PNG masters remain in `assets/story/`; runtime imports use the committed `assets/story/optimized/` WebP derivatives. Asset generation is an explicit maintenance step, not required for each EAS build. Rebuild the WebP delivery variants with `node scripts/tools/optimizeStoryAssets.mjs`. Headers are 780px wide; cinematic heroes are 1290px wide. The crop is selected at the display site, retaining the source composition.

Before production release, listen through a continuous 20-minute signed Android session, including Skip confirmation and cancellation, normal completion, rapid Continue taps, Android Back, background/foreground, process restart during a queued ceremony and Sound Off. Verify device-scale portraits and headers, both world inspections, OS motion enabled at first launch, explicit preference override, large text, and repeated scene opening memory. Browser rendering and mocked audio tests do not establish native audio, gesture or memory outcomes.

For pacing evidence, use coarse story lifecycle events and a small unfamiliar-reader pilot. Do not add lore until readers can explain what the house changes and what both final words permit. Never collect story transcripts or recovery secrets as analytics.
