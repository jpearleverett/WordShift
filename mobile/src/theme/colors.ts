// WordShift: painted tokens, warm timber and a sky that changes with the story.
// Legacy CandyColors names remain stable for existing consumers and cosmetics.

export const CandyColors = {
  // Primary candy palette
  purple: {
    light: '#A855F7',
    main: '#9333EA',
    dark: '#7C3AED',
    glow: 'rgba(168, 85, 247, 0.6)',
    shadow: '#5B21B6',
  },
  pink: {
    light: '#F472B6',
    main: '#EC4899',
    dark: '#DB2777',
    glow: 'rgba(236, 72, 153, 0.6)',
    shadow: '#9D174D',
  },
  blue: {
    light: '#60A5FA',
    main: '#3B82F6',
    dark: '#2563EB',
    glow: 'rgba(59, 130, 246, 0.6)',
    shadow: '#1D4ED8',
  },
  green: {
    light: '#4ADE80',
    main: '#22C55E',
    dark: '#16A34A',
    glow: 'rgba(34, 197, 94, 0.6)',
    shadow: '#15803D',
  },
  yellow: {
    light: '#FDE047',
    main: '#FACC15',
    dark: '#EAB308',
    glow: 'rgba(250, 204, 21, 0.6)',
    shadow: '#CA8A04',
  },
  orange: {
    light: '#FB923C',
    main: '#F97316',
    dark: '#EA580C',
    glow: 'rgba(249, 115, 22, 0.6)',
    shadow: '#C2410C',
  },
  red: {
    light: '#F87171',
    main: '#EF4444',
    dark: '#DC2626',
    glow: 'rgba(239, 68, 68, 0.6)',
    shadow: '#B91C1C',
  },
  cyan: {
    light: '#22D3EE',
    main: '#06B6D4',
    dark: '#0891B2',
    glow: 'rgba(6, 182, 212, 0.6)',
    shadow: '#0E7490',
  },

  // UI colors
  background: {
    gradient1: '#667EEA',
    gradient2: '#764BA2',
    gradient3: '#F093FB',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },

  // Tile colors for letter variety
  tileColors: [
    { bg: '#D9997B', border: '#945A43', glow: 'rgba(232, 200, 148, 0.24)' },
    { bg: '#B8A2C7', border: '#756386', glow: 'rgba(232, 200, 148, 0.24)' },
    { bg: '#8FB8CA', border: '#557F92', glow: 'rgba(232, 200, 148, 0.24)' },
    { bg: '#A6BD8F', border: '#697F55', glow: 'rgba(232, 200, 148, 0.24)' },
    { bg: '#DEC38A', border: '#A28650', glow: 'rgba(232, 200, 148, 0.24)' },
    { bg: '#DDB095', border: '#966E51', glow: 'rgba(232, 200, 148, 0.24)' },
    { bg: '#CD9390', border: '#925D60', glow: 'rgba(232, 200, 148, 0.24)' },
    { bg: '#99BDB5', border: '#5D827A', glow: 'rgba(232, 200, 148, 0.24)' },
  ],

  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
};

// Get a tile color based on letter character code for consistency
export const getTileColor = (char: string) => {
  const palette = getActiveTilePalette();
  const charCode = char.toUpperCase().charCodeAt(0);
  const index = charCode % palette.length;
  return palette[index];
};

// ----------------------------------------------------------------------------
// Cosmetic tile themes (Cosmetic Shop)
// ----------------------------------------------------------------------------
// Named alternate tile palettes the player can buy (amber) or unlock (Patron).
// Each mirrors the default `tileColors` shape. They stay phase-aware by design:
// only the base palette swaps — the puzzle screen's phase overlays, glow, and
// darkening still apply on top, so a bought theme still reads with the story.
//
// `theme_ember` / `theme_tide` / `theme_bone` double as the Phase-5 Tending
// shrine motifs (warm / deep / quiet), so deepening the pattern and dressing the
// board share an expressive vocabulary.

type TilePalette = { bg: string; border: string; glow: string }[];

export const TILE_THEMES: Record<string, TilePalette> = {
  theme_ember: [
    { bg: '#FF8A5B', border: '#CC6B43', glow: 'rgba(255, 138, 91, 0.5)' },
    { bg: '#FF6B4A', border: '#CC5238', glow: 'rgba(255, 107, 74, 0.5)' },
    { bg: '#E8543A', border: '#B5402C', glow: 'rgba(232, 84, 58, 0.5)' },
    { bg: '#FFB259', border: '#CC8C43', glow: 'rgba(255, 178, 89, 0.5)' },
    { bg: '#FF7E79', border: '#CC635F', glow: 'rgba(255, 126, 121, 0.5)' },
    { bg: '#D94F3D', border: '#A93C2E', glow: 'rgba(217, 79, 61, 0.5)' },
    { bg: '#FFA24D', border: '#CC803B', glow: 'rgba(255, 162, 77, 0.5)' },
    { bg: '#FF6F61', border: '#CC584C', glow: 'rgba(255, 111, 97, 0.5)' },
  ],
  theme_tide: [
    { bg: '#3FB6C9', border: '#2E8895', glow: 'rgba(63, 182, 201, 0.5)' },
    { bg: '#4D8FE8', border: '#3A6FB5', glow: 'rgba(77, 143, 232, 0.5)' },
    { bg: '#45999B', border: '#327173', glow: 'rgba(69, 153, 155, 0.5)' },
    { bg: '#6A7FD8', border: '#5263A8', glow: 'rgba(106, 127, 216, 0.5)' },
    { bg: '#3FA9A0', border: '#2E7D77', glow: 'rgba(63, 169, 160, 0.5)' },
    { bg: '#4FB0E0', border: '#3B86A9', glow: 'rgba(79, 176, 224, 0.5)' },
    { bg: '#5B8FD9', border: '#466FA8', glow: 'rgba(91, 143, 217, 0.5)' },
    { bg: '#3FC2B0', border: '#2E9486', glow: 'rgba(63, 194, 176, 0.5)' },
  ],
  theme_bone: [
    { bg: '#C9BFB0', border: '#978F82', glow: 'rgba(201, 191, 176, 0.45)' },
    { bg: '#B8A99A', border: '#8A7D70', glow: 'rgba(184, 169, 154, 0.45)' },
    { bg: '#A9B0A6', border: '#7F857C', glow: 'rgba(169, 176, 166, 0.45)' },
    { bg: '#C2B2A0', border: '#918578', glow: 'rgba(194, 178, 160, 0.45)' },
    { bg: '#B0A6B2', border: '#847C86', glow: 'rgba(176, 166, 178, 0.45)' },
    { bg: '#BEB4A2', border: '#8E867A', glow: 'rgba(190, 180, 162, 0.45)' },
    { bg: '#A8ADB6', border: '#7E8288', glow: 'rgba(168, 173, 182, 0.45)' },
    { bg: '#C4B8AE', border: '#938A82', glow: 'rgba(196, 184, 174, 0.45)' },
  ],
  // Late-game amber catalog (Cosmetic Shop). Same phase-aware contract as the
  // launch trio — only the base palette swaps; phase overlays still apply.
  // Garden-grown: lush, living greens (Thyme's garden, before you knew).
  theme_verdant: [
    { bg: '#4FB86B', border: '#3B8A50', glow: 'rgba(79, 184, 107, 0.5)' },
    { bg: '#6BC46A', border: '#509450', glow: 'rgba(107, 196, 106, 0.5)' },
    { bg: '#3FA07D', border: '#2E785E', glow: 'rgba(63, 160, 125, 0.5)' },
    { bg: '#8CBF57', border: '#6A9142', glow: 'rgba(140, 191, 87, 0.5)' },
    { bg: '#4C9E52', border: '#39773E', glow: 'rgba(76, 158, 82, 0.5)' },
    { bg: '#5FBF9A', border: '#479174', glow: 'rgba(95, 191, 154, 0.5)' },
    { bg: '#79A845', border: '#5B7F34', glow: 'rgba(121, 168, 69, 0.5)' },
    { bg: '#3E8E63', border: '#2E6B4A', glow: 'rgba(62, 142, 99, 0.5)' },
  ],
  // Between-signals: desaturated static grays with one cold signal cutting through.
  theme_static: [
    { bg: '#8E9296', border: '#6A6E72', glow: 'rgba(142, 146, 150, 0.45)' },
    { bg: '#7B8288', border: '#5C6166', glow: 'rgba(123, 130, 136, 0.45)' },
    { bg: '#9AA0A8', border: '#73787E', glow: 'rgba(154, 160, 168, 0.45)' },
    { bg: '#6E747C', border: '#52575D', glow: 'rgba(110, 116, 124, 0.45)' },
    { bg: '#5A9FB5', border: '#437788', glow: 'rgba(90, 159, 181, 0.55)' }, // the signal
    { bg: '#868A90', border: '#64686C', glow: 'rgba(134, 138, 144, 0.45)' },
    { bg: '#767E86', border: '#585E64', glow: 'rgba(118, 126, 134, 0.45)' },
    { bg: '#9BA6AE', border: '#747D83', glow: 'rgba(155, 166, 174, 0.45)' },
  ],
  // Crown-of-the-pattern: deep violets shot through with old gold.
  theme_sovereign: [
    { bg: '#5A3E8E', border: '#412D68', glow: 'rgba(122, 92, 200, 0.55)' },
    { bg: '#6E4AA5', border: '#503678', glow: 'rgba(110, 74, 165, 0.55)' },
    { bg: '#C9A227', border: '#98791D', glow: 'rgba(201, 162, 39, 0.55)' },
    { bg: '#4A3575', border: '#352655', glow: 'rgba(74, 53, 117, 0.5)' },
    { bg: '#7D5BB8', border: '#5C4388', glow: 'rgba(125, 91, 184, 0.55)' },
    { bg: '#3C2C60', border: '#2A1F45', glow: 'rgba(60, 44, 96, 0.5)' },
    { bg: '#B08A2E', border: '#856822', glow: 'rgba(176, 138, 46, 0.55)' },
    { bg: '#63449A', border: '#483270', glow: 'rgba(99, 68, 154, 0.55)' },
  ],
  // ---------------------------------------------------------------------------
  // FINISH-LED tile themes. These are sold on their MATERIAL (see TILE_FINISHES
  // below) rather than on hue alone: the finish repaints the bevel, gloss,
  // specular, sweep, rim and speckle on EVERY tile of the board, so the purchase
  // is visible on tiles the player is not currently touching. Hue stays
  // phase-owned exactly as before.
  // ---------------------------------------------------------------------------
  // Beeswax and Honey: warm waxy creams. The candy gloss goes away entirely.
  theme_beeswax: [
    { bg: '#F0D9A8', border: '#BFA97C', glow: 'rgba(240, 217, 168, 0.45)' },
    { bg: '#E8C27A', border: '#B99A5C', glow: 'rgba(232, 194, 122, 0.45)' },
    { bg: '#D9AE63', border: '#AB8749', glow: 'rgba(217, 174, 99, 0.45)' },
    { bg: '#F5E4C0', border: '#C4B394', glow: 'rgba(245, 228, 192, 0.45)' },
    { bg: '#E2B876', border: '#B4915C', glow: 'rgba(226, 184, 118, 0.45)' },
    { bg: '#CFA05A', border: '#A37E45', glow: 'rgba(207, 160, 90, 0.45)' },
    { bg: '#EDD09A', border: '#BCA378', glow: 'rgba(237, 208, 154, 0.45)' },
    { bg: '#DCC08C', border: '#AF976E', glow: 'rgba(220, 192, 140, 0.45)' },
  ],
  // Cathedral Glass: jewel panes held in dark leading (the finish adds the rim).
  theme_glasswork: [
    { bg: '#2F5FA8', border: '#16305C', glow: 'rgba(47, 95, 168, 0.5)' },
    { bg: '#8B2942', border: '#4E1524', glow: 'rgba(139, 41, 66, 0.5)' },
    { bg: '#1F7A5E', border: '#0F4234', glow: 'rgba(31, 122, 94, 0.5)' },
    { bg: '#7E5C14', border: '#4A360C', glow: 'rgba(126, 92, 20, 0.5)' },
    { bg: '#5B3E8E', border: '#33224F', glow: 'rgba(91, 62, 142, 0.5)' },
    { bg: '#1F6E7A', border: '#0F3B42', glow: 'rgba(31, 110, 122, 0.5)' },
    { bg: '#A8456B', border: '#5E2439', glow: 'rgba(168, 69, 107, 0.5)' },
    { bg: '#8F5624', border: '#553215', glow: 'rgba(143, 86, 36, 0.5)' },
  ],
  // Moth-wing: pale dust with a faint iridescence (the finish adds the speckle).
  theme_mothwing: [
    { bg: '#C4BCAE', border: '#948D82', glow: 'rgba(196, 188, 174, 0.4)' },
    { bg: '#B9B4AC', border: '#8B8781', glow: 'rgba(185, 180, 172, 0.4)' },
    { bg: '#C9C4CE', border: '#979298', glow: 'rgba(201, 196, 206, 0.4)' },
    { bg: '#CDBFA9', border: '#9A8F7F', glow: 'rgba(205, 191, 169, 0.4)' },
    { bg: '#B6C2BC', border: '#88918C', glow: 'rgba(182, 194, 188, 0.4)' },
    { bg: '#C0B8C8', border: '#908A96', glow: 'rgba(192, 184, 200, 0.4)' },
    { bg: '#BDB3A6', border: '#8E867C', glow: 'rgba(189, 179, 166, 0.4)' },
    { bg: '#CAC6D2', border: '#97949D', glow: 'rgba(202, 198, 210, 0.4)' },
  ],
  // Cut Obsidian: volcanic glass with a violet-green sheen and a star glint.
  theme_obsidian: [
    { bg: '#221E2E', border: '#12101A', glow: 'rgba(34, 30, 46, 0.5)' },
    { bg: '#2A2340', border: '#161228', glow: 'rgba(42, 35, 64, 0.5)' },
    { bg: '#1E2630', border: '#0F141C', glow: 'rgba(30, 38, 48, 0.5)' },
    { bg: '#33284A', border: '#1C1530', glow: 'rgba(51, 40, 74, 0.5)' },
    { bg: '#20302C', border: '#111A18', glow: 'rgba(32, 48, 44, 0.5)' },
    { bg: '#2C2436', border: '#181322', glow: 'rgba(44, 36, 54, 0.5)' },
    { bg: '#282038', border: '#151022', glow: 'rgba(40, 32, 56, 0.5)' },
    { bg: '#1B1B26', border: '#0D0D14', glow: 'rgba(27, 27, 38, 0.5)' },
  ],
  theme_patron: [
    { bg: '#FFD479', border: '#CCA85B', glow: 'rgba(255, 212, 121, 0.55)' },
    { bg: '#F5C04D', border: '#C4993D', glow: 'rgba(245, 192, 77, 0.55)' },
    { bg: '#FFCB6B', border: '#CCA255', glow: 'rgba(255, 203, 107, 0.55)' },
    { bg: '#E8B44A', border: '#B58F3A', glow: 'rgba(232, 180, 74, 0.55)' },
    { bg: '#FFD98A', border: '#CCAE6E', glow: 'rgba(255, 217, 138, 0.55)' },
    { bg: '#F0BC55', border: '#C09644', glow: 'rgba(240, 188, 85, 0.55)' },
    { bg: '#FFD060', border: '#CCA64D', glow: 'rgba(255, 208, 96, 0.55)' },
    { bg: '#E0A840', border: '#B38633', glow: 'rgba(224, 168, 64, 0.55)' },
  ],
  // Exclusive to "The Keeper's Collection" cosmetic bundle (IAP). A deep
  // eclipse set — violet-black with crimson embers — that reads premium against
  // every phase while still darkening with the story.
  theme_eclipse: [
    { bg: '#5B4A8A', border: '#3E3260', glow: 'rgba(122, 92, 200, 0.55)' },
    { bg: '#7A3F6B', border: '#552B4A', glow: 'rgba(180, 80, 150, 0.5)' },
    { bg: '#46407A', border: '#2F2B55', glow: 'rgba(100, 90, 190, 0.5)' },
    { bg: '#8A3F4F', border: '#602B37', glow: 'rgba(200, 80, 100, 0.5)' },
    { bg: '#5246A0', border: '#372F70', glow: 'rgba(110, 95, 220, 0.55)' },
    { bg: '#6B3A7A', border: '#4A2855', glow: 'rgba(160, 85, 185, 0.5)' },
    { bg: '#9C4A56', border: '#6E343D', glow: 'rgba(215, 95, 110, 0.5)' },
    { bg: '#403A75', border: '#2B2851', glow: 'rgba(95, 88, 185, 0.5)' },
  ],
};

// Cosmetic confetti palettes (Cosmetic Shop). When one is equipped it replaces
// the phase-default confetti colors (pure expression); with none equipped the
// confetti stays phase-aware (darkens with the story) as before. Tuned to read
// tastefully across phases rather than garish.
export const CONFETTI_THEMES: Record<string, string[]> = {
  confetti_gold: ['#FFD479', '#F5C04D', '#FFE6A8', '#E8B44A', '#FFCB6B', '#FFFFFF'],
  confetti_dusk: ['#9B7FCF', '#6B5B8A', '#C3A6E0', '#7E6BA8', '#B49AD8', '#E8DCF5'],
  confetti_ember: ['#FF8A5B', '#E8543A', '#FFB259', '#D94F3D', '#FF7E79', '#FFD0A0'],
  // Late-game amber palettes, matching the Garden-grown / Crown-of-the-pattern tile themes.
  confetti_verdant: ['#6BC46A', '#3FA07D', '#8CBF57', '#4C9E52', '#B9E4A8', '#E8F5DC'],
  confetti_sovereign: ['#7D5BB8', '#5A3E8E', '#C9A227', '#63449A', '#B08A2E', '#E8DCF5'],
  // Exclusive to "The Keeper's Collection" cosmetic bundle (IAP).
  confetti_eclipse: ['#7A5CC8', '#B45096', '#D75F6E', '#5F58B9', '#A055B9', '#E8DCF5'],
  // Exclusive to active Supporter subscribers — warm gold shot through with a
  // patron violet, distinct from the amber-only confetti_gold.
  confetti_supporter: ['#F2B24E', '#C9902A', '#8E6BC4', '#E8A33D', '#B07EDB', '#FBE7C6'],
  // Season pass premium reward (earned, not bought) — the "arrangement" hues:
  // teal, old gold, and a rose ember.
  confetti_season: ['#37A99E', '#0A8F82', '#E8A33D', '#C79A2E', '#D96A7E', '#EFE7D0'],
};

// The equipped tile theme id is pushed in from cosmetics.ts (registration pattern
// keeps this low-level theme module free of any service/AsyncStorage imports, so
// there is no import cycle and `getTileColor` stays a cheap synchronous lookup).
let activeTileThemeId: string | null = null;

/** Set (or clear) the equipped tile theme. Called by cosmetics on init/equip. */
export function setEquippedTileTheme(id: string | null): void {
  activeTileThemeId = id && TILE_THEMES[id] ? id : null;
}

/** The currently equipped tile theme id, or null for the default candy palette. */
export function getEquippedTileTheme(): string | null {
  return activeTileThemeId;
}

function getActiveTilePalette(): TilePalette {
  if (activeTileThemeId && TILE_THEMES[activeTileThemeId]) {
    return TILE_THEMES[activeTileThemeId];
  }
  return CandyColors.tileColors;
}

// ----------------------------------------------------------------------------
// Tile FINISH (Cosmetic Shop)
// ----------------------------------------------------------------------------
// A palette only ever reaches the active source row's unlocked tiles (the one
// `getStyles()` branch in LetterTile that reads `getTileColor`), so a bought
// theme used to show on about eight tiles. A FINISH repaints the tile's
// MATERIAL layers instead — bevel, gloss, specular, shine sweep, an optional
// cut rim and an optional static speckle — and those render on EVERY tile at
// every phase, so the whole board's surface changes.
//
// HUE stays phase-owned: a finish never recolors a locked, selected, completed
// or future tile's body. It only touches white-alpha overlays (plus the source
// tile's ink and the interactable halo), so the board still darkens with the
// story exactly as before.

export interface TileFinish {
  /** `styles.bevelTop` backgroundColor (the top-half highlight). */
  bevel: string;
  /** `styles.glossyShine` backgroundColor (the candy shine bar). */
  gloss: string;
  /** Specular treatment: today's round dot, a 45deg square glint, or nothing. */
  specular: 'dot' | 'star' | 'none';
  /** Specular color (ignored when `specular` is 'none'). */
  specularColor: string;
  /** `styles.shineSweep` backgroundColor (the travelling glass sweep). */
  sweep: string;
  /** Optional 1px inner rim inside the tile body (lead came / a cut edge). */
  rim?: string;
  /** Static speckle overlay. Device-tier gated for node count, never motion. */
  grain?: 'none' | 'speckle';
  /** Speckle color; carry the alpha here. */
  grainColor?: string;
  /** Letter ink for SOURCE tiles only (phase branches keep their own ink). */
  ink?: string;
  /** Opaque halo color for the interactable/selected outer glow. */
  aura?: string;
}

/** The default is a softly polished painted token; purchased finishes keep their own material. */
export const DEFAULT_TILE_FINISH: TileFinish = {
  bevel: 'rgba(255, 246, 219, 0.28)',
  gloss: 'rgba(255, 246, 219, 0.08)',
  specular: 'none',
  specularColor: 'rgba(255, 246, 219, 0)',
  sweep: 'rgba(255, 246, 219, 0.12)',
};

/** Choose readable source-letter ink even on an equipped cosmetic palette. */
export function getTileInkColor(background: string): string {
  const channels = [1, 3, 5].map(start => parseInt(background.slice(start, start + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const darkContrast = (luminance + 0.05) / 0.06683879508032017;
  const lightContrast = 0.9689252872760447 / (luminance + 0.05);
  if (darkContrast >= 4.5) return '#28221D';
  if (lightContrast >= 4.5) return '#FFF5DF';
  // Mid-luminance cosmetics need the full ink range to meet the text bar.
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
}

/**
 * Finishes by tile-theme id. Only the finish-led themes appear here; the
 * palette-led ones (ember/tide/bone/verdant/static/sovereign/patron/eclipse)
 * deliberately have no entry and keep the default candy material.
 */
export const TILE_FINISHES: Record<string, TileFinish> = {
  // Pressed wax: the gloss and the specular go away entirely. The most
  // dramatic change available, and it is pure alpha.
  theme_beeswax: {
    bevel: 'rgba(255, 252, 240, 0.10)',
    gloss: 'rgba(255, 250, 235, 0.07)',
    specular: 'none',
    specularColor: 'rgba(255, 250, 235, 0.35)',
    sweep: 'rgba(255, 248, 230, 0.12)',
    ink: '#3E2C12',
  },
  // Leaded glass: dark rim, no specular, and one bright narrow sweep that
  // reads as light coming THROUGH the pane rather than off it.
  theme_glasswork: {
    bevel: 'rgba(255, 255, 255, 0.06)',
    gloss: 'rgba(255, 255, 255, 0.14)',
    specular: 'none',
    specularColor: 'rgba(255, 255, 255, 0.5)',
    sweep: 'rgba(255, 255, 255, 0.55)',
    rim: 'rgba(18, 14, 26, 0.65)',
    ink: '#FFF6E0',
    aura: '#3A2F5E',
  },
  // Wing dust: near-matte with a static speckle over every tile.
  theme_mothwing: {
    bevel: 'rgba(255, 255, 255, 0.14)',
    gloss: 'rgba(245, 242, 235, 0.10)',
    specular: 'none',
    specularColor: 'rgba(255, 255, 255, 0.4)',
    sweep: 'rgba(240, 236, 228, 0.16)',
    grain: 'speckle',
    grainColor: 'rgba(58, 52, 46, 0.42)',
    ink: '#2E2A26',
    aura: '#8E8878',
  },
  // Cut stone: a hard star glint instead of the soft candy dot, plus a pale
  // cut rim and a cold violet halo.
  theme_obsidian: {
    bevel: 'rgba(200, 190, 255, 0.07)',
    gloss: 'rgba(180, 200, 255, 0.16)',
    specular: 'star',
    specularColor: 'rgba(235, 240, 255, 0.9)',
    sweep: 'rgba(210, 220, 255, 0.30)',
    rim: 'rgba(180, 190, 230, 0.28)',
    ink: '#DCD6EE',
    aura: '#4A3A7A',
  },
};

/**
 * The finish for a specific theme id (or the default for null/unknown ids).
 * Used by the shop to preview a theme the player has not equipped.
 */
export function getTileFinishForTheme(id: string | null | undefined): TileFinish {
  return (id && TILE_FINISHES[id]) || DEFAULT_TILE_FINISH;
}

/**
 * The finish of the currently equipped tile theme. Resolves off the same
 * `activeTileThemeId` module variable the palette uses, so there is no extra
 * plumbing and no import cycle. Returns the DEFAULT_TILE_FINISH object itself
 * when nothing is equipped (callers may compare by reference to detect that).
 */
export function getTileFinish(): TileFinish {
  return getTileFinishForTheme(activeTileThemeId);
}

// ----------------------------------------------------------------------------
// Move sparks (Cosmetic Shop)
// ----------------------------------------------------------------------------
// The star burst fires on every committed move, which makes it the most-seen
// visual in the game. An equipped spark replaces the phase-default burst colors
// (pure expression); the burst's count, spread and physics still follow the
// phase and the combo tier.

export interface SparkPalette {
  /** Core color of most stars. */
  bg: string;
  /** Alternate core carried by every other star from combo tier 2 up. */
  accent: string;
  /** Optional halo tint. Defaults to the star's own core color. */
  halo?: string;
}

export const SPARK_THEMES: Record<string, SparkPalette> = {
  spark_hearth: { bg: '#FFB347', accent: '#FFF0C8', halo: '#D4802A' },
  spark_pollen: { bg: '#D9E08A', accent: '#FFFDE0', halo: '#A8B054' },
  spark_saltgrain: { bg: '#DCEAF2', accent: '#FFFFFF', halo: '#8FA9B8' },
  spark_thread: { bg: '#E0C46A', accent: '#C0A8D8', halo: '#9E863C' },
  spark_ash: { bg: '#8C8790', accent: '#D9563F', halo: '#5A555E' },
};

// Sparkle/star colors for effects
export const SparkleColors = [
  '#FFFFFF',
  '#FFF9C4',
  '#E1F5FE',
  '#F3E5F5',
  '#FCE4EC',
];

// ============================================================================
// PHASE-AWARE THEMING
// The puzzle screen visually evolves as the player's narrative phase deepens
// ============================================================================

export interface PhaseTheme {
  // Background gradient pulse colors
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  // Gradient overlay layers
  overlayTop: string;
  overlayMid: string;
  overlayBottom: string;
  // Center glow
  centerGlow: string;
  // Particle colors (floating background particles)
  particleColors: string[];
  // Confetti colors (victory celebration)
  confettiColors: string[];
  // Victory modal accent
  victoryTitleColor: string;
  victoryGlowColor: string;
  // Victory modal backgrounds
  modalOverlayColor: string;
  modalBgColor: string;
  modalTextColor: string;
  modalSecondaryTextColor: string;
  modalStatBgColor: string;
  modalDividerColor: string;
  // Vignette
  vignetteColor: string;
}

/**
 * Get the visual theme for the current narrative phase.
 * Phase 0: Moss, warm paper and painted tokens (default)
 * Phase 1: Slightly muted, amber tones creeping in
 * Phase 2: Cooler, more blue/purple, hints of isolation
 * Phase 3: Dark, cold, shadowy
 * Phase 4: Near-black with deep crimson/purple accents
 */
export function getPhaseTheme(phase: number): PhaseTheme {
  switch (phase) {
    case 0:
      return {
        bgPrimary: '#34483F',
        bgSecondary: '#5D6350',
        bgTertiary: '#34483F',
        overlayTop: 'rgba(16, 35, 32, 0.16)',
        overlayMid: 'rgba(92, 112, 90, 0.12)',
        overlayBottom: 'rgba(185, 138, 75, 0.1)',
        centerGlow: 'rgba(244, 217, 166, 0.025)',
        particleColors: [
          'rgba(255, 255, 255, 0.3)',
          'rgba(255, 182, 193, 0.4)',
          'rgba(221, 160, 221, 0.3)',
          'rgba(173, 216, 230, 0.3)',
          'rgba(255, 218, 185, 0.3)',
        ],
        confettiColors: [
          '#FF6B9D', '#C44DFF', '#4DAFFF', '#4DE8C2',
          '#FFD84D', '#FF8C4D', '#FF4D6A', '#9D4DFF',
        ],
        // Warm ink keeps the victory title legible on the paper panel.
        victoryTitleColor: '#725126',
        victoryGlowColor: CandyColors.yellow.light,
        modalOverlayColor: 'rgba(19, 32, 28, 0.76)',
        modalBgColor: '#F3E4C2',
        modalTextColor: '#473322',
        // Secondary ink is readable on both paper surfaces.
        modalSecondaryTextColor: '#67533C',
        modalStatBgColor: '#EAD8B0',
        modalDividerColor: CandyColors.gray[200],
        vignetteColor: '#182A24',
      };
    case 1:
      return {
        bgPrimary: '#3E4848',
        bgSecondary: '#625656',
        bgTertiary: '#3E4848',
        overlayTop: 'rgba(32, 35, 48, 0.18)',
        overlayMid: 'rgba(91, 91, 107, 0.12)',
        overlayBottom: 'rgba(192, 139, 105, 0.1)',
        centerGlow: 'rgba(255, 220, 150, 0.08)',
        particleColors: [
          'rgba(255, 240, 200, 0.3)',
          'rgba(200, 160, 180, 0.3)',
          'rgba(180, 150, 200, 0.3)',
          'rgba(150, 180, 210, 0.25)',
          'rgba(220, 200, 170, 0.3)',
        ],
        confettiColors: [
          '#E06090', '#A040DD', '#4090DD', '#40C8A0',
          '#E0C040', '#E08040', '#E04060', '#8040DD',
        ],
        // Deepened rose (#BC4A78) reads 4.5:1 on the Phase-1 modal (#FAF8FF);
        // #D06090 was 3.5:1. Keeps the muted-lavender-pink character.
        victoryTitleColor: '#BC4A78',
        victoryGlowColor: '#E8D080',
        modalOverlayColor: 'rgba(60, 25, 120, 0.7)',
        modalBgColor: '#FAF8FF',
        modalTextColor: '#7050A0',
        // WCAG AA-checked: 5.8:1 on modalBg #FAF8FF, 5.2:1 on statBg #F0ECF5
        // (violet-gray keeps the Phase 1 lavender character; gray[400] was 2.5:1)
        modalSecondaryTextColor: '#665E7A',
        modalStatBgColor: '#F0ECF5',
        modalDividerColor: CandyColors.gray[200],
        vignetteColor: '#262D34',
      };
    case 2:
      return {
        bgPrimary: '#4A5580',
        bgSecondary: '#5A3878',
        bgTertiary: '#4A5580',
        overlayTop: 'rgba(40, 20, 80, 0.35)',
        overlayMid: 'rgba(60, 70, 130, 0.35)',
        overlayBottom: 'rgba(100, 80, 140, 0.25)',
        centerGlow: 'rgba(180, 180, 255, 0.06)',
        particleColors: [
          'rgba(180, 180, 220, 0.25)',
          'rgba(160, 130, 180, 0.25)',
          'rgba(140, 140, 190, 0.25)',
          'rgba(120, 150, 190, 0.2)',
          'rgba(170, 160, 200, 0.2)',
        ],
        confettiColors: [
          '#B05080', '#8838B8', '#3878B8', '#38A888',
          '#B8A038', '#B86838', '#B83858', '#6838B8',
        ],
        // WCAG AA: #7A4E8E = 4.94:1 on modalBg #E8E0F0 (was #9868A8 at 3.35:1).
        // Same cool violet identity, one step deeper.
        victoryTitleColor: '#7A4E8E',
        victoryGlowColor: '#A8A0C0',
        modalOverlayColor: 'rgba(40, 20, 80, 0.75)',
        modalBgColor: '#E8E0F0',
        modalTextColor: '#5A4080',
        // WCAG AA-checked: 5.2:1 on modalBg #E8E0F0, 4.7:1 on statBg #DDD5E8
        // (same cool violet family, one step deeper; #8878A0 was 3.1:1 / 2.8:1)
        modalSecondaryTextColor: '#655483',
        modalStatBgColor: '#DDD5E8',
        modalDividerColor: '#C8C0D8',
        vignetteColor: '#2A1050',
      };
    case 3:
      return {
        bgPrimary: '#2E3355',
        bgSecondary: '#3D2250',
        bgTertiary: '#2E3355',
        overlayTop: 'rgba(20, 10, 50, 0.45)',
        overlayMid: 'rgba(35, 40, 80, 0.4)',
        overlayBottom: 'rgba(60, 40, 80, 0.35)',
        centerGlow: 'rgba(120, 100, 180, 0.04)',
        particleColors: [
          'rgba(120, 110, 160, 0.26)',
          'rgba(100, 80, 130, 0.26)',
          'rgba(90, 90, 140, 0.26)',
          'rgba(80, 100, 140, 0.2)',
          'rgba(110, 100, 150, 0.2)',
        ],
        confettiColors: [
          '#803860', '#602890', '#285890', '#287868',
          '#907028', '#904828', '#902838', '#502890',
        ],
        victoryTitleColor: '#A888C8',
        victoryGlowColor: '#605880',
        modalOverlayColor: 'rgba(15, 8, 30, 0.8)',
        modalBgColor: '#2A2040',
        modalTextColor: '#C0A8D8',
        modalSecondaryTextColor: '#A090B8',
        modalStatBgColor: '#221838',
        modalDividerColor: '#3A2850',
        vignetteColor: '#180830',
      };
    case 4:
      return {
        bgPrimary: '#1A1A2E',
        bgSecondary: '#2D1530',
        bgTertiary: '#1A1A2E',
        overlayTop: 'rgba(10, 5, 25, 0.55)',
        overlayMid: 'rgba(20, 15, 45, 0.5)',
        overlayBottom: 'rgba(30, 15, 40, 0.45)',
        centerGlow: 'rgba(80, 40, 120, 0.03)',
        // Dying embers, actually VISIBLE on the near-black board (the old
        // 0.12-0.15 alphas made the promised crimson embers imperceptible).
        // Kept under the home screen's 0.5 ember peak.
        particleColors: [
          'rgba(140, 60, 60, 0.42)',
          'rgba(160, 70, 50, 0.36)',
          'rgba(110, 60, 100, 0.32)',
          'rgba(90, 70, 110, 0.3)',
          'rgba(130, 50, 70, 0.34)',
        ],
        confettiColors: [
          '#602040', '#401860', '#184060', '#185040',
          '#604018', '#603018', '#601828', '#381860',
        ],
        victoryTitleColor: '#A078C8',
        victoryGlowColor: '#302840',
        modalOverlayColor: 'rgba(10, 4, 18, 0.85)',
        modalBgColor: '#1A1228',
        modalTextColor: '#C098D8',
        modalSecondaryTextColor: '#A080B8',
        modalStatBgColor: '#140E20',
        modalDividerColor: '#2A1E38',
        vignetteColor: '#0A0418',
      };
    // Phase 5 — Post-Revelation: Terrible peace
    // Not darker than Phase 4, but subtly different — an eerie calm
    case 5:
    default:
      return {
        bgPrimary: '#1E1E30',        // Slightly lighter than Phase 4 — dawn after the storm
        bgSecondary: '#2A1E38',      // Muted purple, not crimson
        bgTertiary: '#1E1E30',
        overlayTop: 'rgba(15, 10, 30, 0.45)',
        overlayMid: 'rgba(25, 20, 50, 0.4)',
        overlayBottom: 'rgba(35, 25, 50, 0.35)',
        centerGlow: 'rgba(100, 80, 150, 0.05)', // Faint purple glow — something lingers
        particleColors: [
          'rgba(100, 80, 140, 0.28)',   // Ghostly purple
          'rgba(80, 80, 120, 0.26)',    // Pale slate
          'rgba(120, 100, 160, 0.24)',  // Dim lavender
          'rgba(90, 70, 110, 0.22)',    // Faded mauve
          'rgba(70, 70, 100, 0.18)',    // Barely there, still there
        ],
        confettiColors: [
          '#504060', '#403060', '#304060', '#305040',
          '#504030', '#503030', '#502040', '#303060',
        ],
        victoryTitleColor: '#A898C8',   // Muted, peaceful purple
        victoryGlowColor: '#403860',    // Dim
        modalOverlayColor: 'rgba(12, 6, 25, 0.82)',
        modalBgColor: '#1E1630',
        modalTextColor: '#B8A0D0',
        modalSecondaryTextColor: '#9888B0',
        modalStatBgColor: '#181028',
        modalDividerColor: '#302240',
        vignetteColor: '#0C0620',       // Deep purple edge
      };
  }
}

// ============================================================================
// DIALOGUE BOX THEMING
// Phase-aware visual theming for all dialogue boxes, speech bubbles, and modals
// ============================================================================

export interface DialogueTheme {
  // Modal container
  modalBg: string;
  modalBorder: string;
  modalShadowColor: string;
  // Decorative accent line at top of modals
  accentLine: string;
  // Sprite/portrait area
  spriteBg: string;
  portraitRingBg: string;
  portraitRingBorder: string;
  // Text bubble
  bubbleBg: string;
  bubbleBorder: string;
  // Text colors
  nameColor: string;
  textColor: string;
  subtitleColor: string;
  progressColor: string;
  // Buttons
  primaryButtonBg: string;
  primaryButtonShadow: string;
  secondaryButtonBg: string;
  secondaryButtonText: string;
  // Cooldown toast
  cooldownBg: string;
  cooldownBorder: string;
  // Overlay backdrop
  overlayBg: string;
}

/**
 * Get the dialogue box theme for the current narrative phase.
 * Controls the visual presentation of all speech bubbles, dialogue modals,
 * intro screens, cooldown toasts, and invite modals.
 *
 * Phase 0: Warm candy-bright — welcoming, delightful
 * Phase 1: Amber-tinged warmth — curious, subtly philosophical
 * Phase 2: Cool isolation — muted, questioning (dark mode begins)
 * Phase 3: Shadowed dread — cold, dim, oppressive
 * Phase 4: Crimson ritual — near-black with blood-red accents
 * Phase 5: Terrible peace — muted purple calm after the storm
 */
export function getDialogueTheme(phase: number): DialogueTheme {
  switch (phase) {
    case 0:
      return {
        modalBg: '#FFFFFF',
        modalBorder: 'rgba(168, 85, 247, 0.18)',
        modalShadowColor: '#7C3AED',
        accentLine: CandyColors.purple.light,
        spriteBg: '#F3E8FF',
        portraitRingBg: '#E9D5FF',
        portraitRingBorder: 'rgba(168, 85, 247, 0.4)',
        bubbleBg: '#F5F0FF',
        bubbleBorder: 'rgba(168, 85, 247, 0.12)',
        nameColor: CandyColors.purple.dark,
        textColor: CandyColors.gray[700],
        subtitleColor: CandyColors.gray[500],
        progressColor: CandyColors.gray[400],
        primaryButtonBg: CandyColors.purple.main,
        primaryButtonShadow: CandyColors.purple.shadow,
        secondaryButtonBg: CandyColors.green.main,
        secondaryButtonText: '#FFFFFF',
        cooldownBg: 'rgba(249, 115, 22, 0.95)',
        cooldownBorder: 'rgba(255, 255, 255, 0.2)',
        overlayBg: 'rgba(30, 15, 60, 0.6)',
      };
    case 1:
      return {
        modalBg: '#FEFCF8',
        modalBorder: 'rgba(180, 140, 100, 0.18)',
        modalShadowColor: '#6B4592',
        accentLine: '#C8A050',
        spriteBg: '#F8F0E0',
        portraitRingBg: '#EBE0D0',
        portraitRingBorder: 'rgba(180, 140, 80, 0.4)',
        bubbleBg: '#F8F4EE',
        bubbleBorder: 'rgba(180, 140, 100, 0.15)',
        nameColor: '#6B4592',
        textColor: '#4A4540',
        subtitleColor: '#8A8478',
        progressColor: '#8A8478',
        primaryButtonBg: '#7B5EA7',
        primaryButtonShadow: '#5B3E87',
        secondaryButtonBg: '#5A9E40',
        secondaryButtonText: '#FFFFFF',
        cooldownBg: 'rgba(180, 130, 60, 0.95)',
        cooldownBorder: 'rgba(255, 255, 255, 0.15)',
        overlayBg: 'rgba(25, 15, 50, 0.65)',
      };
    case 2:
      // Mid-dusk step. Phase 2 used to jump straight from Phase 1's warm white
      // to the Phase-4 family near-black (#1A1A2E) — the largest single-step
      // delta in the descent. Retuned to a desaturated twilight lavender-grey
      // so the darkening arrives in two steps (warm white → twilight → the
      // Phase-3 dark), preserving "feel it before you notice it".
      return {
        modalBg: '#3E3858',
        modalBorder: 'rgba(150, 132, 190, 0.28)',
        modalShadowColor: '#26203C',
        accentLine: '#6B5894',
        spriteBg: '#37314E',
        portraitRingBg: '#463F63',
        portraitRingBorder: 'rgba(150, 132, 190, 0.5)',
        bubbleBg: '#454060',
        bubbleBorder: 'rgba(150, 132, 190, 0.25)',
        // Dark twilight-plum INK: at phase 2 the dialogue nameplate renders
        // directly on the hostDark pixel skin's STORM parchment fill (#CDB289
        // — getPixelSkin(2, true)), so the ink must be dark. Measured 5.6:1
        // there (the old light #A898C8 measured ~1.3:1 — it was checked
        // against the wrong fill).
        nameColor: '#463060',
        textColor: '#E4DFF2',   // 7.5:1 on bubbleBg, 8.4:1 on modalBg
        subtitleColor: '#C6BEDC', // 5.5:1 on bubbleBg (WCAG AA-checked)
        progressColor: '#8A82A8',
        primaryButtonBg: '#5A4886',
        primaryButtonShadow: '#3A2966',
        secondaryButtonBg: '#3E6850',
        secondaryButtonText: '#E8F2EA', // 5.6:1 on secondaryButtonBg
        cooldownBg: 'rgba(96, 74, 128, 0.95)', // white toast text: 7.5:1
        cooldownBorder: 'rgba(150, 132, 190, 0.3)',
        overlayBg: 'rgba(18, 14, 38, 0.7)',
      };
    case 3:
      return {
        modalBg: '#0E0E1A',
        modalBorder: 'rgba(80, 40, 100, 0.25)',
        modalShadowColor: '#0A0510',
        accentLine: '#4A2860',
        spriteBg: '#0A0A15',
        portraitRingBg: '#1A1030',
        portraitRingBorder: 'rgba(80, 40, 100, 0.5)',
        bubbleBg: '#161622',
        bubbleBorder: 'rgba(80, 40, 100, 0.2)',
        // Light lavender: the nameplate sits on the dark pixel-skin panel fill
        // (#352A31) once the host goes dark; #7050A0 measured only ~2.2:1 there.
        nameColor: '#B99BE0',
        // Text colors WCAG AA-checked (>=4.5:1) against bubbleBg #161622 / modalBg #0E0E1A
        textColor: '#C8C8E0',
        subtitleColor: '#9898B0',
        progressColor: '#8888A0',
        primaryButtonBg: '#3D2060',
        primaryButtonShadow: '#1D1040',
        secondaryButtonBg: '#2A4838',
        secondaryButtonText: '#A0A0B0',
        cooldownBg: 'rgba(40, 20, 60, 0.95)',
        cooldownBorder: 'rgba(80, 40, 100, 0.3)',
        overlayBg: 'rgba(5, 3, 15, 0.8)',
      };
    case 4:
      return {
        modalBg: '#0A0810',
        modalBorder: 'rgba(140, 40, 50, 0.25)',
        modalShadowColor: '#1A0510',
        accentLine: '#8B2040',
        spriteBg: '#08060E',
        portraitRingBg: '#1A0E20',
        portraitRingBorder: 'rgba(140, 40, 50, 0.5)',
        bubbleBg: '#120E18',
        bubbleBorder: 'rgba(140, 40, 50, 0.2)',
        // Brightened crimson: ≥4.5:1 on the dark skin panel fill (#352A31)
        // that hosts the nameplate (the old #A04050 measured ~2.2:1).
        nameColor: '#E08090',
        // Text colors WCAG AA-checked (>=4.5:1) against bubbleBg #120E18 / modalBg #0A0810 — ashen mauve, not pure white
        textColor: '#C0B8D0',
        subtitleColor: '#9088A8',
        progressColor: '#807898',
        primaryButtonBg: '#6B1830',
        primaryButtonShadow: '#3B0818',
        secondaryButtonBg: '#283028',
        secondaryButtonText: '#B4ACC4', // WCAG AA-checked vs secondaryButtonBg
        cooldownBg: 'rgba(80, 20, 30, 0.95)',
        cooldownBorder: 'rgba(140, 40, 50, 0.3)',
        overlayBg: 'rgba(5, 2, 8, 0.85)',
      };
    case 5:
    default:
      return {
        modalBg: '#100E18',
        modalBorder: 'rgba(100, 80, 140, 0.18)',
        modalShadowColor: '#0A0818',
        accentLine: '#5A4870',
        spriteBg: '#0C0A14',
        portraitRingBg: '#1E1830',
        portraitRingBorder: 'rgba(100, 80, 140, 0.4)',
        bubbleBg: '#181620',
        bubbleBorder: 'rgba(100, 80, 140, 0.15)',
        nameColor: '#8070B0',
        // Text colors WCAG AA-checked (>=4.5:1) against bubbleBg #181620 / modalBg #100E18 — ghostly, serene
        textColor: '#B8B0C8',
        subtitleColor: '#9088A8',
        progressColor: '#8880A0',
        primaryButtonBg: '#3D3060',
        primaryButtonShadow: '#1D1840',
        secondaryButtonBg: '#2A3838',
        secondaryButtonText: '#B4ACC4', // WCAG AA-checked vs secondaryButtonBg
        cooldownBg: 'rgba(50, 30, 70, 0.95)',
        cooldownBorder: 'rgba(100, 80, 140, 0.2)',
        overlayBg: 'rgba(5, 3, 12, 0.82)',
      };
  }
}

// ============================================================================
// OVERLAY BANNER THEMING
// Phase-aware styling for floating text banners over scenic backgrounds.
// Uses white/near-white text for guaranteed readability; phase character
// expressed through container borders, shadow tints, and subtle color shifts.
// ============================================================================

export interface OverlayBannerTheme {
  textColor: string;
  secondaryTextColor: string;
  containerBg: string;
  borderColor: string;
  textShadowColor: string;
}

export function getOverlayBannerTheme(phase: number): OverlayBannerTheme {
  switch (phase) {
    case 0:
      return {
        textColor: '#FFFFFF',
        secondaryTextColor: 'rgba(255, 255, 255, 0.72)',
        containerBg: 'rgba(20, 10, 40, 0.55)',
        borderColor: 'rgba(168, 85, 247, 0.22)',
        textShadowColor: 'rgba(80, 30, 120, 0.8)',
      };
    case 1:
      return {
        textColor: '#FFF8F0',
        secondaryTextColor: 'rgba(255, 248, 240, 0.70)',
        containerBg: 'rgba(20, 12, 35, 0.55)',
        borderColor: 'rgba(200, 160, 80, 0.22)',
        textShadowColor: 'rgba(60, 30, 80, 0.8)',
      };
    case 2:
      return {
        textColor: '#E8E0F0',
        secondaryTextColor: 'rgba(232, 224, 240, 0.68)',
        containerBg: 'rgba(15, 10, 30, 0.60)',
        borderColor: 'rgba(90, 70, 140, 0.25)',
        textShadowColor: 'rgba(20, 10, 40, 0.8)',
      };
    case 3:
      return {
        textColor: '#D8D0E8',
        secondaryTextColor: 'rgba(216, 208, 232, 0.65)',
        containerBg: 'rgba(8, 5, 18, 0.65)',
        borderColor: 'rgba(80, 40, 100, 0.28)',
        textShadowColor: 'rgba(10, 5, 20, 0.9)',
      };
    case 4:
      return {
        textColor: '#D0C8E0',
        secondaryTextColor: 'rgba(208, 200, 224, 0.62)',
        containerBg: 'rgba(5, 3, 12, 0.70)',
        borderColor: 'rgba(140, 40, 50, 0.28)',
        textShadowColor: 'rgba(5, 2, 10, 0.9)',
      };
    case 5:
    default:
      return {
        textColor: '#D0C8D8',
        secondaryTextColor: 'rgba(208, 200, 216, 0.60)',
        containerBg: 'rgba(8, 5, 15, 0.65)',
        borderColor: 'rgba(100, 80, 140, 0.22)',
        textShadowColor: 'rgba(8, 4, 16, 0.9)',
      };
  }
}

// ============================================================================
// PHASE-AWARE COMPONENT PALETTES
// Color tokens extracted from individual components (LetterTile, DraggableTile,
// OfferingPitScreen) so all phase-aware color values live in the theme layer.
// ============================================================================

/**
 * Resonance glow visual config for dread-tier letter tiles — color and
 * opacity range per phase (used by LetterTile).
 */
export function getResonanceConfig(phase: number): { color: string; minOpacity: number; maxOpacity: number } {
  if (phase >= 5) return { color: '#7B6B8A', minOpacity: 0.06, maxOpacity: 0.10 };   // Ghostly mauve
  if (phase >= 4) return { color: '#8B0000', minOpacity: 0.12, maxOpacity: 0.28 };   // Crimson
  if (phase >= 3) return { color: '#4A2080', minOpacity: 0.08, maxOpacity: 0.20 };   // Dark purple
  if (phase >= 2) return { color: '#6B5B95', minOpacity: 0.04, maxOpacity: 0.12 };   // Purple-blue
  return { color: '#DAA520', minOpacity: 0.02, maxOpacity: 0.05 };                   // Warm gold (Phase 1)
}

/**
 * Shadow color for the floating drag copy of a letter tile (DraggableTile).
 */
export function getDragShadowColor(phase: number): string {
  return phase >= 5 ? '#7B6B8A80'   // ghostly mauve (terrible peace)
    : phase >= 3 ? '#8030508C'      // crimson (cult/dread)
    : '#FFD70050';                  // golden (bright days)
}

/**
 * Offering Pit screen background color per phase — shown behind the
 * pit background image (OfferingPitScreen).
 */
export const PIT_BACKGROUND_COLORS: Record<number, string> = {
  0: '#6fb7df',
  1: '#104c83',
  2: '#514378',
  3: '#060612',
  4: '#1a122a',
  5: '#0e0f2e', // post-revelation: pitt_peace.webp top row (settled mauve)
};

/**
 * Offering Pit devour effect colors per phase — word trail, pit glow,
 * impact burst, and dark pit core (OfferingPitScreen).
 */
export const PIT_DEVOUR_COLORS: Record<number, { trail: string; glow: string; glowOpacity: number; burst: string; core: string }> = {
  0: { trail: '#FFD700', glow: '#FFD700', glowOpacity: 0.35, burst: '#FFE680', core: '#1A1500' },
  1: { trail: '#F0C050', glow: '#F0C050', glowOpacity: 0.30, burst: '#F5D88A', core: '#1A1500' },
  2: { trail: '#B088D0', glow: '#9060C0', glowOpacity: 0.25, burst: '#C8A8E8', core: '#0E0520' },
  3: { trail: '#5A2080', glow: '#3A1060', glowOpacity: 0.20, burst: '#7040A0', core: '#08020F' },
  4: { trail: '#C03050', glow: '#C03050', glowOpacity: 0.45, burst: '#E05070', core: '#1A0510' },
  // Phase 5: terrible peace — ghostly mauve, no urgency left in the light
  5: { trail: '#9B8CB8', glow: '#8A7AA8', glowOpacity: 0.22, burst: '#C0B4D8', core: '#171322' },
};

export default CandyColors;
