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
  getSupabaseConfig,
  isSupabaseConfigured,
  getSentryDsn,
  getBackendIdentity,
  sbFetch,
  sbSelect,
  sbInsert,
  sbRpc,
} from '../services/supabaseClient';

describe('supabaseClient', () => {
  beforeEach(() => {
    (AsyncStorage.clear as jest.Mock)();
    mockExtra = {};
    (global as Record<string, unknown>).fetch = jest.fn();
  });

  afterEach(() => {
    delete (global as Record<string, unknown>).fetch;
  });

  describe('configuration gating', () => {
    test('is disabled when no credentials are set', () => {
      expect(isSupabaseConfigured()).toBe(false);
      expect(getSupabaseConfig()).toBeNull();
      expect(getSentryDsn()).toBe('');
    });

    test('is disabled when only one of url/anonKey is set', () => {
      mockExtra = { supabaseUrl: 'https://x.supabase.co' };
      expect(isSupabaseConfigured()).toBe(false);
      mockExtra = { supabaseAnonKey: 'key' };
      expect(isSupabaseConfigured()).toBe(false);
    });

    test('is enabled and normalizes a trailing slash when both are set', () => {
      mockExtra = { supabaseUrl: 'https://x.supabase.co/', supabaseAnonKey: 'anon-key' };
      expect(isSupabaseConfigured()).toBe(true);
      expect(getSupabaseConfig()).toEqual({ url: 'https://x.supabase.co', anonKey: 'anon-key' });
    });

    test('reads the sentry DSN when present', () => {
      mockExtra = { sentryDsn: 'https://abc@o0.ingest.sentry.io/1' };
      expect(getSentryDsn()).toBe('https://abc@o0.ingest.sentry.io/1');
    });
  });

  describe('no network when unconfigured', () => {
    test('every helper resolves to null and fetch is never called', async () => {
      expect(await sbFetch('saves')).toBeNull();
      expect(await sbSelect('saves', 'select=*')).toBeNull();
      expect(await sbInsert('saves', { a: 1 })).toBeNull();
      expect(await sbRpc('bump', {})).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('helpers never throw when disabled', async () => {
      await expect(sbSelect('saves', 'select=*')).resolves.toBeNull();
    });
  });

  describe('configured requests', () => {
    beforeEach(() => {
      mockExtra = { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon-key' };
    });

    test('sbSelect issues a GET with auth headers to the rest endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ id: 1 }],
      });
      const rows = await sbSelect<{ id: number }>('saves', 'select=*&owner=eq.abc');
      expect(rows).toEqual([{ id: 1 }]);
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://x.supabase.co/rest/v1/saves?select=*&owner=eq.abc');
      expect(init.method).toBe('GET');
      expect(init.headers.apikey).toBe('anon-key');
      expect(init.headers.Authorization).toBe('Bearer anon-key');
    });

    test('sbInsert with upsert sends merge-duplicates Prefer header', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [{ id: 1 }],
      });
      await sbInsert('saves', { owner: 'abc' }, { upsert: true, onConflict: 'owner' });
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('on_conflict=owner');
      expect(init.method).toBe('POST');
      expect(init.headers.Prefer).toContain('resolution=merge-duplicates');
    });

    test('sbInsert returns [] on a 204 success without representation', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 204 });
      const result = await sbInsert('events', { type: 'x' }, { returning: false });
      expect(result).toEqual([]);
    });

    test('sbRpc posts to the rpc endpoint and returns the result', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => 42,
      });
      const result = await sbRpc<number>('bump_counter', { day: '2026-06-21' });
      expect(result).toBe(42);
      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://x.supabase.co/rest/v1/rpc/bump_counter');
    });

    test('a non-ok response resolves to null, not a throw', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });
      expect(await sbSelect('saves', 'select=*')).toBeNull();
    });

    test('a fetch rejection resolves to null, not a throw', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
      expect(await sbSelect('saves', 'select=*')).toBeNull();
    });

    test('getBackendIdentity returns the persisted anonymous install id', async () => {
      const id = await getBackendIdentity();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });
});
