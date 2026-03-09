import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import {
  Canvas,
  Rect,
  Circle,
  RoundedRect,
  BlurMask,
  LinearGradient,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { getPhaseTheme } from '../theme/colors';
import { getSettingsSync } from '../services/settings';
import { getMaxParticleCount, shouldSimplifyAnimations } from '../services/deviceTier';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Particle seed data ────────────────────────────────────────────────

interface ParticleSeed {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  type: 'circle' | 'diamond';
  opacity: number;
}

const generateParticles = (count: number, colors: string[]): ParticleSeed[] => {
  const types: Array<'circle' | 'diamond'> = ['circle', 'diamond'];
  const particles: ParticleSeed[] = [];
  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: Math.random() * SCREEN_WIDTH,
      y: 80 + Math.random() * (SCREEN_HEIGHT - 220),
      size: 8 + Math.random() * 14,
      color: colors[Math.floor(Math.random() * colors.length)],
      type: types[Math.floor(Math.random() * types.length)],
      opacity: 0.16 + Math.random() * 0.12,
    });
  }
  return particles;
};

// ─── AnimatedBackground ────────────────────────────────────────────────

interface AnimatedBackgroundProps {
  phase?: number;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = React.memo(({ phase = 0 }) => {
  const reducedMotion = getSettingsSync().reducedMotion;
  const theme = useMemo(() => getPhaseTheme(phase), [phase]);
  const useBlur = !shouldSimplifyAnimations();

  // Pulse animation (secondary color overlay, 4s in + 4s out)
  const pulseProgress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    pulseProgress.value = withRepeat(
      withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true, // reverse (ping-pong)
    );
    return () => cancelAnimation(pulseProgress);
  }, [reducedMotion]);

  const pulseOpacity = useDerivedValue(() =>
    reducedMotion ? 0.5 : pulseProgress.value
  );

  const ambientAccentOpacity = useDerivedValue(() =>
    reducedMotion ? 0.22 : 0.14 + pulseProgress.value * 0.12
  );

  const particles = useMemo(() => {
    if (reducedMotion) return [];
    return generateParticles(Math.min(getMaxParticleCount(), 5), theme.particleColors);
  }, [reducedMotion, theme.particleColors]);

  // Center glow position
  const glowCx = SCREEN_WIDTH * 0.5;
  const glowCy = SCREEN_HEIGHT * 0.3 + SCREEN_WIDTH * 0.3;
  const glowR = SCREEN_WIDTH * 0.3;

  return (
    <Canvas style={styles.container}>
      {/* Solid base background */}
      <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} color={theme.bgPrimary} />

      {/* Pulsing secondary color overlay */}
      <Rect
        x={0}
        y={0}
        width={SCREEN_WIDTH}
        height={SCREEN_HEIGHT}
        color={theme.bgSecondary}
        opacity={pulseOpacity}
      />

      {/* Smooth top gradient overlay (replaces hard-edged View layers) */}
      <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT * 0.5}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, SCREEN_HEIGHT * 0.5)}
          colors={[theme.overlayTop, 'transparent']}
        />
      </Rect>

      {/* Smooth bottom gradient overlay */}
      <Rect x={0} y={SCREEN_HEIGHT * 0.5} width={SCREEN_WIDTH} height={SCREEN_HEIGHT * 0.5}>
        <LinearGradient
          start={vec(0, SCREEN_HEIGHT * 0.5)}
          end={vec(0, SCREEN_HEIGHT)}
          colors={['transparent', theme.overlayBottom]}
        />
      </Rect>

      {/* Center radial glow (replaces View + shadowRadius hack) */}
      <Circle cx={glowCx} cy={glowCy} r={glowR}>
        <RadialGradient
          c={vec(glowCx, glowCy)}
          r={glowR}
          colors={[theme.centerGlow, 'transparent']}
        />
      </Circle>

      {/* Static ambient accents — deliberately non-animated to keep taps and drags snappy. */}
      {particles.map(particle => (
        particle.type === 'circle' ? (
          <Circle
            key={particle.id}
            cx={particle.x}
            cy={particle.y}
            r={particle.size / 2}
            color={particle.color}
            opacity={ambientAccentOpacity}
          >
            {useBlur && <BlurMask blur={4} style="solid" />}
          </Circle>
        ) : (
          <RoundedRect
            key={particle.id}
            x={particle.x - particle.size * 0.35}
            y={particle.y - particle.size * 0.35}
            width={particle.size * 0.7}
            height={particle.size * 0.7}
            r={2}
            color={particle.color}
            opacity={particle.opacity}
            transform={[{ rotate: Math.PI / 4 }]}
          >
            {useBlur && <BlurMask blur={3} style="solid" />}
          </RoundedRect>
        )
      ))}

      {/* Top vignette (smooth gradient instead of shadow hack) */}
      <Rect x={0} y={0} width={SCREEN_WIDTH} height={120}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, 120)}
          colors={[theme.vignetteColor + '4D', 'transparent']}
        />
      </Rect>

      {/* Bottom vignette */}
      <Rect x={0} y={SCREEN_HEIGHT - 100} width={SCREEN_WIDTH} height={100}>
        <LinearGradient
          start={vec(0, SCREEN_HEIGHT - 100)}
          end={vec(0, SCREEN_HEIGHT)}
          colors={['transparent', theme.vignetteColor + '4D']}
        />
      </Rect>
    </Canvas>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});

export default AnimatedBackground;
