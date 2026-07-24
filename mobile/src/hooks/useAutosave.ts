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
  /** True from the instant a victory begins processing (set BEFORE the async
   *  recordVictory awaits, and long before gameState flips to WON). The save
   *  must skip while this holds, or the debounce can re-persist the just-cleared
   *  won board as a restartable PLAYING save during the record window. */
  isProcessingVictory: boolean;
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
  lexiconMode: boolean;
  unbrokenWeaveMode: boolean;
  spentLetters: string[];
  currentVariant: string;
  selectedVariant: string;
  moveDirection: string;
  currentPhase: number;
  lastFormedWord: string | null;
  doubleShiftPhase: string | null;
  speedTimeRemaining: number | null;
  isSharedChallenge: boolean;
  isFinalBoard: boolean;
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

    if (deps.gameState === GameState.PLAYING && deps.currentScreen === 'puzzle' && !deps.isProcessingVictory) {
      timerRef.current = setTimeout(() => {
        // Re-check at fire time: the puzzle may have completed (or the player
        // left the screen) since this save was scheduled. gameState alone is
        // insufficient — App flips it to WON only AFTER the async recordVictory,
        // so a slow record leaves a window where the board is cleared/won but
        // still reads PLAYING; isProcessingVictory closes that window (it is set
        // synchronously before the record await).
        if (
          depsRef.current.gameState !== GameState.PLAYING ||
          depsRef.current.currentScreen !== 'puzzle' ||
          depsRef.current.isProcessingVictory
        ) {
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
          lexiconMode: deps.lexiconMode,
          unbrokenWeaveMode: deps.unbrokenWeaveMode,
          spentLetters: deps.spentLetters,
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
          isFinalBoard: deps.isFinalBoard,
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
    deps.isProcessingVictory,
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
    deps.lexiconMode,
    deps.unbrokenWeaveMode,
    deps.spentLetters,
    deps.currentVariant,
    deps.selectedVariant,
    deps.moveDirection,
    deps.currentPhase,
    deps.lastFormedWord,
    deps.doubleShiftPhase,
    deps.speedTimeRemaining,
    deps.isSharedChallenge,
    deps.isFinalBoard,
  ]);
}
