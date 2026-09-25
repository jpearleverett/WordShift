# WordShift trailer (refresh-2026-09): "Such a Lovely House"

A 30 second trailer built from real recordings of the current game, in two cuts: a 9:16 cut for the Play Store preview video and a 16:9 master for YouTube, press and large screens. Both cuts use the same recorded frames, captions and audio mix. The spec is `../brief.md`, section 6. The recorder and the edit are `mobile/scripts/store/refresh/trailer2/`.

It replaced the first refresh trailer ("Lift a letter." to "The house is very fond of you.") on 2026-09-25, after the blind comparison below. The first trailer's files and build scripts (`recordTrailer.mjs`, `editTrailer.mjs`) were retired the same day and remain in git history.

## Files

| File | What it is |
| - | - |
| `trailer-9x16-1080x1920.mp4` | **The Play preview video.** Upload it to YouTube and paste the link into Play Console. |
| `trailer-16x9-1920x1080.mp4` | The 16:9 master, for the YouTube channel, press and large screens. |
| `captions-en.srt` | English captions: the same text and timings as the burned-in captions and as `trailer.captions` in `../copy/listing-en-US.json` (`verifyCopy.mjs` compares them cue by cue). |
| `youtube-thumbnail-1280x720.png` | A composed thumbnail, unchanged from the first trailer: the painted candlelit-table art that FG-A uses (`assets/story/pages/witness-05.webp`, picture only), the wooden wordmark at the bottom left and the real PICK-row tiles spelling PLANT at the bottom right, clear of YouTube's duration badge. It fits this trailer too: the same opening move. |
| `poster-9x16-1080x1920.png` | Frame 33 of the 9:16 cut: the L held over PANT's checked PLANT slot, under "One letter. Two real words.". Use it wherever a portrait poster is needed. |
| `events/<clip>.json` | One file per recorded clip (K1 to K12): the seeded state, every input as `{frame, action, sfx}`, the screening result and marks. The per-frame DOM probes are left out here; they stay with the frames in `$TRAILER2_WORK/events`. |
| `trailer-report.json` | The build record: shots with source clips, captions, the audio beds, gains, every SFX placement, loudness, and what ffmpeg reports for each output. |

## Specs (measured with `ffmpeg -i` on the finished files)

| | 9:16 cut | 16:9 master |
| - | - | - |
| Duration | 00:00:30.00 (900 frames) | 00:00:30.00 (900 frames) |
| Video | H.264 High, yuv420p (tv, BT.709), 1080x1920, 30 fps | H.264 High, yuv420p (tv, BT.709), 1920x1080, 30 fps |
| Audio | AAC-LC, 48000 Hz, stereo (384 kb/s requested; ffmpeg reports 334) | the same mix |
| Faststart | yes | yes |
| Size | 16.8 MB | 10.6 MB |

- Loudness of the final mix: -14.0 LUFS integrated, true peak -1.4 dBTP, LRA 5.1; loudnorm stayed linear. No stretch of the soundtrack is quieter than -50 dB for 0.3 s or more.
- Every frame is a recorded frame of the game. The additions are the caption plaques and, on the end card, the wordmark and its two lines over the real sunset house. Gameplay is on screen from frame 0.

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

## Shot list (as built)

K-clips are the recordings (details in `events/`). Frames are the 30 fps timeline.

| Time | Frames | Shot | Source | What happens | Caption |
| - | - | - | - | - | - |
| 0.00-3.33 | 0-99 | H1 board | K1 | The opener PLAY / PANT / HEAR, the whole screen with the wordmark and EASY chip. The L is in the hand over PANT's fan and holds 0.6 s over the checked PLANT slot, then drops (PAY, PLANT). The T is dragged out of PLANT over HEAR's fan and holds over the checked HEART slot. | One letter. Two real words. |
| 3.33-4.53 | 100-135 | H1c victory | K1 | Hard cut to the settled card: three stars, PERFECT!, FLAWLESS!, the word journey PAY, PLAN, HEART, confetti. | none |
| 4.53-7.20 | 136-215 | H2 house | K2 | The four-room day house by the river, pushing in to the empty aquarium's "Invite 100" card. | Solve puzzles. Build them a home. |
| 7.20-8.13 | 216-243 | H3 invite | K2b | The whole "A NEW FRIEND!" card for Axel, pushing in. | 13 friends to welcome. |
| 8.13-11.13 | 244-333 | H4 boards | K4, K5, K6 | EASY (the W out of WHIP into SWING), MED+ (the L into CLOVER), EXPERT (FAVOR and PICKLED), 1 s each, the difficulty chip on screen. | Over 4,000 puzzles. |
| 11.13-12.67 | 334-379 | H5 build | K7a | The locked Jungle Hammock, then the same framing with it built and its invite card. | More rooms. More neighbors. |
| 12.67-15.07 | 380-451 | H5 Sloane | K7b | Sloane's introduction sheet (portrait, name, "Three moths live in my fur. I call all three Gerald. ...") over the dimmed house. | Three moths. All named Gerald. |
| 15.07-19.47 | 452-583 | H6 Panko | K8 | Archimedes, Panko and Ember in their rooms; then Panko's sheet types "I must have moved them in my sleep. I must have." | Who moved the spice jars? |
| 19.47-22.57 | 584-676 | H7 day to dusk | K9, K10 | The whole house in the afternoon, then a hard cut to the same camera at sunset, pushing in on the upper house. | Where did the day go? |
| 22.57-25.57 | 677-766 | H8 Ember | K12 | Ember by her fire at dusk; her sheet types "I am fond of you, whatever my fire is up to. I want you to know that." and holds before her next sentence. | Ember is fond of you. |
| 25.57-30.00 | 767-899 | End card | K10 | The real sunset house, pushing in on its upper rooms, residents walking; the wordmark, then two lines. | It's a lovely house. / Isn't it? |

## Layout

- **9:16:** boards are the phone screen at 2.5x, the caption plaque over the move pill. Dialogue sheets are the real sheet from its top edge (found per frame, so a sheet that grows as it types keeps its border) at 2.42x with an outline and soft shadow, over the resident's part of the house dimmed as the game dims it. Nothing added reaches below y 1440, the bottom quarter that Play's Install button covers; the edit asserts it for every caption, outline and shadow.
- **16:9:** the game's own sky art, blurred and darkened (day, then afternoon from the boards, then dusk), behind a 608x1080 phone column for boards and house close-ups, or the 9:16 cards scaled as one group. The captions sit top-left. The day, dusk and end shots are native wide views of the same recordings.
- **Audio:** `home_phase0.mp3` from 0:23.28 until the sunset cut, a 0.3 s crossfade into `home_phase2.mp3` from 1:06.22, faded out over the last 1.2 s; the SFX are listed in `trailer-report.json` and the brief.

## Rebuild

```
cd mobile
npx expo start --web --port 8081
TRAILER2_WORK=/tmp/t2work node scripts/store/refresh/trailer2/record.mjs K1 K2 K2b K4 K5 K6 K7 K8 K9 K10 K12
TRAILER2_WORK=/tmp/t2work node scripts/store/refresh/trailer2/edit.mjs
TRAILER2_WORK=/tmp/t2work node scripts/store/refresh/trailer2/install.mjs
```

`install.mjs` copies both cuts, the SRT and the report here, renders the poster, copies the events without their probes and rebuilds the thumbnail; `node scripts/store/buildTrailer.mjs` runs all three steps. Then run `node scripts/store/refresh/verifyCopy.mjs`.

## Upload (owner)

1. **YouTube:** upload `trailer-9x16-1080x1920.mp4` as its own video, titled `WordShift: Cozy Word Puzzle (Trailer)`, with the description from `trailer.description` in the listing JSON. Set it public or unlisted, monetization off, "No, it's not made for kids", not age-restricted, embedding allowed. Add `captions-en.srt` as the caption track.
2. **Play Console:** paste the 9:16 video's link into the preview video field as `https://www.youtube.com/watch?v=<ID>`. Never use the `/shorts/` URL and never add a timecode.
3. **16:9 master:** upload it separately, for the channel and press only.
4. **Content ID:** after upload, check both videos for Content ID claims. A claim can add ads, which disqualifies the video for Play. The music is the game's own Suno-made beds, so confirm the commercial rights first (brief section 11).
