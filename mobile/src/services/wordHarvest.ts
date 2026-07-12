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

/**
 * Crash-safe credit ledger entry. When a batch is offered, its amber is moved
 * into this ledger in the SAME write that removes the batch, and stays there
 * until the caller confirms the amber actually landed in the spendable balance
 * (acknowledgeBatchCredit after awardBonusAmber succeeds). An app kill between
 * the offer and the credit can therefore never destroy the amber — the pit
 * screen re-credits un-acknowledged entries on next load via
 * reconcilePendingCredits, and the ledger entry is the dedupe that prevents
 * double-crediting.
 */
export interface PendingCredit {
  /** Credit id: the offered batch's id, or a generated `hc_` id for offer-all sweeps. */
  id: string;
  amber: number;
  createdAt: number;
}

export interface HarvestState {
  pendingBatches: HarvestBatch[];
  /** Amber released from batches but not yet acknowledged as credited. */
  pendingCredits: PendingCredit[];
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
  /**
   * Ledger id for the crash-safe pending credit created by this offer (absent
   * when nothing was offered). Pass to acknowledgeBatchCredit AFTER the amber
   * has been credited via awardBonusAmber.
   */
  creditId?: string;
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
    pendingCredits: [],
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
        // Migrate pre-ledger saves (no pendingCredits field).
        if (!Array.isArray(parsed.pendingCredits)) parsed.pendingCredits = [];
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

/**
 * Drop the in-memory harvest cache so the next read reloads from storage
 * (external writes, e.g. cloud restore; also used by tests to simulate a
 * relaunch mid-flow).
 */
export function invalidateHarvestCache(): void {
  harvestCache = null;
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
export async function enqueueHarvestBatch(batch: HarvestBatch): Promise<{ overflow: boolean }> {
  const state = await loadHarvestState();

  // Deduplicate by ID
  if (state.pendingBatches.some(b => b.id === batch.id)) return { overflow: false };

  // Normalize words
  const normalizedBatch: HarvestBatch = {
    ...batch,
    words: [...new Set(batch.words.map(w => w.toUpperCase()))],
  };

  state.pendingBatches.push(normalizedBatch);

  // If we're over the cap, consolidate the two oldest batches into one rather
  // than dropping the oldest outright. Amber is deferred until offered in the
  // Pit, so trimming a batch would permanently destroy the player's earned (but
  // uncollected) amber. Merging keeps the batch count bounded while preserving
  // every amber point and word. `overflow` is still reported so the UI can nudge
  // the player to visit the Pit and clear the backlog.
  let overflow = false;
  if (state.pendingBatches.length > MAX_PENDING_BATCHES) {
    overflow = true;
    const [oldest, secondOldest, ...rest] = state.pendingBatches;
    const merged: HarvestBatch = {
      ...oldest,
      words: [...new Set([...oldest.words, ...secondOldest.words])],
      amberValue: oldest.amberValue + secondOldest.amberValue,
    };
    state.pendingBatches = [merged, ...rest];
  }

  harvestCache = state;
  await saveHarvestState();
  return { overflow };
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

  // Crash safety: move the batch's amber into the pending-credit ledger in the
  // SAME write that removes the batch (single-write atomicity). If the app is
  // killed before the caller credits + acknowledges, reconcilePendingCredits
  // recovers the amber on next load.
  let creditId: string | undefined;
  if (batch.amberValue > 0) {
    creditId = batch.id;
    state.pendingCredits.push({ id: creditId, amber: batch.amberValue, createdAt: Date.now() });
  }

  harvestCache = state;
  await saveHarvestState();

  return {
    amberAwarded: batch.amberValue,
    wordsOffered: batch.words.length,
    remainingSummary: computeSummary(state.pendingBatches),
    creditId,
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

  // Crash safety: one merged ledger entry for the whole sweep, written in the
  // same save that clears the batches (see offerBatch).
  let creditId: string | undefined;
  if (totalAmber > 0) {
    creditId = generateCreditId();
    state.pendingCredits.push({ id: creditId, amber: totalAmber, createdAt: Date.now() });
  }

  harvestCache = state;
  await saveHarvestState();

  return {
    amberAwarded: totalAmber,
    wordsOffered: totalWords,
    remainingSummary: { pendingAmber: 0, pendingWords: 0, pendingBatches: 0 },
    creditId,
  };
}

/**
 * Acknowledge that a pending credit's amber has landed in the spendable
 * balance (call AFTER awardBonusAmber succeeds). Removes the ledger entry in a
 * single write. Idempotent: acknowledging an unknown/already-cleared id is a
 * no-op.
 */
export async function acknowledgeBatchCredit(creditId: string): Promise<void> {
  const state = await loadHarvestState();
  const index = state.pendingCredits.findIndex(c => c.id === creditId);
  if (index === -1) return;
  state.pendingCredits.splice(index, 1);
  harvestCache = state;
  await saveHarvestState();
}

/**
 * Un-acknowledged pending credits: amber released from batches whose credit
 * never confirmed (app killed between the offer and awardBonusAmber). The pit
 * screen calls this on load, credits each entry, then acknowledges it. Entries
 * are KEPT until acknowledged — the ledger is the double-credit dedupe, so a
 * recovered entry can be credited exactly once.
 */
export async function reconcilePendingCredits(): Promise<PendingCredit[]> {
  const state = await loadHarvestState();
  return [...state.pendingCredits];
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

/** Generate a unique credit-ledger ID (offer-all sweeps, which have no batch id). */
function generateCreditId(): string {
  return `hc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
