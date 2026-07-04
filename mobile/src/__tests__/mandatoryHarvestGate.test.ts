/**
 * The one-time mandatory first-harvest gate uses its OWN seen flag, decoupled
 * from the legacy pit-harvest-intro flag. Regression guard: the old passive
 * puzzle-8 Fox intro (shipped in earlier builds) set
 * `wordshift_pit_harvest_intro_seen` on many existing saves; if the new gate
 * read that key it would silently never fire for those players. This pins that
 * the new flag is independent.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../services/eventLogger', () => ({
  logEvent: jest.fn(),
  clearEvents: jest.fn(async () => {}),
  getEvents: jest.fn(async () => []),
}));

import { hasSeenMandatoryHarvest, markMandatoryHarvestSeen } from '../services/amberCurrency';

beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
});

describe('mandatory first-harvest gate seen flag', () => {
  test('round-trips and is one-time', async () => {
    expect(await hasSeenMandatoryHarvest()).toBe(false);
    await markMandatoryHarvestSeen();
    expect(await hasSeenMandatoryHarvest()).toBe(true);
  });

  test('is NOT suppressed by the legacy pit-harvest-intro flag', async () => {
    // Simulate an existing save that saw the old passive puzzle-8 Fox intro.
    await AsyncStorage.setItem('wordshift_pit_harvest_intro_seen', 'true');
    // The new gate must still fire (its own flag is unset).
    expect(await hasSeenMandatoryHarvest()).toBe(false);
  });

  test('marking the new flag does not write the legacy key', async () => {
    await markMandatoryHarvestSeen();
    expect(await AsyncStorage.getItem('wordshift_mandatory_harvest_seen')).toBe('true');
    expect(await AsyncStorage.getItem('wordshift_pit_harvest_intro_seen')).toBeNull();
  });
});
