/**
 * Storage-key drift guard.
 *
 * There are ~96 distinct `wordshift_*` AsyncStorage keys across the app, while
 * cloudSave's SYNC_KEYS / SYNC_KEY_PREFIXES are hand-maintained lists. Nothing
 * connected the two, so adding a feature and forgetting to register its key
 * meant that key silently never synced — invisible in normal play, and
 * discovered only when a player migrated devices and lost that slice of their
 * save. It fails silently and is found by players, not CI. This is the CI part.
 *
 * The rule: every persisted `wordshift_*` key must be one of
 *   (a) in SYNC_KEYS,
 *   (b) matched by a SYNC_KEY_PREFIXES entry, or
 *   (c) in the documented exclusion allowlist below — each with a REASON.
 *
 * If this test fails, do not just add the key to the allowlist. Decide first:
 * should this key follow the player to a new device? If yes, add it to
 * SYNC_KEYS. Only genuinely device-local or store-authoritative state belongs
 * in the allowlist.
 */
import fs from 'fs';
import path from 'path';
import { SYNC_KEYS, SYNC_KEY_PREFIXES } from '../services/cloudSave';

/**
 * Keys that must NOT be cloud-synced, each with the reason it is excluded.
 * Adding an entry here is a deliberate design statement, not a way to silence
 * the test.
 */
const DOCUMENTED_EXCLUSIONS: Record<string, string> = {
  wordshift_storage_commit: 'Local write-ahead transaction journal; replay before any gameplay reads.',
  wordshift_pending_victory: 'Local unfinished completion intent; restored saves discard it, Reset clears it.',
  wordshift_victory_receipt: 'Local idempotency receipt for the most recent completion, not transferable progress.',
  wordshift_cloud_legacy_owner: 'Private legacy recovery reference retained for reviewed support; never synced or merged.',
  wordshift_support_id: 'Non-secret per-install support lookup, not a recovery credential; survives Reset.',

  wordshift_device_id: 'Identifies THIS device; syncing it would collide installs.',
  wordshift_install_id: 'Anonymous analytics install id, per-install by definition.',
  wordshift_ad_pacing: 'Ad frequency pacing is device-local UX, not progress.',
  wordshift_monet_prompts: 'Monetization soft-prompt pacing — device UX, like ad pacing.',
  wordshift_share_prompts: 'One-time share nudge pacing; a fresh device may re-earn it.',
  wordshift_event_log: 'Local analytics ring buffer, uploaded separately.',
  wordshift_entitlements: 'Store-authoritative: restored from the billing provider, never from a save.',
  wordshift_applied_iap_grants: 'Device-local paid transaction receipts; retained through reset to prevent duplicate grants.',
  wordshift_pending_iap_grants: 'Money owed to THIS device; syncing could double-grant.',
  wordshift_cloud_sync_status: 'Metadata about syncing itself; syncing it is circular.',
  wordshift_cloud_owner: 'Identifies which account owns the cloud row; not player progress.',
  wordshift_install_date: 'Per-install analytics anchor; a restore must not backdate it.',
  wordshift_review_prompt: 'Store-review policy is per-device; each install asks at most once.',
  wordshift_swift_hint_seen: 'One-time UI pointer toast; device-local UX, not progress.',
  wordshift_first_stuck_seen: 'One-time mercy notice; a returning player may deserve it once more.',
  wordshift_preview_graduation_seen_v2: 'One-time teaching card, device-local by design.',
  wordshift_local_reset_at: 'Stamps when THIS device was reset; syncing it would round-trip through a restore and defeat its own purpose. Deliberately survives Reset All (like wordshift_pending_iap_grants), so a post-reset relaunch whose upload failed cannot auto-restore the pre-reset save.',
};

/** Source files to scan for key literals. */
function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, acc);
    else if (/\.tsx?$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function discoverKeys(): Map<string, string> {
  const root = path.resolve(__dirname, '..');
  const files = collectSourceFiles(root);
  files.push(path.resolve(__dirname, '../../App.tsx'));
  const found = new Map<string, string>(); // key -> first file that declares it
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/['"`](wordshift_[a-z0-9_]+)['"`]/g)) {
      if (!found.has(m[1])) found.set(m[1], path.relative(root, file));
    }
    // Second pass for INTERPOLATED key families. The literal scan above needs
    // a closing quote right after the key, so a template literal like
    // `wordshift_guaranteed_crossref_phase_${i}` never matched and a whole
    // four-key family was invisible to this guard — neither synced, nor
    // prefix-matched, nor excluded, and every assertion below passed anyway.
    // (The size canary could not catch it either: losing one family does not
    // drop the count below 50.) Records the stem, including its trailing
    // underscore, which is exactly the shape SYNC_KEY_PREFIXES matches.
    for (const m of src.matchAll(/['"`](wordshift_[a-z0-9_]+)\$\{/g)) {
      if (!found.has(m[1])) found.set(m[1], path.relative(root, file));
    }
  }
  return found;
}

describe('storage key registry', () => {
  const discovered = discoverKeys();

  test('the scan actually finds the key surface (guards against a broken regex)', () => {
    // If this collapses, every other assertion below becomes vacuously true.
    expect(discovered.size).toBeGreaterThan(50);
    expect([...discovered.keys()]).toContain('wordshift_settings');
  });

  test('every persisted key is synced, prefix-synced, or documented as excluded', () => {
    const synced = new Set<string>(SYNC_KEYS);
    const unregistered: string[] = [];

    for (const [key, file] of discovered) {
      if (synced.has(key)) continue;
      if (SYNC_KEY_PREFIXES.some(prefix => key.startsWith(prefix))) continue;
      if (key in DOCUMENTED_EXCLUSIONS) continue;
      unregistered.push(`${key}  (first seen in ${file})`);
    }

    // The message rides in the value so a failure names the offending key and
    // the file that introduced it, instead of just printing "[] !== [...]".
    expect(unregistered).toEqual([]);
  });

  test('the exclusion allowlist has no stale entries', () => {
    // A key that no longer exists in the source should not linger here: stale
    // exclusions hide the next real drift behind noise.
    const stale = Object.keys(DOCUMENTED_EXCLUSIONS).filter(k => !discovered.has(k));
    expect(stale).toEqual([]);
  });

  test('no key is both synced and excluded (contradictory intent)', () => {
    const synced = new Set<string>(SYNC_KEYS);
    const both = Object.keys(DOCUMENTED_EXCLUSIONS).filter(k => synced.has(k));
    expect(both).toEqual([]);
  });

  test('every exclusion carries a non-trivial reason', () => {
    const unexplained = Object.entries(DOCUMENTED_EXCLUSIONS)
      .filter(([, reason]) => reason.trim().length <= 20)
      .map(([key]) => key);
    expect(unexplained).toEqual([]);
  });
});
