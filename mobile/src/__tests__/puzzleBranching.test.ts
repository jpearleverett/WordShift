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
  trap?: boolean;
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
    expect(metrics.trapStepFraction).toBe(0);
    expect(metrics.deadEndStateFraction).toBe(0);
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

  it('does NOT count a duplicate-letter removal as a second route (D3 regression)', () => {
    // MOON has two O's; removing either yields the identical remaining word
    // MON, and inserting the O into CAT yields the identical COAT. That is ONE
    // choice to the player, not two. Before the dedup fix this scored
    // completePathCount 2 / singleChoiceFraction 0 (fake multi-route).
    const metrics = analyzeStandardBranching(
      ['MOON', 'CAT'],
      validator(['MON', 'COAT']),
    );

    expect(metrics.completePathCount).toBe(1);
    expect(metrics.singleChoiceFraction).toBe(1);
    expect(metrics.structuralBonus).toBe(0);
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

  it('measures trap steps and dead-end states during the same traversal', () => {
    // Root state (ABC over DEF): three LEGAL moves (forming ADEF, BDEF, or
    // CDEF), but the CDEF branch dead-ends (CDEF has no onward move into
    // GHI), so only two moves COMPLETE — the root is a trap step. Visited
    // states: root + 3 children; the CDEF child is the one dead end.
    const metrics = analyzeStandardBranching(
      ['ABC', 'DEF', 'GHI'],
      validator([
        'BC', 'ADEF',
        'AC', 'BDEF',
        'AB', 'CDEF',
        'AEF', 'DGHI',
        'BDF', 'EGHI',
      ]),
    );

    expect(metrics.completePathCount).toBe(2);
    expect(metrics.stateCount).toBe(4);
    expect(metrics.trapStepFraction).toBeCloseTo(1 / 3);
    expect(metrics.deadEndStateFraction).toBeCloseTo(1 / 4);
    expect(metrics.singleChoiceFraction).toBeCloseTo(2 / 3);
  });

  it('gives a multi-route board with traps a higher bonus than one without', () => {
    const withTrap = analyzeStandardBranching(
      ['ABC', 'DEF', 'GHI'],
      validator([
        'BC', 'ADEF',
        'AC', 'BDEF',
        'AB', 'CDEF',
        'AEF', 'DGHI',
        'BDF', 'EGHI',
      ]),
    );
    const withoutTrap = analyzeStandardBranching(
      ['ABC', 'DEF', 'GHI'],
      validator([
        'BC', 'ADEF',
        'AC', 'BDEF',
        'AEF', 'DGHI',
        'BDF', 'EGHI',
      ]),
    );

    expect(withTrap.completePathCount).toBe(2);
    expect(withoutTrap.completePathCount).toBe(2);
    expect(withTrap.trapStepFraction).toBeGreaterThan(0);
    expect(withoutTrap.trapStepFraction).toBe(0);
    // Same path/choice structure, so the delta is exactly the trap weight
    // scaled by trapStepFraction: (1/3) * 3 = +1.
    expect(withTrap.structuralBonus).toBeCloseTo(withoutTrap.structuralBonus + 1);
  });

  it('never grants a trap bonus to a single-route board', () => {
    // Root has two LEGAL moves but only the ADEF branch completes: a trap
    // with no alternate completing route. That is frustration, not depth —
    // structuralBonus must stay at the plain single-route value (0).
    const metrics = analyzeStandardBranching(
      ['ABC', 'DEF', 'GHI'],
      validator([
        'BC', 'ADEF',
        'AC', 'BDEF',
        'AEF', 'DGHI',
      ]),
    );

    expect(metrics.completePathCount).toBe(1);
    expect(metrics.trapStepFraction).toBeCloseTo(1 / 2);
    expect(metrics.deadEndStateFraction).toBeCloseTo(1 / 3);
    expect(metrics.structuralBonus).toBe(0);
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

  it('orders trap-bearing multi-route candidates first when the trap preference is supplied', () => {
    const candidates: Candidate[] = [
      { id: 'multi-plain-1', paths: 2 },
      { id: 'multi-trap-1', paths: 2, trap: true },
      { id: 'multi-plain-2', paths: 3 },
      { id: 'multi-trap-2', paths: 4, trap: true },
      { id: 'multi-plain-3', paths: 2 },
    ];

    const reordered: Candidate[] = prioritizeMultiRouteCandidates(
      candidates,
      (candidate: Candidate) => candidate.paths,
      3,
      (candidate: Candidate) => candidate.trap === true,
    );

    expect(reordered.map(candidate => candidate.id)).toEqual([
      'multi-trap-1',
      'multi-trap-2',
      'multi-plain-1',
      'multi-plain-2',
      'multi-plain-3',
    ]);
  });

  it('trap preference never promotes single-route candidates into the pool', () => {
    const candidates: Candidate[] = [
      { id: 'single-trap-1', paths: 1, trap: true },
      { id: 'multi-plain-1', paths: 2 },
      { id: 'single-trap-2', paths: 1, trap: true },
      { id: 'multi-plain-2', paths: 2 },
    ];

    const reordered: Candidate[] = prioritizeMultiRouteCandidates(
      candidates,
      (candidate: Candidate) => candidate.paths,
      3,
      (candidate: Candidate) => candidate.trap === true,
    );

    // The multi-route tier fills first (in order); the trap-bearing
    // single-route candidates only backfill the remaining slot in their
    // original relative order — traps never lift them past a multi-route.
    expect(reordered.map(candidate => candidate.id)).toEqual([
      'multi-plain-1',
      'multi-plain-2',
      'single-trap-1',
      'single-trap-2',
    ]);
  });
});
