jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

import {
  recordDailyLadderResult,
  getDailyLadderSummary,
  getDailyLadderHistory,
  clearDailyLadder,
  _clearDailyLadderCache,
  DailyLadderEntry,
} from '../services/dailyLadder';
import { getLocalDateString, getLocalDateStringDaysAgo } from '../services/dateUtils';

const AsyncStorage = require('@react-native-async-storage/async-storage').default;
const STORAGE_KEY = 'wordshift_daily_ladder';

function entry(overrides: Partial<DailyLadderEntry> & { date: string }): DailyLadderEntry {
  return {
    rank: null,
    percentile: null,
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
  test('records and persists an entry', async () => {
    await recordDailyLadderResult(entry({ date: getLocalDateString(), rank: 4, percentile: 88 }));
    const history = await getDailyLadderHistory();
    expect(history).toHaveLength(1);
    expect(history[0].rank).toBe(4);
    expect(await AsyncStorage.getItem(STORAGE_KEY)).not.toBeNull();
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

describe('clearDailyLadder', () => {
  test('empties history and cache', async () => {
    await recordDailyLadderResult(entry({ date: getLocalDateString(), rank: 1, percentile: 99 }));
    await clearDailyLadder();
    const s = await getDailyLadderSummary();
    expect(s.participationCount).toBe(0);
    expect(await getDailyLadderHistory()).toHaveLength(0);
  });
});
