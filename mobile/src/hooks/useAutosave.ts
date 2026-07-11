import { useEffect, useRef } from 'react';
import { GameState } from '../types';
import { savePuzzleState, SavedPuzzleState } from '../services/puzzleSaveState';
import { getTodayString } from '../services/dailyChallenge';
import { AUTOSAVE_DEBOUNCE_MS } from '../constants/timing';

export interface AutosaveDeps {
  currentScreen: string;
  isPlayingDaily: boolean;
  rows: any[];
  activeRowIndex: number;
  selectedLetter: any;
  gameState: GameState;
  message: string;
  history: any[];
  invalidAttempts: number;
  hintsUsed: number;
  undosRemaining: number;
  difficulty: string;
  currentWordLength: number;
  hint: any;
  solution: any;
  reverseSolution: any;
  gameMode: string;
  blindMode: boolean;
  currentVariant: string;
  selectedVariant: string;
  moveDirection: string;
  currentPhase: number;
  lastFormedWord: string | null;
  doubleShiftPhase: string | null;
  speedTimeRemaining: number | null;
  isSharedChallenge: boolean;
}

/**
 * Debounced auto-save of the active puzzle snapshot during play.
 *
 * Writes the full puzzle state to AsyncStorage after a short debounce
 * so that mid-session quits can resume exactly where the player left off.
 */
export function useAutosave(deps: AutosaveDeps): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Live snapshot so the debounce callback can verify the game is STILL in
  // progress when it fires — otherwise a save scheduled one render before a
  // victory could re-write the cleared save with a stale PLAYING board.
  const depsRef = useRef(deps);
  depsRef.current = deps;

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (deps.gameState === GameState.PLAYING && deps.currentScreen === 'puzzle') {
      timerRef.current = setTimeout(() => {
        // Re-check at fire time: the puzzle may have completed (or the player
        // left the screen) since this save was scheduled.
        if (depsRef.current.gameState !== GameState.PLAYING || depsRef.current.currentScreen !== 'puzzle') {
          return;
        }
        const saveData: Partial<SavedPuzzleState> = {
          rows: deps.rows,
          activeRowIndex: deps.activeRowIndex,
          selectedLetter: deps.selectedLetter,
          gameState: deps.gameState as any,
          message: deps.message,
          history: deps.history,
          invalidAttempts: deps.invalidAttempts,
          hintsUsed: deps.hintsUsed,
          undosRemaining: deps.undosRemaining,
          difficulty: deps.difficulty as any,
          currentWordLength: deps.currentWordLength,
          hint: deps.hint,
          solution: deps.solution,
          reverseSolution: deps.reverseSolution,
          gameMode: deps.gameMode as any,
          blindMode: deps.blindMode,
          currentVariant: deps.currentVariant as any,
          selectedVariant: deps.selectedVariant as any,
          moveDirection: deps.moveDirection as any,
          blindRevealedRows: [],
          currentPhase: deps.currentPhase as any,
          lastFormedWord: deps.lastFormedWord,
          doubleShiftPhase: deps.doubleShiftPhase as any,
          isPlayingDaily: deps.isPlayingDaily,
          dailyDate: deps.isPlayingDaily ? getTodayString() : null,
          isSharedChallenge: deps.isSharedChallenge,
          speedTimerExpireAt: deps.speedTimeRemaining != null
            ? Date.now() + deps.speedTimeRemaining * 1000
            : null,
          speedTimeRemainingSec: deps.speedTimeRemaining,
          savedAt: Date.now(),
        };
        savePuzzleState(saveData as SavedPuzzleState).catch(() => {});
      }, AUTOSAVE_DEBOUNCE_MS);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    deps.currentScreen,
    deps.isPlayingDaily,
    deps.rows,
    deps.activeRowIndex,
    deps.selectedLetter,
    deps.gameState,
    deps.message,
    deps.history,
    deps.invalidAttempts,
    deps.hintsUsed,
    deps.undosRemaining,
    deps.difficulty,
    deps.currentWordLength,
    deps.hint,
    deps.solution,
    deps.reverseSolution,
    deps.gameMode,
    deps.blindMode,
    deps.currentVariant,
    deps.selectedVariant,
    deps.moveDirection,
    deps.currentPhase,
    deps.lastFormedWord,
    deps.doubleShiftPhase,
    deps.speedTimeRemaining,
    deps.isSharedChallenge,
  ]);
}
