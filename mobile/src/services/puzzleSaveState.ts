import { storage } from './storage';
import { RowData, Letter, GameState, MoveDelta, PuzzleSolutionStep, Difficulty, GameMode } from '../types';
import { DialoguePhase } from '../types/homeWorld';
import { PuzzleVariant } from './puzzleVariety';

/**
 * Mid-puzzle save/restore service.
 *
 * Persists puzzle state to MMKV after every valid move so players
 * don't lose progress on app crash, phone calls, or accidental closure.
 */

const PUZZLE_SAVE_KEY = 'wordshift_in_progress_puzzle';

export interface SavedPuzzleState {
  rows: RowData[];
  activeRowIndex: number;
  selectedLetter: Letter | null;
  gameState: GameState;
  message: string;
  history: MoveDelta[];
  invalidAttempts: number;
  hintsUsed: number;
  undosRemaining: number;
  difficulty: Difficulty;
  currentWordLength: number;
  hint: string;
  solution: PuzzleSolutionStep[] | undefined;
  reverseSolution: PuzzleSolutionStep[] | undefined;
  gameMode: GameMode;
  currentVariant: PuzzleVariant;
  selectedVariant: PuzzleVariant;
  moveDirection: 'down' | 'up';
  /** @deprecated blind mode removed — kept for backwards compatibility with existing saves */
  blindRevealedRows?: number[];
  currentPhase: DialoguePhase;
  lastFormedWord: string | null;
  /** Double shift input cycle phase (null for non-double-shift puzzles). */
  doubleShiftPhase?: 'pick1' | 'pick2' | 'drop1' | 'drop2' | null;
  isPlayingDaily: boolean;
  /** Date for daily challenge saves (YYYY-MM-DD). Null for standard puzzles. */
  dailyDate?: string | null;
  /** Absolute timestamp (ms) when the speed timer expires. Null for non-speed variants. */
  speedTimerExpireAt?: number | null;
  savedAt: number;
}

export function savePuzzleState(state: SavedPuzzleState): void {
  storage.set(PUZZLE_SAVE_KEY, JSON.stringify(state));
}

export function loadPuzzleState(): SavedPuzzleState | null {
  const stored = storage.getString(PUZZLE_SAVE_KEY);
  if (stored !== undefined) {
    const parsed: SavedPuzzleState = JSON.parse(stored);
    // JSON.stringify(Infinity) produces null — restore it on load
    if (parsed.undosRemaining === null || parsed.undosRemaining === undefined) {
      parsed.undosRemaining = Infinity;
    }
    return parsed;
  }
  return null;
}

export function clearPuzzleState(): void {
  storage.remove(PUZZLE_SAVE_KEY);
}
