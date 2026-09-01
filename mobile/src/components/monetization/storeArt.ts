import { ImageSourcePropType } from 'react-native';
import { PRODUCT_IDS } from '../../services/iap';

// Generated cottage art for the Store's purchasables
// (scripts/tools/generateStoreIcons.mjs -> assets/ui/store/). Keys are the ids
// the paying surfaces already hold in hand at render time:
//   - a real store product id (`com.wordshift.amber_small`, ...) so a row can
//     ask for its art with the same string it asks billing for
//   - `daily_amber` / `season_premium` for the two purchasables that are NOT
//     store SKUs (the rewarded amber faucet, and the season pass premium track
//     which is bought with amber or comes with an active Supporter)
//
// Keys are computed from PRODUCT_IDS on purpose (a renamed SKU can't silently
// leave its art behind), but every `require()` is a STATIC literal: Metro
// bundles what it can SEE, so a computed path ships an empty asset (the
// documented dynamic-require failure mode in this repo).
export const STORE_ART: { [key: string]: ImageSourcePropType } = {
  // --- The one-time welcome bundle (the store's hero card) --------------------
  [PRODUCT_IDS.STARTER_PACK]: require('../../../assets/ui/store/starter_pack.png'),

  // --- Consumable amber packs (the ladder reads by mass AND by gem count) -----
  [PRODUCT_IDS.AMBER_SMALL]: require('../../../assets/ui/store/amber_small.png'),
  [PRODUCT_IDS.AMBER_MEDIUM]: require('../../../assets/ui/store/amber_medium.png'),
  [PRODUCT_IDS.AMBER_LARGE]: require('../../../assets/ui/store/amber_large.png'),

  // --- Consumable hint packs -------------------------------------------------
  [PRODUCT_IDS.HINTS_SMALL]: require('../../../assets/ui/store/hints_small.png'),
  [PRODUCT_IDS.HINTS_LARGE]: require('../../../assets/ui/store/hints_large.png'),

  // --- Subscriptions and non-consumables -------------------------------------
  [PRODUCT_IDS.SUPPORTER_SUB]: require('../../../assets/ui/store/supporter.png'),
  [PRODUCT_IDS.COSMETIC_BUNDLE]: require('../../../assets/ui/store/cosmetic_bundle.png'),
  [PRODUCT_IDS.PATRON_KEY]: require('../../../assets/ui/store/patron_key.png'),
  [PRODUCT_IDS.REMOVE_ADS]: require('../../../assets/ui/store/remove_ads.png'),

  // --- Not store SKUs, but they sit in the same rows -------------------------
  daily_amber: require('../../../assets/ui/store/daily_amber.png'),
  season_premium: require('../../../assets/ui/store/season_premium.png'),

  // --- Fallback --------------------------------------------------------------
  store_placeholder: require('../../../assets/ui/store/store_placeholder.png'),
};

/** Registry key of the brown-paper parcel fallback. */
export const STORE_ART_PLACEHOLDER_KEY = 'store_placeholder';

/**
 * Art keys for the two purchasables with no store product id of their own.
 * Named constants so a caller never hand-types the string.
 */
export const STORE_ART_KEYS = {
  /** The rewarded daily free-amber faucet row in the Store. */
  dailyAmber: 'daily_amber',
  /** The season pass premium track (amber-bought, or free for Supporters). */
  seasonPremium: 'season_premium',
} as const;

/**
 * Store keys whose art the generator has not drawn YET. A product listed here
 * renders the parcel fallback on purpose, rather than failing CI.
 *
 * This list is self-cleaning: `storeArt.test.ts` fails if an entry gains a PNG
 * on disk (add its `require()` above and delete it from here) and fails if a
 * product outside this list has no art at all, so a NEW product that forgets
 * its icon still breaks CI instead of rendering a hole in the row.
 */
export const PENDING_STORE_ART: readonly string[] = [
  // Every purchasable currently has art. A product added without a PNG goes
  // here so its row keeps rendering the parcel, and storeArt.test.ts fails the
  // moment that key gains a file, so the list cannot go stale.
];

/**
 * Art for a store key, falling back to the parcel placeholder so an unmapped id
 * can never render a hole in the row. Never returns undefined.
 */
export function getStoreArt(key: string): ImageSourcePropType {
  return STORE_ART[key] ?? STORE_ART[STORE_ART_PLACEHOLDER_KEY];
}

/** True when `key` has its own art (false for anything that would fall back). */
export function hasStoreArt(key: string): boolean {
  return key in STORE_ART && key !== STORE_ART_PLACEHOLDER_KEY;
}
