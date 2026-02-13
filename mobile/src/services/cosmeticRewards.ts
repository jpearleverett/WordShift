import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cosmetic rewards system for WordShift.
 *
 * Achievements and milestones can unlock cosmetic customizations:
 * - Tile color themes (alternate letter tile palettes)
 * - Confetti styles (golden, dark, rainbow variants)
 * - Share frame styles (borders for shared result images)
 *
 * Cosmetics are purely visual — no gameplay advantage.
 */

const STORAGE_KEY = 'wordshift_cosmetics';

// ============================================================================
// Types
// ============================================================================

export type CosmeticCategory = 'tile_theme' | 'confetti_style' | 'share_frame';

export interface CosmeticItem {
  id: string;
  name: string;
  description: string;
  category: CosmeticCategory;
  /** Achievement ID or quest that unlocks this */
  unlockedBy: string;
  /** Preview colors for tile themes */
  previewColors?: string[];
  /** Whether this is the default/starter cosmetic */
  isDefault?: boolean;
}

export interface CosmeticState {
  unlockedIds: string[];
  /** Currently equipped cosmetic per category */
  equipped: Record<CosmeticCategory, string>;
}

// ============================================================================
// Cosmetic Definitions
// ============================================================================

export const COSMETIC_ITEMS: CosmeticItem[] = [
  // === Tile Themes ===
  {
    id: 'tiles_candy',
    name: 'Candy Classic',
    description: 'The original bright candy colors',
    category: 'tile_theme',
    unlockedBy: 'default',
    previewColors: ['#FF6B9D', '#C084FC', '#60A5FA', '#34D399', '#FBBF24'],
    isDefault: true,
  },
  {
    id: 'tiles_dark_scholar',
    name: 'Dark Scholar',
    description: 'Deep purple and indigo tones for the studious',
    category: 'tile_theme',
    unlockedBy: 'phase_3',  // Reach Phase 3 achievement
    previewColors: ['#4A2080', '#6B3FA0', '#3D1A70', '#8B5CF6', '#2D1B69'],
  },
  {
    id: 'tiles_ocean',
    name: 'Ocean Depths',
    description: 'Cool blues and teals from the deep',
    category: 'tile_theme',
    unlockedBy: 'puzzle_100', // 100 puzzles achievement
    previewColors: ['#0891B2', '#06B6D4', '#2563EB', '#0EA5E9', '#14B8A6'],
  },
  {
    id: 'tiles_ember',
    name: 'Ember Glow',
    description: 'Warm oranges and reds, like a dying fire',
    category: 'tile_theme',
    unlockedBy: 'streak_30', // 30-day streak
    previewColors: ['#DC2626', '#EA580C', '#F59E0B', '#B91C1C', '#D97706'],
  },
  {
    id: 'tiles_void',
    name: 'The Void',
    description: 'Near-black with faint crimson. For those who have seen.',
    category: 'tile_theme',
    unlockedBy: 'phase_4', // Reach Phase 4 achievement
    previewColors: ['#1A0A0A', '#2D0A1A', '#0A0A1A', '#3D0A2A', '#1A0A2D'],
  },
  {
    id: 'tiles_gold',
    name: 'Golden Hour',
    description: 'Luxurious gold and amber tones',
    category: 'tile_theme',
    unlockedBy: 'perfect_25', // 25 three-star puzzles
    previewColors: ['#B8860B', '#DAA520', '#FFD700', '#CD853F', '#F0C050'],
  },

  // === Confetti Styles ===
  {
    id: 'confetti_rainbow',
    name: 'Rainbow Burst',
    description: 'Classic colorful celebration',
    category: 'confetti_style',
    unlockedBy: 'default',
    isDefault: true,
  },
  {
    id: 'confetti_golden',
    name: 'Golden Shower',
    description: 'Regal gold confetti for the accomplished',
    category: 'confetti_style',
    unlockedBy: 'streak_30', // 30-day streak
  },
  {
    id: 'confetti_dark',
    name: 'Dark Embers',
    description: 'Muted, dying embers that float upward',
    category: 'confetti_style',
    unlockedBy: 'phase_3',
  },
  {
    id: 'confetti_stars',
    name: 'Starfall',
    description: 'Tiny golden stars cascading down',
    category: 'confetti_style',
    unlockedBy: 'perfect_25',
  },

  // === Share Frames ===
  {
    id: 'frame_basic',
    name: 'Basic',
    description: 'Simple text share',
    category: 'share_frame',
    unlockedBy: 'default',
    isDefault: true,
  },
  {
    id: 'frame_animal_border',
    name: 'Animal Friends',
    description: 'Animal emoji border around your results',
    category: 'share_frame',
    unlockedBy: 'all_animals', // Full House achievement
  },
  {
    id: 'frame_ritual',
    name: 'The Arrangement',
    description: 'Dark ritual-themed frame for the devoted',
    category: 'share_frame',
    unlockedBy: 'phase_4',
  },
  {
    id: 'frame_streak',
    name: 'Fire Streak',
    description: 'Flame-bordered results showing your dedication',
    category: 'share_frame',
    unlockedBy: 'streak_60', // 60-day streak
  },
];

// ============================================================================
// In-memory cache
// ============================================================================

let cosmeticCache: CosmeticState | null = null;

function getDefaultState(): CosmeticState {
  const defaults: Record<CosmeticCategory, string> = {
    tile_theme: 'tiles_candy',
    confetti_style: 'confetti_rainbow',
    share_frame: 'frame_basic',
  };
  return {
    unlockedIds: COSMETIC_ITEMS.filter(c => c.isDefault).map(c => c.id),
    equipped: defaults,
  };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Load cosmetic state from storage.
 */
export async function loadCosmeticState(): Promise<CosmeticState> {
  if (cosmeticCache) return cosmeticCache;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure defaults are always unlocked
      const defaultIds = COSMETIC_ITEMS.filter(c => c.isDefault).map(c => c.id);
      for (const id of defaultIds) {
        if (!parsed.unlockedIds.includes(id)) parsed.unlockedIds.push(id);
      }
      cosmeticCache = parsed;
      return cosmeticCache!;
    }
  } catch {}
  cosmeticCache = getDefaultState();
  return cosmeticCache;
}

/**
 * Unlock a cosmetic item. Returns true if newly unlocked.
 */
export async function unlockCosmetic(cosmeticId: string): Promise<boolean> {
  const state = await loadCosmeticState();
  if (state.unlockedIds.includes(cosmeticId)) return false;

  state.unlockedIds.push(cosmeticId);
  cosmeticCache = state;
  await saveCosmeticState(state);
  return true;
}

/**
 * Check if a cosmetic is unlocked.
 */
export async function isCosmeticUnlocked(cosmeticId: string): Promise<boolean> {
  const state = await loadCosmeticState();
  return state.unlockedIds.includes(cosmeticId);
}

/**
 * Equip a cosmetic item. Must be unlocked first.
 */
export async function equipCosmetic(cosmeticId: string): Promise<boolean> {
  const state = await loadCosmeticState();
  if (!state.unlockedIds.includes(cosmeticId)) return false;

  const item = COSMETIC_ITEMS.find(c => c.id === cosmeticId);
  if (!item) return false;

  state.equipped[item.category] = cosmeticId;
  cosmeticCache = state;
  await saveCosmeticState(state);
  return true;
}

/**
 * Get the currently equipped cosmetic for a category.
 */
export async function getEquippedCosmetic(category: CosmeticCategory): Promise<CosmeticItem | null> {
  const state = await loadCosmeticState();
  const equippedId = state.equipped[category];
  return COSMETIC_ITEMS.find(c => c.id === equippedId) || null;
}

/**
 * Get all cosmetics in a category with their unlock status.
 */
export async function getCosmeticsForCategory(
  category: CosmeticCategory
): Promise<(CosmeticItem & { isUnlocked: boolean; isEquipped: boolean })[]> {
  const state = await loadCosmeticState();
  return COSMETIC_ITEMS
    .filter(c => c.category === category)
    .map(c => ({
      ...c,
      isUnlocked: state.unlockedIds.includes(c.id),
      isEquipped: state.equipped[category] === c.id,
    }));
}

/**
 * Check newly unlocked achievements and unlock corresponding cosmetics.
 * Called after achievement check completes.
 * Returns newly unlocked cosmetic items.
 */
export async function syncCosmeticsWithAchievements(
  unlockedAchievementIds: string[]
): Promise<CosmeticItem[]> {
  const newlyUnlocked: CosmeticItem[] = [];

  for (const item of COSMETIC_ITEMS) {
    if (item.isDefault) continue;
    if (unlockedAchievementIds.includes(item.unlockedBy)) {
      const wasNew = await unlockCosmetic(item.id);
      if (wasNew) newlyUnlocked.push(item);
    }
  }

  return newlyUnlocked;
}

/**
 * Get the tile color set for the currently equipped tile theme.
 * Returns null to use defaults.
 */
export async function getActiveTileColors(): Promise<string[] | null> {
  const item = await getEquippedCosmetic('tile_theme');
  if (!item || item.id === 'tiles_candy') return null; // Use default
  return item.previewColors || null;
}

// ============================================================================
// Internal
// ============================================================================

async function saveCosmeticState(state: CosmeticState): Promise<void> {
  cosmeticCache = state;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/**
 * Clear all cosmetic data (for Settings > Reset All).
 */
export async function clearCosmeticState(): Promise<void> {
  cosmeticCache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {}
}
