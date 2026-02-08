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
  const charCode = char.toUpperCase().charCodeAt(0);
  const index = charCode % CandyColors.tileColors.length;
  return CandyColors.tileColors[index];
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
        victoryTitleColor: '#7858A0',
        victoryGlowColor: '#605880',
        vignetteColor: '#180830',
      };
    case 4:
    default:
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
        victoryTitleColor: '#6040A0',
        victoryGlowColor: '#302840',
        vignetteColor: '#0A0418',
      };
  }
}

export default CandyColors;
