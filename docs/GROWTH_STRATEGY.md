# WordShift — Growth & Monetization Strategy

Reviewed against `main` (`6f96ebb`) on September 13, 2026. See
[current build status](CURRENT_BUILD.md) for the release configuration and
remaining device checks. This is a planning document, not measured launch
performance or evidence that the public release has happened.

This note records the growth/monetization policy the game is built and tuned
for, so future changes stay consistent with the revenue model. It is the
operational companion to the revenue assessment (the "Arrangement Ledger"
projection). The hard rule underneath everything: **players pay for expression
and convenience, never for narrative progression.** No amber source, purchase,
subscription, or season reward ever feeds `phaseProgress`.

## The core finding: organic-and-retention, not paid acquisition

WordShift monetizes deliberately lightly: it runs no banners in the puzzle
loop, mutes interstitials from Phase 4 onward, and sells convenience and
cosmetics. The earlier revenue assessment favored an organic launch. Its
market averages and LTV/CPI estimates were planning assumptions, not observed
WordShift results or current market benchmarks. Replace those assumptions
with actual acquisition, retention, ad and purchase cohorts after launch.

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

1. Start with the Android launch audience and a fixed budget the developer
   can afford to lose. iOS activation remains separate work.
2. Measure install cost, retention and net revenue for the same cohort;
   do not assume an industry multiplier makes a short test profitable.
3. Scale only when observed contribution after store fees and acquisition
   costs supports the spend. Treat immature cohorts as uncertain.

## Monetization surface (as shipped after the revenue pass)

Convenience/expression only. Nothing here touches phase progression.

| Lever | What it is | Notes |
|---|---|---|
| Interstitials | Auto, victory exits only | Every 6 puzzles (Ph 0–2), every 10 (Ph 3), **silent Ph 4–5**. Pit-exit exempt by design. |
| Rewarded (opt-in) | victory 2×, hint recovery, speed rescue, daily amber, **quest double** | Global completed-view cap 8/day; never auto-shown. Paid benefits vary by placement: victory double is free for ad-free holders; Daily Amber is free for Patron specifically. The provider does not blanket-disable opt-in rewards for every paid player. |
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

All prices above are **fallback labels**; the purchase UI uses the store's
localized price when available. The checkout price comes from the active
Play Console / App Store Connect product configuration, not these examples.

## Purchase delivery and testing

Paid checkout and restore share a lock. Verified rewards use durable pending
grants and transaction receipts so a storage retry does not charge again.
Room and cosmetic purchases commit ownership and amber together. Daily Amber,
the Supporter stipend and victory double also commit their rewards with their
claim records. These protections are implemented and regression-tested;
native billing, consent and interruption acceptance still belongs to the
signed Android build. See [current build status](CURRENT_BUILD.md).

Restore Purchases restores eligible entitlements. It does not recreate spent
consumables; receipt recovery after an interrupted purchase is limited to the
known transaction history on the same installation. Keep a current cloud save
and recovery code for progress and unspent balances.

## Owner action items (outside this repo)

These are the human/store steps the code is waiting on:

1. **iOS activation** (deferred by the owner): fill `revenueCatIosKey`,
   `admobInterstitialIdIos`, `admobRewardedIdIos`, `admobBannerIdIos` in
   `app.json → extra`, plus the iOS AdMob app id in the config plugin, and the
   iOS store products. No iOS revenue uplift has been measured.
2. **Verify existing store products**: the owner has confirmed Supporter is
   configured. Check `com.wordshift.supporter_monthly`, its base plan and
   entitlement, and the current Remove-Ads / Patron prices in the signed
   release; do not recreate products merely because an older checklist says so.
3. **Done (Android):** the AdMob banner unit is created and
   `admobBannerIdAndroid` is filled in `app.json → extra`. The iOS banner unit
   rides item 1.
4. **Live ads follow the release channel, never a hand flip** (since 2026-09-14,
   `app.config.js` resolves `adsUseTestIds` to `false` only for the `production`
   channel; the original wording below is kept as history).
   It is deliberately `true` in `app.json` today and stays `true` through dev
   and internal/closed testing (a revenue-pass flip to `false` was reverted
   2026-07-16 to protect the live closed test — tapping your own live ads on a
   test build is an AdMob policy violation). Only `__DEV__` or the flag forces
   Google test units, so a `false` value means every release build serves live
   ads. After flipping, verify with the production-gate test:
   `WORDSHIFT_PRODUCTION_CUT=1 npm test -- --no-coverage --testPathPattern=productionConfig`.
