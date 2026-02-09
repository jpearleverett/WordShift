/**
 * Tests for useGamePersistence hook.
 *
 * Since we run in a Node test environment without a React renderer,
 * we mock React hooks to work synchronously and call the hook directly.
 */

// --- Mock React hooks to run synchronously in Node ---
const stateStore: Map<number, unknown> = new Map();
let stateIndex = 0;
let effectCallbacks: Array<() => void> = [];

function resetHookState() {
  stateStore.clear();
  stateIndex = 0;
  effectCallbacks = [];
}

function rewindHookIndices() {
  stateIndex = 0;
}

jest.mock('react', () => ({
  useState: (initial: unknown) => {
    const idx = stateIndex++;
    if (!stateStore.has(idx)) {
      stateStore.set(idx, initial);
    }
    const value = stateStore.get(idx);
    const setter = (valOrFn: unknown) => {
      if (typeof valOrFn === 'function') {
        stateStore.set(idx, (valOrFn as (prev: unknown) => unknown)(stateStore.get(idx)));
      } else {
        stateStore.set(idx, valOrFn);
      }
    };
    return [value, setter];
  },
  useEffect: (fn: () => void, _deps: unknown[]) => {
    effectCallbacks.push(fn);
  },
  useCallback: (fn: Function, _deps: unknown[]) => fn,
}));

// --- Mock AsyncStorage ---
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
        return Promise.resolve();
      }),
    },
  };
});

// --- Mock starRating ---
const mockCalculateStars = jest.fn((hintsUsed: number, invalidAttempts: number) => {
  if (hintsUsed === 0 && invalidAttempts <= 2) return 3;
  if (hintsUsed <= 1 && invalidAttempts <= 4) return 2;
  return 1;
});

const mockRecordPuzzleCompletion = jest.fn(async (_d?: any, _h?: any, _i?: any) => ({
  difficulty: 'MEDIUM',
  starsEarned: 3,
  invalidAttempts: 0,
  hintsUsed: 0,
  timestamp: Date.now(),
}));

const defaultStats = {
  totalPuzzlesCompleted: 1,
  totalStars: 3,
  threeStarCount: 1,
  twoStarCount: 0,
  oneStarCount: 0,
  totalInvalidAttempts: 0,
  totalHintsUsed: 0,
  noHintPuzzleCount: 1,
  byDifficulty: {
    EASY: { completed: 0, stars: 0 },
    MEDIUM: { completed: 1, stars: 3 },
    HARD: { completed: 0, stars: 0 },
  },
  lastUpdated: Date.now(),
};

const mockGetCumulativeStats = jest.fn(async () => ({ ...defaultStats }));
const mockGetThreeStarRate = jest.fn((_stats?: any) => 100);

jest.mock('../services/starRating', () => ({
  calculateStars: (...args: any[]) => mockCalculateStars(args[0], args[1]),
  recordPuzzleCompletion: (...args: any[]) => mockRecordPuzzleCompletion(args[0], args[1], args[2]),
  getCumulativeStats: () => mockGetCumulativeStats(),
  getThreeStarRate: (...args: any[]) => mockGetThreeStarRate(args[0]),
}));

// --- Mock amberCurrency ---
const mockAwardPuzzleAmber = jest.fn(async (_d?: any, _s?: any, _m?: any, _r?: any) => ({
  amount: 15,
  baseAmount: 15,
  newBalance: 115,
  puzzlesSolved: 1,
  phaseChanged: false,
  newPhase: 0 as number,
  streakBonus: 0,
  challengeBonus: 0,
  currentStreak: 1,
  milestoneBonus: 0,
  milestoneMessage: null as string | null,
  phaseAcceleration: 1.0,
}));

const mockGetAmberBalance = jest.fn(async () => 100);
const mockGetCurrentPhase = jest.fn(async () => 0);

jest.mock('../services/amberCurrency', () => ({
  awardPuzzleAmber: (...args: any[]) => mockAwardPuzzleAmber(args[0], args[1], args[2], args[3]),
  getAmberBalance: () => mockGetAmberBalance(),
  getCurrentPhase: () => mockGetCurrentPhase(),
}));

// --- Mock dialogueSession ---
const mockUpdatePuzzleCount = jest.fn();
jest.mock('../services/dialogueSession', () => ({
  updatePuzzleCount: (...args: any[]) => mockUpdatePuzzleCount(args[0]),
}));

// --- Mock eventLogger ---
const mockLogEvent = jest.fn();
jest.mock('../services/eventLogger', () => ({
  logEvent: (...args: any[]) => mockLogEvent(args[0]),
}));

import { useGamePersistence, VictoryData, PersistenceState, PersistenceActions } from '../hooks/useGamePersistence';

function callHook(): [PersistenceState, PersistenceActions] {
  rewindHookIndices();
  return useGamePersistence();
}

describe('useGamePersistence', () => {
  beforeEach(() => {
    resetHookState();
    jest.clearAllMocks();

    // Reset mock return values to defaults
    mockCalculateStars.mockImplementation((hintsUsed: number, invalidAttempts: number) => {
      if (hintsUsed === 0 && invalidAttempts <= 2) return 3;
      if (hintsUsed <= 1 && invalidAttempts <= 4) return 2;
      return 1;
    });

    mockAwardPuzzleAmber.mockResolvedValue({
      amount: 15,
      baseAmount: 15,
      newBalance: 115,
      puzzlesSolved: 1,
      phaseChanged: false,
      newPhase: 0 as const,
      streakBonus: 0,
      challengeBonus: 0,
      currentStreak: 1,
      milestoneBonus: 0,
      milestoneMessage: null,
      phaseAcceleration: 1.0,
    });

    mockGetCumulativeStats.mockResolvedValue({ ...defaultStats });
    mockGetAmberBalance.mockResolvedValue(100);
    mockGetCurrentPhase.mockResolvedValue(0);
    mockGetThreeStarRate.mockReturnValue(100);
  });

  describe('initial state', () => {
    test('has correct defaults', () => {
      const [state] = callHook();
      expect(state.cumulativeStats).toBeNull();
      expect(state.amberBalance).toBe(0);
      expect(state.currentPhase).toBe(0);
    });
  });

  describe('recordVictory', () => {
    test('calculates stars and returns VictoryData', async () => {
      const [, actions] = callHook();
      const result = await actions.recordVictory('MEDIUM', 0, 0);

      expect(result).toHaveProperty('earnedStars');
      expect(result).toHaveProperty('amberEarned');
      expect(result).toHaveProperty('amberBalance');
      expect(result).toHaveProperty('phaseChanged');
      expect(result).toHaveProperty('newPhase');
      expect(result).toHaveProperty('streakBonus');
      expect(result).toHaveProperty('challengeBonus');
      expect(result).toHaveProperty('currentStreak');
      expect(result).toHaveProperty('milestoneBonus');
      expect(result).toHaveProperty('milestoneMessage');
      expect(result).toHaveProperty('cumulativeStats');
      expect(result).toHaveProperty('phaseAcceleration');
    });

    test('calls calculateStars with correct arguments', async () => {
      const [, actions] = callHook();
      await actions.recordVictory('HARD', 2, 5);

      expect(mockCalculateStars).toHaveBeenCalledWith(2, 5);
    });

    test('calls recordPuzzleCompletion with correct arguments', async () => {
      const [, actions] = callHook();
      await actions.recordVictory('EASY', 1, 3);

      expect(mockRecordPuzzleCompletion).toHaveBeenCalledWith('EASY', 1, 3);
    });

    test('calls awardPuzzleAmber with stars, difficulty, and mode', async () => {
      const [, actions] = callHook();
      await actions.recordVictory('MEDIUM', 0, 0, 'standard');

      expect(mockAwardPuzzleAmber).toHaveBeenCalledWith('MEDIUM', 3, 'standard', expect.any(Number));
    });

    test('calls updatePuzzleCount with puzzlesSolved', async () => {
      const [, actions] = callHook();
      await actions.recordVictory('MEDIUM', 0, 0);

      expect(mockUpdatePuzzleCount).toHaveBeenCalledWith(1);
    });

    test('logs puzzle_completed event', async () => {
      const [, actions] = callHook();
      await actions.recordVictory('MEDIUM', 0, 0);

      expect(mockLogEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'puzzle_completed',
          data: expect.objectContaining({
            difficulty: 'MEDIUM',
            stars: 3,
          }),
        })
      );
    });

    test('returns correct stars for perfect solve (0 hints, 0 invalid)', async () => {
      const [, actions] = callHook();
      const result = await actions.recordVictory('MEDIUM', 0, 0);
      expect(result.earnedStars).toBe(3);
    });

    test('returns correct stars for decent solve (1 hint)', async () => {
      const [, actions] = callHook();
      const result = await actions.recordVictory('MEDIUM', 1, 0);
      expect(result.earnedStars).toBe(2);
    });

    test('returns correct stars for poor solve (many hints and errors)', async () => {
      const [, actions] = callHook();
      const result = await actions.recordVictory('MEDIUM', 3, 6);
      expect(result.earnedStars).toBe(1);
    });

    test('returns amberEarned from awardPuzzleAmber', async () => {
      mockAwardPuzzleAmber.mockResolvedValueOnce({
        amount: 25,
        baseAmount: 20,
        newBalance: 125,
        puzzlesSolved: 5,
        phaseChanged: false,
        newPhase: 0 as const,
        streakBonus: 5,
        challengeBonus: 0,
        currentStreak: 3,
        milestoneBonus: 0,
        milestoneMessage: null,
        phaseAcceleration: 1.0,
      });

      const [, actions] = callHook();
      const result = await actions.recordVictory('HARD', 0, 0);
      expect(result.amberEarned).toBe(25);
      expect(result.amberBalance).toBe(125);
      expect(result.streakBonus).toBe(5);
      expect(result.currentStreak).toBe(3);
    });

    test('returns phaseChanged when phase transitions', async () => {
      mockAwardPuzzleAmber.mockResolvedValueOnce({
        amount: 10,
        baseAmount: 10,
        newBalance: 200,
        puzzlesSolved: 25,
        phaseChanged: true,
        newPhase: 1,
        streakBonus: 0,
        challengeBonus: 0,
        currentStreak: 1,
        milestoneBonus: 50,
        milestoneMessage: 'Getting the hang of it!',
        phaseAcceleration: 1.0,
      } as any);

      const [, actions] = callHook();
      const result = await actions.recordVictory('MEDIUM', 0, 0);
      expect(result.phaseChanged).toBe(true);
      expect(result.newPhase).toBe(1);
      expect(result.milestoneBonus).toBe(50);
      expect(result.milestoneMessage).toBe('Getting the hang of it!');
    });

    test('returns challenge bonus in challenge mode', async () => {
      mockAwardPuzzleAmber.mockResolvedValueOnce({
        amount: 22,
        baseAmount: 15,
        newBalance: 122,
        puzzlesSolved: 10,
        phaseChanged: false,
        newPhase: 0,
        streakBonus: 0,
        challengeBonus: 7,
        currentStreak: 1,
        milestoneBonus: 25,
        milestoneMessage: 'First steps!',
        phaseAcceleration: 2.0,
      } as any);

      const [, actions] = callHook();
      const result = await actions.recordVictory('MEDIUM', 0, 0, 'challenge');
      expect(result.challengeBonus).toBe(7);
      expect(result.phaseAcceleration).toBe(2.0);
    });

    test('defaults to standard game mode', async () => {
      const [, actions] = callHook();
      await actions.recordVictory('MEDIUM', 0, 0);

      expect(mockAwardPuzzleAmber).toHaveBeenCalledWith(
        'MEDIUM', 3, 'standard', expect.any(Number)
      );
    });

    test('handles service errors gracefully with default returns', async () => {
      mockRecordPuzzleCompletion.mockRejectedValueOnce(new Error('Storage failed'));

      const [, actions] = callHook();
      const result = await actions.recordVictory('MEDIUM', 0, 0);

      // Should return defaults for error case
      expect(result.earnedStars).toBe(3); // Stars are calculated before try block
      expect(result.amberEarned).toBe(0);
      expect(result.phaseChanged).toBe(false);
      expect(result.streakBonus).toBe(0);
      expect(result.challengeBonus).toBe(0);
      expect(result.currentStreak).toBe(0);
      expect(result.milestoneBonus).toBe(0);
      expect(result.milestoneMessage).toBeNull();
      expect(result.phaseAcceleration).toBe(1.0);
    });

    test('handles awardPuzzleAmber failure gracefully', async () => {
      mockAwardPuzzleAmber.mockRejectedValueOnce(new Error('Award failed'));

      const [, actions] = callHook();
      const result = await actions.recordVictory('EASY', 0, 1);

      // Should return defaults
      expect(result.earnedStars).toBe(3);
      expect(result.amberEarned).toBe(0);
      expect(result.phaseChanged).toBe(false);
    });

    test('passes three-star rate ratio to awardPuzzleAmber', async () => {
      mockGetThreeStarRate.mockReturnValueOnce(50);

      const [, actions] = callHook();
      await actions.recordVictory('MEDIUM', 0, 0);

      // getThreeStarRate returns 50 (percentage), should be divided by 100 to get ratio 0.5
      expect(mockAwardPuzzleAmber).toHaveBeenCalledWith(
        'MEDIUM', 3, 'standard', 0.5
      );
    });
  });

  describe('refreshStats', () => {
    test('calls getCumulativeStats and getAmberBalance', async () => {
      const [, actions] = callHook();
      await actions.refreshStats();

      expect(mockGetCumulativeStats).toHaveBeenCalled();
      expect(mockGetAmberBalance).toHaveBeenCalled();
    });

    test('updates state with fresh values', async () => {
      mockGetCumulativeStats.mockResolvedValueOnce({
        ...defaultStats,
        totalPuzzlesCompleted: 42,
        totalStars: 100,
      });
      mockGetAmberBalance.mockResolvedValueOnce(500);

      let [, actions] = callHook();
      await actions.refreshStats();

      const [state] = callHook();
      expect(state.cumulativeStats).not.toBeNull();
      expect(state.cumulativeStats!.totalPuzzlesCompleted).toBe(42);
      expect(state.amberBalance).toBe(500);
    });
  });

  describe('setAmberBalance', () => {
    test('updates amber balance directly', () => {
      let [, actions] = callHook();
      actions.setAmberBalance(999);

      const [state] = callHook();
      expect(state.amberBalance).toBe(999);
    });
  });
});
