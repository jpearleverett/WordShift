import { createMockAsyncStorage } from './helpers/mockAsyncStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  createMockAsyncStorage()
);

import { analyzeStandardBranching } from '../services/puzzleBranching';
import { prioritizeMultiRouteCandidates } from '../services/puzzleBank';

const validator = (validWords: string[]) => {
  const words = new Set(validWords);
  return (word: string): boolean => words.has(word);
};

interface Candidate {
  id: string | number;
  paths: number;
}

describe('analyzeStandardBranching', () => {
  it('reports a forced standard puzzle as one complete path and all single-choice states', () => {
    const metrics = analyzeStandardBranching(
      ['PLAY', 'PANT'],
      validator(['PAY', 'PLANT']),
    );

    expect(metrics.completePathCount).toBe(1);
    expect(metrics.stateCount).toBe(1);
    expect(metrics.singleChoiceFraction).toBe(1);
    expect(metrics.structuralBonus).toBe(0);
  });

  it('counts complete alternatives and rewards real branching', () => {
    const metrics = analyzeStandardBranching(
      ['PLAY', 'PANT'],
      validator(['PAY', 'PLANT', 'PLA', 'PANTY']),
    );

    expect(metrics.completePathCount).toBe(2);
    expect(metrics.stateCount).toBe(1);
    expect(metrics.singleChoiceFraction).toBe(0);
    expect(metrics.structuralBonus).toBeGreaterThan(0);
  });

  it('measures single-choice decisions across distinct reachable states', () => {
    const metrics = analyzeStandardBranching(
      ['ABC', 'DEF', 'GHI'],
      validator([
        'BC', 'ADEF',
        'AC', 'BDEF',
        'AEF', 'DGHI',
        'BDF', 'EGHI',
      ]),
    );

    expect(metrics.completePathCount).toBe(2);
    expect(metrics.stateCount).toBe(3);
    expect(metrics.singleChoiceFraction).toBeCloseTo(2 / 3);
  });

  it('caps both path counting and explored states', () => {
    const pathCapped = analyzeStandardBranching(
      ['PLAY', 'PANT'],
      validator(['PAY', 'PLANT', 'PLA', 'PANTY']),
      { pathCap: 1 },
    );
    const stateCapped = analyzeStandardBranching(
      ['ABC', 'DEF', 'GHI'],
      validator([
        'BC', 'ADEF',
        'AC', 'BDEF',
        'AEF', 'DGHI',
        'BDF', 'EGHI',
      ]),
      { stateCap: 2 },
    );

    expect(pathCapped.completePathCount).toBe(1);
    expect(stateCapped.stateCount).toBe(2);
  });
});

describe('prioritizeMultiRouteCandidates', () => {
  it('fills the preferred pool with multi-route candidates when enough exist', () => {
    const candidates: Candidate[] = Array.from({ length: 15 }, (_, index) => ({
      id: index,
      paths: index % 5 === 0 ? 1 : 2,
    }));

    const reordered: Candidate[] = prioritizeMultiRouteCandidates(
      candidates,
      (candidate: Candidate) => candidate.paths,
      10,
    );

    expect(reordered.slice(0, 10).every(candidate => candidate.paths >= 2)).toBe(true);
    expect(reordered.slice(0, 10).map(candidate => candidate.id)).toEqual([
      1, 2, 3, 4, 6, 7, 8, 9, 11, 12,
    ]);
    expect(reordered).toHaveLength(candidates.length);
  });

  it('fills a short multi-route pool with fallbacks and retains every candidate', () => {
    const candidates: Candidate[] = [
      { id: 'fallback-1', paths: 1 },
      { id: 'multi-1', paths: 3 },
      { id: 'fallback-2', paths: 1 },
      { id: 'fallback-3', paths: 1 },
      { id: 'multi-2', paths: 2 },
      { id: 'fallback-4', paths: 1 },
      { id: 'fallback-5', paths: 1 },
      { id: 'fallback-6', paths: 1 },
      { id: 'multi-3', paths: 4 },
      { id: 'fallback-7', paths: 1 },
      { id: 'fallback-8', paths: 1 },
      { id: 'fallback-9', paths: 1 },
    ];

    const reordered: Candidate[] = prioritizeMultiRouteCandidates(
      candidates,
      (candidate: Candidate) => candidate.paths,
      10,
    );

    expect(reordered.map(candidate => candidate.id)).toEqual([
      'multi-1',
      'multi-2',
      'multi-3',
      'fallback-1',
      'fallback-2',
      'fallback-3',
      'fallback-4',
      'fallback-5',
      'fallback-6',
      'fallback-7',
      'fallback-8',
      'fallback-9',
    ]);
  });
});
