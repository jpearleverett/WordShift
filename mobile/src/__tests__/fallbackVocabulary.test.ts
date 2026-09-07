import { COMMON_WORDS, FALLBACK_PUZZLES_EASY, FALLBACK_PUZZLES_MEDIUM, FALLBACK_PUZZLES_MEDIUM_PLUS, FALLBACK_PUZZLES_HARD, getRandomFallback } from '../constants/wordLists';
import { isFairPuzzleWord } from '../services/puzzleVocabulary';
import { isStandardChainSolvable } from '../services/puzzleSolvability';
import type { Difficulty } from '../types';

const fair = (word: string) => COMMON_WORDS.has(word) && isFairPuzzleWord(word);
const pools = [FALLBACK_PUZZLES_EASY, FALLBACK_PUZZLES_MEDIUM, FALLBACK_PUZZLES_MEDIUM_PLUS, FALLBACK_PUZZLES_HARD];

test('every emergency board has a route of reviewed words under fresh game rules', () => {
  for (const pool of pools) for (const words of pool) {
    expect(words.every(fair)).toBe(true);
    expect(isStandardChainSolvable(words, fair)).toBe('solvable');
  }
});

test.each<Difficulty>(['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD', 'EXPERT'])(
  '%s fallback draws stay fair at both ends of the random range', difficulty => {
    const random = jest.spyOn(Math, 'random');
    try {
      for (const value of [0, 0.999999]) {
        random.mockReturnValue(value);
        expect(isStandardChainSolvable(getRandomFallback(difficulty), fair)).toBe('solvable');
      }
    } finally { random.mockRestore(); }
  },
);

test('a caller cannot mutate a cached fallback for the next board', () => {
  const random = jest.spyOn(Math, 'random').mockReturnValue(0);
  try {
    const board = getRandomFallback('EASY');
    board[0] = 'ZZZZ';
    expect(getRandomFallback('EASY')[0]).not.toBe('ZZZZ');
  } finally { random.mockRestore(); }
});
