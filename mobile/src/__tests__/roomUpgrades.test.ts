import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ROOM_UPGRADES,
  ROOM_DEEPENINGS,
  getRoomUpgrade,
  getRoomDeepening,
  isRoomUpgraded,
  isRoomDeepened,
  getPurchasedUpgrades,
  getDeepenedRooms,
  areUpgradesAvailable,
  areDeepeningsAvailable,
  purchaseRoomUpgrade,
  purchaseRoomDeepening,
  clearRoomUpgrades,
} from '../services/roomUpgrades';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearRoomUpgrades();
});

describe('room upgrade catalog', () => {
  it('has a tier-1 upgrade and a tier-2 deepening for every room (matched ids)', () => {
    expect(ROOM_UPGRADES.length).toBe(10);
    expect(ROOM_DEEPENINGS.length).toBe(10);
    const upgradeIds = ROOM_UPGRADES.map(u => u.roomId).sort();
    const deepeningIds = ROOM_DEEPENINGS.map(u => u.roomId).sort();
    expect(deepeningIds).toEqual(upgradeIds);
  });

  it('prices deepenings above their tier-1 counterpart', () => {
    for (const deep of ROOM_DEEPENINGS) {
      const base = getRoomUpgrade(deep.roomId)!;
      expect(deep.cost).toBeGreaterThan(base.cost);
    }
  });
});

describe('availability gating', () => {
  it('tier-1 and deepenings both open at Phase 2 (continuous mid-valley sink)', () => {
    expect(areUpgradesAvailable(1 as never)).toBe(false);
    expect(areUpgradesAvailable(2 as never)).toBe(true);
    // Deepenings open at the same Phase-2 gate as tier-1 to fill the ~puzzle
    // 65–135 spend valley (still require the tier-1 decoration first).
    expect(areDeepeningsAvailable(1 as never)).toBe(false);
    expect(areDeepeningsAvailable(2 as never)).toBe(true);
    expect(areDeepeningsAvailable(3 as never)).toBe(true);
  });
});

describe('purchase flow', () => {
  it('buys a tier-1 upgrade once', async () => {
    expect(await purchaseRoomUpgrade('cozy_den')).toBe(true);
    expect(await isRoomUpgraded('cozy_den')).toBe(true);
    expect(await purchaseRoomUpgrade('cozy_den')).toBe(false); // already owned
    expect(Object.keys(await getPurchasedUpgrades())).toEqual(['cozy_den']);
  });

  it('refuses a deepening until the tier-1 decoration is in place', async () => {
    expect(await purchaseRoomDeepening('cozy_den')).toBe(false); // no tier-1 yet
    expect(await isRoomDeepened('cozy_den')).toBe(false);

    await purchaseRoomUpgrade('cozy_den');
    expect(await purchaseRoomDeepening('cozy_den')).toBe(true);
    expect(await isRoomDeepened('cozy_den')).toBe(true);
    expect(await purchaseRoomDeepening('cozy_den')).toBe(false); // already deepened
  });

  it('keeps tier-1 and tier-2 ownership in separate maps', async () => {
    await purchaseRoomUpgrade('kitchen');
    await purchaseRoomDeepening('kitchen');
    expect(Object.keys(await getPurchasedUpgrades())).toEqual(['kitchen']);
    expect(Object.keys(await getDeepenedRooms())).toEqual(['kitchen']);
  });

  it('rejects unknown rooms', async () => {
    expect(await purchaseRoomUpgrade('not_a_room')).toBe(false);
    expect(await purchaseRoomDeepening('not_a_room')).toBe(false);
    expect(getRoomDeepening('not_a_room')).toBeUndefined();
  });
});

describe('persistence', () => {
  it('persists deepenings across a save/reload', async () => {
    await purchaseRoomUpgrade('study');
    await purchaseRoomDeepening('study');
    // The save was written; a getter re-reads from the same backing store.
    expect(await isRoomDeepened('study')).toBe(true);
    const raw = await AsyncStorage.getItem('wordshift_room_upgrades');
    expect(JSON.parse(raw!).deepened.study).toBeGreaterThan(0);
  });

  it('clears both tiers', async () => {
    await purchaseRoomUpgrade('garden');
    await purchaseRoomDeepening('garden');
    await clearRoomUpgrades();
    expect(await getPurchasedUpgrades()).toEqual({});
    expect(await getDeepenedRooms()).toEqual({});
  });
});
