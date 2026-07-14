import {
  COMMON_WORDS,
  CURATED_FINAL_PUZZLE,
  CuratedFinalPuzzle,
  PositionedPuzzleSolutionStep,
} from '../constants/wordLists';
import { PuzzleConfig } from '../types';
import {
  DREAD_WORD_TIER,
  generateLocalPuzzle,
} from './localGenerator';
import { isChainSolvable } from './puzzleSolvability';

const FINAL_BOARD_ROWS = 7;
const FINAL_BOARD_WORD_LENGTH = 5;

export const FINAL_BOARD_GENERATION_TIMEOUT_MS = 3_000;

export interface FinalBoardPuzzle extends PuzzleConfig {
  words: string[];
  solution: PositionedPuzzleSolutionStep[];
  wordLength: 5;
}

function getPersonalizedStartWord(ritualWords: string[]): string | null {
  let strongest: { word: string; tier: number } | null = null;

  for (const ritualWord of ritualWords) {
    const word = ritualWord.toUpperCase();
    if (
      word.length !== FINAL_BOARD_WORD_LENGTH ||
      !COMMON_WORDS.has(word)
    ) {
      continue;
    }

    const tier = DREAD_WORD_TIER.get(word);
    if (tier != null && (!strongest || tier > strongest.tier)) {
      strongest = { word, tier };
    }
  }

  return strongest?.word ?? null;
}

function hasCompletePositionedSolution(
  solution: PuzzleConfig['solution'],
): solution is PositionedPuzzleSolutionStep[] {
  return solution?.length === FINAL_BOARD_ROWS - 1 && solution.every((step, index) =>
    step.stepIndex === index &&
    Number.isInteger(step.removalPosition) &&
    Number.isInteger(step.insertionPosition)
  );
}

function isValidFinalBoard(puzzle: PuzzleConfig): puzzle is FinalBoardPuzzle {
  return (
    puzzle.wordLength === FINAL_BOARD_WORD_LENGTH &&
    puzzle.words.length === FINAL_BOARD_ROWS &&
    puzzle.words.every(word => word.length === FINAL_BOARD_WORD_LENGTH) &&
    hasCompletePositionedSolution(puzzle.solution) &&
    isChainSolvable(
      'standard',
      puzzle.words,
      word => COMMON_WORDS.has(word.toUpperCase()),
    ) === 'solvable'
  );
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Final board generation timed out')),
      FINAL_BOARD_GENERATION_TIMEOUT_MS,
    );

    promise.then(
      value => {
        clearTimeout(timeout);
        resolve(value);
      },
      error => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export async function buildFinalBoard(
  ritualWords: string[],
): Promise<FinalBoardPuzzle | CuratedFinalPuzzle> {
  const startWord = getPersonalizedStartWord(ritualWords);
  if (!startWord) return CURATED_FINAL_PUZZLE;

  try {
    const generated = await withTimeout(generateLocalPuzzle('HARD', {
      wordLength: FINAL_BOARD_WORD_LENGTH,
      targetRows: FINAL_BOARD_ROWS,
      startWord,
    }));
    return isValidFinalBoard(generated) ? generated : CURATED_FINAL_PUZZLE;
  } catch {
    return CURATED_FINAL_PUZZLE;
  }
}
