import NativeStorage from '@react-native-async-storage/async-storage';
import {
  HouseUpgradeGift, HouseUpgradePurchase, getAttunementLevel, getDeepenedRooms, getPurchasedUpgrades,
  invalidateRoomUpgradeCache, purchaseHouseUpgrade, purchaseRoomUpgrade,
  ROOM_UPGRADES, getRoomDeepening, getRoomEmbellishmentIntensity, clearRoomUpgrades,
  getPendingHouseUpgradeGifts, deliverHouseUpgradeGift, acknowledgeHouseUpgradeGift,
} from '../services/roomUpgrades';
import { getFullProgress, invalidateProgressCache, startNewCycle } from '../services/amberCurrency';
import { recoverPendingStorageTransaction, STORAGE_COMMIT_KEY } from '../services/persistenceStorage';
import { ANIMALS } from '../services/homeWorldData';

jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());

const ROOM_KEY = 'wordshift_room_upgrades';
const PROGRESS_KEY = 'wordshift_home_progress';
const LEDGER_KEY = 'wordshift_amber_transactions';
const originalRead = (NativeStorage.getItem as jest.Mock).getMockImplementation()!;
const originalWrite = (NativeStorage.setItem as jest.Mock).getMockImplementation()!;

async function seed(amber = 2000, phase = 2, rooms = ['cozy_den', 'kitchen']): Promise<void> {
  const progress = await getFullProgress();
  await NativeStorage.setItem(PROGRESS_KEY, JSON.stringify({
    ...progress, amber, currentPhase: phase, unlockedRooms: rooms,
    unlockedAnimals: ANIMALS.filter(animal => rooms.includes(animal.roomId)).map(animal => animal.id),
  }));
  invalidateProgressCache();
}

async function balance(): Promise<number> { return (await getFullProgress()).amber; }
async function ledger(): Promise<unknown[]> { return JSON.parse(await NativeStorage.getItem(LEDGER_KEY) ?? '[]'); }
async function buy(request: HouseUpgradePurchase): Promise<HouseUpgradeGift> {
  const result = await purchaseHouseUpgrade(request);
  expect(result.success).toBe(true);
  expect(result.gift).toBeDefined();
  return result.gift!;
}
async function buyAndGive(request: HouseUpgradePurchase): Promise<HouseUpgradeGift> {
  const gift = await buy(request);
  await deliverHouseUpgradeGift(gift.id);
  return gift;
}

beforeEach(async () => {
  (NativeStorage.getItem as jest.Mock).mockImplementation(originalRead);
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  await NativeStorage.clear();
  invalidateProgressCache();
  invalidateRoomUpgradeCache();
  await seed();
});

test('all five purchase and delivery steps save their correct price, ownership and amber ledger', async () => {
  const offers: HouseUpgradePurchase[] = [
    { roomId: 'cozy_den', tier: 1 }, { roomId: 'cozy_den', tier: 2 },
    { roomId: 'cozy_den', tier: 3, level: 1 }, { roomId: 'cozy_den', tier: 3, level: 2 },
    { roomId: 'cozy_den', tier: 3, level: 3 },
  ];
  for (const offer of offers) await buyAndGive(offer);
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
  'all five %s purchases retain the exact paid gift across reopening and change the room only when given',
  async (roomId, decorationCost) => {
    await seed(2000, 3, [roomId]);
    const deepeningCost = getRoomDeepening(roomId)!.cost;
    const offers: HouseUpgradePurchase[] = [
      { roomId, tier: 1 }, { roomId, tier: 2 },
      { roomId, tier: 3, level: 1 }, { roomId, tier: 3, level: 2 }, { roomId, tier: 3, level: 3 },
    ];
    for (const offer of offers) {
      const previousIntensity = await getRoomEmbellishmentIntensity(roomId);
      const gift = await buy(offer);
      invalidateRoomUpgradeCache();
      invalidateProgressCache();
      expect(gift).toMatchObject(offer);
      expect(await getPendingHouseUpgradeGifts()).toEqual([gift]);
      expect(await getRoomEmbellishmentIntensity(roomId)).toBe(previousIntensity);
      const delivered = await deliverHouseUpgradeGift(gift.id);
      expect(delivered).toMatchObject({ ...gift, deliveredAt: expect.any(Number) });
      expect(await getRoomEmbellishmentIntensity(roomId)).toBeGreaterThan(previousIntensity);
      invalidateRoomUpgradeCache();
      expect(await getPendingHouseUpgradeGifts()).toEqual([delivered]);
      expect(await acknowledgeHouseUpgradeGift(gift.id)).toBe(true);
      expect(await getPendingHouseUpgradeGifts()).toEqual([]);
    }
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
  const decoration = await buy({ roomId: 'cozy_den', tier: 1 });
  expect((await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 3, level: 1 })).reason).toBe('unavailable');
  expect((await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 2 })).reason).toBe('unavailable');
  await deliverHouseUpgradeGift(decoration.id);
  expect((await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 3, level: 1 })).success).toBe(true);
  expect(await getDeepenedRooms()).toEqual({});
  expect(await balance()).toBe(1775);
});

test('same-frame duplicate taps charge once and cannot buy the next attunement by accident', async () => {
  const decoration = { roomId: 'cozy_den', tier: 1 } as const;
  const results = await Promise.all([purchaseHouseUpgrade(decoration), purchaseHouseUpgrade(decoration)]);
  expect(results.map(result => result.success)).toEqual([true, false]);
  expect(results[1]).toMatchObject({ reason: 'already_pending', gift: results[0].gift });
  await deliverHouseUpgradeGift(results[0].gift!.id);
  const levelOne = { roomId: 'cozy_den', tier: 3, level: 1 } as const;
  const levels = await Promise.all([purchaseHouseUpgrade(levelOne), purchaseHouseUpgrade(levelOne)]);
  expect(levels.map(result => result.success)).toEqual([true, false]);
  expect(levels[1].reason).toBe('already_pending');
  expect(await getAttunementLevel('cozy_den')).toBe(0);
  expect((await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 3, level: 2 })).reason).toBe('stale_offer');
  const given = await Promise.all([
    deliverHouseUpgradeGift(levels[0].gift!.id), deliverHouseUpgradeGift(levels[0].gift!.id),
  ]);
  expect(given[0]).toEqual(given[1]);
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
  expect(await getPurchasedUpgrades()).toEqual({});
  expect((await getPendingHouseUpgradeGifts()).map(gift => gift.roomId)).toEqual(['cozy_den', 'kitchen']);
  await deliverHouseUpgradeGift(results[1].gift!.id);
  expect(Object.keys(await getPurchasedUpgrades())).toEqual(['kitchen']);
  await acknowledgeHouseUpgradeGift(results[1].gift!.id);
  expect(await getPendingHouseUpgradeGifts()).toEqual([results[0].gift]);
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
  expect(await getPendingHouseUpgradeGifts()).toEqual([]);
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
  expect(await getPendingHouseUpgradeGifts()).toEqual([]);
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
  expect(await purchaseHouseUpgrade(offer)).toMatchObject({ success: false, reason: 'already_pending', newBalance: 1925 });
  expect(await balance()).toBe(1925);
  expect(await getPurchasedUpgrades()).toEqual({});
  expect(await getPendingHouseUpgradeGifts()).toEqual([expect.objectContaining(offer)]);
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
  expect(await getAttunementLevel('cozy_den')).toBe(0);
  expect(await balance()).toBe(1850);
  expect(await ledger()).toHaveLength(1);
  expect((await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 3, level: 1 })).reason).toBe('already_pending');
  const [gift] = await getPendingHouseUpgradeGifts();
  expect(gift).toMatchObject({ roomId: 'cozy_den', tier: 3, level: 1 });
  await deliverHouseUpgradeGift(gift.id);
  expect(await getAttunementLevel('cozy_den')).toBe(1);
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
  expect(await getDeepenedRooms()).toEqual({});
  expect(await getPendingHouseUpgradeGifts()).toEqual([expect.objectContaining({ roomId: 'cozy_den', tier: 2 })]);
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

test('an acknowledgement cannot discard an ungiven gift and stale delivery callbacks grant nothing', async () => {
  const gift = await buy({ roomId: 'cozy_den', tier: 1 });
  expect(await acknowledgeHouseUpgradeGift(gift.id)).toBe(false);
  expect(await deliverHouseUpgradeGift('missing-gift')).toBeNull();
  const copies = await getPendingHouseUpgradeGifts();
  copies[0].roomId = 'kitchen';
  expect(await getPendingHouseUpgradeGifts()).toEqual([gift]);
  expect(await getPurchasedUpgrades()).toEqual({});
  await deliverHouseUpgradeGift(gift.id);
  expect(await acknowledgeHouseUpgradeGift(gift.id)).toBe(true);
  expect(await acknowledgeHouseUpgradeGift(gift.id)).toBe(false);
  expect(await deliverHouseUpgradeGift(gift.id)).toBeNull();
  expect(Object.keys(await getPurchasedUpgrades())).toEqual(['cozy_den']);
  expect(await balance()).toBe(1925);
});

test('a failed delivery commit retains the paid gift and does not activate its effects', async () => {
  const gift = await buy({ roomId: 'cozy_den', tier: 1 });
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === STORAGE_COMMIT_KEY) throw new Error('disk full');
    return originalWrite(key, value);
  });
  await expect(deliverHouseUpgradeGift(gift.id)).rejects.toThrow('disk full');
  expect(await getPurchasedUpgrades()).toEqual({});
  expect(await getPendingHouseUpgradeGifts()).toEqual([gift]);
  (NativeStorage.setItem as jest.Mock).mockImplementation(originalWrite);
  expect(await deliverHouseUpgradeGift(gift.id)).toMatchObject({ deliveredAt: expect.any(Number) });
  expect(await balance()).toBe(1925);
  expect(await ledger()).toHaveLength(1);
});

test('an interrupted giving transaction recovers its exact effect and unfinished reaction without advancing twice', async () => {
  await purchaseRoomUpgrade('cozy_den');
  const gift = await buy({ roomId: 'cozy_den', tier: 3, level: 1 });
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === ROOM_KEY && !failed) { failed = true; throw new Error('interrupted write'); }
    return originalWrite(key, value);
  });
  await expect(deliverHouseUpgradeGift(gift.id)).rejects.toThrow('need recovery');
  invalidateRoomUpgradeCache();
  invalidateProgressCache();
  const delivered = await deliverHouseUpgradeGift(gift.id);
  expect(await getAttunementLevel('cozy_den')).toBe(1);
  expect(await getPendingHouseUpgradeGifts()).toEqual([delivered]);
  expect(delivered).toMatchObject({ ...gift, deliveredAt: expect.any(Number) });
  expect(await deliverHouseUpgradeGift(gift.id)).toEqual(delivered);
  expect(await balance()).toBe(1850);
  expect(await ledger()).toHaveLength(1);
  expect(await NativeStorage.getItem(STORAGE_COMMIT_KEY)).toBeNull();
});

test.each([STORAGE_COMMIT_KEY, ROOM_KEY])('a failed reaction acknowledgement at %s can resume without repeating payment or effects', async failedKey => {
  const gift = await buyAndGive({ roomId: 'cozy_den', tier: 1 });
  let failed = false;
  (NativeStorage.setItem as jest.Mock).mockImplementation(async (key, value) => {
    if (key === failedKey && !failed) { failed = true; throw new Error('interrupted write'); }
    return originalWrite(key, value);
  });
  await expect(acknowledgeHouseUpgradeGift(gift.id)).rejects.toThrow();
  if (failedKey === STORAGE_COMMIT_KEY) expect(await getPendingHouseUpgradeGifts()).toHaveLength(1);
  await acknowledgeHouseUpgradeGift(gift.id);
  expect(await getPendingHouseUpgradeGifts()).toEqual([]);
  expect(Object.keys(await getPurchasedUpgrades())).toEqual(['cozy_den']);
  expect(await balance()).toBe(1925);
  expect(await ledger()).toHaveLength(1);
});

test.each([
  null,
  [{ id: 'x', roomId: 'cozy_den', tier: 3, level: 4, purchasedAt: 1 }],
  [{ id: 'x', roomId: 'unknown', tier: 1, purchasedAt: 1 }],
  [
    { id: 'x', roomId: 'cozy_den', tier: 1, purchasedAt: 1 },
    { id: 'y', roomId: 'cozy_den', tier: 1, purchasedAt: 2 },
  ],
].map(pendingGifts => [pendingGifts]))('an unreadable pending gift record fails closed: %j', async pendingGifts => {
  const raw = JSON.stringify({ purchased: {}, pendingGifts });
  await NativeStorage.setItem(ROOM_KEY, raw);
  await expect(purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 1 })).rejects.toThrow();
  expect(await balance()).toBe(2000);
  expect(await ledger()).toEqual([]);
  expect(await NativeStorage.getItem(ROOM_KEY)).toBe(raw);
});

test('legacy upgrades remain delivered without a gift backfill or new charge', async () => {
  await NativeStorage.setItem(ROOM_KEY, JSON.stringify({ purchased: { cozy_den: 123 }, deepened: { cozy_den: 456 }, attunements: { cozy_den: 2 } }));
  expect(await getPendingHouseUpgradeGifts()).toEqual([]);
  expect(await getAttunementLevel('cozy_den')).toBe(2);
  expect((await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 1 })).reason).toBe('already_owned');
  expect((await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 2 })).reason).toBe('already_owned');
  expect((await purchaseHouseUpgrade({ roomId: 'cozy_den', tier: 3, level: 2 })).reason).toBe('already_owned');
  expect(await balance()).toBe(2000);
  expect(await ledger()).toEqual([]);
  const gift = await buy({ roomId: 'cozy_den', tier: 3, level: 3 });
  expect(await getAttunementLevel('cozy_den')).toBe(2);
  expect(await getPendingHouseUpgradeGifts()).toEqual([gift]);
});

test('a built room can reserve a gift, but giving must wait until its resident is invited', async () => {
  const progress = await getFullProgress();
  await NativeStorage.setItem(PROGRESS_KEY, JSON.stringify({ ...progress, unlockedAnimals: [] }));
  invalidateProgressCache();
  const gift = await buy({ roomId: 'cozy_den', tier: 1 });
  await expect(deliverHouseUpgradeGift(gift.id)).rejects.toThrow('Invite this resident');
  expect(await getPurchasedUpgrades()).toEqual({});
  expect(await getPendingHouseUpgradeGifts()).toEqual([gift]);
  await seed(1925);
  expect(await deliverHouseUpgradeGift(gift.id)).toMatchObject({ deliveredAt: expect.any(Number) });
  expect(await balance()).toBe(1925);
  expect(await ledger()).toHaveLength(1);
});

test('free grants preserve pending gifts and reset removes every delivery receipt', async () => {
  const gift = await buy({ roomId: 'kitchen', tier: 1 });
  expect(await purchaseRoomUpgrade('cozy_den')).toBe(true);
  expect(await getPendingHouseUpgradeGifts()).toEqual([gift]);
  expect(await balance()).toBe(1925);
  await clearRoomUpgrades();
  invalidateRoomUpgradeCache();
  expect(await getPendingHouseUpgradeGifts()).toEqual([]);
  expect(await getPurchasedUpgrades()).toEqual({});
  expect(await deliverHouseUpgradeGift(gift.id)).toBeNull();
});

test('New Cycle preserves waiting gifts and unfinished reactions, and still permits giving at its new phase', async () => {
  const waiting = await buy({ roomId: 'kitchen', tier: 1 });
  const given = await buyAndGive({ roomId: 'cozy_den', tier: 1 });
  const receipts = await getPendingHouseUpgradeGifts();
  const progress = await getFullProgress();
  await NativeStorage.setItem(PROGRESS_KEY, JSON.stringify({
    ...progress, currentPhase: 5, postRevelation: true, houseCompleted: true, finalPuzzleCompleted: true,
  }));
  invalidateProgressCache();
  expect(await startNewCycle()).toBe(1);
  invalidateRoomUpgradeCache();
  expect((await getFullProgress()).currentPhase).toBe(0);
  expect(await getPendingHouseUpgradeGifts()).toEqual(receipts);
  expect(await deliverHouseUpgradeGift(waiting.id)).toMatchObject({ deliveredAt: expect.any(Number) });
  expect(await acknowledgeHouseUpgradeGift(given.id)).toBe(true);
  expect(Object.keys(await getPurchasedUpgrades()).sort()).toEqual(['cozy_den', 'kitchen']);
  expect(await balance()).toBe(1850);
  expect(await ledger()).toHaveLength(2);
});
