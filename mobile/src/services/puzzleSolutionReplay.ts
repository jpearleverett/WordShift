import type { PreGeneratedPuzzle } from '../data/puzzleBankTypes';
import type { PuzzleSolutionStep } from '../types';

interface Cell { char: string; locked: boolean }
const wordOf = (row: Cell[]): string => row.map(cell => cell.char).join('');

/**
 * Historical reverse banks sometimes name one anagram in a step but store the
 * insertion position of another. Rebuild hint metadata from a complete legal
 * replay, preserving the authored moved letters. Never modify raw bank data.
 * A failed/budget-limited proof returns null so new games skip that candidate.
 */
export function normalizeReverseBankSolution(
  puzzle: PreGeneratedPuzzle,
  isValidWord: (word: string) => boolean,
  stateCap = 4000,
): PreGeneratedPuzzle | null {
  const rowCount = puzzle.words.length;
  if (rowCount < 2 || puzzle.solution.length !== rowCount - 1 || puzzle.reverseSolution?.length !== rowCount - 1) return null;
  const original = [...puzzle.solution, ...puzzle.reverseSolution];
  if (original.some((step, index) => step.lettersToMove || step.stepIndex !== index % (rowCount - 1))) return null;
  let states = 0;
  const failed = new Set<string>();
  const order = (length: number, preferred: number | undefined): number[] => {
    const indices = Array.from({ length }, (_, index) => index);
    return preferred != null && Number.isInteger(preferred) && preferred >= 0 && preferred < length
      ? [preferred, ...indices.filter(index => index !== preferred)] : indices;
  };

  function visit(rows: Cell[][], index: number): PuzzleSolutionStep[] | null {
    if (index === original.length) return [];
    if (++states > stateCap) return null;
    const key = `${index}|${rows.map(row => row.map(cell => `${cell.char}${cell.locked ? '1' : '0'}`).join('')).join('|')}`;
    if (failed.has(key)) return null;
    const step = original[index];
    const returning = index >= rowCount - 1;
    const active = returning ? rowCount - 1 - step.stepIndex : step.stepIndex;
    const targetIndex = active + (returning ? -1 : 1);
    const source = rows[active];
    const target = rows[targetIndex];
    for (const removeAt of order(source.length, step.removalPosition)) {
      if (source[removeAt].locked || source[removeAt].char !== step.letterToMove) continue;
      const remainder = source.filter((_, position) => position !== removeAt);
      if (!isValidWord(wordOf(remainder))) continue;
      for (const insertAt of order(target.length + 1, step.insertionPosition)) {
        const cells = target.map(cell => ({ ...cell, locked: returning ? cell.locked : false }));
        const formed = [...cells.slice(0, insertAt), { char: step.letterToMove, locked: true }, ...cells.slice(insertAt)];
        const result = wordOf(formed);
        if (!isValidWord(result)) continue;
        const next = rows.slice();
        next[active] = remainder;
        next[targetIndex] = formed;
        const tail = visit(next, index + 1);
        if (tail) {
          return [{
            ...step,
            sourceWord: wordOf(source), targetWord: wordOf(target),
            removalPosition: removeAt, insertionPosition: insertAt,
            explanation: `Move '${step.letterToMove}' from ${wordOf(source)} to form ${result}.`,
          }, ...tail];
        }
      }
    }
    failed.add(key);
    return null;
  }

  const replay = visit(puzzle.words.map(word => [...word].map(char => ({ char, locked: false }))), 0);
  if (!replay) return null;
  return { ...puzzle, solution: replay.slice(0, rowCount - 1), reverseSolution: replay.slice(rowCount - 1) };
}
