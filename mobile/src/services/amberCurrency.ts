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
  getMilestoneMessage,
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
    pendingVariantTutorials: [],
    seenVariantTutorials: [],
    preferredPuzzleVariant: 'standard',
    lastVariantPlayed: 'standard',
    sameVariantStreak: 0,
  };
}

// Narrative pacing guardrails: weighted progress can accelerate, but each phase
// still requires a minimum amount of real puzzle exposure.
const MIN_PUZZLES_FOR_PHASE: Record<DialoguePhase, number> = {
  0: 0,
  1: 20,
  2: 65,
  3: 135,
  4: 225,
};

// Variant reward anti-farm decay by consecutive repeats of the same style.
const VARIANT_REPEAT_DECAY = {
  firstTwo: 1.0,
  third: 0.85,
  fourth: 0.7,
  fifthPlus: 0.55,
} as const;

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
  } else if (difficulty === 'MEDIUM_PLUS') {
    multiplier *= NARRATIVE_ACCELERATION.MEDIUM_PLUS_MULTIPLIER;
  } else if (difficulty === 'EASY') {
    multiplier *= NARRATIVE_ACCELERATION.EASY_MULTIPLIER;
  }

  // Challenge mode bonus
  if (gameMode === 'challenge') {
    multiplier *= NARRATIVE_ACCELERATION.CHALLENGE_MULTIPLIER;
  }

  // Cap acceleration to prevent extreme phase skipping
  multiplier = Math.min(multiplier, 3.0);

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
    // Use phase-aware milestone message
    milestoneMessage = getMilestoneMessage(milestone, progress.currentPhase);
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
  let newPhase = calculatePhase(effectiveProgress, progress.puzzlesSolved);
  // Prevent phase skipping — only advance one phase at a time
  if (newPhase > previousPhase + 1) {
    newPhase = (previousPhase + 1) as DialoguePhase;
  }
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

function applyPuzzleExposureGuard(
  candidatePhase: DialoguePhase,
  puzzlesSolved: number
): DialoguePhase {
  let guarded = candidatePhase;
  while (guarded > 0 && puzzlesSolved < MIN_PUZZLES_FOR_PHASE[guarded]) {
    guarded = (guarded - 1) as DialoguePhase;
  }
  return guarded;
}

/**
 * Calculate current dialogue phase based on effective progress.
 * Uses phaseProgress (weighted) and then enforces minimum puzzle exposure.
 */
function calculatePhase(effectiveProgress: number, puzzlesSolved: number): DialoguePhase {
  let candidate: DialoguePhase = 0;
  if (effectiveProgress >= PHASE_THRESHOLDS[4]) candidate = 4;
  else if (effectiveProgress >= PHASE_THRESHOLDS[3]) candidate = 3;
  else if (effectiveProgress >= PHASE_THRESHOLDS[2]) candidate = 2;
  else if (effectiveProgress >= PHASE_THRESHOLDS[1]) candidate = 1;
  return applyPuzzleExposureGuard(candidate, puzzlesSolved);
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
  const nextPuzzleMinimum = MIN_PUZZLES_FOR_PHASE[(currentPhase + 1) as DialoguePhase];
  const effectiveProgress = progress.phaseProgress ?? progress.puzzlesSolved;
  const weightedRemaining = Math.max(0, nextThreshold - effectiveProgress);
  const puzzleRemaining = Math.max(0, nextPuzzleMinimum - progress.puzzlesSolved);
  return Math.max(weightedRemaining, puzzleRemaining);
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
    for (let i = 1; i <= 4; i++) {
      await AsyncStorage.removeItem(`wordshift_guaranteed_crossref_phase_${i}`);
    }
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

// ============================================================================
// RITUAL TRACKING - The incantation ledger
// ============================================================================

/**
 * Record words from a completed puzzle into the ritual ledger.
 * Tracks all words ever formed, trigger words for animal reactions,
 * and accumulated ritual energy.
 *
 * @param words All words from the completed puzzle chain
 * @param ritualEnergy The ritual energy score of this puzzle (0-10)
 * @param triggerWords Notable words that animals may react to
 */
export async function recordRitualWords(
  words: string[],
  ritualEnergy: number,
  triggerWords: string[]
): Promise<{
  totalWordsFormed: number;
  totalRitualEnergy: number;
  triggerWordQueue: string[];
}> {
  const progress = await loadProgress();

  // Initialize ritual tracking fields
  if (!progress.ritualWords) progress.ritualWords = [];
  if (!progress.totalWordsFormed) progress.totalWordsFormed = 0;
  if (!progress.ritualEnergy) progress.ritualEnergy = 0;
  if (!progress.triggerWordQueue) progress.triggerWordQueue = [];

  // Add words to the ritual ledger (keep last 500 words to prevent unbounded growth)
  const upperWords = words.map(w => w.toUpperCase());
  progress.ritualWords.push(...upperWords);
  if (progress.ritualWords.length > 500) {
    progress.ritualWords = progress.ritualWords.slice(-500);
  }

  // Update total count
  progress.totalWordsFormed += words.length;

  // Accumulate ritual energy
  progress.ritualEnergy += ritualEnergy;

  // Add trigger words to queue (keep last 20 for animal reactions)
  progress.triggerWordQueue.push(...triggerWords);
  if (progress.triggerWordQueue.length > 20) {
    progress.triggerWordQueue = progress.triggerWordQueue.slice(-20);
  }

  // Apply ritual energy as bonus to phase progress
  // Each point of ritual energy adds 0.1 to phase progress
  if (ritualEnergy > 0 && progress.phaseProgress !== undefined) {
    progress.phaseProgress += ritualEnergy * 0.1;
  }

  progressCache = progress;
  await saveProgress();

  return {
    totalWordsFormed: progress.totalWordsFormed,
    totalRitualEnergy: progress.ritualEnergy,
    triggerWordQueue: progress.triggerWordQueue,
  };
}

/**
 * Get the ritual ledger - all words the player has formed
 */
export async function getRitualWords(): Promise<string[]> {
  const progress = await loadProgress();
  return progress.ritualWords || [];
}

/**
 * Get total words ever formed
 */
export async function getTotalWordsFormed(): Promise<number> {
  const progress = await loadProgress();
  return progress.totalWordsFormed || 0;
}

/**
 * Get and clear trigger words from the queue for a specific animal.
 * Only consumes words that match the animal's trigger word list,
 * leaving other words in the queue for their respective animals.
 * This way one puzzle with FLAME, WATER, and DIG creates 3 separate
 * animal reactions instead of 1.
 *
 * @param animalType Optional animal type to filter by. If omitted, consumes all (legacy behavior).
 */
export async function consumeTriggerWords(animalType?: string): Promise<string[]> {
  const progress = await loadProgress();
  const queue = progress.triggerWordQueue || [];

  if (!animalType) {
    // Legacy: consume all
    progress.triggerWordQueue = [];
    progressCache = progress;
    await saveProgress();
    return queue;
  }

  // Import the animal's trigger words dynamically to avoid circular deps
  // We access ANIMAL_TRIGGER_WORDS from homeWorld types
  const { ANIMAL_TRIGGER_WORDS } = require('../types/homeWorld');
  const animalTriggers: string[] | undefined = ANIMAL_TRIGGER_WORDS[animalType];
  if (!animalTriggers || animalTriggers.length === 0) {
    return [];
  }

  const triggerSet = new Set(animalTriggers.map((w: string) => w.toUpperCase()));

  // Partition: matching words for this animal vs remaining for others
  const consumed: string[] = [];
  const remaining: string[] = [];
  for (const word of queue) {
    if (triggerSet.has(word.toUpperCase())) {
      consumed.push(word);
    } else {
      remaining.push(word);
    }
  }

  progress.triggerWordQueue = remaining;
  progressCache = progress;
  await saveProgress();
  return consumed;
}

/**
 * Queue a newly encountered variant so an animal can explain it in dialogue.
 * This is one-time per variant key to avoid repetitive tutorial chatter.
 */
export async function recordVariantEncounter(variant: string): Promise<void> {
  if (!variant || variant === 'standard') return;
  const progress = await loadProgress();
  if (!progress.pendingVariantTutorials) progress.pendingVariantTutorials = [];
  if (!progress.seenVariantTutorials) progress.seenVariantTutorials = [];

  if (
    progress.pendingVariantTutorials.includes(variant) ||
    progress.seenVariantTutorials.includes(variant)
  ) {
    return;
  }

  progress.pendingVariantTutorials.push(variant);
  // Keep queue small and focused on recent mechanics.
  if (progress.pendingVariantTutorials.length > 8) {
    progress.pendingVariantTutorials = progress.pendingVariantTutorials.slice(-8);
  }

  progressCache = progress;
  await saveProgress();
}

/**
 * Consume the next pending variant tutorial key.
 * Marks it as seen immediately to prevent repeats.
 */
export async function consumePendingVariantTutorial(): Promise<string | null> {
  const progress = await loadProgress();
  if (!progress.pendingVariantTutorials) progress.pendingVariantTutorials = [];
  if (!progress.seenVariantTutorials) progress.seenVariantTutorials = [];

  const next = progress.pendingVariantTutorials.shift();
  if (!next) {
    return null;
  }

  if (!progress.seenVariantTutorials.includes(next)) {
    progress.seenVariantTutorials.push(next);
  }

  progressCache = progress;
  await saveProgress();
  return next;
}

/**
 * Persist the player's preferred puzzle variant for future runs.
 */
export async function setPreferredPuzzleVariant(variant: string): Promise<void> {
  if (!variant) return;
  const progress = await loadProgress();
  progress.preferredPuzzleVariant = variant;
  progressCache = progress;
  await saveProgress();
}

/**
 * Load the player's preferred puzzle variant key.
 */
export async function getPreferredPuzzleVariant(): Promise<string> {
  const progress = await loadProgress();
  return progress.preferredPuzzleVariant || 'standard';
}

function getVariantRepeatDecay(repeatCount: number): number {
  if (repeatCount <= 2) return VARIANT_REPEAT_DECAY.firstTwo;
  if (repeatCount === 3) return VARIANT_REPEAT_DECAY.third;
  if (repeatCount === 4) return VARIANT_REPEAT_DECAY.fourth;
  return VARIANT_REPEAT_DECAY.fifthPlus;
}

/**
 * Apply variant bonus amber with anti-farming decay on repeated use.
 * Returns updated balance and the actual applied multiplier.
 */
export async function applyVariantAmberBonus(
  variant: string,
  baseAmberAward: number,
  configuredMultiplier: number
): Promise<{
  bonus: number;
  newBalance: number;
  appliedMultiplier: number;
  repeatCount: number;
  repeatDecay: number;
}> {
  const progress = await loadProgress();
  if (progress.lastVariantPlayed === undefined) progress.lastVariantPlayed = 'standard';
  if (progress.sameVariantStreak === undefined) progress.sameVariantStreak = 0;

  if (!variant || variant === 'standard' || configuredMultiplier <= 1.0 || baseAmberAward <= 0) {
    progress.lastVariantPlayed = variant || 'standard';
    progress.sameVariantStreak = 0;
    progressCache = progress;
    await saveProgress();
    return {
      bonus: 0,
      newBalance: progress.amber,
      appliedMultiplier: 1.0,
      repeatCount: 0,
      repeatDecay: 1.0,
    };
  }

  const repeatCount = progress.lastVariantPlayed === variant
    ? (progress.sameVariantStreak || 0) + 1
    : 1;
  const repeatDecay = getVariantRepeatDecay(repeatCount);
  const appliedMultiplier = 1 + ((configuredMultiplier - 1) * repeatDecay);
  const bonus = Math.max(0, Math.round(baseAmberAward * (appliedMultiplier - 1)));

  progress.lastVariantPlayed = variant;
  progress.sameVariantStreak = repeatCount;
  progress.amber += bonus;
  progress.totalAmberEarned += bonus;
  progressCache = progress;
  await saveProgress();

  if (bonus > 0) {
    await recordTransaction({
      amount: bonus,
      type: 'earn',
      source: `variant_${variant}_x${appliedMultiplier.toFixed(2)}`,
      timestamp: Date.now(),
    });
  }

  return {
    bonus,
    newBalance: progress.amber,
    appliedMultiplier,
    repeatCount,
    repeatDecay,
  };
}

/**
 * Get total accumulated ritual energy
 */
export async function getTotalRitualEnergy(): Promise<number> {
  const progress = await loadProgress();
  return progress.ritualEnergy || 0;
}

/**
 * Mark house as completed (all 10 rooms + all 10 animals)
 */
export async function markHouseCompleted(): Promise<void> {
  const progress = await loadProgress();
  progress.houseCompleted = true;
  progressCache = progress;
  await saveProgress();
}

/**
 * Check if house is fully completed
 */
export async function isHouseCompleted(): Promise<boolean> {
  const progress = await loadProgress();
  return progress.houseCompleted === true;
}

/**
 * Mark the final puzzle as completed (deep Phase 4 endgame)
 */
export async function markFinalPuzzleCompleted(): Promise<void> {
  const progress = await loadProgress();
  progress.finalPuzzleCompleted = true;
  progressCache = progress;
  await saveProgress();
}

/**
 * Check if the final puzzle has been completed
 */
export async function isFinalPuzzleCompleted(): Promise<boolean> {
  const progress = await loadProgress();
  return progress.finalPuzzleCompleted === true;
}

/**
 * Mark post-revelation state (Phase 5)
 */
export async function markPostRevelation(): Promise<void> {
  const progress = await loadProgress();
  progress.postRevelation = true;
  progressCache = progress;
  await saveProgress();
}

/**
 * Check if post-revelation (Phase 5) is active
 */
export async function isPostRevelation(): Promise<boolean> {
  const progress = await loadProgress();
  return progress.postRevelation === true;
}

/**
 * Mark tutorial seeds as planted (for Phase 4 callbacks)
 */
export async function markTutorialSeedsPlanted(): Promise<void> {
  const progress = await loadProgress();
  progress.tutorialSeedsPlanted = true;
  progressCache = progress;
  await saveProgress();
}

/**
 * Check if tutorial seeds were planted
 */
export async function wereTutorialSeedsPlanted(): Promise<boolean> {
  const progress = await loadProgress();
  return progress.tutorialSeedsPlanted === true;
}

/**
 * Record a coordinated dialogue event as consumed so it doesn't fire again.
 */
export async function recordConsumedCoordinatedEvent(theme: string): Promise<void> {
  const progress = await loadProgress();
  if (!progress.consumedCoordinatedEvents) {
    progress.consumedCoordinatedEvents = [];
  }
  if (!progress.consumedCoordinatedEvents.includes(theme)) {
    progress.consumedCoordinatedEvents.push(theme);
  }
  progressCache = progress;
  await saveProgress();
}

/**
 * Get consumed coordinated events
 */
export async function getConsumedCoordinatedEvents(): Promise<string[]> {
  const progress = await loadProgress();
  return progress.consumedCoordinatedEvents || [];
}

/**
 * Track whether a guaranteed cross-reference has been shown for a phase.
 * Key: `wordshift_guaranteed_crossref_phase_{phase}`
 */
export async function hasSeenGuaranteedCrossRef(phase: number): Promise<boolean> {
  try {
    const key = `wordshift_guaranteed_crossref_phase_${phase}`;
    const value = await AsyncStorage.getItem(key);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function markGuaranteedCrossRefSeen(phase: number): Promise<void> {
  try {
    const key = `wordshift_guaranteed_crossref_phase_${phase}`;
    await AsyncStorage.setItem(key, 'true');
  } catch {
    // Non-critical
  }
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
  const newPhase = calculatePhase(effectiveProgress, progress.puzzlesSolved);
  progress.currentPhase = newPhase;

  progressCache = progress;
  await saveProgress();
  return { puzzles: progress.puzzlesSolved, phase: progress.currentPhase };
}
