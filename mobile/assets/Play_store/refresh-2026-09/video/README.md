# WordShift trailer (refresh-2026-09)

A 30 second trailer built from real recordings of the current game, in two
cuts: a 9:16 cut for the Play Store preview video and a 16:9 master for
YouTube, press and large screens. Both cuts use the same recorded frames,
captions and audio mix. Brief: `../brief.md`, section 6.

## Files

| File | What it is |
| - | - |
| `trailer-9x16-1080x1920.mp4` | **The Play preview video.** Upload it to YouTube and paste the link into Play Console. |
| `trailer-16x9-1920x1080.mp4` | The 16:9 master, for the YouTube channel, press and large screens. |
| `captions-en.srt` | English captions, the same text and timings as the burned-in captions and as `trailer.captions` in `../copy/listing-en-US.json` (`verifyCopy.mjs` compares them cue by cue). |
| `youtube-thumbnail-1280x720.png` | A composed thumbnail: the painted candlelit-table art that FG-A uses (`assets/story/pages/witness-05.webp`, picture only, no page text), the wooden wordmark at the bottom left and the real PICK-row tiles spelling PLANT (the moved L locked in, cropped from `../raw/s01-frame-b-after-move.png`) at the bottom right, clear of YouTube's duration badge. The only words are the wordmark and PLANT, so it reads at YouTube's small list sizes; P L A Y alone read as a Play button beside YouTube's own. |
| `poster-9x16-1080x1920.png` | Frame 20 of the 9:16 cut (the L lifted over PANT, "Lift a letter."). Use it as a still wherever a portrait poster is needed. |
| `events/<clip>.json` | One file per recorded clip: the seeded state, every input as `{frame, action, sfx}`, the per-frame screening result and probes. |
| `trailer-report.json` | The build record: the shot list with source frames, caption sizes, the audio beds, gains and every SFX placement, loudness, and what ffmpeg reports for each output. |

## Specs (measured with `ffmpeg -i` on the finished files)

| | 9:16 cut | 16:9 master |
| - | - | - |
| Duration | 00:00:30.00 (900 frames) | 00:00:30.00 (900 frames) |
| Video | H.264 High, yuv420p (tv, BT.709), 1080x1920, 30 fps | H.264 High, yuv420p (tv, BT.709), 1920x1080, 30 fps |
| Audio | AAC-LC, 48000 Hz, stereo (384 kb/s requested) | the same mix |
| Faststart | yes (moov before mdat) | yes |
| Size | 14.2 MB (14,184,928 bytes) | 10.1 MB (10,099,386 bytes) |
| Decoded frames | 900 | 900 |

- Encode: `-vf scale=out_color_matrix=bt709:out_range=tv,format=yuv420p`, libx264 `-preset slow -crf 16 -profile:v high -maxrate 16M -bufsize 32M`, tagged `-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv`, AAC 384k, `-movflags +faststart`. The RGB frames are converted with the BT.709 matrix and the stream says so, so players do not decode with the BT.601 default and shift the greens and skin tones (a decoded frame differs from its PNG source by 1.5 levels on average).
- Loudness of the final mix: -13.9 LUFS integrated, true peak -1.0 dBTP, LRA 4.6 LU; loudnorm stayed in linear mode (`trailer-report.json`, `audio`).
- ffmpeg reports the AAC stream at 337 kb/s for the 384k request (its encoder's average for this material).
- Real game UI fills frames 0 to 827 (27.6 s, 92%). Gameplay is on screen from frame 0. The only frames that are not the game are the 2.4 s end card, which uses the game's own sky art, wordmark and font.

## Shot list (as built)

Times are in seconds; frames are the 30 fps timeline. R-clips are the recordings (details in `events/`).

| Time | Frames | Shot | Source | What happens | Caption |
| - | - | - | - | - | - |
| 0.00-1.40 | 0-41 | S1 hook | R1 0-41, state A | The opener board (PLAY, PANT, HEAR, "Tap a tile to begin!"). At 0.23 s the L lifts out of PLAY and the preview fan opens over PANT; at 1.33 s it drops in. | Lift a letter. |
| 1.40-3.40 | 42-101 | S2 | R1 42-101 | PAY and PLANT with the star burst, then the T lifts out of PLANT, the fan opens over HEAR and the drop into HEART wins the board. | Drop it in. Two real words. |
| 3.40-5.20 | 102-155 | S3 victory | R1 102-155 | The victory card: PERFECT!, FLAWLESS!, three stars pop in, confetti, the word journey PAY, PLAN, HEART, and the seventh win's real breakdown (EASY 8, 3 star +4, Total 12; state A has cleared EASY before, so no first-clear bonus). | none |
| 5.20-8.00 | 156-239 | S4 montage | R2a, R2b, R2c 0-27 each, state H | Three real boards, hard cuts: Medium (the T out of HITS drops into MARTS, with the star burst), Medium Plus (the R out of PALER drops into FARMED), Expert (the D lifts out of BALDER over MEANER). | Over 4,000 puzzles. |
| 8.00-9.40 | 240-281 | S5 invite | R4 0-41, state I | The four-room day house for 0.67 s, then the empty Aquarium Room's invite card is tapped and "A new friend!" rises: Axel, 100 amber, Invite Axel!. The shot cuts on the Invite tap and its chime rings on over the cut. | Your wins build the house. |
| 9.40-12.47 | 282-373 | S6 house | R3 0-91, state B | The grown day house, Axel already home: a slow drag up from the well and Ember's den, past the kitchen and the study, to the aquarium (Axel's news badge lit) and Sloane's jungle hammock. | Everyone has something to say. |
| 12.47-14.10 | 374-422 | S7 Axel | R5 5-53, state J | Axel's sheet is already up; his line types out, "Hello! I was following a bubble. Then we both forgot what we were doing.", and holds 0.6 s. | (carried over) |
| 14.10-16.50 | 423-494 | S8 montage | R6a, R6b, R6c 0-23 each | Reverse Shift (the E lifts out of FINE), Double Shift with Challenge and Speed on (the R lifts out of RIVET over SHADE, the clock running), then a Medium board with Speed on in the Cathedral Glass tile style bought in the Tile Shop with amber (the N lifts out of LONG; the clock ticks 57 to 56 at 0.37 s into the part). | Reverse. Double. Race the clock. |
| 16.50-18.90 | 495-566 | S9 cup | R7 0-71, state A | The first story scene's choice page (the flower-painted cup, tea or cocoa); "The flower cup. Cocoa, please." is pressed at 1.2 s and Ember answers: "Brave. I mean about the cocoa. The flower is excellent company." A slow push-in keeps the page moving. | Your answers stay with them. |
| 18.90-21.10 | 567-632 | S10 pit | R8 0-65, state F | The Offering Pit after a real win: HIS, CAMP, HERD and RELAY float over the clearing under "Something stirs below...", 32 words harvested so far. CAMP, which floats just above the pit, is tapped at 0.2 s, pops, and spirals into the pit, all of its flight on screen; as it reaches the pit (1.73 s) the pit's devour sound plays, the pending amber drops from 18 to 13 and the balance ticks up. | Where do the words go? |
| 21.10-25.00 | 633-749 | S11 Panko | R9 18-134, state D | Panko's line types out and then holds, finished, for 2.0 s before the cut: "Something funny happened. I went to bed with the spice jars in one order and woke up to find them in another. I must have moved them in my sleep. I must have." | none |
| 25.00-27.60 | 750-827 | S12 dusk | R10 0-77, state C | Hard cut, and the music cuts to silence: the same house at dusk, settling on the kitchen, Ember's den and the glowing well. | none |
| 27.60-30.00 | 828-899 | End card | not UI | A 0.4 s dissolve into the blurred dusk sky and the WordShift wordmark; the line fades in over 28.2-28.6 s. | The house is very fond of you. |

### Layout

- **9:16:** full-bleed native frames. The caption is an opaque parchment plaque (`#F3E2BF`, 8 px `#6B4A2E` border, 3 px `#3B2416` outer line, Figtree Bold 76 px, or 68 px when a line would be wider than 888 px) across x 12-1068. Its top is y 24 on the board shots (S1, S2, S4, S8), over the empty header strip and clear of the setup chips; y 96 on S5 to S7, over the home header; y 150 on S9 and S10. The two-line "Everyone has something to say." plaque keeps one height across S6 and S7. Captions change with a hard cut on the picture cut. Nothing added sits below y 1440, the bottom 25% that Play's Install button covers. S7 and S11 lift the dialogue sheet: CSS rows 192-768 fill y 0-1440 and the band below is a blurred, darkened copy of the frame's bottom. S9 shows the story card at 80%, pushing in to 85%, on a blurred copy of itself, so the caption never covers the scene art.
- **16:9:** the game's own sky art (day, then afternoon from 14.1 s, S8's first frame, with a 0.5 s crossfade, dusk from 25.0 s), blurred. The frame sits in a 572x1016 rounded column with a soft shadow; the caption plaque (Figtree Bold 64-72 px) is on the left and fades out over 6 frames before a shot without one. A resident's idle sprite stands on the right: Ember in S3-S5 and S9-S10, Sloane in S6. In S11 Archimedes stands on the left, not Panko, so the resident speaking in the sheet is never shown twice beside it. S1-S2 show the three board rows large (down to the HEAR fan's preview labels); S7 and S11 show the dialogue sheet large; S9 pushes in from 1.00 to 1.05 inside the column. Never a robed sprite.

## How it was made

1. `node mobile/scripts/store/refresh/recordTrailer.mjs` records the clips from the Expo web build of the current game (HEAD `4fc0121f`, game source unchanged) at http://localhost:8081, in headless Chromium at DPR 2.5, so every frame is exactly 1080x1920 (a 432x768 CSS window). House, dialogue, story and pit clips use a 432x768 viewport. Board clips (R1, R2a-c, R6a-c) use a 432x844 viewport and keep the 768 CSS from y 50: at 768 tall the game fits the board by pushing its lower rows under the action bar, and the taller screen keeps the rows where the move happens clear. Reduced motion is off; sound, music and haptics are off in the game's own settings.
   - Only local progression is seeded (states A to J, `mobile/scripts/store/refresh/states.mjs`). Everything on screen is reached through real input: clicks on real buttons and real mouse drags. The DOM is never edited, hidden, restyled or re-layered, and every request that is not to localhost is aborted.
   - Clock-stepped capture: Playwright's fake clock is paused and advanced exactly one frame (33 or 34 ms) before each screenshot, so every animation the game drives lands on the 30 fps grid with no dropped or doubled frames. Inputs happen between frames and are logged in `events/`.
   - Every recorded frame is screened for the game's victory glitch strings (A LITTLE WARMER, THANK YOU, STILL WARM, ONE MORE CUP, THERE YOU ARE, SAVED FOR LATER). Every board word, preview word and pit word is screened for grim or awkward words, and every word on a board clip for obscurity: a word past the dictionary's featured band (rank 0.85, 0.9 for six letters and up) serves another board. The Double Shift clip also serves another board when a preview would read as a mistake. House and dialogue clips check that no resident's emote bubble sits over a caption plaque in the frames used. A failed take is recorded again. The takes kept all passed (`screening.ok` in each events file).
2. `node mobile/scripts/store/refresh/editTrailer.mjs` lays out both cuts from those frames, typesets the plaques and end card in Chromium with the game's own fonts (Figtree Bold, EpundaSlab Italic), composes the thumbnail, mixes the audio and encodes with ffmpeg.

Or both at once: `node mobile/scripts/store/buildTrailer.mjs` (add `--edit-only` to re-edit without recording, or clip ids such as `R8 R9` to record only those again).

- The app must already be running on http://localhost:8081 (the scripts never start or stop it).
- Frames go to `$TRAILER_WORK` (default `<os tmpdir>/wordshift-trailer`, about 1.2 GB), not into the repository.
- Recording all 14 clips takes about 25 minutes (a few in parallel); the edit takes about 4 minutes.
- Useful review options for `editTrailer.mjs`: `--overlays` writes the plaques and end cards to `$TRAILER_WORK/review`, and `--frames=0,90,420` writes just those composited frames of each cut.

## Audio

The game's own music beds from `mobile/assets/music/`, each set to about -20 LUFS on the music bus, with the recorded actions' sound effects from `mobile/assets/sounds/` at file level on the frames logged in `events/`:

| Trailer time | Bed | From | Fades |
| - | - | - | - |
| 0.00-8.40 | `puzzle_phase0.mp3` | 0:02.00 | in 0.15 s; crossfade out 7.60-8.40 |
| 7.60-25.00 | `home_phase0.mp3` | 0:25.00 | crossfade in 7.60-8.40; cut to silence at 25.00 (15 ms ramp) |
| 25.00-25.40 | silence | | |
| 25.40-30.00 | `home_phase2.mp3` | 1:11.00 (starts in a quiet dip and swells under the end card) | in 0.3 s; out 28.80-30.00 |

- SFX used: `valid_move`, `valid_move_2`, `letter_select`, `star_pop_1..3`, `perfect`, `ui_tap`, `unlock`, `dialogue`, `story_answer` (6 dB lower, it is a long, loud swell) and `pit_devour`. No `_dark` or `_peace` variant, `glitch`, `arrival` or `phase_change` sound. A long sound (the PERFECT fanfare, the story swell) ends with a 0.4 s fade 0.3 s after its continuous footage ends; the invite chime is the exception and rings on over the S5 to S6 cut it lands on.
- A brickwall limiter holds the peaks first, then a two-pass loudnorm (I -14, TP -1, LRA 11) stays in linear mode. 48 kHz stereo.
- Checked on the waveform: the music is continuous through both joins, silent from 25.00 to 25.40 s, and fades out by 30.00 s. **Listen through once before uploading** (nobody has heard this mix; it was checked by measurement only).

## Upload (owner)

1. **Music rights first.** The beds were made with Suno (their metadata says "made with suno"). Confirm that the Suno plan covers commercial use in a trailer before uploading anything.
2. **YouTube, the 9:16 cut:** upload `trailer-9x16-1080x1920.mp4` as its own video.
   - Title: `WordShift: Cozy Word Puzzle (Trailer)`
   - Description: paste `trailer.description` from `../copy/listing-en-US.json` (reproduced below).
   - Visibility: Public or Unlisted (either works for Play; Play needs the video to stay reachable and embeddable).
   - Monetization / ads: **off**. A video with ads, or one that gets a Content ID claim that adds ads, is not accepted as a Play preview video.
   - Audience: the "made for kids" setting is the owner's decision. The brief's recommendation is "No, it's not made for kids" (a 13+ game whose story develops mild horror; the listing carries that disclosure). Not age-restricted. Allow embedding.
   - Captions: upload `captions-en.srt` as the English caption track.
   - Thumbnail (optional): `youtube-thumbnail-1280x720.png`.
3. **Play Console:** Main store listing, Graphics, Video: paste the link as `https://www.youtube.com/watch?v=<ID>`. Never the `/shorts/` link and never a timecode.
4. **YouTube, the 16:9 master:** upload `trailer-16x9-1920x1080.mp4` separately, for the channel and press only, with the same title, description and caption track.
5. **After upload:** check both videos for Content ID claims on the music. A claim that adds ads disqualifies the video for Play.

YouTube description (from `../copy/listing-en-US.json`, `trailer.description`):

```
Pick up a letter from one word and drop it into the next. Both words have to stay real, and the letter you move stays where you put it.

WordShift is a cozy word puzzle game about one small move and a pixel-art house you build with the amber your puzzles earn. Add rooms, welcome 13 animal housemates, and get to know them one conversation at a time. They remember what you tell them.

Over 4,000 word puzzles across five difficulty levels, a daily word puzzle with streaks, Reverse Shift, Double Shift and challenges that stack on any style.

All gameplay in this trailer is captured from WordShift. Contains ads and in-app purchases. The story develops unsettling themes and mild horror.

WordShift on Google Play:
https://play.google.com/store/apps/details?id=com.wordshift.app

#wordgame #puzzlegame #cozygames
```

## Boundaries checked (brief section 10)

- Real UI only: every frame before the end card is a recorded frame of the game; frames are only placed and scaled (the S9 card is shown at 80 to 85%, the 16:9 S9 column pushes in 5%), never edited. No invented words, mocked UI, device frames, fingers or badges.
- Seeds: states A to J as in the brief, with the capture step's two session corrections (`../raw/SUBSTITUTIONS.md`, item 4).
- No spoilers: nothing from phase 3 or later; no shadow figure, crimson eyes or robed sprite (the 16:9 side sprites are `idle.png` only); no final board, Arrival or ending; the pit is phase 0 with "Something stirs below..."; no Belfry, Unbroken Weave, Music Box, The Pattern, New Cycle or Offering rows; no story scene other than the cup choice and response pages (the Supper scene is not in the trailer).
- No glitch string or micro-beat overlay in any recorded frame; every board, preview and pit word screened, and every board word held to the dictionary's featured band (takes through RABID, SLAYED, BOSOM, KINKY and obscure words such as INANER were rejected and recorded again). No emote bubble over a caption plaque in any frame used.
- Captions and SRT: plain ASCII, no dashes, no "...", no call to action, no ranking or promotional word, no phase numbers. Nothing added below y 1440 in the 9:16 cut.
  - `verifyCopy.mjs` exempts the SRT timing lines (`-->` is the format's separator), scans every cue's text and checks that the SRT and `trailer.captions` in the listing JSON carry the same text and timings. It exits 0.

## Deviations from the brief, and why

1. **Caption S2 is "Drop it in. Two real words."**, not "Drop it in. Two new words.": section 10 bans "new". It also states the rule (both words must be real words). The listing JSON's `trailer.captions` carries the same text.
2. **S5 and S6 swapped, and S5's caption is "Your wins build the house."** The brief had the house drag (R3, state B) first and Axel's invite (R4, state I, a smaller house) second, so the house visibly shrank between them. Now S5 is the invite (R4 0-41) and S6 the grown house with Axel already home (R3 0-91), so the house only ever grows on screen. S5 cuts on the "Invite Axel!" tap because the game's very next frame already shows the next room's locked "Opens at level 19" card in the aquarium's old place (the house grows at the top and every room shifts down). The caption was "Every win grows the house.", which overstated the loop: rooms are bought with the amber wins earn, and some are level-gated (`../copy/claims-and-sources.md`, row 16). The two shots keep the brief's combined length.
3. **Tap timing in R1:** the L lifts at frame 7, so the hook opens on the untouched board and its first motion is the lift; the drops land on the caption changes (PLANT at frame 40, the T at 75, HEART at 97) instead of frames 15, 51 and 66, so "Lift a letter." plays over a lifted letter and "Drop it in." over the drop. The victory card is half opaque at frame 101, so S1 to S3 are one continuous take with no jump cut, and the stars pop inside S3 with their sounds.
4. **Board clips at 432x844:** R1, R2a-c and R6a-c render at 432x844 CSS and keep the 768 CSS window from y 50 (brief: 432x768 from y 0). At 768 tall the game fits the board by sliding its lower rows under the action bar and the fan's preview labels were cut; the taller screen keeps the rows where the move happens clear, and the dropped 50 CSS are the empty strip above the logo, where the plaque sits.
5. **No 1.25x zoom on S1-S2 in the 9:16 cut:** the zoom cut the PICK and DROP tags off both sides. The full frame keeps the whole board, and the tiles are large enough at 1080 wide.
6. **16:9 S1-S2 show rows 0 to 2**, not rows 0 and 1, down to the HEAR fan's preview labels, so the second move (T into HEAR) is visible; the crop is fitted to 1000 px tall.
7. **9:16 plaque** spans x 12-1068 and is opaque, and cuts with the picture. At x 60-1020 and 92% the game header's round buttons peeked out at both ends and its logo showed through as a ghost; a fading plaque showed the header through it for a few frames at every change.
8. **S7 and S11 (second review):** S7 runs R5 from the first frame whose sheet already covers the PLAY dock (frame 5; the tap's sound at frame 3 still plays) and now cuts 0.6 s after Axel's short line has typed out (1.63 s instead of 3.13 s, which left a 2.1 s frozen frame mid-trailer). The 1.5 s saved goes to S11 (3.9 s instead of 2.4 s): Panko's long line types out at the game's own speed, faster than anyone reads, so R9 is recorded 2 s past the end of the line and S11 holds the finished line for 2.0 s before the cut to dusk. S8 to S10 move 1.5 s earlier; S12 and the music cut stay at 25.0 s. Axel's aquarium is placed lower (room top CSS 322) so the caption plaque sits over the room's name plaque, not over Axel or his emote.
9. **S9:** the 9:16 cut shows the story card at 80%, pushing in to 85%, on a blurred copy of itself: at full size the caption plaque covered the cup art, and a static page read as a frozen frame. R7's choice is pressed at frame 36 and released at 44 (brief: tap at 15) so the question stays up long enough to read (1.2 s) and the button's pressed state shows.
10. **R8 (pit):** the word is tapped at frame 6 (brief: 12), because the pop and the spiral into the pit take about 1.6 s and have to finish inside the shot. The game's spiral swings a word out by up to about 0.8 of its distance from the pit centre, so on a 432 CSS screen a word floating high or near an edge leaves the screen mid-flight (the first take lost CAMP off the right edge for 8 frames). The recorder now predicts each word's whole flight from the game's own spiral (`spiralExtent`, OfferingPitScreen `computeSpiralPath`) and taps only a word whose flight stays on screen and that has 10 CSS of clear space; the pit is re-entered (real navigation) until such a word exists and no words overlap. Every recorded frame is then checked: the word stays on screen while it is visible and is seen moving for at least 10 frames (this take: 30 moving frames, none grazing an edge). The game's devour sound plays when the word reaches the pit, as the game plays it, not on the tap. State F seeds a harvest history, so the pit reads "32 Lifetime harvested" rather than a first visit.
11. **S8 R6c:** the third mode part is a Medium board with Speed on in the Cathedral Glass tile style (bought in the Tile Shop, which the game calls Adornments at that point in the story), with the clock stepped so it visibly ticks inside the part.
12. **16:9 background band:** centred at 25% of the sky art's height (28% at dusk) instead of 45%. At 45% the band is the tree line and blurs to a murky green; 25% is open sky and mountains, and at dusk the sunset sits behind the phone and the end card wordmark.
13. **End card:** a 0.4 s dissolve from the last dusk frame instead of a hard cut, under the music swell.
14. **SFX:** a long sound (the PERFECT fanfare, the story swell) ends 0.3 s after its footage with a 0.4 s fade, the invite chime rings on over the S5 to S6 cut, and the story swell is 6 dB lower.
15. **Thumbnail:** composed from FG-A's candlelit-table art, the wordmark and the real PLANT PICK-row tiles instead of a trailer frame: a single UI frame is illegible at YouTube's list sizes. The brief allows witness-05 as picture-only art for the feature graphic; the thumbnail reuses that same picture, already public on the listing, with no story page text.
16. **Scripts:** `recordTrailer.mjs` and `editTrailer.mjs` live in `mobile/scripts/store/refresh/` as the brief says; `mobile/scripts/store/buildTrailer.mjs` runs both. No npm scripts were added (the brief forbids it). Frames are piped straight into ffmpeg instead of being written to `frames-9x16/` first; the encode settings are the brief's plus the BT.709 conversion and tags.
17. **S5 (second review):** R4's first tap moved from frame 6 to 20, so the four-room house reads under "Your wins build the house." for 0.67 s before the invite card rises (it was 0.2 s), and the card's still tail shrinks by the same amount; S5 keeps its 1.4 s and still cuts on the Invite tap.
18. **S3 (second review):** state A seeds EASY as already cleared. Before, the seventh win's card showed "First EASY Clear +10" and "Total 22", a first-clear bonus a player on their seventh win has already had.

## Known limits

- The capture is the web build in Chromium, not an Android device, as for the screenshots.
- On the longer boards (the Expert board in S4 and the Double Shift board in S8) the lowest row runs under the action bar, as it does in the game at this height; the rows where the move happens are always clear.
- The music beds were made with Suno; commercial use in a trailer and Content ID are owner checks (see Upload).
