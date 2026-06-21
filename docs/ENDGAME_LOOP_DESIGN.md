# WordShift — Endgame Loop Design: Fixing the Phase-5 Dead-End

**Status:** ✅ **IMPLEMENTED (v1)** — the recommended design (Option A "The Tending Shrine" + Option C's quest/milestone cadence) shipped. This document is retained as the design rationale; see the "Implementation (shipped)" note below for what landed vs. what's still deferred.
**Author:** Game design (F2P retention / endgame loops)
**Scope:** Post-revelation (Phase 5) repeatable loop + amber sink + dialogue refresh
**Constraint:** Free-to-play. Expression/convenience monetization only. **Never** pay-to-skip-narrative. Phase 5 stays serene/resigned, never more dread. Never reveal the phase system or break the fourth wall.

> ## Implementation (shipped)
> **The Tending Shrine is live.** A Phase-5-only, soft-infinite, cosmetic amber sink in the Offering Pit (✴ header button → modal). The player spends amber to "deepen the pattern," advancing a Tending Level on the documented escalating cost curve (`getTendingCost`, capped 5,000) with a once-per-local-day discount. Milestones (5/10/25/50/100) fire a serene ceremony.
> - **Service:** `src/services/tending.ts` (state, cost curve, daily bonus, milestones, per-animal `caughtUp` pointer, pure `selectPhase5Dialogue`). Balance in `gameBalance.ts` (`TENDING_*`).
> - **Dialogue refresh (Section 3, shipped):** `useDialogueFlow` Phase-5 branch now uses a shared pool (`dialogue/phase5Pool.ts`) = 10 base post-rev lines + choice callback + unlocked Tending milestone lines. Genuinely-new lines deliver in order; once caught up, re-reads come in a deterministic **shuffled** order (no verbatim looping). `hasNewDialogue` is **honest** now (in both `useDialogueFlow` and `getAnimalsWithStatus`): lit only while undelivered lines remain, re-lit when a milestone unlocks one.
> - **~50 new milestone lines** (`dialogue/animalDialogueTending.ts`, 5/animal), recorded to the Whisper Gallery as collectibles.
> - **Cadence (Section 4/Option C, shipped):** a `tend_amber` quest type (Phase-5-gated, deliberately net-negative) + extended `MILESTONE_BONUSES` tail past 350.
> - **Hygiene:** `wordshift_tending` in `cloudSave.SYNC_KEYS`; `clearTendingState` in Settings → Reset All; full `tending.test.ts` (cost curve, daily bonus, milestones, caughtUp, the pure selector) + quest gating tests.
> - **Deferred (per the doc's own sequencing):** the richer *visual* "deepening" (intensified sigils/embers tied to TL — v1 ships a Depth readout + serene ceremony, not new art), the cosmetic-shop **monetization** motifs (Section 5, gated on the unbuilt shop), and **Option B** (the endless-descent ladder, an explicit fast-follow).

---

## 1. The Problem (with file/line evidence)

After house completion (all 10 rooms + 10 animals, ~puzzle 130) and the final-puzzle event, the game enters Phase 5 ("terrible peace"). A long-term (D30+) player who keeps playing hits a **simultaneous narrative and economic dead-end**.

### 1a. Dialogue loops verbatim, forever

In `src/hooks/useDialogueFlow.ts`, `getDialogueText()` (lines 227–248) handles `animalPhase === 5`:

```ts
const prCount = getPostRevelationDialogueCount(selectedAnimal.type);   // = 10
const cycleLen = prCount + (choiceCallback ? 1 : 0);                    // 10 or 11
const rawIndex = selectedAnimal.currentDialogueIndex - totalRegular;
const postRevIndex = ((rawIndex % cycleLen) + cycleLen) % cycleLen;    // pure modulo cycle
...
return postRevDialogue || 'The pattern holds.';                         // hardcoded fallback
```

- Each animal has exactly **10** post-revelation lines (`POST_REVELATION_DIALOGUES` in `src/services/dialogue/animalDialogueIntro.ts:121–242`), plus one optional Phase-3 choice callback. That is 10–11 unique lines per animal, then a pure modulo repeat — **identical text in the same order, indefinitely.**
- `computeHasMore()` returns `true` unconditionally at Phase 5 (`useDialogueFlow.ts:275`), and `recomputeHasNewDialogue()` returns `true` unconditionally at Phase 5 (`useDialogueFlow.ts:526`). So `canTalk`/`hasNewDialogue` **stays true permanently** — the "new dialogue" affordance never goes dark, training the player to tap animals and receive lines they have already read.
- The only thing gating frequency is the session cooldown in `dialogueSession.ts`; there is no novelty gate. The fallback string `'The pattern holds.'` is the literal terminal experience if anything goes out of range.

**Net:** a D30+ player taps an animal expecting new content and re-reads the same serene line they saw on D14. The single most narrative-invested cohort gets the most repetitive experience.

### 1b. No repeatable amber sink remains

Every amber sink is one-time or grants nothing:

| Sink | File | Repeatable? | Total drain |
|---|---|---|---|
| House (rooms + animals) | `amberCurrency.ts` `unlockRoom`/`unlockAnimal` | One-time | ~2,715 amber, fully spent by ~puzzle 130 |
| Room upgrades (10) | `roomUpgrades.ts` `ROOM_UPGRADES` (75–150 each) | One-time | ~1,075 amber, Phase 2+ only |
| Streak freeze | `amberCurrency.ts` `purchaseStreakFreeze` (50) | Repeatable but **rarely needed** | Negligible for a daily player; a free one lands every 14 days (`checkFreeStreakFreeze`) |
| Sacrifice | `sacrifice.ts` `performSacrifice` | Repeatable but **grants nothing by design** | Pure destruction; no progression, no cosmetic, no collectible (lines 3–15) |

The cosmetic shop / animal gifts / amber altar named in `MONETIZATION_PLAN.md` **do not exist in code.** `sacrifice.ts` is the only repeatable sink and it is intentionally a void — great for the complicity theme, useless as a retention/economy mechanic because the player gets no artifact, no collection progress, no visible change beyond a one-shot toast.

### 1c. Earn rate keeps climbing while sinks are gone

Income at Phase 5 is substantial and never stops:

- Base puzzle: EASY 8 → HARD 20 (`gameBalance.ts:42–47`), ×1.5 for 3-star, ×up-to-2.0 streak, ×1.5 challenge.
- A typical engaged HARD/3-star/streak session nets **~45–60 amber per puzzle**.
- Daily challenge (always HARD), weekly quests (30–220 base, ×2.0 phase multiplier at Phase 4+, `getPhaseRewardMultiplier`), daily login cycle, streak milestones — all keep paying.
- **But:** `MILESTONE_BONUSES` stops at puzzle 350 (`gameBalance.ts:306`). Achievements (34, one-time) are exhausted. Quests **never gain Phase-5 variants** — `sacrifice_amber` quests even require `phase < 4` to be filtered *in*, but there is no Phase-5-specific content, and the quest pool is identical at Phase 5 as at Phase 4.

**Result:** a D30+ player earns ~50 amber/puzzle into a balance that does nothing, while re-reading 10 looping lines. This is acceptable for a finite premium title; for the studio's now-chosen F2P model it is a textbook LTV and D30-retention failure — there is no reason to return and nothing to spend on.

---

## 2. The Repeatable Post-Revelation Loop — Options Ranked

Design goals for any option:
1. **Serene, not dread.** Phase 5 is resignation and terrible peace. The loop must read as *tending* something, not fighting it.
2. **Repeatable amber sink** that scales with endgame income (Section 4).
3. **A reason to return tomorrow** (a daily/weekly beat), not just an infinite spend hole.
4. **Cosmetic / expressive, never progression.** No phase-skip, no power.
5. **Cheap on net-new writing** (Section 3 handles dialogue).

### Option A (RECOMMENDED) — "The Tending": an evolving Shrine/Altar that deepens the house

A new repeatable amber sink rendered as an **Arrangement Shrine** built into the existing Offering Pit / house. The player spends amber to "deepen the pattern," which advances a **Tending Level** (prestige-style, soft-infinite). Each level is a small, **cosmetic** deepening of the world the player already owns, plus a serene milestone line and a Whisper Gallery collectible. It reuses the pit ceremony framing, the ward-mark visual language, and the existing amber/transaction plumbing.

**Why recommended:**
- Reuses *existing* systems: the Offering Pit screen (`OfferingPitScreen.tsx`), ward-mark visuals, `spendAmber`/`recordTransaction`, room-echo/sigil cosmetic hooks already described in CLAUDE.md ("Arrangement Pattern" sigil lines, "Room Word Echoes"). The endgame cosmetics are *intensifications of art that already ships*, so artist cost is low.
- Tonally exact: "tending the shrine" is serene custodianship — the player keeps the fire lit because "stopping feels like forgetting" (Ember's actual Phase-5 line, `animalDialogueIntro.ts:128`). It re-skins the existing `sacrifice.ts` emotional beat ("You didn't have to. But you did.") but now the offering *leaves a mark*, which is what makes it a real sink.
- It is **soft-infinite**: an escalating cost curve absorbs arbitrary amber (Section 4) without ever promising more *story*. The narrative does not advance — only the depth of the existing tableau does. That respects "never pay-to-skip-narrative" because there is no narrative left to skip; there is only deepening.
- Gives a **daily reason to return**: a once-per-day "First Offering of the Day" Tending bonus (small, ~1 free deepening's worth of discount or a guaranteed collectible drop) and a rotating weekly endgame quest tier (Section 2, Option C folds in here).

### Option B — Endless / Ascending Offering runs ("The Long Arrangement")

A repeatable, escalating puzzle ladder: each completed puzzle raises an "ascension" counter that tightens constraints (longer words, fewer undos) and pays scaling amber, with a personal-best ("how deep into the pattern did you reach") tracked and shared. Essentially a roguelike-lite endgame mode reusing the puzzle generator and the existing Speed-Shift escalation ladder pattern (`speedRound`).

**Pros:** strong for skill-driven players; reuses generator + escalation code; naturally bounded sessions.
**Cons:** It is a *new game mode* (more engineering and balancing), and it is fundamentally an **earn** mechanic — it deepens the "earn amber with nowhere to spend it" problem unless paired with Option A's sink. It is also the *least* serene framing (a difficulty climb reads as striving, which fights Phase-5 tone). **Recommend shipping later, layered on top of A**, reframed as "descending deeper into the pattern" rather than a score chase.

### Option C — Phase-5 quest tier + rotating endgame challenges only

Add Phase-5 variants to `weeklyQuests.ts` (tending quests, daily-offering quests) and extend `MILESTONE_BONUSES` past 350.

**Pros:** tiny engineering; pure data.
**Cons:** Quests are an **earn** faucet, not a sink. Alone, it makes the economy problem *worse*. It is necessary plumbing for "a reason to return," but it is not sufficient. **Fold it into A** as the daily/weekly cadence that feeds the Shrine.

### Recommendation

Ship **Option A (The Tending Shrine)** as the core repeatable sink + cosmetic loop, with **Option C's** Phase-5 quest/milestone cadence as its daily/weekly heartbeat. Hold **Option B** as a fast-follow once A is live and the economy is observed.

---

## 2-detail. The Tending Shrine (recommended design)

### Loop
1. Player finishes puzzles, earns amber as today (no change to earn rules).
2. From the Offering Pit (already the home of ceremonies), a Phase-5-only **Tending** affordance appears: "Deepen the pattern."
3. Player spends amber to advance **Tending Level** (TL). Cost escalates (Section 4).
4. Each TL applies a **deterministic cosmetic deepening** of the existing world (intensified sigils, more room-word echoes, slower/heavier embers, an additional dim lantern in a room, etc.) and unlocks **one new serene Tending line** (Section 3) collected into the Whisper Gallery.
5. **Milestone TLs** (5/10/25/50/100…) trigger a brief, reused pit ward-ignition-style ceremony with a milestone line — the same ceremony grammar already used for phase transitions, so no new cinematic system is required.
6. A **once-per-local-day** "First Tending" gives a small bonus (e.g., the day's first deepening is discounted ~30%, or guarantees a collectible). This is the daily return hook.

### State (new service: `src/services/tending.ts`)
```ts
interface TendingState {
  level: number;              // soft-infinite Tending Level
  totalAmberTended: number;   // lifetime sink, for collection/stats
  lastTendDate: string | null;// local-day, gates the daily bonus (use dateUtils!)
  milestonesSeen: number[];   // milestone TLs that have fired their ceremony
}
```
- `getTendingCost(level)` — escalating curve (Section 4).
- `tend(amount)` — caller `spendAmber(cost, 'tending')` first (mirrors `roomUpgrades`/`sacrifice` convention: the service does NOT spend; `amberCurrency.spendAmber` does and records the transaction), then increments level, records the collectible, returns `{ newLevel, milestone?, dailyBonusApplied }`.
- `isTendingAvailable(phase)` → `phase >= 5` (mirror `isSacrificeAvailable`'s `phase >= 4` shape).
- Day bucketing **must** use `services/dateUtils.ts` (`getLocalDateString`), never `toISOString()` — per the project's hard rule.
- Add `clearTendingState()` and wire into Settings > Reset All, and add the storage key to `cloudSave.ts` `SYNC_KEYS`.

### Why this is a *sink* and not a faucet
Tending **only consumes** amber. Its outputs are cosmetic (world deepening) and collectible (Whisper lines) — expression, not power, not progression, not phase advancement. That is exactly the F2P-safe shape the studio mandated.

---

## 3. Breaking the Verbatim Dialogue Loop — without writing 1,000 lines

The fix is to make Phase-5 dialogue feel *alive* using **condition-driven selection + light procedural recombination + milestone-gated drops**, layered onto the existing `useDialogueFlow.ts` Phase-5 branch. No new 1,000-line corpus.

### 3a. Replace pure modulo with weighted, state-aware selection
Today (`useDialogueFlow.ts:239–247`) the index is `rawIndex % cycleLen` — deterministic, ordered, repetitive. Change the Phase-5 branch to select from the 10 lines using a **state-seeded, recency-weighted pick**:
- Track a per-animal "recently shown" ring (last 3–4 indices) in `lastDialogueRead`/a small new field, and pick from the *unshown* remainder first. This alone removes the "same line, same order" feeling for free — the same 10 lines now arrive shuffled and non-adjacent.
- Seed the pick with player state already in `progress` (e.g., `totalWordsFormed`, `currentStreak`, `puzzlesSolved`, `tendingLevel`) so the rotation differs per player and drifts over time.

This is a small change inside the existing `animalPhase === 5` block and reuses the `((x % n) + n) % n` safe-mod already present.

### 3b. Procedural recombination of the pre-dialogue layer (already built!)
`useDialogueFlow.ts` already assembles **pre-dialogue pages** (trigger-word reactions, cross-animal references, word-threshold lines, sacrifice reactions) ahead of the main line (lines 326–501). At Phase 5 most of these still fire:
- **Trigger-word reactions** (`getTriggerWordReaction`) still vary per puzzle the player just solved — keep them flowing at Phase 5 so every visit is contextualized by *today's* words. This makes the same core line land differently because it's prefaced by a fresh, puzzle-specific reaction.
- **Cross-animal references** scale to 0.60 chance at high phase (line 457–460) — keep them; with 10 animals unlocked the combinatorial surface is large and already written.
- Net effect: the *page sequence* a player sees each visit is a fresh recombination of existing content, even though the terminal Phase-5 line is from the fixed 10.

### 3c. Milestone-gated new line drops (tie to the Tending loop)
This is the cheap, high-impact narrative-progression-substitute. Author a **small** set (~3–5 per animal = 30–50 lines total, vs 10×10=100 if done per-animal-per-tier) of "deeper tending" lines that **unlock as the Tending Level crosses milestones** (TL 5/10/25/50…). Gate them in the Phase-5 branch:
- When `tendingLevel >= milestone`, expand the animal's Phase-5 pool with that milestone's line(s).
- Each drop is recorded in the Whisper Gallery (collectible payoff) and surfaced with a `hasNewDialogue` flag that **actually goes true only when there is genuinely new content** (see 3d).

This gives D30+ players a *steady trickle of genuinely new serene dialogue* tied directly to the amber sink — without a thousand-line script. ~40 new lines, deterministically gated, feels like an ongoing slow revelation.

### 3d. Make `hasNewDialogue` honest at Phase 5
Currently `recomputeHasNewDialogue` and `computeHasMore` hardcode `true` at Phase 5 (`useDialogueFlow.ts:275, 526`). Change them to return `true` **only** when:
- the player has unshown lines in the recency ring (3a), OR
- a Tending-milestone drop (3c) is newly available and uncollected.

Otherwise return `false`, so the "new dialogue" dot goes dark once a player has truly seen everything currently available — and lights up again when they tend to the next milestone. This converts the dialogue system from "always lying about new content" to "a quiet collectible that refreshes when you deepen the pattern." Keep an occasional ambient re-show available on tap (the animal still *talks* if tapped) so it never feels locked — it just stops *claiming* novelty.

### Writing budget summary
- **0** rewrites of the existing 100 Phase-5 lines.
- **~30–50** new milestone-gated "deeper tending" lines total.
- Everything else is selection logic + reuse of the already-built pre-dialogue recombination layer.

---

## 4. The Amber Sink — numbers that actually absorb endgame income

### Income reference (from real code)
- HARD base 20 (`AMBER_REWARDS`), 3-star ×1.5 = 30, streak up to ×2.0 = 60, challenge ×1.5 on top. Call a strong session **~50–60 amber/puzzle**.
- A D30+ daily player doing ~5 puzzles + daily challenge + claiming quests can clear **~300–500 amber/day**, sometimes more with weekly-quest claim spikes (a single weekly can pay 220 × 2.0 = 440).
- The sink must therefore absorb **on the order of hundreds of amber per active day** to keep the balance meaningful, while never *blocking* the player (it's optional, cosmetic).

### Tending cost curve (escalating, soft-infinite)
A gentle exponential keeps early Tending levels reachable (so the system feels generous immediately at Phase 5) while the curve quickly grows to soak large balances:

```
getTendingCost(level) = round( BASE * GROWTH^level / 10 ) * 10   // rounded to 10
BASE = 40, GROWTH = 1.12, hard cap per level e.g. 5,000
```

Approximate costs:

| Tending Level | Cost | Cumulative |
|---|---|---|
| 1 | 40 | 40 |
| 2 | 50 | 90 |
| 5 | 70 | ~290 |
| 10 | 120 | ~770 |
| 25 | 680 | ~5,400 |
| 50 | ~11,600 (capped 5,000) | ~tens of thousands |
| 100 | capped 5,000 | hundreds of thousands |

- **Early game-feel:** the first ~5 levels cost ~290 total — roughly one good day's earnings — so a newly-Phase-5 player gets immediate, satisfying deepening and learns the loop.
- **Mid:** by TL ~10–15 the per-level cost (~120–240) matches a few puzzles, so a daily player advances ~1–3 levels/day — a healthy, non-trivial sink.
- **Long tail:** the cap (5,000/level) means a whale-grinder still spends meaningfully forever; the curve never lets the balance run away. Tune `GROWTH`/`BASE`/cap against live data (the same caveat `amberCurrency.ts:924–934` makes about retuning with data, not blind).

### Daily/weekly cadence (Option C, folded in)
- **Extend `MILESTONE_BONUSES`** past 350 with a repeating tail (e.g., +50 every 50 puzzles) so the puzzle-count faucet doesn't dry up — but keep it modest so it doesn't outpace the sink.
- **Add Phase-5 quest templates** to `weeklyQuests.ts`: a new `tend_amber` quest type (mirror `sacrifice_amber`'s phase-gated shape, lines 30/127–128/199) — "Deepen the pattern by N amber," daily target ~100, weekly target ~500, rewards 20/90. These are deliberately *net-negative-or-neutral*: they reward less amber than they ask you to tend, so they pull amber *out* of the economy (a sink disguised as a quest) while giving a daily reason to engage the Shrine.
- **First Tending of the Day** bonus: ~30% discount on the day's first deepening, gated by `lastTendDate` (local-day via `dateUtils`). Cheap, sticky, daily.

### Sanity check
A daily player earning ~400/day and tending into the TL ~10–20 band (costs ~120–400/level) will spend roughly their whole daily income to advance ~1–3 levels, with a visible cosmetic deepening + (sometimes) a milestone line/collectible each session. Balance stays meaningful, the loop is daily, the sink scales with income.

---

## 5. F2P Monetization Tie-In (cosmetic/expression only)

The Tending Shrine creates clean, **non-progression** monetization surfaces consistent with `MONETIZATION_PLAN.md` ("players pay for *expression* and *convenience*, never *narrative progression*"):

- **Cosmetic Tending styles (Cosmetic Shop, real money or premium currency):** the *deepening* art comes in selectable motifs — e.g., "Ember-warm," "Deep-tide," "Bone-quiet" shrine/sigil palettes. Players buy how their endgame world *looks* as it deepens. Pure expression; the TL and amber sink are identical regardless of motif.
- **Patron's Key synergy (`$6.99`, already planned):** the existing "+2 amber/puzzle" perk now has a *purpose at endgame* (faster tending). The Key's "exclusive tile theme" pattern extends to an exclusive Tending motif. This makes the one-time IAP more attractive **without** selling progression — Key holders tend faster but reach the same (infinite, cosmetic-only) ceiling.
- **Convenience (rewarded video, opt-in, already planned):** a rewarded ad can grant a "tending boon" (small one-shot discount on the next deepening) — convenience, opt-in, no power. Fits the existing interstitial/rewarded framework.
- **Content Pass (monthly/quarterly, already planned):** curated *milestone Tending lines* (Section 3c) and seasonal shrine motifs can ship through the pass as **expression/collection**, never as required story. A non-paying player still gets the base ~40 milestone lines; the pass adds cosmetic flavor and extra collectibles.
- **What we explicitly do NOT do:** no amber bundles that trivialize the sink, no paid TL skips, no paywalled dialogue that is *narratively required* (the base post-revelation arc remains 100% free), no energy/lives. The Shrine sells *how deep looks*, not *how deep you're allowed to go*.

---

## 6. Implementation Breakdown (real file paths + effort)

### New files
- **`src/services/tending.ts`** (new) — Tending state, `getTendingCost`, `tend`, `isTendingAvailable(phase>=5)`, `getTendingStats`, daily-bonus gate via `dateUtils`, `clearTendingState`. Model on `sacrifice.ts` / `roomUpgrades.ts` (service does not spend; caller calls `amberCurrency.spendAmber`). **~0.75 day.**
- **`src/services/dialogue/animalDialogueTending.ts`** (new, or extend `animalDialogueIntro.ts`) — ~30–50 milestone-gated serene lines + `getTendingMilestoneLine(animalType, tendingLevel)`. **~1 day (mostly writing/tone, low code).**
- **`src/__tests__/tending.test.ts`** + dialogue gating tests. **~0.5 day.**

### Edits
- **`src/hooks/useDialogueFlow.ts`** — rework the `animalPhase === 5` branch in `getDialogueText` (recency-weighted selection 3a, milestone drops 3c); make `computeHasMore`/`recomputeHasNewDialogue` honest (3d). Keep the pre-dialogue recombination as-is. **~1 day.**
- **`src/components/OfferingPitScreen.tsx`** — add the Phase-5 Tending affordance (cost, "Deepen the pattern" button, milestone ceremony reusing existing ward-ignition visuals). Reuse, don't rebuild, the ceremony grammar. **~1.5 days.**
- **`src/services/phaseNarrative.ts`** — Phase-5 strings for the Tending button/labels/milestone copy (all player text routes through here, per conventions). **~0.5 day.**
- **`src/services/weeklyQuests.ts`** — add `tend_amber` quest type + Phase-5 templates (mirror `sacrifice_amber` gating). **~0.5 day.**
- **`src/constants/gameBalance.ts`** — `TENDING_BASE`/`TENDING_GROWTH`/`TENDING_COST_CAP`, daily-bonus %, and extend `MILESTONE_BONUSES` tail past 350. **~0.25 day.**
- **`src/services/cloudSave.ts`** — add the tending storage key to `SYNC_KEYS`. **`src/components/SettingsScreen.tsx`** (Reset All) — call `clearTendingState`. **~0.25 day.**
- **`src/services/whisperGallery.ts`** — no API change needed; record milestone lines via existing `recordWhisper` (`type: 'dialogue'`). Optionally add a Phase-5 gallery title. **~0.1 day.**

### Tests / housekeeping
- Phase-5 dialogue-selection tests (no verbatim adjacency; honest `hasNewDialogue`), tending cost-curve test, quest-gating test, `configValidation.ts` update if dialogue counts are pinned there. **~0.5 day.**

### Effort estimate
- **Core sink + honest dialogue + pit UI (ships the fix):** ~5–6 dev-days + ~1 writer-day.
- **Quests/milestone cadence + monetization cosmetic hooks (Option C + Section 5):** ~1.5 dev-days.
- **Total v1:** **~7–8 dev-days, ~1 writer-day.** Option B (endless ladder) is a separate fast-follow, est. ~5–7 days, not required for the fix.

### Sequencing
1. `tending.ts` + balance constants + tests (the sink exists, even headless).
2. Pit UI affordance + `phaseNarrative` strings (player can spend).
3. `useDialogueFlow` Phase-5 rework + milestone lines (dialogue stops looping, refreshes with the sink).
4. Quests/milestone tail + cosmetic monetization hooks (daily/weekly heartbeat + LTV surface).
5. Reset-All + cloud-save key + config validation (hygiene).

---

## Summary

The Phase-5 dead-end is real and dual: `useDialogueFlow.ts` cycles 10 lines/animal by pure modulo with a permanently-true "new dialogue" flag, and the only repeatable sink (`sacrifice.ts`) grants nothing while income keeps climbing. The recommended fix is **The Tending Shrine** — a serene, soft-infinite, cosmetic-only amber sink built into the existing Offering Pit, paired with (a) recency-weighted + recombined + milestone-gated Phase-5 dialogue that finally makes "new dialogue" honest and trickles ~40 genuinely-new lines tied to the sink, and (b) a Phase-5 quest/milestone cadence for a daily return reason. It reuses existing ceremony/cosmetic/economy plumbing, respects the serene tone and the no-pay-to-skip-narrative rule, and opens clean expression-only monetization (cosmetic shrine motifs, Patron's Key synergy, content-pass collectibles). Estimated ~7–8 dev-days + ~1 writer-day for v1.
