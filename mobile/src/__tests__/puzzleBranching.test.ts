import { analyzeStandardBranching } from '../services/puzzleBranching';

const validator = (validWords: string[]) => {
  const words = new Set(validWords);
  return (word: string): boolean => words.has(word);
};

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
