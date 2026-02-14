import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadCosmeticState,
  unlockCosmetic,
  isCosmeticUnlocked,
  equipCosmetic,
  getEquippedCosmetic,
  getCosmeticsForCategory,
  syncCosmeticsWithAchievements,
  getActiveTileColors,
  clearCosmeticState,
  COSMETIC_ITEMS,
  CosmeticCategory,
} from '../services/cosmeticRewards';

// Mock AsyncStorage using shared factory
jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

describe('cosmeticRewards', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearCosmeticState();
  });

  // ===========================================================================
  // COSMETIC_ITEMS
  // ===========================================================================

  describe('COSMETIC_ITEMS', () => {
    it('has items across all 3 categories', () => {
      const categories: CosmeticCategory[] = ['tile_theme', 'confetti_style', 'share_frame'];
      for (const cat of categories) {
        const items = COSMETIC_ITEMS.filter(c => c.category === cat);
        expect(items.length).toBeGreaterThan(0);
      }
    });

    it('has 6 tile themes', () => {
      expect(COSMETIC_ITEMS.filter(c => c.category === 'tile_theme').length).toBe(6);
    });

    it('has 4 confetti styles', () => {
      expect(COSMETIC_ITEMS.filter(c => c.category === 'confetti_style').length).toBe(4);
    });

    it('has 4 share frames', () => {
      expect(COSMETIC_ITEMS.filter(c => c.category === 'share_frame').length).toBe(4);
    });

    it('has exactly one default per category', () => {
      const categories: CosmeticCategory[] = ['tile_theme', 'confetti_style', 'share_frame'];
      for (const cat of categories) {
        const defaults = COSMETIC_ITEMS.filter(c => c.category === cat && c.isDefault);
        expect(defaults.length).toBe(1);
      }
    });

    it('every item has a unique id', () => {
      const ids = COSMETIC_ITEMS.map(c => c.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('tile themes have previewColors', () => {
      const tileThemes = COSMETIC_ITEMS.filter(c => c.category === 'tile_theme');
      for (const theme of tileThemes) {
        expect(theme.previewColors).toBeDefined();
        expect(theme.previewColors!.length).toBeGreaterThan(0);
      }
    });
  });

  // ===========================================================================
  // loadCosmeticState
  // ===========================================================================

  describe('loadCosmeticState', () => {
    it('returns default state on first load', async () => {
      const state = await loadCosmeticState();
      expect(state.unlockedIds).toContain('tiles_candy');
      expect(state.unlockedIds).toContain('confetti_rainbow');
      expect(state.unlockedIds).toContain('frame_basic');
      expect(state.equipped.tile_theme).toBe('tiles_candy');
      expect(state.equipped.confetti_style).toBe('confetti_rainbow');
      expect(state.equipped.share_frame).toBe('frame_basic');
    });

    it('only default cosmetics are unlocked initially', async () => {
      const state = await loadCosmeticState();
      const defaultIds = COSMETIC_ITEMS.filter(c => c.isDefault).map(c => c.id);
      expect(state.unlockedIds).toEqual(expect.arrayContaining(defaultIds));
      expect(state.unlockedIds.length).toBe(defaultIds.length);
    });

    it('returns cached state on subsequent calls', async () => {
      const state1 = await loadCosmeticState();
      const state2 = await loadCosmeticState();
      expect(state1).toBe(state2);
    });

    it('loads from storage after cache clear', async () => {
      const state1 = await loadCosmeticState();
      await unlockCosmetic('tiles_dark_scholar');
      await clearCosmeticState();

      // Save state with extra unlock
      const customState = {
        unlockedIds: ['tiles_candy', 'confetti_rainbow', 'frame_basic', 'tiles_ocean'],
        equipped: { tile_theme: 'tiles_candy', confetti_style: 'confetti_rainbow', share_frame: 'frame_basic' },
      };
      await AsyncStorage.setItem('wordshift_cosmetics', JSON.stringify(customState));

      const loaded = await loadCosmeticState();
      expect(loaded.unlockedIds).toContain('tiles_ocean');
    });

    it('ensures defaults are always unlocked even if missing from storage', async () => {
      // Store a state missing some defaults
      const brokenState = {
        unlockedIds: ['tiles_dark_scholar'],
        equipped: { tile_theme: 'tiles_candy', confetti_style: 'confetti_rainbow', share_frame: 'frame_basic' },
      };
      // Clear cache first, then set storage so it persists
      await clearCosmeticState();
      await AsyncStorage.setItem('wordshift_cosmetics', JSON.stringify(brokenState));

      const loaded = await loadCosmeticState();
      expect(loaded.unlockedIds).toContain('tiles_candy');
      expect(loaded.unlockedIds).toContain('confetti_rainbow');
      expect(loaded.unlockedIds).toContain('frame_basic');
      expect(loaded.unlockedIds).toContain('tiles_dark_scholar');
    });
  });

  // ===========================================================================
  // unlockCosmetic
  // ===========================================================================

  describe('unlockCosmetic', () => {
    it('returns true when newly unlocked', async () => {
      const result = await unlockCosmetic('tiles_dark_scholar');
      expect(result).toBe(true);
    });

    it('returns false when already unlocked', async () => {
      await unlockCosmetic('tiles_dark_scholar');
      const result = await unlockCosmetic('tiles_dark_scholar');
      expect(result).toBe(false);
    });

    it('returns false for default cosmetics (already unlocked)', async () => {
      await loadCosmeticState(); // initialize
      const result = await unlockCosmetic('tiles_candy');
      expect(result).toBe(false);
    });

    it('adds cosmetic to unlockedIds', async () => {
      await unlockCosmetic('tiles_ocean');
      const state = await loadCosmeticState();
      expect(state.unlockedIds).toContain('tiles_ocean');
    });

    it('persists to storage', async () => {
      await unlockCosmetic('tiles_void');
      const stored = await AsyncStorage.getItem('wordshift_cosmetics');
      const parsed = JSON.parse(stored!);
      expect(parsed.unlockedIds).toContain('tiles_void');
    });
  });

  // ===========================================================================
  // isCosmeticUnlocked
  // ===========================================================================

  describe('isCosmeticUnlocked', () => {
    it('returns true for default cosmetics', async () => {
      expect(await isCosmeticUnlocked('tiles_candy')).toBe(true);
      expect(await isCosmeticUnlocked('confetti_rainbow')).toBe(true);
      expect(await isCosmeticUnlocked('frame_basic')).toBe(true);
    });

    it('returns false for non-default unlocked cosmetics', async () => {
      expect(await isCosmeticUnlocked('tiles_dark_scholar')).toBe(false);
    });

    it('returns true after unlocking', async () => {
      await unlockCosmetic('tiles_ember');
      expect(await isCosmeticUnlocked('tiles_ember')).toBe(true);
    });
  });

  // ===========================================================================
  // equipCosmetic
  // ===========================================================================

  describe('equipCosmetic', () => {
    it('equips an unlocked cosmetic', async () => {
      await unlockCosmetic('tiles_ocean');
      const result = await equipCosmetic('tiles_ocean');
      expect(result).toBe(true);
    });

    it('returns false for locked cosmetic', async () => {
      const result = await equipCosmetic('tiles_void');
      expect(result).toBe(false);
    });

    it('returns false for non-existent cosmetic', async () => {
      const result = await equipCosmetic('nonexistent_cosmetic');
      expect(result).toBe(false);
    });

    it('updates equipped state', async () => {
      await unlockCosmetic('tiles_ocean');
      await equipCosmetic('tiles_ocean');
      const state = await loadCosmeticState();
      expect(state.equipped.tile_theme).toBe('tiles_ocean');
    });

    it('equipping one category does not affect others', async () => {
      await unlockCosmetic('tiles_ocean');
      await equipCosmetic('tiles_ocean');
      const state = await loadCosmeticState();
      expect(state.equipped.confetti_style).toBe('confetti_rainbow');
      expect(state.equipped.share_frame).toBe('frame_basic');
    });

    it('can equip default cosmetics', async () => {
      await unlockCosmetic('tiles_ocean');
      await equipCosmetic('tiles_ocean');
      // Re-equip default
      const result = await equipCosmetic('tiles_candy');
      expect(result).toBe(true);
      const state = await loadCosmeticState();
      expect(state.equipped.tile_theme).toBe('tiles_candy');
    });
  });

  // ===========================================================================
  // getEquippedCosmetic
  // ===========================================================================

  describe('getEquippedCosmetic', () => {
    it('returns default tile theme initially', async () => {
      const item = await getEquippedCosmetic('tile_theme');
      expect(item).not.toBeNull();
      expect(item!.id).toBe('tiles_candy');
    });

    it('returns default confetti style initially', async () => {
      const item = await getEquippedCosmetic('confetti_style');
      expect(item).not.toBeNull();
      expect(item!.id).toBe('confetti_rainbow');
    });

    it('returns default share frame initially', async () => {
      const item = await getEquippedCosmetic('share_frame');
      expect(item).not.toBeNull();
      expect(item!.id).toBe('frame_basic');
    });

    it('returns updated cosmetic after equipping', async () => {
      await unlockCosmetic('confetti_dark');
      await equipCosmetic('confetti_dark');
      const item = await getEquippedCosmetic('confetti_style');
      expect(item!.id).toBe('confetti_dark');
      expect(item!.name).toBe('Dark Embers');
    });
  });

  // ===========================================================================
  // getCosmeticsForCategory
  // ===========================================================================

  describe('getCosmeticsForCategory', () => {
    it('returns all tile themes with unlock and equip status', async () => {
      const items = await getCosmeticsForCategory('tile_theme');
      expect(items.length).toBe(6);
      // Default should be unlocked and equipped
      const candy = items.find(c => c.id === 'tiles_candy');
      expect(candy?.isUnlocked).toBe(true);
      expect(candy?.isEquipped).toBe(true);
      // Non-default should be locked and not equipped
      const void_ = items.find(c => c.id === 'tiles_void');
      expect(void_?.isUnlocked).toBe(false);
      expect(void_?.isEquipped).toBe(false);
    });

    it('reflects unlocked cosmetics', async () => {
      await unlockCosmetic('tiles_ocean');
      const items = await getCosmeticsForCategory('tile_theme');
      const ocean = items.find(c => c.id === 'tiles_ocean');
      expect(ocean?.isUnlocked).toBe(true);
    });

    it('reflects equipped cosmetics', async () => {
      await unlockCosmetic('confetti_stars');
      await equipCosmetic('confetti_stars');
      const items = await getCosmeticsForCategory('confetti_style');
      const stars = items.find(c => c.id === 'confetti_stars');
      expect(stars?.isEquipped).toBe(true);
      // Default should no longer be equipped
      const rainbow = items.find(c => c.id === 'confetti_rainbow');
      expect(rainbow?.isEquipped).toBe(false);
    });
  });

  // ===========================================================================
  // syncCosmeticsWithAchievements
  // ===========================================================================

  describe('syncCosmeticsWithAchievements', () => {
    it('unlocks cosmetics matching achievement IDs', async () => {
      const newlyUnlocked = await syncCosmeticsWithAchievements(['phase_3']);
      expect(newlyUnlocked.length).toBeGreaterThan(0);
      // phase_3 unlocks tiles_dark_scholar and confetti_dark
      const ids = newlyUnlocked.map(c => c.id);
      expect(ids).toContain('tiles_dark_scholar');
      expect(ids).toContain('confetti_dark');
    });

    it('returns empty array when no matching achievements', async () => {
      const result = await syncCosmeticsWithAchievements(['no_match']);
      expect(result).toEqual([]);
    });

    it('does not re-unlock already unlocked cosmetics', async () => {
      await syncCosmeticsWithAchievements(['phase_3']);
      const result2 = await syncCosmeticsWithAchievements(['phase_3']);
      expect(result2).toEqual([]);
    });

    it('unlocks cosmetics for multiple achievement IDs', async () => {
      const result = await syncCosmeticsWithAchievements(['phase_3', 'phase_4', 'perfect_25']);
      const ids = result.map(c => c.id);
      expect(ids).toContain('tiles_dark_scholar');
      expect(ids).toContain('tiles_void');
      expect(ids).toContain('tiles_gold');
      expect(ids).toContain('confetti_stars');
    });

    it('does not unlock default cosmetics', async () => {
      const result = await syncCosmeticsWithAchievements(['default']);
      expect(result).toEqual([]);
    });

    it('unlocks streak_30 cosmetics', async () => {
      const result = await syncCosmeticsWithAchievements(['streak_30']);
      const ids = result.map(c => c.id);
      expect(ids).toContain('tiles_ember');
      expect(ids).toContain('confetti_golden');
    });
  });

  // ===========================================================================
  // getActiveTileColors
  // ===========================================================================

  describe('getActiveTileColors', () => {
    it('returns null for default tile theme', async () => {
      const colors = await getActiveTileColors();
      expect(colors).toBeNull();
    });

    it('returns preview colors for non-default equipped theme', async () => {
      await unlockCosmetic('tiles_ocean');
      await equipCosmetic('tiles_ocean');
      const colors = await getActiveTileColors();
      expect(colors).not.toBeNull();
      expect(Array.isArray(colors)).toBe(true);
      expect(colors!.length).toBe(5);
    });

    it('returns correct colors for Dark Scholar theme', async () => {
      await unlockCosmetic('tiles_dark_scholar');
      await equipCosmetic('tiles_dark_scholar');
      const colors = await getActiveTileColors();
      expect(colors).toEqual(['#4A2080', '#6B3FA0', '#3D1A70', '#8B5CF6', '#2D1B69']);
    });
  });

  // ===========================================================================
  // clearCosmeticState
  // ===========================================================================

  describe('clearCosmeticState', () => {
    it('resets state to defaults after clear', async () => {
      await unlockCosmetic('tiles_void');
      await equipCosmetic('tiles_void');
      await clearCosmeticState();

      const state = await loadCosmeticState();
      expect(state.unlockedIds).not.toContain('tiles_void');
      expect(state.equipped.tile_theme).toBe('tiles_candy');
    });

    it('calls AsyncStorage.removeItem', async () => {
      await loadCosmeticState();
      await clearCosmeticState();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('wordshift_cosmetics');
    });
  });
});
