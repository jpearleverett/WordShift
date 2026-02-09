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
} from '../services/amberCurrency';
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
    expect(result.baseAmount).toBe(5);
    expect(result.amount).toBeGreaterThanOrEqual(5);
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
