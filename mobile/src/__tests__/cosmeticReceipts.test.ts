/**
 * Cosmetic first-showing receipts: the one-time "Hearth Sparks, as promised."
 * beat that closes the purchase loop on the surface itself.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  resolveFirstShowing,
  consumeCosmeticFirstShowing,
  clearCosmeticReceipts,
  receiptKeyFor,
} from '../services/cosmeticReceipts';
import {
  clearCosmetics,
  recordAmberCosmeticPurchase,
  equipCosmetic,
  unequipCosmetic,
} from '../services/cosmetics';
import { getCosmeticFirstShowingLine } from '../services/phaseNarrative';

describe('resolveFirstShowing (pure)', () => {
  test('the default (nothing equipped) never earns a receipt', () => {
    expect(resolveFirstShowing(undefined, new Set())).toBeNull();
  });

  test('a newly equipped id is returned once and never after it is seen', () => {
    expect(resolveFirstShowing('spark_hearth', new Set())).toBe('spark_hearth');
    expect(resolveFirstShowing('spark_hearth', new Set(['spark_hearth']))).toBeNull();
  });

  test('receipts are per cosmetic, so a second cosmetic gets its own', () => {
    expect(resolveFirstShowing('spark_pollen', new Set(['spark_hearth']))).toBe('spark_pollen');
  });
});

describe('consumeCosmeticFirstShowing', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearCosmetics();
    await clearCosmeticReceipts(['spark_hearth', 'spark_pollen', 'confetti_gold']);
  });

  test('returns the display name exactly once for a newly equipped spark, then persists the flag', async () => {
    await recordAmberCosmeticPurchase('spark_hearth');
    await equipCosmetic('spark_hearth');
    expect(await consumeCosmeticFirstShowing('spark')).toBe('Hearth Sparks');
    expect(await consumeCosmeticFirstShowing('spark')).toBeNull();
    expect(await AsyncStorage.getItem(receiptKeyFor('spark_hearth'))).toBe('1');
  });

  test('the default equipped yields nothing, and categories are independent', async () => {
    expect(await consumeCosmeticFirstShowing('spark')).toBeNull();
    await recordAmberCosmeticPurchase('confetti_gold');
    await equipCosmetic('confetti_gold');
    expect(await consumeCosmeticFirstShowing('spark')).toBeNull();
    expect(await consumeCosmeticFirstShowing('confetti')).toBe('Golden Fall');
    expect(await consumeCosmeticFirstShowing('confetti')).toBeNull();
  });

  test('switching to another cosmetic earns that cosmetic its own receipt; returning does not repeat', async () => {
    await recordAmberCosmeticPurchase('spark_hearth');
    await recordAmberCosmeticPurchase('spark_pollen');
    await equipCosmetic('spark_hearth');
    expect(await consumeCosmeticFirstShowing('spark')).toBe('Hearth Sparks');
    await equipCosmetic('spark_pollen');
    expect(await consumeCosmeticFirstShowing('spark')).toBe('Pollen');
    await equipCosmetic('spark_hearth');
    expect(await consumeCosmeticFirstShowing('spark')).toBeNull();
    await unequipCosmetic('spark');
    expect(await consumeCosmeticFirstShowing('spark')).toBeNull();
  });

  test('the key is a device-local family under the documented prefix', () => {
    expect(receiptKeyFor('spark_ash')).toBe('wordshift_cosmetic_receipt_spark_ash');
  });
});

describe('getCosmeticFirstShowingLine', () => {
  test('names the cosmetic at the bright registers and stays dash-free and system-blind at every register', () => {
    for (let phase = 0; phase <= 5; phase++) {
      const line = getCosmeticFirstShowingLine(phase, 'Hearth Sparks');
      expect(line).not.toMatch(/[—–]/);
      expect(line.toLowerCase()).not.toContain('phase');
      expect(line.length).toBeGreaterThan(8);
    }
    expect(getCosmeticFirstShowingLine(0, 'Hearth Sparks')).toBe('Hearth Sparks, as promised.');
    expect(getCosmeticFirstShowingLine(4, 'Golden Fall')).toContain('Golden Fall');
  });
});
