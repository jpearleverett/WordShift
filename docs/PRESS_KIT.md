# WordShift — Press & Creator Kit

Source review: September 14, 2026 (launch-readiness branch). The configured app
version is **1.3.5**, Android version code **99**; this does not identify the
binary currently installed by a reviewer. See [current build status](CURRENT_BUILD.md).

> A cozy word puzzle that is secretly something else. This kit tells you what,
> how to show it responsibly, and how to skip a ~90-puzzle slow burn using a
> reviewer fast-forward built into the game.

**Spoiler policy at a glance:** everything above the marked **SPOILERS** line is
safe to publish verbatim. Everything below it is for your eyes and your
editing-room decisions.

---

## The pitch

**WordShift** is a candy-colored mobile word puzzle with one satisfying rule:
pick a letter from one word, drop it into the next, and both must stay real
words. You earn amber, build a storybook house, and fill it with adorable
animal friends who chat with you between puzzles. The early rooms and
conversations are warm and welcoming. Then the animals'
questions get a little strange, the sky over the house turns, and the game
begins a slow, deliberate descent. WordShift
is a bait-and-switch played completely straight: the warmth is real, which is
exactly why what follows lands.

## Fact sheet

| | |
|---|---|
| **Title** | WordShift |
| **Developer** | Iridescent Games — a solo developer |
| **Platform** | Android (Google Play) at launch; built cross-platform (iOS planned) |
| **Engine / stack** | React Native + Expo, TypeScript |
| **Price** | Free. Optional in-app purchases (currency/hint packs, a starter bundle, cosmetics, one-time Remove Ads, a one-time Patron key, and an optional Supporter monthly subscription) and occasional ads with an opt-in rewarded tier |
| **Monetization stance** | Convenience and cosmetics; purchases do not advance narrative phase progress or buy story chapters. Players' pace varies with play and reading. |
| **Accounts** | None required; core puzzles play offline |
| **Configured version** | 1.3.4, Android version code 98; confirm the delivered review build |
| **Audience / rating** | Intended for ages 13+ with dark-fantasy/horror themes. Publish only the regional ratings actually assigned in the store console. |
| **Genre** | Word puzzle / narrative slow burn |
| **Session length** | Varies by difficulty and reading; no measured average is claimed |
| **Press contact** | jpearleverett@gmail.com |

**By the numbers:** 13 animal companions, a 13-room house built bottom-up,
5 difficulty tiers (topped by a 6-letter EXPERT), 3 play styles (standard,
Reverse, Double Shift) with 4 stackable modifiers (Challenge, timed Speed
runs, the previews-off Blind Offering, and the rare-word Lexicon), a shared
Daily Challenge with leaderboard, 56 achievements, and thousands of word
puzzles across 30 pre-generated banks plus on-device generation. The September
6 audit recorded 7,356 stored boards and 4,372 qualifying boards; current
delivery also applies vocabulary and complete-route eligibility checks. Do
not advertise every stored board as playable. The newcomer's first Daily
Challenge has an easier shape and does not enter the shared leaderboard.

The story includes remembered choices beyond the first cup of tea or cocoa.
Later recruits get personal introductory visits using their established
writing, with earlier conversations available in the journal. Room upgrades
are authored additions fitted to each animal's room, not freeform decorating.

## Why this clips well (creator notes, spoiler-safe)

- **The turn is the content.** WordShift's descent is gradual and diegetic:
  puzzle words, dialogue, music, UI chrome, the sky, even the physics of the
  letter tiles shift in lockstep. Side-by-side footage of the same screen at
  different points in the game is the single best thumbnail-safe artifact this
  game produces.
- **The animals carry it.** Each companion has a distinct voice and a long
  written arc. Reaction content ("wait, what did the owl just say?") writes
  itself.
- **The puzzle core holds up on its own.** The letter-shift rule is legible on
  stream at a glance — ghost previews show the word each drop would form, with
  valid/invalid grading on EASY and the earliest boards (past that, judging
  the word yourself is the skill) — and chat can play along.
- **It gives you time to notice.** The mood changes before the household can
  explain it. Later conversations address the evidence and what it means.

## The creator fast-forward (reviewer save states)

The first-run reveal has a **90-puzzle minimum** alongside progression gates;
the finale additionally depends on house completion, its dwell window and
the next eligible board. These are gates, not a promise that every player
reaches a scene at one exact puzzle number. Creator-enabled builds therefore
ship with a private fast-forward that installs a coherent late-game save:
correct puzzle counts, currency, house progress, unlocked companions, and
era-appropriate dialogue, with tutorials marked seen. It uses the same
progression systems as normal play, staged for capture. It is not proof
that a normal player saw every introductory conversation or ceremony.

**How to use it:**

1. You will receive a **creator code** privately from the developer alongside
   this kit. The feature does not exist without it — public builds without a
   configured code ignore these links entirely.
2. Install the build, then open a deep link of this form (tap it from any
   notes app, or use `adb` with the app installed):

   ```
   wordshift://creator?code=YOURCODE&era=reveal
   ```

   ```bash
   adb shell am start -a android.intent.action.VIEW \
     -d "wordshift://creator?code=YOURCODE\&era=reveal"
   ```

3. Confirm the in-game prompt. The app rebuilds itself into the chosen era.

**Available eras** (each is a complete, coherent save):

| `era=` | In-game era | You get |
|---|---|---|
| `dusk` | Deeper Questions | 50-puzzle staged save. Dusk skies, uneasy conversations, a partially built house |
| `shadows` | Growing Shadows | 85-puzzle staged save. The house is further developed and the mood has darkened |
| `reveal` | The Horizon | ~140 puzzles in. The late game, house complete. **Spoiler-heavy** |
| `peace` | Terrible Peace | ~180 puzzles in. The post-story state. **Spoiler-heavy** |

> ⚠️ **Warning: applying an era OVERWRITES all progress on that device.** There
> is no undo. Use a spare device or profile if you have a personal save you
> care about. One link per era — you can move between eras by applying another
> link, but always as a full replacement.

Snapshots intentionally acknowledge ceremonies produced by their staged
history. Test first-time ceremonies and animal introductions through normal
play, not by treating these shortcuts as a complete player journey.

**Recommended review path:** play the first 30–60 minutes from a genuinely
fresh install (the opening is the product's first impression and takes no
shortcuts), then jump: `dusk` → `shadows` → `reveal` → `peace`.

## Spoiler courtesy — please read

The reveal is the product. We ask, politely and without DRM-shaped teeth:

- **Do not put anything from `reveal` or `peace` in thumbnails, titles, or the
  first 30 seconds** of a video. The late-game imagery is instantly legible as
  "this cozy game goes dark," and that headline costs every future player the
  experience.
- Footage from a fresh install through `dusk` is fully thumbnail-safe.
  `shadows` is fine inside a video with a spoiler warning.
- If you cover the full arc, a spoiler warning around the two-hour-gameplay
  mark (or wherever you cut to `reveal` footage) is plenty.

## Content rating note

WordShift's horror uses unease, dread and implication. The intended audience
is 13+, and the dictionary has vocabulary filtering. An intended audience
is not an issued ESRB, PEGI or Apple rating: use the live console's regional
results for the reviewed release. The old kit's fixed labels were draft
guidance and should not be reproduced as assigned ratings.

## Press assets

- App icon (1024×1024): `mobile/assets/icon.png`
- Current campaign review: [September launch pack](../mobile/assets/Play_store/launch-2026-09/README.md)
- Feature graphic (1024×500): `mobile/assets/Play_store/launch-2026-09/upload/feature-graphic-1024x500.png`
- Store copy and screenshot shot list: `docs/STORE_LISTING.md` (narrative-safe,
  in order)
- Additional screenshots/GIFs of any era on request — or capture your own via
  the fast-forward above.

The retained September launch screenshots are web captures from that dated
campaign. Choice presentation and room details have changed since capture;
compare them with the latest signed Android build before reuse. This docs
review did not regenerate artwork or publish a listing.

---

# ⛔ SPOILERS BELOW ⛔

**Everything from here describes the game's actual arc. Publish with care.**

## What WordShift actually is

The puzzles form offerings and the growing house prepares for an arrival.
The residents have different relationships with that tradition: affection,
doubt, withheld information, investigation and disagreement matter. They are
not an interchangeable cast secretly agreeing about everything. The main
story follows evidence of what the house is becoming and asks what its
inhabitants owe each other.

The finale lets the player set a boundary: a private room that keeps an
uncorrected thought, or a road that leads away. Earlier decisions affect
later responses and details, and the post-arrival conversation leaves room
for anger, hope, uncertainty or silence. New Cycle carries traces of the
chosen boundary; the journal retains transcripts from the ten most recent
earlier cycles. Do not promise separate campaigns or a different puzzle set
for every dialogue choice.

Design rules the game never breaks (useful framing for reviews):

- The fourth wall stays intact; the animals don't know they're in a game.
- The player's participation matters, and their later boundaries and answers
  matter too.
- The entity is never named and never explained.
- Visuals shift slightly *before* the dialogue admits anything — the player is
  meant to feel it before they're told.

## Suggested capture beats per era

**Fresh install — Bright Days (thumbnail-safe):**
- Ember the fox's welcome and the first guided puzzle
- The candy tiles' bounce; green-check/red-cross word previews mid-drag
- First amber harvest at the Offering Pit while it still reads as adorable
- Sharp ears will catch the onboarding's last line: *"They need you."*

**`dusk` — Deeper Questions (thumbnail-safe):**
- The dusk sky and darkened menus against still-cheerful gameplay
- Animals asking what words *are*, and where offered words go
- Dread words (VOID, HOLLOW...) starting to surface in puzzles, with a faint
  crimson pulse when formed
- Completed puzzles now get **named incantations** ("The HEAT Dance")

**`shadows` — Growing Shadows (in-video with a warning):**
- Storm sky; the shadow at the edge of the house art if you look closely
- Hollow victory text; the move/victory sounds turn dark
- Animal choice points (one remembered ask/refuse dilemma per companion,
  delivered when their dialogue reaches the relevant material)
- The pit's ward marks charging toward something

**`reveal` — The Horizon (SPOILERS — never in thumbnails):**
- Robed sprites; the looming figure behind the house
- "The arrangement" spoken plainly; Ember recontextualizing her own tutorial
- The voluntary amber offering buys no item or ending; an active offering
  quest can return part of that amber
- Keep playing through the finale gates; a staged reveal save is not a
  guarantee that the arrival fires after exactly eight more wins

**`peace` — Terrible Peace (SPOILERS):**
- The changed world and the consequences of the player's chosen boundary
- The Tending Shrine; "The pattern continues."
- The New Cycle option — the game's NG+, where the descent comes faster

## One-line summaries you may quote

> "A cozy word puzzle about the things a house remembers."

> "Move one letter. Stay long enough to hear what changes."

---

*This document is the creator/press kit for WordShift. The creator code is
distributed privately; if you received this kit without one, request it via
the press contact above. Kit reviewed against the configured v1.3.4 source,
2026-09-13; native release acceptance and store publication are separate.*
