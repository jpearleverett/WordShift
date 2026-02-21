# WordShift: Complete Game Flow Analysis — Onboarding to Endgame

## Context

This is an analysis of WordShift's player journey from first launch through post-revelation endgame, examining flow coherence, pacing, engagement gaps, economy balance, and narrative delivery. The goal is to identify where the experience works, where it breaks down, and what specific improvements would have the highest impact.

---

## 1. The Complete Player Journey

### Act 0: First Launch & Onboarding (Puzzles 0-1, ~5 minutes)

**State machine**: 11 steps (`home_empty` → `complete`) orchestrated by `useOnboardingFlow.ts`

| Step | Screen | Player Action | Emotional Beat |
|------|--------|--------------|----------------|
| `home_empty` | Home | See empty den, auto-invite prompt | Curiosity — "what is this place?" |
| `fox_invited` | Home | Tap through 4 Fox lines | Warmth — Fox is friendly, welcoming |
| `going_to_puzzle` | Transition | Fox says "Follow me!" | Guided excitement |
| `puzzle_tutorial` | Puzzle | Guided GLOW→ABLE→EACH puzzle | Discovery — "oh, I get it!" |
| `puzzle_complete` | Puzzle | Victory + Fox congratulates | Satisfaction — first win |
| `going_to_pit` → `pit_offering` | Pit | Tap words into pit | Tactile delight — spiral animation |
| `returning_home` → `unlock_explained` | Home | Fox explains cycle | Purpose — "puzzles → amber → house" |

**Narrative seeds planted (invisible)**: "We've been waiting for someone like you...a long time." / "Every puzzle feeds the house." / "They need you." These are warm now; they become horrifying in retrospect.

**Flow assessment**: Clean, linear, no decision fatigue. The pit introduction is smart — players understand deferred crediting from minute one. The guided tile highlighting prevents dead-ends without feeling patronizing.

**Potential issue**: The pit visit during onboarding only has 1 batch of ~3 words. The spiral animation is satisfying, but the pit feels underwhelming with so little to offer. Players may not return to the pit voluntarily until they accumulate more batches.

---

### Act 1: Bright Days (Puzzles 1-25, Phase 0, ~Days 1-5)

**Core loop established**: Puzzle → Victory → Pit → Amber → Unlock → Home → Puzzle

**Economy flow**:
- Earn rate: ~12 avg amber/puzzle + bonuses = ~15-18 effective
- First-completion bonuses: EASY +10, MEDIUM +20 (one-time spikes)
- Milestone bonuses: Puzzle 10 (+30), 15 (+40), 25 (+50)
- By puzzle 25: ~500-600 total amber earned

**Unlock cadence**:
| Puzzle ~# | Unlock | Cost | Running Spend |
|-----------|--------|------|---------------|
| 0 | Fox (free) | 0 | 0 |
| ~3-4 | Kitchen | 50 | 50 |
| ~8-10 | Pangolin | 100 | 150 |
| ~15-18 | Study | 100 | 250 |
| ~22-25 | Owl | 100 | 350 |

**Engagement systems active**: Weekly quests (4 rotating), streak tracking, animal whispers post-puzzle, feature tooltips (stats → gallery → pit), Fox challenge mode intro at puzzle 15.

**Early darkness**: 8% victory glitch chance ("WE SEE YOU" flash), 5% seed move messages ("The letters remember."). First victory always glitches. These are so brief and rare that most players won't consciously register them — but they create subliminal unease that pays off later.

**Emotional arc**: Pure delight → mastery confidence → "I want to see what's next"

**Flow assessment**: This is the strongest act. Unlock cadence is fast enough to maintain dopamine (new animal/room every ~5 puzzles), curated first 3 puzzles guarantee quality first impressions, and the core loop is satisfying. The horror seeds are calibrated correctly — rare enough to dismiss, frequent enough to accumulate unease.

**Issues identified**:
1. **Pit visit friction begins here.** After onboarding, the game doesn't force pit visits. A player could complete 10 puzzles, accumulate 10 harvest batches, and never realize their amber isn't spendable until they try to buy Kitchen and can't afford it. The VictoryModal "Collect Now" button mitigates this, but players who habitually tap "Next Level" will skip it.
2. **Dialogue cooldown is too tight at Phase 0.** Only 2 puzzles between sessions means Fox is available almost every other puzzle — but with only 3 dialogues per session and 12 total Phase 0 lines, Fox exhausts content by ~puzzle 12. Pangolin/Owl aren't unlocked until puzzle 8-10+. There's a 5-10 puzzle window where Fox is on cooldown with nothing new to say and no other animal is available.

---

### Act 2: Curious Thoughts (Puzzles 25-75, Phase 1, ~Days 5-15)

**Phase transition**: First deferred transition. Player hits weighted progress 25 → `pendingPhaseTransition` set → pit ward marks begin illuminating → player confirms in pit → ward ignition ceremony → `PhaseTransitionOverlay` cinematic plays.

**This is the first time the player encounters the ceremony system.** If they haven't been visiting the pit regularly, the mandatory pit CTA on VictoryModal (which hides Next Level/Share/Home buttons when `phaseTransitionPending` is true) forces them there. This could feel confusing — "why can't I play another puzzle?"

**Narrative shift**: Animals become philosophical. Fox: "Have you ever noticed how letters can become anything?" Owl starts hinting at hidden knowledge. Visual change is minimal — sky still bright, background still purple, but dialogue tone shifts.

**New mechanics unlocking**:
- Daily challenge at 20 puzzles (Fox intro scene, deterministic 6-letter/5-row HARD puzzle)
- Reverse variant at 10 puzzles (currently 0 for testing)
- Double Shift at 40 puzzles (currently 0 for testing)
- Speed Shift at 52 puzzles (currently 0 for testing)

**Unlock cadence slows**:
| Puzzle ~# | Unlock | Cost |
|-----------|--------|------|
| ~30-35 | Aquarium | 140 |
| ~40-45 | Axolotl | 100 |
| ~50-60 | Jungle | 200 |
| ~65-70 | Sloth | 100 |

Gap between unlocks widens from ~5 puzzles to ~10-15 puzzles.

**Narrative micro-beats active**: Puzzle 35 (glitch title "WE REMEMBER"), 40/50/55/65 (ambient whispers about the house breathing, light changing, word marks, words remembering each other). These 5 beats across 50 puzzles are critical for bridging the Phase 1 stretch — but leave a 10-puzzle gap from 65 to Phase 2 entry at 75.

**Animal awareness tiers matter now**: Fox and Owl (Vanguard, +1 phase ahead) are already speaking Phase 2 dialogue at global Phase 1. This means the player encounters "The house is listening" from Fox while Pangolin is still happily chatting about recipes. This dissonance is intentional and effective — the player senses something is off with certain animals before understanding why.

**Emotional arc**: Curiosity → mild unease → "are the animals hiding something?"

**Flow assessment**: This is the weakest act and the biggest churn risk. The reasons:
1. **Phase 1 lasts 50 puzzles (25-74)** — the longest single phase. Changes are subtle (dialogue tone, micro-beats), but visual theming barely shifts. Players doing 3-4 puzzles/day spend 12-17 days in essentially the same visual environment.
2. **Unlock cadence gap.** From Owl (puzzle ~22-25) to Aquarium (puzzle ~30-35) is a ~10 puzzle gap with no new content. From Axolotl (~40-45) to Jungle (~50-60) is potentially 15 puzzles. These are the widest gaps in the entire game and they occur during the least narratively compelling phase.
3. **Variant unlock timing (when thresholds are real)**: Reverse at 10 is too early to feel like a reward; Double Shift at 40 and Speed at 52 are well-placed as mid-Phase-1 novelty injections. Chain at 85 arrives at Phase 2 entry — good.
4. **Micro-beats are sparse.** 5 micro-beats across 50 puzzles (at 35, 40, 50, 55, 65) = one every ~10 puzzles. Players doing 3/day see one every ~3-4 days. And there's a 10-puzzle dead zone from beat at 65 to Phase 2 entry at 75 with nothing. The next beat (80) is already in Phase 2.
5. **Cross-animal references at 10%** are too rare to notice. A player talking to Fox has a 1-in-10 chance of Fox mentioning another animal. Most players will never see one in Phase 1. The guaranteed first cross-ref for Vanguard animals helps, but only Fox and Owl get it.

---

### Act 3: Deeper Questions (Puzzles 75-150, Phase 2, ~Days 15-35)

**Phase 2 transition ceremony**: By now the player has seen one ceremony (Phase 1). The second should feel familiar but slightly more ominous — the ward marks glow purple instead of turquoise, the ceremony text is darker.

**Visual shift becomes noticeable**: Sky transitions to `sky_dusk.png`, background color to `#514378`, particles desaturate. Letter tiles become slightly heavier (friction:5/tension:150). Resonance glow appears on dread-tier words (faint purple-blue pulse, opacity 0.04-0.12).

**Dread words enter the puzzle pool**: Tier 1 (curiosity: THINK, DRIFT, SHIFT) and Tier 2 (emptiness: VOID, EMPTY, FADE, FLOAT) start appearing. Scoring formula weights same-tier words 1.0x at Phase 2, creating natural vocabulary evolution.

**Dialogue deepens significantly**:
- Sessions extend to 5 dialogues (up from 3)
- Cross-references jump to 25% — players start hearing "Ember was talking about you..." from Pangolin
- Coordinated events fire at puzzles 80, 100, 120 — ALL animals have thematically linked dialogue
- **Player choice points at Phase 3** (dialogueChoices.ts): Each animal offers a binary choice ("What arrangement?" vs "I don't want to know"). Both paths converge — brilliant design that creates complicity without actual branching.

**Named incantations appear**: Victory modal shows puzzle chain names. Phase 2: innocent ("The HEAT Dance"). Phase 3: shadowy ("The HEAT's Shadow"). This recontextualizes the puzzle itself as ritual.

**Ritual echo chain visible in-puzzle**: Left-side word chain display appears (subtle pink at Phase 2, prominent at Phase 3+). Players can now see the "incantation" building in real-time.

**Economy shift**: Weekly quest rewards scale to 1.25x. Variant bonuses are meaningful. Daily challenge streak milestones provide amber spikes. Unlock costs are smoothed (Burrow 325→250, Garden 400→300).

**Emotional arc**: Unease → recognition ("something IS wrong") → commitment ("I need to know what happens")

**Flow assessment**: This is where the game either hooks players for the long haul or loses them. The visual shift, dread words, and named incantations all work together to create a genuine tonal transformation. The coordinated dialogue events at 80/100/120 are excellent pacing anchors.

**Issues**:
1. **Phase 2→3 boundary (puzzle 150) is a long wait.** Phase 2 lasts 75 puzzles. At 3/day, that's 25 days. The visual and narrative shifts are more dramatic than Phase 1, but 25 days is a long time. Narrative acceleration helps (engaged players can reach Phase 3 at ~100 puzzles), but casual players will spend nearly a month here.
2. **Dread pulse (crimson overlay) and screen shake don't activate until Phase 3.** Phase 2 has dread words in the pool but no visual feedback when they're formed. This is a missed opportunity — even a subtle flicker at Phase 2 would reinforce the connection between dark words and something happening.
3. **Catch-up dialogues for late unlocks are well-designed** but the player might not realize an animal has special intro content if they're on cooldown when unlocked.

---

### Act 4: Growing Shadows (Puzzles 150-250, Phase 3, ~Days 35-60)

**Phase 3 transition ceremony**: Ward marks glow crimson. Ceremony text explicitly references "what approaches." `PhaseTransitionOverlay` includes screen shake + flash effects.

**Full sensory shift**:
- Sky: `sky_storm.png`, background near-black (#060612)
- Letter tiles: heavy (friction:7/tension:110), slow wobble (300/600ms), purple trail glow on selected tiles
- Dread pulse active: forming a dread word triggers crimson overlay (opacity 0.18) + screen shake (2px jitter) + haptic feedback
- Confetti muted: dark colors instead of rainbow
- Victory text: "GREAT WORK!" → "It continues."
- Move messages: "Nice!" → "The arrangement accepts."

**Dialogue becomes overtly dark**:
- Sessions max at 5 dialogues, cooldown at 5 puzzles
- Cross-references at 45% — animals clearly coordinating
- Coordinated events at 160, 200 — synchronized cult messaging
- Lagging animals (Sloth, Wombat, Rabbit, Red Panda) are now at Phase 2 — they're questioning while Vanguard animals are at Phase 4 (already speaking of the cult). This creates a powerful dramatic irony where the player knows more than some animals.
- **Player choice points** (Phase 3 only): One per animal, binary, convergent. "What arrangement?" / "I don't want to know." The illusion of agency deepens complicity.

**Shadow Presence visible**: `ShadowPresence` component in HouseWorld.tsx renders above the house. Phase 3: opacity 0.15, 80% scale, animated breathing. Wispy tendrils appear.

**Arrangement pattern visible**: Phase 3 sigil lines connecting rooms are thicker with glow nodes. The house visually transforms into a ritual structure.

**Room word echoes**: Recent puzzle words appear as faint text (opacity 0.15, muted purple) scattered across room backgrounds.

**Emotional arc**: Dread → "I can't stop" → compulsion to see it through

---

### Act 5: The Horizon (Puzzles 250+, Phase 4, ~Days 60-80)

**Phase 4 = The Reveal**:
- Sky: `sky_shadow.png` with silhouette. Background #1a122a.
- All animal sprites switch to `robed.png` — hooded cult robes
- Shadow Presence at full opacity (0.30) with crimson pulsing eyes
- Letter tiles: heaviest (friction:9/tension:80), ponderous wobble (400/800ms), crimson trail glow
- Dread pulse intensified: opacity 0.25, 4px screen shake
- Victory: "WHY DOES IT MATTER?" / "Perfection in an imperfect void."
- Arrangement pattern: crimson pulsing lines connecting all rooms

**Tutorial callback**: Fox at Phase 4 triggers a one-time dialogue recontextualizing innocent Phase 0 lines: "Remember when I said we'd been waiting for someone like you? I wasn't being friendly. I was being honest."

**Narrative seeds from all 10 animals**: Each has a Phase 0 seed and Phase 4 callback.

**Sacrifice mechanic unlocks**: Phase 4+ players can voluntarily destroy amber — no gameplay benefit, just feeding the arrangement. Animals acknowledge sacrifices with personalized reactions.

**Final unlocks approaching**: Wombat, Rabbit, Bamboo Attic, Red Panda are the last 4 unlocks. Red Panda (Bamboo) is the final animal — "the cult's spiritual leader, at perfect peace with the summoning."

**Emotional arc**: Horror → complicity → morbid fascination → "what happens when I finish?"

---

### Act 6: Endgame (Post-house completion, Phase 4→5)

**Three sequential triggers**:
1. **House Completion** (all 10 rooms + 10 animals): `markHouseCompleted()` → ceremony modal with `getHouseCompletionText()`. Also fires `HOUSE_COMPLETION_EVENT` cinematic.
2. **Final Puzzle** (next puzzle after house completion, Phase 4): `FINAL_PUZZLE_EVENT` cinematic overlay → `markFinalPuzzleCompleted()`. This is the climax.
3. **Post-Revelation** (next puzzle after final puzzle): `POST_REVELATION_EVENT` cinematic → `markPostRevelation()` → Phase 5 activates.

**Phase 5 = Terrible Peace**:
- Visual: Muted purple (#252040), ghostly mauve particles. Not aggressive like Phase 4 — serene.
- Dialogue: 10 new lines per animal, cycling. Animals are calm, at peace. "The pattern continues." This serenity is more unsettling than the dread.
- Victory: "The pattern continues." / "Another thread in the weave."
- Tile behavior: Purple-gray tints, ghostly mauve shadow on DraggableTile.
- VictoryModal completion coda: First final-puzzle and post-revelation wins show dedicated acknowledgement.

**Post-revelation loop**:
- Weekly quests at 2.0x rewards (maintain amber relevance)
- Daily challenges continue (streak system ongoing)
- Sacrifice mechanic (Phase 4+ amber destruction)
- Whisper Gallery completion (collecting all 150+ whispers, 660+ dialogue lines)
- Post-revelation dialogues cycle (10 per animal = 100 total, modulo cycling)

---

## 2. Economy Flow Analysis

### Amber Earn Rate vs. Spend Curve

**Total unlock cost**: ~2,840 amber (19 unlocks, Fox free)

**Projected earnings by puzzle milestone** (assuming avg 2.3 stars, MEDIUM difficulty, modest streak):

| Puzzles | Cumulative Amber | Unlocks Affordable | Phase |
|---------|-----------------|-------------------|-------|
| 25 | ~500 | Fox + Kitchen + Pangolin + Study | 0→1 |
| 50 | ~1,100 | + Owl + Aquarium + Axolotl | 1 |
| 75 | ~1,800 | + Jungle + Sloth | 1→2 |
| 100 | ~2,500 | + Desert + Fennec | 2 |
| 125 | ~3,200 | + Office + Capybara | 2 |
| 150 | ~4,000 | + Burrow + Wombat | 2→3 |
| 175 | ~4,900 | + Garden + Rabbit | 3 |
| 200 | ~5,800 | + Bamboo Attic + Red Panda | 3 |
| 225+ | ~6,800+ | All unlocked, surplus | 3→4 |

**Observation**: House completion (~puzzle 200-225) arrives before Phase 4 (puzzle 250+ weighted) for most players. This means the endgame triggers (house complete → final puzzle → post-revelation) can't fire until the player reaches Phase 4, creating a potential 25-50 puzzle gap where the house is complete but Phase 4 hasn't triggered. During this gap, the player has nothing to spend amber on and no narrative payoff for having completed the house.

**Missing puzzle-count gates (CONFIRMED NOT IMPLEMENTED)**: The CLAUDE.md/MONETIZATION_PLAN.md mentions puzzle-count gates on late unlocks (Jungle 55, Desert 75, Office 95, Burrow 115, Garden 140, Bamboo Attic 170), but the `UNLOCK_PROGRESSION` array in `homeWorldData.ts` has no `minPuzzles` field on any entry — the gate system is not built. This means players can speed-run the house via optimal amber strategies (challenge mode 1.5x + hard difficulty + variant bonuses + streak multiplier), potentially completing the house by puzzle 150-175, well before Phase 4 (250+). This creates the house-complete-but-no-endgame gap discussed in section 4.

**Post-house amber sink gap**: After all unlocks, amber accumulates with no meaningful spend. Sacrifice mechanic (Phase 4+) destroys amber but provides no material benefit. Animal gifts (15-30 amber, Phase 1+), room upgrades (50-100 amber, Phase 2+), and amber altar (Phase 3+) are listed in MONETIZATION_PLAN.md but it's unclear if they're implemented. Without these sinks, the economy becomes irrelevant post-house.

---

## 3. Flow Bottlenecks & Friction Points

### 3.1 Pit Visit Friction (LOW-MEDIUM severity)

The deferred amber system means players must visit the pit to convert harvest batches to spendable amber. While narratively fitting ("feed your words to the void"), this creates friction:

- **VictoryModal "Collect Now"** mitigates for engaged players
- **Mandatory pit CTA** (hiding Next Level when `phaseTransitionPending`) forces pit visits at phase boundaries
- **But**: Habitual "Next Level" tappers will accumulate 10+ batches without realizing their amber isn't spendable. First time they try to unlock something and can't afford it despite earning enough is a confusion point.
- **Home screen pit badge** (pending word count) helps, but is easy to ignore.

### 3.2 Mandatory Phase Transition Pit Visit (MEDIUM severity)

When `phaseTransitionPending` is true, VictoryModal hides Next Level / Share / Home — only pit CTA remains. For players who don't understand the pit ceremony system, this feels like the game is broken. "Why can't I play another puzzle?"

The pit ward system is visually beautiful but mechanically opaque. Players must: see all 7 wards lit → tap the ward ring area → watch ignition ceremony → transition confirms. There's no explicit instruction that tapping the wards is required.

### 3.3 Phase 1 Duration (HIGH severity — primary churn risk)

Phase 1 spans puzzles 25-74 (50 puzzles). Visual changes are minimal. Dialogue shifts are subtle. At 3 puzzles/day, this is 17 days of essentially the same experience. The micro-beat system provides 6 beats across this span — one every ~8 puzzles, or every ~3 days. This is the game's biggest retention vulnerability.

Narrative acceleration helps engaged players (high 3-star rate + hard difficulty + challenge mode can compress Phase 1 to ~30 puzzles), but casual players who stick with EASY/MEDIUM at 2-star average will experience the full 50-puzzle stretch.

### 3.4 Dialogue Exhaustion Window (LOW severity)

Fox has 12 Phase 0 dialogues. At 3 dialogues/session with 2-puzzle cooldown, Fox exhausts unique content by puzzle ~12-15. Pangolin isn't available until puzzle ~8-10. There's a window where Fox is on cooldown with nothing new, and the next animal isn't unlocked yet. The `hasNewDialogue` badge handles this gracefully (no false exclamation marks), but the player has no narrative content to consume during this gap.

### 3.5 Victory Flow Complexity (LOW severity)

The post-victory cascade (stars → modal → whisper → interjection → micro-beat → ritual event) is rich but long. At Phase 3+, a single victory can trigger: star animation + modal reveal + ritual echo + named incantation + amber breakdown + whisper + interjection + dread pulse + micro-beat toast. That's a lot of sequential animations before the player can tap "Next Level." The skip-to-end on VictoryFlow helps, but the interjection/whisper layer has its own 1.2s + 2.5s delays.

### 3.6 Post-Phase 5 Content Cliff (MEDIUM severity)

After post-revelation dialogues cycle through (10 per animal = 100 total), there's no new narrative content. Weekly quests, daily challenges, and sacrifice provide mechanical engagement, but the narrative — which IS the product — has ended. The Whisper Gallery provides a "collect them all" motivation, but many whispers are encountered organically during play, not sought out.

---

## 4. Narrative Coherence Assessment

### Does the Horror Shift Feel Earned?

**Strengths**:
- **Phase 0 seeds** (victory glitches, seed move messages) plant subliminal unease without breaking the candy aesthetic.
- **Animal awareness tiers** create natural dramatic irony — Fox/Owl speak darkly while Sloth/Rabbit are still cheerful. The player experiences the shift through relationship contrast, not just atmospheric change.
- **Dread word vocabulary evolution** is subtle and effective. Players won't consciously notice that VOID/EMPTY replaced SPARK/FLAME in the puzzle pool, but the shift contributes to mounting unease.
- **Named incantations** ("The HEAT Dance" → "Offering: VOID to DOOM") recontextualize the core mechanic — the puzzle itself becomes the horror element.
- **Tutorial callbacks at Phase 4** are the emotional payoff for the entire game. "We've been waiting for someone like you" lands because the player remembers Fox being warm. This is excellent narrative design.
- **Deferred phase transitions via pit ceremonies** make the player actively participate in their own descent. You don't just watch a cinematic — you tap the ward marks. You confirm the transition. Complicity is mechanical, not just narrative.

**Weaknesses**:
- **Phase 1 is too long and too subtle.** The 50-puzzle stretch with minimal visual change risks losing players before they reach the payoff. The micro-beat system helps but doesn't fully bridge the gap.
- **Early darkness seed rate (8% glitch, 5% seed messages) may be too low.** A player doing 25 Phase 0 puzzles will see ~2 glitches and ~1 seed message. That's enough for subliminal effect but barely enough for conscious recognition. Players who don't notice these seeds lose the "it was there all along" revelation at Phase 4.
- **Cross-animal references at Phase 1 (10%) are nearly invisible.** The coordination that makes the cult reveal powerful requires players to have seen animals talking about each other. At 10%, most players will have seen 0-1 cross-references by Phase 2. The guaranteed first cross-reference for Vanguard animals at each phase helps, but Middle and Lagging animals have no guaranteed cross-refs.
- **The gap between house completion (~puzzle 200-225) and Phase 4 (puzzle 250+)** means the endgame trigger ("final puzzle after house complete AND Phase 4") may not fire for 25-50 puzzles after the house is done. During this gap, the player has a complete house, fully revealed cult, but no narrative climax. This anticlimactic pause undermines the emotional arc.

---

## 5. Specific Recommendations

### 5.1 — Bridge the Phase 1 Retention Valley (HIGH priority)

**Problem**: 50-puzzle Phase 1 with minimal visual/mechanical change.

**Options**:
- **Add 2-3 more micro-beats** in the 68-75 range to close the dead zone between beat at 65 and Phase 2 entry at 75. Currently there are 0 beats in that 10-puzzle stretch. A beat at 70 (ambient whisper) and 74 (subtle glitch) would maintain the thread right up to the phase boundary.
- **Introduce a Phase 1 visual "twitch"** — occasional (5%) slight color desaturation on the puzzle background for 1-2 seconds. Like the victory glitch but environmental. Not enough to be alarming, enough to be unsettling.
- **Increase cross-animal reference rate at Phase 1 from 10% to 20%.** The coordination payoff requires players to see it happening.
- **Consider shortening Phase 1**: Move threshold from 75 to 60 (Phase 1 becomes 35 puzzles instead of 50). This is the simplest fix but requires rebalancing Phase 2 threshold (75→60) and potentially min-puzzle guards.

**Files**: `src/services/phaseNarrative.ts` (micro-beats), `src/services/dialogue/animalDialogueNarrative.ts` (cross-ref rates), `src/types/homeWorld.ts` (phase thresholds)

### 5.2 — Clarify Pit Transition UX (MEDIUM priority)

**Problem**: Players don't understand why they can't play another puzzle when `phaseTransitionPending`, and don't know to tap ward marks.

**Options**:
- **Add a one-sentence instruction** when the player arrives at the pit with a pending transition: "The marks are ready. Tap them." displayed via Fox whisper or pit subtitle.
- **Auto-trigger ceremony** when player enters pit with all wards lit, instead of requiring tap. Reduces friction at the cost of some player agency.
- **Add pulsing tap affordance** to the ward ring area when transition is pending (beyond the existing pulse animation).

**Files**: `src/components/OfferingPitScreen.tsx`, `src/services/phaseNarrative.ts`

### 5.3 — Align House Completion with Phase 4 (MEDIUM priority)

**Problem**: House completes at ~puzzle 200-225, but Phase 4 requires 250+ weighted progress (min 225 real puzzles). This creates a 25-50 puzzle anticlimactic gap.

**Options**:
- **Enforce puzzle-count gates on late unlocks** (as listed in MONETIZATION_PLAN.md: Bamboo Attic requires 170 puzzles). This slows house completion to ~puzzle 230-240, closer to Phase 4 at 250.
- **Lower Phase 4 threshold slightly** (250→235 weighted progress, min 220 puzzles) to reduce the gap.
- **Add a "house complete but Phase 4 hasn't triggered" interstitial** — animals acknowledge the house is done but something is still building. This turns the gap into narrative tension rather than dead space.

**Files**: `src/services/homeWorldData.ts` (puzzle gates), `src/types/homeWorld.ts` (thresholds), `src/services/amberCurrency.ts` (phase calculation)

### 5.4 — Increase Early Darkness Seed Visibility (LOW priority)

**Problem**: 8% glitch + 5% seed messages may be too rare for conscious accumulation.

**Options**:
- **Increase victory glitch to 12%** (from 8%) — ~3 glitches in 25 puzzles instead of ~2
- **Add a Phase 0 environmental seed**: Very rare (3%), the home screen background briefly flickers to a slightly darker shade for 0.5s. Not dark enough to alarm, just enough to make the player blink.
- Keep current rates — the subliminal effect may be working as intended and increasing visibility risks spoiling the reveal too early.

**Files**: `src/services/phaseNarrative.ts` (glitch/seed rates)

### 5.5 — Post-Phase 5 Engagement (LOW priority, long-term)

**Problem**: Narrative content ends after post-revelation dialogues cycle.

**Options**:
- **Seasonal narrative echoes** (already planned in Chronicle content pass) — found objects/journal fragments in rooms.
- **Rotating ambient whispers** — new Phase 5 whispers generated from the player's actual word history ("You once formed FLAME. The fire remembers.") This personalizes the post-game experience.
- **Achievement completion** already provides some long-tail engagement (34 achievements across 6 categories).

---

## 6. Flow Diagram Summary

```
LAUNCH → Migration → Onboarding Detection
  │
  ├─ Fresh Install → 11-Step Onboarding
  │   home_empty → fox_invited → puzzle_tutorial → pit_intro → unlock_explained → complete
  │
  └─ FREE PLAY BEGINS
      │
      ├── PHASE 0 (Puzzles 0-24): Bright Days ──────────────────────────────┐
      │   Core loop: Puzzle → Pit → Amber → Unlock                         │
      │   Unlock: Fox, Kitchen, Pangolin, Study, Owl                        │
      │   Seeds: 8% glitch, 5% weird messages                              │
      │                                                                     │
      ├── PHASE 1 (Puzzles 25-74): Curious Thoughts ◄── CHURN RISK ───────┤
      │   First ceremony in pit. Daily/variants unlock.                     │
      │   Micro-beats at 35,40,50,55,65. Fox/Owl +1 phase ahead.          │
      │   Unlock: Aquarium, Axolotl, Jungle, Sloth                         │
      │                                                                     │
      ├── PHASE 2 (Puzzles 75-149): Deeper Questions                       │
      │   Visible darkening. Dread words in pool.                           │
      │   Named incantations, ritual echo chain.                            │
      │   Cross-refs 25%, coordinated events at 80/100/120.                 │
      │   Unlock: Desert, Fennec, Office, Capybara                          │
      │                                                                     │
      ├── PHASE 3 (Puzzles 150-249): Growing Shadows                       │
      │   Dread pulse + screen shake active.                                │
      │   Player choice points (convergent). Shadow figure visible.         │
      │   Unlock: Burrow, Wombat, Garden, Rabbit                            │
      │                                                                     │
      ├── PHASE 4 (Puzzles 250+): The Horizon                              │
      │   Cult revealed. Robed sprites. Crimson everything.                 │
      │   Tutorial callbacks. Sacrifice mechanic.                           │
      │   Unlock: Bamboo Attic, Red Panda (final)                           │
      │                                                                     │
      ├── HOUSE COMPLETE → Ceremony                                         │
      │   ↓                                                                 │
      ├── FINAL PUZZLE (Phase 4 + House Complete) → Cinematic               │
      │   ↓                                                                 │
      └── POST-REVELATION → Phase 5: Terrible Peace                         │
          10 dialogues/animal cycling. Serene resignation.                  │
          Weekly quests 2.0x. Sacrifice. Gallery completion.                │
```

---

## 7. Verification

This is a research/analysis document — no code changes proposed. To verify the findings:

1. **Economy projections**: Run `npx jest --no-coverage` (948 tests) to confirm all economy tests pass, validating the amber calculations referenced above.
2. **Phase thresholds**: Check `src/types/homeWorld.ts` `PHASE_THRESHOLDS` array matches [0, 25, 75, 150, 250].
3. **Unlock costs**: Check `src/services/homeWorldData.ts` `UNLOCK_PROGRESSION` for current costs.
4. **Micro-beat positions**: Check `src/services/phaseNarrative.ts` `NARRATIVE_MICRO_BEATS` for puzzle milestone triggers.
5. **Puzzle-count gates**: Check whether `UNLOCK_PROGRESSION` entries have `minPuzzles` enforcement (mentioned in MONETIZATION_PLAN.md but may not be implemented in code).
