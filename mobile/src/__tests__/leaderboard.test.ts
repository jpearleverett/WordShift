import AsyncStorage from '@react-native-async-storage/async-storage';

// Mutable expo-config extra so we can toggle configured/unconfigured per test.
let mockExtra: Record<string, unknown> = {};
jest.mock('expo-constants', () => ({
  default: {
    get expoConfig() {
      return { extra: mockExtra, version: '1.0.0' };
    },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

import {
  submitDailyResult,
  getDailyRank,
  getBeatPercentText,
  DailyScoreRow,
} from '../services/leaderboard';
import { getBackendIdentity } from '../services/supabaseClient';

const CONFIGURED = {
  supabaseUrl: 'https://x.supabase.co',
  supabaseAnonKey: 'anon-key',
};

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

describe('leaderboard', () => {
  beforeEach(() => {
    (AsyncStorage.clear as jest.Mock)();
    mockExtra = {};
    (global as Record<string, unknown>).fetch = jest.fn();
  });

  afterEach(() => {
    delete (global as Record<string, unknown>).fetch;
  });

  describe('unconfigured: full no-op, no network', () => {
    test('submitDailyResult returns null and never fetches', async () => {
      const r = await submitDailyResult({
        date: '2026-06-21',
        timeMs: 1000,
        stars: 3,
        hintsUsed: 0,
      });
      expect(r).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('getDailyRank returns null and never fetches', async () => {
      const r = await getDailyRank('2026-06-21');
      expect(r).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('configured', () => {
    beforeEach(() => {
      mockExtra = { ...CONFIGURED };
    });

    test('submitDailyResult posts an upsert keyed on owner,date', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        okJson([{ owner: 'o', date: '2026-06-21', time_ms: 1000, stars: 3, hints: 0 }])
      );

      const owner = await getBackendIdentity();
      const r = await submitDailyResult({
        date: '2026-06-21',
        timeMs: 1000.7,
        stars: 3,
        hintsUsed: 1,
        handle: 'anon',
      });

      expect(r).not.toBeNull();
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('/rest/v1/daily_scores');
      expect(url).toContain('on_conflict=owner%2Cdate');
      expect(init.method).toBe('POST');
      expect(init.headers.Prefer).toContain('resolution=merge-duplicates');
      const sent = JSON.parse(init.body);
      expect(sent.owner).toBe(owner);
      expect(sent.date).toBe('2026-06-21');
      expect(sent.time_ms).toBe(1001); // rounded
      expect(sent.stars).toBe(3);
      expect(sent.hints).toBe(1);
      expect(sent.handle).toBe('anon');
    });

    test('submitDailyResult clamps negatives and defaults handle to null', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(okJson([]));
      await submitDailyResult({ date: '2026-06-21', timeMs: -5, stars: -1, hintsUsed: -3 });
      const init = (global.fetch as jest.Mock).mock.calls[0][1];
      const sent = JSON.parse(init.body);
      expect(sent.time_ms).toBe(0);
      expect(sent.stars).toBe(0);
      expect(sent.hints).toBe(0);
      expect(sent.handle).toBeNull();
    });

    test('getDailyRank uses the RPC result when present', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        okJson({ rank: 3, total: 100, percentile: 97 })
      );
      const r = await getDailyRank('2026-06-21');
      expect(r).toEqual({ rank: 3, total: 100, percentile: 97 });
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('/rest/v1/rpc/daily_rank');
      // RPC succeeded → no fallback select.
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(1);
    });

    test('getDailyRank accepts an RPC row returned as a single-element array', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        okJson([{ rank: 1, total: 10 }])
      );
      const r = await getDailyRank('2026-06-21');
      // percentile derived: rank 1 of 10 beats all 9 others → 100%.
      expect(r).toEqual({ rank: 1, total: 10, percentile: 100 });
    });

    test('getDailyRank falls back to client-side ranking when RPC is empty', async () => {
      const owner = await getBackendIdentity();
      const rows: DailyScoreRow[] = [
        { owner: 'a', date: '2026-06-21', time_ms: 500, stars: 3, hints: 0 },
        { owner: 'b', date: '2026-06-21', time_ms: 800, stars: 3, hints: 0 },
        { owner, date: '2026-06-21', time_ms: 1200, stars: 3, hints: 0 },
        { owner: 'd', date: '2026-06-21', time_ms: 2000, stars: 2, hints: 1 },
      ];
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(okJson(null)) // RPC absent/empty
        .mockResolvedValueOnce(okJson(rows)); // fallback select

      const r = await getDailyRank('2026-06-21');
      // 2 players strictly better → rank 3 of 4.
      // beaten = 1 (player d), of 3 others → 33%.
      expect(r).toEqual({ rank: 3, total: 4, percentile: 33 });
      const [, secondUrl] = (global.fetch as jest.Mock).mock.calls.map((c) => c[0]);
      expect(secondUrl).toContain('/rest/v1/daily_scores');
      expect(secondUrl).toContain('date=eq.2026-06-21');
    });

    test('client-side tie-break: more stars beats slower-by-stars at equal time', async () => {
      const owner = await getBackendIdentity();
      const rows: DailyScoreRow[] = [
        { owner: 'a', date: 'd', time_ms: 1000, stars: 3, hints: 0 }, // better (more stars)
        { owner, date: 'd', time_ms: 1000, stars: 2, hints: 0 },
      ];
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(okJson(null))
        .mockResolvedValueOnce(okJson(rows));
      const r = await getDailyRank('d');
      expect(r).toEqual({ rank: 2, total: 2, percentile: 0 });
    });

    test('getDailyRank returns null when the player has no row in fallback', async () => {
      const rows: DailyScoreRow[] = [
        { owner: 'someone', date: 'd', time_ms: 500, stars: 3, hints: 0 },
      ];
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(okJson(null))
        .mockResolvedValueOnce(okJson(rows));
      const r = await getDailyRank('d');
      expect(r).toBeNull();
    });

    test('getDailyRank returns null when there is no data at all', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(okJson(null))
        .mockResolvedValueOnce(okJson([]));
      const r = await getDailyRank('d');
      expect(r).toBeNull();
    });
  });

  describe('percentile math (via lone-player RPC and fallback)', () => {
    beforeEach(() => {
      mockExtra = { ...CONFIGURED };
    });

    test('a lone player beats 0% of others', async () => {
      const owner = await getBackendIdentity();
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce(okJson(null))
        .mockResolvedValueOnce(
          okJson([{ owner, date: 'd', time_ms: 100, stars: 3, hints: 0 }])
        );
      const r = await getDailyRank('d');
      expect(r).toEqual({ rank: 1, total: 1, percentile: 0 });
    });
  });

  describe('getBeatPercentText (spoiler-safe, phase-aware tone)', () => {
    test('bright phases use friendly "beat" copy', () => {
      expect(getBeatPercentText(72, 0)).toBe('You beat 72% of seekers today');
      expect(getBeatPercentText(72, 1)).toBe('You beat 72% of seekers today');
    });

    test('mid phases shift tone but stay spoiler-safe', () => {
      expect(getBeatPercentText(72, 2)).toBe('You outpaced 72% of seekers today');
      expect(getBeatPercentText(72, 3)).toBe('You outpaced 72% of seekers today');
    });

    test('late phases use the gathered framing', () => {
      expect(getBeatPercentText(72, 4)).toContain('72%');
      expect(getBeatPercentText(72, 4)).toContain('gathered');
    });

    test('clamps out-of-range percentiles', () => {
      expect(getBeatPercentText(150, 0)).toBe('You beat 100% of seekers today');
      expect(getBeatPercentText(-10, 0)).toBe('You beat 0% of seekers today');
    });
  });
});
