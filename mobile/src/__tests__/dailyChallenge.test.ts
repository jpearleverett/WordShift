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
import { selectDailyBankPuzzle } from '../services/puzzleBank';
import { FIRST_DAILY_BONUS_HINTS } from '../constants/gameBalance';
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

// The daily is served from the REAL shipped banks — that is the whole point of
// the fix, so the bank is deliberately not stubbed. It is only wrapped so the
// caching/prewarm tests can count resolutions.
jest.mock('../services/puzzleBank', () => {
  const actual = jest.requireActual('../services/puzzleBank');
  return {
    ...actual,
    selectDailyBankPuzzle: jest.fn(actual.selectDailyBankPuzzle),
  };
});

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

  test('daily difficulty ramps across the week (gentle Mon -> Sunday peak, softened weekend)', () => {
    // 2026-02-09 is a Monday; step through the week (local-component dates).
    // Casual-fit ramp: two HARD anchors (Thu, Sat) plus the Sunday peak; the
    // old ALL-HARD Thu-Sun block read as a wall to a casual player's weekend.
    expect(getDailyDifficulty('2026-02-09')).toBe('MEDIUM');       // Mon
    expect(getDailyDifficulty('2026-02-10')).toBe('MEDIUM_PLUS');  // Tue
    expect(getDailyDifficulty('2026-02-11')).toBe('MEDIUM_PLUS');  // Wed
    expect(getDailyDifficulty('2026-02-12')).toBe('HARD');         // Thu — first anchor
    expect(getDailyDifficulty('2026-02-13')).toBe('MEDIUM_PLUS');  // Fri — breather
    expect(getDailyDifficulty('2026-02-14')).toBe('HARD');         // Sat — second anchor
    expect(getDailyDifficulty('2026-02-15')).toBe('HARD');         // Sun — the peak
  });

  test('daily ramp is deterministic by date (same puzzle shape for everyone)', () => {
    // Sunday is the ONLY 6-letter/5-row peak (Saturday softened to 5 letters).
    expect(getDailyRamp('2026-02-15')).toEqual({ difficulty: 'HARD', wordLength: 6, targetRows: 5 });
    expect(getDailyRamp('2026-02-14')).toEqual({ difficulty: 'HARD', wordLength: 5, targetRows: 5 });
    // Friday is a genuine breather between the two HARD anchors.
    expect(getDailyRamp('2026-02-13')).toEqual({ difficulty: 'MEDIUM_PLUS', wordLength: 5, targetRows: 4 });
    // Monday is accessible: 4-letter / 4-row MEDIUM.
    expect(getDailyRamp('2026-02-09')).toEqual({ difficulty: 'MEDIUM', wordLength: 4, targetRows: 4 });
  });

  test('only Sunday carries a 6-letter board (the weekend wall is gone)', () => {
    // Mon 2026-02-09 .. Sun 2026-02-15.
    const week = ['2026-02-09', '2026-02-10', '2026-02-11', '2026-02-12', '2026-02-13', '2026-02-14', '2026-02-15'];
    const sixLetterDays = week.filter(d => getDailyRamp(d).wordLength === 6);
    expect(sixLetterDays).toEqual(['2026-02-15']);
    // And no more than three HARD days a week.
    const hardDays = week.filter(d => getDailyRamp(d).difficulty === 'HARD');
    expect(hardDays).toEqual(['2026-02-12', '2026-02-14', '2026-02-15']);
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

  test('a midnight-crossing board belongs to yesterday and leaves today available', async () => {
    const yesterday = getLocalDateStringDaysAgo(1);
    const result = await recordDailyCompletion(3, 0, 0, yesterday);
    expect(result.lastCompletedDate).toBe(yesterday);
    expect((await getDailyStatus()).isCompleted).toBe(false);
    await recordDailyCompletion(3, 0, 0);
    expect(await getDailyStatus()).toMatchObject({ isCompleted: true, totalCompleted: 2, streak: 2 });
    await recordDailyCompletion(3, 0, 0, yesterday);
    expect((await getDailyStatus()).totalCompleted).toBe(2);
  });

  test('expired or future boards cannot consume today or rewind its streak', async () => {
    await recordDailyCompletion(3, 0, 0, getLocalDateStringDaysAgo(2));
    await recordDailyCompletion(3, 0, 0, getLocalDateStringDaysAgo(-1));
    expect((await getDailyStatus()).totalCompleted).toBe(0);
    await recordDailyCompletion(3, 0, 0);
    await recordDailyCompletion(3, 0, 0, getLocalDateStringDaysAgo(1));
    expect(await getDailyStatus()).toMatchObject({ totalCompleted: 1, streak: 1 });
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

  test('streakDecayedTo flows out of the recordDailyCompletion return, then clears on a normal continuation', async () => {
    // The UI contract: App reads recordDailyCompletion's returned progress and
    // surfaces streakDecayedTo via phaseNarrative.getStreakHeldMessage (the
    // "your streak held at N" beat, wave-2 wiring). The service must set it on
    // a decay-to-milestone completion and leave it undefined otherwise.
    const p = await loadDailyProgress();
    p.currentStreak = 8; // past the 7-day milestone
    p.streakFreezes = 0;
    p.lastFreezeGrantDate = getLocalDateStringDaysAgo(1);
    p.lastCompletedDate = getLocalDateStringDaysAgo(4); // multi-day lapse, no freeze
    const decayed = await recordDailyCompletion(3, 0, 0);
    expect(decayed.currentStreak).toBe(7);
    expect(decayed.streakDecayedTo).toBe(7);

    // Next day: an ordinary yesterday-continuation must not re-report a decay.
    const p2 = await loadDailyProgress();
    p2.lastCompletedDate = getLocalDateStringDaysAgo(1);
    // Move the prior result too: a fixture changing only lastCompletedDate
    // still represents today already completed under the date identity guard.
    p2.completedChallenges[p2.completedChallenges.length - 1].date = getLocalDateStringDaysAgo(1);
    const next = await recordDailyCompletion(3, 0, 0);
    expect(next.currentStreak).toBe(8);
    expect(next.streakDecayedTo).toBeUndefined();
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
  const bankPick = selectDailyBankPuzzle as jest.Mock;

  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    await clearDailyProgress();
    bankPick.mockClear();
  });

  test('memoizes today\'s puzzle — a repeat call does not re-resolve', async () => {
    const first = await generateDailyPuzzle();
    const second = await generateDailyPuzzle();
    expect(second).toEqual(first);
    expect(bankPick).toHaveBeenCalledTimes(1);
  });

  test('threads the stored bank solution through DailyPuzzleData (stored-step daily hints)', async () => {
    const daily = await generateDailyPuzzle();
    expect(Array.isArray(daily.solution)).toBe(true);
    expect(daily.solution!.length).toBe(daily.words.length - 1);
    expect(daily.solution![0].sourceWord).toBe(daily.words[0]);
  });

  test('prewarm resolves the puzzle ahead of time so the next call is cached', async () => {
    prewarmDailyPuzzle();
    // Let the fire-and-forget resolution settle.
    await Promise.resolve();
    await generateDailyPuzzle();
    expect(bankPick).toHaveBeenCalledTimes(1);
  });

  test('clearDailyProgress drops the cached puzzle', async () => {
    await generateDailyPuzzle();
    await clearDailyProgress();
    await generateDailyPuzzle();
    expect(bankPick).toHaveBeenCalledTimes(2);
  });
});

// The daily's one promise is that everyone is solving the same board. It used
// to be resolved by a global-Math.random-override generation that yielded to
// the event loop for up to 2.5s, read the player's own word history and dread
// phase, and gave up on a wall clock — three independent ways for two devices
// to land on different chains while the share grid and the leaderboard both
// insisted otherwise. These are the locks on the fix.
describe('daily board determinism', () => {
  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    await clearDailyProgress();
  });

  test('same date resolves to the same chain even with a concurrent Math.random consumer', async () => {
    const first = await generateDailyPuzzle();

    await clearDailyProgress();
    // The exact interleaving that used to steal the seeded stream: animals
    // wandering, particles, confetti — all burning Math.random values during
    // the resolution window.
    const thief = setInterval(() => { Math.random(); Math.random(); Math.random(); }, 1);
    let second;
    try {
      second = await generateDailyPuzzle();
    } finally {
      clearInterval(thief);
    }

    expect(second.words).toEqual(first.words);
    expect(second.solution).toEqual(first.solution);
  });

  test('never replaces the global Math.random', async () => {
    const original = Math.random;
    const pending = generateDailyPuzzle();
    expect(Math.random).toBe(original);
    await pending;
    expect(Math.random).toBe(original);
  });

  test('selectDailyBankPuzzle is a pure function of (difficulty, roll)', () => {
    const actual = jest.requireActual('../services/puzzleBank');
    const a = actual.selectDailyBankPuzzle('MEDIUM', 0.42);
    const b = actual.selectDailyBankPuzzle('MEDIUM', 0.42);
    expect(a).not.toBeNull();
    expect(b!.words).toEqual(a!.words);
    // A different draw must be able to land elsewhere in the bank.
    const c = actual.selectDailyBankPuzzle('MEDIUM', 0.91);
    expect(c!.words).not.toEqual(a!.words);
    // Out-of-range / non-finite rolls still land on a real board.
    expect(actual.selectDailyBankPuzzle('MEDIUM', 1)).not.toBeNull();
    expect(actual.selectDailyBankPuzzle('MEDIUM', NaN)).not.toBeNull();
  });

  test('the served board matches the day\'s ramp SHAPE', async () => {
    const daily = await generateDailyPuzzle();
    const ramp = getDailyRamp(getTodayString(), daily.eased === true);
    expect(daily.wordLength).toBe(ramp.wordLength);
    expect(daily.words.length).toBe(ramp.targetRows);
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
