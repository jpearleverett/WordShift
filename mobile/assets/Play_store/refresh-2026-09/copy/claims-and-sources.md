# Claims and sources (refresh-2026-09)

Re-verified on 2026-09-23 against HEAD `4fc0121f` (the brief's baseline; no
code has changed since). Every claim in the store text, the screenshot and
feature graphic copy, the trailer captions and the YouTube description is
listed with the file that proves it. Paths are relative to `mobile/` unless
they start with `docs/` or `CLAUDE.md`. Line numbers are as of that HEAD.

This is the copy step's own check, not a copy of the brief's table: each row
below was opened and read in the code, and the puzzle count was re-measured by
running the audit (see row 8).

## Store text claims

| # | Claim as written | Evidence | Boundary kept |
| - | - | - | - |
| 1 | "Pick up the L in PLAY. Drop it into PANT. Now you have PAY and PLANT" | `src/constants/wordLists.ts:154-162`: curated puzzle 0 is PLAY, PANT, HEAR, and its step 0 moves L from PLAY to form PLANT. It is the first board every new player sees (CLAUDE.md, Onboarding). | A real opening move, not an invented advertising board. |
| 2 | "a fox by the fire looks very pleased with you" | After the first win Ember (a fox, `src/services/homeWorldData.ts:315`, room Cozy Den with a fireplace) is invited and acknowledges the solved puzzle (CLAUDE.md, Onboarding step 2). | Flavor; no claim of a scripted reaction to this exact move. |
| 3 | "Take a letter from one word and place it in the next. Both words must stay real." | CLAUDE.md, Core Puzzle Loop; move validation in `src/hooks/usePuzzleGame.ts:63-90`. | Describes the standard rule. |
| 4 | "The letter you move locks into the word it joins" | `src/hooks/usePuzzleGame.ts:2336` builds the moved letter with `isLocked: true`; a locked letter refuses a pick (`:1785`) with "That letter is locked!" (`src/services/phaseNarrative.ts:858`). | |
| 5 | "Tap a letter to preview the words it would make, or drag it into place" | `slotPreviews` in `src/hooks/usePuzzleGame.ts` (CLAUDE.md, Word Preview Mechanic); drag in `src/components/DraggableTile.tsx`. | Previews show words; the check and cross marks stop after the early game, so the copy promises previews, not graded answers. |
| 6 | "Use a hint when you want a nudge: you start with five and can earn more" | `STARTING_FREE_HINTS = 5` (`src/constants/gameBalance.ts:260`), seeded once in `src/services/hints.ts:93`; earned by the opt-in rewarded ad (`REWARDED_HINT_GRANT = 1`, `gameBalance.ts:263`) and by milestone grants under `BONUS_HINT_SOFT_CAP = 10` (`hints.ts:191-203`). | "Earn", never "unlimited". |
| 7 | "No energy meters or lives, and no countdown clock unless you want one" | No energy or lives system exists (a search of `src/` finds none; CLAUDE.md Monetization "Never: energy/lives"). The only countdown is the optional Speed Shift modifier (`SPEED_TOGGLE_UNLOCK_PUZZLES = 55`, `gameBalance.ts:805`; `src/hooks/useSpeedTimer.ts`). | Changed from "no timers": the daily leaderboard ranks by solve time ("lower time wins", `src/services/leaderboard.ts:10`), so "no timers" was not strictly true. No countdown is shown on the daily. |
| 8 | "Over 4,000 word puzzles" | Re-run today with `node scripts/tools/auditVocabulary.mjs <report>` and its route-audit (branching) option, which reports 7,352 stored boards and **4,370 eligible for fresh delivery** across 30 banks, every bank at 100 or more, 0 route failures. | Always "Over 4,000", never the stored total, never "hand-crafted" or "hand-tuned". |
| 9 | "across five difficulty levels, from four-letter warmups to six-letter Expert chains" | `DIFFICULTY_LEVELS = ['EASY','MEDIUM','MEDIUM_PLUS','HARD','EXPERT']` (`src/components/puzzle/DifficultyMenu.tsx:165`); word length EASY 4 and EXPERT 6 (`src/services/localGenerator.ts:1345-1350`); Expert opens at 35 solves (`gameBalance.ts:733`). | |
| 10 | "Reverse Shift: play down the chain, then carry it back up" | `src/services/puzzleVariety.ts:104-107` (title "Reverse Shift", instruction "Play normally to the bottom, then carry the chain back to the top."); opens at 10 solves (`:137`). | |
| 11 | "Double Shift: move two letters at every step" | `src/services/puzzleVariety.ts:114-115` ("Move two letters at once from each word to the next."); opens at 25 solves (`:138`). | |
| 12 | "Four modifiers you can layer on any of the three styles: Challenge Mode, Speed Shift, Blind Mode and Lexicon for rarer words" | Setup menu rows `src/components/puzzle/DifficultyMenu.tsx:736` (Challenge mode), `:806` (Speed Shift, "A clock on any style"), `:412` and `:879` (the early name is "Blind Mode"), `:949` (Lexicon, "Rarer words, on any style"); stacking at `:386-436`; gates 15, 55, 80, 100 (`puzzleVariety.ts:146-147`, `gameBalance.ts:743,805`). | "Blind Mode", never the later "Blind Offering" label. |
| 13 | "A daily word puzzle with streaks and your rank among the day's players" | `src/services/dailyChallenge.ts` (seeded board, streaks and streak freezes, lines 42-46); `src/services/leaderboard.ts`; the standing card in `src/components/puzzle/VictoryModal.tsx:848` shows your own rank ("#N of M", `DailyLeaderboardCard`) and, from 5 entrants, a percentile. Supabase is configured (CLAUDE.md, Tech Stack). | Not "every player gets the same puzzle": the first three dailies are eased. Was "an online leaderboard": the game shows your own rank, not a list of players, so the copy now names what is on screen. **Owner check before upload:** `docs/LAUNCH_CHECKLIST.md` still lists "a signed build must still post a Daily rank end to end"; confirm that on a signed production build before this line goes live, or paste the pre-checked fallback line "- A daily word puzzle with streaks" (`full_description_fallbacks` in `listing-en-US.json`; `verifyCopy.mjs` checks it). |
| 14 | "Five daily and five weekly quests, plus 56 achievements" | `const count = 5` for both tiers (`src/services/weeklyQuests.ts:588`); 56 `id:` entries in `ACHIEVEMENTS` (`src/services/achievements.ts:97` onward, counted today). | |
| 15 | "More styles and modifiers open as you progress" | Gates in rows 9 to 12. | |
| 16 | "Every puzzle you solve earns amber. Spend it to build rooms in a pixel-art house and welcome 13 animal housemates, each with a room of their own." | 13 rooms (`src/services/homeWorldData.ts:139-295`) and 13 animals (`:315-495`), unlocked alternately with amber (CLAUDE.md, House Building). | Not "all at once": residents arrive through play. |
| 17 | "Ember the fox keeps the fire going in the Cozy Den" | `homeWorldData.ts:139` (Cozy Den), `:315` (Ember). | |
| 18 | "Panko the pangolin runs the kitchen, and anyone who helps eats first" | `homeWorldData.ts:152` (Rustic Kitchen), `:551` ("A chef"); line `pg_0_1` "Anyone who helps in my kitchen eats first." (`src/services/dialogue/animalDialogueBase.ts:297`). | |
| 19 | "Archimedes the owl reads in his study" | `homeWorldData.ts:165` (Scholar's Study), `:579` ("Read every book"); he/him per CLAUDE.md canon pronouns. | |
| 20 | "Axel the axolotl drifts around his aquarium in a scuba mask" | `homeWorldData.ts:178` (Aquarium Room); `assets/characters/axolotl/idle.png` shows the mask and snorkel (CLAUDE.md, Asset System). | |
| 21 | "a sloth strings up a jungle hammock, a calm capybara takes the office and a nervous rabbit tends the garden" | Rooms Jungle Hammock, Chill Office, Garden Patio (`homeWorldData.ts:191,217,243`); Sloane's hammock `sl_0_2`, Chill's calm office `cp_0_1..3`, Thyme's garden `rb_0_1..5` (`animalDialogueBase.ts:440,1007-1009,1291-1295`); rabbit "Anxious" in the CLAUDE.md cast table. | Surface descriptions only. |
| 22 | "all the way up to a tarsier who watches the stars and an old kakapo in the rooftop sky garden" | Star Loft and Sky Garden are the last rooms, at the top of the bottom-up house (`homeWorldData.ts:269,295`; room gates 84 and 92); Vesper keeps "the night watch" (`tr_0_2`, `animalDialogueBase.ts:1435`); Moss has been "calling for ninety years" (`kk_0_8`, `:1727`). | The Belfry and its resident are never named. |
| 23 | "Every resident walks around their own room" | `walk.png` atlases for 12 residents plus Ember's `walk_0..9.png` (`assets/characters/*/`), played by `src/components/home/AnimalSprite.tsx`. | |
| 24 | "picks up the conversation where you left off" | `src/services/conversationProgress.ts:45` (`getNextAnimalConversation`, earliest unread line; a line counts as read only after its last page). | |
| 25 | "more than 2,000 lines of dialogue to discover" | Per resident: 134 base lines (`src/services/configValidation.ts:53-60`), 20 post-story (`:61`), 10 extra (`:65`); 13 residents, so 1,742 + 260 + 130 = 2,132. | Changed from "lines to hear": the dialogue is text, not voiced. |
| 26 | "The animals talk about you when you're away. All good things. Probably." | Micro-beat 20 text (`src/services/phaseNarrative.ts:2612-2614`). | Quoted game text, not a testimonial. |
| 27 | "Later, you can decorate every room, and each decoration is a gift you hand to the friend who lives there" | Decorations for all 13 room ids (`src/services/roomUpgrades.ts:61-145`), opening mid-game (`areUpgradesAvailable`, `:486`); a bought upgrade is a gift the player hands to the resident (`deliverHouseUpgradeGift`, `:777`). | "Later", because it is not available at first. |
| 28 | "The words you make are gathered at a glowing well below the house, and you offer them there to collect the amber they earned" | The Offering Pit below the house (`assets/environment/pit_entrance.png`, a glowing stone well); each win's own amber is queued with its words (`enqueueHarvestBatch`) and credited when they are offered (`offerBatch`, `src/services/wordHarvest.ts:186`; CLAUDE.md, Offering Pit Economy). The pit collects amber already earned; it is not a second source. | The pit is shown and described only at its bright, early look. |
| 29 | "The story unfolds in illustrated scenes, from a chipped cup of tea to supper by candlelight" | `src/services/storySpine.ts:291-292` (the cup scene: the flower cup with cocoa, or the chipped cup with tea) and `:314` (supper, "Before it goes cold"); candles are lit on the table in `assets/story/pages/supper-01.webp` and `supper-03.webp`. | No count of scenes or illustrations. |
| 30 | "your answers are remembered and come back later" | Supper opens with the cup you chose: "Ember puts your flower cup down where you sit" or "She remembered you asked for tea" (`storySpine.ts:282,315`). | Not "every choice changes the ending". |
| 31 | "Panko went to bed with her spice jars in one order and woke up to find them in another" | `pg_1_1` (`animalDialogueBase.ts:322`). | |
| 32 | "Ember's fire has taken up drawing" | `fx_1_1`: "The fire has taken up a hobby" and "It draws now." (`animalDialogueBase.ts:748`). | |
| 33 | "Tile themes and finishes, confetti and move sparks to buy with amber" | `TILE_THEMES`, `CONFETTI_THEMES`, `TILE_FINISHES`, `SPARK_THEMES` (`src/theme/colors.ts:127,273,383,475`); categories `tile_theme`, `confetti`, `spark` in `src/services/cosmetics.ts`; `purchaseAmberCosmetic` (`:444`). | Some cosmetics come from purchases or the season pass, so the copy says these can be bought with amber, not that all are. |
| 34 | "A monthly season pass with a reward track that advances as you solve" | `src/services/seasonPass.ts:2-5` (seasons rotate each local month), `:248` (tiers from in-season solves); `SEASON_PASS_PUZZLES_PER_TIER = 6` (`gameBalance.ts:342`). | |
| 35 | "Twelve music tracks that change as the story unfolds" | 12 files in `assets/music/` (`home_phase0..5.mp3`, `puzzle_phase0..5.mp3`), chosen per screen and story point by `musicTrackForContext` (`src/services/audio.ts:661`). | Never "composed" or "orchestral". |
| 36 | "Settings for sound, music, haptics and reduced motion" | `src/components/SettingsScreen.tsx`: "Sound Effects", "Music", "Haptic Feedback", "Reduced Motion" (about lines 919-966). | Not a certified accessibility claim. |
| 37 | "Core puzzles work offline and no account is needed" | Root `README.md:20`: "the core puzzles play fully offline" and "there are no user accounts"; banks ship in `src/data/`. | "Core puzzles", not "fully offline". |
| 38 | "Your progress backs up automatically when you're online, with a recovery code to restore it on another device" | `uploadToCloud()` at launch and after each win (`App.tsx:1562,3407`); Settings "BACKUP & RESTORE" with "Back up & show recovery code" and "Restore with a recovery code" (`SettingsScreen.tsx:1041-1054`). | |
| 39 | "Share your results with friends" | The victory screen's Share button opens `ShareResultModal`, which shares a picture of the result card (`src/services/shareImage.ts`) or the emoji-grid text (`src/services/shareResults.ts`), through the system share sheet. | Was "Send a friend a link to a puzzle you solved". That link is a custom `wordshift://` URL (`shareResults.ts:281`); most messaging apps do not make it tappable and it does nothing for a friend without the app, so the line promised more than a friend gets. Sharing a result works everywhere. |
| 40 | "Online features and purchases need an internet connection" | Leaderboard, cloud backup, ads and billing use the network (CLAUDE.md, Tech Stack). | |
| 41 | "Contains ads and in-app purchases, including an optional auto-renewing Supporter subscription and an optional purchase that removes ads" | `PRODUCT_IDS` in `src/services/iap.ts:54-83`: `SUPPORTER_SUB` (auto-renewing), `REMOVE_ADS`, plus amber and hint packs, the starter pack, the Keeper's Collection, the season premium and the Keeper's Edition; ads in `src/services/ads.ts`. | "including" lists the two a reader most needs to know about; the list is not presented as complete. No prices, no "no ads". |
| 42 | "No purchase is needed to follow the main story" | CLAUDE.md, Monetization: "No purchase is ever required to finish the story." | The only story and purchase statement. It never says purchases leave the pace unchanged (bought amber can bring the reveal earlier, an owner-accepted exception). |
| 43 | "The story develops unsettling themes and mild horror." | Unchanged from the live listing; the tone arc in CLAUDE.md, Narrative Vision. | Kept on purpose as the content disclosure. |
| 44 | Short description: "13 animal friends and a house that keeps secrets" | Row 16; the tease stays at "keeps secrets" (brief boundary 8). | No mention of what the secret is. |

## Image, video and YouTube copy claims

| Surface | Claim | Evidence |
| - | - | - |
| Slot 01 | "Shift one letter." / "Keep both words real." | Rows 1 and 3. |
| Slot 02 | "Words build a home." | Row 16. |
| Slot 03 | "A cozy game. Mostly." | Tone tease only (boundary 8). |
| Slot 04 | "Stories in each room." / "13 housemates to get to know." | Rows 16, 23 to 25; the image is one resident telling hers (row 31). |
| Slot 05 | "Then the rules shift." / "Styles and challenges that stack." | Rows 10 to 12. |
| Slot 06 | "Every word goes somewhere." | Row 28. |
| Slot 07 | "Tea or cocoa?" / "Ember will remember your answer." | Rows 29 and 30 (the cup choice is recalled at supper). |
| Slot 08 | "Stay for supper." | Row 29 (supper page 2 only). |
| FG-A | "Your words keep this house warm." | Picture-only art `assets/story/pages/witness-05.webp`; the line is a tone line, not a feature claim. |
| FG-B | "Every letter counts." | Row 4. |
| Trailer | "Over 4,000 puzzles." | Row 8. |
| Trailer | "Drop it in. Two real words." | Row 3 (both words must stay real). |
| Trailer | "Your wins build the house." | Row 16: wins earn the amber that builds rooms. Was "Every win grows the house.", which overstated the loop (rooms are bought with amber and some are level-gated, so a single win rarely adds a room). |
| Trailer | "Everyone has something to say." | Rows 23 to 25 (every resident talks). |
| Trailer | "Reverse. Double. Race the clock." | Rows 10, 11 and the Speed Shift clock (row 7); the third sub-shot is a Speed Shift board whose countdown ticks on screen. |
| Trailer | "Your answers stay with them." | Row 30. |
| Trailer end card | "The house is very fond of you." | Tone tease (boundary 8). |
| YouTube description | "the letter you move stays where you put it" | Row 4. |
| YouTube description | "a pixel-art house you build with the amber your puzzles earn" | Row 16. Was "a house that grows with every puzzle you solve", which overstated the loop. |
| YouTube description | "They remember what you tell them." | Row 30. |
| YouTube description | "All gameplay in this trailer is captured from WordShift." | Brief section 6 and boundary 17: real UI fills the trailer except the 2.4 s end card. Recheck against the finished video before upload. |

## What the copy deliberately does not say

- No ranking, award, testimonial, download count, price, discount, "free",
  "new", "best", "top" or "#1", and no call to action such as "Download now".
- No phase or stage number, and no name for any stage of the darkening.
- Nothing about the presence, robes, the final board, its choices, the Arrival,
  the ending, New Cycle, the Belfry, the Music Box or The Offering.
- Not "hand-crafted", not "Blind Offering", not the "Practice boards" line, not
  "fully offline", not "no ads".

## Changes from the brief, and why

1. "The letter you move locks into its new word" became "The letter you move
   locks into the word it joins". Boundary 10 lists "new" among the banned
   promotional words; this use was descriptive, but removing the literal match
   removes any reviewer doubt and reads just as clearly.
2. "its chains keep finding new ways to make you think" became "fresh ways",
   for the same reason.
3. "no timers unless you want one" became "no countdown clock unless you want
   one". The daily leaderboard ranks by solve time, so the old wording was not
   strictly true; the new wording is.
4. "with more than 2,000 lines to hear" became "with more than 2,000 lines of
   dialogue to discover". The game has no voiced dialogue, and "to hear"
   implied it.
5. The full description is therefore 3,677 characters, not the brief's 3,625
   (it also carries the review fixes in items 7 and 8).
   Keyword counts are unchanged ("word puzzle" 3, "word game" 3, "cozy" 3), and
   "cozy word puzzle game" still sits in the first 167 characters (it starts at
   character 138).
6. Each `.txt` file is the field text plus one final newline, the live
   campaign's convention and the build instruction for this step. The brief's
   "no trailing newline" was about counting; every count here excludes that
   newline, and Play Console trims it on paste.
7. Review fixes (2026-09-23): "you will feel at home here" and "when you are
   online" are contracted ("you'll", "you're") to match the game's own cozy
   register; "hand each gift" became "each decoration is a gift you hand to
   the friend who lives there", because nothing before it introduced a gift;
   "an online leaderboard" became "your rank among the day's players" (row 13).

## Notes for the other build steps

- `listing-en-US.json` is the single source for every alt text; the stills
  build copies it into `alt-text.tsv` and fails if an alt text is over 140
  characters. Rewrite an alt text there when a final crop changes.
- The trailer captions in `listing-en-US.json` (`trailer.captions`) must equal
  the burned-in captions and `video/captions-en.srt`; `verifyCopy.mjs` compares
  the SRT cue by cue (text, start and end) and fails on any drift.

## Official references (read on 2026-09-23)

- **Text limits.** App name 30, short description 80, full description 4,000
  characters: [Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152).
- **Metadata policy.** The title must be "30 characters or less" with no
  emoji, repeated special characters or ALL CAPS; no "images or text that
  indicate store performance or ranking, such as 'App of the year,' '#1,' 'Best
  of Play 20XX,' 'Popular,' award icons"; no price or promotional information
  such as "free for limited time only"; no "Google Play programs, such as
  'Editor's choice,' 'New'"; no "unattributed or anonymous user testimonials";
  avoid "repetitive or unrelated keywords":
  [Metadata policy](https://support.google.com/googleplay/android-developer/answer/9898842).
- **Preview assets.** Screenshot taglines "should not take up more than 20% of
  the image"; "Avoid adding any form of call-to-action, for example, 'Download
  now,' 'Install now,' 'Play now,' or 'Try now'"; avoid "Best", "#1", "Top",
  "New", "Discount", "Sale" or "Million Downloads"; the feature graphic is
  1024 by 500 with the focal point toward the centre and no "prominent branding
  that is similar to your app icon"; the preview video uses "a video's YouTube
  URL", with monetization turned off, not age-restricted, and "only the first 30
  seconds autoplays":
  [Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/9866151).
- **Ads declaration.** "Apps that contain ads will have a 'Contains ads' label
  shown on their store listing"; the label does not cover in-app purchases,
  which is why the description names them:
  [Prepare your app for review](https://support.google.com/googleplay/android-developer/answer/9859455).
- **Category and tags.** At most five tags, each clear from the listing or the
  first experience:
  [Choose a category and tags](https://support.google.com/googleplay/android-developer/answer/9859673).
- **Experiments.** Graphics and description experiments; the app name is not
  testable; one default graphics experiment at a time:
  [Run A/B tests on your store listing](https://support.google.com/googleplay/android-developer/answer/6227309).
- **Custom store listings.** Own name, icon, descriptions and graphics, with
  search keyword targeting:
  [Create custom store listings](https://support.google.com/googleplay/android-developer/answer/9867158).

Google does not review or endorse this campaign; these pages set the rules it
was written to.
8. The second review (2026-09-23) tightened the list and fixed three reads:
   the bullet "Keep both words real to make progress" was deleted (it repeated
   paragraph 2); "Four challenges that stack on any style" became "Four
   modifiers you can layer on any of the three styles", the game's own terms
   (PUZZLE STYLE and MODIFIERS in the setup menu), so "Challenge Mode" is no
   longer a challenge inside a list of challenges; "you offer them there for
   amber" became "to collect the amber they earned", because the pit collects
   amber already earned rather than paying a second time; small numbers are
   spelled out (five, twelve) while 13, 56, 2,000 and 4,000 stay numerals;
   "Tile styles" became "Tile themes" so "styles" means puzzle styles only;
   and "Send a friend a link to a puzzle you solved" became "Share your
   results with friends" (row 39).
