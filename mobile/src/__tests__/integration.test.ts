/**
 * Integration tests for critical gameplay paths.
 *
 * These tests exercise the real service functions together
 * (starRating, amberCurrency, achievements) to verify that
 * the full victory flow, phase progression, challenge mode,
 * and economy balance work correctly end-to-end.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { calculateStars, recordPuzzleCompletion, clearStats, loadStats, getThreeStarRate } from '../services/starRating';
import {
  awardPuzzleAmber,
  clearProgress,
  loadProgress,
  devAddPuzzles,
  calculatePhaseAcceleration,
  getCurrentPhase,
  confirmPhaseTransition,
} from '../services/amberCurrency';
import { checkAchievements, clearAchievements, AchievementCheckState } from '../services/achievements';
import {
  PHASE_THRESHOLDS,
  AMBER_REWARDS,
  CHALLENGE_MODE_CONFIG,
  NARRATIVE_ACCELERATION,
  STREAK_BONUSES,
  calculateStreakMultiplier,
} from '../types/homeWorld';

beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
  await clearProgress();
  await clearStats();
  await clearAchievements();
});

// ---------------------------------------------------------------------------
// 1. Victory Flow Integration
// ---------------------------------------------------------------------------
describe('Victory Flow Integration', () => {
  test('completing a puzzle awards correct stars and amber', async () => {
    // Step 1: Calculate stars from performance
    const hintsUsed = 0;
    const invalidAttempts = 1;
    const stars = calculateStars(hintsUsed, invalidAttempts);
    expect(stars).toBe(3); // 0 hints, <=2 mistakes => 3 stars

    // Step 2: Record stats
    const statsResult = await recordPuzzleCompletion('MEDIUM', hintsUsed, invalidAttempts);
    expect(statsResult.starsEarned).toBe(3);

    // Step 3: Award amber (creditToBalance=true for direct crediting test)
    const amberResult = await awardPuzzleAmber('MEDIUM', stars, 'standard', 0, true);
    // MEDIUM base=10, 3-star => floor(10*1.5)=15, no streak bonus (streak=1 < 2)
    // newBalance includes first-completion bonus for MEDIUM (+20)
    expect(amberResult.baseAmount).toBe(15);
    expect(amberResult.amount).toBe(15);
    expect(amberResult.newBalance).toBe(35);
    expect(amberResult.puzzlesSolved).toBe(1);

    // Step 4: Verify cumulative stats
    const stats = await loadStats();
    expect(stats.totalPuzzlesCompleted).toBe(1);
    expect(stats.threeStarCount).toBe(1);
    expect(stats.totalStars).toBe(3);
    expect(stats.noHintPuzzleCount).toBe(1);

    // Step 5: Check achievements
    const achievementState: AchievementCheckState = {
      stats,
      puzzlesSolved: amberResult.puzzlesSolved,
      currentPhase: amberResult.newPhase,
      currentStreak: amberResult.currentStreak,
      unlockedAnimals: 0,
      unlockedRooms: 1,
      amberEarned: amberResult.newBalance,
      dailyChallengesCompleted: 0,
      shareCount: 0,
      challengeCompletions: 0,
    };
    const newAchievements = await checkAchievements(achievementState);
    const ids = newAchievements.map(a => a.id);
    // Should unlock first_puzzle and first_perfect (3 stars)
    expect(ids).toContain('first_puzzle');
    expect(ids).toContain('first_perfect');
  });

  test('completing enough puzzles triggers phase transition', async () => {
    // Bring player to 19 puzzles (still phase 0)
    await devAddPuzzles(19);
    const phaseBefore = await getCurrentPhase();
    expect(phaseBefore).toBe(0);

    // The 20th puzzle should trigger a pending phase 0 -> 1 transition
    const result = await awardPuzzleAmber('EASY', 1);
    expect(result.puzzlesSolved).toBe(20);
    expect(result.phaseChanged).toBe(true);
    expect(result.newPhase).toBe(1);

    // Phase is deferred — still 0 until confirmed in the pit
    expect(await getCurrentPhase()).toBe(0);
    const confirmed = await confirmPhaseTransition();
    expect(confirmed).not.toBeNull();
    expect(confirmed!.newPhase).toBe(1);
    expect(await getCurrentPhase()).toBe(1);
  });

  test('phase transitions happen sequentially across all boundaries', async () => {
    // Phase 0 -> 1 at 20 puzzles (deferred, then confirmed)
    await devAddPuzzles(19);
    let result = await awardPuzzleAmber('EASY', 1);
    expect(result.phaseChanged).toBe(true);
    expect(result.newPhase).toBe(1);
    await confirmPhaseTransition();

    // Phase 1 -> 2 at 65 puzzles
    await devAddPuzzles(44); // 20 + 44 = 64
    result = await awardPuzzleAmber('EASY', 1);
    expect(result.phaseChanged).toBe(true);
    expect(result.newPhase).toBe(2);
    await confirmPhaseTransition();

    // Phase 2 -> 3 at 150 puzzles
    await devAddPuzzles(84); // 65 + 84 = 149
    result = await awardPuzzleAmber('EASY', 1);
    expect(result.phaseChanged).toBe(true);
    expect(result.newPhase).toBe(3);
    await confirmPhaseTransition();

    // Phase 3 -> 4 at 235 puzzles
    await devAddPuzzles(84); // 150 + 84 = 234
    result = await awardPuzzleAmber('EASY', 1);
    expect(result.phaseChanged).toBe(true);
    expect(result.newPhase).toBe(4);
    await confirmPhaseTransition();

    // Phase 4 is max — no further change
    result = await awardPuzzleAmber('EASY', 1);
    expect(result.phaseChanged).toBe(false);
    expect(result.newPhase).toBe(4);
  });

  test('concurrent awardPuzzleAmber calls do not corrupt state', async () => {
    // Fire two awards at the same time (creditToBalance=true for direct crediting)
    const [resultA, resultB] = await Promise.all([
      awardPuzzleAmber('EASY', 1, 'standard', 0, true),
      awardPuzzleAmber('EASY', 1, 'standard', 0, true),
    ]);

    // Both should complete without error
    expect(resultA).toBeDefined();
    expect(resultB).toBeDefined();

    // Final persisted state should reflect both puzzles
    const progress = await loadProgress();
    expect(progress.puzzlesSolved).toBe(2);
    // Each EASY 1-star = 8 amber base, plus first-completion bonus (10) for one of them.
    // Due to concurrency, one or both may get the first-completion bonus.
    expect(progress.amber).toBeGreaterThanOrEqual(16); // minimum: 2 × 8
    expect(progress.amber).toBeLessThanOrEqual(36);    // maximum: 2 × (8 + 10)
  });
});

// ---------------------------------------------------------------------------
// 2. Phase Boundary Tests
// ---------------------------------------------------------------------------
describe('Phase Boundaries', () => {
  test('at exactly 20 puzzles, phase transitions from 0 to 1', async () => {
    await devAddPuzzles(19);
    expect(await getCurrentPhase()).toBe(0);

    const result = await awardPuzzleAmber('EASY', 1);
    expect(result.puzzlesSolved).toBe(20);
    expect(result.newPhase).toBe(1);
    expect(result.phaseChanged).toBe(true);
  });

  test('at exactly 65 puzzles, phase transitions from 1 to 2', async () => {
    await devAddPuzzles(64);
    expect(await getCurrentPhase()).toBe(1);

    const result = await awardPuzzleAmber('EASY', 1);
    expect(result.puzzlesSolved).toBe(65);
    expect(result.newPhase).toBe(2);
    expect(result.phaseChanged).toBe(true);
  });

  test('at exactly 150 puzzles, phase transitions from 2 to 3', async () => {
    await devAddPuzzles(149);
    expect(await getCurrentPhase()).toBe(2);

    const result = await awardPuzzleAmber('EASY', 1);
    expect(result.puzzlesSolved).toBe(150);
    expect(result.newPhase).toBe(3);
    expect(result.phaseChanged).toBe(true);
  });

  test('at exactly 235 puzzles, phase transitions from 3 to 4', async () => {
    await devAddPuzzles(234);
    expect(await getCurrentPhase()).toBe(3);

    const result = await awardPuzzleAmber('EASY', 1);
    expect(result.puzzlesSolved).toBe(235);
    expect(result.newPhase).toBe(4);
    expect(result.phaseChanged).toBe(true);
  });

  test('narrative acceleration caps at 3.0x', () => {
    // All multipliers active: high three-star rate, long streak, HARD, challenge
    const multiplier = calculatePhaseAcceleration(0.8, 10, 'HARD', 'challenge');
    // Uncapped: 1.5 * 1.25 * 1.5 * 2.0 = 5.625
    // Capped at 3.0
    expect(multiplier).toBe(3.0);
  });

  test('phase advances at most +1 per puzzle even with maximum acceleration', async () => {
    // Get close to the phase 1 boundary with phase still 0
    await devAddPuzzles(19);
    expect(await getCurrentPhase()).toBe(0);

    // With max acceleration (3.0), phaseProgress goes 19 -> 22
    // calculatePhase(22) = 1 (>= 20). Previous was 0, so +1 is fine.
    const result = await awardPuzzleAmber('HARD', 3, 'challenge', 0.8);
    expect(result.newPhase).toBe(1);
    expect(result.phaseAcceleration).toBe(3.0);

    // Verify phase progress advanced by the acceleration amount
    const progress = await loadProgress();
    // devAddPuzzles set phaseProgress to 19, then awardPuzzleAmber added 3.0
    expect(progress.phaseProgress).toBe(22);
  });

  test('phase threshold gaps are larger than max acceleration, preventing skips', () => {
    // This structural test ensures the 3.0x cap makes phase skipping mathematically impossible
    const maxAcceleration = 3.0;
    for (let i = 0; i < PHASE_THRESHOLDS.length - 1; i++) {
      const gap = PHASE_THRESHOLDS[i + 1] - PHASE_THRESHOLDS[i];
      expect(gap).toBeGreaterThan(maxAcceleration);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Challenge Mode Constraints
// ---------------------------------------------------------------------------
describe('Challenge Mode', () => {
  test('challenge mode awards 1.5x amber compared to standard', async () => {
    // Standard mode: MEDIUM 3-star
    const standardResult = await awardPuzzleAmber('MEDIUM', 3, 'standard');
    const standardAmount = standardResult.amount;

    await clearProgress();

    // Challenge mode: MEDIUM 3-star
    const challengeResult = await awardPuzzleAmber('MEDIUM', 3, 'challenge');

    // Standard: base=floor(10*1.5)=15, amount=15
    // Challenge: base=15, challengeBonus=floor(15*0.5)=7, amount=22
    expect(standardResult.baseAmount).toBe(15);
    expect(standardResult.challengeBonus).toBe(0);
    expect(standardResult.amount).toBe(15);

    expect(challengeResult.baseAmount).toBe(15);
    expect(challengeResult.challengeBonus).toBe(7);
    expect(challengeResult.amount).toBe(22);

    // Challenge total should be more than standard
    expect(challengeResult.amount).toBeGreaterThan(standardAmount);
  });

  test('challenge mode counts 2x toward phase progression', async () => {
    // Standard mode acceleration with default params
    const standardAccel = calculatePhaseAcceleration(0, 1, 'EASY', 'standard');
    // Challenge mode acceleration with same params
    const challengeAccel = calculatePhaseAcceleration(0, 1, 'EASY', 'challenge');

    expect(standardAccel).toBe(1.0);
    expect(challengeAccel).toBe(NARRATIVE_ACCELERATION.CHALLENGE_MULTIPLIER);
    expect(challengeAccel).toBe(2.0);

    // Verify via actual awardPuzzleAmber calls
    const standardResult = await awardPuzzleAmber('EASY', 1, 'standard');
    expect(standardResult.phaseAcceleration).toBe(1.0);

    await clearProgress();

    const challengeResult = await awardPuzzleAmber('EASY', 1, 'challenge');
    expect(challengeResult.phaseAcceleration).toBe(2.0);
  });

  test('challenge completions are tracked in progress', async () => {
    await awardPuzzleAmber('MEDIUM', 3, 'challenge');
    await awardPuzzleAmber('EASY', 2, 'challenge');

    const progress = await loadProgress();
    expect(progress.challengeCompletions).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 4. Economy Balance
// ---------------------------------------------------------------------------
describe('Economy Balance', () => {
  test('amber awards match expected base rates for each difficulty', async () => {
    // EASY
    const easyResult = await awardPuzzleAmber('EASY', 1);
    expect(easyResult.baseAmount).toBe(AMBER_REWARDS.EASY); // 5
    await clearProgress();

    // MEDIUM
    const mediumResult = await awardPuzzleAmber('MEDIUM', 1);
    expect(mediumResult.baseAmount).toBe(AMBER_REWARDS.MEDIUM); // 10
    await clearProgress();

    // HARD
    const hardResult = await awardPuzzleAmber('HARD', 1);
    expect(hardResult.baseAmount).toBe(AMBER_REWARDS.HARD); // 20
  });

  test('3-star bonus gives 50% more base amber', async () => {
    const result = await awardPuzzleAmber('MEDIUM', 3);
    expect(result.baseAmount).toBe(Math.floor(AMBER_REWARDS.MEDIUM * 1.5)); // floor(10*1.5)=15
  });

  test('2-star bonus gives 25% more base amber', async () => {
    const result = await awardPuzzleAmber('MEDIUM', 2);
    expect(result.baseAmount).toBe(Math.floor(AMBER_REWARDS.MEDIUM * 1.25)); // floor(10*1.25)=12
  });

  test('1-star gets no bonus', async () => {
    const result = await awardPuzzleAmber('MEDIUM', 1);
    expect(result.baseAmount).toBe(AMBER_REWARDS.MEDIUM); // 10
  });

  test('streak multiplier caps at 2.0x (100% bonus)', () => {
    // Below minimum: no bonus
    expect(calculateStreakMultiplier(0)).toBe(1.0);
    expect(calculateStreakMultiplier(1)).toBe(1.0);

    // At minimum (2): small bonus
    expect(calculateStreakMultiplier(2)).toBe(1 + 0.10); // 1.10

    // Streak = 11: (11-1)*0.10 = 1.0 => multiplier = 2.0 (capped)
    expect(calculateStreakMultiplier(11)).toBe(2.0);

    // Very high streak: still capped at 2.0
    expect(calculateStreakMultiplier(50)).toBe(2.0);
    expect(calculateStreakMultiplier(100)).toBe(2.0);
  });

  test('maximum repeatable amber per puzzle is bounded', () => {
    // Theoretical maximum: HARD 3-star, max streak, challenge mode
    const hardBase = AMBER_REWARDS.HARD; // 20
    const threeStarBase = Math.floor(hardBase * 1.5); // 30
    const maxStreakMultiplier = 1 + STREAK_BONUSES.MAX_BONUS_PERCENTAGE; // 2.0
    const afterStreak = Math.floor(threeStarBase * maxStreakMultiplier); // 60
    const challengeBonus = Math.floor(afterStreak * (CHALLENGE_MODE_CONFIG.AMBER_MULTIPLIER - 1)); // 30
    const maxPerPuzzle = afterStreak + challengeBonus; // 90

    // Verify the max is reasonable — enough to buy a mid-tier decoration (75-150 amber)
    // but not so much that progression trivializes the economy
    expect(maxPerPuzzle).toBe(90);
    expect(maxPerPuzzle).toBeLessThanOrEqual(100);
    expect(maxPerPuzzle).toBeGreaterThan(0);
  });

  test('amber accumulates correctly over multiple puzzles', async () => {
    // Solve 3 EASY puzzles with varying star ratings (creditToBalance=true)
    // First EASY puzzle also gets +10 first-completion bonus
    await awardPuzzleAmber('EASY', 3, 'standard', 0, true); // floor(8*1.5)=12 + 10 first-completion = 22
    await awardPuzzleAmber('EASY', 2, 'standard', 0, true); // floor(8*1.25)=10
    await awardPuzzleAmber('EASY', 1, 'standard', 0, true); // 8

    const progress = await loadProgress();
    expect(progress.puzzlesSolved).toBe(3);
    expect(progress.amber).toBe(12 + 10 + 10 + 8); // 40
  });
});
