import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import {
  Canvas,
  Circle,
  Group,
  BlurMask,
  vec,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  withSpring,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Pit geometry — mirrors OfferingPitScreen constants
const CX = SCREEN_WIDTH * 0.5;
const CY = SCREEN_HEIGHT * 0.72;
const PIT_OVAL_RX = SCREEN_WIDTH * 0.29;
const PIT_OVAL_RY = SCREEN_HEIGHT * 0.06;

// Glow layer sizes (matching original View-based layers)
const BASE_H = 90;
const OUTER_R = (BASE_H * 1.1) / 2;
const OUTER_SX = (SCREEN_WIDTH * 0.7 * 0.9) / (BASE_H * 1.1);
const MIDDLE_R = (BASE_H * 0.9) / 2;
const MIDDLE_SX = (SCREEN_WIDTH * 0.7 * 0.64) / (BASE_H * 0.9);
const INNER_R = (BASE_H * 0.7) / 2;
const INNER_SX = (SCREEN_WIDTH * 0.7 * 0.4) / (BASE_H * 0.7);
const CORE_R = (BASE_H * 0.5) / 2;
const CORE_SX = (SCREEN_WIDTH * 0.7 * 0.28) / (BASE_H * 0.5);
const RIM_R = PIT_OVAL_RY;
const RIM_SX = PIT_OVAL_RX / PIT_OVAL_RY;

// Phase-aware breathing parameters
const BREATH_OPACITY: Record<number, [number, number]> = {
  0: [0.03, 0.12], 1: [0.03, 0.12], 2: [0.05, 0.18], 3: [0.06, 0.22], 4: [0.08, 0.30],
};
const BREATH_SCALE: Record<number, [number, number]> = {
  0: [0.90, 1.05], 1: [0.90, 1.05], 2: [0.92, 1.06], 3: [0.93, 1.08], 4: [0.95, 1.10],
};
const BREATH_CYCLE_MS = 4000;

interface PitGlowCanvasProps {
  phase: number;
  glowColor: string;
  coreColor: string;
  /** True when words are floating or batches are pending */
  isActive: boolean;
  /** Increment to trigger a surge flash (devour impact) */
  surgeSignal: number;
  /** Increment to trigger an inhale flash (devour start) */
  inhaleSignal: number;
  /** Phase-aware surge glow opacity */
  surgeGlowOpacity: number;
  reducedMotion: boolean;
  simplify: boolean;
}

export const PitGlowCanvas: React.FC<PitGlowCanvasProps> = ({
  phase, glowColor, coreColor, isActive,
  surgeSignal, inhaleSignal, surgeGlowOpacity,
  reducedMotion, simplify,
}) => {
  const breathProgress = useSharedValue(reducedMotion ? 0.5 : 0);
  const intensity = useSharedValue(isActive ? 1.0 : 0.35);
  const surgeOp = useSharedValue(0);
  const surgeScl = useSharedValue(0.8);

  // Breathing loop
  useEffect(() => {
    if (reducedMotion) {
      breathProgress.value = 0.5;
      return;
    }
    breathProgress.value = 0;
    breathProgress.value = withRepeat(
      withTiming(1, { duration: BREATH_CYCLE_MS * 2, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(breathProgress);
  }, [reducedMotion]);

  // Glow intensity tracks active state
  useEffect(() => {
    intensity.value = withTiming(isActive ? 1.0 : 0.35, {
      duration: isActive ? 400 : 800,
    });
  }, [isActive]);

  // Surge flash (devour impact)
  useEffect(() => {
    if (surgeSignal <= 0 || reducedMotion) return;
    surgeScl.value = 0.8;
    surgeOp.value = withSequence(
      withTiming(surgeGlowOpacity, { duration: 120 }),
      withTiming(surgeGlowOpacity, { duration: 40 }), // hold
      withTiming(0, { duration: 350 }),
    );
    surgeScl.value = withSequence(
      withSpring(1.3, { damping: 4, stiffness: 200 }),
      withTiming(0.8, { duration: 300 }),
    );
  }, [surgeSignal]);

  // Inhale flash (devour start — lighter)
  useEffect(() => {
    if (inhaleSignal <= 0 || reducedMotion) return;
    surgeOp.value = withSequence(
      withTiming(surgeGlowOpacity * 0.6, { duration: 150 }),
      withTiming(0, { duration: 300 }),
    );
    surgeScl.value = withSequence(
      withTiming(1.1, { duration: 150 }),
      withTiming(0.85, { duration: 300, easing: Easing.out(Easing.quad) }),
    );
  }, [inhaleSignal]);

  const opRange = BREATH_OPACITY[phase] ?? BREATH_OPACITY[0];
  const scRange = BREATH_SCALE[phase] ?? BREATH_SCALE[0];

  // Breathing opacity per layer
  const outerOpacity = useDerivedValue(() => {
    const bp = breathProgress.value;
    const base = opRange[0] + bp * (opRange[1] - opRange[0]);
    return base * 0.4 * intensity.value;
  });
  const middleOpacity = useDerivedValue(() => {
    const bp = breathProgress.value;
    const base = opRange[0] + bp * (opRange[1] - opRange[0]);
    return base * 0.7 * intensity.value;
  });
  const innerOpacity = useDerivedValue(() => {
    const bp = breathProgress.value;
    const base = opRange[0] + bp * (opRange[1] - opRange[0]);
    return base * intensity.value;
  });
  const coreOpacity = useDerivedValue(() => {
    const bp = breathProgress.value;
    const base = opRange[0] + bp * (opRange[1] - opRange[0]);
    return Math.min(base * 2.5, bp < 0.5 ? 0.7 : 0.85) * intensity.value;
  });

  // Breathing scale
  const bScale = useDerivedValue(() => {
    const bp = breathProgress.value;
    return scRange[0] + bp * (scRange[1] - scRange[0]);
  });

  // Per-layer transforms (scaleX for ellipse shape + breathScale for breathing)
  const outerTx = useDerivedValue(() => [
    { scaleX: OUTER_SX }, { scale: bScale.value },
  ]);
  const middleTx = useDerivedValue(() => [
    { scaleX: MIDDLE_SX }, { scale: bScale.value },
  ]);
  const innerTx = useDerivedValue(() => [
    { scaleX: INNER_SX }, { scale: bScale.value },
  ]);
  const coreTx = useDerivedValue(() => [
    { scaleX: CORE_SX }, { scale: bScale.value },
  ]);

  // Surge transforms
  const surgeOuterTx = useDerivedValue(() => [
    { scaleX: OUTER_SX }, { scale: surgeScl.value },
  ]);
  const surgeInnerTx = useDerivedValue(() => [
    { scaleX: INNER_SX }, { scale: surgeScl.value },
  ]);
  const surgeOuterOp = useDerivedValue(() => surgeOp.value * 0.5);

  const blurR = simplify ? 0 : 10;
  const rimColor = glowColor + '25';

  return (
    <Canvas style={styles.container} pointerEvents="none">
      {/* Outer halo — faintest, largest */}
      <Group transform={outerTx} origin={vec(CX, CY)}>
        <Circle cx={CX} cy={CY} r={OUTER_R} color={glowColor} opacity={outerOpacity}>
          {blurR > 0 && <BlurMask blur={12} style="normal" />}
        </Circle>
      </Group>

      {/* Middle glow */}
      <Group transform={middleTx} origin={vec(CX, CY)}>
        <Circle cx={CX} cy={CY} r={MIDDLE_R} color={glowColor} opacity={middleOpacity}>
          {blurR > 0 && <BlurMask blur={8} style="normal" />}
        </Circle>
      </Group>

      {/* Inner glow — brightest */}
      <Group transform={innerTx} origin={vec(CX, CY)}>
        <Circle cx={CX} cy={CY} r={INNER_R} color={glowColor} opacity={innerOpacity}>
          {blurR > 0 && <BlurMask blur={6} style="normal" />}
        </Circle>
      </Group>

      {/* Dark pit core — depth illusion */}
      <Group transform={coreTx} origin={vec(CX, CY)}>
        <Circle cx={CX} cy={CY} r={CORE_R} color={coreColor} opacity={coreOpacity}>
          {blurR > 0 && <BlurMask blur={4} style="normal" />}
        </Circle>
      </Group>

      {/* Pit rim ring */}
      <Group transform={[{ scaleX: RIM_SX }]} origin={vec(CX, CY)}>
        <Circle cx={CX} cy={CY} r={RIM_R} color={rimColor} style="stroke" strokeWidth={1} />
      </Group>

      {/* Surge outer flash */}
      <Group transform={surgeOuterTx} origin={vec(CX, CY)}>
        <Circle cx={CX} cy={CY} r={OUTER_R} color={glowColor} opacity={surgeOuterOp}>
          {blurR > 0 && <BlurMask blur={16} style="normal" />}
        </Circle>
      </Group>

      {/* Surge inner flash */}
      <Group transform={surgeInnerTx} origin={vec(CX, CY)}>
        <Circle cx={CX} cy={CY} r={INNER_R} color={glowColor} opacity={surgeOp}>
          {blurR > 0 && <BlurMask blur={10} style="normal" />}
        </Circle>
      </Group>
    </Canvas>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default PitGlowCanvas;
