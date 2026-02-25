import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Canvas, RoundedRect, Circle, BlurMask, Group } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { getSettingsSync } from '../services/settings';
import { getPhaseTheme } from '../theme/colors';
import { getMaxConfettiCount, shouldSimplifyAnimations } from '../services/deviceTier';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Confetti seed data ────────────────────────────────────────────────

interface ConfettiSeed {
  id: number;
  x: number;
  color: string;
  size: number;
  wobbleAmount: number;
  fallDuration: number;
  delay: number;
  rotations: number;
  isCircle: boolean;
  isLong: boolean;
}

/** Total animation window — matches original 4200ms (max delay + max fall) */
const TOTAL_DURATION = 4200;

const generateSeeds = (count: number, colors: string[]): ConfettiSeed[] => {
  const seeds: ConfettiSeed[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.random() * SCREEN_WIDTH;
    const distFromCenter = Math.abs(x - SCREEN_WIDTH / 2) / (SCREEN_WIDTH / 2);
    seeds.push({
      id: i,
      x,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 8 + Math.random() * 12,
      wobbleAmount: 30 + Math.random() * 50,
      fallDuration: 2000 + Math.random() * 1500,
      delay: distFromCenter * 400 + Math.random() * 100,
      rotations: 3 + Math.random() * 3,
      isCircle: i % 3 === 0,
      isLong: i % 4 === 0,
    });
  }
  return seeds;
};

// ─── Skia Confetti Piece (rendered inside Canvas) ──────────────────────

const SkiaConfettiPiece: React.FC<{
  seed: ConfettiSeed;
  progress: SharedValue<number>;
  useBlur: boolean;
}> = ({ seed, progress, useBlur }) => {
  const w = seed.isLong ? seed.size * 0.4 : seed.size;
  const h = seed.isLong ? seed.size * 1.5 : seed.size;
  const r = seed.isCircle ? seed.size / 2 : 2;

  const transform = useDerivedValue(() => {
    const elapsed = progress.value * TOTAL_DURATION;
    if (elapsed < seed.delay) {
      return [{ translateX: seed.x }, { translateY: -50 }, { scale: 0 }] as const;
    }
    const p = Math.min(1, (elapsed - seed.delay) / seed.fallDuration);
    // Wobble: 3 full sine cycles, damping over time
    const cx = seed.x + Math.sin(p * 3 * Math.PI * 2) * seed.wobbleAmount * (1 - p * 0.15);
    // Quadratic fall (matches original Easing.in(quad))
    const cy = -50 + p * p * (SCREEN_HEIGHT + 150);
    const scl = p < 0.1 ? p / 0.1 : 1;
    const rot = p * seed.rotations * Math.PI * 2;
    return [
      { translateX: cx },
      { translateY: cy },
      { rotate: rot },
      { scale: scl },
    ] as const;
  });

  const opacity = useDerivedValue(() => {
    const elapsed = progress.value * TOTAL_DURATION;
    if (elapsed < seed.delay) return 0;
    const p = Math.min(1, (elapsed - seed.delay) / seed.fallDuration);
    if (p < 0.05) return p / 0.05;
    if (p > 0.7) return 1 - (p - 0.7) / 0.3;
    return 1;
  });

  return (
    <Group transform={transform} opacity={opacity}>
      {seed.isCircle ? (
        <Circle cx={0} cy={0} r={seed.size / 2} color={seed.color}>
          {useBlur && <BlurMask blur={2} style="solid" />}
        </Circle>
      ) : (
        <RoundedRect x={-w / 2} y={-h / 2} width={w} height={h} r={r} color={seed.color}>
          {useBlur && <BlurMask blur={2} style="solid" />}
        </RoundedRect>
      )}
    </Group>
  );
};

// ─── Confetti ──────────────────────────────────────────────────────────

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
  phase?: number;
  /** Ritual energy of the completed puzzle — scales confetti density */
  ritualEnergy?: number;
}

export const Confetti: React.FC<ConfettiProps> = ({ active, onComplete, phase = 0, ritualEnergy = 0 }) => {
  const progress = useSharedValue(0);
  const useBlur = !shouldSimplifyAnimations();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const seeds = useMemo(() => {
    if (!active) return [];
    const theme = getPhaseTheme(phase);
    const baseCount = getMaxConfettiCount();
    // Scale confetti density with ritual energy
    const energyBonus = ritualEnergy >= 7
      ? Math.floor(baseCount * 0.4)
      : ritualEnergy >= 4
        ? Math.floor(baseCount * 0.2)
        : 0;
    return generateSeeds(baseCount + energyBonus, theme.confettiColors);
  }, [active, phase, ritualEnergy]);

  useEffect(() => {
    if (active) {
      // Skip confetti animation if reduced motion is enabled
      if (getSettingsSync().reducedMotion) {
        onCompleteRef.current?.();
        return;
      }
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: TOTAL_DURATION,
        easing: Easing.linear,
      });
      const timeout = setTimeout(() => {
        onCompleteRef.current?.();
      }, TOTAL_DURATION);
      return () => {
        clearTimeout(timeout);
        cancelAnimation(progress);
      };
    } else {
      progress.value = 0;
    }
  }, [active, phase, ritualEnergy]);

  if (!active || seeds.length === 0) return null;

  return (
    <Canvas style={styles.container} pointerEvents="none">
      {seeds.map(seed => (
        <SkiaConfettiPiece key={seed.id} seed={seed} progress={progress} useBlur={useBlur} />
      ))}
    </Canvas>
  );
};

// ─── Star Burst ────────────────────────────────────────────────────────

// Star burst effect for successful moves — colors shift with narrative phase
const STAR_BURST_COLORS: Record<number, { bg: string; shadow: string }> = {
  0: { bg: '#FFD700', shadow: '#FFD700' },
  1: { bg: '#F0C050', shadow: '#D4A030' },
  2: { bg: '#B088D0', shadow: '#8B5FB0' },
  3: { bg: '#9050B0', shadow: '#6A2080' },
  4: { bg: '#C03050', shadow: '#901030' },
  5: { bg: '#7B6B8A', shadow: '#5A4B6A' },  // Ghostly mauve (Phase 5: terrible peace)
};

interface StarSeed {
  angle: number;
  distance: number;
}

const STAR_DURATION = 500;

const SkiaStarParticle: React.FC<{
  seed: StarSeed;
  progress: SharedValue<number>;
  color: string;
  useBlur: boolean;
}> = ({ seed, progress, color, useBlur }) => {
  const transform = useDerivedValue(() => {
    const p = progress.value;
    const dist = p * seed.distance;
    const cx = Math.cos(seed.angle) * dist;
    const cy = Math.sin(seed.angle) * dist;
    // Scale: grow fast, shrink slower
    const scl = p < 0.3 ? p / 0.3 : Math.max(0, 1 - (p - 0.3) / 0.7);
    return [
      { translateX: cx },
      { translateY: cy },
      { scale: scl },
    ] as const;
  });

  const opacity = useDerivedValue(() => {
    const p = progress.value;
    if (p > 0.6) return 1 - (p - 0.6) / 0.4;
    return 1;
  });

  return (
    <Group transform={transform} opacity={opacity}>
      <Circle cx={0} cy={0} r={8} color={color}>
        {useBlur && <BlurMask blur={6} style="solid" />}
      </Circle>
    </Group>
  );
};

interface StarBurstProps {
  active: boolean;
  x: number;
  y: number;
  phase?: number;
}

export const StarBurst: React.FC<StarBurstProps> = ({ active, x, y, phase = 0 }) => {
  const progress = useSharedValue(0);
  const useBlur = !shouldSimplifyAnimations();

  const starSeeds = useMemo<StarSeed[]>(() =>
    Array(8).fill(0).map((_, i) => ({
      angle: (i / 8) * Math.PI * 2,
      distance: 40 + Math.random() * 30,
    })),
  []);

  useEffect(() => {
    if (active) {
      if (getSettingsSync().reducedMotion) return;
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: STAR_DURATION,
        easing: Easing.out(Easing.quad),
      });
      return () => cancelAnimation(progress);
    }
  }, [active]);

  if (!active) return null;

  const colors = STAR_BURST_COLORS[phase] || STAR_BURST_COLORS[0];

  return (
    <Canvas
      style={[styles.starBurstContainer, { left: x - 50, top: y - 50 }]}
      pointerEvents="none"
    >
      {/* Offset all drawing to canvas center (50, 50) */}
      <Group transform={[{ translateX: 50 }, { translateY: 50 }]}>
        {starSeeds.map((seed, i) => (
          <SkiaStarParticle
            key={i}
            seed={seed}
            progress={progress}
            color={colors.bg}
            useBlur={useBlur}
          />
        ))}
      </Group>
    </Canvas>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  starBurstContainer: {
    position: 'absolute',
    width: 100,
    height: 100,
    zIndex: 1000,
  },
});

export default Confetti;
