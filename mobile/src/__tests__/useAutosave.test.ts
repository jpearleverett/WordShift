import { GameState } from '../types';

jest.mock('react', () => ({
  useRef: (initial: unknown) => ({ current: initial }),
  useEffect: (effect: () => void | (() => void)) => effect(),
}));

jest.mock('../services/puzzleSaveState', () => ({
  savePuzzleState: jest.fn(async () => {}),
}));

jest.mock('../services/dailyChallenge', () => ({
  getTodayString: jest.fn(() => '2026-07-14'),
}));

import { useAutosave } from '../hooks/useAutosave';
import { savePuzzleState } from '../services/puzzleSaveState';

describe('useAutosave Unbroken Weave shape', () => {
  beforeEach(() => {
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
});
