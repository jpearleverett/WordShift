# WordShift — Puzzle & Variant Experience Assessment

*Method: six code-readers computed real numbers from the shipped code and banks (including exhaustive solver simulation against the shipped dictionary), three market researchers pulled genre benchmarks, three judges scored each lifecycle stage, and an adversarial critic attacked the findings. This report is the synthesis.*

---

## The headline verdict

**Opening hour (puzzle 1–35): fun 7/10, retention risk medium.** Close to best-in-class for a small team. The unlock drip lands a new beat every 1–3 sessions and the juice is exceptional.

**The long middle (35–150): fun 5/10, retention risk high.** Every mechanic is dealt by puzzle 35; the next ~100 boards are statistically identical. The economy, house gates, and narrative beats carry it — a metronome, not a game.

**Endgame (150+): fun 4/10, retention risk high.** The climax the whole game builds toward lasts about **two puzzles**, and the boards say FUN/CARD under the shadow-figure sky because the dread-word supply is already drained.

The puzzles are good enough to carry a **story-motivated daily player** to the finale. They are not currently good enough to carry a **puzzle-motivated player** past ~puzzle 60–80, and the finale under-pays everyone. The fixes are mostly cheap and mostly content/scoring, not new engines.

---

## 1. One ship-blocker found: 42 unwinnable puzzles

Exhaustive solving of every bank puzzle under the app's own validation rules found **42 mathematically unwinnable boards**:

| Bank | Unwinnable | Rate |
|---|---|---|
| HARD (standard) | 6/440 | 1.4% |
| ReverseEasy | 4/467 | 0.9% |
| **ReverseMedium** | **24/379** | **6.3% — 1 in 16 serves** |
| ReverseMediumPlus | 3/228 | 1.3% |
| ReverseHard | 5/191 | 2.6% |

Two root causes: (a) the profanity purge removed words (BITCH, RAPE…) from the dictionary while chains requiring them as *transient source remainders* survived; (b) the reverse generator's `isReverseSolvable` check was looser than the shipped rules (it routed through intermediate boards the app rejects).

The failure UX stacks badly: stuck detection is silent by design; HINT **consumes a paid hint** and glows an impossible move; committing it can **display the purged profanity** in the invalid-word message (also a Play-policy exposure); Restart keeps the penalty counters; Home→Play restores the same dead board. Reverse unlocks at puzzle 8 — inside the new-player window.

**Fix (do first):** purge/regenerate the 42 boards; add a CI test that exhaustively solves every bank puzzle under the *shipped* validation rules; never consume a hint when the stored solution step is invalid on the current board; optionally a quiet "the words resist… begin anew" regenerate path when a board is truly dead.

## 2. The core loop is a delivery mechanism, not a challenge — decide that on purpose

Simulation: puzzles are 2–4 moves long; **78–85% of board states have exactly one legal move**; a player who taps each letter and follows any ✓ preview completes 89–96% of boards without ever hitting a dead end; stars cannot distinguish a novice from an expert (undo is free, only hints/invalid attempts are scored). The complete optimal strategy is learned in session one.

The critic's counterpoint is important and I agree with it: **low decision density is the product** for the 35+ comfort-word-game audience — time-to-find is the real difficulty (Wordscapes prints money on the same structure). Do NOT add friction to the mandatory loop. But the mastery chase is genuinely missing for anyone who wants one, and it's cheap to add **beside** the core:

- **"Flawless offering" tier above 3 stars** (0 hints, 0 invalids, 0 undos — all already tracked) with a lifetime tally and a phase-aware in-world honorific. The Spelling Bee "Genius" pattern; scoring + UI only.
- **Personal solve-time trends** surfaced in-world ("the words come to you faster now") — the actual skill is scanning speed; measure it privately, no leaderboard needed.
- **A new opt-in "blind offering" modifier** (previews hidden, chosen before the board) rather than retrofitting Challenge mode — retrofitting punishes existing Challenge users; a new modifier is the Wordle-Hard-Mode shape.
- Persist `speedRound` as a best-round record with achievements — the escalation ladder currently evaporates on reset.

## 3. Variants: good bones, dead meta

Depth ranking from the readers: **Reverse** is the deepest (cumulative locking doubles the planning horizon, real stranding risk) — and it's the one shipping broken banks, boring-exempt generation (all anti-boring penalties skipped, 8.4% plural-hub saturation, "move the S again"), and exhaustion inside a casual journey (191-puzzle ReverseHard exhausts at ~real-puzzle 199). **Double Shift** has the highest raw combinatorics but its look-ahead preview makes its one deep decision for the player. **Speed** is the only place scanning speed gets tested. **Challenge** is a stakes dial, not a variant.

The meta problem: after each unlock toast, *nothing in the game ever mentions variants again*. Zero of 40 achievements reference them, zero quest types name them, the `shouldOfferVariant` hook is dead code, and the anti-farm decay actually rewards settling on one variant forever. The 32 difficulty×variant configurations you built are invisible as content.

**Fixes:** 2–3 achievements per variant; a rotating quest type that names a variant; revive the variant-offer nudge ("Fox wonders what happens if the words come back..."); regenerate reverse banks bigger with anti-boring ON; replace repeat-decay with a fresh-variant bonus so rotation reads as rewarded.

## 4. Phase 4 lasts ~2 puzzles — the biggest single narrative-payoff bug

The finale fires on the **first** victory at Phase 4 with a complete house; post-revelation on the **next** one. The house completes by ~p130–150 for every solvent player, so the entire cult-reveal era — 300 dialogue lines (you see ~60), robed sprites, the sacrifice mechanic, storm sky — flashes past in one sitting. The documented 155→210 dread window is dead code.

**Fix (pure code, highest narrative ROI):** gate the finale on a dwell condition — N Phase-4 puzzles AND at least one full dialogue session per unlocked animal, or a player-initiated final rite at the pit once the wards signal readiness ("the house is not yet ready to receive it"). This converts ~240 already-written-but-unseen lines into playtime.

## 5. The vocabulary arc plays backwards at the climax

The boards really do descend (615 tiered dread words steer generation and bank selection) — but supply is thin (HARD: 130/440 dread-tiered puzzles, avg 0.37 dread words/board) and tier-matched boards are consumed near-deterministically *early* and never recycled until full-bank exhaustion. Result: during the reveal and all of Phase 5, players shift nearly 100% bright tier-0 words. FUN→VOID inverts to VOID→FUN exactly at the beat it exists for.

**Fixes:** reserve a tier-4 quota (drop the +10 "lead" bonus pre-Phase-3); let dread-tiered puzzles recycle at Phase 4+; steer Phase-4/5 players toward the dread-rich double-shift banks (39% tier≥3); longer-term, expand the 4/5-letter dread lexicon (only 43 four-letter tier-4 words exist — the bottleneck is the word list, not the generator).

## 6. The descent never reaches the player's hands

Catalogued: visual/audio/copy changes per phase are extensive and excellent; **rule changes during Phases 0–4: zero** (the code says so itself: "without changing mechanics"). Ritual energy — the one incentive loop — is invisible at the moment of choice; complicity is asserted by copy, never enacted. And victory at Phase 3–4 is the Phase-0 ceremony reskinned, with the same cheerful chimes (the SFX pack has zero dark move/victory variants).

Cheapest high-impact moves, all using existing plumbing:
- **Animals request offerings** ("Bring me something with warmth in it") via startWord seeding + the trigger-word queue, then react when the ledger delivers. Roughly one API call plus dialogue copy. This single change makes the descent something the player *does*.
- **Let the player choose which words to feed the pit** (withheld words pay less; fed dread words get remembered by name: "You gave us VOID. You didn't have to."). The wordHarvest/ledger plumbing exists; this is the cheapest real complicity lever in the whole design.
- **Dark SFX variants at Phase 3+** for move/victory (regenerate via the synth pack script) and 1–2 scripted anticlimax micro-beats (one victory where the fanfare simply doesn't play).
- The critic's note on confetti is right: dark confetti erupting *harder* for heavy offerings can read as the entity rejoicing — celebration with the wrong valence. Keep it, but pair it with the flattened chime so it reads deliberate.
- Move echo puzzles (seeded from the player's own ritual words) to *before* the finale — the tech ships today but only runs at Phase 5, after the moment it was made for.

## 7. The daily challenge is mis-tuned as a habit anchor

It's pinned at 6-letter/5-row — strictly harder than anything selectable — every day, with a one-time 2-hint mercy, and hints double-punish (stars AND leaderboard rank). Genre leaders make the daily the *accessible* ritual (Wordle) or ramp it across the week (NYT). The critic correctly notes it can't be *failed* (no fail state) — the cost is tedium, not a wall — so this is a tuning fix, not an emergency: **ramp difficulty across the week** (gentle Monday → brutal Sunday; a pure seed-parameter change), add a once-per-day rewarded rescue that never touches stars, and decay a broken streak to the last milestone instead of zero. Also: give the daily a narrative host ("Panko prepared today's offering") — it's currently the only ritual with no animal attached.

Two adjacent retention gaps: **re-engagement goes permanently silent 7 days after a lapse** (extend the win-back ladder to +14/+30 with a finished-story rung), and the leaderboard standing is shown exactly once with no re-check surface.

## 8. Endgame: honest but thin

Tending is a well-built sink, but post-story content exhausts fast (~50 lines, 5 milestones) and the honest daily reason becomes "keep two streaks alive." The judges proposed weekly events; the critic correctly objects that an event calendar would vandalize the quieting world the third act builds. The right-shaped answers:

- **A new cycle (NG+)**: "The pattern continues" *begs* for a second descent — bright phases replayed with the animals subtly remembering, remixed seed lines, dread words arriving earlier. Almost entirely existing assets, and it serves the horror genre's re-read culture (DDLC/Undertale players replay to see what they missed).
- Phase-5 endless/zen mode with Tending as its persistent counter; echo puzzles as the backbone.
- A "perfect offering" prestige chase that survives the story (see §2).

## 9. Risks nobody inside the design was watching (critic's findings worth acting on)

- **Review-bomb exposure at the reveal**: the comfort-audience betrayal is the art, but prompt for store ratings ONLY during Phase 0–1 delight peaks and hard-suppress prompts from Phase 2 onward. Two lines of policy that protect the rating from the game's boldest moment.
- **Content-rating exposure**: cult/ritual themes behind cute-animal art + the profanity-display bug = Play questionnaire risk. Fix the bug, sanity-check the age rating and store-listing tone disclosure.
- **Interstitials as tonal vandalism**: a bright candy ad after "WHY DOES IT MATTER?" destroys the dread. Consider throttling/suppressing interstitials at Phase 3+ as an artistic decision.
- **Dialogue skippers experience the descent as pure degradation** (game gets darker/slower/heavier with zero explanation). The "animals request words" fix in §6 is the best mitigation — it moves story into the boards themselves.
- **The share grid carries no conversation** (everyone's grid is identical green). Phase-corrupted share cards — the card itself decays with phase, unexplained — turn late-game shares into the "something is wrong with my cute word game" artifact that carried DDLC's word of mouth.
- **Acquisition is unaddressed**: the twist is spoiler-locked out of marketing and D1–D7 shows the game's most generic face. The most plausible path is a creator/streamer kit (the 4–6 hour arc is ideal for a 3–5 episode series) + platform featuring for narrative innovation.

---

## Priority order (my recommendation)

1. **Unwinnable boards**: purge + CI solvability test + hint-refund guard. (Trust/policy; do before anything else.)
2. **Phase-4 dwell gate** — the single highest-leverage change to whether finishing the story feels worth it.
3. **Dread-supply rationing + Phase-4 recycle** so the climax boards say VOID.
4. **Daily week-ramp + streak decay-to-milestone + rewarded rescue** — the habit anchor.
5. **Animals request words + player-curated pit offerings** — descent into the hands, complicity enacted.
6. **Flawless tier + solve-time trends + variant achievements/quests + fresh-variant bonus** — the missing chase.
7. **Dark SFX + anticlimax beats + echo puzzles pre-finale** — make hollow victories hollow.
8. **Rating-prompt choreography + win-back extension + reverse-bank regeneration.**
9. **New Cycle (NG+)** as the endgame answer, post-launch.

Items 1–4 and 7–8 are days, not weeks. Item 5 is the one that changes what the game *is* in its middle hundred puzzles — I'd prototype it right after the blocker fixes.
