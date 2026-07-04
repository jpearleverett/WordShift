/**
 * Daily amber faucet — the local-day-bucketed "watch → amber" claim counter.
 * The service only tracks the count/cap; the caller grants the amber.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

let mockDay = '2026-07-04';
jest.mock('../services/dateUtils', () => ({
  getLocalDateString: () => mockDay,
}));

import {
  getDailyAmberStatus,
  isDailyAmberAvailable,
  recordDailyAmberClaim,
  clearDailyAmberReward,
  _clearDailyAmberCache,
} from '../services/dailyAmberReward';
import { DAILY_AMBER_DAILY_CAP, DAILY_AMBER_REWARD } from '../constants/gameBalance';

beforeEach(async () => {
  mockDay = '2026-07-04';
  (AsyncStorage.clear as jest.Mock)();
  await clearDailyAmberReward();
  _clearDailyAmberCache();
});

describe('dailyAmberReward', () => {
  test('fresh state: the full daily cap is available', async () => {
    const s = await getDailyAmberStatus();
    expect(s.available).toBe(true);
    expect(s.claimedToday).toBe(0);
    expect(s.remaining).toBe(DAILY_AMBER_DAILY_CAP);
    expect(s.cap).toBe(DAILY_AMBER_DAILY_CAP);
    expect(s.amountPerClaim).toBe(DAILY_AMBER_REWARD);
  });

  test('each claim decrements remaining and caps at the daily limit', async () => {
    for (let i = 1; i <= DAILY_AMBER_DAILY_CAP; i++) {
      const s = await recordDailyAmberClaim();
      expect(s.claimedToday).toBe(i);
      expect(s.remaining).toBe(DAILY_AMBER_DAILY_CAP - i);
    }
    expect(await isDailyAmberAvailable()).toBe(false);
  });

  test('recording beyond the cap never over-grants', async () => {
    for (let i = 0; i < DAILY_AMBER_DAILY_CAP + 3; i++) {
      await recordDailyAmberClaim();
    }
    const s = await getDailyAmberStatus();
    expect(s.claimedToday).toBe(DAILY_AMBER_DAILY_CAP);
    expect(s.remaining).toBe(0);
    expect(s.available).toBe(false);
  });

  test('the counter resets when the local calendar day rolls over', async () => {
    await recordDailyAmberClaim();
    expect((await getDailyAmberStatus()).claimedToday).toBe(1);
    // Next local day — the stale count no longer applies.
    mockDay = '2026-07-05';
    const s = await getDailyAmberStatus();
    expect(s.claimedToday).toBe(0);
    expect(s.available).toBe(true);
    expect(s.remaining).toBe(DAILY_AMBER_DAILY_CAP);
  });

  test('clearDailyAmberReward wipes the counter (Reset All)', async () => {
    await recordDailyAmberClaim();
    await clearDailyAmberReward();
    expect((await getDailyAmberStatus()).claimedToday).toBe(0);
    expect(await AsyncStorage.getItem('wordshift_daily_amber')).toBeNull();
  });
});
