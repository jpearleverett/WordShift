# WordShift — Press & Creator Kit

> A cozy word puzzle that is secretly something else. This kit tells you what,
> how to show it responsibly, and how to skip 150 puzzles of slow burn using a
> reviewer fast-forward built into the game.

**Spoiler policy at a glance:** everything above the marked **SPOILERS** line is
safe to publish verbatim. Everything below it is for your eyes and your
editing-room decisions.

---

## The pitch

**WordShift** is a candy-colored mobile word puzzle with one satisfying rule:
pick a letter from one word, drop it into the next, and both must stay real
words. You earn amber, build a storybook house, and fill it with adorable
animal friends who chat with you between puzzles. It is genuinely one of the
coziest word games on the store — for the first few hours. Then the animals'
questions get a little strange, the sky over the house turns, and the game
begins a slow, deliberate descent that most players never see coming. WordShift
is a bait-and-switch played completely straight: the warmth is real, which is
exactly why what follows lands.

## Fact sheet

| | |
|---|---|
| **Title** | WordShift |
| **Developer** | Iridescent Games — a solo developer |
| **Platform** | Android (Google Play) at launch; built cross-platform (iOS planned) |
| **Engine / stack** | React Native + Expo, TypeScript |
| **Price** | Free. Optional in-app purchases (currency/hint packs, cosmetics, one-time Remove Ads) and occasional ads with an opt-in rewarded tier |
| **Monetization stance** | Convenience and cosmetics only — the story unfolds at the same pace for everyone; nothing narrative is purchasable |
| **Accounts** | None required; core puzzles play offline |
| **Current version** | 1.3.0 |
| **Content rating** | ESRB Teen / PEGI 12 / Apple 12+ — mild horror themes; no gore, no violence, no profanity (the dictionary is filtered) |
| **Genre** | Word puzzle / narrative slow burn |
| **Session length** | 2–5 minutes per puzzle; the full arc is tens of hours |
| **Press contact** | `[press contact email — provided with your creator code]` |

**By the numbers:** 13 animal companions, a 13-room house built bottom-up,
4 difficulty tiers, 3 variant modes (Reverse, Double Shift, timed Speed runs),
a shared Daily Challenge with leaderboard, 51 achievements, an 11,500-word
dictionary, and ~5,100 hand-vetted pre-generated puzzles plus on-device
generation.

## Why this clips well (creator notes, spoiler-safe)

- **The turn is the content.** WordShift's descent is gradual and diegetic:
  puzzle words, dialogue, music, UI chrome, the sky, even the physics of the
  letter tiles shift in lockstep. Side-by-side footage of the same screen at
  different points in the game is the single best thumbnail-safe artifact this
  game produces.
- **The animals carry it.** Each companion has a distinct voice and a long
  written arc. Reaction content ("wait, what did the owl just say?") writes
  itself.
- **The puzzle core holds up on its own.** The letter-shift rule with live
  valid/invalid previews is legible on stream at a glance, and chat can play
  along.
- **It respects the bit.** No fourth-wall winks, no "gotcha" jump scares. The
  game never tells you what is happening; it lets you notice.

## The creator fast-forward (reviewer save states)

The game's later eras sit **~155+ puzzles deep by design** — that pacing is the
point for players, and a wall for reviewers. Creator-enabled builds therefore
ship with a private fast-forward that installs a coherent late-game save:
correct puzzle counts, currency, house progress, unlocked companions, and
era-appropriate dialogue, with all tutorials already behind you. It is the same
save a real long-term player would have, minus the weeks.

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
| `dusk` | Deeper Questions | ~70 puzzles in. The first act's warmth with a visible tilt: dusk skies, uneasy conversations, a half-built house |
| `shadows` | Growing Shadows | ~140 puzzles in. The slow burn at full heat, original house complete, the mood unmistakably wrong |
| `reveal` | The Horizon | ~200 puzzles in. The late game, house complete. **Spoiler-heavy** |
| `peace` | Terrible Peace | ~260 puzzles in. The post-story state. **Spoiler-heavy** |

> ⚠️ **Warning: applying an era OVERWRITES all progress on that device.** There
> is no undo. Use a spare device or profile if you have a personal save you
> care about. One link per era — you can move between eras by applying another
> link, but always as a full replacement.

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

WordShift's horror is **tonal, not graphic**: unease, dread, and implication.
There is no gore, no violence, no death on screen, no profanity, and no jump
scares. Rated **Teen (ESRB) / PEGI 12 / 12+ (Apple)** for mild horror and fear
themes. It is a game about noticing that something is wrong long before anyone
says it.

## Press assets

- App icon (1024×1024): `mobile/assets/icon.png`
- Feature graphic (1024×500): `docs/feature-graphic.png`
- Store copy and screenshot shot list: `docs/STORE_LISTING.md` (narrative-safe,
  in order)
- Additional screenshots/GIFs of any era on request — or capture your own via
  the fast-forward above.

---

# ⛔ SPOILERS BELOW ⛔

**Everything from here describes the game's actual arc. Publish with care.**

## What WordShift actually is

The animals are a cult. Every puzzle the player solves is, unknowingly, an
incantation — the words are offerings, the house is a temple being built room
by room, and the player's "help" is the whole plan. Across five acts the game
migrates from candy-bright word toy to quiet cosmic horror without ever
breaking character: the fox who once wanted to tell you about cozy blankets
eventually says things like *"The fire grows cold... but something else
burns,"* and it lands **because you remember the blankets**. The final act is
not a boss fight; it is a reveal, an arrival, and then — worse than any
scream — a terrible, serene peace. The animals were never evil. They are
reverent, certain, and grateful. You helped.

Design rules the game never breaks (useful framing for reviews):

- The fourth wall stays intact; the animals don't know they're in a game.
- The player is made **complicit**, not victimized: "You solved the puzzle.
  You brought us closer."
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
- Animal choice points (each companion offers one binary dilemma)
- The pit's ward marks charging toward something

**`reveal` — The Horizon (SPOILERS — never in thumbnails):**
- Robed sprites; the looming figure behind the house
- "The arrangement" spoken plainly; Ember recontextualizing her own tutorial
- The amber **sacrifice** mechanic (voluntary destruction, zero benefit)
- Keep playing: the finale fires after roughly eight more wins in this era

**`peace` — Terrible Peace (SPOILERS):**
- The settled world; serene, grateful animals
- The Tending Shrine; "The pattern continues."
- The New Cycle option — the game's NG+, where the descent comes faster

## One-line summaries you may quote

> "A word game that is nice to you for ten hours specifically so it can hurt
> you in the eleventh."

> "The cult was the friends we made along the way."

---

*This document is the creator/press kit for WordShift. The creator code is
distributed privately; if you received this kit without one, request it via
the press contact above. Kit last updated for v1.3.0.*
