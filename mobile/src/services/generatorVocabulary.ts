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

const commonWordSets = buildWordSets(false);
const advancedWordSets = buildWordSets(true);
let advancedGeneration = false;
let generationTail: Promise<unknown> = Promise.resolve();

/** Search indexes must distinguish common and explicitly advanced vocabulary. */
export function getGenerationVocabularyKey(): 'common' | 'advanced' {
  return advancedGeneration ? 'advanced' : 'common';
}

export function getGenerationWordSets(): Record<number, Set<string>> {
  return advancedGeneration ? advancedWordSets : commonWordSets;
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
