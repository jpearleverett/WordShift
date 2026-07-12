# WordShift — Store Listing Kit

Working copy for the App Store / Google Play listings. The hook of the game is
the tonal bait-and-switch — the listing must *hint* at the darkness without
spoiling the reveal, while the age rating must declare it honestly.

## Identity

- **App name:** WordShift
- **iOS subtitle (≤30 chars):** `Cozy word game. Mostly.`
- **Android short description (≤80 chars):**
  `Shift letters in a cozy word puzzle. Meet animal friends. They've been waiting.`

## Full description

```text
SHIFT ONE LETTER. CHANGE EVERYTHING.

WordShift is a cozy letter game built around one satisfying rule: move a letter from one word into the next, and keep both words real.

HOW IT WORKS

• Pick a letter from the current word.
• Drop it into the word below.
• Keep both results valid.
• Continue the chain to complete the puzzle.

Simple to learn. Surprisingly clever to master.

BUILD A HOME FROM YOUR WORDS

Every solved puzzle earns amber for a growing woodland house. Build 13 rooms, welcome 13 unlikely animal companions, and return to hear what they have to say.

They are warm, funny, thoughtful, and very glad you found them.

MASTER EVERY KIND OF SHIFT

• Four difficulty levels for quick or demanding sessions
• Reverse Shift journeys down the chain and back again
• Double Shift moves two letters at every step
• Speed Shift tests how quickly you can see the pattern
• Blind Offering hides previews for a true mastery challenge
• Thousands of curated and generated word puzzles

RETURN EACH DAY

Take on a shared Daily Challenge, protect your streak, complete daily and weekly quests, unlock 51 achievements, and chase flawless solves with no hints, mistakes, or undos.

A COZY GAME. MOSTLY.

The longer you stay, the more the house changes. Familiar conversations take on new meanings. The animals remember the words you make.

Some mysteries unfold slowly.

PLAY YOUR WAY

• Core puzzles work offline
• No account required
• Optional hints and accessibility settings
• Reduced-motion support
• Free to play with occasional ads
• Optional purchases for convenience and cosmetic expression
• The main mystery unfolds through play, not purchases.

WordShift is a slow-burn word game and mystery for players 13 and older.

The house is ready.
They've been waiting.
```

## Keywords (iOS, ≤100 chars)

`word,puzzle,letters,anagram,cozy,daily,streak,brain,horror,story,animals,offline`

## Age rating guidance

- **ESRB:** Teen (fantasy themes, mild horror) — answer "infrequent/mild horror/fear themes" honestly in the questionnaire.
- **PEGI:** 12 (moderate horror themes, no violence, no profanity — dictionary is filtered).
- **Apple:** 12+ — "Infrequent/Mild Horror/Fear Themes."
- **Contains ads:** Yes (Google AdMob — interstitial + opt-in rewarded). Declare it in the Play "Ads" question. `app-ads.txt` is live at the domain root (`https://jpearleverett.github.io/app-ads.txt`, pub-6575205005908086).
- **Contains in-app purchases:** Yes — 9 products (amber packs, hint packs, one-time starter bundle, Remove Ads, Patron's Key, cosmetic bundle; all created + activated in Play Console 2026-07-02). Play derives the displayed price range from the active products automatically.
- **Target audience:** 13+ (do not target children — ads + dark themes). Avoids the Families policy.

## Data safety / privacy (Play Data Safety + Apple Privacy)

Backend features are LIVE (Supabase + Sentry + AdMob + Google Play Billing), so you must declare data collection — do **not** mark "no data collected". The Play data-safety form was submitted with this inventory (2026-07-02); keep the list, the privacy policy, and the form in sync. Declare:

- **App interactions / analytics** — anonymous events (install id, platform, app version, event type + non-identifying event details) → Supabase. Purpose: analytics. Not linked to identity, not shared for ads.
- **Crash logs & Diagnostics** — device model, OS, app version, stack traces → Sentry. Purpose: app functionality / diagnostics.
- **Device or other IDs — Advertising ID** — collected by Google AdMob. Purpose: advertising/marketing. May be shared with Google.
- **Approximate location** — coarse, IP-derived, collected by Google AdMob for ad serving. Purpose: advertising/marketing.
- **Purchase history** — entitlement/purchase records via Google Play Billing / RevenueCat. Purpose: app functionality.
- **App info & performance / "Other" save data** — cloud backup of the game save (stored under a random install id, synced automatically when online) + daily leaderboard result (time/stars/hints, only if the player plays the daily) → Supabase.

Legal pages are **LIVE and publicly accessible** via GitHub Pages (deployed from branch, `/docs`). Use these URLs in the store consoles and in-app Settings (all three are also wired into `mobile/src/constants/links.ts`):

- Privacy policy URL (required, both stores): `https://jpearleverett.github.io/WordShift/privacy-policy/`
- Terms of Service URL: `https://jpearleverett.github.io/WordShift/terms/`
- Data deletion URL (Play Data Safety — account/data deletion): `https://jpearleverett.github.io/WordShift/data-deletion/`

## Asset checklist

- [x] App icon 1024×1024 — `mobile/assets/icon.png`
- [ ] Android phone screenshots ×7, seven-shot regeneration pending — `docs/play-store/final/`
- [x] Feature graphic 1024×500 (Play), generated — `docs/play-store/final/feature-graphic.png`
- [ ] iPhone 6.7" screenshots ×5 (needs device/simulator)
- [ ] iPad 12.9" screenshots ×3 (supportsTablet is true)

### Android screenshot campaign (final upload order)

| # | Final upload path | Headline | Support line | Unique alt text | Visible authentic state |
|---:|---|---|---|---|---|
| 1 | `docs/play-store/final/01_shift_one_letter.png` | SHIFT ONE LETTER | Move it down. Keep both words real. Something remains. | WordShift puzzle board with the letter L selected and valid and invalid destination word previews visible. | Phase 0 puzzle board with L selected from PLAY and destination previews shown over PANT. |
| 2 | `docs/play-store/final/02_every_word_stays_real.png` | EVERY WORD STAYS REAL | Build a chain one clever move at a time. The words remember. | WordShift puzzle showing PAY, PLANT, and HEAR midway through a valid letter-shifting chain. | Phase 0 puzzle board midway through the PAY, PLANT, HEAR chain with PLANT active. |
| 3 | `docs/play-store/final/03_build_a_home.png` | BUILD A HOME | Your words bring every room to life. Every room was waiting. | Sunny WordShift house with several furnished rooms and multiple animal companions. | Sunny house showing the Cozy Den, Rustic Kitchen, Scholar's Study, Aquarium Room, and their companions. |
| 4 | `docs/play-store/final/04_meet_unlikely_friends.png` | MEET 13 UNLIKELY FRIENDS | They always have something to tell you. Never everything. | Ember the fox speaking to the player in a warm dialogue scene over the animal house. | Ember's warm introductory dialogue open over the sunny animal house. |
| 5 | `docs/play-store/final/05_master_every_mode.png` | MASTER EVERY MODE | Reverse it. Race it. Hide the previews. The pattern still grows. | WordShift setup menu displaying Standard, Reverse, Double Shift, Speed, and Blind Offering modes. | Puzzle setup menu with Standard selected and Reverse Shift, Speed Shift, Double Shift, and Blind Mode visible. |
| 6 | `docs/play-store/final/06_flawless_offering.png` | CHASE A FLAWLESS OFFERING | No hints. No mistakes. It notices perfection. | WordShift victory screen showing a flawless three-star solve and amber rewards. | Phase 0 victory modal with three stars, a FLAWLESS ribbon, the PAY to PLAN to HEART chain, and amber rewards. |
| 7 | `docs/play-store/final/07_theyve_been_waiting.png` | THEY'VE BEEN WAITING | Some houses remember every word. | WordShift animal house at dusk beneath a purple-orange sky, with the Jungle Hammock locked above furnished rooms. | Phase 2 dusk house with the Jungle Hammock still locked and no late-story imagery. |

Final feature graphic: `docs/play-store/final/feature-graphic.png`
Feature graphic alt text: Ember the fox beside the exact WordShift logo, candy tiles, glowing amber, and a sunny-to-dusk forest with subtle distant eyes.

Never show Phase 3+ content, the robed sprites, or the shadow figure in store
assets — the reveal is the product.

## Release notes template (1.0)

> The house is ready. The animals are waiting.
> • Thousands of letter-shifting puzzles across four difficulties
> • 13 animal friends, a house to build, a daily challenge to share
> • Streaks, quests, achievements, and a story that unfolds the longer you stay
