import AsyncStorage from '@react-native-async-storage/async-storage';
import { invalidateProgressCache } from './amberCurrency';
import { invalidatePuzzleStateCache } from './puzzleSaveState';
import { invalidateSettingsCache } from './settings';
import { invalidateStatsCache } from './starRating';
import { invalidateHintsCache } from './hints';
import { invalidateCosmeticsCache } from './cosmetics';
import { invalidateQuestCache } from './weeklyQuests';
import { invalidateHarvestCache } from './wordHarvest';
import { invalidateDailyProgressCache } from './dailyChallenge';
import { invalidateTendingCache } from './tending';
import { invalidateRoomUpgradeCache } from './roomUpgrades';
import { invalidateOfferingRequestCache } from './offeringRequests';
import { invalidateSessionsCache } from './dialogueSession';
import { invalidateDailyLoginCache } from './dailyLoginReward';
import { invalidateDailyAmberCache } from './dailyAmberReward';
import { invalidateMasteryCache } from './masteryRecords';
import { invalidateDailyLadderCache } from './dailyLadder';
import { invalidateWordHistoryCache } from './wordHistory';
import { invalidateSacrificeCache } from './sacrifice';
import { invalidateWhisperGalleryCache } from './whisperGallery';
import { invalidateChoiceCache } from './dialogueChoices';
import { invalidateNarrativeDeliveryCache } from './dialogue/animalDialogueNarrative';
import { invalidateMicroBeatCaches } from './phaseNarrative';
import { invalidateSupporterCache } from './supporterStipend';
import { invalidateSeasonPassCache } from './seasonPass';

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
  /**
   * True when an upload was skipped because the server holds a save newer
   * than this device's last sync point (another device has progressed since).
   * Cleared by a successful download/restore or a forced upload — never
   * auto-merged or auto-downloaded mid-session.
   */
  conflictDetected?: boolean;
}

// ============================================================================
// Storage Keys to Sync
// ============================================================================

/** All AsyncStorage keys that should be included in cloud saves */
// Keys are the ACTUAL AsyncStorage keys written by the services (verified against
// each service's STORAGE_KEY constant). Data-driven key FAMILIES (one key per
// puzzle bank, etc.) are covered by SYNC_KEY_PREFIXES below instead of being
// enumerated here. Device-specific keys (wordshift_device_id,
// wordshift_install_id), the local analytics buffer (wordshift_event_log), the ad
// pacing counter (wordshift_ad_pacing), the monetization soft-prompt pacing
// (wordshift_monet_prompts — device UX, like ad pacing), entitlements
// (wordshift_entitlements — restored authoritatively from the store, not the
// cloud), and the sync-status meta key are intentionally excluded.
export const SYNC_KEYS = [
  // Core progression & economy
  'wordshift_home_progress',
  'wordshift_amber_transactions',
  'wordshift_star_stats',
  'wordshift_achievements',
  'wordshift_room_upgrades',
  'wordshift_cosmetics',
  'wordshift_hints', // purchasable/earned hint balance — must follow the player
  'wordshift_supporter', // Supporter monthly-stipend delivery record — must not double-pay across devices
  'wordshift_season_pass', // season pass progress/claims/premium-unlock — follows the player
  // Streaks / sharing
  'wordshift_share_count',
  'wordshift_share_bonus_date',
  // Puzzle history & in-progress state
  'wordshift_word_history',
  'wordshift_word_harvest',
  'wordshift_in_progress_puzzle',
  'wordshift_mastery', // private solve-time trend + best speed round (skill records)
  // Daily challenge & quests
  'wordshift_daily_challenge',
  'wordshift_weekly_quests',
  'wordshift_daily_quests',
  'wordshift_daily_login',
  'wordshift_daily_amber',
  'wordshift_daily_ladder', // persistent local daily-ladder history (best this week / participation)
  // Narrative state
  'wordshift_dialogue_sessions',
  'wordshift_dialogue_choices',
  'wordshift_narrative_delivery',
  'wordshift_whisper_gallery',
  'wordshift_sacrifices',
  'wordshift_tending',
  'wordshift_offering_requests', // per-animal offering request / fulfillment state
  // Settings, onboarding & one-time intro flags
  'wordshift_settings',
  'wordshift_notification_prefs',
  'wordshift_onboarding_step',
  'wordshift_tutorial_completed',
  'wordshift_schema_version',
  'wordshift_notification_prompted',
  'wordshift_challenge_intro_seen',
  'wordshift_modifier_stacking_intro_seen',
  'wordshift_lexicon_intro_seen',
  'wordshift_daily_challenge_intro_seen',
  'wordshift_journal_intro_seen',
  'wordshift_setup_selector_intro_seen',
  'wordshift_pit_harvest_intro_seen',
  'wordshift_mandatory_harvest_seen',
  'wordshift_gated_unlock_intro_seen',
  'wordshift_harvest_home_intro_seen',
  'wordshift_fox_play_nudge_seen', // one-time Fox "here is Play" nudge
  'wordshift_pit_nudge_seen', // one-time pit-arrival nudge
  'wordshift_starter_intro_seen', // one-time Keeper's Welcome starter intro
  // The guaranteed first-free-victory glitch — the opening "something else is
  // here" promise. Its sibling one-time narrative flags were all synced and
  // this one was missed, so restoring onto a new device mid-game replayed a
  // Phase-0 beat under a dark sky. Caught by storageKeyRegistry.test.ts.
  'wordshift_first_win_glitch',
  'wordshift_micro_beats_seen',
  'wordshift_cycle_beats_seen', // New Cycle micro-beat seen set (per-cycle keyed)
];

/**
 * Prefix-synced key families: every AsyncStorage key starting with one of
 * these prefixes is included in cloud saves alongside SYNC_KEYS. Used where
 * the exact key set is data-driven and enumerating it above would silently
 * rot — currently the per-bank played-puzzle-id lists (puzzleBank.ts writes
 * one `wordshift_played_*` key per bank; without them a restore on a new
 * device forgets which bank puzzles were played and repeats them).
 */
export const SYNC_KEY_PREFIXES = ['wordshift_played_'];

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
    console.log('[CloudSave] NoOp upload - no backend configured');
    return false;
  }
  async download(): Promise<CloudSaveData | null> {
    console.log('[CloudSave] NoOp download - no backend configured');
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

/**
 * Row shape returned by the `get_save` RPC (docs/supabase/security_setup.sql).
 * Direct `saves` table access is RLS-denied — the owner id is the capability
 * presented to the SECURITY DEFINER functions, never selected back.
 */
interface SaveRow {
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
    // SECURITY DEFINER RPC — the only write path; returns true when stored.
    const result = await sb().sbRpc<boolean>('upsert_save', {
      p_owner: owner,
      p_version: data.version,
      p_timestamp: data.timestamp,
      p_device_id: data.deviceId,
      p_payload: JSON.stringify(data.data),
    });
    return result === true;
  }

  async download(): Promise<CloudSaveData | null> {
    const owner = await getCloudOwnerId();
    const result = await sb().sbRpc<SaveRow | SaveRow[] | null>('get_save', {
      p_owner: owner,
    });
    // PostgREST returns `returns table` results as an array; tolerate a bare
    // object defensively.
    const rows = Array.isArray(result) ? result : result ? [result] : [];
    if (rows.length === 0) return null;
    const newest = rows.reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
    if (typeof newest.payload !== 'string') return null;
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
    const remote = await sb().sbRpc<number | null>('get_save_timestamp', {
      p_owner: owner,
    });
    return typeof remote === 'number' && remote > localTimestamp;
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
  invalidateQuestCache();
  // Every remaining cloud-synced service with a module-level cache. A missing
  // entry here means a mid-session restore leaves a warm pre-restore cache
  // whose NEXT write silently overwrites the restored save — when adding a
  // synced key, add its invalidator.
  invalidateHarvestCache();
  invalidateDailyProgressCache();
  invalidateTendingCache();
  invalidateRoomUpgradeCache();
  invalidateOfferingRequestCache();
  invalidateSessionsCache();
  invalidateDailyLoginCache();
  invalidateDailyAmberCache();
  invalidateMasteryCache();
  invalidateDailyLadderCache();
  invalidateWordHistoryCache();
  invalidateSacrificeCache();
  invalidateWhisperGalleryCache();
  invalidateChoiceCache();
  invalidateNarrativeDeliveryCache();
  invalidateMicroBeatCaches();
  invalidateSupporterCache();
  invalidateSeasonPassCache();
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

  // Prefix-synced key families (e.g. the per-bank played-puzzle-id lists) —
  // resolved dynamically from the actual stored keys, so new banks are picked
  // up without touching SYNC_KEYS.
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    for (const key of allKeys) {
      if (key in data) continue;
      if (!SYNC_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) continue;
      try {
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
          data[key] = value;
        }
      } catch {}
    }
  } catch {}

  return {
    version: CURRENT_SAVE_VERSION,
    timestamp: Date.now(),
    deviceId: await getDeviceId(),
    data,
  };
}

/**
 * Restore save data from a CloudSaveData object.
 * Overwrites all local data with cloud data. Writes every key present in the
 * payload, so prefix-synced keys (SYNC_KEY_PREFIXES) restore with no extra
 * handling.
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
 *
 * Conflict guard: when this device has a sync baseline (it has synced or
 * restored before) and the server save is newer than that baseline, another
 * device has progressed since — a silent last-writer-wins upload would
 * clobber it. The upload is skipped and `conflictDetected` is recorded in the
 * sync status instead (no auto-merge, no auto-download mid-session). A
 * successful download/restore clears the conflict; `force` bypasses the guard
 * for deliberate-overwrite flows. A device with NO baseline
 * (lastSyncTimestamp === 0 — e.g. right after Reset All clears the sync
 * status to deliberately overwrite the cloud row) uploads unguarded, since
 * there is nothing to compare against.
 */
// While the fresh-install boot restore is in flight, background uploads must
// wait: MainApp mounts an upload on launch, and on a slow first launch it
// would otherwise push the near-empty fresh-install state over the very cloud
// row the restore is still downloading. Capped so a hung promise can never
// wedge uploads for the whole session.
let uploadHold: Promise<unknown> | null = null;
const UPLOAD_HOLD_CAP_MS = 15000;

export function holdUploadsUntil(promise: Promise<unknown>): void {
  uploadHold = Promise.race([
    promise.catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, UPLOAD_HOLD_CAP_MS)),
  ]).finally(() => {
    uploadHold = null;
  });
}

export async function uploadToCloud(force: boolean = false): Promise<boolean> {
  const isReady = await provider.isReady();
  if (!isReady) return false;
  if (uploadHold) await uploadHold;

  if (!force) {
    try {
      const status = await getSyncStatus();
      if (status.lastSyncTimestamp > 0) {
        const serverIsNewer = await provider.hasNewerSave(status.lastSyncTimestamp);
        if (serverIsNewer) {
          await recordSyncConflict();
          return false;
        }
      }
    } catch {
      // The conflict probe must never block an upload path that used to work;
      // fall through to the plain upload.
    }
  }

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
    conflictDetected: false,
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
  // The baseline (lastSyncTimestamp) advances ONLY on success. A failed
  // upload/restore must keep the previous baseline: the newer-save conflict
  // guard compares the server's timestamp against this value, and stamping
  // Date.now() on failure (e.g. every offline victory's background upload)
  // would inflate the baseline past any newer save already on the server,
  // permanently blinding the guard to that conflict.
  const previous = syncStatusCache ?? (await getSyncStatus());
  const status: SyncStatus = {
    lastSyncTimestamp: success ? Date.now() : previous.lastSyncTimestamp,
    lastSyncSuccess: success,
    pendingChanges: !success,
    provider: provider.getName(),
    // A successful sync (upload or restore) resolves any recorded conflict;
    // a failed one leaves it standing.
    conflictDetected: success ? false : previous.conflictDetected === true,
  };
  syncStatusCache = status;
  try {
    await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
  } catch {}
}

/**
 * Record a skipped-upload conflict WITHOUT advancing the sync baseline —
 * bumping lastSyncTimestamp here would mask the very conflict on retry.
 */
async function recordSyncConflict(): Promise<void> {
  const current = await getSyncStatus();
  const status: SyncStatus = {
    ...current,
    lastSyncSuccess: false,
    pendingChanges: true,
    conflictDetected: true,
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
