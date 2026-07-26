import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageSourcePropType } from 'react-native';
import { Difficulty } from '../types';
import { CumulativeStats } from './starRating';
import { ANIMALS, ROOMS } from './homeWorldData';

const STORAGE_KEY = 'wordshift_achievements';

/**
 * Achievement definition
 */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  /** One-time amber credited when the achievement unlocks */
  rewardAmber: number;
  /** Check function returns true if unlocked based on current state */
  check: (state: AchievementCheckState) => boolean;
  /**
   * Progress toward a countable achievement (puzzle counts, stars, streaks,
   * variant wins...). Present only on the ~35 countable ones; one-shot
   * achievements leave it undefined. `current` is clamped to `target`. Attached
   * from ACHIEVEMENT_PROGRESS below so the definitions stay declarative.
   */
  progress?: (state: AchievementCheckState) => { current: number; target: number };
}

export type AchievementCategory = 'puzzle' | 'mastery' | 'streak' | 'collection' | 'journey';

/**
 * Category -> generated candy sprite (assets/ui). The per-achievement `icon`
 * emoji stays in the data as a semantic key (the modeIcons precedent); the
 * chrome renders one shared sprite per category in the StatsScreen row + the
 * AchievementToast alcove. flame/star_filled ship two categories on day one.
 */
export const ACHIEVEMENT_CATEGORY_ICONS: Record<AchievementCategory, ImageSourcePropType> = {
  puzzle: require('../../assets/ui/quest.png'),
  mastery: require('../../assets/ui/star_filled.png'),
  streak: require('../../assets/ui/flame.png'),
  collection: require('../../assets/ui/home.png'),
  journey: require('../../assets/ui/moon.png'),
};

/** Locked-row icon sprite (replaces the raw 🔒 emoji). */
export const ACHIEVEMENT_LOCK_ICON: ImageSourcePropType = require('../../assets/ui/lock.png');

/**
 * Achievement progress (persisted)
 */
export interface AchievementProgress {
  unlockedIds: string[];
  /** Timestamp of each unlock */
  unlockDates: Record<string, number>;
  /** Last time we checked for new achievements */
  lastChecked: number;
}

/**
 * State passed to achievement check functions
 */
export interface AchievementCheckState {
  stats: CumulativeStats;
  puzzlesSolved: number;
  currentPhase: number;
  currentStreak: number;
  unlockedAnimals: number;
  unlockedRooms: number;
  amberEarned: number;
  dailyChallengesCompleted: number;
  shareCount: number;
  challengeCompletions: number;
  /** Lifetime wins per non-standard variant key (reverse/double_shift/speed). */
  variantWins: Record<string, number>;
  /** Lifetime Blind Offering wins. */
  blindWins: number;
  /** Lifetime Lexicon (rare-word) wins. */
  lexiconWins: number;
  /** Lifetime Speed Shift wins. Reads through getVariantWinStats, which folds
   *  the legacy variantWins.speed counter in, so progress earned while speed
   *  was a STYLE still counts. */
  speedWins: number;
  /** Lifetime maximal-stack apex wins (EXPERT + a non-standard style + all four
   *  modifiers: Challenge, Speed, Blind, Lexicon). */
  maxStackWins: number;
}

// ===== Achievement Definitions =====

export const ACHIEVEMENTS: Achievement[] = [
  // Puzzle achievements
  {
    id: 'first_puzzle',
    rewardAmber: 10,
    title: 'First Words',
    description: 'Complete your first puzzle',
    icon: '🎯',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 1,
  },
  {
    id: 'puzzle_10',
    rewardAmber: 15,
    title: 'Getting Started',
    description: 'Complete 10 puzzles',
    icon: '📝',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 10,
  },
  {
    id: 'puzzle_25',
    rewardAmber: 20,
    title: 'Word Enthusiast',
    description: 'Complete 25 puzzles',
    icon: '📖',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 25,
  },
  {
    id: 'puzzle_35',
    rewardAmber: 20,
    title: 'Pattern Seeker',
    description: 'Complete 35 puzzles',
    icon: '🔍',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 35,
  },
  {
    id: 'puzzle_50',
    rewardAmber: 25,
    title: 'Puzzle Addict',
    description: 'Complete 50 puzzles',
    icon: '🧩',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 50,
  },
  {
    id: 'puzzle_100',
    rewardAmber: 40,
    title: 'Century Club',
    description: 'Complete 100 puzzles',
    icon: '💯',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 100,
  },
  {
    id: 'puzzle_250',
    rewardAmber: 60,
    title: 'Wordsmith',
    description: 'Complete 250 puzzles',
    icon: '🏛️',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 250,
  },

  // Mastery achievements
  {
    id: 'first_perfect',
    rewardAmber: 10,
    title: 'Flawless',
    description: 'Get 3 stars on a puzzle',
    icon: '⭐',
    category: 'mastery',
    check: (s) => s.stats.threeStarCount >= 1,
  },
  {
    id: 'perfect_10',
    rewardAmber: 25,
    title: 'Star Collector',
    description: 'Get 3 stars on 10 puzzles',
    icon: '🌟',
    category: 'mastery',
    check: (s) => s.stats.threeStarCount >= 10,
  },
  {
    id: 'perfect_25',
    rewardAmber: 40,
    title: 'Perfectionist',
    description: 'Get 3 stars on 25 puzzles',
    icon: '✨',
    category: 'mastery',
    check: (s) => s.stats.threeStarCount >= 25,
  },
  {
    id: 'all_difficulties',
    rewardAmber: 25,
    title: 'Well-Rounded',
    description: 'Complete a puzzle on every difficulty',
    icon: '🎨',
    category: 'mastery',
    check: (s) =>
      s.stats.byDifficulty.EASY.completed > 0 &&
      s.stats.byDifficulty.MEDIUM.completed > 0 &&
      (s.stats.byDifficulty.MEDIUM_PLUS?.completed || 0) > 0 &&
      s.stats.byDifficulty.HARD.completed > 0,
  },
  {
    id: 'hard_10',
    rewardAmber: 25,
    title: 'Fearless',
    description: 'Complete 10 hard puzzles',
    icon: '🔥',
    category: 'mastery',
    check: (s) => s.stats.byDifficulty.HARD.completed >= 10,
  },
  {
    id: 'no_hints_10',
    rewardAmber: 25,
    title: 'Independent Thinker',
    description: 'Complete 10 puzzles without using hints',
    icon: '🧠',
    category: 'mastery',
    check: (s) => (s.stats.noHintPuzzleCount || 0) >= 10,
  },
  // Flawless offerings — the perfect-play tier above 3 stars (0 hints/invalids/undos)
  {
    id: 'flawless_first',
    rewardAmber: 20,
    title: 'Flawless',
    description: 'Solve a puzzle with no hints, no mistakes, and no undos',
    icon: '💠',
    category: 'mastery',
    check: (s) => (s.stats.flawlessCount || 0) >= 1,
  },
  {
    id: 'flawless_25',
    rewardAmber: 60,
    title: 'Unerring',
    description: 'Complete 25 flawless offerings',
    icon: '🏵️',
    category: 'mastery',
    check: (s) => (s.stats.flawlessCount || 0) >= 25,
  },
  // Variant achievements — the 32 difficulty x variant configs were invisible content
  {
    id: 'reverse_first',
    rewardAmber: 20,
    title: 'There and Back',
    description: 'Solve a Reverse Shift puzzle',
    icon: '🔁',
    category: 'mastery',
    check: (s) => (s.variantWins?.reverse || 0) >= 1,
  },
  {
    id: 'reverse_15',
    rewardAmber: 40,
    title: 'The Long Way Home',
    description: 'Solve 15 Reverse Shift puzzles',
    icon: '↩️',
    category: 'mastery',
    check: (s) => (s.variantWins?.reverse || 0) >= 15,
  },
  {
    id: 'double_first',
    rewardAmber: 20,
    title: 'Two at Once',
    description: 'Solve a Double Shift puzzle',
    icon: '⧉',
    category: 'mastery',
    check: (s) => (s.variantWins?.double_shift || 0) >= 1,
  },
  {
    id: 'double_15',
    rewardAmber: 40,
    title: 'Both Hands',
    description: 'Solve 15 Double Shift puzzles',
    icon: '🖐️',
    category: 'mastery',
    check: (s) => (s.variantWins?.double_shift || 0) >= 15,
  },
  {
    id: 'speed_first',
    rewardAmber: 20,
    title: 'Against the Clock',
    description: 'Win a Speed Shift run',
    icon: '⏱️',
    category: 'mastery',
    check: (s) => (s.speedWins || 0) >= 1,
  },
  {
    id: 'speed_15',
    rewardAmber: 40,
    title: 'Quicksilver',
    description: 'Win 15 Speed Shift runs',
    icon: '⚡',
    category: 'mastery',
    check: (s) => (s.speedWins || 0) >= 15,
  },
  {
    id: 'variant_explorer',
    rewardAmber: 50,
    title: 'Every Path',
    description: 'Win a Reverse and a Double Shift board, and one against the clock',
    icon: '🧭',
    category: 'mastery',
    check: (s) =>
      (s.variantWins?.reverse || 0) >= 1 &&
      (s.variantWins?.double_shift || 0) >= 1 &&
      (s.speedWins || 0) >= 1,
  },
  // Blind Offering — the opt-in previews-hidden modifier
  {
    id: 'blind_first',
    rewardAmber: 30,
    title: 'Eyes Closed',
    description: 'Solve a puzzle with the Blind Offering on',
    icon: '🌑',
    category: 'mastery',
    check: (s) => (s.blindWins || 0) >= 1,
  },
  {
    id: 'blind_10',
    rewardAmber: 60,
    title: 'Trust the Words',
    description: 'Solve 10 puzzles with the Blind Offering on',
    icon: '👁️',
    category: 'mastery',
    check: (s) => (s.blindWins || 0) >= 10,
  },
  // EXPERT — the 6-letter apex difficulty
  {
    id: 'expert_first',
    rewardAmber: 40,
    title: 'Six-Letter Summit',
    description: 'Solve an EXPERT puzzle',
    icon: '⛰️',
    category: 'mastery',
    check: (s) => (s.stats.byDifficulty.EXPERT?.completed || 0) >= 1,
  },
  {
    id: 'expert_25',
    rewardAmber: 90,
    title: 'Apex Solver',
    description: 'Solve 25 EXPERT puzzles',
    icon: '🏔️',
    category: 'mastery',
    check: (s) => (s.stats.byDifficulty.EXPERT?.completed || 0) >= 25,
  },
  // Lexicon — the rare-word composable mode
  {
    id: 'lexicon_first',
    rewardAmber: 40,
    title: 'Older Pages',
    description: 'Solve a puzzle in Lexicon mode',
    icon: '📖',
    category: 'mastery',
    check: (s) => (s.lexiconWins || 0) >= 1,
  },
  {
    id: 'lexicon_25',
    rewardAmber: 90,
    title: 'Word Hoard',
    description: 'Solve 25 puzzles in Lexicon mode',
    icon: '📜',
    category: 'mastery',
    check: (s) => (s.lexiconWins || 0) >= 25,
  },
  // The maximal stack — every trial layered onto one apex board at once
  {
    id: 'max_stack',
    rewardAmber: 150,
    title: 'The Full Arrangement',
    description: 'Win one Expert board with a style and all four modifiers at once: Challenge, Speed, Blind and Lexicon',
    icon: '🌌',
    category: 'mastery',
    check: (s) => (s.maxStackWins || 0) >= 1,
  },

  // Streak achievements
  {
    id: 'streak_3',
    rewardAmber: 15,
    title: 'On a Roll',
    description: 'Maintain a 3-day play streak',
    icon: '🔥',
    category: 'streak',
    check: (s) => s.currentStreak >= 3,
  },
  {
    id: 'streak_7',
    rewardAmber: 25,
    title: 'Weekly Warrior',
    description: 'Maintain a 7-day play streak',
    icon: '📅',
    category: 'streak',
    check: (s) => s.currentStreak >= 7,
  },
  {
    id: 'streak_14',
    rewardAmber: 40,
    title: 'Fortnight Focus',
    description: 'Maintain a 14-day play streak',
    icon: '💪',
    category: 'streak',
    check: (s) => s.currentStreak >= 14,
  },
  {
    id: 'streak_30',
    rewardAmber: 60,
    title: 'Monthly Master',
    description: 'Maintain a 30-day play streak',
    icon: '🏆',
    category: 'streak',
    check: (s) => s.currentStreak >= 30,
  },

  // Collection achievements
  {
    id: 'first_animal',
    rewardAmber: 10,
    title: 'First Friend',
    description: 'Invite your first animal',
    icon: '🐾',
    category: 'collection',
    check: (s) => s.unlockedAnimals >= 1,
  },
  {
    id: 'animals_5',
    rewardAmber: 25,
    title: 'Growing Family',
    description: 'Invite 5 animals',
    icon: '🏠',
    category: 'collection',
    check: (s) => s.unlockedAnimals >= 5,
  },
  {
    id: 'all_animals',
    rewardAmber: 75,
    title: 'Full House',
    description: 'Invite every animal',
    icon: '👑',
    category: 'collection',
    check: (s) => s.unlockedAnimals >= ANIMALS.length,
  },
  {
    id: 'all_rooms',
    rewardAmber: 75,
    title: 'Master Builder',
    description: 'Build all rooms',
    icon: '🏗️',
    category: 'collection',
    check: (s) => s.unlockedRooms >= ROOMS.length,
  },
  {
    id: 'amber_1000',
    rewardAmber: 50,
    title: 'Amber Hoarder',
    description: 'Earn 1,000 total amber',
    icon: '🔶',
    category: 'collection',
    check: (s) => s.amberEarned >= 1000,
  },

  // Journey achievements
  {
    id: 'phase_1',
    rewardAmber: 20,
    title: 'Curious Thoughts',
    description: 'Feel the journey begin to change',
    icon: '💭',
    category: 'journey',
    check: (s) => s.currentPhase >= 1,
  },
  {
    id: 'phase_2',
    rewardAmber: 25,
    title: 'Deeper Questions',
    description: 'Follow the journey into deeper questions',
    icon: '🌙',
    category: 'journey',
    check: (s) => s.currentPhase >= 2,
  },
  {
    id: 'phase_3',
    rewardAmber: 30,
    title: 'Growing Shadows',
    description: 'Continue until the shadows gather',
    icon: '👁️',
    category: 'journey',
    check: (s) => s.currentPhase >= 3,
  },
  {
    id: 'phase_4',
    rewardAmber: 50,
    title: 'The Horizon',
    description: 'Stand at the horizon of the journey',
    icon: '🌑',
    category: 'journey',
    check: (s) => s.currentPhase >= 4,
  },
  {
    id: 'daily_first',
    rewardAmber: 15,
    title: 'Daily Challenger',
    description: 'Complete your first daily challenge',
    icon: '📰',
    category: 'journey',
    check: (s) => s.dailyChallengesCompleted >= 1,
  },
  {
    id: 'daily_7',
    rewardAmber: 30,
    title: 'Daily Devotion',
    description: 'Complete 7 daily challenges',
    icon: '🗓️',
    category: 'journey',
    check: (s) => s.dailyChallengesCompleted >= 7,
  },
  {
    id: 'shared_first',
    rewardAmber: 10,
    title: 'Show Off',
    description: 'Share a puzzle result',
    icon: '📤',
    category: 'journey',
    check: (s) => s.shareCount >= 1,
  },

  // Challenge mode achievements
  {
    id: 'challenge_first',
    rewardAmber: 15,
    title: 'Challenger',
    description: 'Complete your first puzzle in Challenge Mode',
    icon: '🔒',
    category: 'mastery',
    check: (s) => s.challengeCompletions >= 1,
  },
  {
    id: 'challenge_10',
    rewardAmber: 30,
    title: 'Fearless Champion',
    description: 'Complete 10 puzzles in Challenge Mode',
    icon: '🛡️',
    category: 'mastery',
    check: (s) => s.challengeCompletions >= 10,
  },
  {
    id: 'challenge_25',
    rewardAmber: 50,
    title: 'Iron Will',
    description: 'Complete 25 puzzles in Challenge Mode',
    icon: '⚔️',
    category: 'mastery',
    check: (s) => s.challengeCompletions >= 25,
  },

  // Extended streak achievements
  {
    id: 'streak_60',
    rewardAmber: 100,
    title: 'Unbreakable',
    description: 'Maintain a 60-day play streak',
    icon: '💫',
    category: 'streak',
    check: (s) => s.currentStreak >= 60,
  },

  // Extended puzzle count
  {
    id: 'puzzle_500',
    rewardAmber: 100,
    title: 'Word Legend',
    description: 'Complete 500 puzzles',
    icon: '🌟',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 500,
  },

  // ===== Long-tail / endgame achievements =====
  // These exist so a dedicated player who clears the rest by ~month 2-3 still has
  // an unlock or two on the horizon. All read existing check-state fields.
  {
    id: 'puzzle_750',
    rewardAmber: 125,
    title: 'Keeper of Words',
    description: 'Complete 750 puzzles',
    icon: '📜',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 750,
  },
  {
    id: 'perfect_50',
    rewardAmber: 60,
    title: 'Constellation',
    description: 'Get 3 stars on 50 puzzles',
    icon: '🌌',
    category: 'mastery',
    check: (s) => s.stats.threeStarCount >= 50,
  },
  {
    id: 'challenge_50',
    rewardAmber: 75,
    title: 'Unyielding',
    description: 'Complete 50 puzzles in Challenge Mode',
    icon: '🗡️',
    category: 'mastery',
    check: (s) => s.challengeCompletions >= 50,
  },
  {
    id: 'streak_100',
    rewardAmber: 150,
    title: 'Eternal',
    description: 'Maintain a 100-day play streak',
    icon: '♾️',
    category: 'streak',
    check: (s) => s.currentStreak >= 100,
  },
  {
    id: 'daily_30',
    rewardAmber: 60,
    title: 'Faithful Visitor',
    description: 'Complete 30 daily challenges',
    icon: '📆',
    category: 'journey',
    check: (s) => s.dailyChallengesCompleted >= 30,
  },
  {
    id: 'amber_5000',
    rewardAmber: 100,
    title: 'Amber Keeper',
    description: 'Earn 5,000 total amber',
    icon: '🔶',
    category: 'collection',
    check: (s) => s.amberEarned >= 5000,
  },
];

/**
 * Countable-achievement progress specs (id -> current-value getter + target).
 * Attached to the matching Achievement's `progress` below so the definitions
 * stay declarative and the StatsScreen can draw a "{current}/{target}" track on
 * locked rows. One-shot achievements (first_puzzle, phase_*, share...) are
 * intentionally absent — they have no meaningful partial state.
 */
type ProgressSpec = { current: (s: AchievementCheckState) => number; target: number };
const ACHIEVEMENT_PROGRESS: Record<string, ProgressSpec> = {
  // Puzzle counts
  puzzle_10: { current: (s) => s.stats.totalPuzzlesCompleted, target: 10 },
  puzzle_25: { current: (s) => s.stats.totalPuzzlesCompleted, target: 25 },
  puzzle_35: { current: (s) => s.stats.totalPuzzlesCompleted, target: 35 },
  puzzle_50: { current: (s) => s.stats.totalPuzzlesCompleted, target: 50 },
  puzzle_100: { current: (s) => s.stats.totalPuzzlesCompleted, target: 100 },
  puzzle_250: { current: (s) => s.stats.totalPuzzlesCompleted, target: 250 },
  puzzle_500: { current: (s) => s.stats.totalPuzzlesCompleted, target: 500 },
  puzzle_750: { current: (s) => s.stats.totalPuzzlesCompleted, target: 750 },
  // Mastery — stars, hard runs, no-hints, flawless, variant/blind wins
  perfect_10: { current: (s) => s.stats.threeStarCount, target: 10 },
  perfect_25: { current: (s) => s.stats.threeStarCount, target: 25 },
  perfect_50: { current: (s) => s.stats.threeStarCount, target: 50 },
  hard_10: { current: (s) => s.stats.byDifficulty.HARD.completed, target: 10 },
  no_hints_10: { current: (s) => s.stats.noHintPuzzleCount || 0, target: 10 },
  flawless_25: { current: (s) => s.stats.flawlessCount || 0, target: 25 },
  reverse_15: { current: (s) => s.variantWins?.reverse || 0, target: 15 },
  double_15: { current: (s) => s.variantWins?.double_shift || 0, target: 15 },
  speed_15: { current: (s) => s.speedWins || 0, target: 15 },
  blind_10: { current: (s) => s.blindWins || 0, target: 10 },
  challenge_10: { current: (s) => s.challengeCompletions, target: 10 },
  challenge_25: { current: (s) => s.challengeCompletions, target: 25 },
  challenge_50: { current: (s) => s.challengeCompletions, target: 50 },
  // Streaks
  streak_3: { current: (s) => s.currentStreak, target: 3 },
  streak_7: { current: (s) => s.currentStreak, target: 7 },
  streak_14: { current: (s) => s.currentStreak, target: 14 },
  streak_30: { current: (s) => s.currentStreak, target: 30 },
  streak_60: { current: (s) => s.currentStreak, target: 60 },
  streak_100: { current: (s) => s.currentStreak, target: 100 },
  // Collection
  animals_5: { current: (s) => s.unlockedAnimals, target: 5 },
  all_animals: { current: (s) => s.unlockedAnimals, target: ANIMALS.length },
  all_rooms: { current: (s) => s.unlockedRooms, target: ROOMS.length },
  amber_1000: { current: (s) => s.amberEarned, target: 1000 },
  amber_5000: { current: (s) => s.amberEarned, target: 5000 },
  // Journey — daily completions
  daily_7: { current: (s) => s.dailyChallengesCompleted, target: 7 },
  daily_30: { current: (s) => s.dailyChallengesCompleted, target: 30 },
};

for (const a of ACHIEVEMENTS) {
  const spec = ACHIEVEMENT_PROGRESS[a.id];
  if (spec) {
    a.progress = (s) => ({ current: Math.min(spec.current(s), spec.target), target: spec.target });
  }
}

// In-memory cache
let progressCache: AchievementProgress | null = null;

function getDefaultProgress(): AchievementProgress {
  return {
    unlockedIds: [],
    unlockDates: {},
    lastChecked: 0,
  };
}

/**
 * Load achievement progress
 */
export async function loadAchievements(): Promise<AchievementProgress> {
  if (progressCache) return progressCache;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      progressCache = JSON.parse(stored);
      return progressCache!;
    }
  } catch (err) {
    console.warn('Failed to load achievements:', err);
  }

  progressCache = getDefaultProgress();
  return progressCache;
}

/**
 * Check for newly earned achievements
 * Returns array of newly unlocked achievements (empty if none)
 */
export async function checkAchievements(
  state: AchievementCheckState
): Promise<Achievement[]> {
  const progress = await loadAchievements();
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    // Skip already unlocked
    if (progress.unlockedIds.includes(achievement.id)) continue;

    // Check if newly earned
    if (achievement.check(state)) {
      newlyUnlocked.push(achievement);
      progress.unlockedIds.push(achievement.id);
      progress.unlockDates[achievement.id] = Date.now();
    }
  }

  if (newlyUnlocked.length > 0) {
    progress.lastChecked = Date.now();
    progressCache = progress;
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (err) {
      console.warn('Failed to save achievements:', err);
    }

    // Credit one-time amber rewards (never blocks the unlock itself)
    const totalReward = newlyUnlocked.reduce((sum, a) => sum + a.rewardAmber, 0);
    if (totalReward > 0) {
      try {
        const { awardBonusAmber } = require('./amberCurrency');
        await awardBonusAmber(totalReward, 'achievement');
      } catch (err) {
        console.warn('Failed to credit achievement amber:', err);
      }
    }
  }

  return newlyUnlocked;
}

/**
 * Get all achievements with their unlock status
 */
export async function getAchievementsWithStatus(): Promise<
  (Achievement & { isUnlocked: boolean; unlockedAt: number | null })[]
> {
  const progress = await loadAchievements();

  return ACHIEVEMENTS.map((a) => ({
    ...a,
    isUnlocked: progress.unlockedIds.includes(a.id),
    unlockedAt: progress.unlockDates[a.id] || null,
  }));
}

/**
 * Build the full AchievementCheckState from the live services (stats, progress,
 * variant/blind wins, daily completions, share count). Used by surfaces that
 * want to draw progress-toward on locked, countable achievements (StatsScreen).
 *
 * Services are lazy-required so importing achievements.ts never pulls the
 * economy graph in at module load (the same cycle-avoidance the amber credit in
 * checkAchievements uses). This mirrors the state useAchievementQueue assembles
 * on a victory, but reads the current stored stats directly.
 */
export async function buildAchievementCheckState(): Promise<AchievementCheckState> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getCumulativeStats } = require('./starRating');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getFullProgress, getVariantWinStats } = require('./amberCurrency');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getDailyStatus } = require('./dailyChallenge');

  const [stats, progress, variantStats, daily, shareCount] = await Promise.all([
    getCumulativeStats(),
    getFullProgress(),
    getVariantWinStats(),
    getDailyStatus(),
    getShareCount(),
  ]);

  return {
    stats,
    puzzlesSolved: progress.puzzlesSolved,
    currentPhase: progress.currentPhase,
    currentStreak: progress.currentStreak ?? 0,
    unlockedAnimals: (progress.unlockedAnimals ?? []).length,
    unlockedRooms: (progress.unlockedRooms ?? []).length,
    amberEarned: progress.totalAmberEarned,
    dailyChallengesCompleted: daily.totalCompleted,
    shareCount,
    challengeCompletions: progress.challengeCompletions || 0,
    variantWins: variantStats.variantWins,
    blindWins: variantStats.blindWins,
    lexiconWins: variantStats.lexiconWins,
    speedWins: variantStats.speedWins,
    maxStackWins: variantStats.maxStackWins,
  };
}

/**
 * Get count of unlocked achievements
 */
export async function getUnlockedCount(): Promise<number> {
  const progress = await loadAchievements();
  return progress.unlockedIds.length;
}

/**
 * Get all unlocked achievement IDs
 */
export async function getUnlockedAchievementIds(): Promise<string[]> {
  const progress = await loadAchievements();
  return [...progress.unlockedIds];
}

/**
 * Get total achievement count
 */
export function getTotalCount(): number {
  return ACHIEVEMENTS.length;
}

/**
 * Increment share count (stored separately for achievement tracking)
 */
export async function incrementShareCount(): Promise<number> {
  const key = 'wordshift_share_count';
  try {
    const stored = await AsyncStorage.getItem(key);
    const count = (stored ? parseInt(stored, 10) : 0) + 1;
    await AsyncStorage.setItem(key, count.toString());
    return count;
  } catch {
    return 1;
  }
}

/**
 * Get share count
 */
export async function getShareCount(): Promise<number> {
  const key = 'wordshift_share_count';
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Clear all achievement data (for testing)
 */
export async function clearAchievements(): Promise<void> {
  progressCache = getDefaultProgress();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem('wordshift_share_count');
    await AsyncStorage.removeItem('wordshift_share_bonus_date');
  } catch {}
}
