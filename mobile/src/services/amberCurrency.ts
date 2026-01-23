import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty } from '../types';
import {
  HomeWorldProgress,
  AmberTransaction,
  AMBER_REWARDS,
  PHASE_THRESHOLDS,
  DialoguePhase,
} from '../types/homeWorld';

const PROGRESS_STORAGE_KEY = 'wordshift_home_progress';
const TRANSACTIONS_STORAGE_KEY = 'wordshift_amber_transactions';

// In-memory cache
let progressCache: HomeWorldProgress | null = null;

/**
 * Get default initial progress
 */
function getDefaultProgress(): HomeWorldProgress {
  return {
    amber: 0,
    totalAmberEarned: 0,
    unlockedAnimals: ['red_panda'], // Starter animal
    unlockedRooms: ['bamboo_attic'], // Starter room
    currentPhase: 0,
    puzzlesSolved: 0,
    phasePuzzleThresholds: [...PHASE_THRESHOLDS],
    lastDialogueRead: {},
  };
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
 * Award amber for completing a puzzle
 */
export async function awardPuzzleAmber(
  difficulty: Difficulty,
  starsEarned: number
): Promise<{ amount: number; newBalance: number; phaseChanged: boolean; newPhase: DialoguePhase }> {
  const progress = await loadProgress();

  // Base reward by difficulty
  let amount = AMBER_REWARDS[difficulty];

  // Bonus for 3 stars: +50%
  if (starsEarned === 3) {
    amount = Math.floor(amount * 1.5);
  } else if (starsEarned === 2) {
    // 2 stars: +25%
    amount = Math.floor(amount * 1.25);
  }

  progress.amber += amount;
  progress.totalAmberEarned += amount;
  progress.puzzlesSolved += 1;

  // Check for phase transition
  const previousPhase = progress.currentPhase;
  const newPhase = calculatePhase(progress.puzzlesSolved);
  const phaseChanged = newPhase > previousPhase;
  progress.currentPhase = newPhase;

  // Mark all animals as having new dialogue when phase changes
  if (phaseChanged) {
    // This will be handled by the dialogue service
  }

  progressCache = progress;
  await saveProgress();

  // Record transaction
  await recordTransaction({
    amount,
    type: 'earn',
    source: `puzzle_${difficulty.toLowerCase()}`,
    timestamp: Date.now(),
  });

  return {
    amount,
    newBalance: progress.amber,
    phaseChanged,
    newPhase,
  };
}

/**
 * Spend amber on an unlock
 */
export async function spendAmber(
  amount: number,
  targetId: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
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
 * Calculate current dialogue phase based on puzzles solved
 */
function calculatePhase(puzzlesSolved: number): DialoguePhase {
  if (puzzlesSolved >= PHASE_THRESHOLDS[4]) return 4;
  if (puzzlesSolved >= PHASE_THRESHOLDS[3]) return 3;
  if (puzzlesSolved >= PHASE_THRESHOLDS[2]) return 2;
  if (puzzlesSolved >= PHASE_THRESHOLDS[1]) return 1;
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
