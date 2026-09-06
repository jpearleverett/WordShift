import AsyncStorage, { runStorageTransaction, StorageRecoveryRequiredError } from './persistenceStorage';
import { createSecureIdentity, isSecureIdentity, formatSecureRecoveryCode, parseSecureRecoveryCode } from './secureIdentity';
import { CURRENT_SCHEMA_VERSION, runMigrations } from './dataMigration';
import { getSupportMetadata } from './supportIdentity';
import { logEvent } from './eventLogger';
import { invalidateStoryCache, STORY_STORAGE_KEY } from './storySpine';
import { invalidateProgressCache } from './amberCurrency';
import { invalidatePuzzleStateCache } from './puzzleSaveState';
import { invalidateSettingsCache } from './settings';
import { invalidateStatsCache } from './starRating';
import { invalidateHintsCache , initHints } from './hints';
import { invalidateCosmeticsCache , initCosmetics } from './cosmetics';
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
import { invalidateAchievementsCache } from './achievements';
import { invalidateOnboardingCache } from './onboarding';
import { invalidateNotificationCaches } from './notifications';
import { invalidatePlayedPuzzleCaches } from './puzzleBank';

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
 * Account-free backups use a separate 128-bit bearer identity. The full WS2
 * recovery code can restore that backup on a new device; anonymous analytics
 * identity and non-secret support references do not authorize backup access.
 */

// ============================================================================
// Types
// ============================================================================

export interface CloudSaveData {
  version: number;
  timestamp: number;
  /** Server revision, never a device clock. */
  revision?: number;
  deviceId: string;
  /** All AsyncStorage keys and their values */
  data: Record<string, string>;
}

export interface CloudProvider {
  /** Upload local save data to cloud */
  upload(data: CloudSaveData): Promise<boolean>;
  /** Download the latest save from cloud */
  download(owner?: string): Promise<CloudSaveData | null>;
  uploadConditional?(data: CloudSaveData, expectedRevision: number | null, force: boolean, owner?: string): Promise<{ status: 'saved' | 'conflict' | 'unavailable'; revision?: number }>;
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
  remoteRevision?: number;
  owner?: string;
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
  STORY_STORAGE_KEY,
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
export const SYNC_KEY_PREFIXES = [
  'wordshift_played_',
  // The four `wordshift_guaranteed_crossref_phase_N` flags (amberCurrency)
  // mark the once-per-phase forced cross-animal reference as delivered. They
  // are built as template literals, so the storage-key guard's literal scan
  // could not see them and they were never registered anywhere: after a
  // restore, a mid-game player was served that once-per-phase beat again for
  // every phase already passed. Same class as wordshift_first_win_glitch
  // below, which is exactly what that guard was added to prevent.
  'wordshift_guaranteed_crossref_phase_',
];

/**
 * Mirrored from SettingsScreen rather than imported: a service must not import
 * from a component (import cycle). SettingsScreen owns the write; this file
 * only reads it. Deliberately unsynced and deliberately survives Reset All —
 * see its entry in storageKeyRegistry.test.ts.
 */
const LOCAL_RESET_MARKER_KEY = 'wordshift_local_reset_at';

const SYNC_STATUS_KEY = 'wordshift_cloud_sync_status';
const CURRENT_SAVE_VERSION = 1;

/** Local override for the cloud owner id (set when linking a recovery code). */
const CLOUD_OWNER_KEY = 'wordshift_cloud_owner';
export const LEGACY_CLOUD_OWNER_KEY = 'wordshift_cloud_legacy_owner';
let ownerCreation: Promise<string> | null = null;
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
 * Row shape returned by the `get_save_v2` RPC (docs/supabase/security_setup.sql).
 * Direct `saves` table access is RLS-denied — the owner id is the capability
 * presented to the SECURITY DEFINER functions, never selected back.
 */
interface SaveRow {
  revision?: number;
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
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- Defer this dependency to preserve native availability and import-cycle boundaries.
  return require('./supabaseClient');
}

/**
 * Resolve the stable cloud owner id for this install: a locally-stored
 * strong recovery capability. Preserve a legacy reference without importing
 * ambiguous old short-code rows.
 */
export async function getCloudOwnerId(): Promise<string> {
  if (ownerCreation) return ownerCreation;
  ownerCreation = (async () => {
    const existing = await AsyncStorage.getItem(CLOUD_OWNER_KEY);
    if (isSecureIdentity(existing)) return existing;
    // Keep the legacy reference for support. Never read/merge a short code's
    // cloud row automatically: unrelated installs may already share that row.
    const legacy = existing || await sb().getBackendIdentity();
    const owner = await createSecureIdentity();
    if (legacy) await AsyncStorage.setItem(LEGACY_CLOUD_OWNER_KEY, legacy);
    await AsyncStorage.setItem(CLOUD_OWNER_KEY, owner);
    return owner;
  })();
  try { return await ownerCreation; } finally { ownerCreation = null; }
}

class SupabaseCloudProvider implements CloudProvider {
  async upload(data: CloudSaveData): Promise<boolean> {
    return (await this.uploadConditional(data, data.revision ?? null, false)).status === 'saved';
  }

  async uploadConditional(data: CloudSaveData, expectedRevision: number | null, force: boolean, owner?: string) {
    const support = await getSupportMetadata();
    const result = await sb().sbRpc<{ status: 'saved' | 'conflict'; revision: number }>('upsert_save_v2', {
      p_owner: owner ?? await getCloudOwnerId(), p_version: data.version,
      p_timestamp: data.timestamp, p_device_id: data.deviceId,
      p_payload: JSON.stringify(data.data), p_expected_revision: expectedRevision,
      p_force: force, p_support_id: support.supportId, p_install_id: support.installId,
    });
    if (!result || !['saved', 'conflict'].includes(result.status) || !Number.isSafeInteger(result.revision)) {
      return { status: 'unavailable' as const };
    }
    return result;
  }

  async download(owner?: string): Promise<CloudSaveData | null> {
    const result = await sb().sbRpc<SaveRow[]>('get_save_v2', { p_owner: owner ?? await getCloudOwnerId() });
    const row = Array.isArray(result) ? result[0] : null;
    if (!row || typeof row.payload !== 'string' || !Number.isSafeInteger(row.revision)) return null;
    try {
      const save = { version: row.version, timestamp: row.timestamp, deviceId: row.device_id,
        revision: row.revision, data: JSON.parse(row.payload) };
      return validateCloudSaveData(save) ? save : null;
    } catch { return null; }
  }

  async hasNewerSave(localTimestamp: number): Promise<boolean> {
    const save = await this.download();
    return !!save && save.timestamp > localTimestamp;
  }
  getName(): string { return 'Supabase'; }
  async isReady(): Promise<boolean> { return sb().isSupabaseConfigured(); }
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

export type CloudRecoveryFailure = 'legacy_code' | 'invalid_code' | 'unavailable' | 'conflict';
export class CloudRecoveryError extends Error {
  constructor(public readonly reason: CloudRecoveryFailure, message: string) { super(message); }
}

/** Reveal a credential only after its backup is durable on the server. */
export async function getOrCreateRecoveryCode(): Promise<string> {
  if (!(await uploadToCloud())) {
    const status = await getSyncStatus();
    throw new CloudRecoveryError(status.conflictDetected ? 'conflict' : 'unavailable',
      status.conflictDetected ? 'Resolve the newer backup before sharing a recovery code.' :
      'Connect to the internet and back up successfully before showing your recovery code.');
  }
  return formatSecureRecoveryCode(await getCloudOwnerId());
}

function recoveryOwner(code: string): string {
  const owner = parseSecureRecoveryCode(code);
  if (owner) return owner;
  if (/^(WS[-\s]?)?[a-z0-9]{4}[-\s]?[a-z0-9]{4}$/i.test(code.trim())) {
    throw new CloudRecoveryError('legacy_code',
      'This older short code needs an upgrade. Open the game on your original device and show a new recovery code. If that device is unavailable, contact support; your old backup has not been deleted.');
  }
  throw new CloudRecoveryError('invalid_code', 'Enter the complete WS2 recovery code from your other device.');
}

/** Kept for callers during upgrade; linking now includes the validated restore. */
export async function linkRecoveryCode(code: string): Promise<boolean> {
  return restoreFromRecoveryCode(code);
}

export async function restoreFromRecoveryCode(code: string): Promise<boolean> {
  const owner = recoveryOwner(code);
  return enqueueCloudOperation(async () => {
    if (!(await provider.isReady())) return false;
    const cloudData = await provider.download(owner);
    if (!cloudData) return false;
    const restored = await restoreFromCloudData(cloudData, owner);
    if (restored) await updateSyncStatus(true, cloudData, owner);
    return restored;
  });
}

/**
 * On a fresh install (no local progress) with cloud configured, pull down a
 * cloud save for this owner if one exists. Returns whether a restore happened.
 * Call from App bootstrap before MainApp mounts. A committed restore that
 * needs journal recovery throws so bootstrap cannot open a partial save.
 */
export async function maybeAutoRestoreOnFreshInstall(shouldContinue: () => boolean = () => true): Promise<boolean> {
  try {
    if (!shouldContinue()) return false;
    if (!sb().isSupabaseConfigured()) return false;

    // Only auto-restore when local progress looks empty.
    const local = await AsyncStorage.getItem(FRESH_INSTALL_SENTINEL_KEY);
    if (local && local.trim()) return false;

    let cloudData = await provider.download();
    if (!cloudData && provider instanceof SupabaseCloudProvider) {
      const legacy = await AsyncStorage.getItem(LEGACY_CLOUD_OWNER_KEY);
      if (legacy && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(legacy)) {
        const rows = await sb().sbRpc<SaveRow[]>('get_legacy_save_for_upgrade', { p_owner: legacy });
        const row = rows?.[0];
        if (row) {
          try {
            const save = { version: row.version, timestamp: row.timestamp, deviceId: row.device_id, data: JSON.parse(row.payload) };
            if (validateCloudSaveData(save)) cloudData = save;
          } catch { /* Keep original local state on invalid legacy data. */ }
        }
      }
    }
    if (!cloudData || !shouldContinue()) return false;

    // A pending deliberate reset blocks automatic restore regardless of device
    // clock skew. Only a successful reset upload or an explicit player restore
    // may replace that choice; remote wall-clock timestamps cannot authorize it.
    const resetMarker = await AsyncStorage.getItem(LOCAL_RESET_MARKER_KEY);
    if (resetMarker) return false;

    const restored = await restoreFromCloudData(cloudData, undefined, shouldContinue);
    if (restored) {
      await updateSyncStatus(true, cloudData);
    }
    return restored;
  } catch (error) {
    if (error instanceof StorageRecoveryRequiredError) throw error;
    return false;
  }
}

// ============================================================================
// Cloud Save Manager
// ============================================================================

let provider: CloudProvider = new NoOpProvider();
let syncStatusCache: SyncStatus | null = null;

export function invalidateRestoredServiceCaches(): void {
  invalidateStoryCache();
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
  // These four owned a synced key with a module cache and no invalidator at
  // all, each with its own way of eating a restore: achievements re-unlocked
  // and re-paid everything the other device had earned (and dropped the
  // streak achievements, whose check() is a current-state predicate), the
  // onboarding step put a restored player back into the first-run tutorial,
  // the notification prefs wrote this device's switches back over the
  // restored ones, and the per-bank played lists re-served boards the player
  // had already solved.
  invalidateAchievementsCache();
  invalidateOnboardingCache();
  invalidateNotificationCaches();
  invalidatePlayedPuzzleCaches();
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
  const keys = new Set([...SYNC_KEYS, ...(await AsyncStorage.getAllKeys()).filter(isSyncedKey)]);
  const data: Record<string, string> = {};
  // A storage error is not an absent key. Propagate it rather than uploading a
  // destructive partial snapshot. Explicit missing values are legitimate.
  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return { version: CURRENT_SAVE_VERSION, timestamp: Date.now(), deviceId: await getDeviceId(), data };
}

function isSyncedKey(key: string): boolean {
  return SYNC_KEYS.includes(key) || SYNC_KEY_PREFIXES.some(prefix => key.startsWith(prefix));
}

/** Structural validation at the trust boundary. Services may add stricter domain validation. */
export function validateCloudSaveData(value: unknown): value is CloudSaveData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const save = value as CloudSaveData;
  if (save.version !== CURRENT_SAVE_VERSION || !Number.isFinite(save.timestamp) || save.timestamp < 0 ||
      typeof save.deviceId !== 'string' || save.deviceId.length > 128 ||
      !save.data || typeof save.data !== 'object' || Array.isArray(save.data) ||
      (save.revision !== undefined && (!Number.isSafeInteger(save.revision) || save.revision < 1))) return false;
  let bytes = 0;
  for (const [key, raw] of Object.entries(save.data)) {
    if (!isSyncedKey(key) || typeof raw !== 'string') return false;
    bytes += key.length + raw.length;
    if (bytes > 1048576) return false;
    if (key === 'wordshift_schema_version') {
      if (!/^\d+$/.test(raw) || Number(raw) > CURRENT_SCHEMA_VERSION) return false;
      continue;
    }
    // Primitive intro flags/date strings are stored directly. Structured keys
    // are JSON; reject corrupt containers before any local state is removed.
    if (STRUCTURED_SAVE_KEYS.has(key) || key.startsWith('wordshift_played_')) {
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch { return false; }
      if (!parsed || typeof parsed !== 'object') return false;
      if (key.startsWith('wordshift_played_') && !Array.isArray(parsed)) return false;
      if (key === 'wordshift_home_progress' && !validProgress(parsed)) return false;
    }
  }
  return true;
}
const STRUCTURED_SAVE_KEYS = new Set(SYNC_KEYS.filter(key => ![
  'wordshift_schema_version', 'wordshift_share_count', 'wordshift_share_bonus_date',
  'wordshift_onboarding_step', 'wordshift_tutorial_completed', 'wordshift_notification_prompted',
].includes(key) && !key.endsWith('_seen') && !key.endsWith('_seen_v2') && !key.endsWith('_glitch')));
function validProgress(value: object): boolean {
  if (Array.isArray(value)) return false;
  const progress = value as Record<string, unknown>;
  for (const key of ['amber', 'puzzlesSolved', 'phaseProgress', 'cycleCount']) {
    if (progress[key] !== undefined && (typeof progress[key] !== 'number' ||
        !Number.isFinite(progress[key]) || Number(progress[key]) < 0)) return false;
  }
  if (progress.currentPhase !== undefined && (!Number.isInteger(progress.currentPhase) ||
      Number(progress.currentPhase) < 0 || Number(progress.currentPhase) > 5)) return false;
  for (const key of ['unlockedAnimals', 'unlockedRooms']) {
    if (progress[key] !== undefined && (!Array.isArray(progress[key]) ||
        !(progress[key] as unknown[]).every(item => typeof item === 'string'))) return false;
  }
  return true;
}

/**
 * Keys held back from the restore sweep below, each for its own reason.
 *
 * - `wordshift_schema_version`: also in SYNC_KEYS, but deleting it when an old
 *   payload lacks it drops getSchemaVersion() to 0 and re-runs every migration
 *   over the just-restored data. Survivable today, pointless risk always.
 * - `wordshift_hints`: seed-on-init AND bought with real money. Removing it
 *   would either leave the balance at zero or let initHints re-grant the free
 *   starting stash (the `seededFree` flag lives in the very value being
 *   removed). Keeping this device's hints through a restore is the kinder
 *   failure by a wide margin.
 */
const RESTORE_SWEEP_EXEMPT = new Set(['wordshift_schema_version', 'wordshift_hints']);

/**
 * Restore save data from a CloudSaveData object.
 *
 * This is an OVERWRITE, and it now behaves like one. It used to only write the
 * keys the payload happened to carry — and `collectLocalSaveData` skips any
 * key the source device never wrote — so every synced key the restored save
 * had no opinion about kept this device's value, and the player ended up
 * running a hybrid of two saves. The visible costs were one-time narrative
 * flags (a player restoring an EARLIER save kept micro_beats_seen from the
 * discarded one and never saw those beats again) and, worst, the discarded
 * device's abandoned mid-puzzle board surviving as the restored save's
 * resumable autosave. So: sweep the synced keys the payload omits, then write.
 *
 * `invalidateRestoredServiceCaches()` runs AFTER both, which is what makes the
 * sweep safe — puzzleSaveState's own cache is dropped there, so the discarded
 * board cannot be re-persisted by the next autosave write.
 */
export async function restoreFromCloudData(cloudData: CloudSaveData, owner?: string, shouldContinue: () => boolean = () => true): Promise<boolean> {
  if (!shouldContinue()) return false;
  if (!validateCloudSaveData(cloudData) || (owner !== undefined && !isSecureIdentity(owner))) {
    logEvent({ type: 'cloud_sync_result', data: { operation: 'restore', result: 'invalid' } });
    return false;
  }
  try {
    await runStorageTransaction('cloud_restore', async () => {
      if (!shouldContinue()) throw new Error('Restore cancelled');
      await AsyncStorage.removeItem('wordshift_pending_victory');
      await AsyncStorage.removeItem('wordshift_victory_receipt');
      await AsyncStorage.removeItem(LOCAL_RESET_MARKER_KEY);
      const incoming = new Set(Object.keys(cloudData.data));
      const stale = (await AsyncStorage.getAllKeys()).filter(key =>
        isSyncedKey(key) && !incoming.has(key) && !RESTORE_SWEEP_EXEMPT.has(key));
      await AsyncStorage.multiRemove(stale);
      for (const [key, value] of Object.entries(cloudData.data)) await AsyncStorage.setItem(key, value);
      // Missing version means genuinely legacy data, not this device's version.
      if (!incoming.has('wordshift_schema_version')) await AsyncStorage.setItem('wordshift_schema_version', '0');
      await runMigrations();
      if (owner) await AsyncStorage.setItem(CLOUD_OWNER_KEY, owner);
      if (!shouldContinue()) throw new Error('Restore cancelled');
    });
    invalidateRestoredServiceCaches();
    await Promise.all([initHints(), initCosmetics()]);
    logEvent({ type: 'cloud_sync_result', data: { operation: 'restore', result: 'saved' } });
    return true;
  } catch (error) {
    // Both a discarded stage and a journal awaiting replay require dropping
    // every mirror. Bootstrap/retry rolls a committed journal forward first.
    invalidateRestoredServiceCaches();
    logEvent({ type: 'cloud_sync_result', data: { operation: 'restore',
      result: error instanceof StorageRecoveryRequiredError ? 'recovery_required' : 'failed' } });
    if (error instanceof StorageRecoveryRequiredError) throw error;
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
 * for deliberate-overwrite flows. A missing revision on an existing row fails
 * closed; server revisions, not device clocks, authorize normal overwrites.
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

let cloudOperationQueue: Promise<unknown> = Promise.resolve();
/** Manual restore and upload share ordering; boot restore has its separate hold. */
function enqueueCloudOperation<T>(work: () => Promise<T>): Promise<T> {
  const run = cloudOperationQueue.catch(() => {}).then(work);
  cloudOperationQueue = run;
  return run;
}
export function uploadToCloud(force: boolean = false): Promise<boolean> {
  return enqueueCloudOperation(async () => {
    if (!(await provider.isReady())) return false;
    if (uploadHold) await uploadHold;
    try {
      const snapshot = await runStorageTransaction('cloud_snapshot', async () => ({
        owner: await getCloudOwnerId(), status: await getSyncStatus(),
        resetMarker: await AsyncStorage.getItem(LOCAL_RESET_MARKER_KEY), data: await collectLocalSaveData(),
      }));
      const { owner, status, data: saveData } = snapshot;
      if (!validateCloudSaveData(saveData)) throw new Error('Local save needs repair before backup');
      const baseline = status.owner === owner ? status.remoteRevision ?? null : null;
      let success: boolean;
      let revision: number | undefined;
      if (provider.uploadConditional) {
        const result = await provider.uploadConditional(saveData, baseline, force, owner);
        if (result.status === 'conflict') { await recordSyncConflict(); return false; }
        success = result.status === 'saved';
        revision = result.revision;
      } else {
        // Custom/offline providers retain their original seam. Production uses
        // the mandatory v2 conditional RPC; it never falls back to legacy upsert.
        if (!force && status.lastSyncTimestamp > 0 && await provider.hasNewerSave(status.lastSyncTimestamp)) {
          await recordSyncConflict(); return false;
        }
        success = await provider.upload(saveData);
      }
      await runStorageTransaction('cloud_acknowledgement', async () => {
        const markerNow = await AsyncStorage.getItem(LOCAL_RESET_MARKER_KEY);
        // An acknowledgement of a PRE-reset snapshot cannot acknowledge a reset
        // made while its network request was in flight. Compare and clear inside
        // the same serialized operation as Reset's marker write.
        if (success && snapshot.resetMarker && markerNow === snapshot.resetMarker) {
          await AsyncStorage.removeItem(LOCAL_RESET_MARKER_KEY);
        }
        if (await getCloudOwnerId() === owner) {
          await updateSyncStatus(success, { ...saveData, revision }, owner);
          if (markerNow && markerNow !== snapshot.resetMarker) await markPendingChanges();
        }
      });
      logEvent({ type: 'cloud_sync_result', data: { operation: 'upload', result: success ? 'saved' : 'unavailable' } });
      return success;
    } catch {
      await updateSyncStatus(false);
      return false;
    }
  });
}

/**
 * Download and restore data from cloud.
 * Returns true if data was restored, false otherwise.
 */
export async function downloadFromCloud(): Promise<boolean> {
  return enqueueCloudOperation(async () => {
    const isReady = await provider.isReady();
    if (!isReady) return false;
    const cloudData = await provider.download();
    if (!cloudData) return false;
    const success = await restoreFromCloudData(cloudData);
    if (success) await updateSyncStatus(true, cloudData);
    return success;
  });
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

async function updateSyncStatus(success: boolean, save?: CloudSaveData, owner?: string): Promise<void> {
  // The baseline (lastSyncTimestamp) advances ONLY on success. A failed
  // upload/restore must keep the previous baseline: the newer-save conflict
  // guard compares the server's timestamp against this value, and stamping
  // Date.now() on failure (e.g. every offline victory's background upload)
  // would inflate the baseline past any newer save already on the server,
  // permanently blinding the guard to that conflict.
  const previous = syncStatusCache ?? (await getSyncStatus());
  const status: SyncStatus = {
    lastSyncTimestamp: success && save ? save.timestamp : previous.lastSyncTimestamp,
    remoteRevision: success ? save?.revision : previous.remoteRevision,
    owner: success ? owner ?? await getCloudOwnerId() : previous.owner,
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
  logEvent({ type: 'cloud_sync_result', data: { operation: 'upload', result: 'conflict' } });
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
    // Reset progress preserves the cloud identity so its explicit overwrite
    // addresses the same backup. Unlinking must be a separate player action.
  } catch {}
}
