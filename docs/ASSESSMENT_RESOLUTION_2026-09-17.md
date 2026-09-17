# Assessment resolution — September 17, 2026

Reviewed against `main` at `c9f5835010a415b1434ca573ec6fcc61cba5fe28`.
This records the follow-up implementation for [the September 16 assessment](ASSESSMENT_2026-09-16.md).

All 41 numbered findings describe a real underlying defect or avoidable performance cost. All are addressed in this change, together with the 11 additional actionable appendix items. This is a source and automated-validation result, not certification of a signed Android release.

## Qualifications to the assessment

- **B9:** the example at 87 solves after a phase-2 session ended at 85 still owes two puzzles of its four-puzzle cooldown. The cold-mirror bug is real; the regression uses a fully elapsed cooldown.
- **B16:** the report overstates permanent inability to re-earn choice answers after New Cycle. The existing reset already cleared dialogue choices. The archive eviction itself is real and is fixed.
- **B21:** date seed collapse is real. Precise annual counts of distinct quest sets depend on templates and gates, so those headline set counts should not be treated as exact.
- **P1:** returning early on the current `pendingChanges` flag would skip legitimate backups: many non-victory writes never set it, and its initial value does not establish that a save was uploaded. The implementation batches the expensive reads and retains a consistent snapshot; it does not install that unsafe shortcut.
- Performance fixes remove demonstrated work. Their precise frame-rate, latency and memory improvements still require device measurement. The report's severity rankings and estimates are judgments rather than reproduced native benchmarks.
- Appendix input 50 remains excluded as the original assessment explained: no lost content was demonstrated.

## Resolution map

| ID | Implemented result |
|---|---|
| B1 | Pit ceremonies release their busy fence on every outcome and can run again on the same mount. |
| B2 | Every notification uses the typed date trigger; scheduling errors are reported and mocks enforce the SDK contract. |
| B3 | A keyed alert host stays mounted during boot hydration, keeping save retry reachable. |
| B4 | Only an absent progress record creates defaults; failed reads and malformed records reject without overwriting progress. |
| B5 | Board scaling uses rendered fan widths, game-area insets, both double-shift stages and reverse ascent. Restored boards use immutable original word lengths. |
| B6 | Room, resident, reservation and speed-up purchases commit debit, ownership and ledger together. UI handlers retry safely and report failures. |
| B7 | Purchase deduplication uses store transaction identity/time and durable checkout receipt aliases, including late receipt IDs across restart. |
| B8 | Phase exposure and finale floors use solves since the current cycle began; lifetime statistics and retained house ownership remain intact. |
| B9 | Home warms dialogue sessions and the current puzzle/phase mirrors before calculating badges. |
| B10 | House ceremonies wait for all home modal owners; the timer rechecks ownership and the global scheduler suspends covered scenes. |
| B11 | One-time star/confetti receipts peek before queueing, acknowledge only when visible, and discard stale asynchronous queue results without consuming flags. |
| B12 | New Cycle clears both puzzle slots and clock records. Restored boards cannot replace the live narrative phase or re-enable Weave from a stale phase. |
| B13 | Achievements, daily login, first-daily hints, share bonuses and sacrifice commit rewards with receipts; retries cannot duplicate grants. |
| B14 | Echo delivery applies vocabulary fairness and skips the extra-row extension in Speed; normal fallback remains available. |
| B15 | Quest doubling awaits a transaction with a stable quest-period receipt and retains the earned reward through storage retry. |
| B16 | Finite archive content stays preserved; only unbounded phase-five whispers are capped. Altar milestones are keepsakes. |
| B17 | Resident dialogue exposes the spoken page text and announces completion without speaking every character. |
| B18 | An exit interstitial uses only an already loaded ad; it cannot wait for a preload then cover the next board. |
| B19 | The global overlay owner holds the Speed clock, composing with menu and background pauses. |
| B20 | Daily streak milestones retain a durable highest-paid checkpoint, including migration from legacy best streaks. |
| B21 | Quest selection uses an order-sensitive date hash while leaving the already saved current quest period intact. |
| B22 | Restore Purchases reports provider errors honestly and recognizes restored cosmetic ownership. |
| B23 | Restore/reset invalidation happens before queued writers resume; serialized rewarming restores hints, cosmetics and motion settings. |
| B24 | Home resets the Speed ladder together with the screen/game-state handoff, preserving the current board clock. |
| B25 | Android Back delegates to the presented ceremony for Skip confirmation and cancellation. |
| B26 | Play and victory-exit story preparation failures display a visible retry alert. |
| B27 | Daily and normal boards use separate save slots; daily victory clears its own slot and Next resumes the saved normal board. Daily load errors cannot overwrite it. |
| B28 | Failed background hint writes roll back only their own optimistic spend and preserve owned hints and later grants. |
| B29 | Backward local dates/months do not consume freezes, regress streaks, replace premium seasons or repeat stipends. |
| B30 | Streak, leaderboard trend and achievement status summaries explicitly participate in the accessibility tree. |
| B31 | Compact victory totals reflect the credited double bonus; Swift layout is captured for each result presentation. |
| B32 | Tending checks committed amber and preserves consistent display accounting when a purchase is refused. |
| P1 | Cloud snapshots use a native batched multiGet with staged transaction overlays and read-failure tracking. |
| P2 | Character ticks live in a small dialogue leaf; HouseWorld, dialogue derivations and relevant callbacks are memoized. |
| P3 | Puzzle and sibling hook actions/state retain stable identities; Row callbacks no longer invalidate memoization on unrelated renders. |
| P4 | Cold extension filtering yields in chunks, preserving cancellation and selection policy. |
| P5 | AnimatedBackground is memoized so unrelated App renders do not rebuild static washes and particles. |
| P6 | Unchanged board snapshots are skipped; per-second Speed persistence uses a small matching-board clock record and shares serialization with restore/reset. |
| P7 | Generator vocabularies initialize lazily when actually requested. |
| P8 | Insertion indexes are built from removal-side vocabulary edges; tests compare the full edge multiset to the previous brute-force implementation. |
| P9 | Pit particle layers own their state and animation interpolation graphs are reused. |

## Additional appendix items

| Input | Implemented result |
|---|---|
| 2 | Weave no longer overwrites the stored preferred variant. |
| 16 | The out-of-hints alert offers a clip only when ads are ready and below the cap; copy matches available actions. |
| 18 | Unconfigured ads do not request iOS tracking permission. |
| 23 | Phase-five dialogue badges use the same eligibility rules as delivery. |
| 28 | Android puzzle Back uses the shared Home handler and counts the home visit. |
| 30 | Reserved room speed-up state respects remaining phase/house readiness holds. |
| 43 | Revoked entitlement cosmetics stop rendering and ownership returns correctly after restoration. |
| 49 | Practice instructions use Android live regions and explicit iOS announcements without duplicate speech. |
| 51 | New Cycle clears tending state together with dialogue choices. |
| 58 | Pit devour trajectories derive the native loop position from elapsed animation time. |
| 61 | Unresumable journal scenes describe archived pages instead of promising a waiting conversation. |

## Validation

Fresh lockfile installation (`npm ci` with the checked-in npm configuration): passed.

- `npm run typecheck`: passed.
- `npm run lint -- --max-warnings 0`: passed.
- `npm test -- --no-coverage --ci --runInBand`: **219 suites / 5,136 tests passed**, exit 0.
- Reverse top-up composition regressions: **11 tests passed**.
- Story corpus: **1,742 unique regular lines**, no reported problems.
- Vocabulary and complete-route audits: passed; **4,372 eligible / 7,356 stored boards**, 30 bank families, no route violations.
- Daily leaderboard cohort: regenerated and verified as `daily_v2_9098291d6c7b4bf4`.
- Resolved production Expo configuration: passed (`WordShift`, `1.3.6-production`, expected ad/creator gates).
- Browser journeys: **all 39 passed** across the initial run and focused completion. The daily-resume test was updated for the separate daily slot and now also verifies that normal-board progress remains unchanged; its rerun passed. The new retained-pit navigation and boot-read retry regressions passed.
- `git diff --check`: passed.

Focused regressions include journal and apply failures, concurrent claims, store clock skew and module restart, corrupt save protection, separate daily saves, clock recovery, two ceremonies on a retained pit, and typed notification triggers.

Native acceptance still requires the owner's signed Android build: purchases/restore, scheduled notifications, hardware Back, TalkBack and device performance cannot be certified by browser/Jest tests. No native dependencies, store prices, ad test configuration, or version codes were changed by this fix pass.
