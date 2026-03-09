import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { CandyColors } from '../../theme/colors';

export const AnimatedLogo: React.FC = () => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Subtle bounce
    Animated.loop(
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
    ).start();

    // Very subtle rotation
    Animated.loop(
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
    ).start();
  }, []);

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
        <Text style={styles.logoWord}>WORD</Text>
        <Text style={styles.logoShift}>SHIFT</Text>
      </View>
      {/* Sparkle decorations */}
      <View style={[styles.logoSparkle, styles.logoSparkle1]} />
      <View style={[styles.logoSparkle, styles.logoSparkle2]} />
      <View style={[styles.logoSparkle, styles.logoSparkle3]} />
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
