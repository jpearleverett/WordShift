import {
  getAnimalPhase,
  getCatchUpSessionBonus,
  LATE_PHASE_RECRUITS,
  ANIMAL_AWARENESS_TIERS,
  DIALOGUE_SESSION_CONFIG,
} from '../types/homeWorld';
import type { AnimalType, DialoguePhase } from '../types/homeWorld';
import { UNLOCK_PROGRESSION } from '../services/homeWorldData';
import { FINALE_ARM_MIN_PUZZLES } from '../constants/gameBalance';

/**
 * Guards the narrative-chronology fixes from the 2026-07 review passes:
 *  1. Post-revelation serenity must never leak before the entity arrives.
 *     A vanguard animal (+1 awareness) at global Phase 4 previously resolved
 *     to animal phase 5 and served the post-revelation pool during the dwell
 *     window, spoiling the reveal. getAnimalPhase now hard-caps at 4 until
 *     the global phase-5 gate.
 *  2. Late recruits (the descent trio) get a per-session dialogue boost so
 *     their arc isn't stranded by the finale that arrives soon after their
 *     unlock.
 *  3. The tiers stagger the DESCENT (phases 1-3), never the ARRIVAL. The
 *     lagging tier's -1 previously held it at phase 3 through the whole
 *     global-Phase-4 reveal era, permanently orphaning its Phase-4 blocks
 *     (the phase-5 handoff skips unread earlier lines by design).
 *     getAnimalPhase now converges lagging animals to 4 at the reveal, and
 *     they borrow the catch-up session boost at global Phase 4 so the block
 *     is heard before post-revelation retires it.
 */
describe('narrative chronology: getAnimalPhase never leaks phase 5 pre-arrival', () => {
  const ALL_ANIMALS = Object.keys(ANIMAL_AWARENESS_TIERS) as AnimalType[];

  test('NO animal of ANY tier resolves to phase 5 before global phase 5', () => {
    for (const globalPhase of [0, 1, 2, 3, 4] as DialoguePhase[]) {
      for (const animal of ALL_ANIMALS) {
        expect(getAnimalPhase(globalPhase, animal)).toBeLessThanOrEqual(4);
      }
    }
  });

  test('at global phase 5, EVERY animal clamps to 5 (staggered descent, shared arrival)', () => {
    for (const animal of ALL_ANIMALS) {
      expect(getAnimalPhase(5, animal)).toBe(5);
    }
  });

  test('a vanguard animal at global phase 4 resolves to 4, not 5 (the leak fix)', () => {
    const vanguard = ALL_ANIMALS.find(a => ANIMAL_AWARENESS_TIERS[a] === 'vanguard')!;
    expect(vanguard).toBeDefined();
    expect(getAnimalPhase(4, vanguard)).toBe(4);
  });

  test('the +1 / -1 tier offsets still apply in the interior phases', () => {
    const vanguard = ALL_ANIMALS.find(a => ANIMAL_AWARENESS_TIERS[a] === 'vanguard')!;
    const lagging = ALL_ANIMALS.find(a => ANIMAL_AWARENESS_TIERS[a] === 'lagging')!;
    // Global phase 2: vanguard runs a phase ahead, lagging a phase behind.
    expect(getAnimalPhase(2, vanguard)).toBe(3);
    expect(getAnimalPhase(2, lagging)).toBe(1);
  });

  test('the descent stagger is preserved: every lagging animal is a phase behind at global phase 3', () => {
    const laggingAnimals = ALL_ANIMALS.filter(a => ANIMAL_AWARENESS_TIERS[a] === 'lagging');
    expect(laggingAnimals.length).toBeGreaterThan(0);
    for (const animal of laggingAnimals) {
      expect(getAnimalPhase(3, animal)).toBe(2);
    }
  });

  test('no tier\'s Phase-4 block is orphaned: every lagging animal converges to 4 at the reveal', () => {
    // The reveal is house-wide (all sprites are robed at global Phase 4). If a
    // lagging animal still resolved to 3 here, its ~30-line Phase-4 block
    // could NEVER be served: the whole global-Phase-4 window would pass at
    // phase 3, and the phase-5 handoff skips unread earlier lines by design.
    const laggingAnimals = ALL_ANIMALS.filter(a => ANIMAL_AWARENESS_TIERS[a] === 'lagging');
    expect(laggingAnimals.length).toBeGreaterThan(0);
    for (const animal of laggingAnimals) {
      expect(getAnimalPhase(4, animal)).toBe(4);
    }
  });
});

describe('narrative chronology: late-recruit catch-up session boost', () => {
  const BONUS = DIALOGUE_SESSION_CONFIG.CATCH_UP_BONUS_DIALOGUES;
  const MIN_PHASE = DIALOGUE_SESSION_CONFIG.CATCH_UP_MIN_GLOBAL_PHASE as DialoguePhase;

  test('the descent trio arrive before the finale arming floor', () => {
    const gates = ['unlock_star_loft', 'unlock_belfry', 'unlock_sky_garden'].map(id =>
      UNLOCK_PROGRESSION.find(unlock => unlock.id === id)!.minPuzzles!
    );

    expect(gates).toEqual([115, 125, 135]);
    expect(gates.every(gate => gate < FINALE_ARM_MIN_PUZZLES)).toBe(true);
  });

  test('the descent trio are the late recruits', () => {
    expect(LATE_PHASE_RECRUITS.has('tarsier')).toBe(true);
    expect(LATE_PHASE_RECRUITS.has('aye_aye')).toBe(true);
    expect(LATE_PHASE_RECRUITS.has('kakapo')).toBe(true);
    expect(LATE_PHASE_RECRUITS.has('fox')).toBe(false);
  });

  test('a late recruit with unread backlog at phase 3+ gets the boost', () => {
    expect(getCatchUpSessionBonus(MIN_PHASE, true, true)).toBe(BONUS);
    expect(getCatchUpSessionBonus(4 as DialoguePhase, true, true)).toBe(BONUS);
  });

  test('no boost before the min global phase, for non-recruits, or once caught up', () => {
    expect(getCatchUpSessionBonus(2 as DialoguePhase, true, true)).toBe(0); // too early
    expect(getCatchUpSessionBonus(MIN_PHASE, false, true)).toBe(0);         // not a recruit
    expect(getCatchUpSessionBonus(MIN_PHASE, true, false)).toBe(0);         // no backlog left
  });

  test('a lagging-tier animal with unread backlog at global phase 4 gets the same boost', () => {
    // Lagging animals converge to phase 4 at the reveal (see getAnimalPhase),
    // gaining their whole Phase-4 block with only ~32 puzzles before
    // post-revelation retires unread lines. Same mechanism, same cap.
    expect(getCatchUpSessionBonus(4 as DialoguePhase, false, true, true)).toBe(BONUS);
  });

  test('the lagging boost is confined to the reveal window and to real backlog', () => {
    expect(getCatchUpSessionBonus(3 as DialoguePhase, false, true, true)).toBe(0); // still descending
    expect(getCatchUpSessionBonus(4 as DialoguePhase, false, false, true)).toBe(0); // caught up
    expect(getCatchUpSessionBonus(4 as DialoguePhase, false, true, false)).toBe(0); // middle tier
  });

  test('a lagging late recruit (Moss) never stacks the two boosts', () => {
    expect(getCatchUpSessionBonus(4 as DialoguePhase, true, true, true)).toBe(BONUS);
  });
});
