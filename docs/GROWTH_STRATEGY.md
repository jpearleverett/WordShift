# WordShift — Growth & Monetization Strategy

This note records the growth/monetization policy the game is built and tuned
for, so future changes stay consistent with the revenue model. It is the
operational companion to the revenue assessment (the "Arrangement Ledger"
projection). The hard rule underneath everything: **players pay for expression
and convenience, never for narrative progression.** No amber source, purchase,
subscription, or season reward ever feeds `phaseProgress`.

## The core finding: organic-and-retention, not paid acquisition

WordShift monetizes deliberately lightly (a word game is ~87% ad-supported, and
this one runs no banners in the core loop, mutes interstitials through the dark
phases, and sells convenience/cosmetics only). At that ARPDAU, **paid user
acquisition does not pencil at tier-1 prices** — realistic per-install LTV
(~$0.30–1.00) sits well under a realistic indie tier-1 CPI (~$4.50–6.50 iOS /
$3.00–4.50 Android after the beginner premium + ~30% YoY inflation). Every
monetization design modeled stayed underwater on tier-1 paid UA.

**Therefore the growth engine is organic:**

- **ASO** — store listing, keywords, screenshots (see `docs/STORE_LISTING.md`).
- **Built-in virality** — the friend-challenge / share loops
  (`shareResults.ts`, `ShareResultModal`), which cost nothing and are already
  shipped.
- **Press & featuring** — the press kit (`docs/PRESS_KIT.md`) and creator kit
  (`creatorKit.ts`).
- **Word-of-mouth off the reveal** — the candy→cosmic-horror turn is the hook
  people tell each other about. Protecting that experience (keeping ads out of
  the dark phases) is itself a growth lever.

### If paid UA is ever tested

Treat it as a small, self-funding experiment, not the plan:

1. **Android + cheap ROW only.** Never tier-1 iOS at launch — ATT keeps iOS
   attribution >70% probabilistic/SKAN, and below a few hundred installs/day
   SKAN privacy thresholds make iOS UA effectively unmeasurable.
2. **Gate on a validated ROAS.** Require a real D7 ROAS that extrapolates past
   break-even at a D90 window *before* scaling a dollar, and recompute the
   D7→mature multiplier as cohorts mature (assume 2–3× D7→D365 until proven).
3. **Hold to a >1:1 realized contribution margin** at D90 before committing
   recurring budget — an indie cannot absorb a D180 un-recovered cohort.

## Monetization surface (as shipped after the revenue pass)

Convenience/expression only. Nothing here touches phase progression.

| Lever | What it is | Notes |
|---|---|---|
| Interstitials | Auto, victory exits only | Every 6 puzzles (Ph 0–2), every 10 (Ph 3), **silent Ph 4–5**. Pit-exit exempt by design. |
| Rewarded (opt-in) | victory 2×, hint recovery, speed rescue, daily amber, **quest double** | Global cap 8/day; never auto-shown; Patron/ad-free suppressed. |
| Banner | Menu-surface only (Stats) | Suppressed for ad-free / onboarding / Ph 4+. Android unit id is configured (test creatives while `adsUseTestIds` is true); iOS stays inert until the iOS keys land. |
| Amber packs | $0.99 / $2.99 / $6.99 | First pack 2×. Convenience faucet for cosmetics/sinks. |
| Hint packs | $0.99 / $2.99 | Convenience; hints still cost stars. |
| Remove-Ads | one-time (fallback **$5.99**) | Ad-free only. |
| **Supporter** | **subscription (fallback $3.99/mo)** | Ad-free + **monthly amber stipend** + season pass premium + exclusive cosmetic. |
| Patron | one-time (fallback **$8.99**) | Ad-free + amber/puzzle + exclusive cosmetic. Premium tier above Remove-Ads. |
| Keeper's Collection | one-time $4.99 | Cosmetic bundle. |
| **Season Pass** | monthly cosmetic track | Free track (play-earned) + premium (Supporter **or** amber unlock). The durable recurring amber sink. |

## Value ladder (why the reprice)

The revenue audit found the amber economy caps total addressable spend per
player at ~$25 (every finite sink summed), and that Remove-Ads was underpriced
relative to the word-game norm ($5.99–9.99). The reprice preserves a coherent
ladder and the Season Pass/Supporter add the durable, renewable demand the
economy was missing:

- **Remove-Ads $5.99** — cheapest ad-free.
- **Supporter $3.99/mo** — the recurring middle: ad-free + monthly amber +
  season premium + cosmetic.
- **Patron $8.99** — one-time premium, strictly above Remove-Ads.

All prices in code are **fallback labels**; the real charged price is the
Play Console / App Store Connect price tier and MUST be set to match.

## Owner action items (outside this repo)

These are the human/store steps the code is waiting on:

1. **iOS activation** (deferred by the owner): fill `revenueCatIosKey`,
   `admobInterstitialIdIos`, `admobRewardedIdIos`, `admobBannerIdIos` in
   `app.json → extra`, plus the iOS AdMob app id in the config plugin, and the
   iOS store products. Worth ~2× total revenue.
2. **Create store products**: `com.wordshift.supporter_monthly` (auto-renewing
   subscription) and price tiers for the repriced Remove-Ads / Patron.
3. **Done (Android):** the AdMob banner unit is created and
   `admobBannerIdAndroid` is filled in `app.json → extra`. The iOS banner unit
   rides item 1.
4. **Flip `adsUseTestIds` to `false` at the production cut — and only then.**
   It is deliberately `true` in `app.json` today and stays `true` through dev
   and internal/closed testing (a revenue-pass flip to `false` was reverted
   2026-07-16 to protect the live closed test — tapping your own live ads on a
   test build is an AdMob policy violation). Only `__DEV__` or the flag forces
   Google test units, so a `false` value means every release build serves live
   ads. After flipping, verify with the production-gate test:
   `WORDSHIFT_PRODUCTION_CUT=1 npm test -- --no-coverage --testPathPattern=productionConfig`.
