/**
 * Supporter subscription monthly amber stipend — idempotent per LOCAL month,
 * gated on the `supporter` entitlement, credits the reward balance only.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

let mockDay = '2026-07-04';
jest.mock('../services/dateUtils', () => ({
  getLocalDateString: () => mockDay,
}));

let isSupporter = false;
jest.mock('../services/entitlements', () => ({
  isSupporterSync: () => isSupporter,
}));

jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());
import { getFullProgress, invalidateProgressCache } from '../services/amberCurrency';
import { recoverPendingStorageTransaction, STORAGE_COMMIT_KEY } from '../services/persistenceStorage';

const originalRead = (AsyncStorage.getItem as jest.Mock).getMockImplementation()!;
const originalWrite = (AsyncStorage.setItem as jest.Mock).getMockImplementation()!;
const balance = async () => (await getFullProgress()).amber;
const payments = async () => JSON.parse(await AsyncStorage.getItem('wordshift_amber_transactions') ?? '[]');

import {
  claimSupporterStipendIfDue,
  isSupporterStipendDue,
  getLocalMonthString,
  clearSupporterState,
  invalidateSupporterCache,
} from '../services/supporterStipend';
import { SUPPORTER_MONTHLY_AMBER } from '../constants/gameBalance';

beforeEach(async () => {
  mockDay = '2026-07-04';
  isSupporter = false;
  (AsyncStorage.getItem as jest.Mock).mockImplementation(originalRead);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  await AsyncStorage.clear();
  await clearSupporterState();
  invalidateProgressCache();
  const progress = await getFullProgress();
  await AsyncStorage.setItem('wordshift_home_progress', JSON.stringify({ ...progress, amber: 1000 }));
  invalidateProgressCache();
});

describe('supporterStipend', () => {
  test('a backwards month never grants another stipend or replaces the receipt', async () => {
    isSupporter = true;
    await claimSupporterStipendIfDue();
    mockDay = '2026-06-30';
    invalidateSupporterCache();
    expect(await isSupporterStipendDue()).toBe(false);
    expect(await claimSupporterStipendIfDue()).toBeNull();
    mockDay = '2026-07-05';
    expect(await claimSupporterStipendIfDue()).toBeNull();
    expect(await payments()).toHaveLength(1);
  });
  test('getLocalMonthString is the local YYYY-MM (never UTC)', () => {
    mockDay = '2026-12-31';
    expect(getLocalMonthString()).toBe('2026-12');
  });

  test('non-supporter: never due, claim is a no-op', async () => {
    expect(await isSupporterStipendDue()).toBe(false);
    expect(await claimSupporterStipendIfDue()).toBeNull();
    expect(await payments()).toEqual([]);
  });

  test('supporter first month: due, grants the stipend once', async () => {
    isSupporter = true;
    expect(await isSupporterStipendDue()).toBe(true);
    const grant = await claimSupporterStipendIfDue();
    expect(grant).not.toBeNull();
    expect(grant!.amount).toBe(SUPPORTER_MONTHLY_AMBER);
    expect(grant!.month).toBe('2026-07');
    expect(await payments()).toEqual([expect.objectContaining({ amount: SUPPORTER_MONTHLY_AMBER, source: 'supporter_stipend' })]);
    expect(await balance()).toBe(1000 + SUPPORTER_MONTHLY_AMBER);
  });

  test('idempotent within a month — a second claim is a no-op', async () => {
    isSupporter = true;
    await claimSupporterStipendIfDue();
    expect(await isSupporterStipendDue()).toBe(false);
    expect(await claimSupporterStipendIfDue()).toBeNull();
    expect(await payments()).toHaveLength(1);
  });

  test('a new local month grants again', async () => {
    isSupporter = true;
    await claimSupporterStipendIfDue();
    mockDay = '2026-08-01';
    invalidateSupporterCache(); // simulate a fresh session / restore reading disk
    expect(await isSupporterStipendDue()).toBe(true);
    const grant = await claimSupporterStipendIfDue();
    expect(grant!.month).toBe('2026-08');
    expect(await payments()).toHaveLength(2);
  });

  test('lapsing the subscription stops future stipends', async () => {
    isSupporter = true;
    await claimSupporterStipendIfDue();
    isSupporter = false;
    mockDay = '2026-08-01';
    invalidateSupporterCache();
    expect(await isSupporterStipendDue()).toBe(false);
    expect(await claimSupporterStipendIfDue()).toBeNull();
    expect(await payments()).toHaveLength(1);
  });

  test('clearSupporterState wipes the record (Reset All)', async () => {
    isSupporter = true;
    await claimSupporterStipendIfDue();
    await clearSupporterState();
    expect(await isSupporterStipendDue()).toBe(true);
  });

  test('overlapping startup and purchase callbacks grant this month only once', async () => {
    isSupporter = true;
    const results = await Promise.all([claimSupporterStipendIfDue(), claimSupporterStipendIfDue()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await balance()).toBe(1000 + SUPPORTER_MONTHLY_AMBER);
    expect(await payments()).toHaveLength(1);
  });

  test('a failed journal leaves both the balance and monthly eligibility unchanged', async () => {
    isSupporter = true;
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
      if (key === STORAGE_COMMIT_KEY) return Promise.reject(new Error('disk full'));
      return originalWrite(key, value);
    });
    await expect(claimSupporterStipendIfDue()).rejects.toThrow('disk full');
    expect(await balance()).toBe(1000);
    expect(await payments()).toEqual([]);
    expect(await isSupporterStipendDue()).toBe(true);
    (AsyncStorage.setItem as jest.Mock).mockImplementation(originalWrite);
    await claimSupporterStipendIfDue();
    expect(await balance()).toBe(1000 + SUPPORTER_MONTHLY_AMBER);
  });

  test.each(['wordshift_home_progress', 'wordshift_amber_transactions', 'wordshift_supporter'])(
    'cold recovery after interrupted %s write pays exactly once', async keyToFail => {
      isSupporter = true;
      (AsyncStorage.setItem as jest.Mock).mockImplementation((key, value) => {
        if (key === keyToFail) return Promise.reject(new Error('interrupted apply'));
        return originalWrite(key, value);
      });
      await expect(claimSupporterStipendIfDue()).rejects.toThrow('recovery');
      expect(await AsyncStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
      (AsyncStorage.setItem as jest.Mock).mockImplementation(originalWrite);
      invalidateSupporterCache();
      invalidateProgressCache();
      await recoverPendingStorageTransaction();
      expect(await claimSupporterStipendIfDue()).toBeNull();
      expect(await balance()).toBe(1000 + SUPPORTER_MONTHLY_AMBER);
      expect(await payments()).toHaveLength(1);
      expect(await AsyncStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
    },
  );

  test('unreadable monthly ownership fails closed before granting', async () => {
    isSupporter = true;
    await AsyncStorage.setItem('wordshift_supporter', '{broken');
    invalidateSupporterCache();
    await expect(claimSupporterStipendIfDue()).rejects.toThrow();
    expect(await balance()).toBe(1000);
    expect(await payments()).toEqual([]);
  });
});
