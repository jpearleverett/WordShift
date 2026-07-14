import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { RowData, Letter, GameState, MoveDelta, PuzzleSolutionStep, Difficulty, GameMode } from '../types';
import { SavedPuzzleState } from '../services/puzzleSaveState';
import { generateLocalPuzzle, generateDoubleShiftPuzzle, getIncantationName, getStrongestDreadWord } from '../services/localGenerator';
import { selectPreGeneratedPuzzle } from '../services/puzzleBank';
import { getWordHistoryWithRecency, recordPuzzleWords } from '../services/wordHistory';
import { COMMON_WORDS, CURATED_EARLY_PUZZLES, CURATED_PUZZLE_COUNT, CuratedPuzzle, getRandomFallback } from '../constants';
import { CHALLENGE_MODE_CONFIG, DialoguePhase } from '../types/homeWorld';
import { getMoveMessage, getComboMoveMessage, getHintMessage, getHintFallback, getOutOfHintsMessage, getLoadingMessage, getStartMessage, getInvalidWordMessage, getBlindFailMessage, getLockedLetterMessage, getEchoPuzzleMessage, getFinalBoardStartMessage } from '../services/phaseNarrative';
import { getHintBalanceSync, hasHintSync, consumeHintSync } from '../services/hints';
import { getPreferredPuzzleVariant, setPreferredPuzzleVariant, getFullProgress, getRitualWords } from '../services/amberCurrency';
import {
  getVariantOverrides,
  getVariantInstruction,
  isVariantCompatibleWithSolution,
  hasVariantModifier,
  isLetterAllowedByVariant,
  getVariantRestrictionError,
  isPuzzleVariant,
  VARIANT_CONFIGS,
  PuzzleVariant,
} from '../services/puzzleVariety';
import { MIN_CHALLENGE_WORDS, MAX_CHALLENGE_WORDS, type MoveOutcome } from '../services/shareResults';

// Simple ID generator (React Native compatible)
let idCounter = 0;
const generateId = () => `id_${Date.now()}_${idCounter++}`;

/**
 * Pure stuck-detection helper: does ANY legal single-shift move remain
 * from the current source row into its target row?
 *
 * Mirrors the hook's move validation exactly: an unlocked letter can be
 * picked from the source row only if the remaining source letters form a
 * valid word, and it can be dropped at any position of the target row
 * only if the resulting word is valid. Locked letters in the source row
 * cannot be picked; target insertion positions are unrestricted (matching
 * handleSlotPress).
 *
 * Only meaningful for variants where one pick+drop is a full move
 * (i.e., NOT double_shift).
 */
export function hasAnyValidMove(
  rows: RowData[],
  activeRowIndex: number,
  moveDirection: 'down' | 'up',
  isWordValid: (word: string) => boolean
): boolean {
  if (activeRowIndex < 0 || activeRowIndex >= rows.length) return false;
  const targetRowIndex = moveDirection === 'down' ? activeRowIndex + 1 : activeRowIndex - 1;
  if (targetRowIndex < 0 || targetRowIndex >= rows.length) return false;

  const sourceLetters = rows[activeRowIndex].words;
  const targetChars = rows[targetRowIndex].words.map(l => l.char);

  for (let i = 0; i < sourceLetters.length; i++) {
    if (sourceLetters[i].isLocked) continue;
    const letter = sourceLetters[i].char;

    // Removing this letter must leave a valid source word
    const remaining = sourceLetters
      .filter((_, idx) => idx !== i)
      .map(l => l.char)
      .join('');
    if (!isWordValid(remaining)) continue;

    // Inserting it at any target position must form a valid word
    for (let j = 0; j <= targetChars.length; j++) {
      const candidate = targetChars.slice(0, j).join('') + letter + targetChars.slice(j).join('');
      if (isWordValid(candidate)) return true;
    }
  }

  return false;
}

/**
 * Double-shift look-ahead: given the source letters AFTER the first letter has
 * been removed and the intermediate target (W+1, with the first letter already
 * inserted), does there exist a valid second move (pick a non-locked letter,
 * drop it anywhere) that leaves BOTH the final source and final target as valid
 * words? Used to give the drop1 step honest ✓/✗ guidance instead of guesswork.
 */
export function canCompleteDoubleShift(
  reducedSourceLetters: Letter[],
  intermediateTargetChars: string[],
  isWordValid: (word: string) => boolean
): boolean {
  for (let b = 0; b < reducedSourceLetters.length; b++) {
    if (reducedSourceLetters[b].isLocked) continue;
    const finalSource = reducedSourceLetters
      .filter((_, idx) => idx !== b)
      .map(l => l.char)
      .join('');
    if (!isWordValid(finalSource)) continue;
    const secondChar = reducedSourceLetters[b].char;
    for (let j = 0; j <= intermediateTargetChars.length; j++) {
      const finalTarget =
        intermediateTargetChars.slice(0, j).join('') +
        secondChar +
        intermediateTargetChars.slice(j).join('');
      if (isWordValid(finalTarget)) return true;
    }
  }
  return false;
}

/**
 * Stuck detection for the double-shift variant (where a full move is two
 * pick+drop pairs). Returns true if SOME first letter + first drop position
 * leads to a completable two-letter move. Mirrors hasAnyValidMove for the
 * single-shift case so double-shift players can't get silently trapped.
 */
export function hasAnyValidDoubleShiftMove(
  rows: RowData[],
  activeRowIndex: number,
  isWordValid: (word: string) => boolean
): boolean {
  if (activeRowIndex < 0 || activeRowIndex >= rows.length) return false;
  const targetRowIndex = activeRowIndex + 1; // double shift always descends
  if (targetRowIndex >= rows.length) return false;

  const sourceLetters = rows[activeRowIndex].words;
  const baseTargetChars = rows[targetRowIndex].words.map(l => l.char);

  for (let a = 0; a < sourceLetters.length; a++) {
    if (sourceLetters[a].isLocked) continue;
    const reducedSource = sourceLetters.filter((_, idx) => idx !== a);
    const firstChar = sourceLetters[a].char;
    for (let i = 0; i <= baseTargetChars.length; i++) {
      const intermediate = [
        ...baseTargetChars.slice(0, i),
        firstChar,
        ...baseTargetChars.slice(i),
      ];
      if (canCompleteDoubleShift(reducedSource, intermediate, isWordValid)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * From-state solvability: can the CURRENT mid-game board still be completed
 * under the shipped rules? This is the lock-aware analogue of
 * puzzleSolvability.isChainSolvable — that solver only accepts fresh,
 * lock-free word chains, so it cannot be seeded with a live board where
 * received letters are already locked (and treating them as pickable would
 * bless dead ends). The rules here mirror handleSlotPress exactly, per
 * variant family:
 * - standard/speed: forward moves only; the target row's lock map is
 *   REPLACED (only the just-moved letter stays locked).
 * - reverse: descend with replace-locks, flip at row n-1, ascend with
 *   CUMULATIVE locks; completes when the ascent move into row 0 commits.
 * - double_shift: two-letter steps (drop1 unvalidated), locks accumulate.
 *
 * Pure and render-free (used by handleHint to avoid steering the player into
 * an unsolvable line). Bounded by a node budget: exhaustion returns false
 * ("not provably solvable"), which callers treat as a soft signal — the hint
 * path degrades to its legacy first-valid behavior rather than failing.
 */
export function isBoardSolvableFromState(
  rows: Array<Array<{ char: string; isLocked: boolean }>>,
  activeRowIndex: number,
  moveDirection: 'down' | 'up',
  kind: 'standard' | 'reverse' | 'double_shift',
  isWordValid: (word: string) => boolean,
  nodeCap: number = 150000
): boolean {
  const n = rows.length;
  if (n === 0 || activeRowIndex < 0 || activeRowIndex >= n) return false;
  let nodes = 0;

  type Cell = { char: string; isLocked: boolean };
  const wordOf = (cells: Cell[]): string => cells.map(c => c.char).join('');

  const goForward = (board: Cell[][], active: number, dbl: boolean): boolean => {
    if (active >= n - 1) return true; // nothing left to shift
    if (++nodes > nodeCap) return false;
    const src = board[active];
    const tgt = board[active + 1];

    if (!dbl) {
      for (let i = 0; i < src.length; i++) {
        if (src[i].isLocked) continue;
        const remaining = src.filter((_, k) => k !== i);
        if (!isWordValid(wordOf(remaining))) continue;
        for (let j = 0; j <= tgt.length; j++) {
          // Standard forward leg: the target's lock map is replaced.
          const nextTgt: Cell[] = [
            ...tgt.slice(0, j).map(c => ({ char: c.char, isLocked: false })),
            { char: src[i].char, isLocked: true },
            ...tgt.slice(j).map(c => ({ char: c.char, isLocked: false })),
          ];
          if (!isWordValid(wordOf(nextTgt))) continue;
          if (active === n - 2) return true; // completing move
          const nextBoard = board.slice();
          nextBoard[active] = remaining;
          nextBoard[active + 1] = nextTgt;
          if (goForward(nextBoard, active + 1, false)) return true;
        }
      }
      return false;
    }

    // Double shift: ordered pair of distinct unlocked letters; cumulative locks.
    for (let a = 0; a < src.length; a++) {
      if (src[a].isLocked) continue;
      const afterA = src.filter((_, k) => k !== a);
      for (let b = 0; b < afterA.length; b++) {
        if (afterA[b].isLocked) continue;
        const finalSource = afterA.filter((_, k) => k !== b);
        if (!isWordValid(wordOf(finalSource))) continue;
        for (let i = 0; i <= tgt.length; i++) {
          const intermediate: Cell[] = [
            ...tgt.slice(0, i),
            { char: src[a].char, isLocked: true },
            ...tgt.slice(i),
          ];
          for (let j = 0; j <= intermediate.length; j++) {
            const finalTarget: Cell[] = [
              ...intermediate.slice(0, j),
              { char: afterA[b].char, isLocked: true },
              ...intermediate.slice(j),
            ];
            if (!isWordValid(wordOf(finalTarget))) continue;
            if (active === n - 2) return true; // completing step
            const nextBoard = board.slice();
            nextBoard[active] = finalSource;
            nextBoard[active + 1] = finalTarget;
            if (goForward(nextBoard, active + 1, true)) return true;
          }
        }
      }
    }
    return false;
  };

  const goReverse = (board: Cell[][], active: number, dir: 'down' | 'up'): boolean => {
    if (++nodes > nodeCap) return false;
    const tgtIdx = dir === 'down' ? active + 1 : active - 1;
    if (tgtIdx < 0 || tgtIdx >= n) return false;
    const src = board[active];
    const tgt = board[tgtIdx];
    const cumulative = dir === 'up'; // ascent locks accumulate
    for (let i = 0; i < src.length; i++) {
      if (src[i].isLocked) continue;
      const remaining = src.filter((_, k) => k !== i);
      if (!isWordValid(wordOf(remaining))) continue;
      for (let j = 0; j <= tgt.length; j++) {
        const nextTgt: Cell[] = [
          ...tgt.slice(0, j).map(c => ({ char: c.char, isLocked: cumulative ? c.isLocked : false })),
          { char: src[i].char, isLocked: true },
          ...tgt.slice(j).map(c => ({ char: c.char, isLocked: cumulative ? c.isLocked : false })),
        ];
        if (!isWordValid(wordOf(nextTgt))) continue;
        if (dir === 'up' && tgtIdx === 0) return true; // completing ascent move
        const nextBoard = board.slice();
        nextBoard[active] = remaining;
        nextBoard[tgtIdx] = nextTgt;
        if (dir === 'down') {
          if (active === n - 2) {
            // Midpoint: flip to the ascent, starting from the last row.
            if (goReverse(nextBoard, n - 1, 'up')) return true;
          } else if (goReverse(nextBoard, active + 1, 'down')) {
            return true;
          }
        } else if (goReverse(nextBoard, active - 1, 'up')) {
          return true;
        }
      }
    }
    return false;
  };

  const board = rows.map(r => r.map(c => ({ char: c.char, isLocked: c.isLocked })));
  if (kind === 'reverse') return goReverse(board, activeRowIndex, moveDirection);
  return goForward(board, activeRowIndex, kind === 'double_shift');
}

/**
 * Audio combo-ladder mapping for a clean-move streak: streak <2 plays the base
 * chime (tier 0), streak 2 → tier 1, streak 3 → tier 2, streak >=4 → tier 3.
 * Fed to audio.soundValidMove(comboTier), which resolves bright/dark variants
 * internally. Pure and exported for tests.
 */
export function comboTierForStreak(streak: number): number {
  if (streak >= 4) return 3;
  if (streak === 3) return 2;
  if (streak === 2) return 1;
  return 0;
}

/**
 * Message cadence for a clean-move streak: streaks 2 and 3 always get the
 * escalating combo line; from streak 4 on, combo lines land on EVEN streaks
 * with a regular move-pool draw between climbs (odd streaks), so a long run
 * cycles variety instead of pinning one fixed escalation string forever.
 * Pure and exported for tests.
 */
export function shouldUseComboMessage(streak: number): boolean {
  if (streak < 2) return false;
  if (streak <= 3) return true;
  return streak % 2 === 0;
}

/**
 * Board coordinates for the hint glow. Set when a hint is actually delivered;
 * reuses the SAME tutorial-guide visuals (LetterTile guide ring / Slot halo).
 * `targetSlotIndex` may be undefined when only the letter can be pinpointed
 * (e.g. the first half of a double-shift step).
 */
export interface HintHighlight {
  rowIndex: number;
  letterIndex: number;
  /** Id of the letter tile to glow (convenience for Row prop threading). */
  letterId: string;
  /** Row the glowing drop slot belongs to (the current target row). */
  targetRowIndex: number;
  targetSlotIndex?: number;
}

/**
 * Marks where the letter placed by the last committed tap move landed, so the
 * arriving LetterTile can play its arrival settle instead of teleporting.
 * Never set for drag-drops (they keep the floating-tile collapse + catch
 * bounce), initial board layout, undo, or restore-from-autosave.
 */
export interface ArrivalMark {
  rowIndex: number;
  slotIndex: number;
  letterId: string;
  /** Direction the letter travelled: 'down' = from the row above. */
  direction: 'down' | 'up';
  /** Monotonic per-board id so consumers can detect a fresh arrival. */
  moveId: number;
}

export interface PuzzleGameState {
  rows: RowData[];
  activeRowIndex: number;
  selectedLetter: Letter | null;
  gameState: GameState;
  message: string;
  error: string | null;
  history: MoveDelta[];
  isProcessing: boolean;
  hint: string;
  solution: PuzzleSolutionStep[] | undefined;
  reverseSolution: PuzzleSolutionStep[] | undefined;
  difficulty: Difficulty;
  currentWordLength: number;
  showRules: boolean;
  showDifficultyMenu: boolean;
  showConfetti: boolean;
  invalidAttempts: number;
  hintsUsed: number;
  earnedStars: number;
  gameMode: GameMode;
  /** Blind Offering modifier active (ghost previews hidden). */
  blindMode: boolean;
  /**
   * True while the current board came from a friend's shared challenge link
   * (startSharedChallengeGame). Every other start path — initGame/startNewGame
   * (and therefore Next Level), startDailyGame, clearBoard — resets it, so a
   * consumer (e.g. recordVictory threading) can make shared-link wins
   * amber-only. Persisted through the autosave shape (SavedPuzzleState
   * carries isSharedChallenge and restorePuzzleState restores it), so a
   * shared board resumed after a process kill stays amber-only.
   */
  isSharedChallenge: boolean;
  undosRemaining: number;
  currentPhase: DialoguePhase;
  /** The word chain from the last completed puzzle (for ritual echo display) */
  lastCompletedWords: string[];
  /** Named incantation for the last puzzle (Phase 3+ only, null otherwise) */
  lastIncantationName: string | null;
  /** The word most recently formed by a valid intermediate move (null if none or cleared) */
  lastFormedWord: string | null;
  /** Active puzzle variant key */
  currentVariant: PuzzleVariant;
  /** Player-selected preferred variant for new runs */
  selectedVariant: PuzzleVariant;
  /** Current movement direction ("down" for standard flow, "up" during reverse return leg) */
  moveDirection: 'down' | 'up';
  /** Word previews for each slot position in the target row (when letter is selected) */
  slotPreviews?: Array<{ word: string; isValid: boolean }>;
  /**
   * Whether the ✓/✗ validity grading on the ghost previews is PRESENTED.
   * The preview data always computes isValid internally (the double-shift
   * look-ahead and drag near-miss snapping need it); this flag controls
   * presentation only. TRUE only on EASY boards (any variant) and in the
   * double-shift variant at any difficulty (its intermediate non-word state
   * needs the guidance) — never in Blind Offering, and never on daily /
   * shared-challenge boards (the daily ramps MEDIUM+ by design; a friend's
   * chain is judged by the player's own ear). Everywhere hidden, the preview
   * is a neutral ghost word: the player must judge whether it is real.
   */
  previewValidityVisible: boolean;
  /** Double shift phase tracking: pick1 → drop1 → pick2 → drop2 */
  doubleShiftPhase: 'pick1' | 'pick2' | 'drop1' | 'drop2' | null;
  /** Phase 5 echo puzzle: one word is seeded from the player's ritual history */
  isEchoPuzzle: boolean;
  /**
   * THE marked final board: served once the finale is armed (dwell window
   * filled), seeded from the player's strongest fed dread word when possible.
   * Its victory fires the finale (App suppresses the fanfare and plays
   * FINAL_PUZZLE_EVENT). Persisted through autosave so kill/restore keeps it.
   */
  isFinalBoard: boolean;
  /**
   * True when no legal move remains from the active row. Internal signal
   * only — it deliberately drives NOTHING player-visible (no panel, no
   * message): discovering a dead-end and choosing to undo or restart is
   * part of the challenge.
   */
  isStuck: boolean;
  /** Player's spendable hint balance (consumable hint economy). */
  hintBalance: number;
  /** Increments each time HINT is tapped with an empty balance (App offers ad/store). */
  outOfHintsSignal: number;
  /** Board glow for the last delivered hint (null when no hint is active). */
  hintHighlight: HintHighlight | null;
  /** Per-committed-move outcomes for the honest share grid, in play order. */
  moveOutcomes: MoveOutcome[];
  /** Landing spot of the last committed tap move (null for drag/initial/undo/restore). */
  lastArrival: ArrivalMark | null;
  /** Set by resumeSpeedAfterRescue so App can restart the speed clock with the granted seconds. */
  speedRescueSignal: { extraSec: number; id: number } | null;
}

export interface PuzzleGameActions {
  initGame: (
    words: string[],
    puzzleHint?: string,
    puzzleSolution?: PuzzleSolutionStep[],
    wordLength?: number,
    variant?: PuzzleVariant,
    puzzleReverseSolution?: PuzzleSolutionStep[]
  ) => void;
  startNewGame: (
    selectedDifficulty?: Difficulty,
    mode?: GameMode,
    variant?: PuzzleVariant,
    blind?: boolean
  ) => Promise<void>;
  handleLetterPress: (letter: Letter, rowIndex: number) => void;
  /**
   * Commit a drop into the target row. `inputSource` distinguishes tap from
   * drag-drop so the arrival settle animation only plays on the tap path
   * (drag-drops already have the floating-tile collapse + catch bounce).
   */
  handleSlotPress: (targetIndex: number, inputSource?: 'tap' | 'drag') => Promise<{
    completed: boolean;
    hintsUsed: number;
    invalidAttempts: number;
    gameMode: GameMode;
    completedWords: string[];
    formedWord?: string;
    variant?: PuzzleVariant;
    /** True on the reverse-shift move that completes the descent (midpoint). */
    reverseMidpoint?: boolean;
    /** Full per-move outcome record, present on the completing move (for the share grid). */
    moveOutcomes?: MoveOutcome[];
    /** Undos used across the whole puzzle, present on the completing move (for the flawless tier). */
    undosUsed?: number;
    /**
     * Audio combo-ladder tier for the clean-move streak AFTER this committed
     * move (0 = base chime, 1-3 = escalating ladder). Present on valid
     * intermediate moves so App can play soundValidMove(comboTier).
     */
    comboTier?: number;
    /** Solve duration (ms) for a freshly-started board; absent for restored/retried boards. */
    solveTimeMs?: number;
    /** Whether this board was played with the Blind Offering modifier on. */
    blind?: boolean;
    /**
     * True when the completed board was THE marked final board (finale-armed
     * serve). App suppresses the victory fanfare and fires the finale on it.
     */
    isFinalBoard?: boolean;
    /**
     * Blind Offering only: the final letter landed but the finished chain
     * contains a non-word — the board did NOT complete and the player must
     * undo/restart. Routes App to error feedback, never the half-move click.
     */
    blindFailed?: boolean;
  } | null>;
  handleUndo: () => void;
  grantExtraUndo: () => void;
  handleHint: () => void;
  /** Re-read the hint balance from the hints service (after a grant/purchase). */
  refreshHintBalance: () => void;
  handleNextLevel: () => void;
  /**
   * Start a Daily Challenge from pre-generated words. Always a standard,
   * hint-enabled board (rewards as HARD). Deliberately does NOT mutate the
   * player's chosen difficulty preference. The optional solution (produced by
   * the daily's seeded generator) powers stored-step hints exactly like a bank
   * puzzle's; omitting it preserves the legacy live-search hint behavior.
   */
  startDailyGame: (
    words: string[],
    puzzleHint: string | undefined,
    wordLength: number,
    puzzleSolution?: PuzzleSolutionStep[]
  ) => void;
  /**
   * Start a puzzle from a friend-shared word chain. Mirrors startDailyGame's
   * bypass pattern: standard, hint-enabled board; the player's difficulty
   * preference is left untouched. Validates every word is in the dictionary
   * and all words share one length (the standard-chain shape — rows grow and
   * shrink by exactly one letter only transiently during a move). Returns
   * false without touching the board when the input is invalid (App toasts).
   */
  startSharedChallengeGame: (words: string[]) => boolean;
  /**
   * Speed variant rescue: from GAME_OVER (speed time-up is its only source),
   * return to PLAYING and raise `speedRescueSignal` so App restarts the clock
   * with `extraSec`. Returns false (no-op) outside GAME_OVER or for a
   * non-positive grant. The hook stays the source of truth for gameState.
   */
  resumeSpeedAfterRescue: (extraSec: number) => boolean;
  setShowRules: (show: boolean) => void;
  setShowDifficultyMenu: (show: boolean) => void;
  setShowConfetti: (show: boolean) => void;
  setGameState: (state: GameState) => void;
  setEarnedStars: (stars: number) => void;
  setMessage: (message: string) => void;
  setGameMode: (mode: GameMode) => void;
  setCurrentPhase: (phase: DialoguePhase) => void;
  setSelectedVariant: (variant: PuzzleVariant) => void;
  restorePuzzleState: (saved: SavedPuzzleState) => void;
  /** Restore the current board to its starting state (a true retry of THIS puzzle). */
  resetCurrentPuzzle: () => void;
  clearBoard: () => void;
}

export function usePuzzleGame(): [PuzzleGameState, PuzzleGameActions] {
  const [rows, setRows] = useState<RowData[]>([]);
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.IDLE);
  const [message, setMessage] = useState<string>("Loading puzzle...");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<MoveDelta[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hint, setHint] = useState<string>("");
  const [solution, setSolution] = useState<PuzzleSolutionStep[] | undefined>(undefined);
  const [reverseSolution, setReverseSolution] = useState<PuzzleSolutionStep[] | undefined>(undefined);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [currentWordLength, setCurrentWordLength] = useState(4);
  const [showRules, setShowRules] = useState(false);
  const [showDifficultyMenu, setShowDifficultyMenu] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [invalidAttempts, setInvalidAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  // Undos taken this board — tracked for the "flawless offering" tier (0 hints,
  // 0 invalids, 0 undos). A ref (not state) because nothing renders from it;
  // it's read once at completion. Reset with the other counters on a new board.
  const undosUsedRef = useRef(0);
  // Solve-time telemetry for the private "getting faster" trend (mastery chase).
  // boardStartRef stamps when a FRESH board begins; boardTimedRef guards against
  // recording restored/retried boards (whose true elapsed we don't know), which
  // would otherwise poison the trend with sub-second or wildly inflated times.
  const boardStartRef = useRef(0);
  const boardTimedRef = useRef(false);
  // Consumable hint economy: spendable balance + a signal raised when the player
  // taps HINT with none left (App offers a rewarded clip / the store).
  const [hintBalance, setHintBalance] = useState(() => getHintBalanceSync());
  const [outOfHintsSignal, setOutOfHintsSignal] = useState(0);
  // Consecutive clean moves this board (resets on invalid attempt / undo / new
  // board). Drives the escalating combo move-message. Kept in a ref so it never
  // triggers a re-render of its own.
  const cleanMoveStreakRef = useRef(0);
  const [earnedStars, setEarnedStars] = useState(0);
  const [gameMode, setGameMode] = useState<GameMode>('standard');
  // Synchronous mirrors of gameMode/difficulty for applyBoard's undo reset.
  // applyBoard runs inside async generation flows whose closures predate the
  // startNewGame state updates — reading the stale closure here used to reset
  // a just-enabled challenge board's undo budget back to Infinity (the bare
  // "CHALLENGE" badge with no undo count). Every set site updates the ref in
  // the same tick.
  const gameModeRef = useRef<GameMode>('standard');
  const difficultyRef = useRef<Difficulty>('MEDIUM');
  // Blind Offering mercy: once the end-of-board judgment has failed on this
  // board, undos stop charging against the limited budget. The punishment was
  // already paid (an invalid attempt + the broken flawless run); walking the
  // chain back to the flaw can take more undos than the budget holds, and a
  // fail that can't be repaired reads as a bug, not a verdict. Cleared on any
  // fresh/reset/restored board.
  const blindFailFreeUndosRef = useRef(false);
  // Blind Offering modifier (opt-in, Wordle-Hard-Mode shape): when on, the ghost
  // word previews are hidden, so the player commits from their own word knowledge
  // and learns only from the rejection shake. Sticky across Next Level like
  // gameMode; forced OFF on daily/shared-challenge boards. Composes with any
  // variant/difficulty. No amber bonus by design — the reward is the mastery.
  const [blindMode, setBlindMode] = useState(false);
  // Friend-challenge provenance for the current board (see PuzzleGameState doc).
  const [isSharedChallenge, setIsSharedChallenge] = useState(false);
  // Daily-board provenance: set only by startDailyGame, cleared by every other
  // start path. Drives the preview-validity gate — the daily always hides the
  // ✓/✗ grading (its board shape ramps MEDIUM+ by design), even when the
  // player's own difficulty preference (which the daily leaves untouched)
  // happens to be EASY. Not persisted: a daily autosave is never restored as a
  // normal puzzle (App's load guard), so a restored board is never a daily.
  const [isDailyBoard, setIsDailyBoard] = useState(false);
  const [undosRemaining, setUndosRemaining] = useState(Infinity);
  const [currentVariant, setCurrentVariant] = useState<PuzzleVariant>('standard');
  const [selectedVariant, setSelectedVariantState] = useState<PuzzleVariant>('standard');
  const [moveDirection, setMoveDirection] = useState<'down' | 'up'>('down');
  const [currentPhase, setCurrentPhase] = useState<DialoguePhase>(0);
  const [lastCompletedWords, setLastCompletedWords] = useState<string[]>([]);
  const [lastIncantationName, setLastIncantationName] = useState<string | null>(null);
  const [lastFormedWord, setLastFormedWord] = useState<string | null>(null);

  // Double shift state: tracks the 4-step flow (pick1 → drop1 → pick2 → drop2)
  const [doubleShiftPhase, setDoubleShiftPhase] = useState<'pick1' | 'pick2' | 'drop1' | 'drop2' | null>(null);
  const [isEchoPuzzle, setIsEchoPuzzle] = useState(false);
  // THE marked final board (finale-armed serve). Ref mirror keeps the
  // completion result honest inside async closures that predate the set
  // (same pattern as gameModeRef); state drives render + autosave.
  const [isFinalBoard, setIsFinalBoard] = useState(false);
  const isFinalBoardRef = useRef(false);
  const [isStuck, setIsStuck] = useState(false);
  // Hint glow on the board (same visuals as the tutorial guide). Cleared on
  // any move/undo/restart/new board so a stale glow never outlives its advice.
  const [hintHighlight, setHintHighlight] = useState<HintHighlight | null>(null);
  // Per-committed-move outcomes for the honest share grid. A ref mirror keeps
  // an always-current snapshot so the completion result can carry the full
  // record atomically (state reads at victory time would be a render behind).
  const [moveOutcomes, setMoveOutcomes] = useState<MoveOutcome[]>([]);
  const moveOutcomesRef = useRef<MoveOutcome[]>([]);
  // Whether a hint / an invalid attempt happened since the last committed move
  // (classifies the NEXT committed move for the share grid).
  const pendingHintRef = useRef(false);
  const pendingMistakeRef = useRef(false);
  // Arrival settle for the tap path (drag-drops keep their own feedback).
  const [lastArrival, setLastArrival] = useState<ArrivalMark | null>(null);
  const arrivalMoveIdRef = useRef(0);
  // Speed-rescue handshake with App/useSpeedTimer.
  const [speedRescueSignal, setSpeedRescueSignal] = useState<{ extraSec: number; id: number } | null>(null);

  const validWordsCache = useRef<Set<string>>(new Set(COMMON_WORDS));
  const shakeErrorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic id for in-flight puzzle generations. `startNewGame` is a long
  // async (bank lookup + up to 30s reverse generation); two rapid invocations
  // (fast Play/Next-Level taps, a variant/difficulty switch mid-generation)
  // would both run to completion and both call `initGame`, letting a stale
  // generation clobber a board the player has already started. Each call claims
  // a fresh id and aborts before committing if a newer call has superseded it.
  const generationIdRef = useRef(0);

  // Clean up shakeError timeout on unmount
  useEffect(() => {
    return () => {
      if (shakeErrorTimeout.current) {
        clearTimeout(shakeErrorTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPreferredPuzzleVariant()
      .then((stored) => {
        if (cancelled) return;
        if (stored && isPuzzleVariant(stored)) {
          setSelectedVariantState(stored);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const setSelectedVariant = useCallback((variant: PuzzleVariant) => {
    setSelectedVariantState(variant);
    setPreferredPuzzleVariant(variant).catch(() => {});
  }, []);

  const shakeError = useCallback((msg: string) => {
    if (shakeErrorTimeout.current) {
      clearTimeout(shakeErrorTimeout.current);
    }
    setError(msg);
    shakeErrorTimeout.current = setTimeout(() => {
      setError(null);
      shakeErrorTimeout.current = null;
    }, 2000);
  }, []);

  const checkValidation = useCallback((word: string): boolean => {
    return validWordsCache.current.has(word.toUpperCase());
  }, []);

  const applyBoard = useCallback((
    words: string[],
    puzzleHint?: string,
    puzzleSolution?: PuzzleSolutionStep[],
    wordLength: number = 4,
    options?: {
      resetPerformance?: boolean;
      preserveVariant?: boolean;
      variant?: PuzzleVariant;
      reverseSolution?: PuzzleSolutionStep[];
    }
  ) => {
    const variantToUse = options?.preserveVariant ? currentVariant : (options?.variant || 'standard');
    const resetPerformance = options?.resetPerformance ?? true;

    // Defensive validation: ensure all words are the same length
    const expectedLen = words[0]?.length ?? wordLength;
    const hasInconsistentLengths = words.some(w => w.length !== expectedLen);
    if (hasInconsistentLengths) {
      console.warn('Puzzle has inconsistent word lengths, falling back to safe puzzle');
      const safeFallback = getRandomFallback(difficulty);
      const safeLen = safeFallback[0].length;
      // Recursive call with validated fallback — won't loop because fallback pools are consistent
      return applyBoard(safeFallback, undefined, undefined, safeLen, options);
    }

    const newRows: RowData[] = words.map(word => ({
      id: generateId(),
      originalWord: word,
      words: word.split('').map(char => ({
        id: generateId(),
        char,
        isLocked: false,
      })),
    }));

    setRows(newRows);
    setActiveRowIndex(0);
    setSelectedLetter(null);
    setHistory([]);
    cleanMoveStreakRef.current = 0;
    setGameState(GameState.PLAYING);
    setMessage(getStartMessage(currentPhase));
    setError(null);
    setIsStuck(false);
    setHintHighlight(null);
    blindFailFreeUndosRef.current = false;
    moveOutcomesRef.current = [];
    setMoveOutcomes([]);
    pendingHintRef.current = false;
    pendingMistakeRef.current = false;
    setLastArrival(null);
    setSpeedRescueSignal(null);
    setHint(puzzleHint || "");
    setSolution(puzzleSolution);
    setReverseSolution(options?.reverseSolution);
    setCurrentWordLength(wordLength);
    setLastFormedWord(null);
    setDoubleShiftPhase(hasVariantModifier(variantToUse, 'double_shift') ? 'pick1' : null);
    setMoveDirection('down');
    if (!options?.preserveVariant) {
      setCurrentVariant(variantToUse);
    }

    if (resetPerformance) {
      setInvalidAttempts(0);
      setHintsUsed(0);
      setEarnedStars(0);
      undosUsedRef.current = 0;
      // A genuinely fresh board — start the solve-time clock for the trend.
      boardStartRef.current = Date.now();
      boardTimedRef.current = true;
    }

    // Reset undos for challenge mode (scaled by difficulty). Read the refs,
    // not the closure state: applyBoard is invoked from async generation
    // flows whose closures can predate a same-call setGameMode/setDifficulty
    // (see gameModeRef above).
    setUndosRemaining(
      gameModeRef.current === 'challenge'
        ? CHALLENGE_MODE_CONFIG.getMaxUndos(difficultyRef.current)
        : Infinity
    );
  }, [currentPhase, currentVariant, gameMode, difficulty]);

  const initGame = useCallback((
    words: string[],
    puzzleHint?: string,
    puzzleSolution?: PuzzleSolutionStep[],
    wordLength: number = 4,
    variant: PuzzleVariant = 'standard',
    puzzleReverseSolution?: PuzzleSolutionStep[]
  ) => {
    // Every non-shared start path routes through here (curated/echo/bank/
    // generated/fallback) — a fresh board is never a shared challenge or a
    // daily (the daily has its own bypass, startDailyGame). The final-board
    // mark also resets: the finale-armed serve re-marks it right after commit.
    setIsSharedChallenge(false);
    setIsDailyBoard(false);
    isFinalBoardRef.current = false;
    setIsFinalBoard(false);
    applyBoard(words, puzzleHint, puzzleSolution, wordLength, {
      resetPerformance: true,
      variant,
      reverseSolution: puzzleReverseSolution,
    });
  }, [applyBoard]);

  const generatePuzzleForVariant = useCallback(async (
    selectedDifficulty: Difficulty,
    variant: PuzzleVariant,
    timeoutPromise: Promise<never>,
    startWord?: string
  ): Promise<{ puzzle: { words: string[]; hint?: string; solution?: PuzzleSolutionStep[]; reverseSolution?: PuzzleSolutionStep[]; wordLength?: number; isDoubleShift?: boolean }; activeVariant: PuzzleVariant }> => {
    let activeVariant = variant;
    const isDoubleShiftVariant = hasVariantModifier(activeVariant, 'double_shift');
    const isReverseVariant = hasVariantModifier(activeVariant, 'reverse');
    const variantOverrides = getVariantOverrides(activeVariant, selectedDifficulty);

    // Double shift uses its own generator
    if (isDoubleShiftVariant) {
      let puzzle = await Promise.race([
        generateDoubleShiftPuzzle(selectedDifficulty, variantOverrides),
        timeoutPromise,
      ]);
      return { puzzle, activeVariant };
    }

    const generationOverrides = {
      ...variantOverrides,
      ...(startWord ? { startWord } : {}),
      // For reverse variants, let the generator handle reverse-solvability
      // internally so it can try many start words within the timeout.
      // relaxBoring widens the candidate pool by skipping anti-boring penalties.
      ...(isReverseVariant ? { requireReverseSolvable: true, relaxBoring: true } : {}),
    } as { targetRows?: number; wordLength?: number; startWord?: string; requireReverseSolvable?: boolean; relaxBoring?: boolean };

    let puzzle = await Promise.race([
      generateLocalPuzzle(selectedDifficulty, generationOverrides),
      timeoutPromise,
    ]);

    if (!isVariantCompatibleWithSolution(activeVariant, puzzle.solution, puzzle.words)) {
      let compatiblePuzzle = null as typeof puzzle | null;
      // Reverse variants use fewer retries since each attempt takes longer
      // but is more likely to succeed with the adjacency index + relaxBoring
      const maxRetries = isReverseVariant ? 2 : 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const retry = await Promise.race([
          generateLocalPuzzle(selectedDifficulty, generationOverrides),
          timeoutPromise,
        ]);
        if (isVariantCompatibleWithSolution(activeVariant, retry.solution, retry.words)) {
          compatiblePuzzle = retry;
          break;
        }
      }

      if (compatiblePuzzle) {
        puzzle = compatiblePuzzle;
      } else {
        activeVariant = 'standard';
        setCurrentVariant('standard');
        puzzle = await Promise.race([
          generateLocalPuzzle(selectedDifficulty, {
            ...getVariantOverrides('standard', selectedDifficulty),
            ...(startWord ? { startWord } : {}),
          }),
          timeoutPromise,
        ]);
      }
    }

    return { puzzle, activeVariant };
  }, []);

  const startNewGame = useCallback(async (
    selectedDifficulty: Difficulty = difficulty,
    mode?: GameMode,
    variantOverride?: PuzzleVariant,
    blindOverride?: boolean
  ) => {
    if (blindOverride !== undefined) {
      setBlindMode(blindOverride);
    }
    // Claim this generation. Any initGame commit below is skipped if a newer
    // startNewGame call has since superseded this one (see generationIdRef).
    const genId = ++generationIdRef.current;
    const isStale = () => genId !== generationIdRef.current;
    setGameState(GameState.LOADING);
    setMessage(getLoadingMessage(currentPhase));
    setError(null);
    setShowDifficultyMenu(false);
    difficultyRef.current = selectedDifficulty;
    if (selectedDifficulty !== difficulty) {
      setDifficulty(selectedDifficulty);
    }
    if (mode !== undefined) {
      gameModeRef.current = mode;
      setGameMode(mode);
      setUndosRemaining(mode === 'challenge' ? CHALLENGE_MODE_CONFIG.getMaxUndos(selectedDifficulty) : Infinity);
    }

    const effectiveMode = mode ?? gameMode;
    let variant: PuzzleVariant = variantOverride ?? selectedVariant;
    // Daily mode currently bypasses this hook path; keep this for safety.
    if (effectiveMode !== 'standard' && variantOverride === undefined) {
      variant = selectedVariant;
    }
    setCurrentVariant(variant);
    // Hoisted past the try so the fallback path can still mark the final
    // board (the ultimate fallback: any board, marked final).
    let finaleServe = false;

    try {
      // Serve curated early-game puzzles for the first few solves
      // These are hand-picked to showcase interesting letter moves
      const progress = await getFullProgress();
      const puzzlesSolved = progress?.puzzlesSolved ?? 0;
      if (
        puzzlesSolved < CURATED_PUZZLE_COUNT &&
        (selectedDifficulty === 'EASY' || selectedDifficulty === 'MEDIUM') &&
        variant === 'standard' &&
        effectiveMode === 'standard'
      ) {
        const curated = CURATED_EARLY_PUZZLES[puzzlesSolved];
        if (isStale()) return;
        initGame(curated.words, undefined, curated.solution, curated.words[0].length, 'standard');
        setMessage(getStartMessage(currentPhase));
        return;
      }

      // THE FINAL BOARD: once the dwell window has filled, the finale is
      // ARMED (amberCurrency.finaleArmed) and the next standard-mode start
      // becomes the marked final board — the finale is played, not declared
      // retroactively. A selected variant is served as a standard board this
      // once (in-world, the arrangement chooses; the player's preference is
      // untouched for later boards). Seeded via the echo path from the
      // player's strongest fed dread word; if no dread word exists or the
      // generator can't build from it, the normal bank/generation path below
      // serves the board — still marked final (ultimate fallback).
      finaleServe = progress?.finaleArmed === true && progress?.finalPuzzleCompleted !== true;
      if (finaleServe) {
        variant = 'standard';
        setCurrentVariant('standard');
        try {
          const ritualWords = await getRitualWords();
          const targetLen = selectedDifficulty === 'EASY' || selectedDifficulty === 'MEDIUM' ? 4 : 5;
          const strongest = getStrongestDreadWord(
            (ritualWords || []).filter(w => w.length === targetLen)
          );
          if (strongest) {
            const finalPuzzle = await generateLocalPuzzle(selectedDifficulty, { startWord: strongest.word });
            if (finalPuzzle) {
              if (isStale()) return;
              initGame(finalPuzzle.words, finalPuzzle.hint, finalPuzzle.solution, finalPuzzle.wordLength, 'standard');
              await recordPuzzleWords(finalPuzzle.words);
              isFinalBoardRef.current = true;
              setIsFinalBoard(true);
              setMessage(getFinalBoardStartMessage(currentPhase));
              return;
            }
          }
        } catch {
          // Dread seeding failed — fall through: the normal path still serves
          // the final board (any board, marked final).
        }
      }

      // Echo puzzles: every 5th puzzle from Phase 3 onward re-seeds a word from
      // the player's OWN ritual history — the descent handing their past words
      // back. This is the moment it was made for (the reveal), so it now runs
      // pre-finale, not just at Phase 5 (post-revelation). Falls through to the
      // normal bank/generation path if echo seeding fails. The marked final
      // board takes precedence (it carries its own dread-word echo).
      setIsEchoPuzzle(false);
      if (!finaleServe && currentPhase >= 3 && puzzlesSolved > 0 && puzzlesSolved % 5 === 0 && variant === 'standard') {
        try {
          const ritualWords = await getRitualWords();
          // Pick words matching the target word length for this difficulty
          const targetLen = selectedDifficulty === 'EASY' || selectedDifficulty === 'MEDIUM' ? 4 : 5;
          const candidates = ritualWords.filter(w => w.length === targetLen);
          if (candidates.length > 0) {
            const echoWord = candidates[Math.floor(Math.random() * candidates.length)];
            const echoPuzzle = await generateLocalPuzzle(selectedDifficulty, { startWord: echoWord });
            if (echoPuzzle) {
              if (isStale()) return;
              initGame(echoPuzzle.words, echoPuzzle.hint, echoPuzzle.solution, echoPuzzle.wordLength, 'standard');
              await recordPuzzleWords(echoPuzzle.words);
              setIsEchoPuzzle(true);
              setMessage(getEchoPuzzleMessage(currentPhase));
              return;
            }
          }
        } catch {
          // Echo puzzle generation failed — fall through to normal path
        }
      }

      // Use pre-generated puzzle bank for standard/reverse/double_shift variants at all difficulties
      const bankVariants: PuzzleVariant[] = ['standard', 'reverse', 'double_shift'];
      const shouldUseBank = bankVariants.includes(variant);
      if (shouldUseBank) {
        try {
          const recencyMap = await getWordHistoryWithRecency();
          const bankPuzzle = await selectPreGeneratedPuzzle(selectedDifficulty, currentPhase, recencyMap, variant);
          if (bankPuzzle) {
            if (isStale()) return;
            initGame(bankPuzzle.words, bankPuzzle.hint, bankPuzzle.solution, bankPuzzle.wordLength, variant, bankPuzzle.reverseSolution);
            await recordPuzzleWords(bankPuzzle.words);
            if (finaleServe) {
              // Dread seeding fell through — this bank board IS the final board.
              isFinalBoardRef.current = true;
              setIsFinalBoard(true);
              setMessage(getFinalBoardStartMessage(currentPhase));
            } else if (variant !== 'standard') {
              const config = VARIANT_CONFIGS[variant];
              setMessage(getVariantInstruction(config, currentPhase, selectedDifficulty));
            } else {
              setMessage(getStartMessage(currentPhase));
            }
            return;
          }
        } catch (bankErr) {
          console.log('Puzzle bank selection failed, falling back to generation:', bankErr);
        }
      }

      const isReverseGen = hasVariantModifier(variant, 'reverse');
      const timeoutMs = isReverseGen ? 30000 : 4000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Generation timeout')), timeoutMs)
      );

      const { puzzle, activeVariant } = await generatePuzzleForVariant(
        selectedDifficulty,
        variant,
        timeoutPromise
      );
      if (isStale()) return;
      initGame(puzzle.words, puzzle.hint, puzzle.solution, puzzle.wordLength, activeVariant, puzzle.reverseSolution);
      if (finaleServe) {
        // Generated board serving as the final board (dread seed unavailable).
        isFinalBoardRef.current = true;
        setIsFinalBoard(true);
        setMessage(getFinalBoardStartMessage(currentPhase));
      } else if (activeVariant !== 'standard') {
        const config = VARIANT_CONFIGS[activeVariant];
        setMessage(getVariantInstruction(config, currentPhase, selectedDifficulty));
      } else if (variant !== 'standard') {
        // The requested variant couldn't be generated and was downgraded to a
        // standard puzzle. Tell the player instead of silently swapping it.
        setMessage(
          currentPhase >= 3
            ? 'The arrangement could not sustain that pattern... a plain offering instead.'
            : 'That puzzle style wasn\'t available. Here\'s a standard puzzle instead.'
        );
      }
    } catch (localErr) {
      console.log("Local generation failed, using fallback:", localErr);
      // Fallback puzzles don't include solver metadata, so restrictions may be
      // impossible to satisfy. Revert restriction variants to standard fallback.
      const fallbackVariant = 'standard' as PuzzleVariant;
      const fallbackWords = getRandomFallback(selectedDifficulty);
      const fallbackWordLen = fallbackWords[0].length;
      if (isStale()) return;
      initGame(
        fallbackWords,
        undefined,
        undefined,
        fallbackWordLen,
        fallbackVariant
      );
      if (finaleServe) {
        // Even the fallback pool serves the final board when armed.
        isFinalBoardRef.current = true;
        setIsFinalBoard(true);
        setMessage(getFinalBoardStartMessage(currentPhase));
      } else if (variant !== 'standard') {
        // Variant was dropped during fallback — notify the player
        setMessage(
          currentPhase >= 3
            ? 'The arrangement could not sustain that pattern.'
            : 'That puzzle style wasn\'t available. Starting a standard puzzle instead.'
        );
      }
    }
  }, [difficulty, initGame, gameMode, currentPhase, generatePuzzleForVariant, selectedVariant]);

  // Daily Challenge bypasses the bank/generation path: words are supplied by
  // the seeded daily generator. Always standard mode (hints allowed) with
  // unlimited undos. Difficulty state is left untouched so the player's
  // preferred difficulty survives the daily run.
  const startDailyGame = useCallback((
    words: string[],
    puzzleHint: string | undefined,
    wordLength: number,
    puzzleSolution?: PuzzleSolutionStep[]
  ) => {
    gameModeRef.current = 'standard';
    setGameMode('standard');
    setBlindMode(false); // the daily is a shared board — never blind
    setIsSharedChallenge(false);
    setIsDailyBoard(true);
    isFinalBoardRef.current = false;
    setIsFinalBoard(false);
    // The daily generator's solution steps thread through like a bank puzzle's,
    // so daily hints use the stored solution instead of the blind live search.
    // Optional param keeps older 3-arg callers working unchanged.
    applyBoard(words, puzzleHint, puzzleSolution, wordLength, {
      resetPerformance: true,
      variant: 'standard',
    });
    setUndosRemaining(Infinity);
    setMessage(getStartMessage(currentPhase));
  }, [applyBoard, currentPhase]);

  // Shared-challenge bypass: build a standard, hint-enabled board directly
  // from a friend's word chain. Mirrors startDailyGame (difficulty preference
  // untouched, unlimited undos) with strict input validation — the words come
  // from outside the app, so a malformed link must fail cleanly, not crash.
  const startSharedChallengeGame = useCallback((words: string[]): boolean => {
    // Same 3-6 word bound as encode/decodeChallengeLink — one shared limit,
    // not two authoritative-looking ones.
    if (
      !Array.isArray(words) ||
      words.length < MIN_CHALLENGE_WORDS ||
      words.length > MAX_CHALLENGE_WORDS
    ) return false;
    const normalized = words.map(w => (typeof w === 'string' ? w.trim().toUpperCase() : ''));
    const wordLength = normalized[0]?.length ?? 0;
    // Standard-chain shape (see startDailyGame): every row starts at the same
    // length; rows only grow/shrink by one letter transiently during a move.
    if (wordLength < 3 || wordLength > 7) return false;
    if (normalized.some(w => w.length !== wordLength)) return false;
    if (normalized.some(w => !validWordsCache.current.has(w))) return false;

    // Invalidate any in-flight startNewGame generation so a slow async commit
    // can't clobber the shared board after it starts.
    generationIdRef.current++;
    gameModeRef.current = 'standard';
    setGameMode('standard');
    setBlindMode(false); // a friend's shared board — never blind
    setIsDailyBoard(false);
    setIsEchoPuzzle(false);
    isFinalBoardRef.current = false;
    setIsFinalBoard(false);
    applyBoard(normalized, undefined, undefined, wordLength, {
      resetPerformance: true,
      variant: 'standard',
    });
    // Mark provenance AFTER the board applies so consumers (amber-only wins for
    // shared links) see the flag and the board flip together.
    setIsSharedChallenge(true);
    setUndosRemaining(Infinity);
    setMessage(getStartMessage(currentPhase));
    return true;
  }, [applyBoard, currentPhase]);

  const handleLetterPress = useCallback((letter: Letter, rowIndex: number) => {
    if (gameState !== GameState.PLAYING) return;
    if (rowIndex !== activeRowIndex) return;
    if (letter.isLocked) {
      shakeError(getLockedLetterMessage(currentPhase));
      return;
    }

    const isDoubleShift = hasVariantModifier(currentVariant, 'double_shift');

    if (isDoubleShift) {
      if (!isLetterAllowedByVariant(currentVariant, letter.char)) {
        shakeError(getVariantRestrictionError(currentVariant, currentPhase));
        return;
      }

      if (doubleShiftPhase === 'pick1' || doubleShiftPhase === 'drop1') {
        // First letter selection — freely tap between letters, deselect, etc.
        if (selectedLetter?.id === letter.id) {
          setSelectedLetter(null); // Deselect
          setDoubleShiftPhase('pick1');
        } else {
          setSelectedLetter(letter);
          setDoubleShiftPhase('drop1');
          setError(null);
        }
      } else if (doubleShiftPhase === 'pick2' || doubleShiftPhase === 'drop2') {
        // Second letter selection — freely switch between letters, deselect, etc.
        // No validation on tap — only validated when actually dropped
        if (selectedLetter?.id === letter.id) {
          setSelectedLetter(null); // Deselect
          setDoubleShiftPhase('pick2');
          return;
        }

        setSelectedLetter(letter);
        setDoubleShiftPhase('drop2');
        setError(null);
      }
      return;
    }

    // Standard single-shift letter press
    if (selectedLetter?.id === letter.id) {
      setSelectedLetter(null);
    } else {
      if (!isLetterAllowedByVariant(currentVariant, letter.char)) {
        shakeError(getVariantRestrictionError(currentVariant, currentPhase));
        return;
      }
      setSelectedLetter(letter);
      setError(null);
    }
  }, [gameState, activeRowIndex, selectedLetter, shakeError, currentVariant, currentPhase, doubleShiftPhase]);

  const handleHint = useCallback(() => {
    if (gameState !== GameState.PLAYING || isProcessing) return;

    // Challenge mode: no hints allowed
    if (gameMode === 'challenge') {
      shakeError("No hints in Challenge Mode!");
      return;
    }

    // Consumable hint economy: out of hints → prompt for a clip / the store.
    // (A hint is only actually spent below, once help is delivered.)
    if (!hasHintSync()) {
      setMessage(getOutOfHintsMessage(currentPhase));
      setOutOfHintsSignal(prev => prev + 1);
      return;
    }

    const hintTargetRowIndex = moveDirection === 'down' ? activeRowIndex + 1 : activeRowIndex - 1;
    if (hintTargetRowIndex < 0 || hintTargetRowIndex >= rows.length) {
      setMessage(getHintFallback(currentPhase));
      return;
    }

    const currentSourceWord = rows[activeRowIndex].words.map(l => l.char).join("");
    const currentTargetWord = rows[hintTargetRowIndex].words.map(l => l.char).join("");

    // Use reverse solution for the reverse leg, forward solution otherwise
    const isReverseLeg = moveDirection === 'up';
    const activeSolution = isReverseLeg ? reverseSolution : solution;

    let relevantStep: PuzzleSolutionStep | undefined;

    const isDoubleShiftHint = hasVariantModifier(currentVariant, 'double_shift');
    // During double shift pick2/drop2, the source row has already had one letter removed
    // by drop1, so the current source word won't match the solution step's sourceWord.
    // Fall back to matching by stepIndex only (unique per row in double shift).
    const doubleShiftMidStep = isDoubleShiftHint &&
      (doubleShiftPhase === 'pick2' || doubleShiftPhase === 'drop2');

    if (doubleShiftMidStep && activeSolution) {
      relevantStep = activeSolution.find(s => s.stepIndex === activeRowIndex);
    } else if (isReverseLeg && activeSolution) {
      // During reverse: stepIndex = how many reverse steps completed so far
      const reverseStepIndex = (rows.length - 1) - activeRowIndex;
      relevantStep = activeSolution.find(s =>
        s.stepIndex === reverseStepIndex &&
        s.sourceWord === currentSourceWord &&
        s.targetWord === currentTargetWord
      );
    } else {
      relevantStep = activeSolution?.find(s =>
        s.stepIndex === activeRowIndex &&
        s.sourceWord === currentSourceWord &&
        s.targetWord === currentTargetWord
      );
    }

    // Solvability guard: a stored solution step can be STALE — e.g. a
    // dictionary purge removed a word the step relies on as a transient
    // remainder after the bank was generated. Never consume a paid hint for
    // a step the current rules reject: validate the stored move against the
    // live board + dictionary first, and on failure fall through to the
    // off-solution search below (which only charges when it finds a move
    // that is genuinely legal right now).
    if (relevantStep) {
      const guardLetter = relevantStep.lettersToMove
        ? (doubleShiftMidStep ? relevantStep.lettersToMove[1] : null)
        : relevantStep.letterToMove;
      if (guardLetter != null) {
        // Single-shift legality (also covers the double-shift mid-step, whose
        // remaining half is exactly one pick+drop): the letter must exist
        // unlocked, its removal must leave a valid word, and some insertion
        // into the current target must form a valid word.
        const srcLetters = rows[activeRowIndex].words;
        const preferred = relevantStep.removalPosition;
        const li =
          preferred !== undefined &&
          srcLetters[preferred] &&
          srcLetters[preferred].char === guardLetter &&
          !srcLetters[preferred].isLocked
            ? preferred
            : srcLetters.findIndex(l => !l.isLocked && l.char === guardLetter);
        let stepLegal = false;
        if (li >= 0) {
          const remainder = srcLetters
            .filter((_, idx) => idx !== li)
            .map(l => l.char)
            .join('');
          if (validWordsCache.current.has(remainder)) {
            const targetChars = rows[hintTargetRowIndex].words.map(l => l.char);
            for (let j = 0; j <= targetChars.length; j++) {
              const cand =
                targetChars.slice(0, j).join('') + guardLetter + targetChars.slice(j).join('');
              if (validWordsCache.current.has(cand)) {
                stepLegal = true;
                break;
              }
            }
          }
        }
        if (!stepLegal) relevantStep = undefined;
      } else if (relevantStep.lettersToMove) {
        // Full double-shift step: require that SOME completable two-letter
        // move exists before charging (the stored pair may have gone stale).
        if (!hasAnyValidDoubleShiftMove(rows, activeRowIndex, checkValidation)) {
          relevantStep = undefined;
        }
      }
    }

    // Build the board glow for a delivered hint: pinpoint the letter tile to
    // pick (preferring the solution's exact removal position — critical with
    // duplicate letters) and, when determinable, the drop slot. Reuses the
    // tutorial-guide visuals via Row's hintLetterId/hintSlotIndex props.
    const buildHintHighlight = (
      letterChar: string,
      preferredLetterIndex?: number,
      preferredSlotIndex?: number
    ): HintHighlight | null => {
      const srcLetters = rows[activeRowIndex].words;
      let letterIndex = -1;
      if (
        preferredLetterIndex !== undefined &&
        srcLetters[preferredLetterIndex] &&
        srcLetters[preferredLetterIndex].char === letterChar &&
        !srcLetters[preferredLetterIndex].isLocked
      ) {
        letterIndex = preferredLetterIndex;
      } else {
        for (let i = 0; i < srcLetters.length; i++) {
          if (!srcLetters[i].isLocked && srcLetters[i].char === letterChar) {
            letterIndex = i;
            break;
          }
        }
      }
      if (letterIndex < 0) return null;

      const targetChars = rows[hintTargetRowIndex].words.map(l => l.char);
      let targetSlotIndex: number | undefined;
      if (
        preferredSlotIndex !== undefined &&
        preferredSlotIndex >= 0 &&
        preferredSlotIndex <= targetChars.length
      ) {
        targetSlotIndex = preferredSlotIndex;
      } else {
        // Fall back to the first insertion that yields a valid target word
        // while the removal leaves a valid source (mirrors move validation).
        const sourceRemainder = srcLetters
          .filter((_, idx) => idx !== letterIndex)
          .map(l => l.char)
          .join('');
        const sourceOk = validWordsCache.current.has(sourceRemainder);
        for (let j = 0; j <= targetChars.length; j++) {
          const candidate =
            targetChars.slice(0, j).join('') + letterChar + targetChars.slice(j).join('');
          if (sourceOk && validWordsCache.current.has(candidate)) {
            targetSlotIndex = j;
            break;
          }
        }
      }

      return {
        rowIndex: activeRowIndex,
        letterIndex,
        letterId: srcLetters[letterIndex].id,
        targetRowIndex: hintTargetRowIndex,
        targetSlotIndex,
      };
    };

    if (relevantStep) {
      setHintsUsed(prev => prev + 1);
      consumeHintSync();
      setHintBalance(getHintBalanceSync());
      pendingHintRef.current = true;
      if (relevantStep.lettersToMove && doubleShiftMidStep) {
        // Double shift mid-step: only show the second letter (first was already placed)
        setMessage(
          getHintMessage(relevantStep.lettersToMove[1], relevantStep.targetWord, currentPhase)
        );
        // Positions in the step refer to the original words; the board has
        // shifted since drop1, so locate the second letter/slot by search.
        setHintHighlight(buildHintHighlight(relevantStep.lettersToMove[1]));
      } else if (relevantStep.lettersToMove) {
        // Double shift hint: show both letters
        setMessage(
          getHintMessage(
            `${relevantStep.lettersToMove[0]}' and '${relevantStep.lettersToMove[1]}`,
            relevantStep.targetWord,
            currentPhase
          )
        );
        // Glow the first letter only — the intermediate drop slot isn't a
        // dictionary word, so a slot glow here would be a guess.
        setHintHighlight(buildHintHighlight(relevantStep.lettersToMove[0]));
      } else {
        setMessage(
          getHintMessage(relevantStep.letterToMove, relevantStep.targetWord, currentPhase)
        );
        setHintHighlight(buildHintHighlight(
          relevantStep.letterToMove,
          relevantStep.removalPosition,
          relevantStep.insertionPosition
        ));
      }
    } else {
      // Off solution path — find a valid move from the current board state.
      // Dead-end awareness: a blind first-valid pick can steer the player into
      // an unsolvable line, and on boards with no stored solution (the daily,
      // shared links) EVERY hint takes this path. Prefer the first candidate
      // whose post-move board is still solvable under the shipped rules
      // (isBoardSolvableFromState, the lock-aware from-state analogue of
      // puzzleSolvability.isChainSolvable); fall back to the plain first-valid
      // candidate only when no solvability-preserving move exists — a hint
      // must never come up empty while a legal move does.
      const sourceLetters = rows[activeRowIndex].words;
      const targetWord = currentTargetWord;
      const wordValid = (w: string) => validWordsCache.current.has(w);
      const isReverseVariantHint = hasVariantModifier(currentVariant, 'reverse');
      const solverKind: 'standard' | 'reverse' | 'double_shift' = isDoubleShiftHint
        ? 'double_shift'
        : isReverseVariantHint
          ? 'reverse'
          : 'standard';
      // The one-pick-one-drop candidate model matches every path except a
      // double-shift step still awaiting its FIRST drop, where a single move
      // is only half a step — keep the legacy first-valid behavior there.
      const canCheckSolvability = !isDoubleShiftHint || doubleShiftMidStep;

      const keepsBoardSolvable = (letterIndex: number, slotIndex: number): boolean => {
        const movedChar = sourceLetters[letterIndex].char;
        const targetCells = rows[hintTargetRowIndex].words;
        // Lock semantics mirror handleSlotPress: cumulative on the reverse
        // ascent and in double shift, replaced on the forward/descent leg.
        const cumulativeLocks =
          solverKind === 'double_shift' || (solverKind === 'reverse' && moveDirection === 'up');
        const nextTarget = [
          ...targetCells.slice(0, slotIndex).map(l => ({ char: l.char, isLocked: cumulativeLocks ? l.isLocked : false })),
          { char: movedChar, isLocked: true },
          ...targetCells.slice(slotIndex).map(l => ({ char: l.char, isLocked: cumulativeLocks ? l.isLocked : false })),
        ];
        const nextBoard = rows.map(r => r.words.map(l => ({ char: l.char, isLocked: l.isLocked })));
        nextBoard[activeRowIndex] = sourceLetters
          .filter((_, idx) => idx !== letterIndex)
          .map(l => ({ char: l.char, isLocked: l.isLocked }));
        nextBoard[hintTargetRowIndex] = nextTarget;

        if (solverKind === 'reverse') {
          if (moveDirection === 'up') {
            if (hintTargetRowIndex === 0) return true; // completing ascent move
            return isBoardSolvableFromState(nextBoard, activeRowIndex - 1, 'up', 'reverse', wordValid);
          }
          if (activeRowIndex === rows.length - 2) {
            // Descent midpoint: the ascent starts at the last row.
            return isBoardSolvableFromState(nextBoard, rows.length - 1, 'up', 'reverse', wordValid);
          }
          return isBoardSolvableFromState(nextBoard, activeRowIndex + 1, 'down', 'reverse', wordValid);
        }
        if (activeRowIndex === rows.length - 2) return true; // completing move/step
        return isBoardSolvableFromState(nextBoard, activeRowIndex + 1, 'down', solverKind, wordValid);
      };

      type FoundMove = { letter: string; resultWord: string; letterIndex: number; slotIndex: number };
      let foundMove: FoundMove | null = null;
      let firstValidMove: FoundMove | null = null;

      for (let i = 0; i < sourceLetters.length && !foundMove; i++) {
        if (sourceLetters[i].isLocked) continue;
        const letter = sourceLetters[i].char;
        // Check if removing this letter leaves a valid word
        const remaining = sourceLetters
          .filter((_, idx) => idx !== i)
          .map(l => l.char)
          .join('');
        if (!validWordsCache.current.has(remaining)) continue;

        // Check if inserting this letter into any position in the target creates a valid word
        for (let j = 0; j <= targetWord.length && !foundMove; j++) {
          const candidate = targetWord.slice(0, j) + letter + targetWord.slice(j);
          if (!validWordsCache.current.has(candidate)) continue;
          if (!firstValidMove) {
            firstValidMove = { letter, resultWord: candidate, letterIndex: i, slotIndex: j };
          }
          if (!canCheckSolvability || keepsBoardSolvable(i, j)) {
            foundMove = { letter, resultWord: candidate, letterIndex: i, slotIndex: j };
          }
        }
      }

      // No solvability-preserving candidate exists (or the budget ran out) —
      // degrade to the legacy first-valid behavior rather than refusing to
      // help. The player can still undo out of the dead end.
      if (!foundMove) foundMove = firstValidMove;

      if (foundMove) {
        setHintsUsed(prev => prev + 1);
        consumeHintSync();
        setHintBalance(getHintBalanceSync());
        pendingHintRef.current = true;
        setMessage(getHintMessage(foundMove.letter, foundMove.resultWord, currentPhase));
        setHintHighlight(buildHintHighlight(
          foundMove.letter,
          foundMove.letterIndex,
          foundMove.slotIndex
        ));
      } else {
        setMessage(getHintFallback(currentPhase));
      }
    }
  }, [gameState, isProcessing, rows, activeRowIndex, solution, reverseSolution, currentPhase, moveDirection, currentVariant, doubleShiftPhase, gameMode, checkValidation]);

  const handleSlotPress = useCallback(async (
    targetIndex: number,
    inputSource: 'tap' | 'drag' = 'tap'
  ): Promise<{
    completed: boolean;
    hintsUsed: number;
    invalidAttempts: number;
    undosUsed?: number;
    gameMode: GameMode;
    completedWords: string[];
    formedWord?: string;
    variant?: PuzzleVariant;
    reverseMidpoint?: boolean;
    moveOutcomes?: MoveOutcome[];
    /** Audio combo-ladder tier for the streak after this move (see interface doc). */
    comboTier?: number;
    /**
     * Blind Offering only: the final letter just landed but the finished
     * chain contains at least one non-word, so the board did NOT complete.
     * The player must undo (or restart) and mend the chain. App routes this
     * to the error feedback path, never the half-move click.
     */
    blindFailed?: boolean;
  } | null> => {
    if (!selectedLetter || gameState !== GameState.PLAYING) return null;

    const isDoubleShift = hasVariantModifier(currentVariant, 'double_shift');

    const targetRowIndex = moveDirection === 'down' ? activeRowIndex + 1 : activeRowIndex - 1;
    if (targetRowIndex < 0 || targetRowIndex >= rows.length) {
      shakeError("No valid target row.");
      return null;
    }

    const sourceRow = rows[activeRowIndex];
    const targetRow = rows[targetRowIndex];

    const newSourceLetters = sourceRow.words.filter(l => l.id !== selectedLetter.id);
    const newTargetLetters = [...targetRow.words];

    const movedLetter: Letter = { ...selectedLetter, isLocked: true };
    newTargetLetters.splice(targetIndex, 0, movedLetter);

    const sourceWordStr = newSourceLetters.map(l => l.char).join("");
    const targetWordStr = newTargetLetters.map(l => l.char).join("");

    setIsProcessing(true);

    // --- DOUBLE SHIFT DROP1: Place first letter without validation ---
    if (isDoubleShift && doubleShiftPhase === 'drop1') {
      // Record delta for undo
      const sourceLetterIndex = sourceRow.words.findIndex(l => l.id === selectedLetter.id);
      const delta: MoveDelta = {
        movedLetterId: selectedLetter.id,
        movedLetterChar: selectedLetter.char,
        sourceRowIndex: activeRowIndex,
        sourceLetterIndex,
        targetRowIndex,
        targetInsertIndex: targetIndex,
        activeRowIndexBefore: activeRowIndex,
        moveDirectionBefore: moveDirection,
      };
      setHistory(prev => [...prev, delta]);

      const newRows = [...rows];
      newRows[activeRowIndex] = { ...sourceRow, words: newSourceLetters };
      newRows[targetRowIndex] = { ...targetRow, words: newTargetLetters };

      setRows(newRows);
      // Clear selection — player now picks second letter from source row
      setSelectedLetter(null);
      setDoubleShiftPhase('pick2');
      setError(null);
      setHintHighlight(null);
      // Half-move arrival: the first letter still teleports on the tap path,
      // so it gets the same arrival settle (drag keeps its collapse feedback).
      if (inputSource !== 'drag') {
        setLastArrival({
          rowIndex: targetRowIndex,
          slotIndex: targetIndex,
          letterId: selectedLetter.id,
          direction: moveDirection,
          moveId: ++arrivalMoveIdRef.current,
        });
      } else {
        setLastArrival(null);
      }
      setIsProcessing(false);
      // Return a (non-null) result with no formedWord. The first letter is now
      // placed but the word isn't complete, so this routes App.tsx to the
      // positive drop-feedback path (catch bounce + haptic) rather than the
      // null -> "invalid drop" error path, while skipping ritual-echo/dread
      // tracking (which only fire when formedWord is present).
      return { completed: false, hintsUsed, invalidAttempts, gameMode, completedWords: [] };
    }

    // --- Standard validation (single shift OR double shift drop2) ---
    const isReverseReturn = hasVariantModifier(currentVariant, 'reverse') && moveDirection === 'up';
    const isStartRow = activeRowIndex === 0;

    let expectedSourceLength: number;
    let expectedTargetLength: number;

    if (isDoubleShift && doubleShiftPhase === 'drop2') {
      // After dropping both: source lost 2, target gained 2
      expectedSourceLength = isStartRow ? currentWordLength - 2 : currentWordLength;
      expectedTargetLength = currentWordLength + 2;
    } else {
      expectedSourceLength = isReverseReturn
        ? currentWordLength
        : (isStartRow ? currentWordLength - 1 : currentWordLength);
      expectedTargetLength = isReverseReturn
        ? (targetRowIndex === 0 ? currentWordLength : currentWordLength + 1)
        : currentWordLength + 1;
    }

    if (sourceWordStr.length !== expectedSourceLength) {
      shakeError(`Need ${expectedSourceLength} letters!`);
      setIsProcessing(false);
      return null;
    }

    if (targetWordStr.length !== expectedTargetLength) {
      shakeError(`Need ${expectedTargetLength} letters!`);
      setIsProcessing(false);
      return null;
    }

    // Blind Offering: EVERY structurally-legal move commits. The dictionary
    // judges the chain exactly once, when the final letter lands (see the
    // completion sites below) — mid-board rejection would leak validity, which
    // is the information the mode exists to withhold.
    if (!blindMode) {
      const isSourceValid = checkValidation(sourceWordStr);
      if (!isSourceValid) {
        shakeError(getInvalidWordMessage(sourceWordStr, currentPhase));
        setInvalidAttempts(prev => prev + 1);
        pendingMistakeRef.current = true;
        cleanMoveStreakRef.current = 0;
        // For double shift drop2, go back to pick2 (let player try different letter/slot)
        if (isDoubleShift && doubleShiftPhase === 'drop2') {
          setDoubleShiftPhase('pick2');
          setSelectedLetter(null);
        }
        setIsProcessing(false);
        return null;
      }

      const isTargetValid = checkValidation(targetWordStr);
      if (!isTargetValid) {
        shakeError(getInvalidWordMessage(targetWordStr, currentPhase));
        setInvalidAttempts(prev => prev + 1);
        pendingMistakeRef.current = true;
        cleanMoveStreakRef.current = 0;
        // For double shift drop2, go back to pick2 (let player try different letter/slot)
        if (isDoubleShift && doubleShiftPhase === 'drop2') {
          setDoubleShiftPhase('pick2');
          setSelectedLetter(null);
        }
        setIsProcessing(false);
        return null;
      }
    }

    // Store a lightweight move delta instead of deep-cloning entire board state
    const sourceLetterIndex = sourceRow.words.findIndex(l => l.id === selectedLetter.id);
    const delta: MoveDelta = {
      movedLetterId: selectedLetter.id,
      movedLetterChar: selectedLetter.char,
      sourceRowIndex: activeRowIndex,
      sourceLetterIndex,
      targetRowIndex,
      targetInsertIndex: targetIndex,
      activeRowIndexBefore: activeRowIndex,
      moveDirectionBefore: moveDirection,
    };
    setHistory(prev => [...prev, delta]);

    const newRows = [...rows];
    newRows[activeRowIndex] = { ...sourceRow, words: newSourceLetters };
    newRows[targetRowIndex] = {
      ...targetRow,
      words: newTargetLetters.map(l => ({
        ...l,
        // During reverse leg, preserve all existing locks (cumulative locking):
        // every letter that was shifted at any point stays locked.
        // During double shift drop2, preserve the first dropped letter's lock.
        // During standard forward leg, only the just-moved letter is locked.
        isLocked: (isDoubleShift || isReverseReturn)
          ? (l.isLocked || l.id === selectedLetter.id)
          : (l.id === selectedLetter.id),
      })),
    };

    setRows(newRows);
    setSelectedLetter(null);
    setError(null);
    setHintHighlight(null);

    // Per-move outcome for the honest share grid: one entry per COMMITTED
    // move (double shift: per completed two-letter step), classified by
    // whether a hint and/or an invalid attempt occurred since the previous
    // committed move.
    const moveOutcome: MoveOutcome = pendingHintRef.current
      ? (pendingMistakeRef.current ? 'both' : 'hint')
      : (pendingMistakeRef.current ? 'mistake' : 'clean');
    moveOutcomesRef.current = [...moveOutcomesRef.current, moveOutcome];
    setMoveOutcomes(moveOutcomesRef.current);
    pendingHintRef.current = false;
    pendingMistakeRef.current = false;

    // Arrival settle for the tap path — the moved letter lands with a
    // scale/translate spring instead of teleporting. Drag-drops keep the
    // floating-tile collapse + catch bounce (App passes inputSource='drag').
    if (inputSource !== 'drag') {
      setLastArrival({
        rowIndex: targetRowIndex,
        slotIndex: targetIndex,
        letterId: selectedLetter.id,
        direction: moveDirection,
        moveId: ++arrivalMoveIdRef.current,
      });
    } else {
      setLastArrival(null);
    }

    // Reset double shift phase for next step
    if (isDoubleShift) {
      setDoubleShiftPhase('pick1');
    }

    const maxForwardSourceIndex = rows.length - 2;
    const isReverseMode = hasVariantModifier(currentVariant, 'reverse');

    const finalizePuzzleCompletion = async (completedWords: string[]) => {
      setLastCompletedWords(completedWords);
      setLastIncantationName(getIncantationName(completedWords, currentPhase));
      setIsProcessing(false);
      // Honest solve time only for a board timed from a fresh start (not a
      // restore/retry). undefined tells App to skip feeding the pace trend.
      const solveTimeMs = boardTimedRef.current
        ? Date.now() - boardStartRef.current
        : undefined;
      boardTimedRef.current = false;
      return {
        completed: true,
        hintsUsed,
        invalidAttempts,
        undosUsed: undosUsedRef.current,
        gameMode,
        completedWords,
        variant: currentVariant,
        solveTimeMs,
        blind: blindMode,
        // THE marked final board's win — App silences the fanfare and fires
        // the finale (ref mirror: set at board start, immune to stale closures).
        isFinalBoard: isFinalBoardRef.current,
        // Full per-move record including the completing move (ref mirror is
        // already current; state would be a render behind at this point).
        moveOutcomes: moveOutcomesRef.current,
      };
    };

    // Escalating move feedback: a clean run of moves builds energy via the combo
    // message. We deliberately do NOT announce a dead-end when a move leaves the
    // board unsolvable — discovering you've painted yourself into a corner (and
    // choosing to undo) is part of the challenge, so a stuck board just ends the
    // combo run and shows a normal move message rather than a "you're stuck" call.
    const moveMessageFor = (stuck: boolean): string => {
      if (stuck) {
        cleanMoveStreakRef.current = 0;
        return getMoveMessage(currentPhase);
      }
      cleanMoveStreakRef.current += 1;
      const streak = cleanMoveStreakRef.current;
      // Cadence: streaks 2 and 3 always escalate; from 4 on the combo line
      // lands on EVEN streaks with a regular pool draw between climbs, so a
      // long clean run keeps drawing variety instead of one fixed string.
      return shouldUseComboMessage(streak)
        ? getComboMoveMessage(streak, currentPhase)
        : getMoveMessage(currentPhase);
    };

    // Blind Offering's single judgment: the finished chain must be all real
    // words. On failure the final move stays committed (the reveal is honest
    // about what the player built), the board stays live, and the message
    // sends them back through undo. Counts one invalid attempt for stars.
    const judgeBlindCompletion = (completedWords: string[]) => {
      const holds = completedWords.every(w => checkValidation(w));
      if (holds) return null;
      setInvalidAttempts(prev => prev + 1);
      pendingMistakeRef.current = true;
      cleanMoveStreakRef.current = 0;
      // From here on, undos are free on this board (see blindFailFreeUndosRef).
      blindFailFreeUndosRef.current = true;
      shakeError(getBlindFailMessage(currentPhase));
      setIsProcessing(false);
      return {
        completed: false,
        hintsUsed,
        invalidAttempts: invalidAttempts + 1,
        gameMode,
        completedWords: [],
        blindFailed: true,
      };
    };

    if (!isReverseMode) {
      if (activeRowIndex === maxForwardSourceIndex) {
        const completedWords = newRows.map(r => r.words.map(l => l.char).join(''));
        if (blindMode) {
          const failed = judgeBlindCompletion(completedWords);
          if (failed) return failed;
        }
        return await finalizePuzzleCompletion(completedWords);
      }

      setActiveRowIndex(prev => prev + 1);
      // Stuck detection: double-shift needs the two-letter look-ahead; every
      // other forward variant is one pick+drop per move. In blind mode every
      // structurally-legal move plays, so a board is never "stuck".
      const stuckForward = blindMode
        ? false
        : isDoubleShift
          ? !hasAnyValidDoubleShiftMove(newRows, activeRowIndex + 1, checkValidation)
          : !hasAnyValidMove(newRows, activeRowIndex + 1, 'down', checkValidation);
      setMessage(moveMessageFor(stuckForward));
      setIsStuck(stuckForward);
      setLastFormedWord(targetWordStr);
      setIsProcessing(false);
      // comboTier reads the ref AFTER moveMessageFor updated the streak, so the
      // chime ladder and the message escalate off the same count.
      return { completed: false, hintsUsed, invalidAttempts, gameMode, completedWords: [], formedWord: targetWordStr, comboTier: comboTierForStreak(cleanMoveStreakRef.current) };
    }

    // Reverse Shift: descend to bottom, then return to row 0.
    if (moveDirection === 'down') {
      let reachedMidpoint = false;
      if (activeRowIndex === maxForwardSourceIndex) {
        reachedMidpoint = true;
        // Fresh combo for the return leg — the ascent reads as a second act.
        cleanMoveStreakRef.current = 0;
        setMoveDirection('up');
        setActiveRowIndex(rows.length - 1);
        // Show the "now return upward" beat regardless; if the descent left no
        // valid ascent we still don't announce it (player discovers + undoes).
        const ascentStuck = blindMode
          ? false
          : !hasAnyValidMove(newRows, rows.length - 1, 'up', checkValidation);
        setMessage(
          currentPhase >= 3
            ? 'The descent is complete. Return every letter to the beginning.'
            : 'Great! Now shift letters back up to the first word.'
        );
        setIsStuck(ascentStuck);
      } else {
        setActiveRowIndex(prev => prev + 1);
        const stuck = blindMode
          ? false
          : !hasAnyValidMove(newRows, activeRowIndex + 1, 'down', checkValidation);
        setMessage(moveMessageFor(stuck));
        setIsStuck(stuck);
      }
      setLastFormedWord(targetWordStr);
      setIsProcessing(false);
      // At the midpoint the streak was just reset for the return leg → tier 0.
      return { completed: false, hintsUsed, invalidAttempts, gameMode, completedWords: [], formedWord: targetWordStr, reverseMidpoint: reachedMidpoint, comboTier: comboTierForStreak(cleanMoveStreakRef.current) };
    }

    // Returning upward in reverse mode.
    if (activeRowIndex === 1) {
      const completedWords = newRows.map(r => r.words.map(l => l.char).join(''));
      if (blindMode) {
        const failed = judgeBlindCompletion(completedWords);
        if (failed) return failed;
      }
      return await finalizePuzzleCompletion(completedWords);
    }

    setActiveRowIndex(prev => prev - 1);
    const stuckUp = blindMode
      ? false
      : !hasAnyValidMove(newRows, activeRowIndex - 1, 'up', checkValidation);
    setMessage(moveMessageFor(stuckUp));
    setIsStuck(stuckUp);
    setLastFormedWord(targetWordStr);
    setIsProcessing(false);
    return { completed: false, hintsUsed, invalidAttempts, gameMode, completedWords: [], formedWord: targetWordStr, comboTier: comboTierForStreak(cleanMoveStreakRef.current) };
  }, [
    selectedLetter,
    gameState,
    rows,
    activeRowIndex,
    currentWordLength,
    shakeError,
    checkValidation,
    hintsUsed,
    invalidAttempts,
    moveDirection,
    currentVariant,
    currentPhase,
    gameMode,
    blindMode,
    doubleShiftPhase,
  ]);

  // Grant one extra undo (e.g. an amber-spend refill in Challenge mode). No-op
  // outside the limited-undo modes (where undosRemaining is Infinity).
  const grantExtraUndo = useCallback(() => {
    setUndosRemaining(prev => (prev === Infinity ? prev : prev + 1));
  }, []);

  const handleUndo = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;
    if (history.length === 0) return;

    // Taking back a move breaks the clean-move streak AND the flawless run.
    cleanMoveStreakRef.current = 0;
    undosUsedRef.current += 1;

    const isDoubleShift = hasVariantModifier(currentVariant, 'double_shift');

    // Double shift mid-step undo: always allowed even in challenge mode (not a committed move)
    if (isDoubleShift && (doubleShiftPhase === 'pick2' || doubleShiftPhase === 'drop2')) {
      const delta = history[history.length - 1];
      setRows(prevRows => {
        const newRows = [...prevRows];
        const targetRow = newRows[delta.targetRowIndex];
        const sourceRow = newRows[delta.sourceRowIndex];
        const newTargetLetters = targetRow.words.filter(l => l.id !== delta.movedLetterId);
        const restoredLetter: Letter = { id: delta.movedLetterId, char: delta.movedLetterChar, isLocked: false };
        const newSourceLetters = [...sourceRow.words];
        newSourceLetters.splice(delta.sourceLetterIndex, 0, restoredLetter);
        newRows[delta.targetRowIndex] = { ...targetRow, words: newTargetLetters };
        newRows[delta.sourceRowIndex] = { ...sourceRow, words: newSourceLetters };
        return newRows;
      });
      setHistory(prev => prev.slice(0, -1));
      setDoubleShiftPhase('pick1');
      setSelectedLetter(null);
      setError(null);
      setHintHighlight(null);
      setLastArrival(null);
      return;
    }

    // Challenge mode: limited undos (only applies to committed moves, not
    // mid-step). A failed Blind Offering judgment unlocks free undos for the
    // rest of the board — the fail must always be repairable.
    const freeUndos = blindFailFreeUndosRef.current;
    if (gameMode === 'challenge' && !freeUndos && undosRemaining <= 0) {
      shakeError("No undos remaining in Challenge Mode!");
      return;
    }

    // Challenge + double shift: a completed step is TWO committed deltas (both
    // drops). Revert the WHOLE step atomically for ONE undo charge — otherwise
    // the limited undo half-reverts on the first press (only the second drop),
    // stranding the first drop as an un-undoable move and burning a charge on a
    // partial undo. Standard mode keeps its granular per-drop undo below. The
    // last two deltas belong to the same step iff they share activeRowIndexBefore
    // (mid-step undos are handled by the pick2/drop2 branch above).
    if (
      gameMode === 'challenge' &&
      isDoubleShift &&
      (doubleShiftPhase === 'pick1' || doubleShiftPhase === 'drop1') &&
      history.length >= 2 &&
      history[history.length - 1].activeRowIndexBefore === history[history.length - 2].activeRowIndexBefore
    ) {
      const dropSecond = history[history.length - 1];
      const dropFirst = history[history.length - 2];
      const reverseDelta = (rowsArr: RowData[], d: MoveDelta): RowData[] => {
        const nr = [...rowsArr];
        const tRow = nr[d.targetRowIndex];
        const sRow = nr[d.sourceRowIndex];
        const tLetters = tRow.words.filter(l => l.id !== d.movedLetterId);
        const restored: Letter = { id: d.movedLetterId, char: d.movedLetterChar, isLocked: false };
        const sLetters = [...sRow.words];
        sLetters.splice(d.sourceLetterIndex, 0, restored);
        nr[d.targetRowIndex] = { ...tRow, words: tLetters };
        nr[d.sourceRowIndex] = { ...sRow, words: sLetters };
        return nr;
      };
      // Undo in reverse commit order: the second drop, then the first.
      setRows(prevRows => reverseDelta(reverseDelta(prevRows, dropSecond), dropFirst));
      setActiveRowIndex(dropFirst.activeRowIndexBefore);
      if (dropFirst.moveDirectionBefore) setMoveDirection(dropFirst.moveDirectionBefore);
      setHistory(prev => prev.slice(0, -2));
      setGameState(GameState.PLAYING);
      setSelectedLetter(null);
      setError(null);
      setIsStuck(false);
      setHintHighlight(null);
      setLastArrival(null);
      setDoubleShiftPhase('pick1');
      // One moveOutcome was recorded for the whole step (at drop2) — pop it and
      // re-merge its hint/mistake flags, mirroring the single-delta path.
      if (moveOutcomesRef.current.length > 0) {
        const undone = moveOutcomesRef.current[moveOutcomesRef.current.length - 1];
        if (undone === 'hint' || undone === 'both') pendingHintRef.current = true;
        if (undone === 'mistake' || undone === 'both') pendingMistakeRef.current = true;
        moveOutcomesRef.current = moveOutcomesRef.current.slice(0, -1);
        setMoveOutcomes(moveOutcomesRef.current);
      }
      setMessage("Let's try again!");
      if (!freeUndos) setUndosRemaining(prev => prev - 1);
      return;
    }

    // Standard undo: always undo 1 delta at a time.
    // For double shift completed steps, the second undo press will reverse the other drop.
    const delta = history[history.length - 1];

    setRows(prevRows => {
      const newRows = [...prevRows];
      const targetRow = newRows[delta.targetRowIndex];
      const sourceRow = newRows[delta.sourceRowIndex];
      const newTargetLetters = targetRow.words.filter(l => l.id !== delta.movedLetterId);
      const restoredLetter: Letter = { id: delta.movedLetterId, char: delta.movedLetterChar, isLocked: false };
      const newSourceLetters = [...sourceRow.words];
      newSourceLetters.splice(delta.sourceLetterIndex, 0, restoredLetter);
      newRows[delta.targetRowIndex] = { ...targetRow, words: newTargetLetters };
      newRows[delta.sourceRowIndex] = { ...sourceRow, words: newSourceLetters };
      return newRows;
    });

    setActiveRowIndex(delta.activeRowIndexBefore);
    if (delta.moveDirectionBefore) {
      setMoveDirection(delta.moveDirectionBefore);
    }
    setHistory(prev => prev.slice(0, -1));
    setGameState(GameState.PLAYING);
    setSelectedLetter(null);
    setError(null);
    setIsStuck(false);
    setHintHighlight(null);
    setLastArrival(null);
    // Pop the undone move's outcome and re-merge its flags into the pending
    // window: a hint/mistake spent on the undone move still marks whatever
    // move replaces it — the share grid stays honest across undo/redo.
    if (moveOutcomesRef.current.length > 0) {
      const undone = moveOutcomesRef.current[moveOutcomesRef.current.length - 1];
      if (undone === 'hint' || undone === 'both') pendingHintRef.current = true;
      if (undone === 'mistake' || undone === 'both') pendingMistakeRef.current = true;
      moveOutcomesRef.current = moveOutcomesRef.current.slice(0, -1);
      setMoveOutcomes(moveOutcomesRef.current);
    }
    setMessage("Let's try again!");

    // After undoing one delta of a double shift completed step, we're now mid-step
    // (the first drop is still in place). Set to pick2 so player can pick the second letter again.
    if (isDoubleShift) {
      // Check if the previous delta (now the last in history) is the first drop of the same step
      // i.e. same activeRowIndexBefore — meaning there's still a first drop to potentially undo
      const remainingHistory = history.slice(0, -1);
      if (remainingHistory.length > 0) {
        const prevDelta = remainingHistory[remainingHistory.length - 1];
        if (prevDelta.activeRowIndexBefore === delta.activeRowIndexBefore) {
          // The previous delta is the first drop — we're now mid-step
          setDoubleShiftPhase('pick2');
        } else {
          setDoubleShiftPhase('pick1');
        }
      } else {
        setDoubleShiftPhase('pick1');
      }
    }

    if (gameMode === 'challenge' && !freeUndos) {
      setUndosRemaining(prev => prev - 1);
    }
  }, [history, gameMode, undosRemaining, shakeError, gameState, currentVariant, doubleShiftPhase]);

  const handleNextLevel = useCallback(() => {
    setShowConfetti(false);
    startNewGame();
  }, [startNewGame]);

  // Compute word previews for the target row when a letter is selected.
  // Shows what word would form at each slot position — valid words in green, invalid in red.
  const slotPreviews = useMemo(() => {
    if (!selectedLetter || gameState !== GameState.PLAYING) return undefined;
    // Blind Offering: no ghost previews — and, because drag snapping keys off
    // these validity flags, suppressing them also removes the "tile jumps to a
    // valid slot" tell, keeping the modifier honestly blind. Challenge keeps
    // its previews (2026-07 trial-ladder rebalance): losing them made the mode
    // unreadable rather than harder, and the amber/progress multipliers were
    // re-tuned (1.25x / 1.5x) to price the mode WITH previews on. Preview
    // suppression is now solely Blind Offering's identity.
    if (blindMode) return undefined;

    const isDoubleShift = hasVariantModifier(currentVariant, 'double_shift');

    // For double shift, only show previews during drop phases
    if (isDoubleShift && doubleShiftPhase !== 'drop1' && doubleShiftPhase !== 'drop2') {
      return undefined;
    }

    const targetRowIndex = activeRowIndex + (moveDirection === 'down' ? 1 : -1);
    if (targetRowIndex < 0 || targetRowIndex >= rows.length) return undefined;

    const targetLetters = rows[targetRowIndex].words.map(l => l.char);
    const previews: Array<{ word: string; isValid: boolean }> = [];

    // Source-word validity after removing the selected letter. handleSlotPress
    // validates BOTH resulting words, so a preview that only checks the target
    // is a false positive whenever the removal breaks the source word — the
    // player taps a ✓ slot and still gets the error shake + invalid-attempt
    // star penalty. Constant across slots, so compute once per selection.
    // Drag snapping (findClosestValidSlot) keys off these flags too, so this
    // also stops drags redirecting INTO slots that would be rejected.
    // (Not used for double-shift drop1, whose look-ahead already accounts for
    // the final source word.)
    const sourceWordAfterRemoval = rows[activeRowIndex].words
      .filter(l => l.id !== selectedLetter.id)
      .map(l => l.char)
      .join('');
    const isSourceValidAfterRemoval = validWordsCache.current.has(sourceWordAfterRemoval);

    // For each possible insertion position (0 through targetLetters.length)
    for (let i = 0; i <= targetLetters.length; i++) {
      const newWord = [
        ...targetLetters.slice(0, i),
        selectedLetter.char,
        ...targetLetters.slice(i),
      ].join('');

      if (isDoubleShift && doubleShiftPhase === 'drop1') {
        // During drop1 the intermediate word (W+1) is never itself a dictionary
        // word, so validating the string is meaningless. Instead, look ahead:
        // mark the slot ✓ only if SOME second move can complete the step from
        // here. This turns the first drop from blind guesswork into real
        // guidance (a ✗ slot is a dead-end before the player commits to it).
        const reducedSource = rows[activeRowIndex].words.filter(l => l.id !== selectedLetter.id);
        const intermediateChars = [
          ...targetLetters.slice(0, i),
          selectedLetter.char,
          ...targetLetters.slice(i),
        ];
        previews.push({
          word: newWord,
          isValid: canCompleteDoubleShift(
            reducedSource,
            intermediateChars,
            (w) => validWordsCache.current.has(w)
          ),
        });
      } else {
        // Both the standard/reverse full move AND double-shift drop2 validate
        // the source word (letter removed) as well as the target word — the
        // preview must AND both or it promises a move the game will reject.
        previews.push({
          word: newWord,
          isValid: isSourceValidAfterRemoval && validWordsCache.current.has(newWord),
        });
      }
    }
    return previews;
  }, [selectedLetter, activeRowIndex, moveDirection, rows, gameState, currentVariant, doubleShiftPhase, blindMode, gameMode]);

  // Verb-depth gate: whether the ✓/✗ validity grading on the ghost previews is
  // PRESENTED. The slotPreviews data above keeps computing isValid internally
  // (the double-shift drop1 look-ahead and the drag near-miss snapping need
  // it); this flag controls presentation only. Shown ONLY on EASY boards (any
  // variant) and in the double-shift variant at any difficulty (its
  // intermediate non-word state needs the guidance). Hidden everywhere else —
  // MEDIUM+ standard/reverse/speed, the daily (ramps MEDIUM+ by design), and
  // shared-challenge links — so the player judges the word with their own ear.
  // Blind Offering has no previews at all (blindMode short-circuits above),
  // but the flag stays false there too so consumers never key a tell off it.
  const previewValidityVisible = useMemo(() => {
    if (blindMode) return false;
    if (hasVariantModifier(currentVariant, 'double_shift')) return true;
    if (isDailyBoard || isSharedChallenge) return false;
    return difficulty === 'EASY';
  }, [blindMode, currentVariant, isDailyBoard, isSharedChallenge, difficulty]);

  const restorePuzzleState = useCallback((saved: SavedPuzzleState) => {
    const selectedExists = saved.selectedLetter
      ? saved.rows.some(row => row.words.some(letter => letter.id === saved.selectedLetter!.id))
      : false;
    setRows(saved.rows);
    setActiveRowIndex(saved.activeRowIndex);
    setSelectedLetter(selectedExists ? saved.selectedLetter : null);
    setGameState(saved.gameState as GameState);
    setMessage(saved.message);
    setHistory(saved.history);
    setInvalidAttempts(saved.invalidAttempts);
    setHintsUsed(saved.hintsUsed);
    setUndosRemaining(saved.undosRemaining);
    difficultyRef.current = saved.difficulty;
    setDifficulty(saved.difficulty);
    setCurrentWordLength(saved.currentWordLength);
    setHint(saved.hint);
    setSolution(saved.solution);
    setReverseSolution(saved.reverseSolution);
    gameModeRef.current = saved.gameMode;
    setGameMode(saved.gameMode);
    setBlindMode(saved.blindMode ?? false);
    // A restored board starts with a clean judgment slate (the free-undo
    // mercy is per-live-board and deliberately not persisted).
    blindFailFreeUndosRef.current = false;
    // Shared-challenge provenance rides in the autosave (isSharedChallenge in
    // SavedPuzzleState) so a kill+relaunch can't convert a shared board
    // (amber-only) into one that feeds phase progress. Old saves without the
    // field restore as normal boards.
    setIsSharedChallenge(saved.isSharedChallenge ?? false);
    // A daily autosave is never restored as a normal puzzle (App's load guard),
    // so a restored board is by definition not a daily.
    setIsDailyBoard(false);
    // The final-board mark survives kill/restore: the finale must fire on the
    // board that was served as final, even across a relaunch.
    isFinalBoardRef.current = saved.isFinalBoard === true;
    setIsFinalBoard(saved.isFinalBoard === true);
    setCurrentVariant(saved.currentVariant);
    setSelectedVariantState(saved.selectedVariant);
    setMoveDirection(saved.moveDirection);
    setCurrentPhase(saved.currentPhase);
    setLastFormedWord(saved.lastFormedWord);
    setDoubleShiftPhase(
      (saved.doubleShiftPhase as typeof doubleShiftPhase)
        ?? (hasVariantModifier(saved.currentVariant, 'double_shift') ? 'pick1' : null)
    );
    // Reset UI-only state
    setError(null);
    setIsProcessing(false);
    setShowRules(false);
    setShowDifficultyMenu(false);
    setShowConfetti(false);
    setEarnedStars(0);
    // Resume without an active combo (the saved streak isn't persisted).
    cleanMoveStreakRef.current = 0;
    // Restore never replays an arrival and drops any stale hint glow. The
    // per-move outcome record isn't persisted, so it restarts empty — the
    // share grid falls back to the legacy distribution for restored runs.
    setHintHighlight(null);
    setLastArrival(null);
    setSpeedRescueSignal(null);
    moveOutcomesRef.current = [];
    setMoveOutcomes([]);
    pendingHintRef.current = false;
    pendingMistakeRef.current = false;
    // A restored board has no honest solve-time origin — don't feed the trend.
    boardTimedRef.current = false;
  }, []);

  // Re-apply the same puzzle from its starting words (each row preserves its
  // immutable originalWord). Unlike startNewGame this does NOT fetch a different
  // puzzle — it's a real "retry this board", the recovery path for a stuck state.
  // Performance counters (invalid attempts, hints used) are intentionally kept so
  // a reset can't be used to game the star rating; undos refresh with the board.
  const resetCurrentPuzzle = useCallback(() => {
    if (rows.length === 0) return;
    const originalWords = rows.map(r => r.originalWord);
    const wordLen = originalWords[0]?.length ?? currentWordLength;
    applyBoard(originalWords, hint || undefined, solution, wordLen, {
      resetPerformance: false,
      preserveVariant: true,
      reverseSolution,
    });
  }, [rows, applyBoard, hint, solution, reverseSolution, currentWordLength]);

  const refreshHintBalance = useCallback(() => {
    setHintBalance(getHintBalanceSync());
  }, []);

  // Speed rescue: the Time's Up overlay (GAME_OVER, set solely on speed
  // time-up) can offer a continue — e.g. after a rewarded clip. Flips back to
  // PLAYING and raises speedRescueSignal; App restarts the clock with the
  // granted seconds (the hook remains the source of truth for gameState).
  const resumeSpeedAfterRescue = useCallback((extraSec: number): boolean => {
    if (gameState !== GameState.GAME_OVER) return false;
    if (!Number.isFinite(extraSec) || extraSec <= 0) return false;
    setGameState(GameState.PLAYING);
    setSelectedLetter(null);
    setError(null);
    setSpeedRescueSignal(prev => ({ extraSec, id: (prev?.id ?? 0) + 1 }));
    // Local copy: phaseNarrative.ts is owned by another workstream this pass.
    setMessage(
      currentPhase >= 3
        ? 'The clock relents. Briefly.'
        : 'Back in it! Extra time on the clock!'
    );
    return true;
  }, [gameState, currentPhase]);

  const clearBoard = useCallback(() => {
    setRows([]);
    setActiveRowIndex(0);
    setSelectedLetter(null);
    setGameState(GameState.IDLE);
    setMessage('');
    setError(null);
    setHistory([]);
    setLastCompletedWords([]);
    setLastIncantationName(null);
    setLastFormedWord(null);
    setDoubleShiftPhase(null);
    setIsEchoPuzzle(false);
    isFinalBoardRef.current = false;
    setIsFinalBoard(false);
    setIsSharedChallenge(false);
    setIsDailyBoard(false);
    setIsStuck(false);
    setHintHighlight(null);
    setLastArrival(null);
    setSpeedRescueSignal(null);
    moveOutcomesRef.current = [];
    setMoveOutcomes([]);
    pendingHintRef.current = false;
    pendingMistakeRef.current = false;
  }, []);

  const state: PuzzleGameState = {
    rows,
    activeRowIndex,
    selectedLetter,
    gameState,
    message,
    error,
    history,
    isProcessing,
    hint,
    solution,
    reverseSolution,
    difficulty,
    currentWordLength,
    showRules,
    showDifficultyMenu,
    showConfetti,
    invalidAttempts,
    hintsUsed,
    earnedStars,
    gameMode,
    blindMode,
    isSharedChallenge,
    undosRemaining,
    currentPhase,
    lastCompletedWords,
    lastIncantationName,
    lastFormedWord,
    currentVariant,
    selectedVariant,
    moveDirection,
    slotPreviews,
    previewValidityVisible,
    doubleShiftPhase,
    isEchoPuzzle,
    isFinalBoard,
    isStuck,
    hintBalance,
    outOfHintsSignal,
    hintHighlight,
    moveOutcomes,
    lastArrival,
    speedRescueSignal,
  };

  const actions: PuzzleGameActions = {
    initGame,
    startNewGame,
    startDailyGame,
    startSharedChallengeGame,
    resumeSpeedAfterRescue,
    handleLetterPress,
    handleSlotPress,
    handleUndo,
    grantExtraUndo,
    handleHint,
    refreshHintBalance,
    handleNextLevel,
    setShowRules,
    setShowDifficultyMenu,
    setShowConfetti,
    setGameState,
    setEarnedStars,
    setMessage,
    // Keep the synchronous mirror in step: applyBoard's undo reset reads the
    // ref, so an external setGameMode('challenge') followed by initGame in
    // the same tick must see 'challenge' (state alone lags a render).
    setGameMode: (mode: GameMode) => {
      gameModeRef.current = mode;
      setGameMode(mode);
    },
    setCurrentPhase,
    setSelectedVariant,
    restorePuzzleState,
    resetCurrentPuzzle,
    clearBoard,
  };

  return [state, actions];
}
