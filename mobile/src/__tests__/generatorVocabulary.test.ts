import { getGenerationVocabularyKey, getGenerationWordSets, withGenerationVocabulary } from '../services/generatorVocabulary';
import { getInsertionIndex, isAuthoredReverseSolvable, isReverseSolvable, solveReverse } from '../services/localGenerator';
import { isPuzzleVocabularyFair } from '../services/puzzleVocabulary';
import type { PuzzleSolutionStep } from '../types';

describe('generation vocabulary context', () => {
  it('makes reviewed advanced words reachable only for advanced searches and partitions cached indexes', async () => {
    const common = getInsertionIndex(5);
    expect([...common.values()].flat().some(target => target.result === 'GAMERS')).toBe(false);
    await withGenerationVocabulary(true, async () => {
      expect(getGenerationWordSets()[6].has('GAMERS')).toBe(true);
      expect(getGenerationWordSets()[5].has('THATS')).toBe(false);
      const advanced = getInsertionIndex(5);
      expect(advanced).not.toBe(common);
      expect([...advanced.values()].flat().some(target => target.result === 'GAMERS')).toBe(true);
    });
    expect(getGenerationWordSets()[6].has('GAMERS')).toBe(false);
    expect(getInsertionIndex(5)).toBe(common);
  });

  it('keeps overlapping searches isolated across asynchronous yields', async () => {
    let release!: () => void;
    const hold = new Promise<void>(resolve => { release = resolve; });
    const observed: string[] = [];
    const advanced = withGenerationVocabulary(true, async () => {
      observed.push(getGenerationVocabularyKey());
      await hold;
      observed.push(getGenerationVocabularyKey());
    });
    const common = withGenerationVocabulary(false, async () => {
      observed.push(getGenerationVocabularyKey());
    });
    await Promise.resolve();
    expect(observed).toEqual(['advanced']);
    release();
    await Promise.all([advanced, common]);
    expect(observed).toEqual(['advanced', 'advanced', 'common']);
  });

  it('releases a failed advanced search and restores common defaults', async () => {
    await expect(withGenerationVocabulary(true, async () => { throw new Error('search exhausted'); })).rejects.toThrow('search exhausted');
    expect(getGenerationVocabularyKey()).toBe('common');
    await expect(withGenerationVocabulary(false, async () => getGenerationVocabularyKey())).resolves.toBe('common');
  });
});


describe('reverse search hint consistency', () => {
  const words = ['CAME', 'LAST', 'BACK'];
  const initialSolution = (): PuzzleSolutionStep[] => [
    { stepIndex: 0, sourceWord: 'CAME', targetWord: 'LAST', letterToMove: 'E', explanation: 'stale', insertionPosition: 0 },
    { stepIndex: 1, sourceWord: 'STALE', targetWord: 'BACK', letterToMove: 'L', explanation: 'stale', insertionPosition: 0 },
  ];

  it('proves only complete exact descents and retains the forward locks on return', () => {
    const solution = initialSolution();
    expect(isAuthoredReverseSolvable(words, solution)).toBe(false);
    const reverse = solveReverse(words, solution);
    expect(reverse).not.toBeNull();
    expect(isAuthoredReverseSolvable(words, solution)).toBe(true);
    expect(isAuthoredReverseSolvable(words, solution.slice(0, 1))).toBe(false);
    expect(isAuthoredReverseSolvable(words, solution.map(step => ({ ...step, removalPosition: -1 })))).toBe(false);
    expect(isAuthoredReverseSolvable(['GLOW', 'ABLE', 'EACH'], [
      { stepIndex: 0, sourceWord: 'GLOW', targetWord: 'ABLE', letterToMove: 'G', removalPosition: 0, insertionPosition: 0, explanation: '' },
      { stepIndex: 1, sourceWord: 'GABLE', targetWord: 'EACH', letterToMove: 'B', removalPosition: 2, insertionPosition: 0, explanation: '' },
    ])).toBe(false);
  });

  it('keeps capped return words out of both the search proof and generated hints', () => {
    const searchWords = {
      min: new Set(['CAM']),
      base: new Set(['CAME', 'LAST', 'BACK', 'EAST', 'LACK', 'BEAT', 'SCAM']),
      max: new Set(['LEAST', 'BLACK', 'BEAST']),
    };
    const solution = initialSolution();
    expect(solveReverse(words, solution, searchWords)).not.toBeNull();
    expect(isAuthoredReverseSolvable(words, solution, searchWords)).toBe(true);
    searchWords.base.delete('BEAT');
    expect(isAuthoredReverseSolvable(words, solution, searchWords)).toBe(false);
    expect(solveReverse(words, initialSolution(), searchWords)).toBeNull();
  });

  it('rewrites forward hints from the exact placements used by the return route', () => {
    const solution = initialSolution();
    const reverseSolution = solveReverse(words, solution);
    expect(reverseSolution).not.toBeNull();
    const rows = [...words];
    for (const step of solution) {
      const source = rows[step.stepIndex];
      const target = rows[step.stepIndex + 1];
      const formed = target.slice(0, step.insertionPosition!) + step.letterToMove + target.slice(step.insertionPosition!);
      expect(step.sourceWord).toBe(source);
      expect(step.targetWord).toBe(target);
      expect(step.explanation).toBe(`Move '${step.letterToMove}' from ${source} to form ${formed}.`);
      rows[step.stepIndex] = source.slice(0, step.removalPosition!) + source.slice(step.removalPosition! + 1);
      rows[step.stepIndex + 1] = formed;
    }
    expect(isPuzzleVocabularyFair({ words, solution, reverseSolution: reverseSolution! })).toBe(true);
  });

  it('checks a unique-letter source remainder in both reverse solvers', () => {
    const shortWords = getGenerationWordSets()[3];
    expect(shortWords.has('CAM')).toBe(true);
    shortWords.delete('CAM');
    try {
      expect(isReverseSolvable(words, initialSolution())).toBe(false);
      expect(solveReverse(words, initialSolution())).toBeNull();
    } finally {
      shortWords.add('CAM');
    }
  });
});
