import type { PreGeneratedPuzzle } from '../src/data/puzzleBankTypes';
import type { PuzzleSolutionStep } from '../src/types';

/** A proved candidate, not an accepted bank record. The caller must recompute
 * metadata and apply its existing rarity, vocabulary, cap and diversity gates. */
export interface ReverseMutationCandidate {
  words: string[];
  wordLength: number;
  solution: PuzzleSolutionStep[];
  reverseSolution: PuzzleSolutionStep[];
  allWords: string[];
}

interface Cell { char: string; locked: boolean }
const isPosition = (position: number | undefined, upperExclusive: number): position is number =>
  position !== undefined && Number.isInteger(position) && position >= 0 && position < upperExclusive;
const spell = (row: readonly Cell[]): string => row.map(cell => cell.char).join('');

/** Replace one row and replay both authored legs exactly. No solver guesses a
 * different position, and no copied hint/source/word metadata survives replay.
 * isAllowedWord includes the caller's current vocabulary and usage-cap policy. */
export function mutateReverseRow(
  seed: PreGeneratedPuzzle,
  rowIndex: number,
  replacement: string,
  isAllowedWord: (word: string) => boolean,
): ReverseMutationCandidate | null {
  const rowCount = seed.words.length;
  const stepCount = rowCount - 1;
  if (rowCount < 2 || seed.isDoubleShift || !Number.isInteger(seed.wordLength) || seed.wordLength < 2 ||
      !isPosition(rowIndex, rowCount) || replacement === seed.words[rowIndex] ||
      !/^[A-Z]+$/.test(replacement) || replacement.length !== seed.wordLength ||
      seed.solution.length !== stepCount || seed.reverseSolution?.length !== stepCount) return null;
  const words = [...seed.words];
  words[rowIndex] = replacement;
  if (new Set(words).size !== rowCount || words.some(word => !/^[A-Z]+$/.test(word) || word.length !== seed.wordLength || !isAllowedWord(word))) return null;

  const rows: Cell[][] = words.map(word => [...word].map(char => ({ char, locked: false })));
  const allWords = new Set(words);
  // Preserve the forward walk's existing no-reuse rule, including transient
  // remainders. The return naturally revisits words and has its own lock proof.
  const forwardWords = new Set([words[0]]);
  const rebuilt: PuzzleSolutionStep[][] = [[], []];
  for (const [leg, steps] of [seed.solution, seed.reverseSolution].entries()) {
    for (const [index, step] of steps.entries()) {
      if (step.stepIndex !== index || step.lettersToMove || step.insertionPositions || step.removalPositions ||
          !/^[A-Z]$/.test(step.letterToMove)) return null;
      const sourceIndex = leg === 0 ? index : rowCount - 1 - index;
      const targetIndex = sourceIndex + (leg === 0 ? 1 : -1);
      const source = rows[sourceIndex];
      const target = rows[targetIndex];
      const removeAt = step.removalPosition;
      const insertAt = step.insertionPosition;
      if (!isPosition(removeAt, source.length) || !isPosition(insertAt, target.length + 1) ||
          source[removeAt].locked || source[removeAt].char !== step.letterToMove) return null;

      const sourceWord = spell(source);
      const targetWord = spell(target);
      const remainder = source.filter((_, position) => position !== removeAt);
      const received = [...target.slice(0, insertAt), { char: step.letterToMove, locked: true }, ...target.slice(insertAt)];
      const remainderWord = spell(remainder);
      const formedWord = spell(received);
      if (!isAllowedWord(remainderWord) || !isAllowedWord(formedWord)) return null;
      if (leg === 0) {
        if (forwardWords.has(remainderWord) || forwardWords.has(targetWord) || forwardWords.has(formedWord)) return null;
        forwardWords.add(remainderWord); forwardWords.add(targetWord); forwardWords.add(formedWord);
      }

      // Locks travel with their cells when another position is removed or
      // inserted. Existing forward locks therefore survive the whole return.
      rows[sourceIndex] = remainder;
      rows[targetIndex] = received;
      allWords.add(sourceWord); allWords.add(targetWord);
      allWords.add(remainderWord); allWords.add(formedWord);
      rebuilt[leg].push({
        stepIndex: index, sourceWord, targetWord, letterToMove: step.letterToMove,
        removalPosition: removeAt, insertionPosition: insertAt,
        explanation: `Move '${step.letterToMove}' from ${sourceWord} to form ${formedWord}.`,
      });
    }
  }
  return { words, wordLength: seed.wordLength, solution: rebuilt[0], reverseSolution: rebuilt[1], allWords: [...allWords] };
}

/** Original-row letter constrained by the first time this row gives a letter. */
function rowAnchor(seed: PreGeneratedPuzzle, rowIndex: number): { position: number; letter: string } | null {
  const lastRow = seed.words.length - 1;
  const giving = rowIndex < lastRow ? seed.solution[rowIndex] : seed.reverseSolution?.[0];
  const removal = giving?.removalPosition;
  if (!giving || !/^[A-Z]$/.test(giving.letterToMove) || !isPosition(removal, seed.wordLength + (rowIndex === 0 ? 0 : 1))) return null;
  if (rowIndex === 0) return { position: removal, letter: giving.letterToMove };
  const receivedAt = seed.solution[rowIndex - 1]?.insertionPosition;
  if (!isPosition(receivedAt, seed.wordLength + 1) || removal === receivedAt) return null;
  return { position: removal > receivedAt ? removal - 1 : removal, letter: giving.letterToMove };
}

/** Bounded, deterministic search. Exhaust first-row substitutions before the
 * other rows, indexing replacements by length and required transfer letter.
 * The live predicate is consulted during replay, so accepting an earlier
 * candidate can immediately make a newly saturated word unavailable. */
export function* createReverseTopUpCandidates(
  seeds: readonly PreGeneratedPuzzle[],
  candidateWords: Iterable<string>,
  isAllowedWord: (word: string) => boolean,
  options: { maxAttempts?: number; firstRowOnly?: boolean } = {},
): IterableIterator<ReverseMutationCandidate> {
  const maxAttempts = options.maxAttempts ?? 50_000;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 0) throw new Error('Invalid reverse mutation attempt budget');
  const sources = [...seeds];
  const seen = new Set(sources.map(seed => seed.words.join('-')));
  const byAnchor = new Map<string, string[]>();
  for (const word of new Set(candidateWords)) {
    if (!/^[A-Z]+$/.test(word)) continue;
    for (let position = 0; position < word.length; position++) {
      const key = `${word.length}:${position}:${word[position]}`;
      const bucket = byAnchor.get(key);
      if (bucket) bucket.push(word);
      else byAnchor.set(key, [word]);
    }
  }
  let attempts = 0;
  const maxRows = options.firstRowOnly ? 1 : Math.max(0, ...sources.map(seed => seed.words.length));
  for (let rowIndex = 0; rowIndex < maxRows; rowIndex++) {
    for (const seed of sources) {
      if (rowIndex >= seed.words.length) continue;
      const anchor = rowAnchor(seed, rowIndex);
      if (!anchor) continue;
      const replacements = byAnchor.get(`${seed.wordLength}:${anchor.position}:${anchor.letter}`) ?? [];
      for (const replacement of replacements) {
        if (replacement === seed.words[rowIndex]) continue;
        if (attempts++ >= maxAttempts) return;
        const candidate = mutateReverseRow(seed, rowIndex, replacement, isAllowedWord);
        if (!candidate) continue;
        const key = candidate.words.join('-');
        if (seen.has(key)) continue;
        seen.add(key);
        yield candidate;
      }
    }
  }
}
