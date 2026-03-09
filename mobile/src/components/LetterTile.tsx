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
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Letter } from '../types';
import { getTileColor, CandyColors } from '../theme/colors';
import { getSettingsSync } from '../services/settings';
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
  return isSelected;
}

function areLetterTilePropsEqual(prev: LetterTileProps, next: LetterTileProps): boolean {
  return (
    prev.letter.id === next.letter.id &&
    prev.letter.char === next.letter.char &&
    prev.letter.isLocked === next.letter.isLocked &&
    prev.isSelected === next.isSelected &&
    prev.isInteractable === next.isInteractable &&
    prev.highlight === next.highlight &&
    prev.phase === next.phase &&
    prev.compact === next.compact &&
    prev.isResonant === next.isResonant &&
    prev.isGuided === next.isGuided &&
    prev.isActiveRow === next.isActiveRow
  );
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

function getBounceHeight(phase: number) {
  if (phase >= 4) return -1.5;
  if (phase >= 3) return -2;
  if (phase >= 2) return -2.5;
  return -3;
}

function getResonanceOverlay(phase: number): { color: string; opacity: number } | null {
  if (phase >= 5) return { color: '#7B6B8A', opacity: 0.08 };
  if (phase >= 4) return { color: '#8B0000', opacity: 0.12 };
  if (phase >= 3) return { color: '#4A2080', opacity: 0.10 };
  if (phase >= 2) return { color: '#6B5B95', opacity: 0.07 };
  if (phase >= 1) return { color: '#DAA520', opacity: 0.05 };
  return null;
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
  const bounceAnim = useSharedValue(0);
  const guidePulseAnim = useSharedValue(0);

  // Get consistent color based on letter
  const tileColor = getTileColor(letter.char);

  // === SELECTED ANIMATION — one-shot pop/lift only, no continuous loops ===
  useEffect(() => {
    if (reducedMotion) {
      scaleAnim.value = isSelected ? 1.08 : 1;
      bounceAnim.value = isSelected ? getBounceHeight(phase) : 0;
      return;
    }
    if (isSelected) {
      const spring = getSelectedSpringParams(phase);
      const bounceH = getBounceHeight(phase);

      scaleAnim.value = withSequence(
        withSpring(1.15, { damping: spring.damping, stiffness: spring.stiffness }),
        withSpring(1.08, { damping: spring.damping + 2, stiffness: spring.stiffness }),
      );
      bounceAnim.value = withSpring(bounceH, { damping: 14, stiffness: 180 });
    } else {
      scaleAnim.value = withTiming(1, { duration: 150 });
      bounceAnim.value = withTiming(0, { duration: 150 });
    }

    return () => {
      cancelAnimation(scaleAnim);
      cancelAnimation(bounceAnim);
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

  // Trail glow color (static shadow tint; animated glow is via TileGlowCanvas)
  const trailGlowColor = phase >= 4 ? '#9B1B30' : '#7B2FBE';
  const resonanceOverlay = isResonant && !isSelected ? getResonanceOverlay(phase) : null;
  const glowOuterOpacity = isSelected ? 0.58 : isActiveRow && isInteractable ? 0.20 : 0.12;

  const guideRingScaleVal = useDerivedValue(() => 1 + guidePulseAnim.value * 0.18);
  const guideRingOpacityVal = useDerivedValue(() => 0.6 + guidePulseAnim.value * 0.4);

  // Main tile transform (scale + bounce + wobble)
  const tileAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scaleAnim.value },
      { translateY: bounceAnim.value },
    ],
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
            { opacity: glowOuterOpacity },
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

        {resonanceOverlay && (
          <View
            style={[
              styles.resonanceOverlay,
              { backgroundColor: resonanceOverlay.color, opacity: resonanceOverlay.opacity },
            ]}
          />
        )}

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
}, areLetterTilePropsEqual);

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
  resonanceOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
});

export default LetterTile;
