/**
 * Resonant-choice detection tests (evaluative depth).
 *
 * A committed move is a RESONANT CHOICE when the player had a real choice of
 * valid outcome words (2+ distinct), the word they formed carries dread weight
 * (tier >= 1), and no available alternative ran deeper. Resonance pays a small
 * per-move amber bonus (board-capped) and a mastery stat — never phase
 * progress — and its move line REPLACES the normal move message.
 *
 * Same manual synchronous React-hook harness as usePuzzleGame.test.ts, with a
 * purpose-built dictionary + dread-tier map so every scenario is deterministic.
 */

import { GameState, Letter } from '../types';

// --- Mock React hooks to run synchronously in Node ---
const stateStore: Map<number, unknown> = new Map();
let stateIndex = 0;
const refStore: Map<number, { current: unknown }> = new Map();
let refIndex = 0;
let effectCallbacks: (() => void)[] = [];

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

jest.mock('react', () => ({
  useState: (initial: unknown) => {
    const idx = stateIndex++;
    if (!stateStore.has(idx)) {
      stateStore.set(idx, typeof initial === 'function' ? (initial as () => unknown)() : initial);
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

// --- Dread-tier map for the synthetic vocabulary ---
// Board A (single shift): ABCD → EFGH → IJKL
//   First step outcomes:  AEFGH (tier 2, the deep word) vs DEFGH (tier 0)
//   Second step outcome:  EIJKL only (forced — never resonant)
// Board B (double shift): ABCDE → FGHIJ
//   Completed-step outcomes: ABFGHIJ (tier 2) vs ACFGHIJ (tier 0)
jest.mock('../services/localGenerator', () => {
  const mockTiers: Record<string, number> = {
    AEFGH: 2,
    DEFGH: 0,
    EIJKL: 3,
    ABFGHIJ: 2,
    ACFGHIJ: 0,
  };
  return {
    generateLocalPuzzle: jest.fn(async () => ({
      words: ['ABCD', 'EFGH', 'IJKL'],
      hint: 'Test hint',
      solution: [],
      wordLength: 4,
    })),
    generateDoubleShiftPuzzle: jest.fn(async () => ({
      words: ['ABCDE', 'FGHIJ'],
      hint: 'DS hint',
      solution: [],
      wordLength: 5,
      isDoubleShift: true,
    })),
    getIncantationName: jest.fn(() => null),
    getStrongestDreadWord: jest.fn(() => null),
    getWordPhaseTier: jest.fn((word: string) => mockTiers[word.toUpperCase()] ?? 0),
  };
});

jest.mock('../services/phaseNarrative', () => ({
  getMoveMessage: jest.fn(() => 'Nice move!'),
  getComboMoveMessage: jest.fn((_s: number, _p: number) => 'Combo!'),
  getHintMessage: jest.fn(() => 'Hint: move letter'),
  getHintFallback: jest.fn(() => 'Try undoing!'),
  getOutOfHintsMessage: jest.fn(() => 'Out of hints!'),
  getLoadingMessage: jest.fn(() => 'Loading...'),
  getStartMessage: jest.fn(() => 'Tap a tile to begin!'),
  getInvalidWordMessage: jest.fn((word: string) => `${word} isn't a word!`),
  getBlockedWordMessage: jest.fn(() => 'That word cannot be used.'),
  getBlindFailMessage: jest.fn(() => 'Not every word held!'),
  getLockedLetterMessage: jest.fn(() => 'That letter is locked!'),
  getEchoPuzzleMessage: jest.fn(() => 'An echo returns.'),
  getFinalBoardStartMessage: jest.fn(() => 'The last arrangement.'),
  getFinalBoardUndoRefusal: jest.fn(() => 'Given for good.'),
  getResonantMoveMessage: jest.fn((_p: number) => 'RESONANT_LINE'),
  getFinalBoardMoveMessage: jest.fn((_p: number) => 'Placed. Kept.'),
  getUnbrokenWeaveSpentLetterMessage: jest.fn((l: string) => `${l} spent.`),
  getUnbrokenWeaveUnavailableMessage: jest.fn(() => 'Weave unavailable.'),
}));

jest.mock('../services/hints', () => ({
  getHintBalanceSync: jest.fn(() => 5),
  hasHintSync: jest.fn(() => true),
  consumeHintSync: jest.fn(() => true),
}));

jest.mock('../services/amberCurrency', () => ({
  getPreferredPuzzleVariant: jest.fn(async () => 'standard'),
  setPreferredPuzzleVariant: jest.fn(async () => {}),
  getFullProgress: jest.fn(async () => ({ puzzlesSolved: 20 })),
  getRitualWords: jest.fn(async () => []),
}));

jest.mock('../services/finalBoard', () => ({
  buildFinalBoard: jest.fn(async () => ({
    words: ['ABCD', 'EFGH', 'IJKL'],
    hint: 'final',
    solution: [],
    wordLength: 4,
  })),
}));

jest.mock('../services/wordHistory', () => ({
  getWordHistoryWithRecency: jest.fn(async () => new Map()),
  recordPuzzleWords: jest.fn(async () => {}),
}));

jest.mock('../services/puzzleBank', () => ({
  selectPreGeneratedPuzzle: jest.fn(async () => null),
  getGuaranteedExtendedStandardFallback: jest.fn(() => ({
    words: ['ABCD', 'EFGH', 'IJKL'],
    hint: 'fallback',
    solution: [],
    wordLength: 4,
  })),
}));

jest.mock('../services/puzzleExtension', () => ({
  PUZZLE_EXTENSION_UNLOCK_PUZZLES: 100,
  extendStandardPuzzle: jest.fn(config => config),
}));

jest.mock('../services/shareResults', () => ({
  MIN_CHALLENGE_WORDS: 3,
  MAX_CHALLENGE_WORDS: 6,
}));

jest.mock('../constants', () => ({
  COMMON_WORDS: new Set([
    // Board A first step: remove A leaves BCD, remove D leaves ABC.
    // Insertions: AEFGH (deep) and DEFGH (shallow) — a real choice of two.
    'BCD', 'ABC', 'AEFGH', 'DEFGH',
    // Board A second step (forced): only E removal (AFGH) → EIJKL.
    'AFGH', 'EIJKL',
    // Board B (double shift) completed-step decision space: remove B leaves
    // CDE (→ ABFGHIJ), remove C leaves BDE (→ ACFGHIJ).
    'CDE', 'BDE', 'ABFGHIJ', 'ACFGHIJ',
  ]),
  CURATED_EARLY_PUZZLES: [
    { words: ['ABCD', 'EFGH', 'IJKL'], solution: [] },
  ],
  CURATED_PUZZLE_COUNT: 1,
  getRandomFallback: () => ['ABCD', 'EFGH', 'IJKL'],
}));

import {
  usePuzzleGame,
  collectDistinctOutcomeWords,
  isResonantChoice,
  resonanceAmberForCount,
  PuzzleGameState,
  PuzzleGameActions,
} from '../hooks/usePuzzleGame';
import {
  RESONANT_MOVE_AMBER,
  RESONANT_BOARD_CAP_AMBER,
} from '../constants/gameBalance';

function callHook(): [PuzzleGameState, PuzzleGameActions] {
  rewindHookIndices();
  // eslint-disable-next-line react-hooks/rules-of-hooks -- test harness drives the hook against a manual React mock
  return usePuzzleGame();
}

/** Select the first unlocked tile with this char on the active row and drop it. */
async function playMove(char: string, slot: number) {
  let [state, actions] = callHook();
  const letter = state.rows[state.activeRowIndex].words.find(
    l => l.char === char && !l.isLocked
  )!;
  actions.handleLetterPress(letter, state.activeRowIndex);
  [, actions] = callHook();
  return actions.handleSlotPress(slot);
}

// ===========================================================================
// Pure helpers
// ===========================================================================

describe('collectDistinctOutcomeWords', () => {
  const dict = new Set(['BCD', 'ABC', 'AEFGH', 'DEFGH']);
  const isValid = (w: string) => dict.has(w);
  const letters = (word: string, lockedIdx: number[] = []): Letter[] =>
    word.split('').map((char, i) => ({ id: `l${i}`, char, isLocked: lockedIdx.includes(i) }));

  test('collects every distinct valid outcome word across letters x slots', () => {
    const outcomes = collectDistinctOutcomeWords(letters('ABCD'), 'EFGH'.split(''), isValid);
    expect(outcomes).toEqual(new Set(['AEFGH', 'DEFGH']));
  });

  test('locked letters cannot contribute outcomes', () => {
    const outcomes = collectDistinctOutcomeWords(letters('ABCD', [0]), 'EFGH'.split(''), isValid);
    expect(outcomes).toEqual(new Set(['DEFGH']));
  });

  test('spent letters (Unbroken Weave) cannot contribute outcomes', () => {
    const outcomes = collectDistinctOutcomeWords(
      letters('ABCD'), 'EFGH'.split(''), isValid, new Set(['A'])
    );
    expect(outcomes).toEqual(new Set(['DEFGH']));
  });

  test('a removal that breaks the source word contributes nothing', () => {
    // Removing B leaves ACD (not a word) even though a target word could form.
    const smallDict = new Set(['BEFGH']);
    const outcomes = collectDistinctOutcomeWords(
      letters('ABCD'), 'EFGH'.split(''), (w) => smallDict.has(w)
    );
    expect(outcomes.size).toBe(0);
  });

  test('dedupes by outcome word (duplicate letters, one word)', () => {
    const dupDict = new Set(['ABC', 'AABC', 'AEFGH']);
    // AABC has two movable As that both form AEFGH at slot 0.
    const outcomes = collectDistinctOutcomeWords(
      letters('AABC').map((l, i) => ({ ...l, id: `d${i}` })),
      'EFGH'.split(''),
      (w) => dupDict.has(w)
    );
    expect(outcomes).toEqual(new Set(['AEFGH']));
  });
});

describe('isResonantChoice', () => {
  test('needs 2+ distinct outcomes (a forced step is never resonant)', () => {
    expect(isResonantChoice('AEFGH', new Set(['AEFGH']))).toBe(false);
  });

  test('a tier-0 chosen word is never resonant, even with a choice', () => {
    expect(isResonantChoice('DEFGH', new Set(['AEFGH', 'DEFGH']))).toBe(false);
  });

  test('the deepest available word is resonant', () => {
    expect(isResonantChoice('AEFGH', new Set(['AEFGH', 'DEFGH']))).toBe(true);
  });

  test('a deeper available alternative disqualifies the choice', () => {
    // EIJKL is tier 3 — choosing tier-2 AEFGH is not the deepest available.
    expect(isResonantChoice('AEFGH', new Set(['AEFGH', 'EIJKL']))).toBe(false);
  });

  test('an equal-tier tie still counts (no alternative ran deeper)', () => {
    // ABFGHIJ is also tier 2.
    expect(isResonantChoice('AEFGH', new Set(['AEFGH', 'ABFGHIJ']))).toBe(true);
  });
});

describe('resonanceAmberForCount (the board cap)', () => {
  test('pays RESONANT_MOVE_AMBER per choice up to RESONANT_BOARD_CAP_AMBER', () => {
    expect(resonanceAmberForCount(0)).toBe(0);
    expect(resonanceAmberForCount(1)).toBe(RESONANT_MOVE_AMBER);
    expect(resonanceAmberForCount(2)).toBe(2 * RESONANT_MOVE_AMBER);
    expect(resonanceAmberForCount(3)).toBe(RESONANT_BOARD_CAP_AMBER);
    expect(resonanceAmberForCount(4)).toBe(RESONANT_BOARD_CAP_AMBER);
    expect(resonanceAmberForCount(50)).toBe(RESONANT_BOARD_CAP_AMBER);
  });

  test('negative counts pay nothing', () => {
    expect(resonanceAmberForCount(-3)).toBe(0);
  });
});

// ===========================================================================
// Hook integration
// ===========================================================================

describe('resonance tracking through the hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const amber = require('../services/amberCurrency');
    (amber.getFullProgress as jest.Mock).mockResolvedValue({ puzzlesSolved: 20 });
    (amber.getRitualWords as jest.Mock).mockResolvedValue([]);
    resetHookState();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('a choice-of-two with the dread word chosen counts, pays, and speaks the resonant line', async () => {
    let [, actions] = callHook();
    actions.initGame(['ABCD', 'EFGH', 'IJKL']);

    // AEFGH (tier 2) vs DEFGH (tier 0) — choose the deep one.
    const result = await playMove('A', 0);
    expect(result?.completed).toBe(false);
    expect(result?.formedWord).toBe('AEFGH');

    const [state] = callHook();
    expect(state.resonantChoiceCount).toBe(1);
    expect(state.resonanceAmber).toBe(RESONANT_MOVE_AMBER);
    // The resonant line REPLACES the normal move message (never stacked).
    expect(state.message).toBe('RESONANT_LINE');
  });

  test('choosing the shallow word from the same choice does not count', async () => {
    let [, actions] = callHook();
    actions.initGame(['ABCD', 'EFGH', 'IJKL']);

    const result = await playMove('D', 0); // DEFGH, tier 0
    expect(result?.formedWord).toBe('DEFGH');

    const [state] = callHook();
    expect(state.resonantChoiceCount).toBe(0);
    expect(state.resonanceAmber).toBe(0);
    expect(state.message).toBe('Nice move!');
  });

  test('a forced step (single outcome) never counts, and the completion result carries the tally', async () => {
    let [, actions] = callHook();
    actions.initGame(['ABCD', 'EFGH', 'IJKL']);

    await playMove('A', 0); // resonant (choice of two)
    // Second step is forced: only E can move, only EIJKL can form — tier 3,
    // but with no alternative it is not a choice.
    const result = await playMove('E', 0);
    expect(result?.completed).toBe(true);
    expect(result?.resonantChoiceCount).toBe(1);
    expect(result?.resonanceAmber).toBe(RESONANT_MOVE_AMBER);
  });

  test('undo decrements the tally (MoveDelta idiom)', async () => {
    let [, actions] = callHook();
    actions.initGame(['ABCD', 'EFGH', 'IJKL']);

    await playMove('A', 0);
    let [state] = callHook();
    expect(state.resonantChoiceCount).toBe(1);

    [, actions] = callHook();
    actions.handleUndo();
    [state] = callHook();
    expect(state.resonantChoiceCount).toBe(0);
    expect(state.resonanceAmber).toBe(0);
    expect(state.rows[0].words.map(l => l.char).join('')).toBe('ABCD');
  });

  test('blind mode is excluded entirely (judged at the end, never mid-board)', async () => {
    resetHookState();
    let [, actions] = callHook();
    await actions.startNewGame('MEDIUM', 'standard', 'standard', true);
    [, actions] = callHook();
    actions.initGame(['ABCD', 'EFGH', 'IJKL']);
    let [state] = callHook();
    expect(state.blindMode).toBe(true);

    // Exactly the resonant move from the standard test — blind must not count.
    await playMove('A', 0);
    [state] = callHook();
    expect(state.resonantChoiceCount).toBe(0);
    expect(state.resonanceAmber).toBe(0);
    expect(state.message).not.toBe('RESONANT_LINE');
  });

  test('the finale board never pays resonance', async () => {
    const amber = require('../services/amberCurrency');
    (amber.getFullProgress as jest.Mock).mockResolvedValueOnce({
      puzzlesSolved: 162,
      finaleArmed: true,
      finalPuzzleCompleted: false,
    });
    (amber.getRitualWords as jest.Mock).mockResolvedValueOnce(['ABCD']);

    resetHookState();
    let [, actions] = callHook();
    await actions.startNewGame('MEDIUM');
    let [state] = callHook();
    expect(state.isFinalBoard).toBe(true);

    await playMove('A', 0); // same real choice — the finale refuses the beat
    [state] = callHook();
    expect(state.resonantChoiceCount).toBe(0);
    expect(state.message).not.toBe('RESONANT_LINE');
  });

  test('double shift counts once, on the completed step, from the mid-step decision space', async () => {
    let [, actions] = callHook();
    actions.initGame(['ABCDE', 'FGHIJ'], undefined, undefined, 5, 'double_shift');

    // drop1: no formedWord, no resonance evaluation.
    const first = await playMove('A', 0);
    expect(first?.formedWord).toBeUndefined();
    let [state] = callHook();
    expect(state.resonantChoiceCount).toBe(0);

    // drop2: ABFGHIJ (tier 2) vs ACFGHIJ (tier 0) — the deep word completes
    // the step (and, on this 2-row board, the puzzle).
    const second = await playMove('B', 1);
    expect(second?.completed).toBe(true);
    expect(second?.resonantChoiceCount).toBe(1);
    expect(second?.resonanceAmber).toBe(RESONANT_MOVE_AMBER);
  });

  test('a new board resets the tally', async () => {
    let [, actions] = callHook();
    actions.initGame(['ABCD', 'EFGH', 'IJKL']);
    await playMove('A', 0);
    let [state] = callHook();
    expect(state.resonantChoiceCount).toBe(1);

    [, actions] = callHook();
    actions.initGame(['ABCD', 'EFGH', 'IJKL']);
    [state] = callHook();
    expect(state.resonantChoiceCount).toBe(0);
    expect(state.resonanceAmber).toBe(0);
  });

  test('restart (resetCurrentPuzzle) resets the tally with the board', async () => {
    let [, actions] = callHook();
    actions.initGame(['ABCD', 'EFGH', 'IJKL']);
    await playMove('A', 0);

    [, actions] = callHook();
    actions.resetCurrentPuzzle();
    const [state] = callHook();
    expect(state.gameState).toBe(GameState.PLAYING);
    expect(state.resonantChoiceCount).toBe(0);
  });

  test('moveHistorySummary mirrors committed history and pops on undo', async () => {
    let [, actions] = callHook();
    actions.initGame(['ABCD', 'EFGH', 'IJKL']);
    let [state] = callHook();
    expect(state.moveHistorySummary).toEqual([]);

    await playMove('A', 0);
    [state] = callHook();
    expect(state.moveHistorySummary).toEqual([{ letter: 'A', fromRow: 0 }]);

    [, actions] = callHook();
    actions.handleUndo();
    [state] = callHook();
    expect(state.moveHistorySummary).toEqual([]);
  });
});
