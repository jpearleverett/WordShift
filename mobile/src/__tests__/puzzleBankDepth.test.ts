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

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearPlayedPuzzles();
  jest.clearAllMocks();
  jest.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('puzzle bank depth gates', () => {
  it('does not analyze branching before 40 puzzles', async () => {
    await selectPreGeneratedPuzzle('HARD', 0, new Map(), 'standard', 39);

    expect(analyzeMock).not.toHaveBeenCalled();
  });

  it('analyzes only the top 80 context candidates and reuses cached metrics', async () => {
    await selectPreGeneratedPuzzle('HARD', 0, new Map(), 'standard', 40);

    expect(analyzeMock).toHaveBeenCalledTimes(80);

    analyzeMock.mockClear();
    await clearPlayedPuzzles();
    await selectPreGeneratedPuzzle('HARD', 0, new Map(), 'standard', 40);

    expect(analyzeMock).not.toHaveBeenCalled();
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
    expect(analyzeMock).toHaveBeenCalledTimes(80);
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
