import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ROOM_UPGRADES,
  ROOM_DEEPENINGS,
  ROOM_ATTUNEMENTS,
  ATTUNEMENT_COSTS,
  ATTUNEMENT_LEVEL_NAMES,
  MAX_ATTUNEMENT_LEVEL,
  getRoomUpgrade,
  getRoomDeepening,
  getRoomAttunement,
  isRoomUpgraded,
  isRoomDeepened,
  getPurchasedUpgrades,
  getDeepenedRooms,
  getAttunedRooms,
  getAttunementLevel,
  getAttunementForLevel,
  getNextAttunementInfo,
  areUpgradesAvailable,
  areDeepeningsAvailable,
  areAttunementsAvailable,
  purchaseRoomUpgrade,
  purchaseRoomDeepening,
  purchaseRoomAttunement,
  getRoomEmbellishmentIntensity,
  clearRoomUpgrades,
  invalidateRoomUpgradeCache,
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
    expect(ROOM_UPGRADES.length).toBe(13);
    expect(ROOM_DEEPENINGS.length).toBe(13);
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

  it('clears all three tiers', async () => {
    await purchaseRoomUpgrade('garden');
    await purchaseRoomDeepening('garden');
    await purchaseRoomAttunement('garden');
    await clearRoomUpgrades();
    expect(await getPurchasedUpgrades()).toEqual({});
    expect(await getDeepenedRooms()).toEqual({});
    expect(await getAttunedRooms()).toEqual({});
    expect(await getAttunementLevel('garden')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tier-3 attunements
// ---------------------------------------------------------------------------

describe('attunement catalog', () => {
  it('has 3 attunement levels for every room (ids matched to tier-1)', () => {
    expect(ROOM_ATTUNEMENTS.length).toBe(13);
    const upgradeIds = ROOM_UPGRADES.map(u => u.roomId).sort();
    const attunementIds = ROOM_ATTUNEMENTS.map(a => a.roomId).sort();
    expect(attunementIds).toEqual(upgradeIds);
    for (const attunement of ROOM_ATTUNEMENTS) {
      expect(attunement.descriptions.length).toBe(MAX_ATTUNEMENT_LEVEL);
      for (const desc of attunement.descriptions) {
        expect(desc.length).toBeGreaterThan(20); // real copy, not a stub
      }
    }
  });

  it('follows the 150/200/250 cost schedule (600 per room, 7,800 all-in)', () => {
    expect(ATTUNEMENT_COSTS).toEqual([150, 200, 250]);
    expect(ATTUNEMENT_LEVEL_NAMES).toEqual(['Kindled', 'Humming', 'Attuned']);
    const perRoom = ATTUNEMENT_COSTS.reduce((a, b) => a + b, 0);
    expect(perRoom).toBe(600);
    expect(perRoom * ROOM_ATTUNEMENTS.length).toBe(7800);
  });

  it('keeps the copy hygienic (no em dashes, never names the phase system)', () => {
    for (const attunement of ROOM_ATTUNEMENTS) {
      for (const desc of attunement.descriptions) {
        expect(desc).not.toMatch(/[—–]/); // — or –
        expect(desc.toLowerCase()).not.toContain('phase');
      }
    }
  });
});

describe('attunement gating', () => {
  it('opens at Phase 2, the same gate as deepenings', () => {
    expect(areAttunementsAvailable(0 as never)).toBe(false);
    expect(areAttunementsAvailable(1 as never)).toBe(false);
    expect(areAttunementsAvailable(2 as never)).toBe(true);
    expect(areAttunementsAvailable(5 as never)).toBe(true);
  });

  it('requires the tier-1 decoration before the first attunement', async () => {
    expect(await purchaseRoomAttunement('cozy_den')).toBe(false); // no tier-1 yet
    expect(await getAttunementLevel('cozy_den')).toBe(0);

    await purchaseRoomUpgrade('cozy_den');
    expect(await purchaseRoomAttunement('cozy_den')).toBe(true);
    expect(await getAttunementLevel('cozy_den')).toBe(1);
  });

  it('does NOT require the deepening', async () => {
    await purchaseRoomUpgrade('study');
    expect(await isRoomDeepened('study')).toBe(false);
    expect(await purchaseRoomAttunement('study')).toBe(true); // deepening untouched
    expect(await isRoomDeepened('study')).toBe(false);
  });
});

describe('attunement purchase order', () => {
  it('purchases levels strictly in order and stops at level 3', async () => {
    await purchaseRoomUpgrade('kitchen');

    for (let level = 1; level <= MAX_ATTUNEMENT_LEVEL; level++) {
      const next = await getNextAttunementInfo('kitchen');
      expect(next).not.toBeNull();
      expect(next!.level).toBe(level);
      expect(next!.cost).toBe(ATTUNEMENT_COSTS[level - 1]);
      expect(next!.name).toBe(ATTUNEMENT_LEVEL_NAMES[level - 1]);
      expect(next!.description).toBe(getRoomAttunement('kitchen')!.descriptions[level - 1]);

      expect(await purchaseRoomAttunement('kitchen')).toBe(true);
      expect(await getAttunementLevel('kitchen')).toBe(level);
    }

    // Fully attuned: no next info, no fourth purchase.
    expect(await getNextAttunementInfo('kitchen')).toBeNull();
    expect(await purchaseRoomAttunement('kitchen')).toBe(false);
    expect(await getAttunementLevel('kitchen')).toBe(MAX_ATTUNEMENT_LEVEL);
  });

  it('rejects unknown rooms and out-of-range levels', async () => {
    expect(getRoomAttunement('not_a_room')).toBeUndefined();
    expect(await purchaseRoomAttunement('not_a_room')).toBe(false);
    expect(await getNextAttunementInfo('not_a_room')).toBeNull();
    expect(getAttunementForLevel('cozy_den', 0)).toBeNull();
    expect(getAttunementForLevel('cozy_den', 4)).toBeNull();
    expect(getAttunementForLevel('cozy_den', 2)).toMatchObject({
      level: 2,
      cost: 200,
      name: 'Humming',
    });
  });

  it('tracks per-room levels independently', async () => {
    await purchaseRoomUpgrade('garden');
    await purchaseRoomUpgrade('burrow');
    await purchaseRoomAttunement('garden');
    await purchaseRoomAttunement('garden');
    await purchaseRoomAttunement('burrow');
    expect(await getAttunedRooms()).toEqual({ garden: 2, burrow: 1 });
  });
});

describe('backward compatibility', () => {
  it('loads a legacy stored shape with no attunements map (all levels zero)', async () => {
    await AsyncStorage.setItem(
      'wordshift_room_upgrades',
      JSON.stringify({ purchased: { study: 123 }, deepened: { study: 456 } })
    );
    invalidateRoomUpgradeCache();

    expect(await isRoomUpgraded('study')).toBe(true);
    expect(await isRoomDeepened('study')).toBe(true);
    expect(await getAttunementLevel('study')).toBe(0);
    expect(await getAttunedRooms()).toEqual({});

    // The legacy save can start attuning immediately (tier-1 is in place).
    expect(await purchaseRoomAttunement('study')).toBe(true);
    expect(await getAttunementLevel('study')).toBe(1);
    const raw = await AsyncStorage.getItem('wordshift_room_upgrades');
    expect(JSON.parse(raw!).attunements.study).toBe(1);
  });

  it('loads the oldest shape (purchased only, predating deepenings)', async () => {
    await AsyncStorage.setItem(
      'wordshift_room_upgrades',
      JSON.stringify({ purchased: { kitchen: 789 } })
    );
    invalidateRoomUpgradeCache();

    expect(await isRoomUpgraded('kitchen')).toBe(true);
    expect(await isRoomDeepened('kitchen')).toBe(false);
    expect(await getAttunementLevel('kitchen')).toBe(0);
  });
});

describe('embellishment intensity (wave-2 renderer input)', () => {
  it('sums tier-1 (0.25) + deepening (0.25) + attunements (0.5 x level/3)', async () => {
    expect(await getRoomEmbellishmentIntensity('cozy_den')).toBe(0);
    expect(await getRoomEmbellishmentIntensity('not_a_room')).toBe(0);

    await purchaseRoomUpgrade('cozy_den');
    expect(await getRoomEmbellishmentIntensity('cozy_den')).toBeCloseTo(0.25, 5);

    await purchaseRoomDeepening('cozy_den');
    expect(await getRoomEmbellishmentIntensity('cozy_den')).toBeCloseTo(0.5, 5);

    await purchaseRoomAttunement('cozy_den');
    expect(await getRoomEmbellishmentIntensity('cozy_den')).toBeCloseTo(0.5 + 0.5 / 3, 5);

    await purchaseRoomAttunement('cozy_den');
    expect(await getRoomEmbellishmentIntensity('cozy_den')).toBeCloseTo(0.5 + (0.5 * 2) / 3, 5);

    await purchaseRoomAttunement('cozy_den');
    expect(await getRoomEmbellishmentIntensity('cozy_den')).toBe(1);
  });

  it('counts attunements without the deepening', async () => {
    await purchaseRoomUpgrade('office');
    await purchaseRoomAttunement('office');
    await purchaseRoomAttunement('office');
    await purchaseRoomAttunement('office');
    expect(await getRoomEmbellishmentIntensity('office')).toBeCloseTo(0.75, 5);
  });
});
