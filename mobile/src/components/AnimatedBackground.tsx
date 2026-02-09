import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { getPhaseTheme } from '../theme/colors';
import { getSettingsSync } from '../services/settings';
import { getMaxParticleCount } from '../services/deviceTier';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FloatingParticle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  type: 'circle' | 'star' | 'diamond';
}

// Generate random particles for the background using phase-specific colors
const generateParticles = (count: number, colors: string[]): FloatingParticle[] => {
  const particles: FloatingParticle[] = [];
  const types: Array<'circle' | 'star' | 'diamond'> = ['circle', 'star', 'diamond'];

  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      size: 8 + Math.random() * 20,
      duration: 8000 + Math.random() * 12000,
      delay: Math.random() * 5000,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: types[Math.floor(Math.random() * types.length)],
    });
  }
  return particles;
};

const Particle: React.FC<{ particle: FloatingParticle }> = ({ particle }) => {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT + 50)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const mountedRef = useRef(true);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const animate = () => {
      // Reset values
      translateY.setValue(SCREEN_HEIGHT + 50);
      opacity.setValue(0);
      rotate.setValue(0);
      scale.setValue(0.5);

      animRef.current = Animated.sequence([
        Animated.delay(particle.delay),
        Animated.parallel([
          // Float upward
          Animated.timing(translateY, {
            toValue: -100,
            duration: particle.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // Fade in then out
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 1,
              duration: particle.duration * 0.2,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0.6,
              duration: particle.duration * 0.6,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: particle.duration * 0.2,
              useNativeDriver: true,
            }),
          ]),
          // Rotate
          Animated.timing(rotate, {
            toValue: 1,
            duration: particle.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          // Scale pulse
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1,
              duration: particle.duration * 0.3,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.8,
              duration: particle.duration * 0.7,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]);
      animRef.current.start(() => {
        if (mountedRef.current) animate();
      });
    };

    animate();

    return () => {
      mountedRef.current = false;
      animRef.current?.stop();
    };
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getShape = () => {
    switch (particle.type) {
      case 'star':
        return (
          <View style={styles.starContainer}>
            <View
              style={[
                styles.starH,
                {
                  width: particle.size,
                  height: particle.size * 0.35,
                  backgroundColor: particle.color,
                },
              ]}
            />
            <View
              style={[
                styles.starV,
                {
                  width: particle.size * 0.35,
                  height: particle.size,
                  backgroundColor: particle.color,
                },
              ]}
            />
          </View>
        );
      case 'diamond':
        return (
          <View
            style={[
              styles.diamond,
              {
                width: particle.size * 0.7,
                height: particle.size * 0.7,
                backgroundColor: particle.color,
              },
            ]}
          />
        );
      default:
        return (
          <View
            style={[
              styles.circle,
              {
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color,
                borderRadius: particle.size / 2,
              },
            ]}
          />
        );
    }
  };

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.x,
          transform: [
            { translateY },
            { rotate: spin },
            { scale },
          ],
          opacity,
        },
      ]}
    >
      {getShape()}
    </Animated.View>
  );
};

interface AnimatedBackgroundProps {
  phase?: number;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ phase = 0 }) => {
  const reducedMotion = getSettingsSync().reducedMotion;
  const theme = useMemo(() => getPhaseTheme(phase), [phase]);
  const particleCount = getMaxParticleCount();
  const particles = useRef(
    reducedMotion ? [] : generateParticles(particleCount, theme.particleColors)
  ).current;
  // Use opacity-based pulse with native driver instead of JS-bridge backgroundColor
  const pulseOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reducedMotion) return;
    // Subtle pulse: animate opacity of a secondary color overlay (native driver)
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
      pulseOpacity.stopAnimation();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.bgPrimary }]}>
      {/* Pulsing secondary color overlay — uses native driver via opacity */}
      <Animated.View
        style={[
          styles.pulseOverlay,
          { backgroundColor: theme.bgSecondary, opacity: pulseOpacity },
        ]}
        pointerEvents="none"
      />

      {/* Gradient overlay layers */}
      <View style={[styles.gradientLayer1, { backgroundColor: theme.overlayTop }]} />
      <View style={[styles.gradientLayer2, { backgroundColor: theme.overlayMid }]} />
      <View style={[styles.gradientLayer3, { backgroundColor: theme.overlayBottom }]} />

      {/* Radial glow in center */}
      <View style={[styles.centerGlow, { backgroundColor: theme.centerGlow }]} />

      {/* Floating particles */}
      {particles.map((particle) => (
        <Particle key={particle.id} particle={particle} />
      ))}

      {/* Top vignette */}
      <View style={[styles.vignetteTop, { shadowColor: theme.vignetteColor }]} />
      {/* Bottom vignette */}
      <View style={[styles.vignetteBottom, { backgroundColor: theme.vignetteColor + '4D' }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  pulseOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  gradientLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.35,
  },
  gradientLayer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  gradientLayer3: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.5,
  },
  centerGlow: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.3,
    left: SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: SCREEN_WIDTH * 0.3,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 60,
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'transparent',
    // Top shadow effect
    shadowOffset: { width: 0, height: 40 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  particle: {
    position: 'absolute',
  },
  circle: {
    // Styles applied dynamically
  },
  starContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  starH: {
    position: 'absolute',
    borderRadius: 2,
  },
  starV: {
    position: 'absolute',
    borderRadius: 2,
  },
  diamond: {
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
});

export default AnimatedBackground;
