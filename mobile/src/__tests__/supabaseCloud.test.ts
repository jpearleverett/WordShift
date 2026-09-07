import { clearEvents } from '../services/eventLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  installCloudProviderIfConfigured, getCloudProvider, getCloudOwnerId,
  getOrCreateRecoveryCode, restoreFromRecoveryCode, maybeAutoRestoreOnFreshInstall,
  clearSyncStatus, setCloudProvider, uploadToCloud, downloadFromCloud, getSyncStatus,
  CloudSaveData, CloudProvider, LEGACY_CLOUD_OWNER_KEY,
} from '../services/cloudSave';
import { formatSecureRecoveryCode } from '../services/secureIdentity';

let mockExtra: Record<string, unknown> = {};
jest.mock('expo-constants', () => ({ default: { get expoConfig() { return { extra: mockExtra }; } } }));
jest.mock('@react-native-async-storage/async-storage', () => require('./helpers/mockAsyncStorage').createMockAsyncStorage());
jest.mock('../services/telemetry', () => ({ getInstallId: async () => 'install-abc123' }));
const OWNER = 'ws2_' + 'a'.repeat(32);
const OTHER = 'ws2_' + 'b'.repeat(32);
const CONFIG = { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'public-key' };
const save = (amount = 10, revision = 1): CloudSaveData => ({
  version: 1, timestamp: 1000, revision, deviceId: 'remote', data: {
    wordshift_home_progress: JSON.stringify({ amber: amount }), wordshift_schema_version: '6',
  },
});
const row = (data = save()) => ({ version: data.version, timestamp: data.timestamp,
  revision: data.revision, device_id: data.deviceId, payload: JSON.stringify(data.data) });
function reply(body: unknown, ok = true) {
  (global.fetch as jest.Mock).mockResolvedValue({ ok, status: ok ? 200 : 503, json: async () => body });
}
function install() { mockExtra = CONFIG; installCloudProviderIfConfigured(); }
function memoryProvider(rows: Map<string, CloudSaveData>): CloudProvider {
  return {
    isReady: async () => true, getName: () => 'Memory', upload: async () => false,
    hasNewerSave: async () => false,
    download: async owner => rows.get(owner ?? await getCloudOwnerId()) ?? null,
    uploadConditional: async (data, expected, force, owner) => {
      const key = owner ?? await getCloudOwnerId();
      const previous = rows.get(key);
      if (previous && !force && expected !== previous.revision) return { status: 'conflict', revision: previous.revision };
      const revision = (previous?.revision ?? 0) + 1;
      rows.set(key, { ...data, revision });
      return { status: 'saved', revision };
    },
  };
}
beforeEach(async () => {
  await AsyncStorage.clear(); await clearSyncStatus(); mockExtra = {};
  global.fetch = jest.fn();
  setCloudProvider({ isReady: async () => false, getName: () => 'Not Connected', upload: async () => false,
    download: async () => null, hasNewerSave: async () => false });
});

describe('secure cloud provider', () => {
  test('unconfigured is a no-op; configured installs the provider', async () => {
    installCloudProviderIfConfigured(); expect(await getCloudProvider().isReady()).toBe(false);
    install(); expect(await getCloudProvider().isReady()).toBe(true);
    expect(getCloudProvider().getName()).toBe('Supabase');
  });
  test('creates a stable full-random owner and preserves the legacy reference', async () => {
    await AsyncStorage.setItem('wordshift_cloud_owner', 'INSTMTO7');
    const [a, b] = await Promise.all([getCloudOwnerId(), getCloudOwnerId()]);
    expect(a).toMatch(/^ws2_[a-f0-9]{32}$/); expect(a).toBe(b);
    expect(await AsyncStorage.getItem(LEGACY_CLOUD_OWNER_KEY)).toBe('INSTMTO7');
    expect(global.fetch).not.toHaveBeenCalled();
  });
  test('preserves an already secure owner', async () => {
    await AsyncStorage.setItem('wordshift_cloud_owner', OWNER);
    expect(await getCloudOwnerId()).toBe(OWNER);
    await clearSyncStatus(); expect(await getCloudOwnerId()).toBe(OWNER);
  });
  test('uploads with a conditional v2 RPC and no direct table access', async () => {
    install(); await AsyncStorage.setItem('wordshift_cloud_owner', OWNER);
    reply({ status: 'saved', revision: 7 });
    expect(await getCloudProvider().upload(save(12, 6))).toBe(true);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toBe('https://x.supabase.co/rest/v1/rpc/upsert_save_v2');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toMatchObject({ p_owner: OWNER, p_expected_revision: 6, p_force: false });
  });
  test.each([null, false, { status: 'conflict', revision: 4 }])('never falls back to unsafe legacy writes on %p', async response => {
    install(); reply(response);
    expect(await getCloudProvider().upload(save())).toBe(false);
    expect((global.fetch as jest.Mock).mock.calls).toHaveLength(1);
  });
  test('downloads a validated save and its server revision', async () => {
    install(); reply([row()]);
    expect(await getCloudProvider().download(OWNER)).toEqual(save());
    expect(JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body)).toEqual({ p_owner: OWNER });
  });
  test.each([[], {}, [{ ...row(), payload: 'bad json' }], [{ ...row(), revision: undefined }]])('rejects invalid/missing rows %p', async response => {
    install(); reply(response); expect(await getCloudProvider().download()).toBeNull();
  });
  test('fresh-install recovery preserves an intentional reset marker despite remote clock skew', async () => {
    install(); reply([row()]);
    await AsyncStorage.setItem('wordshift_local_reset_at', '1');
    expect(await maybeAutoRestoreOnFreshInstall()).toBe(false);
    expect(await AsyncStorage.getItem('wordshift_home_progress')).toBeNull();
  });
  test('auto restore only runs without local progress', async () => {
    install(); reply([row()]);
    await AsyncStorage.setItem('wordshift_home_progress', '{"amber":1}');
    expect(await maybeAutoRestoreOnFreshInstall()).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
    await AsyncStorage.removeItem('wordshift_home_progress');
    expect(await maybeAutoRestoreOnFreshInstall()).toBe(true);
    expect(JSON.parse((await AsyncStorage.getItem('wordshift_home_progress'))!).amber).toBe(10);
  });
});

describe('recovery lifecycle and revisions', () => {
  test('show code creates a durable backup that another device immediately restores', async () => {
    const rows = new Map<string, CloudSaveData>(); setCloudProvider(memoryProvider(rows));
    await AsyncStorage.setItem('wordshift_home_progress', '{"amber":123}');
    const code = await getOrCreateRecoveryCode(); const owner = await getCloudOwnerId();
    expect(rows.get(owner)).toBeDefined();
    await AsyncStorage.clear(); await clearSyncStatus();
    expect(await restoreFromRecoveryCode(code)).toBe(true);
    expect(await getCloudOwnerId()).toBe(owner);
    expect(JSON.parse((await AsyncStorage.getItem('wordshift_home_progress'))!).amber).toBe(123);
  });
  test('invalid, legacy, absent and offline restore do not change owner or progress', async () => {
    await AsyncStorage.setItem('wordshift_cloud_owner', OWNER);
    await AsyncStorage.setItem('wordshift_home_progress', '{"amber":12}');
    setCloudProvider(memoryProvider(new Map()));
    await expect(restoreFromRecoveryCode('bad')).rejects.toMatchObject({ reason: 'invalid_code' });
    await expect(restoreFromRecoveryCode('WS-INST-MTO7')).rejects.toMatchObject({ reason: 'legacy_code' });
    expect(await restoreFromRecoveryCode(formatSecureRecoveryCode(OTHER))).toBe(false);
    expect(await getCloudOwnerId()).toBe(OWNER);
    expect(await AsyncStorage.getItem('wordshift_home_progress')).toBe('{"amber":12}');
  });
  test('does not display a code for a failed backup', async () => {
    await expect(getOrCreateRecoveryCode()).rejects.toMatchObject({ reason: 'unavailable' });
  });
  test('server revision detects newer writes even with an ahead local clock', async () => {
    const rows = new Map([[OWNER, save(10, 1)]]); setCloudProvider(memoryProvider(rows));
    await AsyncStorage.setItem('wordshift_cloud_owner', OWNER);
    expect(await downloadFromCloud()).toBe(true);
    expect((await getSyncStatus()).remoteRevision).toBe(1);
    rows.set(OWNER, save(20, 2));
    expect(await uploadToCloud()).toBe(false);
    expect((await getSyncStatus()).conflictDetected).toBe(true);
    expect(rows.get(OWNER)?.data.wordshift_home_progress).toBe('{"amber":20}');
    expect(await uploadToCloud(true)).toBe(true);
    expect((await getSyncStatus()).remoteRevision).toBe(3);
  });
  test('clearing sync metadata preserves linked reset target and requires explicit overwrite', async () => {
    const rows = new Map([[OWNER, save(90, 1)]]); setCloudProvider(memoryProvider(rows));
    await AsyncStorage.setItem('wordshift_cloud_owner', OWNER);
    await clearSyncStatus();
    expect(await uploadToCloud()).toBe(false);
    expect(await uploadToCloud(true)).toBe(true);
    expect(rows.size).toBe(1); expect(rows.get(OWNER)?.data.wordshift_home_progress).toBeUndefined();
  });
});

// The service owns a debounced telemetry timer; do not let it outlive its test environment.
afterAll(() => clearEvents());
