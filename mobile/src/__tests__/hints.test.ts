import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initHints,
  getHintBalance,
  getHintBalanceSync,
  hasHintSync,
  consumeHintSync,
  addHints,
  grantBonusHint,
  BONUS_HINT_SOFT_CAP,
  clearHints,
} from '../services/hints';
import { STARTING_FREE_HINTS, FIRST_DAILY_BONUS_HINTS } from '../constants/gameBalance';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearHints();
});

describe('hints economy', () => {
  it('grants the free starting stash exactly once', async () => {
    await initHints();
    expect(await getHintBalance()).toBe(STARTING_FREE_HINTS);
    expect(getHintBalanceSync()).toBe(STARTING_FREE_HINTS);

    // Re-running init must not re-grant.
    await initHints();
    expect(await getHintBalance()).toBe(STARTING_FREE_HINTS);
  });

  it('persists the seeded flag so a relaunch does not re-grant', async () => {
    await initHints();
    await consumeHintSync(); // spend one down to STARTING-1
    // Simulate relaunch: drop the in-memory cache by clearing module state via
    // re-reading from storage. clearHints() would wipe storage, so instead spend
    // and re-init to prove init is a no-op once seeded.
    await initHints();
    expect(await getHintBalance()).toBe(STARTING_FREE_HINTS - 1);
  });

  it('consumes a hint and reports availability', async () => {
    await initHints();
    expect(hasHintSync()).toBe(true);
    const ok = consumeHintSync();
    expect(ok).toBe(true);
    expect(getHintBalanceSync()).toBe(STARTING_FREE_HINTS - 1);
  });

  it('never goes below zero and refuses to consume when empty', async () => {
    await clearHints(); // balance 0, seededFree false
    // Do NOT init (so no free grant) — balance is 0.
    expect(hasHintSync()).toBe(false);
    expect(consumeHintSync()).toBe(false);
    expect(getHintBalanceSync()).toBe(0);
  });

  it('adds hints from a grant (rewarded ad / pack)', async () => {
    await initHints();
    const balance = await addHints(20, 'iap_test');
    expect(balance).toBe(STARTING_FREE_HINTS + 20);
    expect(getHintBalanceSync()).toBe(STARTING_FREE_HINTS + 20);
  });

  it('credits the first-daily mercy grant on top of the free stash', async () => {
    // FIRST_DAILY_BONUS_HINTS is a small cushion, not a second stash.
    expect(FIRST_DAILY_BONUS_HINTS).toBe(2);
    expect(FIRST_DAILY_BONUS_HINTS).toBeLessThan(STARTING_FREE_HINTS);

    await initHints();
    const balance = await addHints(FIRST_DAILY_BONUS_HINTS, 'first_daily_mercy');
    expect(balance).toBe(STARTING_FREE_HINTS + FIRST_DAILY_BONUS_HINTS);
    expect(getHintBalanceSync()).toBe(STARTING_FREE_HINTS + FIRST_DAILY_BONUS_HINTS);
  });

  it('ignores non-positive grants', async () => {
    await initHints();
    const before = await getHintBalance();
    expect(await addHints(0)).toBe(before);
    expect(await addHints(-5)).toBe(before);
  });

  it('clears all state', async () => {
    await initHints();
    await addHints(10);
    await clearHints();
    expect(await getHintBalance()).toBe(0);
    expect(getHintBalanceSync()).toBe(0);
  });

  describe('milestone bonus hint trickle', () => {
    it('grants +1 while the balance is under the soft cap', async () => {
      await initHints(); // STARTING_FREE_HINTS (5) < BONUS_HINT_SOFT_CAP (10)
      expect(STARTING_FREE_HINTS).toBeLessThan(BONUS_HINT_SOFT_CAP);
      const granted = await grantBonusHint('milestone');
      expect(granted).toBe(true);
      expect(await getHintBalance()).toBe(STARTING_FREE_HINTS + 1);
      expect(getHintBalanceSync()).toBe(STARTING_FREE_HINTS + 1);
    });

    it('refuses at or above the soft cap (never stacks a stockpile)', async () => {
      await initHints();
      await addHints(BONUS_HINT_SOFT_CAP - STARTING_FREE_HINTS, 'top_up'); // exactly at cap
      expect(await getHintBalance()).toBe(BONUS_HINT_SOFT_CAP);
      expect(await grantBonusHint('milestone')).toBe(false);
      expect(await getHintBalance()).toBe(BONUS_HINT_SOFT_CAP);

      await addHints(20, 'iap_test'); // well above cap
      expect(await grantBonusHint('milestone')).toBe(false);
      expect(getHintBalanceSync()).toBe(BONUS_HINT_SOFT_CAP + 20);
    });

    it('grants one below the cap and lands exactly at it', async () => {
      await initHints();
      await addHints(BONUS_HINT_SOFT_CAP - STARTING_FREE_HINTS - 1, 'top_up'); // cap - 1
      expect(await grantBonusHint('milestone')).toBe(true);
      expect(await getHintBalance()).toBe(BONUS_HINT_SOFT_CAP);
      // Next trickle is refused: the previous grant reached the cap.
      expect(await grantBonusHint('milestone')).toBe(false);
    });

    it('grants from an empty, unseeded balance', async () => {
      // No init: balance 0. The trickle still works as a mercy top-up.
      expect(await grantBonusHint('milestone')).toBe(true);
      expect(await getHintBalance()).toBe(1);
      expect(hasHintSync()).toBe(true);
    });
  });
});
