import React, { useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface ScreenTransitionOverlayProps {
  /** Natively-driven cover opacity (0 = uncovered, 1 = fully covering). */
  opacity: Animated.Value;
  /** Solid fill of the cover — the DESTINATION screen's background color. */
  color: string;
}

/**
 * The navigation cover: a full-screen solid layer that fades in over the
 * outgoing screen, hides the swap, then fades out onto the destination.
 *
 * Two deliberate structural choices, both flicker fixes:
 *
 * 1. It is MEMOIZED. React Native rasterizes an Animated.View's animated style
 *    on every re-render (createAnimatedPropsHook -> reduceAnimatedProps ->
 *    AnimatedProps.__getValueWithStaticProps), and a natively-driven value only
 *    syncs its JS copy back when the animation ENDS. So any parent re-render
 *    mid-fade committed the animation's START value to the shadow tree: during
 *    the reveal that is opacity 1, a full-screen flash of this color; during
 *    the cover it is opacity 0, a frame of uncovered screen. App re-renders
 *    many times inside a transition window, so the cover has to be a leaf that
 *    those re-renders cannot reach. Its props (a ref-held Animated.Value and a
 *    color string that only changes BEFORE the cover starts) are stable for the
 *    whole transition, so memo bails out on every one of them.
 *
 * 2. The color lives on a plain child View, never on the animated node itself.
 *    Writing a JS style prop onto the exact view carrying a native animation is
 *    the worst case for (1), and it keeps the color commit off the animated
 *    props entirely.
 *
 * No borderRadius (pixel-skin rule) and no elevation (a full-screen elevated
 * layer draws an edge shadow).
 */
export const ScreenTransitionOverlay = React.memo(function ScreenTransitionOverlay({
  opacity,
  color,
}: ScreenTransitionOverlayProps) {
  const outerStyle = useMemo(() => [StyleSheet.absoluteFill, { opacity, zIndex: 50 }], [opacity]);
  const fillStyle = useMemo(() => [StyleSheet.absoluteFill, { backgroundColor: color }], [color]);
  return (
    <Animated.View pointerEvents="none" style={outerStyle}>
      <View style={fillStyle} />
    </Animated.View>
  );
});
