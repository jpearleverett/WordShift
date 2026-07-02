/**
 * Late-game amber cosmetic catalog — the deepened sink added on top of the
 * launch trio (theme_ember/tide/bone + 3 confetti). Pins the new IDs, their
 * prices, the amber-catalog totals, and the render-path resolution (tile theme
 * via getTileColor, confetti via getEquippedSync + CONFETTI_THEMES — mirroring
 * Confetti.tsx).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COSMETICS,
  ownsCosmetic,
  recordAmberCosmeticPurchase,
  equipCosmetic,
  unequipCosmetic,
  getEquipped,
  getEquippedSync,
  clearCosmetics,
  getCosmetic,
} from '../services/cosmetics';
import {
  getTileColor,
  getEquippedTileTheme,
  TILE_THEMES,
  CONFETTI_THEMES,
  CandyColors,
} from '../theme/colors';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('./helpers/mockAsyncStorage').createMockAsyncStorage()
);

beforeEach(async () => {
  await AsyncStorage.clear();
  await clearCosmetics();
});

const NEW_TILE_THEMES: Record<string, number> = {
  theme_verdant: 650,
  theme_static: 800,
  theme_sovereign: 1000,
};

const NEW_CONFETTI: Record<string, number> = {
  confetti_verdant: 450,
  confetti_sovereign: 550,
};

const amberItems = (category: 'tile_theme' | 'confetti') =>
  COSMETICS.filter(c => c.category === category && c.acquisition.kind === 'amber');

const amberCost = (id: string): number => {
  const item = getCosmetic(id);
  if (!item || item.acquisition.kind !== 'amber') throw new Error(`${id} is not an amber item`);
  return item.acquisition.cost;
};

// ===========================================================================
// catalog shape + pricing
// ===========================================================================

describe('late-game amber catalog', () => {
  it('registers the new tile themes at their late-game prices', () => {
    for (const [id, cost] of Object.entries(NEW_TILE_THEMES)) {
      const item = getCosmetic(id);
      expect(item).toBeDefined();
      expect(item!.category).toBe('tile_theme');
      expect(item!.acquisition).toEqual({ kind: 'amber', cost });
    }
  });

  it('registers the new confetti palettes at their late-game prices', () => {
    for (const [id, cost] of Object.entries(NEW_CONFETTI)) {
      const item = getCosmetic(id);
      expect(item).toBeDefined();
      expect(item!.category).toBe('confetti');
      expect(item!.acquisition).toEqual({ kind: 'amber', cost });
    }
  });

  it('the amber catalog totals what the economy expects', () => {
    const tileTotal = amberItems('tile_theme')
      .reduce((sum, c) => sum + (c.acquisition.kind === 'amber' ? c.acquisition.cost : 0), 0);
    const confettiTotal = amberItems('confetti')
      .reduce((sum, c) => sum + (c.acquisition.kind === 'amber' ? c.acquisition.cost : 0), 0);
    // Launch trio (300+400+500) + late-game (650+800+1000)
    expect(tileTotal).toBe(3650);
    // Launch (250+350+350) + late-game (450+550)
    expect(confettiTotal).toBe(1950);
    // Total amber sink across the cosmetic catalog
    expect(tileTotal + confettiTotal).toBe(5600);
    // The deepening itself adds 3,450 of new sinks
    const newTotal = [...Object.values(NEW_TILE_THEMES), ...Object.values(NEW_CONFETTI)]
      .reduce((a, b) => a + b, 0);
    expect(newTotal).toBe(3450);
  });

  it('every new tile theme has a full 8-entry palette in TILE_THEMES', () => {
    for (const id of Object.keys(NEW_TILE_THEMES)) {
      const palette = TILE_THEMES[id];
      expect(palette).toBeDefined();
      expect(palette).toHaveLength(8);
      for (const c of palette) {
        expect(c.bg).toMatch(/^#[0-9A-F]{6}$/i);
        expect(c.border).toMatch(/^#[0-9A-F]{6}$/i);
        expect(c.glow).toMatch(/^rgba\(/);
      }
    }
  });

  it('every new confetti palette resolves in CONFETTI_THEMES', () => {
    for (const id of Object.keys(NEW_CONFETTI)) {
      const palette = CONFETTI_THEMES[id];
      expect(palette).toBeDefined();
      expect(palette).toHaveLength(6);
      for (const color of palette) {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      }
    }
  });
});

// ===========================================================================
// amber purchase + equip path
// ===========================================================================

describe('amber purchase path for new cosmetics', () => {
  it.each(Object.keys(NEW_TILE_THEMES))('%s is purchasable and equippable via amber', async id => {
    expect(await ownsCosmetic(id)).toBe(false);
    expect(await recordAmberCosmeticPurchase(id)).toBe(true);
    expect(await ownsCosmetic(id)).toBe(true);
    // Double-purchase is rejected
    expect(await recordAmberCosmeticPurchase(id)).toBe(false);
    expect(await equipCosmetic(id)).toBe(true);
    expect(await getEquipped('tile_theme')).toBe(id);
    expect(getEquippedSync('tile_theme')).toBe(id);
  });

  it.each(Object.keys(NEW_CONFETTI))('%s is purchasable and equippable via amber', async id => {
    expect(await ownsCosmetic(id)).toBe(false);
    expect(await recordAmberCosmeticPurchase(id)).toBe(true);
    expect(await ownsCosmetic(id)).toBe(true);
    expect(await recordAmberCosmeticPurchase(id)).toBe(false);
    expect(await equipCosmetic(id)).toBe(true);
    expect(await getEquipped('confetti')).toBe(id);
    expect(getEquippedSync('confetti')).toBe(id);
  });

  it('equipping an unowned new theme is rejected', async () => {
    expect(await equipCosmetic('theme_sovereign')).toBe(false);
    expect(await getEquipped('tile_theme')).toBeUndefined();
  });

  it('the sum of all new item costs matches the spendAmber amounts a full buyer pays', () => {
    expect(amberCost('theme_verdant')).toBe(650);
    expect(amberCost('theme_static')).toBe(800);
    expect(amberCost('theme_sovereign')).toBe(1000);
    expect(amberCost('confetti_verdant')).toBe(450);
    expect(amberCost('confetti_sovereign')).toBe(550);
  });
});

// ===========================================================================
// render-path resolution
// ===========================================================================

describe('render-path resolution of new themes', () => {
  it.each(Object.keys(NEW_TILE_THEMES))('getTileColor resolves %s once equipped', async id => {
    await recordAmberCosmeticPurchase(id);
    await equipCosmetic(id);
    expect(getEquippedTileTheme()).toBe(id);
    const palette = TILE_THEMES[id];
    for (const ch of ['A', 'M', 'Z']) {
      expect(getTileColor(ch)).toEqual(palette[ch.charCodeAt(0) % palette.length]);
    }
    // Unequip returns to the default candy palette
    await unequipCosmetic('tile_theme');
    expect(getEquippedTileTheme()).toBeNull();
    expect(getTileColor('A')).toEqual(
      CandyColors.tileColors['A'.charCodeAt(0) % CandyColors.tileColors.length]
    );
  });

  it.each(Object.keys(NEW_CONFETTI))(
    'the confetti override resolves %s the way Confetti.tsx does',
    async id => {
      await recordAmberCosmeticPurchase(id);
      await equipCosmetic(id);
      // Confetti.tsx: getEquippedSync('confetti') → CONFETTI_THEMES[id] ?? phase default
      const equipped = getEquippedSync('confetti');
      expect(equipped).toBe(id);
      expect(equipped && CONFETTI_THEMES[equipped]).toEqual(CONFETTI_THEMES[id]);
      await unequipCosmetic('confetti');
      expect(getEquippedSync('confetti')).toBeUndefined();
    }
  );
});
