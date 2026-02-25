/**
 * TileGlowCanvas
 *
 * A Skia canvas overlay that renders soft, blurred glow effects behind letter tiles.
 * Replaces the old View-based shadowRadius animation (which required useNativeDriver: false)
 * with GPU-accelerated blur via @shopify/react-native-skia + react-native-reanimated.
 *
 * Three composited layers:
 *  1. Trail glow    – Phase 3+ pulsing halo behind selected tiles (purple → crimson)
 *  2. Trail sparks  – Phase 3+ small orbiting embers behind selected tiles
 *  3. Resonance glow – Phase 1+ inner bloom for dread/ritual words
 *
 * All driven by Reanimated shared values on the UI thread — zero JS overhead.
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Circle, RoundedRect, BlurMask } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { getSettingsSync } from '../services/settings';
import { shouldSimplifyAnimations } from '../services/deviceTier';

// Standard tile dimensions (matches LetterTile.tsx)
const STD_W = 52;
const STD_H = 56;
const COMPACT_W = 42;
const COMPACT_H = 46;

// Canvas is slightly larger than the tile body to accommodate glow bleed
const CANVAS_PAD = 20;

interface TileGlowCanvasProps {
  /** Whether this tile is currently selected */
  isSelected: boolean;
  /** Current narrative phase (0-5) */
  phase: number;
  /** Whether this tile belongs to a resonant dread word */
  isResonant: boolean;
  /** Compact mode for 6+ letter words */
  compact: boolean;
}

// Trail glow color per phase
function getTrailColor(phase: number): string {
  if (phase >= 5) return '#7B6B8A'; // Ghostly mauve
  if (phase >= 4) return '#C03050'; // Crimson
  return '#9050B0'; // Purple (Phase 3)
}

// Trail glow blur radius range per phase
function getTrailBlurRange(phase: number): [number, number] {
  if (phase >= 4) return [4, 16];
  return [3, 10]; // Phase 3
}

// Trail glow opacity range per phase
function getTrailOpacityRange(phase: number): [number, number] {
  if (phase >= 5) return [0.15, 0.35];
  if (phase >= 4) return [0.25, 0.65];
  return [0.2, 0.5]; // Phase 3
}

// Resonance glow config per phase
function getResonanceGlowConfig(phase: number): { color: string; minOp: number; maxOp: number } | null {
  if (phase >= 5) return { color: '#7B6B8A', minOp: 0.06, maxOp: 0.10 };
  if (phase >= 4) return { color: '#8B0000', minOp: 0.12, maxOp: 0.28 };
  if (phase >= 3) return { color: '#4A2080', minOp: 0.08, maxOp: 0.20 };
  if (phase >= 2) return { color: '#6B5B95', minOp: 0.04, maxOp: 0.12 };
  if (phase >= 1) return { color: '#DAA520', minOp: 0.02, maxOp: 0.05 };
  return null;
}

// Spark positions — 4 embers distributed around the tile
const SPARK_OFFSETS = [
  { angle: 0.3, dist: 22 },
  { angle: 1.2, dist: 20 },
  { angle: 2.5, dist: 24 },
  { angle: 3.8, dist: 18 },
];

export const TileGlowCanvas: React.FC<TileGlowCanvasProps> = ({
  isSelected,
  phase,
  isResonant,
  compact,
}) => {
  const reducedMotion = getSettingsSync().reducedMotion;
  const simplified = shouldSimplifyAnimations();

  // Shared values for all glow layers
  const trailPulse = useSharedValue(0);      // 0→1→0 trail glow cycle
  const sparkProgress = useSharedValue(0);    // 0→1 continuous rotation for sparks
  const resonancePulse = useSharedValue(0);   // 0→1→0 resonance cycle

  const tileW = compact ? COMPACT_W : STD_W;
  const tileH = compact ? COMPACT_H : STD_H;
  const canvasW = tileW + CANVAS_PAD * 2;
  const canvasH = tileH + CANVAS_PAD * 2;
  const cx = canvasW / 2;
  const cy = canvasH / 2;

  // --- Trail glow animation (Phase 3+, selected only) ---
  useEffect(() => {
    if (!isSelected || phase < 3 || reducedMotion) {
      trailPulse.value = 0;
      return;
    }
    const dur = phase >= 4 ? 800 : 600;
    trailPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: dur, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    return () => cancelAnimation(trailPulse);
  }, [isSelected, phase, reducedMotion]);

  // --- Spark rotation (Phase 3+, selected only, not simplified) ---
  useEffect(() => {
    if (!isSelected || phase < 3 || reducedMotion || simplified) {
      sparkProgress.value = 0;
      return;
    }
    sparkProgress.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(sparkProgress);
  }, [isSelected, phase, reducedMotion, simplified]);

  // --- Resonance pulse (Phase 1+, resonant words only) ---
  useEffect(() => {
    if (!isResonant || phase < 1) {
      resonancePulse.value = 0;
      return;
    }
    if (reducedMotion || simplified) {
      resonancePulse.value = 0.5;
      return;
    }
    const dur = phase >= 4 ? 2000 : phase >= 3 ? 2500 : phase >= 2 ? 3000 : 4000;
    resonancePulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: dur, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    return () => cancelAnimation(resonancePulse);
  }, [isResonant, phase, reducedMotion, simplified]);

  // --- Derived glow values ---
  const showTrail = isSelected && phase >= 3;
  const trailColor = showTrail ? getTrailColor(phase) : '#000';
  const [trailBlurMin, trailBlurMax] = showTrail ? getTrailBlurRange(phase) : [0, 0];
  const [trailOpMin, trailOpMax] = showTrail ? getTrailOpacityRange(phase) : [0, 0];

  const trailBlur = useDerivedValue(() =>
    trailBlurMin + trailPulse.value * (trailBlurMax - trailBlurMin)
  );
  const trailOpacity = useDerivedValue(() =>
    trailOpMin + trailPulse.value * (trailOpMax - trailOpMin)
  );

  // Trail glow ellipse radii (slightly larger than tile)
  const trailRx = tileW / 2 + 4;
  const trailRy = tileH / 2 + 2;

  const resConfig = isResonant && phase >= 1 ? getResonanceGlowConfig(phase) : null;
  const resOpacity = useDerivedValue(() => {
    if (!resConfig) return 0;
    return resConfig.minOp + resonancePulse.value * (resConfig.maxOp - resConfig.minOp);
  });

  // Determine if there's anything to render
  const hasTrail = isSelected && phase >= 3 && !reducedMotion;
  const hasSparks = hasTrail && !simplified;
  const hasResonance = isResonant && phase >= 1;

  if (!hasTrail && !hasResonance) {
    return null;
  }

  return (
    <Canvas
      style={[
        styles.canvas,
        {
          width: canvasW,
          height: canvasH,
          top: -(CANVAS_PAD),
          left: -(CANVAS_PAD),
        },
      ]}
      pointerEvents="none"
    >
      {/* Layer 1: Trail glow — soft blurred rounded rect behind tile */}
      {hasTrail && (
        <RoundedRect
          x={CANVAS_PAD - 4}
          y={CANVAS_PAD - 2}
          width={tileW + 8}
          height={tileH + 4}
          r={16}
          color={trailColor}
          opacity={trailOpacity}
        >
          <BlurMask blur={trailBlur} style="solid" />
        </RoundedRect>
      )}

      {/* Layer 2: Trail sparks — small orbiting blurred circles */}
      {hasSparks && SPARK_OFFSETS.map((spark, i) => {
        const sparkCx = useDerivedValue(() => {
          const angle = spark.angle + sparkProgress.value * Math.PI * 2;
          return cx + Math.cos(angle) * spark.dist;
        });
        const sparkCy = useDerivedValue(() => {
          const angle = spark.angle + sparkProgress.value * Math.PI * 2;
          return cy + Math.sin(angle) * spark.dist * 0.6;
        });
        const sparkOp = useDerivedValue(() => {
          // Fade in/out as sparks orbit
          const angle = spark.angle + sparkProgress.value * Math.PI * 2;
          const fade = Math.sin(angle) * 0.5 + 0.5; // 0→1→0 per orbit
          return fade * trailPulse.value * 0.6;
        });

        return (
          <Circle
            key={i}
            cx={sparkCx}
            cy={sparkCy}
            r={3}
            color={trailColor}
            opacity={sparkOp}
          >
            <BlurMask blur={4} style="solid" />
          </Circle>
        );
      })}

      {/* Layer 3: Resonance glow — inner bloom for dread words */}
      {hasResonance && resConfig && (
        <RoundedRect
          x={CANVAS_PAD}
          y={CANVAS_PAD}
          width={tileW}
          height={tileH}
          r={14}
          color={resConfig.color}
          opacity={resOpacity}
        >
          <BlurMask blur={6} style="inner" />
        </RoundedRect>
      )}
    </Canvas>
  );
};

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    pointerEvents: 'none',
  },
});

export default TileGlowCanvas;
