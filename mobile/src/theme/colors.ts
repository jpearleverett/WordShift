// WordShift Candy Theme - Inspired by Candy Crush's vibrant palette
// Rich, saturated gradients that pop on screen

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
    { bg: '#FF6B9D', border: '#D44D7A', glow: 'rgba(255, 107, 157, 0.5)' }, // Hot pink
    { bg: '#C44DFF', border: '#9933CC', glow: 'rgba(196, 77, 255, 0.5)' },  // Purple
    { bg: '#4DAFFF', border: '#2E8BC0', glow: 'rgba(77, 175, 255, 0.5)' },  // Sky blue
    { bg: '#4DE8C2', border: '#2EAF8E', glow: 'rgba(77, 232, 194, 0.5)' },  // Mint
    { bg: '#FFD84D', border: '#CCB030', glow: 'rgba(255, 216, 77, 0.5)' },  // Gold
    { bg: '#FF8C4D', border: '#CC6633', glow: 'rgba(255, 140, 77, 0.5)' },  // Orange
    { bg: '#FF5A5A', border: '#CC3333', glow: 'rgba(255, 90, 90, 0.5)' },   // Coral red
    { bg: '#5AC8FA', border: '#3AAFDD', glow: 'rgba(90, 200, 250, 0.5)' },  // Cyan
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
 * Phase 0: Bright candy colors (default)
 * Phase 1: Slightly muted, amber tones creeping in
 * Phase 2: Cooler, more blue/purple, hints of isolation
 * Phase 3: Dark, cold, shadowy
 * Phase 4: Near-black with deep crimson/purple accents
 */
export function getPhaseTheme(phase: number): PhaseTheme {
  switch (phase) {
    case 0:
      return {
        bgPrimary: '#667EEA',
        bgSecondary: '#764BA2',
        bgTertiary: '#667EEA',
        overlayTop: 'rgba(76, 29, 149, 0.25)',
        overlayMid: 'rgba(102, 126, 234, 0.3)',
        overlayBottom: 'rgba(240, 147, 251, 0.2)',
        centerGlow: 'rgba(255, 255, 255, 0.1)',
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
        victoryTitleColor: CandyColors.pink.main,
        victoryGlowColor: CandyColors.yellow.light,
        modalOverlayColor: 'rgba(76, 29, 149, 0.7)',
        modalBgColor: CandyColors.white,
        modalTextColor: CandyColors.purple.main,
        // WCAG AA-checked: 4.8:1 on modalBg #FFFFFF, 4.6:1 on statBg #F8FAFC
        // (gray[400] measured only 2.6:1 — unreadable secondary text)
        modalSecondaryTextColor: CandyColors.gray[500],
        modalStatBgColor: CandyColors.gray[50],
        modalDividerColor: CandyColors.gray[200],
        vignetteColor: '#4C1D95',
      };
    case 1:
      return {
        bgPrimary: '#5B6DB0',
        bgSecondary: '#6B4592',
        bgTertiary: '#5B6DB0',
        overlayTop: 'rgba(60, 25, 120, 0.3)',
        overlayMid: 'rgba(80, 100, 180, 0.3)',
        overlayBottom: 'rgba(180, 120, 200, 0.2)',
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
        victoryTitleColor: '#D06090',
        victoryGlowColor: '#E8D080',
        modalOverlayColor: 'rgba(60, 25, 120, 0.7)',
        modalBgColor: '#FAF8FF',
        modalTextColor: '#7050A0',
        // WCAG AA-checked: 5.8:1 on modalBg #FAF8FF, 5.2:1 on statBg #F0ECF5
        // (violet-gray keeps the Phase 1 lavender character; gray[400] was 2.5:1)
        modalSecondaryTextColor: '#665E7A',
        modalStatBgColor: '#F0ECF5',
        modalDividerColor: CandyColors.gray[200],
        vignetteColor: '#3D1870',
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
        victoryTitleColor: '#9868A8',
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
          'rgba(120, 110, 160, 0.2)',
          'rgba(100, 80, 130, 0.2)',
          'rgba(90, 90, 140, 0.2)',
          'rgba(80, 100, 140, 0.15)',
          'rgba(110, 100, 150, 0.15)',
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
        particleColors: [
          'rgba(80, 60, 100, 0.15)',
          'rgba(120, 40, 60, 0.15)',
          'rgba(60, 50, 90, 0.15)',
          'rgba(50, 60, 90, 0.12)',
          'rgba(100, 40, 80, 0.12)',
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
          'rgba(100, 80, 140, 0.12)',   // Ghostly purple
          'rgba(80, 80, 120, 0.12)',    // Pale slate
          'rgba(120, 100, 160, 0.10)',  // Dim lavender
          'rgba(90, 70, 110, 0.10)',    // Faded mauve
          'rgba(70, 70, 100, 0.08)',    // Almost invisible
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
      return {
        modalBg: '#1A1A2E',
        modalBorder: 'rgba(90, 70, 140, 0.25)',
        modalShadowColor: '#2D1530',
        accentLine: '#5A4880',
        spriteBg: '#151525',
        portraitRingBg: '#252540',
        portraitRingBorder: 'rgba(90, 70, 140, 0.5)',
        bubbleBg: '#222238',
        bubbleBorder: 'rgba(90, 70, 140, 0.2)',
        nameColor: '#9080B0',
        textColor: '#9898B0',
        subtitleColor: '#9490AC', // WCAG AA-checked vs bubbleBg
        progressColor: '#585870',
        primaryButtonBg: '#4A3870',
        primaryButtonShadow: '#2A1850',
        secondaryButtonBg: '#3A6848',
        secondaryButtonText: '#C0C0D0',
        cooldownBg: 'rgba(60, 40, 90, 0.95)',
        cooldownBorder: 'rgba(90, 70, 140, 0.3)',
        overlayBg: 'rgba(10, 8, 25, 0.75)',
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
        nameColor: '#7050A0',
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
        nameColor: '#A04050',
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
  5: '#1d1830', // post-revelation: settled, muted purple
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
