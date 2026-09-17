# WordShift Play Store refresh — production brief

Approved direction, September 17, 2026. This brief incorporates the owner's two changes: explain the valid-word rule clearly, and show an actual nighttime scene that hints at the mystery to come.

## Core message

One clever letter move leads to two valid words, a growing home, and a story that becomes quietly unsettling. The first three images explain the move, show its home-building payoff, and introduce the household. The fourth makes the mystery visible.

Keep the established parchment, forest-green and amber palette, Epunda Slab headings, Figtree supporting type, WordShift wordmark and Ember identity. Use the actual game as the main image. The new night image should feel noticeably different from the daylight home while retaining a visible, inviting interior.

## Exact copy

`../copy/listing-en-US.json` is the copy source. Its screenshot entries define order, export slugs, headlines and subtitles. The paste-ready text files repeat its title, short description and full description. `screenshot-copy.tsv` provides a compact caption mapping.

The opener uses **“One letter. Two new words.”** and **“Both results must be valid words.”** The full description explains both sides of the move: “The word you take it from and the word you add it to must both be valid.” The concrete PLAY/PANT → PAY/PLANT example proves the rule. Do not reuse the previous campaign's “real words” phrasing.

The nighttime image uses **“A cozy game. Mostly.”** and **“What changes after dark?”** The question is promotional copy, not a line attributed to a resident. Use the actual phase-3 night treatment. The progression produces that scene; the copy must not claim a real-time day/night cycle, scheduled midnight event, or a nightly reset.

The title and short description remain the approved baseline. The revised full description adds an explicit progression qualifier before the feature list, and makes the mystery promise more direct without revealing the answer.

## Phone sequence

| Slot | Proof to capture | Composition priority |
| --- | --- | --- |
| 1 | Legal L move from PLAY into PANT; genuine PAY/PLANT result if a second view is used | One large readable board. Clear source and destination. Transient instruction toast absent. |
| 2 | Bright current house with furnished rooms and normal residents | Current compact next-reward bar. At least several rooms and visible residents. |
| 3 | A short warm resident conversation | Current dialogue layout, readable exchange and house context. All 13 friends unlock over time. |
| 4 | Actual phase-3 pre-storm night house | Warm interior lights against the dark sky. Exclude robes, phase 4+, the revealed presence and ending details. |
| 5 | Genuine Double Shift action | Two letters selected and a legal move, after instructions close. Reverse Shift is a separate verified mode named in the caption. |
| 6 | Regular Daily Challenge in progress | Real current Daily interface; no bonus toast or fabricated date, streak or rank. |
| 7 | A tile style actually equipped, or a completed room gift | Visible payoff, rather than the price list. Match the alt text to whichever final scene is selected. |
| 8 | An early story choice in the current interface, or a previously read journal entry | One concise, readable screen. Match the alt text to the final scene. |

Export the main eight images as opaque 1080×1920 PNGs. Preserve genuine UI proportions. Keep the caption band compact and away from controls. Inspect each image at full size and around 200px wide; a word-puzzle board that becomes illegible in the composition is not ready. Do not alter screenshots to erase controls, fabricate progress or add mystery clues. Choose a clean real capture state.

The alternate opener is a separate experiment asset: **“Move a letter. Make two words.”** / **“PLAY becomes PAY. PANT becomes PLANT.”** Use genuine clearly separated before/after captures. Keep the other seven images identical in an opener experiment.

## Feature and icon

Feature graphic: keep the warm den and dark doorway, add a legible letter cue, and use **“One letter. A home full of secrets.”** The illustration is promotional artwork, so it must not masquerade as a playable game screen. Keep the important face, wordmark and text clear of likely crops and the central video-play affordance. Export at 1024×500 without alpha.

Icon: retain the existing icon as the default control. Supply one simpler Ember-face-and-W-tile challenger for a separate experiment. Review at 48px and 64px as well as 512px. This pack does not replace the installed launcher artwork.

## Trailer

Use `trailer-timeline.json` as the edit decision brief and `trailer-captions.srt` as the exact on-screen-caption track. The SRT transcribes promotional captions; it is not a claim that those words are spoken. The opening cue also includes the valid-word rule. If captions are burned into the picture, the matching SRT can remain a source asset without enabling a duplicate visible track.

The 30-second portrait edit starts with the legal move immediately, shows a genuine solve/reward, then the lived-in house and new normal walks. It closes by moving from warmth to actual night footage. Split the Daily and Double Shift passage into two readable beats. Use actual footage through the final wordmark overlay, not a long static end card.

Existing game sounds may be retained or synchronized to the real actions. Use only a soundtrack the project controls. The film must communicate its full message when muted. The nighttime transition should be quiet and curious; no added jump scare, monster or invented clue.

Source footage and exports must record their actual platform and source commit. A web capture is not a signed Android capture. Before a final store upload, compare the depicted UI and behavior with the signed Android release that players will receive.

## Packaging and final text check

The alt text in `../copy/alt-text.tsv` is tied to intended compositions and remains marked for final image verification in JSON. After capture, replace generic subjects with the actual visible resident, board state or room gift where that improves accuracy. Keep every description within 140 characters. If export paths change, update both mappings together.

Keep the earlier campaign as the rollback control, and keep challengers outside the default upload set. Include numbered upload files, copy, raw captures, editable layouts, generation prompts where applicable, this timeline, capture provenance and a checksum manifest. Current Console state and any actual publication result must be recorded separately from asset completion.
