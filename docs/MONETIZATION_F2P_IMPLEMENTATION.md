# WordShift — Free-to-Play Monetization: Implementation Plan

> Status: **BUILD PLAN**. Turns the paper design in `/MONETIZATION_PLAN.md` into a
> concrete, shippable F2P implementation for WordShift (React Native + Expo SDK 54).
> Audience: studio head. All file paths are real and relative to `mobile/` unless noted.
>
> Hard rules inherited from `MONETIZATION_PLAN.md` (non-negotiable): players pay for
> **expression** and **convenience**, never **narrative progression**. No energy/lives,
> no loot boxes, no pay-to-skip-phases, no forced ads, no paywalled animals/rooms, no
> cash amber bundles.

---

## 0. Current state (verified against code)

- **Zero monetization shipped.** No IAP, ads, shop, or paywall. No native billing/ad
  modules in `package.json` (only Expo + AsyncStorage + gesture-handler + uuid).
- **Economy is single-source and clean.** `src/services/amberCurrency.ts` owns the wallet:
  `getAmberBalance()`, `spendAmber(amount, targetId)` (concurrency-guarded via
  `spendInProgress`), `awardBonusAmber(amount, source)`, transaction log
  (`wordshift_amber_transactions`). Amber sinks already exist:
  `roomUpgrades.ts` (Phase 2+, 75–150 amber), `sacrifice.ts` (Phase 4+ destroy-amber).
- **Cloud save is a stub.** `src/services/cloudSave.ts` ships a `NoOpProvider` behind a
  clean `CloudProvider` interface. `SYNC_KEYS` already enumerates every persisted key.
  This is the gating dependency for the Patron's Key cloud-save promise.
- **No cosmetics ownership layer exists.** `theme/colors.ts` has `getPhaseTheme()` /
  `getTileColor()` but no concept of *owned* / *equipped* themes. A shop needs a new
  entitlement service from scratch.
- **Build config is dev-friendly but not monetization-ready.** `app.json` has
  `newArchEnabled: true`, iOS bundle `com.wordshift.app`, no ad/tracking plugins, and a
  privacy manifest that declares only UserDefaults usage. `eas.json` has dev/preview/prod
  profiles. **Expo Go is the current run target — that ends the moment a native ad/IAP
  module lands** (see §2).
- **Legal docs contradict monetization.** `docs/terms.md`: amber *"cannot be purchased,
  sold, or exchanged."* `docs/privacy-policy.md`: *"There are no accounts, no ads, and no
  third-party tracking SDKs."* Both must be revised before any ad/IAP build ships (§6).
- **Telemetry is wired but dark.** `telemetry.ts` exists; `app.json` `extra.telemetryEndpoint`
  is `""`. **All monetization measurement (§8) depends on turning this on first.**

### LTV ceiling warning (read this before pricing anything)

WordShift is a **finite narrative title** (~12–15h to Phase 5; Phase 5 is currently a
narrative dead-end with no replay loop, daily-after-completion content, or seasonal hook).
This is the single biggest constraint on the model:

- **Retention collapses at Phase 5.** Subscriptions (Content Pass) and any ongoing-spend
  model assume content depth that does not exist. Do not build the subscription SKU for
  launch — it would churn instantly and invite refund/store-policy scrutiny.
- **The realistic model is front-loaded:** one strong IAP (Patron's Key) + opt-in rewarded
  video during the 12–15h playthrough + a small cosmetic shop. LTV is captured *during* the
  story, not after it.
- **The highest-leverage product work is not monetization — it's a Phase 5+ endgame loop**
  (endless/daily ladder, New Game+ with remembered choices, seasonal puzzle drops). Until
  that exists, treat Content Pass / season pass as a *post-launch* item gated on shipping
  replayable content. This is flagged again in §7 and §8.

---

## 1. Executive summary & recommended model

**Recommended launch model (in priority order):**

1. **Rewarded video (primary revenue + primary amber faucet).** Opt-in only. Word/narrative
   puzzle audiences are ad-tolerant when the ad is a clearly-labeled *choice* that grants a
   tangible boost ("Double this puzzle's amber", "Recover a hint"). This is the workhorse for
   the 95%+ who never pay.
2. **Patron's Key — one-time $6.99 IAP (primary paid conversion).** Ad-free + convenience +
   one exclusive cosmetic + cloud save. A one-time "support the game / turn off ads" purchase
   is the textbook fit for a premium-feeling finite narrative game. This is where the money is.
3. **Light interstitials (secondary, capped).** Between puzzles only, heavily exempted,
   auto-suppressed for Patron's Key holders. Pure incremental ARPDAU from non-payers; must
   never touch the narrative beats.
4. **Cosmetic shop (expression, amber-first + optional small IAP cosmetics).** Tile themes,
   confetti, room accents. Amber-purchasable items deepen the existing economy; a few
   premium cosmetic IAPs ($1.99–$2.99) give whales a second thing to buy.

**Deferred (post-launch, content-gated):** Content Pass / season subscription. **Do not ship
for launch** — no recurring content exists to justify it (see LTV warning).

**Rationale for this audience:** Word-puzzle players skew older, are spend-shy but
ad-tolerant, and value calm/uninterrupted sessions. WordShift additionally has a *tone
contract*: the horror only lands if the candy phase feels sincere. That argues for (a) opt-in
ads as the default, (b) a clean one-time "make it premium" purchase, and (c) absolute
discipline about never interrupting a phase-transition ceremony, the final puzzle, or Phase 5.

---

## 2. SDK choices for Expo SDK 54 (and what each demands)

> **Foundational reality:** every option below is a **native module**. The instant you add
> any of them, **Expo Go no longer runs the app.** You must move to **Expo Dev Client +
> EAS Build** for all development and testing. Budget this as workstream 0 (§7). `newArchEnabled:
> true` is already set — confirm each SDK version supports the New Architecture (all listed
> below do as of their current releases) or you will hit TurboModule crashes.

### 2.1 IAP — RevenueCat (`react-native-purchases` + `react-native-purchases-ui`)

**Choice: RevenueCat.** Over raw `expo-in-app-purchases` (deprecated/unmaintained) or
hand-rolled StoreKit2/Play Billing, RevenueCat gives a cross-platform entitlement system,
receipt validation, restore-purchases, and a dashboard — for a one-IAP + few-cosmetics
catalog the integration cost is days, not weeks.

Requires:
- `npm i react-native-purchases react-native-purchases-ui` and add the config plugin to
  `app.json` `plugins`. Rebuild dev client via EAS.
- RevenueCat project; **Entitlements**: `patron` (Patron's Key) and per-cosmetic entitlements
  or a single `cosmetics_*` set. **Offerings/Products** mapped to store products.
- **App Store Connect**: create non-consumable IAP `com.wordshift.patron_key`, plus any
  premium cosmetic non-consumables. Fill tax/banking, attach to a build, submit for review
  *with* the build (Apple reviews IAPs against a build).
- **Play Console**: create matching managed products; activate; complete the
  payments profile.
- Wire `Purchases.configure({ apiKey })` at boot (in the `App` bootstrap gate alongside
  `runMigrations()`), and a **Restore Purchases** button in `SettingsScreen.tsx`
  (App Store requires restore to be reachable).

### 2.2 Ads — AppLovin MAX mediation (recommended) or Google AdMob (`react-native-google-mobile-ads`)

**Choice: AppLovin MAX mediation** for rewarded + interstitial, *or* AdMob alone for a
simpler v1. MAX consistently yields higher rewarded eCPM via mediation, which matters
because rewarded is our primary ad revenue. For an MVP that ships faster, `react-native-
google-mobile-ads` standalone is acceptable and can add MAX/AdMob mediation later.

Requires (either SDK):
- Native module → **Dev Client + EAS Build mandatory**. `react-native-google-mobile-ads`
  ships an Expo config plugin (set `androidAppId`/`iosAppId` in `app.json`); MAX needs its
  Expo plugin + per-network adapters.
- **iOS App Tracking Transparency (ATT):** add `NSUserTrackingUsageDescription` to
  `app.json` → `ios.infoPlist`. Use `expo-tracking-transparency` to request ATT
  **at first ad exposure, not app launch** (per `MONETIZATION_PLAN.md` prereq #3, and better
  consent rates). If the user denies, ads still serve non-personalized.
- **Consent (UMP/CMP):** Google User Messaging Platform (bundled with the ads SDK) for
  GDPR/UK-GDPR consent; configure a CMP message. AppLovin has its own consent flow + UMP
  support. Required for EU/UK traffic.
- **Privacy manifests / data-use:** ads SDKs add tracking domains and required-reason APIs.
  Update `app.json` `ios.privacyManifests` (the SDK ships its own privacy manifest, but you
  must declare the app-level data collection in App Store Connect's Privacy questionnaire and
  Play's Data Safety form — see §6).
- **COPPA / age:** the game is rated 12+. Ensure ad SDK is **not** configured for child-directed
  treatment incorrectly, but do set `maxAdContentRating` to a teen-appropriate ceiling.

### 2.3 Tracking ID / attribution

Optional for launch. If running paid UA later, add the attribution piece (AppLovin's or
Adjust/AppsFlyer). Out of scope for the MVP; note that it also requires ATT.

### 2.4 What does NOT change

Pure-JS services (`amberCurrency`, `roomUpgrades`, `sacrifice`, etc.) need no native work and
remain unit-testable in the existing Jest setup. The native modules should be **wrapped behind
thin service shims** (`services/ads.ts`, `services/iap.ts`) that are mocked in tests exactly
like `audio.ts`/`haptics.ts` already are.

---

## 3. SKU & product list

| Product ID | Type | Price (USD) | Grants | Store setup |
|---|---|---|---|---|
| `com.wordshift.patron_key` | Non-consumable IAP | **$6.99** | Removes all ads forever; +2 amber/puzzle; exclusive "Patron" tile theme; extended Challenge undo; cloud save (when live); a "Restore" path | ASC + Play managed product; RevenueCat entitlement `patron` |
| `com.wordshift.theme_<name>` (×3–5) | Non-consumable IAP | **$1.99** each | One premium cosmetic tile theme (phase-aware variant) | RevenueCat entitlement per theme or `cosmetics` set |
| `com.wordshift.confetti_<name>` (×2–3) | Non-consumable IAP | **$1.99** | Premium confetti/victory effect | as above |
| `com.wordshift.cosmetic_bundle` | Non-consumable IAP | **$4.99** | All current premium cosmetics (value vs buying singly) | RevenueCat offering |
| Rewarded video placements | Ad unit | — (revenue via fill) | Amber/convenience boosts (§5) | AdMob/MAX ad unit IDs |
| Interstitial | Ad unit | — | none to player | AdMob/MAX ad unit IDs |

**No cash amber bundles** (hard rule). Amber is *earned* (or boosted via rewarded video).

**Cosmetics dual-currency note:** ship the *baseline* cosmetic shop as **amber-purchasable**
(deepens the existing economy / amber sink) and reserve a small number of **premium** themes
for IAP. Never sell the same cosmetic for both — amber items and IAP items are disjoint
catalogs, so amber never feels like "the currency I should have bought."

**Deferred SKUs (do not create at launch):**
- `com.wordshift.content_pass.monthly` ($1.99) / `.quarterly` ($4.99) — subscriptions.
  Gated on shipping replayable post-Phase-5 content. Creating a subscription with no recurring
  value risks App Store rejection and refund spikes.

---

## 4. Per-feature implementation breakdown (real files)

### 4.0 New service shims (create)

- **`src/services/iap.ts` (new).** Wraps RevenueCat. `initIAP()`, `getOfferings()`,
  `purchase(productId)`, `restorePurchases()`, `hasEntitlement(key): boolean` (cached).
  Initialized in the `App` bootstrap gate next to `runMigrations()`. Mockable for Jest.
- **`src/services/ads.ts` (new).** Wraps AdMob/MAX. `initAds()`, `loadRewarded()`,
  `showRewarded(placement): Promise<{completed: boolean}>`, `maybeShowInterstitial(context)`,
  `requestATTIfNeeded()`, `requestConsentIfNeeded()`. Internally no-ops when
  `entitlements.patron === true` (single choke point for "Patron removes ads").
- **`src/services/entitlements.ts` (new).** Thin façade over `iap.ts` that the rest of the
  app reads: `isPatron()`, `ownsCosmetic(id)`, `removeAds()`. Keeps RevenueCat types out of UI.
- **`src/services/cosmetics.ts` (new).** Owned/equipped cosmetic state in AsyncStorage
  (`wordshift_cosmetics`), mirroring the `roomUpgrades.ts` pattern (in-memory cache, clear
  fn). Tracks amber-bought items locally; cross-checks `entitlements` for IAP-bought items.
  Add its key to `SYNC_KEYS` in `cloudSave.ts`.

### 4.1 Patron's Key

- **Purchase UI:** new `src/components/PatronScreen.tsx` (reachable from `SettingsScreen.tsx`
  and a tasteful, dismissible home-screen entry — *not* a nag). Lists the 5 benefits; "Restore
  Purchases" button.
- **Ad removal:** automatic — `ads.ts` checks `isPatron()` and no-ops. No other wiring needed.
- **+2 amber/puzzle:** in `amberCurrency.ts` `awardPuzzleAmber()` (the function that already
  returns balance/phase/streak), add a flat `isPatron() ? PATRON_AMBER_BONUS : 0` term. Keep
  it additive and *outside* phase-progress math so it never accelerates the narrative.
  **Critical:** Patron must not change `phaseProgress`/`phasePuzzleThresholds` — pacing stays
  identical for free and paid (hard rule: no pay-to-skip-phases).
- **Exclusive tile theme:** register a `patron` theme in `cosmetics.ts`, auto-owned when
  `isPatron()`.
- **Extended Challenge undo:** Challenge undo limits live in the puzzle hook
  (`hooks/usePuzzleGame.ts`) / `CHALLENGE_MODE_CONFIG` (`types/homeWorld.ts`). Add a patron
  branch to the undo-limit lookup.
- **Cloud save:** see 4.4.

### 4.2 Rewarded video

- **Faucet hooks (all opt-in buttons):**
  - *Double victory amber:* in `VictoryModal.tsx` add an opt-in "Watch to double this
    offering" button. On `showRewarded('victory_double').completed`, call
    `awardBonusAmber(amount, 'rewarded_victory_double')`. Respect the deferred-harvest flow:
    add to the harvest batch, not directly, so it routes through the Offering Pit like normal.
  - *Hint recovery (Challenge):* in `usePuzzleGame.ts` hint path / Challenge UI, offer one
    rewarded hint per puzzle; **keep the star penalty** (per `MONETIZATION_PLAN.md`).
  - *Cooldown skip:* dialogue-session cooldown lives in `dialogueSession.ts` /
    `useDialogueFlow.ts`; offer "Watch to talk now". Never auto-prompt.
  - *Weekly quest bonus:* `weeklyQuests.ts` reward claim → optional "Watch to boost reward".
- **Anti-abuse:** daily cap on rewarded grants (e.g. 8/day) tracked in
  `gameBalance.ts` constant; amber from ads stays small relative to phase thresholds so it
  can't trivialize pacing.

### 4.3 Interstitials

- **Single choke point:** `ads.maybeShowInterstitial(context)` called from `App.tsx` on the
  puzzle→home/next transition only. All rules enforced here (see §5). Returns immediately for
  Patron holders and for every exemption.
- **Counter:** track puzzles-since-last-interstitial in AsyncStorage (`wordshift_ad_pacing`)
  or reuse `puzzlesSolved`. Frequency from `gameBalance.ts` (every 3rd Phase 0–2, every 5th
  Phase 3+).

### 4.4 Cloud save (unblocks Patron promise)

- **Swap the provider:** implement a real `CloudProvider` (Supabase or Firebase) in a new
  `src/services/cloudProviders/<provider>.ts` and call `setCloudProvider()` at boot — the
  interface in `cloudSave.ts` is already correct and `SYNC_KEYS` already enumerates every
  persisted key. **Add `wordshift_cosmetics`** to `SYNC_KEYS` when 4.0 lands.
- **Gate on entitlement:** only sync when `isPatron()`. Add upload-on-significant-change +
  download-on-launch-if-newer, and a manual "Sync now" in `SettingsScreen.tsx`.
- **Backend cost:** this is the one piece that adds operational cost/latency; if it slips,
  ship Patron's Key *without* cloud save and add it in a fast-follow (state this benefit as
  "Coming soon" on `PatronScreen` rather than promising it day one).

### 4.5 Cosmetic shop

> **STATUS: amber path SHIPPED.** `src/components/shop/ShopScreen.tsx` exists and is reachable from the Journal hub (`currentScreen: 'shop'`). It sells & equips **tile themes** for amber (`spendAmber(cost, 'cosmetic_<id>')` → `recordAmberCosmeticPurchase`, auto-equip). Themes live in `theme/colors.ts` `TILE_THEMES`; the equipped one is pushed in via `setEquippedTileTheme()` and resolved in `getTileColor()` (phase-aware preserved). `cosmetics.ts` gained `initCosmetics`/`getEquippedSync`/`unequipCosmetic`. **Still to do for real money:** add `kind:'iap'` cosmetic items (the catalog already supports them) once the dev-client + RevenueCat land, plus the Confetti / Room-Accent tabs. The original design below is retained.

- **UI:** new `src/components/shop/ShopScreen.tsx`, reachable from the HomeScreen utility menu
  (route added to `currentScreen` union in `App.tsx`). Tabs: Tile Themes / Confetti / Room
  Accents. Each item: preview, price (amber **or** IAP), owned/equip state.
- **Theme application:** extend `theme/colors.ts` to resolve the *equipped* tile theme from
  `cosmetics.ts` (fallback = current phase default). `LetterTile.tsx`/`getTileColor()` read
  the equipped palette. Keep all themes **phase-aware** so a bought theme still darkens with
  the story (tone contract).
- **Amber items:** purchase via existing `spendAmber(cost, 'cosmetic_<id>')` → mark owned in
  `cosmetics.ts`. Zero new currency.
- **IAP items:** purchase via `iap.purchase()` → entitlement → `cosmetics.ts` marks owned.

---

## 5. Ad placement rules (enforced in `ads.ts` / `App.tsx`)

**Rewarded (opt-in, never auto-shown):** victory amber double, Challenge hint recovery
(keeps star penalty), dialogue cooldown skip, weekly-quest bonus. Each is a button the player
taps. Daily grant cap to prevent farming.

**Interstitial (auto, capped) — show ONLY when ALL are true:**
- Not a Patron's Key holder.
- Frequency gate met (every 3rd puzzle Phase 0–2; every 5th Phase 3+).
- Transition point is puzzle→home or puzzle→next (never mid-puzzle).

**Interstitial HARD EXEMPTIONS (never show):**
- First 10 puzzles (FTUE protection).
- Onboarding flow (any step).
- Daily Challenge runs.
- Immediately after a failed/timed-out puzzle (Speed `GAME_OVER`).
- During/around any **phase-transition ceremony** (pit ward ignition + `PhaseTransitionOverlay`).
- The **final puzzle** (`FINAL_PUZZLE_EVENT`) and the post-revelation puzzle.
- **All of Phase 5** (terrible-peace tone must be unbroken).

**Tone guard:** route all ad copy/placement through the same review checklist as
`MONETIZATION_PLAN.md` — does it interrupt the loop at a bad moment, pressure minors, or break
the current phase's tone? If yes, redesign.

---

## 6. Store & legal prerequisites

**Legal docs (must change before any ad/IAP build ships):**
- **`docs/terms.md`** currently says amber *"cannot be purchased, sold, or exchanged."*
  Revise: amber still isn't *directly* purchasable for cash (hard rule holds), but the app now
  contains IAPs (Patron's Key, cosmetics) and ads; rewarded video grants amber. Add standard
  IAP/virtual-goods, "no real-world value / non-transferable / may be rebalanced",
  no-refund-except-as-required, and ads clauses.
- **`docs/privacy-policy.md`** currently says *"no accounts, no ads, and no third-party
  tracking SDKs."* Both clauses become false. Rewrite to disclose: the ad SDK and its
  partners, advertising identifiers (IDFA/GAID), data shared for ads, ATT, the consent
  mechanism, RevenueCat receipt data, and (if cloud save ships) account/save data + provider.
  Update the "diagnostics off" section once telemetry is enabled (§8).
- **`src/constants/links.ts`** already points Settings at the GitHub-Pages docs — no code
  change needed, just republish the updated docs.

**iOS (App Store Connect):**
- ATT: `NSUserTrackingUsageDescription` in `app.json` `ios.infoPlist`; request at first ad
  exposure.
- App Privacy questionnaire: declare ad-related data collection/tracking + purchase data.
- Update `ios.privacyManifests` required-reason APIs (ad SDK adds some); SDK ships its own
  manifest but app-level declaration is still required.
- Create the IAP products; attach to the review build.
- `ITSAppUsesNonExemptEncryption: false` already set — verify still true with new SDKs.

**Android (Play Console):**
- Data Safety form: declare ads, advertising ID, data sharing.
- Ads declaration ("Contains ads" label) — required once ads ship.
- Add the `com.google.android.gms.permission.AD_ID` permission (ads SDK plugin handles this)
  and Data-Safety-declare it.
- Create managed products; complete payments profile.
- Target API level / SDK compliance check on the EAS production build.

**Both:** age rating already 12+ (horror themes) — ensure ad content rating ceiling matches;
configure UMP/CMP for EU/UK; set up RevenueCat with both stores' shared secrets.

---

## 7. Effort estimate & phased rollout

Estimates are engineer-weeks (one senior RN engineer); QA/store review are calendar overhead.

| Workstream | Eng-weeks | Notes |
|---|---|---|
| **W0. Dev Client + EAS migration** | 0.5 | Drop Expo Go; verify New-Arch compat of new modules. Prereq for everything. |
| **W1. Telemetry live** (`telemetry.ts` endpoint) | 0.5–1 | Hard prerequisite for measuring anything. Includes collector/backend. |
| **W2. IAP + Patron's Key** (`iap.ts`, `entitlements.ts`, `PatronScreen`, amber/undo/theme wiring, restore) | 1.5–2 | RevenueCat + store product setup. |
| **W3. Ads — rewarded** (`ads.ts`, ATT, UMP, victory/hint/cooldown/quest hooks) | 1.5–2 | Includes consent + ATT plumbing. |
| **W4. Ads — interstitial** (choke point + exemption rules in `App.tsx`) | 0.5–1 | Small once `ads.ts` exists; mostly the exemption matrix + tests. |
| **W5. Cosmetic shop** (`cosmetics.ts`, `ShopScreen`, theme resolution in `colors.ts`/`LetterTile`) | 2 | Most UI-heavy; art for premium themes is separate. |
| **W6. Cloud save backend** (real `CloudProvider`, gate on patron, Settings sync) | 1.5–2 + backend | Operational cost; can fast-follow. |
| **W7. Legal/store updates** (terms, privacy, ASC/Play forms) | 0.5 | Plus store review latency. |

**Rollout phases:**

- **MVP monetization (W0+W1+W2+W4):** Dev Client migration, telemetry on, **Patron's Key**
  (without cloud save → mark "coming soon"), and **capped interstitials**. Ships the paid
  conversion path + a non-payer revenue floor with the least surface area. ~3.5–4.5 eng-weeks.
- **Full v1 (+W3+W5):** rewarded video faucet + cosmetic shop. This is where ARPDAU and
  expression spend actually grow. ~+3.5–4 eng-weeks.
- **Fast-follow (+W6):** cloud save backend; flip Patron benefit from "coming soon" to live.
- **Deferred / content-gated:** Content Pass subscription — **only after** a replayable
  post-Phase-5 loop exists (see §8). Do not schedule against current content.

---

## 8. Risks & measurement

**Risks:**
- **Finite-content LTV ceiling (highest).** ~12–15h and a Phase-5 dead-end cap whale value and
  kill any subscription. Mitigation: front-load monetization into the playthrough; treat a
  post-Phase-5 endless/daily/New-Game+ loop as the real revenue unlock and the prerequisite
  for any season/Content Pass.
- **Tone damage.** A mistimed ad (phase ceremony, final puzzle, Phase 5) breaks the entire
  narrative payoff and tanks reviews. Mitigation: the exemption matrix in §5, enforced at one
  choke point, with unit tests asserting "no interstitial in {exemptions}."
- **Store rejection.** Stale terms/privacy ("no ads"), missing ATT/consent, or a subscription
  with no recurring value. Mitigation: §6 done *before* the build; defer subscriptions.
- **Native-module instability** under New Architecture. Mitigation: pin SDK versions known to
  support New Arch; smoke-test on a physical low-tier device (`deviceTier.ts` already exists).
- **Measurement blind launch.** Without telemetry, you can't tune frequency/eCPM. Mitigation:
  W1 is non-negotiable and sequenced first.

**Instrument (depends on `telemetry.ts` being live):**
- *Ads:* rewarded `offered / started / completed / reward_granted`, interstitial
  `eligible / shown / dismissed`, fill rate, eCPM by placement & phase, ATT/consent
  accept rates.
- *IAP:* `patron_screen_view / purchase_started / purchase_success / restore`, cosmetic
  purchase funnel (amber vs IAP split), conversion rate by phase reached.
- *Economy:* amber faucet vs sink ratio (puzzle rewards + rewarded video vs roomUpgrades +
  sacrifice + cosmetics), so the shop doesn't inflate amber past sinks.
- *Retention/LTV proxy:* D1/D7/D30, phase-reached distribution, **% reaching Phase 5 and what
  they do next** (this number sizes the post-Phase-5 content investment), ARPDAU,
  ad-ARPDAU vs IAP-ARPU.
- *Guardrail metrics:* review-score trend after ad launch; rage-quit / uninstall after first
  interstitial; refund rate on Patron's Key.
