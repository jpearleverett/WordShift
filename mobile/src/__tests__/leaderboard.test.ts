import { DAILY_BOARD_VERSION } from '../services/dailyBoardVersion';
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

    test('submitDailyResult posts through the submit_daily_score RPC', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        okJson([{ owner: 'o', date: '2026-06-21', time_ms: 1001, stars: 3, hints: 1, handle: 'anon' }])
      );

      const owner = await getBackendIdentity();
      const r = await submitDailyResult({
        date: '2026-06-21',
        timeMs: 1000.7,
        stars: 3,
        hintsUsed: 1,
        handle: 'anon',
      });

      expect(r).toEqual({
        owner: 'o',
        date: '2026-06-21',
        time_ms: 1001,
        stars: 3,
        hints: 1,
        handle: 'anon',
      });
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://x.supabase.co/rest/v1/rpc/submit_daily_score_v2');
      expect(init.method).toBe('POST');
      const sent = JSON.parse(init.body);
      expect(sent.p_owner).toBe(owner);
      expect(sent.p_date).toBe('2026-06-21');
      expect(sent.p_board_version).toBe(DAILY_BOARD_VERSION);
      expect(sent.p_time_ms).toBe(1001); // rounded
      expect(sent.p_stars).toBe(3);
      expect(sent.p_hints).toBe(1);
      expect(sent.p_handle).toBe('anon');
    });

    test('a resumed legacy board keeps its original ranking cohort', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(okJson([]));
      await submitDailyResult({date:'2026-06-21',timeMs:100,stars:3,hintsUsed:0,boardVersion:'legacy_v1'});
      await getDailyRank('2026-06-21', 'legacy_v1');
      for(const [,init] of (global.fetch as jest.Mock).mock.calls) {
        expect(JSON.parse(init.body).p_board_version).toBe('legacy_v1');
      }
    });

    test('submitDailyResult clamps negatives and defaults handle to null', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        okJson([{ owner: 'o', date: '2026-06-21', time_ms: 0, stars: 0, hints: 0, handle: null }])
      );
      await submitDailyResult({ date: '2026-06-21', timeMs: -5, stars: -1, hintsUsed: -3 });
      const init = (global.fetch as jest.Mock).mock.calls[0][1];
      const sent = JSON.parse(init.body);
      expect(sent.p_time_ms).toBe(0);
      expect(sent.p_stars).toBe(0);
      expect(sent.p_hints).toBe(0);
      expect(sent.p_handle).toBeNull();
    });

    test('submitDailyResult returns null when the server rejects the score (empty RPC result)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(okJson([]));
      const r = await submitDailyResult({
        date: '2026-06-21',
        timeMs: 999999999, // absurd — server bounds-check rejects
        stars: 3,
        hintsUsed: 0,
      });
      expect(r).toBeNull();
    });

    test('getDailyRank uses the RPC result when present', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        okJson({ rank: 3, total: 100, percentile: 97 })
      );
      const r = await getDailyRank('2026-06-21');
      expect(r).toEqual({ rank: 3, total: 100, percentile: 97 });
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('/rest/v1/rpc/daily_rank_v2');
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

    test('a lone player beats 0% of others', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(okJson([{ rank: 1, total: 1 }]));
      const r = await getDailyRank('2026-06-21');
      expect(r).toEqual({ rank: 1, total: 1, percentile: 0 });
    });

    test('getDailyRank degrades to "no rank shown" (null) when the RPC is empty — NO table fallback', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(okJson(null));
      const r = await getDailyRank('2026-06-21');
      expect(r).toBeNull();
      // Exactly one request, and it was the RPC — never a daily_scores select.
      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toContain('/rest/v1/rpc/daily_rank_v2');
      expect(calls[0][0]).not.toContain('/rest/v1/daily_scores');
    });

    test('getDailyRank degrades to null when the RPC is missing (404) — never crashes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      await expect(getDailyRank('2026-06-21')).resolves.toBeNull();
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(1);
    });

    test('no leaderboard call ever enumerates the daily_scores table', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(okJson(null));
      await submitDailyResult({ date: '2026-06-21', timeMs: 1, stars: 1, hintsUsed: 0 });
      await getDailyRank('2026-06-21');
      for (const [url, init] of (global.fetch as jest.Mock).mock.calls) {
        expect(url).toContain('/rest/v1/rpc/');
        expect(url).not.toContain('/rest/v1/daily_scores');
        expect(init.method).toBe('POST');
      }
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
