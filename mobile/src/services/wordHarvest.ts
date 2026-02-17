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
// Constants
// ============================================================================

const STORAGE_KEY = 'wordshift_word_harvest';
const MAX_PENDING_BATCHES = 200;

// ============================================================================
// In-memory cache
// ============================================================================

let harvestCache: HarvestState | null = null;

function getDefaultHarvestState(): HarvestState {
  return {
    pendingBatches: [],
    totalWordsOffered: 0,
    totalBatchesOffered: 0,
    totalAmberClaimed: 0,
  };
}

// ============================================================================
// Persistence
// ============================================================================

async function loadHarvestState(): Promise<HarvestState> {
  if (harvestCache) return harvestCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.pendingBatches)) {
        harvestCache = parsed as HarvestState;
        return harvestCache;
      }
    }
  } catch {
    // Fall through to default
  }
  harvestCache = getDefaultHarvestState();
  return harvestCache;
}

async function saveHarvestState(): Promise<void> {
  if (!harvestCache) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(harvestCache));
  } catch {
    // Non-critical
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

  // Defensive: reject duplicate IDs
  if (state.pendingBatches.some(b => b.id === batch.id)) {
    return;
  }

  // Normalize words
  const normalizedBatch: HarvestBatch = {
    ...batch,
    words: [...new Set(batch.words.map(w => w.toUpperCase()))],
  };

  state.pendingBatches.push(normalizedBatch);

  // Trim oldest if exceeding cap
  if (state.pendingBatches.length > MAX_PENDING_BATCHES) {
    state.pendingBatches = state.pendingBatches.slice(-MAX_PENDING_BATCHES);
  }

  harvestCache = state;
  await saveHarvestState();
}

/**
 * Get current harvest state (full data).
 */
export async function getHarvestState(): Promise<HarvestState> {
  return loadHarvestState();
}

/**
 * Get a summary of pending harvest batches.
 */
export async function getPendingHarvestSummary(): Promise<HarvestSummary> {
  const state = await loadHarvestState();
  return computeSummary(state.pendingBatches);
}

/**
 * Offer a single batch by ID.
 * Returns the amber value that should be credited and remaining summary.
 * The caller is responsible for actually crediting the amber via awardBonusAmber.
 */
export async function offerBatch(batchId: string): Promise<OfferResult | null> {
  const state = await loadHarvestState();
  const idx = state.pendingBatches.findIndex(b => b.id === batchId);
  if (idx === -1) return null;

  const batch = state.pendingBatches[idx];
  state.pendingBatches.splice(idx, 1);
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
 * Offer all pending batches at once.
 * Returns aggregate amber and word counts.
 */
export async function offerAllBatches(): Promise<OfferResult> {
  const state = await loadHarvestState();
  const batches = [...state.pendingBatches];

  let amberAwarded = 0;
  let wordsOffered = 0;

  for (const batch of batches) {
    amberAwarded += batch.amberValue;
    wordsOffered += batch.words.length;
  }

  state.totalWordsOffered += wordsOffered;
  state.totalBatchesOffered += batches.length;
  state.totalAmberClaimed += amberAwarded;
  state.pendingBatches = [];

  harvestCache = state;
  await saveHarvestState();

  return {
    amberAwarded,
    wordsOffered,
    remainingSummary: { pendingAmber: 0, pendingWords: 0, pendingBatches: 0 },
  };
}

/**
 * Clear all harvest state (for Reset All Data).
 */
export async function clearHarvestState(): Promise<void> {
  harvestCache = getDefaultHarvestState();
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Non-critical
  }
}

// ============================================================================
// Helpers
// ============================================================================

function computeSummary(batches: HarvestBatch[]): HarvestSummary {
  let pendingAmber = 0;
  let pendingWords = 0;
  for (const b of batches) {
    pendingAmber += b.amberValue;
    pendingWords += b.words.length;
  }
  return {
    pendingAmber,
    pendingWords,
    pendingBatches: batches.length,
  };
}
