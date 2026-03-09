import React, { useEffect } from 'react';
import { TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { DialoguePhase } from '../../types/homeWorld';

interface JuicyButtonProps {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
  disabled?: boolean;
  bounceScale?: number;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'none';
  /** Narrative phase — Phase 0-2: bouncy energetic spring; Phase 3+: heavy damped spring */
  phase?: DialoguePhase;
}

/** Phase-aware spring config: light and bouncy early on, heavy and damped at later phases. */
function getPressInConfig(phase: DialoguePhase) {
  if (phase >= 3) {
    return { damping: 18, stiffness: 120, mass: 1.4 };
  }
  return { damping: 10, stiffness: 300, mass: 1 };
}

function getPressOutConfig(phase: DialoguePhase) {
  if (phase >= 3) {
    return { damping: 14, stiffness: 100, mass: 1.2 };
  }
  return { damping: 6, stiffness: 200, mass: 1 };
}

export const JuicyButton: React.FC<JuicyButtonProps> = ({
  onPress,
  style,
  children,
  disabled = false,
  bounceScale = 0.92,
  accessibilityLabel,
  accessibilityRole = 'button',
  phase = 0,
}) => {
  const pressScale = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    // Subtle idle scale pulse (not opacity - keeps button fully visible)
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(pulse);
      pulse.value = 1;
    };
  }, []);

  const handlePressIn = () => {
    pressScale.value = withSpring(bounceScale, getPressInConfig(phase));
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, getPressOutConfig(phase));
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value * pulse.value }],
    opacity: disabled ? 0.5 : 1,
  }));

  return (
    <Animated.View style={animatedStyle}>
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
