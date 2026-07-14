import type { PuzzleSolutionStep } from '../types';

export type UnbrokenWeaveIneligibleReason =
  | 'missing_solution'
  | 'invalid_letter'
  | 'double_letter_step'
  | 'reused_letter';

export type UnbrokenWeaveEligibility =
  | {
      eligible: true;
      movedLetters: readonly string[];
    }
  | {
      eligible: false;
      reason: UnbrokenWeaveIneligibleReason;
    };

export type UnbrokenWeaveSolutionStep =
  | Partial<Pick<PuzzleSolutionStep, 'letterToMove' | 'lettersToMove'>>
  | null
  | undefined;

export type SpentLetters = ReadonlySet<string>;

const UPPERCASE_LETTER = /^[A-Z]$/;

/**
 * Determines whether a canonical standard solution can enforce one use of
 * each moved letter character across the whole board.
 */
export function getUnbrokenWeaveEligibility(
  solution: readonly UnbrokenWeaveSolutionStep[] | null | undefined,
): UnbrokenWeaveEligibility {
  if (!solution || solution.length === 0) {
    return { eligible: false, reason: 'missing_solution' };
  }

  const seen = new Set<string>();
  const movedLetters: string[] = [];

  for (const step of solution) {
    if (step?.lettersToMove !== undefined) {
      return { eligible: false, reason: 'double_letter_step' };
    }

    const letter = step?.letterToMove;
    if (typeof letter !== 'string' || !UPPERCASE_LETTER.test(letter)) {
      return { eligible: false, reason: 'invalid_letter' };
    }
    if (seen.has(letter)) {
      return { eligible: false, reason: 'reused_letter' };
    }

    seen.add(letter);
    movedLetters.push(letter);
  }

  return { eligible: true, movedLetters };
}

export function isUnbrokenWeaveEligible(
  solution: readonly UnbrokenWeaveSolutionStep[] | null | undefined,
): boolean {
  return getUnbrokenWeaveEligibility(solution).eligible;
}

function normalizeSpentLetter(letter: string): string | null {
  const normalized = letter.toUpperCase();
  return UPPERCASE_LETTER.test(normalized) ? normalized : null;
}

export function isLetterSpent(spentLetters: SpentLetters, letter: string): boolean {
  const normalized = normalizeSpentLetter(letter);
  return normalized !== null && spentLetters.has(normalized);
}

export function addSpentLetter(spentLetters: SpentLetters, letter: string): SpentLetters {
  const next = new Set(spentLetters);
  const normalized = normalizeSpentLetter(letter);
  if (normalized !== null) next.add(normalized);
  return next;
}

export function removeSpentLetter(spentLetters: SpentLetters, letter: string): SpentLetters {
  const next = new Set(spentLetters);
  const normalized = normalizeSpentLetter(letter);
  if (normalized !== null) next.delete(normalized);
  return next;
}

/** Phase 5 is entered only when the persisted post-revelation gate is set. */
export function isUnbrokenWeaveAvailable(
  currentPhase: number,
  postRevelation: boolean,
): boolean {
  return currentPhase === 5 && postRevelation;
}
