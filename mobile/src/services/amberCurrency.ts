import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty, GameMode } from '../types';
import {
  HomeWorldProgress,
  AmberTransaction,
  AMBER_REWARDS,
  PHASE_THRESHOLDS,
  DialoguePhase,
  STREAK_BONUSES,
  calculateStreakMultiplier,
  checkMilestone,
  NARRATIVE_ACCELERATION,
  CHALLENGE_MODE_CONFIG,
} from '../types/homeWorld';

const PROGRESS_STORAGE_KEY = 'wordshift_home_progress';
const TRANSACTIONS_STORAGE_KEY = 'wordshift_amber_transactions';

// In-memory cache
let progressCache: HomeWorldProgress | null = null;

/**
 * Get default initial progress
 * Starts with just one empty room - player must invite first animal
 */
function getDefaultProgress(): HomeWorldProgress {
  return {
    amber: 0,
    totalAmberEarned: 0,
    unlockedAnimals: [], // No animals - must invite first one!
    unlockedRooms: ['cozy_den'], // Starter room (empty)
    currentPhase: 0,
    puzzlesSolved: 0,
    phaseProgress: 0, // Weighted phase progress (may differ from puzzlesSolved due to acceleration)
    phasePuzzleThresholds: [...PHASE_THRESHOLDS],
    lastDialogueRead: {},
    introsSeen: [], // Track which animals have had their intro shown
    currentStreak: 0,
    lastPlayDate: null,
    challengeCompletions: 0,
  };
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Check if a date string is yesterday
 */
function isYesterday(dateString: string): boolean {
  const date = new Date(dateString);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toISOString().split('T')[0] === yesterday.toISOString().split('T')[0];
}

/**
 * Check if a date string is within the streak grace period (STREAK_RESET_DAYS)
 * Returns true if the date is 1 to STREAK_RESET_DAYS days ago
 */
function isWithinStreakGracePeriod(dateString: string): boolean {
  const date = new Date(dateString);
  const today = new Date();
  const diffMs = today.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 1 && diffDays <= STREAK_BONUSES.STREAK_RESET_DAYS;
}

/**
 * Check if a date string is today
 */
function isToday(dateString: string): boolean {
  return dateString === getTodayDateString();
}

/**
 * Update streak based on play activity
 * Should be called when a puzzle is completed
 */
async function updateStreak(): Promise<number> {
  const progress = await loadProgress();
  const today = getTodayDateString();

  // Handle missing streak data (migration)
  if (progress.currentStreak === undefined) {
    progress.currentStreak = 0;
  }

  if (!progress.lastPlayDate) {
    // First play ever - start streak at 1
    progress.currentStreak = 1;
    progress.lastPlayDate = today;
  } else if (isToday(progress.lastPlayDate)) {
    // Already played today - streak unchanged
    // Just return current streak
  } else if (isWithinStreakGracePeriod(progress.lastPlayDate)) {
    // Played within grace period (STREAK_RESET_DAYS) - continue streak
    progress.currentStreak += 1;
    progress.lastPlayDate = today;
  } else {
    // Missed too many days - reset streak
    progress.currentStreak = 1;
    progress.lastPlayDate = today;
  }

  progressCache = progress;
  await saveProgress();
  return progress.currentStreak;
}

/**
 * Load progress from AsyncStorage
 */
export async function loadProgress(): Promise<HomeWorldProgress> {
  try {
    if (progressCache) {
      return progressCache;
    }

    const stored = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
    if (stored) {
      progressCache = JSON.parse(stored);
      return progressCache!;
    }
  } catch (error) {
    console.warn('Failed to load home progress:', error);
  }

  progressCache = getDefaultProgress();
  return progressCache;
}

/**
 * Save progress to AsyncStorage
 */
async function saveProgress(): Promise<void> {
  if (!progressCache) return;
  try {
    await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progressCache));
  } catch (error) {
    console.warn('Failed to save home progress:', error);
  }
}

/**
 * Get current amber balance
 */
export async function getAmberBalance(): Promise<number> {
  const progress = await loadProgress();
  return progress.amber;
}

/**
 * Calculate narrative acceleration multiplier for phase progression
 * Based on player performance (three-star rate, streak, difficulty)
 */
export function calculatePhaseAcceleration(
  threeStarRate: number,
  currentStreak: number,
  difficulty: Difficulty,
  gameMode: GameMode = 'standard'
): number {
  let multiplier = 1.0;

  // Three-star performance bonus
  if (threeStarRate >= NARRATIVE_ACCELERATION.THREE_STAR_RATE_THRESHOLD) {
    multiplier *= NARRATIVE_ACCELERATION.THREE_STAR_MULTIPLIER;
  }

  // Streak bonus
  if (currentStreak >= NARRATIVE_ACCELERATION.STREAK_THRESHOLD) {
    multiplier *= NARRATIVE_ACCELERATION.STREAK_MULTIPLIER;
  }

  // Difficulty bonus
  if (difficulty === 'HARD') {
    multiplier *= NARRATIVE_ACCELERATION.HARD_MULTIPLIER;
  } else if (difficulty === 'EASY') {
    multiplier *= NARRATIVE_ACCELERATION.EASY_MULTIPLIER;
  }

  // Challenge mode bonus
  if (gameMode === 'challenge') {
    multiplier *= NARRATIVE_ACCELERATION.CHALLENGE_MULTIPLIER;
  }

  return multiplier;
}

/**
 * Award amber for completing a puzzle
 */
export async function awardPuzzleAmber(
  difficulty: Difficulty,
  starsEarned: number,
  gameMode: GameMode = 'standard',
  threeStarRate: number = 0
): Promise<{
  amount: number;
  baseAmount: number;
  streakBonus: number;
  challengeBonus: number;
  milestoneBonus: number;
  milestoneMessage: string | null;
  newBalance: number;
  phaseChanged: boolean;
  newPhase: DialoguePhase;
  currentStreak: number;
  puzzlesSolved: number;
  phaseAcceleration: number;
}> {
  const progress = await loadProgress();

  // Update streak first
  const currentStreak = await updateStreak();

  // Base reward by difficulty
  let baseAmount = AMBER_REWARDS[difficulty];

  // Star bonuses
  if (starsEarned === 3) {
    // 3 stars: +50%
    baseAmount = Math.floor(baseAmount * 1.5);
  } else if (starsEarned === 2) {
    // 2 stars: +25%
    baseAmount = Math.floor(baseAmount * 1.25);
  }

  // Apply streak bonus
  const streakMultiplier = calculateStreakMultiplier(currentStreak);
  let totalAmount = Math.floor(baseAmount * streakMultiplier);
  const streakBonus = totalAmount - baseAmount;

  // Apply challenge mode bonus
  let challengeBonus = 0;
  if (gameMode === 'challenge') {
    challengeBonus = Math.floor(totalAmount * (CHALLENGE_MODE_CONFIG.AMBER_MULTIPLIER - 1));
    totalAmount += challengeBonus;

    // Track challenge completions
    progress.challengeCompletions = (progress.challengeCompletions || 0) + 1;
  }

  progress.amber += totalAmount;
  progress.totalAmberEarned += totalAmount;
  progress.puzzlesSolved += 1;

  // Calculate phase acceleration and update phase progress
  const phaseAcceleration = calculatePhaseAcceleration(
    threeStarRate, currentStreak, difficulty, gameMode
  );
  const phaseProgressIncrement = phaseAcceleration;
  // Initialize phaseProgress from puzzlesSolved for migrated players missing the field
  if (progress.phaseProgress === undefined || progress.phaseProgress === null) {
    progress.phaseProgress = progress.puzzlesSolved - 1; // -1 because we already incremented puzzlesSolved above
  }
  progress.phaseProgress += phaseProgressIncrement;

  // Check for milestone bonus (uses >= with last-claimed tracking to prevent skips/doubles)
  const milestone = checkMilestone(progress.puzzlesSolved, progress.lastClaimedMilestone ?? 0);
  let milestoneBonus = 0;
  let milestoneMessage: string | null = null;
  if (milestone) {
    milestoneBonus = milestone.amber;
    milestoneMessage = milestone.message;
    progress.amber += milestoneBonus;
    progress.totalAmberEarned += milestoneBonus;
    progress.lastClaimedMilestone = milestone.puzzles;

    // Record milestone transaction separately
    await recordTransaction({
      amount: milestoneBonus,
      type: 'earn',
      source: `milestone_${milestone.puzzles}`,
      timestamp: Date.now(),
    });
  }

  // Check for phase transition using weighted phase progress
  const previousPhase = progress.currentPhase;
  const effectiveProgress = progress.phaseProgress || progress.puzzlesSolved;
  const newPhase = calculatePhase(effectiveProgress);
  const phaseChanged = newPhase > previousPhase;
  progress.currentPhase = newPhase;

  // Mark all animals as having new dialogue when phase changes
  if (phaseChanged) {
    // This will be handled by the dialogue service
  }

  progressCache = progress;
  await saveProgress();

  // Record puzzle transaction
  await recordTransaction({
    amount: totalAmount,
    type: 'earn',
    source: `puzzle_${difficulty.toLowerCase()}${gameMode === 'challenge' ? '_challenge' : ''}${streakBonus > 0 ? `_streak${currentStreak}` : ''}`,
    timestamp: Date.now(),
  });

  return {
    amount: totalAmount,
    baseAmount,
    streakBonus,
    challengeBonus,
    milestoneBonus,
    milestoneMessage,
    newBalance: progress.amber,
    phaseChanged,
    newPhase,
    currentStreak,
    puzzlesSolved: progress.puzzlesSolved,
    phaseAcceleration,
  };
}

// Guard against concurrent spend operations
let spendInProgress = false;

/**
 * Spend amber on an unlock
 * Protected against concurrent calls with a guard flag
 */
export async function spendAmber(
  amount: number,
  targetId: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  if (spendInProgress) {
    return {
      success: false,
      newBalance: progressCache?.amber ?? 0,
      error: 'Transaction in progress',
    };
  }

  spendInProgress = true;
  try {
    const progress = await loadProgress();

    if (progress.amber < amount) {
      return {
        success: false,
        newBalance: progress.amber,
        error: 'Not enough amber',
      };
    }

    progress.amber -= amount;
    progressCache = progress;
    await saveProgress();

    await recordTransaction({
      amount,
      type: 'spend',
      source: targetId,
      timestamp: Date.now(),
    });

    return {
      success: true,
      newBalance: progress.amber,
    };
  } finally {
    spendInProgress = false;
  }
}

/**
 * Unlock an animal
 */
export async function unlockAnimal(animalId: string, cost: number): Promise<boolean> {
  const result = await spendAmber(cost, `animal_${animalId}`);
  if (!result.success) return false;

  const progress = await loadProgress();
  if (!progress.unlockedAnimals.includes(animalId)) {
    progress.unlockedAnimals.push(animalId);
    progressCache = progress;
    await saveProgress();
  }

  return true;
}

/**
 * Unlock a room
 */
export async function unlockRoom(roomId: string, cost: number): Promise<boolean> {
  const result = await spendAmber(cost, `room_${roomId}`);
  if (!result.success) return false;

  const progress = await loadProgress();
  if (!progress.unlockedRooms.includes(roomId)) {
    progress.unlockedRooms.push(roomId);
    progressCache = progress;
    await saveProgress();
  }

  return true;
}

/**
 * Calculate current dialogue phase based on effective progress
 * Uses phaseProgress (weighted) when available, falls back to puzzlesSolved
 */
function calculatePhase(effectiveProgress: number): DialoguePhase {
  if (effectiveProgress >= PHASE_THRESHOLDS[4]) return 4;
  if (effectiveProgress >= PHASE_THRESHOLDS[3]) return 3;
  if (effectiveProgress >= PHASE_THRESHOLDS[2]) return 2;
  if (effectiveProgress >= PHASE_THRESHOLDS[1]) return 1;
  return 0;
}

/**
 * Get current phase
 */
export async function getCurrentPhase(): Promise<DialoguePhase> {
  const progress = await loadProgress();
  return progress.currentPhase;
}

/**
 * Get puzzles until next phase
 */
export async function getPuzzlesUntilNextPhase(): Promise<number | null> {
  const progress = await loadProgress();
  const currentPhase = progress.currentPhase;

  if (currentPhase >= 4) return null; // Max phase reached

  const nextThreshold = PHASE_THRESHOLDS[currentPhase + 1];
  return nextThreshold - progress.puzzlesSolved;
}

/**
 * Record an amber transaction for history
 */
async function recordTransaction(transaction: AmberTransaction): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(TRANSACTIONS_STORAGE_KEY);
    const transactions: AmberTransaction[] = stored ? JSON.parse(stored) : [];

    transactions.push(transaction);

    // Keep last 100 transactions
    if (transactions.length > 100) {
      transactions.splice(0, transactions.length - 100);
    }

    await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
  } catch (error) {
    console.warn('Failed to record transaction:', error);
  }
}

/**
 * Get full progress data
 */
export async function getFullProgress(): Promise<HomeWorldProgress> {
  return loadProgress();
}

/**
 * Mark dialogue as read for an animal
 */
export async function markDialogueRead(animalId: string, dialogueIndex: number): Promise<void> {
  const progress = await loadProgress();
  progress.lastDialogueRead[animalId] = dialogueIndex;
  progressCache = progress;
  await saveProgress();
}

/**
 * Check if an animal's intro dialogue has been seen
 */
export async function hasSeenIntro(animalId: string): Promise<boolean> {
  const progress = await loadProgress();
  // Handle old progress data that doesn't have introsSeen array
  if (!progress.introsSeen) {
    progress.introsSeen = [];
  }
  return progress.introsSeen.includes(animalId);
}

/**
 * Mark an animal's intro dialogue as seen
 */
export async function markIntroSeen(animalId: string): Promise<void> {
  const progress = await loadProgress();
  // Handle old progress data that doesn't have introsSeen array
  if (!progress.introsSeen) {
    progress.introsSeen = [];
  }
  if (!progress.introsSeen.includes(animalId)) {
    progress.introsSeen.push(animalId);
    progressCache = progress;
    await saveProgress();
  }
}

/**
 * Get current streak info
 */
export async function getStreakInfo(): Promise<{
  currentStreak: number;
  lastPlayDate: string | null;
  streakMultiplier: number;
  bonusPercentage: number;
}> {
  const progress = await loadProgress();
  const streak = progress.currentStreak || 0;
  const multiplier = calculateStreakMultiplier(streak);
  return {
    currentStreak: streak,
    lastPlayDate: progress.lastPlayDate || null,
    streakMultiplier: multiplier,
    bonusPercentage: Math.round((multiplier - 1) * 100),
  };
}

/**
 * Clear all progress (for testing/reset)
 */
export async function clearProgress(): Promise<void> {
  try {
    progressCache = getDefaultProgress();
    await AsyncStorage.removeItem(PROGRESS_STORAGE_KEY);
    await AsyncStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear progress:', error);
  }
}

/**
 * Check if player can afford an unlock
 */
export async function canAfford(cost: number): Promise<boolean> {
  const progress = await loadProgress();
  return progress.amber >= cost;
}

/**
 * Purchase a room decoration
 */
export async function purchaseDecoration(
  roomId: string,
  decorationId: string,
  cost: number
): Promise<{ success: boolean; newBalance: number }> {
  const result = await spendAmber(cost, `decoration_${decorationId}`);
  if (!result.success) return result;

  const progress = await loadProgress();
  if (!progress.decorations) {
    progress.decorations = {};
  }
  if (!progress.decorations[roomId]) {
    progress.decorations[roomId] = [];
  }
  if (!progress.decorations[roomId].includes(decorationId)) {
    progress.decorations[roomId].push(decorationId);
  }
  progressCache = progress;
  await saveProgress();

  return { success: true, newBalance: result.newBalance };
}

/**
 * Check if a decoration has been purchased
 */
export async function hasDecoration(roomId: string, decorationId: string): Promise<boolean> {
  const progress = await loadProgress();
  return !!(progress.decorations?.[roomId]?.includes(decorationId));
}

/**
 * Get all purchased decorations
 */
export async function getAllDecorations(): Promise<{ [roomId: string]: string[] }> {
  const progress = await loadProgress();
  return progress.decorations || {};
}

/**
 * Get total number of decorations purchased
 */
export async function getDecorationCount(): Promise<number> {
  const progress = await loadProgress();
  if (!progress.decorations) return 0;
  return Object.values(progress.decorations).reduce((sum, ids) => sum + ids.length, 0);
}

/**
 * DEV ONLY: Add amber directly (for testing)
 */
export async function devAddAmber(amount: number): Promise<number> {
  const progress = await loadProgress();
  progress.amber += amount;
  progress.totalAmberEarned += amount;
  progressCache = progress;
  await saveProgress();
  return progress.amber;
}

/**
 * DEV ONLY: Add puzzles and update phase (for testing dialogue progression)
 */
export async function devAddPuzzles(amount: number): Promise<{ puzzles: number; phase: DialoguePhase }> {
  const progress = await loadProgress();
  progress.puzzlesSolved += amount;
  // Keep phaseProgress in sync for tests
  progress.phaseProgress = (progress.phaseProgress || 0) + amount;

  // Update phase based on effective progress
  const effectiveProgress = progress.phaseProgress || progress.puzzlesSolved;
  const newPhase = calculatePhase(effectiveProgress);
  progress.currentPhase = newPhase;

  progressCache = progress;
  await saveProgress();
  return { puzzles: progress.puzzlesSolved, phase: progress.currentPhase };
}
