import AsyncStorage from '@react-native-async-storage/async-storage';
import { invalidateProgressCache } from './amberCurrency';
import { invalidatePuzzleStateCache } from './puzzleSaveState';
import { invalidateSettingsCache } from './settings';
import { invalidateStatsCache } from './starRating';
import { invalidateHintsCache } from './hints';
import { invalidateCosmeticsCache } from './cosmetics';

/**
 * Cloud save infrastructure for WordShift.
 *
 * Provides the client-side data layer for cloud sync. The actual backend
 * (Firebase, Supabase, custom server) is abstracted behind a CloudProvider
 * interface so it can be swapped later.
 *
 * Default: a NoOpProvider that logs operations but doesn't actually sync.
 * When Supabase credentials are configured (app.json `extra`), App bootstrap
 * calls installCloudProviderIfConfigured() to swap in SupabaseCloudProvider.
 *
 * Save data includes: amber, stats, phase, unlocks, achievements,
 * dialogue progress, quest progress, cosmetics, and sacrifice state.
 *
 * Auth-free identity: the cloud "owner" is the anonymous install id by
 * default, overridable by a locally-stored recovery code so a player can
 * restore progress on a new device without an account.
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
// Keys are the ACTUAL AsyncStorage keys written by the services (verified against
// each service's STORAGE_KEY constant). Device-specific keys (wordshift_device_id,
// wordshift_install_id), the local analytics buffer (wordshift_event_log), the ad
// pacing counter (wordshift_ad_pacing), the monetization soft-prompt pacing
// (wordshift_monet_prompts — device UX, like ad pacing), entitlements
// (wordshift_entitlements — restored authoritatively from the store, not the
// cloud), and the sync-status meta key are intentionally excluded.
const SYNC_KEYS = [
  // Core progression & economy
  'wordshift_home_progress',
  'wordshift_amber_transactions',
  'wordshift_star_stats',
  'wordshift_achievements',
  'wordshift_room_upgrades',
  'wordshift_cosmetics',
  'wordshift_hints', // purchasable/earned hint balance — must follow the player
  // Streaks / sharing
  'wordshift_share_count',
  'wordshift_share_bonus_date',
  // Puzzle history & in-progress state
  'wordshift_word_history',
  'wordshift_word_harvest',
  'wordshift_in_progress_puzzle',
  // Daily challenge & quests
  'wordshift_daily_challenge',
  'wordshift_weekly_quests',
  'wordshift_daily_quests',
  'wordshift_daily_login',
  // Narrative state
  'wordshift_dialogue_sessions',
  'wordshift_dialogue_choices',
  'wordshift_whisper_gallery',
  'wordshift_sacrifices',
  'wordshift_tending',
  // Settings, onboarding & one-time intro flags
  'wordshift_settings',
  'wordshift_notification_prefs',
  'wordshift_onboarding_step',
  'wordshift_tutorial_completed',
  'wordshift_schema_version',
  'wordshift_notification_prompted',
  'wordshift_challenge_intro_seen',
  'wordshift_daily_challenge_intro_seen',
  'wordshift_journal_intro_seen',
  'wordshift_setup_selector_intro_seen',
  'wordshift_pit_harvest_intro_seen',
  'wordshift_micro_beats_seen',
];

const SYNC_STATUS_KEY = 'wordshift_cloud_sync_status';
const CURRENT_SAVE_VERSION = 1;

/** Local override for the cloud owner id (set when linking a recovery code). */
const CLOUD_OWNER_KEY = 'wordshift_cloud_owner';
/** A populated progress key signals this install is NOT a fresh reinstall. */
const FRESH_INSTALL_SENTINEL_KEY = 'wordshift_home_progress';

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
// Supabase Cloud Provider (real backend, installed when configured)
// ============================================================================

/** Shape of a row in the `saves` table. */
interface SaveRow {
  owner: string;
  version: number;
  timestamp: number;
  device_id: string;
  payload: string;
}

/**
 * Lazy-require the Supabase client with its real types preserved, so this
 * module still loads in Node test environments (where expo-constants and the
 * client's transitive deps may not resolve at import time).
 */
function sb(): typeof import('./supabaseClient') {
  return require('./supabaseClient');
}

/**
 * Resolve the stable cloud owner id for this install: a locally-stored
 * recovery-code override if present, else the anonymous install id.
 */
export async function getCloudOwnerId(): Promise<string> {
  try {
    const override = await AsyncStorage.getItem(CLOUD_OWNER_KEY);
    if (override && override.trim()) return override.trim();
  } catch {}
  return sb().getBackendIdentity();
}

class SupabaseCloudProvider implements CloudProvider {
  async upload(data: CloudSaveData): Promise<boolean> {
    const owner = await getCloudOwnerId();
    const row = {
      owner,
      version: data.version,
      timestamp: data.timestamp,
      device_id: data.deviceId,
      payload: JSON.stringify(data.data),
    };
    const result = await sb().sbInsert<SaveRow>('saves', row, {
      upsert: true,
      onConflict: 'owner',
      returning: false,
    });
    return result !== null;
  }

  async download(): Promise<CloudSaveData | null> {
    const owner = await getCloudOwnerId();
    const rows = await sb().sbSelect<SaveRow>(
      'saves',
      `select=*&owner=eq.${encodeURIComponent(owner)}`,
    );
    if (!rows || rows.length === 0) return null;
    // Reconstruct the newest row (defensive — owner is a unique key, but a
    // stale duplicate should never win).
    const newest = rows.reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
    let parsed: Record<string, string> = {};
    try {
      const obj = JSON.parse(newest.payload);
      if (obj && typeof obj === 'object') parsed = obj as Record<string, string>;
    } catch {
      return null;
    }
    return {
      version: typeof newest.version === 'number' ? newest.version : CURRENT_SAVE_VERSION,
      timestamp: typeof newest.timestamp === 'number' ? newest.timestamp : 0,
      deviceId: typeof newest.device_id === 'string' ? newest.device_id : '',
      data: parsed,
    };
  }

  async hasNewerSave(localTimestamp: number): Promise<boolean> {
    const owner = await getCloudOwnerId();
    const rows = await sb().sbSelect<{ timestamp: number }>(
      'saves',
      `select=timestamp&owner=eq.${encodeURIComponent(owner)}`,
    );
    if (!rows || rows.length === 0) return false;
    const remoteMax = rows.reduce((max, r) => (r.timestamp > max ? r.timestamp : max), 0);
    return remoteMax > localTimestamp;
  }

  getName(): string {
    return 'Supabase';
  }

  async isReady(): Promise<boolean> {
    return sb().isSupabaseConfigured();
  }
}

/**
 * Install the real Supabase provider IFF credentials are configured. Safe to
 * call unconditionally (a no-op when unconfigured — NoOp stays the default).
 * Call once during App bootstrap.
 */
export function installCloudProviderIfConfigured(): void {
  try {
    if (sb().isSupabaseConfigured()) {
      setCloudProvider(new SupabaseCloudProvider());
    }
  } catch {
    // Never let provider installation break launch.
  }
}

// ============================================================================
// Recovery Code (auth-free cross-device restore)
// ============================================================================

// Crockford-style alphabet minus ambiguous chars (no 0/O, 1/I/L).
const RECOVERY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** Normalize user-entered codes: uppercase, strip non-alphanumerics. */
function normalizeRecoveryCode(raw: string): string {
  return (raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Chunk an 8-char canonical body into the friendly WS-XXXX-XXXX form. */
function formatRecoveryCode(body: string): string {
  return `WS-${body.slice(0, 4)}-${body.slice(4, 8)}`;
}

/**
 * Deterministically derive the canonical 8-char recovery BODY from an owner
 * id. Idempotent: if `owner` is already a canonical 8-char body (e.g. it was
 * itself produced here on a prior call), it is returned unchanged — so the
 * displayed code never drifts across calls.
 */
function deriveRecoveryBody(owner: string): string {
  const cleaned = normalizeRecoveryCode(owner);
  if (cleaned.length === 8) return cleaned;
  let base = cleaned;
  if (base.length < 8) {
    // Pad deterministically from a simple rolling hash of the owner.
    let h = 0;
    for (let i = 0; i < owner.length; i++) {
      h = (h * 31 + owner.charCodeAt(i)) >>> 0;
    }
    let pad = '';
    while (base.length + pad.length < 8) {
      pad += RECOVERY_ALPHABET[h % RECOVERY_ALPHABET.length];
      h = Math.floor(h / RECOVERY_ALPHABET.length) || ((h * 31 + 7) >>> 0);
    }
    base = base + pad;
  }
  return base.slice(0, 8);
}

/**
 * Return a stable, human-friendly recovery code for this install, persisting
 * the canonical 8-char body as the cloud owner so the code — and the cloud
 * identity it represents — remain constant across calls and across reinstalls
 * that link the same code. Showing this code lets the player restore on another
 * device via linkRecoveryCode().
 *
 * Note: viewing the code locks in the canonical body as the owner. Because this
 * is intended to run in App bootstrap (before any cloud write), the cloud
 * identity stabilizes to the code body up front, so the code always addresses
 * the same `saves` row.
 */
export async function getOrCreateRecoveryCode(): Promise<string> {
  // If a canonical owner is already stored, the code is just its chunked form.
  try {
    const existing = await AsyncStorage.getItem(CLOUD_OWNER_KEY);
    if (existing && existing.trim()) {
      return formatRecoveryCode(deriveRecoveryBody(existing.trim()));
    }
  } catch {}

  const owner = await getCloudOwnerId();
  const body = deriveRecoveryBody(owner);
  try {
    await AsyncStorage.setItem(CLOUD_OWNER_KEY, body);
  } catch {}
  return formatRecoveryCode(body);
}

/**
 * Link a recovery code entered by the player: validate/normalize and store it
 * as the cloud owner override, so subsequent owner resolution uses it. After
 * linking, call downloadFromCloud() (or maybeAutoRestoreOnFreshInstall) to pull
 * the linked save. Returns false for clearly-invalid input.
 */
export async function linkRecoveryCode(code: string): Promise<boolean> {
  const canonical = normalizeRecoveryCode(code);
  if (canonical.length < 8) return false;
  try {
    await AsyncStorage.setItem(CLOUD_OWNER_KEY, canonical);
    return true;
  } catch {
    return false;
  }
}

/**
 * On a fresh install (no local progress) with cloud configured, pull down a
 * cloud save for this owner if one exists. Returns whether a restore happened.
 * Call from App bootstrap before MainApp mounts. Never throws.
 */
export async function maybeAutoRestoreOnFreshInstall(): Promise<boolean> {
  try {
    if (!sb().isSupabaseConfigured()) return false;

    // Only auto-restore when local progress looks empty.
    const local = await AsyncStorage.getItem(FRESH_INSTALL_SENTINEL_KEY);
    if (local && local.trim()) return false;

    const cloudData = await provider.download();
    if (!cloudData) return false;

    const restored = await restoreFromCloudData(cloudData);
    if (restored) {
      await updateSyncStatus(true);
    }
    return restored;
  } catch {
    return false;
  }
}

// ============================================================================
// Cloud Save Manager
// ============================================================================

let provider: CloudProvider = new NoOpProvider();
let syncStatusCache: SyncStatus | null = null;

function invalidateRestoredServiceCaches(): void {
  invalidateProgressCache();
  invalidateStatsCache();
  invalidatePuzzleStateCache();
  invalidateSettingsCache();
  invalidateHintsCache();
  invalidateCosmeticsCache();
}

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
    invalidateRestoredServiceCaches();
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
    await AsyncStorage.removeItem(CLOUD_OWNER_KEY);
  } catch {}
}
