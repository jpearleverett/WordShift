import type { PuzzleConfig, PuzzleSolutionStep } from '../types';
import {
  COMMON_WORDS,
  WORDS_3,
  WORDS_4,
  WORDS_5,
  WORDS_6,
  WORDS_7,
} from '../constants/wordLists';

export const PUZZLE_EXTENSION_UNLOCK_PUZZLES = 70;

export interface PuzzleExtensionOptions {
  candidateWords?: readonly string[];
  isValidWord?: (word: string) => boolean;
  excludedWords?: ReadonlySet<string>;
}

const WORDS_BY_LENGTH: Readonly<Record<number, readonly string[]>> = {
  3: WORDS_3,
  4: WORDS_4,
  5: WORDS_5,
  6: WORDS_6,
  7: WORDS_7,
};

function insertLetter(word: string, letter: string, position: number): string {
  return word.slice(0, position) + letter + word.slice(position);
}

// Bound on how many VALID append candidates get the final-step depth check
// before the search settles for the first valid append. Keeps the extension
// scan the same order of synchronous dictionary work as before.
const MAX_PREFERRED_APPEND_ATTEMPTS = 40;

/**
 * Counts the distinct valid words the FINAL step could form when the given
 * target row is appended: every unlocked letter of the final source whose
 * removal leaves a valid word, inserted at every position of the target.
 * Stops as soon as two distinct outcomes are found (all we need to know is
 * whether the last step is forced). Sync dictionary lookups only.
 */
function countFinalStepOutcomes(
  finalSource: string,
  lockedPosition: number,
  targetWord: string,
  isValidWord: (word: string) => boolean,
): number {
  const outcomes = new Set<string>();
  for (let removeAt = 0; removeAt < finalSource.length; removeAt++) {
    if (removeAt === lockedPosition) continue;
    const remainder = finalSource.slice(0, removeAt) + finalSource.slice(removeAt + 1);
    if (!isValidWord(remainder)) continue;
    const letter = finalSource[removeAt];
    for (let insertAt = 0; insertAt <= targetWord.length; insertAt++) {
      const formed = insertLetter(targetWord, letter, insertAt);
      if (isValidWord(formed)) {
        outcomes.add(formed);
        if (outcomes.size >= 2) return outcomes.size;
      }
    }
  }
  return outcomes.size;
}

function collectExistingWords(config: PuzzleConfig): Set<string> {
  const existing = new Set(config.words.map(word => word.toUpperCase()));
  for (const step of config.solution ?? []) {
    existing.add(step.sourceWord.toUpperCase());
    existing.add(step.targetWord.toUpperCase());
  }
  return existing;
}

/**
 * Appends one canonical standard-rule move using only synchronous dictionary
 * lookups. Returns the original config when its stored solution cannot safely
 * be extended.
 */
export function extendStandardPuzzle(
  config: PuzzleConfig,
  options: PuzzleExtensionOptions = {},
): PuzzleConfig {
  const solution = config.solution;
  if (
    config.isDoubleShift
    || config.reverseSolution
    || !solution
    || solution.length !== config.words.length - 1
    || solution.length === 0
  ) {
    return config;
  }

  const finalStep = solution[solution.length - 1];
  const lockedPosition = finalStep.insertionPosition;
  if (
    lockedPosition === undefined
    || lockedPosition < 0
    || lockedPosition > finalStep.targetWord.length
    || finalStep.letterToMove.length !== 1
  ) {
    return config;
  }

  const finalSource = insertLetter(
    finalStep.targetWord.toUpperCase(),
    finalStep.letterToMove.toUpperCase(),
    lockedPosition,
  );
  const wordLength = config.wordLength ?? config.words[0]?.length;
  const candidates = options.candidateWords ?? WORDS_BY_LENGTH[wordLength];
  if (!candidates) return config;

  const isValidWord = options.isValidWord
    ?? ((word: string): boolean => COMMON_WORDS.has(word.toUpperCase()));
  const excluded = collectExistingWords(config);
  for (const word of options.excludedWords ?? []) {
    excluded.add(word.toUpperCase());
  }

  // Enumerate valid append moves (bounded) and prefer one where the FINAL
  // step is not forced: 2+ distinct valid outcome words means the appended
  // row keeps a real choice alive instead of ending every extended board on
  // a single-move rail. Falls back to the first valid append when no
  // non-forced one is found within the attempt budget, preserving the
  // original guarantee (a validated real move, solvable by construction).
  let fallback: PuzzleConfig | null = null;
  let validAppendsExamined = 0;

  const buildExtension = (
    letter: string,
    removeAt: number,
    targetWord: string,
    insertAt: number,
    formedTarget: string,
  ): PuzzleConfig => {
    const extensionStep: PuzzleSolutionStep = {
      stepIndex: solution.length,
      sourceWord: finalSource,
      targetWord,
      letterToMove: letter,
      explanation: `Move '${letter}' from ${finalSource} to form ${formedTarget}.`,
      insertionPosition: insertAt,
      removalPosition: removeAt,
    };
    return {
      ...config,
      words: [...config.words, targetWord],
      solution: [...solution, extensionStep],
    };
  };

  for (let removeAt = 0; removeAt < finalSource.length; removeAt++) {
    if (removeAt === lockedPosition) continue;
    const letter = finalSource[removeAt];
    const remainder = finalSource.slice(0, removeAt) + finalSource.slice(removeAt + 1);
    if (!isValidWord(remainder)) continue;

    for (const rawCandidate of candidates) {
      const targetWord = rawCandidate.toUpperCase();
      if (
        targetWord.length !== wordLength
        || targetWord === remainder
        || excluded.has(targetWord)
        || !isValidWord(targetWord)
      ) {
        continue;
      }

      for (let insertAt = 0; insertAt <= targetWord.length; insertAt++) {
        const formedTarget = insertLetter(targetWord, letter, insertAt);
        if (excluded.has(formedTarget) || !isValidWord(formedTarget)) continue;

        validAppendsExamined++;
        if (
          countFinalStepOutcomes(finalSource, lockedPosition, targetWord, isValidWord) >= 2
        ) {
          return buildExtension(letter, removeAt, targetWord, insertAt, formedTarget);
        }

        if (!fallback) {
          fallback = buildExtension(letter, removeAt, targetWord, insertAt, formedTarget);
        }
        if (validAppendsExamined >= MAX_PREFERRED_APPEND_ATTEMPTS) {
          return fallback;
        }
        // A forced append never improves for a different insertAt of the SAME
        // target (the outcome count depends only on the target word), so move
        // on to the next candidate word.
        break;
      }
    }
  }

  return fallback ?? config;
}
