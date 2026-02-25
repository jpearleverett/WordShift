import { storage } from './storage';
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

function getDefaultHarvestState(): HarvestState {
  return {
    pendingBatches: [],
    totalWordsOffered: 0,
    totalBatchesOffered: 0,
    totalAmberClaimed: 0,
  };
}

function loadHarvestState(): HarvestState {
  const stored = storage.getString(HARVEST_STORAGE_KEY);
  if (stored !== undefined) {
    const parsed = JSON.parse(stored);
    if (parsed && Array.isArray(parsed.pendingBatches)) {
      return parsed;
    }
  }
  return getDefaultHarvestState();
}

function saveHarvestState(state: HarvestState): void {
  storage.set(HARVEST_STORAGE_KEY, JSON.stringify(state));
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Enqueue a harvest batch from a completed puzzle.
 * Words are normalized to uppercase and deduplicated within the batch.
 */
export function enqueueHarvestBatch(batch: HarvestBatch): { overflow: boolean } {
  const state = loadHarvestState();

  // Deduplicate by ID
  if (state.pendingBatches.some(b => b.id === batch.id)) return { overflow: false };

  // Normalize words
  const normalizedBatch: HarvestBatch = {
    ...batch,
    words: [...new Set(batch.words.map(w => w.toUpperCase()))],
  };

  state.pendingBatches.push(normalizedBatch);

  // Trim oldest if over cap
  let overflow = false;
  if (state.pendingBatches.length > MAX_PENDING_BATCHES) {
    overflow = true;
    state.pendingBatches = state.pendingBatches.slice(-MAX_PENDING_BATCHES);
  }

  saveHarvestState(state);
  return { overflow };
}

/**
 * Get the full harvest state.
 */
export function getHarvestState(): HarvestState {
  return loadHarvestState();
}

/**
 * Get a summary of pending harvest data.
 */
export function getPendingHarvestSummary(): HarvestSummary {
  const state = loadHarvestState();
  return computeSummary(state.pendingBatches);
}

/**
 * Offer a single batch by ID. Returns the amber awarded and updated summary.
 * Returns null if batch not found.
 */
export function offerBatch(batchId: string): OfferResult | null {
  const state = loadHarvestState();
  const index = state.pendingBatches.findIndex(b => b.id === batchId);
  if (index === -1) return null;

  const batch = state.pendingBatches[index];
  state.pendingBatches.splice(index, 1);
  state.totalWordsOffered += batch.words.length;
  state.totalBatchesOffered += 1;
  state.totalAmberClaimed += batch.amberValue;

  saveHarvestState(state);

  return {
    amberAwarded: batch.amberValue,
    wordsOffered: batch.words.length,
    remainingSummary: computeSummary(state.pendingBatches),
  };
}

/**
 * Offer all pending batches at once. Returns total amber awarded and updated summary.
 */
export function offerAllBatches(): OfferResult {
  const state = loadHarvestState();
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

  saveHarvestState(state);

  return {
    amberAwarded: totalAmber,
    wordsOffered: totalWords,
    remainingSummary: { pendingAmber: 0, pendingWords: 0, pendingBatches: 0 },
  };
}

/**
 * Clear all harvest state (for Reset All Data).
 */
export function clearHarvestState(): void {
  storage.remove(HARVEST_STORAGE_KEY);
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
