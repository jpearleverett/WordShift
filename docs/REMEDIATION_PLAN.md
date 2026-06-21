# WordShift — Remediation Plan & Status

Tracking document for the cross-tier ship-readiness program. Derived from the
six-pillar readiness review (core loop, retention/meta, FTUE, narrative,
production polish, monetization). **Monetization decision: Full F2P** (IAP + ads +
shop + cloud backend), built in parallel with the retention/virality work.

Status legend: ✅ done · 🟡 in progress · ⏳ todo · 🔒 blocked on external
resource (account/SDK/backend/collector URL).

---

## Phase A — Quick wins & correctness (safe, independently shippable)

| # | Item | Status | Notes |
|---|------|--------|-------|
| A1 | `React.memo` on `LetterTile` | ✅ | Hot per-row component; shallow guard. |
| A2 | True "Reset Board" recovery | ✅ | `usePuzzleGame.resetCurrentPuzzle()` rebuilt from immutable `originalWord`; RESTART button rewired; perf counters preserved. |
| A3 | Challenge-mode dead-end fix | ✅ | Covered by A2 — RESTART now resets the board + refreshes undos instead of forcing a loss. |
| A4 | Recompress environment backgrounds | 🔒 | 27MB bundle, ~15MB uncompressed PNG skies. Needs an image tool (sharp/cwebp) added to `scripts/tools`. Convert full-bleed skies/pit to JPG/WebP (no transparency) → ~10MB saved. |
| A5 | Particle palette reacts to phase | ✅ | `AnimatedBackground` keeps stable motion, recolors on phase change. |
| A6 | Phase-transition cinematic prose | ✅ | Rewrote Phase 1–4 scenes, dropped emoji crutches. |
| A7 | FTUE trims + skips | ✅ | `pit_intro` 4→2 lines; skip enabled on `unlock_explained` + pit guide. |
| A8 | Pit soft-lock fallback | ✅ | Timeout safety net fires onboarding completion if no harvest batch exists. |
| A9 | Telemetry endpoint live | 🔒 | `telemetry.ts` `TELEMETRY_ENDPOINT` empty by design. Needs an HTTPS collector URL + privacy-policy update. Prereq for all data-driven tuning. |
| A10 | Remove fabricated community stats | ✅ | `getDailyCommunityStats` deleted (never rendered; store-policy risk). |
| A11 | Speed-timer app-state hardening | ✅ | Single ticking helper; pause only on true `background`; expired-while-suspended handled. |
| A12 | slotEstimation geometry drift | ✅ | Centralized into `constants/tileLayout.ts` (single source of truth); drift now structurally impossible. |
| A13 | Document `ritualEnergy` accel | ✅ | Documented the second accelerator; magnitude to be retuned in B1d with data. |
| A14 | Speed-variant pre-generated bank | ⏳ | Speed generates on-device every run (slow first puzzle under a clock). Add a generator + bank like the other variants. Larger task. |

---

## Phase A′ — Ship-blocker hardening (audit follow-up; all code, no external deps)

Fixes from the second full-codebase readiness audit. All landed with the suite
green (1077/1077), typecheck + lint clean.

| # | Item | Status | Notes |
|---|------|--------|-------|
| A′1 | **FTUE resume soft-lock** | ✅ | Killing the app during the puzzle/transition onboarding beats (`going_to_puzzle`/`puzzle_tutorial`/`puzzle_complete`/`returning_home`) relaunched to a **dead home screen** (no Fox guide, no Play button) — an unrecoverable first-session brick in the highest-churn window. `useOnboardingFlow` now `normalizeResumeStep`s transient/puzzle steps to a stable target on resume; `App.tsx` resume effect routes the puzzle step back to a freshly-initialized guided tutorial. |
| A′2 | **ErrorBoundary coverage** | ✅ | Only `home`/`puzzle` were wrapped; a render error on settings/stats/ledger/gallery/pit crashed the whole app. Added a catch-all `ErrorBoundary` around `renderScreen()` (returns the player home). |
| A′3 | **Perpetual rAF loop** | ✅ | `startFrameMonitoring()` ran forever in production with its samples never consumed (telemetry off) — pure battery/CPU cost. Now gated behind `__DEV__` and stopped on unmount. |
| A′4 | **`startNewGame` concurrency guard** | ✅ | Long async generation (bank lookup + up to 30s reverse) had no in-flight guard; rapid Play/Next-Level taps or a mid-generation variant switch could clobber a started board. Added a monotonic `generationIdRef`; every `initGame` commit aborts if superseded. |
| A′5 | **Drag near-miss forgiveness** | ✅ | Off-target drag drops failed instead of snapping. Now routes through `findClosestValidSlot`, bounded to ±1 slot, so a one-slot finger miss lands on the obviously-intended valid slot without ever teleporting across the row. |
| A′6 | **Puzzle-screen onboarding skip** | ✅ | The skip handler existed but had no button on the puzzle-screen FoxGuide; added `showSkip`/`onSkip`. |
| A′7 | **DifficultyMenu a11y** | ✅ | Variant/difficulty/challenge buttons on the setup screen now carry `accessibilityRole`/`accessibilityState`/`accessibilityLabel`. |
| A′8 | **Phase 5 victory register** | ✅ | `getRitualEchoHeader/Footer`, `getWordsOfferedText`, `getIncantationName` collapsed Phase 5 into Phase 4's "offering" dread; Phase 5 now has its own serene "weave/pattern continues" voice in the high-traffic victory modal (+ regression tests). |
| A′9 | **`checkFreeStreakFreeze` date helper** | ✅ | The one day-bucketing path that bypassed `dateUtils` (`new Date(string)` → UTC) now routes through `daysAgoLocal`. |
| A′10 | Phase 5 dialogue "always new" badge | ⏳ (deliberately deferred) | The home-screen "new dialogue" badge stays lit forever at Phase 5 and lines loop verbatim. The fix is entangled with the cumulative dialogue-index space and overlaps the deferred endgame loop (`ENDGAME_LOOP_DESIGN.md`); left for the dedicated endgame-loop pass to avoid a risky one-shot change to a fully-tested core system. |
| A′11 | Remote crash visibility (Sentry) | 🔒 | The global error pipeline is real but lands in a local 500-entry buffer; no Sentry, telemetry off → launching blind to crashes. Needs a collector URL (A9) or a Sentry account. |

---

## Phase B — Retention & addictiveness (highest leverage)

| # | Item | Status | Notes |
|---|------|--------|-------|
| B1a | Cosmetic Shop (amber sink) | ✅ (amber path) | `components/shop/ShopScreen.tsx` ships: buy & equip **tile themes** with amber (Ember-warm/Deep-tide/Bone-quiet — doubling as the Tending shrine motifs — + Patron-entitlement gold). Equipped theme resolved in `theme/colors.ts` `getTileColor()` (registration pattern, phase-aware), reached from the Journal hub. Real-money IAP cosmetic items + confetti/room-accent tabs deferred to C5 (need the dev-client + SDK). A real expression amber sink today; the C5 monetization layer drops on top of the same catalog. |
| B1b | Amber Altar / escalating sink (Phase 5) | ✅ | **The Tending Shrine** shipped (`tending.ts` + pit modal): soft-infinite, cosmetic-only, escalating amber sink with a daily-discount return hook + serene milestone ceremonies. Also fixes the verbatim Phase-5 dialogue loop (recency-shuffled selection, honest `hasNewDialogue`, ~50 milestone-gated new lines) and adds a `tend_amber` quest + `MILESTONE_BONUSES` tail. Deferred: richer TL-tied *visual* deepening + cosmetic-shop motifs (gated on B1a) + Option B endless ladder. See `docs/ENDGAME_LOOP_DESIGN.md`. |
| B1c | Animal gifts | ⏳ | Spend amber to unlock bonus dialogue/whispers (surfaces the never-seen Phase 0–1 surplus content). |
| B1d | Economy rebalance | ⏳ | **The #1 retention fix.** House completes ~puzzle 130; Phase 3 min is 135, Phase 4 is 225 → ~95-puzzle "sink desert." Add the B1a–c sinks to span 130→225, retune sources, pin with guard tests vs `gameBalance.ts`. |
| B2a | Shareable result image | ✅ (scaffolded, Expo-Go-safe) | Built the visual `ShareCard` + a `ShareResultModal` preview (victory Share → card preview → share). Image capture lives behind a pluggable provider (`shareImage.ts`): with `react-native-view-shot` present it shares a PNG; in Expo Go it gracefully falls back to the existing emoji-grid TEXT share (and the card is visible to screenshot). Flip on real capture: `npm i react-native-view-shot expo-sharing` + dev client → `initShareImage()` auto-registers. Also **fixed a daily-share spoiler leak** (the word chain/incantation were shared for daily puzzles; now grid-only for daily). |
| B2b | Daily-result share prompt | 🟡 | The Daily VictoryModal already routes its Share through the new card preview; a *proactive* "share your streak" nudge on daily completion is still a small follow-up. |
| B2c | Leaderboard / friend loop | 🔒 | Backend leaderboard depends on C2 cloud infra; start with async deep-link compare. |
| B3a | Daily login reward | ✅ | `dailyLoginReward.ts` — 7-day escalating cycle (10/15/20/25/30/40/75, Day-7 jackpot), wraps weekly, resets on a missed day. Wired into App launch; 9 tests. |
| B3b | Unify the two streak systems | ⏳ | Collapse play-streak + daily-challenge-streak into one model/UI (keep `dateUtils` local-day discipline). Risky refactor of tested code — left for a dedicated pass. |
| B3c | Daily-reminder reliability | ✅ | Always-repeating trigger; no longer lapses when the player doesn't relaunch. |

---

## Phase C — Full F2P monetization stack

| # | Item | Status | Notes |
|---|------|--------|-------|
| C1 | Analytics + entitlement store | 🔒/⏳ | `entitlements.ts` (owned products/premium flags) is pure code; monetization funnels depend on A9 collector. |
| C2 | Cloud backend (replace `NoOpProvider`) | 🔒 | Longest blocker. Real `CloudProvider` (RevenueCat entitlements + Firebase/Supabase save blobs) against the existing `setCloudProvider()` swap point. Gates the Patron's Key cloud promise + B2c. |
| C3 | IAP integration | 🔒 | RevenueCat (`react-native-purchases`) — no IAP SDK installed. + restore-purchases in Settings. Needs store products + accounts. |
| C4 | Patron's Key — build/rescope 4 missing benefits | ⏳/🔒 | Cloud save (C2), +2 amber/puzzle (S, code), exclusive tile theme (C5), remove-ads (C6), extended undo (S, code). **Do not sell until all exist.** |
| C5 | Cosmetic Shop monetization layer | ⏳ | Real-money path on top of B1a. Keep the plan's hard "never" list intact. |
| C6 | Ad mediation | 🔒 | AdMob/AppLovin. Rewarded + interstitial w/ the plan's caps & exemptions; ATT gated behind first ad exposure. Needs ad-network accounts. |
| C7 | Content Pass subscription | 🔒 | RevenueCat subscriptions + entitlement gating. |
| C8 | Store & legal | 🔒 | Privacy/terms updates for ads/IAP/ATT/analytics; data-safety forms; price localization. |

---

## Phase D — Hardening & soft launch

| # | Item | Status | Notes |
|---|------|--------|-------|
| D1 | Funnels + dashboard | 🔒 | Depends on A9. |
| D2 | Soft launch 1–2 markets | 🔒 | Tune B1d economy + C6 ad frequency on live data. |
| D3 | Purchase/restore/cloud-conflict QA | 🔒 | After C2/C3. |

---

## Critical path
Cloud backend (C2) → IAP/entitlements (C3) → Patron's Key + Ads (C4/C6) →
Store/legal (C8). Phase A + B (esp. **B1d economy** and **B2 virality**) convert
"very engaging" → "addictive" and are shippable as a free update before the
monetization stack lands.

## What's blocked on you (external resources)
- An HTTPS **telemetry/analytics collector URL** (A9, unblocks D1/C1 funnels).
- **RevenueCat + AdMob/AppLovin accounts** and store IAP product definitions (C3/C6/C7).
- A **cloud backend** (Firebase/Supabase/custom) to replace `NoOpProvider` (C2).
- An **image-compression tool** decision for A4 (or I can add `sharp` to devDeps).
