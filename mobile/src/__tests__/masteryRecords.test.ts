jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

import {
  recordSolveTime,
  getSolveTrend,
  recordSpeedRound,
  getBestSpeedRound,
  getResonantChoices,
  recordResonantChoices,
  getUnbrokenWeaveMastery,
  invalidateMasteryCache,
  recordUnbrokenWeaveVictory,
  resolveUnbrokenWeaveMastery,
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

describe('resonant choices (lifetime mastery stat)', () => {
  test('starts at 0 and accumulates per-victory counts', async () => {
    expect(await getResonantChoices()).toBe(0);

    expect(await recordResonantChoices(2)).toBe(2);
    expect(await recordResonantChoices(3)).toBe(5);
    expect(await getResonantChoices()).toBe(5);
  });

  test('ignores non-positive and non-finite counts', async () => {
    await recordResonantChoices(4);
    expect(await recordResonantChoices(0)).toBe(4);
    expect(await recordResonantChoices(-2)).toBe(4);
    expect(await recordResonantChoices(Number.NaN)).toBe(4);
    expect(await getResonantChoices()).toBe(4);
  });

  test('persists across a cache drop (survives restart)', async () => {
    await recordResonantChoices(6);
    _clearMasteryCache();
    expect(await getResonantChoices()).toBe(6);
  });

  test('is migration-safe: an older stored shape defaults to 0', async () => {
    // A pre-resonance save: no resonantChoices field at all.
    await AsyncStorage.setItem(
      'wordshift_mastery',
      JSON.stringify({ solveTimes: {}, bestSpeedRound: 3 }),
    );
    _clearMasteryCache();
    expect(await getResonantChoices()).toBe(0);
    expect(await getBestSpeedRound()).toBe(3);
  });

  test('clearMasteryRecords resets the stat', async () => {
    await recordResonantChoices(9);
    await clearMasteryRecords();
    expect(await getResonantChoices()).toBe(0);
  });
});

describe('Unbroken Weave mastery', () => {
  test('loads pre-ladder mastery saves with empty compatible defaults', async () => {
    await AsyncStorage.setItem(
      'wordshift_mastery',
      JSON.stringify({ solveTimes: { HARD: [15000] }, bestSpeedRound: 4 }),
    );
    invalidateMasteryCache();

    expect(await getUnbrokenWeaveMastery()).toEqual({
      wins: 0,
      flawlessWins: 0,
      difficultyClears: [],
      hardFlawless: false,
      rank: 0,
      title: 'Unbroken Weave',
      nextObjective: 'Complete an Unbroken Weave.',
    });
    expect(await getBestSpeedRound()).toBe(4);
  });

  test.each([
    {
      name: 'Thread Joined',
      input: { wins: 1, flawlessWins: 0, difficultyClears: ['EASY'] as const, hardFlawless: false },
      rank: 1,
      nextObjective: 'Clear Unbroken Weave on every difficulty (1/4).',
    },
    {
      name: 'Fourfold Weave',
      input: {
        wins: 4,
        flawlessWins: 0,
        difficultyClears: ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'] as const,
        hardFlawless: false,
      },
      rank: 2,
      nextObjective: 'Complete a flawless HARD Unbroken Weave.',
    },
    {
      name: 'Seamless Dark',
      input: {
        wins: 4,
        flawlessWins: 1,
        difficultyClears: ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'] as const,
        hardFlawless: true,
      },
      rank: 3,
      nextObjective: 'Complete 10 flawless Unbroken Weaves (1/10).',
    },
    {
      name: 'Loomkeeper',
      input: {
        wins: 12,
        flawlessWins: 10,
        difficultyClears: ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'] as const,
        hardFlawless: true,
      },
      rank: 4,
      nextObjective: 'Complete 25 flawless Unbroken Weaves (10/25).',
    },
    {
      name: 'Patternbound',
      input: {
        wins: 27,
        flawlessWins: 25,
        difficultyClears: ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'] as const,
        hardFlawless: true,
      },
      rank: 5,
      nextObjective: null,
    },
  ])('resolves the $name rank in ladder order', ({ input, rank, name, nextObjective }) => {
    expect(resolveUnbrokenWeaveMastery(input)).toMatchObject({
      rank,
      title: name,
      nextObjective,
    });
  });

  test('does not skip ordered ranks when a later objective is already met', () => {
    expect(resolveUnbrokenWeaveMastery({
      wins: 10,
      flawlessWins: 10,
      difficultyClears: ['HARD'],
      hardFlawless: true,
    })).toMatchObject({ rank: 1, title: 'Thread Joined' });
  });

  test('records wins, unique difficulty clears, and flawless HARD once', async () => {
    const first = await recordUnbrokenWeaveVictory('EASY', false);
    expect(first.rankedUp).toBe(true);
    expect(first.mastery).toMatchObject({
      wins: 1,
      flawlessWins: 0,
      difficultyClears: ['EASY'],
      hardFlawless: false,
      rank: 1,
    });

    const duplicate = await recordUnbrokenWeaveVictory('EASY', false);
    expect(duplicate.rankedUp).toBe(false);
    expect(duplicate.mastery.difficultyClears).toEqual(['EASY']);

    const hard = await recordUnbrokenWeaveVictory('HARD', true);
    expect(hard.mastery).toMatchObject({
      wins: 3,
      flawlessWins: 1,
      difficultyClears: ['EASY', 'HARD'],
      hardFlawless: true,
    });
  });

  test('persists ladder fields without replacing existing mastery records', async () => {
    await recordSpeedRound(6);
    await recordUnbrokenWeaveVictory('MEDIUM_PLUS', true);
    _clearMasteryCache();

    expect(await getBestSpeedRound()).toBe(6);
    expect(await getUnbrokenWeaveMastery()).toMatchObject({
      wins: 1,
      flawlessWins: 1,
      difficultyClears: ['MEDIUM_PLUS'],
    });
  });

  test('invalidation reloads externally restored ladder state', async () => {
    await getUnbrokenWeaveMastery();
    await AsyncStorage.setItem(
      'wordshift_mastery',
      JSON.stringify({
        solveTimes: {},
        bestSpeedRound: 0,
        unbrokenWeaveWins: 7,
        unbrokenWeaveFlawlessWins: 2,
        unbrokenWeaveDifficultyClears: ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD', 'HARD'],
        unbrokenWeaveHardFlawless: true,
      }),
    );
    invalidateMasteryCache();

    expect(await getUnbrokenWeaveMastery()).toMatchObject({
      wins: 7,
      flawlessWins: 2,
      difficultyClears: ['EASY', 'MEDIUM', 'MEDIUM_PLUS', 'HARD'],
      hardFlawless: true,
      rank: 3,
    });
  });

  test('clearMasteryRecords resets ladder progress for Reset All', async () => {
    await recordUnbrokenWeaveVictory('HARD', true);
    await clearMasteryRecords();

    expect(await getUnbrokenWeaveMastery()).toMatchObject({
      wins: 0,
      flawlessWins: 0,
      difficultyClears: [],
      hardFlawless: false,
      rank: 0,
    });
    expect(await AsyncStorage.getItem('wordshift_mastery')).toBeNull();
  });
});
