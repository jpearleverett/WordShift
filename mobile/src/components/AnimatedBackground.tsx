import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import {
  Canvas,
  Rect,
  Circle,
  Group,
  Path,
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
import type { SharedValue } from 'react-native-reanimated';
import { getPhaseTheme } from '../theme/colors';
import { getSettingsSync } from '../services/settings';
import { getMaxParticleCount, shouldSimplifyAnimations } from '../services/deviceTier';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Particle seed data ────────────────────────────────────────────────

interface ParticleSeed {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  type: 'circle' | 'star' | 'diamond';
}

const generateParticles = (count: number, colors: string[]): ParticleSeed[] => {
  const types: Array<'circle' | 'star' | 'diamond'> = ['circle', 'star', 'diamond'];
  const particles: ParticleSeed[] = [];
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

// ─── Skia particle (rendered inside Canvas) ────────────────────────────

const SkiaParticle: React.FC<{
  particle: ParticleSeed;
  useBlur: boolean;
}> = ({ particle, useBlur }) => {
  const progress = useSharedValue(0);
  const totalCycle = particle.delay + particle.duration;
  const delayFrac = particle.delay / totalCycle;

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: totalCycle, easing: Easing.linear }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, []);

  const transform = useDerivedValue(() => {
    const p = progress.value;
    if (p < delayFrac) {
      return [
        { translateX: particle.x },
        { translateY: SCREEN_HEIGHT + 50 },
        { scale: 0 },
      ] as const;
    }
    const ap = (p - delayFrac) / (1 - delayFrac); // active progress 0→1
    // Float upward (linear)
    const ty = SCREEN_HEIGHT + 50 - ap * (SCREEN_HEIGHT + 150);
    // Rotate one full turn
    const rot = ap * Math.PI * 2;
    // Scale: grow in first 30%, then slowly shrink
    const scl = ap < 0.3
      ? 0.5 + (ap / 0.3) * 0.5
      : 1.0 - (ap - 0.3) * 0.2 / 0.7;
    return [
      { translateX: particle.x },
      { translateY: ty },
      { rotate: rot },
      { scale: scl },
    ] as const;
  });

  const opacity = useDerivedValue(() => {
    const p = progress.value;
    if (p < delayFrac) return 0;
    const ap = (p - delayFrac) / (1 - delayFrac);
    // Fade in 20%, sustain at 0.6-1.0, fade out 20%
    if (ap < 0.2) return ap / 0.2;
    if (ap > 0.8) return (1 - ap) / 0.2;
    return 0.6 + 0.4 * (1 - (ap - 0.2) / 0.6);
  });

  const s = particle.size;
  const blurR = useBlur ? (particle.type === 'circle' ? 4 : 3) : 0;

  // Pre-compute star path SVG string (4-point star)
  const starPath = useMemo(() => {
    if (particle.type !== 'star') return '';
    const r = s / 2;
    const ir = r * 0.35;
    return `M 0 ${-r} L ${ir} ${-ir} L ${r} 0 L ${ir} ${ir} L 0 ${r} L ${-ir} ${ir} L ${-r} 0 L ${-ir} ${-ir} Z`;
  }, [particle.type, s]);

  const renderShape = () => {
    switch (particle.type) {
      case 'star':
        return (
          <Path path={starPath} color={particle.color}>
            {blurR > 0 && <BlurMask blur={blurR} style="solid" />}
          </Path>
        );
      case 'diamond':
        return (
          <Group transform={[{ rotate: Math.PI / 4 }]}>
            <RoundedRect
              x={-s * 0.35}
              y={-s * 0.35}
              width={s * 0.7}
              height={s * 0.7}
              r={2}
              color={particle.color}
            >
              {blurR > 0 && <BlurMask blur={blurR} style="solid" />}
            </RoundedRect>
          </Group>
        );
      default: // circle
        return (
          <Circle cx={0} cy={0} r={s / 2} color={particle.color}>
            {blurR > 0 && <BlurMask blur={blurR} style="solid" />}
          </Circle>
        );
    }
  };

  return (
    <Group transform={transform} opacity={opacity}>
      {renderShape()}
    </Group>
  );
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

  // Generate particle seeds (static per mount)
  const particles = useMemo(() => {
    if (reducedMotion) return [];
    return generateParticles(getMaxParticleCount(), theme.particleColors);
  }, []);

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

      {/* Floating particles with blur glow */}
      {particles.map(particle => (
        <SkiaParticle key={particle.id} particle={particle} useBlur={useBlur} />
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
