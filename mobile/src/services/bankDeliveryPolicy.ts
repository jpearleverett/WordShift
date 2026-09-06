import type { PreGeneratedPuzzle } from '../data/puzzleBankTypes';
import { isPuzzleVocabularyFair } from './puzzleVocabulary';
import { normalizeReverseBankSolution } from './puzzleSolutionReplay';

// ACME/TOES/WHAT lost its second route when WHATS left fresh validation.
// Keep historical bank/saved-board data. Revisit only after gated regeneration
// and a fresh-dictionary branching audit (2026-09-05 audit: 1,466 candidates).
const FRESH_SINGLE_ROUTE_EXCLUSIONS = new Set(['33a2d13c19a0']);

/** The shared qualification used by runtime delivery and offline audits. */
export function qualifyFreshBankPuzzle(
  puzzle: PreGeneratedPuzzle,
  advanced: boolean,
  variant: 'standard' | 'reverse' | 'double_shift',
  isValidWord: (word: string) => boolean,
): PreGeneratedPuzzle | null {
  if (FRESH_SINGLE_ROUTE_EXCLUSIONS.has(puzzle.id) || !isPuzzleVocabularyFair(puzzle, advanced)) return null;
  const delivered = variant === 'reverse' ? normalizeReverseBankSolution(puzzle, isValidWord) : puzzle;
  return delivered && isPuzzleVocabularyFair(delivered, advanced) ? delivered : null;
}
