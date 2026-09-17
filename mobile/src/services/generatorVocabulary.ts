import { DICTIONARY_WORDS } from '../dictionary';
import { isFairPuzzleWord } from './puzzleVocabulary';

function buildWordSets(advanced: boolean): Record<number, Set<string>> {
  const sets: Record<number, Set<string>> = {};
  for (let length = 3; length <= 7; length++) sets[length] = new Set();
  for (const word of DICTIONARY_WORDS) {
    if (sets[word.length] && isFairPuzzleWord(word, advanced)) sets[word.length].add(word);
  }
  return sets;
}

let commonWordSets: Record<number, Set<string>> | undefined;
let advancedWordSets: Record<number, Set<string>> | undefined;
let advancedGeneration = false;
let generationTail: Promise<unknown> = Promise.resolve();

/** Search indexes must distinguish common and explicitly advanced vocabulary. */
export function getGenerationVocabularyKey(): 'common' | 'advanced' {
  return advancedGeneration ? 'advanced' : 'common';
}

export function getGenerationWordSets(): Record<number, Set<string>> {
  // Bank-served sessions never need these dictionaries on the first-paint path.
  if (advancedGeneration) return advancedWordSets ??= buildWordSets(true);
  return commonWordSets ??= buildWordSets(false);
}

/**
 * The generator also keeps phase/rarity scoring context across asynchronous
 * yields. Serialize whole searches so another request cannot replace any of
 * that context, then restore common search pools even when a search fails.
 */
export function withGenerationVocabulary<T>(advanced: boolean, generate: () => Promise<T>): Promise<T> {
  const task = generationTail.then(async () => {
    advancedGeneration = advanced;
    try {
      return await generate();
    } finally {
      advancedGeneration = false;
    }
  });
  generationTail = task.catch(() => undefined);
  return task;
}
