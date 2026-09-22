import NativeStorage from '@react-native-async-storage/async-storage';
import { getFullProgress, invalidateProgressCache } from '../services/amberCurrency';
import { claimVictoryDouble, getVictoryDoubleAmount } from '../services/victoryDouble';
import { recoverPendingStorageTransaction, STORAGE_COMMIT_KEY } from '../services/persistenceStorage';

jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());
jest.mock('../services/victoryPersistence', () => ({ VICTORY_RECEIPT_KEY: 'wordshift_victory_receipt' }));
const receiptKey = 'wordshift_victory_receipt';
const progressKey = 'wordshift_home_progress';
const ledgerKey = 'wordshift_amber_transactions';
const originalWrite = (NativeStorage.setItem as jest.Mock).getMockImplementation()!;
const originalRead = (NativeStorage.getItem as jest.Mock).getMockImplementation()!;

beforeEach(async () => {
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  (NativeStorage.getItem as jest.Mock).mockImplementation(originalRead);
  await NativeStorage.clear();
  invalidateProgressCache();
  await NativeStorage.setItem(progressKey, JSON.stringify({ ...await getFullProgress(), amber: 100 }));
  await NativeStorage.setItem(receiptKey, JSON.stringify({
    id: 'win-1', result: { harvestBatchId: 'win-1', amberEarned: 30 },
  }));
  invalidateProgressCache();
});

test('overlapping callbacks and reopening the result grant the saved bonus once', async () => {
  expect(await Promise.all([claimVictoryDouble('win-1'), claimVictoryDouble('win-1')])).toEqual([
    { status: 'claimed', amount: 30, newBalance: 130 },
    { status: 'already_claimed', amount: 0, newBalance: 130 },
  ]);
  invalidateProgressCache();
  expect((await claimVictoryDouble('win-1')).status).toBe('already_claimed');
  expect((await getFullProgress()).amber).toBe(130);
  expect(JSON.parse(await NativeStorage.getItem(ledgerKey) ?? '[]')).toHaveLength(1);
});

test.each(['', 'older-win'])('a missing or stale completion %s grants nothing', async id => {
  expect(await claimVictoryDouble(id)).toEqual({ status: 'unavailable' });
  expect((await getFullProgress()).amber).toBe(100);
});

test('a failure before the journal commits leaves the claim retryable without phantom amber', async () => {
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === STORAGE_COMMIT_KEY) throw new Error('Storage full');
    return originalWrite(key, value);
  });
  await expect(claimVictoryDouble('win-1')).rejects.toThrow();
  expect((await getFullProgress()).amber).toBe(100);
  expect(JSON.parse(await NativeStorage.getItem(receiptKey) ?? '{}').rewardedDoubleClaimed).toBeUndefined();
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  expect(await claimVictoryDouble('win-1')).toMatchObject({ status: 'claimed', newBalance: 130 });
});

test.each([progressKey, ledgerKey, receiptKey])('interrupted application at %s recovers exactly one bonus', async failKey => {
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === failKey) throw new Error('Storage full');
    return originalWrite(key, value);
  });
  await expect(claimVictoryDouble('win-1')).rejects.toThrow();
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  invalidateProgressCache();
  await recoverPendingStorageTransaction();
  expect(await claimVictoryDouble('win-1')).toEqual({ status: 'already_claimed', amount: 0, newBalance: 130 });
  expect(JSON.parse(await NativeStorage.getItem(ledgerKey) ?? '[]')).toHaveLength(1);
});

test('a failed receipt read cannot be mistaken for an unclaimed reward', async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(async key => {
    if (key === receiptKey) throw new Error('Read failed');
    return originalRead(key);
  });
  await expect(claimVictoryDouble('win-1')).rejects.toThrow();
  (NativeStorage.getItem as jest.Mock).mockImplementation(originalRead);
  expect((await getFullProgress()).amber).toBe(100);
  expect(await NativeStorage.getItem(ledgerKey)).toBeNull();
});

test('the 2x doubles the per-puzzle share only, never the one-time windfalls (MON-7)', async () => {
  await NativeStorage.setItem(receiptKey, JSON.stringify({
    id: 'win-2', result: {
      harvestBatchId: 'win-2', amberEarned: 30 + 150 + 50 + 30,
      milestoneBonus: 150, firstCompletionBonus: 50, streakMilestoneBonus: 30,
    },
  }));
  expect(await claimVictoryDouble('win-2')).toEqual({ status: 'claimed', amount: 30, newBalance: 130 });
  // Idempotent: a replay credits nothing more.
  expect(await claimVictoryDouble('win-2')).toMatchObject({ status: 'already_claimed', amount: 0 });
  invalidateProgressCache();
  expect((await getFullProgress()).amber).toBe(130);
});

test('an older receipt without the windfall fields still doubles the whole amount', async () => {
  expect(await claimVictoryDouble('win-1')).toEqual({ status: 'claimed', amount: 30, newBalance: 130 });
});

test('getVictoryDoubleAmount ignores malformed windfall fields and never goes negative', () => {
  expect(getVictoryDoubleAmount({ amberEarned: 40, milestoneBonus: -5, firstCompletionBonus: NaN })).toBe(40);
  expect(getVictoryDoubleAmount({ amberEarned: 40, milestoneBonus: 100 })).toBe(0);
  expect(getVictoryDoubleAmount(null)).toBe(0);
});
