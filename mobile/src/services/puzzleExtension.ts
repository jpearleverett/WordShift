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
      }
    }
  }

  return config;
}
