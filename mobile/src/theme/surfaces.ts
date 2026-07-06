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
  /** Bottom shade band alpha (the panel's own weight). */
  shadeAlpha: 0.08,
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
 * Press-feedback spring, phase-aware: bright phases snap back playfully, dark
 * phases release heavily — the same weight language the letter tiles speak.
 */
export function getPressSpring(phase: number): { friction: number; tension: number } {
  if (phase >= 4) return { friction: 9, tension: 90 };
  if (phase >= 3) return { friction: 7, tension: 120 };
  return { friction: 4, tension: 200 };
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

export function getSurfaceTheme(phase: number): SurfaceTheme {
  const pt = getPhaseTheme(phase);
  const dark = phase >= 3;
  const body = dark
    ? pt.modalSecondaryTextColor
    : phase >= 2 ? '#493C66' : phase >= 1 ? '#554B70' : '#475569';
  const muted = dark
    ? 'rgba(196, 181, 224, 0.75)'
    : phase >= 2 ? '#5E5178' : '#5D5476';
  return {
    overlay: pt.modalOverlayColor,
    screenBg: dark
      ? (phase >= 5 ? '#1D1833' : phase >= 4 ? '#131322' : '#232741')
      : phase >= 2 ? '#3B3560' : phase >= 1 ? '#4A4E8E' : '#4F46A8',
    cardBg: pt.modalBgColor,
    cardBorder: dark ? 'rgba(147, 51, 234, 0.22)' : 'rgba(255, 255, 255, 0.4)',
    glow: pt.victoryGlowColor,
    title: pt.modalTextColor,
    body,
    muted,
    sectionBg: pt.modalStatBgColor,
    sectionBorder: pt.modalDividerColor,
    rowBg: pt.modalStatBgColor,
    rowBorder: pt.modalDividerColor,
    amberText: dark ? '#E9B468' : '#7A4E00',
    amberTint: dark ? 'rgba(255, 201, 77, 0.10)' : 'rgba(202, 138, 4, 0.10)',
    amberTintBorder: dark ? 'rgba(255, 201, 77, 0.30)' : 'rgba(202, 138, 4, 0.35)',
    primaryBg: dark ? (phase >= 5 ? '#6B5B95' : '#7A2A48') : '#7E57C2',
    primaryEdge: dark ? (phase >= 5 ? '#4A3F6B' : '#521C30') : '#5B3E94',
    primaryText: '#FFF7FA',
    pillBg: dark ? '#C98A4A' : '#F6BA3F',
    pillEdge: dark ? '#8F5F2E' : '#C8901E',
    pillText: dark ? '#241302' : '#3F2B04',
    secondaryBg: dark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(94, 82, 175, 0.10)',
    secondaryBorder: dark ? 'rgba(196, 181, 224, 0.35)' : 'rgba(94, 82, 175, 0.45)',
    secondaryText: dark ? '#D8CCEE' : '#4A3E8C',
    dangerText: dark ? '#E08A8A' : '#B03A3A',
  };
}
