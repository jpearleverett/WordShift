
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

export type Difficulty = 'EASY' | 'MEDIUM' | 'MEDIUM_PLUS' | 'HARD';

export type GameMode = 'standard' | 'challenge';

export interface PuzzleSolutionStep {
  stepIndex: number;
  sourceWord: string;
  targetWord: string;
  letterToMove: string;
  explanation: string;
}

export interface PuzzleConfig {
  words: string[];
  hint?: string;
  solution?: PuzzleSolutionStep[];
  /** Step-by-step reverse solution for hints during the reverse leg (reverse variants only). */
  reverseSolution?: PuzzleSolutionStep[];
  wordLength?: number;
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
