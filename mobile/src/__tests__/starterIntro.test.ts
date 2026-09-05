/**
 * The optional starter pack is described as a purchase before the Store opens.
 * The animal's welcome does not depend on a purchase.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// amberCurrency touches logEvent on some paths — keep the debounced flush timer
// out of the run (standard pattern).
jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
  clearEvents: jest.fn(async () => {}),
  getEvents: jest.fn(async () => []),
}));

import { getFoxStarterIntroLines } from '../services/phaseNarrative';
import { hasSeenStarterIntro, markStarterIntroSeen } from '../services/amberCurrency';

beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
});

describe("Keeper's Welcome starter intro", () => {
  test('Fox intro lines are non-empty across phases', () => {
    for (const phase of [0, 1, 2, 4]) {
      const lines = getFoxStarterIntroLines(phase);
      expect(lines.length).toBeGreaterThan(0);
      expect(lines.every(l => l.trim().length > 0)).toBe(true);
    }
  });

  test('the purchase and price are clear before the Store opens', () => {
    for (const phase of [0, 1, 2, 3, 4, 5]) {
      const text = getFoxStarterIntroLines(phase).join(' ');
      expect(text).toMatch(/optional/i);
      expect(text).toMatch(/purchase/i);
      expect(text).toMatch(/price/i);
      expect(text).not.toMatch(/freely offered|welcome gift|free gift/i);
    }
  });

  test('Ember separates welcome from spending', () => {
    expect(getFoxStarterIntroLines(0).join(' ')).toMatch(/whether or not you buy/i);
    expect(getFoxStarterIntroLines(4).join(' ')).toMatch(/yours either way/i);
  });

  test('the seen flag flips after markStarterIntroSeen', async () => {
    expect(await hasSeenStarterIntro()).toBe(false);
    await markStarterIntroSeen();
    expect(await hasSeenStarterIntro()).toBe(true);
  });
});
