import { StyleSheet } from 'react-native';
import { CandyColors, getPhaseTheme } from '../theme/colors';
import { getSurfaceTheme } from '../theme/surfaces';
import { BODY_FONT, BODY_FONT_BOLD, BODY_FONT_ITALIC } from '../theme/fonts';

/**
 * Returns the dominant background color for a given screen at a given phase.
 * Used by the transition overlay to match the destination screen's color,
 * preventing dark-bar flashes during the fade-out reveal.
 */
export function getScreenBackgroundColor(screen: string, phase: number): string {
  switch (screen) {
    case 'home':
      // Must match PHASE_BG_COLORS in HouseWorld.tsx: each value is sampled
      // from the TOP row of that phase's sky asset (sky_day/afternoon/dusk/
      // storm/shadow.png; Phase 5 reuses sky_shadow) so the backdrop extends
      // the sky seamlessly. Re-sample if the sky assets are regenerated.
      return { 0: '#439cf2', 1: '#1583f9', 2: '#684381', 3: '#000000', 4: '#050816', 5: '#050816' }[phase] ?? '#439cf2';
    case 'puzzle':
      return getPhaseTheme(phase as any).bgPrimary;
    case 'settings':
    case 'stats':
    case 'ledger':
    case 'gallery':
    case 'shop':
      // The restyled secondary screens all sit on the shared surface theme's
      // deep tinted base — the transition overlay must match it or the
      // fade-out reveals a color jump.
      return getSurfaceTheme(phase).screenBg;
    case 'pit':
      return { 0: '#6fb7df', 1: '#104c83', 2: '#514378', 3: '#060612', 4: '#1a122a', 5: '#1a122a' }[phase] ?? '#6fb7df';
    default:
      return '#1A1A2E';
  }
}

/**
 * Phase-aware palette for the bottom action buttons (UNDO / HINT / RESTART).
 * They keep their distinct HUE identity at every phase (warm=undo, cool=hint,
 * green=restart — muscle memory holds), but darken and desaturate into the
 * dread register from Phase 3 so three candy buttons don't glow against a
 * near-black board and break the descent. Phases 0-2 are the original candy
 * colors, pixel-identical to before.
 */
export type ActionButtonKind = 'undo' | 'hint' | 'restart';
export function getActionButtonColors(
  kind: ActionButtonKind,
  phase: number
): { bg: string; border: string; glow: string } {
  const candy = {
    undo: { bg: CandyColors.yellow.main, border: CandyColors.yellow.shadow, glow: CandyColors.yellow.glow },
    hint: { bg: CandyColors.blue.main, border: CandyColors.blue.shadow, glow: CandyColors.blue.glow },
    restart: { bg: CandyColors.green.main, border: CandyColors.green.shadow, glow: CandyColors.green.glow },
  } as const;
  if (phase < 3) return candy[kind];
  // Dread-shifted: muted, darker, low-glow — hue preserved so each button is
  // still recognizable, but the whole cluster recedes toward the board.
  const dusk = {
    undo: { bg: '#8A6A2E', border: '#5E4718', glow: 'rgba(160, 120, 60, 0.35)' },
    hint: { bg: '#2E4A78', border: '#1B2E52', glow: 'rgba(70, 110, 170, 0.35)' },
    restart: { bg: '#2E6248', border: '#194030', glow: 'rgba(60, 130, 95, 0.35)' },
  } as const;
  if (phase < 4) return dusk[kind];
  // Phase 4+: deeper still, a crimson-cast on the warm control, near-black cool.
  const dark = {
    undo: { bg: '#6B4A1E', border: '#3E2A10', glow: 'rgba(130, 70, 40, 0.3)' },
    hint: { bg: '#243858', border: '#14203A', glow: 'rgba(60, 90, 140, 0.3)' },
    restart: { bg: '#244A38', border: '#132A20', glow: 'rgba(50, 100, 75, 0.3)' },
  } as const;
  return dark[kind];
}

export const appStyles = StyleSheet.create({
  initialLoadingContainer: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  initialLoadingCard: {
    minWidth: 220,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  initialLoadingTitle: {
    marginTop: 14,
    fontSize: 22,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '900',
    color: CandyColors.white,
    letterSpacing: 1.2,
  },
  initialLoadingSubtitle: {
    marginTop: 8,
    fontSize: 13,
    fontFamily: BODY_FONT,
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.4,
  },
  container: {
    flex: 1,
    backgroundColor: CandyColors.purple.main,
  },

  // Header — paddingTop applied inline in App.tsx via useScreenInsets
  // (safe-area aware; StyleSheets are static so insets can't live here)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    zIndex: 100,
  },
  headerHomeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerHomeText: {
    fontSize: 20,
    fontFamily: BODY_FONT,
  },
  // Invisible layout stand-in for the withheld home button during onboarding:
  // identical footprint (the wordmark stays centered), ZERO visible chrome —
  // no background, no border, nothing to read as an empty dead circle.
  headerHomeSpacer: {
    width: 40,
    height: 40,
  },
  headerTitleArea: {
    flex: 1,
    alignItems: 'center',
  },
  dailyBadge: {
    backgroundColor: CandyColors.yellow.main,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dailyBadgeText: {
    fontSize: 14,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '900',
    color: CandyColors.gray[800],
    letterSpacing: 2,
  },
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  helpButtonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  helpButtonText: {
    fontSize: 22,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '900',
    color: CandyColors.white,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    // Top-align so a wrapped left group (Challenge + Double Shift on a narrow
    // screen) sits under itself while the difficulty button stays at the top.
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 8,
    zIndex: 100,
  },
  difficultyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    // Dark translucent fill (not translucent-white) so the white label reads
    // >= 4.5:1 over the bright phase-0/1 board — a translucent-white pill left
    // 12px white text at sub-3:1. Mirrors the overlay-banner container pattern.
    backgroundColor: 'rgba(20, 10, 40, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(180, 150, 220, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
    // Never let the setup button clip off the right edge — the left badges
    // shrink/wrap instead.
    flexShrink: 0,
  },
  difficultyButtonHighlighted: {
    borderWidth: 2,
    borderColor: CandyColors.yellow.main,
    shadowColor: CandyColors.yellow.main,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  // Phase-aware darkening (matches the phaseBadge register): the setup pill
  // cools from candy-translucent-white into the dread palette so it tracks the
  // board instead of staying bright while everything around it darkens. The
  // difficulty DOT keeps its meaningful color at every phase.
  difficultyButtonDark: {
    backgroundColor: 'rgba(60, 30, 80, 0.4)',
  },
  difficultyButtonVoid: {
    backgroundColor: 'rgba(20, 10, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(120, 40, 80, 0.4)',
  },
  difficultyButtonShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  difficultyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  difficultyDotEasy: {
    backgroundColor: CandyColors.green.main,
  },
  difficultyDotMedium: {
    backgroundColor: CandyColors.yellow.main,
  },
  difficultyDotMediumPlus: {
    backgroundColor: CandyColors.orange.main,
  },
  difficultyDotHard: {
    backgroundColor: CandyColors.red.main,
  },
  difficultyText: {
    fontSize: 12,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '800',
    color: CandyColors.white,
    marginRight: 6,
  },
  difficultyArrow: {
    fontSize: 8,
    fontFamily: BODY_FONT,
    color: 'rgba(255, 255, 255, 0.7)',
  },

  // Toast
  toastContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    zIndex: 50,
  },

  // Game area
  gameArea: {
    flex: 1,
    paddingHorizontal: 8,
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  rowsContainer: {
    paddingVertical: 16,
    paddingBottom: 40,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    borderRadius: 24,
  },
  loadingBox: {
    backgroundColor: CandyColors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: CandyColors.purple.dark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '700',
    color: CandyColors.purple.main,
  },
  loadingGlyph: {
    marginTop: 8,
    fontSize: 18,
    fontFamily: BODY_FONT,
    color: CandyColors.purple.main,
    opacity: 0.8,
  },
  loadingHint: {
    marginTop: 6,
    fontSize: 11,
    fontFamily: BODY_FONT_BOLD,
    color: CandyColors.gray[500],
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  timeUpText: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 16,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '800',
    color: CandyColors.purple.main,
    textAlign: 'center',
    maxWidth: 240,
  },
  timeUpButtonRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  // The Try Again / Home actions are now phase-aware CandyButtons (same cottage
  // bevel GameAlertModal uses); each takes an equal share of the row.
  timeUpButtonFlex: {
    flex: 1,
  },
  // Speed rescue — opt-in rewarded continue inside the Time's-Up card
  speedRescueButton: {
    marginTop: 14,
    alignSelf: 'stretch',
  },

  // Controls — paddingBottom applied inline in App.tsx via useScreenInsets
  // (max(30, safe-area bottom) so buttons clear the home indicator)
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 20,
  },

  // Stuck-recovery panel
  stuckPanel: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderWidth: 2,
    borderColor: CandyColors.yellow.main,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  stuckPanelTitle: {
    fontSize: 16,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '800',
    color: CandyColors.gray[800],
    textAlign: 'center',
    marginBottom: 4,
  },
  stuckPanelBody: {
    fontSize: 13,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '600',
    color: CandyColors.gray[600],
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  stuckPanelButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  stuckPanelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: CandyColors.yellow.main,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stuckPanelButtonPrimary: {
    backgroundColor: CandyColors.green.main,
  },
  stuckPanelButtonDisabled: {
    opacity: 0.4,
  },
  stuckPanelButtonPressed: {
    opacity: 0.75,
  },
  stuckPanelButtonText: {
    fontSize: 15,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Challenge mode styles
  leftStatsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    // Fill the space up to the difficulty button and wrap the badges (e.g.
    // Challenge + Double Shift) onto a second line instead of overflowing.
    flex: 1,
    minWidth: 0,
    flexWrap: 'wrap',
    marginRight: 8,
  },
  challengeBadge: {
    backgroundColor: CandyColors.red.main,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    // On a tight width the inline "refill undo" button wraps below the label
    // instead of forcing the pill wider than the row.
    flexWrap: 'wrap',
  },
  // The CHALLENGE pill keeps its red identity (the danger signal) but sinks
  // toward a dread crimson as the story darkens, so it stops reading as a
  // bright candy chip against a near-black board.
  challengeBadgeDark: {
    backgroundColor: CandyColors.red.dark,
  },
  challengeBadgeVoid: {
    backgroundColor: '#7A1030',
  },
  challengeBadgeText: {
    fontSize: 10,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '900',
    color: CandyColors.white,
    letterSpacing: 1,
  },
  challengeUndoText: {
    fontSize: 11,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  buyUndoButton: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    // Dark translucent fill (was a translucent-amber tint that composited over
    // the red CHALLENGE pill and left the amber label at ~2.3:1). The amber
    // keeps its currency identity via the border + text and now reads >= 8:1.
    backgroundColor: 'rgba(20, 10, 40, 0.62)',
    borderWidth: 1,
    borderColor: 'rgba(255, 201, 77, 0.5)',
  },
  buyUndoButtonDisabled: {
    opacity: 0.4,
  },
  buyUndoText: {
    fontSize: 11,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '900',
    // #FFD479 on the dark chip above computes 8.16:1 (was 2.26:1 on the amber
    // tint over red).
    color: '#FFD479',
  },
  speedTimerContainer: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 28,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 6,
    marginTop: 2,
  },
  speedTimerUrgent: {
    backgroundColor: 'rgba(210, 40, 70, 0.85)',
  },
  speedTimerText: {
    fontSize: 28,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '900',
    color: CandyColors.white,
    letterSpacing: 1,
    textAlign: 'center',
  },
  speedTimerTextUrgent: {
    color: '#FFE0E0',
  },
  speedTimerCritical: {
    backgroundColor: 'rgba(230, 20, 40, 0.95)',
  },
  speedTimerTextCritical: {
    color: CandyColors.white,
    textShadowColor: 'rgba(255, 60, 60, 0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  speedRoundText: {
    fontSize: 12,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '800',
    color: '#FFE9B0',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 2,
  },
  variantBadge: {
    // Dark translucent fill (not translucent-white) so the badge label reads
    // >= 9:1 over the bright board — the old rgba white fill left the 9px
    // label at ~2.5:1. Matches the overlay-banner container treatment.
    backgroundColor: 'rgba(20, 10, 40, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(180, 150, 220, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 180,
  },
  variantBadgeDark: {
    backgroundColor: 'rgba(35, 18, 45, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(130, 70, 120, 0.35)',
  },
  variantBadgeIcon: {
    fontSize: 10,
    fontFamily: BODY_FONT,
  },
  variantBadgeIconImage: {
    width: 15,
    height: 15,
  },
  variantBadgeText: {
    fontSize: 11,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  variantBadgeTextDark: {
    color: 'rgba(220, 170, 200, 0.95)',
  },

  // Phase indicator badge
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    gap: 4,
  },
  phaseBadgeDark: {
    backgroundColor: 'rgba(60, 30, 80, 0.4)',
  },
  phaseBadgeVoid: {
    backgroundColor: 'rgba(20, 10, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(120, 40, 80, 0.4)',
  },
  phaseBadgeIcon: {
    fontSize: 12,
    fontFamily: BODY_FONT,
  },
  phaseBadgeText: {
    fontSize: 10,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
  },
  phaseBadgeTextDark: {
    color: 'rgba(200, 180, 220, 0.9)',
  },

  // Phase change dramatic flash overlay
  phaseFlashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 999,
  },
  dreadPulseOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(100, 0, 30, 1)',
    zIndex: 998,
  },
  victoryGlitchOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  victoryGlitchText: {
    color: '#FF0040',
    fontSize: 28,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: '#FF0040',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  // The guaranteed first-victory glitch, held longer and rendered louder — the
  // game's opening promise that something else is here.
  victoryGlitchOverlayProminent: {
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
  },
  victoryGlitchTextProminent: {
    fontSize: 40,
    letterSpacing: 6,
    textShadowRadius: 22,
  },
  microBeatWhisperOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  microBeatWhisperText: {
    color: 'rgba(200, 180, 220, 0.9)',
    fontSize: 18,
    fontFamily: BODY_FONT_ITALIC,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 40,
    letterSpacing: 1,
    textShadowColor: 'rgba(150, 100, 200, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  interjectionContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 500,
  },
  interjectionText: {
    fontSize: 13,
    fontFamily: BODY_FONT_BOLD,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    backgroundColor: 'rgba(100, 60, 140, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  interjectionTextDark: {
    color: 'rgba(200, 160, 180, 0.9)',
    backgroundColor: 'rgba(30, 15, 40, 0.7)',
  },
});
