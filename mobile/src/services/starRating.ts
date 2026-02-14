import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty } from '../types';

const STORAGE_KEY = 'wordshift_star_stats';

/**
 * Stats for a single puzzle attempt
 */
export interface PuzzleAttemptStats {
  difficulty: Difficulty;
  starsEarned: number;
  invalidAttempts: number;
  hintsUsed: number;
  timestamp: number;
}

/**
 * Cumulative stats across all sessions
 */
export interface CumulativeStats {
  totalPuzzlesCompleted: number;
  totalStars: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
  totalInvalidAttempts: number;
  totalHintsUsed: number;
  /** Number of puzzles completed without using any hints */
  noHintPuzzleCount: number;
  // Per-difficulty breakdowns
  byDifficulty: {
    [K in Difficulty]: {
      completed: number;
      stars: number;
    };
  };
  lastUpdated: number;
}

// In-memory cache
let statsCache: CumulativeStats | null = null;

/**
 * Calculate star rating based on hints used and invalid attempts
 *
 * 3 stars: 0 hints, 0-2 invalid attempts (generous — reward exploration)
 * 2 stars: 1 hint OR 3-4 invalid attempts
 * 1 star: 2+ hints OR 5+ invalid attempts
 */
export function calculateStars(hintsUsed: number, invalidAttempts: number): number {
  // 2+ hints = 1 star max
  if (hintsUsed >= 2) {
    return 1;
  }

  // 5+ invalid attempts = 1 star max
  if (invalidAttempts >= 5) {
    return 1;
  }

  // 1 hint OR 3-4 invalid attempts = 2 stars max
  if (hintsUsed === 1 || invalidAttempts >= 3) {
    return 2;
  }

  // 0 hints, 0-2 invalid attempts = 3 stars
  return 3;
}

/**
 * Get default empty stats
 */
function getDefaultStats(): CumulativeStats {
  return {
    totalPuzzlesCompleted: 0,
    totalStars: 0,
    threeStarCount: 0,
    twoStarCount: 0,
    oneStarCount: 0,
    totalInvalidAttempts: 0,
    totalHintsUsed: 0,
    noHintPuzzleCount: 0,
    byDifficulty: {
      EASY: { completed: 0, stars: 0 },
      MEDIUM: { completed: 0, stars: 0 },
      MEDIUM_PLUS: { completed: 0, stars: 0 },
      HARD: { completed: 0, stars: 0 },
    },
    lastUpdated: Date.now(),
  };
}

/**
 * Load cumulative stats from AsyncStorage
 */
export async function loadStats(): Promise<CumulativeStats> {
  try {
    if (statsCache) {
      return statsCache;
    }

    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Backward compat: add noHintPuzzleCount if missing from old data
      if (parsed.noHintPuzzleCount === undefined) {
        parsed.noHintPuzzleCount = 0;
      }
      // Backward compat: add MEDIUM_PLUS if missing from old data
      if (parsed.byDifficulty && !parsed.byDifficulty.MEDIUM_PLUS) {
        parsed.byDifficulty.MEDIUM_PLUS = { completed: 0, stars: 0 };
      }
      statsCache = parsed;
      return statsCache!;
    }
  } catch (error) {
    console.warn('Failed to load star stats:', error);
  }

  statsCache = getDefaultStats();
  return statsCache;
}

/**
 * Record stats from a completed puzzle
 */
export async function recordPuzzleCompletion(
  difficulty: Difficulty,
  hintsUsed: number,
  invalidAttempts: number
): Promise<PuzzleAttemptStats> {
  try {
    if (!statsCache) {
      await loadStats();
    }

    const starsEarned = calculateStars(hintsUsed, invalidAttempts);

    // Update cumulative stats
    statsCache!.totalPuzzlesCompleted += 1;
    statsCache!.totalStars += starsEarned;
    statsCache!.totalInvalidAttempts += invalidAttempts;
    statsCache!.totalHintsUsed += hintsUsed;
    if (hintsUsed === 0) {
      statsCache!.noHintPuzzleCount = (statsCache!.noHintPuzzleCount || 0) + 1;
    }

    // Update star count breakdown
    if (starsEarned === 3) {
      statsCache!.threeStarCount += 1;
    } else if (starsEarned === 2) {
      statsCache!.twoStarCount += 1;
    } else {
      statsCache!.oneStarCount += 1;
    }

    // Update per-difficulty stats
    statsCache!.byDifficulty[difficulty].completed += 1;
    statsCache!.byDifficulty[difficulty].stars += starsEarned;

    statsCache!.lastUpdated = Date.now();

    // Persist
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(statsCache));

    return {
      difficulty,
      starsEarned,
      invalidAttempts,
      hintsUsed,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.warn('Failed to record puzzle completion:', error);
    // Return the stats anyway even if persistence failed
    return {
      difficulty,
      starsEarned: calculateStars(hintsUsed, invalidAttempts),
      invalidAttempts,
      hintsUsed,
      timestamp: Date.now(),
    };
  }
}

/**
 * Get cumulative stats (loads from storage if needed)
 */
export async function getCumulativeStats(): Promise<CumulativeStats> {
  return loadStats();
}

/**
 * Get average stars per puzzle
 */
export function getAverageStars(stats: CumulativeStats): number {
  if (stats.totalPuzzlesCompleted === 0) return 0;
  return stats.totalStars / stats.totalPuzzlesCompleted;
}

/**
 * Get three-star rate as percentage
 */
export function getThreeStarRate(stats: CumulativeStats): number {
  if (stats.totalPuzzlesCompleted === 0) return 0;
  return (stats.threeStarCount / stats.totalPuzzlesCompleted) * 100;
}

/**
 * Clear all stats (for testing/reset)
 */
export async function clearStats(): Promise<void> {
  try {
    statsCache = getDefaultStats();
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear star stats:', error);
  }
}
