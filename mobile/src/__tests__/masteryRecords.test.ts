jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

import {
  recordSolveTime,
  getSolveTrend,
  recordSpeedRound,
  getBestSpeedRound,
  clearMasteryRecords,
  _clearMasteryCache,
} from '../services/masteryRecords';

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

beforeEach(async () => {
  AsyncStorage.clear();
  await clearMasteryRecords();
  _clearMasteryCache();
});

describe('solve-time trend', () => {
  test('returns null before enough samples', async () => {
    await recordSolveTime('MEDIUM', 20000);
    await recordSolveTime('MEDIUM', 21000);
    expect(await getSolveTrend('MEDIUM')).toBeNull();
  });

  test('reports improving when the recent median is much faster', async () => {
    // 8 slow older solves, then 4 fast recent ones.
    for (let i = 0; i < 8; i++) await recordSolveTime('HARD', 30000);
    for (let i = 0; i < 4; i++) await recordSolveTime('HARD', 12000);
    const trend = await getSolveTrend('HARD');
    expect(trend).not.toBeNull();
    expect(trend!.improving).toBe(true);
    expect(trend!.recentMedianMs).toBeLessThan(trend!.olderMedianMs);
  });

  test('does NOT report improving when times are flat', async () => {
    for (let i = 0; i < 12; i++) await recordSolveTime('EASY', 15000);
    const trend = await getSolveTrend('EASY');
    expect(trend!.improving).toBe(false);
  });

  test('drops implausible durations (AFK / restore glitches)', async () => {
    for (let i = 0; i < 12; i++) await recordSolveTime('MEDIUM', 15000);
    await recordSolveTime('MEDIUM', 100); // sub-second — ignored
    await recordSolveTime('MEDIUM', 60 * 60 * 1000); // an hour — ignored
    const trend = await getSolveTrend('MEDIUM');
    // Only the 12 legit samples counted (window caps at 30, none dropped).
    expect(trend!.samples).toBe(12);
  });

  test('window caps at 30 newest samples', async () => {
    for (let i = 0; i < 40; i++) await recordSolveTime('MEDIUM', 15000 + i);
    const trend = await getSolveTrend('MEDIUM');
    expect(trend!.samples).toBe(30);
  });
});

describe('best speed round', () => {
  test('remembers the peak and reports new records', async () => {
    expect(await getBestSpeedRound()).toBe(0);

    let res = await recordSpeedRound(3);
    expect(res).toEqual({ best: 3, isNewRecord: true });

    res = await recordSpeedRound(2); // lower — not a record
    expect(res).toEqual({ best: 3, isNewRecord: false });

    res = await recordSpeedRound(5); // new peak
    expect(res).toEqual({ best: 5, isNewRecord: true });

    expect(await getBestSpeedRound()).toBe(5);
  });

  test('clearMasteryRecords resets both records', async () => {
    await recordSpeedRound(7);
    for (let i = 0; i < 12; i++) await recordSolveTime('HARD', 20000);
    await clearMasteryRecords();
    expect(await getBestSpeedRound()).toBe(0);
    expect(await getSolveTrend('HARD')).toBeNull();
  });
});
