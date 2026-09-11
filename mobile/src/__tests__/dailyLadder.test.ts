jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

import {
  recordDailyLadderResult,
  getDailyLadderSummary,
  getDailyLadderHistory,
  clearDailyLadder,
  _clearDailyLadderCache,
  shouldShowTrend,
  DailyLadderEntry,
  DailyLadderSummary,
  refreshDailyLadderRank,
} from '../services/dailyLadder';
import { getLocalDateString, getLocalDateStringDaysAgo } from '../services/dateUtils';

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const STORAGE_KEY = 'wordshift_daily_ladder';

// Default to a healthy board (well past DAILY_PERCENTILE_MIN_ENTRANTS) so the
// percentile statistics are exercised; thin and unknown-size days pass `total`
// explicitly.
function entry(overrides: Partial<DailyLadderEntry> & { date: string }): DailyLadderEntry {
  return {
    rank: null,
    percentile: null,
    total: 40,
    timeMs: 30000,
    stars: 3,
    difficulty: 'HARD',
    ...overrides,
  };
}

beforeEach(async () => {
  AsyncStorage.clear();
  await clearDailyLadder();
  _clearDailyLadderCache();
});

describe('recordDailyLadderResult', () => {
  test('refreshes a provisional standing without losing solve fields or duplicating participation', async () => {
    const date = getLocalDateString();
    await recordDailyLadderResult(entry({ date, timeMs: 42000, resonantChoiceCount: 2 }));
    expect(await refreshDailyLadderRank(date, { rank: 5, percentile: 80 })).toBe(true);
    expect((await getDailyLadderHistory())[0]).toMatchObject({ date, timeMs: 42000, resonantChoiceCount: 2, rank: 5, percentile: 80 });
    await refreshDailyLadderRank(date, { rank: 10, percentile: 70 });
    expect((await getDailyLadderSummary()).participationCount).toBe(1);
    expect((await getDailyLadderSummary()).bestRankEver).toBe(10);
  });

  test('never creates a result or ranks an eased practice board on refresh', async () => {
    const date = getLocalDateString();
    expect(await refreshDailyLadderRank(date, { rank: 1, percentile: 100 })).toBe(false);
    await recordDailyLadderResult(entry({ date, rankEligible: false }));
    expect(await refreshDailyLadderRank(date, { rank: 1, percentile: 100 })).toBe(false);
  });

  test('keeps lifetime count and archived best after 121 days and a reload', async () => {
    const oldDate = getLocalDateStringDaysAgo(120);
    await recordDailyLadderResult(entry({ date: oldDate, rank: 1, percentile: 99 }));
    for (let ago = 119; ago >= 0; ago--) {
      await recordDailyLadderResult(entry({ date: getLocalDateStringDaysAgo(ago), rank: 50, percentile: 60 }));
    }
    _clearDailyLadderCache();
    expect((await getDailyLadderHistory())).toHaveLength(120);
    expect(await getDailyLadderSummary()).toMatchObject({ participationCount: 121, bestRankEver: 1, bestPercentileEver: 99 });
    await recordDailyLadderResult(entry({ date: oldDate }));
    expect((await getDailyLadderSummary()).participationCount).toBe(121);
  });
  test('records and persists an entry', async () => {
    await recordDailyLadderResult(entry({ date: getLocalDateString(), rank: 4, percentile: 88 }));
    const history = await getDailyLadderHistory();
    expect(history).toHaveLength(1);
    expect(history[0].rank).toBe(4);
    expect(await AsyncStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  test('stores resonantChoiceCount only when a positive count exists (spoiler-safe, default absent)', async () => {
    const today = getLocalDateString();
    await recordDailyLadderResult(entry({ date: today, resonantChoiceCount: 2 }));
    let history = await getDailyLadderHistory();
    expect(history[0].resonantChoiceCount).toBe(2);
    // Spoiler-safety: a count only — no words ride along on the entry.
    expect(Object.keys(history[0])).not.toContain('words');

    // Zero / absent counts stay absent (older entries look identical).
    await recordDailyLadderResult(entry({ date: today, resonantChoiceCount: 0 }));
    history = await getDailyLadderHistory();
    expect('resonantChoiceCount' in history[0]).toBe(false);

    await recordDailyLadderResult(entry({ date: today }));
    history = await getDailyLadderHistory();
    expect('resonantChoiceCount' in history[0]).toBe(false);
  });

  test('upserts by date (offline record then online patch = one entry)', async () => {
    const today = getLocalDateString();
    await recordDailyLadderResult(entry({ date: today, rank: null, percentile: null }));
    await recordDailyLadderResult(entry({ date: today, rank: 5, percentile: 90 }));
    const history = await getDailyLadderHistory();
    expect(history).toHaveLength(1);
    expect(history[0].rank).toBe(5);
    expect(history[0].percentile).toBe(90);
  });

  test('caps history at 120 newest entries', async () => {
    for (let i = 130; i >= 1; i--) {
      await recordDailyLadderResult(entry({ date: getLocalDateStringDaysAgo(i) }));
    }
    const history = await getDailyLadderHistory();
    expect(history).toHaveLength(120);
    // Oldest 10 dropped; array is chronological (oldest first).
    expect(history[0].date).toBe(getLocalDateStringDaysAgo(120));
  });
});

describe('getDailyLadderSummary', () => {
  test('week window uses only the last 7 local days; ever uses all', async () => {
    await recordDailyLadderResult(entry({ date: getLocalDateString(), rank: 10, percentile: 70 }));
    await recordDailyLadderResult(entry({ date: getLocalDateStringDaysAgo(3), rank: 4, percentile: 85 }));
    await recordDailyLadderResult(entry({ date: getLocalDateStringDaysAgo(9), rank: 2, percentile: 95 }));
    const s = await getDailyLadderSummary();
    expect(s.bestRankThisWeek).toBe(4); // today(10) + 3-days-ago(4); 9-days-ago excluded
    expect(s.bestPercentileThisWeek).toBe(85);
    expect(s.bestRankEver).toBe(2); // includes the 9-days-ago entry
    expect(s.bestPercentileEver).toBe(95);
    expect(s.participationCount).toBe(3);
  });

  test('offline (no ranks) yields participation only, no rank bests', async () => {
    await recordDailyLadderResult(entry({ date: getLocalDateString() }));
    await recordDailyLadderResult(entry({ date: getLocalDateStringDaysAgo(1) }));
    const s = await getDailyLadderSummary();
    expect(s.bestRankThisWeek).toBeNull();
    expect(s.bestRankEver).toBeNull();
    expect(s.bestPercentileEver).toBeNull();
    expect(s.participationCount).toBe(2);
  });

  test('trend is up/down over the last two RANKED days, null with < 2', async () => {
    await recordDailyLadderResult(entry({ date: getLocalDateStringDaysAgo(2), rank: 8, percentile: 60 }));
    expect((await getDailyLadderSummary()).trend).toBeNull();
    await recordDailyLadderResult(entry({ date: getLocalDateStringDaysAgo(1), rank: 4, percentile: 80 }));
    expect((await getDailyLadderSummary()).trend).toBe('up');
    await recordDailyLadderResult(entry({ date: getLocalDateString(), rank: 12, percentile: 55 }));
    expect((await getDailyLadderSummary()).trend).toBe('down');
  });

  test('an unranked (offline) day between ranked days does not poison the trend', async () => {
    await recordDailyLadderResult(entry({ date: getLocalDateStringDaysAgo(2), rank: 6, percentile: 70 }));
    await recordDailyLadderResult(entry({ date: getLocalDateStringDaysAgo(1), rank: null, percentile: null }));
    await recordDailyLadderResult(entry({ date: getLocalDateString(), rank: 3, percentile: 90 }));
    // Compares the two RANKED days (70 -> 90) = up, ignoring the null day.
    expect((await getDailyLadderSummary()).trend).toBe('up');
  });
});

describe('thin-board days never poison the percentile statistics', () => {
  test('a solo day contributes its rank but not its 0% to the week/ever bests or the trend', async () => {
    // The demoralising case: the player is the only entrant, so the backend's
    // "percent of OTHERS beaten" is a hard 0 by construction.
    await recordDailyLadderResult(
      entry({ date: getLocalDateString(), rank: 1, percentile: 0, total: 1 }),
    );
    const s = await getDailyLadderSummary();
    // The rank is factually true and stays.
    expect(s.bestRankThisWeek).toBe(1);
    expect(s.bestRankEver).toBe(1);
    // The percentile is meaningless at this board size and must not stick.
    expect(s.bestPercentileThisWeek).toBeNull();
    expect(s.bestPercentileEver).toBeNull();
    expect(s.trend).toBeNull();
    expect(s.participationCount).toBe(1);
  });

  test('a run of solo days cannot pin the trend at flat/Holding', async () => {
    for (const ago of [2, 1, 0]) {
      await recordDailyLadderResult(
        entry({ date: getLocalDateStringDaysAgo(ago), rank: 1, percentile: 0, total: 1 }),
      );
    }
    expect((await getDailyLadderSummary()).trend).toBeNull();
  });

  test('a real board still sets the week best beside solo days', async () => {
    await recordDailyLadderResult(
      entry({ date: getLocalDateStringDaysAgo(1), rank: 1, percentile: 0, total: 2 }),
    );
    await recordDailyLadderResult(
      entry({ date: getLocalDateString(), rank: 9, percentile: 64, total: 25 }),
    );
    const s = await getDailyLadderSummary();
    expect(s.bestRankThisWeek).toBe(1); // rank statistics unchanged
    expect(s.bestPercentileThisWeek).toBe(64);
    expect(s.bestPercentileEver).toBe(64);
  });

  test('an entry stored before entrant counts existed is treated as unknown, not as fine', async () => {
    // A legacy save could have been a solo day; it is excluded from percentile
    // statistics rather than assumed meaningful.
    await recordDailyLadderResult(
      entry({ date: getLocalDateString(), rank: 3, percentile: 88, total: null }),
    );
    const history = await getDailyLadderHistory();
    expect('total' in history[0]).toBe(false);
    const s = await getDailyLadderSummary();
    expect(s.bestRankThisWeek).toBe(3);
    expect(s.bestPercentileThisWeek).toBeNull();
    expect(s.bestPercentileEver).toBeNull();
  });

  test('a re-check carries the fresh entrant count onto the stored entry', async () => {
    const date = getLocalDateString();
    await recordDailyLadderResult(entry({ date, rank: 1, percentile: 0, total: 1 }));
    expect((await getDailyLadderSummary()).bestPercentileThisWeek).toBeNull();
    // Later in the day the board filled up and the standing was re-checked.
    expect(await refreshDailyLadderRank(date, { rank: 3, percentile: 75, total: 9 })).toBe(true);
    const s = await getDailyLadderSummary();
    expect(s.bestPercentileThisWeek).toBe(75);
    expect((await getDailyLadderHistory())[0].total).toBe(9);
  });

  test('an archived solo day never becomes the lifetime percentile best', async () => {
    // The oldest day falls out of the 120-entry window and is folded into the
    // archived bests; a solo day must not travel there either.
    await recordDailyLadderResult(
      entry({ date: getLocalDateStringDaysAgo(120), rank: 1, percentile: 0, total: 1 }),
    );
    for (let ago = 119; ago >= 0; ago--) {
      await recordDailyLadderResult(
        entry({ date: getLocalDateStringDaysAgo(ago), rank: 50, percentile: 60, total: 30 }),
      );
    }
    _clearDailyLadderCache();
    const s = await getDailyLadderSummary();
    expect(s.bestRankEver).toBe(1);
    expect(s.bestPercentileEver).toBe(60);
  });
});

describe('shouldShowTrend (placement trend only rides a placement line)', () => {
  test('false when the week window has no ranked days (the offline-lapsed case)', async () => {
    // All ranked days are >1 week old; today is played OFFLINE (no rank).
    await recordDailyLadderResult(entry({ date: getLocalDateStringDaysAgo(15), rank: 8, percentile: 50 }));
    await recordDailyLadderResult(entry({ date: getLocalDateStringDaysAgo(10), rank: 4, percentile: 90 }));
    await recordDailyLadderResult(entry({ date: getLocalDateString(), rank: null, percentile: null }));
    const s = await getDailyLadderSummary();
    // The global trend still computes ('up' over the two old ranked days)...
    expect(s.trend).toBe('up');
    // ...but there is no week-scoped placement, so the card shows the
    // participation fallback and the trend must NOT ride it.
    expect(s.bestRankThisWeek).toBeNull();
    expect(s.bestPercentileThisWeek).toBeNull();
    expect(s.participationCount).toBe(3);
    expect(shouldShowTrend(s)).toBe(false);
  });

  test('true when a week-scoped placement exists', () => {
    const base: DailyLadderSummary = {
      participationCount: 3, bestRankThisWeek: null, bestPercentileThisWeek: null,
      bestRankEver: 2, bestPercentileEver: 95, trend: 'up', latest: null,
    };
    expect(shouldShowTrend(base)).toBe(false);
    expect(shouldShowTrend({ ...base, bestRankThisWeek: 4 })).toBe(true);
    expect(shouldShowTrend({ ...base, bestPercentileThisWeek: 80 })).toBe(true);
  });
});

describe('clearDailyLadder', () => {
  test('empties history and cache', async () => {
    await recordDailyLadderResult(entry({ date: getLocalDateString(), rank: 1, percentile: 99 }));
    await clearDailyLadder();
    const s = await getDailyLadderSummary();
    expect(s.participationCount).toBe(0);
    expect(await getDailyLadderHistory()).toHaveLength(0);
  });
});
