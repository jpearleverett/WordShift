# WordShift trailer (refresh-2026-09): "Such a Lovely House"

A 39 second trailer built from real recordings of the current game, in two cuts: a 9:16 cut for the Play Store preview video and a 16:9 master for YouTube, press and large screens. Both cuts use the same recorded frames, captions and audio mix. The spec is `../brief.md`, section 6. The recorder and the edit are `mobile/scripts/store/refresh/trailer2/`.

It replaced the first refresh trailer ("Lift a letter." to "The house is very fond of you.") on 2026-09-25, after the blind comparison below. The first trailer's files and build scripts (`recordTrailer.mjs`, `editTrailer.mjs`) were retired the same day and remain in git history.

On 2026-09-26 it was revised on the owner's notes on the 30 s cut:
- The opening move froze for a moment just before each drop.
- The whole-house day and dusk shots made the house too small.
- The dialogue sheets looked cut off at the bottom.
- Scenes cut too quickly to read.

The opening move now plays through with no held frame. The house is one phone-sized scroll from the pit to the roof, with the evening coming down it as it climbs. Each dialogue sheet is closed with a matching bottom border, and every caption and line holds longer.

## Files

| File | What it is |
| - | - |
| `trailer-9x16-1080x1920.mp4` | **The Play preview video.** Upload it to YouTube and paste the link into Play Console. |
| `trailer-16x9-1920x1080.mp4` | The 16:9 master, for the YouTube channel, press and large screens. |
| `captions-en.srt` | English captions: the same text and timings as the burned-in captions and as `trailer.captions` in `../copy/listing-en-US.json` (`verifyCopy.mjs` compares them cue by cue). |
| `youtube-thumbnail-1280x720.png` | A composed thumbnail, unchanged from the first trailer: the painted candlelit-table art that FG-A uses (`assets/story/pages/witness-05.webp`, picture only), the wooden wordmark at the bottom left and the real PICK-row tiles spelling PLANT at the bottom right, clear of YouTube's duration badge. It fits this trailer too: the same opening move. |
| `poster-9x16-1080x1920.png` | Frame 27 of the 9:16 cut: the L over PANT's checked PLANT slot, under "One letter. Two real words.". Use it wherever a portrait poster is needed. |
| `events/<clip>.json` | One file per recorded clip used (K1 to K14): the seeded state, every input as `{frame, action, sfx}`, the screening result and marks. The per-frame DOM probes are left out here; they stay with the frames in `$TRAILER2_WORK/events`. On 2026-09-26 each file's `method` line was reworded to state the game's Reduced Motion setting (off, except K13 and K14); only K13 and K14 were re-recorded that day. |
| `trailer-report.json` | The build record: shots with source clips, captions, the audio beds, gains, every SFX placement, loudness, and what ffmpeg reports for each output. |

## Specs (measured with `ffmpeg -i` on the finished files)

| | 9:16 cut | 16:9 master |
| - | - | - |
| Duration | 00:00:39.20 (1,176 frames) | 00:00:39.20 (1,176 frames) |
| Video | H.264 High, yuv420p (tv, BT.709), 1080x1920, 30 fps | H.264 High, yuv420p (tv, BT.709), 1920x1080, 30 fps |
| Audio | AAC-LC, 48000 Hz, stereo (384 kb/s requested; ffmpeg reports 339) | the same mix |
| Faststart | yes | yes |
| Size | 18.6 MB | 13.5 MB |

- Loudness of the final mix: -14.0 LUFS integrated, true peak -1.4 dBTP, LRA 5.6; loudnorm stayed linear. No stretch of the soundtrack is quieter than -50 dB for 0.3 s or more.
- Every picture is built from recorded frames of the game: crops, zooms and push-ins, speed changes, blur and dimming behind the cards, and dissolves. The still pictures are one freeze on Ember's finished line and the single held frame of the house behind each card; the end card's house is still apart from a slow push-in. The only additions are:
  - the caption plaques;
  - a bottom border closing each dialogue sheet, from the same skin's own panel art;
  - the 2 s sweep from afternoon to sunset during the scroll, a transition between two recordings of the identical scroll (both with Reduced Motion on). The sunset house is laid out floor by floor with every room drawn whole, then settles as whole floors, so no room, sign, resident or cloud shows twice or in part;
  - on the end card, the wordmark (fading in once the roof has slid below it) and two lines, over a flat colour sampled from the recorded evening sky above the roof;
  - in the 16:9 master only, the game's sky art around the phone column and behind the cards, and the column's rules.

  Brief section 6 and boundary 17 give the details. Gameplay is on screen from frame 0.
- Play autoplays only the first 30 s. That covers everything through the scroll up the house as the evening comes down it; Ember's line and the end card follow for anyone who keeps watching.

## How it was chosen: a blind panel

Each round gave four judges the current trailer and the candidate as `A` and `B`, assigned at random, in neutral folders with the metadata stripped. Each judge had frame sheets (every 0.5 s, the first 3 s at 6 fps, one frame per second) and a measured description of the soundtrack. The judges were told to judge as strangers and not to open any other file. Each judged through a different lens: a casual word-game player, a mobile-marketing creative director, a player of narrative and cozy games, and muted carousel viewing only. A compliance reviewer checked every candidate against the brief's hard boundaries and the claims rules.

| Round | Candidate | Preferred the candidate | Install intent, candidate vs current (0-100) |
| - | - | - | - |
| 1 | cut 1: board and dialogue shown as floating strips over a blurred copy of the frame; silences under the close | 0 of 4 | 30, 36, 34, 54 vs 62, 45, 46, 62 |
| 2 | cut 2: the whole board with its check marks, dialogue as real sheets with portraits, one music bed to the end | 3 of 4 | 57, 30, 58, 52 vs 50, 38, 45, 41 |
| 3 | cut 3: slower opening move, the whole invite card, a large caption on each line | 4 of 4 | 60, 40, 60, 52 vs 47, 27, 50, 34 |
| 4 | cut 4: "new" removed from the captions (a banned promotional word), the invite card whole, sheets over the dimmed house | 4 of 4 | 62, 38, 70, 56 vs 50, 26, 57, 43 |
| 5 | cut 5: a hard cut to the settled victory card, a closer sunset house, the first clip re-recorded | 4 of 4 | 56, 44, 60, 52 vs 41, 29, 42, 34 |

After round 5, the compliance review's remaining findings were fixed, with a few of the judges' notes, and not judged again:
- The invite card's backdrop is a frame from before the game's own dialog opens, so no blurred copy of the card sits behind it.
- The first caption ends with the board shot.
- The end card starts earlier in its clip, before an emote puffs over a room sign.
- Each montage board plays `valid_move.wav`, as the game did.
- Each held check is 0.6 s, not 0.4 s.
- Sloane's line holds 2.4 s, not 2.8 s.
- The end card's darkening covers both lines.

The judges agreed on the candidate's strengths: the house arrives within five seconds, "Three moths. All named Gerald.", the day turning to sunset, and the ending over the real house. Their standing reservation: the opening board is the flat olive puzzle screen, and a few judges would cold-open on the house. The current cut keeps the rule-first opening because every round's judges ranked showing the rule first above that.

## The 2026-09-26 revision: three more rounds

The owner's notes on the 30 s cut were answered first, and the panel then judged the revisions the same way. Install intent is listed casual player, creative director, narrative player, muted viewing.

| Round | Candidate | Against | Preferred the candidate | Install intent, candidate vs other (0-100) |
| - | - | - | - | - |
| 6 | 41.8 s: hovers recorded in real time, the scroll up the house with a narrow sweep, closed sheets, longer holds | the 30 s cut | 4 of 4 | 52, 41, 63, 56 vs 30, 29, 42, 37 |
| 7 | 43.3 s: hovers at 2x, the drop running on into the card, still-resident scroll recordings laid floor by floor, a slower sweep, longer holds | round 6's cut | 1 of 4 | 50, 25, 52, 30 vs 57, 22, 56, 34 |
| 8 | 39.5 s: round 7 tightened (the scroll cut to Ember before the roof, shorter Sloane, Ember and PERFECT holds, the caption gone before the drop) | round 6's cut | 4 of 4 | 55, 31, 58, 42 vs 52, 27, 55, 37 |

Round 7 lost on tempo alone. Its judges praised the new sweep, Ember's name on her sheet and the closed borders, but not 1.5 s more runtime, an uncaptioned roof at the end of the scroll and still dialogue cards. Round 8 answered those and won every lens.

The compliance reviews of rounds 6 to 8 led to these changes:
- Both scroll recordings were retaken with Reduced Motion on, so residents stand at the same spots; the sunset recording is laid out floor by floor, with the scenery left in place, so nothing shows twice.
- The 16:9 end card's roof rises like the 9:16 one, so the locked Burrow card sits below the closing lines.
- The creep before each drop was cut, by starting the 2x stretch a little before each arrival.
- The pan clips' metadata now records Reduced Motion.
- Brief item 17 now lists every addition and still frame, and scopes the 80% floor to the 9:16 Play cut.

After round 8, its compliance review and three of the judges' small notes were acted on; the result was checked by a further compliance review, not judged again:
- During the 0.8 s settle, strips of rooms had gone missing (nameplates cut through). Each sunset floor now moves as one whole block, and only the wooden gaps between floors stretch. The edit asserts that every room is drawn whole.
- Ember's sheet starts five frames later, after its opening spring has settled; before that, a dark strip and the PLAY dock showed under it. The edit now asserts that every sheet frame used is settled.
- The scroll starts at the first frame the house moves, and the opening at the first frame the L lifts, so neither begins on a still frame.
- The logo fades in once the roof has slid below it; it had briefly lain over the roof.
- The 9:16 end card rises 700 px, not 850, so Chill shows whole in his office, and the house then pushes in slowly instead of standing still (in both cuts).
- The thin strip of recorded backdrop kept around each sheet is now a hairline, since in 16:9 it showed as a coloured line over the sky.
- `trailer-report.json` records the git HEAD, the trailer2 files that differed from it and a hash of each trailer2 script, so each cut is tied to the code that built it.
- The corners of each added sheet border show the outline colour in their notches, not a sampled backdrop colour; the 16:9 end card pushes in inside its column too.

## Shot list (as built)

K-clips are the recordings (details in `events/`). Frames are the 30 fps timeline.

| Time | Frames | Shot | Source | What happens | Caption |
| - | - | - | - | - | - |
| 0.00-3.47 | 0-103 | H1 board | K1 | The whole board (CSS 432x768 from y 60), from two frames before the L lifts. The L is dragged over PANT's fan at 0.55x; the end of the drag and its pause over the checked PLANT slot play at 2x (about 0.2 s), and it drops (PAY, PLANT). The T is dragged over HEAR's fan the same way and drops on the checked HEART slot. The board dims and the victory card rises (its dim-in at 1.5x): PERFECT!, three stars, the first confetti. No frame is held. | One letter. Two real words. (to 2.57) |
| 3.47-4.37 | 104-130 | H1c victory | K1 | The settled card after the confetti has passed the word journey PAY, PLAN, HEART, at half speed; the last confetti over the stars dissolves away. | none |
| 4.37-7.67 | 131-229 | H2 house | K2 | The day house at 0.6x, pushing in to the empty aquarium's invite card. | Solve puzzles. Build them a home. |
| 7.67-10.37 | 230-310 | H3 invite | K2b | The whole "A NEW FRIEND!" invite card for Axel, cropped to its own frame, growing slowly over a dim blur of the house; it ends before the Invite tap. | 13 friends to welcome. |
| 10.37-14.10 | 311-422 | H4 boards | K4, K5, K6 | Three boards, 1.2 s each: EASY (the W out of WHIP into SWING) and MED+ (the L into CLOVER) from the drag into the drop, EXPERT (FAVOR and PICKLED) from its drop. The MED+ board's fourth row sits under the action bar and the EXPERT board's fifth runs off the frame. | Over 4,000 puzzles. |
| 14.10-16.83 | 423-504 | H5 build | K7a | The Jungle Hammock locked, then built with its invite card (a jump cut in one framing). | More rooms. More neighbors. |
| 16.83-20.83 | 505-624 | H5 Sloane | K7b | Sloane's introduction sheet ("Three moths live in my fur. I call all three Gerald. ...") over the dimmed house, pushing in. | Three moths. All named Gerald. |
| 20.83-26.03 | 625-780 | H6 Panko | K8 | Panko, Archimedes and Ember in their rooms; then Panko's sheet, pushing in: "I must have moved them in my sleep. I must have." types in. | Who moved the spice jars? |
| 26.03-29.33 | 781-879 | Scroll up the house | K13, K14 | The house as a phone sees it, from the pit well up the house. From 26.40 s the evening sweeps down the frame for 2 s while it climbs, and each sunset floor then settles into its own place as a whole block; it cuts to Ember as the roof's lower edge comes into the frame. | Where did the day go? |
| 29.33-34.20 | 880-1025 | H8 Ember | K12 | Ember by her fire at dusk; then Ember's sheet, pushing in: "I am fond of you, whatever my fire is up to. I want you to know that." types in and holds (a freeze) before her next sentence. | Ember is fond of you. |
| 34.20-39.20 | 1026-1175 | End card | K14 | Back on the sunset roof at rest, the camera rises past the chimney into the evening sky; the roof settles under the lines, with the locked top room and Chill's office below it. The wordmark fades in once the chimney has slid below it, and the house pushes in slowly. | It's a lovely house. / Isn't it? |

## Layout

- **9:16:**
  - Boards are the phone screen at 2.5x, with the caption plaque over the move pill.
  - Dialogue sheets are the real sheet from its top edge (found per frame, so a sheet that grows as it types keeps its border), closed with its own skin's bottom corners and edge. They grow from 2.30x to 2.42x with an outline and soft shadow, over the resident's part of the house dimmed as the game dims it.
  - The scroll is a 376x668 CSS crop of a tall 432x1040 recording, clear of the Next sign, the ambient line and the PLAY dock.
  - Nothing added reaches below y 1440, the bottom quarter that Play's Install button covers; the edit asserts it for every caption, outline and shadow.
- **16:9:**
  - Behind the picture is the game's own sky art, blurred and darkened: day, then afternoon from the boards, blending to dusk with the sweep.
  - Boards, house close-ups and the scroll sit in a 608x1080 phone column; the dialogue cards are the 9:16 cards scaled as one group.
  - The captions sit top-left. On the end card the roof rises in the column as in 9:16, with the wordmark and lines to its left.
- **Audio:** `home_phase0.mp3` from 0:23.28, fading out over 1 s centred on the sweep, into `home_phase2.mp3` from 1:06.22, faded out over the last 1.5 s. The SFX are listed in `trailer-report.json` and the brief.

## Rebuild

```
cd mobile
npx expo start --web --port 8081
TRAILER2_WORK=/tmp/t2work node scripts/store/refresh/trailer2/record.mjs K1 K2 K2b K4 K5 K6 K7 K8 K12 K13 K14
TRAILER2_WORK=/tmp/t2work node scripts/store/refresh/trailer2/edit.mjs
TRAILER2_WORK=/tmp/t2work node scripts/store/refresh/trailer2/install.mjs
```

`install.mjs` copies both cuts, the SRT and the report here, renders the poster, copies the events without their probes and rebuilds the thumbnail; `node scripts/store/buildTrailer.mjs` runs all three steps. Then run `node scripts/store/refresh/verifyCopy.mjs`.

## Upload (owner)

1. **YouTube:** upload `trailer-9x16-1080x1920.mp4` as its own video, titled `WordShift: Cozy Word Puzzle (Trailer)`, with the description from `trailer.description` in the listing JSON. Set it public or unlisted, monetization off, "No, it's not made for kids", not age-restricted, embedding allowed. Add `captions-en.srt` as the caption track.
2. **Play Console:** paste the 9:16 video's link into the preview video field as `https://www.youtube.com/watch?v=<ID>`. Never use the `/shorts/` URL and never add a timecode.
3. **16:9 master:** upload it separately, for the channel and press only.
4. **Content ID:** after upload, check both videos for Content ID claims. A claim can add ads, which disqualifies the video for Play. The music is the game's own Suno-made beds, so confirm the commercial rights first (brief section 11).
