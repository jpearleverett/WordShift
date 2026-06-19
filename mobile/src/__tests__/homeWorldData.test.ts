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
import { PHASE_THRESHOLDS } from '../constants/gameBalance';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Reset state between tests
beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
  await clearProgress();
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

  // Pacing guard: house-building must stay spread across the mid-game so the
  // primary investment object keeps growing through the Phase 1→3 valley,
  // rather than completing early and leaving the long climb to the Phase 4
  // climax with no new unlocks. Regressing these gates back toward the
  // front of the game (the old 28/38/48/58/70/85 curve) reopens the valley.
  test('gated unlocks are spread with strictly increasing puzzle gates', () => {
    const gates = UNLOCK_PROGRESSION
      .map(u => u.minPuzzles)
      .filter((n): n is number => typeof n === 'number');
    expect(gates.length).toBeGreaterThanOrEqual(6);
    for (let i = 1; i < gates.length; i++) {
      expect(gates[i]).toBeGreaterThan(gates[i - 1]);
    }
  });

  test('the final house unlock lands before the Phase 3 threshold', () => {
    const gates = UNLOCK_PROGRESSION
      .map(u => u.minPuzzles)
      .filter((n): n is number => typeof n === 'number');
    const lastGate = gates[gates.length - 1];
    const phase3Threshold = PHASE_THRESHOLDS[3]; // 150 weighted ≈ puzzle 135 floor
    // House finishes building before the dread peak, but deep enough that the
    // mid-game isn't a barren stretch (last gate sits in the back half of the
    // pre-Phase-3 window).
    expect(lastGate).toBeGreaterThanOrEqual(120);
    expect(lastGate).toBeLessThan(phase3Threshold);
  });
});

describe('isUnlockAvailable', () => {
  test('first unlock (fox) is always available', async () => {
    const result = await isUnlockAvailable('unlock_fox');
    expect(result.available).toBe(true);
  });

  test('second unlock requires fox to be unlocked first', async () => {
    const result = await isUnlockAvailable('unlock_kitchen');
    expect(result.available).toBe(false);
    expect(result.reason).toContain('Ember');
  });

  test('invalid unlock ID returns unavailable', async () => {
    const result = await isUnlockAvailable('nonexistent');
    expect(result.available).toBe(false);
    expect(result.reason).toBe('Invalid unlock ID');
  });
});

describe('purchaseUnlock', () => {
  test('can purchase free fox unlock', async () => {
    const result = await purchaseUnlock('unlock_fox');
    expect(result.success).toBe(true);
  });

  test('fox unlock makes fox appear in animals', async () => {
    await purchaseUnlock('unlock_fox');
    const animals = await getAnimalsWithStatus();
    const fox = animals.find(a => a.id === 'fox');
    expect(fox!.isUnlocked).toBe(true);
  });

  test('cannot purchase out-of-order unlock', async () => {
    // Try to buy kitchen without unlocking fox first
    await devAddAmber(1000);
    const result = await purchaseUnlock('unlock_kitchen');
    expect(result.success).toBe(false);
  });

  test('cannot purchase without enough amber', async () => {
    // Unlock fox first (free)
    await purchaseUnlock('unlock_fox');
    // Try to buy kitchen without amber
    const result = await purchaseUnlock('unlock_kitchen');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not enough amber');
  });

  test('successful purchase deducts amber', async () => {
    await purchaseUnlock('unlock_fox');
    await devAddAmber(100);
    const progressBefore = await loadProgress();
    const balanceBefore = progressBefore.amber;

    await purchaseUnlock('unlock_kitchen');
    const progressAfter = await loadProgress();
    expect(progressAfter.amber).toBe(balanceBefore - 50); // Kitchen costs 50
  });
});

describe('getNextUnlock', () => {
  test('returns fox as first unlock on fresh game', async () => {
    const next = await getNextUnlock();
    expect(next).not.toBeNull();
    expect(next!.targetId).toBe('fox');
  });

  test('returns kitchen after fox is unlocked', async () => {
    await purchaseUnlock('unlock_fox');
    const next = await getNextUnlock();
    expect(next).not.toBeNull();
    expect(next!.targetId).toBe('kitchen');
  });
});

describe('getRoomsWithStatus', () => {
  test('only cozy_den is unlocked initially', async () => {
    const rooms = await getRoomsWithStatus();
    const unlocked = rooms.filter(r => r.isUnlocked);
    expect(unlocked).toHaveLength(1);
    expect(unlocked[0].id).toBe('cozy_den');
  });
});

describe('late-unlock dialogue fast-forward', () => {
  const { getPhaseStartIndex, getDialoguesForAnimal } =
    require('../services/dialogue/animalDialogueBase');

  test('phase 0 start index is 0 for every animal', () => {
    for (const type of ['fox', 'owl', 'sloth', 'rabbit']) {
      expect(getPhaseStartIndex(type, 0)).toBe(0);
    }
  });

  test('start index equals the count of earlier-phase lines', () => {
    const owlPhase0and1 = getDialoguesForAnimal('owl', 1).length;
    expect(getPhaseStartIndex('owl', 2)).toBe(owlPhase0and1);
  });

  test('start index points at a line of the requested phase', () => {
    const idx = getPhaseStartIndex('pangolin', 2);
    const all = getDialoguesForAnimal('pangolin', 4);
    expect(all[idx].phase).toBe(2);
  });
});

describe('resolveDialogueIndex (locked-animal forward references)', () => {
  const { resolveDialogueIndex, getDialoguesForAnimal } =
    require('../services/dialogue/animalDialogueBase');
  const ALL = new Set(['fox', 'pangolin', 'owl', 'axolotl', 'sloth', 'fennec_fox', 'capybara', 'wombat', 'rabbit', 'red_panda']);

  test('passes through untagged lines unchanged', () => {
    expect(resolveDialogueIndex('fox', 0, 4, ALL)).toBe(0);
  });

  test('skips a line that names a locked animal', () => {
    const foxLines = getDialoguesForAnimal('fox', 4);
    const blocked = foxLines.findIndex((d: { id: string }) => d.id === 'fx_0_5'); // mentions Archimedes
    expect(blocked).toBeGreaterThan(-1);
    const onlyFox = new Set(['fox']);
    const resolved = resolveDialogueIndex('fox', blocked, 4, onlyFox);
    expect(resolved).toBeGreaterThan(blocked);
    // The resolved line must not require any locked animal
    const line = foxLines[resolved];
    for (const req of line.requiresAnimals ?? []) {
      expect(onlyFox.has(req)).toBe(true);
    }
  });

  test('does not skip when the referenced animal is unlocked', () => {
    const foxLines = getDialoguesForAnimal('fox', 4);
    const blocked = foxLines.findIndex((d: { id: string }) => d.id === 'fx_0_5');
    expect(resolveDialogueIndex('fox', blocked, 4, ALL)).toBe(blocked);
  });

  test('indices beyond the pool pass through (phase 5 cycling)', () => {
    const total = getDialoguesForAnimal('fox', 4).length;
    expect(resolveDialogueIndex('fox', total + 7, 4, new Set(['fox']))).toBe(total + 7);
  });

  test('every question-web line is tagged with its target', () => {
    for (const [animal, target] of [
      ['fox', 'wombat'], ['pangolin', 'axolotl'], ['owl', 'fennec_fox'],
      ['axolotl', 'sloth'], ['fennec_fox', 'capybara'], ['wombat', 'rabbit'],
      ['rabbit', 'red_panda'],
    ] as const) {
      const lines = getDialoguesForAnimal(animal, 2);
      const web = lines.find((d: { id: string }) => d.id.endsWith('_2_w1'));
      expect(web).toBeDefined();
      expect(web.requiresAnimals).toContain(target);
    }
  });
});
