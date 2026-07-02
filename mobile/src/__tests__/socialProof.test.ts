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
  recordPuzzleContribution,
  getAggregateProof,
  getWordsOfferedText,
  getActiveSeekersText,
  SOCIAL_PROOF_MIN_WORDS,
} from '../services/socialProof';

const CONFIGURED = {
  supabaseUrl: 'https://x.supabase.co',
  supabaseAnonKey: 'anon-key',
};

function okJson(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

describe('socialProof', () => {
  beforeEach(() => {
    (AsyncStorage.clear as jest.Mock)();
    mockExtra = {};
    (global as Record<string, unknown>).fetch = jest.fn();
  });

  afterEach(() => {
    delete (global as Record<string, unknown>).fetch;
  });

  describe('unconfigured: full no-op, no network', () => {
    test('recordPuzzleContribution returns null and never fetches', async () => {
      expect(await recordPuzzleContribution(5)).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('getAggregateProof returns null and never fetches', async () => {
      expect(await getAggregateProof()).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('configured', () => {
    beforeEach(() => {
      mockExtra = { ...CONFIGURED };
    });

    test('recordPuzzleContribution bumps the counter via RPC', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(okJson(12408));
      const total = await recordPuzzleContribution(7);
      expect(total).toBe(12408);
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('/rest/v1/rpc/bump_words_offered');
      const sent = JSON.parse(init.body);
      expect(sent.p_count).toBe(7);
      expect(typeof sent.p_date).toBe('string');
    });

    test('recordPuzzleContribution accepts an object {words_offered} result', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(okJson({ words_offered: 99 }));
      expect(await recordPuzzleContribution(3)).toBe(99);
    });

    test('recordPuzzleContribution is a no-op for non-positive counts', async () => {
      expect(await recordPuzzleContribution(0)).toBeNull();
      expect(await recordPuzzleContribution(-4)).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('getAggregateProof reads the RPC result', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        okJson({ wordsOfferedToday: 12408, activeSeekers: 642 })
      );
      const proof = await getAggregateProof();
      expect(proof).toEqual({ wordsOfferedToday: 12408, activeSeekers: 642 });
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('/rest/v1/rpc/aggregate_proof');
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(1);
    });

    test('getAggregateProof normalizes a snake_case RPC row (array form)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        okJson([{ date: 'd', words_offered: 5000, active_seekers: 300 }])
      );
      const proof = await getAggregateProof();
      expect(proof).toEqual({ wordsOfferedToday: 5000, activeSeekers: 300 });
    });

    test('getAggregateProof returns null when the RPC has no data — NO table fallback', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(okJson(null));
      expect(await getAggregateProof()).toBeNull();
      // Exactly one request, the RPC — never a daily_counters select.
      const calls = (global.fetch as jest.Mock).mock.calls;
      expect(calls.length).toBe(1);
      expect(calls[0][0]).toContain('/rest/v1/rpc/aggregate_proof');
      expect(calls[0][0]).not.toContain('/rest/v1/daily_counters');
    });

    test('getAggregateProof degrades to null when the RPC is missing (404)', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      await expect(getAggregateProof()).resolves.toBeNull();
      expect((global.fetch as jest.Mock).mock.calls.length).toBe(1);
    });

    test('getAggregateProof tolerates a missing active_seekers field', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        okJson([{ date: 'd', words_offered: 10 }])
      );
      const proof = await getAggregateProof();
      expect(proof).toEqual({ wordsOfferedToday: 10, activeSeekers: 0 });
    });
  });

  describe('getWordsOfferedText (phase-aware, spoiler-safe, self-explanatory)', () => {
    test('bright phases lead with the community ("Players everywhere"), commas intact', () => {
      expect(getWordsOfferedText(12408, 0)).toBe('Players everywhere shared 12,408 words today');
      expect(getWordsOfferedText(12408, 1)).toBe('Players everywhere shared 12,408 words today');
    });

    test('mid phases weight the language while staying explicitly global', () => {
      expect(getWordsOfferedText(12408, 2)).toBe('Players everywhere wove 12,408 words today');
      expect(getWordsOfferedText(12408, 3)).toBe('Seekers everywhere offered 12,408 words today');
    });

    test('phase 4+ keeps the ritual register the player has earned', () => {
      expect(getWordsOfferedText(12408, 4)).toBe('12,408 words joined the arrangement today');
      expect(getWordsOfferedText(12408, 5)).toBe('12,408 words joined the arrangement today');
    });

    test('suppresses the line entirely below the minimum count (a weak number reads as a dead game)', () => {
      for (const phase of [0, 1, 2, 3, 4, 5]) {
        expect(getWordsOfferedText(SOCIAL_PROOF_MIN_WORDS - 1, phase)).toBeNull();
        expect(getWordsOfferedText(0, phase)).toBeNull();
        expect(getWordsOfferedText(-5, phase)).toBeNull();
      }
    });

    test('shows exactly at the threshold', () => {
      expect(SOCIAL_PROOF_MIN_WORDS).toBe(100);
      expect(getWordsOfferedText(SOCIAL_PROOF_MIN_WORDS, 0)).toBe(
        'Players everywhere shared 100 words today'
      );
    });

    test('never mentions the internal phase model', () => {
      for (const phase of [0, 1, 2, 3, 4, 5]) {
        const line = getWordsOfferedText(5000, phase);
        expect(line).not.toBeNull();
        expect(line!.toLowerCase()).not.toContain('phase');
      }
    });
  });

  describe('getActiveSeekersText (phase-aware, spoiler-safe)', () => {
    test('bright phases say "players"', () => {
      expect(getActiveSeekersText(642, 0)).toBe('642 players playing today');
    });
    test('mid phases say "seekers"', () => {
      expect(getActiveSeekersText(642, 2)).toBe('642 seekers playing today');
    });
    test('late phases use the gathered framing', () => {
      expect(getActiveSeekersText(642, 4)).toBe('642 gathered at the pattern today');
    });
  });
});
