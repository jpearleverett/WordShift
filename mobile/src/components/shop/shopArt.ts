import { ImageSourcePropType } from 'react-native';

// Generated cottage art for the Cosmetic Shop's purchasables
// (scripts/tools/generateShopIcons.mjs -> assets/ui/shop/). Keys are the ids
// ShopScreen already holds in hand at render time:
//   - a cosmetic id (`theme_ember`, `confetti_dusk`, `spark_hearth`, ...)
//   - the free-default row key for a category (`theme_default`, ...)
//   - `upgrade_<roomId>` / `deepen_<roomId>` for the house tiers 1 and 2
//   - `attune_<level>` for the three attunement levels (level-keyed, not
//     room-keyed: the tier is named by its level, so 3 pieces cover 13 rooms)
//
// Static `require()` literals only. Metro bundles what it can SEE, so a
// computed path ships an empty asset (the documented dynamic-require failure
// mode in this repo).
export const SHOP_ART: { [key: string]: ImageSourcePropType } = {
  // --- Tile themes -----------------------------------------------------------
  theme_default: require('../../../assets/ui/shop/theme_default.png'),
  theme_ember: require('../../../assets/ui/shop/theme_ember.png'),
  theme_tide: require('../../../assets/ui/shop/theme_tide.png'),
  theme_bone: require('../../../assets/ui/shop/theme_bone.png'),
  theme_verdant: require('../../../assets/ui/shop/theme_verdant.png'),
  theme_static: require('../../../assets/ui/shop/theme_static.png'),
  theme_sovereign: require('../../../assets/ui/shop/theme_sovereign.png'),
  theme_patron: require('../../../assets/ui/shop/theme_patron.png'),
  theme_eclipse: require('../../../assets/ui/shop/theme_eclipse.png'),

  // --- Confetti palettes -----------------------------------------------------
  confetti_default: require('../../../assets/ui/shop/confetti_default.png'),
  confetti_gold: require('../../../assets/ui/shop/confetti_gold.png'),
  confetti_dusk: require('../../../assets/ui/shop/confetti_dusk.png'),
  confetti_ember: require('../../../assets/ui/shop/confetti_ember.png'),
  confetti_verdant: require('../../../assets/ui/shop/confetti_verdant.png'),
  confetti_sovereign: require('../../../assets/ui/shop/confetti_sovereign.png'),
  confetti_eclipse: require('../../../assets/ui/shop/confetti_eclipse.png'),
  confetti_supporter: require('../../../assets/ui/shop/confetti_supporter.png'),
  confetti_season: require('../../../assets/ui/shop/confetti_season.png'),

  // --- Room decorations (tier 1) ---------------------------------------------
  upgrade_cozy_den: require('../../../assets/ui/shop/upgrade_cozy_den.png'),
  upgrade_kitchen: require('../../../assets/ui/shop/upgrade_kitchen.png'),
  upgrade_study: require('../../../assets/ui/shop/upgrade_study.png'),
  upgrade_aquarium: require('../../../assets/ui/shop/upgrade_aquarium.png'),
  upgrade_jungle_room: require('../../../assets/ui/shop/upgrade_jungle_room.png'),
  upgrade_desert_room: require('../../../assets/ui/shop/upgrade_desert_room.png'),
  upgrade_office: require('../../../assets/ui/shop/upgrade_office.png'),
  upgrade_burrow: require('../../../assets/ui/shop/upgrade_burrow.png'),
  upgrade_garden: require('../../../assets/ui/shop/upgrade_garden.png'),
  upgrade_bamboo_attic: require('../../../assets/ui/shop/upgrade_bamboo_attic.png'),
  upgrade_star_loft: require('../../../assets/ui/shop/upgrade_star_loft.png'),
  upgrade_belfry: require('../../../assets/ui/shop/upgrade_belfry.png'),
  upgrade_sky_garden: require('../../../assets/ui/shop/upgrade_sky_garden.png'),

  // --- Room deepenings (tier 2) ----------------------------------------------
  deepen_cozy_den: require('../../../assets/ui/shop/deepen_cozy_den.png'),
  deepen_kitchen: require('../../../assets/ui/shop/deepen_kitchen.png'),
  deepen_study: require('../../../assets/ui/shop/deepen_study.png'),
  deepen_aquarium: require('../../../assets/ui/shop/deepen_aquarium.png'),
  deepen_jungle_room: require('../../../assets/ui/shop/deepen_jungle_room.png'),
  deepen_desert_room: require('../../../assets/ui/shop/deepen_desert_room.png'),
  deepen_office: require('../../../assets/ui/shop/deepen_office.png'),
  deepen_burrow: require('../../../assets/ui/shop/deepen_burrow.png'),
  deepen_garden: require('../../../assets/ui/shop/deepen_garden.png'),
  deepen_bamboo_attic: require('../../../assets/ui/shop/deepen_bamboo_attic.png'),
  deepen_star_loft: require('../../../assets/ui/shop/deepen_star_loft.png'),
  deepen_belfry: require('../../../assets/ui/shop/deepen_belfry.png'),
  deepen_sky_garden: require('../../../assets/ui/shop/deepen_sky_garden.png'),

  // --- Attunements (tier 3), keyed by level ----------------------------------
  attune_1: require('../../../assets/ui/shop/attune_1.png'),
  attune_2: require('../../../assets/ui/shop/attune_2.png'),
  attune_3: require('../../../assets/ui/shop/attune_3.png'),

  // --- Fallback --------------------------------------------------------------
  shop_placeholder: require('../../../assets/ui/shop/shop_placeholder.png'),
};

/** Registry key of the parcel fallback. */
export const SHOP_ART_PLACEHOLDER_KEY = 'shop_placeholder';

/**
 * Shop keys whose art the generator has not drawn YET. These render their live
 * preview (real palette, real tile finish, real spark burst) instead of a
 * thumbnail, so the row never shows a parcel where a product should be.
 *
 * This list is self-cleaning: `shopArt.test.ts` fails if an entry gains a PNG
 * on disk (add its `require()` above and delete it from here) and fails if a
 * cosmetic outside this list has no art at all, so a NEW cosmetic that forgets
 * its icon still breaks CI.
 */
export const PENDING_SHOP_ART: readonly string[] = [
  // The four finish-led tile themes and the whole move-spark category landed
  // after the shop art run; their materials/bursts preview live meanwhile.
  'theme_beeswax',
  'theme_glasswork',
  'theme_mothwing',
  'theme_obsidian',
  'spark_default',
  'spark_hearth',
  'spark_pollen',
  'spark_saltgrain',
  'spark_thread',
  'spark_ash',
];

/**
 * Art for a shop key, falling back to the parcel placeholder so an unmapped id
 * can never render a hole in the row. Never returns undefined.
 */
export function getShopArt(key: string): ImageSourcePropType {
  return SHOP_ART[key] ?? SHOP_ART[SHOP_ART_PLACEHOLDER_KEY];
}

/** True when `key` has its own art (false for anything that would fall back). */
export function hasShopArt(key: string): boolean {
  return key in SHOP_ART && key !== SHOP_ART_PLACEHOLDER_KEY;
}
