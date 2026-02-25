import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Circle, BlurMask } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

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

/** A single glowing ember orb driven by Reanimated shared values */
const Ember: React.FC<{ particle: Particle }> = ({ particle }) => {
  const rise   = useSharedValue(0);   // vertical movement  (0 → -TRAVEL_PX)
  const alpha  = useSharedValue(0);   // opacity            (0 → 1 → 0)
  const scale  = useSharedValue(0.4); // size multiplier    (0.4 → 1)

  const TRAVEL_PX = 22 + Math.random() * 10;
  const DURATION  = 1100;

  useEffect(() => {
    const easeCurve = Easing.out(Easing.cubic);

    rise.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(-TRAVEL_PX, { duration: DURATION, easing: easeCurve }),
          withTiming(0, { duration: 0 })
        ),
        -1
      )
    );

    alpha.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(1,   { duration: DURATION * 0.20 }),
          withTiming(0,   { duration: DURATION * 0.80, easing: Easing.out(Easing.quad) }),
          withTiming(0,   { duration: 0 })
        ),
        -1
      )
    );

    scale.value = withDelay(
      particle.delay,
      withRepeat(
        withSequence(
          withTiming(1,   { duration: DURATION * 0.30, easing: Easing.out(Easing.back(1.2)) }),
          withTiming(0.4, { duration: DURATION * 0.70, easing: Easing.in(Easing.quad) }),
          withTiming(0.4, { duration: 0 })
        ),
        -1
      )
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  const cx = useDerivedValue(() => particle.x + CANVAS_SIZE / 2);
  const cy = useDerivedValue(() => CANVAS_SIZE / 2 + rise.value);
  const r  = useDerivedValue(() => particle.radius * scale.value);
  const op = useDerivedValue(() => alpha.value);

  return (
    <Circle cx={cx} cy={cy} r={r} color={particle.color} opacity={op}>
      <BlurMask blur={particle.radius * 1.5} style="solid" />
    </Circle>
  );
};

// Canvas that fits tightly over the amber counter badge
const CANVAS_SIZE = 44;

export const AmberSparkle: React.FC = () => {
  return (
    <Canvas style={styles.canvas} pointerEvents="none">
      {PARTICLES.map((p, i) => (
        <Ember key={i} particle={p} />
      ))}
    </Canvas>
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
