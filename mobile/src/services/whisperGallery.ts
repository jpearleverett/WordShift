import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Whisper Gallery — the archive of lines that exist nowhere else.
 *
 * Records the runtime-generated moments: the whisper after a win, the response
 * an offering drew, the answer to a choice, the words the keeper kept. Base
 * conversation lines are NOT recorded here — they live complete in the
 * journal's earlier conversations (services/storyArchive), which reads the
 * corpus directly and can neither desync nor be evicted. Organized by animal.
 *
 * The dividing line is what the JOURNAL CAN SHOW, not where a line was born.
 * storyArchive reads phases 0-4 of ALL_DIALOGUES and nothing else, so the LATE
 * POOLS — the Phase-2 exhaustion pool, the post-revelation pool and the Tending
 * milestone lines, each served from its own module — can never appear there.
 * Those are recorded here as 'passage'. Dropping them along with the base lines
 * would silently retire the entire Tending reward from both archives.
 *
 * Players who care about the narrative will obsessively collect these.
 * Players who don't will ignore this screen entirely (zero cost).
 */

const STORAGE_KEY = 'wordshift_whisper_gallery';

// ============================================================================
// Types
// ============================================================================

export interface WhisperEntry {
  id: string;
  animalType: string;
  animalName: string;
  text: string;
  phase: number;
  /**
   * 'whisper' post-victory line or milestone offering response; 'choice' the
   * answer a dialogue choice drew; 'keepsake' a one-time kept line; 'passage'
   * a line from one of the LATE POOLS (see below).
   * 'dialogue' is LEGACY only: base conversation lines recorded by builds
   * before the journal took sole custody of them. Nothing writes it any more
   * and HIDDEN_TYPES keeps it off the screen, but stored saves still carry it,
   * so the member stays.
   */
  type: 'whisper' | 'choice' | 'keepsake' | 'passage' | 'dialogue' | 'cross_reference' | 'interjection' | 'trigger_reaction';
  timestamp: number;
}

export interface WhisperGalleryState {
  entries: WhisperEntry[];
  /** Set of entry IDs for fast dedup */
  seenIds: string[];
  totalCollected: number;
}

// ============================================================================
// In-memory cache
// ============================================================================

let galleryCache: WhisperGalleryState | null = null;

/** Drop the in-memory cache after an external storage write (cloud restore). */
export function invalidateWhisperGalleryCache(): void {
  galleryCache = null;
}


function getDefaultState(): WhisperGalleryState {
  return {
    entries: [],
    seenIds: [],
    totalCollected: 0,
  };
}

// ============================================================================
// ID Generation (deterministic from content)
// ============================================================================

/**
 * Generate a stable ID for a whisper entry based on its content.
 * This ensures the same whisper text is never recorded twice.
 */
function generateEntryId(animalType: string, text: string, type: string): string {
  // Simple hash from content
  const input = `${animalType}:${type}:${text}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `wg_${Math.abs(hash).toString(36)}`;
}

/**
 * Kinds the gallery stores but never shows. Base conversation lines recorded by
 * older builds are duplicates of the journal's earlier conversations, so they
 * are filtered out of every reader the screen uses. They are deliberately NOT
 * deleted: the filter is reversible, and purging would also destroy the legacy
 * choice answers and keepsakes that older builds happened to store under the
 * same kind. The cap and dedupe arithmetic in recordWhisper still sees every
 * stored entry, so an unfiltered read is the source of truth on disk.
 */
const HIDDEN_TYPES: ReadonlySet<string> = new Set(['dialogue']);

function visibleEntries(state: WhisperGalleryState): WhisperEntry[] {
  return state.entries.filter(entry => !HIDDEN_TYPES.has(entry.type));
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load the whisper gallery state from storage.
 */
export async function loadWhisperGallery(): Promise<WhisperGalleryState> {
  if (galleryCache) return galleryCache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      galleryCache = JSON.parse(stored);
      return galleryCache!;
    }
  } catch {}
  galleryCache = getDefaultState();
  return galleryCache;
}

/**
 * Record a new whisper/dialogue entry. Deduplicates by content.
 * Returns true if newly recorded, false if already seen.
 */
export async function recordWhisper(entry: {
  animalType: string;
  animalName: string;
  text: string;
  phase: number;
  type: WhisperEntry['type'];
}): Promise<boolean> {
  const state = await loadWhisperGallery();
  const id = generateEntryId(entry.animalType, entry.text, entry.type);

  if (state.seenIds.includes(id)) return false;

  const newEntry: WhisperEntry = {
    id,
    ...entry,
    timestamp: Date.now(),
  };

  state.entries.push(newEntry);
  state.seenIds.push(id);
  state.totalCollected = state.entries.length;

  // Cap at 500 entries (keep most recent)
  if (state.entries.length > 500) {
    state.entries = state.entries.slice(-500);
    state.seenIds = state.entries.map(e => e.id);
  }

  await saveGalleryState(state);
  return true;
}

/**
 * Get all entries for a specific animal, sorted by phase then timestamp.
 */
export async function getEntriesForAnimal(animalType: string): Promise<WhisperEntry[]> {
  const state = await loadWhisperGallery();
  return visibleEntries(state)
    .filter(e => e.animalType === animalType)
    .sort((a, b) => a.phase - b.phase || a.timestamp - b.timestamp);
}

/**
 * Get all entries grouped by animal.
 */
export async function getGroupedEntries(): Promise<Record<string, WhisperEntry[]>> {
  const state = await loadWhisperGallery();
  const grouped: Record<string, WhisperEntry[]> = {};

  for (const entry of visibleEntries(state)) {
    if (!grouped[entry.animalType]) grouped[entry.animalType] = [];
    grouped[entry.animalType].push(entry);
  }

  // Sort each animal's entries
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.phase - b.phase || a.timestamp - b.timestamp);
  }

  return grouped;
}

/**
 * Get collection stats for the gallery screen header.
 */
export async function getGalleryStats(): Promise<{
  totalCollected: number;
  byAnimal: Record<string, number>;
  byPhase: Record<number, number>;
  byType: Record<string, number>;
}> {
  const state = await loadWhisperGallery();
  const byAnimal: Record<string, number> = {};
  const byPhase: Record<number, number> = {};
  const byType: Record<string, number> = {};

  const visible = visibleEntries(state);
  for (const entry of visible) {
    byAnimal[entry.animalType] = (byAnimal[entry.animalType] || 0) + 1;
    byPhase[entry.phase] = (byPhase[entry.phase] || 0) + 1;
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }

  return {
    // The count the header prints must match the list the screen shows, so it
    // counts visible entries rather than echoing the stored total.
    totalCollected: visible.length,
    byAnimal,
    byPhase,
    byType,
  };
}

// ============================================================================
// Display strings
// ============================================================================

// No entry carries a name for the stretch of the story it came from. The
// gallery used to stamp every card with one; a stamp like that is the phase
// system wearing a costume, and the player asked for none of it here. Entries
// are grouped by who spoke and ordered by when, which is all the shape they
// need.

/**
 * Get phase-aware gallery title.
 */
export function getGalleryTitle(phase: number): string {
  if (phase <= 1) return 'Whisper Gallery';
  if (phase === 2) return 'The Echoes';
  if (phase === 3) return 'Voices in the Walls';
  return 'The Archive';
}

/**
 * Get phase-aware gallery subtitle.
 */
export function getGallerySubtitle(phase: number, count: number): string {
  if (phase <= 1) return `${count} moments collected`;
  if (phase === 2) return `${count} echoes recorded`;
  if (phase === 3) return `${count} voices preserved`;
  return `${count} fragments of the arrangement`;
}

// ============================================================================
// Internal
// ============================================================================

async function saveGalleryState(state: WhisperGalleryState): Promise<void> {
  galleryCache = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Clear all gallery data (for Settings > Reset All).
 */
export async function clearWhisperGallery(): Promise<void> {
  galleryCache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}
