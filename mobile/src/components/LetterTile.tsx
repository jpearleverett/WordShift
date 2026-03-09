import React, { useEffect, memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  cancelAnimation,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { Letter } from '../types';
import { getTileColor, CandyColors, getPhaseTheme } from '../theme/colors';
import { getSettingsSync } from '../services/settings';
import { shouldSimplifyAnimations } from '../services/deviceTier';
import { TileGlowCanvas } from './TileGlowCanvas';

interface LetterTileProps {
  letter: Letter;
  onPress?: () => void;
  isSelected?: boolean;
  isInteractable?: boolean;
  highlight?: 'default' | 'source' | 'locked';
  phase?: number;
  compact?: boolean;
  /** Whether this tile belongs to a word that resonates with the current narrative phase */
  isResonant?: boolean;
  /** Tutorial guidance highlight for the recommended tile */
  isGuided?: boolean;
  /** Whether this tile is on the currently active (source) row — gates decorative animation loops */
  isActiveRow?: boolean;
}

export function shouldRenderTileGlow(isSelected: boolean, isResonant: boolean): boolean {
  return isSelected || isResonant;
}

// Compact tile dimensions for 6+ letter words
const COMPACT_OUTER_W = 42;
const COMPACT_OUTER_H = 52;
const COMPACT_BODY_W = 42;
const COMPACT_BODY_H = 46;
const COMPACT_FONT = 21;

// Phase-aware animation parameters for selected tiles
function getSelectedSpringParams(phase: number) {
  if (phase >= 4) return { damping: 9, stiffness: 100 };
  if (phase >= 3) return { damping: 7, stiffness: 140 };
  if (phase >= 2) return { damping: 6, stiffness: 180 };
  return { damping: 4, stiffness: 220 };
}

function getWobbleDurations(phase: number) {
  if (phase >= 4) return { quarter: 250, half: 500 };
  if (phase >= 3) return { quarter: 200, half: 400 };
  if (phase >= 2) return { quarter: 150, half: 300 };
  return { quarter: 150, half: 300 };
}

function getBounceHeight(phase: number) {
  if (phase >= 4) return -2;
  if (phase >= 3) return -2.5;
  if (phase >= 2) return -3.5;
  return -4;
}

export const LetterTile: React.FC<LetterTileProps> = memo(({
  letter,
  onPress,
  isSelected,
  isInteractable,
  highlight = 'default',
  phase = 0,
  compact = false,
  isResonant = false,
  isGuided = false,
  isActiveRow = false,
}) => {
  const settings = getSettingsSync();
  const reducedMotion = settings.reducedMotion;

  // === REANIMATED SHARED VALUES ===
  const scaleAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0);
  const bounceAnim = useSharedValue(0);
  const shineAnim = useSharedValue(0);
  const wobbleAnim = useSharedValue(0);
  const guidePulseAnim = useSharedValue(0);

  // Get consistent color based on letter
  const tileColor = getTileColor(letter.char);

  // === IDLE ANIMATION (glow + shine) — Reanimated UI thread ===
  // Only run continuous loops on the active (source) row to avoid saturating the UI thread.
  useEffect(() => {
    if (reducedMotion) return;
    if (isActiveRow && isInteractable && !isSelected) {
      // Pulse glow: 0→1→0 on 1800ms cycle
      glowAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      );
      // Shine sweep: wait 2s then flash 0→1→0
      shineAnim.value = withRepeat(
        withSequence(
          withDelay(2000, withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) })),
          withTiming(0, { duration: 1 }),
        ),
        -1,
      );
    } else {
      glowAnim.value = 0;
      shineAnim.value = 0;
    }

    return () => {
      cancelAnimation(glowAnim);
      cancelAnimation(shineAnim);
    };
  }, [isActiveRow, isInteractable, isSelected, reducedMotion]);

  // === SELECTED ANIMATION (bounce + wobble + scale) — Reanimated UI thread ===
  useEffect(() => {
    if (reducedMotion) {
      scaleAnim.value = isSelected ? 1.08 : 1;
      bounceAnim.value = 0;
      wobbleAnim.value = 0;
      return;
    }
    if (isSelected) {
      const spring = getSelectedSpringParams(phase);
      const wobbleDur = getWobbleDurations(phase);
      const bounceH = getBounceHeight(phase);

      // Initial pop — phase-aware spring
      scaleAnim.value = withSequence(
        withSpring(1.15, { damping: spring.damping, stiffness: spring.stiffness }),
        withSpring(1.08, { damping: spring.damping + 2, stiffness: spring.stiffness }),
      );

      // Continuous wobble — ±3° rotation
      wobbleAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: wobbleDur.quarter, easing: Easing.inOut(Easing.sin) }),
          withTiming(-1, { duration: wobbleDur.half, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: wobbleDur.quarter, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      );

      // Floating bounce — phase-aware height
      bounceAnim.value = withRepeat(
        withSequence(
          withTiming(bounceH, { duration: 400, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 400, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
      );
    } else {
      scaleAnim.value = withTiming(1, { duration: 150 });
      bounceAnim.value = withTiming(0, { duration: 150 });
      wobbleAnim.value = withTiming(0, { duration: 100 });
    }

    return () => {
      cancelAnimation(scaleAnim);
      cancelAnimation(bounceAnim);
      cancelAnimation(wobbleAnim);
    };
  }, [isSelected, phase]);

  // === TUTORIAL GUIDANCE PULSE ===
  useEffect(() => {
    if (!isGuided) {
      guidePulseAnim.value = 0;
      return;
    }
    if (reducedMotion) {
      guidePulseAnim.value = 1;
      return;
    }
    guidePulseAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );

    return () => { cancelAnimation(guidePulseAnim); };
  }, [isGuided, reducedMotion]);

  // === PRESS HANDLERS ===
  const handlePressIn = () => {
    if (reducedMotion) return;
    if (isInteractable || isSelected) {
      scaleAnim.value = withSpring(0.92, { damping: 12, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (reducedMotion) return;
    if (isInteractable || isSelected) {
      scaleAnim.value = withSpring(isSelected ? 1.08 : 1, { damping: 8, stiffness: 200 });
    }
  };

  // === STYLES ===
  const getStyles = () => {
    if (highlight === 'locked') {
      if (phase >= 5) {
        return { bgColor: '#2E2A40', borderColor: '#3A3555', textColor: '#706890', shadowColor: '#2E2A40' };
      }
      if (phase >= 4) {
        return { bgColor: CandyColors.gray[700], borderColor: CandyColors.gray[800], textColor: CandyColors.gray[500], shadowColor: CandyColors.gray[800] };
      }
      if (phase >= 3) {
        return { bgColor: CandyColors.gray[500], borderColor: CandyColors.gray[600], textColor: CandyColors.gray[700], shadowColor: CandyColors.gray[600] };
      }
      return { bgColor: CandyColors.gray[300], borderColor: CandyColors.gray[400], textColor: CandyColors.gray[500], shadowColor: CandyColors.gray[400] };
    }
    if (isSelected) {
      if (phase >= 5) {
        return { bgColor: '#504580', borderColor: '#3A3060', textColor: '#D0C8E8', shadowColor: '#504580' };
      }
      if (phase >= 4) {
        return { bgColor: CandyColors.purple.dark, borderColor: CandyColors.purple.shadow, textColor: CandyColors.gray[200], shadowColor: CandyColors.purple.dark };
      }
      if (phase >= 3) {
        return { bgColor: CandyColors.pink.dark, borderColor: CandyColors.pink.shadow, textColor: CandyColors.gray[100], shadowColor: CandyColors.pink.dark };
      }
      return { bgColor: CandyColors.pink.main, borderColor: CandyColors.pink.shadow, textColor: CandyColors.white, shadowColor: CandyColors.pink.main };
    }
    if (isInteractable && highlight === 'source') {
      return { bgColor: tileColor.bg, borderColor: tileColor.border, textColor: CandyColors.white, shadowColor: tileColor.bg };
    }
    if (phase >= 5) {
      return { bgColor: '#3A3550', borderColor: '#4A4565', textColor: '#9990B0', shadowColor: '#3A3550' };
    }
    if (phase >= 4) {
      return { bgColor: CandyColors.gray[600], borderColor: CandyColors.gray[700], textColor: CandyColors.gray[300], shadowColor: CandyColors.gray[700] };
    }
    if (phase >= 3) {
      return { bgColor: CandyColors.gray[200], borderColor: CandyColors.gray[400], textColor: CandyColors.gray[500], shadowColor: CandyColors.gray[400] };
    }
    if (phase >= 2) {
      return { bgColor: CandyColors.gray[100], borderColor: CandyColors.gray[300], textColor: CandyColors.gray[600], shadowColor: CandyColors.gray[400] };
    }
    return { bgColor: CandyColors.white, borderColor: CandyColors.gray[300], textColor: CandyColors.gray[600], shadowColor: CandyColors.gray[400] };
  };

  const tileStyles = getStyles();
  const isClickable = (isInteractable || isSelected) && onPress;

  // === ANIMATED STYLES (all on UI thread via Reanimated) ===
  const glowOpacity = useDerivedValue(() => 0.3 + glowAnim.value * 0.4);

  const shineTranslateX = useDerivedValue(() => -60 + shineAnim.value * 120);

  const wobbleRotateDeg = useDerivedValue(() => `${wobbleAnim.value * 3}deg`);

  // Trail glow color (static shadow tint; animated glow is via TileGlowCanvas)
  const trailGlowColor = phase >= 4 ? '#9B1B30' : '#7B2FBE';

  const guideRingScaleVal = useDerivedValue(() => 1 + guidePulseAnim.value * 0.18);
  const guideRingOpacityVal = useDerivedValue(() => 0.6 + guidePulseAnim.value * 0.4);

  // Main tile transform (scale + bounce + wobble)
  const tileAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleAnim.value },
      { translateY: bounceAnim.value },
      { rotate: wobbleRotateDeg.value },
    ],
  }));

  // Glow outer opacity
  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: isSelected ? 0.6 : glowOpacity.value,
  }));

  // Shine sweep transform
  const shineAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shineTranslateX.value }],
  }));

  // Guide ring
  const guideRingAnimStyle = useAnimatedStyle(() => ({
    opacity: guideRingOpacityVal.value,
    transform: [{ scale: guideRingScaleVal.value }],
  }));

  const content = (
    <Animated.View
      style={[
        styles.tileOuter,
        compact && { width: COMPACT_OUTER_W, height: COMPACT_OUTER_H, marginHorizontal: 2 },
        tileAnimStyle,
      ]}
    >
      {/* Skip idle glow canvases entirely to keep the board light while not selected/resonant. */}
      {shouldRenderTileGlow(!!isSelected, isResonant) && (
        <TileGlowCanvas
          isSelected={!!isSelected}
          phase={phase}
          isResonant={isResonant}
          compact={compact}
          isActiveRow={isActiveRow}
        />
      )}

      {/* Outer glow for interactable/selected */}
      {(isInteractable || isSelected) && highlight !== 'locked' && (
        <Animated.View
          style={[
            styles.glowOuter,
            { backgroundColor: tileStyles.shadowColor },
            glowAnimStyle,
          ]}
        />
      )}

      {isGuided && (
        <Animated.View
          style={[styles.guideRing, guideRingAnimStyle]}
          pointerEvents="none"
        />
      )}

      {/* Main tile body */}
      <View
        style={[
          styles.tileBody,
          compact && { width: COMPACT_BODY_W, height: COMPACT_BODY_H, borderRadius: 12 },
          {
            backgroundColor: tileStyles.bgColor,
            borderBottomColor: tileStyles.borderColor,
            shadowColor: (isSelected && phase >= 3) ? trailGlowColor : tileStyles.shadowColor,
          },
          isGuided && styles.tileBodyGuided,
          isSelected && styles.tileBodySelected,
          highlight === 'locked' && styles.tileBodyLocked,
        ]}
      >
        {/* Top highlight (bevel effect) */}
        <View style={styles.bevelTop} />

        {/* Glossy shine overlay */}
        <View style={styles.glossyShine} />

        {/* Letter text with shadow */}
        <Text
          style={[
            styles.letterText,
            compact && { fontSize: COMPACT_FONT },
            { color: tileStyles.textColor },
            isSelected && styles.letterTextSelected,
          ]}
        >
          {letter.char}
        </Text>

        {/* Specular highlight dot */}
        {highlight !== 'locked' && (
          <View style={styles.specularDot} />
        )}

        {/* Moving shine effect */}
        {isInteractable && !isSelected && (
          <Animated.View
            style={[styles.shineSweep, shineAnimStyle]}
          />
        )}

        {/* Subtle lock overlay for locked tiles */}
        {highlight === 'locked' && (
          <View style={styles.lockOverlay} />
        )}
      </View>

      {/* 3D bottom edge */}
      <View
        style={[
          styles.tileEdge,
          { backgroundColor: tileStyles.borderColor },
          highlight === 'locked' && styles.tileEdgeLocked,
        ]}
      />
    </Animated.View>
  );

  if (isClickable) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityLabel={`Letter ${letter.char}${letter.isLocked ? ', locked' : ''}`}
        accessibilityRole="button"
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});

const styles = StyleSheet.create({
  tileOuter: {
    width: 52,
    height: 64,
    marginHorizontal: 3,
    alignItems: 'center',
  },
  glowOuter: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 6,
    borderRadius: 14,
    transform: [{ scale: 1.15 }],
  },
  guideRing: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: CandyColors.yellow.main,
    backgroundColor: 'rgba(250, 204, 21, 0.30)',
    shadowColor: CandyColors.yellow.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 8,
  },
  tileBody: {
    width: 52,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    overflow: 'hidden',
  },
  tileBodyGuided: {
    backgroundColor: 'rgba(250, 204, 21, 0.25)',
    borderWidth: 2,
    borderColor: CandyColors.yellow.main,
  },
  tileBodySelected: {
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  tileBodyLocked: {
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tileEdge: {
    position: 'absolute',
    bottom: 0,
    left: 4,
    right: 4,
    height: 8,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: -1,
  },
  tileEdgeLocked: {
    height: 6,
  },
  bevelTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  glossyShine: {
    position: 'absolute',
    top: 4,
    left: 6,
    right: 6,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 8,
  },
  letterText: {
    fontSize: 26,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
    zIndex: 10,
  },
  letterTextSelected: {
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 4,
  },
  specularDot: {
    position: 'absolute',
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 4,
  },
  shineSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    transform: [{ skewX: '-20deg' }],
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
});

export default LetterTile;
