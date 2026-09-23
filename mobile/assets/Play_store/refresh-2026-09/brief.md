# WordShift Play listing refresh (refresh-2026-09): build brief

This brief is the single source of truth for the build agents. It settles every choice for the refresh. If something here disagrees with an earlier concept, research note or judge verdict, this brief wins. If the brief disagrees with the hard boundaries in section 10, the boundaries win and the build stops for the owner.

- **Date:** 2026-09-22. Code baseline HEAD `4fc0121f`. The Expo web build is at http://localhost:8081.
- **Replaces:** the live campaign `mobile/assets/Play_store/launch-2026-09`, once the owner uploads this one.
  - Do not modify or delete the live folder.
  - Do not run `npm run store:capture`, `store:build` or `store:package`. They write into the live folder.
- **How it was built:** Concept 1 (mechanic first) had the best combined judge score (conversion 7.6, brand 8.2, policy 7.0). This brief uses it as the base and adds:
  - Concept 2's cast painting as the feature graphic, its 432x768 capture viewport and single-badge house seed, its "No energy meters or lives" line, and its tea-or-cocoa slot.
  - Concept 3's Panko spice-jar page and its phase-1 story details.
  - Every must-fix item from the three judges.
- **Removed on purpose:**
  - The solve-31 "YOU ARE DOING SO WELL" beat, because it cannot be captured.
  - The echo notebook beat, because it spends the story's first mystery climax.
  - The witness choice page.
  - "The circle hungers." and any other pit copy from dusk onward.
  - "Something under the floor" and any similar line.

---

## 1. Store text (final)

Every string in this section is plain ASCII: straight quotes and apostrophes, no em or en dashes, no "...", no emoji. The counts below include spaces and newlines.

### App name: 27 of 30

```
WordShift: Cozy Word Puzzle
```

### Short description: 77 of 80

It is one sentence, so it has no trailing period. It has no call to action, no symbols and no capitals for emphasis.

```
A cozy word puzzle game with 13 animal friends and a house that keeps secrets
```

### Full description: 3,625 of 4,000

- Keyword counts: "word puzzle" 3, "word game" 3, "cozy" 3, plus "word ladders", "offline" and "daily".
- The text before "more" (the first 167 characters) holds the hook and "cozy word puzzle game".
- The short description is not repeated verbatim.
- Paste the text exactly as written:

```
Pick up the L in PLAY. Drop it into PANT. Now you have PAY and PLANT, and a fox by the fire looks very pleased with you.

WordShift is a cozy word puzzle game built on one small move. Take a letter from one word and place it in the next. Both words must stay real. The letter you move locks into its new word, so every choice shapes the rest of the chain. If you enjoy word ladders, you will feel at home here: this word game takes one move to learn, and its chains keep finding new ways to make you think.

How it plays
- Move one letter at a time down a chain of words
- Keep both words real to make progress
- Solve the whole chain to earn stars and amber
- Tap a letter to preview the words it would make, or drag it into place
- Use a hint when you want a nudge. You start with 5, and you can earn more
- No energy meters or lives, and no timers unless you want one

A word game that grows with you
- Over 4,000 word puzzles across five difficulty levels, from four-letter warmups to six-letter Expert chains
- Reverse Shift: play down the chain, then carry it back up
- Double Shift: move two letters at every step
- Four challenges that stack on any style: Challenge Mode, Speed Shift, Blind Mode and Lexicon for rarer words
- A daily word puzzle with streaks and an online leaderboard
- 5 daily and 5 weekly quests, plus 56 achievements
- More styles and challenges open as you progress

Grow a home, room by room
Every puzzle you solve earns amber. Spend it to build rooms in a pixel-art house and welcome 13 animal housemates, each with a room of their own. Ember the fox keeps the fire going in the Cozy Den. Panko the pangolin runs the kitchen, and anyone who helps eats first. Archimedes the owl reads in his study. Axel the axolotl drifts around his aquarium in a scuba mask. As the house grows, a sloth strings up a jungle hammock, a calm capybara takes the office and a nervous rabbit tends the garden, all the way up to a tarsier who watches the stars and an old kakapo in the rooftop sky garden.

Every resident walks around their own room, talks about their day and picks up the conversation where you left off, with more than 2,000 lines to hear. The animals talk about you when you're away. All good things. Probably. Later, you can decorate every room and hand each gift to the friend who lives there.

Stay for the story
The words you make are gathered at a glowing well below the house, and you offer them there for amber. The story unfolds in illustrated scenes, from a chipped cup of tea to supper by candlelight, and your answers are remembered and come back later. Then small things start to shift. Panko went to bed with her spice jars in one order and woke up to find them in another. Ember's fire has taken up drawing. Some evenings, the conversations sound a little different.

Make it yours
- Tile styles and finishes, confetti and move sparks to buy with amber
- A monthly season pass with a reward track that advances as you solve
- Twelve music tracks that change as the story unfolds
- Settings for sound, music, haptics and reduced motion

Good to know
Core puzzles work offline and no account is needed. Your progress backs up automatically when you are online, with a recovery code to restore it on another device. Send a friend a link to a puzzle you solved. Online features and purchases need an internet connection.

Contains ads and in-app purchases, including an optional auto-renewing Supporter subscription and an optional purchase that removes ads. No purchase is needed to follow the main story. The story develops unsettling themes and mild horror.

A cozy word game. Mostly.
```

The file must not end with a newline; the count above assumes none.

### Where each claim comes from

The build copies this table into `copy/claims-and-sources.md`.

| Claim | Evidence |
|---|---|
| PLAY/PANT gives PAY and PLANT | `src/constants/wordLists.ts:155-157`; captured live |
| Moved letters lock | `usePuzzleGame.ts`; CLAUDE.md Core Puzzle Loop |
| 5 starting hints, more can be earned | `STARTING_FREE_HINTS = 5` (`gameBalance.ts:260`); rewarded hint and milestone grants |
| No energy or lives; timers only if chosen | CLAUDE.md Monetization "Never" list; Speed Shift is an optional modifier |
| Over 4,000 word puzzles | Vocabulary audit of 2026-09-22: 4,370 eligible of 7,352 stored. Never say "hand-crafted". |
| Five difficulty levels, six-letter Expert | `DifficultyMenu.tsx:165`; `EXPERT_DIFFICULTY_UNLOCK_PUZZLES` |
| Reverse Shift, Double Shift | `puzzleVariety.ts:136-139` |
| Challenge Mode, Speed Shift, Blind Mode, Lexicon stack | `DifficultyMenu.tsx:412-436`; CLAUDE.md "The four modifiers". Use "Blind Mode", never "Blind Offering". |
| Daily word puzzle, streaks, online leaderboard | `dailyChallenge.ts`; `leaderboard.ts` |
| 5 daily and 5 weekly quests; 56 achievements | `weeklyQuests.ts:588`; 56 ids in `achievements.ts` |
| 13 housemates, rooms and descriptions | `homeWorldData.ts`; CLAUDE.md cast table, surface column only |
| "anyone who helps eats first" | `pg_0_1` in `animalDialogueBase.ts:297` |
| All 13 residents walk their rooms | `assets/characters/*/walk*` |
| More than 2,000 lines | 1,742 + 130 + 260 (`configValidation.ts:53-65`) |
| "The animals talk about you when you're away. All good things. Probably." | Micro-beat 20 (`phaseNarrative.ts:2614`) |
| Room gifts ("Later") | `roomUpgrades.ts`; opens mid-game |
| Glowing well below the house; offered for amber | Offering Pit; `pit_entrance.png` |
| Illustrated story scenes; answers come back | `storySpine.ts` (for example `supper-01` recalls the cup choice). No scene or illustration count is given. |
| Spice jars | `pg_1_1` (`animalDialogueBase.ts:322`) |
| Ember's fire draws | `fx_1_1` (`animalDialogueBase.ts:748`) |
| Cosmetics bought with amber | `cosmetics.ts`; `purchaseAmberCosmetic` |
| Season pass reward track advances as you solve | `seasonPass.ts`; `SEASON_PASS_PUZZLES_PER_TIER = 6` |
| Twelve music tracks | `assets/music/*.mp3` (12). Never "composed" or "orchestral". |
| Offline, no account, cloud backup, recovery code | `README.md:20`; `cloudSave.ts`; Settings "BACKUP & RESTORE" |
| Friend link to a puzzle you solved | `shareResults.ts:381`. Standard, non-daily boards only, so never say "the exact puzzle" or "any puzzle". |
| Ads, IAP, Supporter subscription, remove-ads purchase | `iap.ts:55-83` |
| No purchase needed to follow the main story | CLAUDE.md Monetization. Never claim purchases leave the story's pace unchanged. |
| Mild horror disclosure | Unchanged from the live listing |

### Alternatives for later experiments

Short description alternatives, for a localized en-US experiment:

| Id | Text | Chars | Angle |
|---|---|---|---|
| SD-A | `Move one letter, change two words. A cozy word puzzle with a secret of its own.` | 79 | mechanic first; two sentences, each ending with a period |
| SD-B | `Grow a cozy home for 13 animal housemates, one word puzzle at a time` | 68 | pure cozy |
| SD-C | `A cozy word puzzle game with a household of animals who are almost too kind` | 75 | wink |

Alternative app name, for a keyword custom store listing:

| Id | Text | Chars |
|---|---|---|
| AN-A | `WordShift: Cozy Word Mystery` | 28 |

Store listing experiments cannot test the app name. Use AN-A in a custom store listing that targets search terms such as "cozy mystery" or "spooky cozy" once Play Console reports those terms, and compare conversion per listing.

### Experiment plan (for the owner, in order)

Every experiment is judged on **retained first-time installers (1 day)**, never on raw installs. Run each for at least 14 days. Only one graphics experiment can run at a time.

1. **Graphics:** control is screenshots 1-8 in the order in section 3. The variant swaps slots 1 and 2 (house first, board second).
2. **Localized en-US descriptions:** short description control against SD-A and SD-C. The full description stays unchanged.
3. **Graphics:** feature graphic A against feature graphic B (section 5).
4. **Later:** SD-B against the winner of experiment 2.

---

## 2. Production setup

### Folder layout

Create exactly this layout:

```
mobile/assets/Play_store/refresh-2026-09/
  brief.md                      this file
  README.md                     how to reproduce, written by the build
  copy/
    app-name.txt, short-description.txt, full-description.txt   (exact text above, no trailing newline)
    listing-en-US.json          same keys as launch-2026-09/copy/listing-en-US.json, plus
                                "app_name_alternative", "tablet_screenshots", "feature_graphic",
                                "feature_graphic_variant_b", "video"
    claims-and-sources.md       the table in section 1
    experiments.md              section 1 alternatives and experiment plan
  alt-text.tsv                  section 9, id<TAB>text
  raw/                          unedited captures, each listed in raw/provenance.json
  upload/
    phone/01-shift-one-letter.png ... 08-stay-for-supper.png
    tablet/t1-house.png ... t4-dusk-well.png
    feature-graphic.png
    experiments/feature-graphic-b.png
  video/
    trailer-9x16-1080x1920.mp4  (uploaded to YouTube and pasted into Play)
    trailer-16x9-1920x1080.mp4  (YouTube channel, press, large screens)
    captions-en.srt
    youtube-thumbnail-1280x720.png
    events/                     per-clip events.json (frame-indexed actions)
  contact-sheet.png             all 8 phone shots plus both feature graphics, for review
```

- **Scripts** live in `mobile/scripts/store/refresh/`:
  - `lib.mjs`: a port of the harness below.
  - `captureStills.mjs`, `buildStills.mjs`, `buildFeature.mjs`, `recordTrailer.mjs`, `editTrailer.mjs`.
  - Run them with `node` directly. Do not add or change npm scripts in `package.json`.
- **Git:** work on a `feature/...` branch and open a pull request. Never push to `main`.
- **Docs mirrors:** do not touch the files in `docs/` (`feature-graphic.png`, `store-icon-512.png`). They are updated only after the owner uploads.
- **Icon:** the store icon stays as it is. `docs/store-icon-512.png` is unchanged and there is no new icon.

### Capture harness

Port `/tmp/claude-0/-home-user-WordShift/6917ae72-7c3b-5354-8c4f-83735e1b993e/scratchpad/store/cand_scripts/lib.mjs` into `lib.mjs`, with these changes:

- `launch({width, height, dsf, reducedMotion, clock})`:
  - Chromium at `/opt/pw-browsers/chromium` with args `['--no-sandbox','--disable-dev-shm-usage']`.
  - `deviceScaleFactor: dsf`, where the original hard-coded 3.
  - Abort every request that is not to localhost or 127.0.0.1.
  - The settings seed `{reducedMotion, soundEnabled:false, musicEnabled:false, hapticsEnabled:false}`.
  - When `clock` is true, call `page.clock.install()` before `goto`, then `page.clock.resume()`.
- Keep `bootReturning`, `seed`, `reloadHome`, `dismissIntros`, `playSolution`, `starStats`, `achievementsFor`, `panHouse` and `finishStory` unchanged.
- Add `conversationRead(map)`. It builds `conversationReadIds` from `{animalType: [prefix, from, to]}` as ids `<prefix>_<phase>_<n>`.
  - Prefixes: fox `fx`, pangolin `pg`, owl `ow`, axolotl `ax`, sloth `sl`, fennec_fox `ff`, capybara `cp`, wombat `wb`.
- Add `sessions(list)`. It builds `wordshift_dialogue_sessions` records shaped `{animalId, dialoguesInSession:0, puzzlesAtSessionEnd, sessionsCompleted}`.

**Where scripts can live:** an ESM script outside `mobile/` must load Playwright through `createRequire('/home/user/WordShift/mobile/package.json')`, as `lib.mjs` already does.

**Rules that apply to every capture:**
- The only things you may change are local progression (localStorage seeds) and real UI input through Playwright. Never edit, hide or restyle the DOM, and never change z-index.
- Before any screenshot, wait for `document.fonts.ready` and then at least 1200 ms.
- Stills use `reducedMotion: true`. The one exception is the pit, which uses `false` so the words drift. Trailer clips use `reducedMotion: false`.
- Record each still in `raw/provenance.json` with:
  - state id, viewport, DPR, reducedMotion and git HEAD;
  - an ISO timestamp and a SHA-256 of the file;
  - the visible text that identifies it (the words on the board, or the dialogue line).

### Story spine seeds

The files are in `.../scratchpad/store/work/`. Create the trimmed variants by deleting memory keys from the JSON:

| Id | Source | Memories kept |
|---|---|---|
| SPINE_0 | `spine_p1.json` minus `plum`, `echo`, `witness` | cup (flower) |
| SPINE_1A | `spine_p1.json` minus `echo`, `witness` | cup, plum |
| SPINE_1 | `spine_p1.json` | cup, plum, echo, witness (share) |
| SPINE_2 | `spine_p2.json` | the above, plus supper, plan, shelter (road) |

### Seeded states

Every state is `bootReturning(page, patch, extra)` followed by `reloadHome`, and every one follows these rules:

- **The patch** always contains `currentPhase`, `phaseProgress` and `puzzlesSolved`. It also contains `unlockedAnimals`, `unlockedRooms` and `introsSeen`, taken from `ALL_RES` and `ALL_ROOMS` in the harness order (fox, pangolin, owl, axolotl, sloth, fennec_fox, capybara, wombat, ...). **Pass all three lists in every patch, or the house resets to Ember alone.** This is the Concept 2 verify.mjs bug.
- **The extra seed** always contains `wordshift_star_stats: starStats(N)` and `wordshift_achievements: achievementsFor(N)`. Unless the state says otherwise, it also sets `wordshift_in_progress_puzzle: null`.
- **Past 25 solves**, the patch also sets `seenVariantTutorials: ['reverse','double_shift']`.

"First k" below means `ALL_RES.slice(0,k)`, `ALL_ROOMS.slice(0,k)` and the same k for `introsSeen`.

| State | Phase / solves / phaseProgress | Residents and rooms | Amber (total earned) | Story | Other seeds | Used by |
|---|---|---|---|---|---|---|
| **A** opener | 0 / 6 / 6 (harness default) | fox only | 120 (120) | none: the cup scene is due on Play | `starStats(6,['EASY'])`, `achievementsFor(6)`. Keep the autosaved opener board; do not null it. | slots 1 and 7, T2, T3, clips R1 and R7 |
| **B** day house | 1 / 42 / 42 | first 7 | 640 (2400) | SPINE_1 | `currentStreak: 4`, `lastPlayDate: today`. Read ids: fx, pg, ow, ax `_0_1..18`; sl `_0_1..12`; ff `_0_1..6`; cp `_0_1..3`; `conversationReadVersion: 1`. Sessions: fox, pangolin, owl `(42, 6)`; sloth `(42, 4)`; fennec_fox `(42, 2)`; capybara `(42, 1)`; axolotl `(38, 6)`. The pair is (puzzlesAtSessionEnd, sessionsCompleted). The result is that only Axel's badge is lit. | slot 2, T1, clip R3 |
| **C** dusk house | 2 / 60 / 60 | first 8 | 900 (3800) | SPINE_2 | `currentStreak: 4`, `lastPlayDate: today`. Read ids: fx, pg, ow, ax `_0_1..24` plus `_1_1..15`; sl `_0_1..24`; ff `_0_1..18`; cp `_0_1..9`; wb `_0_1..3`. Sessions: every resident `(60, n)` except fox `(55, 9)`, so only Ember's badge is lit. | slot 3, T4, clip R10 |
| **D** Panko | 1 / 24 / 24 | first 5 | 520 (1800) | SPINE_1A | Read ids: fx, pg, ow, ax `_0_1..24`; sl `_0_1..6`; `conversationReadVersion: 1`; `wordshift_dialogue_sessions: null` | slot 4, clip R9 |
| **E** supper | 2 / 44 / 46 | first 7 | 700 (2600) | SPINE_1 (supper is due) | none | slot 8 |
| **F** pit | 0 / 10 / 10 | first 3 | 300 (700) | SPINE_0 | `currentStreak: 3`, `lastPlayDate: today`, `seenVariantTutorials: ['reverse']` | slot 6, clip R8 |
| **G** modes | 2 / 60 / 60 | first 8 | 900 (4000) | SPINE_2 | none | slot 5, clip R6b |
| **H** boards | 1 / 38 / 40 | first 6 | 1400 (3000) | SPINE_1 | none | clips R2 and R6a, then R6c after the glass purchase |
| **I** invite | 0 / 11 / 11 | rooms: first 4; animals and introsSeen: first 3 | 340 (900) | SPINE_0 | none | clip R4 |
| **J** Axel | 0 / 11 / 11 | first 4 | 240 (900) | SPINE_0 | Read ids: fx, pg, ow `_0_1..9`; none for axolotl | clip R5 |

Why these numbers keep the seeds coherent and the captures clean:

- **Micro-beats.** No win happens on a micro-beat count: state A wins at 6 to 7 and state F at 10 to 11, and the keys are 5, 8, 12, 16 and so on.
- **Unlock thresholds.** No captured win crosses one (8, 10, 12, 15, 25, 35, 55).
- **Rooms and story gates.** Room gates are 19, 29, 41, 53 and 65. Story gates are cup 6, plum 18, echo and witness 28, supper 40 (phase 2), and plan and shelter 55.

---

## 3. Phone screenshots: 8 images, 1080x1920, 24-bit RGB PNG, no alpha

### Shared template (`buildStills.mjs`, typeset with Playwright and composited with sharp)

**Caption band and seam**
- Band: y 0-348.
- Seam: y 348-360. It is three stripes: 3 px `#3B2416`, 6 px `#6B4A2E`, 3 px `#3B2416`.
- Band plus seam is 360/1920 = 18.75%, under the 20% tagline limit.
- **Capture area:** y 360-1920, 1080x1560. There is no device frame, no rounded mask and no rotation.

**Headline**
- Figtree-Bold 96 px, line-height 104, centred, maximum width 960.
- If a headline does not fit on one line at 96 px, wrap it to two lines. Only slot 6 wraps: "Every word goes" / "somewhere.". The widths were measured with the real font.

**Support line**
- EpundaSlab-Bold 50 px, one line, maximum width 960. All three support lines were measured and fit, the widest at 759 px.
- The headline block (plus an 18 px gap and the support line) is centred vertically in the band.

**Fonts:** `mobile/assets/fonts/Figtree-Bold.ttf` and `EpundaSlab-Bold.ttf`, embedded as base64 data URLs. `file://` font URLs are blocked in about:blank pages.

**Band palettes.** Contrast was measured at the band's lightest point.

| Band | Fill | Headline | Support | Contrast |
|---|---|---|---|---|
| Day | vertical gradient `#1B55A0` (top) to `#2467BD` (bottom) | `#FFF6E0` with a hard 4,4 px `#3B2416` shadow | `#FFF6E0` with a 3,3 px shadow | 5.20:1 or better |
| Dusk | vertical gradient `#684381` to `#4A2F5E` | same | same | 7.20:1 or better |
| Parchment | flat `#F3E2BF` | `#3B2416`, no shadow | `#6B4A2E` | 11.34:1 and 6.22:1 |

**Band order** is day, day, dusk, parchment, parchment, parchment, parchment, dusk. The day and dusk bands only sit on captures that show that sky. Parchment is neutral chrome and is used for UI and story captures.

**Capture windows.** A window is given in CSS pixels. Captured at the stated DPR, it gives exactly 1080x1560, so it is placed with no resampling.
- A window edge may cut painted world art: sky, trees, the house wall, or a room's interior below its name plaque.
- A window edge must never cut a word tile row, a dialogue or story card, a button, a room or resident name plaque, the "Next:" sign, the header icons or the PLAY dock.
- If the starting viewport cannot satisfy a slot's must-include list without cutting one of those, raise the viewport height in steps of 36 CSS px, keeping the width, and retake.
- Locate elements with `locator.boundingBox()`. Never hard-code pixel rows.

### The eight slots

**01 `01-shift-one-letter.png`: Day band. Headline "Shift one letter." Support "Keep both words real."**

Capture: state A in a separate run at viewport **390x780, DPR 4**. This is the same flow as `cand_scripts/L_tall.mjs`.
1. Play puzzle, then `finishStory` (it chooses "The flower cup. Cocoa, please."), then `dismissIntros`, then RESTART.
2. Tap `Letter L` in `puzzle-row-0` and wait 1200 ms. This is **frame A**: the pink L lifted and the DROP fan with the check-mark PLANT preview and the cross-marked LPANT, PALNT, PANLT and PANTL.
3. Tap the `puzzle-row-1` slot named `/forms PLANT, valid word$/` and wait 1200 ms. This is **frame B**: PAY checked, and PLANT now the PICK row.

Treatment:
- Crop A is the union of the `puzzle-row-0` and `puzzle-row-1` boxes, padded 14 CSS on three sides and 24 CSS at the bottom so the fan labels are included.
- Crop B is the same union on frame B, with the same padding.
- Fill the capture area with the board background colour sampled from crop A at pixel (8,8).
- Scale both crops to 1080 wide with lanczos and stack them A, then a 56 px gap, then B. If the stack is taller than 1540, scale both by the same factor until it fits, and centre them horizontally.
- In the gap, centre `assets/ui/chevron.png` at 56x56, rotated so that it points down.
- Centre the stack vertically in the capture area.
- The capture must not include the "Tap a tile to begin!" bubble or the move toast.

**02 `02-words-build-a-home.png`: Day band. Headline "Words build a home." No support line.**

Capture: state B at viewport **432x768, DPR 3**.
- After `reloadHome`, wait 2500 ms.
- Pan with `panHouse(page, -250, 8, 460)`, then nudge with +-40 drags until the top edge of the Desert Camp room frame sits 2-10 CSS below the bottom of the "Next:" sign.

Window:
- 360x520 CSS, horizontally centred (x 36-396).
- Top edge is 4 CSS below the sign's bottom edge.
- The bottom edge must stay above the PLAY dock. Measured: the sign ends at about y 164, the dock starts at about y 700 and the gap is 536.

Must include:
- Desert Camp with Fennick, Jungle Hammock with Sloane, and Aquarium Room with Axel and his one lit "!" badge.
- The Scholar's Study plaque, either entirely inside or entirely outside the window.

Reference framing: `.../scratchpad/store/cozy/out/q1_432_2.png`.

**03 `03-cozy-mostly.png`: Dusk band. Headline "A cozy game. Mostly." No support line.**

Capture: state C at viewport **432x768, DPR 3**.
- After `reloadHome`, wait 2000 ms, then `panHouse(page, -300, 8, 460)` six times. This clamps the house at the bottom.

Window:
- 360x520 CSS, horizontally centred.
- Bottom edge is 4 CSS above the top of the PLAY dock.
- If the top edge cuts the ARCHIMEDES plaque, drag the house down by the overlap plus 6 CSS and retake. The well stays inside the window.

Must include:
- Rustic Kitchen with Panko.
- Cozy Den with Ember and her "!" badge.
- The stone foundation, the dirt path and the whole glowing well in the sunset meadow.

Reference framing: `.../scratchpad/store/cozy/out/v_dusk_bottom.png`, rows from CSS 164 to 700.

**04 `04-meet-13-housemates.png`: Parchment band. Headline "Meet 13 housemates." No support line.**

Capture: state D at viewport **432x768, DPR 2.5**. This is the flow of `mystery/dialogue1.mjs`.
1. Run `panHouse(-300)` six times, then pan with +-250 until the `Panko the pangolin` button is within y 120-648.
2. Click it and wait 3200 ms, so the typewriter finishes.

The page must read exactly: "Something funny happened. I went to bed with the spice jars in one order and woke up to find them in another. I must have moved them in my sleep. I must have."

If the first page shows anything else, close the dialogue without pressing Next (closing consumes nothing), reseed and retake.

Window:
- 432x624 CSS, bottom-aligned, so the full dialogue sheet with its portrait, name and Next button is inside.
- If the top edge would cut the dimmed "Next:" sign, raise the viewport height by 36 steps and retake.

**05 `05-then-the-rules-shift.png`: Parchment band. Headline "Then the rules shift." Support "Styles and challenges that stack".**

Capture: state G.
1. Play puzzle, then `finishStory` and `dismissIntros`.
2. Open the setup menu (`/Tap to change puzzle setup$/`).
3. `setViewportSize(432,1060)`.
4. Click `/^Double Shift/`, then `/^Challenge mode, off/`, then `/^Speed Shift, off/`, reopening the menu after each change, as in `cand_scripts/F2_stack.mjs`.
5. `setViewportSize(432,844)` at **DPR 2.5**. Close the menu with `Close puzzle setup` at position (4,4).
6. Run `playSolution(page, {selectOnlyAt: 0})` and capture within 1500 ms, while the clock still reads 90 s or more.

Window:
- 432x624 CSS.
- Top edge 8 CSS above the chip row (`CHALLENGE n undos`, `Double Shift`, `Speed`).
- Must include the instruction banner, the clock, the complete PICK row with its lifted letter, and the complete DROP row with every preview label.

**06 `06-every-word-goes-somewhere.png`: Parchment band. Headline "Every word goes somewhere." (two lines). No support line.**

Capture: state F at viewport **432x768, DPR 2.5, reducedMotion false**. This is the flow of `cand_scripts/K_pit.mjs`.
1. Play puzzle (use `force` clicks, because buttons pulse), then `finishStory` and `playSolution(page)`.
2. Screen the victory frames under rule 12 in section 10.
3. Click `Collect amber in the pit`, then `finishStory(page, 7000)`, wait 2500 ms and `dismissIntros`.
4. Take 3 captures, 2500 ms apart.

Keep the first capture in which:
- no floating word's box intersects another word's box or the box of the text "Something stirs below...";
- at least 3 words are fully visible;
- no visible word reads as grim or violent.

If no capture qualifies, retake from Play.

Window:
- 432x624 CSS.
- Must include the floating words, "Something stirs below...", the pit with its ward marks, and the "Amber pending / Lifetime harvested" summary card.
- The Offer All button must be fully inside or fully outside. Prefer inside: bottom edge 12 CSS below its bottom, if the top edge then clears the header icons.

**07 `07-tea-or-cocoa.png`: Parchment band. Headline "Tea or cocoa?" Support "Ember will remember your answer."**

Capture: state A in its own run at viewport **432x768, DPR 2.5**.
1. Play puzzle.
2. Wait for the heading "A place at the table".
3. Press Continue until the page shows both `The flower cup. Cocoa, please.` and `The chipped cup. Tea, please.` This is page 3/3: cup-03 art, Ember's line "That flower was meant to be a fox. You can be kind about it, but please don't lie.", and both options.
4. Capture.

Treatment:
- Crop the whole story card: the nearest ancestor of `story-scene-scroll` whose box includes the header art. Never cut the card.
- Backdrop: `mobile/assets/story/pages/cup-03.webp`, cover-scaled to 1080x1560, Gaussian blur sigma 24, brightness x0.80.
- Scale the card with lanczos to the largest size that fits 1000x1500, and centre it in the capture area.

**08 `08-stay-for-supper.png`: Dusk band. Headline "Stay for supper." No support line.**

Capture: state E at viewport **432x768, DPR 2.5**.
1. Play puzzle.
2. Wait for the heading "Before it goes cold".
3. Press Continue exactly once, to page 2 of 7.
4. The page shows supper-02 art (a set table with an empty place) and Panko: "Supper. Now. The empty place at the table can wait. The rest of us have stomachs." Capture it.

Do not capture any later supper page. Page 7 (supper-13) is forbidden.

Treatment: the same as slot 07, with the backdrop `mobile/assets/story/pages/supper-02.webp`.

**Final check on the set:** every slot's alt text in section 9 must describe the final crop. If a crop shows different rooms or words than the alt text names, rewrite the alt text, keeping it to 140 characters or fewer, in ASCII and naming what is actually visible.

---

## 4. Landscape and tablet

- **Landscape phone screenshots: none.** Three 9:16 portrait shots already qualify for large-format game placements. The app is portrait-locked, so landscape shots would misrepresent it. The one 16:9 asset is the trailer master.
- **Tablet (7-inch and 10-inch): 4 images, uploaded to both slots.**
  - Portrait 1440x2560, from genuine captures at viewport **720x1280, DPR 2**.
  - Full frame, with no crop, **no caption, no band and no added text**.
  - Stills use `reducedMotion: true`.

| File | State and action | Alt text id |
|---|---|---|
| `t1-house.png` | State B, pan so the "Next:" sign sits directly above the highest built room that is fully visible | T1 |
| `t2-board.png` | State A: Play, `finishStory`, RESTART, tap `Letter L` in row 0 | T2 |
| `t3-cup.png` | State A: Play, Continue to page 3/3 of the cup scene | T3 |
| `t4-dusk-well.png` | State C: bottom clamp (`panHouse(-300)` six times) | T4 |

- Chromebook screenshots and Play Games on PC cards are not produced in this refresh.

---

## 5. Feature graphic: 1024x500, 24-bit PNG, no alpha

The measured safe box is x 154-870, y 76-424. The video play button is assumed to sit at (512,250) with a radius of about 44. No text may sit inside x 440-584, y 180-320.

### A (primary): `upload/feature-graphic.png`

**Tagline:** `Your words keep this house warm.`

**Art:** `mobile/assets/story/pages/witness-05.webp` (960x540). It shows eight residents around a candlelit table with a folded note. It is spoiler-safe art from the solve-28 scene, used only as a picture, with no scene text.

Pipeline (sharp). It was tested on 2026-09-22 and gives a mean luminance of 90.6, which is warm and far from the near-black 47 of the live art.
```
sharp(witness-05.webp)
  .resize(1104, 621, { kernel: 'lanczos3' })
  .extract({ left: 28, top: 83, width: 1024, height: 500 })
  .gamma(1, 1.8)
  .modulate({ saturation: 1.18, brightness: 1.04 })
```
- Bottom scrim: a vertical gradient of `#3B2416` with alpha 0 at y 290 (58%) rising to 0.62 at y 475 (95%).
- Wordmark: `mobile/assets/ui/wordmark.png` resized to 330x83, placed at left 160, top 327.
- Tagline, typeset with Playwright over the art:
  - EpundaSlab-Bold 44 px, fill `#FFF6E0`, hard shadow 3,3 px `#3B2416`.
  - Two lines, "Your words keep" and "this house warm.", right-aligned to x 860, baselines at y 364 and 412.
  - Measured width: 328 px at 44 px, so the left edge is about x 532, clear of the wordmark, which ends at x 490.
  - If the real render's left edge falls below x 510, reduce the size 1 px at a time, to no smaller than 36.
- The play button sits on the folded note. Axel's face (about 565,140) and hands (about 545,205) must stay outside a 44 px circle at (512,250). The tested crop keeps them outside; verify on the final render.
- **Checks:**
  - Mean luminance at least 85.
  - No pure black and no dark gray field.
  - Downscale to 360 px wide and confirm the household, the wordmark and both tagline lines are still legible. Save that downscale as `raw/fg-a-360.png` for review.

Reference prototype for the art only: `.../scratchpad/store/final/fg_check.png`. It uses a stand-in font.

### B (experiment variant only): `upload/experiments/feature-graphic-b.png`

**Tagline:** `Every letter counts.` on two lines: "Every letter" / "counts."

- **Base art:** `mobile/assets/rooms/cozy_den.webp` (1456x720).
```
.extract({ left: 22, top: 22, width: 1412, height: 676 })
.resize({ height: 500 })
.extract({ left: 10, top: 0, width: 1024, height: 500 })
.modulate({ brightness: 1.08, saturation: 1.15 })
```
- **Left wash:** a horizontal gradient of `#3B2416`, alpha 0.62 at x 0 falling to 0 at x 430.
- **Wordmark:** 280x70 at (156, 88).
- **Tagline:** Figtree-Bold 44 px, `#FFF6E0`, 3,3 px `#3B2416` shadow, left x 166, baselines 214 and 262. Measured widths: 238 and 149 px.
- **Hero tiles:** the `puzzle-row-0` card crop from slot 01 frame A (P, the lifted pink L, A, Y), scaled to 320 wide, placed at (156, 300). Its bottom must be no lower than y 424.
- **No character sprite.** Ember is the store icon's subject and must not be repeated.
- The centre (512,250) must fall on the den's wall or window, with no text there.

---

## 6. Trailer

### Deliverables

- **Play preview video: the 9:16 cut**, `trailer-9x16-1080x1920.mp4`.
- **YouTube, press and large screens: the 16:9 master**, `trailer-16x9-1920x1080.mp4`.

Both are exactly **30.0 s = 900 frames at 30 fps**, H.264 High yuv420p with AAC-LC 48 kHz stereo at 384 kbps, and faststart. Both are built from the same recorded frames, the same captions and the same audio mix.

**Timeline figures:**
- Real UI fills 27.6 of the 30 s (92%).
- Real gameplay is on screen from frame 0.
- There is no title card. The only non-UI shot is the 2.4 s end card.

### Recording method (`recordTrailer.mjs`)

**Clock-stepped capture (the proven Concept 2 method):**
1. `launch({width:432, height:768, dsf:2.5, reducedMotion:false, clock:true})`. The clock is installed before `goto` and resumed after install.
2. Stage the state with the clock flowing naturally.
3. Before each clip: `const t = await page.evaluate(() => Date.now()); await page.clock.pauseAt(t + 100);`.
4. Every frame: `await page.clock.runFor(1000/30); await page.screenshot(...)`. Frames are exactly 1080x1920.
5. After the clip, `page.clock.resume()`.

**Input** happens only between frames:
- A tap is a `click()` on a locator.
- A drag is `page.mouse.down()` followed by one `page.mouse.move` step per frame, then `up()`.

**Event log:** write every action to `video/events/<clip>.json` as `{frame, action, sfx}`.

**Handles:** record every clip 0.5 s longer than it is used, at both ends.

**Fallback,** only if clock stepping fails for a clip (frozen animations or a stalled boot):
- A CDP screencast: `--force-device-scale-factor=3`, `Emulation.setDeviceMetricsOverride({width:390,height:700,deviceScaleFactor:3,mobile:false})`, `Page.startScreencast({format:'jpeg',quality:92,maxWidth:1170,maxHeight:2100})`.
- Keep the per-frame timestamps and retime to 30 fps with ffmpeg's concat demuxer.
- Note the fallback in `video/events/<clip>.json`.

**Screening every recorded frame:**
- Reject the take and re-record if any of these texts is visible: `A LITTLE WARMER`, `THANK YOU`, `STILL WARM`, `ONE MORE CUP`, `THERE YOU ARE`, `SAVED FOR LATER` (the current `VICTORY_GLITCH_TEXTS`), or any micro-beat overlay.
- Reject the take if a board shows a word that reads as grim or violent (for example SLAY, SLAYED, KILL, DEAD, GRAVE, TOMB, DOOM).

### Clips

"Frame n" means frame n of the clip after the lead-in handle.

| Clip | State | Staging, then recorded actions | Used frames |
|---|---|---|---|
| R1 opener | A | Play, `finishStory`, `dismissIntros`, RESTART, tap `Letter L` (row 0), then pause. Frame 0 shows L lifted with the fan open. Frame 15: tap `/forms PLANT, valid word$/` (row 1). Frame 51: tap `Letter T` (row 1). Frame 66: tap `/forms HEART, valid word$/` (row 2). Keep recording until 2.0 s after `Next level` is visible. | S1 and S2 = frames 0-101. S3 = 54 frames, starting at the first frame where the victory card is at least 50% opaque. If that frame is after 102, jump-cut to it. |
| R2 boards | H | Three takes, each chosen from the setup menu before pausing: Medium, Medium+ and Expert. For Medium and Medium+: `playSolution({selectOnlyAt:0})` before pausing, then at frame 9 tap the solution slot, so the commit happens with a star burst. For Expert: frame 0 idle, frame 8 tap the first solution letter, so the fan opens. | 28 frames each (0-27) |
| R3 day house | B | Bottom clamp (`panHouse(-300)` six times), then pause. Frames 6-60: drag from (8,300) to (8,660), one step per frame, revealing about three rooms above. Record until the momentum settles. | frames 0-83 |
| R4 invite | I | Pan until the empty Aquarium Room is in the middle of the screen, then pause. Frame 6: tap `Invite animal to Aquarium Room for 100 amber`. Frame 42: tap `Invite for 100 amber`. | frames 0-71 |
| R5 Axel | J | Pan until the `Axel the axolotl` button is within y 150-600, then pause. Frame 3: tap it. The line "Hello! I was following a bubble. Then we both forgot what we were doing." types out. | frames 0-71 |
| R6a reverse | H | Setup menu at 432x1060: choose Reverse Shift, go back to 432x768, close the menu, pause. Frame 6: tap the first solution letter. | frames 0-23 |
| R6b stack | G | Slot 05 staging, but finish at 432x768 at DPR 2.5, then pause. Frame 6: `playSolution({selectOnlyAt:0})`. The clock ticks. | frames 0-23 |
| R6c glass | H | Utility menu, `Open Tile Shop`, `Buy Cathedral Glass for 700 amber` (a real amber purchase), Back, then Play (standard Medium), then pause. Frame 6: tap the first solution letter. Record this after R2 and R6a. | frames 0-23 |
| R7 cup | A | Play, then Continue to page 3/3, then pause. Frame 15: tap `The flower cup. Cocoa, please.`. The response page shows Ember: "Brave. I mean about the cocoa. The flower is excellent company." | frames 0-71 |
| R8 pit | F | Slot 06 staging, then wait 2500 ms at the pit, then pause. Frame 12: tap the fully visible floating word nearest the screen centre that overlaps nothing. It spirals into the pit. | frames 0-65 |
| R9 Panko | D | Slot 04 panning, then pause. Frame 3: tap `Panko the pangolin`. Let the line type out until complete. | 72 frames ending 12 frames after the reveal completes. This may begin mid-sentence. |
| R10 dusk | C | Bottom clamp, then drag the house down 120 CSS and pause. Frames 6-54: drag up 120 CSS, one step per frame, settling on the kitchen, the den and the well. Fire flicker and walking residents stay live. | frames 0-77 |

### Edit timeline (`editTrailer.mjs`)

Frames are 0-899.

| Frames (time) | Shot | Source | Caption |
|---|---|---|---|
| 0-41 (0.00-1.40) | S1 hook | R1 | `Lift a letter.` |
| 42-101 (1.40-3.40) | S2 | R1 | `Drop it in. Two new words.` |
| 102-155 (3.40-5.20) | S3 victory | R1 | none |
| 156-239 (5.20-8.00) | S4 montage | R2 Medium, then Medium+, then Expert, 28 frames each, hard cuts | `Over 4,000 puzzles.` |
| 240-323 (8.00-10.80) | S5 house | R3 | `Every win grows the house.` |
| 324-395 (10.80-13.20) | S6 invite | R4 | `Everyone has something to say.` (to frame 467) |
| 396-467 (13.20-15.60) | S7 Axel | R5 | (carried over) |
| 468-539 (15.60-18.00) | S8 montage | R6a, R6b, R6c, 24 frames each | `Reverse. Double. Race the clock.` |
| 540-611 (18.00-20.40) | S9 cup | R7 | `Your answers stay with them.` |
| 612-677 (20.40-22.60) | S10 pit | R8 | `Where do the words go?` |
| 678-749 (22.60-25.00) | S11 Panko | R9 | none |
| 750-827 (25.00-27.60) | S12 dusk | R10, hard cut in, silence first | none |
| 828-899 (27.60-30.00) | End card | not UI | `The house is very fond of you.`, fading in over frames 846-858 |

- **Caption timing:** captions are visible from the first frame of their shot and have no fade-in at a hard cut. They fade out over 6 frames only where the next shot has no caption.
- **SRT:** `captions-en.srt` carries the same text and timings.
- **YouTube thumbnail:** `youtube-thumbnail-1280x720.png` is the 16:9 master's frame 60, downscaled.

### 9:16 cut layout (1080x1920)

- **Frames:** full-bleed native frames.
  - S1 and S2: a 1.25x zoom centred on the centre of the union of the `puzzle-row-0` and `puzzle-row-1` boxes, taken from R1 frame 0.
- **S7 and S11 lift:** the dialogue sheet sits at the bottom of the screen, under Play's Install button. So:
  - place the source rows at CSS y 192-768 (px 480-1920) at output y 0-1440;
  - fill output y 1440-1920 with the source's bottom 480 px, Gaussian blur sigma 30, brightness x0.6.
- **Caption plaque:**
  - A rectangle at x 60-1020 from y 150, filled `#F3E2BF` at 92% opacity, with an 8 px `#6B4A2E` border and a 3 px `#3B2416` outer line.
  - Text: Figtree-Bold 76 px, ink `#3B2416`, centred, with 36 px inner padding.
  - Measured widths: "Lift a letter." 409, "Over 4,000 puzzles." 700, "Where do the words go?" 854.
  - If a line is wider than 888 at 76 px, try 68 px. If it is still wider, wrap to two lines at 76 px. "Drop it in. Two new words." fits at 68. "Everyone has something to say.", "Reverse. Double. Race the clock." and "Your answers stay with them." wrap to two lines.
  - The plaque height is the text plus 2 x 36.
- **Bottom clear zone:** nothing added (captions, wordmark, end-card text) may sit below y 1440. That is the bottom 25%, reserved for the Install button.
- **End card:**
  - `mobile/assets/environment/sky_dusk.webp` resized to 1080 wide, cropped to the 1920 rows starting at y 170, blur sigma 22, brightness x0.75.
  - `wordmark.png` 820x205, centred, top at y 560.
  - `The house is very fond of you.` in EpundaSlab-Italic 64 px (measured 759 px), `#FFF6E0` with a 3,3 px `#3B2416` shadow, centred, baseline y 940.

### 16:9 master layout (1920x1080)

**Background:** the game's own sky art, cover-cropped to 1920x1080 from the band centred at 45% of the scaled image's height, blur sigma 22, brightness x0.88.
- `sky_day.webp` for frames 0-467.
- A 15-frame crossfade to `sky_afternoon.webp` at frame 468, used through frame 749.
- A hard cut to `sky_dusk.webp` at frame 750, on the music cut, used through frame 899.

**Phone column:** the frame scaled to 572x1016 at x 674, y 32, with a 28 px corner-radius mask and a drop shadow (0, 12 px, blur 40, `#3B2416` at 45%). There is no device frame.

**Caption plaque:**
- Parchment plaque centred in x 80-620 at y 540, with the same styling as the 9:16 plaque.
- Text Figtree-Bold 72 px, inner width 476, up to 3 lines.

**Right panel (x 1330-1840):** a resident's idle sprite at 420x420, bottom at y 960.
- `assets/characters/fox/idle.png` for S3 to S5 and S9 to S10.
- `axolotl/idle.png` for S6.
- None elsewhere.
- **Never** a `robed*.png` sprite.

**Per-shot overrides:**
- **S1 and S2:** no phone column. The R1 row-union crop is scaled to 1180 wide at x 680-1860, centred vertically.
- **S7:** no column. The dialogue sheet crop (from the sheet's top edge to CSS 768) is scaled to 1000 wide at x 760-1760, centred vertically, with the caption plaque on the left.
- **S11:** the same sheet treatment. The left panel shows `assets/characters/pangolin/idle.png` at 420x420 instead of a caption.

**End card:**
- `sky_dusk.webp`, blur sigma 22, brightness x0.75.
- Wordmark 760x190, centred, top y 330.
- Line: EpundaSlab-Italic 60 px (measured 712 px), `#FFF6E0` with a 3,3 px shadow, centred, baseline y 700.

### Audio

**Music:** the game's own beds from `mobile/assets/music/`. The offsets below were measured with ebur128 on 2026-09-22.

| Trailer time | Bed | Start in file | Fades |
|---|---|---|---|
| 0.00-8.40 | `puzzle_phase0.mp3` | 0:02.00 (already about -16 LUFS momentary) | fade in 0.15 s; crossfade out 7.60-8.40 |
| 7.60-25.00 | `home_phase0.mp3` | 0:25.00 (about -13 to -15 momentary) | crossfade in 7.60-8.40; **hard cut to silence at 25.00** (15 ms ramp, no audible tail) |
| 25.00-25.40 | silence | none | none |
| 25.40-30.00 | `home_phase2.mp3` | 1:11.00 (a -33 dip that swells to about -15 by 1:14) | fade in 0.3 s; fade out 28.80-30.00 |

**SFX:** from `mobile/assets/sounds/`, placed at the frames logged in the events files. Only the files listed below may be used.

| Action | File |
|---|---|
| Letter pick | `letter_select.wav` |
| First, second and third consecutive valid commit | `valid_move.wav`, `valid_move_2.wav`, `valid_move_3.wav` |
| Each star appearing | `star_pop_1.wav`, `star_pop_2.wav`, `star_pop_3.wav` |
| PERFECT title | `perfect.wav` |
| Button taps (invite, Continue, menu) | `ui_tap.wav` |
| Invite completes | `unlock.wav` |
| A dialogue opens (once, not per character) | `dialogue.wav` |
| Story choice | `story_answer.wav` |
| Pit word tapped | `pit_devour.wav` |

Do not use any `_dark` or `_peace` variant, `glitch.wav`, `arrival.wav` or `phase_change*`.

**Mix:**
- The music bus sits at about -20 LUFS short-term under the SFX, with SFX at their file level.
- Final two-pass `loudnorm` to I=-14, TP=-1, LRA=11.
- 48 kHz stereo.
- Listen through once and confirm the three music joins land cleanly. If a join lands mid-phrase, move that bed's start forward in 0.5 s steps, never more than 2.0 s.

### Encode

```
ffmpeg -framerate 30 -i frames-9x16/%05d.png -i mix.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 16 -profile:v high -pix_fmt yuv420p -r 30 \
  -maxrate 16M -bufsize 32M -c:a aac -b:a 384k -ar 48000 -ac 2 \
  -movflags +faststart -t 30 trailer-9x16-1080x1920.mp4
```

Encode the 16:9 master the same way from `frames-16x9/`. Then confirm with `ffmpeg -i`:
- duration 00:00:30.00;
- 1080x1920 (or 1920x1080) at 30 fps;
- H.264 High and AAC at 48000 Hz stereo.

### Upload (owner)

1. **YouTube:** upload the 9:16 file as its own video.
   - Title `WordShift: Cozy Word Puzzle (Trailer)`.
   - Public or unlisted, monetization off, "No, it's not made for kids", not age-restricted, embedding allowed.
   - Add `captions-en.srt` as the caption track.
2. **Play Console:** paste the 9:16 video's link into the preview video field as `https://www.youtube.com/watch?v=<ID>`. Never use the `/shorts/` URL and never add a timecode.
3. **16:9 master:** upload it separately, for the channel and press only.
4. **Content ID:** after upload, check both videos for Content ID claims. A claim can add ads, which disqualifies the video for Play.

---

## 7. What goes where in Play Console (owner upload list)

- **Main store listing:**
  - Text: the app name, short description and full description from section 1.
  - Graphics: `upload/feature-graphic.png` with alt text FG-A; phone screenshots 01-08 in order, each with its alt text; tablet 7-inch and 10-inch both get t1-t4 with alt texts T1-T4; the preview video from section 6.
  - The app icon stays as it is.
- **Tags:** pick up to 5 from the Console's own list. Suggested: Word, Puzzle, Casual, Offline, and a stylized or pixel art-style tag if the Console offers one.
- **Experiment assets** stay in `upload/experiments/` until the owner runs the plan in section 1.

---

## 8. Build QA before hand-off

Check each deliverable before hand-off:

- **Phone screenshots:**
  - 1080x1920, RGB, no alpha.
  - Band plus seam is 360 px (18.75%).
  - No capture is resampled except slot 01, and slots 07 and 08, which are scaled down.
- **Feature graphics:** both are 1024x500 RGB with no alpha.
- **Tablet images:** 1440x2560, RGB, no alpha.
- **Text files:** every copy file, the alt-text file and the SRT pass `grep -P '[^\x00-\x7F]'` with no matches, and contain no `...`, `--`, em dash, en dash or curly quote.
- **Character counts:** app name 27, short description 77, full description 3,625. Recount after writing the files.
- **Contact sheet:** `contact-sheet.png` shows slots 01-08, FG-A and FG-B side by side at thumbnail size, about 180 px wide per phone shot, so they can be read the way a gallery shows them.
- **Section 10:** every item is checked, and a signed-off list is written into `README.md`.

---

## 9. Alt text (140 characters or fewer, ASCII)

Write this to `alt-text.tsv`. If a final crop shows something different, rewrite that line.

| Id | Alt text | Chars |
|---|---|---|
| 01 | Word puzzle: the L lifts out of PLAY and a check marks PLANT, then the rows read PAY and PLANT after the move | 109 |
| 02 | Pixel-art house on a sunny afternoon: a fennec fox's desert camp, a sloth in a jungle hammock and an axolotl in his aquarium | 124 |
| 03 | The same house at sunset: Panko in her kitchen, Ember by the fire in the den and a softly glowing well at the end of the path | 125 |
| 04 | Panko the pangolin, in her kitchen: I went to bed with the spice jars in one order and woke up to find them in another. | 119 |
| 05 | A Double Shift word puzzle with Challenge and Speed on: a countdown clock, an undo limit and a letter lifted from the top word | 126 |
| 06 | Words from a solved puzzle float over a hole in a sunny forest clearing, beside the line Something stirs below | 110 |
| 07 | Painted story page with a flower-painted cup: Ember asks you to be kind but honest, and you choose tea or cocoa | 111 |
| 08 | A painted supper table set with soup and bread. Panko says the empty place at the table can wait | 96 |
| FG-A | Eight animal friends around a candlelit table with a folded note, beside the WordShift logo and Your words keep this house warm | 127 |
| FG-B | A sunny pixel-art den with a fire and armchair, the WordShift logo and letter tiles spelling PLAY with the L lifted | 115 |
| T1 | The WordShift house on a tablet: rooms stacked one above another with animal residents under a sunny mountain sky | 113 |
| T2 | A WordShift puzzle on a tablet with the L lifted from PLAY and previews of where it can land in PANT | 100 |
| T3 | A painted story page on a tablet: a flower-painted cup by the fire and two answers to choose from | 97 |
| T4 | The WordShift house on a tablet at sunset, with a fox by the fireplace and a glowing well below the house | 105 |

---

## 10. Hard boundaries (the build must pass every item)

**Genuine UI and honest claims**

1. Every gameplay image and every video frame except the end card is a real render of the current build. Only local progression may be seeded, and only real UI input may be used. Never edit, hide, restyle or re-layer the DOM. There are no invented words, no mocked UI and no device frames, fingers or badges.
2. Seeds must be coherent with the game's rules:
   - solve gates, room gates and story gates agree with the phase;
   - badges agree with the dialogue sessions and the conversation read ids;
   - `unlockedAnimals`, `unlockedRooms` and `introsSeen` are passed in every patch.
3. Claims come from the table in section 1 and nowhere else:
   - The puzzle count is "Over 4,000", never a higher number and never "hand-crafted".
   - Never give a count of scenes or illustrations.
   - The friend link is "a link to a puzzle you solved".
   - The mode is "Blind Mode", never "Blind Offering".
   - "No purchase is needed to follow the main story" is the only statement about story and purchases. Never imply that purchases leave the pace unchanged.
   - Keep the ads and in-app purchases disclosure, including the Supporter subscription and the remove-ads purchase, and keep the mild-horror line.
   - Never use the "Practice boards" line.

**Spoilers**

4. Never show anything from phase 3 or later. There are no house shots at phase 3, because the shadow figure renders faintly there. Never show robes (`robed*.png`), the shadow figure, crimson eyes, CLOSED or CLOSER, the final board, the Arrival, or any ending or New Cycle content.
5. Never show these story scenes or their art: echo (pages, lines and the notebook beat), the witness choice page, and the scenes plan, shelter, record, seeds, promise, returned, council, after, reply and old_mark. Never show `private-room*` or `outward-road*` art, or supper-13 ("the low hum under the floor"). The only story pages allowed are:
   - cup: choice page 3/3 and response page cup-04;
   - supper: page 2 (supper-02);
   - witness-05, as picture-only art for the feature graphic.
6. Never show the Belfry or Tock's room, the Unbroken Weave, the Music Box, The Pattern, New Cycle, or The Offering rows.
7. Pit captures are at phase 0 only, with the line "Something stirs below...". Never show "The circle hungers." or any other ward or pit line from phase 1 or later.

**Copy and captions**

8. Never announce or locate the presence. Teases stay at the level of "keeps secrets", "Mostly.", "very fond of you" and "almost too kind". Never use "something under the floor", "The house is listening", "paying attention" or "Your word was already written".
9. Never write a phase or stage number, or name any stage of the darkening.
10. All copy, captions, alt text and SRT lines follow these rules:
    - plain ASCII, straight quotes, no em or en dashes;
    - no "..." in the short description;
    - no call to action anywhere ("Download now", "Play now");
    - no ranking or promotional words ("best", "#1", "top", "new", "free", "sale");
    - no prices, testimonials, awards or download counts, no "no ads" and no "free forever";
    - never describe the music as "composed" or "orchestral".
11. No caption repeats another surface verbatim. The short description, screenshot headlines and support lines, feature graphic taglines and video captions are all distinct as written. "Mostly." appears in slot 03 and at the end of the full description only.

**Captures**

12. Every victory frame is screened. Reject any frame showing a `VICTORY_GLITCH_TEXTS` string (A LITTLE WARMER, THANK YOU, STILL WARM, ONE MORE CUP, THERE YOU ARE, SAVED FOR LATER) or any micro-beat overlay. No asset is built on a micro-beat, including "YOU ARE DOING SO WELL".
13. Reject any board or floating pit word that reads as grim or violent.
14. Phone screenshot rules:
    - The caption band plus seam is 20% of the image height or less (here 18.75%).
    - A genre signal (letters, words or a board) is visible in slot 01 and named in slot 02's headline.
    - The dusk tease is at slot 03.
    - No cute-only card (the "A NEW FRIEND!" medallion, dialogue collages) appears in slots 01-03.
15. Tablet images carry no added text. There are no landscape phone screenshots.

**Feature graphic, trailer and files**

16. The feature graphic:
    - Every focal element sits inside x 154-870, y 76-424.
    - No text sits under the centre play button.
    - Mean luminance is at least 85.
    - Ember is not the hero and no tile-plus-fox mark repeats the icon.
    - No composited house state that cannot happen in the game.
17. The trailer:
    - The Play video is the 9:16 cut.
    - Real UI fills at least 80% of it (it is 92%), and real gameplay shows from frame 0.
    - Nothing added sits in the bottom 25% of the 9:16 frame.
    - Captions are burned in and also uploaded as SRT.
18. The live campaign `launch-2026-09`, its scripts and the `docs/` mirrors are untouched.

---

## 11. Owner actions and flags (outside the build)

1. **Music rights.** The beds were made with Suno; their metadata says "made with suno". Before uploading the trailer, confirm that the Suno plan covers commercial use in a trailer. After uploading, check both YouTube videos for Content ID claims.
2. **Micro-beat visibility bug, separate from this listing.**
   - On web, the micro-beat overlays (for example the solve-31 "YOU ARE DOING SO WELL" title and the ambient whispers) render *underneath* the victory card. An ancestor's transform creates a stacking context at z 0 while the card sits at z 500.
   - If Android behaves the same way, players never see these beats.
   - This needs a device check on the internal-testing build.
3. **Stale copy outside the listing, to align later:**
   - `SupportComparison.tsx` still says "All three keep the same story pace", which contradicts the accepted exception that paid amber can bring the reveal earlier.
   - `docs/index.md` has em dashes and names "Blind Offering" publicly.
   - `docs/CURRENT_BUILD.md` and `PUZZLE_BANK_TOP_UP_2026-09-06.md` still say 4,372 of 7,356 puzzles. Today's audit gives 4,370 of 7,352.
4. **After upload:**
   - Copy the uploaded feature graphic over `docs/feature-graphic.png`, and record the new campaign as live in CLAUDE.md and in the Play_store README.
   - Keep `launch-2026-09` until the new listing has passed review.
5. **Featuring.** Consider enrolling in the Play "Level Up" program (enrollment opened 2026-09-01), which affects eligibility for collections. It has no effect on the listing assets.
6. **Review risk.** A cast-first feature graphic can read as appealing to children, which is a review risk for a 13+ game. The adult signals are: the board in slot 01, the dusk tease in slot 03, Panko's line in slot 04, the mild-horror disclosure and the wink in the short description. If Play still flags the listing, swap in feature graphic B.
