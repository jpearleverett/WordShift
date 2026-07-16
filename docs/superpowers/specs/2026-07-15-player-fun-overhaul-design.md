# Player Fun Overhaul Design

## Goal

Improve WordShift's end-to-end player enjoyment without changing its core identity, final reveal timing, monetization viability, or established high-quality narrative work.

## Global Constraints

- Swift Victories remain opt-in and default to `false`.
- Rewarded victory doubling remains available up to two times per local day.
- The first eight puzzles remain free of interstitials.
- Phase 4 and Phase 5 remain free of interstitials and rewarded-double offers.
- No phase labels or progress bars may expose the phase system.
- All new player-facing text is phase-aware, in-world, and contains no em dash.
- The cold-open puzzle, preview-grading ramp, tactile move feedback, pit ceremonies, final-board undo refusal, silent finale, and terrible-peace tone remain unchanged.
- Standard-bank files are not regenerated or manually edited.
- New persisted state must be cloud-synced or explicitly device-local, cache-invalidated when synced, and cleared by Reset All where appropriate.
- All behavior changes use test-driven development.

## 1. Victory and Prompt Friction

Swift Victories remain off by default. Existing full-ceremony behavior and the Settings toggle remain unchanged.

Extend the existing device-local `wordshift_monet_prompts` state with
`lastExitNudgePuzzle`, shared by proactive share, notification, remove-ads, and
Patron prompts:

- No proactive exit nudge before puzzle 12.
- At least five completed puzzles must separate proactive exit nudges.
- An ineligible prompt must not consume its one-time flag.
- Interstitial exits and queued narrative introductions continue to suppress all exit nudges.
- The pacing record is excluded from cloud sync and cleared by Reset All.

Move the Keeper's Welcome starter-pack introduction from puzzle 22 to puzzle 35 and the Patron nudge from puzzle 30 to puzzle 50. The deferred remove-ads offer remains contextual after three viewed interstitials but obeys the shared exit-nudge spacing.

Rewarded doubling retains its current two-presentations-per-local-day cap. It remains hidden through the first eight puzzles and from Phase 4 onward. No additional reduction is introduced.

## 2. Standard-Puzzle Decision Depth

Strengthen the existing runtime branching preference without regenerating banks:

- From puzzle 40, analyze up to 80 context-appropriate standard candidates.
- Use the shipped exhaustive solver to classify candidates with at least two complete routes as multi-route.
- Preserve phase/dread eligibility, freshness, cooldown, and bank-exhaustion filtering before applying the branching preference.
- Keep score order within the multi-route and fallback partitions.
- Select the random top-ten pool from multi-route candidates whenever at least ten exist; otherwise fill the remaining top-ten slots with the strongest single-route candidates.
- From puzzle 100, calculate metrics from each cached extended board rather than its shorter source board.
- Fall back to single-route boards when the eligible multi-route supply is insufficient.
- Reverse, Double Shift, Speed, Daily, shared challenges, final boards, and Unbroken Weave eligibility remain unchanged.

The selection helper will be pure and exported for direct tests.

## 3. Narrative Restraint

Rewrite all 13 Phase 3 dialogue-choice sequences while preserving:

- Existing IDs, storage shape, option keys, callback behavior, and convergence mechanics.
- Each animal's established sensory or occupational metaphor.
- Meaningful tonal difference between asking and refusing.
- The fact that both paths converge.

The new choice copy must not use `game`, `puzzle`, `summoning`, `spreadsheet`, `consent`, or direct declarations that the player has already agreed. It should imply coordinated preparation without fully explaining the Phase 4 reveal.

Rewrite all 65 Phase 3 victory whispers. Each animal retains five lines grounded in its own imagery. The whispers may indicate approach, readiness, or altered behavior, but may not state the ritual's answer, predict the player's exact words, announce a final page/meal, or declare that the player is trapped.

No other base-dialogue, Phase 4, Phase 5, finale, or Tending prose is rewritten.

## 4. Visible Phase 5 Unbroken Weave Mastery

Promote the existing Unbroken Weave rule into a persistent mastery ladder while leaving its gameplay restriction unchanged.

Extend `wordshift_mastery` with backward-compatible fields:

- `unbrokenWeaveWins`
- `unbrokenWeaveFlawlessWins`
- `unbrokenWeaveDifficultyClears`
- `unbrokenWeaveHardFlawless`

Record a Weave victory only when `unbrokenWeaveMode` is active. Record flawless status from the existing victory result and record the completed difficulty.

The ordered mastery ladder is:

1. **Thread Joined**: complete one Unbroken Weave.
2. **Fourfold Weave**: complete one at every difficulty.
3. **Seamless Dark**: complete a flawless HARD Unbroken Weave.
4. **Loomkeeper**: complete 10 flawless Unbroken Weaves.
5. **Patternbound**: complete 25 flawless Unbroken Weaves.

Expose a pure rank/progress resolver returning the current title, completed rank, and next objective.

Surface the ladder in three places:

- The Phase 5 Unbroken Weave setup row shows the current title and next objective instead of only the rule description.
- The Stats `MASTERY` card shows Weave rank and flawless progress whenever Phase 5 is reached or a Weave has been completed.
- A Weave victory shows its current rank, and a newly reached rank gets full-ceremony treatment plus a rank-up line.

Add a one-time Phase 5 in-world introduction on the first quiet home landing
after post-revelation. It points the player toward the setup selector without
exposing a system phase. Persist `unbrokenWeaveIntroSeen` inside
`wordshift_home_progress`, so the existing cloud-sync and Reset All behavior
cover it.

The existing `wordshift_mastery` sync key, invalidator, and reset path cover the expanded fields.

## 5. Earlier Descent Trio

Move the final four room gates:

- Bamboo Attic: 105 puzzles.
- Star Loft / Vesper: 115 puzzles.
- Belfry / Tock: 125 puzzles.
- Sky Garden / Moss: 135 puzzles.

Keep costs, unlock order, room/animal pairing, reservation, and skip pricing unchanged.

Add `FINALE_ARM_MIN_PUZZLES = 160`. The finale arms only when:

- The house is complete.
- The current world is in Phase 4.
- At least eight qualifying dwell wins have been recorded.
- At least 160 real puzzles have been completed.

If the dwell requirement finishes early, subsequent house-complete Phase 4 victories continue delivering dwell/held-breath lines without incrementing beyond the capped dwell count. The first qualifying win at or after puzzle 160 arms the finale. The next standard board remains the final board, preserving arrival around puzzle 161 and post-revelation around 162.

Update home-world invariants and nearby milestone/micro-beat comments or copy only where the old 152-room timing would become false.

## 6. Faster Routine Pit Offering

Onboarding remains player-driven and requires tapping each word.

After onboarding:

- Keep individual word taps available.
- Keep the bulk-offer control visible whenever pending words exist.
- Make bulk offer the visually primary harvest action when no phase ceremony is pending.
- When a phase ceremony is pending, ceremony priority and wording remain unchanged.
- Add a pure bulk-timing resolver and cap the bulk cascade target to 1,000 ms by reducing stagger and animation duration for bulk offers only.
- Preserve exact amber accounting, crash-safe apply/ack behavior, result copy, dread-word naming, reduced-motion behavior, haptics, and ceremony handoff.

No automatic routine collection is added; the pit remains the conversion location.

## 7. Testing and Validation

Automated tests cover:

- Exit-nudge minimum gate, spacing, persistence, non-consumption, and reset.
- Existing two-per-day rewarded-double behavior.
- Multi-route candidate partitioning, top-ten behavior, extended-board analysis, and fallback.
- Forbidden narrative vocabulary plus 13-choice/65-whisper completeness.
- Mastery migration defaults, recording, rank progression, Stats/setup/victory presentation, cloud restore, and Reset All.
- New room gates and finale puzzle-160 floor.
- Bulk-offer timing policy, accounting, onboarding exemption, and ceremony handoff.

Run relevant focused suites during each red-green cycle, then:

- `npm run typecheck`
- `npm run lint`
- `npm test -- --no-coverage`

Manual validation uses the Expo web build with DevTools opened before navigation. Record a walkthrough showing the setup/Stats Weave ladder, a Weave victory, and the shortened bulk pit offer. If the VM renderer is unavailable, rely on automated UI tests and report the limitation.
