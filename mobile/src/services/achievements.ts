import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty } from '../types';
import { CumulativeStats } from './starRating';

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
}

// ===== Achievement Definitions =====

export const ACHIEVEMENTS: Achievement[] = [
  // Puzzle achievements
  {
    id: 'first_puzzle',
    title: 'First Words',
    description: 'Complete your first puzzle',
    icon: '🎯',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 1,
  },
  {
    id: 'puzzle_10',
    title: 'Getting Started',
    description: 'Complete 10 puzzles',
    icon: '📝',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 10,
  },
  {
    id: 'puzzle_25',
    title: 'Word Enthusiast',
    description: 'Complete 25 puzzles',
    icon: '📖',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 25,
  },
  {
    id: 'puzzle_50',
    title: 'Puzzle Addict',
    description: 'Complete 50 puzzles',
    icon: '🧩',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 50,
  },
  {
    id: 'puzzle_100',
    title: 'Century Club',
    description: 'Complete 100 puzzles',
    icon: '💯',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 100,
  },
  {
    id: 'puzzle_250',
    title: 'Wordsmith',
    description: 'Complete 250 puzzles',
    icon: '🏛️',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 250,
  },

  // Mastery achievements
  {
    id: 'first_perfect',
    title: 'Flawless',
    description: 'Get 3 stars on a puzzle',
    icon: '⭐',
    category: 'mastery',
    check: (s) => s.stats.threeStarCount >= 1,
  },
  {
    id: 'perfect_10',
    title: 'Star Collector',
    description: 'Get 3 stars on 10 puzzles',
    icon: '🌟',
    category: 'mastery',
    check: (s) => s.stats.threeStarCount >= 10,
  },
  {
    id: 'perfect_25',
    title: 'Perfectionist',
    description: 'Get 3 stars on 25 puzzles',
    icon: '✨',
    category: 'mastery',
    check: (s) => s.stats.threeStarCount >= 25,
  },
  {
    id: 'all_difficulties',
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
    title: 'Fearless',
    description: 'Complete 10 hard puzzles',
    icon: '🔥',
    category: 'mastery',
    check: (s) => s.stats.byDifficulty.HARD.completed >= 10,
  },
  {
    id: 'no_hints_10',
    title: 'Independent Thinker',
    description: 'Complete 10 puzzles without using hints',
    icon: '🧠',
    category: 'mastery',
    check: (s) => (s.stats.noHintPuzzleCount || 0) >= 10,
  },

  // Streak achievements
  {
    id: 'streak_3',
    title: 'On a Roll',
    description: 'Maintain a 3-day play streak',
    icon: '🔥',
    category: 'streak',
    check: (s) => s.currentStreak >= 3,
  },
  {
    id: 'streak_7',
    title: 'Weekly Warrior',
    description: 'Maintain a 7-day play streak',
    icon: '📅',
    category: 'streak',
    check: (s) => s.currentStreak >= 7,
  },
  {
    id: 'streak_14',
    title: 'Fortnight Focus',
    description: 'Maintain a 14-day play streak',
    icon: '💪',
    category: 'streak',
    check: (s) => s.currentStreak >= 14,
  },
  {
    id: 'streak_30',
    title: 'Monthly Master',
    description: 'Maintain a 30-day play streak',
    icon: '🏆',
    category: 'streak',
    check: (s) => s.currentStreak >= 30,
  },

  // Collection achievements
  {
    id: 'first_animal',
    title: 'First Friend',
    description: 'Invite your first animal',
    icon: '🐾',
    category: 'collection',
    check: (s) => s.unlockedAnimals >= 1,
  },
  {
    id: 'animals_5',
    title: 'Growing Family',
    description: 'Invite 5 animals',
    icon: '🏠',
    category: 'collection',
    check: (s) => s.unlockedAnimals >= 5,
  },
  {
    id: 'all_animals',
    title: 'Full House',
    description: 'Invite all 10 animals',
    icon: '👑',
    category: 'collection',
    check: (s) => s.unlockedAnimals >= 10,
  },
  {
    id: 'all_rooms',
    title: 'Master Builder',
    description: 'Build all rooms',
    icon: '🏗️',
    category: 'collection',
    check: (s) => s.unlockedRooms >= 10,
  },
  {
    id: 'amber_1000',
    title: 'Amber Hoarder',
    description: 'Earn 1,000 total amber',
    icon: '💎',
    category: 'collection',
    check: (s) => s.amberEarned >= 1000,
  },

  // Journey achievements
  {
    id: 'phase_1',
    title: 'Curious Thoughts',
    description: 'Reach Phase 2 of the journey',
    icon: '💭',
    category: 'journey',
    check: (s) => s.currentPhase >= 1,
  },
  {
    id: 'phase_2',
    title: 'Deeper Questions',
    description: 'Reach Phase 3 of the journey',
    icon: '🌙',
    category: 'journey',
    check: (s) => s.currentPhase >= 2,
  },
  {
    id: 'phase_3',
    title: 'Growing Shadows',
    description: 'Reach Phase 4 of the journey',
    icon: '👁️',
    category: 'journey',
    check: (s) => s.currentPhase >= 3,
  },
  {
    id: 'phase_4',
    title: 'The Horizon',
    description: 'Reach the final phase',
    icon: '🌑',
    category: 'journey',
    check: (s) => s.currentPhase >= 4,
  },
  {
    id: 'daily_first',
    title: 'Daily Challenger',
    description: 'Complete your first daily challenge',
    icon: '📰',
    category: 'journey',
    check: (s) => s.dailyChallengesCompleted >= 1,
  },
  {
    id: 'daily_7',
    title: 'Daily Devotion',
    description: 'Complete 7 daily challenges',
    icon: '🗓️',
    category: 'journey',
    check: (s) => s.dailyChallengesCompleted >= 7,
  },
  {
    id: 'shared_first',
    title: 'Show Off',
    description: 'Share a puzzle result',
    icon: '📤',
    category: 'journey',
    check: (s) => s.shareCount >= 1,
  },

  // Challenge mode achievements
  {
    id: 'challenge_first',
    title: 'Challenger',
    description: 'Complete your first puzzle in Challenge Mode',
    icon: '🔒',
    category: 'mastery',
    check: (s) => s.challengeCompletions >= 1,
  },
  {
    id: 'challenge_10',
    title: 'Fearless Champion',
    description: 'Complete 10 puzzles in Challenge Mode',
    icon: '🛡️',
    category: 'mastery',
    check: (s) => s.challengeCompletions >= 10,
  },
  {
    id: 'challenge_25',
    title: 'Iron Will',
    description: 'Complete 25 puzzles in Challenge Mode',
    icon: '⚔️',
    category: 'mastery',
    check: (s) => s.challengeCompletions >= 25,
  },

  // Extended streak achievements
  {
    id: 'streak_60',
    title: 'Unbreakable',
    description: 'Maintain a 60-day play streak',
    icon: '💫',
    category: 'streak',
    check: (s) => s.currentStreak >= 60,
  },

  // Extended puzzle count
  {
    id: 'puzzle_500',
    title: 'Word Legend',
    description: 'Complete 500 puzzles',
    icon: '🌟',
    category: 'puzzle',
    check: (s) => s.stats.totalPuzzlesCompleted >= 500,
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
  } catch {}
}
