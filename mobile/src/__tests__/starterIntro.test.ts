/**
 * Fox's one-time "Keeper's Welcome" starter-pack intro: the narrative lines and
 * the one-time seen flag. The key narrative guardrail (rule 1: the animals don't
 * know they're in a game) is that Fox NEVER names money — she frames a gift, and
 * the Store card shows the actual price.
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

  test('Fox never names money (the Store card shows the price)', () => {
    for (const phase of [0, 2]) {
      const text = getFoxStarterIntroLines(phase).join(' ').toLowerCase();
      for (const forbidden of ['$', 'dollar', 'buy', 'purchase', 'price', ' pay', '1.99']) {
        expect(text).not.toContain(forbidden);
      }
    }
  });

  test('the seen flag flips after markStarterIntroSeen', async () => {
    expect(await hasSeenStarterIntro()).toBe(false);
    await markStarterIntroSeen();
    expect(await hasSeenStarterIntro()).toBe(true);
  });
});
