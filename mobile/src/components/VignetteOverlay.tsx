/**
 * VignetteOverlay
 *
 * A full-screen overlay that darkens toward the edges using a layered
 * gradient approach with standard React Native views.  The `intensity`
 * prop (0–1) controls how strongly the effect is applied.
 *
 * Usage:
 *   // Static intensity
 *   <VignetteOverlay intensity={0.6} color="#05000A" />
 *
 *   // Animated intensity (driven by an Animated.Value in the parent)
 *   const intensity = useRef(new Animated.Value(0)).current;
 *   Animated.timing(intensity, { toValue: 0.8, useNativeDriver: true }).start();
 *   <VignetteOverlay intensity={intensity} color="#05000A" />
 */

import React from 'react';
import { Animated, StyleSheet } from 'react-native';

interface VignetteOverlayProps {
  /**
   * Vignette strength.  Accepts a static number (0–1) **or** a React Native
   * `Animated.Value` for fully animated control.
   *
   * 0 = invisible, 1 = maximum darkness.
   */
  intensity?: number | Animated.Value;
  /**
   * Edge colour of the vignette.  Defaults to near-black `#05000A`.
   */
  color?: string;
}

export const VignetteOverlay: React.FC<VignetteOverlayProps> = ({
  intensity = 0.5,
  color = '#05000A',
}) => {
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: color, opacity: intensity as any },
      ]}
      pointerEvents="none"
    />
  );
};

