import AsyncStorage from '@react-native-async-storage/async-storage';
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
} from '../services/cloudSave';

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
      await AsyncStorage.setItem('wordshift_progress', JSON.stringify({ amber: 100 }));
      await AsyncStorage.setItem('wordshift_star_stats', JSON.stringify({ total: 50 }));

      const data = await collectLocalSaveData();
      expect(data.data['wordshift_progress']).toBeDefined();
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
        'wordshift_progress',
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
      await AsyncStorage.setItem('wordshift_progress', value);

      const data = await collectLocalSaveData();
      expect(data.data['wordshift_progress']).toBe(value);
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
          'wordshift_progress': JSON.stringify({ amber: 500 }),
          'wordshift_star_stats': JSON.stringify({ total: 200 }),
        },
      };

      const success = await restoreFromCloudData(cloudData);
      expect(success).toBe(true);

      const progress = await AsyncStorage.getItem('wordshift_progress');
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
      await AsyncStorage.setItem('wordshift_progress', JSON.stringify({ amber: 100 }));

      const cloudData: CloudSaveData = {
        version: 1,
        timestamp: Date.now(),
        deviceId: 'test',
        data: {
          'wordshift_progress': JSON.stringify({ amber: 999 }),
        },
      };

      await restoreFromCloudData(cloudData);
      const progress = await AsyncStorage.getItem('wordshift_progress');
      expect(JSON.parse(progress!).amber).toBe(999);
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
          wordshift_progress: '"progress_data"',
          wordshift_achievements: '"achievement_data"',
        },
      };

      await restoreFromCloudData(cloudData);
      expect(await AsyncStorage.getItem('wordshift_progress')).toBe('"progress_data"');
      expect(await AsyncStorage.getItem('wordshift_achievements')).toBe('"achievement_data"');
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
      await AsyncStorage.setItem('wordshift_progress', '{"test": true}');
      const mockUpload = jest.fn(async (_d?: any) => true);
      setCloudProvider(createMockProvider({ upload: mockUpload }));

      await uploadToCloud();
      const passedData = mockUpload.mock.calls[0][0];
      expect(passedData.data['wordshift_progress']).toBe('{"test": true}');
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
        data: { 'wordshift_progress': JSON.stringify({ amber: 777 }) },
      };

      setCloudProvider(createMockProvider({ download: async () => cloudData }));

      const result = await downloadFromCloud();
      expect(result).toBe(true);

      const progress = await AsyncStorage.getItem('wordshift_progress');
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
      await AsyncStorage.setItem('wordshift_progress', JSON.stringify({ level: 42 }));

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

      const progress = await AsyncStorage.getItem('wordshift_progress');
      expect(JSON.parse(progress!).level).toBe(42);
    });
  });
});
