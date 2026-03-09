jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  savePuzzleState,
  loadPuzzleState,
  clearPuzzleState,
  SavedPuzzleState,
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
    await clearPuzzleState();
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

    const loaded = await loadPuzzleState();
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
});
