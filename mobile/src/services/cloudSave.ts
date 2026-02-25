import { storage } from './storage';

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
  /** All storage keys and their values */
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

/** All storage keys that should be included in cloud saves */
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
function getDeviceId(): string {
  const key = 'wordshift_device_id';
  const existing = storage.getString(key);
  if (existing !== undefined) return existing;
  const id = `device_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  storage.set(key, id);
  return id;
}

/**
 * Collect all local save data into a CloudSaveData object.
 */
export function collectLocalSaveData(): CloudSaveData {
  const data: Record<string, string> = {};
  for (const key of SYNC_KEYS) {
    const value = storage.getString(key);
    if (value !== undefined) {
      data[key] = value;
    }
  }

  return {
    version: CURRENT_SAVE_VERSION,
    timestamp: Date.now(),
    deviceId: getDeviceId(),
    data,
  };
}

/**
 * Restore save data from a CloudSaveData object.
 * Overwrites all local data with cloud data.
 */
export function restoreFromCloudData(cloudData: CloudSaveData): boolean {
  const entries = Object.entries(cloudData.data);
  for (const [key, value] of entries) {
    storage.set(key, value);
  }
  return true;
}

/**
 * Upload current local data to cloud.
 */
export async function uploadToCloud(): Promise<boolean> {
  const isReady = await provider.isReady();
  if (!isReady) return false;

  const saveData = collectLocalSaveData();
  const success = await provider.upload(saveData);

  updateSyncStatus(success);
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

  const success = restoreFromCloudData(cloudData);
  if (success) {
    updateSyncStatus(true);
  }
  return success;
}

/**
 * Check if cloud has a newer save than local.
 */
export async function checkForNewerSave(): Promise<boolean> {
  const isReady = await provider.isReady();
  if (!isReady) return false;

  const status = getSyncStatus();
  return provider.hasNewerSave(status.lastSyncTimestamp);
}

/**
 * Get current sync status.
 */
export function getSyncStatus(): SyncStatus {
  const stored = storage.getString(SYNC_STATUS_KEY);
  if (stored !== undefined) {
    return JSON.parse(stored);
  }
  return {
    lastSyncTimestamp: 0,
    lastSyncSuccess: false,
    pendingChanges: false,
    provider: provider.getName(),
  };
}

/**
 * Mark that local changes exist that haven't been synced.
 */
export function markPendingChanges(): void {
  const status = getSyncStatus();
  status.pendingChanges = true;
  storage.set(SYNC_STATUS_KEY, JSON.stringify(status));
}

// ============================================================================
// Internal
// ============================================================================

function updateSyncStatus(success: boolean): void {
  const status: SyncStatus = {
    lastSyncTimestamp: Date.now(),
    lastSyncSuccess: success,
    pendingChanges: !success,
    provider: provider.getName(),
  };
  storage.set(SYNC_STATUS_KEY, JSON.stringify(status));
}

/**
 * Clear sync status (for Settings > Reset All).
 */
export function clearSyncStatus(): void {
  storage.remove(SYNC_STATUS_KEY);
  storage.remove('wordshift_device_id');
}
