import { GameState } from '../types';

let hookIndex = 0;
const refStore = new Map<number, { current: unknown }>();
const effectStore = new Map<number, { deps: unknown[]; cleanup?: () => void }>();
jest.mock('react', () => ({
  useRef: (initial: unknown) => {
    const index = hookIndex++;
    if (!refStore.has(index)) refStore.set(index, { current: initial });
    return refStore.get(index);
  },
  useLayoutEffect: (effect: () => void | (() => void)) => effect(),
  useEffect: (effect: () => void | (() => void), deps: unknown[]) => {
    const index = hookIndex++;
    const previous = effectStore.get(index);
    if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
    previous?.cleanup?.();
    const cleanup = effect();
    effectStore.set(index, { deps, cleanup: cleanup || undefined });
  },
}));

jest.mock('../services/puzzleSaveState', () => ({
  savePuzzleState: jest.fn(async () => {}),
  savePuzzleClock: jest.fn(async () => {}),
}));

jest.mock('../services/dailyChallenge', () => ({
  getTodayString: jest.fn(() => '2026-07-14'),
}));

import { useAutosave, AutosaveDeps } from '../hooks/useAutosave';
import { savePuzzleState, savePuzzleClock } from '../services/puzzleSaveState';

describe('useAutosave Unbroken Weave shape', () => {
  beforeEach(() => {
    hookIndex = 0;
    refStore.clear();
    effectStore.clear();
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('persists the active mode and spent character values', () => {
    useAutosave({
      currentScreen: 'puzzle',
      isPlayingDaily: false,
      rows: [],
      activeRowIndex: 1,
      selectedLetter: null,
      gameState: GameState.PLAYING,
      isProcessingVictory: false,
      message: 'The weave holds.',
      history: [],
      invalidAttempts: 0,
      hintsUsed: 0,
      undosRemaining: Infinity,
      difficulty: 'HARD',
      currentWordLength: 5,
      hint: '',
      solution: [],
      reverseSolution: undefined,
      gameMode: 'standard',
      blindMode: false,
      undoLimited: false,
      lexiconMode: false,
  speedMode: false,
      unbrokenWeaveMode: true,
      spentLetters: ['S', 'L'],
      currentVariant: 'standard',
      selectedVariant: 'standard',
      moveDirection: 'down',
      currentPhase: 5,
      lastFormedWord: 'PLAIN',
      doubleShiftPhase: null,
      speedTimeRemaining: null,
      isSharedChallenge: false,
      isFinalBoard: false,
    });

    jest.runOnlyPendingTimers();

    expect(savePuzzleState).toHaveBeenCalledWith(expect.objectContaining({
      unbrokenWeaveMode: true,
      spentLetters: ['S', 'L'],
    }));
  });

  test('does NOT persist while a victory is processing (guards the won-board race)', () => {
    useAutosave({
      currentScreen: 'puzzle',
      isPlayingDaily: false,
      rows: [],
      activeRowIndex: 1,
      selectedLetter: null,
      // gameState still reads PLAYING (App flips to WON only after the async
      // recordVictory), but the victory is being processed — the save must skip.
      gameState: GameState.PLAYING,
      isProcessingVictory: true,
      message: 'The pattern accepts.',
      history: [],
      invalidAttempts: 0,
      hintsUsed: 0,
      undosRemaining: Infinity,
      difficulty: 'HARD',
      currentWordLength: 5,
      hint: '',
      solution: [],
      reverseSolution: undefined,
      gameMode: 'standard',
      blindMode: false,
      undoLimited: false,
      lexiconMode: false,
  speedMode: false,
      unbrokenWeaveMode: false,
      spentLetters: [],
      currentVariant: 'standard',
      selectedVariant: 'standard',
      moveDirection: 'down',
      currentPhase: 5,
      lastFormedWord: 'PLAIN',
      doubleShiftPhase: null,
      speedTimeRemaining: null,
      isSharedChallenge: false,
      isFinalBoard: false,
    });

    jest.runOnlyPendingTimers();

    expect(savePuzzleState).not.toHaveBeenCalled();
  });
  test('clock ticks save only the countdown and keep the full snapshot debounce stable', () => {
    const deps: AutosaveDeps = {
      currentScreen: 'puzzle', isPlayingDaily: false, rows: [{ id: 'board' }], activeRowIndex: 0,
      selectedLetter: null, gameState: GameState.PLAYING, isProcessingVictory: false,
      message: '', history: [], invalidAttempts: 0, hintsUsed: 0, undosRemaining: Infinity,
      difficulty: 'HARD', currentWordLength: 5, hint: '', solution: [], reverseSolution: undefined,
      gameMode: 'standard', blindMode: false, undoLimited: false, lexiconMode: false,
      speedMode: true, unbrokenWeaveMode: false, spentLetters: [], currentVariant: 'standard',
      selectedVariant: 'standard', moveDirection: 'down', currentPhase: 0, lastFormedWord: null,
      doubleShiftPhase: null, speedTimeRemaining: 60, isSharedChallenge: false, isFinalBoard: false,
    };
    useAutosave(deps);
    jest.runOnlyPendingTimers();
    expect(savePuzzleState).toHaveBeenCalledTimes(1);
    hookIndex = 0;
    useAutosave({ ...deps, speedTimeRemaining: 59 });
    jest.runOnlyPendingTimers();
    expect(savePuzzleState).toHaveBeenCalledTimes(1);
    expect(savePuzzleClock).toHaveBeenLastCalledWith(59, 'normal', 'board');
    hookIndex = 0;
    useAutosave({ ...deps, speedTimeRemaining: 59 });
    jest.runOnlyPendingTimers();
    expect(savePuzzleState).toHaveBeenCalledTimes(1);
    expect(savePuzzleClock).toHaveBeenCalledTimes(2);
  });

});
