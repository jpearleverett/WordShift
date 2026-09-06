import { AUDITED_PUZZLE_WORDS, ADVANCED_PUZZLE_WORDS, OBSCURE_PUZZLE_WORDS, UNREVIEWED_PUZZLE_WORDS } from '../data/vocabulary/puzzleVocabulary';
import { DICTIONARY_WORDS } from '../dictionary';
const DICTIONARY = new Set(DICTIONARY_WORDS);
import type { PuzzleSolutionStep } from '../types';

/** Familiarity is separate from validity. Rare valid player discoveries still count. */
export function isFairPuzzleWord(word: string, advanced = false): boolean {
  const upper = word.toUpperCase();
  return DICTIONARY.has(upper) && AUDITED_PUZZLE_WORDS.has(upper)
    && !UNREVIEWED_PUZZLE_WORDS.has(upper)
    && !OBSCURE_PUZZLE_WORDS.has(upper)
    && (advanced || !ADVANCED_PUZZLE_WORDS.has(upper));
}

interface VocabularyPuzzle {
  words: string[];
  solution?: PuzzleSolutionStep[];
  reverseSolution?: PuzzleSolutionStep[];
  allWords?: string[];
}

/** Include source remainders: allWords alone omits them in several bank families. */
export function getRequiredPuzzleWords(puzzle: VocabularyPuzzle): string[] {
  const words = new Set([...puzzle.words, ...(puzzle.allWords ?? [])]);
  for (const [leg, steps] of [puzzle.solution ?? [], puzzle.reverseSolution ?? []].entries()) {
    let previousFormed: string | undefined;
    for (const [index, step] of steps.entries()) {
      // Early authored lessons name the ORIGINAL source in their hint data;
      // after the first move the real source is the preceding formed word.
      const source = leg === 0 && index > 0 && step.sourceWord === puzzle.words[index]
        ? previousFormed ?? step.sourceWord : step.sourceWord;
      words.add(source);
      words.add(step.targetWord);
      const removals = step.removalPositions ?? [step.removalPosition ?? source.indexOf(step.letterToMove)];
      words.add(source.split('').filter((_, position) => !removals.includes(position)).join(''));
      const namedResult = /to form ([A-Z]+)\./.exec(step.explanation)?.[1];
      const formed = !step.lettersToMove && step.insertionPosition != null
        ? step.targetWord.slice(0, step.insertionPosition) + step.letterToMove + step.targetWord.slice(step.insertionPosition)
        : namedResult;
      // Double Shift only validates after BOTH drops; don't demand that its
      // temporary half-move strings be words.
      words.add(formed ?? '');
      previousFormed = formed;
    }
  }
  return [...words];
}

export function isPuzzleVocabularyFair(puzzle: VocabularyPuzzle, advanced = false): boolean {
  return getRequiredPuzzleWords(puzzle).every(word => isFairPuzzleWord(word, advanced));
}
