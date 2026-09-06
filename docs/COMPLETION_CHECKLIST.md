# What's Left: WordShift Completion Checklist

> Historical record. Current work and remaining checks: [September 2026 implementation ledger](IMPLEMENTATION_STATUS_2026-09-05.md).

*Compiled 2026-08-31 from a full repo audit (release config, docs, design-audit ledger, code markers,
known gaps, store/backend readiness, content/assets, plus a clean-room CI run). Items were
adversarially verified against the repo at HEAD (`claude/game-completion-checklist-mybsmk`,
based on versionCode 88 / v1.2.2). Updated 2026-09-01: the code/content/docs items marked
[x] below were closed on this branch (Stats weave-leak fix, EXPERT dread top-up 195→230,
eight doc corrections, the finale graduation-card fix, the cross-row flying ghost, all 13
`robed_talk.png` frames, the late-game copy passes, the passive Rate-WordShift row), followed by
the SDK-56 patch sync and a design/audio pass (bespoke Arrival cue + ceremony swell banding,
Terrible Peace sky/pit/foundation art, the Keeper's Record Phase-5 epilogue, the Phase-5 peace SFX
tier, NG+ home entry, HUD aging, glitch ghosts) and a docs fact-check. All verified by a full
green suite.*

## Snapshot: where the game actually stands

**The codebase is effectively done and healthy.** Fresh `npm ci` → typecheck **0 errors** → lint
**0 errors** (1,176 accepted warnings) → **123/123 suites, 3,258/3,258 tests green**. The
AAA design audit is at **176/180 findings done, 0 unaddressed** (F1 cross-row flight and F37 robed
talk frames were closed on this branch; the audit's §0 table and the ledger's Totals row have been
re-summed to match). What remains is almost entirely: the Android production cut procedure,
console-side work only the account owner can do, a handful of device verifications, four real
product/content gaps, a stack of stale docs, and the deliberately-deferred iOS track.

Compliance angles checked and **verified fine** (no action needed): Play's Android-16 target-API
deadline is met (Expo SDK 56 targets SDK 36), Billing Library is current (react-native-purchases
10.4.0), the data-deletion loop is coherent end-to-end (recovery code surfaced in Settings), and
screen-reader modal fencing is closed at HEAD despite a stale ledger row saying otherwise.

---

## 1. The Android production cut (launch-critical, in order)

> **`docs/LAUNCH_CHECKLIST.md` is the single source of truth for launch gates.** The items in
> §1-§3 below are a summary of it and have drifted out of sync before (four entries here once sat
> open while the launch checklist recorded them owner-confirmed). When the two disagree, believe
> the launch checklist and re-sync this one.

- [x] **Play production access — GRANTED** (owner-confirmed 2026-08-31; see
      `docs/LAUNCH_CHECKLIST.md`). The 12-tester/14-day closed test and Google's application
      review are behind us; what remains is the cut recipe below.
- [ ] **Flip `expo.extra.adsUseTestIds` → `false`** in `mobile/app.json` (currently `true`, which
      is *correct* for the live closed test — live ads on a test build is an AdMob policy
      violation). Then run the gate:
      `WORDSHIFT_PRODUCTION_CUT=1 npm test -- --testPathPattern=productionConfig`.
- [ ] **Bump `expo.version` in the SAME commit as the flip** (and bump `android.versionCode`, now
      88, as always). This is new and important: `adsUseTestIds` is read at *runtime* from the
      manifest and rides EAS Updates; closed-test and production builds share the `production`
      channel and, at the same version string, the same runtimeVersion (`policy: "appVersion"`).
      Without a version bump, an `eas update` published after the flip pushes **live ads onto
      testers' builds** (the exact policy violation), and one published before it reverts the
      production build to zero-revenue test ads. A distinct runtime severs the two.
      (Evidence: `googleAdMobAds.ts:83` reads the flag from `Constants.expoConfig.extra`;
      `eas.json` production channel; `docs/OTA_UPDATES.md` channels table.)
- [x] **SDK-56 patch drift synced (2026-08-31)** — `npx expo install --check` reports
      "Dependencies are up to date"; expo-doctor is 21/22, the one failure being the Hermes V1
      memory-regression advisory (needs SDK 57 — decision procedure in `docs/LAUNCH_CHECKLIST.md`).
      Re-run both once more immediately before the cut.
- [ ] **Verify live ad fill on a real production install** before wide rollout.
- [ ] **Promote past the internal track.** `eas.json` `submit.production.android` still targets
      track `internal`; the promote-to-production step is undocumented. While there: review the
      free **Play pre-launch report**, pick a **staged-rollout percentage**, watch **Android
      Vitals** ANR/crash thresholds, and set up **Sentry alert rules** (DSN is wired; alerting is
      console-side) so the first production crash actually notifies you.

## 2. Console-side work (owner accounts only)

- [ ] **Supporter subscription — device verification only.** App-side AND console-side are both
      done (owner-confirmed 2026-08-31): `com.wordshift.supporter_monthly` → `supporter`, the
      auto-renewing subscription exists in Play Console, is imported into RevenueCat, and the
      entitlement is created and attached. What remains: **store-verify one real license-tester
      subscription end-to-end** — the 2026-07-13 SKU verification pass predates this SKU and the
      subscription-category code path. See `docs/MONETIZATION_SETUP.md`.
- [x] **Play price tiers confirmed (owner-confirmed 2026-08-31)** — Console tiers match the in-app
      fallbacks (Remove-Ads $5.99, Patron $8.99, Supporter $3.99/mo), so live `priceString` and
      fallback labels agree.
- [ ] **Supabase operations.** `BACKEND_SETUP.md` covers security only. Decide and record: project
      tier (free tier has **no PITR** and **auto-pauses on inactivity**, which would silently break
      cloud saves/leaderboards for a live game), backup cadence, a usage-quota alarm, and enable
      **API rate limits** in the dashboard.
- [ ] Post-live: link the Play listing in AdMob so the "Requires review" badge and app-ads.txt
      verification self-resolve.
- [ ] Press build only: fill `expo.extra.creatorCode` (stays empty in shipping builds).

## 3. Device verifications still unchecked

The checklist's device-pass list has open boxes that the long closed test may have informally
covered — confirm each rather than assume: **onboarding end-to-end on a fresh install**, **UMP
consent form (EEA/debug geography) + Settings → Privacy Options**, **interstitials + rewarded ads
(test units)**, **notification tap routing incl. cold start**, **deep links**
(`wordshift://challenge/...`), **PNG share card**, **Challenge re-check + a deliberate Blind
Offering failure** (the trial ladder shipped after build 44), and the **daily-challenge percentile
line** (proves the locked-down Supabase RPCs end-to-end).

- [ ] **Add one accessibility session** to the same pass (currently absent from every checklist):
      a TalkBack walkthrough of a full board, OS large-font at the 1.35 ceiling against the
      fixed-height wood chrome, and edge-to-edge rendering on target SDK 36.

## 4. Real product/content gaps worth closing

- [ ] **Store screenshot #5 re-capture (submission-blocking per the checklist's own words).** The
      live PNG advertises "+50% Challenge amber"; the game ships +25%. It also shows removed
      setup-menu UI. "Do not ship a store update that keeps the +50% image."
- [ ] **Re-shoot all Play screenshots at ≥1080px short side.** The four titled shots in
      `mobile/assets/Play_store/` are 864×1536 (below Play's promotion-eligibility bar), and four
      AI drafts still sit in the folder. Needs on-device capture.
- [x] **EXPERT bank dread thinness — DONE (2026-08-31)**: a dread-targeted top-up run
      (`scripts/generateExpertDreadTopUp.test.ts`) grew the bank 195 → 230 with tier ≥3 boards
      14 → 49 (~21%, matching HARD's ratio); guards recalibrated and green. Previously: only 14 of 195 EXPERT standard boards carried dread tier ≥ 3
      (vs ~93/457 HARD), so the marquee horror vocabulary is thinnest at the apex tier during the
      climax. Needs an offline gated-regeneration run (6-letter dread words are genuinely scarce;
      the toolkit exists).
- [x] **`robed_talk.png` for all 13 animals — DONE (2026-08-31)**: generated procedurally (idle→talk mouth-delta transplant onto robed with local palette fitting; hand-drawn mouths for the three timid talkers; closed-mouth frames for owl/rabbit whose robed art is drawn open), wired into `CHARACTER_SPRITES` + the intro modal, pinned by tests, verified animating live. Previously the audit's remaining P1 art gap: Phase 4-5
      climax dialogue plays over a mouth-static robed portrait (a lift/scale transform ships as
      mitigation). Needs 13 commissioned 500×500 frames, framing-identical to `robed.png`.
- [x] **"Rank 0: Unbroken Weave" leak — FIXED (2026-08-31)** (row gated on wins > 0 or
      phase 5; three regression tests pin it). Previously: Any mid-game
      player with a speed round / resonant choice opens the card, and the weave row renders
      unconditionally (`StatsScreen.tsx:579-590`; `getUnbrokenWeaveMastery()` always resolves),
      naming a post-revelation mode early. One-line fix: gate the row on wins > 0 or phase 5.
- [x] **Preview-graduation card could fire ON the final board — FIXED (2026-08-31)**: found in a
      live browser playthrough of a creator-kit era save (graduation unfired + finale armed popped
      the blocking "Your Hands Know" card over the last arrangement). The gate now skips
      `isFinalBoard` without consuming the beat; pinned in `appIntegration.test.ts`.
- [x] **Cross-row "flying ghost" move animation — DONE (2026-08-31)**: tap commits fly a ghost
      tile from the source position into the landing slot (window-coord overlay, analytic X +
      measured row Y, native driver), handing over to the arrival settle. Verified live on web.
      Previously (design audit Top-10 #9) — the most-performed
      interaction still commits as a state swap + local settle; the tile never visibly travels.
      Real animation-architecture change (needs measured source-tile position through
      `usePuzzleGame`); deliberately held, but it is the biggest remaining feel item.
- [x] **Late-game copy passes — DONE (2026-08-31)**: `getResonantMoveMessage` is now a real
      pool (4 lines × 5 phase bands, was 1 fixed line per 3 bands, firing verbatim through the
      endgame); `getHouseAskLine`/`getHouseAskFulfilledMessage`/`getHintGrantMessage`/
      `getStreakHeldMessage` split from 3 bands to 5 (phases 3 and 5 get their own registers);
      the Phase-5 streak-risk notification's "It will wait... but not forever." tonal break
      replaced with a serene line. Band-distinctness + pool + register tests added.
- [x] **Passive "Rate WordShift" row in Settings ABOUT — DONE (2026-08-31)** (tester-report
      item): player-initiated Play Store link only, never a prompt, so the review-bomb guard
      (`reviewPrompt.ts`, asks only at Phase 0-1) is untouched; source-pinned in
      `reviewPrompt.test.ts`.

## 5. Docs that now lie (quick, cheap fixes)

- [x] `docs/GROWTH_STRATEGY.md` — corrected 2026-08-31 (now states the flag is deliberately
      `true` until the production cut, with the gate-test procedure).
- [x] `docs/PRESS_KIT.md` — facts refreshed 2026-08-31 (v1.2.2, 56 achievements, 22,749 words,
      ~9,611 puzzles across 30 banks, real era depths). STILL OPEN: the press-contact placeholder (only the owner
      knows the address). Previously stale:
      "v1.5.0", "51 achievements" (56), "11,400-word dictionary" (22,749), "~4,700 puzzles"
      (~9,576 / 30 banks), "3 variant modes", era depths ~70/~140/~200/~260 (actual 50/85/140/180).
      Must be refreshed before it is ever handed to press.
- [x] `docs/STORE_LISTING.md` — corrected 2026-08-31 (56 achievements, five difficulties).
      The live Play Console listing copy still needs the same refresh at the next store update.
- [x] `docs/index.md` — corrected 2026-08-31 (five difficulties; styles + stackable trials);
      auto-republishes via Pages.
- [x] `docs/AAA_DESIGN_AUDIT.md` §0 — snapshot refreshed 2026-08-31 to the ledger's
      174 / 3 / 3 / 0 truth.
- [x] `docs/PUZZLE_REGENERATION_PLAN.md` — status note added 2026-08-31 (executed 2026-07-23;
      historical record).
- [x] `CLAUDE.md` — stale claims corrected 2026-08-31 (reverse-bank regen marked done, comment-
      drift note dropped, EXPERT dread gap marked closed).

## 6. Post-launch / deliberately deferred (recorded so "finished" has a definition)

- **The entire iOS track** (~2× revenue, blocked on owner consoles): Apple Developer + App Store
  Connect app, `revenueCatIosKey`, AdMob iOS **app id** (without it an iOS build crashes at
  launch) + interstitial/rewarded/banner unit ids (all five starred values are listed in
  `docs/LAUNCH_CHECKLIST.md`, including `admobBannerIdIos`), iOS on the GDPR/UMP message, the 10 SKUs in ASC, privacy
  nutrition labels, 6.7"/6.9" screenshots, EAS iOS credentials.
- **Economy retune on live data**: ritual-energy double-accelerator magnitude
  (`amberCurrency.ts:1366-1377`), `UNLOCK_SKIP_PREMIUM` (`gameBalance.ts:446-449`), Tending cost
  curve (`gameBalance.ts:804`) — all explicitly deferred in code comments to post-launch telemetry.
- **Cloud-save conflict guard**: replace cross-device wall-clock comparison with a server-assigned
  monotonic version (documented backend follow-up).
- **Friend-challenge links are custom-scheme only** (`wordshift://`): most messengers render them
  as dead plain text. An HTTPS App Link (assetlinks.json on the GitHub Pages domain + an
  intent-filter) would make shared challenges tappable — a high-leverage growth item.
- **Localization**: the game is English-only and that scoping decision is recorded nowhere, while
  ASO is the declared #1 growth engine. Decide and write it down (or plan store-listing-only
  localization as a cheap first step).
- Optional polish parking lot: Tier-B/C ambient animal art (blink/rest/signature frames, 12
  missing walk cycles), HouseWorld room pan-culling, the full `useWindowDimensions` sweep
  (portrait-locked, low value), lint-warning triage (baseline drifted 815 → 1,176).
