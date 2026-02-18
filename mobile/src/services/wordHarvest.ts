import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty, GameMode } from '../types';
import { DialoguePhase } from '../types/homeWorld';
import { PuzzleVariant } from './puzzleVariety';

// ============================================================================
// Types
// ============================================================================

export interface HarvestBatch {
  id: string;
  words: string[];
  amberValue: number;
  createdAt: number;
  difficulty: Difficulty;
  gameMode: GameMode;
  stars: number;
  variant: PuzzleVariant;
  phaseAtHarvest: DialoguePhase;
}

export interface HarvestState {
  pendingBatches: HarvestBatch[];
  totalWordsOffered: number;
  totalBatchesOffered: number;
  totalAmberClaimed: number;
}

export interface HarvestSummary {
  pendingAmber: number;
  pendingWords: number;
  pendingBatches: number;
}

export interface OfferResult {
  amberAwarded: number;
  wordsOffered: number;
  remainingSummary: HarvestSummary;
}

// ============================================================================
// Storage
// ============================================================================

const HARVEST_STORAGE_KEY = 'wordshift_word_harvest';
const MAX_PENDING_BATCHES = 200;

let harvestCache: HarvestState | null = null;

function getDefaultHarvestState(): HarvestState {
  return {
    pendingBatches: [],
    totalWordsOffered: 0,
    totalBatchesOffered: 0,
    totalAmberClaimed: 0,
  };
}

async function loadHarvestState(): Promise<HarvestState> {
  if (harvestCache) return harvestCache;
  try {
    const stored = await AsyncStorage.getItem(HARVEST_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && Array.isArray(parsed.pendingBatches)) {
        harvestCache = parsed;
        return harvestCache!;
      }
    }
  } catch (error) {
    console.warn('Failed to load harvest state:', error);
  }
  harvestCache = getDefaultHarvestState();
  return harvestCache;
}

async function saveHarvestState(): Promise<void> {
  if (!harvestCache) return;
  try {
    await AsyncStorage.setItem(HARVEST_STORAGE_KEY, JSON.stringify(harvestCache));
  } catch (error) {
    console.warn('Failed to save harvest state:', error);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Enqueue a harvest batch from a completed puzzle.
 * Words are normalized to uppercase and deduplicated within the batch.
 */
export async function enqueueHarvestBatch(batch: HarvestBatch): Promise<void> {
  const state = await loadHarvestState();

  // Deduplicate by ID
  if (state.pendingBatches.some(b => b.id === batch.id)) return;

  // Normalize words
  const normalizedBatch: HarvestBatch = {
    ...batch,
    words: [...new Set(batch.words.map(w => w.toUpperCase()))],
  };

  state.pendingBatches.push(normalizedBatch);

  // Trim oldest if over cap
  if (state.pendingBatches.length > MAX_PENDING_BATCHES) {
    state.pendingBatches = state.pendingBatches.slice(-MAX_PENDING_BATCHES);
  }

  harvestCache = state;
  await saveHarvestState();
}

/**
 * Get the full harvest state.
 */
export async function getHarvestState(): Promise<HarvestState> {
  return loadHarvestState();
}

/**
 * Get a summary of pending harvest data.
 */
export async function getPendingHarvestSummary(): Promise<HarvestSummary> {
  const state = await loadHarvestState();
  return computeSummary(state.pendingBatches);
}

/**
 * Offer a single batch by ID. Returns the amber awarded and updated summary.
 * Returns null if batch not found.
 */
export async function offerBatch(batchId: string): Promise<OfferResult | null> {
  const state = await loadHarvestState();
  const index = state.pendingBatches.findIndex(b => b.id === batchId);
  if (index === -1) return null;

  const batch = state.pendingBatches[index];
  state.pendingBatches.splice(index, 1);
  state.totalWordsOffered += batch.words.length;
  state.totalBatchesOffered += 1;
  state.totalAmberClaimed += batch.amberValue;

  harvestCache = state;
  await saveHarvestState();

  return {
    amberAwarded: batch.amberValue,
    wordsOffered: batch.words.length,
    remainingSummary: computeSummary(state.pendingBatches),
  };
}

/**
 * Offer all pending batches at once. Returns total amber awarded and updated summary.
 */
export async function offerAllBatches(): Promise<OfferResult> {
  const state = await loadHarvestState();
  const batches = state.pendingBatches;

  let totalAmber = 0;
  let totalWords = 0;
  for (const batch of batches) {
    totalAmber += batch.amberValue;
    totalWords += batch.words.length;
  }

  state.totalWordsOffered += totalWords;
  state.totalBatchesOffered += batches.length;
  state.totalAmberClaimed += totalAmber;
  state.pendingBatches = [];

  harvestCache = state;
  await saveHarvestState();

  return {
    amberAwarded: totalAmber,
    wordsOffered: totalWords,
    remainingSummary: { pendingAmber: 0, pendingWords: 0, pendingBatches: 0 },
  };
}

/**
 * Clear all harvest state (for Reset All Data).
 */
export async function clearHarvestState(): Promise<void> {
  harvestCache = getDefaultHarvestState();
  try {
    await AsyncStorage.removeItem(HARVEST_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear harvest state:', error);
  }
}

// ============================================================================
// Helpers
// ============================================================================

function computeSummary(batches: HarvestBatch[]): HarvestSummary {
  let pendingAmber = 0;
  let pendingWords = 0;
  for (const batch of batches) {
    pendingAmber += batch.amberValue;
    pendingWords += batch.words.length;
  }
  return {
    pendingAmber,
    pendingWords,
    pendingBatches: batches.length,
  };
}

/**
 * Generate a unique batch ID.
 */
export function generateBatchId(): string {
  return `hb_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
