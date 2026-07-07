import {
  loadProgress,
  getAmberBalance,
  awardPuzzleAmber,
  spendAmber,
  unlockAnimal,
  unlockRoom,
  getCurrentPhase,
  getPuzzlesUntilNextPhase,
  clearProgress,
  canAfford,
  devAddAmber,
  devAddPuzzles,
  markDialogueRead,
  hasSeenIntro,
  markIntroSeen,
  getStreakInfo,
  applyVariantAmberBonus,
  recordVariantWin,
  getVariantWinStats,
  hasSeenDailyChallengeIntro,
  markDailyChallengeIntroSeen,
  hasSeenFoxPlayNudge,
  markFoxPlayNudgeSeen,
  purchaseStreakFreeze,
  getStreakFreezeCount,
  checkFreeStreakFreeze,
  STREAK_FREEZE_AMBER_COST,
  checkStreakMilestone,
  STREAK_MILESTONES,
  hasSeenChallengeIntro,
  markChallengeIntroSeen,
  hasSeenJournalIntro,
  markJournalIntroSeen,
  setSurpriseRng,
  markPostRevelation,
  isPostRevelation,
  recordPhase4Dwell,
  getPhase4DwellCount,
  getFullProgress,
  invalidateProgressCache,
} from '../services/amberCurrency';
import { SURPRISE_BONUS_AMOUNTS, SURPRISE_BONUS_MIN_PUZZLES } from '../constants/gameBalance';
import { FIRST_COMPLETION_BONUS } from '../types/homeWorld';
import { getLocalDateStringDaysAgo } from '../services/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
  await clearProgress();
  // Force the variable-ratio surprise bonus OFF by default so the many exact-amount
  // assertions stay deterministic. Surprise-specific tests opt in via setSurpriseRng.
  setSurpriseRng(() => 1);
});

afterEach(() => {
  // Restore the production Math.random seam.
  setSurpriseRng();
});

describe('loadProgress', () => {
  test('returns default progress on first load', async () => {
    const progress = await loadProgress();
    expect(progress.amber).toBe(0);
    expect(progress.puzzlesSolved).toBe(0);
    expect(progress.currentPhase).toBe(0);
    expect(progress.unlockedRooms).toContain('cozy_den');
    expect(progress.unlockedAnimals).toHaveLength(0);
  });
});

describe('getAmberBalance', () => {
  test('returns 0 initially', async () => {
    const balance = await getAmberBalance();
    expect(balance).toBe(0);
  });
});

describe('awardPuzzleAmber', () => {
  test('awards base amount for EASY 1-star', async () => {
    const result = await awardPuzzleAmber('EASY', 1, 'standard', 0, true);
    expect(result.baseAmount).toBe(8); // EASY base = 8
    expect(result.amount).toBeGreaterThanOrEqual(8);
    expect(result.newBalance).toBeGreaterThan(0);
  });

  test('awards more for HARD difficulty', async () => {
    const easy = await awardPuzzleAmber('EASY', 1, 'standard', 0, true);
    await clearProgress();
    const hard = await awardPuzzleAmber('HARD', 1, 'standard', 0, true);
    expect(hard.baseAmount).toBeGreaterThan(easy.baseAmount);
  });

  test('3-star bonus gives 50% more', async () => {
    const result = await awardPuzzleAmber('MEDIUM', 3, 'standard', 0, true);
    // Base is 10, 3-star = floor(10 * 1.5) = 15
    expect(result.baseAmount).toBe(15);
  });

  test('2-star bonus gives 25% more', async () => {
    const result = await awardPuzzleAmber('MEDIUM', 2, 'standard', 0, true);
    // Base is 10, 2-star = floor(10 * 1.25) = 12
    expect(result.baseAmount).toBe(12);
  });

  test('increments puzzles solved', async () => {
    await awardPuzzleAmber('EASY', 1);
    const progress = await loadProgress();
    expect(progress.puzzlesSolved).toBe(1);
  });

  test('tracks phase transitions', async () => {
    // Solve enough puzzles to reach phase 1 (PHASE_THRESHOLDS[1] = 20 puzzles)
    await devAddPuzzles(19);
    const result = await awardPuzzleAmber('EASY', 1);
    expect(result.puzzlesSolved).toBe(20);
    expect(result.phaseChanged).toBe(true);
    expect(result.newPhase).toBe(1);
  });

  test('does not advance to phase 1 too early even with inflated phaseProgress', async () => {
    await devAddPuzzles(8);
    const progress = await loadProgress();
    progress.phaseProgress = 40; // Simulate external acceleration
    progress.currentPhase = 0;

    const result = await awardPuzzleAmber('HARD', 3, 'challenge', 0.8);
    expect(result.puzzlesSolved).toBe(9);
    expect(result.newPhase).toBe(0);
    expect(await getCurrentPhase()).toBe(0);
  });

  test('deferred crediting (default) does not increase spendable balance', async () => {
    const result = await awardPuzzleAmber('MEDIUM', 3);
    expect(result.amount).toBeGreaterThan(0);
    expect(result.newBalance).toBe(0); // Not credited to balance
    const balance = await getAmberBalance();
    expect(balance).toBe(0);
  });

  test('no Patron bonus for non-patrons', async () => {
    const result = await awardPuzzleAmber('EASY', 1, 'standard', 0, true);
    expect(result.patronBonus).toBe(0);
  });
});

describe('Patron amber bonus', () => {
  test('adds a flat per-puzzle bonus to the reward only, not phase progress', async () => {
    const { grantEntitlements, loadEntitlements, clearEntitlements, ENTITLEMENTS } =
      require('../services/entitlements');
    await clearEntitlements();

    // Baseline (non-patron)
    const free = await awardPuzzleAmber('EASY', 1, 'standard', 0, true);
    await clearProgress();

    // Become a patron and warm the synchronous cache
    await grantEntitlements([ENTITLEMENTS.PATRON]);
    await loadEntitlements();
    const patron = await awardPuzzleAmber('EASY', 1, 'standard', 0, true);

    expect(patron.patronBonus).toBe(2);
    expect(patron.amount).toBe(free.amount + 2);
    // Phase pacing is identical — bonus must not feed phase acceleration
    expect(patron.phaseAcceleration).toBe(free.phaseAcceleration);

    await clearEntitlements();
  });
});

describe('surprise bonus (variable-ratio reward)', () => {
  // Push past the onboarding suppression window so the surprise bonus is eligible.
  async function advancePastSuppressionWindow(): Promise<void> {
    await devAddPuzzles(SURPRISE_BONUS_MIN_PUZZLES);
  }

  test('grants surpriseBonus when RNG forces a hit, additive to reward only', async () => {
    await advancePastSuppressionWindow();

    // Baseline: RNG forced to MISS.
    setSurpriseRng(() => 1);
    const baseline = await awardPuzzleAmber('MEDIUM', 1, 'standard', 0, true);
    expect(baseline.surpriseBonus).toBe(0);

    // Reset and replay the identical win with RNG forced to HIT.
    await clearProgress();
    await advancePastSuppressionWindow();
    setSurpriseRng(() => 0); // 0 < SURPRISE_BONUS_CHANCE ⇒ always hit
    const lucky = await awardPuzzleAmber('MEDIUM', 1, 'standard', 0, true);

    expect(lucky.surpriseBonus).toBe(SURPRISE_BONUS_AMOUNTS.MEDIUM);
    // Reward is exactly baseline + surprise — the bonus is purely additive.
    expect(lucky.amount).toBe(baseline.amount + lucky.surpriseBonus);
    // Crucially: phase progression is UNCHANGED vs the no-surprise baseline.
    expect(lucky.phaseAcceleration).toBe(baseline.phaseAcceleration);
  });

  test('phaseProgress matches between a hit and a miss (surprise never feeds pacing)', async () => {
    await advancePastSuppressionWindow();
    setSurpriseRng(() => 1); // miss
    await awardPuzzleAmber('HARD', 1, 'standard', 0, true);
    const missProgress = (await loadProgress()).phaseProgress;

    await clearProgress();
    await advancePastSuppressionWindow();
    setSurpriseRng(() => 0); // hit
    const hit = await awardPuzzleAmber('HARD', 1, 'standard', 0, true);
    const hitProgress = (await loadProgress()).phaseProgress;

    expect(hit.surpriseBonus).toBeGreaterThan(0);
    expect(hitProgress).toBe(missProgress);
  });

  test('surpriseBonus is 0 when RNG forces a miss', async () => {
    await advancePastSuppressionWindow();
    setSurpriseRng(() => 0.99); // >= chance ⇒ miss
    const result = await awardPuzzleAmber('EASY', 1, 'standard', 0, true);
    expect(result.surpriseBonus).toBe(0);
  });

  test('surpriseBonus is suppressed during the onboarding window even on a forced hit', async () => {
    // No advance — puzzlesSolved becomes 1 (< SURPRISE_BONUS_MIN_PUZZLES) after this award.
    setSurpriseRng(() => 0); // would hit, but suppressed by the puzzle-count floor
    const result = await awardPuzzleAmber('MEDIUM', 1, 'standard', 0, true);
    expect(result.surpriseBonus).toBe(0);
  });

  test('surprise amount scales with difficulty', async () => {
    await advancePastSuppressionWindow();
    setSurpriseRng(() => 0);
    const easy = await awardPuzzleAmber('EASY', 1, 'standard', 0, true);

    await clearProgress();
    await advancePastSuppressionWindow();
    setSurpriseRng(() => 0);
    const hard = await awardPuzzleAmber('HARD', 1, 'standard', 0, true);

    expect(easy.surpriseBonus).toBe(SURPRISE_BONUS_AMOUNTS.EASY);
    expect(hard.surpriseBonus).toBe(SURPRISE_BONUS_AMOUNTS.HARD);
    expect(hard.surpriseBonus).toBeGreaterThan(easy.surpriseBonus);
  });
});

describe('applyVariantAmberBonus', () => {
  test('grants variant bonus and persists balance', async () => {
    await devAddAmber(100);
    const result = await applyVariantAmberBonus('speed', 20, 1.34, true);
    expect(result.bonus).toBeGreaterThan(0);
    const balance = await getAmberBalance();
    // First win of the day also grants the fresh bonus.
    expect(balance).toBe(100 + result.bonus + result.freshBonus);
  });

  test('no decay on repeated same variant (multiplier bonus is constant)', async () => {
    await devAddAmber(100);
    const first = await applyVariantAmberBonus('speed', 20, 1.34, true);
    const second = await applyVariantAmberBonus('speed', 20, 1.34, true);
    const third = await applyVariantAmberBonus('speed', 20, 1.34, true);
    // The multiplier portion never decays now — repeated play earns the same bonus.
    expect(first.bonus).toBe(second.bonus);
    expect(second.bonus).toBe(third.bonus);
    expect(first.repeatDecay).toBe(1.0);
    expect(third.repeatDecay).toBe(1.0);
  });

  test('grants a once-per-day fresh bonus, only on the first win of the day', async () => {
    await devAddAmber(100);
    const first = await applyVariantAmberBonus('speed', 20, 1.34, true);
    const second = await applyVariantAmberBonus('speed', 20, 1.34, true);
    expect(first.isFresh).toBe(true);
    expect(first.freshBonus).toBeGreaterThan(0);
    // Same variant again same day: no repeat fresh bonus.
    expect(second.isFresh).toBe(false);
    expect(second.freshBonus).toBe(0);
  });

  test('a different variant is independently fresh the same day', async () => {
    await devAddAmber(100);
    const speed = await applyVariantAmberBonus('speed', 20, 1.34, true);
    const reverse = await applyVariantAmberBonus('reverse', 20, 1.2, true);
    expect(speed.isFresh).toBe(true);
    expect(reverse.isFresh).toBe(true);
  });

  test('deferred crediting (default) does not increase spendable balance', async () => {
    await devAddAmber(100);
    const result = await applyVariantAmberBonus('speed', 20, 1.34);
    expect(result.bonus).toBeGreaterThan(0);
    const balance = await getAmberBalance();
    expect(balance).toBe(100); // Not credited
  });
});

describe('recordVariantWin / getVariantWinStats', () => {
  test('counts per-variant wins and blind wins independently', async () => {
    await recordVariantWin('reverse', false);
    await recordVariantWin('reverse', false);
    await recordVariantWin('speed', false);
    await recordVariantWin('standard', true); // blind standard board
    const stats = await getVariantWinStats();
    expect(stats.variantWins.reverse).toBe(2);
    expect(stats.variantWins.speed).toBe(1);
    expect(stats.variantWins.standard).toBeUndefined(); // standard never counted as a variant
    expect(stats.blindWins).toBe(1);
  });

  test('a blind reverse win counts BOTH the variant and the blind tally', async () => {
    await recordVariantWin('reverse', true);
    const stats = await getVariantWinStats();
    expect(stats.variantWins.reverse).toBe(1);
    expect(stats.blindWins).toBe(1);
  });

  test('a plain standard non-blind win is a no-op', async () => {
    await recordVariantWin('standard', false);
    const stats = await getVariantWinStats();
    expect(stats.blindWins).toBe(0);
    expect(Object.keys(stats.variantWins)).toHaveLength(0);
  });
});

describe('spendAmber', () => {
  test('succeeds when player has enough amber', async () => {
    await devAddAmber(100);
    const result = await spendAmber(50, 'test_item');
    expect(result.success).toBe(true);
    expect(result.newBalance).toBe(50);
  });

  test('fails when player lacks amber', async () => {
    const result = await spendAmber(100, 'test_item');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not enough amber');
  });

  test('deducts exact amount', async () => {
    await devAddAmber(200);
    await spendAmber(75, 'test');
    const balance = await getAmberBalance();
    expect(balance).toBe(125);
  });
});

describe('unlockAnimal and unlockRoom', () => {
  test('unlockAnimal adds animal to progress', async () => {
    await devAddAmber(100);
    const success = await unlockAnimal('fox', 0);
    expect(success).toBe(true);
    const progress = await loadProgress();
    expect(progress.unlockedAnimals).toContain('fox');
  });

  test('unlockRoom adds room to progress', async () => {
    await devAddAmber(100);
    const success = await unlockRoom('kitchen', 50);
    expect(success).toBe(true);
    const progress = await loadProgress();
    expect(progress.unlockedRooms).toContain('kitchen');
  });

  test('unlock fails without enough amber', async () => {
    const success = await unlockAnimal('pangolin', 40);
    expect(success).toBe(false);
  });
});

describe('getCurrentPhase', () => {
  test('starts at phase 0', async () => {
    const phase = await getCurrentPhase();
    expect(phase).toBe(0);
  });

  test('transitions to phase 1 after 25 puzzles', async () => {
    await devAddPuzzles(25);
    const phase = await getCurrentPhase();
    expect(phase).toBe(1);
  });

  test('transitions to phase 2 after 75 puzzles', async () => {
    await devAddPuzzles(75);
    const phase = await getCurrentPhase();
    expect(phase).toBe(2);
  });

  test('transitions to phase 4 after 235 puzzles', async () => {
    await devAddPuzzles(235);
    const phase = await getCurrentPhase();
    expect(phase).toBe(4);
  });
});

describe('getPuzzlesUntilNextPhase', () => {
  test('returns 20 initially (to reach phase 1)', async () => {
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBe(20);
  });

  test('returns null at max phase', async () => {
    await devAddPuzzles(235);
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBeNull();
  });

  test('decreases as puzzles are solved', async () => {
    await devAddPuzzles(10);
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBe(10); // 20 - 10
  });

  test('uses phaseProgress for accelerated players', async () => {
    // devAddPuzzles keeps phaseProgress in sync, so after 10 puzzles
    // both puzzlesSolved and phaseProgress are 10
    await devAddPuzzles(10);
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBe(10);
  });

  test('never returns negative values', async () => {
    // At phase boundary, should be 0 not negative
    await devAddPuzzles(20);
    // Now at phase 1, puzzles until phase 2 threshold (65)
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBeGreaterThanOrEqual(0);
  });

  test('returns correct value at each phase boundary', async () => {
    // Phase 0 -> 1: threshold is 20
    expect(await getPuzzlesUntilNextPhase()).toBe(20);

    await devAddPuzzles(20); // Now at phase 1
    // Phase 1 -> 2: threshold is 65
    expect(await getPuzzlesUntilNextPhase()).toBe(45); // 65 - 20

    await devAddPuzzles(45); // Now at phase 2 (65 total)
    // Phase 2 -> 3: threshold is 150
    expect(await getPuzzlesUntilNextPhase()).toBe(85); // 150 - 65

    await devAddPuzzles(85); // Now at phase 3 (150 total)
    // Phase 3 -> 4: threshold is 235
    expect(await getPuzzlesUntilNextPhase()).toBe(85); // 235 - 150

    await devAddPuzzles(85); // Now at phase 4 (235 total)
    expect(await getPuzzlesUntilNextPhase()).toBeNull();
  });
});

describe('canAfford', () => {
  test('returns false when cannot afford', async () => {
    expect(await canAfford(100)).toBe(false);
  });

  test('returns true when can afford', async () => {
    await devAddAmber(100);
    expect(await canAfford(50)).toBe(true);
    expect(await canAfford(100)).toBe(true);
  });
});

describe('markDialogueRead', () => {
  test('records dialogue progress for animal', async () => {
    await markDialogueRead('fox', 5);
    const progress = await loadProgress();
    expect(progress.lastDialogueRead['fox']).toBe(5);
  });
});

describe('intro tracking', () => {
  test('hasSeenIntro returns false initially', async () => {
    expect(await hasSeenIntro('fox')).toBe(false);
  });

  test('markIntroSeen makes hasSeenIntro return true', async () => {
    await markIntroSeen('fox');
    expect(await hasSeenIntro('fox')).toBe(true);
  });

  test('intro tracking is per-animal', async () => {
    await markIntroSeen('fox');
    expect(await hasSeenIntro('fox')).toBe(true);
    expect(await hasSeenIntro('owl')).toBe(false);
  });
});

// ============================================================================
// First-Completion Bonus (B4)
// ============================================================================

describe('first-completion bonus', () => {
  test('awards bonus on first EASY completion', async () => {
    const result = await awardPuzzleAmber('EASY', 1, 'standard', 0, true);
    expect(result.firstCompletionBonus).toBe(FIRST_COMPLETION_BONUS.EASY);
    expect(result.newBalance).toBe(result.amount + FIRST_COMPLETION_BONUS.EASY);
  });

  test('does not award bonus on second EASY completion', async () => {
    await awardPuzzleAmber('EASY', 1);
    const result2 = await awardPuzzleAmber('EASY', 1);
    expect(result2.firstCompletionBonus).toBe(0);
  });

  test('awards bonus separately for each difficulty', async () => {
    const easy = await awardPuzzleAmber('EASY', 1);
    expect(easy.firstCompletionBonus).toBe(FIRST_COMPLETION_BONUS.EASY);

    const medium = await awardPuzzleAmber('MEDIUM', 1);
    expect(medium.firstCompletionBonus).toBe(FIRST_COMPLETION_BONUS.MEDIUM);

    const hard = await awardPuzzleAmber('HARD', 1);
    expect(hard.firstCompletionBonus).toBe(FIRST_COMPLETION_BONUS.HARD);
  });

  test('tracks completed difficulties in progress', async () => {
    await awardPuzzleAmber('EASY', 1);
    await awardPuzzleAmber('MEDIUM', 1);

    const progress = await loadProgress();
    expect(progress.completedDifficulties).toContain('EASY');
    expect(progress.completedDifficulties).toContain('MEDIUM');
    expect(progress.completedDifficulties).not.toContain('HARD');
  });

  test('bonus persists across clear/reload cycle', async () => {
    await awardPuzzleAmber('EASY', 1);
    // Second call should still not get bonus (persisted)
    const result2 = await awardPuzzleAmber('EASY', 1);
    expect(result2.firstCompletionBonus).toBe(0);
  });
});

// ============================================================================
// Streak Freeze (C2)
// ============================================================================

describe('streak freeze', () => {
  test('purchaseStreakFreeze deducts amber and increments count', async () => {
    await devAddAmber(100);
    const success = await purchaseStreakFreeze();
    expect(success).toBe(true);

    const balance = await getAmberBalance();
    expect(balance).toBe(100 - STREAK_FREEZE_AMBER_COST);

    const count = await getStreakFreezeCount();
    expect(count).toBe(1);
  });

  test('purchaseStreakFreeze fails with insufficient amber', async () => {
    await devAddAmber(10); // Less than cost (50)
    const success = await purchaseStreakFreeze();
    expect(success).toBe(false);

    const count = await getStreakFreezeCount();
    expect(count).toBe(0);

    // Balance unchanged
    const balance = await getAmberBalance();
    expect(balance).toBe(10);
  });

  test('multiple freezes can be purchased and stacked', async () => {
    await devAddAmber(200);
    await purchaseStreakFreeze();
    await purchaseStreakFreeze();
    await purchaseStreakFreeze();

    const count = await getStreakFreezeCount();
    expect(count).toBe(3);

    const balance = await getAmberBalance();
    expect(balance).toBe(200 - 3 * STREAK_FREEZE_AMBER_COST);
  });

  test('checkFreeStreakFreeze grants one free freeze on first call', async () => {
    const granted = await checkFreeStreakFreeze();
    expect(granted).toBe(true);

    const count = await getStreakFreezeCount();
    expect(count).toBe(1);
  });

  test('checkFreeStreakFreeze does not grant again within 14 days', async () => {
    await checkFreeStreakFreeze();
    const granted = await checkFreeStreakFreeze();
    expect(granted).toBe(false);

    const count = await getStreakFreezeCount();
    expect(count).toBe(1); // Still just 1
  });

  test('getStreakFreezeCount returns 0 initially', async () => {
    const count = await getStreakFreezeCount();
    expect(count).toBe(0);
  });

  test('STREAK_FREEZE_AMBER_COST is 50', () => {
    expect(STREAK_FREEZE_AMBER_COST).toBe(50);
  });
});

describe('streak grace (yesterday-only continuation)', () => {
  // loadProgress() returns the live cache reference, so we can seed streak
  // state directly before awarding a puzzle (which runs updateStreak()).
  const seedStreak = async (daysSinceLastPlay: number, freezes: number) => {
    const progress = await loadProgress();
    progress.currentStreak = 5;
    progress.lastPlayDate = getLocalDateStringDaysAgo(daysSinceLastPlay);
    progress.streakFreezes = freezes;
  };

  test('playing yesterday continues the streak for free', async () => {
    await seedStreak(1, 0);
    await awardPuzzleAmber('EASY', 1);
    const progress = await loadProgress();
    expect(progress.currentStreak).toBe(6);
    expect(progress.streakFreezes).toBe(0);
  });

  test('a skipped day with no freeze resets the streak to 1', async () => {
    await seedStreak(2, 0); // last played 2 days ago = missed yesterday
    await awardPuzzleAmber('EASY', 1);
    const progress = await loadProgress();
    expect(progress.currentStreak).toBe(1);
  });

  test('a skipped day is saved by consuming a streak freeze', async () => {
    await seedStreak(2, 1);
    await awardPuzzleAmber('EASY', 1);
    const progress = await loadProgress();
    expect(progress.currentStreak).toBe(6);
    expect(progress.streakFreezes).toBe(0);
  });
});

describe('one-time narrative flags', () => {
  test('daily challenge intro flag persists when marked', async () => {
    expect(await hasSeenDailyChallengeIntro()).toBe(false);
    await markDailyChallengeIntroSeen();
    expect(await hasSeenDailyChallengeIntro()).toBe(true);
  });

  test('fox play nudge flag persists when marked', async () => {
    expect(await hasSeenFoxPlayNudge()).toBe(false);
    await markFoxPlayNudgeSeen();
    expect(await hasSeenFoxPlayNudge()).toBe(true);
  });
});

// ============================================================================
// Streak Milestones
// ============================================================================

describe('checkStreakMilestone', () => {
  test('returns null when no milestone is crossed', () => {
    expect(checkStreakMilestone(1, 0, 0 as any)).toBeNull();
    expect(checkStreakMilestone(2, 1, 0 as any)).toBeNull();
    expect(checkStreakMilestone(5, 4, 0 as any)).toBeNull();
  });

  test('awards 15 amber at 3-day streak', () => {
    const result = checkStreakMilestone(3, 2, 0 as any);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(15);
    expect(result!.message).toBe('Three-day streak!');
  });

  test('awards 30 amber at 7-day streak', () => {
    const result = checkStreakMilestone(7, 6, 0 as any);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(30);
    expect(result!.message).toBe('One-week streak!');
  });

  test('awards 50 amber at 14-day streak', () => {
    const result = checkStreakMilestone(14, 13, 0 as any);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(50);
  });

  test('awards 100 amber at 30-day streak', () => {
    const result = checkStreakMilestone(30, 29, 0 as any);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(100);
  });

  test('does not re-fire a milestone already passed', () => {
    // previousStreak was already 3, current is 4 — should NOT trigger 3-day milestone
    expect(checkStreakMilestone(4, 3, 0 as any)).toBeNull();
    expect(checkStreakMilestone(8, 7, 0 as any)).toBeNull();
  });

  test('crossing multiple milestones at once returns the first one', () => {
    // Jump from 0 to 30 — should return the 3-day milestone (first crossed)
    const result = checkStreakMilestone(30, 0, 0 as any);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(15); // 3-day milestone
  });

  test('uses dark messages at phase 2+', () => {
    const result7_p0 = checkStreakMilestone(7, 6, 0 as any);
    expect(result7_p0!.message).toBe('One-week streak!');

    const result7_p2 = checkStreakMilestone(7, 6, 2 as any);
    expect(result7_p2!.message).toBe('Seven days. The pattern notices.');

    const result14_p3 = checkStreakMilestone(14, 13, 3 as any);
    expect(result14_p3!.message).toBe('Fourteen days without breaking the chain.');

    const result30_p4 = checkStreakMilestone(30, 29, 4 as any);
    expect(result30_p4!.message).toBe('Thirty days. The arrangement is grateful.');
  });

  test('3-day milestone has no dark message (returns normal at any phase)', () => {
    const result = checkStreakMilestone(3, 2, 4 as any);
    expect(result!.message).toBe('Three-day streak!');
  });

  test('STREAK_MILESTONES has 5 entries', () => {
    expect(STREAK_MILESTONES).toHaveLength(5);
  });

  test('21-day milestone awards 65 amber', () => {
    const result = checkStreakMilestone(21, 20, 0 as any);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(65);
    expect(result!.message).toBe('Three-week streak!');
  });

  test('21-day milestone uses dark message at Phase 2+', () => {
    const result = checkStreakMilestone(21, 20, 2 as any);
    expect(result).not.toBeNull();
    expect(result!.message).toBe('Twenty-one days. It recognizes your rhythm.');
  });
});

// ============================================================================
// Challenge Mode Intro Tracking (Feature 3)
// ============================================================================

describe('challenge intro tracking', () => {
  test('hasSeenChallengeIntro returns false initially', async () => {
    expect(await hasSeenChallengeIntro()).toBe(false);
  });

  test('markChallengeIntroSeen persists the flag', async () => {
    await markChallengeIntroSeen();
    expect(await hasSeenChallengeIntro()).toBe(true);
  });

  test('clearProgress resets challenge intro flag', async () => {
    await markChallengeIntroSeen();
    expect(await hasSeenChallengeIntro()).toBe(true);
    await clearProgress();
    expect(await hasSeenChallengeIntro()).toBe(false);
  });
});

// ============================================================================
// Post-Revelation Phase Pinning (Phase 5)
// ============================================================================

describe('post-revelation phase pinning (Phase 5)', () => {
  test('recordPhase4Dwell counts up and getPhase4DwellCount reads it (finale gate)', async () => {
    expect(await getPhase4DwellCount()).toBe(0);
    expect(await recordPhase4Dwell()).toBe(1);
    expect(await recordPhase4Dwell()).toBe(2);
    expect(await recordPhase4Dwell()).toBe(3);
    expect(await getPhase4DwellCount()).toBe(3);
  });

  test('markPostRevelation sets currentPhase to 5 and clears any pending transition', async () => {
    await devAddPuzzles(235); // Reach phase 4
    await markPostRevelation();

    expect(await isPostRevelation()).toBe(true);
    const progress = await getFullProgress();
    expect(progress.currentPhase).toBe(5);
    expect(progress.pendingPhaseTransition).toBeNull();
    expect(await getCurrentPhase()).toBe(5);
  });

  test('awardPuzzleAmber never downgrades the phase after post-revelation', async () => {
    await devAddPuzzles(235);
    await markPostRevelation();

    const result = await awardPuzzleAmber('EASY', 1);
    expect(result.newPhase).toBe(5);
    expect(result.phaseChanged).toBe(false);
    expect(result.phaseTransitionPending).toBe(false);
    expect(await getCurrentPhase()).toBe(5);
  });

  test('devAddPuzzles keeps the phase pinned at 5 after post-revelation', async () => {
    await devAddPuzzles(235);
    await markPostRevelation();

    const { phase } = await devAddPuzzles(10);
    expect(phase).toBe(5);
    expect(await getCurrentPhase()).toBe(5);
  });

  test('legacy save with postRevelation=true but currentPhase=4 self-heals on load', async () => {
    // Older builds set postRevelation without bumping currentPhase (calculatePhase caps at 4).
    const legacy = {
      ...(await loadProgress()),
      currentPhase: 4,
      puzzlesSolved: 300,
      phaseProgress: 300,
      postRevelation: true,
      pendingPhaseTransition: 4,
    };
    await AsyncStorage.setItem('wordshift_home_progress', JSON.stringify(legacy));
    invalidateProgressCache();

    const progress = await loadProgress();
    expect(progress.currentPhase).toBe(5);
    expect(progress.pendingPhaseTransition).toBeNull();

    // Heal is persisted — a fresh load from storage stays at 5
    invalidateProgressCache();
    const reloaded = await loadProgress();
    expect(reloaded.currentPhase).toBe(5);
  });

  test('non-post-revelation saves are untouched on load', async () => {
    const save = {
      ...(await loadProgress()),
      currentPhase: 4,
      puzzlesSolved: 300,
      phaseProgress: 300,
    };
    await AsyncStorage.setItem('wordshift_home_progress', JSON.stringify(save));
    invalidateProgressCache();

    const progress = await loadProgress();
    expect(progress.currentPhase).toBe(4);
  });
});

describe('journal intro tracking', () => {
  test('hasSeenJournalIntro returns false initially', async () => {
    expect(await hasSeenJournalIntro()).toBe(false);
  });

  test('markJournalIntroSeen persists the flag', async () => {
    await markJournalIntroSeen();
    expect(await hasSeenJournalIntro()).toBe(true);
  });

  test('clearProgress resets journal intro flag', async () => {
    await markJournalIntroSeen();
    expect(await hasSeenJournalIntro()).toBe(true);
    await clearProgress();
    expect(await hasSeenJournalIntro()).toBe(false);
  });
});
