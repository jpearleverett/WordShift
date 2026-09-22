import NativeStorage from '@react-native-async-storage/async-storage';
import {
  claimDailyAmberReward, createDailyAmberClaimId, getDailyAmberStatus, invalidateDailyAmberCache,
} from '../services/dailyAmberReward';
import { getFullProgress, invalidateProgressCache } from '../services/amberCurrency';
import { recoverPendingStorageTransaction, STORAGE_COMMIT_KEY } from '../services/persistenceStorage';
import { DAILY_AMBER_DAILY_CAP, DAILY_AMBER_REWARD } from '../constants/gameBalance';

jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());
let mockDay = '2026-07-04';
jest.mock('../services/dateUtils', () => ({
  ...jest.requireActual('../services/dateUtils'), getLocalDateString: () => mockDay,
}));

const DAILY_KEY = 'wordshift_daily_amber';
const PROGRESS_KEY = 'wordshift_home_progress';
const LEDGER_KEY = 'wordshift_amber_transactions';
const read = (NativeStorage.getItem as jest.Mock).getMockImplementation()!;
const write = (NativeStorage.setItem as jest.Mock).getMockImplementation()!;
const remove = (NativeStorage.removeItem as jest.Mock).getMockImplementation()!;

const balance = async () => (await getFullProgress()).amber;
const ledger = async (): Promise<unknown[]> => JSON.parse(await NativeStorage.getItem(LEDGER_KEY) ?? '[]');
function clearCaches(): void { invalidateDailyAmberCache(); invalidateProgressCache(); }

beforeEach(async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(read);
  (NativeStorage.setItem as jest.Mock).mockImplementation(write);
  (NativeStorage.removeItem as jest.Mock).mockImplementation(remove);
  await NativeStorage.clear();
  mockDay = '2026-07-04';
  clearCaches();
});

test('a daily claim saves its allowance, amber, lifetime earnings and ledger together', async () => {
  expect(await claimDailyAmberReward('earned-view-1')).toMatchObject({
    recorded: true, grantedAmount: DAILY_AMBER_REWARD, newBalance: DAILY_AMBER_REWARD,
    claimedToday: 1, remaining: DAILY_AMBER_DAILY_CAP - 1,
  });
  clearCaches();
  expect((await getFullProgress()).totalAmberEarned).toBe(DAILY_AMBER_REWARD);
  expect((await getDailyAmberStatus()).claimedToday).toBe(1);
  expect(await ledger()).toEqual([expect.objectContaining({ source: 'rewarded_daily_amber', amount: DAILY_AMBER_REWARD })]);
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
});

test('same-frame duplicate reward completions grant only once', async () => {
  const results = await Promise.all([claimDailyAmberReward('one-ad'), claimDailyAmberReward('one-ad')]);
  expect(results.map(result => result.grantedAmount)).toEqual([DAILY_AMBER_REWARD, 0]);
  expect(await balance()).toBe(DAILY_AMBER_REWARD);
  expect((await getDailyAmberStatus()).claimedToday).toBe(1);
  expect(await ledger()).toHaveLength(1);
});

test('fresh claims stop at the existing daily cap and resume on the next local day', async () => {
  for (let index = 0; index < DAILY_AMBER_DAILY_CAP; index += 1) {
    expect((await claimDailyAmberReward(`view-${index}`)).recorded).toBe(true);
  }
  expect((await claimDailyAmberReward('over-cap')).grantedAmount).toBe(0);
  mockDay = '2026-07-05';
  expect((await claimDailyAmberReward('next-day')).claimedToday).toBe(1);
  expect(await balance()).toBe(DAILY_AMBER_REWARD * (DAILY_AMBER_DAILY_CAP + 1));
});

test('retrying a saved reward after midnight does not spend the new day allowance', async () => {
  await claimDailyAmberReward('before-midnight');
  mockDay = '2026-07-05';
  clearCaches();
  expect(await claimDailyAmberReward('before-midnight')).toMatchObject({ recorded: false, grantedAmount: 0, claimedToday: 0 });
  expect(await balance()).toBe(DAILY_AMBER_REWARD);
});

test('legacy counters retain claims already consumed before atomic rewards were introduced', async () => {
  await NativeStorage.setItem(DAILY_KEY, JSON.stringify({ date: mockDay, count: DAILY_AMBER_DAILY_CAP }));
  expect((await claimDailyAmberReward('new-view')).recorded).toBe(false);
  expect(await balance()).toBe(0);
});

test('failure to commit the journal leaves both the allowance and balance available for retry', async () => {
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === STORAGE_COMMIT_KEY) throw new Error('disk full');
    return write(key, value);
  });
  await expect(claimDailyAmberReward('earned-view')).rejects.toThrow('disk full');
  expect(await balance()).toBe(0);
  expect((await getDailyAmberStatus()).claimedToday).toBe(0);
  expect(await ledger()).toEqual([]);
  (NativeStorage.setItem as jest.Mock).mockImplementation(write);
  expect((await claimDailyAmberReward('earned-view')).grantedAmount).toBe(DAILY_AMBER_REWARD);
});

test.each([PROGRESS_KEY, LEDGER_KEY, DAILY_KEY])('an interrupted %s write recovers the original reward without granting again', async keyToFail => {
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === keyToFail && !failed) { failed = true; throw new Error('interrupted'); }
    return write(key, value);
  });
  await expect(claimDailyAmberReward('earned-view')).rejects.toThrow('need recovery');
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
  expect(await claimDailyAmberReward('earned-view')).toMatchObject({ recorded: false, grantedAmount: 0, newBalance: DAILY_AMBER_REWARD, claimedToday: 1 });
  expect(await ledger()).toHaveLength(1);
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
});

test('repeated recovery failures preserve the earned reward for cold-start recovery', async () => {
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === DAILY_KEY) throw new Error('still full');
    return write(key, value);
  });
  await expect(claimDailyAmberReward('earned-view')).rejects.toThrow('need recovery');
  await expect(claimDailyAmberReward('earned-view')).rejects.toThrow('need recovery');
  await expect(recoverPendingStorageTransaction()).rejects.toThrow('need recovery');
  (NativeStorage.setItem as jest.Mock).mockImplementation(write);
  clearCaches();
  expect(await recoverPendingStorageTransaction()).toBe(true);
  expect(await balance()).toBe(DAILY_AMBER_REWARD);
  expect((await getDailyAmberStatus()).claimedToday).toBe(1);
  expect((await claimDailyAmberReward('earned-view')).grantedAmount).toBe(0);
  expect(await ledger()).toHaveLength(1);
});

test('failure removing a fully applied journal still retries the same reward', async () => {
  let failed = false;
  (NativeStorage.removeItem as jest.Mock).mockImplementation(async key => {
    if (key === STORAGE_COMMIT_KEY && !failed) { failed = true; throw new Error('interrupted'); }
    return remove(key);
  });
  await expect(claimDailyAmberReward('earned-view')).rejects.toThrow('need recovery');
  expect((await claimDailyAmberReward('earned-view')).grantedAmount).toBe(0);
  expect(await balance()).toBe(DAILY_AMBER_REWARD);
  expect(await ledger()).toHaveLength(1);
});

test.each(['{bad-json', JSON.stringify({ date: mockDay, count: -1 }), JSON.stringify({ date: mockDay, count: 0, claimReceipts: false })])(
  'an unreadable daily record is not reset into another available reward (%s)', async stored => {
    await NativeStorage.setItem(DAILY_KEY, stored);
    await expect(claimDailyAmberReward('new-view')).rejects.toThrow();
    expect(await balance()).toBe(0);
    expect(await NativeStorage.getItem(DAILY_KEY)).toBe(stored);
  },
);

test('a rejected daily record read aborts the whole credit', async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(async key => {
    if (key === DAILY_KEY) throw new Error('cannot read');
    return read(key);
  });
  await expect(claimDailyAmberReward('new-view')).rejects.toThrow('cannot read');
  expect(await balance()).toBe(0);
  expect(await ledger()).toEqual([]);
});

test('each new claim gets its own nonempty receipt identity', () => {
  expect(new Set(Array.from({ length: 20 }, createDailyAmberClaimId)).size).toBe(20);
});

test('receipts older than yesterday are pruned, while a midnight retry stays idempotent (P4)', async () => {
  mockDay = '2026-07-01';
  expect((await claimDailyAmberReward('day-1-view')).recorded).toBe(true);
  mockDay = '2026-07-02';
  expect((await claimDailyAmberReward('day-2-view')).recorded).toBe(true);
  // Just after midnight: yesterday's interrupted reward is still recognised.
  mockDay = '2026-07-03';
  expect((await claimDailyAmberReward('day-2-view')).grantedAmount).toBe(0);
  expect((await claimDailyAmberReward('day-3-view')).recorded).toBe(true);
  const stored = JSON.parse((await NativeStorage.getItem(DAILY_KEY))!);
  expect(stored.claimReceipts).toEqual(['day-2-view', 'day-3-view']);
  expect(stored.claimReceiptDays).toEqual({ 'day-2-view': '2026-07-02', 'day-3-view': '2026-07-03' });
  // A month of daily claims keeps the record bounded.
  for (let day = 4; day <= 31; day += 1) {
    mockDay = `2026-07-${String(day).padStart(2, '0')}`;
    for (let index = 0; index < DAILY_AMBER_DAILY_CAP; index += 1) {
      expect((await claimDailyAmberReward(`d${day}-${index}`)).recorded).toBe(true);
    }
  }
  const after = JSON.parse((await NativeStorage.getItem(DAILY_KEY))!);
  expect(after.claimReceipts.length).toBeLessThanOrEqual(2 * DAILY_AMBER_DAILY_CAP);
  expect(Object.keys(after.claimReceiptDays).sort()).toEqual([...after.claimReceipts].sort());
});

test('legacy receipts without a recorded day are dated to the record day and pruned later', async () => {
  await NativeStorage.setItem(DAILY_KEY, JSON.stringify({ date: '2026-07-03', count: 1, claimReceipts: ['legacy-view'] }));
  mockDay = '2026-07-04';
  expect((await claimDailyAmberReward('legacy-view')).grantedAmount).toBe(0);
  expect((await claimDailyAmberReward('fresh-view')).recorded).toBe(true);
  expect(JSON.parse((await NativeStorage.getItem(DAILY_KEY))!).claimReceipts).toEqual(['legacy-view', 'fresh-view']);
  mockDay = '2026-07-06';
  expect((await claimDailyAmberReward('later-view')).recorded).toBe(true);
  expect(JSON.parse((await NativeStorage.getItem(DAILY_KEY))!).claimReceipts).toEqual(['later-view']);
});
