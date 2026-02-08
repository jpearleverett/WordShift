import AsyncStorage from '@react-native-async-storage/async-storage';
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
 * Determine the daily challenge difficulty based on the date
 * Cycles: Mon=EASY, Tue=MEDIUM, Wed=HARD, Thu=EASY, Fri=MEDIUM, Sat=HARD, Sun=MEDIUM
 */
export function getDailyDifficulty(dateStr?: string): Difficulty {
  const date = dateStr ? new Date(dateStr) : new Date();
  const day = date.getDay(); // 0=Sun, 1=Mon, ...6=Sat
  const cycle: Difficulty[] = ['MEDIUM', 'EASY', 'MEDIUM', 'HARD', 'EASY', 'MEDIUM', 'HARD'];
  return cycle[day];
}

/**
 * Load daily challenge progress
 */
export async function loadDailyProgress(): Promise<DailyChallengeProgress> {
  if (progressCache) return progressCache;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      progressCache = JSON.parse(stored);
      return progressCache!;
    }
  } catch (err) {
    console.warn('Failed to load daily challenge progress:', err);
  }

  progressCache = getDefaultProgress();
  return progressCache;
}

/**
 * Check if today's daily challenge has been completed
 */
export async function isDailyCompleted(): Promise<boolean> {
  const progress = await loadDailyProgress();
  return progress.lastCompletedDate === getTodayString();
}

// Guard against concurrent daily puzzle generation
let dailyGenerationInProgress = false;

/**
 * Generate the daily challenge puzzle
 * Uses the date as a seed so all players get the same puzzle.
 * Temporarily replaces Math.random with a seeded PRNG during generation.
 * Guarded against concurrent calls to prevent race conditions.
 */
export async function generateDailyPuzzle(): Promise<{
  words: string[];
  hint?: string;
  difficulty: Difficulty;
  date: string;
}> {
  // Prevent concurrent calls from interfering with Math.random override
  if (dailyGenerationInProgress) {
    // Fall back to non-seeded generation if already running
    const today = getTodayString();
    const difficulty = getDailyDifficulty(today);
    const puzzle = await generateLocalPuzzle(difficulty);
    return { words: puzzle.words, hint: puzzle.hint, difficulty, date: today };
  }

  dailyGenerationInProgress = true;
  const today = getTodayString();
  const difficulty = getDailyDifficulty(today);
  const rng = seededRandom(`wordshift-daily-${today}`);

  // Temporarily override Math.random for deterministic generation
  const originalRandom = Math.random;
  Math.random = rng;

  try {
    const puzzle = await generateLocalPuzzle(difficulty);
    return {
      words: puzzle.words,
      hint: puzzle.hint,
      difficulty,
      date: today,
    };
  } finally {
    Math.random = originalRandom;
    dailyGenerationInProgress = false;
  }
}

/**
 * Record completion of today's daily challenge
 */
export async function recordDailyCompletion(
  stars: number,
  hintsUsed: number,
  invalidAttempts: number
): Promise<DailyChallengeProgress> {
  const progress = await loadDailyProgress();
  const today = getTodayString();

  // Don't record if already completed today
  if (progress.lastCompletedDate === today) {
    return progress;
  }

  // Calculate streak
  const yesterday = getYesterdayString();
  if (progress.lastCompletedDate === yesterday) {
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

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn('Failed to save daily challenge progress:', err);
  }

  return progress;
}

/**
 * Get today's daily challenge status
 */
export async function getDailyStatus(): Promise<{
  isCompleted: boolean;
  difficulty: Difficulty;
  todayResult: DailyChallengeResult | null;
  streak: number;
  bestStreak: number;
  totalCompleted: number;
}> {
  const progress = await loadDailyProgress();
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
 * Clear daily challenge data (for testing)
 */
export async function clearDailyProgress(): Promise<void> {
  progressCache = getDefaultProgress();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}
