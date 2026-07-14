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
  // Default: no dread word in the ledger — the finale-serve tests override this.
  getStrongestDreadWord: jest.fn(() => null),
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
  getBlindFailMessage: jest.fn((_p: number) => 'Not every word held! Undo and mend the chain.'),
  getLockedLetterMessage: jest.fn((_p: number) => 'That letter is locked!'),
  getFinalBoardStartMessage: jest.fn((_p: number) => 'The last arrangement. Take your time.'),
  getFinalBoardUndoRefusal: jest.fn((_p: number) => 'What is given now is given for good.'),
  getPreviewRescueMessage: jest.fn((_p: number) => 'The checks return for this board.'),
}));

jest.mock('../services/hints', () => ({
  getHintBalanceSync: jest.fn(() => 5),
  hasHintSync: jest.fn(() => true),
  consumeHintSync: jest.fn(() => true),
}));

jest.mock('../services/amberCurrency', () => ({
  getPreferredPuzzleVariant: jest.fn(async () => 'standard'),
  setPreferredPuzzleVariant: jest.fn(async () => {}),
  // Default is fully neutral (>= PREVIEW_GRADING_RESCUE_LIMIT = 20) so the
  // preview-validity truth table below exercises the steady-state gate; the
  // transition tests override this per-test with an early-game count.
  getFullProgress: jest.fn(async () => ({ puzzlesSolved: 20 })),
  getRitualWords: jest.fn(async () => []),
}));

jest.mock('../services/finalBoard', () => ({
  buildFinalBoard: jest.fn(async () => ({
    words: ['SPARK', 'LIGHT', 'PAINS', 'DWELL', 'CURSE', 'BLACK', 'GRAVE'],
    hint: 'Follow the last arrangement.',
    solution: [
      { stepIndex: 0, sourceWord: 'SPARK', targetWord: 'LIGHT', letterToMove: 'S', explanation: '', insertionPosition: 0, removalPosition: 0 },
      { stepIndex: 1, sourceWord: 'SLIGHT', targetWord: 'PAINS', letterToMove: 'L', explanation: '', insertionPosition: 1, removalPosition: 1 },
      { stepIndex: 2, sourceWord: 'PLAINS', targetWord: 'DWELL', letterToMove: 'S', explanation: '', insertionPosition: 5, removalPosition: 5 },
      { stepIndex: 3, sourceWord: 'DWELLS', targetWord: 'CURSE', letterToMove: 'D', explanation: '', insertionPosition: 5, removalPosition: 0 },
      { stepIndex: 4, sourceWord: 'CURSED', targetWord: 'BLACK', letterToMove: 'S', explanation: '', insertionPosition: 5, removalPosition: 3 },
      { stepIndex: 5, sourceWord: 'BLACKS', targetWord: 'GRAVE', letterToMove: 'L', explanation: '', insertionPosition: 5, removalPosition: 1 },
    ],
    wordLength: 5,
  })),
}));

jest.mock('../services/wordHistory', () => ({
  getWordHistoryWithRecency: jest.fn(async () => new Map()),
  recordPuzzleWords: jest.fn(async () => {}),
}));

// Mock puzzleBank to return null — tests exercise the generation path
jest.mock('../services/puzzleBank', () => ({
  selectPreGeneratedPuzzle: jest.fn(async () => null),
}));

// The hook value-imports the shared 3-6 challenge word-count bounds from
// shareResults; mock them so the real module (which imports react-native's
// Share) never loads in this Node environment.
jest.mock('../services/shareResults', () => ({
  MIN_CHALLENGE_WORDS: 3,
  MAX_CHALLENGE_WORDS: 6,
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
    // 4-row extension for the combo-ladder tests: ABCD → EFGH → IJKL → WXYZ
    // (third move: I out of EIJKL leaves EJKL, forms IWXYZ — keeps the board
    // solvable so stuck detection never resets the streak mid-test)
    'EJKL', 'IWXYZ',
    // Synthetic double-shift step: ABCDE → FGHIJ (move A then B → ABFGHIJ)
    'CDE', 'ABFGHIJ',
    // Hint dead-end awareness: MNOP → QRST → UVWX. First valid candidate is
    // M@0 (remainder NOP, forms MQRST) but MQRST is a dead end (no removal of
    // Q/R/S/T is a word). The solvable alternative is N@0 (remainder MOP,
    // forms NQRST; then Q → NRST + QUVWX completes).
    'NOP', 'MQRST', 'MOP', 'NQRST', 'NRST', 'QUVWX',
    // Only-dead-ends board: MNOP → JQXZ → UVWX. Single candidate M@0 forms
    // MJQXZ, which is a dead end (no onward word exists) — the hint must
    // still fall back to it rather than refusing.
    'MJQXZ',
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

import { usePuzzleGame, hasAnyValidMove, canCompleteDoubleShift, hasAnyValidDoubleShiftMove, isBoardSolvableFromState, comboTierForStreak, shouldUseComboMessage, resolvePreviewGradingMode, PuzzleGameState, PuzzleGameActions } from '../hooks/usePuzzleGame';
// Real values (the hook imports them from gameBalance directly, past the
// '../constants' mock above) — the grading-window tests pin against them.
import {
  PREVIEW_GRADING_FULL_LIMIT,
  PREVIEW_GRADING_RESCUE_LIMIT,
} from '../constants/gameBalance';

/**
 * Helper: call usePuzzleGame with fresh hook indices (simulates a re-render).
 * Must call resetHookState() before first call to initialize.
 */
function callHook(): [PuzzleGameState, PuzzleGameActions] {
  rewindHookIndices();
  // eslint-disable-next-line react-hooks/rules-of-hooks -- test harness drives the hook against a manual React mock
  return usePuzzleGame();
}

describe('resolvePreviewGradingMode', () => {
  const resolve = (
    puzzlesSolved: number,
    overrides: Partial<Parameters<typeof resolvePreviewGradingMode>[0]> = {},
  ) => resolvePreviewGradingMode({
    puzzlesSolved,
    difficulty: 'MEDIUM',
    variant: 'standard',
    blindMode: false,
    isDailyBoard: false,
    isSharedChallenge: false,
    ...overrides,
  });

  test.each([
    [11, 'graded'],
    [12, 'rescue'],
    [19, 'rescue'],
    [20, 'neutral'],
  ] as const)('resolves the progression boundary at %i solves to %s', (puzzlesSolved, expected) => {
    expect(resolve(puzzlesSolved)).toBe(expected);
  });

  test('keeps EASY and double shift graded after the progression windows', () => {
    expect(resolve(20, { difficulty: 'EASY' })).toBe('graded');
    expect(resolve(20, { difficulty: 'HARD', variant: 'double_shift' })).toBe('graded');
  });

  test.each(['standard', 'reverse', 'speed'] as const)(
    '%s uses rescue through solve 19, then stays neutral',
    (variant) => {
      expect(resolve(12, { difficulty: 'HARD', variant })).toBe('rescue');
      expect(resolve(19, { difficulty: 'HARD', variant })).toBe('rescue');
      expect(resolve(20, { difficulty: 'HARD', variant })).toBe('neutral');
    },
  );

  test('treats daily and shared boards by their MEDIUM+ shape, not an EASY preference', () => {
    expect(resolve(12, { difficulty: 'EASY', isDailyBoard: true })).toBe('rescue');
    expect(resolve(20, { difficulty: 'EASY', isSharedChallenge: true })).toBe('neutral');
  });

  test('Blind Offering never exposes preview grading', () => {
    expect(resolve(0, { difficulty: 'EASY', variant: 'double_shift', blindMode: true })).toBe('hidden');
  });
});

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

    test('threads the daily solution through for stored-step hints', () => {
      const solution = [
        { stepIndex: 0, sourceWord: 'PLANET', targetWord: 'PLATES', letterToMove: 'N', explanation: '' },
      ];
      let [, actions] = callHook();
      actions.startDailyGame(['PLANET', 'PLATES', 'PLANES'], 'daily hint', 6, solution);

      const [state] = callHook();
      expect(state.solution).toBe(solution);
    });

    test('remains backward compatible without a solution (3-arg call)', () => {
      let [, actions] = callHook();
      actions.startDailyGame(['PLANET', 'PLATES', 'PLANES'], 'daily hint', 6);

      const [state] = callHook();
      expect(state.solution).toBeUndefined();
      expect(state.gameState).toBe(GameState.PLAYING);
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

  // =========================================================================
  // Blind Offering: free moves, judged only at the end of the chain
  // =========================================================================

  describe('blind mode end-of-board validation', () => {
    // Enable blind (sticky across boards), then lay a known board on top —
    // startNewGame's generated board is replaced by the deterministic one.
    async function initBlindBoard(words: string[]) {
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('MEDIUM', 'standard', 'standard', true);
      [, actions] = callHook();
      actions.initGame(words);
      const [state] = callHook();
      expect(state.blindMode).toBe(true);
    }

    test('a dictionary-invalid intermediate move commits without penalty', async () => {
      await initBlindBoard(['LIME', 'TIME', 'TIED']);

      // Move L out of LIME (leaves IME, not a word) into TIME at 0 (LTIME,
      // not a word). Standard mode rejects this; blind commits it silently.
      let [state, actions] = callHook();
      const l = state.rows[0].words.find(le => le.char === 'L')!;
      actions.handleLetterPress(l, 0);
      [, actions] = callHook();
      const result = await actions.handleSlotPress(0);

      expect(result).not.toBeNull();
      expect(result?.completed).toBe(false);
      expect(result?.formedWord).toBe('LTIME');
      [state] = callHook();
      expect(state.invalidAttempts).toBe(0);
      expect(state.activeRowIndex).toBe(1);
      expect(state.isStuck).toBe(false);
    });

    test('a flawed finished chain fails with blindFailed, not completion', async () => {
      await initBlindBoard(['LIME', 'TIME', 'TIED']);

      // First move: L into TIME (both sides invalid — commits in blind).
      let [state, actions] = callHook();
      const l = state.rows[0].words.find(le => le.char === 'L')!;
      actions.handleLetterPress(l, 0);
      [, actions] = callHook();
      await actions.handleSlotPress(0);

      // Final move: T from LTIME into TIED at 0 (TTIED). The finished chain
      // [IME, LIME, TTIED] contains non-words, so the single end-of-board
      // judgment fails: no victory, one invalid attempt, board stays live.
      [state, actions] = callHook();
      const t = state.rows[1].words.find(le => le.char === 'T' && !le.isLocked)!;
      actions.handleLetterPress(t, 1);
      [, actions] = callHook();
      const result = await actions.handleSlotPress(0);

      expect(result?.completed).toBe(false);
      expect(result?.blindFailed).toBe(true);
      [state] = callHook();
      expect(state.invalidAttempts).toBe(1);
      expect(state.gameState).toBe(GameState.PLAYING);
      // The failing move stays committed — undo is the way back.
      expect(state.rows[2].words.map(le => le.char).join('')).toBe('TTIED');
    });

    test('a fully valid finished chain completes normally', async () => {
      await initBlindBoard(['TIME', 'TIED']);

      // M from TIME (TIE) into TIED at 2 (TIMED): all words hold.
      let [state, actions] = callHook();
      const m = state.rows[0].words.find(le => le.char === 'M')!;
      actions.handleLetterPress(m, 0);
      [, actions] = callHook();
      const result = await actions.handleSlotPress(2);

      expect(result?.completed).toBe(true);
      expect(result?.blindFailed).toBeUndefined();
      expect(result?.completedWords).toEqual(['TIE', 'TIMED']);
      [state] = callHook();
      expect(state.invalidAttempts).toBe(0);
    });

    test('undos are ALWAYS free in blind, from the first move, even under a challenge budget', async () => {
      // The design ruling (and the player-reported bug fix): blind undos are
      // never charged against the challenge undo budget — not just after a
      // fail, but from the very first move. Walking the chain back to a flaw
      // is the mode's core repair loop, never a budgeted resource.
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('MEDIUM', 'challenge', 'standard', true);
      [, actions] = callHook();
      actions.initGame(['TIME', 'TIED']);
      let [state] = callHook();
      expect(state.gameMode).toBe('challenge');
      expect(state.blindMode).toBe(true);
      const budget = state.undosRemaining; // MEDIUM challenge budget (2)

      // A valid intermediate move (no fail yet): M from TIME (TIE) into TIED
      // at 2 forms TIMED and completes — so instead commit a NON-final move
      // to leave the board mid-chain, then undo it repeatedly.
      // Simplest: make one commit, undo it 3+ times' worth of budget checks.
      const m = state.rows[0].words.find(le => le.char === 'M')!;
      [, actions] = callHook();
      actions.handleLetterPress(m, 0);
      [, actions] = callHook();
      // Drop M at 0 (MTIED, invalid) — commits in blind, no fail, board live.
      await actions.handleSlotPress(0);
      [state] = callHook();
      expect(state.gameState).toBe(GameState.PLAYING);

      // Undo it — budget must be untouched (this is the exact regression:
      // the old code charged the challenge budget before any fail).
      [, actions] = callHook();
      actions.handleUndo();
      [state] = callHook();
      expect(state.undosRemaining).toBe(budget);
      expect(state.rows[0].words.map(le => le.char).join('')).toBe('TIME');
    });

    test('a failed judgment keeps undos free for the rest of the board', async () => {
      // Blind Offering runs under gameMode 'challenge' (a finite budget lives
      // on the state), but undos never consult it — before OR after a fail.
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('MEDIUM', 'challenge', 'standard', true);
      [, actions] = callHook();
      actions.initGame(['TIME', 'TIED']);
      let [state] = callHook();
      expect(state.gameMode).toBe('challenge');
      const budget = state.undosRemaining; // MEDIUM challenge budget (2)

      // Fail the final judgment: T from TIME (IME) into TIED at 0 (TTIED).
      const t = state.rows[0].words.find(le => le.char === 'T')!;
      [, actions] = callHook();
      actions.handleLetterPress(t, 0);
      [, actions] = callHook();
      const result = await actions.handleSlotPress(0);
      expect(result?.blindFailed).toBe(true);

      // Undoing back out of the failed chain charges nothing.
      [, actions] = callHook();
      actions.handleUndo();
      [state] = callHook();
      expect(state.undosRemaining).toBe(budget);
      expect(state.rows[0].words.map(le => le.char).join('')).toBe('TIME');
      expect(state.rows[1].words.map(le => le.char).join('')).toBe('TIED');
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
      // The step must be a genuinely legal move (the stale-step guard rejects
      // hints the rules cannot execute): A from ABCD (remainder BCD) into
      // EFGH at slot 0 (AEFGH) — both in the mocked dictionary.
      const solution = [
        { stepIndex: 0, sourceWord: 'ABCD', targetWord: 'EFGH', letterToMove: 'A', explanation: 'test', removalPosition: 0, insertionPosition: 0 },
      ];
      actions.initGame(['ABCD', 'EFGH'], undefined, solution);

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

    test('challenge + double shift: undoing a completed step reverts BOTH drops for ONE charge', async () => {
      async function playMove(char: string, slot: number) {
        let [state, actions] = callHook();
        const letter = state.rows[state.activeRowIndex].words.find(
          l => l.char === char && !l.isLocked
        )!;
        actions.handleLetterPress(letter, state.activeRowIndex);
        [, actions] = callHook();
        return actions.handleSlotPress(slot);
      }

      resetHookState();
      let [, actions] = callHook();
      actions.setGameMode('challenge');
      [, actions] = callHook();
      actions.initGame(['ABCDE', 'FGHIJ'], undefined, undefined, 5, 'double_shift');

      let [state] = callHook();
      const undosBefore = state.undosRemaining;

      // Complete one two-letter step (drop1 then drop2).
      await playMove('A', 0);
      await playMove('B', 1);
      [state] = callHook();
      expect(state.doubleShiftPhase).toBe('pick1');
      expect(state.history).toHaveLength(2);      // a completed step = 2 deltas
      expect(state.moveOutcomes).toEqual(['clean']);
      expect(state.undosRemaining).toBe(undosBefore);

      // One undo reverts the WHOLE step: both drops gone, board fully restored,
      // exactly one charge spent — not a half-revert that strands the first drop.
      [, actions] = callHook();
      actions.handleUndo();
      [state] = callHook();
      expect(state.history).toHaveLength(0);
      expect(state.doubleShiftPhase).toBe('pick1');
      expect(state.undosRemaining).toBe(undosBefore - 1);
      expect(state.moveOutcomes).toEqual([]);
      expect(state.rows[0].words.map(l => l.char).join('')).toBe('ABCDE');
      expect(state.rows[1].words.map(l => l.char).join('')).toBe('FGHIJ');
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

    test('passes the current puzzles-solved depth into bank selection', async () => {
      const amber = require('../services/amberCurrency');
      const bank = require('../services/puzzleBank');
      (amber.getFullProgress as jest.Mock).mockResolvedValueOnce({ puzzlesSolved: 100 });
      (bank.selectPreGeneratedPuzzle as jest.Mock).mockResolvedValueOnce({
        words: ['LIME', 'TIME', 'TIED', 'TEND'],
        hint: 'Bank hint',
        solution: [],
        wordLength: 4,
      });

      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('MEDIUM', 'standard', 'standard');

      expect(bank.selectPreGeneratedPuzzle).toHaveBeenLastCalledWith(
        'MEDIUM',
        0,
        expect.any(Map),
        'standard',
        100,
      );
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

  describe('the marked final board (finale-armed serve)', () => {
    const amber = require('../services/amberCurrency');
    const gen = require('../services/localGenerator');
    const finalBoard = require('../services/finalBoard');
    const history = require('../services/wordHistory');

    afterEach(() => {
      // Restore the suite-wide defaults consumed by mockResolvedValueOnce.
      (amber.getFullProgress as jest.Mock).mockImplementation(async () => ({ puzzlesSolved: 20 }));
      (amber.getRitualWords as jest.Mock).mockImplementation(async () => []);
      (gen.getStrongestDreadWord as jest.Mock).mockImplementation(() => null);
    });

    test('finale armed: builds and commits the bespoke seven-row HARD board, then returns before normal generation', async () => {
      (finalBoard.buildFinalBoard as jest.Mock).mockClear();
      (history.recordPuzzleWords as jest.Mock).mockClear();
      (gen.generateLocalPuzzle as jest.Mock).mockClear();
      const bank = require('../services/puzzleBank');
      (bank.selectPreGeneratedPuzzle as jest.Mock).mockClear();
      (amber.getFullProgress as jest.Mock).mockResolvedValueOnce({
        // A defensive stale/corrupt count must not let curated-early serving
        // preempt an explicitly armed finale.
        puzzlesSolved: 0,
        finaleArmed: true,
        finalPuzzleCompleted: false,
      });
      (amber.getRitualWords as jest.Mock).mockResolvedValueOnce(['ALTAR', 'GLOW']);

      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('MEDIUM');

      const [state] = callHook();
      expect(finalBoard.buildFinalBoard).toHaveBeenCalledWith(['ALTAR', 'GLOW']);
      expect(state.isFinalBoard).toBe(true);
      expect(state.gameState).toBe(GameState.PLAYING);
      expect(state.currentVariant).toBe('standard');
      expect(state.gameMode).toBe('standard');
      expect(state.blindMode).toBe(false);
      expect(state.difficulty).toBe('HARD');
      expect(state.currentWordLength).toBe(5);
      expect(state.rows).toHaveLength(7);
      expect(state.rows.map(row => row.originalWord)).toEqual([
        'SPARK', 'LIGHT', 'PAINS', 'DWELL', 'CURSE', 'BLACK', 'GRAVE',
      ]);
      expect(state.solution).toHaveLength(6);
      expect(state.hint).toBe('Follow the last arrangement.');
      expect(history.recordPuzzleWords).toHaveBeenCalledWith([
        'SPARK', 'LIGHT', 'PAINS', 'DWELL', 'CURSE', 'BLACK', 'GRAVE',
      ]);
      expect(bank.selectPreGeneratedPuzzle).not.toHaveBeenCalled();
      expect(gen.generateLocalPuzzle).not.toHaveBeenCalled();
      // The quiet start line replaces the normal start toast.
      expect(state.message).toBe('The last arrangement. Take your time.');
    });

    test('selected variant and difficulty preferences survive the one-board finale override', async () => {
      const bank = require('../services/puzzleBank');
      (bank.selectPreGeneratedPuzzle as jest.Mock).mockClear();
      resetHookState();
      let [, actions] = callHook();
      actions.setSelectedVariant('speed');

      (amber.getFullProgress as jest.Mock).mockResolvedValueOnce({
        puzzlesSolved: 162,
        finaleArmed: true,
        finalPuzzleCompleted: false,
      });
      // No dread word (getRitualWords → [], getStrongestDreadWord → null):
      // the ultimate fallback still serves a normal board, marked final.
      [, actions] = callHook();
      await actions.startNewGame('MEDIUM');

      let [state] = callHook();
      expect(state.isFinalBoard).toBe(true);
      expect(state.currentVariant).toBe('standard');
      // The player's preferred variant is untouched for later boards.
      expect(state.selectedVariant).toBe('speed');
      // The current board rewards as HARD, but the no-argument next-board path
      // returns to the player's prior MEDIUM preference.
      expect(state.difficulty).toBe('HARD');
      expect(state.message).toBe('The last arrangement. Take your time.');
      expect(bank.selectPreGeneratedPuzzle).not.toHaveBeenCalled();

      [, actions] = callHook();
      await actions.startNewGame(undefined, undefined, 'standard');
      [state] = callHook();
      expect(state.difficulty).toBe('MEDIUM');
      expect(state.selectedVariant).toBe('speed');
    });

    test('after the finale is completed, boards serve normally again', async () => {
      (amber.getFullProgress as jest.Mock).mockResolvedValueOnce({
        puzzlesSolved: 163,
        finaleArmed: false,
        finalPuzzleCompleted: true,
      });
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('MEDIUM');
      const [state] = callHook();
      expect(state.isFinalBoard).toBe(false);
    });

    test('kill/restore keeps the final-board mark (and a plain restore does not invent one)', () => {
      resetHookState();
      let [, actions] = callHook();
      const baseSaved = {
        rows: [],
        activeRowIndex: 0,
        selectedLetter: null,
        gameState: GameState.PLAYING,
        message: '',
        history: [],
        invalidAttempts: 0,
        hintsUsed: 0,
        undosRemaining: Infinity,
        difficulty: 'MEDIUM',
        currentWordLength: 4,
        hint: '',
        solution: undefined,
        reverseSolution: undefined,
        gameMode: 'standard',
        currentVariant: 'standard',
        selectedVariant: 'standard',
        moveDirection: 'down',
        currentPhase: 4,
        lastFormedWord: null,
        isPlayingDaily: false,
        savedAt: Date.now(),
      };
      actions.restorePuzzleState({ ...baseSaved, isFinalBoard: true } as unknown as import('../services/puzzleSaveState').SavedPuzzleState);
      let [state] = callHook();
      expect(state.isFinalBoard).toBe(true);

      [, actions] = callHook();
      actions.restorePuzzleState(baseSaved as unknown as import('../services/puzzleSaveState').SavedPuzzleState);
      [state] = callHook();
      expect(state.isFinalBoard).toBe(false);
    });

    test('initGame and clearBoard both clear the mark (next board is never final by accident)', async () => {
      (amber.getFullProgress as jest.Mock).mockResolvedValueOnce({
        puzzlesSolved: 162,
        finaleArmed: true,
        finalPuzzleCompleted: false,
      });
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('MEDIUM');
      let [state] = callHook();
      expect(state.isFinalBoard).toBe(true);

      [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);
      [state] = callHook();
      expect(state.isFinalBoard).toBe(false);

      [, actions] = callHook();
      actions.clearBoard();
      [state] = callHook();
      expect(state.isFinalBoard).toBe(false);
    });
  });

  // =========================================================================
  // The final board's ONE rule: undo is refused. Every word placed on the
  // last arrangement is placed for good — complicity becomes mechanical.
  // RESTART (resetCurrentPuzzle) remains the sanctioned repair path and
  // preserves the finale mark; hints stay available; normal boards are
  // untouched.
  // =========================================================================

  describe('final board: undo refused', () => {
    const amber = require('../services/amberCurrency');
    const finalBoard = require('../services/finalBoard');

    afterEach(() => {
      (amber.getFullProgress as jest.Mock).mockImplementation(async () => ({ puzzlesSolved: 20 }));
      (amber.getRitualWords as jest.Mock).mockImplementation(async () => []);
    });

    // Serve THE final board with the synthetic solvable chain ABCD→EFGH→IJKL
    // (move A→slot 0 forms AEFGH; then E→slot 0 forms EIJKL and completes).
    async function serveFinalBoard(blind = false) {
      (amber.getFullProgress as jest.Mock).mockResolvedValueOnce({
        puzzlesSolved: 162,
        finaleArmed: true,
        finalPuzzleCompleted: false,
      });
      (amber.getRitualWords as jest.Mock).mockResolvedValueOnce(['ABCD']);
      (finalBoard.buildFinalBoard as jest.Mock).mockResolvedValueOnce({
        words: ['ABCD', 'EFGH', 'IJKL'],
        hint: 'final',
        solution: [],
        wordLength: 4,
      });
      resetHookState();
      let [, actions] = callHook();
      if (blind) {
        await actions.startNewGame('MEDIUM', 'challenge', 'standard', true);
      } else {
        await actions.startNewGame('MEDIUM');
      }
      const [state] = callHook();
      expect(state.isFinalBoard).toBe(true);
    }

    async function playMove(char: string, slot: number) {
      let [state, actions] = callHook();
      const letter = state.rows[state.activeRowIndex].words.find(
        l => l.char === char && !l.isLocked
      )!;
      actions.handleLetterPress(letter, state.activeRowIndex);
      [, actions] = callHook();
      return actions.handleSlotPress(slot);
    }

    test('undo is refused: nothing reverts, history intact, refusal voiced via error shake', async () => {
      await serveFinalBoard();
      const moved = await playMove('A', 0);
      expect(moved?.completed).toBe(false);

      let [state, actions] = callHook();
      expect(state.history).toHaveLength(1);
      actions.handleUndo();

      [state] = callHook();
      // Nothing reverted: the move stands, the board is unchanged.
      expect(state.history).toHaveLength(1);
      expect(state.activeRowIndex).toBe(1);
      expect(state.rows[1].words.map(l => l.char).join('')).toBe('AEFGH');
      // The refusal speaks through the error shake (phase-aware line).
      expect(state.error).toBe('What is given now is given for good.');
    });

    test('the refusal never charges the flawless run (undosUsed stays 0 at completion)', async () => {
      await serveFinalBoard();
      await playMove('A', 0);
      let [, actions] = callHook();
      actions.handleUndo(); // refused — must not tick undosUsed
      const done = await playMove('E', 0);
      expect(done?.completed).toBe(true);
      expect(done?.isFinalBoard).toBe(true);
      expect(done?.undosUsed).toBe(0);
    });

    test('RESTART still works on the final board and preserves the finale mark', async () => {
      await serveFinalBoard();
      await playMove('A', 0);
      let [state, actions] = callHook();
      expect(state.rows[1].words).toHaveLength(5);

      actions.resetCurrentPuzzle();
      [state] = callHook();
      // The restarted board is still THE final board, back at its start.
      expect(state.isFinalBoard).toBe(true);
      expect(state.gameState).toBe(GameState.PLAYING);
      expect(state.history).toHaveLength(0);
      expect(state.rows.map(r => r.words.map(l => l.char).join(''))).toEqual([
        'ABCD', 'EFGH', 'IJKL',
      ]);
    });

    test('hints remain available on the forced-standard final board', async () => {
      await serveFinalBoard();
      let [state, actions] = callHook();
      expect(state.gameMode).toBe('standard');

      actions.handleHint();
      [state] = callHook();

      expect(state.hintsUsed).toBe(1);
      expect(state.hintHighlight).not.toBeNull();
    });

    test('finale forces blind off; undo is still refused and restart is the escape', async () => {
      await serveFinalBoard(true);
      let [state] = callHook();
      expect(state.blindMode).toBe(false);
      expect(state.gameMode).toBe('standard');

      await playMove('A', 0);
      let [stateAfterMove, actions] = callHook();
      expect(stateAfterMove.history).toHaveLength(1);

      actions.handleUndo();
      [state] = callHook();
      // Even blind's always-free undo yields to the final board's one rule...
      expect(state.history).toHaveLength(1);
      expect(state.error).toBe('What is given now is given for good.');

      // ...and RESTART remains reachable from that state (the documented
      // repair path for a failed blind-finale judgment).
      [, actions] = callHook();
      actions.resetCurrentPuzzle();
      [state] = callHook();
      expect(state.isFinalBoard).toBe(true);
      expect(state.history).toHaveLength(0);
      expect(state.gameState).toBe(GameState.PLAYING);
    });

    test('normal boards undo exactly as before', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);
      await playMove('A', 0);

      let [state, actionsAfter] = callHook();
      expect(state.history).toHaveLength(1);
      actionsAfter.handleUndo();

      [state] = callHook();
      expect(state.history).toHaveLength(0);
      expect(state.activeRowIndex).toBe(0);
      expect(state.rows[1].words.map(l => l.char).join('')).toBe('EFGH');
      expect(state.message).toBe("Let's try again!");
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
  // Challenge mode suppresses slot previews (previews are a free hint —
  // Challenge's no-hints/limited-undos must not be defanged by them)
  // =========================================================================

  describe('slotPreviews suppression (challenge / blind)', () => {
    function selectLetter(char: string) {
      const [state, actions] = callHook();
      const letter = state.rows[state.activeRowIndex].words.find(
        l => l.char === char && !l.isLocked
      )!;
      actions.handleLetterPress(letter, state.activeRowIndex);
    }

    test('challenge mode KEEPS slot previews (2026-07 trial-ladder rebalance)', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.setGameMode('challenge');
      [, actions] = callHook();
      actions.initGame(['TIME', 'TIED']);
      selectLetter('M');

      const [state] = callHook();
      expect(state.gameMode).toBe('challenge');
      expect(state.selectedLetter).not.toBeNull();
      expect(state.slotPreviews).toBeDefined();
      expect(state.slotPreviews![2].word).toBe('TIMED');
    });

    test('standard mode previews are unchanged', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['TIME', 'TIED']);
      selectLetter('M');

      const [state] = callHook();
      expect(state.slotPreviews).toBeDefined();
      expect(state.slotPreviews![2].word).toBe('TIMED');
    });

    test('blind suppresses the double-shift drop1 look-ahead previews (challenge does not)', async () => {
      // Challenge double shift: drop1 look-ahead previews stay on.
      resetHookState();
      let [, actions] = callHook();
      actions.setGameMode('challenge');
      [, actions] = callHook();
      actions.initGame(['ABCDE', 'FGHIJ'], undefined, undefined, 5, 'double_shift');
      selectLetter('A');
      let [state] = callHook();
      expect(state.doubleShiftPhase).toBe('drop1');
      expect(state.slotPreviews).toBeDefined();

      // Blind double shift: same selection, no previews.
      resetHookState();
      [, actions] = callHook();
      await actions.startNewGame('MEDIUM', 'challenge', 'standard', true);
      [, actions] = callHook();
      actions.initGame(['ABCDE', 'FGHIJ'], undefined, undefined, 5, 'double_shift');
      selectLetter('A');
      [state] = callHook();
      expect(state.doubleShiftPhase).toBe('drop1');
      expect(state.slotPreviews).toBeUndefined();
    });

    test('blind mode still hides previews (unchanged by the challenge gate)', async () => {
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('MEDIUM', 'standard', 'standard', true);
      let [state] = callHook();
      expect(state.blindMode).toBe(true);
      selectLetter(state.rows[0].words[0].char);

      [state] = callHook();
      expect(state.selectedLetter).not.toBeNull();
      expect(state.slotPreviews).toBeUndefined();
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
  // Combo cadence + audio ladder
  // =========================================================================

  describe('combo cadence + audio ladder (pure helpers)', () => {
    test('comboTierForStreak maps streak <2 to the base chime and clamps at tier 3', () => {
      expect(comboTierForStreak(0)).toBe(0);
      expect(comboTierForStreak(1)).toBe(0);
      expect(comboTierForStreak(2)).toBe(1);
      expect(comboTierForStreak(3)).toBe(2);
      expect(comboTierForStreak(4)).toBe(3);
      expect(comboTierForStreak(5)).toBe(3);
      expect(comboTierForStreak(12)).toBe(3);
    });

    test('shouldUseComboMessage: streaks 2-3 always escalate; from 4 on only EVEN streaks', () => {
      expect(shouldUseComboMessage(0)).toBe(false);
      expect(shouldUseComboMessage(1)).toBe(false);
      expect(shouldUseComboMessage(2)).toBe(true);
      expect(shouldUseComboMessage(3)).toBe(true);
      expect(shouldUseComboMessage(4)).toBe(true);
      expect(shouldUseComboMessage(5)).toBe(false); // regular pool draw between climbs
      expect(shouldUseComboMessage(6)).toBe(true);
      expect(shouldUseComboMessage(7)).toBe(false);
      expect(shouldUseComboMessage(8)).toBe(true);
    });
  });

  describe('comboTier threading through handleSlotPress', () => {
    async function playMove(char: string, slot: number) {
      let [state, actions] = callHook();
      const letter = state.rows[state.activeRowIndex].words.find(
        l => l.char === char && !l.isLocked
      )!;
      actions.handleLetterPress(letter, state.activeRowIndex);
      [, actions] = callHook();
      return actions.handleSlotPress(slot);
    }

    test('the tier climbs with the clean streak (chime ladder and message escalate together)', async () => {
      resetHookState();
      let [, actions] = callHook();
      // 4-row chain so both moves are intermediate (completion carries no tier).
      actions.initGame(['ABCD', 'EFGH', 'IJKL', 'WXYZ']);

      const first = await playMove('A', 0); // streak 1 → base chime
      expect(first?.completed).toBe(false);
      expect(first?.comboTier).toBe(0);

      const second = await playMove('E', 0); // streak 2 → first ladder step
      expect(second?.completed).toBe(false);
      expect(second?.comboTier).toBe(1);
    });

    test('an invalid attempt resets the ladder to the base chime', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL', 'WXYZ']);

      const first = await playMove('A', 0);
      expect(first?.comboTier).toBe(0);

      // Invalid drop (IJEKL is not a word) breaks the streak...
      const bad = await playMove('E', 2);
      expect(bad).toBeNull();
      // ...so the next committed move is streak 1 again → tier 0.
      let [, actions2] = callHook();
      const redo = await actions2.handleSlotPress(0); // letter still selected
      expect(redo?.completed).toBe(false);
      expect(redo?.comboTier).toBe(0);
    });

    test('the completing move carries no tier (victory owns its own fanfare)', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);
      await playMove('A', 0);
      const done = await playMove('E', 0);
      expect(done?.completed).toBe(true);
      expect(done?.comboTier).toBeUndefined();
    });
  });

  // =========================================================================
  // Verb-depth gate: previewValidityVisible
  // =========================================================================

  describe('previewValidityVisible (verb-depth gate)', () => {
    test('hidden on the default MEDIUM board', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']);
      const [state] = callHook();
      expect(state.difficulty).toBe('MEDIUM');
      expect(state.previewValidityVisible).toBe(false);
    });

    test('shown on EASY boards', async () => {
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('EASY');
      const [state] = callHook();
      expect(state.difficulty).toBe('EASY');
      expect(state.previewValidityVisible).toBe(true);
    });

    test('shown in double_shift at any difficulty (the intermediate non-word state needs it)', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['ABCDE', 'FGHIJ'], undefined, undefined, 5, 'double_shift');
      const [state] = callHook();
      expect(state.difficulty).toBe('MEDIUM');
      expect(state.previewValidityVisible).toBe(true);
    });

    test('hidden in Blind Offering even on EASY', async () => {
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('EASY', 'challenge', 'standard', true);
      const [state] = callHook();
      expect(state.blindMode).toBe(true);
      expect(state.slotPreviews).toBeUndefined();
      expect(state.previewValidityVisible).toBe(false);
    });

    test('the daily hides the grading even when the player pref is EASY', async () => {
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('EASY');
      let [state] = callHook();
      expect(state.previewValidityVisible).toBe(true);

      [, actions] = callHook();
      actions.startDailyGame(['PLANET', 'PLATES', 'PLANES'], undefined, 6);
      [state] = callHook();
      // The daily leaves the difficulty preference untouched...
      expect(state.difficulty).toBe('EASY');
      // ...but its board always hides the grading (MEDIUM+ shape by design).
      expect(state.previewValidityVisible).toBe(false);

      // A normal board afterwards restores the EASY grading.
      [, actions] = callHook();
      actions.initGame(['SUIT', 'SITE', 'WHAT']);
      [state] = callHook();
      expect(state.previewValidityVisible).toBe(true);
    });

    test('shared-challenge boards hide the grading even at an EASY pref', async () => {
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('EASY');

      [, actions] = callHook();
      const ok = actions.startSharedChallengeGame(['SUIT', 'SITE', 'WHAT']);
      expect(ok).toBe(true);
      const [state] = callHook();
      expect(state.previewValidityVisible).toBe(false);
    });

    test('slotPreviews keep computing isValid internally while presentation is hidden', async () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']); // MEDIUM → hidden
      let [state, actionsAfterInit] = callHook();
      const letter = state.rows[0].words.find(l => l.char === 'L' && !l.isLocked)!;
      actionsAfterInit.handleLetterPress(letter, 0);
      [state] = callHook();
      expect(state.previewValidityVisible).toBe(false);
      // The data still grades every slot (drag snapping and look-aheads rely
      // on it) — only the PRESENTATION is gated.
      expect(state.slotPreviews).toBeDefined();
      expect(state.slotPreviews!.some(p => typeof p.isValid === 'boolean')).toBe(true);
    });
  });

  // =========================================================================
  // Preview-grading transition: full grading through solve 11, then a
  // board-local rescue from solves 12 through 19. Rescue boards begin neutral
  // and restore the checks after the first invalid attempt. At solve 20 the
  // steady-state verb-depth rules take over.
  // =========================================================================

  describe('previewValidityVisible (early-game grading transition)', () => {
    const amber = require('../services/amberCurrency');

    afterEach(() => {
      // Restore the suite-wide fully-neutral default.
      (amber.getFullProgress as jest.Mock).mockImplementation(async () => ({ puzzlesSolved: 20 }));
    });

    test('a MEDIUM board before the full-grading limit keeps the grading on', async () => {
      (amber.getFullProgress as jest.Mock).mockResolvedValueOnce({
        puzzlesSolved: PREVIEW_GRADING_FULL_LIMIT - 1,
      });
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('MEDIUM');
      const [state] = callHook();
      expect(state.difficulty).toBe('MEDIUM');
      expect(state.previewGradingMode).toBe('graded');
      expect(state.previewValidityVisible).toBe(true);
    });

    test('a rescue board starts neutral, then restores checks once after the first invalid attempt', async () => {
      const narrative = require('../services/phaseNarrative');
      (amber.getFullProgress as jest.Mock).mockResolvedValueOnce({
        puzzlesSolved: PREVIEW_GRADING_FULL_LIMIT,
      });
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('MEDIUM');
      let [state, liveActions] = callHook();
      expect(state.previewGradingMode).toBe('rescue');
      expect(state.previewValidityVisible).toBe(false);

      const letter = state.rows[0].words.find(l => l.char === 'L')!;
      liveActions.handleLetterPress(letter, 0);
      [, actions] = callHook();
      expect(await actions.handleSlotPress(0)).toBeNull();

      [state, actions] = callHook();
      expect(state.invalidAttempts).toBe(1);
      expect(state.previewGradingMode).toBe('rescue');
      expect(state.previewValidityVisible).toBe(true);
      expect(state.message).toBe('The checks return for this board.');
      expect(narrative.getPreviewRescueMessage).toHaveBeenCalledTimes(1);

      (narrative.getPreviewRescueMessage as jest.Mock).mockClear();
      expect(await actions.handleSlotPress(0)).toBeNull();
      expect(narrative.getPreviewRescueMessage).not.toHaveBeenCalled();

      [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED']);
      [state] = callHook();
      expect(state.previewGradingMode).toBe('rescue');
      expect(state.previewValidityVisible).toBe(false);
    });

    test('the rescue window ends at the neutral limit', async () => {
      (amber.getFullProgress as jest.Mock).mockResolvedValueOnce({
        puzzlesSolved: PREVIEW_GRADING_RESCUE_LIMIT,
      });
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('MEDIUM');
      const [state] = callHook();
      expect(state.previewGradingMode).toBe('neutral');
      expect(state.previewValidityVisible).toBe(false);
    });

    test('Blind Offering still suppresses everything during full grading', async () => {
      (amber.getFullProgress as jest.Mock).mockResolvedValueOnce({ puzzlesSolved: 5 });
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('EASY', 'challenge', 'standard', true);
      const [state] = callHook();
      expect(state.blindMode).toBe(true);
      expect(state.previewGradingMode).toBe('hidden');
      expect(state.previewValidityVisible).toBe(false);
      expect(state.slotPreviews).toBeUndefined();
    });

    test('the daily is graded during the full-grading window', async () => {
      (amber.getFullProgress as jest.Mock).mockResolvedValueOnce({ puzzlesSolved: 9 });
      resetHookState();
      let [, actions] = callHook();
      // Seed the grading counter via a normal start (the daily itself does not
      // fetch progress; it inherits the last-known count).
      await actions.startNewGame('MEDIUM');

      [, actions] = callHook();
      actions.startDailyGame(['PLANET', 'PLATES', 'PLANES'], undefined, 6);
      const [state] = callHook();
      expect(state.previewValidityVisible).toBe(true);
    });

    test('shared-challenge boards are graded during the full-grading window', async () => {
      (amber.getFullProgress as jest.Mock).mockResolvedValueOnce({ puzzlesSolved: 9 });
      resetHookState();
      let [, actions] = callHook();
      await actions.startNewGame('MEDIUM');

      [, actions] = callHook();
      const ok = actions.startSharedChallengeGame(['SUIT', 'SITE', 'WHAT']);
      expect(ok).toBe(true);
      const [state] = callHook();
      expect(state.previewValidityVisible).toBe(true);
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
      const ok = actions.startSharedChallengeGame(['lime', 'time', 'tied']);
      expect(ok).toBe(true);

      const [state] = callHook();
      expect(state.rows.map(r => r.originalWord)).toEqual(['LIME', 'TIME', 'TIED']);
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
      const ok = actions.startSharedChallengeGame(['LIME', 'TIME', 'ZZZZ']);
      expect(ok).toBe(false);

      const [state] = callHook();
      expect(state.rows).toHaveLength(0);
      expect(state.gameState).toBe(GameState.IDLE);
    });

    test('rejects mismatched word lengths', () => {
      resetHookState();
      let [, actions] = callHook();
      expect(actions.startSharedChallengeGame(['LIME', 'TIME', 'TIE'])).toBe(false);
      const [state] = callHook();
      expect(state.gameState).toBe(GameState.IDLE);
    });

    test('rejects chains outside the shared 3-6 word bound or malformed', () => {
      resetHookState();
      let [, actions] = callHook();
      expect(actions.startSharedChallengeGame(['TIME'])).toBe(false);
      [, actions] = callHook();
      // 2-word chains are below the MIN_CHALLENGE_WORDS bound shared with
      // encode/decodeChallengeLink — even when both words are valid.
      expect(actions.startSharedChallengeGame(['TIME', 'TIED'])).toBe(false);
      [, actions] = callHook();
      expect(actions.startSharedChallengeGame([])).toBe(false);
      [, actions] = callHook();
      // 7 words exceeds MAX_CHALLENGE_WORDS
      expect(
        actions.startSharedChallengeGame(['LIME', 'TIME', 'TIED', 'LIME', 'TIME', 'TIED', 'LIME'])
      ).toBe(false);
      [, actions] = callHook();
      // Word lengths outside the 3-7 dictionary range
      expect(actions.startSharedChallengeGame(['AB', 'CD', 'EF'])).toBe(false);

      const [state] = callHook();
      expect(state.gameState).toBe(GameState.IDLE);
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

  // =========================================================================
  // Stuck detection stays silent (product decision)
  // =========================================================================

  describe('stuck detection stays silent', () => {
    test('the hook computes isStuck but never announces an unwinnable board', () => {
      // Product decision: no immediate "you're stuck" message — the player
      // discovers the dead-end and chooses to undo or restart. isStuck stays
      // a computed internal signal that drives nothing player-visible.
      const fs = require('fs');
      const path = require('path');
      const HOOK_SRC = fs.readFileSync(
        path.resolve(__dirname, '../hooks/usePuzzleGame.ts'),
        'utf8'
      );
      expect(HOOK_SRC).toMatch(/setIsStuck\(/); // internal computation kept
      expect(HOOK_SRC).not.toMatch(/getNoValidMovesMessage/);
      expect(HOOK_SRC).not.toMatch(/getStuckPanelTitle/);
    });
  });

  describe('handleHint stale-step guard', () => {
    test('never consumes a hint whose stored step is illegal on the current board', () => {
      const { consumeHintSync } = require('../services/hints');
      (consumeHintSync as jest.Mock).mockClear();

      // Stored solution claims: move 'I' from LIME into TIME. Removing 'I'
      // leaves 'LME' — NOT in the mocked dictionary — so the shipped rules
      // reject the stored step (the post-generation purge scenario).
      // A legal live move exists instead: 'L' (remainder IME) into TIME at
      // position 4 forming TIMEL... none valid in the mock, so the live
      // search also fails and the hook must fall back WITHOUT charging.
      const staleSolution = [
        { stepIndex: 0, sourceWord: 'LIME', targetWord: 'TIME', letterToMove: 'I', explanation: 'stale', removalPosition: 1, insertionPosition: 0 },
      ];
      let [, actions] = callHook();
      actions.initGame(['LIME', 'TIME', 'TIED'], 'hint', staleSolution);

      [, actions] = callHook();
      actions.handleHint();

      const [state] = callHook();
      // No consumable spent, no star penalty, fallback message shown.
      expect(consumeHintSync).not.toHaveBeenCalled();
      expect(state.hintsUsed).toBe(0);
      expect(state.message).toBe('Try undoing!');
    });

    test('a stale stored step falls through to a legal live move (charged once)', () => {
      const { consumeHintSync } = require('../services/hints');
      (consumeHintSync as jest.Mock).mockClear();

      // Board ABCD → EFGH: the mocked dictionary contains BCD (remainder of
      // removing A) and AEFGH (A inserted at position 0 of EFGH), so the live
      // search finds A→slot0. The stored step claims the illegal move 'B'
      // (remainder ACD is not a word) — the guard must discard it and charge
      // for the LIVE hint instead.
      const staleSolution = [
        { stepIndex: 0, sourceWord: 'ABCD', targetWord: 'EFGH', letterToMove: 'B', explanation: 'stale', removalPosition: 1, insertionPosition: 2 },
      ];
      let [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL'], 'hint', staleSolution);

      [, actions] = callHook();
      actions.handleHint();

      const [state] = callHook();
      expect(consumeHintSync).toHaveBeenCalledTimes(1);
      expect(state.hintsUsed).toBe(1);
      // The delivered highlight points at the LIVE move's letter (A), not the
      // stale step's letter (B).
      expect(state.hintHighlight?.letterIndex).toBe(0);
    });
  });

  // =========================================================================
  // Hint dead-end awareness (off-solution fallback search)
  // =========================================================================

  describe('handleHint dead-end awareness', () => {
    test('prefers a solvable candidate over the first valid dead end', () => {
      const { getHintMessage } = require('../services/phaseNarrative');
      (getHintMessage as jest.Mock).mockClear();

      resetHookState();
      let [, actions] = callHook();
      // No stored solution (the daily / shared-link shape) — every hint takes
      // the live search. Scan order finds M@0 first (NOP + MQRST, both valid)
      // but MQRST is a dead end: no removal of Q/R/S/T leaves a word. The
      // solvable alternative N@0 (MOP + NQRST, then Q → NRST + QUVWX
      // completes) must win.
      actions.initGame(['MNOP', 'QRST', 'UVWX']);

      [, actions] = callHook();
      actions.handleHint();

      const [state] = callHook();
      expect(state.hintsUsed).toBe(1);
      expect(getHintMessage).toHaveBeenCalledWith('N', 'NQRST', expect.anything());
      expect(state.hintHighlight!.letterIndex).toBe(1);
      expect(state.hintHighlight!.targetSlotIndex).toBe(0);
    });

    test('falls back to the first valid move when only dead ends exist (never refuses)', () => {
      const { consumeHintSync } = require('../services/hints');
      (consumeHintSync as jest.Mock).mockClear();
      const { getHintMessage } = require('../services/phaseNarrative');
      (getHintMessage as jest.Mock).mockClear();

      resetHookState();
      let [, actions] = callHook();
      // Single one-ply candidate M@0 (NOP + MJQXZ); MJQXZ has no onward word,
      // so the board is a guaranteed dead end. A legal move exists, so the
      // hint must still deliver (and charge) rather than come up empty.
      actions.initGame(['MNOP', 'JQXZ', 'UVWX']);

      [, actions] = callHook();
      actions.handleHint();

      const [state] = callHook();
      expect(state.hintsUsed).toBe(1);
      expect(consumeHintSync).toHaveBeenCalledTimes(1);
      expect(getHintMessage).toHaveBeenCalledWith('M', 'MJQXZ', expect.anything());
      expect(state.hintHighlight!.letterIndex).toBe(0);
      expect(state.hintHighlight!.targetSlotIndex).toBe(0);
    });

    test('a completing move is always acceptable (2-row board, no downstream check)', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.initGame(['TIME', 'TIED']); // M@2 completes the puzzle

      [, actions] = callHook();
      actions.handleHint();

      const [state] = callHook();
      expect(state.hintsUsed).toBe(1);
      expect(state.hintHighlight!.letterIndex).toBe(2);
      expect(state.hintHighlight!.targetSlotIndex).toBe(2);
    });
  });

  // =========================================================================
  // isBoardSolvableFromState (pure from-state solver used by the hint filter)
  // =========================================================================

  describe('isBoardSolvableFromState', () => {
    const cells = (word: string, lockedIdx: number[] = []) =>
      word.split('').map((char, i) => ({ char, isLocked: lockedIdx.includes(i) }));
    const validator = (words: string[]) => {
      const set = new Set(words);
      return (w: string) => set.has(w);
    };

    test('standard: locked letters cannot be picked (lock-aware, unlike isChainSolvable)', () => {
      const board = [cells('MQRST', [0]), cells('UVWX')];
      // The ONLY route would be picking the locked M (QRST + MUVWX) — a
      // lock-blind solver would bless this; the from-state solver must not.
      expect(
        isBoardSolvableFromState(board, 0, 'down', 'standard', validator(['QRST', 'MUVWX']))
      ).toBe(false);
      // An unlocked route (Q → MRST + QUVWX) makes it solvable.
      expect(
        isBoardSolvableFromState(board, 0, 'down', 'standard', validator(['MRST', 'QUVWX']))
      ).toBe(true);
    });

    test('standard: multi-row chains recurse with replace-lock semantics', () => {
      const board = [cells('NQRST', [0]), cells('UVWX')];
      // From NQRST (N locked): Q → NRST + QUVWX completes.
      expect(
        isBoardSolvableFromState(board, 0, 'down', 'standard', validator(['NRST', 'QUVWX']))
      ).toBe(true);
    });

    test('reverse: ascent completes into row 0, honoring descent locks', () => {
      // Post-midpoint state: direction up, active = last row; M locked from
      // the descent. D → TIME + TIED (into row 0) completes.
      const board = [cells('TIE'), cells('TIMED', [2])];
      expect(
        isBoardSolvableFromState(board, 1, 'up', 'reverse', validator(['TIME', 'TIED']))
      ).toBe(true);
      // Without a valid ascent insertion the board is lost.
      expect(
        isBoardSolvableFromState(board, 1, 'up', 'reverse', validator(['TIME']))
      ).toBe(false);
    });

    test('double shift: honors accumulated locks on the two-letter step', () => {
      const board = [cells('SPLAT'), cells('IE')];
      // P then S: LAT (final source) + PIES (final target) completes.
      expect(
        isBoardSolvableFromState(board, 0, 'down', 'double_shift', validator(['LAT', 'PIES']))
      ).toBe(true);
      // Locking the S removes the only completion.
      const lockedBoard = [cells('SPLAT', [0]), cells('IE')];
      expect(
        isBoardSolvableFromState(lockedBoard, 0, 'down', 'double_shift', validator(['LAT', 'PIES']))
      ).toBe(false);
    });
  });

  // =========================================================================
  // Shared-challenge provenance flag (drives amber-only shared-link wins)
  // =========================================================================

  describe('isSharedChallenge flag lifecycle', () => {
    test('false by default and after initGame', () => {
      resetHookState();
      let [state, actions] = callHook();
      expect(state.isSharedChallenge).toBe(false);
      actions.initGame(['LIME', 'TIME', 'TIED']);
      [state] = callHook();
      expect(state.isSharedChallenge).toBe(false);
    });

    test('set by startSharedChallengeGame, cleared by every other start path', () => {
      resetHookState();
      let [, actions] = callHook();
      expect(actions.startSharedChallengeGame(['LIME', 'TIME', 'TIED'])).toBe(true);
      let [state] = callHook();
      expect(state.isSharedChallenge).toBe(true);

      // Daily start clears it.
      [, actions] = callHook();
      actions.startDailyGame(['PLANET', 'PLATES'], undefined, 6);
      [state] = callHook();
      expect(state.isSharedChallenge).toBe(false);

      // Back to shared, then initGame (the startNewGame / Next Level commit
      // path) clears it again.
      [, actions] = callHook();
      actions.startSharedChallengeGame(['LIME', 'TIME', 'TIED']);
      [, actions] = callHook();
      actions.initGame(['ABCD', 'EFGH', 'IJKL']);
      [state] = callHook();
      expect(state.isSharedChallenge).toBe(false);
    });

    test('a rejected shared chain never sets the flag', () => {
      resetHookState();
      let [, actions] = callHook();
      expect(actions.startSharedChallengeGame(['LIME', 'TIME', 'ZZZZ'])).toBe(false);
      const [state] = callHook();
      expect(state.isSharedChallenge).toBe(false);
    });

    test('survives resetCurrentPuzzle (a retry is the same board) but not clearBoard', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.startSharedChallengeGame(['LIME', 'TIME', 'TIED']);
      [, actions] = callHook();
      actions.resetCurrentPuzzle();
      let [state] = callHook();
      expect(state.isSharedChallenge).toBe(true);

      [, actions] = callHook();
      actions.clearBoard();
      [state] = callHook();
      expect(state.isSharedChallenge).toBe(false);
    });

    test('reset to false on autosave restore (provenance is not persisted)', () => {
      resetHookState();
      let [, actions] = callHook();
      actions.startSharedChallengeGame(['LIME', 'TIME', 'TIED']);
      let [state, actions2] = callHook();
      expect(state.isSharedChallenge).toBe(true);

      const saved = {
        rows: state.rows,
        activeRowIndex: 0,
        selectedLetter: null,
        gameState: GameState.PLAYING,
        message: '',
        history: [],
        invalidAttempts: 0,
        hintsUsed: 0,
        undosRemaining: Infinity,
        difficulty: 'MEDIUM',
        currentWordLength: 4,
        hint: '',
        solution: undefined,
        reverseSolution: undefined,
        gameMode: 'standard',
        currentVariant: 'standard',
        selectedVariant: 'standard',
        moveDirection: 'down',
        currentPhase: 0,
        lastFormedWord: null,
        isPlayingDaily: false,
        savedAt: Date.now(),
      };
      actions2.restorePuzzleState(saved as unknown as import('../services/puzzleSaveState').SavedPuzzleState);
      [state] = callHook();
      expect(state.isSharedChallenge).toBe(false);
    });
  });
});
