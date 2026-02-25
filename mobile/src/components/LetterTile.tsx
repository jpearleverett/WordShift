import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
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
}

// Compact tile dimensions for 6+ letter words
const COMPACT_OUTER_W = 42;
const COMPACT_OUTER_H = 52;
const COMPACT_BODY_W = 42;
const COMPACT_BODY_H = 46;
const COMPACT_FONT = 21;

export const LetterTile: React.FC<LetterTileProps> = ({
  letter,
  onPress,
  isSelected,
  isInteractable,
  highlight = 'default',
  phase = 0,
  compact = false,
  isResonant = false,
  isGuided = false,
}) => {
  const settings = getSettingsSync();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;
  const wobbleAnim = useRef(new Animated.Value(0)).current;
  const guidePulseAnim = useRef(new Animated.Value(0)).current;

  // Loop refs for proper cleanup (prevents memory leaks)
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const shineLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const wobbleLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const bounceLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const guideLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Phase-aware animation parameters for selected tiles
  const getSelectedSpringParams = () => {
    if (phase >= 4) return { friction: 9, tension: 80 };
    if (phase >= 3) return { friction: 7, tension: 100 };
    if (phase >= 2) return { friction: 5, tension: 150 };
    return { friction: 3, tension: 200 };
  };

  const getWobbleDurations = () => {
    if (phase >= 4) return { quarter: 400, half: 800 };
    if (phase >= 3) return { quarter: 300, half: 600 };
    if (phase >= 2) return { quarter: 200, half: 400 };
    return { quarter: 150, half: 300 };
  };

  const getBounceHeight = () => {
    if (phase >= 4) return -1.5;
    if (phase >= 3) return -2;
    if (phase >= 2) return -3;
    return -4;
  };

  // Get consistent color based on letter
  const tileColor = getTileColor(letter.char);

  // Idle animation for interactable tiles
  useEffect(() => {
    if (settings.reducedMotion) return;
    if (isInteractable && !isSelected) {
      // Subtle pulse glow — drives opacity only, native driver safe
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      glowLoopRef.current = glowLoop;
      glowLoop.start();

      // Shine sweep animation
      const shineLoop = Animated.loop(
        Animated.sequence([
          Animated.delay(2000),
          Animated.timing(shineAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(shineAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      shineLoopRef.current = shineLoop;
      shineLoop.start();
    } else {
      glowAnim.setValue(0);
      shineAnim.setValue(0);
    }

    return () => {
      if (glowLoopRef.current) {
        glowLoopRef.current.stop();
        glowLoopRef.current = null;
      }
      if (shineLoopRef.current) {
        shineLoopRef.current.stop();
        shineLoopRef.current = null;
      }
      glowAnim.stopAnimation();
      shineAnim.stopAnimation();
    };
  }, [isInteractable, isSelected, settings.reducedMotion]);

  // Selected bounce animation (phase-aware: bouncy at Phase 0, heavy/ritualistic at Phase 4)
  useEffect(() => {
    const currentSettings = getSettingsSync();
    if (currentSettings.reducedMotion) {
      scaleAnim.setValue(isSelected ? 1.08 : 1);
      bounceAnim.setValue(0);
      wobbleAnim.setValue(0);
      return;
    }
    if (isSelected) {
      const springParams = getSelectedSpringParams();
      const wobbleDurations = getWobbleDurations();
      const bounceHeight = getBounceHeight();

      // Initial pop - phase-aware spring (bouncy Phase 0 → heavy Phase 4)
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          friction: springParams.friction,
          tension: springParams.tension,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.08,
          friction: springParams.friction + 1,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous wobble - phase-aware speed (quick Phase 0 → very slow Phase 4)
      const wobbleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(wobbleAnim, {
            toValue: 1,
            duration: wobbleDurations.quarter,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: -1,
            duration: wobbleDurations.half,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: 0,
            duration: wobbleDurations.quarter,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      wobbleLoopRef.current = wobbleLoop;
      wobbleLoop.start();

      // Floating bounce - phase-aware height (light Phase 0 → weighed down Phase 4)
      const bounceLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: bounceHeight,
            duration: 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      bounceLoopRef.current = bounceLoop;
      bounceLoop.start();

      // Trail glow at Phase 3+ is now handled by TileGlowCanvas (Skia)
    } else {
      scaleAnim.setValue(1);
      bounceAnim.setValue(0);
      wobbleAnim.setValue(0);
    }

    return () => {
      if (wobbleLoopRef.current) {
        wobbleLoopRef.current.stop();
        wobbleLoopRef.current = null;
      }
      if (bounceLoopRef.current) {
        bounceLoopRef.current.stop();
        bounceLoopRef.current = null;
      }
      scaleAnim.stopAnimation();
      bounceAnim.stopAnimation();
      wobbleAnim.stopAnimation();
    };
  }, [isSelected, phase]);

  // Resonance glow is now handled by TileGlowCanvas (Skia)

  // Tutorial guidance pulse for the exact recommended tile.
  useEffect(() => {
    if (!isGuided) {
      guidePulseAnim.setValue(0);
      return;
    }

    if (settings.reducedMotion) {
      guidePulseAnim.setValue(1);
      return;
    }

    const guideLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(guidePulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(guidePulseAnim, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    guideLoopRef.current = guideLoop;
    guideLoop.start();

    return () => {
      if (guideLoopRef.current) {
        guideLoopRef.current.stop();
        guideLoopRef.current = null;
      }
      guidePulseAnim.stopAnimation();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- guidePulseAnim is a stable ref
  }, [isGuided, settings.reducedMotion]);

  // Trail particles are now handled by TileGlowCanvas (Skia sparks)

  const handlePressIn = () => {
    if (settings.reducedMotion) return;
    if (isInteractable || isSelected) {
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        friction: 5,
        tension: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (settings.reducedMotion) return;
    if (isInteractable || isSelected) {
      Animated.spring(scaleAnim, {
        toValue: isSelected ? 1.08 : 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const getStyles = () => {
    if (highlight === 'locked') {
      if (phase >= 5) {
        return {
          bgColor: '#2E2A40',        // Muted purple-gray — eerie calm
          borderColor: '#3A3555',
          textColor: '#706890',       // Soft ghostly purple
          shadowColor: '#2E2A40',
        };
      }
      if (phase >= 4) {
        return {
          bgColor: CandyColors.gray[700],
          borderColor: CandyColors.gray[800],
          textColor: CandyColors.gray[500],
          shadowColor: CandyColors.gray[800],
        };
      }
      if (phase >= 3) {
        return {
          bgColor: CandyColors.gray[500],
          borderColor: CandyColors.gray[600],
          textColor: CandyColors.gray[700],
          shadowColor: CandyColors.gray[600],
        };
      }
      return {
        bgColor: CandyColors.gray[300],
        borderColor: CandyColors.gray[400],
        textColor: CandyColors.gray[500],
        shadowColor: CandyColors.gray[400],
      };
    }
    if (isSelected) {
      if (phase >= 5) {
        // Muted purple — peaceful, not aggressive
        return {
          bgColor: '#504580',
          borderColor: '#3A3060',
          textColor: '#D0C8E8',       // Soft lavender text
          shadowColor: '#504580',
        };
      }
      if (phase >= 4) {
        // Deep purple instead of pink at phase 4
        return {
          bgColor: CandyColors.purple.dark,
          borderColor: CandyColors.purple.shadow,
          textColor: CandyColors.gray[200],
          shadowColor: CandyColors.purple.dark,
        };
      }
      if (phase >= 3) {
        // Darker pink/purple at phase 3
        return {
          bgColor: CandyColors.pink.dark,
          borderColor: CandyColors.pink.shadow,
          textColor: CandyColors.gray[100],
          shadowColor: CandyColors.pink.dark,
        };
      }
      return {
        bgColor: CandyColors.pink.main,
        borderColor: CandyColors.pink.shadow,
        textColor: CandyColors.white,
        shadowColor: CandyColors.pink.main,
      };
    }
    if (isInteractable && highlight === 'source') {
      return {
        bgColor: tileColor.bg,
        borderColor: tileColor.border,
        textColor: CandyColors.white,
        shadowColor: tileColor.bg,
      };
    }
    // Default (non-interactable, non-selected)
    if (phase >= 5) {
      return {
        bgColor: '#3A3550',      // Muted purple-gray instead of dark gray
        borderColor: '#4A4565',
        textColor: '#9990B0',     // Soft purple text
        shadowColor: '#3A3550',
      };
    }
    if (phase >= 4) {
      return {
        bgColor: CandyColors.gray[600],
        borderColor: CandyColors.gray[700],
        textColor: CandyColors.gray[300],
        shadowColor: CandyColors.gray[700],
      };
    }
    if (phase >= 3) {
      return {
        bgColor: CandyColors.gray[200],
        borderColor: CandyColors.gray[400],
        textColor: CandyColors.gray[500],
        shadowColor: CandyColors.gray[400],
      };
    }
    if (phase >= 2) {
      return {
        bgColor: CandyColors.gray[100],
        borderColor: CandyColors.gray[300],
        textColor: CandyColors.gray[600],
        shadowColor: CandyColors.gray[400],
      };
    }
    return {
      bgColor: CandyColors.white,
      borderColor: CandyColors.gray[300],
      textColor: CandyColors.gray[600],
      shadowColor: CandyColors.gray[400],
    };
  };

  const tileStyles = getStyles();
  const isClickable = (isInteractable || isSelected) && onPress;

  // Animated glow intensity
  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  // Shine sweep position
  const shineTranslate = shineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-60, 60],
  });

  // Wobble rotation
  const wobbleRotate = wobbleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-3deg', '0deg', '3deg'],
  });

  // Trail glow color (still used for static shadow tint; animated glow is via TileGlowCanvas)
  const trailGlowColor = phase >= 4 ? '#9B1B30' : '#7B2FBE';
  const guideRingScale = guidePulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.18],
  });
  const guideRingOpacity = guidePulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.0],
  });

  const content = (
    <Animated.View
      style={[
        styles.tileOuter,
        compact && { width: COMPACT_OUTER_W, height: COMPACT_OUTER_H, marginHorizontal: 2 },
        {
          transform: [
            { scale: scaleAnim },
            { translateY: bounceAnim },
            { rotate: isSelected ? wobbleRotate : '0deg' },
          ],
        },
      ]}
    >
      {/* Skia glow canvas — trail glow, sparks, and resonance bloom */}
      <TileGlowCanvas
        isSelected={!!isSelected}
        phase={phase}
        isResonant={isResonant}
        compact={compact}
      />

      {/* Outer glow for interactable/selected */}
      {(isInteractable || isSelected) && highlight !== 'locked' && (
        <Animated.View
          style={[
            styles.glowOuter,
            {
              backgroundColor: tileStyles.shadowColor,
              opacity: isSelected ? 0.6 : glowOpacity,
            },
          ]}
        />
      )}

      {isGuided && (
        <Animated.View
          style={[
            styles.guideRing,
            {
              opacity: guideRingOpacity,
              transform: [{ scale: guideRingScale }],
            },
          ]}
          pointerEvents="none"
        />
      )}

      {/* Main tile body */}
      <Animated.View
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

        {/* Resonance glow is now rendered via TileGlowCanvas (Skia blur) */}

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
            style={[
              styles.shineSweep,
              {
                transform: [{ translateX: shineTranslate }],
              },
            ]}
          />
        )}

        {/* Subtle lock overlay for locked tiles */}
        {highlight === 'locked' && (
          <View style={styles.lockOverlay} />
        )}
      </Animated.View>

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
};

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
