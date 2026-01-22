
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

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

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
  wordLength?: number;
}

export interface MoveHistory {
  rows: RowData[];
  activeRowIndex: number;
}
