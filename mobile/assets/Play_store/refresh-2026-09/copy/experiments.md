# Listing experiments (refresh-2026-09)

These are the alternatives and the order to test them in, from section 1 of the
brief. Nothing here goes into the main listing until an experiment says so.
Character counts exclude any final newline and were checked by
`node mobile/scripts/store/refresh/verifyCopy.mjs`.

## Short description alternatives (localized en-US experiment)

| Id | Text | Chars | Angle |
| - | - | -: | - |
| Control | A cozy word puzzle game with 13 animal friends and a house that keeps secrets | 77 | cozy with a wink; this refresh's main listing text (control once uploaded) |
| SD-A | Move one letter, change two words. A cozy word puzzle with a secret of its own. | 79 | mechanic first; two sentences, each ending with a period |
| SD-B | Grow a cozy home for 13 animal housemates, one word puzzle at a time | 68 | pure cozy |
| SD-C | A cozy word puzzle game with a household of animals who are almost too kind | 75 | wink |

## App name alternative (custom store listing, not an experiment)

| Id | Text | Chars |
| - | - | -: |
| Control | WordShift: Cozy Word Puzzle | 27 |
| AN-A | WordShift: Cozy Word Mystery | 28 |

Store listing experiments cannot test the app name. Use AN-A in a custom store
listing with search keyword targeting (terms such as "cozy mystery" or "spooky
cozy") once Play Console reports those terms, and compare conversion per
listing. Google: "For each custom store listing, you can customize your app's
name, icon, descriptions, and graphic assets", and custom listings can target a
set of Play Search keywords
([Create custom store listings](https://support.google.com/googleplay/android-developer/answer/9867158)).

## Order of experiments (for the owner)

Run each for at least 14 days. Play runs either one default graphics
experiment or up to five localized experiments at a time, so run these one
after another. Google: "For each app, you can run one default graphics
experiment or up to five localized experiments at the same time"
([Run A/B tests on your store listing](https://support.google.com/googleplay/android-developer/answer/6227309)).

1. **Graphics:** control is phone screenshots 01 to 08 in listing order. The
   variant swaps slots 01 and 02 (house first, board second).
2. **Localized en-US short description:** control against SD-A and SD-C. The
   full description stays unchanged.
3. **Graphics:** feature graphic A (`upload/feature-graphic.png`) against
   feature graphic B (`upload/experiments/feature-graphic-b.png`).
4. **Later:** SD-B against the winner of experiment 2.

## Which metric to judge on

The brief asks for every experiment to be judged on retained first-time
installers (1 day), never on raw installs. Google's experiment help page, as
read on 2026-09-23, lists these result metrics instead: "Unique user install
clicks", "Unique user open clicks" and "Unique user pre-registration clicks"
([Run A/B tests on your store listing](https://support.google.com/googleplay/android-developer/answer/6227309)).

So, in practice:

- If Play Console still offers a retained first-time installer metric for your
  experiment, use it, as the brief intends.
- If it offers only the click metrics, choose "Unique user install clicks" to
  decide the winner, and before applying a winner compare the 1-day retention of
  the installs acquired during the experiment window in Play Console's
  statistics. A variant that wins installs but loses retention is attracting
  players who expected a different game; do not apply it.

Google recommends "testing changes to one asset at a time, so you can be as
certain as possible of what causes any changes", which is why each step above
changes one thing.
