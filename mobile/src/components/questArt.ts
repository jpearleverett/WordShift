import { ImageSourcePropType } from 'react-native';
import type { QuestType } from '../services/weeklyQuests';

// Generated cottage art for the quest rows (scripts/tools/gameIcons/quests.mjs
// -> assets/ui/quests/<type>.png), one painted object per quest TYPE. The quest
// modal's rows were the one list in the game with no leading visual at all;
// the type is the natural key because a quest's title and target vary per
// period while its type names what the player actually does.
//
// Static `require()` literals only (Metro bundles what it can SEE). The
// registry is typed against QuestType so a new quest type fails typecheck
// until it has art; `gameArt.test.ts` cross-checks the files on disk.
export const QUEST_ART: Record<QuestType, ImageSourcePropType> = {
  solve_count: require('../../assets/ui/quests/solve_count.png'),
  solve_difficulty: require('../../assets/ui/quests/solve_difficulty.png'),
  earn_stars: require('../../assets/ui/quests/earn_stars.png'),
  no_hints: require('../../assets/ui/quests/no_hints.png'),
  challenge_mode: require('../../assets/ui/quests/challenge_mode.png'),
  speed_wins: require('../../assets/ui/quests/speed_wins.png'),
  earn_amber: require('../../assets/ui/quests/earn_amber.png'),
  visit_animals: require('../../assets/ui/quests/visit_animals.png'),
  streak_days: require('../../assets/ui/quests/streak_days.png'),
  sacrifice_amber: require('../../assets/ui/quests/sacrifice_amber.png'),
  tend_amber: require('../../assets/ui/quests/tend_amber.png'),
  variant_wins: require('../../assets/ui/quests/variant_wins.png'),
};

/** Art for a quest type; a stored quest of an unknown type gets the basket. */
export function getQuestArt(type: QuestType): ImageSourcePropType {
  return QUEST_ART[type] ?? QUEST_ART.solve_count;
}
