import AsyncStorage from '@react-native-async-storage/async-storage';
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
}

export type AchievementCategory = 'puzzle' | 'mastery' | 'streak' | 'collection' | 'journey';

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
    check: (s) => (s.variantWins?.speed || 0) >= 1,
  },
  {
    id: 'speed_15',
    rewardAmber: 40,
    title: 'Quicksilver',
    description: 'Win 15 Speed Shift runs',
    icon: '⚡',
    category: 'mastery',
    check: (s) => (s.variantWins?.speed || 0) >= 15,
  },
  {
    id: 'variant_explorer',
    rewardAmber: 50,
    title: 'Every Path',
    description: 'Win at least one Reverse, Double, and Speed puzzle',
    icon: '🧭',
    category: 'mastery',
    check: (s) =>
      (s.variantWins?.reverse || 0) >= 1 &&
      (s.variantWins?.double_shift || 0) >= 1 &&
      (s.variantWins?.speed || 0) >= 1,
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
