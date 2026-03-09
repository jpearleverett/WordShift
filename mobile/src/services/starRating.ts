import { storage } from './storage';
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
/** Personal best record for a specific difficulty level. */
export interface PersonalBest {
  fewestHints: number;
  fewestInvalidAttempts: number;
}

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
  /** Personal best records per difficulty (fewest hints, fewest invalid attempts) */
  personalBests?: {
    [K in Difficulty]?: PersonalBest;
  };
  lastUpdated: number;
}

/**
 * Calculate star rating based on hints used and invalid attempts
 *
 * 3 stars: 0 hints, 0-1 invalid attempts (tightened for better tension)
 * 2 stars: 1 hint OR 2-3 invalid attempts
 * 1 star: 2+ hints OR 4+ invalid attempts
 */
export function calculateStars(hintsUsed: number, invalidAttempts: number): number {
  // 2+ hints = 1 star max
  if (hintsUsed >= 2) {
    return 1;
  }

  // 4+ invalid attempts = 1 star max
  if (invalidAttempts >= 4) {
    return 1;
  }

  // 1 hint OR 2-3 invalid attempts = 2 stars max
  if (hintsUsed === 1 || invalidAttempts >= 2) {
    return 2;
  }

  // 0 hints, 0-1 invalid attempts = 3 stars
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
 * Load cumulative stats from MMKV
 */
export function loadStats(): CumulativeStats {
  const stored = storage.getString(STORAGE_KEY);
  if (stored !== undefined) {
    const parsed = JSON.parse(stored);
    // Backward compat: add noHintPuzzleCount if missing from old data
    if (parsed.noHintPuzzleCount === undefined) {
      parsed.noHintPuzzleCount = 0;
    }
    // Backward compat: add MEDIUM_PLUS if missing from old data
    if (parsed.byDifficulty && !parsed.byDifficulty.MEDIUM_PLUS) {
      parsed.byDifficulty.MEDIUM_PLUS = { completed: 0, stars: 0 };
    }
    // Backward compat: add personalBests if missing from old data
    if (!parsed.personalBests) {
      parsed.personalBests = {};
    }
    return parsed;
  }

  return getDefaultStats();
}

/**
 * Record stats from a completed puzzle
 */
export function recordPuzzleCompletion(
  difficulty: Difficulty,
  hintsUsed: number,
  invalidAttempts: number
): PuzzleAttemptStats {
  const stats = loadStats();

  const starsEarned = calculateStars(hintsUsed, invalidAttempts);

  // Update cumulative stats
  stats.totalPuzzlesCompleted += 1;
  stats.totalStars += starsEarned;
  stats.totalInvalidAttempts += invalidAttempts;
  stats.totalHintsUsed += hintsUsed;
  if (hintsUsed === 0) {
    stats.noHintPuzzleCount = (stats.noHintPuzzleCount || 0) + 1;
  }

  // Update star count breakdown
  if (starsEarned === 3) {
    stats.threeStarCount += 1;
  } else if (starsEarned === 2) {
    stats.twoStarCount += 1;
  } else {
    stats.oneStarCount += 1;
  }

  // Update per-difficulty stats
  stats.byDifficulty[difficulty].completed += 1;
  stats.byDifficulty[difficulty].stars += starsEarned;

  // Update personal bests
  if (!stats.personalBests) stats.personalBests = {};
  const prev = stats.personalBests[difficulty];
  if (!prev) {
    stats.personalBests[difficulty] = {
      fewestHints: hintsUsed,
      fewestInvalidAttempts: invalidAttempts,
    };
  } else {
    if (hintsUsed < prev.fewestHints) prev.fewestHints = hintsUsed;
    if (invalidAttempts < prev.fewestInvalidAttempts) prev.fewestInvalidAttempts = invalidAttempts;
  }

  stats.lastUpdated = Date.now();

  // Persist
  storage.set(STORAGE_KEY, JSON.stringify(stats));

  return {
    difficulty,
    starsEarned,
    invalidAttempts,
    hintsUsed,
    timestamp: Date.now(),
  };
}

/**
 * Get cumulative stats (loads from storage if needed)
 */
export function getCumulativeStats(): CumulativeStats {
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
export function clearStats(): void {
  storage.remove(STORAGE_KEY);
}
