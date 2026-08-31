# What's Left: WordShift Completion Checklist

*Compiled 2026-08-31 from a full repo audit (release config, docs, design-audit ledger, code markers,
known gaps, store/backend readiness, content/assets, plus a clean-room CI run). Items were
adversarially verified against the repo at HEAD (`claude/game-completion-checklist-mybsmk`,
based on versionCode 88 / v1.2.2).*

## Snapshot: where the game actually stands

**The codebase is effectively done and healthy.** Fresh `npm ci` → typecheck **0 errors** → lint
**0 errors** (1,158 accepted warnings) → **122/122 suites, 3,192/3,192 tests green**. The
AAA design audit is at **174/180 findings done, 0 unaddressed** (the audit doc's own §0 summary is
stale — see Docs below). What remains is almost entirely: the Android production cut procedure,
console-side work only the account owner can do, a handful of device verifications, four real
product/content gaps, a stack of stale docs, and the deliberately-deferred iOS track.

Compliance angles checked and **verified fine** (no action needed): Play's Android-16 target-API
deadline is met (Expo SDK 56 targets SDK 36), Billing Library is current (react-native-purchases
10.4.0), the data-deletion loop is coherent end-to-end (recovery code surfaced in Settings), and
screen-reader modal fencing is closed at HEAD despite a stale ledger row saying otherwise.

---

## 1. The Android production cut (launch-critical, in order)

- [ ] **Confirm Play production access.** The 12-tester/14-day closed test started 2026-07-13 and
      was eligible for the production-access application ~2026-07-27. It is now 2026-08-31 —
      confirm the application was submitted/approved in Play Console (unverifiable from the repo).
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
- [ ] **Run `npx expo install --check`** — 10 Expo packages sit 1-2 patches behind SDK-56
      (expo-doctor 20/21 as of 2026-07-24).
- [ ] **Verify live ad fill on a real production install** before wide rollout.
- [ ] **Promote past the internal track.** `eas.json` `submit.production.android` still targets
      track `internal`; the promote-to-production step is undocumented. While there: review the
      free **Play pre-launch report**, pick a **staged-rollout percentage**, watch **Android
      Vitals** ANR/crash thresholds, and set up **Sentry alert rules** (DSN is wired; alerting is
      console-side) so the first production crash actually notifies you.

## 2. Console-side work (owner accounts only)

- [ ] **Supporter subscription (10th SKU / 5th entitlement).** App-side is fully wired
      (`com.wordshift.supporter_monthly` → `supporter`). Console-side is still open: create the
      auto-renewing subscription in Play Console, import into RevenueCat, create the entitlement
      with identifier **exactly `supporter`**, then **store-verify one real purchase** — the
      2026-07-13 SKU verification pass predates this SKU, so it has never been verified end-to-end.
      See `docs/MONETIZATION_SETUP.md`.
- [ ] **Confirm Play price tiers match the repriced fallbacks** (Remove-Ads $5.99, Patron $8.99,
      Supporter $3.99/mo) so live `priceString` and fallback labels agree.
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
- [ ] **EXPERT bank dread thinness** — only 14 of 195 EXPERT standard boards carry dread tier ≥ 3
      (vs ~93/457 HARD), so the marquee horror vocabulary is thinnest at the apex tier during the
      climax. Needs an offline gated-regeneration run (6-letter dread words are genuinely scarce;
      the toolkit exists).
- [ ] **`robed_talk.png` for all 13 animals** — the design audit's remaining P1 art gap: Phase 4-5
      climax dialogue plays over a mouth-static robed portrait (a lift/scale transform ships as
      mitigation). Needs 13 commissioned 500×500 frames, framing-identical to `robed.png`.
- [ ] **"Rank 0: Unbroken Weave" leaks into the Stats MASTERY card pre-Phase-5.** Any mid-game
      player with a speed round / resonant choice opens the card, and the weave row renders
      unconditionally (`StatsScreen.tsx:579-590`; `getUnbrokenWeaveMastery()` always resolves),
      naming a post-revelation mode early. One-line fix: gate the row on wins > 0 or phase 5.
- [ ] **Cross-row "flying ghost" move animation** (design audit Top-10 #9) — the most-performed
      interaction still commits as a state swap + local settle; the tile never visibly travels.
      Real animation-architecture change (needs measured source-tile position through
      `usePuzzleGame`); deliberately held, but it is the biggest remaining feel item.

## 5. Docs that now lie (quick, cheap fixes)

- [ ] `docs/GROWTH_STRATEGY.md:88-91` claims `adsUseTestIds: false` is "now the default" — it is
      `true`, deliberately. **This is the dangerous one** (could cause a premature or skipped
      flip); correct it first.
- [ ] `docs/LAUNCH_CHECKLIST.md` says versionCode 47 / v1.5.0; actual 88 / 1.2.2. Re-sync its open
      boxes with reality while at it (much of §3 above may already be informally done).
- [ ] `docs/PRESS_KIT.md` — unfilled press-contact placeholder (line 40) and badly stale facts:
      "v1.5.0", "51 achievements" (56), "11,400-word dictionary" (22,749), "~4,700 puzzles"
      (~9,576 / 30 banks), "3 variant modes", era depths ~70/~140/~200/~260 (actual 50/85/140/180).
      Must be refreshed before it is ever handed to press.
- [ ] `docs/STORE_LISTING.md` — "51 achievements" (56), "Four difficulty levels" (five with
      EXPERT).
- [ ] `docs/index.md` (the **live** GitHub Pages landing page, linked from every share CTA) —
      "four difficulties", "Three twist modes"; EXPERT/Blind/Lexicon unmentioned, Speed is now a
      modifier. Auto-republishes on edit.
- [ ] `docs/AAA_DESIGN_AUDIT.md` §0 still reports 83 findings "not addressed"; the ledger's true
      count is 174 done / 3 partial / 3 deferred / 0 not addressed. Refresh the snapshot.
- [ ] `docs/PUZZLE_REGENERATION_PLAN.md` claims no regeneration has run — it fully ran 2026-07-23.
- [ ] `CLAUDE.md` — still lists reverse-bank regeneration-for-size as an open follow-up (done:
      reverse is 500×4) and the roomUpgrades comment-drift note (comment already fixed).

## 6. Post-launch / deliberately deferred (recorded so "finished" has a definition)

- **The entire iOS track** (~2× revenue, blocked on owner consoles): Apple Developer + App Store
  Connect app, `revenueCatIosKey`, AdMob iOS **app id** (without it an iOS build crashes at
  launch) + interstitial/rewarded/banner unit ids (note: `admobBannerIdIos` is missing from the
  checklist's starred list — add it), iOS on the GDPR/UMP message, the 10 SKUs in ASC, privacy
  nutrition labels, 6.7"/6.9" screenshots, EAS iOS credentials.
- **Economy retune on live data**: ritual-energy double-accelerator magnitude
  (`amberCurrency.ts:1348-1358`), `UNLOCK_SKIP_PREMIUM` (`gameBalance.ts:446-449`), Tending cost
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
  (portrait-locked, low value), lint-warning triage (baseline drifted 815 → 1,158).
