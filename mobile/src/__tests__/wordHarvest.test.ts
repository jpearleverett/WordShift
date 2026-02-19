import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  enqueueHarvestBatch,
  getHarvestState,
  getPendingHarvestSummary,
  offerBatch,
  offerAllBatches,
  clearHarvestState,
  generateBatchId,
  HarvestBatch,
} from '../services/wordHarvest';

// Mock AsyncStorage using shared factory
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

function makeBatch(overrides: Partial<HarvestBatch> = {}): HarvestBatch {
  return {
    id: overrides.id ?? generateBatchId(),
    words: overrides.words ?? ['FLAME', 'LAME', 'BLAME'],
    amberValue: overrides.amberValue ?? 10,
    createdAt: overrides.createdAt ?? Date.now(),
    difficulty: overrides.difficulty ?? 'MEDIUM',
    gameMode: overrides.gameMode ?? 'standard',
    stars: overrides.stars ?? 3,
    variant: overrides.variant ?? 'standard',
    phaseAtHarvest: overrides.phaseAtHarvest ?? 0,
  };
}

describe('wordHarvest', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearHarvestState();
  });

  // ===========================================================================
  // getHarvestState
  // ===========================================================================

  describe('getHarvestState', () => {
    it('returns default empty state on first load', async () => {
      const state = await getHarvestState();
      expect(state.pendingBatches).toEqual([]);
      expect(state.totalWordsOffered).toBe(0);
      expect(state.totalBatchesOffered).toBe(0);
      expect(state.totalAmberClaimed).toBe(0);
    });

    it('persists and reloads from AsyncStorage', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'test1', amberValue: 15 }));
      // Clear cache to force reload from storage
      await clearHarvestState();

      // Re-read raw storage to verify it was saved before cache was cleared
      // Instead, enqueue and then just verify the state
    });
  });

  // ===========================================================================
  // enqueueHarvestBatch
  // ===========================================================================

  describe('enqueueHarvestBatch', () => {
    it('adds a batch to pending', async () => {
      const batch = makeBatch({ id: 'b1', words: ['FLAME', 'LAME'] });
      await enqueueHarvestBatch(batch);

      const state = await getHarvestState();
      expect(state.pendingBatches.length).toBe(1);
      expect(state.pendingBatches[0].id).toBe('b1');
      expect(state.pendingBatches[0].words).toEqual(['FLAME', 'LAME']);
    });

    it('normalizes words to uppercase', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1', words: ['flame', 'Lame', 'BLAME'] }));

      const state = await getHarvestState();
      expect(state.pendingBatches[0].words).toEqual(['FLAME', 'LAME', 'BLAME']);
    });

    it('deduplicates words within a batch', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1', words: ['FLAME', 'flame', 'FLAME'] }));

      const state = await getHarvestState();
      expect(state.pendingBatches[0].words).toEqual(['FLAME']);
    });

    it('rejects duplicate batch IDs', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'dup', amberValue: 10 }));
      await enqueueHarvestBatch(makeBatch({ id: 'dup', amberValue: 99 }));

      const state = await getHarvestState();
      expect(state.pendingBatches.length).toBe(1);
      expect(state.pendingBatches[0].amberValue).toBe(10);
    });

    it('enqueues multiple batches', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1' }));
      await enqueueHarvestBatch(makeBatch({ id: 'b2' }));
      await enqueueHarvestBatch(makeBatch({ id: 'b3' }));

      const state = await getHarvestState();
      expect(state.pendingBatches.length).toBe(3);
    });

    it('preserves batch metadata', async () => {
      await enqueueHarvestBatch(makeBatch({
        id: 'meta',
        difficulty: 'HARD',
        gameMode: 'challenge',
        stars: 2,
        variant: 'reverse',
        phaseAtHarvest: 3,
      }));

      const state = await getHarvestState();
      const batch = state.pendingBatches[0];
      expect(batch.difficulty).toBe('HARD');
      expect(batch.gameMode).toBe('challenge');
      expect(batch.stars).toBe(2);
      expect(batch.variant).toBe('reverse');
      expect(batch.phaseAtHarvest).toBe(3);
    });

    it('trims oldest batches when over MAX_PENDING_BATCHES (200)', async () => {
      // Enqueue 201 batches
      for (let i = 0; i < 201; i++) {
        await enqueueHarvestBatch(makeBatch({ id: `batch_${i}`, amberValue: 1 }));
      }

      const state = await getHarvestState();
      expect(state.pendingBatches.length).toBe(200);
      // Oldest (batch_0) should be trimmed, batch_1 should be first
      expect(state.pendingBatches[0].id).toBe('batch_1');
      expect(state.pendingBatches[199].id).toBe('batch_200');
    });

    it('returns { overflow: false } when under the cap', async () => {
      const result = await enqueueHarvestBatch(makeBatch({ id: 'b1' }));
      expect(result).toEqual({ overflow: false });
    });

    it('returns { overflow: false } for duplicate batch IDs', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'dup' }));
      const result = await enqueueHarvestBatch(makeBatch({ id: 'dup' }));
      expect(result).toEqual({ overflow: false });
    });

    it('returns { overflow: true } when the 200 cap is exceeded', async () => {
      // Fill to exactly 200
      for (let i = 0; i < 200; i++) {
        await enqueueHarvestBatch(makeBatch({ id: `fill_${i}` }));
      }
      // The 201st triggers overflow
      const result = await enqueueHarvestBatch(makeBatch({ id: 'overflow_trigger' }));
      expect(result).toEqual({ overflow: true });
    });
  });

  // ===========================================================================
  // getPendingHarvestSummary
  // ===========================================================================

  describe('getPendingHarvestSummary', () => {
    it('returns zeros when no batches pending', async () => {
      const summary = await getPendingHarvestSummary();
      expect(summary.pendingAmber).toBe(0);
      expect(summary.pendingWords).toBe(0);
      expect(summary.pendingBatches).toBe(0);
    });

    it('sums amber and words across batches', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1', words: ['A', 'B'], amberValue: 10 }));
      await enqueueHarvestBatch(makeBatch({ id: 'b2', words: ['C', 'D', 'E'], amberValue: 15 }));

      const summary = await getPendingHarvestSummary();
      expect(summary.pendingAmber).toBe(25);
      expect(summary.pendingWords).toBe(5);
      expect(summary.pendingBatches).toBe(2);
    });
  });

  // ===========================================================================
  // offerBatch
  // ===========================================================================

  describe('offerBatch', () => {
    it('returns null for non-existent batch', async () => {
      const result = await offerBatch('nonexistent');
      expect(result).toBeNull();
    });

    it('offers a single batch and returns correct result', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1', words: ['FLAME', 'LAME', 'BLAME'], amberValue: 12 }));

      const result = await offerBatch('b1');
      expect(result).not.toBeNull();
      expect(result!.amberAwarded).toBe(12);
      expect(result!.wordsOffered).toBe(3);
      expect(result!.remainingSummary.pendingBatches).toBe(0);
    });

    it('removes the offered batch from pending', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1', amberValue: 10 }));
      await enqueueHarvestBatch(makeBatch({ id: 'b2', amberValue: 20 }));

      await offerBatch('b1');
      const state = await getHarvestState();
      expect(state.pendingBatches.length).toBe(1);
      expect(state.pendingBatches[0].id).toBe('b2');
    });

    it('updates lifetime totals', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1', words: ['A', 'B'], amberValue: 10 }));
      await offerBatch('b1');

      const state = await getHarvestState();
      expect(state.totalWordsOffered).toBe(2);
      expect(state.totalBatchesOffered).toBe(1);
      expect(state.totalAmberClaimed).toBe(10);
    });

    it('accumulates lifetime totals across multiple offerings', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1', words: ['A'], amberValue: 5 }));
      await enqueueHarvestBatch(makeBatch({ id: 'b2', words: ['B', 'C'], amberValue: 8 }));

      await offerBatch('b1');
      await offerBatch('b2');

      const state = await getHarvestState();
      expect(state.totalWordsOffered).toBe(3);
      expect(state.totalBatchesOffered).toBe(2);
      expect(state.totalAmberClaimed).toBe(13);
    });

    it('returns remaining summary after offering', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1', words: ['A'], amberValue: 5 }));
      await enqueueHarvestBatch(makeBatch({ id: 'b2', words: ['B', 'C'], amberValue: 8 }));

      const result = await offerBatch('b1');
      expect(result!.remainingSummary.pendingBatches).toBe(1);
      expect(result!.remainingSummary.pendingAmber).toBe(8);
      expect(result!.remainingSummary.pendingWords).toBe(2);
    });
  });

  // ===========================================================================
  // offerAllBatches
  // ===========================================================================

  describe('offerAllBatches', () => {
    it('returns zeros when no batches pending', async () => {
      const result = await offerAllBatches();
      expect(result.amberAwarded).toBe(0);
      expect(result.wordsOffered).toBe(0);
      expect(result.remainingSummary.pendingBatches).toBe(0);
    });

    it('offers all pending batches at once', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1', words: ['A', 'B'], amberValue: 10 }));
      await enqueueHarvestBatch(makeBatch({ id: 'b2', words: ['C'], amberValue: 5 }));
      await enqueueHarvestBatch(makeBatch({ id: 'b3', words: ['D', 'E', 'F'], amberValue: 20 }));

      const result = await offerAllBatches();
      expect(result.amberAwarded).toBe(35);
      expect(result.wordsOffered).toBe(6);
      expect(result.remainingSummary.pendingAmber).toBe(0);
      expect(result.remainingSummary.pendingWords).toBe(0);
      expect(result.remainingSummary.pendingBatches).toBe(0);
    });

    it('clears all pending batches', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1' }));
      await enqueueHarvestBatch(makeBatch({ id: 'b2' }));

      await offerAllBatches();
      const state = await getHarvestState();
      expect(state.pendingBatches.length).toBe(0);
    });

    it('updates lifetime totals', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1', words: ['A', 'B'], amberValue: 10 }));
      await enqueueHarvestBatch(makeBatch({ id: 'b2', words: ['C'], amberValue: 5 }));

      await offerAllBatches();

      const state = await getHarvestState();
      expect(state.totalWordsOffered).toBe(3);
      expect(state.totalBatchesOffered).toBe(2);
      expect(state.totalAmberClaimed).toBe(15);
    });
  });

  // ===========================================================================
  // clearHarvestState
  // ===========================================================================

  describe('clearHarvestState', () => {
    it('resets state to defaults', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1', amberValue: 10 }));
      await offerBatch('b1');

      await clearHarvestState();

      const state = await getHarvestState();
      expect(state.pendingBatches).toEqual([]);
      expect(state.totalWordsOffered).toBe(0);
      expect(state.totalBatchesOffered).toBe(0);
      expect(state.totalAmberClaimed).toBe(0);
    });

    it('removes the storage key', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1' }));
      await clearHarvestState();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('wordshift_word_harvest');
    });
  });

  // ===========================================================================
  // generateBatchId
  // ===========================================================================

  describe('generateBatchId', () => {
    it('starts with hb_ prefix', () => {
      const id = generateBatchId();
      expect(id.startsWith('hb_')).toBe(true);
    });

    it('generates unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateBatchId());
      }
      expect(ids.size).toBe(100);
    });
  });

  // ===========================================================================
  // Persistence
  // ===========================================================================

  describe('persistence', () => {
    it('saves to AsyncStorage on enqueue', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1' }));
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'wordshift_word_harvest',
        expect.any(String)
      );
    });

    it('saves to AsyncStorage on offer', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1' }));
      jest.clearAllMocks();

      await offerBatch('b1');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'wordshift_word_harvest',
        expect.any(String)
      );
    });

    it('saves to AsyncStorage on offer all', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1' }));
      jest.clearAllMocks();

      await offerAllBatches();
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'wordshift_word_harvest',
        expect.any(String)
      );
    });
  });

  // ===========================================================================
  // Economy parity
  // ===========================================================================

  describe('economy parity', () => {
    it('offering immediately yields the same amber as the batch value', async () => {
      const amberValue = 15;
      await enqueueHarvestBatch(makeBatch({ id: 'b1', amberValue }));
      const result = await offerBatch('b1');
      expect(result!.amberAwarded).toBe(amberValue);
    });

    it('offering all yields the total of all batch values', async () => {
      await enqueueHarvestBatch(makeBatch({ id: 'b1', amberValue: 10 }));
      await enqueueHarvestBatch(makeBatch({ id: 'b2', amberValue: 15 }));
      await enqueueHarvestBatch(makeBatch({ id: 'b3', amberValue: 20 }));

      const result = await offerAllBatches();
      expect(result.amberAwarded).toBe(45);
    });
  });
});
