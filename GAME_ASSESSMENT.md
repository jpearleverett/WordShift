# WordShift — External Game Assessment

**Prepared by**: Director of Product Evaluation, [Studio Name Redacted]
**Date**: February 23, 2026
**Assessment Framework**: Meridian Game Evaluation Framework v4.2
**Classification**: External Title — Pre-Launch Review
**Client**: WordShift Development Team

---

## EXECUTIVE SUMMARY

WordShift is a word puzzle game with a hidden narrative layer: what begins as a candy-colored letter-shifting game with adorable animal companions gradually reveals itself as a cosmic horror experience where the player has been unknowingly participating in a summoning ritual. The core puzzle mechanic is solid and the narrative ambition is genuinely extraordinary for the genre. This is one of the most architecturally mature indie mobile projects I've reviewed — but it has specific, addressable weaknesses in retention pacing, monetization readiness, and scope management that will determine whether it finds an audience or collapses under its own weight.

**Overall Rating: 7.4 / 10** — Strong concept, excellent execution depth, significant market risks.

---

## SECTION 1: CORE LOOP EVALUATION

**Rating: 8.0 / 10**

### The Mechanic

The fundamental puzzle — pick a letter from one word, drop it into the next to form a new valid word, chain through all rows — is clean, learnable, and satisfying. It sits in a sweet spot between Wordle's linguistic reasoning and Candy Crush's spatial manipulation. The "word preview" system (showing what word each slot insertion would form) is a critical design choice that elevates this from trial-and-error frustration into genuine strategic evaluation. This is the single smartest mechanical decision in the game.

**Strengths:**
- The pick/drop/chain mechanic is immediately intuitive but has real depth — middle-position moves are more interesting than edge moves, and the scoring system knows this
- 4 difficulty tiers (EASY through HARD) with clean differentiation: word length (4-5 letters) × row count (3-5 rows), plus a MEDIUM_PLUS bridge tier that most word games neglect
- Pre-generated puzzle banks (6,000 puzzles across 12 banks) eliminate generation latency — this is a production-grade content pipeline, not a prototype
- Quality scoring (`scorePuzzleChain()` with anti-boring detection, position weighting, semantic journey bonuses) means puzzles feel curated even though they're algorithmic
- Word history cooldowns (15-puzzle hard exclusion, 40-puzzle soft decay) prevent the "same words again" fatigue that kills word games

**Concerns:**
- The core loop is *single-threaded*: pick letter, drop letter, advance row, repeat. There's no branching decision within a single move. Compare to Wordle where every guess carries 5 simultaneous constraints. WordShift's per-move decision space is narrower — the previews often make the correct slot obvious
- 4-letter/3-row EASY puzzles may be *too* trivial to hook players in the first session. The curated early puzzles (3 hand-picked MEDIUM puzzles post-onboarding) are a good mitigation, but 3 is thin
- No time pressure in the default mode means no urgency. The Speed variant exists but is locked behind 52 puzzles — most players will never see it

### Variant Modes

The variant system (Reverse, Double Shift, Speed, Chain) is ambitious and well-differentiated:

- **Reverse Shift** is genuinely novel — cumulative locking during the return trip creates constraint propagation that feels like a different game. The dedicated `generateReverseChain()` brute-force sampler with pre-computed removal indices is serious engineering for a puzzle variant
- **Double Shift** (move 2 letters per step) adds combinatorial complexity without changing the core feel. The 4-phase input cycle (`pick1 → drop1 → pick2 → drop2`) is well-handled
- **Speed Shift** adds the urgency the base game lacks, but locking it behind 52 puzzles means the ~70% of players who churn before puzzle 20 will never experience it

**Unlock thresholds are too conservative.** Reverse at 10 puzzles is fine. Double Shift at 40, Speed at 52, Chain at 85 — by the time players reach these, they've either committed to the game or left. Consider: most casual mobile games surface their second mode by session 3.

### Drag-and-Drop

The drag-and-drop system (`DraggableTile.tsx` with PanResponder, `slotEstimation.ts` for arc layout geometry mapping) is a strong UX upgrade over tap-only interaction. The positional accuracy work (mirroring Row.tsx arc layout to estimate slot indices from screen X coordinates) is the kind of polish that separates shipped games from prototypes. Impact effects (heavy haptics, screen micro-shake, pop-then-collapse animation) give physical weight to the interaction.

---

## SECTION 2: NARRATIVE DESIGN

**Rating: 9.2 / 10**

This is the most ambitious narrative layer I've seen in a puzzle game. Period.

### The Arc

The 6-phase progression (Bright Days → Curious Thoughts → Deeper Questions → Growing Shadows → The Horizon → Post-Revelation) is meticulously designed. What makes it work:

1. **Everything transforms.** This isn't "same game, darker text." The visual theme shifts across 6 phase definitions with 17+ properties each (background colors, particle palettes, confetti colors, modal styling, vignette intensity). Letter tiles physically change behavior — spring friction increases from 3→9, wobble slows from 150ms→800ms, bounce height shrinks from -4→-1.5. The tiles feel *heavy* at Phase 4. This is exceptional attention to embodied game feel.

2. **660+ hand-written dialogues** across 10 animals × 6 phases, each with a distinct voice. Red Panda (Bamboo) at Phase 0: "My tail is particularly fluffy this morning. Small victories matter." Red Panda at Phase 3: "Zen teaches there is no self. Then what has been anxious all this time? What wakes me in the dark?" These aren't template-filled — they're written with genuine literary care.

3. **Per-animal phase awareness tiers** (Vanguard/Middle/Lagging) create temporal texture. Fox and Owl know the truth first; Sloth and Rabbit lag behind. When the lagging animals finally catch up, it hits harder *because* the player already knows. This is sophisticated narrative design.

4. **The incantation system** ties puzzles to narrative. Every word formed is recorded. Trigger words queue animal reactions. Ritual energy from dread words accelerates phase progression. Named incantations at Phase 2+ ("Offering: VOID to DOOM") reframe what the player just did. The puzzle *is* the ritual. This is the game's thesis and it's executed well.

5. **Early darkness seeds** — 8% chance of Phase 0 victory glitches ("WE SEE YOU" flashing for <300ms), 7% chance of wrong-feeling move messages ("The letters remember.") — are subliminal enough to create unease without breaking the candy facade. The first victory *always* glitches. Smart.

### Concerns

- **The retention valley.** Phase 0 lasts 24 puzzles, Phase 1 runs from puzzle 25-74. That's potentially 74 puzzles of "cute word game" before anything meaningfully dark happens. Narrative acceleration helps engaged players (~120-150 puzzles to Phase 4 instead of 250), but the median casual player will churn in the Phase 0-1 range and never see the game's defining feature. The narrative micro-beats (one-time events at puzzles 35, 40, 50, etc.) are a good mitigation but feel sparse — 10 events across 130 puzzles is one every ~13 puzzles.

- **Phase 5 feels undercooked relative to its ambition.** "Terrible peace" is a compelling concept but the mechanical experience doesn't change — same puzzles, same economy, same loop. After the extraordinary escalation of Phases 1-4, Phase 5 risks feeling like an anticlimax. Consider: what does the player *do* differently in Phase 5?

- **The 300-puzzle journey is long.** Even with acceleration, reaching Phase 4 requires 120+ puzzles. At 2-3 puzzles per day (typical casual cadence), that's 40-60 days. Most mobile games need to deliver their core promise within 7 days. The narrative *is* the core promise, but the player doesn't know that when they download "a word puzzle game."

---

## SECTION 3: META-PROGRESSION & ECONOMY

**Rating: 7.5 / 10**

### The Amber Economy

The earn/spend loop is well-calibrated:
- Base rewards (8-20 amber by difficulty) + star bonuses (+25-50%) + streak multiplier (10%/day, capped at 100%) + challenge multiplier (1.5x) + variant bonuses (with anti-farm decay) create satisfying per-puzzle variance
- First-completion bonuses per difficulty (+10 to +50) create natural "try the next tier" incentives
- Milestone bonuses at 15 puzzle-count checkpoints (25-500 amber) maintain long-term reward pacing
- Streak milestones (3/7/14/21/30 days) reward consistency without punishing casual play (2-day grace period)

The **Offering Pit** system (deferred amber crediting through harvest batches) is narratively brilliant — feeding words to a pit to claim your rewards — but adds friction to what should be a frictionless reward moment. The risk: players feel annoyed that their earned amber isn't immediately available, rather than immersed in the ritual. This is a bet on narrative engagement that may not pay off for the 60-70% of players who aren't narrative-engaged.

### The House Building System

The alternating room/animal unlock progression (build room → invite animal → build room → ...) is a solid metagame with clear visual progress. The bottom-up construction creates a satisfying "growing tower" feel. Costs escalate from 50 to 475 amber, with the mid-game smoothed (Burrow 325→250, Garden 400→300) to address a retention cliff.

**Puzzle-count gates on late unlocks** (Jungle requires 55 puzzles minimum, Bamboo Attic requires 170) are smart — they prevent amber surplus from outrunning narrative pacing. But they also mean a player who grinds HARD puzzles efficiently may hit "I have the amber but can't buy anything" dead zones. The gap between available amber and spendable progress should be monitored closely.

### Achievements & Quests

- **34 achievements** across 6 categories provide long-horizon goals
- **Weekly quests** (4 rotating, Monday reset, seeded selection) add short-horizon urgency
- **Phase-scaled quest rewards** (1.0x at Phase 0 → 2.0x at Phase 4+) maintain quest relevance for deep players
- **Daily challenges** (deterministic seeded generation, 6-letter/5-row HARD difficulty, streak tracking with milestone rewards) are a proven retention lever

The quest system is competent but not differentiating. Every puzzle game has weekly quests now. The narrative integration (dark ritual-themed descriptions at Phase 3+) adds flavor but doesn't change the mechanical experience of "solve 5 puzzles this week."

---

## SECTION 4: PRODUCTION QUALITY & TECHNICAL ASSESSMENT

**Rating: 8.5 / 10**

### Code Architecture

This is one of the most well-engineered React Native indie projects I've seen:

- **~17,000 lines of service code** across 25+ service files, cleanly separated by domain
- **~10,000 lines of tests** across 33 suites (948 tests) — exceptional coverage for an indie project
- **Custom hook extraction** (usePuzzleGame, useGamePersistence, useVictoryFlow, useVictoryOrchestration, useDialogueFlow, useUnlockFlow, useOnboardingFlow, useDreadEffects, useSpeedTimer, useAutosave, useAchievementQueue) — App.tsx is 1,547 lines, down from what must have been 3,000+
- **Centralized constants** (gameBalance.ts, timing.ts) — a single file to tune the entire economy
- **Schema versioning** with sequential migrations — production-ready persistence
- **Animation cleanup discipline** — every Animated.loop/sequence/parallel stores its return value and stops in useEffect cleanup. This level of memory leak prevention is rare in RN projects
- **Device tier detection** with adaptive particle counts, confetti limits, and animation complexity — shipping consideration for low-end Android

### Visual Polish

- The **PhaseTheme system** (6 complete visual themes with 17+ properties each) is thorough
- **Candy-style letter tiles** with 3D bevel, specular dot, bottom edge, phase-aware springs/wobble/trail glow — these look like they belong in a $10M production
- **Confetti, StarBurst, AnimatedBackground, PhaseTransitionOverlay** — the celebration and transition layer is rich
- **41MB of image assets** including all 10 character sprites (idle/talk/robed), 10 room backgrounds, 4 sky phases, 3 pit backgrounds
- **WCAG contrast audit** for Phases 3-5 — accessibility in dark themes is often neglected; not here

### Concerns

- **No audio.** The audio system is placeholder infrastructure with no actual sound files. For a game that relies heavily on *feel* and atmosphere, this is a critical gap. The Phase 3-4 experience in particular needs ambient sound to sell the dread. Haptics alone can't carry the atmospheric weight.
- **Expo Go dependency.** The game runs through Expo Go, which imposes limitations on native module access, app size, and update flexibility. For production, an Expo prebuild or bare workflow will likely be needed.
- **No crash reporting integration.** `errorReporting.ts` is infrastructure-only ("designed for easy integration with Sentry later"). For launch, this needs to be real.
- **Performance monitoring is in-memory only.** `performanceMonitor.ts` tracks FPS and render timing but doesn't persist or report it. For a game with 6 visual themes and adaptive animations, real-world performance data is essential.

---

## SECTION 5: MONETIZATION VIABILITY

**Rating: 6.0 / 10**

### What's Planned

The monetization plan is *ethically admirable* and *commercially risky*:

- **Patron's Key ($6.99 one-time)**: Ad-free + exclusive tile theme + amber drip (+2/puzzle) + extended undo + cloud save. This is a clean premium upgrade.
- **Rewarded video ads**: Post-victory bonus amber (3/day), cooldown skip (2/day), quest bonus (4/week), hint recovery (1/puzzle). Reasonable caps.
- **Interstitial ads**: Every 3rd puzzle (Phase 0-2), every 5th (Phase 3+). Exempt during onboarding, phase transitions, high ritual energy, near phase boundaries. Thoughtful exemptions.
- **Cosmetic shop**: Tile themes ($1.99-2.99), room accents ($0.99-1.99), confetti effects ($0.99), animal accessories ($0.99-1.49). All purely visual.
- **Content passes**: Monthly ($1.99) and quarterly ($4.99) with curated puzzles, cosmetics, and bonus quests.

### What's Right

- **No energy/lives system** — always playable. Correct decision for retention.
- **No loot boxes** — all purchases deterministic. Correct for the target audience.
- **No pay-to-skip-phases** — the narrative is the product. Correct creative decision.
- **No amber bundles for cash** — prevents the house-by-puzzle-42 problem. Smart.
- **Phase-aware monetization tone** — the shop feels "tired" at later phases via visual desaturation. Elegant.

### What's Risky

1. **No implemented monetization.** None of the above is actually built. The plan exists in CLAUDE.md and a monetization plan doc, but there is zero monetization code in the codebase. No IAP integration, no ad SDK, no shop UI, no cosmetic system, no content pass infrastructure. This is a significant gap between vision and reality.

2. **The $6.99 Patron's Key is the primary revenue driver, and it's a one-time purchase.** This means revenue per user is capped at ~$7 for engaged players. The cosmetic shop and content passes add recurring revenue potential, but cosmetics in a word puzzle game have historically underperformed cosmetics in avatar-based or social games. Players don't have a strong identity attachment to letter tile skins.

3. **The explicit refusal to sell amber bundles removes the highest-ARPU monetization lever in mobile gaming.** This is an ethical choice but a commercial one. The game's economy is designed around organic amber generation — selling it would break pacing. But it also means whales have no way to spend significantly. Expected ARPU will be low.

4. **Ad revenue projections are modest.** Rewarded video + limited interstitials for a niche word puzzle audience will generate $0.02-0.08 per DAU. Without significant scale (500K+ DAU), ad revenue alone won't sustain development.

5. **The audience willing to pay for a word game AND engage with cosmic horror narrative is narrow.** This is the core market risk. Word game audiences skew older, female, casual. Horror audiences skew younger, male, core. The intersection is small. The game needs to be positioned carefully — "word game that becomes something more" rather than "horror word game."

### Revenue Projection (Conservative)

| Scenario | DAU | ARPU/mo | MRR |
|----------|-----|---------|-----|
| Indie baseline | 5K | $0.15 | $750 |
| Moderate success | 50K | $0.25 | $12,500 |
| Breakout | 200K | $0.40 | $80,000 |

These numbers assume the monetization plan is fully implemented. Without it, revenue is $0.

---

## SECTION 6: RETENTION & ENGAGEMENT MODELING

**Rating: 6.5 / 10**

### Retention Levers (Present)

- **Daily challenge** with streak tracking and milestone rewards — proven D7/D30 lever
- **Weekly quests** with Monday reset — weekly return cadence
- **Animal dialogue cooldowns** tied to puzzle completion — creates "play 2-5 more puzzles to hear more story" pull
- **House building** with visible progress — aspirational goal
- **Streak system** with grace period and freeze — loss aversion without punishment
- **Push notifications** with phase-aware messaging — re-engagement
- **Feature tooltips** post-onboarding — guided discovery

### Retention Risks

1. **The Phase 0-1 retention valley is the critical risk.** The game's unique value (the narrative horror arc) doesn't meaningfully surface until Phase 2 (75+ weighted puzzles, minimum 65 real puzzles). By standard mobile retention curves, 70-80% of players will churn before seeing Phase 1 content. The game must retain on puzzle quality alone for the first 20-65 puzzles.

2. **Session length may be too short.** A single puzzle takes 30-90 seconds. At 2-3 puzzles per session, that's 1-4.5 minutes. This is below the 5-10 minute target for ad-supported casual games. The animal dialogue and pit offering add time, but they're not available every session (cooldowns, batch accumulation).

3. **No social features.** No friends list, no leaderboards, no asynchronous competition, no guilds. The share feature exists but is one-directional. Social features are the #1 predictor of D30+ retention in casual games. The "Challenge a Friend" feature is listed in monetization but not implemented.

4. **The onboarding is thorough but long.** 11 steps across 3 screens (home → puzzle → pit → home) with Fox guiding throughout. This is good for comprehension but risks "tutorial fatigue" for experienced puzzle game players. The skip option exists, which helps.

5. **No content refresh cadence outside weekly quests and daily challenges.** The 6,000 pre-generated puzzles are a deep well, but without events, seasonal content, or community challenges, the game may feel static after the narrative arc completes.

---

## SECTION 7: COMPETITIVE POSITIONING

**Rating: 7.0 / 10**

### Market Context

The word puzzle market (2024-2026) is dominated by:
- **Wordle** (NYT) — daily ritual, massive casual audience, no monetization pressure
- **Words With Friends 2** (Zynga) — social PvP, mature audience
- **Wordscapes** (PeopleFun) — crossword-hybrid, heavy ad monetization
- **Spell Tower** — spatial word-building with physics
- **Knotwords** — logic-constrained word puzzles, premium ($5)

### Where WordShift Fits

WordShift doesn't compete directly with any of these. Its closest comp is **Knotwords** (premium word puzzle with smart design) crossed with **Inscryption** (card game with a horror metagame that transforms the experience). This is a genuinely differentiated position, but it means:

- **No direct playbook** for user acquisition messaging. "It's a word game that's secretly cosmic horror" is a difficult ad creative to produce without spoiling the experience.
- **Organic/word-of-mouth dependent.** The game's value proposition is experiential — you have to play 50+ puzzles to understand why it's special. This is extremely hard to convey in a 15-second video ad. The game is more likely to succeed through content creator coverage, Reddit/TikTok organic sharing, and editorial features than through paid UA.
- **The "moment of realization" is the viral hook.** When a player first notices the animals are talking differently, or the victory text says "WHY DOES IT MATTER?" — that's a shareable moment. The share system should capture these moments more explicitly.

### Differentiation Strengths
- No other word game has a 6-phase narrative horror arc with 760+ hand-written dialogues
- No other word game transforms its entire visual/haptic/textual presentation across the play experience
- The incantation system (puzzles-as-ritual) is genuinely novel
- The animal cult with per-creature awareness tiers is sophisticated interactive fiction

---

## SECTION 8: ONBOARDING & FIRST-TIME USER EXPERIENCE

**Rating: 7.8 / 10**

The 11-step Fox-guided onboarding is well-designed:
- Uses the real game screens (not a separate tutorial mode) — players learn the actual UI
- Fox (Ember) as guide creates immediate character attachment
- The pit introduction teaches the deferred economy early
- Narrative seeds are planted: "We've been waiting for someone like you" is innocent now, sinister later

**Concerns:**
- 3 curated early puzzles is thin. Recommend 5-7 to ensure the first full session (15-20 minutes) is entirely hand-crafted
- The guided tutorial (`isGuided` highlighting on tiles) may over-constrain — players learn to follow highlights rather than evaluate previews
- No "aha moment" engineering in the first session. The first session should produce at least one moment of delight or surprise that makes the player tell someone about the game. Currently, the first session is competent but not memorable

---

## SECTION 9: RISK REGISTER

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Players churn before narrative payoff | CRITICAL | HIGH | Accelerate early phase pacing; add more micro-beats; consider Phase 1 starting at puzzle 15 instead of 25 |
| Zero monetization implemented | HIGH | CERTAIN | Prioritize Patron's Key + rewarded ads before launch |
| No audio/music | HIGH | CERTAIN | Commission ambient tracks for each phase; this is non-negotiable for the horror atmosphere |
| Narrow target audience intersection | MEDIUM | HIGH | Position as "word game with a secret" not "horror word game"; let the turn be a surprise |
| Session length too short for ad viability | MEDIUM | MEDIUM | Add between-puzzle screens (quest progress, animal teasers) to extend sessions |
| Phase 5 anticlimactic | MEDIUM | MEDIUM | Add mechanical changes in Phase 5: new word categories, different puzzle structures, or "reversed" animal guidance |
| No social/multiplayer features | MEDIUM | HIGH | Implement Challenge a Friend and async leaderboards before launch |
| Expo Go production limitations | LOW | HIGH | Plan Expo prebuild or EAS Build pipeline before store submission |

---

## SECTION 10: SCORING SUMMARY

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Core Loop | 20% | 8.0 | 1.60 |
| Narrative Design | 15% | 9.2 | 1.38 |
| Meta-Progression & Economy | 15% | 7.5 | 1.13 |
| Production Quality & Tech | 15% | 8.5 | 1.28 |
| Monetization Viability | 15% | 6.0 | 0.90 |
| Retention & Engagement | 10% | 6.5 | 0.65 |
| Competitive Positioning | 5% | 7.0 | 0.35 |
| FTUE & Onboarding | 5% | 7.8 | 0.39 |
| **TOTAL** | **100%** | | **7.68** |

---

## SECTION 11: STRATEGIC RECOMMENDATIONS

### Must-Do Before Launch (Priority 1)

1. **Implement core monetization.** At minimum: Patron's Key IAP, rewarded video ads, interstitial ads. No revenue = no sustainability. Budget 4-6 weeks.
2. **Commission audio.** 6 ambient tracks (one per phase) + puzzle interaction SFX + victory stings. The horror arc cannot land without sound. The existing `audio.ts` infrastructure is ready to receive assets.
3. **Compress early narrative pacing.** Move Phase 1 threshold from puzzle 25 to puzzle 15. Add 5-8 more narrative micro-beats in the puzzle 10-50 range. The retention valley is the existential threat.
4. **Expand curated early puzzles** from 3 to 7. The first session must be entirely hand-crafted.

### Should-Do Before Launch (Priority 2)

5. **Implement social sharing with narrative capture.** When victory text shifts to "WHY DOES IT MATTER?" — that's a shareable screenshot moment. Build share templates that capture these moments without spoiling the arc for new players.
6. **Add crash reporting** (Sentry or equivalent). Ship-blocking for any production app.
7. **Build the cosmetic shop UI** even with minimal inventory. 3-4 tile themes at launch establishes the pattern.
8. **Lower variant unlock thresholds.** Speed at 52 puzzles is too late. Consider: Reverse at 8, Speed at 20, Double Shift at 35.

### Consider Post-Launch (Priority 3)

9. **Seasonal events** tied to narrative phases — limited-time puzzle sets with exclusive dialogue
10. **Asynchronous competition** — same-puzzle daily leaderboards with phase-appropriate framing
11. **Content creator kit** — spoiler-free + spoiler-full press materials; the narrative twist is the marketing hook but must be handled carefully
12. **Phase 5 mechanical evolution** — new puzzle types, reversed rules, or meta-puzzles that make the post-revelation experience mechanically distinct

---

## FINAL ASSESSMENT

WordShift is that rare indie project where the ambition matches the execution depth. The 6-phase narrative transformation, 760+ hand-written dialogues, phase-aware visual theming system, and incantation mechanics represent genuine creative vision backed by serious engineering (948 tests, 17K+ lines of service code, 6,000 pre-generated puzzles, comprehensive animation cleanup discipline).

The core risk is market fit: the game's defining feature takes 50-150 puzzles to fully surface, and the audience intersection of "word puzzle enthusiasts" and "cosmic horror appreciators" is narrow. The complete absence of implemented monetization is a practical blocker that must be resolved before any launch conversation.

If the team executes on audio, monetization, and early pacing compression, this game has genuine breakout potential through organic/editorial channels. The "moment of realization" — when a player first understands what the animals have been doing — is the kind of experience players tell their friends about. That word-of-mouth hook is more valuable than any paid UA campaign, but only if enough players survive the first 50 puzzles to find it.

**Recommendation: Conditional greenlight.** Address Priority 1 items. Re-assess in 6 weeks.

---

*Assessment prepared under the Meridian Game Evaluation Framework v4.2. All scores are relative to the casual mobile puzzle category at the current market date. Framework weights reflect category-appropriate emphasis (monetization weighted higher for F2P titles; narrative weighted higher for story-driven titles). This assessment reflects a single comprehensive codebase review and does not include live playtesting data, focus group feedback, or UA cost modeling.*
