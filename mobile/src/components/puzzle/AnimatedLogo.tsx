import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { CandyColors } from '../../theme/colors';

export const AnimatedLogo: React.FC = React.memo(() => {
  const bounceY = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // Subtle vertical bounce loop
    bounceY.value = withRepeat(
      withSequence(
        withTiming(-3, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    // Very subtle rotation loop
    rotation.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(-1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(bounceY);
      cancelAnimation(rotation);
    };
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: bounceY.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[styles.logoContainer, animatedStyle]}
      accessibilityLabel="WordShift"
      accessibilityRole="header"
    >
      <View style={styles.logoInner}>
        <Text style={styles.logoWord}>WORD</Text>
        <Text style={styles.logoShift}>SHIFT</Text>
      </View>
      {/* Sparkle decorations */}
      <View style={[styles.logoSparkle, styles.logoSparkle1]} />
      <View style={[styles.logoSparkle, styles.logoSparkle2]} />
      <View style={[styles.logoSparkle, styles.logoSparkle3]} />
    </Animated.View>
  );
});

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
    color: CandyColors.white,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  logoShift: {
    fontSize: 32,
    fontWeight: '900',
    color: CandyColors.yellow.main,
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
