import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocalDateString, getLocalDateStringDaysAgo } from '../services/dateUtils';
import {
  claimDailyLoginReward,
  peekDailyLoginReward,
  isDailyLoginRewardAvailable,
  _clearDailyLoginCache,
  DAILY_LOGIN_REWARDS,
  DAILY_LOGIN_CYCLE_LENGTH,
  COMEBACK_BONUS_AMBER,
} from '../services/dailyLoginReward';

const STORAGE_KEY = 'wordshift_daily_login';

// Inline AsyncStorage mock
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
        Object.keys(store).forEach((key) => delete store[key]);
        return Promise.resolve();
      }),
    },
  };
});

// Mock amber crediting — return a deterministic "new balance" of 1000 + amount.
const awardBonusAmber = jest.fn((amount: number, _source: string) => Promise.resolve(1000 + amount));
jest.mock('../services/amberCurrency', () => ({
  awardBonusAmber: (amount: number, source: string) => awardBonusAmber(amount, source),
}));

async function seedState(daysAgo: number, cycleDay: number): Promise<void> {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ lastClaimedDate: getLocalDateStringDaysAgo(daysAgo), cycleDay })
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
  _clearDailyLoginCache();
  awardBonusAmber.mockClear();
});

describe('dailyLoginReward', () => {
  test('reward table is a 7-day escalating cycle', () => {
    expect(DAILY_LOGIN_CYCLE_LENGTH).toBe(7);
    expect(DAILY_LOGIN_REWARDS).toHaveLength(7);
    // strictly non-decreasing, with a Day-7 jackpot bigger than Day 1
    for (let i = 1; i < DAILY_LOGIN_REWARDS.length; i++) {
      expect(DAILY_LOGIN_REWARDS[i]).toBeGreaterThanOrEqual(DAILY_LOGIN_REWARDS[i - 1]);
    }
    expect(DAILY_LOGIN_REWARDS[6]).toBeGreaterThan(DAILY_LOGIN_REWARDS[0]);
  });

  test('first ever claim grants Day 1 and credits amber', async () => {
    const grant = await claimDailyLoginReward();
    expect(grant).not.toBeNull();
    expect(grant!.day).toBe(1);
    expect(grant!.amount).toBe(DAILY_LOGIN_REWARDS[0]);
    expect(grant!.reset).toBe(false);
    expect(grant!.isFirstClaim).toBe(true);
    expect(grant!.newBalance).toBe(1000 + DAILY_LOGIN_REWARDS[0]);
    expect(awardBonusAmber).toHaveBeenCalledWith(DAILY_LOGIN_REWARDS[0], 'daily_login');
  });

  test('isFirstClaim is true exactly once — the next-day claim is a returner', async () => {
    const first = await claimDailyLoginReward();
    expect(first!.isFirstClaim).toBe(true);
    // Simulate the next local day: rewrite the stored claim to "yesterday".
    await seedState(1, first!.day);
    _clearDailyLoginCache();
    const second = await claimDailyLoginReward();
    expect(second).not.toBeNull();
    expect(second!.isFirstClaim).toBe(false);
    expect(second!.day).toBe(2);
  });

  test('isFirstClaim stays false even when a lapse resets the cycle', async () => {
    await seedState(4, 5); // prior history exists -> a lapsed returner, not a first claim
    const grant = await claimDailyLoginReward();
    expect(grant!.reset).toBe(true);
    expect(grant!.isFirstClaim).toBe(false);
  });

  test('a second claim on the same day returns null and does not credit again', async () => {
    await claimDailyLoginReward();
    awardBonusAmber.mockClear();
    const second = await claimDailyLoginReward();
    expect(second).toBeNull();
    expect(awardBonusAmber).not.toHaveBeenCalled();
  });

  test('consecutive day advances the cycle', async () => {
    await seedState(1, 3); // claimed yesterday on Day 3
    const grant = await claimDailyLoginReward();
    expect(grant!.day).toBe(4);
    expect(grant!.amount).toBe(DAILY_LOGIN_REWARDS[3]);
    expect(grant!.reset).toBe(false);
  });

  test('Day 7 wraps back to Day 1 on the next consecutive day (jackpot recurs)', async () => {
    await seedState(1, 7); // claimed yesterday on Day 7
    const grant = await claimDailyLoginReward();
    expect(grant!.day).toBe(1);
    expect(grant!.reset).toBe(false);
  });

  test('a missed day resets the cycle to Day 1 with reset flagged', async () => {
    await seedState(2, 5); // last claim was 2 days ago on Day 5 -> chain lapsed
    const grant = await claimDailyLoginReward();
    expect(grant!.day).toBe(1);
    expect(grant!.reset).toBe(true);
  });

  test('peek previews today\'s reward without claiming', async () => {
    await seedState(1, 2); // yesterday Day 2 -> today would be Day 3
    const preview = await peekDailyLoginReward();
    expect(preview).toEqual({ day: 3, amount: DAILY_LOGIN_REWARDS[2], reset: false });
    // Still claimable after a peek
    expect(await isDailyLoginRewardAvailable()).toBe(true);
    expect(awardBonusAmber).not.toHaveBeenCalled();
  });

  test('availability flips to false after claiming today', async () => {
    expect(await isDailyLoginRewardAvailable()).toBe(true);
    await claimDailyLoginReward();
    expect(await isDailyLoginRewardAvailable()).toBe(false);
    expect(await peekDailyLoginReward()).toBeNull();
  });

  test('claim persists across a cache clear (reload from storage)', async () => {
    await claimDailyLoginReward();
    _clearDailyLoginCache(); // simulate a fresh session reading from storage
    expect(await isDailyLoginRewardAvailable()).toBe(false);
    const stored = JSON.parse((await AsyncStorage.getItem(STORAGE_KEY))!);
    expect(stored.lastClaimedDate).toBe(getLocalDateString());
    expect(stored.cycleDay).toBe(1);
  });

  describe('lapsed-player comeback bonus', () => {
    test('returning after a 3+ day lapse grants a one-time comeback bonus', async () => {
      await seedState(4, 5); // last claim 4 days ago -> lapsed
      const grant = await claimDailyLoginReward();
      expect(grant!.reset).toBe(true);
      expect(grant!.day).toBe(1);
      expect(grant!.comebackBonus).toBe(COMEBACK_BONUS_AMBER);
      expect(grant!.newBalance).toBe(1000 + DAILY_LOGIN_REWARDS[0] + COMEBACK_BONUS_AMBER);
      expect(awardBonusAmber).toHaveBeenCalledWith(
        DAILY_LOGIN_REWARDS[0] + COMEBACK_BONUS_AMBER,
        'daily_login_comeback'
      );
    });

    test('a short gap (below the comeback threshold) grants no comeback bonus', async () => {
      await seedState(2, 5); // 2-day gap, below the 3-day comeback threshold
      const grant = await claimDailyLoginReward();
      expect(grant!.comebackBonus).toBe(0);
      expect(awardBonusAmber).toHaveBeenCalledWith(DAILY_LOGIN_REWARDS[0], 'daily_login');
    });

    test('first ever claim never grants a comeback bonus', async () => {
      const grant = await claimDailyLoginReward();
      expect(grant!.isFirstClaim).toBe(true);
      expect(grant!.comebackBonus).toBe(0);
      expect(awardBonusAmber).toHaveBeenCalledWith(DAILY_LOGIN_REWARDS[0], 'daily_login');
    });

    test('a consecutive-day claim grants no comeback bonus', async () => {
      await seedState(1, 3);
      const grant = await claimDailyLoginReward();
      expect(grant!.comebackBonus).toBe(0);
    });
  });
});
