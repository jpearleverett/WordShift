import AsyncStorage from '@react-native-async-storage/async-storage';

// Mutable expo-config extra so we can toggle configured/unconfigured per test
// (mirrors supabaseClient.test.ts).
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

// Keep telemetry's install id deterministic and dependency-free.
jest.mock('../services/telemetry', () => ({
  getInstallId: async () => 'install-abc123',
}));

import {
  installCloudProviderIfConfigured,
  getCloudProvider,
  getCloudOwnerId,
  getOrCreateRecoveryCode,
  linkRecoveryCode,
  maybeAutoRestoreOnFreshInstall,
  clearSyncStatus,
  setCloudProvider,
  CloudSaveData,
  CloudProvider,
} from '../services/cloudSave';

const CONFIGURED = { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon-key' };

function mockFetchJson(body: unknown, status = 200, ok = true) {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok,
    status,
    json: async () => body,
  });
}

/** Reset the provider back to NoOp between tests so installs don't leak. */
function resetToNoOp() {
  setCloudProvider({
    upload: async () => false,
    download: async () => null,
    hasNewerSave: async () => false,
    getName: () => 'Not Connected',
    isReady: async () => false,
  } as CloudProvider);
}

describe('SupabaseCloudProvider', () => {
  beforeEach(async () => {
    (AsyncStorage.clear as jest.Mock)();
    await clearSyncStatus();
    mockExtra = {};
    (global as Record<string, unknown>).fetch = jest.fn();
    resetToNoOp();
  });

  afterEach(() => {
    delete (global as Record<string, unknown>).fetch;
  });

  describe('installCloudProviderIfConfigured', () => {
    it('does NOT install when unconfigured (NoOp stays default)', () => {
      mockExtra = {};
      installCloudProviderIfConfigured();
      expect(getCloudProvider().getName()).toBe('Not Connected');
    });

    it('installs the Supabase provider when configured', () => {
      mockExtra = { ...CONFIGURED };
      installCloudProviderIfConfigured();
      expect(getCloudProvider().getName()).toBe('Supabase');
    });

    it('Supabase provider isReady reflects configuration', async () => {
      mockExtra = { ...CONFIGURED };
      installCloudProviderIfConfigured();
      expect(await getCloudProvider().isReady()).toBe(true);
    });
  });

  describe('getCloudOwnerId', () => {
    it('defaults to the install id', async () => {
      expect(await getCloudOwnerId()).toBe('install-abc123');
    });

    it('uses the stored recovery-code override when present', async () => {
      await AsyncStorage.setItem('wordshift_cloud_owner', 'WSABCD1234');
      expect(await getCloudOwnerId()).toBe('WSABCD1234');
    });
  });

  describe('upload', () => {
    it('posts an upsert on owner to /rest/v1/saves', async () => {
      mockExtra = { ...CONFIGURED };
      installCloudProviderIfConfigured();
      mockFetchJson([], 204, true);

      const data: CloudSaveData = {
        version: 1,
        timestamp: 1000,
        deviceId: 'dev-1',
        data: { wordshift_home_progress: '{"amber":100}' },
      };
      const ok = await getCloudProvider().upload(data);
      expect(ok).toBe(true);

      const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('/rest/v1/saves');
      expect(url).toContain('on_conflict=owner');
      expect(init.method).toBe('POST');
      expect(init.headers.Prefer).toContain('resolution=merge-duplicates');

      const sent = JSON.parse(init.body);
      expect(sent.owner).toBe('install-abc123');
      expect(sent.version).toBe(1);
      expect(sent.timestamp).toBe(1000);
      expect(sent.device_id).toBe('dev-1');
      expect(sent.payload).toBe(JSON.stringify(data.data));
    });

    it('returns false when the network call fails', async () => {
      mockExtra = { ...CONFIGURED };
      installCloudProviderIfConfigured();
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 500 });

      const ok = await getCloudProvider().upload({
        version: 1,
        timestamp: 1,
        deviceId: 'd',
        data: {},
      });
      expect(ok).toBe(false);
    });
  });

  describe('download', () => {
    it('reconstructs CloudSaveData from the newest row', async () => {
      mockExtra = { ...CONFIGURED };
      installCloudProviderIfConfigured();

      const payload = { wordshift_home_progress: '{"amber":777}' };
      mockFetchJson([
        { owner: 'install-abc123', version: 1, timestamp: 5, device_id: 'old', payload: '{}' },
        {
          owner: 'install-abc123',
          version: 2,
          timestamp: 99,
          device_id: 'new',
          payload: JSON.stringify(payload),
        },
      ]);

      const result = await getCloudProvider().download();
      expect(result).not.toBeNull();
      expect(result!.version).toBe(2);
      expect(result!.timestamp).toBe(99);
      expect(result!.deviceId).toBe('new');
      expect(result!.data).toEqual(payload);

      const [url] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url).toContain('owner=eq.install-abc123');
    });

    it('returns null when no rows exist', async () => {
      mockExtra = { ...CONFIGURED };
      installCloudProviderIfConfigured();
      mockFetchJson([]);
      expect(await getCloudProvider().download()).toBeNull();
    });
  });

  describe('hasNewerSave', () => {
    it('true when remote timestamp exceeds local', async () => {
      mockExtra = { ...CONFIGURED };
      installCloudProviderIfConfigured();
      mockFetchJson([{ timestamp: 500 }]);
      expect(await getCloudProvider().hasNewerSave(100)).toBe(true);
    });

    it('false when remote timestamp is not newer', async () => {
      mockExtra = { ...CONFIGURED };
      installCloudProviderIfConfigured();
      mockFetchJson([{ timestamp: 100 }]);
      expect(await getCloudProvider().hasNewerSave(100)).toBe(false);
    });

    it('false when no remote save', async () => {
      mockExtra = { ...CONFIGURED };
      installCloudProviderIfConfigured();
      mockFetchJson([]);
      expect(await getCloudProvider().hasNewerSave(0)).toBe(false);
    });
  });

  describe('recovery code', () => {
    it('generates a friendly, stable WS-XXXX-XXXX code', async () => {
      const code1 = await getOrCreateRecoveryCode();
      expect(code1).toMatch(/^WS-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
      const code2 = await getOrCreateRecoveryCode();
      expect(code2).toBe(code1);
      // Canonical owner was persisted.
      const owner = await AsyncStorage.getItem('wordshift_cloud_owner');
      expect(owner).toBeTruthy();
    });

    it('linking a code changes the resolved owner', async () => {
      const before = await getCloudOwnerId();
      expect(before).toBe('install-abc123');

      const ok = await linkRecoveryCode('ws-qrst-uvwx');
      expect(ok).toBe(true);
      // Normalized: uppercased, separators stripped.
      expect(await getCloudOwnerId()).toBe('WSQRSTUVWX');
    });

    it('rejects too-short / invalid codes', async () => {
      expect(await linkRecoveryCode('WS-12')).toBe(false);
      expect(await linkRecoveryCode('')).toBe(false);
      // Owner unchanged.
      expect(await getCloudOwnerId()).toBe('install-abc123');
    });

    it('clearSyncStatus removes the owner override', async () => {
      await linkRecoveryCode('WSABCDEFGH');
      expect(await getCloudOwnerId()).toBe('WSABCDEFGH');
      await clearSyncStatus();
      expect(await getCloudOwnerId()).toBe('install-abc123');
    });
  });

  describe('maybeAutoRestoreOnFreshInstall', () => {
    it('does nothing when unconfigured', async () => {
      mockExtra = {};
      expect(await maybeAutoRestoreOnFreshInstall()).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('restores when local is empty and cloud has a save', async () => {
      mockExtra = { ...CONFIGURED };
      installCloudProviderIfConfigured();

      const payload = { wordshift_home_progress: '{"amber":321}' };
      mockFetchJson([
        {
          owner: 'install-abc123',
          version: 1,
          timestamp: 10,
          device_id: 'cloud',
          payload: JSON.stringify(payload),
        },
      ]);

      const restored = await maybeAutoRestoreOnFreshInstall();
      expect(restored).toBe(true);
      const progress = await AsyncStorage.getItem('wordshift_home_progress');
      expect(JSON.parse(progress!).amber).toBe(321);
    });

    it('does NOT restore when local progress already exists', async () => {
      mockExtra = { ...CONFIGURED };
      installCloudProviderIfConfigured();
      await AsyncStorage.setItem('wordshift_home_progress', '{"amber":1}');

      const restored = await maybeAutoRestoreOnFreshInstall();
      expect(restored).toBe(false);
      // Existing local progress untouched.
      const progress = await AsyncStorage.getItem('wordshift_home_progress');
      expect(JSON.parse(progress!).amber).toBe(1);
      // No download attempted.
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns false when cloud has no save', async () => {
      mockExtra = { ...CONFIGURED };
      installCloudProviderIfConfigured();
      mockFetchJson([]);
      expect(await maybeAutoRestoreOnFreshInstall()).toBe(false);
    });
  });
});
