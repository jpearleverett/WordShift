import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty } from '../types';
import { DAILY_CHALLENGE_UNLOCK_PUZZLES, FIRST_DAILY_BONUS_HINTS } from '../constants/gameBalance';
import { generateLocalPuzzle } from './localGenerator';
import { getLocalDateString, getLocalDateStringDaysAgo, daysAgoLocal } from './dateUtils';
import { addHints } from './hints';

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
  /** Banked daily-streak freezes (auto-applied to forgive a missed day). */
  streakFreezes: number;
  /** Local-day the last free freeze was granted (null = never). */
  lastFreezeGrantDate: string | null;
  /**
   * Transient (not persisted): true on the completion that just consumed a
   * freeze to protect the streak, so the UI can tell the player their daily
   * streak was saved.
   */
  streakSavedByFreeze?: boolean;
  /** True once the one-time first-daily hint mercy has been granted. */
  firstDailyMercyGranted: boolean;
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
    streakFreezes: 0,
    lastFreezeGrantDate: null,
    firstDailyMercyGranted: false,
  };
}

/**
 * Get today's date as a LOCAL-day YYYY-MM-DD string.
 * Local (not UTC) so daily streaks bucket by the player's calendar day.
 */
export function getTodayString(): string {
  return getLocalDateString();
}

/**
 * Get yesterday's local-day date as YYYY-MM-DD string
 */
function getYesterdayString(): string {
  return getLocalDateStringDaysAgo(1);
}

/**
 * Grace period for daily challenge streaks (in days).
 * Yesterday-only free continuation: the streak continues for free only if the
 * player completed yesterday's challenge. A larger gap doesn't immediately
 * break the chain — it consumes a banked daily-streak freeze if one is
 * available (see recordDailyCompletion), mirroring the main game's freeze
 * safety net so a single missed day no longer nukes a long daily streak.
 */
const DAILY_STREAK_GRACE_DAYS = 1;

/**
 * How often a free daily-streak freeze is granted (in days), and the max that
 * can be banked at once. A committed daily player accrues one freeze every two
 * weeks (capped at one), so the occasional missed day is forgiven without
 * making the streak trivially unbreakable.
 */
const DAILY_FREE_FREEZE_INTERVAL_DAYS = 14;
const DAILY_MAX_FREEZES = 1;

// Unlock pacing lives in gameBalance.ts (single source of truth); re-exported
// here so existing consumers of the service keep working.
export { DAILY_CHALLENGE_UNLOCK_PUZZLES };

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
  const diffDays = daysAgoLocal(dateString);
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
export async function loadDailyProgress(): Promise<DailyChallengeProgress> {
  if (progressCache) return progressCache;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      // Merge over defaults so saves written before the freeze fields existed
      // load with sane values instead of `undefined`.
      progressCache = { ...getDefaultProgress(), ...JSON.parse(stored) };
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

export interface DailyPuzzleData {
  words: string[];
  hint?: string;
  difficulty: Difficulty;
  date: string;
  wordLength: number;
}

// Guard against concurrent daily puzzle generation
let dailyGenerationInProgress: Promise<DailyPuzzleData> | null = null;

// Resolved-puzzle cache, keyed by local day. Lets a pre-warm at launch
// make the daily appear instantly on tap (the seeded 6-letter / 5-row
// generation can take a beat on low-end devices).
let dailyPuzzleCache: DailyPuzzleData | null = null;

/**
 * Generate the daily challenge puzzle
 * Uses the date as a seed so all players get the same puzzle.
 * Temporarily replaces Math.random with a seeded PRNG during generation.
 * Guarded against concurrent calls — subsequent callers await the first generation.
 * Memoized per local day — a same-day repeat call returns the cached result.
 */
export async function generateDailyPuzzle(): Promise<DailyPuzzleData> {
  const today = getTodayString();

  // Return today's already-generated puzzle instantly.
  if (dailyPuzzleCache && dailyPuzzleCache.date === today) {
    return dailyPuzzleCache;
  }

  // If generation is already in progress, await the existing result
  if (dailyGenerationInProgress) {
    return dailyGenerationInProgress;
  }

  const generationPromise = (async () => {
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
      const result: DailyPuzzleData = {
        words: puzzle.words,
        hint: puzzle.hint,
        difficulty,
        date: today,
        wordLength: puzzle.wordLength ?? 6,
      };
      dailyPuzzleCache = result;
      return result;
    } finally {
      Math.random = originalRandom;
      dailyGenerationInProgress = null;
    }
  })();

  dailyGenerationInProgress = generationPromise;
  return generationPromise;
}

/**
 * Pre-generate today's daily puzzle in the background so it's ready instantly
 * when the player taps the Daily Challenge card. Safe to call repeatedly
 * (no-op once cached for the day) and fire-and-forget (errors are swallowed —
 * the on-tap path will retry and surface any real failure).
 */
export function prewarmDailyPuzzle(): void {
  const today = getTodayString();
  if (dailyPuzzleCache && dailyPuzzleCache.date === today) return;
  if (dailyGenerationInProgress) return;
  generateDailyPuzzle().catch(() => {
    // Best-effort warm-up; the real generation happens again on tap if needed.
  });
}

/**
 * One-time first-daily mercy: the daily is always HARD, so the player's very
 * first attempt gets a small bonus-hint cushion (FIRST_DAILY_BONUS_HINTS).
 * Grants exactly once ever (flag persisted with the daily progress record) and
 * returns the number of hints granted, or null if already granted. Hints are
 * convenience only — they still cost stars, and the puzzle itself is untouched
 * (deterministic and identical for all players on a date).
 */
export async function grantFirstDailyMercy(): Promise<number | null> {
  const progress = await loadDailyProgress();
  if (progress.firstDailyMercyGranted) return null;

  // Flip the flag on the shared cache before any await so a rapid double-call
  // can't double-grant.
  progress.firstDailyMercyGranted = true;
  progressCache = progress;

  await addHints(FIRST_DAILY_BONUS_HINTS, 'first_daily_mercy');

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn('Failed to save daily challenge progress:', err);
  }

  return FIRST_DAILY_BONUS_HINTS;
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

  // Grant a free freeze on a periodic cadence (capped) so a committed daily
  // player banks protection against the occasional missed day.
  const freezeAgeDays = progress.lastFreezeGrantDate
    ? daysAgoLocal(progress.lastFreezeGrantDate)
    : Infinity;
  if (progress.streakFreezes < DAILY_MAX_FREEZES && freezeAgeDays >= DAILY_FREE_FREEZE_INTERVAL_DAYS) {
    progress.streakFreezes = DAILY_MAX_FREEZES;
    progress.lastFreezeGrantDate = today;
  }

  // Calculate streak. Yesterday → free continuation. A larger gap consumes a
  // banked freeze (if any) to keep the chain alive; otherwise the streak resets.
  progress.streakSavedByFreeze = false;
  if (progress.lastCompletedDate && isWithinDailyGracePeriod(progress.lastCompletedDate)) {
    progress.currentStreak += 1;
  } else if (
    progress.lastCompletedDate &&
    progress.currentStreak > 1 &&
    progress.streakFreezes > 0
  ) {
    progress.streakFreezes -= 1;
    progress.currentStreak += 1;
    progress.streakSavedByFreeze = true;
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
  streakFreezes: number;
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
    streakFreezes: progress.streakFreezes,
  };
}

// NOTE: A previous `getDailyCommunityStats()` helper fabricated seeded
// "community" numbers (player counts, completion rates) for social proof. It was
// never surfaced in the UI and presenting invented engagement data risks app-store
// policy violations, so it was removed. Real community stats must come from a
// backend (telemetry/leaderboard) before any such display is added.

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
export async function clearDailyProgress(): Promise<void> {
  progressCache = getDefaultProgress();
  dailyPuzzleCache = null;
  dailyGenerationInProgress = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}
