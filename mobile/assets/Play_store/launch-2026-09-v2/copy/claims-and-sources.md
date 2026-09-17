# Copy evidence — September 17 refresh

Reviewed against the local source at `30a32597f27980acdebcf6081f60b2ea3351ed7c`, including the normal-walk update. Paths are relative to the repository root. This file verifies product claims; it does not establish Play Console publication or signed Android capture parity.

| Copy claim | Source | Limit reflected in the copy |
| --- | --- | --- |
| Both words must be valid; PLAY/PANT → PAY/PLANT | `mobile/e2e/game.spec.ts`, `mobile/src/hooks/usePuzzleGame.ts` | The example is a legal opening move. Removing the source letter and inserting it in the next row both leave valid words. |
| Moved letters lock in place | `mobile/src/hooks/usePuzzleGame.ts` | Explains the basic puzzle; does not promise identical move rules in every variant. |
| 13 animal friends, including Ember, Panko and Axel | `mobile/src/services/homeWorldData.ts`, `ANIMALS`; `mobile/src/services/animalAcquaintance.ts` | Friends join through progression; the screenshot subtitle says the household grows. |
| Earn amber, unlock rooms and add details | `mobile/src/services/homeWorldData.ts`; `mobile/src/services/roomUpgrades.ts` | Authored unlocks and room gifts, with no freeform-placement claim. |
| Tile styles | `mobile/src/services/cosmetics.ts` | Styles may be bought with amber or obtained through purchase/entitlement; no claim that every style is free. |
| Thousands of puzzles across five difficulties | `AGENTS.md` current eligible-bank audit; `mobile/src/services/puzzleBank.ts`; `mobile/src/components/puzzle/DifficultyMenu.tsx` | Uses the supported broad count, not all stored boards or a hand-authored claim. |
| Reverse Shift, Double Shift, timed, hidden-preview and rarer-word challenges | `mobile/src/components/puzzle/DifficultyMenu.tsx`; `mobile/src/constants/gameBalance.ts` | “More ways to play open as you progress” prevents a first-launch availability promise. |
| Practice boards | `mobile/src/components/puzzle/PracticeModal.tsx` | A learning mode, not a promise that every game board is freely selectable. |
| Daily challenges, streaks and daily/weekly quests | `mobile/src/services/dailyChallenge.ts`; `mobile/src/services/weeklyQuests.ts`; `mobile/src/services/dailyLoginReward.ts` | No claim that all players receive the same first Daily puzzle. No invented streak or rank. |
| Choices, conversations and a journal | `mobile/src/services/storySpine.ts`; `mobile/src/services/dialogueChoices.ts`; `mobile/src/components/StoryJournalModal.tsx` | Choices can leave callbacks and details, not a separate campaign for every answer. |
| A mystery that becomes unsettling | `mobile/src/services/homeWorldData.ts`, phase-aware room descriptions; `mobile/src/services/storySpine.ts` | No advertised reveal, robes, ritual close-up, finale or ending image. |
| Nighttime mystery image | `mobile/src/components/home/HouseWorld.tsx`, phase-3 pre-storm night sky and house tint; `mobile/src/components/home/RoomView.tsx`, night window treatment | “What changes after dark?” is a thematic question. Do not advertise a real-time day/night mechanic. Use an actual attainable night scene. |
| Story progresses without purchases | `mobile/src/services/homeWorldData.ts`; `mobile/src/components/monetization/SupportComparison.tsx` | No purchase needed to follow the main story; convenience and cosmetics do not become extra story chapters. |
| Core puzzles offline; no account needed | `README.md`; local puzzle banks and AsyncStorage services | Internet still needed for online features and purchases. No “fully offline” claim. |
| Sound, music, motion and haptics controls | `mobile/src/components/SettingsScreen.tsx`; `mobile/src/services/settings.ts` | Settings are listed directly; no certified-accessibility claim. |
| Ads, purchases and optional auto-renewing Supporter subscription | `mobile/src/services/ads.ts`; `mobile/src/services/iap.ts`, `SUPPORTER_SUB` | No fixed-price or lifetime-subscription claim. |

## Campaign decisions

- Keep the title and short description as approved. The full description is 1,887 characters, including line breaks, before its file's final newline.
- The word “real” no longer explains puzzle validity in this campaign. The opener and full description explicitly say both results must be valid.
- Put the actual nighttime mystery scene in slot 4. The old benign cup conversation no longer carries the mystery promise alone.
- Keep the icon control for initial use. The simpler icon, alternate opener and alternate short description are individual later experiment candidates.
- “Game” → “Word” is the category recommendation. Select tags from the current Console's actual offered vocabulary; no fixed tag list is invented here.

## Official field references

The parent campaign audit checked Google's current requirements on September 17, 2026. The references below explain upload fields and creative presentation, rather than endorsing this campaign's editorial choices.

- [Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152?hl=en)
- [Add preview assets to showcase your app](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
- [Google Play icon design specifications](https://developer.android.com/distribute/google-play/resources/icon-design-specifications)
- [Choose a category and tags](https://support.google.com/googleplay/android-developer/answer/9859673?hl=en)
- [Store listing experiments](https://support.google.com/googleplay/android-developer/answer/12053285?hl=en)
