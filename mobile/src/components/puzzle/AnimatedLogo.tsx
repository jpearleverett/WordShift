import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { CandyColors, getPhaseTheme, getPhaseSurfaceTheme } from '../../theme/colors';
import { getSettingsSync } from '../../services/settings';

interface AnimatedLogoProps {
  phase?: number;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ phase = 0 }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const bounceLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const rotateLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const reducedMotion = getSettingsSync().reducedMotion;
  const phaseTheme = getPhaseTheme(phase);
  const surfaceTheme = getPhaseSurfaceTheme(phase);

  useEffect(() => {
    if (bounceLoopRef.current) {
      bounceLoopRef.current.stop();
      bounceLoopRef.current = null;
    }
    if (rotateLoopRef.current) {
      rotateLoopRef.current.stop();
      rotateLoopRef.current = null;
    }

    if (reducedMotion) {
      bounceAnim.setValue(0);
      rotateAnim.setValue(0);
      return;
    }

    // Subtle bounce
    const bounceLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -3,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    bounceLoopRef.current = bounceLoop;
    bounceLoop.start();

    // Very subtle rotation
    const rotateLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    rotateLoopRef.current = rotateLoop;
    rotateLoop.start();

    return () => {
      if (bounceLoopRef.current) {
        bounceLoopRef.current.stop();
        bounceLoopRef.current = null;
      }
      if (rotateLoopRef.current) {
        rotateLoopRef.current.stop();
        rotateLoopRef.current = null;
      }
      bounceAnim.stopAnimation();
      rotateAnim.stopAnimation();
    };
  }, [reducedMotion, bounceAnim, rotateAnim]);

  const wordColor = phase >= 3 ? surfaceTheme.textSecondary : CandyColors.white;
  const shiftColor = phase >= 4
    ? '#C15D7A'
    : phase >= 3
      ? '#CDA676'
      : CandyColors.yellow.main;

  const rotate = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-1deg', '1deg'],
  });

  return (
    <Animated.View
      style={[
        styles.logoContainer,
        {
          transform: [
            { translateY: bounceAnim },
            { rotate },
          ],
        },
      ]}
      accessibilityLabel="WordShift"
      accessibilityRole="header"
    >
      <View style={styles.logoInner}>
        <Text style={[styles.logoWord, { color: wordColor }]}>WORD</Text>
        <Text style={[styles.logoShift, { color: shiftColor }]}>SHIFT</Text>
      </View>
      {/* Sparkle decorations */}
      <View style={[styles.logoSparkle, styles.logoSparkle1, { backgroundColor: phaseTheme.particleColors[0] || CandyColors.white }]} />
      <View style={[styles.logoSparkle, styles.logoSparkle2, { backgroundColor: phaseTheme.particleColors[1] || CandyColors.white }]} />
      <View style={[styles.logoSparkle, styles.logoSparkle3, { backgroundColor: phaseTheme.particleColors[2] || CandyColors.white }]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    position: 'relative',
  },
  logoInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoWord: {
    fontSize: 32,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  logoShift: {
    fontSize: 32,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  logoSparkle: {
    position: 'absolute',
    width: 8,
    height: 8,
    backgroundColor: CandyColors.white,
    borderRadius: 4,
  },
  logoSparkle1: {
    top: -5,
    left: 20,
  },
  logoSparkle2: {
    top: 5,
    right: -10,
  },
  logoSparkle3: {
    bottom: -3,
    left: 60,
  },
});
