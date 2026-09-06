import React, { useEffect, useRef, useState } from 'react';
import { View, Animated } from 'react-native';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';

interface AmberSparkleProps {
  /** Home phase — the sparkle warm hue stays, but the festivity fades with the descent. */
  phase?: number;
}

// The amber HUE stays warm at every phase (the single warm accent), but the
// FESTIVITY fades: fewer, slower motes as the world darkens, ember at the
// reveal, serene mauve after.
function getSparkleColor(phase: number): string {
  if (phase >= 5) return '#B48CC0'; // serene mauve
  if (phase >= 4) return '#C8783C'; // ember
  if (phase >= 3) return '#D9A050';
  if (phase >= 2) return '#EEC25A';
  return '#FFD84D'; // bright candy gold
}

/**
 * The tiny rising sparkles beside the amber pill. Previously leaked five
 * never-stopped recursive animation chains per mount (no cleanup), ignored
 * reducedMotion + device tier, and drew a bright white emoji at every phase.
 * Now: guarded (static under reducedMotion / low tier), phase-aged (warm hue
 * kept, count + cadence fall with the descent), and drawn as small tinted
 * View motes instead of an OS emoji.
 */
export const AmberSparkle: React.FC<AmberSparkleProps> = ({ phase = 0 }) => {
  const count = phase >= 4 ? 2 : phase >= 2 ? 3 : 5;
  const color = getSparkleColor(phase);
  const mountedRef = useRef(true);
  const animsRef = useRef<Animated.CompositeAnimation[]>([]);

  const [sparkles] = useState(() => ([...Array(5)].map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))));

  useEffect(() => {
    mountedRef.current = true;
    const settings = getSettingsSync();
    // Decorative-only: static under reducedMotion / low-tier devices. Show a
    // single faint resting mote so the pill is not visually empty.
    if (settings.reducedMotion || shouldSimplifyAnimations()) {
      sparkles.forEach((s, i) => {
        s.opacity.setValue(i === 0 ? 0.5 : 0);
        s.scale.setValue(1);
        s.x.setValue(0);
        s.y.setValue(-6);
      });
      return () => { mountedRef.current = false; };
    }

    // A slower cadence as the world darkens (the festivity, not the hue, fades).
    const durMul = phase >= 4 ? 1.8 : phase >= 2 ? 1.35 : 1;
    const active = sparkles.slice(0, count);
    active.forEach((sparkle, i) => {
      const animate = () => {
        if (!mountedRef.current) return;
        sparkle.x.setValue(Math.random() * 30 - 15);
        sparkle.y.setValue(0);
        sparkle.opacity.setValue(0);
        sparkle.scale.setValue(0.5);

        const anim = Animated.parallel([
          Animated.timing(sparkle.y, {
            toValue: -20 - Math.random() * 10,
            duration: 1000 * durMul,
            useNativeDriver: true,
            delay: i * 200,
          }),
          Animated.sequence([
            Animated.timing(sparkle.opacity, {
              toValue: phase >= 4 ? 0.7 : 1,
              duration: 200 * durMul,
              useNativeDriver: true,
              delay: i * 200,
            }),
            Animated.timing(sparkle.opacity, {
              toValue: 0,
              duration: 800 * durMul,
              useNativeDriver: true,
            }),
          ]),
          Animated.spring(sparkle.scale, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
            delay: i * 200,
          }),
        ]);
        animsRef.current[i] = anim;
        anim.start(({ finished }) => { if (finished && mountedRef.current) animate(); });
      };
      animate();
    });

    return () => {
      mountedRef.current = false;
      animsRef.current.forEach(a => a?.stop());
      animsRef.current = [];
    };
  }, [phase, count, sparkles]);

  return (
    <View style={{ position: 'absolute', top: -5, right: 0 }} pointerEvents="none">
      {sparkles.slice(0, count).map((sparkle, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: 5,
            height: 5,
            borderRadius: 2.5,
            backgroundColor: color,
            transform: [
              { translateX: sparkle.x },
              { translateY: sparkle.y },
              { scale: sparkle.scale },
            ],
            opacity: sparkle.opacity,
          }}
        />
      ))}
    </View>
  );
};
