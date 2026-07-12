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
- [x] Android phone screenshots ×8, generated and validated against the ORIGINAL banner copy — `docs/play-store/final/`
- [ ] Re-render screenshot banners with the REVISED copy below (headlines/support lines changed 2026-07-12) + fix the review findings in the regen checklist
- [x] Feature graphic 1024×500 (Play), generated — `docs/play-store/final/feature-graphic.png`
- [ ] iPhone 6.7" screenshots ×5 (needs device/simulator)
- [ ] iPad 12.9" screenshots ×3 (supportsTablet is true)

### Android screenshot campaign (final upload order)

Copy revised 2026-07-12: plain, benefit-led lines up front; the ominous beat is
rationed to one soft tease (#4), a medium tease (#7), and the closer (#8) — the
old version stamped a spooky fragment on every frame and read as mannered.
File names keep their original headline slugs (e.g. `02_every_word_stays_real`,
`06_flawless_offering`) even where the banner headline has since changed — the
paths are upload artifacts; do not rename them.

| # | Final upload path | Headline | Support line | Unique alt text | Visible authentic state |
|---:|---|---|---|---|---|
| 1 | `docs/play-store/final/01_shift_one_letter.png` | SHIFT ONE LETTER | Take a letter from one word, tuck it into the next. Both must stay real. | WordShift puzzle board with the letter L selected and valid and invalid destination word previews visible. | Phase 0 puzzle board with L selected from PLAY and destination previews shown over PANT. |
| 2 | `docs/play-store/final/02_every_word_stays_real.png` | ONE MOVE, TWO WORDS | Every shift rewrites two words at once. Easy to learn, tricky to master. | WordShift puzzle showing PAY, PLANT, and HEAR midway through a valid letter-shifting chain. | Phase 0 puzzle board midway through the PAY, PLANT, HEAR chain with PLANT active. |
| 3 | `docs/play-store/final/03_build_a_home.png` | BUILD A HOME | Turn puzzles into amber. Turn amber into a cozy woodland home. | Sunny WordShift house with several furnished rooms and multiple animal companions. | Sunny house showing the Cozy Den, Rustic Kitchen, Scholar's Study, Aquarium Room, and their companions. |
| 4 | `docs/play-store/final/04_meet_unlikely_friends.png` | MEET 13 UNLIKELY FRIENDS | Each one has stories to share, and a few they're saving for later. | Ember the fox speaking to the player in a warm dialogue scene over the animal house. | Ember's warm introductory dialogue open over the sunny animal house. |
| 5 | `docs/play-store/final/05_master_every_mode.png` | MASTER EVERY MODE | Reverse the chain, race the clock, double the shift, or go in blind. | WordShift setup lists Standard, Reverse Shift, Speed Shift, Double Shift, Challenge, and Blind Mode. | Puzzle setup menu with Standard selected and Reverse Shift, Speed Shift, Double Shift, Challenge, and Blind Mode visible. |
| 6 | `docs/play-store/final/06_flawless_offering.png` | GO FLAWLESS | Three stars is good. No hints, no mistakes, no undos is better. | WordShift victory screen showing a flawless three-star solve and amber rewards. | Phase 0 victory modal with three stars, a FLAWLESS ribbon, the PAY to PLAN to HEART chain, and amber rewards. |
| 7 | `docs/play-store/final/07_theyve_been_waiting.png` | THEY'VE BEEN WAITING | The longer you stay, the more the house changes. | WordShift animal house at dusk beneath a purple-orange sky, with the Jungle Hammock locked above furnished rooms. | Phase 2 dusk house with the Jungle Hammock still locked and no late-story imagery. |
| 8 | `docs/play-store/final/08_something_stirs.png` | SOMETHING STIRS IN THE AIR | Your friends know more than they are willing to say. | A glowing offering pit in a moonlit forest clearing on the WordShift offering screen, with the message: Nothing left to give. The dark is patient. | Phase 3 night Offering Pit in its empty state. No ward ceremony, no robed sprites, no late-story imagery. |

### Regen checklist (from the 2026-07-12 screenshot review)

- [ ] Re-render all eight banner strips with the revised headline/support copy above.
- [ ] #5 + #6: remove (or move to scenic margins) the small dark "eye" blobs composited onto flat UI surfaces — under the ? button in #5 and on the victory modal's cream band in #6 they read as smudges/rendering defects, not foreshadowing. On scenery edges (#3 sign, #7 frame) the motif works and can stay.
- [ ] #5: fix the contradictory state — the modal shows HARD selected while the EASY pill is visible behind it — and give the "PUZZLE SETUP" header breathing room from the frame's top edge.
- [ ] #7: optional — recapture so the PLAY dock shows the new phase-aware dusk-teal material (shipped 2026-07-12) instead of bright green.
- [ ] #8: optional — a variant with the seven ward marks faintly visible around the pit opening would match the live app more closely (and add to the mood).

All eight screenshots exist; Play Console upload remains a human task.

Final feature graphic: `docs/play-store/final/feature-graphic.png`
Feature graphic alt text: Ember the fox beside the exact WordShift logo, candy tiles, glowing amber, and a sunny-to-dusk forest with subtle distant eyes.

Never show Phase 4+ content, robed sprites, or the revealed shadow figure in
store assets — the reveal is the product.

## Release notes template (1.0)

> The house is ready. The animals are waiting.
> • Thousands of letter-shifting puzzles across four difficulties
> • 13 animal friends, a house to build, a daily challenge to share
> • Streaks, quests, achievements, and a story that unfolds the longer you stay
