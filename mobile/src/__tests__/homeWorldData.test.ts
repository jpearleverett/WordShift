import {
  ROOMS,
  ANIMALS,
  UNLOCK_PROGRESSION,
  isUnlockAvailable,
  purchaseUnlock,
  getNextUnlock,
  getRoomsWithStatus,
  getAnimalsWithStatus,
  getUnlockStatus,
} from '../services/homeWorldData';
import { clearProgress, loadProgress, devAddAmber } from '../services/amberCurrency';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reset state between tests
beforeEach(() => {
  (AsyncStorage.clear as jest.Mock)();
  clearProgress();
});

describe('ROOMS data', () => {
  test('has 10 rooms defined', () => {
    expect(ROOMS).toHaveLength(10);
  });

  test('all rooms have required fields', () => {
    for (const room of ROOMS) {
      expect(room.id).toBeDefined();
      expect(room.name).toBeDefined();
      expect(room.theme).toBeDefined();
      expect(room.animalId).toBeDefined();
      expect(typeof room.floor).toBe('number');
    }
  });

  test('cozy_den is the starter room', () => {
    const starter = ROOMS.find(r => r.id === 'cozy_den');
    expect(starter).toBeDefined();
    expect(starter!.isUnlocked).toBe(true);
    expect(starter!.floor).toBe(0);
  });

  test('all rooms have unique IDs', () => {
    const ids = ROOMS.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('ANIMALS data', () => {
  test('has 10 animals defined', () => {
    expect(ANIMALS).toHaveLength(10);
  });

  test('fox is the starter animal', () => {
    const fox = ANIMALS.find(a => a.id === 'fox');
    expect(fox).toBeDefined();
    expect(fox!.name).toBe('Ember');
    expect(fox!.roomId).toBe('cozy_den');
  });

  test('each animal has a room assignment', () => {
    for (const animal of ANIMALS) {
      const room = ROOMS.find(r => r.id === animal.roomId);
      expect(room).toBeDefined();
    }
  });
});

describe('UNLOCK_PROGRESSION', () => {
  test('has 19 unlock entries', () => {
    expect(UNLOCK_PROGRESSION).toHaveLength(19);
  });

  test('first unlock is fox (free)', () => {
    expect(UNLOCK_PROGRESSION[0].targetId).toBe('fox');
    expect(UNLOCK_PROGRESSION[0].cost).toBe(0);
    expect(UNLOCK_PROGRESSION[0].type).toBe('character');
  });

  test('last unlock is red_panda', () => {
    const last = UNLOCK_PROGRESSION[UNLOCK_PROGRESSION.length - 1];
    expect(last.targetId).toBe('red_panda');
    expect(last.type).toBe('character');
  });

  test('unlock order is sequential', () => {
    for (let i = 0; i < UNLOCK_PROGRESSION.length; i++) {
      expect(UNLOCK_PROGRESSION[i].order).toBe(i + 1);
    }
  });

  test('alternates between character and room unlocks', () => {
    // First is character (fox), then room, character, room, ...
    expect(UNLOCK_PROGRESSION[0].type).toBe('character');
    expect(UNLOCK_PROGRESSION[1].type).toBe('room');
    expect(UNLOCK_PROGRESSION[2].type).toBe('character');
  });
});

describe('isUnlockAvailable', () => {
  test('first unlock (fox) is always available', () => {
    const result = isUnlockAvailable('unlock_fox');
    expect(result.available).toBe(true);
  });

  test('second unlock requires fox to be unlocked first', () => {
    const result = isUnlockAvailable('unlock_kitchen');
    expect(result.available).toBe(false);
    expect(result.reason).toContain('Ember');
  });

  test('invalid unlock ID returns unavailable', () => {
    const result = isUnlockAvailable('nonexistent');
    expect(result.available).toBe(false);
    expect(result.reason).toBe('Invalid unlock ID');
  });
});

describe('purchaseUnlock', () => {
  test('can purchase free fox unlock', () => {
    const result = purchaseUnlock('unlock_fox');
    expect(result.success).toBe(true);
  });

  test('fox unlock makes fox appear in animals', () => {
    purchaseUnlock('unlock_fox');
    const animals = getAnimalsWithStatus();
    const fox = animals.find(a => a.id === 'fox');
    expect(fox!.isUnlocked).toBe(true);
  });

  test('cannot purchase out-of-order unlock', () => {
    // Try to buy kitchen without unlocking fox first
    devAddAmber(1000);
    const result = purchaseUnlock('unlock_kitchen');
    expect(result.success).toBe(false);
  });

  test('cannot purchase without enough amber', () => {
    // Unlock fox first (free)
    purchaseUnlock('unlock_fox');
    // Try to buy kitchen without amber
    const result = purchaseUnlock('unlock_kitchen');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not enough amber');
  });

  test('successful purchase deducts amber', () => {
    purchaseUnlock('unlock_fox');
    devAddAmber(100);
    const progressBefore = loadProgress();
    const balanceBefore = progressBefore.amber;

    purchaseUnlock('unlock_kitchen');
    const progressAfter = loadProgress();
    expect(progressAfter.amber).toBe(balanceBefore - 50); // Kitchen costs 50
  });
});

describe('getNextUnlock', () => {
  test('returns fox as first unlock on fresh game', () => {
    const next = getNextUnlock();
    expect(next).not.toBeNull();
    expect(next!.targetId).toBe('fox');
  });

  test('returns kitchen after fox is unlocked', () => {
    purchaseUnlock('unlock_fox');
    const next = getNextUnlock();
    expect(next).not.toBeNull();
    expect(next!.targetId).toBe('kitchen');
  });
});

describe('getRoomsWithStatus', () => {
  test('only cozy_den is unlocked initially', () => {
    const rooms = getRoomsWithStatus();
    const unlocked = rooms.filter(r => r.isUnlocked);
    expect(unlocked).toHaveLength(1);
    expect(unlocked[0].id).toBe('cozy_den');
  });
});
