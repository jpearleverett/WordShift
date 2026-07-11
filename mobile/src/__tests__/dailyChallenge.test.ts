import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getTodayString,
  getDailyDifficulty,
  getDailyRamp,
  isFirstDailyEasing,
  isDailyChallengeUnlocked,
  getDailyChallengeUnlockProgress,
  isDailyCompleted,
  recordDailyCompletion,
  getDailyStatus,
  clearDailyProgress,
  DAILY_STREAK_MILESTONES,
  checkDailyStreakMilestone,
  generateDailyPuzzle,
  prewarmDailyPuzzle,
  loadDailyProgress,
  grantFirstDailyMercy,
  DAILY_CHALLENGE_UNLOCK_PUZZLES,
  getDailyHost,
  getDailyHostName,
} from '../services/dailyChallenge';
import { getHintBalance, clearHints } from '../services/hints';
import { FIRST_DAILY_BONUS_HINTS } from '../constants/gameBalance';
import { generateLocalPuzzle } from '../services/localGenerator';
import { getLocalDateStringDaysAgo } from '../services/dateUtils';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((key: string) => Promise.resolve(store[key] || null)),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach(key => delete store[key]);
        return Promise.resolve();
      }),
    },
  };
});

// Mock localGenerator to avoid actual puzzle generation
jest.mock('../services/localGenerator', () => ({
  generateLocalPuzzle: jest.fn(() =>
    Promise.resolve({
      words: ['FARM', 'ARM', 'WARM', 'WAR'],
      hint: 'Think about letters...',
      solution: [
        { stepIndex: 0, sourceWord: 'FARM', targetWord: 'ARM', letterToMove: 'F', explanation: '' },
      ],
      difficulty: 'MEDIUM',
    })
  ),
}));

// Mock amberCurrency
jest.mock('../services/amberCurrency', () => ({
  getCurrentPhase: jest.fn(() => Promise.resolve(0)),
}));

// Mock wordHistory
jest.mock('../services/wordHistory', () => ({
  getWordHistoryWithRecency: jest.fn(() => Promise.resolve(new Map())),
  recordPuzzleWords: jest.fn(() => Promise.resolve()),
}));

describe('dailyChallenge', () => {
  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    await clearDailyProgress();
  });

  test('getTodayString returns YYYY-MM-DD format', () => {
    const today = getTodayString();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('daily difficulty ramps across the week (gentle Mon -> brutal Sun)', () => {
    // 2026-02-09 is a Monday; step through the week (local-component dates).
    // Mon accessible, Sun the peak — the habit-anchor ramp.
    expect(getDailyDifficulty('2026-02-09')).toBe('MEDIUM');       // Mon
    expect(getDailyDifficulty('2026-02-10')).toBe('MEDIUM_PLUS');  // Tue
    expect(getDailyDifficulty('2026-02-11')).toBe('MEDIUM_PLUS');  // Wed
    expect(getDailyDifficulty('2026-02-12')).toBe('HARD');         // Thu
    expect(getDailyDifficulty('2026-02-13')).toBe('HARD');         // Fri
    expect(getDailyDifficulty('2026-02-14')).toBe('HARD');         // Sat
    expect(getDailyDifficulty('2026-02-15')).toBe('HARD');         // Sun
  });

  test('daily ramp is deterministic by date (same puzzle shape for everyone)', () => {
    // Sunday is the peak: 6-letter / 5-row HARD.
    expect(getDailyRamp('2026-02-15')).toEqual({ difficulty: 'HARD', wordLength: 6, targetRows: 5 });
    // Monday is accessible: 4-letter / 4-row MEDIUM.
    expect(getDailyRamp('2026-02-09')).toEqual({ difficulty: 'MEDIUM', wordLength: 4, targetRows: 4 });
  });

  describe('first-ever daily easing', () => {
    test('getDailyRamp eases the FIRST daily to MEDIUM 4/4 regardless of weekday', () => {
      // Sunday (normally HARD 6/5 peak) and Thursday (normally HARD 5/5) both
      // ease to the gentle Monday shape for a newcomer's first daily.
      expect(getDailyRamp('2026-02-15', true)).toEqual({ difficulty: 'MEDIUM', wordLength: 4, targetRows: 4 });
      expect(getDailyRamp('2026-02-12', true)).toEqual({ difficulty: 'MEDIUM', wordLength: 4, targetRows: 4 });
    });

    test('getDailyDifficulty eases the first daily but the default is the normal ramp', () => {
      expect(getDailyDifficulty('2026-02-15', true)).toBe('MEDIUM');  // eased
      expect(getDailyDifficulty('2026-02-15', false)).toBe('HARD');   // normal Sunday
      expect(getDailyDifficulty('2026-02-15')).toBe('HARD');          // default = not eased
    });

    test('the weekday ramp is UNCHANGED for non-first dailies (determinism preserved)', () => {
      // Everyone past their first daily stays on the deterministic weekday ramp,
      // so the shared board and the leaderboard stay fair.
      expect(getDailyRamp('2026-02-15', false)).toEqual({ difficulty: 'HARD', wordLength: 6, targetRows: 5 });
      expect(getDailyRamp('2026-02-09', false)).toEqual({ difficulty: 'MEDIUM', wordLength: 4, targetRows: 4 });
      expect(getDailyRamp('2026-02-13')).toEqual(getDailyRamp('2026-02-13')); // stable per date
    });

    test('isFirstDailyEasing is true only before the first daily completion', async () => {
      const fresh = await loadDailyProgress();
      expect(isFirstDailyEasing(fresh)).toBe(true);

      await recordDailyCompletion(3, 0, 0);
      const after = await loadDailyProgress();
      expect(isFirstDailyEasing(after)).toBe(false);
    });

    test('generateDailyPuzzle flags the first daily as eased (not leaderboard-eligible)', async () => {
      const daily = await generateDailyPuzzle();
      expect(daily.eased).toBe(true);
    });

    test('generateDailyPuzzle does NOT ease once the player has completed a daily', async () => {
      const p = await loadDailyProgress();
      p.totalCompleted = 1; // returning player
      const daily = await generateDailyPuzzle();
      expect(daily.eased).toBe(false);
    });
  });

  test('unlock threshold is 8 puzzles (aligned with the auto-collect window)', () => {
    expect(DAILY_CHALLENGE_UNLOCK_PUZZLES).toBe(8);
  });

  describe('daily host', () => {
    test('is deterministic by date', () => {
      expect(getDailyHost('2026-02-15')).toBe(getDailyHost('2026-02-15'));
    });

    test('host name only ever names an animal the player has met', () => {
      // Only Fox met → always Ember, even though the deterministic pick may be someone else.
      expect(getDailyHostName(['fox'], '2026-02-15')).toBe('Ember');
      // No animals met → falls back to Ember (Fox is always known post-onboarding).
      expect(getDailyHostName([], '2026-02-15')).toBe('Ember');
    });

    test('host name is chosen from the unlocked set', () => {
      const name = getDailyHostName(['fox', 'pangolin', 'owl'], '2026-02-15');
      expect(['Ember', 'Panko', 'Archimedes']).toContain(name);
    });
  });

  test('daily challenge unlocks after enough puzzle progress', () => {
    expect(isDailyChallengeUnlocked(0, 0)).toBe(false);
    expect(isDailyChallengeUnlocked(3, 0)).toBe(false);
    expect(isDailyChallengeUnlocked(DAILY_CHALLENGE_UNLOCK_PUZZLES - 1, 0)).toBe(false);
    expect(isDailyChallengeUnlocked(DAILY_CHALLENGE_UNLOCK_PUZZLES, 0)).toBe(true);
    // Phase 1+ alternative unlock is unchanged.
    expect(isDailyChallengeUnlocked(1, 1)).toBe(true);
  });

  test('daily challenge unlock progress reports remaining puzzles', () => {
    expect(getDailyChallengeUnlockProgress(0, 0)).toEqual({
      unlocked: false,
      puzzlesRemaining: DAILY_CHALLENGE_UNLOCK_PUZZLES,
    });
    expect(getDailyChallengeUnlockProgress(DAILY_CHALLENGE_UNLOCK_PUZZLES - 1, 0)).toEqual({
      unlocked: false,
      puzzlesRemaining: 1,
    });
    expect(getDailyChallengeUnlockProgress(DAILY_CHALLENGE_UNLOCK_PUZZLES, 0)).toEqual({
      unlocked: true,
      puzzlesRemaining: 0,
    });
  });

  test('isDailyCompleted returns false initially', async () => {
    expect(await isDailyCompleted()).toBe(false);
  });

  test('recordDailyCompletion marks as completed', async () => {
    await recordDailyCompletion(3, 0, 0);
    expect(await isDailyCompleted()).toBe(true);
  });

  test('recordDailyCompletion increments total', async () => {
    await recordDailyCompletion(2, 1, 2);
    const status = await getDailyStatus();
    expect(status.totalCompleted).toBe(1);
    expect(status.isCompleted).toBe(true);
  });

  test('recordDailyCompletion does not double-count', async () => {
    await recordDailyCompletion(3, 0, 0);
    await recordDailyCompletion(3, 0, 0);
    const status = await getDailyStatus();
    expect(status.totalCompleted).toBe(1);
  });

  test('getDailyStatus returns correct structure', async () => {
    const status = await getDailyStatus();
    expect(status).toHaveProperty('isCompleted');
    expect(status).toHaveProperty('difficulty');
    expect(status).toHaveProperty('todayResult');
    expect(status).toHaveProperty('streak');
    expect(status).toHaveProperty('bestStreak');
    expect(status).toHaveProperty('totalCompleted');
  });

  test('streak starts at 1 after first completion', async () => {
    await recordDailyCompletion(3, 0, 0);
    const status = await getDailyStatus();
    expect(status.streak).toBe(1);
    expect(status.bestStreak).toBe(1);
  });

  test('clearDailyProgress resets everything', async () => {
    await recordDailyCompletion(3, 0, 0);
    expect(await isDailyCompleted()).toBe(true);

    await clearDailyProgress();
    expect(await isDailyCompleted()).toBe(false);

    const status = await getDailyStatus();
    expect(status.totalCompleted).toBe(0);
  });
});

describe('dailyChallenge streak freeze mercy', () => {
  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    await clearDailyProgress();
  });

  test('yesterday completion continues the streak without spending a freeze', async () => {
    const p = await loadDailyProgress();
    p.currentStreak = 3;
    p.streakFreezes = 1;
    p.lastFreezeGrantDate = getLocalDateStringDaysAgo(1);
    p.lastCompletedDate = getLocalDateStringDaysAgo(1);
    const result = await recordDailyCompletion(3, 0, 0);
    expect(result.currentStreak).toBe(4);
    expect(result.streakFreezes).toBe(1);
    expect(result.streakSavedByFreeze).toBe(false);
  });

  test('a banked freeze forgives a missed day and keeps the streak', async () => {
    const p = await loadDailyProgress();
    p.currentStreak = 5;
    p.bestStreak = 5;
    p.streakFreezes = 1;
    p.lastFreezeGrantDate = getLocalDateStringDaysAgo(1);
    p.lastCompletedDate = getLocalDateStringDaysAgo(2); // one full day missed
    const result = await recordDailyCompletion(3, 0, 0);
    expect(result.streakSavedByFreeze).toBe(true);
    expect(result.currentStreak).toBe(6);
    expect(result.streakFreezes).toBe(0);
  });

  test('without a freeze, a short streak below the first milestone resets to 1', async () => {
    const p = await loadDailyProgress();
    p.currentStreak = 2; // below the 3-day first milestone → nothing to protect
    p.streakFreezes = 0;
    p.lastFreezeGrantDate = getLocalDateStringDaysAgo(1);
    p.lastCompletedDate = getLocalDateStringDaysAgo(2);
    const result = await recordDailyCompletion(3, 0, 0);
    expect(result.streakSavedByFreeze).toBe(false);
    expect(result.currentStreak).toBe(1);
    expect(result.streakDecayedTo).toBeUndefined();
  });

  test('without a freeze, a long streak decays to its last milestone checkpoint (not to 1)', async () => {
    const p = await loadDailyProgress();
    p.currentStreak = 25; // past the 21-day milestone
    p.streakFreezes = 0;
    p.lastFreezeGrantDate = getLocalDateStringDaysAgo(1);
    p.lastCompletedDate = getLocalDateStringDaysAgo(2);
    const result = await recordDailyCompletion(3, 0, 0);
    expect(result.streakSavedByFreeze).toBe(false);
    // Falls back to the 21-day checkpoint rather than being wiped to 1.
    expect(result.currentStreak).toBe(21);
    expect(result.streakDecayedTo).toBe(21);
  });

  test('a free freeze is granted after the interval has elapsed', async () => {
    const p = await loadDailyProgress();
    p.currentStreak = 2;
    p.streakFreezes = 0;
    p.lastFreezeGrantDate = getLocalDateStringDaysAgo(20); // > 14-day interval
    p.lastCompletedDate = getLocalDateStringDaysAgo(1); // yesterday → free continue
    const result = await recordDailyCompletion(3, 0, 0);
    expect(result.streakFreezes).toBe(1); // granted, not spent
    expect(result.currentStreak).toBe(3);
  });
});

describe('first-daily hint mercy', () => {
  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    await clearDailyProgress();
    await clearHints();
  });

  test('grants FIRST_DAILY_BONUS_HINTS exactly once, null afterwards', async () => {
    const first = await grantFirstDailyMercy();
    expect(first).toBe(FIRST_DAILY_BONUS_HINTS);

    const second = await grantFirstDailyMercy();
    expect(second).toBeNull();
  });

  test('hint balance reflects the grant', async () => {
    expect(await getHintBalance()).toBe(0);
    await grantFirstDailyMercy();
    expect(await getHintBalance()).toBe(FIRST_DAILY_BONUS_HINTS);

    // A repeat call grants nothing more.
    await grantFirstDailyMercy();
    expect(await getHintBalance()).toBe(FIRST_DAILY_BONUS_HINTS);
  });

  test('the granted flag is persisted with the daily progress record', async () => {
    await grantFirstDailyMercy();
    const stored = await AsyncStorage.getItem('wordshift_daily_challenge');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).firstDailyMercyGranted).toBe(true);
  });

  test('clearDailyProgress resets the mercy (Reset All re-allows it)', async () => {
    await grantFirstDailyMercy();
    await clearDailyProgress();
    expect(await grantFirstDailyMercy()).toBe(FIRST_DAILY_BONUS_HINTS);
  });
});

describe('generateDailyPuzzle caching / prewarm', () => {
  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    await clearDailyProgress();
    (generateLocalPuzzle as jest.Mock).mockClear();
  });

  test('memoizes today\'s puzzle — a repeat call does not regenerate', async () => {
    const first = await generateDailyPuzzle();
    const second = await generateDailyPuzzle();
    expect(second).toEqual(first);
    expect((generateLocalPuzzle as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  test('threads the generator solution through DailyPuzzleData (stored-step daily hints)', async () => {
    const daily = await generateDailyPuzzle();
    expect(daily.solution).toEqual([
      { stepIndex: 0, sourceWord: 'FARM', targetWord: 'ARM', letterToMove: 'F', explanation: '' },
    ]);
  });

  test('prewarm generates the puzzle ahead of time so the next call is cached', async () => {
    prewarmDailyPuzzle();
    // Let the fire-and-forget generation settle.
    await Promise.resolve();
    await generateDailyPuzzle();
    expect((generateLocalPuzzle as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  test('clearDailyProgress drops the cached puzzle', async () => {
    await generateDailyPuzzle();
    await clearDailyProgress();
    await generateDailyPuzzle();
    expect((generateLocalPuzzle as jest.Mock)).toHaveBeenCalledTimes(2);
  });
});

describe('dailyStreakMilestones', () => {
  test('DAILY_STREAK_MILESTONES has 5 entries', () => {
    expect(DAILY_STREAK_MILESTONES).toHaveLength(5);
  });

  test('milestones are at 3, 7, 14, 21, 30 days', () => {
    expect(DAILY_STREAK_MILESTONES.map(m => m.days)).toEqual([3, 7, 14, 21, 30]);
  });

  test('amber rewards are 15, 30, 50, 75, 100', () => {
    expect(DAILY_STREAK_MILESTONES.map(m => m.amber)).toEqual([15, 30, 50, 75, 100]);
  });

  test('checkDailyStreakMilestone returns milestone when crossing threshold', () => {
    const result = checkDailyStreakMilestone(3, 2, 0);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(15);
    expect(result!.message).toBe('Three days running!');
  });

  test('checkDailyStreakMilestone returns null when not crossing threshold', () => {
    expect(checkDailyStreakMilestone(4, 3, 0)).toBeNull();
    expect(checkDailyStreakMilestone(2, 1, 0)).toBeNull();
  });

  test('checkDailyStreakMilestone uses dark message at Phase 3+', () => {
    const result = checkDailyStreakMilestone(7, 6, 3);
    expect(result).not.toBeNull();
    expect(result!.message).toBe('Seven days. The ritual deepens.');
  });

  test('checkDailyStreakMilestone returns normal message below Phase 3', () => {
    const result = checkDailyStreakMilestone(7, 6, 2);
    expect(result).not.toBeNull();
    expect(result!.message).toBe('A full week of dailies!');
  });

  test('30-day milestone awards 100 amber', () => {
    const result = checkDailyStreakMilestone(30, 29, 0);
    expect(result).not.toBeNull();
    expect(result!.amber).toBe(100);
  });
});
