import type { PuzzleConfig, PuzzleSolutionStep } from '../types';
import { extendStandardPuzzle } from '../services/puzzleExtension';
import { isStandardChainSolvable } from '../services/puzzleSolvability';
import { COMMON_WORDS } from '../constants/wordLists';
import { PUZZLE_BANK_EASY } from '../data/puzzleBankEasy';
import { PUZZLE_BANK_MEDIUM } from '../data/puzzleBankMedium';
import { PUZZLE_BANK_MEDIUM_PLUS } from '../data/puzzleBankMediumPlus';
import { PUZZLE_BANK_HARD } from '../data/puzzleBankHard';
import type { PreGeneratedPuzzle } from '../data/puzzleBankTypes';

const basePuzzle = (): PuzzleConfig => ({
  words: ['PLAY', 'PANT'],
  hint: "Start by shifting 'L'",
  wordLength: 4,
  solution: [{
    stepIndex: 0,
    sourceWord: 'PLAY',
    targetWord: 'PANT',
    letterToMove: 'L',
    explanation: "Move 'L' from PLAY to form PLANT.",
    removalPosition: 1,
    insertionPosition: 1,
  }],
});

function canonicalPathIsValid(
  config: PuzzleConfig,
  isValidWord: (word: string) => boolean,
): boolean {
  const rows = config.words.map(word => word.split(''));
  const lockedPositions = config.words.map(() => new Set<number>());

  for (const [activeRow, step] of (config.solution ?? []).entries()) {
    const removeAt = step.removalPosition;
    const insertAt = step.insertionPosition;
    if (removeAt === undefined || insertAt === undefined) return false;
    if (step.stepIndex !== activeRow) return false;
    if (rows[activeRow].join('') !== step.sourceWord) return false;
    if (rows[activeRow + 1].join('') !== step.targetWord) return false;
    if (lockedPositions[activeRow].has(removeAt)) return false;
    if (rows[activeRow][removeAt] !== step.letterToMove) return false;

    const [letter] = rows[activeRow].splice(removeAt, 1);
    rows[activeRow + 1].splice(insertAt, 0, letter);
    lockedPositions[activeRow + 1] = new Set([insertAt]);
    if (!isValidWord(rows[activeRow].join(''))) return false;
    if (!isValidWord(rows[activeRow + 1].join(''))) return false;
  }

  return true;
}

describe('extendStandardPuzzle', () => {
  it('appends a canonical row without removing the final source locked letter', () => {
    const validWords = new Set([
      'PAY', 'PLANT',
      'PANT', 'PACE', 'PLACE',
      'PLAN', 'HEAR', 'HEART',
    ]);

    const result = extendStandardPuzzle(basePuzzle(), {
      candidateWords: ['PACE', 'HEAR'],
      isValidWord: word => validWords.has(word),
    });

    expect(result.words).toEqual(['PLAY', 'PANT', 'HEAR']);
    expect(result.solution).toHaveLength(2);
    expect(result.solution![1]).toEqual<PuzzleSolutionStep>({
      stepIndex: 1,
      sourceWord: 'PLANT',
      targetWord: 'HEAR',
      letterToMove: 'T',
      explanation: "Move 'T' from PLANT to form HEART.",
      removalPosition: 4,
      insertionPosition: 4,
    });
    expect(basePuzzle().words).toEqual(['PLAY', 'PANT']);
  });

  it('produces solvable words and executable hint indices', () => {
    const validWords = new Set([
      'PAY', 'PLANT',
      'PANT', 'PACE', 'PLACE',
      'PLAN', 'HEAR', 'HEART',
    ]);
    const isValidWord = (word: string): boolean => validWords.has(word);

    const result = extendStandardPuzzle(basePuzzle(), {
      candidateWords: ['PACE', 'HEAR'],
      isValidWord,
    });

    expect(canonicalPathIsValid(result, isValidWord)).toBe(true);
    expect(isStandardChainSolvable(result.words, isValidWord)).toBe('solvable');
  });

  it('returns the original puzzle when no valid fresh extension exists', () => {
    const puzzle = basePuzzle();
    const validWords = new Set(['PAY', 'PLANT', 'PLAN', 'HEAR', 'HEART']);

    const result = extendStandardPuzzle(puzzle, {
      candidateWords: ['HEAR'],
      isValidWord: word => validWords.has(word),
      excludedWords: new Set(['HEAR', 'HEART']),
    });

    expect(result).toBe(puzzle);
  });

  it('extends real bank data with a fresh, solvable canonical hint path', () => {
    let extended: PuzzleConfig | undefined;
    let originalWords: ReadonlySet<string> | undefined;

    for (const puzzle of PUZZLE_BANK_EASY.slice(0, 30)) {
      const config: PuzzleConfig = {
        words: puzzle.words,
        solution: puzzle.solution,
        wordLength: puzzle.wordLength,
      };
      const candidate = extendStandardPuzzle(config, {
        excludedWords: new Set(puzzle.allWords),
      });
      if (candidate.words.length === config.words.length + 1) {
        extended = candidate;
        originalWords = new Set(puzzle.allWords);
        break;
      }
    }

    expect(extended).toBeDefined();
    expect(canonicalPathIsValid(
      extended!,
      word => COMMON_WORDS.has(word),
    )).toBe(true);
    expect(isStandardChainSolvable(
      extended!.words,
      word => COMMON_WORDS.has(word),
    )).toBe('solvable');
    expect(originalWords!.has(extended!.words.at(-1)!)).toBe(false);
    expect(extended!.solution!.map(step => step.stepIndex)).toEqual(
      extended!.solution!.map((_, index) => index),
    );
  });

  it.each([
    ['EASY', PUZZLE_BANK_EASY, 190],
    ['MEDIUM', PUZZLE_BANK_MEDIUM, 140],
    ['MEDIUM_PLUS', PUZZLE_BANK_MEDIUM_PLUS, 165],
    ['HARD', PUZZLE_BANK_HARD, 160],
  ] as const)(
    '%s bank keeps a large deterministic pool with a valid fallback candidate',
    (_name, bank, floor) => {
      const extendable = bank.flatMap((puzzle: PreGeneratedPuzzle) => {
        const config: PuzzleConfig = {
          words: puzzle.words,
          solution: puzzle.solution,
          wordLength: puzzle.wordLength,
        };
        const first = extendStandardPuzzle(config, {
          excludedWords: new Set(puzzle.allWords),
        });
        const second = extendStandardPuzzle(config, {
          excludedWords: new Set(puzzle.allWords),
        });
        expect(second).toEqual(first);
        return first.words.length === puzzle.words.length + 1 ? [first] : [];
      });

      expect(extendable.length).toBeGreaterThanOrEqual(floor);
      expect(canonicalPathIsValid(
        extendable[0],
        word => COMMON_WORDS.has(word),
      )).toBe(true);
      expect(isStandardChainSolvable(
        extendable[0].words,
        word => COMMON_WORDS.has(word),
      )).toBe('solvable');
    },
  );
});
