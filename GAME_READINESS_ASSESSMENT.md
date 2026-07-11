# WordShift — Commercial Readiness Assessment

*Assessed as an Android-first indie launch (iOS later; audio in progress and explicitly not scored). Framework: **AARRR "Pirate Metrics"** (Acquisition → Activation → Retention → Revenue → Referral) as the growth spine, **Nir Eyal's "Hooked" model** as the addictiveness lens inside Retention, a **game-feel/juice** craft layer inside Activation, and a **technical ship-readiness gate** as a precondition.*

*Method: nine subsystems were read from **actual source** (not the CLAUDE.md map, which was treated as a hypothesis to verify), each subsystem's load-bearing claims were adversarially re-checked against code, a completeness critic attacked the whole, and the build was verified first-hand. Every claim below is anchored to `file:line`.*

---

## Ground truth (verified first-hand, this session)

Before any judgement, the objective health of the codebase — run, not read from docs:

| Check | Result |
|---|---|
| TypeScript (`tsc --noEmit`) | **0 errors** |
| Jest suite | **87 suites, 2,147 tests, 100% passing** (70s) |
| ESLint | **0 errors**, 777 warnings (all documented guarded-`require`/hook-dep notices — non-blocking) |
| Monetization wiring | Static `require('literal')` + `NON_SUBSCRIPTION` category present — **the "purchases not available" footguns are closed** (`revenueCatBilling.ts:80,98,194`) |
| Finale pacing | Real and enforced: finale gated behind an 8-puzzle dwell counter (`App.tsx:1822`, `FINALE_DWELL_PUZZLES=8`) |
| Config / secrets | Production-appropriate pre-launch state; committed keys are all **client-publishable** (Supabase `sb_publishable_` anon under RLS, public Sentry DSN, RevenueCat `goog_` SDK key). No server secrets committed; `secrets/` gitignored. |

**This is production-grade engineering, and it is genuinely exceptional for a solo dev at ~one month.** ~96K lines across 246 files with a green 2,147-test suite and CI on every push is a level of discipline most funded studios miss. Nothing below should be read as "the code is weak." It isn't. The gaps are almost entirely in *go-to-market* and *product-shape*, not in build quality.

---

## Headline verdict

**Is it ready to ship? Fundamentally, yes.** It is content-complete, technically production-grade, and narratively finished. Every remaining *submission* gate is a human/console task, not code: capture 4 screenshots, replace a placeholder feature graphic, flip one ad flag, device-verify one real purchase + one real ad. A seasoned dev clears all of it in **2–3 days**.

**Is it an indie hit as-is? Not yet — and readiness is not the reason.** The one memorable, coverage-worthy, word-of-mouth asset — the candy-to-cosmic-horror twist — is *structurally hidden from the exact audience the funnel acquires*, and the default puzzle in front of that audience nearly solves itself. Both are cheap, targeted fixes rather than rebuilds. They are the difference between "polished game that reviews well and quietly fades" and "hit."

### The scorecard

| AARRR stage | Score | One-line read |
|---|:---:|---|
| **Acquisition** | 5 / 10 | Great copy + a conversion-grade icon, but the store-visit-to-install surface (screenshots, feature graphic) isn't shipped, and the art markets a different game than the one that retains. |
| **Activation (FTUE)** | 7 / 10 | Polished, fast, soft-lock-proof onboarding — but the intro is now pure warmth (no hook tease) and the default puzzle solves itself. |
| **Retention (Hooked)** | 7 / 10 | Strong Investment + narrative pull carries D3–D14; the Variable-Reward engine is thin and Phase 2 is a flagged D14 valley. |
| **Revenue** | 6 / 10 | Code is a 9 — wired, ethical, crash-safe — but ships **$0 ad revenue** until one flag flips, and cadence is (deliberately) conservative. |
| **Referral** | 6 / 10 | Excellent share + creator infra, but low likely K-factor and the campaign is an unactivated toolkit. |
| **Technical gate** | 9 / 10 | **PASS.** Layered crash capture, offline-first boot, crash-safe purchase ledger, conflict-guarded cloud save, 87 tests + CI. |

---

## Your direct questions, answered

**Is it complete?**
*Content and engineering: yes, and then some.* All 13 animals × 3 frames, all 13 rooms, 5 phase skies, world art — 389 PNGs, zero placeholders in-game (`AnimalSprite.tsx:38-112`, `RoomView.tsx:21-37`). Monetization, cloud save, migrations, crash handling all wired and tested. *Go-to-market: no.* The store's conversion surface (4 screenshots + a non-placeholder feature graphic) does not exist yet, and a Play listing legally cannot publish without it.

**Is it addictive?**
More *absorbing* than *addictive* — and for this genre that's the right shape, but it carries a risk. Mapped to Hooked: **Investment is strong** (dual streaks with freeze-mercy, a 25-unlock house, collections, private mastery records — real switching cost). **Internal triggers are strong** (narrative curiosity is the engine). But the **Variable-Reward stage is thin**: daily login is fixed-escalating (`dailyLoginReward.ts:18`), quests/daily amber are deterministic, and the only true variance is a 12% surprise bonus + 8% victory glitch (`amberCurrency.ts:139`, `phaseNarrative.ts:38`). The compulsion loop leans almost entirely on *story momentum* — which is exactly why the Phase-2 valley (below) is dangerous: when the story stalls, there's little variable-reward machinery to hold the player.

**Is it polished?**
Yes — conspicuously. Visuals score a 9 (premium cohesive pixel art, a Phase-4 demon-face sky that makes the premise believable, WCAG-annotated phase theming). Game feel scores an 8 (input-scaled haptics on both tap and drag, tiles that literally get *heavier* as the game darkens — `LetterTile.tsx:90-113`, star bursts, forgiving ±1-slot drag snapping). The small details are abundant and expensive: a Phase-0 sparkle that occasionally desaturates and sinks *wrong* (`AnimatedBackground.tsx:34`), a share card that visually corrupts as you descend, crash-safe money ledgers. This is not prototype polish.

**Retention outlook?**
Strong **D3–D14** (narrative + streaks + house-building). Risky at the **edges**: **D1** is threatened by a default puzzle that asks almost no decision *and* by session-1 churners getting no re-engagement trigger (notification permission is only requested after the 3rd victory — `App.tsx:2242`); **D30+** leans on a finite story + one monthly deterministic event + a cosmetic sink.

**Is the intro good?**
Mechanically, yes — 11 guided steps, ~8 taps to first solve, three independent anti-soft-lock safety nets, a clean two-step skip (`useOnboardingFlow.ts`, `FoxGuide.tsx:350`). But it **promises nothing**: the documented ominous hook line ("We've been waiting for someone like you") *no longer exists in code* — the intro was rewritten to pure warmth (`onboarding.ts:106-110`). A player who bounces in session 1 never feels the "something is off" pull the whole game is built on.

**Are the visuals ready?**
In-game: yes (9/10). The *store* visuals — the only ones a prospective player sees — are the weakest artifact in the entire project: the feature graphic is self-described as "placeholder-grade" (`LAUNCH_CHECKLIST.md:25`) and shows none of the fox, the rooms, or the hook. Store visitors never see the 9; they see a 3.

---

## Stage-by-stage

### Acquisition — 5 / 10
**The engine is built; the on-ramp is missing.** Store-listing copy is genuinely a marketer's work — "Cozy word game. Mostly.", horror+cozy+story keywords, a shot list that *forbids* showing Phase 3+ (`STORE_LISTING.md`). The app icon is conversion-grade with the red-eyed figure hidden in the treeline. And the creator/press kit — the single most important lever for a spoiler-locked twist game — is fully built: a code-gated deep link fast-forwards reviewers past 150+ puzzles through the *real* award pipeline (`creatorKit.ts:255-364`).

But:
- **Blocker:** 0 / 4 store screenshots captured; feature graphic is placeholder (`LAUNCH_CHECKLIST.md:9,25`). *A listing cannot publish without these.*
- **High:** the creator campaign is inert — `creatorCode` is unset and the press contact is a placeholder (`PRESS_KIT.md:40`). A tool nobody has been handed generates zero installs.
- **Low:** Android ASO is thin (the game ranks on a narrative long-description, and "WordShift" carries no discoverable keyword).

### Activation (FTUE) — 7 / 10
Onboarding mechanics are ship-ready and unusually robust: a proactive first-action prompt so the player is never guessing (`App.tsx:3395`), both tap *and* drag taught up front (`onboarding.ts:115`), the ✓/✗ rule taught in one in-context beat (`onboarding.ts:128`), the Fox card dodging the active board, and `normalizeResumeStep` + a 30s pit stall-rescue that make a mid-onboarding kill non-fatal.

The two dents are both about *what happens next*, not correctness:
- **Medium:** no hook tease in the intro copy (above) — the cozy trap is set, but nothing whispers.
- **Medium:** thin D1 return wiring — onboarding ends on a spoken "come back each day," but the daily is gated to 8 puzzles and no notification opt-in has fired yet.

### Retention (Hooked) — 7 / 10
The most retention-literate part of the design. **Triggers:** a non-repeating one-shot notification ladder with same-day suppression (a daily player never gets a redundant "your puzzle is ready" — `notifications.ts:469`), a 5-rung win-back ladder, streak-at-risk pings, all phase-aware and staggered to avoid double-firing. **Investment:** dual streaks that *decay to the last milestone* rather than nuking to 1 (`dailyChallenge.ts:487`) — the correct fix for the "dead Wordle streak" churn trap.

Holes, in severity order:
- **High:** session-1 churners get *no* external trigger — permission is only requested after the 3rd victory (`App.tsx:2242`), so the highest-churn-risk cohort is unreachable.
- **Medium:** Phase 2 (~puzzles 40–125) is a long single-tone stretch the code itself flags as "the likeliest D14 break" (`gameBalance.ts:47`).
- **Medium:** the recurring-loop Variable Reward is thin (fixed rewards; variance only on puzzle wins).
- **Medium:** D30+ live-ops is a single deterministic full-moon event (bonus-only) plus a cosmetic sink.

### Revenue — 6 / 10 (code quality: 9)
Genuinely wired end-to-end (real RevenueCat + AdMob adapters registered at `App.tsx:3615,3619`), both documented SDK footguns closed, disciplined **convenience-only** economy (verified: purchased amber routes through `awardBonusAmber`, which never touches `phaseProgress` — `amberCurrency.ts:1949`; hints still cost stars), crash-safe purchase recovery (apply-then-ack pending-grant ledger reconciled at boot), and a respectful ad cadence (interstitials victory-exit only, Phase 4+ suppressed, rewarded 100% opt-in).

- **Ship blocker (config, not code):** `extra.adsUseTestIds:true` means a production build serves Google **test ads** → **$0 ad revenue** until flipped (`app.json:204`, `googleAdMobAds.ts:81`). It's correct for internal testing; it's a mandatory release-checklist flip that nothing enforces at build time.
- **Framing:** the respectful cadence + IAP-convenience model is *tonally correct* and *ethical*, but caps ad ARPDAU. Revenue depth leans on fans buying amber/hints/Patron. That is the right call for "indie hit, not top-grossing" — just don't expect ad-driven scale.
- **Fine for now:** iOS is intentionally unmonetized (empty keys) — a non-issue for the Android-first launch, a checklist item before iOS.

### Referral — 6 / 10
The share code is complete and viral-*native*: a spoiler-safe Wordle-style emoji grid keyed to honest per-move outcomes, a phase-aware PNG card that *decays* as you descend (a smart "something is wrong with my cute word game" lure — `ShareCard.tsx:96`), and early curiosity taglines. A correction the verification surfaced: the referral *payload is not* gated behind 155 puzzles — the cards are deliberately shareable-and-intriguing from Phase 0. What *is* missing is a **compounding** loop:
- **Medium:** the strongest primitive (send a friend a specific beatable puzzle) only exists on standard non-daily boards (`App.tsx:2547`) — not the daily, not any variant.
- **Medium:** the share nudge fires at most once, ever; the leaderboard is anonymous/non-shareable; social proof self-suppresses below 100 words/day, so a fresh install sees a community-less game exactly when proof matters (`socialProof.ts:107`). K-factor will be low.

### Technical ship-readiness gate — 9 / 10 (PASS)
Layered crash capture (module-load global handler + native Sentry + ErrorBoundary forwarding), offline-first boot raced against a 2.5s cap so a network stall can't hang launch, cloud-save conflict guard that advances its baseline only on success, versioned stop-on-failure migrations, a crash-safe apply-then-ack IAP ledger deliberately excluded from cloud sync and Reset, clean hygiene (no `TODO`/`@ts-ignore` in real source), and CI enforcing typecheck→lint→test. This is the strongest kind of "boring" — nothing here will surprise you in production.

---

## The two things between this and a hit (cross-cutting)

Every subsystem was reviewed in isolation, so the most important issue fell *between* the dimensions:

### 1. The acquisition → payoff mismatch
The store art, icon, and (mandated spoiler-safe) screenshots market a **cozy, cute** product. The actual differentiator — the horror twist — is deliberately unreachable in store assets *and* gated **125–155 real puzzles deep** *and* now absent even from the onboarding copy. So the audience the art **acquires** (cozy/casual) is largely **disjoint** from the audience the payoff **retains and evangelizes** (people who reach and love the turn). Cozy installers may churn in Phase 0–2 before the hook lands; horror/story fans may never install something that looks like a candy match game. **The growth engine is structurally hidden from the audience the funnel brings in.** This is *the* indie-hit question for this title.

### 2. The default puzzle solves itself
Verified: in default (non-Challenge, non-Blind) play, the ✓/✗ previews mark every legal move using *byte-identical* validation to the actual move gate (`usePuzzleGame.ts:1947` vs `handleSlotPress:1479,1494`). For a *word* game, the median player picks the one unlocked letter and taps the green check — near-zero decision density. The mechanically satisfying version (commit from your own word knowledge) is hidden behind a Challenge toggle a casual player never flips. This caps word-of-mouth among the exact puzzle-motivated cohort that makes word games sticky.

**The good news:** both are cheap. Let the twist *leak earlier and louder in a spoiler-safe way* (you already know how — the "Mostly." tagline proves it) and pull the first genuine dread beat forward; and dial back default preview assistance (e.g. show ✓/✗ only *after* commit, or ramp assistance down as the player improves) so the word puzzle is actually a word puzzle. Neither is ship-blocking. Both are the week-1 priority.

---

## What it needs — prioritized

### P0 — Ship gates (do before submission; ~2–3 days, no engineering)
1. **Capture 4 phone screenshots** per the shot list (`STORE_LISTING.md`) — a listing can't publish without them.
2. **Replace the placeholder feature graphic** — it's the #2 conversion asset after the icon and currently shows none of the game's edge.
3. **Flip `adsUseTestIds:false` for the production build only**, then **device-verify one real ad renders + one real purchase of each SKU kind + a Restore round-trip** on a Play internal build. (The last real-device class of bug — the `NON_SUBSCRIPTION` fix — can only be caught here.)
4. **Bump `android.versionCode`** (currently 43; autoincrement is off by design).

### P1 — The hit-makers (week 1 post-launch; days each)
5. **Leak the hook earlier, spoiler-safe.** Restore an undertone line in onboarding and pull one genuine "something is off" beat forward before ~puzzle 40 — directly attacks mismatch #1 and the Phase-2 valley.
6. **Make the default puzzle a puzzle.** Reduce default preview hand-holding (validity after commit, or an assistance ramp) — attacks the trivial-loop cap on puzzle-motivated retention/word-of-mouth.
7. **Activate the creator campaign.** Set `creatorCode`, fill the press contact, and actually hand the kit to a shortlist of cozy-horror / narrative-game streamers. For a spoiler-locked twist, this is the realistic path to the first 1k–10k installs.
8. **Close the session-1 trigger gap.** A softer, earlier notification opt-in so first-session churners are reachable.
9. **Wire the ads-live flag to the production build** (EAS env or a hard checklist gate) so revenue never silently ships at $0.
10. **Stand up a week-1 funnel dashboard.** Telemetry is already wired to Supabase `events`; you're currently blind to your own D1/D7/conversion. Watch where the Phase-2 drop-off actually lands before tuning.

### P2 — After launch signal (weeks; only if the data says so)
11. Broaden the challenge-share primitive to the daily + variants (raise K-factor).
12. Downscale/recompress the full-screen skies (~29 MB uncrunched) — a real conversion + low-end-stability lever in India/SEA/LatAm word-game markets.
13. Deepen the recurring Variable Reward (a mystery-box / variable daily) if D14 data shows story-momentum isn't enough.
14. Add mastery depth beside the core (a "Flawless" chase already exists — surface it louder) for the puzzle-motivated cohort.

### Credit where due (already-defused risks a reviewer would otherwise flag)
- **Content rating handled:** Teen/PEGI-12 declared with mild-horror themes, explicitly targeting 13+ to avoid the Google Play Families misrating trap (candy art + ads + dark themes is exactly that trap) — already defused.
- **The finale-pacing bug is genuinely fixed** (8-puzzle dwell gate) — the cult-reveal era no longer flashes past.
- **Money can't be lost or narrative-skipped:** the convenience-only invariant and the crash-safe purchase ledger both hold in code.

---

## Bottom line

You have built, solo and in about a month, a **content-complete, production-grade, narratively ambitious game** that most funded teams would be proud to ship. The engineering is not the question. **Ship it once the ~2–3 days of console/screenshot/flag tasks are done.**

Then treat the two cross-cutting issues — *let the twist leak earlier* and *make the default puzzle ask a real question* — as your week-1 obsession, watching the telemetry you've already wired. That is the gap between a game that reviews well and one that a streamer's audience makes into a hit. It is a small, targeted gap, and you are unusually well-positioned to close it.
