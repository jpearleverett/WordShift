import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native';
import { Letter } from '../types';
import { getTileColor, CandyColors, getPhaseTheme } from '../theme/colors';
import { getSettingsSync } from '../services/settings';

interface LetterTileProps {
  letter: Letter;
  onPress?: () => void;
  isSelected?: boolean;
  isInteractable?: boolean;
  highlight?: 'default' | 'source' | 'locked';
  phase?: number;
  tileWidth?: number;
}

// Default tile width - used as basis for proportional scaling
export const DEFAULT_TILE_WIDTH = 52;

export const LetterTile: React.FC<LetterTileProps> = ({
  letter,
  onPress,
  isSelected,
  isInteractable,
  highlight = 'default',
  phase = 0,
  tileWidth,
}) => {
  // Scale factor for dynamic sizing
  const tw = tileWidth ?? DEFAULT_TILE_WIDTH;
  const scale = tw / DEFAULT_TILE_WIDTH;
  const settings = getSettingsSync();

  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const shineAnim = useRef(new Animated.Value(0)).current;
  const wobbleAnim = useRef(new Animated.Value(0)).current;

  // Loop refs for proper cleanup (prevents memory leaks)
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const shineLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const wobbleLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const bounceLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Get consistent color based on letter
  const tileColor = getTileColor(letter.char);

  // Idle animation for interactable tiles
  useEffect(() => {
    if (settings.reducedMotion) return;
    if (isInteractable && !isSelected) {
      // Subtle pulse glow
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1200,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: false,
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
  }, [isInteractable, isSelected]);

  // Selected bounce animation
  useEffect(() => {
    const currentSettings = getSettingsSync();
    if (currentSettings.reducedMotion) {
      scaleAnim.setValue(isSelected ? 1.08 : 1);
      bounceAnim.setValue(0);
      wobbleAnim.setValue(0);
      return;
    }
    if (isSelected) {
      // Initial pop
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          friction: 3,
          tension: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.08,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous wobble
      const wobbleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(wobbleAnim, {
            toValue: 1,
            duration: 150,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: -1,
            duration: 300,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(wobbleAnim, {
            toValue: 0,
            duration: 150,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      wobbleLoopRef.current = wobbleLoop;
      wobbleLoop.start();

      // Floating bounce
      const bounceLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: -4,
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
  }, [isSelected]);

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

  // Dynamic dimensions based on scale
  const outerWidth = tw;
  const outerHeight = Math.round(64 * scale);
  const bodyWidth = tw;
  const bodyHeight = Math.round(56 * scale);
  const fontSize = Math.round(26 * scale);
  const borderRadius = Math.round(14 * scale);
  const marginH = Math.round(3 * scale);

  const content = (
    <Animated.View
      style={[
        styles.tileOuter,
        {
          width: outerWidth,
          height: outerHeight,
          marginHorizontal: marginH,
          transform: [
            { scale: scaleAnim },
            { translateY: bounceAnim },
            { rotate: isSelected ? wobbleRotate : '0deg' },
          ],
        },
      ]}
    >
      {/* Outer glow for interactable/selected */}
      {(isInteractable || isSelected) && highlight !== 'locked' && (
        <Animated.View
          style={[
            styles.glowOuter,
            {
              borderRadius: borderRadius + 2,
              backgroundColor: tileStyles.shadowColor,
              opacity: isSelected ? 0.6 : glowOpacity,
            },
          ]}
        />
      )}

      {/* Main tile body */}
      <View
        style={[
          styles.tileBody,
          {
            width: bodyWidth,
            height: bodyHeight,
            borderRadius,
            backgroundColor: tileStyles.bgColor,
            borderBottomColor: tileStyles.borderColor,
            shadowColor: tileStyles.shadowColor,
          },
          isSelected && styles.tileBodySelected,
          highlight === 'locked' && styles.tileBodyLocked,
        ]}
      >
        {/* Top highlight (bevel effect) */}
        <View style={[styles.bevelTop, { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]} />

        {/* Glossy shine overlay */}
        <View style={styles.glossyShine} />

        {/* Letter text with shadow */}
        <Text
          style={[
            styles.letterText,
            { color: tileStyles.textColor, fontSize },
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
      </View>

      {/* 3D bottom edge */}
      <View
        style={[
          styles.tileEdge,
          {
            backgroundColor: tileStyles.borderColor,
            left: Math.round(4 * scale),
            right: Math.round(4 * scale),
            height: Math.round(8 * scale),
            borderBottomLeftRadius: Math.round(12 * scale),
            borderBottomRightRadius: Math.round(12 * scale),
          },
          highlight === 'locked' && { height: Math.round(6 * scale) },
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
    alignItems: 'center',
  },
  glowOuter: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 6,
    transform: [{ scale: 1.15 }],
  },
  tileBody: {
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 0,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
    overflow: 'hidden',
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
    zIndex: -1,
  },
  bevelTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
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
    width: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
});

export default LetterTile;
