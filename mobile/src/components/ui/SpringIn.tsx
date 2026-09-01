import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, ViewStyle } from 'react-native';
import { getSettingsSync } from '../../services/settings';
import { getModalInSpring } from '../../theme/surfaces';

/**
 * Springy modal-panel entrance: scale 0.92 -> 1 (SURFACE.modalIn). Mounts fresh
 * each time its Modal opens, so the spring runs once per open. Reduced motion
 * pins the end state. Native driver only.
 */
export const SpringIn: React.FC<{
  style?: StyleProp<ViewStyle>;
  claimTouches?: boolean;
  /** Narrative phase — ages the entrance spring so home modals settle heavier
   *  with the descent instead of bouncing candy-bright at every phase. */
  phase?: number;
  children: React.ReactNode;
}> = ({ style, claimTouches, phase = 0, children }) => {
  const reducedMotion = getSettingsSync().reducedMotion;
  const scale = useRef(new Animated.Value(reducedMotion ? 1 : 0.92)).current;
  useEffect(() => {
    if (reducedMotion) return;
    const anim = Animated.spring(scale, {
      toValue: 1,
      ...getModalInSpring(phase),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [scale, reducedMotion]);
  return (
    <Animated.View
      style={[style, { transform: [{ scale }] }]}
      onStartShouldSetResponder={claimTouches ? () => true : undefined}
    >
      {children}
    </Animated.View>
  );
};
