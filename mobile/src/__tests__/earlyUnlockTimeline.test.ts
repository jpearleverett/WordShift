/**
 * Launch-readiness economy tuning (product-retention-2): the Desert (29) to
 * Office (41) room-gate gap used to hold nothing discoverable but the
 * Keeper's Welcome store pitch at 35, right across the Phase-2 turn, a six-day
 * content dead zone for a 2/day player. The EXPERT difficulty row (a
 * difficulty, not a story beat) now opens inside that gap, and the starter
 * pitch steps three wins later so the two never land on the same win.
 */
import {
  EXPERT_DIFFICULTY_UNLOCK_PUZZLES,
  STARTER_INTRO_MIN_PUZZLES,
  HOUSE_ASK_MIN_PUZZLES,
  SPEED_TOGGLE_UNLOCK_PUZZLES,
  PATRON_NUDGE_MIN_PUZZLES,
} from '../constants/gameBalance';
import { UNLOCK_PROGRESSION } from '../services/homeWorldData';
import {
  getVariantUnlockRequirement,
  BLIND_TOGGLE_UNLOCK_PUZZLES,
} from '../services/puzzleVariety';

function roomGateAround(target: number): { below: number; above: number } {
  const gates = UNLOCK_PROGRESSION
    .map((u) => u.minPuzzles)
    .filter((g): g is number => typeof g === 'number' && g > 0)
    .sort((a, b) => a - b);
  const below = Math.max(...gates.filter((g) => g < target));
  const above = Math.min(...gates.filter((g) => g > target));
  return { below, above };
}

describe('early unlock timeline: the 29 to 41 room-gate gap carries a beat', () => {
  it('pins the tuned constants', () => {
    expect(EXPERT_DIFFICULTY_UNLOCK_PUZZLES).toBe(35);
    expect(STARTER_INTRO_MIN_PUZZLES).toBe(38);
  });

  it('opens EXPERT strictly inside the Desert -> Office room-gate gap', () => {
    const { below, above } = roomGateAround(EXPERT_DIFFICULTY_UNLOCK_PUZZLES);
    expect(below).toBe(29);
    expect(above).toBe(41);
    expect(EXPERT_DIFFICULTY_UNLOCK_PUZZLES).toBeGreaterThan(below);
    expect(EXPERT_DIFFICULTY_UNLOCK_PUZZLES).toBeLessThan(above);
  });

  it('keeps the starter pitch off the EXPERT unlock win and inside the same gap', () => {
    expect(STARTER_INTRO_MIN_PUZZLES).not.toBe(EXPERT_DIFFICULTY_UNLOCK_PUZZLES);
    expect(STARTER_INTRO_MIN_PUZZLES).toBeGreaterThan(EXPERT_DIFFICULTY_UNLOCK_PUZZLES);
    expect(STARTER_INTRO_MIN_PUZZLES).toBeLessThan(41);
    // The store pitch also stays clear of the house-ask roll floor and the
    // Patron nudge, so no win in the window stacks two asks.
    expect(STARTER_INTRO_MIN_PUZZLES).not.toBe(HOUSE_ASK_MIN_PUZZLES);
    expect(STARTER_INTRO_MIN_PUZZLES).toBeLessThan(PATRON_NUDGE_MIN_PUZZLES);
  });

  it('keeps the EXPERT gate ordered against the variant and modifier ladder', () => {
    const doubleShift = getVariantUnlockRequirement('double_shift');
    expect(doubleShift).not.toBeNull();
    // EXPERT lands after the last style unlock (double shift, 25) and before
    // the later modifier rungs, so the roadmap still reads in one direction.
    expect(EXPERT_DIFFICULTY_UNLOCK_PUZZLES).toBeGreaterThan(doubleShift!.puzzlesSolved);
    expect(EXPERT_DIFFICULTY_UNLOCK_PUZZLES).toBeLessThan(SPEED_TOGGLE_UNLOCK_PUZZLES);
    expect(EXPERT_DIFFICULTY_UNLOCK_PUZZLES).toBeLessThan(BLIND_TOGGLE_UNLOCK_PUZZLES);
  });
});
