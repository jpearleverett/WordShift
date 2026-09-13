import NativeStorage from '@react-native-async-storage/async-storage';
import {
  acknowledgeCeremony,
  confirmPhaseTransition,
  getPendingCeremonies,
  invalidateProgressCache,
  loadProgress,
  markFinalPuzzleCompleted,
  markPostRevelation,
  queueHouseCeremony,
} from '../services/amberCurrency';
import {
  runStorageTransaction,
  STORAGE_COMMIT_KEY,
  StorageRecoveryRequiredError,
} from '../services/persistenceStorage';
import { commitNewCycle } from '../services/resetStorage';
import { collectLocalSaveData, restoreFromCloudData } from '../services/cloudSave';
import { HomeWorldProgress } from '../types/homeWorld';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage());
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
  getInstallAgeDays: jest.fn(async () => 1),
}));

const KEY = 'wordshift_home_progress';
const read = (NativeStorage.getItem as jest.Mock).getMockImplementation()!;
const write = (NativeStorage.setItem as jest.Mock).getMockImplementation()!;
const remove = (NativeStorage.removeItem as jest.Mock).getMockImplementation()!;

async function seed(overrides: Partial<HomeWorldProgress> = {}): Promise<HomeWorldProgress> {
  const progress = {
    ...await loadProgress(),
    amber: 500,
    puzzlesSolved: 50,
    unlockedAnimals: ['fox'],
    unlockedRooms: ['cozy_den'],
    currentPhase: 1 as const,
    pendingPhaseTransition: 2 as const,
    ...overrides,
  };
  await NativeStorage.setItem(KEY, JSON.stringify(progress));
  invalidateProgressCache();
  return progress;
}

async function saved(): Promise<HomeWorldProgress> {
  return JSON.parse((await NativeStorage.getItem(KEY))!);
}

function failNextWrite(keyToFail: string): void {
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === keyToFail && !failed) {
      failed = true;
      throw new Error('Storage unavailable');
    }
    return write(key, value);
  });
}

beforeEach(async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(read);
  (NativeStorage.setItem as jest.Mock).mockImplementation(write);
  (NativeStorage.removeItem as jest.Mock).mockImplementation(remove);
  await NativeStorage.clear();
  invalidateProgressCache();
});

test('a phase advance and its owed ceremony are one durable boundary', async () => {
  await seed();
  expect(await confirmPhaseTransition()).toEqual({ newPhase: 2, previousPhase: 1 });
  invalidateProgressCache(); // New process: no live callback or component state.
  expect(await getPendingCeremonies()).toEqual([
    { id: '0:phase:2', kind: 'phase', phase: 2, cycle: 0, previousPhase: 1 },
  ]);
  expect(await saved()).toMatchObject({
    currentPhase: 2, pendingPhaseTransition: null, amber: 500,
  });
});

test('rapid repeated phase confirmation creates only one ceremony', async () => {
  await seed();
  const results = await Promise.all([confirmPhaseTransition(), confirmPhaseTransition()]);
  expect(results).toEqual([
    { newPhase: 2, previousPhase: 1 }, { newPhase: 2, previousPhase: 1 },
  ]);
  expect(await getPendingCeremonies()).toHaveLength(1);
  await acknowledgeCeremony('0:phase:2');
  expect(await confirmPhaseTransition()).toBeNull();
});

test('failure before the durable journal advances neither the phase nor its ceremony', async () => {
  await seed();
  failNextWrite(STORAGE_COMMIT_KEY);
  await expect(confirmPhaseTransition()).rejects.toThrow('Storage unavailable');
  expect(await saved()).toMatchObject({ currentPhase: 1, pendingPhaseTransition: 2 });
  expect(await getPendingCeremonies()).toEqual([]);
  expect(await confirmPhaseTransition()).toEqual({ newPhase: 2, previousPhase: 1 });
});

test('restart replays a committed phase whose progress write was interrupted', async () => {
  await seed();
  failNextWrite(KEY);
  await expect(confirmPhaseTransition()).rejects.toBeInstanceOf(StorageRecoveryRequiredError);
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
  invalidateProgressCache();
  expect(await getPendingCeremonies()).toHaveLength(1);
  expect(await saved()).toMatchObject({ currentPhase: 2, pendingPhaseTransition: null });
  expect(await confirmPhaseTransition()).toEqual({ newPhase: 2, previousPhase: 1 });
  expect(await getPendingCeremonies()).toHaveLength(1);
});

test('a failed pit-nudge deletion recovers the ceremony without advancing twice', async () => {
  await seed();
  await NativeStorage.setItem('wordshift_pit_nudge_seen', 'true');
  let failed = false;
  (NativeStorage.removeItem as jest.Mock).mockImplementation(async key => {
    if (key === 'wordshift_pit_nudge_seen' && !failed) {
      failed = true;
      throw new Error('Delete interrupted');
    }
    return remove(key);
  });
  await expect(confirmPhaseTransition()).rejects.toBeInstanceOf(StorageRecoveryRequiredError);
  expect(await confirmPhaseTransition()).toEqual({ newPhase: 2, previousPhase: 1 });
  expect(await getPendingCeremonies()).toHaveLength(1);
  expect(await NativeStorage.getItem('wordshift_pit_nudge_seen')).toBeNull();
});

test('an obsolete cached phase cannot overwrite newer saved progress', async () => {
  await seed();
  await loadProgress();
  const newer = { ...await saved(), amber: 900, currentPhase: 2, pendingPhaseTransition: 3 };
  await NativeStorage.setItem(KEY, JSON.stringify(newer));
  expect(await confirmPhaseTransition()).toEqual({ newPhase: 3, previousPhase: 2 });
  expect((await saved()).amber).toBe(900);
});

test('unreadable progress fails closed instead of replacing the save with defaults', async () => {
  await seed();
  const before = await NativeStorage.getItem(KEY);
  (NativeStorage.getItem as jest.Mock).mockImplementation(async key => {
    if (key === KEY) throw new Error('Read interrupted');
    return read(key);
  });
  await expect(confirmPhaseTransition()).rejects.toThrow('Read interrupted');
  (NativeStorage.getItem as jest.Mock).mockImplementation(read);
  expect(await NativeStorage.getItem(KEY)).toBe(before);
});

test('malformed progress never disappears behind the legacy default-state fallback', async () => {
  await NativeStorage.setItem(KEY, '{broken');
  await expect(getPendingCeremonies()).rejects.toThrow();
  await expect(acknowledgeCeremony('0:phase:2')).rejects.toThrow();
  expect(await NativeStorage.getItem(KEY)).toBe('{broken');
});

test('legacy completed phases and endings do not suddenly replay on upgrade', async () => {
  await seed({ currentPhase: 5, pendingPhaseTransition: null,
    postRevelation: true, finalPuzzleCompleted: true, houseCompletionCelebrated: true });
  expect(await getPendingCeremonies()).toEqual([]);
  await markFinalPuzzleCompleted();
  await markPostRevelation();
  expect(await getPendingCeremonies()).toEqual([]);
});

test('house detection stays uncelebrated until its own final page is acknowledged', async () => {
  await seed({ houseCompleted: true });
  const [first, duplicate] = await Promise.all([queueHouseCeremony(), queueHouseCeremony()]);
  expect(first).toEqual(duplicate);
  expect((await saved()).houseCompletionCelebrated).not.toBe(true);
  await confirmPhaseTransition();
  await acknowledgeCeremony('0:phase:2');
  expect((await saved()).houseCompletionCelebrated).not.toBe(true);
  await acknowledgeCeremony(first!.id);
  expect((await saved()).houseCompletionCelebrated).toBe(true);
  expect(await queueHouseCeremony()).toBeNull();
});

test('a queued house scene keeps its original identity if the world phase changes', async () => {
  await seed({ houseCompleted: true });
  const first = await queueHouseCeremony();
  await confirmPhaseTransition();
  expect(await queueHouseCeremony()).toEqual(first);
  expect((await getPendingCeremonies()).filter(entry => entry.kind === 'house')).toHaveLength(1);
});

test('an unknown or repeated completion cannot consume another queued ceremony', async () => {
  await seed({ houseCompleted: true });
  await confirmPhaseTransition();
  const house = await queueHouseCeremony();
  await acknowledgeCeremony('stale-component');
  expect(await getPendingCeremonies()).toHaveLength(2);
  await acknowledgeCeremony('0:phase:2');
  await acknowledgeCeremony('0:phase:2');
  expect(await getPendingCeremonies()).toEqual([house]);
});

test('a failed completion before commit leaves the scene available after restart', async () => {
  await seed();
  await confirmPhaseTransition();
  failNextWrite(STORAGE_COMMIT_KEY);
  await expect(acknowledgeCeremony('0:phase:2')).rejects.toThrow('Storage unavailable');
  invalidateProgressCache();
  expect(await getPendingCeremonies()).toHaveLength(1);
});

test('committed house completion recovers both its receipt and queue removal', async () => {
  await seed({ houseCompleted: true });
  const house = await queueHouseCeremony();
  failNextWrite(KEY);
  await expect(acknowledgeCeremony(house!.id)).rejects.toBeInstanceOf(StorageRecoveryRequiredError);
  invalidateProgressCache();
  await acknowledgeCeremony(house!.id);
  expect(await getPendingCeremonies()).toEqual([]);
  expect((await saved()).houseCompletionCelebrated).toBe(true);
});

test('finale and revelation participate in the enclosing victory transaction', async () => {
  await seed({ currentPhase: 4, pendingPhaseTransition: null, finaleArmed: true });
  failNextWrite(KEY);
  await expect(runStorageTransaction('victory', async () => {
    await markFinalPuzzleCompleted();
    await markPostRevelation();
  })).rejects.toBeInstanceOf(StorageRecoveryRequiredError);
  invalidateProgressCache();
  expect((await getPendingCeremonies()).map(entry => entry.kind)).toEqual(['arrival', 'post_arrival']);
  expect(await saved()).toMatchObject({ currentPhase: 5, finalPuzzleCompleted: true,
    postRevelation: true, finaleArmed: false });
  await markFinalPuzzleCompleted();
  await markPostRevelation();
  expect(await getPendingCeremonies()).toHaveLength(2);
});

test('an aborted victory cannot persist an ending ceremony ahead of the victory', async () => {
  await seed({ currentPhase: 4, pendingPhaseTransition: null });
  failNextWrite(STORAGE_COMMIT_KEY);
  await expect(runStorageTransaction('victory', async () => {
    await markFinalPuzzleCompleted();
  })).rejects.toThrow('Storage unavailable');
  invalidateProgressCache();
  expect(await getPendingCeremonies()).toEqual([]);
  expect((await saved()).finalPuzzleCompleted).not.toBe(true);
});

test('new-cycle reset and its opening recover together without incrementing twice', async () => {
  await seed({ currentPhase: 5, pendingPhaseTransition: null, houseCompleted: true,
    houseCompletionCelebrated: true, finalPuzzleCompleted: true, postRevelation: true });
  failNextWrite(KEY);
  await expect(commitNewCycle()).rejects.toBeInstanceOf(StorageRecoveryRequiredError);
  invalidateProgressCache();
  await commitNewCycle();
  expect(await getPendingCeremonies()).toEqual([
    { id: '1:new_cycle:0', kind: 'new_cycle', phase: 0, cycle: 1 },
  ]);
  expect(await saved()).toMatchObject({ cycleCount: 1, currentPhase: 0, amber: 500 });
  await acknowledgeCeremony('1:new_cycle:0');
  expect((await saved()).cycleOpeningSeen).toBe(1);
});

test('cloud save preserves an owed ceremony with the phase that earned it', async () => {
  await seed();
  await confirmPhaseTransition();
  const backup = await collectLocalSaveData();
  await acknowledgeCeremony('0:phase:2');
  expect(await getPendingCeremonies()).toEqual([]);
  expect(await restoreFromCloudData(backup)).toBe(true);
  expect((await getPendingCeremonies()).map(entry => entry.id)).toEqual(['0:phase:2']);
  expect((await saved()).currentPhase).toBe(2);
});
