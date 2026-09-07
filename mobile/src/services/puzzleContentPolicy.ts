import { BLOCKED_WORD_SET } from '../constants/blockedWords';
import type { PreGeneratedPuzzle } from '../data/puzzleBankTypes';

/** Double Shift renders a half-move before final word validation runs. */
export function hasBlockedDoubleShiftIntermediate(puzzle: Pick<PreGeneratedPuzzle, 'solution' | 'isDoubleShift'>): boolean {
  if (!puzzle.isDoubleShift) return false;
  for (const step of puzzle.solution) {
    for (const removal of step.removalPositions ?? []) {
      if (BLOCKED_WORD_SET.has(step.sourceWord.slice(0, removal) + step.sourceWord.slice(removal + 1))) return true;
    }
    for (const letter of step.lettersToMove ?? []) {
      for (let insertion = 0; insertion <= step.targetWord.length; insertion++) {
        if (BLOCKED_WORD_SET.has(step.targetWord.slice(0, insertion) + letter + step.targetWord.slice(insertion))) return true;
      }
    }
  }
  return false;
}
