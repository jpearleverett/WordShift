# WordShift — Ship-Readiness Assessment (current)

**Last updated:** 2026-06-20
**Method:** full-codebase audit (six parallel deep-dive streams: gameplay, FTUE, retention/economy, visual/UX, narrative, technical), claims verified against source — not docs. Scored against AARRR (Pirate Metrics) + Nir Eyal's Hook Model.

> **Forward work:** the prioritized cross-tier remediation roadmap (Phase A polish → B retention → C full-F2P monetization → D soft-launch), with per-item status and external-resource blockers, lives in [`REMEDIATION_PLAN.md`](./REMEDIATION_PLAN.md).

> This doc is the **current** state of the game. Earlier point-in-time audits and their remediation logs were removed because their scorecards/blocker lists described states that no longer exist and were actively misleading the next reader. See "History" at the bottom for what those passes resolved (so you don't re-chase already-fixed items).

---

## Verification baseline (run this session, fresh `npm ci`)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | **0 errors** |
| Lint | `npm run lint` | **0 errors / 288 warnings** (all stylistic: `array-type`, intentional `require()` lazy-loads) |
| Tests | `npm test -- --no-coverage` | **38/38 suites · 1056/1056 passing** |

**There are no code blockers to building and submitting the offline game.** Remaining work is strategic (monetization), backend (cloud save), team-owned (audio), or operational (store credentials, Pages hosting, on-device QA).

---

## Scorecard

| Dimension | Score | Notes |
|---|---|---|
| Core gameplay & mechanics | 92 | Loop, 3 variants, ~5,800 banked puzzles, graceful fallbacks. Chain Shift is design-only (not implemented). |
| Narrative & content | 88 | 670 base + 100 post-revelation dialogues; earned horror arc; correct unlock-gating. The product's moat. |
| Visual polish & "juice" | 88 | Native-driver discipline, complete assets, real phase theming across all screens. |
| Technical readiness | 88 | Green suite, error pipeline wired, lazy banks, correct manifests/bundle IDs. |
| FTUE / first session | 78 | 11-step resumable onboarding, no dead-ends. Minor: pit auto-offer cascade is passive. |
| Retention systems | 75 | Complete loops; mid-game valley improved this session (see Changes). Phase 5 endgame still static. |
| Acquisition / Referral | ~25 | Share system complete, but no leaderboards/social/friend loop — biggest growth lever unbuilt. |
| Monetization | N/A (0 built) | No IAP/ads SDK, no paywall. `MONETIZATION_PLAN.md` is plan-only. |

**Overall:** built like a premium / Apple-Arcade-quality narrative puzzle, not (yet) a top-grossing F2P. Positioning is a deliberate decision still to be made.

---

## What is actually wired (verified — do NOT assume these are missing)

- **Daily Challenge:** end-to-end. Card in HomeScreen header (gated, unlocks at 5 puzzles), `startDailyGame()` hook action, `isPlayingDaily` threaded through autosave/victory/modal, `recordDailyCompletion()` + streak-milestone amber/toast, `prewarmDailyPuzzle()` at launch, one-time Fox unlock intro.
- **Offering Pit (deferred amber):** auto-collects through 8 puzzles, then manual harvest; Fox `pit_harvest` intro fires at puzzle 8.
- **Share / referral:** complete Wordle-style emoji grid + word chain + daily date + `wordshift://` deep link + cosmetic frames + a +5 amber first-share-of-day bonus (`shareResults.ts`).
- **Notifications:** OS permission prompt is **contextual** (after the 3rd victory), never cold-launch. Daily reminder (always-repeating trigger, relaunch-independent) + streak-at-risk + re-engagement scheduled each session; phase-aware copy.
- **Daily login reward:** rewards opening the app (7-day escalating cycle, Day-7 jackpot, resets on a missed day) — `dailyLoginReward.ts`, claimed once per session at launch.
- **Bootstrap reliability:** `runMigrations()` awaited before `MainApp` mounts; `installGlobalErrorHandler()` at module load; `ErrorBoundary.componentDidCatch` forwards to `reportError()`.
- **Performance:** puzzle banks lazy-loaded via `require()` thunks; device-tier gating + frame monitoring present.
- **Room upgrades:** surfaced as a Phase 2+ mid-game amber sink in HomeScreen.
- **Legal:** `docs/privacy-policy.md` + `terms.md` with Jekyll permalinks; `src/constants/links.ts` URLs match; support mailto wired.
- **Assets:** real generated icon/splash/adaptive-icon/notification-icon; 14-sound placeholder WAV SFX pack (real audio in progress).
- **Telemetry:** disabled by default; enable by setting `app.json` `extra.telemetryEndpoint` (no code change). `reportError` already funnels async/render/global errors into the event log, so that one value yields both analytics and remote crash visibility.

---

## Changes made this session

**Mid-game retention — filled the Phase 1→3 investment valley** (`homeWorldData.ts`):
the house (primary mid-game investment object) finished building by ~puzzle 85 while the Phase 4 climax isn't until ~puzzle 225. Spread the six gated room-unlock `minPuzzles` gates `28/38/48/58/70/85 → 28/42/60/82/105/130` so house-building stretches across the whole pre-Phase-3 window; the final room now lands just before Phase 3. Costs unchanged (later gates strictly more affordable). Early hook unlocks (orders 1–7) untouched. Added two guard tests in `homeWorldData.test.ts` (gates strictly increasing; final gate ≥120 and < Phase 3 threshold).

> This is a balance change. The values are a defensible starting point but should be validated against soft-launch D1/D7 cohort data and A/B tuned.

---

## Remaining gaps (prioritized)

**Strategic (decide before launch):**
1. **Pick the monetization model** — premium/Arcade vs F2P. Nothing is built; revenue is $0 by construction. This gates whether WordShift can be "high earning." F2P route additionally needs the ads/IAP SDK, cosmetic-shop UI, and a real cloud backend.
2. **Add a referral/virality loop** — a spoiler-free shareable daily-result card and/or leaderboards. The share *text* already exists; the social pull does not. Highest-ROI growth lever for a word game (cf. Wordle).

**Retention:**
3. **Phase 5 endgame is mechanically static** — narratively complete, but no new goal after the climax (D30+ cliff). Recommend a post-revelation loop (seasonal / void-tribute / leaderboard). The Phase-4+ `sacrifice` mechanic partially serves as an endgame amber sink.

**Infrastructure / team-owned:**
4. **Cloud save is `NoOpProvider`** (`cloudSave.ts`) — needs a real backend. Fine for a v1 offline game; blocks the Patron's-Key cloud-save promise.
5. **Audio:** placeholder 14-sound pack ships; real audio is in progress (team-owned — don't touch). `expo-av` is deprecated → migrate to `expo-audio` at the next SDK bump.

**Operational (not code):**
6. Fill `eas.json` `submit.production` with real App Store Connect / Play Console credentials before `eas submit`.
7. Enable GitHub Pages (Settings → Pages → deploy from branch, `/docs`) so the privacy-policy/terms URLs in `links.ts` resolve — stores reject dead privacy links.
8. Point a telemetry collector URL (`app.json` `extra.telemetryEndpoint`) and/or a crash backend DSN — chokepoints are ready.

**Must-do QA (no device run has happened):**
9. On-device pass on low-end Android: cold-start, sustained FPS (puzzle screen with active tile, home with 8–10 animals, pit devour), ~27 MB asset decode, hardware-back behavior, notification delivery, speed-timer across backgrounding. All "feel"/perf claims above are static-analysis only.

---

## History (resolved in earlier passes — do not re-chase)

Prior audits surfaced and **fixed** these; verified still-resolved in current code: 1×1 placeholder app icons (now real generated assets); profanity in puzzle banks/dictionary (purged, banks regenerated via `scripts/tools/purgeProfanity.mjs`); `runMigrations()` / `installGlobalErrorHandler()` never called (now wired); cold-launch notification permission prompt (now contextual); missing `eas.json` / build metadata / legal docs / ESLint config (all present); a known-red test/tsc baseline (now green); Daily Challenge orphaned wiring, free-streak-freeze never granted, double-shift drop-1 mis-feedback, reverse silent-downgrade, speed-timer flatness (all fixed). `MONETIZATION_PLAN.md` exists. Stale CLAUDE.md unlock thresholds corrected (this session).
</content>
</invoke>
