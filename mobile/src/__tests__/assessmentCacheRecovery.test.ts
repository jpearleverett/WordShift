import NativeStorage from '@react-native-async-storage/async-storage';
import { commitNewCycle } from '../services/resetStorage';
import { getFullProgress, invalidateProgressCache } from '../services/amberCurrency';
import { refreshRestoredServiceCaches, restoreFromCloudData, collectLocalSaveData } from '../services/cloudSave';
import { getHintBalanceSync, hasHintSync, consumeHintSync, addHints, invalidateHintsCache, initHints } from '../services/hints';
import { getEquippedSync, equipCosmetic, invalidateCosmeticsCache } from '../services/cosmetics';
import { getSettingsSync, invalidateSettingsCache, subscribeSettings } from '../services/settings';
import { ENTITLEMENTS, grantEntitlements, setEntitlements, invalidateEntitlementsCache } from '../services/entitlements';
import { notifyBillingChanges } from '../services/iap';

jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());
jest.mock('../services/eventLogger', () => ({ logEvent: jest.fn() }));
const read = (NativeStorage.getItem as jest.Mock).getMockImplementation()!;
const write = (NativeStorage.setItem as jest.Mock).getMockImplementation()!;
const tick = () => new Promise<void>(resolve => setImmediate(resolve));

beforeEach(async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(read);
  (NativeStorage.setItem as jest.Mock).mockImplementation(write);
  await NativeStorage.clear();
  invalidateProgressCache(); invalidateHintsCache(); invalidateCosmeticsCache();
  invalidateSettingsCache(); invalidateEntitlementsCache();
});

async function seedMirrors() {
  await NativeStorage.setItem('wordshift_hints', JSON.stringify({ balance: 9, seededFree: true }));
  await NativeStorage.setItem('wordshift_cosmetics', JSON.stringify({ owned: { theme_ember: 1 }, equipped: { tile_theme: 'theme_ember' } }));
  await NativeStorage.setItem('wordshift_settings', JSON.stringify({ reducedMotion: true }));
  await refreshRestoredServiceCaches();
}

test('New Cycle removes both saved boards and clocks while retaining and warming paid hints, cosmetics and motion', async () => {
  const progress = await getFullProgress();
  await NativeStorage.setItem('wordshift_home_progress', JSON.stringify({ ...progress,
    currentPhase: 5, postRevelation: true, finalPuzzleCompleted: true, houseCompleted: true, puzzlesSolved: 120,
  }));
  const cycleKeys = ['wordshift_in_progress_puzzle', 'wordshift_in_progress_daily',
    'wordshift_in_progress_puzzle_clock', 'wordshift_in_progress_daily_clock', 'wordshift_tending'];
  for (const key of cycleKeys) await NativeStorage.setItem(key, '{}');
  await seedMirrors();
  expect(await commitNewCycle()).toBe(1);
  for (const key of cycleKeys) expect(await NativeStorage.getItem(key)).toBeNull();
  expect(getHintBalanceSync()).toBe(9);
  expect(hasHintSync()).toBe(true);
  expect(getEquippedSync('tile_theme')).toBe('theme_ember');
  expect(getSettingsSync().reducedMotion).toBe(true);
});

test('live restore publishes settings after rewarming, and never leaves hint/cosmetic mirrors empty', async () => {
  await seedMirrors();
  const changed = jest.fn();
  const unsubscribe = subscribeSettings(changed);
  try {
    expect(await restoreFromCloudData({ version: 1, timestamp: 1, deviceId: 'backup', data: {
      wordshift_hints: JSON.stringify({ balance: 12, seededFree: true }),
      wordshift_cosmetics: JSON.stringify({ owned: { theme_ember: 1 }, equipped: { tile_theme: 'theme_ember' } }),
      wordshift_settings: JSON.stringify({ reducedMotion: false }),
    } })).toBe(true);
    expect(getHintBalanceSync()).toBe(12);
    expect(getEquippedSync('tile_theme')).toBe('theme_ember');
    expect(getSettingsSync().reducedMotion).toBe(false);
    expect(changed).toHaveBeenCalled();
  } finally { unsubscribe(); }
});

test('a rejected restore stage rewarms the original owned mirrors', async () => {
  await seedMirrors();
  (NativeStorage.setItem as jest.Mock).mockImplementationOnce(async () => { throw new Error('journal unavailable'); });
  expect(await restoreFromCloudData({ version: 1, timestamp: 1, deviceId: 'backup', data: {} })).toBe(false);
  expect(getHintBalanceSync()).toBe(9);
  expect(getEquippedSync('tile_theme')).toBe('theme_ember');
  expect(getSettingsSync().reducedMotion).toBe(true);
});

test('failed hint debit restores availability without discarding the other purchased hints', async () => {
  await seedMirrors();
  (NativeStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('full disk'));
  expect(consumeHintSync()).toBe(true);
  expect(getHintBalanceSync()).toBe(8);
  await tick();
  expect(getHintBalanceSync()).toBe(9);
  expect(hasHintSync()).toBe(true);
  expect(consumeHintSync()).toBe(true);
  await tick();
  expect(getHintBalanceSync()).toBe(8);
});

test('an older failed hint spend cannot roll back a newer paid grant', async () => {
  await seedMirrors();
  let rejectSpend!: (error: Error) => void;
  (NativeStorage.setItem as jest.Mock).mockImplementationOnce(() => new Promise((_, reject) => { rejectSpend = reject; }));
  expect(consumeHintSync()).toBe(true);
  await addHints(20, 'paid_pack');
  rejectSpend(new Error('old spend failed'));
  await tick();
  expect(getHintBalanceSync()).toBe(28);
  expect(JSON.parse((await NativeStorage.getItem('wordshift_hints'))!).balance).toBe(28);
});

test.each(['{broken', '{"balance":-2}', '{"balance":"9"}'])('unreadable hints are never overwritten with a free seed: %s', async raw => {
  await NativeStorage.setItem('wordshift_hints', raw);
  await expect(initHints()).rejects.toThrow();
  expect(await NativeStorage.getItem('wordshift_hints')).toBe(raw);
});

test('cloud snapshot batches synced keys in one native request', async () => {
  await NativeStorage.setItem('wordshift_hints', '{"balance":9,"seededFree":true}');
  await NativeStorage.setItem('wordshift_played_standard_easy', '["board"]');
  (NativeStorage.multiGet as jest.Mock).mockClear();
  (NativeStorage.getItem as jest.Mock).mockClear();
  const snapshot = await collectLocalSaveData();
  expect(snapshot.data.wordshift_hints).toContain('9');
  expect(snapshot.data.wordshift_played_standard_easy).toBe('["board"]');
  expect(NativeStorage.multiGet).toHaveBeenCalledTimes(1);
  expect((NativeStorage.getItem as jest.Mock).mock.calls.map(([key]) => key)).not.toContain('wordshift_hints');
});

test('revoked entitlement cosmetics stop rendering immediately and return on reactivation', async () => {
  await grantEntitlements([ENTITLEMENTS.PATRON]);
  expect(await equipCosmetic('theme_patron')).toBe(true);
  expect(getEquippedSync('tile_theme')).toBe('theme_patron');
  await setEntitlements([]);
  notifyBillingChanges({ entitlements: [] });
  expect(getEquippedSync('tile_theme')).toBeUndefined();
  await grantEntitlements([ENTITLEMENTS.PATRON]);
  notifyBillingChanges({ entitlements: [ENTITLEMENTS.PATRON] });
  expect(getEquippedSync('tile_theme')).toBe('theme_patron');
});
