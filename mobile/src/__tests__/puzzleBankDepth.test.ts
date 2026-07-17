import { createMockAsyncStorage } from './helpers/mockAsyncStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  createMockAsyncStorage()
);

jest.mock('../services/wordHistory', () => ({
  isInHardCooldown: jest.fn(() => false),
}));

jest.mock('../services/puzzleBranching', () => ({
  analyzeStandardBranching: jest.fn(() => ({
    completePathCount: 4,
    stateCount: 12,
    singleChoiceFraction: 0.25,
    structuralBonus: 7,
  })),
}));

jest.mock('../services/puzzleExtension', () => ({
  PUZZLE_EXTENSION_UNLOCK_PUZZLES: 100,
  extendStandardPuzzle: jest.fn(config => ({
    ...config,
    words: [...config.words, 'DEPTH'],
  })),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearPlayedPuzzles,
  selectPreGeneratedPuzzle,
} from '../services/puzzleBank';
import { analyzeStandardBranching } from '../services/puzzleBranching';
import { extendStandardPuzzle } from '../services/puzzleExtension';

const analyzeMock = analyzeStandardBranching as jest.MockedFunction<
  typeof analyzeStandardBranching
>;
const extendMock = extendStandardPuzzle as jest.MockedFunction<
  typeof extendStandardPuzzle
>;

const DEFAULT_BRANCHING_METRICS = {
  completePathCount: 4,
  stateCount: 12,
  singleChoiceFraction: 0.25,
  structuralBonus: 7,
};

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearPlayedPuzzles();
  jest.clearAllMocks();
  // Reset any per-test mockImplementation back to the default metrics
  // (jest.clearAllMocks clears calls, not implementations).
  analyzeMock.mockImplementation(() => ({ ...DEFAULT_BRANCHING_METRICS }));
  jest.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('puzzle bank depth gates', () => {
  it('does not analyze branching before the neutral-grading handoff (13 puzzles)', async () => {
    await selectPreGeneratedPuzzle('HARD', 0, new Map(), 'standard', 12);

    expect(analyzeMock).not.toHaveBeenCalled();
  });

  it('analyzes only the top 160 context candidates and reuses cached metrics', async () => {
    await selectPreGeneratedPuzzle('HARD', 0, new Map(), 'standard', 13);

    expect(analyzeMock).toHaveBeenCalledTimes(160);

    analyzeMock.mockClear();
    await clearPlayedPuzzles();
    await selectPreGeneratedPuzzle('HARD', 0, new Map(), 'standard', 13);

    expect(analyzeMock).not.toHaveBeenCalled();
  });

  it('front-loads multi-route boards into the draw pool from puzzle 13', async () => {
    // Mixed pool: every 4th analyzed candidate is multi-route, and the
    // multi-route ones get ZERO structural bonus while the single-route
    // majority gets a bonus at the cap. If only the score bonus applied,
    // single-route boards would top the list; a multi-route board can reach
    // the draw pool's head only through the multi-route-first reordering.
    const multiRouteChains = new Set<string>();
    let analysisIndex = 0;
    analyzeMock.mockImplementation(words => {
      analysisIndex++;
      if (analysisIndex % 4 === 0) {
        multiRouteChains.add(words.join(','));
        return {
          completePathCount: 3,
          stateCount: 12,
          singleChoiceFraction: 0.4,
          structuralBonus: 0,
        };
      }
      return {
        completePathCount: 1,
        stateCount: 10,
        singleChoiceFraction: 1,
        structuralBonus: 24,
      };
    });

    const first = await selectPreGeneratedPuzzle(
      'MEDIUM', 0, new Map(), 'standard', 13,
    );
    expect(first).not.toBeNull();
    expect(analyzeMock).toHaveBeenCalledTimes(160);
    expect(multiRouteChains.has(first!.words.join(','))).toBe(true);

    // A constant Math.random shifts every candidate's jitter equally, so
    // ordering is preserved; 0.95 draws slot 9 of the top-10 pool. That slot
    // must ALSO be multi-route: the whole pool is multi-route-first.
    (Math.random as jest.Mock).mockReturnValue(0.95);
    const second = await selectPreGeneratedPuzzle(
      'MEDIUM', 0, new Map(), 'standard', 13,
    );
    expect(second).not.toBeNull();
    expect(multiRouteChains.has(second!.words.join(','))).toBe(true);
  });

  it('extends only standard boards at 100 puzzles', async () => {
    const beforeGate = await selectPreGeneratedPuzzle(
      'EASY', 0, new Map(), 'standard', 99,
    );
    expect(beforeGate).not.toBeNull();
    expect(extendMock).not.toHaveBeenCalled();
    analyzeMock.mockClear();

    const atGate = await selectPreGeneratedPuzzle(
      'EASY', 0, new Map(), 'standard', 100,
    );
    expect(extendMock.mock.calls.length).toBeGreaterThan(100);
    expect(analyzeMock).toHaveBeenCalledTimes(160);
    expect(analyzeMock.mock.calls.every(([words]) => words.at(-1) === 'DEPTH')).toBe(true);
    expect(atGate!.words.at(-1)).toBe('DEPTH');

    const callsAfterFirstSelection = extendMock.mock.calls.length;
    await clearPlayedPuzzles();
    const cached = await selectPreGeneratedPuzzle(
      'EASY', 0, new Map(), 'standard', 100,
    );
    expect(cached!.words.at(-1)).toBe('DEPTH');
    expect(extendMock).toHaveBeenCalledTimes(callsAfterFirstSelection);

    await selectPreGeneratedPuzzle('EASY', 0, new Map(), 'reverse', 100);
    expect(extendMock).toHaveBeenCalledTimes(callsAfterFirstSelection);
  });
});
