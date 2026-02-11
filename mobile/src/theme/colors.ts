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
        victoryTitleColor: '#8070B0',   // Muted, peaceful purple
        victoryGlowColor: '#403860',    // Dim
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
        subtitleColor: '#686880',
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
        textColor: '#787890',
        subtitleColor: '#505068',
        progressColor: '#404058',
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
        textColor: '#686878',
        subtitleColor: '#484858',
        progressColor: '#383848',
        primaryButtonBg: '#6B1830',
        primaryButtonShadow: '#3B0818',
        secondaryButtonBg: '#283028',
        secondaryButtonText: '#908898',
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
        textColor: '#706888',
        subtitleColor: '#505068',
        progressColor: '#404058',
        primaryButtonBg: '#3D3060',
        primaryButtonShadow: '#1D1840',
        secondaryButtonBg: '#2A3838',
        secondaryButtonText: '#908898',
        cooldownBg: 'rgba(50, 30, 70, 0.95)',
        cooldownBorder: 'rgba(100, 80, 140, 0.2)',
        overlayBg: 'rgba(5, 3, 12, 0.82)',
      };
  }
}

// ============================================================================
// SHARED SURFACE TOKENS
// Phase-aware material system for cards, glass UI, and overlays
// ============================================================================

export interface PhaseSurfaceTheme {
  // Translucent "glass" surfaces used in headers/chips/buttons
  glassStrong: string;
  glassSoft: string;
  glassBorder: string;
  glassShine: string;
  // Solid card-like surfaces used in modals/panels
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  // Full-screen overlay/backdrop
  modalOverlay: string;
  // Text hierarchy for over-background UI
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // Accent channels
  accent: string;
  accentSoft: string;
  successAccent: string;
  dangerAccent: string;
  // Badge treatment
  badgeBg: string;
  badgeBorder: string;
}

/**
 * Shared phase-aware surface tokens.
 * These are intentionally broader than puzzle-only theming so all screens
 * can use consistent materials and depth treatment.
 */
export function getPhaseSurfaceTheme(phase: number): PhaseSurfaceTheme {
  switch (phase) {
    case 0:
      return {
        glassStrong: 'rgba(255, 255, 255, 0.24)',
        glassSoft: 'rgba(255, 255, 255, 0.14)',
        glassBorder: 'rgba(255, 255, 255, 0.28)',
        glassShine: 'rgba(255, 255, 255, 0.24)',
        cardBg: 'rgba(255, 255, 255, 0.94)',
        cardBorder: 'rgba(168, 85, 247, 0.18)',
        cardShadow: '#5B21B6',
        modalOverlay: 'rgba(48, 20, 90, 0.72)',
        textPrimary: '#FFFFFF',
        textSecondary: 'rgba(255, 255, 255, 0.88)',
        textMuted: 'rgba(255, 255, 255, 0.68)',
        accent: CandyColors.pink.main,
        accentSoft: 'rgba(236, 72, 153, 0.24)',
        successAccent: CandyColors.green.main,
        dangerAccent: CandyColors.red.main,
        badgeBg: 'rgba(102, 126, 234, 0.36)',
        badgeBorder: 'rgba(255, 255, 255, 0.22)',
      };
    case 1:
      return {
        glassStrong: 'rgba(255, 245, 225, 0.22)',
        glassSoft: 'rgba(255, 240, 210, 0.12)',
        glassBorder: 'rgba(230, 200, 160, 0.28)',
        glassShine: 'rgba(255, 255, 255, 0.2)',
        cardBg: 'rgba(252, 247, 239, 0.95)',
        cardBorder: 'rgba(180, 140, 100, 0.2)',
        cardShadow: '#4A2D6E',
        modalOverlay: 'rgba(32, 20, 52, 0.75)',
        textPrimary: '#FFFFFF',
        textSecondary: 'rgba(250, 245, 235, 0.86)',
        textMuted: 'rgba(240, 225, 200, 0.66)',
        accent: '#D48A86',
        accentSoft: 'rgba(212, 138, 134, 0.24)',
        successAccent: '#73B668',
        dangerAccent: '#C85A64',
        badgeBg: 'rgba(122, 88, 146, 0.42)',
        badgeBorder: 'rgba(230, 200, 160, 0.24)',
      };
    case 2:
      return {
        glassStrong: 'rgba(196, 186, 255, 0.14)',
        glassSoft: 'rgba(170, 160, 235, 0.1)',
        glassBorder: 'rgba(150, 140, 220, 0.26)',
        glassShine: 'rgba(220, 220, 255, 0.12)',
        cardBg: 'rgba(21, 20, 38, 0.9)',
        cardBorder: 'rgba(94, 78, 148, 0.35)',
        cardShadow: '#151028',
        modalOverlay: 'rgba(8, 7, 22, 0.8)',
        textPrimary: 'rgba(228, 224, 246, 0.95)',
        textSecondary: 'rgba(195, 188, 223, 0.88)',
        textMuted: 'rgba(152, 146, 184, 0.72)',
        accent: '#9E7FC9',
        accentSoft: 'rgba(158, 127, 201, 0.24)',
        successAccent: '#4C9E76',
        dangerAccent: '#8E4664',
        badgeBg: 'rgba(74, 56, 120, 0.52)',
        badgeBorder: 'rgba(132, 110, 190, 0.38)',
      };
    case 3:
      return {
        glassStrong: 'rgba(86, 72, 132, 0.28)',
        glassSoft: 'rgba(56, 44, 96, 0.22)',
        glassBorder: 'rgba(122, 102, 184, 0.26)',
        glassShine: 'rgba(180, 160, 225, 0.1)',
        cardBg: 'rgba(16, 12, 28, 0.9)',
        cardBorder: 'rgba(86, 64, 128, 0.4)',
        cardShadow: '#090612',
        modalOverlay: 'rgba(5, 3, 14, 0.84)',
        textPrimary: 'rgba(228, 214, 246, 0.94)',
        textSecondary: 'rgba(186, 170, 210, 0.86)',
        textMuted: 'rgba(138, 124, 164, 0.72)',
        accent: '#7B5DAF',
        accentSoft: 'rgba(123, 93, 175, 0.24)',
        successAccent: '#4A7A66',
        dangerAccent: '#8B3A54',
        badgeBg: 'rgba(38, 27, 62, 0.66)',
        badgeBorder: 'rgba(108, 84, 156, 0.35)',
      };
    case 4:
      return {
        glassStrong: 'rgba(36, 20, 30, 0.7)',
        glassSoft: 'rgba(26, 12, 20, 0.58)',
        glassBorder: 'rgba(132, 54, 76, 0.36)',
        glassShine: 'rgba(170, 90, 114, 0.11)',
        cardBg: 'rgba(10, 8, 16, 0.94)',
        cardBorder: 'rgba(122, 44, 62, 0.46)',
        cardShadow: '#040209',
        modalOverlay: 'rgba(4, 2, 8, 0.88)',
        textPrimary: 'rgba(214, 186, 202, 0.94)',
        textSecondary: 'rgba(176, 146, 162, 0.84)',
        textMuted: 'rgba(128, 100, 116, 0.7)',
        accent: '#8A3D54',
        accentSoft: 'rgba(138, 61, 84, 0.26)',
        successAccent: '#466052',
        dangerAccent: '#A33C4D',
        badgeBg: 'rgba(28, 14, 24, 0.78)',
        badgeBorder: 'rgba(118, 46, 66, 0.4)',
      };
    case 5:
    default:
      return {
        glassStrong: 'rgba(56, 42, 80, 0.42)',
        glassSoft: 'rgba(42, 30, 62, 0.32)',
        glassBorder: 'rgba(118, 98, 162, 0.3)',
        glassShine: 'rgba(186, 168, 220, 0.1)',
        cardBg: 'rgba(14, 12, 24, 0.92)',
        cardBorder: 'rgba(96, 76, 132, 0.36)',
        cardShadow: '#070512',
        modalOverlay: 'rgba(5, 3, 12, 0.84)',
        textPrimary: 'rgba(214, 206, 232, 0.95)',
        textSecondary: 'rgba(174, 162, 202, 0.86)',
        textMuted: 'rgba(132, 120, 164, 0.72)',
        accent: '#8877B6',
        accentSoft: 'rgba(136, 119, 182, 0.24)',
        successAccent: '#4E6C68',
        dangerAccent: '#7A506A',
        badgeBg: 'rgba(34, 26, 52, 0.72)',
        badgeBorder: 'rgba(110, 92, 150, 0.34)',
      };
  }
}

export default CandyColors;
