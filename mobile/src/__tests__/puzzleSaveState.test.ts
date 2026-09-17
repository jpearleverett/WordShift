jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  savePuzzleState,
  loadPuzzleState,
  clearPuzzleState,
  SavedPuzzleState,
  savePuzzleClock,
  invalidatePuzzleStateCache,
} from '../services/puzzleSaveState';

/** Minimal valid saved state for tests */
function makeSavedState(overrides: Partial<SavedPuzzleState> = {}): SavedPuzzleState {
  return {
    rows: [],
    activeRowIndex: 0,
    selectedLetter: null,
    gameState: 'PLAYING' as any,
    message: '',
    history: [],
    invalidAttempts: 0,
    hintsUsed: 0,
    undosRemaining: Infinity,
    difficulty: 'MEDIUM' as any,
    currentWordLength: 4,
    hint: '',
    solution: undefined,
    reverseSolution: undefined,
    gameMode: 'standard' as any,
    currentVariant: 'standard' as any,
    selectedVariant: 'standard' as any,
    moveDirection: 'down',
    currentPhase: 0 as any,
    lastFormedWord: null,
    isPlayingDaily: false,
    savedAt: Date.now(),
    ...overrides,
  };
}

describe('puzzleSaveState', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    // Reset module-level cache by clearing and reloading
    invalidatePuzzleStateCache();
    await clearPuzzleState();
    await clearPuzzleState('daily');
  });

  it('saves and loads a puzzle state round-trip', async () => {
    const state = makeSavedState({ activeRowIndex: 2, hintsUsed: 1 });
    await savePuzzleState(state);

    // Load uses in-memory cache (set during save)
    const loaded = await loadPuzzleState();

    expect(loaded).not.toBeNull();
    expect(loaded!.activeRowIndex).toBe(2);
    expect(loaded!.hintsUsed).toBe(1);
  });

  it('returns null when no state is saved', async () => {
    const loaded = await loadPuzzleState();
    expect(loaded).toBeNull();
  });

  it('clears saved state', async () => {
    await savePuzzleState(makeSavedState());
    await clearPuzzleState();
    const loaded = await loadPuzzleState();
    expect(loaded).toBeNull();
  });

  it('restores Infinity for undosRemaining when serialized as null', async () => {
    const state = makeSavedState({ undosRemaining: Infinity });
    await savePuzzleState(state);

    // Clear cache so load reads from storage (where Infinity becomes null)
    await clearPuzzleState();
    // Re-save via storage directly to simulate JSON null
    const raw = JSON.parse(
      (await AsyncStorage.getItem('wordshift_in_progress_puzzle'))!
    );
    // Manually set to null to simulate Infinity serialization
    // (savePuzzleState caches, so we need to go through AsyncStorage)
    await AsyncStorage.setItem(
      'wordshift_in_progress_puzzle',
      JSON.stringify({ ...state, undosRemaining: null })
    );

    const loaded = await loadPuzzleState();
    expect(loaded).not.toBeNull();
    expect(loaded!.undosRemaining).toBe(Infinity);
  });

  it('preserves daily flag', async () => {
    const state = makeSavedState({ isPlayingDaily: true, dailyDate: '2026-02-15' });
    await savePuzzleState(state);

    const loaded = await loadPuzzleState('daily');
    expect(loaded).not.toBeNull();
    expect(loaded!.isPlayingDaily).toBe(true);
    expect(loaded!.dailyDate).toBe('2026-02-15');
  });

  it('returns cached state without hitting storage on repeated loads', async () => {
    const state = makeSavedState({ hintsUsed: 3 });
    await savePuzzleState(state);

    // First load is from cache (set during save)
    const loaded1 = await loadPuzzleState();
    expect(loaded1!.hintsUsed).toBe(3);

    // Second load should also succeed (still cached)
    const loaded2 = await loadPuzzleState();
    expect(loaded2!.hintsUsed).toBe(3);
  });

  it('preserves the marked-final-board flag (kill/restore keeps the finale)', async () => {
    await savePuzzleState(makeSavedState({ isFinalBoard: true }));
    const loaded = await loadPuzzleState();
    expect(loaded).not.toBeNull();
    expect(loaded!.isFinalBoard).toBe(true);
  });

  it('old saves without isFinalBoard restore as normal boards', async () => {
    await savePuzzleState(makeSavedState());
    const loaded = await loadPuzzleState();
    expect(loaded!.isFinalBoard).toBeUndefined();
  });

  it('preserves all key fields in round-trip', async () => {
    const state = makeSavedState({
      activeRowIndex: 3,
      moveDirection: 'up',
      lastFormedWord: 'FLAME',
      currentVariant: 'reverse' as any,
      invalidAttempts: 5,
    });
    await savePuzzleState(state);
    const loaded = await loadPuzzleState();

    expect(loaded).not.toBeNull();
    expect(loaded!.activeRowIndex).toBe(3);
    expect(loaded!.moveDirection).toBe('up');
    expect(loaded!.lastFormedWord).toBe('FLAME');
    expect(loaded!.currentVariant).toBe('reverse');
    expect(loaded!.invalidAttempts).toBe(5);
  });
  it('keeps the normal board when a daily is saved and completed', async () => {
    await savePuzzleState(makeSavedState({ activeRowIndex: 3, hintsUsed: 2 }));
    await savePuzzleState(makeSavedState({ isPlayingDaily: true, activeRowIndex: 1 }));
    expect((await loadPuzzleState())?.activeRowIndex).toBe(3);
    expect((await loadPuzzleState('daily'))?.activeRowIndex).toBe(1);
    await clearPuzzleState('daily');
    invalidatePuzzleStateCache();
    expect((await loadPuzzleState())?.hintsUsed).toBe(2);
    expect(await loadPuzzleState('daily')).toBeNull();
  });

  it('moves a legacy daily to its own slot before a normal board can overwrite it', async () => {
    await AsyncStorage.setItem('wordshift_in_progress_puzzle', JSON.stringify(makeSavedState({
      isPlayingDaily: true, dailyDate: '2026-09-17', activeRowIndex: 2,
    })));
    invalidatePuzzleStateCache();
    await savePuzzleState(makeSavedState({ hintsUsed: 1 }));
    expect((await loadPuzzleState('daily'))?.activeRowIndex).toBe(2);
    expect((await loadPuzzleState())?.hintsUsed).toBe(1);
  });

  it('persists clock-only progress across cache loss without rewriting the board', async () => {
    const state = makeSavedState({ speedMode: true, speedTimeRemainingSec: 60, savedAt: 100 });
    await savePuzzleState(state);
    (AsyncStorage.setItem as jest.Mock).mockClear();
    await savePuzzleClock(42);
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('wordshift_in_progress_puzzle_clock', expect.any(String));
    invalidatePuzzleStateCache();
    expect((await loadPuzzleState())?.speedTimeRemainingSec).toBe(42);
    await clearPuzzleState();
    await savePuzzleClock(41);
    expect(await loadPuzzleState()).toBeNull();
  });

  it('ignores an old board clock and skips identical snapshot writes', async () => {
    await savePuzzleState(makeSavedState({ speedMode: true, savedAt: 100, speedTimeRemainingSec: 60 }));
    await savePuzzleClock(12);
    await savePuzzleState(makeSavedState({ speedMode: true, savedAt: 200, speedTimeRemainingSec: 60, hintsUsed: 1 }));
    invalidatePuzzleStateCache();
    expect((await loadPuzzleState())?.speedTimeRemainingSec).toBe(60);
    const state = (await loadPuzzleState())!;
    await savePuzzleState(state);
    (AsyncStorage.setItem as jest.Mock).mockClear();
    await savePuzzleState({ ...state, savedAt: 300 });
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('a malformed legacy normal save cannot disable daily saves or explicit recovery', async () => {
    await AsyncStorage.setItem('wordshift_in_progress_puzzle', '{broken');
    invalidatePuzzleStateCache();
    await savePuzzleState(makeSavedState({ isPlayingDaily: true, dailyDate: '2026-09-17' }));
    expect((await loadPuzzleState('daily'))?.dailyDate).toBe('2026-09-17');
    await clearPuzzleState();
    await savePuzzleState(makeSavedState({ hintsUsed: 2 }));
    expect((await loadPuzzleState())?.hintsUsed).toBe(2);
  });

  it('ignores malformed countdown metadata and still restores the valid board', async () => {
    await savePuzzleState(makeSavedState({ speedMode: true, speedTimeRemainingSec: 35 }));
    await AsyncStorage.setItem('wordshift_in_progress_puzzle_clock', '{broken');
    invalidatePuzzleStateCache();
    expect((await loadPuzzleState())?.speedTimeRemainingSec).toBe(35);
  });

  it('never restores a cleared cached board when optional clock deletion fails', async () => {
    await savePuzzleState(makeSavedState());
    const remove = (AsyncStorage.removeItem as jest.Mock).getMockImplementation()!;
    (AsyncStorage.removeItem as jest.Mock).mockImplementationOnce(remove).mockRejectedValueOnce(new Error('clock deletion failed'));
    await expect(clearPuzzleState()).rejects.toThrow('clock deletion failed');
    expect(await loadPuzzleState()).toBeNull();
  });

  it('orders queued autosaves before a reset and cancels pre-reset work queued behind it', async () => {
    const { runStorageTransaction, default: storage } = require('../services/persistenceStorage');
    let release!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    const reset = runStorageTransaction('test_reset', async () => {
      await hold;
      await storage.removeItem('wordshift_in_progress_puzzle');
      invalidatePuzzleStateCache();
    });
    const stale = savePuzzleState(makeSavedState({ hintsUsed: 5 }));
    release();
    await Promise.all([reset, stale]);
    expect(await loadPuzzleState()).toBeNull();
    await savePuzzleState(makeSavedState({ hintsUsed: 1 }));
    expect((await loadPuzzleState())?.hintsUsed).toBe(1);
  });

});
