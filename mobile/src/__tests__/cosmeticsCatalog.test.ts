/**
 * Amber cosmetic catalog — everything added on top of the launch trio
 * (theme_ember/tide/bone + 3 confetti): the late-game palette themes, the
 * FINISH-LED tile themes (sold on their material, not their hue), and the move
 * sparks. Pins the IDs, their prices, the amber-catalog totals, and the
 * render-path resolution each surface actually uses — tile palette via
 * getTileColor, tile material via getTileFinish, confetti and spark via
 * getEquippedSync + their palette table (mirroring Confetti.tsx).
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
  getTileInkColor,
  getEquippedTileTheme,
  getTileFinish,
  getTileFinishForTheme,
  TILE_THEMES,
  TILE_FINISHES,
  DEFAULT_TILE_FINISH,
  CONFETTI_THEMES,
  SPARK_THEMES,
  CandyColors,
} from '../theme/colors';
import * as fs from 'fs';
import * as path from 'path';

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

/**
 * FINISH-LED tile themes — sold on their material (TILE_FINISHES), not on hue.
 * These are the ones a player can see on tiles they are not touching.
 */
const FINISH_TILE_THEMES: Record<string, number> = {
  theme_beeswax: 550,
  theme_glasswork: 700,
  theme_mothwing: 750,
  theme_obsidian: 850,
};

/** Move sparks — the star burst that fires on every committed move. */
const SPARK_ITEMS: Record<string, number> = {
  spark_hearth: 250,
  spark_pollen: 300,
  spark_saltgrain: 350,
  spark_thread: 400,
  spark_ash: 450,
};

const amberItems = (category: 'tile_theme' | 'confetti' | 'spark') =>
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
    const sparkTotal = amberItems('spark')
      .reduce((sum, c) => sum + (c.acquisition.kind === 'amber' ? c.acquisition.cost : 0), 0);
    // Launch trio (300+400+500) + late-game (650+800+1000) + finish-led (550+700+750+850)
    expect(tileTotal).toBe(6500);
    // Launch (250+350+350) + late-game (450+550)
    expect(confettiTotal).toBe(1950);
    // Move sparks (250+300+350+400+450)
    expect(sparkTotal).toBe(1750);
    // Total amber sink across the cosmetic catalog. Sits well under the amber
    // sinks that already exist (attunements alone are ~7,800) and against a
    // permanent post-revelation milestone faucet, so it stays a sane sink for
    // the endgame surplus rather than an unreachable wall.
    expect(tileTotal + confettiTotal + sparkTotal).toBe(10200);
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

// ===========================================================================
// finish-led tile themes (the material, not the hue)
// ===========================================================================

describe('finish-led tile themes', () => {
  it('registers each finish-led theme at its price with a full palette', () => {
    for (const [id, cost] of Object.entries(FINISH_TILE_THEMES)) {
      const item = getCosmetic(id);
      expect(item).toBeDefined();
      expect(item!.category).toBe('tile_theme');
      expect(item!.acquisition).toEqual({ kind: 'amber', cost });
      const palette = TILE_THEMES[id];
      expect(palette).toHaveLength(8);
      for (const c of palette) {
        expect(c.bg).toMatch(/^#[0-9A-F]{6}$/i);
        expect(c.border).toMatch(/^#[0-9A-F]{6}$/i);
        expect(c.glow).toMatch(/^rgba\(/);
      }
    }
  });

  it('every finish-led theme actually carries a distinct finish', () => {
    for (const id of Object.keys(FINISH_TILE_THEMES)) {
      const finish = TILE_FINISHES[id];
      expect(finish).toBeDefined();
      // A finish that matched the default would be a palette swap wearing a
      // material's price tag.
      expect(finish).not.toEqual(DEFAULT_TILE_FINISH);
    }
  });

  it('every id in TILE_FINISHES is a real tile theme', () => {
    for (const id of Object.keys(TILE_FINISHES)) {
      expect(TILE_THEMES[id]).toBeDefined();
    }
  });

  it('palette-led themes have no finish entry, so they keep the candy material', () => {
    for (const id of ['theme_ember', 'theme_tide', 'theme_bone', 'theme_verdant',
                      'theme_static', 'theme_sovereign', 'theme_patron', 'theme_eclipse']) {
      expect(TILE_FINISHES[id]).toBeUndefined();
      expect(getTileFinishForTheme(id)).toBe(DEFAULT_TILE_FINISH);
    }
  });

  it.each(Object.keys(FINISH_TILE_THEMES))('getTileFinish resolves %s once equipped', async id => {
    expect(getTileFinish()).toBe(DEFAULT_TILE_FINISH);
    await recordAmberCosmeticPurchase(id);
    await equipCosmetic(id);
    expect(getTileFinish()).toEqual(TILE_FINISHES[id]);
    await unequipCosmetic('tile_theme');
    expect(getTileFinish()).toBe(DEFAULT_TILE_FINISH);
  });

  it('nothing equipped resolves to the default material', () => {
    expect(getTileFinish()).toBe(DEFAULT_TILE_FINISH);
    expect(getTileFinishForTheme(null)).toBe(DEFAULT_TILE_FINISH);
    expect(getTileFinishForTheme('theme_does_not_exist')).toBe(DEFAULT_TILE_FINISH);
  });

  it('source-letter ink remains readable across default and cosmetic palettes', () => {
    const luminance = (hex: string) => {
      const values = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    for (const palette of [CandyColors.tileColors, ...Object.values(TILE_THEMES)]) {
      for (const tile of palette) {
        const bg = luminance(tile.bg);
        const ink = luminance(getTileInkColor(tile.bg));
        expect((Math.max(bg, ink) + 0.05) / (Math.min(bg, ink) + 0.05)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

});

// ===========================================================================
// move sparks
// ===========================================================================

describe('move sparks', () => {
  it('registers every spark at its price with a palette', () => {
    for (const [id, cost] of Object.entries(SPARK_ITEMS)) {
      const item = getCosmetic(id);
      expect(item).toBeDefined();
      expect(item!.category).toBe('spark');
      expect(item!.acquisition).toEqual({ kind: 'amber', cost });
      const palette = SPARK_THEMES[id];
      expect(palette).toBeDefined();
      expect(palette.bg).toMatch(/^#[0-9A-F]{6}$/i);
      expect(palette.accent).toMatch(/^#[0-9A-F]{6}$/i);
      expect(palette.halo).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('every id in SPARK_THEMES is a real catalog item, and vice versa', () => {
    for (const id of Object.keys(SPARK_THEMES)) {
      expect(getCosmetic(id)).toBeDefined();
    }
    for (const item of COSMETICS.filter(c => c.category === 'spark')) {
      expect(SPARK_THEMES[item.id]).toBeDefined();
    }
  });

  it.each(Object.keys(SPARK_ITEMS))('%s is purchasable and equippable via amber', async id => {
    expect(await ownsCosmetic(id)).toBe(false);
    expect(await recordAmberCosmeticPurchase(id)).toBe(true);
    expect(await recordAmberCosmeticPurchase(id)).toBe(false);
    expect(await equipCosmetic(id)).toBe(true);
    expect(await getEquipped('spark')).toBe(id);
    expect(getEquippedSync('spark')).toBe(id);
  });

  it('the spark override resolves the way Confetti.tsx StarBurst does', async () => {
    await recordAmberCosmeticPurchase('spark_ash');
    await equipCosmetic('spark_ash');
    // StarBurst: getEquippedSync('spark') → SPARK_THEMES[id] ?? phase default
    const equipped = getEquippedSync('spark');
    expect(equipped).toBe('spark_ash');
    expect(equipped && SPARK_THEMES[equipped]).toEqual(SPARK_THEMES.spark_ash);
    await unequipCosmetic('spark');
    expect(getEquippedSync('spark')).toBeUndefined();
  });

  it('equipping a spark leaves the tile theme and confetti selections alone', async () => {
    await recordAmberCosmeticPurchase('theme_beeswax');
    await equipCosmetic('theme_beeswax');
    await recordAmberCosmeticPurchase('spark_pollen');
    await equipCosmetic('spark_pollen');
    expect(getEquippedSync('tile_theme')).toBe('theme_beeswax');
    expect(getEquippedSync('spark')).toBe('spark_pollen');
    expect(getEquippedSync('confetti')).toBeUndefined();
  });

  it('equipping an unowned spark is rejected', async () => {
    expect(await equipCosmetic('spark_thread')).toBe(false);
    expect(await getEquipped('spark')).toBeUndefined();
  });
});
