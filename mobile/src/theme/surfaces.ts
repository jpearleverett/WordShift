/**
 * Shared "feel kit" for menus, modals, and secondary screens.
 *
 * One place for the surface design system so every panel and button shares
 * identical radii, bevel depth, easing, and phase-aware palette. This is the
 * antidote to the "flat and webby" secondary screens: layered tinted panels
 * instead of white cards, chunky two-layer buttons instead of flat pills,
 * springy asymmetric modal choreography instead of linear fades.
 *
 * Palette discipline: every color here derives from getPhaseTheme so the
 * menus live in the same world as the board and the house. No pure white, no
 * pure black, no untinted grays. Exactly one warm amber accent is reserved
 * for prices/amber amounts. Every text/background pair holds >= 4.5:1 WCAG
 * contrast across phases 0-5 (the light phases need deeper body tones than
 * gray-400; the dark phases' secondary text passes as-is).
 */
import { getPhaseTheme } from './colors';

// ---------------------------------------------------------------------------
// Tokens — geometry, alphas, and motion shared by every surface.
// ---------------------------------------------------------------------------

export const SURFACE = {
  /** Corner radius of full panels / modals. */
  panelRadius: 28,
  /** Corner radius of cards and list rows inside panels. */
  cardRadius: 16,
  /** Corner radius of buttons. */
  buttonRadius: 18,
  /** Physical thickness of the chunky button's bottom edge. */
  bevelDepth: 5,
  /** How far the button face travels down while pressed. */
  pressTravel: 3,
  /** Top highlight band alpha (the "glossy" light from above). */
  highlightAlpha: 0.10,
  /** Uppercase section-label letterSpacing (replaces the web gray-caption look). */
  sectionLetterSpacing: 1.2,
  /** Stagger interval for content cascade inside freshly opened panels. */
  staggerMs: 50,
  /** Modal entrance: springy (one soft overshoot). */
  modalIn: { friction: 7, tension: 65 },
  /** Modal exit: fast timing, never a bounce. */
  modalOutMs: 120,
} as const;

/**
 * Modal / toast entrance spring, phase-aware. SURFACE.modalIn stays the fixed
 * default for surfaces with no phase context; this ages the entrance with the
 * descent (bright springy overshoot -> heavy dark settle) for the surfaces that
 * DO know their phase, so a cottage sheet doesn't bounce in candy-bright over a
 * Phase-4 board. Mirrors the celebration/press ladders.
 */
export function getModalInSpring(phase: number): { friction: number; tension: number } {
  if (phase >= 4) return { friction: 10, tension: 55 };
  if (phase >= 3) return { friction: 8, tension: 60 };
  if (phase >= 2) return { friction: 7, tension: 62 };
  return SURFACE.modalIn;
}

/**
 * Press-feedback spring, phase-aware: bright phases snap back playfully, dark
 * phases release heavily — the same weight language the letter tiles speak.
 */
export function getPressSpring(phase: number): { friction: number; tension: number } {
  if (phase >= 4) return { friction: 9, tension: 90 };
  if (phase >= 3) return { friction: 7, tension: 120 };
  return { friction: 4, tension: 200 };
}

/**
 * The celebration spring for the victory ceremony (star pops, modal reveal).
 * The win is a WORLD arrival, so it takes the phase ladder like the letter
 * tiles: bright candy bounce in the early days, a heavy stone-like settle at
 * the reveal, so a triple candy-bounce star never contradicts the doctrine
 * that a phase-3+ victory "feels hollow". Mirrors the tile ladder shape
 * (LetterTile getSelectedSpringParams: friction 3->9, tension 200->80).
 */
export function getCelebrationSpring(phase: number): { friction: number; tension: number } {
  if (phase >= 4) return { friction: 9, tension: 80 };
  if (phase >= 3) return { friction: 7, tension: 95 };
  if (phase >= 2) return { friction: 5, tension: 105 };
  return { friction: 4, tension: 120 };
}

// ---------------------------------------------------------------------------
// Surface palette — the consolidated phase-aware theme for menu chrome.
// (Supersedes the per-file getStoreSurfaceTheme copies in StoreModal /
// PatronModal; both now import this.)
// ---------------------------------------------------------------------------

export interface SurfaceTheme {
  /** Tinted modal scrim (never pure black). */
  overlay: string;
  /** Full-screen background for secondary screens (deep tinted base). */
  screenBg: string;
  /**
   * Header inks for text sitting DIRECTLY on screenBg (screen titles, back
   * chips, section labels outside a card). screenBg is a deep wood tone in
   * every group, so these are cream — never reuse card inks (title/body/
   * primaryText) on screenBg: those are dark on the light skins and vanish.
   */
  headerTitle: string;
  headerMuted: string;
  /** Border for chips/pills that sit directly on screenBg. */
  headerChipBorder: string;
  /** Panel / modal card background. */
  cardBg: string;
  /** Panel frame border. */
  cardBorder: string;
  /** Soft glow blob color behind celebratory panels. */
  glow: string;
  /** Title / strongest text. */
  title: string;
  /** Body text (>= 4.5:1 on cardBg and sectionBg). */
  body: string;
  /** Muted caption text (still >= 4.5:1 on cardBg). */
  muted: string;
  /** Section / stat box fill inside a panel. */
  sectionBg: string;
  /** Section / stat box border. */
  sectionBorder: string;
  /** List-row fill (slightly distinct from sectionBg for alternating depth). */
  rowBg: string;
  /** List-row border frame. */
  rowBorder: string;
  /** THE one warm amber accent: text on light/dark surfaces. */
  amberText: string;
  amberTint: string;
  amberTintBorder: string;
  /** Chunky primary button: face / bottom edge / label. */
  primaryBg: string;
  primaryEdge: string;
  primaryText: string;
  /** Amber-pill button (prices, claims): face / edge / label. */
  pillBg: string;
  pillEdge: string;
  pillText: string;
  /** Secondary (outlined/tinted) button: fill / border / label. */
  secondaryBg: string;
  secondaryBorder: string;
  secondaryText: string;
  /** Destructive action text (quiet, never a red web button). */
  dangerText: string;
}

/**
 * Cottage material tokens per skin group (matches the generated pixel skin in
 * pixelSkin.generated.ts — see scripts/tools/generateUiPanels.mjs). Every
 * fill is the skin's parchment, every ink a warm brown (or cream once the
 * paper turns to ash at phase 4+); all named pairs hold >= 4.5:1 on their
 * intended fill. The amber accent is the one hue that survives every phase.
 */
const COTTAGE: Record<'bright' | 'dusk' | 'storm' | 'dark' | 'serene', Omit<SurfaceTheme, 'overlay' | 'glow'>> = {
  bright: {
    screenBg: '#5C4130', headerTitle: '#FBF0D9', headerMuted: '#E3CBA0', headerChipBorder: 'rgba(251, 240, 217, 0.35)', cardBg: '#F3E2BF', cardBorder: '#5A3418',
    title: '#3B2416', body: '#4A3222', muted: '#6B4A2F',
    sectionBg: '#EBD8B2', sectionBorder: '#D9BE8F', rowBg: '#EBD8B2', rowBorder: '#D9BE8F',
    amberText: '#7A4E00', amberTint: 'rgba(202, 138, 4, 0.12)', amberTintBorder: 'rgba(176, 111, 30, 0.45)',
    primaryBg: '#E8A33D', primaryEdge: '#8A5414', primaryText: '#3B2416',
    pillBg: '#E8A33D', pillEdge: '#8A5414', pillText: '#3B2416',
    secondaryBg: 'rgba(201, 138, 75, 0.16)', secondaryBorder: '#A96B33', secondaryText: '#4A3222',
    dangerText: '#A6402E',
  },
  dusk: {
    screenBg: '#4A3524', headerTitle: '#F2E2C2', headerMuted: '#DCC49B', headerChipBorder: 'rgba(242, 226, 194, 0.35)', cardBg: '#E6D0A9', cardBorder: '#48301C',
    title: '#33201E', body: '#43301F', muted: '#64492E',
    sectionBg: '#DCC49B', sectionBorder: '#C3A67D', rowBg: '#DCC49B', rowBorder: '#C3A67D',
    amberText: '#6F4700', amberTint: 'rgba(190, 128, 8, 0.12)', amberTintBorder: 'rgba(160, 100, 26, 0.45)',
    primaryBg: '#DC8026', primaryEdge: '#7E4A10', primaryText: '#33201E',
    pillBg: '#DC8026', pillEdge: '#7E4A10', pillText: '#33201E',
    secondaryBg: 'rgba(168, 116, 71, 0.16)', secondaryBorder: '#8A5A31', secondaryText: '#43301F',
    dangerText: '#96382A',
  },
  storm: {
    screenBg: '#33241E', headerTitle: '#DEC49E', headerMuted: '#C8AE85', headerChipBorder: 'rgba(222, 196, 158, 0.35)', cardBg: '#CDB289', cardBorder: '#301B14',
    title: '#2A1A10', body: '#2F1F14', muted: '#4A3626',
    sectionBg: '#C2A67D', sectionBorder: '#A3875F', rowBg: '#C2A67D', rowBorder: '#A3875F',
    amberText: '#5E3B00', amberTint: 'rgba(150, 98, 20, 0.14)', amberTintBorder: 'rgba(130, 82, 24, 0.5)',
    primaryBg: '#D97F2E', primaryEdge: '#733D12', primaryText: '#2A1A10',
    pillBg: '#D97F2E', pillEdge: '#733D12', pillText: '#2A1A10',
    secondaryBg: 'rgba(122, 82, 56, 0.18)', secondaryBorder: '#613E2B', secondaryText: '#2F1F14',
    // Deepened from #8A2F22 (4.11:1 on cardBg / 3.60:1 on sectionBg — below the
    // >= 4.5:1 contract) to #6E2015 (5.49:1 on cardBg, 4.81:1 on sectionBg),
    // keeping the danger-red hue.
    dangerText: '#6E2015',
  },
  dark: {
    screenBg: '#171013', headerTitle: '#E8D5B7', headerMuted: '#BBA68E', headerChipBorder: 'rgba(232, 213, 183, 0.30)', cardBg: '#352A31', cardBorder: '#0F0A10',
    title: '#E8D5B7', body: '#E8D5B7', muted: '#BBA68E',
    sectionBg: '#2E2429', sectionBorder: '#241B20', rowBg: '#2E2429', rowBorder: '#241B20',
    amberText: '#E9B468', amberTint: 'rgba(233, 180, 104, 0.10)', amberTintBorder: 'rgba(233, 180, 104, 0.35)',
    primaryBg: '#A83A28', primaryEdge: '#54160D', primaryText: '#F5E3CB',
    pillBg: '#A83A28', pillEdge: '#54160D', pillText: '#F5E3CB',
    secondaryBg: 'rgba(107, 70, 58, 0.22)', secondaryBorder: '#52332C', secondaryText: '#E8D5B7',
    dangerText: '#E08A8A',
  },
  serene: {
    screenBg: '#241B26', headerTitle: '#D9C8D4', headerMuted: '#A793A6', headerChipBorder: 'rgba(217, 200, 212, 0.30)', cardBg: '#332A38', cardBorder: '#151019',
    title: '#D9C8D4', body: '#D9C8D4', muted: '#A793A6',
    sectionBg: '#2C2431', sectionBorder: '#221B28', rowBg: '#2C2431', rowBorder: '#221B28',
    amberText: '#C99E63', amberTint: 'rgba(201, 158, 99, 0.10)', amberTintBorder: 'rgba(201, 158, 99, 0.35)',
    primaryBg: '#A97F45', primaryEdge: '#573C1C', primaryText: '#1F1512',
    pillBg: '#A97F45', pillEdge: '#573C1C', pillText: '#1F1512',
    secondaryBg: 'rgba(94, 70, 83, 0.22)', secondaryBorder: '#4A3742', secondaryText: '#D9C8D4',
    dangerText: '#D98A8A',
  },
};

export function getSurfaceTheme(phase: number): SurfaceTheme {
  const pt = getPhaseTheme(phase);
  const group = phase >= 5 ? 'serene' : phase >= 4 ? 'dark' : phase >= 3 ? 'storm' : phase >= 2 ? 'dusk' : 'bright';
  return {
    overlay: pt.modalOverlayColor,
    glow: pt.victoryGlowColor,
    ...COTTAGE[group],
  };
}
