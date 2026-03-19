import { StyleSheet, Platform, StatusBar } from 'react-native';
import { CandyColors, getPhaseTheme } from '../theme/colors';

/**
 * Returns the dominant background color for a given screen at a given phase.
 * Used by the transition overlay to match the destination screen's color,
 * preventing dark-bar flashes during the fade-out reveal.
 */
export function getScreenBackgroundColor(screen: string, phase: number): string {
  switch (screen) {
    case 'home':
      return { 0: '#6fb7df', 1: '#104c83', 2: '#514378', 3: '#060612', 4: '#1a122a', 5: '#1E1830' }[phase] ?? '#6fb7df';
    case 'puzzle':
      return getPhaseTheme(phase as any).bgPrimary;
    case 'settings':
    case 'stats':
      return CandyColors.purple.main;
    case 'pit':
      return { 0: '#6fb7df', 1: '#104c83', 2: '#514378', 3: '#060612', 4: '#1a122a' }[phase] ?? '#6fb7df';
    case 'ledger':
      return phase <= 1 ? CandyColors.purple.main : phase === 2 ? '#3A3060' : phase === 3 ? '#1A1530' : '#0F0818';
    case 'gallery':
      return phase >= 3 ? '#0A0A14' : '#1A1030';
    default:
      return '#1A1A2E';
  }
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
    fontWeight: '900',
    color: CandyColors.white,
    letterSpacing: 1.2,
  },
  initialLoadingSubtitle: {
    marginTop: 8,
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.4,
  },
  container: {
    flex: 1,
    backgroundColor: CandyColors.purple.main,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 60,
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
    fontWeight: '900',
    color: CandyColors.white,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    zIndex: 100,
  },
  difficultyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    overflow: 'hidden',
  },
  difficultyButtonHighlighted: {
    borderWidth: 2,
    borderColor: CandyColors.yellow.main,
    shadowColor: CandyColors.yellow.main,
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
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
    fontWeight: '800',
    color: CandyColors.white,
    marginRight: 6,
  },
  difficultyArrow: {
    fontSize: 8,
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
    ...StyleSheet.absoluteFillObject,
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
    fontWeight: '700',
    color: CandyColors.purple.main,
  },
  loadingGlyph: {
    marginTop: 8,
    fontSize: 18,
    color: CandyColors.purple.main,
    opacity: 0.8,
  },
  loadingHint: {
    marginTop: 6,
    fontSize: 11,
    color: CandyColors.gray[500],
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Controls
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 30,
    gap: 20,
  },

  // Challenge mode styles
  leftStatsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  challengeBadge: {
    backgroundColor: CandyColors.red.main,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  challengeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: CandyColors.white,
    letterSpacing: 1,
  },
  challengeUndoText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
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
    fontWeight: '900',
    color: CandyColors.white,
    letterSpacing: 1,
    textAlign: 'center',
  },
  speedTimerTextUrgent: {
    color: '#FFE0E0',
  },
  variantBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
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
  },
  variantBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.85)',
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
  },
  phaseBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 1,
  },
  phaseBadgeTextDark: {
    color: 'rgba(200, 180, 220, 0.9)',
  },

  // Phase change dramatic flash overlay
  phaseFlashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 999,
  },
  dreadPulseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(100, 0, 30, 1)',
    zIndex: 998,
  },
  victoryGlitchOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  victoryGlitchText: {
    color: '#FF0040',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: '#FF0040',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  microBeatWhisperOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  microBeatWhisperText: {
    color: 'rgba(200, 180, 220, 0.9)',
    fontSize: 18,
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
