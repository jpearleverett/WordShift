jest.mock('../services/storage', () =>
  require('./helpers/mockStorage').createMockStorage()
);

import { storage } from '../services/storage';
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
  beforeEach(() => {
    (storage as any).clearAll();
    clearPuzzleState();
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

  it('restores Infinity for undosRemaining when serialized as null', () => {
    const state = makeSavedState({ undosRemaining: Infinity });
    savePuzzleState(state);

    // Manually set undosRemaining to null in storage to simulate Infinity serialization
    // (JSON.stringify(Infinity) === 'null')
    storage.set(
      'wordshift_in_progress_puzzle',
      JSON.stringify({ ...state, undosRemaining: null })
    );

    const loaded = loadPuzzleState();
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
