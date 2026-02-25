/**
 * VignetteOverlay
 *
 * A full-screen Skia canvas that draws a radial gradient vignette —
 * transparent at the centre, darkening toward the edges.  The `intensity`
 * prop (0–1) controls how strongly the effect is applied and is driven by
 * a Reanimated shared value for zero-JS-thread overhead.
 *
 * Usage:
 *   // Static intensity
 *   <VignetteOverlay intensity={0.6} color="#05000A" />
 *
 *   // Animated intensity (driven by a shared value in the parent)
 *   const intensity = useSharedValue(0);
 *   intensity.value = withTiming(0.8);
 *   <VignetteOverlay intensity={intensity} color="#05000A" />
 */

import React from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { Canvas, Rect, RadialGradient, vec } from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  isSharedValue,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Centre of the screen
const CENTER = vec(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
// Radius that reaches past all four corners so no edge is left unshaded
const RADIUS = Math.sqrt(SCREEN_WIDTH ** 2 + SCREEN_HEIGHT ** 2) / 2;

interface VignetteOverlayProps {
  /**
   * Vignette strength.  Accepts a static number (0–1) **or** a Reanimated
   * `SharedValue<number>` for fully animated, JS-thread-free control.
   *
   * 0 = invisible, 1 = maximum darkness at the edges.
   */
  intensity?: number | SharedValue<number>;
  /**
   * Edge colour of the vignette.  Defaults to near-black `#05000A`.
   */
  color?: string;
}

export const VignetteOverlay: React.FC<VignetteOverlayProps> = ({
  intensity = 0.5,
  color = '#05000A',
}) => {
  // Create an internal shared value for the static-number case.
  const _staticSv = useSharedValue(isSharedValue(intensity) ? 0 : (intensity as number));

  // Resolve which shared value to drive the animated style with.
  // If the caller passes a SharedValue we use it directly; otherwise we keep
  // our internal one in sync with the prop on every render.
  const activeSv: SharedValue<number> = isSharedValue(intensity)
    ? (intensity as SharedValue<number>)
    : _staticSv;

  if (!isSharedValue(intensity)) {
    _staticSv.value = intensity as number;
  }

  // The vignette opacity is applied on the UI thread via useAnimatedStyle,
  // avoiding any JS-bridge round-trips when intensity is a SharedValue.
  const wrapperStyle = useAnimatedStyle(() => ({
    opacity: activeSv.value,
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, wrapperStyle]}
      pointerEvents="none"
    >
      {/* Static Skia radial gradient: transparent at centre → dark at edges */}
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Rect x={0} y={0} width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
          <RadialGradient
            c={CENTER}
            r={RADIUS}
            colors={['transparent', color]}
            positions={[0.35, 1]}
          />
        </Rect>
      </Canvas>
    </Animated.View>
  );
};

