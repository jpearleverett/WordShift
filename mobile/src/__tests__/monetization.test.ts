import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearMonetizationState,
  claimRewardedAmber,
  getMonetizationState,
  getPatronAmberDripBonus,
  getRewardedAmberClaimsRemaining,
  hasPatronKey,
  REWARDED_AMBER_AMOUNT,
  setPatronKeyOwned,
} from '../services/monetization';

const mockAwardBonusAmber = jest.fn(async (_amount?: number, _source?: string) => 123);
const mockLogEvent = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

jest.mock('../services/amberCurrency', () => ({
  awardBonusAmber: (...args: any[]) => mockAwardBonusAmber(args[0], args[1]),
}));

jest.mock('../services/eventLogger', () => ({
  logEvent: (...args: any[]) => mockLogEvent(args[0]),
}));

describe('monetization', () => {
  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    mockAwardBonusAmber.mockClear();
    mockLogEvent.mockClear();
    await clearMonetizationState();
  });

  test('defaults to no patron and full rewarded claims', async () => {
    const state = await getMonetizationState();
    expect(state.patronKeyOwned).toBe(false);
    expect(state.rewardedAmberClaimsRemaining).toBe(3);
    expect(await getRewardedAmberClaimsRemaining()).toBe(3);
  });

  test('supports patron entitlement state', async () => {
    await setPatronKeyOwned(true);
    expect(await hasPatronKey()).toBe(true);
    expect(await getPatronAmberDripBonus()).toBe(2);
  });

  test('awards rewarded amber and decrements remaining claims', async () => {
    const first = await claimRewardedAmber(0);
    expect(first.success).toBe(true);
    expect(first.amount).toBe(REWARDED_AMBER_AMOUNT);
    expect(first.remainingClaims).toBe(2);
    expect(mockAwardBonusAmber).toHaveBeenCalledWith(REWARDED_AMBER_AMOUNT, 'rewarded_ad');
    expect(mockLogEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'rewarded_bonus_claimed' })
    );
  });

  test('caps rewarded claims at 3 per day', async () => {
    await claimRewardedAmber(0);
    await claimRewardedAmber(0);
    await claimRewardedAmber(0);
    const blocked = await claimRewardedAmber(0);

    expect(blocked.success).toBe(false);
    expect(blocked.amount).toBe(0);
    expect(blocked.remainingClaims).toBe(0);
    expect(mockAwardBonusAmber).toHaveBeenCalledTimes(3);
  });

  test('clearMonetizationState resets claims and entitlement', async () => {
    await setPatronKeyOwned(true);
    await claimRewardedAmber(0);
    await clearMonetizationState();

    const state = await getMonetizationState();
    expect(state.patronKeyOwned).toBe(false);
    expect(state.rewardedAmberClaimsRemaining).toBe(3);
  });
});
