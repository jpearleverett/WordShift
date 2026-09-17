import NativeStorage from '@react-native-async-storage/async-storage';
import {
  loadProgress, invalidateProgressCache, checkFreeStreakFreeze,
  purchaseUnlockWithAmber, reserveUnlock, unlockAnimal, unlockRoom,
  awardPuzzleAmber, canArmFinale, setSurpriseRng, startNewCycle,
  devAddPuzzles, getCyclePuzzlesSolved, getPuzzlesUntilNextPhase,
} from '../services/amberCurrency';
import {
  recoverPendingStorageTransaction, STORAGE_COMMIT_KEY, StorageRecoveryRequiredError,
} from '../services/persistenceStorage';
import { skipReservedUnlock, UNLOCK_PROGRESSION } from '../services/homeWorldData';
import { HomeWorldProgress } from '../types/homeWorld';
import { FINALE_ARM_MIN_PUZZLES, FINALE_DWELL_PUZZLES, MIN_PUZZLES_FOR_PHASE, PHASE_THRESHOLDS } from '../constants/gameBalance';

jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());
jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn(), getInstallAgeDays: jest.fn(async () => 3) }));

const PROGRESS = 'wordshift_home_progress';
const LEDGER = 'wordshift_amber_transactions';
const originalRead = (NativeStorage.getItem as jest.Mock).getMockImplementation()!;
const originalWrite = (NativeStorage.setItem as jest.Mock).getMockImplementation()!;

async function seed(overrides: Partial<HomeWorldProgress> = {}): Promise<HomeWorldProgress> {
  const progress = { ...(await loadProgress()), amber: 4000, ...overrides };
  await NativeStorage.setItem(PROGRESS, JSON.stringify(progress));
  invalidateProgressCache();
  return progress;
}

beforeEach(async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(originalRead);
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  await NativeStorage.clear();
  invalidateProgressCache();
  setSurpriseRng(() => 1);
});
afterEach(() => { setSurpriseRng(); jest.restoreAllMocks(); });

describe('unreadable progress fails closed', () => {
  test.each(['', '{"amber":4000', 'null', '[]', '42', '{}', '{"amber":100}'])(
    'never replaces existing invalid bytes %j with a fresh save', async raw => {
      await NativeStorage.setItem(PROGRESS, raw);
      // The shared storage mock uses `value || null`; native storage preserves
      // an existing empty string, which must also fail closed.
      if (raw === '') (NativeStorage.getItem as jest.Mock).mockImplementation(async (key: string) => key === PROGRESS ? '' : originalRead(key));
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      await expect(loadProgress()).rejects.toThrow();
      await expect(checkFreeStreakFreeze()).rejects.toThrow();
      expect(await NativeStorage.getItem(PROGRESS)).toBe(raw);
      expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
      warn.mockRestore();
    },
  );

  test('a native read failure neither warms defaults nor changes the existing record', async () => {
    const before = await seed({ puzzlesSolved: 120, unlockedAnimals: ['fox', 'owl'] });
    (NativeStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage unavailable'));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(loadProgress()).rejects.toThrow('storage unavailable');
    expect(await loadProgress()).toEqual(before);
  });

  test('only a genuinely missing key creates default progress', async () => {
    expect(await loadProgress()).toMatchObject({ amber: 0, puzzlesSolved: 0, unlockedRooms: ['cozy_den'] });
    expect(await NativeStorage.getItem(PROGRESS)).toBeNull();
  });

  test('valid JSON with invalid ownership is refused before any grant', async () => {
    const before = await seed();
    await NativeStorage.setItem(PROGRESS, JSON.stringify({ ...before, unlockedRooms: 'all' }));
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(checkFreeStreakFreeze()).rejects.toThrow('could not be read');
    expect(JSON.parse((await NativeStorage.getItem(PROGRESS))!).unlockedRooms).toBe('all');
  });
});

const purchases = [
  { name: 'animal', buy: () => unlockAnimal('owl', 100), after: { unlockedAnimals: ['owl'], amber: 3900 } },
  { name: 'room', buy: () => unlockRoom('kitchen', 50), after: { unlockedRooms: ['cozy_den', 'kitchen'], amber: 3950 } },
  { name: 'reservation', buy: () => reserveUnlock('unlock_jungle', 200), after: { reservedUnlockId: 'unlock_jungle', amber: 3800 } },
];

describe('unlock purchases preserve debit and ownership together', () => {
  test.each(purchases)('$name changes neither balance nor ownership before journal commit', async ({ buy }) => {
    const before = await seed();
    (NativeStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      if (key === STORAGE_COMMIT_KEY) throw new Error('disk full');
      return originalWrite(key, value);
    });
    await expect(buy()).rejects.toThrow('disk full');
    expect(await loadProgress()).toEqual(before);
    expect(await NativeStorage.getItem(LEDGER)).toBeNull();
  });

  test.each(purchases)('$name recovers after interrupted apply and never debits twice on retry', async ({ buy, after }) => {
    await seed();
    let interrupted = false;
    (NativeStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      if (key === PROGRESS && !interrupted) { interrupted = true; throw new Error('interrupted apply'); }
      return originalWrite(key, value);
    });
    await expect(buy()).rejects.toBeInstanceOf(StorageRecoveryRequiredError);
    expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
    await buy();
    expect(await loadProgress()).toMatchObject(after);
    expect(JSON.parse((await NativeStorage.getItem(LEDGER))!)).toHaveLength(1);
    expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
  });

  test('concurrent duplicate taps buy one room exactly once', async () => {
    await seed();
    await Promise.all([unlockRoom('kitchen', 50), unlockRoom('kitchen', 50)]);
    expect(await loadProgress()).toMatchObject({ amber: 3950, unlockedRooms: ['cozy_den', 'kitchen'] });
    expect(JSON.parse((await NativeStorage.getItem(LEDGER))!)).toHaveLength(1);
  });

  test('an already-paid reservation cannot be silently overwritten', async () => {
    await seed({ reservedUnlockId: 'unlock_jungle' });
    expect(await reserveUnlock('unlock_desert', 250)).toMatchObject({ success: false });
    expect(await loadProgress()).toMatchObject({ amber: 4000, reservedUnlockId: 'unlock_jungle' });
  });

  test('reserved speed-up recovers the premium, ownership and cleared reservation together', async () => {
    await seed({ reservedUnlockId: 'unlock_jungle' });
    let interrupted = false;
    (NativeStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
      // The ownership write already landed when the ledger apply fails.
      if (key === LEDGER && !interrupted) { interrupted = true; throw new Error('interrupted ledger'); }
      return originalWrite(key, value);
    });
    await expect(skipReservedUnlock('unlock_jungle')).rejects.toBeInstanceOf(StorageRecoveryRequiredError);
    await recoverPendingStorageTransaction();
    invalidateProgressCache();
    expect(await loadProgress()).toMatchObject({
      amber: 3700, unlockedRooms: ['cozy_den', 'jungle_room'], reservedUnlockId: null,
    });
    expect(await purchaseUnlockWithAmber('jungle_room', 'room', 300, 'unlock_jungle')).toMatchObject({ success: true, newBalance: 3700 });
    expect(JSON.parse((await NativeStorage.getItem(LEDGER))!)).toHaveLength(1);
  });
});

describe('new-cycle narrative exposure', () => {
  test('a fully owned house cannot use lifetime solves to skip phase exposure or arm the finale', async () => {
    await seed({ puzzlesSolved: 130, currentPhase: 5, phaseProgress: 160,
      postRevelation: true, houseCompleted: true, finalPuzzleCompleted: true,
      unlockedAnimals: UNLOCK_PROGRESSION.filter(u => u.type === 'character').map(u => u.targetId),
    });
    await startNewCycle();
    const progress = await loadProgress();
    expect(progress.puzzlesSolved).toBe(130);
    expect(getCyclePuzzlesSolved(progress)).toBe(0);
    progress.phaseProgress = PHASE_THRESHOLDS[4] + 100;
    // Recompute using the real phase entry point with enough weighted progress
    // to reach any phase, but only one exposure in the current run.
    await devAddPuzzles(1);
    expect((await loadProgress()).currentPhase).toBe(0);
    expect(await getPuzzlesUntilNextPhase()).toBe(MIN_PUZZLES_FOR_PHASE[1] - 1);
    expect(canArmFinale(FINALE_DWELL_PUZZLES, 131, 130)).toBe(false);
    expect(canArmFinale(FINALE_DWELL_PUZZLES, 130 + FINALE_ARM_MIN_PUZZLES - 1, 130)).toBe(false);
    expect(canArmFinale(FINALE_DWELL_PUZZLES, 130 + FINALE_ARM_MIN_PUZZLES, 130)).toBe(true);
    await devAddPuzzles(MIN_PUZZLES_FOR_PHASE[4] - 2);
    expect((await loadProgress()).currentPhase).toBe(3);
    await devAddPuzzles(1);
    expect((await loadProgress()).currentPhase).toBe(4);
  });
});

describe('backwards local day', () => {
  test.each([0, 2])('keeps the streak and %i freezes until the recorded day is passed', async streakFreezes => {
    await seed({ currentStreak: 21, lastPlayDate: '2026-09-17', streakFreezes });
    const earlier = await awardPuzzleAmber('EASY', 1, 'standard', 0, true, { completedDate: '2026-09-16' });
    expect(earlier.streakSaved).toBe(false);
    expect(await loadProgress()).toMatchObject({ currentStreak: 21, lastPlayDate: '2026-09-17', streakFreezes });
    await awardPuzzleAmber('EASY', 1, 'standard', 0, true, { completedDate: '2026-09-17' });
    expect((await loadProgress()).currentStreak).toBe(21);
    await awardPuzzleAmber('EASY', 1, 'standard', 0, true, { completedDate: '2026-09-18' });
    expect(await loadProgress()).toMatchObject({ currentStreak: 22, lastPlayDate: '2026-09-18', streakFreezes });
  });
});
