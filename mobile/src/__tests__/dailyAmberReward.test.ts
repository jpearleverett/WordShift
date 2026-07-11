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
  dailyAmberGrantFor,
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

  describe('recorded flag (the grant gate)', () => {
    test('claims within the cap report recorded: true', async () => {
      for (let i = 1; i <= DAILY_AMBER_DAILY_CAP; i++) {
        const r = await recordDailyAmberClaim();
        expect(r.recorded).toBe(true);
        expect(r.claimedToday).toBe(i);
      }
    });

    test('the claim AT the cap reports recorded: false with the capped status', async () => {
      for (let i = 0; i < DAILY_AMBER_DAILY_CAP; i++) {
        await recordDailyAmberClaim();
      }
      const r = await recordDailyAmberClaim();
      expect(r.recorded).toBe(false);
      expect(r.claimedToday).toBe(DAILY_AMBER_DAILY_CAP);
      expect(r.remaining).toBe(0);
      expect(r.available).toBe(false);
    });

    test('every claim PAST the cap keeps reporting recorded: false', async () => {
      for (let i = 0; i < DAILY_AMBER_DAILY_CAP; i++) {
        await recordDailyAmberClaim();
      }
      for (let i = 0; i < 3; i++) {
        expect((await recordDailyAmberClaim()).recorded).toBe(false);
      }
      expect((await getDailyAmberStatus()).claimedToday).toBe(DAILY_AMBER_DAILY_CAP);
    });

    test('recorded becomes true again when the local day rolls over', async () => {
      for (let i = 0; i < DAILY_AMBER_DAILY_CAP; i++) {
        await recordDailyAmberClaim();
      }
      expect((await recordDailyAmberClaim()).recorded).toBe(false);
      mockDay = '2026-07-05';
      const r = await recordDailyAmberClaim();
      expect(r.recorded).toBe(true);
      expect(r.claimedToday).toBe(1);
    });

    test('concurrent claims record at most one (in-flight guard)', async () => {
      const [a, b] = await Promise.all([recordDailyAmberClaim(), recordDailyAmberClaim()]);
      expect([a.recorded, b.recorded].filter(Boolean)).toHaveLength(1);
      expect((await getDailyAmberStatus()).claimedToday).toBe(1);
    });
  });

  describe('dailyAmberGrantFor (pure grant decision)', () => {
    test('grants the per-claim amount only for a recorded claim', () => {
      expect(
        dailyAmberGrantFor({ recorded: true, amountPerClaim: DAILY_AMBER_REWARD }),
      ).toBe(DAILY_AMBER_REWARD);
      expect(
        dailyAmberGrantFor({ recorded: false, amountPerClaim: DAILY_AMBER_REWARD }),
      ).toBe(0);
    });

    test('a real capped claim result yields a zero grant (no over-grant for Patrons)', async () => {
      for (let i = 0; i < DAILY_AMBER_DAILY_CAP; i++) {
        expect(dailyAmberGrantFor(await recordDailyAmberClaim())).toBe(DAILY_AMBER_REWARD);
      }
      // The tap past the cap (cheap for a Patron, who skips the ad) grants nothing.
      expect(dailyAmberGrantFor(await recordDailyAmberClaim())).toBe(0);
    });
  });
});
