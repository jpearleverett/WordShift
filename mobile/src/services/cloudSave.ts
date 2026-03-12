import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cloud save infrastructure for WordShift.
 *
 * Provides the client-side data layer for cloud sync. The actual backend
 * (Firebase, Supabase, custom server) is abstracted behind a CloudProvider
 * interface so it can be swapped later.
 *
 * Current state: Uses a NoOpProvider that logs operations but doesn't
 * actually sync. When a real backend is connected, swap the provider.
 *
 * Save data includes: amber, stats, phase, unlocks, achievements,
 * dialogue progress, quest progress, cosmetics, and sacrifice state.
 */

// ============================================================================
// Types
// ============================================================================

export interface CloudSaveData {
  version: number;
  timestamp: number;
  deviceId: string;
  /** All AsyncStorage keys and their values */
  data: Record<string, string>;
}

export interface CloudProvider {
  /** Upload local save data to cloud */
  upload(data: CloudSaveData): Promise<boolean>;
  /** Download the latest save from cloud */
  download(): Promise<CloudSaveData | null>;
  /** Check if a newer save exists on the server */
  hasNewerSave(localTimestamp: number): Promise<boolean>;
  /** Get the provider name for display */
  getName(): string;
  /** Check if the provider is configured and ready */
  isReady(): Promise<boolean>;
}

export interface SyncStatus {
  lastSyncTimestamp: number;
  lastSyncSuccess: boolean;
  pendingChanges: boolean;
  provider: string;
}

// ============================================================================
// Storage Keys to Sync
// ============================================================================

/** All AsyncStorage keys that should be included in cloud saves */
const SYNC_KEYS = [
  'wordshift_progress',
  'wordshift_star_stats',
  'wordshift_achievements',
  'wordshift_share_count',
  'wordshift_word_history',
  'wordshift_daily_state',
  'wordshift_dialogue_sessions',
  'wordshift_settings',
  'wordshift_onboarding_step',
  'wordshift_tutorial_completed',
  'wordshift_schema_version',
  'wordshift_weekly_quests',
  'wordshift_daily_quests',
  'wordshift_whisper_gallery',
  'wordshift_sacrifices',
  'wordshift_notification_prefs',
  'wordshift_in_progress_puzzle',
  'wordshift_word_harvest',
];

const SYNC_STATUS_KEY = 'wordshift_cloud_sync_status';
const CURRENT_SAVE_VERSION = 1;

// ============================================================================
// No-Op Provider (placeholder until real backend is connected)
// ============================================================================

class NoOpProvider implements CloudProvider {
  async upload(_data: CloudSaveData): Promise<boolean> {
    console.log('[CloudSave] NoOp upload — no backend configured');
    return false;
  }
  async download(): Promise<CloudSaveData | null> {
    console.log('[CloudSave] NoOp download — no backend configured');
    return null;
  }
  async hasNewerSave(_localTimestamp: number): Promise<boolean> {
    return false;
  }
  getName(): string {
    return 'Not Connected';
  }
  async isReady(): Promise<boolean> {
    return false;
  }
}

// ============================================================================
// Cloud Save Manager
// ============================================================================

let provider: CloudProvider = new NoOpProvider();
let syncStatusCache: SyncStatus | null = null;

/**
 * Set the cloud save provider. Call this during app initialization
 * when a real backend is available.
 */
export function setCloudProvider(newProvider: CloudProvider): void {
  provider = newProvider;
}

/**
 * Get the current cloud provider.
 */
export function getCloudProvider(): CloudProvider {
  return provider;
}

/**
 * Generate a device ID for identifying save sources.
 */
async function getDeviceId(): Promise<string> {
  const key = 'wordshift_device_id';
  try {
    const existing = await AsyncStorage.getItem(key);
    if (existing) return existing;
    const id = `device_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    await AsyncStorage.setItem(key, id);
    return id;
  } catch {
    return `device_${Date.now()}`;
  }
}

/**
 * Collect all local save data into a CloudSaveData object.
 */
export async function collectLocalSaveData(): Promise<CloudSaveData> {
  const data: Record<string, string> = {};
  for (const key of SYNC_KEYS) {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        data[key] = value;
      }
    } catch {}
  }

  return {
    version: CURRENT_SAVE_VERSION,
    timestamp: Date.now(),
    deviceId: await getDeviceId(),
    data,
  };
}

/**
 * Restore save data from a CloudSaveData object.
 * Overwrites all local data with cloud data.
 */
export async function restoreFromCloudData(cloudData: CloudSaveData): Promise<boolean> {
  try {
    const entries = Object.entries(cloudData.data);
    // Write all keys from cloud data
    for (const [key, value] of entries) {
      await AsyncStorage.setItem(key, value);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Upload current local data to cloud.
 */
export async function uploadToCloud(): Promise<boolean> {
  const isReady = await provider.isReady();
  if (!isReady) return false;

  const saveData = await collectLocalSaveData();
  const success = await provider.upload(saveData);

  await updateSyncStatus(success);
  return success;
}

/**
 * Download and restore data from cloud.
 * Returns true if data was restored, false otherwise.
 */
export async function downloadFromCloud(): Promise<boolean> {
  const isReady = await provider.isReady();
  if (!isReady) return false;

  const cloudData = await provider.download();
  if (!cloudData) return false;

  const success = await restoreFromCloudData(cloudData);
  if (success) {
    await updateSyncStatus(true);
  }
  return success;
}

/**
 * Check if cloud has a newer save than local.
 */
export async function checkForNewerSave(): Promise<boolean> {
  const isReady = await provider.isReady();
  if (!isReady) return false;

  const status = await getSyncStatus();
  return provider.hasNewerSave(status.lastSyncTimestamp);
}

/**
 * Get current sync status.
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  if (syncStatusCache) return syncStatusCache;
  try {
    const stored = await AsyncStorage.getItem(SYNC_STATUS_KEY);
    if (stored) {
      syncStatusCache = JSON.parse(stored);
      return syncStatusCache!;
    }
  } catch {}
  syncStatusCache = {
    lastSyncTimestamp: 0,
    lastSyncSuccess: false,
    pendingChanges: false,
    provider: provider.getName(),
  };
  return syncStatusCache;
}

/**
 * Mark that local changes exist that haven't been synced.
 */
export async function markPendingChanges(): Promise<void> {
  const status = await getSyncStatus();
  status.pendingChanges = true;
  syncStatusCache = status;
  try {
    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
  } catch {}
}

// ============================================================================
// Internal
// ============================================================================

async function updateSyncStatus(success: boolean): Promise<void> {
  const status: SyncStatus = {
    lastSyncTimestamp: Date.now(),
    lastSyncSuccess: success,
    pendingChanges: !success,
    provider: provider.getName(),
  };
  syncStatusCache = status;
  try {
    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
  } catch {}
}

/**
 * Clear sync status (for Settings > Reset All).
 */
export async function clearSyncStatus(): Promise<void> {
  syncStatusCache = null;
  try {
    await AsyncStorage.removeItem(SYNC_STATUS_KEY);
    await AsyncStorage.removeItem('wordshift_device_id');
  } catch {}
}
