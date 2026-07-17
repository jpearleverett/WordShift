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
  pickNudgeVariant,
  consumeVariantNudge,
  getCycleCount,
  getCycleAcceleration,
  canStartNewCycle,
  startNewCycle,
  consumeCycleOpening,
  markHouseCompleted,
  markFinalPuzzleCompleted,
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
  canArmFinale,
  armFinale,
  isFinaleArmed,
  getFullProgress,
  invalidateProgressCache,
  awardBonusAmber,
  confirmPhaseTransition,
  recordRitualWords,
  calculatePhaseAcceleration,
} from '../services/amberCurrency';
import {
  SURPRISE_BONUS_AMOUNTS,
  SURPRISE_BONUS_MIN_PUZZLES,
  STREAK_FREEZE_CAP,
  FREE_FREEZE_INTERVAL_DAYS,
  NARRATIVE_ACCELERATION,
  FINALE_DWELL_PUZZLES,
  FINALE_ARM_MIN_PUZZLES,
} from '../constants/gameBalance';
import { FIRST_COMPLETION_BONUS } from '../types/homeWorld';
import { getLocalDateStringDaysAgo } from '../services/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPhaseStartIndex,
  getTotalDialogueCount,
} from '../services/dialogue/animalDialogueBase';

// amberCurrency lazy-requires eventLogger for phase_reached telemetry — mock it
// so the debounced flush timer never runs and the calls are assertable.
const mockLogEvent = jest.fn();
const mockGetInstallAgeDays = jest.fn(async () => 3);
jest.mock('../services/eventLogger', () => ({
  logEvent: (event: unknown) => mockLogEvent(event),
  getInstallAgeDays: () => mockGetInstallAgeDays(),
}));

beforeEach(async () => {
  (AsyncStorage.clear as jest.Mock)();
  await clearProgress();
  mockLogEvent.mockClear();
  mockGetInstallAgeDays.mockClear();
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

  test('self-heals unlocked vanguard Vesper to her effective Phase 4 start in global Phase 3', async () => {
    const legacy = {
      ...(await loadProgress()),
      currentPhase: 3,
      unlockedAnimals: ['tarsier'],
      lastDialogueRead: { tarsier: 0 },
    };
    await AsyncStorage.setItem('wordshift_home_progress', JSON.stringify(legacy));
    invalidateProgressCache();

    const expected = getPhaseStartIndex('tarsier', 4);
    expect((await loadProgress()).lastDialogueRead.tarsier).toBe(expected);

    invalidateProgressCache();
    expect((await loadProgress()).lastDialogueRead.tarsier).toBe(expected);
  });

  test('self-heals Phase 2 late recruits to their current effective phases, including lagging Phase 1', async () => {
    const legacy = {
      ...(await loadProgress()),
      currentPhase: 2,
      unlockedAnimals: ['tarsier', 'aye_aye', 'kakapo'],
      lastDialogueRead: { tarsier: 0, aye_aye: 0, kakapo: 0 },
    };
    await AsyncStorage.setItem('wordshift_home_progress', JSON.stringify(legacy));
    invalidateProgressCache();

    expect((await loadProgress()).lastDialogueRead).toMatchObject({
      tarsier: getPhaseStartIndex('tarsier', 3),
      aye_aye: getPhaseStartIndex('aye_aye', 2),
      kakapo: getPhaseStartIndex('kakapo', 1),
    });
  });

  // Lagging converges to phase 4 at the reveal (getAnimalPhase drops the -1
  // at global Phase 4), so Moss's effective phase in global Phase 4 is 4.
  test('self-heals unlocked lagging Moss to his effective Phase 4 start in global Phase 4', async () => {
    const legacy = {
      ...(await loadProgress()),
      currentPhase: 4,
      unlockedAnimals: ['kakapo'],
      lastDialogueRead: { kakapo: 0 },
    };
    await AsyncStorage.setItem('wordshift_home_progress', JSON.stringify(legacy));
    invalidateProgressCache();

    expect((await loadProgress()).lastDialogueRead.kakapo).toBe(
      getPhaseStartIndex('kakapo', 4)
    );
  });

  test('late-recruit self-heal never rewinds an existing dialogue position', async () => {
    const legacy = {
      ...(await loadProgress()),
      currentPhase: 4,
      unlockedAnimals: ['tarsier', 'kakapo'],
      lastDialogueRead: { tarsier: 9999, kakapo: 9999 },
    };
    await AsyncStorage.setItem('wordshift_home_progress', JSON.stringify(legacy));
    invalidateProgressCache();

    expect((await loadProgress()).lastDialogueRead).toMatchObject({
      tarsier: 9999,
      kakapo: 9999,
    });
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
    // Solve enough puzzles to reach phase 1 (PHASE_THRESHOLDS[1] = 16 puzzles)
    await devAddPuzzles(15);
    const result = await awardPuzzleAmber('EASY', 1);
    expect(result.puzzlesSolved).toBe(16);
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

  // Itemization fields (additive): the Victory modal renders the REAL
  // breakdown from these instead of re-deriving base/star math locally.
  test('returns baseAmber (pure difficulty base) and starBonusAmber separately', async () => {
    const threeStar = await awardPuzzleAmber('MEDIUM', 3, 'standard', 0, true);
    expect(threeStar.baseAmber).toBe(10); // AMBER_REWARDS.MEDIUM
    expect(threeStar.starBonusAmber).toBe(5); // floor(10 * 1.5) - 10
    expect(threeStar.baseAmber + threeStar.starBonusAmber).toBe(threeStar.baseAmount);

    await clearProgress();
    const oneStar = await awardPuzzleAmber('MEDIUM', 1, 'standard', 0, true);
    expect(oneStar.baseAmber).toBe(10);
    expect(oneStar.starBonusAmber).toBe(0);
  });

  test('itemized parts sum exactly to the awarded amount (breakdown invariant)', async () => {
    // A streak + challenge win with a forced surprise hit exercises every
    // per-puzzle line at once (milestone/first-completion are separate adds).
    await devAddPuzzles(SURPRISE_BONUS_MIN_PUZZLES);
    setSurpriseRng(() => 0); // force the surprise bonus ON
    const result = await awardPuzzleAmber('HARD', 3, 'challenge', 0, true);
    expect(result.surpriseBonus).toBeGreaterThan(0);
    expect(
      result.baseAmber +
      result.starBonusAmber +
      result.streakBonus +
      result.challengeBonus +
      result.patronBonus +
      result.surpriseBonus
    ).toBe(result.amount);
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

describe('variant-offer nudge', () => {
  test('pickNudgeVariant returns the first unlocked, never-won variant', () => {
    expect(pickNudgeVariant(['standard', 'reverse', 'speed'], { reverse: 3 })).toBe('speed');
    expect(pickNudgeVariant(['standard', 'reverse'], { reverse: 1 })).toBeNull();
    expect(pickNudgeVariant(['standard'], {})).toBeNull(); // nothing unlocked
  });

  test('consumeVariantNudge suggests a never-tried variant, once per day', async () => {
    const first = await consumeVariantNudge(['standard', 'reverse', 'speed'], 'standard');
    expect(first).toBe('reverse');
    // Same day: no second nudge.
    const second = await consumeVariantNudge(['standard', 'reverse', 'speed'], 'standard');
    expect(second).toBeNull();
  });

  test('consumeVariantNudge does not fire after a variant board', async () => {
    const nudge = await consumeVariantNudge(['standard', 'reverse'], 'reverse');
    expect(nudge).toBeNull();
  });

  test('consumeVariantNudge skips a variant the player has already won', async () => {
    await recordVariantWin('reverse', false);
    const nudge = await consumeVariantNudge(['standard', 'reverse'], 'standard');
    expect(nudge).toBeNull(); // reverse already won, nothing else unlocked+untried
  });
});

describe('New Cycle (NG+)', () => {
  test('getCycleAcceleration grows with cycles and is capped', () => {
    expect(getCycleAcceleration(0)).toBe(1);
    expect(getCycleAcceleration(1)).toBeGreaterThan(1);
    expect(getCycleAcceleration(2)).toBeGreaterThan(getCycleAcceleration(1));
    // Capped — a deep cycle can't collapse the arc.
    expect(getCycleAcceleration(100)).toBeLessThanOrEqual(2.0);
  });

  test('cannot start a cycle before the true endgame', async () => {
    expect(await canStartNewCycle()).toBe(false);
    // Only house complete — still not enough.
    await markHouseCompleted();
    expect(await canStartNewCycle()).toBe(false);
    // startNewCycle is a no-op here.
    expect(await startNewCycle()).toBe(0);
    expect(await getCycleCount()).toBe(0);
  });

  test('startNewCycle re-descends but keeps the collection', async () => {
    await devAddAmber(500);
    await markHouseCompleted();
    await markFinalPuzzleCompleted();
    await markPostRevelation();
    expect(await getCurrentPhase()).toBe(5);
    expect(await canStartNewCycle()).toBe(true);

    const cycle = await startNewCycle();
    expect(cycle).toBe(1);
    // Re-descended to the bright days.
    expect(await getCurrentPhase()).toBe(0);
    // Collection kept.
    expect(await getAmberBalance()).toBe(500);
    // The finale can fire again.
    expect(await canStartNewCycle()).toBe(false);
  });

  test('startNewCycle anchors cycleStartPuzzles and disarms the finale', async () => {
    await devAddPuzzles(200);
    await markHouseCompleted();
    await armFinale();
    await markFinalPuzzleCompleted();
    await markPostRevelation();

    await startNewCycle();
    const progress = await getFullProgress();
    // puzzlesSolved is KEPT; the cycle-relative baseline anchors at it so the
    // cycle micro-beats (keyed at counts 3/12/26/...) become reachable again.
    expect(progress.puzzlesSolved).toBe(200);
    expect(progress.cycleStartPuzzles).toBe(200);
    // The finale machinery fully re-arms from zero.
    expect(progress.finaleArmed).toBe(false);
    expect(progress.finalPuzzleCompleted).toBe(false);
    expect(progress.phase4Dwell).toBe(0);
    expect(await isFinaleArmed()).toBe(false);
  });

  test('consumeCycleOpening fires once per new cycle', async () => {
    await markHouseCompleted();
    await markFinalPuzzleCompleted();
    await markPostRevelation();
    await startNewCycle();
    expect(await consumeCycleOpening()).toBe(1);
    // Second call in the same cycle: nothing.
    expect(await consumeCycleOpening()).toBeNull();
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

  test('transitions to phase 1 after 20 puzzles', async () => {
    await devAddPuzzles(20);
    const phase = await getCurrentPhase();
    expect(phase).toBe(1);
  });

  test('transitions to phase 2 after 60 puzzles', async () => {
    await devAddPuzzles(60);
    const phase = await getCurrentPhase();
    expect(phase).toBe(2);
  });

  test('transitions to phase 4 after 180 puzzles', async () => {
    await devAddPuzzles(180);
    const phase = await getCurrentPhase();
    expect(phase).toBe(4);
  });
});

describe('getPuzzlesUntilNextPhase', () => {
  test('returns 16 initially (to reach phase 1)', async () => {
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBe(16);
  });

  test('returns null at max phase', async () => {
    await devAddPuzzles(180);
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBeNull();
  });

  test('decreases as puzzles are solved', async () => {
    await devAddPuzzles(10);
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBe(6); // 16 - 10
  });

  test('uses phaseProgress for accelerated players', async () => {
    // devAddPuzzles keeps phaseProgress in sync, so after 10 puzzles
    // both puzzlesSolved and phaseProgress are 10
    await devAddPuzzles(10);
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBe(6);
  });

  test('never returns negative values', async () => {
    // At phase boundary, should be 0 not negative
    await devAddPuzzles(20);
    // Now at phase 1, puzzles until phase 2 threshold (60)
    const remaining = await getPuzzlesUntilNextPhase();
    expect(remaining).toBeGreaterThanOrEqual(0);
  });

  test('returns correct value at each phase boundary', async () => {
    // Phase 0 -> 1: threshold is 16
    expect(await getPuzzlesUntilNextPhase()).toBe(16);

    await devAddPuzzles(16); // Now at phase 1
    // Phase 1 -> 2: threshold is 44
    expect(await getPuzzlesUntilNextPhase()).toBe(28); // 44 - 16

    await devAddPuzzles(28); // Now at phase 2 (44 total)
    // Phase 2 -> 3: threshold is 84
    expect(await getPuzzlesUntilNextPhase()).toBe(40); // 84 - 44

    await devAddPuzzles(40); // Now at phase 3 (84 total)
    // Phase 3 -> 4: threshold is 124
    expect(await getPuzzlesUntilNextPhase()).toBe(40); // 124 - 84

    await devAddPuzzles(40); // Now at phase 4 (124 total)
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

  test('multiple freezes can be purchased and stacked up to the cap', async () => {
    await devAddAmber(200);
    await purchaseStreakFreeze();
    await purchaseStreakFreeze();
    await purchaseStreakFreeze();

    const count = await getStreakFreezeCount();
    expect(count).toBe(3);

    const balance = await getAmberBalance();
    expect(balance).toBe(200 - 3 * STREAK_FREEZE_AMBER_COST);
  });

  test('purchase refuses at STREAK_FREEZE_CAP and charges nothing', async () => {
    await devAddAmber(1000);
    for (let i = 0; i < STREAK_FREEZE_CAP; i++) {
      expect(await purchaseStreakFreeze()).toBe(true);
    }
    const balanceAtCap = await getAmberBalance();

    expect(await purchaseStreakFreeze()).toBe(false);
    expect(await getStreakFreezeCount()).toBe(STREAK_FREEZE_CAP);
    expect(await getAmberBalance()).toBe(balanceAtCap);
  });

  test('free grant does not exceed the cap and does not burn the interval', async () => {
    // Seed: at the cap, with the free-grant interval already elapsed.
    const progress = await loadProgress();
    progress.streakFreezes = STREAK_FREEZE_CAP;
    progress.lastFreeStreakFreezeDate = getLocalDateStringDaysAgo(FREE_FREEZE_INTERVAL_DAYS + 1);

    expect(await checkFreeStreakFreeze()).toBe(false);
    expect(await getStreakFreezeCount()).toBe(STREAK_FREEZE_CAP);

    // Consuming a freeze frees a slot — the banked grant lands on the next
    // check (the last-grant date was NOT advanced while at the cap).
    (await loadProgress()).streakFreezes = STREAK_FREEZE_CAP - 1;
    expect(await checkFreeStreakFreeze()).toBe(true);
    expect(await getStreakFreezeCount()).toBe(STREAK_FREEZE_CAP);
  });

  test('first-ever free grant also respects the cap', async () => {
    // No lastFreeStreakFreezeDate, but already holding a full stack (purchases).
    const progress = await loadProgress();
    progress.streakFreezes = STREAK_FREEZE_CAP;
    expect(await checkFreeStreakFreeze()).toBe(false);
    expect(await getStreakFreezeCount()).toBe(STREAK_FREEZE_CAP);
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
  test('recordPhase4Dwell caps the persisted count at the eight-win dwell limit', async () => {
    expect(await getPhase4DwellCount()).toBe(0);
    for (let count = 1; count <= FINALE_DWELL_PUZZLES + 3; count++) {
      expect(await recordPhase4Dwell()).toBe(Math.min(count, FINALE_DWELL_PUZZLES));
    }
    expect(await getPhase4DwellCount()).toBe(FINALE_DWELL_PUZZLES);
    expect((await getFullProgress()).phase4Dwell).toBe(FINALE_DWELL_PUZZLES);
  });

  test('canArmFinale requires both a full dwell and the arming floor', () => {
    expect(canArmFinale(FINALE_DWELL_PUZZLES, FINALE_ARM_MIN_PUZZLES - 1)).toBe(false);
    expect(canArmFinale(FINALE_DWELL_PUZZLES - 1, FINALE_ARM_MIN_PUZZLES)).toBe(false);
    expect(canArmFinale(FINALE_DWELL_PUZZLES, FINALE_ARM_MIN_PUZZLES)).toBe(true);
  });

  test('armFinale arms and markFinalPuzzleCompleted disarms (the marked final board contract)', async () => {
    expect(await isFinaleArmed()).toBe(false);
    await armFinale();
    expect(await isFinaleArmed()).toBe(true);
    // Idempotent while armed.
    await armFinale();
    expect(await isFinaleArmed()).toBe(true);
    // The final board's win disarms in the same write that marks completion.
    await markFinalPuzzleCompleted();
    expect(await isFinaleArmed()).toBe(false);
    const progress = await getFullProgress();
    expect(progress.finalPuzzleCompleted).toBe(true);
    expect(progress.finaleArmed).toBe(false);
  });

  test('armFinale is a no-op once the final puzzle is completed', async () => {
    await markFinalPuzzleCompleted();
    await armFinale();
    // A late arm can never re-open the finale after it played.
    expect(await isFinaleArmed()).toBe(false);
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

  test('markPostRevelation retires every unlocked animal regular-dialogue index', async () => {
    const progress = await loadProgress();
    const foxTotal = getTotalDialogueCount('fox', 4);
    const pangolinTotal = getTotalDialogueCount('pangolin', 4);
    progress.unlockedAnimals = ['fox', 'pangolin'];
    progress.lastDialogueRead = {
      fox: 0,
      pangolin: pangolinTotal + 3,
    };

    await markPostRevelation();

    const after = await getFullProgress();
    expect(after.lastDialogueRead.fox).toBe(foxTotal);
    expect(after.lastDialogueRead.pangolin).toBe(pangolinTotal + 3);
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

  test('Phase 5 retirement takes precedence over late-recruit fast-forward', async () => {
    const tarsierTotal = getTotalDialogueCount('tarsier', 4);
    const legacy = {
      ...(await loadProgress()),
      currentPhase: 5,
      postRevelation: true,
      unlockedAnimals: ['tarsier'],
      lastDialogueRead: { tarsier: 2 },
    };
    await AsyncStorage.setItem('wordshift_home_progress', JSON.stringify(legacy));
    invalidateProgressCache();

    const progress = await loadProgress();
    expect(progress.lastDialogueRead.tarsier).toBe(tarsierTotal);

    invalidateProgressCache();
    expect((await loadProgress()).lastDialogueRead.tarsier).toBe(tarsierTotal);
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

// ============================================================================
// Deferred harvest credit — totalAmberEarned must count each amber ONCE
// ============================================================================

describe('deferred harvest credit (no totalAmberEarned double count)', () => {
  test('a deferred win credited via word_offering increments totalAmberEarned exactly once', async () => {
    // Victory: creditToBalance=false — amber queued for the pit, but the
    // lifetime counter is incremented NOW.
    const result = await awardPuzzleAmber('MEDIUM', 3);
    const queued = result.amount
      + result.milestoneBonus
      + result.firstCompletionBonus
      + result.streakMilestoneBonus;
    expect(queued).toBeGreaterThan(0);
    expect((await getFullProgress()).totalAmberEarned).toBe(queued);
    expect(await getAmberBalance()).toBe(0);

    // Pit offer: the SAME amber is released to the spendable balance.
    const newBalance = await awardBonusAmber(queued, 'word_offering');
    expect(newBalance).toBe(queued);

    // Counted once, not twice — the amber-earned achievements pace correctly.
    expect((await getFullProgress()).totalAmberEarned).toBe(queued);
  });

  test('the auto-collect credit source also skips totalAmberEarned', async () => {
    const result = await awardPuzzleAmber('EASY', 1);
    const queued = result.amount + result.firstCompletionBonus;
    await awardBonusAmber(queued, 'auto_word_offering');
    expect((await getFullProgress()).totalAmberEarned).toBe(queued);
    expect(await getAmberBalance()).toBe(queued);
  });

  test('genuinely new bonus sources still increment totalAmberEarned', async () => {
    await awardBonusAmber(50, 'quest_reward');
    await awardBonusAmber(30, 'daily_streak_milestone');
    const progress = await getFullProgress();
    expect(progress.amber).toBe(80);
    expect(progress.totalAmberEarned).toBe(80);
  });
});

// ============================================================================
// skipPhaseProgress — amber-only wins (shared-challenge-link farming guard)
// ============================================================================

describe('awardPuzzleAmber skipPhaseProgress option', () => {
  test('default path accrues phaseProgress', async () => {
    await awardPuzzleAmber('HARD', 3, 'standard', 0, true);
    const progress = await getFullProgress();
    expect(progress.phaseProgress).toBeGreaterThan(0);
    expect(progress.puzzlesSolved).toBe(1);
  });

  test('skipPhaseProgress applies identical amber math but zero phaseProgress', async () => {
    const normal = await awardPuzzleAmber('HARD', 3, 'standard', 0, true);
    const normalProgress = (await getFullProgress()).phaseProgress;
    expect(normalProgress).toBeGreaterThan(0);

    await clearProgress();
    const skipped = await awardPuzzleAmber('HARD', 3, 'standard', 0, true, {
      skipPhaseProgress: true,
    });
    const progress = await getFullProgress();

    // Zero narrative descent...
    expect(progress.phaseProgress).toBe(0);
    // ...but the amber reward is byte-identical to the normal win.
    expect(skipped.amount).toBe(normal.amount);
    expect(skipped.newBalance).toBe(normal.newBalance);
    expect(skipped.firstCompletionBonus).toBe(normal.firstCompletionBonus);
    // The win still counts as a solved puzzle (stats, milestones).
    expect(skipped.puzzlesSolved).toBe(1);
  });

  test('repeated skipped wins never accumulate phaseProgress (farming hole closed)', async () => {
    for (let i = 0; i < 5; i++) {
      await awardPuzzleAmber('EASY', 3, 'standard', 0, false, { skipPhaseProgress: true });
    }
    const progress = await getFullProgress();
    expect(progress.phaseProgress).toBe(0);
    expect(progress.puzzlesSolved).toBe(5);
    expect(progress.currentPhase).toBe(0);
    expect(progress.pendingPhaseTransition).toBeNull();
  });

  test('recordRitualWords with zero energy records words but feeds no phaseProgress', async () => {
    // The shared-challenge path passes energy 0: the ledger + trigger queue
    // still fill (flavor stays) but the energy * 0.1 phase feed gets nothing.
    const before = (await getFullProgress()).phaseProgress ?? 0;
    const result = await recordRitualWords(['VOID', 'DOOM'], 0, ['VOID']);
    const after = (await getFullProgress()).phaseProgress ?? 0;

    expect(result.totalWordsFormed).toBe(2);
    expect(result.triggerWordQueue).toContain('VOID');
    expect(after).toBe(before);
  });
});

// ============================================================================
// phase_reached telemetry
// ============================================================================

describe('phase_reached telemetry', () => {
  test('confirmPhaseTransition logs phase_reached with puzzles and install age', async () => {
    await devAddPuzzles(15);
    const result = await awardPuzzleAmber('EASY', 1); // queues the 0 -> 1 transition
    expect(result.phaseChanged).toBe(true);
    mockLogEvent.mockClear();

    const confirmed = await confirmPhaseTransition();
    expect(confirmed!.newPhase).toBe(1);
    expect(mockLogEvent).toHaveBeenCalledTimes(1);
    expect(mockLogEvent).toHaveBeenCalledWith({
      type: 'phase_reached',
      data: { phase: 1, puzzlesSolved: 16, installAgeDays: 3 },
    });
  });

  test('no phase_reached when there is no pending transition', async () => {
    expect(await confirmPhaseTransition()).toBeNull();
    expect(mockLogEvent).not.toHaveBeenCalled();
  });

  test('markPostRevelation logs the phase-5 pin', async () => {
    await devAddPuzzles(235);
    mockLogEvent.mockClear();

    await markPostRevelation();
    expect(mockLogEvent).toHaveBeenCalledWith({
      type: 'phase_reached',
      data: { phase: 5, puzzlesSolved: 235, installAgeDays: 3 },
    });
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
