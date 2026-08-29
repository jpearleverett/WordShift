# WordShift — What's Left (finish the game, then make it great)

**Audited:** 2026-08-29 against `main` at `669b396` (`app.json` version **1.2.2**, `versionCode` **88**).
**This document is the remaining-work inventory.** It supersedes stale counts in `LAUNCH_CHECKLIST.md` (still says versionCode 47 / 1.5.0), `PRESS_KIT.md` (1.5.0, 51 achievements, 11,400-word dictionary), and `STORE_LISTING.md` (51 achievements). Those files still contain the *human* console tasks; the numbers in them have drifted.

The short answer: **the game is built.** What is left is not another systems pass. It is (1) shipping an honest 1.0, (2) closing a short list of identity-level craft gaps a critic would feel, and (3) finding an audience without adding features that dilute the hook.

---

## Verdict

WordShift already has the ingredients great indie games are made of: a one-sentence hook, a physically satisfying core verb, a long written soul, and a tonal turn that people will tell each other about. The 180-finding AAA audit is **174 done / 3 partial / 3 deferred**. The puzzle banks, dialogue corpus, pit economy, house, variants, daily, season pass, cloud save, and Android monetization path are implemented.

What is *not* true: it is not "fully finished" as a shipped product, and it is not yet in a position to be called one of the greats of the era. Greatness here is blocked more by **go-to-market and last-mile craft** than by missing game systems.

| Bar | Status | What still decides it |
|---|---|---|
| **Feature-complete** | Yes | Do not add a new mode, live-ops calendar, or social graph. |
| **Honest 1.0 (Android)** | Almost — human/console/QA | Production ad flip, Supporter SKU, screenshot hygiene, remaining device pass. |
| **Honest 1.0 (iOS)** | Not started | Entire console track empty. Worth ~2× audience if you want it. |
| **Critic-proof craft** | Short tail | Animals still mostly static; core commit has no flying tile; climax art frames missing; EXPERT dread is thin. |
| **Era-defining** | Not a code problem | Trailer, press, iOS, Wordle-grade share moments, and time in culture. Outer Wilds and Inscryption did not get there by shipping a tenth system. |

---

## What is already at the bar (do not rebuild)

These are genuinely strong. Treat them as finished unless a player report contradicts them.

- **The hook.** Cozy letter-shift that becomes a cult summoning. Phase-aware copy, art, audio, tiles, and cottage skin stay in lockstep. The entity is never named. Phase numbers never appear in the UI.
- **The core verb.** Graded previews teach, then step back at solve 12. Multi-route banks by construction. Move resonance, house asks, trap steering. Solvability CI over all banks.
- **Content volume.** 30 banks / ~9,576 puzzles. Dictionary 22,749 words. 1,742 base dialogues + 260 post-revelation + Phase-5 pool. 13 animals, 13 rooms, 56 achievements (code: `achievements.ts`).
- **Retention, already shipped.** Daily ramp + freeze, quests, notification ladder, season pass, New Cycle, full-moon event, daily leaderboard, win-back rungs.
- **Economy ethics.** Amber never buys story. Ads mute in the dark phases. That *is* a growth lever (`GROWTH_STRATEGY.md`).
- **Engineering.** Cloud conflict guard, pending-IAP recovery, harvest credit ledger, ~2,800+ tests, Sentry + Supabase live on Android.

If a future pass wants to "add more game," the correct answer is almost always **no**. The failure mode for this project is overbuilding past the moment it should ship.

---

## Tier 0 — Ship the 1.0 (Android)

Nothing in this tier is a missing feature. All of it is **owner / console / device** work. Code cannot close these.

### Must do before a public Play production cut

1. **Flip `adsUseTestIds` to `false` only on the production cut.** It is `true` in `mobile/app.json`. Serving live ads on internal/closed builds and tapping them is an AdMob policy risk. `productionConfig.test.ts` asserts the safe state unless `WORDSHIFT_PRODUCTION_CUT=1`.
2. **Create the Supporter subscription in Play Console + RevenueCat.** App path is wired (`com.wordshift.supporter_monthly` → `supporter`). Console-side is still open (`LAUNCH_CHECKLIST.md`, `MONETIZATION_SETUP.md`).
3. **Match Play price tiers to the fallback labels.** Remove-Ads $5.99, Patron $8.99, Supporter $3.99/mo. Live `priceString` must agree with the UI fallback.
4. **Re-capture store screenshot #5.** The uploaded PNG still advertises "+50% Challenge amber." The shipped menu pays **+25%** (`DifficultyMenu.tsx`). Listing *copy* is corrected; the binary image is not. Do not ship a store update that keeps the +50% frame.
5. **Correct store listing counts.** Description still says **51 achievements**. Code has **56**. Dictionary / puzzle counts in `PRESS_KIT.md` are similarly stale (11,400 / ~4,700 vs 22,749 / ~9,576).
6. **Bump `android.versionCode`** for the next upload (currently **88**). `autoIncrement` is off on purpose.
7. **Finish the remaining on-device matrix** (`LAUNCH_CHECKLIST.md` still unchecked):
   - Onboarding end-to-end on a fresh install
   - UMP consent (EEA / debug geography) + Settings → Privacy Options
   - Interstitials + rewarded (test units, then one live-fill check after the production flip)
   - Notification tap routing including cold start
   - Deep links (`wordshift://challenge/...`)
   - PNG share card on a real EAS/Play build (Expo Go is text-only by design)
   - Challenge + Blind on a post-trial-ladder build
8. **Closed-test 12 testers / 14 days.** Checklist says started 2026-07-13 (eligible ~2026-07-27). Today is 2026-08-29. If testers stayed opted in, this gate is likely already satisfied — **confirm in Play Console**, do not re-run it from the stale doc.

### Should do on the same release

- **Press build:** set `expo.extra.creatorCode` on a *press-only* binary (empty in shipping). Hand it out with `PRESS_KIT.md`. Fill the press-contact placeholder.
- **Trailer / 30–45s store video.** The press kit asks for screenshots and GIFs "on request" and ships no trailer. Side-by-side Phase 0 vs Phase 4 of the same screen is the thumbnail. This is the single highest-leverage artifact the game does not have.
- **`npx expo install --check` before the cut.** `expo-doctor` is currently **20/22**: SDK 56 patch drift (e.g. `expo` 56.0.15 vs ~56.0.21) plus a Hermes V1 memory note. Not a gameplay blocker; do not ignore it on the production binary.

### Explicitly not a 1.0 blocker

- iOS (separate track — see Tier 3)
- EXPERT dread regeneration (quality, not crash)
- Remaining AAA partials F1 / F37 / F138
- Room-background virtualization (F135)
- Cloud-save server-monotonic version (clock-skew edge case)
- A live-ops calendar beyond the full moon

---

## Tier 1 — Craft a critic would still ding

These are the last *game* gaps that keep WordShift from feeling finished in the hand, not on a spreadsheet. Ordered by how much they touch the game's identity.

### 1. The animals are still mostly furniture

The emotional contract is "you should like these animals, then feel the betrayal." That contract is carried by **writing**, not by life on screen.

| Fact | Evidence |
|---|---|
| 13/13 have idle + talk + robed | `CHARACTER_SPRITES` in `AnimalSprite.tsx` |
| **1/13 has a real walk cycle** | Fox only (`walk_0..9`). The other 12 use a procedural gait. |
| **0/13 have `robedTalk.png`** | Hook is shipped; portraits stay a frozen robe for the climax's biggest lines (`AnimalSprite.tsx` comments at the `robedTalk` field; `HomeScreen.tsx` falls back). |
| Dialogue typewriter | **Shipped** (`DIALOGUE_REVEAL_CHAR_MS = 22` in `useDialogueFlow.ts`). Do not rebuild it. |

**What "great" looks like here:** at least the flagship animals (Ember, Panko, Archimedes, and the descent trio) get walk cycles and a `robedTalk` frame. Procedural gait for the rest is acceptable. This is **player-supplied art**, the same path the other frames used. Code is waiting.

This is the highest-leverage remaining *craft* item. Monument Valley and Cult of the Lamb are remembered for characters that feel inhabited.

### 2. The core verb still teleports on commit

Neighbour tiles now rank-close. The moved letter still does not travel source → target as a flying ghost (**F1**). The most-repeated action in the game is a state swap.

Held on purpose: it is an animation-architecture change on the input hook, and it cannot be visually signed off without a device. When you do it, do it on a dedicated branch with a device pass — do not dump it into a production cut.

### 3. The climax vocabulary thins at the apex

EXPERT standard bank: **14 of 195** boards at dread tier ≥ 3, versus **93 of 457** on HARD. One board at tier 4. Documented in `CLAUDE.md` as known-not-fixed. 6-letter dread words are scarce; closing this is an offline gated regeneration, not a weekend tweak.

A player who saves the hardest boards for the reveal will meet the weakest horror vocabulary. That is an identity bug, not a content-count bug.

### 4. The Arrival can still be skipped with no encore

`markFinalPuzzleCompleted()` persists **before** `queueEndgameCinematic(FINAL_PUZZLE_EVENT)` (`App.tsx`). A victory-exit inside the 1.5s window is rescued via `pendingEndgameEventRef`. Once the overlay is up, **Skip calls `onComplete`** and the flag is already written — the 32-second descent never comes back for that save.

For a game whose entire thesis is that 90+ puzzles were an incantation, losing The Arrival to a habitual tap is the one unforgivable miss. Belt-and-braces: persist a `pendingArrivalReplay` (or refuse Skip on this event, or replay on next launch until watched). Effort: hours. Do this before any press build.

### 5. Store / press artifacts still lie a little

- Screenshot #5 (+50% vs +25%) — see Tier 0.
- Achievement count 51 vs 56.
- Press kit version 1.5.0 vs shipped 1.2.2.
- `shareFrame` exists on `ShareableResult` and is never populated from `App.tsx` `buildShareData`.
- Friend-challenge links encode **standard** boards only.

None of these are the game. All of them are how the game introduces itself.

---

## Tier 2 — What would actually make it *great*

Great indie games of this era (Celeste, Outer Wilds, Inscryption, Balatro, Cult of the Lamb, Monument Valley, Unpacking) share four traits WordShift already has or can finish. They do **not** share a live-ops roadmap.

### Already present — protect these

1. **A sentence you can say at a party.** "It's a cute word game that slowly turns into a cult." Do not bury this under modifiers.
2. **Feel in the fingers.** Tiles, haptics, combo ladder, cottage chrome. Finish F1 when you can verify it; do not invent a second verb.
3. **An aftertaste.** The descent, the pit, the robes, the silent victory, the Arrival. Protect ads-out-of-Phase-4. Never sell the story.
4. **They shipped.** Balatro and Inscryption became era-defining after they were *out*, not after the twelfth systems pass.

### The actual greatness work (small list)

1. **Ship Android 1.0.** A finished game in zero stores is not a great game.
2. **Make the animals alive enough to love.** Walk + robedTalk on the leads (Tier 1.1). Writing cannot carry the betrayal alone if the sprites feel like stickers.
3. **Make the first 20 minutes undeniable.** Device-sign the cold open. The graduation card, first harvest, and first Fox invite must land on a mid-tier phone without a hitch. First-session E2E is still unchecked.
4. **Give the turn a clip.** One trailer. One side-by-side thumbnail. One creator-code press build. The reveal is the growth engine (`GROWTH_STRATEGY.md`). Paid UA does not pencil; organic + press + share is the plan.
5. **Make sharing a habit, not a button.** The card is already spoiler-safe and beautiful. What is thin: share lives only on the victory modal; variant wins cannot challenge-link; `shareFrame` is unwired. NYT Games won the era with a grid people pasted every morning. WordShift already has the grid. Surface it on the daily card and after streaks, not only after a modal.
6. **iOS when you want the era, not when you want the build.** iOS is ~2× revenue and most of the press/featuring conversation. It is also an entire console track (Developer Program, RevenueCat iOS key, AdMob iOS app id + units, 10 SKUs, ATT/nutrition labels, 6.7"/6.9" shots, TestFlight). Do not start it mid-Android-cut. Do start it if "great of this era" is the real goal — that era's critics and playlists are still iOS-heavy.

### What would *not* make it great (do not do these)

- A bigger live-ops calendar. One full moon + a monthly season pass is enough for a narrative game. Cult of the Lamb's live-ops is not why people remember it.
- Friends, clubs, chat. The social proof and daily leaderboard are the right scale.
- More variants. The stack is already deep (reverse / double / speed / challenge / blind / lexicon / weave / expert). Combo presets were correctly removed from the menu.
- Partial pit withholding. Documented non-goal.
- App-wide `useWindowDimensions` (F138) or room virtualization (F135). Portrait-locked; board already scales. Low value, real regression risk.
- Web as a product. Metro stubs exist for agent/dev. It is not a SKU.

---

## Tier 3 — iOS track (separate product)

All values below are empty in `mobile/app.json` today. An iOS build that includes the AdMob SDK **without** an iOS app id crashes at launch. Until the starred keys exist, iOS IAP/ads correctly no-op.

- Apple Developer Program + App Store Connect app (`com.wordshift.app`)
- ★ `revenueCatIosKey`
- ★ AdMob iOS app id in the `react-native-google-mobile-ads` plugin (Android-only today)
- ★ `admobInterstitialIdIos` / `admobRewardedIdIos` / `admobBannerIdIos`
- AdMob GDPR message that includes the iOS app
- 10 SKUs + 5 RevenueCat entitlements (same ids)
- App privacy nutrition labels
- iPhone 6.7"/6.9" and iPad 12.9" screenshots (`STORE_LISTING.md` still unchecked)
- EAS iOS credentials + TestFlight

Tablet: `supportsTablet: true`; the puzzle board scales (`computeBoardScale`). There is no dedicated iPad layout. Fine for 1.0; a critic may call it a blown-up phone.

---

## Honest remainder from the AAA ledger

Authoritative leftover after Session 5b (`docs/AAA_IMPLEMENTATION_LEDGER.md`):

| ID | Status | Action |
|---|---|---|
| **F1** cross-row flying ghost | Partial | Device-verified board pass (Tier 1.2) |
| **F37** `robedTalk.png` × 13 | Partial | Art (Tier 1.1) |
| **F138** app-wide resize sweep | Partial | Skip unless fold/split becomes real |
| **F135** room pan virtualization | Deferred | Skip |
| **F132** real Play screenshots ≥1080px | Deferred | Owner device capture (Tier 0) |
| **F148** screenshot #5 +50% | Deferred | Owner device recapture (Tier 0) |

Session-5 notes that conflict with the top-of-file remainder (e.g. older F141 "home flash" rows) are stale — Session 5b closed F141.

---

## Recommended sequence

Do these in order. Stop adding scope.

1. **This week (owner, no code):** Play Console — confirm closed-test eligibility; create Supporter SKU + `supporter` entitlement; set price tiers; recapture screenshot #5; fix listing counts (56 achievements). Device-pass the unchecked rows on a mid-tier Android.
2. **This week (small code, before press):** Persist/replay The Arrival if skipped. Sync `PRESS_KIT.md` / `LAUNCH_CHECKLIST.md` / `STORE_LISTING.md` to version **1.2.2**, versionCode **88**, 56 achievements, current bank/dictionary sizes.
3. **Production cut:** `WORDSHIFT_PRODUCTION_CUT=1` (or equivalent), `adsUseTestIds: false`, bump versionCode, one live-ad fill check, submit.
4. **Art pass (greatness):** walk cycles + `robedTalk` for Ember and the animals the trailer will show. Then the rest if energy remains.
5. **Board feel (greatness):** F1 flying ghost, on-device only.
6. **EXPERT dread regen** as an offline quality job after 1.0, not before.
7. **Trailer + press build** with `creatorCode`. Pitch the turn, not the modifier stack.
8. **Share surface** on the daily (after 1.0 is live and the card is proven on device).
9. **iOS** as its own project, after Android is actually in production.

---

## Definition of done

**Finished 1.0 (Android):** public production build with live ads, honest screenshots, working IAP including Supporter, closed-test gate cleared, first-session and deep-link/share/UMP signed off on a real device.

**Finished enough to be *great*:** the above, plus Arrival unmissable, animals alive enough to love, a trailer that sells the turn, and the daily share loop used as a habit.

**Era-defining:** the above, plus iOS, time in culture, and people quoting the animals who have never opened a word-game review. That last part is not a backlog item.

---

## Sources

- `mobile/app.json` — version 1.2.2, versionCode 88, iOS keys empty, `adsUseTestIds: true`, `creatorCode: ""`
- `docs/LAUNCH_CHECKLIST.md` — human/console tasks (some dates and version numbers stale)
- `docs/AAA_IMPLEMENTATION_LEDGER.md` — 174/180; remainder F1, F37, F138, F135, F132, F148
- `docs/AAA_DESIGN_AUDIT.md` — original critic bar (Monument Valley II, Alto, Two Dots, Cult of the Lamb, NYT)
- `docs/GROWTH_STRATEGY.md` — organic/press/share; paid UA does not pencil
- `docs/STORE_LISTING.md`, `docs/PRESS_KIT.md`, `docs/MONETIZATION_SETUP.md`
- `CLAUDE.md` — EXPERT dread 14/195; iOS NoOp; cloud clock-skew follow-up
- `mobile/src/components/home/AnimalSprite.tsx` — walk/robedTalk inventory
- `mobile/App.tsx` — `queueEndgameCinematic` / `markFinalPuzzleCompleted` order
- `mobile/src/services/achievements.ts` — 56 ids
