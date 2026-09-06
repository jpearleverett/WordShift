import { clearEvents } from '../services/eventLogger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearStoryState, loadStoryState, recordStoryBoundary, STORY_STORAGE_KEY } from '../services/storySpine';
import {
  collectLocalSaveData,
  restoreFromCloudData,
  setCloudProvider,
  getCloudProvider,
  uploadToCloud,
  downloadFromCloud,
  checkForNewerSave,
  getSyncStatus,
  markPendingChanges,
  clearSyncStatus,
  CloudProvider,
  CloudSaveData,
  SYNC_KEY_PREFIXES,
} from '../services/cloudSave';
import { loadProgress } from '../services/amberCurrency';
import { loadWeeklyQuests, clearWeeklyQuests } from '../services/weeklyQuests';
import { initHints, getHintBalance, clearHints } from '../services/hints';
import {
  recordAmberCosmeticPurchase,
  equipCosmetic,
  getEquipped,
  clearCosmetics,
} from '../services/cosmetics';

// Mock AsyncStorage using shared factory
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

function createMockProvider(overrides: Partial<CloudProvider> = {}): CloudProvider {
  return {
    upload: jest.fn(async () => true),
    download: jest.fn(async () => null),
    hasNewerSave: jest.fn(async () => false),
    getName: () => 'MockProvider',
    isReady: jest.fn(async () => true),
    ...overrides,
  };
}

describe('cloudSave', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearSyncStatus();
    await clearStoryState();
    await clearHints();
    await clearCosmetics();
    await clearWeeklyQuests();
    // Reset to a default no-op provider
    setCloudProvider(createMockProvider({
      upload: async () => false,
      download: async () => null,
      getName: () => 'Not Connected',
      isReady: async () => false,
    }));
  });

  // ===========================================================================
  // setCloudProvider / getCloudProvider
  // ===========================================================================

  describe('setCloudProvider / getCloudProvider', () => {
    it('returns the current provider', () => {
      const provider = getCloudProvider();
      expect(provider.getName()).toBe('Not Connected');
    });

    it('sets a custom provider', () => {
      const mockProvider = createMockProvider({ getName: () => 'TestProvider' });
      setCloudProvider(mockProvider);
      expect(getCloudProvider().getName()).toBe('TestProvider');
    });

    it('replaces the previous provider', () => {
      const mock1 = createMockProvider({ getName: () => 'Provider1' });
      const mock2 = createMockProvider({ getName: () => 'Provider2' });
      setCloudProvider(mock1);
      setCloudProvider(mock2);
      expect(getCloudProvider().getName()).toBe('Provider2');
    });
  });

  // ===========================================================================
  // NoOp Provider behavior
  // ===========================================================================

  describe('NoOp Provider', () => {
    it('upload returns false', async () => {
      const provider = getCloudProvider();
      const result = await provider.upload({
        version: 1,
        timestamp: Date.now(),
        deviceId: 'test',
        data: {},
      });
      expect(result).toBe(false);
    });

    it('download returns null', async () => {
      const provider = getCloudProvider();
      const result = await provider.download();
      expect(result).toBeNull();
    });

    it('hasNewerSave returns false', async () => {
      const provider = getCloudProvider();
      const result = await provider.hasNewerSave(0);
      expect(result).toBe(false);
    });

    it('isReady returns false', async () => {
      const provider = getCloudProvider();
      const result = await provider.isReady();
      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // collectLocalSaveData
  // ===========================================================================

  describe('collectLocalSaveData', () => {
    it('returns correct version', async () => {
      const data = await collectLocalSaveData();
      expect(data.version).toBe(1);
    });

    it('returns current timestamp', async () => {
      const before = Date.now();
      const data = await collectLocalSaveData();
      expect(data.timestamp).toBeGreaterThanOrEqual(before);
    });

    it('generates a device ID', async () => {
      const data = await collectLocalSaveData();
      expect(data.deviceId).toBeTruthy();
      expect(typeof data.deviceId).toBe('string');
    });

    it('returns consistent device ID across calls', async () => {
      const data1 = await collectLocalSaveData();
      const data2 = await collectLocalSaveData();
      expect(data1.deviceId).toBe(data2.deviceId);
    });

    it('collects stored sync keys', async () => {
      await AsyncStorage.setItem('wordshift_home_progress', JSON.stringify({ amber: 100 }));
      await AsyncStorage.setItem('wordshift_star_stats', JSON.stringify({ total: 50 }));

      const data = await collectLocalSaveData();
      expect(data.data['wordshift_home_progress']).toBeDefined();
      expect(data.data['wordshift_star_stats']).toBeDefined();
    });

    it('ignores non-sync keys', async () => {
      await AsyncStorage.setItem('some_other_key', 'value');
      const data = await collectLocalSaveData();
      expect(data.data['some_other_key']).toBeUndefined();
    });

    it('skips keys with no stored value', async () => {
      const data = await collectLocalSaveData();
      expect(Object.keys(data.data).length).toBe(0);
    });

    it('collects all relevant sync keys when present', async () => {
      const syncKeys = [
        'wordshift_home_progress',
        'wordshift_star_stats',
        'wordshift_achievements',
        'wordshift_share_count',
        'wordshift_weekly_quests',
        'wordshift_whisper_gallery',
        'wordshift_sacrifices',
      ];
      for (const key of syncKeys) {
        await AsyncStorage.setItem(key, JSON.stringify({ test: true }));
      }

      const data = await collectLocalSaveData();
      for (const key of syncKeys) {
        expect(data.data[key]).toBeDefined();
      }
    });

    it('device ID is stored in AsyncStorage', async () => {
      await collectLocalSaveData();
      const storedId = await AsyncStorage.getItem('wordshift_device_id');
      expect(storedId).not.toBeNull();
    });

    it('preserves exact string values from storage', async () => {
      const value = JSON.stringify({ amber: 42, streak: 7 });
      await AsyncStorage.setItem('wordshift_home_progress', value);

      const data = await collectLocalSaveData();
      expect(data.data['wordshift_home_progress']).toBe(value);
    });
  });

  // ===========================================================================
  // Prefix-synced keys (wordshift_played_* per-bank played-puzzle-id lists)
  // ===========================================================================

  describe('prefix-synced keys (SYNC_KEY_PREFIXES)', () => {
    it('exports the played-puzzle prefix', () => {
      expect(SYNC_KEY_PREFIXES).toContain('wordshift_played_');
    });

    it('collects per-bank played-puzzle-id keys via the prefix', async () => {
      await AsyncStorage.setItem('wordshift_played_puzzle_ids', JSON.stringify(['h1']));
      await AsyncStorage.setItem('wordshift_played_std_easy_puzzle_ids', JSON.stringify(['e1', 'e2']));
      await AsyncStorage.setItem('wordshift_played_reverse_mp_puzzle_ids', JSON.stringify(['r9']));

      const data = await collectLocalSaveData();
      expect(data.data['wordshift_played_puzzle_ids']).toBe(JSON.stringify(['h1']));
      expect(data.data['wordshift_played_std_easy_puzzle_ids']).toBe(JSON.stringify(['e1', 'e2']));
      expect(data.data['wordshift_played_reverse_mp_puzzle_ids']).toBe(JSON.stringify(['r9']));
    });

    it('round-trips a played-bank key through collect then restore', async () => {
      const value = JSON.stringify(['p1', 'p2', 'p3']);
      await AsyncStorage.setItem('wordshift_played_std_easy_puzzle_ids', value);

      const collected = await collectLocalSaveData();
      await AsyncStorage.clear();
      expect(await AsyncStorage.getItem('wordshift_played_std_easy_puzzle_ids')).toBeNull();

      const restored = await restoreFromCloudData({
        version: 1,
        timestamp: Date.now(),
        deviceId: 'test',
        data: collected.data,
      });
      expect(restored).toBe(true);
      expect(await AsyncStorage.getItem('wordshift_played_std_easy_puzzle_ids')).toBe(value);
    });

    it('still excludes deliberately-unsynced and unrelated keys', async () => {
      await AsyncStorage.setItem('wordshift_event_log', '[]'); // deliberate exclusion
      await AsyncStorage.setItem('wordshift_entitlements', '{}'); // deliberate exclusion
      await AsyncStorage.setItem('wordshift_ad_pacing', '{}'); // deliberate exclusion
      await AsyncStorage.setItem('some_random_key', 'x');
      // Near-miss: shares the 'wordshift_played' stem but not the underscore prefix.
      await AsyncStorage.setItem('wordshift_playedish', 'x');

      const data = await collectLocalSaveData();
      expect(data.data['wordshift_event_log']).toBeUndefined();
      expect(data.data['wordshift_entitlements']).toBeUndefined();
      expect(data.data['wordshift_ad_pacing']).toBeUndefined();
      expect(data.data['some_random_key']).toBeUndefined();
      expect(data.data['wordshift_playedish']).toBeUndefined();
    });
  });

  // ===========================================================================
  // restoreFromCloudData
  // ===========================================================================

  describe('restoreFromCloudData', () => {
    it('writes cloud data to AsyncStorage', async () => {
      const cloudData: CloudSaveData = {
        version: 1,
        timestamp: Date.now(),
        deviceId: 'test_device',
        data: {
          'wordshift_home_progress': JSON.stringify({ amber: 500 }),
          'wordshift_star_stats': JSON.stringify({ total: 200 }),
        },
      };

      const success = await restoreFromCloudData(cloudData);
      expect(success).toBe(true);

      const progress = await AsyncStorage.getItem('wordshift_home_progress');
      expect(JSON.parse(progress!).amber).toBe(500);

      const stats = await AsyncStorage.getItem('wordshift_star_stats');
      expect(JSON.parse(stats!).total).toBe(200);
    });

    it('returns true on successful restore', async () => {
      const cloudData: CloudSaveData = {
        version: 1,
        timestamp: Date.now(),
        deviceId: 'test',
        data: {},
      };
      expect(await restoreFromCloudData(cloudData)).toBe(true);
    });

    it('overwrites existing local data', async () => {
      await AsyncStorage.setItem('wordshift_home_progress', JSON.stringify({ amber: 100 }));

      const cloudData: CloudSaveData = {
        version: 1,
        timestamp: Date.now(),
        deviceId: 'test',
        data: {
          'wordshift_home_progress': JSON.stringify({ amber: 999 }),
        },
      };

      await restoreFromCloudData(cloudData);
      const progress = await AsyncStorage.getItem('wordshift_home_progress');
      expect(JSON.parse(progress!).amber).toBe(999);
    });

    it('restores the chosen story boundary and invalidates its warm cache', async () => {
      const context = { phase: 4 as const, puzzlesSolved: 116, cycleCount: 0, unlockedAnimals: ['fox'] };
      await recordStoryBoundary(context, 'CLOSED');
      const backup = await collectLocalSaveData();
      expect(JSON.parse(backup.data[STORY_STORAGE_KEY]).boundary).toBe('remember');
      await clearStoryState();
      await recordStoryBoundary(context, 'CLOSER');
      expect((await loadStoryState(context)).boundary).toBe('release');
      expect(await restoreFromCloudData(backup)).toBe(true);
      expect((await loadStoryState(context)).boundary).toBe('remember');
      await restoreFromCloudData({ ...backup, data: {} });
      expect((await loadStoryState(context)).boundary).toBeNull();
    });

    it('invalidates cached service state after overwriting local data', async () => {
      await AsyncStorage.setItem('wordshift_home_progress', JSON.stringify({ amber: 100 }));
      expect((await loadProgress()).amber).toBe(100);

      const cloudData: CloudSaveData = {
        version: 1,
        timestamp: Date.now(),
        deviceId: 'test',
        data: {
          'wordshift_home_progress': JSON.stringify({ amber: 999 }),
        },
      };

      await restoreFromCloudData(cloudData);
      expect((await loadProgress()).amber).toBe(999);
    });

    it('invalidates synced hint and cosmetic caches after overwriting local data', async () => {
      await initHints();
      expect(await getHintBalance()).toBeGreaterThan(0);
      await recordAmberCosmeticPurchase('theme_ember');
      await equipCosmetic('theme_ember');
      expect(await getEquipped('tile_theme')).toBe('theme_ember');

      const cloudData: CloudSaveData = {
        version: 1,
        timestamp: Date.now(),
        deviceId: 'test',
        data: {
          'wordshift_hints': JSON.stringify({ balance: 42, seededFree: true }),
          'wordshift_cosmetics': JSON.stringify({
            owned: { theme_tide: Date.now() },
            equipped: { tile_theme: 'theme_tide' },
          }),
        },
      };

      await restoreFromCloudData(cloudData);
      expect(await getHintBalance()).toBe(42);
      expect(await getEquipped('tile_theme')).toBe('theme_tide');
    });

    it('invalidates the quest caches after overwriting local data (quest keys are synced)', async () => {
      const before = await loadWeeklyQuests(0);
      expect(before.daily.quests.length).toBe(5);

      // A cloud save from another device: same period, all daily quests done.
      const restoredDaily = {
        ...before.daily,
        quests: before.daily.quests.map(q => ({ ...q, progress: q.target, completed: true })),
      };
      await restoreFromCloudData({
        version: 1,
        timestamp: Date.now(),
        deviceId: 'other_device',
        data: { wordshift_daily_quests: JSON.stringify(restoredDaily) },
      });

      const after = await loadWeeklyQuests(0);
      expect(after.daily.quests.length).toBe(5);
      expect(after.daily.quests.every(q => q.completed)).toBe(true);
    });

    it('handles empty data object', async () => {
      const cloudData: CloudSaveData = {
        version: 1,
        timestamp: Date.now(),
        deviceId: 'remote',
        data: {},
      };
      const result = await restoreFromCloudData(cloudData);
      expect(result).toBe(true);
    });

    it('writes multiple keys', async () => {
      const cloudData: CloudSaveData = {
        version: 1,
        timestamp: Date.now(),
        deviceId: 'remote',
        data: {
          wordshift_home_progress: '{"amber":12,"dialogueIndicesV4":true}',
          wordshift_achievements: '{"unlocked":[]}',
        },
      };

      await restoreFromCloudData(cloudData);
      expect(JSON.parse((await AsyncStorage.getItem('wordshift_home_progress'))!).amber).toBe(12);
      expect(await AsyncStorage.getItem('wordshift_achievements')).toBe('{"unlocked":[]}');
    });
  });

  // ===========================================================================
  // uploadToCloud
  // ===========================================================================

  describe('uploadToCloud', () => {
    it('returns false when provider is not ready', async () => {
      expect(await uploadToCloud()).toBe(false);
    });

    it('calls provider.upload when ready', async () => {
      const mockUpload = jest.fn(async () => true);
      setCloudProvider(createMockProvider({ upload: mockUpload }));

      const result = await uploadToCloud();
      expect(result).toBe(true);
      expect(mockUpload).toHaveBeenCalledTimes(1);
    });

    it('passes CloudSaveData to upload', async () => {
      const mockUpload = jest.fn(async (_d?: any) => true);
      setCloudProvider(createMockProvider({ upload: mockUpload }));

      await uploadToCloud();
      const passedData = mockUpload.mock.calls[0][0];
      expect(passedData.version).toBe(1);
      expect(passedData.timestamp).toBeDefined();
      expect(passedData.deviceId).toBeDefined();
      expect(passedData.data).toBeDefined();
    });

    it('returns false when provider upload fails', async () => {
      setCloudProvider(createMockProvider({ upload: jest.fn(async () => false) }));
      const result = await uploadToCloud();
      expect(result).toBe(false);
    });

    it('updates sync status on success', async () => {
      setCloudProvider(createMockProvider());
      await uploadToCloud();
      const status = await getSyncStatus();
      expect(status.lastSyncSuccess).toBe(true);
      expect(status.lastSyncTimestamp).toBeGreaterThan(0);
    });

    it('updates sync status on failure', async () => {
      setCloudProvider(createMockProvider({ upload: async () => false }));
      await uploadToCloud();
      const status = await getSyncStatus();
      expect(status.lastSyncSuccess).toBe(false);
    });

    it('includes local data in upload', async () => {
      await AsyncStorage.setItem('wordshift_home_progress', '{"test": true}');
      const mockUpload = jest.fn(async (_d?: any) => true);
      setCloudProvider(createMockProvider({ upload: mockUpload }));

      await uploadToCloud();
      const passedData = mockUpload.mock.calls[0][0];
      expect(passedData.data['wordshift_home_progress']).toBe('{"test": true}');
    });

    it('clears pending changes on successful upload', async () => {
      setCloudProvider(createMockProvider());
      await markPendingChanges();
      await uploadToCloud();
      const status = await getSyncStatus();
      expect(status.pendingChanges).toBe(false);
    });

    it('keeps pending changes on failed upload', async () => {
      await markPendingChanges();
      setCloudProvider(createMockProvider({ upload: async () => false }));
      await uploadToCloud();
      const status = await getSyncStatus();
      expect(status.pendingChanges).toBe(true);
    });
  });

  // ===========================================================================
  // Upload conflict guard (multi-device last-writer-wins protection)
  // ===========================================================================

  describe('upload conflict guard', () => {
    /** Give this device a sync baseline (lastSyncTimestamp > 0) via a normal upload. */
    async function establishSyncBaseline(): Promise<void> {
      setCloudProvider(createMockProvider());
      expect(await uploadToCloud()).toBe(true);
    }

    it('skips the upload and flags a conflict when the server save is newer than the baseline', async () => {
      await establishSyncBaseline();

      // Another device has progressed since this device last synced.
      const mockUpload = jest.fn(async () => true);
      setCloudProvider(createMockProvider({
        upload: mockUpload,
        hasNewerSave: jest.fn(async () => true),
      }));

      const result = await uploadToCloud();
      expect(result).toBe(false);
      expect(mockUpload).not.toHaveBeenCalled();

      const status = await getSyncStatus();
      expect(status.conflictDetected).toBe(true);
      expect(status.pendingChanges).toBe(true);
    });

    it('a conflict skip preserves the sync baseline, so a retry still sees the conflict', async () => {
      await establishSyncBaseline();
      const baseline = (await getSyncStatus()).lastSyncTimestamp;
      expect(baseline).toBeGreaterThan(0);

      const hasNewer = jest.fn(async () => true);
      setCloudProvider(createMockProvider({ hasNewerSave: hasNewer }));

      await uploadToCloud();
      expect((await getSyncStatus()).lastSyncTimestamp).toBe(baseline);

      await uploadToCloud();
      expect(hasNewer).toHaveBeenLastCalledWith(baseline);
      expect((await getSyncStatus()).conflictDetected).toBe(true);
    });

    it('uploads normally when the server has nothing newer', async () => {
      await establishSyncBaseline();

      const mockUpload = jest.fn(async () => true);
      setCloudProvider(createMockProvider({
        upload: mockUpload,
        hasNewerSave: async () => false,
      }));

      expect(await uploadToCloud()).toBe(true);
      expect(mockUpload).toHaveBeenCalledTimes(1);
      expect((await getSyncStatus()).conflictDetected).toBe(false);
    });

    it('uploads unguarded when this device has no sync baseline (e.g. right after Reset All cleared the sync status)', async () => {
      // performFullReset clears the sync status BEFORE its deliberate
      // cloud-overwrite upload — the guard must not block that flow.
      const mockUpload = jest.fn(async () => true);
      const hasNewer = jest.fn(async () => true);
      setCloudProvider(createMockProvider({ upload: mockUpload, hasNewerSave: hasNewer }));

      expect(await uploadToCloud()).toBe(true);
      expect(mockUpload).toHaveBeenCalledTimes(1);
      expect(hasNewer).not.toHaveBeenCalled();
    });

    it('force upload bypasses the guard and clears the recorded conflict', async () => {
      await establishSyncBaseline();

      const mockUpload = jest.fn(async () => true);
      const hasNewer = jest.fn(async () => true);
      setCloudProvider(createMockProvider({ upload: mockUpload, hasNewerSave: hasNewer }));

      await uploadToCloud(); // flags the conflict
      expect((await getSyncStatus()).conflictDetected).toBe(true);
      expect(mockUpload).not.toHaveBeenCalled();

      expect(await uploadToCloud(true)).toBe(true);
      expect(mockUpload).toHaveBeenCalledTimes(1);
      expect(hasNewer).toHaveBeenCalledTimes(1); // force skipped the probe
      expect((await getSyncStatus()).conflictDetected).toBe(false);
    });

    it('a successful download/restore clears the recorded conflict', async () => {
      await establishSyncBaseline();

      setCloudProvider(createMockProvider({
        hasNewerSave: async () => true,
        download: async () => ({
          version: 1,
          timestamp: Date.now(),
          deviceId: 'other_device',
          data: {},
        }),
      }));

      await uploadToCloud();
      expect((await getSyncStatus()).conflictDetected).toBe(true);

      expect(await downloadFromCloud()).toBe(true);
      expect((await getSyncStatus()).conflictDetected).toBe(false);
    });

    it('a failing conflict probe refuses to overwrite an unknown remote state', async () => {
      await establishSyncBaseline();

      const mockUpload = jest.fn(async () => true);
      setCloudProvider(createMockProvider({
        upload: mockUpload,
        hasNewerSave: async () => { throw new Error('network down'); },
      }));

      expect(await uploadToCloud()).toBe(false);
      expect(mockUpload).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // downloadFromCloud
  // ===========================================================================

  describe('downloadFromCloud', () => {
    it('returns false when provider is not ready', async () => {
      expect(await downloadFromCloud()).toBe(false);
    });

    it('returns false when no cloud data available', async () => {
      setCloudProvider(createMockProvider({ download: async () => null }));
      expect(await downloadFromCloud()).toBe(false);
    });

    it('restores cloud data when available', async () => {
      const cloudData: CloudSaveData = {
        version: 1,
        timestamp: Date.now(),
        deviceId: 'cloud_device',
        data: { 'wordshift_home_progress': JSON.stringify({ amber: 777 }) },
      };

      setCloudProvider(createMockProvider({ download: async () => cloudData }));

      const result = await downloadFromCloud();
      expect(result).toBe(true);

      const progress = await AsyncStorage.getItem('wordshift_home_progress');
      expect(JSON.parse(progress!).amber).toBe(777);
    });

    it('updates sync status on success', async () => {
      const cloudData: CloudSaveData = {
        version: 1,
        timestamp: Date.now(),
        deviceId: 'test',
        data: {},
      };
      setCloudProvider(createMockProvider({ download: async () => cloudData }));

      await downloadFromCloud();
      const status = await getSyncStatus();
      expect(status.lastSyncSuccess).toBe(true);
    });
  });

  // ===========================================================================
  // checkForNewerSave
  // ===========================================================================

  describe('checkForNewerSave', () => {
    it('returns false when provider is not ready', async () => {
      expect(await checkForNewerSave()).toBe(false);
    });

    it('delegates to provider.hasNewerSave', async () => {
      const mockHasNewer = jest.fn(async () => true);
      setCloudProvider(createMockProvider({ hasNewerSave: mockHasNewer }));
      expect(await checkForNewerSave()).toBe(true);
      expect(mockHasNewer).toHaveBeenCalled();
    });

    it('returns false when provider says no newer save', async () => {
      setCloudProvider(createMockProvider({ hasNewerSave: async () => false }));
      expect(await checkForNewerSave()).toBe(false);
    });

    it('passes last sync timestamp to provider', async () => {
      const mockHasNewer = jest.fn(async () => false);
      setCloudProvider(createMockProvider({ hasNewerSave: mockHasNewer }));
      await checkForNewerSave();
      expect(mockHasNewer).toHaveBeenCalledWith(expect.any(Number));
    });
  });

  // ===========================================================================
  // getSyncStatus
  // ===========================================================================

  describe('getSyncStatus', () => {
    it('returns default status when none stored', async () => {
      const status = await getSyncStatus();
      expect(status.lastSyncTimestamp).toBe(0);
      expect(status.lastSyncSuccess).toBe(false);
      expect(status.pendingChanges).toBe(false);
    });

    it('returns cached status on subsequent calls', async () => {
      const status1 = await getSyncStatus();
      const status2 = await getSyncStatus();
      expect(status1).toBe(status2);
    });

    it('includes provider name', async () => {
      const status = await getSyncStatus();
      expect(typeof status.provider).toBe('string');
    });

    it('loads from storage after cache clear', async () => {
      const saved = {
        lastSyncTimestamp: 12345,
        lastSyncSuccess: true,
        pendingChanges: true,
        provider: 'TestProvider',
      };
      await clearSyncStatus();
      await AsyncStorage.setItem('wordshift_cloud_sync_status', JSON.stringify(saved));

      const status = await getSyncStatus();
      expect(status.lastSyncTimestamp).toBe(12345);
      expect(status.lastSyncSuccess).toBe(true);
      expect(status.pendingChanges).toBe(true);
    });
  });

  // ===========================================================================
  // markPendingChanges
  // ===========================================================================

  describe('markPendingChanges', () => {
    it('marks pending changes in sync status', async () => {
      await markPendingChanges();
      const status = await getSyncStatus();
      expect(status.pendingChanges).toBe(true);
    });

    it('persists to storage', async () => {
      await markPendingChanges();
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('preserves other status fields', async () => {
      const status = await getSyncStatus();
      const originalTimestamp = status.lastSyncTimestamp;
      await markPendingChanges();
      const updated = await getSyncStatus();
      expect(updated.lastSyncTimestamp).toBe(originalTimestamp);
    });
  });

  // ===========================================================================
  // clearSyncStatus
  // ===========================================================================

  describe('clearSyncStatus', () => {
    it('resets sync status', async () => {
      await markPendingChanges();
      await clearSyncStatus();
      const status = await getSyncStatus();
      expect(status.pendingChanges).toBe(false);
      expect(status.lastSyncTimestamp).toBe(0);
    });

    it('removes sync status key from storage', async () => {
      await clearSyncStatus();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('wordshift_cloud_sync_status');
    });

    it('removes device ID from storage', async () => {
      await collectLocalSaveData(); // generates device ID
      await clearSyncStatus();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('wordshift_device_id');
    });
  });

  // ===========================================================================
  // Integration: upload then download round-trip
  // ===========================================================================

  describe('integration', () => {
    it('round-trips data through upload and download', async () => {
      await AsyncStorage.setItem('wordshift_home_progress', JSON.stringify({ level: 42 }));

      let capturedData: CloudSaveData | null = null;
      const mock = createMockProvider({
        upload: jest.fn(async (data: CloudSaveData) => {
          capturedData = data;
          return true;
        }),
        download: jest.fn(async () => capturedData),
      });
      setCloudProvider(mock);

      await uploadToCloud();
      expect(capturedData).not.toBeNull();

      // Clear local data
      await AsyncStorage.clear();

      // Download and restore
      const result = await downloadFromCloud();
      expect(result).toBe(true);

      const progress = await AsyncStorage.getItem('wordshift_home_progress');
      expect(JSON.parse(progress!).level).toBe(42);
    });
  });
});

// The service owns a debounced telemetry timer; do not let it outlive its test environment.
afterAll(() => clearEvents());
