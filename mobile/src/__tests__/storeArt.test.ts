/**
 * Registry guard for the Store's generated cottage art (assets/ui/store, drawn
 * by scripts/tools/generateStoreIcons.mjs).
 *
 * The failure this exists to prevent is a silent one: a product ships without a
 * thumbnail and its row quietly renders the brown-paper parcel, which looks
 * deliberate. So every id the Store, the Patron modal and the Season Pass ask
 * for must resolve to its OWN art, and the pending list that would excuse one
 * is self-cleaning (an entry that gains a PNG on disk fails here until it is
 * wired up and removed).
 *
 * Mirrors shopArt.test.ts. Geometry (192x192, transparent edges, real content)
 * is the separate concern of shopIconGeometry.test.ts.
 */
import fs from 'fs';
import path from 'path';
import {
  STORE_ART,
  STORE_ART_KEYS,
  STORE_ART_PLACEHOLDER_KEY,
  PENDING_STORE_ART,
  getStoreArt,
  hasStoreArt,
} from '../components/monetization/storeArt';
import { PRODUCT_IDS, CONSUMABLE_PRODUCTS, STARTER_PACK_INFO } from '../services/iap';

const STORE_DIR = path.resolve(__dirname, '../../assets/ui/store');

/** Every key a paying surface asks `getStoreArt` for, with where it asks from. */
const REQUESTED_KEYS: ReadonlyArray<[string, string]> = [
  // StoreModal
  ['StoreModal hero (Keeper’s Welcome)', STARTER_PACK_INFO.productId],
  ...CONSUMABLE_PRODUCTS.map(
    (info) => [`StoreModal pack row (${info.name})`, info.productId] as [string, string],
  ),
  ['StoreModal daily amber faucet', STORE_ART_KEYS.dailyAmber],
  ['StoreModal Supporter row', PRODUCT_IDS.SUPPORTER_SUB],
  ['StoreModal Keeper’s Collection row', PRODUCT_IDS.COSMETIC_BUNDLE],
  // PatronModal
  ['PatronModal Patron product', PRODUCT_IDS.PATRON_KEY],
  ['PatronModal Remove Ads product', PRODUCT_IDS.REMOVE_ADS],
  // SeasonPassModal
  ['SeasonPassModal premium track', STORE_ART_KEYS.seasonPremium],
];

describe('store art registry', () => {
  // Note on identity: jest maps every PNG require to the same fileMock value, so
  // `getStoreArt(x) !== placeholder` is not a usable assertion here (shopArt.test
  // has the same constraint). The real signal is `hasStoreArt`, which answers
  // from the registry keys rather than the resolved asset.
  it.each(REQUESTED_KEYS)('%s resolves to its own art, not the parcel', (_where, key) => {
    expect({ key, hasArt: hasStoreArt(key), mapped: key in STORE_ART }).toEqual({
      key,
      hasArt: true,
      mapped: true,
    });
    expect(getStoreArt(key)).toBeDefined();
  });

  it('covers every store product id', () => {
    // Not just the ids the surfaces happen to render today: a product added to
    // PRODUCT_IDS without art should fail here rather than at review time.
    const missing = Object.values(PRODUCT_IDS).filter(
      (id) => !hasStoreArt(id) && !PENDING_STORE_ART.includes(id),
    );
    expect(missing).toEqual([]);
  });

  it('maps every key to a real file on disk', () => {
    const onDisk = new Set(
      fs.readdirSync(STORE_DIR).filter((f) => f.endsWith('.png')),
    );
    // The registry uses static require() literals, so this cross-checks the
    // paths in the same way a Metro bundle would: one PNG per mapped key.
    const files = fs
      .readFileSync(
        path.resolve(__dirname, '../components/monetization/storeArt.ts'),
        'utf8',
      )
      .match(/assets\/ui\/store\/([\w.]+\.png)/g)
      ?.map((m) => m.split('/').pop() as string) ?? [];
    expect(files.length).toBe(Object.keys(STORE_ART).length);
    const absent = files.filter((f) => !onDisk.has(f));
    expect(absent).toEqual([]);
  });

  it('has the parcel fallback wired', () => {
    expect(STORE_ART[STORE_ART_PLACEHOLDER_KEY]).toBeDefined();
    // The fallback is reachable but never counts as a product's own art.
    expect(hasStoreArt(STORE_ART_PLACEHOLDER_KEY)).toBe(false);
  });

  it('falls back to the parcel for an unmapped id', () => {
    expect(getStoreArt('com.wordshift.not_a_product')).toBe(
      STORE_ART[STORE_ART_PLACEHOLDER_KEY],
    );
    expect(hasStoreArt('com.wordshift.not_a_product')).toBe(false);
  });

  it('keeps the pending list self-cleaning', () => {
    // An entry that has gained a PNG must be wired into STORE_ART and dropped
    // from PENDING_STORE_ART, or this list silently goes stale.
    const drawn = PENDING_STORE_ART.filter((key) => {
      const guess = key.startsWith('com.wordshift.') ? key.slice('com.wordshift.'.length) : key;
      return fs.existsSync(path.join(STORE_DIR, `${guess}.png`));
    });
    expect(drawn).toEqual([]);
    // And a key cannot be both pending and mapped.
    expect(PENDING_STORE_ART.filter((key) => key in STORE_ART)).toEqual([]);
  });
});
