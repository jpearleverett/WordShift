import { hasBlockedDoubleShiftIntermediate } from '../services/puzzleContentPolicy';
import type { PuzzleSolutionStep } from '../types';

const step = (overrides: Partial<PuzzleSolutionStep>): PuzzleSolutionStep => ({
  stepIndex: 0,
  sourceWord: 'CARTS',
  targetWord: 'HEART',
  letterToMove: 'CS',
  lettersToMove: ['C', 'S'],
  removalPositions: [0, 4],
  explanation: '',
  ...overrides,
});

test('rejects blocked strings exposed by either possible first Double Shift removal', () => {
  expect(hasBlockedDoubleShiftIntermediate({ isDoubleShift: true, solution: [step({
    sourceWord: 'SPENIS', removalPositions: [0, 5], lettersToMove: ['S', 'S'],
  })] })).toBe(true);
});

test('checks every first-letter drop slot even though the final paired move validates later', () => {
  expect(hasBlockedDoubleShiftIntermediate({ isDoubleShift: true, solution: [step({
    targetWord: 'HIT', lettersToMove: ['S', 'E'],
  })] })).toBe(true);
  expect(hasBlockedDoubleShiftIntermediate({ isDoubleShift: true, solution: [step({})] })).toBe(false);
  expect(hasBlockedDoubleShiftIntermediate({ isDoubleShift: false, solution: [step({ targetWord: 'HIT', lettersToMove: ['S', 'E'] })] })).toBe(false);
});
