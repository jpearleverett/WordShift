import NativeStorage from '@react-native-async-storage/async-storage';
import {
  COSMETICS, purchaseAmberCosmetic, invalidateCosmeticsCache, ownsCosmetic,
  getEquipped, getEquippedSync, initCosmetics, equipCosmetic, unequipCosmetic,
  grantCosmetic, recordAmberCosmeticPurchase,
} from '../services/cosmetics';
import { getFullProgress, invalidateProgressCache } from '../services/amberCurrency';
import { purchaseHouseUpgrade, invalidateRoomUpgradeCache } from '../services/roomUpgrades';
import { recoverPendingStorageTransaction, runStorageTransaction, STORAGE_COMMIT_KEY } from '../services/persistenceStorage';

jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());

const COSMETIC_KEY = 'wordshift_cosmetics';
const PROGRESS_KEY = 'wordshift_home_progress';
const LEDGER_KEY = 'wordshift_amber_transactions';
const originalRead = (NativeStorage.getItem as jest.Mock).getMockImplementation()!;
const originalWrite = (NativeStorage.setItem as jest.Mock).getMockImplementation()!;
const originalRemove = (NativeStorage.removeItem as jest.Mock).getMockImplementation()!;
const amberItems = COSMETICS.filter(item => item.acquisition.kind === 'amber');

async function seed(amber = 2000): Promise<void> {
  const progress = await getFullProgress();
  await NativeStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...progress, amber, currentPhase: 2, unlockedRooms: ['cozy_den'] }));
  invalidateProgressCache();
}
async function balance(): Promise<number> { return (await getFullProgress()).amber; }
async function ledger(): Promise<unknown[]> { return JSON.parse(await NativeStorage.getItem(LEDGER_KEY) ?? '[]'); }
async function coldReload(): Promise<void> {
  invalidateProgressCache();
  invalidateCosmeticsCache();
  await initCosmetics();
}

beforeEach(async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(originalRead);
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  (NativeStorage.removeItem as jest.Mock).mockImplementation(originalRemove);
  await NativeStorage.clear();
  invalidateProgressCache();
  invalidateCosmeticsCache();
  invalidateRoomUpgradeCache();
  await seed();
});

test.each(amberItems)('$id is owned and equipped after reopening, at its listed price', async item => {
  const cost = item.acquisition.kind === 'amber' ? item.acquisition.cost : 0;
  expect(await purchaseAmberCosmetic(item.id)).toEqual({ success: true, newBalance: 2000 - cost });
  await coldReload();
  expect(await ownsCosmetic(item.id)).toBe(true);
  expect(await getEquipped(item.category)).toBe(item.id);
  expect(getEquippedSync(item.category)).toBe(item.id);
  expect(await balance()).toBe(2000 - cost);
  expect(await ledger()).toEqual([expect.objectContaining({ amount: cost, source: `cosmetic_${item.id}` })]);
});

test('same-frame duplicate requests charge once, including a stale shop offer after reopening', async () => {
  const results = await Promise.all([purchaseAmberCosmetic('theme_ember'), purchaseAmberCosmetic('theme_ember')]);
  expect(results).toEqual([
    { success: true, newBalance: 1700 },
    { success: false, newBalance: 1700, reason: 'already_owned' },
  ]);
  await coldReload();
  expect((await purchaseAmberCosmetic('theme_ember')).reason).toBe('already_owned');
  expect(await balance()).toBe(1700);
  expect(await ledger()).toHaveLength(1);
});

test('different cosmetic and room purchases serialize against the saved balance', async () => {
  const results = await Promise.all([
    purchaseAmberCosmetic('theme_ember'),
    purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 1 }),
    purchaseAmberCosmetic('spark_hearth'),
  ]);
  expect(results.map(result => result.newBalance)).toEqual([1700, 1625, 1375]);
  await coldReload();
  expect(await balance()).toBe(1375);
  expect(getEquippedSync('tile_theme')).toBe('theme_ember');
  expect(getEquippedSync('spark')).toBe('spark_hearth');
  expect(await ledger()).toHaveLength(3);
});

test('fresh saved balance wins over a stale cached affordable amount', async () => {
  const progress = await getFullProgress();
  await NativeStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...progress, amber: 299 }));
  expect(await purchaseAmberCosmetic('theme_ember')).toMatchObject({ success: false, reason: 'not_enough_amber', newBalance: 299 });
  expect(await ownsCosmetic('theme_ember')).toBe(false);
  expect(await ledger()).toEqual([]);
});

test.each(['unknown_item', 'theme_patron', 'theme_eclipse', 'confetti_season', 'confetti_season_2', 'confetti_season_6'])('%s cannot be bought for amber', async id => {
  expect((await purchaseAmberCosmetic(id)).reason).toBe('unavailable');
  expect(await balance()).toBe(2000);
  expect(await ledger()).toEqual([]);
});

test('a rejected journal leaves the old item, equipment and amber untouched', async () => {
  await purchaseAmberCosmetic('theme_ember');
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === STORAGE_COMMIT_KEY) throw new Error('disk full');
    return originalWrite(key, value);
  });
  await expect(purchaseAmberCosmetic('theme_tide')).rejects.toThrow('disk full');
  expect(getEquippedSync('tile_theme')).toBe('theme_ember');
  await coldReload();
  expect(await ownsCosmetic('theme_tide')).toBe(false);
  expect(await balance()).toBe(1700);
  expect(await ledger()).toHaveLength(1);
});

test.each([PROGRESS_KEY, LEDGER_KEY, COSMETIC_KEY])('interruption applying %s recovers the original purchase exactly once', async failedKey => {
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === failedKey && !failed) { failed = true; throw new Error('interrupted'); }
    return originalWrite(key, value);
  });
  await expect(purchaseAmberCosmetic('theme_ember')).rejects.toThrow('need recovery');
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
  expect(await purchaseAmberCosmetic('theme_ember')).toMatchObject({ success: false, reason: 'already_owned', newBalance: 1700 });
  await coldReload();
  expect(await ownsCosmetic('theme_ember')).toBe(true);
  expect(getEquippedSync('tile_theme')).toBe('theme_ember');
  expect(await balance()).toBe(1700);
  expect(await ledger()).toHaveLength(1);
});

test('relaunch after repeated save failures recovers ownership and auto-equip without a second charge', async () => {
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === COSMETIC_KEY) throw new Error('device still full');
    return originalWrite(key, value);
  });
  await expect(purchaseAmberCosmetic('spark_hearth')).rejects.toThrow('need recovery');
  await expect(recoverPendingStorageTransaction()).rejects.toThrow('need recovery');
  await expect(recoverPendingStorageTransaction()).rejects.toThrow('need recovery');
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  expect(await recoverPendingStorageTransaction()).toBe(true);
  await coldReload();
  expect(getEquippedSync('spark')).toBe('spark_hearth');
  expect(await ownsCosmetic('spark_hearth')).toBe(true);
  expect(await balance()).toBe(1750);
  expect(await ledger()).toHaveLength(1);
});

test('a failed journal removal is replayed without charging again', async () => {
  let failed = false;
  (NativeStorage.removeItem as jest.Mock).mockImplementation(async key => {
    if (key === STORAGE_COMMIT_KEY && !failed) { failed = true; throw new Error('interrupted cleanup'); }
    return originalRemove(key);
  });
  await expect(purchaseAmberCosmetic('confetti_gold')).rejects.toThrow('need recovery');
  expect((await purchaseAmberCosmetic('confetti_gold')).reason).toBe('already_owned');
  expect(await balance()).toBe(1750);
  expect(await ledger()).toHaveLength(1);
});

test.each(['{broken', '{"owned":null}', '{"owned":[]}', '{"owned":{"theme_ember":"bad"}}', '{"owned":{},"equipped":null}'])('unreadable ownership %s cannot become a new empty purchase record', async saved => {
  await NativeStorage.setItem(COSMETIC_KEY, saved);
  await expect(purchaseAmberCosmetic('theme_ember')).rejects.toThrow();
  expect(await balance()).toBe(2000);
  expect(await ledger()).toEqual([]);
  expect(await NativeStorage.getItem(COSMETIC_KEY)).toBe(saved);
});

test('failed ownership reads do not spend or overwrite previously bought items', async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(async key => {
    if (key === COSMETIC_KEY) throw new Error('read failed');
    return originalRead(key);
  });
  await expect(purchaseAmberCosmetic('theme_ember')).rejects.toThrow('read failed');
  expect(await balance()).toBe(2000);
  expect(await ledger()).toEqual([]);
});

test('rapid purchase and equipment changes retain all ownership and the last chosen selection', async () => {
  await purchaseAmberCosmetic('theme_ember');
  await Promise.all([purchaseAmberCosmetic('theme_tide'), equipCosmetic('theme_ember'), unequipCosmetic('tile_theme')]);
  await coldReload();
  expect(await ownsCosmetic('theme_ember')).toBe(true);
  expect(await ownsCosmetic('theme_tide')).toBe(true);
  expect(getEquippedSync('tile_theme')).toBeUndefined();
  expect(await balance()).toBe(1300);
});

test('failed equipment save preserves the visible previous choice and can be recovered', async () => {
  await purchaseAmberCosmetic('theme_ember');
  await purchaseAmberCosmetic('theme_tide');
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === COSMETIC_KEY) throw new Error('disk full');
    return originalWrite(key, value);
  });
  await expect(equipCosmetic('theme_ember')).rejects.toThrow('need recovery');
  expect(getEquippedSync('tile_theme')).toBe('theme_tide');
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  await recoverPendingStorageTransaction();
  await coldReload();
  expect(getEquippedSync('tile_theme')).toBe('theme_ember');
  expect(await balance()).toBe(1300);
  expect(await ledger()).toHaveLength(2);
});

test('free grants do not announce ownership on failure and participate in a season-style transaction', async () => {
  (NativeStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  await expect(recordAmberCosmeticPurchase('theme_ember')).rejects.toThrow('disk full');
  expect(await ownsCosmetic('theme_ember')).toBe(false);
  await runStorageTransaction('season_reward', async () => {
    expect(await grantCosmetic('confetti_season')).toBe(true);
  });
  await coldReload();
  expect(await ownsCosmetic('confetti_season')).toBe(true);
  expect(await balance()).toBe(2000);
});
