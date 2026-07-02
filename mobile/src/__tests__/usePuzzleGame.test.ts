/**
 * Tests for usePuzzleGame hook.
 *
 * Since we run in a Node test environment without a React renderer,
 * we mock React hooks to work synchronously and call the hook directly.
 */

import { GameState, Letter } from '../types';

// --- Mock React hooks to run synchronously in Node ---
const stateStore: Map<number, unknown> = new Map();
let stateIndex = 0;
const refStore: Map<number, { current: unknown }> = new Map();
let refIndex = 0;

function resetHookState() {
  stateStore.clear();
  refStore.clear();
  stateIndex = 0;
  refIndex = 0;
  effectCallbacks = [];
}

function rewindHookIndices() {
  stateIndex = 0;
  refIndex = 0;
}

let effectCallbacks: Array<() => void> = [];

jest.mock('react', () => ({
  useState: (initial: unknown) => {
    const idx = stateIndex++;
    if (!stateStore.has(idx)) {
      stateStore.set(idx, initial);
    }
    const value = stateStore.get(idx);
    const setter = (valOrFn: unknown) => {
      if (typeof valOrFn === 'function') {
        stateStore.set(idx, (valOrFn as (prev: unknown) => unknown)(stateStore.get(idx)));
      } else {
        stateStore.set(idx, valOrFn);
      }
    };
    return [value, setter];
  },
  useEffect: (fn: () => void, _deps: unknown[]) => {
    effectCallbacks.push(fn);
  },
  useRef: (initial: unknown) => {
    const idx = refIndex++;
    if (!refStore.has(idx)) {
      refStore.set(idx, { current: initial });
    }
    return refStore.get(idx)!;
  },
  useCallback: (fn: Function, _deps: unknown[]) => fn,
  useMemo: (fn: Function, _deps: unknown[]) => fn(),
}));

// --- Mock dependencies ---
jest.mock('../services/localGenerator', () => ({
  generateLocalPuzzle: jest.fn(async () => ({
    words: ['LIME', 'TIME', 'TIED', 'TEND'],
    hint: 'Test hint',
    solution: [
      { stepIndex: 0, sourceWord: 'LIME', targetWord: 'TIME', letterToMove: 'L', explanation: 'test' },
      { stepIndex: 1, sourceWord: 'TIME', targetWord: 'TIED', letterToMove: 'M', explanation: 'test' },
      { stepIndex: 2, sourceWord: 'TIED', targetWord: 'TEND', letterToMove: 'I', explanation: 'test' },
    ],
    wordLength: 4,
  })),
  getIncantationName: jest.fn(() => null),
}));

jest.mock('../services/phaseNarrative', () => ({
  getMoveMessage: jest.fn(() => 'Nice move!'),
  getComboMoveMessage: jest.fn((_s: number, _p: number) => 'Combo!'),
  getHintMessage: jest.fn((_l: string, _w: string, _p: number) => 'Hint: move letter'),
  getHintFallback: jest.fn(() => 'Try undoing!'),
  getOutOfHintsMessage: jest.fn((_p: number) => 'Out of hints!'),
  getLoadingMessage: jest.fn(() => 'Loading...'),
  getStartMessage: jest.fn(() => 'Tap a tile to begin!'),
  getInvalidWordMessage: jest.fn((word: string, _p: number) => `${word} isn't a word!`),
  getLockedLetterMessage: jest.fn((_p: number) => 'That letter is locked!'),
  getNoValidMovesMessage: jest.fn((_p: number) => 'No words fit from here! Undo a move or clear the board to try a fresh path.'),
}));

jest.mock('../services/hints', () => ({
  getHintBalanceSync: jest.fn(() => 5),
  hasHintSync: jest.fn(() => true),
  consumeHintSync: jest.fn(() => true),
}));

jest.mock('../services/amberCurrency', () => ({
  getPreferredPuzzleVariant: jest.fn(async () => 'standard'),
  setPreferredPuzzleVariant: jest.fn(async () => {}),
  getFullProgress: jest.fn(async () => ({ puzzlesSolved: 10 })),
}));

// Mock puzzleBank to return null — tests exercise the generation path
jest.mock('../services/puzzleBank', () => ({
  selectPreGeneratedPuzzle: jest.fn(async () => null),
}));

// COMMON_WORDS needs to contain all words used in the test puzzle chain
// and the valid words formed during moves
jest.mock('../constants', () => ({
  COMMON_WORDS: new Set([
    'LIME', 'TIME', 'TIED', 'TEND', 'TIE', 'TIMED',
    'IME', 'LIED', 'LED', 'LET', 'TILE', 'MILE',
    'MET', 'TEN', 'TEND', 'DENT', 'NET',
    // Fallback puzzles
    'SUIT', 'SITE', 'WHAT', 'HERE', 'SCRAP', 'THERE', 'LATER', 'TIMES', 'THEIR',
    // Curated puzzle words
    'GLOW', 'ABLE', 'EACH',
    // Synthetic chain for multi-move tests: ABCD → EFGH → IJKL
    // (move A down forming AEFGH, then E down forming EIJKL)
    'BCD', 'AEFGH', 'AFGH', 'EIJKL',
    // Synthetic double-shift step: ABCDE → FGHIJ (move A then B → ABFGHIJ)
    'CDE', 'ABFGHIJ',
  ]),
  CURATED_EARLY_PUZZLES: [
    { words: ['GLOW', 'ABLE', 'EACH'], solution: [
      { stepIndex: 0, sourceWord: 'GLOW', targetWord: 'ABLE', letterToMove: 'G', explanation: '' },
      { stepIndex: 1, sourceWord: 'ABLE', targetWord: 'EACH', letterToMove: 'B', explanation: '' },
    ] },
  ],
  CURATED_PUZZLE_COUNT: 1,
  getRandomFallback: (difficulty: string) => {
    if (difficulty === 'HARD') return ['SCRAP', 'THERE', 'LATER', 'TIMES', 'THEIR'];
    if (difficulty === 'EASY') return ['SUIT', 'SITE', 'WHAT'];
    return ['SUIT', 'SITE', 'WHAT', 'HERE'];
  },
}));

import { usePuzzleGame, hasAnyValidMove, canCompleteDoubleShift, hasAnyValidDoubleShiftMove, PuzzleGameState, PuzzleGameActions } from '../hooks/usePuzzleGame';

/**
 * Helper: call usePuzzleGame with fresh hook indices (simulates a re-render).
 * Must call resetHookState() before first call to initialize.
 */
function callHook(): [PuzzleGameState, PuzzleGameActions] {
  rewindHookIndices();
  // eslint-disable-next-line react-hooks/rules-of-hooks -- test harness drives the hook against a manual React mock
  return usePuzzleGame();
}

describe('usePuzzleGame', () => {
  beforeEach(() => {
    resetHookState();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initGame', () => {
    test('sets rows from provided words', () => {
      let [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']);

      const [state] = callHook();
      expect(state.rows).toHaveLength(3);
      expect(state.rows[0].originalWord).toBe('LIME');
      expect(state.rows[1].originalWord).toBe('TIME');
      expect(state.rows[2].originalWord).toBe('TIED');
    });

    test('sets gameState to PLAYING', () => {
      let [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']);

      const [state] = callHook();
      expect(state.gameState).toBe(GameState.PLAYING);
    });

    test('resets counters on init', () => {
      let [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']);

      const [state] = callHook();
      expect(state.invalidAttempts).toBe(0);
      expect(state.hintsUsed).toBe(0);
      expect(state.earnedStars).toBe(0);
      expect(state.activeRowIndex).toBe(0);
      expect(state.selectedLetter).toBeNull();
      expect(state.history).toEqual([]);
    });

    test('creates Letter objects from word characters', () => {
      let [, actions] = callHook();
      actions.initGame(['CAT', 'BAT']);

      const [state] = callHook();
      expect(state.rows[0].words).toHaveLength(3);
      expect(state.rows[0].words[0].char).toBe('C');
      expect(state.rows[0].words[1].char).toBe('A');
      expect(state.rows[0].words[2].char).toBe('T');
      expect(state.rows[0].words[0].isLocked).toBe(false);
    });

    test('stores solution and hint', () => {
      const solution = [
        { stepIndex: 0, sourceWord: 'CAT', targetWord: 'BAT', letterToMove: 'C', explanation: 'test' },
      ];
      let [, actions] = callHook();
      actions.initGame(['CAT', 'BAT'], 'Test hint', solution);

      const [state] = callHook();
      expect(state.hint).toBe('Test hint');
      expect(state.solution).toBe(solution);
    });

    test('sets word length', () => {
      let [, actions] = callHook();
      actions.initGame(['STORE', 'ROUTE'], undefined, undefined, 5);

      const [state] = callHook();
      expect(state.currentWordLength).toBe(5);
    });
  });

  describe('startDailyGame', () => {
    test('starts a standard, playable board from the daily words', () => {
      let [, actions] = callHook();
      actions.startDailyGame(['PLANET', 'PLATES', 'PLANES'], 'daily hint', 6);

      const [state] = callHook();
      expect(state.rows).toHaveLength(3);
      expect(state.rows[0].originalWord).toBe('PLANET');
      expect(state.gameState).toBe(GameState.PLAYING);
      expect(state.currentWordLength).toBe(6);
      expect(state.currentVariant).toBe('standard');
      expect(state.hint).toBe('daily hint');
    });

    test('uses standard mode with unlimited undos even after challenge mode', () => {
      let [, actions] = callHook();
      // Simulate the player having been in challenge mode previously.
      actions.setGameMode('challenge');
      actions.startDailyGame(['PLANET', 'PLATES'], undefined, 6);

      const [state] = callHook();
      expect(state.gameMode).toBe('standard');
      expect(state.undosRemaining).toBe(Infinity);
    });
  });

  describe('handleLetterPress', () => {
    function setupGameWithLetters() {
      resetHookState();
      const [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']);
      return callHook();
    }

    test('selects a letter from the active row', () => {
      let [state, actions] = setupGameWithLetters();
      const letter = state.rows[0].words[0]; // 'L'
      actions.handleLetterPress(letter, 0);

      [state] = callHook();
      expect(state.selectedLetter).not.toBeNull();
      expect(state.selectedLetter!.char).toBe('L');
    });

    test('deselects when pressing the same letter again', () => {
      let [state, actions] = setupGameWithLetters();
      const letter = state.rows[0].words[0];
      actions.handleLetterPress(letter, 0);

      [state, actions] = callHook();
      expect(state.selectedLetter).not.toBeNull();

      // Press same letter again to deselect
      actions.handleLetterPress(letter, 0);
      [state] = callHook();
      expect(state.selectedLetter).toBeNull();
    });

    test('ignores press on non-active row', () => {
      let [state, actions] = setupGameWithLetters();
      const letter = state.rows[1].words[0]; // Row 1, but active is row 0
      actions.handleLetterPress(letter, 1);

      [state] = callHook();
      expect(state.selectedLetter).toBeNull();
    });

    test('rejects locked letters with error', () => {
      let [state, actions] = setupGameWithLetters();
      const lockedLetter: Letter = { id: 'locked_1', char: 'X', isLocked: true };
      actions.handleLetterPress(lockedLetter, 0);

      [state] = callHook();
      // selectedLetter should remain null
      expect(state.selectedLetter).toBeNull();
      // error should be set (via shakeError)
      expect(state.error).toBe("That letter is locked!");
    });

    test('ignores press when game state is not PLAYING', () => {
      resetHookState();
      const [, actions] = callHook();
      // Don't init game, so gameState is IDLE
      let [state] = callHook();
      expect(state.gameState).toBe(GameState.IDLE);

      const fakeLetter: Letter = { id: 'fake', char: 'A', isLocked: false };
      actions.handleLetterPress(fakeLetter, 0);
      [state] = callHook();
      expect(state.selectedLetter).toBeNull();
    });

  });

  describe('handleSlotPress', () => {
    test('returns null when no letter is selected', async () => {
      resetHookState();
      const [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']);

      const [, actions2] = callHook();
      const result = await actions2.handleSlotPress(0);
      expect(result).toBeNull();
    });

    test('increments invalidAttempts on invalid source word', async () => {
      resetHookState();
      let [, actions] = callHook();
      // Use words from COMMON_WORDS set. LIME and TIME are there.
      actions.initGame(['LIME', 'TIME', 'TIED']);

      let [state] = callHook();
      const letter = state.rows[0].words[0]; // 'L'

      // Select letter
      [, actions] = callHook();
      actions.handleLetterPress(letter, 0);

      // Now drop: removing 'L' from LIME gives IME, inserting at pos 0 gives LIME again
      // Actually: removing L from LIME = IME (3 letters). That's the source word.
      // The source word should have expectedSourceLength = currentWordLength - 1 = 3
      // IME is not in COMMON_WORDS, so it should be invalid
      [state, actions] = callHook();
      const result = await actions.handleSlotPress(0);

      // It returns null (invalid), and invalidAttempts should have incremented
      expect(result).toBeNull();
      const [finalState] = callHook();
      expect(finalState.invalidAttempts).toBe(1);
    });

    test('returns null when gameState is not PLAYING', async () => {
      resetHookState();
      const [, actions] = callHook();
      // gameState is IDLE (never initialized)
      const result = await actions.handleSlotPress(0);
      expect(result).toBeNull();
    });

    test('supports reverse mode down-and-back completion', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['TIME', 'TIED'], undefined, undefined, 4, 'reverse');

      // Descend: move M from TIME to TIED -> TIE and TIMED
      let [state] = callHook();
      const m = state.rows[0].words.find(l => l.char === 'M')!;
      [, actions] = callHook();
      actions.handleLetterPress(m, 0);
      [, actions] = callHook();
      const first = await actions.handleSlotPress(2);
      expect(first?.completed).toBe(false);

      [state] = callHook();
      expect(state.moveDirection).toBe('up');
      expect(state.activeRowIndex).toBe(1);

      // Return: move D from TIMED back to TIE -> TIME and TIED
      const d = state.rows[1].words.find(l => l.char === 'D')!;
      [, actions] = callHook();
      actions.handleLetterPress(d, 1);
      [, actions] = callHook();
      const second = await actions.handleSlotPress(3);
      expect(second?.completed).toBe(true);
      expect(second?.variant).toBe('reverse');
    });

  });

  describe('resetCurrentPuzzle', () => {
    test('restores the starting board and clears transient selection', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']);

      // Pick up a letter (transient state that a reset should discard)
      let [state] = callHook();
      const letter = state.rows[0].words[0];
      [, actions] = callHook();
      actions.handleLetterPress(letter, 0);

      [state] = callHook();
      expect(state.selectedLetter).not.toBeNull();

      [, actions] = callHook();
      actions.resetCurrentPuzzle();

      [state] = callHook();
      expect(state.gameState).toBe(GameState.PLAYING);
      expect(state.selectedLetter).toBeNull();
      expect(state.rows.map(r => r.originalWord)).toEqual(['LIME', 'TIME', 'TIED']);
      expect(state.rows[0].words.map(l => l.char).join('')).toBe('LIME');
    });

    test('preserves performance counters so a reset cannot game the star rating', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']);

      // Make an invalid move to bump invalidAttempts (removing L from LIME -> IME is invalid)
      let [state] = callHook();
      const letter = state.rows[0].words[0]; // 'L'
      [, actions] = callHook();
      actions.handleLetterPress(letter, 0);
      [, actions] = callHook();
      await actions.handleSlotPress(0);

      let [afterMove] = callHook();
      expect(afterMove.invalidAttempts).toBe(1);

      [, actions] = callHook();
      actions.resetCurrentPuzzle();

      const [afterReset] = callHook();
      expect(afterReset.invalidAttempts).toBe(1);
      expect(afterReset.gameState).toBe(GameState.PLAYING);
    });

    test('is a no-op when there is no active board', () => {
      resetHookState();
      const [, actions] = callHook();
      // Never initialized — gameState IDLE, no rows
      actions.resetCurrentPuzzle();
      const [state] = callHook();
      expect(state.rows).toHaveLength(0);
      expect(state.gameState).toBe(GameState.IDLE);
    });
  });

  describe('handleHint', () => {
    test('increments hintsUsed when solution step matches', () => {
      resetHookState();
      let [, actions] = callHook();
      const solution = [
        { stepIndex: 0, sourceWord: 'LIME', targetWord: 'TIME', letterToMove: 'L', explanation: 'test' },
      ];
      actions.initGame(['LIME', 'TIME'], undefined, solution);

      let [state] = callHook();
      expect(state.hintsUsed).toBe(0);

      [, actions] = callHook();
      actions.handleHint();

      [state] = callHook();
      expect(state.hintsUsed).toBe(1);
    });

    test('out of hints raises the signal and does not spend a hint', () => {
      resetHookState();
      // Empty hint balance for this call only.
      require('../services/hints').hasHintSync.mockReturnValueOnce(false);
      let [, actions] = callHook();
      actions.initGame(['LIME', 'TIME'], undefined, [
        { stepIndex: 0, sourceWord: 'LIME', targetWord: 'TIME', letterToMove: 'L', explanation: 'test' },
      ]);

      let [state] = callHook();
      const signalBefore = state.outOfHintsSignal;

      [, actions] = callHook();
      actions.handleHint();

      [state] = callHook();
      expect(state.hintsUsed).toBe(0); // no hint delivered
      expect(state.outOfHintsSignal).toBe(signalBefore + 1);
    });

    test('blocked in challenge mode', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.setGameMode('challenge');

      [, actions] = callHook();
      actions.initGame(['LIME', 'TIME'], undefined, [
        { stepIndex: 0, sourceWord: 'LIME', targetWord: 'TIME', letterToMove: 'L', explanation: 'test' },
      ]);

      let [state] = callHook();
      expect(state.hintsUsed).toBe(0);

      [, actions] = callHook();
      actions.handleHint();

      [state] = callHook();
      // hintsUsed should remain 0 since challenge mode blocks hints
      expect(state.hintsUsed).toBe(0);
      expect(state.error).toBe("No hints in Challenge Mode!");
    });

    test('does not increment when game is not PLAYING', () => {
      resetHookState();
      let [, actions] = callHook();
      // gameState is IDLE, handleHint should be a no-op
      actions.handleHint();

      const [state] = callHook();
      expect(state.hintsUsed).toBe(0);
    });
  });

  describe('handleUndo', () => {
    test('does nothing when history is empty', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']);

      let [state] = callHook();
      expect(state.history).toHaveLength(0);

      [, actions] = callHook();
      actions.handleUndo();

      [state] = callHook();
      // No change expected
      expect(state.history).toHaveLength(0);
    });

    test('limited in challenge mode (undosRemaining decrements)', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.setGameMode('challenge');

      [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']);

      let [state] = callHook();
      // Challenge mode gives 2 undos for EASY difficulty (4-letter words)
      expect(state.undosRemaining).toBe(2);
    });

    test('challenge mode blocks undo when undosRemaining is 0', () => {
      resetHookState();
      let [state, actions] = callHook();
      actions.setGameMode('challenge');

      [state, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']);

      // undosRemaining starts at 2 in challenge mode for EASY difficulty (4-letter words)
      [state, actions] = callHook();
      expect(state.undosRemaining).toBe(2);
      expect(state.gameMode).toBe('challenge');
    });
  });

  describe('setCurrentPhase', () => {
    test('updates currentPhase', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.setCurrentPhase(3);

      const [state] = callHook();
      expect(state.currentPhase).toBe(3);
    });
  });

  describe('setGameMode', () => {
    test('updates gameMode', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.setGameMode('challenge');

      const [state] = callHook();
      expect(state.gameMode).toBe('challenge');
    });

    test('defaults to standard', () => {
      resetHookState();
      const [state] = callHook();
      expect(state.gameMode).toBe('standard');
    });
  });

  describe('startNewGame', () => {
    test('calls generateLocalPuzzle and initializes game', async () => {
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('MEDIUM');

      const [state] = callHook();
      expect(state.rows).toHaveLength(4);
      expect(state.gameState).toBe(GameState.PLAYING);
      expect(state.rows[0].originalWord).toBe('LIME');
    });

    test('uses fallback on generation failure', async () => {
      const { generateLocalPuzzle } = require('../services/localGenerator');
      (generateLocalPuzzle as jest.Mock).mockRejectedValueOnce(new Error('timeout'));

      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('MEDIUM');

      const [state] = callHook();
      // Should fall back to FALLBACK_PUZZLE
      expect(state.rows).toHaveLength(4);
      expect(state.gameState).toBe(GameState.PLAYING);
    });

    test('uses selected variant for new puzzles', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.setSelectedVariant('speed');
      [, actions] = callHook();
      await actions.startNewGame('MEDIUM');

      const [state] = callHook();
      expect(state.currentVariant).toBe('speed');
      expect(state.selectedVariant).toBe('speed');
    });
  });

  describe('initial state', () => {
    test('has correct defaults', () => {
      resetHookState();
      const [state] = callHook();
      expect(state.gameState).toBe(GameState.IDLE);
      expect(state.rows).toEqual([]);
      expect(state.selectedLetter).toBeNull();
      expect(state.activeRowIndex).toBe(0);
      expect(state.invalidAttempts).toBe(0);
      expect(state.hintsUsed).toBe(0);
      expect(state.earnedStars).toBe(0);
      expect(state.gameMode).toBe('standard');
      expect(state.currentPhase).toBe(0);
      expect(state.difficulty).toBe('MEDIUM');
      expect(state.showRules).toBe(false);
      expect(state.showConfetti).toBe(false);
    });
  });

  // =========================================================================
  // Stuck detection (pure helper)
  // =========================================================================

  describe('hasAnyValidMove', () => {
    const makeRow = (word: string, lockedIndices: number[] = []) => ({
      id: `row_${word}`,
      originalWord: word,
      words: word.split('').map((char, i) => ({
        id: `${word}_${i}`,
        char,
        isLocked: lockedIndices.includes(i),
      })),
    });

    const validator = (words: string[]) => {
      const set = new Set(words);
      return (w: string) => set.has(w);
    };

    test('returns true when a letter can shift down to form valid words', () => {
      // Moving M from TIME leaves TIE (valid) and inserting into TIED forms TIMED (valid)
      const rows = [makeRow('TIME'), makeRow('TIED')];
      expect(hasAnyValidMove(rows, 0, 'down', validator(['TIE', 'TIMED']))).toBe(true);
    });

    test('returns false when no target insertion forms a valid word', () => {
      // TIE is a valid source remainder, but no insertion of M into TIED is valid
      const rows = [makeRow('TIME'), makeRow('TIED')];
      expect(hasAnyValidMove(rows, 0, 'down', validator(['TIE', 'TIM', 'IME', 'TME']))).toBe(false);
    });

    test('returns false when the only workable letter is locked', () => {
      // M (index 2) would yield TIE + TIMED, but it is locked
      const rows = [makeRow('TIME', [2]), makeRow('TIED')];
      expect(hasAnyValidMove(rows, 0, 'down', validator(['TIE', 'TIMED']))).toBe(false);
    });

    test('checks the row above when moving up', () => {
      // Up leg: source TIMED (row 1), target TIE (row 0); M removal gives TIED + TIME
      const rows = [makeRow('TIE'), makeRow('TIMED')];
      expect(hasAnyValidMove(rows, 1, 'up', validator(['TIED', 'TIME']))).toBe(true);
    });

    test('returns false when the target row is out of bounds', () => {
      const rows = [makeRow('TIME'), makeRow('TIED')];
      expect(hasAnyValidMove(rows, 1, 'down', validator(['TIE', 'TIMED']))).toBe(false);
    });
  });

  // =========================================================================
  // Double-shift look-ahead (drop1 guidance + stuck detection)
  // =========================================================================

  describe('double-shift look-ahead', () => {
    const makeRow = (word: string, lockedIndices: number[] = []) => ({
      id: `row_${word}`,
      originalWord: word,
      words: word.split('').map((char, i) => ({
        id: `${word}_${i}`,
        char,
        isLocked: lockedIndices.includes(i),
      })),
    });
    const makeLetters = (word: string, lockedIndices: number[] = []) =>
      makeRow(word, lockedIndices).words;
    const validator = (words: string[]) => {
      const set = new Set(words);
      return (w: string) => set.has(w);
    };

    // Source SPLAT, target IE. Removing P (drop1 @0 -> "PIE") then S (drop2 @end)
    // leaves source "LAT" and forms target "PIES".
    test('canCompleteDoubleShift finds a valid second move', () => {
      const reducedSource = makeLetters('SLAT'); // SPLAT minus the first-picked P
      const intermediate = 'PIE'.split(''); // base IE with P already dropped
      expect(
        canCompleteDoubleShift(reducedSource, intermediate, validator(['LAT', 'PIES']))
      ).toBe(true);
    });

    test('canCompleteDoubleShift returns false when no completion exists', () => {
      const reducedSource = makeLetters('SLAT');
      const intermediate = 'PIE'.split('');
      // 'LAT' is a valid source remainder but no target completion is valid
      expect(
        canCompleteDoubleShift(reducedSource, intermediate, validator(['LAT']))
      ).toBe(false);
    });

    test('canCompleteDoubleShift skips locked letters as the second pick', () => {
      // Lock the only letter (S, index 0) that would complete the move
      const reducedSource = makeLetters('SLAT', [0]);
      const intermediate = 'PIE'.split('');
      expect(
        canCompleteDoubleShift(reducedSource, intermediate, validator(['LAT', 'PIES']))
      ).toBe(false);
    });

    test('hasAnyValidDoubleShiftMove returns true when a two-letter move completes', () => {
      const rows = [makeRow('SPLAT'), makeRow('IE')];
      expect(
        hasAnyValidDoubleShiftMove(rows, 0, validator(['LAT', 'PIES']))
      ).toBe(true);
    });

    test('hasAnyValidDoubleShiftMove returns false when the row is trapped', () => {
      const rows = [makeRow('SPLAT'), makeRow('IE')];
      // No source remainder / target combination is valid -> stuck
      expect(hasAnyValidDoubleShiftMove(rows, 0, validator(['ZZZ']))).toBe(false);
    });

    test('hasAnyValidDoubleShiftMove returns false at the out-of-bounds last row', () => {
      const rows = [makeRow('SPLAT'), makeRow('IE')];
      expect(hasAnyValidDoubleShiftMove(rows, 1, validator(['LAT', 'PIES']))).toBe(false);
    });
  });

  // =========================================================================
  // Challenge mode undo scaling by difficulty
  // =========================================================================

  describe('CHALLENGE_MODE_CONFIG.getMaxUndos', () => {
    // Import directly to test the config object
    const { CHALLENGE_MODE_CONFIG } = require('../types/homeWorld');

    test('EASY difficulty gets 2 undos', () => {
      expect(CHALLENGE_MODE_CONFIG.getMaxUndos('EASY')).toBe(2);
    });

    test('MEDIUM difficulty gets 2 undos', () => {
      expect(CHALLENGE_MODE_CONFIG.getMaxUndos('MEDIUM')).toBe(2);
    });

    test('MEDIUM_PLUS difficulty gets 1 undo', () => {
      expect(CHALLENGE_MODE_CONFIG.getMaxUndos('MEDIUM_PLUS')).toBe(1);
    });

    test('HARD difficulty gets 1 undo', () => {
      expect(CHALLENGE_MODE_CONFIG.getMaxUndos('HARD')).toBe(1);
    });
  });

  // =========================================================================
  // Slot previews must AND source-word validity (false-positive fix)
  // =========================================================================

  describe('slotPreviews source-word validity', () => {
    /** Select the first unlocked letter with the given char from the active row. */
    function selectLetter(char: string) {
      const [state, actions] = callHook();
      const letter = state.rows[state.activeRowIndex].words.find(
        l => l.char === char && !l.isLocked
      )!;
      actions.handleLetterPress(letter, state.activeRowIndex);
    }

    test('marks ALL slots invalid when removing the selected letter breaks the source word', () => {
      resetHookState();
      let [, actions] = callHook();
      // MIST: removing M leaves IST (not a word). Inserting M into TIED at
      // slot 2 forms TIMED (a word) — the old target-only preview marked that
      // slot ✓ even though handleSlotPress would reject the move.
      actions.initGame(['MIST', 'TIED']);
      selectLetter('M');

      const [state] = callHook();
      expect(state.slotPreviews).toBeDefined();
      expect(state.slotPreviews![2].word).toBe('TIMED');
      expect(state.slotPreviews!.every(p => !p.isValid)).toBe(true);
    });

    test('preview validity matches actual move acceptance (the ✗ slot really rejects)', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['MIST', 'TIED']);
      selectLetter('M');

      let [, actions2] = callHook();
      const result = await actions2.handleSlotPress(2);
      expect(result).toBeNull();
      const [state] = callHook();
      expect(state.invalidAttempts).toBe(1);
    });

    test('keeps slots valid when both resulting words are valid', () => {
      resetHookState();
      let [, actions] = callHook();
      // TIME: removing M leaves TIE (valid); slot 2 into TIED forms TIMED (valid)
      actions.initGame(['TIME', 'TIED']);
      selectLetter('M');

      const [state] = callHook();
      expect(state.slotPreviews![2].word).toBe('TIMED');
      expect(state.slotPreviews![2].isValid).toBe(true);
    });
  });

  // =========================================================================
  // Hint board glow (hintHighlight)
  // =========================================================================

  describe('hintHighlight', () => {
    test('solution-step hint pinpoints the exact tile and slot from step positions', () => {
      resetHookState();
      let [, actions] = callHook();
      const solution = [
        {
          stepIndex: 0, sourceWord: 'TIME', targetWord: 'TIED', letterToMove: 'M',
          explanation: '', removalPosition: 2, insertionPosition: 2,
        },
      ];
      actions.initGame(['TIME', 'TIED'], undefined, solution);

      [, actions] = callHook();
      actions.handleHint();

      const [state] = callHook();
      expect(state.hintsUsed).toBe(1);
      expect(state.hintHighlight).not.toBeNull();
      expect(state.hintHighlight!.rowIndex).toBe(0);
      expect(state.hintHighlight!.letterIndex).toBe(2);
      expect(state.hintHighlight!.letterId).toBe(state.rows[0].words[2].id);
      expect(state.hintHighlight!.targetRowIndex).toBe(1);
      expect(state.hintHighlight!.targetSlotIndex).toBe(2);
    });

    test('fallback-search hint (off solution path) still pinpoints letter and slot', () => {
      resetHookState();
      let [, actions] = callHook();
      // No solution provided — handleHint scans the board: moving M leaves TIE
      // (valid) and inserting at slot 2 forms TIMED (valid).
      actions.initGame(['TIME', 'TIED']);

      [, actions] = callHook();
      actions.handleHint();

      const [state] = callHook();
      expect(state.hintsUsed).toBe(1);
      expect(state.hintHighlight).not.toBeNull();
      expect(state.hintHighlight!.letterIndex).toBe(2);
      expect(state.hintHighlight!.targetSlotIndex).toBe(2);
    });

    test('cleared when a move commits', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);

      [, actions] = callHook();
      actions.handleHint(); // fallback search: A → slot 0 (AEFGH)
      let [state] = callHook();
      expect(state.hintHighlight).not.toBeNull();

      const a = state.rows[0].words[0];
      [, actions] = callHook();
      actions.handleLetterPress(a, 0);
      [, actions] = callHook();
      await actions.handleSlotPress(0);

      [state] = callHook();
      expect(state.hintHighlight).toBeNull();
    });

    test('cleared on undo and on a new board', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);

      // Commit a move, then hint, then undo — the glow must not survive.
      let [state] = callHook();
      const a = state.rows[0].words[0];
      [, actions] = callHook();
      actions.handleLetterPress(a, 0);
      [, actions] = callHook();
      await actions.handleSlotPress(0);

      [, actions] = callHook();
      actions.handleHint();
      [state] = callHook();
      expect(state.hintHighlight).not.toBeNull();

      [, actions] = callHook();
      actions.handleUndo();
      [state] = callHook();
      expect(state.hintHighlight).toBeNull();

      // Hint again, then start a fresh board — glow resets with the board.
      [, actions] = callHook();
      actions.handleHint();
      [state] = callHook();
      expect(state.hintHighlight).not.toBeNull();
      [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']);
      [state] = callHook();
      expect(state.hintHighlight).toBeNull();
    });
  });

  // =========================================================================
  // Per-move outcomes (honest share grid)
  // =========================================================================

  describe('moveOutcomes', () => {
    /** Select the first unlocked letter with the given char, then drop it. */
    async function playMove(char: string, slot: number, inputSource?: 'tap' | 'drag') {
      let [state, actions] = callHook();
      const letter = state.rows[state.activeRowIndex].words.find(
        l => l.char === char && !l.isLocked
      )!;
      actions.handleLetterPress(letter, state.activeRowIndex);
      [, actions] = callHook();
      return actions.handleSlotPress(slot, inputSource);
    }

    test('clean moves record clean, and completion carries the full record', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);

      const first = await playMove('A', 0); // BCD + AEFGH
      expect(first?.completed).toBe(false);
      let [state] = callHook();
      expect(state.moveOutcomes).toEqual(['clean']);

      const second = await playMove('E', 0); // AFGH + EIJKL — completes
      expect(second?.completed).toBe(true);
      expect(second?.moveOutcomes).toEqual(['clean', 'clean']);
      [state] = callHook();
      expect(state.moveOutcomes).toEqual(['clean', 'clean']);
    });

    test('an invalid attempt marks the next committed move as mistake', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);

      // Invalid drop first (EAFGH is not a word), then the valid slot.
      const bad = await playMove('A', 1);
      expect(bad).toBeNull();
      let [, actions2] = callHook();
      await actions2.handleSlotPress(0); // letter still selected

      const [state] = callHook();
      expect(state.invalidAttempts).toBe(1);
      expect(state.moveOutcomes).toEqual(['mistake']);
    });

    test('a delivered hint marks the next committed move as hint; hint+mistake → both', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);

      [, actions] = callHook();
      actions.handleHint(); // delivered via fallback search
      await playMove('A', 0);
      let [state] = callHook();
      expect(state.moveOutcomes).toEqual(['hint']);

      // Second move: hint + invalid attempt → both
      [, actions] = callHook();
      actions.handleHint();
      const bad = await playMove('E', 2); // IJEKL is not a word
      expect(bad).toBeNull();
      [, actions] = callHook();
      const done = await actions.handleSlotPress(0);
      expect(done?.completed).toBe(true);
      [state] = callHook();
      expect(state.moveOutcomes).toEqual(['hint', 'both']);
    });

    test('undo pops the entry and re-marks the redone move (grid stays honest)', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);

      [, actions] = callHook();
      actions.handleHint();
      await playMove('A', 0);
      let [state] = callHook();
      expect(state.moveOutcomes).toEqual(['hint']);

      [, actions] = callHook();
      actions.handleUndo();
      [state] = callHook();
      expect(state.moveOutcomes).toEqual([]);

      // Redo without a new hint — the earlier hint still marks this move.
      await playMove('A', 0);
      [state] = callHook();
      expect(state.moveOutcomes).toEqual(['hint']);
    });

    test('resets on a new board', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);
      await playMove('A', 0);
      let [state] = callHook();
      expect(state.moveOutcomes).toEqual(['clean']);

      [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']);
      [state] = callHook();
      expect(state.moveOutcomes).toEqual([]);
    });

    test('double shift records one outcome per completed two-letter step', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCDE', 'FGHIJ'], undefined, undefined, 5, 'double_shift');

      // drop1 (half a move) — no outcome yet
      await playMove('A', 0);
      let [state] = callHook();
      expect(state.doubleShiftPhase).toBe('pick2');
      expect(state.moveOutcomes).toEqual([]);

      // drop2 completes the step: source CDE, target ABFGHIJ
      const result = await playMove('B', 1);
      expect(result?.completed).toBe(true);
      [state] = callHook();
      expect(state.moveOutcomes).toEqual(['clean']);
    });
  });

  // =========================================================================
  // Arrival mark (tap-path landing juice)
  // =========================================================================

  describe('lastArrival', () => {
    async function playMove(char: string, slot: number, inputSource?: 'tap' | 'drag') {
      let [state, actions] = callHook();
      const letter = state.rows[state.activeRowIndex].words.find(
        l => l.char === char && !l.isLocked
      )!;
      actions.handleLetterPress(letter, state.activeRowIndex);
      [, actions] = callHook();
      return actions.handleSlotPress(slot, inputSource);
    }

    test('null on a fresh board', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);
      const [state] = callHook();
      expect(state.lastArrival).toBeNull();
    });

    test('set with landing spot and direction on a committed tap move', async () => {
      resetHookState();
      let [state, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);
      [state] = callHook();
      const movedId = state.rows[0].words[0].id;

      await playMove('A', 0);
      [state] = callHook();
      expect(state.lastArrival).not.toBeNull();
      expect(state.lastArrival!.rowIndex).toBe(1);
      expect(state.lastArrival!.slotIndex).toBe(0);
      expect(state.lastArrival!.letterId).toBe(movedId);
      expect(state.lastArrival!.direction).toBe('down');
      expect(state.lastArrival!.moveId).toBeGreaterThan(0);
    });

    test('NOT set for drag-drop input (drag keeps its own feedback)', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);

      await playMove('A', 0, 'drag');
      const [state] = callHook();
      expect(state.lastArrival).toBeNull();
    });

    test('cleared by undo', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);
      await playMove('A', 0);
      let [state] = callHook();
      expect(state.lastArrival).not.toBeNull();

      [, actions] = callHook();
      actions.handleUndo();
      [state] = callHook();
      expect(state.lastArrival).toBeNull();
    });

    test('reverse ascent arrivals travel up', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['TIME', 'TIED'], undefined, undefined, 4, 'reverse');

      // Descend: M → TIMED
      await playMove('M', 2);
      let [state] = callHook();
      expect(state.lastArrival!.direction).toBe('down');
      expect(state.moveDirection).toBe('up');

      // Ascend: D from TIMED back up → TIED
      await playMove('D', 3);
      [state] = callHook();
      expect(state.lastArrival!.direction).toBe('up');
      expect(state.lastArrival!.rowIndex).toBe(0);
    });

    test('double-shift drop1 half-move also marks an arrival on the tap path', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCDE', 'FGHIJ'], undefined, undefined, 5, 'double_shift');

      await playMove('A', 0);
      const [state] = callHook();
      expect(state.doubleShiftPhase).toBe('pick2');
      expect(state.lastArrival).not.toBeNull();
      expect(state.lastArrival!.rowIndex).toBe(1);
      expect(state.lastArrival!.slotIndex).toBe(0);
    });
  });

  // =========================================================================
  // Shared challenge boards
  // =========================================================================

  describe('startSharedChallengeGame', () => {
    test('starts a standard, hint-enabled board from a valid chain', () => {
      resetHookState();
      let [, actions] = callHook();
      // Lowercase input exercises normalization; player was in challenge mode.
      actions.setGameMode('challenge');
      [, actions] = callHook();
      const ok = actions.startSharedChallengeGame(['time', 'tied']);
      expect(ok).toBe(true);

      const [state] = callHook();
      expect(state.rows.map(r => r.originalWord)).toEqual(['TIME', 'TIED']);
      expect(state.gameState).toBe(GameState.PLAYING);
      expect(state.currentVariant).toBe('standard');
      expect(state.gameMode).toBe('standard');
      expect(state.undosRemaining).toBe(Infinity);
      expect(state.currentWordLength).toBe(4);
      // The player's difficulty preference is untouched.
      expect(state.difficulty).toBe('MEDIUM');
    });

    test('rejects a chain containing a non-dictionary word without touching the board', () => {
      resetHookState();
      let [, actions] = callHook();
      const ok = actions.startSharedChallengeGame(['TIME', 'ZZZZ']);
      expect(ok).toBe(false);

      const [state] = callHook();
      expect(state.rows).toHaveLength(0);
      expect(state.gameState).toBe(GameState.IDLE);
    });

    test('rejects mismatched word lengths', () => {
      resetHookState();
      let [, actions] = callHook();
      expect(actions.startSharedChallengeGame(['TIME', 'TIE'])).toBe(false);
      const [state] = callHook();
      expect(state.gameState).toBe(GameState.IDLE);
    });

    test('rejects chains that are too short or malformed', () => {
      resetHookState();
      let [, actions] = callHook();
      expect(actions.startSharedChallengeGame(['TIME'])).toBe(false);
      [, actions] = callHook();
      expect(actions.startSharedChallengeGame([])).toBe(false);
      [, actions] = callHook();
      // Word lengths outside the 3-7 dictionary range
      expect(actions.startSharedChallengeGame(['AB', 'CD'])).toBe(false);
    });
  });

  // =========================================================================
  // Speed rescue (continue from Time's Up)
  // =========================================================================

  describe('resumeSpeedAfterRescue', () => {
    test('from GAME_OVER returns to PLAYING and raises the rescue signal', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['TIME', 'TIED']);
      [, actions] = callHook();
      actions.setGameState(GameState.GAME_OVER);

      [, actions] = callHook();
      const ok = actions.resumeSpeedAfterRescue(20);
      expect(ok).toBe(true);

      const [state] = callHook();
      expect(state.gameState).toBe(GameState.PLAYING);
      expect(state.speedRescueSignal).toEqual({ extraSec: 20, id: 1 });
    });

    test('is a no-op outside GAME_OVER', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['TIME', 'TIED']); // PLAYING

      [, actions] = callHook();
      const ok = actions.resumeSpeedAfterRescue(20);
      expect(ok).toBe(false);

      const [state] = callHook();
      expect(state.gameState).toBe(GameState.PLAYING);
      expect(state.speedRescueSignal).toBeNull();
    });

    test('rejects a non-positive grant and stays in GAME_OVER', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['TIME', 'TIED']);
      [, actions] = callHook();
      actions.setGameState(GameState.GAME_OVER);

      [, actions] = callHook();
      expect(actions.resumeSpeedAfterRescue(0)).toBe(false);
      const [state] = callHook();
      expect(state.gameState).toBe(GameState.GAME_OVER);
      expect(state.speedRescueSignal).toBeNull();
    });

    test('rescue signal resets with a new board', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['TIME', 'TIED']);
      [, actions] = callHook();
      actions.setGameState(GameState.GAME_OVER);
      [, actions] = callHook();
      actions.resumeSpeedAfterRescue(15);

      [, actions] = callHook();
      actions.initGame(['TIME', 'TIED']);
      const [state] = callHook();
      expect(state.speedRescueSignal).toBeNull();
    });
  });
});
