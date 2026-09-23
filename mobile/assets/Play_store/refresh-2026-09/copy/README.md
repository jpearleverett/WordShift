# WordShift Play listing copy (refresh-2026-09)

Paste-ready English (United States) text for the Google Play main store
listing, written from `../brief.md` on 2026-09-23 and checked against the code
at HEAD `4fc0121f`. Every claim is traced in
[claims-and-sources.md](claims-and-sources.md); the test plan is in
[experiments.md](experiments.md).

This pack replaces `launch-2026-09` only once the owner uploads it. It changes
no Play Console field by itself.

## Paste into Play Console (Main store listing)

| Play Console field | File | Characters (excluding the file's final newline) |
| - | - | -: |
| App name | [app-name.txt](app-name.txt) | 27 / 30 |
| Short description | [short-description.txt](short-description.txt) | 77 / 80 |
| Full description | [full-description.txt](full-description.txt) | 3,677 / 4,000 |

**App name:** WordShift: Cozy Word Puzzle

**Short description:** A cozy word puzzle game with 13 animal friends and a house that keeps secrets

**Full description:** paste the whole of `full-description.txt`. It opens with
the real first move (the L from PLAY into PANT), puts "cozy word puzzle game" in
the first 167 characters, and carries "word puzzle" 3 times, "word game" 3
times and "cozy" 3 times, plus "word ladders", "offline" and "daily". It ends
with the content disclosure and the line "A cozy word game. Mostly."

Each `.txt` file is exactly the field text plus one final newline; Play Console
trims the newline on paste. `listing-en-US.json` holds the same three fields and
their counts, and the verifier below fails if they ever drift apart.

## Screenshot, feature graphic and trailer copy

Phone screenshots (1080x1920, in this order). Alt text is 140 characters or
fewer; if the stills build rewrote a line to match its final crop,
`../alt-text.tsv` wins.

| Order | File | Band | Headline | Support line |
| -: | - | - | - | - |
| 1 | upload/phone/01-shift-one-letter.png | day | Shift one letter. | Keep both words real. |
| 2 | upload/phone/02-words-build-a-home.png | day | Words build a home. | (none) |
| 3 | upload/phone/03-cozy-mostly.png | dusk | A cozy game. Mostly. | (none) |
| 4 | upload/phone/04-stories-in-each-room.png | day | Stories in each room. | 13 housemates to get to know. |
| 5 | upload/phone/05-then-the-rules-shift.png | parchment | Then the rules shift. | Styles and challenges that stack. |
| 6 | upload/phone/06-every-word-goes-somewhere.png | parchment | Every word goes somewhere. | (none) |
| 7 | upload/phone/07-tea-or-cocoa.png | parchment | Tea or cocoa? | Ember will remember your answer. |
| 8 | upload/phone/08-stay-for-supper.png | dusk | Stay for supper. | (none) |

Tablet (7-inch and 10-inch, both slots), in upload order: t1-board, t2-house,
t3-cup and t4-pit. The board leads so the first tablet image shows the puzzle.
Upload the tablet set only once a build with the tablet board fix is live on
Play (`getBoardScaleWrapperStyle` in `src/services/slotEstimation.ts`, shipped
with this pack): before it, the enlarged board's row cards ran off both screen
edges on 600 dp and wider screens, so the board frame would not match what a
tablet player of the older build sees. There are no landscape phone screenshots: the app
is portrait-locked.

Feature graphic A (main listing): "Your words keep this house warm."
Feature graphic B (experiment only): "Every letter counts."
The store icon is unchanged.

Trailer (YouTube, then pasted into Play as `https://www.youtube.com/watch?v=<ID>`):

- **Title:** WordShift: Cozy Word Puzzle (Trailer)
- **Description:** the `trailer.description` string in
  [listing-en-US.json](listing-en-US.json) (814 characters, ASCII, no call to
  action, ends with the Play link and three hashtags; `verifyCopy.mjs` prints
  the current length).
- **Settings:** public or unlisted, monetization off, "No, it's not made for
  kids", not age-restricted, embedding allowed, `video/captions-en.srt` as the
  caption track.
- **Burned-in captions:** listed with their times in `trailer.captions`.

## What changed from the brief

The brief's text is used as written except for these accuracy and tone edits
in the full description (details and reasons in
[claims-and-sources.md](claims-and-sources.md)):

| Brief | This pack | Why |
| - | - | - |
| locks into its new word | locks into the word it joins | removes a literal "new" (boundary 10) |
| keep finding new ways | keep finding fresh ways | removes a literal "new" (boundary 10) |
| no timers unless you want one | no countdown clock unless you want one | the daily leaderboard ranks by solve time |
| more than 2,000 lines to hear | more than 2,000 lines of dialogue to discover | the dialogue is not voiced |
| you will feel at home here; when you are online | you'll feel at home here; when you're online | matches the game's own cozy, contracted voice |
| hand each gift to the friend who lives there | each decoration is a gift you hand to the friend who lives there | "each gift" referred to nothing before it |
| an online leaderboard | your rank among the day's players | the game shows your own daily rank, not a list of players; a pre-checked fallback, "- A daily word puzzle with streaks", is in `listing-en-US.json` (`full_description_fallbacks`) for upload day if a signed build has not yet posted a Daily rank |
| Keep both words real to make progress | (deleted) | it repeated paragraph 2 |
| You start with 5, and you can earn more | you start with five and can earn more | one clause per bullet; small numbers spelled out |
| Four challenges that stack on any style | Four modifiers you can layer on any of the three styles | the game's own terms; no "Challenge Mode" inside a list of challenges |
| you offer them there for amber | you offer them there to collect the amber they earned | the pit collects amber already earned, it is not a second source |
| 5 daily and 5 weekly quests | Five daily and five weekly quests | small numbers spelled out |
| Tile styles | Tile themes | "styles" now means puzzle styles only |
| Send a friend a link to a puzzle you solved | Share your results with friends | the challenge link is a `wordshift://` URL most messaging apps will not open |

The full description therefore counts 3,677 characters instead of 3,625.

## Check it

```
node mobile/scripts/store/refresh/verifyCopy.mjs
```

Run from the repository root. It checks the Play limits, that every file in
`copy/` (and `alt-text.tsv` and the SRT once they exist) is plain ASCII with no
en or em dash, no curly quote, no three-dot ellipsis and no double hyphen, that no
player-facing string uses a ranking, price, promotional or call-to-action word
or names anything the brief keeps secret, that alt text is 140 characters or
fewer, that no two captions repeat each other, and that "Mostly." appears only
in slot 03 and at the end of the full description. It also parses
`video/captions-en.srt` and fails unless every cue's text, start and end equal
`trailer.captions`, and it scans the cue text for the same banned words. It
must exit 0 before hand-off.

## Owner notes

- Category: Game, Word. Tags (up to five, from the Console's own list): Word,
  Puzzle, Casual, Offline, and a stylized or pixel art tag if offered.
- The ads declaration adds Play's own "Contains ads" label; the description's
  last paragraph also names the in-app purchases, the auto-renewing Supporter
  subscription and the remove-ads purchase, which that label does not cover.
- "No purchase is needed to follow the main story" is the only story and
  purchase statement. Do not add a line saying purchases leave the story's pace
  unchanged: bought amber can bring the reveal earlier.
