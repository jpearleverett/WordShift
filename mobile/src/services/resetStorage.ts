import storage, { recoverPendingStorageTransaction, runStorageTransaction } from './persistenceStorage';
import { SYNC_KEYS, SYNC_KEY_PREFIXES, invalidateRestoredServiceCaches } from './cloudSave';
import { canStartNewCycle, getFullProgress, startNewCycle } from './amberCurrency';
import { beginStoryCycle } from './storySpine';

const RESET_DEVICE_KEYS = new Set([
  'wordshift_device_id', 'wordshift_event_log', 'wordshift_entitlements',
  'wordshift_ad_pacing', 'wordshift_monet_prompts', 'wordshift_share_prompts',
  'wordshift_review_prompt', 'wordshift_cloud_sync_status',
  'wordshift_preview_graduation_seen_v2', 'wordshift_pending_victory', 'wordshift_victory_receipt',
]);

/** Commit the entire local wipe + reset marker together before clearing live
 * service mirrors. Install/cloud identity, paid-grant intents and sticky mercy
 * flags deliberately survive. A failed commit keeps a journal for Retry/boot. */
export async function commitFullLocalReset(): Promise<void> {
  await recoverPendingStorageTransaction();
  await runStorageTransaction('full_reset', async () => {
    const keys = (await storage.getAllKeys()).filter(key => SYNC_KEYS.includes(key) ||
      SYNC_KEY_PREFIXES.some(prefix => key.startsWith(prefix)) || RESET_DEVICE_KEYS.has(key));
    await storage.multiRemove(keys);
    await storage.setItem('wordshift_local_reset_at', String(Date.now()));
  });
  invalidateRestoredServiceCaches();
}

const NEW_CYCLE_NARRATIVE_KEYS = [
  'wordshift_dialogue_sessions', 'wordshift_narrative_delivery',
  'wordshift_dialogue_choices', 'wordshift_micro_beats_seen',
  'wordshift_cycle_beats_seen', 'wordshift_offering_requests',
];

/** Archive the completed cycle and reset its narrative gates in one commit.
 * A retry first finishes the previous commit, so the cycle cannot increment
 * twice or lose its inherited boundary after an interrupted storage write. */
export async function commitNewCycle(): Promise<number> {
  await recoverPendingStorageTransaction();
  invalidateRestoredServiceCaches();
  try {
    return await runStorageTransaction('new_cycle', async () => {
      if (!await canStartNewCycle()) return 0;
      const cycle = await startNewCycle();
      const nextProgress = await getFullProgress();
      await beginStoryCycle({
        phase: nextProgress.currentPhase, puzzlesSolved: nextProgress.puzzlesSolved,
        cycleCount: nextProgress.cycleCount ?? 0, cycleStartPuzzles: nextProgress.cycleStartPuzzles,
        unlockedAnimals: nextProgress.unlockedAnimals,
      });
      await storage.multiRemove(NEW_CYCLE_NARRATIVE_KEYS);
      return cycle;
    });
  } finally {
    invalidateRestoredServiceCaches();
  }
}
