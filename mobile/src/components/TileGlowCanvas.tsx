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
  /** Whether this tile is on the active (source) row — gates animation loops */
  isActiveRow?: boolean;
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
  isActiveRow = false,
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
  // Only run animation loops on the active row to avoid saturating the UI thread.
  useEffect(() => {
    if (!isResonant || phase < 1) {
      resonancePulse.value = 0;
      return;
    }
    if (reducedMotion || simplified || !isActiveRow) {
      // Static glow for non-active rows and reduced motion
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
  }, [isResonant, phase, reducedMotion, simplified, isActiveRow]);

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

  // --- Spark derived values (fixed hook calls — NOT inside .map()) ---
  // Each spark needs cx, cy, opacity derived from sparkProgress + trailPulse.
  // We pre-compute all 4 sets of derived values unconditionally to satisfy Rules of Hooks.
  const spark0Cx = useDerivedValue(() => cx + Math.cos(SPARK_OFFSETS[0].angle + sparkProgress.value * Math.PI * 2) * SPARK_OFFSETS[0].dist);
  const spark0Cy = useDerivedValue(() => cy + Math.sin(SPARK_OFFSETS[0].angle + sparkProgress.value * Math.PI * 2) * SPARK_OFFSETS[0].dist * 0.6);
  const spark0Op = useDerivedValue(() => (Math.sin(SPARK_OFFSETS[0].angle + sparkProgress.value * Math.PI * 2) * 0.5 + 0.5) * trailPulse.value * 0.6);

  const spark1Cx = useDerivedValue(() => cx + Math.cos(SPARK_OFFSETS[1].angle + sparkProgress.value * Math.PI * 2) * SPARK_OFFSETS[1].dist);
  const spark1Cy = useDerivedValue(() => cy + Math.sin(SPARK_OFFSETS[1].angle + sparkProgress.value * Math.PI * 2) * SPARK_OFFSETS[1].dist * 0.6);
  const spark1Op = useDerivedValue(() => (Math.sin(SPARK_OFFSETS[1].angle + sparkProgress.value * Math.PI * 2) * 0.5 + 0.5) * trailPulse.value * 0.6);

  const spark2Cx = useDerivedValue(() => cx + Math.cos(SPARK_OFFSETS[2].angle + sparkProgress.value * Math.PI * 2) * SPARK_OFFSETS[2].dist);
  const spark2Cy = useDerivedValue(() => cy + Math.sin(SPARK_OFFSETS[2].angle + sparkProgress.value * Math.PI * 2) * SPARK_OFFSETS[2].dist * 0.6);
  const spark2Op = useDerivedValue(() => (Math.sin(SPARK_OFFSETS[2].angle + sparkProgress.value * Math.PI * 2) * 0.5 + 0.5) * trailPulse.value * 0.6);

  const spark3Cx = useDerivedValue(() => cx + Math.cos(SPARK_OFFSETS[3].angle + sparkProgress.value * Math.PI * 2) * SPARK_OFFSETS[3].dist);
  const spark3Cy = useDerivedValue(() => cy + Math.sin(SPARK_OFFSETS[3].angle + sparkProgress.value * Math.PI * 2) * SPARK_OFFSETS[3].dist * 0.6);
  const spark3Op = useDerivedValue(() => (Math.sin(SPARK_OFFSETS[3].angle + sparkProgress.value * Math.PI * 2) * 0.5 + 0.5) * trailPulse.value * 0.6);

  const sparkDerivedValues = [
    { cx: spark0Cx, cy: spark0Cy, op: spark0Op },
    { cx: spark1Cx, cy: spark1Cy, op: spark1Op },
    { cx: spark2Cx, cy: spark2Cy, op: spark2Op },
    { cx: spark3Cx, cy: spark3Cy, op: spark3Op },
  ];

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
      {hasSparks && sparkDerivedValues.map((spark, i) => (
        <Circle
          key={i}
          cx={spark.cx}
          cy={spark.cy}
          r={3}
          color={trailColor}
          opacity={spark.op}
        >
          <BlurMask blur={4} style="solid" />
        </Circle>
      ))}

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
