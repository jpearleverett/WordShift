import {
  getAnimalPhase,
  getCatchUpSessionBonus,
  LATE_PHASE_RECRUITS,
  ANIMAL_AWARENESS_TIERS,
  DIALOGUE_SESSION_CONFIG,
} from '../types/homeWorld';
import type { AnimalType, DialoguePhase } from '../types/homeWorld';

/**
 * Guards the narrative-chronology fixes from the 2026-07 review pass:
 *  1. Post-revelation serenity must never leak before the entity arrives.
 *     A vanguard animal (+1 awareness) at global Phase 4 previously resolved
 *     to animal phase 5 and served the post-revelation pool during the dwell
 *     window, spoiling the reveal. getAnimalPhase now hard-caps at 4 until
 *     the global phase-5 gate.
 *  2. Late recruits (the descent trio) get a per-session dialogue boost so
 *     their arc isn't stranded by the finale that arrives soon after their
 *     unlock.
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
});

describe('narrative chronology: late-recruit catch-up session boost', () => {
  const BONUS = DIALOGUE_SESSION_CONFIG.CATCH_UP_BONUS_DIALOGUES;
  const MIN_PHASE = DIALOGUE_SESSION_CONFIG.CATCH_UP_MIN_GLOBAL_PHASE as DialoguePhase;

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
});
