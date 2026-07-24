
export interface Letter {
  id: string;
  char: string;
  isLocked: boolean;
}

export interface RowData {
  id: string;
  words: Letter[];
  originalWord: string;
}

export enum GameState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  WON = 'WON',
  GAME_OVER = 'GAME_OVER',
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'MEDIUM_PLUS' | 'HARD' | 'EXPERT';

export type GameMode = 'standard' | 'challenge';

export interface PuzzleSolutionStep {
  stepIndex: number;
  sourceWord: string;
  targetWord: string;
  letterToMove: string;
  explanation: string;
  /** Position in the target row where the letter should be inserted (0-indexed). */
  insertionPosition?: number;
  /** Position in the source row from which the letter is removed (0-indexed).
   *  Critical when the source word has duplicate letters. */
  removalPosition?: number;
  /** For double shift: the two letters to move (overrides letterToMove). */
  lettersToMove?: [string, string];
  /** For double shift: insertion positions for both letters in order. */
  insertionPositions?: [number, number];
  /** For double shift: removal positions for both letters in order. */
  removalPositions?: [number, number];
}

export interface PuzzleConfig {
  words: string[];
  hint?: string;
  solution?: PuzzleSolutionStep[];
  /** Step-by-step reverse solution for hints during the reverse leg (reverse variants only). */
  reverseSolution?: PuzzleSolutionStep[];
  wordLength?: number;
  /** When true, this puzzle uses double-shift mechanics (2 letters per step). */
  isDoubleShift?: boolean;
  /** Real chain quality score (0-100) of the generated board, when available.
   * Persisted into pre-generated banks so selection can rank by genuine
   * quality; runtime play ignores it. */
  qualityScore?: number;
}

/**
 * Move delta — stores what changed instead of the entire board state.
 * To undo: remove movedLetter from targetRow at targetInsertIndex,
 * then insert it back into sourceRow at sourceLetterIndex.
 */
export interface MoveDelta {
  movedLetterId: string;
  movedLetterChar: string;
  sourceRowIndex: number;
  sourceLetterIndex: number;
  targetRowIndex: number;
  targetInsertIndex: number;
  activeRowIndexBefore: number;
  /** Variant movement direction before this move (used by reverse mode undo). */
  moveDirectionBefore?: 'down' | 'up';
}

/** @deprecated Use MoveDelta for new code. Kept for type compatibility. */
export interface MoveHistory {
  rows: RowData[];
  activeRowIndex: number;
}
