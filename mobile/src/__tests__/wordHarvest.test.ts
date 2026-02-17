import {
  enqueueHarvestBatch,
  getHarvestState,
  getPendingHarvestSummary,
  offerBatch,
  offerAllBatches,
  clearHarvestState,
  HarvestBatch,
} from '../services/wordHarvest';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

function makeBatch(overrides: Partial<HarvestBatch> = {}): HarvestBatch {
  return {
    id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    words: ['FLAME', 'LAME', 'BLAME'],
    amberValue: 15,
    createdAt: Date.now(),
    difficulty: 'MEDIUM',
    gameMode: 'standard',
    stars: 3,
    variant: 'standard',
    phaseAtHarvest: 0,
    ...overrides,
  };
}

beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
  await clearHarvestState();
});

describe('enqueueHarvestBatch', () => {
  test('adds a batch to pending', async () => {
    const batch = makeBatch({ id: 'b1' });
    await enqueueHarvestBatch(batch);

    const state = await getHarvestState();
    expect(state.pendingBatches).toHaveLength(1);
    expect(state.pendingBatches[0].id).toBe('b1');
  });

  test('normalizes words to uppercase and deduplicates', async () => {
    const batch = makeBatch({ id: 'b2', words: ['flame', 'Flame', 'BLAME'] });
    await enqueueHarvestBatch(batch);

    const state = await getHarvestState();
    expect(state.pendingBatches[0].words).toEqual(['FLAME', 'BLAME']);
  });

  test('rejects duplicate batch IDs', async () => {
    const batch = makeBatch({ id: 'dup1' });
    await enqueueHarvestBatch(batch);
    await enqueueHarvestBatch({ ...batch, amberValue: 999 });

    const state = await getHarvestState();
    expect(state.pendingBatches).toHaveLength(1);
    expect(state.pendingBatches[0].amberValue).toBe(15);
  });

  test('trims oldest batches when exceeding MAX_PENDING_BATCHES', async () => {
    // Enqueue 201 batches to exceed the 200 cap
    for (let i = 0; i < 201; i++) {
      await enqueueHarvestBatch(makeBatch({ id: `trim_${i}`, amberValue: i }));
    }

    const state = await getHarvestState();
    expect(state.pendingBatches).toHaveLength(200);
    // Oldest (index 0) should have been trimmed
    expect(state.pendingBatches[0].id).toBe('trim_1');
    expect(state.pendingBatches[199].id).toBe('trim_200');
  });

  test('persists to AsyncStorage', async () => {
    await enqueueHarvestBatch(makeBatch({ id: 'persist1' }));

    const raw = await AsyncStorage.getItem('wordshift_word_harvest');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.pendingBatches).toHaveLength(1);
  });
});

describe('getHarvestState', () => {
  test('returns default state when empty', async () => {
    const state = await getHarvestState();
    expect(state.pendingBatches).toEqual([]);
    expect(state.totalWordsOffered).toBe(0);
    expect(state.totalBatchesOffered).toBe(0);
    expect(state.totalAmberClaimed).toBe(0);
  });
});

describe('getPendingHarvestSummary', () => {
  test('returns zeros when no batches', async () => {
    const summary = await getPendingHarvestSummary();
    expect(summary.pendingAmber).toBe(0);
    expect(summary.pendingWords).toBe(0);
    expect(summary.pendingBatches).toBe(0);
  });

  test('aggregates across multiple batches', async () => {
    await enqueueHarvestBatch(makeBatch({ id: 's1', amberValue: 10, words: ['A', 'B'] }));
    await enqueueHarvestBatch(makeBatch({ id: 's2', amberValue: 20, words: ['C', 'D', 'E'] }));

    const summary = await getPendingHarvestSummary();
    expect(summary.pendingAmber).toBe(30);
    expect(summary.pendingWords).toBe(5);
    expect(summary.pendingBatches).toBe(2);
  });
});

describe('offerBatch', () => {
  test('removes the batch and returns correct result', async () => {
    await enqueueHarvestBatch(makeBatch({ id: 'offer1', amberValue: 25, words: ['X', 'Y'] }));
    await enqueueHarvestBatch(makeBatch({ id: 'offer2', amberValue: 30, words: ['Z'] }));

    const result = await offerBatch('offer1');
    expect(result).not.toBeNull();
    expect(result!.amberAwarded).toBe(25);
    expect(result!.wordsOffered).toBe(2);
    expect(result!.remainingSummary.pendingBatches).toBe(1);
    expect(result!.remainingSummary.pendingAmber).toBe(30);
  });

  test('returns null for non-existent batch ID', async () => {
    const result = await offerBatch('nonexistent');
    expect(result).toBeNull();
  });

  test('increments lifetime totals', async () => {
    await enqueueHarvestBatch(makeBatch({ id: 'lt1', amberValue: 10, words: ['A', 'B'] }));
    await offerBatch('lt1');

    const state = await getHarvestState();
    expect(state.totalWordsOffered).toBe(2);
    expect(state.totalBatchesOffered).toBe(1);
    expect(state.totalAmberClaimed).toBe(10);
  });

  test('accumulates lifetime totals across multiple offers', async () => {
    await enqueueHarvestBatch(makeBatch({ id: 'acc1', amberValue: 10, words: ['A'] }));
    await enqueueHarvestBatch(makeBatch({ id: 'acc2', amberValue: 20, words: ['B', 'C'] }));
    await offerBatch('acc1');
    await offerBatch('acc2');

    const state = await getHarvestState();
    expect(state.totalWordsOffered).toBe(3);
    expect(state.totalBatchesOffered).toBe(2);
    expect(state.totalAmberClaimed).toBe(30);
  });
});

describe('offerAllBatches', () => {
  test('clears all pending batches', async () => {
    await enqueueHarvestBatch(makeBatch({ id: 'all1', amberValue: 10, words: ['A'] }));
    await enqueueHarvestBatch(makeBatch({ id: 'all2', amberValue: 20, words: ['B', 'C'] }));

    const result = await offerAllBatches();
    expect(result.amberAwarded).toBe(30);
    expect(result.wordsOffered).toBe(3);
    expect(result.remainingSummary.pendingBatches).toBe(0);
    expect(result.remainingSummary.pendingAmber).toBe(0);
    expect(result.remainingSummary.pendingWords).toBe(0);
  });

  test('increments lifetime totals', async () => {
    await enqueueHarvestBatch(makeBatch({ id: 'oa1', amberValue: 15, words: ['X', 'Y'] }));
    await enqueueHarvestBatch(makeBatch({ id: 'oa2', amberValue: 25, words: ['Z'] }));

    await offerAllBatches();

    const state = await getHarvestState();
    expect(state.totalWordsOffered).toBe(3);
    expect(state.totalBatchesOffered).toBe(2);
    expect(state.totalAmberClaimed).toBe(40);
  });

  test('returns zeros when no batches pending', async () => {
    const result = await offerAllBatches();
    expect(result.amberAwarded).toBe(0);
    expect(result.wordsOffered).toBe(0);
  });
});

describe('clearHarvestState', () => {
  test('resets all state to defaults', async () => {
    await enqueueHarvestBatch(makeBatch({ id: 'cl1', amberValue: 10, words: ['A'] }));
    await offerBatch('cl1');

    await clearHarvestState();

    const state = await getHarvestState();
    expect(state.pendingBatches).toEqual([]);
    expect(state.totalWordsOffered).toBe(0);
    expect(state.totalBatchesOffered).toBe(0);
    expect(state.totalAmberClaimed).toBe(0);
  });

  test('removes storage key', async () => {
    await enqueueHarvestBatch(makeBatch({ id: 'rm1' }));
    await clearHarvestState();

    const raw = await AsyncStorage.getItem('wordshift_word_harvest');
    expect(raw).toBeNull();
  });
});

describe('persistence', () => {
  test('data is written to AsyncStorage on enqueue', async () => {
    await enqueueHarvestBatch(makeBatch({ id: 'persist_check', amberValue: 42, words: ['HI'] }));

    const raw = await AsyncStorage.getItem('wordshift_word_harvest');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.pendingBatches).toHaveLength(1);
    expect(parsed.pendingBatches[0].amberValue).toBe(42);
    expect(parsed.pendingBatches[0].id).toBe('persist_check');
  });

  test('lifetime stats are persisted after offering', async () => {
    await enqueueHarvestBatch(makeBatch({ id: 'lt_persist', amberValue: 50, words: ['A', 'B'] }));
    await offerBatch('lt_persist');

    const raw = await AsyncStorage.getItem('wordshift_word_harvest');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.totalWordsOffered).toBe(2);
    expect(parsed.totalAmberClaimed).toBe(50);
    expect(parsed.pendingBatches).toHaveLength(0);
  });
});
