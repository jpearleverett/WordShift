import NativeStorage from '@react-native-async-storage/async-storage';
import { getFullProgress, invalidateProgressCache } from '../services/amberCurrency';
import {
  commitTendPurchase, getNextTendingInfo, invalidateTendingCache,
  loadTendingState, setPhase5CaughtUp,
} from '../services/tending';
import { STORAGE_COMMIT_KEY, StorageRecoveryRequiredError, recoverPendingStorageTransaction } from '../services/persistenceStorage';

jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());
jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn() }));
const PROGRESS = 'wordshift_home_progress';
const TENDING = 'wordshift_tending';
const LEDGER = 'wordshift_amber_transactions';
const originalSet = jest.mocked(NativeStorage.setItem).getMockImplementation()!;
const originalGet = jest.mocked(NativeStorage.getItem).getMockImplementation()!;
const originalRemove = jest.mocked(NativeStorage.removeItem).getMockImplementation()!;
async function read(key: string) { return JSON.parse((await NativeStorage.getItem(key)) ?? 'null'); }
async function seed(level = 0, amber = 1000, phase = 5) {
  const progress = await getFullProgress();
  await NativeStorage.setItem(PROGRESS, JSON.stringify({ ...progress, amber, currentPhase: phase }));
  await NativeStorage.setItem(TENDING, JSON.stringify({ level, totalAmberTended: 100, lastTendDate: null, milestonesSeen: [], caughtUp: { fox: 2 } }));
  invalidateProgressCache(); invalidateTendingCache();
  return getNextTendingInfo(await loadTendingState());
}
beforeEach(async () => {
  jest.mocked(NativeStorage.setItem).mockImplementation(originalSet);
  jest.mocked(NativeStorage.getItem).mockImplementation(originalGet);
  jest.mocked(NativeStorage.removeItem).mockImplementation(originalRemove);
  await NativeStorage.clear();
  invalidateProgressCache(); invalidateTendingCache();
});

test('same-level concurrent taps debit and deepen once, including its milestone', async () => {
  const next = await seed(2);
  const results = await Promise.all([commitTendPurchase(next.nextLevel, next.cost), commitTendPurchase(next.nextLevel, next.cost)]);
  expect(results).toEqual(expect.arrayContaining([expect.objectContaining({ success: true, level: 3, milestone: 3, recovered: false }), expect.objectContaining({ success: true, recovered: true, amountSpent: 0 })]));
  expect((await read(PROGRESS)).amber).toBe(1000 - next.cost);
  expect(await read(TENDING)).toMatchObject({ level: 3, totalAmberTended: 100 + next.cost, milestonesSeen: [3], caughtUp: { fox: 2 } });
  expect((await read(LEDGER)).filter((entry: { source: string }) => entry.source === 'tending')).toHaveLength(1);
});

test('failure before durable commit leaves both amber and shrine unchanged, including warm caches', async () => {
  const next = await seed();
  jest.mocked(NativeStorage.setItem).mockImplementation(async (key, value) => {
    if (key === STORAGE_COMMIT_KEY) throw new Error('disk full');
    return originalSet(key, value);
  });
  await expect(commitTendPurchase(next.nextLevel, next.cost)).rejects.toThrow('disk full');
  expect((await getFullProgress()).amber).toBe(1000);
  expect((await loadTendingState()).level).toBe(0);
  expect(await NativeStorage.getItem(LEDGER)).toBeNull();
  jest.mocked(NativeStorage.setItem).mockImplementation(originalSet);
  expect(await commitTendPurchase(next.nextLevel, next.cost)).toMatchObject({ success: true, level: 1, recovered: false });
});

test.each([PROGRESS, LEDGER, TENDING, STORAGE_COMMIT_KEY])('cold recovery after interrupted apply at %s grants the level without charging again', async failedKey => {
  const next = await seed(2);
  if (failedKey === STORAGE_COMMIT_KEY) {
    jest.mocked(NativeStorage.removeItem).mockImplementation(async key => {
      if (key === failedKey) throw new Error('interrupted cleanup');
      return originalRemove(key);
    });
  } else {
    jest.mocked(NativeStorage.setItem).mockImplementation(async (key, value) => {
      if (key === failedKey) throw new Error('interrupted write');
      return originalSet(key, value);
    });
  }
  await expect(commitTendPurchase(next.nextLevel, next.cost)).rejects.toBeInstanceOf(StorageRecoveryRequiredError);
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
  jest.mocked(NativeStorage.setItem).mockImplementation(originalSet);
  jest.mocked(NativeStorage.removeItem).mockImplementation(originalRemove);
  invalidateProgressCache(); invalidateTendingCache();
  await recoverPendingStorageTransaction();
  expect(await commitTendPurchase(next.nextLevel, next.cost)).toMatchObject({ success: true, newBalance: 1000 - next.cost, level: 3, milestone: 3, recovered: true, amountSpent: 0 });
  expect((await read(TENDING)).level).toBe(3);
  expect((await read(LEDGER)).filter((entry: { source: string }) => entry.source === 'tending')).toHaveLength(1);
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
});

test.each(['read', 'corrupt'])('an unreadable shrine fails closed (%s)', async fault => {
  const next = await seed();
  if (fault === 'corrupt') await NativeStorage.setItem(TENDING, '{bad json');
  else jest.mocked(NativeStorage.getItem).mockImplementation(async key => {
    if (key === TENDING) throw new Error('read unavailable');
    return originalGet(key);
  });
  await expect(commitTendPurchase(next.nextLevel, next.cost)).rejects.toThrow();
  expect((await read(PROGRESS)).amber).toBe(1000);
  expect(await NativeStorage.getItem(LEDGER)).toBeNull();
});

test('stale prices, skipped levels, early phase and insufficient amber do not charge', async () => {
  const next = await seed();
  expect(await commitTendPurchase(next.nextLevel, next.cost + 1)).toMatchObject({ success: false, error: 'changed' });
  expect(await commitTendPurchase(next.nextLevel + 1, next.cost)).toMatchObject({ success: false, error: 'changed' });
  await seed(0, 0);
  expect(await commitTendPurchase(next.nextLevel, next.cost)).toMatchObject({ success: false, error: 'insufficient' });
  await seed(0, 1000, 4);
  expect(await commitTendPurchase(next.nextLevel, next.cost)).toMatchObject({ success: false, error: 'unavailable' });
  expect(await NativeStorage.getItem(LEDGER)).toBeNull();
});

test('concurrent dialogue progress cannot overwrite a purchased shrine level', async () => {
  const next = await seed();
  await Promise.all([commitTendPurchase(next.nextLevel, next.cost), setPhase5CaughtUp('owl', 4)]);
  expect(await read(TENDING)).toMatchObject({ level: 1, totalAmberTended: 100 + next.cost, caughtUp: { fox: 2, owl: 4 } });
  expect((await read(PROGRESS)).amber).toBe(1000 - next.cost);
});
