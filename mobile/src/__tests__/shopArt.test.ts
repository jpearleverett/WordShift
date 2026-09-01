import fs from 'fs';
import path from 'path';
import {
  SHOP_ART,
  PENDING_SHOP_ART,
  SHOP_ART_PLACEHOLDER_KEY,
  getShopArt,
  hasShopArt,
} from '../components/shop/shopArt';
import { COSMETICS } from '../services/cosmetics';
import { ROOM_UPGRADES, ROOM_DEEPENINGS, MAX_ATTUNEMENT_LEVEL } from '../services/roomUpgrades';

const ART_DIR = path.resolve(__dirname, '../../assets/ui/shop');

/** The free "default" row each cosmetic category renders above its items. */
const DEFAULT_KEYS = ['theme_default', 'confetti_default', 'spark_default'];

/** Every key the shop can ask for at render time. */
const expectedKeys = (): string[] => [
  ...DEFAULT_KEYS,
  ...COSMETICS.map(c => c.id),
  ...ROOM_UPGRADES.map(u => `upgrade_${u.roomId}`),
  ...ROOM_DEEPENINGS.map(d => `deepen_${d.roomId}`),
  ...Array.from({ length: MAX_ATTUNEMENT_LEVEL }, (_, i) => `attune_${i + 1}`),
];

describe('shopArt registry', () => {
  it('covers every purchasable the shop renders (or lists it as pending art)', () => {
    const pending = new Set(PENDING_SHOP_ART);
    const missing = expectedKeys().filter(key => !hasShopArt(key) && !pending.has(key));
    expect(missing).toEqual([]);
  });

  it('maps every registry key to a PNG that exists on disk', () => {
    const absent = Object.keys(SHOP_ART).filter(
      key => !fs.existsSync(path.join(ART_DIR, `${key}.png`)),
    );
    expect(absent).toEqual([]);
  });

  it('keeps the pending list self-cleaning: no pending key already has art', () => {
    // When the generator draws one of these, add its require() to SHOP_ART and
    // delete it from PENDING_SHOP_ART. This assertion is what forces that.
    const drawn = PENDING_SHOP_ART.filter(
      key => hasShopArt(key) || fs.existsSync(path.join(ART_DIR, `${key}.png`)),
    );
    expect(drawn).toEqual([]);
  });

  it('only lists keys the shop actually asks for as pending', () => {
    const expected = new Set(expectedKeys());
    const stale = PENDING_SHOP_ART.filter(key => !expected.has(key));
    expect(stale).toEqual([]);
  });

  it('falls back to the parcel placeholder for an unmapped id', () => {
    expect(getShopArt('nope_not_a_real_cosmetic')).toBe(SHOP_ART[SHOP_ART_PLACEHOLDER_KEY]);
    expect(getShopArt('nope_not_a_real_cosmetic')).toBeDefined();
    expect(hasShopArt('nope_not_a_real_cosmetic')).toBe(false);
    // The placeholder itself is a fallback, never a product's own art.
    expect(hasShopArt(SHOP_ART_PLACEHOLDER_KEY)).toBe(false);
  });

  it('resolves real art for a known cosmetic and a known house key', () => {
    expect(getShopArt('theme_ember')).toBe(SHOP_ART.theme_ember);
    expect(getShopArt('upgrade_kitchen')).toBe(SHOP_ART.upgrade_kitchen);
    expect(getShopArt('deepen_kitchen')).toBe(SHOP_ART.deepen_kitchen);
    expect(getShopArt('attune_2')).toBe(SHOP_ART.attune_2);
  });

  it('ships one art file per registry entry (48 as generated)', () => {
    expect(Object.keys(SHOP_ART).length).toBe(48);
  });
});
