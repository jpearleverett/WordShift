import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import { CandyColors } from '../../theme/colors';

export const AnimatedLogo: React.FC = () => {
  const bounceY = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const bounceAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const rotationAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Subtle vertical bounce loop
    bounceAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceY, {
          toValue: -3,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(bounceY, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    bounceAnimRef.current.start();

    // Very subtle rotation loop
    rotationAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(rotation, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: -1,
          duration: 3000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    rotationAnimRef.current.start();

    return () => {
      bounceAnimRef.current?.stop();
      rotationAnimRef.current?.stop();
    };
  }, []);

  const rotateInterpolation = rotation.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-1deg', '1deg'],
  });

  return (
    <Animated.View
      style={[
        styles.logoContainer,
        {
          transform: [
            { translateY: bounceY },
            { rotate: rotateInterpolation },
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
