import { storage } from './storage';

/**
 * Whisper Gallery — Collectible dialogue and whisper archive.
 *
 * Records every animal whisper, dialogue snippet, and notable narrative moment
 * the player has seen. Organized by animal and phase.
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
  type: 'whisper' | 'dialogue' | 'cross_reference' | 'interjection' | 'trigger_reaction';
  timestamp: number;
}

export interface WhisperGalleryState {
  entries: WhisperEntry[];
  /** Set of entry IDs for fast dedup */
  seenIds: string[];
  totalCollected: number;
}

// ============================================================================
// ID Generation (deterministic from content)
// ============================================================================

function getDefaultState(): WhisperGalleryState {
  return {
    entries: [],
    seenIds: [],
    totalCollected: 0,
  };
}

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

// ============================================================================
// Public API
// ============================================================================

/**
 * Load the whisper gallery state from storage.
 */
export function loadWhisperGallery(): WhisperGalleryState {
  const stored = storage.getString(STORAGE_KEY);
  if (stored !== undefined) {
    return JSON.parse(stored);
  }
  return getDefaultState();
}

/**
 * Record a new whisper/dialogue entry. Deduplicates by content.
 * Returns true if newly recorded, false if already seen.
 */
export function recordWhisper(entry: {
  animalType: string;
  animalName: string;
  text: string;
  phase: number;
  type: WhisperEntry['type'];
}): boolean {
  const state = loadWhisperGallery();
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

  saveGalleryState(state);
  return true;
}

/**
 * Get all entries for a specific animal, sorted by phase then timestamp.
 */
export function getEntriesForAnimal(animalType: string): WhisperEntry[] {
  const state = loadWhisperGallery();
  return state.entries
    .filter(e => e.animalType === animalType)
    .sort((a, b) => a.phase - b.phase || a.timestamp - b.timestamp);
}

/**
 * Get all entries grouped by animal.
 */
export function getGroupedEntries(): Record<string, WhisperEntry[]> {
  const state = loadWhisperGallery();
  const grouped: Record<string, WhisperEntry[]> = {};

  for (const entry of state.entries) {
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
export function getGalleryStats(): {
  totalCollected: number;
  byAnimal: Record<string, number>;
  byPhase: Record<number, number>;
  byType: Record<string, number>;
} {
  const state = loadWhisperGallery();
  const byAnimal: Record<string, number> = {};
  const byPhase: Record<number, number> = {};
  const byType: Record<string, number> = {};

  for (const entry of state.entries) {
    byAnimal[entry.animalType] = (byAnimal[entry.animalType] || 0) + 1;
    byPhase[entry.phase] = (byPhase[entry.phase] || 0) + 1;
    byType[entry.type] = (byType[entry.type] || 0) + 1;
  }

  return {
    totalCollected: state.totalCollected,
    byAnimal,
    byPhase,
    byType,
  };
}

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

function saveGalleryState(state: WhisperGalleryState): void {
  storage.set(STORAGE_KEY, JSON.stringify(state));
}

/**
 * Clear all gallery data (for Settings > Reset All).
 */
export function clearWhisperGallery(): void {
  storage.remove(STORAGE_KEY);
}
