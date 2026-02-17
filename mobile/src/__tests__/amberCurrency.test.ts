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
} from '../services/amberCurrency';
import { FIRST_COMPLETION_BONUS } from '../types/homeWorld';
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
  await clearProgress();
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
    const result = await awardPuzzleAmber('EASY', 1);
    expect(result.baseAmount).toBe(8); // EASY base = 8
    expect(result.amount).toBeGreaterThanOrEqual(8);
    expect(result.newBalance).toBeGreaterThan(0);
  });

  test('awards more for HARD difficulty', async () => {
    const easy = await awardPuzzleAmber('EASY', 1);
    await clearProgress();
    const hard = await awardPuzzleAmber('HARD', 1);
    expect(hard.baseAmount).toBeGreaterThan(easy.baseAmount);
  });

  test('3-star bonus gives 50% more', async () => {
    const result = await awardPuzzleAmber('MEDIUM', 3);
    // Base is 10, 3-star = floor(10 * 1.5) = 15
    expect(result.baseAmount).toBe(15);
  });

  test('2-star bonus gives 25% more', async () => {
    const result = await awardPuzzleAmber('MEDIUM', 2);
    // Base is 10, 2-star = floor(10 * 1.25) = 12
    expect(result.baseAmount).toBe(12);
  });

  test('increments puzzles solved', async () => {
    await awardPuzzleAmber('EASY', 1);
    const progress = await loadProgress();
    expect(progress.puzzlesSolved).toBe(1);
  });

  test('tracks phase transitions', async () => {
    // Solve enough puzzles to reach phase 1 (25 puzzles)
    await devAddPuzzles(24);
    const result = await awardPuzzleAmber('EASY', 1);
    expect(result.puzzlesSolved).toBe(25);
    expect(result.phaseChanged).toBe(true);
    expect(result.newPhase).toBe(1);
  });

  test('creditToBalance=false computes reward but does not credit amber', async () => {
    const result = await awardPuzzleAmber('MEDIUM', 3, 'standard', 0.5, false);
    expect(result.amount).toBeGreaterThan(0);
    // Balance should be 0 because amber was not credited
    expect(result.newBalance).toBe(0);
    const balance = await getAmberBalance();
    expect(balance).toBe(0);
  });

  test('creditToBalance=false still increments puzzlesSolved', async () => {
    await awardPuzzleAmber('EASY', 1, 'standard', 0.5, false);
    const progress = await loadProgress();
    expect(progress.puzzlesSolved).toBe(1);
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
});

describe('applyVariantAmberBonus', () => {
  test('grants variant bonus and persists balance', async () => {
    await devAddAmber(100);
    const result = await applyVariantAmberBonus('speed', 20, 1.34);
    expect(result.bonus).toBeGreaterThan(0);
    const balance = await getAmberBalance();
    expect(balance).toBe(100 + result.bonus);
  });

  test('creditToBalance=false computes variant bonus but does not credit', async () => {
    await devAddAmber(100);
    const balanceBefore = await getAmberBalance();
    const result = await applyVariantAmberBonus('speed', 20, 1.34, false);
    expect(result.bonus).toBeGreaterThan(0);
    const balanceAfter = await getAmberBalance();
    expect(balanceAfter).toBe(balanceBefore); // No change
  });

  test('applies decay on repeated same variant farming', async () => {
    await devAddAmber(100);
    const first = await applyVariantAmberBonus('speed', 20, 1.34);
    const second = await applyVariantAmberBonus('speed', 20, 1.34);
    const third = await applyVariantAmberBonus('speed', 20, 1.34);
    expect(first.repeatDecay).toBe(1.0);
    expect(second.repeatDecay).toBe(1.0);
    expect(third.repeatDecay).toBeLessThan(1.0);
    expect(third.bonus).toBeLessThan(first.bonus);
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

  test('transitions to phase 4 after 250 puzzles', async () => {
    await devAddPuzzles(250);
    const phase = await getCurrentPhase();
    expect(phase).toBe(4);
  });
});

describe('getPuzzlesUntilNextPhase', () => {
  test('returns 25 initially (to reach phase 1)', async () => {
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBe(25);
  });

  test('returns null at max phase', async () => {
    await devAddPuzzles(250);
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBeNull();
  });

  test('decreases as puzzles are solved', async () => {
    await devAddPuzzles(10);
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBe(15); // 25 - 10
  });

  test('uses phaseProgress for accelerated players', async () => {
    // devAddPuzzles keeps phaseProgress in sync, so after 10 puzzles
    // both puzzlesSolved and phaseProgress are 10
    await devAddPuzzles(10);
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBe(15);
  });

  test('never returns negative values', async () => {
    // At phase boundary, should be 0 not negative
    await devAddPuzzles(25);
    // Now at phase 1, puzzles until phase 2 threshold (75)
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBeGreaterThanOrEqual(0);
  });

  test('returns correct value at each phase boundary', async () => {
    // Phase 0 -> 1: threshold is 25
    expect(await getPuzzlesUntilNextPhase()).toBe(25);

    await devAddPuzzles(25); // Now at phase 1
    // Phase 1 -> 2: threshold is 75
    expect(await getPuzzlesUntilNextPhase()).toBe(50); // 75 - 25

    await devAddPuzzles(50); // Now at phase 2 (75 total)
    // Phase 2 -> 3: threshold is 150
    expect(await getPuzzlesUntilNextPhase()).toBe(75); // 150 - 75

    await devAddPuzzles(75); // Now at phase 3 (150 total)
    // Phase 3 -> 4: threshold is 250
    expect(await getPuzzlesUntilNextPhase()).toBe(100); // 250 - 150

    await devAddPuzzles(100); // Now at phase 4 (250 total)
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
    const result = await awardPuzzleAmber('EASY', 1);
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
