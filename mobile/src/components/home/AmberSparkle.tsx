import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

interface Particle {
  x: number;      // horizontal offset from origin (fixed per particle)
  delay: number;  // stagger delay in ms
  radius: number; // orb radius
  color: string;  // glow color
}

// Pre-seeded particle layout so positions are stable across renders
const PARTICLES: Particle[] = [
  { x: 2,  delay: 0,    radius: 3.5, color: '#FFD84D' },
  { x: -8, delay: 150,  radius: 2.5, color: '#FFB830' },
  { x: 6,  delay: 300,  radius: 3,   color: '#FF8C4D' },
  { x: -4, delay: 450,  radius: 2,   color: '#FFD84D' },
  { x: 10, delay: 600,  radius: 3,   color: '#FFEC80' },
  { x: -2, delay: 100,  radius: 2,   color: '#FF8C4D' },
  { x: 8,  delay: 750,  radius: 2.5, color: '#FFB830' },
  { x: -6, delay: 500,  radius: 2,   color: '#FFEC80' },
];

// Canvas that fits tightly over the amber counter badge
const CANVAS_SIZE = 44;
const TRAVEL_PX = 27; // mid-point of original 22 + random * 10 range
const DURATION = 1100;

/** A single glowing ember orb driven by React Native Animated */
const Ember: React.FC<{ particle: Particle }> = ({ particle }) => {
  const rise  = useRef(new Animated.Value(0)).current;
  const alpha = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.4)).current;
  const riseLoopRef  = useRef<Animated.CompositeAnimation | null>(null);
  const alphaLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const scaleLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    delayTimerRef.current = setTimeout(() => {
      riseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(rise, {
            toValue: -TRAVEL_PX,
            duration: DURATION,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(rise, { toValue: 0, duration: 16, useNativeDriver: true }),
        ])
      );
      riseLoopRef.current.start();

      alphaLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(alpha, {
            toValue: 1,
            duration: DURATION * 0.20,
            useNativeDriver: true,
          }),
          Animated.timing(alpha, {
            toValue: 0,
            duration: DURATION * 0.80,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      alphaLoopRef.current.start();

      scaleLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1,
            duration: DURATION * 0.30,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.4,
            duration: DURATION * 0.70,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ])
      );
      scaleLoopRef.current.start();
    }, particle.delay);

    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      riseLoopRef.current?.stop();
      alphaLoopRef.current?.stop();
      scaleLoopRef.current?.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  const diameter = particle.radius * 2;
  const left = CANVAS_SIZE / 2 + particle.x - particle.radius;
  const top = CANVAS_SIZE / 2 - particle.radius;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left,
        top,
        width: diameter,
        height: diameter,
        borderRadius: particle.radius,
        backgroundColor: particle.color,
        // Glow simulation via shadow (visible on iOS; dot still shows on Android)
        shadowColor: particle.color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: particle.radius * 1.5,
        opacity: alpha,
        transform: [{ translateY: rise }, { scale }],
      }}
    />
  );
};

export const AmberSparkle: React.FC = () => {
  return (
    <Animated.View style={styles.canvas} pointerEvents="none">
      {PARTICLES.map((p, i) => (
        <Ember key={i} particle={p} />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    top: -CANVAS_SIZE / 2,
    right: -CANVAS_SIZE / 4,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    pointerEvents: 'none',
  },
});

