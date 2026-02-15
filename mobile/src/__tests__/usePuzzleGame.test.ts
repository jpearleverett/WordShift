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
  getHintMessage: jest.fn((_l: string, _w: string, _p: number) => 'Hint: move letter'),
  getHintFallback: jest.fn(() => 'Try undoing!'),
  getLoadingMessage: jest.fn(() => 'Loading...'),
  getStartMessage: jest.fn(() => 'Tap a tile to begin!'),
  getInvalidWordMessage: jest.fn((word: string, _p: number) => `${word} isn't a word!`),
  getLockedLetterMessage: jest.fn((_p: number) => 'That letter is locked!'),
}));

jest.mock('../services/amberCurrency', () => ({
  getPreferredPuzzleVariant: jest.fn(async () => 'standard'),
  setPreferredPuzzleVariant: jest.fn(async () => {}),
  getFullProgress: jest.fn(async () => ({ puzzlesSolved: 10 })),
}));

// COMMON_WORDS needs to contain all words used in the test puzzle chain
// and the valid words formed during moves
jest.mock('../constants', () => ({
  COMMON_WORDS: new Set([
    'LIME', 'TIME', 'TIED', 'TEND', 'TIE', 'TIMED',
    'IME', 'LIED', 'LED', 'LET', 'TILE', 'MILE',
    'MET', 'TEN', 'TEND', 'DENT', 'NET',
    // Fallback puzzles
    'STORE', 'ROUTE', 'VOTER', 'COVET', 'VOICE',
  ]),
  FALLBACK_PUZZLE: ['LIME', 'TIME', 'TIED', 'TEND'],
  FALLBACK_PUZZLE_HARD: ['STORE', 'ROUTE', 'VOTER', 'COVET', 'VOICE'],
}));

import { usePuzzleGame, PuzzleGameState, PuzzleGameActions } from '../hooks/usePuzzleGame';

/**
 * Helper: call usePuzzleGame with fresh hook indices (simulates a re-render).
 * Must call resetHookState() before first call to initialize.
 */
function callHook(): [PuzzleGameState, PuzzleGameActions] {
  rewindHookIndices();
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

    test('enforces no_vowel restrictions', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['TIME', 'TIED'], undefined, undefined, 4, 'no_vowel');

      let [state] = callHook();
      const vowel = state.rows[0].words.find(l => l.char === 'I')!;
      [, actions] = callHook();
      actions.handleLetterPress(vowel, 0);
      [state] = callHook();
      expect(state.selectedLetter).toBeNull();
      expect(state.error).toContain('No Vowel Shift');

      const consonant = state.rows[0].words.find(l => l.char === 'T')!;
      [, actions] = callHook();
      actions.handleLetterPress(consonant, 0);
      [state] = callHook();
      expect(state.selectedLetter?.char).toBe('T');
    });

    test('enforces no_consonant restrictions', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['TIME', 'TIED'], undefined, undefined, 4, 'no_consonant');

      let [state] = callHook();
      const consonant = state.rows[0].words.find(l => l.char === 'T')!;
      [, actions] = callHook();
      actions.handleLetterPress(consonant, 0);
      [state] = callHook();
      expect(state.selectedLetter).toBeNull();
      expect(state.error).toContain('No Consonant Shift');

      const vowel = state.rows[0].words.find(l => l.char === 'I')!;
      [, actions] = callHook();
      actions.handleLetterPress(vowel, 0);
      [state] = callHook();
      expect(state.selectedLetter?.char).toBe('I');
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

    test('advances chain links before final completion', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['TIME', 'TIED'], undefined, undefined, 4, 'chain');

      // Complete first link quickly (same valid move as above)
      let [state] = callHook();
      const m = state.rows[0].words.find(l => l.char === 'M')!;
      [, actions] = callHook();
      actions.handleLetterPress(m, 0);
      [, actions] = callHook();
      const result = await actions.handleSlotPress(2);

      expect(result?.completed).toBe(false);
      expect(result?.chainAdvanced).toBe(true);
      expect(result?.chainLink).toBe(2);
      expect(result?.chainLength).toBe(3);

      [state] = callHook();
      expect(state.currentChainLink).toBe(2);
      expect(state.gameState).toBe(GameState.PLAYING);
      expect(state.rows.length).toBeGreaterThan(0);
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
      actions.setSelectedVariant('blind');
      [, actions] = callHook();
      await actions.startNewGame('MEDIUM');

      const [state] = callHook();
      expect(state.currentVariant).toBe('blind');
      expect(state.selectedVariant).toBe('blind');
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
      expect(state.level).toBe(1);
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
});
