import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Animated, Easing } from 'react-native';
import { getSettingsSync } from '../../services/settings';
import { shouldSimplifyAnimations } from '../../services/deviceTier';
import { getPressSpring } from '../../theme/surfaces';

interface JuicyButtonProps {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  disabled?: boolean;
  bounceScale?: number;
  /** Home phase — the idle pulse slows and softens with the descent. */
  phase?: number;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
}

export const JuicyButton: React.FC<JuicyButtonProps> = ({
  onPress,
  style,
  children,
  disabled = false,
  bounceScale = 0.92,
  phase = 0,
  accessibilityLabel,
  accessibilityRole = 'button',
}) => {
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // The idle attract-pulse is a WORLD loop, so it must honor reducedMotion /
    // device tier (it previously ignored both — the one always-on-screen loop
    // that broke the mandatory rules) and slow with the descent like the tile
    // idle cadence (1200ms bright -> ~2400ms at the reveal), softening too.
    if (getSettingsSync().reducedMotion || shouldSimplifyAnimations()) {
      pulseAnim.setValue(1);
      return;
    }
    const period = 1200 + Math.min(phase, 4) * 300; // 1200 -> 2400ms
    const peak = phase >= 4 ? 1.015 : phase >= 2 ? 1.022 : 1.03;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: peak,
          duration: period,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: period,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [phase, pulseAnim]);

  const handlePressIn = () => {
    // The down-stroke is touch acknowledgment — it stays constant at every
    // phase (the hand does not age).
    Animated.spring(scaleAnim, {
      toValue: bounceScale,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    // The release/settle belongs to the world — it takes the phase ladder.
    const spring = getPressSpring(phase);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: spring.friction,
      tension: spring.tension,
      useNativeDriver: true,
    }).start();
  };

  // Combine scale animations
  const combinedScale = Animated.multiply(scaleAnim, pulseAnim);

  return (
    <Animated.View style={{ transform: [{ scale: combinedScale }], opacity: disabled ? 0.5 : 1 }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        disabled={disabled}
        style={style}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={{ disabled }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
};
