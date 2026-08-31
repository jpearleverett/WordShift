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
  canReserveUnlock,
  reserveNextUnlock,
  claimReservedUnlockIfReady,
  getReservedArrivalText,
  getReserveGateText,
  canSkipUnlockGate,
  skipUnlockGate,
  getUnlockSkipCost,
  getSkipGateText,
  canSpeedUpReservedUnlock,
  skipReservedUnlock,
  isDescentTrioRoomUnlock,
  getReservedSkipCost,
} from '../services/homeWorldData';
import { clearProgress, loadProgress, devAddAmber, getReservedUnlockId } from '../services/amberCurrency';
import {
  PHASE_THRESHOLDS,
  MIN_PUZZLES_FOR_PHASE,
  FINALE_DWELL_PUZZLES,
  FINALE_ARM_MIN_PUZZLES,
  UNLOCK_SKIP_PREMIUM,
} from '../constants/gameBalance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyTend,
  clearTendingState,
  setPhase5CaughtUp,
} from '../services/tending';
import { buildPhase5Pool } from '../services/dialogue/phase5Pool';

// Reset state between tests
beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
  await clearProgress();
  await clearTendingState();
});

describe('ROOMS data', () => {
  test('has 13 rooms defined', () => {
    expect(ROOMS).toHaveLength(13);
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
  test('has 13 animals defined', () => {
    expect(ANIMALS).toHaveLength(13);
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
  test('has one unlock entry per room and animal (minus the starter room)', () => {
    expect(UNLOCK_PROGRESSION).toHaveLength(ROOMS.length + ANIMALS.length - 1);
  });

  test('first unlock is fox (free)', () => {
    expect(UNLOCK_PROGRESSION[0].targetId).toBe('fox');
    expect(UNLOCK_PROGRESSION[0].cost).toBe(0);
    expect(UNLOCK_PROGRESSION[0].type).toBe('character');
  });

  test('last unlock is kakapo', () => {
    const last = UNLOCK_PROGRESSION[UNLOCK_PROGRESSION.length - 1];
    expect(last.targetId).toBe('kakapo');
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

  test('late rooms recruit the descent trio at their intended gates', () => {
    const gatesById = Object.fromEntries(
      UNLOCK_PROGRESSION
        .filter(unlock => ['unlock_bamboo_attic', 'unlock_star_loft', 'unlock_belfry', 'unlock_sky_garden'].includes(unlock.id))
        .map(unlock => [unlock.id, unlock.minPuzzles])
    );

    expect(gatesById).toEqual({
      unlock_bamboo_attic: 74,
      unlock_star_loft: 84,
      unlock_belfry: 88,
      unlock_sky_garden: 92,
    });

    // LATE_PHASE_RECRUITS derivation guard (types/homeWorld.ts): the trio's
    // room gates must ALL sit at or past the Phase 3 weighted threshold —
    // weighted progress never trails raw puzzles solved, so gate >= threshold
    // proves the trio cannot exist before global Phase 3. Bamboo (the room
    // below) is deliberately NOT part of the derivation.
    for (const id of ['unlock_star_loft', 'unlock_belfry', 'unlock_sky_garden']) {
      expect(gatesById[id]).toBeGreaterThanOrEqual(PHASE_THRESHOLDS[3]);
    }
  });

  test('finale arming floor leaves a Phase 4 dwell window after the last recruit', () => {
    expect(FINALE_ARM_MIN_PUZZLES).toBe(115);
    const lastGate = UNLOCK_PROGRESSION.find(unlock => unlock.id === 'unlock_sky_garden')!.minPuzzles!;
    expect(lastGate + 1 + FINALE_DWELL_PUZZLES).toBeLessThanOrEqual(FINALE_ARM_MIN_PUZZLES);
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

  // DELIBERATE geography (2026-07 compressed pacing): the house keeps growing
  // THROUGH Growing Shadows and past the reveal (the original ten rooms top
  // out at the Bamboo Attic gate 74; the three high rooms gate at 84/88/92).
  // ALL THREE high-room gates must sit at or past the Phase 3 weighted
  // threshold (PHASE_THRESHOLDS[3] = 84): the LATE_PHASE_RECRUITS derivation
  // in types/homeWorld.ts relies on gate >= threshold plus
  // weighted-never-trails-raw to prove the descent trio can only unlock at
  // global Phase 3+. The last gate must stay clear of the Phase 4 weighted
  // threshold — house completion (~96-100) must land before finale arming
  // (115), never compete with it.
  test('the final house unlock lands in the descent, before finale territory', () => {
    const gates = UNLOCK_PROGRESSION
      .map(u => u.minPuzzles)
      .filter((n): n is number => typeof n === 'number');
    const lastGate = gates[gates.length - 1];
    const phase3Threshold = PHASE_THRESHOLDS[3]; // 84 weighted (Phase 3 floor is 62 real puzzles)
    const phase4Threshold = PHASE_THRESHOLDS[4]; // 124 weighted — finale territory
    expect(lastGate).toBeGreaterThanOrEqual(phase3Threshold);
    expect(lastGate).toBeLessThan(phase4Threshold);
  });

  // The reveal floor (90) must land before the house completes (sky-garden
  // gate + the final animal), so the Phase-4 dwell + finale play out inside a
  // finished temple. Completion/recruit is ~96-100, capped dwell completes
  // ~104-108, arming waits for 115, the final board is ~116, and
  // post-revelation ~117-122.
  test('house completion sits after the reveal floor, before the Phase 5 floor', () => {
    const gates = UNLOCK_PROGRESSION
      .map(u => u.minPuzzles)
      .filter((n): n is number => typeof n === 'number');
    const lastGate = gates[gates.length - 1];
    expect(lastGate).toBeGreaterThan(MIN_PUZZLES_FOR_PHASE[4]); // reveal first
    expect(lastGate + 1).toBeLessThanOrEqual(FINALE_ARM_MIN_PUZZLES);
    expect(FINALE_ARM_MIN_PUZZLES + 1).toBeLessThan(MIN_PUZZLES_FOR_PHASE[5]); // marked finale before the Phase 5 floor binds
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

  // Behavioral coverage through purchaseUnlock (the fast-forward's caller).
  // Buys every unlock in order up to and including the target, so room
  // prerequisites are always satisfied.
  async function unlockThrough(targetUnlockId: string) {
    await devAddAmber(100000);
    for (const u of UNLOCK_PROGRESSION) {
      const res = await purchaseUnlock(u.id);
      expect(res.success).toBe(true);
      if (u.id === targetUnlockId) break;
    }
  }

  test('no fast-forward below global Phase 2', async () => {
    const p = await loadProgress();
    p.puzzlesSolved = 40; // clears the jungle gate (19)
    p.currentPhase = 1;
    await unlockThrough('unlock_sloth');
    const after = await loadProgress();
    expect(after.lastDialogueRead['sloth'] ?? 0).toBe(0);
  });

  // The bright-replay seam: sloth is lagging (-1), so at global Phase 2 its
  // animalPhase is 1 and "one phase behind" used to compute phase 0 — a dark
  // catch-up intro followed by bright small talk under a dusk sky. The
  // fast-forward now floors at phase 1 whenever it applies at all.
  test('lagging animal unlocked at global Phase 2 starts at phase 1, never phase 0', async () => {
    const p = await loadProgress();
    p.puzzlesSolved = 40;
    p.currentPhase = 2;
    await unlockThrough('unlock_sloth');
    const start = getPhaseStartIndex('sloth', 1);
    expect(start).toBeGreaterThan(0); // floor is meaningful: phase 1, not 0
    const after = await loadProgress();
    expect(after.lastDialogueRead['sloth']).toBe(start);
  });

  test('vanguard behavior unchanged: owl at global Phase 2 starts at phase 2 (animalPhase 3 minus one)', async () => {
    const p = await loadProgress();
    p.currentPhase = 2;
    await unlockThrough('unlock_owl');
    const after = await loadProgress();
    expect(after.lastDialogueRead['owl']).toBe(getPhaseStartIndex('owl', 2));
  });

  test('Vesper starts at her current effective phase instead of replaying an earlier block', async () => {
    const p = await loadProgress();
    p.puzzlesSolved = 200;
    p.currentPhase = 4;
    await unlockThrough('unlock_tarsier');

    const after = await loadProgress();
    expect(after.lastDialogueRead['tarsier']).toBe(getPhaseStartIndex('tarsier', 4));
  });

  // Lagging converges to phase 4 at the reveal (getAnimalPhase drops the -1
  // at global Phase 4), so Moss's effective phase here is 4, not 3.
  test('Moss starts at his current effective lagging phase', async () => {
    const p = await loadProgress();
    p.puzzlesSolved = 200;
    p.currentPhase = 4;
    await unlockThrough('unlock_kakapo');

    const after = await loadProgress();
    expect(after.lastDialogueRead['kakapo']).toBe(getPhaseStartIndex('kakapo', 4));
  });

  test('never rewinds an existing read position', async () => {
    const p = await loadProgress();
    p.puzzlesSolved = 40;
    p.currentPhase = 2;
    p.lastDialogueRead = { ...(p.lastDialogueRead ?? {}), sloth: 9999 };
    await unlockThrough('unlock_sloth');
    expect((await loadProgress()).lastDialogueRead['sloth']).toBe(9999);
  });
});

describe('getAnimalsWithStatus new-dialogue badge honesty', () => {
  const { getTotalDialogueCount } = require('../services/dialogue/animalDialogueBase');

  // Middle-tier animal (offset 0) → animalPhase == global phase, so the math is
  // simple. Unlock it and pin its stored read index directly.
  async function setup(index: number) {
    const p = await loadProgress();
    p.currentPhase = 0;
    p.unlockedAnimals = ['fox', 'pangolin'];
    p.lastDialogueRead = { ...(p.lastDialogueRead ?? {}), pangolin: index };
    const animals = await getAnimalsWithStatus();
    return animals.find(a => a.id === 'pangolin')!;
  }

  test('badge is lit while an unread line remains (index below total)', async () => {
    const total = getTotalDialogueCount('pangolin', 0);
    const pangolin = await setup(total - 1); // sitting on the last line
    expect(pangolin.hasNewDialogue).toBe(true);
  });

  test('badge goes dark once the index advances past the last line (index == total)', async () => {
    // This is the terminal state the last-line close now writes — without it the
    // index caps at total-1 and the badge would re-light forever (the "stuck"
    // sloth). Pinning it keeps the boundary honest.
    const total = getTotalDialogueCount('pangolin', 0);
    const pangolin = await setup(total);
    expect(pangolin.hasNewDialogue).toBe(false);
  });

  test('Phase 5 badge ignores old regular backlog and relights for a new Tending milestone line', async () => {
    const p = await loadProgress();
    p.currentPhase = 5;
    p.postRevelation = true;
    p.unlockedAnimals = ['pangolin'];
    // Deliberately stale: Phase 5 must never advertise unread Phase 3/4 lines.
    p.lastDialogueRead = { pangolin: 0 };

    const basePoolLength = buildPhase5Pool('pangolin', 0, null).length;
    await setPhase5CaughtUp('pangolin', basePoolLength);

    let animals = await getAnimalsWithStatus();
    expect(animals.find(a => a.id === 'pangolin')!.hasNewDialogue).toBe(false);

    for (let level = 1; level <= 5; level++) {
      await applyTend(100, `2026-07-${String(level).padStart(2, '0')}`);
    }

    animals = await getAnimalsWithStatus();
    expect(animals.find(a => a.id === 'pangolin')!.hasNewDialogue).toBe(true);
  });
});

describe('resolveDialogueIndex (locked-animal forward references)', () => {
  const { resolveDialogueIndex, getDialoguesForAnimal } =
    require('../services/dialogue/animalDialogueBase');
  const ALL = new Set(['fox', 'pangolin', 'owl', 'axolotl', 'sloth', 'fennec_fox', 'capybara', 'wombat', 'rabbit', 'red_panda']);

  test('passes through untagged lines unchanged', () => {
    expect(resolveDialogueIndex('fox', 0, 4, ALL)).toBe(0);
  });

  test('skips a line that requires a locked animal', () => {
    // Content-agnostic: find the first fox base line gated behind another animal.
    const foxLines = getDialoguesForAnimal('fox', 4);
    const blocked = foxLines.findIndex((d: { requiresAnimals?: string[] }) => (d.requiresAnimals ?? []).length > 0);
    expect(blocked).toBeGreaterThan(-1);
    const onlyFox = new Set(['fox']); // every animal the gated line needs is locked
    const resolved = resolveDialogueIndex('fox', blocked, 4, onlyFox);
    expect(resolved).toBeGreaterThan(blocked);
    // The resolved line must not require any locked animal (fox never gates on itself).
    const line = foxLines[resolved];
    for (const req of line.requiresAnimals ?? []) {
      expect(onlyFox.has(req)).toBe(true);
    }
  });

  test('does not skip when the required animal is unlocked', () => {
    const foxLines = getDialoguesForAnimal('fox', 4);
    const blocked = foxLines.findIndex((d: { requiresAnimals?: string[] }) => (d.requiresAnimals ?? []).length > 0);
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

describe('reserve-ahead (pay-now, build-when-gate-opens)', () => {
  // Unlock everything in order up to (not including) the given gated unlock,
  // leaving it as the next unlock, gated only by its minPuzzles (puzzlesSolved
  // stays 0 because buying doesn't complete puzzles).
  async function unlockUpTo(targetUnlockId: string) {
    await devAddAmber(100000);
    for (const u of UNLOCK_PROGRESSION) {
      if (u.id === targetUnlockId) break;
      await purchaseUnlock(u.id);
    }
  }

  test('jungle is the next unlock, gated by puzzles, after its prerequisites', async () => {
    await unlockUpTo('unlock_jungle');
    const next = await getNextUnlock();
    expect(next?.id).toBe('unlock_jungle');
    const avail = await isUnlockAvailable('unlock_jungle');
    expect(avail.available).toBe(false); // puzzle-gated
  });

  test('canReserveUnlock: true when gated + affordable + prerequisites met', async () => {
    await unlockUpTo('unlock_jungle');
    expect(await canReserveUnlock('unlock_jungle')).toBe(true);
  });

  test('canReserveUnlock: false when not affordable', async () => {
    await unlockUpTo('unlock_jungle');
    // Drain amber below the jungle cost by reserving... instead, spend it away.
    const p = await loadProgress();
    p.amber = 0;
    expect(await canReserveUnlock('unlock_jungle')).toBe(false);
  });

  test('canReserveUnlock: false once the puzzle gate is already met', async () => {
    await unlockUpTo('unlock_jungle');
    const p = await loadProgress();
    p.puzzlesSolved = 28; // gate met → normal build, not reserve
    expect(await canReserveUnlock('unlock_jungle')).toBe(false);
  });

  test('reserve then claim when the gate opens', async () => {
    await unlockUpTo('unlock_jungle');

    const res = await reserveNextUnlock('unlock_jungle');
    expect(res.success).toBe(true);
    expect(await getReservedUnlockId()).toBe('unlock_jungle');

    // Amber was spent; room not built yet.
    let p = await loadProgress();
    expect(p.unlockedRooms).not.toContain('jungle_room');

    // Cannot reserve a second thing while one is pending.
    expect(await canReserveUnlock('unlock_desert')).toBe(false);

    // Gate not met yet → nothing claimed.
    expect(await claimReservedUnlockIfReady()).toBeNull();
    expect(await getReservedUnlockId()).toBe('unlock_jungle');

    // Reach the gate → claim builds the room and clears the reservation.
    p = await loadProgress();
    p.puzzlesSolved = 28;
    const claimed = await claimReservedUnlockIfReady();
    expect(claimed?.id).toBe('unlock_jungle');
    expect(await getReservedUnlockId()).toBeNull();
    p = await loadProgress();
    expect(p.unlockedRooms).toContain('jungle_room');
  });

  // Player report: the reserve copy named the arrival level but not the
  // player's current level, so the wait had no visible distance-to-go. Both
  // builders must carry "you're at N" alongside the gate level.
  describe('reserve copy includes current progress', () => {
    test('reserved line: arrival level plus current level', () => {
      expect(getReservedArrivalText(42, 35)).toBe(
        "✓ Reserved. Arrives at level 42 (you're at 35)"
      );
    });

    test('gate offer line: gate level plus current level', () => {
      expect(getReserveGateText(42, 35)).toBe("Still growing here. Opens at level 42 (you're at 35)");
    });

    test('degrade gracefully when an unlock has no gate (defensive)', () => {
      expect(getReservedArrivalText(undefined, 35)).toBe('✓ Reserved');
      expect(getReserveGateText(undefined, 35)).toBe("Still growing here. You're at level 35");
    });
  });

  test('reserve spends amber up front (no double charge on claim)', async () => {
    await unlockUpTo('unlock_jungle');
    const before = (await loadProgress()).amber;
    const jungle = UNLOCK_PROGRESSION.find(u => u.id === 'unlock_jungle')!;
    await reserveNextUnlock('unlock_jungle');
    const afterReserve = (await loadProgress()).amber;
    expect(afterReserve).toBe(before - jungle.cost);

    const p = await loadProgress();
    p.puzzlesSolved = 28;
    await claimReservedUnlockIfReady();
    expect((await loadProgress()).amber).toBe(afterReserve); // claim is free
  });
});

describe('skip the wait (pay premium, unlock now)', () => {
  async function unlockUpTo(targetUnlockId: string) {
    await devAddAmber(100000);
    for (const u of UNLOCK_PROGRESSION) {
      if (u.id === targetUnlockId) break;
      await purchaseUnlock(u.id);
    }
  }

  test('skip cost is the build cost plus the premium (and higher than reserve)', () => {
    const jungle = UNLOCK_PROGRESSION.find(u => u.id === 'unlock_jungle')!;
    expect(getUnlockSkipCost(jungle)).toBe(Math.ceil(jungle.cost * (1 + UNLOCK_SKIP_PREMIUM)));
    expect(getUnlockSkipCost(jungle)).toBeGreaterThan(jungle.cost);
  });

  test('canSkipUnlockGate: true when gated + premium affordable + prerequisites met', async () => {
    await unlockUpTo('unlock_jungle');
    expect(await canSkipUnlockGate('unlock_jungle')).toBe(true);
  });

  test('canSkipUnlockGate: false when only the base cost (not the premium) is affordable', async () => {
    await unlockUpTo('unlock_jungle');
    const jungle = UNLOCK_PROGRESSION.find(u => u.id === 'unlock_jungle')!;
    const p = await loadProgress();
    p.amber = jungle.cost; // enough to reserve, short of the premium skip
    expect(await canReserveUnlock('unlock_jungle')).toBe(true);
    expect(await canSkipUnlockGate('unlock_jungle')).toBe(false);
  });

  test('canSkipUnlockGate: false once the puzzle gate is already met (just build it)', async () => {
    await unlockUpTo('unlock_jungle');
    const p = await loadProgress();
    p.puzzlesSolved = 28;
    expect(await canSkipUnlockGate('unlock_jungle')).toBe(false);
  });

  test('canSkipUnlockGate: false while something is already reserved', async () => {
    await unlockUpTo('unlock_jungle');
    await reserveNextUnlock('unlock_jungle');
    expect(await canSkipUnlockGate('unlock_jungle')).toBe(false);
  });

  test('skipUnlockGate: builds the room immediately, charges the premium, bypasses the gate', async () => {
    await unlockUpTo('unlock_jungle');
    const jungle = UNLOCK_PROGRESSION.find(u => u.id === 'unlock_jungle')!;
    const before = (await loadProgress()).amber;
    const res = await skipUnlockGate('unlock_jungle');
    expect(res.success).toBe(true);
    expect(res.unlock?.id).toBe('unlock_jungle');
    const p = await loadProgress();
    expect(p.unlockedRooms).toContain('jungle_room'); // built now, gate never met
    expect(p.puzzlesSolved).toBe(0);
    expect(before - p.amber).toBe(getUnlockSkipCost(jungle)); // premium charged
  });

  test('skipUnlockGate: refuses (and builds nothing) when the premium is unaffordable', async () => {
    await unlockUpTo('unlock_jungle');
    const p = await loadProgress();
    p.amber = 1;
    const res = await skipUnlockGate('unlock_jungle');
    expect(res.success).toBe(false);
    expect((await loadProgress()).unlockedRooms).not.toContain('jungle_room');
  });

  test('getSkipGateText names the premium cost', () => {
    expect(getSkipGateText(300)).toBe('Skip the wait now for 300 amber');
  });

  // NARRATIVE GUARD: the descent-trio rooms (the ones admitting the
  // LATE_PHASE_RECRUITS animals) may never be skip-purchased before global
  // Phase 3 — organically their 84/88/92 solve gates imply Phase 3+, but a
  // paid skip bypasses the solve gate and amber is purchasable, so an
  // unguarded skip was a cash -> amber -> early-trio "story for sale" leak
  // (and could fire the house-completion ceremony in the bright phases).
  describe('descent-trio phase guard', () => {
    test('isDescentTrioRoomUnlock derives exactly the three trio rooms from the data', () => {
      const trio = UNLOCK_PROGRESSION.filter(isDescentTrioRoomUnlock).map(u => u.id);
      expect(trio).toEqual(['unlock_star_loft', 'unlock_belfry', 'unlock_sky_garden']);
    });

    test('canSkipUnlockGate refuses a trio room below Phase 3 and allows it at Phase 3', async () => {
      // Prerequisite purchases must clear their own gates (jungle 19 ... bamboo 74),
      // while star_loft's 84 gate stays unmet — 80 solves threads that needle.
      (await loadProgress()).puzzlesSolved = 80;
      await unlockUpTo('unlock_star_loft');
      const p = await loadProgress();
      p.currentPhase = 2;
      expect(await canSkipUnlockGate('unlock_star_loft')).toBe(false);
      p.currentPhase = 3;
      expect(await canSkipUnlockGate('unlock_star_loft')).toBe(true);
    });

    test('a reserved trio room cannot be sped past its gate below Phase 3 (reservation intact)', async () => {
      (await loadProgress()).puzzlesSolved = 80;
      await unlockUpTo('unlock_star_loft');
      let p = await loadProgress();
      p.currentPhase = 2;
      await reserveNextUnlock('unlock_star_loft');
      expect(await canSpeedUpReservedUnlock('unlock_star_loft')).toBe(false);
      const res = await skipReservedUnlock('unlock_star_loft');
      expect(res.success).toBe(false);
      p = await loadProgress();
      expect(p.reservedUnlockId).toBe('unlock_star_loft'); // still reserved, nothing lost
      expect(p.unlockedRooms).not.toContain('star_loft');
      p.currentPhase = 3;
      expect(await canSpeedUpReservedUnlock('unlock_star_loft')).toBe(true);
    });

    test('non-trio gated rooms are untouched by the guard (jungle skips at Phase 0)', async () => {
      await unlockUpTo('unlock_jungle');
      // jungle's own prerequisites are ungated, so no solves are needed here
      expect((await loadProgress()).currentPhase).toBeLessThan(3);
      expect(await canSkipUnlockGate('unlock_jungle')).toBe(true);
    });
  });
});

describe('speed up a reserved room (pay only the remaining premium)', () => {
  async function reserveJungle() {
    await devAddAmber(100000);
    for (const u of UNLOCK_PROGRESSION) {
      if (u.id === 'unlock_jungle') break;
      await purchaseUnlock(u.id);
    }
    await reserveNextUnlock('unlock_jungle');
  }

  test('reserved skip cost is only the premium delta (skip cost minus build cost)', () => {
    const jungle = UNLOCK_PROGRESSION.find(u => u.id === 'unlock_jungle')!;
    expect(getReservedSkipCost(jungle)).toBe(getUnlockSkipCost(jungle) - jungle.cost);
  });

  test('canSpeedUpReservedUnlock: true once reserved + premium affordable + gate not met', async () => {
    await reserveJungle();
    expect(await canSpeedUpReservedUnlock('unlock_jungle')).toBe(true);
  });

  test('canSpeedUpReservedUnlock: false when nothing is reserved', async () => {
    await devAddAmber(100000);
    for (const u of UNLOCK_PROGRESSION) {
      if (u.id === 'unlock_jungle') break;
      await purchaseUnlock(u.id);
    }
    expect(await canSpeedUpReservedUnlock('unlock_jungle')).toBe(false);
  });

  test('canSpeedUpReservedUnlock: false once the gate is met (it auto-claims free)', async () => {
    await reserveJungle();
    const p = await loadProgress();
    p.puzzlesSolved = 28;
    expect(await canSpeedUpReservedUnlock('unlock_jungle')).toBe(false);
  });

  test('skipReservedUnlock: charges only the premium delta, unlocks now, clears the reservation', async () => {
    await reserveJungle();
    const jungle = UNLOCK_PROGRESSION.find(u => u.id === 'unlock_jungle')!;
    const before = (await loadProgress()).amber;
    const res = await skipReservedUnlock('unlock_jungle');
    expect(res.success).toBe(true);
    expect(res.unlock?.id).toBe('unlock_jungle');
    const p = await loadProgress();
    expect(p.unlockedRooms).toContain('jungle_room');
    expect(p.reservedUnlockId).toBeNull();
    expect(before - p.amber).toBe(getReservedSkipCost(jungle)); // premium only
  });

  test('reserve + speed up costs the same total as a direct skip', async () => {
    const jungle = UNLOCK_PROGRESSION.find(u => u.id === 'unlock_jungle')!;
    // Path A: reserve then speed up.
    await reserveJungle();
    const afterReserve = (await loadProgress()).amber;
    await skipReservedUnlock('unlock_jungle');
    const afterSpeedUp = (await loadProgress()).amber;
    const reservePathSpend = (afterReserve + jungle.cost) - afterSpeedUp; // base + premium
    expect(reservePathSpend).toBe(getUnlockSkipCost(jungle));
  });

  test('skipReservedUnlock: refuses when the unlock is not reserved', async () => {
    await devAddAmber(100000);
    for (const u of UNLOCK_PROGRESSION) {
      if (u.id === 'unlock_jungle') break;
      await purchaseUnlock(u.id);
    }
    const res = await skipReservedUnlock('unlock_jungle');
    expect(res.success).toBe(false);
    expect((await loadProgress()).unlockedRooms).not.toContain('jungle_room');
  });
});
