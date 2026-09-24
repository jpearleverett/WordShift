import storage, { recoverPendingStorageTransaction, runStorageTransaction, StorageRecoveryRequiredError } from './persistenceStorage';
import { SYNC_KEYS, SYNC_KEY_PREFIXES, invalidateRestoredServiceCaches, refreshRestoredServiceCaches, detachCloudBackupForReset } from './cloudSave';
import { canStartNewCycle, getFullProgress, startNewCycle } from './amberCurrency';
import { beginStoryCycle } from './storySpine';
import { ACQUAINTANCE_STORAGE_KEY } from './animalAcquaintance';

const RESET_DEVICE_KEYS = new Set([
  'wordshift_device_id', 'wordshift_event_log', 'wordshift_entitlements',
  'wordshift_ad_pacing', 'wordshift_monet_prompts', 'wordshift_share_prompts',
  'wordshift_review_prompt', 'wordshift_cloud_sync_status',
  'wordshift_preview_graduation_seen_v2', 'wordshift_pending_victory', 'wordshift_victory_receipt',
  'wordshift_pending_victory_quarantine', 'wordshift_story_spine_quarantine',
  // The post-Arrival recollection lead-in belongs to one playthrough: a reset
  // or a new cycle reaches the Arrival again and must frame resumed lines again.
  'wordshift_arrival_resume_framing_seen',
]);

/** Device-local key FAMILIES cleared by Reset All. RESET_DEVICE_KEYS is an
 * exact-match set, so a per-id flag family needs its own prefix here: the
 * cosmetic first-showing receipts are one key per cosmetic id, and without
 * this the reset only ever reached the ids whose receipt path happened to run
 * in the current session (its in-memory mirror), leaving the rest behind. */
const RESET_DEVICE_KEY_PREFIXES = ['wordshift_cosmetic_receipt_'];

/** Commit the entire local wipe + reset marker together before clearing live
 * service mirrors. The new game gets a separate cloud owner in that same
 * commit so future autosaves cannot overwrite the pre-reset backup. Install
 * identity, paid-grant intents and sticky mercy flags deliberately survive.
 * A failed commit keeps a journal for Retry/boot. */
export async function commitFullLocalReset(): Promise<void> {
  await recoverPendingStorageTransaction();
  await runStorageTransaction('full_reset', async () => {
    await detachCloudBackupForReset();
    const keys = (await storage.getAllKeys()).filter(key => SYNC_KEYS.includes(key) ||
      SYNC_KEY_PREFIXES.some(prefix => key.startsWith(prefix)) || RESET_DEVICE_KEYS.has(key) ||
      RESET_DEVICE_KEY_PREFIXES.some(prefix => key.startsWith(prefix)));
    await storage.multiRemove(keys);
    await storage.setItem('wordshift_local_reset_at', String(Date.now()));
    invalidateRestoredServiceCaches();
  });
  invalidateRestoredServiceCaches();
}

const NEW_CYCLE_NARRATIVE_KEYS = [
  ACQUAINTANCE_STORAGE_KEY,
  'wordshift_dialogue_sessions', 'wordshift_narrative_delivery',
  'wordshift_dialogue_choices', 'wordshift_micro_beats_seen',
  'wordshift_cycle_beats_seen', 'wordshift_offering_requests', 'wordshift_tending',
  'wordshift_in_progress_puzzle', 'wordshift_in_progress_daily',
  'wordshift_in_progress_puzzle_clock', 'wordshift_in_progress_daily_clock',
  'wordshift_arrival_resume_framing_seen',
];

/** Archive the completed cycle and reset its narrative gates in one commit.
 * A retry first finishes the previous commit, so the cycle cannot increment
 * twice or lose its inherited boundary after an interrupted storage write. */
export async function commitNewCycle(): Promise<number> {
  await recoverPendingStorageTransaction();
  await refreshRestoredServiceCaches();
  try {
    const cycle = await runStorageTransaction('new_cycle', async () => {
      if (!await canStartNewCycle()) return 0;
      const cycle = await startNewCycle();
      const nextProgress = await getFullProgress();
      await beginStoryCycle({
        phase: nextProgress.currentPhase, puzzlesSolved: nextProgress.puzzlesSolved,
        cycleCount: nextProgress.cycleCount ?? 0, cycleStartPuzzles: nextProgress.cycleStartPuzzles,
        unlockedAnimals: nextProgress.unlockedAnimals,
      });
      await storage.multiRemove(NEW_CYCLE_NARRATIVE_KEYS);
      invalidateRestoredServiceCaches();
      return cycle;
    });
    await refreshRestoredServiceCaches();
    return cycle;
  } catch (error) {
    invalidateRestoredServiceCaches();
    if (!(error instanceof StorageRecoveryRequiredError)) {
      try { await refreshRestoredServiceCaches(); } catch { /* Retry owns any unreadable state. */ }
    }
    throw error;
  }
}
