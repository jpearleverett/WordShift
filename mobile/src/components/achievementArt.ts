import { ImageSourcePropType } from 'react-native';
import { ACHIEVEMENT_CATEGORY_ICONS, AchievementCategory } from '../services/achievements';

// Generated cottage crests for the achievements (scripts/tools/gameIcons/
// achievements*.mjs -> assets/ui/achievements/<id>.png), one painted subject per
// achievement. Before this, all 56 rows shared five category sprites, so the
// Stats list read as five icons repeated and the unlock toast could not show
// WHAT was earned. Keyed by achievement id, the same string StatsScreen and
// AchievementToast already hold at render time.
//
// Static `require()` literals only: Metro bundles what it can SEE, so a
// computed path ships an empty asset (the documented dynamic-require failure
// mode in this repo). `gameArt.test.ts` fails the moment an achievement is
// added without a crest, or a crest is mapped without a file on disk.
export const ACHIEVEMENT_ART: { [id: string]: ImageSourcePropType } = {
  first_puzzle: require('../../assets/ui/achievements/first_puzzle.png'),
  puzzle_10: require('../../assets/ui/achievements/puzzle_10.png'),
  puzzle_25: require('../../assets/ui/achievements/puzzle_25.png'),
  puzzle_35: require('../../assets/ui/achievements/puzzle_35.png'),
  puzzle_50: require('../../assets/ui/achievements/puzzle_50.png'),
  puzzle_100: require('../../assets/ui/achievements/puzzle_100.png'),
  puzzle_250: require('../../assets/ui/achievements/puzzle_250.png'),
  first_perfect: require('../../assets/ui/achievements/first_perfect.png'),
  perfect_10: require('../../assets/ui/achievements/perfect_10.png'),
  perfect_25: require('../../assets/ui/achievements/perfect_25.png'),
  all_difficulties: require('../../assets/ui/achievements/all_difficulties.png'),
  hard_10: require('../../assets/ui/achievements/hard_10.png'),
  no_hints_10: require('../../assets/ui/achievements/no_hints_10.png'),
  flawless_first: require('../../assets/ui/achievements/flawless_first.png'),
  flawless_25: require('../../assets/ui/achievements/flawless_25.png'),
  reverse_first: require('../../assets/ui/achievements/reverse_first.png'),
  reverse_15: require('../../assets/ui/achievements/reverse_15.png'),
  double_first: require('../../assets/ui/achievements/double_first.png'),
  double_15: require('../../assets/ui/achievements/double_15.png'),
  speed_first: require('../../assets/ui/achievements/speed_first.png'),
  speed_15: require('../../assets/ui/achievements/speed_15.png'),
  variant_explorer: require('../../assets/ui/achievements/variant_explorer.png'),
  blind_first: require('../../assets/ui/achievements/blind_first.png'),
  blind_10: require('../../assets/ui/achievements/blind_10.png'),
  expert_first: require('../../assets/ui/achievements/expert_first.png'),
  expert_25: require('../../assets/ui/achievements/expert_25.png'),
  lexicon_first: require('../../assets/ui/achievements/lexicon_first.png'),
  lexicon_25: require('../../assets/ui/achievements/lexicon_25.png'),
  max_stack: require('../../assets/ui/achievements/max_stack.png'),
  streak_3: require('../../assets/ui/achievements/streak_3.png'),
  streak_7: require('../../assets/ui/achievements/streak_7.png'),
  streak_14: require('../../assets/ui/achievements/streak_14.png'),
  streak_30: require('../../assets/ui/achievements/streak_30.png'),
  first_animal: require('../../assets/ui/achievements/first_animal.png'),
  animals_5: require('../../assets/ui/achievements/animals_5.png'),
  all_animals: require('../../assets/ui/achievements/all_animals.png'),
  all_rooms: require('../../assets/ui/achievements/all_rooms.png'),
  amber_1000: require('../../assets/ui/achievements/amber_1000.png'),
  phase_1: require('../../assets/ui/achievements/phase_1.png'),
  phase_2: require('../../assets/ui/achievements/phase_2.png'),
  phase_3: require('../../assets/ui/achievements/phase_3.png'),
  phase_4: require('../../assets/ui/achievements/phase_4.png'),
  daily_first: require('../../assets/ui/achievements/daily_first.png'),
  daily_7: require('../../assets/ui/achievements/daily_7.png'),
  shared_first: require('../../assets/ui/achievements/shared_first.png'),
  challenge_first: require('../../assets/ui/achievements/challenge_first.png'),
  challenge_10: require('../../assets/ui/achievements/challenge_10.png'),
  challenge_25: require('../../assets/ui/achievements/challenge_25.png'),
  streak_60: require('../../assets/ui/achievements/streak_60.png'),
  puzzle_500: require('../../assets/ui/achievements/puzzle_500.png'),
  puzzle_750: require('../../assets/ui/achievements/puzzle_750.png'),
  perfect_50: require('../../assets/ui/achievements/perfect_50.png'),
  challenge_50: require('../../assets/ui/achievements/challenge_50.png'),
  streak_100: require('../../assets/ui/achievements/streak_100.png'),
  daily_30: require('../../assets/ui/achievements/daily_30.png'),
  amber_5000: require('../../assets/ui/achievements/amber_5000.png'),
};

/** True when the achievement has its own crest (false = category fallback). */
export function hasAchievementArt(id: string): boolean {
  return id in ACHIEVEMENT_ART;
}

/**
 * The crest for an achievement, falling back to the shared category sprite so
 * a row can never render a hole. Never returns undefined.
 */
export function getAchievementArt(id: string, category: AchievementCategory): ImageSourcePropType {
  return ACHIEVEMENT_ART[id] ?? ACHIEVEMENT_CATEGORY_ICONS[category];
}
