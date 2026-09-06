import AsyncStorage from './persistenceStorage';
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
  /**
   * "Flawless offerings" — puzzles solved with 0 hints, 0 invalid attempts,
   * AND 0 undos: the perfect-play tier ABOVE 3 stars (3 stars tolerates one
   * invalid, so a novice preview-scanner 3-stars everything; flawless is the
   * expert chase the star economy otherwise can't express). Lifetime tally.
   */
  flawlessCount?: number;
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

// In-memory cache
let statsCache: CumulativeStats | null = null;

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
 * The "flawless offering" tier — strictly above 3 stars: perfect play with no
 * assistance and no take-backs. undosUsed defaults to 0 so older call sites
 * that don't yet pass it degrade to the hints+invalids definition.
 */
export function isFlawless(hintsUsed: number, invalidAttempts: number, undosUsed: number = 0): boolean {
  return hintsUsed === 0 && invalidAttempts === 0 && undosUsed === 0;
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
    flawlessCount: 0,
    byDifficulty: {
      EASY: { completed: 0, stars: 0 },
      MEDIUM: { completed: 0, stars: 0 },
      MEDIUM_PLUS: { completed: 0, stars: 0 },
      HARD: { completed: 0, stars: 0 },
      EXPERT: { completed: 0, stars: 0 },
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
      // Backward compat: backfill EVERY per-difficulty bucket missing from old
      // data, derived from getDefaultStats() so the shape has ONE source of
      // truth. This was hand-listed (MEDIUM_PLUS only) when EXPERT was added,
      // which meant every pre-EXPERT install carried a blob with no EXPERT
      // bucket: recordPuzzleCompletion's unguarded
      // `byDifficulty[difficulty].completed += 1` then threw on the first
      // EXPERT win — AFTER the running totals were incremented and BEFORE
      // setItem, so the whole write was silently discarded (stats went
      // backwards on relaunch, totalPuzzlesCompleted stalled, and the
      // solve-count gates that feed off it froze). Iterating the defaults means
      // the next tier widening backfills itself.
      if (parsed.byDifficulty) {
        const defaultBuckets = getDefaultStats().byDifficulty;
        for (const key of Object.keys(defaultBuckets) as Difficulty[]) {
          if (!parsed.byDifficulty[key]) {
            parsed.byDifficulty[key] = { completed: 0, stars: 0 };
          }
        }
      } else {
        parsed.byDifficulty = getDefaultStats().byDifficulty;
      }
      // Backward compat: add personalBests if missing from old data
      if (!parsed.personalBests) {
        parsed.personalBests = {};
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

/** Drop the in-memory stats cache after external storage writes (cloud restore). */
export function invalidateStatsCache(): void {
  statsCache = null;
}

/**
 * Record stats from a completed puzzle
 */
export async function recordPuzzleCompletion(
  difficulty: Difficulty,
  hintsUsed: number,
  invalidAttempts: number,
  undosUsed: number = 0
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
    if (isFlawless(hintsUsed, invalidAttempts, undosUsed)) {
      statsCache!.flawlessCount = (statsCache!.flawlessCount || 0) + 1;
    }

    // Update star count breakdown
    if (starsEarned === 3) {
      statsCache!.threeStarCount += 1;
    } else if (starsEarned === 2) {
      statsCache!.twoStarCount += 1;
    } else {
      statsCache!.oneStarCount += 1;
    }

    // Update per-difficulty stats. The bucket is created on demand as well as
    // backfilled in loadStats: this write sits AFTER the running totals are
    // incremented and BEFORE setItem, so a missing bucket used to throw away
    // the entire completion record, not just the per-difficulty tally.
    if (!statsCache!.byDifficulty) {
      statsCache!.byDifficulty = getDefaultStats().byDifficulty;
    }
    if (!statsCache!.byDifficulty[difficulty]) {
      statsCache!.byDifficulty[difficulty] = { completed: 0, stars: 0 };
    }
    statsCache!.byDifficulty[difficulty].completed += 1;
    statsCache!.byDifficulty[difficulty].stars += starsEarned;

    // Update personal bests
    if (!statsCache!.personalBests) statsCache!.personalBests = {};
    const prev = statsCache!.personalBests[difficulty];
    if (!prev) {
      statsCache!.personalBests[difficulty] = {
        fewestHints: hintsUsed,
        fewestInvalidAttempts: invalidAttempts,
      };
    } else {
      if (hintsUsed < prev.fewestHints) prev.fewestHints = hintsUsed;
      if (invalidAttempts < prev.fewestInvalidAttempts) prev.fewestInvalidAttempts = invalidAttempts;
    }

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
    statsCache = null;
    throw error;
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
