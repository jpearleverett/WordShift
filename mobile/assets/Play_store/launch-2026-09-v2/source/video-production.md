# WordShift trailer production

The edit is 30 seconds, portrait 1080×1920, 30 fps. It uses genuine moving app footage, the existing WordShift wordmark, Epunda Slab/Figtree, and the game's existing music and sound effects. It does not rebuild the board, add fictional animation, retime a move, or fill missing footage with still images. The nighttime section shows phase 3 and normal residents, before the later reveal.

## Produce the edit

Run from `mobile/` after the approved capture workflow has produced the actual WebM recordings and `raw/video.json`:

```sh
node scripts/store/buildTrailer.mjs --check-tools
node scripts/store/buildTrailer.mjs --draft --preflight
node scripts/store/buildTrailer.mjs --draft
```

The review video is `review/trailer-draft.mp4` inside this campaign. `review/trailer-draft.json` records the source hashes, source commit, renderer, actual source resolution, output checks, and any quality notes. A missing recording stops the command with a specific error; it never creates a placeholder trailer.

Watch the source clips and the draft together. Recorder timestamps are initially estimates, so check the start and end of every cut. Adjust each `sourceIn` in `raw/video.json` to the actual frame where that action starts. Keep every cut's `durationSeconds` fixed to the approved timeline; capture a longer take when necessary. Do not accelerate footage to fit.

Verify that the first move shows PLAY/PANT becoming PAY/PLANT clearly, that the second clip contains the genuine completed chain and reward, and that the Double Shift selection is understandable. Read the short dialogue and the daily board at phone size. Check the home sequence for the new normal walks. Keep seven uninterrupted seconds of the actual night house for the final three captions, with no robes, late reveal or invented clue.

Confirm the recorded music/SFX are absent: the capture workflow records video without audio, while the compositor supplies the app's existing audio. For a sound event, inspect the actual source recording and correct `atSeconds`, then set that event's `verified` to `true`. Unverified events are omitted; guessed button sounds are never added. Finally set top-level `timingReviewed` to `true` after the visual edit review, and render:

```sh
node scripts/store/buildTrailer.mjs --preflight
node scripts/store/buildTrailer.mjs
```

This produces `upload/video/wordshift-trailer-30s.mp4` and `source/trailer-export.json`. The export is checked for 900 frames, 1080×1920, 30 fps, H.264/yuv420p, AAC stereo and a 30-second duration, then fully decoded to detect damaged frames. These technical checks do not replace watching the final rendered file. Web footage is explicitly identified as web: compare typography, controls and layout with the signed Android build before using it in the store listing.

## Picture and audio

- The full recorded UI is preserved inside a 1768-pixel-high area below a 152-pixel caption band. Narrow parchment/forest borders preserve the source aspect ratio. Actual UI must occupy at least 80% of the output frame; incompatible source shapes are rejected.
- Captions stay in that separate top band, so they do not cover tiles, dialogue or controls. The real game wordmark appears above the final line while the night footage continues underneath. There is no static end card.
- Source frames are resampled to 30 fps without optical flow or invented movement. No video freeze padding or playback-speed changes are used. Each source cut must contain its full required duration.
- The original `home_phase0.mp3` supports the warm opening. It fades out from 21 to 24 seconds as `home_phase3.mp3` fades in from 22 seconds; the final 1.4 seconds fade gently. The mix targets −18 LUFS and −1.5 dB true peak.
- Only verified `letter_select`, `valid_move`, `victory` and `amber_earn` events are eligible for source-game SFX. No whisper, jump scare or added mystery effect is used.
- The capture workflow requests 1170×2100 video with the existing 390×700 phone layout and 3× pixel density. Inspect the actual ffprobe dimensions and text detail; the export report flags lower-resolution sources rather than disguising upscaling.

## Capture manifest contract

`raw/video.json` uses relative clip paths from `raw/`. Its nine segment IDs must match `source/trailer-timeline.json` exactly. This is a schema example, not a real capture record:

```json
{
  "version": 1,
  "status": "captured_needs_visual_review",
  "sourceCommit": "actual-source-git-sha",
  "renderer": "Expo React Native web",
  "timingReviewed": false,
  "clips": {
    "opener": {
      "file": "video/opener.webm",
      "recordingStartEpochMs": 0,
      "recordingStartUncertaintyMs": 0,
      "durationSeconds": 12,
      "width": 1170,
      "height": 2100,
      "eventList": [
        { "type": "letter_select", "atSeconds": 1.1, "verified": false },
        { "type": "valid_move", "atSeconds": 2.1, "verified": false }
      ]
    }
  },
  "segments": [
    {
      "id": "01-letter-move",
      "cuts": [{ "clip": "opener", "sourceIn": 0, "durationSeconds": 4 }]
    }
  ]
}
```

Provide all nine segments in the real manifest. Segment `04-conversation-cozy` contains two cuts, 2.5 seconds each, for the warm conversation and the equipped style. Segments `07-night-introduction`, `08-night-question` and `09-end` use successive 2-, 2- and 3-second intervals of the same night take. Every start/duration and sound-event offset is measured against its actual source file, not against the final export.

## YouTube and Play handoff

The ready-to-copy title and description are in `copy/youtube-title.txt` and `copy/youtube-description.txt`; settings and publication state are in `copy/youtube-upload.json`. Publish the frame-reviewed final MP4 to the owner's YouTube channel as an embeddable, public or unlisted video, with video advertising disabled and no age restriction. Audience and rights declarations must reflect the actual channel/content; they are not inferred from the word “cozy.”

Google Play uses a YouTube URL, not the MP4 itself. Record the real YouTube URL and its verified playback state in the metadata after upload, then enter that URL into the Play listing's preview-video field. Check that the first seconds are intelligible with sound muted and that the embedding works. The production scripts do not claim that either service has been updated.

Reference: [Google Play preview asset guidance](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en).
