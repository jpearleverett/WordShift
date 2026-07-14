import AsyncStorage from '@react-native-async-storage/async-storage';
import { RowData, Letter, GameState, MoveDelta, PuzzleSolutionStep, Difficulty, GameMode } from '../types';
import { DialoguePhase } from '../types/homeWorld';
import { PuzzleVariant } from './puzzleVariety';

/**
 * Mid-puzzle save/restore service.
 *
 * Persists puzzle state to AsyncStorage after every valid move so players
 * don't lose progress on app crash, phone calls, or accidental closure.
 * Follows the same AsyncStorage + in-memory cache pattern as amberCurrency.ts.
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
  /** @deprecated old progressive-reveal blind mode — kept so ancient saves parse. */
  blindRevealedRows?: number[];
  /** Blind Offering modifier active on this board (previews hidden). Restored so
   *  a kill+relaunch can't hand the player a free peek at the previews. */
  blindMode?: boolean;
  currentPhase: DialoguePhase;
  lastFormedWord: string | null;
  /** Double shift input cycle phase (null for non-double-shift puzzles). */
  doubleShiftPhase?: 'pick1' | 'pick2' | 'drop1' | 'drop2' | null;
  isPlayingDaily: boolean;
  /** Date for daily challenge saves (YYYY-MM-DD). Null for standard puzzles. */
  dailyDate?: string | null;
  /** Board came from a friend-shared challenge link. Restored so a kill+relaunch
   *  can't convert a shared board (amber-only) into one that feeds phase progress. */
  isSharedChallenge?: boolean;
  /** THE marked final board (finale-armed serve). Restored so a kill+relaunch
   *  keeps the finale on the board that was served as final — its victory must
   *  still silence the fanfare and fire FINAL_PUZZLE_EVENT. */
  isFinalBoard?: boolean;
  /** Absolute timestamp (ms) when the speed timer expires. Null for non-speed variants. */
  speedTimerExpireAt?: number | null;
  /** Remaining speed-timer seconds at save time. Preferred over
   *  speedTimerExpireAt on restore so backgrounding/relaunch pauses the
   *  clock instead of expiring it (expireAt kept for old saves). */
  speedTimeRemainingSec?: number | null;
  savedAt: number;
}

let saveCache: SavedPuzzleState | null = null;

export async function savePuzzleState(state: SavedPuzzleState): Promise<void> {
  saveCache = state;
  try {
    await AsyncStorage.setItem(PUZZLE_SAVE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Failed to save puzzle state:', err);
  }
}

export async function loadPuzzleState(): Promise<SavedPuzzleState | null> {
  if (saveCache) return saveCache;
  try {
    const stored = await AsyncStorage.getItem(PUZZLE_SAVE_KEY);
    if (stored) {
      saveCache = JSON.parse(stored);
      // JSON.stringify(Infinity) produces null — restore it on load
      if (saveCache && (saveCache.undosRemaining === null || saveCache.undosRemaining === undefined)) {
        saveCache.undosRemaining = Infinity;
      }
      return saveCache;
    }
  } catch (err) {
    console.warn('Failed to load puzzle state:', err);
  }
  return null;
}

/** Drop the in-memory puzzle save cache after external storage writes (cloud restore). */
export function invalidatePuzzleStateCache(): void {
  saveCache = null;
}

export async function clearPuzzleState(): Promise<void> {
  saveCache = null;
  try {
    await AsyncStorage.removeItem(PUZZLE_SAVE_KEY);
  } catch (err) {
    console.warn('Failed to clear puzzle state:', err);
  }
}
