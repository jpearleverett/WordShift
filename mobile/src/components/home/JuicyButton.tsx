import React, { useEffect, useRef } from 'react';
import { Animated, Easing, TouchableOpacity } from 'react-native';
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
    return { damping: 18, stiffness: 120, mass: 1.4, useNativeDriver: true };
  }
  return { damping: 10, stiffness: 300, mass: 1, useNativeDriver: true };
}

function getPressOutConfig(phase: DialoguePhase) {
  if (phase >= 3) {
    return { damping: 14, stiffness: 100, mass: 1.2, useNativeDriver: true };
  }
  return { damping: 6, stiffness: 200, mass: 1, useNativeDriver: true };
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
  const pressScale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const combinedScale = useRef(Animated.multiply(pressScale, pulse)).current;
  const pulseAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    // Subtle idle scale pulse (not opacity - keeps button fully visible)
    pulseAnimRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.03,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimRef.current.start();
    return () => {
      pulseAnimRef.current?.stop();
      pulse.setValue(1);
    };
  }, []);

  const handlePressIn = () => {
    Animated.spring(pressScale, { toValue: bounceScale, ...getPressInConfig(phase) }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, ...getPressOutConfig(phase) }).start();
  };

  return (
    <Animated.View
      style={{
        transform: [{ scale: combinedScale }],
        opacity: disabled ? 0.5 : 1,
      }}
    >
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
