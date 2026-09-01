# Puzzle Bank Regeneration Plan (post dictionary-expansion)

**Status: EXECUTED 2026-07-23** — this plan was carried out as the **Post-Audit Depth Regeneration** (see CLAUDE.md's section of that name, which is authoritative for the shipped numbers). The prerequisite fixes landed first (D1–D4, plus A5–A8; of the B guards, B1/B2 shipped as CI guards in `bankDiversity.test.ts` and B3's dead-end ceiling + trap floors went into the gated acceptance bars — B4's extra branching measures were not built beyond the A2 distinct-outcome fix); the corpus was purged and re-sorted by true frequency (final dictionary: **22,749 words**); then **all 12 core banks were rebuilt** on the cleaned dictionary: standard EASY 453 / MEDIUM 338 / MEDIUM_PLUS 500 / HARD 457, reverse 500×4 (via the Phase-D gated reverse harness — the biggest quality win, as predicted), double-shift 494/495/496/491. The §8 decisions resolved toward executing standard + reverse + double, adopting the 3-tier playable-vocabulary policy and per-difficulty gated bars, and (separately, later) spending the 6–7L windfall on the EXPERT tier + Lexicon banks. **This document is now a historical record of the plan as proposed** — its "today"/"currently"/"not yet" claims below describe the pre-regeneration state and are preserved unchanged.
**Context:** the dictionary was expanded 11,404 → 22,868 words. The goal is to regenerate the puzzle banks so the game exploits the larger word-space for more *varied, less boring, more multi-route* puzzles across every mode.

This plan is grounded in a full re-evaluation of the four quality systems (anti-boring scoring, diversity guards, multi-route/branching, per-mode generation + toolkit). Every headline claim below was verified directly against the code and the shipped bank data.

---

## 0. TL;DR

Regenerating the banks against the bigger dictionary **as-is would mostly reproduce today's problems at larger scale.** Before any bank is regenerated, four verified defects must be fixed, because they each silently blunt the exact levers the regeneration depends on:

| # | Defect | Effect | Verified |
|---|--------|--------|----------|
| **D1** | Anti-boring removal penalties only apply to **move 0** of each chain (`scorePuzzleChain` passes the pre-receipt `node.word` with a post-receipt index) | Late-move S-pulls escape their −60 penalty and are even mis-rewarded +20 → banks are dominated by an "S-shuffle" template (S is ~22% of all moves in HARD; RESIGN/REIGN each recur in 12 boards) | ✅ reproduced on shipped chain `WIND→CARDS→POSTS` |
| **D2** | The expanded words were **appended**, not frequency-merged; the de-rarify scorer ranks words by array **index** | Every new word is ranked "rarest," so the generator *avoids* them — the expansion widens the *valid-neighbor graph* but barely widens the *featured vocabulary* | ✅ confirmed at `localGenerator.ts:616-628` |
| **D3** | `completePathCount` counts `(removeAt, insertAt)` **index pairs**, not distinct **word** outcomes | A source word with a repeated letter double-counts identical outcomes → "multi-route" boards with zero real choice pass the gate | ✅ confirmed at `puzzleBranching.ts:107-135` |
| **D4** | The doubling reintroduced **proper nouns + British spellings + junk** now formable in puzzles | TESLA, CONGO, KASHMIR, MACRON, TEXAS, PARIS, BIBLE; METRE, ARMOUR, COLOUR, HONOUR, LITRE, THEATRE, CENTRE, FIBRE; SLILY, SONSY, ZINCY… | ✅ all present in `dictionary.ts` today |

**D4 is a live content bug independent of regeneration** (these words can be formed right now) and should be fixed regardless.

The rest of this plan: what the expansion actually changed, the per-system verdicts, the fix + regeneration phases with concrete parameters, the guards to add, the test-recalibration checklist, feasibility/sequencing, and the open product decisions for you.

---

## 1. What the expansion actually changed

The generators draw vocabulary directly from `src/dictionary.ts` (via `wordLists.ts` → `ALL_UNIQUE_WORDS = DICTIONARY_WORDS`). There is **no separate offline word list to sync** — the expanded dictionary is already the generation source.

But the growth is very uneven by length, and each length drives different modes:

| Length | Old | New | Δ | Drives |
|---|---|---|---|---|
| 3L | 513 | 523 | **+2%** | shrink-transients inside 4-letter boards (the branching ceiling for EASY/MEDIUM) |
| 4L | 1,629 | 2,047 | **+26%** | EASY, MEDIUM chains |
| 5L | 2,565 | 4,671 | **+82%** | MEDIUM_PLUS, HARD, double-shift |
| 6L | 3,241 | 7,076 | +118% | only the Sunday daily today |
| 7L | 3,456 | 8,551 | +147% | essentially unused |

**Implications:**
- The regeneration pays off **most for HARD / MEDIUM_PLUS / double-shift** (5L pool +82%, and those are today's *smallest* standard banks at 310/344).
- **EASY/MEDIUM gain modestly** — the 4L pool grew +26% but the 3L transient pool that gates their branching is essentially flat (+2%).
- The huge **6–7L gains (15,627 words) are currently wasted** by the core game. Whether to use them is a product decision (see §8).
- Per **D2**, none of these new words are *featured* by the generator until the dictionary is re-sorted by true frequency (they're all ranked "rarest").

---

## 2. Per-system verdicts

### 2.1 Anti-boring detection & quality scoring — *architecture sound, enforcement broken*
- **D1 (the scoring bug)** disables the entire removal-side anti-boring apparatus on moves 2+. This is the single biggest reason the banks feel repetitive.
- **The quality score is discarded.** `generateGatedBank.test.ts` hard-codes `qualityScore: 50` on every stored puzzle, and nothing in `src/` ever reads `.qualityScore`. So the whole rich scorer collapses to a binary "≥45 accept" gate — which, per D1, is blind to late-move boredom.
- **No rule for gemination** (`POSE→POSSE`, `RAGED→RAGGED`, `CORAL→CORRAL`): 5–9% of moves, unpenalized.
- **No moved-letter variety rule** — only *position* variety is scored, so "S then S" is free.
- **Semantic-journey scoring is mostly inert** — `SEMANTIC_CLUSTERS` covers ~600 words against 22,868, so most boards have `semanticTags:[]` and the 20%+10% semantic weights rarely fire.
- **Measured monotony (parsed from the live banks):** S is the most-moved letter in every bank (19–22%, ~2× the runner-up); 30–45% of formed words end in S; hub words (RESIGN/REIGN/CURSED/CASTER/CATER/COAST) recur up to the exact word-cap. In HARD, ~1 in 3 boards moves the same letter twice.

### 2.2 Diversity guards — *the cap is the only lever that fires; the others are dead*
- **`BANK_WORD_CAP`** works (enforced at generation *and* verified by CI). But on the tightly-capped banks it has become the *binding* constraint that hub words pin to, not a safety valve.
- **The hub-word frequency penalty is effectively dead.** Its thresholds (10/18/30 appearances) predate the caps (3/7/10/12). On EASY (cap 3) and MEDIUM (cap 7) *no word can ever reach 10*, so the penalty never fires; on HARD it fires at most −4, dwarfed by the +40 phase-tier / +25 novelty / +24 branching bonuses.
- **`wordHistory` cooldowns are runtime-only** (25/60/150) and don't touch generation. Small banks (ReverseHard 182 / cap 16, ReverseMediumPlus 219 / cap 12) exhaust their non-cooldown pool and recycle stale words inside the felt-freshness window.
- **No structural-monotony guard at all** — nothing bounds starting-letter distribution, shift-position distribution, or moved-letter variety across a bank.
- **No cross-bank dedup** — the same chain/word family can appear in EASY and MEDIUM, or in standard-Hard and reverse-Hard.

### 2.3 Multi-route / branching — *well-built, but bars are calibrated to the thin dictionary*
- The analyzer is exact under the shipped rules; the memoized DFS is correct.
- **D3 (duplicate-letter inflation)** must be fixed first, or tightening bars just rewards duplicate-letter boards.
- **`completePathCount >= 2` is a near-vacuous floor** — and the bigger dictionary makes *more* boards trivially clear it, so the gate's rejection rate falls and it stops discriminating. It doesn't "spend" the new headroom.
- **`singleChoiceFraction <= 0.65/0.75` permits mostly-forced boards** — that's why even after the last gated rebuild the delivered forced-step share is still ~56.5% (MEDIUM) / ~69% (HARD).
- **No path-distinctness measure** — `completePathCount=2` can be two reconverging "diamond" paths that give the same experienced solve; nothing checks the routes reach *different* final words.
- **`trapStepFraction` (planning depth) is never a floor; `deadEndStateFraction` (frustration) is never a ceiling** — both are measured and thrown away at accept time.
- **On-device generation ships weaker boards than the bank gate accepts** — `pickMultiRouteCandidate` only *prefers* multi-route and falls back to the best single-route candidate; it never checks `singleChoiceFraction`.

### 2.4 Per-mode generation & the toolkit — *reverse is the weakest link; the toolkit is standard-only*
- **Reverse boards get ZERO branching and ZERO anti-boring analysis** (`relaxBoring:true` skips both blocks) — only solvability + reverse-flexibility. The reverse banks are the smallest, oldest, and lowest-quality-gated of any mode. Their small size is **throughput starvation, not dictionary starvation**, so the 2× dictionary (denser insertion/removal indices → higher sampling pass-rate) is a large lever to both grow and de-boring them.
- **Double-shift has no branching analyzer** — `analyzeStandardBranching` models standard single-letter rules and is semantically invalid for the two-letter/cumulative-lock double-shift tree. Its banks are healthy (large, diverse, separation-scored). A true multi-route gate for it is *new analyzer code*, not a config flip.
- **The gated toolkit is hard-wired standard-only** in all three pieces (`runGatedRegen.sh`, `generateGatedBank.test.ts`, `swapGatedBanks.mjs`).
- **The difficulty curve is weak in the middle** — the four tiers are really "4L, 4L, 5L, 5L," two pairs differing by a single axis each. The bigger dictionary makes *explicit* per-difficulty differentiation (via branching pressure, trap density, and word-rarity band) feasible for the first time.

---

## 3. The plan — phased

Fixes (Phase A) are prerequisites: they're testable in-session and several improve the *live* game immediately. Generation campaigns (Phases C–E) are long-running and checkpointed (see §6 feasibility).

### Phase A — Prerequisite fixes (code, in-session, fully unit-tested)
1. **A1 — Fix D1 (anti-boring bug).** In `scorePuzzleChain`, pass the real post-receipt source/target to `scoreMoveQuality` and compute `normalizedPos` from that word's length. Add a regression test on `WIND→CARDS→POSTS` asserting the move-2 S-pull now scores as a boring edge removal. *Effect: the entire removal-side anti-boring apparatus starts working on every move.*
2. **A2 — Fix D3 (path-count inflation).** In `analyzeStandardBranching`, dedupe choices by distinct `(remaining, nextTarget)` **word pair** rather than `(removeAt, insertAt)` index pair, so `completePathCount` / `singleChoiceFraction` / `trapStepFraction` reflect real outcomes. Add a `MOON`-style unit test. *Do this before A6/Phase C tightening.*
3. **A3 — Fix D4 (corpus hygiene).** Extend `scripts/tools/purgeProfanity.mjs`'s blocklist with the confirmed proper nouns, British spellings, and junk; run the purge over dictionary + all banks; re-run `vocabularyHygiene`/`bankSolvability`. *Ships a cleaner live game even before regeneration.*
4. **A4 — Fix D2 (re-sort the corpus).** Re-emit `dictionary.ts` in one true frequency ordering (merge the two blocks) so genuinely-common new words land in the mainstream `[10%,60%]` band and become *featured*. Verified safe: the only order-dependent consumer is the de-rarify scorer (`WORD_INDEX`); all other `WORDS_N` uses are order-independent validity sets. **This must precede all generation** or the new banks won't use the new vocabulary.
5. **A5 — Recalibrate the hub-word penalty to the caps** (`puzzleBank.ts`): make it proportional to `freq/cap` (e.g. ≥0.85·cap → −14, ≥0.6·cap → −9, ≥0.4·cap → −4) so it fires meaningfully on every bank instead of never. Alternatively delete it if the generation-time connectivity penalty (A6) subsumes it.
6. **A6 — Add the missing anti-boring rules** to `getBoringTransformPenalty` + `scorePuzzleChain`:
   - **Gemination penalty** (~−30) when an inserted letter is adjacent to its twin in the formed word.
   - **Chain-level moved-letter variety** penalty (any letter moved in ≥2 steps).
   - **Chain-level S caps** (reject ≥2 S-moves; reject >~25% S-moves; target formed-words-ending-in-S ≤~15%).
   - **Skeleton-reuse reject** — forbid two words in a chain that are the same letter-multiset ±1 (kills REIGN↔RESIGN, CURSE↔CURSED).
   - **Generation-time connectivity penalty** on the highest insertion/removal-degree hub words so the long tail surfaces instead of pinning the cap.
7. **A7 — Actually persist + use the quality score.** Store the real `scorePuzzleChain` result in `qualityScore` (not the hard-coded 50) and read it in `scorePuzzleForContext` as a ranking term, so within-bank selection prefers genuinely better boards. Optionally raise `MIN_ACCEPTABLE_SCORE` toward ~55–60.
8. **A8 — Close the on-device gap.** Make `pickMultiRouteCandidate` *reject* (not just deprefer) high-`singleChoiceFraction`/single-route candidates when a better one exists, and raise the `scorePuzzleChain` single-route penalty above −3, so speed/fallback boards aren't materially weaker than bank boards.

### Phase B — New guards (added to CI so the regeneration can't regress them)
- **B1 — Structural-monotony guard** in `bankDiversity.test.ts`: assert no single starting letter exceeds ~X% of a bank's chains, no single shift position exceeds ~Y%, and the moved-letter histogram isn't S-dominated beyond a cap.
- **B2 — Cross-bank overlap guard**: flag identical chains across banks and cap the fraction of a bank's `allWords` shared with sibling banks of the same difficulty family; seed each generator with sibling chains as an exclusion set.
- **B3 — Branching guardrails in the gate** (`generateGatedBank.test.ts`): `deadEndStateFraction <= 0.25` per board (frustration ceiling) and a **bank-level trap floor** (≥35–40% of MEDIUM_PLUS/HARD accepts have `trapStepFraction > 0`), enforced in the driver/swap guard.
- **B4 — New branching-quality measures**: distinct-outcome choice count (the A2 fix), **root branching factor** (distinct completing moves at the first decision), and **distinct reachable final-row words** (the real "meaningfully different routes" signal) — folded into `structuralBonus` so selection orders by *quality of choice*, not just count.

### Phase C — Regenerate the STANDARD banks (gated toolkit, tightened bars)
Use the existing checkpointed toolkit (`runGatedRegen.sh` → `generateGatedBank.test.ts` → `swapGatedBanks.mjs`) with the tightened, phase/difficulty-banded bars below. **Run a short `GATED_SMOKE_MS` pass first** to measure the real acceptance rate before committing floors.

Proposed acceptance bars (validate before pinning):

| Bank (rows) | Phase 0–2: singleChoiceFraction ≤ / minPaths | Phase 3–4: ≤ / minPaths |
|---|---|---|
| EASY (3) | 0.50 / ≥2 | 0.62 / ≥2 |
| MEDIUM (4) | 0.50 / **≥3** | 0.65 / ≥2 |
| MEDIUM_PLUS (4) | 0.55 / **≥3** | 0.68 / ≥2 |
| HARD (5) | 0.58 / ≥2 | 0.72 / ≥2 |

Plus per-board `deadEndStateFraction ≤ 0.25`, the bank-level trap floor (B3), the new anti-boring chain rules (A6), and **differentiate difficulty explicitly**: EASY loosest (mainstream band, no trap requirement); MEDIUM_PLUS require traps on a fraction of boards; HARD demand tighter single-choice + a rarer word band. `minPaths` stays ≥2 in the dread phases to avoid starving the marquee VOID/OMEN/TOMB supply.

### Phase D — Regenerate the REVERSE banks (biggest quality upside)
Fork the gated checkpoint/sidecar/swap harness for reverse (the machinery is generic). Keep the double solvability gate (`isReverseSolvable` + shipped-rules `isReverseChainSolvable`). Replace the standard branching gate — which is invalid for reverse — with:
- **`relaxBoring:false` for reverse quality scoring** so the (now-fixed, A1) anti-boring penalties actually apply, and
- a **reverse dead-end / flexibility floor** (bounded wander).
Target growth to ~400–500 each (the 2× dictionary supports it), fixing the ReverseHard-182/cap-16 staleness. Lower the reverse caps as the banks grow (e.g. RevHard 16 → 10–12).

### Phase E — Double-shift (optional vocab/size refresh only)
Regenerate for vocabulary refresh on the 2× dictionary if desired, keeping the existing letter-separation scoring and the `bankSolvability` CI guard. **Do NOT force multi-route via the standard analyzer** (semantically invalid). A true double-shift branching gate is a separate feature (`analyzeDoubleShiftBranching` on the `isDoubleShiftChainSolvable` traversal) — recommended *not* worth it for now given the banks are already large and separation-scored.

### Phase F — Recalibrate guards + verify green
After each regenerated bank: run `purgeProfanity.mjs`, then update the test floors (§5), then run the full suite. Ship a bank via `swapGatedBanks.mjs` only when it clears its threshold.

---

## 4. Sequencing (why this order)
1. **A2, A3, A4 before anything generates** — the metric fix (A2) and corpus re-sort/purge (A3/A4) change what the generator sees and scores. Generating first wastes the campaign.
2. **A1 before Phase C/D** — without it the tightened anti-boring rules are decorative on moves 2+.
3. **B-guards before generation** — so the campaigns are held to the new bars by CI, not by hand.
4. **Standard (C) → Reverse (D) → Double (E)** — standard has the working toolkit; reverse is the biggest quality win but needs the harness fork; double is optional.
5. **Recalibrate + verify (F) after each bank**, never in a batch at the end (a red `bankDiversity` blocks the whole suite).

---

## 5. Test-recalibration checklist (after regeneration)
- **`bankDiversity.test.ts`** — `cap` (= measured max), `minUnique`, `minPuzzles` (~10% under measured) for **every regenerated bank**. *Primary; fails loudly if skipped.*
- **`unbrokenWeaveBankEligibility.test.ts`** — `minEligible` per standard bank (currently 407/289/425/363 for EASY/MEDIUM/MEDIUM_PLUS/HARD; 420/350/280/195 were the pre-regeneration values). **Standard regen only.**
- **`puzzleExtension.test.ts`** — extendable-pool floors (currently 203/127/207/180; 190/140/130/110 were the pre-regeneration values) + the `.slice(0,30)` real-bank test. **Standard regen only.**
- **`bankSolvability.test.ts`** — must-pass (0 unsolvable / 0 inconclusive under shipped rules) for **all 30 shipped banks** (12 core + 3 EXPERT + 15 Lexicon; this plan said 12 because the EXPERT and Lexicon banks did not exist yet). *Run after `purgeProfanity.mjs`.* The non-negotiable gate, especially for reverse.
- **`puzzleBank.test.ts`** — existence checks; keep green.
- **`vocabularyHygiene` / `noEmDashes`** — after the corpus purge.
- Set every numeric floor **~10% under what the run measures**, never speculatively above it (over-eager floors starve the HARD/dread banks first).

---

## 6. Feasibility & where the work runs
- **Phases A, B, F are code + tests — fully doable in this environment**, in-session, and some (A3/A4/A1) improve the live game immediately.
- **Phases C–E are compute-heavy.** The gated toolkit runs ~9-minute bounded, plateau-aware, per-accept-checkpointed loops; a full multi-bank campaign is *hours* of DFS and stresses disk. That is best driven either (a) across multiple sessions via the resumable checkpoints, or (b) on your machine / a dedicated long run. The plan is structured so the *fixes and guards* land first and independently; the generation campaigns can then run incrementally and swap in bank-by-bank behind the CI guards.

---

## 7. Risk register
- **Starvation from over-tight bars** — mitigate with a `GATED_SMOKE_MS` measure-first pass and floors set under measured values.
- **Smaller banks** — tighter bars + tighter caps trade size for quality (as the last gated rebuild did); recycling already handles small banks, but watch the reverse floors.
- **Re-sort side effects (A4)** — verified only the de-rarify scorer depends on order; still, regenerate rather than trust old ranks, and keep the two-block→one-block merge in a single reviewable commit.
- **Dread-supply pressure** — the dread word set is a fixed ~615-word list unaffected by the expansion, so HARD/dread banks gain the *least* new featured vocabulary; keep their caps near current and push diversity via `minUnique`, not cap cuts.

---

## 8. Decisions (all resolved and shipped)

Every open question this plan posed has been answered by the work that followed, so the list is
kept only as a record of what was decided:

1. **Scope** — standard, reverse AND double-shift were all regenerated through the gated toolkit.
2. **The 6-7L windfall** — invested: it became the **EXPERT** tier (`puzzleBankExpert.ts` 230
   boards, `puzzleBankReverseExpert.ts` 200, `puzzleBankDoubleShiftExpert.ts` 263).
3. **Playable-vocabulary policy** — adopted as the 3-tier policy (full-dict validity, full-dict
   traversal, a per-difficulty featured-rank ceiling on displayed words) via `getFeaturedRank` in
   `localGenerator`.
4. **Difficulty differentiation** — adopted: per-difficulty gated bars (single-choice ceilings,
   dead-end fractions, bank-level trap floors).
5. **Double-shift** — refreshed via `scripts/generateGatedDoubleBank.test.ts` (banks 494/495/496/491).

Do not re-litigate these; the current state is documented in CLAUDE.md's Pre-Generated Puzzle
Banks section.

---

*Prepared from a four-system code audit; D1–D4 reproduced against live code and shipped bank data. Parameter tables are starting points to validate against a smoke run, not final pins.*
