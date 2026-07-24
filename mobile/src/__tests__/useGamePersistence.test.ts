/**
 * Tests for useGamePersistence hook.
 *
 * Since we run in a Node test environment without a React renderer,
 * we mock React hooks to work synchronously and call the hook directly.
 */

// --- Mock React hooks to run synchronously in Node ---
const stateStore: Map<number, unknown> = new Map();
let stateIndex = 0;
let effectCallbacks: (() => void)[] = [];
const refStore: Map<number, { current: unknown }> = new Map();
let refIndex = 0;

function resetHookState() {
  stateStore.clear();
  refStore.clear();
  stateIndex = 0;
  refIndex = 0;
  effectCallbacks = [];
}

function rewindHookIndices() {
  stateIndex = 0;
  refIndex = 0;
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
  useRef: (initial: unknown) => {
    const idx = refIndex++;
    if (!refStore.has(idx)) {
      refStore.set(idx, { current: initial });
    }
    return refStore.get(idx)!;
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
    MEDIUM_PLUS: { completed: 0, stars: 0 },
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
  isFlawless: (hints: number, invalids: number, undos: number = 0) =>
    hints === 0 && invalids === 0 && undos === 0,
}));

// --- Mock amberCurrency ---
const mockAwardPuzzleAmber = jest.fn(async (_d?: any, _s?: any, _m?: any, _r?: any, _c?: any, _o?: any) => ({
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
  firstCompletionBonus: 0,
  streakMilestoneBonus: 0,
  streakMilestoneMessage: null as string | null,
}));

const mockGetAmberBalance = jest.fn(async () => 100);
const mockGetCurrentPhase = jest.fn(async () => 0);
const mockRecordVariantEncounter = jest.fn(async (_variant?: any) => {});
const mockApplyVariantAmberBonus = jest.fn(async (_variant?: any, _base?: any, _mult?: any, _credit?: any) => ({
  bonus: 0,
  freshBonus: 0,
  isFresh: false,
  newBalance: 115,
  appliedMultiplier: 1.0,
  repeatCount: 1,
  repeatDecay: 1.0,
}));
const mockRecordVariantWin = jest.fn(async (_variant?: any, _blind?: any) => {});

const mockRecordRitualWords = jest.fn(async (_w?: any, _e?: any, _t?: any) => ({
  totalWordsFormed: 0,
  totalRitualEnergy: 0,
  triggerWordQueue: [] as string[],
}));

jest.mock('../services/amberCurrency', () => ({
  awardPuzzleAmber: (...args: any[]) => mockAwardPuzzleAmber(args[0], args[1], args[2], args[3], args[4], args[5]),
  getAmberBalance: () => mockGetAmberBalance(),
  getCurrentPhase: () => mockGetCurrentPhase(),
  getPhaseProgressFraction: jest.fn(async () => 0),
  getPendingPhaseTransition: jest.fn(async () => null),
  isPostRevelation: jest.fn(async () => false),
  recordRitualWords: (...args: any[]) => mockRecordRitualWords(args[0], args[1], args[2]),
  recordVariantEncounter: (...args: any[]) => mockRecordVariantEncounter(args[0]),
  applyVariantAmberBonus: (...args: any[]) => mockApplyVariantAmberBonus(args[0], args[1], args[2], args[3]),
  recordVariantWin: (...args: any[]) => mockRecordVariantWin(args[0], args[1]),
}));

// --- Mock dialogueSession ---
const mockUpdatePuzzleCount = jest.fn();
const mockUpdateSessionPhase = jest.fn();
jest.mock('../services/dialogueSession', () => ({
  updatePuzzleCount: (...args: any[]) => mockUpdatePuzzleCount(args[0]),
  updateSessionPhase: (...args: any[]) => mockUpdateSessionPhase(args[0]),
}));

// --- Mock localGenerator (for ritual energy) ---
jest.mock('../services/localGenerator', () => ({
  calculateRitualEnergy: jest.fn(() => 0),
  extractTriggerWords: jest.fn(() => []),
}));

// --- Mock wordHistory (formed-word cooldown feed) ---
const mockRecordFormedWords = jest.fn(async (_words?: string[]) => {});
jest.mock('../services/wordHistory', () => ({
  recordFormedWords: (...args: any[]) => mockRecordFormedWords(args[0]),
}));

// --- Mock eventLogger ---
const mockLogEvent = jest.fn();
jest.mock('../services/eventLogger', () => ({
  logEvent: (...args: any[]) => mockLogEvent(args[0]),
}));

// --- Mock masteryRecords (resonant-choice mastery stat feed) ---
const mockRecordResonantChoices = jest.fn(async (_count?: any) => 0);
jest.mock('../services/masteryRecords', () => ({
  recordResonantChoices: (...args: any[]) => mockRecordResonantChoices(args[0]),
}));

// --- Mock weekly quests ---
const mockUpdateQuestProgress = jest.fn(async (_event?: any, _phase?: any) => []);
jest.mock('../services/weeklyQuests', () => ({
  updateQuestProgress: (...args: any[]) => mockUpdateQuestProgress(args[0], args[1]),
}));

// --- Mock wordHarvest ---
const mockEnqueueHarvestBatch = jest.fn(async (_batch?: any) => ({ overflow: false }));
const mockGenerateBatchId = jest.fn(() => 'hb_test_123');
const mockGetPendingHarvestSummary = jest.fn(async () => ({
  pendingAmber: 15,
  pendingWords: 3,
  pendingBatches: 1,
}));
jest.mock('../services/wordHarvest', () => ({
  enqueueHarvestBatch: (...args: any[]) => mockEnqueueHarvestBatch(args[0]),
  generateBatchId: () => mockGenerateBatchId(),
  getPendingHarvestSummary: () => mockGetPendingHarvestSummary(),
}));

import { useGamePersistence, VictoryData, PersistenceState, PersistenceActions } from '../hooks/useGamePersistence';

function callHook(): [PersistenceState, PersistenceActions] {
  rewindHookIndices();
  // eslint-disable-next-line react-hooks/rules-of-hooks -- test harness drives the hook against a manual React mock
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
      firstCompletionBonus: 0,
      streakMilestoneBonus: 0,
      streakMilestoneMessage: null,
    });

    mockGetCumulativeStats.mockResolvedValue({ ...defaultStats });
    mockGetAmberBalance.mockResolvedValue(100);
    mockGetCurrentPhase.mockResolvedValue(0);
    mockGetThreeStarRate.mockReturnValue(100);
    mockApplyVariantAmberBonus.mockResolvedValue({
      bonus: 0,
      freshBonus: 0,
      isFresh: false,
      newBalance: 115,
      appliedMultiplier: 1.0,
      repeatCount: 1,
      repeatDecay: 1.0,
    });
    mockUpdateQuestProgress.mockResolvedValue([]);
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

    test('calls awardPuzzleAmber with stars, difficulty, mode, and deferred crediting', async () => {
      const [, actions] = callHook();
      await actions.recordVictory('MEDIUM', 0, 0, 'standard');

      expect(mockAwardPuzzleAmber).toHaveBeenCalledWith(
        'MEDIUM', 3, 'standard', expect.any(Number), false, { skipPhaseProgress: false, blind: false, lexicon: false, resonanceBonus: 0 }
      );
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
        firstCompletionBonus: 0,
        streakMilestoneBonus: 0,
        streakMilestoneMessage: null,
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
        firstCompletionBonus: 0,
        streakMilestoneBonus: 0,
        streakMilestoneMessage: null,
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
        firstCompletionBonus: 0,
        streakMilestoneBonus: 0,
        streakMilestoneMessage: null,
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
        'MEDIUM', 3, 'standard', expect.any(Number), false, { skipPhaseProgress: false, blind: false, lexicon: false, resonanceBonus: 0 }
      );
    });

    test('passes isDaily=true to weekly quest updates for daily runs', async () => {
      const [, actions] = callHook();
      await actions.recordVictory('MEDIUM', 0, 0, 'standard', ['LIME', 'TIME'], 'standard', true);

      expect(mockUpdateQuestProgress).toHaveBeenCalledWith(
        expect.objectContaining({ isDaily: true }),
        expect.any(Number)
      );
    });

    test('records variant encounter for non-standard variant', async () => {
      const [, actions] = callHook();
      await actions.recordVictory('MEDIUM', 0, 0, 'standard', ['LIME', 'TIME'], 'reverse');
      expect(mockRecordVariantEncounter).toHaveBeenCalledWith('reverse');
    });

    test('applies variant bonus via anti-farm calculator', async () => {
      mockApplyVariantAmberBonus.mockResolvedValueOnce({
        bonus: 4,
        freshBonus: 0,
        isFresh: false,
        newBalance: 119,
        appliedMultiplier: 1.2,
        repeatCount: 2,
        repeatDecay: 1.0,
      });

      const [, actions] = callHook();
      const result = await actions.recordVictory('MEDIUM', 0, 0, 'standard', ['LIME', 'TIME'], 'reverse');

      expect(mockApplyVariantAmberBonus).toHaveBeenCalledWith('reverse', 15, expect.any(Number), false);
      expect(result.variantBonus).toBe(4);
      expect(result.amberBalance).toBe(119);
      expect(result.variantAppliedMultiplier).toBeCloseTo(1.2);
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
        'MEDIUM', 3, 'standard', 0.5, false, { skipPhaseProgress: false, blind: false, lexicon: false, resonanceBonus: 0 }
      );
    });

    test('enqueues harvest batch with the per-puzzle amber only', async () => {
      const [, actions] = callHook();
      await actions.recordVictory('MEDIUM', 0, 0, 'standard', ['LIME', 'TIME']);

      expect(mockEnqueueHarvestBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          amberValue: 15, // amberResult.amount ONLY — windfalls are credited instantly, never queued
          words: ['LIME', 'TIME'],
          difficulty: 'MEDIUM',
          gameMode: 'standard',
          stars: 3,
          variant: 'standard',
        })
      );
    });

    test('a milestone win queues ONLY the per-puzzle amber; windfalls stay out of the batch', async () => {
      // Windfalls (milestone / first-completion / streak milestone) are
      // credited to the spendable balance by awardPuzzleAmber itself — the
      // hook must enqueue exactly amberResult.amount, while amberEarned (the
      // victory receipt) still totals everything the win earned.
      mockAwardPuzzleAmber.mockResolvedValueOnce({
        amount: 15,
        baseAmount: 15,
        baseAmber: 10,
        starBonusAmber: 5,
        newBalance: 195, // 100 + the 95 in windfalls, credited by the economy
        puzzlesSolved: 100,
        phaseChanged: false,
        newPhase: 2,
        streakBonus: 0,
        challengeBonus: 0,
        patronBonus: 0,
        surpriseBonus: 0,
        currentStreak: 4,
        milestoneBonus: 50,
        milestoneMessage: 'Milestone!',
        phaseAcceleration: 1.0,
        firstCompletionBonus: 30,
        streakMilestoneBonus: 15,
        streakMilestoneMessage: 'Streak!',
      } as any);

      const [, actions] = callHook();
      const result = await actions.recordVictory('MEDIUM', 0, 0, 'standard', ['LIME', 'TIME']);

      // The batch carries exactly the per-puzzle amber.
      expect(mockEnqueueHarvestBatch).toHaveBeenCalledWith(
        expect.objectContaining({ amberValue: 15 })
      );
      // The receipt still totals per-puzzle + windfalls, and the balance
      // already reflects the instantly-credited windfalls.
      expect(result.amberEarned).toBe(15 + 50 + 30 + 15);
      expect(result.amberBreakdown!.total).toBe(result.amberEarned);
      expect(result.amberBalance).toBe(195);
    });

    test('records formed words into wordHistory cooldowns', async () => {
      const [, actions] = callHook();
      await actions.recordVictory('MEDIUM', 0, 0, 'standard', ['LIME', 'TIME']);

      // Bank selection freshness must see the words the player actually
      // formed, not just the starting chain recorded at puzzle start.
      expect(mockRecordFormedWords).toHaveBeenCalledWith(['LIME', 'TIME']);
    });

    test('does not record formed words when no completed words were passed', async () => {
      const [, actions] = callHook();
      await actions.recordVictory('MEDIUM', 0, 0);

      expect(mockRecordFormedWords).not.toHaveBeenCalled();
    });

    test('returns harvestOverflow: false when no overflow', async () => {
      const [, actions] = callHook();
      const result = await actions.recordVictory('MEDIUM', 0, 0);
      expect(result.harvestOverflow).toBe(false);
    });

    test('returns harvestOverflow: true when enqueue reports overflow', async () => {
      mockEnqueueHarvestBatch.mockResolvedValueOnce({ overflow: true });
      const [, actions] = callHook();
      const result = await actions.recordVictory('MEDIUM', 0, 0);
      expect(result.harvestOverflow).toBe(true);
    });
  });

  describe('amberBreakdown (real itemization threading)', () => {
    test('threads the economy itemization and the parts sum to amberEarned', async () => {
      // A rich victory: base 20 + star 10, streak 3, challenge 7, patron 2,
      // surprise 5, milestone 50, first-completion 30, streak milestone 15.
      mockAwardPuzzleAmber.mockResolvedValueOnce({
        amount: 47, // 20 + 10 + 3 + 7 + 2 + 5
        baseAmount: 30,
        baseAmber: 20,
        starBonusAmber: 10,
        newBalance: 100,
        puzzlesSolved: 40,
        phaseChanged: false,
        newPhase: 1,
        streakBonus: 3,
        challengeBonus: 7,
        patronBonus: 2,
        surpriseBonus: 5,
        currentStreak: 4,
        milestoneBonus: 50,
        milestoneMessage: 'Milestone!',
        phaseAcceleration: 1.0,
        firstCompletionBonus: 30,
        streakMilestoneBonus: 15,
        streakMilestoneMessage: 'Streak!',
      } as any);
      // Variant pass adds bonus 8 + fresh 4 on top of amount.
      mockApplyVariantAmberBonus.mockResolvedValueOnce({
        bonus: 8,
        freshBonus: 4,
        isFresh: true,
        newBalance: 100,
        appliedMultiplier: 1.2,
        repeatCount: 1,
        repeatDecay: 1.0,
      });

      const [, actions] = callHook();
      const result = await actions.recordVictory('HARD', 0, 0, 'challenge', ['LIME', 'TIME'], 'reverse');

      const b = result.amberBreakdown!;
      expect(b).toBeDefined();
      expect(b.base).toBe(20);
      expect(b.starBonus).toBe(10);
      expect(b.streakBonus).toBe(3);
      expect(b.challengeBonus).toBe(7);
      expect(b.patronBonus).toBe(2);
      expect(b.surpriseBonus).toBe(5);
      expect(b.variantBonus).toBe(8);
      expect(b.freshVariantBonus).toBe(4);
      expect(b.firstCompletionBonus).toBe(30);
      expect(b.milestoneBonus).toBe(50);
      expect(b.streakMilestoneBonus).toBe(15);

      // The invariant the Victory modal relies on: parts sum EXACTLY to the
      // amber earned — no re-derived display math can desync from this.
      const partsSum =
        b.base + b.starBonus + b.streakBonus + b.challengeBonus + b.patronBonus +
        b.surpriseBonus + b.variantBonus + b.freshVariantBonus +
        b.firstCompletionBonus + b.milestoneBonus + b.streakMilestoneBonus;
      expect(partsSum).toBe(result.amberEarned);
      expect(b.total).toBe(result.amberEarned);
      // amount(47) + variant(8) + fresh(4) + milestone(50) + firstComp(30) + streakMilestone(15)
      expect(result.amberEarned).toBe(154);
      // The batch defers ONLY the per-puzzle share (amount + variant + fresh);
      // the windfalls (50 + 30 + 15) were credited instantly by the economy.
      expect(mockEnqueueHarvestBatch).toHaveBeenCalledWith(
        expect.objectContaining({ amberValue: 59 })
      );
    });

    test('a plain victory sums too (base + star only)', async () => {
      mockAwardPuzzleAmber.mockResolvedValueOnce({
        amount: 15,
        baseAmount: 15,
        baseAmber: 10,
        starBonusAmber: 5,
        newBalance: 115,
        puzzlesSolved: 30,
        phaseChanged: false,
        newPhase: 0 as const,
        streakBonus: 0,
        challengeBonus: 0,
        patronBonus: 0,
        surpriseBonus: 0,
        currentStreak: 1,
        milestoneBonus: 0,
        milestoneMessage: null,
        phaseAcceleration: 1.0,
        firstCompletionBonus: 0,
        streakMilestoneBonus: 0,
        streakMilestoneMessage: null,
      } as any);

      const [, actions] = callHook();
      const result = await actions.recordVictory('MEDIUM', 0, 0);

      const b = result.amberBreakdown!;
      expect(b.base + b.starBonus).toBe(15);
      expect(b.total).toBe(result.amberEarned);
      expect(result.amberEarned).toBe(15);
    });

    test('the concurrent-guard fallback carries no breakdown (display falls back)', async () => {
      // Make recordPuzzleCompletion hang so a second call hits the guard.
      let release: () => void = () => {};
      mockRecordPuzzleCompletion.mockImplementationOnce(
        () => new Promise(resolve => { release = () => resolve({} as any); })
      );
      const [, actions] = callHook();
      const first = actions.recordVictory('MEDIUM', 0, 0);
      const second = await actions.recordVictory('MEDIUM', 0, 0);
      expect(second.amberBreakdown).toBeUndefined();
      release();
      await first;
    });
  });

  describe('resonance threading (evaluative depth)', () => {
    // The RESONANT_MOVE_AMBER (2) / RESONANT_BOARD_CAP_AMBER (6) constants are
    // imported for real by the hook; assertions below pin the derived amounts.

    test('derives the amber from the count and passes it to awardPuzzleAmber (options)', async () => {
      const [, actions] = callHook();
      await actions.recordVictory(
        'MEDIUM', 0, 0, 'standard', [], 'standard',
        false, 0, false, false, 2 // resonantChoiceCount
      );
      expect(mockAwardPuzzleAmber).toHaveBeenCalledWith(
        'MEDIUM', 3, 'standard', expect.any(Number), false,
        { skipPhaseProgress: false, blind: false, lexicon: false, resonanceBonus: 4 }
      );
    });

    test('caps the derived bonus at the board cap', async () => {
      const [, actions] = callHook();
      await actions.recordVictory(
        'MEDIUM', 0, 0, 'standard', [], 'standard',
        false, 0, false, false, 5 // 5 × 2 = 10 → capped to 6
      );
      expect(mockAwardPuzzleAmber).toHaveBeenCalledWith(
        'MEDIUM', 3, 'standard', expect.any(Number), false,
        { skipPhaseProgress: false, blind: false, lexicon: false, resonanceBonus: 6 }
      );
    });

    test('feeds the cumulative mastery stat by the board count (and never for 0)', async () => {
      const [, actions] = callHook();
      await actions.recordVictory(
        'MEDIUM', 0, 0, 'standard', [], 'standard',
        false, 0, false, false, 3
      );
      expect(mockRecordResonantChoices).toHaveBeenCalledWith(3);

      mockRecordResonantChoices.mockClear();
      await actions.recordVictory('MEDIUM', 0, 0);
      expect(mockRecordResonantChoices).not.toHaveBeenCalled();
    });

    test('exposes VictoryData.resonanceBonus and the itemized breakdown entry (parts still sum)', async () => {
      mockAwardPuzzleAmber.mockResolvedValueOnce({
        amount: 19, // 10 base + 5 star + 4 resonance
        baseAmount: 15,
        baseAmber: 10,
        starBonusAmber: 5,
        newBalance: 115,
        puzzlesSolved: 30,
        phaseChanged: false,
        newPhase: 0 as const,
        streakBonus: 0,
        challengeBonus: 0,
        patronBonus: 0,
        surpriseBonus: 0,
        resonanceBonus: 4,
        currentStreak: 1,
        milestoneBonus: 0,
        milestoneMessage: null,
        phaseAcceleration: 1.0,
        firstCompletionBonus: 0,
        streakMilestoneBonus: 0,
        streakMilestoneMessage: null,
      } as any);

      const [, actions] = callHook();
      const result = await actions.recordVictory(
        'MEDIUM', 0, 0, 'standard', [], 'standard',
        false, 0, false, false, 2
      );

      expect(result.resonanceBonus).toBe(4);
      expect(result.resonantChoiceCount).toBe(2);
      const b = result.amberBreakdown!;
      expect(b.resonanceBonus).toBe(4);
      const partsSum =
        b.base + b.starBonus + b.streakBonus + b.challengeBonus + b.patronBonus +
        b.surpriseBonus + b.resonanceBonus + b.variantBonus + b.freshVariantBonus +
        b.firstCompletionBonus + b.milestoneBonus + b.streakMilestoneBonus;
      expect(partsSum).toBe(result.amberEarned);
      expect(result.amberEarned).toBe(19);
    });

    test('sanitizes a garbage count to zero', async () => {
      const [, actions] = callHook();
      await actions.recordVictory(
        'MEDIUM', 0, 0, 'standard', [], 'standard',
        false, 0, false, false, Number.NaN
      );
      expect(mockAwardPuzzleAmber).toHaveBeenCalledWith(
        'MEDIUM', 3, 'standard', expect.any(Number), false,
        { skipPhaseProgress: false, blind: false, lexicon: false, resonanceBonus: 0 }
      );
      expect(mockRecordResonantChoices).not.toHaveBeenCalled();
    });
  });

  describe('shared-challenge wins are amber-only', () => {
    test('passes skipPhaseProgress: true to awardPuzzleAmber', async () => {
      const [, actions] = callHook();
      await actions.recordVictory(
        'MEDIUM', 0, 0, 'standard', ['LIME', 'TIME'], 'standard',
        false, 0, false, true // isSharedChallenge
      );

      expect(mockAwardPuzzleAmber).toHaveBeenCalledWith(
        'MEDIUM', 3, 'standard', expect.any(Number), false, { skipPhaseProgress: true, blind: false, lexicon: false, resonanceBonus: 0 }
      );
    });

    test('zeroes the ritual-energy phase feed but still records words + triggers', async () => {
      const { calculateRitualEnergy, extractTriggerWords } = jest.requireMock('../services/localGenerator');
      (calculateRitualEnergy as jest.Mock).mockReturnValue(9); // would be a high-dread board
      (extractTriggerWords as jest.Mock).mockReturnValue(['VOID']);

      const [, actions] = callHook();
      const result = await actions.recordVictory(
        'MEDIUM', 0, 0, 'standard', ['VOID', 'DOOM'], 'standard',
        false, 0, false, true // isSharedChallenge
      );

      // Words still land in the ledger with their trigger flavor, but the
      // energy passed to recordRitualWords is ZERO — its phaseProgress feed
      // (energy * 0.1) gets nothing from a self-crafted challenge chain.
      expect(mockRecordRitualWords).toHaveBeenCalledWith(['VOID', 'DOOM'], 0, ['VOID']);
      expect(result.ritualEnergy).toBe(0);

      (calculateRitualEnergy as jest.Mock).mockReturnValue(0);
      (extractTriggerWords as jest.Mock).mockReturnValue([]);
    });

    test('a normal win keeps the real ritual energy', async () => {
      const { calculateRitualEnergy } = jest.requireMock('../services/localGenerator');
      (calculateRitualEnergy as jest.Mock).mockReturnValue(6);

      const [, actions] = callHook();
      const result = await actions.recordVictory('MEDIUM', 0, 0, 'standard', ['LIME', 'TIME']);

      expect(mockRecordRitualWords).toHaveBeenCalledWith(['LIME', 'TIME'], 6, []);
      expect(result.ritualEnergy).toBe(6);

      (calculateRitualEnergy as jest.Mock).mockReturnValue(0);
    });

    test('shared wins still pay full amber (amount untouched)', async () => {
      const [, actions] = callHook();
      const result = await actions.recordVictory(
        'MEDIUM', 0, 0, 'standard', ['LIME', 'TIME'], 'standard',
        false, 0, false, true
      );
      expect(result.amberEarned).toBe(15);
      expect(mockEnqueueHarvestBatch).toHaveBeenCalledWith(
        expect.objectContaining({ amberValue: 15 })
      );
    });

    test('returns isDaily so the routine-victory policy can gate the daily', async () => {
      const [, actions] = callHook();
      const daily = await actions.recordVictory('HARD', 0, 0, 'standard', [], 'standard', true);
      expect(daily.isDaily).toBe(true);
      const normal = await actions.recordVictory('MEDIUM', 0, 0);
      expect(normal.isDaily).toBe(false);
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

    test('never stores a negative mirror value: clamps, then re-syncs from the store', async () => {
      // The real-device bug: a caller computed `staleSnapshot.amber - cost`
      // (the unlock-purchase path) and pushed a NEGATIVE number into the
      // mirror while the store held the true balance. The guard must refuse
      // the garbage value and self-heal from the authoritative store.
      mockGetAmberBalance.mockResolvedValue(190);

      const [, actions] = callHook();
      actions.setAmberBalance(100); // legitimate prior value
      actions.setAmberBalance(-12); // stale-snapshot subtraction gone wrong

      // Synchronously: the negative is refused (display stays non-negative).
      let [state] = callHook();
      expect(state.amberBalance).toBeGreaterThanOrEqual(0);
      expect(state.amberBalance).not.toBe(-12);

      // After the async re-sync: the mirror equals the store truth.
      await new Promise(resolve => setTimeout(resolve, 0));
      [state] = callHook();
      expect(state.amberBalance).toBe(190);
      expect(mockGetAmberBalance).toHaveBeenCalled();
    });

    test('refuses non-finite values and re-syncs from the store', async () => {
      mockGetAmberBalance.mockResolvedValue(75);

      const [, actions] = callHook();
      actions.setAmberBalance(40);
      actions.setAmberBalance(Number.NaN);

      let [state] = callHook();
      expect(Number.isFinite(state.amberBalance)).toBe(true);
      expect(state.amberBalance).toBeGreaterThanOrEqual(0);

      await new Promise(resolve => setTimeout(resolve, 0));
      [state] = callHook();
      expect(state.amberBalance).toBe(75);
    });

    test('a store re-sync itself clamps a (hypothetically) negative store read', async () => {
      // Defense in depth: even if the store ever returned a negative, the
      // mirror renders 0, never a minus sign.
      mockGetAmberBalance.mockResolvedValue(-30 as unknown as number);

      const [, actions] = callHook();
      actions.setAmberBalance(-1);

      await new Promise(resolve => setTimeout(resolve, 0));
      const [state] = callHook();
      expect(state.amberBalance).toBe(0);
    });
  });

  describe('mirror can never go negative via recordVictory/refresh paths', () => {
    test('recordVictory clamps a negative economy newBalance before mirroring', async () => {
      mockAwardPuzzleAmber.mockResolvedValueOnce({
        amount: 15,
        baseAmount: 15,
        newBalance: -5 as unknown as number, // corrupted economy value
        puzzlesSolved: 1,
        phaseChanged: false,
        newPhase: 0 as const,
        streakBonus: 0,
        challengeBonus: 0,
        currentStreak: 1,
        milestoneBonus: 0,
        milestoneMessage: null,
        phaseAcceleration: 1.0,
        firstCompletionBonus: 0,
        streakMilestoneBonus: 0,
        streakMilestoneMessage: null,
      } as any);

      const [, actions] = callHook();
      await actions.recordVictory('MEDIUM', 0, 0);

      const [state] = callHook();
      expect(state.amberBalance).toBeGreaterThanOrEqual(0);
    });

    test('refreshStats clamps a negative store read', async () => {
      mockGetAmberBalance.mockResolvedValueOnce(-9 as unknown as number);

      const [, actions] = callHook();
      await actions.refreshStats();

      const [state] = callHook();
      expect(state.amberBalance).toBe(0);
    });
  });
});
