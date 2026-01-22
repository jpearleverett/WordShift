
export interface Letter {
  id: string;
  char: string;
  isLocked: boolean; // Cannot be moved (was just received)
}

export interface RowData {
  id: string;
  words: Letter[]; // Array of letter objects representing the word
  originalWord: string; // For reference/reset
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
  stepIndex: number; // 0, 1, 2...
  sourceWord: string;
  targetWord: string;
  letterToMove: string;
  explanation: string;
}

export interface PuzzleConfig {
  words: string[]; // Variable length based on difficulty
  hint?: string;
  solution?: PuzzleSolutionStep[];
  wordLength?: number; // Added to support variable word lengths (e.g. 5 for Hard)
}

export interface MoveHistory {
  rows: RowData[];
  activeRowIndex: number;
}
