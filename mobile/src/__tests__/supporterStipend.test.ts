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

let balance = 1000;
const awardBonusAmber = jest.fn(async (amount: number, _source?: string) => {
  balance += amount;
  return balance;
});
jest.mock('../services/amberCurrency', () => ({
  awardBonusAmber: (amount: number, source: string) => awardBonusAmber(amount, source),
}));

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
  balance = 1000;
  awardBonusAmber.mockClear();
  (AsyncStorage.clear as jest.Mock)();
  await clearSupporterState();
});

describe('supporterStipend', () => {
  test('getLocalMonthString is the local YYYY-MM (never UTC)', () => {
    mockDay = '2026-12-31';
    expect(getLocalMonthString()).toBe('2026-12');
  });

  test('non-supporter: never due, claim is a no-op', async () => {
    expect(await isSupporterStipendDue()).toBe(false);
    expect(await claimSupporterStipendIfDue()).toBeNull();
    expect(awardBonusAmber).not.toHaveBeenCalled();
  });

  test('supporter first month: due, grants the stipend once', async () => {
    isSupporter = true;
    expect(await isSupporterStipendDue()).toBe(true);
    const grant = await claimSupporterStipendIfDue();
    expect(grant).not.toBeNull();
    expect(grant!.amount).toBe(SUPPORTER_MONTHLY_AMBER);
    expect(grant!.month).toBe('2026-07');
    expect(awardBonusAmber).toHaveBeenCalledTimes(1);
    expect(awardBonusAmber).toHaveBeenCalledWith(SUPPORTER_MONTHLY_AMBER, 'supporter_stipend');
  });

  test('idempotent within a month — a second claim is a no-op', async () => {
    isSupporter = true;
    await claimSupporterStipendIfDue();
    expect(await isSupporterStipendDue()).toBe(false);
    expect(await claimSupporterStipendIfDue()).toBeNull();
    expect(awardBonusAmber).toHaveBeenCalledTimes(1);
  });

  test('a new local month grants again', async () => {
    isSupporter = true;
    await claimSupporterStipendIfDue();
    mockDay = '2026-08-01';
    invalidateSupporterCache(); // simulate a fresh session / restore reading disk
    expect(await isSupporterStipendDue()).toBe(true);
    const grant = await claimSupporterStipendIfDue();
    expect(grant!.month).toBe('2026-08');
    expect(awardBonusAmber).toHaveBeenCalledTimes(2);
  });

  test('lapsing the subscription stops future stipends', async () => {
    isSupporter = true;
    await claimSupporterStipendIfDue();
    isSupporter = false;
    mockDay = '2026-08-01';
    invalidateSupporterCache();
    expect(await isSupporterStipendDue()).toBe(false);
    expect(await claimSupporterStipendIfDue()).toBeNull();
    expect(awardBonusAmber).toHaveBeenCalledTimes(1);
  });

  test('clearSupporterState wipes the record (Reset All)', async () => {
    isSupporter = true;
    await claimSupporterStipendIfDue();
    await clearSupporterState();
    expect(await isSupporterStipendDue()).toBe(true);
  });
});
