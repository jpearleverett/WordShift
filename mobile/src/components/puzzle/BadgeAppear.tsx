import React, { useEffect, useState } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';

interface BadgeAppearProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessible?: boolean;
  accessibilityLabel?: string;
  accessibilityRole?: 'text' | 'button' | 'none';
}

/**
 * Entrance wrapper for the transient puzzle-HUD status badges (challenge,
 * variant, blind, weave, house-ask). On mount it springs in — opacity 0->1 +
 * scale 0.85->1 (~180ms, native driver) — so a badge appearing mid-board reads
 * as arriving rather than hard-cutting into place. Unmount stays instant (React
 * unmounts synchronously; a mid-board badge removal is rare and the arrival is
 * the felt beat). Pinned instant under reduced motion / low-tier devices.
 */
export const BadgeAppear: React.FC<BadgeAppearProps> = ({
  children,
  style,
  accessible,
  accessibilityLabel,
  accessibilityRole,
}) => {
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.85));

  useEffect(() => {
    if (getSettingsSync().reducedMotion || shouldSimplifyAnimations()) {
      opacity.setValue(1);
      scale.setValue(1);
      return;
    }
    const anim = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 180, useNativeDriver: true }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [opacity, scale]);

  return (
    <Animated.View
      style={[style, { opacity, transform: [{ scale }] }]}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      {children}
    </Animated.View>
  );
};

export default BadgeAppear;
