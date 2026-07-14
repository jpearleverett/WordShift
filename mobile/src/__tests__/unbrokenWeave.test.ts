import { PuzzleSolutionStep } from '../types';
import {
  addSpentLetter,
  getUnbrokenWeaveEligibility,
  isLetterSpent,
  isUnbrokenWeaveAvailable,
  isUnbrokenWeaveEligible,
  removeSpentLetter,
} from '../services/unbrokenWeave';

function solutionStep(
  letterToMove?: string,
  lettersToMove?: [string, string],
): Partial<PuzzleSolutionStep> {
  return {
    stepIndex: 0,
    sourceWord: 'LORE',
    targetWord: 'BOCK',
    explanation: 'Move a letter.',
    ...(letterToMove === undefined ? {} : { letterToMove }),
    ...(lettersToMove === undefined ? {} : { lettersToMove }),
  };
}

describe('Unbroken Weave eligibility', () => {
  it('accepts a standard solution whose moved uppercase letters are unique', () => {
    const solution = [solutionStep('L'), solutionStep('K')];

    expect(getUnbrokenWeaveEligibility(solution)).toEqual({
      eligible: true,
      movedLetters: ['L', 'K'],
    });
    expect(isUnbrokenWeaveEligible(solution)).toBe(true);
  });

  it('rejects a solution that reuses a moved letter', () => {
    const solution = [solutionStep('L'), solutionStep('K'), solutionStep('L')];

    expect(getUnbrokenWeaveEligibility(solution)).toEqual({
      eligible: false,
      reason: 'reused_letter',
    });
    expect(isUnbrokenWeaveEligible(solution)).toBe(false);
  });

  it.each([
    ['lowercase letter', [solutionStep('l')]],
    ['multi-character letter', [solutionStep('AB')]],
    ['missing step letter', [solutionStep()]],
  ])('rejects an invalid canonical solution letter: %s', (_label, solution) => {
    expect(getUnbrokenWeaveEligibility(solution)).toEqual({
      eligible: false,
      reason: 'invalid_letter',
    });
  });

  it.each([undefined, null, []])('rejects a missing canonical solution: %p', (solution) => {
    expect(getUnbrokenWeaveEligibility(solution)).toEqual({
      eligible: false,
      reason: 'missing_solution',
    });
  });

  it('rejects a double-letter solution step', () => {
    const solution = [solutionStep('A', ['A', 'B'])];

    expect(getUnbrokenWeaveEligibility(solution)).toEqual({
      eligible: false,
      reason: 'double_letter_step',
    });
  });
});

describe('Unbroken Weave spent letters', () => {
  it('adds a normalized letter without mutating the prior set', () => {
    const prior = new Set(['A']);

    const next = addSpentLetter(prior, 'b');

    expect([...prior]).toEqual(['A']);
    expect([...next]).toEqual(['A', 'B']);
    expect(next).not.toBe(prior);
    expect(isLetterSpent(next, 'b')).toBe(true);
  });

  it('removes a normalized letter without mutating the prior set', () => {
    const prior = new Set(['A', 'B']);

    const next = removeSpentLetter(prior, 'a');

    expect([...prior]).toEqual(['A', 'B']);
    expect([...next]).toEqual(['B']);
    expect(next).not.toBe(prior);
    expect(isLetterSpent(next, 'A')).toBe(false);
  });
});

describe('Unbroken Weave availability', () => {
  it('is available only after the Phase 5 post-revelation gate', () => {
    expect(isUnbrokenWeaveAvailable(4, false)).toBe(false);
    expect(isUnbrokenWeaveAvailable(5, false)).toBe(false);
    expect(isUnbrokenWeaveAvailable(4, true)).toBe(false);
    expect(isUnbrokenWeaveAvailable(5, true)).toBe(true);
    expect(isUnbrokenWeaveAvailable(6, true)).toBe(false);
  });
});
