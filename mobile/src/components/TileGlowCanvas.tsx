import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, RoundedRect, BlurMask } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { getSettingsSync } from '../services/settings';

// Standard tile dimensions (matches LetterTile.tsx)
const STD_W = 52;
const STD_H = 56;
const COMPACT_W = 42;
const COMPACT_H = 46;

// Canvas is slightly larger than the tile body to accommodate glow bleed
const CANVAS_PAD = 20;

interface TileGlowCanvasProps {
  isSelected: boolean;
  phase: number;
  isResonant: boolean;
  compact: boolean;
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

export const TileGlowCanvas: React.FC<TileGlowCanvasProps> = ({
  isSelected,
  phase,
  compact,
}) => {
  const reducedMotion = getSettingsSync().reducedMotion;
  const trailPulse = useSharedValue(0);

  const tileW = compact ? COMPACT_W : STD_W;
  const tileH = compact ? COMPACT_H : STD_H;
  const canvasW = tileW + CANVAS_PAD * 2;
  const canvasH = tileH + CANVAS_PAD * 2;

  useEffect(() => {
    if (!isSelected || phase < 3 || reducedMotion) {
      trailPulse.value = 0;
      return;
    }
    const dur = phase >= 4 ? 900 : 700;
    trailPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: dur, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    return () => cancelAnimation(trailPulse);
  }, [isSelected, phase, reducedMotion]);

  const showTrail = isSelected && phase >= 3;
  const trailColor = getTrailColor(phase);
  const [trailBlurMin, trailBlurMax] = showTrail ? getTrailBlurRange(phase) : [0, 0];
  const [trailOpMin, trailOpMax] = showTrail ? getTrailOpacityRange(phase) : [0, 0];

  const trailBlur = useDerivedValue(() =>
    trailBlurMin + trailPulse.value * (trailBlurMax - trailBlurMin)
  );
  const trailOpacity = useDerivedValue(() =>
    trailOpMin + trailPulse.value * (trailOpMax - trailOpMin)
  );

  if (!showTrail) {
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
