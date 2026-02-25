import { storage } from './storage';
import { Difficulty } from '../types';
import { generateLocalPuzzle } from './localGenerator';

const STORAGE_KEY = 'wordshift_daily_challenge';

/**
 * Daily Challenge system
 *
 * Each day has a unique puzzle seeded by the date.
 * All players get the same daily challenge.
 * Players can only complete the daily challenge once per day.
 */

export interface DailyChallengeResult {
  date: string; // YYYY-MM-DD
  stars: number;
  hintsUsed: number;
  invalidAttempts: number;
  completedAt: number;
}

export interface DailyChallengeProgress {
  completedChallenges: DailyChallengeResult[];
  totalCompleted: number;
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string | null;
}

// In-memory cache
let progressCache: DailyChallengeProgress | null = null;

function getDefaultProgress(): DailyChallengeProgress {
  return {
    completedChallenges: [],
    totalCompleted: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
  };
}

/**
 * Get today's date as YYYY-MM-DD string
 */
export function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Get yesterday's date as YYYY-MM-DD string
 */
function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Grace period for daily challenge streaks (in days)
 * Consistent with main game streak grace period (STREAK_BONUSES.STREAK_RESET_DAYS)
 */
const DAILY_STREAK_GRACE_DAYS = 2;

/**
 * Daily challenge unlock pacing.
 * Hidden until players are settled into the core loop.
 */
export const DAILY_CHALLENGE_UNLOCK_PUZZLES = 20;

/**
 * Daily challenge unlock condition.
 * We gate by puzzle count and allow phase progression to unlock it naturally.
 */
export function isDailyChallengeUnlocked(
  puzzlesSolved: number,
  currentPhase: number
): boolean {
  return puzzlesSolved >= DAILY_CHALLENGE_UNLOCK_PUZZLES || currentPhase >= 1;
}

/**
 * Progress info for UI (e.g., hidden lock hints before unlock).
 */
export function getDailyChallengeUnlockProgress(
  puzzlesSolved: number,
  currentPhase: number
): { unlocked: boolean; puzzlesRemaining: number } {
  const unlocked = isDailyChallengeUnlocked(puzzlesSolved, currentPhase);
  if (unlocked) {
    return { unlocked: true, puzzlesRemaining: 0 };
  }
  return {
    unlocked: false,
    puzzlesRemaining: Math.max(0, DAILY_CHALLENGE_UNLOCK_PUZZLES - puzzlesSolved),
  };
}

/**
 * Check if a date string is within the daily streak grace period
 * Returns true if the date is 1 to DAILY_STREAK_GRACE_DAYS days ago
 */
function isWithinDailyGracePeriod(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  const diffMs = today.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 1 && diffDays <= DAILY_STREAK_GRACE_DAYS;
}

/**
 * Seeded random number generator (deterministic based on date string)
 * Uses a simple hash to generate a seed from the date string
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }

  // LCG parameters
  let state = Math.abs(hash) || 1;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Daily challenge difficulty is always HARD (6-letter words, 5 rows).
 * Kept as a function for backward compatibility with status/display code.
 */
export function getDailyDifficulty(_dateStr?: string): Difficulty {
  return 'HARD';
}

/**
 * Load daily challenge progress
 */
export function loadDailyProgress(): DailyChallengeProgress {
  if (progressCache) return progressCache;

  const stored = storage.getString(STORAGE_KEY);
  if (stored !== undefined) {
    progressCache = JSON.parse(stored);
    return progressCache!;
  }

  progressCache = getDefaultProgress();
  return progressCache;
}

/**
 * Check if today's daily challenge has been completed
 */
export function isDailyCompleted(): boolean {
  const progress = loadDailyProgress();
  return progress.lastCompletedDate === getTodayString();
}

// Guard against concurrent daily puzzle generation
let dailyGenerationInProgress: Promise<{
  words: string[];
  hint?: string;
  difficulty: Difficulty;
  date: string;
  wordLength: number;
}> | null = null;

/**
 * Generate the daily challenge puzzle
 * Uses the date as a seed so all players get the same puzzle.
 * Temporarily replaces Math.random with a seeded PRNG during generation.
 * Guarded against concurrent calls — subsequent callers await the first generation.
 */
export async function generateDailyPuzzle(): Promise<{
  words: string[];
  hint?: string;
  difficulty: Difficulty;
  date: string;
  wordLength: number;
}> {
  // If generation is already in progress, await the existing result
  if (dailyGenerationInProgress) {
    return dailyGenerationInProgress;
  }

  const generationPromise = (async () => {
    const today = getTodayString();
    const difficulty = getDailyDifficulty(today);
    const rng = seededRandom(`wordshift-daily-${today}`);

    // Temporarily override Math.random for deterministic generation
    const originalRandom = Math.random;
    Math.random = rng;

    try {
      // Daily challenge always uses 6-letter words with 5 rows
      const puzzle = await generateLocalPuzzle(difficulty, {
        wordLength: 6,
        targetRows: 5,
      });
      return {
        words: puzzle.words,
        hint: puzzle.hint,
        difficulty,
        date: today,
        wordLength: puzzle.wordLength ?? 6,
      };
    } finally {
      Math.random = originalRandom;
      dailyGenerationInProgress = null;
    }
  })();

  dailyGenerationInProgress = generationPromise;
  return generationPromise;
}

/**
 * Record completion of today's daily challenge
 */
export function recordDailyCompletion(
  stars: number,
  hintsUsed: number,
  invalidAttempts: number
): DailyChallengeProgress {
  const progress = loadDailyProgress();
  const today = getTodayString();

  // Don't record if already completed today
  if (progress.lastCompletedDate === today) {
    return progress;
  }

  // Calculate streak (with grace period matching main game)
  if (progress.lastCompletedDate && isWithinDailyGracePeriod(progress.lastCompletedDate)) {
    progress.currentStreak += 1;
  } else if (progress.lastCompletedDate !== today) {
    progress.currentStreak = 1;
  }

  progress.bestStreak = Math.max(progress.bestStreak, progress.currentStreak);

  // Record result
  const result: DailyChallengeResult = {
    date: today,
    stars,
    hintsUsed,
    invalidAttempts,
    completedAt: Date.now(),
  };

  progress.completedChallenges.push(result);
  // Keep last 90 days of history
  if (progress.completedChallenges.length > 90) {
    progress.completedChallenges = progress.completedChallenges.slice(-90);
  }

  progress.totalCompleted += 1;
  progress.lastCompletedDate = today;

  progressCache = progress;

  storage.set(STORAGE_KEY, JSON.stringify(progress));

  return progress;
}

/**
 * Get today's daily challenge status
 */
export function getDailyStatus(): {
  isCompleted: boolean;
  difficulty: Difficulty;
  todayResult: DailyChallengeResult | null;
  streak: number;
  bestStreak: number;
  totalCompleted: number;
} {
  const progress = loadDailyProgress();
  const today = getTodayString();
  const isCompleted = progress.lastCompletedDate === today;
  const todayResult = progress.completedChallenges.find(c => c.date === today) || null;

  return {
    isCompleted,
    difficulty: getDailyDifficulty(today),
    todayResult,
    streak: progress.currentStreak,
    bestStreak: progress.bestStreak,
    totalCompleted: progress.totalCompleted,
  };
}

/**
 * Generate deterministic community stats for social comparison
 * Since there's no backend, uses seeded PRNG based on date to create
 * realistic-feeling community data that's consistent for all players
 */
export function getDailyCommunityStats(dateStr?: string): {
  completionRate: number;
  averageStars: number;
  totalPlayers: number;
  difficultyRating: 'Tricky' | 'Moderate' | 'Straightforward';
  perfectRate: number;
} {
  const today = dateStr || getTodayString();
  const rng = seededRandom(`community-stats-${today}`);

  // Generate realistic community stats
  const completionRate = Math.floor(65 + rng() * 25); // 65-90%
  const averageStars = Math.round((1.6 + rng() * 1.2) * 10) / 10; // 1.6-2.8
  const totalPlayers = Math.floor(800 + rng() * 4200); // 800-5000
  const perfectRate = Math.floor(15 + rng() * 35); // 15-50%

  // Difficulty rating correlates with completion rate
  let difficultyRating: 'Tricky' | 'Moderate' | 'Straightforward';
  if (completionRate < 72) {
    difficultyRating = 'Tricky';
  } else if (completionRate < 82) {
    difficultyRating = 'Moderate';
  } else {
    difficultyRating = 'Straightforward';
  }

  return {
    completionRate,
    averageStars,
    totalPlayers,
    difficultyRating,
    perfectRate,
  };
}

// ===========================================================================
// Daily Streak Milestones
// ===========================================================================

export interface DailyStreakMilestone {
  days: number;
  amber: number;
  message: string;
  darkMessage: string;
}

export const DAILY_STREAK_MILESTONES: DailyStreakMilestone[] = [
  { days: 3,  amber: 15,  message: 'Three days running!', darkMessage: 'Three days observed.' },
  { days: 7,  amber: 30,  message: 'A full week of dailies!', darkMessage: 'Seven days. The ritual deepens.' },
  { days: 14, amber: 50,  message: 'Two weeks strong!', darkMessage: 'Fourteen days. The pattern holds.' },
  { days: 21, amber: 75,  message: 'Three weeks dedicated!', darkMessage: 'Twenty-one days. It expects you now.' },
  { days: 30, amber: 100, message: 'One month of daily mastery!', darkMessage: 'Thirty days. The daily offering is... accepted.' },
];

/**
 * Check if a daily streak milestone was just crossed.
 * Returns the milestone info with phase-aware message, or null.
 */
export function checkDailyStreakMilestone(
  currentStreak: number,
  previousStreak: number,
  phase: number
): { amber: number; message: string } | null {
  for (const milestone of DAILY_STREAK_MILESTONES) {
    if (currentStreak >= milestone.days && previousStreak < milestone.days) {
      return {
        amber: milestone.amber,
        message: phase >= 3 ? milestone.darkMessage : milestone.message,
      };
    }
  }
  return null;
}

/**
 * Clear daily challenge data (for testing)
 */
export function clearDailyProgress(): void {
  progressCache = getDefaultProgress();
  storage.remove(STORAGE_KEY);
}
