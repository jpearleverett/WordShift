import { ImageSourcePropType } from 'react-native';
import type { Difficulty } from '../../types';

// Generated cottage art for the difficulty tiers and the How-to-Play steps
// (scripts/tools/gameIcons/difficultyRules.mjs -> assets/ui/difficulty/,
// assets/ui/rules/).
//
// The tier emblems are ONE vessel (a wax seal on a ribbon) in the tier colour,
// each embossed with a different symbol (sprout, leaf, flame, sword, crown), so
// the setup menu and the Stats breakdown tell the tiers apart by silhouette and
// not by a 12dp coloured ring alone. The rules steps are teaching diagrams built
// from the game's own candy tile, one action each, indexed by step position.
//
// Static `require()` literals only (Metro bundles what it can SEE).
export const DIFFICULTY_ART: Record<Difficulty, ImageSourcePropType> = {
  EASY: require('../../../assets/ui/difficulty/easy.png'),
  MEDIUM: require('../../../assets/ui/difficulty/medium.png'),
  MEDIUM_PLUS: require('../../../assets/ui/difficulty/medium_plus.png'),
  HARD: require('../../../assets/ui/difficulty/hard.png'),
  EXPERT: require('../../../assets/ui/difficulty/expert.png'),
};

/** One illustration per How-to-Play step, in step order. */
export const RULES_STEP_ART: ImageSourcePropType[] = [
  require('../../../assets/ui/rules/step_1.png'),
  require('../../../assets/ui/rules/step_2.png'),
  require('../../../assets/ui/rules/step_3.png'),
  require('../../../assets/ui/rules/step_4.png'),
];

/** The illustration for a rules step index, or null past the drawn set. */
export function getRulesStepArt(index: number): ImageSourcePropType | null {
  return RULES_STEP_ART[index] ?? null;
}
