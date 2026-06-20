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

## Phase B — Retention & addictiveness (highest leverage)

| # | Item | Status | Notes |
|---|------|--------|-------|
| B1a | Cosmetic Shop (amber sink) | ⏳ | New `cosmeticsShop.ts` + modal: tile themes, room accents, confetti, accessories. Wire the stubbed `ShareableResult.shareFrame`. Doubles as the C5 monetization surface. |
| B1b | Amber Altar / escalating sink (Phase 4+) | ⏳ | Repeatable offering with cosmetic/prestige return — gives late-game amber somewhere to go. |
| B1c | Animal gifts | ⏳ | Spend amber to unlock bonus dialogue/whispers (surfaces the never-seen Phase 0–1 surplus content). |
| B1d | Economy rebalance | ⏳ | **The #1 retention fix.** House completes ~puzzle 130; Phase 3 min is 135, Phase 4 is 225 → ~95-puzzle "sink desert." Add the B1a–c sinks to span 130→225, retune sources, pin with guard tests vs `gameBalance.ts`. |
| B2a | Shareable result image | ⏳ | `react-native-view-shot` → native share sheet. The genre's #1 growth lever. |
| B2b | Daily-result share prompt | ⏳ | Surface on Daily completion + existing `maybeAwardDailyShareBonus`. |
| B2c | Leaderboard / friend loop | 🔒 | Backend leaderboard depends on C2 cloud infra; start with async deep-link compare. |
| B3a | Daily login reward | ⏳ | Escalating Day 1→7 chest that rewards *opening the app* (currently absent — streaks require solving). |
| B3b | Unify the two streak systems | ⏳ | Collapse play-streak + daily-challenge-streak into one model/UI (keep `dateUtils` local-day discipline). |
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
