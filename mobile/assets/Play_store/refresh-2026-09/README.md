# WordShift Play listing refresh (refresh-2026-09)

A complete en-US Google Play listing for WordShift: store text, eight phone
screenshots, four tablet screenshots, a main feature graphic plus an experiment
variant, and a 39 second trailer in two cuts. Everything is built from genuine
renders of the current game by scripts in `mobile/scripts/store/`. The brief
is `brief.md`.

**Status:** built and checked, **not uploaded**. `launch-2026-09` stays the
live listing until the owner uploads this pack and it passes review. Nothing in
`launch-2026-09` or its scripts was changed. Two game layout defects found
while capturing were fixed in the same change (the tablet board overflow and
the story card's text inset, items 5 and 6 below), and the frames they touched
were recaptured on the fixed code. Everything is ready; the tablet set waits
only for a Play build carrying the board fix (owner action 4).

Open `preview.html` for the whole listing as Play shows it (with the video play
button drawn over the feature graphic), and `contact-sheet.png` for the phone
shots at gallery size and both feature graphics at 360 and 256 px wide.

## What goes where in Play Console

| Play Console | File | Notes |
| - | - | - |
| App name | `copy/app-name.txt` | 27 of 30 |
| Short description | `copy/short-description.txt` | 77 of 80 |
| Full description | `copy/full-description.txt` | 3,677 of 4,000 (a pre-checked fallback for the daily rank line is in `copy/listing-en-US.json`, owner action 3) |
| Feature graphic | `upload/feature-graphic.png` | FG-A; alt text FG-A |
| Phone screenshots, in order | `upload/phone/01-shift-one-letter.png` to `08-stay-for-supper.png` | alt texts 01 to 08 |
| 7-inch and 10-inch tablet screenshots | `upload/tablet/t1-board.png`, `t2-house.png`, `t3-cup.png`, `t4-pit.png`, in that order, to both slots, once a build with the board fix is live (owner action 4) | alt texts T1 to T4 |
| Video | the YouTube link of `video/trailer-9x16-1080x1920.mp4` | upload steps in `video/README.md` |
| App icon | unchanged | `upload/store-icon-512.png` is a byte copy of the live icon, for the preview only |

- Alt texts are in `alt-text.tsv` (id, tab, text; all 140 characters or fewer).
- `copy/README.md` has paste notes, the category and tag suggestions and the
  ads disclosure; `copy/claims-and-sources.md` traces every claim to the game;
  `copy/experiments.md` is the experiment plan.
- `upload/experiments/feature-graphic-b.png` (FG-B) is for the graphics
  experiment only. Keep it out of the main listing unless it wins, or review
  flags FG-A.
- `manifest.json` lists every deliverable with its size, SHA-256, source
  captures and treatment.

## Reproduce

From `mobile/`, with the Expo web build of the game already served at
http://localhost:8081 (no script starts or stops it), Chromium at
`/opt/pw-browsers/chromium` (or `WORDSHIFT_CHROMIUM`) and ffmpeg at
`/usr/local/bin/ffmpeg` (or `FFMPEG`):

```
node scripts/store/captureRefresh.mjs      # raw/: every capture, plus raw/provenance.json
node scripts/store/buildRefresh.mjs        # upload/, manifest.json, alt-text.tsv, contact-sheet.png, preview.html
TRAILER2_WORK=/path/with/3GB node scripts/store/buildTrailer.mjs  # video/: both cuts, SRT, stills, report, events
node scripts/store/refresh/verifyCopy.mjs  # must exit 0
```

- `captureRefresh.mjs s01 t2` runs only those jobs (s01 to s08, t1 to t4, and
  `t2wide`, the tablet board, which refuses to capture if a row leaves the
  screen); `buildRefresh.mjs phone tablet
  feature icon` builds only those targets (the review files are always
  rebuilt); `buildTrailer.mjs --edit-only` re-edits from recorded clips and
  `buildTrailer.mjs K1 K8` records only those clips again.
- The brief's names `scripts/store/refresh/captureStills.mjs`,
  `buildStills.mjs` and `buildFeature.mjs` forward to the scripts above;
  the trailer steps are `trailer2/record.mjs`, `edit.mjs` and `install.mjs`. No npm
  scripts were added.
- Captures are real renders, so a new game build, a different board served by
  the bank or drifting pit words can change a take; the scripts measure, screen
  and retake until every rule below holds, and record what they used.

## Build QA (brief section 8)

- **Phone screenshots:** all eight are 1080x1920, RGB, no alpha. Band plus seam
  is 360 px (18.75%). Only slot 01 (scale 0.6166), slot 07 (scale 0.8929) and
  slot 08 (card scale 0.7427, under its page's painting) are resampled; every
  other slot places its capture window 1:1.
- **Feature graphics:** both 1024x500, RGB, no alpha. Mean luminance (the
  Rec. 601 luma of the final PNG, averaged over every pixel, as
  `buildRefresh.mjs` prints it and `manifest.json` records it): FG-A 93.7,
  FG-B 112.7.
- **Tablet images:** all four 1440x2560, RGB, no alpha.
- **Text files:** every copy file, `alt-text.tsv` and `video/captions-en.srt`
  are plain ASCII with no "...", "--" (outside the SRT timing separator), em
  dash, en dash or curly quote; `verifyCopy.mjs` checks all of them and exits 0.
- **Character counts:** app name 27, short description 77, full description
  3,677 (not the brief's 3,625: the description carries the review fixes and
  names what the game shows; `copy/claims-and-sources.md`, notes 5, 7 and 8).
  Each `.txt` file is the field plus one final newline, which Play trims.
- **Contact sheet:** slots 01 to 08 at 180 px wide, FG-A and FG-B side by side
  at 740 px wide (the sheet says so), and both again at 360 and 256 px with the
  play button drawn in.
- **Section 10:** signed off below.

## Hard boundaries (brief section 10), signed off

Checked on 2026-09-23 against the files in this folder; items 1, 4, 5, 7 and 17 rechecked on 2026-09-26 for the revised trailer.

- [x] 1. Every gameplay pixel is a real render of the current build (HEAD `4fc0121f`; `s07`, `s08`, `t2-board` and `t3` were recaptured on the working tree that adds the board and story-card fixes committed with this pack, which is why their provenance reads `gameSourceMatchesHead: false`). Only local progression is seeded; only real clicks, drags and the page clock (to wait out drifting clouds) are used; the DOM is never edited; no invented words, mocked UI, device frames, fingers or badges. The trailer's additions (caption plaques, the bottom border closing each dialogue sheet, the afternoon-to-sunset sweep between two recordings of the same scroll, and the end card's wordmark, lines and extended sky) are disclosed in brief section 6 and item 17; the 16:9 master adds the game's blurred sky art around the real frames. (`raw/provenance.json`, `video/events/`)
- [x] 2. Seeds agree with the game's rules; the two session corrections are in `raw/SUBSTITUTIONS.md`, item 4. `unlockedAnimals`, `unlockedRooms` and `introsSeen` go in every patch (`scripts/store/refresh/states.mjs`).
- [x] 3. Claims come only from the claims table: "Over 4,000", no scene counts, "a link to a puzzle you solved", "Blind Mode", the one story and purchase line, the ads and purchases disclosure with the Supporter subscription and remove-ads purchase, the mild-horror line, no "Practice boards". (`copy/claims-and-sources.md`; `verifyCopy.mjs` bans the rest)
- [x] 4. Nothing from phase 3 or later: no robes, shadow figure, crimson eyes, CLOSED or CLOSER, final board, Arrival, ending or New Cycle. The dusk house (slot 03, the trailer's sunset scroll and end card, Ember's den) is phase 2.
- [x] 5. Story pages shown: cup choice page 3/3 (slot 07, T3), supper-02 (slot 08), witness-05 picture only (FG-A, and the YouTube thumbnail, see Deviations). No other scene or art; the trailer shows no story page.
- [x] 6. No Belfry, Tock's room, Unbroken Weave, Music Box, The Pattern, New Cycle or The Offering rows.
- [x] 7. Pit captures (slot 06, tablet T4) are phase 0 with "Something stirs below...". The trailer shows only the pit's well under the house, with no pit line.
- [x] 8. The presence is never announced or located; teases stay at "keeps secrets", "Mostly.", "very fond of you".
- [x] 9. No phase or stage number or name.
- [x] 10. All copy, captions, alt text and SRT: plain ASCII, straight quotes, no dashes, no "..." in the short description, no call to action, no ranking or promotional words, no prices, testimonials, awards, download counts, "no ads" or "free forever", no "composed" or "orchestral".
- [x] 11. No surface repeats another verbatim; "Mostly." only in slot 03 and at the end of the full description (`verifyCopy.mjs` checks both).
- [x] 12. Every victory frame screened for the six glitch strings and micro-beat overlays; no asset uses a micro-beat.
- [x] 13. Every board, preview and pit word screened for grim or violent words (trailer board words also for obscurity).
- [x] 14. Band plus seam 18.75%; letters in slot 01 and "Words" in slot 02's headline; the dusk tease at slot 03; no cute-only card in slots 01 to 03.
- [x] 15. Tablet images carry no added text; no landscape phone screenshots.
- [x] 16. Feature graphic: faces, the wordmark and the tagline inside x 154-870, y 76-424 (the tips of Ember's ears reach just above y 76, see Deviations); no text under the play button; mean luminance 93.7 (Rec. 601 luma); Ember is one of eight, not the hero, and there is no tile-plus-fox mark; the picture is painted story art, not a composited house state.
- [x] 17. The Play video is the 9:16 cut; real UI fills about 85% of it and gameplay shows from frame 0; its additions are the four the item lists; nothing is added in the bottom 25%; captions are burned in and in `video/captions-en.srt`.
- [x] 18. `launch-2026-09`, its scripts and the `docs/` mirrors are untouched.

## Deviations from the brief

Each is written up where it happens, with the reason:

- **Captures** (`raw/SUBSTITUTIONS.md`): the tablet board shot waited on a
  game fix, now made; the dusk well frame is not in the tablet set; slot 04 is a
  380 CSS wide render with the whole study above Panko's sheet; slot 05's
  window; the state B and C session corrections; the framing of slots 01, 02,
  03 and 06 and of the two tablet house frames (raw t1 and t4); the second review's capture fixes (section 7:
  motion-on stills paused on a moment with no cloud sliced and no road seam).
- **Slots:** slot 04 is headed "Stories in each room." with the support line
  "13 housemates to get to know." (the brief's "Meet 13 housemates." promised a
  cast over one resident's conversation) and sits on the day band (its frame
  shows the afternoon sky; the parchment band had merged with the cream sheet
  into one beige block, and it breaks the run of parchment bands); slot 08 shows the supper painting
  large above its story card (the card alone was mostly buttons); slot 01's
  panels are cropped 8 CSS in from the screen edges with a soft inner rim.
- **Trailer** (`video/README.md`): S5 and S6 swapped and S5's caption changed
  so the house only grows on screen and the claim is exact; S2's caption uses
  "real" (section 10 bans "new"); board clips rendered on a taller screen;
  S7 cut 0.6 s after Axel's line and the time given to S11 so Panko's line is
  held 2 s; the pit word is chosen so its whole spiral stays on screen; the
  composed thumbnail; timing and audio details.
- **Copy** (`copy/claims-and-sources.md`): the full description is 3,677
  characters with both reviews' fixes; the daily line names "your rank among
  the day's players"; the friend link line is now "Share your results with
  friends."
- **FG-A:** the tips of Ember's ears reach just above y 76. Lowering the art
  far enough to clear them puts Axel's hands under the video play button; every
  face is inside the safe box. FG-A is painted story art in a softer, more
  realistic style than the pixel-art cast in every screenshot (the animals wear
  no costumes there); it is genuine game art, but judge FG-A against FG-B on
  1-day retention as `copy/experiments.md` says, since a style mismatch can win
  installs and lose players.
- **FG-B and the YouTube thumbnail:** the hero tiles spell PLANT (slot 01 frame
  B's PICK row), not P L A Y, which on its own read as a Play button.

## Owner actions

Before upload:

1. **Music rights.** The trailer's beds were made with Suno. Confirm the plan
   covers commercial use in a trailer; after upload, check both YouTube videos
   for Content ID claims (a claim that adds ads disqualifies a Play video), and
   keep monetization off.
2. **Listen to the trailer once.** The mix was checked by measurement only.
3. **Daily rank line.** Confirm on a signed production build that a Daily
   rank posts end to end (`docs/LAUNCH_CHECKLIST.md`) before the line "your rank
   among the day's players" goes live. If it has not, paste the pre-checked
   fallback "- A daily word puzzle with streaks" in its place
   (`full_description_fallbacks` in `copy/listing-en-US.json`; `verifyCopy.mjs`
   checks it: 3,639 characters, keyword counts unchanged).
4. **Tablet screenshots: after the board fix ships.** The tablet set leads with
   the puzzle board (`t1-board.png`), captured on the fixed board layout (item
   5). Upload it once a Play build carrying that fix is live, so the board
   frame matches what tablet players see.

Game issues found while capturing (outside the listing):

5. **Tablet board overflow: fixed.** At 600dp and wider, `computeBoardScale`
   scales the board by up to 1.2 while each row card was already screen-wide,
   so the PICK and DROP cards and tags ran off both edges and the scaled rows
   slid under the chrome. `getBoardScaleWrapperStyle`
   (`src/services/slotEstimation.ts`) now lays the rows out at 1/scale of the
   width and reserves the added height; the board stays centred, so the drag
   math is unchanged. Tablet devices in 1.4.5 are portrait-locked, so this is
   every 7-inch and 10-inch player. It ships with the next build (JavaScript
   only, so an OTA onto the 1.4.5 binary carries it).
6. **Story card text inset: fixed.** The story reader's body, page counter and
   answer trays started on the frame's last vignette ring. The card now adds
   an 8 dp reading gutter inside the panel token (`STORY_READING_GUTTER_DP` in
   `src/components/storySceneLayout.ts`); slots 07 and 08, T3 and the first
   trailer's clip R7 were recaptured.
7. **Pit spiral at narrow widths.** The devour spiral swings a tapped word out
   by up to about 0.8 of its distance from the pit centre, so on a 432 CSS wide
   phone a word floating near the top or the edges leaves the screen mid-flight
   (the first trailer picked a word whose spiral stayed on screen; the
   current trailer has no pit shot).
8. **Micro-beat visibility** (brief section 11): on web the micro-beat overlays
   render under the victory card; check the internal-testing build on a device.
9. **Stale copy outside the listing** (brief section 11): `SupportComparison.tsx`
   ("All three keep the same story pace"), `docs/index.md` (em dashes, "Blind
   Offering"), and the puzzle totals in `docs/CURRENT_BUILD.md` and
   `docs/PUZZLE_BANK_TOP_UP_2026-09-06.md`.

After upload:

10. Run the experiments in `copy/experiments.md`, in the order it gives
    (screenshot slots 01 and 02 swapped, then the short description
    alternatives, then FG-A against FG-B), one after another. If Play flags the
    cast-first FG-A as appealing to children, swap in FG-B.
11. Copy the uploaded feature graphic over `docs/feature-graphic.png`, record
    `refresh-2026-09` as the live campaign in CLAUDE.md, and keep
    `launch-2026-09` until the new listing has passed review.
