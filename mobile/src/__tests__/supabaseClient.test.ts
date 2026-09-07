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
      expect(await sbFetch('rpc/get_save')).toBeNull();
      expect(await sbInsert('events', { a: 1 })).toBeNull();
      expect(await sbRpc('bump', {})).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test('helpers never throw when disabled', async () => {
      await expect(sbRpc('get_save', {})).resolves.toBeNull();
    });
  });

  describe('configured requests', () => {
    beforeEach(() => {
      mockExtra = { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon-key' };
    });

    test('sbInsert posts with auth headers to the rest endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 204 });
      await sbInsert('events', { type: 'x' }, { returning: false });
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toBe('https://x.supabase.co/rest/v1/events');
      expect(init.method).toBe('POST');
      expect(init.headers.apikey).toBe('anon-key');
      expect(init.headers.Authorization).toBe('Bearer anon-key');
      expect(init.headers.Prefer).toBe('return=minimal');
    });

    test('publishable keys use apikey without being presented as a JWT', async () => {
      mockExtra.supabaseAnonKey = 'sb_publishable_example';
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200, json: async () => [] });
      await sbRpc('get_save_v2', { p_owner: 'invalid' });
      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(init.headers.apikey).toBe('sb_publishable_example');
      expect(init.headers).not.toHaveProperty('Authorization');
    });

    test('sbInsert returns [] on a 204 success without representation', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 204 });
      const result = await sbInsert('events', { type: 'x' }, { returning: false });
      expect(result).toEqual([]);
    });

    test('sbInsert has no upsert path — legacy options are ignored, no on_conflict', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 204 });
      await sbInsert(
        'events',
        { type: 'x' },
        { upsert: true, onConflict: 'owner', returning: false } as never,
      );
      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).not.toContain('on_conflict');
      expect(init.headers.Prefer).not.toContain('merge-duplicates');
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
      expect(await sbRpc('get_save', {})).toBeNull();
    });

    test('a fetch rejection resolves to null, not a throw', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));
      expect(await sbRpc('get_save', {})).toBeNull();
    });

    test('getBackendIdentity returns the persisted anonymous install id', async () => {
      const id = await getBackendIdentity();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });
  });

  describe('capability-URL hardening: no direct-table read path in the client', () => {
    // Everything except the INSERT-only telemetry `events` sink must go through
    // SECURITY DEFINER RPCs (docs/supabase/security_setup.sql). Guard against a
    // regression that reintroduces a PostgREST table select anywhere.
    const SERVICE_FILES = [
      'supabaseClient.ts',
      'cloudSave.ts',
      'leaderboard.ts',
      'socialProof.ts',
      'telemetry.ts',
    ];

    test('the client exports no table-select helper', () => {
      const mod = require('../services/supabaseClient');
      expect(mod.sbSelect).toBeUndefined();
    });

    test('no backend service builds a direct-table select query', () => {
      const fs = require('fs');
      const path = require('path');
      for (const file of SERVICE_FILES) {
        const src = fs.readFileSync(
          path.join(__dirname, '..', 'services', file),
          'utf8',
        );
        expect(src).not.toMatch(/sbSelect/);
        // PostgREST reads are built as `?select=...` querystrings — none allowed.
        expect(src).not.toMatch(/select=/);
        // No owner/date row filters outside RPC bodies either.
        expect(src).not.toMatch(/owner=eq\./);
        expect(src).not.toMatch(/date=eq\./);
      }
    });
  });
});
