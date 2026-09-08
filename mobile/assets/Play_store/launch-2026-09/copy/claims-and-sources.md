# Listing claim review

Checked September 7, 2026. This is editorial evidence for the copy pack, not a new public feature list. Paths below are relative to the repository root.

| Claim or choice | Current evidence | Marketing boundary |
| --- | --- | --- |
| Move L from PLAY into PANT to create PAY and PLANT | `mobile/e2e/game.spec.ts`, opening board and scripted real solution; `mobile/src/hooks/usePuzzleGame.ts` | This is an actual starting move, not a fabricated advertising puzzle. |
| Shifted letters lock | `mobile/src/hooks/usePuzzleGame.ts`, move application and locked cells | Explain the basic rule, without implying every advanced variant behaves identically. |
| 13 animal companions, named Ember, Panko, Axel | `mobile/src/services/homeWorldData.ts`, `ANIMALS` | They arrive through progression; do not imply they are all available on first launch. |
| A growing house and room details | `mobile/src/services/homeWorldData.ts`, `ROOMS`; `mobile/src/services/roomUpgrades.ts` | Room upgrades are authored additions. Do not imply freeform furniture placement, a building sandbox, or arbitrary house layouts. |
| Tile styles | `mobile/src/services/cosmetics.ts` | Some are earned or bought with amber; some are tied to purchases. Do not say every style is free. |
| Thousands of puzzles, five difficulties | `mobile/src/services/puzzleBank.ts`; `mobile/src/components/puzzle/DifficultyMenu.tsx`; current gated-bank audit in `AGENTS.md` | The eligible pool exceeds 4,000. Do not market all stored boards as currently playable or call generated boards hand-crafted. |
| Reverse, Double Shift, Speed, Blind Mode, Lexicon | `mobile/src/components/puzzle/DifficultyMenu.tsx`; `mobile/src/constants/gameBalance.ts` | Variants and modifiers unlock during progression. Blind Offering is a later narrative label; use the early name publicly. Lexicon deliberately includes rarer vocabulary. |
| Daily challenges | `mobile/src/services/dailyChallenge.ts` | The first daily is eased for newcomers and does not submit to the shared leaderboard. Avoid “every player gets the same puzzle.” |
| Daily and weekly quests, 56 achievements | `mobile/src/services/weeklyQuests.ts`; `mobile/src/services/achievements.ts` | Do not invent completion rates or imply rewards require payment. |
| Unsettling story, remembered choices, journal | `docs/STORY_AND_VISUAL_IMPLEMENTATION.md`; `mobile/src/services/storySpine.ts`; `mobile/src/components/StoryJournalModal.tsx` | Sell the tonal shift without naming the presence, final board, final choices, ending imagery, or the robed cast. The residents are distinct people, not an interchangeable secret conspiracy. |
| Core puzzles offline, no account needed | `README.md`; local puzzle banks and AsyncStorage services | Cloud features, leaderboard requests, ads and purchases have network dependencies. “Fully offline” would overstate the whole app. |
| Main story does not require purchases | Progression is based on play in `mobile/src/services/homeWorldData.ts`; `mobile/src/components/monetization/SupportComparison.tsx` says the support options preserve story pace | Convenience and cosmetic purchases should not be described as extra story chapters. |
| Ads and optional auto-renewing Supporter subscription | `mobile/src/services/ads.ts`; `mobile/src/services/iap.ts`, `SUPPORTER_SUB` | Do not advertise “no ads,” lifetime access for the subscription, or locally hard-coded prices. |
| Sound, music, motion and haptics controls | `mobile/src/components/SettingsScreen.tsx`; `mobile/src/services/settings.ts` | These are settings, not evidence for a certified accessibility claim. |

## Existing public copy aligned in this change

The new pack supersedes the older Android listing text in `docs/STORE_LISTING.md`. That historical document also tells the owner to create the Supporter subscription; the current session confirms it is already configured. Do not repeat that setup task.

The landing-page source `docs/index.md` was aligned with the launch copy:

- “Thousands of hand-tuned word chains” became “Thousands of word puzzles across five difficulty levels.” The game uses generated, audited pools; “hand-tuned” suggests individual authorship that the source does not establish.
- “A daily challenge shared by every player” became “Daily word challenges, with streaks and an online leaderboard.” The first daily has an easier shape for new players.
- “Progress backs up automatically” was qualified with network context: “No account required; cloud backups sync when online.” This still describes the automatic behavior without implying an offline remote backup.

The landing page also lists “Challenge friends with a link to the exact puzzle you just solved.” This was not included in the recommended launch copy: the first campaign is stronger when it explains the core mechanic, house, and story before adding more feature claims. This is an editorial cut, not a report of a broken feature.

The website source and the historical listing notice were updated in the feature branch. No external website or live listing was published by this task.

## Official references

- Text limits: [Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152).
- Asset dimensions, genuine gameplay presentation, text placement, descriptions and video: [Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/9866151).
- Accurate titles, descriptions and promotional claims: [Metadata policy](https://support.google.com/googleplay/android-developer/answer/9898842).
- Categories and relevant tags: [Choose a category and tags](https://support.google.com/googleplay/android-developer/answer/9859673).

These references were checked on September 7, 2026. The copy's positioning and image sequence are creative recommendations based on the current game; Google does not prescribe or endorse this campaign.
