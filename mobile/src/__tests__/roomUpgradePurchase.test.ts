import NativeStorage from '@react-native-async-storage/async-storage';
import {
  HouseUpgradePurchase, getAttunementLevel, getDeepenedRooms, getPurchasedUpgrades,
  invalidateRoomUpgradeCache, purchaseHouseUpgrade, purchaseRoomUpgrade,
  ROOM_UPGRADES, getRoomDeepening,
} from '../services/roomUpgrades';
import { getFullProgress, invalidateProgressCache } from '../services/amberCurrency';
import { recoverPendingStorageTransaction, STORAGE_COMMIT_KEY } from '../services/persistenceStorage';

jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());

const ROOM_KEY = 'wordshift_room_upgrades';
const PROGRESS_KEY = 'wordshift_home_progress';
const LEDGER_KEY = 'wordshift_amber_transactions';
const originalRead = (NativeStorage.getItem as jest.Mock).getMockImplementation()!;
const originalWrite = (NativeStorage.setItem as jest.Mock).getMockImplementation()!;

async function seed(amber = 2000, phase = 2, rooms = ['cozy_den', 'kitchen']): Promise<void> {
  const progress = await getFullProgress();
  await NativeStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...progress, amber, currentPhase: phase, unlockedRooms: rooms }));
  invalidateProgressCache();
}

async function balance(): Promise<number> { return (await getFullProgress()).amber; }
async function ledger(): Promise<unknown[]> { return JSON.parse(await NativeStorage.getItem(LEDGER_KEY) ?? '[]'); }

beforeEach(async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(originalRead);
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  await NativeStorage.clear();
  invalidateProgressCache();
  invalidateRoomUpgradeCache();
  await seed();
});

test('all five purchase steps save their correct price, ownership and amber ledger together', async () => {
  const offers: HouseUpgradePurchase[] = [
    { roomId: 'cozy_den', tier: 1 }, { roomId: 'cozy_den', tier: 2 },
    { roomId: 'cozy_den', tier: 3, level: 1 }, { roomId: 'cozy_den', tier: 3, level: 2 },
    { roomId: 'cozy_den', tier: 3, level: 3 },
  ];
  for (const offer of offers) expect((await purchaseHouseUpgrade(offer)).success).toBe(true);
  invalidateProgressCache();
  invalidateRoomUpgradeCache();
  expect(await balance()).toBe(1150);
  expect(Object.keys(await getPurchasedUpgrades())).toEqual(['cozy_den']);
  expect(Object.keys(await getDeepenedRooms())).toEqual(['cozy_den']);
  expect(await getAttunementLevel('cozy_den')).toBe(3);
  expect(await ledger()).toEqual([
    expect.objectContaining({ amount: 75, source: 'room_upgrade_cozy_den' }),
    expect.objectContaining({ amount: 175, source: 'room_deepening_cozy_den' }),
    expect.objectContaining({ amount: 150, source: 'attunement_cozy_den' }),
    expect.objectContaining({ amount: 200, source: 'attunement_cozy_den' }),
    expect.objectContaining({ amount: 250, source: 'attunement_cozy_den' }),
  ]);
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
});

test.each(ROOM_UPGRADES.map(upgrade => [upgrade.roomId, upgrade.cost] as const))(
  'the complete %s room keeps its listed prices and all five purchases after reopening',
  async (roomId, decorationCost) => {
    await seed(2000, 3, [roomId]);
    const deepeningCost = getRoomDeepening(roomId)!.cost;
    const offers: HouseUpgradePurchase[] = [
      { roomId, tier: 1 }, { roomId, tier: 2 },
      { roomId, tier: 3, level: 1 }, { roomId, tier: 3, level: 2 }, { roomId, tier: 3, level: 3 },
    ];
    for (const offer of offers) expect((await purchaseHouseUpgrade(offer)).success).toBe(true);
    invalidateProgressCache();
    invalidateRoomUpgradeCache();
    expect(await balance()).toBe(2000 - decorationCost - deepeningCost - 600);
    expect(Object.keys(await getPurchasedUpgrades())).toEqual([roomId]);
    expect(Object.keys(await getDeepenedRooms())).toEqual([roomId]);
    expect(await getAttunementLevel(roomId)).toBe(3);
    expect(await ledger()).toHaveLength(5);
  },
);

test('attunement still requires the decoration and does not require its deepening', async () => {
  expect(await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 3, level: 1 }))
    .toMatchObject({ success: false, reason: 'unavailable', newBalance: 2000 });
  await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 1 });
  expect((await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 3, level: 1 })).success).toBe(true);
  expect(await getDeepenedRooms()).toEqual({});
  expect(await balance()).toBe(1775);
});

test('same-frame duplicate taps charge once and cannot buy the next attunement by accident', async () => {
  const decoration = { roomId: 'cozy_den', tier: 1 } as const;
  const results = await Promise.all([purchaseHouseUpgrade(decoration), purchaseHouseUpgrade(decoration)]);
  expect(results.map(result => result.success)).toEqual([true, false]);
  expect(results[1].reason).toBe('already_owned');
  const levelOne = { roomId: 'cozy_den', tier: 3, level: 1 } as const;
  const levels = await Promise.all([purchaseHouseUpgrade(levelOne), purchaseHouseUpgrade(levelOne)]);
  expect(levels.map(result => result.success)).toEqual([true, false]);
  expect(await getAttunementLevel('cozy_den')).toBe(1);
  expect(await balance()).toBe(1775);
  expect(await ledger()).toHaveLength(2);
});

test('purchases for different rooms read each preceding committed balance', async () => {
  const results = await Promise.all([
    purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 1 }),
    purchaseHouseUpgrade({ roomId: 'kitchen', tier: 1 }),
  ]);
  expect(results.map(result => result.newBalance)).toEqual([1925, 1850]);
  expect(Object.keys(await getPurchasedUpgrades()).sort()).toEqual(['cozy_den', 'kitchen']);
  expect(await balance()).toBe(1850);
});

test('a stale offer cannot skip an attunement level or charge its price', async () => {
  await purchaseRoomUpgrade('cozy_den');
  expect(await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 3, level: 2 }))
    .toMatchObject({ success: false, reason: 'stale_offer', newBalance: 2000 });
  expect(await getAttunementLevel('cozy_den')).toBe(0);
  expect(await ledger()).toEqual([]);
});

test('phase, unlocked-room and tier prerequisites are checked before amber is spent', async () => {
  await seed(2000, 1);
  expect((await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 1 })).reason).toBe('unavailable');
  await seed();
  expect((await purchaseHouseUpgrade({ roomId: 'study', tier: 1 })).reason).toBe('unavailable');
  expect((await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 2 })).reason).toBe('unavailable');
  expect((await purchaseHouseUpgrade({ roomId: 'unknown', tier: 1 })).reason).toBe('unavailable');
  expect((await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 3, level: 1.5 })).reason).toBe('unavailable');
  expect(await balance()).toBe(2000);
  expect(await getPurchasedUpgrades()).toEqual({});
  expect(await ledger()).toEqual([]);
});

test('insufficient amber does not reserve or grant an upgrade', async () => {
  await seed(74);
  expect(await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 1 }))
    .toMatchObject({ success: false, reason: 'not_enough_amber', newBalance: 74 });
  expect(await getPurchasedUpgrades()).toEqual({});
  expect(await ledger()).toEqual([]);
});

test('failure before the journal commit leaves amber and ownership unchanged for retry', async () => {
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === STORAGE_COMMIT_KEY) throw new Error('disk full');
    return originalWrite(key, value);
  });
  await expect(purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 1 })).rejects.toThrow('disk full');
  expect(await balance()).toBe(2000);
  expect(await getPurchasedUpgrades()).toEqual({});
  expect(await ledger()).toEqual([]);
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  expect((await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 1 })).success).toBe(true);
  expect(await balance()).toBe(1925);
});

test.each([PROGRESS_KEY, LEDGER_KEY, ROOM_KEY])('an interrupted apply at %s recovers without a second charge', async failedKey => {
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === failedKey && !failed) { failed = true; throw new Error('interrupted write'); }
    return originalWrite(key, value);
  });
  const offer = { roomId: 'cozy_den', tier: 1 } as const;
  await expect(purchaseHouseUpgrade(offer)).rejects.toThrow('need recovery');
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
  expect(await purchaseHouseUpgrade(offer)).toMatchObject({ success: false, reason: 'already_owned', newBalance: 1925 });
  expect(await balance()).toBe(1925);
  expect(Object.keys(await getPurchasedUpgrades())).toEqual(['cozy_den']);
  expect(await ledger()).toHaveLength(1);
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
});

test('cold-start recovery finishes an interrupted attunement at its original level and price', async () => {
  await purchaseRoomUpgrade('cozy_den');
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === ROOM_KEY && !failed) { failed = true; throw new Error('interrupted write'); }
    return originalWrite(key, value);
  });
  await expect(purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 3, level: 1 })).rejects.toThrow('need recovery');
  invalidateProgressCache();
  invalidateRoomUpgradeCache();
  expect(await recoverPendingStorageTransaction()).toBe(true);
  expect(await getAttunementLevel('cozy_den')).toBe(1);
  expect(await balance()).toBe(1850);
  expect(await ledger()).toHaveLength(1);
  expect((await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 3, level: 1 })).reason).toBe('already_owned');
  expect(await balance()).toBe(1850);
});

test('a recovery that is still unable to save preserves its journal until a later retry succeeds', async () => {
  await purchaseRoomUpgrade('cozy_den');
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === ROOM_KEY) throw new Error('device still full');
    return originalWrite(key, value);
  });
  await expect(purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 2 })).rejects.toThrow('need recovery');
  await expect(recoverPendingStorageTransaction()).rejects.toThrow('need recovery');
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).not.toBeNull();
  expect(await ledger()).toHaveLength(1);
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  expect(await recoverPendingStorageTransaction()).toBe(true);
  invalidateProgressCache();
  invalidateRoomUpgradeCache();
  expect(await balance()).toBe(1825);
  expect(Object.keys(await getDeepenedRooms())).toEqual(['cozy_den']);
  expect(await ledger()).toHaveLength(1);
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
});

test('an unreadable ownership record never becomes an empty record that can be charged again', async () => {
  await NativeStorage.setItem(ROOM_KEY, '{bad json');
  await expect(purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 1 })).rejects.toThrow();
  expect(await balance()).toBe(2000);
  expect(await ledger()).toEqual([]);
  expect(await NativeStorage.getItem(ROOM_KEY)).toBe('{bad json');
});

test('a rejected ownership read is surfaced and leaves the original save intact', async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(async key => {
    if (key === ROOM_KEY) throw new Error('read failed');
    return originalRead(key);
  });
  await expect(purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 1 })).rejects.toThrow('read failed');
  expect(await balance()).toBe(2000);
  expect(await ledger()).toEqual([]);
});

test('the free-grant API still costs no amber and publishes ownership only after a successful save', async () => {
  (NativeStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('disk full'));
  await expect(purchaseRoomUpgrade('cozy_den')).rejects.toThrow('disk full');
  expect(await getPurchasedUpgrades()).toEqual({});
  expect(await purchaseRoomUpgrade('cozy_den')).toBe(true);
  expect(await balance()).toBe(2000);
  expect(await ledger()).toEqual([]);
});
